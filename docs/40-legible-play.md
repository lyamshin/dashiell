# Legible play: confrontations, stars, and fewer choices

*2026-09-25. This follows blind playtest round 2 (Raw 11, Poached 2, The Count on seed 3, Medium 21, all on the v2 engine). All four solved their cases, and all four ran 40–60% over par. All four called the game at least partly opaque, "in its mechanics more than its mystery." The correctness bugs are fixed separately (`trust-fixes`). This covers the three design changes the designer approved on 2026-09-25.*

## 1. "Put it to" says what happened

- **Breaks that take two facts count.** A count plus a sighting, or a count plus other people already placed, can break an account. In The Count, Rafferty counted one on the stairs at half past eight and saw a man there. Marchetti, a woman, claims the stairs at that hour, so her account breaks. The engine must accept that, not answer "That doesn't touch anything I told you." The picker lets the player choose the second fact (or it's the free second pick). The rule is: whatever the solver's T4/T7 steps can derive from facts the player holds is fair to put.
- **A fact may be put again against a new account.** When someone tells a second story, any fact that breaks that second story is fair, even if it broke the first.
- **Every put ends with one plain line saying what happened.**
  - **Landed:** "That was a hole, and she knew it." It stays as it is today, and the notebook records it.
  - **Held:** say why, in the detective's voice, and in terms of the rule. For example: "A count of one doesn't say who. I'd have to put someone else on those stairs first." Or: "Tillman had her at the Garibaldi at eight. She'd said half past."
  - **Refused (the culprit):** it reads as refusal on a broken story, as now.
- **The picker explains itself in one sentence plus an example.** Replace "opens the 9 facts about Quill at the hours of Quill's own story…" with something like: "Pick something you know that her story can't live with. Say, someone who saw her somewhere else at an hour she named."

## 2. Stars last all night, with a reason

- A star stays on any choice that serves an open step of the deduction graph, on every page, until that step is closed. Today they vanish after about page 7. Keep at most three stars a page.
- **Every star carries a short reason**, eight words at most, in the detective's voice, taken from the step it serves. Examples:
  - "who saw him last?" (when is still open);
  - "she counts that room";
  - "his story and hers can't both stand".
- **"Go over what I have" is the night's real summary:** what's settled, what's still open (always saying so while *when* is open), and the starred questions that would move it.

## 3. Fewer choices on a page (designer approved)

- **Pick a person, then a topic.** A page lists the people present, plus where to go and what to search. Choosing a person opens their topics, and backing out costs nothing. This matches the two-click rule the designer set for remote leads.
- **A name the witness turns out not to know costs 5 minutes**, not a full call. The answer still lands in the notebook ("Tramonti doesn't know Lanza"), because not knowing someone is evidence for linking descriptions. After that, the topic shows as known-empty and is no longer offered.
- A person's topic list shows only names the player has met or heard of, as now.
- **Target:** no page offers more than about 12 first-level choices.

## 4. Wording feedback feeds the decks

From round 3, blind testers also send line edits (Part B of the prompt): the page, the exact line, the problem, and their edit. To turn those into deck changes:

- **`scripts/trace-line.ts <save> "<quoted text>"`** replays a save and prints, for each match, the page, the deck card id (or the sheet and hole, or the engine template) that produced it, and the card's source text. It must never be reachable from `npm run play`, so blind testers can't see it.
- The deck pass then edits cards, not rendered pages. A line that several testers flag gets priority. Structural problems, such as a missing bridge or lines in the wrong order, go to sheets or the planner, not decks.

## Measure

Blind playtests again on the same four seeds, with fresh testers and the round-3 prompt (Parts A and B). They pass if:

- nobody loses calls to mislabelled or unexplained costs;
- every tester uses "Put it to" and can say whether it landed;
- testers finish with calls to spare at Raw and Poached;
- the median overrun of par is under 25%;
- no report calls the mechanics opaque.

## Built

*Branch `legible-play`, 2026-09-25. All four sections, on the v2 engine (`--engine v2`, `?engine=v2`). v1 is unchanged: its page, its stars and its tests are as they were. The cases deal as before (the m7 and structure hashes are untouched): nothing here changes the generator.*

### 1. "Put it to" says what happened

- **Two-fact breaks.** The solver gains one step, used only to judge a fact put to somebody (and the ready-made put at Raw and Coddled): a head count reads the faces seen in that room at that half hour as heads in it (`SolverProblem.pairs`, `HeldOptions.pairs`). "One on the stairs at half past eight" and "a man in his thirties there then" keep a woman off the stairs before anybody knows which man it was. That is T4 and T7 together, from facts the player holds. The generator never turns it on, so every case deals as it did. The playtester's put on seed 3 (Rafferty's count, to Marchetti, with the man she saw in hand) was refused before and lands now. "Count plus others placed" was already the solver's count rule and needed nothing new.
- **The page says both facts.** A break that rests on the pair says the second one with the first: "Rafferty counted one at the third floor at half past eight. And the one she saw there then was a man in his thirties." (`ConfrontJudgement.pair`, `pairSaid`). The picker needed no second pick: the judgement reads the whole notebook, so the one fact put lands when its partner is in hand.
- **Put again against a new story.** This came in with `trust-fixes` (`putBeforeOnThisStory`) and is unchanged.
- **Held: one plain line saying why** (`heldLine` in `m9.ts`, on `ConfrontJudgement.why`, drawn after their words). Read from the fact and what they claim now, never the truth:
  - a count at their place and hour: "A count of three doesn't say who. I'd have to put three others at the Velvet Room at half past eight first.";
  - a face there then that could be them, or couldn't: "…could have been her. It put nobody else there instead." / "…wasn't her, but that didn't mean she wasn't there too. For that I'd need a count.";
  - a sighting at an hour their story doesn't cover: "Hargrove had her at the Velvet Room at seven o'clock. She'd said half past eight.";
  - a sighting timed by an event whose hour isn't known yet: "I didn't know yet when the whistle off the river went, so it didn't put her anywhere at an hour she named.";
  - a story already broken and answered in full, a part already taken back, and a plain fallback ("Nothing in it touched where she said she was.").
  The same line is read back when the same wrong fact is put again. The four `confront` close cards that said "half hour" (a call is not half an hour, docs/38) now say "call", and no longer say the fact "did not cross" the story, which the held line would contradict (cnf-007, 008, 009, 012).
