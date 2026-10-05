import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {officialExamScore} from "./officialExam.js";

const rules = {
  questionCount: 100,
  durationSeconds: 7_200,
  correctPoints: 1,
  incorrectPenalty: 0.33,
  blankPoints: 0,
};

describe("official exam scoring", () => {
  it("applies configurable penalties and exposes the maximum score", () => {
    assert.deepEqual(officialExamScore(70, 20, 10, rules), {
      points: 63.4,
      maximumPoints: 100,
    });
  });

  it("supports non-zero blank points", () => {
    assert.deepEqual(officialExamScore(5, 2, 3, {
      ...rules,
      questionCount: 10,
      correctPoints: 2,
      incorrectPenalty: 0.5,
      blankPoints: 0.25,
    }), {points: 9.75, maximumPoints: 20});
  });
});
