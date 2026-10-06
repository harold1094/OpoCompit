# Android Release

The Expo client is prepared to create an internal APK and a Google Play AAB without committing
production credentials.

## One-time setup

1. Install the EAS CLI and sign in with the project owner account.
2. From `apps/client`, run `eas build:configure` and associate the app with the intended Expo project.
   EAS keeps the production Android version code remotely so repeated builds cannot reuse it.
3. Add the `EXPO_PUBLIC_FIREBASE_*` values to the EAS `preview` and `production` environments. Keep
   emulator flags disabled for release builds.
4. Enable Email/Password and Google providers in the production Firebase project and complete the
   OAuth consent screen.
5. Create the EAS Android keystore with the first preview build. In the Expo project dashboard, open
   Credentials > `com.opocompit.app` and copy its SHA-1 certificate fingerprint.
6. Register `com.opocompit.app` as an Android OAuth client with that SHA-1. Also create or locate the
   Web OAuth client in the same Firebase/Google Cloud project.
7. Add its public `*.apps.googleusercontent.com` identifier as
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in both EAS environments, then rebuild the APK.

The OAuth client ID is public application configuration. Never place a client secret, service-account
JSON, keystore, or password in an `EXPO_PUBLIC_*` variable or in Git.

## Internal APK

```bash
cd apps/client
npx eas-cli build --platform android --profile preview
```

Install the resulting APK on at least one physical Android device and complete the checks in
`RELEASE_CHECKLIST.md`.

The first APK can be built before Google OAuth is ready; its Google button stays disabled. Use the
resulting EAS signing SHA-1 to finish OAuth, add the environment variable, and create the verification
APK with the same command.

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
