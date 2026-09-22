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
                if (index == 2) context.go('/profile');
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
    if (location.startsWith('/profile')) return 2;
    return 0;
  }
}
