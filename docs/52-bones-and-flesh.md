# Build: bones and flesh

*2026-10-15. The designer: "Perhaps we are having the cards do too much and we need to separate the plain English facts of what happened, on one hand, and the era-specific noir voice on the other. … every card would need two joined layers: the simple bones and the associated flesh that accompanies it. But we'd join the bones before we sutured the flesh." Agreed, and it's the classical separation: propositions → composition → plain realization → style. Today the planner (docs/49) joins prose, so joins are few and uniform and seams show. This build moves the planner down a level, onto propositions.*

## 1. Bones: propositions

Every fact unit becomes a typed proposition. The engine already knows these (the skeleton's `about`, `hour`, `place`, `relation`, `carries`); this makes them explicit and complete. The set, to be confirmed against what the engine emits:

| proposition | arguments |
|---|---|
| CLAIM | person, place, hour, company[] |
| LIST | watcher, place, hour, people[], nobodyElse |
| FIND | item, what it shows (means + origin + delay; motive[]; clock; handover) |
| ACCESS | person, had / hadn't, means |
| WINDOW | hours[] |
| ALIVE | victim, place, hour (last seen) |
| CONFIRMS | claim, by (a LIST or another CLAIM) |
| COLLIDES | claim, with (a LIST, CLAIM or REMARK) |
| NARROWS | to hour (said at Raw only, per docs/46) |
| REMARK | person, saw whom, where, hour |
| ADMIT | person, place, hour, names witness |
| REFUSE / SECOND-STORY / CRACK | person (+ new claim / + where the thing is) |
| MOTIVE | person, reason |
| POINTER | from (office, list, claim, remark), to (person or place) |
| HANDOVER | thing, to, place, hour |

Added in build 1, where the engine says things the table didn't have (the Built section has the set as emitted):

| proposition | arguments |
|---|---|
| PLACED | person, place, hour, by (whose word: a list, an evening, an admission, the office, a search) |
| SHIFT | watcher, from (the hour they came on; before it the list says nothing) |
| HELD | person, hour, why (a put that didn't land, and the reason; whose line and where, when the reason names them) |
| PRESENT | person, place (turned out to be in the room) |
| UNSPOKEN | people[], hours[] (nobody, them included, had said where they were) |
| LEFT | people[] or one person, hours[], seen on the street (Raw's walk) |
| HOLD / MISSING | evenings[], lists[] / people[] (the notebook at Hard-boiled) |
| RELATION, FOUND, GONE | the office: who the client is to the dead; the dead found, where, by whom; the thing gone from where |
| MEANS | how (origin, told, party, spare), place, hours, who (the lodger whose key, the keeper of the spare) |

A page's bones are a list of these, in the planner's order. Gaps (texture) have no bones.

## 2. Joining the bones: composition on propositions

The planner's four operations (aggregation, reference, connectives, rhythm) run on propositions, not sentences. Composition produces **composites**, a closed set of shapes, roughly:

- CONFIRMED-WITH: a CLAIM confirmed by a LIST, plus the others that list places at that hour;
- LIST-HOUR: a watcher's hour with its people and "nobody else";
- UNSPOKEN: the people nobody has placed at the hour;
- ACCESS-SET: who had the means, with the exception last;
- WINDOW-ALIVE: the window plus the last sighting (plus NARROWS at Raw);
- COLLISION-PAIR: the claim and the line that breaks it;
- ADMIT-CHECK: the admission and the witness's confirmation;
- CLAIM-SPAN: one place across hours;
- MOTIVE-SET: the papers' reasons;
- HANDOVER: the thing's last move.

Rules from docs/49 carry over: never across the crime hour; a collision keeps its own composite; one "so" chain and one "but" a page; docs/46's levels decide which composites may be said at which tier.

## 3. Plain realization

A small grammar renders a composite to plain English: lists ("A, B and C"), agreement, tense, the planner's reference logic for names and pronouns, and connectives from the relations. The output is the **plain page**: every fact, no voice. `npm run read -- --plain` prints it; the book gets a `?plain=1` view (and later, perhaps, a "just the facts" setting).

**Round trip:** the plain page must parse back to the same propositions. `scripts/roundtrip.ts` checks every page of 30 nights a tier, both worlds: 100%.

## 4. Flesh: voicings and textures

- **Voicings** are flesh for a bone: `content/board/voicings.json`, each `{ shape, manner?, tierBand?, template, requires?, forbids? }`, where `template` is the composite rendered in the voice with `{args}` filled by the realizer ("She had {a} here at {hour}, same as {a:they} said, and {b} with {a:them}, who'd never been near {origin} while {means} sat on it."). Several per shape; chosen by manner, tier, rhythm and least-recently-used; the plain rendering is the fallback. A voicing may reorder or fold the composite's arguments but may not drop or add a fact: the round trip is run on the voiced page too.
- **Textures** are flesh with no bone: the situated deck (docs/51), unchanged, attached after voicing.

Realization order: bones → compose → plain → voicing → textures → the reference and rhythm pass.

## 5. Two builds

- **Build 1 (code):** propositions emitted for every fact unit; composition on propositions with the shapes above; the plain realizer and `--plain`; the round trip; the planner's operations moved onto propositions; a **minimal voicing set** that reproduces today's phrasings (one voicing per shape per manner, taken from the current planner's output), so the voiced page is no worse than planner-2's. Dealt boards unchanged; all lints 0; `board-prose` before → after.
- **Build 2 (content):** the full voicing set, three to six per shape and manner, written against the goldens, in batches with the lead reading 10%; variety measured (no voicing twice a night where three exist); the blind side-by-side read, build 2 vs. planner-2, target ≥ 60% preferred.

## 6. Measures

- round trip 100% on plain and voiced pages;
- dealt boards hash unchanged; puzzle columns unchanged;
- all prose lints 0; joins per page 1–3 below Hard-boiled; list smell ≤ 10%;
- voicing variety; words a page 170–260;
- the blind read (build 2).

## Done means

A Built section per build, leftovers in docs/25, a PR per build, not merged.

## Built: build 1 (2026-10-15)

Branch `bones-1`, on main with the situated deck (#83) in it: I fast-forwarded to `origin/main` at `9fd3d72` before touching realization, and there was no unmerged `situated-deck` branch left on origin.

Every fact unit carries its propositions. The planner's aggregation, connectives and Planner 2's composition run on them (`src/game/board/bones/compose.ts`), and the three modules that did that surgery on sentences (`plan/aggregate.ts`, `plan/connect.ts`, `plan/compose.ts`) are deleted, not wrapped. A composite is said in a voicing from `content/board/voicings.json`, in the writer's own words where the planner never rephrased them, or plainly where no voicing fits. Before the one deliberate change below, every page of 30 nights a tier, both worlds and all three routes (14,733 pages) was byte for byte main's: the voicings say what Planner 2 said. The one change is the situated deck's leftover, the why-here folded into its card (§4), which touches 5% of pages.

Realization order, as built: bones → compose → voicing (or plain) → textures (`situate`, the one hook) → rhythm → reference.

### §1. The bones (`bones/types.ts`, `bones/extract.ts`)

- **Where they come from.** Each writer puts the propositions on the fact as it makes it, from the structures it is reading: `tell.ts` on each answer line (`SaidLine.props`: the claims an account line tells, the hours a watcher's line covers), `thought.ts` on each part of a thought, `pages.ts` on the office's lines (by `GivenLine.kind`), finds, puts, reactions and the notebook's clauses. `extract.ts` holds the builders (`claimProp`, `listProp`, `remarkProps`, `lineProps`, `givenProps`, `findProps`, `meansProp`). Nothing is parsed back out of a sentence.
- **What a unit's bones say is what its words say.** That was decided case by case, because the engine's phrasings select:
  - a list set against somebody who is on it says only that ("Coffin had her at the Thalia at eleven"), so the bones carry that one entry (`breakerProp`);
  - a remark set against a claim says whom it passed, where and when, not where its speaker was going;
  - an agreement names company only where the sentence does. Whoever says so isn't named, and that isn't "alone". The plain read caught this one (see Read in full);
  - a held put names whose line, and where, only where its reason does;
  - an empty hour is "nobody", so it carries no "and nobody else".
- **The set as emitted.** It is docs/52's table, plus the kinds now in §1's second table. NARROWS is in the set, and the window rule emits it at a walk, but no night says it: Raw's window is one hour. Counts on 30 nights a tier, the oracle's route:

| proposition | dealt | the neighbourhood |
|---|---|---|
| CLAIM | 3,078 | 3,090 |
| LIST | 1,709 | 1,756 |
| WINDOW | 943 | 925 |
| MOTIVE | 927 | 923 |
| MEANS | 698 | 699 |
| ACCESS | 584 | 590 |
| PLACED | 570 | 576 |
| COLLIDES | 469 | 466 |
| CONFIRMS | 336 | 345 |
| HANDOVER | 335 | 342 |
| POINTER | 322 | 326 |
| FIND | 255 | 255 |
| REMARK | 141 | 143 |
| UNSPOKEN | 112 | 107 |
| PRESENT | 111 | 108 |
| ALIVE | 106 | 107 |
| GONE | 105 | 105 |
| ADMIT | 80 | 82 |
| RELATION, FOUND | 75 each | 75 each |
| SHIFT | 61 | 61 |
| LEFT, HOLD, MISSING | 30 each | 30 each |
| CRACK | 12 | 8 |

  REFUSE, SECOND and HELD come off the wanderer's and the reader's puts; the oracle's route doesn't refuse or miss.
- **Every fact unit carries them.** On 10 nights a tier, three routes, both worlds, that is 12,931 fact units, none without. `test/bones.test.ts` holds every tier, type and world to it, and holds every argument to the case's own ids.

### §2. Joining the bones (`bones/compose.ts`)

- **Three passes, where the three modules were.**
  - **Aggregate** (a beat at a time): a watcher's hour and its "nobody else"; the notebook's placements on one person's word, and the evenings nobody else has spoken for; who could get at the means, with the exception last; one place at two hours.
  - **Connect** (the section, in order): each fact's connective from its relation, with one "so" and one "but" a page.
  - **Compose** (the thought): Planner 2's joins.

  The rules carry over: never across the crime hour (`sameSide` on the propositions' hours), a collision keeps its own composite, and docs/46's levels. The writers already say only what their level allows.
- **The decisions read what a composite would say, and cut nothing.** Its length, whether it opens on a clause of its own and how many joins it holds are all read off the composite's own rendering: the rhythm is one of composition's inputs. No sentence is made by cutting words out of another.
  - A "So" or "But" that the writer's own words open on is marked by the writer (`Item.opener`), and the writer hands over the sentence without it (`flesh.bare`). Connect decides which one is said.
  - The writers' old hints (`agg`, `core`, `joins`) are gone.
- **The shapes are a closed set** (`SHAPES`, 24). The spec's ten, plus PLACED-SET, OWN-WORD, STREET, WINDOW-MEANS, LEFT, FIND, REACTION, OFFICE, REMARK, PRESENT and HOLD for what the engine says, and PAIR and ATTACH for two composites in one sentence. Counts on 30 nights a tier, the oracle's route, dealt; the neighbourhood is within a few percent. "Inside a pair" counts composites that are a part of a PAIR, ATTACH or ADMIT-CHECK.

| shape | composites | of them inside a pair |
|---|---|---|
| CLAIM-SPAN | 1,637 | 2 |
| LIST-HOUR | 1,122 | 0 |
| OFFICE | 1,075 | 0 |
| WINDOW-MEANS | 647 | 89 |
| COLLISION-PAIR | 468 | 138 |
| PLACED-SET | 363 | 151 |
| PAIR | 355 | 1 |
| HANDOVER | 335 | 53 |
| CONFIRMED | 279 | 200 |
| MOTIVE-SET | 225 | 0 |
| OWN-WORD | 219 | 68 |
| REMARK | 202 | 0 |
| ACCESS-SET | 197 | 73 |
| FIND | 180 | 0 |
| UNSPOKEN | 112 | 24 |
| PRESENT | 111 | 0 |
| WINDOW-ALIVE | 106 | 25 |
| REACTION | 92 | 40 |
| CONFIRMED-WITH | 75 | 18 |
| HOLD | 60 | 43 |
| ADMIT-CHECK | 40 | 0 |
| STREET | 30 | 25 |
| LEFT | 16 | 0 |
| ATTACH | 5 | 0 |

### §3. Plain realization (`bones/plain.ts`)

- **The grammar.** One sentence a composite, and one clause a proposition. A run that differs only in an hour or a name is one clause with a list ("at eight, nine and ten", "with Abramowitz at eight, alone at nine and with Ashby at ten"). The clauses are joined by the composite's own join (", and", "; ", ", but").
  - Each relation says its connective: a confirmation "as she had said", a collision "which collided with this: …".
  - Places and hours are always said by name. A person is "he" or "she" when they were the subject of the clause before and nobody else of that sex was in it; otherwise the name. That is centering, the planner's reference rule in the small, and the parser reads it back the same way.
  - Gaps have no bones, so a page that is all texture (a walk, an arrival) is "Nothing new."
- **`npm run read -- --plain`** prints the plain page in place of the voiced one. **`?plain=1`** shows it in the book. I checked that in the browser at desktop width and at 375 px: the names keep their hover cards, and nothing scrolls sideways.
- **The round trip** (`scripts/roundtrip.ts`): every plain page is read back (`parsePlain`) to its bones, in order. The parser uses the same clause grammar, the same lexicon (the night's names, places, hours, others and finds) and the same reference rule. Thirty nights a tier, both worlds, all three routes: **14,733 of 14,733 pages, 60,912 propositions, 100%.**

The golden's page 8, in voice:

> Coffin’s list had Ashby here at eleven. I went over to Ashby, past the rows of seats. I sat down in the row in front of him and turned round, slowly, with an arm along the seat back. Thin, and bent at the shoulders from years over a sewing machine, he wore clothes too good to have been bought. He’d made every stitch.
>
> “Where were you tonight?” I said, and told him to get it straight first; nobody here was waiting on a cue.
>
> He took a moment, and then a little more, and started at the beginning.
>
> “At eight I went to the Automat for a plate of beans, and stayed through nine, by myself. Ten o’clock I went up to the Delmonico rooms to see about some money owed, with Mrs. Cheatham. Then at eleven I went to the Thalia to see the new play, with Feeney. Walking over to the Thalia at eleven I passed Corrigan on Stuyvesant Street, going fast, no hat.”
>
> So here at eleven, with Feeney, which was what Coffin had, but the part worth keeping came last: Stuyvesant Street was where Prentiss kept Duchess.
>
> I buttoned my coat. It came off a rack, and in that company it knew it.

And plainly:

> Ashby said he was at the Automat at eight and nine, alone. He said he was at the Delmonico rooms at ten, with Mrs. Cheatham. He said he was at the Thalia at eleven, with Feeney. He said he passed Corrigan on Stuyvesant Street at eleven on the way to the Thalia.
>
> Coffin’s list put Ashby at the Thalia at eleven, with Feeney, as he had said, but Stuyvesant Street was the street of the Prentiss flat.

The thought is one unit with bones `PAIR(but) [CONFIRMED (confirmed/so): CONFIRMS ashby@11 Thalia, with Feeney, by Coffin’s list] [STREET (street/one-small): POINTER remark → the Prentiss flat]`, voiced through `pair/but`. The answer's lines are four units in Ashby's own words, with CLAIM and REMARK bones.

### §4–§5. Flesh: voicings, textures (`bones/voice.ts`, `content/board/voicings.json`)

- **The minimal set: 49 voicings over 12 shapes**, each the planner's own phrasing as a template.
  - One per shape, manner and form: the connective a composite took (so, which, same, too, held, but, two), and what it is (a murder or a small case, a walk).
  - The window has ten, for that reason.
  - `own-word/for` and `own-word/said` share a pick key, and the hand's least-recently-used rule chooses between them, as Planner 2's "hours-form" did.

  The shapes the planner never rephrased keep the writers' own words as their flesh (`voicing: "flesh"`): the answers, the office, the finds, the puts, the reactions and the notebook's single clauses. That is 70% of composites on the oracle's route. Moving those into `voicings.json` is build 2's.
- **Choosing.** A voicing is taken from those of the composite's shape that fit its flags, its speaker's manner and the tier band; the most specific wins. Nothing fits: the composite is said plainly, and still reads back (tested by voicing a night with an empty set). Inside somebody's answer the fallback is their own words, not the plain page's narration.
- **The voiced round trip** (`bones/reread.ts`, `VOICED.check`):
  - Every composite said in a voicing is read back through that voicing's template to its arguments, and the arguments to propositions. These must be the composite's, in any order: a voicing may reorder.
  - What a voicing folds is taken from where it was folded: the watcher of their own list, the person whose evening is confirmed, "had said" for an admission.
  - A pair's words must be its two parts' words, joined as its voicing joins them.
  - **12,048 of 12,048 voiced composites read back** (30 nights a tier, both worlds, three routes). A voicing that drops an argument fails: the test takes `{hour}` out of `confirmed/list` and gets misses.
  - The writers' own words get the people check: everybody their bones name is named in their words (by name, by the engine's marked pronoun, as the speaker's "I", or by role), and nobody else is. **28,549 of 28,559.** The ten misses are one neighbourhood line, Miss Nowak's admission ("Only please don’t tell Mrs. Rafferty"). It names the landlady as texture inside a fact.
- **Textures** attach after the voicing, in one place: `situate` in `planSection`, unchanged from docs/51. The reference and the rhythm run last.
- **The why-here's fold** (the situated deck's leftover, docs/25). A why-here was its reason plus a card, two medium sentences, and that raised list smell at Raw and Hard-boiled. The rhythm now has one more mend: the reason and the card as one sentence, with "so". It is kept only where the page's runs go down, as every mend is: "Coffin’s list had Abramowitz at the Thalia at nine, so I stood just inside a while, getting the lay of it, and then I went to work."
  - The reason must be past tense (somebody said, a list had).
  - The card must be something I did (`FOLD_ACT`: went, stood, stayed, kept my voice down…).
  - My first read of it found "…, so I wished rooms could talk" and "A man’s papers are where he keeps…, so I…", and those two rules came from that read.
  - It still never joins with "and" or a semicolon, the seam the blind read caught.

### §6. Measures, before → after

**Before** is main at `9fd3d72` (Planner 2 and the situated deck). `npx tsx scripts/board-prose.ts [--world neighbourhood]`, 30 nights a tier, the oracle's route except where a column says all three.

**Dealt**

| tier | words a page, median | list smell, pages (oracle) | list smell, pages (all three routes) | joins a page with facts [share 1–3] | sentences per fact unit | prose lints |
|---|---|---|---|---|---|---|
| Raw | 194 | 24 → 22 of 280 | 101 → 96 | 1.1 [91%] | 1.54 | all 0 → all 0 |
| Coddled | 187 | 11 of 276 | 57 → 54 | 1.1 [84%] | 1.45 | all 0 → all 0 |
| Poached | 182 | 27 of 398 | 94 → 93 | 1.2 [91%] | 1.46 | all 0 → all 0 |
| Soft-boiled | 180 | 22 → 21 of 383 | 81 → 75 | 1.1 [87%] | 1.44 | all 0 → all 0 |
| Medium | 172 → 171 | 51 → 44 of 439 | 175 → 124 | 1.2 [85%] | 1.37 | all 0 → all 0 |
| Hard-boiled | 170 | 60 → 37 of 435 | 139 → 94 | 0.3 [25%] | 1.38 | all 0 → all 0 |

**The neighbourhood**

| tier | words a page, median | list smell, pages (oracle) | list smell, pages (all three routes) | joins a page with facts [share 1–3] | sentences per fact unit | prose lints |
|---|---|---|---|---|---|---|
| Raw | 226 | 33 of 280 | 136 → 132 | 1.2 [91%] | 1.71 | all 0 → all 0 |
| Coddled | 221 | 29 of 276 | 100 → 97 | 1.1 [86%] | 1.58 | all 0 → all 0 |
| Poached | 200 | 34 of 407 | 129 → 123 | 1.2 [95%] | 1.52 | all 0 → all 0 |
| Soft-boiled | 197 | 34 of 385 | 130 → 125 | 1.1 [87%] | 1.47 | all 0 → all 0 |
| Medium | 201 | 72 → 62 of 437 | 243 → 193 | 1.3 [85%] | 1.40 | all 0 → all 0 |
| Hard-boiled | 204 → 203 | 58 → 39 of 435 | 160 → 115 | 0.2 [25%] | 1.45 | all 0 → all 0 |

- **Every prose lint is 0 before and after**, in both worlds: reader lint, correspondence, thoughts over their level, plain terms, cards twice, sentences twice, names three times, clues three times, place names bolted on, banned phrases, signposts, gags, "it". So are pronoun ambiguity, on all three routes, and restated pointers.
- **List smell** fell at every tier, in both worlds. On the oracle's route at Hard-boiled it went from 14% to 9% of pages, back under where it was before the situated deck. It is at or under 10% everywhere except Medium (10.0% dealt, 14.2% in the neighbourhood) and the neighbourhood's Raw (11.8%) and Coddled (10.5%). There the runs are three pieces of the arrival's texture (docs/25).
- **Joins a page** didn't move: 1.1–1.3, with 84–95% of pages with facts in 1–3 below Hard-boiled. Hard-boiled is 0.2–0.3 by docs/46. The plain page has no voice to join; these are the voiced page's.
- **Words a page** moved by one at most. Every tier is inside 170–260; dealt Hard-boiled is on the floor, at 170, where it was.
- **Dealt boards hash unchanged:** seeds 1–40, every tier and type, are `57ede58c…`, and the neighbourhood's are `52e06c8c…`, before and after.
- **`board-measure`, 50 seeds a tier and type, is byte for byte the same**: every puzzle column, and the callback pages too.
- **The round trip** is 100% on plain pages and 100% on voiced composites, as above.
- **Pages that read differently:** 746 of 14,733. That is 606 pages with a fold, and 140 where the hand's spent cards came out otherwise once a fold was kept in place of a trade, so a later page dealt another piece of texture. No fact sentence changed.

### Read in full

All three nights were read twice, in voice and plainly (`--plain`): the golden's night (seed 1, Medium, lost pet, dealt), the neighbourhood at Medium (seed 5, murder) and the neighbourhood at Poached (seed 4, murder).

- **Found and fixed.**
  - **An agreement said "alone" when it wasn't.** Glick was at the flats over Lipsky’s "with Teitel", and Teitel's evening confirmed it. The voice says "Teitel had him at the flats over Lipsky’s at seven", naming no company because the source isn't named. The bones said `company: []`, and the plain page said "alone". Company is now in the bones only where the sentence names somebody. The round trip couldn't catch this: both sides agreed on the wrong thing. The read did.
  - The plain page said a person's company hour by hour as a clause each ("and she said she was alone at nine, and she said…"). A run is now one clause: "She said she was with Abramowitz at eight, alone at nine, with Ashby at ten and alone at eleven."
  - "Miss Nowak was in the room at the stock room at the Peacock" is now "turned out to be at".
  - The fold's non sequiturs (§4).
- **The voice.** In voice the three nights read as Planner 2's with the situated deck, plus the folds. The golden's has two: page 9, "Ashby had passed her on Stuyvesant Street at eleven, so I kept my questions behind my teeth until I was further in than the doormat", and page 11. The neighbourhood's Medium night has two (pages 8 and 10); its Poached night has none.
- **Seen and left.**
  - "Ten, Teitel and Doyle. And nobody else." is a watcher's bible line, said their own way, so the planner doesn't aggregate it.
  - "I sat down in the row in front of him" after the arrival put Ashby in the lobby is docs/51's leftover.
  - "so I stayed in the doorway with my hat off until I was asked in" turns up on many nights. It is the one card of its situated key (docs/51's leftover), and the fold makes it more visible.

### Tests

**678** (was 590), all passing, at three workers in about 80 s. `tsc` is clean, and `npm run build` works: the book's script is 1,628 KB (412 KB gzipped), up 51 KB (16 KB) for the bones, the plain grammar and its reader.

`test/bones.test.ts` (88) holds:

- every fact unit to its propositions, of the closed set, in the case's own ids;
- every plain page to its bones (two seeds, oracle and wanderer, every tier, type and world);
- the golden's page 8 to its plain words;
- the reference rule;
- every voicing to a shape of the set, with no name, place, hour or digit of its own;
- every voiced composite to its bones;
- a voicing that drops a fact to failing;
- an empty voicing set to the plain fallback.

`test/plan.test.ts`'s composition tests now build their facts from propositions, not from text and hints.

### What's open

See docs/25, "Bones and flesh, build 1".

## Built: build 2 (2026-10-15)

Branch `bones-2`, on main with the situated deck's dial (#86) and the old decks' dial (#87) merged in. Everything in it is written to docs/53, the dial, which arrived while the build was under way: the plain sentence is the spine, and a voicing adds at most one broad noir touch to it, at 3–4 of 10.

### §1. Voicings for every shape

- **1,203 voicings over all 24 shapes** (main has 49 over 12).
  - Every form the nights say has three to six fitting voicings, by manner where it is speech (plain, terse, careful) and by tier band where the level asks.
  - Of 275 forms on four nights a tier, both worlds, 154 have 3, 74 have 4, 11 have 5 and 34 have 6.
  - Two have fewer: a PAIR joined with ", and" has two (", and", "; and") and one joined with a semicolon has one. A join's own words are only the join, and "and besides" or "and on top of that" claimed links the facts don't have.
- **How they were written.** I wrote a brief from docs/53, and seven helpers worked one at a time, a shape group each. Each was given:
  - the shape's argument schema (`bones/schema.ts`);
  - real composites with their plain renderings (`voicings.ts samples`);
  - the tools: `check` for the lint and the dial, `show` for the round trip and the clarity check on real composites, and `coverage` for three to six a form.

  I read at least 10% of every batch (one template in five to one in eight, and their filled sentences) and accepted all seven. Each was over 80% keepable and none was above the dial. A handful of templates I cut or rewrote by hand afterwards, and the blind read's dislikes are below.

| shape | main | kept | rewritten | cut | added | now |
|---|---|---|---|---|---|---|
| CLAIM-SPAN | 0 | 121 | 48 | 0 | 15 | 184 |
| LIST-HOUR | 1 | 81 | 75 | 10 | 13 | 169 |
| REACTION | 0 | 34 | 87 | 4 | 43 | 164 |
| OFFICE | 0 | 64 | 39 | 2 | 0 | 103 |
| WINDOW-MEANS | 0 | 40 | 27 | 1 | 2 | 69 |
| HANDOVER | 0 | 30 | 31 | 0 | 0 | 61 |
| ACCESS-SET | 7 | 38 | 19 | 0 | 3 | 60 |
| FIND | 0 | 22 | 33 | 0 | 0 | 55 |
| PLACED-SET | 5 | 28 | 20 | 6 | 0 | 48 |
| COLLISION-PAIR | 3 | 27 | 13 | 10 | 1 | 41 |
| REMARK | 0 | 36 | 4 | 0 | 0 | 40 |
| WINDOW-ALIVE | 10 | 0 | 32 | 0 | 4 | 36 |
| CONFIRMED | 7 | 0 | 29 | 3 | 2 | 31 |
| HOLD | 0 | 24 | 0 | 0 | 6 | 30 |
| MOTIVE-SET | 0 | 19 | 7 | 0 | 0 | 26 |
| OWN-WORD | 3 | 10 | 11 | 3 | 0 | 21 |
| STREET | 4 | 0 | 16 | 0 | 0 | 16 |
| CONFIRMED-WITH | 3 | 0 | 9 | 3 | 0 | 9 |
| LEFT | 0 | 3 | 6 | 0 | 0 | 9 |
| UNSPOKEN | 0 | 6 | 2 | 0 | 0 | 8 |
| PRESENT | 0 | 7 | 0 | 0 | 1 | 8 |
| PAIR | 3 | 4 | 0 | 0 | 2 | 6 |
| ATTACH | 2 | 4 | 2 | 0 | 0 | 6 |
| ADMIT-CHECK | 1 | 3 | 0 | 0 | 0 | 3 |

"Kept" is kept from the voicings this branch's first pass wrote before docs/53 arrived. The 49 of build 1 are all rewritten. None of the 1,203 says "which was what", "here" for a place, "where I could check it", "by her count", "the part worth keeping" or "kept Duchess".

- **The arguments the dial needed.** A voicing can only say a fact it has an argument for, so the writers now hand over:
  - whose list or word it was, by name ({whose}: "Coffin’s list", "Mrs. Cheatham’s account"; the office is the client's account);
  - the person ({person});
  - the keeper of a list ({keeper}: "Coffin’s list said …", never "by his count");
  - the put's own place and hour, on a hole, a refusal, an admission and a held put ("Abramowitz had a hole in his story, the Thalia at eleven");
  - the party's hour, and the hours the client told the room, on the scene and the find.

  Places are said by name everywhere. The composer's spans and the thread's pointers no longer say "here", though a watcher's own speech may, for the room they're in. "The list" is always somebody's.
- **The own-words paths are retired.** On the oracle's route, 30 nights a tier, both worlds, 98.1% of composites are said in a voicing (14,201 of 14,473), where main says 25.5% (3,608 of 14,145). None fall back to the plain rendering.
  - The 272 left in the writers' own words are the neighbourhood bible's (`content/neighbourhood`): a watcher's bible lines, admissions and refusals, said in their own words by docs/48.
  - The writers still compose their old sentences, but only `PLAN.ops = false` (docs/49's "before", `board-prose --plan off`) shows them. It runs and costs nothing, so it stays.

### §2. Selection

As the first pass built it (`bones/say.ts`). A voicing is chosen from:

- the shape's voicings that fit the composite's flags, the speaker's manner and the tier band, the most specific of them;
- no joke where the page has told its one;
- no sentence a page before this one narrated;
- least recently used tonight, by the page's dice among the unsaid;
- plain where nothing fits.

The rhythm may trade a voicing for another unsaid one of another length.

- **Variety**, 30 nights a tier, both worlds (`voicings.ts variety`):
  - **0** voicings were said twice in a night while another that fitted was still unsaid.
  - Where three or more fitted, a voicing was said again 11 times in 14,264 choices. Those are forms said more often in a night than they have voicings.
- An agreement whose line is somebody of the person's sex now carries the flag `twosome`, and the voicings with a pronoun for the person forbid it. Without it: "Coffin’s list had Ashby at the Thalia, just like he said."

### §3. Checks

- **The round trip: 100%.** 30 nights a tier, both worlds, all three routes:
  - 14,733 of 14,733 plain pages (60,912 propositions) read back to their bones;
  - 41,996 of 41,996 voiced composites read back through their templates.
- **The clarity check** (`bones/clarity.ts`, beside the round trip): **100%**, 41,996 of 41,996. A voiced composite is clear when:
  - every place and hour its propositions name is in its words, as the plain rendering says it. A place may also be said as whose it is ("Bledsoe’s" for the Bledsoe flat, "his own rooms" with his name in the sentence). A run of hours may be "from eight through ten" or "between eight and ten", and the end of the evening "the rest of the evening";
  - there is no "here" in the narration, and no "there" without a place before it in its sentence;
  - there is no "the list" without whose;
  - none of docs/53's oblique tags is in it.

  A speaker may leave out the room they're in, or their own home, and the office's lines are the client's. The answer to "what was under the coat" leaves its hour to the line before it.

  `scripts/roundtrip.ts` reports the check, and `test/bones.test.ts` holds every tier, type and world to it. The test also shows that build 1's "So {spans}, which was what {src}" reads back but isn't clear.
- **The lint** (`scripts/voicing-lint.ts`, `voicings.ts check`) holds every voicing to its shape's schema, to the facts its form must say (`mustSay`, now with the new arguments), and against docs/53's tags, "here" and "the list". 1,203 voicings, no issues.

### §4. Measures, before → after

**Before** is main at `47f10e2` (#87). Thirty nights a tier, the oracle's route except where a column says all three.

- **Joins a page** is now read off the composites (`plan/measure.ts` `joinsIn`), and both builds are counted that way here. The voicings say a join many ways, so the old pattern match on build 1's phrasings ("which was what", "same as he said") can't count them. The page's one "But" and one "So" are still held to the words as well (`test/plan.test.ts`).
- **The share in 1–3** counts every page with a fact, the office and arrivals included, so it reads lower than build 1's figure.

**Dealt**

| tier | words a page, median | list smell, pages (oracle) | list smell, pages (all three routes) | joins a page with facts [share 1–3] | sentences per fact unit | prose lints |
|---|---|---|---|---|---|---|
| Raw | 196 → 196 | 22 → 15 of 280 | 96 → 71 | 0.9 [57%] → 0.9 [64%] | 1.54 → 1.49 | all 0 → all 0 |
| Coddled | 188 → 196 | 10 → 6 of 276 | 50 → 45 | 0.9 [58%] → 0.8 [54%] | 1.45 → 1.49 | all 0 → all 0 |
| Poached | 184 → 185 | 20 → 22 of 398 | 72 → 77 | 1.0 [73%] → 0.9 [70%] | 1.46 → 1.49 | all 0 → all 0 |
| Soft-boiled | 181 → 184 | 20 → 27 of 383 | 69 → 86 | 1.0 [65%] → 1.0 [65%] | 1.44 → 1.47 | all 0 → all 0 |
| Medium | 175 → 178 | 42 → 34 of 439 | 113 → 103 | 1.1 [63%] → 1.1 [63%] | 1.37 → 1.43 | all 0 → all 0 |
| Hard-boiled | 172 → 179 | 26 → 31 of 435 | 77 → 75 | 0.1 [11%] → 0.1 [11%] | 1.38 → 1.46 | all 0 → all 0 |

**The neighbourhood**

| tier | words a page, median | list smell, pages (oracle) | list smell, pages (all three routes) | joins a page with facts [share 1–3] | sentences per fact unit | prose lints |
|---|---|---|---|---|---|---|
| Raw | 225 → 223 | 33 → 22 of 280 | 135 → 104 | 0.9 [59%] → 0.9 [63%] | 1.72 → 1.63 | all 0 → all 0 |
| Coddled | 222 → 216 | 28 → 22 of 276 | 95 → 86 | 1.0 [60%] → 0.8 [57%] | 1.58 → 1.55 | all 0 → all 0 |
| Poached | 200 → 207 | 35 → 35 of 407 | 120 → 115 | 1.1 [75%] → 1.0 [70%] | 1.52 → 1.53 | all 0 → all 0 |
| Soft-boiled | 199 → 207 | 36 → 36 of 385 | 127 → 129 | 1.0 [65%] → 0.9 [63%] | 1.47 → 1.49 | all 0 → all 0 |
| Medium | 201 → 205 | 63 → 56 of 437 | 190 → 167 | 1.1 [66%] → 1.0 [64%] | 1.40 → 1.44 | all 0 → all 0 |
| Hard-boiled | 203 → 210 | 38 → 43 of 435 | 117 → 123 | 0.1 [11%] → 0.1 [11%] | 1.45 → 1.54 | all 0 → all 0 |

- **Every prose lint is 0 before and after, in both worlds.** That covers reader lint, correspondence, thoughts over their level, plain terms, cards twice, sentences twice, names three times, clues three times, place names bolted on, banned phrases, signposts, gags, "it", pronoun ambiguity (all three routes) and restated pointers.
  - Naming every place cost three of them on the way, and each is fixed: one list's two people at one place said once ("Mrs. Kowalski’s list had Brauer and Brennan at Kowalski’s all evening"); a why-here the last page's hand-off said whole is carried; and the turn's what-next carries the place it names.
- **List smell** is at or under 10% everywhere but the neighbourhood's Medium, which went from 14.4% to 12.8%. It fell at eight tiers of twelve. Where it rose (dealt Poached, Soft-boiled and Hard-boiled; the neighbourhood's Hard-boiled), it rose by two to seven pages.
- **Joins a page** didn't move beyond ±0.2. Hard-boiled is 0.1 by docs/46.
- **Words a page** went up by 0–9, from saying the place, whose word and the hour every time. Every median is inside 170–260.
- **The dealt boards hash the same before and after:** seeds 1–40, every tier and type, are `b3c9a36e…` dealt and `be1c6127…` in the neighbourhood.
- **`board-measure`, 50 seeds a tier and type, is the same in every puzzle column.** Only the callback pages' share, a prose column, moves (62–71% → 67–75%).

### §5. The blind read

Twenty pages across both worlds and every tier (`scripts/bones-read.ts`): five accounts, three lists, three puts, two searches, two offices, two motives, two turns and an arrival. Each was written by build 2 and by main from the same night, shown in random order and unlabeled. Two blind readers went one at a time, on the rubric "which page is clearer and still sounds like the game", in that order.

**Build 2 was preferred in 26 of 40 (65%): 13 of 20 by each reader.**

- **Where build 2 won,** it named the place where main said "here" (eight pairs), said whose word a fact stood on, and named the lost thing where main's "She went at ten o’clock" read as the woman just questioned. In one office, main's "Broadnax … found the body in his own walk-up" read as Broadnax's walk-up.
- **The pairs main won, and why:**
  - **Pairs 4 and 20 (both readers), and pair 19 (both readers): fixed.**
    - Pair 4: "Whatever the line showed, it didn’t touch…" made them ask which line.
    - Pair 20: the careful manner's padding ("first of all", "by my watch", "to be exact").
    - Pair 19: "the office had her at the Schilling flat"; whose office?

    The voicings are rewritten, and the office is now said as the client's account.
  - **Pair 2 (both): fixed.** A watcher's "Nobody besides them." after one name.
  - **Pair 9 (both).** The pages were nearly the same, and main's hand-off ("a room keeps things people forget to mention") had more voice. That card is the old decks', not a voicing.
  - **Pair 16 (both).** "Had sat at Sokol’s" against "had sat here", on a page already at Sokol's. The readers didn't mind the "here" once the scene was set. Docs/53 keeps the name.
  - **Pair 7 (one reader).** The office's body, place, hour and finder in one sentence: dense.
  - **Pair 14 (one reader).** A recap that opened on the place ("Home at eleven, Zeldin had told me…").
- **The other dislikes:**
  - two colons in one sentence, a confirmation and the street's link joined. The street's in-sentence voicings no longer use a colon;
  - a run-on summary of the list hours that mattered (pair 1).

### Read in full

I read three nights in full, in voice and plainly: the golden's night (seed 1, Medium, lost pet, dealt), the neighbourhood at Medium (seed 5, murder) and the neighbourhood at Hard-boiled (seed 3, murder).

- **The designer's page.** The golden's page 8 is the one docs/53 quotes. It now says:

  > So he had told it straight: Coffin’s list had him at the Thalia at eleven, with Feeney; I underlined Stuyvesant Street, because it was where Prentiss lived, and where Duchess went missing.

  And plainly:

  > Coffin’s list put Ashby at the Thalia at eleven, with Feeney, as he had said; Stuyvesant Street was the street of the Prentiss flat.

  The plain page's join is a semicolon now, not build 1's "but". That was docs/25's complaint: the plain facts don't contrast.
- **Found and fixed:**
  - The why-here still said "here" ("Coffin’s list had Ashby here at eleven"), from `thread.ts`. Pointers now name the place, and a pointer said to somebody's face keeps "here".
  - An agreement's "just like he said" after "Coffin’s list" was read as Coffin by the reference pass, which put "the milliner" in twice. That gave rise to the `twosome` flag (§2).
  - The office's "Every night it was the Thalia" had become "Feldman went to the Thalia every night", a third "Feldman" on the page. The venue voicings say the venue, and the found voicings name the dead once.
  - The office's gone-pet line "Somebody had walked out of his with her", the reference pass's work on "Prentiss’s", is cut.
  - The "big room" gloss after the told-way-in scene ("That was a room, more or less; it was a big room") is cut.
  - Two colons in one sentence (the street's link after an agreement).
- **Seen and left:**
  - The reference pass's role names ("the pushcart man", "the milliner") where a name would be said a third time. They're legible, but they read as a quirk when one comes twice in a sentence.
  - "He had a hole in his story, the Thalia at eleven, and he could see me looking at it, though if the new story was true, he was at the Automat at eleven, not at the Thalia" is long. It's two composites joined, and it's clear.
  - Hard-boiled reads plain and dry, as docs/46 wants: the thought stays on its page and says the hours that mattered and whose list.

### Two composites, plainly and in three voicings

**The agreement on the golden's page 8** (CONFIRMED, agree, so; whose = Coffin’s list, person = Ashby, spans = the Thalia at eleven, with Feeney):

- Plain: "Coffin’s list put Ashby at the Thalia at eleven, with Feeney, as he had said."
- `confirmed/so-2`: "So Ashby had told it straight: Coffin’s list had him at the Thalia at eleven, with Feeney." (the page's)
- `confirmed/so-3`: "So Coffin’s list backed Ashby up: the Thalia at eleven, with Feeney."
- `confirmed/so-d1`: "So Ashby’s account and Coffin’s list agreed: the Thalia at eleven, with Feeney."

**The collision on the golden's page 10** (COLLISION-PAIR, but; claim = Corrigan said home at eleven, breaker = Ashby passed her on Stuyvesant Street at eleven):

- Plain: "Corrigan said she was at Corrigan’s flat at eleven, which collided with this: Ashby said he passed Corrigan on Stuyvesant Street at eleven."
- `collision/but-5`: "Corrigan said home at eleven, but Ashby passed her on Stuyvesant Street at eleven. Somebody had it wrong." (the page's, with "She" for Corrigan after her answer)
- `collision/but-3`: "One thing didn’t fit: Corrigan said home at eleven, but Ashby passed her on Stuyvesant Street at eleven."
- `collision/but-6`: "Here was the trouble: Corrigan said home at eleven, but Ashby passed her on Stuyvesant Street at eleven."

### Tests

**710** (was 687 on main), all passing, at three workers. `tsc` is clean. New in `test/bones.test.ts`:

- the clarity check on every tier, type and world;
- build 1's "which was what" line failing it while it still reads back.

The plan tests' sentences are now build 2's. `test/board-connective.test.ts` holds the street line to "where Prentiss lived" and never "kept Duchess".

### What's open

See docs/25, "Bones and flesh, build 2".
