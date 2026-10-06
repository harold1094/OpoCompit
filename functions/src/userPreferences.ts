export type UserPreferences = {
  hapticsEnabled: boolean;
  analyticsEnabled: boolean;
  achievementNotificationsEnabled: boolean;
  socialNotificationsEnabled: boolean;
  duelNotificationsEnabled: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  hapticsEnabled: true,
  analyticsEnabled: false,
  achievementNotificationsEnabled: true,
  socialNotificationsEnabled: true,
  duelNotificationsEnabled: true,
};

export function parseUserPreferences(value: unknown): UserPreferences {
  const stored = isRecord(value) ? value : {};
  return {
    hapticsEnabled: booleanValue(stored.hapticsEnabled, defaultUserPreferences.hapticsEnabled),
    analyticsEnabled: booleanValue(stored.analyticsEnabled, defaultUserPreferences.analyticsEnabled),
    achievementNotificationsEnabled: booleanValue(
      stored.achievementNotificationsEnabled,
      defaultUserPreferences.achievementNotificationsEnabled,
    ),
    socialNotificationsEnabled: booleanValue(
      stored.socialNotificationsEnabled,
      defaultUserPreferences.socialNotificationsEnabled,
    ),
    duelNotificationsEnabled: booleanValue(
      stored.duelNotificationsEnabled,
      defaultUserPreferences.duelNotificationsEnabled,
    ),
  };
}

export function parseUserPreferencesPatch(value: unknown): Partial<UserPreferences> | null {
  if (!isRecord(value)) return null;
  const allowedKeys = Object.keys(defaultUserPreferences) as Array<keyof UserPreferences>;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !allowedKeys.includes(key as keyof UserPreferences))) {
    return null;
  }
  const patch: Partial<UserPreferences> = {};
  for (const key of keys as Array<keyof UserPreferences>) {
    if (typeof value[key] !== "boolean") return null;
    patch[key] = value[key];
  }
  return patch;
}

export function notificationAllowed(type: string, preferences: UserPreferences): boolean {
  if (type === "achievement") return preferences.achievementNotificationsEnabled;
  if (["friend_request", "friend_accepted"].includes(type)) {
    return preferences.socialNotificationsEnabled;
  }
  if (["duel_invitation", "duel_accepted", "duel_result"].includes(type)) {
    return preferences.duelNotificationsEnabled;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
