import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';

class GameScaffold extends StatelessWidget {
  const GameScaffold({
    required this.child,
    this.title,
    this.showNav = true,
    super.key,
  });

  final Widget child;
  final String? title;
  final bool showNav;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: title == null
          ? null
          : AppBar(
              title: Text(title!),
              actions: [
                IconButton(
                  onPressed: () => context.go('/profile'),
                  icon: const Icon(Icons.person_rounded),
                ),
              ],
            ),
      body: SafeArea(child: child),
      bottomNavigationBar: showNav
          ? NavigationBar(
              selectedIndex: _selectedIndex(context),
              onDestinationSelected: (index) {
                if (index == 0) context.go('/home');
                if (index == 1) context.go('/quiz');
                if (index == 2) context.go('/social');
                if (index == 3) context.go('/duels');
                if (index == 4) context.go('/ranking');
                if (index == 5) context.go('/profile');
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_rounded),
                  label: 'Inicio',
                ),
                NavigationDestination(
                  icon: Icon(Icons.sports_esports_rounded),
                  label: 'Jugar',
                ),
                NavigationDestination(
                  icon: Icon(Icons.group_rounded),
                  label: 'Social',
                ),
                NavigationDestination(
                  icon: Icon(Icons.sports_mma_rounded),
                  label: 'Duelos',
                ),
                NavigationDestination(
                  icon: Icon(Icons.leaderboard_rounded),
                  label: 'Ranking',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_rounded),
                  label: 'Perfil',
                ),
              ],
              indicatorColor: AppColors.brand.withValues(alpha: 0.14),
            )
          : null,
    );
  }

  int _selectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/quiz')) return 1;
    if (location.startsWith('/social')) return 2;
    if (location.startsWith('/duels')) return 3;
    if (location.startsWith('/ranking')) return 4;
    if (location.startsWith('/profile')) return 5;
    return 0;
  }
}
