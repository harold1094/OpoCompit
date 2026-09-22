import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/stat_card.dart';
import '../app_state/application/app_controller.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final profile = state.profile;
    final dailyReward = state.dailyReward;
    final missions = state.missions;

    if (profile == null) {
      return GameScaffold(
        showNav: false,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: PrimaryButton(
              label: 'Configurar jugador',
              onPressed: () => context.go('/onboarding'),
            ),
          ),
        ),
      );
    }

    final nextLevelXp = profile.level * profile.level * 100;
    final progress = nextLevelXp == 0 ? 0.0 : profile.xp / nextLevelXp;

    return GameScaffold(
      title: 'Inicio',
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFFF2E7), Color(0xFFE9FFFB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 32,
                      backgroundColor: AppColors.brand,
                      child: Icon(
                        Icons.local_fire_department_rounded,
                        color: Colors.white,
                        size: 34,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            profile.username,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                          Text(
                            '${profile.oppositionName} · ${profile.territory.label}',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: AppColors.muted),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '🔥 ${profile.currentStreak}',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'Nivel ${profile.level}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    minHeight: 12,
                    value: progress.clamp(0, 1),
                    backgroundColor: Colors.white,
                    color: AppColors.aqua,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '${profile.xp} XP · ${profile.coins} coins',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.muted,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          PrimaryButton(
            label: 'JUGAR',
            icon: Icons.sports_esports_rounded,
            onPressed: () {
              ref.read(appControllerProvider.notifier).startQuickMatch();
              context.go('/quiz');
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  label: 'Preguntas',
                  value: '${profile.totalQuestions}',
                  accent: AppColors.brand,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatCard(
                  label: 'Precisión',
                  value: '${(profile.accuracy * 100).round()}%',
                  accent: AppColors.aqua,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Misiones',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          ...missions.map(
            (mission) => Card(
              child: ListTile(
                leading: Icon(
                  mission.claimed
                      ? Icons.check_circle_rounded
                      : Icons.flag_rounded,
                  color: mission.claimed
                      ? AppColors.success
                      : mission.rewardReady
                          ? AppColors.gold
                          : AppColors.muted,
                ),
                title: Text(mission.title),
                subtitle: Text(
                  '${mission.description} ${mission.progress}/${mission.target}',
                ),
                trailing: mission.claimed
                    ? const Text('Hecha')
                    : mission.rewardReady
                        ? FilledButton(
                            onPressed: () => ref
                                .read(appControllerProvider.notifier)
                                .claimMission(mission.id),
                            child: const Text('Cobrar'),
                          )
                        : Text('+${mission.rewardXp} XP'),
              ),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(
                Icons.psychology_alt_rounded,
                color: AppColors.danger,
              ),
              title: const Text('Mis errores'),
              subtitle: const Text('Repasa fallos y blancos guardados.'),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.go('/errors'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(
                Icons.sports_mma_rounded,
                color: AppColors.brand,
              ),
              title: const Text('Duelos'),
              subtitle: const Text('Reta a un amigo en duelo clásico.'),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.go('/duels'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(
                Icons.tune_rounded,
                color: AppColors.aqua,
              ),
              title: const Text('Cambiar territorio'),
              subtitle: const Text('Reconfigura el perfil invitado.'),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.go('/onboarding'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(
                Icons.card_giftcard_rounded,
                color: AppColors.brand,
              ),
              title: const Text('Recompensa diaria'),
              subtitle: Text(
                dailyReward == null
                    ? 'Configura tu jugador para activarla.'
                    : 'Día ${dailyReward.day}: ${dailyReward.coins} coins'
                        '${dailyReward.gems > 0 ? ' · ${dailyReward.gems} gemas' : ''}',
              ),
              trailing: dailyReward == null || dailyReward.claimed
                  ? const Text('Cobrada')
                  : FilledButton(
                      onPressed: () => ref
                          .read(appControllerProvider.notifier)
                          .claimDailyReward(),
                      child: const Text('Cobrar'),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
