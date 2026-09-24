# 36 — The v2 slice: notes

*Branch `v2-slice`, off `main` after the architecture (docs/35) and the research (docs/34). The designer: "I think this feels right, but I want to play to see." This is a slice to play, beside the current game, behind a flag.*

## How to play it

- **In the book:** add `?engine=v2` to the URL (`/?engine=v2`, or `/?seed=3&d=2&t=4&engine=v2` for the worked example). Every case opened from that page is dealt and paged the v2 way; the flag rides in the URL and in the save, so a reload or "Go back to it" resumes a v2 night as a v2 night. The title page says it is the new engine and opens every tier to it. Without the flag, nothing changes.
- **Reading a run:** `npm run read -- --engine v2 --seed 3 --tier 4 --no-choices`.
- **The graph of one case:** `npx tsx scripts/v2-stats.ts --seed 3 --tier 4` prints its rivals, their routes, every step with its technique and act, the bottleneck, the book and the fact classes.
- **The measures:** `npx tsx scripts/v2-stats.ts --seeds 50 --tiers 0,2,4,5 --why`, and the design test `npx tsx scripts/diagnose-play.ts --design --seeds 50 --configs T0,T2L2,T4L2,T5L2 --engine v2`.

v2 deals **murders and lost pets**, two to one, at every tier (Raw, Poached, Medium and Hard-boiled were the ones asked for; Coddled and Soft-boiled deal too). A seed whose v1 classic draw is a murder keeps it, so seed 3 at Medium is still the Sirkin case.

## In one paragraph

The truth is built as before and the puzzle is built on it the way a sudoku setter digs a solved grid. The solver now tags every conclusion with its technique (T1 read-off to T10 hypothesis, with the research's costs) and commits the cheapest first; held to a rung of the ladder, it never uses a dearer one. The report's targets name the rivals (every innocent at the scene when it happened; every other half hour in the window), and a complete search under the taught rules checks that none of them has a world. Routes per rival are found by taking a route's facts away and looking again. Starting from everything the truth supports, the case is dug at the level of the world — a watcher who wasn't counting, a stranger nobody noticed, a witness who never knew the name (the acquaintance edge is cut, so asking gets "never heard of him", and nothing is hidden) — until it can't be solved one rung down (Tatham's rule), then the key rivals are narrowed to the tier's band, an innocent who lies about the half hour is cleared by what they give up once caught where the world allows, and at the low tiers a witness who shared a room with an innocent turns out to know them by name. The output is a deduction graph (facts, steps with premises and techniques, rivals with routes, the bottleneck, the lies). A book is chosen by the technique that breaks the culprit's word (The Count, The Stranger, The Alibi Web, The Clock, The One Who Lied), and the pages carry it: the title and chapter one on page one with the running gag, a chapter per act as the night reaches it, the motif planted at the scene, the tell planted by the page that brings the book's piece, the turn as a chapter-break recap written from the notebook ("Two people had told me they were at the third floor at half past eight. Rafferty had counted one."), and the ending with the client's question answered, the motif and the gag.

## What changed where

