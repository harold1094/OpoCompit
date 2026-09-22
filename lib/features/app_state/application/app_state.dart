import '../../../core/domain/player_profile.dart';
import '../../../core/domain/daily_reward.dart';
import '../../../core/domain/duel.dart';
import '../../../core/domain/mission.dart';
import '../../../core/domain/question.dart';
import '../../../core/domain/quiz_result.dart';
import '../../../core/domain/user_question_stat.dart';

class AppState {
  const AppState({
    this.profile,
    this.activeQuestions = const [],
    this.selectedAnswers = const {},
    this.questionStats = const {},
    this.dailyReward,
    this.missions = const [],
    this.friendIds = const {},
    this.activeDuelOpponentId,
    this.lastDuelResult,
    this.lastResult,
  });

  final PlayerProfile? profile;
  final List<Question> activeQuestions;
  final Map<String, String?> selectedAnswers;
  final Map<String, UserQuestionStat> questionStats;
  final DailyReward? dailyReward;
  final List<Mission> missions;
  final Set<String> friendIds;
  final String? activeDuelOpponentId;
  final DuelResult? lastDuelResult;
  final QuizResult? lastResult;

  bool get hasProfile => profile != null;

  AppState copyWith({
    PlayerProfile? profile,
    List<Question>? activeQuestions,
    Map<String, String?>? selectedAnswers,
    Map<String, UserQuestionStat>? questionStats,
    DailyReward? dailyReward,
    List<Mission>? missions,
    Set<String>? friendIds,
    String? activeDuelOpponentId,
    DuelResult? lastDuelResult,
    QuizResult? lastResult,
    bool clearLastResult = false,
    bool clearDuel = false,
  }) {
    return AppState(
      profile: profile ?? this.profile,
      activeQuestions: activeQuestions ?? this.activeQuestions,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      questionStats: questionStats ?? this.questionStats,
      dailyReward: dailyReward ?? this.dailyReward,
      missions: missions ?? this.missions,
      friendIds: friendIds ?? this.friendIds,
      activeDuelOpponentId:
          clearDuel ? null : activeDuelOpponentId ?? this.activeDuelOpponentId,
      lastDuelResult: clearDuel ? null : lastDuelResult ?? this.lastDuelResult,
      lastResult: clearLastResult ? null : lastResult ?? this.lastResult,
    );
  }
}
