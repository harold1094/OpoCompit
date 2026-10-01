export const adminOperationKinds = [
  "missions",
  "dailyRewards",
  "shopItems",
  "subscriptionPlans",
  "appConfig",
] as const;

export type AdminOperationKind = typeof adminOperationKinds[number];

export type AdminMission = {
  id: string;
  title: string;
  description: string;
  type: "completeQuickMatches" | "answerQuestions" | "correctAnswers";
  target: number;
  rewardXp: number;
  rewardCoins: number;
  active: boolean;
  priority: number;
};

export type AdminDailyReward = {
  id: string;
  day: number;
  coins: number;
  gems: number;
  active: boolean;
};

export type AdminShopItem = {
  id: string;
  name: string;
  category: "avatars" | "clothing" | "accessories" | "frames" |
    "backgrounds" | "badges" | "effects";
  slot: "base" | "face" | "hair" | "outfit" | "accessory" |
    "background" | "frame" | "badge" | "effect";
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
  currency: "coins" | "gems";
  active: boolean;
  premiumOnly: boolean;
  priority: number;
};

export type AdminSubscriptionPlan = {
  id: string;
  name: string;
  priceLabel: string;
  billingPeriod: "monthly" | "yearly";
  features: Array<"ad_free" | "monthly_gems" | "exclusive_cosmetics" | "advanced_stats">;
  gemReward: number;
  adFree: boolean;
  exclusiveCosmetics: boolean;
  active: boolean;
  priority: number;
  storeProductId: string | null;
  purchasable: boolean;
};

export type AdminAppConfig = {
  id: "monetization";
  adsEnabled: boolean;
  rewardedAdsEnabled: boolean;
  adProviderReady: boolean;
  resultInterval: number;
};

export type AdminOperationItem = AdminMission | AdminDailyReward | AdminShopItem |
  AdminSubscriptionPlan | AdminAppConfig;

export class AdminOperationValidationError extends Error {}

const missionTypes = ["completeQuickMatches", "answerQuestions", "correctAnswers"] as const;
const shopCategories = [
  "avatars", "clothing", "accessories", "frames", "backgrounds", "badges", "effects",
] as const;
const shopSlots = [
  "base", "face", "hair", "outfit", "accessory", "background", "frame", "badge", "effect",
] as const;
const rarities = ["common", "rare", "epic", "legendary"] as const;
const premiumFeatures = [
  "ad_free", "monthly_gems", "exclusive_cosmetics", "advanced_stats",
] as const;

export function isAdminOperationKind(value: unknown): value is AdminOperationKind {
  return typeof value === "string" && (adminOperationKinds as readonly string[]).includes(value);
}

export function parseAdminOperationItem(
  kind: AdminOperationKind,
  idValue: unknown,
  value: unknown,
): AdminOperationItem {
  const id = identifier(idValue, "id", 160);
  const data = objectValue(value, "item");
  if (kind === "missions") return parseMission(id, data);
  if (kind === "dailyRewards") return parseDailyReward(id, data);
  if (kind === "shopItems") return parseShopItem(id, data);
  if (kind === "subscriptionPlans") return parseSubscriptionPlanItem(id, data);
  return parseAppConfig(id, data);
}

export function parseMission(id: string, data: Record<string, unknown>): AdminMission {
  return {
    id,
    title: text(data.title, "title", 100),
    description: text(data.description, "description", 240),
    type: enumValue(data.type, "type", missionTypes),
    target: integer(data.target, "target", 1, 100_000),
    rewardXp: integer(data.rewardXp, "rewardXp", 0, 100_000),
    rewardCoins: integer(data.rewardCoins, "rewardCoins", 0, 100_000),
    active: booleanValue(data.active, "active"),
    priority: integer(data.priority, "priority", 0, 10_000),
  };
}

export function parseDailyReward(id: string, data: Record<string, unknown>): AdminDailyReward {
  return {
    id,
    day: integer(data.day, "day", 1, 31),
    coins: integer(data.coins, "coins", 0, 100_000),
    gems: integer(data.gems, "gems", 0, 10_000),
    active: booleanValue(data.active, "active"),
  };
}

export function parseShopItem(id: string, data: Record<string, unknown>): AdminShopItem {
  return {
    id,
    name: text(data.name, "name", 100),
    category: enumValue(data.category, "category", shopCategories),
    slot: enumValue(data.slot, "slot", shopSlots),
    rarity: enumValue(data.rarity, "rarity", rarities),
    price: integer(data.price, "price", 0, 1_000_000),
    currency: enumValue(data.currency, "currency", ["coins", "gems"] as const),
    active: booleanValue(data.active, "active"),
    premiumOnly: booleanValue(data.premiumOnly, "premiumOnly"),
    priority: integer(data.priority, "priority", 0, 10_000),
  };
}

export function parseSubscriptionPlanItem(
  id: string,
  data: Record<string, unknown>,
): AdminSubscriptionPlan {
  const storeProductId = optionalText(data.storeProductId, "storeProductId", 160);
  const purchasable = booleanValue(data.purchasable, "purchasable");
  if (purchasable && !storeProductId) {
    fail("storeProductId is required when a plan is purchasable.");
  }
  return {
    id,
    name: text(data.name, "name", 80),
    priceLabel: text(data.priceLabel, "priceLabel", 40),
    billingPeriod: enumValue(data.billingPeriod, "billingPeriod", ["monthly", "yearly"] as const),
    features: enumList(data.features, "features", premiumFeatures),
    gemReward: integer(data.gemReward, "gemReward", 0, 10_000),
    adFree: booleanValue(data.adFree, "adFree"),
    exclusiveCosmetics: booleanValue(data.exclusiveCosmetics, "exclusiveCosmetics"),
    active: booleanValue(data.active, "active"),
    priority: integer(data.priority, "priority", 0, 10_000),
    storeProductId,
    purchasable,
  };
}

export function parseAppConfig(id: string, data: Record<string, unknown>): AdminAppConfig {
  if (id !== "monetization") fail("Only the monetization configuration is supported.");
  return {
    id,
    adsEnabled: booleanValue(data.adsEnabled, "adsEnabled"),
    rewardedAdsEnabled: booleanValue(data.rewardedAdsEnabled, "rewardedAdsEnabled"),
    adProviderReady: booleanValue(data.adProviderReady, "adProviderReady"),
    resultInterval: integer(data.resultInterval, "resultInterval", 1, 20),
  };
}

function objectValue(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    fail(`${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return text(value, field, maxLength);
}

function identifier(value: unknown, field: string, maxLength: number): string {
  const parsed = text(value, field, maxLength);
  if (!/^[A-Za-z0-9_-]+$/.test(parsed)) {
    fail(`${field} may contain only letters, numbers, underscores, and hyphens.`);
  }
  return parsed;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(`${field} must be boolean.`);
  return value;
}

function integer(value: unknown, field: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    fail(`${field} must be an integer between ${minimum} and ${maximum}.`);
  }
  return Number(value);
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    fail(`${field} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T[number];
}

function enumList<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number][] {
  if (!Array.isArray(value) || value.length === 0 || value.length > allowed.length) {
    fail(`${field} must contain between 1 and ${allowed.length} entries.`);
  }
  const result = value.map((item, index) => enumValue(item, `${field}[${index}]`, allowed));
  if (new Set(result).size !== result.length) fail(`${field} cannot contain duplicates.`);
  return result;
}

function fail(message: string): never {
  throw new AdminOperationValidationError(message);
}
