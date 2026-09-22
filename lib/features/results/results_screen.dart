import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/stat_card.dart';
import '../app_state/application/app_controller.dart';

class ResultsScreen extends ConsumerWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final result = ref.watch(appControllerProvider).lastResult;

    if (result == null) {
      return GameScaffold(
        title: 'Resultado',
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: PrimaryButton(
              label: 'Volver al inicio',
              onPressed: () => context.go('/home'),
            ),
          ),
        ),
      );
    }

    return GameScaffold(
      title: 'Resultado',
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.ink,
              borderRadius: BorderRadius.circular(32),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${(result.percentage * 100).round()}%',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '+${result.xpEarned} XP · +${result.coinsEarned} coins',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.gold,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Has terminado una partida válida. La racha se actualiza en el perfil.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white70,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  label: 'Aciertos',
                  value: '${result.correct}',
                  accent: AppColors.success,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatCard(
                  label: 'Errores',
                  value: '${result.incorrect}',
                  accent: AppColors.danger,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  label: 'Blanco',
                  value: '${result.blank}',
                  accent: AppColors.muted,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatCard(
                  label: 'Nota',
                  value: result.points.toStringAsFixed(1),
                  accent: AppColors.brand,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            label: 'Otra partida',
            onPressed: () {
              ref.read(appControllerProvider.notifier).startQuickMatch();
              context.go('/quiz');
            },
          ),
          const SizedBox(height: AppSpacing.md),
          OutlinedButton(
            onPressed: () => context.go('/home'),
            child: const Text('Volver a inicio'),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'Revisión',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          ...result.attempts.map(
            (attempt) {
              String? selected;
              for (final answer in attempt.question.answers) {
                if (answer.id == attempt.selectedAnswerId) {
                  selected = answer.text;
                  break;
                }
              }
              final correct = attempt.question.answers
                  .firstWhere((answer) => answer.id == attempt.question.correctAnswerId)
                  .text;

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            attempt.isCorrect
                                ? Icons.check_circle_rounded
                                : attempt.isBlank
                                    ? Icons.remove_circle_rounded
                                    : Icons.cancel_rounded,
                            color: attempt.isCorrect
                                ? AppColors.success
                                : attempt.isBlank
                                    ? AppColors.muted
                                    : AppColors.danger,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              attempt.question.categoryId,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(
                                    color: AppColors.muted,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        attempt.question.statement,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text('Tu respuesta: ${selected ?? 'En blanco'}'),
                      Text('Correcta: $correct'),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        attempt.question.explanation,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.muted,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Fuente: ${attempt.question.source}',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
