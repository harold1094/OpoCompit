import {
  CategoryLearningInsight,
  LearningInsights,
  Question,
  UserQuestionStat,
} from '@/core/domain/types';

export function buildLearningInsights(
  questions: Question[],
  stats: Record<string, UserQuestionStat>,
): LearningInsights {
  const categoryByQuestion = new Map(questions.map((question) => [question.id, question.categoryId]));
  const categories = new Map<string, CategoryLearningInsight>();

  Object.values(stats).forEach((stat) => {
    const categoryId = stat.categoryId ?? categoryByQuestion.get(stat.questionId);
    if (!categoryId || stat.timesSeen <= 0) return;
    const current = categories.get(categoryId) ?? {
      categoryId,
      timesSeen: 0,
      correctCount: 0,
      incorrectCount: 0,
      blankCount: 0,
      pendingReviewCount: 0,
      accuracy: 0,
    };
    current.timesSeen += stat.timesSeen;
    current.correctCount += stat.correctCount;
    current.incorrectCount += stat.incorrectCount;
    current.blankCount += stat.blankCount;
    current.pendingReviewCount += stat.needsReview ? 1 : 0;
    categories.set(categoryId, current);
  });

  const ranked = [...categories.values()].map((category) => ({
    ...category,
    accuracy: category.timesSeen === 0 ? 0 : category.correctCount / category.timesSeen,
  }));
  const strongest = [...ranked].sort(compareStrongest)[0] ?? null;
  const weakest = [...ranked].sort(compareWeakest)[0] ?? null;
  const totalSeen = ranked.reduce((total, category) => total + category.timesSeen, 0);
  const correctCount = ranked.reduce((total, category) => total + category.correctCount, 0);

  return {
    categories: ranked.sort(compareWeakest),
    strongestCategory: strongest,
    weakestCategory: weakest,
    totalSeen,
    correctCount,
    accuracy: totalSeen === 0 ? 0 : correctCount / totalSeen,
  };
}

function compareStrongest(first: CategoryLearningInsight, second: CategoryLearningInsight) {
  return second.accuracy - first.accuracy || second.timesSeen - first.timesSeen ||
    first.categoryId.localeCompare(second.categoryId);
}

function compareWeakest(first: CategoryLearningInsight, second: CategoryLearningInsight) {
  return first.accuracy - second.accuracy || second.pendingReviewCount - first.pendingReviewCount ||
    second.timesSeen - first.timesSeen || first.categoryId.localeCompare(second.categoryId);
}
