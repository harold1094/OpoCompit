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

## callable: `updateProfileSelection`

Responsibilities:

- Validate selected opposition and territory.
- Update user profile.
- Recompute territory keys.

## scheduled: `rebuildLeaderboards`

Responsibilities:

- Rebuild global, opposition, and territorial leaderboard snapshots.
- Write paginated ranking entries for cheap reads.

## firestore trigger: `onQuestionReportCreated`

Responsibilities:

- Notify admins/moderators.
- Increment report counters on the question.

## callable: `importQuestionBatch`

Admin-only.

Responsibilities:

- Validate JSON/CSV import payload.
- Create questions as `pending_review`.
- Store source metadata and duplicate candidates.
