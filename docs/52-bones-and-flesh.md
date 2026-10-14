# Build: bones and flesh

*2026-10-15. The designer: "Perhaps we are having the cards do too much and we need to separate the plain English facts of what happened, on one hand, and the era-specific noir voice on the other. … every card would need two joined layers: the simple bones and the associated flesh that accompanies it. But we'd join the bones before we sutured the flesh." Agreed, and it's the classical separation: propositions → composition → plain realization → style. Today the planner (docs/49) joins prose, so joins are few and uniform and seams show. This build moves the planner down a level, onto propositions.*

## 1. Bones: propositions

Every fact unit becomes a typed proposition. The engine already knows these (the skeleton's `about`, `hour`, `place`, `relation`, `carries`); this makes them explicit and complete. The set, to be confirmed against what the engine emits:

| proposition | arguments |
|---|---|
| CLAIM | person, place, hour, company[] |
| LIST | watcher, place, hour, people[], nobodyElse |
| FIND | item, what it shows (means + origin + delay; motive[]; clock; handover) |
| ACCESS | person, had / hadn't, means |
| WINDOW | hours[] |
| ALIVE | victim, place, hour (last seen) |
| CONFIRMS | claim, by (a LIST or another CLAIM) |
| COLLIDES | claim, with (a LIST, CLAIM or REMARK) |
| NARROWS | to hour (said at Raw only, per docs/46) |
| REMARK | person, saw whom, where, hour |
| ADMIT | person, place, hour, names witness |
| REFUSE / SECOND-STORY / CRACK | person (+ new claim / + where the thing is) |
| MOTIVE | person, reason |
| POINTER | from (office, list, claim, remark), to (person or place) |
| HANDOVER | thing, to, place, hour |

A page's bones are a list of these, in the planner's order. Gaps (texture) have no bones.

## 2. Joining the bones: composition on propositions

The planner's four operations (aggregation, reference, connectives, rhythm) run on propositions, not sentences. Composition produces **composites**, a closed set of shapes, roughly:

- CONFIRMED-WITH: a CLAIM confirmed by a LIST, plus the others that list places at that hour;
- LIST-HOUR: a watcher's hour with its people and "nobody else";
- UNSPOKEN: the people nobody has placed at the hour;
- ACCESS-SET: who had the means, with the exception last;
- WINDOW-ALIVE: the window plus the last sighting (plus NARROWS at Raw);
- COLLISION-PAIR: the claim and the line that breaks it;
- ADMIT-CHECK: the admission and the witness's confirmation;
- CLAIM-SPAN: one place across hours;
- MOTIVE-SET: the papers' reasons;
- HANDOVER: the thing's last move.

Rules from docs/49 carry over: never across the crime hour; a collision keeps its own composite; one "so" chain and one "but" a page; docs/46's levels decide which composites may be said at which tier.

## 3. Plain realization

A small grammar renders a composite to plain English: lists ("A, B and C"), agreement, tense, the planner's reference logic for names and pronouns, and connectives from the relations. The output is the **plain page**: every fact, no voice. `npm run read -- --plain` prints it; the book gets a `?plain=1` view (and later, perhaps, a "just the facts" setting).

**Round trip:** the plain page must parse back to the same propositions. `scripts/roundtrip.ts` checks every page of 30 nights a tier, both worlds: 100%.

## 4. Flesh: voicings and textures

- **Voicings** are flesh for a bone: `content/board/voicings.json`, each `{ shape, manner?, tierBand?, template, requires?, forbids? }`, where `template` is the composite rendered in the voice with `{args}` filled by the realizer ("She had {a} here at {hour}, same as {a:they} said, and {b} with {a:them}, who'd never been near {origin} while {means} sat on it."). Several per shape; chosen by manner, tier, rhythm and least-recently-used; the plain rendering is the fallback. A voicing may reorder or fold the composite's arguments but may not drop or add a fact: the round trip is run on the voiced page too.
- **Textures** are flesh with no bone: the situated deck (docs/51), unchanged, attached after voicing.

Realization order: bones → compose → plain → voicing → textures → the reference and rhythm pass.

## 5. Two builds

- **Build 1 (code):** propositions emitted for every fact unit; composition on propositions with the shapes above; the plain realizer and `--plain`; the round trip; the planner's operations moved onto propositions; a **minimal voicing set** that reproduces today's phrasings (one voicing per shape per manner, taken from the current planner's output), so the voiced page is no worse than planner-2's. Dealt boards unchanged; all lints 0; `board-prose` before → after.
- **Build 2 (content):** the full voicing set, three to six per shape and manner, written against the goldens, in batches with the lead reading 10%; variety measured (no voicing twice a night where three exist); the blind side-by-side read, build 2 vs. planner-2, target ≥ 60% preferred.

## 6. Measures

- round trip 100% on plain and voiced pages;
- dealt boards hash unchanged; puzzle columns unchanged;
- all prose lints 0; joins per page 1–3 below Hard-boiled; list smell ≤ 10%;
- voicing variety; words a page 170–260;
- the blind read (build 2).

## Done means

A Built section per build, leftovers in docs/25, a PR per build, not merged.
