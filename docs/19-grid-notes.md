# The grid — notes

Branch `grid`. The designer: "this should be a deduction game … there has to be
a way to show where people were as a grid", and then: the game should feel like
an LSAT logic game — the player diagrams, the game supplies rules. So the grid
is the notebook's record laid out by the half hour, and the player's scratchpad
on top of it.

## What was built

| | Where |
|---|---|
| The model, pure | `src/game/grid.ts` — `gridFrom(view, state)`, `applyMark`, `markOf`, `isConflict`, `placeAbbrevs` |
| The pencil in the save | `RunState.marks` and `CellMark` in `src/game/types.ts`; `deserializeRun` in `src/game/storage.ts` |
| The grid in type | `src/game/grid-text.ts` — `renderGridText`; `npm run read -- --seed N --grid [--marks "…"]` |
| The grid on the page | `src/ui/grid-view.ts`, `src/ui/grid.css`; wired in `src/ui/book.ts` and `src/ui/notebook-view.ts` |
| Place colours | `--place-0` … `--place-8` in `src/ui/book.css`, light and dark |
| Tests | `test/grid.test.ts`, `test/grid-walk.test.ts`, sharing `test/grid-walk.ts` |
| Browser check | `scripts/check-grid.mjs` (playwright-core, the Chrome on the machine) |

"Where they were" is the notebook's second section, after the clock and before
People.

## The cell model

```ts
interface GridEntry {
  placeId: Id; present: boolean;
  source: 'claimed' | 'witness' | 'evidence';
  by?: Id;      // whose word, for a witness (or a self-placing clue)
  from?: Id;    // the room a piece of evidence came out of
  clueId: Id;   // a found clue, `account:<personId>`, `brief:discovery`, `brief:last-seen`
}
interface GridCell { tick; entries: GridEntry[]; conflict: boolean; mark?: CellMark; life?: 'before' | 'window' | 'after' }
```

The spec's shape, with three optional additions: `from` on an entry, and
`mark` and `life` on a cell. `GridView` carries the rows (victim, client,
suspects), the fixtures apart, the places with their abbreviation, colour slot
and whether each is the scene, the window, the anchors, the crime's half hour,
every source sentence by id, and the rules.

### Where entries come from

1. **Every placement a found clue makes** (`personAt`, `personNotAt`). All of
   them: `establishedFrom` keeps only the first clue for a fact, and the grid
   wants both when two sources agree, so it reads the found clues itself. A
   clue spoken by a person is `witness` with `by` the speaker; a clue from a
   room is `evidence`; a clue in which the speaker places themselves is
   `claimed`.
2. **Every account taken down** (`state.accounts`), half hour by half hour, as
   `claimed`. Its source sentence is the notebook's own "says: …" line.
3. **The two briefing sentences the notebook keeps under the victim.** The
   discovery ("Kreuzer found Sweeney at the suite at 11:30 PM") puts the
   finder there — `claimed` when the finder is the client, else `witness` on
   the client's word — and, in a murder, the body (`evidence`). The last
   sighting of a missing person is a `witness` entry by whoever saw them.
   These are the only entries that are not a clue or an account; the notebook
   has printed both since page one.

Nothing else. An empty cell is an unknown.

**Conflict** is computed from entries only: two different places present, or a
"not at" against an "at" for the same place. The pencil never counts.

**The victim's row** carries a life line when the case is a murder or a
disappearance and the notebook has a window: `alive` / `about` before it, `?`
inside it, `dead` / `gone` after. A robbery's owner has no life line.

**The window** is `establishedFrom(...).deathTicks` — what the notebook's
Established section prints, which may be wider than the truth. **The crime's
half hour** is marked (`†`) only once that window is one tick.

**Anchors** are placed where a found clue with that `anchorId` names the hour:
the anchor's ticks whose clock face is in the clue's record. Over 40 seeds × 3
difficulties, all 376 anchor clues carry their hour in the text.

**The crime's place** in the legend is the scene when the case does not ask
`where`; for `body-moved`, which does, it is the place the body was found,
labelled so.

### The rules

Every fact on the grid as one line with its source, in the designer's form:

```
Hanrahan: third floor, 10:00–10:30 (Kreuzer saw her)
Grasso: not at third floor, 9:00–10:00 (Marchetti says not)
Kreuzer: third floor, 9:00–10:30 (her own account)
Time of death: after 9:30 (Marchetti)
The El going over: 10:00 (the suite)
Sweeney: found at suite, 11:30, by Kreuzer (the briefing)
```

One rule per clue, person, place and presence, with its ticks joined into
spans; one per run of an account; one per window fact (`timeOfDeath`,
`victimAliveAt` as "after", `victimDeadBy` as "or earlier"); one per anchor
hour; the briefing's discovery and last sighting. Each rule lists the cells it
touches (`personId: null` is the whole column). A later kind — before/after an
anchor, an absence over a span, together, a conditional — needs only `text`
and `cells` to be listed and lit; `GridRuleKind` is the one place to add it.

