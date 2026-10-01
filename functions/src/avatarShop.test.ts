import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  avatarItemById,
  avatarShopCatalog,
  balanceAfterAvatarPurchase,
  defaultAvatarLoadout,
  normalizeAvatarLoadout,
  starterAvatarItemIds,
} from "./avatarShop.js";

describe("avatar shop rules", () => {
  it("keeps unique items and covers every visual category", () => {
    assert.equal(new Set(avatarShopCatalog.map((item) => item.id)).size, avatarShopCatalog.length);
    assert.deepEqual(
      new Set(avatarShopCatalog.map((item) => item.category)),
      new Set(["avatars", "clothing", "accessories", "frames", "backgrounds", "badges", "effects"]),
    );
  });

  it("ships a valid owned starter item for every avatar slot", () => {
    for (const [slot, itemId] of Object.entries(defaultAvatarLoadout)) {
      const item = avatarItemById(itemId);
      assert.ok(item);
      assert.equal(item.slot, slot);
      assert.equal(starterAvatarItemIds.includes(itemId), true);
      assert.equal(item.price, 0);
    }
  });

  it("rejects unowned or mismatched equipped items", () => {
    const normalized = normalizeAvatarLoadout(
      {background: "background_sky", frame: "background_sunset", effect: "missing"},
      [...starterAvatarItemIds, "background_sky"],
    );
    assert.equal(normalized.background, "background_sky");
    assert.equal(normalized.frame, defaultAvatarLoadout.frame);
    assert.equal(normalized.effect, defaultAvatarLoadout.effect);
  });

  it("deducts only the configured currency and blocks insufficient balances", () => {
    const coinItem = avatarItemById("background_sky");
    const gemItem = avatarItemById("effect_spark");
    assert.ok(coinItem);
    assert.ok(gemItem);
    assert.deepEqual(balanceAfterAvatarPurchase({coins: 40, gems: 2}, coinItem), {coins: 15, gems: 2});
    assert.deepEqual(balanceAfterAvatarPurchase({coins: 40, gems: 2}, gemItem), {coins: 40, gems: 1});
    assert.equal(balanceAfterAvatarPurchase({coins: 24, gems: 2}, coinItem), null);
  });
});
