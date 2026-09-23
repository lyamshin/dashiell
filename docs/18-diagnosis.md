# 18 — Diagnosis: why a night feels like pushing buttons

The designer played and said:

> It feels like you're just pushing random buttons, hoping to run into a person who gives you something.
> It seems glad to loop you around endlessly for no reason.
> "It's not so obvious that people weren't at the murder scene" should become true. Right now it is too obvious.
> People probably need to lie a bit more, so that you're forced to puzzle it through.
> This should be a deduction game. That's really what you're solving.

Later addition: the target feel is an **LSAT logic game**. A fixed board of people × half hours × places. Short, precise rules, each weak on its own. Conclusions come only from combining them.

This document measures each of those complaints. Nothing in the game or the generator was changed.

## How it was measured

`scripts/diagnose-play.ts` generates cases, drives the real reducer through the real choice model (`choicesFor`, `stepInput`), and reads the generator's truth to score what happened. It ran over **seeds 1–100** in 13 configurations, 1,300 cases in all:

- **Legacy difficulties d1, d2 and d3.** These are Hard-boiled on the pre-M7 dials, which is `generateCase(seed, { difficulty })`.
- **Tiers T0** (Raw, locked at Beat), **T2** (Poached), **T4** (Medium) and **T5** (Hard-boiled), each at levels 1, 2 and 3.

Four players:

| player | what it does |
|---|---|
| `oracle` | The existing optimal spine collector (`playOracle`). It is par. |
| `wander` | The existing imperfect player (`playWandering`), replayed through the choice model. |
| `uniform` | **The button-pusher.** It picks uniformly among every costed choice on the page that is not already ticked. |
| `leads` | **The lead-follower.** It takes a marked question or search in this room if one exists, else a marked room, else anything. |

Every player files a report the same way:

- **Who:** the one suspect the notebook's facts leave uncleared at every half hour still open for the death, if exactly one is left. Otherwise, the monologue's leading theory, which is the wanderer's own rule.
- **Everything else:** filed the way `playWandering` files it.

"Solved" counts only cases whose report asks who, how, why, when or where. The synthetic players never answer entry or goods.

To reproduce:

```
npx tsx scripts/diagnose-play.ts --seeds 100                       # all 13 configs, markdown tables to stdout
npx tsx scripts/diagnose-play.ts --configs T2L2,T5L2 --json out.json
npx tsx scripts/diagnose-play.ts --route uniform --seed 7 --configs T5L2   # prints the route…
npm run read -- --seed 7 --tier 5 --level 2 --route "<that route>"          # …as a transcript
```

The full run is about ten minutes of CPU. Split it with `--configs` to run in parallel.

---

## The short version

Rank orders the causes by how much of the aimless feeling each one explains.

| rank | cause | the number |
|---|---|---|
| 1 | **Most buttons are dead.** Only a marked lead reliably pays. | Nearly half of the costed choices on a page are "ask X about <a person or place>". **5%** of them can *ever* return a clue. The button-pusher gets nothing from **69–77%** of its actions. |
| 2 | **Leads are dealt at random across rooms, and they are too many.** | Lead edges are wired to random earlier clues. **57–65%** of edges at Medium and above need a walk. Only **25–33%** share a person with the clue that opened them. **10–18%** of new leads send you back to the room you just left. 5 or more open leads are showing on **69–81%** of pages. |
| 3 | **The scene is not a lead.** | The walk to the body is never marked. The wanderer never reaches the scene in **58–69%** of Hard-boiled runs and **93–100%** of Raw and Poached runs. The lead-follower misses it in **43–97%**, and still names the culprit **78–100%** of the time. |
| 4 | **Every innocent is cleared by one sentence, and the page then says so.** | **100%** of innocents in all 1,300 cases have a single clue that clears them outright. Clearing never needs two clues combined. A `clears` thought is printed on **96–100%** of those finds. Above Poached, **41–58%** of them are printed while the time of death is still open. |
| 5 | **Nobody lies in anything you can find.** | **0 of 48,108** facts in findable clues are false. No two findable clues contradict each other. Lies live only in "their evening", which the par route never asks: the oracle hears **0** accounts per run. |
| 6 | **The client and the monologue hand you the name.** | At Medium the client points at the culprit in **66–91%** of cases. The monologue names the culprit by action **1.4–2.5**, **99–100%** of the time. |

The logic-game reading of the same numbers:

- The board has **one kind of rule**: fixed and negative placements make up **45–76%** of clues. There are **0%** conditionals and **~1%** together/apart.
- The **inference depth is 2** from Raw to Poached, and **3.1–3.7** above that. The only combination the game ever demands is pinning the time of death from two anchors.

---

## 1. What an action gets

A costed action is one that moved the clock or spent a free first ask. The outcome columns say what the action produced:

- **nothing:** no clue and no new account.
- **account only:** a person's claimed evening and nothing else.
- **noise only:** noise or disqualifier clues only.
- **has spine:** at least one spine clue.

| config | player | nothing | account only | noise only | has spine | first new spine clue at action | never a new spine clue | never reached the scene | who right | solved |
|---|---|---|---|---|---|---|---|---|---|---|
| T0 | oracle | 21% | 0% | 0% | 79% | 3.0 | 0% | 0% | 100% | 100% |
| T0 | wander | 18% | 27% | 14% | 25% | 3.0 | 2% | **93%** | 93% (own filing 53%) | 93% (53%) |
| T0 | uniform | **74%** | 6% | 4% | 11% | 5.0 | **62%** | 40% | 13% | 13% |
| T0 | leads | 36% | 2% | 16% | 27% | 1.9 | 0% | 81% | 90% | 90% |
| T2L2 | oracle | 19% | 0% | 0% | 81% | 3.0 | 0% | 0% | 100% | 100% |
| T2L2 | wander | 27% | 21% | 12% | 23% | 4.0 | 0% | **99%** | 76% (53%) | 28% (16%) |
| T2L2 | uniform | **69%** | 7% | 7% | 10% | 5.2 | **55%** | 45% | 21% | 14% |
| T2L2 | leads | 22% | 1% | 18% | 32% | 1.9 | 0% | 95% | 95% | 55% |
| T4L2 | oracle | 16% | 0% | 0% | 84% | 2.6 | 0% | 0% | 100% | 100% |
| T4L2 | wander | 27% | 21% | 11% | 26% | 4.0 | 0% | 69% | 74% (66%) | 27% (15%) |
| T4L2 | uniform | **71%** | 5% | 6% | 10% | 7.0 | 36% | 34% | **73%** | 21% |
| T4L2 | leads | 20% | 0% | 15% | 37% | 2.0 | 0% | 52% | 96% | 77% |
| T5L2 | oracle | 19% | 0% | 0% | 81% | 2.6 | 0% | 0% | 100% | 100% |
| T5L2 | wander | 29% | 22% | 9% | 27% | 3.6 | 0% | 59% | 64% (59%) | 28% (17%) |
| T5L2 | uniform | **75%** | 5% | 5% | 9% | 8.6 | 31% | 46% | 59% | 11% |
| T5L2 | leads | 23% | 0% | 13% | 38% | 2.0 | 0% | 57% | 93% | 57% |
| d2 | oracle | 18% | 0% | 0% | 82% | 2.4 | 0% | 0% | 100% | 100% |
| d2 | wander | 29% | 20% | 10% | 30% | 3.4 | 0% | 58% | 68% (67%) | 18% (8%) |
| d2 | uniform | **76%** | 5% | 5% | 9% | 8.1 | 32% | 41% | 57% | 9% |
| d2 | leads | 26% | 0% | 14% | 40% | 2.0 | 0% | 43% | 94% | 71% |

The other levels sit within a few points of these rows. The uniform player's "nothing" share is 69–77% in every configuration.

Two readings:

- **Random clicking is punished hard, and following the marks is rewarded almost as well as perfect play.** The button-pusher finds no clue at all on three actions in four. Up to three runs in five at Raw and Poached never see one new spine clue. The lead-follower does no reasoning, only takes the mark, and still names the culprit 78–100% of the time. The skill being tested is *find the marked button*. That is exactly the "pushing buttons hoping somebody gives you something" feel. The one lever that pays is a mark the game drew, not a thought the player had.
- **Even the oracle's night is 16–21% empty pages.** These are the walks, since travel is 25–41% of its actions. That is fine on its own. The trouble is that a human cannot tell a productive walk from an empty one before taking it.

## 2. Loops

### Where new leads send you

These are the leads each player's own actions opened, classified by where they point at the moment they open.

