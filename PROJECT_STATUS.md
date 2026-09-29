# Project Status

## React Migration

- Expo + React Native + React Native Web client created in `apps/client`.
- Shared Android/web navigation through Expo Router.
- TypeScript domain models, territorial filtering, scoring, XP, coins, streak, question stats, daily reward, and missions.
- AsyncStorage persistence through Zustand.
- Optional Firebase anonymous Auth and guest profile creation.
- React callable integration for guest bootstrap, quick quiz start, and server-validated submission.
- Server-owned quiz XP, coins, level, streak, aggregate progress, and question statistics.
- Server-owned daily rewards, daily mission progress, and mission claims.
- Auth and Functions connect to local emulators on web and Android when emulator mode is enabled.
- Reproducible emulator seed with the 12 existing development questions.
- End-to-end emulator smoke test for guest Auth, quizzes, training/friend/matchmaking duels, rewards, friendships, Elo, and duplicate protection.
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
- Daily reward with a seven-day local fallback calendar.
- Daily missions with automatic Madrid-day reset.
- Local social friends.
- Global, hierarchical territorial, and friends rankings with local fallback.
- React classic 1v1 training duel with local fallback and server-authoritative Firebase validation.
- Unique public usernames with exact user search.
- Friend requests with accept, decline, list, and remove flows.
- Asynchronous friend duels with invitations, shared compatible questions, individual timers, waiting state, results, and rematches.
- Compatible real-player matchmaking by opposition, shared territory, and widening Elo range.
- GitHub repository pushed.

## Firebase Prepared

- Firestore rules.
- Firestore indexes.
- Firebase project config files.
- Cloud Functions TypeScript skeleton.
- Callable `startQuickQuiz`.
- Callable `submitQuizSession`.
- Callable `getDailyEngagement`.
- Callable `claimDailyReward`.
- Callable `claimMission`.
- Callable `startClassicDuel`.
- Callable `submitClassicDuel`.
- Callable social API for username reservation, search, requests, friendships, and removal.
- Callable friend-duel API for invitations, acceptance, play, submission, and final server-owned results.
- Callable matchmaking API for joining, polling, cancelling, transactional pairing, and Elo updates.
- Callable ranking API with server-owned XP, public snapshots, tie handling, and bounded reads.
- Server-side scoring and economy transaction log skeleton.
- Flutter Firebase dependencies.
- Firebase bootstrap behind `OPOCOMPIT_USE_FIREBASE`.
- Anonymous Auth service skeleton.
- Firestore user profile service skeleton.

## Still Local / Not Production-Safe Yet

- Firebase is not deployed: Firestore and Cloud Functions APIs are currently disabled in `opocompit-dev`.
- Shared friend streaks and social activity feed.
- Admin import.

## Next Implementation Steps

1. Add the first functional admin import flow against the emulator.
2. Choose the permanent Firestore location and enable Blaze only when production testing is approved.
3. Remove Flutter only after React reaches verified feature parity.
