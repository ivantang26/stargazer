/**
 * Background worker (PRD §15): a durable Postgres-style queue on SQLite with
 * leases, retries and idempotent effects, drained by an in-process loop.
 */
import { getDb } from "./db";
import { nowIso, isoPlusSeconds } from "./util";
import { runDocumentProcessing, purgeDocumentData, purgeStaleVersions } from "./document-service";
import { runGeneration } from "./answer-service";
import { runReconciliation, enqueueJob } from "./billing";
import {
  deleteOrganizationContent,
  providerCancelSubscriptionImmediately,
} from "./org-service";

interface JobRow {
  id: string;
  org_id: string | null;
  type: string;
  payload: string;
  status: string;
  attempts: number;
  max_attempts: number;
}

const globalForWorker = globalThis as unknown as { __sgWorker?: { timer: NodeJS.Timeout; tick: NodeJS.Timeout } };

export function startWorker(): void {
  if (globalForWorker.__sgWorker) return;
  const drain = () => {
    try {
      claimAndRun();
    } catch (e) {
      console.error("[worker] drain error", e);
    }
  };
  const timer = setInterval(drain, 1200);
  const tick = setInterval(() => {
    try {
      runReconciliation();
      purgeStaleVersions();
    } catch (e) {
      console.error("[worker] reconciliation error", e);
    }
  }, 60_000);
  timer.unref?.();
  tick.unref?.();
  globalForWorker.__sgWorker = { timer, tick };
  console.log("[worker] started");
}

function claimAndRun(): void {
  const db = getDb();
  for (let i = 0; i < 8; i++) {
    const job = db
      .prepare(
        `SELECT * FROM jobs WHERE status = 'queued' AND run_after <= ? ORDER BY run_after LIMIT 1`
      )
      .get(nowIso()) as JobRow | undefined;
    if (!job) return;
    db.prepare(
      `UPDATE jobs SET status = 'running', attempts = attempts + 1, lease_until = ?, updated_at = ? WHERE id = ?`
    ).run(isoPlusSeconds(new Date(), 60), nowIso(), job.id);
    try {
      const result = runJob(job);
      db.prepare(
        `UPDATE jobs SET status = 'done', result = ?, updated_at = ? WHERE id = ?`
      ).run(result ? JSON.stringify(result) : null, nowIso(), job.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (job.attempts + 1 >= job.max_attempts) {
        db.prepare(
          `UPDATE jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?`
        ).run(message, nowIso(), job.id);
        onJobFailed(job, message);
      } else {
        const backoffSeconds = Math.min(60, 2 ** job.attempts);
        db.prepare(
          `UPDATE jobs SET status = 'queued', error = ?, run_after = ?, updated_at = ? WHERE id = ?`
        ).run(message, isoPlusSeconds(new Date(), backoffSeconds), nowIso(), job.id);
      }
    }
  }
}

function runJob(job: JobRow): Record<string, unknown> | null {
  const payload = JSON.parse(job.payload) as Record<string, unknown>;
  switch (job.type) {
    case "process_document":
      runDocumentProcessing(String(payload.documentId), String(payload.versionId));
      return { processed: true };
    case "generate_answer":
      runGeneration({
        conversationId: String(payload.conversationId),
        assistantMessageId: String(payload.assistantMessageId),
        requestId: String(payload.requestId),
        orgId: String(payload.orgId),
        userId: String(payload.userId),
        question: String(payload.question),
        scopeDocIds: (payload.scopeDocIds as string[] | null) ?? null,
      });
      return { generated: true };
    case "purge_document_data":
      void purgeDocumentData(String(payload.documentId));
      return { purging: true };
    case "purge_unreferenced_versions":
      purgeStaleVersions();
      return { swept: true };
    case "purge_organization_content":
      void deleteOrganizationContent(String(job.org_id), "retention_window_closed");
      return { purging: true };
    case "organization_deletion_phase1": {
      // Cancel the subscription with the provider first and wait for
      // confirmation before touching content.
      providerCancelSubscriptionImmediately(String(job.org_id), String(payload.actorUserId ?? ""));
      enqueueJob(job.org_id, "organization_deletion_phase2", { actorUserId: payload.actorUserId ?? "" });
      return { phase: 1 };
    }
    case "organization_deletion_phase2":
      void deleteOrganizationContent(String(job.org_id), "owner_requested");
      return { phase: 2 };
    default:
      return { unknown: job.type };
  }
}

function onJobFailed(job: JobRow, message: string): void {
  const db = getDb();
  if (job.type === "generate_answer") {
    try {
      const payload = JSON.parse(job.payload) as { assistantMessageId: string; requestId: string };
      db.prepare(
        `UPDATE messages SET status = 'failed', content = ? WHERE id = ? AND status = 'generating'`
      ).run("", payload.assistantMessageId);
      // Infrastructure failure without a committed response never consumes an
      // answer unit (PRD §12.1).
      db.prepare(
        `UPDATE usage_reservations SET state = 'released', reason = ?, settled_at = ? WHERE request_id = ? AND state = 'reserved'`
      ).run(`job_failed: ${message}`, nowIso(), payload.requestId);
    } catch {
      // best-effort cleanup
    }
  }
}
