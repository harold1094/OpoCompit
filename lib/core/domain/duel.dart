import 'question.dart';
import 'quiz_result.dart';
import 'social_profile.dart';

enum DuelOutcome {
  win,
  loss,
  draw,
}

class DuelResult {
  const DuelResult({
    required this.opponent,
    required this.questions,
    required this.playerResult,
    required this.opponentCorrect,
    required this.opponentTimeSeconds,
    required this.playerTimeSeconds,
  });

  final SocialProfile opponent;
  final List<Question> questions;
  final QuizResult playerResult;
  final int opponentCorrect;
  final int opponentTimeSeconds;
  final int playerTimeSeconds;

  DuelOutcome get outcome {
    if (playerResult.correct > opponentCorrect) return DuelOutcome.win;
    if (playerResult.correct < opponentCorrect) return DuelOutcome.loss;
    if (playerTimeSeconds < opponentTimeSeconds) return DuelOutcome.win;
    if (playerTimeSeconds > opponentTimeSeconds) return DuelOutcome.loss;
    return DuelOutcome.draw;
  }
}

