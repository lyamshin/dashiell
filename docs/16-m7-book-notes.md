# M7 — Shape: the book half

Branch `m7-tiers-book`. What `docs/16-m7-tiers.md` asks of the book under
"What the book needs": the profile, the title page, the closing page, and the
save that remembers its tier. The generator half is `docs/16-m7-notes.md`.

## What was built

| | Where |
|---|---|
| The profile | `src/game/profile.ts`: `Profile`, `recordRun`, `fileToProfile`, `loadProfile` / `saveProfile` / `sanitizeProfile`, `isUnlocked`, `unlockedTiers`, `lockedTiers`, `withCurrent` |
| Opening a case | `caseOptions`, `pickOfRun`, `runMatches`, `levelFor` in the same file. `CasePick` is `{ tier?, level }`, and no tier means the untiered case |
| The URL | `pickFromParams` / `paramsForPick`. `?seed=3&d=2` is today's untiered case, and `&t=0..5\|over-easy` makes it tiered |
| The save | `RunState.tier?` and `RunState.level?`, set by `newRun` from `case.shape` / `case.ladder` for tiered cases only. `isRunState` accepts them when absent and refuses a tier that isn't one |
| Title page | `titlePage()` in `src/ui/book.ts`: current tier and level, the rule, tier and difficulty choices, the ladder of tiers with the locked ones marked, and "Go back to it" for a case still open |
| Closing page | `TierNews` / `tierNewsLines` in `src/ui/report.ts`, drawn under the closing paragraphs |
| The rule lines | `rule` on each preset in `src/gen/shape.ts` |
| Tests | `test/m7-book.test.ts`, 35 tests |
| Browser check | `scripts/check-unlock.mjs` (new). `scripts/check-layout.mjs` and `scripts/oracle-commands.ts` take `--tier` |

### The profile

Stored under `localStorage['dashiell:profile']`:

```ts
{
  version: 1,
  cleared: TierKey[],                          // in tier order
  best: { [tier]: { level, parDelta } },       // cleared tiers only
  runs: number,                                // reports filed
  wins: number,                                // full-credit reports
  current: { tier, level },                    // what the title page opens on
}
```

- **Cleared** means a full-credit report (`points === asked`, with `asked > 0`)
  at any level.
- **Unlocking.** Raw is always open. Any other tier opens once some cleared
  tier is at or past the one before it. Clearing Hard-boiled opens Over easy.
  Losing never locks anything.
- **Best** keeps the highest level cleared and the lowest par delta
  separately, so the two can come from different runs. The par delta is
  actions used minus the game's par, the same number the verdict judges.
  Negative means under par.
- **Raw is recorded at Beat** whatever level was asked for. `levelFor` applies
  this everywhere: dealing, the URL, recording and resuming.
- **Every read and write is wrapped.** A store that throws loads an empty
  profile, saves nothing, and still plays. `sanitizeProfile` keeps only what
  makes sense: known tiers, bests for cleared tiers only, wins capped at runs,
  and a current tier that is actually open. The detective's name read and
  write in `book.ts` are wrapped now too.

### Resume

A save now records `tier` and `level`. `runMatches(saved, seed, pick)` resumes
only into the same seed, the same tier (none for a pre-M7 save) and the same
played level. `pickOfRun(saved)` gives back `{ tier, level }` for
`generateCase`. A save with no tier gives `{ level: difficulty }`, which deals
the untiered case byte for byte. Tests cover all three: a tiered save
regenerates its own case and not the untiered one on the same seed, an old
save loads and regenerates the untiered case, and a Raw save resumes from a
link that asks for any level.

## The six rule lines

| tier | rule |
|---|---|
| Raw | This time: three people, three rooms, and one name to put on the report. |
| Coddled | This time: four people, and the report asks how it was done. |
| Poached | This time: somebody else is lying too. |
| Soft-boiled | This time: the coroner gives an hour, not a half hour, and the scene can lie. |
| Medium | This time: more than one of them had a reason, and a reason is not proof. |
| Hard-boiled | This time: the one paying you might have done it. |
| *Over easy* | This time: eight people, eight rooms, and three of them lying about the half hour. |

The generator half had drafts of these without the colon, and Raw's didn't
start with "This time". No snapshot hashes them. Untiered cases carry no
shape, and the identity test covers only those.

## Numbers

- **Tests:** 29 files, 600 tests, all passing: 565 before this branch and
  35 new. `tsc --noEmit` and `npm run build` are clean.
- **Report fields per tier** (test): Raw through Over easy, with 6 seeds per
  tier (3 for Over easy) at Beat and at the DA's Office (Raw at Beat only).
  In every case the form's fields are exactly `act.unknowns`, at least one is
  asked, every field falls inside the tier's `reportFields`, and Raw asks only
  `who`. This already held, since `fieldsFor` reads `act.unknowns` and the
  generator applies the ceiling.

### In a real browser

`scripts/check-unlock.mjs` uses playwright-core and the installed Chrome, with
empty storage, at 1280×800 and 390×844. It checks:

1. The title page opens on "Raw, at Beat" with Raw's rule. There is no
   difficulty choice and no tier choice. Coddled through Hard-boiled are
   listed as locked, and Over easy is not listed.
