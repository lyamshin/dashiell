# Claudisms, and the builders' words on the page

*2026-10-15. The designer: "an independent pass for any other claudisms / internal jargon leaking through." docs/53 set the dial and banned the engine's nouns in narration; this pass goes looking for what else gives the book away: the tics of model-written prose (A), and the words the builders use for their own machinery that reach the player (B).*

Everything here was measured on **rendered output**: 36 nights (tiers Raw to Hard-boiled, the dealt city and the neighbourhood, murder, lost pet and lost thing at the tiers that build them; 447 pages), each read along the oracle's route, with its choices, notebook and grid, verdict, story and curtain, plus the book's own strings (title page, teach page, rules, report form, picker, grid key) and `npm run play -- help`. The lint that counts it is `scripts/claudisms.ts` (§4). Counts are **before** this pass unless marked; §3 has before and after.

Two things a reader should know about the numbers:

- **A tic is a rate, not a sighting.** One "as if" is a simile; five a night, a third of all pages, is a voice the player starts to hear through. The tables give hits a night, the share of pages with one, and how many of the 36 nights it shows on.
- **Repetition across nights is its own tic.** A line a player meets every night ("I hadn't come for the furniture", 32 of 36 nights) reads as the machine even when the line is fine. §1.2 lists the stock sentences.

## 1. A: the claudisms

### 1.1 By frequency

| id | tic | a night | pages | nights | where it comes from (share of traced hits) | status |
|---|---|---|---|---|---|---|
| A02 | simile frames: "as if", "like a/somebody", "as though" | 5.0 | 32.7% | 35/36 | situated 26%, places 21%, voicings 8%, bible places 8% | next pass (cap) |
| A21 | ", which is …" tag-on comment | 3.5 | 23.0% | 36/36 | situated 35%, voicings 19%, bible places 10%, walk 8% | partly fixed |
| A01 | "the way you'd / people / a man …" simile | 2.6 | 18.8% | 35/36 | situated 59%, voicings 15%, people 10% | next pass |
| A29 | stock beats every night: "I hadn't come for the furniture", "From his post …", "I wrote it down", "with my hat in my hand" | 2.4 | 18.8% | 36/36 | still 41%, world.ts 35%, situated 16%, telling 8% | half fixed |
| A18 | "plain/plainly", "proper/properly", "honest" as filler | 2.0 | 14.8% | 30/36 | situated 59%, connective 17%, bible 11% | next pass |
| A22 | the colon-fronted aside: "Holding a fork up to the light: I didn't interrupt him." | 1.7 | 13.6% | 17/36 | world.ts `lastSeen…` + pages.ts `staying()` 100% | next pass |
| A09 | "a little" | 1.6 | 11.9% | 27/36 | places 44%, situated 28% | mostly literal; leave |
| A19 | sentence-initial "So …" | 1.3 | 10.5% | 36/36 | voicings `window-means/*` 77% | next pass |
| A25 | aphorism openers: "A man's papers are where …", "Some rooms you look at." | 1.1 | 8.3% | 24/36 | thread.ts `pointerSaid` 44%, situated 37% | next pass |
| A08 | objects with feelings: "the gutters had given up", "ticking to itself", "the drawer had never had company" | 1.1 | 8.5% | 25/36 | places, connective, situated, people | partly fixed |
| A17 | the narrator announcing his narration: "Here's what I had." | 1.1 | 8.5% | 36/36 | pages.ts `writeTurn` 95% | next pass |
| A06 | polysyndeton: "X, and Y, and Z" | 1.0 | 7.8% | 27/36 | situated, voicings `list/plain-whole-next-5`, chr-503 | partly fixed |
| A23 | the punchline "the only one / thing / way" | 0.9 | 6.9% | 24/36 | situated 47%, office, places | next pass (cap) |
| A24 | "all of it / all of them" as a closer | 0.9 | 6.5% | 22/36 | connective `bcn-2767` 56%, walk `bwk-004` 19% | partly fixed |
| A20 | fragment openers: "Which on Elizabeth Street is a formality." "As if it had an opinion." | 0.6 | 5.1% | 16/36 | situated, places prop pay-offs | next pass |
| A30 | the narrator's war stories: "I've stood in places like this before", "in my line of work" | 0.6 | 4.0% | 12/36 | situated 73%, character | next pass |
| A11 | "a moment" / "for a moment" | 0.6 | 4.5% | 15/36 | situated 90% | leave |
| A27 | "Somewhere …, and somewhere else …" opener | 0.4 | 3.4% | 11/36 | situated 93% | next pass (cap) |
| A16 | "worth" constructions: "worth hearing out", "one chair worth sitting in" | 0.4 | 3.1% | 12/36 | situated 50%, office | leave (idiom) |
| A13 | "the kind of …", "its own kind of relief" | 0.4 | 3.1% | 11/36 | bible places, office deck | partly fixed |
| A26 | stock idiom tags: "with real conviction", "as calm as you please", "give or take" | 0.4 | 3.1% | 12/36 | situated `sit-0114` 57% | next pass |
| A15 | abstract nouns doing the work: "the business over the coal bill" | 0.3 | 2.7% | 12/36 | gen `SMALL_MOTIVES[9]` (all 12 on these nights); people `bpe-1438` says the same | card fixed, gen next pass |
| A07 | tag-ons: "which suited us both", "in that company it knew it", "the sigh did most of the work" | 0.3 | 2.2% | 9/36 | character 60%, situated 40% | partly fixed |
| A28 | "a knock that didn't want to be a knock", "its own kind of" | 0.2 | 1.6% | 7/36 | office deck, office | fixed |
| A04 | "in a way that …" | 0.2 | 1.3% | 6/36 | character `chr-118` | fixed |
| A12 | "for the moment" | 0.1 | 1.1% | 5/36 | situated `sit-2706` | next pass |
| A14 | restated-then-undercut: "He didn't make anything of the question. He just answered it." | 0.1 | 1.1% | 5/36 | situated `sit-0340` | next pass |
| A03 | "which is to say" | 0.03 | 0.2% | 1/36 | situated `sit-0041` | next pass |
| A05 | "not X but Y" / "wasn't the restful kind. It was …" | 0.03 | 0.2% | 1/36 | situated `sit-1203` | one-off |
| A10 | "somehow" | 0 | 0 | 0 | | clean |

