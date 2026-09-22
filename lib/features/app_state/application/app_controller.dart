import 'dart:convert';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/domain/answer_submission.dart';
import '../../../core/domain/daily_reward.dart';
import '../../../core/domain/duel.dart';
import '../../../core/domain/mission.dart';
import '../../../core/domain/player_profile.dart';
import '../../../core/domain/quiz_result.dart';
import '../../../core/domain/territory.dart';
import '../../../core/domain/user_question_stat.dart';
import '../../onboarding/domain/onboarding_options.dart';
import '../../quiz/application/question_filter.dart';
import '../../quiz/application/scoring_service.dart';
import '../../quiz/data/seed_questions.dart';
import '../../social/data/social_seed_profiles.dart';
import 'app_state.dart';

final appControllerProvider =
    StateNotifierProvider<AppController, AppState>((ref) {
  return AppController();
});

class AppController extends StateNotifier<AppState> {
  AppController()
      : _filter = const QuestionFilter(),
        _scoring = const ScoringService(),
        super(const AppState()) {
    _restoreProfile();
  }

  static const _profileKey = 'opocompit.local_profile';
  final QuestionFilter _filter;
  final ScoringService _scoring;

  void startGuest(TerritorySelection territory) {
    state = state.copyWith(
      profile: PlayerProfile.guest(
        oppositionId: firefighterOppositionId,
        oppositionName: firefighterOppositionName,
        territory: territory,
      ),
      dailyReward: _initialDailyReward(),
      missions: _initialMissions(),
      activeQuestions: const [],
      selectedAnswers: const {},
      questionStats: const {},
    );
    _saveProfile();
  }

  void startQuickMatch() {
    final profile = state.profile;
    if (profile == null) return;
    final questions = _filter.eligibleForQuickMatch(
      profile: profile,
      questions: seedQuestions,
      limit: 10,
    );
    state = state.copyWith(
      activeQuestions: questions,
      selectedAnswers: {
        for (final question in questions) question.id: null,
      },
      clearLastResult: true,
      clearDuel: true,
    );
  }

  void startClassicDuel(String opponentId) {
    final profile = state.profile;
    if (profile == null) return;
    final questions = _filter.eligibleForQuickMatch(
      profile: profile,
      questions: seedQuestions,
      limit: 10,
    );
    state = state.copyWith(
      activeQuestions: questions,
      selectedAnswers: {
        for (final question in questions) question.id: null,
      },
      activeDuelOpponentId: opponentId,
      clearLastResult: true,
    );
  }

  void answerQuestion(String questionId, String? answerId) {
    state = state.copyWith(
      selectedAnswers: {
        ...state.selectedAnswers,
        questionId: answerId ?? blankAnswerId,
      },
    );
  }

  void finishQuickMatch() {
    final profile = state.profile;
    if (profile == null) return;

    final result = _scoring.scoreQuickMatch(
      questions: state.activeQuestions,
      selectedAnswers: state.selectedAnswers,
    );
    final updatedProfile = _scoring.applyResult(
      profile: profile,
      result: result,
    );
    final updatedStats = _applyQuestionStats(result);
    final updatedMissions = _progressMissions(result);
    final duelResult = _buildDuelResult(result);

    state = state.copyWith(
      profile: updatedProfile,
      questionStats: updatedStats,
      missions: updatedMissions,
      lastDuelResult: duelResult,
      lastResult: result,
    );
    _saveProfile();
  }

  void claimDailyReward() {
    final profile = state.profile;
    final reward = state.dailyReward;
    if (profile == null || reward == null || reward.claimed) return;

    state = state.copyWith(
      profile: profile.copyWith(
        coins: profile.coins + reward.coins,
        gems: profile.gems + reward.gems,
      ),
      dailyReward: reward.copyWith(claimed: true),
    );
    _saveProfile();
  }

  void claimMission(String missionId) {
    final profile = state.profile;
    if (profile == null) return;

    var earnedXp = 0;
    var earnedCoins = 0;
    final missions = state.missions.map((mission) {
      if (mission.id != missionId || !mission.rewardReady) return mission;
      earnedXp += mission.rewardXp;
      earnedCoins += mission.rewardCoins;
      return mission.copyWith(claimed: true);
    }).toList();

    if (earnedXp == 0 && earnedCoins == 0) return;
    final newXp = profile.xp + earnedXp;
    final newLevel = sqrt(newXp / 100).floor() + 1;

    state = state.copyWith(
      profile: profile.copyWith(
        xp: newXp,
        level: newLevel,
        coins: profile.coins + earnedCoins,
      ),
      missions: missions,
    );
    _saveProfile();
  }

