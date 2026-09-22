import 'package:flutter_test/flutter_test.dart';
import 'package:opocompit/core/domain/user_question_stat.dart';

void main() {
  test('question stats track incorrect answers and review eligibility', () {
    final now = DateTime(2026, 9, 22);
    final stat = UserQuestionStat.first(
      questionId: 'q1',
      answerId: 'b',
      isCorrect: false,
      isBlank: false,
      answeredAt: now,
    );

    expect(stat.timesSeen, 1);
    expect(stat.incorrectCount, 1);
    expect(stat.needsReview, isTrue);

    final updated = stat.recordAttempt(
      answerId: 'a',
      isCorrect: true,
      isBlank: false,
      answeredAt: now.add(const Duration(minutes: 1)),
    );

    expect(updated.timesSeen, 2);
    expect(updated.correctCount, 1);
    expect(updated.personalAccuracy, 0.5);
  });
}

