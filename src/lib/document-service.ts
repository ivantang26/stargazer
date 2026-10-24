/**
 * Document lifecycle service (PRD §10.1 DOC-01).
 *
 * Truthful terminal states, safe retries, duplicate checksum handling within
 * the organization, atomic version replacement, and tombstoned deletion that
 * cascades to conversations whose answers cited the document.
 */
import { unlink } from "node:fs/promises";
import path from "node:path";
import { getDb, tx } from "./db";
import { ensureDataDir, newId, nowIso, sha256Hex, isoPlusDays } from "./util";
import { storeFile, readStoredFile, ingestBuffer, chunkDocument, extensionOf } from "./ingest";
import { entitlementsFor, documentCount, storageUsedBytes } from "./entitlements";
import { enqueueJob } from "./billing";
import { audit } from "./audit";

export class DocError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface UploadOutcome {
  documentId: string;
  versionId: string;
  duplicateOf?: string;
}

/**
 * Create a document (or a new version of an existing one) from an uploaded
 * buffer. Validation of entitlements, duplicates, and limits happens here; the
 * heavy parsing runs in the worker.
 */
export async function createUpload(args: {
  orgId: string;
  userId: string;
  filename: string;
  mime: string;
  buffer: Buffer;
  replaceDocumentId?: string;
  onDuplicate?: "keep" | "replace" | "reject";
}): Promise<UploadOutcome> {
  const ent = entitlementsFor(args.orgId);
  if (!ent) throw new DocError("not_found", "Workspace not found.");
  if (!ent.canUpload) {
    throw new DocError(
      ent.status === "read_only" || ent.readOnly ? "read_only" : "quota_exceeded",
      "Uploads are paused for this workspace."
    );
  }

  const checksum = sha256Hex(args.buffer);

  // Duplicate checksum within the same organization prompts keep-or-replace.
  // It must not reveal whether another organization has the same file.
  const dup = getDb()
    .prepare(
      `SELECT id FROM documents WHERE org_id = ? AND checksum = ? AND deleted_at IS NULL AND id != ?`
    )
    .get(args.orgId, checksum, args.replaceDocumentId ?? "") as { id: string } | undefined;
  if (dup && args.onDuplicate !== "replace" && !args.replaceDocumentId) {
    throw new DocError("duplicate_checksum", `An identical file already exists in this workspace.`);
  }

  const isReplace = !!args.replaceDocumentId;
  if (!isReplace) {
    if (documentCount(args.orgId) >= ent.limits.documents) {
      throw new DocError("doc_limit", `Your plan includes ${ent.limits.documents} active documents.`);
    }
  }
  if (storageUsedBytes(args.orgId) + args.buffer.byteLength > ent.limits.storageMb * 1024 * 1024) {
    throw new DocError("storage_limit", `Your plan includes ${ent.limits.storageMb} MB of storage.`);
  }

  const ext = extensionOf(args.filename) || "txt";
  const storagePath = await storeFile(args.orgId, newId("file"), ext, args.buffer);
  const versionId = newId("dv");

  const docId = tx(() => {
    const db = getDb();
    if (args.replaceDocumentId) {
      const doc = db
        .prepare("SELECT * FROM documents WHERE id = ? AND org_id = ? AND deleted_at IS NULL")
        .get(args.replaceDocumentId, args.orgId) as
        | { id: string; title: string }
        | undefined;
      if (!doc) throw new DocError("not_found", "Document not found.");
      const last = db
        .prepare(
          "SELECT MAX(version_no) AS n FROM document_versions WHERE document_id = ?"
        )
        .get(doc.id) as { n: number };
      db.prepare(
        `INSERT INTO document_versions (id, document_id, org_id, version_no, checksum, size_bytes, state, storage_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?)`
      ).run(versionId, doc.id, args.orgId, (last.n ?? 0) + 1, checksum, args.buffer.byteLength, storagePath, nowIso());
      db.prepare(
        "UPDATE documents SET state = 'processing', current_version_id = ?, error = NULL WHERE id = ?"
      ).run(versionId, doc.id);
      return doc.id;
    }
    const id = newId("doc");
    const title = args.filename.replace(/\.[a-z0-9]+$/i, "").slice(0, 120) || "Untitled document";
    db.prepare(
      `INSERT INTO documents (id, org_id, title, filename, ext, mime, checksum, state, current_version_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`
    ).run(id, args.orgId, title, args.filename.slice(0, 200), ext, args.mime, checksum, versionId, args.userId, nowIso());
    db.prepare(
      `INSERT INTO document_versions (id, document_id, org_id, version_no, checksum, size_bytes, state, storage_path, created_at)
       VALUES (?, ?, ?, 1, ?, ?, 'processing', ?, ?)`
    ).run(versionId, id, args.orgId, checksum, args.buffer.byteLength, storagePath, nowIso());
    return id;
  });

  enqueueJob(args.orgId, "process_document", { documentId: docId, versionId }, `process:${versionId}`);
  audit({
    actorUserId: args.userId,
    orgId: args.orgId,
    action: isReplace ? "document.version_added" : "document.created",
    scope: "documents",
    result: "success",
    detail: { documentId: docId, versionId },
  });
  return { documentId: docId, versionId };
}

