# M9 — the engine half: notes

*Build plan item 2 of `docs/20-m9-deduction.md`, with `docs/20-m9-gen-notes.md` §13. Branch `m9-engine`, based on `m9-gen`; the PR carries both halves.*

## In one paragraph

A tiered case now plays as the logic game the generator deals. The player can put any fact in the notebook to anybody whose account is written down, and the generator's solver decides whether it lands. The grid shows every new kind of rule: anchored sightings in a margin row, strangers' sightings the player links by hand, a watcher's strikes and counts, pairs tied together, and accounts as the person's own word. The rules list is the generator's own `Clue.rule` lines. Ask buttons follow who knows whom. Rooms and things drop out except as leads, and a question that would get nothing new is free and says so. From Poached up the pages, the notebook and the grid never state a verdict. The monologue's theory is the player's pencil. From Medium up the report asks the full crime column and scores it a cell at a time, and behind the curtain it shows the rule chain for each answer. The lie rule is on the title page, in the help and in the first-run text.

## What changed where

| file | what |
|---|---|
| `src/game/m9.ts` (new) | Tier gates (`verdictsOn`, `confrontOn`, `columnAsked`); who knows whom (`nameKnown`, `displayName`); confront (`canConfront`, `confrontFacts`, `judgeConfront`, `saidRecords`, `confessedOf`, `solveNotebook`); `markedTheory`; the column (`columnPeople`, `truthColumn`); the curtain (`proofsFor`). |
| `src/game/types.ts` | `Command` `confront`, `PageShape`/`BeatKind` `confront`, `Report.column`, `RunState.confronts` and `RunState.links`. `storage.ts` loads both and drops a malformed one. |
| `src/game/parser.ts` | `put <clue id> to <name>` and `confront <name> with <clue id>`, for a clue in hand and a person present. |
| `src/game/reducer.ts` | The confront step (one action; the same fact again is free and read back). The account clue answers "that evening" in a tiered case. A question that would get nothing new costs nothing ("I've told you what I know."). |
| `src/game/derive.ts` | In a tiered case `claimedOf` is the account clue's claims and nothing more; a lead to an account is asked as "that evening". |
| `src/game/choices.ts` | A tiered case's ask topics are the evening, themselves, why I was hired, the people the detective can name, and open leads. Headings use what anybody can see until somebody who knows them says the name. There is a `confront` group per person whose account is held, never marked. |
| `src/game/scene/plan.ts`, `realize.ts`, `testimony.ts` (new) | The confront page shape: approach, the fact read aloud, the reaction card, their words, and the close. Testimony, accounts, a watcher's door, a stranger's description and the conditional are said in the witness's mouth from their facts, with `referenceOf`. |
| `src/game/scene/thought.ts` | New class `touches`, which says what a fact touches and never concludes. It comes in eleven bases. From Poached up, `clears` becomes `touches`/`placement`, and there is no `contradicts` and no "caught lying" view. There is also a `confronted` close. |
| `src/game/voice/reactive.ts` | `pencilOnly`: the theory is the pencilled suspect at the scene, with one remark on it and nothing computed. |
| `src/game/grid.ts`, `grid-text.ts`, `src/ui/grid-view.ts`, `src/ui/m9.css` | Margins, descriptions with `applyLink`, counts, links, `absentFrom` strikes, claims, anchors from `anchorAt`, said records, the flag off from Poached up, and the rules from `Clue.rule`. |
| `src/game/notebook.ts`, `transcript.ts` | Names by acquaintance, what was said when a fact was put, and "told me all of it". |
| `src/game/report-form.ts`, `scoring.ts`, `src/ui/report.ts` | The column (a select per suspect), scored per cell. The closing says which ones were right and gives partial credit when the name is right. The curtain has a "How it could be known" section. |
| `src/ui/book.ts`, `choices-view.ts`, `prose.ts`, `voice-data.ts` | The picker, the link tap, `LIE_RULE` on the title page (Poached up) and in the help and the first-run footnote. |
| `content/decks/confront.json` (new, 72 cards), `thought.json` (+35 `touches`), `activity.json` (+11, `place` tag) | Written against a brief by a content agent, checked by the validator. |
| `src/gen/logic/select.ts` | One generator fix, below. |
| `scripts/diagnose-play.ts` | The reasoning player, `--design`, `--reason-debug`, `--route reason --why`. The dumb players file with no monologue theory from Poached up. |
| `scripts/m9-routes.ts`, `scripts/check-m9.mjs` (new) | The browser check. |
| `src/cli/read.ts` | `--links "d091 10:00 Marchetti"` and `--file` after a `--route`. |

