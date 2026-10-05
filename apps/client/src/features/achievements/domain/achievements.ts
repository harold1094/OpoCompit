import {
  Achievement,
  AchievementMetric,
  AchievementOverview,
  PlayerProfile,
  Question,
  UserQuestionStat,
} from '@/core/domain/types';

type LocalAchievement = Omit<
  Achievement,
  'progress' | 'unlocked' | 'newlyUnlocked' | 'unlockedAt'
>;

const localCatalog: LocalAchievement[] = [
  achievement('first_quiz', 'Primer paso', 'Completa tu primera partida.', 'flag-checkered', 'testsCompleted', 1, 50, 25),
  achievement('perfect_quiz', 'Partida perfecta', 'Completa un test sin fallos ni respuestas en blanco.', 'check-decagram', 'perfectTests', 1, 100, 50, 1),
  achievement('questions_100', 'Centenar', 'Responde 100 preguntas.', 'counter', 'totalQuestions', 100, 100, 100),
  achievement('questions_1000', 'Mil respuestas', 'Responde 1.000 preguntas.', 'book-check-outline', 'totalQuestions', 1000, 300, 300, 2),
  achievement('questions_10000', 'Diez mil respuestas', 'Responde 10.000 preguntas.', 'school-outline', 'totalQuestions', 10000, 1000, 1000, 10),
  achievement('duel_wins_10', 'Diez victorias', 'Gana 10 duelos.', 'sword-cross', 'duelWins', 10, 200, 200, 1),
  achievement('duel_wins_100', 'Leyenda de los duelos', 'Gana 100 duelos.', 'trophy-outline', 'duelWins', 100, 750, 750, 5),
  achievement('streak_30', 'Constancia de acero', 'Alcanza una racha de 30 días.', 'fire', 'bestStreak', 30, 500, 500, 5),
  {
    ...achievement('hydraulics_specialist', 'Especialista en hidráulica', 'Acierta 50 preguntas de hidráulica con al menos un 80% de precisión.', 'water-pump', 'categoryCorrectAnswers', 50, 350, 300, 3),
    categoryId: 'hydraulics',
    minimumAccuracy: 0.8,
  },
];

export function buildLocalAchievementOverview(
  profile: PlayerProfile,
  stats: Record<string, UserQuestionStat>,
  questions: Question[],
): AchievementOverview {
  const categoryByQuestion = new Map(questions.map((question) => [question.id, question.categoryId]));
  const categories: Record<string, {correctCount: number; timesSeen: number}> = {};
  Object.values(stats).forEach((stat) => {
    const categoryId = stat.categoryId ?? categoryByQuestion.get(stat.questionId);
    if (!categoryId) return;
    const category = categories[categoryId] ?? {correctCount: 0, timesSeen: 0};
    category.correctCount += stat.correctCount;
    category.timesSeen += stat.timesSeen;
    categories[categoryId] = category;
  });

  const items = localCatalog.map((template) => {
    const category = template.categoryId ? categories[template.categoryId] : undefined;
    const rawProgress = template.metric === 'categoryCorrectAnswers'
      ? category?.correctCount ?? 0
      : profileMetric(profile, template.metric);
    const accuracy = category && category.timesSeen > 0
      ? category.correctCount / category.timesSeen
      : 0;
    const unlocked = rawProgress >= template.target &&
      (template.minimumAccuracy === null || accuracy >= template.minimumAccuracy);
    return {
      ...template,
      progress: Math.min(template.target, rawProgress),
      unlocked,
      newlyUnlocked: false,
      unlockedAt: null,
    };
  });

  return {
    items,
    unlockedCount: items.filter((item) => item.unlocked).length,
    totalCount: items.length,
    newlyUnlockedIds: [],
  };
}

function achievement(
  id: string,
  title: string,
  description: string,
  icon: string,
  metric: AchievementMetric,
  target: number,
  rewardXp: number,
  rewardCoins: number,
  rewardGems = 0,
): LocalAchievement {
  return {
    id,
    title,
    description,
    icon,
    metric,
    target,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp,
    rewardCoins,
    rewardGems,
  };
}

function profileMetric(profile: PlayerProfile, metric: AchievementMetric): number {
  if (metric === 'categoryCorrectAnswers') return 0;
  return profile[metric] ?? 0;
}
