import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {cwd} from "node:process";
import {describe, it} from "node:test";

import {parseQuestionBatch} from "./adminImport.js";

const source = JSON.parse(
  readFileSync(
    resolve(cwd(), "fixtures/cartagena-firefighters-exam-2026.json"),
    "utf8",
  ),
) as unknown;

describe("Cartagena official firefighter exam fixture", () => {
  it("contains the complete exam and reserve questions in importable form", () => {
    const batch = parseQuestionBatch(source);

    assert.equal(batch.questions.length, 75);
    assert.equal(batch.questions.filter((question) => question.id.includes("-q")).length, 70);
    assert.equal(batch.questions.filter((question) => question.id.includes("-r")).length, 5);
    assert.equal(new Set(batch.questions.map((question) => question.id)).size, 75);
    assert.ok(batch.questions.every((question) => question.answers.length === 3));
    assert.ok(batch.questions.every((question) =>
      question.officialExamId === "cartagena-firefighters-test-2026-04-25",
    ));
  });

  it("separates general, technical, Murcia and Cartagena content", () => {
    const questions = parseQuestionBatch(source).questions;
    const count = (scope: string) =>
      questions.filter((question) => question.scopeType === scope).length;

    assert.equal(count("national"), 21);
    assert.equal(count("technical"), 41);
    assert.equal(count("autonomic"), 7);
    assert.equal(count("municipal"), 6);

    const murciaQuestion = questions.find((question) => question.id.endsWith("q68"));
    assert.deepEqual(murciaQuestion?.territoryKeys, ["ES", "ES-Murcia"]);

    const cartagenaQuestion = questions.find((question) => question.id.endsWith("q62"));
    assert.deepEqual(cartagenaQuestion?.territoryKeys, [
      "ES",
      "ES-Murcia",
      "ES-Murcia-Murcia",
      "ES-Murcia-Cartagena",
    ]);
  });
});
