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

Measured over pages 1–3 of 40 seeds at difficulty 2 (not seed 3 alone),
reported as mean and worst page.

**Recomputed for Hone 1 (§B.5), against golden v2, one page at a time.** The
table below used to be read off the two golden pages taken as one text, and
the golden loop's report showed what that costs: the orphan-word target was
0.68 when the golden's own office page scores 0.77 and its suite page 0.89, so
three quarters of the loop's outstanding distance was against a number nothing
could have hit. A target the golden itself misses is not a target.

Two things changed with it. `scripts/style-metrics.py` did not break a sentence
after a closing quotation mark, so on a page of dialogue most sentences were
measured glued to the one after them — seed 14's office page came out at
twenty-seven sentences of which two were short when it has thirty-nine of which
fourteen are. Four of the metrics are functions of that list, so every number
here is post-fix, the golden's included, and the numbers in `REPORT.md` are
pre-fix and are not comparable to them.

### Golden v2, measured one page at a time

| metric | office page | suite page |
|---|---|---|
| orphan word ratio | 0.77 | 0.89 |
| paragraph cohesion | 0.53 | 0.80 |
| sentence cohesion | 0.58 | 0.61 |
| short sentences (≤6 words) | 0.565 | 0.158 |
| long sentences (>25 words) | 0.00 | 0.053 |
| dialogue share | 0.43 | 0.00 |
| figures | 1 | 0 |
| words per paragraph | 22.1 | 34.7 |

### The targets

A floor is the mean of the two pages, because the engine's own number is a mean
over a hundred and twenty pages and that is the comparable figure. A band spans
them: what the golden does on one page and on the other is the range the engine
is asked to stay inside. Orphan is the office page plus the 0.05 the spec
allows. `plain_ratio` is the engine's own count of plain sentences against image
ones and has no golden value, so it keeps M5 §1's floor.

| metric | target | where it comes from |
|---|---|---|
| orphan word ratio | ≤ 0.82 | the office page, plus 0.05 |
| paragraph cohesion | ≥ 0.66 | (0.53 + 0.80) / 2 |
| sentence cohesion | ≥ 0.59 | (0.58 + 0.61) / 2 |
| short sentences (≤6 words) | ≥ 0.36 | (0.565 + 0.158) / 2 |
| long sentences (>25 words) | ≤ 0.06 | v2 carries one on its suite page and none on its office page |
| dialogue share on the briefing page | 0.33–0.53 | the office page's 0.43, a tenth either way |
| figures per page | ≤ 0.5 | rule 6: one figure per two pages |
| plain ratio | ≥ 0.60 | M5 §1, unchanged |
| words per paragraph | 22–35 | 22.1 on the office page, 34.7 on the suite page |

The long-sentence target is now a ceiling rather than a band. Measured
correctly, golden v2's office page has no sentence over twenty-five words and
its suite page has one: the carrying sentence the loop built in round 3 stays,
because it reads well and rule 8 asks for a longer sentence rather than a very
long one, but more than one of them a page is more than the golden will support.
