import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { hmacSign, safeEqual, isoPlusSeconds } from "@/lib/util";
import { readStoredFile } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Short-lived authorized download (PRD §11: existing signed file links expire
 * within sixty seconds). GET ?exp=...&sig=... serves the bytes; POST issues a
 * fresh signed link. Links are bound to the document and user.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;
  const row = getDb()
    .prepare(
      `SELECT v.storage_path, v.version_no FROM documents d
       JOIN document_versions v ON v.id = d.current_version_id
       WHERE d.id = ? AND d.org_id = ? AND d.deleted_at IS NULL`
    )
    .get(params.id, c.orgId) as { storage_path: string; version_no: number } | undefined;
  if (!row) return fail("not_found", 404);
  const exp = isoPlusSeconds(new Date(), 60);
  const payload = `${c.orgId}:${c.user.id}:${params.id}:${exp}`;
  const sig = hmacSign(payload);
  return NextResponse.json({ ok: true, url: `/api/documents/${params.id}/link?exp=${encodeURIComponent(exp)}&sig=${encodeURIComponent(sig)}` });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;
  const exp = req.nextUrl.searchParams.get("exp") ?? "";
  const sig = req.nextUrl.searchParams.get("sig") ?? "";
  if (!exp || !sig || new Date(exp).getTime() < Date.now()) return fail("expired", 403);
  const payload = `${c.orgId}:${c.user.id}:${params.id}:${exp}`;
  if (!safeEqual(hmacSign(payload), sig)) return fail("forbidden", 403);

  const row = getDb()
    .prepare(
      `SELECT v.storage_path, d.filename FROM documents d
       JOIN document_versions v ON v.id = d.current_version_id
       WHERE d.id = ? AND d.org_id = ? AND d.deleted_at IS NULL`
    )
    .get(params.id, c.orgId) as { storage_path: string; filename: string } | undefined;
  if (!row || !row.storage_path) return fail("not_found", 404);
  try {
    const bytes = await readStoredFile(row.storage_path);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(row.filename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return fail("not_found", 404);
  }
}
