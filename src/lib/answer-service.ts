/**
 * Answer orchestration (PRD §10.2, §16): authorize → reserve capacity →
 * retrieve current eligible sources → generate and validate the result →
 * persist → settle usage. Each stage records the same request identifier.
 */
import { getDb, DEMO_ORG_ID, tx } from "./db";
import { newId, nowIso } from "./util";
import { synthesize, type Citation } from "./synthesis";
import type { ChunkRowLike, DocMetaLike, VersionMetaLike } from "./retrieval";
import {
  reserveAnswer,
  settleReservation,
  releaseReservation,
  ReserveError,
} from "./entitlements";
import { track } from "./audit";
import { enqueueJob } from "./billing";

export interface CitationOut extends Citation {}

interface DocRow {
  id: string;
  title: string;
  current_version_id: string;
}

interface VersionRow {
  id: string;
  version_no: number;
  superseded_at: string | null;
}

/** Load eligible retrieval material for an organization: ready docs, current versions only. */
function loadRetrievalSet(orgId: string, scopeDocIds: string[] | null): {
  chunks: ChunkRowLike[];
  docMeta: Map<string, DocMetaLike>;
  versionMeta: Map<string, VersionMetaLike>;
  superseded: Set<string>;
} {
  const db = getDb();
  const docs = db
    .prepare(
      `SELECT id, title, current_version_id FROM documents
       WHERE org_id = ? AND state = 'ready' AND deleted_at IS NULL`
    )
    .all(orgId) as DocRow[];
  const filtered = scopeDocIds && scopeDocIds.length > 0 ? docs.filter((d) => scopeDocIds.includes(d.id)) : docs;
  const docMeta = new Map<string, DocMetaLike>();
  const ids: string[] = [];
  for (const d of filtered) {
    docMeta.set(d.id, d);
    ids.push(d.id);
  }
  const versionMeta = new Map<string, VersionMetaLike>();
  const superseded = new Set<string>();
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const versions = db
      .prepare(`SELECT id, version_no, superseded_at FROM document_versions WHERE document_id IN (${placeholders})`)
      .all(...ids) as VersionRow[];
    for (const v of versions) {
      versionMeta.set(v.id, v);
      if (v.superseded_at) superseded.add(v.id);
    }
  }
  const chunks: ChunkRowLike[] =
    ids.length > 0
      ? (getDb()
          .prepare(
            `SELECT c.id, c.document_id, c.version_id, c.seq, c.content, c.section, c.loc_label
             FROM chunks c JOIN documents d ON d.id = c.document_id
             WHERE c.org_id = ? AND d.deleted_at IS NULL
               AND c.version_id = (SELECT current_version_id FROM documents WHERE id = c.document_id)`
          )
          .all(orgId) as ChunkRowLike[])
      : [];
  const scoped = scopeDocIds && scopeDocIds.length > 0 ? chunks.filter((c) => scopeDocIds.includes(c.document_id)) : chunks;
  return { chunks: scoped, docMeta, versionMeta, superseded };
}

export interface StartAnswerInput {
  orgId: string;
  userId: string;
  conversationId: string | null;
  question: string;
  scopeDocIds: string[] | null;
  regenerateOf?: string;
}

export type StartAnswerResult =
  | {
      ok: true;
      conversationId: string;
      userMessageId: string;
      assistantMessageId: string;
      requestId: string;
    }
  | { ok: false; error: string; extra?: Record<string, unknown> };

/**
 * Reserve capacity and persist the exchange in a 'generating' state. The
 * worker performs retrieval/synthesis; the client observes status by polling.
 */
