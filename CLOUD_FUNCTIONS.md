# Cloud Functions For First Stage

These functions are the first server-authoritative layer once Firebase is connected.

## callable: `startQuickQuiz`

Input:

```json
{
  "oppositionId": "firefighters_es",
  "territoryKeys": ["ES", "ES-MC", "ES-MC-Cartagena"],
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

## callable: `claimDailyReward`

Responsibilities:

- Verify reward has not been claimed for the current reward day.
- Read reward config from Remote Config or `dailyRewards`.
- Update balances through transaction log.

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

