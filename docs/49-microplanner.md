# Build: the microplanner

*2026-10-14. The designer: "the writing is too dense. I read a lot. This doesn't flow or read naturally and thus is difficult to parse. We need a system so that the nuclei of fact/detail can blossom into a more organic page." And: lightweight, fully local, "a classic game you could have run on MS-DOS."*

*The facts are right. What makes the pages read like a list is that each slot is written without knowing its neighbours. Classical text generation has a stage for this between "decide what to say" and "fill the template": the microplanner. Dashiell skips it. This build adds it, deterministic, no model, no new bytes shipped beyond code.*

## 1. Where it sits

```
job (facts, links)  →  content plan (beats)  →  MICROPLANNER  →  skeleton  →  realization (cards + sentences)  →  page
```

Today `src/game/board/pages.ts`, `thought.ts`, `thread.ts` and `sheets.ts` go from beats straight to sentences. The microplanner takes the beats, with what the engine already knows about each fact (new / confirms / collides / narrows; who it's about; which place and hour), and decides **how many sentences, in what order, with what joins, and what each person is called**. It outputs a **skeleton**, which realization turns into prose.

## 2. The four operations

### Aggregation
Facts that share a predicate become one sentence.
- "Nobody had told me where Hanrahan was at nine, including Hanrahan." ×3 → "Hanrahan, Winslow and Reinhardt hadn't told me where they were at nine, and nobody else had either."
- Three confirmations → "Eight and nine matched Mrs. Kowalski to the chair."
- A list with one exception → "Everybody she'd named was where they said, except Bellucci."
Rules: aggregate up to four items; keep the exception last; never aggregate across the crime hour and another hour; never aggregate a fact the player must notice on its own (a collision stays its own sentence).

### Reference
What a person is called is decided by what the previous sentence was about (centering), not by a count:
- first mention on a page: name (with honorific where the bible has one);
- the same person as the subject of the next sentence: pronoun;
- after another person has intervened: name, or the role noun when it's unambiguous ("the barman", "the dead man", "my client");
- the designer's cap stays: a name at most twice a page outside quotes and lists.
Never a pronoun that could refer to two people of the same gender in the last two sentences.

### Connectives from the logic
The engine knows what each fact does. The join says it:
| relation | joins |
|---|---|
| confirms a held line | "which was what Coffin had", "and Ellery would swear to it", "same as she said" |
| collides | "But…", "One of them was wrong.", "Two stories, and only one could stand." |
| narrows (the hour, the field) | "So it was ten.", "That left two.", "which cleared her" (Raw only; see docs/46 levels) |
| new, unconnected | plain, no join |
| points onward | the hand-off, once, at the end |
A page has at most one "so" chain and one "but"; the rest is plain.

### Rhythm
Across the page: sentence length bands (short ≤ 8 words, medium 9–20, long 21+). No three sentences in a row in the same band. A beat that carries the joke ends short. Paragraphs follow beats (why-here, staging, the ask, the answer, the thought, the close), with the answer's quote alone in its paragraph. Don't restate what the previous page's hand-off already said: the why-here beat is one clause when the reason is already on the table ("So, Corrigan.").

## 3. The skeleton (the interface the tiny model will use; docs/50)

The microplanner's output is a list of units, in order:

```ts
type Unit =
  | { kind: 'fact'; text: string; locked: true; about: Id[]; hour?: number; place?: Id; relation: 'new'|'confirms'|'collides'|'narrows' }
  | { kind: 'gap';  slot: 'why-here'|'walk'|'staging'|'ask'|'reaction'|'close'|'hand-off'; text: string /* the card default */; before?: number; after?: number /* indexes of the fact units either side */ };
```

Every sentence that carries a fact (an account line, a list line, a find, a thought that names a fact, a collision) is a **fact unit, locked**. Everything else (texture) is a **gap unit** with its card text as the default. Realization today just concatenates units' text in order; the tiny model, later, may replace a gap's text and nothing else.

Export: `npm run read -- … --skeleton` prints the units as JSONL after each page; `scripts/skeletons.ts --n 300 --tier all [--world neighbourhood]` writes a JSONL corpus (one line per page: units, tier, job, the page's final text) for training.

## 4. Measures (`scripts/board-prose.ts`)

- **sentences per fact unit** (target ≤ 1.2; today about 1.6);
- **list smell:** three or more consecutive sentences opening with the same two words, or three consecutive sentences in the same length band (0);
- **pronoun ambiguity:** a pronoun with two possible referents in the last two sentences (0);
- **joins per page** (report; target 1–3);
- **restated pointer:** the why-here repeating the previous hand-off's words (0);
- all previous lints stay at 0; names ≤ 2 a page held; words a page in 170–260.
- Board hashes unchanged.

## 5. Done means

- The four operations in `src/game/board/plan/` (new), used by every page kind; `pages.ts` and friends call it rather than writing sentences themselves.
- The skeleton export works for every tier and both worlds.
- The measures hold on 30 nights a tier, both worlds; a "before → after" table in this doc.
- Read in full: the golden's night (seed 1 Medium lost-pet, dealt), one Hard-boiled dealt night, two neighbourhood nights (Medium, Poached). Put the golden's page 6 and the engine's page 6 side by side in this doc.
- A "Built" section here; leftovers in docs/25.

## Built (2026-10-14)

Branch `microplanner`. The planner is on. `PLAN.ops` in `src/game/board/plan/index.ts` turns it off, and off, every page of the oracle's, the wanderer's and the reader's nights is byte for byte main's. That was checked on seeds 1–12, every tier and type, both worlds: 14,436 pages. The "before" columns below are measured that way (`board-prose --plan off`). On, the boards hash the same as main's, and so does every page's board: the lines it tells, the held lines its thought cites, its hours, people, places and job. 12,524 of the 14,436 pages read differently.

### Where it sits

- **The writers don't lay out sentences any more.** `pages.ts`, `thought.ts`, `thread.ts` and `tell.ts` put **items** into beats:
  - a **fact**: locked, with its relation, whom it's about, its hour and place, what it carries (`claim:ashby@11`, `givens:gone`), and, when it has a predicate to share, its aggregation data;
  - a **gap**: texture, with its slot and the other cards that fitted the same draw (`Hand.last`, `Hand.swap`, `Hand.picks`), which the rhythm can trade for.
  - The engine marks the pronouns it writes with whom they mean (`markPronoun`).
- **`lay()` hands the beats and the sheet to `planSection`.** It runs aggregation, connectives, rhythm, then reference, and returns the blocks and the units. Every page kind goes through it: the office, arrivals, searches, accounts, lists, puts, motives, the turn's chapter, the report.

### The four operations

**Aggregation** (`aggregate.ts`)
- A watcher's hour and its "nobody else" are one sentence: "Ten, Feeney, and nobody else."
- The notebook's placements on one person's word are one sentence, wherever they come in the recap: "Mrs. Szabo had Teitel and Russo at the Peacock at nine." It used to say "…; Mrs. Szabo said so." twice.
- The evenings nobody else has spoken for are one sentence. So is the rest of an evening that held at one place at two hours ("at Mrs. Nagy’s at eight and nine"), and one place at two hours with different company ("the Lyric at nine, with Doyle, and at eight").
- Who could get at the means, with the exception last: "Hauck and Rosenbaum had been here earlier, when the laudanum was there for the taking, and Vogel hadn’t."
- Four at most a sentence. A fact at the crime hour is never aggregated with one at another hour, and a collision always stays alone.

**Connectives** (`connect.ts`)
- **Collides.** With the page's "but" free and the pronouns clear, it's one sentence: "She said home at eleven, but Ashby passed her on Stuyvesant Street at eleven." Otherwise it's the two lines and one short join ("One of them was wrong."). Two people who say the same place at the same hour collide on who was with whom, and "but" would hide that, so they always get the two lines and the join.
- **Confirms.** "So here at eleven, with Feeney, which was what Coffin had." takes the page's one "So", and never before a line that opens on "So". The others:
  - "The rest of her evening held where I could check it: Coffin had her at the Thalia at eight";
  - "Steinbach had told me here at eight, and Weisglass had her here too";
  - "By Coffin’s count, Feeney and Ashby were here at eleven";
  - "He put Abramowitz here at eleven."
- **A page has one "but" and one "So" among its facts,** whoever wrote them. A second one is taken off.
- **The hours that mattered** are said one of two ways, never word for word as an earlier page said them.

**Rhythm** (`rhythm.ts`)
- **Bands:** short is 8 words or fewer, medium 9–20, long 21 and up. A run of three narration sentences in one band, or opening on the same two words, is mended in one of three ways:
  - **joined:** two pieces of texture of one slot, or two facts, with ", and". Only when the second opens on a clause of its own and the pair has one "and" at most;
  - **traded:** a card swapped for another from the hand of a different length;
  - **parted:** split at a seam it already has. Never a collision, a list's entry or a quotation.

  A mend is kept only if the page's runs go down.
- **A joke ends short:** "The loose stair rod rattled whenever anybody used the stair. Like a remark nobody had asked for." Twice a page at most, and never into a sentence said earlier tonight.

**Reference** (`refer.ts`)
- **Centering.** The first mention is the name. After that it's a pronoun, when the person was the last of their sex mentioned within two sentences and nobody else came in between. Otherwise it's the name again, or the role: "my client", "the dead man", "the dentist", "the usher" (when only one usher is on the page).
- **The designer's cap: two names a page.** It counts names said in speech and names nothing can change later (a hand-off, a list's "Mr.").
- **Never a pronoun with two people of its sex before it** in its sentence or in the sentence before (the measure's own window). An engine pronoun that fails is said as the name or the role. A pronoun after somebody nameless of its sex in its own sentence is theirs: "Somebody at the next table… got his own tie."
- **Cataphora.** "From his post Sokol could see the bar…" keeps the name the pronoun hangs on, unless the pronoun already reads back to somebody before it.
- **The thought keeps the names it ties back by** (docs/44), except at Hard-boiled, where it ties back to nothing (docs/46).
- **When a third mention can't be helped,** a card that says the name is traded for one of its alternatives that doesn't.

### What changed in the writers (planner on only)

- **The hand-off says it from where I stand.** It now reads "Prentiss had sat at the Thalia telling the room about his key, and that was worth the walk." It used to say "had sat here … worth the walk to the Thalia" while I was standing in the Delmonico rooms.
- **"From there to the Delmonico rooms was a long walk"** (it said "were").
- **The turn's what-next counts as a hand-off** for the person it names, so their page doesn't give the reason again. A place it names keeps its why, because the turn said where, not why.
- **A claim that breaks a claim by somebody of the same sex** reads "Dr. Hirsch’s own account was Sokol’s at ten o’clock". It used to be "Dr. Hirsch says she was…" right after "She said Sokol’s at ten".
- **The skeleton's `about`:** a remark is about the people it places, and an arrival's last-I-saw line is about its person.
- **A card traded for another keeps the look that was put after it.**
- **The papers name the dead man as "the dead man"** on a page where "his" could be the suspect's.

### The skeleton

`Unit` is in `src/game/board/plan/types.ts`. Each page carries its units in `page.board.units`. `npm run read -- … --skeleton` prints them as JSONL after each page, and `scripts/skeletons.ts` writes the corpus (`skeletons*.jsonl`, git-ignored). It checks every page as it goes: the units, a paragraph at a time, are the page's prose word for word. The tests check it too, on every tier and type in both worlds. At 20 nights a tier:

- dealt, all three routes: 4,896 pages, 45,761 units, 32,093 of them gaps;
- the neighbourhood, the oracle's route: 1,482 pages, 15,450 units, 10,424 of them gaps.

The golden's night, page 8, as emitted:

```
{"page":8,"kind":"gap","slot":"why-here","text":"Coffin’s list had Ashby here at eleven, so that was where I went next.","beat":"why","para":0,"voice":"narrator","after":4}
{"page":8,"kind":"gap","slot":"staging","text":"I sat one seat over. Thin, and bent at the shoulders from years over a sewing machine, he wore clothes too good to have been bought. He’d made every stitch.","beat":"staging","para":0,"voice":"act","after":4}
{"page":8,"kind":"gap","slot":"ask","text":"I asked him to tell me his evening, from the beginning, and not to leave out the dull parts.","beat":"ask","para":1,"voice":"exchange","after":4}
{"page":8,"kind":"gap","slot":"reaction","text":"He took a moment to put the evening in order before he handed it over.","beat":"reaction","para":2,"voice":"act","after":4}
{"page":8,"kind":"fact","text":"“At eight I went to the Automat for a plate of beans, and stayed through nine, by myself.","locked":true,"about":["ashby"],"relation":"new","beat":"job","para":3,"voice":"answer","carries":["claim:ashby@8","claim:ashby@9"]}
{"page":8,"kind":"fact","text":"Ten o’clock I went up to the Delmonico rooms to see about some money owed, with Mrs. Cheatham.","locked":true,"about":["ashby","cheatham"],"relation":"new","beat":"job","para":3,"voice":"answer","carries":["claim:ashby@10"]}
{"page":8,"kind":"fact","text":"Then at eleven I went to the Thalia to see the new play, with Feeney.","locked":true,"about":["ashby","feeney"],"relation":"new","beat":"job","para":3,"voice":"answer","carries":["claim:ashby@11"]}
{"page":8,"kind":"fact","text":"Walking over to the Thalia at eleven I passed Corrigan on Stuyvesant Street, going fast, no hat.”","locked":true,"about":["ashby","corrigan"],"relation":"new","beat":"job","para":3,"voice":"answer","carries":["remark:account:ashby#0"]}
{"page":8,"kind":"fact","text":"So here at eleven, with Feeney, which was what Coffin had.","locked":true,"about":["ashby","feeney","barkeep"],"hour":11,"place":"bar","relation":"confirms","beat":"thought","para":4,"voice":"thought","carries":["list:barkeep@11"],"join":"so"}
{"page":8,"kind":"gap","slot":"gloss","text":"At an hour that mattered, somebody else could vouch for it.","beat":"thought","para":4,"voice":"thought","before":8,"after":10}
{"page":8,"kind":"fact","text":"The part worth keeping came last. Stuyvesant Street was where Prentiss kept Duchess.","locked":true,"about":["client","pet","corrigan"],"hour":11,"place":"scene","relation":"new","beat":"thought","para":4,"voice":"thought","carries":["givens:gone"]}
{"page":8,"kind":"gap","slot":"close","text":"I buttoned my coat. It came off a rack, and in that company it knew it.","beat":"close","para":5,"voice":"thought","before":10}
```

### Measures, before → after

`npx tsx scripts/board-prose.ts [--world neighbourhood] [--plan off]`: 30 nights a tier, along the oracle's route unless a column says all three routes. Every earlier lint is 0 after, in both worlds: reader lint, correspondence, thoughts over their level, plain terms, cards twice, sentences twice, names three times, clues three times, place names bolted on, banned phrases, signposts, gags, "it". Before, the neighbourhood had three of them that weren't 0: one place name bolted on (Soft-boiled), two pages naming somebody three times (Medium) and one restated pointer (Soft-boiled).

**Dealt**

| tier | words a page, median | sentences per fact unit | list smell, pages | pronoun ambiguity (oracle / all three) | joins a page [share 1–3] | restated pointer |
|---|---|---|---|---|---|---|
| Raw | 180 → 183 | 1.84 → 1.59 | 218 → 81 of 280 | 25 / 110 → 0 / 0 | 1.3 [74%] → 0.9 [74%] | 0 → 0 |
| Coddled | 180 → 181 | 1.73 → 1.53 | 207 → 84 of 276 | 20 / 74 → 0 / 0 | 1.0 [64%] → 0.7 [62%] | 0 → 0 |
| Poached | 172 → 172 | 1.71 → 1.52 | 293 → 110 of 398 | 43 / 142 → 0 / 0 | 1.1 [72%] → 0.7 [63%] | 0 → 0 |
| Soft-boiled | 169 → 169 | 1.66 → 1.51 | 286 → 109 of 383 | 41 / 155 → 0 / 0 | 1.1 [70%] → 0.7 [63%] | 0 → 0 |
| Medium | 166 → 167 | 1.56 → 1.47 | 321 → 148 of 439 | 58 / 199 → 0 / 0 | 1.2 [67%] → 0.8 [61%] | 0 → 0 |
| Hard-boiled | 160 → 161 | 1.59 → 1.45 | 307 → 150 of 435 | 29 / 128 → 0 / 0 | 0.1 [12%] → 0.1 [12%] | 0 → 0 |

**The neighbourhood**

| tier | words a page, median | sentences per fact unit | list smell, pages | pronoun ambiguity (oracle / all three) | joins a page [share 1–3] | restated pointer |
|---|---|---|---|---|---|---|
| Raw | 220 → 220 | 1.93 → 1.77 | 214 → 81 of 280 | 26 / 118 → 0 / 0 | 1.3 [75%] → 0.9 [75%] | 0 → 0 |
| Coddled | 213 → 215 | 1.78 → 1.62 | 207 → 97 of 276 | 17 / 75 → 0 / 0 | 1.1 [67%] → 0.8 [67%] | 0 → 0 |
| Poached | 186 → 184 | 1.71 → 1.56 | 306 → 136 of 408 | 55 / 156 → 0 / 0 | 1.1 [73%] → 0.7 [63%] | 0 → 0 |
| Soft-boiled | 195 → 194 | 1.67 → 1.56 | 277 → 124 of 389 | 50 / 170 → 0 / 0 | 1.1 [69%] → 0.7 [61%] | 1 → 0 |
| Medium | 191 → 189 | 1.58 → 1.50 | 282 → 136 of 436 | 64 / 210 → 0 / 0 | 1.2 [67%] → 0.8 [62%] | 0 → 0 |
| Hard-boiled | 192 → 192 | 1.63 → 1.52 | 324 → 179 of 435 | 52 / 150 → 0 / 0 | 0.1 [12%] → 0.1 [12%] | 0 → 0 |

- **Pronoun ambiguity, restated pointers and names a page hold at 0,** on all three routes. The tests check this on every tier and type in both worlds.
- **List smell is down by 45–63%,** from 65–78% of pages to 28–41%. It isn't 0.
- **Sentences per fact unit are down by 0.08–0.25.** They aren't at 1.2.
- **Joins fell.** One "but" and one "So" a page, and the held-rest line no longer adds "same as she said". About two pages in three with facts still have one to three joins. Hard-boiled has none by design: at fact level the thought says the fact plain (docs/46).
- **Words a page didn't move.** Dealt Soft-boiled, Medium and Hard-boiled are under 170, as they were before.
- **"Thought naming an earlier fact" at Hard-boiled** is 96% dealt and 98% neighbourhood, against 100% off. At Hard-boiled the planner doesn't hold the thought's names back, so a name there can become "he". Docs/46 §2 doesn't ask a Hard-boiled thought to tie back, and the column's target is 100% below Hard-boiled only.

### The golden's page 6, and the engine's

The golden (`docs/golden/board-connective.md`) folds each arrival into the page after it, so its page 6, Ashby, is the engine's page 8. The engine's page 6 is the walk into the Thalia, and it's the same with the planner on or off.

**Golden, page 6**

> Coffin's list had Ashby here at eleven and nowhere before it, so Ashby was next. He'd moved down to the third row, as if the play might start again if he waited long enough.
>
> I sat one seat over. Up close he was thin and a little bent at the shoulders from bending over hat blocks, in a suit better made than anything a milliner could buy. It hadn't been bought.
>
> "Mr. Ashby. Where were you tonight? All of it, if you don't mind."
>
> He minded a little, then decided it was cheaper not to.
>
> "At eight I went to the Automat for a plate of beans and made them last. At ten I went up to the Delmonico rooms to see Mrs. Cheatham about some money. At eleven I came here for the late show, and sat with Miss Feeney." He thought of something. "Walking over here at eleven I passed Miss Corrigan on Stuyvesant Street. Going fast. No hat."
>
> So the Automat until ten, the Delmonico rooms at ten with Mrs. Cheatham, and here at eleven with Feeney, which was what Coffin had. One evening that held, where I could check it. The part worth keeping came last. Stuyvesant Street at eleven, going fast, no hat. Stuyvesant Street was where Prentiss kept his dog.
>
> He looked at my coat on the way out. My coat came from a store. You could tell from across the room, and somebody had.

**Engine, page 6 (planner on; the same off)**

> I walked uptown and west to the Thalia. It was a good walk, and I took all of it. A cat on a step watched me go by and decided I was nobody’s business, which is the most a cat will do for you.
>
> I went in at the Thalia, a Yiddish theater on the Bowery. The play was over, but the stage still had its painted village up, a little wooden town waiting under one work light for the next performance. Above the lobby doors a painted plaster mask grinned down at everybody who came in, with the tip of its nose missing.
>
> Coffin stood at the back of the house with a flashlight, pointed at the floor, ready. Feeney sat in an aisle seat about halfway down, with her coat folded on her knees. She had long, cold-looking fingers and a habit of humming under her breath, always the same few bars and never the end of them. Ashby was in the lobby, reading the bills for next week as if they might change.
>
> An usher with a flashlight sees every face that comes in out of the street, and most of them twice.
>
> I stood still and listened. Places tell you things if you let them finish.

**Engine, page 8, Ashby (planner on; off, the reaction said "Ashby took a moment")**

> Coffin’s list had Ashby here at eleven, so that was where I went next. I sat one seat over. Thin, and bent at the shoulders from years over a sewing machine, he wore clothes too good to have been bought. He’d made every stitch.
>
> I asked him to tell me his evening, from the beginning, and not to leave out the dull parts.
>
> He took a moment to put the evening in order before he handed it over.
>
> “At eight I went to the Automat for a plate of beans, and stayed through nine, by myself. Ten o’clock I went up to the Delmonico rooms to see about some money owed, with Mrs. Cheatham. Then at eleven I went to the Thalia to see the new play, with Feeney. Walking over to the Thalia at eleven I passed Corrigan on Stuyvesant Street, going fast, no hat.”
>
> So here at eleven, with Feeney, which was what Coffin had. At an hour that mattered, somebody else could vouch for it. The part worth keeping came last. Stuyvesant Street was where Prentiss kept Duchess.
>
> I buttoned my coat. It came off a rack, and in that company it knew it.

**What's still between them:**
- The golden's why-here has a second line of staging in it (he'd moved to the third row).
- The golden's ask is direct speech ("Mr. Ashby. Where were you tonight?"). The engine's is reported.
- The golden puts a beat inside the answer ("He thought of something."). An answer here is one quotation.
- The golden repeats the remark's words in the thought ("Stuyvesant Street at eleven, going fast, no hat").
- In this night the planner did its work on other pages:
  - page 5's hand-off;
  - Coffin's list ("Ten, Feeney, and nobody else.");
  - "By Coffin’s count";
  - Corrigan's and Abramowitz's collisions as one sentence each, with "but";
  - "He put Abramowitz here at eleven";
  - the turn's recap;
  - the closes that end short.

### Read in full

- **The golden's night** (seed 1, Medium, lost pet, dealt). Fixed:
  - "From there to the Delmonico rooms were a long walk";
  - page 5's hand-off said "here" from the wrong room;
  - "…so the two of them could get acquainted" was parted from its act.

  Left as it is: "I took the chair beside Abramowitz without asking" keeps the name. Off said "him". The sentence before names Coffin too, and docs/49's two-sentence rule wants the name.
- **A Hard-boiled night** (seed 1, murder, face). Fixed:
  - the papers ran two of four entries together with a semicolon;
  - "Dandridge’d" (a pronoun's contraction kept on a name);
  - "Here’s what I had, and Bernstein had said…" (a lead joined to a fact).
- **The neighbourhood at Medium** (seed 5, murder). Fixed:
  - "From his post Sokol…" lost its name to "he";
  - "He was at Sokol’s at nine" after a sentence naming Belkin and Dr. Hirsch;
  - "Dr. Hirsch says she was at Sokol’s" after "She said Sokol’s";
  - Russo's look lost when its staging card was traded.
- **The neighbourhood at Poached** (seed 4, murder). Fixed:
  - "Wojcik’s list had her…" for Mrs. Krantz with Russo in between;
  - "So … which was what Wojcik had. So far as it went…";
  - the papers half run together;
  - "Mrs. Szabo said so" twice in the recap;
  - "…as manners allowed and said my name, and she had nails painted red and bitten";
  - "that was the last I saw of her" after "a large man".

### Open

See docs/25, "The microplanner".
