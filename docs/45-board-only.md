# Build: the board only

*2026-10-11, branch `board-only`. The designer approved deleting v1 and v2. The board engine (docs/41–44) is now the default and only engine: the book opens on its picker, and `npm run read`, `play`, `case` and `trace` go straight to it. Docs 01–40 describe the engines deleted here and are kept as history, unrewritten, with the goldens.*

## The numbers

| | before (`142686d`) | after |
|---|---|---|
| lines of code: `src/` | 82,241 | 15,203 |
| lines of code: `scripts/` | 10,664 | 1,337 |
| lines of code: `test/` | 21,328 | 1,679 |
| **lines of code, total** (`.ts`, `.mjs`, `.css`, `.py`) | **114,233** | **18,219** |
| files in `src/`, `scripts/`, `test/` | 178, 41, 71 | 55, 7, 9 |
| content JSON, lines | 101,672 | 7,111 |
| **cards**: `content/board/` | 1,397 | 1,397 |
| **cards**: `content/decks/` | 6,877 in 46 decks | 155 in 4 decks |
| **cards, total** | **8,274** | **1,552** |
| sheets (`content/sheets/`) | 43 | 0 |
| **tests** | **1,254 in 64 files, 24 minutes** | **243 in 9 files, 19 seconds** |
| the book's script, built | 3,491 kB (836 kB gzipped) | 560 kB (156 kB gzipped) |
| the book's stylesheet, built | 36.3 kB | 20.1 kB |

Lines are counted with `wc -l` over `src/`, `scripts/` and `test/`; cards are every entry with an `id` in `content/board/` and `content/decks/`, less any marked `cut`. The suite ran with `--minWorkers=1 --maxWorkers=3` both times.

**Nothing the board writes changed.** 600 nights (seeds 1–20 at every tier and case type the board builds, the oracle's route and the wanderer's) hash the same before and after: every page, every card dealt, the verdict, the story and the curtain. `npm run read` prints the same bytes on 47 nights checked by hand against `--engine board` on `142686d`.

## What was removed

