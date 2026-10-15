# The dial: how voiced is too voiced

*2026-10-15. The designer, on a bones-and-flesh page:*

> Plain: "Coffin's list put Ashby at the Thalia at eleven, with Feeney, as he had said, but Stuyvesant Street was the street of the Prentiss flat."
> Voiced: "So here at eleven, with Feeney, which was what Coffin had, but the part worth keeping came last: Stuyvesant Street was where Prentiss kept Duchess."
>
> "Voiced is too voiced. It's incoherent relative to the plain. We need it dialed down several notches. Our aim isn't authentic era writing. It's what people *think* authentic era writing and dialogue sounded like. Sounding like a perfect SNL skit is much better for us than actually sounding like The Maltese Falcon."

This governs every voicing, every texture card, and the goldens where they disagree with it.

## The rule

**The plain sentence is the spine. Flesh is added to it, never traded for it.** A voiced sentence must carry every argument the plain one carries, said as plainly, and then may add one recognizable noir touch. If a reader skimming the voiced sentence would get less of the fact than from the plain one, the voicing is wrong.

## What "too voiced" looks like

- **Ellipsis standing in for a fact:** "here at eleven" for "at the Thalia at eleven"; "what Coffin had" for "what Coffin's list said".
- **Compression of the logic:** "the part worth keeping came last" instead of saying what the part was and why it mattered.
- **Oblique tags:** "with Coffin's word under it", "where I could check it", "on her count", "that was a hole and she knew it". Each is a real hard-boiled move; each makes the reader stop and translate.
- **Rhythm over sense:** short fragments that sound like Hammett and don't say anything.

## What the dial is set to

Pastiche, broad and legible: the noir everybody already has in their head. The wisecrack, the simile anyone gets, the tag line. On a scale from plain (1) to Hammett (10), aim at 3 or 4. Dialogue the same: people say what they mean, with a flavor word, not a riddle.

| plain | too voiced | right |
|---|---|---|
| Coffin's list put Ashby at the Thalia at eleven, with Feeney, as he had said. | So here at eleven, with Feeney, which was what Coffin had. | Coffin's list had Ashby at the Thalia at eleven with Feeney, just like he said. |
| Stuyvesant Street is the street of the Prentiss flat. | The part worth keeping came last: Stuyvesant Street was where Prentiss kept Duchess. | The part that mattered was the street. Stuyvesant Street is where Prentiss keeps Duchess. |
| Hargrove's list confirms Hauck at the Velvet Room from seven to ten. | Hauck's seven-to-ten had Hargrove's word under it. | Hargrove backs her up: the Velvet Room from seven to ten. |
| Vitale's story broke at nine. | That was a hole, and he knew it. | His story had a hole in it at nine, and he could see me looking at it. |
| She refused to say where she was. | Where I was is my own business. | "Where I was is my own business," she said, which is what people say when it's somebody else's. |

## How it's applied

- **Voicings (docs/52):** written to the rule; the round trip stays, and a new check scores each voicing's clarity against its plain rendering (every argument present as a word, no pronoun for a place or a fact that isn't named in the same sentence).
- **Textures (docs/51):** a texture may be pure flavor, but it must be legible on its own; no oblique tags.
- **Goldens:** `board-connective.md` and `seed3-camp.md` were written above the dial in places. They stay as voice references for warmth and jokes, but this document wins on clarity.
- **Blind reads:** readers judge "which page is clearer and still sounds like the game", in that order, not "which sounds more like noir".

## Addendum, 2026-10-15: no engine words in the narration

The designer, on "At ten, the hour that mattered, Mrs. Kowalski's list had Rafferty and Moretti at Kowalski's and nobody else; Steinbach and Bellucci had been there at nine and gone out after": "What list? 'And nobody else' is very odd. 'The hour that mattered' is vague."

The narrator reports what people **said and saw**, in the words a person would use. The engine's nouns for its own structures never appear in narration (speech may be colloquial, but never board-speak either):

