# Nights with one liar

*2026-10-25, branch `one-liar`, off main at `444cbc1` (round7-fixes, #106, docs/68). The designer, on the report's old "Someone else lied too": "why would we ever give away someone else lied too?" Round 7's B9 made the question neutral, "Did anyone else lie?", asked on every night from Poached up, with "Nobody else" scored right where nobody else lied. But docs/41 rule 9 dealt an innocent liar on every night from Poached up (270 of 270, seeds 1–30, every type), so the answer was always a name, and a player soon learns there's always one more to find. The designer decided (`scratchpad/one-liar-spec.md`): a second liar should be likely, not certain. This build deals nights with one liar, makes "Nobody else" need proof like every other answer, and measures the shortcut those nights invite.*

## The decisions (the spec's)

- **The share.** About one night in three from Poached to Medium deals no innocent liar: the culprit lies, and nobody else does. At Hard-boiled, pair nights keep both liars (the pair is the tier's signature, docs/41 rule 10), and face nights drop the secret on about half, so "no pair means nobody else" is never a safe guess. Raw and Coddled are unchanged: they never deal a second liar, and the report doesn't ask.
- **What a one-liar night is.** Every rule that isn't about the second liar still holds: every lie collides, the answer is unique, the means and the window, the lists complete, the passer-by's street, the culprit's refusal and admission rules. The rival is cleared by evidence, not by default: with no innocent liar, by their own true evenings and the lists. The designed path still needs more than the culprit's broken story; a night where catching one lie and closing is par is a Coddled night. `twoStories` and `INNOCENT_LEADS` apply only to two-liar nights; a new invariant holds that a one-liar night's path checks every rival's evening at the hours that mattered. Par and the budget come from the path, as always.
- **"Nobody else" needs proof.** The full point when what's held rules out every other suspect at the hours that mattered (placed by a story that stands, or cleared by a list); half on a night with no other liar without that, said plainly, so no star; nothing on a two-liar night. The form offers "Nobody else" with no line to pick. The solver on what's held decides it.
- **The measures.** Before → after by tier, 50 seeds a tier and type: the share of one-liar nights, par, the oracle's, the wanderer's and the hint-taker's solved rates; a new shortcut reader, "first liar, nobody else", whose perfect rate must stay under 10% at every tier from Poached up; the old "liar did it" reader; the refuser shortcut; the dealt hashes.
- **The book.** Nothing in the pages may assume a second liar: the office, the turn, the curtain (which on a one-liar night says "Nobody else lied." with what you filed), the story, the fastest solve. The teach page's "When two people lied, you also need what clears the innocent one." stays.

## 1. What was built, and where

### 1.1 The deal (`generate.ts`, `index.ts`)

- **`ONE_LIAR_SHARE`**, beside `INNOCENT_LEADS`: 0, 0, 0.34, 0.34, 0.34 and 0.5 by tier (the last is of face nights; a pair night has no secret to drop). **`oneLiarDrawn`** draws it per attempt, on a stream of its own (`mix(seed, tier, type, attempt, 0x13fd4)`), as the lead and the first-hour reasons are drawn, so nothing else about the deal moves.
- **`oneLiarNight(c)`** makes the night from a two-liar night as the generator deals it. The innocent who would have lied tells the truth: their story at the lied hour says where they really were, with whoever was really there (the company an owning-up would have named, or nobody where the keeper's list is what places them), and the move back from it is the truth's move with the truth's reason. Their lie, their confrontation and the night's `lead` go, and a refuser is found where they were at the last hour, not back where they claimed to be (docs/41 rule 9's 2026-10-11 note, which only a lie needs). Everything else is the night as dealt, word for word: the cast, the board, the lists, the remarks, the office, the culprit's lie and second lie.
- **`generateBoard`** runs every gate it ran before on the night as built. If that night passes and the attempt drew one liar, it makes the one-liar night and runs every gate again on it (`accepted`: the invariants, the rating, `reject`). If the one-liar night fails, the night is dealt again: the next attempt, as for any rejection. A night that drew two liars is returned as before.

### 1.2 What a one-liar night must be (`invariants.ts`, `path.ts`, `index.ts`)

- **`rivalsChecked`**, a new invariant, on one-liar nights only: every rival (`rivalsOf`) is cleared on the designed path as placed away from the scene, at the hours that mattered as the path narrows them, never for want of access or by default; and some rival is cleared by a line that isn't part of what breaks the culprit's story (the path is more than that story).
- **`twoStories`** was already conditional on an innocent lie; its comment says so now. **`INNOCENT_LEADS`** never applies: the lead is dropped with the lie.
- **The rating** (`ratesAt`, used by `generateBoard` and `reject`): a night must rate its tier, Tatham's way, except a Poached night with one liar. Poached's technique, the confrontation, exists for the innocent liar (their owning-up names the check), so without one a Poached night finishes on lower tiers' techniques: every Poached one-liar murder rates Raw (every rival placed, nothing to resolve), and a small case Raw too, or Poached where the culprit's crack is the only word on where the thing went (`rates.mts`, 50 seeds a type, both worlds: 100 Poached one-liar nights, the 32 murders Raw, the 68 small cases 39 Raw and 29 Poached). It's dealt from a night that rated Poached with its second liar, and `rivalsChecked` stands in for the floor. From Soft-boiled up a one-liar night must still rate its tier (time-window, side remark, face), and every one does.

### 1.3 The refusal shortcut, honestly (`solver.ts`)

The refusal shortcut ("confront every liar, name whoever refuses", decided 2026-09-28) read the night's `lies` to know when every liar was caught. On a one-liar night that is one caught and put to it, and the shortcut beat par on nearly every one of them from Soft-boiled up, and on the Poached small cases (four to six questions against six or seven, in the first probe, `scratchpad/oneliar/probe1.mts`). A player can't know it: from Poached up a night has two liars at most, but it may have one. So a refusal tells liars apart only where there are two to tell apart, or below Poached (one, and a player knows it); with one caught, knowing it's the only one takes ruling everybody else out, and then there's nobody for a refusal to tell apart: the shortcut names whom the elimination names, with the means to it (rule 14), as anybody would (`tellApart`). On two-liar nights and below Poached it is what it was, and those boards are dealt as before.

(A first cut let the one caught be named as the holdout once everybody else was ruled out. That skipped the question that shows the culprit could have got the means, and came in under par in actions on two Poached murders at 50 seeds, and in questions on two Poached small cases at 40, which were dealt again; the second cut closes both.)

### 1.4 The path (`path.ts` `orderPath`)

Among the orders with the fewest walks, a one-liar night's path breaks the culprit's story while somebody else is still unchecked, wherever the walks allow it: the same tie-break that decides which of two broken stories a two-liar night meets first (docs/41 rule 9, 2026-10-11), now taking what each night meets first and after as a test on what's held (`Lead`). Par, the walks and the budget don't move; only the order of the designed path does, and with it the oracle's route and the curtain's fastest solve. Without it, a Medium one-liar murder's path (the culprit's "home alone" broken by the passer-by's remark) often met the culprit's story last, and the shortcut reader below filed perfect on it.

### 1.5 "Nobody else" (`report.ts`)

- **`nobodyElseProved(d, run)`**: the solver on what's held (`solveRun`) clears every suspect but the culprit: placed away from the scene at the office's hours (as what's held narrows them) by a story that stands or a list, or ruled out by the list where the means was.
- **`scoreBoard`**: on a night with no other liar, "Nobody else" without that is right on a hunch, `half`, and says so under the score: "Right, but you hadn’t checked everyone: half credit on whether anyone else lied." The outcome is `thin` (not `solved`), so no star. Naming somebody is wrong, as B9 had it ("Nobody else lied: Dandridge had told the truth."). "Nobody else" on a two-liar night is wrong, as before. The verdict's row says "Nobody else — right, but you couldn’t have known ½" in the book and "Nobody else  ½ — right, but you couldn’t have known" in the CLI, as a half on who does.
- **The curtain** (`curtainOfBoard`), on a one-liar night: "DID ANYONE ELSE LIE? / Nobody else lied. / You picked: nobody else.  ✓", or "…nobody else, but you hadn’t checked everyone.  ½", or "Dandridge.  ✗". THE LIES has the culprit's lie only.

### 1.6 The readers and the measure (`oracle.ts`, `board-measure.ts`, `read.ts`, `render.ts`)

- **`playFirstLiar`**, "first liar, nobody else": it walks the designed path as the oracle does (the papers at the scene included) until the grid shows it a lie; then it names that liar, on the line the grid set against them, answers "Nobody else", and closes on what it has (two caught on one step are a coin flip; at Hard-boiled a clash that rests on an unmatched face isn't shown, so it walks on).
- **`board-measure`** gains five columns, in the rows and in the tier summary: nights with one liar; par in questions, the median on one-liar nights and on two-liar nights; and the shortcut reader's perfect rate (outcome `solved`, every point, so a star), how often it has who right on its line, and its mean points out of what the report asks.
- **`npm run read -- --first-liar`** reads the shortcut reader's own route and the report it filed. **`npm run case`** (the designer's view, `render.ts`) says "One liar: nobody but X lies (Y tells the truth about ten: …). The path breaks the story at step k of n."

### 1.7 Pages a one-liar night makes (`gloss.ts`, `thought.ts`, `pages.ts`, `plan/`, the lints)

A one-liar night writes pages no night wrote before: the innocent's true story naming their company, the keeper's list reached from that story, two stories unbacked at the crime hour, the culprit's story met before the lists that place the rest. The sweeps (30 nights a tier, both worlds, three routes) found six things on them, each fixed by rule where the line is made. Only the second rule below shows on nights with two liars as well: of the 882 routes over two-liar boards in board-prose's set, 876 write every page word for word as main does, and the other six differ in that one sentence, the second "…, when the watch went." of a night (`scratchpad/oneliar/pagediff.mts`, `sentdiff.mts`).

- **Company named by somebody's own true story** isn't introduced as "the woman Hochstetter had named" (`gloss.ts` `introOf`): that gloss is for an owning-up, and on the page the story was just told it named the teller a third time ("Feeney was in by then, three rows back."). The `bare` rule (`hinge-lint.ts`) takes it as met, as it already did somebody a confession has just named.
- **An unbacked story said again** (`thought.ts`): where an earlier page said "Nobody else had said where she was at eleven, when Fritz went." of another woman, the second says the hour's reason no more (as docs/66 P1 has it at the fact level), so the pronoun doesn't make it the same sentence twice and the name isn't said a third time: "For eleven, nobody else had said where she was." On two-liar nights it's the same rule (main kept the name there, and the reason twice): Raw lost item 1's "Nobody else had said where Lathrop was at ten, when the watch went." → "Nobody else had said where he was at ten."
- **A list's reason the arrival in this room already gave** (`pages.ts` `whyHere`, `plan/texture.ts` `droppable`, `Item.reasonGiven`) is the cap's last resort's to take off, and the page then carries it: "Amato had said he was at Sokol’s at nine and eleven." before a thought that names Amato twice.
- **Three lint readings** that took speech for narration: the `shift` rule read the detective's quoted ask ("“Who was in tonight?” I said.") as the late watcher's words; the speaker-card check (`plan/measure.ts`) read an answer's second sentence, split into a unit of its own, as narration; and clarity (`bones/clarity.ts`) asked "We shut at nine. Nobody was in after that." to say ten, which "after that" says, as it already took "till eleven" to say every hour before it.

### 1.8 Choices beyond the spec

1. **The one-liar night is made from the two-liar night, not dealt on its own**: so every one is, provably, a night the old generator accepts with its second lie dropped (§2), and a two-liar night is word for word what it was.
2. **A one-liar night that fails a gate is dealt again** (the next attempt), the spec's "must be dealt again", never handed back as the two-liar night it came from. Over seeds 1–40 none is, both worlds (§2); a seed where one did would get a two-liar night main never reached.
3. **Poached's rating floor gives way** to `rivalsChecked` on one-liar nights (§1.2). The spec's test for a Coddled night is par's content ("catching one lie and closing"), and the reading closest to its intent: otherwise every Poached murder (and most Poached small cases) would always have two liars, and the night's kind would be told by its type.
4. **The refusal shortcut no longer reads the truth's count of liars** from Poached up (§1.3): otherwise it beats par on most one-liar nights, by reading what the player can't know; and with one caught and the rest ruled out it names as the elimination does.
5. **The path breaks the culprit's story while somebody is still unchecked**, where the walks allow (§1.4), as rule 9 already orders two-liar nights: a shortcut that follows the cheapest way should catch a lie it can't close on without checking the rest.
6. **"Proof" is the solver's elimination on what's held** (§1.5): the spec's "placed by a story that stands … or cleared by a list" is exactly what `cleared` holds, at the hours the office gave as what's held narrows them; the narrowed hours, because at Soft-boiled up the hour before the crime is one nobody can vouch for once the window's narrowed, and asking for it would make "Nobody else" unprovable.
7. **The plain line says "whether anyone else lied"**, not the spec's "who else lied": on a night where nobody else lied, "who else lied" says somebody did, and the score line already says "whether anyone else lied" (B9).
8. **The curtain's heading on a one-liar night stays B9's "DID ANYONE ELSE LIE?"**, not "WHO ELSE LIED, AND WHAT CLEARED THEM" (which says somebody did); its line is "Nobody else lied.", as the spec has it, with what was filed, half included.
9. **The stream's salt** (`0x13fd4`) is the first from `0x1a` that keeps the 36 nights the tests and docs/46–68 read by seed (the blind testers' nights, the golden's, the reads quoted) dealt as they were: any salt deals the same share, and this one keeps those references true.
10. **A refuser on a one-liar night is found where they were at the last hour**: the old "back where they say they were" was the lie's.
11. **The shortcut reader follows the designed path**, the cheapest way as the oracle walks it: the measure for "a player who stops at the first lie".

## 2. The dealt boards

`scratchpad/oneliar/dealdiff.mts`, board by board: seeds 1–40, every tier and type, both worlds (docs/62 §2's set), main `444cbc1` → this branch. For every one-liar board it rebuilds the two-liar candidate with **main's own** `buildCase` at the attempt this branch took, runs **main's own** gates on it (the invariants, the rating, `reject`), and checks this branch's board is `oneLiarNight` of it, word for word.

- **Hashes:** dealt 600 `7b413655bf181abb` → `4fb4585bb4150adf`; neighbourhood 600 `1c2bed28c49370c6` → `6fac2173840f859a`.

| tier | dealt boards | the same | one liar | of them main's own board at main's attempt, the second lie dropped | two-liar boards changed | neighbourhood: the same | one liar | of them main's own | two-liar changed |
|---|---|---|---|---|---|---|---|---|---|
| Raw | 120 | 120 | 0 | — | 0 | 120 | 0 | — | 0 |
| Coddled | 120 | 120 | 0 | — | 0 | 120 | 0 | — | 0 |
| Poached | 120 | 77 | 43 | 43 | 0 | 80 | 40 | 40 | 0 |
| Soft-boiled | 80 | 51 | 29 | 29 | 0 | 50 | 30 | 30 | 0 |
| Medium | 80 | 56 | 24 | 24 | 0 | 51 | 29 | 29 | 0 |
| Hard-boiled | 80 | 67 | 13 (of 33 face nights) | 13 | 0 | 66 | 14 (of 31 face nights) | 14 | 0 |

- **Every board that changed is a one-liar night, and every one-liar night is a board main's generator deals, its second lie dropped**: all 183, each at the very attempt main itself dealt (not a later one), its two-liar candidate passing every one of main's own gates (`dealdiff.mts` runs them from main's tree).
- **Every two-liar board is main's**, all 1,017: wherever the seed's draw keeps a night two-liar, it's dealt as before. (Under §1.3's first cut two were dealt again, dealt Poached lost pet 14 and the neighbourhood's Poached lost item 35: their one-liar nights failed the refusal-shortcut gate, by a shortcut that skipped the means, and the next attempt drew two liars. Under the second they are one-liar nights, main's boards with the lie dropped.)
- **Raw and Coddled are main's**, all 480. (A cut before both read every night's count of liars as "can't know", Raw and Coddled's too, and relaxed their refusal-shortcut gate; below Poached a night has one liar, and a player knows it.)
- **The share over these seeds**: 36%, 36% and 30% of nights at Poached, Soft-boiled and Medium in the dealt world, 33%, 38% and 36% in the neighbourhood; at Hard-boiled 16% and 18% of nights (39% and 45% of face nights). Every type gets them at every tier.

## 3. The measures, main → this branch

`npx tsx scripts/board-measure.ts --seeds 50` (`--world neighbourhood` for the second), 50 seeds a tier and type. **Before** is main `444cbc1` with only this build's measure added: the "first liar, nobody else" reader (`playFirstLiar`) and the new columns, nothing else of main's touched (`scratchpad/oneliar/mainm`). Every run held the shared lock, one at a time (`scratchpad/oneliar/measures.sh`, `measures2.sh`; outputs in `scratchpad/oneliar/out/`, tables by `tables.py`).

By tier, every case type together (Raw and Coddled are main's in every column and both worlds: no one-liar nights, and the same boards):

| world | tier | nights with one liar | oracle solved, with the lines | wanderer files solved | hint-taker files solved | **first liar, nobody else: perfect** | its who on the line | its points, mean | the liar did it (a liar at random, docs/46) | the last liar, citing what caught the other (docs/65 §2) | refusal shortcut under par |
|---|---|---|---|---|---|---|---|---|---|---|---|
| dealt | Poached | 0% → 34% | 100% | 0% | 0% | **0% → 1%** | 43% → 65% | 2.53 → 3.14 of 5 | 0% | 0% | 0 |
| dealt | Soft-boiled | 0% → 33% | 100% | 0% | 0% | **0%** | 32% → 56% | 2.44 → 3.08 of 5 | 0% | 0% | 0 |
| dealt | Medium | 0% → 32% | 100% | 0% | 0% | **0%** | 28% → 51% | 2.42 → 3.00 of 5 | 0% | 0% | 1 |
| dealt | Hard-boiled | 0% → 17% | 100% | 0% | 0% | **0%** | 0% | 1.61 → 1.77 of 5 | 0% | 0% | 0 |
| neighbourhood | Poached | 0% → 33% | 100% | 0% | 0% | **0% → 1%** | 43% → 59% | 2.46 → 2.97 of 5 | 0% | 0% | 0 |
| neighbourhood | Soft-boiled | 0% → 37% | 100% | 0% | 0% | **0%** | 41% → 62% | 2.60 → 3.15 of 5 | 0% | 0% | 0 |
| neighbourhood | Medium | 0% → 35% | 100% | 0% | 0% | **0% → 1%** | 33% → 58% | 2.55 → 3.18 of 5 | 0% | 0% | 0 |
| neighbourhood | Hard-boiled | 0% → 20% | 100% | 0% | 0% | **0%** | 0% | 1.64 → 1.91 of 5 | 0% | 0% | 0 |

- **"First liar, nobody else" stays under 10% perfect at every tier from Poached up**: 1% at most, three nights in 900 (dealt Poached lost pet 40, the neighbourhood's Poached lost pet 15 and Medium lost pet 35), each a one-liar night whose designed path breaks the culprit's story at its last step, after everybody else is checked, because no order with as few walks broke it sooner (§1.4; `scratchpad/oneliar/perfect.mts`). Before, it was never perfect: "Nobody else" was always wrong. **Its who on the line** (the name right, on the line that breaks the story: the solved-or-better half of the report) rises with the share, since on a one-liar night the first liar is always the culprit; **its points** rise by half a point or so for the same reason; "Nobody else" on a hunch is half of one, so it never closes the gap to a star. At Hard-boiled it never has who right on its line, before or after: the culprit's clash there rests on a face, which the grid shows only once the player puts the name to it (docs/65 §3), so it walks on past the culprit's story.
- **The oracle** files every night solved, at par, with the lines: "Nobody else" on a one-liar night, held proved (`nobodyElseProved`).
- **The wanderer and the hint-taker** file solved on no night from Poached up, before or after (docs/46's targets: the wanderer under 10%; the reader under 50% at Poached, 20% at Medium, near the wanderer at Hard-boiled). Coddled's hint-taker is main's 2%, and Raw's 100%.
- **The old "liar did it" reader** (docs/46 §4: a liar it caught, at random, with "Nobody else" when it caught only one) is 0% from Poached up, before and after; and so are the first-liar and last-liar readers of docs/41 rule 9.
- **The refuser shortcut** (docs/65 §2, the last liar citing the line the grid showed against the other) is unchanged: 0% from Poached up.
- **The refusal shortcut** under par in actions is main's: the dealt Medium murder that main has too, and nothing else from Poached up (§1.3's second cut).
- **The wanderer's who-right** moves a few points either way (dealt Poached 44% → 43%, Medium 27% → 30%; the neighbourhood's Medium 31% → 27%): a one-liar night has one liar to file and one fewer confront to pick at random.

**Par** (`board-measure`'s per-type rows, and `scratchpad/oneliar/rates.mts` over the same seeds; par in questions, docs/41 rule 16):

| tier | par questions, one liar / two (median) | range, one liar | par in actions, main → branch (median [range]) | what one-liar nights rate |
|---|---|---|---|---|
| Poached | 6 / 7 | 5–7 | murder 12 [12–12] → 12 [10–12]; small cases 11 [10–12] → 11 [8–12] | murders Raw; small cases Raw, or Poached where the crack is the only word on where it went |
| Soft-boiled | 6 / 6–7 | 6–6 | murder 11 [11–12] → 11 [10–12]; lost pet 10 [10–12] → 10 [10–11] (dealt) | Soft-boiled |
| Medium | 7 / 7–8 | 6–7 | murder 12 [12–14] → 12 [11–14]; lost pet 13 → 12 [11–14] | Medium |
| Hard-boiled | 7 / 7 | 7–7 | murder 13, lost pet 12, as before | Hard-boiled |

A one-liar night drops the innocent's confrontation where they'd have owned up (the check is named by their own story now), so par falls by a question at Poached and on some nights above; where they'd have refused, nothing on the path changes. Every one-liar par is inside rule 16's 5–9. The budget is par plus the tier's slack, as always.

## 4. The prose gates, main → this branch

Main's numbers are docs/68's final run (`scratchpad/r7fix/out/br3-*`), on the tree that is main now (`884bcbf` and `444cbc1` are the same tree, and its deal hashes are main's). This branch's are `scratchpad/oneliar/out/br2-*`, on its last code. 30 nights a tier, both worlds; three routes for the lints.

| world | tier | words a page, median | every board-prose lint | list smell, pages (oracle) | pronoun ambiguity, three routes |
|---|---|---|---|---|---|
| dealt | Raw | 106 → 106 | 0 → 0 | 31 of 280 → 31 of 280 | 0 → 0 |
| dealt | Coddled | 102 → 102 | 0 → 0 | 16 of 276 → 16 of 276 | 0 → 0 |
| dealt | Poached | 105 → 104 | 0 → 0 | 30 of 398 → 28 of 385 | 0 → 0 |
| dealt | Soft-boiled | 108 → 106 | 0 → 0 | 30 of 383 → 28 of 381 | 0 → 0 |
| dealt | Medium | 100 → 100 | 0 → 0 | 36 of 441 → 36 of 438 | 0 → 0 |
| dealt | Hard-boiled | 97 → 96 | 0 → 0 | 20 of 435 → 19 of 435 | 0 → 0 |
| neighbourhood | Raw | 123 → 123 | 0 → 0 | 23 of 280 → 23 of 280 | 0 → 0 |
| neighbourhood | Coddled | 113 → 113 | 0 → 0 | 19 of 276 → 19 of 276 | 0 → 0 |
| neighbourhood | Poached | 114 → 115 | 0 → 0 | 43 of 407 → 35 of 391 | 0 → 0 |
| neighbourhood | Soft-boiled | 117 → 117 | 0 → 0 | 55 of 385 → 51 of 379 | 0 → 0 |
| neighbourhood | Medium | 112 → 111 | 0 → 0 | 41 of 436 → 33 of 430 | 0 → 0 |
| neighbourhood | Hard-boiled | 105 → 103 | 0 → 0 | 29 of 435 → 25 of 435 | 0 → 0 |

- **Words a page** move by a word or two from Poached up, each way: a one-liar night has a page fewer (no confront), and the innocent's true story and its check are shorter pages than an owning-up. Words per new fact fall by under a word (dealt Poached 55.9 → 55.1, the neighbourhood's 56.9 → 56.0).
- **Every lint is 0**, both worlds, every tier: board-prose's 30 columns, the hinge lints' 42 rules over three routes (`scratchpad/oneliar/hinge.mts`; main's 0 is docs/68's), the level lint, plain terms, pronoun ambiguity. On this branch's first pass (`br1`) the names-a-page count was 1 in each world, the round trip 1 unclear in 3,710 at the neighbourhood's Medium, and the suite's lints 6 more; §1.7 has each, fixed by rule.
- **Round trip and clarity** (`scripts/roundtrip.ts --nights 30 --routes oracle,wanderer,reader`; `scripts/clarity-measure.ts --nights 30`): every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% in every row of both worlds; clarity's lints 0. The flesh column's misses are main's (Miss Nowak's owning up, the neighbourhood's Poached 2 of 151 and Medium 1 of 123).

## 5. The nights, read

Read in full with `npm run read -- … --curtain`, page by page, on the oracle's route and along the shortcut reader's (`--first-liar`), on this branch's last commit (`scratchpad/oneliar/reads/`). The shortcut reader's pages are the oracle's word for word up to where it stops (checked line for line on Medium 16), so its read is those pages, the report page, the notebook, the verdict and the curtain.

**Poached 6, a murder** (a carving knife from Rafferty's; Steinbach did it; Rosenbaum, who would have owned up to the numbers game at Sokol's, tells the truth; par 11 actions).

- *The office, the scene, the papers, the Bijou's list, Mrs. Rafferty's list*: as any night. Nothing on the first eight pages says how many lied.
- *Steinbach's evening*, page 9, step 4 of 6: "There was a snag. Steinbach had said she was home at Rafferty’s at ten, and Mrs. Rafferty hadn’t seen her there." The turn reads back what's held and what's open: "Steinbach said she was home at ten. Mrs. Rafferty said otherwise. Nobody had told me yet where Rosenbaum was at ten." The culprit's story breaks with Rosenbaum still open (§1.4).
- *Rosenbaum's evening*, page 11: "Seven, I went round to Rafferty’s to return a borrowed umbrella, … At ten I went round to Sokol’s for coffee, and Brennan was there." / "Brennan was in the corner." / "So Vogel had seen the same: the Bijou at eight and at nine; nobody else had said where Rosenbaum was at ten, when Mulcahy died." A true story unbacked, which is what a lie looks like until it's checked.
- *Brennan's evening*, page 12: "Ten, I went to Sokol’s back room to meet Rosenbaum." / "So he told it the same as Rosenbaum: Sokol’s back room at ten. That much checked out."
- *The notebook*: "Martin Brennan: Rosenbaum named him, and says they were together at Sokol’s back room." "How it adds up" places Rosenbaum on Brennan's word.
- *The verdict, the oracle's*: "5 out of 5: who, whether anyone else lied, when, how and why, with the proof for who." / "Did anyone else lie? Nobody else ✓". *The curtain*: "DID ANYONE ELSE LIE? / Nobody else lied. / You picked: nobody else.  ✓". THE LIES has Steinbach's alone. The fastest solve's six steps confront nobody.
- *The shortcut reader's*: it stops after page 9 and files on 8 actions: "4½ out of 5 … (thin)", "Did anyone else lie? Nobody else ½ (right, but you couldn’t have known)", "Right, but you hadn’t checked everyone: half credit on whether anyone else lied.", and behind the curtain "You picked: nobody else, but you hadn’t checked everyone.  ½". Its notebook says what it didn't do: "Rosenbaum hadn’t told me where he was at ten, and neither had anybody who’d seen him."

**Medium 16, a murder** (a revolver from Mrs. Nagy's; Brennan did it; Callahan, who would have refused to say where he was, tells the truth; par 12).

- *Dettweiler's evening*, page 6, has the passer-by: "Walking to the Velvet Room at ten, I passed Brennan on Hester Street. Going fast, no hat." / "I underlined Hester Street, because it was where Lanza lived."
- *Brennan's*, page 10, step 5 of 7: "One thing didn’t fit. He said he was home at ten, but Dettweiler passed him on Hester Street at ten." The turn ends "Nobody had told me yet where Callahan was at ten."
- *Callahan's*, page 12: "…Then at nine I went in to the print shop to set type for the morning, alone, and that was the rest of my night." / "So he told it the same as Brauer: Mrs. Nagy’s at seven, though nobody else had said where he was at ten, when Lanza died."
- *Quill's list*, page 13: "I wasn’t on before ten, so anything earlier I can’t tell you. Callahan and two union men I didn’t know were here the whole time I was on." / "He saw Callahan at the print shop at ten, and the two of them told it the same way."
- *The verdict and the curtain*, the oracle's: 5 out of 5, "Nobody else lied. / You picked: nobody else.  ✓". The shortcut reader's: it stops after page 10, 9 actions, "4½ out of 5", the plain line, "½" behind the curtain; its notebook: "Callahan hadn’t told me where he was at ten, and neither had anybody who’d seen him."

**Hard-boiled 30, a murder, a face night** (laudanum from the Delmonico rooms; Colquitt did it; Hauck, who would have refused, tells the truth; par 13).

- *Ainsworth's evening* and *Feeney's list* (pages 6–7): "Somebody with a bandaged hand came in at ten. That was everybody, all evening." Ainsworth wears the bandage.
- *Colquitt's*, page 11: "She said she was at the Blue Lantern at ten, and nobody had backed it up." Her story breaks only on the face (docs/65 §3: no clash is shown until the player puts the name to it), so the grid shows nothing here.
- *Hauck's*, page 13: "At nine I went round to Sokol’s for coffee, by myself, and I didn’t budge the rest of the evening." / "He said he was at Sokol’s back room at ten, and nobody had backed that up yet." *Petrosino's list*, page 14: "I came on at ten o’clock; I can’t speak for anything before that. Hauck was in as long as I was." / "So he was at Sokol’s back room at ten."
- *The verdict*, the oracle's: 5 out of 5 on Ainsworth's line, "Nobody else ✓"; *the story*: "Feeney, the doorkeeper, hadn’t seen her there, only somebody with a bandaged hand, and Colquitt was in a sailor’s pea coat."; the curtain: "Nobody else lied. / You picked: nobody else.  ✓".
- *The shortcut reader's*: the grid never shows it a lie (the culprit's rests on an unmatched face), so it walks the whole path, holds the proof, and names the form's first suspect: "2 out of 5 … (wrong-man)", "Did anyone else lie? Nobody else ✓". The face is still the night's deduction.

Nothing on any of the three nights assumes a second liar: the office, the turn (it reads back what's held and what's open), the curtain, the story ("Asked, she said she had been home at ten. Mrs. Rafferty, the landlady, hadn’t seen her there."), the fastest solve.

**Seen while reading, and left alone** (the prose build's, or main's on any night): Petrosino, a woman, is "the man who takes the slips" in the arrival at Sokol's back room (Hard-boiled 30, page 12: the keeper's job is written for a man, and only the People list turns it); Medium 16's fastest solve, step 4: "Brauer walked over from Mrs. Nagy’s at ten: ask Brauer who she passed on the way", of somebody who passed nobody (docs/68 B4's reason, for any account with a walk at the hour at Medium).

## 6. Played by hand

Through `npm run play`, Medium 16, every page read, one save forked after Brennan's evening (`scratchpad/oneliar/play/`).

- **Without the proof** (`m16b`: the scene, the papers, the Velvet Room, Dettweiler, Ainsworth, Brauer, Brennan's flat, Brennan; Callahan never asked). `close "who=Brennan; proof=2; other=nobody; when=10; how=revolver; why=1921"`:

  > Did anyone else lie? Nobody else ½ — right, but you couldn’t have known
  >
  > 4½ out of 5: who, whether anyone else lied, when, how and why, with the proof for who.
  > Right, but you hadn’t checked everyone: half credit on whether anyone else lied.
  > 9 actions.

  No star. `curtain`: "DID ANYONE ELSE LIE? / Nobody else lied. / You picked: nobody else, but you hadn’t checked everyone.  ½".

- **With the proof** (`m16a`: on from Brennan's to the print shop, Callahan's evening, Quill's list), the same `close`:

  > Did anyone else lie? Nobody else ✓
  >
  > 5 out of 5: who, whether anyone else lied, when, how and why, with the proof for who.
  > 12 actions.
  > ★ Gold star: a perfect report, with no hints.

  `curtain`: "DID ANYONE ELSE LIE? / Nobody else lied. / You picked: nobody else.  ✓".

## 7. Tests

**896** in 34 files (main's 887 in 33, and 9 new), all passing at three workers (`npx vitest run --minWorkers=1 --maxWorkers=3`, 4½ minutes under the shared lock); `tsc` is clean; `npm run build` works. New, `test/one-liar.test.ts` (9):

- **the share by tier**: none at Raw or Coddled; 20–50% from Poached to Medium over seeds 1–30, every type getting some; no pair night, and 25–75% of face nights;
- **a one-liar night is a night the old gates accept, its second lie dropped**: for every one-liar night in seeds 1–10 from Poached up, the two-liar candidate at its attempt rates its tier and passes `reject`, and the night is `oneLiarNight` of it, with nothing else changed (the innocent's story at the lied hour is the truth, no confrontation for them, the culprit's lie alone, no lead);
- **a one-liar night's invariants**: every invariant, `rivalsChecked` included; from Soft-boiled up it rates its tier, at Poached at most Poached; par 5–9; every rival placed away on the path; the refusal shortcut never under par (the solver's and the engine's);
- **the rivals' check is an invariant**: a path cut to the culprit's broken story fails it; `twoStories` says nothing on a night with one;
- **"Nobody else" full, half and zero**: the oracle's report on a one-liar night at every tier from Poached up is solved with a star; the shortcut reader's "Nobody else" before everybody is checked is half, says so, and earns no star (more than five nights); "Nobody else" on Poached 17, a night with two, is wrong;
- **the curtain on a one-liar night**: "DID ANYONE ELSE LIE? / Nobody else lied. / You picked: nobody else.  ✓", the half and the wrong forms, THE LIES with the culprit's lie alone;
- **the CLI**: Medium's `close "…; other=nobody; …"` with the proof (5 out of 5, ✓, the curtain's ✓) and without (4½ out of 5, ½, the plain line, the curtain's ½);
- **the pages assume no second liar**: Poached 6 (Brennan met by Rosenbaum's story, no "had named"; the turn says who's still open; no confront of Rosenbaum anywhere);
- **"first liar, nobody else" under 10% perfect** at every tier from Poached up, 16 seeds a type.

Updated: `round7.test.ts` (B9's one-liar night is dealt now: Poached 6, not a constructed deal; the curtain's "Nobody else lied."), `other-liar.test.ts` (its two-liar tests read nights with two), `board/generate.test.ts` (the Tatham floor and the two-stories tests on nights with two; a Poached one-liar night's `rivalsChecked`).

## 8. What's open

In docs/25 too.

- **Round 8's blind playtest** should deal at least one one-liar night, unannounced: whether testers answer "Nobody else" only after checking, and whether it reads as a real answer. None of the testers' nights is a one-liar night (§1.8 9).
- **Poached's floor** (§1.2): Poached one-liar nights finish on Raw's techniques; `rivalsChecked` stands in. Dealing fewer, or rating them Coddled, would make every Poached murder a night with two again, and the night's kind would be told by its type. The designer's call.
- **"Nobody else" at the narrowed hours** (§1.8 6): the proof is the elimination at the hours what's held leaves; a player who never narrows a two-hour window has to place everybody at both, which the hour before nobody can always vouch for.
- **The curtain on a one-liar night** says nobody else lied and what was filed, not what placed each of the others; it could list them, as "What cleared them" does on a night with two.
- **Saves from before this build** replay on the seed: the one-liar boards (183 of seeds 1–40's 1,200) are other nights now, and a save that confronted the innocent there won't replay.
- **The book** (`ui/report.ts`) shows the half on "Did anyone else lie?" as it shows a half on who ("Nobody else — right, but you couldn’t have known ½"); not looked at in the browser for this build.
- **Seen while reading, left for the prose build** (§5): a woman numbers keeper "the man who takes the slips"; a Medium fastest-solve step asking somebody who passed nobody "who she passed on the way".
