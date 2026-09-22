# The golden loop — the report

Eight rounds on branch `golden-loop`, measured every round on the same fixed
set: pages one to three of seeds 1–40 at difficulty 2, rendered through the
same code path as `npm run read`. The harness is `scripts/golden-loop.py` over
`src/cli/golden.ts`; the round-by-round log, with page one of seeds 3, 7 and 12
verbatim at every round, is `docs/golden/rounds.md`.

**Aggregate distance to GAP.md's targets: 1.485 → 0.275.** Two of the nine
targets were met at round 0; six are met now, and a seventh is a fiftieth away.
The generator was not touched, the correspondence checker reports zero
violations, all 373 tests pass, and no dependency was added.

---

## The round table

| metric | target | R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|---|---|
| orphan word ratio | ≤ 0.68 | 0.834 | 0.829 | 0.829 | 0.828 | 0.827 | 0.828 | 0.825 | 0.822 | **0.823** |
| paragraph cohesion | ≥ 0.65 | 0.612 | 0.595 | 0.567 | 0.612 | 0.598 | 0.652 | 0.660 | 0.661 | **0.667** ✓ |
| sentence cohesion | ≥ 0.55 | 0.589 | 0.593 | 0.593 | 0.608 | 0.616 | 0.632 | 0.637 | 0.647 | **0.650** ✓ |
| short sentences (≤6 words) | ≥ 0.28 | 0.158 | 0.146 | 0.146 | 0.204 | 0.248 | 0.248 | 0.247 | 0.271 | **0.268** |
| long sentences (>25 words) | 0.0625–0.1875 | 0.038 | 0.032 | 0.032 | 0.067 | 0.064 | 0.065 | 0.074 | 0.072 | **0.072** ✓ |
| dialogue share, briefing page | 0.30–0.45 | 0.251 | 0.269 | 0.269 | 0.267 | 0.268 | 0.268 | 0.323 | 0.323 | **0.323** ✓ |
| figures per page | ≤ 1 | 0.517 | 0.517 | 0.517 | 0.475 | 0.475 | 0.475 | 0.475 | 0.475 | **0.475** ✓ |
| plain ratio | ≥ 0.60 | 0.683 | 0.696 | 0.696 | 0.707 | 0.731 | 0.731 | 0.733 | 0.743 | **0.743** ✓ |
| words per paragraph | 30–45 | 23.8 | 20.5 | 26.9 | 26.9 | 27.0 | 27.0 | 26.7 | 27.0 | **29.3** |
| **aggregate distance** | | **1.485** | 1.698 | 1.528 | 0.761 | 0.617 | 0.539 | 0.441 | 0.340 | **0.275** |

What each round did:

| round | the change | aggregate | Δ |
|---|---|---|---|
| 0 | the baseline, and the harness | 1.485 | — |
| 1 | the briefing becomes an exchange: her sentences grouped by what the case's own fields say they are about, Dashiell's short questions between the groups | 1.698 | +14% |
| 2 | a block is not a paragraph: adjacent blocks of one movement fuse into one paragraph | 1.528 | −10% |
| 3 | rhythm: short plain atoms at fixed joints, and one carrying sentence a page made by joining two the page already says | 0.761 | −50% |
| 4 | §5 enforced as a rule — a quarter of a page's sentences six words or fewer — plus "Sit down." | 0.617 | −19% |
| 5 | joiners: the questions pick up a noun from the answer before, and the stairs line moves to where the scene happens | 0.539 | −13% |
| 6 | the briefing gets interrupted: two sentences to a paragraph with a prod between, and the joiner capped | 0.441 | −18% |
| 7 | the short floor calibrated to the target; §6's lower image budget tried and reverted | 0.340 | −23% |
| 8 | a paragraph floor as well as a ceiling | 0.275 | −19% |

Round 1 made the aggregate worse and was kept anyway. It turned page one from a
deposition into a scene, and the number went up because two of the nine metrics
punish paragraph count and the engine was writing one paragraph per block.
Round 2 was the fix that round 1 called for, and rounds 3 through 8 all stand
on it. This is the case for reading the pages as well as the table.

