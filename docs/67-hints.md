# Hints

*2026-10-25, branch `hints`, off main at `04b40d7` (clarity-4, #104). Round 7's blind testers (`scratchpad/round7-digest.md`, designer items 1 and 2) said the stars do the deducing: Raw finishes it for you ("That left one person…", then "I could face Winslow with it"), and Poached feels like rails ("every step was starred"). The designer decided (`scratchpad/hints-spec.md`): no stars on the page; a Hint button instead, unlimited at Raw, three at Coddled, one at Poached, none from Soft-boiled up; hints cost nothing but show on the verdict; a perfect report earns a star, a perfect one with no hints a gold star; "How this works" explains it. This build is that, game side only: the generator, the boards, par and the paths didn't change, and the dealt boards hash as main's.*

## The decisions (the spec's)

| Tier | Hints a night | Before: stars by themselves (docs/46 §1) |
|---|---|---|
| Raw | unlimited | every open step of every cheapest way |
| Coddled | 3 | the open steps of one cheapest way |
| Poached | 1 | one star, the nearest open step |
| Soft-boiled | none (no button) | one star, the nearest open step |
| Medium | none | walks, and the question in the room |
| Hard-boiled | none | the scene, on page one |

- **No star appears by itself** at any tier. **A hint gives one step**, starred with its reason as a star read before ("Coffin has Ashby here at eleven — ask Ashby"): the nearest open step of a cheapest way on, by docs/46's Poached rule (in this room first, then the commonest across the cheapest ways, then path order), **confronts included**. Among suspects the held evidence treats the same (docs/65 §4, `sameStanding`) it goes to the first by name.
- **It stays given** until the step is taken or is no longer on a cheapest way; a player never pays twice for a step. **Pressing again** gives the next step (at Coddled, for another hint). With nothing left to find, it says **"You have what you need to close the case."**, and at Raw the elimination the walk thought used to say. Out of reach of a cheapest way, it gives the designed path's next open step. **On the report page**, what's still missing, or that the report can be filled from what you have.
- **A hint costs no action and no points**; the count is the cost.
- **Off the pages, at every tier:** the hand-off, the turn's what-next ("I could put it to X now", "I could face X with it", "Before I did anything about it…", Medium's "…to get over to Sokol’s back room"), Raw's walk thought (`thoughtLevel`: Raw is `link` now) and Hard-boiled's page-one star note (its mark line, `FACE_MARK`, stays). **Kept:** the curtain's fastest solve and its star reasons, and the link tiers' "So…" lines. The level lint holds every tier to it.
- **The verdict:** a star for a perfect report (outcome `solved`), a gold star for a perfect one with no hint taken (every perfect report from Soft-boiled up), and the hints beside the actions ("11 actions, 2 hints."). **The profile** counts stars and gold stars per tier; **the title page's tier list** shows each tier's best. The page's choice mark stays `*`; the verdict's star is ★, the gold star ★ in gold, both with words for a screen reader.
- **"How this works"** gets "Stuck? The Hint button shows you a good next step and why. You get fewer as the cases get harder."; **the night's first page** says tonight's count ("Hints are unlimited tonight.", "You have three hints tonight.", "You have one hint tonight.", "No hints from here on."); **the button** carries its count ("Hint", "Hint (2 left)") and greys out at none; **the help** says "The Hint button stars a choice worth taking now and says why. A perfect report earns a star; a perfect one with no hints, a gold star."
- **The CLI** has `hint`; **the save** records it; **the blind-playtest prompt** gets a line.
- **The measures:** the reader becomes the hint-taker; the oracle and the wanderer take no hints and don't move.

## 1. What was built, and where

### 1.1 The hint (`hints.ts`, `stars.ts`, `engine.ts`, `model.ts`)

