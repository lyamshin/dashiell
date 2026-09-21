# Milestone 3 — notes

The one number that mattered: over 300 cases, the oracle collected every spine
clue in **exactly par** 294 times, and under par the other six. The generator's
par and the game's action model are the same arithmetic, arrived at twice, and
neither side had to move.

## The oracle

Seeds 1..100 at each difficulty. The oracle knows which findable clues are the
spine and nothing else; it types the same strings a person types, through the
same parser, into the same reducer.

| difficulty | inside par | par range | oracle range | exactly par | 1 under | 2 under |
|---|---|---|---|---|---|---|
| 1 | 100/100 | 9–12 | 9–12 | 98 | 2 | — |
| 2 | 100/100 | 9–12 | 9–12 | 100 | — | — |
| 3 | 100/100 | 9–12 | 9–12 | 96 | 3 | 1 |

`HUMPHREY_STATS=1 npm test` prints that table.

**No disagreement between par and the action model.** The six cases that came
in under par are the two places the game is cheaper than `computePar` by
design, and both were known before the test was written:

1. **`examine` takes a whole room in one action** where par counts one action
   per clue. It only shows up when two spine clues sit in the same room and
   both are sourced from the room rather than from a person, which is rare:
   the room-sourced clues are the scene report, the morgue report and the
   missing weapon, and the first two are in the opening three for free.
