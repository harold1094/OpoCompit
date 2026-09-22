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

## Scoring

Default non-official quick mode:

- Correct: `+1`
- Incorrect: `0`
- Blank: `0`

Official exams and simulations use configurable rules:

- `correctPoints`
- `incorrectPenalty`
- `blankPoints`

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