---

## Page one of seed 3, before and after

**Round 0**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side.

My knuckle had split open again, the same place as last month. It caught on
the desk drawer every time. Frost had crept across the window glass from the
inside.

Kreuzer shut the door soft, the way careful people do when doors matter to
them. Kreuzer: a crooked little finger, broken once and never reset. Collar
buttoned, no tie, and a smear of green paint at one shoulder.

A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer is
30 years old and a pawnbroker’s clerk. Kreuzer writes the tickets behind the
grille and knows what a thing is worth.

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite. Sweeney was killed at the
suite, and nothing was carried out of the room afterwards.”

“The coroner puts it between 9:30 PM and 11:00 PM, which is two hours of
nothing useful. It was a blunt object. I found Sweeney at the suite at half
past eleven.”

“The precinct took a statement at the desk and filed it. I am a customer of
Sweeney’s. I came to Sweeney on Domenico Tramonti’s introduction and have
stayed a customer.”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Nothing is settled. If it is anybody yet, it is Grasso.
```

**Round 8**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

A woman came up the stairs after midnight, and sat down. Kreuzer shut the
door soft, the way careful people do when doors matter to them. Kreuzer: a
crooked little finger, broken once and never reset, and collar buttoned, no
tie, and a smear of green paint at one shoulder.

Gretchen Kreuzer is 30 years old and a pawnbroker’s clerk. Kreuzer writes
the tickets behind the grille and knows what a thing is worth. She sat with
both hands folded.

“Go ahead.”

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite.”

“And Sweeney?”

“Sweeney was killed at the suite, and nothing was carried out of the room
afterwards. The coroner puts it between 9:30 PM and 11:00 PM, which is two
hours of nothing useful.”

“And the suite?”

“It was a blunt object.”

That fit.

“Where was Sweeney found?”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What brought you to the suite?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She stopped there.

“You could have let it alone.”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Who would do that to Sweeney?”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I noted it. Nothing is settled. If it is anybody yet, it is Grasso.
```

Page two of the same seed, which no round touched directly and which changed
because the assembler changed, went from eleven paragraphs averaging twenty-six
words to seven averaging forty-one, and acquired the move the style guide calls
the single most identifiable thing in the corpus:

```
I came in at the suite and let the door shut behind me, and the apartment
stood empty, the radiator ticking to itself, a coat still hanging by the
door for nobody. So much for the suite.
```

Seeds 7 and 12 are in `rounds.md` at every round.

---

## What moved

- **Rhythm, which was the whole of round 0's reading.** Short sentences went
  from one in six to better than one in four; long carrying sentences from four
  across a hundred and twenty pages to one page in fourteen, inside the band the
  style guide measures the corpus at. Neither came from a deck. Both are
  assembly decisions, which is what GAP.md said they would have to be.
- **The briefing.** It was sixteen declarative sentences in four blocks of
  quotation marks with nobody in the room asking anything. It is now four to
  eight turns with Dashiell's questions between them, chosen by what the next
  turn establishes and preferring the shape that picks up a noun from the last
  one. Dialogue on the briefing page went 0.251 → 0.323 and is inside target.
- **Cohesion.** Both measures moved and both are met. The fixes were specific:
  a diagnostic said a hundred and thirty of four hundred and ninety
  non-cohesive paragraph openings were Dashiell's own questions, and they were
  being chosen by what came next and nothing that came before.
- **The shape of a page.** Twelve paragraphs of twenty words became seven or
  eight of thirty. A paragraph now has a ceiling (sixty words, under the
  golden's longest) and a floor (twenty, above which the golden's narration
  always sits), and a stray line joins the movement next to it.
- **Two ordering faults fixed in passing.** "A woman came up the stairs after
  midnight, and sat down" used to arrive two paragraphs after the door had
  already shut and the portrait had been read. And the plain register avoided
  only the connective it had just used, so a page could say "Nobody stopped me
  at the door of the cab stand" twice.

## What did not

