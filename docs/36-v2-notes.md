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
| `test/v2-slice.test.ts` (new) | 13 tests (see Checks). |
| `src/game/scene/people.ts`, `sheet-pages.ts`, `content/decks/thought.json`, `src/game/recap.ts`, `voice-data.ts`, `src/game/scene/place-names.ts` | Read-through fixes that are v1's too (see Read-through). |
| merged: branch `coherence` | The world-coherence pass (where things are kept, ties in the owner's words, standings that fit the case, `src/gen/coherence.ts` and its test) and the place names wired in (`content/places`), done alongside on the coordinator's ask. |

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

## Measures

### The design test, v2 beside v1

`npx tsx scripts/diagnose-play.ts --design --seeds 50 --configs T0,T2L2,T4L2,T5L2 [--engine v2]`, the same 50 seeds for both, after merging the coherence and place-name branch. v1 is asked the column from Medium up; v2 never is.

| tier | engine | marks-follower names the culprit | reasoning player right within budget | button-pusher names the culprit | facts put / run | reasoning player's median calls to solve | median par / budget |
|---|---|---|---|---|---|---|---|
| Raw | v1 | 16% | 100% | 18% | 0.0 | 6 | 7 / 10 |
| Raw | **v2** | 28% | 100% | 44% | 0.0 | 7 | 7 / 10 |
| Poached | v1 | 32% | 100% | 24% | 0.1 | 9 | 7 / 11 |
| Poached | **v2** | 28% | 98% | 20% | 0.9 | 10 | 9 / 15 |
| Medium | v1 | 20% | 86% | 18% | 0.6 | 15 | 13 / 19 |
| Medium | **v2** | 26% | 88% | 18% | 1.7 | 17 | 15 / 22 |
| Hard-boiled | v1 | 24% | 76% | 12% | 2.5 | 21 | 18 / 26 |
| Hard-boiled | **v2** | 16% | 78% | 16% | 3.7 | 23 | 19 / 28 |

Targets: the marks-follower at or under 60% at Raw and 50% from Poached up; the reasoning player at or over 95% at Raw and 80% from Poached up. v2 holds every cell but Hard-boiled's reasoning player, 78% — where v1, on the same seeds, is at 76% (docs/33 had v1 at 84% over 100 seeds; 50 seeds is about ±6 points). The Hard-boiled misses are the reasoning player running out of night on cases that lean on two confessions; two more calls of slack did not move it (78% either way), so the slack stays at one. Raw's button-pusher at 44% is three suspects and a small night: a random name is right a third of the time.

**What moved:** the reasoning player puts facts to people two to four times as often (0.9, 1.7 and 3.7 a night from Poached up, against 0.1, 0.6 and 2.5): the turn and the confessions are on the road now. Par is a call or two longer from Poached up, and so is the budget (v2 adds one call from Medium up). Medium's median par, 15, is over the worked example's 10–11; see "Not done".

### The puzzle, per tier

`npx tsx scripts/v2-stats.ts --seeds 50 --tiers 0,2,4,5`:

| tier | ms a case (max) | attempts | murder / lost pet | peak | key rivals: R median, min | other rivals: R | critical facts | width: min / median | load | par | books | facts: route / overlap / dead end | a lie caught on the par route |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Raw | 8 (44) | 1.4 | 34 / 16 | T2 100% | 1, 1 | — | 1 | 2 / 3 | 2 | 6 | The One Who Lied 50 | 5 / 1 / 33 | 100% |
| Poached | 25 (86) | 3.0 | 30 / 20 | T4 62%, T8a 38% | 2, 1 | 2 | 1 | 2 / 4 | 1 | 8 | The Count 33, The One Who Lied 17 | 9 / 3 / 49 | 80% |
| Medium | 552 (2444) | 99 | 36 / 14 | T7 56%, T8b 44% | 2, 1 | 2 | 2 | 2 / 6 | 1 | 14 | The Count 22, The Stranger 11, The Clock 9, The One Who Lied 4, The Alibi Web 4 | 17 / 5 / 115 | 96% |
| Hard-boiled | 548 (2069) | 109 | 33 / 17 | T10 100% | 1, 1 | 2 | 3 | 1 / 7 | 6 | 18 | The Stranger 24, The Count 16, The Clock 10 | 20 / 8 / 177 | 98% |

How often each band rule of docs/34 §5 held (peak, key R, other R, critical, width, load): Raw 100%, 0%, 100%, 12%, 0%, 100%; Poached 100%, 42%, 86%, 38%, 60%, 100%; Medium 100%, 86%, 100%, 76%, 100%, 100%; Hard-boiled 100%, 10%, 0%, 82%, 100%, 18%.

- **Tatham holds in every case** (the peak column): Raw ≤ T2; Poached needs T4 or T8a, never solvable at T2; Medium needs T7 or T8b; Hard-boiled needs T10. On today's v1 cases Poached and Medium mostly didn't.
- **The complete check** found no rival world in any of the 200, and never ran out of budget.
- **Raw is too narrow**: one route per key rival where the band wants three. Widening can only give a witness a name, and Raw's grid puts each innocent in front of one witness inside their own account; widening further means changing the schedule (a second witness passing through), which this slice doesn't do.
- **Hard-boiled's other rivals** have two or more routes where the band wants at most two, and **load** is 6 against 3: the hypothesis test's premises are the whole chain, so every step under it counts. Hard should be deeper, not longer; this is the first thing to tune.
- **Generation time**: v1's selection runs first on every attempt as the gate for the grid, and Medium and Hard-boiled turn down about half of what v1 accepts (par over the ceiling, no key rival that can be made to need the rung), so attempts are about double v1's: half a second a case, two and a half at the worst.

## Read-through

Four v2 runs read page by page (`npm run read -- --engine v2 --seed N --tier T --no-choices`, the oracle's route), after merging the coherence and place-name work: seed 3 at Medium (a murder, The Count), seed 1 at Raw (a murder, The One Who Lied), seed 2 at Poached (a lost pet, The Count), seed 12 at Hard-boiled (a murder, The Stranger); and seed 3 at Medium again down a player's route with confrontations, below.

**What read wrong, and was fixed on the way:**

- The turn written as a verdict ("It was one lie, and a small one"; "That was three stories that didn't hold"); the motif's turn line saying where somebody had been ("{Liar} had been nowhere near a piano"). The turn now puts two things side by side and the motif lines say only the hour.
- The Count's close ("Somebody on this street couldn't count… It wasn't Ruggiero") on a turn a plain sighting caught; the tell ("Obermann counted heads…") planted after the turn it was meant to set up. A turn that isn't the book's piece gets the plain chapter ("Two Stories") and close; the tell is only planted before the turn.
- The turn naming half past nine when the lie that mattered was at ten: the turn now prefers the crime's half hour.
- The tell line landing after the page's bridge, and between a witness's words and his note on them: it goes after his note.
- The motif missing from the turn when the scene's report gave its hour and no timing clue did.
- The office's own "good chair" line taken for the chair gag, whose payoff is a short leg nobody had mentioned: the office's gag is taken up only where the office planted that gag.
- "Frost… when it wants to make a point about the rent" on a page where the rent was paid.
- A lost pet's finder called "the woman who had found Reinhardt" (the owner, alive): now "who had found the ginger tomcat gone". v1 too.
- A contradicting thought that read as a clearing ("At ten o'clock, Stannard claimed Mock's. This took Stannard out of it." — of the culprit): the card now says the claim has a hole in it. v1 too.
- **Confronting Hauck with Rafferty's count got "That doesn't touch anything I told you"**, though the count breaks her third floor as surely as Marchetti's. M9's lie routes took the first half hour of the lie, whose reason was her own confession (struck after the other half hour fell to the count). v2's routes never count a liar's own confession as a way of breaking that lie, so the count lands and her second fact is the free second pick. (v1 has the same fault; it is left alone there, since fixing it moves v1's confrontations.)
- "The bells at St. Malachy's was at half past seven" (the recap); "Mock's's sign"; "Tramonti died at Tramonti's place"; a first mention that ended on an aside and ran into "and had been asking" without a comma — from the place names meeting the old templates. v1 too.
- "I am a customer of Salvatore Tramonti's… I bought from him for years" of a theatrical agent — the coherence pass, now "an act on Tramonti's books".

### Seed 3 at Medium, a player's route

`npm run read -- --engine v2 --seed 3 --tier 4 --no-choices --route "go the walk-up; examine the walk-up; go the third floor; ask Rafferty about the third floor; ask Rafferty about Vitale; go the speakeasy; ask Hauck about that evening; ask Marchetti about that evening; ask Hargrove about Hauck; put w108 to Marchetti; put w108 to Hauck; put x054 to Hauck"`

The scene, page 2 (after the establishing paragraph):

> Somewhere off the river a boat let go of its whistle, two long and one short. Nobody on the street looked up. Nobody on this street ever does.
>
> Sirkin lay where he had fallen. Nobody had covered him yet. There was nobody else in the room. A glass was on its side and the spill had not yet reached the edge of the table when it dried. The whistle went off the river at half past eight, two long and one short, and the boat's log had the hour.

Rafferty's count, page 5, and the tell:

> "I can tell you exactly," Rafferty said. "One came in at half past six. At seven o'clock it was Carmine Vitale, and nobody with him. One at half past eight. Two at nine o'clock. […] I count them in and I count them out. It's how I know who owes me."
>
> […]
>
> Rafferty counted heads the way other people count their change: twice, and out loud.

The turn, page 9, after Marchetti's own evening:

> Chapter Four: The Count
>
> I leaned on the wall for a minute. The wall didn't mind, and I needed the company. Two people had told me they were at the third floor at half past eight. Rafferty had counted one. The whistle had gone off the river at half past eight, two long and one short. So, it was starting to look, had Marchetti's story.
>
> People will lie to you about where they were. A head count won't. It hasn't got the imagination. Marchetti was next. I wanted to watch her hear it.

The narrowing, pages 11–13: Marchetti, given the count, lies again ("All right, I wasn't at the third floor. I was at the Velvet Room."); Hauck holds on the count, and gives it up on the free second pick, Hargrove's word:

> When I read out six o'clock, Hauck closed her eyes for a second. "All right. I was at the Velvet Room. I was selling things that were stolen."

That is the worked example's E, F and G: the stairs count, the lies falling together, a confession played small, and Marchetti with nowhere to stand.

### The other three

- **Raw, seed 1 (The One Who Lied).** The gag is the book's own ("My chair had a leg that was shorter than the others, the way some people have a story that's shorter than the truth."); the motif the dumbwaiter; the turn on page 6: "Stannard had told me Mock's at ten o'clock. Bellucci was there, and said he wasn't. The dumbwaiter had squealed at ten o'clock, loud enough for the whole shaft. The whole shaft had kept its own counsel about it." The last word: "I sat down in my own chair at last, and the short leg took my weight without a word. Somebody tonight had finally told the whole story. It might as well have been the chair."
- **Poached, seed 2, a lost pet (The Count, turned by a sighting).** Lathrop, Reinhardt's neighbour on the shared clothesline; the piano lesson overhead as the motif; the turn falls to Ruggiero's sighting, so the chapter is "Two Stories". The ending: "Lathrop had come up my stairs for an animal. I've had worse reasons to climb them, and fewer good ones." … "Upstairs somebody got the four bars right, finally, at an hour when nobody decent was awake to hear it."
- **Hard-boiled, seed 12 (The Stranger).** The bells at St. Malachy's; the tell is a stranger's face at Mrs. Tillman's parlour ("A face with no name is half a fact. I wrote it down anyway."), paid off at the turn ("And there was still the face at Mrs. Tillman's parlour to put a name to, and fewer names left to put."), where Marchetti's parlour falls to the landlady.

## Not done, and next

- **Stage 1 is v1's grid**, gated by v1's selection. Planting the tier's seed first (Snyder-style) and dropping the gate would halve generation time at Medium and Hard-boiled.
- **Widening needs the world**: Raw and Poached want more routes than the grid allows; the next step is letting the dig add a witness (a second person through a room inside an innocent's account), not only a name.
- **Hard-boiled is long**: load 6 and par 19; narrowing the other rivals and capping the hypothesis's premises is the next tuning.
- **Medium's par** (15 by the game's count) is over the worked example's 10–11: the legs (how, the way in, why) and the culprit's word are on the road, and the pieces that make a case need T7 are spread across more people than a name was.
- **Books**: one line set each, and no book-specific sheet for the confrontation, the confession or the report page; the widening and narrowing open with a heading and no recap of their own.
- **v1's own-confession route** (above) is fixed only in v2.
- The engine's reasoning player never says "Go over what I have"; the turn's recap changes words only, like M12's.

## Checks

- `npx tsc --noEmit` clean.
- `test/v2-slice.test.ts`: 13 tests (the flag, v1 untouched, the mix, Tatham and the complete check at Raw, Poached, Medium and Hard-boiled, the true world found and no rival world, seed 3 as the worked example, a liar's own confession never a way of breaking the lie, the book on the page and in the closing, the reader lint over v2 runs, every book line fills).
- The full suite, v1's tests included: see the PR.
