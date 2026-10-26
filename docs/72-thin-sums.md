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

Two hinge rules give way where the sums are said only: **deadline** (round 7's B6, which wanted the find's "before nine") and, by having nothing to read, **turn-drop** (the turn places nobody from Poached up). Both still hold where the sums are said, and their tests run them there (`test/hinge.test.ts`, on the full dial).

## 3. B3 at Raw and Coddled: a sum never leaves anybody out

`thought.ts` `sayThen`, lean: a list's consequence names everybody the list placed, suspect or company, news or not: who was still there at the hour (`placedBy`), everybody who had been there while the means was there to take and was gone by it (`goneOfAll`, replacing the news-only means group), who else had gone, and, new, who came in only after the hour, a sentence of its own (PLACED-SET `then late`, four voicings, read back in `reread.ts`): "Marchetti didn’t get to the Blue Lantern till ten." The hinge rule **sum-drop** reads it: on a list page where the sums are said, every person the list placed is in the sum (by name, or among the unit's people where the reference pass made them "he"). This is the thought's side of clarity-5b's `turnOrder` rule.

{{B3}}

## 4. The measures

{{MEASURES}}

## 5. The nights, read

{{READS}}

## 6. What's open

{{OPEN}}
