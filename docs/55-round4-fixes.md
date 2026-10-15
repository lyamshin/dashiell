# Round 4: what four blind playtesters found, fixed

*2026-10-15, branch `round4-fixes`, after #88 (bones-2). Four blind testers played one night each through `npm run play`: Raw 11 (a gold watch), Poached 5 (a murder, laudanum), Medium 14 (a dachshund) and Hard-boiled 8 (a murder, chloral). All four solved, and Poached and Hard-boiled got the why right this time. All four called the voice "about right", with one shared caveat: the narrator's reasoning lines sat a notch too high, oblique or flat exactly where the player needed them plain. Docs/53, the dial, governs everything below.*

*The puzzle didn't move: the dealt boards hash the same before and after (seeds 1–40, every tier and type: `b3c9a36e…` dealt, `be1c6127…` in the neighbourhood).*

## Per item

| | item | status | in one line |
|---|---|---|---|
| 1a | the list's thought says who went out | done | After a watcher's list, the thought says the list at the hours that mattered whole and who had been there the hour before and gone out (`thought.ts` `goneFrom`, LIST-HOUR `gone` voicings): "At ten, the hour that mattered, Mrs. Kowalski’s list had Rafferty and Moretti at Kowalski’s and nobody else; Steinbach and Bellucci had been there at nine and gone out after." |
| 1b | the hand-off names the person and the question | done | The walk hand-off is said whole, never traded for texture: "Pickering had walked from the Delmonico rooms to the chop house at ten. I wanted to know who she’d passed on the way."; the oblique hand-off cards ("the place behind them", "that ground for myself") are cut; the turn's what-next says "who" Pickering passed. |
| 1c | the thought never contradicts the grid | done, linted | Texture that says a story stood up, or that nothing went against it, isn't dealt where the page's person has a collision held, nor after a fact on one word; the own-word aside has its own lines when a collision is held. New lint `grid`. |
| 1d | places named the same way | done | The first "home" a page says of somebody whose home isn't called after them says which place it is ("Grasso said home, the Delmonico rooms, at ten"; `home.ts`); the picker says "home (the Delmonico rooms)"; "home at Thorndike’s flat" is "home". |
| 1e | no "It turned out X was…" for somebody there all along | done, linted | PRESENT voicings say "X was in the front room, in the good chair, and had been all along"; "it turned out" only for one who came back in. New lint `turned-out`. |
| 2 | fact slips and continuity | done (most), partly (two) | "now Fritz was gone" (and "in a basket by the stove"); the office's pointer is said once (no second "asked twice where Fritz sleeps"); a reason names nobody the account doesn't have ("coffee with Sokol"), and no "after all"; "across from Pickering"; posture and "already inside" held across a room's pages (situated deck, the hand's avoid, new lints `posture` and `inside`); the papers' page says "the dead man’s own testimony"; "news to me" is "the papers had it already" once the papers are read; "come from the Delmonico rooms"; "nobody else" is "besides Pardo" on the first hour that says it; the office pointer's reason that says "her" names her whole the first time ("from Carmela Grasso"); the clarity check fails an account voicing that says "with X" for anybody its bones don't have with them. Partly: "my witness" stays where a name would be said a third time; the scene's "the spare lives in the sugar tin" and the find's say it in two composites. |
| 3 | refusal pages point somewhere | done | After a refusal the thought names a watched place from the liar's own story, at the nearest hour, whose list isn't held yet ("She’d told me the Automat at nine, and if she wasn’t home at ten, the Automat was the first place I’d ask about ten"), read off their own story the same way, guilty or not; six voicings, three home and three away, no two alike; the refusals' speech no longer shares "where I was is my business". |
| 4 | stars name the person and the question | done | "ask Pickering who she passed on the way over at ten"; a starred walk says its reason once (the note gives way when the reason names the place it's on: "the Delmonico rooms — where the laudanum came from; ask the landlady who was there"); Medium stars the question in the room with them, not only the walk; the CLI's person row says "ask who…". |
| 5 | the report doesn't hand over the end | done | "Lines that touch X's own story" now means the lines at the hours that mattered from any place their own story names, in the order held, so the breaker is one of several and not first by rank; remarks and a crack are quoted in the page's own words ("Me. I took it." on the page and in the form). |
| 6 | variety across nights | done | The profile keeps what each of the last ten nights dealt (cards, voicings, asides); the hand, the voicings' chooser and the situated deck prefer what none of them dealt, and never deal last night's while another fits; a look card (and the pay line it brings: the coat off a rack, promoted to furniture, banks spending less carefully) isn't dealt two nights running even where it's the only fit. Page-ending "thing with feelings" closes are held to half a night's pages (`plan/closers.ts`). The CLI takes `--profile F`. |
| 7 | small ones | done | "free · 2 questions"; the office asks where the dead man had been before the client answers; "the police called it his heart; the coroner… didn’t agree" when the client's line has the coroner; the turn's heading is "The turn"; the curtain says "par 13: 7 questions, the motive search and 5 walks"; the widowed client keeps her "Mrs."; nobody is "found dead". |
| 8 | the testers' Part B edits | done | 103 edits: 86 applied or adapted, by card or template (36 card texts edited and 11 cards retired across eight content files; 41 voicings added and 26 rewritten, 1,203 → 1,244), 17 skipped (below). |

## The three reasoning lines, before and after

- Raw 11, Mrs. Kowalski's list. Before: "I went down Mrs. Kowalski’s list with my pencil, an hour at a time, and it said Rafferty was at Kowalski’s at ten." After: "At ten, the hour that mattered, Mrs. Kowalski’s list had Rafferty and Moretti at Kowalski’s and nobody else; Steinbach and Bellucci had been there at nine and gone out after."
- Hard-boiled 8, Grasso's evening. Before: "Grasso said the Automat at nine and home at ten, and nobody else had said so. I had nothing to put against it and nothing to put under it, so I put it on the page and left it alone." After: "Grasso said the Automat at nine and home, the Delmonico rooms, at ten, and nobody else had said so. I wrote it down." And after her refusal, before: "But if she wasn’t home at ten, she was someplace else, and somebody would have seen her; if nobody had, that told me something too." After: "But she had told me the Automat at nine, and if she wasn’t home at ten, the Automat was the first place I’d ask about ten."
- Medium 14, the hand-off. Before: "Pickering had walked from the Delmonico rooms to the chop house at ten. So far I had only words on a page. I wanted the place behind them." After: "Pickering had walked from the Delmonico rooms to the chop house at ten. I wanted to know who she’d passed on the way."

## Measures

`npx tsx scripts/board-prose.ts [--world neighbourhood]`, 30 nights a tier, the oracle's route (the lints over all three routes). Before is main at `a2d915e`; the four new lints' before figures are main's pages read by this branch's lints.

**Dealt**

| tier | words a page, median | list smell (oracle) | joins a page [share 1–3] | sentences per fact unit | prose lints | thought against the grid | "it turned out" | standing after sitting | knocking inside |
|---|---|---|---|---|---|---|---|---|---|
| Raw | 196 → 196 | 15 → 16 of 280 | 1.1 [74%] → 0.7 [53%] | 1.49 → 1.50 | all 0 → all 0 | 12 → 0 | 84 → 0 | 29 → 0 | 0 → 0 |
| Coddled | 196 → 189 | 6 → 7 of 276 | 1.0 [64%] → 0.7 [53%] | 1.49 → 1.50 | all 0 → all 0 | 8 → 0 | 18 → 0 | 26 → 0 | 0 → 0 |
| Poached | 185 → 186 | 22 → 22 of 398 | 1.1 [79%] → 0.8 [70%] | 1.49 → 1.50 | all 0 → all 0 | 17 → 0 | 8 → 0 | 50 → 0 | 6 → 0 |
| Soft-boiled | 184 → 185 | 27 → 28 of 383 | 1.1 [73%] → 0.9 [67%] | 1.47 → 1.48 | all 0 → all 0 | 14 → 0 | 5 → 0 | 31 → 0 | 4 → 0 |
| Medium | 178 → 176 | 34 → 40 of 439 | 1.2 [70%] → 1.1 [71%] | 1.43 → 1.44 | all 0 → all 0 | 2 → 0 | 10 → 0 | 105 → 0 | 9 → 0 |
| Hard-boiled | 179 → 178 | 31 → 31 of 435 | 0.1 [12%] → 0.1 [12%] | 1.46 → 1.48 | all 0 → all 0 | 7 → 0 | 15 → 0 | 51 → 0 | 4 → 0 |

**The neighbourhood**

| tier | words a page, median | list smell (oracle) | joins a page [share 1–3] | sentences per fact unit | prose lints | thought against the grid | "it turned out" | standing after sitting | knocking inside |
|---|---|---|---|---|---|---|---|---|---|
| Raw | 223 → 223 | 22 → 25 of 280 | 1.1 [75%] → 0.6 [54%] | 1.63 → 1.65 | all 0 → all 0 | 7 → 0 | 76 → 0 | 14 → 0 | 0 → 0 |
| Coddled | 216 → 216 | 22 → 21 of 276 | 1.0 [68%] → 0.7 [54%] | 1.55 → 1.58 | all 0 → all 0 | 4 → 0 | 24 → 0 | 5 → 0 | 0 → 0 |
| Poached | 207 → 208 | 35 → 37 of 407 | 1.1 [79%] → 0.8 [69%] | 1.53 → 1.54 | all 0 → all 0 | 10 → 0 | 10 → 0 | 15 → 0 | 2 → 0 |
| Soft-boiled | 207 → 205 | 36 → 34 of 385 | 1.0 [71%] → 0.9 [67%] | 1.49 → 1.50 | all 0 → all 0 | 17 → 0 | 3 → 0 | 10 → 0 | 2 → 0 |
| Medium | 205 → 201 | 56 → 54 of 437 | 1.1 [71%] → 1.0 [68%] | 1.44 → 1.45 | all 0 → all 0 | 6 → 0 | 13 → 0 | 56 → 0 | 6 → 0 |
| Hard-boiled | 210 → 209 | 43 → 38 of 435 | 0.1 [12%] → 0.1 [12%] | 1.54 → 1.55 | all 0 → all 0 | 4 → 0 | 14 → 0 | 26 → 0 | 4 → 0 |

- **Every prose lint is 0, in both worlds,** the four new ones included. ("Sentences twice" caught the walk hand-off said twice in one neighbourhood Medium night; it's said one of three ways now.)
- **Joins a page fell at Raw to Poached** (1.0–1.1 → 0.6–0.8). It's read off the composites, and the joins it lost are the list page's placements ("count", "with"), which were the testers' complaint ("…and it said Rafferty was at Kowalski’s at ten"), and the list's agreement for somebody who went out ("same"), which the who-went-out sentence now says in its place, once, so a name isn't said a third time. The new sentence carries a contrast ("…; Steinbach and Bellucci had been there at nine and gone out after") that the measure doesn't count as a join. The thought paragraphs within ceil(N/2) sentences fell for the same reason (0.80 → 0.75 on the plan test's nights; the test's floor is 0.70 now).
- **The round trip and the clarity check: 100%.** 4,431 of 4,431 plain pages, and 15,126 of 15,126 voiced composites read back and are clear, in both worlds (30 nights a tier, the oracle's route). The clarity check now also fails a voiced account that's with somebody its bones don't have.
- **`board-measure`, 50 seeds a tier and type: every puzzle column is the same** (oracle, par, shortcuts, wanderer). The one change is Medium's reader, which follows stars: with the question starred in the room (item 4), "the liar did it" reader columns rose (naming the first liar it caught 22% → 26%, anybody with access 23% → 29%, a liar at random 45% → 56%, the last liar 60% → 74%); "reader files solved" stays 0%. That is the help the Medium tester asked for, measured; it's the designer's call whether Medium should keep it (docs/25).
- **Variety across nights** (`scratchpad` script, nights in a row with and without the profile): the testers' four nights three times over, texture cards dealt again the night after 14.1% → 2.9%, the three remembered lines two nights running 14 → 0; twenty nights (seeds 200–219, every tier) 13.1% → 2.4%, 9 → 0. Page-ending things with feelings: 36% → 34% of pages on 30 nights a tier (the cap holds a heavy night like Hard-boiled 8's, which ran past half, to half).

## The testers' nights, read in full

All four nights were replayed from the testers' saves and read page by page after the change. Of the flagged lines, the ones the edits target are gone; still on the page by design or as leftovers: Raw's elimination ("One person was still standing…", "I could put it to Bellucci now", docs/46's teaching tier), "I hadn’t come for the furniture" (a round-3 keep, once a night), the scene's and the find's two sugar tins, "At nine it was just me" (a company tail the reader parses), "with Abramowitz and Thorndike about the house", "From there to the same door as before" (docs/25's return-page rule), and Poached's "his list" for Zeldin's (the reference pass).

## Played by hand

Hard-boiled 8 by hand through the CLI, by another route (straight to the Delmonico rooms, the landlady's list, Grasso's evening): the list's thought said "Grasso had been there at eight and gone out after"; the picker said "Grasso says home (the Delmonico rooms) at ten"; put to her, Grasso refused ("I told you where I was at ten… I didn’t kill anybody"), and the page ended "she had told me the Automat at nine, and if she wasn’t home at ten, the Automat was the first place I’d ask about ten". The Automat's cashier came on at ten and had Grasso there: one call cleared her, the call the tester never knew to make.

## The blind read

Twenty pages, both worlds and every tier (seven lists, six accounts, three puts, two offices, a motive, a search), each written by this branch and by main from the same night, in random order and unlabeled. Two readers, one at a time, on "which is clearer and still sounds like the game", in that order. **This branch was preferred in 33 of 40 (83%): 16 of 20 and 17 of 20.**

- Where it won: the list said whole at the hour that mattered with who had gone out, "besides Pardo" on a watcher's list, "home, the Delmonico rooms", "The turn" over a heading that didn't fit its page, and fewer pronouns that could be two people.
- Where main won: the office naming "Frieda Kahane" where the case says "Miss Kahane" (both readers; fixed: a titled name keeps its title), a refusal pointing at a list already held (one reader; fixed: it points only at a list not held yet), and two texture differences (a closing line, a staging line).

## Skipped (17)

Raw 11 #2 (Raw's walk to the culprit is docs/46's), #5 and #8 (the scene and the find are two composites, each must say the way in), #26 (a round-3 keep). Poached 5 #9 (the scene's "already on them"), #11 (the careful manner's "To begin at"), #12 (the arrival's pointers), #13 ("just me" is the company tail the reader parses), #16 (the reference pass's "his list"), #20 (an admission and its check, two composites). Medium 14 #13 (the party find's facts), #14 (as Poached #20), #18 (the return's walk), #24 ("The Hauck flat lay…" is a walk frame), #26 (the arrival's pointer and texture), #27 (the story's tense, the generator's words). Hard-boiled 8 #17 (the company tail "about the house").

## Tests

**726** (was 710), all passing, at three workers (about 90 s). `tsc` is clean and `npm run build` works. New: `test/round4.test.ts` (16): the list's who-went-out, the refusal's pointer, the hand-off, the four new lints catching what the testers flagged, home naming, "besides Pardo", the basket and the client, the office's ask and no "found dead", the widow's title, Medium's star, the report's order and its quotes, the curtain's par, the CLI's "free · 2 questions", and the profile keeping the remembered lines off two nights running and the closer cap. Updated: the hand-off and Medium star tests (item 4), the plan test's composition floor (above).

## What's open

See docs/25, "Round 4 (docs/55)".
