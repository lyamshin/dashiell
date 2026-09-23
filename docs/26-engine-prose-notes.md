# 26 — Engine prose: the read-through's list, engine side

*Branch `engine-prose`, off `main` after PR #39 (the dealer), with PRs #40, #41 and #42 (decks B–C, decks A–E, weather) merged in. The list is [25-read-through-issues](25-read-through-issues.md), and the coordinator added more items while the work was under way (below, "The coordinator's items"). The target voice is `docs/golden/seed3-testimony.md` and `seed3-night.md`.*

## In one paragraph

Two kinds of search find used to print the generator's sentence as narration. A secret explained (a disqualifier) and an hour written down (a timing clue) are now told: what the detective found, and then, from the clue's facts, whom it put where and when. From Poached up, an explained secret gets a thought that explains a lie and clears nobody. Two sightings tied to one anchor are two clauses. An anchor's hour is told once a night. A later find of the same hour says it is "the hour I already had", and no thought, bridge or telling says it again. A search thought names nobody its find did not name. The detective's question now matches what the answer tells: "where was X" before a telling of X's movements, and "how do you know X" only before a telling of whether the witness knows X. A topic that names nobody is asked as the place or thing it is. First sight gives a description, never the relation stacked on it. The hiring's `{dashiell}` slot is supplied. The reader lint checks each of these, eight new rules in all. Across 560 runs (40 seeds × 7 tiers × the oracle and the wanderer), those rules find 676 issues on `main` (a06aa62) and 0 on this branch.

## What changed where