  void addFriend(String uid) {
    state = state.copyWith(
      friendIds: {
        ...state.friendIds,
        uid,
      },
    );
    _saveProfile();
  }

  void removeFriend(String uid) {
    final updated = {...state.friendIds}..remove(uid);
    state = state.copyWith(friendIds: updated);
    _saveProfile();
  }

  void startErrorReview() {
    final profile = state.profile;
    if (profile == null) return;

    final reviewQuestionIds = state.questionStats.values
        .where((stat) => stat.needsReview)
        .map((stat) => stat.questionId)
        .toSet();
    final questions = seedQuestions
        .where(
          (question) =>
              question.oppositionId == profile.oppositionId &&
              reviewQuestionIds.contains(question.id),
        )
        .take(10)
        .toList();

    state = state.copyWith(
      activeQuestions: questions,
      selectedAnswers: {
        for (final question in questions) question.id: null,
      },
      clearLastResult: true,
    );
  }

  Map<String, UserQuestionStat> _applyQuestionStats(QuizResult result) {
    final updated = Map<String, UserQuestionStat>.from(state.questionStats);
    for (final attempt in result.attempts) {
      final existing = updated[attempt.question.id];
      if (existing == null) {
        updated[attempt.question.id] = UserQuestionStat.first(
          questionId: attempt.question.id,
          answerId: attempt.selectedAnswerId,
          isCorrect: attempt.isCorrect,
          isBlank: attempt.isBlank,
          answeredAt: result.completedAt,
        );
      } else {
        updated[attempt.question.id] = existing.recordAttempt(
          answerId: attempt.selectedAnswerId,
          isCorrect: attempt.isCorrect,
          isBlank: attempt.isBlank,
          answeredAt: result.completedAt,
        );
      }
    }
    return updated;
  }

  List<Mission> _progressMissions(QuizResult result) {
    return state.missions.map((mission) {
      final increment = switch (mission.type) {
        MissionType.answerQuestions => result.attempts.length,
        MissionType.completeQuickMatches => 1,
        MissionType.correctAnswers => result.correct,
        MissionType.reviewErrors => 0,
      };
      return mission.copyWith(
        progress: (mission.progress + increment).clamp(0, mission.target),
      );
    }).toList();
  }

  DuelResult? _buildDuelResult(QuizResult result) {
    final opponentId = state.activeDuelOpponentId;
    if (opponentId == null) return null;

    var opponent = socialSeedProfiles.first;
    var foundOpponent = false;
    for (final profile in socialSeedProfiles) {
      if (profile.uid == opponentId) {
        opponent = profile;
        foundOpponent = true;
        break;
      }
    }
    if (!foundOpponent) return null;

    final opponentCorrect = ((opponent.xp ~/ 250) + 2)
        .clamp(2, result.attempts.length);
    final playerTime = 120 + (result.incorrect * 8) + (result.blank * 5);
    final opponentTime = 145 - opponent.level;

    return DuelResult(
      opponent: opponent,
      questions: state.activeQuestions,
      playerResult: result,
      opponentCorrect: opponentCorrect,
      opponentTimeSeconds: opponentTime,
      playerTimeSeconds: playerTime,
    );
  }

