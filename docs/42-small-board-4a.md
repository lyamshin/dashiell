# Build 4a: the small-board puzzle stage

*2026-09-28. This builds the puzzle half of `docs/41-small-board.md` (the rules, approved by the designer). It stops before the book: no pages, no UI, and no changes to the v1 or v2 engines. The designer will judge from 4a's text output whether to build 4b (the book) this week.*

**Read first:**
- `docs/41-small-board.md`, the rules, which govern;
- `docs/golden/small-board-seed3.md`;
- `docs/golden/small-board-lost-watch.md`;
- `docs/34-puzzle-construction.md` §1 and §4, the research and the technique idea.

## What to build

### 1. A new module, `src/gen/board/`, beside the old pipeline

- **Board types:**
  - people: suspects, watchers, company-only witnesses, the client, the victim or owner;
  - places, each with a kind (home, bar, restaurant, theatre, club, work) and opening hours;
  - hours;
  - cells;
  - accounts;
  - watcher lists;
  - scene finds;
  - means, with an origin (place and hours available) and an effect delay;
  - case type and targets.
- **The truth simulation at board scale** (rules 1–3, 11–13):
  - Each suspect gets a sensible evening: a home, and work only during that place's hours. They make one or two moves, each with a stated reason (a short plain line: "closed up at eight and went for a drink").
  - The victim's or owner's evening fits too.
  - The means has an origin that the culprit and at least one innocent visited before the crime, with a real delay (chloral 20–60 min; a gun owned or borrowed, and seen earlier).
  - The scene finds tie the means to its origin (a label, a registration, a pawn ticket, an empty dome and a latch).
- **Lies, by the tier ladder** (rules 7–10, and the ladder table in docs/41):
  - The culprit lies about the crime hour.
  - From Poached up, one innocent lies about one hour to hide a secret, and admits it when confronted.
  - At Medium the culprit claims somewhere unwatched, and a side remark breaks it.
  - At Hard-boiled there are two liars together, or one face without a name.
  - **Every lie must collide with at least one true statement the player can get.**
- **Case types for 4a:** murder, lost item and lost pet. The affair is optional, if time allows, since its report ("where, with whom") fits the board naturally. A lost item or pet reports who, when, where it is now, and why. Where it is now must be findable (a watcher sees it change hands, or a find).

### 2. The solver and path

- **Techniques** are small and named:
  - **read-off:** an account or list says it;
  - **collision:** two statements disagree, one is a lie, and the true one wins by a watcher, or by a third account;
  - **confrontation:** put the colliding line, and the liar admits or refuses;
  - **access:** who was at the means' origin in time;
  - **elimination:** the unique one left with access and no true account at the crime hour;
  - **time window:** from the last sighting alive;
  - **unwatched claim broken by a side remark;**
  - **a face without a name** (Hard-boiled only).