- **A command, `hint`**, beside `recap` and `file` (`engine.ts` `stepBoard`, `hints.ts` `takeHint`). It writes no page and costs no action; the run keeps it (`BoardRun.hints`: the page it was asked on, and the step it starred or null for "you have what you need"). The book keeps it in its command list and the CLI's save as `{ "do": "hint" }`, so a replay gives the same hints and the verdict counts them. A tier without hints refuses it ("There are no hints at Soft-boiled."); so does a spent count ("No hints left tonight.").
- **Which step** (`stars.ts` `hintStep`): the nearest open step of a cheapest way on (`completions`), in this room first, then the commonest across the cheapest ways, then path order; confronts included (in practice the cheapest ways run through a confront only where the report needs what it brings back). A suspect's evening goes to the first by name of those the held evidence treats the same (`sameStanding`). Out of reach of a cheapest way (nothing within `MAX_REST` finishes the report, or none of its steps can be starred from here), the designed path's next open step, then the murder's papers.
- **The reveal** (`stars.ts` `starredSteps`): the hinted steps that still stand, in the order they were given: not taken, still open, and on a cheapest way (or tied, docs/65 §4, with a suspect's evening on one: the first-by-name evening stands for the evening the cheapest way needs). Out of reach of a cheapest way, a hinted step stands while it's open; none once the report is ready. `choices.ts` `pageStars` and everything after it (the book's starred buttons, the CLI's `*`, the reasons) read these, so a star looks as it always did.
- **What a press says** (`HintSaid`, chrome, docs/64): a step, "Hint: Coffin has Ashby at the Thalia at eleven — ask Ashby where she was." (the star's own reason, as the choice it sits on says it); ready, "You have what you need to close the case."; on the report page, "Still missing: …" or "You can fill in the report from what you have."; a press that gives nothing new, "The starred choice is still your best next step." At Raw each of them carries the elimination when it holds (`rawWalk`, §1.2).
- **The count** (`HINTS_A_NIGHT`, `hintsLeft`): only a press that gives something new is counted; the same step again, or the ready line again, is free and not recorded.

### 1.2 What came off the pages (`pages.ts`, `engine.ts`, `model.ts`, `text.ts`)

- **The hand-off** (`handOff`, its five call sites, and `walkKnown`, which only it and the turn used): gone at every tier. The sheets keep their `handoff` beat, never filled. A page now ends on its thought, its close or its scene; where the hand-off used to carry the next page's reason, that page says it (the way in's "Salerno had said she was at Mrs. Nagy’s at nine.", §4).
- **The turn's what-next** (`writeTurn`): "I could face X with it, or …, or close the case on what I had." (Raw, Coddled), "Before I did anything about it, I wanted to …" (Poached up), with the walk it hung on: gone. The turn is the chapter, the notebook read back and its close.
- **"Review my notes"** no longer reads the stars out after the notes ("Three things would move it. …", `engine.ts` `starsLine`): a star said aloud.
- **Raw's walk** (`model.ts` `thoughtLevel`: Raw is `link`): no tier deals the `walk` level now, so Raw's thoughts stop at the link like Coddled's, its turn reads the notebook back, and its report page draws the neutral `report-why` cards. The elimination (`thought.ts` `eliminationOf`, unchanged) and "That left Feeney, and the clock still open between ten and eleven." are the hint's (`hints.ts` `rawWalk`), said only when asked.
- **Hard-boiled's page-one note** (`text.ts` `starsNote`, "At Hard-boiled this is the only star you get…"): gone; the first page's note is `hints.ts` `hintsNote`, which at Hard-boiled is the mark line alone.
- **The key** (`text.ts` `ACTION_KEY`) drops "A star marks a good next step."
- **The level lint** (`lint.ts` `levelIssues`) needed no change: it held every tier above `walk`, and Raw is above it now.
- **Two lines the hand-offs had been covering, fixed by rule.** A list page whose reason is somebody's claim the list goes on to break no longer says the claim as its reason and then again in the collision (`pages.ts` `whyHere`, `breaksHere`; before, the hand-off carried the reason and the page didn't say it; not at Hard-boiled, whose thought says a collision only when both lines are on the page). And three prop pay-offs that opened a sentence on "He" or "She" for a thing (the cardboard cowboy, the china shepherdess, the King on the cookie tin, `content/board/places.json`) say it in one sentence now ("I passed the cardboard cowboy, who had the look of a man who solves everything in the last reel."): only a hand-off naming somebody of that sex on the page had kept the pronoun check quiet.

### 1.3 The verdict and the profile (`report.ts`, `profile.ts`, `ui/report.ts`)