| config | player | leads opened / run | in this room | the room just left | another room already visited | a person already questioned | returns / run | returns that found nothing | A→B→A walks / run |
|---|---|---|---|---|---|---|---|---|---|
| T0 | wander | 3.4 | 76% | 11% | 2% | 26% | 0.3 | 28% | 0.2 |
| T0 | leads | 3.8 | 57% | 9% | 5% | 17% | 0.3 | 58% | 0.2 |
| T2L2 | wander | 6.0 | 57% | 17% | 2% | 31% | 1.1 | 25% | 1.0 |
| T2L2 | leads | 8.1 | 46% | 8% | 3% | 23% | 0.3 | 42% | 0.2 |
| T4L2 | wander | 11.3 | 38% | 18% | 8% | 31% | 2.0 | 25% | 1.5 |
| T4L2 | leads | 15.4 | 34% | 12% | 7% | 27% | 0.7 | 20% | 0.3 |
| T5L2 | wander | 12.0 | 29% | 15% | 11% | 27% | 2.3 | 23% | 1.5 |
| T5L2 | leads | 16.3 | 27% | 11% | 11% | 26% | 1.0 | 13% | 0.3 |
| d2 | wander | 11.4 | 29% | 16% | 8% | 25% | 2.3 | 24% | 1.6 |
| d2 | leads | 14.8 | 24% | 10% | 13% | 21% | 1.1 | 21% | 0.4 |
| all | uniform | 2–7 | 13–23% | 6–14% | 5–20% | 17–33% | 1.4–3.1 | **78–97%** | 0.8–1.1 |
| all | oracle | 5–18 | 19–44% | 1–7% | 0–1% | 3–10% | 0 | — | 0 |

At Hard-boiled, a quarter of a player's new leads point at rooms already walked out of. More than a quarter name a person already questioned. The page's one **bridge**, the named next lead, does the same thing: 13–18% of the wanderer's bridges point at the room just left, and 30–40% name a person already questioned.

The oracle only avoids these loops because it plans the whole route with the answer key in hand. The leads are the same ones everybody else sees.

**Graph cycles are not the cause.** `leadsTo` is a DAG in 100% of cases, with no cycles and no two-cycles. The loop is geographic. The graph's nodes are dealt to rooms without regard to the edges between them:

| config | lead edges / case | edges that need a walk | target shares a person with its source | target is about the crime half hour |
|---|---|---|---|---|
| T0 | 13 | 42% | 53% | 70% |
| T2L2 | 26 | 53% | 44% | 52% |
| T4L2 | 40 | 60% | 30% | 48% |
| T5L2 | 44 | 65% | 27% | 51% |
| d2 | 40 | 65% | 25% | 49% |

The cause is in `src/gen/select.ts`:

- `wireSpine` hangs each spine clue off **one or two randomly picked earlier spine clues** (`rng.pickN(earlier, …)`).
- Corroboration is hung off `rng.pick(spine)`.
- Noise branches and loose ends are hung off `rng.pick(hangPoints)`.

None of these choices looks at who the clue is about, where it is, or what question it answers. So three quarters of the edges at Hard-boiled join two clues that share no person. The bridge prose then papers over that with a generic reason: "Feldman would know where Lindemann had been tonight".

### Too many leads, or none

This is the open-lead count (`state.threads`) after each page, and the number of marked choices on the page.

| config | player | open leads (mean) | pages with 0 | pages with ≥5 | max | marked choices / page | choices / page |
|---|---|---|---|---|---|---|---|
| T0 | leads | 1.4 | **34%** | 2% | 7 | 1.6 | 28 |
| T0 | wander | 1.9 | 17% | 2% | 7 | 2.1 | 31 |
| T2L2 | wander | 3.9 | 1% | 38% | 10 | 3.6 | 33 |
| T4L2 | wander | 6.4 | 0% | **69%** | 16 | 4.9 | 36 |
| T5L2 | wander | 6.7 | 1% | **73%** | 16 | 4.9 | 41 |
| d2 | wander | 6.1 | 1% | **69%** | 14 | 4.8 | 39 |

- **Raw starves.** A third of the lead-follower's pages have nothing marked. The player is back to clicking unmarked buttons, three quarters of which are dead.
- **Medium and above flood.** Most pages carry five or more open leads spread over rooms, and 31–41 buttons. With no way to rank them, the player takes the nearest mark.

### A loop, in the book