| file | what |
|---|---|
| `src/game/scene/finds.ts` (new) | `toldFind`: a secret explained is what he found (by the secret's kind) plus "It had Brennan here at eleven o’clock." from its `personAt` facts. An hour written down is where it was written plus the hour. A search thought gets only the hours the night has not told yet, or "at the hour I already had". `anchorsTold` lists the anchors whose hour the pages have told: an `anchorAt` fact, or the scene report's own sentence. |
| `src/game/scene/thought.ts` | `secretExplained` gives `dead-end` only where a verdict may be given: `verdictsOn` together with `clearedOnTwo` in a tiered case, or an untiered case. Otherwise it is `secret` with basis `explained`. `anchorAt` for an hour the night has told gives no thought (`quietClue`). `touches anchored` knows when the hour was told (`told: once / recurring / partial`), so it no longer says "Once I knew when that was". |
| `src/game/scene/realize.ts` | Finds go through `toldFind` on a search. `engineThought` writes the explained secret, the timing thought (never restating the hour) and the told-anchor thought. On a search, a thought's person slots are filled only when the find named that person, and otherwise the thought falls to a nameless line. First sight is `visibleTrade` or the age line, never the relation. The ask-person question is dealt by `asks` (where / who) from the first telling's family. Place and thing questions drop `{topic}` and lines that presume what is not so. A bridge to an anchor's hour never puts the window's hour beside it. Answer cards never say "lead", and the answer's `{subject}` is only a thing searched for. The left-alone line goes after the first find and never swallows a later find. A note that says the thought's word again, plural or not, is not added. Cards about "the room" or "in the building" are not dealt out of doors. A movements telling names its subject when the question did not. |
| `src/game/scene/telling.ts` | Anchored sightings at two places: "While the milk wagon was in the street, she was at the Automat. Another time, she was here." A movements telling can introduce its subject by the witness's reference (`introduce`). |
| `src/game/scene/bridge.ts` | `BridgePlan.anchorId`: the lead is when something happened. |
| `src/game/scene/plan.ts` | A quiet clue gets no thought of its own on a multi-find search. The answer's `{subject}` is supplied only for `search-thing`. |
| `src/game/reducer.ts` | `askKindFor`: a generated topic that names nobody is `ask-place` when it names a place ("the walk-up that evening") and `ask-object` otherwise ("the key"). `topicSlots` supplies `{place}` or `{object}` for it. |
| `src/game/voice/exchange.ts` | `dashiellLine(…, { asks, avoid })`: rungs by `asks`, never a line that `presumes` what is not so. |
| `src/game/voice/page.ts` | The hiring's `{dashiell}` (`HIRING_DASHIELL`, by whether the client knows him). The rhythm pass puts no beat on a paragraph that already ends on one ("Neither of us spoke. Nothing moved."). |
| `src/game/voice/cards.ts`, `voice/prose.ts` | A slot that opens a sentence is capitalised wherever it falls, including after `.”` ("…on it.” A hundred dollars…"). It is not capitalised after `?”` or `!”`, where the attribution belongs to the sentence. |
| `src/game/scene/text.ts` | `pastTense`: "have not", "haven’t", "hasn’t" and "have" plus a past participle ("the hands had not moved since"). |
| `src/game/voice-data.ts` | The engine's templates: `SECRET_FINDS` (by secret kind), `SECRET_FIND_PUT`, `EXPLAINED_THOUGHTS`, `SEARCH_TIMING` / `_MANY` / `_MORE` / `_KNOWN`, `TIMING_THOUGHTS` / `_MANY`, `ANCHORED_KNOWN` / `_RECURRING` / `_PARTIAL`, `NAMELESS_THOUGHTS`, `ANCHOR_BRIDGES`, `BRIDGE_HERE` / `_TALKING`, `ANOTHER_TIME`, `HIRING_DASHIELL`, `CRIME_NOUN`. |
| `content/decks/dashiell.json`, `content/deck-schema.json` | Two new optional tags. `asks` (`where` / `who` / `any`) goes on the ask-person lines. `presumes` (`there` / `held`) goes on place lines that assume the witness was there and thing lines that assume the thing is in hand. Nine new lines: five `where` asks (hum-081…085) and four place asks that assume nothing (hum-086…089). This deck was not on the writers' list. |
| `content/deck-schema.json` (writers' asks) | Three new optional tags: `band` on `thought` (`teach` / `play`), `polarity` on `telling` (`seen` / `unseen`), and `met` on `thought` (`yes` / `no`). Two new capitalised slots on `telling`, `{He}` and `{They}`. The engine reads all of them (see "What the writers asked the engine for"). |
| `src/gen/data/methods.ts`, `src/gen/data/means.ts` | Text only. Strangling's step is no longer "had to cut the cord down". |
| `src/game/reader-lint.ts` | Eight new rules (below). |
| `test/engine-prose.test.ts` (new), `test/game/voice.test.ts`, `test/m8.test.ts` | New tests for each fix. The find-slot test and the exact-topic test now expect the told find and the nameless-topic slots. The "says where the one to ask is" test skips somebody who is already in the room, because the page says they are here instead of sending him. |

## Each item, before → after

Before is `main` (d5ac9c9 to a06aa62; the engine lines quoted are the same across them). After is this branch. Both come from the same command.

**1. Search finds told, not printed. A disqualifier is the explanation of a lie.** Seed 7, Hard-boiled, page 5:

> Before: The bank confirmed the account: Brennan had been taking two hundred a month for a year, and was at the fourth floor doing exactly that from eleven o’clock. It was theft, and it was not murder.
>
> After: In the back of a drawer was a bank book in a name that was not Brennan’s, kept in Brennan’s hand: two hundred dollars a month for a year. It had Brennan here at eleven o’clock.

An hour written down. Seed 14, Hard-boiled, page 3:

> Before: The dumbwaiter squeal came at six o’clock, half past seven, nine o’clock, half past ten. *(Page 2 has already said "The dumbwaiter car was worked at nine o’clock".)*
>
> After: The times of the dumbwaiter squeal were pencilled by the door: the one I already had, and six o’clock, half past seven and half past ten.

**2. No verdict from Poached up.** Seed 7, Hard-boiled, page 5:

> Before: It came down to embezzling from an employer. Brennan was out of it.
>
> After: That was Brennan’s secret, then: embezzling from an employer. It was a reason to lie about the hour, and no answer to the disappearance.

**3. Anchored sightings at two places, two clauses.** Seed 7, Hard-boiled, page 7:

> Before: While the milk wagon was in the street, she was at the Automat once and here once.
>
> After: While the milk wagon was in the street, she was at the Automat. Another time, she was here.

**4. A search thought names nobody its find did not name.** Seed 7, Hard-boiled, page 4, after "The register had a room paid for at nine o’clock, cash, a week in advance, in a name nobody at the desk could read back.":

> Before: Renfro at the fourth floor, at nine o’clock, was later than anything else I had. It was worth holding on to.
>
> After: Somebody had been at the fourth floor at nine o’clock. Who, it didn’t say.

The notebook still files it under Renfro, from the rule line. The page no longer claims it.

**5. An anchor's hour, once a night.** Seed 5, Soft-boiled. Page 2 says "The singing under the window stopped at half past seven". Page 3:

> Before: …did the bathroom cabinet last. The drunk singing under the window was at half past seven. … So the drunk singing under the window was at half past seven. Anybody seen somewhere by it had been there at half past seven.
>
> After: …did the bathroom cabinet last. Somebody here had written down the drunk singing under the window as well, at the hour I already had.

The same hour told twice on one page. Seed 11, Raw, page 2:

> Before: The singing under the window stopped at half past nine… Now I knew the drunk singing under the window was at half past nine, and anything anybody had timed by it was at half past nine too.
>
> After: …Anything anybody had timed by the drunk singing under the window had that hour too.

An hour already told, treated as unknown. Seed 3, Medium, page 13. Page 2 says the whistle went at half past eight:

> Before: It hung on the whistle off the river. Once I knew when that was, I would know when Crowninshield was at the subway kiosk.
>
> After: It put Crowninshield at the subway kiosk during the whistle off the river. I had one hour for that, and it came round more than once a night.

A bridge that put the window's hour beside an anchor. Seed 7, Hard-boiled, page 2:

> Before: Somebody had to account for the milk wagon on its rounds at seven o’clock.
>
> After: Alfano would know when the milk wagon on its rounds came by.

**6. The question matches the family told.** Seed 7, Hard-boiled, page 15 (the answer is where Renfro was seen):

> Before: “What's Renfro to you?”
>
> After: “Where did Renfro get to tonight?”

**7. Unsupplied slots and nameless asks.** Seed 1, Soft-boiled, page 11. The topic is "the back lot that evening":

> Before: “The back lot that evening,” I said. “Straight, and I’ll go away.” … “I saw her at the back lot at half past nine.”
>
> After: “You'd have heard,” I said. “What went on at the back lot tonight?” … “I saw Vitale at the back lot at half past nine.”

"The key" (seed 3, Medium, page 5) was dealt the placeholder `hum-p003`, "Tell me about {topic}." It is now dealt `hum-035`, the object line "Tell me about the {object}." The words are the same, so the page does not change.

The hiring's `{dashiell}` is now supplied, for example: “Same as last time, then,” I said. PR #40 has since taken `{dashiell}` out of hir-010, hir-012 and hir-019, so no card asks for it today. The slot is there for the next card that does.

The answer deck's `{name}` is supplied whenever a person sent him. The cards that go unfilled are the ones that would name nobody. The answer's `{subject}` is now given only for a thing he searched for: "It had been worth the trip: the milk wagon on its rounds, plain and in hand." no longer happens. The thought deck's `{subject}`, `{place}` and `{time}` go unfilled only on lower rungs of the ladder, for classes that have no such slot. Rung 0 skipped nothing in 120 instrumented nights (seeds 1–12 at five tiers, both players).

**8. First sight gives the description.** Seed 7, Hard-boiled, page 6:

> Before: Zeldin was reading a folded newspaper by the light that was there. He was in Renfro’s debt: a man in his fifties.
>
> After: Zeldin, a man in his fifties, was reading a folded newspaper by the light that was there.

The errand on the same page already said "Zeldin owed Renfro money."

**The coordinator's items:**

- **Present tense in the scene report.** Seed 21, Poached, page 2: "the hands have not moved since" → "the hands had not moved since".
- **A slot after a closing quote.** "…on it.” a hundred dollars" → "…on it.” A hundred dollars" (in `fill` and in `STOP_THEN_LOWER`).
- **Two beats for one pause.** Seed 7, Hard-boiled, page 1: "Neither of us spoke. Nothing moved." → "Neither of us spoke."
- **"Across the room" out of doors.** Seed 5, Soft-boiled, page 7, the El platform: "Now the face was across the room from me." → "Vitale was in the notebook already. Now there was a face to go with it."
- **"In the building" out of doors.** Seed 5, Soft-boiled, page 8 had "Somewhere in the building a clock struck four." on the El platform. That card is no longer dealt out of doors either.
- **Strangling read as a hanging.** `src/gen/data/methods.ts` gave strangling the step "had to cut the cord down". It is now "had to get close enough, and have the cord to hand". The means with a cord tied to the fire escape had the same words, and is now "had to tie the cord to the fire escape". This is text only, read by the thought deck's `{how}`.
- **A bridge that sends him to somebody already in the room.** Seed 7, Hard-boiled, page 12, at the Automat, talking to Dettweiler:

  > Before: Somebody had to account for the fourth floor at seven o’clock. Dettweiler might, at the Automat.
  >
  > After: Dettweiler might know about the fourth floor, and about seven o’clock. She was still in front of me.

  Nobody who is present is sent for, whether they are the one being asked (`BRIDGE_TALKING`) or somebody else in the room (`BRIDGE_HERE`, "Broadnax was right there.").
- **"It was theft, and it was not murder."** This is item 1 above. The disqualifier's generator sentence no longer reaches the page.

**What the writers asked the engine for** (26-decks-ae-notes, "Slots and tags the engine does not supply"):

| ask | done |
|---|---|
| A tier gate on thought cards | Yes. `thought` has a new optional tag `band`: `teach` is dealt only where `verdictsOn` (Raw, Coddled, untiered), `play` only from Poached up, and `any` (the default) everywhere. This is the note deck's word for the same thing. |
| `polarity` on telling frames | Yes. The new optional tag `polarity` (`seen` / `unseen`) is read off the told sentences: "I saw…" or "was here" for `seen`, "wasn’t" or "Not…" for `unseen`. |
| Met, or only named | Yes. The new optional tag `met` (`yes` / `no`) applies to `view` × `known`. `viewOf` passes whether he has met them on an earlier page. |
| `{He}` in telling frames | Yes, `{He}` for the subject and `{They}` for the witness. |
| `{name}` on carry | No. Carry has a `{name}` only when a person sent him, and the 50 cards are about that person ("On {name}'s word…"). On a hunch or a search there is nobody to name, so the fix is lead cards without `{name}`. |
| answer / thought slots | Covered under item 7 above. |

## The reader lint's new rules

| rule | what it catches | `main` | this branch |
|---|---|---:|---:|
| `anchor-restated` | a sentence naming an anchor with an hour of it already told tonight. The window thought's reasoning and a fact put in a confrontation are not counted. Tiered cases only. | 189 | 0 |
| `question-family` | an ask-person line tagged `who` before a movements telling, or `where` before a knowing one | 160 | 0 |
| `stacked-sight` | a presence sentence with the relation and "a man in his fifties" | 137 | 0 |
| `placeholder-question` | the `{topic}` ask-person placeholder for a topic that names nobody | 122 | 0 |
| `search-thought-name` | a search thought naming a person its find did not (the victim only for last-seen / seen-after) | 58 | 0 |
| `verdict` | from Poached up: "was out of it", "That cleared X", "crossed X off", "closed the door on X", "I let X go", … | 0 (12 before PR #41 rewrote the dead-end cards) | 0 |
| `two-places-once` | "at the Automat once and here once" | 10 | 0 |
| `unfilled-slot` | a `{slot}` printed | 0 | 0 |

These are counted over 560 runs: seeds 1–40 × Raw…Hard-boiled and untiered, each played by the oracle and the wanderer. The `main` column is `main` at a06aa62 (PRs #40 and #41 in), read by this branch's lint. `main` has no `asks` tag, so `question-family` there counts the same six lines this branch tags `who`. The existing rules are also 0 on this branch. The M10 test (40 seeds × every tier) and the shorter-nights test run the lint with every rule.

## Checks

- **Tests:** 46 files and 860 tests, all passing, on the branch with PRs #40–#42 merged in. `npx tsc --noEmit` is clean. `test/engine-prose.test.ts` (11 tests) covers each fix on the read-through runs.

- **Correspondence:** 0 violations from the engine on every sweep in the tests, including `test/engine-prose.test.ts` over the four read-through runs and their wanderers. Every new sentence takes its names and hours from the clue's facts. "The hour I already had" names no hour.
- **Beat coverage:** 100% in every sweep. M8 sweeps: 5,455 of 5,455 night pages (30,285 of 30,285 required beats). M10: 2,952 of 2,952. M9: 1,299 of 1,299, with 273 confrontations. M10 correspondence: 0 violations, and 2 hours in a generator's own sentence (the known pair from docs/23, counted apart as before).
- **Plain terms:** `npm run decks` finds 0 errors and 0 banned terms. `test/plain-terms.test.ts` passes.
- **Design test:** unchanged. The table from `npx tsx scripts/diagnose-play.ts --design` (100 seeds a config) is the same line for line on `main` and on this branch:

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


## check-grid (coordinator's item)

`node scripts/check-grid.mjs --seed 3` failed on `main` with "Grasso at ten shows 1 sources, wanted 2". The expectation was stale. The grid had not lost a source. On seed 3's oracle route the notebook holds exactly one fact for Grasso at ten, Kreuzer's "not at the third floor" (c105). Grasso's own account is not on the route, so nothing else sits in that cell (`gridFrom` on the route gives one entry).

The script now reads the expected count off the cell. `src/ui/grid-view.ts` gives each cell a `data-sources` attribute: the number of distinct sources its detail quotes, from the grid model. The script checks that the detail shows exactly that many, and at least one. It passes at 1280 and at 390 against this branch served by vite (`grassoSources: 1`, pencils kept after a reload).

## Where I judged

1. **"Told, not printed" is for the finds that are statements.** A lease assignment, an IOU or a clipping is a thing in the room. The page says it in the past tense, as the golden's page 3 does. Only the disqualifier ("The bank confirms…") and the hour written down ("…was at half past seven") are statements about the night, and those are what the read-through quoted.
2. **Why a Hard-boiled secret gets a thought about a lie with no "if you asked him".** The thought is conditional: "If Brennan told me he was somewhere else then, this was why". From Poached up the page never states a contradiction, so it cannot say "his account was a lie". That holds whether or not his account is in hand.
3. **The victim in a search thought.** The rule covers the one the thought is about: the subject, the one who saw it, the second person, and the victim only where the thought places the victim (last-seen / seen-after). "It did not explain Renfro" would name the victim as a comparison. The engine's own lines avoid even that ("no answer to the disappearance").
4. **The window thought may name the anchor's hour.** The golden's own page 2 does: "If it happened at ten, it happened under the train." That is reasoning about when, not the hour told again, so the lint skips the window thought. A confrontation that reads a fact back is also skipped, because it is the fact put to them.
5. **Recurring anchors.** When the night has told one of a wagon's three rounds, a find of all three says only the two it adds, and the thought says it doesn't know which time. When all of them are told, the thought says so.
6. **Nameless topics go to the place and thing lines.** Lines that presume the witness was at the place (`presumes: there`) are held back from somebody not posted there. Lines that presume the thing is in hand (`presumes: held`) are held back for a topic that only names it. "Tell me about the key." is now the object line and no longer the placeholder, with the same words.

## Not fixed (and for the writers)

Engine-side, left alone:

- **The untiered game's anchor marks** are generator sentences: "Lathrop still carried it: a wet patch down one side of a coat. The ice being brought in was at half past eight, at Dolan’s." On one search page they say the anchor's hour three times (seed 14, untiered). The `anchor-restated` rule is limited to tiered cases for this reason. A fix would rewrite the marks from their facts, as `finds.ts` does for timing.
- **The scene report can state an anchor's hour that the notebook does not hold as a fact.** Medium, seed 3: "The whistle went off the river at half past eight". The logic's `anchorAt` goes to `anchors[1]` (`src/gen/logic/rules.ts`), which is not always the anchor the sentence names. The engine now treats the hour as told. The generator fix would move facts and the solver, so the design test, and is not in this pass.
- **A witness's timing telling lists every hour of a recurring anchor**, including one the night has told ("That was at half past six, half past eight and half past ten"). It is an answer to a question, and it names no anchor in its sentence.
- **The left-alone line** comes after the first find, before that find's thought. That is golden page 3's order, but on a three-find search it sits between a find and its thought.
- **The rhythm pass** now puts "I let it sit." on the end of a client's portrait paragraph when the pause line cannot take it (seed 3, Medium, page 1).

For the writers (cards I did not edit). PR #41 has already fixed the filler tails and groundings (grd-081, tai-013…068), the "lead" answers and the verdict dead-ends, so those are not listed. What is still open:

- **thought** `touches timing` (tht-m018…m020) all restate `{time}`, which the find or telling has just said. The engine now writes this thought itself. Cards written without `{time}` would be dealt again.
- **thought** `dead-end` is dealt only where a verdict may be given (untiered, or Raw and Coddled once two facts agree). From Poached up the engine's `explained` line stands in. With PR #41's rewrite those cards are no longer verdicts, so a `band: any` pass on them would let them back into every tier.
- **thought** `absent` has a card that prints "I would want to hear where Zeldin says Zeldin was." (seed 7, page 9), which uses the present tense and the name twice.
- **hours** "Somewhere in the building a clock struck four." has no `setting` tag. The engine keeps it off outdoor places, as it now does for any card that says "the room".
- **place-ambient / hours:** "A milk wagon went by in the street" (seed 7, page 9, 2:15 AM) on a night whose anchor is the milk wagon. Anchor-bearing texture could be tagged so it is held back when that anchor is the case's.
- **bridge** `tie=time` cards all carry `{tie}`, the window's hour. For an anchor subject the engine writes its own line. For a place subject ("Somebody had to account for the Hallam at seven o’clock") the card works but is thin. "Rafferty was next." reads oddly when he is already talking to Rafferty. The engine adds "I wasn’t done with Rafferty yet.", but a `present` rung would read better.
- **dashiell-lines:** the ask-place lines tagged `presumes: there` are most of that kind. More place questions that presume nothing would widen what the engine can deal to a witness who was not there.
- **The new tags** (`band` and `met` on thought, `polarity` and `{He}` / `{They}` on telling) are read by the engine but carried by no card yet.

## Read-through

Each run was rendered after the last change with `npm run read -- --seed N --tier T --no-choices`, and I read each one page by page. What read wrong and was engine-side is fixed above. The rest is under "Not fixed". The runs are given in full below, the notebook, report and closing page included.

### Seed 5 at Soft-boiled

```
DASHIELL · case 5 · difficulty 2 · Gramercy
Soft-boiled (4 suspects, 4 places, 1 secrets, coroner 1h, par 6–11) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 8, budget 13 (generator: 7/12), 73 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: sleepless, none, cold night.
  The office: two rooms over a Chinese laundry on Irving Place.
  Knows nobody in this neighbourhood.

  TEMPER
    Doyle         yap     a dentist with a chair and a waiting room
    Vitale        plain   a seamstress
    Whitfield     enigma  a society columnist
    Cheatham      plain   a doorman at a club with no sign on it
    Fairbanks     yap     the man behind the counter
    Ellery        plain   the bartender

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. Two rooms over a Chinese laundry on Irving Place, Gramercy. I had
no plans for bed and had stopped pretending otherwise, and I kept the lamp
burning for the company more than the light. A woman came up the stairs
after midnight.

Whitfield stood a moment inside the door with a pair of gloves in one hand
and waited to be told where to sit. She wore a fur collar worn thin in a
single patch at the throat, smaller than a thumbprint, from her own hand
going there whenever the talk turned hard. It went there twice while she sat
with me.

Hattie Whitfield was in her twenties. She did not lean back.

“Sit down.”

“I keep a card index. Everybody in it is worth a paragraph. Pasquale Moretti
is dead.”

“He was thirty years in the trade and is still owed by people who left it,”
she said. “He was found dead at the suite, and that is where it happened.”

“The coroner puts it between seven o’clock and half past seven, and will not
come closer than the hour. Doyle found him at the suite at half past
eleven.”

“The precinct came, walked through it, and went. I am a witness against the
people he worked for.”

“I am due before the grand jury about his people. The date is set. I cannot
put it off.”

“You think somebody will put it on you.”

“I want it established that it was not me, and I want it done before anybody
says otherwise,” Whitfield said. “That is all I want. I know how it looks. I
was near enough to it that night, and I would rather say so first.”

Neither of us spoke.

“Who had a reason to want Moretti out of the way?”

“Start with Vitale. She was in and out of there all week.” That was the
whole of it. I took a hundred dollars and didn't ask for more explaining
than I'd been given.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 348 words]

the suite                                             12:35 AM   page 2
────────────────────────────────────────────────────────────────────────────

Whitfield had pointed me here. I wanted the room gone through, corner to
corner.

The cold cut through, and the block had emptied early because of it. Every
stoop light was out but the one over the door. You reached the suite by an
elevator that ran on its own schedule, or by the stairs if you didn't want
to wait on it. The hotel kept no doorman this far from the lobby. Past
midnight the floor was silent enough to hear a window rattle in its frame.
Nobody kept watch there, and nobody ever had. The police had come and gone.

Moretti was still on the floor where he had fallen. Nobody else was there.
The cigarette left going burned itself out on the sill where it fell. The
singing under the window stopped at half past seven, when the shoe came
down.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death between seven o’clock and half past seven. One
bullet below the sternum. Powder burns on the shirt front: fired close.

Moretti would have been dead by about half past seven. That was the latest
it could have been. It was a gunshot, then. Whoever it was had to open the
drawer and take the gun first.

[1 action, 2 written down, 219 words]

the suite                                             1:15 AM   page 3
────────────────────────────────────────────────────────────────────────────

No one had told me to. I searched it just the same.

The nearest clock I could see said it was past one. I took the sitting room
in a slow circle, desk and sideboard and the low shelves under the window.
Then I went through the bedroom, dresser and wardrobe and nightstand, and
did the bathroom cabinet last. Somebody here had written down the drunk
singing under the window as well, at the hour I already had.

A silver cigarette case was there, and a camel-hair overcoat on a hook. I
left them both where they were for now.

There was a subpoena naming Moretti before the grand jury, with Cheatham’s
name written in the margin. Cheatham was going to testify against the people
Moretti worked for.

That gave Cheatham a reason to want Moretti gone.

The rug was rucked up under Moretti and the chair beside it went over
backwards. Nothing was carried out of the room.

Nothing of value was gone from the suite. It was Moretti they had come for.

[1 action, 3 written down, 174 words]

the speakeasy                                         1:50 AM   page 4
────────────────────────────────────────────────────────────────────────────

I came to ask Whitfield about Doyle.

The cold had cleared most of the block out early. A last stubborn pair stood
outside the speakeasy, not talking. The speakeasy was an illegal bar under a
hat shop, down six steps and through a door you had to knock on. At this
hour most of the stools were empty.

Ellery was rinsing glasses in a basin, setting them out to dry. He was the
bartender, a man in his twenties.

Whitfield was ordering without looking at the menu. Her hand went to the
worn place on the fur collar again.

It was Whitfield, who had hired me. I wondered what brought a client out
this late. Ellery saw everyone who came to the bar, and remembered who drank
alone.

[1 action, 128 words]

the speakeasy                                         2:30 AM   page 5
────────────────────────────────────────────────────────────────────────────

A fire engine went by a few streets over, its bell going. It was after two.
Whitfield stopped ordering and looked up as I came over. “Moretti had a
tenant,” I said. “Doyle.”

“The dentist with a chair and a waiting room.”

“Where was Doyle tonight?”

Whitfield said it flatly. “I saw her at Zelinsky’s at half past seven. I
know her to look at, and I know who she is.”

I wrote that down. That put Doyle at Zelinsky’s at half past seven, if it
held, and that was inside the hours that mattered. Somebody had seen her.
That was a better kind of fact than most I had.

“Anything more?”

Whitfield said it and then said nothing at all. “Doyle was steady at nine
and shaking at seven. It wasn’t nerves about the police. I wouldn’t tell you
if I wasn’t sure.”

Doyle had a secret, then. People with secrets lie about their evenings,
whatever the secret is.

“Your turn. Where did the evening take you?”

Whitfield gave it to me short. “I was at the El platform at six o’clock.
Then Zelinsky’s, from half past six until half past seven. From eight until
half past I was here. I’m telling it the way it happened, in order.”

I had Whitfield’s evening now. The next thing was somebody who had seen any
part of it.

Vitale was still a question, and Whitfield was the one to ask. Whitfield was
still in front of me.

[1 action, 3 written down, 246 words]
[gap: no-fact: overheard (c020) states nothing structured; its own line stands]

the speakeasy                                         3:05 AM   page 6
────────────────────────────────────────────────────────────────────────────

I checked my watch: after three. I turned back to Whitfield. “Moretti had a
former employee. Vitale.”

“The seamstress.”

“Where was Vitale tonight?”

Whitfield gave it to me in pieces. “I saw her at Zelinsky’s from half past
six until seven. At eight o’clock she was here. I know who she is. It was
her.”

I wrote that down. Seven o’clock was one of the half hours that mattered,
and now Vitale was somewhere in it: Zelinsky’s, if it was true.

Vitale hadn’t given me an evening yet, and Vitale was at the El platform.
The first thing I asked would bring it.

[1 action, 1 written down, 103 words]

the El platform                                       3:40 AM   page 7
────────────────────────────────────────────────────────────────────────────

I came for Vitale’s evening. And there was the other thing.

The cold had the street to itself. A newsboy’s stack sat unguarded under a
lamp, weighted down with a brick. The El platform sat exposed to the street
below on every side, a bench or two and a set of tracks running through the
middle of it. No one watched who used it, day or night. At this hour there
was hardly anybody on it to watch.

Vitale was standing out of the wind, hands in pockets. She was a seamstress:
a woman in her forties.

Vitale was in the notebook already, and now Vitale was here.

[1 action, 108 words]

the El platform                                       4:20 AM   page 8
────────────────────────────────────────────────────────────────────────────

Whitfield had raised Vitale’s name. I meant to ask Vitale about Moretti
myself.

It was past four, and later than I liked. Vitale looked up as I came over.
“Was Moretti about tonight, that you saw?” I asked.

“I know him,” Vitale said. “I saw him at Zelinsky’s at six o’clock. He was
there again at seven o’clock. We’ve said hello often enough. I know him.”

I wrote that down. If the coroner was right, it happened at half past seven.
Everybody’s evening would have to be held up against that.

“And your own evening? Walk me through it.”

Vitale didn’t mind being asked. “I was at Zelinsky’s from six until seven.
Then the speakeasy, from half past seven until eight. At half past eight I
was here. I could tell it to you again the same way. I didn’t expect anybody
to ask about it.”

It was Vitale’s side of the night Moretti died. There would be other sides.

Vitale could tell me something about Whitfield’s evening. I wasn’t done with
Vitale yet.

[1 action, 2 written down, 174 words]

the El platform                                       4:55 AM   page 9
────────────────────────────────────────────────────────────────────────────

I turned back to Vitale. “Whitfield was going to testify against the people
Moretti worked for.”

“The society columnist.”

“Where was Whitfield tonight?”

Vitale placed the name without any trouble. “I saw her at Zelinsky’s at half
past six. At eight o’clock she was at the speakeasy. When the ice came, she
was at Zelinsky’s. I saw it with my own eyes.”

I got it down on paper. It hung on the ice being brought in. Once I knew
when that was, I would know when Whitfield was at Zelinsky’s.

[1 action, 1 written down, 90 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 4:55 AM, 5 of 13 left. 13 of 73 things written down.

PEOPLE
  Moretti, a retired cloth wholesaler — the victim
    on sight: Moretti was thirty years in the trade and is still owed by
    people who left it. Moretti is a man. He is in his sixties.
    from others: Doyle found Moretti at the suite at 11:30 PM.
    · 6:00 PM — at Zelinsky’s (Vitale)
    · 7:00 PM — at Zelinsky’s (Vitale)
    · 7:30 PM — at the suite (the suite)
  Doyle, a dentist with a chair and a waiting room (Zelinsky’s)
    on sight: Doyle is a woman. She is in her forties.
    from others: Moretti put Doyle’s rent up twice in a year and Doyle paid
    it twice.
    · 7:30 PM — at Zelinsky’s (Whitfield)
  Vitale, a seamstress (the El platform)
    on sight: Vitale is a woman. She is in her forties. Vitale is a
    seamstress.
    says: 6:00 PM–7:00 PM Zelinsky’s; 7:30 PM–8:00 PM the speakeasy; 8:30 PM
    the El platform
    · 6:30–7:00 PM — at Zelinsky’s (Whitfield)
    · 8:00 PM — at the speakeasy (Whitfield)
      “ Vitale saw Moretti at Zelinsky’s at 6:00 PM and at 7:00 PM.
      “ Vitale says she was at Zelinsky’s from 6:00 PM to 7:00 PM; then the
      speakeasy from 7:30 PM to 8:00 PM; then the El platform at 8:30 PM.
      “ Vitale saw Whitfield at Zelinsky’s when the ice came. Vitale saw
      Whitfield at Zelinsky’s at 6:30 PM. Vitale saw Whitfield at the
      speakeasy at 8:00 PM.
  Whitfield, a society columnist — our client (the speakeasy)
    on sight: Whitfield is a woman. She is in her twenties.
    says: 6:00 PM the El platform; 6:30 PM–7:30 PM Zelinsky’s; 8:00 PM–8:30
    PM the speakeasy
    · 6:30 PM — at Zelinsky’s (Vitale)
    · 8:00 PM — at the speakeasy (Vitale)
      “ Whitfield hired us, and wants it known that Vitale was in and out of
      there all week, and would rather we started there.
      “ Whitfield saw Doyle at Zelinsky’s at 7:30 PM.
      “ Whitfield on Doyle: Doyle was steady at nine and shaking at seven,
      and it was not nerves about the police.
      “ Whitfield says she was at the El platform at 6:00 PM; then
      Zelinsky’s from 6:30 PM to 7:30 PM; then the speakeasy from 8:00 PM to
      8:30 PM.
      “ Whitfield saw Vitale at Zelinsky’s from 6:30 PM to 7:00 PM.
      Whitfield saw Vitale at the speakeasy at 8:00 PM.
  Cheatham, a doorman at a club with no sign on it (Zelinsky’s)
    on sight: Cheatham is a man. He is in his thirties. Cheatham is a
    doorman at a club with no sign on it.
  Ellery, the bartender (the speakeasy)
    on sight: Ellery is a man. He is in his twenties. Ellery is a bartender.

PLACES
  Zelinsky’s — semi, watched by the counterman — not been
  the speakeasy — semi, watched by the bartender
  the suite — private, unwatched
      “ Moretti was found at the suite. The cigarette left going burned
      itself out on the sill where it fell. The singing under the window
      stopped at 7:30 PM, when the shoe came down.
      “ The coroner puts death between 7:00 PM and 7:30 PM. One bullet below
      the sternum. Powder burns on the shirt front: fired close.
      “ The drunk singing under the window was at 7:30 PM.
      “ Found at the suite: A subpoena naming Moretti before the grand jury,
      with Cheatham’s name written in the margin.
      “ The rug at the suite is rucked up under Moretti and the chair beside
      it went over backwards. Nothing was carried out of the room.
  the El platform — public, unwatched
  the office — private, unwatched

LEADS
  Nothing open.

ESTABLISHED
  time of death: 7:30 PM
  method: a gunshot
  motives: Cheatham — needed a witness silenced
  near the weapon: Vitale, Whitfield
  accounted for: nobody yet

THE REPORT
════════════════════════════════════════════════════════════════════════════

  Who killed Moretti        Cheatham                    ✓
  How                       a gunshot                   ✓

  2 of 2 · solved · 8 actions against par 8

The DA reads it twice and does not find anything to argue with. Cheatham
killed Moretti at the suite, 7:30 PM, and the jury takes ninety minutes over
lunch.

Cheatham hangs in the spring. I am told it rained. 2 out of 2, and 8 calls,
which is exactly what the night was worth.

I closed it with Cheatham guilty and proven so, and the night's last hour to
spare. It was enough.

HOW IT COULD BE KNOWN
════════════════════════════════════════════════════════════════════════════

Who: Cheatham was the only one who could have been at the suite when it
happened.
    · Moretti: Zelinsky’s, 6:00, 7:00. Moretti was alive until at least
    7:00. Vitale saw him.
    · Whitfield: Zelinsky’s, 6:30; Zelinsky’s, when the ice being brought in
    happened; the speakeasy, 8:00. Whitfield could have got hold of it.
    Vitale saw her.
    · Doyle: Zelinsky’s, 7:30. Whitfield saw her.
    · Vitale: Zelinsky’s, 6:30–7:00; the speakeasy, 8:00. Vitale could have
    got hold of it. Whitfield saw her.
    · Vitale says: Zelinsky’s, 6:00–7:00; the speakeasy, 7:30–8:00; the El
    platform, 8:30.
    · Whitfield says: the El platform, 6:00; Zelinsky’s, 6:30–7:30; the
    speakeasy, 8:00–8:30.

When: It happened in the half hour from 7:30.
    · Moretti: Zelinsky’s, 6:00, 7:00. Moretti was alive until at least
    7:00. Vitale saw him.

WHAT REALLY HAPPENED
════════════════════════════════════════════════════════════════════════════

I can tell it now, start to finish. It was Isaiah Cheatham who killed
Pasquale Moretti.

Moretti was a retired cloth wholesaler. That was how the neighbourhood knew
him. He was thirty years in the cloth trade, and people who had left it
still owed him money. Moretti sold the warehouse in ’24 and lived on the
money after that. Anybody on the block would have told you Cheatham was a
doorman at a club with no sign on it. Cheatham had given a statement about
the people Moretti worked for and had been careful ever since. He needed
Moretti to keep quiet in front of the grand jury. Moretti had told Cheatham
that somebody who testifies sleeps better.

Cheatham was at Zelinsky’s at half past six, and the nickel-plated revolver
went out of the drawer with him. The drawer was left open, with the oiled
cloth still in it. From there Cheatham went straight to the suite, and was
there by seven o’clock. Moretti came in at half past seven, half an hour
later. Before that, at seven o’clock, Moretti was at Zelinsky’s.

When it happened, it was half past seven, just as the singing stopped.
Nobody else was with them. Cheatham shot Moretti once, below the breastbone,
close enough to burn the shirt.

From eight o’clock until ten o’clock, Cheatham was at Zelinsky’s. By half
past ten he had moved on to the El platform. After that he was at
Zelinsky’s, from eleven o’clock until half past eleven.

Moretti was found at half past eleven, at the suite, by Doyle. By then
Moretti had been dead for four hours. A policeman walked through, looked,
and went.

Nothing else that happened that night had anything to do with it.

9 pages · 1590 words · 177 a page · 8 actions spent · 1 fallbacks
```

### Seed 7 at Hard-boiled

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

“Still here, Dashiell,” Weisglass said, and took the chair without waiting
to be offered it. A fine white dust sat in the creases of her knuckles,
plaster rather than flour, the kind that gets into the skin over a long day
and does not fully wash out by morning.

Minnie Weisglass was a woman in her thirties. She sat straight and stayed
that way.

“I am listening.”

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

“Start with Dettweiler. She wanted Renfro out of the lease and the lease in
her name. You remember how I work,” Weisglass said. I remembered. I took
twenty dollars the way I always had from her.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 319 words]

the subway kiosk                                      12:20 AM   page 2
────────────────────────────────────────────────────────────────────────────

Weisglass had sent me. I came to search the place.

Fog softened the streetlamps to a string of pale rings. Nobody was about,
and every railing I touched was beaded with damp. The subway kiosk threw a
little iron shadow over the stair going down. Nobody watched who came up it
or went down it, day or night. At this hour hardly anyone used it.

There was no sign of Renfro, and nobody had expected one.

Renfro was not at the subway kiosk and had not been since that evening. The
room was left tidy and the bed was not slept in. The milk wagon was at the
corner at half past eight, where the driver’s round put him every night.

Nobody could put it closer than between seven o’clock and half past eight.
The precinct took a statement and filed it. A grown person was allowed to go
where they like.

If it was a train out, and the timetable it was read off, somebody had to
read the departures off the wall: Renfro, or whoever took Renfro.

Alfano would know when the milk wagon on its rounds came by. He was the man
behind the counter at the Automat.

[1 action, 2 written down, 201 words]

the fourth floor                                      12:40 AM   page 3
────────────────────────────────────────────────────────────────────────────

Nobody had mentioned the fourth floor. I went to see what was there.

Fog sat low over the row houses, blurring the streetlamps to smears.
Somewhere a window sash went down. The fourth floor was in the ordinary kind
of building: walk-up, no elevator, a super who lived in the basement and
kept odd hours. By this hour the halls had gone still, and the traffic in
the street had thinned to almost nothing. No clerk, no doorman, nobody
behind a counter: nobody saw who came.

I had the fourth floor to myself. It ran out there.

[1 action, 97 words]

the fourth floor                                      1:00 AM   page 4
────────────────────────────────────────────────────────────────────────────

Nothing I had found pointed here. I searched on a hunch.

Somewhere a baby was crying, and nobody was hurrying to it. It was past one.
I went along the walls first, the baseboards and the shelves, then the table
and the chairs around it. After that I did the kitchen, the sink and the
cupboards, and came back to the middle of the room last. There was a lease
assignment made out in Dettweiler’s name, waiting only on Renfro’s
signature.

A black-lacquered cash box was there, and a framed photograph. I left them
both where they were for now.

Dettweiler wanted Renfro out of the lease and the lease in Dettweiler’s
name. It was not proof of anything, but it was a reason.

There was an IOU for $4,000 signed by Brennan, Renfro’s brother-in-law, made
out to Renfro, three months past due.

That was motive, plainly: Brennan owed Renfro four thousand dollars and was
past due on it.

The register had a room paid for at nine o’clock, cash, a week in advance,
in a name nobody at the desk could read back.

Somebody had been at the fourth floor at nine o’clock. Who, it didn’t say.

[1 action, 3 written down, 198 words]

the fourth floor                                      1:00 AM   page 5
────────────────────────────────────────────────────────────────────────────

I wasn’t through with the fourth floor yet.

I went on from where I had left off. In the back of a drawer was a bank book
in a name that was not Brennan’s, kept in Brennan’s hand: two hundred
dollars a month for a year. It had Brennan here at eleven o’clock. Four
floors down, the avenue still carried the odd taxi, and its tires drummed on
the cobbles in the stretch outside the building.

That was Brennan’s secret, then: embezzling from an employer. It was a
reason to lie about the hour, and no answer to the disappearance.

[free, 1 written down, 100 words]

Kaplan’s                                              1:15 AM   page 6
────────────────────────────────────────────────────────────────────────────

Weisglass had said as much. I had come to ask Zeldin about Dettweiler,
nothing more. Zeldin owed Renfro money.

The fog muffled everything down to almost nothing, just the click of my own
heels on the stone. Kaplan’s kept a soda fountain running most of the day
and a light on well past it. You could get in through the front, the only
door the shop had.

Prentiss was wiping down the soda fountain with a damp cloth. He was the
druggist: a man in his fifties.

Zeldin, a man in his fifties, was reading a folded newspaper by the light
that was there.

Zeldin already had a part in this somewhere. That was worth a few minutes.
Whoever came through for a paper or a headache powder, Prentiss rang them up
and remembered.

[1 action, 134 words]

Kaplan’s                                              1:35 AM   page 7
────────────────────────────────────────────────────────────────────────────

Zeldin stopped reading a folded newspaper by the light that was there and
looked up as I came over. “Renfro had a neighbour across the airshaft,” I
said. “Dettweiler.”

“Lotte Dettweiler.”

“Where was Dettweiler tonight?”

Zeldin thought about it for a moment. “I saw her at the fourth floor at
eight o’clock. At half past eleven she was here.” He wasn’t finished. “While
the milk wagon was in the street, she was at the Automat. Another time, she
was here. I know her by name and by sight. Both.”

I got it down on paper. That put Dettweiler at the fourth floor at eight
o’clock, if it held, and that was inside the hours that mattered.

“Let’s have yours now. Where were you?”

Zeldin told it simply. “I was at the Hallam with Lotte Dettweiler at seven
o’clock. Then the Automat, at half past seven. Then the fourth floor, at
eight o’clock. Then the Hallam, from half past eight until nine. At half
past nine I was here. Ask me again tomorrow and you’ll get the same answer.”

Zeldin had told me where the evening went. Whether anybody else would say
the same was another matter.

Zeldin’s evening still had gaps in it. Whitfield might fill one. He was the
elevator man at the Hallam.

[1 action, 2 written down, 215 words]

the Hallam                                            1:55 AM   page 8
────────────────────────────────────────────────────────────────────────────

Whitfield would know about Zeldin.

The fog had come in off the river and settled between the buildings. I could
see the door and not much past it. The Hallam kept a night bell in the
vestibule for callers after the desk had closed. At this hour it rang
rarely, and everyone in the building knew it when it did.

Whitfield was oiling the hinges of the gate from a small can, working it
back and forth. He was the elevator man, a man in his thirties.

Weisglass was waiting, and had been for a while. She rubbed at the white
dust in her knuckles again.

Weisglass was the client. Clients kept their own hours, and I let them.
Whitfield ran the elevator and saw every floor anybody wanted.

[1 action, 129 words]

the Hallam                                            2:15 AM   page 9
────────────────────────────────────────────────────────────────────────────

A milk wagon went by in the street, the bottles rattling in their crates. It
was after two. Through the glass of the street doors the avenue's signs
showed red and white, and the marble squares took a faint wash of their
colour. Whitfield stopped oiling the hinges of the gate from a small can and
looked up as I came over. “Zeldin owed Renfro money,” I said.

“Sol Zeldin.”

“Where was Zeldin tonight?”

“He wasn’t here. Not once all evening. I know who lives here. It’s part of
the job.”

I wrote it down. If Zeldin was not at the Hallam at seven o’clock, I would
want to hear where Zeldin says Zeldin was. That was one place he wasn’t. It
left a good many places he might have been.

Somebody had to account for the Hallam at seven o’clock. Whitfield was the
one to ask. I wasn’t done with Whitfield yet.

[1 action, 1 written down, 153 words]

the Hallam                                            2:35 AM   page 10
────────────────────────────────────────────────────────────────────────────

The Hallam had come up, and I wanted to hear about it from Whitfield.

I wasn’t finished with Whitfield. “Who came in tonight, and when? Start at
the top.”

Whitfield went through it in order. “At six o’clock it was Lotte Dettweiler,
and nobody with her. Nobody came in from seven until eight. One at half past
eight. Nobody came in from nine until half past. One at half past ten. One
at half past eleven. I run the car all night. I see who rides.”

I wrote that down. Whitfield kept the Hallam, and at seven o’clock nobody
came in but the ones Whitfield named. It was a short list.

“Did you see anybody tonight you didn’t know?”

Whitfield thought about the faces. “A man in his fifties at half past six.
Then a man at half past eight. I knew the faces. Not one of the names.
People ride up and ride down. Nobody introduces himself.”

Whitfield had seen a man in his fifties at the Hallam at half past six, and
had no name to give me. The description would have to wait for one.

[1 action, 8 written down, 188 words]

the Automat                                           2:55 AM   page 11
────────────────────────────────────────────────────────────────────────────

Zeldin gave me the reason. I had one question for Dettweiler: the evening,
start to finish.

Fog off the river had swallowed the street a block away. A foghorn sounded
once, a long way off. The Automat never closed, so its window stayed lit
when most of the block had gone dark. Rows of small glass compartments lined
the walls, half of them empty of whatever they had held earlier. At this
hour the room held more chairs than people.

Alfano was restocking a shelf, checking each item against a list. He was the
man behind the counter, a man in his forties.

Dettweiler was smoking under the nearest light. She was a tailor, a woman in
her thirties.

Brennan, a man in his thirties, was checking a pocket watch against the
street clock.

Broadnax and a man I didn’t know were feeding nickels into the slots along
the wall, choosing sandwiches one at a time.

Dettweiler was one of the names I was carrying around tonight. Now I could
add to it. A counterman saw every face twice, coming and going, and Alfano
was no different.

[1 action, 187 words]

the Automat                                           3:10 AM   page 12
────────────────────────────────────────────────────────────────────────────

It was past three. A dog was barking somewhere, a long way off. Dettweiler
looked up when I sat down. “Zeldin owed Renfro money,” I said.

“Sol Zeldin.”

“Where was Zeldin tonight?”

Dettweiler had plenty to say, and started at once. “I saw him here at half
past six. At eight o’clock he was at the fourth floor.” She went on. “At
nine o’clock he was here. At half past eleven he was at Kaplan’s. While the
milk wagon was in the street, he was at Kaplan’s. I know what I saw, and
what I didn’t.”

I wrote it in the book. So Zeldin had been at the fourth floor at eight
o’clock, if it held. That was an hour that mattered.

“Anything else I should hear?”

“Here’s what I know about it,” Dettweiler said. “Weisglass paid for a room
at the fourth floor at nine o’clock and went up with somebody who wasn’t
walking easily. The somebody had Renfro’s coat over one arm. I’d have no
reason to invent it. I could tell you more about this street than the street
would like.”

On its own it settled nothing about Renfro. I kept it for when something
else would.

“And yourself? Where did your evening go?”

“Let me see,” Dettweiler said, and then didn’t have to. “I was at the Hallam
with Sol Zeldin at seven o’clock. Then the newsstand, at half past seven.
Then the fourth floor, from eight until half past. From nine until half past
I was here. I can’t tell you about anybody else. I can tell you about me.”

It was a whole evening on Dettweiler’s say-so. That didn’t make it false. It
made it something to check.

Dettweiler might know about the fourth floor, and about seven o’clock. She
was still in front of me.

[1 action, 3 written down, 302 words]
[gap: no-fact: overheard (t002) states nothing structured; its own line stands]

the Automat                                           3:10 AM   page 13
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the milk wagon on its rounds. Alfano
might know about it.

He stopped restocking a shelf and looked up as I came over. “Do you know
when the milk wagon on its rounds was?” I asked.

Alfano knew me from before, and that saved us both some time.

He was sure of it, and said so. “That was at half past six, half past eight
and half past ten. It’s the kind of thing people set their evening by. It’s
about the only thing around here that’s on time.”

I wrote that down. Now the milk wagon on its rounds had its hours, and so
did anybody seen somewhere by it, if I knew which time.

The next question was Dettweiler, and it was for Alfano. I wasn’t done with
Alfano yet.

[free, 1 written down, 139 words]

the Automat                                           3:30 AM   page 14
────────────────────────────────────────────────────────────────────────────

Broadnax left off and looked up. “Renfro had a former employee,” I said.
“Weisglass.”

“I know who you mean. I know the face.”

Broadnax lowered his voice. “Weisglass blamed somebody for a ruin, and half
the block could've told you as much, if you'd asked around. I’m not
repeating gossip. This I know. People talk. I listen. It isn’t a crime.”

I wrote that down. So Weisglass blamed Renfro for the ruin of Weisglass’s
business. That was a reason, if Weisglass needed one.

“What about your own night? Start to finish.”

“Start to finish? All right,” Broadnax said. “I was here from seven until
eight. Then the Hallam, at half past eight. From nine until half past I was
here. Then the newsstand, from eleven until half past. I hadn’t thought
about it till you asked, but it’s all there.”

I wrote down Broadnax’s evening in the order it was told. Later I would put
it next to everybody else’s.

I wanted to know about Renfro around seven o’clock. Broadnax was the one who
might say. He was still in front of me.

[1 action, 2 written down, 183 words]

the Automat                                           3:50 AM   page 15
────────────────────────────────────────────────────────────────────────────

I wanted Broadnax’s word on Renfro before anything else.

I wasn’t finished with Broadnax. “Where did Renfro get to tonight?”

“Oh, I know him all right,” Broadnax said. “I saw him here from seven until
eight. At ten o’clock he was at the fourth floor. I was there. I saw it
myself. I don’t miss much. Some nights I wish I did.”

I got it down on paper. So there was a later sight of Renfro: the fourth
floor, at ten o’clock. The night had more in it than I thought.

[1 action, 1 written down, 91 words]

the Automat                                           4:10 AM   page 16
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the fourth floor. Dettweiler might know
it.

Somewhere a clock had gone past four. I had another question for Dettweiler.
“Who did you see tonight that you didn’t know?”

“I remember faces, even the ones I can’t name,” Dettweiler said. “A man at
the fourth floor at half past eight. I’d seen him around. I couldn’t give
you a name. I don’t know everybody. Nobody does.”

No name from Dettweiler, only a man. I wrote it down the way it was said.

[1 action, 1 written down, 89 words]

the newsstand                                         4:30 AM   page 17
────────────────────────────────────────────────────────────────────────────

Broadnax told me where to look. I wanted Ruggiero on the subject of Brauer,
Renfro’s creditor. Ruggiero was the news dealer at the newsstand.

It was still fogged in, though the shapes of things were starting to come
clear. A tugboat whistle sounded somewhere out on the river. You could reach
the newsstand from any direction, being a corner and nothing more. A single
bulb hung over the papers for the benefit of anyone reading headlines after
dark. Past midnight the stand was more habit than business.

Ruggiero was counting the unsold papers from the evening edition and tying
them up to go back. He was the news dealer: a man in his fifties.

Bernstein was swinging the nightstick on its strap, around and back. He was
the patrolman on the beat: a man in his twenties.

Whoever came by, Ruggiero had likely seen them coming.

[1 action, 146 words]

the newsstand                                         4:50 AM   page 18
────────────────────────────────────────────────────────────────────────────

The traffic light on the corner went on changing, red to green and back, and
its click was the loudest sound at the crossing. Ruggiero stopped counting
the unsold papers from the evening edition and looked up as I came over.
“Renfro had a creditor,” I said. “Brauer.”

“Konrad Brauer.”

“Where was Brauer tonight?”

Ruggiero knew who I meant. “I saw him here at nine o’clock. He was back at
half past eleven. While the milk wagon was in the street, he was here.”

“Any time you can say he wasn’t around?”

“Not here from six until eight or from half past nine until eleven. Selling
papers is mostly watching the street.”

I wrote it down. So Brauer might not have been at the newsstand at six
o’clock. It was worth remembering if Brauer ever claimed it.

[1 action, 1 written down, 137 words]

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

I wrote an address on a card and gave the card to somebody who had been
waiting a long while for it. Nobody was arrested and nothing was proved: a
person had gone somewhere, and by morning it was known where.

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

18 pages · 3008 words · 167 a page · 15 actions spent (1 waived) · 1 fallbacks
```

### Seed 3 at Medium

```
DASHIELL · case 3 · difficulty 2 · Little Italy
Medium (5 suspects, 5 places, 3 secrets, coroner 1h, par 8–14) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 12, budget 18 (generator: 11/17), 135 things to find

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

Hauck stood a moment inside the door with a pair of gloves in one hand and
waited to be told where to sit. She wore gloves new enough that a price tag
was still folded down inside one cuff, where a saleswoman had missed it, and
she had not noticed either, or had not cared to. I let it sit.

Ilse Hauck was in her thirties. She did not lean back.

“Sit down, then.”

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

She stopped there.

“What happens if it is settled loudly?”

“I want it settled quietly,” Hauck said. “If I wait, it gets settled loudly
instead. I am paying for two things. One is that it is found. The other is
that nobody hears about it.”

“Who would do that to Sirkin?”

“Start with Steinbach. Steinbach blamed Sirkin for the ruin of his
business.” Hauck said nothing after that, and I didn’t need more. A hundred
dollars sat on the desk between us until I put it away.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 338 words]

the walk-up                                           12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

Hauck set me on it. I came to give the room a proper going-over.

The cold had sent everybody indoors early. The front steps had a skin of
frost on them. You climbed to the walk-up by an outside stair fixed along
the rear wall, the kind landlords added when the front one got too crowded.
It smelled of the drugstore's syrups even three flights up. At this hour
nobody else on the stair was coming or going. There was nobody on duty, and
nobody to ask who had been by. The police had called it a fall and gone
home.

Sirkin lay where he had fallen. Nobody had covered him yet. There was nobody
else in the room. A glass was on its side and the spill had not yet reached
the edge of the table when it dried. The whistle went off the river at half
past eight, two long and one short, and the boat’s log had the hour.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death between eight o’clock and half past eight.
Chloral, a sleeping drug, in the stomach. No wound, no bruising, no sign of
a struggle.

If it held, it was over by about half past eight. What people did before
then counted. What they did after didn’t. If it was poison in a drink,
whoever did it had to get at the chloral and put it in the drink first.

[1 action, 2 written down, 249 words]

the walk-up                                           12:55 AM   page 3
────────────────────────────────────────────────────────────────────────────

Nothing I had found pointed here. I searched on a hunch.

I went through the kitchen end first, cupboard by cupboard, then the sitting
end with its one good chair and its table. Last I got down and looked along
the floorboards by the back stair. There was an IOU for $4,000 signed by
Crowninshield, made out to Sirkin, three months past due.

There was a strapped suitcase in the room, and a length of sash cord. I left
them both alone for now.

That was motive, plainly: Crowninshield owed Sirkin four thousand dollars
and was past due on it.

There was a typed page of dates and sums in Sirkin’s file, headed with
Marchetti’s name. Marchetti used to work for Sirkin.

She was about to be exposed by Sirkin. It was not proof of anything, but it
was a reason.

There was a clipping about the failure of Steinbach’s business, with
Sirkin’s name underlined twice in pencil.

Steinbach blamed Sirkin for the ruin of Steinbach’s business. People had
been killed for less.

Somebody had to account for the key at eight o’clock. Rafferty was the one
to ask. She was the landlady at the third floor.

[1 action, 3 written down, 197 words]

the third floor                                       1:20 AM   page 4
────────────────────────────────────────────────────────────────────────────

Rafferty would know about the key.

It was past one, and the night went on. The cold cut through, and the block
had emptied early because of it. Every stoop light was out but the one over
the door. You reached the third floor by a narrow stair that ran straight up
from the entry, past doors with nothing on them but a number. Past midnight
the building had settled into the particular quiet of people who all had to
be up early. It was the kind of place where a late caller got noticed,
whether or not anyone said so.

Rafferty was counting out coins from a rent envelope, stacking them by
denomination. She was the landlady: a woman in her forties.

Rafferty watched the door the way any landlady did, without appearing to.

[1 action, 135 words]

the third floor                                       1:45 AM   page 5
────────────────────────────────────────────────────────────────────────────

I wanted to hear what Rafferty knew about the key.

Rafferty stopped counting out coins from a rent envelope and looked up as I
came over. “Tell me about the key,” I said.

“Here’s what I know about it,” Rafferty said. “There has only ever been the
one key to the walk-up. It lives at the third floor. Marchetti had it off
the hook that evening. I don’t say a thing about my tenants unless I know
it. I could tell you more about this street than the street would like.”

I wrote that down. A way into the walk-up was something Marchetti had and
most people didn’t. It might mean nothing.

“And people you didn’t know? Anybody?”

Rafferty was pleased to have something to tell. “A woman under forty at ten
o’clock. I didn’t know her. If I don’t rent to somebody, I don’t know who
they are. Half the people through here I wouldn’t know again, and the other
half I’d rather not.”

Rafferty had given me a description and an hour: a woman under forty, at the
third floor at ten o’clock. A description fits more people than a name does.

People who are owed money keep track of the people who owe it. Vitale was
Sirkin’s creditor, and Rafferty could tell me about Vitale’s evening. I
wasn’t done with Rafferty yet.

[1 action, 2 written down, 225 words]
[gap: no-fact: overheard (t002) states nothing structured; its own line stands]

the third floor                                       2:15 AM   page 6
────────────────────────────────────────────────────────────────────────────

It had turned two. I wasn’t finished with Rafferty. “Sirkin had a creditor.
Vitale.”

“Carmine Vitale.”

“Where was Vitale tonight?”

Rafferty had plenty to say, and started at once. “I saw him here from seven
until half past. He was back at nine o’clock.”

“And the rest of the evening?”

“Not here. I hear every foot on those stairs, and I know most of them. I
notice more than people think I do.”

I got it down on paper. So Vitale might not have been at the third floor at
eight o’clock. It was worth remembering if Vitale ever claimed it.

Rafferty was next. The question was the third floor, around eight o’clock. I
wasn’t done with Rafferty yet.

[1 action, 1 written down, 119 words]

the third floor                                       2:40 AM   page 7
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the third floor. Rafferty might know
it.

I had another question for Rafferty. “Who came in tonight, and when? Start
at the top.”

“Not a busy night,” Rafferty said. “One came in at half past six. One at
half past eight. Two at nine o’clock. One at half past nine. At half past
ten it was Ilse Hauck, and nobody with her. I sit where I can see the door.
Nobody goes up without I know it.”

I wrote it in the book. Rafferty named who came into the third floor at half
past ten, and nobody else. Anybody else who claimed the third floor at half
past ten would have to explain it.

“Any strangers?”

Rafferty had noticed, and was pleased to have noticed. “A woman under forty
at half past six. Then a man in his thirties at half past seven and one from
half past eight until half past nine. One or two I knew by sight. None of
them by name. I don’t learn names off the backs of people’s coats.”

A woman under forty at the third floor at half past six, and no name to go
with it. Somebody in the case would fit, or nobody would.

[1 action, 9 written down, 210 words]

the speakeasy                                         3:05 AM   page 8
────────────────────────────────────────────────────────────────────────────

Hauck had sent me. The question was for Crowninshield, about Hauck.

By my watch it was past three, and the watch was usually right. The cold
kept the block empty and the glass fogged from inside. The speakeasy was the
only warm-looking storefront on the street. The speakeasy had no sign and
needed none: it sold liquor, and selling liquor was against the law. A
hallway from the street door ran back to the bar, dim on purpose. At this
hour the tables at the back were the ones still in use.

Hargrove was counting the bottles on the back shelf and writing the number
on a card. He was the bartender, a man in his forties.

Crowninshield, a woman in her forties, was waiting, and not for me.

Hauck was tapping ash from a cigarette without breaking a sentence. She
smoothed the new gloves again, the price tag still folded in one cuff.

Vitale and Marchetti were slumped in a booth by the far wall, their drinks
gone flat and their talk run down.

There was a page for Crowninshield in the notebook already, and room on it
for more. Nothing crossed that bar that Hargrove didn’t notice.

[1 action, 199 words]

the speakeasy                                         3:35 AM   page 9
────────────────────────────────────────────────────────────────────────────

Crowninshield left off and looked up. “Sirkin had a sister-in-law,” I said.
“Hauck.”

“The stockbroker who trades in the street.”

“Where was Hauck tonight?”

Crowninshield said it flatly. “I saw her here from half past eight until
ten. She was back at eleven o’clock. While the fight was on the radio, she
was here. She’s not somebody I’d take for somebody else.”

I wrote it down. Hauck at the speakeasy at half past eight. That was inside
the time the coroner gave, if the word was good.

“And you? Where were you tonight?”

Crowninshield gave it to me short. “I was at the subway kiosk at seven
o’clock. Then the third floor, at half past seven. From eight until half
past nine I was here. I’ve got a head for times. I always have.”

I wrote it down as Crowninshield told it. It was one person’s word about one
person.

Nobody had told me about Sirkin at eight o’clock yet. Crowninshield might.
She was still in front of me.

[1 action, 2 written down, 169 words]

the speakeasy                                         4:00 AM   page 10
────────────────────────────────────────────────────────────────────────────

I had a question for Crowninshield about Sirkin.

It was past four, and my eyes had started to sting. I wasn’t finished with
Crowninshield. “Tell me about Sirkin.”

Crowninshield knew the name, and said so with a nod. “I saw him at the
subway kiosk from six until seven. At half past seven he was at the third
floor. At eight o’clock he was here. I know his face and I know his walk.”

I wrote that down. Whoever did it had been at the walk-up at half past
eight. That was the time everybody would have to account for.

The next thing was Crowninshield’s evening, and Steinbach had some of it.
Steinbach was at the subway kiosk.

[1 action, 1 written down, 118 words]

the speakeasy                                         4:25 AM   page 11
────────────────────────────────────────────────────────────────────────────

What I had so far pointed at the speakeasy. Crowninshield was the one here
who would know it.

I turned back to Crowninshield. “Anybody come through tonight that you
didn’t know?”

Crowninshield said it to the counter more than to me. “A man in his thirties
from eight until half past, one at eight o’clock and one from half past nine
until eleven. Then a woman under forty from nine until half past. One or two
I knew by sight. None of them by name. A face was all I got. Nobody offered
me a name.”

I wrote it in the book. Crowninshield had no name for a man in his thirties.
Whoever it turned out to be had been at the speakeasy at eight o’clock.

[1 action, 4 written down, 126 words]

the subway kiosk                                      4:55 AM   page 12
────────────────────────────────────────────────────────────────────────────

Steinbach would know about Crowninshield.

Ice had skinned over the puddles in the gutter. A lone figure crossed fast,
breath trailing behind him. You reached the subway kiosk from any corner of
the intersection, the kiosk itself the only marker needed. Past midnight the
trains slowed to a schedule that made waiting for one its own kind of
patience. The street around the kiosk had gone quiet by comparison. Nobody
was paid to notice, so nobody did.

Renfro was eating an apple in small bites, looking around between them. He
was the patrolman on the beat, a man in his fifties.

Steinbach, a man in his thirties, was checking a small watch pinned to a
collar.

Steinbach was part of the case already, one way or another. I didn’t know
yet which way.

[1 action, 133 words]

the subway kiosk                                      5:20 AM   page 13
────────────────────────────────────────────────────────────────────────────

I checked my watch: after five. Steinbach stopped checking a small watch
pinned to a collar and looked up as I came over. “Sirkin had a tenant,” I
said. “Crowninshield.”

“Verity Crowninshield.”

“Where was Crowninshield tonight?”

Steinbach was happy to talk about her. “I saw her here at six o’clock. She
was back at seven o’clock.” He kept going. “At half past seven she was at
the third floor. At eight o’clock she was at the speakeasy. When the whistle
went off the river, she was here. We’ve said hello often enough. I know
her.”

I wrote that down. It put Crowninshield at the subway kiosk during the
whistle off the river. I had one hour for that, and it came round more than
once a night.

“One more thing. Where were you tonight?”

“Where was I? I’ll tell you where I was,” Steinbach said. “I was here at
seven o’clock. Then the third floor, at half past seven. Then the speakeasy,
at eight o’clock. Then the third floor, from half past eight until half past
nine. I’ve got nothing to add to it and nothing to take away.”

For this account, the only witness was Steinbach. I wrote it down and left
room beside it.

[1 action, 2 written down, 206 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 5:20 AM, 6 of 18 left. 27 of 135 things written down.

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
      “ Crowninshield says she was at the subway kiosk at 7:00 PM; then the
      third floor at 7:30 PM; then the speakeasy from 8:00 PM to 9:30 PM.
      “ Crowninshield saw Sirkin at the subway kiosk from 6:00 PM to 7:00
      PM. Crowninshield saw Sirkin at the third floor at 7:30 PM.
      Crowninshield saw Sirkin at the speakeasy at 8:00 PM.
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
    says: 7:00 PM the subway kiosk; 7:30 PM the third floor; 8:00 PM the
    speakeasy; 8:30 PM–9:30 PM the third floor
      “ Steinbach saw Crowninshield at the subway kiosk when the whistle
      went off the river. Steinbach saw Crowninshield at the subway kiosk at
      6:00 PM and at 7:00 PM. Steinbach saw Crowninshield at the third floor
      at 7:30 PM. Steinbach saw Crowninshield at the speakeasy at 8:00 PM.
      “ Steinbach says he was at the subway kiosk at 7:00 PM; then the third
      floor at 7:30 PM; then the speakeasy at 8:00 PM; then the third floor
      from 8:30 PM to 9:30 PM.
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

  10 of 10 · solved · 12 actions against par 12

The DA reads it twice and does not find anything to argue with. Marchetti
killed Sirkin at the walk-up, 8:30 PM, and the jury takes ninety minutes
over lunch.

The DA went down the column for 8:30 PM. I had 5 of 5 where they were:
Crowninshield at the speakeasy, Vitale at the speakeasy, Marchetti at the
walk-up, Steinbach at the third floor and Hauck at the speakeasy.

Marchetti hangs in the spring. I am told it rained. 10 out of 10, and 12
calls, which is exactly what the night was worth.

They took Marchetti on a Tuesday and the paperwork went up the line without
a hitch in it.

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

13 pages · 2424 words · 186 a page · 12 actions spent · 1 fallbacks
```

### Seed 11 at Raw

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
Bowery. The jaw had gone from purple to something with less name to it. Even
the low lamp showed that much. The mirror could wait for morning.

A woman came up the stairs after midnight.

Steinbach came in composed, her gloves still on, and took the chair before I
could offer it twice, and she opened a compact before answering anything
hard, checked nothing in it, and closed it again. The powder inside was worn
through to bare metal in one spot, from the same two fingers every time.

Klara Steinbach was in her thirties. She put both feet flat on the floor.

“I trade on the street. My customers would rather not be seen doing it
themselves. Wilhelmina Lindemann is dead.”

“She could put a name in the paper, and had put several there for good,” she
said. “She was found dead at the walk-up. That is where it happened.”

“The coroner puts it at half past nine, and will swear to the half hour. It
was a blunt object.”

I knew it.

“What time did you find Lindemann at the walk-up?”

“Half past eleven. That is when I found Lindemann at the walk-up. The
precinct came, walked through it, and went.”

“I am her creditor,” Steinbach said. “She borrowed from me to pay off
another debt. It was never mentioned to anybody. Not by either of us.”

“Why come to me instead of the precinct?”

“I want the one who killed Lindemann found. The precinct has stopped
looking. That is why I am here. I know that asking questions on this block
is a way of being asked some. I know that much.”

She said nothing for a while.

“Whose name have you got?”

“Start with Donnelly. He was in and out of there all week.” Steinbach opened
the compact again, looked at nothing, and shut it. I took a hundred dollars
and wrote Steinbach's business into the notebook before either of us thought
better of it.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 358 words]

the walk-up                                           12:55 AM   page 2
────────────────────────────────────────────────────────────────────────────

Steinbach had named it first. I came to go through it, drawer by drawer.

It was a clear night and a still one. I could hear my own heels on the
pavement going up to the door. The walk-up sat over the drugstore, up a
flight that started just past the pharmacy's side door. The stairs were bare
wood, no runner, no light past the second landing. This late the drugstore
below had been closed for hours, its window dark. Nobody kept a list of who
came and went, on paper or in their head. The police had come and gone.

Lindemann was still on the floor where she had fallen. There was nobody else
in the room. The lamp came down in the fall and the bulb was still warm in
its socket, unbroken. The singing under the window stopped at half past
nine, when the shoe came down.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death at half past nine. One blow broke in the back of
the skull. Death was not instant.

Lindemann would have been dead by about half past nine. That was the latest
it could have been. Anything anybody had timed by the drunk singing under
the window had that hour too.

[1 action, 2 written down, 219 words]

the stairwell                                         1:45 AM   page 3
────────────────────────────────────────────────────────────────────────────

I came for Steinbach’s evening.

Somewhere a streetcar ground along its rails. It was past one. The block
outside the stairwell had gone quiet early, one drunk singing to himself
half a block off. My own footsteps sounded too loud for the hour. The
tenement holding the stairwell was six stories of narrow rooms and one stair
between all of them. A window at each landing looked out on the airshaft,
black at this hour. It was quiet enough to hear a door two floors up.

Corrigan was counting rent money out of a tin box, lips moving with the
count. She was the landlady, a woman in her sixties.

Steinbach was tapping ash from a cigarette without breaking a sentence. She
opened the compact again, looked at nothing, and shut it.

Donnelly, a man in his forties, was reading a folded newspaper, not turning
the page.

A man and a woman sat on the stairs between the second and third landings,
talking in whispers.

It was Steinbach, who had hired me. I wondered what brought a client out
this late. A landlady kept track of tenants' comings and goings as a matter
of business, and Corrigan was thorough about it.

[1 action, 201 words]

the stairwell                                         2:40 AM   page 4
────────────────────────────────────────────────────────────────────────────

Something I had turned up made me want Steinbach’s evening.

The time had kept moving while I wasn’t watching it. It was past two.
Steinbach stopped tapping ash from a cigarette and looked up as I came over.
“How did your evening go, start to finish?” I asked.

Steinbach answered without any fuss. “I was here at eight o’clock. Then the
ferry slip, from half past eight until ten. At half past ten I was here.
I’ve got nothing to add to it and nothing to take away.”

That was Steinbach’s night as Steinbach told it. I wrote it down the way it
was said and argued with none of it yet.

Steinbach came next. Donnelly might know where Steinbach had spent the
evening. I didn’t have far to go for Donnelly.

[1 action, 1 written down, 132 words]

the stairwell                                         3:35 AM   page 5
────────────────────────────────────────────────────────────────────────────

It was after three. Donnelly stopped reading a folded newspaper and looked
up as I came over. “Lindemann had a creditor,” I said. “Steinbach.”

“Klara Steinbach.”

“Where was Steinbach tonight?”

Donnelly had plenty to say, and started at once. “I saw her here from six
until eight. At nine o’clock she was at the ferry slip. From half past ten
until eleven she was here. We’ve said hello often enough. I know her. She
never went anywhere quietly in her life.”

I got it down on paper. It put the walk-up within Steinbach’s reach. I would
want more than that before it meant anything.

“I’ll need your own evening too. All of it.”

“Let me see,” Donnelly said, and then didn’t have to. “I was here from eight
until half past. Then the ferry slip, at nine o’clock. From half past nine
until half past ten I was here. I’ve been over it once already, for myself.”

I had an evening from Donnelly, and I kept it apart from what the others had
seen. An account is only as good as the next person who puts him somewhere.

Mulcahy could tell me something about Donnelly’s evening. She did business
with Lindemann. Mulcahy was right there.

[1 action, 2 written down, 205 words]

the stairwell                                         4:25 AM   page 6
────────────────────────────────────────────────────────────────────────────

By then four had come and gone. Mulcahy left off and looked up. “Donnelly
did business with Lindemann,” I said.

“The pawnbroker’s clerk.”

“Where was Donnelly tonight?”

Mulcahy didn’t have to look anything up. “I saw him here from six until half
past eight. He was back from ten until half past eleven. I was there, and I
have eyes.”

I wrote it in the book. Whoever killed Lindemann had to get to the walk-up
first. Donnelly could have.

“And your own evening? Walk me through it.”

Mulcahy looked at me, then answered. “I was here from eight until half past
ten. I can give you every place, in the order I went. I didn’t expect
anybody to ask about it.”

I had the places Mulcahy named, in Mulcahy’s own order. Where they matched
somebody else’s eyes, they would count for more.

[1 action, 2 written down, 142 words]

the stairwell                                         4:25 AM   page 7
────────────────────────────────────────────────────────────────────────────

Nothing I had found pointed at Corrigan. I asked about Mulcahy on a hunch.

Corrigan stopped counting rent money out of a tin box and looked up as I
came over. “Mulcahy,” I said. “Straight, and I’ll go away.”

Corrigan knew me from before, and that saved us both some time.

“I know her,” Corrigan said. “I saw her here from six until half past seven.
She was back at half past eight. And again from ten until half past eleven.”

“What about the times she wasn’t around? Any you’re sure of?”

“Not at the ferry slip at eight o’clock. Not here from nine until half past.
I know her step. I’d know it in my sleep.”

I wrote it down. If Mulcahy was not at the stairwell at half past nine, then
Mulcahy had lied to me about half past nine. Anybody put somewhere else when
it happened couldn’t have done it, as long as the word held.

I made a note of it and kept my face straight. Mulcahy and I would come back
to the stairwell.

[free, 1 written down, 179 words]

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

I filed the report before the sun was properly up, Mulcahy for the noose and
the facts to back it. There was time left on the clock and nothing left to
do with it.

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

7 pages · 1436 words · 205 a page · 5 actions spent (1 waived) · 0 fallbacks
```
