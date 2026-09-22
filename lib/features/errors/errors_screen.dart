import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../../shared/widgets/primary_button.dart';
import '../app_state/application/app_controller.dart';
import '../quiz/data/seed_questions.dart';

class ErrorsScreen extends ConsumerWidget {
  const ErrorsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final stats = state.questionStats.values
        .where((stat) => stat.needsReview)
        .toList()
      ..sort((a, b) => b.incorrectCount.compareTo(a.incorrectCount));

    return GameScaffold(
      title: 'Mis errores',
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(
            'Repasa lo que más puntos te está quitando.',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Aquí aparecen preguntas falladas o dejadas en blanco. Más adelante esto se guardará en Firestore por usuario.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.muted,
                ),
          ),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            label: 'Repasar errores',
            icon: Icons.refresh_rounded,
            onPressed: stats.isEmpty
                ? null
                : () {
                    ref.read(appControllerProvider.notifier).startErrorReview();
                    context.go('/quiz');
                  },
          ),
          const SizedBox(height: AppSpacing.lg),
          if (stats.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle_rounded,
                      color: AppColors.success,
                      size: 42,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Aún no tienes errores guardados.',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    const Text(
                      'Juega una partida y esta sección se llenará automáticamente.',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            ...stats.map((stat) {
              var question = seedQuestions.first;
              var foundQuestion = false;
              for (final item in seedQuestions) {
                if (item.id == stat.questionId) {
                  question = item;
                  foundQuestion = true;
                  break;
                }
              }
              if (!foundQuestion) return const SizedBox.shrink();

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.error_rounded,
                            color: AppColors.danger,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              question.categoryId,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(
                                    color: AppColors.muted,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                          ),
                          Text(
                            '${(stat.personalAccuracy * 100).round()}%',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  color: AppColors.danger,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        question.statement,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Vista ${stat.timesSeen} veces · ${stat.incorrectCount} fallos · ${stat.blankCount} en blanco',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.muted,
                            ),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
