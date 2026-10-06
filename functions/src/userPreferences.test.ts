import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  defaultUserPreferences,
  notificationAllowed,
  parseUserPreferences,
  parseUserPreferencesPatch,
} from "./userPreferences.js";

describe("user preferences", () => {
  it("uses privacy-safe defaults and preserves valid stored values", () => {
    assert.equal(defaultUserPreferences.analyticsEnabled, false);
    assert.deepEqual(parseUserPreferences({hapticsEnabled: false}), {
      ...defaultUserPreferences,
      hapticsEnabled: false,
    });
  });

  it("accepts only known boolean preference updates", () => {
    assert.deepEqual(parseUserPreferencesPatch({duelNotificationsEnabled: false}), {
      duelNotificationsEnabled: false,
    });
    assert.equal(parseUserPreferencesPatch({duelNotificationsEnabled: "no"}), null);
    assert.equal(parseUserPreferencesPatch({unknownPreference: true}), null);
    assert.equal(parseUserPreferencesPatch({}), null);
  });

  it("maps notification categories to their controls", () => {
    const preferences = {
      ...defaultUserPreferences,
      socialNotificationsEnabled: false,
      duelNotificationsEnabled: false,
    };
    assert.equal(notificationAllowed("friend_request", preferences), false);
    assert.equal(notificationAllowed("duel_result", preferences), false);
    assert.equal(notificationAllowed("achievement", preferences), true);
  });
});
