import {createHash} from "node:crypto";

const allowedStatuses = new Set(["draft", "pending_review"]);
const allowedScopeTypes = new Set([
  "national",
  "autonomic",
  "provincial",
  "municipal",
  "official_exam",
  "technical",
]);

export type ImportedQuestion = {
  id: string;
  oppositionId: string;
  statement: string;
  answers: Array<{id: string; text: string}>;
  correctAnswerId: string;
  explanation: string;
  categoryId: string;
  subcategoryId: string | null;
  difficulty: number;
  scopeType: string;
  territoryKeys: string[];
  country: string;
  autonomousCommunity: string | null;
  province: string | null;
  municipality: string | null;
  specificCallId: string | null;
  officialExamId: string | null;
  year: number | null;
  source: string;
  sourceDocument: string | null;
  sourcePage: number | null;
  verified: false;
  status: "draft" | "pending_review";
  validFrom: string | null;
  validUntil: string | null;
  contentFingerprint: string;
};

export type ParsedQuestionBatch = {
  batchId: string;
  contentFingerprint: string;
  sourceDocument: string | null;
  questions: ImportedQuestion[];
};

export class AdminImportValidationError extends Error {}

export function parseQuestionBatch(value: unknown): ParsedQuestionBatch {
  const data = requireObject(value, "batch");
  const sourceDocument = nullableString(data.sourceDocument, "sourceDocument", 240);
  if (!Array.isArray(data.questions) || data.questions.length === 0 || data.questions.length > 100) {
    fail("questions must contain between 1 and 100 entries.");
  }

  const questions = data.questions.map((question, index) =>
    parseQuestion(question, index, sourceDocument),
  );
  assertUnique(questions.map((question) => question.id), "question ids");
  assertUnique(questions.map((question) => question.contentFingerprint), "question statements");

  const suppliedBatchId = optionalIdentifier(data.batchId, "batchId", 120);
  const batchFingerprint = fingerprint(JSON.stringify({sourceDocument, questions}));

  return {
    batchId: suppliedBatchId ?? `import_${batchFingerprint.slice(0, 24)}`,
    contentFingerprint: batchFingerprint,
    sourceDocument,
    questions,
  };
}

function parseQuestion(
  value: unknown,
  index: number,
  batchSourceDocument: string | null,
): ImportedQuestion {
  const prefix = `questions[${index}]`;
  const data = requireObject(value, prefix);
  const oppositionId = requireIdentifier(data.oppositionId, `${prefix}.oppositionId`, 80);
  const statement = requireString(data.statement, `${prefix}.statement`, 1_000);
  const contentFingerprint = questionContentFingerprint(oppositionId, statement);
  const id = optionalIdentifier(data.id, `${prefix}.id`, 160) ??
    `q_import_${contentFingerprint.slice(0, 24)}`;
  const answers = parseAnswers(data.answers, prefix);
  const correctAnswerId = requireIdentifier(
    data.correctAnswerId,
    `${prefix}.correctAnswerId`,
    40,
  );
  if (!answers.some((answer) => answer.id === correctAnswerId)) {
    fail(`${prefix}.correctAnswerId must match an answer id.`);
  }

  const status = data.status === undefined ? "pending_review" :
    requireString(data.status, `${prefix}.status`, 40);
  if (!allowedStatuses.has(status)) {
    fail(`${prefix}.status must be draft or pending_review.`);
  }
  if (data.verified !== undefined && data.verified !== false) {
    fail(`${prefix}.verified must be false.`);
  }

  const difficulty = requireInteger(data.difficulty, `${prefix}.difficulty`, 1, 5);
  const scopeType = requireString(data.scopeType, `${prefix}.scopeType`, 40);
  if (!allowedScopeTypes.has(scopeType)) {
    fail(`${prefix}.scopeType is not supported.`);
  }

  const country = requireString(data.country, `${prefix}.country`, 8).toUpperCase();
  const autonomousCommunity = nullableString(
    data.autonomousCommunity,
    `${prefix}.autonomousCommunity`,
    100,
  );
  const province = nullableString(data.province, `${prefix}.province`, 100);
  const municipality = nullableString(data.municipality, `${prefix}.municipality`, 100);
  const officialExamId = nullableIdentifier(
    data.officialExamId,
    `${prefix}.officialExamId`,
    160,
  );
  validateScope(prefix, scopeType, autonomousCommunity, province, municipality, officialExamId);

  const questionSourceDocument = nullableString(
    data.sourceDocument,
    `${prefix}.sourceDocument`,
    240,
  ) ?? batchSourceDocument;
  const validFrom = nullableDate(data.validFrom, `${prefix}.validFrom`);
  const validUntil = nullableDate(data.validUntil, `${prefix}.validUntil`);
  if (validFrom && validUntil && validFrom > validUntil) {
    fail(`${prefix}.validUntil must not be before validFrom.`);
  }

  return {
    id,
    oppositionId,
    statement,
    answers,
    correctAnswerId,
    explanation: requireString(data.explanation, `${prefix}.explanation`, 2_000),
    categoryId: requireIdentifier(data.categoryId, `${prefix}.categoryId`, 100),
    subcategoryId: nullableIdentifier(data.subcategoryId, `${prefix}.subcategoryId`, 100),
    difficulty,
    scopeType,
    territoryKeys: buildTerritoryKeys(country, autonomousCommunity, province, municipality),
    country,
    autonomousCommunity,
    province,
    municipality,
    specificCallId: nullableIdentifier(data.specificCallId, `${prefix}.specificCallId`, 160),
    officialExamId,
    year: nullableInteger(data.year, `${prefix}.year`, 1900, 2100),
    source: requireString(data.source, `${prefix}.source`, 500),
    sourceDocument: questionSourceDocument,
    sourcePage: nullableInteger(data.sourcePage, `${prefix}.sourcePage`, 1, 100_000),
    verified: false,
    status: status as "draft" | "pending_review",
    validFrom,
    validUntil,
    contentFingerprint,
  };
}

