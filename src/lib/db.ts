/**
 * Embedded SQLite data layer (PRD §15/§16).
 *
 * The PRD proposes Supabase Postgres + pgvector for production. This build uses
 * an embedded SQLite database behind the same centralized data-access boundary
 * (`data-access.ts`) so the application runs locally with zero external
 * services while preserving the model: every customer table carries an
 * organization identifier and all access goes through tenant-checked helpers.
 */
import Database from "better-sqlite3";
import { ensureDataDir } from "./util";
import { seedDemoCorpus } from "./demo-corpus";
import { seedContentEntries } from "./content-seed";

export const DEMO_ORG_ID = "00000000-demo-0000-0000-000000000001";
export const STAFF_ORG_ID = "00000000-stf0-0000-0000-000000000002";

export type Role = "owner" | "admin" | "member";
export type DocState = "queued" | "processing" | "ready" | "failed" | "deleting";
export type MessageStatus = "generating" | "complete" | "insufficient" | "cancelled" | "failed";
export type ReservationState = "reserved" | "settled" | "released";
export type SubscriptionStatus =
  | "trialing"
  | "pending_confirmation"
  | "active"
  | "cancel_at_period_end"
  | "past_due"
  | "read_only"
  | "canceled";
export type LeadStatus = "new" | "assigned" | "contacted" | "qualified" | "closed" | "declined";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'en',
  email_verified_at TEXT,
  is_staff INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,            -- verify_email | password_reset
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  onboarding_step TEXT NOT NULL DEFAULT 'naming',
  sample_enabled INTEGER NOT NULL DEFAULT 0,
  deletion_status TEXT,             -- NULL | requested | running | complete
  deletion_progress TEXT,           -- JSON {subscription_canceled, content_deleted}
  deletion_requested_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,               -- owner | admin | member
  created_at TEXT NOT NULL,
  UNIQUE (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,               -- admin | member
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  ext TEXT NOT NULL,
  mime TEXT NOT NULL,
  checksum TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  current_version_id TEXT,
  error TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id, state);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  char_count INTEGER DEFAULT 0,
  page_count INTEGER DEFAULT 0,
  storage_path TEXT,
  state TEXT NOT NULL,              -- processing | ready | failed | purged
  error TEXT,
  superseded_at TEXT,
  last_referenced_at TEXT,
  purged_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_doc ON document_versions(document_id);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  content TEXT NOT NULL,
  section TEXT,
  loc_label TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunks_version ON chunks(org_id, version_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  creator_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scope TEXT,                       -- JSON document scope
  source_deps TEXT NOT NULL DEFAULT '[]', -- JSON [{docId, versionId}]
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(org_id, creator_user_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  role TEXT NOT NULL,               -- user | assistant
  content TEXT NOT NULL,
  citations TEXT,                   -- JSON citation list for assistant messages
  status TEXT NOT NULL,             -- generating | complete | insufficient | cancelled | failed
  request_id TEXT,
  feedback TEXT,                    -- JSON {kind, note}
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS usage_reservations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  request_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,              -- reserved | settled | released
  reason TEXT,                      -- settle/release reason
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  settled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reservations_org ON usage_reservations(org_id, created_at);

CREATE TABLE IF NOT EXISTS cost_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  request_id TEXT,
  kind TEXT NOT NULL,               -- reserve | settle | release | provider_attempt | purge
  detail TEXT,                      -- JSON
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  current_period_start TEXT,
  current_period_end TEXT,
  period_allowance INTEGER,         -- answers allowance for the current period
  allowance_80_notified TEXT,
  allowance_100_notified TEXT,
  grace_ends_at TEXT,
  read_only_until TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  provider_ref TEXT,
  pending_plan_id TEXT,             -- scheduled downgrade
  last_event_seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  kind TEXT NOT NULL,               -- new | upgrade
  status TEXT NOT NULL,             -- open | completed | expired | abandoned
  prorated_charge_hkd INTEGER,
  from_plan_id TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  number TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  amount_hkd INTEGER NOT NULL,
  kind TEXT NOT NULL,               -- subscription | proration
  status TEXT NOT NULL,             -- paid | open | void
  period_start TEXT,
  period_end TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  event_id TEXT NOT NULL UNIQUE,    -- provider event id, deduplicated
  type TEXT NOT NULL,
  payload TEXT NOT NULL,            -- JSON
  status TEXT NOT NULL,             -- received | processed | ignored | error
  result TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,            -- JSON
  dedupe_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | failed
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  lease_until TEXT,
  run_after TEXT NOT NULL,
  result TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, run_after);

CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  link TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  org_name TEXT NOT NULL DEFAULT '',
  enquiry_type TEXT NOT NULL,
  message TEXT NOT NULL,
  team_size TEXT,
  doc_volume TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  locale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id, created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  org_id TEXT,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  result TEXT NOT NULL,
  detail TEXT,                      -- JSON
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id, created_at);