**Rhythm.** 220 of 1,475 narration paragraphs of two sentences or more (15%) end on a sentence of five words or fewer, and 55 of those close the page. That is not over-regular: the short closer is a minority move. What *is* regular is what the short closers say (§1.2): the same five or six quips ("Paid rent does that.", "Adjectives never help.", "I'm not proud.") and the page-ending object with a feeling (A08, 8 of its 39 in a page's last paragraph; A23, 17 of 32). The rule below for A23 and A08 is the rhythm fix.

Not tics, measured and left alone: "a little" is mostly literal ("a little lamp in a red glass", "a little brass frame"); "a moment" is ordinary; "worth" is mostly idiom ("no lock worth the name"). "Somehow", "which is to say", "not X but Y" and "in a way that" are near zero after earlier passes.

### 1.2 Stock sentences: the same words, most nights

Sentences of four words or more, names, hours and pronouns masked, on six or more of the 36 nights:

| nights | sentence | source |
|---|---|---|
| 36 | — THE TURN — / Here's what I had. | pages.ts `writeTurn` |
| 32 | I hadn't come for the furniture. I'd come for Ruggiero. | still `bst-310` (**fixed**: five plain variants) |
| 14 | Somebody had it wrong. | voicings `collision/but-5` |
| 13 | A man's papers are where he keeps the people who wanted something from him. | thread.ts `pointerSaid` |
| 12 | I could put it to Kessler now. | pages.ts `writeTurn` (oracle.ts:390 parses it) |
| 11 | I wanted all of them. | connective `bcn-2767` |
| 11 | She had a big ring of keys … I wiped my feet, late. It didn't do much for me, but the stairs appreciated it. | character `chr-609` (**pay-off fixed**) |
| 11 | There was a potted palm in the lobby, long dead, which one of the tenants still waters on his way out, out of courtesy. | bible places (the Excelsior, which the neighbourhood deals often) |
| 8 | Somewhere above, somebody was snoring with real conviction, the only one in the house getting any good out of the night. | situated `sit-0114` |
| 8 | Nobody kept watch in a place like that. | watch `wch-063` |
| 8 | Before that, he said, it was anybody's. | world.ts `deck` (the unwatched keeper) |
| 7 | He had a pleasant, forgettable face, which in that trade is the whole trick, and eyes that went to the door every time it opened, and came back. … I was glad to see I'd been promoted to furniture. | character `chr-503` (**fixed**) |
| 7 | They'd been kept square, so that nobody got top billing. | voicings `find/papers-1` |
| 7 | Mrs. Kowalski was in the hall with a dustpan, sweeping a stair that had been swept already. | people `bpe-1117` |

**Rule:** a line with a joke in it may appear on a night, not on most nights. Any texture or quip card that is the only card for its key gets siblings, or is made plain enough that repetition doesn't show (bst-310 was both). The profile's "what the last ten nights dealt" (docs/55) helps only where there is something else to deal.

### 1.3 Each tic: the rule, and a rewrite

**A02 simile frames (5.0 a night, a third of pages).** "The radio played on, low and cheerful, as if nothing had happened." · "Mrs. Greco stood in the doorway like somebody waiting for a train." · "My visitor came in unhurried, as if the hour happened to other people." (`ent-040`, fixed) — *Rule:* one simile a page, at most. The dial (docs/53) allows "the simile anyone gets"; it doesn't allow one in every other paragraph. A simile about how somebody *stood* or *came in* is the first to go. *Rewrite:* "Mrs. Greco stood in the doorway and didn't say a word while I worked."

**A21 ", which is …" (3.5 a night, every night).** "There was a knock, and then the door opened before I'd said anything, which is how people knock when they've made up their minds." · "Abramowitz … looked at the place where Caruso ought to be, which is a thing you can do for a long time without it helping." · "The Bidwell flat was a fair few blocks uptown and east, which is no distance at all if you aren't the one walking it." — *Rule:* the narrator comments on the sentence he just finished at most once a page. When the comment is the joke, make it its own sentence; when it isn't, cut it. *Rewrite:* "There was a knock, and the door opened before I'd said anything. Whoever it was had already made up their mind." (`bof-103`, fixed)

**A01 "the way you'd …" (2.6 a night).** "I went through Feeney's things carefully, the way you'd want a stranger to go through yours." (`sit-0715`, 7 nights) · "She had worked it out, the way people do when they can't sleep." · "Belkin … touched the place once, lightly, the way you touch a sore tooth." — *Rule:* "the way" plus a generalization about people is the model's favorite simile; count it with A02 and allow one a page between them. *Rewrite:* "I went through Feeney's things carefully and put each one back where it was."

**A29 stock beats (2.4 a night).** "I hadn't come for the furniture." (36) · "From his post Pinsky could see the whole house" (31) · "I wrote it down." (10) · "with my hat in my hand" (11). — *Rule:* §1.2. *Rewrite:* "I went straight over to Sokol." (bst-310 and four siblings, fixed); "From the back of the center aisle, Pinsky could see the whole house." (world.ts, next pass).

**A18 "plain/plainly/proper/properly" (2.0 a night).** "She went through it slowly and properly, the way you'd read out a rent book …" · "The light was poor, so I came close enough to be seen properly." · "I asked him for his evening, plain and in order." — *Rule:* these words promise a quality instead of showing it; cut them, or say the concrete thing. "Plain wood" is a literal and stays. *Rewrite:* "She went through it slowly, an hour at a time."

**A22 the colon aside (1.7 a night on 17 nights, a quarter of all pages where it can occur).** "Holding a fork up to the light: I didn't interrupt him." · "Eating a pickle out of a paper bag on her stool: I didn't disturb her." · "Explaining to a large man why he was going home: I didn't disturb the doorkeeper." — *Rule:* no participle-colon constructions; a person still at something is a person doing it. *Rewrite:* "Pinsky went back to holding a fork up to the light." (next pass, §5.1)

**A19 sentence-initial "So" (1.3 a night, every night).** "So the knife had started the evening at Kowalski's, and Feeney died at ten, so whoever used it …" · "So whoever it was had heard Abramowitz at the Velvet Room between eight and ten." — *Rule:* "So" opens a deduction at most once a night; the find's reasoning line says the thing without it. *Rewrite:* "The knife had started the evening at Kowalski's, and Feeney died at ten. Whoever used it had been to Kowalski's first." (voicings, next pass)

**A25 aphorism openers (1.1 a night).** "A man's papers are where he keeps the people who wanted something from him." (13 nights) · "Some rooms you look at." · "Cocoa is what you make for a friend." — *Rule:* the narrator generalizes about the world at most once a night, and never as the opener of a search. *Rewrite:* "I went through his papers for anybody with a grudge." (thread.ts, next pass)

**A08 objects with feelings (1.1 a night).** "The cold had got into the gutters, and the gutters had given up." · "The drawer had never had company before." · "a big samovar sat at the end of the counter, steaming quietly to itself" (`bpl-2011`, fixed). — *Rule:* one per night, never two on a page, and never the page's last line two pages running. *Rewrite:* "a big samovar sat at the end of the counter, steaming quietly."

**A17 "Here's what I had." (every night, the turn).** — *Rule:* the turn's recap needs no announcement; it starts with the first fact. "I could put it to Kessler now." is also the turn's (B20). (next pass, §5.1)

**A06 polysyndeton (1.0 a night).** "At nine there was Carbone, and nobody else, and I'd have noticed." (`list/plain-whole-next-5`, 10) · "and eyes that went to the door every time it opened, and came back" (`chr-503`, fixed) — *Rule:* two "and"s joining clauses in one sentence is one too many. *Rewrite:* "At nine there was only Carbone. I'd have noticed anybody else."

**A23 "the only one/thing/way" (0.9 a night, 17 of 32 in a page's last paragraph).** "…snoring with real conviction, the only one in the house getting any good out of the night." · "…the window was the only one of them with a view." (`bof-005`, a good joke, kept) — *Rule:* the "only X" punchline is the page-closer formula; one a night.

**A24 "all of it / all of them" (0.9 a night).** "I wanted all of them." (`bcn-2767`, 11 nights) · "It was a few blocks, and I took all of it." (`bwk-004`, fixed) — *Rule:* say what "all" is. *Rewrite:* "I wanted every face he'd seen." / "It was a few blocks, and I didn't hurry."

**A20 fragment openers (0.6 a night, 15 of 23 in a page's last paragraph).** "Which on Elizabeth Street is a formality." · "Which is business." · "As if it had an opinion." — *Rule:* no sentence starts with "Which" or "As if"; the planner splitting a ", which" tag-on into its own sentence makes these, so A21's rule removes most.

**A30 war stories (0.6 a night).** "I've stood in places like this before." · "My shoes made no sound on the aisle carpet, which in my line of work is a mixed blessing." — *Rule:* the narrator's past is a joke you can make once a night.

**A26, A27, A12, A14, A03** (each under 0.5 a night, nearly all situated deck): "with real conviction", "as calm as you please", "Somewhere above …", "I put my pencil away for the moment", "He didn't make anything of the question. He just answered it.", "Which is to say once." — *Rule:* the situated deck's filter (scripts/situated-deck.ts) should reject them by pattern (§5.2).

**A13/A28/A07/A04/A15, the model's signature phrasings** (each a handful, almost all in the four old decks and office cards): "which was its own kind of relief", "a knock that didn't want to be a knock", "in that company it knew it", "neat in a way that took effort", "the business over the coal bill", "which suited us both". — *Rule:* never. These are the phrases a reader recognizes as a model's. **Fixed** in the decks and office cards (`off-029`, `bof-1104`, `chr-282`, `chr-118`, `bpe-1438`); the rest are in situated and gen content (§5).

## 2. B: the builders' words on the page

**Taught terms**, which the teach page, rules or buttons teach and the player is meant to use: *call(s)* (the clock and every choice: 19.5 a night, intended), *Put it to …* (the button), *star*, *line* ("the line that breaks it", on the report form), *pencil*, *grid*, *notebook*, *report*, *hunch*, and the six tier names (the title page's picker, the notebook header, "Medium is cleared"). Tier names never appear in prose (0). These stay.

**Leaks**, by how often a player meets them:

| id | leak | a night | where the player meets it | source | status |
|---|---|---|---|---|---|
| B10 | "X's list", "his list", "the list" in narration | 4.5 (30% of pages) | pages | voicings 59%, compose.ts 14%, situated | next pass (docs/53, no-jargon) |
| B19 | "means" (grid column and key), "the way in" | 4.3 | grid 96, story 17, pages 43 | grid.ts, story, voicings `window-means/*` | story and book grid fixed; CLI grid next pass |
| B14 | "(and) nobody else" in narration | 2.8 (21% of pages) | pages | voicings `list-hours/*`, `own-word/*`, plain.ts | next pass (docs/53) |
| B15 | "the hour that mattered", "the hour I cared about", "when it counted", "the hour that counted" | 2.7 (22% of pages) | pages | voicings 74%, world.ts, thought.ts | next pass (docs/53) |
| B16 | "Sokol has Mrs. Krantz at Sokol's at ten" | 2.4 | star reasons, curtain path | stars.ts `shorten`, gen path whys | curtain fixed; stars next pass |
| B22 | grid key "X✓ both", "~X your pencil", "COLLISIONS", "Says:", "THE TRUE BOARD", "THE PATH" | 7 (headings) | notebook, grid, curtain | grid.ts, report.ts | curtain and book grid fixed; CLI grid next pass |
| B18 | "collides", "COLLISIONS", "they collide" | 2.0 | grid, rules, CLI error | grid.ts, teach.ts, play-lib.ts | rules, book grid, CLI error fixed; CLI grid next pass |
| B23 | "the motive search", "Which of her claims?", "Back to the claims", "Other lines I hold", "the second story" | 1.5 | curtain, picker, report form | report.ts, board-book.ts, play-lib.ts, choices.ts | fixed |
| B02 | "par" | 1.0 | curtain: "THE PATH (par 7: …)" | report.ts | fixed |
| B11 | "account": "no true account for ten" | 1.2 | the turn and recap | voicings `left/last*`, thought.ts:757 | next pass |
| B17 | "word" as the mechanic: "I had nobody else's word for it", "every answer had somebody's word under that" | 0.9 | pages | voicings `own-word/cared`, situated | next pass |
| B13 | "story" as the mechanic: "if the new story held", "her story had a hole in it" | 0.7 | pages | voicings `reaction/if-held*` | next pass ("story" is the player's word too; "new story" is the leak) |
| B20 | "I could put it to Kessler now." | 0.3 | the turn | pages.ts `writeTurn` | next pass |
| B04 | "the small board" | every page header of the notebook, title page | board-book.ts, play-lib.ts | fixed |
| B04 | "Seed" | the title page's field | board-book.ts | fixed: "Case number" (and the type picker "Kind") |
| B05, B06 | "card", "deck", "slot", "beat", "world", "star" | 0.9–1.4 | all literal on pages ("the card room", "a mail slot", "a fresh deck in his breast pocket") | | not leaks |
| — | "watcher", "lists everybody", "Lists … tell the truth" | the rules, every night's title page | teach.ts | fixed |
| — | "One question gets a whole evening or a whole list" | the title page and play CLI title | board-book.ts, play-lib.ts | fixed |

The grid legend `1<2#` the brief mentions is not in any rendered surface or source string; the nearest is the grid's `→Y owned up` and `"X"✗`.

**Bugs found on the way:**

- The curtain printed a bible secret mid-sentence: "to hide He sits in on the late game … minding the cart.." **Fixed**: "to keep a secret: he sits in on the late game …".
- The curtain's lies said "Miss Kahane said Miss Kahane's flat at ten" where "What broke the story" above it said "home". **Fixed**: "home" in both.
- The office's gossip aside capitalizes after "And": "And There's Feeney, a night-school teacher." (pages.ts:1086, `talk`). Next pass.
- The verdict's "Where he is now: Pardo who buys things" reads the holder's listing label as a name (gen `holdersOf … listed`). Next pass.
- The story's lost-thing line repeats the place: "the key under the mat, which Abramowitz told the room at the Velvet Room about" (gen `means.originText`). Next pass.

## 3. What this pass changed

Only the files the brief allows (the `no-jargon` branch is rewriting voicings, the situated deck, the plain realizer, thought/thread/star/report-line templates and the CLI notebook headings).

**Cards** (content/board/still, office, walk, telling, places, people; content/decks/office, character, entrances):

| card | was | now |
|---|---|---|
| bst-310 (+ bst-311–314) | I hadn't come for the furniture. I'd come for {name}. | I went straight over to {name}. / {Name} was the one I wanted to talk to. / I went over to {name}. / {Name} was who I'd come to see. / I made my way over to {name}. |
| off-029 | The stairs felt shorter for it. The office looked the same as always, which was its own kind of relief. | The stairs felt shorter after that. The office looked the same as always, and tonight that was fine with me. |
| off-029 pay | … would still be a little shorter … Paid rent does that to a building. | … would feel shorter when I climbed them next. Paid rent does that. |
| chr-118 | neat in a way that took effort | neat, and you could see the work in it |
| chr-503 (+ pay) | a pleasant, forgettable face, which in that trade is the whole trick, and eyes that went to the door every time it opened, and came back · I was glad to see I'd been promoted to furniture | a pleasant face you'd forget by morning, a good face for a bartender, and eyes that went to the door every time it opened and came straight back · The bartender's eyes went to the door and came straight back to me. |
| chr-282 pay | It came off a rack, and in that company it knew it. | It came off a rack, and next to those clothes it looked it. |
| chr-609 pay | It didn't do much for me, but the stairs appreciated it. | …and the landlady watched me do it. |
| chr-410 pay | It hardly ever is, which is how bookmakers stay in business. | It hardly ever is. That's how bookmakers stay in business. |
| ent-040 | as if the hour happened to other people | without hurrying, midnight or no midnight |
| bof-103 | …which is how people knock when they've made up their minds. | …Whoever it was had already made up their mind. |
| bof-1104 | a knock that didn't want to be a knock | a knock, so soft I nearly missed it |
| bwk-011 | …, which is no distance at all if you aren't the one walking it. | …. It's no distance at all when somebody else is doing the walking. |
| bwk-004 | and I took all of it | and I didn't hurry |
| bte-303 | A watcher's list is the one story in this city that nobody bothers to lie about. | People lie about where they were. Nobody bothers lying about who came through their door. |
| bpl-2011 (+ pay) | steaming quietly to itself · the only thing in the room in no hurry at all | steaming quietly · in no hurry at all |
| bpl-2037 pays | the shadows changed their minds · a room that didn't want it | the shadows swung with it · not that the room was worth it |
| bpe-1438 | the business over the coal bill | the row over the coal bill |

The bible (content/neighbourhood/) was measured and left: its tics are spread thin (no line over 8 hits in 36 nights; ", which is" 36 times and similes 71 in 2,700 strings), they are legible jokes at the dial, and the designer blessed it (docs/48).

**Strings:**

- **Title page and play CLI title:** "One question gets a whole evening or a whole list" → "Ask anybody where they were and you get the whole evening; ask a barman who came in and you get everybody. Every lie runs into something true." The header "case 3 · Poached · the small board" → "case 3 · Poached"; the resume line likewise. The picker's "Seed" → "Case number", "Case" → "Kind".
- **Teach page and rules** (teach.ts): no "watcher", "list", "collide" or "the board". "a watcher lists everybody … Lists and the people who were only company tell the truth; a person's own story may not" → "whoever kept the door or the bar names everybody who came in, hour by hour, and says "nobody else" when that was everybody. They tell the truth, and so does anybody who was only there as company; what somebody tells you about their own evening may not be." "A star … says what points there, never what the answer will show; the stars thin out as the tiers go up" → "says why, never what the answer will be; the harder the tier, the fewer the stars."
- **The book's grid** (board-book.ts): key "says so · somebody else says so · both · they collide · your pencil" → "they say so · somebody else saw them there · both say so · the two don't agree · your own guess in pencil"; the column header "means" → "could get it?" / "knew how?", its key "Means: knew the way in." → "The last column: knew how to get in?"; a cell's spoken label "Corrigan's list puts them at" → "Corrigan saw them at".
- **The book's notebook:** "What I have" groups "Corrigan's list" / "Searched" / "Put to them" → "Who Corrigan saw" / "What I found" / "When I put it to them".
- **The picker** (book and CLI): "Which of Teitel's claims?" → "Which part of Teitel's evening?"; "Back to the claims" → "Back to Teitel's evening"; the line's source "Corrigan's list" / "Winslow's story" → "who Corrigan saw" / "what Winslow said"; "…, the second story" → "…, what he said next"; the help "Pick the hour her story can't live with" → "Pick the hour where her story is wrong".
- **The report form** (book and CLI): "The lines I hold that name X or fall at ten" → "What I have that names X, or is about ten"; "Lines that touch X's own story" → "What I have about X's own evening"; "Other lines I hold" → "Everything else I have"; "The remarks and finds I hold, and anything put to them" → "What people let drop, what I found, and what they said when I put it to them."
- **The story:** "Winslow learned the way in at the Velvet Room" → "found out how to get in"; "Ellery's list said otherwise" / "Mrs. Krantz's own evening said otherwise" → "Ellery said otherwise".
- **The curtain:** "THE TRUE BOARD" → "WHERE THEY REALLY WERE"; "THE PATH (par 7: 4 questions, the motive search and 3 walks)" → "THE SHORT WAY THROUGH (7 calls: 4 questions, a look at the papers for the motive and 3 walks)"; the path's reasons "Corrigan's list has Winslow at …" → "Corrigan saw Winslow at …", "and step 4 says otherwise" → "and Wojcik said otherwise"; "Never put to her; put, it would have been: cracked." → "You never put it to her; if you had, she would have cracked."; "Put to it: owned up." → "When you put it to him, he owned up."; the secret bug and "home", above.
- **CLI errors:** "Nobody on the board called X" → "Nobody in this case called X"; "Nothing I hold collides with X's story" → "Nothing I have breaks X's story yet".

**Before and after**, the same 36 nights (the lint, `--json`):

| | before | after |
|---|---|---|
| A21 ", which" a night | 3.47 | 2.83 |
| A29 stock beats a night | 2.44 | 1.33 |
| A24 "all of it" | 0.89 | 0.56 |
| A13 "kind of" | 0.39 | 0.25 |
| A07 tag-ons | 0.28 | 0.11 |
| A28, A04 | 0.22, 0.17 | 0, 0 |
| B02 "par" | 36 | 0 |
| B16 "X has Y at" | 85 | 42 (the stars' half is next pass) |
| B22 legends and headings | 255 | 185 (the CLI grid is next pass) |
| B23 mechanic labels | 74 | 47 (36 of them the verdict’s taught “the line that breaks the story”) |
| B19 means / the way in | 161 | 143 |
| "I hadn't come for the furniture" | 32 of 36 nights | 0 |

Facts kept: the round trip and clarity are 100% on every tier and world, as before (`scripts/roundtrip.ts --nights 30`; the neighbourhood flesh column's 94.6% and 95.0% at Poached and Medium are the same before this pass); the 36 nights' boards, lies, crimes and paths hash the same before and after; `board-prose` is 0 on every lint at every tier; the decks dial lint's flags are unchanged (17 before, 17 after); the suite is green at three workers.

## 4. The lint: `scripts/claudisms.ts`

```sh
npx tsx scripts/claudisms.ts                 # the 36 nights: every pattern, counts, examples, sources, stock sentences, rhythm
npx tsx scripts/claudisms.ts --only A21,B10  # some patterns
npx tsx scripts/claudisms.ts --examples 6    # more examples
npx tsx scripts/claudisms.ts --trace 200     # trace more hits a pattern to their source (default 25)
npx tsx scripts/claudisms.ts --json          # everything, as JSON (before.json/after.json above)
npx tsx scripts/claudisms.ts --dump DIR      # each night's surfaces as text, to read
```

It renders each night in process (the oracle's route, as `npm run read` does), reads seven surfaces (page bodies, choices, notebook and grid, verdict, story, curtain, and the book's and CLI's own string literals), matches each pattern in its scope (some only in narration, with quoted speech removed; some only in labels), and traces page hits with `scripts/trace-line.ts`'s new `traceRun` to the card, voicing, template or engine function that wrote them (a hit the trace can't place is matched by its longest clause against content and string literals, never comments). The patterns live in `PATTERNS`, each with an id that this document uses. It is a measure, not a gate: nothing in the suite runs it, because most of what it counts is allowed in moderation. The next pass can turn its rates into gates (§5.3).

## 5. For the next pass

To be applied after `no-jargon` merges, on top of its rewrites. Each is a file and a pattern; run the lint before and after.

### 5.1 Engine templates

- **A22, src/game/board/world.ts:170 (`lastSeen…`) and src/game/board/pages.ts:653 (`staying`).** Replace the participle-colon frame. World.ts: `${Name} was still ${doing} when I left.` for the page that ends the visit; pages.ts `staying()`: `${Name} went back to ${doing}.` (the `doing` text already begins lower-case: "holding a fork up to the light"). Both lines then carry the name the planner wants, so the pronoun swap in `staying` goes. 61 hits, 17 nights.
- **A17/B20, src/game/board/pages.ts:2532, 2534, 2542 (`Here's what I had.`) and 2570 (`I could put it to ${name} now.`).** Drop the lead; start the recap with its first fact. Say the put as what happens: `${Name}'s story didn't hold, and I could tell ${him} so.` **Update src/game/board/oracle.ts:390**, which parses "I could put it to (.+?) now." to find the turn's target, in the same commit. Also src/game/board/plan/rhythm.ts:107 names the lead.
- **A25, src/game/board/thread.ts:195 (`pointerSaid`).** "a man's papers are where he keeps the people who wanted something from him" → "I went through his papers for anybody with a grudge against him."
- **A29, src/game/board/world.ts:328 (the watcher’s post line, "From {his} post {name} could see …").** → "From {where}, {Name} could see {what}." (the post first, as a place).
- **B15, src/game/board/world.ts:325** "had the room from the hour that mattered" → "had the room from ten o'clock" (the hour, said). **src/game/board/thought.ts:646** "At ${when}, when it counted," → "At ${when}, when ${victim} died," (or "when the canary went"); **thought.ts:271** "at an hour that mattered" → the hour.
- **B11, src/game/board/thought.ts:757** "with no true account for ${hour}" → "and nobody who could say where they were at ${hour}".
- **B16, src/game/board/stars.ts:240 (`sourceName`) and :250 (`shorten`).** `X’s list` → `what X saw`; `X’s story` → `what X said`; `X’s word` → `what X owned up to`; `what the room said` → `what I found`; and `shorten` → "Sokol saw Mrs. Krantz at Sokol’s at ten", not "Sokol has Mrs. Krantz at". Once these change, src/ui/board-book.ts's `seenWords` (this pass) can go back to printing `cell.seen.by`.
- **B18/B22/B19, src/game/board/grid.ts:199–233 (`boardGridText`).** As the book's grid now says it: the column header `means` → `could get it?` / `knew how?`; the key `"X" says so · [X] somebody else puts them there · X✓ both · "X"✗ collides · →Y owned up · ~X your pencil` → `"X" they say so · [X] somebody else saw them there · X✓ both say so · "X"✗ the two don’t agree · →Y owned up · ~X your own guess in pencil`; `means: ${meansLabel}` → `last column: ${meansLabel}?`; `COLLISIONS` → `WHERE THE STORIES DON’T AGREE`; and grid.ts:175 `knew the way in` → `knew how to get in`.
- **B22, src/game/board/text.ts (`notebookText`) and src/game/board/knowledge.ts (line texts).** The CLI notebook's lines "Corrigan: at the Velvet Room at ten o’clock, Shapiro, Tramonti and Pardo, and nobody else." → "Corrigan: at ten, only Shapiro, Tramonti and Pardo were at the Velvet Room." (docs/53's "and nobody else" row); the collision block's "Says:" → "{Name} says:".
- **Bug, src/game/board/pages.ts:1086** `` `And ${x}` `` → lower-case the first letter of `x` unless it starts with a name: "And there’s Feeney, a night-school teacher."

### 5.2 The voicings and the situated deck

- **A19, content/board/voicings.json `window-means/find-*` (77% of "So" openers).** Drop the "So": "The knife had started the evening at Kowalski’s, and Feeney died at ten. Whoever used it had been to Kowalski’s first." Keep one "So" form among a shape's variants at most.
- **B10/B14/B15, voicings `list-hours/gone-one-*`, `list-hours/gone-empty-*`, `own-word/*`, `confirmed/list-*`, `collision/recap-away*`** (the docs/53 table: 42 hits from `list-hours/gone-one-3` alone). "For ten, the hour that mattered, his list had Shapiro, Tramonti and Pardo at the Velvet Room and nobody else" → "At ten, when the canary went, only Shapiro, Tramonti and Pardo were at the Velvet Room."
- **B11, voicings `left/last*`** "One person was still standing: somebody who {access}, and who had no true account for {hour}" → "That left one person: somebody who {access}, and who couldn’t say where they were at {hour}."
- **B17, voicings `own-word/cared`** "the hour I cared about … I had nobody else’s word for it" → "at ten, when it happened, …, and nobody else had seen {him} there."
- **B13, voicings `reaction/if-held*`** "if the new story held" → "if what {he} said now was true".
- **A06, voicings `list/plain-whole-next-5`** "At nine there was Carbone, and nobody else, and I’d have noticed." → "At nine there was only Carbone. I’d have noticed anybody else."
- **Stock, voicings `collision/but-5`** ("Somebody had it wrong.", 14 nights) and **`find/papers-1`** ("so that nobody got top billing", 7): give each shape-form at least three siblings, or retire the quip.
- **The situated deck (content/board/situated.json; scripts/situated-deck.ts).** It is the largest single source of A (A01 59%, A02 26%, A21 35%, A18 59%, A11 90%, A27 93%, and all of A12, A14, A03, A05). Rather than edit 3,000 cards, filter them: import `PATTERNS` from scripts/claudisms.ts into the deck's filter and reject a card that matches A03, A04, A05, A07, A12, A13, A14, A15, A20, A22, A25, A26, A28 or A30; allow A01, A02, A21 and A23 in at most one card in four of a key. The cards named above with the most hits: `sit-0114` (21: "snoring with real conviction, the only one in the house …", "as calm as you please"), `sit-0715` (14: "the way you'd want a stranger to go through yours"), `sit-2706` (10: "I put my pencil away for the moment. Some evenings come out better when nobody sees them written down."), `sit-2577` (10: "a story that's changed once is still worth hearing out"), `sit-0344`, `sit-0340` ("He didn't make anything of the question. He just answered it."), `sit-0394`/`sit-2485`/`sit-2793` ("which suited us both"), `sit-0041`, `sit-1203`.
- **A24, content/board/connective.json `bcn-2767`** ("I wanted all of them.", 11 nights) → "I wanted every face {he} had seen."; **`bcn-2283`** (8, "properly"), **`bcn-0201`/`bcn-0202`** (objects with feelings, ", which").

### 5.3 Gates, once the above lands

Run `scripts/claudisms.ts --json` in a test over a smaller set (12 nights) and hold: A22, A17, A28, A04, A07, A03, A14 at 0; A21 ≤ 1.5 a night; A01 + A02 ≤ 3 a night; no sentence of six words or more on more than a third of nights outside the turn's chapter mark; B02, B10, B11, B14, B15, B16, B17, B18, B20, B22, B23 at 0 outside speech.

### 5.4 Generator content (src/gen/board/, out of both branches' scope)

- `content.ts` `SMALL_MOTIVES[9]` "the business over the coal bill" → "the row over the coal bill" (A15: all 12 of its hits on these nights).
- `holdersOf … listed` reads into the verdict as "Where he is now: Pardo who buys things": give the verdict the holder's name (`Pardo`) and keep the description for the story.
- `means.originText` for a told key repeats the place ("which Abramowitz told the room at the Velvet Room about"): the story already names the place; drop the clause there.
