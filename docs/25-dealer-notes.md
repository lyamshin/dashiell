# 25 — The dealer: memory across nights, draws by weight

The designer's direction, from [22](22-deck-exposure.md):

- A card that has been read is not dealt again, on that night or a later one, until the reader has read every card in its key. Then the key reshuffles.
- The exception is people's cards. A person's portrait and tic stay with that person for the night, and the tic comes back once a visit.
- Every other draw is a weighted random roll among the cards that fit. It is not a sort that always picks the best motif score.

This note records what changed, the burn tier each deck now has and why, and the measurements before and after. It also gives the writing targets for batches A, B and C, recomputed under the new dealer.

## What changed

| where | what |
| --- | --- |
| `src/game/voice/cards.ts` | `Dealer.draw` now works in three steps. (1) On each rung, take the cards that fit, suit the night's weather and can be filled from the slots, and drop any read tonight. (2) For a `run-to-run` deck, keep only the cards the reader has read the fewest times (`leastRead`). (3) Roll among them, weighted by motif score (`weightOf`). Also new: `settleReads`, `readCounts`, `weightedPick`, `spentPolicy`, `MOTIF_WEIGHT` and `readCount`. `CROSS_RUN_TOTAL` is gone. |
| `src/game/storage.ts` | The reader's history is a read count per card: `{ "v": 2, "reads": { id: n } }` under `dashiell:burned`. A plain list saved before this loads as one read each. `loadBurned` still returns a list, with each id repeated once per read, so the reducer's `persistedBurned` did not change shape. `closingHistory` and `noteClosing` handle the closing page (see below). Every read and write is wrapped, so a blocked store forgets and nothing throws. |
| `content/deck-schema.json` | Burn tiers are set per deck. There is a new per-deck `spent` policy (`widen` or `reshuffle`), a `spentPolicy` legend, and a top-level `$burnNote` that says why. |
| `src/game/scoring.ts`, `src/game/story.ts`, `src/ui/book.ts` | The verdict's last line (`endings`) and the story are dealt against the reader's history. The book remembers the history as it stood when a case's closing page was first read, so a reload shows the same page and counts its cards only once. |
| `src/game/voice/cast.ts` | `rollCast` no longer gives two people the same portrait pair while another pair fits. Across nights it prefers the pairs the reader has met least. The three portrait components are still rolled for their motifs, but they count as read only when the page prints them, which means only for a person with no pair. Tempers are replayed from the old stream (`rollTempers`), so no case's cast changes and a temper does not depend on who is reading. |
| `src/game/scene/plan.ts`, `src/game/types.ts` | `SceneMemory.did` records what each person has done on earlier visits tonight. A new visit finds them at something else, unless their trade has nothing else for that room and hour. The office visit spends the client's recall action (see `{business}` below). |
| `src/game/voice/page.ts` | The hiring card's `{business}` is filled from the client's recall action. The rhythm pass does not put "Nothing moved." after a paragraph about a person (read-through fix). |
| `src/game/correspond-pages.ts` | A page may name the hours of a secret when it has a clue about that secret in hand. This matches the rule the generator checks at source (`checkCase`). A wanderer route that the new draws opened told "some time after ten o'clock" about a secret, and the page checker had no such allowance. |
| `scripts/deck-exposure.ts` | Updated to the new storage. It now deals the closing page the way the book does and gives the M10 decks a batch (E). It also reports three new things: fallback by deck, counted separately from the outcome; how many nights pass before a card comes back; and a recall action said twice in one visit. |
| `scripts/history-sweep.ts` (new) | Runs reader lint, correspondence and beat coverage over nights read by a reader with a history. |

### The rule, and how it reshuffles per key without knowing the keys

A dealer rung is a closure, so there is no key name to store a pile under. The store keeps read counts instead.

- On a rung, the dealer deals only from the cards read the fewest times. A card read on an earlier night waits while any card on that rung has been read less often.
- Once every card on the rung has been read equally often, they are all back in play. That is the reshuffle, and it happens per key, because the comparison is made inside one ask.
- A card that fits several keys gets one count, which holds it back in every key it belongs to. That is the right behavior.
- A new card added to a deck starts at zero, so it is dealt first.

