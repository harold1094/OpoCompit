# Release Checklist

## Automated gates

- [x] Client TypeScript validation and Jest suite.
- [x] Functions build, lint, and Node test suite.
- [x] End-to-end Auth, Firestore, and Functions emulator verification.
- [x] Direct Firestore Rules checks for private profiles, protected writes, and question answers.
- [x] GitHub Actions verification on pushes and pull requests.
- [x] Privacy-filtered, opt-in web analytics foundation.

## Product gates

- [x] Add email/password account linking and returning login without losing guest progress.
- [x] Add Google account linking and login on web.
- [x] Implement empty, loading, offline, expired-session, and recovery states.
- [x] Add server-validated official-exam mode with configurable rules and timer.
- [x] Synchronize error review and mastery with server-owned question statistics.
- [x] Add server-filtered custom tests and timed simulations.
- [x] Add category learning insights, weak-topic detection, and filtered error review.
- [x] Add server-authoritative achievements with idempotent rewards and profile progress.
- [x] Add a private in-app notification inbox for social, duel, and achievement events.
- [x] Add user question reports, admin resolution, and current-versus-historical validity handling.
- [ ] Configure and verify native Google sign-in for signed Android builds.
- [ ] Review and publish the real official-exam question batches.
- [ ] Validate complete flows, accessibility, and recovery states on physical Android devices.
- [ ] Prepare privacy policy, terms, data deletion, and support contact.

## Production infrastructure

- [ ] Select the permanent Firestore location and matching Functions region.
- [ ] Enable Email/Password and Google Authentication providers and configure production Firebase apps.
- [ ] Upgrade Firebase only after budget alerts and spending limits are agreed.
- [ ] Replace preview billing and ad configuration with approved store credentials.
- [ ] Add a native Android analytics adapter and verify consent requirements.
- [ ] Build a signed Android App Bundle and complete internal Play testing.

All unchecked infrastructure work remains disabled and incurs no project cost in the current local
emulator setup.
