# Milestone 4, Part A — engine notes

The page is a scene now. The one number that says it worked is unchanged:
over seeds 1..100 at each difficulty the oracle still collects every spine
clue in **exactly par 294 times** and under par the other six — the same
294/6 M3 measured, arrived at through a reducer that now also waives
questions and hands out clues nobody asked for.

The one number that says what changed: a page was three paragraphs and a
simile, and is now **90–293 words, median 148**, measured over 3,021 pages
from 100 oracle runs and 100 runs of the imperfect player.

## What is where

```
src/game/voice/
  cards.ts      the decks, the schema, the burn tiers, the dealer
  roll.ts       A.2 — the detective's night, and who already knows him
  cast.ts       A.3, A.4 — temper and portraits, rolled once
  facts.ts      a clue read as something a person could say
  exchange.ts   A.5 — Dashiell's line × a dialogue frame × the fact as speech
  reactive.ts   A.6 — the derived monologue, the leading theory, the bias
  page.ts       A.5, A.7 — the slots, and which of them fire
  index.ts      the public surface, plus the yap volunteer
src/game/transcript.ts   A.9 — a run as prose, shared by the CLI and the tests
src/cli/read.ts          npm run read
scripts/validate-decks.mjs   Node, zero deps, reads content/deck-schema.json
content/deck-schema.json     Part B's schema as data
content/temper-weights.json  A.3's weights, for a writer to tune
```

`src/gen/` was not touched. `src/game/voice.ts` and `src/game/decks.ts` are
gone; everything they did lives in `src/game/voice/`.

## The three decisions that shaped everything else

### 1. The schema is data, not code

`content/deck-schema.json` is the only definition of a deck. The validator
(Node, no dependencies) and the engine's loader both read it, so a deck that
passes `npm run decks` is a deck the engine can deal, and a tag a writer adds
there is a tag the engine can match on without a code change. It also carries
the burn tiers, the target volumes, the legacy aliases that keep M3's fifty
place cards valid (`fixtureRole` reads back as `watcher`), and the
`mandatorySlots` table described below.

### 2. Par counts routes; the clock counts actions

The free first ask (A.2) is the only thing in the milestone that could have
moved par, and it must not, because par is a statement about *routes* and the
free ask is slack handed to a player. So `RunState` gained two fields:
`actionsUsed`, which the clock reads, and `waived`, which counts the questions
the acquaintance rule let through. The oracle reports `actions = spent +
waived` and the oracle test asserts on that, unchanged from M3.

Over 300 oracle runs, 229 questions were waived across 171 of them, and the
par table did not move by one case. The yap volunteer (A.3) is protected the
other way: **it never gives away a spine clue**, only noise, a disqualifier or
corroboration, so no route the oracle plans is ever shortened or lengthened.
191 of those 300 runs saw a volunteer.

### 3. Fairness is a slot contract, not a good intention

A.1 moves the clue's flat text to the notebook, which means the page has to
carry the fact itself or the player is cheated. The engine will not take that
on trust. `content/deck-schema.json` gives every `Fact.kind` a list of
mandatory slots — a `personAt` utterance has to carry `{subject}`, `{place}`
and `{time}` or it does not fit, whatever its tags say — and a clue is only
spoken out of the utterance deck when **every** fact it states has a card that
carries it whole.

