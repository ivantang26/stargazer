/**
 * Versioned plan catalogue — the single source of truth for prices, limits and
 * entitlement rules, used by the public pricing page, checkout simulation and
 * the entitlement engine (PRD §8.3, §12.1).
 *
 * All amounts are proposed HKD monthly prices (PRD §12.1). Changing any value
 * requires bumping PLAN_CATALOG_VERSION and reviewing existing subscriptions.
 */

export const PLAN_CATALOG_VERSION = 1;

export type PlanId = "trial" | "starter" | "team" | "business";

export interface PlanLimits {
  seats: number;
  /** Completed answers per billing period (whole trial for the trial plan). */
  answers: number;
  /** Active logical documents. */
  documents: number;
  /** Storage in MB, including retained historical versions. */
  storageMb: number;
  /** Concurrent generations. */
  concurrency: number;
}

export interface PlanDef {
  id: PlanId;
  kind: "trial" | "paid" | "quoted";
  nameEn: string;
  nameZh: string;
  /** Monthly price in HKD. 0 for trial / quoted. */
  priceHkd: number;
  /** Business is individually quoted and has no self-service checkout. */
  purchasable: boolean;
  limits: PlanLimits;
}

export const PLANS: Record<PlanId, PlanDef> = {
  trial: {
    id: "trial",
    kind: "trial",
    nameEn: "Trial",
    nameZh: "試用",
    priceHkd: 0,
    purchasable: false,
    limits: { seats: 1, answers: 50, documents: 10, storageMb: 100, concurrency: 2 },
  },
  starter: {
    id: "starter",
    kind: "paid",
    nameEn: "Starter",
    nameZh: "入門版",
    priceHkd: 499,
    purchasable: true,
    limits: { seats: 1, answers: 500, documents: 100, storageMb: 1024, concurrency: 2 },
  },
  team: {
    id: "team",
    kind: "paid",
    nameEn: "Team",
    nameZh: "團隊版",
    priceHkd: 1499,
    purchasable: true,
    limits: { seats: 5, answers: 2500, documents: 500, storageMb: 5120, concurrency: 5 },
  },
  business: {
    id: "business",
    kind: "quoted",
    nameEn: "Business",
    nameZh: "商務版",
    priceHkd: 0,
    purchasable: false,
    limits: { seats: 0, answers: 0, documents: 0, storageMb: 0, concurrency: 0 },
  },
};

export const PAID_PLANS: PlanDef[] = [PLANS.starter, PLANS.team];
export const ALL_PLANS: PlanDef[] = [PLANS.trial, PLANS.starter, PLANS.team, PLANS.business];

export const TRIAL_DAYS = 14;
export const GRACE_DAYS = 3;
/** Read-and-export window after trial expiry, ordinary cancellation or grace (PRD §12.2). */
export const READ_ONLY_DAYS = 30;
/** Historical document versions expire after 90 days while referenced (PRD §10.1). */
export const VERSION_RETENTION_DAYS = 90;
/** Conversations retained 90 days by default (PRD §17). */
export const CONVERSATION_RETENTION_DAYS = 90;

export function planLimits(planId: PlanId): PlanLimits {
  return PLANS[planId].limits;
}

export function formatHkd(amount: number): string {
  return `HKD ${amount.toLocaleString("en-HK")}`;
}

/**
 * Proration for upgrades (PRD §12.2): prorate the increase in the cycle
 * allowance by the remaining fraction of the billing period, round down to
 * whole answers, preserve consumed units.
 */
export function proratedAllowanceIncrease(
  currentPlan: PlanId,
  newPlan: PlanId,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date()
): number {
  const oldLimit = PLANS[currentPlan].limits.answers;
  const newLimit = PLANS[newPlan].limits.answers;
  if (newLimit <= oldLimit) return 0;
  const total = periodEnd.getTime() - periodStart.getTime();
  const remaining = Math.max(0, periodEnd.getTime() - now.getTime());
  const fraction = total > 0 ? remaining / total : 0;
  return Math.floor((newLimit - oldLimit) * fraction);
}

/** Prorated upgrade charge shown to the customer before they agree. */
export function proratedChargeHkd(
  currentPlan: PlanId,
  newPlan: PlanId,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date()
): number {
  const oldPrice = PLANS[currentPlan].priceHkd;
  const newPrice = PLANS[newPlan].priceHkd;
  if (newPrice <= oldPrice) return 0;
  const total = periodEnd.getTime() - periodStart.getTime();
  const remaining = Math.max(0, periodEnd.getTime() - now.getTime());
  const fraction = total > 0 ? remaining / total : 0;
  return Math.round((newPrice - oldPrice) * fraction);
}

/** Upload limits (PRD §10.1). The most restrictive applicable limit wins. */
export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPages: 200,
  maxChars: 500_000,
  acceptedExtensions: ["pdf", "docx", "txt", "md"] as const,
  acceptedMimes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
};

export const DEMO_LIMITS = {
  questionsPerSession: 5,
  /** Additional server-side abuse limit per IP address. */
  questionsPerHourPerIp: 30,
};