T5L2 seed 7, the wandering player (`npm run read -- --seed 7 --tier 5 --level 2 --random`). Mrs. Teague's is visited three times: pages 2–4, 13–14 and 17–19. The Bijou is visited three times, and the subway kiosk twice.

> **p. 14, Mrs. Teague's.** Lindemann was Mosley's creditor. Feldman would know where Lindemann had been tonight.
>
> **p. 15.** *(walks to the Wyckoff on an older lead)*
>
> **p. 17, Mrs. Teague's again.** Feldman, the landlady at Mrs. Teague's, was the one who would know where Lindemann, Mosley's creditor, had been. … Lindemann was where it should have been. I hadn't wasted the walk.
>
> **p. 19.** Thorndike, in Mosley's debt, could tell me where Callahan, a customer of Mosley's, had spent the evening, and Thorndike was at Pier 46.

The lead on page 14 was in the room the detective was standing in. The next page walked away on an older lead, and the page after that walked back. Nothing on any of these pages lets the player see why one lead matters more than another.

## 3. Obviousness

"Cleared by one clue" means that one findable clue alone puts the innocent somewhere other than the scene at the crime's half hour. That is a `personAt` elsewhere or a `personNotAt` the scene at the crime tick.

"Minimum clues to the culprit" is the smallest set that leaves only the culprit. It is the clues that pin the tick, plus one clearing clue per innocent. "Inference depth" counts the steps in that chain:

- **Step 0:** know the tick. It is given, or pinned by one or two clues.
- **Step 1:** clear each innocent.
- **Step 2:** eliminate to the culprit.

A pin that needs two clues intersected adds a step.

| config | innocents | cleared by ONE clue | clearing clues / innocent | tick given exactly | clues to pin tick | min clues to culprit | inference depth | cases needing any 2-clue combination | oracle has the culprit alone at action / of | client points at culprit | monologue names culprit at action (oracle) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T0 | 2 | **100%** | 2.0 | 100% | 0 | 2.0 | **2.0** | 0% | 4.7 / 5.1 | 50% | never |
| T2L1 | 3 | **100%** | 2.3 | 100% | 0 | 3.0 | **2.0** | 0% | 6.6 / 7.2 | 35% | 4.5 |
| T2L2 | 3 | **100%** | 2.3 | 100% | 0 | 3.0 | **2.0** | 0% | 6.8 / 7.3 | 41% | 4.7 |
| T2L3 | 3 | **100%** | 1.3 | 100% | 0 | 3.0 | **2.0** | 0% | 6.6 / 7.3 | 18% | 5.0 |
| T4L1 | 4 | **100%** | 2.6 | 0% | 1.1 | 5.1 | 3.1 | 10% | 10.0 / 10.6 | **87%** | **1.9** |
| T4L2 | 4 | **100%** | 2.5 | 0% | 1.1 | 5.1 | 3.1 | 8% | 10.0 / 10.5 | **91%** | **1.4** |
| T4L3 | 4 | **100%** | 1.5 | 0% | 1.1 | 5.1 | 3.1 | 9% | 10.1 / 10.6 | **66%** | **2.5** |
| T5L1 | 5 | **100%** | 2.6 | 0% | 1.6 | 6.6 | 3.6 | 60% | 11.7 / 12.3 | 48% | 4.9 |
| T5L2 | 5 | **100%** | 2.5 | 0% | 1.7 | 6.7 | 3.7 | 70% | 11.9 / 12.4 | 57% | 4.4 |
| T5L3 | 5 | **100%** | 1.6 | 0% | 1.6 | 6.6 | 3.6 | 60% | 11.7 / 12.4 | 26% | 5.5 |
| d1 | 5 | **100%** | 1.9 | 0% | 1.6 | 6.6 | 3.6 | 62% | 11.4 / 12.3 | 56% | 4.4 |
| d2 | 5 | **100%** | 1.8 | 0% | 1.6 | 6.6 | 3.6 | 62% | 11.8 / 12.4 | 50% | 5.0 |
| d3 | 5 | **100%** | 2.2 | 0% | 1.6 | 6.6 | 3.6 | 58% | 11.8 / 12.6 | 25% | 5.8 |

**Answers to the designer's (b) and (c):**

