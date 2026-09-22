import 'territory.dart';

class PlayerProfile {
  const PlayerProfile({
    required this.uid,
    required this.username,
    required this.isGuest,
    required this.oppositionId,
    required this.oppositionName,
    required this.territory,
    required this.xp,
    required this.level,
    required this.coins,
    required this.gems,
    required this.currentStreak,
    required this.bestStreak,
    required this.totalQuestions,
    required this.correctAnswers,
    required this.testsCompleted,
    this.lastValidActivityDate,
  });

  factory PlayerProfile.guest({
    required String oppositionId,
    required String oppositionName,
    required TerritorySelection territory,
  }) {
    return PlayerProfile(
      uid: 'local_guest',
      username: 'Invitado',
      isGuest: true,
      oppositionId: oppositionId,
      oppositionName: oppositionName,
      territory: territory,
      xp: 0,
      level: 1,
      coins: 0,
      gems: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      testsCompleted: 0,
    );
  }

  final String uid;
  final String username;
  final bool isGuest;
  final String oppositionId;
  final String oppositionName;
  final TerritorySelection territory;
  final int xp;
  final int level;
  final int coins;
  final int gems;
  final int currentStreak;
  final int bestStreak;
  final int totalQuestions;
  final int correctAnswers;
  final int testsCompleted;
  final DateTime? lastValidActivityDate;

  double get accuracy {
    if (totalQuestions == 0) return 0;
    return correctAnswers / totalQuestions;
  }

  PlayerProfile copyWith({
    String? username,
    bool? isGuest,
    String? oppositionId,
    String? oppositionName,
    TerritorySelection? territory,
    int? xp,
    int? level,
    int? coins,
    int? gems,
    int? currentStreak,
    int? bestStreak,
    int? totalQuestions,
    int? correctAnswers,
    int? testsCompleted,
    DateTime? lastValidActivityDate,
  }) {
    return PlayerProfile(
      uid: uid,
      username: username ?? this.username,
      isGuest: isGuest ?? this.isGuest,
      oppositionId: oppositionId ?? this.oppositionId,
      oppositionName: oppositionName ?? this.oppositionName,
      territory: territory ?? this.territory,
      xp: xp ?? this.xp,
      level: level ?? this.level,
      coins: coins ?? this.coins,
      gems: gems ?? this.gems,
      currentStreak: currentStreak ?? this.currentStreak,
      bestStreak: bestStreak ?? this.bestStreak,
      totalQuestions: totalQuestions ?? this.totalQuestions,
      correctAnswers: correctAnswers ?? this.correctAnswers,
      testsCompleted: testsCompleted ?? this.testsCompleted,
      lastValidActivityDate:
          lastValidActivityDate ?? this.lastValidActivityDate,
    );
  }
}

