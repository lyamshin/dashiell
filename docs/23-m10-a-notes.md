# M10 Part A — Facts told, not printed: notes

*Branch `m10-testimony`, off `main` at fefebbf, with Part B (PR #35) and deck batch D (PR #36) merged in as they landed. Spec: `docs/23-m10-testimony.md`, Part A. Target: `docs/golden/seed3-testimony.md` and its eight rules.*

## In one paragraph

A question page used to fire the generator's rule sentences one after another, each in quotation marks, each behind its own "What else at the third floor?". Now the facts a page gains are sorted into **families** — one person's comings and goings, a door's head counts, the strangers somebody saw, a thing the witness knows about, their own evening, when something the block times things by happened, what anybody there would know — and each family is **told once**, in the witness's words: the question (the detective's, and clearly his), the telling (hours spoken and ordered, "here" for the room they stand in, people the way this witness knows them), a **grounding** (how they know, from their trade, their post or their acquaintance), a **follow-up** where the fact has a second half ("And the rest of the evening?" / "Not here."), sometimes a **tail** (attitude, never a fact, the only place a figure goes), and the detective's **note** (what the fact is worth, never what it proves). A page tells at most three families; the rest waits behind a free **"Go on"**. A search that turns up several things tells each as its own short moment, find then thought, three to a page. The book's machinery words are gone from narration, no clue's `text` or `rule` is ever quoted, and a reader lint holds all of it over 40 seeds × every tier. The correspondence checker traces every telling: its fact-bearing sentences to the family's own facts, and everything around them to saying no case fact at all.

## What changed where

| file | what |
|---|---|
| `src/game/scene/families.ts` (new) | `familyOf`, `familiesOf`: the clues a page gains, grouped by what a person says in one breath. `paceClues`: three families now, the rest later. `FAMILY_CAP = 3`. |
| `src/game/scene/telling.ts` (new) | The fact-bearing sentences of each family, from its facts: `movements`, `counts`, `strangers`, `timing`, `event`, `evening`. `saidPlainly`: an old clue kind's record in the witness's words (the attribution off, "I" for the witness, "I heard X tell Y…", speech contractions, one clause a sentence). `putSaid`: a fact put to somebody, said by the detective from its facts. |
| `src/game/scene/plan.ts` | An ask page is `exchange` (the approach and the question), then per family `telling`, its `find`s, its thought (one, or the observer pair), and a `note`. A search with several finds is find, thought, find, thought. A page with more to tell has no bridge yet. Recall only for somebody seen before; first sight for somebody only heard named. A look round the room describes nobody twice a visit. |
| `src/game/scene/realize.ts` | `tellingParas`, `familyQuestion`, `attributed`, `nameReply`, `windowSpan`, `WATCH_CLAUSE`. The exchange writes only the question when tellings follow. The note, once a night, only after a one-sentence thought, and only when it says something the thought didn't. The watch said once. The coroner's window "at half past eight" or "between eight and half past eight". The free first ask in plain words. |
| `src/game/scene/thought.ts` | `thoughtsFor(input, cap)`, `thoughtPriority`. |
| `src/game/reducer.ts`, `types.ts`, `parser.ts`, `choices.ts`, `storage.ts` | `RunState.pending`, `Command { kind: 'continue' }` ("go on"), `pendingFor`, `continuationOf`, the price `continue` (free). The same question asked again, or the room searched again, goes on too. A `continue` choice group heads the page when something is held back. Repeats read back the whole answer. |
| `src/game/oracle.ts`, `scripts/diagnose-play.ts` | Every automated player takes "Go on" as soon as it is offered. |
| `src/game/correspond-pages.ts` | `checkTelling`; tiered accounts count as accounts in hand; the contracted pronouns "He’d", "She’s"… |
| `src/game/reader-lint.ts` (new) | `lintRun`: machinery words, garbled errands, empty thoughts, quoted records, repeated questions, crowded pages, presence and recall more than once a visit. |
| `src/game/scene/bridge.ts`, `text.ts`, `transcript.ts`, `ui/prose.ts`, `voice/page.ts` | "Zeldin’s evening" (and "his own evening" once the name is said); a name said inside a long speech is explained after it; "gave me the evening, and I wrote it down"; the free first ask. |
| `content/decks/telling.json`, `grounding.json`, `followup.json`, `tail.json`, `note.json` (new) | 64 + 90 + 45 + 68 + 40 = 307 cards. Schema entries in `content/deck-schema.json`. |
| `content/decks/thought.json`, `confront.json`, `answer.json`, `place-ambient.json` | Every card that said grid, margin, row, square, column, lead, "the notebook had" or "the coroner's hours" rewritten; six generic `context` cards. |
| `scripts/golden-loop.py`, `src/cli/golden.ts` | Ask pages held to the testimony golden; `--tier`. |
| `docs/golden/GAP.md` | The testimony golden measured, and the question's targets. |
| A.5 (a separate branch, merged) | `src/gen/data/cast.ts`, `dossier.ts`, `cast.ts`, `topics.ts`, `data/methods.ts`, `voice/office.ts`, `voice/cast.ts`, `voice/cards.ts`, `voice/plain.ts`, `voice/page.ts`, `story.ts`; hiring, entrances, portraits, endings, errand, carry and bridge decks; `test/m10-a5.test.ts`. See §A.5 below. |
| tests | `test/m10-testimony.test.ts` (new, 23 tests), `test/m10-a5.test.ts` (new, 13); `m6`, `m6-walk`, `m8`, `voice`, `coherence` brought to the new shapes. |

## §A.1–§A.2 The telling, and families told together

**Families.** `familyOf` reads a clue's kind and facts:

| family | clues | told as |
|---|---|---|
| movements | testimony about one person, or any clue placing one person | "I saw him here from seven until half past. He was back at nine o’clock." — follow-up — "Not here." |
| counts | a watcher's `countAt` and `absentFrom` at one door | "One came in at half past six. One at half past eight. Two at nine o’clock. One at half past nine. At half past ten it was Ilse Hauck, and nobody with her." |
| strangers | `describedAt` sightings at one place | "A woman under forty at half past six. Then a man in his thirties at half past seven and one from half past eight until half past nine. One or two I knew by sight. None of them by name." |
| evening | the witness's own account | "I was at the subway kiosk at seven o’clock. Then the third floor, at half past seven. From eight until half past nine I was here." |
| timing | `anchorAt` | "That was at half past six, half past eight and half past ten." |
| event | `anchorKnowledge`, `knows` | "Anybody who was here at nine o’clock would know how the fight came out." |
| knowing | `acquainted` alone | "Never heard of her." |
| thing | access, means, motive, the old kinds | the record in the witness's words: "There has only ever been the one key to the walk-up. It lives at the third floor. Marchetti had it off the hook that evening." |

Knowing folds into a person's movements; a sighting tied to an event ("While the fight was on the radio, she was here.") is a sentence of the person's movements, once an anchor however often it came round. Every hour and name in a telling comes from the family's facts, and `BeatTrace.parts` keeps the telling's words by part for the checker.

**The question.** It is the detective's: after a line whose subject is the witness ("Rafferty stopped counting… and looked up"), it carries "I said" or "I asked" (`attributed`). The first family's question comes from the `followup` deck when the topic was a place, a thing or somebody's evening and the answer is a door, strangers, an hour or an evening ("Who came through tonight? All of them, in order."; "What time was the milk wagon on its rounds, exactly?"; "Walk me through your evening."). Each family after the first gets its own ("And the ones you didn’t know?"), and no page asks the same question twice. The carried question's reply is the name the way this witness knows it: "Carmine Vitale.", "The stockbroker who trades in the street.", or "I know who you mean. I know the face." — and a face known by sight comes with no dossier history.

**Grounding, follow-up, tail, note.** Dealt by role (the ten posted fixtures and "suspect"), family, how the witness knows the person, and which half of the telling it closes. A grounding that says "I saw it myself" is dealt only where the witness saw something. A tail is dealt by temper (a yapper three times in four, an enigma one time in seven), never on a long answer, never about the victim's habits, never twice a night. A note follows only a one-sentence thought, shares no word with it, and comes once a night or not at all. A long story (four sentences or more of one person) is two turns with a plain beat between ("She went on.").

## §A.3 Pacing

- **Three families a page.** `paceClues` in the reducer tells the first three families and holds the rest in `RunState.pending`. The page ends on a `continue` group with one choice, "Go on", free. The next page opens `“Go on,” I said.` (a search: "I wasn’t through with the fourth floor yet. / I went on from where I had left off.") and tells the next three. Asking the same question again, or searching the room again, goes on the same way, so nothing held back is ever lost. The oracle, the design test's players and the test walkers take "Go on" as soon as it is offered; par is unchanged because it is free. Over 40 seeds × every tier on the oracle's route, 38 pages were a "Go on", all but a handful of them searches.
- **Presence once a visit.** A look round the room he is already in describes nobody a second time ("Nobody had moved since I came in."). Somebody the notebook has only heard named is seen for the first time when they are in the room: sex and age, no recall.
- **Recall once a visit, across pages**, and only for somebody seen on an earlier page — no more "…again" the first time a person is in the room.
- **The watch said once.** The unwatched place's clause is not added when the place's own card already says nobody minds the door (`WATCH_CLAUSE`).

## §A.4 Words that never appear

`lintRun` (and `test/m10-testimony.test.ts`, 40 seeds × tiers 0–5 plus the untiered case) finds none of: grid, margin, rule, lead (as a noun), beat (the book's, not the patrolman's), card (the book's, not a business card), "the notebook had…", "put it on the grid", "the coroner's hours"; "On X's word, I asked X…", "I came to put X to Y."; "I wrote it down and thought about it."; any clue's `text`, `textRecord`, `rule` or rule part inside quotation marks, whole or a sentence at a time; a question said twice on one page; more than three families on a page or three finds on a search; a presence line or a recall twice in one visit. The literal senses are allowed and listed: the patrolman on the beat, a business or calling card, a card case, house rules, a name written in the margin of a paper.

The confront page no longer reads the record aloud: the detective puts the fact in his own words from its facts ("Rafferty puts you at the third floor from seven until half past.").

## §A.5 The bugs

Items 1–8 were built on a separate branch (`m10-a5-bugs`) and merged; item 9 and the window thought are in the scene layer.

| bug | fix |
|---|---|
| "I am his brother-in-law" from a woman | Relation templates hold both forms, `{his form|her form}`, resolved by the person's sex (`genderForms`, `src/gen/dossier.ts`): brother/sister-in-law, landlord/landlady, husband/wife, married his sister/her brother. |
| "The lamp came down with him" for a woman | The four scene traces in `src/gen/data/methods.ts` are pronoun-free ("came down in the fall"). No other clue template writes the victim's pronoun. |
| The client calls him by name, unmet | Cards that use `{detective}` or are tagged `familiar` are dealt only when the roll says the client knows him (`knowsTheDetective`), on every rung of the ladder. |
| "A voice thinned with age" in her thirties | Portrait cards are filtered by their `ageBand` against the person's age (`ageFits`). |
| "from half past eight until half past eight" | `windowSpan`: "at half past eight", or "between eight and half past eight". |
| Page one's close | "She was still in the chair. I had a question or two for her before she went." at the very end; the office has its own short beats, so no "Down it went.", "I noted it.", "I did not linger". |
| "I closed it the way it opened, X at the center of it" | Rewritten so it is always true. |
| "their" for a person of known sex | The topic is "his own evening" / "her own evening" (`src/gen/topics.ts`), and a bridge says "Zeldin’s evening" (or "his own evening" once his name is said). |
| A search's documents listed flat | Each find its own moment, then what it is worth; three to a page, and "Go on". |
| Also | "put X to Y", "On X's word, I asked X", "The notebook had…" and "lead" as a noun rewritten in carry, errand, bridge and answer; "Corrigan knew me from before, and that saved us both some time." for the free first ask; "Hanrahan gave me the evening, and I wrote it down as told:". |

## §A.6 Content

307 new cards, written to the golden's voice: plain first, past-tense narration, dialogue in the witness's register, no hour, no place by name, nobody by name but through the engine's slots, no machinery word, and a figure only in a tail (one card in three at most has one). The schema's `$comment` for each deck says what a writer may and may not put in it, so the deck-expansion writers can extend them.

| deck | cards | keyed by |
|---|---|---|
| telling | 64 | family × temper × how the witness knows the person |
| grounding | 90 | role (ten fixtures and suspect) × family × knows × half |
| followup | 45 | part (open, second) × family × ask (rest, other, sure) × order |
| tail | 68 | family × temper × knows |
| note | 40 | family × band (teach: Raw and Coddled; play: Poached up) × polarity |

## Correspondence

`checkTelling` holds every rendered telling and note:

- the telling's clues are ones the page handed over;
- each fact-bearing sentence names only hours the family's facts have, and only people those facts are about or its clues name (the victim always);
- the question, the grounding, the follow-up, the tail and the telling card's frame name no hour, no place and nobody but the witness, the one the family is about and the victim;
- the note likewise.

An old clue kind's record said the witness's way keeps the record's own hours, and the page-level check still holds those. `checkRun` now counts a tiered case's account clue as an account in hand, as the reducer does; Part B's Raw put accounts on the route, and at Raw a placement against one is still called a contradiction.

## Measurements

MEASUREMENTS

## Where I judged

1. **The note is the thought.** The golden's note is one or two sentences, and the engine's derived thought already says what the fact touches. The note deck's line is added only after a one-sentence thought, and only when it shares no word with it; otherwise the thought is the note.
2. **One thought a family**, except the observer pair: golden night page 5 keeps both "it clears Hanrahan" and "it puts Kreuzer there too" from one clue, and so does a family.
3. **"Go on" holds families, not clues.** Families are never split across pages. A search's finds are each a family of one.
4. **The mark follows the whole answer.** A question whose lead is in the part "Go on" would tell is still the marked question: the button that leads to the lead carries the mark.
5. **Old kinds keep their utterance cards** (the untiered case's observation, overheard and document clues), framed and grounded like the rest; only where they fell back to quoting the record are they now said in the witness's words.
6. **Places in a tiered telling are the notebook's names** ("the third floor"), never the block's ("the walk-up on Ninth"), so the grid and the page agree.

## Not fixed

NOTFIXED

## Read-through

READTHROUGH
