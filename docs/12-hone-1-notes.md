# Hone 1 — Tracks A and B, the notes

Branch `hone-1`, not pushed. Track C (`content/decks/portrait-pairs.json`) is
written on its own branch; everything here is built against its schema and runs
without it.

**398 tests pass** (373 before, 25 new). Correspondence is zero over seeds
1–200 at all three difficulties in the generator, and zero over the oracle and
wandering runs on the page. Nothing was added to `package.json`.

---

## The harness, before and after

Both columns are measured with the same ruler and the same targets. Neither is
comparable to rounds 0–8 in `REPORT.md`, for two reasons given under §B.5.

| metric | target (v2) | before (`main`) | after | |
|---|---|---|---|---|
| orphan word ratio | ≤ 0.82 | 0.823 | **0.809** | ✓ gained |
| paragraph cohesion | ≥ 0.66 | 0.667 ✓ | 0.657 | ✗ lost, by 0.004 |
| sentence cohesion | ≥ 0.59 | 0.627 ✓ | 0.626 ✓ | |
| short sentences (≤6 words) | ≥ 0.36 | 0.352 | **0.372** | ✓ gained |
| long sentences (>25 words) | ≤ 0.06 | 0.041 ✓ | 0.040 ✓ | |
| dialogue share, page one | 0.33–0.53 | 0.392 ✓ | 0.330 ✓ | held, narrowly |
| figures per page | ≤ 0.5 | 0.475 ✓ | 0.450 ✓ | |
| plain ratio | ≥ 0.60 | 0.743 ✓ | 0.755 ✓ | |
| words per paragraph | 22–35 | 29.3 ✓ | 30.1 ✓ | |
| **aggregate distance** | | **0.025** | **0.004** | |

Eight of nine met; paragraph cohesion is four thousandths short. The full
tables, and page one of seeds 3, 7 and 12 after the pass, are in
`docs/golden/rounds.md` under **Hone 1**.

---

## What was built

### A.1 — the question is written with the answer

Two or three sentences of every briefing carry a `prompt`, written beside the
first-person sentence they ask for, in the data file that sentence lives in:

- the discovery, in `src/gen/victim.ts` beside `foundTextFirst`
  (`DISCOVERY_PROMPTS`, three shapes each for murder, robbery and missing);
- the purpose, in `src/gen/data/cast.ts` beside `PURPOSE_TEXT_FIRST`
  (`PURPOSE_PROMPTS`, three per purpose — eight purposes, twenty-four shapes);
- the pointer, in `src/gen/client.ts` beside `reasonSpoken`
  (`POINTER_PROMPTS`, six shapes, five of which name the victim).

The variant is drawn on the case's own rng, so forty seeds ask forty-odd
different questions. The discovery prompt exists only when the client is the
one who found it, which is why the count is two or three rather than three.

Every prompt is answerable only by its sentence, and the test asserts it the
way §A.4 asks — by the template pairing, not by reading the English: the
prompt on the discovery line is the one the case wrote beside
`foundTextFirst`, it matches one of the discovery shapes, and no two lines of
one briefing carry the same question.

### A.2 — the breath-split form

`src/gen/breath.ts`. Every spoken sentence gains `breath: string[]`, one to
three pieces, and the engine chooses it over the unsplit form when the page is
short of short sentences.

The splits are made where the generator's own sentences are jointed. Three
shapes are split by hand because the generator knows their parts — "I found
Sweeney at the suite at half past eleven" becomes "I found Sweeney." and "Half
past eleven, at the suite.", which is the golden's own line. Everything else
splits at a conjunction the templates use (`, and`, `, but`, `, so`,
`, which is`, `, because`, an em dash), and among the joints available it takes
the one that leaves the shortest piece behind, because §A.2 asks for a piece of
six words or fewer where the sense allows. A sentence with no joint in it comes
back whole, which is a one-piece breath and a no-op.

A split is refused unless the second half can stand as a sentence — it opens on
a pronoun, an article, a determiner or a name — so "…, and held the paper
still" is left alone.

### A.3 — the spoken clock

`speakTimes` in `src/gen/types.ts` swaps every clock face in a text for the
hour as somebody says it, and smooths the one place English does: the far end
of a range drops its "o'clock", so the coroner's window reads "between half
past nine and eleven".

Where it is applied:

- **every clue**, at generation, before the selector copies anything: `text` is
  the spoken form and `textRecord` the numeric one. The page reads `text`; the
  notebook and the truth sheet read `textRecord`.
- **every spoken briefing line**, including the givens and the coroner's
  window. `text` — the record — keeps the clock face.
- **the engine's own page-bound hours**: the utterance slots (`facts.ts`), the
  reactive monologue's window, the claimed evening in somebody's mouth, and the
  opening note, which renders a trope's given verbatim.

