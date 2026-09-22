import 'package:flutter_test/flutter_test.dart';
import 'package:opocompit/features/quiz/application/scoring_service.dart';
import 'package:opocompit/features/quiz/data/seed_questions.dart';

void main() {
  test('quick match scoring awards XP and coins from raw answers', () {
    final questions = seedQuestions.take(3).toList();
    final answers = {
      questions[0].id: questions[0].correctAnswerId,
      questions[1].id: 'wrong',
      questions[2].id: null,
    };

    final result = const ScoringService().scoreQuickMatch(
      questions: questions,
      selectedAnswers: answers,
    );

    expect(result.correct, 1);
    expect(result.incorrect, 1);
    expect(result.blank, 1);
    expect(result.xpEarned, 30);
    expect(result.coinsEarned, 7);
  });
}

