# Project Status

## React Migration

- Expo + React Native + React Native Web client created in `apps/client`.
- Shared Android/web navigation through Expo Router.
- TypeScript domain models, territorial filtering, scoring, XP, coins, streak, question stats, daily reward, and missions.
- AsyncStorage persistence through Zustand.
- Optional Firebase anonymous Auth and guest profile creation.
- Guest onboarding, game-first home, quick quiz, results, errors, rankings, social, and profile screens ported.
- Flutter remains in place as a reference until React feature parity is verified.

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
- Flutter Firebase dependencies.
- Firebase bootstrap behind `OPOCOMPIT_USE_FIREBASE`.
- Anonymous Auth service skeleton.
- Firestore user profile service skeleton.

## Still Local / Not Production-Safe Yet

- Auth session.
- User profile persistence.
- Question reads.
- XP, coins, streak, missions, rankings, duels.
- Friends and social graph.
- Admin import.

## Next Implementation Steps

1. Enable the existing Firebase project in `apps/client/.env`.
2. Replace local quick quiz selection with `startQuickQuiz`.
3. Replace local result validation with `submitQuizSession`.
4. Seed Firestore with reviewed questions.
5. Port the classic duel flow to React.
6. Move question stats, missions, rankings, and duels to server-authoritative Functions.
7. Remove Flutter only after React reaches verified feature parity.
