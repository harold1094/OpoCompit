import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/domain/player_profile.dart';
import '../../../core/domain/territory.dart';
import '../../onboarding/domain/onboarding_options.dart';
import '../../quiz/application/question_filter.dart';
import '../../quiz/application/scoring_service.dart';
import '../../quiz/data/seed_questions.dart';
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
      activeQuestions: const [],
      selectedAnswers: const {},
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
    );
  }

  void answerQuestion(String questionId, String? answerId) {
    state = state.copyWith(
      selectedAnswers: {
        ...state.selectedAnswers,
        questionId: answerId,
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

    state = state.copyWith(
      profile: updatedProfile,
      lastResult: result,
    );
    _saveProfile();
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

    state = state.copyWith(profile: profile);
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
      }),
    );
  }
}
