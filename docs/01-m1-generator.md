# Milestone 1 — Case Generator and Truth Sheet

## Goal

A deterministic, seeded generator that produces a complete murder case: the truth, everyone's real evening, everyone's claimed alibi, and the clues the player could find. Plus a human-readable **truth sheet** so a designer can read twenty cases and judge whether they'd want to interrogate anyone.

No UI. No prose. No game loop. This milestone is a library and a CLI.

## Stack

- TypeScript, strict mode. Node 20+.
- Zero runtime dependencies. Own seeded PRNG (mulberry32 or xoshiro; must be deterministic across platforms).
- Dev deps only: `typescript`, `tsx` (run scripts), `vitest` (tests).
- Layout:
  ```
  src/gen/        pure generation library, no I/O, no console
  src/gen/data/   content pools as plain TS/JSON (names, roles, secrets, methods, settings)
  src/sheet/      truth sheet renderer (case -> string)
  src/cli/        CLI entry points
  test/           vitest
  out/            gitignored generated output
  docs/samples/   committed sample truth sheets for review
  ```
- Scripts:
  - `npm run case -- --seed 42` prints a truth sheet to stdout.
  - `npm run case -- --seed 42 --json` prints the case as JSON.
  - `npm run batch -- --count 20 --out docs/samples` writes `case-<seed>.md` and `case-<seed>.json` for seeds 1..count.
  - `npm test`.

## Time

The **crime window** is one evening: 12 ticks of 30 minutes, 6:00 PM to 11:30 PM (tick 0 = 6:00, tick 11 = 11:30). The murder occurs in exactly one tick, never tick 0 or tick 11. The investigation (M2) happens the following day and is out of scope here, but the case must record enough for it.

## Setting

One setting type for M1: a **residential hotel** in Manhattan (invent a name per case from a pool). Eight locations forming an adjacency graph. Each location has: `id`, `name`, `adjacent[]`, `isPublic` (many people pass through), `noiseCarriesTo[]` (where a gunshot or shout at this location would be heard), and `objects[]` drawn from a pool (things that can go missing or bear traces).

A reasonable default graph: Lobby, Front Desk, Bar, Kitchen, Service Stairs, Victim's Suite, Roof Garden, Street. Vary object placement and a few adjacencies per case so the map is not identical every run, but keep it small.

Environment facts, each present with some probability, each generating clues:
- **Rain** starting at tick R. Anyone on the Street at tick ≥ R has a wet coat.
- **Elevator out of order** between ticks E1–E2. Anyone moving between floors then used the Service Stairs.
- **Radio broadcast** (a fight, a serial) at tick B in the Bar. A person claiming to have been in the Bar at B can be quizzed on it; only those truly present know the outcome.

## People

- **Victim**: one. Has a role (hotel owner, bootlegger, heiress, etc.) and relationships to each suspect.
- **Suspects**: six. Each has `name`, `role`, `relationshipToVictim`, `secret`, `motive` (may be `null`), `isKiller`.
- **Fixtures**: two. The Doorman (Street/Lobby) and the Bartender (Bar). Never the killer. Mostly stationary. Truthful observers with strong sightlines. They exist to be clue sources.

Names from a period-appropriate pool (1900s–1930s New York: Irish, Italian, Jewish, German, Black, WASP). Avoid anything that reads as caricature. Roles and relationships from pools in `src/gen/data/`.

### Secrets

Every suspect has exactly one secret from a pool. Each secret defines a **secret activity**: a set of (tick, location) cells the person will lie about, and optionally a partner. Starter pool (extend freely, keep each one shaped like the others):

| Secret | Activity | Lies about | Partner |
|---|---|---|---|
| Affair | Meets partner in a private location for 2–3 ticks | Those ticks | Another suspect |
| Embezzling | Rifles papers in Victim's Suite for 1–2 ticks while victim is elsewhere | Those ticks | none |
| Gambling debt | Slips to Street to meet a bookie for 1–2 ticks | Those ticks | none |
| Fence | Hands off stolen goods in Kitchen or Service Stairs | 1 tick | none |
| Blackmail | Meets victim privately to make a demand | 1–2 ticks | Victim |
| Drinking in secret | In the Bar when claimed to be elsewhere | 2 ticks | none |
| Forged identity | No activity; lies about background not location. Generates document clues instead | — | none |

The killer's secret is **murder**, which replaces their pool secret. The murder activity is: alone with the victim at the murder location at the murder tick. The killer may additionally have a pool secret with probability 0.5 (which gives them two things to lie about and muddies the water).

### Motive

The killer always has a motive from the pool (inheritance, jealousy, silence a witness, debt owed to the victim, revenge for a ruin, the victim was about to expose them). At least one and at most three **innocent** suspects also have a motive. Motive must never identify the killer alone.

