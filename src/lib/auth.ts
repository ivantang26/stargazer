/**
 * Email + password authentication with verified addresses, password reset,
 * and server-side sessions (PRD §9.2). Identity is the sole authority for
 * account state; every protected read still re-checks membership and role
 * through the data-access layer.
 */
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getDb, ensureSeeded, type Role } from "./db";
import { newId, newToken, nowIso, isoPlusDays } from "./util";

export const SESSION_COOKIE = "sg_session";
const SESSION_DAYS = 14;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  locale: "en" | "zh-hant";
  isStaff: boolean;
  emailVerified: boolean;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push("length");
  if (!/[a-zA-Z]/.test(password)) problems.push("letter");
  if (!/[0-9]/.test(password)) problems.push("digit");
  return problems;
}

export async function createSession(userId: string): Promise<void> {
  await ensureSeeded();
  const token = newToken(32);
  const db = getDb();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    token,
    userId,
    isoPlusDays(new Date(), SESSION_DAYS),
    nowIso()
  );
  const jar = cookies();
  // Mark Secure only when the request actually arrived over HTTPS, so local
  // HTTP testing and non-TLS previews keep working.
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? (h.get("host")?.startsWith("localhost") ? "http" : "http");
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession(): Promise<void> {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  jar.delete(SESSION_COOKIE);
}

export function userFromSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.locale, u.is_staff, u.email_verified_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as
    | {
        id: string;
        email: string;
        name: string;
        locale: string;
        is_staff: number;
        email_verified_at: string | null;
        expires_at: string;
      }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    locale: row.locale === "zh-hant" ? "zh-hant" : "en",
    isStaff: row.is_staff === 1,
    emailVerified: !!row.email_verified_at,
  };
}

export async function currentUser(): Promise<SessionUser | null> {
  await ensureSeeded();
  const jar = cookies();
  return userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function findUserByEmail(email: string) {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as
    | {
        id: string;
        email: string;
        password_hash: string;
        name: string;
        locale: string;
        email_verified_at: string | null;
        is_staff: number;
        created_at: string;
      }
    | undefined;
}

export function createAuthToken(userId: string, purpose: "verify_email" | "password_reset"): string {
  const token = newToken(24);
  getDb()
    .prepare(
      "INSERT INTO auth_tokens (token, user_id, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(token, userId, purpose, isoPlusDays(new Date(), 1), nowIso());
  return token;
}

export function consumeAuthToken(
  token: string,
  purpose: "verify_email" | "password_reset"
): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM auth_tokens WHERE token = ? AND purpose = ?")
    .get(token, purpose) as
    | { token: string; user_id: string; expires_at: string; used_at: string | null }
    | undefined;
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return null;
  db.prepare("UPDATE auth_tokens SET used_at = ? WHERE token = ?").run(nowIso(), token);
  return row.user_id;
}

export function createUser(
  email: string,
  password: string,
  name: string,
  locale: "en" | "zh-hant"
): { ok: true; userId: string } | { ok: false; error: "email_taken" } {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (exists) return { ok: false, error: "email_taken" };
  const userId = newId("usr");
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, locale, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, normalized, hashPassword(password), name.trim().slice(0, 120), locale, nowIso());
  return { ok: true, userId };
}

/** Membership row for a user in an organization, with role. */
export function membershipOf(
  userId: string,
  orgId: string
): { orgId: string; role: Role; orgName: string; ownerId: string } | null {
  const row = getDb()
    .prepare(
      `SELECT m.org_id, m.role, o.name AS org_name, o.owner_user_id
       FROM memberships m JOIN organizations o ON o.id = m.org_id
       WHERE m.user_id = ? AND m.org_id = ?`
    )
    .get(userId, orgId) as
    | { org_id: string; role: Role; org_name: string; owner_user_id: string }
    | undefined;
  if (!row) return null;
  return { orgId: row.org_id, role: row.role, orgName: row.org_name, ownerId: row.owner_user_id };
}