"Saw" is used for an observation or an anchor clue; any other spoken clue
"says so". Evidence is "found at <room>". The coroner's report is "the
coroner" (murder) or "the precinct report" rather than the room it lies in.

### The pencil

`RunState.marks[personId][tick] = { at?: Id; notAt?: Id[] }`. One "was at" per
cell; any number of "not at". Pencilling "not at" the place already pencilled
"at" rubs the "at" out, and the other way round. Free, writes no page, saved
with the run, optional so an older save loads with a clean grid (a malformed
`marks` is dropped). Nothing but the grid reads it, and a test fills every
cell of a finished run with pencil and checks the grid is otherwise
byte-for-byte what it was.

## On the page

- A table in its own horizontal scroller. Names are `position: sticky`; the
  page never scrolls sideways.
- **At 1280×800 the whole evening fits** (548 px of table in 548 px): at 900 px
  and up the notebook body's box reaches into the page margin, padded back so
  every line of text stays where it was, and only the grid uses the extra
  room. Checked on the end of the oracle's run for seeds 1–10 at difficulty 2.
  A night with wider cells than that would scroll inside the grid, not fail.
- **At 390×844** the grid scrolls inside itself (604 px of table in 349 px);
  the names stay put.
- Chips: dashed outline = their own account; tint and a raised initial = seen
  by that person (two initials at most, `+` after); deeper fill and a square =
  evidence; struck through = not there. `!` and a red outline = the sources
  disagree. The pencil is italic, grey, wavy-underlined, with a ✎, and never
  boxed.
- The window is a shaded band down its columns. Anchors are `◆` over their
  hour, the crime's half hour `†`; hovering shows the label, tapping the hour
  opens it with its source sentences.
- Tapping a cell opens the detail under the grid: every source sentence word
  for word from the notebook, with who or where and what it says; then the
  pencil (was at / not at, a button per place, rub out). Tapping a name turns
  the notebook to that person's entry (it scrolls there and flashes).
- A row folds to a thin strip (`▾`/`▸`). Fixtures are a folded section.
- The legend lists every place with its colour and abbreviation, the scene
  marked, and the key. Under it, the rules; tapping one lights its cells (and
  opens a folded row or the fixtures if it has to).
- What is open, folded and lit is the book's (`GridUi`), kept across pages and
  reset per case. The section redraws itself in place, so the pencil never
  moves the notebook's scroll or the page on the left.

### Colour

The book's rule is one colour. The grid is the exception, because the
designer asked for a colour per place. The eight slots are the dataviz
skill's validated categorical order, assigned by the place's position in the
case (never cycled; the office is neutral grey). Run through its validator
against this paper: light (`#f4efe3`) passes lightness, chroma, CVD
(worst adjacent ΔE 9.1) and normal-vision (19.6) checks, and warns on
contrast for four slots; dark (`#17171a`) passes all five. The contrast
warning is met the way the validator asks: no chip is ever colour alone —
every one carries the place's name, and text on a chip is always ink.

## The transcript

```
npm run read -- --seed 3 --difficulty 2 --grid
npm run read -- --seed 3 --difficulty 2 --marks "Grasso 10 at the suite; Coffin 9:30 not the suite"
```

prints "Where they were" after the notebook: `x~` their own account, `x:K` seen
by K (the key names every initial), `x#` evidence, `-x` not there, `!` the
sources disagree, `(x)` `(-x)` pencil, `·` nothing known; the window as
`====`, anchors as `^name`, `†` on the crime's half hour; the legend, the key,
and every rule, numbered. Seed 3 at the end of the oracle's run, with two
pencil marks:

```
                      6         6:30      7         7:30      8         8:30      9         9:30      10        10:30     11        11:30
time of death                                                                                         ========
anchors                                                                                     ^piano    ^El
when it happened                                                                                      †
Sweeney (victim)      alive     alive     alive     alive     alive     alive     alive     alive     ?         dead      dead      dead
                                                                                            third:M   suite#                        suite#
Kreuzer (client)      ·         ·         ·         ·         ·         ·         ·         ·         third:M   third:M   ·         suite~
Grasso                ·         ·         ·         ·         ·         Wyck.:C   -third:M  -third:M  -third:KM ·         ·         ·
                                                                                                      (suite)
Hanrahan              ·         ·         ·         ·         ·         ·         ·         ·         third:K   third:K   ·         ·
Mulcahy               ·         ·         ·         ·         ·         ·         ·         ·         third:K   third:K   ·         ·
Coffin                ·         ·         ·         ·         ·         ·         ·         (-suite)  third:K   third:K   ·         ·
Schilling             Wyck.:H   Wyck.:H   ·         ·         ·         ·         ·         ·         garage:H  ·         ·         ·
```

