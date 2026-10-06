import {PlayerProfile} from '@/core/domain/types';

export function linkLocalProfile(
  profile: PlayerProfile,
  uid: string,
  displayName?: string | null,
): PlayerProfile {
  const username = displayName?.trim() || profile.username;

  return {
    ...profile,
    uid,
    username,
    isGuest: false,
  };
}
