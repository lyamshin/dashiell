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

**B.1** Every suspect and fixture's dossier has `character`: the drawn profession detail first, then four of the type's own (a layer each: about two thirds they would volunteer, a third what the street says), one of two histories, and a talk register (`clipped`, `plain`, `easy`, `careful`, `rough`). The lines are chosen by a hash of the person's surname and role, not by the case's stream, because another draw would move every draw after it. The self-account tells the history, the drawn detail and one or two layer-1 habits; the notebook's "says" line now carries the history. A fixture has its details in its own mouth now (`detailsFirst`), written by hand one for one with the card's.

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

- **Tests:** RESULTS_TESTS
- **Correspondence:** 0 from the engine over 280 oracle runs, 280 wanderers and 280 runs asking everybody about themselves and taking every rundown (seeds 1–40 × every tier and untiered), and 0 in the tests' own sweeps. The two generator sentences docs/23 lists under "Not fixed" (Medium, seeds 15 and 30) are still there and still counted apart.
- **Beat coverage:** 100%, 10,727 of 10,727 night pages over those 840 runs; the M8 test's 5,455 of 5,455 (30,285 of 30,285 beats).
- **Plain terms:** `npm run decks`: 5,992 cards across 40 decks, 0 errors, 0 banned terms. `test/plain-terms.test.ts` passes. `node scripts/check-character-drafts.mjs` passes on the moved deck.
- **Structure:** identical, 600 of 600.
- **Design test:** RESULTS_DESIGN

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

Rendered after the last change with `npm run read -- --seed N --tier T --no-choices`, and the golden's routes with `--route`. I read each page against the golden. What read wrong and was engine-side is fixed (in the commits: the office's name once a turn, the look and street that echoed the entrance, "Start with you" after a life story, "X knew me from before" for the client on the house, the evening asked after a life story, the rundown's attribution and its face known by sight, the observation again on the rundown). The rest is under "Not fixed".
