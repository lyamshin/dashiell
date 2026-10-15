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

## Built (2026-10-15)

Branch `situated-deck`, with main merged in: Planner 2 (#81) and docs/52 (#82). The deck is on by default. To turn it off, use `?situated=0` in the book, or `--situated 0` on `npm run read`, `npm run play -- new` (kept in the save), `scripts/board-prose.ts` and `scripts/skeletons.ts`. Off, every page of the oracle's, the wanderer's and the reader's nights is byte for byte main's. That was checked on seeds 1–8, every tier, both worlds: 3,927 pages.

**2,987 cards written, 2,952 kept** (`content/board/situated.json`, 677 KB, 129 KB gzipped). Situated share 99–100% of the gaps the deck may fill. Lints 0. The blind read preferred the situated page in **32 of 40** pairs (80%).

### What the deck may fill

Not every gap is the deck's. A gap is the deck's when its text is **texture, as dealt**: a card from a family, said as the family dealt it, or one of the planner's hand-written asides (a gloss). The writer marks it (`sit()` in `pages.ts`, `Item.sit`). These are never the deck's:

- a fact, or anything inside an answer's quotation;
- an arrival (what the place is, who's in it), which isn't one of §1's slots;
- a bible line (docs/48);
- a pay-off, or a first look that sets one up (docs/44's callbacks);
- a gap that carries something:
  - the walk's frame (where, how far);
  - a watcher's line, or "nobody was posted to see who came and went";
  - the retainer;
  - the family hand-offs (who or where next);
  - "I hadn’t come for the furniture. I’d come for …";
  - an ask that says the reason to their face;
  - the report's why at Raw, which says whether what's held is enough.

Two kinds are split:

- **A why-here's reason stays as its `lead`.** The card is what follows it: "Coffin’s list had Ashby here at eleven." + the card. Medium's hand-off ("…, and that was worth the walk.") is split the same way.
- **A first look put on the staging stays as its `tail`.**

That is 40% of all gaps (51,731 of 129,579 over 40 nights a tier, both worlds, three routes), and 57% of the gaps in §1's eight slots.

### §1: situations

`plan/situated.ts`. `planSection` keys every marked gap after the paragraphs are laid out and before the rhythm and the reference (`situate`). The key is stored on the gap unit (`key`, and `card`, `lead`, `tail`, `who`), so the skeleton export and `npm run read -- --skeleton` print the key the realization looked up. Its fields:

- **slot, page kind, place kind, manner, tier band, put outcome:** as §1.
  - Page kinds add `return`, `motive` and `recap` to §1's list.
  - A walk's place kind is `street`.
  - Manner is the person's for staging, ask and reaction, and `none` for the narrator's slots.
- **before, after:** the relation of the nearest fact either side, in the gap's section (the turn is a section of its own).
- **position:** the gap's paragraph in its section.

Distribution, 40 nights a tier, both worlds, three routes, after the merge (`npx tsx scripts/situated-gaps.ts --nights 40`). There are 1,539 distinct full keys and 64 (slot, page kind, before) strata, 36 of them over 0.5%.

| key (slot · page · place · manner · tier · before · after · put · position) | gaps | share |
|---|---|---|
| walk · arrival · street · none · high · none · none · none · first | 1147 | 2.2% |
| walk · arrival · street · none · mid · none · none · none · first | 955 | 1.8% |
| walk · arrival · street · none · low · none · none · none · first | 591 | 1.1% |
| why-here · arrival · rooming · none · high · none · none · none · middle | 495 | 1.0% |
| ask · office · office · none · low · new · narrows · none · middle | 480 | 0.9% |
| close · office · office · none · low · new · none · none · last | 480 | 0.9% |
| ask · office · office · none · mid · new · narrows · none · middle | 480 | 0.9% |
| close · office · office · none · mid · new · none · none · last | 480 | 0.9% |
| ask · office · office · none · high · new · narrows · none · middle | 480 | 0.9% |
| ask · office · office · none · high · new · new · none · middle | 480 | 0.9% |
| close · office · office · none · high · new · none · none · last | 480 | 0.9% |
| close · arrival · rooming · none · mid · none · none · none · last | 438 | 0.8% |
| why-here · arrival · flat · none · high · none · none · none · middle | 430 | 0.8% |
| close · arrival · unwatched · none · mid · none · none · none · last | 418 | 0.8% |
| close · arrival · rooming · none · high · none · none · none · last | 382 | 0.7% |

The slots: close 19.2%, staging 18.8%, ask 17.6%, why-here 16.4%, reaction 15.0%, gloss 6.6%, walk 6.1%, hand-off 0.3%. The commonest strata: close · arrival · none 8.6%, why-here · arrival · none 7.8%, reaction · account · none 6.3%, walk · arrival · none 6.1%, ask · account · none 5.2%.

**The fallback.** Fields are let go in §1's order (position, after, tier band, manner, place kind, before), with three changes:

- **The place kind is let go only to its family.** A bar stands for a club, and a flat for a rooming house. A card written for a theater's seats was dealt in a kitchen when it went further.
- **The floor is the slot, the page kind, the place's family and the put.** Below it, the old deck's card stays. With page kind let go, an office's "when" question could go on a list page.
- **Some fields are never let go.** The office's ask keeps `after`, because before the clock it asks "when" and before the pointer "who". A gloss keeps `before`.

### §3: the sample and the writing

- **The sample**, `model/data/gaps-sample.jsonl` (2,987 gaps, 1,423 full keys, 66 strata). It was drawn from 40 nights a tier, both worlds, all three routes, with the deck off. Every stratum over 0.5% got at least 20 gaps, a rarer one at least 5, and the rest went by the square root of each stratum's count. Inside a stratum, the full keys took turns, one page at most. Each line has:
  - the whole page so far, the lead and the tail, and the next locked unit;
  - whom the tokens mean, and which tokens there are;
  - the old card, for the writer not to copy.

  Two strata appeared when Planner 2 merged (hand-off · list · confirms and narrows), and a few were thin. `--add-missing` topped them up from 40, 120 and 300 nights: 23 more gaps.
- **The writers.** There were ten helpers, one at a time, each with 300 gaps. Each had the same brief (`model/data/situated-brief.md`, as it stood at the end) and ran the automatic filter on its own file as it wrote (`situated-deck.ts check`, which also checks the batches before it). The writers mended about 70 failures in place:
  - verdict phrases: "took it", "the one who", "cleared";
  - words that read as hours: "from one", "by one";
  - machinery words: "rules", "margin";
  - bare pronouns, three-sentence speech.

  The brief grew with each batch's lessons, and batch 9's 108 question-page why-heres were sent back and rewritten. The brief showed only the next *locked* unit, and the writer took the why-here to run straight into the answer, so each one asked the question the page's own ask then asked again. I wrote the last 16 cards myself, for the top-up gaps found after the ten batches.
- **The read.** I read a tenth of every batch, seeded, against the goldens. The batches scored 29/30, 29/30, 30/30, 30/30, 28/30, 30/30, 30/30, 29/30, 28/30 and 27/27 keepable, so none fell under 80%; the lowest was 93%. The read also found patterns, and I cut them across the deck:
  - the office as a source ("it squared with the office");
  - cellar clubs (one club is over a garage);
  - a rooming house that "keeps its own count";
  - an usher where the theater may have a ticket seller;
  - "the room was empty" on a page with people in it.
- **The filter.** `scripts/situated-deck.ts build` runs these checks:
  - the verifier (docs/50): no names, places, hours, digits or means; the prose lints; one or two sentences of 8–40 words;
  - the tokens;
  - a bare pronoun;
  - `{they} were`, which comes out "he were";
  - signposts, verdicts, and the reader lint's verdicts with the person named ("I let Brennan go");
  - a pet called "it";
  - copies of the old decks;
  - near-duplicates, at 70% Jaccard on words, within the (slot, page kind, before) and across the whole deck;
  - the lead's cuts (`model/data/situated-cuts.json`, 31 with reasons);
  - jokes over one in ten.

| slot | written | cut | kept |
|---|---|---|---|
| why-here | 491 | 3 | 488 |
| walk | 107 | 0 | 107 |
| staging | 572 | 6 | 566 |
| ask | 420 | 1 | 419 |
| reaction | 386 | 1 | 385 |
| close | 628 | 7 | 621 |
| hand-off | 85 | 1 | 84 |
| gloss | 298 | 16 | 282 |
| **all** | **2,987** | **35** | **2,952** |

There are 208 jokes (7%). 1,057 cards have a token. Flags: 53 `requires: leaving` (the office's closes), 26 `murder`, 17 `dead-man`, which the filter adds to "the dead man" since the dead can be a woman now, and 4 weather flags. Coverage: every common stratum has 8 or more cards, and every rare one 3 or more, but one. Gloss · motive · narrows has 1, because one such gap turned up in 300 nights a tier.

Ten I'd keep, verbatim:

- `ask|account|rooming|terse|mid|none|new|none|middle`: "I asked {them} where {they}’d spent the evening and with whom. Then I shut up, which is most of asking."
- `close|account|rooming|none|mid|narrows|none|none|last`: "A door along the hall opened an inch and closed again, which in a rooming house is how you say good night."
- `close|arrival|scene-lost|none|high|new|none|none|last`: "The place where {thing} belonged was still there, which is the cruel thing about places."
- `gloss|account|theatre|none|mid|confirms|new|none|middle`: "So that piece stood on two legs instead of one. I’ve known whole nights get by on fewer."
- `reaction|account|restaurant|careful|high|none|new|none|middle`: "{They} took a breath, let half of it go, and kept the other half for talking."
- `walk|arrival|street|none|mid|none|none|none|first`: "Two men were bringing a double bass down a stoop between them, the way you’d carry a patient you weren’t sure of."
- `staging|motive|bar|plain|mid|none|new|none|middle`: "I stood at the bar beside {them}, both of us facing the mirror, and talked to {their} reflection."
- `hand-off|account|bar|none|high|new|none|none|middle`: "There’s no telephone for that sort of question."
- `close|search|scene-murder|none|high|new|none|none|last`: "The radiator ticked as it cooled. A room goes on with its small business, whoever has stopped."
- `why-here|arrival|unwatched|none|mid|none|none|none|middle`: "There’s no welcome in a place nobody keeps, and no unwelcome either. I went in."

Five I cut:

- `gloss|motive|restaurant|none|mid|confirms|confirms|none|middle`: "I wrote it down under the office’s version. The two agreed, and I took that for what it was worth, which is something, though not a great deal." This is the board read aloud.
- `close|turn|club|none|high|new|none|none|last`: "The ceiling down there is low enough to make a tall man careful, and everybody in the place had learned to stoop without noticing." The Kit Kat is over a garage.
- `why-here|arrival|rooming|none|high|none|none|none|middle`: "A rooming house keeps its own count of who comes and goes. I meant to borrow it." It asserts a watcher the house may not have.
- `gloss|account|theatre|none|low|confirms|new|none|middle`: "That was a part I wouldn’t have to carry round in pieces." Both blind readers marked it down.
- `hand-off|list|rooming|none|high|confirms|none|none|middle`: "I let {them} go back to minding the house, and thought about the other place." With the name said, it's the reader lint's verdict "I let Brennan go".

### §4: wiring

- **Dealing.** `situate` tries the gap's key, then lets fields go. At each level it takes the cards that fit:
  - not dealt tonight (the hand's spent list);
  - `requires` and `forbids` hold: speech before, the person's sex, leaving, the weather, the case, the dead man's sex;
  - not a stage card in a picture house, nor a screen card at the Thalia;
  - `{place}` only where the paragraph hasn't named the place;
  - filled, no sentence said earlier tonight or on the page.

  The night's seed, the page and the gap pick among them; the pick uses its own `Rng`, so the hand's own draws aren't moved. The card's id goes on the hand's spent list.
- **Jokes.** A situated joke goes only where the old card was the page's joke, or on the close of a page with none. Where a joke was and no situated joke fits, the old joke stays.
- **Tokens** are filled the planner's way. `{they} {them} {their}` become the person's pronoun marked with whom it means, and `{role}` the role with the mark. `refer.ts` then says each as the name or the role where a pronoun wouldn't be clear: "Coffin’s list had Ashby here at eleven. I went over to Ashby, past the rows of seats." `{thing}` is the lost thing or pet, and `{means}` the means once it's been said.
- **The rhythm** may trade a situated card for another of its key, or of a key that shares its place kind and what came before. It never joins a reason to the card after it. The first blind read found "Kavanagh had sat here telling the room about his parlor window; the kitchen door swung…", Planner 2's semicolon join across the seam; `joins()` in `rhythm.ts` now refuses it.
- **Planner 2 had merged** when this was wired, and it builds on it. The change to the planner is small and to the side:
  - one call in `planSection`;
  - `situ` on `PlanCtx`;
  - `roleOf` exported from `refer.ts`;
  - one line in `rhythm.ts`;
  - `sit` on `Item`, and the key on gap units.

  In `pages.ts` it is a mark on each texture draw, `situOf` in `lay`, and `putOn` keeping the tail.

### §5: measures

`npx tsx scripts/board-prose.ts --nights 30 --from 41 [--world neighbourhood] [--situated 0]`, the oracle's route on seeds 41–70, which the sample never saw. Both worlds, off → on:

| | Raw | Coddled | Poached | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|---|---|---|
| **dealt** words a page, median | 176 → 190 | 175 → 188 | 166 → 179 | 170 → 180 | 164 → 171 | 161 → 172 |
| situated share (of the 8 slots' gaps) | 100% (52%) | 100% (54%) | 100% (57%) | 100% (55%) | 100% (61%) | 100% (63%) |
| list smell, oracle (all three routes) | 14 → 23 (81 → 106) | 14 → 12 (61 → 61) | 46 → 25 (129 → 97) | 32 → 13 (121 → 74) | 63 → 47 (199 → 184) | 40 → 60 (145 → 155) |
| **neighbourhood** words a page | 213 → 220 | 210 → 219 | 185 → 197 | 189 → 202 | 185 → 196 | 190 → 203 |
| situated share (of the 8 slots' gaps) | 99% (45%) | 100% (48%) | 99% (52%) | 99% (50%) | 99% (56%) | 99% (57%) |
| list smell, oracle (all three) | 27 → 33 (127 → 138) | 22 → 23 (89 → 91) | 48 → 37 (145 → 131) | 64 → 48 (184 → 153) | 68 → 65 (185 → 221) | 42 → 59 (119 → 150) |

- **Every lint is 0 with the deck on, in both worlds**, but one. That one is a Hard-boiled sentence said twice (dealt seed 46), and it's there off too: a why-here's reason, which the deck keeps as the lead. The deck removed lints that were there off:
  - Medium dealt: a sentence said twice, and two pages with two signposts;
  - Medium neighbourhood: one of each.

  The old Medium hand-offs said "…, and that was worth the walk"; the reason now stays and the card after it says no "next". Pronoun ambiguity holds at 0 (the neighbourhood's Poached 1, across all three routes, is main's).
- **Sentences per fact unit, joins and restated pointers** are unchanged (1.39–1.55 dealt, 1.41–1.67 neighbourhood). The deck doesn't touch facts.
- **Exact key:** 82–92% of the situated cards dealt are for the gap's own key. Most of the rest let go one to four fields; almost none let go the place kind.
- **List smell is mixed.**
  - It's down at Poached, Soft-boiled and Medium.
  - It's up at Raw and Hard-boiled, and in the neighbourhood's Medium across all three routes.

  The split why-here is the cause: a reason and a card are two medium sentences where the old card was one, and some high-tier keys have only a few cards of one length to trade. See docs/25.
- **Dealt boards are unchanged:** 720 boards, 60 seeds × 6 tiers × 2 worlds, hash for hash with main.
- **Page boards** were checked over 3,927 pages. Every page tells the same lines in the same fact units; 12 group them differently, where the rhythm joined two facts on one side and not the other. One page's board licenses less with the deck on: Medium seed 4, page 13, an arrival that can no longer name Ainsworth or nine o'clock. An earlier page's old card was another one, because a trade freed a card the night had spent. Off, the page boards are main's.

**The blind read** (`scripts/situated-read.ts`). The 20 pages were taken across both worlds, every tier and nine kinds of page: account ×5, arrival ×4, list ×2, put ×2, search ×2, motive ×2, office, report, the turn. Each page was shown twice, the order unknown, to two readers one at a time, who saw only that file. **The situated page was preferred in 15 of 20 and in 17 of 20, 32 of 40 (80%).** Both readers marked down the same things on the losing side:

- generic filler that could sit on any page ("I gave the place a minute to show me what it had", the old deck's, twice in one read);
- a line that contradicts the one before it;
- a word said twice close together.

Both readers took pair 16 from the deck: "the seat beside", with nothing after it, and "a part I wouldn’t have to carry round in pieces". Those two cards are cut, and the semicolon seam both readers caught is closed. Both fixes came after the read.

Two pages, from the read (Poached murder, dealt, page 13; the situated page was the one preferred):

> **Off.** Mrs. Nagy’s list had Weisglass here at eight and nine. That was reason enough to ask. I didn’t waste his time. He looked like somebody who kept count of it.
>
> “Where were you tonight?” I said. “All of it. I’ve got time, and I hope you have.”
>
> He didn’t like being asked, and didn’t pretend to.

> **On.** Mrs. Nagy’s list had Weisglass here at eight and nine. In a rooming house every wall is somebody’s, so I kept my business down to a murmur. I said who I was, short. He nodded me into the hall.
>
> I asked him where he’d spent the evening and with whom. Then I shut up, which is most of asking.
>
> He gave it a moment and then gave it to me, plain and short.

And the close of an arrival at the Peacock (Poached lost-item, the neighbourhood, page 4). Off, it's the old "I gave the place a minute to show me what it had."; on:

> Somebody at a table in the dark laughed once, short, the kind of laugh that looks round first to see who heard it.

### Read in full

Two nights with the deck on, page by page:

- the golden's night (seed 1, Medium, lost pet, dealt);
- seed 52, Poached, murder, the neighbourhood.

They read as the book's own. Four slips:

- **A staging seated me "in the row in front"** of somebody the arrival had put in the lobby. The old deck's "I sat one seat over" has the same fault.
- **Two different cards on one night both "found something to sit on".**
- **An unwatched place's why-here said nobody kept the door**, and the old watcher line said it again.
- **"The room was empty" on a report page with two people in it.** That card is cut.

### Open

See docs/25, "The situated deck".

## The dial (2026-10-15)

Branch `situated-dial`. The deck was written before docs/53, and its 80% blind read was judged on voice, not clarity. Docs/53 says a texture may be pure flavor, but it must be legible on its own: no oblique tags, no pronoun for a fact or a place the card doesn't name, no figure the reader has to decode. On a scale from plain (1) to Hammett (10), aim at 3 or 4.

### The audit

Every card was read against docs/53, in six batches by slot, one helper at a time. Each helper had the same brief, and for each card its key, its tokens and one page it was written for. I read a tenth of every batch, seeded. Every batch read was 90% or more keepable, and I rewrote the five cards the helpers had kept that I'd have flagged. Each card got flags and one of three verdicts:

- **keep:** nothing to translate. A legible wisecrack or a simile anyone gets is the dial, not a fault.
- **rewrite:** keep the idea, say it plainly, add at most one broad noir touch. The tokens, the flags and the jokes stay.
- **cut:** nothing under the voice. No card came to that.

The flags are docs/53's list:

- `tag`: an oblique tag;
- `ellipsis`: a word standing in for a fact or a place;
- `compressed`: logic the reader has to rebuild;
- `rhythm`: cadence over sense;
- `translate`: a joke or figure to decode;
- `pronoun`, `place`, `long`: the clarity lint, below.

| slot | cards | flagged | tag | ellipsis | compressed | rhythm | translate | pronoun | place | rewritten | cut | kept |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| why-here | 488 | 71 | 2 | 28 | 2 | 0 | 1 | 22 | 20 | 71 | 0 | 417 |
| walk | 107 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 107 |
| staging | 566 | 48 | 0 | 28 | 8 | 5 | 4 | 5 | 3 | 48 | 0 | 518 |
| ask | 419 | 34 | 3 | 10 | 3 | 0 | 12 | 1 | 8 | 34 | 0 | 385 |
| reaction | 385 | 44 | 0 | 15 | 7 | 12 | 0 | 9 | 3 | 44 | 0 | 341 |
| close | 621 | 62 | 1 | 9 | 2 | 2 | 2 | 29 | 24 | 62 | 0 | 559 |
| hand-off | 84 | 34 | 0 | 9 | 4 | 0 | 2 | 11 | 13 | 34 | 0 | 50 |
| gloss | 282 | 107 | 14 | 5 | 19 | 4 | 9 | 68 | 8 | 107 | 0 | 175 |
| **all** | **2,952** | **400** | **20** | **104** | **45** | **23** | **30** | **145** | **79** | **400** | **0** | **2,552** |

The gloss and the hand-off were the most voiced slots. The gloss leaned on a bare "It" or "That" for the fact before it ("It squared with what I’d been told"), and the hand-off on "there" for the place it pointed to. The walks were already concrete street lines, with nothing to translate. Other patterns:

- the ask put the question sideways ("where the evening had found them, and who else it had found there");
- the put pages called the broken story "it" or "this";
- the closes opened "It was a small room…" for the room.

The record is `model/data/situated-dial.jsonl`: each card's flags and verdict, with the text before and after. Rewrites go into `situated-written.jsonl`, and `situated-deck.ts build` makes the deck as before. Every key keeps its cards (none was cut). The jokes are still 208. Every card passes the verifier, the prose lints and the near-duplicate check. Gloss · motive · narrows still has its one card.

### The clarity lint

`npx tsx scripts/situated-dial.ts lint` runs the lint over the deck as shipped and the deck before the dial (`26b24ca`). Its rules:

- **pronoun:** "it", "that" or "this" as a sentence's or a clause's subject, with no noun before it in the card. "It" that means nothing ("it was late", "it was the hour when") is let be.
- **place:** "here" for the place, or "there" for a place the card hasn't said. "There was", "is there", and "here" in speech are let be.
- **long:** over 40 words.
- **tag:** docs/53's own tags ("with X’s word under it", "on her count", "and she knew it", "the part worth keeping").

| | before | after |
|---|---|---|
| cards flagged | 180 | 0 |
| pronoun | 113 | 0 |
| place | 70 | 0 |
| long | 0 | 0 |
| tag | 1 | 0 |

By slot: why-here 32 → 0, staging 7 → 0, ask 6 → 0, reaction 11 → 0, close 34 → 0, hand-off 21 → 0, gloss 69 → 0. Walk was 0 before.

The lint is a floor, not the audit: 180 cards tripped it, and the reading flagged 400.

### Measures

`board-prose`, 30 nights a tier from seed 41, both worlds, before → after the dial:

- **Every lint is unchanged.** The one Hard-boiled sentence said twice (dealt) and the neighbourhood's Poached pronoun ambiguity (all three routes) were there before, and off.
- **Words a page** move by 0–2.
- **The situated share and exact-key share** are unchanged.
- **List smell, oracle:**
  - dealt: Poached 24 → 25, Soft-boiled 13 → 16, Medium 33 → 34, Hard-boiled 45 → 36;
  - neighbourhood: Poached 37 → 39, Medium 63 → 64, Hard-boiled 48 → 44;
  - Raw, Coddled and the neighbourhood's Soft-boiled are unchanged.

`test/situated.test.ts` and the suite pass. One rewrite split an office "Who…?" across a said-tag, which `board-connective.test.ts` caught, and it was mended.

### The blind read, with docs/53's rubric

`npx tsx scripts/situated-dial.ts read --vs before|off`, then `score`. Each read takes pages across both worlds, every tier and every kind of page. Each page is written twice from the same night: with the deck after the dial, and with the deck before it (or with the deck off). Two readers read them one at a time, unlabeled. They were asked which page is **clearer, and still sounds like the game, in that order**. `situated-read.ts` now opens with the same rubric.

- **After vs. before, 20 pages: after was preferred in 17 of 20 and in 17 of 20, 34 of 40 (85%).** The target was 60%.
  - Both readers took the same three pairs from the deck before. In each, both pages were clear, and the old card's "It was …" read tighter than its rewrite: "It was a plain question" over "The question was a plain one", "It was the hour when a rooming house stops being a house" over "At this hour…", and "It was late" over "The night had got on".
  - The lint lets "it was late" and "it was the hour" be. A helper had rewritten three of these anyway, and those three are put back.
  - The phrases both readers found hardest were all on the side before the dial: "kept my voice to the width of it", "Better here than out on the street, where it carries", "That was what … had paid for".
- **After vs. off, 10 pages: after was preferred in 6 and 7 of 10, 13 of 20 (65%).** The losses:
  - "Every account starts out as just somebody talking. This one was still at that stage" (both readers). It is rewritten: "So far the account was one person’s word and nothing else. Every account starts out that way."
  - "The two stories agreed on that part" (both readers). Read on its page, it seemed to vouch for the hour nobody had backed. It now says "That part held up…" without saying which.
  - "By then even a place like that had run out of reasons to be busy", where the arrival had just said the room was empty (one reader). It is now "It was late, and even a place like that had gone quiet for the night."
  - Two pairs where both were clear, or the loss was the engine's own: a stray "across from Mrs. Sobel’s" in an answer, and a question and answer sharing a paragraph.

  The three rewrites came after the read.

### Ten before and after, verbatim

- `why-here|arrival|restaurant|none|mid|none|none|none|middle` (compressed)
  - before: "A spoon rang on a saucer somewhere at the back. I let it stand for a bell and began."
  - after: "A spoon rang on a saucer somewhere at the back, like the bell for the first round, and I got started."
- `staging|search|scene-murder|terse|high|none|new|none|first` (rhythm, ellipsis)
  - before: "I went over it once for the shape of things, and once for the things."
  - after: "I went over the room twice: once to see how it was laid out, and once for what was in it."
- `ask|office|office|none|high|new|narrows|none|middle` (compressed)
  - before: "I asked about the time, and whose clock it was."
  - after: "I asked what time it had happened, and whose clock had said so."
- `reaction|account|club|plain|mid|none|new|none|middle` (compressed)
  - before: "{They} looked up at the ceiling for the start of it and found it there."
  - after: "{They} looked up at the ceiling while {they} found where the evening started, and then began."
- `reaction|account|club|terse|high|none|new|none|middle` (rhythm)
  - before: "One shrug, no more. Then the evening, in short pieces."
  - after: "I got one shrug, and then the evening, in short pieces."
- `close|arrival|club|none|high|none|none|none|last` (rhythm)
  - before: "Smoke and talk, and under it all the door, with the night waiting on the other side."
  - after: "The room was all smoke and talk, and behind it all stood the door, with the night waiting on the other side."
- `gloss|motive|unwatched|none|mid|new|none|none|middle` (pronoun, tag, place)
  - before: "That was news. I wrote it in and let it sit there without company for a while."
  - after: "That reason was news to me. I wrote it down and let it stand alone for a while, with nothing yet to set beside it."
- `gloss|account|club|none|high|confirms|new|none|middle` (translate)
  - before: "A second account like that is a small, warm thing in this work, and I held my hands over it a minute."
  - after: "A second account that matches is a small, warm thing in this work, like a stove on a cold night, and I let myself enjoy it a minute."
- `hand-off|list|unwatched|none|high|new|none|none|middle` (ellipsis)
  - before: "I wanted to see the other end of that."
  - after: "I wanted to see the other place in that story for myself."
- `hand-off|search|scene-murder|none|high|new|none|none|middle` (compressed)
  - before: "The dead keep very still, and so do their rooms. The moving parts of this were outside."
  - after: "The dead keep very still, and so do their rooms. Whatever was still moving in this business was out on the streets."

Kept as they were, because the touch is one anyone gets: "I didn’t argue. Arguing with a no only gets you a firmer one." "So two people agreed about part of the night. On this side of town that’s practically a treaty." "My knee made a remark as I got up. I ignored it, the way I ignore most good advice."
