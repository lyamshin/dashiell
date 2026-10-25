# Puzzle fixes

*2026-10-25, branch `puzzle-fixes`, off main at `ffc35e7` (clarity-3, #102). Two puzzle-side fixes the last builds left open, and three that round 6's blind testers found on main (Raw 11, Medium 14 and Hard-boiled 8; `scratchpad/r6-*.md`). The passer-by's street: a side remark put the culprit on the scene's street "on my way to" the passer-by's next place whether or not the walk ran there (docs/63 U11's leftover). The refuser night's shortcut: a careless reader who named the last liar caught and cited the line the collision showed against the other one still solved about half the refusers' nights at Soft-boiled and Medium (docs/61 §8). Round 6: the Hard-boiled grid matched a face to a name for the player; a star picked out the culprit from two suspects the evidence treated the same; and star reasons cited an hour that didn't matter. Each is fixed by a rule, in the layer that makes the thing, and measured before and after.*

## 1. The passer-by's street (`streets.ts`, `generate.ts`)

**Before:** at Medium the outsider walks over to the venue at the crime hour and says "Walking over to the chop house at ten I passed Thorndike on Second Avenue, going fast, no hat." The street was always the scene's, put in the passer-by's mouth wherever they walked. Medium 14: Pickering walks from the Delmonico rooms on Catherine Street to the chop house on Grand Street, which never comes near Second Avenue.

**The rule** (`generate.ts`, where the remark is made; `streets.ts` `crossingStreet`): the passer-by passes the culprit where their two walks that hour could cross, on the map the walks are said from.

- The passer-by's walk is from where they were the hour before to the venue. The culprit's is to the scene from where they were the hour before, or away from it to where they are the hour after (after the board's last hour, where the generator sends a culprit then: home from a murder, the venue with a lost thing). A walk covers the blocks between its two places and one either side ("plausibly near").
- The street is **the scene's own street** where the two walks can cross on it; else **the street nearest the scene** that runs through the ground both walks cover (by name, on a tie).
- Where the two walks never come near each other, nobody passed anybody: the night is dealt again (`veto`, "the side remark's speaker never comes near the culprit's way").

The map moved from `walk.ts` to `src/gen/board/streets.ts`, the same tables and the same spots, and `walk.ts` reads it, so the remark and the walk can't disagree. The culprit's way counts as well as the passer-by's: a street on the passer-by's way that the culprit had no reason to be on would be the same untruth from the other side.

**Which I chose, and why: a different street, and a new deal only where no street can be true.** The remark's fact is "not home at ten"; the solver reads that and never the street. So a different street changes the remark's words and nothing else: not the board, the lists, the accounts, the path or par. A different passer-by, or walking this one over from the other place the generator could have used, changes somebody's evening, the puzzle itself; and the remark without "on my way to" says less and is still a sighting that needs the two walks to meet. The cost is the link the Medium 14 tester called the night's click ("Second Avenue rang a bell, because it was where Hauck lived"): it's said only where the remark names the scene's street. Walking the passer-by over from the other place would keep the scene's street on 5 more Medium nights of 160 (Medium 14 one of them) and change their evenings; that's the designer's call, and not built.

**Measured** (`scratchpad/pf/remarks.mts`, `meet.mts`; seeds 1–40, every tier and type, both worlds; only Medium has a side remark, so 160 remarks):

| | main | this branch |
|---|---|---|
| remarks whose street isn't on the passer-by's walk (a block either side) | **72 of 160** (dealt 48, neighbourhood 24) | **0 of 160** |
| remarks off the ground both walks cover | 76 | 0 |
| remarks naming the scene's own street | 160 (88 of them true) | 93 |
| Medium boards whose only change is the remark's street | — | 65 of 160 (dealt 43, neighbourhood 22) |
| Medium boards dealt again (the walks never meet) | — | 11 of 160 (dealt murders 1, 6, 9, 12, 25, 31, 39; neighbourhood murders 8, 13, 15, 40) |
| boards at every other tier | — | dealt the same, 1,040 of 1,040 |

The eleven are all murders where the culprit goes from home to the scene and home again and the passer-by walks somewhere else entirely; the next attempt for each deals a board whose walks meet. The game side reads the remark's own street through one helper (`streets.ts` `remarkStreet`): the bones' REMARK proposition (`bones/extract.ts`, which said the scene's street whatever the remark said), the plain reader's streets (`bones/plain.ts`), the star's reason (§5), and the measures and the reference pass that count a street as a name (`plan/measure.ts`, `plan/refer.ts`, `scripts/board-prose.ts`: a remark's street was always a place's before, so its words counted as names; without that the clue lint read "on east fourth" as the remark's wording said three times). The thought's street link ("Second Avenue was where Hauck lived") still fires only on the scene's street.

Medium 14 now reads "Passed Thorndike on Broome Street at ten, on my way to the chop house. Going fast, no hat." (Thorndike comes down from the Hauck flat to the chop house, where he's seen at eleven; Pickering walks up from Catherine Street.) §7 has the night.

## 2. The refuser night's shortcut (`knowledge.ts` `breakersOf`)

**Before:** an innocent who refuses is cleared by the keeper's list at the place they really were (docs/41 rule 9), and that list breaks their story too. Once it was held, the solver's break rested on it, so the collision's own line (`breakersOf`, which the picker's ready pair, the thought, the oracle's put and the readers read) switched to it: the line that clears them. The last-liar reader citing it solved 50% at Soft-boiled and 48% at Medium (20 seeds; docs/61 had 42% and 44% at 50).

**Option (a), built:** a collision keeps the line that first broke the story. `breakersOf` asks the held questions in the order they were asked and takes what the break rested on when it first broke (`firstBreak`); a line held later that breaks it too doesn't take its place. Every caller, read through:

- **the thought** (`thought.ts`, "a lie caught") says a collision on the page it first breaks, so its line was the first break already: no change;
- **the picker's ready pair** (Raw and Coddled only, which have no innocent liar): stays on the first line, which still lands;
- **the oracle's put** (`oracle.ts` `step`): the first line, which lands (judged as before), so the oracle still solves every night at par;
- **the report's score** (`heldBreakers`): the collision's lines and every line that lands, as before, so nothing scores differently;
- **the stars**: a put's star (Raw and Coddled) reads the solver's own break, not `breakersOf`;
- **the turn** reads only who has a collision to decide when it comes;
- **the notebook's "How it adds up"** (and the turn's recap, the same clauses, `pages.ts` `recapClauses`) said who "said otherwise" from the solver's own break, not `breakersOf`, so on a refuser's night it named the keeper who clears them ("Coffin had told me he was at the Blue Lantern at ten, and Pickering said otherwise."): a careless player's shortcut the readers don't model. It now says whoever broke the story first, as the collision keeps it ("…, and Cheatham said otherwise."). One line in `pages.ts`;
- **the grid's** "Where they clash" lists every line held at that hour about them, in the order held, as before: the first that broke it comes first.

**Option (b), tried:** the generator's share of nights on which the innocent liar's story is met first (docs/41 rule 9, `INNOCENT_LEADS`), 0.6 → 0.4, so the culprit's story is no longer the one met last on most nights. Measured the same way (`board-measure --seeds 20`, a scratch tree):

| tier | main: the last liar, citing what caught the other | (a) | (b) | main: innocent's story first on the path | (a) | (b) |
|---|---|---|---|---|---|---|
| Poached | 3% | 3% | 2% | 65% | 65% | 50% |
| Soft-boiled | **50%** | **0%** | 40% | 78% | 78% | 63% |
| Medium | **48%** | **8%** | 40% | 75% | 75% | 63% |
| Hard-boiled | 0% | 0% | 0% | 60% (28%) | 60% (28%) | 43% (35%) |

(a) moved no other column of board-measure, at any tier: the oracle, par, the shortcut, the confession route, the wanderer, the reader, the other readers and whose story breaks first are main's, line for line. (b) can't get under 15%: with two liars caught, the first and the last between them name the culprit every night, so lowering the share only moves the shortcut from the last liar to the first; it re-deals every night from Poached up and moves the innocent-first column and the wanderer by a few points. **(a) is built; (b) isn't.**

**What's left (8% at Medium):** three Medium murders (2, 5 and 13) where the reader asks the refuser's evening before anything has broken it and the keeper's list is the first thing that does. There the line that broke the story is the line that clears them, and no rule about which line the collision keeps can tell them apart; the reader is right about the other liar for the right reason, and only the name was its shortcut. (Before: 39 of the 80 Soft-boiled and Medium nights, every one a refuser's; after: those three.)

## 3. Hard-boiled: the player puts the name to the face (`knowledge.ts` `faceUnmatched`, `grid.ts`)

**Before** (round 6, Hard-boiled 8 murder): Reinhardt's list says only "somebody in a camel coat" was at the Odessa at ten. Renfro and Abramowitz both say the Odessa at ten, and Abramowitz walked in "in a camel coat". Once Renfro's evening was held the grid marked his ten "Odessa"✗ and left Abramowitz's alone: the camel-coat deduction, the night's best moment ("I found it, not the game"), done for the player.

**The rule:** a claim that breaks only once the solver matches a face to a name (it breaks with the `face` technique and not without it) isn't shown as a clash until the player has shown the match: a mark (`mark`) that puts the face's owner there then ("Abramowitz ten at the Odessa", as the tester did), or one that has the claimant not there; or the line, read to the claimant, landing. Until then the grid's cell shows only what they said, and the clash isn't in "Where they clash", in the turn's trigger, in the confront picker's claims or in what the readers count as caught (`collisionsOf`, which leaves it out unless `all`: the oracle's own put and the report's score read what's held, so the report counts the line as before).

- **Lower tiers keep everything:** no list carries a face below Hard-boiled (faces are its seasoning, docs/41 rule 10), so nothing is held back there, and docs/46's "Raw walks, Coddled to Medium link" is untouched.
- **How often** (`scratchpad/pf/faces.mts`, 20 seeds a type, at the end of each route): on the oracle's route, every one of the 14 face nights holds one clash that rests on the face, the culprit's; on the 26 pair nights every clash does (52 of 52), because the friend is placed at the bar by their face and the pair's shared story breaks with them. The reader ends with 17 such clashes (all on pair nights, none the culprit's), the wanderer with 7.
- **Measured** (board-measure, §6): the oracle still solves every night at par, since its puts and the report's score read what's held. The wanderer, which files whoever it caught lying, files the right name less often on the lost pet (30% → 20%; the murder 25% both); the reader is 0% either way.

## 4. A star never picks out one of several suspects the evidence treats the same (`stars.ts` `sameStanding`)

**Before** (round 6, Raw 11): after Mrs. Kowalski's list (Steinbach and Bellucci both at Kowalski's at eight and nine, both gone by ten) the star read "Mrs. Kowalski saw Bellucci at Kowalski’s at eight — ask Bellucci where he was", on five pages. Bellucci is the culprit, and the tester called it a tell. The cheapest way on runs through the culprit's evening, because theirs is the story that has to break, so a star on one of two suspects the evidence treats the same named the culprit far more often than chance.

