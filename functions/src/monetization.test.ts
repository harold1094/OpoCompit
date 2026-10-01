import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  canShowInterstitial,
  parseSubscriptionPlan,
  subscriptionEntitlement,
} from "./monetization.js";

describe("monetization rules", () => {
  it("parses only active plans and requires a store product before purchase", () => {
    assert.equal(parseSubscriptionPlan("hidden", {active: false, name: "Hidden"}), null);
    assert.deepEqual(parseSubscriptionPlan("premium", {
      active: true,
      name: " OpoCompit Premium ",
      priceLabel: "Próximamente",
      billingPeriod: "monthly",
      features: ["ad_free", "monthly_gems", "unknown", "ad_free"],
      gemReward: 10,
      adFree: true,
      exclusiveCosmetics: true,
      priority: 20,
      purchasable: true,
      storeProductId: null,
    }), {
      id: "premium",
      name: "OpoCompit Premium",
      priceLabel: "Próximamente",
      billingPeriod: "monthly",
      features: ["ad_free", "monthly_gems"],
      gemReward: 10,
      adFree: true,
      exclusiveCosmetics: true,
      priority: 20,
      storeProductId: null,
      purchasable: false,
    });
  });

  it("expires server-owned entitlements by date", () => {
    assert.equal(subscriptionEntitlement(null, 1_000).tier, "free");
    assert.equal(subscriptionEntitlement({status: "active", planId: "premium", expiresAtMs: 2_000}, 1_000).tier, "premium");
    assert.deepEqual(subscriptionEntitlement({status: "active", planId: "premium", expiresAtMs: 500}, 1_000), {
      tier: "free",
      status: "expired",
      planId: "premium",
      renewsAt: null,
    });
  });

  it("never allows interstitials during study or competitive play", () => {
    const base = {adsEnabled: true, isPremium: false, completedSessions: 3, resultInterval: 3};
    assert.equal(canShowInterstitial({...base, surface: "quiz"}), false);
    assert.equal(canShowInterstitial({...base, surface: "duel"}), false);
    assert.equal(canShowInterstitial({...base, surface: "results"}), true);
    assert.equal(canShowInterstitial({...base, surface: "results", isPremium: true}), false);
    assert.equal(canShowInterstitial({...base, surface: "results", completedSessions: 2}), false);
  });
});
