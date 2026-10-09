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
