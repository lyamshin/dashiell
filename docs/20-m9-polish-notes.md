# M9 polish — notes

*Branch `m9-polish`, off `main` after PR #32. Five things a player felt in M9 ("Deduction"), fixed in the order of how much they felt them. Screens are `docs/screens/m9p-*.png`.*

## In one paragraph

The confront picker is now a list of facts, one a line, under the person or place each is about. The person being confronted comes first, and what they told the detective sits at the top for reference. A row of names filters the list. Each fact is one part of a clue's rule line (`put x012 part 2 to Hauck`), and the judge asks whether *that part* breaks the story, not just the clue it came from. Rule lines say a thing once: "Sirkin was alive until at least 8:00", "A man in his thirties, a stranger to Rafferty: the third floor, 8:30–9:30", and a person's places sit under their name once. The grid labels places with two-letter tags (TF, SP, WU), listed in one line over the grid with the full names. A run of the same "not there" from the same witness is one strike across its half hours. The head counts read "1 in TF", and the key folds away. The whole evening fits at 1280 again. Hard-boiled gets one more call of slack, and the reasoning player stops confronting stories about hours nowhere near the crime. Together those take Hard-boiled from 69% to 84%.

## 1. The confront picker

| before | after |
|---|---|
| every clue in the notebook, its whole rule line a button, newest first | every *fact*: a clue's rule split into its parts (`Clue.ruleParts`), a line each |
| one flat list | grouped under the person or place it is about: the one being confronted first, then everybody else in the case's order, then places, then "When things happened". Within a group, by the first half hour it names |
| nothing of theirs on screen | "What Hauck told me": their account's spans, and anything said since when a fact was put, over the list. It is for reference and can't be picked |
| no way to narrow | "About: everybody · Hauck · Sirkin · …": a chip per person the facts name. A fact shows under a chip if it names that person anywhere, so "Hauck and Vitale: never in the same place" shows under both |
| "25 min" on every button | the cost once, in the line over the list. Who said a fact, or where it was found, sits small at the end of its line |

