import 'question.dart';

class QuestionAttempt {
  const QuestionAttempt({
    required this.question,
    required this.selectedAnswerId,
  });

  final Question question;
  final String? selectedAnswerId;

  bool get isBlank => selectedAnswerId == null;
  bool get isCorrect => selectedAnswerId == question.correctAnswerId;
}

class QuizResult {
  const QuizResult({
    required this.attempts,
    required this.correct,
    required this.incorrect,
    required this.blank,
    required this.points,
    required this.percentage,
    required this.xpEarned,
    required this.coinsEarned,
    required this.completedAt,
  });

  final List<QuestionAttempt> attempts;
  final int correct;
  final int incorrect;
  final int blank;
  final double points;
  final double percentage;
  final int xpEarned;
  final int coinsEarned;
  final DateTime completedAt;
}

