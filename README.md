# Dashiell

A noir deduction game in the shape of a bound book. Every night is generated
fresh. The detective is named Dashiell, unless you tell him otherwise.

Early 20th century New York. Short runs, replayable.
Inspired by *Return of the Obra Dinn*, *Kingdom of Loathing*, *Deadline*, and
*The Maltese Falcon*.

## Status

Playable, at https://dashiell.app. The night runs on **the small board**
(docs/41–45): suspects against whole hours, and a handful of questions that
each get a whole answer. Ask anybody where they were tonight and you get the
whole evening, with company; ask a barman, a landlady or an usher who was in,
and you get everybody, hour by hour. Every lie runs into something true, and
"Put it to …" reads a person the line that breaks their story. Murders, lost
pets and lost things, at six tiers from Raw to Hard-boiled. From Raw up the
book helps less (docs/46): the stars thin out and stop at where to go, the
detective's thoughts set two lines side by side and leave the conclusion to
you, and the report asks for the name and the line that breaks their story.
The right name on a hunch counts half. Every question, search, walk and put
costs one call, and the clock shows what the calls add up to (docs/47).

The engines before the board (v1 and v2) were deleted in docs/45; docs 01–40
describe them and are kept as history.

## Running the book

Node 20 or newer.

```sh
npm install
npm run dev        # serves the book at http://localhost:5173
npm run build      # emits a static dist/
npm run preview    # serves dist/
npm run deploy     # build, deploy to Cloudflare, verify the live hash (docs/HOSTING.md)
```

The title page is the picker: the tier, the case type and the seed. A night
is identified by its seed and tier, and the URL says which:
`?seed=4&t=2&type=lost-pet`. Share the link and you share the night. The
night in progress is kept in `localStorage` (`dashiell:board-run`), and so is
the profile (`dashiell:board-profile`: nights filed, full credit, tiers
cleared). What the engines before the board kept there is never read.

## Playing blind in a terminal

```sh
npm run play -- new --seed 3 --tier 4 --save night.json
npm run play -- do 2 --save night.json    # one numbered choice, or its words
npm run play -- help                      # the rules and every command
```

For blind playtesters: exactly what the book shows, one choice at a time, and
nothing of the truth until the report is filed.

## Reading a night without playing it

```sh
npm run read -- --seed 7 --tier 2                  # the oracle's night, page by page
npm run read -- --seed 7 --tier 2 --type lost-pet  # a case type the tier builds
npm run read -- --seed 7 --tier 2 --random         # the wanderer's night
npm run read -- --seed 7 --tier 2 --curtain        # and the true board after it
npm run case -- --seed 7 --tier 2                  # the case itself: truth, board, path
npm run trace -- night.json "a line off a page"    # what wrote these words
```

## Development

```sh
npx vitest run --minWorkers=1 --maxWorkers=3   # the suite
npm run typecheck                              # tsc --noEmit
npm run board-sweep -- --tier all --n 60       # the generator's rates and invariants
npx tsx scripts/board-measure.ts --seeds 50    # the puzzle, measured
npx tsx scripts/board-prose.ts                 # the prose, measured
npm run model:sample                           # the tiny model (docs/50): twenty samples
npm run model:bench                            # and its speed, ms per gap
```

Layout:

```
src/gen/board/    the case generator: the board, the solver, the path. Pure.
src/game/board/   the engine: a command in, a page out. Pure, no DOM.
src/ui/           the book: the only code that touches the document.
src/cli/          play, read, case, board-sweep.
content/board/    the board's card families.
content/decks/    the four older decks the board still deals from.
content/plain-terms.json   the words a page may not use.
model/            the tiny model's corpus, tokenizer and training (docs/50; model/README.md).
src/game/board/model/   its inference in plain TypeScript. Nothing in the book uses it yet.
public/model/     its int8 export.
```
