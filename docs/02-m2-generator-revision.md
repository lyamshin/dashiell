# Milestone 2 — Generator Revision: Neighborhood, Anchors, Clue Budget

Builds on the M1 generator (`docs/01-m1-generator.md`, merged). Where this document contradicts M1, this document wins. Everything not mentioned here stays as M1 built it (PRNG, determinism, purity of `src/gen/`, test discipline, truth sheet as Markdown, CLIs).

## Why

Reading twenty M1 sheets taught us four things (see `docs/01-m1-notes.md`):

1. The literal building map forces repetition. The killer always claims the Lobby or Bar; the Roof Garden is the scene 56% of the time.
2. Time of death is established identically every case.
3. Role and relationship pools are uncoupled and produce nonsense pairings.
4. A case emits ~170 clues. A player can absorb ~25. **The challenge must be the budget, not the puzzle.**

## Design principles for this revision

- **The challenge is the night, not the logic.** The puzzle is fair and, given unlimited time, straightforward. The player's clock is what makes it hard.
- **Three dials:** slack (par vs. budget), noise ratio, and dead-end depth.
- **Noise is never filler.** Every irrelevant clue is a true fact about someone's secret. Noise must be *disqualifiable*: it looks essential until one fact knocks it down.
- **Places are a deck, not a floor plan.** Adjacency is gone. What matters is whether a place is watched, and by whom.
- **Time is pinned by anchors, not the coroner.**

## 1. Scale and time

