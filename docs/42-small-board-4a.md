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
