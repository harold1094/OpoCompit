# Project Status

## Completed Local Vertical Slices

- Guest onboarding.
- Opposition and territory selection.
- Game-first home.
- Quick quiz.
- Territorial question filtering.
- Explicit blank answers.
- Results with score, XP, coins, streak, and review.
- Per-question user stats.
- Error review mode.
- Local daily reward.
- Local daily missions.
- Local social friends.
- Local global, territorial, and friends rankings.
- Local classic 1v1 duel.
- GitHub repository pushed.

## Firebase Prepared

- Firestore rules.
- Firestore indexes.
- Firebase project config files.
- Cloud Functions TypeScript skeleton.
- Callable `startQuickQuiz`.
- Callable `submitQuizSession`.
- Server-side scoring and economy transaction log skeleton.

## Still Local / Not Production-Safe Yet

- Auth session.
- User profile persistence.
- Question reads.
- XP, coins, streak, missions, rankings, duels.
- Friends and social graph.
- Admin import.

## Next Implementation Steps

1. Create Firebase project and run FlutterFire configuration.
2. Add Firebase Flutter packages.
3. Implement anonymous sign-in.
4. Create user document on first launch.
5. Replace local quick quiz with `startQuickQuiz`.
6. Replace local result validation with `submitQuizSession`.
7. Seed Firestore with demo questions.
8. Move question stats, missions, rankings, and duels to server-authoritative Functions.

