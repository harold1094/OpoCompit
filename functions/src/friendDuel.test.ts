import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  commonTerritoryKeys,
  friendDuelViewStatus,
  oppositeOutcome,
} from "./friendDuel.js";

describe("asynchronous friend duel rules", () => {
  it("uses only territory scopes shared by both players", () => {
    assert.deepEqual(
      commonTerritoryKeys(
        ["ES", "ES-Murcia", "ES-Murcia-Cartagena"],
        ["ES", "ES-Murcia"],
      ),
      ["ES", "ES-Murcia"],
    );
    assert.deepEqual(commonTerritoryKeys(["ES", "ES-Murcia"], ["ES", "ES-Madrid"]), ["ES"]);
  });

  it("mirrors the result for the other player", () => {
    assert.equal(oppositeOutcome("win"), "loss");
    assert.equal(oppositeOutcome("loss"), "win");
    assert.equal(oppositeOutcome("draw"), "draw");
  });

  it("shows waiting only to the player who already submitted", () => {
    assert.equal(friendDuelViewStatus("pending", false, false), "pending");
    assert.equal(friendDuelViewStatus("active", false, true), "active");
    assert.equal(friendDuelViewStatus("active", true, false), "waiting");
    assert.equal(friendDuelViewStatus("completed", true, true), "completed");
  });
});
