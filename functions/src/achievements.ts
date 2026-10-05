export type AchievementMetric =
  | "testsCompleted"
  | "totalQuestions"
  | "duelWins"
  | "bestStreak"
  | "perfectTests"
  | "categoryCorrectAnswers";

export type AchievementTemplate = {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
  categoryId: string | null;
  minimumAccuracy: number | null;
  rewardXp: number;
  rewardCoins: number;
  rewardGems: number;
  priority: number;
};

export type AchievementMetrics = {
  testsCompleted: number;
  totalQuestions: number;
  duelWins: number;
  bestStreak: number;
  perfectTests: number;
  categories: Record<string, {correctCount: number; timesSeen: number}>;
};

export const defaultAchievementTemplates: AchievementTemplate[] = [
  {
    id: "first_quiz",
    title: "Primer paso",
    description: "Completa tu primera partida.",
    icon: "flag-checkered",
    metric: "testsCompleted",
    target: 1,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 50,
    rewardCoins: 25,
    rewardGems: 0,
    priority: 100,
  },
  {
    id: "perfect_quiz",
    title: "Partida perfecta",
    description: "Completa un test sin fallos ni respuestas en blanco.",
    icon: "check-decagram",
    metric: "perfectTests",
    target: 1,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 100,
    rewardCoins: 50,
    rewardGems: 1,
    priority: 95,
  },
  {
    id: "questions_100",
    title: "Centenar",
    description: "Responde 100 preguntas.",
    icon: "counter",
    metric: "totalQuestions",
    target: 100,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 100,
    rewardCoins: 100,
    rewardGems: 0,
    priority: 90,
  },
  {
    id: "questions_1000",
    title: "Mil respuestas",
    description: "Responde 1.000 preguntas.",
    icon: "book-check-outline",
    metric: "totalQuestions",
    target: 1000,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 300,
    rewardCoins: 300,
    rewardGems: 2,
    priority: 80,
  },
  {
    id: "questions_10000",
    title: "Diez mil respuestas",
    description: "Responde 10.000 preguntas.",
    icon: "school-outline",
    metric: "totalQuestions",
    target: 10000,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 1000,
    rewardCoins: 1000,
    rewardGems: 10,
    priority: 70,
  },
  {
    id: "duel_wins_10",
    title: "Diez victorias",
    description: "Gana 10 duelos.",
    icon: "sword-cross",
    metric: "duelWins",
    target: 10,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 200,
    rewardCoins: 200,
    rewardGems: 1,
    priority: 60,
  },
  {
    id: "duel_wins_100",
    title: "Leyenda de los duelos",
    description: "Gana 100 duelos.",
    icon: "trophy-outline",
    metric: "duelWins",
    target: 100,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 750,
    rewardCoins: 750,
    rewardGems: 5,
    priority: 50,
  },
  {
    id: "streak_30",
    title: "Constancia de acero",
    description: "Alcanza una racha de 30 días.",
    icon: "fire",
    metric: "bestStreak",
    target: 30,
    categoryId: null,
    minimumAccuracy: null,
    rewardXp: 500,
    rewardCoins: 500,
    rewardGems: 5,
    priority: 40,
  },
  {
    id: "hydraulics_specialist",
    title: "Especialista en hidráulica",
    description: "Acierta 50 preguntas de hidráulica con al menos un 80% de precisión.",
    icon: "water-pump",
    metric: "categoryCorrectAnswers",
    target: 50,
    categoryId: "hydraulics",
    minimumAccuracy: 0.8,
    rewardXp: 350,
    rewardCoins: 300,
    rewardGems: 3,
    priority: 30,
  },
];

export function evaluateAchievement(
  template: AchievementTemplate,
  metrics: AchievementMetrics,
): {progress: number; completed: boolean} {
  let progress = 0;
  let accuracy = 1;
  if (template.metric === "categoryCorrectAnswers") {
    const category = template.categoryId ? metrics.categories[template.categoryId] : undefined;
    progress = category?.correctCount ?? 0;
    accuracy = category && category.timesSeen > 0 ? category.correctCount / category.timesSeen : 0;
  } else {
    progress = metrics[template.metric];
  }
  return {
    progress: Math.max(0, Math.min(template.target, progress)),
    completed: progress >= template.target &&
      (template.minimumAccuracy === null || accuracy >= template.minimumAccuracy),
  };
}

export function parseAchievementTemplate(
  id: string,
  value: Record<string, unknown>,
): AchievementTemplate {
  const metric = String(value.metric ?? "") as AchievementMetric;
  const supportedMetrics: AchievementMetric[] = [
    "testsCompleted",
    "totalQuestions",
    "duelWins",
    "bestStreak",
    "perfectTests",
    "categoryCorrectAnswers",
  ];
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id) || !supportedMetrics.includes(metric)) {
    throw new Error("Invalid achievement identity or metric.");
  }
  const target = integer(value.target, 1, 1_000_000);
  const categoryId = optionalString(value.categoryId, 80);
  if (metric === "categoryCorrectAnswers" && !categoryId) {
    throw new Error("Category achievement requires categoryId.");
  }
  const minimumAccuracy = value.minimumAccuracy === null || value.minimumAccuracy === undefined ?
    null : finiteNumber(value.minimumAccuracy, 0, 1);
  return {
    id,
    title: text(value.title, 80),
    description: text(value.description, 180),
    icon: text(value.icon, 80),
    metric,
    target,
    categoryId,
    minimumAccuracy,
    rewardXp: integer(value.rewardXp, 0, 100_000),
    rewardCoins: integer(value.rewardCoins, 0, 100_000),
    rewardGems: integer(value.rewardGems, 0, 10_000),
    priority: integer(value.priority, -10_000, 10_000),
  };
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new Error("Invalid achievement text.");
  }
  return value.trim();
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  return text(value, maxLength);
}

function integer(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error("Invalid achievement integer.");
  }
  return Number(value);
}

function finiteNumber(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error("Invalid achievement number.");
  }
  return value;
}
