import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {mostSpecificTerritoryKey, rankEntries} from "./ranking.js";

describe("server-authoritative ranking rules", () => {
  it("orders scores and gives tied players the same position", () => {
    const ranked = rankEntries([
      {uid: "third", score: 50},
      {uid: "second", score: 100},
      {uid: "first", score: 100},
      {uid: "fourth", score: 10},
    ]);

    assert.deepEqual(ranked, [
      {uid: "first", score: 100, position: 1},
      {uid: "second", score: 100, position: 1},
      {uid: "third", score: 50, position: 3},
      {uid: "fourth", score: 10, position: 4},
    ]);
  });

  it("uses the most specific configured territory", () => {
    assert.equal(mostSpecificTerritoryKey(["ES", "ES-Murcia", "ES-Murcia-Cartagena"]),
      "ES-Murcia-Cartagena");
    assert.equal(mostSpecificTerritoryKey([]), "ES");
  });
});