export function startAnswer(input: StartAnswerInput): StartAnswerResult {
  const db = getDb();
  const question = input.question.trim().slice(0, 2000);
  if (question.length < 2) return { ok: false, error: "bad_request" };

  let conversationId = input.conversationId;
  const title = question.length > 60 ? question.slice(0, 57) + "…" : question;
  if (!conversationId) {
    conversationId = newId("cnv");
    db.prepare(
      `INSERT INTO conversations (id, org_id, creator_user_id, title, scope, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(conversationId, input.orgId, input.userId, title, JSON.stringify(input.scopeDocIds ?? null), nowIso(), nowIso());
  } else {
    const conv = db
      .prepare("SELECT id FROM conversations WHERE id = ? AND org_id = ? AND creator_user_id = ? AND deleted_at IS NULL")
      .get(conversationId, input.orgId, input.userId);
    if (!conv) return { ok: false, error: "not_found" };
  }

  const requestId = newId("req");
  try {
    reserveAnswer({
      orgId: input.orgId,
      userId: input.userId,
      requestId,
      conversationId,
    });
  } catch (e) {
    if (e instanceof ReserveError) return { ok: false, error: e.code, extra: e.extra };
    throw e;
  }

  const userMessageId = newId("msg");
  const assistantMessageId = newId("msg");
  db.prepare(
    `INSERT INTO messages (id, conversation_id, org_id, role, content, status, created_at)
     VALUES (?, ?, ?, 'user', ?, 'complete', ?)`
  ).run(userMessageId, conversationId, input.orgId, question, nowIso());
  db.prepare(
    `INSERT INTO messages (id, conversation_id, org_id, role, content, status, request_id, created_at)
     VALUES (?, ?, ?, 'assistant', '', 'generating', ?, ?)`
  ).run(assistantMessageId, conversationId, input.orgId, requestId, nowIso());

  enqueueJob(
    input.orgId,
    "generate_answer",
    {
      conversationId,
      assistantMessageId,
      requestId,
      orgId: input.orgId,
      userId: input.userId,
      question,
      scopeDocIds: input.scopeDocIds ?? null,
    },
    `generate:${requestId}`
  );

  return { ok: true, conversationId, userMessageId, assistantMessageId, requestId };
}

/** The generation step, executed by the worker. Rechecks tombstones before committing. */
export function runGeneration(payload: {
  conversationId: string;
  assistantMessageId: string;
  requestId: string;
  orgId: string;
  userId: string;
  question: string;
  scopeDocIds: string[] | null;
}): void {
  const db = getDb();
  const msg = db
    .prepare("SELECT status FROM messages WHERE id = ?")
    .get(payload.assistantMessageId) as { status: string } | undefined;

  // Cancellation may have won the race while the job waited.
  if (!msg || msg.status !== "generating") {
    releaseReservation(payload.requestId, "cancelled_before_run");
    return;
  }

  const { chunks, docMeta, versionMeta, superseded } = loadRetrievalSet(payload.orgId, payload.scopeDocIds);
  const result = synthesize(payload.question, chunks, docMeta, versionMeta, superseded);

  // Tombstone recheck: drop citations whose document was deleted mid-flight
  // (deletion deletes affected conversations anyway, but belt and braces).
  const validCitations = result.citations.filter((c) => {
    const doc = db
      .prepare("SELECT deleted_at FROM documents WHERE id = ?")
      .get(c.documentId) as { deleted_at: string | null } | undefined;
    return doc && !doc.deleted_at;
  });

  tx(() => {
    db.prepare(
      `UPDATE messages SET content = ?, citations = ?, status = ? WHERE id = ? AND status = 'generating'`
    ).run(
      result.answer,
      JSON.stringify(validCitations),
      result.status === "insufficient" ? "insufficient" : "complete",
      payload.assistantMessageId
    );

    // Completion competes with cancellation through the reservation state:
    // only one of settle/release can transition from 'reserved'.
    const completed = db
      .prepare("SELECT status FROM messages WHERE id = ?")
      .get(payload.assistantMessageId) as { status: string };
    if (["complete", "insufficient"].includes(completed.status)) {
      settleReservation(payload.requestId);

      // Conversation-level union of source-version dependencies (PRD ASK-01).
      const conv = db
        .prepare("SELECT source_deps FROM conversations WHERE id = ?")
        .get(payload.conversationId) as { source_deps: string } | undefined;
      const deps = conv ? (JSON.parse(conv.source_deps) as Array<{ docId: string; versionId: string }>) : [];
      for (const c of validCitations) {
        if (!deps.some((d) => d.docId === c.documentId && d.versionId === c.versionId)) {
          deps.push({ docId: c.documentId, versionId: c.versionId });
        }
      }
      db.prepare("UPDATE conversations SET source_deps = ?, updated_at = ? WHERE id = ?").run(
        JSON.stringify(deps),
        nowIso(),
        payload.conversationId
      );
      // Historical versions referenced here stay retained up to 90 days.
      for (const c of validCitations) {
        db.prepare(
          "UPDATE document_versions SET last_referenced_at = ? WHERE id = ?"
        ).run(nowIso(), c.versionId);
      }
      db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(nowIso(), payload.conversationId);

      // First own-document answer activates the workspace (PRD §4 activation).
      const org = db
        .prepare("SELECT onboarding_step FROM organizations WHERE id = ?")
        .get(payload.orgId) as { onboarding_step: string } | undefined;
      if (org && ["naming", "visibility", "upload", "processing"].includes(org.onboarding_step)) {
        db.prepare("UPDATE organizations SET onboarding_step = 'first_question' WHERE id = ?").run(payload.orgId);
      }
      track("first_own_document_answer", { orgId: payload.orgId, userId: payload.userId });
    } else {
      releaseReservation(payload.requestId, "cancelled");
    }
  });
}

/** Explicit cancellation: message transition first, then the unit is released. */
export function cancelAnswer(orgId: string, userId: string, requestId: string): boolean {
  const db = getDb();
  const msg = db
    .prepare(
      `SELECT m.id, m.conversation_id FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE m.request_id = ? AND m.org_id = ? AND c.creator_user_id = ?`
    )
    .get(requestId, orgId, userId) as { id: string } | undefined;
  if (!msg) return false;
  const updated = db
    .prepare("UPDATE messages SET status = 'cancelled', content = '' WHERE id = ? AND status = 'generating'")
    .run(msg.id);
  releaseReservation(requestId, "user_cancelled");
  return updated.changes === 1;
}

// ---------------------------------------------------------------------------
// Anonymous demo path (PRD §9.1): same engine, isolated corpus, its own quota.
// ---------------------------------------------------------------------------

export interface DemoAnswerResult {
  ok: boolean;
  error?: string;
  answer?: string;
  status?: "complete" | "insufficient";
  citations?: Citation[];
  conflict?: Citation[] | null;
  remaining?: number;
}

export function runDemoAnswer(
  question: string,
  onConsumed: (used: number, limit: number) => void
): DemoAnswerResult {
  const db = getDb();
  const { chunks, docMeta, versionMeta, superseded } = loadRetrievalSet(DEMO_ORG_ID, null);
  const result = synthesize(question, chunks, docMeta, versionMeta, superseded);
  return {
    ok: true,
    answer: result.answer,
    status: result.status,
    citations: result.citations,
    conflict: result.conflict,
  };
}

export function demoCitationById(documentId: string, versionId: string): Citation | null {
  const db = getDb();
  const chunk = db
    .prepare(
      `SELECT c.content, c.section, c.loc_label, d.title, v.version_no
       FROM chunks c JOIN documents d ON d.id = c.document_id
       JOIN document_versions v ON v.id = c.version_id
       WHERE c.document_id = ? AND c.version_id = ? LIMIT 1`
    )
    .get(documentId, versionId) as
    | { content: string; section: string | null; loc_label: string | null; title: string; version_no: number }
    | undefined;
  if (!chunk) return null;
  return {
    n: 1,
    documentId,
    versionId,
    docTitle: chunk.title,
    versionNo: chunk.version_no,
    section: chunk.section,
    locLabel: chunk.loc_label,
    excerpt: chunk.content,
    superseded: false,
  };
}

export { loadRetrievalSet };
