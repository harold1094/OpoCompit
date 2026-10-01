export const adminCatalogKinds = [
  "oppositions",
  "territories",
  "categories",
  "officialExams",
] as const;

export type AdminCatalogKind = typeof adminCatalogKinds[number];

export type OppositionCatalogItem = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  priority: number;
};

export type TerritoryCatalogItem = {
  id: string;
  label: string;
  country: string;
  autonomousCommunity: string | null;
  province: string | null;
  municipality: string | null;
  specificBody: string | null;
  active: boolean;
  priority: number;
};

export type CategoryCatalogItem = {
  id: string;
  oppositionId: string;
  name: string;
  parentId: string | null;
  active: boolean;
  priority: number;
};

export type OfficialExamCatalogItem = {
  id: string;
  oppositionId: string;
  name: string;
  date: string;
  year: number;
  territoryKeys: string[];
  source: string;
  status: "draft" | "published" | "disabled";
  rules: {
    questionCount: number;
    durationSeconds: number;
    correctPoints: number;
    incorrectPenalty: number;
    blankPoints: number;
  };
};

export type AdminCatalogItem = OppositionCatalogItem | TerritoryCatalogItem |
  CategoryCatalogItem | OfficialExamCatalogItem;

export class AdminCatalogValidationError extends Error {}

export function isAdminCatalogKind(value: unknown): value is AdminCatalogKind {
  return typeof value === "string" && (adminCatalogKinds as readonly string[]).includes(value);
}

export function parseAdminCatalogItem(
  kind: AdminCatalogKind,
  idValue: unknown,
  value: unknown,
): AdminCatalogItem {
  const id = identifier(idValue, "id", 160);
  const data = objectValue(value, "item");
  if (kind === "oppositions") return parseOpposition(id, data);
  if (kind === "territories") return parseTerritory(id, data);
  if (kind === "categories") return parseCategory(id, data);
  return parseOfficialExam(id, data);
}

function parseOpposition(id: string, data: Record<string, unknown>): OppositionCatalogItem {
  return {
    id,
    name: text(data.name, "name", 100),
    slug: slug(data.slug, "slug"),
    active: booleanValue(data.active, "active"),
    priority: integer(data.priority, "priority", 0, 10_000),
  };
}

function parseTerritory(id: string, data: Record<string, unknown>): TerritoryCatalogItem {
  const country = text(data.country, "country", 8).toUpperCase();
  return {
    id,
    label: text(data.label, "label", 160),
    country,
    autonomousCommunity: optionalText(data.autonomousCommunity, "autonomousCommunity", 100),
    province: optionalText(data.province, "province", 100),
    municipality: optionalText(data.municipality, "municipality", 100),
    specificBody: optionalText(data.specificBody, "specificBody", 120),
    active: booleanValue(data.active, "active"),
    priority: integer(data.priority, "priority", 0, 10_000),
  };
}

function parseCategory(id: string, data: Record<string, unknown>): CategoryCatalogItem {
  const parentId = optionalIdentifier(data.parentId, "parentId", 160);
  if (parentId === id) fail("parentId cannot reference the same category.");
  return {
    id,
    oppositionId: identifier(data.oppositionId, "oppositionId", 80),
    name: text(data.name, "name", 120),
    parentId,
    active: booleanValue(data.active, "active"),
    priority: integer(data.priority, "priority", 0, 10_000),
  };
}

function parseOfficialExam(id: string, data: Record<string, unknown>): OfficialExamCatalogItem {
  const rules = objectValue(data.rules, "rules");
  const date = isoDate(data.date, "date");
  const year = integer(data.year, "year", 1900, 2100);
  if (Number(date.slice(0, 4)) !== year) fail("year must match the exam date.");
  const status = text(data.status, "status", 20);
  if (!(["draft", "published", "disabled"] as string[]).includes(status)) {
    fail("status must be draft, published, or disabled.");
  }
  return {
    id,
    oppositionId: identifier(data.oppositionId, "oppositionId", 80),
    name: text(data.name, "name", 160),
    date,
    year,
    territoryKeys: stringList(data.territoryKeys, "territoryKeys", 12, 120),
    source: text(data.source, "source", 500),
    status: status as OfficialExamCatalogItem["status"],
    rules: {
      questionCount: integer(rules.questionCount, "rules.questionCount", 1, 500),
      durationSeconds: integer(rules.durationSeconds, "rules.durationSeconds", 60, 86_400),
      correctPoints: numberValue(rules.correctPoints, "rules.correctPoints", 0, 100),
      incorrectPenalty: numberValue(rules.incorrectPenalty, "rules.incorrectPenalty", 0, 100),
      blankPoints: numberValue(rules.blankPoints, "rules.blankPoints", 0, 100),
    },
  };
}

function objectValue(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    fail(`${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return text(value, field, maxLength);
}

function identifier(value: unknown, field: string, maxLength: number): string {
  const parsed = text(value, field, maxLength);
  if (!/^[A-Za-z0-9_-]+$/.test(parsed)) {
    fail(`${field} may contain only letters, numbers, underscores, and hyphens.`);
  }
  return parsed;
}

function optionalIdentifier(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return identifier(value, field, maxLength);
}

function slug(value: unknown, field: string): string {
  const parsed = text(value, field, 100).toLocaleLowerCase("es");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed)) {
    fail(`${field} must use lowercase letters, numbers, and single hyphens.`);
  }
  return parsed;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(`${field} must be boolean.`);
  return value;
}

function integer(value: unknown, field: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    fail(`${field} must be an integer between ${minimum} and ${maximum}.`);
  }
  return Number(value);
}

function numberValue(value: unknown, field: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    fail(`${field} must be a number between ${minimum} and ${maximum}.`);
  }
  return value;
}

function isoDate(value: unknown, field: string): string {
  const parsed = text(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || Number.isNaN(Date.parse(`${parsed}T00:00:00Z`))) {
    fail(`${field} must use YYYY-MM-DD.`);
  }
  return parsed;
}

function stringList(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    fail(`${field} must contain between 1 and ${maxItems} entries.`);
  }
  const result = value.map((item, index) => text(item, `${field}[${index}]`, maxLength));
  if (new Set(result).size !== result.length) fail(`${field} cannot contain duplicates.`);
  return result;
}

function fail(message: string): never {
  throw new AdminCatalogValidationError(message);
}
