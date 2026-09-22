# M7 — Shape: the generator half

Branch `m7-tiers-gen`. What `docs/16-m7-tiers.md` asks of the generator, the
checker, the CLI and the tests. **What the book needs** (the profile, the title
page, the closing page) was left alone on purpose: it waits for the UI branch.
Nothing under `src/ui/` was touched.

All 545 tests pass. 102 of them are new; the 443 from before M7 still pass
unchanged. **Byte identity holds:** `generateCase(seed, { difficulty })` with
no shape and no ladder hashes the same as before M7 for seeds 1..200 at
difficulties 1, 2 and 3, which is 600 of 600 cases. The hashes were written
by `scripts/snapshot-cases.ts --write` and committed before any generator
code changed (commit `37d4ca7`). `test/m7-identity.test.ts` checks them on
every run, and `npx tsx scripts/snapshot-cases.ts` checks them from the
command line.

---

## What it is

**One file of presets: `src/gen/shape.ts`.** It holds `CaseShape`, `Ladder`,
the six tiers plus Over easy (`TIERS`, `CAMPAIGN`), the four levels
(`LADDERS`), and the pre-M7 dials as ladders (`LEGACY_LADDERS`). It also has
the small functions that read them: `resolveDials`, `dialsOf`, `slackFor`,
`liarsFor`, `unknownsFor`, `describeDials`.

```ts
generateCase(seed, { shape, ladder })       // the objects
generateCase(seed, { tier: 3, level: 2 })   // the presets by name
generateCase(seed, { difficulty: 2 })       // today's case, byte for byte
generateCase(seed, { difficulty: 4 })       // Hard-boiled at the DA's Office
```

A case dealt with options carries `case.shape` and `case.ladder`. A case dealt
without them carries neither, which is how it stays byte-identical, and
`dialsOf(case)` reads either kind back. `Difficulty` is now `1 | 2 | 3 | 4`.

The shape changes the generator's path at these points. Each one is a no-op
for Hard-boiled on a legacy ladder:

- **Places** (`setting.ts`). Six cards is still the old draw. Any other
  count uses `drawPlacesSized`, which deals the victim's address, the shape's
  number of watchers, a public place with nobody posted when there are five
  or more rooms, and private rooms with nobody posted for the rest. Raw and
  Coddled deal exactly one watcher.
- **Cast** (`cast.ts`). Suspects by count. Innocent motives are `range(1, n)`
  and skipped when n is 0. Only as many innocents keep a secret as the shape
  says, liars first. The killer's cover secret is optional. The client is
  never the culprit when `clientMayBeCulprit` is false.
- **Schedules** (`schedule.ts`). An innocent with no secret is simply at the
  hub. Where access is not a leg of the proof, nobody else has to be seen
  near the weapon.
- **The coroner** (`generate.ts`, `clues.ts`, the tropes). The window is two
  hours at width 4, as before. At width 2 it is always `[M−1, M]`, so the one
  anchor it needs is the victim alive at M−1, and that is a clue the detective
  has to find rather than the scene report's free "dead by M". At width 1 it
  is `[M, M]`, and the coroner says "at ten o'clock, and will swear to the
  half hour".
- **Knowledge tests** are dealt only where the shape has them, which is
  Hard-boiled and Over easy.
- **The report.** `act.unknowns` is `unknownsFor(shape, type, trope.unknowns)`.
  The tier's `reportFields` is a ceiling over the trope's unknowns. `entry`
  and `fate` count as `how`, and `whereabouts` and `goods` count as `where`.
  Where the tier teaches the method (`methodGiven: false`), a murder's givens
  drop "It was …" and `how` is asked right after `who`. Scoring was already
  one point per asked unknown, so it counts only what the report asks.
- **Proof legs** (`select.ts`: `ProofSpec`, `buildRequirements(…, spec)`).
  Every case clears the innocents and breaks the culprit's alibi. On top of
  that come the time of death (from `anchorsRequired`) and whichever of
  access, method, motive and the trope's signature the shape lists. Routes
  depend on the ladder. `full` gives every essential fact two routes,
  exculpations included. `bigFive` is today's rule. `single` gives everything
  one route, pads nothing and checks the result.
