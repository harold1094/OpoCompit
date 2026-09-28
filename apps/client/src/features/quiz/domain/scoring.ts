import { PlayerProfile, Question, QuizResult } from '@/core/domain/types';

export const BLANK_ANSWER_ID = '__blank__';

export function scoreQuickMatch(
  questions: Question[],
  selectedAnswers: Record<string, string | null>,
  completedAt = new Date(),
): QuizResult {
  const attempts = questions.map((question) => {
    const rawAnswer = selectedAnswers[question.id];
    const selectedAnswerId = rawAnswer === BLANK_ANSWER_ID ? null : (rawAnswer ?? null);
    return {
      question,
      selectedAnswerId,
      isBlank: selectedAnswerId === null,
      isCorrect:
        question.correctAnswerId !== undefined && selectedAnswerId === question.correctAnswerId,
    };
  });
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  const blank = attempts.filter((attempt) => attempt.isBlank).length;
  const incorrect = attempts.length - correct - blank;
  const percentage = attempts.length === 0 ? 0 : correct / attempts.length;

  return {
    attempts,
    correct,
    incorrect,
    blank,
    points: correct,
    percentage,
    xpEarned: correct * 10 + 20 + (percentage >= 0.8 ? 10 : 0),
    coinsEarned: correct * 2 + 5,
    completedAt: completedAt.toISOString(),
  };
}

export function applyResult(profile: PlayerProfile, result: QuizResult): PlayerProfile {
  const xp = profile.xp + result.xpEarned;
  const streak = nextStreak(
    profile.currentStreak,
    profile.lastValidActivityDate,
    result.completedAt,
  );

  return {
    ...profile,
    xp,
    level: Math.floor(Math.sqrt(xp / 100)) + 1,
    coins: profile.coins + result.coinsEarned,
    currentStreak: streak,
    bestStreak: Math.max(profile.bestStreak, streak),
    totalQuestions: profile.totalQuestions + result.attempts.length,
    correctAnswers: profile.correctAnswers + result.correct,
    testsCompleted: profile.testsCompleted + 1,
    lastValidActivityDate: result.completedAt,
  };
}

function nextStreak(current: number, previousIso: string | null | undefined, currentIso: string): number {
  if (!previousIso) return 1;
  const previous = startOfDay(new Date(previousIso));
  const currentDay = startOfDay(new Date(currentIso));
  const days = Math.round((currentDay.getTime() - previous.getTime()) / 86_400_000);
  if (days === 0) return current;
  if (days === 1) return current + 1;
  return 1;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