That needed four slots Part B did not list. `{window}` (the coroner's span),
`{motive}`, `{method}` and `{secret}` carry what none of Part B's four can;
without them the morgue report, the client's brief and every disqualifier
would have fallen back for ever. They are in the schema and the content team
can use them.

Everything else falls back, in three named ways, all of them logged to
`Page.gaps` and printed by `npm run read`:

| gap | what it means | how often |
|---|---|---|
| `no-fact` | The clue states nothing structured — a hint, a noise clue, a piece of gossip. There is no template that can carry arbitrary prose, so the clue's own sentence is the line. | ~10% of pages |
| `no-utterance` | A fact kind × temper × register with no card that carries the fact. | none, with the placeholder deck |
| `too-many-facts` | A clue states more than three separate things; no exchange can say it without becoming a docket. | rare |
| `deck-exhausted` | A deck had to reshuffle inside one run. Not a fairness problem — a thinness problem, and the signal the content team works from. | often, with 8–12 card decks |

## Deviations from the spec, and why

1. **The fallback is not always "a spoken line in quotation marks" (A.5).**
   The generator writes a clue *about* its source — "Doyle says Dandridge was
   at the speakeasy", "Brauer claims the speakeasy at 9:30 PM, and cannot say
   how the fight ended". Quoting that as Doyle's words puts a sentence in a
   man's mouth that he did not say, and quoting the second puts Brauer in the
   third person about himself. So the engine first tries to *strip the
   attribution*: `<Name> says X` and `<Name> on <topic>: X` become `X`, which
   is genuinely quotable and is the clue's own words to the letter. Only when
   that does not apply does the record go on the page as a record, introduced
   in the detective's voice and set off by a rule. No information is lost
   either way.

2. **Found things keep their record on the page.** A.5 routes physical,
   document, morgue and scene clues to the `find` deck, which has no
   utterances behind it. A find card carries a `{fact}` slot and the clue's
   sentence goes in it: "The sheet comes back to the chin and the attendant
   reads it out flat. *The coroner puts death between 9:00 PM and 10:30 PM…*"
   The record is framed rather than replaced, because the alternative is a
   coroner's report nobody can read.

3. **`hadAccess` and `methodEvidence` are never spoken.** They are inferences
   the generator draws alongside another fact; no clue's text states them on
   their own. Voicing them separately would *add* information rather than
   carry it, which is the opposite failure to the one A.1 is worried about but
   a failure all the same.

4. **A run of half hours becomes a span.** A clue that establishes `personAt`
   three times in one room at consecutive ticks is one sentence with "from
   9:00 PM to 9:30 PM" in it — which is exactly what the clue's own text says.
   Without this the exchange reads like a roll call.

5. **`weather` is part of the roll.** A.2's `DashiellRoll` does not have it and
   the arrivals deck is tagged by it, so it goes in the roll where it is
   deterministic per seed. It agrees with the generator when the case drew the
   rain anchor and is otherwise scenery. It never touches the mystery.

6. **Endings are drawn off the case seed and not burned.** A.8 names similes,
   portraits and asides as the run-to-run decks and does not name endings. The
   closing page is produced by `scoreReport`, a pure function recomputed on
   every render, which has nowhere to write a burn; seeding off the case keeps
   one case's ending stable however many times it is looked at.

7. **The word counter counts the roll of who is in the room.** A page that is
   an exchange plus a claimed timeline is not a short page, even though no deck
   wrote the timeline. `countWords` prices a presence roll at six words a name
   and a timeline at five a row, and `npm run read` reports that same number,
   so what the engine trims against and what a reader counts are one number.

## Tests that changed, and why

Everything in `test/` is green: 210 tests, 10 files. Three tests had to move,
all of them for A.1:

- `reducer.test.ts` — "renders the clue text verbatim and nothing else as a
  clue" became two tests: the notebook holds the three starting clues
  verbatim, and the page carries all three in dramatized form. The `clue`
  block kind is gone; a `prose` block now carries an optional `clueId`.
- `voice.test.ts` — rewritten. The old "renders every clue text verbatim"
  became "writes every clue found into the notebook verbatim, under its
  source" plus "carries every clue onto the page as well". The card-id
  pattern assertion is now a burn-tier assertion, because the new decks have
  their own id ranges and three tiers.
- `storage.test.ts` — one import moved from `game/decks.js` to
  `game/voice/index.js`.

The M3 burn test asserted that a repeated card meant its whole deck was spent.
That is no longer true and should not be: the utterance and find decks are
matched *strictly* — a morgue frame must never describe a physical find — so
the pool that ran out is a tag's pool, not the deck's. The new test asserts
instead that any repeat inside a run is accompanied by a `deck-exhausted` gap,
which is both tighter (the engine has to admit it) and useful to the content
team.

## What the placeholder decks taught me about the real ones

1. **`familiar` doubles the frame deck and the volume does not allow for it.**
   Part B asks for 110 frames across register × temper × familiar = 18 cells
   at four each, which is 72 of the 110 gone on the grid. With 12 placeholder
   frames the `familiar: yes` half is empty and the engine widens onto the
   stranger frames, so a bartender who has known the detective for two years
   answers him like a stranger. The mechanic is invisible without those nine
   cells. **If anything gets cut, cut `familiar` on `lie` and `evasion` frames
   and keep it on `truth`** — a man who knows you lies to you the same way he
   lies to anybody, but he tells you the truth differently.

2. **`{colour}` has no deck.** Frames have a `{colour}` slot and Part B's
   inventory has nothing to fill it from. There are eight hand-written lines in
   `voice-data.ts` and they are deliberately about nobody in the case, because
   a yapper who drops a real fact there is handing the player something the
   notebook does not have. That is the right rule and it makes the lines thin.
   **The colour deck is the one deck Part B is missing**, and it wants a tag
   for *about whom*: the block, the trade, the weather of the neighbourhood.

3. **Eleven people and nine portrait cards is where consistency starts to
   hurt.** Two suspects with the same split thumbnail reads worse than two
   suspects with no detail at all, because the detail is the thing the reader
   is asked to remember. At 50 cards a component the case has 11 draws out of
   50 and it will be fine; below about 20 it is actively bad. The engine draws
   without replacement and reshuffles only when it has to, which is the most it
   can do.

4. **The transitions deck should be written anchor-first.** A.7 says one card
   per anchor template and that is the deck's best feature: "The El went over
   while I was crossing, and for twenty seconds the street had nothing to say"
   is free variety *and* it teaches the player that the El is a clock. Seven of
   the sixteen anchors have a card; the other nine fall back to the hour band
   and the page is duller for it. **Write the sixteen anchor cards first and
   the hour-band cards after.**

5. **`ask-place`, `ask-object` and `ask-hired` almost never fire.** The topic
   catalogue resolves most questions to a person, so `ask-person` does nearly
   all the work and the other seven kinds of Dashiell's line are rare. 80 cards
   split evenly across eight kinds would put 70 of them on pages nobody sees.
   **Weight the deck toward `ask-person`, `follow-up` and `close`.**

6. **The utterance deck's real shape is not 160 ÷ 36.** Three fact kinds —
   `personAt`, `personNotAt`, `denial` — are most of what gets spoken, and
   `timeOfDeath`, `methodEvidence` and `objectMissing` are spoken once a case
   at most and usually come through the find deck instead. Spread evenly, half
   the deck would never be read. **Put a hundred of the hundred and sixty on
   the three placement kinds.**

7. **The leading theory is the best thing in the milestone and it is free.**
   It is four lines of arithmetic over the established board — contradictions
   at two points each, a motive and access at one, a cleared secret at minus
   three — and it produces a narrator who accuses the wrong man with total
   confidence and then eats it. Over 60 runs of the imperfect player it named
   somebody most nights and was right well under half of those. Nothing in the
   decks does as much for the voice per line of code, and it cost nothing to
   the content budget.

## The coverage report, as of this branch

```
deck            file               cards  target  burn         status
similes         similes.json       106    300     run-to-run   100 generated, 6 placeholder
portraits       portraits.json     9      150     run-to-run   9 placeholder
business        business.json      10     120     free         10 placeholder
dashiell-lines  dashiell.json      11     80      free         11 placeholder
frames          frames.json        12     110     within-run   12 placeholder
utterances      utterances.json    18     160     free         18 placeholder
find            find.json          8      50      within-run   8 placeholder
arrivals        arrivals.json      10     60      within-run   10 placeholder
transitions     transitions.json   12     80      free         12 placeholder
ambient         ambient.json       10     120     within-run   10 placeholder
asides          asides.json        8      60      run-to-run   8 placeholder
places          places.json        58     110     within-run   50 generated, 8 placeholder
endings         endings.json       6      24      free         6 placeholder
witness         witness.json       50     50      within-run   50 generated
```

328 cards, 0 errors, 73 empty tag combinations. The gaps are the two content
branches' work; the placeholder ids sit in a reserved `<prefix>-pNNN` range
and will not collide with their zero-padded ones.

`witness.json` is M3's deck and nothing deals it any more — the exchange is
built from frames × dashiell-lines × utterances instead. It is kept because it
still validates and a writer can mine it.

## Out of scope, and still out of it

Reputation, persistence past the burn pile, Dashiell's evolution across runs.
The roll takes its seed as an argument rather than reading it off the case, so
the day a detective carries last week with him, nothing in `roll.ts` has to
change.
