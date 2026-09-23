# M10 Part B — Raw teaches the real game: notes

*Branch `m10-raw`, off `main` at fefebbf. Spec: `docs/23-m10-testimony.md`, Part B. Part A (tellings, decks, the scene layer) is on `m10-testimony`; the engine edits here are kept small and are listed in "For the m10-testimony branch" below.*

## In one paragraph

Raw used to be solved by elimination: the client named an innocent, two suspects put each other at the stairwell at the crime's half hour, and the last name standing was the culprit, who nobody ever questioned. It's now built around one lie. The culprit tells the detective the room they were in at the crime's half hour, and it's the room somebody is posted at. The person posted there knows the culprit and says they weren't in. Each innocent is cleared by their own account plus one sighting inside it, never by one line and never by another innocent they vouch for. The client points at an innocent the client knows. The par route is the whole lesson. The marks bring the player to the lie, and the one question that catches it has no mark: the player has to work out who can break it. The hand is cut from ~40 findable clues to 13. "Put it to X" is on at Raw, and the page says "That cleared X" only once two facts agree. Coddled is the same night with a fourth suspect and the method to show. Poached and up are unchanged, byte for byte.

## The design test

`npx tsx scripts/diagnose-play.ts --design --seeds 100`. Raw is locked to Beat. Coddled is shown at Beat (T1L1) and at Precinct (T1L2), and every other tier at Precinct. "Before" is `main` at fefebbf, measured with this branch's script (only the T1L1 config was added to it).

| tier | marks-follower names the culprit (before → after) | reasoning player: right and within budget (before → after) | button-pusher (before → after) | reasoning player: median calls to solve (budget), before → after |
|---|---|---|---|---|
| Raw (T0, Beat) | 83% → **15%** | 100% → **100%** | 48% → 14% | 5 (7) → **7 (11)** |
| Coddled (T1L1, Beat) | 80% → **17%** | 100% → **100%** | 37% → 14% | 7 (9) → 9 (16) |
| Coddled (T1L2, Precinct) | 82% → **22%** | 100% → **100%** | 32% → 15% | 7 (9) → 9 (15) |
| Poached (T2L2) | 32% → 32% | 97% → 97% | 23% → 23% | 9 (12) → 9 (12) |
| Soft-boiled (T3L2) | 28% → 28% | 98% → 98% | 26% → 26% | 11 (16) → 11 (16) |
| Medium (T4L2) | 24% → 24% | 87% → 87% | 17% → 17% | 15 (19) → 15 (19) |
| Hard-boiled (T5L2) | 20% → 20% | 84% → 84% | 17% → 17% | 23 (26) → 23 (26) |

Targets for Raw and Coddled: the marks-follower at 60% or under, the reasoning player at 95% or over. Both are met. No other tier moved. From Poached up, the cases themselves are byte-identical to `main`: I hashed 100 seeds a tier, and the hashes match for T2L2 to T5L2.

**Why the marks-follower collapses.** It files the one suspect the notebook's plain placements leave standing. When more than one is left, it files the monologue's theory, which weighs a contradiction heavily. At Raw now:
- nothing places an innocent at the crime's half hour on its own, so all three are left standing;
- the only contradiction on the board is the culprit's account against the watcher's word;
- the watcher's question is the one the marks don't point at.

It wins when its random picks happen to take both the account and the watcher's word. A reasoning player clears the two innocents from their accounts and sightings, and the culprit is who's left. The route also takes the player through the lie itself, so the lie gets heard.

## Findable, par and budget per tier