- **Uniqueness** under the rules the player is taught: after resolving lies, exactly one person fits every target.
- **Tatham acceptance per tier:** a solver limited to the tier's techniques finishes, and one limited to the tier below does not. At Raw, just "finishes".
- **Par** is the number of questions on the cheapest path. Every question returns a whole account, a whole watcher list, or one search. Target par is 5–9. Budget is par + 3 at Raw, par + 2 at Coddled through Medium, and par + 1 at Hard-boiled. Walks are costed as today; report par in questions and walks.
- **Width by tier** (rule 17): count routes per rival, at least two per rival at Raw and Coddled, and exactly one at Hard-boiled.
- **Every clue interacts** (rule 15): each fact on the path shares a person, place or hour with another, and no single fact settles who.
- **The designed path** is output as an ordered list of steps, each with its question, what it gives, and what it connects to (the golden tables' shape), and the rivals each step removes.
- **The suggested order** (rule 18) is output alongside:
  - the scene first;
  - then whoever found the body, or last saw the victim alive;
  - then the watchers where the victim was, and at the means' origin;
  - then the people they name.

  The client is never a suggestion.

### 3. Fixtures from the goldens

Encode the two hand cases (seed 3 at Medium, and the lost watch at Poached) as fixtures in the new types, then test:
- the solver finds the golden's path;
- par is 7 plus a motive search for seed 3, and 6 for the watch;
- the rivals are right (Vitale and Steinbach for seed 3; Mrs. Pulaski and Szabo for the watch);
- the Tatham check places each fixture at its tier.

If the solver disagrees with a golden, say which is wrong. The goldens can have mistakes.

### 4. A reading tool

`npm run board -- --seed N --tier T [--type murder|lost-item|lost-pet]` prints, in plain text:
- the givens;
- the true board, as a people × hours table;
- the means (origin, window and delay);
- each account, as the person would say it, in one plain line per hour with company and reasons (template sentences are fine, since no decks are needed in 4a);
- each watcher's list;
- the scene finds;
- the lies, and what each collides with;
- the designed path;
- the rivals and their routes;
- par and budget;
- the technique rating.

The designer reads this to judge the puzzles.

### 5. A sweep

`npm run board-sweep -- --tier T --n 200` reports:
- the generation success rate;
- par (median and range);
- the tier-rating hit rate;
- routes per rival;
- the case-type mix.

It also runs invariant checks, and none may fail:
- no gaps;
- every lie collides;
- the answer is unique;
- the means' lead time holds;
- places are open when people are there;
- nobody lingers at a transit place.

## Limits

- **Don't touch** `src/game`, `src/ui`, the v1 and v2 generators, or decks, except to read place names or people from existing content.
- **Tests:** while working, run only the new tests (`npx vitest run test/board --minWorkers=1 --maxWorkers=3`). Run the **full suite twice**, at the start and at the end (check `pgrep -f vitest` first). The designer is watching usage this week.
- **Machine:** vitest takes at most 3 workers. Use at most one helper agent at a time, and only if needed. Never run `npm ci` or `npm install` in the main checkout.

## Done means

- The fixtures pass or the disagreements are explained.
- The sweep holds its invariants at every tier.
- You've read the `npm run board` output for three seeds per tier and judged it against docs/41 as an LSAT player would. Was it fair? Was it too easy or too hard? Were there too many steps?
- `docs/42` has a "Built" section recording what was built and what's still open.
- A PR is open against main, not merged.

## Built

*2026-09-28, branch `small-board-4a`. Nothing in `src/game`, `src/ui`, the v1/v2 generators or the decks changed. Names come from `src/gen/data/names.ts`.*

### What's there

- **§1, the module:** `src/gen/board/`.
  - `types.ts` has the board types.
  - `generate.ts` is the truth simulation and the lies by tier.
  - `content.ts` holds the place, job, motive and look pools.
  - `index.ts` generates and accepts the Tatham way, retrying up to 60 attempts.
  - Case types:
    - murder at every tier;
    - lost pet at every tier;
    - lost item at Raw to Poached (see deviations).
  - Hard-boiled builds both variants: the pair, and the face without a name.
- **§2, the solver and path:**
  - `solver.ts` holds the knowledge fixed point, with the nine named techniques. Two agreeing accounts count as a read-off below Hard-boiled (rule 10).
  - `path.ts` has the rest:
    - par, by an exact branch-and-bound over question sets;
    - the ordering with the fewest walks;
    - the designed path, step by step: the question, what it gives, what it joins, and the rivals it removes;
    - the suggested order (rule 18);
    - routes per rival;
    - the Tatham rating;
    - the interaction check.
- **§3, fixtures:** `src/gen/board/fixtures/` has:
  - `seed3.ts`;
  - `seed3Repaired` (see below);
  - `lost-watch.ts`.

  The tests are in `test/board/fixtures.test.ts`.
- **§4, the reading tool:** `npm run board -- --seed N --tier T [--type …]`. Add `--fixture seed3|seed3-repaired|lost-watch` to print a golden. `render.ts` prints every section §4 asks for, plus the invariants.
- **§5, the sweep:** `npm run board-sweep -- --tier T|all --n 200`.
- **Tests:** 92 new, in `test/board/`, which run in about 3 s.

### Fixtures: where the solver disagrees with the goldens

**Seed 3 (Medium).** The golden path solves it, and it names the right rivals: Vitale and Steinbach, two routes each. But:

- **Par is 4 plus the motive search, not 7.** The path is: the table, Hargrove, Rafferty, Marchetti.
  - Hargrove's list already has Vitale in the back room at nine. So golden steps 4–5 (ask Vitale, put it to him) clear nobody new.
  - Marchetti's refusal (step 7) adds nothing the report needs.
- **It rates Raw, not Medium.** Rafferty says "Nine and ten o'clock, nobody but me". That's an exhaustive list, and it breaks Marchetti's "home all evening" by plain collision, so the side remark is redundant.
  - `seed3Repaired` is the smallest fix. Rafferty goes up to bed at half past eight, so her list stops at eight, and only her side remark breaks "home".
  - Repaired, it rates Medium, with par 4.
- To make Vitale's confrontation matter, Hargrove mustn't be able to see the back room. Then only his admission places Vitale. The generator builds its innocent liars that way.

**The lost watch (Poached).** It names the right rivals: Mrs. Pulaski and Szabo. But:

- **The golden path doesn't finish.** It clears Mrs. Pulaski because "nothing collides with her account". The only thing that could collide with it is Mr. Pulaski, and the path never asks him. That's closed-world reasoning, and a player can't know the world is closed without asking.
  - Adding Mr. Pulaski finishes it.
  - The solver's par is 5: the mantel, Mulcahy, Oskar, Mrs. Pulaski (who names her husband), Mr. Pulaski.
  - Dombrowski isn't needed, because Mulcahy's list both breaks Oskar and clears Szabo.
- **It rates Raw.** Szabo falls to two lists, so his confrontation is never needed.
- **Two mistakes against its own truth table:**
  - Mulcahy's eleven o'clock omits Szabo. The fixture adds him, marked FIX.
  - Szabo's "home to bed at nine" lies about three hours, but rule 9 allows one. The invariant reports it.
- **It needs a watcher with a blind spot.** Dombrowski can't see across the hall. docs/41 has no such thing. `WatchList.unseen` exists only for this fixture, and the generator never uses it.

### The sweep (n = 200 per tier, seeds 1–200)

| tier | generated | tries | par median [range] | par in 5–9 | walks | rated at tier (accepted / first try) | routes per rival, mean (1 route : 2 : 3) | types | invariant failures |
|---|---|---|---|---|---|---|---|---|---|
| Raw | 100% | 1.1 | 3 [3–3] | 0% | 2 | 100% / 100% | 2.00 (0 : 400 : 0) | murder 91, item 55, pet 54 | 0 |
| Coddled | 100% | 1.2 | 3 [3–4] | 0% | 2 | 100% / 100% | 2.65 (0 : 71 : 129) | murder 91, item 55, pet 54 | 0 |
| Poached | 100% | 1.0 | 5 [5–6] | 100% | 3 | 100% / 100% | 1.91 (38 : 362 : 0) | murder 91, item 55, pet 54 | 0 |
| Soft-boiled | 100% | 1.9 | 6 [5–6] | 100% | 4 | 100% / 50% | 1.73 (107 : 293 : 0) | murder 91, pet 109 | 0 |
| Medium | 100% | 1.1 | 7 [6–7] | 100% | 4 | 100% / 100% | 1.74 (103 : 297 : 0) | murder 91, pet 109 | 0 |
| Hard-boiled | 100% | 1.6 | 7 [6–7] | 100% | 4 | 100% / 100% | 1.00 (600 : 0 : 0) | murder 91, pet 109 (face 128, pair 72) | 0 |

- Par counts questions. A murder also takes one motive search on top.
- The sweep checks these invariants on every accepted case:
  - no gaps;
  - every lie collides;
  - the answer is unique, and the full solver makes no contradiction;
  - the lead time holds;
  - places are open when people are there;
  - nobody lingers at a transit place;
  - lists and truthful accounts match the truth, company included;
  - an innocent lies about one hour only.

### Deviations, and why

1. **Par at Raw and Coddled is 3–4, not 5–9.** With one watcher, three suspects and width 2, the watcher's list clears both rivals and breaks the lie, so the scene, the list and the culprit's account settle it. docs/41's own Raw example is four with the motive. The accept floor is 3 at Raw and Coddled, and 5 above.
2. **Lost items are built at Raw to Poached only.**
   - A window needs an honest last sighting of the thing away from the scene.
   - A pet has one: the neighbour kept him for an hour, and the office names her.
   - A brooch doesn't. Whole-hour cells can't say "still there at half past nine".
3. **A refusal is never evidence.** The solver doesn't count the culprit's confrontation toward "who", and it isn't in par. A crack, in a small case at Poached or below, gives where it is now and why, not who. See rules problem 1 below.
4. **Company-only witnesses must be named before they can be asked,** by a list, an account's company, or the office. Once named, they're taken as truthful (rule 10). Nobody can ask for a person they've never heard of, and the goldens reach Mr. Pulaski this way.
5. **Rule 15's "shares an hour" is vacuous,** because every whole account covers every hour. The check is stricter: every question on the path must feed a deduction that uses another question, and no single question may settle who.
6. **Walks** count changes of place starting from the office. A person is found at their last hour's place, or at home when that place is the scene.
7. **The generator's evenings use homes, bars, clubs and an all-night Automat.** Work places and theatres exist in the types and the opening-hours invariant, and the seed 3 fixture has a surgery, but no generated case uses one yet.

### Where I think docs/41's rules go wrong

1. **A refusal is a tell.** Rule 9 has innocents always admit, and rule 8 has the culprit never admit. So from Poached up, a player can confront each caught liar and name the one who refuses.
   - Measured on 60 seeds a tier, that beats par by a median of 1–2 questions (up to 3).
   - It skips the tier's signature step, usually the rivals' clearing.
   - The fix is the designer's choice. For example, an innocent with a worse secret also refuses, and something else has to place them.
2. **Below Poached, only the culprit lies,** so any caught lie names them. At Coddled, a player who knows the ladder can skip the access question (it saves at most one).
3. **"Nothing collides, so it's true"** (the lost watch) needs a closed world. It's only sound once the company has been asked.
4. **Rule 7's "a list lacks the liar" and Medium's "somewhere nobody watches" pull against each other in the golden.** A landlady who says "nobody but me" is a watcher. For Medium, the house must be unwatched at that hour.
5. **The innocent liar is only a real rival if nothing else places them.** In both goldens a list already does, so their confrontation is decoration. The generator puts the innocent liar somewhere unwatched, so only the admission places them.

### What's open

- **4b:** the book, the pages, the UI, and a blind LLM playtest (`npm run play`). A solver's par isn't a player's.
- The prose is templates:
  - reasons, second lies and admissions are one-liners;
  - the culprit and the innocent liar often claim the same bar at the same hour, which reads alike across seeds (small cases from Soft-boiled vary it with the neighbour's house).
- Work places and theatres in generated evenings (work only during its hours, "closed up at eight").
- Lost items above Poached, if the designer wants them, need an honest last-sighting device.
- Rules problems 1 and 2 above need a decision before 4b. Until then, the Tatham ratings assume a player who doesn't use those shortcuts.
