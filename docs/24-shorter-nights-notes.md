# Shorter nights — notes

*Branch `shorter-nights`, off `main` at 584d157 (PR #37, the testimony rewrite, merged). Spec: `docs/24-shorter-nights.md`, blessed by the designer.*

## In one paragraph

Two calls that were busywork are gone. **A second fact in the same confrontation:** once a fact lands, the same picker comes back as "Put another fact to her", free. A second real, independent fact brings the confession on that page; a wrong one ends the confrontation with the story standing ("That’s all I’m going to say about it."), and costs nothing more. The culprit gets the same offer and never confesses: a second right fact draws a third story, or silence. Nothing in the picker is marked. **The account comes with the first question:** the first time the detective asks a suspect anything, the page ends with their own evening, told as a telling, for no extra call. "Her evening" stays on the buttons, free and ticked, and reads the account back. A lead to somebody's account marks every first question to them, its notebook line reads "Ask Zeldin anything", and its bridge sends the detective to the person. Par walks a confession as one call and an account riding on another question as none. The tier's par range still holds the M9 walk, so every seed deals the case it dealt before; only what the night costs moves. At Hard-boiled, par falls from 19 to 17 (median, game par), the budget from 26 to 25, and the reasoning player's median calls to solve from 23 to 21. That is short of the spec's "about 19"; see "Why Hard-boiled is 21 and not 19".

## What changed where

| file | what |
|---|---|
| `src/game/reducer.ts` | `accountRider` and `answersTo`: a tiered case's first question to a suspect brings their account, last on the page (after anything volunteered), paced with the rest (three families, then "Go on"). Their evening, once held, is `ask-again`: free, ticked, read back. `followUpOf`: the confrontation that can take a second fact now. Price `confront-follow` (free), and the step that judges the second fact against the same story and records it `follow: true`. |
| `src/game/m9.ts` | `ConfrontRecord.follow`; `judgeConfront(…, { lieKey })` judges the second fact against the story the first was about, and nothing else. |
| `src/game/choices.ts` | The confront group becomes "Put another fact to X" (`follow: true`, every fact free, nothing marked) right after a fact lands. A topic marked only because the account rides on it (`riding`) keeps its own place in the list. `defaultAskPerson` opens on the one a fact was just put to. |
| `src/game/derive.ts` | An account lead's label is "Ask Zeldin anything". |
| `src/game/oracle.ts` | The oracle plans with the account riding on any question the route puts to that suspect. |
| `src/game/scene/plan.ts`, `realize.ts`, `lines.ts`, `thought.ts`, `index.ts`, `voice/page.ts` | The second fact's page: no approach, "“And there’s this,” I said." and the fact in the detective's words; the reaction and close by outcome, and a new outcome `ends` for a second fact that touches nothing. Asked about themselves, a suspect's evening is told after their story. Their own evening is the last family on an ask page. A witness who knows only the face no longer says "I know who you mean. I know the face." before "I might know the face if I saw it. Not the name." |
| `src/game/scene/bridge.ts` | A lead to an account is bridged with `tie: account`: to the person, not to a question. |
| `src/game/scene/coverage.ts` | A "Go on" page of a question carries itself (`continued`), as a carried question does. Before, only searches went on; now an answer with an account can. |
| `src/ui/choices-view.ts` | The follow-up picker says what it costs: "Which other fact do you read her? It costs nothing. If it does not touch what she told you, that is the end of it for now, and the story stands." |
| `src/game/voice-data.ts` | The help: the first question brings the evening; a second fact right after a landed one is free. |
| `src/gen/logic/select.ts` | `walkPar(…, ride)`: every question to a suspect fetches their account; a group whose gains another covers is done with it. One confrontation per confession (it was two). `SolveSummary.walk`: the par route walked the M9 way. |
| `src/gen/logic/check.ts`, `src/gen/shape.ts`, `src/gen/generate.ts`, `src/gen/types.ts` | The par range holds `walk`; `logicSlackFor(…, walk)`: where slack scales with par it scales with the walk, so the budget falls by exactly the calls saved. Hard-boiled's `extraSlack` 1 → 2 (below). |
| `content/decks/confront.json` (+12), `bridge.json` (+16), `followup.json` (+5), `grounding.json` (+2, one retagged), `deck-schema.json` | `ends` reactions ("That’s all I’m going to say about it.") and closes that never say time was spent; `tie: account` bridges; five more ways to ask for somebody's evening after another answer; face-not-name groundings. `cnf-037` no longer has somebody sit down who was already sitting. |
| `scripts/players.ts`, `scripts/diagnose-play.ts` | The reasoning player (below); `--reason-costs`; the design table prints median par and budget. |
| `test/shorter-nights.test.ts` (new, 9 tests), `test/m7-helpers.ts`, `test/m9-engine.test.ts` | Below. |

## §1 A second fact in the same confrontation

- **When.** Right after a first fact lands on a story — the answer is a second story, a story held, or silence — while the one it was put to is still in the room, and nothing has happened since but pages that change nothing (a fact read back, the notebook). A second fact, right or wrong, or anything else (a question, a look round, a walk) closes it. An admission or a withdrawal on the first fact needs no second.
- **The picker** is the same list, the same order, the same filter and the same "What she told me" at the top, headed "Put another fact to Hauck". Every fact is free; a fact already put is ticked and read back as before. Nothing is marked, and nothing is sorted by whether it breaks the story.
- **Judged** by `judgeConfront` as the second confrontation of *that* story (`{ lieKey }`): it must be independent of the first fact — it breaks the second story, or still breaks the first with the first fact set aside. A fact that breaks a different story of theirs is not this confrontation's, and ends it.
- **Outcomes.** An innocent gives it up on this page (the case's own `responses[1]`: `admit`, or `withdraw` for a companion), and the confession goes to the solver as before. The culprit's `responses[1]` is a third story or silence, never an admission (the test holds this over 16 cases and every lie they write out). A wrong second fact: “That’s all I’m going to say about it.”, the story stands, and it costs nothing; the fact can be put again later, as a confrontation of its own, for the half hour.
- **Par and the solver** count a confession as one confrontation. The generator's par walk has one pseudo-call per confession where it had two (`confrontPseudo`); the par set still holds two independent ways to break the lie.

The page (Hard-boiled seed 7, the reasoning player's route, pages 20 and 21):

```
Kaplan’s                                              5:45 AM   page 20
────────────────────────────────────────────────────────────────────────────

Zeldin looked up when I sat down. I put it to him plainly. “Whitfield says
you weren’t at the Hallam from six until half past eleven.”

Zeldin set down what he had been holding and wiped his hands, one and then
the other. “All right, I wasn’t at the Hallam. I was at the newsstand.”

I wrote the new words beside the old ones. A person can be in one place a
half hour, and now Zeldin had given me two.

[1 action, 81 words]

Kaplan’s                                              5:45 AM   page 21
────────────────────────────────────────────────────────────────────────────

“That’s one thing,” I said. I had another. “Dettweiler puts you at the
Automat at half past six and at nine o’clock.”

Zeldin looked around to see who else could hear. “All right. I was at the
Automat. I owe money on bets, and I was paying some of it back.”

I turned the notebook around so Zeldin could read what I had written. Zeldin
read it and nodded.

[free, 69 words]
```

## §2 The account comes with the first question

- **What.** In a tiered case, any first question to a suspect — about a person, a place, the hour, themselves, or why the client hired him — gets its own answer and then their account, as the M10 telling tells an evening: one question in the detective's words ("And your own evening? Walk me through it."), the spans spoken and ordered, adjacent spans at one place said once, a grounding, sometimes a tail, the note. It is the last family on the page, after anything a yapper volunteers. The pacing rule holds: when the answer already has three families, the evening waits behind the free "Go on".
- **Cost.** The question's own: one call, or none where the question is free (the client's two on the house, the free first ask). No question costs more because the account came with it, and the first question to a suspect is never the free "I’ve told you what I know."
- **"Her evening"** is still on the buttons. Before any question it is the question that brings the account alone; after, it is free, ticked, and reads the account back.
- **Leads and bridges.** A lead to somebody's account is taken by any first question to them, so each of those questions carries the mark (the rule stays "marked if and only if it takes an open lead"); each keeps its own place in the list. The notebook's lead reads "Ask Zeldin anything". The bridge has its own tie: "Broadnax hadn’t given me an evening yet. One question would start it, and Broadnax was at the garage." The errand on arrival still says what the detective came for ("I came to hear Zeldin out on the evening"), which stays true whatever he asks first.
- **The lie rule is unchanged.** The account is the generator's account clue, false where the lie rule lets it be.
- **Par** walks every question to a suspect as fetching their account (`walkPar`'s `ride`). The route's account-only questions are the suspects it asks nothing else.

## Par, budget, and which cases are dealt

The tier's par range was a bound on the size of the logic game, and it was measured on the M9 walk. Held against the shorter par it would turn down cases near the floor and let in cases that had been over the ceiling, and every seed near either edge would deal a different night. So the range now holds `SolveSummary.walk` — the par route walked as M9 walked it, every account its own question and every confession two confrontations — and `Case.par` is the shorter walk. Every seed deals exactly the case it dealt before (Hard-boiled seed 7 and Raw seed 11 below are the nights in `docs/23-m10-a-notes.md`), and only the cost moves.

Slack follows the same logic. Where a tier scales slack with par (Raw, Coddled), it now scales it with the walk, so the budget falls by exactly the calls the night no longer spends. Before, Raw's budget fell twice as fast as its par (par 8 → 6 took the budget 11 → 7 on seed 11) because Beat's slack is `max(3, round(8 × par / 12))` less two. Hard-boiled's slack is flat (the ladder's 6, plus `extraSlack`), and there `extraSlack` goes from 1 to 2, for the reason below.

| tier (config) | game par, before → after (median) | budget, before → after (median) | par-route calls saved (mean) | cases leaning on a confession |
|---|---|---|---|---|
| Raw (T0) | 8 → 7 | 11 → 10 | 1.5 | 0% |
| Coddled (T1L1) | 10 → 9 | 16 → 15 | 1.5 | 0% |
| Coddled (T1L2) | 10 → 9 | 15 → 14 | 1.5 | 0% |
| Poached (T2L2) | 8 → 7 | 12 → 11 | 0.9 | 0% |
| Soft-boiled (T3L2) | 11 → 9 | 16 → 14 | 1.3 | 0% |
| Medium (T4L2) | 13 → 12 | 19 → 18 | 0.5 | 11% |
| Hard-boiled (T5L2) | 19 → 17 | 26 → 25 | 2.0 | 68% |

100 seeds a config, Precinct (Raw locked to Beat). "Before" is `main` at 584d157. Read-through seeds: Hard-boiled 7 par 22 → 17, budget 29 → 25; Hard-boiled 3 par 22 → 20, budget 29 → 28; Raw 11 par 8 → 6, budget 11 → 9.

## Measurements

### The design test

`npx tsx scripts/diagnose-play.ts --design --seeds 100 --configs T0,T1L1,T1L2,T2L2,T3L2,T4L2,T5L2`, Precinct (Raw is locked to Beat). "Before" is `main` at 584d157 with this branch's script (the only change to the script's "before" is the par/budget column).

| tier | marks-follower names the culprit | reasoning player: who, when and column right, within budget | button-pusher | reasoning player: median calls to solve | median par / budget |
|---|---|---|---|---|---|
| Raw (T0) | 15% → 23% | 100% → 100% | 15% → 22% | 7 → **6** | 8 / 11 → 7 / 10 |
| Coddled (T1L1) | 18% → 19% | 100% → 100% | 18% → 18% | 9 → **8** | 10 / 16 → 9 / 15 |
| Coddled (T1L2) | 22% → 18% | 100% → 100% | 17% → 21% | 9 → **8** | 10 / 15 → 9 / 14 |
| Poached (T2L2) | 32% → 31% | 97% → 97% | 23% → 25% | 9 → **9** | 8 / 12 → 7 / 11 |
| Soft-boiled (T3L2) | 28% → 28% | 99% → 98% | 25% → 25% | 11 → **9** | 11 / 16 → 9 / 14 |
| Medium (T4L2) | 24% → 24% | 86% → 85% | 17% → 18% | 15 → **14** | 13 / 19 → 12 / 18 |
| Hard-boiled (T5L2) | 20% → 19% | 83% → 84% | 17% → 17% | 23 → **22** | 19 / 26 → 17 / 25 |

At 300 seeds, Hard-boiled: marks-follower 21% → 22%, reasoning player **85% → 86%**, median calls to solve **23 → 21**, par / budget 19 / 26 → 17 / 25.

Every target holds: the marks-follower at or under 50% from Poached up and under 60% at Raw and Coddled (it rose at Raw, 15% → 23%, because a lead to an account now marks every question to that person, and a player who follows marks asks more people about more people); the reasoning player at or over 80% at every tier, and at 100% at Raw and Coddled.

**Hard-boiled's slack.** With the budget following par exactly (`extraSlack` 1), Hard-boiled's reasoning player solves 79% at 100 seeds (median 21 calls, budget 24): par fell by 2.0 calls a night and the player saved about 1.5. One call of the saving goes back into the budget (`extraSlack` 2): 84% at 100 seeds, 86% at 300. The budget still falls, 26 → 25.

### The reasoning player

It never reads the truth. What changed:

1. **The second fact, for nothing.** Right after a fact lands, it looks first to the same person for a second fact that still breaks the story with the first set aside, and puts it free. The person the offer is open for goes first, since a paid confrontation with anybody else would close it.
2. **It waits for the second fact.** A first confrontation with only one fact in hand that breaks the story waits while there is other work in the room (a marked question, the room, a marked walk), and while more than three calls are left. A confrontation is one call for the pair now, so holding the first fact until the second is found is the saving; confronting as soon as one fact was in hand solved 70% at Hard-boiled, against 78% waiting (both at the old slack, 100 seeds).
3. **The evening with a question.** For a suspect in the room whose half hour is still open and whose account is not in hand, it asks them about somebody else the grid still has open, and the evening comes with it; the evening alone only when there is nobody to ask about. A marked evening question is asked the same way.

Where its calls went at Hard-boiled (`--reason-costs --seeds 100 --configs T5L2`, a mean over every run, solved or not):

| | evenings asked for | other questions | walks | facts put (paid) | facts put (free) | searches | total calls |
|---|---|---|---|---|---|---|---|
| before | 2.96 | 8.75 | 6.66 | 1.93 | — | 4.17 | 24.47 |
| after | 0.21 | 10.75 | 6.76 | 1.35 | 1.02 | 4.14 | 23.21 |

The oracle's par route, for comparison (40 seeds): walks 6.45 → 6.17, searches 1.00 → 1.00, evening-only questions 2.55 → 1.20, other questions 8.18 → 8.18, confrontations 1.6 → 0.8.

### Why Hard-boiled is 21 and not 19

The spec's estimate (`docs/20-m9-polish-notes.md` §5) was 2–3 calls for accounts and 1–2 for confessions. Measured:

- **Accounts save less than a call a night where they save anything.** The account rides free only on a question the route asks that suspect anyway. The par route asks most suspects about somebody, so its evening-only questions fall from 2.55 to 1.20 a night. The reasoning player asks for three evenings a night; with the evening riding along, it asks those three suspects about somebody open instead, which costs the same call. That testimony saves it later questions only now and then (its other questions rose by 2.0 while its evenings fell by 2.75).
- **Confessions save one call each, and 68% of Hard-boiled nights lean on one** (0.8 confessions a night): 0.6 of a paid confrontation a night for the reasoning player.
- **The rest of the gap is the player's own looking.** At Hard-boiled it searches 4.1 rooms where the par route needs 1, and asks 2.5 more questions. Nothing in these two changes touches that, and I didn't change it: it's the measuring stick, and a smarter stick would move "before" as much as "after".

Shortening further would take a change the spec didn't ask for. `docs/20-m9-polish-notes.md` §5 lists two: a watcher's door in one question (1–2 calls), and a lower Hard-boiled par ceiling (the longest nights).

### Tests and checks

- **Tests:** 44 files, 829 tests, all passing (43 and 820 on `main`). New, `test/shorter-nights.test.ts` (9 tests):
  - the first question to a suspect, about anybody, costs one call and ends with their evening, after which their evening is free, ticked and read back;
  - asked about themselves first, they give it after their story;
  - a lead to an account marks every first question to them, labelled "Ask X anything", each in its own place;
  - over 16 Medium and Hard-boiled cases and every lie they write out: after a fact lands, "Put another fact to X" is offered, free, with nothing marked; a second right fact is free and brings an innocent's confession (n = 1, the page costs nothing), and the culprit never admits;
  - a wrong second fact ends it, free, with “That’s all I’m going to say about it.”;
  - the notebook leaves the offer open, a question closes it, and a later fact costs the half hour;
  - every page those confrontations write is covered, traced and lint-clean;
  - par is no longer than the walk, shorter wherever a confession is needed, the walk is in the tier's range, and the budget is par plus the walk's slack;
  - the oracle still collects the spine within the shorter par.
- `test/m9-engine.test.ts`: the seed 3 Medium confrontation now shows both the free wrong second fact (“That’s all I’m going to say about it.”) and a paid wrong fact (“That doesn’t touch anything I told you.”).
- `test/m7-helpers.ts`: the tier's par range is checked against `walk`, and par no longer than it.
- **Beat coverage:** 100%. That's 2,952 of 2,952 night pages on the M10 sweep (40 seeds × every tier), 1,299 of 1,299 on the M9 walk (273 confrontations), 5,455 of 5,455 on the M8 sweeps, and every page of the new confrontation walks.
- **Correspondence:** 0 violations on every sweep, including the second-fact pages. The two generator sentences M10 A named are still counted separately.
- **Reader lint:** clean over 40 seeds × every tier, and over the new confrontation walks.
- **Plain terms:** `npm run decks` gives 4,912 cards, 0 errors and 0 banned terms. `test/plain-terms.test.ts` passes.
- `tsc --noEmit` and `vite build` are clean.

## Where I judged

1. **Which cases are dealt doesn't move.** The par range holds the M9 walk (above). The alternative, shifting each range down, can't keep the same nights, because the saving varies from 0 to 5 calls a case.
2. **The second fact's offer closes on anything that changes the page.** That means a question, a look round, or a walk. The notebook and a fact read back leave it open. The spec says "in the same visit"; "right after" is the reading that makes it one confrontation.
3. **A second fact that breaks a different story of theirs ends the confrontation.** "Put another fact to her" is about what she just said. That fact can be put on its own afterwards, for the half hour.
4. **The last call.** When the first fact is the night's last call, the DA is at the door and the report opens, as it does for a "Go on" left untold. The reasoning player stops waiting for a second fact with three calls left.
5. **Marks.** A lead to an account marks every first question to that person, because every one of them takes it. The page never marks a button that doesn't take a lead, and every button that does carries the mark.
6. **Hard-boiled keeps one of the calls it saved** (`extraSlack` 2), so the reasoning player stays over 80% (above).
7. **Asked about themselves**, a suspect's evening comes after their story of themselves, with its own question, as a second family.

## Not fixed

- **Hard-boiled's median is 21, not 19** (above).
- **The errand on arrival still names the evening.** When a lead to an account brings the detective in and he then asks about somebody else, the errand ("I came to hear Zeldin out on the evening.") and the question differ, though both are true.
- **Some confront `close` cards say "The half hour was gone."** They're dealt after a free second fact that drew silence. The confrontation did take the half hour, but the line reads as if the second fact cost it.
- **Bridge cards name the person twice** ("Broadnax hadn’t given me an evening yet. One question would start it, and Broadnax was at the garage."). The bridge deck has no pronoun slots, and the older ties do the same.
- **Pre-existing, seen in the read-through and left alone:** a yapper's volunteered line after another family is asked for with "What else?"; the grounding "I remember it because it was tonight." after an account; a witness asked twice about one person under two topics (Hard-boiled seed 3, Winslow on Ashby, pages 14 and 19 of the oracle's route).

