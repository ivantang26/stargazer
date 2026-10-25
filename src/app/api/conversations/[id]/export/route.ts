import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { requireOrgContext, getConversation } from "@/lib/data-access";
import type { Citation } from "@/lib/synthesis";

export const dynamic = "force-dynamic";

function mdEscape(s: string): string {
  return s.replace(/\|/g, "\\|");
}

/** Export a conversation as Markdown, sources included (PRD §10.2). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const conv = getConversation(ctx.ctx.orgId, ctx.ctx.user.id, params.id);
  if (!conv) return fail("not_found", 404);

  const lines: string[] = [`# ${conv.title}`, "", `> Stargazer export · ${new Date().toISOString()}`, ""];
  const allCitations = new Map<number, Citation>();
  for (const m of conv.messages) {
    if (m.role === "user") {
      lines.push(`## ❓ ${m.content}`, "");
    } else {
      const citations = m.citations ? (JSON.parse(m.citations) as Citation[]) : [];
      for (const c of citations) allCitations.set(c.n, c);
      lines.push(`### ${m.status === "insufficient" ? "⚠️ " : ""}${m.content}`, "");
      if (m.status === "cancelled") lines.push("_(cancelled)_", "");
    }
  }
  if (allCitations.size > 0) {
    lines.push("---", "", "## Sources", "");
    [...Array.from(allCitations.entries())]
      .sort((a, b) => a[0] - b[0])
      .forEach(([n, c]) => {
        lines.push(`**[${n}] ${c.docTitle}** - ${c.section ?? ""} (v${c.versionNo}${c.superseded ? ", superseded" : ""})`, "", `> ${mdEscape(c.excerpt).replace(/\n/g, "\n> ")}`, "");
      });
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversation-${params.id.slice(0, 8)}.md"`,
      "Cache-Control": "private, no-store",
    },
  });
}
