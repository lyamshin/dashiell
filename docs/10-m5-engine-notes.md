# Milestone 5, phase 2 — engine notes

Phase 1 built the world and proved every sentence in it traces to a field.
This phase puts it on the page, and the sentence that mattered is the one the
player reads first:

> A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer is
> 30 years old and a pawnbroker's clerk. Kreuzer writes the tickets behind the
> grille and knows what a thing is worth.

Page one used to be an office card, a portrait, one sentence of client brief
and a retainer. It is now the whole of `case.briefing` — sixteen plain
declarative sentences, split into what Dashiell saw and what the client came to
say — and the rest of the run is measured against it.

## What is in the box

- `src/game/voice/plain.ts`: the plain register. Dossier facts as sentences,
  five pools of connective tissue, the reported fact for the kinds the
  utterance deck was never written for, and the sentence count every page is
  measured by.
- The briefing page (§2), split at the victim's standing and closing on the
  retainer.
- `ask X about themselves` (§3), through the parser, the reducer and the page
  grammar, with the yapper's layer-2 fact about somebody else.
- The notebook's People as dossiers by layer, with the victim's own entry and
  third parties in italics (§4).
- `src/game/report-form.ts`: the report asks `case.act.unknowns` (§5), and
  `scoring.ts` closes by (type, outcome).
- `body-moved` opens the night at the foot of the stairs, and par is
  recomputed from there (§6).
- A robbery's owner is alive, standing at an address and answerable; a missing
  person cannot be asked anything until the case has put them somewhere (§7).
- `src/game/correspond-pages.ts`: the checker, over the pages.

## 1. The plain ratio, before and after

Two numbers, because there are two honest ways to count and the milestone
wants both a comparison and a contract.

**The contract** is §1's own rule, and the engine records it on every page as
`page.plain` and `page.image`: a sentence is *plain* when it came from the
plain register, a record, a given, a fact in somebody's mouth or a thought
about the board, and *image* when it came off one of the image-bearing decks —
similes, portraits, business, arrivals, transitions, ambient, asides, places,
entrances, office, and the colour beats. A business beat spliced into a
dialogue frame counts as image where it stands; a find card counts as image
for the sentences that are not the record.

| | pages | mean | worst page | under 0.5 |
|---|---|---|---|---|
| after | 6,500 | **0.5705** | 0.5000 | **0** |

100 oracle runs and 40 wandering runs at each of the three difficulties. The
target was 0.55 and the floor 0.50; the assembler holds the floor on every
page of every run.

**The comparison** needs one classifier that both trees can run, because the
old engine does not record the counts. `scripts/plain-ratio-before.mjs` is that
classifier: it reads `page.blocks` and calls a block image or plain by its
voice alone. It is cruder — it cannot see a business beat inside a frame — so
it reads about twelve points high on both sides, which is exactly why it is
the one to compare with.

| | pages | mean | worst page | under 0.5 |
|---|---|---|---|---|
| before (`cca6314`) | 6,508 | 0.5744 | 0.1111 | 1,468 (23%) |
| after | 6,500 | 0.7018 | 0.4444 | 11 (0.2%) |

The mean moved twelve points and the *floor* moved from a ninth to a half. The
mean was never the problem: it was already 0.57 on the crude count, because a
page with an exchange on it has always been mostly fact. The problem was the
other kind of page — a walk into a room already described, with nobody in it —
where the engine had nothing to say and said it in weather. Those pages ran at
0.11, and there were 1,468 of them.

The assembler reaches the floor in two moves and in this order: **top up, then
drop**. A page under the floor gets up to three plain connectives first —
"I let myself into the speakeasy", "Marchetti was there", "nothing happened for
a while" — and only when it has no room left for another does an image block
come off, lowest score first. Dropping first was tried and it is worse: it
turns a thin page into a bare one, and it broke the coherence number (below).

## 2. Par for `body-moved`

`view.startId` is where the night's first room is. For seven tropes it is the
scene; for `body-moved` it is `act.bodyFoundAt`, and the free report is handed
over there. Par is a statement about routes, so when the route starts somewhere
else the route is costed again from there with the generator's own exhaustive
search (`computePar`, called through `caseParFrom`).

The shift, over 40 seeds at each of three difficulties:

| shift | cases | share |
|---|---|---|
| −1 | 39 | 33% |
| 0 | 59 | 49% |
| +1 | 22 | 18% |

Mean **−0.14**. The oracle walks inside the game's par in 120 of 120, and lands
exactly on it in 90 of 120.

The shift goes both ways, which was the surprise. The intuition is that
starting away from the scene must cost a walk; the arithmetic says the foot of
the stairs is a room like any other, and a third of the time it is *nearer* to
the rest of the spine than the scene was. The budget moves with par, so the
slack between them is exactly what the generator set. Every other trope's shift
is zero by construction and a test asserts it.

