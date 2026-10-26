# Clarity, build 5b

*2026-10-26, branch `clarity-5b`, off main at `3da6290` (clarity-5, #108, docs/70). A small pass before the round-8 blind playtest: the eight slips the designer's page-by-page read of clarity-5 found on five nights (Poached 17 murder along the testers' route, Poached 6 a one-liar night and Medium 21 along the oracle's, Hard-boiled 19 murder along the testers' route, Raw 23 with `--hints every`; reads in `scratchpad/c5rev/`). Each is fixed by rule in the layer that makes the line, never for one night, as docs/70 did: a lint (`hinge-lint.ts`, five new rules, and `hint` now reads the curtain too) and a test (`test/hinge.test.ts`: the line main said, and the line this build says; `test/clarity5b.test.ts`: the five nights hold to it). Nothing in `src/gen/` changed; the dealt boards hash as main's. Lean only, like docs/60 to 70.*

## 1. What was built, by item

Quotes are from the five nights, main (`3da6290`) → this build.

### 1. A walk's tail once a night (`walk-tail`)

`pages.ts` `writeWalk`, `WALK_TAILS`: what a walk card says after the distance ("and I took it at a good clip", "with my collar up", "give or take", "and the night had turned cold", "and the streets were nearly empty", "and I didn't hurry", "before I'd finished a thought") is dealt once a night, whichever card carries it, and never on a walk whose distance says "good" ("a good walk", "a good ten blocks"). `walk.json` has three more cards without a tail (`bwk-088` to `bwk-090`: "It was {far} from there.", "I walked it. It was {far}.", "The next stop was {far}."), a reserve dealt only once "It was {far}." is spent, so a night with two good walks doesn't run the deck out (board-prose's "cards twice" stays 0) and a night with nothing wrong deals the walks it did.

- Poached 6, the Bijou: "It was a good walk, and I took it at a good clip." → "It was a good walk."
- Poached 6, Rafferty's: "It was a good ten blocks from there, with my collar up." → "It was a good ten blocks from there."
- Medium 21, the Blue Lantern (the night's second "with my collar up"): "It was a handful of blocks from there, with my collar up." → "It was a handful of blocks, give or take."
- Hard-boiled 19, the card room (the second): "It was a stretch from there, with my collar up." → "It was a stretch, and the streets were nearly empty."; Grasso's flat: "It was a good ten blocks, give or take." → "It was a good ten blocks."
- Raw 23, the Thorndike flat (the first of two): "It was a good ten blocks uptown and east from there, with my collar up." → "I set off uptown and east. It was a good ten blocks." (The Odessa's "It was a short way from there, with my collar up." is now the night's one.)
- Poached 17 had no tail twice, and its walks are main's.

### 2. The turn keeps everybody who could have had the means (`turn-drop`)

`pages.ts` `turnOrder`, `joinPlaced`; PLACED-SET `recap-many` (four voicings, `schema.ts`, read back in `reread.ts`; `compose.ts` `placedClause` reads a joined clause as its people). Placements on one witness's word at one place and hour are one clause. When the turn is still over its length (70 words to Poached, 90 above), it drops only somebody nothing held leaves able to get the means or the way in (the solver's `accessNo`); never anybody who could have, placed or on their own word. Before, `turnOrder` dropped placed clauses last first, whoever they were.

- Poached 17: "Bidwell said Renfro was at Moe’s at nine." (Salerno, there too and able to get the knife, dropped) → "Renfro and Salerno were at Moe’s at nine; Bidwell said so."
- Poached 6 (one-liar): "Abramowitz was at the Bijou at ten; I had that from Vogel." (Abramowitz had no way to the knife; Crowninshield, who had, dropped) → "Abramowitz and Crowninshield were at the Bijou at ten; Vogel said so."
- Medium 21: "Vitale had been at the Blue Lantern at ten, and Broadnax had said as much." (Mosley dropped) → "Vitale and Mosley were at the Blue Lantern at ten, according to Broadnax."

### 3. The way in names the place where "her place" would be either woman's (`keeper`)

`thread.ts` `pointerSaid`: a keeper's sighting of somebody of the keeper's own sex, at the keeper's own place, says the place by its name, and the one they saw by a pronoun the reference pass keeps where it reads as them (the page has just named them), else by name.

- Medium 21, Salerno's flat: "Mrs. Kowalski had seen Salerno at the landlady’s place at seven." → "Mrs. Kowalski had seen her at Kowalski’s at seven." ("Mrs. Kowalski had seen him at her place at eight." at the Eagle club office stays: Sweeney is a man.)

### 4. The keeper's own place in a put (`keeper`)

`bones/phrase.ts` `breakToFace`: a keeper's line about the keeper's own place (called after them) says it as theirs: "says she had nobody in", "says she had Renfro and Salerno in", "saw you at her place". The clarity check (`bones/clarity.ts`) reads a keeper's line with the keeper named in it and "had … in at" or "her place" as naming the place.

