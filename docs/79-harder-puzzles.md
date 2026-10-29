# Harder puzzles: what a lazy player gets away with, and five ways to stop it

*2026-10-29, branch `puzzle-lab`, off main at `a64a5a6`. Phase 1: measure, then design. The designer: "the logic puzzles [are] too easy, even if you/the game thinks you 'can't' know something ... they follow a set pattern: you go to a bar/tenement, you ask who was there, you ask the people who were there/not there where they were, that's it. I'm not entirely sure of the solve, and think we need some serious thought into how to add the right kind of complexity." He chose to work up all five ideas (A–E below), each prototyped and measured before anything ships. Nothing dealt changed here: the rig only plays the nights main deals (§6). docs/78 is the closing work's; this memo takes 79, and its numbers are in its own appendix.*

## 0. In short

- **The grid solves the night.** A player who sweeps the rooms in the obvious order, confronts whatever the grid marks ✗ with the line the grid sets against it, and names whoever the grid leaves standing names the right culprit on 84%, 74%, 96% and 97% of nights at Poached, Soft-boiled, Medium and Hard-boiled. At Medium it does so on 78% of nights without ever hearing the culprit's own story, and in fewer actions than par.
- **The tier's trick gives a gold star.** Sweep until two stories break and name the one the tier's new trick broke (the passer-by's remark, a coat): the right culprit on every Medium night, and a perfect report on 78% of them.
- **Every lie falls to one answer.** On every night from Raw to Medium, and on the coat nights at Hard-boiled, one other person's answer (a list; somebody's evening on a third of Soft-boiled nights; at Medium, always the passer-by's) breaks the culprit's story. The only two-answer proof in the game is Hard-boiled's pair (the friend's coat on a list, and the friend's own evening), 63 of 100 Hard-boiled nights.
- **The two liars aren't alike.** The innocent liar's real hour always has a witness under it (the keeper who lists them, or the friend they name); the culprit's real hour is the scene, where nobody is. So elimination finds the culprit without touching either lie; and at Medium the passer-by's remark breaks the culprit's story on every night, a list the innocent's.
- **The window always closes on the later hour,** on all 300 two-hour nights measured. And at Raw and Coddled, the lists alone name the culprit on every night, in six or seven actions, without one evening heard.
- **Recommended order:** A, then B, then C and D together, then E (§5). A is the precondition for measuring the rest honestly; B removes the structure that makes elimination work; C and D give each step depth; E is the most expensive and goes last.

## 1. The rig

`npx tsx scripts/lazy-rig.ts [--seeds 25] [--tiers 0,1,2,3,4,5] [--worlds dealt,neighbourhood] [--strategies all|a,b] [--no-depth] [--json out.json] [--trace]`

It deals each night with `dealBoard`, plays each strategy through `stepBoard` one command at a time, reads only what the book shows a player (the page's choices, `boardGrid`, `pickerFor`, the hints it takes), files with `scoreBoard`, and reads the truth only to score. The baseline is 750 nights: seeds 1–25 of every tier and case type, in both worlds, so 150 a tier from Raw to Poached and 100 from Soft-boiled up. It runs on one core in about 15 minutes.

The strategies:

| strategy | what it does | what it names |
|---|---|---|
| random suspect | nothing | anybody (the floor) |
| the client's pointer | nothing | whoever the client points at |
| anybody with the means | the scene's find, then the list where the means came from | anybody the grid's means column says "yes" to |
| means and lists only | that, then every watcher's list it can reach; never an evening | the one with the means that no list places away at the hours that mattered |
| star follower | every hint the tier allows, each star, else the page's first choice; stops when a hint says the report is ready | the one a hint names (Raw's walk), else the one the grid points at |
| first clash | the obvious order: the scene's finds (not the papers), then room by room the watcher's list, every suspect's evening and anybody else's the room offers, then the next place the page lists that has something left | the first suspect the grid marks ✗ at the hours that mattered |
| notebook reader | the same order, and it confronts every ✗ with the grid's own line, asks whoever an owning-up names, pencils each coat or hat on the one person it has met who wears it, and drops an hour the dead man's row shows him alive | whoever the grid leaves standing (the means not "no", not placed away at every hour left), as soon as one is |
| the tier's trick | the notebook reader's sweep, until two stories break | of two broken stories, the one broken by the tier's trick (a remark, a coat), else the one who claimed an unwatched room |
| oracle | the designed path (`playBoardOracle`) | the culprit (the ceiling) |

Proof depth, per night: the fewest answers (one answer is one whole evening, one list, one find or one confrontation) that together break the culprit's story at the crime hour, besides their own story; the fewest that place each rival away from the scene at the crime hour; and the fewest that narrow a two-hour window. It is exact (`minimalSets` over every question the night has, at the tier's techniques) and counts logic, not errands: nothing is pointer-gated.

### 1.1 The baseline: the right culprit inside the budget

Each cell is the share of nights the strategy names the culprit, with the actions it spent (mean) in brackets. Every strategy stops at the budget.

| strategy | Raw | Coddled | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|---|---|
| random suspect | 27% (0.0) | 38% (0.0) | 25% (0.0) | 28% (0.0) | 24% (0.0) | 13% (0.0) |
| the client’s pointer | 23% (0.0) | 28% (0.0) | 29% (0.0) | 23% (0.0) | 26% (0.0) | 20% (0.0) |
| anybody with the means | 42% (3.4) | 49% (3.5) | 34% (3.4) | 27% (3.1) | 33% (3.3) | 21% (3.3) |
| means and lists only | 100% (6.0) | 100% (6.5) | 57% (6.0) | 51% (6.3) | 51% (7.1) | 34% (7.1) |
| star follower | 100% (8.2) | 85% (9.3) | 60% (12.9) | 45% (12.7) | 31% (14.4) | 18% (13.5) |
| first clash | 100% (7.6) | 95% (6.3) | 79% (7.6) | 67% (7.1) | 35% (9.0) | 14% (12.5) |
| notebook reader | 100% (9.1) | 100% (8.4) | 84% (12.5) | 74% (12.6) | 96% (12.2) | 97% (13.1) |
| the tier’s trick | 100% (10.3) | 100% (9.3) | 70% (11.8) | 76% (11.7) | 100% (14.1) | 69% (11.9) |
| oracle | 100% (7.3) | 100% (7.3) | 100% (10.9) | 100% (10.7) | 100% (12.4) | 100% (12.5) |
| *budget, mean (par)* | 10.3 (7.3) | 9.3 (7.3) | 12.9 (10.9) | 12.7 (10.7) | 14.4 (12.4) | 13.5 (12.5) |
| *suspects; one-liar nights* | 3.0; 0% | 3.0; 0% | 4.0; 36% | 4.0; 34% | 4.0; 31% | 5.0; 15% |

