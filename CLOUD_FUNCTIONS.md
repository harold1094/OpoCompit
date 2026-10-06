# Cloud Functions For First Stage

These functions are the first server-authoritative layer once Firebase is connected.

## callable: `startQuickQuiz`

Input:

```json
{
  "questionCount": 10
}
```

Responsibilities:

- Verify authenticated user, including anonymous users.
- Resolve eligible published and verified questions.
- Create `quizSessions/{sessionId}` with selected question IDs.
- Return the session and sanitized question payload without `correctAnswerId`.

## callable: `submitQuizSession`

Input:

```json
{
  "sessionId": "quiz session id",
  "answers": [
    {"questionId": "q1", "selectedAnswerId": "a", "elapsedMs": 5200}
  ]
}
```

Responsibilities:

- Verify session ownership and status.
- Load authoritative question answers.
- Calculate score, XP, coins, streak, mission progress, and question stats.
- Append economy transaction logs.
- Update user aggregates transactionally.
- Mark session as validated.
- Return trusted result payload.

Each submitted attempt also updates `needsReview`: incorrect and blank answers set it, while a
later correct answer clears it.

For official-exam sessions it also validates the stored rules and server elapsed time, treats
omitted answers as blank, and returns rule-based points and the maximum possible score.

## callable: `startCustomQuiz`

Creates either a fast custom practice or an exam-style simulation. The server validates and applies
the requested question count, category, difficulty, profile/all-Spain territory scope, and
new/incorrect/completed history filter. It snapshots the filters in the session and never returns
correct answers before submission. Simulations also snapshot a duration and scoring rules so the
server can enforce the deadline and calculate penalized points.

## Official exam callables

- `getOfficialExams`: returns only published, valid exams for the user's selected opposition.
- `startOfficialExam`: verifies the exam and reviewed question set, snapshots its rules, creates the session, and returns questions without correct answers.

Official exam sessions preserve the configured question order, duration, scoring, and penalty.
Imported real exams remain unavailable until both the exam and every required question pass human
review and are explicitly published.

## Error review callables

- `getErrorReview`: returns a bounded list of unresolved mistakes compatible with the user's current opposition and territory.
- `startErrorReview`: creates a normal server-owned quiz session from up to 25 unresolved mistakes, optionally filtered by category, and hides correct answers until submission.
- `getLearningInsights`: aggregates bounded, server-owned question statistics by category and returns accuracy, pending review counts, and strongest and weakest topics.

## callable: `getAchievements`

Loads the active achievement catalog, evaluates profile and category milestones from trusted
Firestore aggregates, persists newly unlocked achievements, and grants configured XP, coin, and gem
rewards exactly once. The response includes the complete progress catalog and updated player balances.

## Notification callables

- `getNotifications`: returns the newest 50 enabled private in-app notices and a bounded unread count.
- `markNotificationsRead`: marks up to 50 owned notification IDs as read.

Friend requests, accepted friendships, duel invitations, accepted challenges, completed duels, and
achievement unlocks create deterministic notices inside the same trusted transaction as their event.

## Preferences and account privacy callables

- `getUserPreferences`: returns privacy-safe defaults merged with the user's stored controls.
- `updateUserPreferences`: accepts only known boolean settings and persists a partial update.
- `deleteCurrentAccount`: requires the exact `ELIMINAR` confirmation, removes private account data
  and Firebase Auth, anonymizes retained shared history, and transfers non-empty owned groups.

The client keeps vibration local behavior in sync with these settings. Analytics is disabled until
the user explicitly opts in, and notification categories are filtered on the server.

## callable: `startClassicDuel`

Input:

```json
{"opponentId": "training_mario"}
```

Responsibilities:

- Validate the authenticated player and server-defined training opponent.
- Select ten eligible questions from the player's opposition and territory.
- Create `duels/{duelId}` and return questions without answers or explanations.

