class UserQuestionStat {
  const UserQuestionStat({
    required this.questionId,
    required this.timesSeen,
    required this.correctCount,
    required this.incorrectCount,
    required this.blankCount,
    required this.lastAnswerId,
    required this.lastAnsweredAt,
  });

  factory UserQuestionStat.first({
    required String questionId,
    required String? answerId,
    required bool isCorrect,
    required bool isBlank,
    required DateTime answeredAt,
  }) {
    return UserQuestionStat(
      questionId: questionId,
      timesSeen: 1,
      correctCount: isCorrect ? 1 : 0,
      incorrectCount: !isCorrect && !isBlank ? 1 : 0,
      blankCount: isBlank ? 1 : 0,
      lastAnswerId: answerId,
      lastAnsweredAt: answeredAt,
    );
  }

  final String questionId;
  final int timesSeen;
  final int correctCount;
  final int incorrectCount;
  final int blankCount;
  final String? lastAnswerId;
  final DateTime lastAnsweredAt;

  double get personalAccuracy {
    if (timesSeen == 0) return 0;
    return correctCount / timesSeen;
  }

  bool get needsReview => incorrectCount > 0 || blankCount > 0;

  UserQuestionStat recordAttempt({
    required String? answerId,
    required bool isCorrect,
    required bool isBlank,
    required DateTime answeredAt,
  }) {
    return UserQuestionStat(
      questionId: questionId,
      timesSeen: timesSeen + 1,
      correctCount: correctCount + (isCorrect ? 1 : 0),
      incorrectCount: incorrectCount + (!isCorrect && !isBlank ? 1 : 0),
      blankCount: blankCount + (isBlank ? 1 : 0),
      lastAnswerId: answerId,
      lastAnsweredAt: answeredAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'timesSeen': timesSeen,
      'correctCount': correctCount,
      'incorrectCount': incorrectCount,
      'blankCount': blankCount,
      'lastAnswerId': lastAnswerId,
      'lastAnsweredAt': lastAnsweredAt.toIso8601String(),
    };
  }

  static UserQuestionStat fromJson(Map<String, dynamic> json) {
    return UserQuestionStat(
      questionId: json['questionId'] as String,
      timesSeen: json['timesSeen'] as int,
      correctCount: json['correctCount'] as int,
      incorrectCount: json['incorrectCount'] as int,
      blankCount: json['blankCount'] as int,
      lastAnswerId: json['lastAnswerId'] as String?,
      lastAnsweredAt: DateTime.parse(json['lastAnsweredAt'] as String),
    );
  }
}

