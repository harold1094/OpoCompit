import { PlayerProfile, Question } from '@/core/domain/types';
import { eligibleForQuickMatch, territoryKeys } from './questionFilter';

const profile: PlayerProfile = {
  uid: 'test',
  username: 'Test',
  isGuest: true,
  oppositionId: 'firefighters_es',
  oppositionName: 'Bomberos',
  territory: {
    label: 'Bomberos Cartagena',
    country: 'ES',
    autonomousCommunity: 'Murcia',
    province: 'Murcia',
    municipality: 'Cartagena',
  },
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

function question(id: string, territoryKey: string, difficulty = 1): Question {
  return {
    id,
    oppositionId: 'firefighters_es',
    statement: id,
    answers: [{ id: 'a', text: 'A' }],
    correctAnswerId: 'a',
    explanation: '',
    categoryId: 'test',
    difficulty,
    scopeType: 'test',
    territoryKeys: [territoryKey],
    source: 'test',
  };
}

describe('question filtering', () => {
  it('builds inherited territory keys', () => {
    expect(territoryKeys(profile.territory)).toEqual([
      'ES',
      'ES-Murcia',
      'ES-Murcia-Cartagena',
    ]);
  });

  it('includes inherited content and excludes incompatible territory content', () => {
    const result = eligibleForQuickMatch(profile, [
      question('national', 'ES'),
      question('murcia', 'ES-Murcia'),
      question('cartagena', 'ES-Murcia-Cartagena'),
      question('madrid', 'ES-Madrid'),
    ]);

    expect(result.map((item) => item.id)).toEqual(['cartagena', 'murcia', 'national']);
  });
});
