import { PlayerProfile, Question, UserQuestionStat } from '@/core/domain/types';
import { buildLocalAchievementOverview } from './achievements';

const profile: PlayerProfile = {
  uid: 'test',
  username: 'Test',
  isGuest: true,
  oppositionId: 'firefighters_es',
  oppositionName: 'Bomberos',
  territory: {label: 'España', country: 'ES'},
  xp: 0,
  level: 1,
  coins: 0,
  gems: 0,
  currentStreak: 7,
  bestStreak: 7,
  totalQuestions: 120,
  correctAnswers: 100,
  testsCompleted: 12,
  perfectTests: 1,
  duelsPlayed: 5,
  duelWins: 4,
  duelLosses: 1,
  duelDraws: 0,
};

const hydraulicsQuestion: Question = {
  id: 'hydraulics-1',
  oppositionId: 'firefighters_es',
  statement: 'Presión',
  answers: [{id: 'a', text: 'A'}],
  categoryId: 'hydraulics',
  difficulty: 1,
  scopeType: 'national',
  territoryKeys: ['ES'],
  source: 'test',
};

describe('local achievements', () => {
  it('shows aggregate milestones and category progress', () => {
    const stat: UserQuestionStat = {
      questionId: hydraulicsQuestion.id,
      categoryId: 'hydraulics',
      timesSeen: 40,
      correctCount: 36,
      incorrectCount: 4,
      blankCount: 0,
      lastAnswerId: 'a',
      lastAnsweredAt: '2026-10-05T00:00:00.000Z',
    };
    const overview = buildLocalAchievementOverview(
      profile,
      {[stat.questionId]: stat},
      [hydraulicsQuestion],
    );

    expect(overview.unlockedCount).toBe(3);
    expect(overview.items.find((item) => item.id === 'first_quiz')?.unlocked).toBe(true);
    expect(overview.items.find((item) => item.id === 'perfect_quiz')?.unlocked).toBe(true);
    expect(overview.items.find((item) => item.id === 'questions_100')?.unlocked).toBe(true);
    expect(overview.items.find((item) => item.id === 'hydraulics_specialist')).toMatchObject({
      progress: 36,
      unlocked: false,
    });
  });
});