- **(b) Innocents.** The minimum number of clues needed to rule out any innocent at the crime's half hour is **1** in every case that asks who. That is 100% of innocents, with **1.3–2.6** such clues each. It is never 2, because the board has no rule that could make two clues imply a placement. There is no adjacency, no travel time and no "only one of them could have".
- **(c) The culprit.** The only combination the game ever requires is the **time of death**:
  - From Raw to Poached, the coroner states the exact half hour in the briefing, so no combination is required at all (0%).
  - At Medium, one anchor usually closes a two-tick window, so 8–10% of cases need a pair.
  - At Hard-boiled, 58–70% need two anchors intersected.
  - After that, the solution is a *sum* of independent one-clue alibis, not a chain.
  - The oracle's actual route needs inference depth **2.0** from Raw to Poached, **3.0–3.1** at Medium and **3.2–3.7** at Hard-boiled.
- **Nobody is cleared by the opening pages alone** (0 in every config). The obviousness is not that the answer is given. It is that every later page gives one fact that *is* a conclusion.

### The page draws the conclusion for you

Here is the answer to the designer's phrase "it's too obvious that people weren't at the murder scene".

A clearing clue is a single flat sentence: "Bidwell says Weisglass was at the chop suey place at 10:00 PM." The M8 thought beat then states the inference on the same page:

| config | clearing finds (oracle) | with a `clears` thought | of those, written while ≥2 half hours were still open for the death |
|---|---|---|---|
| T0 | 216 | 100% | 0% |
| T2L2 | 313 | 99% | 0% |
| T4L2 | 438 | 98% | **51%** |
| T5L2 | 546 | 97% | **54%** |
| d2 | 533 | 99% | **45%** |

For the button-pusher at Hard-boiled, 82–93% of its `clears` thoughts come while the window is still open. `thought.ts` fires `clears` for a placement at *any* tick inside the current window. So with four half hours open it announces a clearance that covers one of them.

Quotes:

> T0 seed 1, button-pusher, p. 3. *(asks the client, unmarked, about Weisglass)* "Weisglass showed up at the chop suey place close to ten o'clock, same as most nights." … At ten o'clock, Weisglass was at the chop suey place instead of the suite, if the account was honest. **That cleared Weisglass.**
>
> T2L2 seed 3, wanderer, p. 10. At eleven o'clock, Salerno was at Kaplan's — and if so, not at the suite, where it happened. **It disqualified the idea outright.**
>
> d1 seed 1, oracle, p. 6. *(3 half hours still open)* At half past eight Vitale was at Ruggiero's, not the back lot. **If that was so, Vitale had nothing to answer for.**
>
> T4L1 seed 1, wanderer, p. 9. *(9 half hours still open)* If Donnelly was truly at the garage at ten o'clock, the brownstone was somewhere Donnelly simply was not. That favored Donnelly.

### The client and the monologue name the culprit

`src/gen/client.ts`, the pointer: when innocents may have motives and the client is not the killer, the rule is `rng.chance(0.5) ? pool.find((p) => p.isKiller)`. So **half the time the client names the killer on purpose**, and the other half picks from a pool that contains the killer.

At Medium the pool is the killer plus at most two motivated innocents. The measured result is 66–91% (table above). The client's brief carries the motive as a fact, and `leadingTheory` weights a motive at +1. So the detective's monologue settles on the culprit by the **second action at Medium, in 99–100% of runs**. That explains the odd row in §1: the uniform button-pusher names the right person **73%** of the time at T4L2 while finding nothing on 71% of its actions.

### The logic-game rule mix (designer's item a)

Each findable clue is classified by the structure of what it establishes. The heuristics are in `ruleType()`:

- **fixed placement:** "X was at P at T".
- **negative placement:** "X was not at P at T".
- **together/apart:** a companion refusing an alibi.
- **relative/sequence:** placed against an event rather than a clock.
- **numerical/absence:** "nobody", "only".
- **identity/attribute:** motive, access, method, object missing.
- **time window:** coroner, alive-at, dead-by.
- **context:** no fact.

| config | fixed placement | negative placement | together/apart | relative/sequence | conditional | numerical/absence | identity/attribute | time window | context (no fact) |
|---|---|---|---|---|---|---|---|---|---|
| T0 | **61%** | 15% | 1% | 0% | **0%** | 0% | 0% | 15% | 8% |
| T2L2 | **67%** | 8% | 1% | 0% | **0%** | 0% | 2% | 11% | 12% |
| T4L2 | **57%** | 5% | 1% | 2% | **0%** | 2% | 10% | 7% | 17% |
| T5L2 | **51%** | 6% | 1% | 1% | **0%** | 1% | 9% | 7% | 24% |
| d2 | **43%** | 6% | 1% | 2% | **0%** | 2% | 10% | 7% | 28% |