### Method

From a pool. Each method has: `name`, `requiresLocation[]` (where it can happen), `noise` (0–2), `evidenceObjects[]` (an object from some location goes missing or is disturbed), `bodyEvidence` (what the morgue reports), `accessRequirement` (e.g. poison requires the killer to have passed through Kitchen or Bar earlier in the evening). Starter pool: poison in a drink, blunt object, pushed from the Roof Garden, strangled with a cord, shot (loud; must be somewhere `noiseCarriesTo` is small or masked by the radio).

## Generation algorithm

1. Choose setting variant, environment facts, victim, six suspects, two fixtures.
2. Choose killer, method, motive. Assign secrets and innocent motives.
3. Choose murder tick M (1–10) and murder location L consistent with the method.
4. **Simulate schedules.** For each person, a location per tick. Movement is between adjacent locations, with people tending to dwell 1–3 ticks. Constraints, applied as hard requirements:
   - Victim is at L at tick M. Victim has no location after M (dead). Body remains at L.
   - Killer is at L at tick M. No one else is at L at tick M.
   - Killer satisfies the method's `accessRequirement` before M.
   - Each secret activity occurs at its cells with its partner present if any.
   - Fixtures are at their posts most ticks, with 1–2 excursions.
   - Victim's Suite is not public; only the victim, the killer, and secret activities put anyone there.
   Use rejection sampling or constraint-first placement then fill; either is fine, but the result must satisfy every constraint or the case is discarded.
5. **Derive claims.** For each suspect and each tick, `claimed = truth` unless the tick is in their lie set (secret activity cells, or the murder cell for the killer). For lied-about ticks, the claim is a plausible false location: somewhere adjacent to or public near the truth, never the actual murder location, optionally naming a companion who was not actually with them ("I was in the bar with Dolores"). Fixtures always tell the truth.
6. **Derive observations.** For each tick, each person observes everyone in the same location and anyone in a location listed in that location's sightlines. Observations are truthful facts: `(observer, subject, location, tick)`. A person **withholds** observations that would place themselves in a lied-about cell (they can't say they saw you in the kitchen if they claim they weren't in the kitchen). Fixtures withhold nothing.
7. **Derive physical clues** from method, environment, and movement: missing or disturbed objects, wet coats, stair use during elevator outage, noise heard at (location, tick), radio-knowledge tests, documents for the forged-identity secret, morgue report (time of death as a 2-tick range containing M; method evidence).
8. **Derive motive clues**: two independent sources per motive (a letter in a room, something a fixture overheard, something a suspect volunteers about another).
9. **Solvability check** (below). If it fails, discard and retry from step 3 with the same cast, up to N attempts, then from step 1. Record `attempts` in the case for diagnostics.

## Solvability

Let M be the murder tick. The **solution** is `{killerId, methodId, motiveId, murderTick, murderLocationId}`.

A case is solvable if all hold:

