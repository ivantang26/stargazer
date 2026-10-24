/**
 * Centralized data-access boundary (PRD §15): every protected read and
 * mutation flows through here, checking identity, membership, role, and
 * entitlement on the server. Hiding a button is an interface convenience —
 * this layer is the access-control mechanism.
 */
import { cookies } from "next/headers";
import { getDb, DEMO_ORG_ID, type Role } from "./db";
import { currentUser, type SessionUser } from "./auth";
import { entitlementsFor, type Entitlements } from "./entitlements";
import { subscriptionFor } from "./entitlements";

export const ACTIVE_ORG_COOKIE = "sg_org";

export interface OrgContext {
  user: SessionUser;
  orgId: string;
  orgName: string;
  role: Role;
  entitlements: Entitlements;
  isDemoOrg: false;
}

export interface WorkspaceSummary {
  orgId: string;
  orgName: string;
  role: Role;
  ownerId: string;
}

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

export function userWorkspaces(userId: string): WorkspaceSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT m.org_id, o.name AS org_name, m.role, o.owner_user_id
       FROM memberships m JOIN organizations o ON o.id = m.org_id
       WHERE m.user_id = ? ORDER BY m.created_at`
    )
    .all(userId) as Array<{ org_id: string; org_name: string; role: Role; owner_user_id: string }>;
  return rows.map((r) => ({
    orgId: r.org_id,
    orgName: r.org_name,
    role: r.role,
    ownerId: r.owner_user_id,
  }));
}

export function activeOrgIdFor(userId: string): string | null {
  const jar = cookies();
  const preferred = jar.get(ACTIVE_ORG_COOKIE)?.value;
  const spaces = userWorkspaces(userId);
  if (preferred && spaces.some((s) => s.orgId === preferred)) return preferred;
  return spaces[0]?.orgId ?? null;
}

/**
 * Resolve the workspace context for a request: a verified user, an active
 * organization, a current role, and current entitlements — or a typed reason.
 */
export async function requireOrgContext(
  minRole: Role = "member"
): Promise<{ ok: true; ctx: OrgContext } | { ok: false; reason: "unauthenticated" | "unverified" | "no_org" | "forbidden" }> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  if (!user.emailVerified) return { ok: false, reason: "unverified" };
  const orgId = activeOrgIdFor(user.id);
  if (!orgId || orgId === DEMO_ORG_ID) return { ok: false, reason: "no_org" };
  const membership = getDb()
    .prepare("SELECT role FROM memberships WHERE org_id = ? AND user_id = ?")
    .get(orgId, user.id) as { role: Role } | undefined;
  if (!membership) return { ok: false, reason: "forbidden" };
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) return { ok: false, reason: "forbidden" };
  const org = getDb()
    .prepare("SELECT name FROM organizations WHERE id = ?")
    .get(orgId) as { name: string };
  const ent = entitlementsFor(orgId);
  if (!ent) return { ok: false, reason: "no_org" };
  return {
    ok: true,
    ctx: { user, orgId, orgName: org.name, role: membership.role, entitlements: ent, isDemoOrg: false },
  };
}

export function subscriptionInfo(orgId: string) {
  return subscriptionFor(orgId);
}

/** Conversations are private to their creator in P0 (PRD §10.3). */
export function listConversations(orgId: string, userId: string) {
  return getDb()
    .prepare(
      `SELECT id, title, updated_at, created_at FROM conversations
       WHERE org_id = ? AND creator_user_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 100`
    )
    .all(orgId, userId) as Array<{ id: string; title: string; updated_at: string; created_at: string }>;
}

export function getConversation(orgId: string, userId: string, conversationId: string) {
  const conv = getDb()
    .prepare(
      `SELECT * FROM conversations WHERE id = ? AND org_id = ? AND creator_user_id = ? AND deleted_at IS NULL`
    )
    .get(conversationId, orgId, userId) as
    | { id: string; title: string; scope: string | null; created_at: string; updated_at: string }
    | undefined;
  if (!conv) return null;
  const messages = getDb()
    .prepare(
      `SELECT id, role, content, citations, status, request_id, feedback, created_at
       FROM messages WHERE conversation_id = ? ORDER BY created_at`
    )
    .all(conversationId) as Array<{
    id: string;
    role: string;
    content: string;
    citations: string | null;
    status: string;
    request_id: string | null;
    feedback: string | null;
    created_at: string;
  }>;
  return { ...conv, messages };
}

export function listDocuments(orgId: string) {
  return getDb()
    .prepare(
      `SELECT d.id, d.title, d.filename, d.ext, d.state, d.error, d.created_at, d.current_version_id,
              v.version_no, v.char_count, v.page_count, v.size_bytes, v.superseded_at IS NOT NULL AS has_history
       FROM documents d
       LEFT JOIN document_versions v ON v.id = d.current_version_id
       WHERE d.org_id = ? AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`
    )
    .all(orgId) as Array<{
    id: string;
    title: string;
    filename: string;
    ext: string;
    state: string;
    error: string | null;
    created_at: string;
    current_version_id: string | null;
    version_no: number | null;
    char_count: number | null;
    page_count: number | null;
    size_bytes: number | null;
    has_history: number;
  }>;
}

export function listMembers(orgId: string) {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.email_verified_at, m.role, m.created_at
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.org_id = ? ORDER BY m.created_at`
    )
    .all(orgId) as Array<{
    id: string;
    email: string;
    name: string;
    email_verified_at: string | null;
    role: Role;
    created_at: string;
  }>;
}

export function listInvitations(orgId: string) {
  return getDb()
    .prepare(
      `SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, i.created_at
       FROM invitations i WHERE i.org_id = ? ORDER BY i.created_at DESC`
    )
    .all(orgId) as Array<{
    id: string;
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
  }>;
}

export function recentActivity(orgId: string, userId: string) {
  const db = getDb();
  const conversations = db
    .prepare(
      `SELECT id, title, updated_at FROM conversations
       WHERE org_id = ? AND creator_user_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 5`
    )
    .all(orgId, userId) as Array<{ id: string; title: string; updated_at: string }>;
  const documents = db
    .prepare(
      `SELECT id, title, state, created_at FROM documents
       WHERE org_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`
    )
    .all(orgId) as Array<{ id: string; title: string; state: string; created_at: string }>;
  return { conversations, documents };
}

export function orgNotifications(orgId: string, limit = 10) {
  return getDb()
    .prepare(
      `SELECT id, kind, message, read_at, created_at FROM notifications
       WHERE org_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(orgId, limit) as Array<{
    id: string;
    kind: string;
    message: string;
    read_at: string | null;
    created_at: string;
  }>;
}
