# Roadmap Of Small Commits

## Commit 1: Baseline Architecture

- Add README and core architecture docs.
- Define Firestore schema, game rules, import format.
- Add Flutter package configuration and feature-first folders.

## Commit 2: Design System And Routing

- Add app colors, typography, spacing, radii, reusable buttons/cards.
- Add GoRouter navigation skeleton.

## Commit 3: Guest Onboarding

- Add anonymous local user session.
- Add opposition and territory selection.

## Commit 4: Question Domain And Filtering

- Add question, answer, territory, quiz session models.
- Add seeded demo questions.
- Add territorial eligibility engine.

## Commit 5: Quick Match

- Add 10-question quick match flow.
- Persist temporary answers locally.
- Support blank answers.

## Commit 6: Results And Progress

- Add scoring service.
- Award MVP XP and coins locally.
- Update streak and question stats.
- Show full result and review summary.

## Commit 7: Firebase Integration

- Add Firebase Auth anonymous sign-in.
- Add Firestore repositories behind existing interfaces.
- Move scoring/rewards validation to Cloud Functions.

## Commit 8: Tests

- Add unit tests for filtering, scoring, XP, streaks, and stats.
- Add widget test for guest to result flow.