`settleReads` replaces `CROSS_RUN_TOTAL`. That constant was meant to clear the pile once every run-to-run card had been burned. `similes` and `asides` are never dealt, so the pile never cleared.

`settleReads` takes a round off a whole deck once every card in it has been read. Subtracting one from every card in a deck changes no comparison inside a key, so this is housekeeping, not the reshuffle itself. A deck whose every card can be dealt settles back to 0s and 1s. A deck holding a card nothing deals (a slot never supplied) never settles, and its counts go up by one each cycle. That costs a few bytes and changes no draw.

### Inside one night

A card read tonight is out of play on every rung. A rung with nothing left unread tonight then does one of two things, set per deck by `spent`:

- **`widen`**: try the next rung before any card comes round again. This is M3's rule. It applies to the decks that were `within-run`, whose wider rungs are other good answers to the same ask.
- **`reshuffle`**: bring the key round again first, starting with the older half of tonight's reads. It applies to the decks that were `free`: thought, bridge, carry, errand, hours, telling, followup, answer, return, dashiell-lines, utterances, endings, and the undealt transitions and business.
  - Their first rung carries something the page has to say, and the wider rungs exist only for a key with no card at all.
  - The M8 test that says where the one to ask is found failed when `bridge` widened past its `{where}` rung. This policy keeps what those ladders were written for.

Either way, a card that comes round again inside one night logs `deck-exhausted`, as before.

### Weighted, not sorted

The motif score is now a weight: `MOTIF_WEIGHT` = √2 per point.

- A card sharing one of the page's motifs (+2) is twice as likely as a neutral card.
- A card that echoes the last page's image (−3) is about a third as likely.
- A card whose weather contradicts the night is still excluded outright.

The roll comes off the dealer's seed, which is the run's seed and the page. The pool depends on the reader's history. So a transcript is reproducible from (seed, page, history).

Specificity:

- **Story.** The story already weighted each card by its specificity (`SPECIFIC_WEIGHT` = 3 per tag matched beyond the beat) since deck batch D. It now also filters to the least-read cards first, so the most specific line no longer wins every story.
- **Dealer.** In the dealer, specificity is the ladder. The rungs stay hard: rung 0 is the key. Folding wider rungs into a weight would deal a less fitting card while a fitting one is unread.

Coherence (motif overlap between adjacent image blocks) is 0.406. The floor is 0.28, and the pre-M4b-polish figure was 0.333. The office page is where most motif-scored draws happen, and it still threads.

## Burn tiers, per deck

