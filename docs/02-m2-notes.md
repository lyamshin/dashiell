# Milestone 2 — notes

## The numbers

Over seeds 1..200, at each difficulty. `noise` counts noise clues and their
disqualifiers together, since both are there to be dismissed.

| difficulty | | min | median | mean | p90 | max |
|---|---|---|---|---|---|---|
| **1** (budget 22) | spine | 7 | 8 | 8.13 | 9 | 9 |
| | corroboration | 8 | 10 | 9.74 | 11 | 11 |
| | noise | 12 | 12 | 12.26 | 14 | 14 |
| | findable | 30 | 30 | 30.13 | 31 | 31 |
| | branches | 6 | 6 | 6.13 | 7 | 7 |
| | par | 5 | 8 | 7.54 | 9 | 11 |
| | slack | 11 | 14 | 14.46 | 16 | 17 |
| | attempts | 1 | 1 | 1.21 | 2 | 7 |
| **2** (budget 20) | spine | 7 | 8 | 8.12 | 9 | 9 |
| | corroboration | 8 | 10 | 9.77 | 11 | 11 |
| | noise | 12 | 13 | 12.61 | 13 | 14 |
| | findable | 30 | 30 | 30.49 | 31 | 31 |
| | branches | 4 | 5 | 5.24 | 6 | 7 |
| | par | 5 | 7 | 7.39 | 9 | 10 |
| | slack | 10 | 13 | 12.61 | 14 | 15 |
| | attempts | 1 | 1 | 1.22 | 2 | 5 |
| **3** (budget 18) | spine | 7 | 8 | 8.24 | 9 | 10 |
| | corroboration | 8 | 10 | 9.68 | 11 | 11 |
| | noise | 12 | 12 | 12.47 | 13 | 14 |
| | findable | 30 | 30 | 30.39 | 31 | 31 |
| | branches | 3 | 4 | 3.94 | 4 | 5 |
| | par | 5 | 8 | 7.57 | 9 | 10 |
| | slack | 8 | 10 | 10.43 | 12 | 13 |
| | attempts | 1 | 1 | 1.82 | 2 | 32 |

Noise ratio: **40.7% / 41.3% / 41.0%** mean at difficulties 1, 2 and 3. The
candidate pool behind those thirty clues runs 140–265, mean 194 — which is the
M1 number, unchanged. Nothing about the simulation got smaller; the selection
is the whole difference.

At the default difficulty over 200 seeds: 33 of the 35 place templates appear,
no template is the scene more than 16.5% of the time, all 16 anchors appear,
no pair of anchors pins the time of death in more than 4% of cases, the
killer's false alibi lands on no template more than 9.5% of the time, and all
six methods and all ten secret types are used. 79 tests pass.

## What was hard

**Deleting the map made everything easier except one thing.** With free
movement, the murder-tick arrangement is a placement problem rather than a
pathfinding one, and M1's whole `walkBetween`/distance-prune apparatus went in
the bin. What did not get easier is the arithmetic of *who can clear whom*. A
truthful innocent alone in a watched room has exactly one witness, not two, and
the room's posted watcher is the only body in it. So the murder tick is
arranged by grouping the truthful innocents into one room — which is then over
the line by a wide margin — and sending a spare fixture on his one excursion of
the night to whichever room a liar is hiding in. At difficulty 3, with three
liars in three different rooms and only three or four watchers to go round, the
spare fixtures run out: that is 139 of the 168 discards at that difficulty, and
it is why difficulty 3 costs half again as many attempts as the other two.

**The spine came out smaller than the spec assumed.** The moment a watcher can
say "at half past nine there were five of them in here", one clue covers five
of the ten essential facts, and greedy set cover finds it immediately. Spine
sits at 7–9 including the fixed opening three, never near the cap of 12. That is
the right outcome, but it makes the spec's other two numbers — corroboration
6–8, noise around 40% — unreachable together: 8 + 8 + 12 is 28, and the noise
share is then 43%, but the mandatory corroboration alone (two independent
sources for each of ten requirements) needs eight or nine clues before anybody
asks for depth. The resolution is a floor: the proof is padded to 17 of the 30
with third and fourth routes, and noise takes the remaining 13. Corroboration
therefore runs 8–11 rather than 6–8. Said plainly, that is a deviation, and it
is listed below.

**Par is not the interesting number.** Slack runs 10–15 against the required 6,
because par only counts the spine and the spine is small and the greedy picks
clues in rooms it is already walking to. The real cost of a case is the noise:
five branches of two or three clues each, every one of which looks essential
until its disqualifier lands. M3 will find out whether 13 clues of noise eats 12
actions of slack. If it does not, the dial to turn is branch depth, not budget.

**Two constraints in the corpus turned out to be bugs, not constraints.** Both
were found by the rejection counters rather than by reading the code, which is
the same lesson as M1. A watched place could be drawn as the scene, which put
the posted watcher in the room during the murder. And lie blocks are per secret
now — a killer whose cover secret abuts the murder block tells two lies in a row
about two different rooms — but the clue derivation still split on runs of
consecutive lied-about ticks and took the first tick's claim for the whole span,
so one attempt in eight produced denials about the wrong room and had to be
thrown away.

