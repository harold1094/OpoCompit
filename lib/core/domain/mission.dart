enum MissionType {
  answerQuestions,
  completeQuickMatches,
  correctAnswers,
  reviewErrors,
}

class Mission {
  const Mission({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.target,
    required this.rewardXp,
    required this.rewardCoins,
    required this.progress,
    required this.claimed,
  });

  final String id;
  final String title;
  final String description;
  final MissionType type;
  final int target;
  final int rewardXp;
  final int rewardCoins;
  final int progress;
  final bool claimed;

  bool get completed => progress >= target;
  bool get rewardReady => completed && !claimed;

  Mission copyWith({
    int? progress,
    bool? claimed,
  }) {
    return Mission(
      id: id,
      title: title,
      description: description,
      type: type,
      target: target,
      rewardXp: rewardXp,
      rewardCoins: rewardCoins,
      progress: progress ?? this.progress,
      claimed: claimed ?? this.claimed,
    );
  }
}

