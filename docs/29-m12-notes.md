# 29 — M12 Conversation: notes

*Branch `m12-conversation`, off `main` at db4a8b5 (M11 merged). The spec is [29-m12-conversation](29-m12-conversation.md): Part 1 the ask, Part 2 the recap. The voice is `docs/golden/seed3-camp.md`, §3 "The ask" and §4 "The recap".*

## In one paragraph

Every question page and every confrontation is staged now, in the shape of the designer's own example. Dashiell goes over and settles ("I took the stool next to Crowninshield.", "I stopped two steps below Mulcahy, which is a bad place to ask anybody anything."), takes one look at the person that is character and not a case fact ("She had the look of a woman who had bought her practice second-hand and was still paying off the chair."), asks, about half the time in his own narration ("I asked her to walk me through her evening."), tries something when the temper or an empty first answer calls for it ("I offered to buy her a drink, which in that room was mostly a gesture."), and after the answer is told plainly, ends on one dry last word, which is the page's one figure and never a verdict ("A dentist tells you it won't hurt. You nod, and you check later."). The only refusal is the culprit going quiet under a second fact, and that page says what the silence is worth ("Silence isn't an answer to where. It is an answer to whether she wanted to tell me."). The recap is new: after a story comes apart, after a confession, when the hour narrows, when a name is pencilled to a face, at the turn of every second hour with two new facts, and free whenever he likes ("Go over what I have", anywhere but the office). He takes stock in 80 to 180 words, off the grid and the notebook only, naming the absences ("Nobody had told me where Marchetti and Steinbach were at half past eight, and none of them had told me either."), never a verdict, never a clause an earlier recap said, and he ends on what he means to do next. Every clause carries a key that the correspondence checker finds again from the notebook alone. The players never press the button and the recaps change nothing but words, so the design test is the same table as `main`.

## What changed where