## Read-through

Rendered after the last change with `npm run read -- --seed N --tier T --no-choices` (the oracle's route, which never puts a fact to anybody), plus the reasoning player's route for the two Hard-boiled seeds, where the confrontations are. I read each page by page. What read wrong and was fixed:

- The yapper's volunteered line came after the account, so the page didn't end on the evening. The account now comes last.
- "That’s them. What about you, tonight?" was asked after one person's comings and goings. It now reads "All right. And you, tonight?".
- "I know who you mean. I know the face." came before "I might know the face if I saw it. Not the name.", and "I’m not good with names, but I’d know that one." came after it. The reply to the name is dropped when the telling says it, and the grounding is kept for somebody who has never heard the name.
- "Stannard sat down, which she had not done since I came in." was said of somebody already sitting over a newspaper. The card no longer assumes a posture.
- A "Go on" page of a question failed beat coverage. It had never happened on the oracle's route before the account could fill a fourth family.

What couldn't be fixed is under "Not fixed".

### Hard-boiled seed 7

`npm run read -- --seed 7 --tier 5 --no-choices`. The same night as in `docs/23-m10-a-notes.md`: par 22 → 17, budget 29 → 25. The oracle asks Zeldin, Dettweiler and Broadnax about somebody else, and each page ends on their evening (pages 7, 12 and 14).

```
DASHIELL · case 7 · difficulty 2 · Yorkville
Hard-boiled (6 suspects, 6 places, 5 secrets, coroner 2h, par 10–22) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 17, budget 25 (generator: 16/24), 239 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: behind-on-rent, someone-who-left, fog night.
  The office: two rooms over a pawnshop on East Eighty-Sixth Street.
  Knows Weisglass — grew-up-with (warmth +0)
  Knows Alfano — i-owe (warmth -1)
  Knows Bernstein — did-a-job-for (warmth +1)

  TEMPER
    Zeldin        plain   a bookmaker in a small way
    Weisglass     plain   a chambermaid
    Dettweiler    yap     a tailor
    Broadnax      yap     a dentist with a chair and a waiting room
    Brennan       plain   a stockbroker who trades in the street
    Brauer        enigma  a pawnbroker’s clerk
    Whitfield     plain   the elevator man
    Prentiss      enigma  the druggist
    Ruggiero      plain   the news dealer
    Alfano        yap     the man behind the counter
    Bernstein     plain   the patrolman on the beat

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a pawnshop on East Eighty-Sixth Street, Yorkville.
The landlady's bill was folded under the telephone. I'd see it every time
the thing didn't ring. I decided not to open it until it did.

"It's me, Dashiell," Weisglass said, same as always at that door. A fine
white dust sat in the creases of her knuckles, plaster rather than flour,
the kind that gets into the skin over a long day and does not fully wash out
by morning. Minnie Weisglass was a woman in her thirties. She sat straight
and stayed that way.

“Let us have it.”

“I do eleven rooms a day. The linen after that. Renfro has not been seen
since eight o’clock on Tuesday evening.”

“Renfro was owed favours by people who would rather not be reminded of
them,” she said. “Broadnax saw Renfro at the Automat at eight o’clock.
Nobody has seen Renfro since.”

“Renfro’s coat and hat are still on the hook and the money is still in the
drawer. The precinct came, looked at the room, and said to wait a day or
two.”

“I am Renfro’s former employee. I worked for Renfro four years. I was let go
in ’23, without a reference.”

“What is still between you and Renfro?”

“I want what I am owed,” Weisglass said. “Renfro has it, and I mean to be
paid whichever way this ends. The money I am spending is money I was owed. I
may never see any of it. I am spending it anyway.”

Neither of us spoke.

“Whose name have you got?”

"Start with Dettweiler. She wanted Renfro out of the lease and the lease in
her name. You know the rate." I did. I held out my hand, and twenty dollars
landed in it.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 313 words]

the subway kiosk                                      12:20 AM   page 2
────────────────────────────────────────────────────────────────────────────

Weisglass had said as much. I meant to go through the subway kiosk before
anyone else did.

Fog softened the streetlamps to a string of pale rings. Nobody was about,
and every railing I touched was beaded with damp. The subway kiosk stood at
the corner, an iron-and-glass kiosk over a stair down into the ground.
Nobody was posted to mind who went down it. At this hour trains ran less
often, and the stair saw long stretches with nobody on it at all.

Renfro was not there, which was the whole trouble.

He was not at the subway kiosk and had not been since that evening. The room
was left tidy and the bed was not slept in. The milk wagon was at the corner
at half past eight, where the driver’s round put him every night.

Nobody could put it closer than between seven o’clock and half past eight.
The precinct took a statement and filed it. A grown person was allowed to go
where they like.

So it was a train out, and the timetable it was read off. Whoever did it had
to read the departures off the wall, whether that was Renfro or somebody
else.

I wanted to know about the milk wagon on its rounds around seven o’clock.
Alfano was the one who might say. He was the man behind the counter at the
Automat.

[1 action, 2 written down, 231 words]

the fourth floor                                      12:40 AM   page 3
────────────────────────────────────────────────────────────────────────────

I had no reason but to look, so I went to the fourth floor.

Fog sat low over the row houses, blurring the streetlamps to smears.
Somewhere a window sash went down. The fourth floor belonged to Renfro, four
flights up from a street door that didn't lock. The stairwell smelled of
somebody's dinner from hours before. It was late enough that no one on the
floor was going to ask any questions about who came up. Nobody minded who
used the stairs.

There was nobody at the fourth floor. Nothing came of it. A dead end.

[1 action, 97 words]

the fourth floor                                      1:00 AM   page 4
────────────────────────────────────────────────────────────────────────────

Nothing I had found pointed here. I searched on a hunch.

It was past one, and the night went on. I took the front room first, low to
high: under the furniture, along the sill, across the tops of the shelves.
Then I did the bedroom the same way and finished in the kitchen by the sink.
There was a lease assignment made out in Dettweiler’s name, waiting only on
Renfro’s signature.

A black-lacquered cash box was there, and a framed photograph. I left them
both where they were for now.

That gave Dettweiler a reason: Dettweiler wanted Renfro out of the lease and
the lease in Dettweiler’s name.

There was an IOU for $4,000 signed by Brennan, Renfro’s brother-in-law, made
out to Renfro, three months past due.

Brennan owed Renfro four thousand dollars and was past due on it. It was not
proof of anything, but it was a reason.

The register had a room paid for at nine o’clock, cash, a week in advance,
in a name nobody at the desk could read back.

Renfro had been at the fourth floor at nine o’clock, later than I had Renfro
before. If it held, somebody had it wrong.

[1 action, 3 written down, 199 words]

the fourth floor                                      1:00 AM   page 5
────────────────────────────────────────────────────────────────────────────

I wasn’t through with the fourth floor yet.

I went on from where I had left off. The bank confirmed the account: Brennan
had been taking two hundred a month for a year, and was at the fourth floor
doing exactly that from eleven o’clock. It was theft, and it was not murder.
Four floors down, the avenue still carried the odd taxi, and its tires
drummed on the cobbles in the stretch outside the building.

It came down to embezzling from an employer. Brennan was out of it.

[free, 1 written down, 89 words]

Kaplan’s                                              1:15 AM   page 6
────────────────────────────────────────────────────────────────────────────

Weisglass sent me. I came to ask Zeldin about Dettweiler. Zeldin owed Renfro
money.

The fog muffled everything down to almost nothing, just the click of my own
heels on the stone. The drugstore with the soda fountain, where Kaplan’s
was, ran a single bulb over the register, the rest of the shop left half
dark to save on the electric bill. At this hour it drew the kind of customer
with a headache or nowhere else open.

Prentiss was wiping down the soda fountain with a damp cloth. He was the
druggist, a man in his fifties.

Zeldin was reading a folded newspaper by the light that was there. He was in
Renfro’s debt, a man in his fifties.

Zeldin was in the notebook already. Now there was a face to go with it. A
druggist's counter saw the whole neighborhood eventually, and Prentiss had
seen most of it.

[1 action, 150 words]

Kaplan’s                                              1:35 AM   page 7
────────────────────────────────────────────────────────────────────────────

Zeldin stopped reading a folded newspaper by the light that was there and
looked up as I came over. “Renfro had a neighbour across the airshaft,” I
said. “Dettweiler.”

“Lotte Dettweiler.”

“Where was Dettweiler tonight?”

Zeldin didn’t have to look anything up. “I saw her at the fourth floor at
eight o’clock. At half past eleven she was here. While the milk wagon was in
the street, she was at the Automat once and here once. I know her face and I
know her walk.”

I wrote it in the book. So Dettweiler had been at the fourth floor at eight
o’clock, if it held. That was an hour that mattered.

“And your own evening? Walk me through it.”

“I was at the Hallam with Lotte Dettweiler at seven o’clock. Then the
Automat, at half past seven. Then the fourth floor, at eight o’clock. Then
the Hallam, from half past eight until nine. At half past nine I was here. I
remember it because it was tonight.”

Zeldin had given me the evening hour by hour. It was Zeldin’s own word, and
I kept it apart from everybody else’s.

If anyone knew where Zeldin had been tonight, it would be Whitfield.
Whitfield was the elevator man at the Hallam.

[1 action, 2 written down, 209 words]

the Hallam                                            1:55 AM   page 8
────────────────────────────────────────────────────────────────────────────

I came to ask Whitfield about Zeldin.

The fog had come in off the river and settled between the buildings. I could
see the door and not much past it. The vestibule holding the Hallam kept a
night bell for callers after the desk had closed. At this hour the bell rang
rarely, and everyone in the building knew it when it did.

Whitfield was polishing the brass rail inside the elevator with a rag. He
was the elevator man: a man in his thirties.

Weisglass was waiting, and had been for a while.

She was the client. Clients kept their own hours, and I let them. Whoever
came or went by the elevator, Whitfield was part of the trip.

[1 action, 120 words]

the Hallam                                            2:15 AM   page 9
────────────────────────────────────────────────────────────────────────────

The nearest clock I could see said it was past two. Through the glass of the
street doors the avenue's signs showed red and white, and the marble squares
took a faint wash of their colour. Whitfield stopped polishing the brass
rail inside the elevator with a rag and looked up as I came over. “Zeldin
owed Renfro money,” I said.

“Sol Zeldin.”

“Where was Zeldin tonight?”

Whitfield nodded. “He wasn’t here. Not once all evening. I know who lives
here. It’s part of the job.”

I wrote it in the book. That took Zeldin out of the Hallam at seven o’clock,
if it was true. If Zeldin ever told me otherwise, I would know.

The Hallam and seven o’clock: that was the next question, and it was for
Whitfield.

[1 action, 1 written down, 130 words]

the Hallam                                            2:35 AM   page 10
────────────────────────────────────────────────────────────────────────────

I wanted Whitfield to tell me about the Hallam.

I wasn’t finished with Whitfield. “Who came in tonight? All of it.”

“At six o’clock it was Lotte Dettweiler, and nobody with her. Nobody came in
from seven until eight. One at half past eight. Nobody came in from nine
until half past. One at half past ten. One at half past eleven. I run the
car all night. I see who rides.”

I wrote that down. Whitfield named who came into the Hallam at seven
o’clock, and nobody else. Anybody else who claimed the Hallam at seven
o’clock would have to explain it.

“And the ones you didn’t know?”

“A man in his fifties at half past six. Then a man at half past eight. I
knew the faces. Not one of the names. People ride up and ride down. Nobody
introduces himself.”

A man in his fifties at the Hallam at half past six. It could have been
anybody who fit, and I didn’t pick one yet.

[1 action, 8 written down, 168 words]

the Automat                                           2:55 AM   page 11
────────────────────────────────────────────────────────────────────────────

Zeldin had sent me. The question for Dettweiler was where the evening went.

Fog off the river had swallowed the street a block away. A foghorn sounded
once, a long way off. You got into the Automat through a door that never
locked, the whole point of a place like it being that it was always open. A
few late customers sat over cold coffee at separate tables. Past midnight
the room had the particular hush of a place built for crowds and currently
holding none.

Alfano was restocking a shelf, checking each item against a list. He was the
man behind the counter: a man in his forties.

Dettweiler was smoking under the nearest light. She was a tailor: a woman in
her thirties.

Brennan, a man in his thirties, was checking a pocket watch against the
street clock.

Broadnax and a man I didn’t know were at a table by the front over coffee
and pie, eating without talking.

Dettweiler had been only a name in the notebook until now. Now the face was
across the room from me. Alfano worked behind the counter and saw everyone
who came up to it.

[1 action, 194 words]

the Automat                                           3:10 AM   page 12
────────────────────────────────────────────────────────────────────────────

A cab went by slowly, looking for a fare. It was after three. Dettweiler
left off and looked up. “Zeldin owed Renfro money,” I said.

“Sol Zeldin.”

“Where was Zeldin tonight?”

Dettweiler counted it off on her fingers. “I saw him here at half past six.
At eight o’clock he was at the fourth floor.” She went on. “At nine o’clock
he was here. At half past eleven he was at Kaplan’s. While the milk wagon
was in the street, he was at Kaplan’s. I was there, and I have eyes.”

I wrote it in the book. Eight o’clock was one of the half hours that
mattered, and now Zeldin was somewhere in it: the fourth floor, if it was
true. That was one place and one hour. A night has a good many of both.

“What else?”

Dettweiler lowered her voice. “Weisglass paid for a room at the fourth floor
at nine o’clock and went up with somebody who wasn’t walking easily. The
somebody had Renfro’s coat over one arm. I’m not guessing. I know it. People
talk. I listen. It isn’t a crime.”

It didn’t point anywhere yet. It was one more thing I knew about Renfro’s
night.

“And you? Where were you tonight?”

“Where was I? I’ll tell you where I was,” Dettweiler said. “I was at the
Hallam with Sol Zeldin at seven o’clock. Then the newsstand, at half past
seven. Then the fourth floor, from eight until half past. From nine until
half past I was here. That’s the whole of it.”

I wrote it down as Dettweiler told it. It was one person’s word about one
person.

Somebody had to account for the fourth floor at seven o’clock. Dettweiler
might, at the Automat.

[1 action, 3 written down, 289 words]
[gap: no-fact: overheard (t002) states nothing structured; its own line stands]

the Automat                                           3:10 AM   page 13
────────────────────────────────────────────────────────────────────────────

I had a question about the milk wagon on its rounds, and Alfano was the one
to ask.

Alfano stopped restocking a shelf and looked up as I came over. “What time
was the milk wagon on its rounds, exactly?” I asked.

Alfano knew me from before, and that saved us both some time.

He was sure of it, and said so. “That was at half past six, half past eight
and half past ten. You don’t miss a thing like that. It’s about the only
thing around here that’s on time.”

I put it in the notebook. So the milk wagon on its rounds was at half past
eight. Anybody seen somewhere by it had been there at half past eight.

Alfano would know where Dettweiler had been. That was the next question.

[free, 1 written down, 134 words]

the Automat                                           3:30 AM   page 14
────────────────────────────────────────────────────────────────────────────

Broadnax left off and looked up. “Renfro had a former employee,” I said.
“Weisglass.”

“I know who you mean. I know the face.”

“Since you ask,” Broadnax said. “Weisglass blamed somebody for a ruin, for
months, and was not quiet about it either, not where I could help hearing. I
wouldn’t tell you if I wasn’t sure. I could tell you more about this street
than the street would like.”

I wrote that down. So Weisglass blamed Renfro for the ruin of Weisglass’s
business. That was a reason, if Weisglass needed one.

“Now you. Where were you tonight, start to finish?”

Broadnax seemed to enjoy the telling. “I was here from seven until eight.
Then the Hallam, at half past eight. From nine until half past I was here.
Then the newsstand, from eleven until half past. I don’t keep a diary, but I
know where I’ve been.”

It was Broadnax’s evening in Broadnax’s own words. Nobody else had said any
of it yet.

I wanted to know about Renfro around seven o’clock. Broadnax might say, and
Broadnax was at the Automat.

[1 action, 2 written down, 182 words]

the Automat                                           3:50 AM   page 15
────────────────────────────────────────────────────────────────────────────

I had a question for Broadnax about Renfro.

I had another question for Broadnax. “Tell me about Renfro.”

“Oh, I saw him all right,” Broadnax said. “I saw him here from seven until
eight. At ten o’clock he was at the fourth floor. I know him. I’d know him
anywhere.”

I got it down on paper. So there was a later sight of Renfro: the fourth
floor, at ten o’clock. The night had more in it than I thought.

[1 action, 1 written down, 79 words]

the Automat                                           4:10 AM   page 16
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the fourth floor. Dettweiler might know
it.

I had heard a clock strike four a while back. I turned back to Dettweiler.
“Who did you see tonight that you didn’t know?”

“Faces I didn’t know?” Dettweiler said. “A man at the fourth floor at half
past eight. I’d seen him around. I couldn’t give you a name. I don’t know
everybody. Nobody does. People around here don’t stop to be known, and I
don’t ask.”

I wrote that down. Dettweiler had seen a man at the fourth floor at half
past eight, and had no name to give me. The description would have to wait
for one.

[1 action, 1 written down, 114 words]

the newsstand                                         4:30 AM   page 17
────────────────────────────────────────────────────────────────────────────

Broadnax set me on it. Ruggiero was who I needed, on the matter of Brauer,
Renfro’s creditor. Ruggiero was the news dealer at the newsstand.

It was still fogged in, though the shapes of things were starting to come
clear. A tugboat whistle sounded somewhere out on the river. You could reach
the newsstand from any direction, being a corner and nothing more. A single
bulb hung over the papers for the benefit of anyone reading headlines after
dark. Past midnight the stand was more habit than business.

Ruggiero was making change out of a cigar box nailed to the counter. He was
the news dealer: a man in his fifties.

Bernstein was waiting, and looking up the street now and then. He was the
patrolman on the beat, a man in his twenties.

Ruggiero saw the corner from both directions and most of the day besides.

[1 action, 147 words]

the newsstand                                         4:50 AM   page 18
────────────────────────────────────────────────────────────────────────────

The traffic light on the corner went on changing, red to green and back, and
its click was the loudest sound at the crossing. Ruggiero stopped making
change out of a cigar box nailed to the counter and looked up as I came
over. “Renfro had a creditor,” I said. “Brauer.”

“Konrad Brauer.”

“Where was Brauer tonight?”

“I saw him here at nine o’clock. He was back at half past eleven. While the
milk wagon was in the street, he was here.”

“Was there a time you know he wasn’t around?”

“Not here from six until eight or from half past nine until eleven. I’d have
seen him. He would’ve had to walk right past me.”

I put it in the notebook. That would take the newsstand away from Brauer for
six o’clock. I wanted to know what Brauer would put there instead.

[1 action, 1 written down, 143 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 4:50 AM, 10 of 25 left. 27 of 239 things written down.

PEOPLE
  Renfro, a bootlegger with the lease on the top floor — the victim
    on sight: Renfro was owed favours by people who would rather not be
    reminded of them. Renfro is a man. He is in his thirties.
    from others: Broadnax saw Renfro at the Automat at 8:00 PM, and nobody
    has seen Renfro since.
    · 7:00–8:00 PM — at the Automat (Broadnax)
    · 9:00 PM — at the fourth floor (the fourth floor)
    · 10:00 PM — at the fourth floor (Broadnax)
  Zeldin, a bookmaker in a small way (Kaplan’s)
    on sight: Zeldin is a man. He is in his fifties.
    says: 7:00 PM the Hallam; 7:30 PM the Automat; 8:00 PM the fourth floor;
    8:30 PM–9:00 PM the Hallam; 9:30 PM Kaplan’s
    · 6:00–11:30 PM — not at the Hallam (Whitfield)
    · 6:30 PM — at the Automat (Dettweiler)
    · 8:00 PM — at the fourth floor (Dettweiler)
    · 9:00 PM — at the Automat (Dettweiler)
    · 11:30 PM — at Kaplan’s (Dettweiler)
      “ Zeldin saw Dettweiler at the Automat while the milk wagon was in the
      street. Zeldin saw Dettweiler at the fourth floor at 8:00 PM. Zeldin
      saw Dettweiler at Kaplan’s while the milk wagon was in the street.
      Zeldin saw Dettweiler at Kaplan’s at 11:30 PM.
      “ Zeldin says he was at the Hallam at 7:00 PM, with Dettweiler; then
      the Automat at 7:30 PM; then the fourth floor at 8:00 PM; then the
      Hallam from 8:30 PM to 9:00 PM; then Kaplan’s at 9:30 PM.
  Weisglass, a chambermaid — our client (the Hallam)
    on sight: Weisglass is a woman. She is in her thirties. Weisglass is a
    chambermaid.
    from others: Weisglass worked for Renfro for four years and was let go
    in ’23 without a reference.
      “ Weisglass hired us, and wants it known that Dettweiler wanted Renfro
      out of the lease and the lease in Dettweiler’s name, and would rather
      we started there.
  Dettweiler, a tailor (the Automat)
    on sight: Dettweiler is a woman. She is in her thirties. Dettweiler is a
    tailor.
    documents: Dettweiler sends money out of every pay envelope and cannot
    say where it goes.
    says: 7:00 PM the Hallam; 7:30 PM the newsstand; 8:00 PM–8:30 PM the
    fourth floor; 9:00 PM–9:30 PM the Automat
    · 8:00 PM — at the fourth floor (Zeldin)
    · 11:30 PM — at Kaplan’s (Zeldin)
      “ Dettweiler saw Zeldin at the Automat at 6:30 PM and at 9:00 PM.
      Dettweiler saw Zeldin at the fourth floor at 8:00 PM. Dettweiler saw
      Zeldin at Kaplan’s while the milk wagon was in the street. Dettweiler
      saw Zeldin at Kaplan’s at 11:30 PM.
      “ Dettweiler says she was at the Hallam at 7:00 PM, with Zeldin; then
      the newsstand at 7:30 PM; then the fourth floor from 8:00 PM to 8:30
      PM; then the Automat from 9:00 PM to 9:30 PM.
      “ Dettweiler says Weisglass paid for a room at the fourth floor at
      9:00 PM and went up with somebody who was not walking easily, and the
      somebody had Renfro’s coat over one arm.
      “ Dettweiler says there was a man in his thirties I know by sight at
      the fourth floor at 8:30 PM, and Dettweiler did not know him by name.
  Broadnax, a dentist with a chair and a waiting room (the Automat)
    on sight: Broadnax is a man. He is in his fifties.
    says: 7:00 PM–8:00 PM the Automat; 8:30 PM the Hallam; 9:00 PM–9:30 PM
    the Automat; 11:00 PM–11:30 PM the newsstand
      “ Broadnax says Weisglass said Renfro had taken everything and would
      be made to feel it.
      “ Broadnax says he was at the Automat from 7:00 PM to 8:00 PM; then
      the Hallam at 8:30 PM; then the Automat from 9:00 PM to 9:30 PM; then
      the newsstand from 11:00 PM to 11:30 PM.
      “ Broadnax saw Renfro at the Automat from 7:00 PM to 8:00 PM. Broadnax
      saw Renfro at the fourth floor at 10:00 PM.
  Brennan, a stockbroker who trades in the street (the Automat)
    on sight: Brennan is a man. He is in his thirties.
    from others: Brennan married Renfro’s sister in ’22 and has been in the
    family ever since.
    documents: Brennan had a key to the fourth floor that Brennan had no
    business having.
    · 11:00 PM — at the fourth floor (the fourth floor)
  Brauer, a pawnbroker’s clerk (the Automat)
    on sight: Brauer is a man. He is in his thirties.
    · 6:00–8:00 PM — not at the newsstand (Ruggiero)
    · 9:00 PM — at the newsstand (Ruggiero)
    · 9:30–11:00 PM — not at the newsstand (Ruggiero)
    · 11:30 PM — at the newsstand (Ruggiero)
  Whitfield, the elevator man (the Hallam)
    on sight: Whitfield is a man. He is in his thirties. Whitfield is an
    elevator man.
      “ Whitfield says Zeldin did not come by the Hallam all evening.
      “ Whitfield says nobody came into the Hallam from 7:00 PM to 8:00 PM.
      “ Whitfield says nobody came into the Hallam from 9:00 PM to 9:30 PM.
      “ Whitfield says nobody but Dettweiler came into the Hallam at 6:00
      PM.
      “ Whitfield says one person came into the Hallam at 8:30 PM, and
      nobody else.
      “ Whitfield says one person came into the Hallam at 10:30 PM, and
      nobody else.
      “ Whitfield says one person came into the Hallam at 11:30 PM, and
      nobody else.
      “ Whitfield says there was a man in his fifties I know by sight at the
      Hallam at 6:30 PM, and Whitfield did not know him by name.
      “ Whitfield says there was a man in his fifties I know by sight at the
      Hallam at 8:30 PM, and Whitfield did not know him by name.
  Prentiss, the druggist (Kaplan’s)
    on sight: Prentiss is a man. He is in his fifties. Prentiss is a
    druggist.
  Ruggiero, the news dealer (the newsstand)
    on sight: Ruggiero is a man. He is in his fifties. Ruggiero is a news
    dealer.
      “ Ruggiero saw Brauer at the newsstand while the milk wagon was in the
      street. Ruggiero saw Brauer at the newsstand at 9:00 PM and at 11:30
      PM. Ruggiero did not see Brauer the rest of the evening.
  Alfano, the man behind the counter (the Automat)
    on sight: Alfano is a man. He is in his forties. Alfano is a man behind
    the counter.
      “ Alfano says it: The milk wagon on its rounds came at 6:30 PM, 8:30
      PM, 10:30 PM.
  Bernstein, the patrolman on the beat (the newsstand)
    on sight: Bernstein is a man. He is in his twenties. Bernstein is a
    patrolman on the beat.

PLACES
  the fourth floor — private, unwatched
      “ Found at the fourth floor: A lease assignment made out in
      Dettweiler’s name, waiting only on Renfro’s signature.
      “ Found at the fourth floor: An IOU for $4,000 signed by Brennan, made
      out to Renfro, three months past due.
      “ The register at the fourth floor has a room paid for at 9:00 PM,
      cash, a week in advance, in a name nobody at the desk could read back.
      “ The bank confirms the account: Brennan has been taking two hundred a
      month for a year, and was at the fourth floor doing exactly that from
      11:00 PM. It is theft, and it is not murder.
  the Hallam — private, watched by the elevator-man
  Kaplan’s — public, watched by the druggist
  the subway kiosk — public, unwatched
      “ Renfro is not at the subway kiosk and has not been since that
      evening. The room was left tidy and the bed was not slept in. The milk
      wagon was at the corner at 8:30 PM, where the driver’s round puts him
      every night.
      “ Nobody can put it closer than between 7:00 PM and 8:30 PM. The
      precinct took a statement and filed it. A grown person is allowed to
      go where they like.
  the newsstand — public, watched by the newsstand
  the Automat — public, watched by the counterman
  the office — private, unwatched

LEADS
  the Automat
    · Ask Alfano about Dettweiler
    · Ask Broadnax about Brauer

ESTABLISHED
  when they were last seen: 8:30 PM
  how it was done: a train out, and the timetable it was read off
  motives: Dettweiler — wanted a lease; Brennan — owed money; Weisglass — blamed somebody for a ruin
  had the means: nobody yet
  accounted for: Brennan

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who took Renfro           Weisglass                   ✓
  Where Renfro is           the fourth floor            ✓
  Why                       revenge — blamed somebody for a ruin✓

  Where they were at 8:30 PM:
    Zeldin                  the Automat                 ✓
    Weisglass               the subway kiosk            ✓
    Dettweiler              the fourth floor            ✓
    Broadnax                the Hallam                  ✓
    Brennan                 the fourth floor            ✓
    Brauer                  the newsstand               ✓

  9 of 9 · solved · 15 actions against par 17

Renfro is at the fourth floor, and has been since 8:30 PM, and did not want
finding.

The DA went down the column for 8:30 PM. I had 6 of 6 where they were:
Zeldin at the Automat, Weisglass at the subway kiosk, Dettweiler at the
fourth floor, Broadnax at the Hallam, Brennan at the fourth floor and Brauer
at the newsstand.

I write the address down and I do not write down what it cost to get it. 9
out of 9, and it took me 15 calls. It could have been done in 17. I will not
be telling anybody.

I found the one I was sent to find, and that is the whole of it and enough
of it. The rest of the file is arithmetic.

HOW IT COULD BE KNOWN
════════════════════════════════════════════════════════════════════════════

Who: Weisglass was the only one who could have been at the subway kiosk when
it happened. (it takes trying one answer and seeing it fail)
    · Over by 8:30. How: a train out, and the timetable it was read off.
    Found at the scene.
    · The crime: between 7:00 and 8:30. How: a train out, and the timetable
    it was read off. The coroner says so.
    · Dettweiler: the Automat, when the milk wagon on its rounds happened;
    the fourth floor, 8:00; Kaplan’s, when the milk wagon on its rounds
    happened; Kaplan’s, 11:30. Zeldin saw her.
    · Renfro: the Automat, 7:00–8:00; the fourth floor, 10:00. Renfro was
    alive until at least 8:00. Broadnax saw him.
    · Zeldin: not at the Hallam, all evening. Whitfield says so.
    · Brauer: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 9:00, 11:30; not at the newsstand, 6:00–8:00, 9:30–11:00.
    Ruggiero saw him.
    · Dettweiler says: the Hallam, 7:00, with Zeldin; the newsstand, 7:30;
    the fourth floor, 8:00–8:30; the Automat, 9:00–9:30.
    · The milk wagon on its rounds: 6:30, 8:30, 10:30. Alfano says so.
    · A man, known to Dettweiler by sight only: the fourth floor, 8:30.
    Dettweiler saw him.
    · A man, known to Whitfield by sight only: the Hallam, 8:30. Whitfield
    saw him.
    · Zeldin, put to twice, said where Zeldin really was.

When: It happened in the half hour from 8:30.
    · Over by 8:30. How: a train out, and the timetable it was read off.
    Found at the scene.
    · The crime: between 7:00 and 8:30. How: a train out, and the timetable
    it was read off. The coroner says so.
    · Renfro: the Automat, 7:00–8:00; the fourth floor, 10:00. Renfro was
    alive until at least 8:00. Broadnax saw him.

Where Zeldin was: Zeldin was at the Automat at 8:30.
    · Zeldin: not at the Hallam, all evening. Whitfield says so.
    · Zeldin, put to twice, said where Zeldin really was.

Where Weisglass was: Weisglass was at the subway kiosk at 8:30. (it takes
trying one answer and seeing it fail)
    · Over by 8:30. How: a train out, and the timetable it was read off.
    Found at the scene.
    · The crime: between 7:00 and 8:30. How: a train out, and the timetable
    it was read off. The coroner says so.
    · Dettweiler: the Automat, when the milk wagon on its rounds happened;
    the fourth floor, 8:00; Kaplan’s, when the milk wagon on its rounds
    happened; Kaplan’s, 11:30. Zeldin saw her.
    · Renfro: the Automat, 7:00–8:00; the fourth floor, 10:00. Renfro was
    alive until at least 8:00. Broadnax saw him.
    · Zeldin: not at the Hallam, all evening. Whitfield says so.
    · Brauer: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 9:00, 11:30; not at the newsstand, 6:00–8:00, 9:30–11:00.
    Ruggiero saw him.
    · Dettweiler says: the Hallam, 7:00, with Zeldin; the newsstand, 7:30;
    the fourth floor, 8:00–8:30; the Automat, 9:00–9:30.
    · The milk wagon on its rounds: 6:30, 8:30, 10:30. Alfano says so.
    · A man, known to Dettweiler by sight only: the fourth floor, 8:30.
    Dettweiler saw him.
    · A man, known to Whitfield by sight only: the Hallam, 8:30. Whitfield
    saw him.
    · Zeldin, put to twice, said where Zeldin really was.

Where Dettweiler was: Dettweiler was at the fourth floor at 8:30.
    · Dettweiler: the Automat, when the milk wagon on its rounds happened;
    the fourth floor, 8:00; Kaplan’s, when the milk wagon on its rounds
    happened; Kaplan’s, 11:30. Zeldin saw her.
    · Dettweiler says: the Hallam, 7:00, with Zeldin; the newsstand, 7:30;
    the fourth floor, 8:00–8:30; the Automat, 9:00–9:30.

Where Broadnax was: Broadnax was at the Hallam at 8:30. (it takes trying one
answer and seeing it fail)
    · Over by 8:30. How: a train out, and the timetable it was read off.
    Found at the scene.
    · The crime: between 7:00 and 8:30. How: a train out, and the timetable
    it was read off. The coroner says so.
    · Renfro: the Automat, 7:00–8:00; the fourth floor, 10:00. Renfro was
    alive until at least 8:00. Broadnax saw him.
    · Zeldin: not at the Hallam, all evening. Whitfield says so.
    · Brauer: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 9:00, 11:30; not at the newsstand, 6:00–8:00, 9:30–11:00.
    Ruggiero saw him.
    · Broadnax says: the Automat, 7:00–8:00; the Hallam, 8:30; the Automat,
    9:00–9:30; the newsstand, 11:00–11:30.
    · The milk wagon on its rounds: 6:30, 8:30, 10:30. Alfano says so.
    · A man, known to Dettweiler by sight only: the fourth floor, 8:30.
    Dettweiler saw him.
    · A man, known to Whitfield by sight only: the Hallam, 8:30. Whitfield
    saw him.
    · Zeldin, put to twice, said where Zeldin really was.

Where Brennan was: Brennan was at the fourth floor at 8:30. (it takes trying
one answer and seeing it fail)
    · Over by 8:30. How: a train out, and the timetable it was read off.
    Found at the scene.
    · The crime: between 7:00 and 8:30. How: a train out, and the timetable
    it was read off. The coroner says so.
    · Renfro: the Automat, 7:00–8:00; the fourth floor, 10:00. Renfro was
    alive until at least 8:00. Broadnax saw him.
    · Zeldin: not at the Hallam, all evening. Whitfield says so.
    · Brauer: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 9:00, 11:30; not at the newsstand, 6:00–8:00, 9:30–11:00.
    Ruggiero saw him.
    · Broadnax says: the Automat, 7:00–8:00; the Hallam, 8:30; the Automat,
    9:00–9:30; the newsstand, 11:00–11:30.
    · The milk wagon on its rounds: 6:30, 8:30, 10:30. Alfano says so.
    · A man, known to Dettweiler by sight only: the fourth floor, 8:30.
    Dettweiler saw him.
    · A man, known to Whitfield by sight only: the Hallam, 8:30. Whitfield
    saw him.
    · Zeldin, put to twice, said where Zeldin really was.

Where Brauer was: Brauer was at the newsstand at 8:30.
    · Brauer: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 9:00, 11:30; not at the newsstand, 6:00–8:00, 9:30–11:00.
    Ruggiero saw him.
    · The milk wagon on its rounds: 6:30, 8:30, 10:30. Alfano says so.

WHAT REALLY HAPPENED
════════════════════════════════════════════════════════════════════════════

Start at the beginning, then. It was Minnie Weisglass who took Isaiah
Renfro.

Renfro was a bootlegger with the lease on the top floor, and most of the
block knew him by sight. He was owed favours by people who would rather have
forgotten them. Weisglass cleaned rooms and changed beds in a hotel. She
worked for Renfro for four years and was let go in ’23 without a reference.
Weisglass blamed Renfro for the ruin of her business. She had not said a
civil word to Renfro in a long time.

At seven o’clock Weisglass was at the newsstand and pulled the timetable off
the wall. The corner of it was left pasted to the wall. From the Automat
Weisglass went on to the subway kiosk, and was there by eight o’clock.
Broadnax saw Renfro at the Automat at eight o’clock, and that was the last
sighting anybody reported. Half an hour went by before Renfro got there, at
half past eight.

It was half past eight, while the milk wagon was in the street. Nobody else
was at the subway kiosk, only those two. Weisglass took Renfro away from the
subway kiosk, with the departures already read off the timetable.

By nine o’clock Weisglass had Renfro at the fourth floor. Afterwards
Weisglass went to the Automat. She was there by half past nine. From ten
o’clock until half past eleven she was at the Hallam.

Renfro’s coat and hat were still on the hook at home, and the money was
still in the drawer. Then, after midnight, Weisglass hired me to find out
what I have just written down.

So it went. Nobody else on the block was part of it.

18 pages · 2988 words · 166 a page · 15 actions spent (1 waived) · 1 fallbacks
```

### Hard-boiled seed 3

`npm run read -- --seed 3 --tier 5 --no-choices`. Par 22 → 20, budget 29 → 28. The evening comes after strangers (Corrigan, page 4; Quill, page 17) and after a question about the victim (Stannard, page 9); Crowninshield (page 10) is asked for nothing else, so his evening is its own question.

```
DASHIELL · case 3 · difficulty 2 · Yorkville
Hard-boiled (6 suspects, 6 places, 5 secrets, coroner 2h, par 10–22) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 20, budget 28 (generator: 19/27), 200 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: bruised, someone-who-left, cold night.
  The office: two rooms over a Chinese laundry on East Eighty-Sixth Street.
  Knows Alfano — did-a-job-for (warmth +0)

  TEMPER
    Ashby         plain   the owner of the block
    Corrigan      plain   a widow with rooms on the avenue
    Crowninshield plain   a young man living on expectations
    Brauer        enigma  a switchboard operator
    Quill         yap     a party worker for the local political club
    Stannard      plain   the night manager at the hotel
    Sirkin        enigma  the doorman
    Alfano        yap     the bartender
    Winslow       yap     the news dealer
    Moretti       yap     the landlady

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a Chinese laundry on East Eighty-Sixth Street,
Yorkville. The mirror over the washbasin showed more of the night before
than I wanted explained. I turned the lamp away from it. A woman came up the
stairs after midnight.

Brauer didn't sit until I told her to. She needed help, she said, and
nothing more, and a betting slip sat folded into a small hard square in her
breast pocket, torn clean in half at some point and kept anyway. She did not
take it out, only patted the pocket once, the way a person checks a thing is
still there.

Wilhelmina Brauer was in her thirties. She put both feet flat on the floor.

“Take your time.”

“I plug the calls through. I am not supposed to listen. Thomas Callahan is
dead.”

“Callahan supplied half the bars on the block,” she said. “The other half
wished otherwise. Callahan was found dead at the fourth floor. That is where
it happened.”

“The coroner puts it between half past seven and nine. Two hours of nothing
useful. It was a gunshot.”

“Quill found Callahan at the fourth floor at half past eleven. The precinct
came, walked through it, and went.”

“I am Callahan’s former employee. I worked for Callahan four years. I was
let go in ’25, without a reference.”

“Why come to me instead of the precinct?”

“I want the one who killed Callahan found,” Brauer said. “The precinct has
stopped looking. That is why I am here. I know that asking questions on this
block is a way of being asked some. I know that much.”

She took a moment.

“Who had a reason to want Callahan out of the way?”

"Start with Corrigan. Corrigan was jealous of Callahan over Gittel Kessler."
That was the whole of it. I took twenty dollars and didn't ask for more
explaining than I'd been given.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 333 words]

the fourth floor                                      12:15 AM   page 2
────────────────────────────────────────────────────────────────────────────

Brauer had named it first. I came to go through it, drawer by drawer.

It was cold enough that the doorknob stung my hand through the glove. The
building holding the fourth floor was the ordinary kind: walk-up, no
elevator, a super who lived in the basement and kept odd hours. By this hour
the halls had gone still, the traffic sound from the street had thinned to
almost nothing. No one was posted to see who came and went. The police had
come and gone.

Callahan was still on the floor where he had fallen. Nobody else was there.
The cigarette left going burned itself out on the sill where it fell. The
last edition came off the truck at half past eight, and a paper from that
run was here with the ink still wet.

The coroner’s man had left a note on the back of an intake form. The coroner
put death between half past seven and nine. One bullet below the sternum.
Powder burns on the shirt front: fired close.

The coroner’s window was wide. The last edition coming off the truck at half
past eight might narrow it, if the rest agreed. So the last edition coming
off the truck was at half past eight. Anybody seen somewhere by it had been
there at half past eight.

[1 action, 2 written down, 222 words]

the subway kiosk                                      12:35 AM   page 3
────────────────────────────────────────────────────────────────────────────

Brauer told me where to look. I came to hear what Corrigan could tell me of
the Wyckoff.

Nobody was out in the cold who didn’t have to be. A man went by with his
hands deep in his pockets and didn’t look up. The subway kiosk was open at
all hours, being a stair and not a building, and no one minded who used it.
A single bulb lit the top step, brighter than anything the bottom ever got.
This late that stair saw fewer people than at any other hour of the day.

Corrigan, a woman in her fifties, was sitting with gloved hands folded,
waiting for nothing to hurry.

Corrigan had been only a name in the notebook until now. Now the face was
across the room from me.

[1 action, 132 words]

the subway kiosk                                      12:50 AM   page 4
────────────────────────────────────────────────────────────────────────────

I asked because Brauer had raised the Wyckoff.

Corrigan left off and looked up. “Anybody come through tonight that you
didn’t know?” I asked.

“A man at the Wyckoff at half past eight. I’d seen him around. I couldn’t
give you a name. I don’t pay much attention to who people are.”

I wrote it in the book. A man at the Wyckoff at half past eight. It could
have been anybody who fit, and I didn’t pick one yet.

“Your turn. Where did the evening take you?”

Corrigan told it in order. “I was here from seven until half past. Then the
Wyckoff, from eight until half past. Then the speakeasy, from nine until
half past. Then the newsstand with the night manager at the hotel, from ten
until eleven. That’s the whole of it.”

It was Corrigan’s evening in Corrigan’s own words. Nobody else had said any
of it yet.

People who have been let go remember why. The next name was Stannard,
Callahan’s former employee. Corrigan could tell me more, at the subway
kiosk.

[1 action, 2 written down, 177 words]

the subway kiosk                                      1:10 AM   page 5
────────────────────────────────────────────────────────────────────────────

It was one and after. I wasn’t finished with Corrigan. “Callahan had a
former employee. Stannard.”

“The night manager at the hotel.”

“Where was Stannard tonight?”

“I saw her at the Wyckoff at eight o’clock. At nine o’clock she was at the
speakeasy. I’m sure of that much. That’s all I saw.”

I wrote that down. Eight o’clock was one of the half hours that mattered,
and now Stannard was somewhere in it: the Wyckoff, if it was true. A place
and an hour was worth something. It would be worth more with a second one
beside it.

Stannard was next, at the speakeasy. The question was Callahan, around half
past seven.

[1 action, 1 written down, 112 words]

Mrs. Teague’s                                         1:25 AM   page 6
────────────────────────────────────────────────────────────────────────────

Brauer's own words sent me. I came to hear Moretti out on Brauer. Moretti
was the landlady at Mrs. Teague’s.

The cold had sent everybody indoors early. The front steps had a skin of
frost on them. Mrs. Teague’s was a back room in a rooming house, reached
down a hall that ran past four other doors just like it. At this hour the
house had gone still, every door shut for the night.

Moretti was counting out coins from a rent envelope, stacking them by
denomination. She was the landlady: a woman in her fifties.

Brauer was waiting, and had been for a while. She patted the breast pocket
with the betting slip in it again.

Brauer was the client, and the client was paying. Moretti watched the door
the way any landlady did, without appearing to.

[1 action, 138 words]

Mrs. Teague’s                                         1:45 AM   page 7
────────────────────────────────────────────────────────────────────────────

Moretti stopped counting out coins from a rent envelope and looked up as I
came over. “Callahan had a former employee,” I said. “Brauer.”

“Wilhelmina Brauer.”

“Where was Brauer tonight?”

“Oh, I saw her all right,” Moretti said. “I saw her at the speakeasy at half
past six. From eight until half past nine she was here. She was back from
half past ten until eleven.”

“Any time you’d swear she wasn’t there?”

“Not here at six o’clock, from seven until half past, at ten o’clock or at
half past eleven. I’d have heard her.”

I wrote that down. That took Brauer out of Mrs. Teague’s at half past seven,
if it was true. If Brauer ever told me otherwise, I would know.

“And the ones you didn’t know?”

“Faces I didn’t know?” Moretti said. “A man in his fifties at the speakeasy
at half past six. I didn’t know him. I don’t learn names off the backs of
people’s coats. Half the people through here I wouldn’t know again, and the
other half I’d rather not.”

Moretti had seen a man in his fifties at the speakeasy at half past six, and
had no name to give me. The description would have to wait for one.

I wanted to know about the fourth floor around half past seven. Alfano was
the one who might say. He was the bartender at the speakeasy.

[1 action, 2 written down, 233 words]

the speakeasy                                         2:00 AM   page 8
────────────────────────────────────────────────────────────────────────────

I wanted to hear Alfano tell the evening.

I checked my watch: after two. The cold kept the block empty and the glass
fogged from inside. The speakeasy was the only warm-looking storefront on
the street. The speakeasy was an illegal bar under a hat shop, down six
steps and through a door you had to knock on. At this hour most of the
stools were empty.

Alfano was rinsing glasses in a basin, setting them out to dry. He was the
bartender: a man in his fifties.

Stannard was sitting with a drink and not drinking it. She was the night
manager at the hotel, a woman in her fifties.

Two men were in a booth along the wall, laughing at something one of them
had said.

Stannard was in the notebook already. Now there was a face to go with it.
Alfano watched the room the way anyone behind a bar did, without seeming to.

[1 action, 157 words]

the speakeasy                                         2:15 AM   page 9
────────────────────────────────────────────────────────────────────────────

Corrigan had said as much about Stannard. I wanted it from Stannard
directly.

Stannard looked up when I sat down. “Tell me about Callahan,” I said.

Stannard nodded. “I saw him at the Wyckoff at eight o’clock. I know his face
and I know his walk.”

I wrote that down. Whoever did it had been at the fourth floor at half past
eight. That was the time everybody would have to account for.

“And your own evening? Walk me through it.”

Stannard started at the beginning. “I was here from seven until half past.
Then the Wyckoff, at eight o’clock. Then the newsstand, from half past eight
until nine. Then the subway kiosk, at half past nine. Then the newsstand
with the widow with rooms on the avenue, from ten until eleven. There isn’t
any more to it than that.”

I wrote it down as Stannard told it. It was one person’s word about one
person.

Stannard came next. Winslow might know where Stannard had spent the evening.
She was the news dealer at the newsstand.

[1 action, 2 written down, 176 words]

the speakeasy                                         2:35 AM   page 10
────────────────────────────────────────────────────────────────────────────

Something I had turned up made me want Crowninshield’s evening.
Crowninshield had married into Callahan’s family.

He looked up when I sat down. “Where were you tonight?” I asked. “Start at
the beginning.”

“I was here from seven until eight. Then the newsstand, at half past eight.
From nine until half past I was here. Then the subway kiosk, from ten until
eleven. I don’t keep a diary, but I know where I’ve been.”

I put it in the notebook. Crowninshield had given me the evening hour by
hour. It was Crowninshield’s own word, and I kept it apart from everybody
else’s.

[1 action, 1 written down, 102 words]

the speakeasy                                         2:35 AM   page 11
────────────────────────────────────────────────────────────────────────────

Moretti had said as much about the hour. I meant to hear Alfano’s account of
it.

Alfano stopped rinsing glasses in a basin and looked up as I came over. “The
fourth floor that evening,” I said. “Straight, and I’ll go away.”

Alfano knew me from before, and that saved us both some time.

He had been waiting for somebody to ask. “I saw him at the fourth floor at
half past eight. Nobody gets a drink in here without I see the face. I’ve
got better things to do than keep count of people, most nights.”

I put it in the notebook. It was not a theft. Nothing in the fourth floor
said different.

[free, 1 written down, 115 words]

the newsstand                                         2:50 AM   page 12
────────────────────────────────────────────────────────────────────────────

Stannard was the question, and Winslow would have the answer.

You could reach the newsstand from any direction, being a corner and nothing
more. A single bulb hung over the papers for the benefit of anyone reading
headlines after dark. Past midnight the stand was more habit than business.

Winslow was stacking the evening papers, squaring the pile against the wind.
She was the news dealer: a woman in her fifties.

Nothing much passed the newsstand that Winslow missed.

[1 action, 79 words]

the newsstand                                         3:10 AM   page 13
────────────────────────────────────────────────────────────────────────────

A fire engine went by a few streets over, its bell going. It was after
three. Winslow stopped stacking the evening papers and looked up as I came
over. “Callahan had a former employee,” I said. “Stannard.”

“Verity Stannard.”

“Where was Stannard tonight?”

Winslow counted it off on her fingers. “I saw her here from six until half
past.”

“Was there a time you know she wasn’t around?”

“Not here from seven until half past ten or at half past eleven. Not at the
speakeasy at eleven o’clock. I’d have seen her. She would’ve had to walk
right past me. People think nobody sees them. Somebody always does.”

I wrote that down. That would take the newsstand away from Stannard for half
past eight. I wanted to know what Stannard would put there instead.

A partner knows where the money goes. Ashby was Callahan’s business partner.
Winslow might know where Ashby had been.

[1 action, 1 written down, 153 words]

the newsstand                                         3:25 AM   page 14
────────────────────────────────────────────────────────────────────────────

I had another question for Winslow. “Callahan had a business partner.
Ashby.”

“Rufus Ashby.”

“Where was Ashby tonight?”

Winslow had been waiting for somebody to ask. “I saw him here at eight
o’clock. While the milk wagon was in the street, he was here.”

“Any time you’re sure he wasn’t there?”

“Not here from six until seven, from half past eight until half past ten or
at half past eleven. Not at the speakeasy at eleven o’clock. Selling papers
is mostly watching the street.”

I wrote that down. So Ashby might not have been at the newsstand at half
past eight. It was worth remembering if Ashby ever claimed it.

Sirkin would know where Ashby had been. He was the doorman at the Wyckoff.
That was the next question.

[1 action, 1 written down, 129 words]

the Wyckoff                                           3:45 AM   page 15
────────────────────────────────────────────────────────────────────────────

I wanted Sirkin’s account of Ashby.

Cold came in behind me at the Wyckoff and took the good chair. The hotel
kept the Wyckoff lit even at this hour, a habit of hotels that never fully
close. A spittoon by the door sat polished and unused. Past midnight there
was more lobby than there were people in it.

Sirkin was straightening a line of umbrellas in the stand by the door. He
was the doorman: a man in his forties.

Quill, a man in his fifties, was waiting, and not for me.

Sirkin kept the door and knew every face that went through it.

[1 action, 104 words]

the Wyckoff                                           4:00 AM   page 16
────────────────────────────────────────────────────────────────────────────

Somewhere in the building a clock struck four. Over the desk the lobby clock
ticked, loud against all that marble, and somewhere under the floor a boiler
gave a long, low groan. Sirkin stopped straightening a line of umbrellas in
the stand by the door and looked up as I came over. “Callahan had a business
partner,” I said. “Ashby.”

“Rufus Ashby.”

“Where was Ashby tonight?”

Sirkin gave it to me in pieces. “I saw him here while the milk wagon was in
the street.”

“Was there a time you know he wasn’t around?”

“Not here from six until eleven. I know the tenants. It’s part of the job.”

I wrote it in the book. That was one hour Ashby could not claim the Wyckoff
for, if it held.

If anyone knew where Ashby had been tonight, it would be Winslow.

[1 action, 1 written down, 141 words]

the Wyckoff                                           4:15 AM   page 17
────────────────────────────────────────────────────────────────────────────

It was Sirkin who raised the Wyckoff. I meant to ask Quill about it.

Quill looked up when I sat down. “Who did you see tonight that you didn’t
know?” I asked.

Quill had noticed, and was pleased to have noticed. “A woman from seven
until half past. Then a woman in her fifties at half past eight and one at
eleven o’clock. I knew the faces. Not one of the names. I notice faces. I
don’t ask for names.”

I wrote it in the book. Quill had no name for a woman in her fifties.
Whoever it turned out to be had been at the Wyckoff at half past eight.

“Now you. Where were you tonight, start to finish?”

“Where was I? I’ll tell you where I was,” Quill said. “I was here from seven
until half past. Then the speakeasy, at eight o’clock. At half past eight I
was here. Then the speakeasy, from nine until half past. Then Mrs. Teague’s,
at half past ten. I remember it because it was tonight.”

It was Quill’s evening in Quill’s own words. Nobody else had said any of it
yet.

[1 action, 4 written down, 190 words]

the newsstand                                         4:35 AM   page 18
────────────────────────────────────────────────────────────────────────────

Winslow was the one who would know where Ashby had been.

Back at the newsstand. The crowd had turned over since I was last through.
The traffic light on the corner went on changing, red to green and back, and
its click was the loudest sound at the crossing.

Winslow was stacking the evening papers, squaring the pile against the wind.
She kept the scarred hands folded again, quiet. I had come on Sirkin's word,
and Sirkin's word had held up.

[1 action, 81 words]

the newsstand                                         4:50 AM   page 19
────────────────────────────────────────────────────────────────────────────

Winslow stopped stacking the evening papers and looked up as I came over.
“Callahan had a business partner,” I said. “Ashby.”

“Rufus Ashby. He and Callahan took the lease together in ’20 and have been
arguing about it since.”

“Since you ask,” Winslow said. “Ashby wanted a lease, and it went back
years, the kind of trouble that doesn't just go away on its own.”

“You’re sure it was Ashby?”

“I know him. That’s how I know. People talk. I listen. It isn’t a crime.”

I put it in the notebook. That was motive, plainly: Ashby wanted Callahan
out of the lease and the lease in Ashby’s name. That didn’t make him
anything yet. It made him somebody who could.

The newsstand and half past eight: that was the next question, and it was
for Winslow.

[1 action, 1 written down, 136 words]

the newsstand                                         5:10 AM   page 20
────────────────────────────────────────────────────────────────────────────

I wanted to ask Winslow about the newsstand.

It was past five, and I was hungry, and that would have to wait. I turned
back to Winslow. “Who came through here tonight? Start at the beginning.”

“I can tell you exactly,” Winslow said. “One came in at six o’clock. One at
half past six. From half past seven until eight it was Rufus Ashby, and
nobody with him. One at half past eight. Nobody came in from nine until half
past ten. I count papers all night. I count people too, when there’s nothing
else.”

I got it down on paper. Winslow kept the newsstand, and at nine o’clock
nobody came in but the ones Winslow named. It was a short list.

“Anybody else through here tonight that you didn’t know?”

“Faces I didn’t know?” Winslow said. “A man at half past eight. I didn’t
know him. People buy a paper. They don’t give a name.”

No name from Winslow, only a man. I wrote it down the way it was said.

[1 action, 8 written down, 172 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 5:10 AM, 10 of 28 left. 28 of 200 things written down.

PEOPLE
  Callahan, a bootlegger with the lease on the top floor — the victim
    on sight: Callahan supplied half the bars on the block, and the other
    half wished otherwise. Callahan is a man. He is in his thirties.
    from others: Quill found Callahan at the fourth floor at 11:30 PM.
    Callahan supplied half the bars on the block, and the other half wished
    otherwise.
    · 8:00 PM — at the Wyckoff (Stannard)
    · 8:30 PM — at the fourth floor (Alfano)
  Ashby, the owner of the block (the speakeasy)
    on sight: Ashby is a man. He is in his fifties.
    from others: Ashby and Callahan took the lease together in ’20 and have
    been arguing about it since.
    · 6:00–7:00 PM — not at the newsstand (Winslow)
    · 6:00–11:00 PM — not at the Wyckoff (Sirkin)
    · 8:00 PM — at the newsstand (Winslow)
    · 8:30–10:30 PM — not at the newsstand (Winslow)
    · 11:00 PM — not at the speakeasy (Winslow)
    · 11:30 PM — not at the newsstand (Winslow)
  Corrigan, a widow with rooms on the avenue (the subway kiosk)
    on sight: Corrigan is a woman. She is in her fifties.
    says: 7:00 PM–7:30 PM the subway kiosk; 8:00 PM–8:30 PM the Wyckoff;
    9:00 PM–9:30 PM the speakeasy; 10:00 PM–11:00 PM the newsstand
      “ Corrigan says there was a man in his fifties I know by sight at the
      Wyckoff at 8:30 PM, and Corrigan did not know him by name.
      “ Corrigan says she was at the subway kiosk from 7:00 PM to 7:30 PM;
      then the Wyckoff from 8:00 PM to 8:30 PM; then the speakeasy from 9:00
      PM to 9:30 PM; then the newsstand from 10:00 PM to 11:00 PM, with
      Stannard.
      “ Corrigan saw Stannard at the Wyckoff at 8:00 PM. Corrigan saw
      Stannard at the speakeasy at 9:00 PM.
  Crowninshield, a young man living on expectations (the speakeasy)
    on sight: Crowninshield is a man. He is in his twenties.
    says: 7:00 PM–8:00 PM the speakeasy; 8:30 PM the newsstand; 9:00 PM–9:30
    PM the speakeasy; 10:00 PM–11:00 PM the subway kiosk
      “ Crowninshield says he was at the speakeasy from 7:00 PM to 8:00 PM;
      then the newsstand at 8:30 PM; then the speakeasy from 9:00 PM to 9:30
      PM; then the subway kiosk from 10:00 PM to 11:00 PM.
  Brauer, a switchboard operator — our client (Mrs. Teague’s)
    on sight: Brauer is a woman. She is in her thirties. Brauer is a
    switchboard operator.
    · 6:00 PM — not at Mrs. Teague’s (Moretti)
    · 6:30 PM — at the speakeasy (Moretti)
    · 7:00–7:30 PM — not at Mrs. Teague’s (Moretti)
    · 8:00–9:30 PM — at Mrs. Teague’s (Moretti)
    · 10:00 PM — not at Mrs. Teague’s (Moretti)
    · 10:30–11:00 PM — at Mrs. Teague’s (Moretti)
    · 11:30 PM — not at Mrs. Teague’s (Moretti)
      “ Brauer hired us, and wants it known that Corrigan was jealous of
      Callahan over Gittel Kessler, and would rather we started there.
  Quill, a party worker for the local political club (the Wyckoff)
    on sight: Quill is a man. He is in his fifties.
    says: 7:00 PM–7:30 PM the Wyckoff; 8:00 PM the speakeasy; 8:30 PM the
    Wyckoff; 9:00 PM–9:30 PM the speakeasy; 10:30 PM Mrs. Teague’s
      “ Quill says there was a woman in her fifties I know by sight at the
      Wyckoff at 8:30 PM, and Quill did not know her by name.
      “ Quill says there was a woman in her thirties I know by sight at the
      Wyckoff from 7:00 PM to 7:30 PM, and Quill did not know her by name.
      “ Quill says there was a woman in her fifties I know by sight at the
      Wyckoff at 11:00 PM, and Quill did not know her by name.
      “ Quill says he was at the Wyckoff from 7:00 PM to 7:30 PM; then the
      speakeasy at 8:00 PM; then the Wyckoff at 8:30 PM; then the speakeasy
      from 9:00 PM to 9:30 PM; then Mrs. Teague’s at 10:30 PM.
  Stannard, the night manager at the hotel (the speakeasy)
    on sight: Stannard is a woman. She is in her fifties. Stannard is a
    night manager at the hotel.
    says: 7:00 PM–7:30 PM the speakeasy; 8:00 PM the Wyckoff; 8:30 PM–9:00
    PM the newsstand; 9:30 PM the subway kiosk; 10:00 PM–11:00 PM the
    newsstand
    · 6:00–6:30 PM — at the newsstand (Winslow)
    · 7:00–10:30 PM — not at the newsstand (Winslow)
    · 8:00 PM — at the Wyckoff (Corrigan)
    · 9:00 PM — at the speakeasy (Corrigan)
    · 11:00 PM — not at the speakeasy (Winslow)
    · 11:30 PM — not at the newsstand (Winslow)
      “ Stannard saw Callahan at the Wyckoff at 8:00 PM.
      “ Stannard says she was at the speakeasy from 7:00 PM to 7:30 PM; then
      the Wyckoff at 8:00 PM; then the newsstand from 8:30 PM to 9:00 PM;
      then the subway kiosk at 9:30 PM; then the newsstand from 10:00 PM to
      11:00 PM, with Corrigan.
  Sirkin, the doorman (the Wyckoff)
    on sight: Sirkin is a man. He is in his forties. Sirkin is a doorman.
      “ Sirkin saw Ashby at the Wyckoff while the milk wagon was in the
      street. Sirkin did not see Ashby the rest of the evening.
  Alfano, the bartender (the speakeasy)
    on sight: Alfano is a man. He is in his fifties. Alfano is a bartender.
      “ Alfano says the door at the fourth floor was shut from 8:30 PM on,
      and nobody came out of it carrying anything.
  Winslow, the news dealer (the newsstand)
    on sight: Winslow is a woman. She is in her fifties. Winslow is a news
    dealer.
      “ Winslow saw Stannard at the newsstand from 6:00 PM to 6:30 PM.
      Winslow did not see Stannard the rest of the evening.
      “ Winslow saw Ashby at the newsstand while the milk wagon was in the
      street. Winslow saw Ashby at the newsstand at 8:00 PM. Winslow did not
      see Ashby the rest of the evening.
      “ Winslow says Callahan told Ashby the lease would go to somebody else
      at the end of the quarter.
      “ Winslow says nobody came into the newsstand from 9:00 PM to 10:30
      PM.
      “ Winslow says nobody but Ashby came into the newsstand from 7:30 PM
      to 8:00 PM.
      “ Winslow says one person came into the newsstand at 6:00 PM, and
      nobody else.
      “ Winslow says one person came into the newsstand at 6:30 PM, and
      nobody else.
      “ Winslow says one person came into the newsstand at 7:30 PM, and
      nobody else.
      “ Winslow says one person came into the newsstand at 8:00 PM, and
      nobody else.
      “ Winslow says one person came into the newsstand at 8:30 PM, and
      nobody else.
      “ Winslow says there was a man at the newsstand at 8:30 PM, and
      Winslow did not know him by name.
  Moretti, the landlady (Mrs. Teague’s)
    on sight: Moretti is a woman. She is in her fifties. Moretti is a
    landlady.
      “ Moretti saw Brauer at the speakeasy at 6:30 PM. Moretti saw Brauer
      at Mrs. Teague’s from 8:00 PM to 9:30 PM and from 10:30 PM to 11:00
      PM. Moretti did not see Brauer the rest of the evening.
      “ Moretti says there was a man in his fifties at the speakeasy at 6:30
      PM, and Moretti did not know him by name.

PLACES
  the Wyckoff — semi, watched by the doorman
  the speakeasy — semi, watched by the bartender
  the fourth floor — private, unwatched
      “ Callahan was found at the fourth floor. The cigarette left going
      burned itself out on the sill where it fell. The last edition came off
      the truck at 8:30 PM, and a paper from that run is here with the ink
      still wet.
      “ The coroner puts death between 7:30 PM and 9:00 PM. One bullet below
      the sternum. Powder burns on the shirt front: fired close.
  the subway kiosk — public, unwatched
  the newsstand — public, watched by the newsstand
  Mrs. Teague’s — private, watched by the landlady
  the office — private, unwatched

LEADS
  Nothing open.

ESTABLISHED
  time of death: 8:30 PM
  method: a gunshot
  motives: Corrigan — was jealous over a woman; Ashby — wanted a lease
  near the weapon: Brauer
  accounted for: nobody yet

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who killed Callahan       Ashby                       ✓
  Why                       property — wanted a lease   ✓
  When                      8:30 PM                     ✓

  Where they were at 8:30 PM:
    Ashby                   the fourth floor            ✓
    Corrigan                the Wyckoff                 ✓
    Crowninshield           the newsstand               ✓
    Brauer                  Mrs. Teague’s               ✓
    Quill                   the Wyckoff                 ✓
    Stannard                the speakeasy               ✓

  9 of 9 · solved · 18 actions against par 20

The DA reads it twice and does not find anything to argue with. Ashby killed
Callahan at the fourth floor, 8:30 PM, and the jury takes ninety minutes
over lunch.

The DA went down the column for 8:30 PM. I had 6 of 6 where they were: Ashby
at the fourth floor, Corrigan at the Wyckoff, Crowninshield at the
newsstand, Brauer at Mrs. Teague’s, Quill at the Wyckoff and Stannard at the
speakeasy.

Ashby hangs in the spring. I am told it rained. 9 out of 9, and it took me
18 calls. It could have been done in 20. I will not be telling anybody.

The file went upstairs clean, Ashby's name at the top and the evidence lined
up under it in order. I was home before the milk wagons finished their
rounds.

HOW IT COULD BE KNOWN
════════════════════════════════════════════════════════════════════════════

Who: Ashby was the only one who could have been at the fourth floor when it
happened. (it takes trying one answer and seeing it fail)
    · Over by 8:30. How: a gunshot. The last edition coming off the truck:
    8:30. Found at the scene.
    · Callahan: the Wyckoff, 8:00. Callahan was alive until at least 8:00.
    Stannard saw him.
    · Ashby: the Wyckoff, when the milk wagon on its rounds happened; not at
    the Wyckoff, 6:00–11:00. Sirkin saw him.
    · Ashby: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 8:00; not at the newsstand, 6:00–7:00, 8:30–10:30, 11:30; not
    at the speakeasy, 11:00. Winslow saw him.
    · Stannard: the newsstand, 6:00–6:30; not at the newsstand, 7:00–10:30,
    11:30; not at the speakeasy, 11:00. Winslow saw her.
    · Brauer: the speakeasy, 6:30; Mrs. Teague’s, 8:00–9:30, 10:30–11:00;
    not at Mrs. Teague’s, 6:00, 7:00–7:30, 10:00, 11:30. Brauer could have
    got hold of it. Moretti saw her.
    · A man, known to Corrigan by sight only: the Wyckoff, 8:30. Corrigan
    saw him.
    · A woman in her fifties, known to Quill by sight only: the Wyckoff,
    8:30. Quill saw her.
    · A man, a stranger to Winslow: the newsstand, 8:30. Winslow saw him.
    · Stannard, put to twice, said where Stannard really was.

When: It happened in the half hour from 8:30.
    · Over by 8:30. How: a gunshot. The last edition coming off the truck:
    8:30. Found at the scene.
    · Callahan: the Wyckoff, 8:00. Callahan was alive until at least 8:00.
    Stannard saw him.

Where Ashby was: Ashby was at the fourth floor at 8:30. (it takes trying one
answer and seeing it fail)
    · Over by 8:30. How: a gunshot. The last edition coming off the truck:
    8:30. Found at the scene.
    · Callahan: the Wyckoff, 8:00. Callahan was alive until at least 8:00.
    Stannard saw him.
    · Ashby: the Wyckoff, when the milk wagon on its rounds happened; not at
    the Wyckoff, 6:00–11:00. Sirkin saw him.
    · Ashby: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 8:00; not at the newsstand, 6:00–7:00, 8:30–10:30, 11:30; not
    at the speakeasy, 11:00. Winslow saw him.
    · Stannard: the newsstand, 6:00–6:30; not at the newsstand, 7:00–10:30,
    11:30; not at the speakeasy, 11:00. Winslow saw her.
    · Brauer: the speakeasy, 6:30; Mrs. Teague’s, 8:00–9:30, 10:30–11:00;
    not at Mrs. Teague’s, 6:00, 7:00–7:30, 10:00, 11:30. Brauer could have
    got hold of it. Moretti saw her.
    · A man, known to Corrigan by sight only: the Wyckoff, 8:30. Corrigan
    saw him.
    · A woman in her fifties, known to Quill by sight only: the Wyckoff,
    8:30. Quill saw her.
    · A man, a stranger to Winslow: the newsstand, 8:30. Winslow saw him.
    · Stannard, put to twice, said where Stannard really was.

Where Corrigan was: Corrigan was at the Wyckoff at 8:30.
    · Stannard: the newsstand, 6:00–6:30; not at the newsstand, 7:00–10:30,
    11:30; not at the speakeasy, 11:00. Winslow saw her.
    · A woman in her fifties, known to Quill by sight only: the Wyckoff,
    8:30. Quill saw her.
    · Stannard, put to twice, said where Stannard really was.

Where Crowninshield was: Crowninshield was at the newsstand at 8:30. (it
takes trying one answer and seeing it fail)
    · Over by 8:30. How: a gunshot. The last edition coming off the truck:
    8:30. Found at the scene.
    · Callahan: the Wyckoff, 8:00. Callahan was alive until at least 8:00.
    Stannard saw him.
    · Ashby: the Wyckoff, when the milk wagon on its rounds happened; not at
    the Wyckoff, 6:00–11:00. Sirkin saw him.
    · Ashby: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 8:00; not at the newsstand, 6:00–7:00, 8:30–10:30, 11:30; not
    at the speakeasy, 11:00. Winslow saw him.
    · Crowninshield says: the speakeasy, 7:00–8:00; the newsstand, 8:30; the
    speakeasy, 9:00–9:30; the subway kiosk, 10:00–11:00.
    · A man, known to Corrigan by sight only: the Wyckoff, 8:30. Corrigan
    saw him.
    · A man, a stranger to Winslow: the newsstand, 8:30. Winslow saw him.

Where Brauer was: Brauer was at Mrs. Teague’s at 8:30.
    · Brauer: the speakeasy, 6:30; Mrs. Teague’s, 8:00–9:30, 10:30–11:00;
    not at Mrs. Teague’s, 6:00, 7:00–7:30, 10:00, 11:30. Brauer could have
    got hold of it. Moretti saw her.

Where Quill was: Quill was at the Wyckoff at 8:30. (it takes trying one
answer and seeing it fail)
    · Over by 8:30. How: a gunshot. The last edition coming off the truck:
    8:30. Found at the scene.
    · Callahan: the Wyckoff, 8:00. Callahan was alive until at least 8:00.
    Stannard saw him.
    · Ashby: the Wyckoff, when the milk wagon on its rounds happened; not at
    the Wyckoff, 6:00–11:00. Sirkin saw him.
    · Ashby: the newsstand, when the milk wagon on its rounds happened; the
    newsstand, 8:00; not at the newsstand, 6:00–7:00, 8:30–10:30, 11:30; not
    at the speakeasy, 11:00. Winslow saw him.
    · Crowninshield says: the speakeasy, 7:00–8:00; the newsstand, 8:30; the
    speakeasy, 9:00–9:30; the subway kiosk, 10:00–11:00.
    · A man, known to Corrigan by sight only: the Wyckoff, 8:30. Corrigan
    saw him.
    · A man, a stranger to Winslow: the newsstand, 8:30. Winslow saw him.

Where Stannard was: Stannard was at the speakeasy at 8:30.
    · Stannard: the newsstand, 6:00–6:30; not at the newsstand, 7:00–10:30,
    11:30; not at the speakeasy, 11:00. Winslow saw her.
    · Stannard, put to twice, said where Stannard really was.

WHAT REALLY HAPPENED
════════════════════════════════════════════════════════════════════════════

From the beginning, then, and in order. Rufus Ashby killed Thomas Callahan.

Everybody on the street could have told you who Callahan was: a bootlegger
with the lease on the top floor. Callahan sold liquor to half the bars on
the block. He paid off the police every month and was never once raided. As
for Ashby, he was the owner of the block. Ashby and Callahan took the lease
together in ’20 and had argued about it ever since. Ashby wanted Callahan
off the lease and the lease in his own name. Callahan had told Ashby the
lease would go to somebody else at the end of the quarter.

Ashby was at the speakeasy at seven o’clock, and the nickel-plated revolver
went out of the drawer with him. The drawer was left open, with the oiled
cloth still in it. From the newsstand Ashby went on to the fourth floor.
Callahan came to the fourth floor straight from the Wyckoff, where he had
been at eight o’clock.

It was half past eight, as the last edition was coming up. Nobody was there
to see it. Ashby fired the revolver once, from close enough to burn
Callahan’s shirt front.

From nine o’clock until ten o’clock, Ashby was at the speakeasy. After that
he was at the subway kiosk, from half past ten until eleven o’clock. Then he
went to the Wyckoff, and was there at half past eleven.

The one who found Callahan was Quill. That was at the fourth floor, at half
past eleven. By then Callahan had been dead for three hours. A policeman
walked through, looked, and went.

There is nothing else to it. Everybody else on the block had their own
night, and it was not this one.

20 pages · 3082 words · 154 a page · 18 actions spent (1 waived) · 0 fallbacks
```

### Raw seed 11

`npm run read -- --seed 11 --tier 0 --no-choices`. The same night as in `docs/23-m10-a-notes.md`: par 8 → 6, budget 11 → 9. Donnelly (asked about Steinbach, page 5) and Mulcahy (asked about Donnelly, page 6) give their evenings with the answer; Steinbach, the client, is asked for hers alone.

```
DASHIELL · case 11 · difficulty 1 · the Bowery
Raw (3 suspects, 3 places, 0 secrets, coroner half an hour, par 5–7) at Beat (level 1, slack 8, noise 25–35%, depth 1, full)
par 6, budget 9 (generator: 5/8), 13 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: bruised, none, clear night.
  The office: two rooms over a Chinese laundry on Great Jones Street.
  Knows Corrigan — i-owe (warmth -1)

  TEMPER
    Steinbach     plain   a stockbroker who trades in the street
    Donnelly      yap     a pawnbroker’s clerk
    Mulcahy       plain   a chorus girl between engagements
    Corrigan      plain   the landlady
    Salerno       plain   the patrolman on the beat

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a Chinese laundry on Great Jones Street, the
Bowery, and the jaw had gone from purple to something with less name to it.
Even the low lamp showed that much. The mirror could wait for morning. A
woman came up the stairs after midnight.

Steinbach came in composed, her gloves still on, and took the chair before I
could offer it twice. She wore a fur collar worn thin in a single patch at
the throat, smaller than a thumbprint, from her own hand going there
whenever the talk turned hard. It went there twice while she sat with me.

Klara Steinbach was in her thirties. She did not lean back.

“I trade on the street. My customers would rather not be seen doing it
themselves. Wilhelmina Lindemann is dead.”

“She could put a name in the paper, and had put several there for good,” she
said. “She was found dead at the walk-up, and that is where it happened.”

“The coroner puts it at half past nine, and will swear to the half hour. It
was a blunt object.”

I said nothing.

“What time did you find Lindemann at the walk-up?”

“Half past eleven. That is when I found Lindemann at the walk-up. The
precinct came, walked through it, and went.”

“I am her creditor,” Steinbach said. “She borrowed from me to pay off
another debt. It was never mentioned to anybody. Not by either of us.”

“Why come to me instead of the precinct?”

“I want the one who killed Lindemann found. The precinct has stopped
looking. That is why I am here. I know that asking questions on this block
is a way of being asked some. I know that much.”

Neither of us spoke.

“Whose name have you got?”

"Start with Donnelly. He was in and out of there all week." That was the
whole of it. I took a hundred dollars and didn't ask for more explaining
than I'd been given.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 347 words]

the walk-up                                           12:55 AM   page 2
────────────────────────────────────────────────────────────────────────────

Steinbach had said as much. I meant to go through the walk-up before anyone
else did.

The block was quiet, every window dark but one. A car idled at the curb with
its lights off. The walk-up belonged to Lindemann, above a drugstore that
had kept its lights lit later than most. The stairwell window looked down on
the street lamp on the corner. Past midnight the building had gone as quiet
as it ever got. There was no one to notice who passed through. The police
had come and gone.

Lindemann lay where she had fallen. Nobody had covered her yet. Nobody else
was there. The lamp came down in the fall and the bulb was still warm in its
socket, unbroken. The singing under the window stopped at half past nine,
when the shoe came down.

The coroner’s office had left a note behind, for whoever came next. The
coroner put death at half past nine. One blow broke in the back of the
skull. Death was not instant.

So it had happened by about half past nine, if that held. Anybody who came
to the walk-up after that came too late. The drunk singing under the window
was at half past nine, then. Whatever anybody had seen by it happened at
half past nine as well.

[1 action, 2 written down, 219 words]

the stairwell                                         1:45 AM   page 3
────────────────────────────────────────────────────────────────────────────

Steinbach had an evening to account for.

Somewhere a baby was crying, and nobody was hurrying to it. It was past one.
The block outside the stairwell had gone quiet early, one drunk singing to
himself half a block off. My own footsteps sounded too loud for the hour.
The tenement holding the stairwell was six stories of narrow rooms and one
stair between all of them. A window at each landing looked out on the
airshaft, black at this hour. It was quiet enough to hear a door two floors
up.

Corrigan was listening from the bottom step before going up. She was the
landlady, a woman in her sixties.

Steinbach was tapping ash from a cigarette without breaking a sentence. Her
hand went to the worn place on the fur collar again.

Donnelly, a man in his forties, was smoking at a table near the wall.

A man and a woman sat on the stairs between the second and third landings,
talking in whispers.

Steinbach was the client. Clients kept their own hours, and I let them.
Corrigan watched the door the way any landlady did, without appearing to.

[1 action, 191 words]

the stairwell                                         2:40 AM   page 4
────────────────────────────────────────────────────────────────────────────

Something I had turned up made me want Steinbach’s evening.

Somewhere a door slammed and a man shouted something I didn’t catch. It was
past two. Behind one door on the second landing a radio played a dance band,
and a bare bulb on the landing above buzzed on its wire. Steinbach stopped
tapping ash from a cigarette and looked up as I came over. “Walk me through
your evening,” I said.

“I was here at eight o’clock. Then the ferry slip, from half past eight
until ten. At half past ten I was here. There isn’t any more to it than
that.”

I put it in the notebook. Steinbach had given me the evening hour by hour.
It was Steinbach’s own word, and I kept it apart from everybody else’s.

I wanted Donnelly’s word on Steinbach. Donnelly was at the stairwell.

[1 action, 1 written down, 142 words]

the stairwell                                         3:35 AM   page 5
────────────────────────────────────────────────────────────────────────────

The hour was three now. Donnelly looked up as I came over. “Lindemann had a
creditor,” I said. “Steinbach.”

“Klara Steinbach.”

“Where was Steinbach tonight?”

“Oh, I saw her all right,” Donnelly said. “I saw her here from six until
eight. At nine o’clock she was at the ferry slip. From half past ten until
eleven she was here. I know her face and I know her walk. She always looks
like she’s late for something.”

I wrote it in the book. Steinbach might have had a way into the walk-up, and
a way in was not nothing. Anybody put somewhere else when it happened
couldn’t have done it, as long as the word held.

“And where were you, all evening?”

“Where was I? I’ll tell you where I was,” Donnelly said. “I was here from
eight until half past. Then the ferry slip, at nine o’clock. From half past
nine until half past ten I was here. I don’t keep a diary, but I know where
I’ve been. I’ve had better evenings. I’ve had worse.”

It was Donnelly’s evening in Donnelly’s own words. Nobody else had said any
of it yet.

Mulcahy might know where Donnelly had spent the evening, and Mulcahy was at
the stairwell. She did business with Lindemann.

[1 action, 2 written down, 212 words]

the stairwell                                         4:25 AM   page 6
────────────────────────────────────────────────────────────────────────────

It was past four, and my eyes had started to sting. Mulcahy looked up as I
came over. “Donnelly did business with Lindemann,” I said.

“The pawnbroker’s clerk.”

“Where was Donnelly tonight?”

Mulcahy nodded. “I saw him here from six until half past eight. He was back
from ten until half past eleven. I’ve seen enough of him to know him.”

I got it down on paper. Donnelly could have got into the walk-up. That put
it within reach, if nothing more.

“All right. And you, tonight?”

Mulcahy started at the beginning. “I was here from eight until half past
ten. I remember it because it was tonight.”

I wrote it down as Mulcahy told it. It was one person’s word about one
person.

[1 action, 2 written down, 124 words]

the stairwell                                         4:25 AM   page 7
────────────────────────────────────────────────────────────────────────────

No one had said to ask Corrigan about Mulcahy. I asked.

Corrigan stopped listening from the bottom step before going up and looked
up as I came over. “Cut the polish,” I said. “What's Mulcahy really like?”

Corrigan knew me from before, and that saved us both some time.

“I saw her here from six until half past seven. She was back at half past
eight. And again from ten until half past eleven.”

“Was there a time you know she wasn’t around?”

“Not at the ferry slip at eight o’clock. Not here from nine until half past.
I hear every foot on those stairs, and I know most of them.”

I put it in the notebook. Mulcahy’s evening had Mulcahy at the stairwell at
half past nine. If this was right, that part of it was a lie.

I wrote Mulcahy’s name at the top of a clean page. It could wait an hour. It
could not wait all night.

[free, 1 written down, 161 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 4:25 AM, 4 of 9 left. 9 of 13 things written down.

PEOPLE
  Lindemann, a society columnist — the victim
    on sight: Lindemann could put a name in the paper, and had put several
    there for good. Lindemann is a woman. She is in her thirties.
    from others: Steinbach found Lindemann at the walk-up at 11:30 PM.
  Steinbach, a stockbroker who trades in the street — our client (the stairwell) — told me all of it
    on sight: Steinbach is a woman. She is in her thirties.
    says: 8:00 PM the stairwell; 8:30 PM–10:00 PM the ferry slip; 10:30 PM
    the stairwell
    · 6:00–8:00 PM — at the stairwell (Donnelly)
    · 9:00 PM — at the ferry slip (Donnelly)
    · 10:30–11:00 PM — at the stairwell (Donnelly)
      “ Steinbach hired us, and wants it known that Donnelly was in and out
      of there all week, and would rather we started there.
      “ Steinbach says she was at the stairwell at 8:00 PM; then the ferry
      slip from 8:30 PM to 10:00 PM; then the stairwell at 10:30 PM.
  Donnelly, a pawnbroker’s clerk (the stairwell) — told me all of it
    on sight: Donnelly is a man. He is in his forties.
    says: 8:00 PM–8:30 PM the stairwell; 9:00 PM the ferry slip; 9:30
    PM–10:30 PM the stairwell
    · 6:00–8:30 PM — at the stairwell (Mulcahy)
    · 10:00–11:30 PM — at the stairwell (Mulcahy)
      “ Donnelly saw Steinbach at the stairwell from 6:00 PM to 8:00 PM and
      from 10:30 PM to 11:00 PM. Donnelly saw Steinbach at the ferry slip at
      9:00 PM.
      “ Donnelly says he was at the stairwell from 8:00 PM to 8:30 PM; then
      the ferry slip at 9:00 PM; then the stairwell from 9:30 PM to 10:30
      PM.
  Mulcahy, a chorus girl between engagements (the stairwell) — told me all of it
    on sight: Mulcahy is a woman. She is in her twenties.
    says: 8:00 PM–10:30 PM the stairwell
    · 6:00–7:30 PM — at the stairwell (Corrigan)
    · 8:00 PM — not at the ferry slip (Corrigan)
    · 8:30 PM — at the stairwell (Corrigan)
    ! 9:00–9:30 PM — not at the stairwell (Corrigan)
    · 10:00–11:30 PM — at the stairwell (Corrigan)
      “ Mulcahy saw Donnelly at the stairwell from 6:00 PM to 8:30 PM and
      from 10:00 PM to 11:30 PM.
      “ Mulcahy says she was at the stairwell from 8:00 PM to 8:30 PM; then
      the stairwell from 9:00 PM to 9:30 PM; then the stairwell from 10:00
      PM to 10:30 PM.
  Corrigan, the landlady (the stairwell)
    on sight: Corrigan is a woman. She is in her sixties. Corrigan is a
    landlady.
      “ Corrigan saw Mulcahy at the stairwell from 6:00 PM to 7:30 PM and at
      8:30 PM and from 10:00 PM to 11:30 PM. Corrigan did not see Mulcahy
      the rest of the evening.
  the man in his thirties (the stairwell)
    on sight: He is a man. He is in his thirties. He is a patrolman on the
    beat.

PLACES
  the stairwell — semi, watched by the landlady
  the ferry slip — public, unwatched — not been
  the walk-up — private, unwatched
      “ Lindemann was found at the walk-up. The lamp came down in the fall
      and the bulb is still warm in its socket, unbroken. The singing under
      the window stopped at 9:30 PM, when the shoe came down.
      “ The coroner puts death at 9:30 PM. One blow broke in the back of the
      skull. Death was not instant.
  the office — private, unwatched

LEADS
  Nothing open.

ESTABLISHED
  time of death: 9:30 PM
  method: a blunt object
  motives: none known
  near the weapon: Steinbach, Donnelly, Mulcahy
  accounted for: nobody yet

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who killed Lindemann      Mulcahy                     ✓

  1 of 1 · solved · 5 actions against par 6

The DA reads it twice and does not find anything to argue with. Mulcahy
killed Lindemann at the walk-up, 9:30 PM, and the jury takes ninety minutes
over lunch.

Mulcahy hangs in the spring. I am told it rained. 1 out of 1, and it took me
5 calls. It could have been done in 6. I will not be telling anybody.

The file went upstairs clean, Mulcahy's name at the top and the evidence
lined up under it in order. I was home before the milk wagons finished their
rounds.

HOW IT COULD BE KNOWN
════════════════════════════════════════════════════════════════════════════

Who: Mulcahy was the only one who could have been at the walk-up when it
happened.
    · Steinbach: the stairwell, 6:00–8:00, 10:30–11:00; the ferry slip,
    9:00. Steinbach could have got hold of it. Donnelly saw her.
    · Donnelly: the stairwell, 6:00–8:30, 10:00–11:30. Donnelly could have
    got hold of it. Mulcahy saw him.
    · Steinbach says: the stairwell, 8:00; the ferry slip, 8:30–10:00; the
    stairwell, 10:30.
    · Donnelly says: the stairwell, 8:00–8:30; the ferry slip, 9:00; the
    stairwell, 9:30–10:30.
    · Mulcahy says: the stairwell, 8:00–8:30; the stairwell, 9:00–9:30; the
    stairwell, 10:00–10:30.
    · Mulcahy: the stairwell, 6:00–7:30, 8:30, 10:00–11:30; not at the ferry
    slip, 8:00; not at the stairwell, 9:00–9:30. Mulcahy could have got hold
    of it. Corrigan saw her.

When: It happened in the half hour from 9:30.

WHAT REALLY HAPPENED
════════════════════════════════════════════════════════════════════════════

Here is how it went. It was Delia Mulcahy who killed Wilhelmina Lindemann.

Lindemann was a society columnist, and the whole block knew it. She could
put a name in the newspaper, and some of the people named never got over it.
Lindemann went out to other people’s evenings and wrote them up by midnight.
Anybody on the block would have told you Mulcahy was a chorus girl between
engagements. Mulcahy had been a customer of Lindemann’s since ’19. She owed
Lindemann four thousand dollars and was behind on paying it back. Lindemann
had told Mulcahy that Friday was the end of it, one way or the other.

Mulcahy was at the stairwell at half past eight, and when she left, the
bronze bookend went with her. There was a clean patch in the dust where it
had stood. From there Mulcahy went straight to the walk-up, and was there by
nine o’clock. Lindemann came in at half past nine, half an hour later.
Before that, at nine o’clock, Lindemann was at the stairwell.

It was half past nine, just as the singing stopped. Nobody was there to see
it. Mulcahy hit Lindemann with the bookend. It was one blow, at the back of
the skull, and Lindemann did not die at once.

Afterwards Mulcahy went to the stairwell, and was there from ten o’clock
until half past eleven.

The one who found Lindemann was Steinbach. That was at the walk-up, at half
past eleven. That was two hours after it happened. The police came, took a
look, and left it at that.

That is the whole of it. The rest of that night belongs to other people.

7 pages · 1396 words · 199 a page · 5 actions spent (1 waived) · 0 fallbacks
```

### The confrontations: the reasoning player on Hard-boiled seeds 7 and 3

The oracle never puts a fact to anybody, so the two nights above have no confrontation. These are the reasoning player’s routes (`npx tsx scripts/diagnose-play.ts --route reason --seed N --configs T5L2`, rendered with `--route … --file`); each needs one innocent’s confession, and gets it with a second fact for nothing.

Seed 7, route: `go the subway kiosk; examine the subway kiosk; go the Automat; ask Broadnax about Weisglass and Renfro; ask Broadnax about Renfro; ask Broadnax about Brauer; ask Alfano about the milk wagon on its rounds; ask Alfano about Dettweiler; examine the Automat; go Kaplan’s; ask Zeldin about Dettweiler; examine Kaplan’s; go the Automat; ask Dettweiler about Zeldin; ask Dettweiler about the fourth floor; go the Hallam; ask Whitfield about Zeldin; go Kaplan’s; put x068 part 0 to Zeldin; put x024 part 0 to Zeldin; go the Hallam; ask Whitfield about the Hallam; examine the Hallam; go the newsstand; ask Ruggiero about Brauer`. Solved, 23 calls against a budget of 25. Pages 12 (Zeldin asked about Dettweiler, and his evening), 20 and 21:

```
Kaplan’s                                              3:10 AM   page 12
────────────────────────────────────────────────────────────────────────────

A cab went by slowly, looking for a fare. It was after three. Zeldin stopped
reading a folded newspaper by the light that was there and looked up as I
came over. “Renfro had a neighbour across the airshaft,” I said.
“Dettweiler.”

“Lotte Dettweiler.”

“Where was Dettweiler tonight?”

“I saw her at the fourth floor at eight o’clock. At half past eleven she was
here. While the milk wagon was in the street, she was at the Automat once
and here once. I’m sure of that much.”

I wrote it in the book. Dettweiler had been at the Automat at the time of
the milk wagon on its rounds. I needed the hour of the milk wagon on its
rounds before it told me anything.

“Now you. Where were you tonight, start to finish?”

“I was at the Hallam with Lotte Dettweiler at seven o’clock. Then the
Automat, at half past seven. Then the fourth floor, at eight o’clock. Then
the Hallam, from half past eight until nine. At half past nine I was here.
There isn’t any more to it than that.”

I wrote it down as Zeldin told it. It was one person’s word about one
person.

If anyone knew where Zeldin had been tonight, it would be Whitfield.
Whitfield was the elevator man at the Hallam.

[1 action, 2 written down, 219 words]

Kaplan’s                                              5:45 AM   page 20
────────────────────────────────────────────────────────────────────────────

Zeldin looked up when I sat down. I put it to him plainly. “Whitfield says
you weren’t at the Hallam from six until half past eleven.”

Zeldin set down what he had been holding and wiped his hands, one and then
the other. “All right, I wasn’t at the Hallam. I was at the newsstand.”

I wrote the new words beside the old ones. A person can be in one place a
half hour, and now Zeldin had given me two.

[1 action, 81 words]

Kaplan’s                                              5:45 AM   page 21
────────────────────────────────────────────────────────────────────────────

“That’s one thing,” I said. I had another. “Dettweiler puts you at the
Automat at half past six and at nine o’clock.”

Zeldin looked around to see who else could hear. “All right. I was at the
Automat. I owe money on bets, and I was paying some of it back.”

I turned the notebook around so Zeldin could read what I had written. Zeldin
read it and nodded.

[free, 69 words]
```

Seed 3, route: `go the fourth floor; examine the fourth floor; go Mrs. Teague’s; ask Moretti about Brauer; examine Mrs. Teague’s; go the speakeasy; ask Alfano about the fourth floor that evening; examine the speakeasy; go the subway kiosk; ask Corrigan about the Wyckoff; ask Corrigan about Stannard; examine the subway kiosk; go the speakeasy; ask Stannard about Callahan; ask Crowninshield about Ashby; go the newsstand; ask Winslow about Stannard; go the speakeasy; put x087 part 1 to Stannard; put x016 part 1 to Stannard; go the newsstand; ask Winslow about Ashby; examine the newsstand; go the Wyckoff; ask Sirkin about Ashby; ask Quill about the Wyckoff; examine the Wyckoff; go the newsstand; ask Winslow about Ashby and Callahan; ask Winslow about the newsstand`. Solved, 28 calls against a budget of 28. Pages 20 and 21:

```
the speakeasy                                         5:10 AM   page 20
────────────────────────────────────────────────────────────────────────────

It was past five, and I was hungry, and that would have to wait. Stannard
stopped reading a folded newspaper and looked up as I came over. I put it to
her plainly. “Winslow says you weren’t at the newsstand from seven until
half past ten or at half past eleven.”

Stannard laughed once, not at anything, and sat up straighter. “All right, I
wasn’t at the newsstand. I was at Mrs. Teague’s.”

I did not argue with Stannard. I read the new story back, and Stannard said
that was how it went.

[1 action, 93 words]

the speakeasy                                         5:10 AM   page 21
────────────────────────────────────────────────────────────────────────────

I didn’t close the notebook. “I’m not done,” I said. “Corrigan puts you at
the speakeasy at nine o’clock.”

Stannard let her shoulders down, which she had not done since I came in.
“All right. I was at the speakeasy. I was selling things that were stolen.”

I had the speakeasy from Stannard now, in Stannard’s own words. I would have
to see what else that touched.

[free, 67 words]
```
