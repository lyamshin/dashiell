# 26 — Engine prose: the read-through's list, engine side

*Branch `engine-prose`, off `main` after PR #39 (the dealer), with PRs #40 and #41 (decks B–C and A–E) merged in. The list is [25-read-through-issues](25-read-through-issues.md), and the coordinator added five more items while the work was under way. The target voice is `docs/golden/seed3-testimony.md` and `seed3-night.md`.*

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

**The coordinator's five:**

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

TESTS_LINE

- **Correspondence:** 0 violations from the engine on every sweep in the tests, including `test/engine-prose.test.ts` over the four read-through runs and their wanderers. Every new sentence takes its names and hours from the clue's facts. "The hour I already had" names no hour.
- **Beat coverage:** 100% in every sweep. COVERAGE_LINE
- **Plain terms:** `npm run decks` finds 0 errors and 0 banned terms. `test/plain-terms.test.ts` passes.
- **Design test:** DESIGN_LINE

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

For the writers (cards I did not edit):

- **grounding** `grd-081` "I remember it because it was tonight." is the filler line the read-through quoted, and it sits in the grounding deck, not tail. `tai-013` "That’s all I saw.", `tai-018` "That’s all.", `tai-043` "That’s when it was.", `tai-048` "That’s how it was.", `tai-053` "That’s my evening." and `tai-068` "That’s it." say nothing. They read as filler after a telling that already ended.
- **thought** `touches timing` (tht-m018…m020) all restate `{time}`, which the find has just said. The engine now writes this thought itself. Cards written without `{time}` would be dealt again.
- **thought** `dead-end` (tht-133…144) are verdicts. They are dealt only in untiered cases now. `secret` tht-122, tht-123 and tht-130 lean on "it was not {victim}", which is fine but close to one.
- **thought** `absent` has "I would want to hear where Zeldin says Zeldin was." (seed 7, page 9), which uses the present tense and the name twice.
- **thought** `view` "…Now the face was across the room from me." The engine keeps it off outdoor places. An outdoor twin would help.
- **hours** "Somewhere in the building a clock struck four." has no `setting` tag. The engine keeps it off outdoor places.
- **answer** ans-010, ans-018, ans-023 and ans-025 say "{name}'s lead". When the surname turns into a pronoun, "His lead" is the book's machinery (the lint caught it on seed 22, Coddled). The engine no longer deals them. "Tip" (ans-005, ans-019, ans-027) is fine.
- **place-ambient / hours:** "A milk wagon went by in the street" (seed 7, page 9, 2:15 AM) on a night whose anchor is the milk wagon. Anchor-bearing texture could be tagged so it is held back when that anchor is the case's.
- **bridge** `tie=time` cards all carry `{tie}`, the window's hour. For an anchor subject the engine writes its own line. For a place subject ("Somebody had to account for the Hallam at seven o’clock") the card works but is thin.
- **dashiell-lines:** the ask-place lines tagged `presumes: there` are most of that kind. More place questions that presume nothing would widen what the engine can deal to a witness who was not there.

## Read-through

Each run was rendered after the last change with `npm run read -- --seed N --tier T --no-choices`, and I read each one page by page. What read wrong and was engine-side is fixed above. The rest is under "Not fixed".
