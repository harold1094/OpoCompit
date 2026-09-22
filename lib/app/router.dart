import 'package:go_router/go_router.dart';

import '../features/duels/duels_screen.dart';
import '../features/home/home_screen.dart';
import '../features/errors/errors_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/quiz/quick_quiz_screen.dart';
import '../features/rankings/rankings_screen.dart';
import '../features/results/results_screen.dart';
import '../features/social/social_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/home',
  routes: [
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/quiz',
      builder: (context, state) => const QuickQuizScreen(),
    ),
    GoRoute(
      path: '/results',
      builder: (context, state) => const ResultsScreen(),
    ),
    GoRoute(
      path: '/errors',
      builder: (context, state) => const ErrorsScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/ranking',
      builder: (context, state) => const RankingsScreen(),
    ),
    GoRoute(
      path: '/social',
      builder: (context, state) => const SocialScreen(),
    ),
    GoRoute(
      path: '/duels',
      builder: (context, state) => const DuelsScreen(),
    ),
  ],
);