- **Noise** (`select.ts`). A legacy ladder runs the old `planNoise` exactly.
  Every other ladder runs `planShaped`, which holds the ladder's noise ratio
  near its middle, keeps the hand near the shape's `findable` target, puts as
  much noise in branches as the secrets allow, and fills the rest with
  **loose ends** (below). Noise placement follows the ladder: `quiet` at
  Beat, `random` at Precinct, `busy` at Homicide and the DA's Office.
- **Slack.** `slackFor`: below Medium it is `max(3, round(slack × par / 12))`.
- **The checker** (`solvability.ts`) reads every condition off `dialsOf(case)`:
  window width, legs and routes, liars, the par window, slack, the noise band,
  the branch floor, loose ends as legitimate noise, and one route per
  essential fact at the DA's Office. On a legacy ladder each check is the one
  it was.

**CLI.** `npm run read`, `npm run batch` and `npm run case` take `--tier
0..5|over-easy` and `--level 1..4`, and accept `--difficulty 4`. A tiered
transcript gets one extra header line (`describeDials`). A plain transcript
is unchanged, so golden-loop runs stay comparable. The truth sheet gets a
**Tier / Level** header line on every case, a tier-aware deduction path, and
a **Loose ends** list. The CLI edits are limited to flag parsing
(`parseTierLevel` in `args.ts`) and header lines.

`src/game/storage.ts` accepts a saved run at difficulty 4. Nothing else in
`src/game/` switches on difficulty. The reducer only mixes it into a seed.

---

## The presets

| tier | suspects / places | watched | secrets | innocent motives | coroner | anchors | proof legs beyond who | report ceiling | method given | par | findable target |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 Raw | 3 / 3 | 1 | 0 | 0 | ½ h | 0 | — | who | yes | 4–5 | 12 |
| 1 Coddled | 4 / 4 | 1 | 0 | 0 | ½ h | 0 | method | who, how | no | 5–6 | 17 |
| 2 Poached | 4 / 4 | 1–2 | 1 (liar) | 0 | ½ h | 0 | method, access | who, how | no | 6–7 | 21 |
| 3 Soft-boiled | 4 / 4 | 1–2 | 1 (liar) | 0 | 1 h | 1 | method, access, signature | who, how | no | 7–8 | 26 |
| 4 Medium | 5 / 5 | 2–3 | 3 (≤2 liars) | 1–2 | 1 h | 1 | all four | all five | no | 9–10 | 31 |
| 5 Hard-boiled | 6 / 6 | 3–4 | 5 | 1–3 | 2 h | 2 | all four | all five | yes | 9–18 | 34 |
| Over easy | 8 / 8 | 4–5 | 7 | 1–3 | 2 h | 2 | all four | all five | yes | 14–18 | 44 |

| level | slack | noise band | branch depth | branches wanted | liars at the crime | corroboration | noise hangs |
|---|---|---|---|---|---|---|---|
| 1 Beat | 8 | 25–35% | 1 | 5 | 2 | full | quiet |
| 2 Precinct | 6 | 35–45% | 1–2 | 4 | 2–3 | full | random |
| 3 Homicide | 4 | 45–55% | 2–3 | 4 | 3 | bigFive | busy |
| 4 The DA's Office | 3 | 55–70% | 2–3 | 5 | 3 | single | busy |

The liar count is capped by the shape (`liarsAtCrime`, and the number of
secrets). The legacy ladders are these same rows with the pre-M7 values: noise
35–45% at all three levels, depth 1–2 / 1–3 / 2–3, five / four / three
branches, `bigFive`, random placement.

---

## The numbers: 200 seeds per tier and level

"par" is the generator's `case.par`. "game par" is what the book holds the
player to: par plus the walk from the office, re-costed from the stairs for
`body-moved`. "first-try" is the share of seeds whose first attempt was kept.
"discards / case" counts every discarded draw, whether of the setting, the
cast or the attempt.