100 seeds a config. Game par and budget are what the book shows (the generator's plus the walk from the office).

| tier | findable, before → after | game par (median), before → after | budget (median), before → after |
|---|---|---|---|
| Raw (Beat) | 40 (33–49) → **13** | 4 → 8 | 7 → **11** |
| Coddled (Beat) | 51 (42–61) → **17** | 6 → 10 | 9 → 16 |
| Coddled (Precinct) | 52 (42–61) → **17** | 6 → 10 | 9 → 15 |
| Poached | 61 | 8 | 12 |
| Soft-boiled | 64 | 11 | 16 |
| Medium | 134 | 13 | 19 |
| Hard-boiled | 208 | 19 | 26 |

**Par.** The spec asks for "about 6–7 calls" at Raw. A player who reasons uses 7, which is the median above. The book's par is 8, and that 8 is a floor, not slack:
- The lesson is six questions: three accounts, two sightings that agree with the innocents' accounts, and the watcher's word.
- It also takes two walks: office to the scene, and the scene to the room where everybody is found.
- A player who spends the client's two free questions in the office, or the free first question to somebody who knows the detective, finishes in 5 or 6 calls.

I kept M4b's rule that free questions are "slack handed to the player and never a shorter route", so par still counts them. Raw's budget is 11: Beat's slack scaled to Raw's par is 5, and `extraSlack: -2` takes it to 3.

**Coddled** is 10 and 16/15. It has four suspects, so there are three innocents to clear two facts each, plus the method. That's the same lesson with one more alibi to check. I didn't cut its slack: unlike Raw it isn't locked to one level.

## What changed where

| file | what |
|---|---|
| `src/gen/shape.ts` | `DeductionDials.catchTheLie` and `.confront`. `DEDUCTION_RAW` (no direct clears, `catchTheLie`, `confront`, par 5–7, `extraSlack: -2`) and `DEDUCTION_CODDLED` (par 6–9). Raw's findable target is 13. `deductionOf` maps tiers 0 and 1 to them. |
| `src/gen/logic/schedule.ts` | Everything is gated on `catchTheLie`, so no other tier's random stream moves. The details are in the list below this table. |
| `src/gen/logic/select.ts` | `teachTheLie` builds the par route as the lesson itself: starting clues, each innocent's account plus one testimony placing them inside the span of it that holds the crime's half hour (the culprit's word first, then somebody posted, then another innocent, never mutual), the culprit's account, and the watcher's line. It checks that the innocents' part alone clears every innocent on their own word. `trimHand` cuts the hand to the shape's target: the par route, then searches, sightings of the victim, other sightings, and head counts, with no motives, no timings and no noise-at clues. The watcher's line is left out of lead wiring and passed to par's walk as always open. |
| `src/gen/types.ts`, `generate.ts` | `Logic.open?: Id[]`: par-route questions that carry no mark. |
| `src/gen/logic/check.ts` | The reachability check counts `Logic.open`. |
| `src/gen/client.ts` | At `catchTheLie` the client points at an innocent the client knows by name. Other tiers draw from the same list as before. |
| `src/gen/logic/api.ts`, `index.ts` | `clearedBy(kase, held)` gives the clue ids that keep each suspect out of the scene at every open crime half hour. `clearedByTwo` returns the suspects cleared on two or more. |
| `test/m10-raw.test.ts` (new, 7 tests) | The Raw night's shape, the unmarked catch, clears by own word plus a sighting and never mutual, the client's pointer, the hand and the budget, "That cleared" only on two facts, and confront at Raw. |
| `scripts/diagnose-play.ts` | A `T1L1` config (Coddled at Beat). |

The schedule changes in `src/gen/logic/schedule.ts`:
- At the crime's half hour, the client stands in a room without the other innocents.
- Anybody who must not name somebody knows them by sight rather than being a stranger: "might know the face".
- The culprit's half hour after the crime is left open, so the culprit can be the one who sees an innocent.
- Corroboration prefers the culprit and never makes two innocents vouch for each other.
- The culprit's crime claim is a room somebody is posted at for the whole block. The one posted there knows the culprit by name.

### For the m10-testimony branch: the engine edits, all small

1. **`src/game/m9.ts`**
   - `confrontOn` reads `d.confront ?? d.secretLies`, so Raw and Coddled have the verb.
   - A new `clearedOnTwo(view, found)` is the only thing the thought layer calls.
   - `proofsFor` ends Raw's "who" proof on the culprit's account and the watcher's line.
2. **`src/game/scene/thought.ts`**, about 30 lines:
   - In a tiered case, `clears` from one placement fires only when `clearedOnTwo` agrees. Otherwise it's `touches`.
   - After the clue loop, a subject newly cleared on two facts gets `{ cls: 'clears', basis: 'two', sourceId: <the one who agreed> }`. It drops that subject's `touches/account` thought ("Nobody else had said any of it yet" is no longer true).
   - `markSingle` skips basis `two`.
   - `basis` gains `'two'`.
3. **`src/game/scene/realize.ts`**: one ladder rung puts cards tagged `basis: two` first for that thought.
4. **`content/decks/thought.json`**: 12 new cards, `tht-t01`–`tht-t12`, class `clears`, basis `two` ("Nobody had to take Weisglass's word for the chop suey place any more. Bidwell had seen Weisglass there. That cleared Weisglass."). `content/deck-schema.json` gains basis value `two`.
5. **`src/game/oracle.ts`**:
   - Groups that fetch a `Logic.open` clue count as open.
   - The oracle asks them last, so its route hears the lie before it catches it.
6. **`src/game/reducer.ts`**: a question that gets nothing new, put to somebody who hasn't told the detective anything yet, now says "I can't help you there." instead of "I've told you what I know." At Raw's small hand this is most questions.

Tests changed to match:
- `m8` excludes basis `two` from the "clears cards must hedge" deck check.
- `m9-engine`: confront is offered at Raw once an account is held. Rafferty, who has said nothing yet, says "I can't help you there."
- `m9-gen`:
  - "every question about every person" skips the tiers that cut the hand;
  - "every par clue reached" counts `Logic.open`.

## Where I judged

1. **The catch is unmarked, the lie is marked.** The marks walk the player through both innocents' alibis and to the culprit's own account. The page then says "Mulcahy had put Mulcahy at the stairwell at nine o'clock", and the next step is the player's: who was posted at the stairwell? When the player asks, the book says "There was no lead behind it. I put Mulcahy to Corrigan on my own account." Marking the catch too would put the marks-follower back near 100%.
2. **The solve can still be done by elimination.** With three suspects and exactly one of them at the scene, clearing the two innocents names the culprit, and a player can do that without hearing the lie. What makes the lie matter is that:
   - it's on the par route, and the marks lead to it;
   - it's the only contradiction on the board, so the monologue's theory rests on it;
   - it's the first thing a player can put to anybody.

   Forcing the lie into the logic would take a piece like a head count ("one person came up the stairs at eight") that only resolves once the culprit's claim is broken. That's a Poached-sized idea, so I left it out of the first night.
3. **One innocent may vouch for another, one way only.** Sometimes the culprit can't be the witness for both alibis. Then the client may be the witness for the other innocent, but that innocent is never the client's witness back. The spec's words are "not by clearing each other".
4. **Nobody is a stranger at Raw.** Where the arrangement needs a witness not to name somebody, it makes them know the face and not the name ("might know Donnelly's face"). At Raw and Coddled, descriptions and strangers stay out.

## Known limits, most of them for Part A

- **Accounts stutter where the lie is.** The culprit's lie is its own span, so the account reads "the stairwell from eight until half past, then the stairwell from nine until half past, then the stairwell from ten until half past". The solver needs the spans split: a merged span would stand on the true half hours' corroboration and clear the culprit on a partial notebook. The telling should say adjacent spans in one room as one ("the stairwell from eight until half past ten").
- The contradiction card says "Somebody else's word said otherwise" and doesn't name the watcher. A `{source}` slot on `contradicts` would help.
- Bridges still say "their own evening" for a person whose sex is known (A.5), and page two still says "the margin … the grid" (A.4).
- Asking somebody about a person the small hand has nothing on is free. The "(free)" on the button tells a first-time player which questions pay, the same way M9's exhausted questions do.
- The client's two free office questions aren't used by the oracle or the reasoning player. Both go to the scene first.

## Checks

- `tsc` clean. `npm run decks`: 0 errors, 0 banned terms.
- Tests: 41 files, 783 tests, all passing (40 and 776 on `main`). `test/m10-raw.test.ts` is new.
- The untiered default is untouched. `m7-identity` passes and no plain-path code changed. From Poached up, tiered cases hash the same as `main` (100 seeds a tier).

## Read-through: three Raw runs

`npm run read -- --seed N --tier 0 --no-choices` for seeds 11, 1 and 5, as rendered on this branch. The oracle plays the par route, then files. Each run is followed by my reading as a first-time player.

### Seed 11

```text
DASHIELL · case 11 · difficulty 1 · the Bowery
Raw (3 suspects, 3 places, 0 secrets, coroner half an hour, par 5–7) at Beat (level 1, slack 8, noise 25–35%, depth 1, full)
par 8, budget 11 (generator: 7/10), 13 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: bruised, none, clear night.
  The office: two rooms over a Chinese laundry on Great Jones Street.
  Knows Corrigan — i-owe (warmth -1)

  TEMPER
    Steinbach     plain   a stockbroker who trades in the street
    Donnelly      plain   a pawnbroker’s clerk
    Mulcahy       yap     a chorus girl between engagements
    Corrigan      yap     the landlady
    Salerno       plain   the patrolman on the beat

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a Chinese laundry on Great Jones Street, the
Bowery, and the jaw had gone from purple to something with less name to it.
Even the low lamp showed that much. The mirror could wait for morning. A
woman came up the stairs after midnight.

Steinbach came in composed, her gloves still on, and took the chair before I
could offer it twice. She had a voice thinned with age, but the accent under
it had not: money in the vowels, the kind learned young and never lost. She
sounded twenty years younger the moment she got angry.

Klara Steinbach was in her thirties. She did not take the coat off.

“I trade on the street. My customers would rather not be seen doing it
themselves. Wilhelmina Lindemann is dead.”

“She could put a name in the paper, and had put several there for good,” she
said. “She was found dead at the walk-up. That is where it happened.”

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

"Start with Donnelly. He was in and out of there all week, Dashiell, same as
always," Steinbach said, and kept talking through the part where a hundred
dollars landed on my desk. I picked it up without breaking her stride.

She is still in the chair. Two questions on the house — a woman hiring you
answers your questions.

Down it went.

[free, 1 written down, 357 words]

the walk-up                                           12:45 AM   page 2
────────────────────────────────────────────────────────────────────────────

Steinbach had said as much. I meant to go through the walk-up before anyone
else did.

The block was quiet, every window dark but one. A car idled at the curb with
its lights off. The walk-up belonged to Lindemann, above a drugstore that
had kept its lights lit later than most. The stairwell window looked down on
the street lamp on the corner. Past midnight the building had gone as quiet
as it ever got. There was no one to notice who passed through. The police
had come and gone.

Lindemann was still on the floor where she had fallen. Nobody else was
there. The lamp came down with him and the bulb was still warm in its
socket, unbroken. The singing under the window stopped at half past nine,
when the shoe came down.

The coroner’s office had left a note behind, for whoever came next. The
coroner put death at half past nine. One blow broke in the back of the
skull. Death was not instant.

So it had happened by about half past nine, if that held. Anybody who came
to the walk-up after that came too late. Half past nine, then, for the drunk
singing under the window. Whatever had been waiting in the margin under it
could go on the grid.

[1 action, 2 written down, 217 words]

the stairwell                                         1:25 AM   page 3
────────────────────────────────────────────────────────────────────────────

Steinbach put me onto it. I wanted to hear Steinbach walk through the
evening.

It was after one. The block outside the stairwell had gone quiet early, one
drunk singing to himself half a block off. My own footsteps sounded too loud
for the hour. The stairwell ran up the middle of the building, bare bulbs on
alternating landings, the rest left dark to save on the electric bill. At
this hour the building had settled into the particular quiet of people
sleeping four to a room.

Corrigan was listening from the bottom step before going up. She was the
landlady, a woman in her sixties.

Steinbach was tapping ash from a cigarette without breaking a sentence.

Donnelly was smoking at a table near the wall. He touched the inside of his
coat again without reaching in.

A man and a woman sat on the stairs between the second and third landings,
talking in whispers.

Steinbach was the client, and the client was paying. Whoever used the
stairs, Corrigan generally knew about it.

[1 action, 173 words]

the stairwell                                         2:10 AM   page 4
────────────────────────────────────────────────────────────────────────────

Something I had turned up made me want Steinbach’s evening.

It was past two, and the night went on. Behind one door on the second
landing a radio played a dance band, and a bare bulb on the landing above
buzzed on its wire. Steinbach stopped tapping ash from a cigarette and
looked up as I came over. "Anyone with you?"

“I was at the stairwell at eight o’clock, then the ferry slip from half past
eight until ten, then the stairwell at half past ten.”

I put it in the notebook.

Steinbach had given me the evening hour by hour. It went on Steinbach’s row
marked as Steinbach’s own word.

If anyone knew where Steinbach had been tonight, it would be Donnelly, at
the stairwell.

[1 action, 1 written down, 126 words]

the stairwell                                         2:55 AM   page 5
────────────────────────────────────────────────────────────────────────────

Donnelly looked up when I sat down. “Lindemann had a creditor. Steinbach.”

“Klara Steinbach.”

“Where was Steinbach tonight?”

“I saw her here from six until eight and again from half past ten until
eleven and at the ferry slip at nine o’clock.”

I got it down on paper. Then I looked at what I’d written.

Steinbach was at the ferry slip around half past nine, and not only on
Steinbach’s own say-so. That cleared Steinbach. Steinbach might have had a
way into the walk-up, and a way in was not nothing.

Donnelly might know about their own evening, and about half past nine. He
was at the stairwell.

[1 action, 1 written down, 108 words]

the stairwell                                         3:40 AM   page 6
────────────────────────────────────────────────────────────────────────────

Donnelly had said as much about the hour. I meant to hear Donnelly’s account
of it.

It was three by any clock in the neighborhood. I turned back to Donnelly.
"Where were you, start to finish?"

“I was at the stairwell from eight until half past, then the ferry slip at
nine o’clock, then the stairwell from half past nine until half past ten.”

I wrote that down.

I wrote it down as Donnelly told it. It was one person’s account of one
person, and I marked it that way.

Mulcahy might know where Donnelly had spent the evening, and Mulcahy was at
the stairwell. She did business with Lindemann.

[1 action, 1 written down, 110 words]

the stairwell                                         4:20 AM   page 7
────────────────────────────────────────────────────────────────────────────

It was four now. Mulcahy looked up as I came over. “Donnelly did business
with Lindemann.”

“Edward Donnelly.”

“Where was Donnelly tonight?”

“He’s the pawnbroker’s clerk. I saw him here from six until half past eight
and again from ten until half past eleven.” Mulcahy was working the rosary
in her pocket again, the loose bead knocking.

I wrote it down. Then I read it back.

Nobody had to take Donnelly’s word for the stairwell any more. Mulcahy had
seen Donnelly there. That cleared Donnelly. Donnelly could have got into the
walk-up. That put it within reach, if nothing more.

Mulcahy was next, at the stairwell. The question was their own evening,
around half past nine.

[1 action, 1 written down, 116 words]

the stairwell                                         5:05 AM   page 8
────────────────────────────────────────────────────────────────────────────

It was Mulcahy who pointed me at Mulcahy’s evening.

The night had reached five without my noticing. I turned back to Mulcahy.
"What hour did you clear out?"

“I was at the stairwell from eight until half past, then the stairwell from
nine until half past, then the stairwell from ten until half past.”

I wrote it down.

It was Mulcahy’s evening in Mulcahy’s own words. Nobody else had said any of
it yet.

[1 action, 1 written down, 74 words]

the stairwell                                         5:05 AM   page 9
────────────────────────────────────────────────────────────────────────────

There was no lead behind it. I put Mulcahy to Corrigan on my own account.

Corrigan stopped listening from the bottom step before going up and looked
up as I came over. “Mulcahy,” I said. “Straight, and I’ll go away.”

No charge on this one. There never is, the first time.

“I saw her here from six until half past seven, at half past eight and again
from ten until half past eleven. She wasn’t at the ferry slip at eight
o’clock. She wasn’t here from nine until half past.” Corrigan touched the
top of a stocking again, where the union card was.

I had what I came for. Corrigan was not finished.

“I saw her here at seven o’clock and again at nine o’clock and at the ferry
slip at eight o’clock. She wasn’t here from six until half past, at half
past seven and again at half past eight.”

I got it down on paper. Then I read it back.

Mulcahy could have got into the walk-up without much trouble. That was a
reason to keep asking. Mulcahy’s evening had Mulcahy at the stairwell at
half past nine. If this was right, that part of it was a lie.

I didn’t let it go. I asked Mulcahy about the stairwell, straight out, and
watched her face while she thought about the answer.

[free, 2 written down, 224 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 5:05 AM, 4 of 11 left. 10 of 13 things written down.

PEOPLE
  Lindemann, a society columnist — the victim
    on sight: Lindemann could put a name in the paper, and had put several
    there for good. Lindemann is a woman. She is in her thirties.
    from others: Steinbach found Lindemann at the walk-up at 11:30 PM.
    · 6:00–6:30 PM — not at the stairwell (Corrigan)
    · 7:00 PM — at the stairwell (Corrigan)
    · 7:30 PM — not at the stairwell (Corrigan)
    · 8:00 PM — at the ferry slip (Corrigan)
    · 8:30 PM — not at the stairwell (Corrigan)
    · 9:00 PM — at the stairwell (Corrigan)
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
  Corrigan, the landlady (the stairwell) — told me all of it
    on sight: Corrigan is a woman. She is in her sixties. Corrigan is a
    landlady.
      “ Corrigan saw Mulcahy at the stairwell from 6:00 PM to 7:30 PM and at
      8:30 PM and from 10:00 PM to 11:30 PM. Corrigan did not see Mulcahy
      the rest of the evening.
      “ Corrigan saw Lindemann at the stairwell at 7:00 PM and at 9:00 PM.
      Corrigan saw Lindemann at the ferry slip at 8:00 PM. Corrigan did not
      see Lindemann the rest of the evening.
  the man in his thirties (the stairwell)
    on sight: He is a man. He is in his thirties. He is a patrolman on the
    beat.

PLACES
  the stairwell — semi, watched by the landlady
  the ferry slip — public, unwatched — not been
  the walk-up — private, unwatched
      “ Lindemann was found at the walk-up. The lamp came down with him and
      the bulb is still warm in its socket, unbroken. The singing under the
      window stopped at 9:30 PM, when the shoe came down.
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

  1 of 1 · solved · 7 actions against par 8

The DA reads it twice and does not find anything to argue with. Mulcahy
killed Lindemann at the walk-up, 9:30 PM, and the jury takes ninety minutes
over lunch.

Mulcahy hangs in the spring. I am told it rained. 1 out of 1, and it took me
7 calls. It could have been done in 8. I will not be telling anybody.

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

I can tell it now, start to finish. Delia Mulcahy killed Wilhelmina
Lindemann.

Lindemann was a society columnist. She could put a name in the newspaper,
and some of the people named never got over it. Lindemann went out to other
people’s evenings and wrote them up by midnight. Mulcahy was a chorus girl
between engagements. She had been a customer of Lindemann’s since ’19.
Mulcahy owed Lindemann four thousand dollars and was behind on paying it
back. Lindemann had told Mulcahy that Friday was the end of it, one way or
the other.

Mulcahy was at the stairwell at half past eight, and when she left, the
bronze bookend went with her. There was a clean patch in the dust where it
had stood. From there Mulcahy went straight to the walk-up, and was there by
nine o’clock. Mulcahy waited half an hour for Lindemann, who came in at half
past nine. Before that, at nine o’clock, Lindemann was at the stairwell.

It happened at half past nine, just as the singing stopped. They had the
walk-up to themselves. Mulcahy hit Lindemann with the bookend. It was one
blow, at the back of the skull, and Lindemann did not die at once.

By ten o’clock Mulcahy was at the stairwell, and she stayed until half past
eleven.

It was half past eleven before anybody found Lindemann. It was Steinbach, at
the walk-up. By then Lindemann had been dead for two hours. The police came,
walked through it, and went.

That is the whole of it. The rest of that night belongs to other people.

9 pages · 1505 words · 167 a page · 7 actions spent (1 waived) · 0 fallbacks
```

**Does it teach "catch the lie"? Yes. It's the clearest of the three.**

Page by page:
- **Page 1.** The client points at Donnelly.
- **Page 2.** The scene gives an exact half hour, half past nine.
- **Page 3.** Everybody is at the stairwell.
- **Page 4.** The marks take the player to the client's evening.
- **Page 5.** Donnelly's word on her closes it: "Steinbach was at the ferry slip around half past nine, and not only on Steinbach's own say-so. That cleared Steinbach." That's the first time the page concludes, and it concludes on two facts.
- **Pages 6–7.** The same for Donnelly, the man the client pointed at. The one who vouches for him is Mulcahy, whose word about other people is true.
- **Page 8.** The marks bring the player to Mulcahy's own evening: the stairwell at nine and half past.
- **Page 9.** No mark points there. The book says so ("There was no lead behind it. I put Mulcahy to Corrigan on my own account.") and the landlady says Mulcahy "wasn't here from nine until half past". The thought names it plainly: "If this was right, that part of it was a lie."

A first-time player sees the whole loop in order: two alibis checked, one alibi heard, and the only person who could check it asked on the player's own initiative.

Rough spots:
- Mulcahy's account stutters ("the stairwell … then the stairwell … then the stairwell"), so the lie doesn't stand out until Corrigan speaks. That's Part A's telling (see Known limits).
- Corrigan's volunteered second answer, about the victim, splits the catch page in two.
- The oracle files without putting the fact to Mulcahy. A player would press "Put it to Mulcahy" here, and the watcher's line lands. That is tested in `test/m10-raw.test.ts`.

### Seed 1

```text
DASHIELL · case 1 · difficulty 1 · Little Italy
Raw (3 suspects, 3 places, 0 secrets, coroner half an hour, par 5–7) at Beat (level 1, slack 8, noise 25–35%, depth 1, full)
par 8, budget 11 (generator: 7/10), 13 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: just-paid, someone-waiting, fog night.
  The office: two rooms over a hat shop on Mulberry Street.
  Knows Stannard — did-a-job-for (warmth +1)
  Knows Weisglass — owes-me (warmth -1)
  Knows Bellucci — regular (warmth +1)
  Knows Lindemann — regular (warmth +1)

  TEMPER
    Stannard      plain   a cab driver
    Weisglass     yap     a society columnist
    Bidwell       plain   a pawnbroker’s clerk
    Bellucci      plain   the man behind the counter
    Lindemann     plain   the patrolman on the beat

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a hat shop on Mulberry Street, Little Italy. I'd
paid the landlady on my way up, cash in an envelope same as she'd been
asking for weeks, and the stairs felt shorter for it. The office looked the
same as always, which was its own kind of relief. A woman came up the stairs
after midnight.

Bidwell shut the door soft, the way careful people do when doors matter to
them. One hand stayed below the desk's edge for most of the visit, out of
sight, and came up only once, empty, to make a point. Millicent Bidwell was
in her twenties. She did not take the coat off.

“I am listening.”

“I hand back what people pay to get out of pawn. Nobody comes back for some.
I sell those. Salvatore Tramonti is dead.”

“He could put a name on a playbill or leave it off, and did both,” she said.
“He was found dead at the suite, and that is where it happened.”

“The coroner puts it at ten o’clock, and will swear to the half hour. It was
poison in a drink.”

“Weisglass found him at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“I am a customer of his. I bought from him for years. Everybody on the block
did, but I settled at the end of every month.”

“Why come to me instead of the precinct?”

“I want the one who killed Tramonti found,” Bidwell said. “The precinct has
stopped looking. That is why I am here. I know that asking questions on this
block is a way of being asked some. I know that much.”

She said nothing for a while.

“Who was no friend of Tramonti?”

"Start with Weisglass. She was in and out of there all week. You know the
rate." I did. I held out my hand, and a roll with a rubber band round it
landed in it.

She is still in the chair. Two questions on the house — a woman hiring you
answers your questions.

I had it on paper.

[free, 1 written down, 355 words]

the suite                                             12:45 AM   page 2
────────────────────────────────────────────────────────────────────────────

It was what Bidwell said. I wanted a proper look at the room.

Fog sat low over the row houses, blurring the streetlamps to smears.
Somewhere a window sash went down. The suite was kept by Tramonti, one of
the better rooms in a hotel that rented mostly by the week. The hallway
carpet had gone thin down the middle from years of the same walk. This late,
every other door on the floor was shut and dark underneath. Nobody minded
who used the stairs. The precinct had taken its statement and gone home.

Tramonti was still on the floor where he had fallen. There was nobody else
in the room. A glass was on its side and the spill had not yet reached the
edge of the table when it dried. The dumbwaiter car was worked at ten
o’clock, as it was on the hour and the half hour.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death at ten o’clock. Chloral, a sleeping drug, in the
stomach. No wound, no bruising, no sign of a struggle.

If that was right, whatever happened to Tramonti had happened by about ten
o’clock.

[1 action, 2 written down, 202 words]

the chop suey place                                   1:25 AM   page 3
────────────────────────────────────────────────────────────────────────────

I had it from Bidwell. I came to ask Weisglass to account for the evening.

Somewhere in the building a clock struck one. Fog wrapped the block's lamps
into soft yellow rings. The chop suey place's sign was barely legible from
the corner. The chop suey place was a long room over a laundry, tables close
together, a counter along the back wall. This late the kitchen noise had
died down to almost nothing.

Bellucci was wiping down the counter, one eye on whoever came in. He was the
man behind the counter, a man in his forties.

Stannard was sitting with a drink and not drinking it. He was a cab driver,
a man in his forties.

Weisglass was ordering without looking at the menu. She named a figure again
before anybody asked for one.

Bidwell was watching the door over a cup of coffee. She kept one hand out of
sight again.

Weisglass had been only a name in the notebook until now. Now the face was
across the room from me. Bellucci kept the counter and kept an eye on who
sat at it.

[1 action, 187 words]

the chop suey place                                   1:25 AM   page 4
────────────────────────────────────────────────────────────────────────────

Bidwell had mentioned the hour. I wanted it from Weisglass directly.

Behind the swinging door the kitchen range still roared, and the smell of
frying onions came through with every turn of the fan. Weisglass stopped
ordering and looked up as I came over. "Same story as last time, or a new
one tonight?"

No charge on this one. There never is, the first time.

“I was at the benches from half past eight until nine, then the chop suey
place from half past nine until half past ten, then the benches at eleven
o’clock.”

I put it in the notebook.

I wrote it down as Weisglass told it. It was one person’s account of one
person, and I marked it that way.

I wanted Bidwell’s word on Weisglass. Bidwell was at the chop suey place.

[free, 1 written down, 136 words]

the chop suey place                                   2:10 AM   page 5
────────────────────────────────────────────────────────────────────────────

The night had reached two without my noticing. Bidwell looked up as I came
over. “Tramonti had a neighbour across the airshaft. Weisglass.”

“Rachel Weisglass.”

“Where was Weisglass tonight?”

“I saw her at the suite at six o’clock, here from half past seven until
eight and again at half past nine and at the benches at eleven o’clock.”

I put it in the notebook. Then I looked at it on the page.

Nobody had to take Weisglass’s word for the chop suey place any more.
Bidwell had seen Weisglass there. That cleared Weisglass. Weisglass might
have had a way into the suite, and a way in was not nothing.

Bidwell might know about their own evening, and about ten o’clock. She was
at the chop suey place.

[1 action, 1 written down, 127 words]

the chop suey place                                   2:55 AM   page 6
────────────────────────────────────────────────────────────────────────────

Bidwell had raised the question. I wanted Bidwell’s evening laid out.

I wasn’t finished with Bidwell. "Where were you, start to finish?"

“I was at the chop suey place from half past eight until half past nine,
then the benches from ten until eleven.”

I got it down on paper.

Bidwell had given me the evening hour by hour. It went on Bidwell’s row
marked as Bidwell’s own word.

Stannard was the one to ask about Bidwell, and Stannard was at the chop suey
place.

[1 action, 1 written down, 85 words]

the chop suey place                                   2:55 AM   page 7
────────────────────────────────────────────────────────────────────────────

Stannard looked up when I sat down. “Bidwell did business with Tramonti.”

No charge on this one. There never is, the first time.

“Millicent Bidwell.”

“Where was Bidwell tonight?”

“She’s the pawnbroker’s clerk. I saw her at the suite at six o’clock, here
from half past seven until nine and again at half past eleven and at the
benches at half past ten.” Stannard touched the pawn ticket in his hatband
again.

I wrote it in the book. Then I read it back.

Bidwell was at the benches around ten o’clock, and not only on Bidwell’s own
say-so. That cleared Bidwell. Bidwell could have got into the suite without
much trouble. That was a reason to keep asking.

The hour was ten o’clock. I would ask Stannard about their own evening, at
the chop suey place.

[free, 1 written down, 136 words]

the chop suey place                                   3:40 AM   page 8
────────────────────────────────────────────────────────────────────────────

Stannard had said as much about the hour. I meant to hear Stannard’s account
of it.

It had come round to three. I wasn’t finished with Stannard. "I've heard
your evenings before. Try the true one."

“I was at the chop suey place from half past eight until nine, then the chop
suey place from half past nine until ten, then the benches at half past ten,
then the chop suey place at eleven o’clock.”

I wrote it down.

It was Stannard’s evening in Stannard’s own words. Nobody else had said any
of it yet.

[1 action, 1 written down, 95 words]

the chop suey place                                   3:40 AM   page 9
────────────────────────────────────────────────────────────────────────────

It wasn’t anybody’s lead. I wanted Bellucci’s word on Stannard regardless.

Bellucci stopped wiping down the counter and looked up as I came over. "You
know Stannard better than most. Talk to me."

No charge on this one. There never is, the first time.

“I saw him here from seven until nine and again from eleven until half past.
He wasn’t here at six o’clock and again from half past nine until half past
ten. He wasn’t at the benches at half past six.” Bellucci flexed the swollen
knuckles again, slow, before answering.

I wrote it down. Then I read it back.

Stannard could have got into the suite. That put it within reach, if nothing
more. Stannard had put Stannard at the chop suey place at ten o’clock.
Somebody else’s word said otherwise, and one of them was wrong.

I wrote Stannard’s name at the top of a clean page. It could wait an hour.
It could not wait all night.

[free, 1 written down, 162 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 3:40 AM, 6 of 11 left. 9 of 13 things written down.

PEOPLE
  Tramonti, a theatrical agent — the victim
    on sight: Tramonti could put a name on a playbill or leave it off, and
    did both. Tramonti is a man. He is in his fifties.
    from others: Weisglass found Tramonti at the suite at 11:30 PM.
  Stannard, a cab driver (the chop suey place) — told me all of it
    on sight: Stannard is a man. He is in his forties. Stannard is a cab
    driver.
    says: 8:30 PM–10:00 PM the chop suey place; 10:30 PM the benches; 11:00
    PM the chop suey place
    · 6:00 PM — not at the chop suey place (Bellucci)
    · 6:30 PM — not at the benches (Bellucci)
    · 7:00–9:00 PM — at the chop suey place (Bellucci)
    ! 9:30–10:00 PM — not at the chop suey place (Bellucci)
    · 10:30 PM — not at the chop suey place (Bellucci)
    · 11:00–11:30 PM — at the chop suey place (Bellucci)
      “ Stannard saw Bidwell at the suite at 6:00 PM. Stannard saw Bidwell
      at the chop suey place from 7:30 PM to 9:00 PM and at 11:30 PM.
      Stannard saw Bidwell at the benches at 10:30 PM.
      “ Stannard says he was at the chop suey place from 8:30 PM to 9:00 PM;
      then the chop suey place from 9:30 PM to 10:00 PM; then the benches at
      10:30 PM; then the chop suey place at 11:00 PM.
  Weisglass, a society columnist (the chop suey place) — told me all of it
    on sight: Weisglass is a woman. She is in her thirties.
    says: 8:30 PM–9:00 PM the benches; 9:30 PM–10:30 PM the chop suey place;
    11:00 PM the benches
    · 6:00 PM — at the suite (Bidwell)
    · 7:30–8:00 PM — at the chop suey place (Bidwell)
    · 9:30 PM — at the chop suey place (Bidwell)
    · 11:00 PM — at the benches (Bidwell)
      “ Weisglass says she was at the benches from 8:30 PM to 9:00 PM; then
      the chop suey place from 9:30 PM to 10:30 PM; then the benches at
      11:00 PM.
  Bidwell, a pawnbroker’s clerk — our client (the chop suey place) — told me all of it
    on sight: Bidwell is a woman. She is in her twenties.
    says: 8:30 PM–9:30 PM the chop suey place; 10:00 PM–11:00 PM the benches
    · 6:00 PM — at the suite (Stannard)
    · 7:30–9:00 PM — at the chop suey place (Stannard)
    · 10:30 PM — at the benches (Stannard)
    · 11:30 PM — at the chop suey place (Stannard)
      “ Bidwell hired us, and wants it known that Weisglass was in and out
      of there all week, and would rather we started there.
      “ Bidwell saw Weisglass at the suite at 6:00 PM. Bidwell saw Weisglass
      at the chop suey place from 7:30 PM to 8:00 PM and at 9:30 PM. Bidwell
      saw Weisglass at the benches at 11:00 PM.
      “ Bidwell says she was at the chop suey place from 8:30 PM to 9:30 PM;
      then the benches from 10:00 PM to 11:00 PM.
  Bellucci, the man behind the counter (the chop suey place)
    on sight: Bellucci is a man. He is in his forties. Bellucci is a man
    behind the counter.
      “ Bellucci saw Stannard at the chop suey place from 7:00 PM to 9:00 PM
      and from 11:00 PM to 11:30 PM. Bellucci did not see Stannard the rest
      of the evening.

PLACES
  the suite — private, unwatched
      “ Tramonti was found at the suite. A glass is on its side and the
      spill had not yet reached the edge of the table when it dried. The
      dumbwaiter car was worked at 10:00 PM, as it is on the hour and the
      half hour.
      “ The coroner puts death at 10:00 PM. Chloral, a sleeping drug, in the
      stomach. No wound, no bruising, no sign of a struggle.
  the chop suey place — semi, watched by the counterman
  the benches — public, unwatched — not been
  the office — private, unwatched

LEADS
  Nothing open.

ESTABLISHED
  time of death: 10:00 PM
  method: poison in a drink
  motives: none known
  near the weapon: Weisglass, Bidwell, Stannard
  accounted for: nobody yet

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who killed Tramonti       Stannard                    ✓

  1 of 1 · solved · 5 actions against par 8

The DA reads it twice and does not find anything to argue with. Stannard
killed Tramonti at the suite, 10:00 PM, and the jury takes ninety minutes
over lunch.

Stannard hangs in the spring. I am told it rained. 1 out of 1, and it took
me 5 calls. It could have been done in 8. I will not be telling anybody.

The file went upstairs clean, Stannard's name at the top and the evidence
lined up under it in order. I was home before the milk wagons finished their
rounds.

HOW IT COULD BE KNOWN
════════════════════════════════════════════════════════════════════════════

Who: Stannard was the only one who could have been at the suite when it
happened.
    · Bidwell: the suite, 6:00; the chop suey place, 7:30–9:00, 11:30; the
    benches, 10:30. Bidwell could have got hold of it. Stannard saw her.
    · Weisglass: the suite, 6:00; the chop suey place, 7:30–8:00, 9:30; the
    benches, 11:00. Weisglass could have got hold of it. Bidwell saw her.
    · Weisglass says: the benches, 8:30–9:00; the chop suey place,
    9:30–10:30; the benches, 11:00.
    · Bidwell says: the chop suey place, 8:30–9:30; the benches,
    10:00–11:00.
    · Stannard says: the chop suey place, 8:30–9:00; the chop suey place,
    9:30–10:00; the benches, 10:30; the chop suey place, 11:00.
    · Stannard: the chop suey place, 7:00–9:00, 11:00–11:30; not at the chop
    suey place, 6:00, 9:30–10:30; not at the benches, 6:30. Stannard could
    have got hold of it. Bellucci saw him.

When: It happened in the half hour from 10:00.

WHAT REALLY HAPPENED
════════════════════════════════════════════════════════════════════════════

This is how it happened. Winthrop Stannard killed Salvatore Tramonti.

Tramonti was a theatrical agent. He could put a name on a theatre bill or
leave it off, and did both. Tramonti decided who worked in the spring and
who did not. Stannard drove a cab. Stannard, Tramonti and Edward Doyle were
inseparable for ten years and had not been in a room together since.
Stannard blamed Tramonti for the ruin of his business. He had said that
Tramonti took everything, and would be made to feel it.

At nine o’clock Stannard was at the chop suey place and took the bottle of
chloral sleeping drops off the shelf. It left a ring in the dust where it
had stood. From there Stannard went straight to the suite, and was there by
half past nine. Tramonti came in at ten o’clock, half an hour later. Before
that, Tramonti had been at the chop suey place from nine o’clock until half
past nine.

It was ten o’clock, as the dumbwaiter was going up. They had the suite to
themselves. Tramonti drank what Stannard poured, and the chloral was in it.
There was no struggle.

Afterwards Stannard went to the benches. He was there by half past ten. From
eleven o’clock until half past eleven he was at the chop suey place.

Weisglass found Tramonti at the suite at half past eleven. By then Tramonti
had been dead for an hour and a half. The precinct took a statement at the
desk and filed it.

That is the whole of it. The rest of that night belongs to other people.

9 pages · 1485 words · 165 a page · 5 actions spent (3 waived) · 0 fallbacks
```

**Does it teach "catch the lie"? Yes, though the lesson reads less loudly than seed 11's.**

- **Page 1.** The client, Bidwell, points at Weisglass.
- **Page 3.** At the chop suey place everybody is present, with the counterman, Bellucci, watching the counter.
- **Page 4.** Weisglass gives her evening.
- **Page 5.** Bidwell puts her there: "Nobody had to take Weisglass's word for the chop suey place any more. Bidwell had seen Weisglass there. That cleared Weisglass."
- **Pages 6–7.** Bidwell's own evening, and Stannard (the culprit) confirms it.
- **Page 8.** Stannard's account claims the chop suey place from half past nine until ten.
- **Page 9.** The player asks Bellucci, unmarked ("It wasn't anybody's lead. I wanted Bellucci's word on Stannard regardless."). Bellucci says Stannard "wasn't here … from half past nine until half past ten". The thought: "Stannard had put Stannard at the chop suey place at ten o'clock. Somebody else's word said otherwise, and one of them was wrong."

It's the same loop. Three of the questions were free (people who know the detective, the client in the office), so the night runs 5 calls against par 8. That's generous for a first run.

Rough spots:
- Stannard's account has the same stutter as seed 11's.
- "Somebody else's word" doesn't name Bellucci.
- Page 8's thought ("Nobody else had said any of it yet") is true there but flat. The page could have said the account covers the half hour that matters.

### Seed 5

```text
DASHIELL · case 5 · difficulty 1 · Hell’s Kitchen
Raw (3 suspects, 3 places, 0 secrets, coroner half an hour, par 5–7) at Beat (level 1, slack 8, noise 25–35%, depth 1, full)
par 8, budget 11 (generator: 7/10), 13 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: sleepless, none, cold night.
  The office: two rooms over a Chinese laundry on Tenth Avenue.
  Knows nobody in this neighbourhood.

  TEMPER
    Feldman       yap     a stagehand at the Selwyn
    Donnelly      yap     a bet collector for an illegal lottery
    Shapiro       plain   a stockbroker who trades in the street
    Lathrop       plain   the landlady

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a Chinese laundry on Tenth Avenue, Hell’s Kitchen.
I gave up on bed around eleven and made my peace with the desk chair, and
the stairs outside creaked twice, some tenant coming in later than I was
staying up. A woman came up the stairs after midnight.

Feldman talked the whole walk to the chair. Her sister, her landlord, and
eventually the reason she'd come. A hairpin held the hem of her skirt
together at one seam instead of her hair, closing a tear that had not yet
made it to a needle. It showed only when she crossed her legs, and she kept
them uncrossed the rest of the visit.

Ida Feldman was in her thirties. She kept one hand in a pocket.

“I work the ropes above the stage. I am out by eleven. Daniel Brennan is
dead.”

“He was the first telephone call anybody on the street made at two in the
morning,” she said. “He was found dead at the suite. That is where it
happened.”

“The coroner puts it at half past ten, and will swear to the half hour. It
was a blunt object.”

I said nothing.

“Who found Brennan?”

“I did. I found Brennan at the suite, at half past eleven. The precinct took
a statement at the desk and filed it.”

“I am a childhood friend of Brennan’s from the same block,” Feldman said.
“Brennan, Booker Colquitt and I were inseparable for ten years. We have not
been in a room together since. Not once.”

“You want it said before somebody else says it.”

“I want it established that it was not me. Somebody will say otherwise. I
would rather be first. I was near enough that night. I know exactly how it
looks, and I am saying so first.”

She let that sit.

“Who do you think did it?”

"Start with Donnelly. He was in and out of there all week, Dashiell, same as
always," Feldman said, and kept talking through the part where twenty
dollars landed on my desk. I picked it up without breaking her stride.

She is still in the chair. Two questions on the house — a woman hiring you
answers your questions.

[free, 1 written down, 370 words]

the suite                                             12:45 AM   page 2
────────────────────────────────────────────────────────────────────────────

It was Feldman's lead. I came to search the place.

The cold cut through, and the block had emptied early because of it. Every
stoop light was out but the one over the door. The hotel holding the suite
was six floors of brick, plain outside and plainer in. A house phone sat on
a table by the stairs, unanswered at this hour. The building had the
particular quiet of a place where everybody paying by the week had learned
to keep to themselves. Nobody minded who used the stairs. The precinct had
taken its statement and gone home.

Brennan was still on the floor where he had fallen. Nobody else was there.
The lamp came down with him and the bulb was still warm in its socket,
unbroken. The singing under the window stopped at half past ten, when the
shoe came down.

The coroner’s office had left a note behind, for whoever came next. The
coroner put death at half past ten. One blow broke in the back of the skull.
Death was not instant.

That would put Brennan dead by about half past ten. Whoever did it was at
the suite before then. The drunk singing under the window at half past ten.
Anything I had that was pinned to it now had an hour.

[1 action, 2 written down, 218 words]

the parlour                                           1:25 AM   page 3
────────────────────────────────────────────────────────────────────────────

I came on Feldman's word. I came to hear Feldman account for the hours.

Somewhere a clock had gone past one. The cold had cleared most of the block
out early. A last stubborn pair stood outside the parlour, not talking. The
parlour was kept formal, the way a landlady kept the one room in the house
meant to be seen by outsiders. This late the room's own lamp was usually the
only one lit downstairs.

Lathrop was listening from the bottom step before going up. She was the
landlady, a woman in her forties.

Feldman was waiting, and not for me. She kept her legs uncrossed again, over
the pinned hem.

Donnelly and a woman I didn’t know stood by the mantel, talking in low
voices so as not to wake the house.

Feldman was the client. Clients kept their own hours, and I let them. A
landlady kept track of tenants' comings and goings as a matter of business,
and Lathrop was thorough about it.

[1 action, 167 words]

the parlour                                           2:10 AM   page 4
────────────────────────────────────────────────────────────────────────────

Feldman had mentioned the hour. I wanted it from Feldman directly.

It had come round to two. Feldman looked up when I sat down. "Where were
you, start to finish?"

“I was at the parlour from nine until ten, then the El platform from half
past ten until eleven, then the suite at half past eleven.”

I had what I came for. Feldman was not finished.

“I saw him here from six until seven and again at ten o’clock.”

I wrote that down. Then I looked at what I’d written.

Brennan would have been alive at six o’clock, then. That took the hours
before it off the table. I wrote it down as Feldman told it. It was one
person’s account of one person, and I marked it that way.

I wanted Shapiro’s word on Feldman. Shapiro was in business with Brennan.
She was at the parlour.

[1 action, 2 written down, 147 words]

the parlour                                           2:55 AM   page 5
────────────────────────────────────────────────────────────────────────────

Shapiro stopped tapping ash from a cigarette and looked up as I came over.
“Feldman had grown up on the same block as Brennan.”

“Ida Feldman.”

“Where was Feldman tonight?”

“She’s the stagehand at the Selwyn. I saw her here at six o’clock, at nine
o’clock and again at ten o’clock and at the El platform at eleven o’clock.”
Shapiro named a figure again before anybody asked for one.

I put it in the notebook. Then I read it over again.

It was Feldman’s own word for the El platform, and now it was Shapiro’s as
well. That cleared Feldman of the suite. Feldman could have got into the
suite without much trouble. That was a reason to keep asking.

Shapiro was the one to ask about Donnelly, and Shapiro was at the parlour.

[1 action, 1 written down, 134 words]

the parlour                                           3:40 AM   page 6
────────────────────────────────────────────────────────────────────────────

Somewhere in the building a clock struck three. I had another question for
Shapiro. “Donnelly did business with Brennan.”

“Cornelius Donnelly.”

“Where was Donnelly tonight?”

“I saw him here at six o’clock, from half past seven until nine and again at
ten o’clock.”

I wrote it down.

Donnelly might have had a way into the suite, and a way in was not nothing.

He was next, at the parlour. The question was their own evening, around half
past ten.

[1 action, 1 written down, 79 words]

the parlour                                           4:20 AM   page 7
────────────────────────────────────────────────────────────────────────────

I wanted to know where Donnelly had been, and when.

It was past four, and the night went on. Donnelly looked up as I came over.
"Walk me through your evening."

“I was at the parlour from nine until eleven, then the El platform at half
past eleven.” Donnelly answered in short sentences again.

I wrote it in the book.

Donnelly was at the parlour around half past ten, and not only on Donnelly’s
own say-so. That cleared Donnelly.

[1 action, 1 written down, 79 words]

the parlour                                           5:05 AM   page 8
────────────────────────────────────────────────────────────────────────────

I had it from Shapiro. I wanted Shapiro’s evening, hour by hour.

It was after five. I wasn’t finished with Shapiro. "What hour did you clear
out?"

“I was at the parlour at nine o’clock, then the El platform at half past
nine, then the parlour at ten o’clock, then the parlour at half past ten,
then the El platform at eleven o’clock, then the parlour at half past
eleven.”

I put it in the notebook.

It was Shapiro’s evening in Shapiro’s own words. Nobody else had said any of
it yet.

[1 action, 1 written down, 92 words]

the parlour                                           5:50 AM   page 9
────────────────────────────────────────────────────────────────────────────

Nobody had pointed me at Lathrop. I went ahead and asked about Shapiro.

Lathrop stopped listening from the bottom step before going up and looked up
as I came over. "Give me your read on Shapiro."

“I saw her here at six o’clock, from half past seven until eight, at nine
o’clock, at ten o’clock and again at half past eleven. She wasn’t here from
half past six until seven, at half past nine and again from half past ten
until eleven. She wasn’t at the El platform at half past eight.” Lathrop
said a number the old way again without noticing.

I wrote it down. Then I looked at it on the page.

Shapiro could have got into the suite. That put it within reach, if nothing
more. Shapiro had told me the parlour, at half past ten. This said Shapiro
was not there.

I wrote Shapiro’s name at the top of a clean page. It could wait an hour. It
could not wait all night.

[1 action, 1 written down, 167 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 5:50 AM, 3 of 11 left. 10 of 13 things written down.

PEOPLE
  Brennan, a bail bondsman — the victim
    on sight: Brennan was the first telephone call anybody on the street
    made at two in the morning. Brennan is a man. He is in his forties.
    from others: Feldman found Brennan at the suite at 11:30 PM.
    · 6:00–7:00 PM — at the parlour (Feldman)
    · 10:00 PM — at the parlour (Feldman)
  Feldman, a stagehand at the Selwyn — our client (the parlour) — told me all of it
    on sight: Feldman is a woman. She is in her thirties. Feldman is a
    stagehand at the Selwyn.
    says: 9:00 PM–10:00 PM the parlour; 10:30 PM–11:00 PM the El platform;
    11:30 PM the suite
    · 6:00 PM — at the parlour (Shapiro)
    · 9:00 PM — at the parlour (Shapiro)
    · 10:00 PM — at the parlour (Shapiro)
    · 11:00 PM — at the El platform (Shapiro)
      “ Feldman hired us, and wants it known that Donnelly was in and out of
      there all week, and would rather we started there.
      “ Feldman says she was at the parlour from 9:00 PM to 10:00 PM; then
      the El platform from 10:30 PM to 11:00 PM; then the suite at 11:30 PM.
      “ Feldman saw Brennan at the parlour from 6:00 PM to 7:00 PM and at
      10:00 PM.
  Donnelly, a bet collector for an illegal lottery (the parlour) — told me all of it
    on sight: Donnelly is a man. He is in his thirties.
    says: 9:00 PM–11:00 PM the parlour; 11:30 PM the El platform
    · 6:00 PM — at the parlour (Shapiro)
    · 7:30–9:00 PM — at the parlour (Shapiro)
    · 10:00 PM — at the parlour (Shapiro)
      “ Donnelly says he was at the parlour from 9:00 PM to 11:00 PM; then
      the El platform at 11:30 PM.
  Shapiro, a stockbroker who trades in the street (the parlour) — told me all of it
    on sight: Shapiro is a woman. She is in her forties.
    says: 9:00 PM the parlour; 9:30 PM the El platform; 10:00 PM–10:30 PM
    the parlour; 11:00 PM the El platform; 11:30 PM the parlour
    · 6:00 PM — at the parlour (Lathrop)
    · 6:30–7:00 PM — not at the parlour (Lathrop)
    · 7:30–8:00 PM — at the parlour (Lathrop)
    · 8:30 PM — not at the El platform (Lathrop)
    · 9:00 PM — at the parlour (Lathrop)
    · 9:30 PM — not at the parlour (Lathrop)
    · 10:00 PM — at the parlour (Lathrop)
    ! 10:30 PM — not at the parlour (Lathrop)
    · 11:00 PM — not at the parlour (Lathrop)
    · 11:30 PM — at the parlour (Lathrop)
      “ Shapiro saw Feldman at the parlour at 6:00 PM and at 9:00 PM and at
      10:00 PM. Shapiro saw Feldman at the El platform at 11:00 PM.
      “ Shapiro saw Donnelly at the parlour at 6:00 PM and from 7:30 PM to
      9:00 PM and at 10:00 PM.
      “ Shapiro says she was at the parlour at 9:00 PM; then the El platform
      at 9:30 PM; then the parlour at 10:00 PM; then the parlour at 10:30
      PM; then the El platform at 11:00 PM; then the parlour at 11:30 PM.
  Lathrop, the landlady (the parlour)
    on sight: Lathrop is a woman. She is in her forties. Lathrop is a
    landlady.
      “ Lathrop saw Shapiro at the parlour at 6:00 PM and from 7:30 PM to
      8:00 PM and at 9:00 PM and at 10:00 PM and at 11:30 PM. Lathrop did
      not see Shapiro the rest of the evening.

PLACES
  the parlour — semi, watched by the landlady
  the suite — private, unwatched
      “ Brennan was found at the suite. The lamp came down with him and the
      bulb is still warm in its socket, unbroken. The singing under the
      window stopped at 10:30 PM, when the shoe came down.
      “ The coroner puts death at 10:30 PM. One blow broke in the back of
      the skull. Death was not instant.
  the El platform — public, unwatched — not been
  the office — private, unwatched

LEADS
  Nothing open.

ESTABLISHED
  time of death: 10:30 PM
  method: a blunt object
  motives: none known
  near the weapon: Feldman, Donnelly, Shapiro
  accounted for: nobody yet

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who killed Brennan        Shapiro                     ✓

  1 of 1 · solved · 8 actions against par 8

The DA reads it twice and does not find anything to argue with. Shapiro
killed Brennan at the suite, 10:30 PM, and the jury takes ninety minutes
over lunch.

Shapiro hangs in the spring. I am told it rained. 1 out of 1, and 8 calls,
which is exactly what the night was worth.

Shapiro would hang for it, and my report said so plainly, no hour to spare
and none wasted either. I signed it and went to find some sleep.

HOW IT COULD BE KNOWN
════════════════════════════════════════════════════════════════════════════

Who: Shapiro was the only one who could have been at the suite when it
happened.
    · Feldman: the parlour, 6:00, 9:00, 10:00; the El platform, 11:00.
    Feldman could have got hold of it. Shapiro saw her.
    · Donnelly: the parlour, 6:00, 7:30–9:00, 10:00. Donnelly could have got
    hold of it. Shapiro saw him.
    · Feldman says: the parlour, 9:00–10:00; the El platform, 10:30–11:00;
    the suite, 11:30.
    · Donnelly says: the parlour, 9:00–11:00; the El platform, 11:30.
    · Shapiro says: the parlour, 9:00; the El platform, 9:30; the parlour,
    10:00; the parlour, 10:30; the El platform, 11:00; the parlour, 11:30.
    · Shapiro: the parlour, 6:00, 7:30–8:00, 9:00, 10:00, 11:30; not at the
    parlour, 6:30–7:00, 9:30, 10:30–11:00; not at the El platform, 8:30.
    Shapiro could have got hold of it. Lathrop saw her.

When: It happened in the half hour from 10:30.

WHAT REALLY HAPPENED
════════════════════════════════════════════════════════════════════════════

I can tell it now, start to finish. Fannie Shapiro killed Daniel Brennan.

Brennan was a bail bondsman. He was the first telephone call anybody on the
street made at two in the morning. Brennan put up bail money out of an
office across from the courthouse. Shapiro traded stocks on the street
outside the exchange. Shapiro and Brennan took the lease together in ’24 and
had argued about it ever since. Brennan was about to expose Shapiro. He had
told Shapiro the story would run whether Shapiro liked it or not.

Shapiro was at the parlour at ten o’clock, and when she left, the bronze
bookend went with her. There was a clean patch in the dust where it had
stood. From there Shapiro went straight to the suite. Brennan came to the
suite straight from the parlour, where he had been at ten o’clock.

It was half past ten, just as the singing stopped. Nobody else was there.
Shapiro hit Brennan with the bookend. It was one blow, at the back of the
skull, and Brennan did not die at once.

By eleven o’clock Shapiro was at the El platform. At half past eleven she
went on to the parlour.

It was half past eleven before anybody found Brennan. It was Feldman, at the
suite. By then Brennan had been dead for an hour. The precinct took a
statement at the desk and filed it.

Nothing else that happened that night had anything to do with it.

9 pages · 1453 words · 161 a page · 8 actions spent · 0 fallbacks
```

**Does it teach "catch the lie"? Yes, but it's the weakest of the three on the page.**

- **Page 1.** The client, Feldman, points at Donnelly.
- **Pages 4–5.** Feldman's evening, then Shapiro's word that clears it: "It was Feldman's own word for the El platform, and now it was Shapiro's as well. That cleared Feldman of the suite."
- **Pages 6–7.** Shapiro places Donnelly, then Donnelly's own evening arrives and closes it: "Donnelly was at the parlour around half past ten, and not only on Donnelly's own say-so. That cleared Donnelly." It clears on the page where the second fact lands, whichever order the player found them in.
- **Page 8.** Shapiro's own evening.
- **Page 9.** The landlady, unmarked, says Shapiro "wasn't here … from half past ten until eleven". The thought is exact: "Shapiro had told me the parlour, at half past ten. This said Shapiro was not there."

Rough spots:
- Shapiro's account is the worst stutter of the three: six spans, three of them "the parlour", with the lie ("the parlour at half past ten") sitting between two true "parlour"s. A first-time reader won't see the lie until the landlady says it. The logic is right; the telling needs Part A's merge.
- The landlady's answer is long: three "wasn't here" spans. Only one of them matters.
