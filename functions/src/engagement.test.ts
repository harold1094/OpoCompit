import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  dailyRewardFor,
  madridDay,
  missionDocumentId,
  missionProgressIncrement,
} from "./engagement.js";

describe("daily engagement rules", () => {
  it("uses the Madrid calendar day", () => {
    assert.equal(madridDay(new Date("2026-09-28T22:30:00Z")), "2026-09-29");
  });

  it("does not offer the same daily reward twice", () => {
    assert.deepEqual(dailyRewardFor(3, "2026-09-28", "2026-09-28"), {
      date: "2026-09-28",
      day: 3,
      coins: 35,
      gems: 0,
      claimed: true,
    });
  });

  it("advances and wraps the seven-day reward calendar", () => {
    assert.equal(dailyRewardFor(3, "2026-09-27", "2026-09-28").day, 4);
    assert.equal(dailyRewardFor(6, "2026-09-27", "2026-09-28").gems, 1);
    assert.equal(dailyRewardFor(7, "2026-09-27", "2026-09-28").day, 1);
  });

  it("calculates progress from trusted quiz totals", () => {
    assert.equal(missionProgressIncrement("completeQuickMatches", 10, 7), 1);
    assert.equal(missionProgressIncrement("answerQuestions", 10, 7), 10);
    assert.equal(missionProgressIncrement("correctAnswers", 10, 7), 7);
    assert.equal(missionDocumentId("2026-09-28", "daily_15_correct"), "2026-09-28_daily_15_correct");
  });
});
