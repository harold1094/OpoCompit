import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {sharedStreak} from "./socialActivity.js";

const now = new Date("2026-09-30T12:00:00Z");

describe("shared friend streaks", () => {
  it("calculates the overlap when both friends are active today", () => {
    assert.deepEqual(sharedStreak(
      {currentStreak: 8, lastValidActivityDate: now},
      {currentStreak: 3, lastValidActivityDate: now},
      now,
    ), {days: 3, viewerActiveToday: true, friendActiveToday: true});
  });

  it("keeps yesterday's shared streak available during the current day", () => {
    assert.deepEqual(sharedStreak(
      {currentStreak: 5, lastValidActivityDate: now},
      {currentStreak: 4, lastValidActivityDate: new Date("2026-09-29T18:00:00Z")},
      now,
    ), {days: 4, viewerActiveToday: true, friendActiveToday: false});
  });

  it("expires a shared streak after a full missed day", () => {
    assert.equal(sharedStreak(
      {currentStreak: 5, lastValidActivityDate: new Date("2026-09-28T18:00:00Z")},
      {currentStreak: 4, lastValidActivityDate: new Date("2026-09-28T20:00:00Z")},
      now,
    ).days, 0);
  });

  it("returns zero when either friend has no activity", () => {
    assert.equal(sharedStreak(
      {currentStreak: 0, lastValidActivityDate: null},
      {currentStreak: 4, lastValidActivityDate: now},
      now,
    ).days, 0);
  });
});
