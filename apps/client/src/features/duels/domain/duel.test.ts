import { duelOutcome, localOpponentPerformance } from './duel';

describe('classic duel rules', () => {
  it('uses correct answers before elapsed time', () => {
    expect(duelOutcome(8, 120_000, 7, 60_000)).toBe('win');
    expect(duelOutcome(6, 60_000, 7, 120_000)).toBe('loss');
  });

  it('uses time to break a tied score', () => {
    expect(duelOutcome(7, 70_000, 7, 80_000)).toBe('win');
    expect(duelOutcome(7, 90_000, 7, 80_000)).toBe('loss');
    expect(duelOutcome(7, 80_000, 7, 80_000)).toBe('draw');
  });

  it('provides deterministic local opponents', () => {
    expect(localOpponentPerformance('training_lucia')).toEqual({correct: 8, elapsedMs: 78_000});
  });
});
