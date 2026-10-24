import { NextRequest } from "next/server";
import { ok, sameOrigin } from "@/lib/http";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return ok({ status: "signed_out" });
  await destroySession();
  return ok({ status: "signed_out" });
}