| engine word | say instead |
|---|---|
| list, account, claim, story (as a mechanic), word, count | "Mrs. Kowalski said", "Ashby told me", "according to Coffin" |
| "and nobody else" | "only Rafferty and Moretti were in the house" |
| "the hour that mattered", "the crime hour", "the window" | the hour and why: "at ten, when the watch went", "at nine, when Carbone died" |
| "with X's word under it", "on her count", "X had him at" | "Coffin saw him there", "Coffin says he was there" |
| collides, collision, placed, cleared, access, means, the way in | "doesn't agree with", "was somewhere else", "couldn't have got the chloral", "knew where the key was" |
| "put it to" (in narration) | "I told her what Coffin had seen" |

Rendered as a lint on narration (outside quotes): zero.

## Built: no engine words (2026-10-15)

Branch `no-jargon`, on main with the claudisms audit (#91, docs/56) merged in, and docs/56 §5's items in these files taken on the way (where the two disagreed, this document's wording won).

**The designer's line.** Raw 11, Mrs. Kowalski's page, before:

> At ten, the hour that mattered, Mrs. Kowalski’s list had Rafferty and Moretti at Kowalski’s and nobody else; Steinbach and Bellucci had been there at nine and gone out after.

After (the reference pass makes Mrs. Kowalski "she", having just quoted her):

> She said that at ten, when the watch went, only Rafferty and Moretti were at Kowalski’s; Steinbach and Bellucci had been in at nine and gone out after.

Five more, before → after:

- The plain page (the golden's page 8): "Coffin’s list put Ashby at the Thalia at eleven, with Feeney, as he had said; Stuyvesant Street was the street of the Prentiss flat." → "Coffin backed up Ashby: he was at the Thalia at eleven, with Feeney; the Prentiss flat was on Stuyvesant Street."
- An agreement and an evening on one word: "So her story checked out: Mrs. Nagy’s list had her at Mrs. Nagy’s at eight, with Mosley, Shapiro and Abramowitz, though at ten, the hour that counted, Donnelly said Hanley’s, and nobody else had backed that up yet." → "So she had it right, and Mrs. Nagy said the same: Mrs. Nagy’s at eight, with Mosley, Shapiro and Abramowitz, though Donnelly said Hanley’s at ten, when the spoons went, and nobody had backed that up yet."
- A watcher's hour at Hard-boiled: "His list at ten, the hour that mattered, had Mabry and somebody sitting on a crate nobody could put a name to at the bakery cellar at Sokol’s." → "He was sure of it: at ten, when Doyle died, Mabry and somebody sitting on a crate nobody could put a name to were at the bakery cellar at Sokol’s."
- A collision: "Hauck said Moskowitz’s at ten, but Lanza had Feldman, Obermann and Benny at Moskowitz’s at ten o’clock, and nobody else. Somebody had it wrong." → "Hauck said Moskowitz’s at ten, but Lanza said only Feldman, Obermann and Benny were at Moskowitz’s at ten o’clock, and they couldn’t both be true."
- Raw's turn: "Here’s what I had. … One person was still standing: somebody who could have had the spare key, and who had no true account for ten. I could put it to Bellucci now." → "… That left one person: somebody who could have had the spare key, and who couldn’t say where they were at ten. I could face Bellucci with it now."

### What changed, at the source

- **The lint** (`src/game/board/jargon.ts`): the addendum's table and its kin, in narration (outside quotation marks): somebody's list, account, claim, word or count; story as the mechanic ("X’s story said", "a second story", "breaks their story"); "and nobody else"; the hour that mattered or counted, the crime hour, the window as a time; "word under it"; "X had Y at <place>"; collides, placed, cleared, access, the means, the way in; "put it to"; the line as a fact; "the office" as the briefing; the board; the notebook as a record. In speech only the board-speak: a watcher's "and nobody else (at all)", "Nobody else.", "the hour that mattered", somebody's list. It runs as a prose rule (`prose-lint.ts`, rule `jargon`, a column in `board-prose`), inside the clarity check on every voiced composite, and in the voicings' lint. `scripts/engine-words.ts` counts it by source.
- **Whose word is a person.** `srcWhose`, `sourceName` and the plain realizer say the name ("Coffin", the client by name); what kind of word it was is the composite's own, folded on the way back (a watcher's is what they saw, the client's is the office's). `breakSaid`'s list breaker is "Coffin saw him at …", "Coffin said only A and B were at …", "Coffin said nobody was at …".
- **The hour and why.** `whyHours` passes the reason as an argument (`{reason}`, required of every thought voicing of a list's hours and of every evening on one word): "when the watch went", "when Carbone died", "when Fritz could have gone" for two hours. The plain page's WINDOW is "Carbone died at nine or ten".
- **The way in as the thing it was.** `wayKnown`, `wayWhat`, `meansKnew`: "knew where the key was", "about the window that wouldn’t latch", "that the door was left unlocked", "could have got the chloral"; `{way}` in the scene, find and recap voicings; the grid's last column says it.
- **The plain realizer**, clause by clause with its reader (`plain.ts`): "Coffin said only Feeney and Ashby were at the Thalia at eleven", "According to Coffin, Feeney was at …", "Coffin backed up Ashby: he was at …", "…, which did not agree with what Coffin said", "Grasso did not budge on ten when I told her what Coffin said about the Thalia (…)", "Grasso changed the answer to the Palace at ten", "I knew where A had been and who B had seen", "Mrs. Krantz sent me to Feeney".
- **Voicings:** 287 rewritten and 3 added (1,247): every LIST-HOUR thought, a watcher's whole hours in speech ("only", "that was everybody", "that’s the lot"), CONFIRMED, CONFIRMED-WITH ("the same witness"), PLACED-SET, OWN-WORD (subject first, so the victim in `{reason}` never takes the pronoun), ACCESS-SET, WINDOW-MEANS, LEFT, HOLD, UNSPOKEN, REACTION, COLLISION-PAIR.
- **Writers:** `thought.ts` (the swear tails, the elimination, the glosses), `thread.ts` ("Coffin had seen Ashby at …", the face line "Coffin saw you here"), `pages.ts` (a put's why names a watcher by trade, "the landlady said otherwise"; the turn has no lead; "I could face X with it now", with `oracle.ts`'s parse in the same commit), `stars.ts` (`plainWhy`), `report.ts` (the story, the curtain, the verdict's "who (and what shows they lied)", the form's label), `knowledge.ts` (a list's line: "Coffin: at eleven o’clock, only Feeney and Ashby were at the Thalia."), the grid and the notebook's headings, `teach.ts`.
- **Cards:** 60 card texts across the situated deck, `connective`, `confront`, `night` and `telling`; the neighbourhood watchers' "Nobody else." lines are "That’s all." or "That’s the lot."; the situated deck filtered with the claudisms lint's own patterns (`situated-deck.ts claudisms`: 141 of 2,941 cut; the hard tics out, the soft ones kept in one card in four of a key).
- **docs/56 §5, in these files:** the colon aside ("Mrs. Szabo went back to counting bills", "… was still … when I left"); "Here’s what I had" gone; the papers' aphorism; "From his post"; the hour phrases; `sourceName` and `shorten`; the CLI grid's key, header and heading; the notebook's lines and "Says:"; the "And There’s" capital; the find's "So"; `bcn-2767` and the walk cards; "the row over the coal bill"; the verdict's "Pardo", not "Pardo who buys things".

### Counts, before → after

`npx tsx scripts/engine-words.ts --nights 10` (both worlds, every tier, the oracle's and the wanderer's routes; before is main at `1c27fcc`, read by this branch's lint):

| source | narration hits | speech hits |
|---|---|---|
| voicings (every template) | 198 → 0 | 50 → 0 |
| situated deck (every card) | 39 → 0 | 0 → 0 |
| voiced composites, as said | 2,199 → 0 | 470 → 0 |
| the plain renderer (every plain page) | 4,281 → 0 | — |
| the writers' own words (thought, thread, pages) | 57 → 0 | 61 → 0 |
| texture as dealt (situated; old decks and writers) | 610; 106 → 0; 0 | — |
| every page as read, whole | 2,972 → 0 | 531 → 0 |
| stars | 85 → 0 | — |
| report (form; line options; verdict; story; curtain) | 1; 407; 240; 0; 467 → all 0 | — |
| CLI (help; teach page; notebook headings and grid) | 7; 3; 4 → all 0 | — |

`scripts/claudisms.ts` (docs/56's 36 nights), main → this branch. The builders' words: B10 list 159 → 2 (both literal: "a list of doors", "a list of names"), B11 account 43 → 6 (literal: the bookkeeping, a bank account), B13 story 27 → 7 ("a hole in her story", which this document's table keeps), B14 "nobody else" 99 → 0, B15 hour phrases 98 → 9 (all a literal window), B16 "X had Y at" 42 → 0, B17 word and count 28 → 0, B18 collides 72 → 0, B19 placed, access, means, the way in 143 → 13 (literal "which means"), B20 "put it to" 12 → 0, B21 the taught verb in labels 136 → 64, B22 legends 185 → 39, B23 mechanic labels 47 → 7. docs/56's gates in the A group: A22 64 → 0, A17 38 → 0, A14 6 → 0, A07 4 → 0, A03 1 → 0, A04 and A28 0. Others: A19 "So" 47 → 8, A25 aphorisms 41 → 8, A26 13 → 0, A29 48 → 12, A15 12 → 0, A12 5 → 0, A30 23 → 6; the soft ones, as the filter keeps them, A01 91 → 81, A02 175 → 172, A21 102 → 88.

### Measures

- **The round trip and the clarity check: 100%.** Thirty nights a tier, both worlds, all three routes: 14,733 of 14,733 plain pages, and 41,153 of 41,153 voiced composites read back and are clear (the clarity check now fails an engine word). The flesh misses are main's ten (Miss Nowak's admission naming Mrs. Rafferty).
- **The dealt boards:** the one change is the coal bill's words. With "the row" put back to "the business", seeds 1–40, every tier and type, both worlds, hash as main's.
- **`board-measure`, 50 seeds a tier and type: byte for byte main's.**
- **`board-prose`, 30 nights a tier:** every prose lint 0 in both worlds, the new `jargon` column included (main had one name said three times, in the neighbourhood's Poached). Words a page moved by 4 at most. Joins a page fell (dealt 0.7 → 0.5 at Raw and Coddled, 0.9 → 0.8 at Soft-boiled, Hard-boiled 0.1 → 0.0; the neighbourhood the same way): the search's "So" (docs/56 A19) was a join the measure counted. List smell moved both ways (dealt Medium 43 → 51 of 439, Soft-boiled 29 → 23; the neighbourhood's Raw 24 → 34 of 280).

### Read in full

Raw 11 (the lost watch), the golden's night (seed 1, Medium, lost pet) and the neighbourhood's Medium seed 5 (murder), page by page. Fixed on the way: an evening on one word that fell to the plain page for want of a voicing (the "listy" forms are new); "went back to" closers whose subject the reference pass turned into "the alderman’s clerk", with "his" after it into "the alderman’s clerk’s" (the closer says the marked pronoun now); "that was everybody" twice in one watcher's breath; "So Doyle and Sokol agreed", a third Doyle on the page; "backed Hochstetter’s up", the reference pass reading "her" as a possessive; found-it cards ("It showed the same stretch…") whose "it" had nothing to stand for once "the account" went.

### The blind read

Twenty pages, both worlds and every tier (seven accounts, three lists, three puts, two searches, two turns, an office, a motive and an arrival), this branch against main from the same night, unlabeled and in random order; two readers one at a time, on "which page is clearer and still sounds like the game". **This branch was preferred in 34 of 40 (85%): 17 of 20 by each reader.** Both named the same things: "X saw her" and "X said only A and B were there" over "X’s list had her" and "and nobody else"; the hour said with what happened at it; "went back to …" over the colon closer. Main won pair 9 (both readers: "From his post" told them where the watcher stood), pair 18 (both: an office closer, texture) and pair 19 (both: without its "So", the search's thought reads as a repeat of the scene's sentence before it).

### What's open

- A search's thought still says again what the scene's thought said a page before ("the spare lives in the sugar tin at Kowalski’s"; docs/55's sugar tins); without the "So" it reads as a plain repeat.
- "His papers would have the name of anybody with a grudge against him" is one line on 18 of 36 nights; it wants siblings.
- "A hole in her story" stays, by this document's table; docs/56's B13 counts it.
- Slips the readers saw that aren't engine words: a person putting an elbow on the bar just after the detective did; "I liked that" with nothing to like.
- The unwatched room's keeper says "part of the evening", not docs/56's hour: an hour there is one the page doesn't tell, which the correspondence lint forbids.
