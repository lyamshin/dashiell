# Hone 1 — Questions written with their answers, portraits followed, the spoken clock

Blessed by the designer after the golden loop (`docs/golden/REPORT.md`). The target is now **golden v2** (`docs/golden/seed3-opening.md`), measured page by page, not as two pages together. Its ten rules at the bottom govern; rule 1 (clarity first) outranks the rest, and rule 3 (Dashiell's questions are real questions) is the one this pass exists to satisfy.

Three tracks, disjoint files.

## Track A — Generator (Opus, `src/gen/`)

### A.1 The question is written with the answer

Every briefing sentence spoken by the client gains a `prompt`: the question Dashiell would ask that this sentence answers, written by the same hand as the first-person form. In `case.briefing[i]`:

```ts
{ text: string; spoken: string | null; speaker: 'client' | 'narration'; prompt?: string; breath?: string[] }
```

Rules for prompts:
- A prompt must be answerable **only** by its sentence. "What were you doing in his rooms at half past eleven?" → "Collecting." If the prompt could precede any answer ("And then?", "Go on."), it is not a prompt; leave `prompt` undefined and the engine will let the client continue unprompted.
- At most **three** sentences per briefing carry a prompt: the discovery (how/when found), the tie or the purpose (why you, why hire), and the pointer (who do you like for it). The others run on as the client's own turn.
- Prompts are written per template in the data files alongside `backstoryFirst`, `PURPOSE_TEXT_FIRST`, `COST_TEXT_FIRST`, `foundTextFirst`, `reasonSpoken`, with the same slot discipline. Vary them: at least three prompt variants per template so forty seeds do not ask the same question.
- Correspondence: prompts are checked like spoken text.

### A.2 The breath-split form

Each spoken sentence also gains `breath: string[]`, the same content split where a person would breathe: one to three short sentences, at least one of six words or fewer where the sense allows. "I found him. Half past eleven, in his rooms." The engine chooses `breath` over `spoken` when the page's short-sentence share is under target. Every fact survives the split; correspondence is checked on the joined form.

### A.3 The spoken clock everywhere

`spokenClock` already renders "half past eleven". Apply it to every generator text that reaches the page: the coroner's window ("between half past nine and eleven"), anchor timing and scene facts ("the El went over at ten"), the givens, the client's own evening, the dossier discovery. Keep the numeric form in the truth sheet tables and the notebook timeline (those are records), and expose both on the clue (`text` spoken, `textRecord` numeric) so the engine picks by surface. Correspondence must parse spoken hours everywhere it now parses numeric ones.

### A.4 Tests

Prompts present on 2–3 sentences per case, each prompt's sentence is the only sentence that answers it (assert by the template pairing, not by NLP); `breath` joins back to `spoken`'s facts; no page-bound text contains a `\d:\d\d [AP]M` pattern outside notebook and sheet; correspondence zero over seeds 1..200 at all difficulties; existing tests green.

## Track B — Engine (same Opus, `src/game/`)

### B.1 The briefing uses the prompts

Replace the template prods with the generator's prompts. Where a sentence has no prompt, the client continues her turn (join with the previous spoken sentence, or a plain beat: "She went on."). **At most three of Dashiell's lines on page one**, and they are the prompts. The two free client questions after the briefing stay.

### B.2 Prods capped everywhere

In interviews, Dashiell's follow-ups are capped at two per page beyond the opening question. A follow-up must name what it asks about (the subject, the place, the hour); never a bare "And then?".

### B.3 Breath and rhythm

Use `breath` when the page's short-sentence share is under 0.25 before the exchange is placed. Keep the carrying-sentence join from the loop, but never join two spoken sentences of the client's.

### B.4 Portrait pairs on first meeting

Consume the new `portrait-pairs.json` deck (Track C schema below). First meeting: one pair card, filled, in place of the trait/habit/clothing list. Later meetings: the pair's `recall` phrase as a clause ("the woman with the broken finger"). Existing single-component portraits remain the fallback when no pair fits the person's tags, logged as a gap. The presence sentence uses recall phrases for people already met.

### B.5 Targets, recalibrated

Recompute `docs/golden/GAP.md` targets against golden v2 **per page** (office page and suite page separately) using `scripts/style-metrics.py`, and update the harness's targets. Orphan-word ratio target becomes the v2 office page's value plus 0.05. Everything else per v2's pages. Run the harness (`src/cli/golden.ts` + `scripts/golden-loop.py`) before and after this pass and record both in `docs/golden/rounds.md` as "Hone 1".

### B.6 Two content bugs

"the a bronze bookend" (a `{object}` slot behind a definite article: strip the article from the object name or the frame) and the presence line "Bidwell, the hackman on the stand, on the stand" (role already names the place). Fix in the engine's fill and presence code; add a test for each.

## Track C — Content (Sonnet, `content/decks/portrait-pairs.json`)

A new deck. Each card is **a detail with the reason it is seen**, two or three plain sentences, in the golden's shape:

> She kept her left hand in the pocket until she sat down. When she took it out I saw why: the little finger had been broken once and never set.

```ts
{ id: 'pp-001', deck: 'portrait-pairs', text: string, recall: string,   // "the broken finger"
  tags: { gender: 'm'|'f'|'any', class: 'money'|'working'|'underworld'|'professional'|'any', ageBand: 'young'|'middle'|'old'|'any', setting: 'office'|'anywhere' },
  motifs: string[], weather?: ..., status: 'generated' }
```

Slots: `{He}` `{he}` `{his}` `{him}` (the engine fills from gender; write with the capitalized form where a sentence starts), `{name}`. No similes. No period slang. Clarity first: a reader must understand the detail on first read. 120 cards: 40 per class band (money / working / underworld+professional), split across gender and age, at least 30 with `setting: 'office'` (a person sitting down across a desk), the rest `anywhere`. Overlap checker clean. Add the deck to `content/deck-schema.json` (Track B owns the schema file; Track C writes the deck and a `docs/12-portrait-pairs-notes.md`; the lead merges).

## Deliverables

- Track A+B: branch `hone-1`, not pushed. `docs/12-hone-1-notes.md` with the before/after harness table against v2 targets and page one of seeds 3, 7, 12 after. Tests green, correspondence zero.
- Track C: branch `portrait-pairs`, not pushed. Deck, notes, overlap output.
- The lead merges C into A+B, runs the harness, and presents seed 3 to the designer.