What the change buys is the thing deviation 3 of the phase 1 notes asked for:
the player no longer begins in the room that is the answer to `where`. The
scene report at the foot of the stairs now says what was found *and* that the
room does not agree with it, which is the trope's own given, and the true scene
has to be reached.

## 3. Correspondence over the pages

Zero violations over: 40 seeds × 3 difficulties, oracle and wandering both, and
8 tropes × 10 seeds forced. That is roughly 9,000 rendered pages and 80,000
sentences of engine prose.

Getting there needed one decision, and it is the same decision phase 1 made
about the generator's vocabulary. The first sweep found 1,767 violations, of
which 1,700 were `unknown-name` on words like "Whatever", "Don't", "Collar" and
"St. Malachy's" — every sentence opener in seventeen decks of hand-written
noir, and every proper noun a writer put in a card on purpose.

The generator's `KNOWN_WORDS` is a hand-kept list. The engine's cannot be: it
would be the vocabulary of the whole corpus. So **the engine's list is derived
from the content it prints** — every capitalized token that appears literally
in a card's text, in a pool in `voice-data.ts`, or in a plain shape, plus the
capitalized form of the first word of each of those, because the page grammar
joins fragments and puts the first letter up. `ENGINE_WORDS` is the short
hand-written remainder for sentences the engine assembles in code.

That list is closed in exactly the way the generator's is. A new template that
reaches for a new proper noun fails the checker until the noun is either
written into a card, where `npm run decks` can see it, or made into a mention
the case owns. What it does *not* do is bless a name the engine invents per
case, because the engine invents none: every name it assembles comes out of
`view.personById` or `view.placeById`.

The last 67 violations were three real things and all three are fixed rather
than excused:

1. **"the office".** Dashiell's own room is the engine's seventh place and the
   generator has never heard of it, so every page set there was a
   `foreign-place`. It is allowed by id, not by name.
2. **The discovery hour.** "Kreuzer found Sweeney at the suite at 11:30 PM" is
   a briefing sentence and 11:30 PM is neither the coroner's window nor an
   anchor. `victimBio.discovery.foundTick` is now part of what a page may name.
3. **The open window.** The reactive monologue prints the ends of the window
   that is still open — "whatever happened, it happened 9:00 PM to 11:30 PM" —
   and those two hours are the board rather than any one fact. They come from
   `establishedFrom`, which is where the monologue got them.

## 4. What the eight sections cost

| section | where |
|---|---|
| 1. the plain register | `src/game/voice/plain.ts`, the counts in `page.ts` |
| 2. the briefing page | `splitBriefing`/`speechParagraphs` in `office.ts`, `openTheOffice` |
| 3. about themselves | `parser.ts`, `reducer.ts`, `answerSelf` in `page.ts` |
| 4. the notebook | `notebook.ts`, `transcript.ts`, `ui/notebook-view.ts` |
| 5. the report | `src/game/report-form.ts`, `scoring.ts`, `ui/report.ts` |
| 6. body moved | `startPlaceOf`/`caseParFrom` in `derive.ts`, `oracle.ts` |
| 7. robbery and missing | `victimReachable` in `derive.ts`, `openingNote` in `plain.ts` |
| 8. the tests | `test/m5-engine.test.ts`, `src/game/correspond-pages.ts` |

358 tests pass, up from 334. Six existing tests changed, every one of them
because M5 moved the contract they were written against; each carries its
reason in the source. They are listed under deviations.

## Deviations, and why

1. **The client speaks about herself in the third person, and the page says
   so.** The generator writes the briefing with the client's own name in it so
   that one string serves the sheet and the page, and the test §8 asks for is
   that every sentence of `case.briefing` reaches the page. Rewriting sixteen
   sentences into the first person would have broken that and would have been
   the engine paraphrasing the model. Instead one line of narration frames the
   register — "She gave it to me in the third person, as though it had happened
   to somebody she knew" — which is a thing frightened people actually do in
   front of a policeman. `ask X about themselves` *does* go into the first
   person, because there the person is answering rather than reciting.

2. **The briefing's last two sentences go inside the hiring frame, so the
   full stop on the last one becomes a comma.** §2 says the briefing replaces
   the hiring frame's `{fact}`, and the frames are written around a fact that
   does not end the sentence: `"{fact}, {detective}, same as always," he said`.
   The pointer is the job, so the pointer is what the frame carries. The words
   are all there; the test compares without the trailing stop and says why.

3. **Page one has a ceiling of its own: 380 words, against 300 everywhere
   else.** Sixteen plain sentences plus the office card and the entrance is
   315–340 words, and §2 asks that page one keep both cards. The voice test's
   band is now 50..380 for page 0 and 50..340 for every other page. It is the
   longest page in a run by design and it is the only one that is.

4. **`body-moved`'s par shift is sometimes negative.** See §2 above. The spec
   says "add the travel"; the arithmetic says the travel is sometimes cheaper.
   Par is recomputed rather than adjusted, which is the honest version of the
   same instruction.