Correspondence now reads spoken hours on the page as claims about the evening,
which it did not before. Two cards in seventeen decks say an hour as writing
rather than as evidence — a face that shuts "like a rolltop desk at six
o'clock", a witness who heard a door "at half past ten" — and the checker takes
the hour out of those two phrases, matched literally, before it reads the
times. The engine's own "Eight o'clock" — the morning the run ends in — moved
from an inline string in `reducer.ts` into `voice-data.ts`, where the checker
can see that a writer wrote it.

Two latent faults surfaced when the hours became readable. The default behind
the `{time}` slot was six o'clock — tick zero, a default and not a fact — so
"Where were you at 6:00 PM?" asserted an hour nothing accounted for; it is the
open end of the coroner's window now. And a trope's givens name hours that a
page could print in the opening note without the checker allowing them; it
allows them now, as it always did in the briefing.

### B.1 — the briefing uses the prompts

Page one's Dashiell lines are the prompts and nothing else, capped at three
with "Sit down." counted among them: where the briefing has three prompts of
its own, the opener waits for a shorter case. The template prods are gone from
the briefing entirely. A turn that runs to more than one paragraph is broken by
a beat of narration — "She went on." — because nobody asked her anything and
the page should not pretend they did.

Every continuation beat opens on the pronoun and runs to five words or fewer.
Both are load-bearing: the paragraph after a paragraph of speech has to carry a
reference back into it, and the page is short of short sentences.

The two free client questions after the briefing are untouched.

### B.2 — prods capped everywhere

Interviews ask at most two follow-ups a page beyond the opening question
(`FOLLOW_CAP`), and a follow-up names what it asks about: the victim, the
place, or an hour the page has established. `ASK_FOLLOW_NAMED` is the pool, and
every shape in it carries a slot, so a shape the page cannot fill is skipped
rather than emptied. Where nothing can be named the answer simply runs on and
the page logs `nameless-follow-up`.

### B.3 — breath when the page is flat

The client breathes when the short-sentence share of what is already on the
page is under 0.25, measured before the exchange goes down — which is when the
office card, the entrance and the portrait are all the page has, and when those
are three long sentences the client is where the rhythm has to come from.

The carrying-sentence join from the loop is kept, and it already refuses any
block with quotation marks in it, so it has never joined two of the client's
sentences and still cannot.

One thing was added that the spec did not ask for and the golden does: twice a
page, a turn is broken by its attribution — `"I found Sweeney," she said. "Half
past eleven, at the suite."` It is the move the professor's notes point at, it
puts the client's name in the room without a paragraph of its own, and it is
what holds the dialogue share inside the recalibrated band.

### B.4 — portrait pairs

The engine draws one `portrait-pairs` card per person at case start, on the
same tags and against the same burn pile as the three components, with the
client preferring a card tagged `setting: office` because the cards are written
for somebody sitting down across a desk. The card's `{He}` `{he}` `{his}`
`{him}` `{name}` are filled from the gender the person's name already settled.

- **First meeting**: the pair is the portrait, in place of the trait-and-one-
  more weave.
- **Every meeting after**: "Kreuzer, the woman with the broken finger."
- **The presence roll**: one person already met is named by their recall
  phrase, and only one, because a list where every name carries a clause is a
  list nobody reads to the end of.

`content/deck-schema.json` carries the deck's entry exactly as Track C
describes it, marked `optional` so the validator reports a gap rather than an
error until the cards land. The deck itself is not on this branch, so it is
registered in `MISSING_DECKS`: the dealer finds nothing, the three-component
portrait stands in, and every first meeting logs `missing-pair`. The harness
reports forty-one of them over a hundred and twenty pages, which is the honest
measure of how much of §B.4 is waiting on Track C. The behaviour is tested
against an inline fixture.

### B.5 — the targets, and the ruler

Two faults, both in the measuring.

The targets were read off the two golden pages taken as one text, so the
orphan-word target was 0.68 when the golden's own office page scores 0.77 and
its suite page 0.89. Every target is now read off v2 one page at a time: a
floor is the mean of the two pages, a band spans them, and orphan is the office
page plus the 0.05 the spec allows. The table and its derivation are in
`docs/golden/GAP.md`.

And `scripts/style-metrics.py` did not break a sentence after a closing
quotation mark, so on a page of dialogue most sentences were measured glued to
the one after them. Seed 14's office page came out at twenty-seven sentences of
which two were short; it has thirty-nine of which fourteen are. Four of the
nine metrics are functions of that sentence list, and the bug moved all four
hardest on exactly the page the golden is about. It is fixed, both sides are
measured with the fixed ruler, and `REPORT.md`'s numbers are pre-fix and should
not be compared to the ones the harness prints now.

Measuring correctly also settled a question round 3 left open: golden v2's
office page has **no** sentence over twenty-five words and its suite page has
one. The long-sentence target is a ceiling now rather than a band. The carrying
sentence stays, because rule 8 asks for a longer sentence and not for a very
long one, but more than one a page is more than the golden will support.

