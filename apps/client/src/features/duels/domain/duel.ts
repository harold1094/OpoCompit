import { DuelOpponent, DuelOutcome } from '@/core/domain/types';

export const trainingOpponents: DuelOpponent[] = [
  { id: 'training_mario', name: 'MarioCT', level: 8, territoryLabel: 'Cartagena' },
  { id: 'training_lucia', name: 'LuciaM', level: 11, territoryLabel: 'Murcia' },
  { id: 'training_alex', name: 'Alex112', level: 7, territoryLabel: 'Cartagena' },
];

export function duelOutcome(
  playerCorrect: number,
  playerElapsedMs: number,
  opponentCorrect: number,
  opponentElapsedMs: number,
): DuelOutcome {
  if (playerCorrect > opponentCorrect) return 'win';
  if (playerCorrect < opponentCorrect) return 'loss';
  if (playerElapsedMs < opponentElapsedMs) return 'win';
  if (playerElapsedMs > opponentElapsedMs) return 'loss';
  return 'draw';
}

export function localOpponentPerformance(opponentId: string) {
  const values: Record<string, {correct: number; elapsedMs: number}> = {
    training_mario: {correct: 7, elapsedMs: 85_000},
    training_lucia: {correct: 8, elapsedMs: 78_000},
    training_alex: {correct: 6, elapsedMs: 92_000},
  };
  return values[opponentId] ?? values.training_mario;
}
