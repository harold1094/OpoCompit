export type DuelOutcome = "win" | "loss" | "draw";

export type TrainingOpponent = {
  id: string;
  name: string;
  level: number;
  territoryLabel: string;
  correctAnswers: number;
  elapsedMs: number;
};

export const trainingOpponents: TrainingOpponent[] = [
  {
    id: "training_mario",
    name: "MarioCT",
    level: 8,
    territoryLabel: "Cartagena",
    correctAnswers: 7,
    elapsedMs: 85_000,
  },
  {
    id: "training_lucia",
    name: "LuciaM",
    level: 11,
    territoryLabel: "Murcia",
    correctAnswers: 8,
    elapsedMs: 78_000,
  },
  {
    id: "training_alex",
    name: "Alex112",
    level: 7,
    territoryLabel: "Cartagena",
    correctAnswers: 6,
    elapsedMs: 92_000,
  },
];

export function trainingOpponent(opponentId: string): TrainingOpponent | undefined {
  return trainingOpponents.find((opponent) => opponent.id === opponentId);
}

export function duelOutcome(
  playerCorrect: number,
  playerElapsedMs: number,
  opponentCorrect: number,
  opponentElapsedMs: number,
): DuelOutcome {
  if (playerCorrect > opponentCorrect) return "win";
  if (playerCorrect < opponentCorrect) return "loss";
  if (playerElapsedMs < opponentElapsedMs) return "win";
  if (playerElapsedMs > opponentElapsedMs) return "loss";
  return "draw";
}
