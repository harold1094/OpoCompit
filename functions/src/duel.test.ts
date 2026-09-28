import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {duelOutcome, trainingOpponent} from "./duel.js";

describe("classic duel rules", () => {
  it("prioritizes correct answers", () => {
    assert.equal(duelOutcome(8, 120_000, 7, 60_000), "win");
    assert.equal(duelOutcome(6, 60_000, 7, 120_000), "loss");
  });

  it("uses elapsed time only as the tie breaker", () => {
    assert.equal(duelOutcome(7, 70_000, 7, 80_000), "win");
    assert.equal(duelOutcome(7, 90_000, 7, 80_000), "loss");
    assert.equal(duelOutcome(7, 80_000, 7, 80_000), "draw");
  });

  it("accepts only server-defined training opponents", () => {
    assert.equal(trainingOpponent("training_mario")?.name, "MarioCT");
    assert.equal(trainingOpponent("unknown"), undefined);
  });
});
