import '../../../core/domain/player_profile.dart';
import '../../../core/domain/question.dart';
import '../../../core/domain/quiz_result.dart';

class AppState {
  const AppState({
    this.profile,
    this.activeQuestions = const [],
    this.selectedAnswers = const {},
    this.lastResult,
  });

  final PlayerProfile? profile;
  final List<Question> activeQuestions;
  final Map<String, String?> selectedAnswers;
  final QuizResult? lastResult;

  bool get hasProfile => profile != null;

  AppState copyWith({
    PlayerProfile? profile,
    List<Question>? activeQuestions,
    Map<String, String?>? selectedAnswers,
    QuizResult? lastResult,
    bool clearLastResult = false,
  }) {
    return AppState(
      profile: profile ?? this.profile,
      activeQuestions: activeQuestions ?? this.activeQuestions,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      lastResult: clearLastResult ? null : lastResult ?? this.lastResult,
    );
  }
}
