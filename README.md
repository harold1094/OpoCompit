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

The client persists progress locally through AsyncStorage. When Firebase is enabled, anonymous authentication and callable Functions own profile creation, question selection, scoring, XP, coins, level, streak, question statistics, daily rewards, missions, training and asynchronous friend duels, compatible real-player matchmaking, Elo, global/territorial/friends rankings, usernames, friendships, and private study groups.

Firebase remains opt-in. Development can use the local Auth, Firestore, and Functions emulators without enabling Blaze; see `FIREBASE_SETUP.md`.
Firebase Analytics is also opt-in and disabled in emulator sessions. The web adapter records only
bounded product metrics, without names, emails, user IDs, tokens, or selected answers. Native
analytics remains disabled until the Android production build is configured.

The Social screen now refreshes current friend profiles, displays the real overlap between both
study streaks, and shows a private feed capped at 20 validated quiz or duel activities.
From Social, users with a public username can create or join private study groups by code and see a
live XP ranking. Membership and join codes are only exposed through authenticated callable Functions.
Owners and group administrators can also run a 7, 14, or 30-day competition based on XP, answered
questions, correct answers, or completed duels. Results stop changing automatically at the deadline.
The Profile now opens a modular 2D avatar wardrobe and local-assets shop. Purchases use earned coins
or gems, while callable Functions validate ownership, balances, idempotency, and equipped items.
The Profile also exposes the server-configured Premium preview. Plans, benefits, gem grants, and ad
policy come from Firestore; billing and AdMob remain disabled until production credentials are approved.
Guests can now protect their progress by linking an email/password account on Android or web, then
sign back into the same Firebase profile later. Google linking and login are available on web; the
native Android Google flow remains a production OAuth setup task.
Firebase sessions are restored before protected routes render. During temporary outages the client
keeps cached progress visible, reports the offline state, and offers an explicit retry; expired
sessions are redirected to account recovery without leaving protected screens blank.
Published official exams now open from Home with their exact reviewed question set, configurable
timer and scoring rules, blank answers, recoverable in-progress sessions, and server-authoritative
results. The emulator publishes only an explicit development demonstration; imported real exams
remain out of play until an administrator reviews and publishes their questions.
`Mis errores` is synchronized with server-owned question statistics. Incorrect and blank answers
enter a bounded review queue, while a later correct answer marks that question as mastered. The
queue can be filtered and started by category. Profile aggregates those trusted statistics into
strongest and weakest topics, accuracy bars, and a direct weak-topic review action.
Profile also exposes a configurable achievement catalog. Milestones are evaluated against trusted
progress, unlocked transactionally, and reward XP, coins, or gems only once.
The Home bell opens a private internal inbox for social requests, duel updates, and achievement
unlocks. Notices are created by Functions, deduplicated by event, and can be read individually or all at once.
The Home `Test` entry now creates server-filtered custom practices or timed simulations by question
count, category, difficulty, territory scope, and personal history. Simulations support blanks,
review navigation, a deadline, and server-authoritative `+1/-0.33/0` scoring.

## Verify

```bash
cd apps/client
npm run typecheck
npm test -- --runInBand
```

The same client, backend, security-rule, and emulator checks run in `.github/workflows/ci.yml` on
every push and pull request. See `RELEASE_CHECKLIST.md` for the remaining production gates.

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

Open `http://localhost:8082/admin` for the responsive CSV/JSON import, individual or bulk review,
duplicate detection, and management of oppositions, territories, categories, and official exams.
The Operation tab manages the live mission rotation, daily rewards, shop prices, Premium plans, and
monetization switches. Its local administrator bootstrap is rejected automatically outside the
Functions emulator.

## Vertical Slice Ready To Test

1. Open the app.
2. Configure the guest profile with `Bomberos` and a territory such as `Bomberos Cartagena`.
3. Tap `JUGAR`.
4. Answer 10 questions; each selection advances automatically.
5. Finish the match.
6. Check result, XP, coins, streak, and updated Home/Profile progress.
7. Open `Duelo`, choose a training rival, finish the shared ten-question challenge, and compare score and time.
8. Open `Perfil` and enter `Avatar y tienda` to equip starter items or buy cosmetics with earned currency.
9. Open `Premium` to inspect the current free entitlement and backend-configured future plan.
10. Open `Cuenta` from Profile to link an email/password account, sign out, and recover the same progress.
11. Open `Examen`, start the local demonstration, navigate between questions, leave answers blank, and submit it to inspect the official score.

Local progress is persisted with AsyncStorage. Firebase will progressively replace local scoring and content while keeping the same user flow.
