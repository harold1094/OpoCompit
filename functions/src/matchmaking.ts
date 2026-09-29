import {DuelOutcome} from "./duel.js";

const defaultRating = 1000;

export function normalizedRating(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultRating;
  return Math.max(500, Math.min(2500, Math.round(value)));
}

export function matchmakingRange(waitMs: number): number {
  if (waitMs >= 90_000) return 400;
  if (waitMs >= 30_000) return 200;
  return 100;
}

export function ratingsAreCompatible(
  firstRating: number,
  secondRating: number,
  firstWaitMs: number,
  secondWaitMs: number,
): boolean {
  const allowedDifference = Math.max(
    matchmakingRange(firstWaitMs),
    matchmakingRange(secondWaitMs),
  );
  return Math.abs(normalizedRating(firstRating) - normalizedRating(secondRating)) <=
    allowedDifference;
}

export function updatedRatings(
  firstRating: number,
  secondRating: number,
  firstOutcome: DuelOutcome,
): {first: number; second: number} {
  const first = normalizedRating(firstRating);
  const second = normalizedRating(secondRating);
  const expectedFirst = 1 / (1 + 10 ** ((second - first) / 400));
  const actualFirst = firstOutcome === "win" ? 1 : firstOutcome === "draw" ? 0.5 : 0;
  const delta = Math.round(24 * (actualFirst - expectedFirst));
  return {
    first: normalizedRating(first + delta),
    second: normalizedRating(second - delta),
  };
}
