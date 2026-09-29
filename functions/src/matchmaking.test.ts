import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  matchmakingRange,
  normalizedRating,
  ratingsAreCompatible,
  updatedRatings,
} from "./matchmaking.js";

describe("compatible matchmaking rules", () => {
  it("widens the rating range while a player waits", () => {
    assert.equal(matchmakingRange(0), 100);
    assert.equal(matchmakingRange(30_000), 200);
    assert.equal(matchmakingRange(90_000), 400);
    assert.equal(ratingsAreCompatible(1000, 1175, 5_000, 5_000), false);
    assert.equal(ratingsAreCompatible(1000, 1175, 31_000, 5_000), true);
  });

  it("normalizes missing and extreme ratings", () => {
    assert.equal(normalizedRating(undefined), 1000);
    assert.equal(normalizedRating(100), 500);
    assert.equal(normalizedRating(3000), 2500);
  });

  it("updates both Elo ratings symmetrically", () => {
    assert.deepEqual(updatedRatings(1000, 1000, "win"), {first: 1012, second: 988});
    assert.deepEqual(updatedRatings(1000, 1000, "draw"), {first: 1000, second: 1000});
    assert.deepEqual(updatedRatings(1000, 1000, "loss"), {first: 988, second: 1012});
  });
});
