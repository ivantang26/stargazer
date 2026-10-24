import { createHash, randomBytes, randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Root directory for local state (embedded database, uploaded files, secret). */
export const DATA_DIR = process.env.SG_DATA_DIR
  ? path.resolve(process.env.SG_DATA_DIR)
  : path.join(process.cwd(), ".data");

export function ensureDataDir(sub?: string): string {
  const dir = sub ? path.join(DATA_DIR, sub) : DATA_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

let cachedSecret: string | null = null;

/**
 * Server secret used for session tokens, download links and HMACs. Persisted
 * under the data directory so restarts keep sessions valid. Override with SG_SECRET.
 */
export function serverSecret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.SG_SECRET && process.env.SG_SECRET.length >= 16) {
    cachedSecret = process.env.SG_SECRET;
    return cachedSecret;
  }
  const file = path.join(ensureDataDir(), "secret.key");
  if (existsSync(file)) {
    cachedSecret = readFileSync(file, "utf8").trim();
  } else {
    cachedSecret = randomBytes(32).toString("hex");
    writeFileSync(file, cachedSecret, { encoding: "utf8" });
  }
  return cachedSecret;
}

export function newId(prefix = ""): string {
  return prefix ? `${prefix}_${randomUUID()}` : randomUUID();
}

export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmacSign(payload: string): string {
  return createHmac("sha256", serverSecret()).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoPlusDays(iso: string | Date, days: number): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(d.getTime() + days * 86_400_000).toISOString();
}

export function isoPlusMinutes(iso: string | Date, minutes: number): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(d.getTime() + minutes * 60_000).toISOString();
}

export function isoPlusSeconds(iso: string | Date, seconds: number): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(d.getTime() + seconds * 1000).toISOString();
}

export function formatDate(iso: string | Date, locale: "en" | "zh-hant"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(locale === "zh-hant" ? "zh-Hant-HK" : "en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | Date, locale: "en" | "zh-hant"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(locale === "zh-hant" ? "zh-Hant-HK" : "en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pct(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function clampString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
