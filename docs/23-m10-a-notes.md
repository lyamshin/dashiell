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
| tests | `test/m10-testimony.test.ts` (new, 22 tests), `test/m10-a5.test.ts` (new, 13); `m6`, `m6-walk`, `m8`, `voice`, `coherence` brought to the new shapes. |

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

307 new cards, written to the golden's voice: plain first, past-tense narration, dialogue in the witness's register, no hour, no place by name, nobody by name but through the engine's slots, no machinery word, and a figure only in a tail (a handful of tails have one). The schema's `$comment` for each deck says what a writer may and may not put in it, so the deck-expansion writers can extend them.

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

All from this branch's head. "Before" is `main` at fefebbf for the harness, and `origin/main` at 3bbf6f9 (Part B and deck batch D merged) for the design test. The harness's "after" therefore carries deck batch D's new arrival, hour and errand cards as well as Part A; the question pages are Part A's, the arrivals mostly batch D's.

**Tests:** 43 files, 818 tests, all passing. New: `test/m10-testimony.test.ts` (22 tests) and `test/m10-a5.test.ts` (13). `npx tsc --noEmit` is clean.

**Reader lint** (`lintRun`, 40 seeds × tiers 0–5 at Precinct plus 40 untiered seeds, 280 oracle runs): 0 issues of any kind.

**Beat coverage:** 100% — 3,240 of 3,240 night pages over those 280 runs; 5,455 of 5,455 on the M8 sweeps (30,285 of 30,285 required beats); 1,401 of 1,401 tiered pages with 274 confrontations on the M9 walk.

**Correspondence:** 0 violations on every existing sweep (M5, M6, M8, M9, M9 polish, Hone 1–2), with tellings and notes traced. On the new 280-run sweep, 0 violations from the engine; 2 generator sentences print an hour their clue's facts no longer hold (seeds 15 and 30 at Medium; see "Not fixed").

**Plain terms:** `npm run decks` reports 4,877 cards across 39 decks, 0 errors, 0 banned terms; `test/plain-terms.test.ts` passes.

**"Go on"** on the oracle's route over the 280 runs: 38 pages, almost all of them a search's second page.

### The night harness, question pages held to the testimony golden

`python3 scripts/golden-loop.py --night [--tier N]`, the targets in `docs/golden/GAP.md`.

**Question pages, Medium (tier 4, Precinct), pages 2–8 of 40 seeds on the oracle's route.** 135 pages before, 128 after.

| metric | target | before | after |
|---|---|---|---|
| orphan word ratio | ≤ 0.94 | 0.759 | 0.755 |
| paragraph cohesion | ≥ 0.43 | 0.731 | 0.672 |
| sentence cohesion | ≥ 0.55 | 0.586 | 0.558 |
| short sentences | ≥ 0.50 | 0.464 | 0.471 |
| long sentences | ≤ 0.06 | 0.016 | 0.002 |
| dialogue share | 0.32–0.57 | 0.307 | 0.263 |
| figures a page | ≤ 0.5 | 0.007 | 0.070 |
| words a paragraph | 14.2–31.8 | 16.2 | 21.0 |
| words | 90–280 | 134.3 | 147.1 |
| **distance** | 0 | 0.112 | 0.234 |

Search pages: distance 0.000 → 0.000, 200 → 159 words (33 → 42 pages, the extra ones the second page of a search that went on). Arrivals: 0.389 → 0.364. Night aggregate 0.167 → 0.200. The office page, under the day targets: 0.000 → 0.000.

**Question pages, Hard-boiled (tier 5, Precinct).** 125 pages before, 116 after.

| metric | target | before | after |
|---|---|---|---|
| orphan word ratio | ≤ 0.94 | 0.731 | 0.749 |
| paragraph cohesion | ≥ 0.43 | 0.737 | 0.713 |
| sentence cohesion | ≥ 0.55 | 0.590 | 0.584 |
| short sentences | ≥ 0.50 | 0.445 | 0.430 |
| long sentences | ≤ 0.06 | 0.025 | 0.002 |
| dialogue share | 0.32–0.57 | 0.300 | 0.253 |
| figures a page | ≤ 0.5 | 0.008 | 0.009 |
| words a paragraph | 14.2–31.8 | 16.9 | 22.4 |
| words | 90–280 | 148.6 | 154.9 |
| **distance** | 0 | 0.173 | 0.350 |

Search pages: distance 0.000 → 0.000, 206 → 156 words (32 → 44 pages, the extra ones the second page of a search that went on). Arrivals: 0.399 → 0.336. Night aggregate 0.191 → 0.229. The office page, under the day targets: 0.000 → 0.000.