| tier | level | par (min / median / max) | game par median | findable (min / median / max) | noise % median | spine / corr. / branches / loose (median) | slack median | first-try % | mean attempts | discards / case |
|---|---|---|---|---|---|---|---|---|---|---|
| Raw | 1 | 4 / 4 / 5 | 5 | 12 / 13 / 13 | 31 | 6 / 3 / 0 / 4 | 3 | 94 | 1.03 | 0.07 |
| Coddled | 1 | 5 / 5 / 6 | 6 | 16 / 17 / 17 | 29 | 7 / 5 / 0 / 5 | 3 | 100 | 1.00 | 0.00 |
| Coddled | 2 | 5 / 5 / 6 | 6 | 19 / 20 / 20 | 40 | 7 / 5 / 0 / 8 | 3 | 96 | 1.02 | 0.04 |
| Coddled | 3 | 5 / 5 / 6 | 6 | 17 / 18 / 18 | 50 | 7 / 2 / 0 / 9 | 3 | 95 | 1.05 | 0.06 |
| Coddled | 4 | 5 / 5 / 6 | 6 | 16 / 18 / 18 | 61 | 7 / 0 / 0 / 11 | 3 | 90 | 1.09 | 0.11 |
| Poached | 1 | 6 / 6 / 7 | 7 | 20 / 21 / 21 | 29 | 8 / 7 / 1 / 4 | 4 | 92 | 1.01 | 0.08 |
| Poached | 2 | 6 / 6 / 7 | 7 | 22 / 25 / 25 | 40 | 8 / 7 / 1 / 7 | 3 | 85 | 1.05 | 0.17 |
| Poached | 3 | 6 / 6 / 7 | 7 | 21 / 24 / 24 | 50 | 8 / 4 / 1 / 8 | 3 | 92 | 1.01 | 0.10 |
| Poached | 4 | 6 / 6 / 7 | 7 | 18 / 24 / 24 | 63 | 8 / 1 / 1 / 11 | 3 | 86 | 1.04 | 0.15 |
| Soft-boiled | 1 | 7 / 8 / 8 | 9 | 24 / 26 / 27 | 31 | 10 / 9 / 1 / 6 | 5 | 45 | 2.84 | 1.92 |
| Soft-boiled | 2 | 7 / 8 / 8 | 9 | 26 / 30 / 31 | 39 | 10 / 8 / 1 / 9 | 4 | 41 | 2.42 | 1.51 |
| Soft-boiled | 3 | 7 / 8 / 8 | 9 | 26 / 30 / 32 | 50 | 10 / 6 / 1 / 11 | 3 | 47 | 2.60 | 1.69 |
| Soft-boiled | 4 | 7 / 8 / 8 | 9 | 23 / 29 / 29 | 62 | 10 / 1 / 1 / 14 | 3 | 63 | 1.68 | 0.74 |
| Medium | 1 | 9 / 10 / 10 | 11 | 30 / 31 / 33 | 29 | 11 / 11 / 3 / 3 | 8 | 35 | 5.24 | 4.31 |
| Medium | 2 | 9 / 10 / 10 | 11 | 31 / 36 / 38 | 39 | 11 / 11 / 3 / 5 | 6 | 33 | 4.17 | 3.25 |
| Medium | 3 | 9 / 10 / 10 | 11 | 32 / 36 / 38 | 50 | 11 / 7 / 3 / 6 | 4 | 33 | 7.50 | 6.60 |
| Medium | 4 | 9 / 10 / 10 | 11 | 27 / 32 / 34 | 63 | 11 / 1 / 3 / 8 | 3 | 45 | 3.88 | 2.98 |
| Hard-boiled | 1 | 9 / 11 / 14 | 12 | 34 / 34 / 34 | 29 | 12 / 12 / 5 / 0 | 8 | 86 | 1.16 | 0.18 |
| Hard-boiled | 2 | 9 / 12 / 14 | 12 | 35 / 38 / 40 | 39 | 12 / 11 / 5 / 0 | 6 | 81 | 1.23 | 0.27 |
| Hard-boiled | 3 | 9 / 12 / 14 | 13 | 34 / 36 / 38 | 50 | 12 / 6 / 5 / 0 | 4 | 82 | 1.65 | 0.68 |
| Hard-boiled | 4 | 9 / 12 / 14 | 13 | 30 / 34 / 37 | 62 | 13 / 1 / 5 / 3 | 3 | 83 | 1.49 | 0.53 |
| Over easy | 1 | 14 / 14 / 16 | 15 | 44 / 44 / 44 | 30 | 14 / 17 / 6 / 1 | 8 | 68 | 1.63 | 0.65 |
| Over easy | 2 | 14 / 14 / 16 | 15 | 45 / 45 / 46 | 40 | 14 / 13 / 6 / 0 | 6 | 73 | 1.43 | 0.44 |
| Over easy | 3 | 14 / 14 / 16 | 15 | 44 / 44 / 44 | 50 | 15 / 7 / 6 / 0 | 4 | 80 | 1.22 | 0.24 |
| Over easy | 4 | 14 / 14 / 16 | 15 | 38 / 40 / 43 | 63 | 15 / 1 / 7 / 0 | 3 | 82 | 1.20 | 0.23 |
| no options | difficulty 1 | 9 / 11 / 13 | 12 | 34 / 34 / 34 | 41 | 12 / 8 / 5 / 0 | 8 | 89 | 1.10 | 0.13 |
| no options | difficulty 2 | 9 / 12 / 14 | 12 | 34 / 34 / 34 | 41 | 12 / 8 / 4 / 0 | 6 | 86 | 1.18 | 0.20 |
| no options | difficulty 3 | 9 / 12 / 14 | 13 | 34 / 34 / 34 | 35 | 12 / 9 / 3 / 0 | 4 | 81 | 1.64 | 0.66 |
| no options | difficulty 4 | 9 / 12 / 14 | 13 | 32 / 34 / 37 | 62 | 13 / 1 / 5 / 3 | 3 | 81 | 1.80 | 0.83 |