The designer expected nearly all clues to be fixed placements, and that is what the table shows.

The few "relative" and "numerical" hits overstate the variety. They are scene signatures ("the rug is rucked up … nothing was carried out of the room") and a watched door ("nobody came out of it carrying anything"). They are not rules about where *people* were.

Even the negative placements are fixed placements in disguise. "Stannard was at Ruggiero's from 7:30 PM to 8:30 PM and says Prentiss was not" places Stannard *and* un-places Prentiss in one sentence. Every placement names one person, one room and one half hour, as the M2b one-subject rule requires. That makes each clue a finished answer to one cell of the board, not a constraint on it.

## 4. Lies

| config | liars / case | lie cells / case | culprit's | innocents' | client's | at the crime tick | contradicted by a findable clue | culprit's lies contradicted | false facts in findable clues | false "I was with X" / all such claims |
|---|---|---|---|---|---|---|---|---|---|---|
| T0 | 1.0 | 1.9 | 1.9 | 0.0 | 0.0 | 53% | 97% | 97% | **0 / 2,742** | 38 / 38 |
| T2L2 | 2.0 | 3.4 | 1.8 | 1.6 | 0.4 | 60% | 98% | 97% | **0 / 3,897** | 89 / 130 |
| T4L2 | 4.0 | 6.6 | 1.9 | 4.7 | 1.2 | 45% | 100% | 99% | **0 / 4,377** | 204 / 290 |
| T5L2 | 5.8 | 10.3 | 2.6 | 7.7 | 1.9 | 33% | 92% | 68% | **0 / 4,219** | 336 / 472 |
| d2 | 5.8 | 9.9 | 2.5 | 7.4 | 1.8 | 35% | 86% | 72% | **0 / 3,413** | 335 / 443 |

Across all 13 configs: **0 of 48,108** checkable facts in findable clues are false. No two findable clues place one person in two rooms at the same half hour. Every lie is a cell of `Schedule.claimed`, and it reaches the page only through **"ask X about their evening"**. That question costs an action, can never return a clue, and is never on the par route.

| player | evening accounts heard per run |
|---|---|
| oracle | **0.0** in every config |
| lead-follower | 0.0–0.2 |
| wanderer | 2.7–4.9 |
| button-pusher | 0.7–1.4 |

**Where the lies fall.** Relative to the crime tick, 40% of lie cells are at the crime's half hour itself, 17% are the half hour before, and 9% the half hour after. Lies cluster tightly on the crime.

**Can a player tell a lie from the truth without the truth sheet?** Yes, trivially, and the game does it for them:

1. Every findable clue is true.
2. A lie is the only thing that can disagree with one.
3. Whenever an account and a clue disagree, the clue is right, with no exceptions.
4. The notebook marks the account's cell with `!` (`establishedFrom` → `contradicts`).
5. The page says so in words.

