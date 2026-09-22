import '../../../core/domain/player_profile.dart';
import '../../../core/domain/question.dart';

class QuestionFilter {
  const QuestionFilter();

  List<Question> eligibleForQuickMatch({
    required PlayerProfile profile,
    required List<Question> questions,
    int limit = 10,
  }) {
    final userKeys = profile.territory.territoryKeys.toSet();
    final eligible = questions.where((question) {
      if (question.oppositionId != profile.oppositionId) return false;
      return question.territoryKeys.any(userKeys.contains);
    }).toList()
      ..sort((a, b) {
        final difficulty = a.difficulty.compareTo(b.difficulty);
        if (difficulty != 0) return difficulty;
        return a.id.compareTo(b.id);
      });

    return eligible.take(limit).toList();
  }
}