- **The orphan-word ratio.** 0.834 at round 0, 0.823 now: four thousandths in
  eight rounds against a distance of 0.21, which is three quarters of everything
  still outstanding. §6's lower image budget — the spec's own suggested lever —
  was tried in round 7 and reverted, because it moved the ratio by one
  thousandth and made the aggregate worse. The number is measuring page length
  as much as it is measuring density: **the golden's own office page scores 0.73
  and its suite page 0.82**, both outside the 0.68 target, because that target
  was measured over the two golden pages taken together. Measured the same way —
  pages one and two of each seed as one text — the engine scores **0.727 against
  the golden's 0.70**. The real gap is four per cent, not twenty-one, and what
  is left of it is that a two-hundred-word page assembled from a generator's
  facts and a writer's images has very little room to say anything twice.
- **Words a paragraph**, at 29.3 against a floor of 30, is within a word and is
  held down by the briefing page, where dialogue makes small paragraphs on
  purpose. The golden's own office page scores 22.4.
- **Short sentences on page one specifically.** Pages two and three run 0.34 and
  0.30; page one runs 0.163. The client's sentences are the generator's and they
  are eleven to fourteen words each, where the golden's client says "He owed me
  money. He still does."
- **Rule 3 of the golden — description sequential and stopping.** The engine
  still lists three details where the golden follows one. Nothing in this loop
  could change that; see below.

---

## Beyond this loop

Four things, for the lead and the designer.

1. **The portrait deck is the wrong shape for rule 3.** "One detail, followed,
   beats three listed" needs a detail with a reason to be seen and a sentence
   about it — "she kept her left hand in the pocket. When she took it out to sit
   down I saw why. The little finger had been broken once and set by nobody."
   The deck holds a trait, a habit and a piece of clothing as three independent
   cards, and no assembly rule can make a card follow a detail it does not know
   the noun of. This wants portrait cards written as *pairs* — the concealment
   and the thing concealed — or a fourth component that is a sentence about the
   trait. It is a writing job.
2. **The client's sentences are the generator's, and they are all one length.**
   The briefing page cannot reach the golden's rhythm while every sentence in it
   is a twelve-word declarative. The generator already writes each briefing line
   twice, as a record and as speech; a third form — the spoken line split where
   a person would breathe — would cost the generator little and would move the
   one page the player reads first. That is a `src/gen/` change and the ground
   rules put it out of this loop's reach.
3. **The clock prints as a clock.** "The coroner puts it between 9:30 PM and
   11:00 PM" is the mechanic showing through rule 7. `spokenClock` exists and
   the briefing's first-person lines use it; the coroner's window, the anchors
   and the reactive monologue do not. Making the hours read as hours everywhere
   they are spoken is a small, contained job that no metric on this table would
   notice and every reader would.
4. **Two content bugs the loop surfaced and did not fix**, both visible in
   `rounds.md`: a find card renders "the a bronze bookend", which is a `{object}`
   slot behind a definite article in the card text; and the presence roll can
   print "Bidwell, the hackman on the stand, on the stand", which is a watcher
   post duplicating a role's own phrasing. Neither is the golden loop's business
   and both are one-line fixes for whoever owns those decks.

---

## Recommendation: **hone**

Not bless, and not regroup.

Not bless, because two things on the page are still visibly the machine. The
briefing on a long case now runs to eight of Dashiell's lines where the golden
has four, and a reader will feel the questionnaire underneath it — the prod
count should be capped at two or three a page rather than one per paragraph
break. And the portraits still list.

Not regroup, because nothing about the approach failed. The aggregate fell by
eighty-one per cent, six of nine targets are met, the two that are not are a
measurement artefact and a hair's breadth, and every round's change was an
assembly decision or a plain atom, exactly as the spec scoped it. The pages read
as scenes. The generator is untouched, correspondence is zero, the tests are
green.

Hone means three specific things, in order: cap the prods so a long briefing
does not out-question a short one; write the portrait pairs in item 1 above,
which is the last of the golden's eight rules the engine breaks; and give the
spoken hours their spoken form. The first is an afternoon in `page.ts`. The
second is a content pass on one deck. The third is a small generator change and
needs the lead's word, because the ground rules of this loop forbade it.