> T2L2 seed 3, wanderer, p. 11 *(the culprit's own account)*. Thorndike's account did not match what I had just found.
>
> T5L2 seed 7, wanderer, p. 18 *(the client, an innocent drinker)*. It contradicted Donnelly plainly, and Donnelly would have to explain it.

**The liar-is-not-the-killer lesson is there, but it never bites.** At Poached and above, 2–4 suspects per case are caught lying about the crime's half hour, and the culprit is never the only one (0%). But an innocent liar is cleared the moment any watcher places them, because a watcher's sentence is gospel. There is never a moment where the player has to decide *whom to believe*. At Raw the only liar is the culprit (100%), so any contradiction is the solution.

## 5. Choices that never pay

These are every costed, un-ticked choice on every page the button-pusher stood on, across all 13 configs.

| choice | share of what is offered | returns a clue now | could *ever* return a clue |
|---|---|---|---|
| ask X about a person | **35%** | 6% | **6%** |
| go somewhere | 20% | 38% marked | — |
| a marked lead (exact topic) | 13% | 89% | 100% |
| ask X about a place | **11%** | 0% | **1%** |
| ask X about themselves | 7% | 0% | 0% (a self-account, never a clue) |
| ask X about their evening | 7% | 0% | 0% (an account, where the lies are) |
| search an object | 5% | 71% | 75% (identical to searching the room) |
| search the room | 2% | 69% | 73% |

- **"Ask X about Y" is the biggest single group of buttons, and 94–99% of them are dead for the whole night.** `choices.ts` offers every person the notebook knows to every person present (`knownPeople`), plus every place tied to them. A clue answers one exact generator topic string, and anything else falls through `answersTo` to nothing.
- **The empty answer is one of four stock lines** (`NOTHING_ASKED` in `voice-data.ts`), whoever is asked and whatever about:

  > "Give me your read on Bledsoe." "Ask me a different one." Thorndike did not offer a different one. *(T5L1 seed 1, p. 6)*
  >
  > "Tell me about the Hallam." Bledsoe didn't know, and for once in this neighbourhood I believed somebody. *(T5L1 seed 1, p. 18)*
  >
  > "Tell me about Bellucci." Bidwell thought about it long enough that I got my hopes up. Then: "No." *(T0 seed 1, p. 9)*

  "For once … I believed somebody" is also a tell. The game is telling the player that the empty answer is true.
- **Searching an object is searching the room.** `examine` with an object id fetches every place clue in the room, so a room with three known objects offers four buttons that do the same thing. After one of them, all four are ticked.
- **Leads that repeat a question.** About 1% of new leads ask a person about someone they have already been asked about, under a different topic string. Examples: "Callahan's account" after "Callahan" (d1 seed 9), and "Bledsoe and Weisglass" after "Bledsoe" (d1 seed 8).
- **Smaller bugs seen while reading:**
  - The notebook's ESTABLISHED line reads "time of death: 6:00 PM–11:00 PM (11 half-hours still open)" on a Poached night where the briefing said 11:00 exactly (T2L2 seed 3). `establishedFrom` reads only found clues, never the givens.
  - An exchange asks "What was Hochstetter doing at the benches?" and gets an answer about Prentiss at the subway kiosk (T2L2 seed 3, p. 7).

---

## 6. Making it a deduction game

The target is a logic game. There is a fixed board. Rules are short and true in their own terms, but each is weak. The answer is the one arrangement every rule allows. Measured against that target, today's game has:

- **A board.** People × 12 half hours × places already exists in the generator as `Schedule.truth`.
- **One rule type.** "X was at P at T", from a source that cannot lie.
- **A narrator who solves each cell as it arrives.**

Four changes, in order of leverage.

### 6.1 Make every placement partial, so clearing takes two rules

**No findable clue should, alone, put an innocent somewhere other than the scene at the crime's half hour.** The target is **≥70% of innocents need ≥2 clues**, against 0% today, and an **inference depth ≥3 from Poached up**. Each rule type below is weak on its own:

| rule type | what it says | what it needs to become a conclusion | built from |
|---|---|---|---|
| **Sequence / travel** | "The pier is a half hour's walk from the suite." "X was at the pier at 9:30 and at 10:30." | Travel time plus two placements rules out the suite at 10:00. Neither placement touches the crime tick. | Places gain a distance class (same block / a walk / across the neighbourhood). Today there is no adjacency at all (M2 §1). |
| **Identity (partial sighting)** | A watcher saw "a woman in her forties, no hat" go up at ten, not a name. | Combine with the dossier's layer 0 (gender, age band, already generated) and one more clue to narrow it to a person. | `Observation`, plus a description drawn from `Dossier` layer 0. |
| **Numerical / absence** | "Two people came down the stairs after ten, and nobody else." | Place one of the two elsewhere, and the other is fixed. | Watchers count at their door; the count is a fact. |
| **Together / apart** | "Vitale was with Donnelly all evening", from Donnelly, who is lying. | One placement of Vitale breaks Donnelly's alibi as well. | `claimedCompanion` (70–100% of these claims are false today), made findable. |
| **Conditional** | "If you were at Dolan's at ten, you saw the fight end in the fourth." | A knowledge test turns a claim into a check. | Anchor knowledge traces (M2b §4) exist; make them rules the player applies, not clues that say "names the wrong man". |
| **Negative, from a watcher** | "I didn't see Salerno after nine." | True, but it only says "not *here*". It needs the other rooms. | Watchers' non-sightings. |

The one-subject rule (M2b §1) should stay: one clue, one person. What changes is that the clue names a *constraint* on that person's row, not a filled cell at the crime tick. Put fixed placements at the crime tick only in watchers' mouths, and only for about one innocent per case. That gives an anchor, the way a logic game gives one fixed rule.

### 6.2 Let suspects lie in what they tell you, and never auto-resolve it

Today lies live in one place that the par route never visits. Move them into testimony:

- **Innocent secret-keepers lie to protect their secret.** A drinker says she saw the person she was drinking with somewhere else. A fence names the wrong room for his partner. These become false `personAt` clues about *other* people.
- **The culprit lies to frame.** It is one false sighting of an innocent near the scene, which a sequence or identity rule can disprove.
- **Watchers never lie.** They are the logic game's fixed rules, the ground truth the player reasons from. This keeps the game fair.
- **Target:** from Poached up, **20–30% of suspect-sourced placements are false**. Every false one is disprovable by a chain of at least two true rules, never by one flat contradicting sentence.
- **Remove the automatic verdicts:**
  - The notebook's `!` on a contradicted cell.
  - The pages' "It contradicted Donnelly plainly" and "Thorndike's account did not match".
  - The `clears` thought.

  When two statements conflict, the notebook shows both side by side and the player decides.

### 6.3 Give the player the verb they are missing

Every current verb *fetches*: go, ask, search. None of them *concludes*. A logic game is played in the margins, so add two:

1. **Mark the board.** It is free. The notebook becomes the grid: people down the side, the twelve half hours across. The player writes a room, crosses one out, or marks a cell "lying". Cells the player has marked feed:
   - the report, so "who" is the one row they could not clear;
   - the monologue, which then reacts to *the player's* theory instead of computing its own.

   Nothing is ever marked for them.
2. **Confront, or put it to them.** It costs one action. Pick a clue from the notebook and put it to a person: "Feldman says you were at Mrs. Teague's at 10:30." The outcome depends on whether the player chose well:
   - **A liar caught in a lie changes the story.** They admit the secret, which is the branch's disqualifier, now *earned*. Or they fall back to a second lie.
   - **A truthful person just repeats themselves.**

   This is the one action whose payoff depends on reasoning, and it replaces "ask X about Y" as the thing a clever player spends the night on.

### 6.4 Make the buttons honest and the leads earned

- **Every question gets testimony.** Drop the four stock non-answers. When X is asked about Y, X says where they saw Y, or says they didn't, true or false by X's own secret. The dead 94% of "ask about a person" become the board's raw material, and the challenge moves from *finding* the magic button to *weighing* what everybody says. Cost still limits it: a person can be asked only so much.
- **Derive `leadsTo` from content, not from `rng.pick`.** A clue should open the lead it actually raises:
  - the person it names;
  - the watcher of the room it names;
  - the companion someone claimed.

  Prefer targets in the same room. Today 25–33% of edges share a person with their source; the target is ≥80%. Also cap open leads at about 3, where today they run 5–16 at Medium and above.
- **Mark the scene on page one.** It is the first lead. Today most lead-followers never see the body.
- **Take the 50% killer coin out of the client's pointer** (`client.ts`). Below Hard-boiled, point at a motivated innocent. From Hard-boiled on, the existing frame and red-herring logic can carry it.
- **Stop the monologue weighting the client's motive fact.** It is how the narrator names the culprit by action 2 at Medium.
- **Make one search button per room**, or make objects hold different clues.

### Targets, measurable with the same script

| measure | today (T4L2 / T5L2) | target |
|---|---|---|
| innocents cleared by ONE clue | 100% / 100% | ≤30% |
| inference depth of the par route | 3.1 / 3.7 | ≥4 |
| cases needing a 2-clue combination | 8% / 70% | 100% |
| false facts among suspect testimony | 0% / 0% | 20–30% |
| evening accounts on the oracle's route | 0 / 0 | ≥2 (a lie you must hear) |
| "ask about a person" that can ever pay | 6% (all configs) | ≥60% (testimony, true or false) |
| lead edges sharing a person with their source | 30% / 27% | ≥80% |
| button-pusher actions with no clue | 71% / 75% | ≤40% |
| lead-follower names the culprit | 96% / 93% | ≤50% (marks alone should not solve it) |
| monologue names the culprit by action | 1.4 / 4.4 | only after the player marks it |
| client points at culprit | 91% / 57% | ≤ 1 / suspects |
| open leads, pages with ≥5 | 69% / 73% | ≤10% |

The last three rows of §1 carry the design test. When a player who follows the marks stops winning, and a player who reasons still does, it is a deduction game.