## Which constraints actually fired

Discards over 200 seeds at difficulty 2. 243 attempts in total produced 200
cases; 50 things were thrown away along the way (some of them at the cast or
deck level, which does not count as an attempt):

| Discard reason | Count |
|---|---|
| the killer could not be seen reaching the weapon | 20 |
| no free window for the blackmail secret | 14 |
| no murder-tick arrangement leaves every innocent doubly witnessed | 7 |
| no cast fits the victim and the rooms | 7 |
| no spine covers the proof inside twelve clues | 2 |

At difficulty 3 the arrangement dominates (139 of 168). At difficulty 1 it is
blackmail (26 of 49), which drags the victim into a private room and must
finish two ticks before the murder so the victim can be somewhere public to be
seen alive.

As in M1, the solvability check never rejected an attempt over the whole
corpus. It is a regression net, not a filter, and `test/solvability.test.ts`
damages a good case twenty-one ways to keep it honest.

## Deviations from the spec

1. **Corroboration runs 8–11, not 6–8.** Explained above: the spine is too small
   for 6–8 corroborating clues and a 40% noise share to coexist inside thirty.
   The noise ratio was treated as the load-bearing number, since it is one of
   the three named dials.
2. **The scene is never a watched place.** The spec lets any place with
   `murderMethods` be the scene, but a posted watcher in the room contradicts
   "alone with the victim" and finds the body an hour early. Eleven templates
   can still be scenes.
3. **The two anchors are chosen to fit the murder tick**, rather than drawn and
   then tested with a redraw on failure. The low anchor lands on M−1 and the
   high anchor on M by construction, so the spec's "if the drawn anchors cannot
   do this, redraw anchors" path exists (no place-attached anchor at a watched
   room, or nothing that can time the scene) but almost never fires.
4. **"Two routes" for the time of death means two independent sources across
   both halves of the argument**, not two independent sources for each half:
   one clue puts the victim alive at M−1, another shows the scene was already a
   scene by M, and together they pin it. Where a second voice exists for either
   half, corroboration takes it.
5. **The killer's access to the weapon needs two independent sources**, not the
   spec's one, so that every essential fact obeys the same rule and the test
   for it can be uniform.
6. **The three opening clues cost nothing.** Par starts at the scene with the
   scene report, the coroner and the client's statement already in hand.
7. **Motive clues about innocents are candidates only.** They are excellent red
   herrings, but the spec says every noise clue must derive from a secret
   activity, and a letter about an innocent's inheritance does not. They stay in
   the pool and in the truth sheet's red herrings section.
8. **Additions to the data model the spec did not name:** `Person.foundAt`
   (where the detective finds somebody the next day, which is what gives a clue
   its `place`), `Person.isClient` and `Case.clientId`, `Anchor.route` (for the
   beat cop, who has no fixed place), `Anchor.timing`/`sceneTiming` (prose),
   `Clue.aboutSecretOf` (so "every noise clue derives from an innocent's secret"
   is checkable rather than assumed), `PlaceTemplate.isResidence`, the facts
   `victimDeadBy`, `methodEvidence` and `secretExplained`, and
   `DeductionPath.timeOfDeathAnchors`.
9. **The beat cop is drawn with the fixtures, at probability 0.45**, and his
   pass is then forced into the anchor set. Drawing him as an anchor instead
   would have made him a one-in-sixteen event, which is not the prominence the
   spec gives him.

## What I would change

1. **Branch depth is the only difficulty dial doing much work.** Budget barely
   binds (slack 10–15), and the liar count changes the murder tick arrangement
   more than it changes play. Difficulty 1 gets six shallow branches and
   difficulty 3 gets four deep ones — that is a real difference, but it is the
   only one a player will feel until the clock exists.
2. **Noise branches repeat within a case.** With five innocents and up to seven
   branches, an innocent's secret can carry two branches, and the second one
   reads like the first with different words. Either cap it at one branch each
   and accept fewer, longer branches, or write more hint material per secret.
3. **The affair generates two near-identical branches**, one per partner, whose
   disqualifiers are the same sentence with the names swapped. The pair should
   share a branch.
4. **`fall` is used 7 times in 200.** It needs its key kept somewhere other than
   the roof, and only two templates can host it, so the draw rarely lines up.
   More rooftops, or a second object for it.
5. **The roll call is doing too much.** One fixture line can clear five people,
   which is what keeps the spine small — but it also means the player's real
   work is almost entirely in the noise, and the deduction reads as three or
   four sentences. Capping a roll call at three names would make the spine
   longer and the cases feel less like one sentence and a pile of distractions.
6. **The client is the killer 23% of the time and it changes nothing.** The
   statement points at a different motive holder and that is all. The client
   should lie, or withhold, or steer.
7. **Places have no texture beyond `kind` and `watcher`.** Opening hours, a
   place that empties after ten, a room only one character can get into — any of
   those would make travel a decision rather than a cost.
