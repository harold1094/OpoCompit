import { PlayerProfile, Question } from '@/core/domain/types';
import { applyResult, BLANK_ANSWER_ID, scoreQuickMatch } from './scoring';

const questions: Question[] = ['q1', 'q2', 'q3'].map((id) => ({
  id,
  oppositionId: 'firefighters_es',
  statement: id,
  answers: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
  correctAnswerId: 'a',
  explanation: '',
  categoryId: 'test',
  difficulty: 1,
  scopeType: 'national',
  territoryKeys: ['ES'],
  source: 'test',
}));

const profile: PlayerProfile = {
  uid: 'test',
  username: 'Test',
  isGuest: true,
  oppositionId: 'firefighters_es',
  oppositionName: 'Bomberos',
  territory: { label: 'España', country: 'ES' },
  xp: 0,
  level: 1,
  coins: 0,
  gems: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  testsCompleted: 0,
  duelsPlayed: 0,
  duelWins: 0,
  duelLosses: 0,
  duelDraws: 0,
};

describe('quick match scoring', () => {
  it('scores correct, incorrect and blank answers', () => {
    const result = scoreQuickMatch(
      questions,
      { q1: 'a', q2: 'b', q3: BLANK_ANSWER_ID },
      new Date('2026-09-24T12:00:00Z'),
    );

    expect(result).toMatchObject({
      correct: 1,
      incorrect: 1,
      blank: 1,
      xpEarned: 30,
      coinsEarned: 7,
    });
  });

  it('updates profile progress and starts the streak', () => {
    const result = scoreQuickMatch(questions, { q1: 'a', q2: 'a', q3: 'a' });
    const updated = applyResult(profile, result);

    expect(updated.currentStreak).toBe(1);
    expect(updated.testsCompleted).toBe(1);
    expect(updated.totalQuestions).toBe(3);
    expect(updated.correctAnswers).toBe(3);
    expect(updated.xp).toBe(result.xpEarned);
  });
});
