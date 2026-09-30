import Papa from 'papaparse';

type CsvRow = Record<string, string>;

export type CsvImportOptions = {
  batchId?: string;
  sourceDocument?: string;
};

export type CsvQuestionBatch = {
  batchId?: string;
  sourceDocument: string | null;
  questions: Array<Record<string, unknown>>;
};

const requiredColumns = [
  'oppositionId',
  'statement',
  'answerA',
  'answerB',
  'correctAnswerId',
  'explanation',
  'categoryId',
  'difficulty',
  'scopeType',
  'country',
  'source',
] as const;

const answerColumns = ['answerA', 'answerB', 'answerC', 'answerD', 'answerE', 'answerF'] as const;

export class CsvImportError extends Error {}

export function csvToQuestionBatch(csv: string, options: CsvImportOptions = {}): CsvQuestionBatch {
  const result = Papa.parse<CsvRow>(csv.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    throw new CsvImportError(`Fila ${(first.row ?? 0) + 2}: ${first.message}`);
  }
  if (result.data.length === 0) throw new CsvImportError('El CSV no contiene preguntas.');
  if (result.data.length > 100) throw new CsvImportError('El CSV no puede superar las 100 preguntas.');

  const fields = new Set(result.meta.fields ?? []);
  const missing = requiredColumns.filter((column) => !fields.has(column));
  if (missing.length > 0) {
    throw new CsvImportError(`Faltan columnas obligatorias: ${missing.join(', ')}.`);
  }

  const questions = result.data.map((row, index) => rowToQuestion(row, index));
  const batchId = optional(options.batchId);
  const sourceDocument = optional(options.sourceDocument) ?? null;

  return {
    ...(batchId ? { batchId } : {}),
    sourceDocument,
    questions,
  };
}

function rowToQuestion(row: CsvRow, index: number): Record<string, unknown> {
  const rowNumber = index + 2;
  const difficulty = integer(row.difficulty, 'difficulty', rowNumber);
  if (difficulty < 1 || difficulty > 5) {
    throw new CsvImportError(`Fila ${rowNumber}: difficulty debe estar entre 1 y 5.`);
  }
  const year = nullableInteger(row.year, 'year', rowNumber);
  const sourcePage = nullableInteger(row.sourcePage, 'sourcePage', rowNumber);
  required(row.answerA, 'answerA', rowNumber);
  required(row.answerB, 'answerB', rowNumber);
  const answers = answerColumns.flatMap((column, answerIndex) => {
    const text = optional(row[column]);
    return text ? [{ id: String.fromCharCode(97 + answerIndex), text }] : [];
  });

  const correctAnswerId = required(
    row.correctAnswerId,
    'correctAnswerId',
    rowNumber,
  ).toLowerCase();
  if (!answers.some((answer) => answer.id === correctAnswerId)) {
    throw new CsvImportError(`Fila ${rowNumber}: correctAnswerId no coincide con una respuesta.`);
  }

  return {
    ...(optional(row.id) ? { id: optional(row.id) } : {}),
    oppositionId: required(row.oppositionId, 'oppositionId', rowNumber),
    statement: required(row.statement, 'statement', rowNumber),
    answers,
    correctAnswerId,
    explanation: required(row.explanation, 'explanation', rowNumber),
    categoryId: required(row.categoryId, 'categoryId', rowNumber),
    subcategoryId: optional(row.subcategoryId),
    difficulty,
    scopeType: required(row.scopeType, 'scopeType', rowNumber),
    country: required(row.country, 'country', rowNumber).toUpperCase(),
    autonomousCommunity: optional(row.autonomousCommunity),
    province: optional(row.province),
    municipality: optional(row.municipality),
    specificCallId: optional(row.specificCallId),
    officialExamId: optional(row.officialExamId),
    year,
    source: required(row.source, 'source', rowNumber),
    sourceDocument: optional(row.sourceDocument),
    sourcePage,
    verified: false,
    status: 'pending_review',
    validFrom: optional(row.validFrom),
    validUntil: optional(row.validUntil),
  };
}

function required(value: string | undefined, field: string, row: number): string {
  const parsed = optional(value);
  if (!parsed) throw new CsvImportError(`Fila ${row}: ${field} es obligatorio.`);
  return parsed;
}

function optional(value: string | undefined): string | null {
  const parsed = value?.trim();
  return parsed ? parsed : null;
}

function integer(value: string | undefined, field: string, row: number): number {
  const parsed = Number(required(value, field, row));
  if (!Number.isInteger(parsed)) throw new CsvImportError(`Fila ${row}: ${field} debe ser un entero.`);
  return parsed;
}

function nullableInteger(value: string | undefined, field: string, row: number): number | null {
  if (!optional(value)) return null;
  return integer(value, field, row);
}
