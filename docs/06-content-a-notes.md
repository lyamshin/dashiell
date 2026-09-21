# Content A notes — portraits, business, dashiell-lines, frames, utterances, find

Six decks, 670 cards: `portraits.json` (150), `business.json` (120),
`dashiell.json` (80), `frames.json` (110), `utterances.json` (160),
`find.json` (50). `corpus/tools/overlap.mjs` is clean across all six files
together (see the report handed back with this work). `scripts/validate-
decks.mjs` did not exist in the repo when this branch started, so I wrote a
small local one (schema check + the two spec-mandated coverage floors:
frames' register x temper x familiar >= 4, utterances' factKind x temper >=
3) and it passes with zero issues.

## Hardest tag combinations

**`utterances.json`, the `lie` register on non-alibi fact kinds.** The spec
ties `lie` to "a suspect giving their own claimed timeline," which only
really makes sense for `personAt`/`personNotAt`/`denial` — facts about where
somebody was. For `hasMotive`, `hadAccess`, `methodEvidence`,
`timeOfDeath`, `victimAliveAt`, `victimDeadBy`, and `secretExplained`, a
`lie` register utterance would mean the *speaker* is lying about something
that isn't their own alibi (the coroner lying about time of death, a witness
lying about the murder weapon), which the game's generator doesn't model —
clues are always true (Vision principle 1). I resolved this by giving only
`personAt`, `personNotAt`, `denial`, `hasMotive`, and `hadAccess` a `lie`
variant (the first three because false alibi claims are exactly what `lie`
is for; the latter two because a suspect minimizing their own motive or
access is a small, plausible stretch — "I never went near it" said with
too much polish). The other seven fact kinds stay `truth`/`evasion` only.
The spec's floor (factKind x temper >= 3) doesn't require every register at
every cell, so this is a content judgment call, not a shortfall — but a
future pass reconciling `ClueRole`/`Fact` semantics with the register tag
more formally would remove the ambiguity.

**`frames.json`, matching beat count to temper without contradicting the
register.** A.3 says enigma answers "in one clause, little business," but a
`lie` register is defined as "too complete" — for an enigma liar those two
pulls fight. I resolved it by keeping enigma-lie frames at the same 2-beat
shape as enigma-truth (no extra `{colour}` beats, since more beats would
break "little business"), and pushing the *completeness* tell into the
literal connective text instead — "to the minute," "not a detail out of
place," "word for word" — so an enigma liar is still terse but suspiciously,
unnaturally precise. That's a real design decision worth flagging for
whoever tunes these: it means the enigma-lie tell is entirely in word choice,
not in frame shape, so if the engine ever inspects beat count as a lie
signal it won't see anything different from enigma-truth.

**`business.json`, "suspects have nerves" vs. the burn tier.** Business
cards "may repeat" (A.8), so volume pressure is low, but writing 30 distinct
suspect-nerve gestures across three tempers without drifting into
psychological narration (which isn't this deck's job — that's the reactive
monologue's, per A.6) took the most redrafting of the deck. The rule I
settled on: every suspect business card describes a hand, a posture, or an
object, never a feeling ("kept both hands flat on the table," not "seemed
anxious"). That kept it in the same register as the fixture prop cards
rather than duplicating what portraits or the monologue already do.

## Where the schema fought the writing

**`{detective}` and the "never write the name" rule.** Partway through this
pass the designer renamed the detective from Dashiell to Dashiell and asked
that no card ever spell the name literally, always `{detective}`. This
mostly cost nothing — Dashiell's own lines (`dashiell.json`) never say his
own name in the first place, since he doesn't refer to himself in the third
person, so that file needed no changes. The place it actually mattered was
`frames.json`: I used `{detective}` deliberately in `familiar: yes` frames,
because A.2 says an acquaintance "uses Dashiell's name" — so several
familiar-register frames now have a witness address `{detective}` directly
("Straight, {detective}. Every last bit of it."), which is the one place in
Content A where that slot earns its keep rather than sitting unused.

**`{name}` vs. `{subject}` ambiguity.** B.1 defines the global slot `{name}`
as "subject surname" but `utterances.json`'s own row in the inventory table
lists `{subject}` as its slot, not `{name}`. I read this as: `{name}` is
what Dashiell and frame connective text use to address a person directly
("Tell me about {name}"), while `{subject}` is what an utterance uses when
*reporting* on a third party inside reported speech ("{subject} was at
{place}"). I kept the two distinct on that reading, but the spec doesn't
say outright whether they're meant to resolve to the same underlying string
at render time or are genuinely different slots. Worth a confirm from the
engine side before both get wired up.

**Portraits' `class` tag and fixtures.** A.4 says every person gets a
portrait "filtered by gender hint, class, and role," but fixtures
(`FixtureRole` in `src/gen/types.ts`) don't carry a `SuspectClass` the way
suspects do, and the portraits deck's own tag table (B.2) doesn't list
`role` at all — only `component, gender, class, ageBand`. I used the four
`SuspectClass` values for suspect-appropriate details and tagged
gender/pronoun-neutral, job-neutral details (a callus, a way of standing, a
patched coat) as `class: "any"` so fixtures have something to draw from.
That's roughly a third of the deck. It's a judgment call in the same spirit
as the witness-deck note in `docs/03-style-notes.md` about fixture
registers — flagging it rather than guessing at engine internals I can't
see.

## Left thin

- **`find.json`'s `morgue` clueKind** is the deck's least concrete corner.
  Physical, document, and scene clues all have an obvious "who would
  plausibly find this and where," but morgue findings are inherently
  paperwork rather than a scene a player walks through, so the
  `placeKind` tag (private/semi/public) stretches furthest here — I ended
  up locating "private" morgue finds at a private mortuary or an
  unreturned file, which is a thinner reading of `private` than the rest
  of the deck's bedrooms and drawers.
- **`business.json`'s enigma-suspect cards** repeat the same handful of
  physical tells (stillness, buttoned coat, closed hands) more than I'd
  like across ten cards, because "little business" as an instruction
  actively limits how much a card can do — there are only so many ways to
  describe someone doing almost nothing. A future pass could profitably
  trade a couple of these for more enigma-role fixture cards instead,
  where the job props give more to work with.
- **`dashiell.json`'s `ask-hired` kind** is the thinnest kind
  conceptually — it's the one place Dashiell talks about himself and his
  own arrangement rather than asking about the case, and the ten lines
  (5 unfamiliar, 5 familiar) cover the ground but don't have much room to
  vary tone the way `follow-up` or `close` do.

## Not left thin, worth naming

`utterances.json`'s `personAt`/`personNotAt`/`denial` cells got 5 cards per
temper instead of the 3-card floor, on purpose — per A.5, "the player never
loses information" and these are the fact kinds a clue-heavy run will draw
most often (most clues resolve to a timeline claim). `hasMotive` and
`hadAccess` got the same treatment for the same reason: they're the two
fact kinds every solved case needs at least one of, for every suspect.
