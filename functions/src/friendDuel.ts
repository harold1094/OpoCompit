import {DuelOutcome} from "./duel.js";

export type FriendDuelViewStatus = "pending" | "active" | "waiting" | "completed";

export function commonTerritoryKeys(first: string[], second: string[]): string[] {
  const secondKeys = new Set(second);
  return [...new Set(first)].filter((key) => secondKeys.has(key));
}

export function oppositeOutcome(outcome: DuelOutcome): DuelOutcome {
  if (outcome === "win") return "loss";
  if (outcome === "loss") return "win";
  return "draw";
}

export function friendDuelViewStatus(
  storedStatus: unknown,
  viewerSubmitted: boolean,
  opponentSubmitted: boolean,
): FriendDuelViewStatus {
  if (storedStatus === "completed") return "completed";
  if (["active", "matched"].includes(String(storedStatus)) &&
    viewerSubmitted && !opponentSubmitted) return "waiting";
  if (["active", "matched"].includes(String(storedStatus))) return "active";
  return "pending";
}