No seed failed to generate at any tier or level. Every tier's par lands
inside its spec target: Raw 4–5, Coddled 5–6, Poached 6–7, Soft-boiled 7–8,
Medium 9–10. Hard-boiled's generator par has a median of 11 to 12, and its
game par a median of 12 to 13, which matches the spec's "12–14 (today's
case)" read as game par. Findable counts go 13, 17, 21, 26, 31, 34, 44 up the
tiers, against the spec's "Raw about 12, Hard-boiled 34, Over easy about 44".

**Where the discards come from**, top three per row:

- **Raw × 1**: no hand size puts the noise ratio in range (7); no cast fits the victim and the rooms (4); the place deck would not deal a legal hand (2)
- **Coddled × 2–4**: no hand size puts the noise ratio in range (5 / 10 / 19); the place deck would not deal a legal hand (1–3)
- **Poached × 1–4**: no cast fits the victim and the rooms (13–23); nobody but the killer could have reached the weapon (up to 8)
- **Soft-boiled × 1–3**: the spine cannot be walked from the scene (176–250; this is also the bail when every restart's corroboration fails, here a second source for "alive at M−1", which every level but the DA wants); par over the ceiling (91–103)
- **Soft-boiled × 4**: par over the ceiling (127)
- **Medium × 1–4**: no murder-tick arrangement leaves every innocent doubly witnessed (292–779); the spine cannot be walked (≈250 at 1–3); par over the ceiling (58–245)
- **Hard-boiled × 1–4**: no murder-tick arrangement (up to 104); the killer could not be seen reaching the weapon (14–19); no free window for the blackmail secret (5–9)
- **Over easy × 1–4**: par under the floor of 14 (14–76); no free window for the blackmail secret (10–25); the killer could not be seen reaching the weapon (15–19)
- **no options × 1–4**: the same three reasons as Hard-boiled, at the same rates as before M7

Medium is the costly one, with a mean of 4 to 7.5 attempts. Five people and
two or three watchers make the double-witness arrangement at the crime's half
hour hard to find. I tried three watchers (`[3, 3]`): about 40% fewer
attempts, but 85% of scenes became the victim's own address because the fifth
card was always the open public place. Two liars instead of three helps just
as much, but Homicide asks for three. I kept `[2, 3]`. Cost is not a problem:
200 Medium cases take about 2.5 seconds.

---

## Where I judged differently from the spec, and why

1. **No options stays on the pre-M7 dials, and the spec's ladder applies only
   when asked for.** The spec says the no-options case is Hard-boiled and
   byte-identical for levels 1 to 3. It also says the ladder spreads noise
   30 / 40 / 50 / 65. Both can't hold for the same object, because today's
   noise is 35–45% at every level. So `{ difficulty: n }` is Hard-boiled on
   `LEGACY_LADDERS[n]`, and `{ tier: 5, level: n }` is Hard-boiled on the
   spec's ladder. They are different cases from the same seed, which also
   holds because a tiered case mixes a per-tier salt into its seed. Level 4
   never existed, so `{ difficulty: 4 }` is Hard-boiled at the DA's Office
   with no legacy to keep.
2. **Hard-boiled keeps today's par window, 9–18.** Tightening it to the
   spec's 12–14 would change which seeds pass, which breaks identity. The
   measured medians are above.
3. **The par targets are the generator's `par`.** The spec's Raw 4–5 and
   today's `PAR_FLOOR` of 9 both use that scale. Game par is one more, which
   is where "the oracle within par plus one" comes from.
4. **How is asked from Coddled through Medium, and not at Hard-boiled.** The
   spec says Coddled "adds how", and it also says a tier's fields are a
   ceiling over what the case left unknown. Every murder trope names its
   method in the givens, so under the ceiling alone `how` would never be
   asked for a murder. I added `methodGiven` to the shape. Where it is false,
   the murder givens stay quiet about the method and `how` joins the
   unknowns. At Hard-boiled it is true, because Hard-boiled must be today's
   case. The effect is that a Hard-boiled murder asks who, why and when, and
   a Medium murder asks who, how, why and when. That is one more question
   than the tier above it.
5. **inside-job arrives at Medium, not Soft-boiled.** The spec lists it among
   Soft-boiled's murder tropes, but in the code it is a robbery. Soft-boiled
   deals the four murder tropes: body-at-scene, body-moved, locked-room and
   the-frame.
6. **The proof grows one leg per tier.** The spec does not say which legs of
   the proof each tier needs. The par targets decided it. Raw proves who: the
   innocents cleared and the alibi broken. Coddled adds the method, Poached
   adds access, and Soft-boiled adds the trope's signature and one anchor.
   Medium and Hard-boiled prove everything. Motive is a leg only where the
   report asks why. With every leg in, Raw's par would be 8, not 4.
7. **Below Medium only the culprit has a motive.** Medium is the tier that
   teaches "motive alone names nobody", so no innocent has a motive before
   it. That meant the client's pointer ("who do you like for it?") would
   always name the culprit, with the motive attached. Below Medium the client
   names somebody at random and says only that they "were in and out of
   there all week". The client clue then carries no motive fact.
8. **Loose ends.** The spec gives Raw no secrets, Coddled none and
   Poached and Soft-boiled one, yet asks for 30–65% noise, and until now
   every noise clue came from a secret. Where a tier's secrets cannot carry
   the ratio, the rest is loose ends. A loose end is a true, one-subject
   clue about an innocent at an hour that is not the crime's and is not one
   they lie about, or a grudge an innocent held. It never touches a leg of
   the proof. It hangs off a spine clue and leads nowhere, so it is a dead
   end of depth one. The checker accepts one only if it passes that test,
   `isLooseEnd`, and the truth sheet lists them. **Worth a look in play:** at
   Homicide and the DA's Office the small tiers are mostly loose ends. For
   example Coddled × 4 has 11 of 18, and Soft-boiled × 4 has 14 of 29. They
   are dead ends, not lies. If that reads flat, the obvious dial is to cap
   loose ends and let those tiers sit under the ladder's band.
9. **The DA's Office: "exactly one findable source" has one exception.** An
   innocent who lies about the crime's half hour is placed at that half hour
   twice. Once by the spine clue that clears them, and once by the
   disqualifier at the end of their own noise branch, because the secret is
   where they were. The test holds every other findable clue to exactly one
   source per essential fact. It allows a disqualifier to repeat only its
   own subject's exculpation. The alternative was to strip the half hour out
   of the disqualifier, which would break "a liar is not a killer". The
   trope-signature requirement is held to one route by the selector. It is
   not re-derived by the checker, because it needs the trope's context.
10. **The ladder's numbers.** Noise bands are 25–35 / 35–45 / 45–55 /
    55–70%, around the spec's 30 / 40 / 50 / ~65. Branch counts wanted are
    5 / 4 / 4 / 5. More noise needs more branches, so Homicide and the DA
    ask for more than the old three. Liars at the crime are 2 / 2–3 / 3 / 3,
    capped by the shape. The findable size is a target, not a constraint:
    the planner holds the noise band first. That is why the DA's hands vary
    (Hard-boiled 30–37) and Precinct's run a little large (Hard-boiled 35–40,
    where its proof is fatter at `full`).
