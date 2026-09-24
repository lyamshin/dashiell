# The rewrite: build the puzzle first, then the story

*Draft for the designer, 2026-09-24. Built on `docs/34-puzzle-construction.md` (the research) and the designer's model:*

> "At bottom, this is just sudoku. We start with a solved grid, and then work backwards to create the steps to deduce its solution. … From there, a book fitting the overall shape should be chosen, sheets with appropriate interconnections for the deduction should be slotted in. Last, the decks should be used to fill the gaps in the sheet. Then whatever gloss we have to make it all flow."

*Decisions already made:*

- **Paths:** several overlapping paths at low difficulty, narrowing at high.
- **Extraneous information comes in three kinds:**
  - no new facts;
  - facts that go nowhere;
  - facts that go somewhere, but mostly overlap.
- **The report:** "where was everyone" is dropped at the high tiers.
- **Chain length is deferred** until you've seen this example.

## 1. The pipeline

| stage | what it makes | today |
|---|---|---|
| **1. Solved grid** | The true evening, with the tier's signature deduction planted first, as a sudoku setter plants a seed. | The truth simulation. It stays, and gains the planted seed. |
| **2. The puzzle** | The targets (what the report asks), the **rivals** (every other answer still possible), and the smallest set of facts that breaks every rival. Several overlapping routes per rival at low tiers; one route through a named technique at high tiers. The output is a **deduction graph**: facts, the conclusions they force, and the technique each needs. | A flood of about 135–200 facts, and a solver that checks some route exists. **Rewritten.** |
| **3. The book** | An arc chosen to fit the graph's shape: acts are cuts through the graph, and the turn falls at the first lie caught. | None. **New.** |
| **4. Sheets** | For each step in the graph, a sheet that carries its facts, with connections to the steps before and after. For example, the sheet that plants a prop is the one whose prop a later step pays off. | Sheets chosen per kind of moment, blind to the deduction. **Rewired.** |
| **5. Decks and gloss** | Cards fill the holes, then a final pass for flow. | Much as now. **Kept.** |

**What stays:** the truth simulation, the lie rule, the grid, confrontations, the solver's building blocks, every deck, every sheet and its format, the camp voice, the tiers, and the tools for testing and deploying.

**What's rewritten:** how facts are chosen (designed, not flooded), and how pages are planned (from the deduction graph and the book, not from the last clue found).

**What stays free for the player:** the graph isn't a line. It's a set of steps, some of which must come before others. You pick which open step to chase and where to go; the book bends to the order you take, and the night's budget still pinches.

## 2. Worked example: seed 3 at Medium

### The solved grid

Isidore Sirkin, a buildings inspector, was poisoned in his locked walk-up at half past eight. The givens from the client say:

- the door was locked and the windows painted shut;
- there is one key, and it hangs on a hook at the third floor;
- the coroner puts it between eight and half past.

The true evening at the hours that matter, from the truth sheet:

| | 8:00 | 8:30 | what they *say* about 8:00–8:30 |
|---|---|---|---|
| Marchetti (switchboard operator) — **the culprit** | the walk-up | **the walk-up** | "the third floor" (a lie) |
| Hauck (the client) | the speakeasy | the speakeasy | "the third floor" (a lie; she was selling stolen goods) |
| Vitale (bookmaker) | the speakeasy | the speakeasy | "the office" (a lie; he was paying off bets) |
| Steinbach (piano teacher) | the speakeasy | the third floor | the truth |
| Crowninshield (dentist) | the speakeasy | the speakeasy | the truth |
| Rafferty, the landlady | the third floor | the third floor | a watcher; she counts her stairs |
| Hargrove, the bartender | the speakeasy | the speakeasy | a watcher; he counts his room |

The anchor that matters is **the whistle off the river**, at half past eight, and it's heard across the whole neighbourhood.

### Targets and rivals

The report at Medium asks who, when, how, why, and how they got in. There's no "where was everybody." The rivals are the other answers still possible:

