import 'package:flutter_test/flutter_test.dart';
import 'package:opocompit/features/onboarding/domain/onboarding_options.dart';
import 'package:opocompit/features/quiz/application/question_filter.dart';
import 'package:opocompit/features/quiz/data/seed_questions.dart';
import 'package:opocompit/core/domain/player_profile.dart';

void main() {
  test('Cartagena quick match excludes Madrid territorial questions', () {
    final profile = PlayerProfile.guest(
      oppositionId: firefighterOppositionId,
      oppositionName: firefighterOppositionName,
      territory: availableTerritories[2],
    );

    final questions = const QuestionFilter().eligibleForQuickMatch(
      profile: profile,
      questions: seedQuestions,
      limit: 20,
    );

    expect(questions.map((question) => question.id), isNot(contains('q_madrid_excluded')));
    expect(questions.map((question) => question.id), contains('q_cartagena_1'));
  });
}