The setting is a **neighborhood**: a few blocks of Manhattan, named per case (pool of neighborhood names and flavor: the Tenderloin, Hell's Kitchen, Yorkville, the Lower East Side, Chelsea, Harlem, the Bowery, Gramercy). Twelve 30-minute ticks, 6:00 PM to 11:30 PM, unchanged.

There is **no adjacency graph**. Any person may be at any place at any tick. Moving between places between ticks is free for simulated characters. Dwell tendencies (1–3 ticks) remain.

## 2. Places as a deck

`src/gen/data/places.ts`: a pool of **at least 24 place templates**. Each:

```ts
interface PlaceTemplate {
  id: Id;
  name: string;                 // "the Automat on the corner", "Dolan's Bar", "the third-floor walk-up"
  kind: 'private' | 'semi' | 'public';
  watcher?: FixtureRole;        // who is posted here and sees everyone. undefined = unwatched
  murderMethods: Id[];          // methods that can happen here (may be empty = never a scene)
  objects: Id[];                // candidate evidence objects
  secretsHosted: string[];      // which secret activities can take place here
  anchorsHosted: string[];      // which anchors can attach here
}
type FixtureRole = 'bartender' | 'doorman' | 'newsstand' | 'counterman' | 'ticket-taker' | 'elevator-man' | 'landlady' | 'beat-cop' | 'cabbie' | 'druggist';
```

Examples to include: a bar (bartender), a residential hotel lobby (doorman), a newsstand on the corner (newsstand), an Automat (counterman), a movie house (ticket-taker), a tenement stairwell (landlady on the ground floor, hears but sees only the stairs), a drugstore with a soda fountain (druggist), a cab stand (cabbie), the victim's apartment (private), a rooftop (private), a back alley (private), an office above a shop (private), a church (semi, unwatched), the El platform (public, unwatched), a pool hall, a barber shop, a Chinese restaurant, a boarding house parlor, a garage, a pier.

Each case **draws six places**: at least two `private`, at least three with a `watcher`, at least one `public` unwatched. The victim's residence is always one of the private places. The **beat cop** is special: if drawn, he is not attached to a place but walks a route across the public and semi places on a fixed cycle (every 3 ticks), and is both a fixture and an anchor.

Fixtures are the watchers of the drawn places (typically three or four). Each is stationary with at most one 1-tick excursion. Fixtures never lie and never withhold, as before.

Murder place distribution over 200 seeds: no single template is the scene more than 25% of the time.

## 3. Timeline anchors

`src/gen/data/anchors.ts`: a pool of **at least 14 anchors**. An anchor is an event with a known time that leaves a trace on whoever was near it.

```ts
interface AnchorTemplate {
  id: Id;
  name: string;
  attachesTo: 'place' | 'neighborhood';   // a specific drawn place, or everywhere
  placeKinds?: PlaceTemplate['kind'][];   // if place-attached
  ticks: 'single' | 'recurring';          // one tick, or every N ticks
  traces: AnchorTrace[];
}
type AnchorTrace =
  | { kind: 'knowledge'; description: string }   // only those present know X (fight result, what song played)
  | { kind: 'sighting' }                          // a reliable person notes who was present at exactly this tick
  | { kind: 'mark'; description: string }        // physical trace on those present (wet coat, plaster dust, ink)
  | { kind: 'sound'; description: string };      // something started or stopped; those nearby can place events relative to it
```

Seed the pool with: the fight broadcast on the bar radio; the regular who takes the same stool at the same time every night; the beat cop's pass; the piano lesson upstairs that ends at ten; the El train timetable; church bells; the last edition hitting the newsstand; a fuse blowing in the building; rain starting; the milk wagon; the theater letting out; a shift change at a garage; a drunk singing under a window until someone throws a shoe; the dumbwaiter squeal.

Each case **draws two or three anchors**. The **coroner's window is now four ticks** (two hours) containing M. Time of death must be pinned to exactly M through anchors and sightings, by two independent routes. If the drawn anchors cannot do this, redraw anchors (not the whole case).

Over 200 seeds, at least 10 distinct anchors must appear, and the pair of anchors used to pin time of death must not be identical in more than 20% of cases.

## 4. Cast compatibility

Replace the uncoupled pools with **archetypes** in `src/gen/data/cast.ts`:

```ts
interface Archetype {
  id: Id;
  role: string;                       // "a chambermaid"
  genderHint?: 'm' | 'f' | 'any';
  relationships: Id[];                // allowed relationship ids to the victim
  motives: Id[];                      // allowed motive ids
  secrets: Id[];                      // allowed secret ids
  class: 'money' | 'working' | 'underworld' | 'professional';
}
interface VictimArchetype { id: Id; role: string; genderHint?: ...; allowedSuspects: Id[]; }
interface Relationship { id: Id; text: string; impliesMotives?: Id[]; }
```

At least 8 victim archetypes and 20 suspect archetypes. Every drawn suspect's role, relationship, motive, and secret must be mutually allowed. No two suspects share a role. The cast should mix classes: at least one `money`, one `working`, one `underworld` per case.

The chambermaid is not the landlord. The bookkeeper can embezzle; the seamstress cannot. The heir can inherit; the cabbie cannot.

## 5. The clue graph and the budget

This is the heart of the revision. Simulation stays as M1 built it (schedules, claims, observations, physical traces). What changes is that **clues are selected, not dumped.**

### 5.1 Facts and candidate clues

After simulation, derive the full candidate pool as M1 does (observations, denials, physical, documents, anchors, morgue). This pool is the *truth* and stays in `Case` as `candidates`. It is what the report is graded against. It is **not** what the player can find.

### 5.2 The essential fact set

The facts the player must establish, as in M1's solvability section, but with the four-tick coroner window:

- time of death = M (two routes)
- each innocent not at the scene at M (two routes each)
- killer's claim at M contradicted (two routes) plus one access/evidence link
- method (two routes)
- motive (two routes)

### 5.3 Selection

Build `findable: Clue[]` of **exactly 30 clues (±2)**:

1. **Spine.** Choose a minimum set of candidate clues that covers every essential fact at least once. A single clue may cover several facts (a bartender saying who was in the bar at 10:30 clears three people). Use greedy set cover; exact is unnecessary. **Spine size must be ≤ 12** or the case is rejected.
2. **Corroboration.** Add clues until every essential fact has two independent routes. Target 6–8.
3. **Noise.** Fill to 30 with clues about **innocents' secrets** that do not touch the solution. Each noise clue belongs to a **branch** (below). Roughly 40% of findable clues should be noise. No noise clue may be a random observation; every one must derive from a secret activity.

### 5.4 Leads and branches

Every findable clue gets `leadsTo: Id[]`, other findable clues it points at ("the bartender mentions a redhead" points at the redhead's interview topic). The graph must be **connected from the starting set**: the scene, the morgue, and the client's statement (three clues always in the spine and always available at the start).

Noise is organized as **branches**: chains of 1–3 noise clues hanging off a spine clue, terminating in a **disqualifier**: a clue that explains the secret and shows it has nothing to do with the murder. Branch depth is the difficulty dial:

| difficulty | branch depth | liars at M | budget (actions) |
|---|---|---|---|
| 1 | 1 | 2 | 22 |
| 2 | 1–2 | 2–3 | 20 |
| 3 | 2–3 | 3 | 18 |

`generateCase(seed, { difficulty?: 1|2|3 })`, default 2.

### 5.5 Actions, par, and budget

An **action** is one of: fetch one clue (ask a person about a topic, examine a place), or travel to a different place. Interviewing a person happens where they are. Each findable clue has a `place: Id` where it is obtained.

**Par** = the minimum number of actions to obtain the whole spine, following leads, starting at the scene. Compute it (the graph is small; BFS over states is fine, or a good heuristic with a comment saying so). Record `par` and `budget` on the case. Reject if `par > budget − 6` (there must be at least six actions of slack).

### 5.6 Data model additions

```ts
interface Clue { ...M1 fields...; place: Id; leadsTo: Id[]; role: 'spine' | 'corroboration' | 'noise' | 'disqualifier'; branchId?: Id; }
interface Anchor { templateId: Id; placeId?: Id; ticks: Tick[]; traces: AnchorTrace[]; }
interface Case {
  ...M1 fields...;
  neighborhood: string;
  places: Place[];                // replaces locations
  anchors: Anchor[];
  candidates: Clue[];             // full pool, the truth
  findable: Clue[];               // exactly what the player can get
  starting: Id[];                 // the three opening clues
  par: number;
  budget: number;
  difficulty: 1 | 2 | 3;
  coronerWindow: [Tick, Tick];
}
```

Remove `locations`, `adjacent`, `sightlines`, `noiseCarriesTo`. Noise from a loud method becomes an anchor-style `sound` trace on the place at tick M, audible to anyone in the same place or a `semi` place drawn as "nearby" (pick two places per case to be nearby the scene).

## 6. Truth sheet changes

Keep the M1 sections but:

- **Header** adds neighborhood, difficulty, par, budget, findable count, noise ratio.
- **Map** becomes **Places**: six lines, kind, watcher, objects.
- New **Anchors** section: each anchor, when, where, what it lets you establish.
- **Clue list** shows only the 30 findable clues, grouped by place, each with its role, its `leadsTo`, and its branch if any. The full candidate pool goes to a separate `case-N.candidates.md` in the batch output, not the main sheet.
- New **Clue graph** section: a Mermaid `graph LR` of the findable clues. Spine nodes bold, noise nodes dashed, disqualifiers marked. Keep it readable: cluster by place.
- **Deduction path** cites spine clue ids only and states par.

A designer should be able to look at the graph and see the shape of the case the way you'd look at a hand of cards.

## 7. Tests

All M1 tests that still apply, updated for the new model, plus over seeds 1..200:

- `findable.length` in 28..32; spine ≤ 12; every essential fact has two routes among findable clues.
- Every noise clue derives from an innocent's secret. Every branch terminates in a disqualifier.
- Graph connected from `starting`. Par ≤ budget − 6.
- Six places per case satisfying the kind constraints. Murder place ≤ 25% any template. At least 12 distinct place templates appear.
- At least 10 distinct anchors appear; time-of-death anchor pair identical in ≤ 20% of cases.
- Every suspect's role/relationship/motive/secret is mutually allowed by the archetype table. No duplicate roles.
- Killer's false claim place is not the same template in more than 40% of cases.
- Regeneration attempts: median ≤ 10, max ≤ 300.
- Deterministic by seed and difficulty.

## 8. Deliverables

1. Library, CLI, tests passing. `npm run batch -- --count 20 --out docs/samples` regenerates samples (overwrite the M1 ones; they served their purpose).
2. `docs/02-m2-notes.md`: half a page, same honesty as M1's. Include a table of spine size, par, and noise ratio distributions over 200 seeds.
3. Branch `m2-generator`, not pushed.

## Out of scope

Prose voice, UI, investigation-day simulation, reputation, save/load. The action model here exists to compute par; the playable clock is M3.
