# 34 — Building a case the way sudoku is built

*Research for the redesign, 2026-09-24. No code changed. It reads the designer's model against how sudoku, logic-grid puzzles, LSAT games and detective games are made, and turns that into a pipeline a builder can follow.*

> The designer: "At bottom, this is just sudoku. We start with a solved grid, and then work backwards to create the steps to deduce its solution. … at lower difficulties there should be multiple paths available that overlap and allow you to deduce the answer. At higher difficulties it narrows."

The literature agrees with the designer. The idea worth taking whole is that **a puzzle is a set of clues that breaks every rival solution**. Difficulty is then two things: which techniques the breaking needs, and how many independent ways each rival is broken. Dashiell has most of the parts already. What it lacks is the middle: naming the rivals, counting the routes that break each one, choosing routes by tier, and handing the result on as a graph.

## 1. What the puzzle makers do

### Sudoku

**Start from a solved grid, then dig.** Fill a complete grid, remove givens one at a time, and put a given back whenever the solution stops being unique ([Li et al.](https://zhangroup.aporc.org/images/files/Paper_3485.pdf)). Tatham calls this solver-based generation, and it can't fail once you hold a solution ([Tatham, developer docs §6.2](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/devel/writing.html)). Digging in symmetric pairs is an aesthetic rule, not a logical one.

**Uniqueness is a hitting-set problem.** An *unavoidable set* is a group of cells whose digits can be shuffled into a second valid solution. A proper puzzle has at least one given in every unavoidable set. That's how the 17-clue minimum was proved ([McGuire et al.](https://ar5iv.labs.arxiv.org/html/1201.0749)). For Dashiell, read "unavoidable set" as **rival**: a different answer the player has to rule out.

**Difficulty comes from technique, not from the number of givens.** Graders solve the way a careful person does: the cheapest technique that makes progress, repeated. The techniques form a ladder, from singles through pairs and wings to forcing chains. Sudoku Explainer rates a puzzle by **the hardest step on the cheapest path**, so one hard step and fifty rate the same ([SE guide](https://www.suuudokuuu.com/guides/sudoku-difficulty-rating)). Pelánek checked ratings against thousands of hours of real solving and found two sources of difficulty ([Pelánek](https://arxiv.org/html/1403.7373v1)):

- how complex each step is;
- the **dependency structure**: whether several easy steps are open at once, or each must wait for the one before.

The number of givens correlates only about 0.25 with solve time.

**Easy puzzles are wide, and hard ones bottleneck.** An easy puzzle has many singles open at once, so a solver can't get stuck. A hard one narrows to a point where only one advanced step makes progress. Stuart's "magic cells" count the single cells that, revealed, make the rest trivial. Many of them make a puzzle easier than its hardest step suggests ([SudokuWiki](https://www.sudokuwiki.org/A_New_Metric_for_Difficult_Sudoku_Puzzles)).

**Controlling the path.** To make a puzzle need technique X, accept it only if a solver limited to X finishes it and a solver limited to X−1 does not ([Tatham §6.2](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/devel/writing.html)). Tatham warns that high levels take many attempts. Hand setters start from a **seed**, the pattern they want solved. Thomas Snyder's GM Puzzles series describes placing the seed, letting a computer fill the rest, and keeping the candidate with the best flow into and out of it ([GM Puzzles](https://www.gmpuzzles.com/blog/2025/07/a-story-of-self-setting-sudoku-4-75-by-thomas-snyder/)). Nikoli's case for hand-made puzzles is that the setter thinks about how the solve feels: an entry point, and a path with flow ([Nikoli](https://www.nikoli.co.jp/en/puzzles/sudoku/why_hand_made/)).

### Logic-grid puzzles (Zebra, Dell)

Generators pick a solution, generate every true clue, then remove clues at random while a solver confirms the answer is still unique. They stop when no clue can go, so every clue left is needed ([ZebraLogic](https://arxiv.org/pdf/2502.01100)). Research generators control difficulty with a human-style inference calculus. Bogaerts, Gamba, Claes and Guns explain a solve as a sequence of steps. Each step is a minimal set of clues and known facts that forces a new fact, with a cost by what it used, and the cheapest open step always comes next ([Bogaerts et al.](https://arxiv.org/abs/2006.06343)). That is the right shape for Dashiell's deduction record. Clues by Sam, a daily people-grid game, is built half by hand and half by a solver that checks the path. It releases clues as the player deduces, refuses illogical moves and allows every logical one ([interview](https://www.wericmartin.com/spotting-criminals-is-a-daily-challenge-with-clues-by-sam/)).

### LSAT logic games

A game had a setup, four to six short rules and a set of questions. The coaching advice is consistent:

- inferences come from rules interacting, never from one rule alone ([Manhattan Prep](https://www.manhattanprep.com/lsat/blog/logic-games-inferences-demystified/));
- a strong solver finds the two or three rules that touch all the rest;
- the hardest games have a dividing line that leaves two or three templates to try ([PowerScore](https://blog.powerscore.com/lsat/lsat-logic-games-how-and-when-to-create-templates/)).

Questions add local hypotheticals ("If X is third…"), a hypothesis test the writer chose for the solver. (LSAC dropped the section in 2024, [US News](https://www.usnews.com/education/blogs/law-admissions-lowdown/articles/what-to-know-about-the-end-of-lsat-logic-games).) The lesson for Dashiell: each rule weak on its own, and a few rules that link everything.

### Detective games

- **Obra Dinn** checks fates in threes, so no single guess can be confirmed ([Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn)). Each identity has several kinds of evidence, so there are several ways in, and groups cascade once one member is known ([Intermittent Mechanism](https://intermittentmechanism.blog/2021/03/17/return-of-the-obra-dinn-clues-revelations/)). The known weakness is the endgame, where elimination and the checker allow guess and check ([Intermittent Mechanism](https://intermittentmechanism.blog/2024/05/21/confirmation-in-the-return-of-obra-dinn/)).
- **Golden Idol** was built so players "arrive at the same conclusion by observing different clues," with a few deliberate misdirections. Its panels say "two or fewer slots are incorrect," which guides without confirming. The designers couldn't un-know the answers, so they playtested each scenario five to seven times ([Game Developer](https://www.gamedeveloper.com/design/case-of-the-golden-idol)).
- **Her Story** was tuned with software that flagged clips too easy or too hard to reach ([PocketGamer.biz](https://www.pocketgamer.biz/making-of-her-story/)), and "80-90% is probably sufficient" to solve it ([Emily Short](https://emshort.blog/2015/06/24/her-story-sam-barlow/)). That is designed redundancy.
- **Procedural mysteries** mostly simulate and hope. Shadows of Doubt allows many routes, but none of them is designed ([Wikipedia](https://en.wikipedia.org/wiki/Shadows_of_Doubt)). Mohr, Eger and Martens guarantee that every other suspect can be eliminated ([EXAG 2018](https://ceur-ws.org/Vol-2282/EXAG_113.pdf)). Eger's survey finds mystery logic "incomplete" and most generators still prototypes ([AIIDE 2020](https://ojs.aaai.org/index.php/AIIDE/article/view/7432)). M9 is already past this.

## 2. Where Dashiell stands

M9 (`docs/20-m9-gen-notes.md`) is **generate and reject**. It simulates the truth, builds a pool where everyone can be asked about everyone, and runs the solver over everything findable. It rejects the case if the culprit is reached too shallow, a weaker route exists, or a lie stands. Then it prunes in halves to the cheapest set that still solves, which is par. It works, but:

- **It counts depth, not technique.** Depth 5 might be five easy joins or one hard one. The solver's `candidates()` already groups inferences by rule type, so tagging each conclusion with a technique is cheap.
- **Redundancy is never measured or chosen.** "No weaker route" is a rejection test, and nothing sets how many routes each rival should have.
- **Rejection is expensive where it matters.** Hard-boiled takes about 75 attempts.
- **Par is one minimal set.** It says nothing about the other routes a player might take.

Keep the truth simulation, the fact pool, the `Why` records (premises, depth, hypothesis), the prune-in-halves search in `select.ts`, and "cleared by one clue," which is Stuart's magic cells under another name.

## 3. The recommended pipeline

### Step 1. The solved grid

The truth simulation, as now, with one change: plant the **seed** first, Snyder-style. The tier picks its signature technique and the arrangement makes it possible, as `schedule.ts` already does for Hard-boiled's description pair. Make that the rule at every tier.

### Step 2. Targets and rivals

The case type names the **targets**, the cells the report asks for. Only those need to be unique. The rest of the grid may stay open, as in an LSAT game, which makes digging much easier.

| case type | targets |
|---|---|
| murder, robbery | the culprit; the half hour (from Soft-boiled up); the crime column (from Medium up) |
| lost pet, lost item | who; when; where it is now; why (a tie or a confession, off the grid) |
| affair | where the suspected person was; with whom; when; the column at that half hour (from Medium up) |

A **rival** is an alternative value for a target cell that the map and givens still allow: "Grasso at the scene at 10:00," "the crime at 10:30," "Mrs. Coyle with the choirmaster at 9:00." The designer's "different grids that can be arrived at" are these rival worlds. The case is solved when every rival is broken.

**Uniqueness under the lie rule.** Check it with exactly the axioms the player is taught: one place at a time, travel, statements about others are true, a self-account span is wholly true or wholly false, and only self-claims and a companion's shared claims can be false. A generator invariant the help page doesn't state must never do work. For each rival, ask whether any world satisfies every hard fact and the rival. Rivals are single cells, so this is small. The check must be complete. The human-style solver can be incomplete and still rate well, but it must never be what declares "unique." That also closes the soft-account weakness in gen-notes §14.

### Step 3. The full candidate pool

Generate every true fact the truth supports, as now. Tag each with its source (person, room, search), its cost to reach, and the techniques it can feed.

### Step 4. Routes per rival

For each rival, find its **routes**: the minimal sets of facts that break it, with the techniques used. This is minimal-unsatisfiable-subset (MUS) extraction, the same machinery Bogaerts et al. use. Two measures:

- **Disjoint routes, R(r).** Find a route, delete its facts from the pool, and find another. Repeat. This is a lower bound, and fast.
- **Distinct routes, M(r).** Enumerate minimal routes up to a cap of about 8, with an off-the-shelf method such as MARCO ([Liffiton et al., Constraints 2016](https://link.springer.com/article/10.1007/s10601-015-9183-0)). Use this for measuring overlap.

A fact is **critical** when removing it from the findable set leaves some rival unbroken. Critical facts are the bottlenecks.

### Step 5. Choose the findable set: a hitting set with a multiplicity

1. **Pick routes.**
   - Low tiers: for every rival, keep k disjoint routes, all using techniques at or below the tier.
   - High tiers: for the **key rivals** (the one or two innocents nearest the scene, and the crime's half hour), keep exactly one route, and it must use the tier's signature technique. Other rivals keep one or two routes.
2. **Dig the rest at the level of the world, not the page.** Anyone can be asked anything, so a fact can't just be hidden. It is removed by changing who saw it: a namer becomes a stranger, a watcher steps off the door, an anchor goes unheard. Each dig reruns the pool, because removing a sighting can **add** a fact: a posted watcher who didn't see Hanrahan swears she wasn't there. Keep a dig only if every rival still meets its quota and no route below the tier's techniques appears.
3. **Spread.** The analog of symmetric digging: ink on every suspect's row and a paying question in every room. It's for fairness and feel, not logic.
4. **Add back extraneous facts by class** (§5).

### Step 6. Rate

Run the solver cheapest technique first, recording each step's technique, and report:

| measure | meaning |
|---|---|
| **peak** | the hardest technique on the cheapest path (SE's rating) |
| **load** | the number of steps at or above the tier's signature technique (SE's blind spot) |
| **width** | the number of new conclusions open at each point along the reasoning player's path (Pelánek's dependency), as a minimum and a median |
| **routes** | R(r) for every rival, and the number of critical facts |
| **backdoors** | single findable facts that break a key rival alone (the existing "cleared by one clue") |

**Accept** when the peak equals the tier's technique, the case is solvable with techniques up to that level, and it is **not** solvable with techniques one level down. This is Tatham's rule, and it replaces "reached too shallow" and "no weaker route."

### Step 7. Output the deduction graph

The generator's product is an **AND/OR graph**. Leaves are facts. Inner nodes are conclusions, such as "Grasso not on the third floor at 10:00" or "Hanrahan's account for 10:00 is false." Each conclusion has one or more premise sets (the OR), each listing what it needs (the AND) and its technique. Targets are the sinks. Low tiers have many ORs, and high tiers are mostly ANDs. The `Why` records already hold the edges for one route each. The OR branches come from step 4. This graph is what a book is chosen to fit and what sheets carry (§6).

## 4. The technique ladder

The ladder is ordered by what makes a step hard: how many facts it joins (Pelánek); whether it leans on a rule the notebook doesn't print (implicit rules sit dormant); whether it eliminates over a set (hidden is harder than naked); whether it runs backwards through a negation (modus tollens is reliably harder than modus ponens, [Wason selection task](https://en.wikipedia.org/wiki/Wason_selection_task), [an ERP study](https://pubmed.ncbi.nlm.nih.gov/24726487/)); and whether it must suppose something and retract it.

| # | technique | what the player does | inputs | sudoku analog | first tier |
|---|---|---|---|---|---|
| T1 | **Read-off** | A named sighting or evidence puts someone in a cell, or strikes one. | 1 fact | naked single | Raw |
| T2 | **Corroborated account** | Their own account plus one hard sighting in the same span means the span stands. | 2 facts + the lie rule | hidden single | Raw |
| T3 | **Anchor timing** | "When the El went over" plus when the El ran gives the cell. | 2 facts, from two sources | a single found by cross-hatching | Soft-boiled |
| T4 | **Absence and count** | "Nobody but Marchetti," or "two people and nobody else," with others placed: everyone else is out, or the last one is in. | 2+ facts, over a set | hidden single in a unit | Poached |
| T5 | **Travel** | Placed across the neighbourhood a half hour before or after, so not at the scene now. | 1–2 facts + the map (implicit) | box–line interaction | Soft-boiled |
| T6 | **Together and apart** | One row's placement carried to another row, or struck from it. A companion's "together" is soft. | 2 facts, linked rows | pairs | Soft-boiled |
| T7 | **Description linking** | "Somebody who fits…" plus every other match placed elsewhere names the one it was. | 3+ facts, elimination over a set | naked or hidden pair and triple | Medium |
| T8 | **Lie caught** | A hard fact, or a chain, contradicts an account span. (a) direct: one fact. (b) chained: needs a conclusion from T3–T7. Then confront, and a confession adds facts. | 2+ | a cell left with no candidates | (a) Poached, (b) Medium |
| T9 | **The conditional** | "Anybody there knew X," and this person didn't know X, so they weren't there. | 2 facts, modus tollens | XY-wing | Hard-boiled |
| T10 | **Hypothesis test** | Suppose a placement, propagate, and reach a contradiction, as in the two-descriptions pigeonhole. | a whole chain | forcing chain, Nishio | Hard-boiled |

The order matches M9's tier dials (anchors from Soft-boiled, descriptions from Medium, the hypothesis at Hard-boiled), so it recasts them rather than replacing them. Two judgment calls for the designer. **Travel sits above anchor** because it rests on the map, which the notebook doesn't print; if the grid draws the map, move it down. **Lie caught is split.** A direct catch is cheap, one fact against one account. A chained catch is hard. Neither does anything alone, since innocents lie too. A catch pays only through the confrontation after it.

Each technique should carry a cost, like SE's scale: T1 = 1, T2 = 1.5, T3 = 2, T4 = 2.5, T5 = 3, T6 = 3, T7 = 4, T8a = 2.5, T8b = 5, T9 = 5.5, T10 = 7. A case's peak is the highest cost on its cheapest path.

## 5. Redundancy and the three kinds of extra

**Measuring redundancy.** For each rival r, R(r) is its number of disjoint routes, and **overlap** is the average share of facts two of its minimal routes have in common. The case's **width** is Pelánek's count of open steps. Suggested bands, to tune after the first worked example:

| tier | peak | R(r), key rivals | R(r), others | critical facts | min width | load |
|---|---|---|---|---|---|---|
| Raw, Coddled | ≤ T2 | ≥3 | ≥2 | 0 | ≥3 | — |
| Poached | T4 or T8a | ≥2 | ≥2 | 0 | ≥2 | ≤4 |
| Soft-boiled | T5 or T6 | 2 | ≥1 | ≤1 | ≥2 | ≤4 |
| Medium | T7 or T8b | 1–2 | ≥1 | 1–2 | 1 at one point | ≤4 |
| Hard-boiled | T9 or T10 | 1 | 1–2 | 2–3 | 1 at the bottleneck | ≤3 |

The load caps are deliberate. Hard should mean **narrow and deep, not long**.

**The designer's three kinds of extraneous information:**

1. **No new fact (flavor).** Deck and sheet text: the room, the drink, the joke. It never occupies an action alone once past Coddled, because a paid action with no fact is the diagnosis's dead button. It rides on pages that carry facts.
2. **Facts that go nowhere (dead ends).** True, reachable facts in no route to a target: a secret's other half hours, sightings far from the crime, a tie with no bearing. These are Golden Idol's misdirections. They must not create a route below the tier's techniques, and they must look like route facts in length, form and source, so their shape is no tell. On the grid they touch other columns, so a reasoning player can set them aside cheaply. Keep the dose roughly flat across tiers: more makes a case longer, not harder (§7).
3. **Facts that go somewhere with a lot of overlap.** These are the **redundant routes**: extra ways to break a rival that is already broken. At low tiers they are most of the pool, and they are why a beginner can't get stuck. At high tiers they are pruned from the key rivals and kept for the others, so the case is wide everywhere except at its bottleneck. Overlap is the dial: a second route sharing most of the first's facts adds little safety, and a disjoint one is a whole second way in.

## 6. From the graph to a book (brief)

A book is chosen to fit the graph's shape, and its acts are cuts through the graph:

| act | where it falls in the graph |
|---|---|
| the hook | the givens |
| the widening | every leaf reachable from them, in any order |
| the turn | the first T8 node, the first lie caught |
| the narrowing | the bottleneck, where width is 1 |
| the report | the targets |

The graph's shape suggests the book: one big lie (a single T8b bottleneck), the alibi web (mostly T6), the stranger (T7) or the clock (T3).

**Sheets carry facts in joined pairs.** A telling sheet whose holes deliver both halves of a route, such as the anchored sighting and the hint of who kept the time, is what "sheets with appropriate interconnections" means. Decks fill the rest. The player may take any open node in any order. An act moves on when its nodes are held, not by page count. Chain length is deferred until the designer sees a worked example.

## 7. Pitfalls from the literature

1. **Unique is not the same as the intended path.** Players find the cheapest route, not the planned one, so count routes over the **whole** findable pool, confessions included, not only over par. Watch for meta-reasoning. Sudoku solvers exploit "the puzzle must be unique"; a Dashiell player will exploit "the game wouldn't mention it unless it mattered." Dead ends and route facts must look alike, and the client and monologue must not leak (diagnosis rank 6).
2. **An incomplete or non-monotonic rater.** Rate with the human-style solver, but prove uniqueness with the complete rival check (§3, step 2). Otherwise a soft account taken on trust can pass a case that isn't fair.
3. **Hardest step only.** SE's blind spot. Report load and width beside the peak.
4. **False difficulty from volume.** The number of givens hardly predicts difficulty (about 0.25, Pelánek). Hard-boiled's par of 10–22, and 12–28 at Over easy, risks making hard mean long. Par should grow more slowly than peak.
5. **Tedium at the top.** Repeated forcing chains feel like trial and error. Keep one hypothesis test per case, as the climax; the load cap enforces it.
6. **A bottleneck with a trivial remainder.** Stuart: one hard step and the rest trivial is not satisfying. Aim for a curve: a wide break-in, narrowing through the middle, the bottleneck near the turn, and a cascade after it, like Obra Dinn's groups falling together.
7. **Guess and check.** Obra Dinn's endgame is brute-forced through its checker. Confront is Dashiell's checker, since "That doesn't touch anything I told you" is an answer too. The half hour it costs is the guard, so never let it answer for free.
8. **Rejection at high tiers.** Tatham warns the top level takes many tries; M9 takes about 75. Planting the seed and digging toward a quota converges where drawing and rejecting doesn't.
9. **Nobody can un-know the answer.** Golden Idol playtested each case five to seven times. Here: synthetic players limited to each rung of the ladder, plus reading full runs.

## 8. What to build first

1. Tag every solver conclusion with its technique, and order propagation by technique cost.
2. Enumerate rivals per case type, and add the complete uniqueness check.
3. Measure R(r), critical facts, width and load on today's generator, 200 seeds per tier, before changing anything.
4. Build one worked example per tier by hand, as a graph with its routes, for the designer, before settling chain length.
5. Then replace the rejection tests with route selection and world-level digging.
