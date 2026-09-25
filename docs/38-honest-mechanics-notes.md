# 38 — Honest mechanics: notes

*Branch `honest-mechanics`. Three blind playtesters (LLM agents playing through `npm run play`, seeing only what a player sees) all solved their cases, used every call doing it, and called the game "opaque more than hard". This branch fixes the eleven things they found. They were bugs, not design questions. Every fix covers v1 and v2 wherever the code is shared, which is nearly everywhere.*

## The eleven, one by one

### 1. "Free" labels that lie

A button's minutes already came from `priceOf`, the same function `step` charges by. A new test walks 14 nights (v1 and v2, Raw to Medium, questions preferred so the allowances get spent) and steps every choice on every page. It found **no** case where the label and the clock disagreed. The lie was a different one. Every one of the client's topics read `free`, and so did every topic of a fixture who knows the detective. Only the first one or two actually were. After that, the rest cost a call without warning.

- `OfferedChoice.freeNote`: a choice that is free only because it spends an allowance says which one. The client's reads "free — 2 left on the house", then "free — the last one on the house". The free first question to somebody who knows him reads "free — first question only". `costLabel(choice)` in `choices.ts` is the one place this text is written; the book (`src/ui/choices-view.ts`, including the aria-label) and `npm run play` both print it. The label goes as soon as the allowance is spent, and the next page prices those topics at the full cost.
- `thought.json` tht-167 used to say "and I had half an hour less" about a question that had cost nothing, and a call is not half an hour anyway. It now says "and said so plainly".
- Test: `1. a cost label is what the reducer charges` (over 2,000 choices stepped; also checks that a `freeNote` appears exactly when the price spends an allowance), and the house/familiar sequence on seed 11.

### 2. Asking the client about herself ended the interview

The second free question set `clientInOffice = false`, and the client walked out mid-list. Now the client stays in the chair until the detective walks out. The first two questions are still on the house; after that, a question costs what any question costs, and the button already says so (item 1). On the last free question the client says where to find them later, then stays (`CLIENT_STAYING`, reached through a new `clientWhere` flag on the ask scene). `test/game/office.test.ts` has been rewritten to match.

### 3. Choice numbers renumbered after a free action

`stableChoices(view, state, previous)` in `choices.ts` works on any page that cost nothing and left the detective in the same room (`freeStep`). Such a page keeps the layout of the page before:

- every choice stays where it was;
- a choice that would have dropped out stays listed, re-priced and marked ✓ done. That covers the client's rundown once given, "Go on" once gone on, and a lead once taken;
- a new choice goes at the end of its group;
- a new group, such as "Put it to …" after an account comes in, goes just before the free row.

In `npm run play`, a choice also keeps its number from the page before, and anything new is numbered after everything that was already there. So a plan like "do 24" still means the same button after a free page. The book lays out the newest page from the offered list on the page before it (`Page.offered`, which it already kept), so the buttons don't move either. After a page that cost something, or after a walk, the page's own order applies again.

Tests: in `3.`, `npm run play` on seed 21 (Medium, v2) walks to the Lyric stand, takes the free rundown, and checks that every number still names the same choice and that the rundown is listed ✓. A second check runs over the oracle's nights and confirms that every free page keeps every earlier choice, in the same order.

### 4. Searching marked objects done while the page said they were left alone

The reducer's rule is that a room gives up everything to the first search, the things in it included, so those things really are done. What was wrong was the text. `LEFT_ONE`/`LEFT_TWO` (voice-data) and the search sheet (`content/sheets/search.json`: sea-a, sea-c, sea-d callbacks, and sea-c's "one thing, not the whole of {place}" join) now say the detective went through them with the rest of the room. Searching one thing reads as starting there and then doing the rest. Something a find says is missing (the chloral "gone from the third floor"), and the thing the case is about (the cat), is no longer listed among the room's things, offered as a button, or "gone through" (`goneObjects`, `derive.ts`, used by the notebook, `knownObjects` and the search plan). This also closes the docs/25 read-through item "chloral both gone and present on one search page". Test: `4.` scans every search page of 56 nights for "left them where they were" and similar lines.

