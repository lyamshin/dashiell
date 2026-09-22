# Hone 3 — Order, redundancy, pronouns in speech, breath tails

Golden: `docs/golden/seed3-opening.md` (v2). A short generator pass (`src/gen/`), with the engine touched only where the briefing's order is consumed. Harness before and after (`python3 scripts/golden-loop.py --label "Hone 3"`), into `docs/golden/rounds.md`.

## 1. Order: death, then who he was, then where

The client's spoken briefing currently opens on the victim's standing ("Sweeney was the reason four places on the street stayed open") before saying he is dead. Reorder `buildBriefing` so the client's turns run: **the death** ("Martin Sweeney is dead." with the full name, once), **the standing** (one sentence), **where and how found**, the precinct, the tie, the purpose and cost, the pointer. Narration order unchanged. For robbery: the loss, then whose it was, then where and when; for missing: who is gone, then who they are, then last seen. Update the truth sheet's Briefing section to the same order.

## 2. Collapse redundant givens

For `body-at-scene`, "found dead at the suite" and "killed at the suite" are one fact. Emit one sentence ("He was found dead in his rooms at the suite, and that is where it happened.") with both givens' `Fact`s attached, so the report and the notebook lose nothing. Audit every trope's givens for the same overlap (robbery: "taken from" and "nothing forced" are two facts, keep both; missing: "gone" and "last seen" are two, keep both).

## 3. Pronouns inside her turns

Within a single client turn (a paragraph of her speech), the victim's surname appears once, then `he/him/his`. Across turns, the surname may return at the start of a new turn. Implement in the first-person template rendering: a post-pass over each turn's sentences that substitutes the victim's pronoun after the first mention, with a small guard against ambiguity (if another person of the same gender is named in the same turn, keep the surname). The same rule for the third party (`mentions`). Correspondence must still see the surname once per turn.

## 4. Breath tails

Hand-written `breath` forms must **split**, never **append**. Audit every breath form: if the joined breath has more content words than the spoken form, it appended; rewrite it as a split. Add a test that `breath.join(' ')` contains no content word absent from `spoken`.

## 5. Spot checks from the read

- "Two hours of nothing useful" appears in both the coroner's given and the client's line on some seeds: emit once.
- The yap hiring frame's tail ("and here's the rest of it whether you asked or not") followed by "before Kreuzer had gotten halfway through the second sentence" names her twice: pronoun the second.
- The standing sentence for a bootlegger ("the reason four places stayed open") should not precede the word "dead" anywhere on the page.

## Tests
Order holds per trope over seeds 1..200; body-at-scene emits one found/killed sentence with both facts; surname once per turn; breath never appends; correspondence zero at all difficulties; existing tests green (update the ones that assert the old order, with reasons).

## Deliverables
Branch `hone-3`, not pushed. `docs/14-hone-3-notes.md`. Page one of seeds 3, 7, 12 pasted in the report with two sentences of stylist reading each.
