class DailyReward {
  const DailyReward({
    required this.day,
    required this.coins,
    required this.gems,
    required this.claimed,
  });

  final int day;
  final int coins;
  final int gems;
  final bool claimed;

  DailyReward copyWith({
    int? day,
    int? coins,
    int? gems,
    bool? claimed,
  }) {
    return DailyReward(
      day: day ?? this.day,
      coins: coins ?? this.coins,
      gems: gems ?? this.gems,
      claimed: claimed ?? this.claimed,
    );
  }
}