function parseAnswers(value: unknown, prefix: string): Array<{id: string; text: string}> {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) {
    fail(`${prefix}.answers must contain between 2 and 6 entries.`);
  }
  const answers = value.map((answer, answerIndex) => {
    const answerData = requireObject(answer, `${prefix}.answers[${answerIndex}]`);
    return {
      id: requireIdentifier(answerData.id, `${prefix}.answers[${answerIndex}].id`, 40),
      text: requireString(answerData.text, `${prefix}.answers[${answerIndex}].text`, 500),
    };
  });
  assertUnique(answers.map((answer) => answer.id), `${prefix}.answer ids`);
  return answers;
}

function validateScope(
  prefix: string,
  scopeType: string,
  autonomousCommunity: string | null,
  province: string | null,
  municipality: string | null,
  officialExamId: string | null,
) {
  if (["autonomic", "provincial", "municipal"].includes(scopeType) && !autonomousCommunity) {
    fail(`${prefix}.autonomousCommunity is required for ${scopeType} scope.`);
  }
  if (scopeType === "provincial" && !province) {
    fail(`${prefix}.province is required for provincial scope.`);
  }
  if (scopeType === "municipal" && !municipality) {
    fail(`${prefix}.municipality is required for municipal scope.`);
  }
  if (scopeType === "official_exam" && !officialExamId) {
    fail(`${prefix}.officialExamId is required for official_exam scope.`);
  }
}

function buildTerritoryKeys(
  country: string,
  autonomousCommunity: string | null,
  province: string | null,
  municipality: string | null,
): string[] {
  const keys = [country];
  if (autonomousCommunity) keys.push(`${country}-${autonomousCommunity}`);
  if (autonomousCommunity && province) keys.push(`${country}-${autonomousCommunity}-${province}`);
  if (autonomousCommunity && municipality) {
    keys.push(`${country}-${autonomousCommunity}-${municipality}`);
  }
  return [...new Set(keys)];
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    fail(`${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function nullableString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requireString(value, field, maxLength);
}

function requireIdentifier(value: unknown, field: string, maxLength: number): string {
  const parsed = requireString(value, field, maxLength);
  if (!/^[A-Za-z0-9_-]+$/.test(parsed)) {
    fail(`${field} may contain only letters, numbers, underscores, and hyphens.`);
  }
  return parsed;
}

function optionalIdentifier(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireIdentifier(value, field, maxLength);
}

function nullableIdentifier(value: unknown, field: string, maxLength: number): string | null {
  return optionalIdentifier(value, field, maxLength) ?? null;
}

function requireInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    fail(`${field} must be an integer between ${minimum} and ${maximum}.`);
  }
  return Number(value);
}

function nullableInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null) return null;
  return requireInteger(value, field, minimum, maximum);
}

function nullableDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = requireString(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || Number.isNaN(Date.parse(`${parsed}T00:00:00Z`))) {
    fail(`${field} must use YYYY-MM-DD.`);
  }
  return parsed;
}

function assertUnique(values: string[], field: string) {
  if (new Set(values).size !== values.length) fail(`Duplicate ${field} are not allowed.`);
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function questionContentFingerprint(oppositionId: string, statement: string): string {
  return fingerprint(`${oppositionId}\n${normalizeText(statement)}`);
}

function fail(message: string): never {
  throw new AdminImportValidationError(message);
}