/** Worker step: parse bytes, apply limits, chunk, index. */
export function runDocumentProcessing(documentId: string, versionId: string): void {
  const db = getDb();
  const version = db
    .prepare("SELECT * FROM document_versions WHERE id = ? AND document_id = ?")
    .get(versionId, documentId) as
    | {
        id: string;
        org_id: string;
        storage_path: string;
        document_id: string;
        version_no: number;
      }
    | undefined;
  if (!version) return;
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL")
    .get(documentId) as { id: string; filename: string; ext: string; mime: string } | undefined;
  if (!doc) return; // deleted mid-queue

  db.prepare("UPDATE documents SET state = 'processing' WHERE id = ?").run(documentId);

  readStoredFile(version.storage_path)
    .then((buffer) => ingestBuffer(doc.filename, doc.mime, buffer, version.org_id))
    .then((outcome) => {
      if (!outcome.ok) {
        db.prepare("UPDATE document_versions SET state = 'failed', error = ? WHERE id = ?").run(
          outcome.error.message,
          versionId
        );
        // Failed replacement leaves the prior version serving.
        const prior = db
          .prepare(
            `SELECT id FROM document_versions WHERE document_id = ? AND id != ? AND state = 'ready'
             ORDER BY version_no DESC LIMIT 1`
          )
          .get(documentId, versionId) as { id: string } | undefined;
        if (prior) {
          db.prepare("UPDATE documents SET state = 'ready', current_version_id = ? WHERE id = ?").run(prior.id, documentId);
        } else {
          db.prepare("UPDATE documents SET state = 'failed', error = ? WHERE id = ?").run(outcome.error.message, documentId);
        }
        return;
      }
      const chunks = chunkDocument(outcome.parsed, doc.ext === "pdf");
      const insert = db.prepare(
        `INSERT INTO chunks (id, org_id, document_id, version_id, seq, content, section, loc_label, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      tx(() => {
        db.prepare("DELETE FROM chunks WHERE document_id = ? AND version_id = ?").run(documentId, versionId);
        for (const c of chunks) {
          insert.run(newId("chk"), version.org_id, documentId, versionId, c.seq, c.content, c.section, c.locLabel, nowIso());
        }
        db.prepare(
          `UPDATE document_versions SET state = 'ready', char_count = ?, page_count = ? WHERE id = ?`
        ).run(outcome.parsed.charCount, outcome.parsed.pageCount, versionId);
        // Atomic swap: the new version becomes the retrieval source; the old
        // stops serving new questions immediately.
        const previous = db
          .prepare(
            `SELECT id FROM document_versions WHERE document_id = ? AND id != ? AND superseded_at IS NULL AND state = 'ready'`
          )
          .all(documentId, versionId) as Array<{ id: string }>;
        for (const p of previous) {
          db.prepare("UPDATE document_versions SET superseded_at = ? WHERE id = ?").run(nowIso(), p.id);
        }
        db.prepare(
          "UPDATE documents SET state = 'ready', current_version_id = ?, error = NULL WHERE id = ?"
        ).run(versionId, documentId);
      });
      // Unreferenced historical versions are purged within 24h; referenced
      // ones follow the 90-day reference policy (worker sweep).
      enqueueJob(version.org_id, "purge_unreferenced_versions", { documentId }, `purge:${documentId}`);
    })
    .catch((e) => {
      db.prepare("UPDATE document_versions SET state = 'failed', error = ? WHERE id = ?").run(
        e instanceof Error ? e.message : "processing error",
        versionId
      );
      db.prepare("UPDATE documents SET state = 'failed', error = ? WHERE id = ?").run(
        "Processing failed. You can retry from the documents list.",
        documentId
      );
    });
}

/** Retry a failed job safely; duplicate retries never double-index. */
export function retryDocument(orgId: string, documentId: string): void {
  const db = getDb();
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND org_id = ? AND deleted_at IS NULL")
    .get(documentId, orgId) as
    | { id: string; current_version_id: string; state: string }
    | undefined;
  if (!doc || doc.state !== "failed") throw new DocError("bad_request", "Only failed documents can be retried.");
  db.prepare("UPDATE document_versions SET state = 'processing', error = NULL WHERE id = ?").run(doc.current_version_id);
  db.prepare("UPDATE documents SET state = 'processing', error = NULL WHERE id = ?").run(documentId);
  enqueueJob(orgId, "process_document", { documentId, versionId: doc.current_version_id }, `process:${doc.current_version_id}:retry:${Date.now()}`);
}

/**
 * Deletion (PRD ASK-01): tombstone immediately, delete conversations that
 * used any version of this document, then purge bytes/chunks asynchronously.
 */
export function deleteDocument(orgId: string, userId: string, documentId: string): number {
  const db = getDb();
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND org_id = ? AND deleted_at IS NULL")
    .get(documentId, orgId) as { id: string } | undefined;
  if (!doc) throw new DocError("not_found", "Document not found.");

  const conversations = db
    .prepare("SELECT id, source_deps FROM conversations WHERE org_id = ? AND deleted_at IS NULL")
    .all(orgId) as Array<{ id: string; source_deps: string }>;
  const affected = conversations.filter((c) => {
    try {
      const deps = JSON.parse(c.source_deps) as Array<{ docId: string }>;
      return deps.some((d) => d.docId === documentId);
    } catch {
      return false;
    }
  });

  tx(() => {
    // Tombstone check excludes the document from new retrieval immediately.
    db.prepare("UPDATE documents SET state = 'deleting', deleted_at = ? WHERE id = ?").run(nowIso(), documentId);
    for (const c of affected) {
      db.prepare("UPDATE conversations SET deleted_at = ? WHERE id = ?").run(nowIso(), c.id);
    }
    db.prepare(
      `INSERT INTO deletion_register (id, org_id, document_id, kind, progress, created_at)
       VALUES (?, ?, ?, 'document', ?, ?)`
    ).run(
      newId("del"),
      orgId,
      documentId,
      JSON.stringify({ tombstoned: true, conversations_deleted: affected.length, bytes_purged: "pending" }),
      nowIso()
    );
  });

  enqueueJob(orgId, "purge_document_data", { documentId }, `purge:${documentId}:data`);
  audit({
    actorUserId: userId,
    orgId,
    action: "document.deleted",
    scope: "documents",
    result: "success",
    detail: { documentId, conversationsDeleted: affected.length },
  });
  return affected.length;
}

/** Worker step: remove chunks, version rows, and stored bytes. */
export async function purgeDocumentData(documentId: string): Promise<void> {
  const db = getDb();
  const versions = db
    .prepare("SELECT id, storage_path FROM document_versions WHERE document_id = ?")
    .all(documentId) as Array<{ id: string; storage_path: string | null }>;
  tx(() => {
    db.prepare("DELETE FROM chunks WHERE document_id = ?").run(documentId);
    db.prepare("DELETE FROM document_versions WHERE document_id = ?").run(documentId);
    db.prepare("DELETE FROM documents WHERE id = ?").run(documentId);
    db.prepare(
      `UPDATE deletion_register SET progress = ?, completed_at = ? WHERE document_id = ? AND kind = 'document'`
    ).run(JSON.stringify({ tombstoned: true, bytes_purged: "done" }), nowIso(), documentId);
  });
  for (const v of versions) {
    if (v.storage_path) {
      try {
        await unlink(path.join(ensureDataDir(), v.storage_path));
      } catch {
        // already gone
      }
    }
  }
}

/** Sweep superseded versions: unreferenced purged after 24h, referenced expire after 90 days. */
export function purgeStaleVersions(): void {
  const db = getDb();
  const cutoff24 = isoPlusDays(new Date(), -1);
  const cutoff90 = isoPlusDays(new Date(), -90);
  const candidates = db
    .prepare(
      `SELECT v.id, v.org_id, v.superseded_at, v.last_referenced_at FROM document_versions v
       WHERE v.superseded_at IS NOT NULL AND v.state != 'purged'`
    )
    .all() as Array<{ id: string; org_id: string; superseded_at: string; last_referenced_at: string | null }>;
  for (const v of candidates) {
    const stillReferenced = db
      .prepare("SELECT COUNT(*) AS n FROM conversations WHERE deleted_at IS NULL AND source_deps LIKE ?")
      .get(`%"${v.id}"%`) as { n: number };
    const refTime = v.last_referenced_at ?? v.superseded_at;
    const expired = new Date(refTime).getTime() < new Date(cutoff90).getTime();
    if (!stillReferenced.n && v.superseded_at < cutoff24) {
      db.prepare("UPDATE document_versions SET state = 'purged', purged_at = ? WHERE id = ?").run(nowIso(), v.id);
    } else if (stillReferenced.n && expired) {
      db.prepare("UPDATE document_versions SET state = 'purged', purged_at = ? WHERE id = ?").run(nowIso(), v.id);
    }
  }
}
