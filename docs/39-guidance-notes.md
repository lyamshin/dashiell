# 39 — Guidance: notes

*Branch `guidance`, built from `docs/39-guidance.md` after `honest-mechanics` landed. Three blind playtesters solved their cases, used every call, and called the game "opaque more than hard". This branch builds all five sections of the spec. Everything new that a page says or marks is read from the notebook and, in v2, the deduction graph; nothing is marked as "the one that breaks it" from Poached up.*

## 1. Confront help, by tier

**Raw and Coddled: the ready-made confrontation.** When a fact in hand really breaks somebody's own account, the page offers it as its own choice, with the fact named:

> Put it to Rafferty: Tillman says you weren't at the Garibaldi at eight o'clock and half past eight.

- "Really breaks" is the reducer's own judgement (`judgeConfront`), run over the facts that could (the confrontation's written-out ways in hand, what contradicts a second story, and what the solver says breaks the claim). So a ready-made confrontation always lands; a test steps every one offered over 48 nights and checks it.
- One a person. A fact behind a soft mark on the grid (§3) comes first, so the mark and the button say the same thing.
- The label is written from the part of the fact read to them, in the second person, with only the half hours of their story it touches: "Tillman says you weren't at …", "Tillman saw you at …", "Tillman says nobody came into … at …", "Hargrove counted one at …".
- It costs what putting that fact costs (a call; free as the second fact of a confrontation that just landed). It is never starred.
- `readyConfronts` in `src/game/guidance.ts`; the group is `kind: 'put'` in `choicesFor`.

**From Poached up: the focused picker.** "Put it to …" opens on only the facts about that person at the half hours their own account covers — about them, about the room they said, or placing somebody they said they were with — grouped by the half hour under a heading of what they said ("8:30 · she says the third floor"). Nothing is marked or ordered by whether it breaks anything. "Everything else in the notebook (N more)" is one tap away. A second story, once told, replaces the first for its hours; what they gave up is theirs no more (`claimedNow`, `pickerFocus`; `OfferedChoice.focus`). Raw and Coddled keep the whole list.

**A landed confrontation looks like one, at every tier.**

- The page says the story broke, after their words (`LANDED` in `realize.ts`, chosen by a hash of the night so no card draw moves): "That was a hole in the first story, and she knew it." The culprit's silence reads as refusal on a broken story: "It wasn't an answer. It was a refusal, from somebody whose story had a hole in it at eight o'clock and half past eight and knew I'd seen it." A story that held says the fact and the story can't both be right.
- The notebook records it under the person: "put to: Story broke on Tillman's word: the Garibaldi, 8:00–8:30 PM. Rafferty has nothing more to say about it." (or "Kept to …, against …'s word"). The book's notebook page now shows these at all (it didn't before: only `npm run read` printed them).

**In the play CLI.** The ready-made choice is numbered with the rest. `confront X` from Poached up prints the focused list and "Everything else in the notebook (N more)" as a number; choosing it opens the rest (`PlaySave.pickerAll`). The confront button's line says what it opens.

## 2. Stars follow the deduction

**v2.** A star marks a lead the notebook has opened — a question that takes one, a walk to where one waits — that brings a fact an open step of the deduction graph rests on, or a fact on a rival's route not yet held in full. At most three a page (`STAR_LIMIT`), a question here before a walk, the step nearest the bottleneck first (then the lies in the order they can be caught, then the steps under the report's targets), and never two stars for one fact: the first question to somebody brings their evening whatever it is about, so the question that brings the most carries the star. A walk is starred only for what the page it leads to would then offer (`reachableAt` asks the same topic lists from there), and never for something that can be had without walking. A lead to a dead end is still offered, and not starred. `graphStars`, `openFactRanks`; `restar` in `choices.ts`.

