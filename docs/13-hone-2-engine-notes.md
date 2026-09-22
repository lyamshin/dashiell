# Hone 2 — Track A, the engine rules

Branch `hone-2-engine`, not pushed. Track B (`src/gen/data/`, the client's own
words) is a separate branch and nothing here touches `src/gen/`.

**414 tests pass** (398 before, 16 new in `test/hone-2.test.ts`).
Correspondence is zero over forty oracle runs on the page, and the generator's
own checker is untouched. Nothing was added to `package.json`.

---

## The harness, before and after

| metric | target (v2) | before (`main` 5ac8f67) | after | |
|---|---|---|---|---|
| orphan word ratio | ≤ 0.82 | 0.810 ✓ | 0.812 ✓ | |
| paragraph cohesion | ≥ 0.66 | 0.655 | 0.652 | ✗ lost, by 0.003 |
| sentence cohesion | ≥ 0.59 | 0.628 ✓ | 0.631 ✓ | ✓ gained |
| short sentences (≤6 words) | ≥ 0.36 | 0.368 ✓ | 0.362 ✓ | held |
| long sentences (>25 words) | ≤ 0.06 | 0.042 ✓ | 0.041 ✓ | |
| dialogue share, page one | 0.33–0.53 | 0.339 ✓ | 0.348 ✓ | ✓ gained |
| figures per page | ≤ 0.5 | 0.417 ✓ | 0.417 ✓ | |
| plain ratio | ≥ 0.60 | 0.757 ✓ | 0.754 ✓ | |
| words per paragraph | 22–35 | 30.4 ✓ | 31.6 ✓ | |
| **aggregate distance** | | **0.007** | **0.011** | |

Eight of nine met, the same eight as before. The full tables and page one of
seeds 3, 7 and 12 are in `docs/golden/rounds.md` under **Hone 2 — Track A**.

**The before column is not Hone 1's after column.** Hone 1 measured 0.004 with
`missing-pair ×41` — the portrait-pairs deck was on another branch and the
three-component portrait stood in on a third of the pages. The deck is on disk
now, so `main` measures 0.007, and that is the number this pass is against.

---

## What was built

### A.1 — the beat budget

`planBeats` in `src/game/voice/office.ts`. Page one's interstitial beats —
"She went straight on.", "I said nothing.", "I let her sit with it." — used to
go wherever the loop reached one: after the first turn, between every pair of
paragraphs inside a turn, and again two turns from the end. Seed 3 printed
five of them.

They are planned before the first one is printed now, out of two refusals.

**Never between two consecutive client turns.** A position is legal only when
what follows it is one of Dashiell's lines. A beat between two of her
paragraphs narrates a pause nobody took: nobody asked her anything, and "She
went straight on" says only what the quotation marks already say. Those
paragraphs join with the golden's attribution move instead —
`speechParagraphs` takes an `attributeAt` index, and a turn that runs to more
than one paragraph carries the attribution at the *seam* rather than at its
head, which is exactly where the beat used to be — or they simply run on.

**Only where the content earned it.** Three things do, in this order: a
one-word answer, which is the golden's "Collecting." and takes a `pause`; the
purpose or the pointer or what it costs, the questions a client answers
slowly, which take a `pause`; and the first turn, which takes an `ack`,
because it is the one Dashiell already knew the half of — the golden's "I knew
it."

The budget is one a page, two where the page has four or more exchanges,
counting the client's turns and the close. Of the earned positions the page
takes the best by that ranking, then prints them in page order.

**No repeat within a run.** The dealer already knows how to remember a choice
that was not a card — it does it for the reactive monologue's narrowings — so
each beat is noted under `beat:<the sentence>` and refused for the rest of the
night. When the pool is spent the shape comes round again rather than the page
going without.

Seed 3's five beats are two: "I let it stand." after a four-word answer, and
"She waited before going on." after the purpose.

### A.2 — the pair and the beat cannot both have the hands

`bodyWordsOf` and `bodyConflict` in `src/game/voice/motifs.ts`.

Motifs are what a page is *about*; this is narrower and it is about
contradiction. A pair card that has the client flipping a coin off her thumb
the whole time she talks cannot share a page with "She sat with both hands
folded" — not because the images clash but because they are two claims about
one pair of hands and only one of them can be true.

`bodyWordsOf` reads the claim two ways: off the card's motif tags, narrowed to
the ones that name a body part or a thing held (`hands`, `face`, `eyes`,
`mouth`, `shoulders`, `voice`, `breath`, plus `hat`, `coat`, `money`,
`cigarette`), and off the prose, through a word list that maps thumb, knuckle,
palm, glove and ring onto `hands`, coin, nickel and bills onto `money`, pocket
and lapel onto `coat`, and so on. The word list is what catches the plain
register, because no atom in `plain.ts` carries a tag.

