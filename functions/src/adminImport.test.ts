import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {AdminImportValidationError, parseQuestionBatch} from "./adminImport.js";

function validQuestion(overrides: Record<string, unknown> = {}) {
  return {
    oppositionId: "firefighters_es",
    statement: "¿Cuál es la presión de prueba?",
    answers: [
      {id: "a", text: "10 bar"},
      {id: "b", text: "15 bar"},
      {id: "c", text: "20 bar"},
      {id: "d", text: "25 bar"},
    ],
    correctAnswerId: "b",
    explanation: "La norma establece 15 bar.",
    categoryId: "hydraulics",
    difficulty: 2,
    scopeType: "municipal",
    country: "es",
    autonomousCommunity: "Murcia",
    province: "Murcia",
    municipality: "Cartagena",
    source: "Manual oficial",
    status: "pending_review",
    verified: false,
    ...overrides,
  };
}

describe("admin question import validation", () => {
  it("normalizes a valid review batch and generates stable ids", () => {
    const first = parseQuestionBatch({sourceDocument: "manual.pdf", questions: [validQuestion()]});
    const second = parseQuestionBatch({sourceDocument: "manual.pdf", questions: [validQuestion()]});

    assert.equal(first.batchId, second.batchId);
    assert.equal(first.contentFingerprint, second.contentFingerprint);
    assert.equal(first.questions[0].id, second.questions[0].id);
    assert.equal(first.questions[0].country, "ES");
    assert.equal(first.questions[0].sourceDocument, "manual.pdf");
    assert.equal(first.questions[0].verified, false);
    assert.deepEqual(first.questions[0].territoryKeys, [
      "ES",
      "ES-Murcia",
      "ES-Murcia-Murcia",
      "ES-Murcia-Cartagena",
    ]);
  });

  it("rejects published or verified questions", () => {
    assert.throws(
      () => parseQuestionBatch({questions: [validQuestion({status: "published"})]}),
      AdminImportValidationError,
    );
    assert.throws(
      () => parseQuestionBatch({questions: [validQuestion({verified: true})]}),
      AdminImportValidationError,
    );
  });

  it("rejects invalid correct answers and duplicate statements", () => {
    assert.throws(
      () => parseQuestionBatch({questions: [validQuestion({correctAnswerId: "missing"})]}),
      AdminImportValidationError,
    );
    assert.throws(
      () => parseQuestionBatch({
        questions: [validQuestion({id: "first"}), validQuestion({id: "second"})],
      }),
      AdminImportValidationError,
    );
  });

  it("requires the territorial fields implied by the scope", () => {
    assert.throws(
      () => parseQuestionBatch({questions: [validQuestion({municipality: null})]}),
      AdminImportValidationError,
    );
    assert.throws(
      () => parseQuestionBatch({questions: [validQuestion({
        scopeType: "official_exam",
        officialExamId: null,
      })]}),
      AdminImportValidationError,
    );
  });

  it("changes the batch fingerprint when imported content changes", () => {
    const first = parseQuestionBatch({batchId: "same-id", questions: [validQuestion()]});
    const second = parseQuestionBatch({
      batchId: "same-id",
      questions: [validQuestion({explanation: "A different explanation"})],
    });
    assert.notEqual(first.contentFingerprint, second.contentFingerprint);
  });
});