**Question pages, the untiered case at difficulty 2 (the harness's old fixed set).** 162 pages before, 158 after.

| metric | target | before | after |
|---|---|---|---|
| orphan word ratio | ≤ 0.94 | 0.796 | 0.791 |
| paragraph cohesion | ≥ 0.43 | 0.686 | 0.706 |
| sentence cohesion | ≥ 0.55 | 0.537 | 0.551 |
| short sentences | ≥ 0.50 | 0.539 | 0.519 |
| long sentences | ≤ 0.06 | 0.002 | 0.000 |
| dialogue share | 0.32–0.57 | 0.303 | 0.253 |
| figures a page | ≤ 0.5 | 0.000 | 0.044 |
| words a paragraph | 14.2–31.8 | 15.8 | 20.6 |
| words | 90–280 | 120.8 | 137.2 |
| **distance** | 0 | 0.077 | 0.210 |

Search pages: distance 0.000 → 0.000, 180 → 155 words (26 → 30 pages, the extra ones the second page of a search that went on). Arrivals: 0.414 → 0.340. Night aggregate 0.164 → 0.183. The office page, under the day targets: 0.008 → 0.002.

**What moved, and why the distance went up.** The question page is fuller and more even: paragraph length is inside the golden's band now (16 → 21 words, the golden 19–27), long sentences are gone, and a page runs 147 words against the golden's 96–196. Two numbers moved away. *Dialogue share* counts a sentence as dialogue only if it carries an opening quotation mark, so a witness's answer of four sentences in one pair of quotation marks counts once; the printout this replaced — one quoted line a fact, a question between each — scored well on it for exactly the reason the golden rejects it. *Short sentences* lost the one-line questions ("What else at the third floor?") that used to sit between every fact. Both are the golden's rule 1 working against a counter, and I have left them there rather than chop the tellings back into lines; the pages are in the read-through below to judge by.

### The design test (no tier made worse)

`npx tsx scripts/diagnose-play.ts --design --seeds 100`, the configs Part B reported, before (`origin/main` at 3bbf6f9) → after.

| tier | marks-follower names the culprit | reasoning player: right and within budget | button-pusher | median calls (budget) |
|---|---|---|---|---|
| Raw (T0) | 15% → 15% | 100% → 100% | 14% → 15% | 7 (11) → 7 (11) |
| Coddled (T1L1) | 17% → 18% | 100% → 100% | 14% → 18% | 9 (16) → 9 (16) |
| Coddled (T1L2) | 22% → 22% | 100% → 100% | 15% → 17% | 9 (15) → 9 (15) |
| Poached (T2L2) | 32% → 32% | 97% → 97% | 23% → 23% | 9 (12) → 9 (12) |
| Soft-boiled (T3L2) | 28% → 28% | 98% → 99% | 26% → 25% | 11 (16) → 11 (16) |
| Medium (T4L2) | 24% → 24% | 87% → 86% | 17% → 17% | 15 (19) → 15 (19) |
| Hard-boiled (T5L2) | 20% → 20% | 84% → 83% | 17% → 17% | 23 (26) → 23 (26) |

At 300 seeds, Medium's reasoning player is 88% → 87% and Hard-boiled's 85% → 85%. Every player takes "Go on" at once, and it is free, so no route is shorter or longer; what moves a run is that a "Go on" page is a page, and the page count seeds the volunteer's roll and the dealer. The Raw and Coddled targets (marks-follower ≤ 60%, reasoning player ≥ 95%) still hold, and the from-Poached targets (≤ 50%, ≥ 80%) too.

## Where I judged

1. **The note is the thought.** The golden's note is one or two sentences, and the engine's derived thought already says what the fact touches. The note deck's line is added only after a one-sentence thought, and only when it shares no word with it; otherwise the thought is the note.
2. **One thought a family**, except the observer pair: golden night page 5 keeps both "it clears Hanrahan" and "it puts Kreuzer there too" from one clue, and so does a family.
3. **"Go on" holds families, not clues.** Families are never split across pages. A search's finds are each a family of one.
4. **The mark follows the whole answer.** A question whose lead is in the part "Go on" would tell is still the marked question: the button that leads to the lead carries the mark.
5. **Old kinds keep their utterance cards** (the untiered case's observation, overheard and document clues), framed and grounded like the rest; only where they fell back to quoting the record are they now said in the witness's words.
6. **Places in a tiered telling are the notebook's names** ("the third floor"), never the block's ("the walk-up on Ninth"), so the grid and the page agree.

## Not fixed

- **Two generator sentences carry an hour their facts no longer have.** In a tiered case, the inside-job key list ("The sign-in book has Cheatham there at six o’clock") and the locked-room key book ("at half past six it is signed in Vitale’s hand") keep the hour in their text after the logic game takes the placement out of the clue's facts. The find prints the generator's sentence as it stands, and the checker flags it (Medium, seeds 15 and 30 of 40; `main` has the same two). The fix is in `src/gen`: keep the `personAt` in those clues, or take the hour out of the sentence. `test/m10-testimony.test.ts` counts them separately and names them.
- **Dialogue share on question pages** is 0.25–0.26 against the golden's 0.42–0.47 (above).
- **The untiered case's utterance cards** still carry some of their own oddities ("Weisglass blamed somebody for a ruin, for months…" when the witness plainly means Renfro). They are the M4 utterance deck, framed and grounded now but not rewritten.
- **Part B's "two facts agree" thought** on seed 11 Raw page 7 says Donnelly's evening "had the stairwell in it around half past nine, and so did what Mulcahy saw" when Mulcahy saw him there until half past eight and from ten. The card and its tick are Part B's; I have left them.
- **"She had hired me, and here Weisglass was."** The surname-twice pass (Hone 2 §A.3) turns the first of a card's two surnames into a pronoun after a sentence that opened on the same name.
- **"Anybody else through here tonight that you didn’t know?"** can be the first stranger question on a page, after a family that was not about strangers.
- **A note about the victim.** "It put him somewhere. It didn’t say what he did there." is dealt about the victim's last sightings too, where it reads a little cold.
- **Straight quotation marks** in a few office-page deck cards ("It's me, Dashiell," at the entrance; the client's pointer) are the decks' own typography; the night pages normalise the detective's questions.

## Read-through

Rendered after the last change with `npm run read -- --seed N --tier T --no-choices`. I read each page by page as a player would; what read wrong and could be fixed was fixed (the list of those fixes is in the commits: a person's own evening said with their name, "back" and "and again", the free first ask, a question that already says who asks, "I wrote it down" twice, the subject's pronoun in a telling frame, a count said in one breath, notes and tails once a night); what couldn't is under "Not fixed".

### Seed 11 at Raw

```

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

Lindemann lay where she had fallen. Nobody had covered her yet. Nobody else
was there. The lamp came down in the fall and the bulb was still warm in its
socket, unbroken. The singing under the window stopped at half past nine,
when the shoe came down.

The coroner’s office had left a note behind, for whoever came next. The
coroner put death at half past nine. One blow broke in the back of the
skull. Death was not instant.

So it had happened by about half past nine, if that held. Anybody who came
to the walk-up after that came too late. Half past nine, then, for the drunk
singing under the window. Whatever had been waiting on it had an hour now.

[1 action, 2 written down, 215 words]

the stairwell                                         1:25 AM   page 3
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

the stairwell                                         2:10 AM   page 4
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

the stairwell                                         2:55 AM   page 5
────────────────────────────────────────────────────────────────────────────

Donnelly looked up when I sat down. “Lindemann had a creditor,” I said.
“Steinbach.”

“Klara Steinbach.”

“Where was Steinbach tonight?”

Donnelly had been waiting for somebody to ask. “I saw her here from six
until eight. At nine o’clock she was at the ferry slip. From half past ten
until eleven she was here. I’m sure of that much. She never went anywhere
quietly in her life.”

I got it down on paper. Steinbach had said the ferry slip, and Donnelly had
seen Steinbach there. Two people telling one story. That cleared Steinbach.

Donnelly might know about his own evening, and about half past nine. He was
at the stairwell.

[1 action, 1 written down, 110 words]

the stairwell                                         3:40 AM   page 6
────────────────────────────────────────────────────────────────────────────

I wanted Donnelly’s evening, hour by hour.

It was past three, and my eyes had started to sting. I had another question
for Donnelly. “Tell me your evening, start to finish.”

Donnelly seemed to enjoy the telling. “I was here from eight until half
past. Then the ferry slip, at nine o’clock. From half past nine until half
past ten I was here. That’s the whole of it. Not much of a night, when you
say it out loud.”

I wrote that down. It was Donnelly’s evening in Donnelly’s own words. Nobody
else had said any of it yet.

Mulcahy was the one to ask about Donnelly, and Mulcahy was at the stairwell.
She did business with Lindemann.

[1 action, 1 written down, 118 words]

the stairwell                                         4:20 AM   page 7
────────────────────────────────────────────────────────────────────────────

Somewhere a bell had rung four while I wasn’t counting. Mulcahy left off and
looked up. “Donnelly did business with Lindemann,” I said.

“The pawnbroker’s clerk.”

“Where was Donnelly tonight?”

Mulcahy nodded. “I saw him here from six until half past eight. He was back
from ten until half past eleven. I saw it with my own eyes. I don’t keep
track of him beyond that. I’ve got my own troubles.”

I got it down on paper. Donnelly’s evening had the stairwell in it around
half past nine, and so did what Mulcahy saw. That cleared Donnelly.

Somebody had to account for Mulcahy’s evening at half past nine. Mulcahy
might, at the stairwell.

[1 action, 1 written down, 113 words]

the stairwell                                         5:05 AM   page 8
────────────────────────────────────────────────────────────────────────────

I wanted to know where Mulcahy had been, and when.

I had lost track of the time. It was past five. I turned back to Mulcahy.
“Where were you, start to finish?”

Mulcahy told it in order. “I was here from eight until half past ten. I
don’t keep a diary, but I know where I’ve been.”

I wrote it down as Mulcahy told it. It was one person’s word about one
person.

[1 action, 1 written down, 73 words]

the stairwell                                         5:05 AM   page 9
────────────────────────────────────────────────────────────────────────────

Nobody had asked me to. I asked Corrigan about Mulcahy on my own account.

Corrigan stopped listening from the bottom step before going up and looked
up as I came over. “Mulcahy,” I said. “Straight, and I’ll go away.”

Corrigan knew me from before, and that saved us both some time.

She didn’t have to look anything up. “I saw her here from six until half
past seven. She was back at half past eight. And again from ten until half
past eleven.”

“Any time you’d swear she wasn’t there?”

“Not at the ferry slip at eight o’clock. Not here from nine until half past.
I hear every foot on those stairs, and I know most of them.”

I wrote that down. If Mulcahy was not at the stairwell at half past nine,
then Mulcahy had lied to me about half past nine.

I didn’t say anything yet. I wrote the stairwell and half past nine next to
Mulcahy’s name and underlined them.

[free, 1 written down, 163 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 5:05 AM, 4 of 11 left. 9 of 13 things written down.

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

9 pages · 1472 words · 164 a page · 7 actions spent (1 waived) · 0 fallbacks
```

### Seed 3 at Medium

```

DASHIELL · case 3 · difficulty 2 · Little Italy
Medium (5 suspects, 5 places, 3 secrets, coroner 1h, par 8–14) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 14, budget 20 (generator: 13/19), 135 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: bruised, someone-who-left, cold night.
  The office: two rooms over a Chinese laundry on Mulberry Street.
  Knows Renfro — did-a-job-for (warmth +0)

  TEMPER
    Crowninshield enigma  a dentist with a chair and a waiting room
    Vitale        enigma  a bookmaker in a small way
    Marchetti     plain   a switchboard operator
    Steinbach     yap     a piano teacher
    Hauck         enigma  a stockbroker who trades in the street
    Rafferty      yap     the landlady
    Hargrove      plain   the bartender
    Renfro        plain   the patrolman on the beat

my office                                             12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a Chinese laundry on Mulberry Street, Little Italy.
My knuckle had split open again, the same place as last month. It caught on
the desk drawer every time. Frost had crept across the window glass from the
inside. A woman came up the stairs after midnight.

Hauck came in wearing mink and said nothing until she'd chosen where to sit.
She left a calling card on the desk with one corner turned down before she
said a word, an old custom she plainly still kept without thinking about
why. Ilse Hauck was in her thirties. She kept one hand in a pocket. I kept
quiet.

“Take your time.”

“I trade on the street. My customers would rather not be seen doing it
themselves. Isidore Sirkin is dead.”

“He could close a building with a signature, and had closed two,” she said.
“He was found dead at the walk-up.”

“The door at the walk-up was locked and the windows were painted shut. There
is one key to the walk-up. It was on its hook at the third floor this
morning.”

“The coroner puts it between eight o’clock and half past eight.
Crowninshield found him at the walk-up at half past eleven.”

“The precinct wrote it down as a fall and closed the book on it. I am his
sister-in-law.”

She took a moment. Nothing moved.

“What happens if it is settled loudly?”

“I want it settled quietly,” Hauck said. “If I wait, it gets settled loudly
instead. I am paying for two things. One is that it is found. The other is
that nobody hears about it.”

“Who would do that to Sirkin?”

"Start with Steinbach. Steinbach blamed Sirkin for the ruin of his
business." That was the whole of it. I took a hundred dollars and didn't ask
for more explaining than I'd been given.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 326 words]

the walk-up                                           12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

Hauck had named it first. I came to go through it, drawer by drawer.

It was cold enough that the doorknob stung my hand through the glove. The
walk-up over the drugstore was a narrow building, one room deep, stairs
running up the middle of it. The walk-up was at the top, under the roof,
where the heat from the store below never quite reached. It was late enough
that the drugstore's own noise had stopped hours before. No one was posted
to see who came and went. The police had called it a fall and gone home.

Sirkin was still on the floor where he had fallen. Nobody else was there. A
glass was on its side and the spill had not yet reached the edge of the
table when it dried. The whistle went off the river at half past eight, two
long and one short, and the boat’s log had the hour.

The coroner’s man had left a note on the back of an intake form. The coroner
put death between eight o’clock and half past eight. Chloral, a sleeping
drug, in the stomach. No wound, no bruising, no sign of a struggle.

That would put Sirkin dead by about half past eight. Whoever did it was at
the walk-up before then. It was poison in a drink, then. Whoever it was had
to get at the chloral and put it in the drink.

[1 action, 2 written down, 237 words]

the walk-up                                           12:50 AM   page 3
────────────────────────────────────────────────────────────────────────────

Nobody had told me to search it. I did, on my own account.

I went through the kitchen end first, cupboard by cupboard, then the sitting
end with its one good chair and its table. Last I got down and looked along
the floorboards by the back stair. There was an IOU for $4,000 signed by
Crowninshield, made out to Sirkin, three months past due.

There was a strapped suitcase in the room, and a length of sash cord. I left
them both alone for now.

That gave Crowninshield a reason: Crowninshield owed Sirkin four thousand
dollars and was past due on it.

There was a typed page of dates and sums in Sirkin’s file, headed with
Marchetti’s name. Marchetti used to work for Sirkin.

So Marchetti was about to be exposed by Sirkin. That was a reason, if
Marchetti needed one.

There was a clipping about the failure of Steinbach’s business, with
Sirkin’s name underlined twice in pencil.

If Steinbach blamed Sirkin for the ruin of Steinbach’s business, then Sirkin
dead was worth something to Steinbach.

I wanted to know about the key around eight o’clock. Rafferty was the one
who might say. She was the landlady at the third floor.

[1 action, 3 written down, 202 words]

the third floor                                       1:10 AM   page 4
────────────────────────────────────────────────────────────────────────────

I wanted what Rafferty knew about the key.

The nearest clock I could see said it was past one. The cold cut through,
and the block had emptied early because of it. Every stoop light was out but
the one over the door. The third floor looked straight down onto the street,
three windows in a row. The lock on the street door hadn't worked in years,
which was its own kind of honesty. This late there was nobody on the stairs
but whoever was coming up them.

Rafferty was counting out coins from a rent envelope, stacking them by
denomination. She was the landlady, a woman in her forties.

Rafferty kept the building and knew who came and went by heart.

[1 action, 122 words]

the third floor                                       1:35 AM   page 5
────────────────────────────────────────────────────────────────────────────

I had a question about the key, and Rafferty was the one to ask.

Rafferty stopped counting out coins from a rent envelope and looked up as I
came over. “Tell me about the key,” I said.

Rafferty lowered her voice. “There has only ever been the one key to the
walk-up. It lives at the third floor. Marchetti had it off the hook that
evening. I don’t say a thing about my tenants unless I know it. I could tell
you more about this street than the street would like.”

I wrote it down. Marchetti could have got into the walk-up without much
trouble. That was a reason to keep asking.

“Any strangers?”

Rafferty had noticed, and was pleased to have noticed. “A woman under forty
at ten o’clock. I didn’t know her. If I don’t rent to somebody, I don’t know
who they are. Half the people through here I wouldn’t know again, and the
other half I’d rather not.”

Rafferty had seen a woman under forty at the third floor at ten o’clock, and
had no name to give me. The description would have to wait for one.

People who are owed money keep track of the people who owe it. I wanted to
know where Vitale had been. Vitale was Sirkin’s creditor, and Rafferty might
say.

[1 action, 2 written down, 220 words]
[gap: no-fact: overheard (t002) states nothing structured; its own line stands]

the third floor                                       2:00 AM   page 6
────────────────────────────────────────────────────────────────────────────

Past two, and eight was not getting any further off. I had another question
for Rafferty. “Sirkin had a creditor. Vitale.”

“Carmine Vitale.”

“Where was Vitale tonight?”

“Oh, I saw him all right,” Rafferty said. “I saw him here from seven until
half past. He was back at nine o’clock.”

“And the other hours?”

“Not here. I hear every foot on those stairs, and I know most of them. You
don’t miss him. Nobody does.”

I put it in the notebook. Vitale was not at the third floor at eight
o’clock, by that account. If Vitale said different later, one of them would
be lying.

Rafferty was next. The question was the third floor, around eight o’clock.

[1 action, 1 written down, 117 words]

the third floor                                       2:25 AM   page 7
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the third floor. Rafferty might know
it.

I wasn’t finished with Rafferty. “Who came through tonight? All of them, in
order.”

Rafferty liked this question. “One came in at half past six. One at half
past eight. Two at nine o’clock. One at half past nine. At half past ten it
was Ilse Hauck, and nobody with her. I count them in and I count them out.
It’s how I know who owes me.”

I got it down on paper. Rafferty kept the third floor, and at half past ten
nobody came in but the ones Rafferty named. It was a short list.

“And the ones you didn’t know?”

“Faces I didn’t know?” Rafferty said. “A woman under forty at half past six.
Then a man in his thirties at half past seven and one from half past eight
until half past nine. One or two I knew by sight. None of them by name. I
don’t learn names off the backs of people’s coats.”

No name from Rafferty, only a woman under forty. I wrote it down the way it
was said.

[1 action, 9 written down, 190 words]

the speakeasy                                         2:50 AM   page 8
────────────────────────────────────────────────────────────────────────────

Hauck sent me. I came to ask Crowninshield about Hauck.

The cold kept the block empty and the glass fogged from inside. The
speakeasy was the only warm-looking storefront on the street. The room under
the hat shop, where the speakeasy was, had no sign and needed none: it sold
liquor, and selling liquor was against the law. A hallway from the street
door ran back to the bar, dim on purpose. At this hour the tables at the
back were the ones still occupied.

Hargrove was rinsing glasses in a basin, setting them out to dry. He was the
bartender: a man in his forties.

Crowninshield, a woman in her forties, was waiting, and not for me.

Hauck was tapping ash from a cigarette without breaking a sentence. She
turned down the corner of a card again without thinking about it.

Vitale and Marchetti sat at the bar a few stools apart, each of them minding
a glass.

Crowninshield was in the notebook already. Now there was a face to go with
it. Whoever came or went, Hargrove would have marked it.

[1 action, 183 words]

the speakeasy                                         3:10 AM   page 9
────────────────────────────────────────────────────────────────────────────

It was three now. A drain in the wall gurgled and went quiet, and overhead
the hat shop's floor gave a single long creak as the building settled.
Crowninshield looked up as I came over. “Sirkin had a sister-in-law,” I
said. “Hauck.”

“The stockbroker who trades in the street.”

“Where was Hauck tonight?”

Crowninshield said it flatly. “I saw her here from half past eight until
ten. She was back at eleven o’clock. While the fight was on the radio, she
was here. I was there. I saw it myself.”

I put it in the notebook. Half past eight was one of the half hours that
mattered, and now Hauck was somewhere in it: the speakeasy, if it was true.
That was one place and one hour. A night has a good many of both.

Somebody had to account for Sirkin at eight o’clock. Crowninshield might, at
the speakeasy.

[1 action, 1 written down, 149 words]

the speakeasy                                         3:35 AM   page 10
────────────────────────────────────────────────────────────────────────────

I had a question for Crowninshield about Sirkin.

I turned back to Crowninshield. “When did you last lay eyes on Sirkin?”

Crowninshield gave it to me in pieces. “I saw him at the subway kiosk from
six until seven. At half past seven he was at the third floor. At eight
o’clock he was here. I know him well enough. It was him.”

I wrote that down. Whoever did it had been at the walk-up at half past
eight. That was the time everybody would have to account for.

Steinbach might know where Crowninshield had spent the evening, and
Steinbach was at the subway kiosk.

[1 action, 1 written down, 105 words]

the subway kiosk                                      4:00 AM   page 11
────────────────────────────────────────────────────────────────────────────

The question for Steinbach was about Crowninshield.

A fire engine went by a few streets over, its bell going. It was after four.
Ice had skinned over the puddles in the gutter. A lone figure crossed fast,
breath trailing behind him. The subway kiosk stood at the corner, an
iron-and-glass kiosk over a stair down into the ground. Nobody was posted to
mind who went down it. At this hour trains ran less often, and the stair saw
long stretches with nobody on it at all.

Renfro was waiting, and looking up the street now and then. He was the
patrolman on the beat: a man in his fifties.

Steinbach, a man in his thirties, was checking a small watch pinned to a
collar.

Steinbach had been only a name in the notebook until now. Now the face was
across the room from me.

[1 action, 144 words]

the subway kiosk                                      4:25 AM   page 12
────────────────────────────────────────────────────────────────────────────

Steinbach stopped checking a small watch pinned to a collar and looked up as
I came over. “Sirkin had a tenant,” I said. “Crowninshield.”

“Verity Crowninshield.”

“Where was Crowninshield tonight?”

Steinbach counted it off on his fingers. “I saw her here at six o’clock. She
was back at seven o’clock.” He kept going. “At half past seven she was at
the third floor. At eight o’clock she was at the speakeasy. When the whistle
went off the river, she was here. I’m sure of that much.”

I put it in the notebook. Crowninshield had been at the subway kiosk at the
time of the whistle off the river. I needed the hour of the whistle off the
river before it told me anything.

Crowninshield might know about her own evening, and about half past eight.
She was at the speakeasy.

[1 action, 1 written down, 140 words]

the speakeasy                                         4:50 AM   page 13
────────────────────────────────────────────────────────────────────────────

I came for Crowninshield’s evening.

I was back at the speakeasy, and the door gave me no trouble. Behind the
bar, clean glasses stood in rows under a mirror whose silvering had gone,
spotted black in the corners.

Hargrove was drawing a beer and setting it down without being asked.

Crowninshield was waiting, and not for me. She squared a single sheet of
paper against the table again.

Hauck was tapping ash from a cigarette without breaking a sentence. She
turned down the corner of a card again without thinking about it.

Vitale and Marchetti were slumped in a booth by the far wall, their drinks
gone flat and their talk run down. Crowninshield was where it should have
been. I hadn't wasted the walk.

[1 action, 125 words]

the speakeasy                                         5:10 AM   page 14
────────────────────────────────────────────────────────────────────────────

It was Steinbach who pointed me at Crowninshield’s evening.

Somewhere a clock had gone past five. Crowninshield looked up as I came
over. “Where were you, start to finish?” I asked.

Crowninshield told it the way you read out a list. “I was at the subway
kiosk at seven o’clock. Then the third floor, at half past seven. From eight
until half past nine I was here. I don’t keep a diary, but I know where I’ve
been.”

I got it down on paper. It was Crowninshield’s evening in Crowninshield’s
own words. Nobody else had said any of it yet.

I wanted to know about the speakeasy around half past eight. Crowninshield
might say, and Crowninshield was at the speakeasy.

[1 action, 1 written down, 120 words]

the speakeasy                                         5:35 AM   page 15
────────────────────────────────────────────────────────────────────────────

I wanted to ask Crowninshield about the speakeasy.

I wasn’t finished with Crowninshield. “Any faces tonight you didn’t know?”

Crowninshield said it to the counter more than to me. “A man in his thirties
from eight until half past, one at eight o’clock and one from half past nine
until eleven. Then a woman under forty from nine until half past. One or two
I knew by sight. None of them by name. I don’t know everybody. Nobody does.”

I got it down on paper. A man in his thirties at the speakeasy at eight
o’clock. It could have been anybody who fit, and I didn’t pick one yet.

[1 action, 4 written down, 109 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 5:35 AM, 6 of 20 left. 26 of 135 things written down.

PEOPLE
  Sirkin, a buildings inspector — the victim
    on sight: Sirkin could close a building with a signature, and had closed
    two. Sirkin is a man. He is in his forties.
    from others: Crowninshield found Sirkin at the walk-up at 11:30 PM.
    · 6:00–7:00 PM — at the subway kiosk (Crowninshield)
    · 7:30 PM — at the third floor (Crowninshield)
    · 8:00 PM — at the speakeasy (Crowninshield)
  Crowninshield, a dentist with a chair and a waiting room (the speakeasy)
    on sight: Crowninshield is a woman. She is in her forties.
    documents: Crowninshield’s registration card gives an address on a
    street that does not exist.
    says: 7:00 PM the subway kiosk; 7:30 PM the third floor; 8:00 PM–9:30 PM
    the speakeasy
    · 6:00 PM — at the subway kiosk (Steinbach)
    · 7:00 PM — at the subway kiosk (Steinbach)
    · 7:30 PM — at the third floor (Steinbach)
    · 8:00 PM — at the speakeasy (Steinbach)
      “ Crowninshield saw Hauck at the speakeasy while the fight was on the
      radio. Crowninshield saw Hauck at the speakeasy from 8:30 PM to 10:00
      PM and at 11:00 PM.
      “ Crowninshield saw Sirkin at the subway kiosk from 6:00 PM to 7:00
      PM. Crowninshield saw Sirkin at the third floor at 7:30 PM.
      Crowninshield saw Sirkin at the speakeasy at 8:00 PM.
      “ Crowninshield says she was at the subway kiosk at 7:00 PM; then the
      third floor at 7:30 PM; then the speakeasy from 8:00 PM to 9:30 PM.
      “ Crowninshield says there was a man in his thirties at the speakeasy
      from 8:00 PM to 8:30 PM, and Crowninshield did not know him by name.
      “ Crowninshield says there was a man in his thirties at the speakeasy
      from 9:30 PM to 11:00 PM, and Crowninshield did not know him by name.
      “ Crowninshield says there was a woman in her twenties I know by sight
      at the speakeasy from 9:00 PM to 9:30 PM, and Crowninshield did not
      know her by name.
      “ Crowninshield says there was a man in his thirties I know by sight
      at the speakeasy at 8:00 PM, and Crowninshield did not know him by
      name.
  Vitale, a bookmaker in a small way (the speakeasy)
    on sight: Vitale is a man. He is in his thirties.
    · 6:00–6:30 PM — not at the third floor (Rafferty)
    · 7:00–7:30 PM — at the third floor (Rafferty)
    · 8:00–8:30 PM — not at the third floor (Rafferty)
    · 9:00 PM — at the third floor (Rafferty)
    · 9:30–11:30 PM — not at the third floor (Rafferty)
  Marchetti, a switchboard operator (the speakeasy)
    on sight: Marchetti is a woman. She is in her twenties. Marchetti is a
    switchboard operator.
    from others: Marchetti kept Sirkin’s books until Thomas Brennan was
    brought in over Marchetti’s head.
    _Thomas Brennan is a younger brother in prison upstate._
  Steinbach, a piano teacher (the subway kiosk)
    on sight: Steinbach is a man. He is in his thirties.
      “ Steinbach saw Crowninshield at the subway kiosk when the whistle
      went off the river. Steinbach saw Crowninshield at the subway kiosk at
      6:00 PM and at 7:00 PM. Steinbach saw Crowninshield at the third floor
      at 7:30 PM. Steinbach saw Crowninshield at the speakeasy at 8:00 PM.
  Hauck, a stockbroker who trades in the street — our client (the speakeasy)
    on sight: Hauck is a woman. She is in her thirties.
    · 8:30–10:00 PM — at the speakeasy (Crowninshield)
    · 11:00 PM — at the speakeasy (Crowninshield)
      “ Hauck hired us, and wants it known that Steinbach blamed Sirkin for
      the ruin of Steinbach’s business, and would rather we started there.
  Rafferty, the landlady (the third floor)
    on sight: Rafferty is a woman. She is in her forties. Rafferty is a
    landlady.
      “ Rafferty says there has only ever been the one key to the walk-up,
      it lives at the third floor, and Marchetti had it off the hook that
      evening.
      “ Rafferty says there was a woman under forty at the third floor at
      10:00 PM, and Rafferty did not know her by name.
      “ Rafferty saw Vitale at the third floor from 7:00 PM to 7:30 PM and
      at 9:00 PM. Rafferty did not see Vitale the rest of the evening.
      “ Rafferty says nobody but Hauck came into the third floor at 10:30
      PM.
      “ Rafferty says one person came into the third floor at 6:30 PM, and
      nobody else.
      “ Rafferty says one person came into the third floor at 8:30 PM, and
      nobody else.
      “ Rafferty says 2 people came into the third floor at 9:00 PM, and
      nobody else.
      “ Rafferty says one person came into the third floor at 9:30 PM, and
      nobody else.
      “ Rafferty says one person came into the third floor at 10:30 PM, and
      nobody else.
      “ Rafferty says there was a woman under forty at the third floor at
      6:30 PM, and Rafferty did not know her by name.
      “ Rafferty says there was a man in his thirties I know by sight at the
      third floor at 7:30 PM, and Rafferty did not know him by name.
      “ Rafferty says there was a man in his thirties I know by sight at the
      third floor from 8:30 PM to 9:30 PM, and Rafferty did not know him by
      name.
  Hargrove, the bartender (the speakeasy)
    on sight: Hargrove is a man. He is in his forties. Hargrove is a
    bartender.
  Renfro, the patrolman on the beat (the subway kiosk)
    on sight: Renfro is a man. He is in his fifties. Renfro is a patrolman
    on the beat.

PLACES
  the third floor — private, watched by the landlady
  the speakeasy — semi, watched by the bartender
  the office — private, unwatched — not been
  the walk-up — private, unwatched
      “ Sirkin was found at the walk-up. A glass is on its side and the
      spill had not yet reached the edge of the table when it dried. The
      whistle went off the river at 8:30 PM, two long and one short, and the
      boat’s log has the hour.
      “ The coroner puts death between 8:00 PM and 8:30 PM. Chloral, a
      sleeping drug, in the stomach. No wound, no bruising, no sign of a
      struggle.
      “ Found at the walk-up: An IOU for $4,000 signed by Crowninshield,
      made out to Sirkin, three months past due.
      “ Found at the walk-up: A typed page of dates and sums in Sirkin’s
      file, headed with Marchetti’s name.
      “ Found at the walk-up: A clipping about the failure of Steinbach’s
      business, with Sirkin’s name underlined twice in pencil.
  the subway kiosk — public, unwatched
  my office — private, unwatched

LEADS
  Nothing open.

ESTABLISHED
  time of death: 8:30 PM
  method: poison in a drink
  motives: Steinbach — blamed somebody for a ruin; Crowninshield — owed money; Marchetti — was about to be exposed
  near the weapon: Marchetti, Vitale, Crowninshield
  accounted for: nobody yet

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who killed Sirkin         Marchetti                   ✓
  How                       poison in a drink           ✓
  Why                       exposure — was about to be exposed✓
  When                      8:30 PM                     ✓
  How they got in           with a key                  ✓

  Where they were at 8:30 PM:
    Crowninshield           the speakeasy               ✓
    Vitale                  the speakeasy               ✓
    Marchetti               the walk-up                 ✓
    Steinbach               the third floor             ✓
    Hauck                   the speakeasy               ✓

  10 of 10 · solved · 14 actions against par 14

The DA reads it twice and does not find anything to argue with. Marchetti
killed Sirkin at the walk-up, 8:30 PM, and the jury takes ninety minutes
over lunch.

The DA went down the column for 8:30 PM. I had 5 of 5 where they were:
Crowninshield at the speakeasy, Vitale at the speakeasy, Marchetti at the
walk-up, Steinbach at the third floor and Hauck at the speakeasy.

Marchetti hangs in the spring. I am told it rained. 10 out of 10, and 14
calls, which is exactly what the night was worth.

I closed it with Marchetti guilty and proven so, and the night's last hour
to spare. It was enough.

HOW IT COULD BE KNOWN
════════════════════════════════════════════════════════════════════════════

Who: Marchetti was the only one who could have been at the walk-up when it
happened.
    · Sirkin: the subway kiosk, 6:00–7:00; the third floor, 7:30; the
    speakeasy, 8:00. Sirkin was alive until at least 8:00. Crowninshield saw
    him.
    · Hauck: the speakeasy, when the boxing match on the bar radio happened;
    the speakeasy, 8:30–10:00, 11:00. Crowninshield saw her.
    · Crowninshield: the subway kiosk, 6:00, 7:00; the subway kiosk, when
    the whistle off the river happened; the third floor, 7:30; the
    speakeasy, 8:00. Crowninshield could have got hold of it. Steinbach saw
    her.
    · Vitale: the third floor, 7:00–7:30, 9:00; not at the third floor,
    6:00–6:30, 8:00–8:30, 9:30–11:30. Vitale could have got hold of it.
    Rafferty saw him.
    · Crowninshield says: the subway kiosk, 7:00; the third floor, 7:30; the
    speakeasy, 8:00–9:30.
    · A man in his thirties, a stranger to Crowninshield: the speakeasy,
    8:00–8:30. Crowninshield saw him.
    · A man in his thirties, known to Rafferty by sight only: the third
    floor, 8:30–9:30. Rafferty saw him.

When: It happened in the half hour from 8:30.
    · Sirkin: the subway kiosk, 6:00–7:00; the third floor, 7:30; the
    speakeasy, 8:00. Sirkin was alive until at least 8:00. Crowninshield saw
    him.

Where Crowninshield was: Crowninshield was at the speakeasy at 8:30.
    · Crowninshield: the subway kiosk, 6:00, 7:00; the subway kiosk, when
    the whistle off the river happened; the third floor, 7:30; the
    speakeasy, 8:00. Crowninshield could have got hold of it. Steinbach saw
    her.
    · Crowninshield says: the subway kiosk, 7:00; the third floor, 7:30; the
    speakeasy, 8:00–9:30.

Where Vitale was: Vitale was at the speakeasy at 8:30.
    · Vitale: the third floor, 7:00–7:30, 9:00; not at the third floor,
    6:00–6:30, 8:00–8:30, 9:30–11:30. Vitale could have got hold of it.
    Rafferty saw him.
    · A man in his thirties, a stranger to Crowninshield: the speakeasy,
    8:00–8:30. Crowninshield saw him.
    · A man in his thirties, known to Rafferty by sight only: the third
    floor, 8:30–9:30. Rafferty saw him.

Where Marchetti was: Marchetti was at the walk-up at 8:30.
    · Sirkin: the subway kiosk, 6:00–7:00; the third floor, 7:30; the
    speakeasy, 8:00. Sirkin was alive until at least 8:00. Crowninshield saw
    him.
    · Hauck: the speakeasy, when the boxing match on the bar radio happened;
    the speakeasy, 8:30–10:00, 11:00. Crowninshield saw her.
    · Crowninshield: the subway kiosk, 6:00, 7:00; the subway kiosk, when
    the whistle off the river happened; the third floor, 7:30; the
    speakeasy, 8:00. Crowninshield could have got hold of it. Steinbach saw
    her.
    · Vitale: the third floor, 7:00–7:30, 9:00; not at the third floor,
    6:00–6:30, 8:00–8:30, 9:30–11:30. Vitale could have got hold of it.
    Rafferty saw him.
    · Crowninshield says: the subway kiosk, 7:00; the third floor, 7:30; the
    speakeasy, 8:00–9:30.
    · A man in his thirties, a stranger to Crowninshield: the speakeasy,
    8:00–8:30. Crowninshield saw him.
    · A man in his thirties, known to Rafferty by sight only: the third
    floor, 8:30–9:30. Rafferty saw him.

Where Steinbach was: Steinbach was at the third floor at 8:30.
    · Vitale: the third floor, 7:00–7:30, 9:00; not at the third floor,
    6:00–6:30, 8:00–8:30, 9:30–11:30. Vitale could have got hold of it.
    Rafferty saw him.
    · A man in his thirties, known to Rafferty by sight only: the third
    floor, 8:30–9:30. Rafferty saw him.

Where Hauck was: Hauck was at the speakeasy at 8:30.
    · Hauck: the speakeasy, when the boxing match on the bar radio happened;
    the speakeasy, 8:30–10:00, 11:00. Crowninshield saw her.

WHAT REALLY HAPPENED
════════════════════════════════════════════════════════════════════════════

From the beginning, then, and in order. Rosaria Marchetti killed Isidore
Sirkin.

Everybody on the street could have told you who Sirkin was: a buildings
inspector. Sirkin could close a building with a signature, and had closed
two. He had a district, and a price for everything in it. As for Marchetti,
she was a switchboard operator. Marchetti kept Sirkin’s accounts until
Thomas Brennan was brought in over her head. Sirkin was about to expose
Marchetti. He had told Marchetti the story would run whether Marchetti liked
it or not.

Marchetti was at the third floor at half past six, where the chloral was
kept, and came away with the bottle. There was a ring in the dust on the
shelf where it had been. There was one key to the walk-up, and it lived on
its hook at the third floor. Marchetti had it off the hook that evening, and
it was back on the hook by morning. Marchetti came to the walk-up from the
speakeasy, and was there by half past seven. An hour went by before Sirkin
got there, at half past eight. Sirkin came from the speakeasy.

It was half past eight, as the whistle went off the river. Nobody was there
to see it. Sirkin drank what Marchetti poured, and the chloral was in it.
There was no struggle.

From nine o’clock until half past nine, Marchetti was at the speakeasy. Then
she went to the third floor, and was there at ten o’clock. At half past ten
she went on to the subway kiosk, and stayed until half past eleven.

The one who found Sirkin was Crowninshield. That was at the walk-up, at half
past eleven. By then Sirkin had been dead for three hours. The police were
satisfied it was a fall.

There is nothing else to it. Everybody else on the block had their own
night, and it was not this one.

15 pages · 2489 words · 166 a page · 14 actions spent · 1 fallbacks
```

### Seed 7 at Hard-boiled

```

DASHIELL · case 7 · difficulty 2 · Yorkville
Hard-boiled (6 suspects, 6 places, 5 secrets, coroner 2h, par 10–22) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 22, budget 29 (generator: 21/28), 239 things to find

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

the subway kiosk                                      12:15 AM   page 2
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

the fourth floor                                      12:35 AM   page 3
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

the fourth floor                                      12:50 AM   page 4
────────────────────────────────────────────────────────────────────────────

Nobody had asked me to. I searched it anyway.

I got down on my knees and looked under everything that stood on legs, then
stood up and looked on top of everything tall. I went through the kitchen
drawers and ended at the closet. There was a lease assignment made out in
Dettweiler’s name, waiting only on Renfro’s signature.

A black-lacquered cash box was there, and a framed photograph. I left them
both where they were for now.

Dettweiler wanted Renfro out of the lease and the lease in Dettweiler’s
name. That put Dettweiler among the people with a reason to want Renfro
gone.

There was an IOU for $4,000 signed by Brennan, Renfro’s brother-in-law, made
out to Renfro, three months past due.

Brennan owed Renfro four thousand dollars and was past due on it. It was not
proof of anything, but it was a reason.

The register had a room paid for at nine o’clock, cash, a week in advance,
in a name nobody at the desk could read back.

Renfro was seen at the fourth floor at nine o’clock. That was after, if it
held.

[1 action, 3 written down, 187 words]

the fourth floor                                      12:50 AM   page 5
────────────────────────────────────────────────────────────────────────────

I wasn’t through with the fourth floor yet.

I went on from where I had left off. The bank confirmed the account: Brennan
had been taking two hundred a month for a year, and was at the fourth floor
doing exactly that from eleven o’clock. It was theft, and it was not murder.
Four floors down, the avenue still carried the odd taxi, and its tires
drummed on the cobbles in the stretch outside the building.

It came down to embezzling from an employer. Brennan was out of it.

[free, 1 written down, 89 words]

Kaplan’s                                              1:05 AM   page 6
────────────────────────────────────────────────────────────────────────────

Weisglass had pointed me here. I came to ask Zeldin about Dettweiler. Zeldin
owed Renfro money.

It was past one, and the night went on. The fog muffled everything down to
almost nothing, just the click of my own heels on the stone. Kaplan’s kept a
soda fountain running most of the day and a light on well past it. You could
get in through the front, the only door the shop had.

Prentiss was wiping down the soda fountain with a damp cloth. He was the
druggist: a man in his fifties.

Zeldin was reading a folded newspaper by the light that was there. He was in
Renfro’s debt: a man in his fifties.

Zeldin was in the notebook already. Now there was a face to go with it.
Prentiss watched the aisle out of habit, the way anyone did who had been
robbed once.

[1 action, 146 words]

Kaplan’s                                              1:25 AM   page 7
────────────────────────────────────────────────────────────────────────────

A ceiling fan turned slowly over the fountain, and the drink cooler behind
the counter shuddered each time its motor cut in. Zeldin stopped reading a
folded newspaper by the light that was there and looked up as I came over.
“Renfro had a neighbour across the airshaft,” I said. “Dettweiler.”

“Lotte Dettweiler.”

“Where was Dettweiler tonight?”

Zeldin didn’t have to look anything up. “I saw her at the fourth floor at
eight o’clock. At half past eleven she was here. While the milk wagon was in
the street, she was at the Automat once and here once. I know her face and I
know her walk.”

I wrote it in the book. So Dettweiler had been at the fourth floor at eight
o’clock, if it held. That was an hour that mattered.

Whitfield would know where Zeldin had been. He was the elevator man at the
Hallam. That was the next question.

[1 action, 1 written down, 153 words]

the Hallam                                            1:40 AM   page 8
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

the Hallam                                            1:55 AM   page 9
────────────────────────────────────────────────────────────────────────────

Through the glass of the street doors the avenue's signs showed red and
white, and the marble squares took a faint wash of their colour. Whitfield
stopped polishing the brass rail inside the elevator with a rag and looked
up as I came over. “Zeldin owed Renfro money,” I said.

“Sol Zeldin.”

“Where was Zeldin tonight?”

“He wasn’t here. Not once all evening. I know who lives here. It’s part of
the job.”

I wrote it down. If it held, the Hallam at seven o’clock was one place
Zeldin had not been. There were plenty of others.

Somebody had to account for Zeldin’s evening at seven o’clock. Zeldin might,
at Kaplan’s.

[1 action, 1 written down, 111 words]

the Hallam                                            2:10 AM   page 10
────────────────────────────────────────────────────────────────────────────

I wanted to ask Whitfield about the Hallam.

A church clock a few streets over struck two. I wasn’t finished with
Whitfield. “Who came in tonight? All of it.”

Whitfield went through it in order. “At six o’clock it was Lotte Dettweiler,
and nobody with her. Nobody came in from seven until eight. One at half past
eight. Nobody came in from nine until half past. One at half past ten. One
at half past eleven. I run the car all night. I see who rides.”

I put it in the notebook. Whitfield named who came into the Hallam at seven
o’clock, and nobody else. Anybody else who claimed the Hallam at seven
o’clock would have to explain it.

“Any strangers?”

“A man in his fifties at half past six. Then a man at half past eight. I
knew the faces. Not one of the names. People ride up and ride down. Nobody
introduces himself.”

Whitfield had seen a man in his fifties at the Hallam at half past six, and
had no name to give me. The description would have to wait for one.

[1 action, 8 written down, 185 words]

Kaplan’s                                              2:30 AM   page 11
────────────────────────────────────────────────────────────────────────────

It was Zeldin’s own night I wanted now.

I was back at Kaplan’s, and nobody looked up. In the window, two tall glass
globes of coloured water, one red and one green, stood on pedestals over a
display of toothbrushes and talcum tins.

Prentiss was wiping down the soda fountain with a damp cloth. He had taken
the chair nearest the door again.

Zeldin was smoking under the nearest light. He pulled the cuff down over the
mark on his wrist again. Whitfield had been worth listening to. I wrote it
down and moved on.

[1 action, 95 words]

Kaplan’s                                              2:45 AM   page 12
────────────────────────────────────────────────────────────────────────────

I wanted Zeldin’s evening, hour by hour.

Zeldin looked up when I sat down. “Where were you, start to finish?” I
asked.

Zeldin told it in order. “I was at the Hallam with Lotte Dettweiler at seven
o’clock. Then the Automat, at half past seven. Then the fourth floor, at
eight o’clock. Then the Hallam, from half past eight until nine. At half
past nine I was here. I don’t keep a diary, but I know where I’ve been.”

I wrote it down. Zeldin had given me the evening hour by hour. It was
Zeldin’s own word, and I kept it apart from everybody else’s.

The next question was Dettweiler’s evening, and the hour was seven o’clock.
Dettweiler would know, at the Automat.

[1 action, 1 written down, 123 words]

the Automat                                           3:00 AM   page 13
────────────────────────────────────────────────────────────────────────────

I came for Dettweiler’s evening.

Somewhere a bell had rung three while I wasn’t counting. Fog off the river
had swallowed the street a block away. A foghorn sounded once, a long way
off. You got into the Automat through a door that never locked, the whole
point of a place like it being that it was always open. A few late customers
sat over cold coffee at separate tables. Past midnight the room had the
particular hush of a place built for crowds and currently holding none.

Alfano was ringing up a sale and dropping the coins in a drawer. He was the
man behind the counter: a man in his forties.

Dettweiler was standing out of the wind, hands in pockets. She was a tailor,
a woman in her thirties.

Brennan, a man in his thirties, was checking a pocket watch against the
street clock.

Broadnax and a man I didn’t know were dozing over their cups at a corner
table, their heads propped on their hands.

Dettweiler had been only a name in the notebook until now. Now the face was
across the room from me. Alfano watched the room the way anyone did who
stood in the same spot all day.

[1 action, 205 words]

the Automat                                           3:20 AM   page 14
────────────────────────────────────────────────────────────────────────────

Zeldin had mentioned the hour. I wanted it from Dettweiler directly.

Dettweiler left off and looked up. “Walk me through your evening,” I said.

Dettweiler seemed to enjoy the telling. “I was at the Hallam with Sol Zeldin
at seven o’clock. Then the newsstand, at half past seven. Then the fourth
floor, from eight until half past. From nine until half past I was here. I
remember it because it was tonight.”

I wrote it down as Dettweiler told it. It was one person’s word about one
person.

“Anybody else through here tonight that you didn’t know?”

“Faces I didn’t know?” Dettweiler said. “A man in his fifties at Kaplan’s
from eleven until half past. I didn’t know him. I don’t pay much attention
to who people are. Half the people through here I wouldn’t know again, and
the other half I’d rather not.”

Dettweiler had no name for a man in his fifties. Whoever it turned out to be
had been at Kaplan’s at eleven o’clock.

Dettweiler was next, at the Automat. The question was the fourth floor,
around seven o’clock.

[1 action, 2 written down, 182 words]

the Automat                                           3:20 AM   page 15
────────────────────────────────────────────────────────────────────────────

I wanted to hear what Alfano knew about the milk wagon on its rounds.

Alfano stopped ringing up a sale and looked up as I came over. “What time
was the milk wagon on its rounds, exactly?” I asked.

Alfano knew me from before, and that saved us both some time.

He was sure of it, and said so. “That was at half past six, half past eight
and half past ten. You don’t miss a thing like that. It’s about the only
thing around here that’s on time.”

I wrote that down. Now the milk wagon on its rounds had a time: half past
eight. I went back through the notebook for anything that hung on it.

If anyone knew where Dettweiler had been tonight, it would be Alfano.

[free, 1 written down, 130 words]

the Automat                                           3:35 AM   page 16
────────────────────────────────────────────────────────────────────────────

Broadnax looked up when I sat down. “Renfro had a former employee,” I said.
“Weisglass.”

“I know who you mean. I know the face.”

Broadnax lowered his voice. “Weisglass blamed somebody for a ruin, for
months, and was not quiet about it either, not where I could help hearing. I
wouldn’t tell you if I wasn’t sure.”

I put it in the notebook. That gave Weisglass a reason: Weisglass blamed
Renfro for the ruin of Weisglass’s business. It told me something about her.
It didn’t tell me where she was.

I wanted to know about Renfro around seven o’clock. Broadnax might say, and
Broadnax was at the Automat.

[1 action, 1 written down, 108 words]

the Automat                                           3:50 AM   page 17
────────────────────────────────────────────────────────────────────────────

I had a question for Broadnax about Renfro.

I wasn’t finished with Broadnax. “Give me your read on Renfro.”

Broadnax counted it off on his fingers. “I saw him here from seven until
eight. At ten o’clock he was at the fourth floor. I know what I saw, and
what I didn’t.”

I wrote it down. Renfro at the fourth floor, at ten o’clock, was later than
anything else I had. It was worth holding on to.

Broadnax might know about his own evening, and about half past eight. He was
at the Automat.

[1 action, 1 written down, 94 words]

the Automat                                           4:10 AM   page 18
────────────────────────────────────────────────────────────────────────────

I wanted to know where Broadnax had been, and when.

Somewhere, four had already come and gone. I had another question for
Broadnax. “Tell me your evening, start to finish.”

“Where was I? I’ll tell you where I was,” Broadnax said. “I was here from
seven until eight. Then the Hallam, at half past eight. From nine until half
past I was here. Then the newsstand, from eleven until half past. That’s the
whole of it.”

I wrote it in the book. It was Broadnax’s evening in Broadnax’s own words.
Nobody else had said any of it yet.

People who are owed money keep track of the people who owe it. Brauer was
Renfro’s creditor. Ruggiero would know where Brauer had been tonight. He was
the news dealer at the newsstand.

[1 action, 1 written down, 131 words]

the Automat                                           4:25 AM   page 19
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the fourth floor. Dettweiler might know
it.

I wasn’t finished with Dettweiler. “Any faces tonight you didn’t know?”

Dettweiler had noticed, and was pleased to have noticed. “A man at the
fourth floor at half past eight. I’d seen him around. I couldn’t give you a
name. I don’t know everybody. Nobody does.”

No name from Dettweiler, only a man. I wrote it down the way it was said.

Dettweiler might know where Zeldin had spent the evening, and Dettweiler was
at the Automat.

[1 action, 1 written down, 91 words]

the Automat                                           4:40 AM   page 20
────────────────────────────────────────────────────────────────────────────

I had another question for Dettweiler. “Zeldin owed Renfro money.”

“Sol Zeldin.”

“Where was Zeldin tonight?”

“Oh, I saw him all right,” Dettweiler said. “I saw him here at half past
six. At eight o’clock he was at the fourth floor.” She thought a moment. “At
nine o’clock he was here. At half past eleven he was at Kaplan’s. While the
milk wagon was in the street, he was at Kaplan’s. I was there, and I have
eyes.”

I wrote it in the book. Zeldin at Kaplan’s, during the milk wagon on its
rounds. It would mean nothing until something gave the milk wagon on its
rounds an hour.

[1 action, 1 written down, 109 words]

the newsstand                                         5:00 AM   page 21
────────────────────────────────────────────────────────────────────────────

The question for Ruggiero was about Brauer.

The hour was five now. It was still fogged in, though the shapes of things
were starting to come clear. A tugboat whistle sounded somewhere out on the
river. The stand at the corner, where the newsstand was, kept a small shelf
of magazines under glass, the rest of the stock left open to the weather.
This late there was hardly a customer to be seen.

Ruggiero was stacking the evening papers, squaring the pile against the
wind. He was the news dealer, a man in his fifties.

Bernstein was smoking under the nearest light. He was the patrolman on the
beat, a man in his twenties.

Whoever came by, Ruggiero had likely seen them coming.

[1 action, 123 words]

the newsstand                                         5:15 AM   page 22
────────────────────────────────────────────────────────────────────────────

The traffic light on the corner went on changing, red to green and back, and
its click was the loudest sound at the crossing. Ruggiero stopped stacking
the evening papers and looked up as I came over. “Renfro had a creditor,” I
said. “Brauer.”

“Konrad Brauer.”

“Where was Brauer tonight?”

Ruggiero nodded. “I saw him here at nine o’clock. He was back at half past
eleven. While the milk wagon was in the street, he was here.”

“Was there a time you know he wasn’t around?”

“Not here from six until eight or from half past nine until eleven. Selling
papers is mostly watching the street.”

I got it down on paper. If Brauer was not at the newsstand at six o’clock,
then Brauer had been somewhere else, and I did not know where yet. It was
one person’s eyes, and one person’s eyes can be wrong about the hour.

[1 action, 1 written down, 150 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 5:15 AM, 10 of 29 left. 27 of 239 things written down.

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
      “ Dettweiler says she was at the Hallam at 7:00 PM, with Zeldin; then
      the newsstand at 7:30 PM; then the fourth floor from 8:00 PM to 8:30
      PM; then the Automat from 9:00 PM to 9:30 PM.
      “ Dettweiler says there was a man in his fifties at Kaplan’s from
      11:00 PM to 11:30 PM, and Dettweiler did not know him by name.
      “ Dettweiler says there was a man in his thirties I know by sight at
      the fourth floor at 8:30 PM, and Dettweiler did not know him by name.
      “ Dettweiler saw Zeldin at the Automat at 6:30 PM and at 9:00 PM.
      Dettweiler saw Zeldin at the fourth floor at 8:00 PM. Dettweiler saw
      Zeldin at Kaplan’s while the milk wagon was in the street. Dettweiler
      saw Zeldin at Kaplan’s at 11:30 PM.
  Broadnax, a dentist with a chair and a waiting room (the Automat)
    on sight: Broadnax is a man. He is in his fifties.
    says: 7:00 PM–8:00 PM the Automat; 8:30 PM the Hallam; 9:00 PM–9:30 PM
    the Automat; 11:00 PM–11:30 PM the newsstand
      “ Broadnax says Weisglass said Renfro had taken everything and would
      be made to feel it.
      “ Broadnax saw Renfro at the Automat from 7:00 PM to 8:00 PM. Broadnax
      saw Renfro at the fourth floor at 10:00 PM.
      “ Broadnax says he was at the Automat from 7:00 PM to 8:00 PM; then
      the Hallam at 8:30 PM; then the Automat from 9:00 PM to 9:30 PM; then
      the newsstand from 11:00 PM to 11:30 PM.
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

  9 of 9 · solved · 19 actions against par 22

Renfro is at the fourth floor, and has been since 8:30 PM, and did not want
finding.

The DA went down the column for 8:30 PM. I had 6 of 6 where they were:
Zeldin at the Automat, Weisglass at the subway kiosk, Dettweiler at the
fourth floor, Broadnax at the Hallam, Brennan at the fourth floor and Brauer
at the newsstand.

I write the address down and I do not write down what it cost to get it. 9
out of 9, and it took me 19 calls. It could have been done in 22. I will not
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

22 pages · 3173 words · 144 a page · 19 actions spent (1 waived) · 0 fallbacks
```