11. **Slack below Medium** is `max(3, round(slack × par / 12))`, as the spec
    says. At Raw that is always 3 over par 4 or 5, and the game budget is 7
    or 8. It is gentle, but the clock still shows.
12. **Over easy** is a preset, tested over 50 seeds rather than 200 because
    each case is twice the size. The spine cap stretches by one for every
    suspect past six. The sliders ("custom") are the type `'custom'` and
    nothing more yet.
13. **The small draws use the old pools.** They never deal a semi-public room
    with nobody posted in it, such as the union hall or the side chapel. The
    six-card draw never has either. Their anchors name rooms that would not
    be in the case: the union hall's shift change is "at the garage".

---

## For the UI milestone

- The difficulty picker offers 1–3. **Level 4, the DA's Office, exists now.**
  The ladder's name is "The DA’s Office" (curly apostrophe).
- **A saved run records `difficulty` but not the tier.** `RunState` has
  `seed` and `difficulty`, and a tiered case regenerated from those two
  would be the legacy Hard-boiled case. The profile and resume code needs to
  store the tier (or the shape) and pass `{ tier, level }` back into
  `generateCase`. `case.shape` and `case.ladder` carry everything the title
  page needs: `shape.name`, `shape.rule` (the one-line "This time: …"),
  `ladder.name`, and `shape.lockedLevel` for Raw, which shows no difficulty
  choice.