CREATE TABLE IF NOT EXISTS deletion_register (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  document_id TEXT,
  kind TEXT NOT NULL,               -- document | organization | conversation | version_purge
  progress TEXT NOT NULL,           -- JSON checklist
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_entries (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL,               -- article | faq | release_note
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',  -- draft | published
  owner TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  UNIQUE (locale, slug)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  anon_id TEXT,
  user_id TEXT,
  org_id TEXT,
  locale TEXT,
  props TEXT,                       -- JSON, no document names/prompt bodies/emails/URLs
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_events(name, created_at);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_sessions (
  token TEXT PRIMARY KEY,
  ip_hash TEXT,
  questions_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_at TEXT NOT NULL
);
`;

let dbInstance: Database.Database | null = null;
let seedPromise: Promise<void> | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dir = ensureDataDir();
  const db = new Database(`${dir}/stargazer.db`);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 15000");
  db.pragma("foreign_keys = ON");
  // DDL and the WAL pragma can race across concurrent processes (e.g. several
  // prerender workers); retry briefly instead of failing the open.
  for (let attempt = 0; ; attempt++) {
    try {
      db.exec(SCHEMA);
      break;
    } catch (e) {
      if (attempt >= 8 || !String(e).includes("SQLITE_BUSY")) throw e;
      const wait = 50 * (attempt + 1);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
    }
  }
  dbInstance = db;
  // Lazily start the background worker on the first database open in this
  // server process (replaces Next instrumentation, which would bundle native
  // modules for the edge runtime).
  const g = globalThis as unknown as { __sgWorkerRequested?: boolean };
  if (!g.__sgWorkerRequested) {
    g.__sgWorkerRequested = true;
    void (async () => {
      try {
        const { startWorker } = await import("./worker");
        startWorker();
      } catch (e) {
        console.error("[db] worker failed to start", e);
      }
    })();
  }
  return db;
}

/**
 * Run seeders exactly once per process. Static prerendering spawns several
 * workers that open the database concurrently, so the write path is guarded
 * by a read-only flag and retried patiently on SQLITE_BUSY.
 */
export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const db = getDb();
      const flag = db
        .prepare("SELECT value FROM app_settings WHERE key = '_seeded'")
        .get() as { value: string } | undefined;
      if (flag) return;
      for (let attempt = 0; ; attempt++) {
        try {
          const tx = db.transaction(() => {
            seedDemoCorpus(db);
            seedContentEntries(db);
            setDefaultSetting(db, "generation_enabled", "true");
            setDefaultSetting(db, "demo_enabled", "true");
            setDefaultSetting(db, "_seeded", new Date().toISOString());
          });
          tx();
          return;
        } catch (e) {
          if (!String(e).includes("SQLITE_BUSY")) {
            // Another worker seeded while we waited; treat as done.
            const done = db
              .prepare("SELECT value FROM app_settings WHERE key = '_seeded'")
              .get() as { value: string } | undefined;
            if (done) return;
            console.error("[db] seed failed", e);
            seedPromise = null;
            throw e;
          }
          if (attempt >= 20) {
            console.error("[db] seed gave up after retries");
            seedPromise = null;
            throw e;
          }
          await new Promise((r) => setTimeout(r, Math.min(500, 40 * (attempt + 1))));
        }
      }
    })();
  }
  return seedPromise;
}

export function setDefaultSetting(db: Database.Database, key: string, value: string): void {
  db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
}

export function getSetting(key: string, fallback = ""): string {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : fallback;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

export function tx<T>(fn: () => T): T {
  const db = getDb();
  return db.transaction(fn)();
}
