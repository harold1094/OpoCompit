import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../app_state/application/app_controller.dart';
import '../social/data/social_seed_profiles.dart';

class DuelsScreen extends ConsumerWidget {
  const DuelsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final friendIds = state.friendIds;
    final availableOpponents = socialSeedProfiles
        .where((profile) => friendIds.contains(profile.uid))
        .toList();

    return GameScaffold(
      title: 'Duelos',
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.ink,
              borderRadius: BorderRadius.circular(30),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Duelo clásico',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '1 vs 1. Mismas preguntas. Gana quien acierta más; si hay empate, gana quien tarde menos.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white70,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (availableOpponents.isEmpty)
            Card(
              child: ListTile(
                leading: const Icon(Icons.group_add_rounded),
                title: const Text('Añade un amigo primero'),
                subtitle: const Text(
                  'Ve a Social y añade un rival para retarlo.',
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => context.go('/social'),
              ),
            )
          else
            ...availableOpponents.map(
              (opponent) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor:
                            AppColors.brand.withValues(alpha: 0.14),
                        child: Text(
                          opponent.username.substring(0, 1),
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: AppColors.brand,
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              opponent.username,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w900),
                            ),
                            Text(
                              '${opponent.territoryLabel} · Nivel ${opponent.level}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(color: AppColors.muted),
                            ),
                          ],
                        ),
                      ),
                      FilledButton.icon(
                        onPressed: () {
                          ref
                              .read(appControllerProvider.notifier)
                              .startClassicDuel(opponent.uid);
                          context.go('/quiz');
                        },
                        icon: const Icon(Icons.sports_mma_rounded),
                        label: const Text('Retar'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

