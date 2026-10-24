# Clarity, build 3

*2026-10-24, branch `clarity-3`. Clarity-2 (docs/60) cut the pages by a third and the round-5 blind testers (four nights, `scratchpad/round5-digest.md`) found them mostly clear on a skim, and named one pattern on all four nights: scenery and jokes work, and the prose fails on the lines that carry the facts, a witness's answer, the "So at…" thought after it, the turn, the put's dialogue. They called it database grammar. This build says those lines as a person says them, by rule, in the layer that makes each one (the sheet, the composition, the realizer, the voicings, the texture card, the lint), never for one night: the twelve items of the first brief, the round-5 digest's P1–P13, and the designer's plain words (batch 3). Each rule has a lint (`src/game/board/hinge-lint.ts`, rule `hinge` of the prose lint, lean only) and a test (`test/hinge.test.ts`), and was run at 30 nights a tier, both worlds, three routes. Lean only, like docs/60: `texture=full` is the old pages and no longer matches anything byte for byte.*

## 1. What was built, and where each rule lives

### 1.1 The hinge lints (`hinge-lint.ts`)

Nineteen rules, each a kind of line the testers stopped on, read over a whole night as a player reads it, target 0. They run in `proseIssues` (rule `hinge`, its kind in `hinge`), in `board-prose` (a column, "hinge lines (docs/62)", and a table of their own, a rule a column), and over whole nights in `round3.test.ts` and `situated.test.ts`; `test/hinge.test.ts` holds each one to the line it catches and the line this build says instead.

| rule | item | catches |
|---|---|---|
| said-place | 2, P3 | a place as the object of "said" or "told": "Bledsoe had said Moskowitz’s at ten", "“You told me home at ten.”" |
| gloss | 1 | the same gloss twice a night ("Fritz, the dachshund," on three pages); a pet's kind said again |
| bare | 4, P12 | somebody's first sentence in the night's narration that doesn't say who they are (a roll call of three names meets nobody) |
| put-lead | 3, P3 | the put's page saying the collision before the put says it to their face |
| put-speech | P3 | the put said like the notebook: "said only … at ten o’clock", "says she herself was", "o’clock, alone" |
| thought-who | 5 | a thought opening on "she" beside another woman named as the subject of a clause after it |
| orphan | docs/60 §6 | "That much checked out." with no agreement before it |
| shift | 6, P2 | a watcher who came on late saying "all evening", or their shift after what they saw |
| telling | 7, P6 | the turn telling the act of telling ("Mrs. Sirkin had told me who came in.") |
| form | 9 | "the form" for the report |
| epilogue | 10 | the client named twice in a sentence, or two running, in the verdict's close |
| dose | P5 | on a poisoning, "died" for the hour the dose went in |
| unwatched | P8 | "nobody watching the stairs" and its kin more than once a night |
| pointer | P4 | a page that opens on a pointer of its own before I ask |
| connector | P7 | "Next was ten.", "The next thing was at eight o’clock:", "Started at eight:" |
| tail | P7 | company tacked on after the evening ("Alone at nine.", "Nobody was with me at nine or ten.") |
| locative | 11 | the same spot twice in a paragraph of who's there |
| reason | 12 | "one of the two hours it could have happened", "none of the people with a reason was at", "as far as anybody had told me" |
| vocab | batch 3 | a story that "held" or "didn't hold"; "put" as a noun, "Put to it"; the game's "calls"; "file" for closing the case |

### 1.2 What somebody said, as a clause (items 2 and 3, P3)

