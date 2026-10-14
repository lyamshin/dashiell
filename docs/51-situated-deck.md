# Build: the situated deck

*2026-10-14. The tiny-model spike (docs/50) answered its question: at a size that fits "a classic game you could have run on MS-DOS" (≤ 8 MB), a from-scratch transformer either recites the cards it was trained on or, once that's trained out, writes fluent nonsense (one good gap in thirty). The machinery stays in the repo; the game won't use the model.*

*What the spike also showed is that the right unit of writing is the **gap**: the texture sentence between two locked facts, written for the logical moment it sits in. Today's cards are keyed by slot alone. A card written for "a staging line after a collision, in a bar, for a terse speaker, at a high tier" fits its page in a way a generic staging card can't. So: write the gaps the fine-tune would have trained on, and ship them as cards keyed by their situation. No model, a few hundred kilobytes.*

## 1. A gap's situation

| field | values |
|---|---|
| slot | why-here, walk, staging, ask, reaction, close, hand-off, gloss |
| page kind | office, arrival, account, list, search, put, admission-check, turn, report |
| place kind | the engine's `PlaceKind`s, plus office and street |
| manner | plain, terse, careful, none (narrator-only slots) |
| tier band | low (Raw, Coddled), mid (Poached, Soft-boiled), high (Medium, Hard-boiled) |
| before | the relation of the fact unit before the gap: new, confirms, collides, narrows, none |
| after | the same for the unit after |
| put outcome | landed, held, refused, admitted, cracked, none |
| position | first, middle, last paragraph |

The key is the tuple. Retrieval tries the exact key, then drops fields in this order until a card is found: position, after, tier band, manner, place kind, before, page kind. Within a night the dealer's least-recently-used rule applies, and no card is dealt twice.

## 2. The cards

- **Text** in the voice: one or two sentences, 8–40 words, about one joke per page across the deck (so most situated cards are plain).
- **No names, hours, places or digits** (the verifier from docs/50 enforces it). Reference goes through tokens the planner fills: `{they} {them} {their} {role}` for the person the page is about, `{place}` for the current place's short name, `{thing}` for a lost thing or pet, `{means}` for the means. Tokens are optional; most cards need none.
- **Requires / forbids:** small flags a card can carry: `requires: quote-before` (the previous unit is speech), `forbids: leaving` (the page continues here), `requires: woman|man` for the referent.
- **Source:** every card records the skeleton it was written for (night, page, unit), so a card can be traced back.

## 3. Writing them

1. Export skeletons (`scripts/skeletons.ts`, both worlds, all tiers) and sample about **3,000 gaps stratified across situations**: every (slot, page kind, before) combination that occurs in more than 0.5% of gaps gets at least 20 samples; rarer ones at least 5.
2. A writer sees the whole page so far, the locked unit after, the situation, and the voice targets (`docs/golden/seed3-camp.md`, `board-connective.md`, the round-3 "keeps" in `scratchpad/round3-digest.md`), and writes the gap. Batches of 300, one writer at a time; the lead reads 10% of each batch and rejects a batch under 80% keepable.
3. Every card passes the verifier and the prose lints; near-duplicates (≥ 70% token overlap with another card in the same key) are cut; a card that restates a fact, names anyone, or adds a second joke is cut.
4. The deck is `content/board/situated.json`.

## 4. Wiring

In realization (`src/game/board/plan/`), when a gap unit is realized, the situated deck is tried first with the gap's key; the old deck is the fallback. Tokens are filled by the planner's reference logic. A flag `?situated=0` turns it off for comparison.

## 5. Measures

- `board-prose`: all lints 0; the share of gaps filled from the situated deck (target ≥ 80%); words a page.
- **The read:** 20 pages, situated on vs. off, side by side, judged blind by two readers who don't know which is which; target: situated preferred in ≥ 60% of pairs.
- Dealt boards unchanged.

## Done means

- The deck written and filtered (≥ 2,000 cards after cuts), wired behind the flag defaulting on, measures in this doc, a Built section, leftovers in docs/25, a PR not merged.
