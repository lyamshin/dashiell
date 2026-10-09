# Build 4b: the book on the small board

*2026-10-08. The designer approved this: "you can do 4a.2 and then 4b." 4a and 4a.2 built the puzzle (`src/gen/board/`, docs/41 and docs/42). 4b puts it on the page: a playable night in the book and the play CLI, built on the board instead of the old fact flood.*

**Read first:**
- `docs/41-small-board.md`, the rules, including the "Decided" notes;
- `docs/42-small-board-4a.md`;
- the goldens: `docs/golden/small-board-seed3.md` and `small-board-lost-watch.md` for page shape and voice (each opens with a note on its logic mistakes; the prose is the target, not the logic), and `seed3-camp.md` for the voice;
- `docs/40-legible-play.md`, for what playtests taught about choices, stars and confrontations.

## The standard

The designer is an LSAT logic-games ace and sudoku solver. The old night failed him on four counts:

- suggestions that weren't logical;
- no connections between stories;
- gaps in people's evenings;
- weapons with no lead time.

The new night must read like the goldens:

- every page has **one job**: one account, one list, one find or one confrontation;
- the prose wraps that job;
- the grid is the board.

The story gets its richness from people and places, not from more facts.

## What to build

### 1. A third engine, `board`

- **The flag:** `?engine=board` in the book and `--engine board` in `npm run play` and `npm run read`, beside v1 and v2. During the build it's flag-only. The lead decides on making it the default after review.
- **Reuse whatever fits:** the clock, profile, scoring, report form, sheets, decks, voice, UI book shell, weather, hover cards and teach-once page. The old fact pool, half-hour testimony, counts, `m9.ts` and the v2 graph are left alone, not used, and not deleted.
- **Every case type the board generates,** at every tier it generates it.

### 2. Pages, one job each

| page | job | notes |
|---|---|---|
| **the office** | the givens | The client's lines carry the setup, the hour clue and the pointer. It's free. Asking the client about themselves is never suggested. |
| **arriving at a place** | who's here, what they're doing, what the detective thinks | The first time a watcher is met, one line says what watchers are good for. |
| **"Where were you tonight?"** | one whole account | Every hour, with company and reasons, said the way a person says it. Use the ordinary run plainly ("home till nine with the radio"), with weight where it falls naturally, and no time lists. Dashiell actually asks, as in the peanut/Dentist example in the goldens. |
| **"Who was here tonight?"** | one watcher's whole list | Hour by hour, with "nobody else" said, and in the watcher's own manner. Faces they don't know come as descriptions only where the board says so (the Hard-boiled face). |
| **a search** | one find | The means and its origin, or the motive. |
| **put it to** | their line against the line that breaks it | It ends one of four ways, each said plainly: they admit and name who can check it, they refuse, they tell a second lie, or they crack (small cases at low tiers). Silence on a broken story reads as refusal, not as nothing. |
| **the turn** | a recap at the first lie caught | A chapter break. |
| **the report** | per type and tier | Who, when, how and why; for lost things, where it is now. Then the ending, "What really happened" (the crime only, as now), and the curtain: the true board, the path and the lies. |

- **About one joke a page.** The rest of the page says plainly what the place is, who's there, what they're doing and what the detective thinks.
- **Callbacks on about 70% of pages,** as in M13.

### 3. Choices

- **People present, then their topics** (two clicks, as built in legible-play).
  - A suspect's topics: "where were you tonight?", plus a second topic only where the board gives one (the victim, or the thing).
  - A watcher's topic: "who was here tonight?"
  - A company-only witness appears once something has named them.