The refusal is enforced in three places:

- **the business deck** — `businessLine` takes a `forbid` set and a card whose
  claim meets it is not in the rung at all, so the ladder widens past it and,
  where nothing is left, the page gets no gesture and logs `no-business`;
- **the gesture spliced into a dialogue frame** — `frameAnswer` takes the same
  set and hands it down. This was the leak the page-level test found: the
  approach gesture was filtered and the one inside the frame was not;
- **page one's settle beat** — the `BRIEFING_SETTLE` pool is filtered before a
  shape is picked, and where nothing is left the beat is dropped and the page
  logs `pair-conflict`.

`pairBodyWords` is the claim, and it is empty after the first meeting, because
every meeting after it prints the recall phrase — "Kreuzer, the woman with the
broken finger" — which does not read the detail out.

### A.3 — pronouns, and the dossier reduced to a look

Three rules.

**What he can see.** `seenSentence` in `plain.ts`. Page one opened on a record:
"Gretchen Kreuzer is 30 years old and a pawnbroker's clerk. Kreuzer writes the
tickets behind the grille and knows what a thing is worth." Nothing in the room
told him either sentence. What is left is the full name once and the age as a
band rather than a number, and the gender is dropped where the arrival sentence
has already said it. "Gretchen Kreuzer was in her thirties."

