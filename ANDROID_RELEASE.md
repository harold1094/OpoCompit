# Android Release

The Expo client is prepared to create an internal APK and a Google Play AAB without committing
production credentials.

## One-time setup

1. Install the EAS CLI and sign in with the project owner account.
2. From `apps/client`, run `eas build:configure` and associate the app with the intended Expo project.
   EAS keeps the production Android version code remotely so repeated builds cannot reuse it.
3. Add the production `EXPO_PUBLIC_FIREBASE_*` values to the EAS environment. Keep emulator flags
   disabled for release builds.
4. Enable Email/Password and Google providers in the production Firebase project.
5. Register `com.opocompit.app` as the Android application and add the Play signing SHA-1/SHA-256
   fingerprints before enabling native Google sign-in.

## Internal APK

```bash
cd apps/client
npx eas-cli build --platform android --profile preview
```

Install the resulting APK on at least one physical Android device and complete the checks in
`RELEASE_CHECKLIST.md`.

## Play Store bundle

```bash
cd apps/client
npx eas-cli build --platform android --profile production
```

The production profile creates an Android App Bundle and increments the Android version code.
Uploading or submitting the bundle remains a manual owner action.

## Dependency audit

Run `npm audit --omit=dev` before the production build and apply only upgrades supported by the
installed Expo SDK. Do not use `npm audit fix --force`: npm currently proposes incompatible Expo,
React Native, and Firebase downgrades for transitive advisories.
