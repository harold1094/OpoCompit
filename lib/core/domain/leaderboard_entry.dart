class LeaderboardEntry {
  const LeaderboardEntry({
    required this.uid,
    required this.username,
    required this.level,
    required this.xp,
    required this.territoryLabel,
    required this.isCurrentUser,
  });

  final String uid;
  final String username;
  final int level;
  final int xp;
  final String territoryLabel;
  final bool isCurrentUser;
}