- **who:** Hauck, Vitale, Steinbach or Crowninshield instead of Marchetti;
- **when:** eight o'clock instead of half past;
- **how and entry:** anything but poison, and anything but the key.

### The designed deduction

The puzzle stage keeps the facts that make this graph, and digs the rest. Techniques are from the research's ladder: T1 read-off, T2 account plus a sighting, T3 timing by an event, T4 a count or absence, T7 linking a description, T8 a lie caught.

| step | what the player works out | from which facts | technique |
|---|---|---|---|
| **A. When** | It happened at half past eight. | The coroner's window (given) + the knocked-over glass "when the whistle went" (found at the scene) + the whistle blows at half past eight (anyone can tell you) | T3 |
| **B. How and entry** | Poison, with the one key. | The chloral (coroner's note at the scene) + Rafferty: "Marchetti had the key off the hook that evening" | T1 |
| **C. The stairs count** | Only one person came up to the third floor at half past eight: a man in his thirties Rafferty knows by sight. | Rafferty's count ("one, besides me") + her description + Steinbach's own account (third floor, 8:30) + Vitale, the only other man that age, being placed elsewhere (D) | T4 + T7 |
| **D. The room count** | Hargrove had three besides himself at half past eight: Hauck by name, a woman in her forties, and a man in his thirties. | Hargrove's count and sightings + Crowninshield's account (speakeasy) | T4 + T2 |
| **E. Lies caught** | Three people say "the third floor" at 8:30, and Rafferty counted one. The man is Steinbach, so Hauck and Marchetti are lying. The man at the bar is Vitale, not "the office," so he's lying too. | C + D, plus each liar's own account | T8 (chained) |
| **F. Confessions** | Hauck and Vitale each give up a secret on a second fact (the free second pick). Each ends up at the speakeasy at 8:30, with Hargrove's word under it. | E + D | T8 |
| **G. Who** | Marchetti's 8:30 is a lie with nowhere to go. She had the key (B), chloral was kept at the third floor where she'd been earlier, and Sirkin was about to expose her (the page in his file). She never confesses; she lies again. | E + B + the motive fact | elimination |

**Routes and redundancy at Medium:**

| rival | routes | notes |
|---|---|---|
| Crowninshield | 2 | her account plus Hargrove (D); or Hauck, once she talks (F), who saw "the dentist" at the bar at half past eight (she knows her by trade) |
| Steinbach | 1 | his account plus Rafferty's count and link (C). The count is the only thing that places him |
| Hauck, Vitale | 1 each | through the counts (E). **This is the bottleneck:** width narrows to one at step C, and Rafferty's count is the one critical fact. That's right for Medium, and too narrow for Raw |

**Extraneous information, by kind:**

- **No new facts:** every sheet's texture, the rundown, the character lines.
- **Facts that go nowhere:**
  - Crowninshield's registration card on a street that doesn't exist (her secret);
  - the boxing match on the radio at eight;
  - the beat cop's passes at 7:30 and 9:00.
- **Facts that go somewhere with overlap:** Crowninshield's second route through Hauck's confession. A lower tier would add more: a second witness for Steinbach, or the bartender naming Vitale outright.

The whole thing is about **seven steps**. Par would be about 10 to 11 calls against today's 12, and none of those calls exist only to pad the night.

### The book: "The Count"

The graph's shape picks the book. Its bottleneck is a pair of head counts that break three alibis at once. So this is a **count book**: the night is about who was really on the stairs.

| act | graph steps | what the reader feels |
|---|---|---|
| **The hook** (office) | the givens | A locked room with one key. The client points at Steinbach, and she's wrong about him. |
| **The scene** (the walk-up) | A, part of B | The glass, the chloral, the whistle at half past eight. The whistle becomes the night's **motif**. |
| **The widening** (any order: the third floor, the speakeasy, the kiosk) | B, C, D, and the dead ends | People and their accounts. Everybody says "the third floor" or "the office." |
| **The turn** | E: the first lie caught | A recap as a chapter break: "Three people said they were on those stairs at half past eight. Rafferty counted one." |
| **The narrowing** | F, G | Confrontations. Two people confess to small, embarrassing secrets. One doesn't. |
| **The report and the ending** | the targets | The whistle comes back in the closing line. |

**Night-long roles:**

- **The motif:** the whistle. It's planted at the scene and paid off in the recap and the ending.
- **The running gag:** the office radiator. It's planted on page one and finally works on the last page.
- **The client's question** ("keep it quiet"): answered in the ending in her terms.

### Sheets per step, and how they connect

| step | sheet | connection |
|---|---|---|
| A | **scene arrival** (a variant of Sheet A for a room with nobody alive in it) | Plants **prop = the whistle** ("somewhere a boat blew two long and one short"). The close gives the time. |
| B, C | **Rafferty's telling** (the count sheet) | Its grounding is "I count them in and I count them out." It plants **tell = the one pair of feet on the stairs**, which step E pays off. |
| D | **speakeasy arrival, Sheet A** | Hargrove's trait, "eyes that went to the door every time it opened," sets up his count on the next page. A man who watches the door can count it. |
| E | **recap sheet at the turn** | Calls back the whistle and the one pair of feet: "Three people were on those stairs, by their own account. Rafferty's stairs only had room for one." |
| F | **confrontation sheets** | The prop is the count. "Hargrove had you at the bar" is the second pick. The confession sheet has a slot for the secret's embarrassment, played for camp. |
| G | **the culprit's confrontation and the report** | Marchetti's third lie has nowhere to stand. The ending sheet brings back the whistle. |

Decks fill the rest: the room, the drinks, the looks, the jokes.

### Two ways the same night can go

- **The third floor first.** Rafferty gives the key and the count. The count doesn't mean much until the accounts start saying "the third floor." Then the speakeasy, where the lies fall together.
- **The speakeasy first.** Hauck's rundown, Hargrove's count, Crowninshield and Vitale's accounts. Then Rafferty's count turns everything. The turn comes later, and it lands harder.

The book is the same in both, and the acts arrive in a different order of pages.

## 3. Other tiers, sketched (for judging chain length)

- **Raw** (3 suspects), about 3 steps:
  - when (given exactly);
  - two innocents placed by their own account plus a sighting, each with two routes;
  - the culprit's one lie caught by a watcher.

  It's wide and forgiving, with a book like "The One Who Lied."
- **Hard-boiled** (6 suspects), about 8 steps, and narrow:
  - a hypothesis test at the bottleneck: "if the stranger was Vitale, then…";
  - one critical fact;
  - one or two routes per rival.

  Hard should mean deeper, not longer, so par shouldn't climb with the steps.

## 4. What building it takes

1. **The solver learns techniques.** Every conclusion is tagged with the technique it used, and the solver works cheapest first. This is measurement only, and it tells us where today's cases stand.
2. **Rivals, and a complete uniqueness check** under the rules the player is taught.
3. **The puzzle stage:** routes per rival, chosen by tier, and digging at the level of the world (changing who saw what, not hiding facts). The output is the deduction graph. It replaces the flood.
4. **Books:** a handful of arc shapes (the count, the one who lied, the alibi web, the stranger, the clock), chosen by the graph's shape, each with acts, night roles and an ending sheet.
5. **Pages planned from the graph and the book:** which step a page carries, and which sheet, with the prop, foil and tell bound across pages.
6. **The report** asks only what each tier asks, with no crime column.
7. **Measure:** the design test, redundancy bands per tier, full read-throughs.

Stages 1 and 2 can run alongside each other. Stage 3 is the heart. Stages 4 and 5 need 3. The pages you've seen keep working the whole time, because the old path stays until the new one is ready.

## Questions for the designer

1. Does the worked example feel like the game you mean: the count, the lies falling together, the book shaped around it?
2. Chain length: about 3 steps at Raw, 7 at Medium, 8 at Hard-boiled. Right neighbourhood?
3. Is "The Count" the kind of book you pictured? Other shapes I'd start with: **the one who lied**, **the alibi web** (together and apart), **the stranger** (descriptions), and **the clock** (anchors).
