import {madridDay} from "./engagement.js";

export type StreakProfile = {
  currentStreak: number;
  lastValidActivityDate: Date | null;
};

export type SharedStreak = {
  days: number;
  viewerActiveToday: boolean;
  friendActiveToday: boolean;
};

export function sharedStreak(
  viewer: StreakProfile,
  friend: StreakProfile,
  now = new Date(),
): SharedStreak {
  const today = dayNumber(madridDay(now));
  const viewerLastDay = activityDay(viewer.lastValidActivityDate);
  const friendLastDay = activityDay(friend.lastValidActivityDate);
  const viewerActiveToday = viewerLastDay === today;
  const friendActiveToday = friendLastDay === today;

  if (
    viewer.currentStreak < 1 || friend.currentStreak < 1 ||
    viewerLastDay === null || friendLastDay === null
  ) {
    return {days: 0, viewerActiveToday, friendActiveToday};
  }

  const sharedEnd = Math.min(viewerLastDay, friendLastDay);
  if (sharedEnd < today - 1 || sharedEnd > today) {
    return {days: 0, viewerActiveToday, friendActiveToday};
  }

  const viewerStart = viewerLastDay - viewer.currentStreak + 1;
  const friendStart = friendLastDay - friend.currentStreak + 1;
  const sharedStart = Math.max(viewerStart, friendStart);
  return {
    days: Math.max(0, sharedEnd - sharedStart + 1),
    viewerActiveToday,
    friendActiveToday,
  };
}

function activityDay(value: Date | null): number | null {
  return value ? dayNumber(madridDay(value)) : null;
}

function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}
