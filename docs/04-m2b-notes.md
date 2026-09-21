# Milestone 2b — notes

The one number that mattered: at difficulty 2, par went from a median of 7
against a fixed budget of 20 to a median of 10 against a budget of 16. Slack
went from 13 to 6, and it is 6 because the spec says 6, not because it worked
out that way.

## The numbers

Over seeds 1..200 at each difficulty. `noise` counts noise clues and their
disqualifiers together, since both are there to be dismissed. `budget` is
always `par + slack`, so its spread is par's spread moved along by 8, 6 or 4.

| difficulty | | min | median | mean | p90 | max |
|---|---|---|---|---|---|---|
| **1** (slack 8) | spine | 11 | 12 | 11.52 | 12 | 12 |
| | corroboration | 8 | 9 | 8.82 | 10 | 11 |
| | noise | 12 | 14 | 13.66 | 14 | 14 |
| | findable | 34 | 34 | 34.00 | 34 | 34 |
| | branches | 4 | 5 | 4.83 | 5 | 5 |
| | **par** | 9 | 11 | 10.74 | 12 | 12 |
| | **budget** | 17 | 19 | 18.74 | 20 | 20 |
| | attempts | 1 | 1 | 1.19 | 2 | 7 |
| **2** (slack 6) | spine | 11 | 11 | 11.44 | 12 | 12 |
| | corroboration | 8 | 9 | 8.56 | 9 | 9 |
| | noise | 14 | 14 | 14.00 | 14 | 14 |
| | findable | 34 | 34 | 34.00 | 34 | 34 |
| | branches | 4 | 4 | 4.00 | 4 | 4 |
| | **par** | 9 | 10 | 10.58 | 12 | 12 |
| | **budget** | 15 | 16 | 16.58 | 18 | 18 |
| | attempts | 1 | 1 | 1.20 | 2 | 5 |
| **3** (slack 4) | spine | 11 | 11 | 11.47 | 12 | 12 |
| | corroboration | 10 | 11 | 10.53 | 11 | 11 |
| | noise | 12 | 12 | 12.00 | 12 | 12 |
| | findable | 34 | 34 | 34.00 | 34 | 34 |
| | branches | 3 | 3 | 3.00 | 3 | 3 |
| | **par** | 9 | 11 | 10.71 | 12 | 12 |
| | **budget** | 13 | 15 | 14.71 | 16 | 16 |
| | attempts | 1 | 1 | 1.85 | 2 | 32 |

Noise ratio: **40.2% / 41.2% / 35.3%** mean, and every individual case is
inside 35–45%. Branch counts are the difficulty dial now — five shallow
branches, four medium, three deep — and the noise total is whatever those
branches come to, rounded to keep the ratio legal.

At the default difficulty over 200 seeds: 33 of the 35 place templates appear,
no template is the scene more than 16.0% of the time, all 16 anchors appear,
no pair of anchors pins the time of death in more than 4.0% of cases, the
killer's false alibi lands on no template more than 10.0% of the time, all six
methods and all ten secret types are used, 13.5% of cases are sound-masked, and
the client is the killer 22.5% of the time. The candidate pool behind the
thirty-four findable clues runs 111–220, mean 157. **101 tests pass**, up from
79.

## What fought back

**The spine went up by four and par only by three and a half.** Deleting roll
calls does exactly what the spec said it would: five innocents cost five clues
instead of one, and the spine went from 7–9 to 11–12. Par did not move as far,
because the greedy set cover prefers a clue in a room it is already walking to,
and with one subject per clue almost every candidate covers exactly one thing,
so that tie-break is the only thing choosing between them. The spine visits two
to five rooms, median three. Eight or nine fetches and two or three moves is
par 10 or 11, which is what the table says. Turning the tie-break off pushes par
into the fifteens and the case stops being a neighbourhood and becomes a
walking tour, so it stayed on.

**Par never reaches the ceiling and rarely reaches the floor.** The spec asks
for a rejection outside 9..18 and the band is real in the code, but par lands
in 9..12 in every one of the 600 cases. Neither rejection ever fired over the
corpus. That is worth knowing before M3 tunes anything: the dial that is
actually doing work is slack, and the budget is currently 15–18 at difficulty 2
where M2's was a flat 20.