A claim is said as a clause with its verb everywhere a thought, a collision, a recap or a put says it (`bones/phrase.ts` `claimAt`, `claimWas`; `compose.ts`, `thought.ts`, `pages.ts`; the voicings' `{said}`, `{what}`, `{claim}`): "She had said she was at the Shamrock at nine", "Thorndike had told me he was home at ten", "You told me you were home at eleven", never "said the Shamrock" or "told me home". A home is named ("home at the Delmonico rooms") unless the place is called after them. The round trip reads the clause back (`reread.ts` `claimV`, `ownWordV`).

### 1.3 The put (item 3, P3, U7's offer)

- **Said to their face, plainly** (`phrase.ts` `breakToFace`): a list, "Alfano saw Steinbach, Lanza and Pardo at Moe’s at ten, and not you"; nobody, "Mrs. Cheatham says nobody was at the Delmonico rooms at nine, you included"; a claim, "Mrs. Mulcahy says she was home at the Delmonico rooms at eleven, on her own, and you weren’t there".
- **Not said first**: on a put's page, the why-here that said the collision ("Steinbach had told me home at eleven, and Mrs. Mulcahy said otherwise.") goes (`plan/texture.ts` `budgetTexture`). Somebody is still named before "You told me…": the staging that's left, or else "I went over to Steinbach." opens the page (`namePut`, after the reference pass), unless that would name them a third time on the page, where the reaction after the put names them.
- **The offer, optional** (the coordinator's U7 half): "I could face Bellucci with it, or close the case on what I had." (`pages.ts`; `oracle.ts` `turnSaid` reads it).
- **A refusal after a sighting held** says nothing of what somebody would have seen ("But if he wasn’t home at ten, somebody saw him where he was…" undercut what I held): it goes where somebody already passed them, or a list has them, somewhere else at that hour (`pages.ts`, P13).

### 1.4 Who somebody is, once (items 1 and 4, P11, P12)

- **The first time the night's narration names somebody**, the sentence says who they are (`plan/texture.ts` `introduce`, run before the rhythm and again before the reference pass; `gloss.ts` `introOf`): a watcher by their job ("Zeldin, the bartender,"), the keeper by their place, company by who named them ("Vogel, the woman Steinbach had named,"), a lodger, a regular, a neighbor, a suspect by their trade. Never inside speech, a possessive or a roll call of three names; a name inside a place's name ("the landlady at Mrs. Nagy’s") is the place.
- **Said once**: a gloss isn't said again on a later page; a pet's kind once a night (`petKind`, and the office's "now the dachshund was gone" says "now he was gone").
- **A newcomer** comes back into a spot of their own (`pages.ts` `placeNewcomers`, `SPOT`): "Ashby, the woman Ruggiero had named, had come back in by then and was three rows back", never "back, back in again", and never "in the corner" where somebody already is. A spot is said once in a paragraph of who's there: the cards trade for an alternative or lose the spot (`texture.ts`).
- `gloss.ts` `whoTheyAre` is the posture-free gloss ("lives on Pitt Street", not "lives at Steinbach’s flat") for the People list; the list itself is the notebook's (routed, §6).

### 1.5 The thought (items 5 and 12, P1, P5)

- **Everybody where the means was kept, in one sentence** (`thought.ts`, P1): "So Hanrahan, Ruggiero and Reinhardt had all been at the Delmonico rooms, where the laudanum was kept, and had all left by nine." The hours each was there are the answer just said.
- **The dead seen alive, first** (P1): "Carbone was still alive at the Odessa at nine, and it happened at nine or ten. So at nine and ten…".
- **The poison's hour is the dose's** (P5, `phrase.ts` `whyHours`): "when Dandridge was given the laudanum", "when Carbone could have been given the chloral", never "when he died".
- **An agreement says whose word matched whose** (item 5, `compose.ts` agree, flag `both`): a suspect's word that named the one now telling it, and their own evening, "So she told it the same as Ruggiero: the Palace at nine." Never "So Ruggiero bore her out" (the alibi backing its witness), nor "So she had it right, and Ruggiero said the same".
- **The stock phrases** (item 12): "one of the two hours it could have happened" says the hours ("At nine, Fritz was still at the Delmonico rooms, and it happened at nine or ten."); "none of the people with a reason" names them ("Zeldin saw none of Hanrahan, Winslow or Reinhardt at the Shamrock…"); the walk's hand-off asks the question ("I wanted to know who Tillman had passed on the way over at eleven."), with how I know the walk where the page hasn't said it.
- **The origin find** names the dead or the client, without a second "Whoever" (P9): "Before Carbone was given the chloral, somebody had been at the Delmonico rooms for it.", "Whoever let themselves into Mrs. Marchetti’s flat had been at Kowalski’s first." (P13: never "Mrs. Marchetti’s caller").

### 1.6 Witness answers (item 6, P2)

`tell.ts` (`spokenListLines`, `listByChange`) and the list voicings: a watcher who came on late starts from the shift ("On at ten. Anything earlier, I can’t say. Grasso … were in as long as I was."); nobody else is said up to the handover ("Nobody else came in before eleven. At eleven somebody came in with something under a coat…"); a lodger is in, never "came by" (flag `lives`, which the mid-hour forms now give way to); the one who stayed past the hour says so ("didn’t leave till after nine", beside "gone by nine").

### 1.7 Accounts (P7)

`tell.ts` and the CLAIM-SPAN voicings: no machine joins ("At nine I…"); alone in the hour's own clause ("At nine I went to the Automat for coffee and a newspaper, by myself."), before the why ("I went home alone, because my feet hurt"); company where I went on an errand was there, not along with me ("…to return a borrowed umbrella, and Thorndike was there"), in an hour's clause that ends there (a run that goes on keeps "with", or "…and Steinbach was there, and stayed through nine" would have Steinbach staying); company told by change in the evening's order ("Just me at nine. Hanrahan and Winslow came by at ten."); "with me from the time I sat down", never "the whole time" for a stretch; "I was still there at ten", never "I stayed till ten".

### 1.8 The turn (item 7, P6)

What I had, never the act of telling (the HOLD voicings): "I knew from Mrs. Sirkin who had come and gone. I had the evening as Grasso told it.", its verb kept when the rhythm parts it. Hard-boiled's turn says what's held, as docs/46 has it, and doesn't conclude.

### 1.9 The office (item 8)

A conversation, in the office's order: a question before each answer the client gives (`pages.ts`, the office's `lastBare`): "“And where were you tonight?” I asked.", "“Who else goes in and out?” I asked.", "“Who was there?” I asked.", and "he said" for "my client said" after the first.

### 1.10 Seams, cards and words

- **The report** (item 9): "the report" in narration and the decks, never "the form".
- **The epilogue** (item 10, `night.json`, `report.ts` `cHe`): "I told Kreuzer the whole of it. She listened…".
- **The client at the scene** (item 11) came to let me in ("Moretti, my client, had come on ahead to let me in…").
- **Nobody watching, once a night** (P8): the arrival's signpost once; after that the page says nothing of it.
- **The papers aren't a room** (P9): a papers search takes no card that stands inside the door, takes its hat off or goes round the room.
- **A print shop or an Automat isn't a hideout** (item 11): "There wasn’t anybody, which is the whole point of the place" only at a picture house or a back room.
- **Cards out** (P13, the jokes that missed and the clichés): "as if lists were something that happened to other people", "It’s no distance at all when somebody else is doing the walking", "which is the only speed tables can be gone over at", "as high up as the building went", "Moved more than I did all night", "as if the room had ears", "I let her finish whatever she was doing first", "I said it plainly.", "both hands in the lap", "Nobody had been through the papers at Dandridge’s place yet." (a menu hint), "The door was locked again.", "the Automat was the first place I’d ask about ten".
- **The designer's plain words** (batch 3): a story that checked out says "checked out" or the fact ("That much checked out.", "Some of his evening checked out: Wehrle saw him at eight.", "If Ashby said the same, the Palace checked out and the Delmonico rooms hadn’t.", "what she said the second time didn’t check out"); "put" isn't a noun and nothing is "put to" anybody in the page's prose; the game's unit never appears in it; nothing is "filed": the chrome says "Close the case", and so does the page ("I could face Bellucci with it, or close the case on what I had.", "Eight o’clock. The DA’s man was on the stairs, and I’d close the case on whatever I had."). The turn's offer keeps "face", which the confront button's new name agrees with.

## 2. The measures

MEASURES

## 3. The skim test

SKIM

## 4. The nights, read

NIGHTS

## 5. Open

OPEN
