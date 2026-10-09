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

1. **Par at Raw and Coddled is 3–4, not 5–9.** With one watcher, three suspects and width 2, the watcher's list clears both rivals and breaks the lie, so the scene, the list and the culprit's account settle it. docs/41's own Raw example is four with the motive. The accept floor is 3 at Raw and Coddled, and 5 above. *(Superseded: two watchers now, and the floor is 4. See Decisions applied.)*
2. **Lost items are built at Raw to Poached only.**
   - A window needs an honest last sighting of the thing away from the scene.
   - A pet has one: the neighbour kept him for an hour, and the office names her.
   - A brooch doesn't. Whole-hour cells can't say "still there at half past nine".
3. **A refusal is never evidence.** The solver doesn't count the culprit's confrontation toward "who", and it isn't in par. A crack, in a small case at Poached or below, gives where it is now and why, not who. See rules problem 1 below.
4. **Company-only witnesses must be named before they can be asked,** by a list, an account's company, or the office. Once named, they're taken as truthful (rule 10). Nobody can ask for a person they've never heard of, and the goldens reach Mr. Pulaski this way.
5. **Rule 15's "shares an hour" is vacuous,** because every whole account covers every hour. The check is stricter: every question on the path must feed a deduction that uses another question, and no single question may settle who.
6. **Walks** count changes of place starting from the office. A person is found at their last hour's place, or at home when that place is the scene.
7. **The generator's evenings use homes, bars, clubs and an all-night Automat.** Work places and theatres exist in the types and the opening-hours invariant, and the seed 3 fixture has a surgery, but no generated case uses one yet. *(Superseded: see Decisions applied, decision 4.)*

### Where I think docs/41's rules go wrong

1. **A refusal is a tell.** Rule 9 has innocents always admit, and rule 8 has the culprit never admit. So from Poached up, a player can confront each caught liar and name the one who refuses.
   - Measured on 60 seeds a tier, that beats par by a median of 1–2 questions (up to 3).
   - It skips the tier's signature step, usually the rivals' clearing.
   - The fix is the designer's choice. For example, an innocent with a worse secret also refuses, and something else has to place them. *(Decided that way: see Decisions applied, decision 1.)*
2. **Below Poached, only the culprit lies,** so any caught lie names them. At Coddled, a player who knows the ladder can skip the access question (it saves at most one).
3. **"Nothing collides, so it's true"** (the lost watch) needs a closed world. It's only sound once the company has been asked.
4. **Rule 7's "a list lacks the liar" and Medium's "somewhere nobody watches" pull against each other in the golden.** A landlady who says "nobody but me" is a watcher. For Medium, the house must be unwatched at that hour.
5. **The innocent liar is only a real rival if nothing else places them.** In both goldens a list already does, so their confrontation is decoration. The generator puts the innocent liar somewhere unwatched, so only the admission places them. *(Decided, and now an invariant: see decision 2.)*

### What's open