A conflict, from the wandering player on seed 2 — Corrigan's own account puts
him at the Arcadia at eleven, and something found in the drying yard puts him
there:

```
Corrigan              drying~   drying~   news.:B   subway~   subway~   Arca.~    Arca.~    Arca.~    Arca.~    subway~   !drying#  !drying#
                                          news.~                                                                          Arca.~    Arca.~
```

## Numbers

**Tests:** 32 files, 665 tests, all passing (`npm test`). The grid's own: 17.
`npm run typecheck` and `npm run build` clean.

**The trace** (`test/grid-walk.ts`), on every page of 40 seeds, oracle at
difficulties 1, 2 and 3 and the wandering player at 2:

- every row is a person the notebook holds;
- every entry traces to a found clue that makes exactly that placement with
  that presence, and its source kind and witness match the clue; or to an
  account taken down that says that place at that tick; or to the briefing
  sentence the notebook prints under the victim;
- every source sentence shown is word for word in the notebook (a person's
  record, a room's record, the victim's entry, or the account line);
- the band is the notebook's window; the life line and `†` appear only with it;
- every anchor traces to a found clue with that anchor that names the hour;
- every rule traces, touches only rows on the grid, and every entry is
  covered by a rule;
- the conflict flag is exactly the disagreement among entries.

The wanderer's runs draw conflicts; the oracle's rarely do (it takes few
accounts).

**The browser** (`scripts/check-grid.mjs`, seed 3, difficulty 2, the oracle's
13 commands clicked through the real book, both sizes, light and dark): the
page never scrolls sideways; names stick; at 1280 the grid does not overflow;
two pencil marks drawn through the grid's own menu; Grasso at ten shows two
sources; the Hanrahan rule lights exactly two cells; a row folds; the
fixtures open; tapping Hanrahan turns the notebook to her entry; after a
reload both pencil marks are still there. `--measure-only` runs any seed; seeds
1–10 all fit at 1280. `scripts/check-layout.mjs` (M6's page check, 134 pages ×
2 sizes) still passes.

### Screenshots (`docs/screens/`)

| | 1280×800 | 390×844 |
|---|---|---|
| end of the oracle's run | `grid-1280-1-end-of-run.png` | `grid-390-1-end-of-run.png` |
| Grasso at ten: sources and the pencil | `grid-1280-2-cell-and-pencil.png` | `grid-390-2-cell-and-pencil.png` |
| a rule lit, the legend and rules | `grid-1280-3-rule-lit.png` | `grid-390-3-rule-lit.png` |
| a folded row, the fixtures open | `grid-1280-4-folded-and-fixtures.png` | `grid-390-4-folded-and-fixtures.png` |

```
npx tsx scripts/oracle-commands.ts --seeds 3 --difficulty 2 > out/routes-grid.json
npx vite --port 5193 &
node scripts/check-grid.mjs --routes out/routes-grid.json --seed 3 --url http://localhost:5193 --shots docs/screens
```

## Where I judged

1. **The briefing counts as the notebook.** The spec says every entry traces
   to "a found clue or a told account". The discovery and the last sighting
   are neither, but the notebook prints both under the victim from page one,
   and without them the client's own 11:30 at the scene — often the only
   placement of the client — would be missing. They trace to `brief:*`, and
   the test checks the sentence is in the victim's entry.
2. **All sources, not the notebook's first.** The notebook's fact list keeps
   one clue per fact; the grid stacks every clue that makes it, because "two
   people saw her there" is different from one.
3. **A self-placing clue is `claimed`.** When the speaker is the subject, it is
   their own word even though it came as a clue.
4. **Abbreviations are six characters at most** ("third", "suite", "garage",
   "Wyck.", "spea."), so the evening fits at 1280. The legend spells them out
   and the detail uses the full name.
5. **The detail sits under the grid, not in a popover,** so on a phone it does
   not cover the cells, and the pencil's buttons are tap-sized (44 px under
   600 px wide).
6. **The pencil is a menu, not a cycle.** Seven places × was/not makes a cycle
   of fifteen states; one tap to open, one to choose is shorter.
7. **Rows fold and fixtures open per session,** not in the save. They are how
   the grid is looked at, not what the player wrote.
8. **The grid's styles are their own file,** `src/ui/grid.css`, imported after
   `book.css`, so the grid can be changed without touching the book's sheet,
   which other work is also changing. The place colour tokens do live in
   `book.css`, beside the other tokens, with their dark values.

## Seen in passing, not touched

- The notebook's own fact list ("· 10:00 PM — not at the third floor
  (Kreuzer)") repeats what the grid and its rules now say better. It could go,
  or fold, once the designer has lived with the grid.
- `establishedFrom` drops a second clue for a fact already placed, which is
  why the notebook shows one source where the grid shows two.
