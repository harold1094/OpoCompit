# Project Status

## React Migration

- Expo + React Native + React Native Web client created in `apps/client`.
- Shared Android/web navigation through Expo Router.
- TypeScript domain models, territorial filtering, scoring, XP, coins, streak, question stats, daily reward, and missions.
- AsyncStorage persistence through Zustand.
- Optional Firebase anonymous Auth and guest profile creation.
- React callable integration for guest bootstrap, quick quiz start, and server-validated submission.
- Server-owned quiz XP, coins, level, streak, aggregate progress, and question statistics.
- Quiz questions hide answers and explanations until the server validates the submission.
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

- Firebase is not deployed: Firestore and Cloud Functions APIs are currently disabled in `opocompit-dev`.
- Daily rewards and mission rewards.
- Rankings and duels.
- Friends and social graph.
- Admin import.

## Next Implementation Steps

1. Choose the permanent Firestore location and matching Functions region.
2. Enable Firestore, Anonymous Auth, Cloud Functions, and Blaze billing with budget alerts.
3. Deploy Firestore rules, indexes, and callable Functions.
4. Configure `apps/client/.env` and run an end-to-end Firebase smoke test.
5. Seed Firestore with reviewed questions.
6. Port the classic duel flow to React.
7. Move missions, daily rewards, rankings, and duels to server-authoritative Functions.
8. Remove Flutter only after React reaches verified feature parity.