**The trade goes into her mouth.** `professionSpoken` reads `professionFirst`
wherever Track B ends up hanging it — `dossier.profession.detailFirst`,
`dossier.profession.professionFirst`, `dossier.profession.first`,
`dossier.professionFirst`, or the person — and where it finds one, the sentence
is unshifted onto the head of her first turn, which is where the golden has it
("I write the tickets at Feldman's pawnshop on Orchard Street. I know what
things are worth."). Track B has not landed, so on this branch it finds
nothing and the third-person sentence stays in his narration with a pronoun for
a subject: "She writes the tickets behind the grille."

**The surname is never the subject of two consecutive sentences.**
`pronounRepeatedSubjects` in `page.ts` runs last, over the finished blocks in
page order, because the repetition can straddle a paragraph break and because
the joiners make some of it. `opensOnSubject` and `pronounSubject` are the two
halves: the name goes only where it opens a sentence and is not followed by a
comma, since "Kreuzer, the woman with the broken finger" is an appositive and
the name is what that sentence is for. Sentences inside quotation marks are
left alone — the client naming a suspect twice is a person talking, and it is
the only name she has for him.

Two smaller applications of the same rule, both of which the metric noticed: no
beat opens on the surname, and the last note of page one reads "She is still in
the chair" rather than "Kreuzer is still in the chair".

### A.4 — stairs, door, sit, speak

`entranceStage` and `arrivalAtom` in `office.ts`. The generator's arrival
sentence — "A woman came up the stairs after midnight, and sat down" — went in
front of an entrance card that then shut the door behind her, so the page had
her in the chair a sentence before she was through the doorway.

The card is dealt before the atom is said now (the same draw, in the same
order, so no seed changes its cards), and the atom is cut to whatever fits in
front of it:

- the card names the stairs itself → the atom is dropped, because the card
  says the same thing better and with a name in it;
- the card starts at the door or in the chair → the atom keeps its stairs and
  loses its seating, because the card is about to do the seating in order;
- the card only speaks → the atom goes in whole, and stairs, chair, first word
  is already the order.

`entranceStage` is a stage per card, read off its prose, and the earliest stage
is the one that matters, since the atom may not overtake it.

### A.5 — the tests

`test/hone-2.test.ts`, sixteen of them, five `describe` blocks for the five
contracts §A.5 states. Each rule is unit-tested against the function that
decides it as well as asserted on the page: the page says a fault did not
happen on forty seeds, and the unit test says why it cannot.

The page-level assertions: beats per page inside the budget over forty seeds
and three pages, and none twice in a run; no body-part or object conflict
between a printed pair and a settle beat or a business card on any page of
forty oracle runs, with a floor on how many pairs were actually checked so the
assertion cannot pass vacuously; the surname never the subject of two
consecutive sentences and the dossier record gone from every page one; nothing
that seats the client immediately before something that gets her through the
door, and the stairs named once; correspondence at zero.

---

## The rhythm the budget cost, and where it was put back

Taking three or four beats off page one took three or four five-word narration
sentences with them, and the harness read it at once: short sentences fell to
0.352 and paragraph cohesion to 0.643, because every beat was a one-sentence
paragraph opening on a pronoun and the metric counts that as cohesive by
construction. None of that is a reason to keep beats nobody asked for, so the
rhythm went back where the golden puts it rather than where the arithmetic
wanted it:

- the client breathes on a page under the short-sentence target rather than
  under a quarter (`BREATH_SHARE_FLOOR` follows `SHORT_TARGET`), because page
  one is mostly speech and her own sentences are where its rhythm has to come
  from;
- the rhythm pass may spend one beat more (`SHORT_TOP_UPS` 4 → 5), in
  narration paragraphs and never between two client turns, and it still stops
  the moment the page is at target;
- the two pronoun moves under §A.3 above.

Short sentences came back to 0.362 and paragraph cohesion to 0.652.

---

## Deviations, and why

1. **The victim's standing stayed in the client's mouth.** §A.3 asks for the
   dossier paragraph to be "what Dashiell can see plus one sentence of the
   victim's standing". The standing is the first thing the client says, and
   moving it into his narration would have him tell the reader who the victim
   was before she has named him — which is not the golden's order either: there
   she says "Martin Sweeney is dead. You know the name." and *then* he narrates
   the standing. The engine's `ack` beat is that answer, and §A.1's ranking
   puts it after the first turn for exactly this reason. It would also have cost
   page one about eleven words of dialogue against a band whose floor it is
   sitting on.

2. **`professionFirst` is read but never found.** Track B has not landed, so
   every seed on this branch takes the second half of the rule — the
   third-person sentence, pronouned. The reader is written against four
   plausible places for the field and is a no-op until one of them exists; when
   Track B merges, the sentence moves into her mouth with no further change
   here. This is the one part of §A.3 that this branch cannot demonstrate.

3. **Two numbers outside the five items were tuned.** `BREATH_SHARE_FLOOR` and
   `SHORT_TOP_UPS`, both under "the rhythm the budget cost" above. Neither is
   in the spec. Without them §A.1 would have shipped the short-sentence metric
   under target, and the honest reading is that the beats were doing rhythm's
   job in a place the golden does not put rhythm.

4. **The entrance card is dealt before the arrival atom is printed.** §A.4 says
   the atom is "chosen to match the entrance card's stage", which cannot be
   done without the card in hand. No draw order changed — nothing is dealt
   between the two — so no seed's cards changed.

5. **Three tests were updated rather than left alone.** The burn-tier test
   enumerates the id prefixes that belong to no deck and now knows `beat:`
   alongside `monologue:`. The m5-engine briefing test asserted that every
   briefing sentence reaches the page; §A.3 takes the dossier record off the
   page on purpose, so the test now allows it and asserts the replacement is
   there instead, and accepts the detail sentence in its pronouned form. The
   same test's allowance for the arrival sentence widened to what §A.4 leaves
   of it. No assertion was weakened: each one gained a replacement assertion.

6. **`paragraph_cohesion` is three thousandths worse than `main`.** It is the
   one metric the beat budget cannot be had for free. The paragraphs that fail
   it are the same ones that failed before — Dashiell's short questions, which
   share no content word with the speech above them — and golden v2's own
   office page scores 0.53 against a target of 0.66, which is the mean of its
   two pages. Page one is supposed to score low here. Removing the beats
   removed paragraphs that passed by construction rather than by writing.

---

## The pages, as a stylist reads them

**Seed 3 (Kreuzer).** The page is now an exchange with two pauses in it, the
arrival is in order, and the dossier is three plain sentences instead of a
record — but the first thing out of her mouth is still "Sweeney was the reason
four places on the street stayed open", where the golden's client says "My name
is Gretchen Kreuzer. I write the tickets at Feldman's pawnshop on Orchard
Street" first and earns the right to be listened to. The other break is rule 7
across the whole middle of the page: every one of her paragraphs opens on the
victim's surname, so four paragraphs running start with the same word, and the
pronoun rule cannot touch them because they are inside quotation marks.

**Seed 7 (Salerno).** The dossier paragraph is fixed — "Lucia Salerno was in
her thirties. She does eleven rooms a day and the linen after." is a look and a
fact rather than two rows of a form — and "Neither of us spoke. It was late."
is the golden's own kind of beat. What is still furthest away is her second
turn: "Nothing at the back lot was forced: the lock was turned and the door was
shut again after" carries the colon the professor's notes cut, and rule 1
outranks everything else.

**Seed 12 (Tillman).** Rule 4 is met for the first time — compact, powder, two
fingers, one detail followed rather than three listed — and the carrying
sentence does real work joining the trade to the coat. The colon is still there
in "Grasso was not killed at the benches: there is no blood there", which is
Hone 1's note about this seed word for word, and it is a generator sentence
rather than an assembly decision.

The common thread is the one Hone 1 named and Track B is written to fix: her
sentences are still the generator's paragraph of record, one fact each. Track A
can decide where they go, who says them and what stands between them, and it
has; it cannot make "I am a customer of Sweeney's" sound like somebody talking.
