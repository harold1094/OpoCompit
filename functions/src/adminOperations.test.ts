import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  AdminOperationValidationError,
  parseAdminOperationItem,
} from "./adminOperations.js";

describe("admin operations validation", () => {
  it("validates configurable missions and daily rewards", () => {
    const mission = parseAdminOperationItem("missions", "daily_questions", {
      title: "Calienta motores",
      description: "Responde 30 preguntas.",
      type: "answerQuestions",
      target: 30,
      rewardXp: 30,
      rewardCoins: 15,
      active: true,
      priority: 20,
    });
    assert.equal("target" in mission ? mission.target : 0, 30);
    assert.throws(() => parseAdminOperationItem("dailyRewards", "day_0", {
      day: 0, coins: 20, gems: 0, active: true,
    }), AdminOperationValidationError);
  });

  it("requires safe shop values and billing identifiers", () => {
    const item = parseAdminOperationItem("shopItems", "frame_gold", {
      name: "Marco campeón",
      category: "frames",
      slot: "frame",
      rarity: "legendary",
      price: 320,
      currency: "coins",
      active: true,
      premiumOnly: false,
      priority: 10,
    });
    assert.equal("price" in item ? item.price : 0, 320);
    assert.throws(() => parseAdminOperationItem("subscriptionPlans", "premium", {
      name: "Premium",
      priceLabel: "Próximamente",
      billingPeriod: "monthly",
      features: ["ad_free"],
      gemReward: 10,
      adFree: true,
      exclusiveCosmetics: true,
      active: true,
      priority: 10,
      storeProductId: null,
      purchasable: true,
    }), AdminOperationValidationError);
  });

  it("keeps ad delivery disabled until its provider is ready", () => {
    const config = parseAdminOperationItem("appConfig", "monetization", {
      adsEnabled: false,
      rewardedAdsEnabled: false,
      adProviderReady: false,
      resultInterval: 3,
    });
    assert.equal("resultInterval" in config ? config.resultInterval : 0, 3);
  });
});
