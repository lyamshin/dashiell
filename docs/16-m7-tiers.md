# M7 — Shape: complexity tiers and the difficulty ladder

*Drafted before M5 as `07-m5-shape.md`. Revised 2026-09-22 with the designer's answers and reconciled with what M5 built: case types, tropes, the office, the client, givens and unknowns.*

## The idea

The best roguelikes do not start you at full run length. Balatro's first antes are small. Slay the Spire's Ascension adds one named rule per level. Dashiell does the same: a first run under ten minutes, and each tier adds an idea the player can learn on its own.

Two axes, kept separate:

- **Complexity** is the size of the case. It unlocks by winning.
- **Difficulty** is how tight the night is and how much of the case is lies. It is available from the start, except on the first tier.

## Decisions

These came from the designer and are not open.

1. **Six campaign tiers.** The draft's eight compress to six. Over easy stays as a post-game unlock and is not a tier.
2. **The first tier is locked at Beat.** The very first run is guaranteed gentle.
3. **Egg names for tiers**, police ranks for difficulty.
4. **A tier is cleared at any difficulty.** The profile remembers the best difficulty and the best par delta per tier.

## Complexity: the egg scale

Each tier prints its one new rule on the title page ("This time: somebody else is lying too.").

| tier | name | what changes | what it teaches |
|---|---|---|---|
| 0 | **Raw** | 3 suspects, 3 places. No secrets but the crime. The coroner names the exact half hour. Murder only, body at the scene. The client is never the culprit. The report asks **who**. Always Beat. | The choices, the notebook, the report |
| 1 | **Coddled** | 4 suspects, 4 places. The report adds **how**, and method evidence enters. | Searching rooms; physical clues |
| 2 | **Poached** | One innocent has a secret. | A liar is not a killer |
| 3 | **Soft-boiled** | The coroner gives an hour, two half hours. One anchor is required to fix the time. Every murder trope is in the draw: body moved, locked room, the frame, inside job. | Time of death is something you establish; the scene can lie |
| 4 | **Medium** | 5 suspects, 5 places. Three innocents have secrets, and up to two have innocent motives. The report adds **when**, **where** and **why**. Robbery and missing-person cases join the draw. | Branches, the disqualifier, motive alone names nobody |
| 5 | **Hard-boiled** | 6 suspects, 6 places: today's full case. The coroner gives two hours. Two anchors, and knowledge tests. Every innocent has a secret, and the killer may carry a cover secret. **The client may be the culprit.** | The one paying you might have done it |
| — | **Over easy** *(post-game)* | 8 suspects, 8 places, three liars at the crime's half hour. The sliders come unlocked as a custom case. | |

