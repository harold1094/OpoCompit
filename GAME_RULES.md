# Game Rules

## Question Eligibility

A question is eligible when:

- `status == published`.
- `verified == true`.
- `oppositionId` matches the user selected opposition.
- At least one question `territoryKeys` value matches one of the user's allowed territory keys.
- `validUntil` is null or in the future for current training modes.

Official historical exams are different: an exam can include historical questions even if they are no longer eligible for normal training.

## Territory Keys

The first firefighter vertical slice uses these keys:

- `ES`
- `ES-MC`
- `ES-MC-Murcia`
- `ES-MC-Cartagena`

The quick game accepts national, technical, autonomic, provincial, and municipal questions that match the user's selected scope.
Custom tests can keep that inherited scope or explicitly include compatible questions from all of
Spain. They can also filter by category, difficulty, and personal question history.

## Scoring

Default non-official quick mode:

- Correct: `+1`
- Incorrect: `0`
- Blank: `0`

Official exams and simulations use configurable rules:

- `correctPoints`
- `incorrectPenalty`
- `blankPoints`

The official-exam configuration also fixes the question count and duration. The server stores a
snapshot of those rules when the session starts, calculates the final points, and rejects late or
repeated submissions. A short 30-second transport margin prevents normal network latency from
invalidating an answer sent at the deadline.

## Quiz Interaction

- Every question shown in the current quick-match and duel flows requires an answer.
- Selecting an answer records it and advances immediately to the next question.
- Players cannot return to earlier questions during the match.
- Selecting an answer on the last question submits and finishes the match automatically.

Official exams and simulations use a reviewable interaction instead: players can move backward or
forward, mark a question blank, and explicitly submit. Unanswered questions are scored as blank when
time expires. Custom practice keeps the immediate-advance interaction.

## Error Review

- Incorrect and blank answers enter `Mis errores`.
- The review session uses only published, verified questions compatible with the current profile.
- Correct answers remove a question from the pending review list; another miss keeps it there.
- Selection, correction, rewards, and mastery updates are validated by the server in Firebase mode.

## XP

MVP local formula:

- `10 XP` per correct answer.
- `20 XP` for completing a valid quick match.
- `10 XP` bonus for at least 80% accuracy.

Server phase: Cloud Functions calculate and persist XP.

## Coins

MVP local formula:

- `2 coins` per correct answer.
- `5 coins` for completing a valid quick match.

Coins buy cosmetics only. They do not buy academic advantage.

## Classic Duel

- Both competitors are measured against the same ten-question set.
- The player with more correct answers wins.
- Equal scores are resolved by the lower completion time; an equal time is a draw.
- Training opponents are server-defined profiles with fixed score and time values.
- A win adds `20 XP` and `10 coins`; a draw adds `10 XP` and `5 coins` to the normal quiz reward.
- Duel questions also advance answer and accuracy missions, but do not count as a quick match.
- The server owns scoring, rewards, elapsed time, and final outcome in Firebase mode.

## Level

MVP formula:

```text
level = floor(sqrt(totalXp / 100)) + 1
```

The formula is intentionally configurable in the backend phase.

## Daily Streak

A valid academic activity is a completed quiz with at least one answered question.

Streak rules:

- Same local day: unchanged.
- Previous day: `currentStreak + 1`.
- Older or empty: reset to `1`.

## Daily Reward

- Uses the `Europe/Madrid` calendar day.
- Can be claimed once per user and day.
- Advances through a seven-day cycle and wraps to day one.
- Awards 25, 30, 35, 40, 50, 60, and 75 coins respectively.
- Day seven also awards one gem.
- Server claims are transactional and idempotent.

## Daily Missions

The MVP daily set is:

- Complete one quick match: `20 XP` and `10 coins`.
- Answer 30 questions: `30 XP` and `15 coins`.
- Get 15 correct answers: `35 XP` and `20 coins`.

Mission progress resets on the Madrid calendar day. In Firebase mode, quiz submission updates progress and callable Functions validate every claim.
