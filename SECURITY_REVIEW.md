# Security Review

Reviewed on 2026-10-06. This review covers the dependency trees used by the Expo client and the
Firebase Functions backend. It is a release checkpoint, not a claim that every transitive package
in the JavaScript ecosystem is vulnerability-free.

## Changes applied

- Pinned the transitive `shell-quote` package to `1.12.0`, removing the client's only critical
  advisory without changing React Native or Expo versions.
- Upgraded `firebase-admin` from 13.x to `14.5.0` and `firebase-functions` from 6.x to `7.4.0`.
- Kept the Functions runtime on Node 22, which is required by Firebase Admin 14 and already matches
  the deployment configuration.

Firebase references:

- https://firebase.google.com/support/release-notes/admin/node
- https://firebase.google.com/support/releases

## Verification completed

- Client TypeScript validation: passed.
- Client Jest suite: 23 suites and 52 tests passed.
- Expo Doctor: 21 of 21 checks passed.
- Functions TypeScript build and ESLint: passed.
- Functions Node suite: 18 suites and 61 tests passed.
- Auth, Firestore, and Functions emulator smoke suite: passed with the upgraded dependencies.

The local machine currently has Node 24. The emulator's default 10-second discovery window can be
too short while it starts all Functions under that unsupported local version. Use Node 22 for normal
development. If Node 24 must be used temporarily, set `FUNCTIONS_DISCOVERY_TIMEOUT=60000` for the
emulator command; this does not alter the deployed runtime.

## Remaining upstream advisories

`npm audit --omit=dev` currently reports 66 client advisories: 50 high and 16 moderate. The critical
`shell-quote` advisory is resolved. The remaining reports are transitive dependencies in the current
Expo/Metro/Jest toolchain, the latest available `node-forge`, and Firebase Firestore's Node gRPC path.
OpoCompit does not enable the Firestore client in its current auth-only Firebase mobile adapter.
Forcing the audit suggestions would cross the Expo SDK compatibility boundary or downgrade the
current Firebase JavaScript SDK, so those changes are deferred until compatible upstream releases.

The Functions tree reports two moderate advisories through the optional Cloud Storage chain
`firebase-admin -> @google-cloud/storage -> gaxios -> uuid`. OpoCompit does not call Cloud Storage,
and the latest Firebase Admin release still contains that chain. It remains monitored rather than
being overridden across an incompatible major version.

## Release guardrails

- Do not run `npm audit fix --force`; it can install Expo or Firebase versions that are incompatible
  with the application.
- Run both production dependency audits again immediately before generating the production AAB.
- Re-run Expo Doctor, all automated tests, and the complete emulator suite after any Expo, React
  Native, Firebase, or Node runtime upgrade.
- Treat a new critical runtime advisory as a release blocker until it is fixed or formally reviewed.