### 5. The narrator stated facts the player hadn't found

**The check.** `checkClaims` in `correspond-pages.ts` is part of `checkRun`, as rule `claim-unheld`. It reads each block's narration sentence by sentence, with speech set aside. If a sentence says a suspect's tie to the victim ("Ruggiero paid Lefkowitz for a clean inspection", "Petrosino was Lefkowitz's landlord") before the notebook holds that tie, it fails. The notebook holds a tie once a clue carrying it is in hand (`relationHeld`: the dossier's layer 2, or the client, whose brief said it). This applies to the tiered game, which is every case the book and `npm run play` open. The untiered game, M8's golden night ("Sweeney had a secretary. Hanrahan."), deals each suspect's tie as known from the start, and it still does. A witness saying it out loud on the same page also counts. `checkRecap` has a second new check: "only seen, at X" must name a room a page actually showed that person in.

**The sources.** All of them now ask `relationHeld` (`scene/people.ts`):

- **Bridges** (`bridge.ts`): the tie to the victim only when held. Otherwise the subject is described by their post, or by the hour.
- **The question that carries its reason** (`plan.ts`, `carried`): "the notebook knows why that subject matters" now means the notebook holds it, not just that it is true.
- **A name's first clause** (`text.ts` `nameables(view, found)`, used by `realize` and by coverage): a suspect whose tie isn't held is introduced by their line of work, which the notebook's list of people already prints. That gives "Marchetti was a switchboard operator", not "Marchetti used to work for Sirkin".
- **Recaps** (`recap.ts` `shownPlaces`): "shown in person" now means the room's roll, the rundown, or the person spoken to or confronted. It no longer includes the person a question was only about. "Only seen, at X" names a room they were actually shown in.
- **Sheet texts and the arrival observation** already went through `knownTie`, which already waited for the same layer-2 clue.

With the gating switched off, the new check finds 313 unheld claims across 8 seeds of every configuration. With it on, it finds 0. Test: `5.` runs over whole nights, plus a unit case showing that the check catches a claim and lets a spoken one through.

### 6. Anchors that happen more than once

The chosen rule: **the page names which occurrence, and the grid shows what is known of the anchor's hours.** Nothing claims an anchor happened only once.

- **Scene facts.** Each recurring anchor's scene fact (`src/gen/data/anchors.ts`: the beat cop, the El, the bells, the milk wagon, the dumbwaiter, the whistle) now says this was one occurrence of several. For example: "The whistle went off the river at half past eight, two long and one short. The boats sound it more than once in an evening, and the log has that one at half past eight." The dumbwaiter's "as it is on the hour and the half hour" was also simply wrong: it runs every hour and a half. It now reads "one of the times it is worked in an evening".
- **The recap.** For a recurring anchor it says "went at half past eight, one of the times it goes in an evening" (`RECAP_ANCHOR_AGAIN`), not "was at half past eight" as if that were the only time.
- **The grid** (`grid.ts`). The hours of an anchor-timed sighting now come from the `anchorAt` facts in hand *and* from any found clue that names one of the anchor's hours in words, which is how the scene clue does it. An anchor that happens once is then timed, and its sightings are placed on the grid. An anchor that recurs shows "8:30 was one of its hours; the others are not known" until a timing clue gives all of them ("6:30 or 8:30 or 10:30"). It never shows "hour not known" when the page stated an hour. That text is `GridMargin.when`, shared by the book's grid and the text grid.

Test: `6.` checks that every recurring template says it recurs, and that no margin reads "hour not known" (or is pinned to one hour) while a clue in hand names one of its hours.

### 7. The grid's "counted" row

Each half hour's cell was ten characters wide, so it printed one count and cut off the rest. The row now prints a line per count, every one the notebook holds, with duplicates dropped. "Nobody came into X" also counts as a count (`X=0`), and so does "nobody but Bellucci" (`X=1`) (`grid.ts`, from `absentFrom`). The key says: "P=n is n people at P besides the one who works there; a blank is not counted yet". Test: `7.` checks that the number of counted cells equals the number of counts, and that every absence is counted.

### 8. "Accounted for" never updated

The panel only ever listed secrets explained. It now also lists everybody the notebook's facts keep out of the scene at every half hour the crime could have happened in, on two facts that agree. That is M10's rule: the generator's `clearedBy` with two clues or more, such as someone's own account and a sighting inside it. It applies at every tier (`accountedFor` in `m9.ts`, used by `notebook.ts`).

**Note on "the same rule the thoughts use":** the pages' own "That cleared X" (`clearedOnTwo`) adds one more condition: the second fact must be about the crime's half hour itself. Across 2,796 states of oracle and wandering nights (30 seeds each at v1 Raw, v1 Coddled, v2 Raw and v2 Medium), that condition was **never** met. So a panel using exactly that rule would still read "nobody yet" all night, which is the bug that was reported. The panel uses M10's rule. The test checks that everything a page clears is on the panel, and that the one who did it never is. At the end of the oracle's route the panel reads "Abramowitz, Fairbanks" (seed 11 Raw), "Ruggiero, Lanza" (seed 21 Medium) and "Crowninshield, Vitale, Steinbach" (seed 3 Medium). Whether the verdict thoughts should relax to the same rule is a design question, left open.

### 9. "His/her evening" for watchers

In a tiered case, "their evening" is offered only to somebody who has an account (`accountClueOf`). A watcher at their post isn't offered a button that could only ever answer "I can't help you there". Test: `9.`

### 10. Contradictions and mis-summaries, fixed by class

- **An empty doorway summarised as a list of names.** "Hargrove named who came into the Lyric stand at half past seven, and nobody else", after "nobody came in". An absence that names nobody but the watcher now has its own thought basis, `empty` (schema value added). tht-m010 moves to it, and two new cards (tht-m010b, tht-m010c) join it. The "named / short list" cards are dealt only when somebody was named.
- **A jealousy with two rivals.** A backstory that puts a romantic third party between a jealous suspect and the victim ("separated over {third}", "before {third} came along", "{third} turned {victim} down", "sweet on") now names the person the motive is jealous over (`DossierInput.jealousOver`). The random draw is still taken, so the case is dealt draw for draw.
- **Two age bands for one face.** A stranger's sighting from somebody who knew the face used the acquaintance edge's reference in the record ("a man in his forties I know by sight": a finer age than the witness gave, in the first person, inside reported speech). The record now uses the fact's own description, the same words the spoken answer and the grid use: "…a man over forty, one he knew by sight, at the Keystone…" (`gen/logic/rules.ts`; `telling.ts` reads the new marker).
- **"Held the mortgage" and "owed him $4,000" for the same pair.** Between a creditor or landlord and the victim, the debt motive's wording is turned around: the victim owed *them* ("was owed four thousand dollars by Lefkowitz…", an IOU signed by the victim). This is `MotiveTemplate.owedTo`, applied through `motiveWords`. Only the words change. The motive type and its draws are the same, because 260 of 1,400 cases combine these ties with a debt motive, and removing the combination would have changed the cases themselves.
- **"Lefkowitz was found at Lefkowitz's place."** `ownerOnce` (`gen/place-names.ts`) changes a later "X's …" in a sentence that has already named X, with nobody else named in between, into "his/her …". It also drops "X's rooms at X's place" down to "X's rooms". It runs on clue text, on the discovery line, and on every page's blocks (`nameFirstMentions`). A colon counts as a sentence break, so "Found at X's place:" stays whole.
- **A suspect "in custody" at the cab stand.** The frame trope said the precinct "had somebody for it inside the hour" and that the framed person "has been saying so since Tuesday", on a night when they are out in the neighbourhood (and the murder was tonight). It now says the precinct "settled on somebody for it inside the hour", that the weapon was found in the framed person's rooms "though nobody has come round to pick him up yet", and that the framed person "says so to anybody who will listen". The story deck's line matches.
- **"It went at half past eight… would have done it before then."** "Dead by T" includes T. Every dead-by thought for every case type now says "by then", "up to then" or "no later than that", never "before then" (14 cards).
- **"A reason to want Wehrle gone" in a lost-cat case.** The two motive cards with "want {victim} gone" (tht-062, tht-071) are tagged `case: murder`. A test keeps murder-only words out of every thought card that any case can be dealt.
- Found while playing: the rundown's opener was punctuated "“Sit. I'll save you some walking.” He said." It is now "“…some walking,” he said."

### 11. Par and budget disagreed

The curtain printed the generator's par and budget (`kase.par`/`kase.budget`), while the clock, the verdict and the closing used the game's (plus the walk from the office): 8/5 against 9/6. The truth sheet now prints the night's own numbers (`gamePar`, `gameBudget`) everywhere, with slack = budget − par. It also leaves out the dials' targets (a par band, a level's slack), which were two more numbers that didn't match. `describeDials(d, { targets: false })`. Test: `11.`

## Where it lives

| file | what |
|---|---|
| `src/game/choices.ts` | `costLabel`, `freeNote`, `stableChoices`, `freeStep`; no evening for somebody without one |
| `src/game/reducer.ts` | the client stays; `clientWhere` |
| `src/cli/play-lib.ts` | the page states kept per page; stable numbers; `costLabel` |
| `src/ui/book.ts`, `src/ui/choices-view.ts`, `src/ui/grid-view.ts` | the book lays out free pages from the page before; the allowance on the button; the margin's hours |
| `src/game/correspond-pages.ts` | `checkClaims` (`claim-unheld`); "only seen" checked against the rooms shown |
| `src/game/scene/people.ts`, `bridge.ts`, `plan.ts`, `text.ts`, `coverage.ts`, `realize.ts` | `relationHeld`, and every narrator source of a tie gated on it; client staying line; rundown punctuation |
| `src/game/recap.ts` | `shownPlaces`; recurring anchors |
| `src/game/grid.ts`, `grid-text.ts` | anchor hours from the page, `GridMargin.when`; absences as counts; the counted row a line per count |
| `src/game/m9.ts`, `notebook.ts` | `accountedFor` |
| `src/game/scene/thought.ts`, `content/decks/thought.json`, `content/deck-schema.json` | the empty doorway; dead-by wording; murder-only motive cards; tht-167 |
| `src/gen/data/anchors.ts` | recurring scene facts say they recur |
| `src/gen/dossier.ts`, `cast.ts` | one rival for one heart |
| `src/gen/data/motives.ts`, `cast.ts`, `clues.ts` | the debt the other way round between creditor and debtor |
| `src/gen/logic/rules.ts` | a stranger's sighting in the fact's own words |
| `src/gen/place-names.ts`, `clues.ts`, `victim.ts`, `scene/place-names.ts` | `ownerOnce` |
| `src/gen/tropes/the-frame.ts`, `victim.ts`, `content/decks/story.json` | nobody in custody who is on the street |
| `src/sheet/truthSheet.ts`, `src/gen/shape.ts` | the night's par and budget on the curtain |
| `content/sheets/search.json`, `src/game/voice-data.ts` | the search says what it went through |
| `test/honest-mechanics.test.ts` (new), `test/game/office.test.ts` | 20 tests, one or more an item |

## Checks

- **Played**, with `npm run play` on the three nights the testers had (all `--engine v2`). Seed 11 at Raw: every client topic reads "free — 2 left on the house" and then "the last one on the house"; after both, Abramowitz stays in the chair and says where she'll be; her other topics read "free — first question only". Tillman, the landlady, is offered no evening. The room search goes "through them both with the rest of the room". The owner's cat is not listed among Wehrle's things. At the end the panel reads "accounted for: Abramowitz, Fairbanks", and the curtain says par 6, budget 9, the same as the clock and the verdict. Seed 3 at Medium: the whistle is "the one at half past eight" of several; the grid's margin reads "8:30 was one of its hours; the others are not known"; the counted row carries every count, a line per place; Marchetti is "a switchboard operator" until a clue gives her tie; Sirkin "was found at his place". Seed 21 at Medium: the rundown is taken free and every number on the page stays put, with the rundown now ✓; the bridge calls Petrosino "the owner of the block at the Keystone" until the notebook holds the mortgage; the precinct has "not troubled to pick them up".
- **Tests.** `test/honest-mechanics.test.ts` (new, 20 tests), plus updates to `test/game/office.test.ts` (the client stays), `test/sheet.test.ts` (the night's par and budget), `test/grid-walk.ts` (an absence is a count; an anchor that happens once is timed by a clue that names its hour) and `test/fixtures/m7-baseline-hashes.json` (rewritten; 587 of 600 cases changed wording, and `test/structure-identity.test.ts` still matches every one of them). Full suite (`npx vitest run --minWorkers=1 --maxWorkers=3`): 54 files, 973 of 973 passing. After that run the precinct line was cut short and the hashes rewritten again; the four files that touches (m7-identity, structure-identity, honest-mechanics, office) were re-run: 44 of 44.
- **Correspondence.** `scripts/page-correspondence.mjs` (v1, 40 seeds × 3 difficulties, oracle and wandering, plus every trope): **0**. The same sweep over v1 and v2 tiers (8 seeds each, oracle and wandering) adds the new `claim-unheld` rule: **0**. It still shows the 16 `unknown-name` findings that `main` shows (words from the v2 book's motif and gag lines, "Upstairs", "Horses", "E", which the vocabulary doesn't read yet). Those predate this branch and aren't touched here.
- **Reader lint:** 0 across those nights. **Beat coverage:** 13,010 of 13,010 required beats written, with 0 coverage issues. **Plain terms:** `npm run decks` finds 0 banned terms, and the plain-terms test passes.
- **The v2 design test** (`npx tsx scripts/diagnose-play.ts --design --seeds 50 --configs T0,T2L2,T4L2,T5L2 --engine v2`), `main` against this branch:

| tier | marks-follower names the culprit | reasoning player right within budget | button-pusher | facts put / run | median calls to solve | par / budget |
|---|---|---|---|---|---|---|
| Raw | 26% → 26% | 100% → 100% | 48% → 50% | 0.0 → 0.0 | 7 → 7 | 7/10 → 7/10 |
| Poached | 28% → 28% | 98% → 98% | 20% → 20% | 0.9 → 0.9 | 10 → 10 | 9/15 → 9/15 |
| Medium | 26% → 28% | 88% → 88% | 18% → 18% | 1.7 → 1.7 | 17 → 17 | 15/22 → 15/22 |
| Hard-boiled | 16% → 14% | 78% → 78% | 16% → 14% | 3.7 → 3.7 | 23 → 23 | 19/28 → 19/28 |

The reasoning player is unchanged in every cell, because the puzzle is unchanged: the case structure is identical, and only words, labels and layout moved. The marks-follower moves by one seed in 50 at Medium, and back by one at Hard-boiled. Every target still holds.

## Not done

- The verdict thoughts' own "That cleared X" (`clearedOnTwo`) keeps its stricter per-hour rule, which in practice never fires (item 8). The panel now lists what the notebook clears. Whether the pages should say it on M10's two-fact rule is a design question.
- Thought cards that repeat `{subject}` three times ("That was who Abramowitz said Abramowitz was. It was not where Abramowitz had been…") read badly. That's a separate pass over the thought deck.
- "Why I was hired", asked of a v2 client, gets "I've told you what I know". It's labelled free, and it is free, but the button does nothing useful. Left as it is.
