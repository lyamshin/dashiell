# Milestone 5 — Shape: Complexity Tiers and the Difficulty Ladder

*Draft for the designer to read before anything builds.*

## The idea

The best roguelikes do not start you at full run length. Balatro's first antes are small. Slay the Spire's Ascension adds one named rule per level. Dashiell should do the same: a first run under ten minutes, and each tier adds one idea the player can learn on its own.

Two axes, kept separate:

- **Complexity** is the *size* of the case. It unlocks by winning.
- **Difficulty** is how *tight* the night is and how much of the case is lies. It is available from the start.

## Complexity: the egg scale

Each tier turns one slider and prints what changed. Names are provisional.

| tier | name | what changes | what it teaches |
|---|---|---|---|
| 0 | **Raw** | 3 suspects, 3 places, no secrets but the murder, coroner names the exact tick, no innocent motives, client is a bystander, report asks **who** only | the commands, the notebook, the report |
| 1 | **Soft-boiled** | report asks who and **how**; method evidence enters | examining places, physical clues |
| 2 | | 4 suspects, 4 places; **one** innocent has a secret | red herrings exist; a liar is not a killer |
| 3 | | coroner gives a **two-tick** window; one anchor required | time of death is something you establish |
| 4 | **Medium** | 5 suspects, 5 places; innocents with secrets: 3; report adds **when** and **where** | branches; the disqualifier |
| 5 | | **innocent motives**: up to 2; report adds **why** | motive alone names nobody |
| 6 | | coroner gives **four ticks**; two anchors; knowledge tests | anchors as evidence; catching a liar on what he should know |
| 7 | **Hard-boiled** | 6 suspects, 6 places; all innocents have secrets; killer may carry a cover secret; **the client is a suspect** | the man paying you might have done it |
| 8 | **Over easy** *(post-game)* | 8 suspects, 8 places; three liars at the murder tick; the sliders come unlocked as a custom case | |

Par by tier, targets: Raw 4–5, Soft-boiled 5–6, Medium 7–8, Hard-boiled 9–12 (today's case), Over easy 12–16. With budget = par + slack, a Raw run is about eight actions: ten minutes.

**Unlocking.** Winning at a tier (full-credit report) unlocks the next. Losing never locks anything. Clearing Hard-boiled unlocks the custom case. Tier 0 through 7 are the "campaign"; the game is "beaten" at 7.

## Difficulty: how much of it is lies

Three dials from M2, now a ladder. Applies at any tier.

| level | name | slack | noise ratio | dead-end depth | corroboration |
|---|---|---|---|---|---|
| 1 | **Beat** | +8 | 30% | 1 | every essential fact has two routes |
| 2 | **Precinct** | +6 | 40% | 1–2 | two routes |
| 3 | **Homicide** | +4 | 50% | 2–3 | the big five have two routes, exculpations one |
| 4 | **The DA's Office** | +3 | ~65% | 2–3 | **single route**: every fact has exactly one findable source |

The noise ratio has a floor set by the spine, which is why level 4 is single-route: it is the only way past 50 percent honestly. At single-route, miss one clue and you cannot file a full report. Unforgiving, fair, and named so the player knows.

Lowering signal does not change par, so it raises difficulty at a constant run length. That is the property that makes it the right primary dial. Slack is the secondary dial; dead-end depth the tertiary.

Noise placement scales with difficulty too: at Beat, noise branches hang off less-visited spine clues; at Homicide and above, they attach to the most-visited ones (the scene, the bartender) so the ratio bites.

## What the generator needs

A `CaseShape` parameter replacing today's constants:

```ts
interface CaseShape {
  suspects: 3 | 4 | 5 | 6 | 8;
  places: 3 | 4 | 5 | 6 | 8;
  innocentSecrets: number;          // 0..suspects-1
  innocentMotives: number;          // 0..3
  coronerWidth: 1 | 2 | 4;          // ticks
  anchorsRequired: 0 | 1 | 2;
  knowledgeTests: boolean;
  liarsAtM: 0 | 1 | 2 | 3;
  killerCoverSecret: boolean;
  clientIsSuspect: boolean;
  reportFields: ('who' | 'how' | 'why' | 'when' | 'where')[];
}
interface Ladder { slack: number; noiseRatio: number; branchDepth: [number, number]; corroboration: 'full' | 'bigFive' | 'single'; }
```

`generateCase(seed, { shape, ladder })`. Tiers and levels are named presets over these two objects. The solvability check, selection, and par computation already generalize; tests get parameterized by shape. The one hard part is three suspects: with so few, one watched place clears everyone, so Raw and Soft-boiled must draw at most one watched place and rely on per-person facts, which the one-subject rule already produces.

**Findable count scales with shape.** Roughly `spine + corroboration + noise`, so Raw is about 12 findable, Hard-boiled stays at 34, Over easy around 44.

**Report scoring** counts only the fields the tier asks for. Fields not asked are not shown.

## What the book needs

- A **profile** in localStorage: tiers cleared, best par delta per tier, runs played, wins, and later the reputation fields. This is the same object Dashiell's evolution will read.
- The title page shows the current tier and level, with the tier's one-line rule ("This time: the coroner is not sure.") and a locked list below.
- The closing page says whether a tier was unlocked.
- `npm run read` takes `--tier` and `--level`.

## Reading the shape

Truth sheets gain a header line with tier, level, shape, and ladder. The batch tool takes `--tier` and `--level` so twenty Raw cases can be read side by side with twenty Hard-boiled ones.

## Open questions for the designer

1. Are eight tiers too many for a campaign? Slay the Spire uses twenty, Balatro eight stakes. Eight feels right but the middle could compress to six.
2. Should difficulty be locked at Beat for tier 0 only, so the very first run is guaranteed gentle?
3. Names. Egg scale for tiers, police hierarchy for difficulty. Or swap. Or something else entirely.
4. Does clearing a tier at a higher difficulty count for more? Balatro says yes with stakes. Simplest: a tier is cleared at any difficulty, and the profile remembers the best.