**Measured** (`scratchpad/pf/ties.mts`, 20 seeds a tier and type, the reader's and the oracle's routes, every page; a starred suspect's evening counted once a night). A **tie** is a star on a suspect's evening while another suspect has the same standing in what's held (below), isn't named in the star, has an evening not yet held and is pointed at by something held:

| tier | suspects' evenings starred: main → branch | of them the culprit | ties: main → branch | the tie's star names the culprit | by chance |
|---|---|---|---|---|---|
| Raw | 60 → 135 | 100% → 44% | 52 → 2 | 100% → 1 of 2 | 44% → 50% |
| Coddled | 64 → 117 | 94% → 51% | 51 → 3 | 94% → 0 of 3 | 49% → 50% |
| Poached | 121 → 136 | 50% → 44% | 61 → 10 | 52% → 4 of 10 | 41% → 50% |
| Soft-boiled | 85 → 95 | 47% → 42% | 40 → 20 | 40% → 12 of 20 | 43% → 50% |
| Medium | 138 → 143 | 29% → 28% | 23 → 14 | 22% → 2 of 14 | 44% → 50% |
| Hard-boiled | 0 | — | 0 | — | — |

**A leak at Raw and Coddled** (every tie named the culprit, against 44–49% by chance) and a smaller one at Poached (52% against 41%); none at Soft-boiled or Medium, where the innocent liar's evening is on the cheapest way too.

**The rule:** what's held says the same of two suspects when the grid gives them the same means (yes, no, or not known), the same place (or none) at each hour it could have been and the same lines said of them then, clears both or neither, and has neither out on the street at an hour that mattered (the passer-by's own reason, `movedAt`). Then:

- **Raw and Coddled**, which star every step they offer, star them all: "Bellucci and Steinbach could have had the spare key, and nobody had said where either of them was at ten — ask them where they were", and in the room a star on each evening.
- **Poached up**, one star a page, put it on the first of them by name, whoever the cheapest way runs through, and say all their names where the reason is the one in §5. The ties left are those, and they name the culprit at chance.

## 5. A star's reason is the hour that matters (`stars.ts` `starReason`)

**Before** (round 6, Medium 14): "Thorndike says Alfano was with him at the Hauck flat at eight — ask Alfano where she was", when the hour is ten (the tester: "the last guest you haven't heard from at ten"). A star's reason was the latest pointer, at whatever hour it named first.

**The rule**, for a suspect's evening: where the grid has them able to get the means and nothing held says anything of them at the hours it could have been, the reason says so, of everybody with the same standing (§4): "Alfano was at the meeting, and nobody had said where she was at ten". Else the latest held answer that says something of them at one of those hours, said from that answer: "Pickering passed Thorndike on Broome Street at ten", "Ellery saw Marchetti at the chop house at ten". Else the latest pointer, as before. Still never what the answer will show, who's cleared or who's left (docs/46 §1; the reason test's words stay banned).

**The stray capital:** "Kowalski’s — The spare key is in the sugar tin there — ask the landlady who was there": the reason follows the choice it sits on, after a dash in the CLI and as an aside in the book, so it keeps its pointer's own capitals and adds none ("Kowalski’s — the spare key is in the sugar tin there — …"). Every other reason opens on a name.