**Still a genuine choice.** Nothing is marked, and nothing is ordered by whether it breaks anything. The order depends only on whom or what a fact is about and when (test: sections run together, and the confronted person's section leads whenever there is one).

**Each fact still traces to its clue.** A part is `{ text, facts, people, place, byPlace? }`. `facts` indexes the clue's `establishes`, and every fact is in exactly one part (tested over 24 cases). The command is `put <clue id> part <n> to <name>`, or `confront <name> with <clue id> part <n>`. The confront record keeps `part`. Picking a fact already put is free and read back, as before, and now shows a tick. A command without a part judges the whole clue as before, so older saves and typed commands still work.

**The judge reads the part** (`partBreaks` in `src/game/m9.ts`, used by `judgeConfront`). It uses the solver on the notebook and never the truth. The part lands when it is what breaks the story:

- the clue narrowed to that part still breaks the claim; or
- the clue without that part no longer does.

If the clue breaks the claim only as a member of a written-out chain the solver's proof didn't use, the part lands when it names the person, or their claimed place at a claimed half hour. Everything else about judging is unchanged: first and second times, independence at the clue level, and "That doesn't touch anything I told you."

The page still reads the clue's own spoken sentence, so what the detective reads aloud stays in the page's register and the correspondence checker traces it as before. The close's place and hour come from the part that was put.

## 2. Rule lines say a thing once

`src/gen/logic/lines.ts`, `ruleParts` and `ruleOf`. The generator writes `rule` and `ruleParts` together (`applyRule`), so they can't drift apart.

| before | after |
|---|---|
| `Sirkin: the subway kiosk, 6:00–7:00. Still alive at 6:00. Still alive at 6:30. Still alive at 7:00. Sirkin: the third floor, 7:30. Still alive at 7:30. Sirkin: the speakeasy, 8:00. Still alive at 8:00. Crowninshield saw him.` | `Sirkin: the subway kiosk, 6:00–7:00; the third floor, 7:30; the speakeasy, 8:00. Sirkin was alive until at least 8:00. Crowninshield saw him.` |
| `Somebody who fits "a man in his thirties": the third floor, 8:30. Somebody who fits "a man in his thirties": the third floor, 9:00. Somebody who fits …: 9:30. Rafferty saw him; did not know him.` | `A man in his thirties, a stranger to Rafferty: the third floor, 8:30–9:30. Rafferty saw him.` (someone known by sight: "…, known to Rafferty by sight only: …") |
| `Hauck: the speakeasy, when the boxing match … happened. Hauck: the speakeasy, 8:30–10:00, 11:00.` | `Hauck: the speakeasy, when the boxing match … happened; the speakeasy, 8:30–10:00, 11:00.` |
| `Crowninshield says: the subway kiosk, 7:00. Crowninshield says: the third floor, 7:30. …` | `Crowninshield says: the subway kiosk, 7:00; the third floor, 7:30; the speakeasy, 8:00–9:30.` |
| `Grasso: not the garage, 6:00–11:30.` | `Grasso: not at the garage, 6:00–11:30.` |

Repeated head counts in one clue become one span, and "Over by" keeps the earliest. The rules list keeps one line per clue. Head counts are one clue per half hour in the generator. Merging them into one clue would change the findable set, par and every Medium and Hard-boiled case, so they stay one line each.

**The notebook** now writes half hours that run on as one line when they come from one source, at or not at one place: "9:00–10:00 PM — not at the third floor (Rafferty)" (`buildNotebook`). **The grid** merges runs of strikes (§3). **The picker** shows the parts, already folded.

## 3. The grid

- **Places are two-letter tags** (`placeTags` in `src/game/grid.ts`), the way a logic-game solver writes them on a diagram:
  - two words give their initials: third floor TF, subway kiosk SK, my office MO, Mrs. Teague's MT;
  - one word gives its first two letters: speakeasy SP, walk-up WU, Wyckoff WY;
  - a clash takes the next free letter.

  Every chip has the full name on hover, and the places are listed in one line *over* the grid ("■ TF third floor ■ SP speakeasy …, WU walk-up — the scene"). The pencil's buttons use the short full name. The typed grid (`npm run read -- --grid`) keeps its old six-letter labels (`GridPlace.abbrev`).
- **Every half hour is the same width** (`table-layout: fixed`). At 1280 the whole evening fits in the 548 px the notebook gives it: name 80 px, then 12 × 39 px. On a phone the grid scrolls inside itself, with the names sticky, as before.
- **Runs of strikes.** Consecutive half hours whose cells hold nothing but the same "not there", from the same witness or witnesses, become one strike across them. At five half hours or more it reads in full: "not at the third floor, 6–11:30, Rafferty". Narrower, it reads "not TF · R". A cell with anything else in it, a pencil mark or the victim's life line, and the selected cell, is never merged, and a run splits where a lit rule starts or stops. The notebook's window shades the part of the strike it covers. Tapping the strike opens its first half hour, with the pencil. Each cell carries `data-ticks`, and `check-grid.mjs` finds cells by it.
- **Head counts** read "1 in TF" in a row labelled "head count". Hovering spells it out: "1 person at the third floor, besides the one who works there".
- **The key** (chip styles, the strike, the band, the anchors, †) folds under "▸ Key", closed by default and kept closed or open across pages.
- The rules list's numbers sit on the first line of a wrapped rule.

## 4. Hard-boiled

**What was wrong.** `--reason-debug` on T5L2 found every failure ran out of calls, and two causes behind them:

1. The reasoning player confronted stories about hours nowhere near the crime. Seed 15: two calls on Ainsworth's 11:00 lie and one on Sweeney's 6:30 lie, for a crime at 8:00, and then it was one call short of the confession the case needed.
2. Even a player that wastes nothing lands a call or two short when the par route leans on a confession. The confession is two confrontations plus a second, independent fact, and the ladder's six calls of slack were set before confessions existed.

**What changed.**

- **Game: Hard-boiled's slack goes up by one call** (`DeductionDials.extraSlack = 1` on `DEDUCTION_HARD`, so Over easy too, through `logicSlackFor`). Tiered cases only: the no-options case, which also uses `HARD_BOILED`, keeps its budgets byte for byte. Par, the par set and case selection are unchanged.
- **Measuring stick: the reasoning player only confronts a story that touches the notebook's window of the crime, or the half hour either side** (travel reaches that far). Breaking a story about 11:30 says nothing about who was in the room at 8. This is the player's question choice, which the engine notes had already named as the gap. Nothing about the case changed. `REASON_ALL_CLAIMS=1` turns it off.

I didn't make the par route prefer cheaper second contradictions. Cheaper routes lower par, which lowers the budget with it, and the player would be squeezed again. Par already counts a confession's two confrontations and the clues of both routes (`select.ts`, "Confessions the par route leans on"), so there was nothing left to count.

**The design test** (`npx tsx scripts/diagnose-play.ts --design --seeds 100`, Precinct; Raw is locked to Beat):

| tier | marks-follower names the culprit (before → after) | reasoning player: who, when and column right, within budget (before → after) | button-pusher (before → after) | reasoning player: median calls to solve (budget) |
|---|---|---|---|---|
| Raw (T0) | 83% → 83% | 100% → 100% | 48% → 48% | 5 (7) |
| Coddled (T1L2) | 82% → 82% | 100% → 100% | 32% → 32% | 7 (9) |
| Poached (T2L2) | 32% → 32% | 97% → 97% | 23% → 23% | 9 (12) |
| Soft-boiled (T3L2) | 28% → 28% | 98% → 98% | 26% → 26% | 11 (16) |
| Medium (T4L2) | 24% → 24% | 87% → 87% (who 89%, column 94%) | 17% → 17% | 15 (19) |
| Hard-boiled (T5L2) | 20% → 20% | **69% → 84%** (who 88%, column 94%) | 17% → 17% | 23 (26; was 25) |

**Where Hard-boiled's 15 points came from**, measured with each change on its own. The parts picker costs a point, because the player now has to name the part that breaks the story.

| | reasoning player, T5L2 |
|---|---|
| main (PR #32) | 69% |
| + the picker a part at a time | 68% |
| + one call of slack only | 71% |
| + the player's window rule only | 79% |
| + both (this branch) | **84%** |

The marks-follower stays at 20–32% from Poached up (≤50%), and the reasoning player is at 84% or over at every tier (≥80%). Both targets are met.

## 5. Run length

Median calls the reasoning player used on the runs it solved, 100 seeds at Precinct: Raw 5, Coddled 7, Poached 9, Soft-boiled 11, **Medium 15**, **Hard-boiled 23**.

**Hard-boiled is over 20.** Medium isn't. At about 20 minutes of reading a call, Hard-boiled is a long night. Ways to shorten it, not built:

1. **Put two facts at once.** A confession costs two confrontations. Let the second fact ride on the first visit ("And there's this.") for one call: the player still has to pick two independent facts that each land, and a wrong second one costs a call as now. That saves one call per confession, which is 1–2 per Hard-boiled night.
2. **Evening accounts come with the first question.** Every column needs the suspects' own accounts, which costs a call each (2.5 a night on the oracle's route). If the first question to a suspect also takes down their evening, the dead calls go and nothing about the logic changes. That saves 2–3 calls.
3. **A watcher's door in one question.** "Ask Rafferty about the third floor" would give all of a watcher's head counts and empty spans, which are several clues today, in one answer. Their facts are about one place and one person's word, so the grid shows them the same. That saves 1–2 calls.
4. **Lower Hard-boiled's par ceiling** from 22 to about 18. Generation retries more, which it can afford: Hard-boiled takes 0.15 s a case. It would take out the longest nights without changing any rule.

Numbers 1 and 2 together would bring the median to about 19 without making the deduction easier: the same facts have to be found and combined.

## What changed where

| file | what |
|---|---|
| `src/gen/logic/lines.ts` | `ruleParts`, `ruleOf`, `applyRule`, `RulePart`; the folding in §2 |
| `src/gen/logic/rules.ts`, `src/gen/generate.ts` | every rule written with its parts; descriptions name their witness in the line |
| `src/gen/types.ts` | `Clue.ruleParts` |
| `src/gen/shape.ts`, `src/gen/logic/check.ts` | `DeductionDials.extraSlack`, `logicSlackFor` (tiered only) |
| `src/game/m9.ts` | `partsOf`, `pickFacts`, `partRef`, `partBreaks`; `judgeConfront(…, part)`; `ConfrontRecord.part` |
| `src/game/parser.ts`, `types.ts`, `reducer.ts`, `scene/*`, `voice/page.ts` | `put x part n to Name`; the part on the command, the record and the page's close |
| `src/game/choices.ts` | the grouped picker, `reference`, `filters`; a fact already put shows a tick |
| `src/game/notebook.ts` | spans in a person's facts |
| `src/game/grid.ts` | `placeTags`, `GridPlace.tag` |
| `src/ui/choices-view.ts`, `book.ts`, `m9.css` | the picker's reference, filter, groups and one-line facts |
| `src/ui/grid-view.ts`, `grid.css`, `m9.css` | tags, equal columns, runs of strikes, head counts, places line, folding key |
| `scripts/diagnose-play.ts` | the part put; the window rule; median calls to solve in `--design` |
| `scripts/m9-routes.ts`, `check-m9.mjs`, `check-grid.mjs` | parts; `--prefix`; the reference and filter checked and shot; cells by `data-ticks` |
| `test/m9-polish.test.ts` (new, 9 tests), `test/m7-helpers.ts` | below |

## Checks

- **Tests:** 40 files, 776 tests, all passing (39 and 767 on `main`). `test/m9-polish.test.ts` covers:
  - rule lines say a thing once, and parts partition every clue's facts;
  - the picker: every clue in hand, a part at a time; grouped, with the confronted person first; the reference shown; nothing marked; every command parses to a part in hand;
  - the judge: a part that breaks the story lands, and a line beside it in the same clue does not;
  - the parser;
  - the culprit never admits when facts are put a part at a time;
  - beat coverage and correspondence on every page a part put writes;
  - two-letter tags are unique;
  - notebook facts come as spans.
- **Beat coverage** is 100% (1,398 of 1,398 tiered night pages, 273 confrontations, plus the new part-by-part walk), and **correspondence** finds 0 violations.
- **Plain terms:** `npm run decks` reports 0 banned terms, and the plain-terms test passes.
- **`tsc` and `vite build`** are clean.
- **Browser:**
  - `check-m9.mjs` passes seed 3 at Medium and at Hard-boiled, at 1280×800 and 390×844. It now also checks that the picker shows what they told the detective, and that the filter narrows the list.
  - `check-grid.mjs` passes the old difficulty-2 case: the whole evening fits at 1280 (548 of 548 px), and the page never scrolls sideways.

Screens: `docs/screens/m9p-{medium,hard}-{1280,390}-{1..9}-*.png`:

1. picker
2. confront-right
3. confront-wrong
4. grid
5. grid-linked
6. report-form
7. verdict
8. curtain-proofs
9. picker-filtered
