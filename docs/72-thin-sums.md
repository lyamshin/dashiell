# Thin sums: the narration stops doing the sums from Poached up

*2026-10-26, branch `thin-sums`, off main at `49c8c18` (clarity-5b, #110, docs/71). Round 8's blind testers (`scratchpad/round8-digest.md`, reports `scratchpad/r8rep/`) all solved by deduction, and four of five said the narration did the sums a beat before they did: Coddled "too easy", Poached "a little easy: the narration does arithmetic for you", Hard-boiled "a little linear: each witness crossed off one person", Medium "it does the deductions for you". The designer approved the digest's D3. From Poached up, the narration before the report no longer joins the facts into the conclusions the player should draw from the facts and the grid; Raw and Coddled, the teaching tiers, keep their sums, made whole (round 8, B3). The hint is the player asking for the sum, and is unchanged. Fixed by rule in the layer that makes the line, with a lint (the level lint's rule `sum`, and the hinge rule `sum-drop`) and a test (`test/thin-sums.test.ts`). Nothing in `src/gen/` changed. Lean only, like docs/60 to 71: the full dial (`?texture=full`) writes the pages as before (the notebook's hold line, §2.4, is the one change it shares).*

## 1. The dial

docs/46 §2 put a dial on how far a thought may go: walk, link, fact. The clarity passes (docs/59 to 71) added the "So…" lines back at the link, to make the pages legible; round 8 says they're legible now, and the sums are too much. This build adds a switch beside the level rather than a fourth level (`model.ts` `sumsSaid`: Raw and Coddled, or the full dial), because what it turns off cuts across the link and the fact alike, and every caller of `thoughtLevel` keeps its meaning:

| tier | level | the sums (1–5) |
|---|---|---|
| Raw, Coddled | link (as before) | stay, whole (§3) |
| Poached, Soft-boiled, Medium | link without sums | none |
| Hard-boiled | fact (as before) | none: the partition and the gap it still printed go |

A **sum** is a sentence that joins facts into a conclusion the player should draw from the facts and the grid. Five kinds (`sum-lint.ts`):

1. **settled**: the settled hour ("So it happened at ten.", the turn's "It happened at ten o’clock. Abramowitz had said nine or ten, and at nine…"), and the office's two hours beside the sighting, the premise pair that begs it;
2. **frame**: the crime hour as a frame ("at ten, when Feeney was given the laudanum", "when it could have happened", "the earliest it could have happened");
3. **partition**: who was still there at the hour and who had gone ("Mosley was at the Bijou at ten…, and by then Kavanagh had left.", the turn's "Dandridge and Mosley were at the Bijou at ten; Schilling said so.");
4. **means**: the means tie on people ("So Kavanagh, Hauck and Mosley had each been at the Delmonico rooms earlier, where the laudanum was kept…", "Dandridge hadn’t been at the Delmonico rooms before nine, when the laudanum was there to take.");
5. **gap**: the gap pointer ("Nobody else had said where Hochstetter was at nine", "I still didn’t know where Hauck was at ten.", "…, and nobody had backed it up.", the turn's "I still had to ask Sweeney and Brennan about their evenings.", round 8's B5).

What stays from Poached up: collisions ("One thing didn’t fit. Kavanagh had told me he was home…, and Mrs. Pickering never saw him there."), agreements ("So she told it the same as Kavanagh: the Palace at ten. That much checked out."), the dead or the pet seen alive said as a plain fact ("At nine, Feeney was still alive at the Bijou.", as Hard-boiled has said it since docs/66 §1.2), the scene's street, and the way in said as a fact of the search ("To give Feeney the laudanum, somebody had to go to the Delmonico rooms for it first."). The office, the papers, stars, hints, the report form, the verdict, the story and the curtain are unchanged.

## 2. What was built, by layer

### 2.1 The thought (`thought.ts`)

From Poached up (`sums` false):

- **The sighting as a plain fact** (rule 4): the WINDOW-ALIVE `fact` voicing, "At nine, Feeney was still alive at the Bijou.", without "and Abramowitz had said nine or ten", and no `narrows` sentence after it. It's a sentence of its own: the composer (`compose.ts` `sideBySide`) and the rhythm (`rhythm.ts` `mendable`) don't run it into the next fact (a first build said "At nine, Feeney was still alive at the Bijou, and Dandridge had told me she was at the Bijou at seven, and Schilling backed her up.").
- **No consequence on a list** (`thenList` only where the sums are said): no partition, no means sentence, no "Tramonti didn’t see A, B or C at Moe’s".
- **No way in on people** (`wayIn`): who could have had the means, by name, is the grid's last column.
- **No placements** (rule 7): "That put A at P at H, and W would swear to it."
- **No hours that matter on an evening** (`hoursThatMatter`): no "Nobody else had said where X was at H", no Hard-boiled "X said Y at H, and nobody had backed it up", no restatement of their claim at the hours that matter (at Hard-boiled, the settled hour once settled), and no aside where there was no gap ("I took it as given."), which would tell the gap by its absence. An evening's page ends on the answer, or on its collision or agreement.

### 2.2 The other narration (`pages.ts`)

- **The find** (`writeSearch`): the way in as a fact, the WINDOW-MEANS `find first` voicings, never "…for it before nine, the earliest it could have happened" (Round 7's B6 deadline is the player's sum from Poached up; the grid's last column says who came too late).
- **The motive page** (`writeMotive`): no "For ten, she had told me she was home." (their evening framed at the crime hour, the settled one where it's settled).
- **An owning up with nobody in it** (`writeConfront`): no "Nobody had said so but him." The witness pointer after an owning up ("Ainsworth could say whether Kavanagh was telling it straight.") and the refusal's pointer ("somewhere usually has a witness…") are the put's own and stay; the refusal voicing that says "Only he said he was home at ten" is forbidden from Poached up (`thin`).
- **The turn, "Go over what I have" and the notebook** (`recapClausesMarked`): from Poached up the clauses are Hard-boiled's, `factClauses`: the office's hours as the office gave them, where the means came from, whose evenings I had and which keepers I'd asked (said as §2.4 has it), and what was said when it was put; from Poached to Medium also whose story didn't square with what, at the office's hours (`brokenClauses`, the clause main had, shared), the owning up said as owned ("…, and Ainsworth could say whether that was so" is an open clause), and a small case's coat (`whereClause`). No settled hour, no placements, no "nobody had backed it up yet", no who-knew, and no open clause anywhere ("I still had to ask…", "I didn’t have X's evening yet": B5). The web book's "How it adds up" reads the same clauses.

### 2.3 The lint (`sum-lint.ts`, `lint.ts`)

`levelIssues` has a rule `sum`: above Coddled, none of the five kinds in the narration before the report (every page but the office, outside quotation marks, leaving out the hand-off), nor in the notebook's "How it adds up" as it stood after every page that asked something. It runs inside `lintBoardRun`, so board-measure's lint column, board-prose's level column (now "thoughts over their level, or a sum") and the tests carry it. Its patterns read the voicings' and writers' forms of each kind, and pass the forms that stay (`test/thin-sums.test.ts` holds both). The settled hour is counted only where the office gave two hours: one hour said again settles nothing.

### 2.4 The coordinator's read: the turn and the notebook as a person says them

Two slips the read of this build's ten nights found, each by rule with a test (`test/thin-sums.test.ts`):

- **it-was** (hinge rule): the turn opened on "According to Wehrle, it was nine or ten o’clock." (Soft-boiled 33) and "According to Lanza, it was nine o’clock." (Poached 34): out of the office, "it was nine o’clock" reads as the time now, the "it" with nothing to point at. The two WINDOW-MEANS `when office` voicings that say it (`office-two-3`, `office-hour-d2`) aren't dealt in lean; the turn says "Wehrle had given me nine or ten o’clock." or "Lanza had said nine o’clock.", as Medium 33's did. The rule reads the notebook said aloud (the turn, "Go over what I have").
- **The notebook's hold line** (`factClauses`, `held`): "I had evenings from Kavanagh, Ainsworth and Hauck, and lists from Mrs. Pickering and Schilling." said the engine's words (docs/53, addendum: `jargon.ts` has `lists from` and `evenings from`); it says what the turn's HOLD voicings say: "I had the evenings as Kavanagh, Ainsworth and Hauck told them, and I knew who Mrs. Pickering and Schilling had each seen come and go.", at every tier that uses it, Hard-boiled's included. The notebook's "How it adds up", as it stood after every page that asked something, is now read by the `jargon` rule (`prose-lint.ts`), so board-prose's engine-words column and the tests carry it.

Two hinge rules give way where the sums are said only: **deadline** (round 7's B6, which wanted the find's "before nine") and, by having nothing to read, **turn-drop** (the turn places nobody from Poached up). Both still hold where the sums are said, and their tests run them there (`test/hinge.test.ts`, on the full dial).

## 3. B3 at Raw and Coddled: a sum never leaves anybody out

`thought.ts` `sayThen`, lean: a list's consequence names everybody the list placed, suspect or company, news or not: who was still there at the hour (`placedBy`), everybody who had been there while the means was there to take and was gone by it (`goneOfAll`, replacing the news-only means group), who else had gone, and, new, who came in only after the hour, a sentence of its own (PLACED-SET `then late`, four voicings, read back in `reread.ts`): "Marchetti didn’t get to the Blue Lantern till ten." The hinge rule **sum-drop** reads it: on a list page where the sums are said, every person the list placed is in the sum (by name, or among the unit's people where the reference pass made them "he"). This is the thought's side of clarity-5b's `turnOrder` rule.

Where a list's consequence names somebody an agreement on the same page would say too, the agreement goes (docs/59 item 3's "said there, once", for who was still there as it was already for who had gone): "She backed Whitfield up: at the Bijou at nine. So at nine, …, Corrigan and Whitfield were at the Bijou." named Whitfield three times on Coddled 12's page with the reason I came; board-prose's "pages naming somebody 3+ times" is 0 again.

**sum-drop**, 30 nights a tier, both worlds, three routes, main (`49c8c18`, read with this lint) → this build: dealt Raw 187 → 0, Coddled 77 → 0; the neighbourhood's Raw 204 → 0, Coddled 76 → 0 (544 → 0). Main's misses were all three kinds: company the keeper had in all evening (Coddled 35's Hargrove), people the list had at the hour who were "news" to nobody (placed by an earlier page), and people who came in only after it (Raw 9's Marchetti).

## 4. The measures

30 nights a tier, both worlds, three routes (the oracle's, the wanderer's, the reader's) where the measure walks routes. "Main" is `49c8c18` read with this build's lints (`scratchpad/ts/sums.mts`, `b3main.mts`, `nbjargon.mts`, `hinge.mts`: main's engine and notebook, this build's patterns); "this build" is the branch's last commit, lean.

### 4.1 The sums, by kind (the level lint's `sum`)

From Poached up, main → this build:

| world | tier | settled | frame | partition | means | gap |
|---|---|---|---|---|---|---|
| dealt | Poached | 0 → 0 | 158 → 0 | 896 → 0 | 358 → 0 | 837 → 0 |
| dealt | Soft-boiled | 540 → 0 | 179 → 0 | 1,003 → 0 | 320 → 0 | 800 → 0 |
| dealt | Medium | 509 → 0 | 155 → 0 | 732 → 0 | 252 → 0 | 711 → 0 |
| dealt | Hard-boiled | 0 → 0 | 88 → 0 | 43 → 0 | 0 → 0 | 653 → 0 |
| neighbourhood | Poached | 0 → 0 | 169 → 0 | 930 → 0 | 362 → 0 | 862 → 0 |
| neighbourhood | Soft-boiled | 523 → 0 | 174 → 0 | 879 → 0 | 281 → 0 | 765 → 0 |
| neighbourhood | Medium | 477 → 0 | 156 → 0 | 838 → 0 | 262 → 0 | 746 → 0 |
| neighbourhood | Hard-boiled | 0 → 0 | 81 → 0 | 41 → 0 | 0 → 0 | 304 → 0 |
| **all** | | **2,049 → 0** | **1,160 → 0** | **5,362 → 0** | **1,835 → 0** | **5,678 → 0** |

16,084 → 0 in all (a hit is a sentence of a kind, on a page or in the notebook as it stood after a page that asked; one sentence may be two kinds, as the means sum is means and partition). Poached deals one office hour, so it has nothing to settle; Hard-boiled never said the settled hour, and its "means" were never said by name.

Raw and Coddled keep theirs (main → this build): dealt Raw frame 186 → 192, partition 688 → 707, means 22 → 24, gap 604 → 604; Coddled 152 → 162, 250 → 260, 235 → 235, 587 → 587; the neighbourhood's Raw 191 → 195, 695 → 723, 19 → 23, 580 → 580; Coddled 143 → 156, 272 → 283, 248 → 248, 564 → 564. They rose with B3: a sum that names everybody, and who came in later, is more of them.

### 4.2 The other gates

- **The puzzle is main's.** Nothing in `src/gen/` changed; the dealt boards hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`. `board-measure --seeds 20` is main's, table for table and column for column (the oracle at 100% with the lines and at par, par, the shortcuts, the wanderer, the readers, the one-liar reader, lint issues 0, callback pages); stars and par are untouched.
- **The level lint** (`level` and `sum`) is 0 at every tier, both worlds, three routes; board-prose's "thoughts over their level, or a sum" column 0 everywhere.
- **The hinge lints**, 62 rules (`sum-drop` and `it-was` new), 0 at every tier, both worlds, three routes. Main read with them: 0 but `sum-drop` 544 and `it-was` 1 (Hard-boiled, "According to Margolis, it was nine or ten o’clock.").
- **The pronoun check** (docs/66's, every page, three routes): 0 on main, 0 on this build.
- **The notebook's engine words** (the `jargon` rule now reads it): main 950 ("lists from", "evenings from"; Hard-boiled's notebook, 472 dealt and 478 in the neighbourhood) → 0. Engine words elsewhere: 0 in every prose source (`engine-words.ts`); the report's, verdict's and curtain's "cleared" and "nobody else" are docs/64's, and the report isn't this build's.
- **Round trip and clarity** (`roundtrip.ts --nights 30 --routes oracle,wanderer,reader`, `clarity-measure.ts`): every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% at every tier in both worlds, as main; the flesh column's three misses are main's (Miss Nowak's owning up). Every repeat, slot, continuity, tic and assembly column 0, as main; words per new fact fell from Poached up (dealt Poached 54.7 → 52.3, Soft-boiled 51.6 → 48.4, Medium 47.7 → 45.2, Hard-boiled 45.6 → 43.3).
- **board-prose**, both worlds: every lint column 0, as main (names three times on a page 0, after §3's fix). List smell fell from Poached up (three routes, dealt Poached 74 → 63, Soft-boiled 94 → 80, Medium 98 → 86; the neighbourhood's 87 → 77, 89 → 67, 93 → 81) and moved by a few pages at Raw and Coddled (the neighbourhood's Coddled 57 → 58). "Job pages with a thought naming an earlier fact" is, from Poached up, of the job pages that think, since a page may end on what was said: 100% at every row but the neighbourhood's Poached, 99% (a handover's "Whatever went out of the Pomerantz flat tonight had to end up somewhere."); the share that think is 88%, 88%, 92% and 33% (dealt Poached, Soft-boiled, Medium, Hard-boiled; the neighbourhood's 90%, 88%, 91%, 33%).
- **The claudisms gates** hold.
- **The suite**: 988 tests, 38 files, pass (`npx vitest run --minWorkers=1 --maxWorkers=3`), main's 970 among them, eight rewritten to the rule (§6), sixteen new and two more for §2.4 (`test/thin-sums.test.ts`); tsc is clean; `npm run build` builds.

### 4.3 Words a page

board-prose, the oracle's route, median [p10–p90], main → this build:

| world | tier | words a page |
|---|---|---|
| dealt | Raw | 105 [44–233] → 106 [44–233] |
| dealt | Coddled | 100 [39–233] → 101 [39–233] |
| dealt | Poached | 100 [58–188] → 96 [57–168] |
| dealt | Soft-boiled | 104 [53–204] → 97 [44–173] |
| dealt | Medium | 97 [52–188] → 93 [49–163] |
| dealt | Hard-boiled | 94 [58–150] → 88 [48–145] |
| neighbourhood | Raw | 123 [42–229] → 123 [42–229] |
| neighbourhood | Coddled | 112 [38–232] → 113 [38–232] |
| neighbourhood | Poached | 113 [51–187] → 104 [51–176] |
| neighbourhood | Soft-boiled | 114 [56–231] → 107 [40–189] |
| neighbourhood | Medium | 107 [57–209] → 100 [51–179] |
| neighbourhood | Hard-boiled | 100 [61–162] → 94 [54–157] |

From Poached up a page fell by four to nine words at the median and more at the top; Raw and Coddled rose by a word where a sum now names everybody. No page was padded where a sum went.

The turn, words in its recap (median [most]) and turns over 70 (Raw to Poached) or 90 (above), the oracle's route (`turns.mts`), main → this build: dealt Raw 50 [71] → 50 [71], Coddled 50 [82] → 50 [82], Poached 61 [87] → 46 [75] (over target 8 → 1 of 30), Soft-boiled 74 [112] → 47 [70] (3 → 0), Medium 70 [112] → 49 [77] (2 → 0), Hard-boiled 45 [52] → 34 [41]; the neighbourhood's Raw 51 [71] → 51 [73] (1 → 2), Coddled 50 [73] → 50 [73], Poached 63 [90] → 45 [71] (8 → 1), Soft-boiled 74 [105] → 47 [74] (2 → 0), Medium 70 [104] → 52 [82] (1 → 0), Hard-boiled 54 [77] → 37 [69]. The turn says what's held and stops, and it's a third shorter from Poached up; the neighbourhood's Raw moved by a draw.

### 4.4 The browser

Vite on this worktree (`localhost:5191`), Medium 33, murder, at desktop and at 375 px: the Bijou after Schilling's list ("At nine, Feeney was still alive at the Bijou." and nothing after it), Mrs. Pickering's page ending on her answer, the turn at the Palace ("Abramowitz had given me nine or ten o’clock. … At ten, Kavanagh said he was home, and Mrs. Pickering said otherwise."), and the notebook's "How it adds up" ("Abramowitz had said nine or ten o’clock. / The laudanum had come from the Delmonico rooms. / I had the evening as Kavanagh told it, and I knew who Schilling and Mrs. Pickering had each seen come and go. / Kavanagh had told me he was home at ten, and Mrs. Pickering said otherwise."). Looked at again after §2.4, the turn and the notebook as quoted. At 375 px nothing scrolls sideways (scroll width 375 of 375).

## 5. The nights, read

Read in full, page by page (`npm run read`), on main (`49c8c18`, `scratchpad/ts/read-main/`) and on this build (`scratchpad/ts/read-final/`): the five round-8 nights on the testers' routes (the actions from `playtest8-*.json`, without `hint`, `mark`, `report`, `notes`, `grid` and `file`), Medium 33 and Hard-boiled 34 on the oracle's, and for the tiers the testers' nights don't cover, Soft-boiled 33 (murder), Medium 34 (a lost pet) and Coddled 34 (a lost item) on the oracle's. Words a page, main → this build:

| night | route | words a page |
|---|---|---|
| Raw 33, lost item | tester's | 139 → 139 |
| Coddled 35, murder | tester's | 110 → 110 |
| Coddled 34, lost item | oracle's | 109 → 109 |
| Poached 34, murder | tester's | 119 → 113 |
| Soft-boiled 33, murder | oracle's | 104 → 95 |
| Medium 33, murder | tester's | 107 → 99 |
| Medium 33, murder | oracle's | 105 → 100 |
| Medium 34, lost pet | oracle's | 112 → 108 |
| Hard-boiled 34, murder | tester's | 111 → 105 |
| Hard-boiled 34, murder | oracle's | 99 → 94 |

No page from Poached up dangles: where the sighting is a page's whole thought it's said as a plain fact, and nothing waits for a conclusion ("At nine, Feeney was still alive at the Bijou."). A page that had only a sum now ends on what was said (Poached 34's Bledsoe, Medium 33's tester's Hauck after her agreement), and none is padded. The level lint's `settled` kind reads the premise pair too: 0 on this build.

### 5.1 Before → after, by kind

**1, the settled hour.** (Raw to Poached deal one office hour; there's nothing to settle.)
- Soft-boiled 33, Renfro's page: "Obermann was still alive at the Blue Lantern at nine, and Wehrle had said nine or ten. So it happened at ten." → "Obermann was still alive at the Blue Lantern at nine."
- Medium 33 (oracle's), Schilling's page: "At nine, Feeney was still alive at the Bijou, and Abramowitz had said nine or ten. So it happened at ten." → "At nine, Feeney was still alive at the Bijou."
- Medium 34 (a lost pet): "At nine, Mimi was still at the Delmonico rooms, and Bernstein had said nine or ten. So Mimi went at ten." → "At nine, Mimi was still at the Delmonico rooms."
- Medium 33's turn: "It happened at ten o’clock. Abramowitz had said nine or ten, and at nine Feeney was still alive at the Bijou." → "Abramowitz had given me nine or ten o’clock."; its notebook: "Abramowitz had said nine or ten, and Feeney was at the Bijou at nine, alive, so it happened at ten." → "Abramowitz had said nine or ten o’clock."
- Poached 34's turn (one office hour): "It was nine o’clock when it happened." → "Lanza had given me nine o’clock." (the office's hour, whose it was, as Hard-boiled's turn says it; §2.4).

**2, the crime hour as a frame.**
- Soft-boiled 33's find: "Whoever stabbed Obermann had been at the Delmonico rooms for the knife before nine, the earliest it could have happened." → "Obermann’s killer had been at the Delmonico rooms first, for the knife."; Medium 33's: "…for it before nine, the earliest it could have happened." → "To give Feeney the laudanum, somebody had to go to the Delmonico rooms for it first."
- Poached 34, Vogel's page: "Nobody else had said where Vogel was at nine, when Havemeyer was given the laudanum." → (the page ends on her agreement: "That matched what Mrs. Cheatham had seen: home at seven. So far as it went, it stood up.")
- Hard-boiled 34 (tester's), Mrs. Kowalski's page: "So at nine and ten, when it could have happened, Sweeney was still at Kowalski’s, and by then Hargrove and Steinbach had left." → (the page ends on her answer)
- Hard-boiled 34 (oracle's): "Steinbach said she was at the card room at nine and ten, when Kreuzer could have been given the chloral; nobody had backed it up." → (ends on her answer)
- Medium 33 (tester's), Hauck's motive: "When I asked Hauck about ten, she said she was home at ten." → (gone: "It matched the page in the papers, though Abramowitz hadn’t brought it up in the office.")

**3, the partition.**
- Poached 34, Bledsoe's page: "So Hochstetter and Fairbanks were at the Velvet Room at nine, when Havemeyer was given the laudanum, and by then Vogel and Lindemann had left." → (ends on Bledsoe's answer)
- Soft-boiled 33: "At ten, when Obermann died, Prentiss and Vitale were at the Blue Lantern, and by then Sweeney and Kreuzer had left." → gone
- Medium 33 (oracle's): "Mosley was at the Bijou at ten, when Feeney was given the laudanum, and by then Kavanagh had left." → gone
- Medium 34, after the collision: "Havemeyer and Obermann were at the Blue Lantern at ten, when Mimi went." → gone
- Hard-boiled 34 (oracle's): "So at ten, Sweeney and Brennan were at Kowalski’s, and by then Hargrove had left." and "So Steinbach was at the card room at ten." → gone
- The turns: "Dandridge and Mosley were at the Bijou at ten; Schilling said so." (Medium 33), "Prentiss and Vitale had been at the Blue Lantern at ten. Renfro had said as much." (Soft-boiled 33), "Hochstetter and Fairbanks were at the Velvet Room at nine, according to Bledsoe." (Poached 34) → "I knew who Schilling and Mrs. Pickering had each seen come and go, and I had the evening as Kavanagh told it." (what's held); the notebooks' "Prentiss was at the Blue Lantern at ten; Renfro said so." → "I had the evenings as Sweeney and Kreuzer told them, and I knew who Renfro, Mrs. Thorndike and Lefkowitz had each seen come and go."

**4, the means tie on people.**
- Poached 34, Mrs. Cheatham's page: "So Vogel, Lindemann and Fairbanks had each been at the Delmonico rooms earlier, where the laudanum was kept, and every one of them had gone by nine." → "At eight, she saw Lindemann at the Delmonico rooms, right where he said." (the agreement it used to stand in for)
- Medium 33 (oracle's), Mrs. Pickering's page: "She backed Dandridge up: at the Delmonico rooms at nine. So Kavanagh, Hauck and Mosley had each been at the Delmonico rooms earlier, where the laudanum was kept, and every one of them had gone by ten." → "She saw Dandridge at the Delmonico rooms at nine, and the two of them told it the same way."; Schilling's "Dandridge hadn’t been at the Delmonico rooms before nine, when the laudanum was there to take." → gone
- Medium 33 (tester's): "Mosley had been at the Delmonico rooms earlier, when the laudanum was there for the taking, but Dandridge didn’t come till nine, too late for it. So Kavanagh and Hauck had both been…" → (ends on Mrs. Pickering's answer)
- Soft-boiled 33: "So Sweeney, Kreuzer and Vitale had all been at the Delmonico rooms, where the carving knife was kept, and had all left by ten." → gone
- Medium 34's turn (told the key): "Havemeyer hadn’t been at the meeting. Tramonti, Stannard and Obermann had, and knew where the key was." → gone; its notebook "Tramonti, Stannard and Obermann were at the meeting and knew where the key was; Havemeyer wasn’t." → gone

**5, the gap pointer.**
- Medium 33 (tester's), Hauck's page: "…So far as it went, it stood up. Nobody else had said where Hauck was at ten, when Feeney was given the laudanum." → "…So far as it went, it stood up."
- Medium 33's turn: "I still didn’t know where Hauck was at ten." → gone; Soft-boiled 33's "I still didn’t know where Kreuzer was at ten." → gone; Medium 34's "I still didn’t know where Stannard was at ten." → gone
- Hard-boiled 34's turn (B5): "When I pushed, Hargrove wouldn’t say where else she had been. I still had to ask Sweeney and Brennan about their evenings." → "When I pushed, Hargrove wouldn’t say where else she had been."; its notebook "I didn’t have Sweeney’s or Brennan’s evenings yet." → gone
- Hard-boiled 34: "She said she was at the Orpheum at ten, and nobody had backed that up yet." and "He said he was at the Orpheum at ten." (an evening said again at the hour the facts had settled) → gone
- Medium 33's notebook: "Hauck said she was home at ten, and nobody had backed it up yet." → gone

**B3, at Raw and Coddled.**
- Coddled 35 (tester's), Mrs. Kowalski's page: "So he had been at Kowalski’s at eight, where the laudanum was kept, and had left by nine. Feldman was still in at nine." → "… Feldman and Hargrove were still in at nine."
- Raw 33 (tester's): "So Havemeyer was at Moskowitz’s at ten, when the brooch went. By then Bidwell had left." → "So Kessler and Havemeyer were at Moskowitz’s at ten, …"; "…had both left by ten. Dandridge was in at ten." → "Dandridge and Crowninshield were in at ten."
- Coddled 34 (a lost item): "So at ten, when the watch went, Hargrove was at the chop house, and by then Kessler had left." → "…Coffin and Hargrove were at the chop house…"
- Raw 9 (murder): "So Havemeyer and Hochstetter were still at the Blue Lantern at nine, when Abramowitz died." → the same, and "Marchetti didn’t come into the Blue Lantern till ten." (on the list at ten only)

### 5.2 Seen while reading, and left

- From Poached up the grid still marks the hour it happened once the facts settle it ("ten !", "The marked hour is when it happened."). It's the chrome's, not the narration's, and the brief's list of where the rule applies doesn't name it.
- The confrontation's own pointers stay: after an owning up, "If she said the same, he had been at the Palace and not at the Delmonico rooms." and "Ainsworth could say whether Kavanagh was telling it straight."; after a refusal, "…somewhere usually has a witness, or pointedly doesn’t." and "He’d told me he was at the Shamrock at seven, and I’d ask at the Shamrock about nine." They're the put's hand-off, read as the confrontation's outcome; only the refusal voicing that says "Only he said he was home at ten" (a gap) is held back from Poached up.
- A put that doesn't land still says why (REACTION `held untrusted`: "At {hour} {by} said one thing and {person} another, and nothing backed up {by} yet."): that's the game's answer to the player's move.
- The street ("I underlined the street. Ludlow Street was where Feeney lived.") stays, as docs/46 §2 has it: a link to the scene, not one of the five sums. It points hard at whoever was passed on it.

## 6. What's open

In docs/25 too.

- **The grid still marks the settled hour** from Poached up ("ten !", "The marked hour is when it happened."): chrome, outside the brief's list of where the rule applies, and a sum the player reads off the grid rather than the prose. Whether the grid should keep the office's two hours until the report is the designer's call.
- **The confrontation's own pointers stay**: the owning up's "If she said the same, he had been at the Palace…" and "Ainsworth could say whether Kavanagh was telling it straight.", the refusal's "somewhere usually has a witness, or pointedly doesn’t" and "I’d ask at the Shamrock about nine", a held put's "nothing backed up Pickering yet". I read them as the put's hand-off and its outcome, not one of the five kinds; only the refusal voicing that says "Only he said he was home at ten" is held back from Poached up. If they read as sums too, the same flag (`thin`) reaches them.
- **The street** ("Ludlow Street was where Feeney lived.") stays as docs/46's link to the scene; it points hard at whoever was passed on it.
- **The optional restatement** of a keeper's list per person, in their own hours, isn't built: the keepers' answers already tell it a person at a time ("Kavanagh went out after seven. Mosley was in early on and went out after nine…"), and a page that ends on the answer reads. A keeper's answer told by hour, where one is, would want it.
- **Hard-boiled's thoughts are mostly gone**: with the partition, the gap and the evening said again at the hours that matter taken out, a third of its job pages think (the sighting, a collision on its own page). That's the brief's "fact (as now), no sums"; whether Hard-boiled wants a line of its own on the pages that are now only an answer is a design question.
- **"Job pages with a thought"** in board-prose counts, from Poached up, the pages that think (§4.2); its old target, every job page, was docs/44's, and this build retires it from Poached up.
- **Raw and Coddled's sums are a little longer** (B3): words a page up a word at the median, and list smell up a few pages at Raw. Not a gate.
- **Tests rewritten to the rule**, their positive cases kept where the sums are said (Raw, Coddled, or the full dial): `hinge.test.ts` (deadline, turn-drop), `round7.test.ts` (B6 on Medium 21 and Hard-boiled 19; B8's "had both been" now on Coddled), `clarity5.test.ts` (P4), `clarity5b.test.ts` (item 2's three turns), `one-liar.test.ts` (Poached 6's turn), `clarity.test.ts` (Raw 7's sum names Hanrahan too), `board-connective.test.ts` (from Poached up a page may end on what was said).
