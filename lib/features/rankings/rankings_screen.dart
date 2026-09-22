import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../core/domain/leaderboard_entry.dart';
import '../../core/domain/player_profile.dart';
import '../../shared/widgets/game_scaffold.dart';
import '../app_state/application/app_controller.dart';
import '../social/data/social_seed_profiles.dart';

enum RankingFilter {
  global,
  territorial,
  friends,
}

class RankingsScreen extends ConsumerStatefulWidget {
  const RankingsScreen({super.key});

  @override
  ConsumerState<RankingsScreen> createState() => _RankingsScreenState();
}

class _RankingsScreenState extends ConsumerState<RankingsScreen> {
  var _filter = RankingFilter.global;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final profile = state.profile;

    if (profile == null) {
      return const GameScaffold(
        title: 'Ranking',
        child: Center(
          child: Text('Configura tu jugador para entrar en rankings.'),
        ),
      );
    }

    final entries = _buildEntries(
      profile: profile,
      filter: _filter,
      friendIds: state.friendIds,
    );
    final userRank = entries.indexWhere((entry) => entry.isCurrentUser) + 1;

    return GameScaffold(
      title: 'Ranking',
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
                  'Tu posición',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.white70,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '#$userRank',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                Text(
                  '${profile.xp} XP · ${_filterLabel(_filter)}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.gold,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          SegmentedButton<RankingFilter>(
            segments: const [
              ButtonSegment(
                value: RankingFilter.global,
                label: Text('Global'),
                icon: Icon(Icons.public_rounded),
              ),
              ButtonSegment(
                value: RankingFilter.territorial,
                label: Text('Territorio'),
                icon: Icon(Icons.location_on_rounded),
              ),
              ButtonSegment(
                value: RankingFilter.friends,
                label: Text('Amigos'),
                icon: Icon(Icons.group_rounded),
              ),
            ],
            selected: {_filter},
            onSelectionChanged: (selection) {
              setState(() => _filter = selection.first);
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          ...entries.indexed.map(
            (indexedEntry) {
              final rank = indexedEntry.$1 + 1;
              final entry = indexedEntry.$2;
              return _RankRow(
                rank: rank,
                entry: entry,
              );
            },
          ),
        ],
      ),
    );
  }

  String _filterLabel(RankingFilter filter) {
    return switch (filter) {
      RankingFilter.global => 'Global',
      RankingFilter.territorial => 'Territorio',
      RankingFilter.friends => 'Amigos',
    };
  }

  List<LeaderboardEntry> _buildEntries({
    required PlayerProfile profile,
    required RankingFilter filter,
    required Set<String> friendIds,
  }) {
    if (filter == RankingFilter.friends) {
      final entries = [
        LeaderboardEntry(
          uid: profile.uid,
          username: profile.username,
          level: profile.level,
          xp: profile.xp,
          territoryLabel: profile.territory.label,
          isCurrentUser: true,
        ),
        ...socialSeedProfiles
            .where((socialProfile) => friendIds.contains(socialProfile.uid))
            .map(
              (socialProfile) => LeaderboardEntry(
                uid: socialProfile.uid,
                username: socialProfile.username,
                level: socialProfile.level,
                xp: socialProfile.xp,
                territoryLabel: socialProfile.territoryLabel,
                isCurrentUser: false,
              ),
            ),
      ]..sort((a, b) => b.xp.compareTo(a.xp));
      return entries;
    }

    final territory = filter == RankingFilter.territorial
        ? profile.territory.label
        : 'España';
    final entries = [
      LeaderboardEntry(
        uid: profile.uid,
        username: profile.username,
        level: profile.level,
        xp: profile.xp,
        territoryLabel: profile.territory.label,
        isCurrentUser: true,
      ),
      LeaderboardEntry(
        uid: 'rival_1',
        username: 'Martín',
        level: 8,
        xp: filter == RankingFilter.global ? 1280 : 420,
        territoryLabel: territory,
        isCurrentUser: false,
      ),
      LeaderboardEntry(
        uid: 'rival_2',
        username: 'Ana',
        level: 6,
        xp: filter == RankingFilter.global ? 870 : 360,
        territoryLabel: territory,
        isCurrentUser: false,
      ),
      LeaderboardEntry(
        uid: 'rival_3',
        username: 'Lucas',
        level: 4,
        xp: filter == RankingFilter.global ? 520 : 180,
        territoryLabel: territory,
        isCurrentUser: false,
      ),
      LeaderboardEntry(
        uid: 'rival_4',
        username: 'Pedro',
        level: 2,
        xp: filter == RankingFilter.global ? 160 : 80,
        territoryLabel: territory,
        isCurrentUser: false,
      ),
    ]..sort((a, b) => b.xp.compareTo(a.xp));

    return entries;
  }
}

class _RankRow extends StatelessWidget {
  const _RankRow({
    required this.rank,
    required this.entry,
  });

  final int rank;
  final LeaderboardEntry entry;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: entry.isCurrentUser ? const Color(0xFFFFF2E7) : null,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _rankColor(rank),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                '#$rank',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.white,
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
                    entry.username,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  Text(
                    '${entry.territoryLabel} · Nivel ${entry.level}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.muted,
                        ),
                  ),
                ],
              ),
            ),
            Text(
              '${entry.xp} XP',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.brand,
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Color _rankColor(int rank) {
    return switch (rank) {
      1 => AppColors.gold,
      2 => AppColors.aqua,
      3 => AppColors.brand,
      _ => AppColors.muted,
    };
  }
}