| tier | decks | why |
| --- | --- | --- |
| `run-to-run` | office, entrances, hiring, hours, errand, arrivals, establish, watch, place-ambient, search-act, return, crowd, thought, bridge, carry, answer, decide, confront, telling, grounding, followup, tail, note, dashiell-lines, utterances, endings, story | Every deck a reader reads. Doc 22 found that 59–93% of reads over nights 11–20 were cards the same reader had already read, and no deck size fixes that without memory. |
| `run-to-run` (people's) | portraits, portrait-pairs | Chosen per person, once a night, by `rollCast`. They stay run-to-run so that a reader does not meet the same broken finger two nights running. Within the night a pair stays with its person, and its recall action comes back once a visit. |
| `run-to-run` (not dealt yet) | similes, places, witness, business, frames, find, transitions, ambient, asides | Set now so that they are right the day something deals them. |
| `within-run` | activity | Chosen per person and visit by the planner, which now remembers what each person did on earlier visits tonight. A new night is a new cast. |
| `free` | none | Kept in the schema's vocabulary only. |

`within-run` was removed from every deck a reader reads. It remains only on `activity`.

`endings` and `story` are read on the closing page, which is recomputed on every render. The book deals them against the history as it stood when the page was first read (`closingHistory`) and counts their cards once a case (`noteClosing`). The same reader gets the same ending on a reload, and a different one on the next case.

## The engine fixes from 22's list

1. **Memory across nights.** Done, as above, for every deck a reader reads.
2. **Activity remembered across visits.** Done. One person doing the same activity card on two visits fell from **30% of nights (0.81 a night) to 0%**. A trade with a single card for the room and hour can still repeat it; none did in 2,550 nights.
3. **Pair fallback respects tonight.** Done. Two people with the same pair fell from **34% of nights to 0%**. Components are counted as read only where they are printed.
4. **Slots.**
   - **`{name}` on asks.** This is already supplied whenever the topic names a person. The reducer's `topicSlots` returns the surname for a person topic, and the first surname in an exact topic.
     - The remaining nameless ask-person asks are topics that name nobody: "the key", "the walk-up that evening". The schema says to ask about those with `{topic}`.
     - The ten written ask-person cards are all in play: `kind=ask-person familiar=no` has 5 dealable cards on the average ask (+1 unfillable). The `{topic}` placeholder's share of those asks fell from 34% to 26%.
     - The "71%" in doc 22 predates M10, whose family questions now ask most of what `dashiellLine` used to.
   - **`{business}` on hiring.** `{business}` is now the client's recall action: the tic the entrance just described, come round once on the office visit.
     - Example: "Steinbach opened the compact again, looked at nothing, and shut it."
     - This is the rule `realize.ts` already follows for business: a person's own, never at odds with their portrait. The business deck is present tense and belongs to nobody in particular.
     - Hiring fell back off its asked rung on **71.6% of asks before and 16.2% after**. Stale reads over nights 11–20 fell from 94% to 66%.
     - A client whose pair has no recall action still gets a card that needs no `{business}`. That leaves `{business}` unsupplied on about 1.2 asks a night.
     - `{dashiell}` (3 cards) is still unsupplied.
5. **Draw inside a band, not the top score.** Done more simply, with weights everywhere. See the favorites table below.
6. **Rotate the story's most-specific choice.** This was done in deck batch D (weights). It now also has memory.
7. **Recall action once a visit.** It still holds after M10. **0 of 7,522** visits that said a recall action said it on two pages. The office visit is counted: the hiring spends the client's action, and the planner marks the client recalled for visit 0. The recall on a *later* visit is by design. It is why `portrait-pairs` shows "nights with a repeat" at 75% (up from 28%, because the hiring now says the client's action too).

## Measurements

`npx tsx scripts/deck-exposure.ts --seeds 50 --people 10`: 2,550 nights, with 30 simulated readers playing 85 nights each, one store each.