**The corroboration rule had to change or nothing fitted.** Two independent
routes for each of five exculpations is ten clues, and the spine cap is fifteen.
Section 1 of the spec says exculpations need one route in the spine, and that is
what the code does — but it is worth saying what it costs: five of the
thirty-four clues are now the only thing clearing five people, and a player who
misses one has no second opinion in the hand. The second route usually does
exist, in that innocent's disqualifier, and the deduction path counts it when it
is there (`+ 1 corroborating`, `+ 2 corroborating` in the sample sheets). At
difficulty 3, corroboration runs 10–11 rather than 8–9, because three deep
branches leave twelve clues of noise and twenty-two of proof, and the padding
goes somewhere.

**Masking was the hardest of the eight to get honest.** Seed 7 said both that
the radio was loud enough to cover the shot and that two men heard the shot
through it. The fix is a flag on the anchor template rather than a rule in the
derivation: `bar-radio`, `el-train` and `theater-out` mask, and a case whose
scene-timing anchor masks emits no hearers at all. 13.5% of cases are masked,
and in those the time of death rests on the victim being seen alive at M−1 and
the scene report timing the room at M — two sources, one a person and one the
room, which is what the solvability check wants. The two halves of the rule are
both exercised in the corpus, and the test asserts that, or it would pass on a
generator that never masked anything.

**The knowledge test was in the pool and never in the hand.** "Otto says he was
in the speakeasy for the fight; asked who won, he names the wrong man" is the
best clue the anchor system can produce, and it appeared in 3.5% of cases as a
findable clue. Against the killer it was already a route to the contradiction.
Against an innocent it established nothing the proof needed, so it was derived,
filed, and never dealt. It now heads that innocent's noise branch, which is
legal noise — the lie is there because of the secret — and the selector deals
branches with a lead-in first. 68.7% of eligible cases now put one in front of
the player, against the spec's floor of a half. Seven of the sixteen anchors
gained a knowledge trace to widen the denominator, so every place-attached
anchor now has something only the people in the room would know.

**A companion who is lying herself will still deny the alibi.** The M2 code only
produced the companion's denial when she would say where she really was. In
seed 7 she was in the speakeasy and lying about it, so the strongest
contradiction in the case was never derived. Denying that you were with somebody
admits nothing about where you were, so the clue now always exists; it is a new
`denial` kind rather than an `observation`, because the rule that an observer
never reports what they saw during their own lie still holds and this is not an
observation. 308 of the 600 cases name a companion, and all 308 now carry the
denial, spine-eligible.

**The claim-block bug behind it.** Fixing the companion denial surfaced a
second one: a killer whose cover secret abuts the murder block and happens to
claim the *same* room for both had the two blocks merged, and the companion was
read off the first tick of the merged block. Seven of 600 cases lost their
companion denial that way. Blocks now split on the companion as well as on the
room.

## Cast pairings removed

`rel-rival` ("the victim's rival in trade") now requires the suspect's
archetype and the victim's archetype to carry the same `trade` tag. Tags added:
`press` (society columnist victim; society columnist and newspaper stringer
suspects), `pawn` (pawnbroker; pawnbroker's man), `property` (tenement landlord;
owner of the block), `graft` (buildings inspector; ward heeler), `money` (bail
bondsman; curb broker), and `dry-goods`, `theatrical`, `labor` and `insurance`
on one side only, which is to say never a rivalry. Rival-in-trade now fires in
10 of 200 cases at difficulty 2, and every one of them reads.

Removed or changed outright:

| Pairing | Why |
|---|---|
| ward heeler / retired dry-goods wholesaler, *rival in trade* | Neither is in the other's trade. This is the seed-7 line that started the pass. |
| any *rival in trade* without a shared tag | Same reason, generalised: 9 of the 10 archetypes that could take `rel-rival` could take it against any victim at all. |
| the heir as *the victim's cousin* | The role said "the victim's nephew, at loose ends" and the relationship said cousin. Role changed to "a young man living on expectations", which lets all four of its relationships be true. |
| the heir as *the victim's brother-in-law* | Same: a nephew is not also a brother-in-law. Fixed by the same rename. |
| the heir as *engaged to the victim's daughter* | The nephew marrying the daughter is first cousins. Fixed by the same rename. |
| the widow as *the victim's estranged spouse* | A widow's husband is dead; the victim was alive this morning. `rel-spouse` removed from `arch-widow` and moved to the chorus girl. |
| the chorus girl as *engaged to the victim's daughter* | In 1929, no. `rel-engaged` now forces the suspect male, and `rel-spouse` requires the suspect to be the opposite sex to the victim. |