- **Landed and refused** read as before (`LANDED`).
- **The picker explains itself** in one sentence and an example, in the book and the CLI: "Pick something you know that her story can't live with. Say, somebody who saw her somewhere else at an hour she named." It adds that a fact that breaks nothing costs the time, "and the page says why".
- Found on the way: the Raw ready-made label fell back to "Abramowitz: the Garibaldi, 8:00, 10:00–11:00" and lost who was seen. It now reads "Abramowitz saw Fairbanks at the Garibaldi at eight o'clock and from ten until eleven o'clock". Hours said in runs ("at eight o'clock and from ten until eleven") everywhere `spokenWhen` is used.

### 2. Stars last while their step is open, with a reason

- **Closing a step** (`closedSteps` in `guidance.ts`, solved on what is held, cached per notebook):
  - a place or "not" step closes once the solver places or strikes it;
  - when closes once the half hour is one, and a half hour closes once it is ruled out;
  - who closes once the solver names them;
  - a lie closes when a fact put to it lands. Holding what breaks it is the player's to see, and the star stays till then;
  - a leg closes when all its facts are held. A leg's facts say more than the leg (the chloral gone, a noise at half past eight).
  A closed step stars nothing (`openFacts`).
- **What carries a star.** Stars go on:
  - a question or search here that takes a lead the notebook has opened (as before);
  - a question or search here, lead or not, that brings what an open step stands on and the player can always go and get: somebody's own story, or the counts and faces of whoever keeps a room;
  - a walk, for a lead that waits there;
  - when none of those would star anything, a walk that brings those standing facts;
  - when that stars nothing either, and only from Poached up, any choice here or a walk away that brings anything an open step rests on.

  At most three a page, nearest the bottleneck first, as before (`graphStars`).
- **Deviation from the spec's letter.** A star on *every* choice that serves an open step was built first. It broke the targets of docs/33 §3 (see the table below):
  - At Raw and Coddled the marks-follower went from 28% and 18% to 68% and 74%. At three steps, following the stars is solving the case.
  - From Medium up the reasoning player fell from 82% to 68% and 56%. Stars on walks sent it on errands.

  docs/39's notes record the same failure. The layered rule above keeps both targets. The playtesters' own nights (round 2, replayed) show the gain:

  | night | before: pages with a step open and no star | after |
  |---|---|---|
  | seed 2, Poached | 10 of 24 | none of 24 |
  | seed 3, Medium | 0 of 27 | 0 of 26 |
  | seed 21, Medium | 0 of 27 | 0 of 27 |
  | seed 11, Raw | 6 of 13 | 6 of 13 |

  At Raw the stars still stop once only sightings are left: those are the answer.