- Poached 17, the put to Callahan: "Mrs. Nagy says nobody was at Mrs. Nagy’s at nine, not you or anybody else." → "Mrs. Nagy says she had nobody in at nine, not you or anybody else."
- Medium 21, the put to Sweeney: "Mrs. Kowalski says nobody was at Kowalski’s at ten, not you or anybody else." → "Mrs. Kowalski says she had nobody in at ten, not you or anybody else."

### 5. A bare hour and a comma don't open a clause (`bare-hour`)

`voicings.json`, 28 LIST-HOUR, CLAIM-SPAN, REMARK and HANDOVER templates: "{From}, I {reason}" → "At {from} I {reason}" or "Come {from}, I {reason}"; "{From:oclock}, I…" and the terse "Then {from}, I…" → "At {from} I…" (no word more than they had); "{Hours}, I had {names}." → "At {hours} I had {names}."; "{Hours}, nobody came in." → "Nobody came in at {hours}."; "{Hours}, not another soul came in." → "Not a soul came in at {hours}."; "{Hour}, we closed." → "We closed at {hour}."; "{From}, I {reason}, and stayed the rest of the night." → "Come {from}, I {reason}, and stayed put." "Ten sharp," "Seven through eight," and a list's fragments ("Seven o’clock, Renfro and Salerno.", "Nine, nobody in.") stay. The lint reads an answer's sentence that opens on an hour, a comma and a clause.

- Poached 17, Dandridge: "Eight, I went to Moe’s to see who was in" → "At eight I went to Moe’s to see who was in"
- Poached 17, Bledsoe: "Ten, I went home on my own again, because my feet hurt." → "Come ten, I went home on my own again, because my feet hurt."
- Poached 6, Rosenbaum: "Seven, I went round to Rafferty’s to return a borrowed umbrella" → "At seven I went round to Rafferty’s to return a borrowed umbrella" ("Ten sharp, I went round to Sokol’s" stays)
- Poached 6, Brennan: "Ten, I went to Sokol’s back room to meet Rosenbaum." → "Come ten, I went to Sokol’s back room to meet Rosenbaum."
- Hard-boiled 19, Donnelly: "Then nine, I went up to the card room to do the books" → "At nine I went up to the card room to do the books"; Mosley: "Seven, I was home at the Delmonico rooms" → "At seven I was home at the Delmonico rooms"

### 6. The same words twice, close together (`twice`)

- **The papers' dead man not in two sentences running** (`pages.ts` `writeSearch`): where the role would come a sentence after itself, the dead man's trade where it's his alone on the night, else his name where it's left, and the role a sentence on. Poached 17: "The dead man had been squeezing Renfro for years. The dead man knew where Dandridge, a shoe clerk, had been in 1921. Callahan had been put out of a lease by the landlord." → "The dead man had been squeezing Renfro for years. The landlord knew where Dandridge, a shoe clerk, had been in 1921. Callahan had been put out of a lease by the dead man." Hard-boiled 19: "…put out of a lease by the dead man. Hauck … had a brother the dead man had testified against. The alderman’s clerk had kept a file on Donnelly" → "…put out of a lease by the dead man. Hauck … had a brother the alderman’s clerk had testified against. The dead man had kept a file on Donnelly".
- **The agreement's aside not the one the page before closed on** (`thought.ts`): Poached 6, page 12 after page 11's "That much checked out.": "So Brennan told it the same as Rosenbaum: Sokol’s back room at ten. That much checked out." → "… That much of it stood up."
- **"Was there" a second time is "there too"** (`tell.ts`; `reread.ts` reads it): Medium 21, Vitale: "At nine I went to Kowalski’s to collect a debt, and Mosley was there. At ten I had a table at the Blue Lantern, and Mosley was there." → "…, and Mosley was there too."

### 7. The grid's key (`grid.ts` `shownPlaces`, `placesKey`; `src/ui/board-book.ts`)

The key glosses only the labels the grid's cells show (the CLI's `grid` and the book both; the book's cells leave out the "→" of an admission, so its key does too), and the book's sample label is tonight's, the scene's, never "Odessa".

- Poached 17 at Mrs. Nagy's, after her list (the testers' route): "In the grid, Sokol’s is Sokol’s back room." with no Sokol's cell in the grid → no gloss; once Dandridge has said Sokol's, the key says it.
- The book's key, Poached 17: "Odessa they say so · Odessa somebody saw them there · Odessa✗ where they clash" → "Quill’s they say so · Quill’s somebody saw them there · Quill’s✗ where they clash".

### 8. The curtain's fastest solve, by the hour that matters (`hint`)