Two relationships were moved rather than dropped so the pool did not shrink:
`rel-inlaw` gained the night manager and the curb broker, `rel-engaged` gained
the lawyer and the private secretary.

## Deviations from the spec

1. **Branch depth is not what M2 set.** M2's table was 1 / 1–2 / 2–3 noise
   clues per branch. Five branches of depth 1 is ten clues of noise in a hand
   of thirty-four, which is 29% and outside the 35–45% the spec asks for, so
   the depths moved to 1–2 / 1–3 / 2–3 and the branch count became the dial:
   5 / 4 / 3. The difficulty progression is now shallow-and-many to
   deep-and-few, which is what M2's table was reaching for.
2. **Findable is 34 every time.** The tolerance is ±2 and the planner uses it,
   but it only needs to when the cast supplies four branch-worthy secrets at
   difficulty 1, and even then 34 is reachable. A hand that is always exactly
   the target is not a bug, but it is not variety either.
3. **Par is 9–12, never 13–18.** The floor and ceiling are enforced and neither
   ever rejected a case. See above.
4. **Corroboration is 8–11, not 6–8.** Carried over from M2's deviation 1 and
   for the same reason: the proof has to fill 20 or 22 of the 34.
5. **The knowledge test against an innocent is tagged as noise.** It establishes
   a true `personNotAt` about a real liar, so it is not noise in the sense of
   "establishes nothing". It is noise in the sense the spec means — it comes out
   of an innocent's secret and its branch disqualifies it — and tagging it that
   way is what gets it dealt at all.
6. **`rel-spouse` fires once in 200.** Gating it on opposite sexes leaves only
   the chorus girl able to take it, and only against a male-hinted victim. It is
   nearly dead rather than wrong. It wants a second archetype.
7. **Everything M2's notes listed as a deviation still stands** except numbers 1
   and 3: the scene is still never a watched place, the two anchors are still
   chosen to fit the murder tick rather than drawn and redrawn, "two routes" for
   the time of death still means two sources across both halves, the killer's
   weapon access still needs two sources rather than one, the opening three are
   still free, motive clues about innocents are still candidates only, and the
   beat cop is still drawn with the fixtures at probability 0.45.

## Which constraints fired

Discards over 200 seeds, by difficulty. The shape is M2's, with one change: the
selector now rejects almost nothing. Its only discard over 600 cases was "the
spine cannot be walked from the scene", four times; the spine cap, the par band
and the noise-ratio check never fired at all.

| Discard reason | d1 | d2 | d3 |
|---|---|---|---|
| no murder-tick arrangement leaves every innocent doubly witnessed | 0 | 3 | 141 |
| no free window for the blackmail secret | 27 | 16 | 8 |
| the killer could not be seen reaching the weapon | 10 | 18 | 17 |
| no cast fits the victim and the rooms | 7 | 6 | 3 |
| nobody but the killer could have reached the weapon | 1 | 0 | 2 |
| the spine cannot be walked from the scene | 0 | 2 | 2 |

Difficulty 3 is still the expensive one and still for M2's reason: three liars
in three rooms and only three or four watchers to cover them. Median attempts
is 1 at every difficulty; the worst seed at difficulty 3 takes 32.

As in M1 and M2, the solvability check never rejected an attempt over the whole
corpus. It is a regression net, not a filter, and `test/solvability.test.ts`
now damages a good case twenty-four ways to keep it honest.

## What I would change

1. **Par does not vary enough to be worth computing exactly.** It is 9–12 in
   every case at every difficulty. The budget is therefore 8, 6 or 4 more than
   "about ten", and a flat budget of 18 / 16 / 14 would be within one action of
   the current numbers almost always. The exact BFS is cheap and honest and
   should stay, but the design should not lean on par varying until something
   makes it vary — rooms that are shut after ten, or a person who is only
   findable in one place.
2. **Five innocents each need their own alibi clue, and that is five of the
   eleven spine clues.** The spine is now mostly bookkeeping. If M3 wants the
   spine to be interesting rather than long, the lever is fewer suspects, not
   fewer clues per suspect.
3. **The noise is four or five branches and the branches do not interfere.**
   Each one is a straight chain ending in its own disqualifier, and nothing in
   one branch is evidence in another. A branch that pointed at the wrong person
   would be worth more than a branch that pointed at nobody.
4. **`fall` is still rare and blackmail is still the most expensive secret to
   place.** Both carried over from M2 untouched.
5. **The client still changes nothing.** M2 said it; it is still true.
