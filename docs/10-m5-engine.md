# Milestone 5 — Phase 2: The Engine Renders the World

Phase 1 (`docs/09-m5-world.md`, merged) built dossiers, the act, case types, givens and unknowns, the client brief, and a derived briefing. Phase 2 puts them on the page and in the notebook, and gives the prose a plain register to stand on.

Read `docs/09-m5-gen-notes.md` first: it lists what Phase 1 left for this phase.

## 1. The plain register

`src/game/voice/plain.ts`. Declarative sentence shapes with **no image**: subject, verb, fact. Three jobs:

- **Dossier facts** as sentences, by layer and fact kind, using the generator's `DossierFact.text` where it exists and small shapes where it does not ("Grasso is a longshoreman." "He is in his forties.").
- **Connective tissue**: going somewhere, arriving, someone being present, someone leaving, time passing without incident. Ten to fifteen shapes each, allowed to repeat, never carrying a motif.
- **Reported fact**: when an utterance card is missing or the fact kind is a robbery or missing-person variant the utterance deck does not know, render the fact plainly in Dashiell's voice rather than falling back to the flat clue text.

**Measurement.** A sentence is *plain* if it came from `plain.ts`, from a dossier fact, from a given, or from the generator's own clue/briefing text. It is *image* if it came from a deck card (similes, portraits, business, arrivals, transitions, ambient, asides, places, entrances, office, colour beats). Target: **at least 55% plain sentences per page**, measured over 100 oracle runs and 40 wandering runs, asserted as a floor of 0.5 with the measured number printed. The page assembler enforces it by dropping image blocks (lowest score first) until the ratio holds, never dropping the exchange or a find.

## 2. The briefing page

Page one keeps the office card and the entrance, then renders `case.briefing` **in place of** the hiring frame's `{fact}`: the client's sentences as speech where they are the client's (what happened, their tie, why they are hiring, the pointer), Dashiell's as narration where they are his (who came in, what he saw). Split the sixteen sentences that way with a small rule set; Dashiell's `{retainer}` line closes it. Two free questions to the client remain. The `familiar` register still applies when the roll says Dashiell knows the client, and the briefing's first sentence is replaced by the entrance card in that case.

## 3. `ask X about themselves`

A pseudo-clue like "that evening": always available, costs one action, delivers the person's layer-1 self-account as an exchange in their temper (enigma: two sentences; yap: all of it plus a layer-2 fact about someone *else*). Records the dossier facts in the notebook. Asking twice is free and says they've told you.

Layer-2 facts about a person ride along with observation and overheard clues about them, as Phase 1 attached them, and are rendered as a plain sentence after the fact. Layer-3 facts come from document clues as before.

## 4. Notebook: People as dossiers

Each person's entry shows what has been learned, by layer, in plain sentences: on sight (gender, age, profession if visible) as soon as they are met; volunteered after "about themselves"; from others as it comes; documents when found. Then the alibi facts and contradictions as now. The victim gets an entry with standing and discovery from the briefing. Mentions (third parties) appear under the person whose tie names them, in italics, never as interviewable people.

## 5. The report asks the unknowns

The report form shows exactly `case.act.unknowns`, each as a dropdown of the case's actual options:

- `who`: suspects. `why`: motive types. `when`: ticks. `where`: places. `how`: methods. `entry`: entry methods. `whereabouts`: places plus "gone". `fate`: left / taken / dead. `goods`: places.

Scoring is one point per unknown. Par comparison unchanged. **Endings by type and trope**: the endings deck gains `caseType` and `trope` tags; until content lands, the engine has one hand-written closing paragraph per (type, outcome) in code, first person, logged as a gap. The wrong-man ending's `{missed}` names the unknown that was wrong.

## 6. Body moved: start where the body was found

For `body-moved`, the run starts at `act.bodyFoundAt`, and the scene report there says what was found and that the room does not agree with it (the trope's signature clue). The true scene is a place the player must reach. Par: Phase 1 computed par from the true scene; if the game's par differs because of the start, add the travel and keep the oracle honest (`par` in the game is whatever the oracle needs from the actual start). Report and document the difference.

## 7. Robbery and missing on the page

- Robbery: no morgue clue; the "scene" free clue is the place the goods were taken from, plus the given about entry. "The victim" is alive and interviewable; the engine must never call them dead. `victimAliveAt`/`victimDeadBy` facts render as "still had it at" / "it was gone by" via the plain register.
- Missing: the "scene" is where they were last seen. The person is not interviewable (they are gone) until found; `whereabouts` is established by sightings after the tick. The closing page for `left` is not a hanging.

## 8. Tests

- Plain ratio ≥ 0.5 on every page over 100 oracle + 40 wandering runs, at every difficulty; print the mean.
- Briefing page contains every sentence of `case.briefing` (as speech or narration) and the retainer.
- `about themselves` delivers layer 1, costs one action once, free after; yap adds a layer-2 fact about someone else.
- Notebook shows dossier facts by layer as they are learned; never shows a layer not yet learned.
- Report fields equal `case.act.unknowns`; scoring counts only those; endings chosen by (type, outcome).
- `body-moved` starts at `bodyFoundAt`; oracle solves within the game's par at every difficulty for all eight tropes (run seeds forced by `--trope`).
- Robbery pages never say the owner is dead; missing pages never interview the missing person before they are found.
- Correspondence checker runs over every rendered page in 40 oracle runs: zero violations (the engine must not introduce names or times the model lacks).
- All existing tests green.

## Deliverables

Branch `m5-engine`, not pushed. `docs/10-m5-engine-notes.md` with the plain ratio before and after, and the par differences for `body-moved`. `npm run read` shows the new opening and works for `--type` and `--trope`.

## Out of scope

Deck content for endings by trope, utterances for robbery/missing fact kinds (the plain register covers them), rebalancing client purposes (generator data), complexity tiers (M6).
