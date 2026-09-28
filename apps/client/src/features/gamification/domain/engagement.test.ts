import { QuizResult } from '@/core/domain/types';
import { localDailyEngagement, progressLocalMissions } from './engagement';

const result: QuizResult = {
  attempts: Array.from({ length: 10 }, (_, index) => ({
    question: {
      id: `q${index}`,
      oppositionId: 'firefighters_es',
      statement: 'Test',
      answers: [],
      categoryId: 'test',
      difficulty: 1,
      scopeType: 'national',
      territoryKeys: ['ES'],
      source: 'test',
    },
    selectedAnswerId: 'a',
    isBlank: false,
    isCorrect: index < 7,
  })),
  correct: 7,
  incorrect: 3,
  blank: 0,
  points: 7,
  percentage: 0.7,
  xpEarned: 90,
  coinsEarned: 19,
  completedAt: '2026-09-28T10:00:00.000Z',
};

describe('local daily engagement', () => {
  it('resets missions on a new Madrid day', () => {
    const first = localDailyEngagement(null, [], new Date('2026-09-28T10:00:00Z'));
    const next = localDailyEngagement(
      {...first.dailyReward, claimed: true},
      first.missions.map((mission) => ({...mission, progress: mission.target})),
      new Date('2026-09-29T10:00:00Z'),
    );

    expect(next.dailyReward.claimed).toBe(false);
    expect(next.dailyReward.date).toBe('2026-09-29');
    expect(next.dailyReward.day).toBe(2);
    expect(next.missions.every((mission) => mission.progress === 0)).toBe(true);
  });

  it('increments missions from a completed quiz', () => {
    const engagement = localDailyEngagement(null, [], new Date('2026-09-28T10:00:00Z'));
    const missions = progressLocalMissions(engagement.missions, result);

    expect(missions.map((mission) => mission.progress)).toEqual([1, 10, 7]);
  });
});