### 1.2 The same name on a true line, and the perfect report

Each cell is the share of nights it names the culprit on a line that truly breaks their story (the report's "what proves they lied"), then the share on which the whole report is perfect (every point, so a star). Strategies that name without a lie in hand cite the form's first line, so they score 0% here by design.

| strategy | Raw | Coddled | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|---|---|
| random suspect | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| the client’s pointer | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| anybody with the means | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| means and lists only | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| star follower | 100% / 100% | 55% / 55% | 35% / 0% | 34% / 0% | 0% / 0% | 0% / 0% |
| first clash | 100% / 100% | 93% / 93% | 79% / 4% | 67% / 2% | 34% / 14% | 0% / 0% |
| notebook reader | 73% / 73% | 90% / 90% | 71% / 32% | 70% / 24% | 17% / 14% | 70% / 2% |
| the tier’s trick | 100% / 100% | 93% / 93% | 67% / 16% | 74% / 16% | 89% / 78% | 48% / 7% |
| oracle | 100% / 100% | 100% / 100% | 100% / 100% | 100% / 100% | 100% / 100% | 100% / 100% |

### 1.3 Proof depth

"A rival clears on 4+" is the innocent who owns up: their story, the line that breaks it, the confrontation, and the friend they name. At Hard-boiled, the 63% that break on two are the pair nights (the friend's coat on the barman's list, and the friend's own evening to put a name to it); a coat night breaks on the list alone, since you've seen what the culprit wears.

| tier | nights | culprit’s story breaks on 1 answer | 2 | 3+ | what the one answer is (list : account : search : other) | rivals | a rival clears on 1 answer | 2 | 3 | 4+ | rivals, mean | hour narrowed on 1 answer (of two-hour nights) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Raw | 150 | 100% | 0% | 0% | 150 : 0 : 0 : 0 | 300 | 100% | 0% | 0% | 0% | 1.0 | — |
| Coddled | 150 | 100% | 0% | 0% | 150 : 0 : 0 : 0 | 150 | 100% | 0% | 0% | 0% | 1.0 | — |
| Poached | 150 | 100% | 0% | 0% | 150 : 0 : 0 : 0 | 300 | 68% | 13% | 0% | 19% | 1.7 | — |
| Soft-boiled | 100 | 100% | 0% | 0% | 68 : 32 : 0 : 0 | 200 | 84% | 5% | 0% | 12% | 1.4 | 100% |
| Medium | 100 | 100% | 0% | 0% | 0 : 100 : 0 : 0 | 200 | 78% | 7% | 0% | 15% | 1.5 | 100% |
| Hard-boiled | 100 | 37% | 63% | 0% | 37 : 0 : 0 : 0 | 300 | 46% | 54% | 0% | 0% | 1.5 | 100% |

### 1.4 What the numbers say

1. **What decides who is placement, not lies.** The notebook reader names whoever the grid can't place, and that's the culprit on 74–97% of nights from Poached up, because every innocent's crime hour has somebody under it (a list, a friend, a keeper) and the culprit's has nobody. It doesn't need the culprit's lie at all: at Medium it named the culprit on 78% of nights without asking their evening, and so files no true line (17%). The report's line questions are the only thing between it and a star.
2. **The tier's trick tells the two liars apart.** At Medium the side remark breaks the culprit's story and a plain list breaks the innocent's, on every night: the trick reader is right on 100% of Medium nights and files a perfect report on 78%. At Poached, Soft-boiled and Hard-boiled the same reader is right on 70%, 76% and 69%: there the trick is shared or absent, and it falls back to the first ✗.
3. **The first ✗ is the answer whenever there's one liar,** and often when there are two. First clash is right on 90–100% of one-liar nights from Poached to Medium (the misses are nights it ran out of actions before it met the culprit), and on 72% of Poached's two-liar nights. It falls above Poached because the innocent's story is met first on most two-liar nights (at Medium, first clash is right on 10% of them), and, at Medium, the culprit's breaks only on the remark. At Hard-boiled the grid hides a clash that rests on a coat until the player pencils it, so first clash, which never pencils, mostly sees the innocent's (14%).
4. **Lists alone settle Raw and Coddled.** Means and lists only, never hearing an evening, is right on every Raw and Coddled night in six or seven actions (par is 7.3): two watchers each place one rival, and the means column does the rest. From Poached up it's right on about half: the innocent liar has no list under them until their own story names the place.
5. **Proof depth is one.** Every culprit's story from Raw to Medium breaks on a single answer besides their own story (a list; on a third of Soft-boiled nights somebody's evening; at Medium always the passer-by's), and on Hard-boiled's coat nights too. Rivals mostly clear on one answer as well; the four-answer rivals are the innocents who own up, and the four are a chain of errands (their story, its break, the confrontation, the friend), not four facts combined. The hour narrows on one answer on every two-hour night, and always to the later hour.
6. **The stars are not the problem.** The star follower is at 60% at Poached and falls with the hints (none from Soft-boiled up), below the grid readers everywhere above Coddled. docs/46 and docs/67 already thinned them; what solves the night now is the grid and the shape of the deal.
7. **The floors are where they should be.** The client's pointer is the culprit about as often as chance (20–29%), and "anybody with the means" is 21–49%. Nothing in the office gives the name away.


## 2. Four nights, played by hand

Through `npm run play`, every page read (saves in the scratchpad's `puzzles/play/`).

**Poached 41, a murder** (a carving knife from the Delmonico rooms; 12 actions, 5 out of 5). The scene's page said the inference itself: "Whoever stabbed Ellery had been at the Delmonico rooms first." Mrs. Tillman's list put three people there while the knife was in the drawer, and the grid's means column did the access sum. Schilling's evening came with its clash already found: "Here was the trouble. Schilling had told me she was home at the Delmonico rooms at nine, and Mrs. Tillman never saw her there." Mosley's list placed Margolis and ruled Alfano out of the means, both on the grid before I'd thought about them. Colquitt's evening: "There was a snag." Two broken stories. Confronting Colquitt, the picker offered one line, the right one; she owned up and named Vogel, who "was in the corner by then", and Vogel's page closed the check for me: "That much checked out." **Where the reasoning happened:** nowhere the book didn't say it first. My only decision was to confront both liars, and the first confrontation settled it.

**Medium 42, a murder** (chloral from Mrs. Nagy's; 14 actions, 4 out of 5). The table's page did the lead time ("had to fetch it from Mrs. Nagy's before nine"), the grid did "too late for it", Doyle's evening came with its clash said, and Hurwitz's page said "At nine, Havemeyer was still alive at the Odessa". The real work was small and real: seeing it had to be ten, seeing Fairbanks alone unbacked at ten, and choosing whom to ask for a passer-by. Reinhardt's evening had it: "I passed Fairbanks on East Houston Street. She was going fast, with no hat on." Then two broken stories at ten and no actions left to clear Doyle. I named Fairbanks because at Medium the remark breaks the culprit and a list breaks the innocent: right, on the tier's pattern, not a proof.

**Hard-boiled 43, a murder, a coat night** (a carving knife; 13 actions, 4 out of 5). No thought linked anything, but the grid still marked Zeldin's ✗ and gave the access sums. Sirkin's list had "somebody in a sailor's pea coat" at ten, and Colquitt had walked in past me in a sailor's pea coat. Seeing that the coat wasn't Crowninshield's, which makes her "the Velvet Room at ten, only me" false, was the one deduction of the four nights that the book left to me, and it took one look; the grid showed her ✗ only after I pencilled the coat on Colquitt. Zeldin refused, and the page pointed me at the Automat, where her keeper was. I named Crowninshield on the coat, the tier's trick again.

**Poached 44, a lost Pomeranian** (11 actions, full marks). The office's card party gave the access; Kavanagh's list placed two of four at eleven and saw the handover to Benny at twelve ("Something alive, I would say; it moved"), so where she is now was one remark and the form offered two places. Winslow's and Salerno's stories each came with their clash said. Salerno was found at the card room, neither where she claimed nor at home: on every night where the innocent will own up, they are found after midnight where they really were (docs/41 rule 9, "one who owns up is still where they were, with their company"), 58 of 96 Poached two-liar nights. She owned up, named Vitale ("at the far table"), and "That much checked out."

**What the four nights share.** From Poached to Medium the page says every clash as it lands; the means column says who could have had it, lead time included; the picker offers one line per claim; an owning-up closes its own check; the hour's narrowing is a sentence on the list's page. The two liars are told apart by the confrontation (one owns up and names a check), by a keeper's list, or by which trick broke which story. Nowhere did I have to hold two facts together except the coat, and even that took one look.

## 3. What good deduction games do

**Return of the Obra Dinn** (Lucas Pope, 2018). Each fate is a name, a cause and a killer, and the book confirms correct fates only three at a time, so a single guess can't be checked ([Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn)). A sailor is rarely named by one clue: the reliable answers come from combining a prop, a shouted name, a role and the manifest, and a clue like nationality alone can't pick one man out ([Film Stories](https://filmstories.co.uk/?p=83249)); elimination does the last of the work, not the first. *What applies here:* each identity is several observations that each leave several candidates (idea C), and the game never says which deduction was right (idea A; our report's proof line already plays the part of the three-fate check).

**The Case of the Golden Idol** (Color Gray Games, 2022). You collect words from a frozen scene, then fill blanks in an account of what happened; slots are checked a segment at a time, and a segment locks only when all of it is right ([Wikipedia](https://en.wikipedia.org/wiki/The_Case_of_the_Golden_Idol)). In testing, when players skipped many steps by using one clue, the developers removed that clue, because it made parts of the scenario unnecessary ([Game Developer](https://gamedeveloper.com/business/-the-case-of-the-golden-idol-i-used-frequent-testing-to-improve-its-mystery-solving)). *What applies:* the player writes the account and the game checks only the whole; and a clue that settles a step alone is a defect to be cut, which is exactly our one-lookup clash.

**Logic grid puzzles.** The grid is the solver's own tool, and the clues are relations, each settling little alone. A solver built to imitate people uses clue reading and the bijection rule first ("easy to use for humans") and reaches for transitivity across sub-grids (A is B, B is C, so A is C) and path-consistency elimination "only as a last resort"; how far a puzzle needs those is what makes it hard ([Escamocher and O'Sullivan, 2019](https://ar5iv.labs.arxiv.org/html/1910.06636)). *What applies:* the ✗ is the player's mark, never the puzzle's (A), and the hard move should be a transitive one: our company lists already carry it (A was with B, B was at the Odessa, so A was at the Odessa; C).

**Sherlock Holmes Consulting Detective** (Sleuth Publications, 1981). A map of London, a directory of names and places, a case book and that day's newspaper: you choose which addresses to visit, then answer the case's questions, gaining points for right answers and losing them for every lead visited, rated against how few Holmes needed ([Wikipedia](https://en.wikipedia.org/wiki/Sherlock_Holmes:_Consulting_Detective_(gamebook))). Its known weakness is fairness: reviewers find the evidence sometimes circumstantial and Holmes's route full of "major leaps of faith" ([a review of case 1](https://www.goodreads.com/author_blog_posts/20822395-board-game-review-sherlock-holmes-consulting-detective-case-1-the-mun?tab=author)). *What applies:* our par and budget are its lead count, and that part works; the newspaper is information nobody points you at, which the player has to connect (D's hearsay and C's second sources can play that part); and its leaps are what the Tatham check exists to forbid.

**Simon Tatham's puzzle collection.** Generating with a solver "of configurable intelligence" gives puzzles of at most that difficulty; for at least, discard what a weaker solver finishes. He found that a simple solver "does lead to qualitatively easier puzzles", and had to make Solo's solver more advanced than most ([Tatham, *Writing a puzzle*, §6.2.1](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/devel/writing.html)). *What applies:* our `LADDER` does the at-most and at-least check, but every technique on it is one inference of a new kind (a list, an access sum, a confrontation, a sighting, a remark, a face), not a deeper one. The check passes because the solver below the tier lacks a lookup, not because it lacks reasoning. A tier's technique should be a deeper inference, and the check should bound depth as well as kind (§4.C).

## 4. The five ideas, as generator rules

Throughout, "the rules" are docs/41's. Each idea says what changes, what the solver must learn, the one sentence the teach page gains, the tier, its predicted effect on each lazy strategy, its cost, its fairness risks, and how we'd know.

### A. The notebook stops concluding (from Poached up)

**Rules.** None of docs/41's: A changes how the book shows the board (docs/43 §4 and §5, the grid and the confrontation; docs/46 §2 and docs/72, the thought levels and the dial), not what's dealt.

**What changes.** Every place the book draws a conclusion from Poached up says the facts instead, and the conclusion is the player's:

1. **The grid's cells** show what was said (their own word, quoted) and who said they saw them where (a list, somebody's company), and nothing the solver derived: no ✗, no ✓, no placement that rests on a chain (a confirmed story placing its company). The ✗ becomes the player's own mark, free, like the pencil. A second view, places × hours, shows each list as said ("Delmonico at nine: nobody, says Mrs. Tillman"), so the join a player has to make is a glance across two views, not a search.
2. **The means column** shows the fact (the knife in the drawer at seven, says Mrs. Tillman) and who was seen at the origin when, not "yes", "no" or "too late for it".
3. **The thoughts** run at Hard-boiled's fact level from Poached up (docs/46 §2): no "Here was the trouble", no "That much checked out", no "At nine, Havemeyer was still alive at the Odessa", no "had to fetch it from Mrs. Nagy's before nine". The scene says what was found.
4. **Confront** is offered for anybody whose evening is held, not only someone the solver has caught (today the topic "or confront her" appears exactly when a story breaks), and the picker offers every line held at that hour, not only those that bear on the claim (today usually one).
5. **The report's line lists** come in the notebook's order, not with the lines that touch that person first.
6. **The turn** (the chapter break at the first lie caught) comes when the player first marks a clash, not when the solver first finds one.

Raw and Coddled keep every sum, as the teaching tiers.

**The solver** doesn't change; the measure does. The rig needs a *cross-referencer*: a strategy that does the one-lookup join itself (each claim against every exhaustive list at that place and hour) and ignores the grid's marks. Today it would score what the notebook reader scores.

**Taught:** "From here on the notebook only writes down what you were told; where two stories don't fit is yours to find."

**Predicted.** First clash and the tier's trick read the ✗, so they lose it, and the star follower loses its last step. A lazy player who makes the join himself (the cross-referencer) scores what they score today, since every break is one lookup. The notebook reader keeps most of its rate: placements are facts, they stay on the cells, and elimination still names whoever nobody placed. It loses only the nights where a placement rested on a chain (a confirmed story placing its company, an owning-up's check), so we'd expect 75–90% where it's 74–97% today. That's the point to show: A moves the noticing to the player, but it doesn't make the night deeper and it doesn't stop elimination. B does. The oracle is unchanged.

**Costs.** No generator work. The game: `grid.ts` (cells, the places view, the player's ✗), `choices.ts` (confront for anyone heard, the full picker), `thought.ts` and `pages.ts` (the fact level from Poached, the scene's inference, the check's close, the sighting sentence), `report.ts` (`breakOptions` order), `engine.ts` (the turn's trigger), `ui/board-book.ts` and the CLI's grid. Prose: a few card families thin out (check closes, the sighting line). Tests: the round-7 to round-9 tests that pin these lines; the level lint grows.

**Fairness risks.** None in the logic. The risk is tedium and the feeling of having missed something: round 6 to 9 testers leaned on the grid. The places view has to put the two halves of every clash on one screen.

**How we'd know.** The rig: first clash and the tier's trick fall to the floor unless they make the join, the cross-referencer doesn't fall, the notebook reader falls only a little (showing that elimination survives A), and the oracle stays at 100%. Blind playtests at Poached and Medium (`npm run play`): whether testers find the clashes themselves, how many actions they spend over par, how often they mark a clash that isn't one, and whether they still say they enjoyed it.

### B. Two broken stories, one killer (from Soft-boiled up)

**Rules.** Rule 9 (its 2026-09-28 and 2026-10-11 notes: the admission named and checked, the refuser cleared by a list, "neither lie is first for the asking", "telling them apart is the deduction"), rule 13 (the window: the crime at either hour) and rule 14 (uniqueness rests on the discriminator).

**What changes.**

1. **The innocent's real hour has no witness.** From Soft-boiled up, the innocent liar was somewhere unwatched and alone at the hour they lie about (home with the door shut, a walk, a church): no keeper's list and no friend to name. Put to them, they refuse, or tell a second lie that breaks too; they never own up with a name. So nothing places them, as nothing places the culprit, and elimination by placement leaves both standing.
2. **What tells them apart is one of three things,** dealt per night, each a fact the player has to bring to it:
   - **the hour** (Soft-boiled): the two lies fall at different hours of the office's two, and only the crime hour's lie matters. The crime is at the earlier hour on half the nights and the later on half (today it's always the later), and the sighting that fixes it is the player's to read (with A);
   - **the means** (Medium): the innocent couldn't have had it. They were at the origin only after it was gone, or never, and showing that takes the origin's list and the hours the means was there, which come from two sources (with C: "in the drawer at seven", and a lodger's "gone when I looked at eight");
   - **the walk** (Hard-boiled, with E): they were seen too far away, too close to the hour, to have been at the scene.
3. **No other tell.** The two lies fall to the same kind of source (both to lists, or both to a remark at Medium, or both to a coat at Hard-boiled), so the tier's trick doesn't say which is which. Both liars are found after midnight by the same rule (both back where they claimed). `INNOCENT_LEADS` goes to 0.5. Both may claim home.
4. **The report's "what clears them"** becomes the line that does: the sighting that fixes the hour, the line that shows they couldn't have had the means, or the two sightings and the walk.

Poached keeps today's night (the innocent owns up and names a check, or a keeper lists them): it's where "two stories can break" is taught. One-liar nights stay at their share; the culprit is then the only liar, so "Nobody else" still needs its proof (docs/69).

**The solver** has the techniques (time-window, access); what's new is that they decide *who* and not only *when* or *whether*, so the Tatham check must hold: the tier below can't finish, and the refusal shortcut names nobody (two refusers). `lieMatters` changes: the innocent's lie matters if nothing but the discriminator clears them. A new invariant, `discriminated`: without the discriminator's lines, both liars are left.

**Taught:** "When two stories break, only one of the two could have done it: find out when it happened, and who could have got the weapon."

**Predicted.** Elimination leaves two standing on every two-liar night, both with a ✗. With the grid still concluding, a reader that uses its means column and the dead man's row still wins the means and hour nights; with A, the notebook reader is down to a coin flip on two-liar nights, so to about the one-liar share plus half the rest (60–70% where it's 74–97%), and the tier's trick the same (from 64–100% on two-liar nights). First clash on two-liar nights goes to a coin flip (10–72% today, by how often the innocent's story leads), and stays right on one-liar nights. The "always the later hour" guess goes to 50%. What still wins is a one-step reasoner who reads the dead man's row and the origin's list for himself; making those two steps is C.

**Costs.** Generator: `generate.ts`'s lies (the innocent's truth unwatched, the response, no U keeper or companion above Poached), the window (the crime at either hour, the victim's sighting placed to match), the means hours for the means night, the found-at rule; `invariants.ts` (`twoStories`, `lieMatters`, `discriminated`); `path.ts` (the lead); `report.ts` (`heldClearers`). Prose: refusals with nobody to point at, second lies that break, the curtain's "what cleared them". The veto rate will rise at Soft-boiled, which already deals five attempts a seed.

**Fairness risks.** Uniqueness now rests on the discriminator being complete: the hour must be fixable by facts the player can get, and the means window must be closed on both sides. A refusal must still never be evidence (both refuse, so it can't be). A player who doesn't know the hour can't tell the lies apart, so Soft-boiled's sighting has to be findable, not lucky.

**How we'd know.** The rig: elimination and the tier's trick within ten points of a coin flip on two-liar nights; the crime at the earlier hour on 40–60% of nights; the oracle at 100%; par in 5–9. Blind playtests at Soft-boiled and Medium: testers who name the culprit say why the other liar couldn't have done it, and the reason they give is the hour or the means.

### C. Two-step proofs (from Medium up; the agreement at Soft-boiled)

**Rules.** Rules 7 and 15, and rule 10 (two agreeing stories are both true below Hard-boiled) becomes a technique the ladder gates.

**What changes.** Rule 7 becomes: every lie collides with something true, and from Medium up never with one answer alone. No list, remark or evening by itself breaks the culprit's story at the crime hour; two true facts that share a place, a person or an hour do. Rule 15, which docs/42 found vacuous (every account covers every hour), becomes this measurable rule: the rig's break depth is at least 2, and an invariant (`twoStep`) checks it on every accepted night. The forms, each built from things the board already has:

1. **The stranger named** (Medium). The keeper's list at the crime hour has somebody they couldn't name ("Obermann and a woman I didn't know"), so it isn't whole, and the culprit's claim to have been there survives it. Somebody's true story names her ("I was at the Odessa at ten, with Obermann"), and then the list is whole and the claim breaks. Today's `Other` with `known: false` already makes a list not exhaustive; the generator would deal it at the crime hour, and a company-only witness's story would fill it.
2. **Two stories that agree** (Soft-boiled). Somewhere nobody keeps a list, two people's stories agree ("Sokol's at ten, the two of us, nobody else"), so both are true below Hard-boiled (rule 10), and between them they say who was there. The culprit's claim to have been there breaks only on the two together. The solver already does this as a read-off (`corroboration`); it becomes a technique of its own, `agreement`, on the ladder.
3. **The friend's coat** (Hard-boiled's pair), as now: the barman's coat at the crime hour, and the friend's own evening to put a name to it. A coat night's coat breaks the culprit's story on the list alone (you've seen what the culprit wears), so coat nights need one of the other forms.
4. **The means window from two remarks** (for B's means night): "in the drawer at seven" and "gone when I looked at eight", from different people.

Rivals get the same rule at Medium: each rival is placed by two answers, not one list.

**The solver** gains `stranger` (an unknown on a list at an hour is identified when a story that stands puts a named person there with the listed company) and `agreement`, and the Tatham check gains depth: a solver allowed only one-answer inferences must not finish from Soft-boiled up. That's the check Tatham's notes point to (§3): harder means a deeper inference, not a new kind of lookup.

**Taught:** "Sometimes no one witness is enough: a list with a stranger on it says nothing about who else was there, until you know who the stranger was."

**Predicted.** With the grid still joining, the sweeps get there, but later: par rises by one or two questions and the budget squeezes the sweepers (the notebook reader already spends its whole budget on 78–89% of Poached, Soft-boiled and Hard-boiled nights). First clash meets the innocent's one-answer break before the culprit's two-answer one more often, so it falls. With A, the join is the player's, and it's a real one. The cross-referencer has to do two-hop joins to keep up; a one-hop cross-referencer falls to elimination's rate.

**Costs.** Generator: lists with an unnamed companion at the crime hour, the second source, the pairs that agree; `invariants.ts` (`twoStep`); `solver.ts` (`stranger`, `agreement`); `tiers.ts` (`LADDER`). Prose: list tellings with a stranger ("and a woman I didn't know"), the company-only witness's story. UI: a list cell that says it isn't whole.

**Fairness risks.** Closed-world mistakes: the stranger must be identifiable as one person only (a woman, so not the male suspects; nobody else unaccounted for at that hour), and "two stories that agree" is sound only below Hard-boiled, where nobody lies together. Every extra join is another place for an unintended shortcut or an ambiguity, so the depth check and the shortcut readers must run on every accepted night.

**How we'd know.** The rig: break depth 1 on 0% of Medium and Hard-boiled nights (from 100% and 37%); par still 5–9; first clash and the tier's trick down; the oracle at 100%. Blind playtests at Medium: testers who name the culprit cite both lines.

### D. Imperfect witnesses (Soft-boiled up)

**Rules.** Rule 6 (a watcher's list is exhaustive) becomes "exhaustive for the hours they say they saw", and rule 7's "at least one truthful account or watcher at that place and hour doesn't include the liar" needs a whole hour.

**What changes.** A watcher says less, never anything false ("Nobody lies about where they saw anybody else" stays). Each hour of a list says whether it's whole:

1. **A gap** (Soft-boiled): "I was down in the cellar from ten till near eleven"; "I went up to bed at half past nine"; "I came on at ten". The list names who they saw, but says nothing about who they didn't. docs/42's repaired seed 3 (Mrs. Rafferty goes to bed at half past eight) and the refuser's keeper ("I came on at ten") already do this; D deals it as a feature.
2. **A blind spot** (Medium): "I can't see the back room from the bar" (`WatchList.unseen`, which only the lost-watch fixture uses today).
3. **Coats and hats** (Hard-boiled), as now, and below it at Medium on one face.
4. **Hearsay** (Hard-boiled): "Fairbanks said she was off home": a keeper repeating somebody's own word, which is a claim, not a sighting.

What it does to the puzzle: an honest story can look broken to a player who takes a list as whole when it isn't (a false clash), and the culprit's story survives the list that has a hole in it, so a second source has to break it (which is C). D is C's mechanism, and its own contribution is the false clash, which is what finally stops "first clash" on nights with one liar.

**The solver** already treats an unknown on a list as making the hour not whole, and `unseen` as nobody seen; it needs a per-hour `whole` flag on lists and to read hearsay as a claim. The Tatham check gains a mirror of the shortcut readers: a naive solver that treats every list as whole must not reach the right answer by luck, and must reach a wrong one on nights with a false clash.

**Taught:** "A keeper who stepped out, or couldn't see a room, can tell you who was there, but not who wasn't."

**Predicted.** Elimination falls (more people unplaced), first clash falls on one-liar nights (a false clash comes first on some), and a naive cross-referencer goes below the floor on false-clash nights. The grid, if it still concludes, gets these right, so D needs A to bite.

**Costs.** Types (`WatchList` hours with `whole`, `unseen` for real, hearsay as a line kind), the generator's lists, the solver, the list tellings ("I was down in the cellar from ten", in the watcher's manner), and a grid cell that shows a part-hour. Low to moderate.

**Fairness risks.** The gap must be said on the same page as the list, plainly, every time; a false clash the player couldn't have seen through would be a trick, not a deduction.

**How we'd know.** The rig: a naive cross-referencer's rate on nights with one liar falls from first clash's 90–100% today to under 70%; false clashes dealt on a stated share of nights; the oracle at 100%. Blind playtests at Soft-boiled: whether testers notice the gap, and whether the night still reads as fair afterwards ("I should have seen that").

### E. Time and distance (Hard-boiled)

**Rules.** Rule 1 (slots are whole hours) gains an exception at the crime hour, rule 13 (weapons act on real time) becomes a deduction and not only a clue, and docs/41's "What goes: half-hour slots" comes partly back.

**What changes.** The board stays in whole hours, but the crime hour carries times to the quarter on the sightings that matter: a keeper's "came in at a quarter past ten", "left just before ten"; a passer-by's "at twenty past". The map's walking times (`streets.ts`, `walk.ts`: 5 to 40 minutes) are published on the notebook page as minutes between the night's places, and everybody walks. A story is impossible when it needs a walk faster than the map allows: seen leaving the Odessa at a quarter to ten and at the Automat at five past, with the scene twenty-five minutes off that way, somebody can't have been at the scene at ten. The weapon's delay (rule 13: chloral twenty minutes to an hour) joins the same arithmetic. The margins are never close: impossible by at least fifteen minutes, or possible by at least fifteen.

It's B's third discriminator (the innocent couldn't have got there) and a two-step proof by construction (two timed sightings and a distance).

**The solver** gains interval reasoning and a `travel` technique: at hour h, person p was within reach of the scene only if walk(a, scene) + walk(scene, b) fits between their last sighting at a and their next at b.

**Taught:** "Everybody walked, and the map says how long each walk takes: a story that needs a quicker walk isn't true."

**Predicted.** Every lazy strategy here reads places and hours; none reads minutes, so on travel nights they fall to elimination's coin flip between the two liars. The cross-referencer needs the map to keep up.

**Costs.** The highest. Generator: minute-level movement at the crime hour, the margins, the vetoes; solver: intervals; prose and decks: times in lists and stories ("came in at a quarter past"), a distance table or map page; UI: the crime hour as a timeline under the grid; the walk lines ("near enough to get there and back inside the hour") must agree with the minutes. docs/41 removed half-hour slots on purpose ("What goes"), so E must stay narrow: one hour, a few stamps.

**Fairness risks.** Rounding (walks are rounded to five minutes), walking speed (said once, as a rule), and cabs: cab drivers are in the suspects' job pool, so the rule needs "nobody drove tonight" or the cab in the garage. Borderline times would be unfair; the margin rule is what keeps it a deduction.

**How we'd know.** The rig: on travel nights, every strategy that doesn't read minutes at a coin flip between the liars; the oracle at 100%. Blind playtests at Hard-boiled: whether testers use the map unprompted, and whether they find a travel proof convincing or fussy.

### 4.F How they fit together

The ideas aren't independent, and the order follows from how:

- **A is the precondition.** As long as the grid places people and marks clashes, every new deduction B to E adds is read off by the grid, and the rig would measure the grid, not the player.
- **B changes which fact decides; C and D make each fact a combination.** B on its own swaps one lookup (the keeper's list) for another (the victim's row, the means list). With C, the hour and the means each take two sources.
- **D is C's mechanism,** plus the false clash.
- **E is B's third discriminator** and the game's one new kind of reasoning.

What we expect at Medium, the ideas taken one on top of another (a guess to be checked by the rig after each, not a measure):

| strategy | today | with A | with A and B | with A, B, C and D |
|---|---|---|---|---|
| random suspect | 24% | 24% | 24% | 24% |
| anybody with the means | 33% | 25–33% (the column stops saying "yes") | 25–33% | 25–33% |
| means and lists only | 51% | 45–50% | 35–45% (the innocent is unplaced too) | 25–35% (lists with holes place fewer) |
| first clash (from A on, making the join by hand) | 35% | 35% | 55–65% | 45–55% (false clashes on one-liar nights) |
| notebook reader | 96% | 75–90% (elimination survives A) | 55–65% (two standing on two-liar nights) | 40–50% |
| the tier's trick | 100% (78% perfect) | 100%, by hand | 55–65%, perfect under 10% | 45–55% |
| oracle | 100% | 100% | 100% | 100% |

First clash *rises* with B, and that's right: today's 35% at Medium is the lead order's doing. On Medium's two-liar nights first clash is right only 10% of the time, because the obvious order meets the innocent's broken story first, so "the second liar you catch did it" would be right on most of them; at an even lead the first and the last are alike. While a third of nights have one liar, any strategy that names a liar it caught is right on all of those, so its floor for *who* is about the one-liar share plus half the rest, 55–65%; the report's "Nobody else" (docs/69) and the proof lines are what keep it from a star. Going lower needs fewer one-liar nights from Soft-boiled up or D's false clashes on them: the designer's call (§5).

A ladder that keeps docs/41's one new idea a tier:

| tier | today | proposed |
|---|---|---|
| Raw | read-off, collision, elimination | as today; the notebook sums (teaching) |
| Coddled | access | as today; the notebook sums |
| Poached | confrontation (the innocent owns up; the check) | as today, and the notebook stops concluding (A) |
| Soft-boiled | time-window (a sighting narrows the hour) | **the hour decides** which broken story matters (B), with keepers' gaps (D1) and two stories that agree (C2) |
| Medium | side remark (an unwatched claim) | **a list with a hole**, filled from somebody else (C1, D2), and the means decides (B) |
| Hard-boiled | pair, face | **the walk decides** (E), beside the pair and the coat |

## 5. Recommended order, and what to measure after each

Each is a prototype behind a flag (`?puzzles=A`, and `--puzzles A` in `npm run play`, `lazy-rig` and `board-measure`), off by default, so main deals as now and the hashes hold until the designer decides.

**Why this order.** A costs nothing in the generator and makes every later measure honest, but on its own it leaves elimination standing. B is the change that stops elimination, and the first that touches the deal. C and D need B's discriminators to have something to deepen, and they share one mechanism, the list with a hole. E is the most work and the most risk, and only Hard-boiled needs it.

1. **A, the notebook stops concluding.** No deal changes; game and UI only. Measure: the rig with the cross-referencer added (the ✗ readers fall unless they make the join; the cross-referencer and, mostly, the notebook reader don't; the oracle holds); `board-measure`'s lints; then a blind playtest at Poached and Medium (three testers each): solved rate, actions over par, false clashes marked, and what they say about it.
2. **B, two broken stories, one killer** (Soft-boiled's hour, then Medium's means). Measure: on two-liar nights, elimination, the tier's trick and first clash within ten points of a coin flip; the crime at the earlier hour on 40–60%; generation success and tries at Soft-boiled; par 5–9; then a blind playtest at Soft-boiled and Medium: the reason testers give for the other liar.
3. **C and D together, lists with holes** (Soft-boiled's agreement and gaps, Medium's stranger and blind spot). Measure: break depth (1 answer on 0% of Medium and Hard-boiled nights), par and budget, the sweepers' budget-outs, the one-hop cross-referencer's fall, false clashes dealt and the naive reader's rate on them; then a blind playtest at Medium.
4. **E, time and distance** (Hard-boiled). Measure: travel nights' share and margins, every place-and-hour strategy at a coin flip there, the oracle; a blind playtest at Hard-boiled with the map.

After each: the rig at 25 seeds a tier and type in both worlds, `board-measure --seeds 20` for the readers it already has, the prose lints, and the dealt hashes with the flag off.

**The target,** from Soft-boiled up, once B, C and D are in: no lazy strategy names the culprit on more than about 65% of nights (one-liar nights make that the floor for anybody who names a liar they caught), none files a perfect report on more than 10% (today the tier's trick does on 78% of Medium nights), break depth 1 on no night at Medium and Hard-boiled, the oracle at 100% and par in 5–9. Until then each step is judged by its own row of the table in §4.F.

**Open for the designer:** whether one-liar nights stay at a third from Soft-boiled up. They make "the liar did it" right on every one of them, by construction, whatever else changes.

## 6. The deal didn't move

The rig and this memo are all that changed: `git diff a64a5a6 -- src` is empty. The dealt boards hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a` (the hashing script is docs/71's, `scratchpad/c5b/dealhash.mts`).

## Appendix: the rig's numbers in full

Seeds 1–25 of every tier and case type, both worlds: 750 nights (`npx tsx scripts/lazy-rig.ts --seeds 25 --json …`, 905 s on one core). Every night's record (each strategy's name, whether it was right, on a true line, perfect, its actions, whether it heard the culprit's evening; the night's par, budget, liars and depths) is in the scratchpad's `puzzles/baseline.json`, and the breakdowns below are `puzzles/breakdown.py` over it. The two worlds agree within about ten points in every row (the JSON has them apart).

**A.1 The right culprit, on nights with one liar and with two** (Raw and Coddled always have one):

| strategy | Raw | Coddled | Poached one | Poached two | Soft-boiled one | Soft-boiled two | Medium one | Medium two | Hard-boiled one | Hard-boiled two |
|---|---|---|---|---|---|---|---|---|---|---|
| random suspect | 27% (n=150) | 38% (n=150) | 30% (n=54) | 22% (n=96) | 29% (n=34) | 27% (n=66) | 35% (n=31) | 19% (n=69) | 7% (n=15) | 14% (n=85) |
| the client’s pointer | 23% (n=150) | 28% (n=150) | 24% (n=54) | 31% (n=96) | 26% (n=34) | 21% (n=66) | 32% (n=31) | 23% (n=69) | 27% (n=15) | 19% (n=85) |
| anybody with the means | 42% (n=150) | 49% (n=150) | 37% (n=54) | 32% (n=96) | 29% (n=34) | 26% (n=66) | 19% (n=31) | 39% (n=69) | 27% (n=15) | 20% (n=85) |
| means and lists only | 100% (n=150) | 100% (n=150) | 65% (n=54) | 53% (n=96) | 62% (n=34) | 45% (n=66) | 61% (n=31) | 46% (n=69) | 33% (n=15) | 34% (n=85) |
| star follower | 100% (n=150) | 85% (n=150) | 74% (n=54) | 52% (n=96) | 50% (n=34) | 42% (n=66) | 58% (n=31) | 19% (n=69) | 33% (n=15) | 15% (n=85) |
| first clash | 100% (n=150) | 95% (n=150) | 93% (n=54) | 72% (n=96) | 100% (n=34) | 50% (n=66) | 90% (n=31) | 10% (n=69) | 13% (n=15) | 14% (n=85) |
| notebook reader | 100% (n=150) | 100% (n=150) | 100% (n=54) | 75% (n=96) | 100% (n=34) | 61% (n=66) | 100% (n=31) | 94% (n=69) | 100% (n=15) | 96% (n=85) |
| the tier’s trick | 100% (n=150) | 100% (n=150) | 100% (n=54) | 53% (n=96) | 100% (n=34) | 64% (n=66) | 100% (n=31) | 100% (n=69) | 100% (n=15) | 64% (n=85) |
| oracle | 100% (n=150) | 100% (n=150) | 100% (n=54) | 100% (n=96) | 100% (n=34) | 100% (n=66) | 100% (n=31) | 100% (n=69) | 100% (n=15) | 100% (n=85) |

**A.2 The right culprit without ever hearing the culprit's own evening** (share of all nights):

| strategy | Raw | Coddled | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|---|---|
| random suspect | 27% | 38% | 25% | 28% | 24% | 13% |
| the client’s pointer | 23% | 28% | 29% | 23% | 26% | 20% |
| anybody with the means | 42% | 49% | 34% | 27% | 33% | 21% |
| means and lists only | 100% | 100% | 57% | 51% | 51% | 34% |
| star follower | 0% | 30% | 15% | 2% | 28% | 17% |
| first clash | 0% | 2% | 0% | 0% | 1% | 1% |
| notebook reader | 27% | 10% | 9% | 4% | 78% | 25% |
| the tier’s trick | 0% | 7% | 1% | 2% | 11% | 20% |
| oracle | 0% | 0% | 0% | 0% | 0% | 0% |

**A.3 The right culprit on two-liar nights, by how the innocent answers when it's put to them** ("none" is a one-liar night):

| strategy | Raw none | Coddled none | Poached admit | Poached none | Poached refuse | Soft-boiled admit | Soft-boiled none | Soft-boiled refuse | Medium admit | Medium none | Medium refuse | Hard-boiled none | Hard-boiled refuse |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random suspect | 27% (n=150) | 38% (n=150) | 22% (n=58) | 30% (n=54) | 21% (n=38) | 35% (n=23) | 29% (n=34) | 23% (n=43) | 20% (n=30) | 35% (n=31) | 18% (n=39) | 7% (n=15) | 14% (n=85) |
| the client’s pointer | 23% (n=150) | 28% (n=150) | 22% (n=58) | 24% (n=54) | 45% (n=38) | 30% (n=23) | 26% (n=34) | 16% (n=43) | 33% (n=30) | 32% (n=31) | 15% (n=39) | 27% (n=15) | 19% (n=85) |
| anybody with the means | 42% (n=150) | 49% (n=150) | 29% (n=58) | 37% (n=54) | 37% (n=38) | 22% (n=23) | 29% (n=34) | 28% (n=43) | 40% (n=30) | 19% (n=31) | 38% (n=39) | 27% (n=15) | 20% (n=85) |
| means and lists only | 100% (n=150) | 100% (n=150) | 57% (n=58) | 65% (n=54) | 47% (n=38) | 43% (n=23) | 62% (n=34) | 47% (n=43) | 47% (n=30) | 61% (n=31) | 46% (n=39) | 33% (n=15) | 34% (n=85) |
| star follower | 100% (n=150) | 85% (n=150) | 64% (n=58) | 74% (n=54) | 34% (n=38) | 61% (n=23) | 50% (n=34) | 33% (n=43) | 23% (n=30) | 58% (n=31) | 15% (n=39) | 33% (n=15) | 15% (n=85) |
| first clash | 100% (n=150) | 95% (n=150) | 93% (n=58) | 93% (n=54) | 39% (n=38) | 78% (n=23) | 100% (n=34) | 35% (n=43) | 20% (n=30) | 90% (n=31) | 3% (n=39) | 13% (n=15) | 14% (n=85) |
| notebook reader | 100% (n=150) | 100% (n=150) | 81% (n=58) | 100% (n=54) | 66% (n=38) | 78% (n=23) | 100% (n=34) | 51% (n=43) | 90% (n=30) | 100% (n=31) | 97% (n=39) | 100% (n=15) | 96% (n=85) |
| the tier’s trick | 100% (n=150) | 100% (n=150) | 48% (n=58) | 100% (n=54) | 61% (n=38) | 65% (n=23) | 100% (n=34) | 63% (n=43) | 100% (n=30) | 100% (n=31) | 100% (n=39) | 100% (n=15) | 64% (n=85) |
| oracle | 100% (n=150) | 100% (n=150) | 100% (n=58) | 100% (n=54) | 100% (n=38) | 100% (n=23) | 100% (n=34) | 100% (n=43) | 100% (n=30) | 100% (n=31) | 100% (n=39) | 100% (n=15) | 100% (n=85) |

**A.4 The share of nights each strategy spent the whole budget:**

| strategy | Raw | Coddled | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|---|---|
| random suspect | 0% | 0% | 0% | 0% | 0% | 0% |
| the client’s pointer | 0% | 0% | 0% | 0% | 0% | 0% |
| anybody with the means | 0% | 0% | 0% | 0% | 0% | 0% |
| means and lists only | 0% | 0% | 0% | 0% | 0% | 0% |
| star follower | 3% | 100% | 100% | 100% | 100% | 100% |
| first clash | 15% | 23% | 7% | 2% | 7% | 78% |
| notebook reader | 27% | 65% | 86% | 89% | 18% | 78% |
| the tier’s trick | 100% | 100% | 44% | 40% | 78% | 40% |
| oracle | 0% | 0% | 0% | 0% | 0% | 0% |

**A.5 The right culprit by case type:**

| strategy | Raw lost-item | Raw lost-pet | Raw murder | Coddled lost-item | Coddled lost-pet | Coddled murder | Poached lost-item | Poached lost-pet | Poached murder | Soft-boiled lost-pet | Soft-boiled murder | Medium lost-pet | Medium murder | Hard-boiled lost-pet | Hard-boiled murder |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random suspect | 22% (n=50) | 24% (n=50) | 36% (n=50) | 30% (n=50) | 44% (n=50) | 40% (n=50) | 22% (n=50) | 24% (n=50) | 28% (n=50) | 24% (n=50) | 32% (n=50) | 20% (n=50) | 28% (n=50) | 16% (n=50) | 10% (n=50) |
| the client’s pointer | 26% (n=50) | 28% (n=50) | 16% (n=50) | 28% (n=50) | 24% (n=50) | 32% (n=50) | 34% (n=50) | 32% (n=50) | 20% (n=50) | 22% (n=50) | 24% (n=50) | 26% (n=50) | 26% (n=50) | 24% (n=50) | 16% (n=50) |
| anybody with the means | 38% (n=50) | 40% (n=50) | 48% (n=50) | 54% (n=50) | 36% (n=50) | 58% (n=50) | 44% (n=50) | 32% (n=50) | 26% (n=50) | 24% (n=50) | 30% (n=50) | 36% (n=50) | 30% (n=50) | 16% (n=50) | 26% (n=50) |
| means and lists only | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 56% (n=50) | 58% (n=50) | 58% (n=50) | 48% (n=50) | 54% (n=50) | 42% (n=50) | 60% (n=50) | 30% (n=50) | 38% (n=50) |
| star follower | 100% (n=50) | 100% (n=50) | 100% (n=50) | 80% (n=50) | 82% (n=50) | 92% (n=50) | 44% (n=50) | 60% (n=50) | 76% (n=50) | 48% (n=50) | 42% (n=50) | 28% (n=50) | 34% (n=50) | 18% (n=50) | 18% (n=50) |
| first clash | 100% (n=50) | 100% (n=50) | 100% (n=50) | 96% (n=50) | 92% (n=50) | 96% (n=50) | 66% (n=50) | 72% (n=50) | 100% (n=50) | 74% (n=50) | 60% (n=50) | 36% (n=50) | 34% (n=50) | 20% (n=50) | 8% (n=50) |
| notebook reader | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 86% (n=50) | 66% (n=50) | 100% (n=50) | 78% (n=50) | 70% (n=50) | 92% (n=50) | 100% (n=50) | 94% (n=50) | 100% (n=50) |
| the tier’s trick | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 66% (n=50) | 76% (n=50) | 68% (n=50) | 78% (n=50) | 74% (n=50) | 100% (n=50) | 100% (n=50) | 66% (n=50) | 72% (n=50) |
| oracle | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) | 100% (n=50) |

**A.6 Structural tells** (the deal's own shape, over the same 750 nights; `scratchpad/puzzles/probe/tells.mts`):

| tier | nights | two-hour window | crime at the later hour | two liars | innocent owns up | innocent refuses | owner-up found where they really were | the client points at the culprit |
|---|---|---|---|---|---|---|---|---|
| Raw | 150 | 0 | — | 0 | — | — | — | 35 (23%) |
| Coddled | 150 | 0 | — | 0 | — | — | — | 42 (28%) |
| Poached | 150 | 0 | — | 96 | 58 | 38 | 58 of 58 | 43 (29%) |
| Soft-boiled | 100 | 100 | 100 | 66 | 23 | 43 | 23 of 23 | 23 (23%) |
| Medium | 100 | 100 | 100 | 69 | 30 | 39 | 30 of 30 | 26 (26%) |
| Hard-boiled | 100 | 100 | 100 | 85 | 0 | 85 | — | 20 (20%) |

**A.7 Reading the strategies' routes.** `--trace` prints each strategy's questions and the name it gave, night by night. Medium murder 1 (dealt), for example: first clash asks the scene, the bar's list and Stannard (the innocent, who claims the bar) and names Stannard; the notebook reader goes on through Brauer, Vitale, the put to Stannard, the rooming house's list and the keeper's, and names Doyle, whose evening it never asked; the tier's trick asks Doyle last, finds the passer-by's remark against her and files a perfect report.

