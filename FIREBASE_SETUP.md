# Firebase Setup

The React client is wired to Firebase Auth and callable Functions, but production Firebase is intentionally disabled until the project infrastructure is ready.

## Current Project State

Project alias: `opocompit-dev`.

Checked on 2026-09-28:

- Firebase CLI authentication works.
- Cloud Firestore API is disabled and no database location has been selected.
- Cloud Functions API is disabled.
- Deploying Cloud Functions requires the Blaze pay-as-you-go plan.

Choosing a Firestore location is a long-lived decision. Select the database location before fixing the Functions region. For a European Firestore multi-region such as `eur3`, Firebase recommends a nearby Functions region such as `europe-west1`.

## Production Activation Order

1. Choose and create the Firestore database location.
2. Enable Anonymous Authentication in Firebase Authentication.
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

## Callable Flow

- `bootstrapGuestProfile`: creates the protected server profile with zero economy values.
- `startQuickQuiz`: reads opposition and territory from the trusted user profile and returns questions without answers or explanations.
- `submitQuizSession`: validates ownership, expiry, question IDs, answer options, scoring, XP, coins, level, streak, question statistics, and the economy transaction.

The React client falls back to local mode when Firebase is disabled or guest bootstrap cannot complete.

## Local Emulators

The configured ports are:

- Emulator UI: `4000`
- Functions: `5001`
- Firestore: `8080`
- Auth: `9099`

Start them from the repository root:

```bash
firebase emulators:start --only auth,firestore,functions
```

For the React client, set:

```dotenv
EXPO_PUBLIC_FIREBASE_ENABLED=true
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
```

## Security Principle

Clients cannot create or update user progress, read question answers directly, create quiz sessions, or write economy transactions. Admin SDK code in callable Functions performs those operations after validating the authenticated user and raw answers.
