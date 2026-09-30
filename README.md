# OpoCompit

OpoCompit is a gamified study app for competitive exams. The first vertical slice focuses on Spanish firefighter exams and lets a guest user choose an opposition/territory, play a 10-question quick match, receive results, XP, coins, streak progress, and updated profile progress.

## Current Scope

- Expo + React Native client for Android and web in `apps/client`.
- The previous Flutter client remains temporarily as a migration reference.
- Local vertical slice that mirrors the intended Firebase-backed domain model.
- Feature-first TypeScript structure with Expo Router and Zustand.
- Server-authoritative design documented for the Firebase phase.

## Run React Client

```bash
cd apps/client
npm install
npm run web
```

For Android, install Expo Go or use an Android emulator, then run `npm run android`.

The client persists progress locally through AsyncStorage. When Firebase is enabled, anonymous authentication and callable Functions own profile creation, question selection, scoring, XP, coins, level, streak, question statistics, daily rewards, missions, training and asynchronous friend duels, compatible real-player matchmaking, Elo, global/territorial/friends rankings, usernames, and friendships.

Firebase remains opt-in. Development can use the local Auth, Firestore, and Functions emulators without enabling Blaze; see `FIREBASE_SETUP.md`.

The Social screen now refreshes current friend profiles, displays the real overlap between both
study streaks, and shows a private feed capped at 20 validated quiz or duel activities.

## Verify

```bash
cd apps/client
npm run typecheck
npm test -- --runInBand
```

Verify the complete Firebase backend locally, without Blaze or deployed services:

```bash
cd functions
npm install
npm run verify:emulator
```

Import a validated sample question batch while `npm run serve` is running:

```bash
cd functions
npm run seed:emulator
npm run import:emulator -- --file fixtures/admin-import.sample.json
```

The importer is restricted to the local emulators, creates content as `pending_review`, and never
publishes questions automatically. The admin panel converts CSV to inspectable JSON and supports
atomic bulk publication or rejection. See `ADMIN_IMPORT_FORMAT.md` for both formats.

Run the React web client with its emulator configuration in a second terminal:

```bash
cd apps/client
npm run web:emulator
```

Open `http://localhost:8082/admin` for the responsive CSV/JSON import and individual or bulk review
panel. Its local administrator bootstrap is rejected automatically outside the Functions emulator.

## Vertical Slice Ready To Test

1. Open the app.
2. Configure the guest profile with `Bomberos` and a territory such as `Bomberos Cartagena`.
3. Tap `JUGAR`.
4. Answer or leave blank 10 questions.
5. Finish the match.
6. Check result, XP, coins, streak, and updated Home/Profile progress.
7. Open `Duelo`, choose a training rival, finish the shared ten-question challenge, and compare score and time.

Local progress is persisted with AsyncStorage. Firebase will progressively replace local scoring and content while keeping the same user flow.