## 6. The gates, main → this branch

**`board-measure --seeds 20`** (as docs/62 ran it), main `ffc35e7` → this branch, by tier, every case type together:

| tier | oracle solved, with the lines | wanderer who right | wanderer solved | wanderer, citing | refusal shortcut under par | reader solved | first liar | anybody with access | a liar at random | last liar | **last liar, citing what caught the other** | innocent's story first (same step) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Raw | 100% | 60% → 55% | 8% → 5% | 32% → 23% | 8 | 100% | 100% | 100% | 100% | 100% | 100% | — |
| Coddled | 100% | 48% → 45% | 7% → 5% | 17% → 13% | 11 | 100% | 100% | 100% | 100% | 100% | 100% | — |
| Poached | 100% | 42% → 40% | 0% | 0% | 0 | 0% | 0% | 2% → 0% | 2% → 0% | 3% → 2% | 3% → 2% | 65% (0%) |
| Soft-boiled | 100% | 33% → 40% | 0% | 0% | 0 | 0% | 0% | 0% | 0% | 0% | **50% → 0%** | 78% (0%) |
| Medium | 100% | 33% → 38% | 0% | 0% | 0 | 0% | 0% | 0% | 0% | 0% | **48% → 8%** | 75% → 73% (0%) |
| Hard-boiled | 100% | 28% → 23% | 0% | 0% | 0 | 0% | 0% | 0% | 0% | 0% | 0% | 60% (28%) |