- **v1**, the original engine: the generator (`src/gen/` outside `board/`: `generate.ts`, `logic/`, `tropes/`, `data/`, `shape.ts`, `structure.ts`, `solvability.ts`, the briefing, dossier, clues, correspondence and the rest); the game (`src/game/` outside `board/`: the reducer, `derive.ts`, `m9.ts`, `guidance.ts`, `choices.ts`, `notebook.ts`, `grid.ts`, `story.ts`, `scoring.ts`, `report-form.ts`, `transcript.ts`, `scene/`, `voice/` and the rest); the truth sheet (`src/sheet/`); its book (`src/ui/book.ts`, `choices-view.ts`, `grid-view.ts`, `notebook-view.ts`, `prose.ts`, `grid.css`, `m9.css`); its CLIs (`batch`, `story`, `golden`, and the v1 `play`, `read` and `case`).
- **v2**, the rewrite behind `?engine=v2` (docs/35–36): `src/gen/v2/`, `src/game/v2/`, `content/books.json`.
- **The flags.** `?engine=` in the book and `--engine` in `npm run play` and `npm run read`. The book mounts the board directly (`src/main.ts`).
- **Content only they used:** 42 of the 46 decks in `content/decks/`, all 8 files in `content/sheets/`, `content/deck-schema.json`, `content/motifs.json`, `content/temper-weights.json` and `content/places/` (the v1 place-name pools; the board's places are in `src/gen/board/content.ts`). The four decks the board still deals from are cut to the cards it can deal (below).
- **Tooling that only served them:** `npm run decks` (`scripts/validate-decks.mjs`), `scripts/deck-exposure.ts`, the `check-*` scripts (the playwright checks of v1's grid, layout, M9 picker, unlock and weather, and the motif, portrait, place-name and character-draft validators), `diagnose-play.ts`, `players.ts`, `golden-loop.py`, the M9, M14 and v2 stats, the plain-ratio, purpose, sheet and history sweeps, and the snapshot scripts. 34 scripts in all.
- **Tests for deleted code:** 56 test files (`test/game/` among them), 5 helpers and `test/fixtures/` (the v1 byte-identity hashes). No board test was weakened: `test/board/` (84, 21 and 11 tests) and `board-connective` (62) are untouched, and `board-engine` keeps its 41 board tests; its one v2 test ("a save without the board flag plays the old engine") became two: an old save is refused and left alone, and a new night needs no flag.
- **CSS for deleted views:** v1's prose voices, presence and timeline blocks, the who-buttons, the notebook's records, layers, leads and established facts, the tier ladder, and the grid's place colours. Each selector removed was checked first against the board's pages in the browser: the title, the teach page, every kind of page, topics, the picker, the notebook and grid with a cell open, the report form and the verdict with both endings open.
- **`npm run board`** is now `npm run case`, the board's case printer (`src/cli/case.ts`).

## What was kept, and why

The board turned out to use these from before it. Each moved next to the board code and was cut to what the board calls:

| kept | where now | what the board uses it for |
|---|---|---|
| the clock | `src/game/board/clock.ts` | the night's calls spread over midnight to eight, the strip of notches in the running head (`clockStrip`, `usedByPage`, `minutesAfter`, `isOver`). v1's short-question tally is gone. |
| the page and choice shapes | `src/game/board/types.ts` | `Page` (now only what a board page carries: blocks, cost, cards dealt, where, and `board`), `Block`, the prose voices the board uses, `OfferedChoice`, `OfferedGroup`, `CellMark`, `Weather`. |
| the card shape, `fill` and `tidyPunctuation` | `src/game/board/cards.ts` | every card's slots, filled the old way, and the seams tidied. |
| four old decks | `content/decks/` | the office at midnight and its prop (`office`, 38 of 44 cards), the client's entrance (`entrances`, 18 of 51), the watcher's clause (`watch`, 48 of 72), the look of a trade and its trait (`character`, 51 of 680: the `look` cards for the trades the board deals). The cut cards are the ones the board's own filters in `pages.ts` can never pass, so the deal is unchanged (the hashes above). |
| the reader lint | `src/game/board/reader-lint.ts` | the machinery words and the verdicts, which `lint.ts` runs over every board page with its own checks. |
| the profile | `src/game/board/profile.ts` | the teach-once page (`teachOn`) and the verdict page's word on a first clear. It has its own key, `dashiell:board-profile`, and no Over easy or levels. |
| the storage interface | `KeyValueStore`, in `profile.ts` | the book's store, or a map when the browser won't give one. |
| the verdict | `Verdict` in `src/game/board/report.ts`; `renderVerdict` in `src/ui/report.ts` | the report scored, the closing, "What really happened" and the curtain. v1's crime column and proofs are gone from both. |
| the plain-text wrap and cost label | `src/game/board/text.ts` | the play and read CLIs, and the book's buttons. |
| the RNG and the name pools | `src/gen/board/rng.ts`, `src/gen/board/names.ts` | the generator and the hand. |
| the book's paper | `src/ui/book.css`, `weather.ts`, `weather.css`, `hover.ts`, `dom.ts` | the spread, running head, buttons, pager, weather and hover cards. The picker's rules from `m9.css` and two notebook rules from `grid.css` moved into `board.css`. |
| plain terms | `content/plain-terms.json`, `scripts/plain-terms.mjs` | the banned words, held to every card the board can deal (`test/plain-terms.test.ts`) and every page it writes (`board-engine`, `board-measure`, `board-prose`). |
| the teach page, the names-on-hover cards, the dealer's rules | already in `src/game/board/` (docs/43) | as before. |

Also kept: `content/lexicon.json` and `corpus/` (the writers' period references; no code reads them), `scripts/style-metrics.py`, `scripts/deploy.sh` (untouched), and `playwright-core` as a dev dependency for browser checks.

## Old saves and profiles

- **The book.** It reads only `dashiell:board-run`, `dashiell:board-profile`, the detective's name and the weather switch. v1's `dashiell:run`, `dashiell:burned` and `dashiell:profile` are never read and are left as they are. A board save is checked before it's replayed (a whole seed, a tier from 0 to 5, a case type that tier builds); anything else is ignored and the title page shows no night on the desk. An old link (`?seed=7&d=2&t=1`, `?engine=v2&…`) opens that seed and tier on the board; `d` and `engine` are ignored, and a `type` the tier doesn't build is dropped rather than searched for.
- **The play CLI.** A v1 or v2 save is refused with one line ("That save is a night from an engine that's gone. Start a new one: …") and left unchanged; so is anything that isn't a save. Tested.
- **The profile.** A board night that was filed under `?engine=board` before this change counted in `dashiell:profile`; that count starts again under the new key. Nobody plays the site yet.

## `npm run trace`, ported

`scripts/trace-line.ts` was written for v2 saves. It now replays a board save (`replaySave` in `src/cli/play-lib.ts`), renders each page as `npm run play` prints it, and finds the quote's source among the board's cards (`content/board/`), the four old decks, callback lines (`pay:` keys), string literals in `src/`, and the lexicon. Each hit says which page, what the page was for and its sheet (`page 8 (account (sheet account-sit+turn))`), the source's id and file, and whether the page dealt it. Sheets, v1 beats and `line:` keys are gone with v2. `test/trace-line.test.ts` was ported to board nights: a board card, an old-deck card, a callback line and an engine line each trace back right, and a v1 save is refused.

## Checked

- `npx vitest run --minWorkers=1 --maxWorkers=3`: 1,254 tests before, 243 after, all passing. `npx tsc --noEmit` clean. `npm run build` works; `scripts/deploy.sh` is untouched.
- `npm run read`, one night a tier, read in full: Raw murder (seed 6), Coddled lost item (11), Poached lost pet (12), Soft-boiled murder (13), Medium lost pet (14), Hard-boiled murder (15). Nothing missing.
- `npm run play`, a Raw murder by hand (seed 21): the scene, the floor, the landlady's list, the usher's list, Feldman's evening (the turn), the ready-made put (a refusal), his reason; filed 4 of 4 in 9 calls against par 8.
- `npm run trace` on that save, and `board-lint`, `board-measure --seeds 3`, `board-prose --nights 4`: all run, lint and plain terms 0.
- The browser at 1280 px, from vite: the title page as the picker; an old v2 link, an old v1 run and profile, and a broken board save in the store, none of which showed; a Medium night (seed 3) through the teach page, the pages, the topics, the picker and the grid, filed 4 of 4 with "Medium is cleared. Hard-boiled is next."

## Seen while reading, and left alone

These are in the board as it was; the hashes say nothing here changed them.

- Some `entrances` and `office` cards use straight apostrophes ("the reason she'd come", "I'd never dared"); the lint's quote rule lets an apostrophe between letters pass.
- A card says "That's one hour" after a reason with two ("Mrs. Rafferty has you at Rafferty's at eight and nine. That's one hour. Tell me about the others": `bcn-2562`).
- On the Raw night's motive page, a reaction ("His mouth went flat. 'You want to know what I think,' he said. 'Fine.'") comes after the page's close.
- People still answer the door "in stocking feet" twice in one arrival (docs/43's open list).