- **The reason** (`starReason`, eight words at most, `REASON_WORDS`). It comes from what the choice brings and the step it serves, and it names only who the notebook names:
  - a watcher's count: "she counts that room";
  - their faces: "he knows faces, if not names";
  - a sighting of the victim: "who saw him last?";
  - somebody's evening: "her story, to check against the others";
  - a sighting: "where was Vitale at half past eight?", at the step's hour, else the hour nearest what the notebook still holds open;
  - a lie whose story is in hand: "Hauck's story against Hargrove's eyes";
  - a leg: "who had a reason?", "how was it done?", "who could have got in?".

  Shown beside the label in the CLI ("* Hargrove — Hauck's story against Hargrove's eyes"), under it on the book's button (and in its aria-label), on the person's own button when one of their topics is starred, and in brackets in `npm run read`.
- **"Go over what I have"** already said what is settled and what is still open, including when. In v2 it now ends on the page's stars and their reasons instead of the last lead: "Three things would move it. The kiosk: where was Crowninshield at eight o'clock? The third floor: where was Vitale at half past eight? The Velvet Room: who saw him last?" (`starsLine` in `choices.ts`, `next|stars` in the recap's clauses, checked by `checkRecap`). A recap that comes on its own, not asked for, keeps its old "next".

### 3. A person first, then a topic

- **The CLI** (v2). A page lists "Talk to" (one line a person, with the star and reason of their best topic and "N topics"), then Search, Go to and the free row. `do <n>` on a person prints "ASK X ABOUT" with their topics numbered from 1, "Put it to X" (with its one-sentence help) and "Back to the page". Opening a person and `back` are free, and write nothing to the save's events. A topic's words still work from the page (`do "ask Rafferty about the third floor"`). "Put another fact to …", free right after a fact landed, stays on the page itself.
- **The book** (v2). A row of name buttons, each with its star and reason. A name opens that person's topics and "Put it to" in an indented block under the row, and the same name again ("close") shuts it. It is two clicks, and the page keeps its scroll place when a name is opened (`renderInPlace`). Nobody is open by default. It was checked at desktop and phone width (375 px, no sideways scroll).
- **A name the witness doesn't know costs five minutes** (`priceOf` reason `short`, `unknownNameOnly`). The answer still goes in the notebook ("Hargrove might know Steinbach's face, but not the name."). Afterwards the name is not offered again, and the person's topics say "Hargrove doesn't know by name: Steinbach. It's in the notebook." (`ChoiceGroup.unknown`).
  - *Keeping costs honest without giving the answer away:* every name topic that costs anything says both prices, "25 min or 5", with one note under the list: "a name they turn out not to know costs five minutes, not a call, and goes in the notebook all the same". `Choice.minutes` is still exactly what the reducer charges; the label never says which of the two it is. A label of "5 min" would have told the player the witness doesn't know the name before asking, and "not knowing someone is evidence".
  - *The clock:* the five minutes go on a tally (`RunState.shortMinutes`, `Page.short`), and the running head adds it (`clockMinutes`, `shortByPage`). When the tally would reach the next call's minutes it becomes that call, and keeps the rest, so the clock always moves exactly five. The calls left and the strip count whole calls.
  - House and familiar questions stay free as before, and a first question that brings somebody's evening is a full call.