- **The puzzle columns didn't move:** the oracle solves every night at par, par's median and range are main's in every row, the refusal shortcut's and the confession route's counts are main's, and lint issues and plain-terms hits are 0 in every row. The Medium murders dealt again (§1: four of the twenty seeds here) move that row's "shortcut names nobody" 18 → 17, its innocent-first share 85% → 80% and its callback pages 6% → 8%.
- **The other liar** is the column that moved: Soft-boiled 50% → 0%, Medium 48% → 8% (§2).
- **The wanderer** moved in both directions by noise: starred places sort first among a page's choices, so where a star moves (§4, §5) the wanderer's random pick lands elsewhere; at Hard-boiled it also sees fewer clashes (§3: lost pet 30% → 20%, murder 25% both).
- **The reader** follows the stars: Poached's lost pet 5% → 0% in the three shortcut columns, from one night.

**Dealt boards** (`scratchpad/c3/dealhash.mts`, as docs/62 §2: seeds 1–40, every tier and type, both worlds): dealt 600 `b906a1009c23fe86` → `7b413655bf181abb`, neighbourhood 600 `af89ea961f7168e1` → `1c2bed28c49370c6`. Exactly why (`scratchpad/pf/dealdiff.mts`, board by board): only Medium boards differ, 65 of 160 by the remark's street alone and 11 dealt again (§1); every Raw, Coddled, Poached, Soft-boiled and Hard-boiled board is main's, and so are the other 84 Medium boards. Nothing else in `src/gen/` changed (the map moved there, unchanged).

