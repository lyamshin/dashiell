# 22 — Deck exposure: where a player notices a card coming round again

Measurement only. This sets the targets for the writers who expand the decks next. No game code changed.

```
npx tsx scripts/deck-exposure.ts --seeds 50 --people 10 --md out.md --json out.json
```

Takes about six minutes. The output is deterministic: the same seeds give the same tables.

## How it was measured

- **Nights.** There were 17 configs: untiered Beat (`d2`), Raw (`T0`, which is locked to one level), and tiers 1–5 at levels 1–3. Each config got 50 cases with its own seeds. Each case was played by three players through the real reducer. That makes 2,550 nights, at a mean of 14.1 pages a night.
  - **Oracle:** `playOracle`'s route, replayed.
  - **Wanderer:** `playWandering`'s route and filing.
  - **Reasoning player:** the M9 solver-reading player. It was moved unchanged out of `scripts/diagnose-play.ts` into `scripts/players.ts` so both scripts can import it. `diagnose-play` output is byte-identical.
- **What counts as a deal.** Every `Dealer.draw` is watched by wrapping the prototype for the length of the script. For each draw the script records the deck, the card, the ladder rung it came off, and whether its words reached the page and in which paragraph (matched by three-word shingles). Three decks are dealt without the dealer, and the script reads them back off the run state instead:
  - `portraits` and `portrait-pairs`, rolled once a night by `rollCast`
  - `activity`, hashed per person and visit by the planner
  - `story`, told once a case
- **Only reads count.** A card that was dealt but cut before it reached the page is not a read.
- **Cross-run burning.** This is simulated the way the book does it. 30 people (10 per player type) each play 85 nights in sequence with one localStorage. `newRun` and every `stepInput` get `loadBurned(store)`, and `addBurned(store, crossRunOnly(…), CROSS_RUN_TOTAL)` follows each of them, exactly as in `src/ui/book.ts`. Each night has a seed of its own. Seed 7 at every tier would give one person 17 nights with the same sky and circumstance, which a real player never sees; an earlier pass did this and overstated staleness by about 30 points.
- **The key.** The dealer matches cards with closures, so the script reads the key off a rung by probing it:
  1. Take a card the rung accepts. If there is none, nudge one tag of the dealt card, or use a synthetic card with every tag `any`.
  2. Vary one tag at a time over every value the schema and the deck know.
  3. Keep the values the rung accepts.

  The key reported is the rung the card was dealt from. Fallback is reported against the key that was asked for (rung 0). `cards` is the number of cards on the rung that suit the night's weather and whose slots the beat can fill. Cards the dealer has to skip for a missing slot are counted separately.
