import 'answer_option.dart';

class Question {
  const Question({
    required this.id,
    required this.oppositionId,
    required this.statement,
    required this.answers,
    required this.correctAnswerId,
    required this.explanation,
    required this.categoryId,
    required this.difficulty,
    required this.scopeType,
    required this.territoryKeys,
    required this.source,
    this.sourcePage,
    this.officialExamId,
  });

  final String id;
  final String oppositionId;
  final String statement;
  final List<AnswerOption> answers;
  final String correctAnswerId;
  final String explanation;
  final String categoryId;
  final int difficulty;
  final String scopeType;
  final List<String> territoryKeys;
  final String source;
  final int? sourcePage;
  final String? officialExamId;
}