## callable: `submitClassicDuel`

Responsibilities:

- Validate ownership, status, expiry, questions, and answer options.
- Score both sides and use server elapsed time as the tie breaker.
- Update quiz statistics, duel aggregates, missions, XP, coins, and economy logs atomically.
- Reject repeat submissions and return the trusted comparative result.

## callable: `claimDailyReward`

Responsibilities:

- Verify reward has not been claimed for the current reward day.
- Read reward config from Remote Config or `dailyRewards`.
- Update balances through transaction log.

## Social callables

- `setPublicUsername`: reserves a case-insensitive unique username transactionally.
- `searchUsers`: resolves an exact username and returns only its public profile snapshot.
- `getSocialOverview`: returns friends and pending incoming/outgoing requests.
- `sendFriendRequest`: creates one deterministic pending request per pair of users.
- `respondFriendRequest`: accepts or declines a request and creates the friendship atomically.
- `removeFriend`: removes a friendship after validating participation.
- `sendFriendDuelInvitation`: creates one active challenge per accepted friend pair.
- `respondFriendDuelInvitation`: accepts or declines a challenge and selects shared eligible questions.
- `openFriendDuel`: starts the authenticated player's individual timer and returns public questions.
- `submitFriendDuel`: validates one player's answers, waits when necessary, and atomically closes the duel when both players finish.
- `joinMatchmaking`: joins a private queue or transactionally pairs compatible players.
- `getMatchmakingStatus`: returns only the authenticated player's queue and duel state.
- `leaveMatchmaking`: cancels a waiting entry without interrupting an already matched duel.

Friend and matchmaking duels use identical questions, opposition compatibility, shared territorial scopes, and accuracy-before-time tie breaking. Matchmaking starts at a 100-point Elo range and widens with waiting time; the final result updates both ratings atomically. User documents, username reservations, and queue entries remain private. All social mutations run through callable Functions.

`getSocialOverview` also refreshes live friend profiles, calculates the overlap between both current
study streaks, and returns at most 20 recent friend activities. Friend reads remain capped at 50;
activity queries are split into at most two groups because Firestore `in` filters accept bounded UID
sets. Direct reads of `socialActivities` are denied so the server always enforces friendship privacy.

## Study group callables

- `getStudyGroups`: returns up to 20 active groups that contain the authenticated user.
- `createStudyGroup`: creates a private group, owner membership, and unique eight-character join code atomically.
- `joinStudyGroup`: resolves a private code and adds the authenticated user transactionally.
- `getStudyGroup`: validates membership and returns the group with a live XP ranking of its members.
- `leaveStudyGroup`: removes a member, or deletes an owner-only group and its join code.
- `createStudyGroupCompetition`: lets an owner or administrator start one 1-to-90-day competition scored by XP, questions, correct answers, or completed duels.

Users must have a public username and may belong to at most 10 groups. A group supports at most 50
members. Group documents, memberships, and code reservations reject every direct client read and
write so that callable Functions always enforce membership privacy. Owners cannot leave a non-empty
group through the normal leave action. Account deletion transfers ownership automatically so the
remaining members do not lose their group.

`scoreStudyGroupActivity` reacts only to server-validated quiz and duel activity. It applies the
trusted delta to each active group competition and writes a deterministic application marker, so a
retried Firestore event cannot score twice. Activity outside the stored start/end timestamps is
ignored, which freezes the final table without a paid scheduler or historical full-table scans.

## Avatar shop callables

- `getAvatarShop`: returns the bounded owned inventory, equipped modular loadout, and trusted balances.
- `purchaseAvatarItem`: validates the local catalog identifier, ownership, price, and currency balance before creating the inventory item and negative economy transaction atomically.
- `equipAvatarItem`: verifies starter or purchased ownership before updating the user's equipped slot.

The catalog and visuals ship with the application, so browsing the shop needs no Storage reads or
paid commerce infrastructure. Purchase document identifiers are deterministic, making repeat calls
idempotent and preventing a second deduction.