  Future<void> _restoreProfile() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_profileKey);
    if (raw == null) return;

    final json = jsonDecode(raw) as Map<String, dynamic>;
    final territoryJson = json['territory'] as Map<String, dynamic>;
    final profile = PlayerProfile(
      uid: json['uid'] as String,
      username: json['username'] as String,
      isGuest: json['isGuest'] as bool,
      oppositionId: json['oppositionId'] as String,
      oppositionName: json['oppositionName'] as String,
      territory: TerritorySelection(
        label: territoryJson['label'] as String,
        country: territoryJson['country'] as String,
        autonomousCommunity: territoryJson['autonomousCommunity'] as String?,
        province: territoryJson['province'] as String?,
        municipality: territoryJson['municipality'] as String?,
        specificBody: territoryJson['specificBody'] as String?,
      ),
      xp: json['xp'] as int,
      level: json['level'] as int,
      coins: json['coins'] as int,
      gems: json['gems'] as int,
      currentStreak: json['currentStreak'] as int,
      bestStreak: json['bestStreak'] as int,
      totalQuestions: json['totalQuestions'] as int,
      correctAnswers: json['correctAnswers'] as int,
      testsCompleted: json['testsCompleted'] as int,
      lastValidActivityDate: json['lastValidActivityDate'] == null
          ? null
          : DateTime.parse(json['lastValidActivityDate'] as String),
    );

    final statsJson = json['questionStats'] as List<dynamic>? ?? [];
    final stats = <String, UserQuestionStat>{};
    for (final item in statsJson) {
      final stat = UserQuestionStat.fromJson(item as Map<String, dynamic>);
      stats[stat.questionId] = stat;
    }

    state = state.copyWith(
      profile: profile,
      questionStats: stats,
      dailyReward: _restoreDailyReward(json),
      missions: _restoreMissions(json),
      friendIds: {
        for (final id in json['friendIds'] as List<dynamic>? ?? [])
          id as String,
      },
    );
  }

  Future<void> _saveProfile() async {
    final profile = state.profile;
    if (profile == null) return;

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _profileKey,
      jsonEncode({
        'uid': profile.uid,
        'username': profile.username,
        'isGuest': profile.isGuest,
        'oppositionId': profile.oppositionId,
        'oppositionName': profile.oppositionName,
        'territory': {
          'label': profile.territory.label,
          'country': profile.territory.country,
          'autonomousCommunity': profile.territory.autonomousCommunity,
          'province': profile.territory.province,
          'municipality': profile.territory.municipality,
          'specificBody': profile.territory.specificBody,
        },
        'xp': profile.xp,
        'level': profile.level,
        'coins': profile.coins,
        'gems': profile.gems,
        'currentStreak': profile.currentStreak,
        'bestStreak': profile.bestStreak,
        'totalQuestions': profile.totalQuestions,
        'correctAnswers': profile.correctAnswers,
        'testsCompleted': profile.testsCompleted,
        'lastValidActivityDate':
            profile.lastValidActivityDate?.toIso8601String(),
        'questionStats': state.questionStats.values
            .map((stat) => stat.toJson())
            .toList(),
        'dailyReward': {
          'day': state.dailyReward?.day ?? 1,
          'coins': state.dailyReward?.coins ?? 25,
          'gems': state.dailyReward?.gems ?? 0,
          'claimed': state.dailyReward?.claimed ?? false,
        },
        'missions': state.missions
            .map(
              (mission) => {
                'id': mission.id,
                'progress': mission.progress,
                'claimed': mission.claimed,
              },
            )
            .toList(),
        'friendIds': state.friendIds.toList(),
      }),
    );
  }

  DailyReward _initialDailyReward() {
    return const DailyReward(
      day: 1,
      coins: 25,
      gems: 0,
      claimed: false,
    );
  }

  List<Mission> _initialMissions() {
    return const [
      Mission(
        id: 'daily_complete_quick',
        title: 'Primera partida del día',
        description: 'Completa una partida rápida.',
        type: MissionType.completeQuickMatches,
        target: 1,
        rewardXp: 20,
        rewardCoins: 10,
        progress: 0,
        claimed: false,
      ),
      Mission(
        id: 'daily_30_questions',
        title: 'Calienta motores',
        description: 'Responde 30 preguntas.',
        type: MissionType.answerQuestions,
        target: 30,
        rewardXp: 30,
        rewardCoins: 15,
        progress: 0,
        claimed: false,
      ),
      Mission(
        id: 'daily_15_correct',
        title: 'Precisión útil',
        description: 'Consigue 15 respuestas correctas.',
        type: MissionType.correctAnswers,
        target: 15,
        rewardXp: 35,
        rewardCoins: 20,
        progress: 0,
        claimed: false,
      ),
    ];
  }

  DailyReward _restoreDailyReward(Map<String, dynamic> json) {
    final rewardJson = json['dailyReward'] as Map<String, dynamic>?;
    if (rewardJson == null) return _initialDailyReward();
    return DailyReward(
      day: rewardJson['day'] as int,
      coins: rewardJson['coins'] as int,
      gems: rewardJson['gems'] as int,
      claimed: rewardJson['claimed'] as bool,
    );
  }

  List<Mission> _restoreMissions(Map<String, dynamic> json) {
    final saved = {
      for (final item in json['missions'] as List<dynamic>? ?? [])
        (item as Map<String, dynamic>)['id'] as String: item,
    };

    return _initialMissions().map((mission) {
      final savedMission = saved[mission.id];
      if (savedMission == null) return mission;
      return mission.copyWith(
        progress: savedMission['progress'] as int,
        claimed: savedMission['claimed'] as bool,
      );
    }).toList();
  }
}