- **The client's pointer** is never starred for being the client's: it is a lead like any other and carries the star only when what it points at serves the graph. On seed 3 at Medium the office no longer stars the kiosk (Steinbach, the client's pointer); it stars her evening, the third floor and the Velvet Room.
- **The watcher's room.** A watcher at their post is now asked about the room they keep ("Ask Rafferty about the third floor"). In a tiered case no room was ever a topic, and in v2 no lead pointed at a watcher's counts, so the counts the lie rule is built on were out of reach unless a lead happened to open them. On the first visit it is starred first when what it brings serves the graph. The page's reason says so: "Nobody had sent me. Nobody had to: Rafferty kept the third floor, and people who keep a room count it." (v2 only; the untiered game keeps its own lines.)
- **What watchers are good for.** The first page of the night that meets somebody posted at a room says so once, in his voice, by their trade (`content/books.json` `watchers`): "A landlady who sits on her stairs knows who used them. Names, maybe not." (`bookPass`).
- **"Why I was hired"** is offered to a v2 client only while it would bring something the notebook lacks. Before, it brought her evening on the first ask (spending a question on the house and reading "Nobody had asked me to. I asked Hauck about why I was hired anyway"), and "I've told you what I know" after.

**v1** keeps its leads; a lead that only the client's pointer opened ("start with Fairbanks") is no longer starred (`clientPointerOnly`). The room it happened in, which the briefing names, keeps its star.

**Why leads, and not every choice that brings a graph fact.** Starring any choice that brings a fact an open step needs was tried first. It broke the design test at Raw (the marks-follower named the culprit 100% of the time: at Raw the graph is three steps, and following it is solving it) and cost the reasoning player 20–40 points from Medium up (stars on the bottleneck's facts sent it to rooms whose questions it could not yet ask, and back). Leaving the lies unstarred fixed Raw but not Medium; adding rivals' other routes and restricting stars to leads the notebook has opened fixed both. The designer's instruction was "if it breaks the bound, prefer fewer stars"; this is fewer stars, and each one earned by the graph.

## 3. The grid shows what should jump out

`softMarks` in `guidance.ts`, on `GridCell.hints` and `GridView.hints`, at every tier:

- **A missing sighting: "? not seen by Rafferty".** A witness who was at a place at a half hour (at their post, by their own word, or by somebody's sighting) and who has told the notebook who they saw — of this person, or of that room at that half hour — without naming somebody who claims to have been there then. No mark where the witness said outright they weren't there (that is already ink), or where the witness saw a stranger there (that link is the player's to make).
- **A count that doesn't add up: "counted 1, 3 claim it".** A head count (or "nobody but …") at a place and half hour lower than the number who claim to have been there, the watcher aside. Every claimant's cell gets it.
- At Raw and Coddled a mark also makes the ready-made confrontation available when its fact really breaks the account (§1); from Poached up the mark is the only help.

In the book the mark is a dashed chip in the cell ("? R", "1 of 3"), with the full words on hover, in the cell's spoken label and in its detail ("Something to think about, not a fact."). In the text grid it is `?not:R` / `1<3#` in the cell, a "MARKS TO THINK ABOUT" list under the grid, and a line in the key.

## 4. Fewer quips, cleaner testimony

**About one joke a page.** A card can carry a top-level `"joke": true` (documented in `content/deck-schema.json`; `npm run decks` rejects any other value). 1,029 cards in 29 decks are tagged, by reading them: every `close` card (209), most of `look` (113 of 125), `character` 286 of 680, `activity` 92 of 374, and smaller counts in errand, place-ambient, establish, grounding, tail, search-act, hours, try, carry, watch, crowd, approach, recap and thought. Every role keeps at least one plain look and street line, because a first sight needs one.

The page's dealer keeps the count (`voice/cards.ts`): a joke card dealt, a sheet line flagged `joke`, a closing line, a joking activity tail, a recap's starred aside. Once the page has told one, it deals only plain cards; an optional hole (tail, close, try, look, note, texture, crowd, character) goes without, and a hole the page needs takes a joke rather than break (none did in the sweeps). A callback that pays off the card that told the joke is the same joke; on a page rolled for a callback, the joke is held for the payoff. Two new sheet keys keep M13's callback share (about 0.60, inside the test's band) and the plain floor: `plain` on a joke line (the line said without its joke) and `quiet` on a close (a plain last line for a page that has had its joke; written for the seven company sheets).

| tagged jokes per page | main | this branch |
|---|---|---|
| 576 v2 pages | 2.30 on average, 391 pages with more than one | 0.84 on average, never more than one |
| seed 3, Medium (14 pages) | 2 1 1 5 2 6 2 2 2 1 4 1 2 3 | 1 on every page |
| seed 21, Medium (15 pages) | up to 6 on a page | 1 on every page but one, which has none |
| seed 11, Raw (7 pages) | up to 5 on a page | 1 on every page |

Not counted: the office's own decks (office, entrances, hiring), so page one keeps its humour; hand-written engine lines; and the v2 book's once-a-night lines (motif, tell, the turn's close, the gag), which are added after the page is written.

**Testimony without time lists.** A witness's negatives are no longer recited as spans (`telling.ts`, `NOT_HERE` in `voice-data.ts`). The golden's "Not here." is said only where every other half hour really is one; a witness who was away for part of the evening says "Any other time I was here, he wasn't."; a half hour inside the coroner's window as the notebook holds it gets its own sentence with weight ("Least of all at half past eight."), never the crime's exact half hour as such; another place gets its own plain sentence.

- Before (seed 21, Medium, the counterman on Ruggiero): "Not here from six until half past or from half past eight until half past eleven. Not at the El at eight o'clock."
- After: "Not here. At eight o'clock I was at the El, and he wasn't there either."

**Thought cards that said a name three times.** 24 thought cards use `{he}`/`{him}`/`{his}` after the first `{subject}` (thoughts gained the `his` slot): "That was who Abramowitz said she was." One card that said a place twice, where the place was named after a person ("Mrs. Bledsoe's"), was fixed too.

**Confront closes.** The five quiet closes that read as nothing happening ("Nothing new went into the notebook under {subject}. I made a small mark so I would know I had asked.") now read as a refusal on a broken story ("Under {subject}'s name I wrote that the story had broken, and that {they} would not say where {they} had been instead.").

## 5. Teach once

A short, skippable page before the office (`TEACH_LINES`, `teachOn`): four lines in his voice — the lie rule; watchers count their rooms; a story that breaks is worth putting to them; the grid is your board. The book shows it on a new case (not a resumed one) on a profile's first night, and every night on the first tier until the first clean report; "Up the stairs to the office" or "Skip" goes on. `npm run play -- new` prints it before the office (the tool keeps no profile, so every night is a first night); `--no-teach` leaves it out.

## Checks

- **Tests.** Full suite (`npx vitest run --minWorkers=1 --maxWorkers=3`): 56 files, 997 of 997. New: `test/guidance.test.ts` (15 tests: every ready-made confrontation offered over 48 Raw and Coddled nights, v1 and v2, lands; none from Poached up; the focused picker's facts are all at their own claimed half hours, first, and unmarked; a landed confrontation says so on the page and in the notebook; the CLI's ready-made line and "Everything else"; at most three stars on every page of four v2 configurations; the watcher's room starred on the first visit and the watchers' line said once; v1's client pointer never starred; "why I was hired"; both soft marks, and that every mark rests on clues in hand; the teaching page, and the CLI's `new` and `--no-teach`) and `test/guidance-quips.test.ts` (9 tests, §4). Changed: `test/m9-engine.test.ts` (a lead only the client's pointer opened is offered by its own words and no longer starred) and `test/m9-polish.test.ts` (the focused facts come first from Poached up; the rest keep the old order), and in §4 `test/game/voice.test.ts`.
- **Correspondence.** `scripts/page-correspondence.mjs` (v1, 40 seeds × 3 difficulties, oracle and wandering, every trope): **0**. A sweep over v1 Raw, Poached, Medium and v2 Raw, Coddled, Poached, Medium, Hard-boiled (8 seeds, the oracle, the wanderer, and a guided player who takes every ready-made confrontation and every star) finds only the two classes `main` already has on the same sweep, fewer of each: `unknown-name` 1,367 (main 1,391; all v2 book headings and motif words, "Chapter", "THE ONE WHO LIED", "Nowhere to Stand" …) and `errand-untraced` 168 (main 202; the v2 chapter heading ahead of the errand line). Nothing this branch writes adds a token to either.
- **Reader lint:** 0 on that sweep. **Beat coverage:** 15,465 of 15,465 required beats written, 0 issues. **Plain terms:** `npm run decks` 0 errors, 0 banned terms.
- **The v2 design test**, `npx tsx scripts/diagnose-play.ts --design --seeds 50 --configs T0,T1L2,T2L2,T4L2,T5L2 --engine v2`, `main` against this branch:

| tier | marks-follower names the culprit | reasoning player right within budget | button-pusher | facts put / run | median calls to solve | par / budget |
|---|---|---|---|---|---|---|
| Raw | 26% → **24%** | 100% → 100% | 50% → 44% | 0.0 → 0.0 | 7 → 7 | 7/10 |
| Coddled | 26% → **14%** | 100% → 100% | 38% → 38% | 0.0 → 0.0 | 10 → 10 | 10/15 |
| Poached | 28% → **28%** | 98% → 98% | 20% → 20% | 0.9 → 0.9 | 10 → 10 | 9/15 |
| Medium | 28% → **24%** | 88% → 82% | 18% → 18% | 1.7 → 1.7 | 17 → 16 | 15/22 |
| Hard-boiled | 14% → **14%** | 78% → 82% | 14% → 16% | 3.7 → 3.9 | 23 → 24 | 19/28 |

Every marks-follower cell holds its bound (≤60% at Raw and Coddled, ≤50% from Poached up). The reasoning player follows the stars, so it moves with them: Medium loses three seeds of fifty, Hard-boiled gains two. Starring every choice that brought a graph fact gave the marks-follower 100% at Raw and the reasoning player 42% at Medium and 22% at Hard-boiled; the table is the version the notes above describe.

## Played

Through `npm run play`, all `--engine v2`.

- **Seed 11, Raw.** The teaching page, then the office: her evening and the Garibaldi starred (not every one of the client's topics, as before). At the Garibaldi the page says what a landlady on her stairs is good for; Rafferty's questions carry the stars. After Tillman on Rafferty and Rafferty's own evening, the turn ("Rafferty said the Garibaldi at half past eight. Tillman said he wasn't") and, on the same page's choices, "Put it to Rafferty: Tillman says you weren't at the Garibaldi at eight o'clock and half past eight." Taken, it lands; Rafferty goes quiet, and the page reads it as a refusal on a broken story; the notebook has "Story broke on Tillman's word: the Garibaldi, 8:00–8:30 PM." The grid meanwhile marks Abramowitz at 8:00 "? not seen by Rafferty". Filed "who=Rafferty": solved in 4 calls of 9.
- **Seed 3, Medium.** The office stars her evening, the third floor and the Velvet Room; the kiosk (the client's pointer) is starred only later, once Steinbach's word on Crowninshield serves a route. At the third floor "Ask Rafferty about the third floor" is starred first; the page's reason is "Nobody had sent me. Nobody had to: Rafferty kept the third floor, and people who keep a room count it." At the Velvet Room, Hargrove on Hauck brings the turn; "Put it to Hauck" opens on three facts under "7:00 · she says the Velvet Room" and "8:30 · she says the third floor", then "Everything else in the notebook (15 more)". Put, Hargrove's sighting lands as a story held against a fact ("She kept to it. But the fact was still in my notebook…"). Found on the way and fixed: the turn's payoff said "Hargrove had counted one at the third floor" when Rafferty had.
- **Seed 21, Medium.** The office stars only the Lyric stand. There, "Ask Hargrove about the Lyric stand" is starred first; his head counts and faces follow; "Put it to Bellucci" then opens on four facts about Bellucci's own half hours (9:30 and 10:00, the Lyric stand). The counterman's telling on Ruggiero reads "Not here. At eight o'clock I was at the El, and he wasn't there either."


## Not done

- **The reasoning player at Medium**, 82% against `main`'s 88%: still over the 80% target, and within about a seed of the noise, but lower. It is a player who follows the marks, and there are fewer marks now.
- **The confrontation's page still has an older thought card that says he asked** ("I didn't let it go. I asked Rafferty about the Garibaldi, straight out, and watched his face…") on the page a lie comes to light, before any confrontation has been paid for. It predates this branch; it should go, or wait for the ready-made choice to be taken.
- **v1 keeps its leads** (less the client's pointer) and does not get the watcher's room as a topic or the watchers' line: both are v2's. The ready-made confrontation, the focused picker, the landed line, the soft marks and the teaching page are both engines'.
- **Soft marks** read a witness's presence from their own word as well as their post; a liar's "I was there" can therefore put a "? not seen by" on somebody else. That is what a soft mark is for, but it is worth watching in the next playtest.
- **Unwatched counts in tellings** (a watcher's list of strangers and head counts) still name their half hours one by one; the spec asked only about where people weren't.
- **Not counted as jokes** (§4): the office's decks, hand-written engine lines, and the v2 book's once-a-night lines.
- **The book was checked by hand** in a browser on seed 11 at Raw (the teaching page, the ready-made button, the dashed "? R" mark on the grid). Nothing automated drives the book's new picker button; the CLI and the model under it are tested.