- **4b:** the book, the pages, the UI, and a blind LLM playtest (`npm run play`). A solver's par isn't a player's.
- The prose is templates:
  - reasons, second lies and admissions are one-liners;
  - the culprit and the innocent liar often claim the same bar at the same hour, which reads alike across seeds (small cases from Soft-boiled vary it with the neighbour's house). *(Fixed: see decision 4.)*
- Work places and theatres in generated evenings (work only during its hours, "closed up at eight"). *(Done: see decision 4.)*
- Lost items above Poached, if the designer wants them, need an honest last-sighting device.
- Rules problems 1 and 2 above need a decision before 4b. Until then, the Tatham ratings assume a player who doesn't use those shortcuts. *(Problem 1 is decided. Problem 2, "below Poached a caught lie names the culprit", is still open.)*

## Decisions applied

*2026-09-28, branch `board-decisions`. This applies the four decisions marked "Decided 2026-09-28" in docs/41, plus two flaws found reading `npm run board -- --seed 3 --tier medium`. Nothing in `src/game`, `src/ui` or the decks changed.*

1. **Refusing isn't a tell.**
   - An innocent liar either admits or refuses. A refuser is cleared by the keeper of the place they were really at (a list, `ukeeper`), who comes on at the lied hour.
   - The solver never uses a refusal. `solve(…, { tell: true })` exists only to measure the shortcut: catch every liar, put it to each of them, and name the one who won't own up. `refusalShortcut` in `path.ts` computes it.
   - Acceptance rejects any case where the shortcut costs less than par. The sweep reports its median and maximum gain.
   - The refusing share is `REFUSE_SHARE` in `generate.ts`, tuned by the sweep:
     - Poached: 0.4, small cases only. In a Poached murder a refusal leaves the confrontation nothing to do, so the case rates Coddled. In a small case the barman then doesn't see the handover, and the culprit's crack is the only word on where the thing is.
     - Soft-boiled and Medium: 0.5.
     - Hard-boiled: always. With one route per rival, an admission's check costs a question the shortcut skips, so every admitting case let the shortcut win by one. The pair's liar covers for the culprit and refuses too.
2. **An innocent lie is dealt only when it matters.**
   - The new `lieMatters` invariant: nothing places the liar at the lied hour but its resolution, which is the admission and its check, or for a refuser the one list that clears them. Without the resolution the liar stays uncleared (solver, crime hour known), and the liar had access.
   - The generator rejects anything else. For example, nobody else may be at the liar's secret place at that hour.
3. **Raw: two watchers, each clearing one rival.**
   - Raw now has the venue's watcher and a second one at the rooming house (a landlady) or, in small cases, a night shift or a second venue. One innocent is at each at the crime hour, and the culprit's lie claims one of them.
   - Each rival's second route is a company-only regular at the same place.
   - Par is 4 at Raw (the floor is now 4).
   - Coddled uses the same means. The rival sits at the second watched place, and the culprit claims the other, so par is 4 and the case still rates Coddled.
4. **Varied evenings.**
   - The night venue is a bar, club, restaurant or picture house or theatre (`VENUES`).
   - The murder origin at Coddled and Medium can be a workplace open only in working hours: a dental surgery (the dentist is a suspect and works until it shuts), a pharmacy or a pawnshop, with the desk as its watcher.
   - Small cases at Raw and Coddled can use a night shift (the exchange, a bakery, a night desk).
   - The secret places include the back row of a picture house and a print shop's night shift.
   - Reasons for moves are drawn once per case from pools by the kind of place (`REASONS`). The `distinctReasons` invariant compares them with names, places, hours and pronouns stripped.
   - The culprit and the innocent liar never claim the same place at the same hour, the second lie included. The one exception is the office's own party, which it hands over as a given. `liarsApart` checks this. To make it possible, a murder with an innocent liar gives the means two hours at its origin, which puts the crime at ten from Soft-boiled up, and the two visit at different hours.
   - Places print when they shut ("open until nine") or nothing, never a range. The Automat is "open all night" and no longer "open 7–10".
5. **An admission is checked, not believed** (from the reading of seed 3 at Medium).
   - An admission carries no board facts. It names the person who was with them (`Confrontation.names`), and only that person can then be asked.
   - That person's account places them. They're at their own rooms (`offBoard`) except at the lied hour, so nothing else names them.
   - The solver takes up company-only witnesses as they're named, admissions included. `admissionChecked` checks all of this.
6. **The window fits the board** (same reading).
   - The office now says the window in board hours ("at nine or ten o'clock"), not "between nine and eleven".
   - `Givens.window` records what it says, and `windowFits` checks that it matches the crime's window and lies on the board.

**The fixtures.** `seed3Repaired` now meets every rule and rates Medium with par 7, the golden's own count. `lostWatchRepaired` is new: it meets every rule and rates Poached, with par 8 and Szabo refusing. The notes at the top of both goldens record what the solver found and whether the repair matches.

**The sweep** (`npm run board-sweep -- --tier all --n 200`, seeds 1–200):

| tier | generated | tries | par median [range] | rated at tier | routes per rival, mean (1 : 2 : 3 : 4+) |
|---|---|---|---|---|---|
| Raw | 100% | 1.0 | 4 [4–4] | 100% | 2.92 (0 : 94 : 242 : 64) |
| Coddled | 100% | 1.1 | 4 [4–4] | 100% | 2.45 (0 : 110 : 90 : 0) |
| Poached | 100% | 1.4 | 7 [5–7] | 100% | 1.50 (200 : 200 : 0 : 0) |
| Soft-boiled | 100% | 2.2 | 7 [5–7] | 100% | 1.50 (200 : 200 : 0 : 0) |
| Medium | 100% | 1.8 | 6 [5–8] | 100% | 1.50 (200 : 200 : 0 : 0) |
| Hard-boiled | 100% | 1.6 | 6 [6–6] | 100% | 1.00 (600 : 0 : 0 : 0) |

| tier | shortcut gain, median / max | shortcut names nobody | liars refuse : admit | place kinds dealt | duplicate reasons | culprit and liar, same place and hour | invariant failures |
|---|---|---|---|---|---|---|---|
| Raw | 0 / 0 | 0 | — | home 146, bar 68, club 30, restaurant 62, theatre 68, work 26 | 0 | 0 | 0 |
| Coddled | 0 / 0 | 0 | — | home 74, bar 69, club 126, restaurant 108, theatre 103, work 120 | 0 | 0 | 0 |
| Poached | 0 / 0 | 46 | 46 : 154 | home 200, bar 67, club 117, restaurant 91, theatre 94, work 31 | 0 | 0 | 0 |
| Soft-boiled | 0 / 0 | 89 | 89 : 111 | home 200, bar 55, club 124, restaurant 89, theatre 98, work 34 | 0 | 0 | 0 |
| Medium | 0 / 0 | 127 | 127 : 73 | home 377, bar 76, club 129, restaurant 78, theatre 87, work 53 | 0 | 0 | 0 |
| Hard-boiled | none (it names nobody in every case) | 200 | 124 : 0 | home 400, bar 66, club 121, restaurant 65, theatre 105, work 43 | 0 | 0 | 0 |

- **How to read the shortcut columns.**
  - Where more than one liar refuses, the shortcut names nobody.
  - Where it can name someone, it never costs less than par.
  - At Raw and Coddled only the culprit lies, so the shortcut is "catch the lie and put it to them". That ties par, since the confrontation costs what the second watcher's list does.
- **Worth reading:**
  - `npm run board -- --seed 2 --tier raw`: a canary, a saloon, and a night desk, with two watchers who each clear one rival.
  - `npm run board -- --seed 1 --tier poached --type murder`: Quill admits and names Rosenbaum, and Rosenbaum's account clears her.
  - `npm run board -- --seed 4 --tier poached`: Mosley refuses, the usher at the Palace clears her, and Feeney's crack says where the dog is.
- **Still open:**
  - Coddled par is 4 at every seed, at the bottom of "about 4 to 6".
  - Rules problem 2 (below Poached, a caught lie names the culprit) is undecided.
  - Hard-boiled has no admissions.
  - At Soft-boiled and up, a murder with an innocent liar always happens at ten.

## 4a.2

*2026-10-08, branch `board-4a2`. The designer read seed 4 at Poached (a dachshund) and seed 2 at Raw (a canary), and four flaws showed. Each is fixed in the generator, and each has an invariant or a sweep metric. Nothing in `src/game`, `src/ui` or the decks changed.*

1. **Setups repeated.** Every case now draws three things from pools (`content.ts`), recorded in `BoardCase.setup`:
   - **How it went missing, or how the victim was reached.** A small case has eight ways in, in three shapes with different access: the office's own gathering (the door on the latch for a lodger, a broken lock, the key under the mat, a window that won't latch); the client telling the room at the venue for two hours (access is whoever the barman saw then); and a locked flat whose spare key hangs at the neighbour's (access is whoever was in there before the theft). A murder has four rooming-house means (chloral, the landlady's revolver, a carving knife, laudanum), each with its own scene and police verdict, plus the workplaces at Coddled and Medium (a photographer's cyanide is new).
   - **What fixes the hour.** Six one-hour clocks for small cases (a dog, a knocked clock, a radio programme, a delivery boy, the el, a church bell), four window lines, three ways the neighbour has the pet, and fifteen murder clock lines by means and tier (the coroner, the supper sent up, a telephone call, a broken watch, the el, a cry, the police surgeon, and so on).
   - **Why the client points.** Motives come by kind, and the pointer line either states it or wraps it (a threat in the street, a letter in his desk, the woman downstairs, or something the person did that the office saw).
   - **Motives fit the crime.** A small case's culprit always sells the thing, and the motive says why they need the money and what it fetches ("three weeks behind on the rent, and has been heard to say what a dachshund with papers fetches"). The fence fits the motive: owing Lou means Lou has it.
   - The sweep counts distinct setups per type, and fails if two seeds' givens match word for word with people's names taken out (`givensSignature`).
2. **Lists left people out.** People the case puts at a place who aren't rows of the board are `BoardCase.others`, and watchers list them: the fence at the venue all night, the client telling the room, and an innocent liar's companion. A companion the keeper can't name is listed as such ("Sweeney and two men off the docks I didn't know"), and then that hour's "nobody else" doesn't hold: the solver draws no exclusions from it. **`listsComplete`** checks every list against the board and the others.
3. **Evenings that didn't make sense.**
   - An hour at someone else's home is an errand ("dropped a parcel off"); two or more is a visit ("went to sit with a sick friend"). **`errandsShort`** checks both the truth and every account.
   - A lie claims a venue, the liar's own home, their work in its hours, or a home in the company of someone who lives there (the Hard-boiled pair). People now carry `home` and `works`. **`liesPlausible`** checks lies and second lies. Feeney's "ten o'clock at Rafferty's, alone" can't happen any more: an innocent liar who covers with the rooming house now lodges there.
   - An account gives the truth's reason for every true move. A move that's only a move because of a lie gives the reason for the stint it rejoins, or "went back to" when the account has been there already. The culprit's move away from the scene now has a real reason, which both the truth and the account say. **`reasonsMatch`**.
4. **The path and the suggestions didn't follow from what the player knew.** `pointers.ts` says what points at each question: the office (the scene, the guests, the lodger, the finder, the one the client points at, the venue where the victim drank, where the spare key hangs), the scene search (where a murder's means came from), an account (every place it claims and everyone in its company), a list (everyone on it), a remark, or an admission (the person it names).
   - Par, the rating, the refusal shortcut and the routes count only questions a player can be pointed to. The designed path is ordered so that each step is pointed to by an earlier step or the office.
   - The suggested order is built the same way: the scene, then the finder, then watchers once something names their place, then the people the answers name. A refusing liar's keeper is reached through the venue watcher's remark that she goes on there most nights, which names the place without placing her.
   - `npm run board` prints each step's reason, naming the step that points to it: "Fairbanks says he was at the Orpheum at ten (step 2): ask Brauer who was there."
   - **`pathMotivated`** checks the path and the suggestions. It needs the analysis, so `checkInvariants(c, a)` takes it; without it the check is skipped.

