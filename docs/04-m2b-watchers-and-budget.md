# Milestone 2b — Watchers, Budget, and Sheet Hygiene

A fix pass on the M2 generator (`docs/02-m2-generator-revision.md`, merged). Reading the M2 samples confirmed the model but exposed one design failure and several smaller ones. Where this document contradicts M2, this document wins.

## The problem

Seed 7 at difficulty 2: **par 6, budget 20, slack 14.** Across 200 seeds, median par is 7 against a fixed budget of 20. The design thesis is that the night is the challenge. With fourteen spare actions there is no night.

The cause is roll calls. A watcher's "who was there at 9:30" clue clears five suspects at once, so greedy set cover produces a spine of 7–9 and the budget never bites.

## 1. One subject per observation clue

**No roll calls.** Every observation or denial clue names exactly one subject. Asking the bartender who was in the bar at 9:30 is five questions, not one. This applies to fixtures and suspects alike.

Anchor clues that establish time of death may still combine "victim alive at M−1" with the anchor timing in one clue; that is one fact about one person.

Consequences the selection code must absorb:

- Spine grows. New ceiling: **spine ≤ 15**. Reject above that.
- Findable target becomes **34 ± 2**.
- Corroboration rule changes. Two independent routes are required for: time of death, the killer's contradicted claim, the killer's weapon access, method, motive. Exculpations need **one** route in the spine; a second route is optional and should come from the disqualifier branches where an innocent's secret naturally places them elsewhere (a drinker on a stool at 9:30 is exculpated by the disqualifier).
- Noise ratio target: **35–45%** including disqualifiers.

## 2. Budget follows par

Budget is no longer a fixed number per difficulty. **`budget = par + slack`** where slack is:

| difficulty | slack |
|---|---|
| 1 | 8 |
| 2 | 6 |
| 3 | 4 |

Reject a case if **par > 18** (the playable ceiling for a 30–45 minute run) or **par < 9** (too small to be a case). Record `par`, `slack`, and `budget` on the case.

Par computation must count travel. If the current computation is a heuristic, say so in a comment and make sure it never *under*-estimates (an optimistic par would make the budget too tight).

## 3. One branch per secret activity

An affair involves two suspects and one activity. It currently produces two branches with the same disqualifier, names swapped. **A secret activity with a partner produces one branch.** The branch's noise clues may come from either partner; the disqualifier appears once and clears both.

Branch count per case: 3–5. If fewer than three innocents have branch-worthy secrets, that is a cast rejection, not a reason to duplicate.

## 4. Anchors produce facts, not inferences

Seed 7's scene clue reads: "the set was loud enough to cover it, and it was only loud for that half hour. That puts the killing in that half hour and no later." That is a conclusion presented as evidence. The player draws conclusions; clues state facts.

Rules:

- A clue's `text` states what a person saw, heard, or found, or what a document says. Never "that puts", "so it must have", "which means".
- Time of death is closed by two facts: someone places the victim alive at M−1 relative to an anchor ("he was still arguing with her when the lesson stopped upstairs"), and something places the killing at M relative to an anchor ("I heard the shot during the fourth round"). The **deduction path** section may state the inference. Clue text may not.
- **Sound consistency.** A loud method's sound trace and a masking anchor (radio, El, theater letting out) are mutually exclusive at the same place and tick. If the radio masked the shot, nobody in that place heard it. If people heard it, the clue does not say it was masked. Pick one per case and enforce it in the derivation, with a test.
- Knowledge traces ("only those present know the challenger went down in the fourth") must produce a **test clue** usable against a liar who claims that place at that tick: "Otto says he was in the speakeasy for the fight. Asked who won, he names the wrong man." This is the payoff of the anchor system and should appear in at least half of cases where a liar claims an anchored place.

## 5. Short names

Every place template gets a `shortName` (the speakeasy, Kaplan's, the benches, the back lot, Mrs. Teague's, the cab stand). Every person is referred to by surname after first mention in any clue text or sheet table. The truth sheet uses short names in all tables and in the clue graph. Full names appear once, in the Places and Dramatis Personae sections.

## 6. Cast table tightening

"A ward heeler, the victim's rival in trade" when the victim is a retired dry-goods wholesaler. Audit `cast.ts`: a relationship of *rival in trade* requires the suspect's archetype and the victim's archetype to share a `trade` tag. Add `trade?: string` to both archetype kinds and enforce it. Do a general pass for pairings that read as nonsense and remove them; list what you removed in the notes.

## 7. The killer's named companion

Seed 7's killer claimed to be in the speakeasy with Domenica Carbone, who was in fact there and lying about it herself. This is good and should be kept. Make sure the companion's denial ("Carbone says she was not with Brauer that night") exists as a candidate clue and is eligible for the spine as one route to contradicting the killer's claim. It is a stronger contradiction than a third party's, because it comes from the alibi itself.

## 8. Tests to add or change

Over seeds 1..200 at each difficulty:

- No findable observation or denial clue establishes `personAt` or `personNotAt` for more than one subject.
- `budget === par + slack[difficulty]`; `9 ≤ par ≤ 18`.
- Spine ≤ 15; findable in 32..36; noise ratio in 0.35..0.45.
- Exactly one branch per innocent secret activity; partnered secrets share a branch; every branch ends in one disqualifier.
- No clue text contains "that puts", "which means", "so it must", "and no later".
- Sound consistency: no case has both a "heard the shot" clue and a "masked the shot" statement for the same place and tick.
- In cases where a liar claims an anchored place at an anchor tick, a knowledge-test clue exists in the candidate pool.
- Every place has a `shortName`; no clue text contains a place's full name more than once.
- Every rival-in-trade pairing shares a trade tag.
- Regeneration attempts: median ≤ 10, max ≤ 300.

## 9. Deliverables

- Branch `m2b-watchers-budget` from main. Tests green. Regenerate `docs/samples/` for seeds 1–20 at difficulty 2.
- `docs/04-m2b-notes.md`: the new par/budget/spine distributions at each difficulty, the cast pairings removed, and anything that fought back.
- Not pushed; no PR.
