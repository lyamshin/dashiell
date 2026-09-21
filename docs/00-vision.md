# Humphrey — Vision

A noir murder mystery roguelike presented as a bound book. Early 20th century New York. Text input with clickable nouns. One case per run, 30–45 minutes, replayable indefinitely.

**Touchstones:** *Return of the Obra Dinn* (the report as the ending), *Kingdom of Loathing* (time as the run resource; templated prose with a real voice), *Deadline* (characters on schedules, a clock that runs), *The Maltese Falcon* (everyone lies, the client might be the killer).

## Principles

1. **Generate the truth, derive the clues.** Never the reverse. The crime happens, everyone lives their evening, and clues are the consequences.
2. **Everyone has a secret. Only one is murder.** Secrets make people lie. Lies make contradictions. Contradictions are the gameplay. Red herrings emerge, they are not planted.
3. **The report is the ending.** The player files who, how, why, when. Partial credit. Deduction, not accusation.
4. **Unlocks widen what you can learn, never what you can conclude.** Reputation buys contacts, access, time. It never eliminates a suspect for you.
5. **The narrator can be wrong.** Internal monologue states the current theory in hard-boiled certainty, then eats it.
6. **The corpus is a deck.** Prose fragments are cards: tagged, drawn once, burned when used. Generated at authoring time, hand-tuned, never live.
7. **Compete on deduction, not prose.** The voice gets out of the way of the moment two alibis can't both be true.

## The detective

Named by the player at the start of a run. Defaults to **Humphrey**, which is also the name of the game. First-person narration. Other characters address him by name.

## Milestones

- **M1 — Generator + truth sheet.** No UI. Prove the mysteries are worth interrogating. (`docs/01-m1-generator.md`)
- **M2 — The book.** Local web page, two-page spread, verbs, clock, report. Placeholder voice deck.
- **Later:** reputation, unlocks, persistence, the real corpus.
