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
- End-to-end emulator smoke test for guest Auth, quizzes, training/friend/matchmaking duels, rewards, friendships, Elo, private groups, privacy, and duplicate protection.
- Quiz questions hide answers and explanations until the server validates the submission.
- Guest onboarding, game-first home, quick quiz, results, errors, rankings, social, and profile screens ported.
- Flutter remains in place as a reference until React feature parity is verified.

## Completed Local Vertical Slices

- Guest onboarding.
- Opposition and territory selection.
- Game-first home.
- Quick quiz.
- Territorial question filtering.
- Required answers with automatic progression and submission on the final question.
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
- Admin-only JSON question imports with strict validation, stable identifiers, audit batches, and idempotent retries.
- Emulator import command and sample batch for reviewing the complete ingestion path without Blaze.
- Responsive React admin panel for JSON imports, pending-question editing, publication, and rejection.
- Admin review callables with emulator-only access bootstrap and reviewer audit fields.
- Local CSV-to-JSON conversion with quoted-field support and mandatory human inspection.
- Atomic bulk publication and rejection for up to 50 selected review questions.
- Live friend profiles, shared study streaks, and a private 20-event social activity feed.
- Private study groups with create/join codes, bounded membership, live XP rankings, leave, and empty-group deletion.
- Time-bounded group competitions for XP, questions, correct answers, or duels with idempotent event scoring.
- Modular 2D avatar, local-assets wardrobe, cosmetic shop, trusted purchases, and persisted equipment.
- Callable avatar API for bounded inventory reads, idempotent purchases, and ownership-validated equipment.
- Server-configured Premium preview with trusted entitlement lookup and gem benefits.
- Advertising policy that is disabled by default and excludes quizzes and duels by construction.
- Server-side scoring and economy transaction log skeleton.
- Flutter Firebase dependencies.
- Firebase bootstrap behind `OPOCOMPIT_USE_FIREBASE`.
- Anonymous Auth service skeleton.
- Firestore user profile service skeleton.

## Still Local / Not Production-Safe Yet

- Firebase is not deployed: Firestore and Cloud Functions APIs are currently disabled in `opocompit-dev`.
- Real Play Billing and AdMob are intentionally not connected; no purchase or advertisement is simulated.

## Next Implementation Steps

1. Choose the permanent Firestore location and enable Blaze only when production testing is approved.
2. Connect verified Play Billing and AdMob credentials only after business approval.
3. Complete the remaining admin and release instrumentation work from phases 12 and 13.
4. Remove Flutter only after React reaches verified feature parity.