1. **Time of death** is establishable: the morgue range plus at least one clue (noise, last confirmed sighting of the victim alive, the body's discovery) narrows the tick to exactly M. Two independent routes.
2. **Each innocent suspect** is exculpable at tick M: at least two independent clues (observations by different people, or a physical clue) place them somewhere other than L at M. Note that an innocent who *lied* about M is still exculpable via others' observations; that is the point.
3. **The killer** is inculpable: their claim for tick M is contradicted by at least two independent clues, AND at least one clue ties them to the method's access requirement or evidence object.
4. **Method** is establishable from at least two physical clues.
5. **Motive** is establishable from at least two clues.

"Independent" means different source people or different physical locations. A clue withheld by a liar does not count.

Also enforce these **interestingness** heuristics, or reject:

- At least two innocent suspects lie about tick M (they were doing their own secret thing).
- At least one innocent suspect has a motive.
- No suspect's claimed alibi is fully corroborated by observations *and* has no motive *and* has no secret (a suspect with nothing going on is dead weight).
- The killer is not the only person with access to the method.

## Data model

Export these from `src/gen/types.ts`. Everything must be JSON-serializable.

```ts
type Tick = number; // 0..11
type Id = string;

interface Location { id: Id; name: string; adjacent: Id[]; sightlines: Id[]; noiseCarriesTo: Id[]; isPublic: boolean; objects: Id[]; }
interface GameObject { id: Id; name: string; homeLocation: Id; }
interface Person { id: Id; name: string; role: string; kind: 'victim' | 'suspect' | 'fixture'; relationshipToVictim?: string; secret?: Secret; motive?: Motive; isKiller: boolean; }
interface Secret { type: string; description: string; cells: { tick: Tick; location: Id }[]; partnerId?: Id; }
interface Motive { type: string; description: string; }
interface Method { id: Id; name: string; noise: 0 | 1 | 2; evidenceObjectId?: Id; bodyEvidence: string; accessRequirement?: { location: Id; beforeTick: Tick }; }
interface Environment { rainStartsAt?: Tick; elevatorOut?: [Tick, Tick]; radioBroadcastAt?: Tick; radioContent?: string; }
interface Schedule { personId: Id; truth: (Id | null)[]; claimed: (Id | null)[]; claimedCompanion: (Id | null)[]; lies: Tick[]; }
interface Observation { observerId: Id; subjectId: Id; location: Id; tick: Tick; withheld: boolean; }
interface Clue { id: Id; kind: 'observation' | 'physical' | 'morgue' | 'document' | 'overheard' | 'environment' | 'radio'; source: { type: 'person'; personId: Id; topic: string } | { type: 'location'; locationId: Id }; establishes: Fact[]; text: string; }
type Fact =
  | { kind: 'personAt'; personId: Id; location: Id; tick: Tick }
  | { kind: 'personNotAt'; personId: Id; location: Id; tick: Tick }
  | { kind: 'objectMissing'; objectId: Id; fromLocation: Id }
  | { kind: 'noiseAt'; location: Id; tick: Tick }
  | { kind: 'timeOfDeath'; ticks: Tick[] }
  | { kind: 'hasMotive'; personId: Id; motiveType: string }
  | { kind: 'hadAccess'; personId: Id; methodId: Id }
  | { kind: 'victimAliveAt'; tick: Tick };
interface Solution { killerId: Id; methodId: Id; motiveType: string; murderTick: Tick; murderLocationId: Id; }
interface DeductionPath { timeOfDeath: Id[]; exculpations: Record<Id, Id[]>; inculpation: Id[]; method: Id[]; motive: Id[]; } // clue ids
interface Case { seed: number; attempts: number; detectiveName: string; hotelName: string; locations: Location[]; objects: GameObject[]; people: Person[]; environment: Environment; schedules: Schedule[]; observations: Observation[]; clues: Clue[]; solution: Solution; deduction: DeductionPath; }
```

`detectiveName` defaults to `"Humphrey"`. `generateCase(seed: number, opts?: { detectiveName?: string }): Case` is the single public entry point.

`text` on a Clue is plain, flat, factual English for now ("The doorman says he saw Mrs. Kessler come in off the street at about half past nine, coat soaked."). No voice. That's M2's job.

## Truth sheet

`renderTruthSheet(c: Case): string` produces Markdown. Sections, in order:

1. **Header**: hotel name, seed, attempts, detective name.
2. **The Truth**: one paragraph. Who killed whom, how, why, when, where.
3. **Dramatis Personae**: table. Name, role, relationship, secret (type), motive (or —), killer flag.
4. **Map**: locations with adjacencies and objects, one line each. Environment facts.
5. **Timelines**: one table per person. Rows are ticks with clock times. Columns: truth, claimed, companion claimed. Mark lies with `**bold**` and the murder cell with `☠`. Fixtures get a single compact table.
6. **Secrets in play**: each suspect's secret activity spelled out in one sentence.
7. **Clue list**: every clue, grouped by source (per person by topic, then per location). Show what fact it establishes and whether the player could get it (withheld observations are listed separately, struck through).
8. **Deduction path**: the solvability proof in plain English, step by step, citing clue ids.
9. **Red herrings**: which innocents lie about the murder tick and why; which innocents have motives.

The sheet is for a designer, not a player. Clarity over polish.

## Tests (vitest)

- Same seed → byte-identical JSON. Different seeds → different cases.
- Killer and victim alone at (L, M). Victim `null` after M.
- Every `claimed[t] !== truth[t]` is in `lies`, and every tick in `lies` is a secret cell or the murder cell.
- Fixtures never lie, never withhold.
- Withheld observations are exactly those whose location/tick is in the observer's lie set.
- Every accepted case passes the solvability check and all interestingness heuristics (run over seeds 1..200).
- Over seeds 1..200: killer index is spread across all six positions; at least 4 methods appear; at least 5 secret types appear.
- In no case does the killer have a motive while every innocent lacks one.
- Regeneration attempts over seeds 1..200: median ≤ 20, max ≤ 500. If the generator is rejecting far more than that, the constraints are fighting and the algorithm needs to be constraint-first rather than rejection-based.

## Deliverables

1. The library, CLI, tests, all passing.
2. `docs/samples/` with 20 truth sheets and their JSON (seeds 1–20).
3. `docs/01-m1-notes.md`: half a page. What was hard, what constraints fought, which heuristics fired most, what you'd change. Honest.

## Out of scope

Prose voice, UI, investigation-day clock, reputation, save/load, multiple setting types.
