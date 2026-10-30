# The notebook only writes down what you were told (puzzles A, behind a flag)

*2026-10-30, branch `puzzles-a`, off main at `dc5ae37` (puzzles-b, #127, docs/82). Phase 2b of docs/79: idea A, prototyped behind the `puzzles` flag that's off by default, and measured on its own and with B. The designer chose to prototype every idea behind the flag and measure it before anything ships. A deals nothing: with the flag off every page, every grid and every deal is main's (§3).*

## 0. In short

- **A is built, behind `puzzles: ['A']`** (`?puzzles=A`, `play new --puzzles A`, `read --puzzles A`, `lazy-rig --puzzles A`; with B, `A,B`), off by default, from Poached up. It deals nothing. With it off, the 36 claudisms nights render byte for byte as main's, every page, grid, picker and CLI line (§3), and the deal hashes as main's.
- **With it on, the notebook only writes down what was said.** The grid shows each person's own word and, under it, where anybody else said they saw them; no ✗, no ✓, no placement on a chain. A second view, "Who was seen where", shows every list as it was said, a place a row, under the grid. The means column says where the means came from and when somebody saw each of them there. The pages run at Hard-boiled's fact level and never say a clash, an agreement, the dead man's sighting as an hour, or the scene's inference. "Where things stand" says what was said. Anybody whose evening is held can be confronted, with any line held at that hour. **The clash mark is the player's** ("Doesn’t fit" on a cell; `mark "<Name> <hour> clash"`), and the turn comes on the first one that's real. Hints never say a clash the player hasn't marked. The curtain is as it was.
- **The rig, as predicted where the strategy read the ✗:** first clash falls to the floor (79, 67, 35, 14 → 25, 24, 24, 16; random is 25, 28, 24, 13); the cross-referencer, which joins for itself, doesn't move at all; the oracle stays at 100%. The notebook reader falls a little with A alone from Poached to Medium, as predicted (84, 74, 96 → 79, 86, 83), **but not as predicted** it falls to 39% at Hard-boiled, where the pair's friend says he was with the culprit and A shows that as somebody seeing them; and the tier's trick, which never sees two ✗ now, sweeps to its budget and eliminates, and rises at Poached and Soft-boiled. **With A+B** the notebook reader is 79, 96, 47, 36: a coin flip on Medium's means and on Hard-boiled, but not on Soft-boiled's hour, which is still a one-step read (the dead man's row, the boy's line). Every grid reader's perfect report collapses (the notebook reader 71, 70, 17, 70 → 23, 58, 0, 13 with A+B).
- **Four nights read with A+B** (Poached murder, Soft-boiled lost pet, Medium murder, Hard-boiled murder): no page draws a conclusion; every clash the solver finds is on the two views, the coat at Hard-boiled excepted (it's on the page you walked in on, as before); the joins are one glance each.
- **Six blind testers with A+B**, three at Poached and three at Medium: all six named the right culprit, five filed a perfect report, actions −1 to +2 over par, 11 clashes marked of which 10 were real (the other a false clash that B's one-liar night leaves: §6). All six said it was fair and gave it 4 out of 5; five said the grid and "who was seen where" made the clashes easy to spot. A moves the noticing to the player; it doesn't make the noticing hard.

## 1. The flag

`puzzles: ['A']`, beside B: `?puzzles=A` or `?puzzles=A,B` in the book, `npm run play -- new … --puzzles A,B`, `npm run read -- … --puzzles A,B`, `npx tsx scripts/lazy-rig.ts --puzzles A,B`. `parsePuzzles` reads both, in order (`PUZZLES = ['A', 'B']`); `--puzzles Z` is refused ("the prototypes there are: A and B").

A deals nothing. `generateBoard` deals the night without A (B's draws are as docs/82 has them) and then, from Poached up, the night carries `puzzles: ['A', …]`, so every part of the book that reads the case can ask `factsOnly(c)` (`model.ts`: Poached up, and the flag). A night with A is the night without it but for that one field; Raw and Coddled with A are main's night byte for byte (`test/puzzles-a.test.ts`). The save, the URL, "Back to the case" and the CLI keep the flag as docs/82 built it for B.

## 2. What A changes, from Poached up

Raw and Coddled keep every sum: they teach. From Poached up, with the flag:

1. **The grid** (`grid.ts` `factGrid`) shows each person's own word, and under it where anybody else said they saw them then (`BoardCell.heard`): a list that has them, somebody's company ("with Grasso"), the office's party, an owning-up's company, and a passer-by in the street ("Ludlow St"). Each by whose word, in the cell's lines when it's opened. Nothing the solver derived: no ✗, no ✓, no placement resting on a chain (a story checked placing its company, an owning-up's check), and the cell's lines never include the list at the place they named (that would be the join made for them). The **clash mark** is the player's: open a cell with their word in it and press "Doesn’t fit" (the CLI: `mark "<Name> <hour> clash"`; `clear` takes it off). It shows as their word with a ✗ in the accent, the same whether it's right or not.
   The **second view**, "Who was seen where" (`BoardGrid.places`), is under the grid on the same page: a place a row, the hours across, who the one keeping the door saw then, or "nobody", or "shut", as it was said ("Delmonico, nine: nobody, says Mrs. Tillman"); the office's party is a row in the client's word. Her story says the Delmonico rooms at nine; the row under says nobody was there: the join is a glance, and it's the player's. The CLI prints it as a block per place under `grid` and `notebook`.
2. **The means column** says the facts: its head is where the means came from ("at Rafferty’s"), once the find says so; each row says the hours somebody saw them there, and "lodges there" or "works there". Under the grid: "The laudanum came from Rafferty’s. Mrs. Rafferty: “At seven, the laudanum was in my medicine cupboard. I didn’t look again after that.”" No "yes", no "no", no "too late for it", and no "Why “no”" note.
3. **The pages' thoughts** run at Hard-boiled's fact level (`thoughtLevel` is `fact` with A), and never say a clash, even with both lines on the page: no "Here was the trouble", "There was a snag", "Something didn’t add up", no "That much checked out" and no agreement, no "At nine, Havemeyer was still alive at the Odessa" (the list says he was there, and his row shows it), and the scene says what was found and stops: no "Whoever stabbed Ellery had been at the Delmonico rooms first", no "had to fetch it from Mrs. Nagy’s before nine". Nothing in `content/` changed. The rest of a page is main's at Hard-boiled's level, which has one form main's Poached to Medium drop: a list's page says first whose claim brought me there ("Schilling had said she was at the Velvet Room at eight."), as Hard-boiled's always has (§5, §8).
4. **"Where things stand"** says what was said that bears on the case: the client's hours, where the means came from, whose evenings and lists I had, and what anybody said when it was put to them (an owning up with its company, a second story, a refusal). It never says "X said otherwise", nor that a second story didn't check out either.
5. **Confront** is offered for anybody whose evening is held (`choices.ts` `openPicker`), suspect or not, about any hour of it, and the picker offers every line held at that hour that isn't theirs, the lines about them or the place they named first. One that doesn't land costs its action and says why, as before.
6. **The turn** comes when the player first marks a clash that is real (`engine.ts`, the `clash` command; `knowledge.ts` `clashReal`: their story at that hour, held, is broken by what's held, or their second story is). It is a free page of its own, the chapter heading and the notebook read back, and it says first the clash the player found ("At nine, Petrosino said she was home, and Quill said otherwise."), since it's theirs now. A mark that isn't real changes nothing and says nothing; neither does a real one after the turn. The book turns to the page; the CLI prints "Marked: …" and then the page.
7. **Hints** stay (one at Poached). A confront step's reason, unless the player has marked that cell, is "Schilling is worth confronting": the person, never the clash.
8. **The curtain** is as it was: the replay is the solver's grid (`boardGrid(…, { solved: true })`), every clash and the solver's path, after the case is closed.

**Taught**, with the flag only, from Poached up, after the line about two stories that don't match: "From here on the notebook only writes down what you were told. Where two stories don’t fit is yours to find." (`teach.ts` `teachA`; plain, as the teach page is, docs/53's addendum). The book shows the teach page on a fresh night with A whatever the profile, as B's does; the CLI's `new` prints it, and `help` with an A night's save says the line and the `clash` mark. Under the CLI's grid: "Where two stories don’t fit, mark it: mark "<Name> <hour> clash" (and "<Name> <hour> clear" takes your marks off)." The book's "How to read the grid" fold says the key: their word, somebody else's, your mark.

The book (`board-book.ts` `factGridNode`, `placesNode`, `clashMark`; `board.css`): the notebook's house style (docs/75, docs/76): the same table, rules and type; their word soft and dotted as ever, what others said upright under it, the player's ✗ in the accent, a guess faint. At 375 the grid and the places view fit with no sideways scroll (12 px at the least, 44 px cells); at 1280 and 1512 the two views sit on the notebook page one above the other. Stills in the scratchpad's `puzzles/a/shots/`.

## 3. Flag off, nothing moves

- **The deal**: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a` (docs/71's script), main's.
- **Every page, the grid and the CLI**: the 36 nights the claudisms lint reads, rendered whole along the oracle's route from main (`dc5ae37`) and from this branch with the flag off: every page's text, its choices, the grid and the notebook after every page, every picker open to the player, the report's fields, the verdict, the story and the curtain, the teach lines, and the play CLI's whole transcript (`new`, `help`, every `do`, `grid` and `notebook` after each step, `report`, `close`, `story`, `curtain`). 4.9 MB a side; `diff -r` is empty (`puzzles/a/render.mts`, `render-main/`, `render-off/`).
- **The book**: every change in `board-book.ts` is behind `g.facts` or `teachA`, which are false with the flag off; `test/puzzles-a.test.ts` checks the grid, the picker, the turn and the CLI both ways.

## 4. The rig

`scripts/lazy-rig.ts`, 25 seeds a tier and type, both worlds, Poached to Hard-boiled (450 nights a run; Raw and Coddled are the same night and the same pages in all four, so docs/82's flag-off rows stand for them), `--no-depth`: flag off, A, B, A+B, one run each on one core, about 14 minutes a run. Every night's record is in the scratchpad's `puzzles/a/` (`rig-off.json`, `rig-a.json`, `rig-b.json`, `rig-ab.json`, and `compare4.py` makes these tables from them). The flag-off and B runs reproduce docs/79's and docs/82's tables exactly.

The rig's strategies read the grid as before: `cell.collision` for a ✗, `cell.seen` for a placement, `row.means` for "yes" and "no". With A the grid has no ✗ and no "yes" or "no", and `seen` is the first place anybody else said they saw them. Two changes to the rig, both no-ops with the flag off: the notebook reader confronts only what the grid marks ✗ (with A the picker offers every hour of anybody's evening, and confronting all of it would spend the night on nothing), and a lazy report takes "who caught them out" from the grid's own line only where the grid sets one (with A, nowhere: it's the line it put, if that landed, or the form's first name). The cross-referencer (`xref`, docs/82) is the one-hop strategy that makes the join itself and ignores the grid's marks; it was already there. The first liar (`playFirstLiar`) reads the solver's collisions, not the grid, so with A it stands for a player who makes the join on the designed path.

### 4.1 The right culprit inside the budget

Each cell: flag off · A · B · A+B, in percent.

| strategy | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|
| random suspect | 25 · 25 · 25 · 25 | 28 · 28 · 26 · 26 | 24 · 24 · 26 · 26 | 13 · 13 · 13 · 13 |
| anybody with the means | 34 · 22 · 34 · 22 | 27 · 20 · 28 · 24 | 33 · 21 · 42 · 22 | 21 · 19 · 26 · 19 |
| means and lists only | 57 · 57 · 57 · 57 | 51 · 45 · 74 · 70 | 51 · 43 · 86 · 46 | 34 · 34 · 37 · 29 |
| star follower | 60 · 47 · 60 · 47 | 45 · 33 · 70 · 53 | 31 · 42 · 64 · 45 | 18 · 11 · 28 · 19 |
| first clash | 79 · 25 · 79 · 25 | 67 · 24 · 46 · 23 | 35 · 24 · 63 · 26 | 14 · 16 · 29 · 18 |
| first liar | 63 · 63 · 63 · 63 | 53 · 53 · 59 · 59 | 57 · 57 · 57 · 57 | 20 · 20 · 46 · 46 |
| elimination by placement | 83 · 77 · 83 · 77 | 60 · 41 · 46 · 42 | 67 · 58 · 63 · 49 | 80 · 38 · 80 · 41 |
| notebook reader | 84 · 79 · 84 · 79 | 74 · 86 · 76 · 96 | 96 · 83 · 100 · 47 | 97 · 39 · 99 · 36 |
| cross-referencer | 90 · 90 · 90 · 90 | 69 · 69 · 76 · 76 | 99 · 99 · 100 · 100 | 46 · 46 · 66 · 66 |
| the tier’s trick | 70 · 81 · 70 · 81 | 76 · 85 · 77 · 94 | 100 · 84 · 75 · 55 | 69 · 45 · 76 · 39 |
| oracle | 100 · 100 · 100 · 100 | 100 · 100 · 100 · 100 | 100 · 100 · 100 · 100 | 100 · 100 · 100 · 100 |

Actions, mean, where they moved: first clash 7.6 · 11.5 · 7.6 · 11.5 at Poached (it never sees a ✗, so it sweeps to its budget: 40% of nights, from 7%), 7.1 · 11.8 · 6.0 · 10.2 at Soft-boiled; the notebook reader 12.5 · 11.1 at Poached (it no longer confronts, and its placements, now anybody's word, leave one standing sooner: budget spent on 25% of nights, from 86%). Par and budget don't move with A (B's are docs/82's).

### 4.2 The same, on nights with two liars

| strategy | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|
| first clash | 72 · 28 · 72 · 28 | 50 · 30 · 36 · 23 | 10 · 25 · 66 · 24 | 14 · 16 · 24 · 20 |
| first liar | 42 · 42 · 42 · 42 | 29 · 29 · 51 · 51 | 38 · 38 · 48 · 48 | 16 · 16 · 40 · 40 |
| elimination by placement | 74 · 67 · 74 · 67 | 39 · 41 · 37 · 40 | 52 · 51 · 65 · 48 | 78 · 35 · 78 · 40 |
| notebook reader | 75 · 71 · 75 · 71 | 61 · 79 · 72 · 98 | 94 · 75 · 100 · 47 | 96 · 28 · 99 · 28 |
| cross-referencer | 84 · 84 · 84 · 84 | 53 · 53 · 72 · 72 | 99 · 99 · 100 · 100 | 39 · 39 · 61 · 61 |
| the tier’s trick | 53 · 74 · 53 · 74 | 64 · 77 · 73 · 95 | 100 · 77 · 70 · 55 | 64 · 35 · 71 · 33 |
| *nights* | 96 | 66 · 66 · 83 · 83 | 69 · 69 · 83 · 83 | 85 · 85 · 82 · 82 |

### 4.3 The perfect report (five out of five)

| strategy | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|
| star follower | 35 · 9 · 35 · 9 | 34 · 7 · 41 · 4 | 0 · 0 · 0 · 0 | 0 · 0 · 4 · 2 |
| first clash | 73 · 8 · 73 · 8 | 67 · 8 · 43 · 15 | 34 · 0 · 58 · 0 | 6 · 8 · 21 · 8 |
| first liar | 45 · 45 · 45 · 45 | 33 · 33 · 50 · 50 | 44 · 44 · 47 · 47 | 0 · 0 · 23 · 23 |
| elimination by placement | 71 · 24 · 71 · 24 | 60 · 16 · 46 · 24 | 55 · 0 · 57 · 0 | 75 · 20 · 75 · 14 |
| notebook reader | 71 · 23 · 71 · 23 | 70 · 29 · 51 · 58 | 17 · 0 · 2 · 0 | 70 · 4 · 66 · 13 |
| cross-referencer | 74 · 74 · 74 · 74 | 67 · 67 · 51 · 51 | 24 · 24 · 0 · 0 | 32 · 32 · 49 · 49 |
| the tier’s trick | 61 · 27 · 61 · 27 | 74 · 26 · 76 · 58 | 89 · 0 · 53 · 0 | 48 · 27 · 57 · 19 |
| oracle | 100 · 100 · 100 · 100 | the same | the same | the same |

### 4.4 Against the predictions (docs/79 §4.A and §4.F)

- **First clash falls unless it makes the join: yes.** To the floor everywhere with A (25, 24, 24, 16 against random's 25, 28, 24, 13), and its perfect report from 73, 67, 34 to 8, 8, 0. It reads the ✗, and there isn't one; a first clash that made the join by hand is what §4.F's "55–65% with A and B" meant, and the cross-referencer is the one-hop version of that.
- **The tier's trick falls: no, not to the floor.** Without a ✗ it never sees two broken stories, so it sweeps to its budget and falls back on the grid's placements, which is elimination: it rises at Poached (70 → 81) and Soft-boiled (76 → 85; 94 with B), and falls at Medium (100 → 84; 55 with B, §4.F's "55–65%") and Hard-boiled (69 → 45). What it loses is the trick, and its report: perfect 61, 74, 89, 48 → 27, 26, 0, 27 with A (§4.F: "under 10%" with A+B at Medium: 0).
- **The cross-referencer doesn't fall: yes, exactly.** It never read the grid; every night's answer is the same with and without A (90, 69, 99, 46; with B 90, 76, 100, 66).
- **The notebook reader falls a little with A alone (75–90%): yes from Poached to Medium** (79, 86, 83), **no at Hard-boiled** (97 → 39). The grid now shows what the friend on a pair night says ("with Bellucci at her flat at nine") as somebody's word placing the culprit, as it is, and the reader takes it; main's grid placed nobody on a story nothing had checked. At Soft-boiled it *rises* (74 → 86): it no longer spends actions confronting, so it holds more lists when it eliminates.
- **And a lot with A+B (55–65% at Medium): yes at Medium and Hard-boiled** (47, 36), **no at Soft-boiled** (96). B's hour is still a one-step read with A: the dead man's sighting is a fact on his row, and the boy's "back by ten: in his chair with his eyes open" is a line on the list's page; a reader who drops the hour they rule out finds the innocent liar placed by a list at the crime hour, and names the other. B's means at Medium is the one A takes away: the column no longer says "no", and a reader who doesn't read the origin's list for themselves is at a coin flip (47%), one who does is at 100% (the cross-referencer).
- **The oracle stays at 100%: yes**, in all four, at par.
- §4.F's Medium row with A: random 24 (24), anybody with the means 25–33 (21), means and lists only 45–50 (43), the notebook reader 75–90 (83), all near; first clash 35 and the trick 100 were "by hand" (the rig's don't join: 24, 84). With A+B: means and lists only 35–45 (46), the notebook reader 55–65 (47), the trick 55–65 with a perfect report under 10% (55, 0).

### 4.5 What dropping "before nine, the earliest" costs

The scene's "Whoever gave Quill the laudanum had to fetch it from Mrs. Nagy’s before nine, the earliest he could have been given it" was round 9's premise for "too late for it" (a rival at the origin only at the window's first hour, the means last seen before it). A says it as facts (the means last seen at seven, the client's hours), not the rule. Along the oracle's route, over the same 450 nights with A and with A+B (`probe/late.mts`), a rival is "too late" on 45 and 61 nights at Medium and Hard-boiled (19 and 59 with B), and on none of them is that the only thing that clears them: every such rival is also placed away from the scene at the crime hour by something held. So no night's answer rests on the premise A took off the page; a player off the designed route might hold the late visit without the placement.

## 5. Four nights, read page by page, with A+B

Along the designed path (`npm run read -- --seed 71 --tier T --type X --puzzles A,B --curtain`; the reads are in the scratchpad's `puzzles/a/read/`). The oracle marks no clash, so no turn falls on these reads; the turn is checked in the tests and the stills.

**Poached 71, a murder** (laudanum from Rafferty’s; nine; one liar). The scene says the cocoa, the bottle and its label "made out to Rafferty’s", and stops. Kavanagh: the Thalia at nine "Feldman was with me". Feldman: the Thalia at nine, "Kavanagh kept me company". Carbone: the Thalia at nine, "Just me, to start." No thought after any of them (main's would have said the agreement and the clash). The grid shows all three "Thalia" at nine, with "[Thalia]" under Kavanagh and Feldman (each other's word) and nothing under Carbone; the places view is empty (no list was asked). **Where the reasoning happened:** entirely the player's. Two stories that name each other and not him, at a theatre, break his "on my own": that rests on the rule that a story names everybody with them, which the teach page says. Fair, and the hardest join of the four, because it's the only one not between a story and a list. The means column: Carbone and Feldman seen at Rafferty’s at eight, Ruggiero lodges there.

**Soft-boiled 71, a lost canary** (the hour; ten). The office: the card party at eight, "Schilling, Brauer, and that was everybody"; the lodger the door was left unlocked for. Mrs. Petrosino: "At nine o’clock Caruso was with me at my place… I returned him to the flat just before ten." Schilling says Hanley’s at ten; Brauer says Hanley’s at nine. Corrigan's list: Hanley’s at nine, Colquitt and Benny; at ten, Colquitt, Alfano and Benny; the coat to Benny at eleven. **Where the reasoning happened:** two joins of a story against a list, each a glance from the grid to the places view (Brauer "Hanley’s" at nine; Hanley’s at nine: Colquitt, Benny), and the hour from the canary's row ("[Kowalski’s]" at nine, by Mrs. Petrosino): it went at ten, and at ten Brauer was at Kowalski’s with Mrs. Petrosino, who says so. Every clash is on the two views; the hour is on the grid's first row. Fair, and quick (par 8).

**Medium 71, a murder** (laudanum from Rafferty’s; nine; the means). Reinhardt passed Havemeyer on Delancey Street at nine; Quill passed Petrosino on Chrystie Street at nine; both say they were home. Colquitt's list has the dead man at the Thalia till past eight and the boy who found him "back by ten". Mrs. Rafferty: Quill and Havemeyer at eight, nobody at nine or ten; the laudanum "at seven… I didn’t look again". **Where the reasoning happened:** the two clashes are in their own cells ("Havemeyer’s" over "[Delancey St]"; "Petrosino’s" over "[Chrystie St]"), so finding them is a glance; telling them apart is the means column (Havemeyer at Rafferty’s at eight; Petrosino never), which the player has to read as "the laudanum, last seen at seven, could only have gone with somebody who was there before nine". Main's page said "had to fetch it from Rafferty’s before nine" and its column said "no"; now it's the player's. Fair.

**Hard-boiled 71, a murder, a pair night** (laudanum from Mrs. Nagy’s; nine). Bellucci says home at nine, "Moretti was with me"; Moretti says Bellucci's at nine; Kessler's list at the chop house has "somebody in a sailor’s pea coat" at nine, and Moretti walked in past me in a sailor's pea coat. The grid shows the pair as each other's word ("[Bellucci’s]" under both); the places view has the pea coat at nine. **Where the reasoning happened:** the coat (the page I walked in on, not the two views, as at Hard-boiled always), then the pair: if the coat was Moretti's, his story breaks, and hers with it. That's main's Hard-boiled reasoning; A adds that the grid no longer marks it once the coat is pencilled. The dead man at the chop house at eight, on his row, settles nine. Fair, if you remember the coat.

Across the four: no page before the report draws a clash, an agreement, a sighting's hour or the scene's inference (the tests check it on 54 nights, every type from Poached up, both worlds); "Where things stand" is the client's hours, the means' origin, whose evenings and lists I had, and nothing else on these routes. What's left on a page that points is the arrival's reason ("Schilling had said she was at Hanley’s at ten and eleven", Hard-boiled's form): a fact, but it puts the claim on the page before the list that breaks it.

## 6. Six blind playtests, with A+B

Fresh agents that knew only the game's own output: the CLI, its `help`, the flag `--puzzles A,B`, nothing of A or B (prompt: the scratchpad's `puzzles/a/play/prompt.txt`; saves beside it; each mark judged by replaying the save, `probe/clashes.mts`).

| night | solved | actions (par) | clashes marked | enjoyment | what they said |
|---|---|---|---|---|---|
| Poached 61, a murder, two liars | 5/5, gold | 13 (12) | Quill 10 real, Havemeyer 10 real | 4 | "The notebook's grid and 'who was seen where' made both clashes easy to spot." Told them apart by confronting the innocent (a second story, checked). |
| Poached 61, a lost pet, two liars | 5/5, gold | 10 (11) | Hanrahan 10 real, Carbone 10 real | 4 | "The grid made the two ten o'clock gaps obvious at a glance." "A bit easy": the client points at her, and she confessed. Beat par by skipping the scene. |
| Poached 62, a lost thing, two liars | 5/5, gold | 11 (11) | Renfro 11 real, Brauer 11 real | 4 | "The grid made the clashes easy to see." "A little light for a Poached case." |
| Medium 61, a murder, two liars (the means) | 5/5, gold | 12 (12) | Petrosino 10 real, Kreuzer 10 real | 4 | "Spotting two clashes at the same hour and then needing the weapon to choose between them felt like real deduction." Where the chloral came from was "a hunch": they didn't search the scene. |
| Medium 64, a murder, two liars (the means) | 4/5 | 15 (13) | Kavanagh 9 real | 4 | Named the culprit by the means without ever holding the line that breaks his story (never asked the passer-by), so "who caught them out" was blank. "Fair: I lost the fifth point by spending actions badly." |
| Medium 61, a lost pet, one liar | 5/5, gold | 11 (9) | Wehrle 11 real, Colquitt 11 **not real** | 4 | The passer-by saw Colquitt "on East Fourth Street at eleven" while Colquitt said the print shop at eleven; the curtain called his story true. |

- **Solved:** six of six named the right person; five of six perfect. **Actions over par:** +1, −1, 0, 0, +2, +2.
- **Clashes marked that weren't real:** one of eleven. It's B's one-liar night: the generator drops the innocent's lie but keeps the passer-by's sighting of them in the street at the hour they walked to where they now truthfully say (`oneLiarNight`); the solver reads it as "not home", which is true, and a reader reads it as "not at the print shop". Main's grid hid it (no ✗); A shows the sighting. It's a false clash of D's kind, made by accident.
- **Fair? Tedious? Satisfying?** All six: fair, nothing tedious, 4 out of 5. The missing point: too easy or too light (the three at Poached: the clashes plain once you look, the confrontation settling which liar did it, the hour handed over), a hunch about where the poison came from, the false clash, and one tester's own wasted actions. The Medium testers found the means the satisfying step.
- **What they flagged that's A's:** the CLI's `help` and the grid gave the mark's syntax differently (fixed: `help` with an A night's save says `clash`, and a mark that brings the turn now says "Marked:" before the page); the confront picker offering lines that can't touch the claim ("a confusing distractor"): that's item 5 as asked, every line held at that hour. **Not A's:** `do back` after the CLI's `report` (the form is printed without being taken out), the curtain's "fastest solve" listing seven steps for eleven actions and being beaten by one, "Brauer, Hauck and Renfro knew the door would be unlocked" against an opening that told only the table, a second side remark that repeats the first nearly word for word (two passers-by in one account), "A man with two stories" of a woman, Wehrle calling his own surgery "Wehrle’s surgery", and one tester's report that a commit message about B was in its context (the harness's, not the game's).

## 7. What the designer should weigh

- **Is A+B fair? Yes, on what I read and what the testers met.** Every clash the solver finds is on the two views (a story against a list across them, a story against a sighting in its own cell, a story against two that name each other in the grid), the Hard-boiled coat excepted, which is on the page you walked in on as it always was; taking "before nine, the earliest" off the page removes no premise a designed route needs (§4.5). The one unfair thing found is B's: a one-liar night's passer-by who saw the honest innocent in the street (§6), which A makes visible.
- **Is it still fun? The testers say yes, 4 out of 5 each, and say it's easy.** A moves the noticing to the player, and the noticing is one glance: the grid and the places view were built to make it one (the brief's "a glance across two views"). Nobody missed a clash they held. What made a night satisfying was the step after: which of two liars, by the means (Medium) or by a checked second story (Poached). That's B's and C's ground, not A's.
- **A alone stops the lazy ✗ readers and the shortcut's report; it doesn't stop elimination or the one-step reads.** First clash and the grid readers' perfect reports fall to the floor; the cross-referencer, a one-hop joiner, is untouched (90, 76, 100, 66 with B); elimination by placement still names the culprit on 77% at Poached, and the hour at Soft-boiled is still one sighting (96% with B). docs/79's §4.A said as much; C is what makes the hour and the means two steps.
- **Choices I made that the designer may want otherwise:**
  - The turn says the clash the player found ("At nine, Petrosino said she was home, and Quill said otherwise"), since it's theirs once marked. It could instead say only the chapter heading.
  - The grid shows a story's company as somebody's word ("[Bellucci’s]" under Moretti's own "Bellucci’s"): that's the pair's mutual alibi, said as it was said, and it's why the notebook reader falls at Hard-boiled. The alternative (company only from a story something has checked) is a sum.
  - The places view shows lists only, not stories by place: a story-against-two-stories break (Poached 71) is on the people grid, not across the two views.
  - The confront picker offers every line at the hour, as asked; testers called the ones that can't touch the claim distractors.
  - Hints at Poached point at the person ("Schilling is worth confronting") until the player marks the cell.
- **"Who caught them out" lists whom you asked, in order** (docs/78): with A+B at Soft-boiled, a reader that names the form's first person is right on 58–63% of nights (the first list asked is often the one that caught them out). docs/79 §4.A item 5 (the form's order) wasn't in this brief; it's a tell now that the grid isn't.
- **The perfect report:** the first liar, which joins on the designed path, keeps 45, 50, 47, 23 with A+B; the brief's under-10% target needs D's false clashes on one-liar nights, as docs/82 said.

## 8. Seen, and not touched

The designer asked that story prose not be cut or reworded; A changed the night's words only by removing the conclusions items 3 and 4 name. What looked padded on the nights read, for the designer to judge (the night, the page, the line):

- Poached 71 p3: "I put the room back the way I found it, which is more than whoever came before me had done."
- Poached 71 p8: "I put the notebook away. The empty seats sat in their rows and kept their opinions to themselves. Which is more than any audience ever managed."
- Poached 71 p9: "My shadow went on ahead of me across the floor and reached the far wall first, which is the only way I ever get anywhere first."
- Soft-boiled 71 p3: "A pipe knocked twice somewhere in the walls, and I looked up as if it might be company. The night had me jumpier than I like to admit."
- Soft-boiled 71 p5: "I read the sign about the bath again. Saturday seemed a long way off."
- Medium 71 p14: "I wrote it down as given and put the pencil behind my ear, where it does its best thinking."
- Hard-boiled 71 p7: "I stood a moment and let my eyes catch up with the rest of me."
- Hard-boiled 71 p11: "Somebody had left a pickle on a plate at the table beside mine. I ate it, because I was brought up not to waste."
- Poached 41 p9: "I wrote it down. Somebody who keeps a door doesn’t care who did what, only who came in. It makes for an honest witness, and a dull one."
- Poached 41 p13: "I sat back and let the room forget about me. Which it managed quickly and without regret."
- Every papers page: "If anybody had a reason, the desk would say so. I worked through the place a piece at a time, and put each thing back exactly where it had been before I went on."

With the thoughts gone from Poached up (A's item 3), these asides are a larger share of what's left on an evening's page: several pages now end on one.

And what the testers flagged (§6), none touched: the duplicated passer-by remark, "A man with two stories" of a woman, "Wehrle’s surgery" in Wehrle's mouth, "made out to Kowalski’s" on a druggist's label, "stayed till past eight" read as present at nine, "By then Bidwell… was in the corner", the boy who found the dead man at ten while the client says he was found at half past eleven.

## 9. What's left for C, D and E

- **C, two-step proofs.** A leaves every break one lookup, as docs/79 said: a story against a list, a story against a sighting. The two discriminators B added are one step each with A too: the hour is one sighting on the dead man's row, the means one column. C's two sources for each are what would make the cross-referencer, the one-hop reader, fall.
- **D, imperfect witnesses.** A is what lets a false clash work: the grid no longer says which clashes are real. B's one-liar nights already deal one by accident (§6); D would deal them on purpose, said plainly on the page, and the player's mark is how a false one shows (it brings no turn).
- **E, time and distance.** Unchanged; the places view is where a timed sighting would go.
- **Left of A:** the Hard-boiled coat is on the page you walked in on, not the views (a "who wore what" line in "People and places" would put it there); the arrival's reason still says the claim before the list that breaks it; the CLI's `help` without a save doesn't know the night.

## 10. Files

New: `test/puzzles-a.test.ts`, this doc. The flag: `gen/board/generate.ts` (`PUZZLES`, `puzzleA`), `gen/board/index.ts` (A dealt as without it, then carried). The book: `model.ts` (`factsOnly`, `thoughtLevel`, `BoardRun.clashes`), `grid.ts` (`factGrid`, `heardText`, the places view, the CLI's grid with A, `CLASH_MARK`), `knowledge.ts` (`clashReal`), `engine.ts` (the `clash` command, the turn), `thought.ts` (no clash, no sighting's hour), `pages.ts` (the scene's inference, `factClauses` with A, `writeTurn`'s marked clash), `choices.ts` (`openPicker`), `stars.ts` (a confront's reason), `replay.ts` (the curtain's solver grid), `teach.ts` (`teachA`), `ui/board-book.ts` (`factGridNode`, `placesNode`, `clashMark`, the teach page), `ui/cells.ts`, `ui/board.css`, `cli/play-lib.ts` (`mark … clash`, the help, the confront), `cli/read.ts` (usage). The rig: `scripts/lazy-rig.ts` (§4). Nothing in `content/`.

Checks: the suite (three workers): 45 files, 1,134 tests passed; `npx tsc --noEmit` and `npm run build` clean; the flag-off render and the deal hashes as §3. Stills at 1280, 1512 and 375 of the grid, a cell open with its "Doesn’t fit", the player's ✗, the places view and the turn: the scratchpad's `puzzles/a/shots/`.

