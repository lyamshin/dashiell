# Build: the microplanner

*2026-10-14. The designer: "the writing is too dense. I read a lot. This doesn't flow or read naturally and thus is difficult to parse. We need a system so that the nuclei of fact/detail can blossom into a more organic page." And: lightweight, fully local, "a classic game you could have run on MS-DOS."*

*The facts are right. What makes the pages read like a list is that each slot is written without knowing its neighbours. Classical text generation has a stage for this between "decide what to say" and "fill the template": the microplanner. Dashiell skips it. This build adds it, deterministic, no model, no new bytes shipped beyond code.*

## 1. Where it sits

```
job (facts, links)  →  content plan (beats)  →  MICROPLANNER  →  skeleton  →  realization (cards + sentences)  →  page
```

Today `src/game/board/pages.ts`, `thought.ts`, `thread.ts` and `sheets.ts` go from beats straight to sentences. The microplanner takes the beats, with what the engine already knows about each fact (new / confirms / collides / narrows; who it's about; which place and hour), and decides **how many sentences, in what order, with what joins, and what each person is called**. It outputs a **skeleton**, which realization turns into prose.

## 2. The four operations

### Aggregation
Facts that share a predicate become one sentence.
- "Nobody had told me where Hanrahan was at nine, including Hanrahan." ×3 → "Hanrahan, Winslow and Reinhardt hadn't told me where they were at nine, and nobody else had either."
- Three confirmations → "Eight and nine matched Mrs. Kowalski to the chair."
- A list with one exception → "Everybody she'd named was where they said, except Bellucci."
Rules: aggregate up to four items; keep the exception last; never aggregate across the crime hour and another hour; never aggregate a fact the player must notice on its own (a collision stays its own sentence).

### Reference
What a person is called is decided by what the previous sentence was about (centering), not by a count:
- first mention on a page: name (with honorific where the bible has one);
- the same person as the subject of the next sentence: pronoun;
- after another person has intervened: name, or the role noun when it's unambiguous ("the barman", "the dead man", "my client");
- the designer's cap stays: a name at most twice a page outside quotes and lists.
Never a pronoun that could refer to two people of the same gender in the last two sentences.

### Connectives from the logic
The engine knows what each fact does. The join says it:
| relation | joins |
|---|---|
| confirms a held line | "which was what Coffin had", "and Ellery would swear to it", "same as she said" |
| collides | "But…", "One of them was wrong.", "Two stories, and only one could stand." |
| narrows (the hour, the field) | "So it was ten.", "That left two.", "which cleared her" (Raw only; see docs/46 levels) |
| new, unconnected | plain, no join |
| points onward | the hand-off, once, at the end |
A page has at most one "so" chain and one "but"; the rest is plain.

### Rhythm
Across the page: sentence length bands (short ≤ 8 words, medium 9–20, long 21+). No three sentences in a row in the same band. A beat that carries the joke ends short. Paragraphs follow beats (why-here, staging, the ask, the answer, the thought, the close), with the answer's quote alone in its paragraph. Don't restate what the previous page's hand-off already said: the why-here beat is one clause when the reason is already on the table ("So, Corrigan.").

## 3. The skeleton (the interface the tiny model will use; docs/50)

The microplanner's output is a list of units, in order:

```ts
type Unit =
  | { kind: 'fact'; text: string; locked: true; about: Id[]; hour?: number; place?: Id; relation: 'new'|'confirms'|'collides'|'narrows' }
  | { kind: 'gap';  slot: 'why-here'|'walk'|'staging'|'ask'|'reaction'|'close'|'hand-off'; text: string /* the card default */; before?: number; after?: number /* indexes of the fact units either side */ };
```

Every sentence that carries a fact (an account line, a list line, a find, a thought that names a fact, a collision) is a **fact unit, locked**. Everything else (texture) is a **gap unit** with its card text as the default. Realization today just concatenates units' text in order; the tiny model, later, may replace a gap's text and nothing else.

Export: `npm run read -- … --skeleton` prints the units as JSONL after each page; `scripts/skeletons.ts --n 300 --tier all [--world neighbourhood]` writes a JSONL corpus (one line per page: units, tier, job, the page's final text) for training.

## 4. Measures (`scripts/board-prose.ts`)

- **sentences per fact unit** (target ≤ 1.2; today about 1.6);
- **list smell:** three or more consecutive sentences opening with the same two words, or three consecutive sentences in the same length band (0);
- **pronoun ambiguity:** a pronoun with two possible referents in the last two sentences (0);
- **joins per page** (report; target 1–3);
- **restated pointer:** the why-here repeating the previous hand-off's words (0);
- all previous lints stay at 0; names ≤ 2 a page held; words a page in 170–260.
- Board hashes unchanged.

## 5. Done means

- The four operations in `src/game/board/plan/` (new), used by every page kind; `pages.ts` and friends call it rather than writing sentences themselves.
- The skeleton export works for every tier and both worlds.
- The measures hold on 30 nights a tier, both worlds; a "before → after" table in this doc.
- Read in full: the golden's night (seed 1 Medium lost-pet, dealt), one Hard-boiled dealt night, two neighbourhood nights (Medium, Poached). Put the golden's page 6 and the engine's page 6 side by side in this doc.
- A "Built" section here; leftovers in docs/25.