- A tier is cleared by a full-credit report: `verdict.points ===
  verdict.asked`. Scoring already counts only the asked unknowns.
- Some pre-existing text glitches show up in any transcript, tiered or not:
  "Bellucci is a The man behind the counter." in the notebook's fixture line,
  and the closing page's `par.toLowerCase()` ("the book says 5. i will not be
  telling anybody."). Page correspondence also has two rare false positives
  at about the pre-M7 rate: "Twice is not a bad memory" read as a name, and a
  secret's hint hour ("some time after eight o'clock") that the page checker
  does not allow. I left these alone as not M7's.

---

## Raw, seed 1

`npm run read -- --seed 1 --tier 0`, abridged. Three people, three rooms, one
question, and it closed in four actions against a game par of five. The whole
run is six pages and 1,222 words.

```
DASHIELL · case 1 · difficulty 1 · Little Italy
Raw (3 suspects, 3 places, 0 secrets, coroner half an hour, par 4–5) at Beat (level 1, slack 8, noise 25–35%, depth 1, full)
par 5, budget 8 (generator: 4/7), 13 things to find

the suite                                             1:00 AM   page 2
────────────────────────────────────────────────────────────────────────────

I go over the room the way the precinct did not. Tramonti was found at the
suite. A glass is on its side and the spill had not yet reached the edge of
the table when it dried. The dumbwaiter car was worked at ten o’clock, as it
is on the hour and the half hour. That was enough for now.

In the coroner's own hand, penciled onto the intake form's reverse: a note
easy to miss. The coroner puts death at ten o’clock. Chloral hydrate in the
stomach. No wound, no bruising, no sign of a struggle. I let it sit.

Down it went. I kept coming back to the paper. One half hour left standing,
and it is ten o’clock. The window is a keyhole now. I took my time.

[1 action, 2 written down, 234 words]

the chop suey place                                   4:00 AM   page 6
────────────────────────────────────────────────────────────────────────────

“Bidwell,” I said. “Straight, and I’ll go away.”

She got onto something else for a minute: a dog got into the bakery Tuesday
and came out white to the shoulders. Kept reaching for things on the desk
and setting them back down, unopened, untouched. "By ten o’clock Bidwell was
at the chop suey place, and stayed there talking to half the room." Told the
whole evening twice, out of order both times. Her voice was thin as the wire
on a nickel phone call.

[1 action, 1 written down, 172 words]

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who killed Tramonti       Stannard                    ✓

  1 of 1 · solved · 4 actions against par 5

6 pages · 1222 words · 204 a page · 4 actions spent (1 waived) · 0 fallbacks
```

In the briefing, Bidwell says the coroner "puts it at ten o'clock, and will
swear to the half hour. It was poison in a drink." That is Raw's method given,
the exact half hour, and a report that asks only who.