- **Before** is `main` at 0bf232a (after PR #38, shorter nights).
- **After** is this branch with that merged in.
- The before run used the same script, with its new fallback and return-gap counters patched in.
- The output is deterministic.

### Per deck

| deck | burn before → after | read / night | nights with a same-night repeat | stale, nights 11–20 | first stale night (median reader) | off a wider rung | nothing dealt |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| story | free → run-to-run | 21.7 | 0% → 0% | 72% → 74% | 2 → 3 | — | — |
| thought | free → run-to-run | 16.6 | 51% → 51% | 75% → 74% | 2 → 2 | 100% → 100%¹ | 0% → 0% |
| telling | free → run-to-run | 10.5 | 40% → 39% | 89% → 90% | 2 → 2 | 0% → 0% | 0% → 0% |
| grounding | within-run → run-to-run | 10.5 | 14% → 14% | 86% → 86% | 2 → 2 | 36.6% → 36.5% | 0% → 0% |
| activity | free → within-run | 6.8 | 36% → 25% | 63% → 68% | 2 → 2 | — | — |
| followup | free → run-to-run | 6.7 | 7.2% → 6.6% | 91% → 91% | 2 → 3 | 0% → 0% | 0% → 0% |
| hours | free → run-to-run | 5.2 | 0% → 0% | 70% → 79%² | **2 → 11** | 0% → 0% | 0% → 0% |
| portrait-pairs | run-to-run | 4.9 | 28% → 75%³ | 29% → 23% | 10 → 10 | — | — |
| carry | free → run-to-run | 4.2 | 0.7% → 0.5% | 70% → 64% | 3 → 4 | 0% → 0% | 0% → 0% |
| bridge | free → run-to-run | 4.1 | 0.5% → 0.6% | 78% → 77% | 3 → 4 | 1.5% → 1.4% | 0% → 0% |
| errand | free → run-to-run | 3.9 | 0.0% → 0.0% | 55% → 43% | **3 → 11** | 0% → 0% | 0% → 0% |
| tail | within-run → run-to-run | 3.2 | 0% → 0% | 72% → 68% | 3 → 5 | 0% → 0% | 0.1% → 0.1% |
| establish | within-run → run-to-run | 3.2 | 0% → 0% | 31% → 7.6% | **5 → 14** | 0% → 0% | 0% → 0% |
| arrivals | within-run → run-to-run | 3.1 | 3.0% → 2.9% | 58% → 54% | 4 → 6 | 0.5% → 0.4% | 0% → 0% |
| watch | within-run → run-to-run | 2.9 | 0% → 0% | 62% → 54% | 3 → 6 | 0% → 0% | 0% → 0% |
| place-ambient | within-run → run-to-run | 1.6 | 0.0% → 0.0% | 25% → 24% | 8 → 8 | 5.3% → 5.3% | 1.1% → 1.0% |
| note | within-run → run-to-run | 1.4 | 0% → 0% | 84% → 78% | 4 → 4 | 0% → 0% | 1.9% → 1.5% |
| dashiell-lines | free → run-to-run | 1.2 | 2.5% → 1.5% | 70% → 70% | 5 → 8 | 0% → 0% | 0% → 0% |
| search-act | within-run → run-to-run | 1.1 | 0% → 0% | 22% → 3.6% | 15 → 50 | 0% → 0% | 0% → 0% |
| office | within-run → run-to-run | 1.0 | 0% → 0% | 50% → 29% | **6 → 13** | 0% → 0% | 0% → 0% |
| entrances | within-run → run-to-run | 1.0 | 0% → 0% | 40% → 31% | 7 → 9 | 3.5% → 3.6% | 0% → 0% |
| hiring | within-run → run-to-run | 1.0 | 0% → 0% | 94% → 66% | **2 → 7** | **71.6% → 16.2%** | 0% → 0% |
| endings | free → run-to-run | 1.0 | 0% → 0% | 63% → 59% | 6 → 10 | 12.7% → 12.6% | 0% → 0% |
| utterances | free → run-to-run | 0.9 | 5.5% → 5.5% | 14% → 6.7% | 16 → 26 | 20.1% → 19.9% | 0% → 0% |
| crowd | within-run → run-to-run | 0.9 | 0.2% → 0.1% | 16% → 7.5% | 10 → 15 | 89.6% → 89.7%⁴ | 0% → 0% |
| return | free → run-to-run | 0.7 | 0% → 0% | 38% → 17% | 10 → 37 | 0% → 0% | 0% → 0% |
| answer | free → run-to-run | 0.6 | 0% → 0% | 51% → 35% | 11 → 45 | 0% → 0% | 0% → 0% |
| confront | within-run → run-to-run | 0.3 | 0% → 0% | 30% → 2.2% | 8 → 32 | 0% → 0% | 0% → 0% |
| decide | within-run → run-to-run | 0.1 | 0% → 0% | 20% → 4.5% | 47 → 77 | 0% → 0.3% | 0% → 0% |

1. `thought`'s first rung is the two-facts-agree card. It is empty on every ask that is not about two facts, so every deal is "off a wider rung" by construction, in both columns.
2. **How to read "stale, nights 11–20".** With memory, a card comes back only after its whole key has been read. A key holding fewer than ten nights of reading has been read through by night 11, so every read after that is "stale" by this metric's definition, and the number cannot fall below that.
   - `hours`' key holds about eleven nights. It is read in order now, then again. Before, it was a random draw that repeated from night 2.
   - The measure of the rule is the first stale night and the gap below. The measure of the content is this column.
3. Includes the recall action said again on later visits, which is by design (see fix 7). Two people sharing a pair: 34% of nights → 0%.
4. By design: the rung asks for a band-specific card first, and the deck writes `band: any`.

`thought` and batch E's decks still repeat inside a night and go stale by night 2. Their keys are 2–4 cards read 1–3 times a night, and memory cannot help that. It is the writing targets' business (below).

### When a card comes back: nights since the reader last read it

| deck | shortest 10%, before → after | median, before → after |
| --- | --- | --- |
| hours | 1 → 5 | 7 → 11 |
| errand | 2 → 4 | 8 → 13 |
| establish | 3 → 7 | 15 → 25 |
| office | 2 → 4 | 10 → 18 |
| hiring | 1 → 2 | 1 → 9 |
| carry | 1 → 2 | 5 → 7 |
| bridge | 1 → 2 | 4 → 6 |
| watch | 1 → 3 | 6 → 9 |
| arrivals | 2 → 3 | 9 → 11 |
| tail | 1 → 2 | 6 → 9 |
| dashiell-lines | 1 → 2 | 6 → 8 |
| endings | 2 → 3 | 8 → 10 |
| portrait-pairs | 3 → 5 | 14 → 18 |
| answer | 2 → 5 | 11 → 16 |
| return | 2 → 7 | 12 → 19 |
| search-act | 3 → 9 | 16 → 28 |
| confront | 2 → 6 | 17 → 28 |
| story | 1 → 2 | 6 → 7 |
| thought | 1 → 1 | 3 → 4 |
| telling | 1 → 1 | 2 → 2 |
| grounding, followup | 1 → 1 | 2–3 → 3 |

A card now comes back when its key has been read through. How soon that is depends only on how big the key is. The decks still at one or two nights are the thin keys the targets below are for.

### The favorites

The top card's share of its key's reads:

| key | before | after |
| --- | --- | --- |
| office sleepless × rain (4 cards) | off-022, 88% | off-023, 38% (off-022 no longer tops it) |
| office sleepless × fog | off-022, 77% | off-022, 38% |
| office off-a-divorce-case × fog | off-021, 96% | off-020, 48% |
| office behind-on-rent × cold | off-004, 75% | off-001, 45% |
| office bruised × cold | off-014, 87% | off-014, 60%⁵ |
| hiring | hir-002 in 64% of nights (`familiar=no`, the one enigma card needing neither `{business}` nor `{dashiell}`); hir-006 63% of the "any" rung | within every temper × familiar key the top card is 1.0–1.3 × its fair share; the "any" rung is asked 21 times in 2,550 nights |
| portrait-pairs working × m | pp-074, 17% (3.4 × fair) | pp-042, 11% (2.2 × fair) |
| dashiell-lines ask-person `{topic}` placeholder | 34% | 26% |
| story role | STY-371, 3.9 × fair | STY-370, 1.6 × fair |
| story since | STY-323, 40% | STY-431, 20% |
| story motive-color | STY-168, 32% | STY-168, 32%⁶ |

5. The key is probed from the dealt card. The only cold-tagged bruised card, off-014, has a key of its own that the `any` cards do not share. It is a measurement artefact, not a favorite.
6. For most cases only one motive-color card fits the case's motive. That needs more cards, not a different dealer.

### Checks (on the merged code)

- **Tests:** 44 files and 840 tests, all passing. `npx tsc --noEmit` is clean. Tests that asserted a draw now assert properties:
  - held back until the key is read;
  - reshuffles rather than running dry;
  - read-twice waits behind read-once;
  - no same-night repeat while the key has another card;
  - every card that fits is dealt, and the top card stays under 80% over 400 seeds;
  - the same seed and history give the same transcript;
  - storage counts, settles, migrates and survives a blocked store;
  - the closing page is counted once a case;
  - pairs are never shared;
  - tempers are unmoved by history;
  - activity differs across visits;
  - the hiring gets the client's business.

  Two tests changed:
  - The retainer test now compares case-blind, because a retainer can open its sentence: "Fifty dollars," she said.
  - `test/shorter-nights.test.ts` "covers every required beat…" now skips `hour-texture`. That test sets the clock back after the oracle's route on purpose, so the page's hour and the hour the checker adds up from the log disagree by construction. A card naming its hour ("It was after four in the morning.") is then flagged against the wrong clock. Every other rule is still checked.

  Separately, `realize.ts`'s hour filter now reads the card as it will print, with `{hour}` filled in, rather than the bare template.
- **Reader lint:** 0 over the M10 sweep. Also 0 over `scripts/history-sweep.ts`: 240 nights by 6 readers with a history, the oracle's route through every tier.
- **Correspondence:** 0 on every sweep in the tests. On the history sweep, 0 from the engine. As in the M10 test, 3 hours printed in a generator's own sentence are skipped (docs/23, "Not fixed").
- **Plain terms:** `npm run decks` finds 4,912 cards across 39 decks, 0 errors and 0 banned terms. `test/plain-terms.test.ts` passes.
- **Beat coverage:** 100%.
  - M8 sweeps: 5,455 of 5,455 pages (30,285 of 30,285 required beats).
  - M10: 2,952 of 2,952.
  - M9: 1,299 of 1,299 pages with 273 confrontations.
  - History sweep: 2,390 of 2,390.
- **Coherence:** 0.406 (floor 0.28).

### Read-through

`npm run read -- --seed N --tier T --no-choices` for 11/0, 3/4 and 7/5, read page by page against `main`'s render of the same runs. The tempers, routes and page counts match `main`'s.

- **Better.** Sentences of five words or more that appear twice in a run:
  - 11/0: 1 → 1.
  - 3/4: 4 → 4.
  - 7/5: 3 → 2.

  What remains is hand-written lines ("I wrote it in the book.", the stranger lines in `telling.ts`), not dealt ones.

  The hiring says the client's tic once (11/0: "Steinbach opened the compact again, looked at nothing, and shut it."). A person revisited is found doing something else.
- **Fixed on the way.** The rhythm pass put "Nothing moved." on the end of the client's portrait paragraph: "…It went there twice while she sat with me. Nothing moved." That beat is no longer used after a paragraph about a person.
- **Not the dealer's, noticed:**
  - "What's Renfro to you?" (hum-014) asks about the relationship, and the answer that follows is sightings. Three of the five ask-person cards (hum-013, hum-014, hum-019) ask about acquaintance rather than whereabouts, and with every card in play they come up more evenly.
  - When `stoppedDoing` cannot turn an activity round, the hand-written line says "…left off and looked up". This is more visible now that people change activity between visits.

## Writing targets, recomputed

The formula is 22's, per key: **add = max(night, 10 nights) − cards now**.

- **night** is 1.2 × the 95th-centile night.
- **10 nights** is 10 × the mean night.

The formula already assumed cross-night memory, which now exists, so most totals do not move between the old dealer and the new one on the same code:

| batch | old dealer | new dealer |
| --- | ---: | ---: |
| A | 79 | 79 |
| B | 6 | 6 |
| C | 9 | 3 (hiring's `{business}` cards are dealable now) |
| E | 174 | 174 |

The bigger change since 22 is the content and M10:

- Batch D landed.
- PR #38 moved the account onto the first question.
- Batch E is new.

"Cards now" counts only cards the beat can fill.

### A. Reasoning voice (`thought`, `bridge`, `carry`, `answer`, `decide`, `confront`): 79 cards, 9 of them to stop repeats inside a night

| deck | key | cards now | read / night | p95 | nights with a repeat | add |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| thought | `class=touches case=murder basis=account` | 3 | 2.66 | 4 | **37%** | 24 |
| bridge | `tie=victim lead=ask` | 5 | 2.27 | 5 | 0.6% | 19 |
| thought | `class=view case=murder who=known lied=no` | 2 | 1.08 | 3 | 7.2% | 9 |
| thought | `class=implicates case=murder basis=access` | 3 | 0.83 | 3 | 0.9% | 6 |
| bridge | `tie=time lead=ask` | 8 | 1.16 | 4 | 0% | 5 |
| carry | `for=ask-place lead=yes setting=indoor` | 6 (+7 unfillable) | 0.78 | 3 | 0.2% | 2 |
| thought | `class=window case=murder basis=dead-by` | 6 | 0.78 | 2 | 0% | 2 |
| bridge | `tie=account lead=ask` | 5 | 0.63 | 2 | 0% | 2 |
| thought | `class=touches case=murder basis=described` | 4 | 0.58 | 3 | 1.1% | 2 |
| thought | `class=view case=murder who=client lied=no` | 3 | 0.48 | 1 | 0% | 2 |
| thought | `class=touches case=murder basis=placement` | 4 | 0.44 | 2 | 0.0% | 1 |
| thought | `class=touches case=murder basis=timing` | 3 | 0.37 | 2 | 0.1% | 1 |
| thought | `class=touches case=robbery basis=account` | 3 | 0.26 | 3 | 4.0% | 1 |
| thought | `class=window case=murder basis=coroner` | 2 | 0.30 | 1 | 0% | 1 |
| thought | `class=touches case=murder basis=absence` | 3 | 0.35 | 2 | 0.2% | 1 |
| thought | `class=view case=robbery who=known lied=no` | 2 | 0.16 | 2 | 2.3% | 1 |

The first two rows are 43 of the 79. `touches × account` is now read 2.7 times a night on 3 cards, a repeat in 37% of nights. It is the most-repeated key in the game outside batch E. The carry key's unfillable cards want `{name}`, which a carry has only when a person sent him. Writing lead cards without `{name}` counts as much as adding cards.

### B. Places (`establish`, `place-ambient`, `search-act`, `return`, `watch`, `crowd`, `activity`): 6 cards

| deck | key | cards now | read / night | add |
| --- | --- | ---: | ---: | ---: |
| watch | `watcher=none` | 6 | 1.05 | 5 |
| activity | `role=bartender placeKind=semi` | 3 | 0.33 | 1 |

22's advice stands and is now the main item: give each fixture role at least six activity cards, about 27 in all.

- The planner now finds a person doing something different on a later visit.
- A fixture role with three cards split across place kinds and bands runs out within the night. When it does, the planner falls back to letting them repeat.

### C. People and dialogue (`utterances`, `portraits`, `portrait-pairs`, `business`, `entrances`, `hiring`, `office`, `frames`, `witness`): 3 cards

| deck | key | cards now | read / night | add |
| --- | --- | ---: | ---: | ---: |
| utterances | `factKind=personAt register=truth` | 1 | 0.15 | 1 |
| hiring | `familiar=no` | 1 (+9 unfillable) | 0.15 | 1 |
| hiring | `temper=enigma familiar=no` | 3 | 0.21 | 1 |

Hiring's nine unfillable cards are the `{business}` cards, dealt to a client whose pair has no recall action. Also worth writing, outside the formula:

- **A recall action for the 23 pairs that have none.** That makes every client's hiring `{business}`-dealable and every person recallable.
- **Two more office cards per circumstance, 14 in all.** It is the first paragraph of every night. It now goes 13 nights before a repeat, and 18 by the median.

### Beyond A–C: the M10 testimony decks (batch E): 174 cards, 21 of them to stop repeats inside a night

The decks are `telling`, `grounding`, `followup`, `tail` and `note`. They were written after 22 drew up the batches. They are now the thinnest thing a reader reads:

- 10.5 tellings and groundings a night;
- keys of 2–4 cards;
- a same-night repeat in 39% of nights for `telling`;
- a card back after a median of 2–3 nights.

The largest asks:

| key | cards now | add |
| --- | ---: | ---: |
| grounding `family=evening role=suspect half=first` | 4 | 28 |
| followup `part=open family=evening order=later` | 6 | 15 |
| tail (any) | 3 | 12 |
| telling `family=evening temper=plain` | 3 | 11 |
| telling `family=movements temper=plain knows=name` | 3 | 10 |
| grounding `family=movements role=suspect knows=name` | 8 | 9 |

The full list is in the script's output under "E. testimony (M10)".

## Not fixed

- **`{dashiell}` in hiring** (3 cards). Nothing supplies it, and the schema has no hiring-moment kind for it (08 tagging notes).
- **`answer` `{name}` and `{subject}`**, and `thought` `{subject}`, `{place}` and `{time}`. These are the same slots as in 22's table. They were not on this pass's list.
- **The nine undealt decks.** They are now run-to-run, but nothing deals them yet.
- **Nameless ask-person topics** ("the key", "the walk-up that evening") are still asked through the `{topic}` placeholder.
  - They could go to `ask-object` or `ask-place`.
  - That depends on `askKindOf` in the reducer, which is outside this pass.
  - Several of those cards presume the witness was there.