## Monetization callable

- `getMonetizationOverview`: returns at most 10 active plans, the server-owned entitlement, current gem balance, and bounded advertising policy.

Plan pricing and product identifiers are never decided by the client. A plan is purchasable only when
Firestore marks it purchasable and provides a real store product identifier. Advertising remains off
unless both the product configuration and provider-ready flag are enabled. Interstitial policy allows
only the results surface at a configured interval; quiz questions and duels are always excluded.

## Ranking callable

- `getRanking`: returns the all-time global, most-specific territorial, or friends ranking using server-owned XP aggregates.

The callable returns at most 25 public entries, calculates the viewer's position even when it falls outside the top, and limits friend reads to 50 accepted relationships. Scheduled snapshots remain a future optimization for weekly and monthly rankings.

## callable: `updateProfileSelection`

Responsibilities:

- Validate selected opposition and territory.
- Update user profile.
- Recompute territory keys.

## future scheduled: `rebuildLeaderboards`

Responsibilities:

- Rebuild global, opposition, and territorial leaderboard snapshots.
- Write paginated ranking entries for cheap reads.

## Question quality callables

- `reportQuestion`: accepts one of the five supported quality reasons, stores a private server-owned
  report, and deduplicates equal reports from the same user, question, reason, and day.
- `getQuestionReportsQueue`: returns at most 50 open reports to admins with current question context.
- `resolveQuestionReport`: lets an admin dismiss the report, close the question's current validity
  window while preserving historical exams, or disable the question completely.

Current practice, error review, and duel callables enforce `validFrom` and `validUntil`. Official exam
sessions intentionally ignore those dates so an old exam can still be reproduced exactly.

## callable: `importQuestionBatch`

Admin-only.

Responsibilities:

- Require an authenticated user whose private profile has the `admin` role.
- Validate JSON batches of up to 100 questions, answer options, sources, dates, and territorial scope.
- Reject verified or published content and inactive or missing oppositions.
- Generate stable identifiers and content fingerprints when identifiers are omitted.
- Create all questions transactionally as `draft` or `pending_review`, always with `verified: false`.
- Store an immutable `questionImportBatches/{batchId}` audit record and make exact retries idempotent.
- Reject existing question identifiers and a reused batch identifier whose content has changed.

The admin interface also converts CSV locally into this same validated JSON contract. Converted
content remains visible for inspection and still passes through every server validation above.

## Admin review callables

- `getQuestionReviewQueue`: returns at most 50 complete `draft` and `pending_review` questions to admins.
- `reviewQuestion`: validates corrected content and transactionally saves, publishes, or disables it.
- `bulkReviewQuestions`: atomically publishes or disables between 1 and 50 selected pending questions.
- `getAdminCatalog`: returns the bounded opposition, territory, category, and official-exam catalogs.
- `upsertAdminCatalogItem`: validates catalog edits, linked oppositions, and category parent relationships.
- `getAdminOperations`: returns missions, daily rewards, shop items, Premium plans, and app configuration.
- `upsertAdminOperationItem`: validates and audits operational configuration before it reaches players.
- `bootstrapEmulatorAdmin`: promotes only the current local emulator user; deployed environments always reject it.

Publishing sets `verified: true`, `reviewedBy`, and `lastReviewedAt`. Saving keeps the question out
of game sessions, while disabling removes it from the active review queue. Bulk publication verifies
that every opposition remains active before writing any question, so a partial batch cannot leak into play.
The queue includes exact fingerprint matches, and both individual and bulk publication reject active
duplicates until an administrator disables the redundant record.

Active mission and reward documents are loaded before trusted quiz or duel transactions. Shop prices
and currency are also read server-side before purchase, while Premium-only items require a current
server-owned entitlement. Empty development collections fall back to the bundled safe defaults.
