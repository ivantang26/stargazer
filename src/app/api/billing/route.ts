import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import {
  createCheckout,
  simulatePayment,
  providerCancelAtPeriodEnd,
  providerResume,
  providerFailRenewal,
  providerRenewPaid,
  redeliverEvent,
} from "@/lib/billing";
import type { PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Billing operations (PRD §12.2). The server creates checkout sessions from
 * approved plan identifiers and the authorized organization only — never from
 * a price, currency, or customer identifier supplied by the browser.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("owner");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;
  const body = await readJson<{
    action?: string;
    plan?: string;
    checkoutId?: string;
    outcome?: "pay" | "fail" | "delay";
    eventId?: string;
  }>(req);

  switch (body?.action) {
    case "checkout": {
      const plan = body.plan as PlanId;
      if (!["starter", "team"].includes(plan)) return fail("bad_request", 400);
      const result = createCheckout(c.orgId, plan);
      if ("error" in result) return fail(result.error, 400);
      return ok({ checkout: result });
    }
    case "simulate_payment": {
      if (!body.checkoutId || !body.outcome) return fail("bad_request", 400);
      const result = simulatePayment(body.checkoutId, body.outcome, c.user.id);
      return ok(result);
    }
    case "cancel_at_period_end": {
      providerCancelAtPeriodEnd(c.orgId, c.user.id);
      return ok({ status: "cancelling" });
    }
    case "resume": {
      providerResume(c.orgId, c.user.id);
      return ok({ status: "resumed" });
    }
    case "simulate_renewal": {
      if (body.outcome === "fail") {
        providerFailRenewal(c.orgId, c.user.id);
        return ok({ status: "past_due" });
      }
      providerRenewPaid(c.orgId);
      return ok({ status: "renewed" });
    }
    case "redeliver_event": {
      if (!body.eventId) return fail("bad_request", 400);
      const delivered = redeliverEvent(body.eventId);
      return delivered ? ok({ status: "redelivered" }) : fail("not_found", 404);
    }
    default:
      return fail("bad_request", 400);
  }
}
