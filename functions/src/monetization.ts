export type BillingPeriod = "monthly" | "yearly";
export type PremiumFeature =
  | "ad_free"
  | "monthly_gems"
  | "exclusive_cosmetics"
  | "advanced_stats";

export type SubscriptionPlan = {
  id: string;
  name: string;
  priceLabel: string;
  billingPeriod: BillingPeriod;
  features: PremiumFeature[];
  gemReward: number;
  adFree: boolean;
  exclusiveCosmetics: boolean;
  priority: number;
  storeProductId: string | null;
  purchasable: boolean;
};

export type SubscriptionEntitlement = {
  tier: "free" | "premium";
  status: "free" | "trialing" | "active" | "expired";
  planId: string | null;
  renewsAt: string | null;
};

export type AdSurface = "quiz" | "duel" | "results" | "home" | "profile" | "social";

const featureIds: PremiumFeature[] = [
  "ad_free",
  "monthly_gems",
  "exclusive_cosmetics",
  "advanced_stats",
];

export function parseSubscriptionPlan(
  id: string,
  data: Record<string, unknown>,
): SubscriptionPlan | null {
  if (data.active !== true || typeof data.name !== "string" || data.name.trim().length === 0) {
    return null;
  }
  const billingPeriod = data.billingPeriod === "yearly" ? "yearly" : "monthly";
  const features = Array.isArray(data.features) ? data.features.filter(
    (feature): feature is PremiumFeature => featureIds.includes(feature as PremiumFeature),
  ) : [];
  const storeProductId = typeof data.storeProductId === "string" && data.storeProductId.length > 0 ?
    data.storeProductId : null;
  return {
    id,
    name: data.name.trim().slice(0, 80),
    priceLabel: typeof data.priceLabel === "string" ? data.priceLabel.slice(0, 40) : "",
    billingPeriod,
    features: [...new Set(features)],
    gemReward: boundedInteger(data.gemReward, 0, 10_000),
    adFree: data.adFree === true,
    exclusiveCosmetics: data.exclusiveCosmetics === true,
    priority: boundedInteger(data.priority, 0, 10_000),
    storeProductId,
    purchasable: data.purchasable === true && storeProductId !== null,
  };
}

export function subscriptionEntitlement(
  data: Record<string, unknown> | null,
  nowMs: number,
): SubscriptionEntitlement {
  if (!data) return freeEntitlement();
  const status = data.status === "trialing" ? "trialing" : data.status === "active" ? "active" : "expired";
  const expiresAtMs = typeof data.expiresAtMs === "number" ? data.expiresAtMs : null;
  if (!['active', 'trialing'].includes(status) || (expiresAtMs !== null && expiresAtMs <= nowMs)) {
    return {
      tier: "free",
      status: "expired",
      planId: typeof data.planId === "string" ? data.planId : null,
      renewsAt: null,
    };
  }
  return {
    tier: "premium",
    status,
    planId: typeof data.planId === "string" ? data.planId : null,
    renewsAt: expiresAtMs === null ? null : new Date(expiresAtMs).toISOString(),
  };
}

export function canShowInterstitial(input: {
  surface: AdSurface;
  adsEnabled: boolean;
  isPremium: boolean;
  completedSessions: number;
  resultInterval: number;
}): boolean {
  if (!input.adsEnabled || input.isPremium || input.surface !== "results") return false;
  const interval = Math.max(1, Math.trunc(input.resultInterval));
  return input.completedSessions > 0 && input.completedSessions % interval === 0;
}

function freeEntitlement(): SubscriptionEntitlement {
  return {tier: "free", status: "free", planId: null, renewsAt: null};
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}
