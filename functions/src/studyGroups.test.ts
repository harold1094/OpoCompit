import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  competitionMetricDelta,
  groupCodeFromBytes,
  normalizeCompetitionMetric,
  normalizeGroupCode,
  normalizeGroupName,
} from "./studyGroups.js";

describe("private study group rules", () => {
  it("normalizes readable group names without losing accents", () => {
    assert.equal(normalizeGroupName("  Bomberos   Cartagena 2027 "), "Bomberos Cartagena 2027");
    assert.equal(normalizeGroupName("Ávila preparación"), "Ávila preparación");
    assert.equal(normalizeGroupName("ab"), null);
  });

  it("accepts portable join codes without ambiguous characters", () => {
    assert.equal(normalizeGroupCode(" abcd-2345 "), "ABCD2345");
    assert.equal(normalizeGroupCode("ABCI2345"), null);
    assert.equal(normalizeGroupCode("SHORT"), null);
  });

  it("generates stable eight-character codes from random bytes", () => {
    assert.equal(
      groupCodeFromBytes(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])),
      "ABCDEFGH",
    );
    assert.equal(groupCodeFromBytes(Uint8Array.from([31, 32, 33, 34, 35, 36, 37, 38])).length, 8);
  });

  it("accepts only supported competition metrics", () => {
    assert.equal(normalizeCompetitionMetric("correct"), "correct");
    assert.equal(normalizeCompetitionMetric("coins"), null);
  });

  it("scores only the trusted positive delta for the selected metric", () => {
    const before = {xp: 80, questions: 10, correct: 7, duels: 0};
    const after = {xp: 100, questions: 20, correct: 15, duels: 1};
    assert.equal(competitionMetricDelta("xp", before, after), 20);
    assert.equal(competitionMetricDelta("questions", before, after), 10);
    assert.equal(competitionMetricDelta("correct", after, before), 0);
    assert.equal(competitionMetricDelta("duels", before, after), 1);
  });
});
