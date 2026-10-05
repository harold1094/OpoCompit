import assert from "node:assert/strict";
import test from "node:test";

import {isQuestionCurrentlyValid, previousIsoDay} from "./questionValidity.js";

test("questions without validity bounds remain current", () => {
  assert.equal(isQuestionCurrentlyValid({}, "2026-10-05"), true);
});

test("validity bounds are inclusive", () => {
  assert.equal(isQuestionCurrentlyValid({validFrom: "2026-10-05"}, "2026-10-05"), true);
  assert.equal(isQuestionCurrentlyValid({validUntil: "2026-10-05"}, "2026-10-05"), true);
});

test("future and outdated questions stay out of current training", () => {
  assert.equal(isQuestionCurrentlyValid({validFrom: "2026-10-06"}, "2026-10-05"), false);
  assert.equal(isQuestionCurrentlyValid({validUntil: "2026-10-04"}, "2026-10-05"), false);
});

test("previousIsoDay crosses month and year boundaries", () => {
  assert.equal(previousIsoDay("2026-10-01"), "2026-09-30");
  assert.equal(previousIsoDay("2026-01-01"), "2025-12-31");
});