| file | what |
|---|---|
| `src/gen/logic/solver.ts` | `Tech`, `TECH_COST`; every conclusion's `Why` carries its technique, the peak under it, the premise whys, a step key and what it placed; `techniques` (cheapest first) and `maxCost` (a rung of the ladder) on the problem. v1 never sets either, so v1 solves exactly as before. |
| `src/gen/v2/puzzle.ts` (new) | Stage 2: rivals, routes R(r), the dig, Tatham, narrowing, lies on the road, widening, critical facts, backdoors, the graph and its stats. |
| `src/gen/v2/unique.ts` (new) | The complete uniqueness check: search with propagation under the taught rules (a self-account span is wholly true or wholly false; what anybody says of somebody else is true; one place at a time; travel; exactly one at the scene), with a node budget that reports `unknown` rather than guess. |
| `src/gen/v2/graph.ts` (new) | The deduction graph's types. |
| `src/gen/v2/select.ts` (new) | The findable set from the puzzle's core, then M9's machinery reused: par (now also holding the culprit's word and what breaks it), dead-end secrets, leads, the walk, the summary, the confrontations; the dug acquaintance edges written back into the world. A par ceiling (the tier's). |
| `src/gen/v2/book.ts` (new) | Stage 3: the book chosen from the graph, its acts as cuts through it, the motif and the gag. |
| `src/gen/generate.ts` | `GenerateOptions.engine`; v2's mix (murder and lost pets); v2 runs v1's selection first as the gate for the solved grid, then the puzzle stage on its own stream; `Case.engine`, `Case.v2`; a call more of slack from Medium up. |
| `src/game/v2/book.ts` (new), `content/books.json` (new) | Stages 4–5 on the page: chapters, the gag, the motif, the tell, the turn, the ending. |
| `src/game/reducer.ts`, `scoring.ts` | The book pass after every page and on page one; the closing page's book lines. |
| `src/game/types.ts`, `storage.ts`, `profile.ts`, `src/ui/book.ts`, `src/ui/book.css`, `src/cli/read.ts` | `RunState.engine` and `.v2`, the `chapter` voice, the flag in the URL, the pick, the save and the CLI. |
| `src/game/m9.ts` | No crime column under v2. |
| `scripts/v2-stats.ts` (new), `scripts/diagnose-play.ts` | The measures; `--engine v2` on the design test. |
| `test/v2-slice.test.ts` (new) | 12 tests: the flag, v1 untouched, the mix, Tatham and the complete check at four tiers, the true world found and no rival world, seed 3 as the worked example, the book on the page, the closing, the reader lint over v2 runs, every book line fills. |

## Stage 1–2: the puzzle

### The ladder

| # | technique | where the solver sees it | cost |
|---|---|---|---|
| T1 | read-off | a named sighting or a strike; the coroner; a description only one person fits | 1 |
| T2 | corroborated account | a span of somebody's own account stands on one hard sighting inside it (or on being clear of the scene at the half hour) | 1.5 |
| T3 | anchor timing | a sighting "when the whistle went" once the whistle's time is held; the victim seen alive at an anchor | 2 |
| T4 | absence and count | "nobody but…", "two people and nobody else" | 2.5 |
| T5 | travel | across the neighbourhood in a half hour | 3 |
| T6 | together and apart | a companion's claim carried or struck | 3 |
| T7 | description linking | "one of these was there", narrowed to one | 4 |
| T8a / T8b | lie caught, straight off / down a chain | a confession, once the claim is struck by a step of peak ≤ T2 / dearer | 2.5 / 5 |
| T9 | the conditional | anybody there knew it; this one didn't | 5.5 |
| T10 | hypothesis test | a probe that ends in a contradiction | 7 |
| E | elimination | the one left at the scene; a half hour nobody could have been there | 1 |

The rung each tier is solved at, and the rung below it that must *not* solve it (Tatham): Raw and Coddled ≤ T2 (no floor); Poached ≤ 2.5, not ≤ 1.5; Soft-boiled ≤ 3, not ≤ 2.5; Medium ≤ 5, not ≤ 3; Hard-boiled ≤ 7, not ≤ 5. Measured on today's (v1) cases first, 30 seeds each: Raw solves at T2 (30/30); Poached at T2 28 of 30 (it doesn't need its own rung); Medium at T4 21, T5 1 and T7 8 of 30; Hard-boiled needs T10 in every case. So v1's Poached and Medium mostly fail Tatham's rule, which is what the dig is for.

### Targets and rivals

Murder: who, when (from Soft-boiled up, where the coroner gives an hour), and how, the way in and why as the tier's proof legs ask — read off facts. Lost pet: who, when, where it is now (the signature), why. There is no crime column: `columnAsked` is false under v2 and the report form doesn't show it. The rivals are every innocent at the scene when it happened, and every other half hour the givens leave open. **Key rivals** are the two innocents nearest the scene at the half hour (liars first on a tie) and the half hour itself.

### The complete check