`report.ts`: the fastest solve's step to somebody's evening says the hint's words (`stars.ts` `hintWords`), one short clause, so a pointer's own hour that doesn't matter is "nobody had said where X was at" the hour that does. The `hint` rule reads the curtain's steps too.

- Poached 17: "Bidwell saw Dandridge at Moe’s at eight: ask Dandridge where he was." → "Nobody had said where Dandridge was at nine: ask Dandridge where he was."
- Medium 16: "Brauer says Callahan was with her at Mrs. Nagy’s at seven: ask Callahan where he was." → "Nobody had said where Callahan was at ten: ask Callahan where he was."

## 2. The measures

30 nights a tier, both worlds, three routes (the oracle's, the wanderer's, the reader's) where the measure walks routes; "main" is `3da6290` read with this build's lints (`scratchpad/c5b/hinge.mts`), "this build" the branch's last commit, lean.

**The new hinge rules** (§1), main's hits to 0:

| rule | item | main | this build |
|---|---|---|---|
| walk-tail | 1 | 390 (dealt 301, neighbourhood 89) | 0 |
| turn-drop | 2 | 107 | 0 |
| keeper | 3, 4 | 59 | 0 |
| bare-hour | 5 | 466 | 0 |
| twice | 6 | 256 | 0 |
| hint (the curtain's fastest solve) | 8 | 279 | 0 |

`walk-tail` by tier, main (dealt / neighbourhood): Raw 36 / 13, Coddled 32 / 8, Poached 58 / 17, Soft-boiled 27 / 16, Medium 64 / 18, Hard-boiled 84 / 17; this build 0 at every tier in both. The 55 rules before them are 0 on this build at every tier, both worlds, every route (60 in all).

**The pronoun check** (docs/66's, `scratchpad/c5b/amb.mts`): 0 on main and on this build, three routes; board-prose's pronoun columns 0 at every tier in both worlds.

**The turn**, words in its recap (median [most]) and turns over 70 (Raw to Poached) or 90 (above), counted as `scratchpad/c5/turns.mts` does, main → this build:

| world | tier | words (median [most]) | over target |
|---|---|---|---|
| dealt | Raw | 50 [70] → 50 [71] | 0 → 1 of 30 |
| dealt | Coddled | 50 [82] → 50 [82] | 2 → 2 of 30 |
| dealt | Poached | 60 [87] → 61 [87] | 5 → 8 of 30 |
| dealt | Soft-boiled | 73 [114] → 74 [112] | 2 → 3 of 30 |
| dealt | Medium | 65 [110] → 70 [112] | 2 → 2 of 30 |
| dealt | Hard-boiled | 45 [52] → 45 [52] | 0 → 0 of 6 |
| neighbourhood | Raw | 46 [71] → 51 [71] | 1 → 1 of 30 |
| neighbourhood | Coddled | 50 [73] → 50 [73] | 1 → 1 of 30 |
| neighbourhood | Poached | 61 [90] → 63 [90] | 7 → 8 of 30 |
| neighbourhood | Soft-boiled | 69 [103] → 74 [105] | 3 → 2 of 30 |
| neighbourhood | Medium | 69 [102] → 70 [104] | 1 → 1 of 30 |
| neighbourhood | Hard-boiled | 54 [77] → 54 [77] | 0 → 0 of 6 |

Turns over target: dealt 11 → 16 of 156, the neighbourhood 13 → 13. Never dropping somebody who could have had the means keeps clauses the old trim dropped (the medians up five words at dealt Medium and the neighbourhood's Raw and Soft-boiled); joining one witness's placements gives some back. The longest turn is 112 words (main's, 114).

**The pages** (board-prose, the oracle's route), main → this build:

| world | tier | words a page (median) | list smell, pages (oracle) | fact sentences per fact |
|---|---|---|---|---|
| dealt | Raw | 105 → 105 | 33 → 34 of 280 | 1.30 → 1.30 |
| dealt | Coddled | 100 → 100 | 22 → 22 of 276 | 1.25 → 1.25 |
| dealt | Poached | 100 → 100 | 29 → 29 of 385 | 1.21 → 1.21 |
| dealt | Soft-boiled | 104 → 104 | 33 → 34 of 381 | 1.18 → 1.18 |
| dealt | Medium | 98 → 97 | 38 → 38 of 438 | 1.19 → 1.19 |
| dealt | Hard-boiled | 94 → 94 | 18 → 18 of 435 | 1.00 → 1.00 |
| neighbourhood | Raw | 123 → 123 | 26 → 29 of 280 | 1.26 → 1.26 |
| neighbourhood | Coddled | 112 → 112 | 25 → 25 of 276 | 1.26 → 1.26 |
| neighbourhood | Poached | 114 → 113 | 37 → 36 of 391 | 1.19 → 1.19 |
| neighbourhood | Soft-boiled | 114 → 114 | 40 → 46 of 379 | 1.26 → 1.26 |
| neighbourhood | Medium | 107 → 107 | 37 → 40 of 430 | 1.18 → 1.18 |
| neighbourhood | Hard-boiled | **99 → 100** | 25 → 25 of 435 | 1.00 → 1.00 |

Words a page held at nine rows and fell at two; **the neighbourhood's Hard-boiled is up one, and the brief's gate ("not up at any row") isn't met there.** It is one page: main has 217 of 435 pages over 99 words, the most a median of 99 allows, and this build has 218, because seed 6's account page went from 99 words to 100 ("Glick from eight on. Ten, I went to the Lyric…" → "…Come ten, I went to the Lyric…"). Every item-5 fix costs that word ("Ten," → "At ten" or "Come ten,"; the user's own "Ten sharp," too); where a template had a word to spare the rewrite takes it back ("{From:oclock}, I" and the terse "Then {from}, I" → "At {from} I"; "and stayed the rest of the night" → "and stayed put"; "not another soul" → "not a soul"), and the row's mean fell (112.53 → 112.46 words; total 48,950 → 48,920). List smell rose a little at four rows and fell at one; not a gate.

The rest held:

- **board-prose**, both worlds: every lint 0 at every tier, cards twice and sentences twice 0 (the walk reserve, §1, and the aside after an agreement taking one the night hasn't said), job pages with a thought naming an earlier fact 100%.
- **Round trip and clarity** (`scripts/roundtrip.ts --nights 30 --routes oracle,wanderer,reader`): every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% at every tier in both worlds (the turn's `recap-many` and the keeper's "had nobody in" among them). The flesh column's three misses are main's (Miss Nowak's owning up, the neighbourhood's Poached and Medium). `clarity-measure`: every repeat, slot, continuity, tic and assembly column 0, as main.
- **The claudisms gates** hold. **Engine words**: 0 in every prose source; the report's, verdict's and curtain's "cleared" and "nobody else" are docs/64's, as main.
- **Dealt boards** hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`. Nothing in `src/gen/` changed.
- **board-measure** (`--seeds 20`, this build against main): the same table, every column at every row (the puzzle columns, and callback pages too).
- **The suite**: 968 tests, 36 files, pass (`npx vitest run --minWorkers=1 --maxWorkers=3`; main's 939 among them, two of them reworded for item 1 and item 5: `round5.test.ts`'s first walk and `clarity5.test.ts`'s office gathering); `test/hinge.test.ts` has the five new rules and the curtain's `hint`, `test/clarity5b.test.ts` the five nights and the grid's key. tsc is clean; `npm run build` builds.

## 3. The nights, read

The five nights, read in full, page by page, in lean (`npm run read`; Raw 23 with `--curtain --hints every`), on main (the designer's reads, `scratchpad/c5rev/`, which main still writes word for word) and on this build's last commit (`scratchpad/c5b/read/`). Each item's before → after is §1's; words a page, main → this build: Poached 17 109 → 109, Poached 6 112 → 112, Medium 21 109 → 109, Hard-boiled 19 101 → 101, Raw 23 123 → 122. What else changed is what the rules deal around: the turn's collision on Poached 17 now in the voicing that says it in two sentences ("Callahan said she was home at nine. Mrs. Nagy said otherwise.", as main's Medium 21 had it), and the walks the tail rule dealt again. Nothing on these nights reads worse than main's by my read; what I saw and left is below.

## 4. What's open

In docs/25 too.

- **Words a page at the neighbourhood's Hard-boiled**, 99 → 100 (§2): one page over the median, from item 5's word. The gate isn't met at that row.
- **The turn's length** (§2): never dropping somebody who could have had the means, the turn is a little longer at some tiers. The 70 and 90 word targets are the trim's, and the trim now stops short of them where only people who could have had the means are left.
- **The notebook's "How it adds up"** still lists one witness's placements one at a time ("Renfro was at Moe’s at nine; Bidwell said so." … "Salerno was at Moe’s at nine; Bidwell said so."): the join is the turn's (`turnOrder`), where the brief put it; the notebook reads `recapClauses` as before.
- **The keeper's place by the keeper's name in my own thought**: "Callahan had said she was home at Mrs. Nagy’s at nine, and Mrs. Nagy hadn’t seen her there." (Poached 17, the list page's collision). Item 4's rule reaches the keeper's line in a put; the thought and the notebook's "Mrs. Nagy: at nine o’clock, nobody was at Mrs. Nagy’s." (chrome) are as they were.
- **List smell** up a little at four rows (§2); not a gate.
- **Docs/70's open items** stand: the skim gate (the turn's dead-seen-alive reason), Hard-boiled's bare hours, the seen-while-reading lines, and the designer's list.
