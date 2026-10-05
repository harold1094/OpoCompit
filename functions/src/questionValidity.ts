export type QuestionValidity = {
  validFrom?: unknown;
  validUntil?: unknown;
};

export function isQuestionCurrentlyValid(
  question: QuestionValidity,
  currentDay: string,
): boolean {
  const validFrom = isoDay(question.validFrom);
  const validUntil = isoDay(question.validUntil);
  return (!validFrom || validFrom <= currentDay) && (!validUntil || validUntil >= currentDay);
}

export function previousIsoDay(currentDay: string): string {
  const parsed = new Date(`${currentDay}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid ISO day.");
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function isoDay(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