**Fixture adjustments**, all forced by the new invariants:
- Both goldens' people now say where they live (`home`, `works`), which the goldens give in prose. Nothing else changes for `liesPlausible`.
- `reasonsMatch`: in the repaired seed 3 and the repaired lost watch, the truth table and the accounts paraphrased each other ("one drink" against "a drink"). They now use the same words. Vitale's and Szabo's truths no longer say "cleaned out", which was their secrets talking.
- `listsComplete`: the repaired lost watch puts Lou in his booth at the Shamrock, where the watch went, so Mulcahy now lists him.
- Seed 3's unrepaired path is the same four questions in the order the player is pointed: the table, Mrs. Rafferty (the label), Marchetti (on her list), then Hargrove (Marchetti says the Velvet Room at ten). Both repaired goldens keep their par: 7 and 8.

**The sweep** (`npm run board-sweep -- --tier all --n 200`, seeds 1–200):

| tier | generated | tries | par median [range] | rated at tier | murder setups | lost-item setups | lost-pet setups | givens matching | invariant failures |
|---|---|---|---|---|---|---|---|---|---|
| Raw | 100% | 1.7 | 4 [4–4] | 100% | 56 of 91 (means 4, clocks 9, pointers 7) | 45 of 55 (8, 6, 6) | 49 of 54 (8, 6, 6) | 0 | 0 |
| Coddled | 100% | 2.3 | 4 [4–4] | 100% | 75 of 91 (8, 9, 7) | 52 of 55 (8, 6, 6) | 44 of 54 (8, 6, 6) | 0 | 0 |
| Poached | 100% | 2.8 | 7 [5–7] | 100% | 54 of 91 (4, 9, 7) | 47 of 55 (8, 6, 6) | 47 of 54 (8, 6, 6) | 0 | 0 |
| Soft-boiled | 100% | 4.9 | 7 [5–7] | 100% | 59 of 91 (4, 5, 7) | — | 72 of 109 (8, 4, 6) | 0 | 0 |
| Medium | 100% | 2.1 | 6 [5–8] | 100% | 65 of 91 (8, 5, 7) | — | 75 of 109 (8, 4, 6) | 0 | 0 |
| Hard-boiled | 100% | 2.2 | 6 [6–7] | 100% | 58 of 91 (4, 5, 7) | — | 76 of 109 (8, 4, 6) | 0 | 0 |

