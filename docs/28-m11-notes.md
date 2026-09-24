# 28 — M11 People: notes

*Branch `m11-people`, off `main` at d1ef7a5 (the M11 spec and golden), with PR #44 (`m11-character`, the Part C drafts) merged in. The spec is [28-m11-people](28-m11-people.md), Parts A and B. The target is `docs/golden/seed3-people.md` and its seven rules.*

## In one paragraph

Page one now runs in the order a person tells it: who she is to the dead man and that he is dead, who he was and who found him, what the police made of it and what is wrong with that, why she came to Dashiell and what she wants, her trade in his words, who she would start with, and the money. His three questions are the office's own, each written for the line in front of it ("And the police?" after where the body was found), and the generator's prompts are no longer asked before the sentence that invites them. Somebody met for the first time gets a character: what they are doing and how old they are, their trade or their look, one line of how the street sees their kind, and their tie to the case when the notebook has it. Asked about themselves, people answer a plain question ("How long have you had the house?") with their life, in their register, and then say what the dead man was to them; nobody says "I am 45 years old and…" and nobody is asked "Who are you when nobody is asking?". A case has at most one enigma. When the client is in the room with others, **"Ask Hauck who's here"** is a free choice once a visit, and the client names the room the way she knows it, strangers left strangers. An arrival closes on one observation of the detective's own ("The woman who had found Sirkin was reading a folded newspaper past one in the morning, not turning the page."). A grounding is about what it grounds: a debt never gets "who has my keys". The generator gives every dossier three to five details, a history and a talk register, says a want in the person's own pronoun, and never gives two people in a case the same tie sentence. The structure hash of all 600 cases is identical.

## What changed where

