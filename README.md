# OpoCompit

OpoCompit is a gamified study app for competitive exams. The first vertical slice focuses on Spanish firefighter exams and lets a guest user choose an opposition/territory, play a 10-question quick match, receive results, XP, coins, streak progress, and updated profile progress.

## Current Scope

- Flutter app-first architecture for Android, with web kept compatible.
- Local demo repository implementation that mirrors the intended Firebase-backed domain model.
- Feature-first structure with Riverpod and GoRouter.
- Server-authoritative design documented for the Firebase phase.

## Run

```bash
flutter create . --platforms=android,web
flutter pub get
flutter test
flutter run
```

The current build uses an in-memory/local repository so the vertical slice can be tested before Firebase is wired.

If the native Android folder already exists, do not regenerate it blindly; run `flutter pub get`, then `flutter test`, then `flutter run`.

## Vertical Slice Ready To Test

1. Open the app.
2. Configure the guest profile with `Bomberos` and a territory such as `Bomberos Cartagena`.
3. Tap `JUGAR`.
4. Answer or leave blank 10 questions.
5. Finish the match.
6. Check result, XP, coins, streak, and updated Home/Profile progress.

Local progress is persisted with `shared_preferences`. Firebase will replace the local repository layer in the next stage while keeping the same flow.
