import {PlayerProfile} from '@/core/domain/types';

import {linkLocalProfile} from './localAccount';

const guest: PlayerProfile = {
  uid: 'local_guest',
  username: 'Invitado',
  isGuest: true,
  oppositionId: 'bomberos',
  oppositionName: 'Bomberos',
  territory: {label: 'Madrid', country: 'ES', autonomousCommunity: 'Madrid'},
  xp: 420,
  level: 4,
  coins: 85,
  gems: 3,
  currentStreak: 6,
  bestStreak: 9,
  totalQuestions: 120,
  correctAnswers: 93,
  testsCompleted: 12,
  duelsPlayed: 4,
  duelWins: 3,
  duelLosses: 1,
  duelDraws: 0,
};

describe('linkLocalProfile', () => {
  it('changes only the identity fields and preserves local progress', () => {
    expect(linkLocalProfile(guest, 'firebase-user', 'Harold')).toEqual({
      ...guest,
      uid: 'firebase-user',
      username: 'Harold',
      isGuest: false,
    });
  });

  it('keeps the existing username when the provider has no display name', () => {
    expect(linkLocalProfile(guest, 'firebase-user', '  ').username).toBe('Invitado');
  });
});
