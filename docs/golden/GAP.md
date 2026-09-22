# The gap: engine output vs. the golden example

Measured with `scripts/style-metrics.py` on seed 3, pages one and two. Golden: `docs/golden/seed3-opening.md`. Engine: `docs/golden/seed3-current.txt` (main at the time of writing).

| metric | golden | engine | reading |
|---|---|---|---|
| orphan word ratio | 0.64 | **0.78** | The density. Three quarters of the engine's content words appear once and never again. The golden reuses its nouns (coat, hand, finger, roll, window). One-off words are one-off images. |
| paragraph cohesion | 0.68 | **0.53** | The disjointedness. Half the engine's paragraphs open on something the previous paragraph did not mention. |
| short sentences (≤6 words) | 33% | **20%** | The golden breathes with short lines, most of them dialogue. The engine's sentences are all mid-length. |
| long sentences (>25 words) | 8 | **1** | The golden has one carrying sentence per few paragraphs. The engine has none; everything is the same weight. |
| dialogue share | 0.24 | **0.16** | The client should carry the exposition in her own turns. The engine narrates what she should say. |
| words per paragraph | 34 | 26 | Engine paragraphs are short and many; each is a separate card. |
| figures per 100 words | 0.13 | 0.0 | Not the problem any more. The similes are gone. What remains dense is description, not figure. |

## What the numbers mean, as a stylist would say it

1. **The engine describes in inventories.** "Kreuzer: a crooked little finger, broken once and never reset. Collar buttoned, no tie, and a smear of green paint at one shoulder." Three details, none of them followed. The golden gives the finger a reason to be seen (she keeps the hand in her pocket) and gives it two sentences. One detail, followed, beats three listed.

2. **Every paragraph is a new card, so every paragraph is a new subject.** Frost on the glass, then a door shutting soft, then a woman on the stairs, then a biography. The golden goes: cold → desk → stairs → woman → coat → hand → finger. Each paragraph hands a noun to the next.

3. **The client's exposition is narrated as a block of quoted facts.** Sixteen sentences in four quoted paragraphs with no question between them. Hammett's clients talk in long turns, but the detective's short questions are what make the turns feel spoken: "What were you doing in his rooms at half past eleven?" forces "Collecting." The engine has Dashiell's questions for the interviews but not for the briefing.

4. **No rhythm.** Median 11 words, almost nothing under six, nothing over twenty-five. The golden has nineteen sentences of six words or fewer and eight long ones. Rhythm is not a card; it is an assembly decision.

5. **Dashiell is present but generic.** "My knuckle had split open again" is good. "Frost had crept across the window glass from the inside" is a second image on the same page about a different thing. One is a mood; two is decoration.

6. **The connective sentences are missing.** "She sat. She did not take the coat off." "I knew it." "She let that sit." These cost nothing, carry no image, and they are what make a page read as a scene rather than a deck.

## Targets for the loop

Measured over pages 1–3 of 40 seeds at difficulty 2 (not seed 3 alone), reported as mean and worst page:

| metric | target |
|---|---|
| orphan word ratio | ≤ 0.68 mean |
| paragraph cohesion | ≥ 0.65 mean |
| sentence cohesion | ≥ 0.55 mean |
| short sentences (≤6 words) | ≥ 28% |
| long sentences (>25 words) | 1 per 8 sentences, ±half |
| dialogue share on the briefing page | 0.30–0.45 |
| figures per page | ≤ 1 |
| plain ratio | ≥ 0.60 (already enforced at 0.5) |
| words per paragraph | 30–45 |