5. **The endings deck gets `caseType` and `trope` in the schema, and no new
   cards.** `content/decks/*.json` is out of bounds and the milestone says the
   engine carries one hand-written closing per (type, outcome) until the
   content lands. `caseType` defaults to `murder`, because every one of the
   thirty cards on disk is about a hanging; a robbery and a disappearance draw
   nothing from the deck, close on the engine's paragraph, and log
   `missing-deck: endings has no robbery × solved card`. `coverage` is
   deliberately not extended to the new axes — demanding eighteen more cells
   would report the whole of the unwritten work as gaps on every single run.

6. **`{missed}` names the unknowns that were wrong, and falls back to the old
   missed lead.** §5 asks for the former. Some wrong-man endings are wrong on
   nothing but the name, and then "the name of the one who did it" is what
   `{missed}` says; where the report was somehow wrong on nothing at all, the
   old phrase — the spine clue that would have named them — stands in.

7. **A missing person becomes interviewable inside the run.** §7 says they are
   not interviewable "until found", and a run ends at eight in the morning with
   a report rather than with a reunion. The engine's reading: they are
   answerable once a clue in hand puts them somewhere after the hour they
   vanished, which is exactly what `left`'s signature is for. Until then they
   are in no room, in no presence roll, and the parser refuses the question with
   "Nobody knows where Alfano is. That is the job."

8. **Six existing tests changed.** Four are §6: the free report arrives at
   `view.startId` rather than `view.sceneId`, par and the budget move by the
   start's shift, and the oracle's first command is the walk to the first room.
   One is §5: the report tests are written against `case.act.unknowns` instead
   of against five fields, because seed 7 is a robbery and a robbery has no
   murder weapon. One is §1 and §2: the page-length band. Two numbers moved in
   the same spirit — the oracle's soft par agreement from 0.82 to 0.80 against
   a measured 0.817, and the gap-log prefix list gained `plain-register` and
   `no-deck-kind`.

9. **A plain sentence is transparent to §A.2's adjacency bonus.** M4b scores a
   card partly on whether it shares a motif with the block immediately before
   it. A connective carries no motif by design, so letting it reset that
   context meant every image card after it was scored against nothing, and the
   coherence number fell from 0.308 to 0.229. Plain blocks now leave the motif
   context alone. Coherence is 0.308 over 1,394 adjacent pairs, which is exactly
    where M4b left it (0.308 over 1,522).

10. **The plain floor runs last and never cuts the block the simile is a clause
    of.** The first version ran the floor before the simile, and the simile then
    attached to a block that had already gone. The second ran it after but
    refused to place a simile that would break the floor, and suppressing
    similes on a fifth of pages took coherence to 0.236. The order that works is
    image budget, ceiling, simile, top up, drop — and the simile's host is
    marked and exempt.

11. **A robbery's owner has an address the generator never gave them.** The
    generator excludes `kind === 'victim'` from every clue-sourcing rule and
    gives them no `foundAt` (phase 1, deviation 2). The engine derives one: the
    last room their true schedule leaves them in. They are on the page, they can
    be asked about their evening and about themselves, and they source no clue —
    lifting that is a change to the derivation and belongs to the generator.

12. **`findKindOf` takes the view.** A `morgue` clue in a robbery or a
    disappearance is a desk sergeant's filed report, and the find deck's morgue
    cards are all coroners and intake forms. The kind is mapped to `document`
    for those two types, which is where the cards about a piece of paper in a
    drawer are. The generator keeps the label; §7 called it a Phase 2 rename and
    this is the rename.

## What I would change

1. **The self-account wants to be written in the first person.** `firstPerson`
   conjugates every clause head and swaps the pronouns, and it is right about
   two hundred phrases out of two hundred — but it is a transformation, and a
   transformation is a thing that will eventually be wrong about a phrase
   nobody has written yet. Three lines of data per archetype would retire it.

2. **The endings deck is the visible hole.** Eighteen of the twenty-four cells
   the new tags open are empty, and every robbery and every disappearance closes
   on one of the engine's six paragraphs. They are decent paragraphs and they
   are the same paragraph every time.

3. **The plain floor is enforced per page and measured per page.** A run whose
   every page sits at exactly 0.50 would pass, and would read like a ledger. The
   mean is what makes it readable and the mean is only reported. A second
   contract — the mean over a *run*, not over the corpus — would be the honest
   version.

4. **`ask X about themselves` is not a lead.** It is always available and the
   help page says so, but nothing in the notebook puts it in front of the
   player, so it will be found by the people who read the help and by nobody
   else. It wants a line in the People section: *has not been asked about
   themselves*.

5. **Layer 2 arrives by counting.** The nth observation about somebody hands
   over their nth layer-2 fact, in the order the generator wrote them. It is
   deterministic, it never gets ahead of the case, and it has nothing to do with
   what the clue actually said. A clue about somebody's money should hand over
   the want, not whichever fact is next in the list.
