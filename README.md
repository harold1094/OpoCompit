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

The client persists progress locally through AsyncStorage. When Firebase is enabled, anonymous authentication and callable Functions own profile creation, question selection, scoring, XP, coins, level, streak, question statistics, daily rewards, missions, training duels, usernames, and friendships.

Firebase remains opt-in. Development can use the local Auth, Firestore, and Functions emulators without enabling Blaze; see `FIREBASE_SETUP.md`.

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

## Vertical Slice Ready To Test

1. Open the app.
2. Configure the guest profile with `Bomberos` and a territory such as `Bomberos Cartagena`.
3. Tap `JUGAR`.
4. Answer or leave blank 10 questions.
5. Finish the match.
6. Check result, XP, coins, streak, and updated Home/Profile progress.
7. Open `Duelo`, choose a training rival, finish the shared ten-question challenge, and compare score and time.

Local progress is persisted with AsyncStorage. Firebase will progressively replace local scoring and content while keeping the same user flow.