- **Metrics.**
  - **Repeat:** the same card read twice in one night.
  - **Stale:** a read of a card the person read on an earlier night, measured over each person's nights 11–20.
  - **First stale night:** the median person's first such read.
  - **Score** (player-visible repetition per night) = (same-night repeats + ⅓ × stale reads a night) × (1 + share of the key's reads that open a page) × ¼ on the closing page and the story. In words: a repeat inside a night counts in full, and a card from an earlier night counts a third. A line that opens its page counts double. The verdict's last line and the optional story count a quarter.

## What stands out

1. **Nine decks (1,074 cards) are never dealt: `similes`, `places`, `transitions`, `ambient`, `asides`, `find`, `frames`, `business`, `witness`.** They belong to the M4 page path (`composePage` in `voice/page.ts`). Since M8 that path writes only the office opening and the parser's nothing-page, and neither reaches those draws. The scene engine has one hook into `ambient`, a short-page texture in `realize.ts`, and it did not fire in 2,550 nights. `portraits` (159) is worse than dead. `rollCast` rolls a trait, a habit and a piece of clothing for every person every night and burns all three across runs, but the scene never prints them. Only the client's pair text at the office and the pair's recall action reach a page. **Writers should not expand any of these decks until the engine deals them again.**
2. **Almost nothing is remembered between nights.** Four decks burn run-to-run: `similes`, `asides`, `portraits` and `portrait-pairs`. The only one read is the pair action. Every deck a player actually reads is `free` or `within-run`, so a card read on night 1 can come back on night 2. Median first stale night is **2–3** for `thought`, `hours`, `activity`, `dashiell-lines`, `bridge`, `carry`, `errand`, `watch`, `hiring` and `story`. Over nights 11–20, 59–93% of their reads are cards the person has already read.
   - No number of cards fixes that without memory. A no-memory deck with *n* cards read *m* times a night is roughly 1 − e^(−10m/n) stale by night 11.
   - The 10-night targets below assume the engine starts burning these decks across nights; see [Engine changes](#engine-changes-the-writing-depends-on). Without that, the counts roughly triple (about 700 cards, 201 of them in the story) and still leave the second ten nights about half stale.
3. **Same-night repeats come mostly from the engine, not from thin decks.**
   - One person does the same `activity` card on two visits in **33% of nights**. The planner hashes a fresh pick per visit with no memory of the last one.
   - Two people are handed the same `portrait-pairs` card in **28% of nights**. `rollCast`'s fallback reaches for a burned card without checking tonight's picks.
   - A person's pair recall action is said again on every visit: 5.5 a night, 42% of nights with one action twice or more.
   - The detective's question about somebody (`dashiell-lines` ask-person) repeats inside the night in **28% of nights**. The placeholder "Tell me about {topic}." is 71% of those questions: the beat hands over `{name}` on only about a third of asks, and all five written cards need it.
4. **Slot starvation hides whole decks.**
   - 14 of 20 `hiring` cards need `{business}`, which is never supplied, and 3 need `{dashiell}`. So five cards do every night's hiring. `hir-006` alone is the hiring line in a third of all nights (837 of 2,550).
   - `answer` cards for a dead end need `{name}` or `{subject}`, so 3 of 18 are dealable.
   - `carry` has 50 cards and `thought` has 28 that ask for slots their beat does not always fill. The full list is in [Slots a beat never supplies](#slots-a-beat-never-supplies).
5. **The dealer is biased where a deck is scored by motif.** The dealer sorts by motif score first and uses the shuffle only to break ties. The best-scoring card for a night wins every time it is unburned.
   - `office` (the first paragraph of every night): `off-022` is 42 of 48 sleepless-and-rain openings.
   - `story` is not dealt, it is chosen: the most specific card wins, then a hash. One card makes the role line in 71% of stories ("{actor} was {role}."), and one makes the since line in 72% of the stories that have one.
6. **Three cards read wrong in some fills:** two hiring cards print ".." and one arrival starts a sentence lower-case (see [Cards that read wrong](#cards-that-read-wrong)).
7. **None of the validator's 26 empty tag combinations is reachable in play.** 16 are `places` and 10 are `witness`, and neither deck is dealt. Of the 16 `places` cells, only private × elevator-man exists in the generated world (118 of 3,900 places). That cell matters only if `places` comes back.

## Per deck

| deck | burn | cards | read / night | p90 | share of pages | opens its page | nights with a repeat | stale, nights 11–20 | first stale night | widened | dropped | never read |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| thought | free | 316 | 15.0 | 23 | 79% | 0% | 25% | 77% | 2 | 0.3% | 3.1% | 47 |
| story | free | 349 | 21.6 | 23 | (closing) | — | 5.1% | 77% | 2 | — | — | 30 |
| portrait-pairs | run-to-run | 120 | 9.9 | 17 | 27% | 0% | 47%* | 37% | 8 | 0% | 0% | 16 |
| activity | free | 307 | 7.1 | 12 | 20% | 0% | 39% | 63% | 2 | — | — | 152 |
| hours | free | 45 | 5.6 | 8 | 45% | 32% | 0% | 93% | 2 | 0% | 0% | 0 |
| carry | free | 158 | 4.7 | 9 | 30% | **100%** | 0.1% | 70% | 3 | 0% | 0% | 62 |
| bridge | free | 57 | 4.2 | 8 | 29% | 0% | 0.7% | 83% | 3 | 1.4% | 0% | 15 |
| errand | free | 402 | 4.0 | 7 | 29% | **100%** | 0.3% | 59% | 3 | 0% | 0% | 153 |
| dashiell-lines | free | 91 | 3.5 | 7 | 22% | 1.9% | 31% | 76% | 2 | 0% | 0% | 70 |
| establish | within-run | 144 | 3.3 | 5 | 25% | 0% | 0% | 32% | 5 | 0% | 0% | 17 |
| watch | within-run | 66 | 3.3 | 5 | 25% | 0% | 0% | 69% | 3 | 0% | 0% | 6 |
| arrivals | within-run | 70 | 3.0 | 4 | 23% | 0% | 7.4% | 68% | 3 | 2.5% | 8.4% | 11 |
| place-ambient | within-run | 245 | 2.7 | 5 | 18% | 33% | 0% | 40% | 5 | 4.2% | 0.6% | 52 |
| utterances | free | 178 | 1.2 | 2 | 7.0% | 0% | 5.1% | 32% | 9 | 5.0% | 0% | 117 |
| search-act | within-run | 140 | 1.2 | 3 | 7.9% | 0% | 0% | 18% | 19 | 0% | 0% | 8 |
| office | within-run | 30 | 1.0 | 1 | page 1 | **99%** | 0% | 54% | 6 | 0% | 0% | 1 |
| entrances | within-run | 40 | 1.0 | 1 | page 1 | 0% | 0% | 52% | 6 | 4.0% | 0% | 1 |
| hiring | within-run | 20 | 1.0 | 1 | page 1 | 0% | 0% | 92% | 3 | 72% | 0% | 15 |
| endings | free | 46 | 1.0 | 1 | (closing) | — | 0% | 68% | 5 | 12% | 0% | 2 |
| return | free | 40 | 0.7 | 2 | 4.0% | 0% | 0% | 38% | 13 | 0% | 0% | 0 |
| crowd | within-run | 129 | 0.7 | 2 | 5.3% | 0% | 0.1% | 13% | 12 | 87%† | 0% | 37 |
| answer | free | 54 | 0.7 | 2 | 3.8% | 0% | 0% | 47% | 9 | 0% | 0% | 33 |
| confront | within-run | 72 | 0.3 | 0 | 0.5% | 0% | 0% | 23% | 13 | 0% | 0% | 13 |
| decide | within-run | 32 | 0.1 | 0 | 0.3% | 0% | 0% | 0% | 75 | 0% | 0% | 10 |
| similes, places, transitions, ambient, asides, find, frames, business, witness | — | 1,074 | 0 | | | | | | | | | all |
| portraits | run-to-run | 159 | 0 (burned ~3 a person, never printed) | | | | | | | | | 159 |

\* Includes the pair's recall action said again on later visits. Pairs alone: 28% of nights hand two people the same card.
† By design: the rung asks for a band-specific card first and the deck writes `band: any`.

### Which beats are seen

- **Every page, or nearly.** `thought` (79% of pages, about 15 reads a night) and `hours` (45%, and it opens the page a third of the time). Next are the page openers `carry` and `errand`: each is on about 30% of pages and always the first paragraph. Then `bridge` (29%), `establish`, `watch` and `arrivals` (every arrival), `dashiell-lines` (every question), `activity` (every room with somebody in it) and `place-ambient` (18%, opening a third of them).
- **Once a night, first thing.** `office` is the first paragraph of every night; `entrances` and `hiring` follow it on page 1.
- **Once a night, last thing.** `endings` is the verdict's last line. `story` is roughly 22 lines, and only if the player opens it.
- **Now and then.** `return`, `search-act`, `crowd`, `answer`, `utterances`, `confront`, `decide`.

## Ranking: player-visible repetition

### By deck

| # | deck | score | what the player sees |
| ---: | --- | ---: | --- |
| 1 | thought | 4.14 | 15 thoughts a night from small keys: one thought twice in 25% of nights; 77% of later reads are old |
| 2 | activity | 2.36 | the same person doing the same thing on two visits in 33% of nights |
| 3 | hours | 2.28 | "It was past {hour}." five times a night from 15 cards |
| 4 | carry | 2.12 | the page's first line, from 7–13 cards a key |
| 5 | errand | 1.52 | the page's first line; the busy keys have 4–15 cards |
| 6 | dashiell-lines | 1.46 | the detective's question, from 2–5 dealable cards |
| 7 | story | 1.41 (after ¼) | a handful of cards tell every story |
| 8 | portrait-pairs | 1.39 | two people with one description; a recall action said twice |
| 9 | bridge | 1.15 | "{who} would know where {subject} had been", 5 cards for the commonest key |
| 10 | watch | 0.73 | "Nobody was paid to notice, so nobody did.", 6 cards for every unwatched room |
| 11 | arrivals | 0.72 | the weather on arrival: 1–2 cards a cell |
| 12 | place-ambient | 0.44 | |
| 13 | office | 0.36 | the night's first paragraph, picked by motif score |
| 14 | establish | 0.34 | |
| 15 | hiring | 0.31 | five dealable cards |

### Top 25 keys

| # | deck | key | cards | read / night | p95 | nights with a repeat | stale 11–20 | first stale night | opens page | score |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | hours | `beat=hour` | 15 | 5.00 | 6 | 0% | 99% | 2 | 32% | 2.19 |
| 2 | dashiell-lines | `kind=ask-person familiar=no` | 3 (+3 unfillable) | 1.40 | 5 | **28%** | 60% | 3 | 5% | 0.80 |
| 3 | bridge | `tie=victim lead=ask` | 5 | 2.29 | 5 | 0.7% | 82% | 3 | 0% | 0.65 |
| 4 | thought | `class=touches case=murder basis=account` | 3 | 1.35 | 4 | 7.6% | 93% | 3 | 0% | 0.50 |
| 5 | bridge | `tie=time lead=ask` | 7 | 1.84 | 5 | 0% | 87% | 4 | 0% | 0.50 |
| 6 | dashiell-lines | `kind=ask-evening familiar=no` | 5 | 1.55 | 4 | 0.6% | 98% | 3 | 0% | 0.49 |
| 7 | thought | `class=implicates case=murder basis=access` | 3 | 1.21 | 3 | 4.4% | 95% | 3 | 0% | 0.46 |
| 8 | watch | `watcher=none` | 6 | 1.49 | 2 | 0% | 98% | 3 | 0% | 0.46 |
| 9 | thought | `class=view case=murder who=known lied=no` | 2 | 1.23 | 3 | 7.8% | 95% | 2 | 0% | 0.44 |
| 10 | carry | `for=search-room lead=no setting=indoor` | 10 | 0.76 | 3 | 0% | 86% | 10 | 100% | 0.42 |
| 11 | carry | `for=ask-evening lead=yes setting=indoor` | 13 | 0.78 | 2 | 0% | 73% | 7 | 100% | 0.37 |
| 12 | portrait-pairs | `class=working gender=m setting=anywhere` | 20 | 1.01 | 3 | 11% | 63% | 8 | 0% | 0.35 |
| 13 | errand | `because=said for=ask-person bridged=no setting=indoor` | 15 | 0.77 | 2 | 0% | 65% | 5 | 100% | 0.34 |
| 14 | carry | `for=ask-place lead=yes setting=indoor` | 13 | 0.79 | 3 | 0% | 65% | 7 | 100% | 0.32 |
| 15 | errand | `because=said for=ask-person bridged=yes setting=indoor` | 4 | 0.57 | 2 | 0.2% | 98% | 4 | 100% | 0.31 |
| 16 | errand | `because=said for=search-room bridged=no setting=indoor` | 15 | 0.71 | 1 | 0% | 67% | 4 | 100% | 0.30 |
| 17 | carry | `for=ask-evening lead=no setting=indoor` | 10 | 0.53 | 3 | 0% | 87% | 6 | 100% | 0.29 |
| 18 | portrait-pairs | `class=working gender=f setting=anywhere` | 19 | 0.89 | 3 | 6.5% | 66% | 10 | 0% | 0.25 |
| 19 | thought | `class=window case=murder basis=dead-by` | 6 | 0.81 | 2 | 0% | 87% | 4 | 0% | 0.23 |
| 20 | thought | `class=method case=murder` | 9 | 0.86 | 2 | 0% | 79% | 4 | 0% | 0.23 |
| 21 | thought | `class=clears case=murder` | 12 | 0.82 | 3 | 0% | 69% | 9 | 0% | 0.20 |
| 22 | carry | `for=search-room lead=no setting=outdoor` | 7 | 0.31 | 1 | 0% | 88% | 11 | 100% | 0.19 |
| 23 | thought | `class=absent case=murder` | 12 | 0.73 | 3 | 0% | 76% | 6 | 0% | 0.18 |
| 24 | carry | `for=ask-evening lead=yes setting=outdoor` | 13 | 0.38 | 2 | 0% | 68% | 9 | 100% | 0.17 |
| 25 | story | `beat=after` | 10 | 1.87 | 3 | 5.1% | 94% | 3 | 0% | 0.16 |

The script prints the ranking to 60 and a per-key table for every deck.

### Fallback: what a beat asked for and did not get

Keys asked for at least once in twenty nights with 10% or more fallback:

| deck | asked | rung-0 cards | asks / night | widened | dropped | note |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| hiring | `temper=plain familiar=no` | 0 | 0.39 | 100% | 0% | 4 cards, all need `{business}`; lands on the 5 generic cards |
| hiring | `temper=yap familiar=no` | 0 | 0.26 | 100% | 0% | same |
| thought | `class=touches basis=described` (murder, robbery, missing) | ~1 | 0.51 | 0% | 73–80% | the beat is dropped; 1 card per case type, and it has to hedge |
| arrivals | `placeKind=public hourBand=midnight-2 weather=cold` | 0 | 0.13 | 0% | 100% | no card at all: the arrival goes without its weather |
| arrivals | `placeKind=public/private hourBand=4-6 weather=clear` | 0.3–0.5 | 0.14 | 0% | 54–67% | |
| arrivals | `placeKind=semi hourBand=2-4 weather=cold` | 0 | 0.06 | 97% | 0% | |
| bridge | `tie=place lead=search` | 0 | 0.06 | 100% | 0% | |
| thought | `class=context case=murder` | 0 | 0.05 | 0% | 100% | |
| utterances | `factKind=personAt temper=plain register=truth` | 1.9 | 0.26 | 11% | 0% | a placeholder is 1 of the 2 |
| crowd, place-ambient | `band=<specific>` | 0–1 | — | 87% / 4% | — | by design: the `any` band is rung 1 |

## Engine changes the writing depends on

These are not writing tasks. Each one decides whether cards added to a deck will be read at all.

1. **Remember the decks a player reads across nights.** Make `hours`, `thought`, `bridge`, `carry`, `errand`, `dashiell-lines`, `watch`, `arrivals`, `office`, `entrances` and `hiring` run-to-run, or keep the last ten nights' ids. The batch targets below assume this. It is a schema change plus the `CROSS_RUN_TOTAL` reset.
   - That reset has its own problem: the pile clears only when every run-to-run card has been burned. `similes` and `asides` are never dealt, so it never clears. Once a key is exhausted, the dealer reshuffles inside that key forever.
2. **Give the activity planner the person's own earlier cards.** `chooseActivity` already takes `taken`. It should include what this person did on earlier visits tonight. That fixes the repeat in 33% of nights.
3. **Keep `rollCast` off tonight's picks.** The fallback `rng.shuffle(fits)[0]` should prefer cards not already used this night. That fixes two people sharing one pair in 28% of nights. And stop rolling and burning the three portrait components nobody prints (about 25 cards a night) until the scene prints them.
4. **Supply the slots the cards were written with.**
   - `hiring`: `{business}`, and `{dashiell}` (unknown to the schema).
   - `dashiell-lines` ask-person: `{name}`.
   - `answer`: `{name}` and `{subject}`.
   - The alternative is to drop those slots from the cards. See the table below.
5. **Draw inside a score band, not the top score.** For decks with motifs (office, hiring, entrances, endings), draw at random among cards within a point of the best score. Otherwise a new card with the wrong motifs is never read.
6. **Rotate the story's most-specific choice.** A beat's card is the most specific card that fits, and ties are broken by hash. Some beats resolve to one card for nearly every case, so extra story cards at a lower specificity are never read.
7. **Decide the fate of the nine undealt decks and `portraits`,** before anyone writes for them.

### Slots a beat never supplies

| deck | slot | cards skipped | skips / night | beat |
| --- | --- | --- | ---: | --- |
| hiring | `{business}` | 14 (hir-007…hir-019) | 10.5 | `hiringFrame` |
| dashiell-lines | `{name}` | 10 (hum-011…hum-020) | 6.2 | `dashiellLine` |
| thought | `{subject}` | 28 (tht-163…) | 2.4 | `thoughtLine` |
| carry | `{name}` | 50 (cry-001…, cry-101…) | 2.3 | carry, when there is no lead |
| hiring | `{dashiell}` | 3 (hir-010, hir-012, hir-019) | 2.2 | `hiringFrame` |
| dashiell-lines | `{time}` | 2 (hum-045, hum-047) | 1.8 | `dashiellLine` |
| answer | `{name}` | 24 (ans-001…ans-027) | 1.0 | answer |
| thought | `{place}` / `{time}` | 16 / 10 (tht-h031…) | 0.75 | `thoughtLine` |
| establish | `{watcher}` / `{owner}` | 4 / 2 | 0.4 / 0.2 | establish |
| answer | `{subject}` | 6 | 0.2 | answer |

Some of these are conditional: `carry` gets `{name}` only when there is a lead. Those cards are read sometimes and skipped the rest. The beat never fills the `hiring` `{business}` cards or the dead-end `answer` cards (3 of 18 dealable). The `dashiell-lines` ask-person cards get `{name}` on about a third of asks.

## Dealer bias

A key's most-read card got three or more times its fair share (reads ÷ cards on the rung) in these keys:

| deck | key | cards | reads | top card | share of the key's reads | × fair | why |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| story | `beat=role` | 10 | 2,550 | STY-017 "{actor} was {role}." | 71% | 7.1 | most-specific rule |
| story | `beat=headline` | 10 | 2,550 | STY-007 "{actorFull} killed {victimFull}." | 52% | 5.2 | most-specific rule |
| story | `beat=since` | 6 | 2,391 | STY-323 "By then {victim} had been dead for {span}." | 72% | 4.3 | most-specific rule |
| story | `beat=act` / `beat=means` | 35 / 30 | 2,550 | STY-253 / STY-182 | 14% / 13% | 4.8 / 4.0 | most-specific rule |
| story | `beat=arrive` | 6 | 1,497 | STY-225 | 64% | 3.8 | most-specific rule |
| office | `circumstance=sleepless weather=rain` / `fog` | 4 | 48 / 78 | off-022 | 88% / 77% | 3.5 / 3.1 | motif score |
| office | `circumstance=bruised weather=cold` | 4 | 90 | off-014 | 77% | 3.1 | motif score |
| hiring | `(any)` | 5 | 1,176 | hir-006 | 64% | 3.2 | motif score over the 5 fillable cards |
| dashiell-lines | `kind=ask-person familiar=no` | 3 (+3) | 3,563 | hum-p003 "Tell me about {topic}." | 71% | 2.1 | slot starvation: the only card that needs no `{name}` |

Outside the dealer, `activity` has its own skew. The planner takes the person's role first and uses the 20 role-less cards only where a role has none. A fixture role has 3 cards (bartender, doorman, newsstand, ticket-taker, elevator-man, cabbie, druggist), split across place kinds and bands, so one card often serves every visit.

## Cards that read wrong

| card | fills | as read |
| --- | ---: | --- |
| hir-006 | 108 | "Start with Wehrle. He was carrying a parcel into the cab stand and came out without it**..** You know the rate." The card writes `{fact}.` and the fact already ends in a stop. |
| hir-002 | 69 | "…an address on a street that does not exist**..**" Same seam. |
| arr-029 | 31 | "…a boy stacking crates outside the grocer's. **the** parlour had its door propped…" `{place}` opens a sentence mid-card, and `fill` capitalises a slot only at the start of the card. This happens whenever the place's short name is lower-case, which is nearly every place. |

Nothing else tripped the checks for doubled articles, a/an against the filled word, unfilled slots, doubled words or stray spaces before punctuation.

## The validator's 26 empty tag combinations

| deck | cells | asked for in play | in the generated world |
| --- | --- | ---: | --- |
| places | placeKind × watcher: private × {bartender, doorman, newsstand, counterman, ticket-taker, beat-cop, cabbie, druggist}; semi × {newsstand, beat-cop, cabbie}; public × {bartender, doorman, elevator-man, landlady} | 0 | none |
| places | private × elevator-man | 0 | 118 of 3,900 places |
| witness | fixtureRole × register: every role × `lie` | 0 | — (legacy deck, nothing deals it) |

None is reachable today, because neither deck is dealt. If `places` returns, only private × elevator-man needs cards. The generator deals 13 kind × watcher combinations in all:

| kind × watcher | places |
| --- | ---: |
| private × none | 1,371 |
| public × none | 708 |
| semi × counterman | 385 |
| private × landlady | 242 |
| semi × bartender | 228 |
| public × ticket-taker | 215 |
| semi × landlady | 149 |
| private × elevator-man | 118 |
| public × cabbie | 104 |
| public × druggist | 103 |
| public × newsstand | 95 |
| semi × doorman | 91 |
| public × counterman | 91 |

## Targets

The rule, per key: **add = max(night, 10 nights) − cards now.**

- **night** is 1.2 × the 95th-centile night's reads, or just the 95th centile when that is 1. Inside a night the dealer never repeats while the rung has an unread card, so this keeps fewer than one night in twenty from running the key dry. The fifth extra covers `any` cards a sibling key spends first, and cards the hour or slot filters refuse.
- **10 nights** is 10 × the mean reads a night. With cross-night memory (engine change 1), a person reads ten nights before a card of the key comes back.

Keys read less than once in fifty nights are left out. `cards now` counts only cards the beat can fill: fix the slots first, or those cards count against the target.

The totals come to **211 cards: 13 of them to stop same-night repeats and 198 for ten fresh nights.** Without cross-night memory, the same ten-night goal needs about 20× the mean instead of 10×: roughly 700 cards, and the second ten nights would still be half stale.

The batches share no files. Within each batch, keys are in ranking order.

### A. Reasoning voice (`thought`, `bridge`, `carry`, `answer`, `decide`, `confront`): 77 cards

| deck | key | cards now | add | why |
| --- | --- | ---: | ---: | --- |
| bridge | `tie=victim lead=ask` | 5 | 19 | read 2.3 a night, up to 5; 5 cards last two nights; 82% stale |
| thought | `class=touches case=murder basis=account` | 3 | 11 | read 1.35 a night, up to 4: a repeat in 7.6% of nights; 93% stale |
| bridge | `tie=time lead=ask` | 7 | 12 | read 1.84 a night, up to 5; 87% stale |
| thought | `class=view case=murder who=known lied=no` | 2 | 11 | read 1.23 a night, up to 3: a repeat in 7.8% of nights; 95% stale |
| thought | `class=implicates case=murder basis=access` | 3 | 10 | read 1.21 a night, up to 3: a repeat in 4.4% of nights; 95% stale |
| thought | `class=window case=murder basis=dead-by` | 6 | 3 | 0.81 a night; 87% stale |
| thought | `class=touches case=murder basis=placement` | 4 | 2 | 0.51 a night; 94% stale |
| thought | `class=view case=murder who=client lied=no` | 3 | 2 | 0.49 a night; 98% stale |
| thought | `class=touches case=murder basis=count` | 3 | 2 | 0.50 a night; 97% stale |
| thought | `class=touches case=murder basis=timing` | 3 | 1 | 0.30 a night |
| thought | `class=window case=murder basis=coroner` | 2 | 1 | 0.29 a night |
| thought | `class=touches case=murder basis=absence` | 3 | 1 | 0.34 a night |
| thought | `class=view case=robbery who=known lied=no` | 2 | 1 | up to 2 a night on 2 cards: a repeat in 2.4% of nights |
| thought | `class=touches case=robbery basis=described` | 1 | 1 | the beat is dropped 76% of the time for want of a hedged card |

Also, outside the formula: `class=touches basis=described` for murder and missing is dropped 73–80% of the time. Two hedged cards each would stop the drop. `carry` needs nothing more at 10 nights (its busy keys have 10–13 cards at 0.3–0.8 a night), but it opens every page it is on. It is the first deck to double if the engine keeps no memory.

### B. Places (`establish`, `place-ambient`, `search-act`, `return`, `watch`, `crowd`, `activity`): 10 cards

| deck | key | cards now | add | why |
| --- | --- | ---: | ---: | --- |
| watch | `watcher=none` | 6 | 9 | every unwatched room, 1.49 a night; 98% stale; "Nobody was paid to notice, so nobody did." |
| activity | `role=bartender placeKind=semi` | 3 | 1 | 0.34 a night; 74% stale |

The small number is honest. The place decks are keyed per room, and no one room is visited often enough to exhaust its cards. Their repetition is the activity planner's memory (engine change 2), not card count. After that fix, give each fixture role at least 6 activity cards. Seven roles have 3 today (bartender, doorman, newsstand, ticket-taker, elevator-man, cabbie and druggist), and `beat-cop` has none and borrows the role-less cards. That is about 27 cards, the batch's best use of time.

### C. People and dialogue (`utterances`, `portraits`, `portrait-pairs`, `entrances`, `hiring`, `office`, and the undealt `witness`, `business`, `frames`): 3 cards

| deck | key | cards now | add | why |
| --- | --- | ---: | ---: | --- |
| utterances | `factKind=personAt register=truth` | 1 | 1 | a repeat in 4.5% of nights |
| hiring | `temper=yap` | 2 (+4 unfillable) | 1 | 90% stale |
| hiring | `temper=enigma familiar=no` | 1 (+2 unfillable) | 1 | 100% stale |

Here too the need is engine-side: hiring's `{business}`, the pair fallback, and the motif band in `office` and `entrances`. After those, three writing tasks are worth doing:

1. **Office: two more cards per circumstance, 14 in all.** It is the first paragraph of every night, 30 cards across 7 circumstances, with first staleness on night 6.
2. **Entrances: the single-card cells** (four keys at 1 card).
3. **Portrait-pairs:** `class=underworld` has 9 cards (m) and 8 (f), and `professional` has 6 and 8. The working class has 20 and 19 at about 1 a night.

`witness`, `business`, `frames` and `portraits` need nothing until the engine deals them.

### D. Clock, texture, endings (`hours`, `arrivals`, `endings`, `errand`, `story`, `dashiell-lines`, and the undealt `transitions`, `ambient`, `asides`, `similes`, `places`, `find`): 121 cards

| deck | key | cards now | add | why |
| --- | --- | ---: | ---: | --- |
| hours | `beat=hour` | 15 | 36 | 5 a night on 45% of pages, a third of them opening it; read out by night 3; 99% stale |
| dashiell-lines | `kind=ask-person familiar=no` | 3 (+3 unfillable) | 12 | a repeat in 28% of nights; the `{topic}` placeholder is 71% of reads; supply `{name}` every time and the 5 written cards come back, which halves this |
| dashiell-lines | `kind=ask-evening familiar=no` | 5 (+1) | 11 | 1.55 a night; 98% stale |
| errand | `because=said for=ask-person bridged=yes setting=indoor` | 4 | 2 | opens its page; 98% stale |
| story | `beat=after` | 10 | 9 | 1.87 a night; 94% stale |
| dashiell-lines | `kind=ask-person familiar=yes` | 2 (+4) | 2 | a repeat in 5.2% of nights |
| arrivals | `placeKind=private hourBand=midnight-2 weather=clear` | 2 | 2 | 93% stale |
| story | `beat=vrole` | 1 | 9 | one card, every night |
| story | `beat=moment`, `beat=alone` | 4, 4 | 6, 6 | every night; 99–100% stale |
| story | `beat=open`, `found`, `precinct`, `since` | 6 each | 4 each | about once a night |
| story | `beat=motive-color`, `beat=before` | 9, 8 | 1, 1 | |
| arrivals | 7 more cells of `placeKind × hourBand × weather`, 0–1 cards each | 0–1 | 8 in all | private × midnight-2 × cold (+2) and fog (+1); public × midnight-2 × clear (+1); private × midnight-2 × rain (+1); public × 2-4 × clear (+1); private and public × 4-6 × clear (+1 each; these are dropped 54–67% of the time today) |

Also:

- **Arrivals:** add public × midnight-2 × cold, which is asked 0.13 times a night and has no card, so the arrival goes without its weather.
- **Story:** the story counts only after engine change 6. Until then, cards added below a beat's top specificity are not read.
- **Undealt decks:** `transitions`, `ambient`, `asides`, `similes`, `places` and `find` need nothing.

### Summary

| batch | formula | also worth writing | engine first |
| --- | ---: | --- | --- |
| A | 77 | 4 hedged `touches×described` | memory across nights (1) |
| B | 10 | about 27 fixture-role activity cards | activity memory (2) |
| C | 3 | about 14 office, 4 entrances, 4–6 pairs | slots (4), pair fallback (3), motif band (5) |
| D | 121 | 1 arrivals cell | slots (4), story rotation (6) |