`unique.ts` asks, for each rival, whether any world satisfies every fact held (the givens, the findable set, and the confessions whose lies the case lets be broken) under the taught rules, with the rival forced. It propagates (travel, counts, descriptions, anchored sightings, together/apart, spans wholly true or wholly false, exactly one at the scene) and branches on the cell with the fewest places. Over 200 cases (50 seeds × four tiers) it found no rival world in any accepted case and ran out of budget on none. A test also checks that it *does* find the true world.

### The dig, in order

1. **Everything first.** The whole pool: all testimony, all accounts, every description, watch, anchor timing, conditional, the kept M7 facts and the signature. It must solve at the tier's rung, truly, and every lie that has to break must break (an innocent's two ways, the culprit's one).
2. **Tatham.** Pick a key rival; while the case solves one rung down, take away a fact on that rival's cheap route — a sighting by name first (the edge is cut), then an anchor's timing, the conditional, a description, a count — keeping the dig only if the case still solves at the rung, the rival is still broken at the rung, and the lies still break. If that rival can't be made to need the rung, try the next. (Hard-boiled's arrangement already needs a hypothesis test; its bottleneck is the rival that stands one rung down.)
3. **Lies on the road** (Poached up). An innocent who lies about the half hour is cleared by their confession where the world allows it: their other ways out are dug. This is the worked example's F.
4. **Narrow** the key rivals to the band's most (Soft-boiled the bottleneck only; Medium and Hard-boiled every key rival), digging the facts of the second route that the first doesn't share.
5. **Widen** at Raw to Poached, where no sighting is timed by an anchor: somebody who shared a room with an innocent inside their own account turns out to know them by name — never at the half hour itself, so nobody is cleared by one line.
6. **Accept**: the case solves, the lies break, Tatham holds, the complete check finds no rival world, and par is under the tier's ceiling.

