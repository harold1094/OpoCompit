import { UserPreferences } from '@/core/domain/types';

export const defaultUserPreferences: UserPreferences = {
  hapticsEnabled: true,
  analyticsEnabled: false,
  achievementNotificationsEnabled: true,
  socialNotificationsEnabled: true,
  duelNotificationsEnabled: true,
};

export function mergeUserPreferences(
  current: UserPreferences,
  patch: Partial<UserPreferences>,
): UserPreferences {
  return {...current, ...patch};
}
