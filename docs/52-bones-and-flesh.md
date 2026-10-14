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
