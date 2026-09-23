# M9 — the generator half: notes and the contract for the engine

*Build plan item 1 of `docs/20-m9-deduction.md`, branch `m9-gen`. What the generator now deals, what every new field means, how to render each rule, how to call the solver, and what the engine half has to do with it. Measurements are at the end.*

## 0. In one paragraph

A case dealt with a tier (`generateCase(seed, { tier, level })`) is now a logic game. The evening is built on a map of three blocks, so travel constrains it. Every pair of people has an acquaintance edge, so a witness names somebody or describes them. Everybody can be asked about everybody, and the answer is testimony derived from the truth, the edge and the lie rule. Accounts are clues of their own and are false where the lie rule allows. Watchers count heads and swear to empty doorways, anchors time sightings, and an anchor's witnesses know things a liar does not. A constraint solver decides what is findable, whether the case is accepted, and what par is. Leads come from content. Every lie has its confrontation written out. The no-options case (`generateCase(seed, { difficulty })`) is untouched, byte for byte.

## 1. What changed where

| file | what |
|---|---|
| `src/gen/types.ts` | The contract: new `ClueKind`s (`testimony`, `account`, `watch`, `timing`), role `testimony`, `Clue.rule` and `Clue.about`, eleven new `Fact` kinds, and `Case.logic` (`Logic`, `AcquaintanceEdge`, `Description`, `LieBlock`, `Confrontation`, `ConfrontResponse`, `Derivation`, `SolveSummary`, `Distance`, `DISTANCE_TEXT`, `canWalk`). |
| `src/gen/shape.ts` | `DeductionDials` per tier (`CaseShape.deduction`, `deductionOf`), and two ladder dials (`Ladder.pieces`, `Ladder.extraLies`). |
| `src/gen/logic/travel.ts` | The three blocks, distance classes, what is reachable in a half hour. |
| `src/gen/logic/acquaint.ts` | The acquaintance graph, reference forms and descriptions. |
| `src/gen/logic/schedule.ts` | The evening, built for a logic game (§3). |
| `src/gen/logic/rules.ts` | The rule pool: testimony, accounts, descriptions, watchers' doors, anchor timings, the conditional, and what M7 dealt that still fits. |
| `src/gen/logic/lines.ts` | The notebook's one-line rules. |
| `src/gen/logic/solver.ts` | The constraint solver (§6). |
| `src/gen/logic/select.ts` | What is findable, par, leads, lies and confrontations; `walkPar`. |
| `src/gen/logic/check.ts` | The checker for a tiered case (`checkSolvability` dispatches to it). |
| `src/gen/logic/api.ts` | The solver as the engine calls it: `solveHeld`, `contradicts`, `crimeFromHeld`, `acquaintanceOf`, `referenceOf`, `knowsByName`. All exported from `src/gen/index.ts`. |
| `src/gen/generate.ts` | `runLogic`: the tiered path. `run` hands every tiered case to it and is otherwise unchanged. |
| `src/gen/client.ts`, `src/gen/cast.ts` | The client's pointer, and whether the client did it, decided per seed for tiered cases (§9). The no-options path draws exactly as before. |
| `src/gen/clues.ts` | `ClueContext.m9` skips the sightings and denials that testimony replaces (no draws are skipped). |
| `src/gen/structure.ts` | `rule`, `ref`, `knowledge` and `what` join `TEXT_KEYS`. No no-options case carries any of them. |
| `src/sheet/truthSheet.ts` | A tiered case prints its rule lines, a compact list of accounts and testimony, and a new section 16, "The logic game". |
| `src/game/derive.ts` | **Engine adaptation 1**: `caseParFrom` returns `kase.par` for a tiered case, whose par is already walked from the first room (§8). |
| `scripts/diagnose-play.ts` | The Targets table, measured the same way on old cases and new, with the solver (§12). |
| `scripts/m9-stats.ts`, `scripts/m9-debug.ts` | Acceptance, rejection reasons, timing and depth per tier; why an attempt was turned down, cell by cell. |

## 2. The map

`logic.blocks[placeId]` is 0, 1 or 2. The scene is always on block 0. The distance between two places is the difference: 0 **the same block**, 1 **a walk**, 2 **across the neighbourhood** (`DISTANCE_TEXT`). Nobody is at two places across the neighbourhood from each other in consecutive half hours (`canWalk`). The map is given, not found: the places list should show it ("the pier — across the neighbourhood from the suite"). Every truth schedule obeys it.

## 3. The evening

