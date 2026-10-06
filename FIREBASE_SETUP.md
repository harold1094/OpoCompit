# Firebase Setup

The React client separates Firebase Auth from callable Functions. Signed preview builds can use
Google identity while gameplay remains local; the production backend stays disabled until its
server-side infrastructure is approved.

## Current Project State

Project alias: `opocompit-dev`.

Checked on 2026-10-06:

- Firebase CLI authentication works.
- Anonymous and Google Authentication are enabled for the signed React Android app.
- Cloud Firestore API is disabled and no database location has been selected.
- Cloud Functions API is disabled.
- Deploying Cloud Functions requires the Blaze pay-as-you-go plan.

Choosing a Firestore location is a long-lived decision. Select the database location before fixing the Functions region. For a European Firestore multi-region such as `eur3`, Firebase recommends a nearby Functions region such as `europe-west1`.

## Production Activation Order

1. Choose and create the Firestore database location.
2. Enable Anonymous, Email/Password, and Google Authentication in Firebase Authentication.
3. Upgrade to Blaze and create budget alerts before deploying Functions.
4. Set the same Functions region in the server exports and `EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION`.
5. Deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

6. Build and deploy Functions:

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

7. Copy `apps/client/.env.example` to `apps/client/.env` and fill in the existing Firebase web app values.
8. Set `EXPO_PUBLIC_FIREBASE_ENABLED=true` and restart Expo.
9. Import reviewed questions with `status: published` and `verified: true`.
10. To enable privacy-filtered web analytics, provide a real measurement ID and set
    `EXPO_PUBLIC_ANALYTICS_ENABLED=true`. Keep it `false` for local emulator work.

## Callable Flow

- `bootstrapGuestProfile`: creates the protected server profile with zero economy values.
- `getCurrentProfile`: restores the protected profile after a returning user signs in.
- `completeAccountLink`: marks a guest profile as linked only after Auth confirms a non-anonymous provider.
- `startQuickQuiz`: reads opposition and territory from the trusted user profile and returns questions without answers or explanations.
- `submitQuizSession`: validates ownership, expiry, question IDs, answer options, scoring, XP, coins, level, streak, question statistics, mission progress, and the economy transaction.
- `getDailyEngagement`: returns today's reward and missions using the Madrid calendar day.
- `claimDailyReward`: grants one idempotent daily reward and records its economy transactions.
- `claimMission`: validates server-owned mission progress before granting XP and coins.

The React client falls back to local mode when Firebase is disabled or guest bootstrap cannot complete.
Guests can link an email/password or Google account on Android or web without changing their Firebase
UID, so their XP, coins, streaks, friends, and groups remain attached to the same profile. Native
Android Google sign-in uses Credential Manager and still requires the production OAuth client IDs,
the APK signing SHA-1, and a signed-build verification pass.

## Free Auth-Only Mode

Set the following values to enable Google identity without enabling callable Functions:

```dotenv
EXPO_PUBLIC_FIREBASE_AUTH_ENABLED=true
EXPO_PUBLIC_FIREBASE_ENABLED=false
```

In this mode an existing guest can link Google and keep the same local profile on that installation.
XP, currency, answers, statistics, friends, and inventory stay in AsyncStorage and are never written
directly to Firestore. Sign-out and cross-device recovery are intentionally unavailable because they
would imply cloud persistence that this mode does not provide. Account deletion removes both the
local profile and the linked Firebase Auth identity.

## Local Emulators

This path does not require Blaze or a deployed Firestore database. Firebase Emulator Suite requires Java 11 or newer; install a current JDK before starting it.

The configured ports are:

- Emulator UI: `4000`
- Functions: `5001`
- Firestore: `8080`
- Auth: `9099`

Start them from the repository root:

```bash
firebase emulators:start --only auth,firestore,functions
```

Run the complete isolated backend verification from `functions`:

```bash
npm run verify:emulator
```

This command starts clean emulators, imports the existing development questions, exercises the main
game, social, group, economy, and admin workflows, verifies direct Firestore access rules, and shuts
the emulators down.

For the React client, set:

```dotenv
EXPO_PUBLIC_FIREBASE_ENABLED=true
EXPO_PUBLIC_ANALYTICS_ENABLED=false
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=
```

Leave the host empty to use `127.0.0.1` on web and `10.0.2.2` on the standard Android emulator automatically. For a physical phone, set the development computer's LAN address and allow the emulator ports through the local firewall.

## Security Principle

Clients cannot create or update user progress, claim rewards directly, read question answers, create quiz sessions, or write economy transactions. Admin SDK code in callable Functions performs those operations after validating the authenticated user and raw actions.

The analytics adapter refuses to start against emulators and removes sensitive parameter keys before
delivery. It is currently web-only because Firebase's JavaScript Analytics SDK does not provide the
native Android transport used by Expo development builds.