| file | what |
|---|---|
| `src/game/voice/office.ts` | `officePlan`: the briefing's sentences, sorted by what they are about into the golden's order (relation and death; who he was, the backstory, where and who found him; the police, what is wrong, when; why and what; the pointer). `officeTurns`, `pronounOfficeTurns` (Hone 3's name-once-a-turn rule on the new turns). `OFFICE_ASK_POLICE`, `OFFICE_ASK_WHY` (by what the precinct did), `OFFICE_ASK_START`, `OFFICE_FIRST_BEAT`, `VICTIM_CONSEQUENCE` (the victim's "sentence of life and consequence", by victim archetype). |
| `src/game/voice/page.ts` | `openTheOffice` plays the plan: the look (◆) after what he can see, the relation turn, a beat, the story, the three questions, her trade in his narration with the street's view of her kind (◆), the hiring. Page one takes its rhythm from the talk and no longer gets padding beats ("Nothing moved.", "…, and I had time."). `OPENING_CEILING` 380 → 440, and the look and street lines go in only where the page has room, because the ceiling cut the entrance before it cut a line of narration. The legacy ask path asks `selfQuestion`. |
| `src/game/voice/character.ts` (new) | Dealing the `character` deck: `characterLine` by role and kind (a victim card by the victim's archetype, then `any`), `characterSlots` ({name} {He} {She} {he} {she} {his} {him} {victim} {place}), `echoes` (a card that says again what the page just said is not dealt). |
| `src/game/scene/people.ts` (new) | `knownTie` (the finder, the one the client named, a relation the notebook holds, the client), `tieSentence`, `doingOf`, `hourSaid`, `observation`. |
| `src/game/scene/plan.ts` | First sight carries the tie (`PresencePerson.tie`), and `brief` on a page that is about the room's finds. The arrival's closing observation (`Thought.observe`), strongest tie first, the observed person's own view line dropped. A new page shape, `rundown`, with a `rundown` beat (`RundownPerson`: how the client knows them, what they are doing, the watcher), and the observation after it (again with "still" if the arrival already closed on them). `bareRoleOf`. |
| `src/game/scene/realize.ts` | `presenceLine`: activity and age, the trade where it shows or else a look card, a street card, the tie sentence; the living victim of a robbery gets their standing and their trade. `rundownParas`. The observation. `exchange` for a self page: `selfQuestion`, the life with a talk card (◆), "You knew Sirkin?" and the answer — a suspect's own tie, a fixture's victim card (◆) or how well they knew the face — and the evening asked as a first question, never "Now tell me about you". The grounding ladder keyed by `thingTopic` and by what the grounding rests on. "X knew me from before" only for somebody who does. |
| `src/game/scene/families.ts` | `thingTopic` (keys, means, money, motive, secret), `SEEN_FAMILIES`. |
| `src/game/scene/text.ts` | `pastPredicate`: a dossier line said afterwards ("Hauck trades on the street…" → "She traded on the street…"). |
| `src/game/voice/plain.ts` | `selfTelling` (life and tie, by temper), `SELF_QUESTIONS` replaced with plain ones, `SELF_VICTIM_QUESTIONS`, `SELF_VICTIM_PLAIN`. Layer 1 now includes the history. |
| `src/game/voice/cast.ts` | `atMostOneEnigma`. |
| `src/game/voice/exchange.ts` | `selfQuestion` (by fixture role, archetype family, familiar). |
| `src/game/types.ts`, `reducer.ts`, `parser.ts`, `choices.ts`, `transcript.ts`, `scene/index.ts` | `Command { kind: 'rundown' }`, `rundownOpen`, the price `rundown` (free), the parse ("ask Hauck who's here", "who's here"), the `rundown` choice group, `SceneMemory.rundown` and `observed`, the transcript's "Free:" row. |
| `src/game/correspond-pages.ts` | The engine's vocabulary reads the office's lines and the dossier's character lines; a view thought on a rundown page is of somebody the rundown covered. |
| `src/game/reader-lint.ts` | Four rules (below); "folding rule" and "walks the beat" are plain senses. |
| `src/game/story.ts` | The epilogue reads a tie said another way (§B.2) as the variant it says. |
| `scripts/players.ts`, `diagnose-play.ts`, `deck-exposure.ts` | `playerChoices`: the players leave the rundown alone (see "Where I judged"). |
| `src/gen/data/character.ts` (new) | `ROLE_CHARACTER`: for all 27 suspect archetypes and 10 fixtures, four details (a layer each), two histories, a talk register. Written for this milestone, true of the type, compatible with every one of the type's profession details. |
| `src/gen/data/cast.ts` | `FixtureCard.detailsFirst` (a fixture's details in its own mouth). `Relationship.backstoryAlt`: the same variant said another way. `WANT_TEXT['to-keep-what-they-have']` takes the person's pronoun. |
| `src/game/voice-data.ts`, `derive.ts` | `OFFICE_KINDS`: seven kinds of office and the ways of saying each; `officeName` picks one on a stream of its own. |
| `src/gen/data/cast.ts` (the designer's note) | Every `professionFirst` and `detailsFirst` opens on the plain job; `JOB_WORDS`. |
| `src/gen/dossier.ts`, `cast.ts`, `types.ts` | `Dossier.character` (`DossierCharacter`, `DossierLine`), chosen by a hash of who the person is and never by a draw; `varyTies`. |
| `src/gen/structure.ts` | `ADDED_TEXT_KEYS`: `character` is left out whole, since the baseline has no such key. |
| `content/decks/character.json` (moved in from PR #44), `content/deck-schema.json` | The `character` deck, 680 cards, and its schema entry. The dashiell deck's `ask-self` kind with `family` and `role` tags (28 lines). The grounding deck's `topic` and `basis` tags. |
| `docs/28-m11-character-cards.md` | The Part C writers' note, moved from `content/drafts/character/README.md`. |
| tests | `test/m11-people.test.ts` (new, 16 tests). `m5-engine`, `hone-1`, `voice`, `office`, `m6`, `story`, `m7-identity` brought to the new office and dossiers. |

## Part A, item by item

**A.1 The office in order.** The engine owns the sequence (`officePlan`), not the generator: each briefing sentence is matched to the field it came from (`briefingTopics`), as before, and laid out in the golden's order. The generator's briefing keeps its own order, which is what the truth sheet prints; nothing in the case changed for this. Every one of her sentences is still on the page (the M5 test holds that), with three changed in words by the new order: the relation names the dead man in full because it comes first now ("I am Isidore Sirkin's sister-in-law", not "I am his sister-in-law"); the death after it is "He is dead"; and her trade is his narration, in the past. Where the precinct was never called, the "Why me?" is "Why me, and not the police?"; where no police sentence exists (some robberies), what is wrong and when is the rest of the story, and he asks nothing about the precinct. Seed 3, before and after, is under "Read-through".

**A.2 First sight.** Three to five sentences on an arrival with no finds of its own (the M11 test holds it over 40 cases): "Crowninshield, a woman in her forties, was reading a folded newspaper, not turning the page. She had the pale indoor look of somebody who spends the day bent over a chair under an electric light. People said she pulled a tooth quicker than anybody in the neighborhood and talked less while doing it." A watcher's trade shows, so it is said ("He was the bartender."). The tie is its own sentence, never stacked on the sight ("She was the one who had found Sirkin.", "He had married into Renfro's family."). On the scene's own arrival, where the report and the coroner's note are the page's business, first sight leaves out the street's view.

**A.3 Asked about themselves.** Before and after, seed 3, Rafferty:

> Before: "Who am I talking to?" I said. / "I am 45 years old and the landlady. I keep the third floor and sit where I can see the stairs. I am the keeper of the third floor."
>
> After: "How long have you had the house?" I asked. / "My mother kept a rooming house. I grew up carrying towels up the stairs. When she stopped, I took it on. I keep the third floor. I sit where I can see the stairs. The rent book's in a drawer. The drawer's locked. The key's on me. …" / "You knew Sirkin?" / "The inspector comes about the stairs and the fire escape. You show the house, and you pay what's paid, and the book gets signed. Inspectors like Sirkin never once look at the stairs."

**A.4 One enigma a case.** The temper stream runs exactly as before (it is replayed for portraits and has to stay reader-independent), and then, where it rolled more than one enigma, one is kept, drawn by each one's enigma weight off a stream of its own (`seed × 1103515245 + 0x2f6b1c3d`), and the others become plain. Plain rather than re-rolled, because a yapper volunteers a clue once a run and a new yapper would change what the night hands out; plain changes only how somebody talks. Nobody who was not an enigma changes. Over 40 seeds in each of five configurations (untiered, Raw, Soft-boiled, Medium, Hard-boiled), 104 of 200 cases changed, 160 people in all, every one of them enigma → plain; enigmas went from 327 to 167. The three read-through cases: seed 3 at Medium, Crowninshield and Hauck (Vitale kept); seed 7 at Hard-boiled, Brauer; seed 11 at Raw, none. The full list is at the end of these notes.

**A.5 The client's rundown.** "Ask Hauck who's here" is offered at the head of the choices whenever the client is in the room with somebody else, is free, and once a visit (asked again, the page says she has told him already). The page is his question, her naming of the room, and his look round it closing on one observation. She names each person by her acquaintance edge (`acquaintanceOf`): by name, with their trade and one line of her own about their kind (a `client` card), or that they found the body; a face known by sight, with no name; a stranger, "I don't know at all"; and the room's watcher, "And Hargrove you know, or you will." Nobody is named she could not name, so no description on the grid is linked by it, and the notebook and the clock do not move (the M11 test holds all four over 40 cases). The players do not use it: see "Where I judged".

**A.6 The arrival's closing observation.** On a first visit with no finds of its own, the page closes on whoever in the room has the strongest tie the notebook knows — the finder, the one the client named, a relation it holds, the client — doing what they are doing, at the hour: "The man Hauck had told me to start with was checking a small watch pinned to a collar past four in the morning." The rundown closes the same way; where the arrival already closed on that person, "still".

**A.7 Groundings.** A `thing` family now knows what it is about (`thingTopic`: keys, means, money, motive, secret), and a grounding tagged with a topic is dealt only for a thing of that topic. A grounding that rests on sight (`basis: sight`, "I see everybody who comes in") is dealt only for what somebody saw (movements, counts, strangers, an event). The lint checks both off the grounding's words.

## Part B

**B.1** Every suspect and fixture's dossier has `character`: the drawn profession detail first, then four of the type's own (a layer each: about two thirds they would volunteer, a third what the street says), one of two histories, and a talk register (`clipped`, `plain`, `easy`, `careful`, `rough`). The lines are chosen by a hash of the person's surname and role, not by the case's stream, because another draw would move every draw after it. The self-account tells the job (the drawn detail), how they came to it, and one line of their kind's talk from the character deck; a yapper adds a habit and an enigma gives the job and the first sentence of the history, and stops (camp: timing over density); the notebook's "says" line now carries the history. A fixture has its details in its own mouth now (`detailsFirst`), written by hand one for one with the card's.

**B.2** "wants to keep what they have" is "wants to keep what she has" of a woman. No two suspects in a case share a tie sentence: once every dossier is built, a later person with a variant somebody already has is dealt the next variant that names a third party exactly when theirs did (so the draw that invented that third party still stands), and when a case deals one relation three times and runs out, the same variant said another way (`backstoryAlt`, written for every variant that names no third party). The client keeps the one drawn, since it is on page one. No draw is taken. Over 200 seeds at each difficulty no case has two alike (the M11 test).

**B.3** Not needed: the office planner reorders (A.1).

**B.4** `scripts/snapshot-structure.ts`: structure identical, 600 of 600. `test/structure-identity.test.ts` passes against the existing fixture. The dossier's `character` key is left out of the structure whole (`ADDED_TEXT_KEYS`), because the baseline predates it; everything else it changes is text under keys the hash already blanks. **The M7 wording hashes were regenerated deliberately** (`scripts/snapshot-cases.ts --write`): all 600 cases changed wording.

## The designer's notes during the milestone

Three notes came in while this was being built, and all three are in.

**The plain fact first.** "It should often be 'I write tickets at the pawn shop. I know what a thing is worth.' Right now it often will say the second but not the first. Nobody talks that way." Every `professionFirst` line (27 archetypes × 3) and every fixture's `detailsFirst` (10 × 3) now opens on the job and the place in words anyone knows — "I write tickets at the pawnshop.", "I tend bar at the speakeasy.", "I am a dentist.", "I work on the docks." — and the colour after it. `JOB_WORDS` (`src/gen/data/cast.ts`) holds each job's plain words, and `test/m11-people.test.ts` holds the first sentence of every line to them. A self-account now leads with the job ("I write tickets at the pawnshop…") and then how they came to it — except where the question asked how long ("How long have you had the house?"), where the history leads. On page one, where her trade is his narration, a detail with no plain job word in it gets the job in front ("She was a pawnbroker's clerk. She wrote the pawn tickets behind the grille…"). The first-person lines are the briefing's `detailFirst` too, so the truth sheet reads the same way.

**The office is not always two rooms over a shop.** "Why always 'two rooms above'? Bizarre habit." `OFFICE_KINDS` (`voice-data.ts`): seven kinds of place — two rooms over a shop, the top of a walk-up, an office in a building off the avenue, a room over a cigar store, a desk in a shared room over a printer's, the front room of his flat, the last door on a landing — and two or three ways of saying each, on a stream of their own mixed hard from the seed (the old stream gave neighbouring seeds the same first draw). Every one is up a flight of stairs, because the client comes up them. Over forty nights, more than eight kinds of opening and no long runs of one (the M11 test). Page one opens "Midnight. My office was the top floor of a walk-up on Rivington Street, in the Lower East Side." after the camp golden.

**Camp.** "This is camp. We are making camp." The camp golden (`docs/golden/seed3-camp.md`) landed on `main` late in the milestone and is merged in. Every line this milestone wrote is in its register: the office's beat ("I offered her the chair. It's the good chair, which tells you about the other one."), the victim's line of consequence ("Nobody on this street is going to send flowers."), the rundown ("Sit down. I'll tell you who's who." / "That's what I'm paying you for. Wait. Other way round."; "The man at the end of the bar comes in here. Couldn't tell you his name."; "I've never seen in my life"), how a fixture knew the dead man ("I couldn't have picked him out of a crowd of two."), and the dossier's character lines — every person's own account of their life and work, turned up a notch in their talk register, facts unchanged. The mystery stays straight: no joke touches a death, a clue or an hour.

**The character deck (PR #44) was written before the camp ruling.** It is moved in whole, as asked, not rewritten. For the follow-up pass, by kind: `look` (111) reads the most sober — careful observation with no turn in it ("A camera case hung from his shoulder on a strap…"); `victim` (236) is sober throughout, as it probably should mostly stay, but the fixture cards could take a dry turn; `street` (111) is mixed, about a third already landing ("Children crossed the street to avoid her door. Their parents crossed it again to drag them back."); `talk` (111) and `client` (111) are closest to camp already ("They were very decent about it when I stopped coming in.", "Friendly, and deaf when it suits him.").

## The reader lint's new rules

| rule | what it catches | `main` | this branch |
|---|---:|---:|---:|
| `mystery-question` | a question that frames a person as a mystery ("Who are you when nobody is asking?", "Who am I talking to?", "Tell me who you are", "Tell me about yourself", "What do you do with your days?") | 1,278 | 0 |
| `age-self` | "I am 45 years old and…" in somebody's mouth | 1,278 | 0 |
| `grounding-family` | "who has my keys" for anything but a way in; "I see everybody who comes in" for anything nobody saw | 14 | 0 |
| `enigma-count` | a run whose case has more than one enigma | 420 | 0 |

Counted over 840 runs: seeds 1–40 × Raw…Hard-boiled and untiered, each played by the oracle, the wanderer, and the oracle's route with everybody on it asked about themselves first. The `main` column is `main` at d1ef7a5 read by this branch's lint. The existing rules are also 0 on this branch over the same runs.

## Checks

- **Tests:** 47 files, 876 tests, all passing (`npx vitest run --maxWorkers=2`). `npx tsc --noEmit` is clean. `test/m11-people.test.ts` is new (16 tests).
- **Correspondence:** 0 from the engine over 280 oracle runs, 280 wanderers and 280 runs asking everybody about themselves and taking every rundown (seeds 1–40 × every tier and untiered), and 0 in the tests' own sweeps. The two generator sentences docs/23 lists under "Not fixed" (Medium, seeds 15 and 30) are still there and still counted apart.
- **Beat coverage:** 100%, 10,727 of 10,727 night pages over those 840 runs; the M8 test's 5,455 of 5,455 (30,285 of 30,285 beats).
- **Plain terms:** `npm run decks`: 5,992 cards across 40 decks, 0 errors, 0 banned terms. `test/plain-terms.test.ts` passes. `node scripts/check-character-drafts.mjs` passes on the moved deck.
- **Structure:** identical, 600 of 600.
- **Design test:** unchanged. `npx tsx scripts/diagnose-play.ts --design --seeds 100` gives the same table as `main` at d1ef7a5, line for line:

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


## Where I judged

1. **The office's order is the engine's.** The spec allowed either; reordering in the generator would have moved the briefing's lines, and a line's prompt key is structure. The engine already classifies each sentence by its field, so the plan is there. The truth sheet keeps the generator's order.
2. **Three sentences reworded, not re-said.** "I am his sister-in-law" can't open the page, and "Isidore Sirkin is dead. I am his sister-in-law." is the order the golden rejects. The relation names him in full and the death follows as "He is dead".
3. **Her trade goes to his narration**, as the golden has it ("She traded stocks on the street for men who would rather not be seen…"), after "Why me?", where it explains what she wants.
4. **The players leave the rundown alone.** It is free and tells no fact, so the reasoning player has nothing to gain by it; a button-pusher that could press it would press it, and every page a player adds moves the volunteer's roll and the dealer (docs/23). Leaving it out of the players' choices (`playerChoices`) is what keeps the design test's table where it was.
5. **Extra enigmas become plain, not re-rolled** (A.4), for the reason above.
6. **First sight on the scene's own arrival is shorter.** The report and the coroner's note are that page's business, and with two people met there it ran past 400 words.
7. **Page one is longer** (median 415 words, the golden's own is about 400); `OPENING_CEILING` is 440, and the look and the street lines are left out before the entrance would be cut. **Pages past 220 words** are up from a tenth to under a fifth (the M6 test's bound moved with a note): first sight is three to five sentences where it was two, as asked.
8. **A victim card only for a fixture, or a talkative suspect.** A suspect's own tie is the case's and says who the dead man was to them; a card on top of it is for a yapper.
9. **The client is not asked "You knew Sirkin?"** on her own page: she said who he was to her in the office.

## Not fixed

- **The office's reactive line** after the hiring ("Prentiss, on what I have, which is one thing and somebody else's word for it.") is `main`'s and reads oddly under a hiring that has just named him.
- **"He was found dead at the walk-up. … That is when I found Lindemann at the walk-up."** When the client is the finder, the trope's "found dead at" given and the client's own finding are two sentences of one fact; both are the briefing's and the M5 test keeps every sentence.
- **Other people's pages still carry "Rafferty was next." with Rafferty in front of him** and "I would want to hear where Zeldin says Zeldin was" (docs/26's list for the writers).
- **The golden's rundown opener** ("You found me," she said. "Sit down. I'll tell you who you're looking at.") is not written; the page opens on his question.

## Read-through

Rendered after the last change with `npm run read -- --seed N --tier T --no-choices`, and the golden's routes with `--route`. I read each page against `seed3-people.md` for structure and `seed3-camp.md` for voice. What read wrong and was engine-side is fixed (in the commits: the office's name once a turn, the look and street that echoed the entrance, "Start with you" after a life story, "X knew me from before" for the client on the house, the evening asked after a life story, the rundown's attribution and its face known by sight, the observation again on the rundown). The rest is under "Not fixed".

### Seed 3 at Medium: the office, beside the golden

**The golden (§1):**

> Midnight. Two rooms over a Chinese laundry on Mulberry Street. My knuckle had split open again, the same place as last month, and frost had crept across the window glass from the inside. A woman came up the stairs after midnight.
>
> She stood a moment inside the door with her gloves in one hand. They were new enough that a price tag was still folded down inside one cuff. She hadn't noticed, or hadn't cared to. She was in her thirties, dressed for an office she didn't have. ◆ She had the look of someone who did her business standing up, on a curb, with one eye on the street.
>
> "My name is Ilse Hauck," she said. "My sister was married to Isidore Sirkin. He's dead."
>
> I let her sit before I asked anything.
>
> "Sirkin was a buildings inspector," she said. "He could close a building with a signature, and he had closed two. You can imagine how many friends that made him. They found him in his walk-up. Crowninshield found him, at half past eleven. She rents from him."
>
> "And the police?"
>
> "They wrote it down as a fall and closed the book on it." Her mouth went thin. "The door was locked. The windows were painted shut. There's one key to that walk-up, and it hangs on a hook at the third floor, and this morning it was on the hook. The coroner says between eight and half past. That's not a fall. That's somebody with a key."
>
> "Why me, and not the precinct again?"
>
> "Because the precinct is finished with it, and I'd like it to stay finished in public." She turned the gloves over. "I want it found. I don't want it said. I'm paying for both."
>
> ◆ She traded stocks on the street for men who would rather not be seen doing it themselves. She knew what quiet was worth to a customer, and she was pricing it for herself.
>
> "Where would you start?"
>
> "Steinbach. He blamed Sirkin for losing his business. He said so to anyone who'd listen."
>
> She put a hundred dollars on the desk and waited for me to pick it up before she let go of the edge of it.

**`main` before this branch:**

```
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
```

**This branch** (`npm run read -- --seed 3 --tier 4 --no-choices`):

```
my office                                             12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a room behind a door with my name on it, three
flights up off Mulberry Street, in Little Italy. My knuckle had split open
again, the same place as last month. It caught on the desk drawer every
time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight. Hauck came in composed, her
gloves still on, and took the chair before I could offer it twice. She wore
gloves new enough that a price tag was still folded down inside one cuff,
where a saleswoman had missed it. She had not noticed either, or had not
cared to.

Ilse Hauck was in her thirties. Quick on her feet and quicker with her eyes,
she checked her watch twice in the first minute without ever seeing what it
said.

“My name is Ilse Hauck,” she said. “I am Isidore Sirkin’s sister-in-law. He
is dead.”

I didn’t say anything. She wasn’t finished, and I had nowhere to be but
here.

“Sirkin was a buildings inspector,” Hauck said. “He could close a building
with a signature, and had closed two. Nobody on this street is going to send
flowers. He was found dead at the walk-up. Crowninshield found him at the
walk-up at half past eleven.”

“What did the precinct do about it?”

“The precinct wrote it down as a fall and closed the book on it. The door at
the walk-up was locked and the windows were painted shut. There is one key
to the walk-up. It was on its hook at the third floor this morning. The
coroner puts it between eight o’clock and half past eight.”

“Why me?”

“I want it settled quietly. If I wait, it gets settled loudly instead. I am
paying for two things. One is that it is found. The other is that nobody
hears about it.”

She traded on the street for men who would rather not be seen doing it. She
did business on a curb and settled it on a handshake, and the people who
dealt with her learned to count their change.

“Where would you start?”

Hauck smoothed the new gloves again, the price tag still folded in one cuff.
“Start with Steinbach. Steinbach blamed Sirkin for the ruin of his
business.” I asked what the trouble was worth. Hauck put a hundred dollars
on the blotter and let that answer.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 419 words]
```

The order is the golden's: who she is to him and that he is dead; who he was, a line of what that made him, where and who found him; the question about the police and the precinct's answer, the locked door and the key, the coroner's hours; "Why me?" and what she wants; her trade in his words with the street's view of her kind; "Where would you start?" and the money. The office opens on one of its new kinds of place, and the beat after the first turn is in the camp golden's register. What the goldens have that the page does not: "My sister was married to…" (the generator's relation is "sister-in-law", and the page says that); the finder's own relation ("She rents from him.") and the precinct's case said as her conclusion ("That's not a fall. That's somebody with a key."), both of which would be the page asserting what the case has not told her; and the camp golden's closing ("She put a hundred dollars on the desk and kept two fingers on it until I picked it up."), which is the hiring deck's to write.

### Seed 3: the rundown, beside the golden

**The golden (§2):**

> I came down the six steps and knocked, and the door let me in.
>
> The speakeasy was a long low room under a hat shop, a bar down one side, and on a night this cold most of the stools were empty. Hargrove was behind the bar rinsing glasses in a basin. ◆ He was a big man going soft, the kind of bartender who knew what you drank before you did and never said your name out loud.
>
> Hauck had a table near the back. When she saw me she moved her gloves off the other chair.
>
> "You found me," she said. "Sit down. I'll tell you who you're looking at."
>
> "Go on."
>
> "The woman with the newspaper is Crowninshield. The dentist. She's the one who found him." She didn't look over. "The man at the end of the bar I've seen in here. I couldn't tell you his name. The girl two stools down from him, I don't know at all. And Hargrove you know, or you will. He knows everybody's drink and nobody's business."
>
> I looked the room over the way she'd laid it out. The dentist who found the body was reading a newspaper at one in the morning without turning the page.

**The camp golden (§2):**

> The speakeasy was six steps down under a hat shop, through a door you had to knock on. The knock is a formality. They let in anybody who knows about the door, which is everybody.
>
> Most of the stools were empty on account of the cold. Hargrove was behind the bar rinsing glasses in a basin, a big man going soft, the kind of bartender who knows what you drink before you do and never once says your name out loud.
>
> Hauck had a table at the back. She moved her gloves off the other chair, which in her language was a warm welcome.
>
> "Sit down," she said. "I'll tell you who's who."
>
> "That's what I'm paying you for," I said. "Wait. Other way round."
>
> "The woman with the newspaper is Crowninshield. The dentist. She found him." She didn't look over. "The man at the end of the bar comes in here. Couldn't tell you his name. The girl two stools down from him, I've never seen in my life. And Hargrove knows everybody's drink and nobody's business, which is why he's still alive."
>
> I looked the room over the way she'd laid it out. The dentist who found the body was reading a newspaper at one in the morning without turning the page. Either it was a very good paragraph or she wasn't reading it.

**This branch** (`--route "go the speakeasy; ask Hauck who's here"`), the arrival and then the rundown:

```
the speakeasy                                         12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

Hauck set me on it. Crowninshield was who I needed, on the matter of Hauck.

The cold kept the block's doors shut tight, and every window along it was
fogged from the inside. You got into the speakeasy by the hat shop’s side
entrance, then down a narrow stair to a door with a slot cut in it. By day
the street knew the shop as a place to buy a hat; after midnight the room
under it sold liquor, which the law said nobody could. The shop upstairs had
long since gone dark.

Hargrove, a man in his forties, was rinsing glasses in a basin, setting them
out to dry. He was the bartender. Up and down the block he was known as
somebody you could tell anything to, as long as you didn’t want advice.

Crowninshield, a woman in her forties, was waiting, and not for me. She had
the pale indoor look of somebody who spends the day bent over a chair under
an electric light. Children crossed the street to avoid her door. Their
parents crossed it again to drag them back.

Hauck was tapping ash from a cigarette without breaking a sentence. She
smoothed the new gloves again, the price tag still folded in one cuff.

A man and a woman sat at the bar a few stools apart, each of them minding a
glass.

Whoever came or went, Hargrove would have marked it. The woman who had found
Sirkin was waiting after midnight, and not for me.

[1 action, 253 words]

the speakeasy                                         12:25 AM   page 3
────────────────────────────────────────────────────────────────────────────

“Who’s who in here?” I asked.

“The woman waiting is Crowninshield,” she said. “A dentist. She’s the one
who found him. The man tapping a pencil against a slate of odds comes in
here. Couldn’t tell you his name. And Hargrove you know, or you will. That’s
the bartender. Friendly, and deaf when it suits him. The woman sitting with
a drink, I’ve never seen in my life.”

I looked the room over the way she’d laid it out. The dentist who had found
Sirkin was still waiting after midnight, and not for me.

[free, 94 words]
```

Hauck knows Crowninshield by name and says she found him; Vitale by sight ("comes in here. Couldn't tell you his name."); Marchetti not at all; Hargrove by trade. The arrival closed on Crowninshield and the rundown closes on her again, still at it — the golden's closing observation, on the one person the case ties to the room.

### Seed 3: a person asked about themselves, beside the golden

**The golden (§3):**

> "How long have you had the house?" I said.
>
> Rafferty put the coins down in their stacks. "Eleven years this spring. My husband bought it and I've kept it since he died, which is longer than he had it." ◆ "I sit where I can see the stairs. People think that's nosiness. It's rent."
>
> "You knew Sirkin?"
>
> "Everybody knew Sirkin. He came round twice a year about the stairs and the fire escape, and twice a year I paid him not to find anything." She said it the way you'd mention the weather. "That's not a secret on this street. It's the price of a stair."

**This branch** (`--route "ask Hauck about herself; go the third floor; ask Rafferty about herself; go the speakeasy; ask Hauck who's here; ask Hargrove about himself; ask Crowninshield about herself"`):

```
DASHIELL · case 3 · difficulty 2 · Little Italy
Medium (5 suspects, 5 places, 3 secrets, coroner 1h, par 8–14) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 12, budget 18 (generator: 11/17), 135 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: bruised, someone-who-left, cold night.
  The office: a room behind a door with my name on it, three flights up off Mulberry Street.
  Knows Renfro — did-a-job-for (warmth +0)

  TEMPER
    Crowninshield plain   a dentist with a chair and a waiting room
    Vitale        enigma  a bookmaker in a small way
    Marchetti     plain   a switchboard operator
    Steinbach     yap     a piano teacher
    Hauck         plain   a stockbroker who trades in the street
    Rafferty      yap     the landlady
    Hargrove      plain   the bartender
    Renfro        plain   the patrolman on the beat

my office                                             12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a room behind a door with my name on it, three
flights up off Mulberry Street, in Little Italy. My knuckle had split open
again, the same place as last month. It caught on the desk drawer every
time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight. Hauck came in composed, her
gloves still on, and took the chair before I could offer it twice. She wore
gloves new enough that a price tag was still folded down inside one cuff,
where a saleswoman had missed it. She had not noticed either, or had not
cared to.

Ilse Hauck was in her thirties. Quick on her feet and quicker with her eyes,
she checked her watch twice in the first minute without ever seeing what it
said.

“My name is Ilse Hauck,” she said. “I am Isidore Sirkin’s sister-in-law. He
is dead.”

I didn’t say anything. She wasn’t finished, and I had nowhere to be but
here.

“Sirkin was a buildings inspector,” Hauck said. “He could close a building
with a signature, and had closed two. Nobody on this street is going to send
flowers. He was found dead at the walk-up. Crowninshield found him at the
walk-up at half past eleven.”

“What did the precinct do about it?”

“The precinct wrote it down as a fall and closed the book on it. The door at
the walk-up was locked and the windows were painted shut. There is one key
to the walk-up. It was on its hook at the third floor this morning. The
coroner puts it between eight o’clock and half past eight.”

“Why me?”

“I want it settled quietly. If I wait, it gets settled loudly instead. I am
paying for two things. One is that it is found. The other is that nobody
hears about it.”

She traded on the street for men who would rather not be seen doing it. She
did business on a curb and settled it on a handshake, and the people who
dealt with her learned to count their change.

“Where would you start?”

Hauck smoothed the new gloves again, the price tag still folded in one cuff.
“Start with Steinbach. Steinbach blamed Sirkin for the ruin of his
business.” I asked what the trouble was worth. Hauck put a hundred dollars
on the blotter and let that answer.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 419 words]

my office                                             12:00 AM   page 2
────────────────────────────────────────────────────────────────────────────

Nothing I had found pointed at Hauck. I asked on a hunch.

“What keeps you in this part of town?”

“I trade stocks on the street. My customers would rather not be seen doing
it themselves. I don’t mind being seen, and it’s good for business. I left a
bank job that paid less and bored me more. I’ve been out on the street
nearly ten years. The street has rained on me plenty, but it has never once
bored me. A customer never asks where the money went. A customer wants to
know what it’s worth today. Those are two different conversations.”

“Take me through your night, from the start.”

Hauck told it simply. “I was at the speakeasy from seven until half past.
Then the third floor, from eight until half past. Then the speakeasy, from
nine until half past. I’m not mixing it up with any other night.”

I got it down on paper. Hauck had told me where the evening went. Whether
anybody else would say the same was another matter.

[free, 1 written down, 175 words]

the third floor                                       12:25 AM   page 3
────────────────────────────────────────────────────────────────────────────

Nothing had sent me to the third floor. I wanted to see it.

It was cold enough that the doorknob stung my hand through the glove. You
reached the third floor by a narrow stair that ran straight up from the
entry, past doors with nothing on them but a number. Past midnight the
building had settled into the particular quiet of people who all had to be
up early. It was the kind of place where a late caller got noticed, whether
or not anyone said so.

Rafferty, a woman in her forties, was counting out coins from a rent
envelope, stacking them by denomination. She was the landlady. The tenants
at the third floor said she knew who came in late by the creak of one stair,
and who was behind by the look on their face.

Rafferty watched the door the way any landlady did, without appearing to.

[1 action, 151 words]

the third floor                                       12:55 AM   page 4
────────────────────────────────────────────────────────────────────────────

Nobody had mentioned it to me. I raised it with Rafferty myself.

Rafferty stopped counting out coins from a rent envelope and looked up as I
came over. “How long have you had the house?” I asked.

“My mother kept a rooming house. I grew up carrying towels up the stairs.
When she stopped, I took it on. I rent out the rooms at the third floor. I
sit where I can see the stairs. People think that’s nosiness. It’s rent. The
rent book’s in a drawer. The drawer’s locked. The key’s on me, and it stays
there. A house is a roof and a lot of people under it who’d all like it
cheaper. My job is to say no nicely.” Rafferty had found the spot nearest
the door again.

“You knew Sirkin?”

“The inspector comes about the stairs and the fire escape. You show the
house, and you pay what’s paid, and the book gets signed. Inspectors like
Sirkin never once look at the stairs.”

Rafferty was not finished, and the rest of it was about Steinbach.
“Steinbach took the rooms over the third floor from Sirkin and has been two
weeks behind since the spring.”

“And what else do you know?”

“Here’s what I know about it,” Rafferty said. “Crowninshield owed money, and
half the block could've told you as much, if you'd asked around.”

“You’re sure it was Crowninshield?”

“I don’t say a thing about my tenants unless I know it. I could tell you
more about this street than the street would like.”

I got it down on paper. Crowninshield owed Sirkin four thousand dollars and
was past due on it. People had been killed for less.

Crowninshield came next. Rafferty might know where Crowninshield had spent
the evening. I wasn’t done with Rafferty yet.

[1 action, 1 written down, 300 words]

the speakeasy                                         1:20 AM   page 5
────────────────────────────────────────────────────────────────────────────

Hauck gave me the reason. I meant to ask Crowninshield what Crowninshield
knew of Hauck.

I had heard a clock strike one a while back. The cold had cleared most of
the block out early. A last stubborn pair stood outside the speakeasy, not
talking. The speakeasy was an illegal bar under a hat shop, down six steps
and through a door you had to knock on. At this hour most of the stools were
empty.

Hargrove, a man in his forties, was rinsing glasses in a basin, setting them
out to dry. He was the bartender. Up and down the block he was known as
somebody you could tell anything to, as long as you didn’t want advice.

Crowninshield, a woman in her forties, was reading a folded newspaper, not
turning the page. A starched white collar, a dark suit a little too warm for
the room, and eyes that went to my mouth when I talked, from habit. People
said she pulled a tooth quicker than anybody in the neighborhood and talked
less while doing it.

Hauck was tapping ash from a cigarette without breaking a sentence. She
smoothed the new gloves again, the price tag still folded in one cuff.

A man and a woman were at a back table over drinks, their chairs pulled in
close.

Whoever came or went, Hargrove would have marked it. The woman who had found
Sirkin was reading a folded newspaper past one in the morning, not turning
the page.

[1 action, 249 words]

the speakeasy                                         1:20 AM   page 6
────────────────────────────────────────────────────────────────────────────

“Who’s who in here?” I asked.

“The woman reading a folded newspaper is Crowninshield,” she said. “A
dentist. She’s the one who found him. The man going through a stack of
betting slips comes in here. Couldn’t tell you his name. And Hargrove you
know, or you will. He pours at the speakeasy. Ask him who’s been in and
he’ll know. Whether he’ll say is another matter. The woman smoking at a
table near the wall, I’ve never seen in my life.”

I looked the room over the way she’d laid it out. The dentist who had found
Sirkin was still reading a folded newspaper past one in the morning, not
turning the page.

[free, 114 words]

the speakeasy                                         1:45 AM   page 7
────────────────────────────────────────────────────────────────────────────

No one had told me to press Hargrove. I did it anyway.

Hargrove stopped rinsing glasses in a basin and looked up as I came over.
“How long have you been behind this bar?” I asked.

“I washed glasses in a hotel bar before the country went dry. When it went
dry I kept pouring. Just somewhere quieter. I tend bar at the speakeasy.
Nine years, and I remember what everybody drinks. Names I forget on purpose.
I’ve been asked a hundred times who was in here on such a night. I always
know. I almost never say.” Hargrove brushed at the sawdust in the coat seams
again.

“You knew Sirkin?”

“I’d know Sirkin’s drink before the name. Most of us are like that.”

It was a small piece of Sirkin’s evening, and small pieces add up or they
don’t.

[1 action, 140 words]

the speakeasy                                         2:15 AM   page 8
────────────────────────────────────────────────────────────────────────────

Nobody sent me, only a hunch. I wanted Crowninshield’s answer, not anybody
else’s.

It was after two. Crowninshield stopped reading a folded newspaper and
looked up as I came over. “How did you come to the work?” I asked.

“I am a dentist. I bought the practice second-hand, and I am still paying
for the chair. The chair knows it. I have had my own chair since ’26. Before
that I worked another dentist’s chair, for less than I was worth. People
tell me things with my hands in their mouths. They can’t argue back. It
makes them honest, or near enough.” Crowninshield wrote a line on a pad
again without looking down.

“How did you know Sirkin?”

“I have rented from Sirkin since ’26. The same window. The same complaint
about it, every year.”

“How did your evening go, start to finish?”

Crowninshield gave it to me in the order it happened. “I was at the subway
kiosk at seven o’clock. Then the third floor, at half past seven. From eight
until half past nine I was here. I haven’t had to think hard about it.
Nothing worth telling, but you asked.”

I put it in the notebook. It went into the notebook under Crowninshield’s
name, as told. An account is only as good as the next person who puts her
somewhere.

Nobody had told me about the speakeasy at eight o’clock yet. Crowninshield
might. I wasn’t done with Crowninshield yet.

[1 action, 1 written down, 242 words]

THE NOTEBOOK
════════════════════════════════════════════════════════════════════════════

The clock: 2:15 AM, 13 of 18 left. 4 of 135 things written down.

PEOPLE
  Sirkin, a buildings inspector — the victim
    on sight: Sirkin could close a building with a signature, and had closed
    two. Sirkin is a man. He is in his forties.
    from others: Crowninshield found Sirkin at the walk-up at 11:30 PM.
  Crowninshield, a dentist with a chair and a waiting room (the speakeasy)
    on sight: Crowninshield is a woman. She is in her forties.
    volunteered: Crowninshield is a dentist with a chair and a waiting room.
    Crowninshield bought the practice second-hand and is still paying for
    the chair. Crowninshield has had her own chair since ’26 and worked
    another dentist’s chair before that.
    from others: Crowninshield has rented from Sirkin since ’26 and has the
    same window and the same complaint.
    says: 7:00 PM the subway kiosk; 7:30 PM the third floor; 8:00 PM–9:30 PM
    the speakeasy
      “ Crowninshield says she was at the subway kiosk at 7:00 PM; then the
      third floor at 7:30 PM; then the speakeasy from 8:00 PM to 9:30 PM.
  the man in his thirties (the speakeasy)
    on sight: He is a man. He is in his thirties.
  the woman in her twenties (the speakeasy)
    on sight: She is a woman. She is in her twenties. She is a switchboard
    operator.
  Steinbach, a piano teacher (the subway kiosk)
    on sight: Steinbach is a man. He is in his thirties.
    from others: Steinbach took the rooms over the third floor from Sirkin
    and has been two weeks behind since the spring.
  Hauck, a stockbroker who trades in the street — our client (the speakeasy)
    on sight: Hauck is a woman. She is in her thirties.
    volunteered: Hauck is a stockbroker who trades in the street. Hauck
    trades on the street for men who would rather not be seen doing it.
    Hauck left a bank job that paid less and bored her more, and has been
    out on the street nearly ten years.
    says: 7:00 PM–7:30 PM the speakeasy; 8:00 PM–8:30 PM the third floor;
    9:00 PM–9:30 PM the speakeasy
      “ Hauck hired us, and wants it known that Steinbach blamed Sirkin for
      the ruin of Steinbach’s business, and would rather we started there.
      “ Hauck says she was at the speakeasy from 7:00 PM to 7:30 PM; then
      the third floor from 8:00 PM to 8:30 PM; then the speakeasy from 9:00
      PM to 9:30 PM.
  Rafferty, the landlady (the third floor)
    on sight: Rafferty is a woman. She is in her forties. Rafferty is a
    landlady.
    volunteered: Rafferty keeps the third floor and sits where she can see
    the stairs. Rafferty grew up in a rooming house her mother kept and took
    it on when her mother stopped.
      “ Rafferty says Sirkin told Crowninshield that Friday was the end of
      it, one way or the other.
  Hargrove, the bartender (the speakeasy)
    on sight: Hargrove is a man. He is in his forties. Hargrove is a
    bartender.
    volunteered: Hargrove has tended bar at the speakeasy for nine years and
    remembers what everybody drinks. Hargrove washed glasses in a hotel bar
    before the country went dry and has poured ever since, in quieter
    places.

PLACES
  the third floor — private, watched by the landlady
  the speakeasy — semi, watched by the bartender
  the office — private, unwatched — not been
  the walk-up — private, unwatched — not been
  the subway kiosk — public, unwatched — not been
  my office — private, unwatched

LEADS
  the speakeasy — here
    · Ask Crowninshield about Hauck
    · Ask Crowninshield about the speakeasy
  the third floor
    · Ask Rafferty about Crowninshield
    · Ask Rafferty about Hauck
  the walk-up
    · Look around the walk-up

ESTABLISHED
  time of death: Nothing established yet.
  method: nothing settled yet
  motives: Steinbach — blamed somebody for a ruin; Crowninshield — owed money
  near the weapon: nobody yet
  accounted for: nobody yet

8 pages · 1790 words · 224 a page · 5 actions spent (1 waived) · 0 fallbacks
```

### Seed 3 at Medium, the whole run

```
DASHIELL · case 3 · difficulty 2 · Little Italy
Medium (5 suspects, 5 places, 3 secrets, coroner 1h, par 8–14) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 12, budget 18 (generator: 11/17), 135 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: bruised, someone-who-left, cold night.
  The office: a room behind a door with my name on it, three flights up off Mulberry Street.
  Knows Renfro — did-a-job-for (warmth +0)

  TEMPER
    Crowninshield plain   a dentist with a chair and a waiting room
    Vitale        enigma  a bookmaker in a small way
    Marchetti     plain   a switchboard operator
    Steinbach     yap     a piano teacher
    Hauck         plain   a stockbroker who trades in the street
    Rafferty      yap     the landlady
    Hargrove      plain   the bartender
    Renfro        plain   the patrolman on the beat

my office                                             12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a room behind a door with my name on it, three
flights up off Mulberry Street, in Little Italy. My knuckle had split open
again, the same place as last month. It caught on the desk drawer every
time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight. Hauck came in composed, her
gloves still on, and took the chair before I could offer it twice. She wore
gloves new enough that a price tag was still folded down inside one cuff,
where a saleswoman had missed it. She had not noticed either, or had not
cared to.

Ilse Hauck was in her thirties. Quick on her feet and quicker with her eyes,
she checked her watch twice in the first minute without ever seeing what it
said.

“My name is Ilse Hauck,” she said. “I am Isidore Sirkin’s sister-in-law. He
is dead.”

I didn’t say anything. She wasn’t finished, and I had nowhere to be but
here.

“Sirkin was a buildings inspector,” Hauck said. “He could close a building
with a signature, and had closed two. Nobody on this street is going to send
flowers. He was found dead at the walk-up. Crowninshield found him at the
walk-up at half past eleven.”

“What did the precinct do about it?”

“The precinct wrote it down as a fall and closed the book on it. The door at
the walk-up was locked and the windows were painted shut. There is one key
to the walk-up. It was on its hook at the third floor this morning. The
coroner puts it between eight o’clock and half past eight.”

“Why me?”

“I want it settled quietly. If I wait, it gets settled loudly instead. I am
paying for two things. One is that it is found. The other is that nobody
hears about it.”

She traded on the street for men who would rather not be seen doing it. She
did business on a curb and settled it on a handshake, and the people who
dealt with her learned to count their change.

“Where would you start?”

Hauck smoothed the new gloves again, the price tag still folded in one cuff.
“Start with Steinbach. Steinbach blamed Sirkin for the ruin of his
business.” I asked what the trouble was worth. Hauck put a hundred dollars
on the blotter and let that answer.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 419 words]

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

Rafferty, a woman in her forties, was counting out coins from a rent
envelope, stacking them by denomination. She was the landlady. The street
said she was hard and the tenants said she was fair, and neither of them was
wrong.

Rafferty watched the door the way any landlady did, without appearing to.

[1 action, 154 words]

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

Hargrove, a man in his forties, was counting the bottles on the back shelf
and writing the number on a card. He was the bartender. The regulars at the
speakeasy said he poured an honest drink and forgot nothing, and sold none
of it.

Crowninshield, a woman in her forties, was waiting, and not for me. She
smelled faintly of clove oil, and her hands were very clean and very steady,
the nails cut short. People said she pulled a tooth quicker than anybody in
the neighborhood and talked less while doing it.

Hauck was tapping ash from a cigarette without breaking a sentence. She
smoothed the new gloves again, the price tag still folded in one cuff.

Vitale and Marchetti were slumped in a booth by the far wall, their drinks
gone flat and their talk run down.

Hargrove watched the room the way anyone behind a bar did, without seeming
to. The woman who had found Sirkin was waiting at three in the morning, and
not for me.

[1 action, 262 words]

the speakeasy                                         3:35 AM   page 9
────────────────────────────────────────────────────────────────────────────

Crowninshield left off and looked up. “Sirkin had a sister-in-law,” I said.
“Hauck.”

“The stockbroker who trades in the street.”

“Where was Hauck tonight?”

Crowninshield didn’t have to look anything up. “I saw her here from half
past eight until ten. She was back at eleven o’clock. While the fight was on
the radio, she was here. She’s not somebody I’d take for somebody else.”

I wrote it down. Hauck at the speakeasy at half past eight. That was inside
the time the coroner gave, if the word was good.

“And you? Where were you tonight?”

Crowninshield told it in order. “I was at the subway kiosk at seven o’clock.
Then the third floor, at half past seven. From eight until half past nine I
was here. I’ve got a head for times. I always have. I didn’t expect anybody
to ask about it.”

It was a whole evening on Crowninshield’s say-so. That didn’t make it false.
It made it something to check.

Nobody had told me about Sirkin at eight o’clock yet. Crowninshield might.
She was still in front of me.

[1 action, 2 written down, 182 words]

the speakeasy                                         4:00 AM   page 10
────────────────────────────────────────────────────────────────────────────

I had a question for Crowninshield about Sirkin.

It was past four, and my eyes had started to sting. I wasn’t finished with
Crowninshield. “Tell me about Sirkin.”

Crowninshield knew who I meant. “I saw him at the subway kiosk from six
until seven. At half past seven he was at the third floor. At eight o’clock
he was here. I know his face and I know his walk.”

I wrote that down. Whoever did it had been at the walk-up at half past
eight. That was the time everybody would have to account for.

The next thing was Crowninshield’s evening, and Steinbach had some of it.
Steinbach was at the subway kiosk.

[1 action, 1 written down, 113 words]

the speakeasy                                         4:25 AM   page 11
────────────────────────────────────────────────────────────────────────────

What I had so far pointed at the speakeasy. Crowninshield was the one here
who would know it.

I turned back to Crowninshield. “Anybody come through tonight that you
didn’t know?”

Crowninshield took a moment over it. “A man in his thirties from eight until
half past, one at eight o’clock and one from half past nine until eleven.
Then a woman under forty from nine until half past. One or two I knew by
sight. None of them by name. A face was all I got. Nobody offered me a
name.”

I wrote it in the book. Crowninshield had no name for a man in his thirties.
Whoever it turned out to be had been at the speakeasy at eight o’clock.

[1 action, 4 written down, 122 words]

the subway kiosk                                      4:55 AM   page 12
────────────────────────────────────────────────────────────────────────────

Steinbach would know about Crowninshield.

Ice had skinned over the puddles in the gutter. A lone figure crossed fast,
breath trailing behind him. You reached the subway kiosk from any corner of
the intersection, the kiosk itself the only marker needed. Past midnight the
trains slowed to a schedule that made waiting for one its own kind of
patience. The street around the kiosk had gone quiet by comparison. Nobody
was paid to notice, so nobody did.

Renfro, a man in his fifties, was eating an apple in small bites, looking
around between them. He was the patrolman on the beat. The block said he
knew every door on his round, and which ones would open to him for a cup of
coffee.

Steinbach, a man in his thirties, was checking a small watch pinned to a
collar. Long fingers, cold-looking, and a habit of humming under his breath
without knowing it, always the same few bars. The block knew him by the
scales that came out of the front window every afternoon, the same mistakes
in the same places.

The man Hauck had told me to start with was checking a small watch pinned to
a collar past four in the morning.

[1 action, 203 words]

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

13 pages · 2661 words · 205 a page · 12 actions spent · 1 fallbacks
```

### Seed 11 at Raw, the whole run

```
DASHIELL · case 11 · difficulty 1 · the Bowery
Raw (3 suspects, 3 places, 0 secrets, coroner half an hour, par 5–7) at Beat (level 1, slack 8, noise 25–35%, depth 1, full)
par 6, budget 9 (generator: 5/8), 13 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: bruised, none, clear night.
  The office: a room at the end of a hall over a Chinese laundry on Great Jones Street.
  Knows Corrigan — i-owe (warmth -1)

  TEMPER
    Steinbach     plain   a stockbroker who trades in the street
    Donnelly      yap     a pawnbroker’s clerk
    Mulcahy       plain   a chorus girl between engagements
    Corrigan      plain   the landlady
    Salerno       plain   the patrolman on the beat

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a room at the end of a hall over a Chinese laundry
on Great Jones Street, in the Bowery. The jaw had gone from purple to
something with less name to it. Even the low lamp showed that much. The
mirror could wait for morning.

A woman came up the stairs after midnight.

Steinbach came in composed, her gloves still on, and took the chair before I
could offer it twice. She opened a compact before answering anything hard,
checked nothing in it, and closed it again. The powder inside was worn
through to bare metal in one spot, from the same two fingers every time.

Klara Steinbach was in her thirties. She had a newspaper folded to the stock
prices under one arm and a pencil behind one ear, and looked at the door
every time it opened.

“My name is Klara Steinbach,” she said. “I am Wilhelmina Lindemann’s
creditor. She is dead.”

I didn’t say anything. She wasn’t finished, and I had nowhere to be but
here.

“Lindemann was a society columnist,” Steinbach said. “She could put a name
in the paper, and had put several there for good. Nobody on this street is
going to send flowers, unless they want a mention. She borrowed from me to
pay off another debt. It was never mentioned to anybody. Not by either of
us. She was found dead at the walk-up. That is where it happened. Half past
eleven. That is when I found Lindemann at the walk-up.”

“I take it the police have been.”

“The precinct came, walked through it, and went. It was a blunt object. The
coroner puts it at half past nine, and will swear to the half hour.”

“Then why come to me?”

“I want the one who killed Lindemann found. The precinct has stopped
looking. That is why I am here. I know that asking questions on this block
is a way of being asked some. I know that much.”

She traded on the street for men who would rather not be seen doing it.

“If it were yours to do, where would you start?”

“Start with Donnelly. He was in and out of there all week.” Steinbach opened
the compact again, looked at nothing, and shut it. I took a hundred dollars
and wrote Steinbach's business into the notebook before either of us thought
better of it.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 416 words]

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

Corrigan, a woman in her sixties, was counting rent money out of a tin box,
lips moving with the count. She was the landlady. She’d lend you a quarter
for the gas meter and remember it on rent day. That kind of landlady.

Steinbach was tapping ash from a cigarette without breaking a sentence. She
opened the compact again, looked at nothing, and shut it.

Donnelly, a man in his forties, was reading a folded newspaper, not turning
the page. A jeweler’s glass hung on a ribbon round his neck, and he had a
habit of turning things upside down to see the bottom. He was polite to
everybody who came in, because everybody who came in was having a bad week.

A man and a woman were standing on the first landing under the bare bulb,
their backs to the wall.

A landlady kept track of tenants' comings and goings as a matter of
business, and Corrigan was thorough about it. The man Steinbach had told me
to start with was reading a folded newspaper past one in the morning, not
turning the page.

[1 action, 271 words]

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

7 pages · 1564 words · 223 a page · 5 actions spent (1 waived) · 0 fallbacks
```

### Seed 7 at Hard-boiled, the whole run

```
DASHIELL · case 7 · difficulty 2 · Yorkville
Hard-boiled (6 suspects, 6 places, 5 secrets, coroner 2h, par 10–22) at Precinct (level 2, slack 6, noise 35–45%, depth 1–2, full)
par 17, budget 25 (generator: 16/24), 239 things to find

THE ROLL
════════════════════════════════════════════════════════════════════════════

  Dashiell: behind-on-rent, someone-who-left, fog night.
  The office: a desk in a shared room over a printer’s on East Eighty-Sixth Street.
  Knows Weisglass — grew-up-with (warmth +0)
  Knows Alfano — i-owe (warmth -1)
  Knows Bernstein — did-a-job-for (warmth +1)

  TEMPER
    Zeldin        plain   a bookmaker in a small way
    Weisglass     plain   a chambermaid
    Dettweiler    yap     a tailor
    Broadnax      yap     a dentist with a chair and a waiting room
    Brennan       plain   a stockbroker who trades in the street
    Brauer        plain   a pawnbroker’s clerk
    Whitfield     plain   the elevator man
    Prentiss      enigma  the druggist
    Ruggiero      plain   the news dealer
    Alfano        yap     the man behind the counter
    Bernstein     plain   the patrolman on the beat

the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a desk in a shared room over a printer’s on East
Eighty-Sixth Street, in Yorkville. The landlady's bill was folded under the
telephone. I'd see it every time the thing didn't ring. I decided not to
open it until it did.

“Still here, Dashiell,” Weisglass said, and took the chair without waiting
to be offered it. A fine white dust sat in the creases of her knuckles,
plaster rather than flour, the kind that gets into the skin over a long day
and does not fully wash out by morning.

Minnie Weisglass was a woman in her thirties. The flat shoes and thick
ankles were those of a woman who climbed stairs all day. She sat on the
front edge of the chair, ready to be up again.

“I am Isaiah Renfro’s former employee,” she said. “He has not been seen
since eight o’clock on Tuesday evening.”

I didn’t say anything. She wasn’t finished, and I had nowhere to be but
here.

“Renfro was owed favours by people who would rather not be reminded of
them,” Weisglass said. “I worked for him four years. I was let go in ’23,
without a reference. Broadnax saw Renfro at the Automat at eight o’clock.
Nobody has seen Renfro since.”

“I take it the police have been.”

“The precinct came, looked at the room, and said to wait a day or two.
Renfro’s coat and hat are still on the hook and the money is still in the
drawer.”

“Then why come to me?”

“I want what I am owed. Renfro has it, and I mean to be paid whichever way
this ends. The money I am spending is money I was owed. I may never see any
of it. I am spending it anyway.”

She did eleven rooms a day and the linen after. On the floors she was known
as a hard worker who never took a tip in the hand but always found it on the
dresser.

“Where would you start?”

“Start with Dettweiler. She wanted Renfro out of the lease and the lease in
her name, Dashiell.” Weisglass rubbed at the white dust in her knuckles
again. Twenty dollars changed hands quick, the way it does between people
who've done this before.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 394 words]

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

Prentiss, a man in his fifties, was wiping down the soda fountain with a
damp cloth. He was the druggist. People at Kaplan’s said he knew what
everybody on the block took, and for what, and had never told a soul.

Zeldin, a man in his fifties, was reading a folded newspaper by the light
that was there. There was chalk on the side of one hand from a slate, and he
kept wiping it on his trousers. The police on the beat knew what he did and
bought their cigars from him anyway.

I knew Zeldin’s name already. What I didn’t know yet was what Zeldin would
tell me. Prentiss kept the register near the door and the door in view.

[1 action, 189 words]

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

Whitfield, a man in his thirties, was oiling the hinges of the gate from a
small can, working it back and forth. He was the elevator man. The tenants
at the Hallam said he knew which floor you wanted by your shoes and whether
you’d had a good day by your hat.

Weisglass was waiting, and had been for a while. She rubbed at the white
dust in her knuckles again.

Nobody moved through the building without Whitfield carrying them there. The
chambermaid who was paying me was waiting past one in the morning, and had
been for a while.

[1 action, 160 words]

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

Alfano, a man in his forties, was restocking a shelf, checking each item
against a list. He was the man behind the counter. The regulars at the
Automat said he could take six orders at once and get all six right, and
never once remembered who you were.

Dettweiler, a woman in her thirties, was smoking under the nearest light.
She was a tailor. The men on the block brought her their one good suit twice
a year, and she kept it going longer than it had any right to.

Brennan, a man in his thirties, was checking a pocket watch against the
street clock. Quick on his feet and quicker with his eyes, he checked his
watch twice in the first minute without ever seeing what it said. Half the
block had bought something from him once. The other half had been talked out
of it by the first half. He had married into Renfro’s family.

Broadnax and a man I didn’t know sat at separate tables near the wall of
little doors, each of them with a cup gone lukewarm.

Whoever came in, Alfano had a look at them from behind the counter. The
tailor Weisglass had told me to start with was smoking under the nearest
light past two in the morning.

[1 action, 295 words]

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

Ruggiero, a man in his fifties, was counting the unsold papers from the
evening edition and tying them up to go back. He was the news dealer. He had
your paper folded before you reached the stand and your change counted
before you asked for it.

Bernstein, a man in his twenties, was swinging the nightstick on its strap,
around and back. He was the patrolman on the beat. The street liked him
because he knew when not to see something.

Whoever came by, Ruggiero had likely seen them coming.

[1 action, 177 words]

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

18 pages · 3308 words · 184 a page · 15 actions spent (1 waived) · 1 fallbacks
```

## The tempers that changed (A.4)

Every change is an enigma made plain; nobody else's temper moved. Seeds 1–40 in five configurations (`d2` is the untiered case at difficulty 2; `T0`, `T3`, `T4`, `T5` are Raw, Soft-boiled, Medium and Hard-boiled at level 2).

```
104 of 200 cases changed; 160 people; enigmas 327 → 167
d2 seed 1: Brauer enigma→plain
d2 seed 2: Corrigan enigma→plain, Bernstein enigma→plain
d2 seed 3: Schilling enigma→plain
d2 seed 7: Bidwell enigma→plain
d2 seed 8: Lindemann enigma→plain
d2 seed 9: Doyle enigma→plain, Lindemann enigma→plain, Ashby enigma→plain
d2 seed 11: Zeldin enigma→plain
d2 seed 12: Hochstetter enigma→plain, Lefkowitz enigma→plain
d2 seed 17: Abramowitz enigma→plain
d2 seed 19: Tillman enigma→plain, Coffin enigma→plain
d2 seed 20: Lindemann enigma→plain, Fairbanks enigma→plain, Hurwitz enigma→plain, Vitale enigma→plain
d2 seed 21: Bledsoe enigma→plain
d2 seed 23: Petrosino enigma→plain
d2 seed 25: Prentiss enigma→plain
d2 seed 26: Shapiro enigma→plain
d2 seed 27: Sirkin enigma→plain, Brennan enigma→plain, Vitale enigma→plain
d2 seed 29: Bernstein enigma→plain
d2 seed 31: Bellucci enigma→plain, Sirkin enigma→plain, Cheatham enigma→plain
d2 seed 33: Schilling enigma→plain, Mulcahy enigma→plain
d2 seed 34: Grasso enigma→plain
d2 seed 35: Kessler enigma→plain, Whitfield enigma→plain
d2 seed 37: Carbone enigma→plain
d2 seed 39: Doyle enigma→plain
d2 seed 40: Hanrahan enigma→plain, Kavanagh enigma→plain, Margolis enigma→plain
T0 seed 1: Stannard enigma→plain
T0 seed 3: Thorndike enigma→plain
T0 seed 5: Donnelly enigma→plain
T0 seed 8: Moretti enigma→plain
T0 seed 16: Schilling enigma→plain
T0 seed 18: Mosley enigma→plain, Schilling enigma→plain
T0 seed 20: Feldman enigma→plain
T0 seed 22: Bellucci enigma→plain
T0 seed 27: Thorndike enigma→plain
T0 seed 31: Brauer enigma→plain
T3 seed 1: Mosley enigma→plain
T3 seed 4: Schilling enigma→plain
T3 seed 6: Donnelly enigma→plain
T3 seed 7: Callahan enigma→plain, Hanrahan enigma→plain
T3 seed 8: Cheatham enigma→plain, Lindemann enigma→plain
T3 seed 9: Corrigan enigma→plain
T3 seed 11: Lanza enigma→plain
T3 seed 19: Stannard enigma→plain
T3 seed 24: Vitale enigma→plain
T3 seed 27: Hanrahan enigma→plain
T3 seed 28: Margolis enigma→plain
T3 seed 33: Feeney enigma→plain
T3 seed 34: Lanza enigma→plain, Hargrove enigma→plain
T3 seed 36: Wehrle enigma→plain
T3 seed 37: Winslow enigma→plain, Colquitt enigma→plain
T3 seed 38: Abramowitz enigma→plain
T3 seed 40: Feldman enigma→plain
T4 seed 1: Pickering enigma→plain
T4 seed 2: Cheatham enigma→plain
T4 seed 3: Crowninshield enigma→plain, Hauck enigma→plain
T4 seed 6: Callahan enigma→plain, Lefkowitz enigma→plain
T4 seed 9: Obermann enigma→plain
T4 seed 11: Feldman enigma→plain
T4 seed 12: Thorndike enigma→plain
T4 seed 13: Thorndike enigma→plain
T4 seed 15: Ashby enigma→plain
T4 seed 16: Broadnax enigma→plain, Wehrle enigma→plain
T4 seed 17: Zeldin enigma→plain, Callahan enigma→plain
T4 seed 18: Mosley enigma→plain
T4 seed 19: Callahan enigma→plain, Wehrle enigma→plain
T4 seed 20: Hurwitz enigma→plain
T4 seed 21: Ruggiero enigma→plain
T4 seed 23: Lathrop enigma→plain, Quill enigma→plain
T4 seed 24: Lindemann enigma→plain
T4 seed 29: Tillman enigma→plain, Lanza enigma→plain
T4 seed 31: Dandridge enigma→plain
T4 seed 33: Bernstein enigma→plain, Brauer enigma→plain
T4 seed 34: Broadnax enigma→plain
T4 seed 36: Sweeney enigma→plain
T4 seed 37: Ellery enigma→plain
T5 seed 1: Quill enigma→plain, Doyle enigma→plain
T5 seed 2: Bledsoe enigma→plain
T5 seed 3: Sirkin enigma→plain
T5 seed 6: Sirkin enigma→plain, Thorndike enigma→plain, Moretti enigma→plain, Mosley enigma→plain
T5 seed 7: Brauer enigma→plain
T5 seed 8: Renfro enigma→plain, Hargrove enigma→plain
T5 seed 9: Dandridge enigma→plain, Ainsworth enigma→plain
T5 seed 11: Salerno enigma→plain
T5 seed 12: Cheatham enigma→plain, Margolis enigma→plain, Hauck enigma→plain, Callahan enigma→plain
T5 seed 13: Zeldin enigma→plain
T5 seed 14: Kavanagh enigma→plain
T5 seed 15: Zeldin enigma→plain, Alfano enigma→plain
T5 seed 16: Abramowitz enigma→plain, Bernstein enigma→plain
T5 seed 17: Bernstein enigma→plain, Crowninshield enigma→plain, Hurwitz enigma→plain
T5 seed 18: Sweeney enigma→plain
T5 seed 19: Shapiro enigma→plain, Reinhardt enigma→plain
T5 seed 20: Donnelly enigma→plain, Rosenbaum enigma→plain, Salerno enigma→plain, Prentiss enigma→plain
T5 seed 21: Shapiro enigma→plain, Crowninshield enigma→plain, Cheatham enigma→plain, Salerno enigma→plain
T5 seed 22: Lefkowitz enigma→plain, Petrosino enigma→plain
T5 seed 24: Rosenbaum enigma→plain, Whitfield enigma→plain, Margolis enigma→plain
T5 seed 25: Bidwell enigma→plain
T5 seed 26: Bernstein enigma→plain
T5 seed 27: Hochstetter enigma→plain
T5 seed 28: Coffin enigma→plain, Dettweiler enigma→plain
T5 seed 29: Quill enigma→plain, Kessler enigma→plain, Lindemann enigma→plain
T5 seed 33: Stannard enigma→plain, Fairbanks enigma→plain
T5 seed 34: Margolis enigma→plain
T5 seed 35: Hanrahan enigma→plain
T5 seed 37: Crowninshield enigma→plain
T5 seed 38: Dettweiler enigma→plain
```

