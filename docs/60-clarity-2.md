# Clarity, build 2

*2026-10-24, branch `clarity-2`. Clarity-1 (docs/59) took out what was said twice, and the pages were still long: a 180-word page carried one or two new facts in staging, atmosphere, a flourish, a callback and a closer. This build is a texture budget, as a dial: per page one joke or flourish, one staging line, the arrival in two or three sentences of what the place is and who's there, and the rest goes, with the signposts clarity-1 cut said once, names over roles, a short turn, the stiff phrasings and seams of docs/59 §7, and Hard-boiled's thought back. `texture: 'lean'` is the default; `?texture=full` in the book, `--texture full` in `npm run read` and `npm run play -- new` write today's pages, byte for byte (§2). Gated by docs/58's skim test (§3) and a preference read (§4).*

## 1. What was built

Every rule below is behind `lean()` (`src/game/board/plan/dial.ts`), so `full` is main's page. Voicings that are lean's alone carry `"requires": [..., "lean"]` (more specific, so they win), and those lean can't use carry `"forbids": ["lean"]`; `fitting()` adds the `lean` flag to every composite in lean.

### 1.1 The texture budget (`plan/texture.ts`)

Every gap the writer puts carries what it is to the page (`tex`: keep, place, people, staging, ask, flourish, atmosphere, close, callback), by its slot unless the writer says, and whether it was dealt as a joke. After the situated deck, `budgetTexture` takes, in this order: the facts; the place in a sentence (two when the first is under six words) and who's there doing what, plainly (a line with a simile, or over 18 words, takes a card from the same draw that says it shorter; up to three people in one sentence, each to their first comma or simile; a simile said as its own sentence after what they're doing goes); one joke, a callback first when one is due; one staging line (the ask, on a page that asks; and a second only where nothing else on the page says whom I'm asking); the rest goes. A staging line with a simile in it is a flourish. What goes takes its set-up with it (`onDrop`: the office's clock, a street gag, a prop), so a later page never calls back to something the reader never saw. The visitor coming into the office stays (it's who the client's first "she said" is), and is the page's joke when it's dealt as one. The why-here keeps its reason and loses the card after it.

