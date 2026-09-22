# Dashiell

A noir murder mystery in the shape of a bound book. Every case is generated
fresh. The detective is named Dashiell, unless you tell him otherwise.

Early 20th century New York. Text input. Short runs, replayable. Inspired by
*Return of the Obra Dinn*, *Kingdom of Loathing*, *Deadline*, and *The Maltese
Falcon*.

## Status

Playable. Milestone 4, Part A — the voice engine — is in on top of Milestone
3's book. A page is no longer a record with a hat on: the detective's night is
rolled at the start, everybody has a temper and a portrait, and a question is
an exchange built out of his own lines, a dialogue frame and the fact as the
witness says it. The clue's flat text now lives in the notebook, verbatim,
under whoever gave it up; the page dramatizes the same fact and the engine
will not let it go missing.

The prose is still placeholder — 5 to 10 hand-written cards a deck, marked
`status: "placeholder"`, enough to prove the mechanism while the fragment
decks are written. See `docs/` for the design spec as it develops.

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

M7 adds tiers. The title page opens a new player on Raw (three people, three
rooms, always at Beat), and a full-credit report opens the next tier:
Coddled, Poached, Soft-boiled, Medium, Hard-boiled, then Over easy. The
difficulty is Beat, Precinct, Homicide or The DA's Office. A tiered case adds
`t=` to the link: `?seed=7&d=2&t=1` is Coddled at Precinct. A link without
`t=` is the untiered case it always was. The profile (tiers cleared, bests,
runs, wins) lives in `localStorage` under `dashiell:profile`.

### Playing

You start at the scene at midnight. Some nights you already know somebody in
the neighbourhood — a bartender you drink with, somebody who owes you — and
the first question you put to them is free. The DA's office opens at eight and files
whatever the precinct has, which gives you eight hours and, depending on the
case, thirteen to twenty actions to spend in them.

Every page ends in choices (M6): **Ask** the person in the room about
something, **Search** the room or a thing in it, **Go to** another place, or
open the notebook and file the report. Each button says what it costs of the
night — "½ hr", "25 min", or "free" — and a button that takes an open lead is
marked with a star. The same question twice, or the same room searched twice,
is free and reads the notebook back. The running head shows the time and a
strip of notches, one per call, and every page that moves you opens on a line
saying why you came.

Under the buttons the game still speaks the typed commands the transcript
tool, the oracle and the tests use:

| command | cost |
|---|---|
| `go <place>` | one action |
| `ask <person> about <topic>` | one action |
| `examine <place or object>` | one action |
| `look` | free |
| `notebook` | free |
| `help` | free |
| `file` | ends the night |

Names and places in the prose show a card from the notebook on hover (a tap
on a phone). A lead in the notebook is one click: the question if the person
is in the room, the walk there if not.

Your run is saved as you play, so a reload picks it up where you left it. The
notebook is the record: every clue you find is written there word for word,
under the person or the room it came from, and it is always one click away.

## The generator

`src/gen/` is a pure library and has its own CLI. It does not know the book
exists.

```sh
npm run case -- --seed 7 --difficulty 2              # the truth sheet
npm run case -- --seed 7 --json                      # the whole case as JSON
npm run case -- --seed 7 --candidates                # the full candidate pool
npm run batch -- --count 20 --out out                # a corpus of sheets
```

## Reading a run without playing it

```sh
npm run read -- --seed 7                  # the oracle's night, page by page
npm run read -- --seed 7 --random         # a plausible imperfect player
npm run read -- --seed 7 --pages 4        # the first four pages only
npm run read -- --seed 7 --no-gaps        # without the fallback log
npm run read -- --seed 7 --no-choices     # without the choices under each page
```

It prints the roll the night was played on, every page as a player would read
it, the notebook at the end and the filed report. The `[gap: …]` lines under a
page say where a deck had nothing and the engine had to fall back; that list
is what the content team works from. Under each page are the choices it
offered, one line per group: `*` marks a lead, `✓` something already done, and
`>` the command the player took next.

## The decks

```sh
npm run decks                             # validate every deck, report gaps
npm run decks -- --deck frames            # one deck
npm run decks -- --quiet                  # errors and gaps only
npm run decks -- --json                   # for a script
```

`content/deck-schema.json` is the card schema as data. The validator and the
engine's loader both read it, so a deck that passes here is a deck the engine
can deal. It exits non-zero on a schema error; an empty tag combination is
reported, never fatal — the engine is required to degrade through one.

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
content/     the fragment decks, the card schema, the lexicon.
test/game/   the game's tests, including the oracle playthrough.
```
