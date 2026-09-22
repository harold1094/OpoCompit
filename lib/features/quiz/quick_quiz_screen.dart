import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../app_state/application/app_controller.dart';

class QuickQuizScreen extends ConsumerStatefulWidget {
  const QuickQuizScreen({super.key});

  @override
  ConsumerState<QuickQuizScreen> createState() => _QuickQuizScreenState();
}

class _QuickQuizScreenState extends ConsumerState<QuickQuizScreen> {
  var _index = 0;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final questions = state.activeQuestions;

    if (questions.isEmpty) {
      return GameScaffold(
        title: 'Partida rápida',
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: FilledButton.icon(
              onPressed: () {
                ref.read(appControllerProvider.notifier).startQuickMatch();
                setState(() => _index = 0);
              },
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Empezar partida'),
            ),
          ),
        ),
      );
    }

    final question = questions[_index];
    final selectedAnswer = state.selectedAnswers[question.id];
    final progress = (_index + 1) / questions.length;
    final isLast = _index == questions.length - 1;

    return GameScaffold(
      title: 'Partida rápida',
      showNav: false,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Pregunta ${_index + 1}/${questions.length}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => context.go('/home'),
                  child: const Text('Salir'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                minHeight: 12,
                value: progress,
                backgroundColor: Colors.white,
                color: AppColors.brand,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Text(
                  question.statement,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        height: 1.2,
                      ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Expanded(
              child: ListView.separated(
                itemCount: question.answers.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, answerIndex) {
                  final answer = question.answers[answerIndex];
                  final isSelected = selectedAnswer == answer.id;
                  return _AnswerTile(
                    label: answer.text,
                    selected: isSelected,
                    onTap: () => ref
                        .read(appControllerProvider.notifier)
                        .answerQuestion(question.id, answer.id),
                  );
                },
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => ref
                        .read(appControllerProvider.notifier)
                        .answerQuestion(question.id, null),
                    child: const Text('Dejar en blanco'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      if (isLast) {
                        ref
                            .read(appControllerProvider.notifier)
                            .finishQuickMatch();
                        context.go('/results');
                      } else {
                        setState(() => _index += 1);
                      }
                    },
                    child: Text(isLast ? 'Terminar' : 'Siguiente'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AnswerTile extends StatelessWidget {
  const _AnswerTile({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFFFE2D4) : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.brand : AppColors.line,
            width: selected ? 2 : 1,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.brand.withValues(alpha: 0.12),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_off_rounded,
              color: selected ? AppColors.brand : AppColors.muted,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