- **Search** the finds that exist.
- **Go to** places the player knows of (from the givens, accounts and lists).
- **Stars follow the motivated path** (4a.2's `pathMotivated` reasons), at most three, each with its reason ("Feeney says Rafferty's at ten — ask the landlady").
  - By tier: they cover the path generously at Raw and Coddled, open steps only from Poached, and only the first two steps at Hard-boiled.
  - A star never points at the client.
- **A first-level page** shows about eight choices or fewer.

### 4. The grid is the board

- **Rows** are the suspects, then company-only witnesses once met. **Columns** are the hours. One **column** is "could get the means".
- **Each cell shows** what the player holds:
  - "says" (their own account);
  - "seen" (a list or someone else's account);
  - a **collision** mark where they disagree (both lines on hover or tap);
  - the player's own pencil.
- **The crime hour** is marked once known.
- **Fits a phone.** Four hours and five people fit at 375 px with no sideways scroll.
- The play CLI's `grid` prints the same board as text.

### 5. Confrontation

- **"Put it to X"** lists only X's claims that collide with something the player holds, each paired with the line that breaks it.
  - At Raw and Coddled, the pair is offered ready-made.
  - From Poached up, the player picks the claim and then the breaking line from a short list: the statements held for that place and hour.
- **A pair that doesn't break** ends on one plain line saying why.
- **No refusal is ever treated as guilt,** in text or scoring.

### 6. Clock and budget

- **Par and budget** come from the board. Each question costs about a call (keep today's clock look). Walks cost as today.
- **Labels are honest** (docs/38): the label always matches what's charged.

### 7. Teaching

The teach-once page is rewritten for these rules, in four lines of the detective's voice:

- everyone gives you their whole evening;
- a watcher lists everyone;
- every lie collides with something true;
- not everyone who refuses is guilty.

### 8. Writing

New card families for the jobs above, in the camp voice and plain words:

- account tellings by manner;
- list tellings by watcher;
- confrontation outcomes;
- arrivals for the new place kinds (theatres, restaurants, workplaces);
- setups for the new 4a.2 openings.

Reuse the existing establish, place and people decks wherever they fit. Reader lint, plain terms and correspondence stay clean.

## Limits

- **Tests:** while working, run only the new and touched tests. Run the full suite (`npx vitest run --minWorkers=1 --maxWorkers=3`, after `pgrep -f vitest`) at the start, once mid-way, and at the end.
- **Helpers:** at most one at a time, for example for deck writing. Never run `npm ci` or `npm install` in the main checkout. Don't run playwright alongside a suite.
- **No blind playtests.** The designer decides on those after review.

## Done means

- **The oracle route** solves at par at every tier, on 50 seeds per tier, per case type.
- **The refusal shortcut** never beats par.
- **A wanderer** (random reasonable choices) rarely solves at Poached and up.
- **Read in full,** page by page, with `npm run read -- --engine board`: six nights, one per tier, mixing murder, lost pet and lost item. Every page does its job, nothing contradicts anything (reader lint is clean), and every suggestion follows from what the player holds.
- **Play by hand** through the play CLI: one Raw night and one Medium night, including a confrontation that lands and one that doesn't.
- **Check in the browser** at desktop and 375 px: the person-then-topic flow, the grid as the board, the confrontation picker.
- **Write up** a "Built" section in this doc, logging what's done and what's open.
- **Open a PR** against main and don't merge it.

## Built

*2026-10-08, branch `small-board-4b`. v1 and v2 play as they did: the only lines they share with the board are the `?engine=board` check at the top of `mount`, the `--engine board` hand-off at the top of `runPlay` and `npm run read`, and an optional `Page.board` trace field that v1 and v2 never set.*

### What's there

| § | built | deviations, and why |
|---|---|---|
| 1. The engine | `src/game/board/`: `model.ts` (the run, the deal, par and budget), `knowledge.ts` (the lines held, collisions, the judgement on a put, who and where the player knows of), `stars.ts`, `choices.ts`, `pages.ts`, `tell.ts` (accounts and lists said aloud), `engine.ts` (a command in, a page out), `grid.ts`, `report.ts`, `oracle.ts`, `lint.ts`, `teach.ts`, `decks.ts`, `text.ts`. The book: `src/ui/board-book.ts` and `board.css`, behind `?engine=board` (`&seed=N&t=T[&type=…]`). The CLIs: `src/cli/board-play-lib.ts` (`npm run play -- … --engine board`) and `src/cli/board-read.ts` (`npm run read -- --engine board …`). Every case type the board builds, at every tier it builds it. | Reused as they are: the clock and its strip, the running head, the choice buttons' look, the pager, the weather, the hover cards, the verdict page (`renderVerdict`, fed a `Verdict`), the profile (`fileToProfile`), the old `office`, `entrances`, `watch` and `character` decks, and the dealer's rules (one joke a page, nothing twice a night). The v1 notebook, grid, report form and reducer aren't used: they're built on the old case and its fact pool, so the board has its own small versions. Its save has its own key (`dashiell:board-run`). |
| 2. Pages | The office (the client's lines carry the setup, the clock and the pointer; the client is never a topic). Arriving: who's here, what they're doing, one line on what a watcher is good for at the first meeting, or that nobody watches the place. "Where were you tonight?": the whole evening in runs, with company hour by hour and the reasons in the speaker's own mouth, never a timetable. "Who was here tonight?": hours with the same people run together, "nobody else" where the list is whole, a stranger or a face said as one, the watcher's remark after. A search: the find told, then what it means (origin and lead time, or who knew the way in). Put it to: their line and the line that breaks it, then admit-and-name, a refusal, a second story or a crack, or one plain line saying why it didn't break. The turn: a chapter title and a recap at the first lie caught. The report, the ending, "What really happened" and the curtain (the true board, the lies, the path). | **Callbacks land on 51–63% of pages, not 70%.** A first look sets a trait (the character deck's exports) and a first visit a prop; a later page about that person, or in that place, closes on a line that pays it off. Search pages and first arrivals rarely have one. **"Account tellings by manner"** is one manner with rotating openers. The cards frame the ask and the close, and the told sentences are code, so every hour and name is exact. |
| 3. Choices | People here, then their topics: a suspect's evening and the victim or the thing (which gives their motive, in their own words), a watcher's list, "Put it to …" when one of their claims collides. A company-only witness is in the room once named. Searches where the detective is. Go to the places known (the office's, the answers', where a named person is tonight), starred ones first, more than three folded under "Other places". Stars (`stars.ts`) mark the cheapest sets of pointed questions from what's held to a finished report: generous at Raw and Coddled (every cheapest way on), one way from Poached, the designed path's first two steps at Hard-boiled. Never the client, at most three, each with its pointer's reason ("Shapiro has Tramonti at the Odessa at ten — ask Tramonti where she was"). | First-level choices: median 7–8, at most 10 (a venue with four people, three places, the fold and the free row). |
| 4. The grid | Rows are the suspects the player has heard of, then company-only witnesses once named; columns the hours, plus "means" (could get it, or knew the way in). A cell shows what they say (italic), what somebody else says of them (upright), both (✓), a collision (✗, in the accent), or the pencil. A tap opens the lines behind it, both sides of a collision, and the pencil. The crime hour is marked once known, and the window's hours until then. Five people by four hours fit 375 px with no sideways scroll (checked). `grid` in the CLI prints the same. | The book's pencil marks "at" a place; the CLI takes at, not and clear. |
| 5. Confrontation | Only claims that collide are offered. At Raw and Coddled the pair comes ready-made. From Poached up the player picks the claim, then a line from a short list of everything held at that hour, the lines about their place or about them first. A line lands when the solver's break rests on it or needs it, and the line itself touches the claim; another line from the same answer doesn't count. A miss costs the call and says why in one line ("Tillman had herself at the Shamrock at eleven o’clock. That said nothing about who was at Hargrove’s flat."). Once the list where a second story claims to be breaks it, the story can be put again, and the answer is a refusal. Refusals draw the same cards for the guilty and the innocent, and nothing scores them. | — |
| 6. Clock and budget | Par in calls is the designed path's questions, plus the motive search a murder's report needs, plus the path's walks. The budget adds the tier's slack (+3 at Raw down to +1 at Hard-boiled). Every question, search, walk and put is a call, and every label shows the minutes the clock will move ("45 min (rounded)" where rounding makes it so). Opening a person or the picker, the recap, the grid and filing are free. | — |
| 7. Teaching | `BOARD_TEACH_LINES`, four lines, shown before the office on a profile's first nights in the book, and on `new` in the CLI (`--no-teach` skips it). | — |
| 8. Writing | `content/board/` (787 cards): the office's setups for every 4a.2 opening and clock, retainers and knocks; arrivals for every place in the pools (two or three each) and props; scene bodies; what people are doing, by trade and place; what a watcher is good for, by job; motives in the suspect's own words; frames for asking, listing and closing; puts, reactions and closes by outcome, and admissions by secret place; turn titles; endings by outcome. One helper wrote most of the volume to a brief. I wrote each family's first cards, then reviewed and fixed the rest. | — |

### Small generator fixes (src/gen/board)

- **A reason says no more than the board.** `reasonFits` allows "to get off her feet for two hours" only for a stint of two hours or more, and "to bed" or "turned in" only to the end of the evening. Seed 4 at Poached: Sweeney now "went to the Orpheum to see the new picture". New invariant: `reasonsFit`.
- **Two errands to one house in one hour.** A second person coming from the same place goes along ("kept Fairbanks company as far as Kowalski’s"). From different places, the case is refused. New invariant: `errandsApart`.
- **The first hour has a reason** when it's somebody else's home or a back room ("At seven I went to Rafferty’s to collect a debt"). It's drawn last, on a stream of its own, so nothing else in the case moves. The back rooms have honest reasons of their own (`UDef.more`) instead of their kind's pool, which had sent someone "to dance" at the numbers room.
- **The handover is seen, not who made it.** The barman's remark ("somebody came in with something under a coat and went straight to Lou") no longer names the thief: a name there settled who in one line.
- **An admission's witness is found where the liar is,** not in rooms across town. The check no longer costs a walk that the refusal shortcut skips. From Poached up, the shortcut used to beat par in about half the murders; now it almost never does (see below).
- Plain terms: "the wireless" and "on the latch" were in the pools. A lost item's male owner is now a widower.
- Additive, for the book: `Givens.lines` (each office line by kind, with its values), `Place.key`, `Person.job` and `motiveId`, and `Solved.placed`/`notPlaced`. The last two are lazy getters, so the sweep's inner loop pays nothing for them.
- `npm run board-sweep -- --tier all --n 60`: 100% generated at every tier, and no invariant failures.

### Done means

`npx tsx scripts/board-measure.ts --seeds 50` (50 seeds per tier and type):

| tier | type | oracle solves, at par | shortcut under par | confession route under par | wanderer solves | lint, plain terms | choices a page, median / most | callback pages |
|---|---|---|---|---|---|---|---|---|
| Raw | murder | 100%, 100% | 19 | — | 26% | 0, 0 | 8 / 9 | 53% |
| Raw | lost item | 100%, 100% | (names nobody) | 46 | 34% | 0, 0 | 8 / 9 | 55% |
| Raw | lost pet | 100%, 100% | (names nobody) | 48 | 24% | 0, 0 | 8 / 9 | 55% |
| Coddled | murder | 100%, 100% | 19 | — | 18% | 0, 0 | 8 / 10 | 55% |
| Coddled | lost item | 100%, 100% | (names nobody) | 50 | 28% | 0, 0 | 7 / 9 | 57% |
| Coddled | lost pet | 100%, 100% | (names nobody) | 50 | 28% | 0, 0 | 7 / 9 | 55% |
| Poached | murder | 100%, 100% | 0 | — | 18% | 0, 0 | 7 / 10 | 61% |
| Poached | lost item | 100%, 100% | (names nobody) | 50 | 34% | 0, 0 | 7 / 10 | 63% |
| Poached | lost pet | 100%, 100% | (names nobody) | 50 | 28% | 0, 0 | 7 / 10 | 61% |
| Soft-boiled | murder | 100%, 100% | 0 | — | 28% | 0, 0 | 8 / 10 | 59% |
| Soft-boiled | lost pet | 100%, 100% | 0 | — | 22% | 0, 0 | 7 / 10 | 58% |
| Medium | murder | 100%, 100% | 3 | — | 4% | 0, 0 | 8 / 9 | 58% |
| Medium | lost pet | 100%, 100% | 0 | — | 16% | 0, 0 | 8 / 10 | 63% |
| Hard-boiled | murder | 100%, 100% | (names nobody) | — | 0% | 0, 0 | 8 / 9 | 51% |
| Hard-boiled | lost pet | 100%, 100% | (names nobody) | — | 14% | 0, 0 | 8 / 9 | 60% |

- **The oracle.** It walks the designed path through the engine and searches the papers while it's at the scene. It files a full report at exactly par on all 750 nights.
- **The refusal shortcut.** It catches every liar, puts it to each, and names the one who won't own up; a second story has to be broken and put again before it counts as holding out. From Poached up, it never comes in under par except in 3 of 50 Medium murders, by one call (the shortcut never needs access). **At Raw and Coddled murders it beats par by one call in 19 of 50 each.** Below Poached only the culprit lies, so catching the lie and putting it costs no walk, while the sound route walks to the second watcher. That's docs/42's open rules problem 2 ("below Poached a caught lie names the culprit"), and it's still the designer's to decide. In questions, which is how the generator counts par, the shortcut never beats par.
- **The confession route.** In small cases from Raw to Poached, the culprit cracks when the lie is put ("All right. I took it."). That's cheaper than par in nearly every small case at those tiers. docs/41 rule 8 has the crack come "after a second lie breaks", but the generator puts the second lie and the crack in one confrontation, and the solver doesn't take who from it. Making it two stages changes par, so it's a generator change, and it's open.
- **The wanderer.** It takes random choices among what each page offers, puts with a random line, and files a caught liar. It solves 0–4% of Medium and Hard-boiled murders, 14–16% of their lost pets, and 18–34% at Poached and Soft-boiled. Chance is one in four; at Poached, with two liars, filing a caught liar is a coin toss. At Poached and Soft-boiled that isn't "rarely".
- **Reader lint, plain terms and correspondence.** The lint checks machinery words, verdicts, unfilled slots, straight quotes, hours a page names that its lines don't license, names it doesn't license, and that accounts and lists are told whole. It found nothing on the oracle's and the wanderer's 1,500 nights.

### Six nights read in full

- `npm run read -- --engine board --seed 2 --tier 0 --type murder` (Raw): laudanum off Mrs. Nagy's cupboard. Feldman's list catches Salerno's nine o'clock, and Mrs. Nagy's list places Marchetti. Reads clean and short. The office's relation line said it backwards ("Coffin was my landlady") until fixed.
- `… --seed 8 --tier 1 --type lost-item` (Coddled): a cigarette case, and a key under the mat that the client told the room about at the Velvet Room. The barman's handover line named the thief outright; now he sees a coat, not a face. Hargrove spoke of herself in the third person ("She and Hargrove haven’t spoken"); fixed.
- `… --seed 4 --tier 2` (Poached): the dachshund. Brauer's list breaks Fairbanks at ten, he cracks, and Stannard clears Sweeney. It has the golden's shape. A cafeteria cashier at the pictures had an order pad in his apron pocket, so off-duty trades no longer borrow a counterman's look.
- `… --seed 3 --tier 3 --type murder` (Soft-boiled): Rosenbaum's list narrows the window ("Lindemann was at the Shamrock at nine, alive. So whatever happened to him happened at ten o’clock") and catches Margolis. Reads well; two "So" sentences in a row were fixed.
- `… --seed 1 --tier 4 --type lost-pet` (Medium): a Pomeranian. The side remark, an admission named at the Automat and checked there, and Mrs. Cheatham's "I had Duchess at my place at ten" for the hour. The strongest of the six. Fixed: "Duchess were", and "with Abramowitz" right after "to meet Abramowitz".
- `… --seed 1 --tier 5 --type murder` (Hard-boiled, the face): "somebody with a cane" on the Odessa's list, when nobody's cane had been described, so the face couldn't be matched. In a face case, looks now show on first sight, and the break says whose cane it was once that person's evening is held. Stars stop after the path's first two steps, as specified, so the last pages are unstarred.

### Played by hand (`npm run play`)

- **Raw, seed 5** (`new --seed 5 --tier 0 --engine board`): the scene, the Shamrock's list, Vitale's evening (the turn), the ready-made put (landed: “I didn’t kill anybody… The rest is mine.”), Mrs. Brauer's list, then the papers. Filed 4 of 4 in 10 calls, against par 8. The put wasn't needed; I took it to see it.
- **Medium, seed 7** (`--tier 4`, a dachshund): Tillman's evening, then Hargrove's, caught by the side remark. Then **a put that didn't land** (Tillman's own eleven o'clock against Hargrove's "home": "That said nothing about who was at Hargrove’s flat"), and **one that did** (the side remark, which got a second story: the Shamrock). Weisglass's list broke the second story, the put again was refused, Mrs. Mulcahy gave the hour and the access, and Steinbach turned out to be a second liar. Filed 4 of 4 in 13 calls, against par 12. This play found the bug where any line from the same answer landed; it's fixed.

### The browser

`?engine=board&seed=4&t=2` and `seed=1&t=5&type=murder`, with vite serving this branch, at desktop and at 375 px. Checked: the person-then-topic flow, the stars' reasons under the buttons, the picker (claim, then line, then "Back to the claims"), a put landing, and the grid, with a tap opening a collision's lines and the pencil. At 375 px there's no sideways scroll, and with five people by four hours no cell is clipped.

### What's open

- Rules problem 2 at Raw and Coddled murders, and the crack in small cases from Raw to Poached (above). Both need a generator decision.
- The wanderer at Poached and Soft-boiled.
- Callbacks at 51–63%, against 70%.
- Account manners: one, with variety in the frames only.
- Some card families run thin over a long night: people answer the door "in stocking feet" twice, and a prop says "at {place}" right after the arrival has named it.
- No blind playtest, as instructed. A solver's par isn't a player's.