- `scoreBoard` adds `hints`, `star` (`'gold' | 'star' | null`: a star for outcome `solved`, gold with no hint taken) and `tally` ("11 actions, 2 hints.", "11 actions, no hints."; at a tier without hints "11 actions."). The book shows the tally under the score and the star under it: ★ in the accent with "Star: a perfect report.", ★ in amber (the book's `--amber`) with "Gold star: a perfect report, with no hints." The words are the screen reader's as well as the eye's. The CLI's verdict prints the same two lines.
- `profile.ts`: `golds` per tier, kept on a perfect report with no hints (`RunResult.hints`), sanitized to cleared tiers and never more than the tier's clears. A star is a perfect report, which is what the profile already counted as a clear, so `starsAt` is `clearsAt`; `bestAt` is a tier's best (gold, star or nothing).

### 1.4 Explaining it (`teach.ts`, `hints.ts`)

The teach page's eighth line and the help's star line, the spec's words exactly; the first page's count (`hintsNote`), in chrome, where the star note sat. The CLI says "The `hint` command" where the book says "The Hint button".

### 1.5 The book (`board-book.ts`, `board.css`)

- **The button** sits with the free choices ("Review my notes", "Close the case", "Hint"): "Hint" at Raw, "Hint (2 left)", "Hint (none left)" disabled and faded. A dotted border, so it isn't taken for a step. What it said goes under the row (a `role="status"` note, names with their hover cards); the ready line stays there on every page after it's given, and a step's line on the page it was taken.
- **On the report page** the button and its note sit under "Leave anything blank if you’re not sure."
- **The title page's tier list** (the picker under "Choose a case"): each open tier's best, a ★ after its name, amber for gold, with ", gold star" or ", star" for a screen reader.

### 1.6 The CLI, the save and `npm run read` (`play-lib.ts`, `read.ts`)

- `hint` prints what the hint said, the starred choice as `look` lists it (its number is the one `do` takes), and the hints left. `look` says tonight's count on the first page ("Hints are unlimited tonight. `hint` stars a good next step and says why.") and after that under the choices ("Hints: 2 left (`hint`).", "Hints: none left."); the report form says it too. The help lists `hint`.
- `npm run read -- --hints every` (or `--hints N`) takes a hint before every step of the route (or the first N), prints what each said, and stars the choices; `--reader` reads the hint-taker's own night.

### 1.7 Choices beyond the spec

1. **A hint is a command in the run**, not a page: it writes nothing, so a page reads the same whether or not a hint was taken (the prose of Raw 23 with a hint on every page and with none is word for word the same, §4).
2. **A press that gives nothing new is free and isn't recorded**, so "never pays twice" holds for the ready line too.
3. **Pressing again never stars a step whose star would sit on a choice already starred** (two steps behind one walk): every press that counts changes what's starred.
4. **A tie's hinted evening stands** as long as an evening it's tied with is on a cheapest way (docs/65 §4's first by name would otherwise drop off the cheapest ways at once, and be hinted again).
5. **Out of reach, the path and then the papers**, so a murder's hint still gives the motive search the report asks for.
6. **Raw's elimination rides on any Raw hint once it holds**, not only the ready one, and "That left Feeney…" with it: the spec moves both lines into the hint (§2), and §1 names the ready one; this says each when it's true, asked.
7. **Docs/46's thinned stars stay as `routeSteps`, never shown.** The way in orders its pointers by them (`placeThread`), so arrivals read as before; and the wanderer sees its choices in the order it always did (`boardChoices(d, run, true)`: starred walks used to sort first), so its seeded random picks, and every wanderer column, are main's. It picks uniformly, so the order is only which seed picks what.
8. **The recap's read-out of the stars** goes with the rest of §2's list: it was a star said aloud.
9. **The tally says "no hints"** at a tier that has them, and nothing about hints where there are none.
10. **The reader takes one more hint on the way to the report** when it has one left, since the report page's hint is part of what it's allowed.
11. **The button sits with the free choices**, and its words go under that row; on the report page, over the form. It isn't one of the engine's choices (`boardChoices`), so the measures' "choices a page" and the wanderer's options don't see it.
12. **The CLI says the count under every page's choices** on a tier with hints, and on the first page joins it to the note ("Hints are unlimited tonight. `hint` stars a good next step and says why."); the first page's note is the spec's words in the book.
13. **The verdict's stars use the book's two colours**: the accent for a star, the existing `--amber` for gold (the book has no gold of its own).
14. **Fixed on the way, by rule** (§1.2): a list's reason the thought says anyway, and three things called "he" or "she" in a prop's pay-off; and the voice kit no longer asks for the elimination's shape or the hand-off's slot (§6).

## 2. The measures, main → this branch

Main is `04b40d7` (an exported copy, `scratchpad/hints/main`), measured with its own scripts; this branch at its last commit. Every run held the shared lock, one at a time, three vitest workers at most (`scratchpad/hints/gates.sh`, outputs in `scratchpad/hints/out/`).

**board-measure** (`--seeds 20`, as docs/65 and docs/66 ran it), by tier, every case type together. **Every oracle and wanderer column is main's, in every row of both worlds**, and so are par, the refusal shortcut and the confession route, the innocent liar's first break, lint issues (0), plain-terms hits (0), choices a page and callback pages (`scratchpad/hints/cmpbm.py`, column by column). The reader's columns moved, and one is new:

| tier | reader solved, dealt | reader hints a night, dealt | reader solved, neighbourhood | reader hints a night, neighbourhood | the liar did it (first liar caught), dealt | anybody with access, dealt |
|---|---|---|---|---|---|---|
| Raw | 100% → 100% | 6.0 | 98% → 100% | 5.8 | 100% → 100% | 100% → 100% |
| Coddled | 100% → **2%** | 3.0 | 100% → **0%** | 3.0 | 100% → 57% | 100% → 32% |
| Poached | 0% → 0% | 1.0 | 0% → 0% | 1.0 | 0% → 0% | 0% → 0% |
| Soft-boiled | 0% → 0% | 0 | 0% → 0% | 0 | 0% | 0% |
| Medium | 0% → 0% | 0 | 0% → 0% | 0 | 0% | 0% |
| Hard-boiled | 0% → 0% | 0 | 0% → 0% | 0 | 0% | 0% |

- **The hint-taker at Raw** solves every night, near the oracle, on six hints a night: it follows each star to the ready line, whose elimination hands it the name (the neighbourhood's one Raw murder it missed on main, it solves).
- **At Coddled** it spends its three hints on the first pages (the scene, the papers or the tie at the party, the next list), then takes first choices; nothing hands it a name, and it files the form's first choices: 2% and 0%, from 100%. Before, Coddled's put star and "I could face X with it" handed it the name. A Coddled player who names the one liar they caught solves 57% (Coddled has one liar; it was 100% because the turn named him).
- **At Poached** its one hint is the scene's; it solved nothing before either (docs/46 took Poached's name away), and nothing now.
- **From Soft-boiled up** it takes no hints, so it is the first-choice player, by construction; it solved nothing on main either. The variants that filed a caught liar followed Soft-boiled's and Medium's old stars and lost the few nights they had (Poached's last liar 2% → 0%, Medium's citing 8% → 0%).

**Dealt boards** (`scratchpad/hints/dealhash.mts`, docs/62 §2's: seeds 1–40, every tier and type, both worlds): dealt 600 `7b413655bf181abb`, neighbourhood 600 `1c2bed28c49370c6`, main's. Nothing in `src/gen/` changed.

**board-prose** (30 nights a tier, both worlds; the oracle's route for the page measures, three routes for the lints):

| world | tier | words a page (median) | words per new fact | list smell, pages (oracle) | pronoun ambiguity (three routes) |
|---|---|---|---|---|---|
| dealt | Raw | 112 → 106 (−5.4%) | 68.3 → 64.0 | 23 of 280 → 31 of 280 | 0 → 0 |
| dealt | Coddled | 102 → 102 (0%) | 64.2 → 62.4 | 14 of 276 → 16 of 276 | 0 → 0 |
| dealt | Poached | 110 → 105 (−4.5%) | 57.8 → 56.0 | 17 of 398 → 30 of 398 | 0 → 0 |
| dealt | Soft-boiled | 111 → 106 (−4.5%) | 53.9 → 52.2 | 33 of 383 → 30 of 383 | 0 → 0 |
| dealt | Medium | 103 → 99 (−3.9%) | 50.2 → 48.1 | 39 of 441 → 36 of 441 | 0 → 0 |
| dealt | Hard-boiled | 97 → 97 (0%) | 46.1 → 46.1 | 20 of 435 → 20 of 435 | 0 → 0 |
| neighbourhood | Raw | 126 → 123 (−2.4%) | 71.9 → 67.9 | 5 of 280 → 23 of 280 | 0 → 0 |
| neighbourhood | Coddled | 115 → 113 (−1.7%) | 69.3 → 67.4 | 12 of 276 → 19 of 276 | 0 → 0 |
| neighbourhood | Poached | 115 → 114 (−0.9%) | 58.7 → 57.0 | 29 of 407 → 43 of 407 | 0 → 0 |
| neighbourhood | Soft-boiled | 122 → 117 (−4.1%) | 58.3 → 56.5 | 50 of 385 → 55 of 385 | 0 → 0 |
| neighbourhood | Medium | 115 → 111 (−3.5%) | 55.6 → 53.2 | 36 of 436 → 41 of 436 | 0 → 0 |
| neighbourhood | Hard-boiled | 104 → 104 (0%) | 50.9 → 50.9 | 29 of 435 → 29 of 435 | 0 → 0 |

- **Words a page fell a little**, as the brief expected, wherever a hand-off or a what-next went: the dealt world −4% to −5½% at Raw, Poached, Soft-boiled and Medium, the neighbourhood −1% to −4%; the dealt world’s Coddled held, and Hard-boiled, which had no stars after page one and so no hand-offs, measures as main’s. Words per new fact fell with them. Where a hand-off used to carry the next page's reason, that page or its way in says it now, and a close card is dealt where the hand-off sat, so some pages are longer (§4).
- **Every lint is 0** at every tier in both worlds, on main and here: the reader lint, correspondence, thoughts over their level, plain terms, cards and sentences twice, names three times, clues three times, place names bolted on, banned phrases, signposts, gags, a pet called "it", the grid, posture, knocking, engine words, repeats, hour slots, continuity, tics, assembly, the hinge lines, and pronoun ambiguity. Two came up on the way and were fixed by rule: a list page that said its reason ("Broadnax had said he was at the Delmonico rooms at ten, so I asked…") and then the collision in the same words (the `repeat` lint: where the list goes on to break that claim, the thought says it, `pages.ts` `breaksHere`); and three prop pay-offs that opened a sentence on "He" or "She" for a cardboard cowboy, a china shepherdess and a cookie-tin King, which only a hand-off naming somebody of that sex had covered ("I passed the cardboard cowboy, who had the look of a man who solves everything in the last reel.", `content/board/places.json`).
- **Why-here or walk** stays 100% and **job pages with a thought naming an earlier fact** 100%; **callbacks** are main's.

**The hinge lints and the level lint** (`scratchpad/hints/hinge.mts`: docs/62's and docs/66's 32 rules and `levelIssues`, 30 nights a tier, both worlds, the oracle's, the wanderer's and the hint-taker's routes): 0 on every rule at every tier, main and this branch. The level lint holds every tier to the link now, Raw included: 0.

**Round trip and clarity** (`scripts/roundtrip.ts --nights 30 --routes oracle,wanderer,reader`): every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% at every tier in both worlds. The flesh column's misses are main's, Miss Nowak naming Mrs. Rafferty (the neighbourhood's Poached 3 units, Medium 2; main's 5 and 4). `scripts/clarity-measure.ts --nights 30`: every column 0.

**The suite**: 856 tests in 32 files, all passing (`npx vitest run --minWorkers=1 --maxWorkers=3`; main's 836 in 31). `tsc` is clean; `npm run build` works.

## 3. The skim test

One round (`scripts/skim-test.ts`, docs/62 §3), not a gate for this build: 24 job pages from nights no round read before (from seed 11000), each as main writes it and as this branch writes it, three questions each, two blind readers (sub-agents given only their packet), each page once, half in each build, crossed (`scratchpad/hints/skim1/`). 11 of the 24 pages differ between the builds: a hand-off or the turn's what-next gone, a close dealt where the hand-off sat, or a way in that says its own reason.

| build | questions right | sentences flagged |
|---|---|---|
| main | 69 of 72 (96%) | 17 |
| this branch | 69 of 72 (96%) | 15 |

The gate the clarity builds used (accuracy at least main's, flags halved) would fail on flags: −12%, not −50%. The six misses are the same in both builds: Hard-boiled's turn, which by design says no story breaks and no way in. Four of main's flags were on lines this branch takes off: three hand-offs ("The steward at the Eagle club office would have seen everybody who came in.", "The cashier at the Odessa…", "The bookmaker at Sokol’s had been there all night, and would know who came in.": a place nobody had brought up, a reader said, and not how it followed) and a turn's what-next ("Renfro said Obermann was at Kowalski’s at nine and at the Kit Kat at ten, so he had walked over."). None of this branch's flags is on a line main doesn't have: what both builds' readers stopped on is the round-7 digest's list (the turn restating a claim as if it clashed, "So … had seen the same" with nothing before it, "all" for two, the spiritualist's three names, "she" for the dead woman after another woman's name, the turn's settled hour).

## 4. The nights, read

Read in full, page by page, with `npm run read` on main's copy (`04b40d7`) and on this branch (`scratchpad/hints/reads/`): round 7's Raw 23 (the Persian cat) with a hint on every page (`--hints every`: seven hints and one press that gave nothing new, free; the last on the turn page) and with none, and the hint-taker's own night (`--reader`); Coddled 11 (the cigarette case) with its three hints spent on the first three pages, and the hint-taker's; round 7's Poached 17 (murder) with its one hint on page one; round 7's Medium 21 (murder), which has no hints. No page ends on a dangling line where a hand-off was: each ends on its thought, its close, its scene or the notebook read back. A page's prose is the same with hints and without (Raw 23, word for word, both ways).

**Raw 23** (the oracle's route; 129 → 122 words a page).

- *The settling page*, the turn after Hargrove's list. Before: "At ten, Pickering saw Lindemann at the Shamrock. At ten, Ashby was at the Odessa, according to Hargrove. That left one person: somebody who had been at the supper and knew that the door was left unlocked, and who had nobody to back them up at ten. / I could face Winslow with it, or close the case on what I had. / Through the round window in the kitchen door I could see the cook on an upturned crate, eating the special. Which is a recommendation of sorts." After: "Mimi went at ten o’clock. Lindemann was at the Shamrock at ten; Pickering said so. Ashby was at the Odessa at ten. I had that from Hargrove. Winslow said he was at the Odessa at ten. Hargrove said otherwise. At eleven, somebody had brought something in under a coat at the Shamrock and given it to Pardo." The notebook read back, as Coddled's turn reads it; the player takes the last step. (The turn's close card isn't dealt here now: the turn ends on the notebook.)
- *The hint on that page*, asked: "You have what you need to close the case. At ten Lindemann was at the Shamrock, and Pickering said so. Ashby was at the Odessa, and Hargrove said so. That left one person who had been at the supper and knew that the door was left unlocked, with nobody to back up where they were at ten."
- *The report page*: "I could fill in all of it, and I could stand behind all of it." (the `report-why` card that said it was done) is gone.
- *The hand-off*, page 3: "Next was Ashby, at the Odessa. I didn’t have a word of her evening yet." → the page ends "Whoever it was had been at the supper at the Thorndike flat, one of his guests." Page 6: "The cashier at the Odessa had been there all night, and would know who came in." → "So Lindemann was still at the Shamrock at ten, when Mimi went, and by then Winslow had left." The Odessa's way in, no longer carried, says why: "Winslow had said he was at the Odessa at ten."
- *Hints on every page*: "Hint: start where it went missing." (the office); "Hint: Ashby, Lindemann and Winslow were at the supper, and nobody had said where any of them was at ten — ask Ashby where she was." then Lindemann, then Winslow (the tie, first by name each time); "Hint: Winslow says he was at the Shamrock at nine — ask Pickering who was there."; "…at the Odessa at ten — ask the cashier who was there."; on the Odessa's way in, free, "The starred choice is still your best next step."

**Coddled 11** (the oracle's route, hints on the first three pages; 114 → 112 words a page).

- *The turn*: "I could face Salerno with it, or find out first from the landlady at Mrs. Nagy’s who’d been in, or close the case on what I had." → gone; the turn ends "…Salerno said she was at the Thalia at ten. Vitale said otherwise. I still didn’t know where Ainsworth was at ten."
- *The hand-offs*: page 3's "Ainsworth was at Mrs. Nagy’s, and still hadn’t told me where he’d been tonight." → the page ends "Whoever it was had been at the fight party at the Wehrle flat, one of her guests."; page 5's "I wanted Vitale’s count of the night, everybody, hour by hour." → its close, "Somebody in the back row was asleep with a hat over the face, and had paid good money for it." Vitale's page opens on the asking ("I asked Vitale who’d been in tonight, and told her not to tidy it up for me."): its reason, Salerno's "the Thalia at ten", is the collision the thought says at the end (§1.2; a build read before that rule said it twice). Mrs. Nagy's way in says its own: "Salerno had said she was at Mrs. Nagy’s at nine." Mrs. Nagy's page, which ended on the hand-off's place, ends on its thought: "So Ainsworth was still at Mrs. Nagy’s at ten, when the cigarette case went, and by then Salerno had left."
- *The hints*: the scene, then the tie at the fight party twice ("…ask Ainsworth where he was", "…ask Salerno where she was"); then "Hint (none left)" and two stars standing until each is taken.

**Poached 17** (round 7's tester's night, the oracle's route, the hint on page one; 115 → 110 words a page).

- *The turn*: "Before I did anything about it, I wanted to find out from the landlady at Mrs. Nagy’s who’d been in." → gone; the turn ends "…Dandridge said he was at Moe’s at nine. Bidwell said otherwise. Nobody had told me yet where Callahan was at nine."
- *The hand-offs*: "I hadn’t been through the papers at Quill’s place yet, and papers go on talking after the one who kept them has stopped." → page 3 ends "The radiator knocked again. I didn’t answer it."; "The bartender at Moe’s sees every face that comes through the door. I wanted every one of those faces." → page 4 ends on its close; "The landlady at Mrs. Nagy’s would have seen everybody who came in." → page 10 ends "So she told it the same as Dandridge: Sokol’s back room at nine. That much of it stood up."
- *Sokol's back room*, page 7, says no why on the way in (lean says a person's pointer to their face, a page on: "Bidwell saw you at Moe’s at eight. I’d like the rest of your evening to go with it."); it ends on the room, "…and the look of somebody who would say he was only passing."
- *The one hint*: "Hint: start where he died." The tester's complaint was every step starred; now one star, asked for.

**Medium 21** (round 7's tester's night, the oracle's route; 115 → 111 words a page). No star on any page (choices printed: none starred). "There were papers at Mulcahy’s place, and they sometimes say why.", "The doorkeeper at the Blue Lantern sees every face…", "The landlady at Kowalski’s would have seen who came in tonight." and "Salerno hadn’t told me her evening yet, and I’d find her at home." are gone; the turn's "Before I did anything about it, I wanted to find out what Salerno had to say for herself." is gone, and the turn ends "…I still didn’t know where Salerno was at ten." Winslow's page, which ended on the hand-off, ends on its close: "I sat back and let the room forget about me. Which it managed quickly and without regret."

**The hint-taker's nights** (Raw 23: seven hints, solved; Coddled 11: three hints on the first pages, then first choices, and it named the wrong man): read for what a player who leans on hints sees. Each hint's line names the step and why; nothing on a page names who's left.

Seen while reading, and left alone (the prose build's, or the other branch's): "I dusted off my knees" after the papers (Poached 17, a search close now dealt where the hand-off sat: digest P6); "By then Bledsoe was in the corner." (P3); "Ashby, Lindemann and Winslow were at the supper" when Lindemann is the lodger (B5, the star's reason, `round7-fixes`'); "Bidwell saw Callahan at Moe’s at seven" as a hint's reason for Callahan's ten.

## 5. The browser

Vite on this branch, in the desktop app's browser pane, at 1280 × 900 and at 375 px (`scratchpad/hints/shots/`, fifteen screenshots). At 375 px nothing scrolls sideways (the page's scroll width is 375 on every screen checked).

- **The first page and its count**: Raw 23, "Close the case" and "Hint" side by side under the places, then "Everything you do takes one action unless it says free." and "Hints are unlimited tonight." (`02`); Coddled 11, "Hint (2 left)" after one hint, "You have three hints tonight." (`05`, 375 px); Soft-boiled 21, no button and "No hints from here on." (`13`).
- **A hinted star**: Raw 23 page one after a press, "* the Thorndike flat — start where it went missing" in the accent, and under the free row "Hint: start where it went missing." (`03` desktop, `04` at 375 px after a reload: the replayed save keeps the star and the note).
- **The greyed button**: Coddled 11 at Mrs. Nagy's with the three spent, "Hint (none left)" faded and dashed, two stars standing (Ainsworth in the room, the walk to the Thalia), the last hint's line under the row with its names as hover links (`06` at 375 px, `15` desktop).
- **The report page**: Poached 17 with its one hint taken there, "Still missing: Bidwell saw Callahan at Moe’s at seven — ask Callahan where she was." over the form, the button greyed (`14`).
- **The verdict's star and gold star**: Raw 23 solved with two hints, "7 actions, 2 hints." and a ★ in the accent, "Star: a perfect report." (`07` desktop, `10` at 375 px); Poached 17 solved with none, "12 actions, no hints." and a ★ in amber, "Gold star: a perfect report, with no hints." (`08`, `09`).
- **The title page's tier list**, under "Choose a case", with a profile of Raw gold, Coddled star, Poached gold: "Raw ★", "Coddled ★" (accent), "Poached ★" (amber on the checked tier's paper), Soft-boiled plain, Medium and Hard-boiled locked (`11` at 375 px, `12` desktop). A screen reader hears "Raw, gold star".
- **"How this works"** (`01`) has its eighth line; the "How it plays" drawer has the help's new line (read from the page).

## 6. Tests

**856** (main's 836), all passing at three workers. New, `test/hints.test.ts` (20): no star on any page without a hint, at every tier, along the oracle's route, the hint-taker's without its hints and the first choices; one hint stars one new choice, an open step on a cheapest way, never the client, with a reason that names no outcome, at no action and no page; the counts by tier, spent down to "Hint (none left)" and refused after, and refused from Soft-boiled up; the first page's four notes and Hard-boiled's mark line; a hinted step stays starred until taken, without spending again; pressing again gives the next step at Raw and, with nothing new, the starred one again for free; a tie's hint is always the first by name a star can sit on (more than five ties met along the oracle's routes); Raw 11's tie, word for word; the ready line, at Raw with the elimination, free the second time, and on the report page; the report page's "Still missing"; out of reach of a cheapest way, a hint always gives a step (along the wanderer's routes at Raw and Coddled); no hand-off, what-next, read-out or walk thought on any page, no page ending on a line that leads into nothing, and the level lint at 0, every tier, two routes; Raw at the link; the verdict's star, gold star, hint count and tally, and gold at Soft-boiled with no hint count; the profile's stars, golds and best, through sanitizing; the teach and help lines; the CLI's `hint`, `look`'s count, the save's `{ "do": "hint" }` and its replay, the verdict counting them, Soft-boiled's refusal; the help and teach page in the CLI's words. `test/plain-words.test.ts` gains the hints' chrome over a night at every tier (the button, the count, the notes, every hint's words, the tally and the star). Rewritten for this build: the star tests in `board-engine.test.ts` (with a hint taken on every page), `puzzle-fixes.test.ts` (Raw 11's tie by hints; Medium 14's and the capitals' reasons read from `starReason`), `round4.test.ts` (no hand-off; Medium 14's reason), `board-connective.test.ts` (no hand-off beat; no page walks the elimination, Raw's included; the level lint catches Raw too; no evening opens on a signpost), `round3.test.ts` and `round5.test.ts` (the key and the first page's note), `board/world.test.ts` (eight teach lines). The voice kit (`scripts/voice-script.ts`) no longer asks its nights for the elimination's shape or the hand-off's slot, which no page says now, and reads the street's link from a hand line when its nights miss it.

## 7. What's open

In docs/25 too.

- **The round-8 blind playtest** is this build's gate (docs/67's brief): whether a Raw player now takes the last step, whether a Poached player misses the stars or the rails, and whether the counts are right. The prompt's one line is in `scratchpad/hints/r8-prompt-template.txt` (round 7's prompt with `hint` and its count after the command list).
- **Coddled's hint-taker solves 2%**, from 100%: three hints spent on the first pages leave a player who takes first choices nowhere. Whether three is enough, or whether Coddled's hints should come back (one a page, say), is the designer's call; a Coddled player who names the one liar they caught still solves 57%.
- **When the hint-taker asks** is the literal reading (whenever no star stands, until none are left). A player who saves their hints for when they're stuck will do better; the measure can't say how much.
- **List smell** rose where a hand-off used to end a list or an account page in a sentence of another length (dealt Raw 23 → 31 of 280, Poached 17 → 30 of 398; the neighbourhood's Raw 5 → 23); it isn't a gate. A page that now ends on its thought ends on two or three sentences in one band.
- **A way in with no reason**: where the hand-off carried why, and the lean way in won't say a person's pointer, an arrival says only the room and who's in it (Poached 17's Sokol's back room; the reason comes to the face a page on: "Bidwell saw you at Moe’s at eight."). Read, it's the scene; whether it wants one plain line of why, the designer's call.
- **The turn's close** is dealt only where the page has a joke to spare, so most turns now end on the notebook read back; at Raw and Coddled that is the line that says whose story didn't hold.
- **Seen while reading, left for the prose build** (round 7's P list): "I dusted off my knees" after a desk search, dealt now where a hand-off sat (P6); "By then Bledsoe was in the corner." (P3); a star's reason that says a lodger was at the supper (B5) and one that cites seven for an hour that matters (B4), the other branch's.