## Confront

- **Offered** from Poached up (`secretLies`) for anybody present whose own account is in the notebook. The picker lists every clue in hand that has a rule line, except their own account. It is never marked: a mark only on facts that land would be a verdict.
- **Cost:** one action. The same fact put to the same person again is free and read back.
- **Judged** by `judgeConfront`, using the generator's solver on what the notebook holds, including confessions heard:
  - **First time:** the pick lands if it is in a written-out way of breaking the lie that is all in hand, or in the rules the solver's proof rests on. Both soft and hard readings count.
  - **Second time:** it must be something new. It either breaks the second story (`contradictedBy`, or the solver on the new claim), or it still breaks the first story with the first fact set aside.
  - **Otherwise:** "That doesn't touch anything I told you."
- **Responses** come from `Case.logic.confrontations`.
  - The culprit never admits. The test holds this over 40 cases × every confrontation the case writes out.
  - An admission is only ever the second landing.
  - A withdrawal can come first, because a companion "hold or withdraw" on the first confrontation.
  - An admission or withdrawal is passed to the solver as `confessed`.
  - A second story goes on the grid as their own word and is never a solver fact.

## The generator fix

`routesFor` in `src/gen/logic/select.ts` took its first route from the whole findable set, whatever set it was asked about. So a par set holding one way of breaking a confessed lie was counted as holding two, and the par route could not get the confession under the spec's "second independent fact". Seeds 6 and 18 at Medium and 13 at Hard-boiled showed it. It now reads the first route off the set it is given. The M9 gen and solver tests still pass. Par grows by the second route where a confession is needed.

## Measurements

**Tests:** 39 files, 767 tests, all passing (748 on `m9-gen`). Beat coverage is 5,292 of 5,292 night pages on the old sweeps, and 1,397 of 1,397 on the new tiered runs, which include 273 confrontations. New:
- `test/m9-engine.test.ts`, 17 tests;
- `test/grid-walk.test.ts`, 2 new walks over tiered runs, with confrontations, links, margins and said records.

**Checks:**
- Beat coverage is 100%.
- The correspondence checker finds 0 violations over tiered runs with confrontations, and over the old sweeps.
- Plain terms are clean (`npm run decks`: 0 errors, 0 banned terms).
- `tsc` and `vite build` are clean.

**The design test** (`npx tsx scripts/diagnose-play.ts --design --seeds 100`). All configs are at Precinct except Raw, which is locked to Beat.

| tier | marks-follower names the culprit | reasoning player: who, when and column all right, within budget | button-pusher names the culprit |
|---|---|---|---|
| Raw | 83% | 100% | 48% |
| Coddled | 82% | 100% | 32% |
| Poached | 32% | 97% | 23% |
| Soft-boiled | 28% | 98% | 26% |
| Medium | 24% | 87% (who 89%, column cells 94%) | 17% |
| Hard-boiled | 20% | 69% (who 76%, column cells 89%) | 17% |

**The players:**
- **Marks-follower:** takes a marked question or search here, else a marked room, else anything. It files the one suspect the notebook's plain placements leave standing. When more than one is left, it takes the monologue's theory, which from Poached up is only the pencil and so empty, and otherwise guesses among the ones left.
- **Button-pusher:** the same filing. It presses "Put it to …" as one button and reads out any fact.
- **Reasoning player:** never reads the truth. In order, it:
  - goes to the scene;
  - puts a fact to somebody when the solver says a fact in hand breaks what they said, for anybody the grid still has open, walking to them if needed. A second time, it looks for what still breaks the story with the first fact set aside;
  - follows the marks;
  - searches each room once;
  - takes the evening of anybody who could still have been at the scene;
  - asks posted witnesses about them;
  - files what `crimeFromHeld` settles.

**Short of the target:**
- **Raw and Coddled:** the marks-follower wins 82–83%. These tiers keep verdicts and single-rule clears by design ("the first runs stay short and plain"), so the test applies from Poached up.
- **Hard-boiled:** the reasoning player solves 69%, against 80%. Its failures are near misses on budget: it spends 23.4 actions against a budget of about 25–29 and holds all but one or two par clues. The misses cluster where a confession needs a second, independent contradiction. This is the player's question choice, not the case: the oracle solves every one within par. A planner that picks questions by what the solver still needs would close it.

**The Targets table** (`--seeds 50 --configs T2L2,T4L2,T5L2`, with the real engine), in Poached / Medium / Hard-boiled order:

| measure | Poached | Medium | Hard-boiled | target |
|---|---|---|---|---|
| innocents cleared by one clue (facts / solver) | 33% / 33% | 22% / 24% | 14% / 18% | ≤30% |
| inference depth of the par route (formula / solver) | 2.0 / 3.4 | 3.0 / 4.3 | 3.5 / 4.9 | ≥4 |
| cases that need a two-clue combination | 100% | 100% | 100% | 100% |
| false statements among self-accounts on the par route | 0% | 18% | 25% | 20–30% |
| evening accounts on the oracle's route | 1.6 | 0.8 | 2.5 | ≥2 |
| "ask about a person" that can pay (any / a grid fact) | 100% / 84% | 97% / 62% | 97% / 51% | ≥60% |
| lead edges sharing a person with their source | 82% | 81% | 79% | ≥80% |
| button-pusher actions with no clue | 45% | 43% | 39% | ≤40% |
| marks-follower names the culprit | 22% | 23% | 25% | ≤50% |
| client points at the culprit | 0% | 0% | 19% (1/6 = 17%) | ≤ 1/suspects |
| pages with 5+ open leads | 0% / 0% | 1% / 0% | 4% / 0% | ≤10% |
| par routes that need a hypothesis | 0% | 0% | 100% | Hard-boiled 100% |
| first confrontation brings a second lie (culprit / innocents) | 77% / 64% | 71% / 70% | 69% / 72% | within 10 points |

The button-pusher's "no clue" share fell from the generator branch's 41–42% to 39–45%. The engine's "free when nothing new" questions are part of that. Pressing a free button counts as an action that found nothing, but it costs no time.

## The browser

`scripts/check-m9.mjs` plays seed 3 at Medium and at Hard-boiled to a filed report, at 1280×800 and at 390×844. At each size it:
- opens the picker;
- puts one fact that lands and one that does not, and checks for "That doesn't touch anything I told you.";
- links a stranger's sighting in the grid;
- fills every field and the whole crime column, files, and opens the curtain's proofs;
- checks the page never scrolls sideways.

All four runs pass. Screens are in `docs/screens/m9-{medium,hard}-{1280,390}-{1..8}-*.png`: picker, confront-right, confront-wrong, grid, grid-linked, report-form, verdict, curtain-proofs.

## Page bugs fixed (from Night Hone 1)

1. **"I had X's name before I had the face" while X is in the room.** The card now reads "X had been only a name in the notebook until now. Now the face was across the room from me." The view thought is only for people present.
2. **Pool-hall cards at the pawnshop.** Activity cards take an optional `place` tag. The three pool-hall counterman cards carry it, and eleven cards were added for the other counterman rooms (pawnshop, chop suey place, barber shop, hotel garage) plus generic ones.
3. **The same noise sentence repeated on one search.** The page says it once. The duplicate find becomes "The same thing turned up a second time." Every record stays in the notebook.
4. **A carried question and the dossier fact stating the same relation.** When they share two content words, the question asks by name ("Tell me about Lindemann.") and the witness says the relation once.
5. **Crowd strangers' surnames on the ask buttons.** Buttons, notebook entries and grid rows use "the man in his thirties" until the name is on paper.

## Where I judged

1. **Confront is offered on the account, not on a known conflict.** The spec's §3 offers it "when the grid shows a conflict", while the diagnosis section wants the payoff to depend on reasoning, "not on the game flagging the conflict". Offering it only when a real break is held would itself flag the conflict. So it is offered to anybody whose account is written down, from Poached up, and never marked.
2. **"Nothing new is free" is how exhaustion works.** Every pair has testimony, so a person is rarely out of clues. A question that would return nothing new costs nothing and says "I've told you what I know." The notebook marks somebody "told me all of it" when every question the detective can put to them has been put.
3. **A stranger is named once any page or record has named them.** Asking them anything names them on the page. The watcher and anybody the notebook already holds are named on sight, as before.
4. **The column is scored at the true half hour.** The form says "At <the hour you chose>, by the hour above". A wrong "when" costs its own point, and the column is still checked where it truly happened.
5. **The absence strike lights the whole column.** An `absentFrom` rule is drawn as a strike in every row but the ones it names, and its rule lights the column.
6. **The conditional is in the rules list and in the witness's mouth.** It strikes no cell, because the solver needs both halves and the grid would be concluding for the player.
7. **The solver's `when` proof lists the rules `Case.logic.solve.crimeTick` gives.** The coroner is a starting clue and sometimes does not appear in the chain.

## Known limits

- Hard-boiled's reasoning player is at 69% (above).
- Poached's par route has no false self-accounts (0/218). That is generator-side and unchanged.
- The typed transcript prints the confront picker as a count ("Put it to Hauck: 24 facts in the notebook").