Par targets by tier: Raw 4–5, Coddled 5–6, Poached 6–7, Soft-boiled 7–8, Medium 9–10, Hard-boiled 12–14 (today's case), Over easy 14–18. Today's `PAR_FLOOR` of 9 and the fixed findable target of 34 become per-shape values.

**Unlocking.** A full-credit report at a tier unlocks the next. Losing never locks anything. Clearing Hard-boiled unlocks Over easy. The campaign is tiers 0 through 5, and the game counts as beaten at Hard-boiled.

### What changed from the draft

- Eight tiers became six. The old tiers 2 and 3 split differently: the secret is Poached on its own, and the time window arrives with the full set of murder tropes at Soft-boiled. The old tiers 4 and 5 merged into Medium. The old tier 6 merged into Hard-boiled.
- **Case types and tropes are now tier content.** M5 added them after the draft. Raw through Poached deal only murders with the body at the scene. Soft-boiled opens every murder trope. Medium adds robbery and missing persons.
- **The client.** The draft had a bystander client at Raw. Since M5 every case has a client in the office. Today the client is the culprit in a quarter of cases at every difficulty. Under tiers, the client is never the culprit below Hard-boiled, and a quarter of the time from Hard-boiled on.
- **The report.** Since M5 the report asks only what the case left unknown. A tier's report fields are a ceiling: the report asks the tier's fields that the case left unknown. Tests must confirm every tier asks at least one question for every case type it deals.

## Difficulty: how much of it is lies

The three dials from M2, as a ladder. Any level applies at any tier except Raw, which is always Beat.

| level | name | slack | noise ratio | dead-end depth | corroboration |
|---|---|---|---|---|---|
| 1 | **Beat** | +8 | 30% | 1 | every essential fact has two routes |
| 2 | **Precinct** | +6 | 40% | 1–2 | two routes |
| 3 | **Homicide** | +4 | 50% | 2–3 | the big five have two routes, exculpations one |
| 4 | **The DA's Office** | +3 | ~65% | 2–3 | **single route**: every fact has exactly one findable source |

Levels 1 to 3 exist today, with noise held between 35 and 45 percent for all three. This milestone spreads the noise across the ladder as the table says and adds level 4.

The noise ratio has a floor set by the spine, which is why level 4 is single-route: it is the only honest way past 50 percent. At single-route, miss one clue and you cannot file a full report. That is unforgiving but fair, and the name tells the player so.

Lowering signal does not change par, so it raises difficulty at a constant run length. That makes it the primary dial. Slack is secondary and dead-end depth tertiary.

Noise placement scales too. At Beat, noise branches hang off less-visited spine clues. At Homicide and above, they attach to the most-visited ones, like the scene or the bartender, so the ratio bites.

**Slack at small tiers.** Eight spare calls on a Raw case with par 4 is a night with no pressure. Slack scales with par below Medium: `round(slack × par / 12)`, never below 3. The clock should still matter on the first run, just gently.

## What the generator needs

A `CaseShape` and a `Ladder` replace today's constants:

```ts
interface CaseShape {
  tier: 0 | 1 | 2 | 3 | 4 | 5 | 'over-easy' | 'custom';
  suspects: 3 | 4 | 5 | 6 | 8;
  places: 3 | 4 | 5 | 6 | 8;
  innocentSecrets: number;          // 0..suspects-1
  innocentMotives: number;          // 0..3
  coronerWidth: 1 | 2 | 4;          // half hours
  anchorsRequired: 0 | 1 | 2;
  knowledgeTests: boolean;
  liarsAtCrime: 0 | 1 | 2 | 3;
  killerCoverSecret: boolean;
  clientMayBeCulprit: boolean;
  caseTypes: CaseType[];            // which of murder, robbery, missing
  tropes: Trope[];                  // which tropes may be drawn
  reportFields: ('who' | 'how' | 'why' | 'when' | 'where')[];
  par: [number, number];
  findable: number;
}
interface Ladder {
  level: 1 | 2 | 3 | 4;
  slack: number;
  noiseRatio: [number, number];
  branchDepth: [number, number];
  corroboration: 'full' | 'bigFive' | 'single';
}
```

`generateCase(seed, { shape, ladder })`. Tiers and levels are named presets over these two objects, in one file. With no options, `generateCase` produces Hard-boiled at the given difficulty, byte-identical to today's output for levels 1 to 3, so every existing test and seed keeps its meaning. The golden loop and the transcripts stay comparable.

The solvability check, selection and par computation already generalize. Tests get parameterized by shape. The one hard part is three suspects: with so few, one watched place clears everyone. So Raw and Coddled draw at most one watched place and rely on per-person facts, which the one-subject rule already produces.

**Findable count scales with shape.** Roughly spine plus corroboration plus noise, so Raw is about 12 findable, Hard-boiled stays at 34, Over easy about 44.

**Report scoring** counts only the fields the report asks. Fields not asked are not shown.

## What the book needs

This part waits for M6 (the choices) to merge, because it touches the same title page and closing page.

- A **profile** in localStorage: tiers cleared, best difficulty and best par delta per tier, runs played, wins, and later the reputation fields. This is the same object the detective's evolution will read. Wrap every read and write so a blocked storage still plays.
- The title page shows the current tier and level, the tier's one-line rule, and the locked tiers below. Raw shows no difficulty choice.
- The closing page says whether a tier was unlocked.
- `npm run read` takes `--tier` and `--level`.

## Reading the shape

Truth sheets gain a header line with tier, level, shape and ladder. The batch tool takes `--tier` and `--level` so twenty Raw cases can be read side by side with twenty Hard-boiled ones.

## Tests

- Every tier at every level it allows generates a solvable case for 200 seeds, with par inside the tier's range.
- The default options reproduce today's cases exactly for difficulties 1 to 3 over 200 seeds.
- Raw at any requested level plays at Beat.
- The client is never the culprit below Hard-boiled.
- Every tier asks at least one report question for every case type it deals.
- The oracle solves every tier within par plus one.
- At The DA's Office, every essential fact has exactly one findable source.