### B.6 — the two content bugs

- **"the a bronze bookend"**: an object's name carries its own article, because
  the sheet prints it on a line of its own, and a card writes "the {object}".
  Neither side is wrong alone, so the fix is at the seam: `collapseArticles` in
  `prose.ts`, inside `tidyPunctuation`, keeps the frame's article and minds a/an
  agreement so a frame that wrote "a {object}" does not end up with "a ice
  pick".
- **"Bidwell, the hackman on the stand, on the stand"**: `presenceClause` drops
  the post where the role has already named it.

Both have unit tests and both are asserted absent across twenty-five oracle
runs.

---

## Deviations, and why

1. **"Sit down." counts as one of page one's three lines.** §B.1 says at most
   three of Dashiell's lines and that they are the prompts. Rather than print
   four, the opener asks for the third slot and takes it only when the briefing
   left one — so a case with a discovery prompt gets the three questions, and a
   case without one gets "Sit down." and two questions. Both read as the golden
   reads.

2. **The breath forms are derived, not hand-written.** §A.2 asks for the spoken
   sentence "split where a person would breathe". The generator's briefing is
   assembled from something over two hundred templates; writing a breath form
   for each would be a content pass the size of Track C. What is written by
   hand is the split for the three discovery shapes — where the generator knows
   the parts and the golden shows exactly what to do with them — and the joint
   table, which is written against the conjunctions the templates actually use.
   Every fact survives, correspondence runs on the joined form, and a sentence
   the table does not know comes back whole rather than mangled.

3. **The client's own evening was not given spoken hours.** §A.3 lists it, but
   `clientBrief.ownEvening` is rendered by the truth sheet and by nothing else.
   It is a record, and the spec's own rule is that records keep the clock face.
   The evening the player reads on a page is the claimed timeline, which is a
   table of hours and is the notebook's timeline by another name.

4. **The attribution move** under §B.3 is not in the spec. It is in the golden,
   and without it the dialogue share on page one falls below the band the same
   spec's §B.5 derives from the golden's own page.

5. **`style-metrics.py` was changed.** §B.5 says to update the harness's
   targets; it does not say to repair the metric. Recomputing targets off a
   ruler with a known fault would have written the fault into the targets, and
   the fault is largest on the office page, which is the page this whole pass
   is about.

6. **Six tests were updated rather than left alone.** Four of them assert the
   notebook prints a clue verbatim and now read `textRecord`; one accepts a
   briefing sentence arriving in its breath form or broken by its attribution;
   one has its own sentence splitter, which had the same closing-quote fault as
   `style-metrics.py` and was reading a line of dialogue into the narration
   under it. No assertion was weakened.

---

## The pages, as a stylist reads them

Page one of seeds 3, 7 and 12 against the ten rules of golden v2. What is
furthest from the golden, in two sentences each.

**Seed 3 (Kreuzer).** The exchange is right now — three real questions, her
answers in two-sentence paragraphs, the hours spoken — but the portrait is
still the inventory rule 4 forbids: "a crooked little finger, broken once and
never reset. Collar buttoned, no tie, and a smear of green paint at one
shoulder" is three details, none of them followed, where the golden gives the
finger a reason to be seen and two sentences. The other break is rule 7 in the
second paragraph: "A woman came up the stairs after midnight, and sat down"
summarises what the next two sentences then act out, so the door shuts after
she has already sat down.

**Seed 7 (Salerno).** The third paragraph is a dossier read aloud — "Lucia
Salerno is 37 years old and a chambermaid. Salerno does eleven rooms a day and
the linen after" — where the golden puts the same facts in her own mouth as a
reference she is offering, and the surname stands as the subject of three
consecutive sentences where a person would say "she". Rule 3 is satisfied in
the questions and undone here: the page tells the reader who she is instead of
letting her say it, which is the one place this seed still reads as a record
rather than a scene.

**Seed 12 (Tillman).** The client's sentences carry the colon the golden
cuts — "Grasso was not killed at the benches: there is no blood there and no
sign of a struggle" is a sentence the reader parses twice, and rule 1 outranks
everything else. And the closing beat, "The money had not changed its mind
about anything", is a figure doing a plain sentence's job, which is precisely
the edit the professor's notes made to "the floor remembered where he had
been".

The common thread, and the one thing Hone 1 could not reach: **the client's
sentences are still the generator's paragraph of record, one fact each, eleven
to fourteen words.** The prompts made the page an exchange and the breath form
made it breathe, but a client who says "I am a customer of Sweeney's" where the
golden's says "I write the tickets at Feldman's pawnshop on Orchard Street. I
know what things are worth" is still reciting a field. That is a writing pass on
`backstoryFirst` and the tie templates, not an assembly decision.
