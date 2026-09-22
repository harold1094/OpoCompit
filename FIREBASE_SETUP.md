# Firebase Setup

This project is still runnable locally without Firebase. The Firebase layer starts with Auth, Firestore rules, indexes, and Cloud Functions skeletons.

## Create Project

1. Create a Firebase project, for example `opocompit-dev`.
2. Enable Authentication:
   - Anonymous
   - Google
   - Email/password
3. Create Firestore in production mode.
4. Enable App Check later, after local development works.

## FlutterFire

Install and configure:

```bash
dart pub global activate flutterfire_cli
firebase login
flutterfire configure
```

This generates `lib/firebase_options.dart`. Do not hand-write production credentials.

Then add app dependencies:

```bash
flutter pub add firebase_core firebase_auth cloud_firestore firebase_analytics firebase_crashlytics firebase_messaging firebase_remote_config firebase_app_check
```

## Deploy Rules And Functions

```bash
firebase use opocompit-dev
firebase deploy --only firestore:rules,firestore:indexes
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Security Principle

The client can submit raw attempts. Cloud Functions calculate:

- XP
- level
- coins
- gems
- streaks
- missions
- duel result
- ranking updates
- economy transaction log

The client cannot write those fields directly.