- **Fewer first-level choices.** In v2 a room is one "Search: the room", since one search goes through everything in it, things included (docs/38). "Notebook" is off the page's row: it is always beside the page, in the phone's running head, and `notebook` in the CLI.
- **First-level choices per page, before → after** (the oracle's route through `npm run play`, `scripts/choice-count.ts --all`, counting every numbered line under WHAT NEXT):

  | night | before: median / max | after: median / max |
  |---|---|---|
  | seed 11, Raw | 33 / 39 | 11 / 12 |
  | seed 2, Poached | 26 / 43 | 9 / 13 |
  | seed 3, Medium | 24 / 65 | 9.5 / 14 |
  | seed 21, Medium | 38 / 49 | 11 / 13 |

  The 14 is the Velvet Room on seed 3, with five people, five places, the search, "Ask Hauck who's here", "Go over what I have" and "File the report".

### 4. `npm run trace`

`scripts/trace-line.ts <save> "<quoted text>"` (`npm run -s trace -- …`) replays a play save and prints, for each page the words are on, where they came from:
- a deck card, with its id, deck file and template;
- a sheet, with its id, the part or line, and its text;
- an engine template, with the `const` or function in `src/`, its file and line, and its text;
- or "no source found", with the nearest candidates.

Matching folds quotes, dashes, case and line breaks, and "..." skips words. It tries the page's own records first: the cards it spent, the sheets it used, and the `line:` keys of sheet lines. After those it tries every deck, sheet and string literal in `src/`. Nothing in `src/cli` imports it, and a test holds that. It was tested on a deck card (cnf-009), a sheet line, a `voice-data` const and the new `heldLine` template. Lines built from several pieces come back as parts. A quote that is only a name or an hour gets "no source found" with the card whose slot it sits in.

### Checks

- **The v2 design test** (`--design --seeds 50 --configs T0,T1L2,T2L2,T4L2,T5L2 --engine v2`), before → after:

  | tier | marks-follower names the culprit | reasoning player right within budget | button-pusher | facts put / run | median calls to solve |
  |---|---|---|---|---|---|
  | Raw | 28% → 30% | 100% → 100% | 42% → 40% | 0.0 → 0.0 | 7 → 8 |
  | Coddled | 18% → 24% | 100% → 100% | 44% → 42% | 0.0 → 0.0 | 10 → 10 |
  | Poached | 28% → 30% | 98% → 96% | 20% → 22% | 0.9 → 1.1 | 10 → 10 |
  | Medium | 24% → 26% | 82% → 88% | 18% → 16% | 1.7 → 2.0 | 16 → 17 |
  | Hard-boiled | 14% → 18% | 82% → 82% | 16% → 16% | 3.9 → 4.5 | 24 → 24 |

  Every target of docs/33 §3 holds: the marks-follower is at 50% or under, and the reasoning player at 80% or over, per tier. The first build, with a star on every choice that serves an open step, measured 68 / 74 / 30 / 26 / 16% and 100 / 100 / 88 / 68 / 56%.
- **Read through**, page by page, with `npm run read … --engine v2 --route`: seed 3 Medium, seed 11 Raw, seed 2 Poached, seed 21 Medium. Stars stay to the end of each night with sensible reasons, and nothing contradicts itself on the new lines.
- **Played by hand** through `npm run play` on seed 3 Medium, 16 pages, filed 5 of 5. Hauck held on Hargrove's word. A second fact to her, the whistle, ended it with "I didn't know yet when the whistle off the river went…". A short question (Hargrove, about Steinbach) cost 12:25 → 12:30, and the name dropped out of his topics. The count and the man seen, put to Marchetti, landed. Hargrove's count of three, put to Crowninshield, held, with its why.
- **Browser** (`?seed=3&d=2&t=4&engine=v2`, vite from this branch): the row of names, a name opening its topics under it, the reasons on the buttons, "25 min or 5" with its note, "doesn't know by name" after a short question, the picker's help, at desktop and at 375 px.
- **Tests:** `test/legible-play.test.ts` (new, 11 tests), `test/trace-line.test.ts` (new, 5), and updates to `play-cli` (v2 opens a person to reach "Put it to"), `honest-mechanics` 1 (the clock counts the tally) and `trust-fixes` 9 (a name's label says both prices). Full suite (`npx vitest run --minWorkers=1 --maxWorkers=3`): 59 files, 1034 of 1034 passing.

### Left open

- "About 12" is 14 on the busiest page. The next cuts would be to fold the rundown into the client's topics, or to make "Go to" open a list like a person does.
- At Raw and Coddled a page late in the night can still have no star. That happens when all that's left is a sighting behind a question no lead has opened: seed 11's tester had six such pages. Starring those sends the marks-follower to the answer (100% in a trial). From Poached up there is always a star while a step is open.
- A recap that comes on its own still names its next step from the leads, not the stars.
- In `npm run read` (a reviewer's tool, never a tester's), a name the witness doesn't know shows "(5 min)".
- Seed 21's oracle types two commands no page offers ("ask Petrosino about the Keystone", "ask Quill about Petrosino and Lefkowitz"). This was so before this branch.
