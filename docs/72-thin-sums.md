# Thin sums: the narration stops doing the sums from Poached up

*2026-10-26, branch `thin-sums`, off main at `49c8c18` (clarity-5b, #110, docs/71). Round 8's blind testers (`scratchpad/round8-digest.md`, reports `scratchpad/r8rep/`) all solved by deduction, and four of five said the narration did the sums a beat before they did: Coddled "too easy", Poached "a little easy: the narration does arithmetic for you", Hard-boiled "a little linear: each witness crossed off one person", Medium "it does the deductions for you". The designer approved the digest's D3. From Poached up, the narration before the report no longer joins the facts into the conclusions the player should draw from the facts and the grid; Raw and Coddled, the teaching tiers, keep their sums, made whole (round 8, B3). The hint is the player asking for the sum, and is unchanged. Fixed by rule in the layer that makes the line, with a lint (the level lint's rule `sum`, and the hinge rule `sum-drop`) and a test (`test/thin-sums.test.ts`). Nothing in `src/gen/` changed. Lean only, like docs/60 to 71: the full dial (`?texture=full`) writes the pages as before.*

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
- **The turn, "Go over what I have" and the notebook** (`recapClausesMarked`): from Poached up the clauses are Hard-boiled's, `factClauses`: the office's hours as the office gave them, where the means came from, whose evenings and lists I had, and what was said when it was put; from Poached to Medium also whose story didn't square with what, at the office's hours (`brokenClauses`, the clause main had, shared), the owning up said as owned ("…, and Ainsworth could say whether that was so" is an open clause), and a small case's coat (`whereClause`). No settled hour, no placements, no "nobody had backed it up yet", no who-knew, and no open clause anywhere ("I still had to ask…", "I didn’t have X's evening yet": B5). The web book's "How it adds up" reads the same clauses.

### 2.3 The lint (`sum-lint.ts`, `lint.ts`)

`levelIssues` has a rule `sum`: above Coddled, none of the five kinds in the narration before the report (every page but the office, outside quotation marks, leaving out the hand-off), nor in the notebook's "How it adds up" as it stood after every page that asked something. It runs inside `lintBoardRun`, so board-measure's lint column, board-prose's level column (now "thoughts over their level, or a sum") and the tests carry it. Its patterns read the voicings' and writers' forms of each kind, and pass the forms that stay (`test/thin-sums.test.ts` holds both). The settled hour is counted only where the office gave two hours: one hour said again settles nothing.

### 2.4 The coordinator's read: the turn and the notebook as a person says them

Two slips the read of this build's ten nights found, each by rule with a test (`test/thin-sums.test.ts`):

- **it-was** (hinge rule): the turn opened on "According to Wehrle, it was nine or ten o’clock." (Soft-boiled 33) and "According to Lanza, it was nine o’clock." (Poached 34): out of the office, "it was nine o’clock" reads as the time now, the "it" with nothing to point at. The two WINDOW-MEANS `when office` voicings that say it (`office-two-3`, `office-hour-d2`) aren't dealt in lean; the turn says "Wehrle had given me nine or ten o’clock." or "Lanza had said nine o’clock.", as Medium 33's did. The rule reads the notebook said aloud (the turn, "Go over what I have").
- **The notebook's hold line** (`factClauses`, `held`): "I had evenings from Kavanagh, Ainsworth and Hauck, and lists from Mrs. Pickering and Schilling." said the engine's words (docs/53, addendum: `jargon.ts` has `lists from` and `evenings from`); it says what the turn's HOLD voicings say: "I had the evenings as Kavanagh, Ainsworth and Hauck told them, and I knew who Mrs. Pickering and Schilling had each seen come and go.", at every tier that uses it, Hard-boiled's included. The notebook's "How it adds up", as it stood after every page that asked something, is now read by the `jargon` rule (`prose-lint.ts`), so board-prose's engine-words column and the tests carry it.

Two hinge rules give way where the sums are said only: **deadline** (round 7's B6, which wanted the find's "before nine") and, by having nothing to read, **turn-drop** (the turn places nobody from Poached up). Both still hold where the sums are said, and their tests run them there (`test/hinge.test.ts`, on the full dial).

## 3. B3 at Raw and Coddled: a sum never leaves anybody out

`thought.ts` `sayThen`, lean: a list's consequence names everybody the list placed, suspect or company, news or not: who was still there at the hour (`placedBy`), everybody who had been there while the means was there to take and was gone by it (`goneOfAll`, replacing the news-only means group), who else had gone, and, new, who came in only after the hour, a sentence of its own (PLACED-SET `then late`, four voicings, read back in `reread.ts`): "Marchetti didn’t get to the Blue Lantern till ten." The hinge rule **sum-drop** reads it: on a list page where the sums are said, every person the list placed is in the sum (by name, or among the unit's people where the reference pass made them "he"). This is the thought's side of clarity-5b's `turnOrder` rule.

{{B3}}

## 4. The measures

{{MEASURES}}

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

{{OPEN}}
