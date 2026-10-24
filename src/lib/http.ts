/**
 * Shared helpers for Route Handlers: JSON responses, same-origin enforcement
 * for state-changing requests (PRD §17 CSRF protection), and in-memory rate
 * limiting for public endpoints (PRD §9.1 abuse limits).
 */
import { NextRequest, NextResponse } from "next/server";

export function ok<T extends object>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(
  code: string,
  status: number,
  extra: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({ ok: false, error: code, ...extra }, { status });
}

/** Standard error codes (PRD §16): unauthenticated, forbidden, unsupported_file, quota_exceeded, payment_pending, processing_delayed, provider_unavailable. */
export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "unsupported_file"
  | "file_too_large"
  | "quota_exceeded"
  | "payment_pending"
  | "processing_delayed"
  | "provider_unavailable"
  | "conflict"
  | "rate_limited"
  | "generation_disabled"
  | "concurrency_limit";

const Mutating = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Reject cross-site state-changing calls by checking the Origin header. */
export function sameOrigin(req: NextRequest): boolean {
  if (!Mutating.has(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from server actions may omit it
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    return !host || o.host === host;
  } catch {
    return false;
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export async function readJson<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