2. "Open the case" deals `?seed=1&d=1&t=0`. The notebook header reads
   `case 1 · Raw · Beat`.
3. Half-way through, a reload resumes the tiered run on the same page, and
   the title page's "Go back to it" does too.
4. The oracle's commands are clicked as buttons, then "File the report". The
   form asks one question, *Who killed Tramonti*, and it's filed with the
   right answer: "1 out of 1." The closing page says "Raw is cleared.
   **Coddled is open now.**" followed by Coddled's rule.
5. "Open another case" goes to the title page, on "Coddled, at Beat". The tier
   choice now offers Raw and Coddled. The difficulty choice is back with the
   four rungs by name. The ladder shows Raw "cleared at Beat, 1 under par",
   Coddled open and four still locked. All of this still holds after a
   reload. Choosing Raw again hides the difficulty choice.

There is no horizontal scroll anywhere. On the phone every title-page
control and verdict button is at least 44 px. Seeds 1 and 7: **PASS, 76 of
76 checks each.** Before the fix below, the only failures were the phone's
title inputs (32–33 px) and verdict buttons (42 px).

`scripts/check-layout.mjs` walks the oracle's route and runs the M6 assertions
on every page at both sizes. All pass:

| run | pages per size | result |
|---|---|---|
| Raw, seeds 1–10 (`--tier 0 --difficulty 1`) | 61 | PASS |
| Coddled at Precinct, seeds 1–5 | 37 | PASS |
| Medium at the DA's Office, seeds 1–5 | 58 | PASS |
| untiered `?seed=&d=2`, seeds 1–5 | 69 | PASS |

The untiered run can only pass if the old links still deal the old cases,
because every click is the untiered oracle's next command.

**Blocked storage:** with `window.localStorage` set to throw, the title page
renders on Raw, a case opens, a report files, and the title page comes back.
There are no page errors.

Screenshots are in the session scratchpad and not committed. To rerun:

```
npx vite --port 5186 &
node --import tsx scripts/check-unlock.mjs --url http://localhost:5186 --seed 1 --shots out/unlock
npx tsx scripts/oracle-commands.ts --seeds 10 --tier 0 --level 1 > out/routes-raw.json
node scripts/check-layout.mjs --routes out/routes-raw.json --url http://localhost:5186 --tier 0 --difficulty 1
```

## Where I judged differently from the spec, or filled a gap

1. **"Open another case" goes to the title page.** It used to deal a random
   seed at the same difficulty. Now the title page is where the tier is
   chosen and where a newly opened tier shows, so it's one click further.
2. **The title page is always tiered.** Untiered cases open only from a link
   (`?seed=&d=` with no `t=`). The seed field defaults to a random seed and
   is no longer read from the URL, since the title page only shows when the
   URL has no seed.
3. **Untiered cases count as runs, and as wins on full credit, but clear no
   tier.** Otherwise an old Hard-boiled-shaped link would unlock Over easy
   from a fresh profile.
4. **A link straight to a tier counts.** Clearing `?t=3` on a fresh profile
   opens Coddled through Medium. The rule is "a tier opens once any cleared
   tier is at or past the one before it", which never takes a clear back and
   never leaves a gap below a cleared tier.
5. **Unlocking moves the title page to the new tier.** It keeps the level the
   player last chose. Choosing Raw doesn't overwrite that level, because Raw
   is always Beat.
6. **Runs are counted when a report is filed.** An abandoned case isn't a run.
   Reopening a filed case's URL shows its verdict again and doesn't count
   twice.
7. **The closing page speaks only when something changed.** It shows "X is
   cleared. **Y is open now.**" plus Y's rule on an unlock, and "X is
   cleared." on a first clear that opens nothing (Over easy). A repeat clear
   says nothing. The unlock line isn't shown again when a filed case's URL is
   reopened, because the profile already holds it.
8. **Over easy is not listed as locked.** It first appears on the ladder when
   it opens, as the post-game.
9. **The tier choice is a dropdown shown once two tiers are open.** With only
   Raw open, the tier and the difficulty are plain text. Raw shows "Beat" as
   text rather than a choice.
10. **"Go back to it".** A case still open in the save is offered on the title
    page and dealt again from the save's own tier and level. This is the
    resume path the M7 notes asked for. Before, resuming meant retyping the
    seed or keeping the URL.
11. **`d=4` works on an untiered link.** It is Hard-boiled at the DA's Office,
    which is what `generateCase(seed, { difficulty: 4 })` deals.
12. **The notebook header** reads `case 3 · Coddled · Precinct` for a tiered
    case and `case 3 · difficulty 2` for an untiered one, as before.
13. **Phone tap targets.** `.open-case`, `.plain-button` and the title page's
    inputs and selects get `min-height: 44px` under 600 px. The M6 check only
    measured choice buttons, and these were 32–42 px.

## Seen in passing, not touched

- The closing page's par line still lowercases its whole sentence: "1 out of
  1, and it took me 4 calls. the book says 5. i will not be telling
  anybody." (`c.par.toLowerCase()` in `src/game/scoring.ts`). It shows on
  every solved Raw case, right above the unlock news. The generator notes
  flagged it too. The fix is to lowercase only the first letter.
- On the desktop, choice buttons are 36 px (the M6 check only holds the phone
  to 44). Unchanged.
