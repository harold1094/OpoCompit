import 'dart:math';

import '../../../core/domain/player_profile.dart';
import '../../../core/domain/question.dart';
import '../../../core/domain/quiz_result.dart';

class ScoringService {
  const ScoringService();

  QuizResult scoreQuickMatch({
    required List<Question> questions,
    required Map<String, String?> selectedAnswers,
  }) {
    final attempts = questions
        .map(
          (question) => QuestionAttempt(
            question: question,
            selectedAnswerId: selectedAnswers[question.id],
          ),
        )
        .toList();

    final correct = attempts.where((attempt) => attempt.isCorrect).length;
    final blank = attempts.where((attempt) => attempt.isBlank).length;
    final incorrect = attempts.length - correct - blank;
    final percentage = attempts.isEmpty ? 0.0 : correct / attempts.length;
    final xp = (correct * 10) + 20 + (percentage >= 0.8 ? 10 : 0);
    final coins = (correct * 2) + 5;

    return QuizResult(
      attempts: attempts,
      correct: correct,
      incorrect: incorrect,
      blank: blank,
      points: correct.toDouble(),
      percentage: percentage,
      xpEarned: xp,
      coinsEarned: coins,
      completedAt: DateTime.now(),
    );
  }

  PlayerProfile applyResult({
    required PlayerProfile profile,
    required QuizResult result,
  }) {
    final updatedXp = profile.xp + result.xpEarned;
    final updatedLevel = sqrt(updatedXp / 100).floor() + 1;
    final updatedCoins = profile.coins + result.coinsEarned;
    final today = DateTime.now();
    final streak = _nextStreak(
      current: profile.currentStreak,
      lastActivity: profile.lastValidActivityDate,
      today: today,
    );

    return profile.copyWith(
      xp: updatedXp,
      level: updatedLevel,
      coins: updatedCoins,
      currentStreak: streak,
      bestStreak: max(profile.bestStreak, streak),
      totalQuestions: profile.totalQuestions + result.attempts.length,
      correctAnswers: profile.correctAnswers + result.correct,
      testsCompleted: profile.testsCompleted + 1,
      lastValidActivityDate: today,
    );
  }

  int _nextStreak({
    required int current,
    required DateTime? lastActivity,
    required DateTime today,
  }) {
    if (lastActivity == null) return 1;
    final currentDay = DateTime(today.year, today.month, today.day);
    final lastDay = DateTime(
      lastActivity.year,
      lastActivity.month,
      lastActivity.day,
    );
    final days = currentDay.difference(lastDay).inDays;
    if (days == 0) return current;
    if (days == 1) return current + 1;
    return 1;
  }
}