The refusal shortcut still never beats par, and there are still no duplicate reasons and no culprit and liar in one place at one hour.

**Worth reading:**
- `npm run board -- --seed 1 --tier poached --type murder`: chloral off the Delmonico rooms' shelf. The victim's usual bar and the label on the bottle each send you to a watcher, and Winslow's admission names Donnelly, whose account clears him.
- `npm run board -- --seed 4 --tier poached`: the designer's dachshund again. Now it's the key under the mat after a card party, Sweeney's secret companions are on the card room's list as men the keeper didn't know, and the usher's remark at the Orpheum is what sends you to the card room.
- `npm run board -- --seed 8 --tier coddled`: a cigarette case. The client told the room at the Velvet Room where the key was, so the barman's list (which has her on it) is the access question.

**Still open:**
- A murder's means at Raw, Poached, Soft-boiled and Hard-boiled come from the four rooming-house means. Workplaces stay at Coddled and Medium, as before.
- An outsider whom nothing names (alone all night somewhere unwatched) is never suggested. The access list clears them, so they're never needed, but the player never meets them either.
- Accounts list board people as company, not `others`. The stranger at the Palace is on the usher's list but not in the account of someone else who sat there.
- Soft-boiled needs about five attempts a seed (it was two). Lost items are still built at Raw to Poached only.