Raw 7, page 5 (Moskowitz's), before → after:

> Moskowitz’s was only round the corner, and I was there before I’d finished a thought. The cold had got into the gutters and frozen whatever was in them. / Moskowitz’s, a Romanian restaurant four steps down on Second Avenue, was still serving at this hour, because on Second Avenue nobody goes home until they’ve argued about something over a plate of food. The garlic in the air was thick enough to lean on, and a big samovar sat at the end of the counter, steaming quietly. / Hauck was going from table to table with a cloth over her arm, straightening chairs that were already straight. Mosley was finishing a plate of something… Bledsoe sat at a table by the mirror with a glass of tea, drinking it the old way, through a lump of sugar held in her teeth. / Rafferty had been at Moskowitz’s earlier in the evening, so I stood by the coat rack long enough to see who looked up, and then started on the room. Nobody sits down in a restaurant without the head waiter deciding where, and Hauck had been doing the deciding. / A chair scraped somewhere, and a waiter said something low in the kitchen. Somebody else laughed at it.

> Moskowitz’s was close by, no walk at all. / Moskowitz’s, a Romanian restaurant four steps down, was still serving at this hour, because on Second Avenue nobody goes home until they’ve argued about something over a plate of food. Hauck, the head waiter, was standing by the coats with a menu under her arm, Mosley sat at a table by the mirror with a glass of tea, and Bledsoe was finishing a plate of something with the care of somebody who had paid for it. / Rafferty had been at Moskowitz’s earlier in the evening. Nobody sits down in a restaurant without the head waiter deciding where, and Hauck had been doing the deciding.

(The street once: a place's description doesn't say the street a card says again further on in its sentence.) Callback pages fall with the budget, 61–71% → 2–7%: most callbacks were closers and flourishes, and a callback is kept only when it's the page's one joke.

### 1.2 Signposts, said once

- **A collision opens on a lead-in** (`leadIn`), one a page: "One thing didn’t fit.", "Something didn’t fit.", "One thing didn’t add up.", its own sentence when the collision's first is longer than four words, else a colon; never before a sentence that is already a signpost or already has its own colon. Raw 7, page 7: "She had said Moskowitz’s at ten, and Hauck hadn’t seen her there." → "One thing didn’t add up. Bledsoe had said Moskowitz’s at ten, and Hauck hadn’t seen her there."
- **Hard-boiled says "nobody had backed it up"** where a claim at the hours that matter has no witness, at docs/46's fact level: the thought is the account's own word at those hours (OWN-WORD `hours`), and where somebody does speak to that hour, only what they said ("said-only", opening on whose word it is). Hard-boiled 8, page 6: "Nobody else had said where Grasso was at nine and ten, when it could have happened." → "She said the Automat at nine and home at the Delmonico rooms at ten, and for nine and ten, when Carbone could have died, nobody had backed it up." The reason names the dead (or the pet) where the office gave two hours, so the thought names an earlier fact.
- **A put that won't land doesn't say beforehand that the line says otherwise**: "Winslow had told me the Velvet Room at eleven, and Kavanagh said otherwise." (Kavanagh's line said nothing of the sort) → "…, and I wanted to ask about something Kavanagh had said."

### 1.3 Names over roles (`plan/refer.ts`)

- A role only where the name was said earlier in the sentence or in the narration sentence before (a signpost like "Something didn’t fit." or my own "I said" between doesn't count), never a suspect's role and never a look ("the man in the camel coat"); my client and the dead once the page has named them. "close at the dentist’s elbow" → "close at Dr. Hirsch’s elbow"; "my witness" → the name.
- The two-names cap counts only the narrator outside quotations, and names still to come on the page (`aheadLean`, an object after "saw", "vouched for", "backed up"…). A third mention is a pronoun where it's clear, else the name; where the name would still be said a third time, a decoration that says it goes (a close, a flourish, a staging line), and the reference pass runs again, pressed from the start for whoever broke the cap.
- After a put that names somebody else of their sex, who answers is said by name: "“…Mrs. Mulcahy says she herself was at the Delmonico rooms at eleven o’clock, alone.” Steinbach was quiet a moment…", not "She was quiet a moment". The put keeps how they take it (both preference readers missed it gone, §4), and the witness line names the story that didn't hold rather than them a third time: "Vogel could say whether that held any better than the Delmonico rooms had."
- A situated card's `{role}` is the name; its second `{role}` is a pronoun.

### 1.4 The turn, short

The turn is one paragraph: the hour and why (where it came from, or who knew the way in for a small case), who's accounted for and by whom (at least one), whose story doesn't hold, and what's open. Its clauses are ordered by that, and past 70 words at Raw to Poached and 90 above, who said where they were with nobody to back it goes first, then who was accounted for (the last first, one always stays), then where a small case's thing went (the list page said it, and isn't said again in a turn on the page that heard it). The collision is said plainly ("At ten, Bledsoe said Moskowitz’s, and Hauck said otherwise."), never "In the notebook I had Bledsoe down for … on her own say-so, and right beside it what Hauck had told me, which said otherwise"; the turn's opener (how I sat down to it) is a flourish; the what-next for a walker says the walk before who was passed. Raw 7's turn, before → after:

> I folded my hands on the tablecloth like a man saying grace, and went back to the start of the night. / It was ten o’clock when it happened. The revolver had come from Mrs. Nagy’s, so whoever used it had stopped there first. Mosley was at Moskowitz’s at ten; Hauck said so. In the notebook I had Bledsoe down for Moskowitz’s at ten, on her own say-so, and right beside it what Hauck had told me, which said otherwise. I didn’t know where Reinhardt was at ten: he hadn’t said, and nobody else had either. / I could face Bledsoe with it now. Or I could find out first from the landlady at Mrs. Nagy’s who’d been in. / The place had the after-supper smell of onions and coffee and a mop that had already been round once.

> It was ten o’clock when it happened. I knew where the revolver came from: Mrs. Nagy’s. Hauck said Mosley was at Moskowitz’s at ten. At ten, Bledsoe said Moskowitz’s, and Hauck said otherwise. I still didn’t know where Reinhardt was at ten. / I could face Bledsoe with it now. Or I could find out first from the landlady at Mrs. Nagy’s who’d been in.

The recap is 74 words → 42.

### 1.5 Stiff phrasings and seams

- **"present all evening, start to finish"** and the other careful and terse long forms: "Reinhardt and Crowninshield were present all evening, start to finish." → "Reinhardt and Crowninshield never set foot outside all evening." No "went out after." with nothing after it, no "then gone".
- **"I did not look again after that"** → "I didn’t look again after that."
- **The fragment "With the lamp behind her."** (a tail parted into a sentence of its own): lean parts a tail only at "like", "as if", "which" and "the way", and a people line drops a simile at its end. "Crowninshield stood on the landing in her stocking feet. With the lamp behind her." → "Crowninshield stood on the landing in her stocking feet, with the lamp behind her."
- **The street twice in an arrival**: once (above).
- **A pet by name with no kind**: its first mention in a page's thought says what it is: "At ten, one of the two hours it could have happened, Fritz was still at the Delmonico rooms." → "…, Fritz, the dachshund, was still at the Delmonico rooms."
- **Somebody in a list twice for two stints**: the second is a pronoun that "came back at nine", which the round trip reads back to them.
- **A return visit that says its company again**: "…, with the same people".
- **A watcher named, then waited for by their job** ("I went straight over to Renfro. I found a space at the bar and waited for the bartender.", she is the bartender): a situated card's `{role}` is the name (§1.3). The face ask names whom I asked ("I went over to Doyle. “Wojcik saw you at the flats over Lipsky’s at seven…”"), and the newcomer is named, never "my witness".
- From the skim readers (rounds 1 and 3): the papers' dead by what they were ("the dead woman’s old rival"), the poison's delay its own sentence, "says she herself was" where speaker and accused are both women, "the people with a reason" for "the people I was asking about", no "So" after a story that didn't hold, a why-here that said the sighting isn't agreed with again ("Callahan had seen Hauck at the Orpheum at nine and ten." then "So Hauck and Callahan agreed…"), and two pointers whose second "he" could be either man are one ("Ashby had said he was with Bernstein at ten, and that he was at Moskowitz’s…").

### 1.6 Hard-boiled's thought, and the list smell

Hard-boiled's thought names an earlier fact on every job page again (70% → 100% dealt, 67% → 100% in the neighbourhood: §1.2), and the list smell is at or under clarity-1's starting levels (§2). The rhythm pass runs again after the budget (what went leaves runs side by side), "by then" may start its own sentence, the turn's notes don't join, and the newcomer and the spare key's find say it short ("Hanrahan was at a table by the wall.", "Nothing was forced.").

## 2. The measures

30 nights a tier, both worlds, along the oracle's route unless it says; "before" is a copy of main (89129e7, `other-liar` merged) read with this build's measures (`--root`), "after" is this build in lean.

| world | tier | words a page (median) | words per new fact | list smell, pages (oracle) | turn recap, words (median [most]) | callback pages |
|---|---|---|---|---|---|---|
| dealt | Raw | 181 → 109 | 105.0 → 66.2 | 28 → 9 of 280 | 56 [82] → 41 [53] | 67% → 7% |
| dealt | Coddled | 181 → 102 | 104.7 → 62.6 | 21 → 4 of 276 | 85 [100] → 46 [64] | 68% → 5% |
| dealt | Poached | 177 → 111 | 92.2 → 58.7 | 32 → 19 of 398 | 88 [106] → 50 [68] | 62% → 6% |
| dealt | Soft-boiled | 174 → 110 | 85.3 → 54.3 | 46 → 25 of 383 | 109 [134] → 69 [89] | 63% → 6% |
| dealt | Medium | 167 → 104 | 80.3 → 51.5 | 65 → 44 of 439 | 110 [146] → 68 [86] | 64% → 7% |
| dealt | Hard-boiled | 163 → 98 | 77.5 → 48.8 | 55 → 13 of 435 | 41 [51] → 44 [51] | 61% → 7% |
| neighbourhood | Raw | 212 → 124 | 112.4 → 70.7 | 44 → 15 of 280 | 54 [81] → 42 [50] | 71% → 4% |
| neighbourhood | Coddled | 207 → 114 | 114.3 → 67.9 | 27 → 13 of 276 | 83 [105] → 47 [67] | 70% → 2% |
| neighbourhood | Poached | 197 → 121 | 95.5 → 59.9 | 62 → 36 of 407 | 87 [115] → 54 [68] | 62% → 6% |
| neighbourhood | Soft-boiled | 208 → 128 | 94.3 → 59.2 | 50 → 54 of 385 | 112 [131] → 71 [89] | 65% → 4% |
| neighbourhood | Medium | 200 → 118 | 91.3 → 56.9 | 85 → 61 of 437 | 119 [143] → 73 [87] | 64% → 6% |
| neighbourhood | Hard-boiled | 196 → 113 | 88.2 → 54.5 | 50 → 48 of 435 | 44 [53] → 45 [57] | 63% → 6% |

Words a page fell 37–45%, and words per new fact 36–41%. The turn's recap is within docs/60's 70 words (Raw to Poached) and 90 (above) on every night, from 10–60% of nights (Hard-boiled's was already short, docs/46). List smell is at or under clarity-1's starting levels (dealt Raw 9, Medium 51, Hard-boiled 29; the neighbourhood's Raw 34), and under main everywhere but the neighbourhood's Soft-boiled (54 to 50, §6). The rest held:

- **`texture=full` is main, byte for byte**: `scripts/texture-full.ts --texture full --against` main's hashes, every page's blocks and the notebook along the oracle's, the wanderer's and the reader's routes, 30 nights a tier, both worlds: 0 of 15,813 differ (`cbb9379fb3ce556c` both).
- **Round trip and clarity** (`scripts/roundtrip.ts --nights 30 --routes oracle,wanderer,reader`): every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% on every tier in both worlds. The flesh column's misses are Miss Nowak naming Mrs. Rafferty, as before (6 and 4 units).
- **board-prose**, 30 nights, both worlds: every lint 0 at every tier (names said three times, clues three times, place names bolted on, signposts, gags, the pet as "it", the grid, posture, knocking, engine words, repeats, hour slots, continuity, tics, assembly); reader lint, correspondence, levels and plain terms 0; pronoun ambiguity 0 on the oracle's route and on all three; cards twice and sentences twice 0. Hard-boiled's "job pages with a thought naming an earlier fact" is 100% in both worlds (main 70% dealt, 67% neighbourhood); every other tier stays at 100%.
- **The claudisms gates** (`scripts/claudisms.ts --gates`) hold: one simile frame a page, each night tic once, a running gag twice at most.
- **Jargon**: plain terms 0, engine words 0 (board-prose; the suite's no-jargon).
- **Dealt boards** hash the same, seeds 1–40, every tier and type, both worlds (dealt 600 `b906a1009c23fe86`, neighbourhood 600 `af89ea961f7168e1`): no generator change.
- **board-measure** (`--seeds 20`, this tree against main's copy): every puzzle column unchanged (the oracle, the wanderer, the reader, the shortcuts and the confession route, the other liar, lint issues 0, plain-terms hits 0, choices a page); only "callback pages" moves (54–68% → 6–9%).
- **The suite**: 773 tests, 27 files, pass (`npx vitest run --minWorkers=1 --maxWorkers=3`). Tests that hold the planner's own rules on a page (the reference pass's, the aggregation's, the rhythm's, docs/52's golden page, the bible's, the situated keys, the voice kit's script) read it in `full`; where a test reads a lean page it accepts lean's forms.

## 3. The skim test

`scripts/skim-test.ts`, as docs/59 §3: 24 job pages a round (four each of the office, accounts, lists, finds, puts and turns, twelve a world, every tier four times), each as main (89129e7, with `other-liar` merged) and this build write it from the same night, three questions each read off the engine's facts, two blind readers one at a time, each reading every page once, half in each build, crossed; then the sentences they had to read again. Gate: after's accuracy at least before's, and the sentences flagged cut by half. Four rounds, each on nights no other round read, each after a build that fixed by rule what the round before stopped on:

| round | nights | build | before: right | after: right | before: flagged | after: flagged | gate |
|---|---|---|---|---|---|---|---|
| 1 | from 1000 | 41d4a83 | 67 of 72 (93%) | 66 of 72 (92%) | 19 | 11 (−42%) | fail |
| 2 | from 2000 | 3a2c5c9 | 68 of 72 (94%) | 68 of 72 (94%) | 21 | 10 (−52%) | **pass** |
| 3 | from 3000 | aab9ac4 | 69 of 72 (96%) | 69 of 72 (96%) | 17 | 12 (−29%) | fail |
| 4 | from 4000 | bf32d44 | 70 of 72 (97%) | 70 of 72 (97%) | 23 | 11 (−52%) | **pass** |
| all | | | 274 of 288 | 273 of 288 | 80 | 44 (−45%) | |

The gate passed in rounds 2 and 4 and not in 1 and 3. Accuracy was even in three rounds and one question the other way in round 1. The flags fell in every round, by 42%, 52%, 29% and 52%; on pages this build wrote at 151–168 words where main wrote 216–255 (rounds 1 to 4: 255 → 168, 244 → 160, 216 → 151, 242 → 157). What the rounds stopped on in this build's pages, and what came of it:

- **Round 1**: the papers' dead by pronoun ("…, and she…" where the suspect was a woman too), the poison's delay inside a long sentence, "says she was" where the speaker and the accused are both women, "the people I was asking about", the walk said after who was passed, "So" after a story that didn't hold, a small case's turn without who knew the way in. All fixed for round 2 (2c36d4e).
- **Round 2**: an ask to their face that didn't say whom I asked, and "backed him up for at". Fixed (3a2c5c9).
- **Round 3**: the why-here of a put that didn't land saying the line "said otherwise" (twice), "Hanrahan was in at seven and went out after.", "Lathrop was with me from the start till ten, then gone." (both builds), the turn's access line, and lines both builds share: the bible's "“The spirits say no…”", "none of the people with a reason was at the Lyric", "So Glick backed her up: …, though nobody else had said…". Fixed by rule for round 4 (bf32d44): §1.2's put, no "went out after." and no "then gone".
- **Round 4**: in this build's pages, "Mosley says she herself was at the Kit Kat at ten o’clock" (main's "says she was" stopped a reader on the same page), "none of the people with a reason was at the Kit Kat" (one reader thought it contradicted a suspect seen there), "Teitel had walked from Steinmetz’s to Rafferty’s at nine." (both builds), the turn's access line, two lines of company ("Dr. Hirsch was with me at first and left after nine.", "Mrs. Blau joined me at eight and stayed…"), a staging line and a bible line. In main's: the deck's staging and closers ("I stopped him at the turn of the stairs, one step below…", "He didn’t look away, and didn’t look sorry…"), "I went straight over to Fairbanks.", "Whatever went out had to go somewhere.", the told-by-change list forms this build replaced, and the bible's voice lines.

A third to a half of each round's flags in this build are sentences main's page has too (the bible's voice, the elimination's "one of the two hours it could have happened", "none of the people … was at", the walk hand-off); those are §6.

## 4. The preference read

`scripts/bones-read.ts` (pick, dump, pair, score): twenty pages from this build's nights (accounts, lists, puts, offices, finds, motives, turns, arrivals), each as main and this build write them, side by side in an order the reader can't know; two blind readers, one at a time, asked which page is easier to follow and still sounds like the game. Read on 3a2c5c9.

**This build: 18 of 20 with the first reader, 19 of 20 with the second (37 of 40, 93%)**; the gate was 60%. Their reasons for this build's pages: the names said outright ("names Pickering as the one asked"), no stray sentence about somebody who isn't in the scene ("Doyle on the stairs who comes from nowhere", "a dead palm in a lobby"), no images to stop on ("the cup was lighter than my head", "a radiator line that has nothing to do with anything"), no "sat down twice", and the turn crisp. Main won pair 2 (Poached, a put: both readers) and pair 15 (Soft-boiled, a put: the first reader), each for the same thing: how they take it said who answers ("the sleeve-smoothing beat tells you who is speaking", "Version 2 marks who is speaking (the shrug)"). The put now keeps it (16dd41a, §1.3).

## 5. The four nights, read

Read in full, page by page, in lean, after the last change: `npm run read -- --seed 7 --tier 0 --type murder --no-choices` (Raw 7), `--seed 7 --tier 4` (Medium 7), `--seed 8 --tier 5 --type murder` (Hard-boiled 8), `--world neighbourhood --seed 5 --tier 4 --type murder` (the neighbourhood's Medium 5). Words a page (prose, notebook and choices out), main → this build: Raw 7 192 → 126, Medium 7 181 → 115, Hard-boiled 8 180 → 120, the neighbourhood's Medium 5 213 → 132.

Raw 7, page 6, before → after:

> Hauck was the one I wanted to talk to. I went up to the head waiter with my hat in my hand and said I wanted a word, not a table. / I asked who’d been in tonight and when, and said I’d trust her memory over the bill spike. She nodded toward the tables, as if the tables could help, and gave me the night in the order it came through the door. / “Mosley and Hanrahan were at a table all evening. Bledsoe ate at eight and left. Rafferty came in at nine, like every night, and was gone by ten. That was everybody.” / So at ten, when Rafferty died, Mosley was still at Moskowitz’s, and by then Bledsoe had left. / I found Hanrahan at a table by the wall, behind a menu. / I could have used a glass from the samovar. I could have used a lot of things.

> I asked Hauck for everybody she’d seen tonight, in order, and nobody left out because she liked them. / “Mosley and Hanrahan were at a table all evening. Bledsoe ate at eight and left. Rafferty came in at nine, like every night, and was gone by ten. That was everybody.” / So at ten, when Rafferty died, Mosley was still at Moskowitz’s, and by then Bledsoe had left. / Hanrahan was at a table by the wall.

Its turn is §1.4. What the read found, all fixed by rule before the measures: the office without the visitor coming in ("“Carmine Russo,” he said" with nobody in the room yet: the entrance had gone as staging); a search page that opened on a simile ("A missing thing leaves a gap in a room, the way a pulled tooth leaves one in a smile.") beside its closer's joke; "on Second Avenue … because on Second Avenue nobody goes home"; Medium 7's put naming Steinbach three times once how she took it stayed, and the "She" of "She was quiet a moment" after "Mrs. Mulcahy says she herself was…" (§1.3); and the turn dropping the last person accounted for to make its words, which it doesn't now.

## 6. Open

In docs/25 too.

- **The skim gate passed in two rounds of four** (§3). What still stops readers, mostly in both builds: the elimination's "At ten, one of the two hours it could have happened, Fritz was still at…", the list's "None of the people with a reason was at the Kit Kat at nine or ten" (whom it means, and whether a suspect seen there contradicts it), a walk's "Teitel had walked from Steinmetz’s to Rafferty’s at nine.", the access line "Sweeney hadn’t been at the Delmonico rooms while the revolver was in the hall-stand drawer, as far as anybody had told me", a put's "Mosley says she herself was at the Kit Kat at ten o’clock" (the breaker said to their face), and the bible's own lines ("Eight, I want my supper.", "“The spirits say no, and for once I agree with them,” she said."). Each wants a plainer form, by rule, with its reader.
- **Callbacks** fell from 61–71% of pages to 2–7%: a callback stays only as the page's one joke, and the set-ups that went took their pay-offs with them. Whether the night wants more of its running gags back, at the cost of a joke elsewhere, is the designer's call.
- **The office** is still the longest page (265–313 words in lean): its given lines are facts, and the budget only takes its texture.
- **"That much held."** can stand alone after a put's agreement went as said once (round 3, a Coddled account: the why-here had said Margolis's line); it should go with the agreement, as it does after a face ask.
- **List smell in the neighbourhood's Soft-boiled** is 54 pages of 385, beside main's 50 (every other tier and world is under main and under clarity-1's start).
- **Hard-boiled's turn** answers fewer of the skim questions by design (docs/46): it doesn't say who collides or where the way in was learned.
- **The verdict's epilogue** still names the client twice in a sentence ("I took Steinbach through it over coffee, and Steinbach listened…"); it's the report's, which this branch stayed out of.
- **Miss Nowak's admission** still names Mrs. Rafferty (the round trip's flesh misses, as before this build), and a chloral scene still has the dead "in the chair with both hands in the lap" (both builds).