2. **One question can answer two clues.** The generator files a clue under a
   topic string ("Brauer", "Brauer's account", "the fight card on the bar
   radio"), and it will happily give one person two clues under one string —
   365 such pairs across the 300 cases in the corpus. `ask` hands over the
   whole bucket for one action.

Neither of those can make the game *dearer* than par, which is the direction
that would matter. `computePar` gates a clue behind `leadsTo` and the game does
not, so the game is if anything freer still; the oracle never needed it.

The one thing I had to decide, and the reason it came out this clean:

> **`ask` delivers every findable clue filed under that exact topic string, one
> page each, for one action.**

The spec says "deliver it", singular. Delivering only the first would have made
the action model *coarser* than par in exactly the cases where two clues share
a topic: a player asking "Doyle about Brauer" would get whichever of Doyle's
two Brauer clues the deal put first, and would have to ask again — two actions
where par counted one. Grouping them is both the kinder reading and the one
that makes the two searches identical. It is symmetric with `examine`, which
the spec already defines as all-at-once.

## What the game needs that the generator does not give it

All of it is pure and derived, in `src/game/derive.ts`, which lists the same
nine items at the top of the file. `src/gen/` was not touched.

1. **The topic catalogue** (`topicsAnsweredBy`). The generator writes a clue's
   topic as free prose. A typed prompt needs a finite vocabulary, so each topic
   string is read back into the topics the spec lists — a surname, a place, an
   object, an anchor, "why I was hired" — while the exact string survives
   alongside them, so that a lead the player clicks is never ambiguous. A test
   asserts over 75 cases that every findable clue the game will ever print is
   reachable by a string the parser accepts.
2. **The claimed account** (`claimedAccount`). `ask X about that evening` is
   answered out of `Schedule.claimed`, which the generator computes and never
   makes findable. It is the spec's pseudo-clue: costs an action, always works,
   and is the only way an alibi enters the game.
3. **Threads** (`threadsFor`, `leadFor`). `Clue.leadsTo` is a list of ids; a
   lead is a sentence and a command. Two clues that one question would answer
   collapse into one lead, because one action fetches both.
4. **Presence** (`peopleHere`), from `Person.foundAt`.
5. **The established board** (`establishedFrom`). The coroner's window narrowed
   by `victimAliveAt` / `victimDeadBy`, and the contradiction between a
   person's own claim and an observation — flagged only once the player holds
   both halves.
6. **Clickable nouns** (`segmentNouns`). Longest-match, non-overlapping, and it
   reassembles to exactly the string it was given; a test asserts that over
   every findable clue, because the clue text is never allowed to change.
7. **The report's dropdowns** (`METHOD_POOL`, `MOTIVE_POOL`), read straight off
   `src/gen/data/`. The `Case` carries one method; the form needs all six.
8. **Which voice a suspect speaks in** (`ARCHETYPE_VOICE`, in `voice.ts`). The
   witness deck tags its non-fixture lines with four archetypes; a suspect is
   filed under whichever fits their `relationshipId`.
9. **Which register, and what a simile is about** (`registerFor`,
   `simileTargets`), from `Schedule.lies` and `Clue.kind`.

## Deviations from the spec, and why

1. **`ask` delivers a whole topic bucket, not one clue.** Above. This is the
   only deviation that touches the action model.
2. **The clock rounds the running total, not each step.** The spec says each
   action advances the clock by `480 / budget` minutes rounded to the nearest
   five. Rounding each step and stacking the error breaks the thing the clock
   is for: at a budget of 17 the rounded step is 30 minutes, seventeen of those
   is 8:30 AM, and the deadline would fall an action before the budget did.
   The step is therefore `round5(used * 480 / budget)` — the same size on
   average, and exact at the end. The last action lands on 8:00 AM for every
   budget from 13 to 20, which the reducer test checks for all eight.
3. **A person who is not in the room is free, and so is a topic that means
   nothing.** The spec lists three nothing-answer registers and says "clock
   still advances" for all of them. The hard rule is that no mistake at the
   prompt costs an action, and asking a man who is a mile away, or asking about
   something that is not in the case, is a mistake. Only the `present`
   register — he is standing in front of you and has nothing — costs the
   action, because walking up and asking was a choice. All twenty lines are
   still there and all three registers are used.
4. **The player starts at the scene, which is not always the residence.** The
   spec says "the scene (the residence)". In 73 of 300 corpus cases the murder
   place is not the victim's address. The scene is the scene; `RunState.at`
   starts at `solution.murderPlaceId`, which is also where `computePar` starts.
5. **`look` draws a place card only the first time a room is described.** The
   spec asks for a card on `look` and says elsewhere that cards come out on
   arrival only. A free action that burns a card every time would strip the
   deck in a dozen `look`s. A second look gets a short narrator line. Whether a
   room has been described is derived from the log, not stored.
6. **`RunState` gained three fields** — `met`, `accounts`, `reportOpen`. The
   first two could be derived from the log; keeping them explicit made the
   notebook cheaper and the save file self-describing. All three round-trip.
7. **Twelve hand-written room lines.** See below.
8. **The one bold sentence in the wrong-man ending is set in small caps**, not
   bold: the spec allows one weight and an italic, and there is no bold to set
   it in.

## What fought back

**Every card in the place deck is somebody's furniture.** All fifty cards in
`content/decks/places.json` carry a `fixtureRole` and are written out of that
fixture's props — a brass rail, a lobby desk, a silver tray of calling cards.
Two rooms in every case are unwatched, and *the scene is always one of them*
(M2's deviation: the scene is never a watched place). So the first page of
every single run described the victim's own hallway in the landlady's voice:
"Nobody's corrected the parlor clock since the landlady's husband died," at a
house with no landlady in it. Twelve hand-written lines in `voice-data.ts`
cover the gap. **The real deck needs unwatched cards, per place kind, and it
needs them for the page the player reads first.**

**A tagged deck exhausts long before the deck does.** The first draw walked
the tag match from exact (role + register) outward, and fell back to a *burned*
card inside the narrow pool before trying the wider one. A bartender's
truth-register lines run out after four or five, so a player could read the
same line twice with two thirds of the witness deck unread. The widening now
goes all the way to the whole deck before anything reshuffles, and the test
asserts a repeat is impossible before the deck is spent.

**Delivering the whole topic bucket is what makes the numbers line up, and I
only found that out by measuring.** The first draft delivered one clue per
`ask`. Before writing the oracle I measured both models against `computePar`
over 300 cases: the grouped model matched par exactly 294 times, and the
single-clue model would have needed the delivery order to break in the
player's favour to do the same. Choosing the model by measurement rather than
by reading is the thing I would do again.

**`examine` at the scene, on turn one, costs an action and finds nothing.** The
scene report and the coroner's report are two of the opening three, and they
are the only two room-sourced clues the scene has. A player's first instinct at
a murder scene is to search it, and the book charges half an hour for "I go
through the back lot again anyway." The action model is right — searching is
searching — but the opening page should probably say the room has been gone
over, and the notebook's "2 things learned here" is doing that job quietly
rather than out loud.

## What the placeholder voice taught me about the real one

1. **The clue is a different kind of sentence from everything around it, and it
   shows.** The generator writes "Doyle says Brauer was at the speakeasy at
   8:00 PM." The deck writes "He had the rye same as always, quarter past nine,
   and left before the second round." Set one above the other and the deck line
   reads like a person and the clue reads like a docket. That is the right way
   round for fairness — the fact must be unmissable — but the real voice has to
   close the gap from the *clue* side, not only from the card side. The
   generator's clue text is the thing that most needs a pass, and it is the one
   thing this milestone was forbidden to touch.

2. **The card and the clue contradict each other about a third of the time.**
   The witness card is drawn on role and register; it knows nothing about the
   fact underneath it. So a bartender says "I don't miss much from behind this
   rail" and then reports a sighting from eight o'clock, or says "quarter past
   nine" immediately above a clue that says 8:00 PM. The register tags
   (truth / lie / evasion) are the right axis and not enough of one: a card
   needs to know whether the fact it introduces is a **time**, a **place**, a
   **person**, or a **denial**, and the four want different sentences. That is
   one more tag on the witness deck, and it is the tag I would add first.

3. **The simile is the only thing on the page with no job, and it is the thing
   the page can most easily do without.** `target` is inferred from the clue
   kind and the room, which gets it in the right neighbourhood — a face for an
   observation, a lie for a denial — but the line lands next to the fact rather
   than on it. When a target has nothing unburned the page simply goes without
   a simile, and those pages read better than average. One simile in three or
   four pages, chosen because *that* page earns it, would beat one per page
   chosen because the slot exists. The style guide already says this (§2: one
   every 740 words); the engine is dealing them roughly ten times faster.

4. **Twenty nothing-answers is not twenty, it is three.** They are tagged by
   the shape of the failure, so the player sees the same three or four lines
   for the same three or four mistakes, and a run that goes badly is mostly
   nothing-answers. The real set wants tagging by *who is refusing* — the
   fixture roles and the four archetypes, as the witness deck is — so that
   Doyle's shrug is Doyle's and not the neighbourhood's.

5. **The detective's name has almost nowhere to go.** `{detective}` appears in
   exactly one of the eighty-odd lines the run can print, because the rule is
   that the name is only used when somebody addresses him — and the cards do
   not address him. The witness deck needs lines that do, or naming the
   detective is a title-page flourish and nothing more.

## What I would change next

1. **Threads are the whole interface and the prompt is the ornament.** Eleven
   leads on the opening spread, all clickable, all unambiguous: a player who
   never types anything can play the whole game from the notebook, and plays it
   better, because clicking a lead uses the exact topic string and typing a
   surname does not. That is a real finding and not obviously a bad one — but
   if typing is meant to be the interface, the leads should be vaguer than the
   commands they run.
2. **Par is 9–12 and the budget is 13–20, so every case feels the same length.**
   M2b's notes said this; playing it confirms it. The dial that would make runs
   differ is not par, it is something that makes a room expensive — a place
   that shuts at three, a person who moves.
3. **The notebook's People section is the deduction, and it is doing it for the
   player.** "9:30 PM — at the speakeasy (Doyle)" under a name, with the
   contradiction flagged in red once both halves are in hand, is most of the
   work of the case done as bookkeeping. It is exactly what the spec asked for
   and it may be too much help. The flag is the part I would take away first.
4. **Sixteen actions is about twenty minutes, not thirty to forty-five.** A run
   played straight down the leads is over quickly. The reading is the time, and
   the reading is placeholder.
