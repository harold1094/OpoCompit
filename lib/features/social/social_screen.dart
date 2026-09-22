import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../core/domain/social_profile.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../app_state/application/app_controller.dart';
import 'data/social_seed_profiles.dart';

class SocialScreen extends ConsumerWidget {
  const SocialScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final friendIds = ref.watch(appControllerProvider).friendIds;
    final friends = socialSeedProfiles
        .where((profile) => friendIds.contains(profile.uid))
        .toList();
    final suggestions = socialSeedProfiles
        .where((profile) => !friendIds.contains(profile.uid))
        .toList();

    return GameScaffold(
      title: 'Social',
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFE9FFFB), Color(0xFFFFF2E7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Estudiar con gente cambia la constancia.',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'MVP local: añade amigos de prueba. En Firebase serán solicitudes, invitaciones y ranking de amigos.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.muted,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Amigos',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (friends.isEmpty)
            const Card(
              child: ListTile(
                leading: Icon(Icons.person_add_alt_1_rounded),
                title: Text('Aún no has añadido amigos.'),
                subtitle: Text('Añade uno para preparar rankings sociales.'),
              ),
            )
          else
            ...friends.map(
              (profile) => _SocialProfileCard(
                profile: profile,
                actionLabel: 'Eliminar',
                actionIcon: Icons.close_rounded,
                onPressed: () => ref
                    .read(appControllerProvider.notifier)
                    .removeFriend(profile.uid),
              ),
            ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Sugerencias',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          ...suggestions.map(
            (profile) => _SocialProfileCard(
              profile: profile,
              actionLabel: 'Añadir',
              actionIcon: Icons.person_add_alt_1_rounded,
              onPressed: () => ref
                  .read(appControllerProvider.notifier)
                  .addFriend(profile.uid),
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialProfileCard extends StatelessWidget {
  const _SocialProfileCard({
    required this.profile,
    required this.actionLabel,
    required this.actionIcon,
    required this.onPressed,
  });

  final SocialProfile profile;
  final String actionLabel;
  final IconData actionIcon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: AppColors.brand.withValues(alpha: 0.14),
              child: Text(
                profile.username.substring(0, 1),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
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
                    profile.username,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  Text(
                    '${profile.territoryLabel} · Nivel ${profile.level} · ${profile.xp} XP',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.muted,
                        ),
                  ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: onPressed,
              icon: Icon(actionIcon),
              label: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }
}
