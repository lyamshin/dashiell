# Humphrey

A noir murder mystery in the shape of a bound book. Every case is generated
fresh. The detective is named Humphrey, unless you tell him otherwise.

Early 20th century New York. Text input. Short runs, replayable. Inspired by
*Return of the Obra Dinn*, *Kingdom of Loathing*, *Deadline*, and *The Maltese
Falcon*.

## Status

Playable. Milestone 3 — the book — is in: a generated case, a two-page spread,
a typed prompt, a clock that runs out at eight in the morning, and a report.
The prose around the clues is placeholder, drawn from the fragment decks to
prove the mechanism. See `docs/` for the design spec as it develops.

## Running the book

Node 20 or newer.

```sh
npm install
npm run dev        # serves the book at http://localhost:5173
npm run build      # emits a static dist/
npm run preview    # serves dist/
```

`dist/` is plain files and works from any static server, at a root or in a
subdirectory.

A case is identified by its seed and its difficulty, and the URL says which:
`http://localhost:5173/?seed=7&d=2`. Share the link and you share the case.
Leave the seed off and the title page picks a random one.

### Playing

You start at the scene at midnight. The DA's office opens at eight and files
whatever the precinct has, which gives you eight hours and, depending on the
case, thirteen to twenty actions to spend in them.

| command | cost |
|---|---|
| `go <place>` | one action |
| `ask <person> about <topic>` | one action |
| `examine <place or object>` | one action |
| `look` | free |
| `notebook` | free |
| `help` | free |
| `file` | ends the night |

Topics are anybody's surname, a room, a thing, something that happened at a
fixed hour, `that evening` (which gets that person's own account of it), and
`why I was hired`. Names are fuzzy — a given name, a surname or a prefix of
either will do.

Anything underlined is clickable, and so is every lead in the notebook; a lead
walks you there first if you are not there already. Nothing you get wrong at
the prompt ever costs you an action.

Your run is saved as you play, so a reload picks it up where you left it.

## The generator

`src/gen/` is a pure library and has its own CLI. It does not know the book
exists.

```sh
npm run case -- --seed 7 --difficulty 2              # the truth sheet
npm run case -- --seed 7 --json                      # the whole case as JSON
npm run case -- --seed 7 --candidates                # the full candidate pool
npm run batch -- --count 20 --out out                # a corpus of sheets
```

## Development

```sh
npm test           # vitest: the generator and the game
npm run typecheck  # tsc --noEmit
```

`HUMPHREY_STATS=1 npm test` also prints the oracle-versus-par table that went
into `docs/05-m3-notes.md`.

Layout:

```
src/gen/     the case generator. Pure. Unchanged by the book.
src/game/    the game's logic. Pure, no DOM, fully tested.
src/ui/      the only code that touches the document.
src/sheet/   the truth sheet renderer, shared by the CLI and the appendix.
content/     the fragment decks and the lexicon.
test/game/   the game's tests, including the oracle playthrough.
```
