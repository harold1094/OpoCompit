export type AvatarItemCategory =
  | "avatars"
  | "clothing"
  | "accessories"
  | "frames"
  | "backgrounds"
  | "badges"
  | "effects";

export type AvatarItemSlot =
  | "base"
  | "face"
  | "hair"
  | "outfit"
  | "accessory"
  | "background"
  | "frame"
  | "badge"
  | "effect";

export type AvatarItemRarity = "common" | "rare" | "epic" | "legendary";
export type AvatarCurrency = "coins" | "gems";
export type AvatarLoadout = Partial<Record<AvatarItemSlot, string>>;

export type AvatarShopItem = {
  id: string;
  category: AvatarItemCategory;
  slot: AvatarItemSlot;
  rarity: AvatarItemRarity;
  price: number;
  currency: AvatarCurrency;
};

export type AvatarBalances = {coins: number; gems: number};

export const avatarShopCatalog: readonly AvatarShopItem[] = [
  {id: "base_rookie", category: "avatars", slot: "base", rarity: "common", price: 0, currency: "coins"},
  {id: "base_veteran", category: "avatars", slot: "base", rarity: "epic", price: 300, currency: "coins"},
  {id: "face_smile", category: "avatars", slot: "face", rarity: "common", price: 0, currency: "coins"},
  {id: "face_focus", category: "avatars", slot: "face", rarity: "rare", price: 80, currency: "coins"},
  {id: "hair_short", category: "avatars", slot: "hair", rarity: "common", price: 0, currency: "coins"},
  {id: "hair_wave", category: "avatars", slot: "hair", rarity: "rare", price: 110, currency: "coins"},
  {id: "outfit_training", category: "clothing", slot: "outfit", rarity: "common", price: 0, currency: "coins"},
  {id: "outfit_rescue", category: "clothing", slot: "outfit", rarity: "rare", price: 120, currency: "coins"},
  {id: "outfit_night", category: "clothing", slot: "outfit", rarity: "epic", price: 220, currency: "coins"},
  {id: "accessory_none", category: "accessories", slot: "accessory", rarity: "common", price: 0, currency: "coins"},
  {id: "accessory_glasses", category: "accessories", slot: "accessory", rarity: "rare", price: 90, currency: "coins"},
  {id: "accessory_helmet", category: "accessories", slot: "accessory", rarity: "epic", price: 180, currency: "coins"},
  {id: "frame_clean", category: "frames", slot: "frame", rarity: "common", price: 0, currency: "coins"},
  {id: "frame_mint", category: "frames", slot: "frame", rarity: "rare", price: 100, currency: "coins"},
  {id: "frame_gold", category: "frames", slot: "frame", rarity: "legendary", price: 320, currency: "coins"},
  {id: "background_clear", category: "backgrounds", slot: "background", rarity: "common", price: 0, currency: "coins"},
  {id: "background_sky", category: "backgrounds", slot: "background", rarity: "common", price: 25, currency: "coins"},
  {id: "background_sunset", category: "backgrounds", slot: "background", rarity: "epic", price: 160, currency: "coins"},
  {id: "badge_none", category: "badges", slot: "badge", rarity: "common", price: 0, currency: "coins"},
  {id: "badge_focus", category: "badges", slot: "badge", rarity: "epic", price: 200, currency: "coins"},
  {id: "effect_none", category: "effects", slot: "effect", rarity: "common", price: 0, currency: "coins"},
  {id: "effect_spark", category: "effects", slot: "effect", rarity: "legendary", price: 1, currency: "gems"},
] as const;

export const defaultAvatarLoadout: Readonly<Required<AvatarLoadout>> = {
  base: "base_rookie",
  face: "face_smile",
  hair: "hair_short",
  outfit: "outfit_training",
  accessory: "accessory_none",
  background: "background_clear",
  frame: "frame_clean",
  badge: "badge_none",
  effect: "effect_none",
};

export const starterAvatarItemIds = Object.freeze(Object.values(defaultAvatarLoadout));

export function avatarItemById(itemId: string): AvatarShopItem | null {
  return avatarShopCatalog.find((item) => item.id === itemId) ?? null;
}

export function normalizeAvatarLoadout(value: unknown, ownedIds: Iterable<string>): Required<AvatarLoadout> {
  const owned = new Set(ownedIds);
  const source = isRecord(value) ? value : {};
  const normalized = {...defaultAvatarLoadout};

  for (const slot of Object.keys(defaultAvatarLoadout) as AvatarItemSlot[]) {
    const itemId = typeof source[slot] === "string" ? source[slot] : "";
    const item = avatarItemById(itemId);
    if (item?.slot === slot && owned.has(item.id)) normalized[slot] = item.id;
  }
  return normalized;
}

export function balanceAfterAvatarPurchase(
  balances: AvatarBalances,
  item: AvatarShopItem,
): AvatarBalances | null {
  if (item.price < 0 || !Number.isInteger(item.price)) return null;
  if (item.currency === "coins") {
    if (balances.coins < item.price) return null;
    return {...balances, coins: balances.coins - item.price};
  }
  if (balances.gems < item.price) return null;
  return {...balances, gems: balances.gems - item.price};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