**The prose and the round trip** (30 nights a tier, both worlds; docs/62 §2's runs):

- **board-prose:** every lint 0 at every tier in both worlds, on main and here (the clue lint read 2 on the first run here, the remark's street as wording; it's a name now, §1). Words a page (median) are main's but for Hard-boiled (dealt 100 → 97, neighbourhood 114 → 110: pair nights have no clash shown and so no turn, §3), the neighbourhood's Raw 124 → 126 and Medium 117 → 115, and Soft-boiled 125 → 124. List smell moves by a page or two a tier, both ways (dealt Raw 18 → 17, Medium 28 → 27 of 441; the neighbourhood's Raw 11 → 13, Soft-boiled 49 → 51). The restated-pointer measure is 2 at dealt Medium (1 on main; the neighbourhood's 2 and 2). Pronoun ambiguity 0, reader lint, correspondence, levels and plain terms 0.
- **The hinge lints** (`hinge-lint.ts`, docs/62's 19 rules, three routes): 0 on every rule, tier and world, as on main.
- **Round trip and clarity** (`scripts/roundtrip.ts --nights 30 --routes oracle,wanderer,reader`): every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% on every tier in both worlds. The flesh column's misses are Miss Nowak naming Mrs. Rafferty, as before (the neighbourhood's Poached 5 units, Medium 4). `scripts/clarity-measure.ts --nights 30`: every column 0.
- **The suite:** 818 tests, 31 files, all passing (`npx vitest run --minWorkers=1 --maxWorkers=3`); `tsc` is clean.

## 7. The nights, read

Read in full, page by page, in `npm run read` with `--curtain`, on main's copy and on this branch's last commit (`scratchpad/pf/out/read-*`). Each item, main → this branch.

**Medium 14** (the dachshund; round 6's tester's route, and the oracle's). The puzzle is the same night: the board, the lists, the accounts, the path, par 13.

- *Pickering's evening*, page 8: "Ten, on my way to the chop house, I passed Thorndike on Second Avenue: going fast, no hat. / Second Avenue rang a bell, because it was where Hauck lived, and where Fritz went missing." → "Ten, on my way to the chop house, I passed Thorndike on Broome Street: going fast, no hat." The page goes on to its hand-off ("Alfano hadn’t told me her evening yet, and I’d find her at Sokol’s back room."). On the oracle's route the thought after it, "…nine; Second Avenue was where Hauck lived, the street Fritz went missing from, and that was what mattered." → "…nine. That much checked out. Pickering was the only one who had said where she was at ten, when it could have happened."
- *Thorndike's page and the put*: "he said he was home at ten, but Pickering passed him on Broome Street at ten"; "Pickering passed you on Broome Street at ten." The verdict and the curtain quote the remark with the same street.
- *The stars* (§5): "Alfano was at Hauck’s at eight — ask Alfano where she was" and "Thorndike says Alfano was with him at the Hauck flat at eight — ask Alfano where she was" (four pages) → "Alfano was at the meeting, and nobody had said where she was at ten — ask Alfano where she was"; "Pickering says Thorndike was with her at the chop house at eleven — ask Thorndike where he was" and "Alfano says Thorndike was with her at the Hauck flat at eight — …" → "Pickering passed Thorndike on Broome Street at ten — ask Thorndike where he was".

**Soft-boiled 3** (a murder; a refuser's night, along the last-liar reader's own route, and the oracle's). Every page is main's, word for word. The notebook's "How it adds up": "Coffin had told me he was at the Blue Lantern at ten, and Pickering said otherwise." → "…, and Cheatham said otherwise." (Cheatham's ten, "only Alfano and Feeney were at the Blue Lantern", broke Coffin's story; Pickering's, "Coffin was at the Eagle club office", clears him.) The grid's "Where they clash" lists both under "Coffin, ten", Cheatham's first, as on main. The reader names Salerno, the last liar it caught, and Coffin as the other: on main it cited Pickering's line, the collision's, and filed solved; here it cites Cheatham's, which breaks Coffin's story and doesn't clear it.

**Medium 12** (a canary; a refuser's night, along main's last-liar reader's route, and the oracle's).

- *The remark*: "I passed Grasso on Stuyvesant Street: going fast, no hat. / Stuyvesant Street rang a bell, because it was where Quill lived, and where Caruso went missing." → "I passed Grasso on Chrystie Street: going fast, no hat." (Havemeyer walks from Kowalski's on Orchard Street to the chop house on Grand; Grasso from the Quill flat to the chop house, where he's seen at eleven.)
- *The stars* (§4, §5), Mrs. Brauer's page: "Quill points at Moretti — ask Moretti where he was", with the hand-off "Moretti’s evening was still a blank in my notebook, and I’d find him at the chop house." → "Coffin, Grasso and Moretti were at the meeting, and nobody had said where any of them was at ten — ask Coffin where she was", and "That pointed me at Coffin, and I’d find her at the chop house." (Brauer has just said Coffin looked in at nine.) At the chop house the star sits on Coffin's evening, not Moretti's. Grasso's: "Havemeyer says Grasso was with him at the chop house at eleven" → "Havemeyer passed Grasso on Chrystie Street at ten".
- *The notebook*: "Moretti had told me he was at the chop house at ten, and Weisglass said otherwise." → "…, and Feeney said otherwise." (Feeney's ten broke Moretti's story; Weisglass, who came on at ten, clears him.)

**Hard-boiled 8** (a murder; round 6's tester's route). Renfro's evening, page 13: "He said he was at the Odessa at ten, when Carbone could have been given the chloral." → "…, and nobody had backed that up yet." "Confront Renfro" is gone from the page's choices. The grid: Renfro's ten "Odessa"✗ → "Odessa", and "Renfro, ten:" is gone from "Where they clash"; Grasso's clash, against the landlady's list, is as it was. With the tester's own mark ("Abramowitz ten at the Odessa") the ✗, the clash and the confront come back (`scratchpad/pf/hb8.mts`).

**Raw 11** (the gold watch; round 6's tester's route). The office and Kowalski's: "Kowalski’s  [The spare key is in the sugar tin there — ask the landlady who was there]" → "[the spare key is in the sugar tin there — …]". After Mrs. Kowalski's list, on the walk to Moe's and in the room: "Mrs. Kowalski saw Bellucci at Kowalski’s at eight — ask Bellucci where he was" → "Bellucci and Steinbach could have had the spare key, and nobody had said where either of them was at ten — ask them where they were", and in Moe's a star on each evening. After Alfano's list (Steinbach came in at ten), "Bellucci could have had the spare key, and nobody had said where he was at ten — ask Bellucci where he was": by then the evidence doesn't treat them the same.

## 8. Tests

**818** (main's 808, and 10 new), all passing at three workers; `tsc` is clean. New, `test/puzzle-fixes.test.ts` (10): every side remark's street runs through the passer-by's walk and is the generator's crossing street, seeds 1–12, both worlds, the scene's own on more than 40%; Medium 14's remark, word for word; the walk reads the generator's map; the last-liar reader citing the collision's line solves under 15% at Soft-boiled and Medium; Hard-boiled 8's Renfro is no clash on the grid, in `collisionsOf` or on the picker until the camel coat is marked on Abramowitz (or Renfro marked out of the Odessa), comes back with the mark, still lands when put, and Grasso's clash shows as before; nothing held back below Hard-boiled; Raw 11's walk star names Bellucci and Steinbach and Moe's stars both evenings; Medium 14's Alfano star; the reason's own capitals. Updated: `round5.test.ts` U9 (the picker for Renfro, with the tester's mark), `bones.test.ts` (the golden's page 8: "passed Corrigan on East Fourth Street", and no street link), `board-connective.test.ts` (the street's lead and link, on Medium 17, whose remark names the scene's street).

## 9. What's open

- **The scene's street, said less often** (§1): 93 of 160 Medium remarks name it, where every remark did (72 of them untruly). On the others, Medium 14 among them, the "rang a bell" link goes with it. Walking the passer-by over from the generator's other place keeps it on 5 more nights and changes their evenings; or the remark could say the culprit was "coming from Second Avenue way". The designer's call.
- **The refuser's last 8% at Medium** (§2): three murders where the keeper's list is the first thing that breaks the refuser's story, so it's the clash's line and what clears them both. Not a rule about lines; the generator could keep the refuser's claimed room watched at the lied hour so another list always breaks it first.
- **Hard-boiled's mark** (§3): the face's clash shows once the player marks the match, which the CLI's help and the book's pencil offer but nothing teaches. On pair nights every clash rests on the friend's face, so a player who never marks sees no clash, no turn and no confront all night (the report still counts the line). Whether the teach page or Hard-boiled's star note should say "mark who you think a face is", and whether the pair should keep one clash that needs no face, is the designer's call.
- **Pointers in the prose still cite the first hour** (§5, the prose build's): the arrival's "Pickering had said she was with him at eleven." on Thorndike's doorstep (Medium 14, flagged by round 6), and the fastest solve's steps in the curtain ("Alfano was at Hauck’s at eight (Hauck said so)", the generator's `reasonFor`). The star now says the hour that matters; the page and the curtain could take the same rule (`thread.ts`, `pointers.ts`).
- **Raw and Coddled's star-follower asks every tied evening**: the reader still solves every Raw and Coddled night; the culprit is now 44% and 51% of the evenings starred there, where it was 100% and 94%. Raw still walks the elimination to the name once the tie is broken by what's held (docs/46), and Coddled still has its put star and "I could face X with it".
- **The wanderer's columns moved by noise** (§6): starred places sort first among the choices, so a star that moves reorders what the wanderer picks from at random. Its who-right moved −15 to +10 points a row at 20 seeds, both ways.