**Simplified, and said so:** stage 1 is v1's solved grid — v1's selection runs first as the gate on each attempt (that is what keeps seed 3's night the Sirkin case), so v1's arrangement rules plant each tier's seed and v1's rejections still cost attempts at Medium and Hard-boiled. A dug board fact (a count, a stranger, an anchor's time) is a watcher who wasn't counting, a witness who didn't notice, a clock nobody read — a world-level story for a fact taken off the table rather than a change to the schedule. Widening can only add a name, never a sighting; where the grid gives an innocent one witness, R stays 1.

### The deduction graph

Leaves are clue ids. A step is one solver conclusion group (every value struck by one premise shares a key): a placement worked out, a strike, a half hour ruled out, a lie caught, a confession, who, when, a leg. Read-offs fold into the step above them. Each step has its technique, the peak under it, its depth, its facts, the steps it needs, and every leaf under it. Rivals carry their disjoint routes; the graph names the bottleneck rival, the bottleneck step (the dearest step under it), the lies in the order a player could first catch them, and a class for every findable fact: `given`, `route` (on a first route or under a target), `overlap` (only on a later route) or `dead-end`.

Seed 3 at Medium (`npx tsx scripts/v2-stats.ts --seed 3 --tier 4`):

- Crowninshield: R = 4, via T2 (her account and a sighting inside it).
- **Vitale: R = 2, via T7 — the bottleneck.** Rafferty's "a man in his thirties, known by sight" on the third floor from half past eight, with Rafferty's own word that Vitale wasn't there then, puts Steinbach on the stairs (T7); a second stranger at the speakeasy is then Vitale.
- Steinbach: R = 2, via T7 (the same stranger on the stairs).
- Hauck: R = 2, via T1 (Hargrove had her at the bar by name) and the count.
- The half hour: R = 2.
- The count at the third floor at half past eight (one person) strikes Marchetti's claim of the third floor once Steinbach is placed there: Marchetti's lie, T8b.
- Peak T7, load 2, width 3 at the narrowest and 5 at the median, no critical facts, Tatham holds, unique. Dug: one board fact and three edges. Par 12 (the oracle's walk), budget 19.
- The book: **The Count** — the step that catches the culprit's word is the count. Motif: the whistle off the river. Gag: the office's own frost.

That is the worked example's shape: the stairs count (T4 + T7), the room placed by Hargrove, the lies falling to the count, Marchetti with nowhere to stand. Differences: Rafferty knows Hauck by name here, so Hauck's third-floor story is broken by Rafferty's word straight off (T8a) as well as by the count; Vitale is placed by a second stranger rather than by Hargrove's count; and the worked example's seven steps come out as about a dozen solver steps, most of them folds of the same three pieces.

## Stage 3: the book

The book is named by the step that breaks the **culprit's** word — the lie with nowhere to stand is the night's story — and where that is a plain read-off, by the bottleneck's technique; at Raw and Coddled it is always The One Who Lied.

| book | the piece that breaks the culprit's word | its tell | turn chapter |
|---|---|---|---|
| The Count | a head count or an empty doorway (T4) | "Rafferty counted heads the way other people count their change: twice, and out loud." | The Count |
| The Stranger | a description tied to a face (T7), or two tested (T10) | "A face with no name is half a fact…" | The Stranger |
| The Alibi Web | together and apart (T6), a companion's claim | "Company is the best alibi there is, as long as the company agrees." | The Alibi Web |
| The Clock | an anchor (T3), the conditional (T9), travel | "Everybody on the street kept time by the whistle, whether they meant to or not." | The Clock |
| The One Who Lied | a sighting read straight off | — | The One Who Lied |

The acts are cuts through the graph: the hook (what the givens settle), the scene (the half hour and the legs the scene gives), the widening (every step not in another act), the turn (the first lie a player can catch, and the lies the same step catches with it), the narrowing (the confessions, the other lies, who), the report (the targets). On the page an act opens when the night reaches it, in whatever order the player takes the steps: the scene the first time the scene is reached, the widening on the page after, the turn on the first page the notebook holds everything that breaks somebody's own account, the narrowing on the page after the turn.

**Night-long roles.** The motif is the anchor nearest the crime's half hour (a room's anchor gives way to one the whole street hears): planted at the scene with a line of its own, called back at the turn where the notebook has its hour, and given the last word of the closing page. The running gag is the office's: if the office's own deck already planted one (the frost on the window, the radiator), the book takes that one up; otherwise it plants its own on page one. The tell is planted by the page that brings the piece the book is about, only while it can still set the turn up, and paid off at the turn unless the turn's own line already said it.

**The turn** writes the lie as two things side by side, never as a verdict — the same rule M12's recap keeps: "Two people had told me they were at the third floor at half past eight. Rafferty had counted one." When the first lie a player catches falls to something other than the book's own piece, the chapter is "Something That Didn't Fit" and the closing line is the plain one: a Count book whose first lie fell to a sighting doesn't talk about counting yet. The turn takes the place of M12's recap on that page.

**Simplified:** the acts other than the turn have a heading and no recap of their own (M12's recaps still come at their own triggers). Books are five shapes with one line set each; there is no book-specific sheet for the confrontation or the confession — those pages are M12's, which already stage "All right. I was at the Velvet Room. I was selling things that were stolen." well.

## Stage 4: pages from the graph

The player chooses freely, as before: every page has its choices, costs, the grid, confront with the free second pick, the rundown. What a question can return is what the dig left in the world, which is the designer's three kinds of extra by construction:

- **no new fact**: "never heard of anybody called Vitale", where the dig cut a name; "couldn't tell you", where there was nothing to see;
- **facts that go nowhere**: testimony on no route, the innocents' secrets (dealt as before, about eight facts a night whatever the tier);
- **facts that go somewhere with overlap**: a rival's second and later routes.

Per case, on average (50 seeds a tier): route facts / overlap facts / dead ends in the findable core are about 5 / 1 / 33 at Raw, 9 / 3 / 48 at Poached, 16 / 5 / 116 at Medium and 19 / 7 / 175 at Hard-boiled. (Most of the dead ends are the one-clue-per-pair testimony the engine has always dealt: anybody can be asked about anybody.)

**Simplified:** a page carries its steps through the tell (the step the book is about) and the turn (the lie step), not through a sheet chosen per step on every page; the rest of each page is v1's planner and sheets, unchanged.
