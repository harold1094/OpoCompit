import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/stat_card.dart';
import '../app_state/application/app_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(appControllerProvider).profile;

    if (profile == null) {
      return GameScaffold(
        title: 'Perfil',
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: PrimaryButton(
              label: 'Crear perfil invitado',
              onPressed: () => context.go('/onboarding'),
            ),
          ),
        ),
      );
    }

    return GameScaffold(
      title: 'Perfil',
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                children: [
                  const CircleAvatar(
                    radius: 46,
                    backgroundColor: AppColors.brand,
                    child: Icon(
                      Icons.local_fire_department_rounded,
                      color: Colors.white,
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    profile.username,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  Text(
                    '${profile.oppositionName} · ${profile.territory.label}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.muted,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  FilledButton.tonalIcon(
                    onPressed: null,
                    icon: const Icon(Icons.link_rounded),
                    label: const Text('Guardar cuenta pronto'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  label: 'Nivel',
                  value: '${profile.level}',
                  accent: AppColors.brand,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatCard(
                  label: 'XP',
                  value: '${profile.xp}',
                  accent: AppColors.aqua,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  label: 'Racha',
                  value: '🔥 ${profile.currentStreak}',
                  accent: AppColors.gold,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatCard(
                  label: 'Mejor',
                  value: '🔥 ${profile.bestStreak}',
                  accent: AppColors.gold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  label: 'Preguntas',
                  value: '${profile.totalQuestions}',
                  accent: AppColors.ink,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatCard(
                  label: 'Precisión',
                  value: '${(profile.accuracy * 100).round()}%',
                  accent: AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Card(
            child: ListTile(
              leading: const Icon(Icons.emoji_events_rounded,
                  color: AppColors.gold,
              ),
              title: const Text('Logros'),
              subtitle: Text(
                profile.testsCompleted > 0
                    ? 'Primera partida completada'
                    : 'Completa tu primera partida',
              ),
            ),
          ),
          const Card(
            child: ListTile(
              leading: Icon(Icons.group_rounded, color: AppColors.aqua),
              title: Text('Social'),
              subtitle: Text('Amigos, grupos y rankings entran en la siguiente fase.'),
            ),
          ),
        ],
      ),
    );
  }
}