| file | what |
|---|---|
| `content/decks/approach.json` (new, 54) | Where he goes and how he settles, by `setting` (bar, counter, street, stair, room, office), `posture` (seated, standing, behind) and `again`. Some cards take `{doing}`, the person's plain action. |
| `content/decks/look.json` (new, 125) | His read of the person, one sentence, three for every suspect archetype and fixture role, plus the look on a second question, by temper. Wry reads, not similes. |
| `content/decks/try.json` (new, 26) | A drink, a cigarette, a coin, a threat left unsaid, by setting and `why` (guarded, again, easy, press). No card says the try worked. |
| `content/decks/close.json` (new, 63) | The last word, by `outcome` (evening, placed, unseen, knowing, counts, strangers, timing, event, thing, self, nothing, contradicts, second-lie, admit, withdraw, hold, quiet, wrong, ends) and an optional `role`. |
| `content/decks/recap.json` (new, 21) | The recap's opening line, by what set it off, and its closing line. |
| `content/decks/dashiell.json` | Seven question lines turned up a notch ("Who came through {place} tonight? Take your time. I've got until morning."). |
| `content/deck-schema.json`, `src/game/voice/cards.ts` | The five decks' schema entries and loading. |
| `src/game/scene/stage.ts` (new) | What kind of room a place is (`settingOf`), how somebody is placed in it (`postureOf`), the card slots for a person, the approach's `{doing}`, and the planner's choices made without a dealer: a try (`tryFor`, `pressFor`) and reported or direct (`reportedFor`). |
| `src/game/scene/plan.ts` | `AskStage` on the `exchange` and `confront` beats; a `close` beat after the outcome (`closeOutcome`); `SceneMemory.spoken` and `.nothing` (asked this visit, answered with nothing). A visit's activity is never one somebody else has done tonight while the trade has another. |
| `src/game/scene/realize.ts` | `setupOf` (the approach and the look, a paragraph of their own, voice `approach`), `tryOf`, `reportedQuestion` (a carried question is reported with its reason first: "Vitale had lent Sirkin money. I asked what she had seen of Vitale tonight."), `closeOf`, the `close` beat, the confrontation staged the same way. `stoppedDoing` cuts at a clause, not at every "and". |
| `src/game/scene/people.ts` | `plainAction`; the observation keeps the plain action only. |
| `src/game/recap.ts` (new) | `recapFacts` (the notebook as keyed facts, read off `gridFrom` and the notebook's board), `renderRecap`, `recapTrigger`, `recapKeys`. |
| `src/game/voice-data.ts` | `ASK_REPORTED` (the question in his narration, by family), `RECAP_*` (the recap's clause templates, the next step, the three short notes). |
| `src/game/reducer.ts`, `types.ts`, `parser.ts`, `choices.ts`, `transcript.ts` | `Command { kind: 'recap' }`, `recapOpen`, the price `recap` (free), the parse ("go over what I have", "take stock", "recap"), the `recap` choice group, the recap written after the state and appended to the page (or the whole page, asked for), `SceneMemory.recap`, `setRecaps` for the test. `BeatKind` `close` and `recap`, `PageShape` `recap`, `ProseVoice` `recap`, `BeatTrace.clauses`. |
| `src/game/correspond-pages.ts` | `checkRecap`: every clause's key is found again from the notebook as it stood after the page; it names only its own people, places and hours; "only seen" only of somebody a page has shown; the frame names nothing. |
| `src/game/reader-lint.ts` | `recap-verdict` and `recap-length`; the anchor-restated rule reads a recap as reasoning, like the window thought. |
| `scripts/players.ts` | `playerChoices` leaves out "Go over what I have", as it leaves out the rundown. |
| tests | `test/m12-conversation.test.ts` (new, 12). `m8` (the shape table takes `close` and `recap`), `m11-people` (the observation is the last paragraph before any recap), `m6` and `game/voice` (a page's length leaves a recap to its own rule; M6's share past 220 words is under a quarter), `game/coherence` (a telling matched from its first quotation mark). |
| `docs/25-read-through-issues.md` | The two "After M11" items the engine owns, marked. |

## Part 1: the ask

**The approach.** Drawn from the place and the person's activity. `settingOf` reads the place template (a speakeasy is a bar, the Automat a counter, the subway kiosk a street, the landlady's third floor a stair, the office the office); `postureOf` reads what they are doing (sitting, behind a bar or counter, standing), and a watcher behind a counter is behind it. Half the time, when they are doing something, the approach says it, the plain action only ("I took the stool next to Marchetti, who was at a table…" was the kind of thing a stool and a table disagreeing wrote, so a card's seat has to agree with theirs). A second question the same visit is turned back to ("I pushed my glass an inch to one side and turned back to Crowninshield.").

**The look.** One sentence, from the person's trade, after the approach: the golden's "She had the look of a woman who had bought her practice second-hand and was still paying off the chair." is LOK's dentist card, with two more like it for every archetype and fixture role. Asked again, the look is how they take a second question, by temper ("She had the patient look of somebody being asked for directions twice.", "He leaned in, glad of the company."). Looks are wry reads, not similes: the page's one figure is its last word.

**The ask.** Reported speech about half the time (1,023 reported to 910 aloud over 1,933 staged pages, seeds 1–20 × every tier and untiered, oracle and wanderer): "I asked her where she'd been tonight. I asked it nicely." `ASK_REPORTED` is keyed by what the answer tells, so the question still matches the family told. Aloud for a question with an edge: to somebody guarded, their life ("How do you make a living?"), why he was hired, and a share of the rest. A question that carries its own reason is reported with the reason first ("Vitale had lent Sirkin money. I asked what she had seen of Vitale tonight.") or said aloud as before ("“Sirkin had a creditor,” I said. “Vitale.”").

**The try.** Somebody guarded gets one on the first question of a visit; anybody gets one on the question after one that came back with nothing; at a bar or a counter, now and then, a friendly one (414 of 1,933 pages). Before a fact is put, a threat left unsaid, for somebody guarded and now and then anybody ("I didn't raise my voice. I put the notebook on the table and let it sit there looking official."). It costs nothing and it changes nothing: the answer is the case's, and no card says the drink bought it.

**The outcome and the last word.** The tellings are M10's, unchanged. After them (or after the thought, on a page without tellings), a `close` beat: one card from `close.json` on what the page came to, joined to the thought paragraph when that has room. A card written for the person's trade comes first ("A bookmaker gives you his evening the way he gives you odds: generous, and on his terms."). None is a verdict; the test runs every card through the recap's verdict patterns.

**Refusals.** Only where the rules have one. The rules have exactly one: the culprit going quiet on a fact put to them (the generator's `quiet` response). In the tiered game every suspect has an account clue, so a guarded person asked about their own night always gives it; the staging does the guarding (no reported question, a try first, fewer words), and nobody refuses a paid question. On a `quiet`, the last word says what the silence is worth ("That was worth writing down too: Marchetti would rather say nothing than say where."). A question that finds nothing is "couldn't tell you", which is the case's answer, and the last word says so ("I'd spent good time learning that he didn't know. It's a living.").

**Confrontations.** Staged the same way: the approach and the look, the fact put, the press when there is one, the reaction and their words, the confronted thought, the last word. The second fact of the same confrontation is the same breath and is not staged again.

## Part 2: the recap

**What it says.** `recapFacts` reads the grid (`gridFrom`, the pencil left out) and the notebook's board, and nothing else:

- *when*: the victim, the scene (or where they were found, when where is asked), the window or the half hour; the anchor on the half hour that matters; the method, once the notebook has it;
- *a story come apart*: what they told me, the second story, the truth or the story taken back, or that they went quiet ("Hauck had told me the third floor between eight and half past eight, then the office, and then the truth: she'd been at the speakeasy, selling things that weren't hers to sell.");
- *two words that do not agree* where no fact has been put about it ("Hauck said the third floor at eight o'clock, and Rafferty said she wasn't there.") — said as a disagreement, never as a lie, since from Poached up the grid never flags one;
- *whose evening I have, and whose word is under it* ("Steinbach's evening had Donnelly backing up some of it.", "Crowninshield had told me her evening, and so far nobody else had said a word about it.");
- *an evening only from other people*, with its hole at the half hour that matters ("Vitale's evening I had from Rafferty, with a hole in it between eight and half past eight you could drive a milk wagon through.");
- *only seen* ("Marchetti I had only seen, at the speakeasy.") — of somebody a page has shown, and never the client;
- *who nobody has placed* at the half hour that matters ("Nobody had told me where Marchetti and Steinbach were at half past eight, and none of them had told me either.");
- *next*: the lead this page just named first, so the recap and the page agree, then an evening nobody has told ("I wanted Steinbach next, about Crowninshield, and then Vitale to tell me his evening in his own words.").

People are named the way the detective knows them (the M9 display name), strangers by description, and only people the pages have named. A witness the reader has not met is "somebody else".

**Its shape.** The golden's: an opening line off the deck by what set it off, a paragraph of when and how, a paragraph of people, and the closing line with the next step. One joke a paragraph at most (templates marked with `*`), no line twice in one recap. 80 to 180 words, measured before the dealer is spent: the shortest wording has to make 80 and the longest has to fit in 180, and when it runs long the least of it (whose evening is whose) waits for the next recap. Mean 116 words.

**Never again.** Every clause has a key, and a recap says only keys no earlier recap said. The frame (when, where, how) may be said again to make the length, but not within four pages of saying it; asked for, it may. Nothing new, asked for: "I went over it again. Nothing had moved since the last time, including me."

**When.** After the page (at most one a page), from `recapTrigger`: a confession or a story taken back (`confront`; a second story is not the end of it, so the golden's recap comes after the second fact, when she gives up her secret); a placement in hand that now disagrees with somebody's own account (`lie`); the window narrowed (`window`); a change in the player's links (`link`); the turn of two, four or six o'clock with two new facts since the last one (`hour`). Never in the office and never after a page that changed nothing. Over the 280 oracle and wanderer runs: 2.3 recaps a night (364 `hour`, 188 `lie`, 80 `window`; `confront` and `link` need a player who confronts or links).

**Asked for.** "Go over what I have" is in the free row anywhere but the office. Free, the clock does not move, nothing is found (the test holds all of that); in the office the page says it can wait for the street.

**No verdict.** `recap-verdict` in the reader lint: no "did it", no killer or culprit, no guilty or innocent, no "cleared", "out of it" or "off my list", no "must have", no "it was <name>", plus docs/26's verdict patterns. The recap never clears anybody, at any difficulty (the spec allows it at Raw and Coddled; it isn't needed, and the thoughts already do it there).

**Traced.** `checkRecap` runs `recapFacts` again from the notebook as it stood after the page, with everybody in it, and every clause's key has to be among them. The clause may name only its own people (and the victim), places and hours; its people must be people the pages have put in front of the reader; "only seen" only of somebody shown in person; the opening and closing lines name nothing. The test also checks every "nobody had told me where X was" against the grid: no entry at that half hour.

## The design test

`npx tsx scripts/diagnose-play.ts --design --seeds 100`, after the merge with `main`, gives the same table as `main` before M12 (docs/28-m11-notes.md), line for line:

| config | marks-follower names the culprit | reasoning player: who, when and the column all right, within budget | button-pusher names the culprit | reasoning player: facts put to somebody / run | reasoning player: actions | reasoning player: median calls to solve | median par / budget |
| --- | --- | --- | --- | --- | --- | --- | --- |
| d1 | 99% | 91% (who 99%, column —) | 65% | 0.0 (— landed) | 20.4 | 20 (budget 20) | 12 / 20 |
| d2 | 93% | 84% (who 97%, column —) | 54% | 0.0 (— landed) | 18.6 | 18 (budget 19) | 13 / 19 |
| d3 | 93% | 84% (who 96%, column —) | 50% | 0.0 (— landed) | 16.8 | 17 (budget 17) | 13 / 17 |
| T0 | 23% | 100% (who 100%, column —) | 22% | 0.0 (— landed) | 6.2 | 6 (budget 10) | 7 / 10 |
| T1L1 | 19% | 100% (who 100%, column —) | 18% | 0.0 (— landed) | 7.9 | 8 (budget 15) | 9 / 15 |
| T1L2 | 18% | 100% (who 100%, column —) | 21% | 0.0 (— landed) | 8.0 | 8 (budget 14) | 9 / 14 |
| T3L2 | 28% | 98% (who 98%, column —) | 25% | 0.1 (100% landed) | 10.0 | 9 (budget 14) | 9 / 14 |
| T2L1 | 28% | 99% (who 99%, column —) | 28% | 0.1 (100% landed) | 8.7 | 9 (budget 13) | 7 / 13 |
| T2L2 | 31% | 97% (who 97%, column —) | 25% | 0.1 (100% landed) | 8.7 | 9 (budget 11) | 7 / 11 |
| T2L3 | 35% | 95% (who 95%, column —) | 26% | 0.2 (100% landed) | 9.0 | 9 (budget 10) | 7 / 10 |
| T4L1 | 22% | 91% (who 93%, column 96%) | 16% | 0.5 (92% landed) | 14.6 | 14 (budget 21) | 13 / 21 |
| T4L2 | 24% | 85% (who 88%, column 93%) | 18% | 0.4 (97% landed) | 14.9 | 14 (budget 18) | 12 / 18 |
| T4L3 | 30% | 74% (who 84%, column 90%) | 29% | 0.6 (100% landed) | 14.6 | 14 (budget 17) | 13 / 17 |
| T5L1 | 21% | 81% (who 85%, column 94%) | 27% | 2.3 (95% landed) | 22.2 | 21 (budget 27) | 17 / 27 |
| T5L2 | 19% | 84% (who 89%, column 95%) | 17% | 2.4 (96% landed) | 21.8 | 22 (budget 25) | 17 / 25 |
| T5L3 | 24% | 72% (who 78%, column 90%) | 19% | 1.9 (97% landed) | 21.1 | 20 (budget 23) | 17 / 23 |

The players never take "Go over what I have" (`playerChoices`, as for the rundown: it adds a page, and the page count seeds the volunteer's roll and the dealer). A recap after a page changes nothing but the page's words and the cards read, and nothing a player reads is words: `test/m12-conversation.test.ts` plays the same commands with the recaps on and off and gets the same notebook, clock, leads, volunteers, pages and confrontations. What a recap says is what the grid holds (the correspondence check), so a marks-follower who reads recaps has nothing the grid did not give it.

## docs/25, after M11

- **The arrival observation repeats the presence activity.** The observation now keeps the plain action, up to the first comma and short of a second clause, with the hour and the tie ("The woman who had found Sirkin was waiting at three in the morning."), and where the plain action is all the activity was, "was still at it" ("The man Hauck had told me to start with was still at it past four in the morning."). The approach's `{doing}` is the plain action too, so the presence line's joke is told once. `stoppedDoing` cuts at a clause ("working the gate open and shut" stays whole).
- **"Not turning the page" everywhere.** The engine's part: a visit's activity is never a card (or the same doing) somebody else has had tonight while the trade has anything else. The variety across seeds is the activity deck's, which the camp pass has.

## Where I judged

1. **The look is from the trade, the activity rides the approach.** The golden's look is the trade ("bought her practice second-hand") and the activity a second sentence. One sentence tying both reads badly with the activity deck's long lines, so the approach carries the plain action half the time and the look the trade.
2. **Refusals.** The spec's "a guarded person on a question about their own night" is not in the rules: every suspect in a tiered case has an account, and giving it is what the question buys. I did not add a refusal the rules do not have; the guarded person gets the try and a direct question.
3. **A recap after a second story waits for the end of it.** The golden's recap follows the second fact and the secret, not the first. A second story is not a trigger; a confession or a story taken back is, and the placement that caught the first lie already set one off.
4. **The frame again.** A recap that has little new says the when-and-how again to make its length, unless it said them within four pages. Otherwise consecutive recaps opened on the same three sentences.
5. **Recaps off the page count.** The recap is appended to the page that set it off, so it adds no page; asked for, it is a page of its own, which is why the players leave it alone.
6. **Page length.** A recap is 80 to 180 words on top of the page; the page-length tests count the page without it, since the recap's size has its own rule. A staged question runs about forty words longer, which is what was asked for; with the camp pass's longer cards, M6's share of pages past 220 words went from under a fifth to 22.9%, and its bound is a quarter now.

## Checks

After merging `main` with the camp pass (PR #46):

- **Tests:** the full suite, once, after the merge: 48 files, 887 of 888 passing (`npx vitest run --minWorkers=1 --maxWorkers=3`). The one failure was M6's share of pages past 220 words, 22.9% against its 20% (the camp pass's longer cards and M12's staged questions together); the bound is a quarter now, with a note, and `test/m6.test.ts` passes on its own (17 of 17). `npx tsc --noEmit` is clean. `test/m12-conversation.test.ts` is new (12 tests). Older tests brought to M12, each with a note: the M8 shape table (the `close` and `recap` beats), the M11 observation (the last paragraph before any recap), the M6 and voice page lengths (a recap has its own size, 80 to 180 words, and is left out of the page's count), and the coherence test's telling match (from the first quotation mark, since the frame's name may be "He" after the approach named them).
- **Correspondence:** 0 from the engine. The tests' sweeps (M8, M10, M11, M12) report 0, beside the two known generator sentences docs/23 lists under "Not fixed" (Medium, seeds 15 and 30). My own sweep (untiered and tiers 0–5 × the oracle, the wanderer, and the oracle with "Go over what I have" after every step): 0 over 420 runs (seeds 1–20) before the merge and 0 over 210 (seeds 1–10) after it.
- **Beat coverage:** 100%: the M8 test's 5,455 of 5,455 night pages (31,057 of 31,057 required beats), M10's 2,952 of 2,952, M9's 1,299 of 1,299 with 273 confrontations; 2,895 of 2,895 over the 210 runs after the merge.
- **Reader lint:** clean, the two new rules included (`recap-verdict`, `recap-length`), over the tests' sweeps and those runs.
- **Plain terms:** `npm run decks`: 6,319 cards across 45 decks, 0 errors, 0 banned terms. `test/plain-terms.test.ts` passes.
- **Staging, over 280 runs** (seeds 1–20 × untiered and tiers 0–5, oracle and wanderer): 1,933 question and confrontation pages, every one staged and every one with a last word; 1,023 questions reported and 910 aloud; a try on 414. 632 recaps, 2.3 a night, 80 to 172 words (mean 116).

## Read-through

Rendered after the last change, the question pages, confrontations and recaps only (`renderPageText`, as `npm run read` prints them), and read against `seed3-camp.md` §3 and §4. What read wrong and was engine-side is fixed, in the commits: "about key" with no article; a stool offered to somebody at a table; "Crowninshield's evening I had from Hauck" (the briefing's line about the finder is not an evening); the recap's next step disagreeing with the page's bridge; the when-paragraph said three recaps running; a recap on a second story before the confession; "Steinbach I'd seen at the subway kiosk" of somebody only named; "only seen" of the client; "putting what I had to people" at Raw, where nothing can be put; a place named for somebody the reader had not met; the observation repeating a comma-less activity whole; approach cards that went on with the activity's tail.

### Seed 3 at Medium, the oracle's route

```
the third floor                                       1:45 AM   page 5
────────────────────────────────────────────────────────────────────────────

I wanted to hear what Rafferty knew about the key.

I sat down on the step below Rafferty. She had the look of a woman who had
heard every excuse for late rent and kept a drawer for each of them.

I asked her what she knew about the key.

“Here’s what I know about it,” Rafferty said. “There has only ever been the
one key to the walk-up. It lives at the third floor. Marchetti had it off
the hook that evening. I don’t say a thing about my tenants unless I know
it. I could tell you more about this street than the street would like.”

I got it down on paper. A way into the walk-up was something Marchetti had
and most people didn’t. It might mean nothing.

“Anybody else through here tonight that you didn’t know?”

“I remember faces, even the ones I can’t name,” Rafferty said. “A woman
under forty at ten o’clock. I didn’t know her. If I don’t rent to somebody,
they’re nobody to me.”

Rafferty had no name for a woman under forty. Whoever it proved to be had
been at the third floor at ten o’clock. A stranger is just somebody you
haven’t put a name to yet. I had a few of those now.

People who are owed money keep track of the people who owe it. Vitale was
Sirkin’s creditor. That was the next question, and it was for Rafferty. I
wasn’t done with Rafferty yet.

[1 action, 2 written down, 247 words]

the third floor                                       2:15 AM   page 6
────────────────────────────────────────────────────────────────────────────

It had turned two. Rafferty hadn’t gone anywhere, and neither had I. She
leaned in, glad of the company.

Vitale had lent Sirkin money. I asked what she had seen of Vitale tonight.

Rafferty had been waiting all night for somebody to ask. “I saw him here
from seven until half past. He was back at nine o’clock.”

“And the other hours?”

“Not here. I hear every foot on those stairs, and I know most of them by the
creak. You’d be surprised what a person sees just standing still.”

I wrote it down. That was one hour Vitale could not claim the third floor
for, if it held. Somebody had seen him. That was a better kind of fact than
most I had. Nobody crosses this neighbourhood without somebody writing it
down, and tonight the somebody was me.

The third floor and eight o’clock: that was the next question, and it was
for Rafferty. I wasn’t done with Rafferty yet.

Another hour had gone, and I went over what it had bought me.

Sirkin died at the walk-up between eight and half past eight. The whistle
off the river was at half past eight. It was the nearest thing I had to a
clock I could trust. The how of it was poison in a drink.

Vitale’s evening I had from Rafferty, with a hole in it between eight and
half past eight you could drive a milk wagon through. Nobody had told me
where Hauck, Crowninshield, Marchetti and Steinbach were between eight and
half past eight, and none of them had told me either.

That was where things stood. It wasn’t far, but it was further than the
police had got. I’d ask Rafferty about the third floor next, and then Hauck
to tell me her evening in her own words.

[1 action, 1 written down, 303 words]

the third floor                                       2:40 AM   page 7
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the third floor. Rafferty might know
it.

I had another one for Rafferty. She had been hoping I’d ask something else,
and it showed.

“Who came through here tonight?” I asked. “Start at the beginning.”

“I keep track, you know. Somebody has to,” Rafferty said. “One came in at
half past six. One at half past eight. Two at nine o’clock. One at half past
nine. At half past ten it was Ilse Hauck, and nobody with her. I sit where I
can see the door. Nobody goes up without I know it.”

I got it down on paper. It was a fact about a door more than about anybody.
At half past ten, nobody went into the third floor without Rafferty seeing
it.

“Any strangers?”

Rafferty was pleased to have something to tell. “A woman under forty at half
past six. Then a man in his thirties at half past seven and one from half
past eight until half past nine. One or two I knew by sight. None of them by
name. I don’t learn names off the backs of people’s coats.”

Rafferty had given me a description and an hour: a woman under forty, at the
third floor at half past six. A description fits more people than a name
does. Every stranger is somebody’s cousin. That’s the trouble with this
neighbourhood.

[1 action, 9 written down, 232 words]

the speakeasy                                         3:35 AM   page 9
────────────────────────────────────────────────────────────────────────────

I sat down next to Crowninshield and put my hat on the bar, which is how you
say you’re staying. She had the look of a woman who had bought her practice
second-hand and was still paying off the chair.

Hauck had married into Sirkin’s family. I asked her about Hauck’s evening,
as much of it as she had seen.

“I saw her here from half past eight until ten. She was back at eleven
o’clock. While the fight was on the radio, she was here. She’s not somebody
I’d take for somebody else. I don’t go out of my way to watch people. I just
notice them.”

I wrote it down. So Hauck had been at the speakeasy at half past eight, if
it held. That was an hour that mattered.

“Your turn. Where did the evening take you?”

Crowninshield didn’t mind being asked. “I was at the subway kiosk at seven
o’clock. Then the third floor, at half past seven. From eight until half
past nine I was here. Nobody had to remind me. I know where I go. I didn’t
expect anybody to ask about it.”

I had it in Crowninshield’s words, place by place. The places and the hours
were what I could check. A dentist tells you it won’t hurt. You nod, and you
check later.

Crowninshield was next. The question was Sirkin, around eight o’clock. I
wasn’t done with Crowninshield yet.

[1 action, 2 written down, 237 words]

the speakeasy                                         4:00 AM   page 10
────────────────────────────────────────────────────────────────────────────

I had a question for Crowninshield about Sirkin.

It was past four, and my eyes had started to sting. I pushed my glass an
inch to one side and turned back to Crowninshield. She had the patient look
of somebody being asked for directions twice.

I asked her where Sirkin had been tonight.

Crowninshield didn’t have to look anything up. “I saw him at the subway
kiosk from six until seven. At half past seven he was at the third floor. At
eight o’clock he was here. I’ve known him long enough not to mistake him. I
don’t keep a clock on people. I just notice.”

I wrote that down. Sirkin died at half past eight, as near as the coroner
could say. Everybody’s evening came down to that. Somebody always sees you.
It’s the one thing this neighbourhood does for free.

The next thing was Crowninshield’s evening, and Steinbach had some of it.
Steinbach was at the subway kiosk.

Now I knew when better than I had, and I went over the rest with that in
mind.

Sirkin died at the walk-up at half past eight.

All I had of Hauck’s evening came from Crowninshield. Crowninshield had told
me her evening, and so far nobody else had said a word about it. Marchetti I
had only seen, at the speakeasy. Nobody had told me where Vitale, Marchetti
and Steinbach were at half past eight, and none of them had told me either.

That was it. It fitted on one page of the notebook, which is either good
news or bad. I wanted Steinbach next, about Crowninshield, and then Vitale
to tell me his evening in his own words.

[1 action, 1 written down, 279 words]

the speakeasy                                         4:25 AM   page 11
────────────────────────────────────────────────────────────────────────────

What I had so far pointed at the speakeasy. Crowninshield was the one here
who would know it.

I kept my stool and turned back to Crowninshield. She settled in for another
one, without much joy.

I asked whether anybody had come through that she didn’t know.

“Here’s what I noticed,” Crowninshield said. “A man in his thirties from
eight until half past, one at eight o’clock and one from half past nine
until eleven. Then a woman under forty from nine until half past. One or two
I knew by sight. None of them by name. I see plenty of faces I can’t name.
Most of them I forget.”

I wrote it in the book. A man in his thirties at the speakeasy at eight
o’clock. It could have been anybody who fit, and I didn’t pick one yet.
Faces without names are the city’s favourite joke, and it never gets tired
of telling it.

[1 action, 4 written down, 156 words]

the subway kiosk                                      5:20 AM   page 13
────────────────────────────────────────────────────────────────────────────

I checked my watch: after five. I fell in next to Steinbach and turned my
collar up. He had the patient, faintly pained face of somebody who listens
to children practise for a living.

Crowninshield rented from Sirkin. I asked what he had seen of Crowninshield
tonight.

“Now there’s a name,” Steinbach said. “I saw her here at six o’clock. She
was back at seven o’clock.” He wasn’t finished. “At half past seven she was
at the third floor. At eight o’clock she was at the speakeasy. When the
whistle went off the river, she was here. I was there. I saw it myself.”

I wrote it down. It put Crowninshield at the subway kiosk during the whistle
off the river. I had one hour for that, and it came round more than once a
night.

“Now your own night, if you don’t mind. And if you do mind, the same.”

“I’ve got nothing to hide,” Steinbach said. “I was here at seven o’clock.
Then the third floor, at half past seven. Then the speakeasy, at eight
o’clock. Then the third floor, from half past eight until half past nine.
Those are the places I was. I’m not leaving any out.”

It was Steinbach’s evening in Steinbach’s own words. Nobody else’s word was
in it. It had the neat edges of a story that had been told before, if only
to a mirror.

[1 action, 2 written down, 233 words]
```

### Seed 3 at Medium, confronting Hauck and Marchetti, and asking for recaps

`--route "go the walk-up; examine the walk-up; go the third floor; ask Rafferty about Hauck; ask Rafferty about the third floor; ask Rafferty about Vitale; go the speakeasy; ask Vitale about that evening; ask Hauck about that evening; ask Hargrove about Hauck; put x054 to Hauck; put x046 to Hauck; go over what I have; ask Marchetti about that evening; put w108 to Marchetti; put x043 to Marchetti; go over what I have"`. Vitale is the case's one enigma (page 9: asked aloud, a drink tried). Hauck gives a second story (page 12) and then the truth (page 13, where the recap follows, as in the golden). Page 14, asked for straight after that recap, is the note "I went over it again. Nothing had moved since the last time, including me." Marchetti gives a second story and then goes quiet (pages 16–17): the only refusal the rules have, and the page says what it is worth. Page 18 is "Go over what I have".

```
the third floor                                       1:45 AM   page 5
────────────────────────────────────────────────────────────────────────────

Nobody sent me. A hunch did, and hunches don’t pay cab fare. I wanted
Rafferty’s word on Hauck.

I sat down on the step below Rafferty. She had the look of a woman who had
heard every excuse for late rent and kept a drawer for each of them.

I asked her about Hauck’s evening, as much of it as she had seen.

Rafferty was happy to talk about her. “I saw her here at half past ten.”

“What about the other hours of the evening?”

“Not here. I know her step. I’d know it in my sleep. People think nobody
sees them. Somebody always does, and usually it’s me.”

I put it in the notebook. So Hauck might not have been at the third floor at
eight o’clock. It was worth remembering if Hauck ever claimed it.

“Is that everything, or is there more?”

“Here’s what I know about it,” Rafferty said. “There is a man who meets
people at the speakeasy and nobody will say his name out loud. I don’t say a
thing about my tenants unless I know it.”

Hauck had a habit somebody had noticed. Habits like that usually had a
reason, and the reason might be Sirkin.

“Any strangers?”

“I remember faces, even the ones I can’t name,” Rafferty said. “A woman
under forty at ten o’clock. I didn’t know her. If I don’t rent to somebody,
they’re nobody to me. People around here don’t stop to be known, and I don’t
ask.”

Rafferty had seen a woman under forty at the third floor at ten o’clock, and
had no name to give me. The description would have to wait for one. Faces
without names are the city’s favourite joke, and it never gets tired of
telling it.

[1 action, 3 written down, 294 words]

the third floor                                       2:15 AM   page 6
────────────────────────────────────────────────────────────────────────────

Nobody sent me, only a hunch. I wanted Rafferty’s account of the third
floor.

It had turned two. I stayed where I was, next to Rafferty. She had been
hoping I’d ask something else, and it showed.

I asked her who had come and gone tonight, and when.

“I keep track, you know. Somebody has to,” Rafferty said. “One came in at
half past six. One at half past eight. Two at nine o’clock. One at half past
nine. At half past ten it was Ilse Hauck, and nobody with her. I count them
in and I count them out. It’s how I know who owes me.”

I wrote it down. Only the ones Rafferty named went into the third floor at
half past ten. If anybody else said they were there then, Rafferty said
otherwise.

“Anybody else through here tonight that you didn’t know?”

Rafferty was pleased to have something to tell. “A woman under forty at half
past six. Then a man in his thirties at half past seven and one from half
past eight until half past nine. One or two I knew by sight. None of them by
name. I don’t learn names off the backs of people’s coats.”

A woman under forty at the third floor at half past six, and no name to go
with it. Somebody in the case would fit, or nobody would. Every stranger is
somebody’s cousin. That’s the trouble with this neighbourhood.

Another hour had gone, and I went over what it had bought me.

Sirkin died at the walk-up between eight and half past eight. The whistle
off the river was at half past eight, and so far it was the only honest
clock on the street. The how of it was poison in a drink.

Hauck’s evening I had from Rafferty, with a hole in it between eight and
half past eight you could drive a milk wagon through. Nobody had told me
where Crowninshield, Marchetti and Steinbach were between eight and half
past eight, and none of them had told me either.

That was the whole of it, as of now. It’s always the whole of it, as of now.
I’d ask Crowninshield about Hauck next, and then Hauck’s own account of her
evening.

[1 action, 9 written down, 377 words]

the third floor                                       2:40 AM   page 7
────────────────────────────────────────────────────────────────────────────

Nobody had pointed me at Rafferty. I went ahead and asked about Vitale,
Sirkin’s creditor.

I had another one for Rafferty. She leaned in, glad of the company.

“Tell me about Vitale,” I said.

“You want to know about him? I’ll tell you,” Rafferty said. “I saw him here
from seven until half past. He was back at nine o’clock.”

“And the night’s other hours?”

“Not here. I’d have heard him. I hear the mice.”

I wrote that down. Vitale was not at the third floor at eight o’clock, by
that account. If Vitale said different later, one of them would be lying. It
was one person’s word. Round here, that’s a small fortune.

[1 action, 1 written down, 114 words]

the speakeasy                                         3:35 AM   page 9
────────────────────────────────────────────────────────────────────────────

Nobody had asked me to. I wanted Vitale’s account of the evening anyway.

I sat down across from Vitale, who was tapping a pencil against a slate of
odds. He was friendly, with the friendliness of a man who knows exactly what
you owe him.

“Walk me through your evening,” I said. “Slowly. I’m a slow walker.” I
bought him a drink. He looked at it for a while before deciding it didn’t
oblige him to anything.

Vitale gave it to me short. “I was at the third floor from seven until half
past. Then the office, from eight until half past. Then the third floor, at
nine o’clock. At half past nine I was here. I didn’t write it down. I didn’t
need to.”

I wrote that down. It was a whole evening on Vitale’s say-so. That didn’t
make it false. It made it something to check. A bookmaker gives you his
evening the way he gives you odds: generous, and on his terms.

[1 action, 1 written down, 165 words]

the speakeasy                                         4:00 AM   page 10
────────────────────────────────────────────────────────────────────────────

I hadn’t been sent to ask. I wanted Hauck’s evening regardless.

It was past four, and my eyes had started to sting. I took the stool next to
Hauck. She had the look of somebody who could sell you a share of anything,
including the hat on your head.

I asked her for her evening, start to finish.

Hauck gave it to me in the order it happened. “I was here from seven until
half past. Then the third floor, from eight until half past. From nine until
half past I was here. There’s no reason I’d get my own evening wrong. I
didn’t expect anybody to ask about it.”

That was Hauck’s night as Hauck told it. I wrote it down the way it was said
and argued with none of it yet. It was a very orderly evening. I couldn’t
remember the last time I had one.

Now I had two versions of one half hour, and I went back over the rest to
see what else wobbled.

Sirkin died at the walk-up between eight and half past eight. The whistle
off the river was at half past eight, and so far it was the only honest
clock on the street. The how of it was poison in a drink.

Hauck said the third floor at eight o’clock, and Rafferty said she wasn’t
there. Vitale had given me his evening, and Rafferty’s word sat under part
of it. Marchetti I’d seen at the speakeasy, and that was all.

That was where things stood. It wasn’t far, but it was further than the
police had got. I wanted Crowninshield next, about Hauck.

[1 action, 1 written down, 273 words]

the speakeasy                                         4:25 AM   page 11
────────────────────────────────────────────────────────────────────────────

Nobody had asked me to. I asked Hargrove about Hauck on my own account.

I leaned on the bar across from Hargrove, who was counting the bottles on
the back shelf. He had the mild, deaf expression bartenders wear when a
customer is about to tell them something.

“Where did Hauck get to tonight?” I asked.

Hargrove took the question seriously. “I saw her here at six o’clock. She
was back from seven until ten. And again from eleven until half past. When
the whistle went off the river, she was here.”

“Any time you’re sure she wasn’t there?”

“Not here at half past ten. I’d have poured for her. I’d remember that.”

I put it in the notebook. If Hauck was not at the speakeasy at half past
ten, then Hauck had been somewhere else, and where that was, I did not know
yet. A place and an hour was worth something. It would be worth more with a
second one beside it. People notice more than they let on, and let on more
than they should.

[1 action, 1 written down, 178 words]

the speakeasy                                         4:55 AM   page 12
────────────────────────────────────────────────────────────────────────────

I kept my stool and turned back to Hauck. She settled in for another one,
without much joy.

I put it to her plainly. “Hargrove puts you at the speakeasy at six o’clock,
from seven until ten and from eleven until half past. Hargrove says you
weren’t at the speakeasy at half past ten. He puts you at the speakeasy when
the whistle went off the river.”

Hauck laughed once, at nothing in particular, and sat up straighter. “All
right, I wasn’t at the third floor. I was at the office.”

I did not argue with Hauck. I read the new story back, and Hauck said that
was how it went. Two stories in one night. Some people just can’t commit.

[1 action, 121 words]

the speakeasy                                         4:55 AM   page 13
────────────────────────────────────────────────────────────────────────────

I let that sit, and then I turned the page. “And there’s this,” I said.
“Rafferty puts you at the third floor at half past ten. Rafferty says you
weren’t at the third floor from six until ten or from eleven until half
past.”

When I read out half past ten, Hauck closed her eyes for a second. “All
right. I was at the speakeasy. I was selling things that were stolen.”

I turned the notebook around so Hauck could read what I had written. Hauck
read it and nodded, and was kind enough not to mention my handwriting. It
explained the lie. It didn’t explain anything else, and I made a note of
that.

When somebody changes a story, you check all the other ones. I went over
what I had.

Sirkin died at the walk-up between eight and half past eight. The whistle
off the river was at half past eight. It was the nearest thing I had to a
clock I could trust. As for how, it was poison in a drink.

Hauck had told me the third floor between eight and half past eight, then
the office, and then the truth: she’d been at the speakeasy, selling things
that weren’t hers to sell.

That was the night so far: a lot of people who were somewhere, and one half
hour nobody was keen to talk about. I’d ask Crowninshield about Hauck next.

[free, 236 words]

the speakeasy                                         5:20 AM   page 15
────────────────────────────────────────────────────────────────────────────

No one had pointed me at Marchetti’s evening. I asked on my own account.

It was past five, and I was hungry, and my stomach was taking it harder than
I was. I sat down next to Marchetti and put my hat on the bar, which is how
you say you’re staying. She had the look of a woman who had heard half the
neighbourhood’s business and been asked to forget all of it.

I asked her where she’d been tonight.

Marchetti didn’t mind being asked. “I was at the subway kiosk at half past
six. At seven o’clock I was here. Then the third floor, from half past seven
until half past eight. From nine until half past I was here. Nobody had to
remind me. I know where I go.”

I wrote it down as Marchetti told it. It was one person’s word about one
person. It had the neat edges of a story that had been told before, if only
to a mirror.

[1 action, 1 written down, 166 words]

the speakeasy                                         5:45 AM   page 16
────────────────────────────────────────────────────────────────────────────

I pushed my glass an inch to one side and turned back to Marchetti. She had
the patient look of somebody being asked for directions twice.

I put it to her plainly. “Rafferty counted one at the third floor at half
past eight.”

Marchetti looked at the notebook, then at the wall behind me, and took her
time. “All right, I wasn’t at the third floor. I was at the subway kiosk.”

I had two stories from Marchetti now, one above the other. I left them there
and thought about which one the others fit. It was a better story than the
first one. That isn’t saying much.

[1 action, 108 words]

the speakeasy                                         5:45 AM   page 17
────────────────────────────────────────────────────────────────────────────

“That’s one thing,” I said. I had another. “Rafferty puts Vitale at the
third floor from seven until half past and at nine o’clock. Rafferty says
Vitale wasn’t at the third floor from six until half past, from eight until
half past or from half past nine until half past eleven. Vitale could have
got at it.”

Marchetti turned away and found something else to look at. Anything else.
Marchetti had nothing more to say about it.

Nothing new went into the notebook under Marchetti. I made a small mark so I
would know I had asked. Silence isn’t an answer to where. It is an answer to
whether she wanted to tell me.

[free, 114 words]

the speakeasy                                         5:45 AM   page 18
────────────────────────────────────────────────────────────────────────────

I took the notebook out and went over it from the top, slowly, because
slowly is the only speed it has.

Sirkin died at the walk-up between eight and half past eight. The whistle
off the river was at half past eight. It was the nearest thing I had to a
clock I could trust. As for how, it was poison in a drink.

Marchetti had told me the third floor between half past seven and half past
eight, then the subway kiosk, and after that she wouldn’t say anything at
all.

That was the night so far, laid out flat. I wanted Crowninshield next, about
Hauck.

[free, 107 words]
```

### Seed 11 at Raw

```
the stairwell                                         2:40 AM   page 4
────────────────────────────────────────────────────────────────────────────

Something I had turned up made me want Steinbach’s evening.

The time had kept moving while I wasn’t watching it. It was past two. I
caught up with Steinbach on the stair. She kept one eye on me and the other
on the door, in case a better customer came through it.

I asked her to walk me through her evening.

Steinbach told me, and didn’t hurry it. “I was here at eight o’clock. Then
the ferry slip, from half past eight until ten. At half past ten I was here.
A person knows where they’ve been. I do, anyway. I didn’t expect anybody to
ask about it.”

That was Steinbach’s night as Steinbach told it. I wrote it down the way it
was said and argued with none of it yet. People always remember their own
evenings well. It’s other people’s they go vague on.

Donnelly would know where Steinbach had been. That was the next question.
Donnelly was right there.

Another hour had gone, and I went over what it had bought me.

Lindemann died at the walk-up at half past nine. The drunk singing under the
window was at half past nine, and so far it was the only honest clock on the
street. As for how, it was a blunt object.

Steinbach had told me her evening, and so far nobody else had said a word
about it. Donnelly I’d seen at the stairwell, and that was all. Nobody had
told me where Donnelly and the woman in her twenties were at half past nine,
and none of them had told me either.

That was what I had. None of it was a name yet, and I wasn’t going to
pretend otherwise. I wanted Donnelly next, about Steinbach.

[1 action, 1 written down, 292 words]

the stairwell                                         3:35 AM   page 5
────────────────────────────────────────────────────────────────────────────

It was after three. I climbed up to Donnelly, who was reading a folded
newspaper. He had the look of a man who could tell you what anything was
worth, and what you’d take for it.

“Lindemann had a creditor,” I said. “Steinbach.”

“Klara Steinbach.”

“Where was Steinbach tonight?”

Donnelly was happy to talk about her. “I saw her here from six until eight.
At nine o’clock she was at the ferry slip. From half past ten until eleven
she was here. It’s not a face I’d get wrong. Somebody’s always going
somewhere at this hour.”

I wrote it down. If Steinbach could get into the walk-up, the list of people
who could was one name longer. Where she was is only half of it. The other
half is where she says she was.

“And your evening? Every place you were.”

“I’ve got nothing to hide,” Donnelly said. “I was here from eight until half
past. Then the ferry slip, at nine o’clock. From half past nine until half
past ten I was here. I don’t lose track of my own evening. Not much of a
night, when you say it out loud.”

The account was Donnelly’s. If any hour of it was wrong, somebody else would
be the one to show it. It had the neat edges of a story that had been told
before, if only to a mirror.

I had a question about Donnelly, and it was for Mulcahy. Mulcahy did
business with Lindemann. I didn’t have far to go for Mulcahy.

[1 action, 2 written down, 255 words]

the stairwell                                         4:25 AM   page 6
────────────────────────────────────────────────────────────────────────────

By then four had come and gone. I stopped two steps below Mulcahy, which is
a bad place to ask anybody anything. She was between engagements and dressed
for the next one, just in case it walked in.

Donnelly did business with Lindemann. I asked her where Donnelly had been
tonight.

“I saw him here from six until half past eight. He was back from ten until
half past eleven. I know him. Not well, but well enough.”

I wrote it in the book. Donnelly could have got into the walk-up without
much trouble. That was a reason to keep asking.

“And your own evening? Walk me through it.”

Mulcahy told it in order. “I was here from eight until half past ten. I
remember it clearly enough. It wasn’t that long ago.”

Mulcahy had talked me through the night. What I had was a story with one
teller. Everybody’s evening sounds tidy when they tell it. Nobody’s ever is.

[1 action, 2 written down, 160 words]

the stairwell                                         4:25 AM   page 7
────────────────────────────────────────────────────────────────────────────

Nothing I had found pointed at Corrigan. I asked about Mulcahy on a hunch.

I sat down on the step below Corrigan, who was counting rent money out of a
tin box. She had the look of a woman who had heard every excuse for late
rent and kept a drawer for each of them.

I asked her about Mulcahy’s evening, as much of it as she had seen.

Corrigan knew me from before, and that saved us both some time.

She gave it to me straight. “I saw her here from six until half past seven.
She was back at half past eight. And again from ten until half past eleven.”

“Any hour you’d say for sure she wasn’t around?”

“Not at the ferry slip at eight o’clock. Not here from nine until half past.
I’d have heard her. I hear the mice.”

I wrote it down. Mulcahy had told me the stairwell, at half past nine. This
said Mulcahy was not there. Two people, one half hour, two different rooms.
Somebody’s clock was wrong, and it wasn’t the clock.

I didn’t say anything yet. I wrote the stairwell and half past nine next to
Mulcahy’s name and underlined them.

Now I had two versions of one half hour, and I went back over the rest to
see what else wobbled.

Steinbach’s evening had Donnelly backing up some of it. Donnelly had given
me his evening, and Mulcahy’s word sat under part of it. Mulcahy said the
stairwell at half past nine, and Corrigan said she wasn’t there.

That was where things stood. It wasn’t far, but it was further than the
police had got. It was time to hold the evenings I had up against each other
and see where they didn’t meet.

[free, 1 written down, 295 words]
```

### Seed 7 at Hard-boiled

```
Kaplan’s                                              1:35 AM   page 7
────────────────────────────────────────────────────────────────────────────

I stood at the counter next to Zeldin, who was reading a folded newspaper by
the light that was there. He had chalk on his cuff and a pencil stub behind
his ear, and neither of them had ever lost money.

Dettweiler lived across the airshaft from Renfro. I asked him about
Dettweiler’s evening, as much of it as he had seen. I put a nickel on the
counter for his coffee. At that hour it’s practically a bribe.

“I know her,” Zeldin said. “I saw her at the fourth floor at eight o’clock.
At half past eleven she was here.” He wasn’t finished. “While the milk wagon
was in the street, she was at the Automat. Another time, she was here. I
know her by name and by sight. Both.”

I got it down on paper. Eight o’clock was one of the half hours that
mattered, and now Dettweiler was somewhere in it: the fourth floor, if it
was true.

“And you, from the start of the evening? Where were you?”

Zeldin looked at me, then answered. “I was at the Hallam with Lotte
Dettweiler at seven o’clock. Then the Automat, at half past seven. Then the
fourth floor, at eight o’clock. Then the Hallam, from half past eight until
nine. At half past nine I was here. I hadn’t thought about it till you
asked, but it’s all there.”

A person’s own evening is the easiest thing to tell and the hardest to
check. Zeldin’s was down now. A bookmaker gives you his evening the way he
gives you odds: generous, and on his terms.

The next question was where Zeldin had been, and it was for Whitfield.
Whitfield was the elevator man at the Hallam.

[1 action, 2 written down, 288 words]

the Hallam                                            2:15 AM   page 9
────────────────────────────────────────────────────────────────────────────

A milk wagon went by in the street, the bottles rattling in their crates. It
was after two. I met Whitfield on the landing, which was the only flat place
in the building. He had the look of a man who went up and down all day and
had strong opinions about both.

Zeldin owed Renfro money. I asked him where Zeldin had been tonight.

Whitfield thought about it for a moment. “He wasn’t here. Not once all
evening. I know who lives here, and on which floor, and what kind of day
they’ve had. I don’t keep track of him beyond that. I’ve got my own
troubles.”

I got it down on paper. Zeldin was missing from the Hallam at seven o’clock,
if the word was good. Missing from one place meant present at another. It
ruled out one room. The city has a great many rooms.

I still had nothing on the Hallam at seven o’clock. Whitfield was the one to
ask. He was still in front of me.

Now I had two versions of one half hour, and I went back over the rest to
see what else wobbled.

Renfro went missing from the subway kiosk between seven and half past eight.
The milk wagon on its rounds was at half past eight. It was the nearest
thing I had to a clock I could trust.

Zeldin said the Hallam at seven o’clock, and Whitfield said he wasn’t there.
For Dettweiler I had Zeldin’s word, and nothing of her own. Nobody had told
me where Weisglass and Brennan were between seven and half past eight, and
none of them had told me either.

That was where things stood. It wasn’t far, but it was further than the
police had got. I wanted Whitfield next, about the Hallam, and then
Weisglass’s own account of her evening.

[1 action, 1 written down, 308 words]

the Hallam                                            2:35 AM   page 10
────────────────────────────────────────────────────────────────────────────

The Hallam had come up, and I wanted to hear about it from Whitfield.

Whitfield hadn’t gone anywhere, and neither had I. He looked at me, then at
the clock, and decided I was still there.

I asked him who had come and gone tonight, and when.

Whitfield counted it off without looking anything up. “At six o’clock it was
Lotte Dettweiler, and nobody with her. Nobody came in from seven until
eight. One at half past eight. Nobody came in from nine until half past. One
at half past ten. One at half past eleven. I run the car all night. I see
who rides.”

I wrote that down. Only the ones Whitfield named went into the Hallam at
seven o’clock. If anybody else said they were there then, Whitfield said
otherwise.

“And people you didn’t know? Anybody?”

Whitfield thought back. “A man in his fifties at half past six. Then a man
at half past eight. I knew the faces. Not one of the names. People ride up
and ride down. Nobody introduces himself between floors.”

Whitfield had no name for a man in his fifties. Whoever it proved to be had
been at the Hallam at half past six. Every stranger is somebody’s cousin.
That’s the trouble with this neighbourhood.

[1 action, 8 written down, 213 words]

the Automat                                           3:10 AM   page 12
────────────────────────────────────────────────────────────────────────────

It was past three. A dog was barking somewhere, a long way off, about
something that mattered to the dog. I stepped up to the counter beside
Dettweiler. She had the look of a woman who had measured me for a better
suit the moment I came in.

“Zeldin owed Renfro money,” I said.

“Sol Zeldin.”

“Where was Zeldin tonight?”

Dettweiler counted it off on her fingers. “I saw him here at half past six.
At eight o’clock he was at the fourth floor.” She thought a moment. “At nine
o’clock he was here. At half past eleven he was at Kaplan’s. While the milk
wagon was in the street, he was at Kaplan’s. I know his voice and I know his
coat.”

I wrote that down. That put Zeldin at the fourth floor at eight o’clock, if
it held, and that was inside the hours that mattered. Somebody had seen him.
That was a better kind of fact than most I had.

“What else?”

“Here’s what I know about it,” Dettweiler said. “Weisglass paid for a room
at the fourth floor at nine o’clock and went up with somebody who wasn’t
walking easily. The somebody had Renfro’s coat over one arm. I wouldn’t say
it if I weren’t sure of it. People talk. I listen. It isn’t a crime.”

It was one small piece of Renfro’s evening, and small pieces add up or they
don’t. It was the kind of thing that matters later or not at all.

“Your turn. Where did the evening take you?”

Dettweiler was glad to tell it, and told all of it, and some of it with
feeling. “I was at the Hallam with Sol Zeldin at seven o’clock. Then the
newsstand, at half past seven. Then the fourth floor, from eight until half
past. From nine until half past I was here. I’m telling it the way it
happened, in order.”

I had an evening from Dettweiler, and I kept it apart from what the others
had seen. An account is no better than the next person who puts her
somewhere. Everybody’s evening sounds tidy when they tell it. Nobody’s ever
is.

The fourth floor and seven o’clock: that was the next question, and it was
for Dettweiler. Dettweiler was still in front of me.

Somebody’s story had come apart, and that’s a good time to go over all the
others.

Dettweiler said the Hallam at seven o’clock, and Whitfield said she wasn’t
there. Broadnax I’d seen at the Automat, and that was all. Nobody had told
me where Broadnax and the man in his thirties were between seven and half
past eight, and none of them had told me either.

That was the night so far, laid out flat. I wanted Dettweiler next, about
the fourth floor, and then Weisglass’s own account of her evening.

[1 action, 3 written down, 473 words]

the Automat                                           3:10 AM   page 13
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the milk wagon on its rounds. Alfano
might know about it.

I put my elbows on Alfano’s counter, which he didn’t care for. He had the
look of a man who had poured a million cups of coffee and been thanked for
about six.

I asked him for the hour of the milk wagon on its rounds.

Alfano knew me from before, and that saved us both some time.

“Everybody on the block knows that,” Alfano said. “That was at half past
six, half past eight and half past ten. Everybody heard it. I’m no
different. You could set a clock by it, and people do.”

I wrote that down. Anything anybody had timed by the milk wagon on its
rounds was at one of those hours, then. It’s a comfort when something in
this city happens on time.

Where Dettweiler had been was still open. Alfano might close some of it. I
wasn’t done with Alfano yet.

[free, 1 written down, 165 words]

the Automat                                           3:30 AM   page 14
────────────────────────────────────────────────────────────────────────────

I stood at the counter next to Broadnax, who was smoking under the nearest
light. He watched my mouth while I talked, which is a professional habit and
not a comfortable one.

“Renfro had a former employee,” I said. “Weisglass.”

“I know who you mean. I know the face.”

Broadnax didn’t need to be asked twice. “Weisglass blamed somebody for a
ruin, for months, and was not quiet about it either, not where I could help
hearing. I wouldn’t tell you if I wasn’t sure. I could tell you more about
this street than the street would like.”

I wrote it in the book. Weisglass blamed Renfro for the ruin of Weisglass’s
business. That put Weisglass among the people with a reason to want Renfro
gone.

“One more thing. Where were you tonight?”

“Me? Easy,” Broadnax said. “I was here from seven until eight. Then the
Hallam, at half past eight. From nine until half past I was here. Then the
newsstand, from eleven until half past. I’ve been over it once already, for
myself.”

I wrote it down as Broadnax told it. It was one person’s word about one
person. A dentist tells you it won’t hurt. You nod, and you check later.

The hour was seven o’clock. Broadnax was the one to ask about Renfro. I
wasn’t done with Broadnax yet.

[1 action, 2 written down, 223 words]

the Automat                                           3:50 AM   page 15
────────────────────────────────────────────────────────────────────────────

I wanted Broadnax’s word on Renfro before anything else.

I stayed where I was, next to Broadnax. He leaned in, glad of the company.

I asked him where Renfro had been tonight.

“Oh, I know him all right,” Broadnax said. “I saw him here from seven until
eight. At ten o’clock he was at the fourth floor. I know him to talk to. I’m
not guessing.”

I got it down on paper. So there was a later sight of Renfro: the fourth
floor, at ten o’clock. The night had more in it than I thought. People
notice more than they let on, and let on more than they should.

The hour that mattered had got smaller, and I went over everything else
against it.

Renfro went missing from the subway kiosk at half past eight.

Zeldin said the Hallam at half past eight, and Whitfield said he wasn’t
there. Broadnax had told me his evening, and so far nobody else had said a
word about it. Nobody had told me where Weisglass, Brennan and the man in
his thirties were at half past eight, and none of them had told me either.

That was the night so far: a lot of people who were somewhere, and one half
hour nobody was keen to talk about. I wanted Dettweiler next, about the
fourth floor, and then Weisglass’s own account of her evening.

[1 action, 1 written down, 231 words]

the Automat                                           4:10 AM   page 16
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the fourth floor. Dettweiler might know
it.

Somewhere a clock had gone past four, and made no apology. I wasn’t finished
with Dettweiler, and I said so. She had been hoping I’d ask something else,
and it showed.

“Any faces tonight you didn’t know?” I asked.

“People I didn’t know? Sure,” Dettweiler said. “A man at the fourth floor at
half past eight. I’d seen him around. I couldn’t give you a name. I see
plenty of faces I can’t name. Most of them I forget.”

I wrote that down. A man at the fourth floor at half past eight. It could
have been anybody who fit, and I didn’t pick one yet. A stranger is just
somebody you haven’t put a name to yet. I had a few of those now.

[1 action, 1 written down, 139 words]

the newsstand                                         4:50 AM   page 18
────────────────────────────────────────────────────────────────────────────

I leaned on the front of Ruggiero’s stand. He made change without looking at
it, which in his line is the only skill that matters.

“Renfro had a creditor,” I said. “Brauer.” I held out my cigarettes. He took
two, which I decided to call progress.

“Konrad Brauer.”

“Where was Brauer tonight?”

Ruggiero nodded at the name. “I saw him here at nine o’clock. He was back at
half past eleven. While the milk wagon was in the street, he was here.”

“Was there a time you know he wasn’t around?”

“Not here from six until eight or from half past nine until eleven. Selling
papers is mostly watching the street. The papers sell themselves.”

I wrote that down. That would take the newsstand away from Brauer for six
o’clock. I wanted to hear what Brauer would put there instead. Nobody
crosses this neighbourhood without somebody writing it down, and tonight the
somebody was me.

[1 action, 1 written down, 155 words]
```

## Not fixed

- **A long page gets longer.** A question page that told three families and then catches a lie runs to 460 words with its recap (seed 7 page 12). The recap is its own paragraphs and inside its own limit; the page is under the 600-word night ceiling.
- **"I had the third floor from Hauck now"** after she says the speakeasy (seen on an earlier render of the confrontation route) is the `confronted` thought's place, which reads the placement the fact put, not the one she gave. The thought deck is the camp pass's.
- **A recap after a confession says only the confession** when the rest was said a page or three before (seed 3 route, page 13). The golden's recap is a first recap and says everything; a later one says what changed.
- **A person grouped in the crowd** ("Vitale and Marchetti were slumped in a booth") has a separate activity for the approach, which can seat them at the bar the crowd line did not mention.
- **Recaps name a stranger by the description the notebook has** ("the man in his thirties"), which is right, but two such people read alike.
