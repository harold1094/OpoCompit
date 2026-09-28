import { DailyEngagement, DailyReward, Mission, QuizResult } from '@/core/domain/types';

const missionDefinitions: Omit<Mission, 'date' | 'progress' | 'claimed'>[] = [
  {
    id: 'daily_complete_quick',
    title: 'Primera partida del día',
    description: 'Completa una partida rápida.',
    type: 'completeQuickMatches',
    target: 1,
    rewardXp: 20,
    rewardCoins: 10,
  },
  {
    id: 'daily_30_questions',
    title: 'Calienta motores',
    description: 'Responde 30 preguntas.',
    type: 'answerQuestions',
    target: 30,
    rewardXp: 30,
    rewardCoins: 15,
  },
  {
    id: 'daily_15_correct',
    title: 'Precisión útil',
    description: 'Consigue 15 respuestas correctas.',
    type: 'correctAnswers',
    target: 15,
    rewardXp: 35,
    rewardCoins: 20,
  },
];

const dailyRewards = [
  {coins: 25, gems: 0},
  {coins: 30, gems: 0},
  {coins: 35, gems: 0},
  {coins: 40, gems: 0},
  {coins: 50, gems: 0},
  {coins: 60, gems: 0},
  {coins: 75, gems: 1},
];

export function localDailyEngagement(
  currentReward?: DailyReward | null,
  currentMissions: Mission[] = [],
  now = new Date(),
): DailyEngagement {
  const date = madridDay(now);
  if (
    currentReward?.date === date &&
    currentMissions.length === missionDefinitions.length &&
    currentMissions.every((mission) => mission.date === date)
  ) {
    return {dailyReward: currentReward, missions: currentMissions};
  }

  const previousDay = currentReward?.day ?? 0;
  const day = currentReward?.claimed ? previousDay % dailyRewards.length + 1 : Math.max(1, previousDay);
  return {
    dailyReward: {date, day, ...dailyRewards[day - 1], claimed: false},
    missions: missionDefinitions.map((mission) => ({
      ...mission,
      date,
      progress: 0,
      claimed: false,
    })),
  };
}

export function progressLocalMissions(missions: Mission[], result: QuizResult): Mission[] {
  return missions.map((mission) => {
    const increment =
      mission.type === 'answerQuestions'
        ? result.attempts.length
        : mission.type === 'correctAnswers'
          ? result.correct
          : 1;
    return {...mission, progress: Math.min(mission.target, mission.progress + increment)};
  });
}

function madridDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