`logic/schedule.ts` replaces the pre-M9 arrangement, which made every innocent doubly watched at the crime's half hour. At that half hour now:

- **At most `directClears` innocents** (one, from Poached up) stand where somebody who knows them by name can say so. That is a watcher naming a regular, or somebody who knows a liar seeing them where the secret was.
- **Everybody else** stands within a walk of the scene, where nobody who could name them is standing. The half hours either side are within a walk too. So no single sighting clears them, by travel or otherwise. What clears them is pieces:
  - their own account, corroborated by somebody who knows them and saw them in the same room a half hour before or after (planted);
  - a stranger's description, resolved by who else it could be;
  - an anchored sighting;
  - a watcher's count;
  - for a liar, the confession their broken lie leads to.
- **At Hard-boiled**, two truthful innocents who fit one description stand in two rooms, each seen only by a stranger, with the half hours either side in one room within a walk of both and of the scene. Neither description clears anybody. Together they clear both, by pigeonhole: a hypothesis test. Anybody else the description fits is shown elsewhere on their own, and if the culprit fits it, both rooms' watchers know the culprit and say the culprit was not in.

The lies (spec §1, §3) are in `logic.lies`, one `LieBlock` per false span:

| cover | who | where |
|---|---|---|
| `crime` | the culprit | the block ending at the crime's half hour |
| `means` | the culprit, from Poached up | the half hour the means was fetched |
| `secret` | an innocent with a secret, from Poached up; the culprit's cover secret at Hard-boiled | the secret's half hours |
| `companion` | an alibi companion, from Medium up (plus the ladder's `extraLies`) | the span they claim to have shared. A companion covering the crime's half hour is the one innocent a watcher names, so lying costs them nothing else. |

Nobody lies about anybody else. A span of an account that is a lie claims a room different from the spans either side where the map allows, and the account's spans always split where the truth of them changes. So a lie is always its own span.

## 4. Who knows whom

`logic.acquaintance` has one `AcquaintanceEdge` for every ordered pair of people; the victim appears only as `to`. The graph is rolled from:

- **ties**: every suspect knows the victim by name, and two people in one secret know each other;
- **trade**: a watcher knows the regulars of the door, the patrolman knows faces on the beat, and two people in one line of work know each other by what they do;
- **places**: two strangers who shared a room for an hour know each other's faces;
- **a roll** by the tier's `strangers` dial.

The arrangement then adjusts edges that are not ties (a regular made, a stranger kept a stranger) so that the crime's half hour works as §3 says.

| strength | asked about them by name | a sighting of them comes as | `ref`, the words used for them |
|---|---|---|---|
| `name` | answers | a named placement | "Nora Hanrahan" |
| `relation` | answers | a named placement | "my landlord", "the pawnbroker", "the bartender at Dolan's" |
| `sight` | "might know the face, not the name" | a description | "a woman in her thirties I know by sight" |
| `stranger` | "does not know anybody called Hanrahan" | a description | "a man in his forties" |

API: `acquaintanceOf(kase, from, to)`, `referenceOf(kase, from, to)`, `knowsByName(kase, from, to)`.

**For the page** (spec, "How people are introduced"): a witness uses `ref`, not the victim-relation. The notebook records the name once somebody with `name` or `relation` has said it, and until then uses the witness's words. The ask buttons should use a description for somebody the detective has only seen described, as the page-bug list says.

`logic.descriptions[suspectId]` is how a stranger would describe each suspect: `features` (gender, an age band, the trade when it shows at dossier layer 0), `text`, and `matches`, every suspect it fits. A description is dealt at the finest grain that still fits somebody else. `portrait` is set only when `matches` is one person; then, and only then, the engine may add a portrait detail. Linking a description to a person is the player's free tap; a wrong link costs at the report.

## 5. Clues and rules

Every clue of a tiered case carries `rule`: its facts as one plain line, source last. It is empty for a clue that establishes nothing (a hint, a trace), which goes in the notes and not the rules. Times drop the PM and join with an en dash.

### New kinds and roles

| kind | source, topic | what it is |
|---|---|---|
| `testimony` | the one asked; the subject's surname; `about` = the subject | Every person who can be asked, about every other person: exactly one clue per pair. |
| `account` | the person; `their own evening` | Their own claims for the hours around the crime and any hour they lie about. Soft. |
| `watch` | the watcher; the room's short name | "Nobody came in from 9 to 11", "nobody but Grasso", "two people at ten and nobody else". |
| `timing` | the anchor's room, or a person on the anchor's name | When an anchor happened: every tick. |
| `observation` with `describedAt` | the witness; the room's short name | A stranger's description at a place and half hour. |
| `anchor` with `anchorKnowledge` / `knows` | a person; the anchor's name | The conditional: anybody there knew the thing, and this person did not. |

Role `testimony` is a testimony or account clue off the par route. Par-route clues are `spine` whatever their kind. A board clue near the crime (within two half hours) that is off the route is `corroboration`; the rest is `noise`, as are the secret branches (`noise`, `disqualifier`).

### How to render each rule

| fact | means | the grid | the rule line |
|---|---|---|---|
| `personAt` | was there | ink in the cell | `Hanrahan: the third floor, 10:00–10:30. Kreuzer saw her.` |
| `personNotAt` | was not there | a struck place in the cell | `Grasso: not the garage, 6:00–11:30. Callahan says so.` |
| `personAtAnchor` | there when the anchor happened | a margin row under the anchor until an `anchorAt` for it is held, then the cell | `Hanrahan: the third floor, when the El going over happened. Kreuzer saw her.` |
| `anchorAt` | the anchor's ticks | resolves margin rows | `The El going over: 6:30, 7:30, 8:30.` |
| `describedAt` | one of `matches` was there | an unlinked entry on the place's column at that tick, "somebody who fits …", until the player links it | `Somebody who fits "a woman in her thirties": the third floor, 10:00. Kreuzer saw her; did not know her.` |
| `absentFrom` | nobody but `except` was there (`except[0]` is the watcher) | a strike on that place for everybody else, for the span | `The third floor, 9:00–11:00: nobody but Marchetti besides the one who works there.` |
| `countAt` | exactly `count` suspects there | a count on the place at the tick | `The speakeasy, 10:00: 2 people besides the one who works there.` |
| `together` | same room at the ticks | a link between two rows | `Schilling with Grasso, 9:30–10:30.` |
| `apart` | never the same room | a link between two rows | `Coffin and Mulcahy: never in the same place, all evening.` |
| `anchorKnowledge` | anybody there knew the thing | the conditional, in the rules list | `Anybody at Dolan's at 10:00 knows the challenger went down in the fourth.` |
| `knows` | whether this person knew it | with the conditional: a struck place | `Grasso does not know what happened when the fight card was on.` |
| `acquainted` | who knows whom | nothing on the grid | `Kreuzer does not know Hanrahan.` |
| `claims` | their own word | pencil-weight ink marked "own account"; a claim with `with` also links the two rows | `Hanrahan says: the third floor, 9:00–10:30, with Kreuzer.` |

The old kinds render as before. `victimAliveAt`, `victimDeadBy` and `timeOfDeath` narrow the crime's half hour.

### Testimony for every question

When X is asked about Y, the clue is (`logic/rules.ts`, `buildPool`):

- **X knows Y by name or relation** (the victim always counts): where X saw Y, a run at a time. From Soft-boiled up, some sightings are timed by an anchor instead of a clock. A victim is only timed by a single-occurrence anchor. A posted witness (a watcher, the patrolman) also says where Y was not: every half hour they were at their post and Y was not there. A suspect who never shared a room with Y all evening says so (`apart`). X never mentions the half hours X is lying about. If those are all there is, X "will not say", which is itself a tell.
- **X knows Y by sight**: "might know the face, not the name", with `acquainted`.
- **X does not know Y**: "does not know anybody called Y", with `acquainted`.

The four stock non-answers of `NOTHING_ASKED` are never the answer to a question about a person.

## 6. The solver

`logic/solver.ts`. Its domains are each suspect × each half hour × the places, plus the crime's half hour. Its constraints:

- one place at a time (the domain itself);
- travel (the map);
- every fact kind above;
- exactly one suspect was at the scene at the crime's half hour, which makes elimination work;
- accounts are soft. A span stands when nothing contradicts it and either something hard puts the person there for one of its half hours (corroboration), or, for the crime's half hour only and never with a companion, they are already known to have been nowhere near the scene. Hard conclusions are always committed before any account is taken;
- confessions: a `SolverRule` with `when` gives up its facts once the person's claim is shown false and their account is held (spec §3, "they give up the secret only when a second, independent fact contradicts them"). The culprit has none.

Propagation commits the shallowest conclusions first. Each struck value records its `Why`: the rule indices it rests on, its `depth`, and `hyp` if it needed a hypothesis. A rule read straight off is depth 1, two rules together depth 2, and a conclusion from a depth-3 conclusion depth 4. When propagation stalls and `probe` is on, the solver tries each value of each open cell at the crime's half hours, propagates, and strikes values that end in a contradiction. That is the hypothesis test.

### The API the engine uses

```ts
import { solveHeld, contradicts, crimeFromHeld, placesAt, whyNot, whyPlaced, culpritOf } from '../gen/index.js';

// The grid the notebook supports, from the clue ids the player holds.
const st = solveHeld(kase, state.found);            // soft accounts in, hypotheses if the tier needs them
placesAt(st, personId, tick);                       // the places still possible
whyNot(st, personId, tick, placeId);                // why a place is out: { rules, depth, hyp } | null

// A confrontation pick: does what is held break the claim? Accounts count where
// something corroborates them (that is how a chain breaks the culprit's word);
// pass { soft: false } to count only what others saw and what was found.
contradicts(kase, state.found, { personId, place: lie.claimed, ticks: lie.ticks });
// → { yes, rules: the clue ids that do it, depth }

// The report: what the notebook settles.
crimeFromHeld(kase, state.found);                   // { ticks, culprit, column: personId -> places }
```

`solveHeld(kase, held, { soft: false })` never takes anybody's word. Use it for anything that must not rest on a lie the player has not yet broken. The solver never uses "lied when confronted" as evidence. A second lie told in a confrontation is not a clue and does not go into the solver.

## 7. Confrontations

`logic.confrontations` has one entry per `LieBlock`. Each has `contradictions`, the independent ways the findable clues break it (each a list of clue ids, a single clue or a chain), and `responses`, what happens on the first and second confrontation that uses a real contradiction:

| who | first | second |
|---|---|---|
| the culprit | `second-lie` (a new claim for the same half hours that something findable already breaks: `contradictedBy`), or `quiet` | the same again, mostly `quiet`. **Never admits.** |
| an innocent with a secret | `second-lie` or `hold` | `admit`: `facts` are where they really were and `secretExplained`, all true; `text` says what the secret was |
| an alibi companion | `hold` or `withdraw` | `withdraw`: where they really were |

Every innocent's lie has at least two independent ways to break it, so a first confrontation can be doubled down on. From Soft-boiled up, every way of breaking the culprit's lies is a chain. The culprit's means lie is always broken by something. A second lie on the first confrontation comes as often from the culprit as from an innocent, within ten points at every tier from Poached up (§12). Confronting without a real contradiction ("That doesn't touch anything I told you.") is the engine's.

## 8. Par and leads

**Par** is the cheapest rule set the solver still solves the case with, walked the oracle's way: one action per question or search, one per move, and a question only once something in hand leads to it (`walkPar`). The par set starts from the rules the full solve's shallowest derivations rest on, adds one clue for each proof leg the tier asks for, and is pruned in halves. It must name the culprit at the tier's depth, pin the half hour, fill the crime column from Medium up, and say nothing false. A confession the route leans on costs two actions, the two confrontations, and the par set then holds two independent ways of breaking that lie. `summary.confessions` names who. The par route is walked from the night's first room, so `gamePar(kase)` is `par + 1` for every tiered case (engine adaptation 1). Ranges are `deduction.par`, below.

**Leads from content** (spec §4):

- the client's clue leads to the scene report, so the scene is marked from page one;
- every question on the par route has a lead from an earlier par clue that names the person asked, the person asked about, or the watcher of a room it names. Same-room is the last resort;
- a search needs no lead;
- each secret branch hangs off a clue that names the one keeping it, and runs head to disqualifier;
- nothing else carries a lead, and no clue leads more than three ways.

The client-to-scene lead is the one lead that can name nobody (a room is not a person). `test/m9-gen.test.ts` measures lead edges sharing a person without it. The Targets table in `scripts/diagnose-play.ts` counts every edge, including this one.

## 9. The client

Tiered cases only. Below Hard-boiled the client points at an innocent: one with a motive where there is one, never the culprit. From Hard-boiled on, the client points at anybody but themselves. When the client is the culprit, the frame still points at an innocent.

Two things are decided once per seed, before any attempt, from the trope's stream: whether the client is the culprit (a quarter of the time, where the shape allows it), and whether an innocent client's pointer lands on the culprit (one in however many others there are). Decided per attempt, turned-down attempts tilted both. A client who is the culprit is one fewer innocent to clear, and a pointer at the culprit makes a cheaper route, so the easier deal won more often than it should. Measured over 200 seeds a level at Hard-boiled, the client is the culprit 25–29% of the time, and the pointer lands on the culprit 8–16% of the time (1/6 is 17%).

## 10. The dials

`CaseShape.deduction` (`DeductionDials`), by tier:

| tier | directClears | lies | companions | anchor-timed | strangers | culprit | hypothesis | pieces | verdicts | par |
|---|---|---|---|---|---|---|---|---|---|---|
| Raw | all | the culprit's crime only | 0 | 0 | 0 | — | no | 0 | yes | 3–6 |
| Coddled | all | the culprit's crime only | 0 | 0 | 0 | — | no | 0 | yes | 4–7 |
| Poached | 1 | + means, secrets | 0 | 0 | 0 | — | no | 0.3 | no | 5–9 |
| Soft-boiled | 1 | as Poached | 0 | 0.5 | 0 | chains, depth ≥3 | no | 0.5 | no | 6–11 |
| Medium | 1 | as Poached | 1 | 0.5 | ⅓ | chains, depth ≥4 | no | 0.6 | no | 8–14 |
| Hard-boiled | 1 | + the culprit's cover | 1–2 | 0.6 | ½ | chains, depth ≥4 | yes | 0.7 | no | 10–22 |
| Over easy | as Hard-boiled | | | | | | | | | 12–28 |

The ladder adds `pieces` (−0.10 Beat, 0 Precinct, +0.10 Homicide, +0.15 DA) to the share of watchers' and strangers' rules dealt away from the crime's half hours, and `extraLies` (0, 0, 1, 1) alibi companions from Poached up. At Hard-boiled at most `innocents − 3` innocents lie about the crime's half hour, so that a truthful pair exists. `verdicts` is the engine's switch (spec, "No automatic verdicts from Poached up").

## 11. The no-options case, and byte-identity

`generateCase(seed, { difficulty })` still takes `run`'s old path. Every new code path is behind `!dials.plain`, and no plain case carries a new field. `test/m7-identity.test.ts` (byte hashes, 200 seeds × difficulties 1–3) and `test/structure-identity.test.ts` pass unchanged; no snapshot was regenerated. Tiered cases changed completely, by design: their structure hash is not snapshotted anywhere.

The page bug "the same noise sentence repeated on one search (seed 21)" is fixed for tiered cases: a room keeps one copy of a trace or disqualifier sentence (`logic/rules.ts`). It remains on the no-options path, where fixing it would break byte-identity for the seeds it touches (difficulty 3 seed 21 is one). The engine can drop a repeated sentence at render if that path still matters.

## 12. Measurements

`npx tsx scripts/diagnose-play.ts --seeds 100 --configs T4L2,T5L2` gives the Targets table: Medium and Hard-boiled at Precinct, 100 seeds. "Before" is `origin/main` at 7f5f3ac, measured with this branch's script and solver copied in. Each cell reads Medium / Hard-boiled.

| measure | before | after | target |
|---|---|---|---|
| innocents cleared by one clue (diagnosis facts / solver) | 100% / 100% · 100% / 100% | 21% / 24% · 15% / 17% | ≤30% |
| inference depth of the par route (diagnosis formula / solver) | 3.1 / 2.0 · 3.7 / 2.0 | 3.1 / 4.4 · 3.6 / 5.0 | ≥4 |
| cases that need a two-clue combination | 8% · 70% | 100% · 100% | 100% |
| false statements among self-accounts on the par route | — · — | 18% · 24% | 20–30% |
| evening accounts on the oracle's route | 0.0 · 0.0 | 0.9 · 2.5 | ≥2 |
| "ask about a person" that can pay (any clue / a grid fact) | 11% / 8% · 4% / 2% | 97% / 62% · 97% / 52% | ≥60% |
| lead edges sharing a person with their source | 30% · 27% | 80% · 78% | ≥80% |
| button-pusher actions with no clue | 71% · 75% | 41% · 42% | ≤40% |
| a player who only follows the marks names the culprit | 96% · 93% | 12% · 15% | ≤50% |
| the client points at the culprit (chance) | 91% · 57% | 0% · 13% (17%) | ≤ 1 / suspects |
| pages with 5 or more open leads (wanderer / lead-follower) | 69% / 70% · 73% / 73% | 1% / 0% · 1% / 0% | ≤10% |
| par routes that need a hypothesis tested | 0% · 0% | 0% · 100% | Hard-boiled: 100% |
| first confrontation brings a second lie (culprit / innocents) | — · — | 72% / 69% · 70% / 72% | within 10 points |

**Short of target:**

- **Medium's route holds 0.9 accounts and 18% false spans.** Medium's par set is the cheapest that solves, and at Medium that is mostly testimony and descriptions. Forcing the culprit's account onto the route got 1.8 accounts but 35% false spans, and doubled generation time, so it was left out. The engine's report asks for the crime column, which a player reads off accounts anyway.
- **Hard-boiled leads share a person 78% of the time.** The mandated client-to-scene lead names nobody and costs about 5 points. Without it the share is 83% at Hard-boiled and 89% at Medium, over 20 seeds (the `test/m9-gen.test.ts` measure).
- **At Hard-boiled, 52% of "ask about a person" pays a grid fact.** The rest pay "only knows the face" or "does not know them", which the stranger dial (½) asks for.
- **Button-pusher actions with no clue are 41–42%, against ≤40%.**

`npx tsx scripts/m9-stats.ts --seeds 100 --levels 2` gives the solver stats (depth is the deepest conclusion on the par route):

| tier | ms/case (max) | attempts | par | depth | culprit depth | hypothesis | cleared by one / case | top rejection |
|---|---|---|---|---|---|---|---|---|
| Raw | 2.9 (23) | 1.2 | 3.5 | 2:69 3:30 5:1 | 2:82 3:17 4:1 | 0% | 1.8 | no culprit (17) |
| Coddled | 2.2 (4) | 1.2 | 4.7 | 3:79 4:18 5+:3 | 2:79 3:18 4+:3 | 0% | 2.8 | no culprit (21) |
| Poached | 3.8 (18) | 1.6 | 7.3 | 3:9 4:57 5:31 6+:3 | 3:61 4:39 | 0% | 1.0 | the culprit's means lie stands (23) |
| Soft-boiled | 10.8 (49) | 8.0 | 9.4 | 4:77 5:18 6+:5 | 3:75 4:23 5:2 | 0% | 0.9 | the culprit's means lie stands (556) |
| Medium | 98.6 (371) | 51.3 | 12.3 | 4:5 5:69 6:17 7+:9 | 4:72 5:20 6+:8 | 0% | 0.8 | the culprit is reached too shallow (2292) |
| Hard-boiled | 147.9 (916) | 75.0 | 18.0 | 5:13 6:31 7:25 8:18 9+:13 | 4:51 5:25 6:12 7+:12 | 100% | 0.7 | no two innocents fit one description in two watched rooms (3449) |

Most turned-down attempts are turned down in the arrangement, before any solving, which is why a Hard-boiled case with 75 attempts still takes 0.15 s. All 800 Hard-boiled seeds at every level (200 × 4) generate.

## 13. What the engine half has to do

The generator side is done; everything below reads it.

1. **Testimony and accounts on the page.** `answersTo` already pays "ask X about Y" from the testimony bucket (topic = Y's surname), and the oracle asks accounts by their exact topic. The pseudo-account from `Schedule.claimed` ("that evening") should become the account clue. Render testimony with `referenceOf`, and the "don't know" and "not the name" answers as short, free-on-repeat pages.
2. **The grid** (`src/game/grid.ts`) builds cells from `personAt`/`personNotAt` only. It needs: margin rows for `personAtAnchor` until the anchor is timed; unlinked `describedAt` entries with the link tap; `absentFrom` as a span strike; `countAt` on a place's column; links for `together`/`apart`/`claims.with`; and the conditional. The rules list should print `clue.rule`.
3. **Confront**: the choice appears when the notebook holds an account and something that `contradicts` it. It opens a picker of held clues, checks the pick with `contradicts`, and renders `responses[n]`. After an `admit` or `withdraw`, add its `facts` to what the solver reads (`solveHeld(..., { confessed })`).
4. **No verdicts from Poached up** (`deduction.verdicts`), the monologue reading pencil marks, the lie rule on the title page and in the help.
5. **The report as the crime column** from Medium up, scored by cell against the truth, with `crimeFromHeld` for what the notebook supports.
6. **Ask buttons**: questions about people through `knowsByName`/`referenceOf`; a stranger shows by description until linked.

## 14. Known limits

- Soft accounts are defaults. On a partial notebook the solver can take a lie for the truth when the facts that break it are not held yet (`soft: false` never does). Accepted cases are checked against the truth over the whole findable set and over the par set.
- The "cleared by one clue" measure counts a description that fits one suspect as one clue, because linking is free. The diagnosis's own measure (placements only) is printed beside it.
- The rule lines are plain but terse by design: the notebook states, the page tells.
