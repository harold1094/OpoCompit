export type MissionType =
  | "completeQuickMatches"
  | "answerQuestions"
  | "correctAnswers";

export type MissionTemplate = {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  target: number;
  rewardXp: number;
  rewardCoins: number;
};

export type DailyRewardState = {
  date: string;
  day: number;
  coins: number;
  gems: number;
  claimed: boolean;
};

export type DailyRewardTemplate = {
  day: number;
  coins: number;
  gems: number;
};

export const dailyMissionTemplates: MissionTemplate[] = [
  {
    id: "daily_complete_quick",
    title: "Primera partida del día",
    description: "Completa una partida rápida.",
    type: "completeQuickMatches",
    target: 1,
    rewardXp: 20,
    rewardCoins: 10,
  },
  {
    id: "daily_30_questions",
    title: "Calienta motores",
    description: "Responde 30 preguntas.",
    type: "answerQuestions",
    target: 30,
    rewardXp: 30,
    rewardCoins: 15,
  },
  {
    id: "daily_15_correct",
    title: "Precisión útil",
    description: "Consigue 15 respuestas correctas.",
    type: "correctAnswers",
    target: 15,
    rewardXp: 35,
    rewardCoins: 20,
  },
];

export const defaultDailyRewards: DailyRewardTemplate[] = [
  {day: 1, coins: 25, gems: 0},
  {day: 2, coins: 30, gems: 0},
  {day: 3, coins: 35, gems: 0},
  {day: 4, coins: 40, gems: 0},
  {day: 5, coins: 50, gems: 0},
  {day: 6, coins: 60, gems: 0},
  {day: 7, coins: 75, gems: 1},
];

export function madridDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dailyRewardFor(
  previousDayValue: unknown,
  lastClaimedDateValue: unknown,
  date: string,
  schedule: readonly DailyRewardTemplate[] = defaultDailyRewards,
): DailyRewardState {
  const rewards = schedule.length > 0 ? [...schedule].sort((first, second) => first.day - second.day) :
    defaultDailyRewards;
  const previousDay = normalizeRewardDay(previousDayValue);
  const lastClaimedDate = typeof lastClaimedDateValue === "string" ? lastClaimedDateValue : null;
  const claimed = lastClaimedDate === date;
  const previousIndex = rewards.findIndex((reward) => reward.day === previousDay);
  const scheduleIndex = claimed ? Math.max(0, previousIndex) : (previousIndex + 1) % rewards.length;
  const reward = rewards[scheduleIndex];
  return {date, day: reward.day, coins: reward.coins, gems: reward.gems, claimed};
}

export function missionProgressIncrement(
  type: MissionType,
  questionCount: number,
  correctAnswers: number,
  completedQuickMatch = true,
): number {
  if (type === "answerQuestions") return Math.max(0, questionCount);
  if (type === "correctAnswers") return Math.max(0, correctAnswers);
  return completedQuickMatch ? 1 : 0;
}

export function missionDocumentId(date: string, missionId: string): string {
  return `${date}_${missionId}`;
}

function normalizeRewardDay(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return 0;
  return value;
}
