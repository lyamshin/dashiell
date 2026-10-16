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
"Put it to …" tells a person what says otherwise. Murders, lost
pets and lost things, at six tiers from Raw to Hard-boiled. From Raw up the
book helps less (docs/46): the stars thin out and stop at where to go, the
detective's thoughts set two lines side by side and leave the conclusion to
you, and the report asks for the name and what shows they lied.
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

The title page is one button, "Open tonight's case": a fresh case number, the
kind dealt by it, and the tier the profile has earned (Raw on a first visit;
then the highest tier cleared, or the next one up once that one is cleared
twice: `tonightTier` in `src/game/board/profile.ts`). "Choose a case" unfolds
the picker: the tier, the kind, the case number and the detective's name. A night
is identified by its seed and tier, and the URL says which:
`?seed=4&t=2&type=lost-pet`. Share the link and you share the night. `?situated=0` writes the pages with the old decks only (docs/51), for comparison; `?plain=1` shows each page's plain page, every fact and no voice (docs/52). The
night in progress is kept in `localStorage` (`dashiell:board-run`), and so is
the profile (`dashiell:board-profile`: nights filed, full credit, tiers
cleared, and what the last ten nights dealt, so a new night prefers lines it
hasn’t shown you lately: docs/55). What the engines before the board kept there is never read.

## Playing blind in a terminal

```sh
npm run play -- new --seed 3 --tier 4 --save night.json
npm run play -- do 2 --save night.json    # one numbered choice, or its words
npm run play -- help                      # the rules and every command
npm run play -- new --seed 4 --tier 2 --profile me.json --save n2.json   # a night that remembers the last ten (docs/55)
```

For blind playtesters: exactly what the book shows, one choice at a time, and
nothing of the truth until the report is filed.

## Reading a night without playing it

```sh
npm run read -- --seed 7 --tier 2                  # the oracle's night, page by page
npm run read -- --seed 7 --tier 2 --type lost-pet  # a case type the tier builds
npm run read -- --seed 7 --tier 2 --random         # the wanderer's night
npm run read -- --seed 7 --tier 2 --curtain        # and the true board after it
npm run read -- --seed 7 --tier 2 --skeleton       # and each page's skeleton, as JSONL (docs/49)
npm run read -- --seed 7 --tier 2 --situated 0     # with the old decks only, not the situated deck (docs/51)
npm run read -- --seed 7 --tier 2 --plain          # each page's plain page: every fact, no voice (docs/52)
npm run case -- --seed 7 --tier 2                  # the case itself: truth, board, path
npm run trace -- night.json "a line off a page"    # what wrote these words
```

## Development

```sh
npx vitest run --minWorkers=1 --maxWorkers=3   # the suite
npm run typecheck                              # tsc --noEmit
npm run board-sweep -- --tier all --n 60       # the generator's rates and invariants
npx tsx scripts/board-measure.ts --seeds 50    # the puzzle, measured
npx tsx scripts/board-prose.ts                 # the prose, measured (--plan off: without the microplanner; --situated 0: without the situated deck)
npx tsx scripts/skeletons.ts --n 300 --tier all # the skeletons, a JSONL corpus (docs/49, docs/50)
npx tsx scripts/roundtrip.ts --nights 30       # the round trip: plain pages and voicings read back to their propositions, and the clarity check (docs/52, docs/53)
npx tsx scripts/voicings.ts check              # the voicings held to their shapes and the dial (also: samples, show, coverage, variety)
npx tsx scripts/bones-read.ts pick --out DIR   # the blind read, build against build (pick, dump, pair, score)
npx tsx scripts/voicings.ts check              # the voicings held to their shapes (docs/52 build 2); also samples, show, coverage, variety
npx tsx scripts/bones-read.ts pick --out DIR   # the blind read, build against build (docs/52 build 2): pick, dump, pair, score
npx tsx scripts/situated-gaps.ts --nights 40   # the gaps the situated deck fills, by situation (docs/51)
npx tsx scripts/claudisms.ts                    # the tics of model-written prose and the builders' words on the page, per night and per source (docs/56)
npx tsx scripts/engine-words.ts --nights 10     # the engine's own words in the narration, counted by where they come from (docs/53, addendum)
npx tsx scripts/situated-deck.ts claudisms      # the situated deck filtered by the claudisms lint's patterns, in place (docs/56 §5.2)
npx tsx scripts/situated-deck.ts build         # the situated deck, written and filtered into content/board/situated.json
npm run model:sample                           # the tiny model (docs/50): twenty samples
npm run model:bench                            # and its speed, ms per gap
```

Layout:

```
src/gen/board/    the case generator: the board, the solver, the path. Pure.
src/game/board/   the engine: a command in, a page out. Pure, no DOM.
src/game/board/plan/   the microplanner (docs/49): the skeleton between the beats and the page.
src/game/board/bones/  bones and flesh (docs/52): every fact as propositions, composed, then said plainly or in a voicing.
src/ui/           the book: the only code that touches the document.
src/cli/          play, read, case, board-sweep.
content/board/    the board's card families, the situated deck (docs/51): texture keyed by the gap's situation,
                  and the voicings (docs/52): every composite a page says, in the voice, by shape,
                  form and the speaker's manner.
content/decks/    the four older decks the board still deals from.
content/plain-terms.json   the words a page may not use.
model/            the tiny model's corpus, tokenizer and training (docs/50; model/README.md).
src/game/board/model/   its inference in plain TypeScript. Nothing in the book uses it yet.
public/model/     its int8 export.
```
