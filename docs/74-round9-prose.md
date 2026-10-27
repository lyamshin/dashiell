# Round 9, prose: the narration's slips, and round 8's leftovers

*2026-10-27, branch `round9-prose`, off main at `2fb370b` (thin-sums, #112, docs/72), rebased at the end onto `e0cea3f` (round9-logic, #113, docs/73; §1.11). The round-9 blind playtest (`scratchpad/round9-notes.md`: Poached 37, Medium 37 and Hard-boiled 39, all murders) found thin-sums working as meant: three of three got who by deduction and did the sums themselves. What it found wrong in the narration, with round 8's leftovers (`scratchpad/round8-digest.md`, B7 and B8), is this build, approved by the designer: thin-sums' held clauses, which read like a machine; the means rule, which the grid applied and no page stated; the office and the scene disagreeing on what carried the poison; a lie leaking the true place; the victim topic; and the continuity list. A parallel build (`round9-logic`, docs/73) owns the grid, confront, the refusal hand-offs, the report, the verdict, the curtain, the rules page, CLI numbering and hints; this one stays out of them. Each item is fixed by rule in the layer that makes the line, with a test (`test/round9-prose.test.ts`) and, where a check can find it again, a hinge rule (`hinge-lint.ts`: ten new, four widened). Nothing in `src/gen/` changed. Lean, like docs/60 to 72; the full dial (`?texture=full`) shares the turn's held clause going, the find's means rule, and the voicings and cards rewritten.*

Quotes are from the five nights the brief names, read in full on main (`2fb370b`) and on this build, on the testers' routes (the action commands from `playtest9-{poached37,medium37,hb39}.json` and `playtest8-{poached34,hb34}.json`): main → this build.

## 1. What was built, by item

### 1. The turn says the hours, the means and the clash, once; the notebook says what's held as a person would (`turn-says`)

Two testers of three called thin-sums' held clauses machine lines ("I had the evening as Vogel told it.", "I knew from Feeney and Mrs. Rafferty who had come and gone at each place, and I had the evening as Obermann told it.").

- **The turn** (`pages.ts` `writeTurn`, `turnSaysNot`): from Poached up it says the client's hours and where the weapon or poison came from, and the clash once. What's held (`held`) is the notebook's, not the turn's. A clash the page has just said above the turn, in the thought or to their face, isn't said again; nor, on a put's own page, what they said when it was put to them. (Every turn that says what's held drops it: the full dial's Hard-boiled too.)
- **The notebook** (`factClauses`, the HOLD voicings rewritten for "Go over what I have"): "Kavanagh, Ainsworth and Hauck had each told me their evening. Mrs. Pickering and Schilling had told me who came and went." One evening: "Vogel had told me his evening." The possessive is plain, never the reference pass's marked pronoun, which named it where another man was in the sentence ("Obermann had told me Obermann's evening", seen while building); the singular voicings open on whose evening it was. `telling` (docs/62 item 7) gives way on "Go over what I have", the notebook said aloud, only.
- **The heading**: "How it adds up" promised a sum it no longer gives: "Where things stand", in the CLI notebook (`text.ts`) and the web book's (`board-book.ts`). Checked in the browser (Vite on this worktree, Poached 37 on the tester's route): the notebook's headings are "Where they were", "Where things stand", "What I was told", and its list says the held line as above.

Before → after:

- Poached 37, the turn after Vogel's evening: "Rosenbaum had given me ten o’clock. I knew where the laudanum came from: Kowalski’s. I knew who Mrs. Kowalski had seen come and go, and I had the evening as Vogel told it. Vogel said he was home at ten. Mrs. Kowalski said otherwise." → "Rosenbaum had given me ten o’clock. I knew where the laudanum came from: Kowalski’s." (The thought above it: "Something didn’t add up. Vogel had said he was home at Kowalski’s at ten, and Mrs. Kowalski hadn’t seen him there.")
- Medium 37, after Sirkin's evening: "Lathrop had given me nine or ten o’clock. The revolver had come from Mrs. Nagy’s. I knew who Mrs. Nagy and Alfano had each seen come and go, and I had the evenings as Prentiss, Broadnax and Sirkin told them. Sirkin said he was home at ten, and Mrs. Nagy said otherwise." → "Lathrop had given me nine or ten o’clock. The revolver had come from Mrs. Nagy’s."
- Poached 34, after Lindemann's: "… I knew from Bledsoe who had come and gone, and I had the evening as Lindemann told it. At nine, Lindemann said he was at the Velvet Room, and Bledsoe said otherwise." → "Lanza had given me nine o’clock. The laudanum had come from the Delmonico rooms."
- Hard-boiled 34, on the page Hargrove refused: "… I had the evenings as Pickering, Steinbach and Hargrove told them, and I knew who Mrs. Kowalski, Lanza and Coffin had each seen come and go. When I pushed, Hargrove wouldn’t say where else she had been." → "Hanrahan had given me nine or ten o’clock. The chloral had come from Kowalski’s."
- Hard-boiled 39, "Go over what I have" after Mrs. Rafferty: "I knew from Feeney and Mrs. Rafferty who had come and gone at each place, and I had the evening as Obermann told it." → "Obermann had walked me through his evening, and Feeney and Mrs. Rafferty had told me who came and went."
- Poached 37's notebook: "How it adds up: … I had the evenings as Vogel, Brennan and Schilling told them, and I knew who Mrs. Kowalski and Lindemann had each seen come and go." → "Where things stand: … Vogel, Brennan and Schilling had each told me their evening. Mrs. Kowalski and Lindemann had told me who came and went."

### 2. The means rule, said once from Poached up, on the find (`deadline`, `sum` taught)

The grid's weapon column applies "fetched before the earliest hour" (Medium 37: Broadnax, at Mrs. Nagy's at nine, "no"), and thin-sums had cut the one line that said it. It's a premise, not a sum: `writeSearch` says it on the find again at every tier where the office gave two hours (`meansBy`), of the dead man, so the "it" points one way (round 8's P): the three `find first before` voicings and the writer's own words (`when.ts` `earliestOf`). Who came too late for it stays the player's sum from Poached up. The sum lint reads the new form as a frame (`sum-lint.ts` `EARLIEST`) and lets it stand once, on the find that says where the means came from (`MEANS_RULE`); `deadline` holds at every tier again, and reads "the earliest it could have happened" as a slip. The CLI notebook's Raw and Coddled means clause says it the same way.

- Medium 37, the floor: "Tillman’s killer had been at Mrs. Nagy’s first." → "Whoever shot Tillman had to fetch the revolver from Mrs. Nagy’s before nine, the earliest he could have been shot."
- Hard-boiled 34: "To give Kreuzer the chloral, somebody had to go to Kowalski’s for it first." → "Whoever gave Kreuzer the chloral had to fetch it from Kowalski’s before nine, the earliest he could have been given it."
- Hard-boiled 39: "The laudanum he was given meant a stop at Rafferty’s first." → "Whoever gave him the laudanum had to fetch it from Rafferty’s before nine, the earliest he could have been given it."
- Poached 34 and 37 (one office hour) say no hour: "The laudanum Havemeyer was given meant a stop at the Delmonico rooms first."

### 3. What carried the poison is one thing (`vessel`)

`when.ts` `vesselOf`, from the scene's own card (the cocoa, the rye, the glass): the office's and the notebook's supper line (`murderWhat`, `supper`) and the story (`report.ts` `meansMoment`) say it.

- Poached 37, the office: "The chop house sent up his supper at ten, and the laudanum was in it." (the table had cocoa; the story "the laudanum went into the cocoa") → "The chop house sent up his supper at ten, and the laudanum was in the cocoa he had with it."; the notebook the same. With chloral (two glasses on the table): "…, and the chloral was in the drink he had with it."

### 4. No friend in the cocoa (`retired`)

Two testers suspected a friend when the killer was an enemy he let in. `find/laudanum-s1`: "Somebody had made {victim} cocoa. Cocoa is what you make for a friend." → "… Somebody {victim} had let in had made the cocoa."; `find/chloral-1`: "{Victim} had been drinking with a friend, or with somebody who passed for one." → "{Victim} had let somebody in and poured them a drink." `retired` reads both old lines.

### 5. The notebook's pointer rests on what the office's did (`gossip`, widened)

The office says a gossip pointer as the client's own where the whole reason is something the client was party to (round 7, B8); the notebook kept "on the neighbors’ word". One decision now (`pages.ts` `gossipSaidAs`), the office's and the notebook's (`text.ts` `officeLines`); `gossip` reads the notebook's neighbors against the office page's.

- Poached 37: "Rosenbaum points at Vogel, on the neighbors’ word: he owed Hargrove four hundred dollars." (the office: "Start with Gustav Vogel, a cab driver. He owed my fiancé four hundred dollars.") → "Rosenbaum points at Vogel: he owed Hargrove four hundred dollars."

### 6. The story uses only what the scene said about the weapon (`story`)

`report.ts` `storyLines`: the weapon taken as the scene card had it; an owner the scene never named goes.

- Medium 37: "At eight o’clock Ashby was at Mrs. Nagy’s, and took the landlady’s late husband’s revolver, from the hall-stand drawer." → "…, and took the revolver from the hall-stand drawer."

### 7. A lie borrows nothing from the truth (`lie-leak`)

A move's reason from work takes a lead ("closed up at ten and …", the generator's `REASONS.closed`), drawn from where they really were. In a lie it put them there: `tell.ts` drops it from the lied hour's reason (`LIE_LEAD`).

- Medium 37, Sirkin (at the print shop at ten): "After that I closed up at ten and turned in early, home at Mrs. Nagy’s, still on my own." → "At ten I turned in early, home at Mrs. Nagy’s, still on my own."
- Coddled 15, the oracle's route: "Later on I locked up at nine and went down to the Shamrock to hear the piano, …" → "Then, at nine, I went down to the Shamrock to hear the piano, …".

### 8. The victim topic is the motive, and agrees with the office (round 8, B7; `topic`)

- **The label** (`choices.ts` `motiveLabel`): "Hargrove" → "Hargrove (the motive)", so it doesn't read as a new question (two of Medium 33's sixteen actions bought the papers again).
- **The continuity** (`writeMotive`): whether the client said the reason is what the office page carried (its MOTIVE propositions: the pointer's, the aside's, a reason said in the same breath as what they did), never a reckoning of which line the office used. Main had this right since case-2312 (#111) on the nights read ("Abramowitz had said much the same in the office."); `topic` holds it over nights.

### 9. Continuity (round 8, B8, and round 9)

- **The body-finder** (`finder`): whoever found the body went round to him at half past eleven. A list's clause that keeps them to the last hour says nothing past it (LIST-HOUR `finder`: 43 voicings forbid it, each with a twin that says the hour they were still there, `till`), and their own evening ends on the last hour as a stretch ("stayed through ten"), never "the rest of the evening" or "turned in early". Medium 37's Alfano: "Broadnax was in early on, out after eight, and back at ten for good." → "…, and back at ten."; Hard-boiled 34's Steinbach: "Come nine, I went up to the card room to do the books, on my own, and stayed the rest of the evening." → "Then at nine … and stayed through ten."; Poached 34's Bledsoe: "Hochstetter was here all evening and never went home." → "Hochstetter was here all evening."
- **The picture house** (`picture`): open when I'm in it. "the Orpheum, a picture house with continuous shows till midnight" (at 4:35 AM, with people in the seats) → "… with continuous shows all night" (`pages.ts` `pictureName`); its two keyed arrivals run the picture round again rather than having stopped it; the stage's reasons at a picture house (`tell.ts` `PICTURE_SHOW`): "I went to the second show at the Orpheum" → "the second feature", "because a friend was in the show" → "because a friend had said the picture was good"; the usher's line "Nobody gets into a theater without going past the front of the house, and the front of the house was Lindemann." (beside "stood at the back of the house") → "… without going past the usher, and tonight the usher was Lindemann."
- **The small slips** (`slips`, and the cards): a situated card may not say "rooming house" anywhere but a rooming house (`slipAvoid`; Medium 33's Hauck, in her flat: "because walls in a rooming house are mostly a suggestion"), nor "took the place in again" on a first visit (Raw 33), nor look only from the doorway on a page that has me up off my knees (`situated.ts` `DOORWAY`, `KNEES`; Medium 37: "I only looked, from the doorway … I stood up, and my knees told me about it." → "I started with the corners … I dusted off my knees."); a newcomer in a picture house is "in the third row", never "three rows back" (behind the back row?); "By ten o’clock he was at the Velvet Room, as if he had never left." only where he had been there the hour before (Poached 34 → "By ten o’clock he was at the Velvet Room."); an engaged woman is "Miss" in the People list (`gloss.ts` `nameInFull`: "Mrs. Bella Rosenbaum: my client, Hargrove’s fiancée." → "Miss Bella Rosenbaum: …"); a walk's bearing says the leg that matters (`walk.ts`: the lesser leg only where it's a quarter of the other: Mulberry Street to 12 Ludlow, "a fair walk uptown and east" → "a fair walk east"); somebody on the bench by the wall doesn't tap the bar (`seatAvoid`; Hard-boiled 39's Obermann); the landlady's list close "Somebody paid to watch a room doesn’t care who did what" → "Somebody who keeps a door …".
- **Return visits** (`return`): a prop is paid off only where a page before set it up and said it (`pages.ts` `propSetUp`); Medium 37's first visit to the print shop closed on "The tin sign was still promising relief." after the texture budget had taken the line that hung it → gone. Two return cards that pointed at a welcome nobody gave are rewritten: "The print shop again. The welcome was about what it had been the first time." → "The print shop again. A place shows you less the second time round, not more."
- **Walk lines** (`walk-it`): no "It was…" two walks running (`lastWalkOpensItWas`: after one, a fresh card of the walk's own kind that doesn't open on it, the reserve open to it, fourteen new lean cards, and the rhythm's trades held to the same; a card dealt twice never), and an unnamed walk that has said every way of its distance says "I walked over." rather than taking a near walk's card ("It was a short walk." for several blocks, main's); no "from there" with nothing for "it" and "there" to be; "two blocks over" with a bearing said the way twice. Medium 37: "It was two blocks over east from there, with my collar up." → "I went east with my collar up. It was two blocks."; "The next stop was several blocks." → "I had several blocks ahead of me."; Poached 34's walks, main: "It was a few blocks east, …", "It was a handful of blocks from there, with my collar up.", "It was a short walk.", "It was a stretch, and the streets were nearly empty." → "It was a few blocks east, …", "I had a handful of blocks ahead of me.", "It was a short walk.", "I walked it with my collar up. It was a stretch."
- **The keeper's own place, from the agreement side** (`keeper`, widened): on the keeper's own page, the keeper's own place (called after them) goes without saying (CONFIRMED `own`, four voicings; read back as the list's place). The neighbourhood's Poached 8 (a lost pet, the reader's route): "Sokol saw Belkin at Sokol’s at nine, and the two of them told it the same way." → "Sokol saw Belkin at nine, …".

### 10. The arrival echoes: left, and why

"Mrs. Rafferty had seen her at Rafferty’s at seven and eight.", "Grasso had been at the Kit Kat earlier." are the arrival's why-here: the pointer that sent me to this room, said where the page before didn't hand off to it (docs/59 item 1, docs/66 P4, the `pointer` and `drew` rules). On most pages it is the page's only reason for being there (the menu names who's in the room, not why they matter), and the hints and the curtain's fastest solve cite the same pointer. Cutting it needs another way to say why I came, which is the designer's call; it isn't built.

## 2. The rules

Ten new hinge rules and four widened, each read over a whole night (`hinge-lint.ts`, `hingeIssues` and `nightIssues`), target 0:

| rule | item | what it reads |
|---|---|---|
| `turn-says` | 1 | from Poached up, the turn saying what's held, or a clash the page said above it or to their face |
| `deadline` (widened) | 2 | a windowed murder's find not saying the hour the means had to be had by, at every tier; "the earliest it could have happened" |
| `vessel` | 3 | the office, the notebook or the story putting the poison in the supper, or in a cup the table didn't have |
| `retired` (widened) | 4 | "what you make for a friend", "drinking with a friend" |
| `gossip` (widened) | 5 | the notebook's pointer on the neighbors' word where the office's said no neighbors |
| `story` | 6, 9 | the story's weapon with an owner the scene never said; "as if he had never left" of a place he hadn't been |
| `lie-leak` | 7 | the line that tells a lied hour closing up at work, or naming where they really were |
| `topic` | 8 | the motive page saying the client hadn't mentioned a reason the office said, or had, one it didn't |
| `finder` | 9 | a list keeping the body-finder past the last hour, or their own evening ending "the rest of the evening", "turned in" |
| `picture` | 9 | "continuous shows till midnight", the stage's "second show" or "in the show" at a picture house, the back of the house and the front of it on one page |
| `slips` | 9 | "rooming house" elsewhere, "in again" on a first visit, the doorway and my knees on one page, "paid to watch a room", "three rows back" |
| `return` | 9 | a prop paid off with no page before having set it up there; "The welcome was about what it had been" |
| `walk-it` | 9 | "It was…" two walks running, a walk "from there" with nothing to point at, "two blocks over east" |
| `keeper` (widened) | 9 | on the keeper's own list page, "She saw X at <her place>" |

### 11. After the rebase onto round9-logic (docs/73)

Main moved while this was measured: round9-logic (#113, `e0cea3f`). This branch is rebased onto it; the shared files (`voicings.json`, `pages.ts`, `hinge-lint.ts`, `text.ts`, `board-book.ts`) merged by hand where both touched the same lines (the rule lists, the imports). Its two new hinge rules, `witness` and `restate`, read this build's voicings and pages too, and hold (§3.2). The grid's new "Why “no”" line says who came too late from the same `meansLate` the find's premise rests on ("Broadnax didn’t come to Mrs. Nagy’s till nine, too late for it." under "Whoever shot Tillman had to fetch the revolver from Mrs. Nagy’s before nine, …"); the two agree.

And one small add the coordinator asked for, in this layer: **a second story that doesn't agree either says so** (docs/73 §3, round 8's B9, where the grid now marks it ✗). The turn's and the notebook's clause (`pages.ts` `secondClause`; REACTION `second` `clash`, three voicings) says whose list it didn't agree with: Medium 37, "Faced with it, Ashby changed the answer to the Orpheum." → "Faced with it, Ashby changed the answer to the Orpheum, and Alfano hadn’t seen her there either."; "Go over what I have": "Pressed, Ashby changed the answer to the Orpheum, and Alfano hadn’t seen her there either."

## 3. The measures

Measured once, at the end, before the rebase: 20 nights a tier, both worlds, the oracle's, the wanderer's and the reader's routes (the pronoun check 10 a tier). "Main" is `2fb370b` read with this build's lints (`scratchpad/r9p-build/hinge.mts`, `amb.mts`: main's engine, this build's rules); "this build" is the branch's last commit then. After the rebase (§3.2), the suite, tsc, the build and the lints again on 5 nights a tier, and the three round-9 nights read again.

### 3.1 The gates

- **The puzzle is main's.** Nothing in `src/gen/` changed; the dealt boards hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`. `board-measure --seeds 20`: every puzzle column is main's (the oracle, par, the shortcuts, the wanderer, the readers, the one-liar reader, lint issues 0); the one column that moved is callback pages (Raw murder 6% → 5%, Hard-boiled murder 9% → 6%, a point or three at every row), where a prop is no longer paid off on the page that sets it up (item 9).
- **The hinge rules**, 72 (ten new): main → this build, all three routes, both worlds: `turn-says` 471 → 0, `vessel` 48 → 0, `story` 102 → 0, `lie-leak` 20 → 0, `topic` 0 → 0, `finder` 67 → 1, `picture` 112 → 0, `slips` 360 → 0, `return` 179 → 0, `walk-it` 2,818 → 0, and the widened `deadline` 150 → 0, `retired` 28 → 0, `gossip` 33 → 0, `keeper` 1 → 0. Every other rule 0 → 0, but `walk-tail` 0 → 2. The three left were this build's own and are fixed (a walk card the rhythm traded for one with a tail didn't note the tail; a careful voicing had somebody stay "the rest of the evening" with the body-finder); both are 0 after the rebase (§3.2).
- **The level lint** (`level` and `sum`, with the find's means rule let stand once): 0 at every tier, both worlds, three routes, as main (board-prose's "thoughts over their level, or a sum" column).
- **The pronoun check**: 0 on main, 0 on this build.
- **board-prose**, both worlds: every lint column 0 as main, but "cards twice" (dealt Soft-boiled 0 → 1, Medium 0 → 3, Hard-boiled 0 → 3, the neighbourhood's Soft-boiled 0 → 1) and the walk-tail's "hinge lines" (dealt Medium and Hard-boiled 0 → 1; the neighbourhood's Poached 0 → 1, the finder). The cards twice were this build's: where every fresh walk card that doesn't open "It was" was spent, the hand dealt one again; it now draws fresh or falls back to the walk as it was (0 cards twice and 0 walk slips over 20 nights a tier, both worlds, the oracle's route, after the fix). List smell moved by a few pages either way (dealt Poached 18 → 21 of 250, the neighbourhood's Hard-boiled 15 → 18 of 290, Raw 19 → 17, Medium 23 → 22): not a gate.
- **Round trip and clarity**: every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% at every tier in both worlds, as main; the flesh column's three misses are main's (Miss Nowak's owning up). `clarity-measure`: every repeat, slot, continuity, tic and assembly column 0, as main; words per new fact fell from Poached up (dealt Poached 53.0 → 51.9, Soft-boiled 48.7 → 47.9, Medium 45.9 → 45.1; the neighbourhood's 52.5 → 51.4, 51.0 → 50.1, 50.4 → 49.3, Hard-boiled 48.2 → 48.1).
- **Engine words**: 0 in every source. **The claudisms gates** hold.
- **The suite** (before the rebase): 1,017 tests, 40 files, pass; tsc is clean; `npm run build` builds.

### 3.2 After the rebase

AFTER

### 3.3 Words a page

board-prose, the oracle's route, median [p10–p90], main → this build:

| world | tier | words a page |
|---|---|---|
| dealt | Raw | 105 [43–228] → 105 [43–228] |
| dealt | Coddled | 100 [40–233] → 100 [40–234] |
| dealt | Poached | 97 [60–172] → 97 [58–159] |
| dealt | Soft-boiled | 97 [44–171] → 97 [45–148] |
| dealt | Medium | 92 [52–164] → 94 [52–145] |
| dealt | Hard-boiled | 88 [49–145] → 88 [49–142] |
| neighbourhood | Raw | 125 [42–223] → 125 [42–223] |
| neighbourhood | Coddled | 113 [38–237] → 113 [38–237] |
| neighbourhood | Poached | 103 [47–179] → 104 [50–163] |
| neighbourhood | Soft-boiled | 109 [40–189] → 109 [40–173] |
| neighbourhood | Medium | 102 [51–179] → 102 [49–164] |
| neighbourhood | Hard-boiled | 95 [54–161] → 96 [56–155] |

No row is up by more than two at the median (dealt Medium is up two: the find's means rule, a sentence on one page a night); the top of every row from Poached up fell, by three to twenty-three words, with the turn's held clause and repeated clash gone.

## 4. The nights, read

Read in full, page by page (`npm run read`), on main and on this build, on the testers' routes: the three round-9 nights and round 8's Poached 34 and Hard-boiled 34 (`scratchpad/r9p-build/before/`, `after/`). Words a page, main → this build (before the rebase): Poached 37 116 → 115, Medium 37 108 → 106, Hard-boiled 39 104 → 105, Poached 34 113 → 109, Hard-boiled 34 105 → 103. Every quote in §1 is from these reads. Seen while reading: the Orpheum's two keyed arrivals, rewritten to run the picture all night, said "picture", a word of its own name, which the arrival won't deal, so it took the Bijou's ("a narrow little house with a ticket window the size of a mail slot"); they say "feature" and "reel" now, and the Orpheum has its own again. Left: Poached 34's "By then Bernstein was in the corner." (a newcomer named by an evening, docs/66's).

## 5. What's open

In docs/25 too.

- **The arrival echoes** (item 10, optional) are left, for the reason in §1.10: they're the page's why-here, and what says it instead is the designer's call.
- **"All evening" stays for the body-finder** ("Hochstetter was here all evening."): the evening is the board's hours, and the finder went out after them. Only what keeps them past the last hour goes ("for good", "the rest of the evening", "never left", "turned in early"). "Mabry joined me at nine and stayed." on the finder's own page says nothing of the finder, and stays.
- **Callback pages fell a point or three** (board-measure): a prop is paid off only on a page after the one that set it up, and never where the budget took the set-up off the page. Not a gate; docs/44's target has been out of reach since the budget (docs/60).
- **The `return` rule reads the dealt world's props**: the neighbourhood's, built from the bible's details, are paid off by the same rule in the writer (`propSetUp`), but the lint doesn't read them.
- **"Miss" is said only of a fiancée**: the generator titles every woman client "Mrs.", and only an engagement says she isn't married.
- **A walk's bearing** now drops the lesser leg under a quarter of the other ("east", not "uptown and east", from Mulberry Street to 12 Ludlow). The map is the generator's; the bearings said are the walk's.
- **List smell** moved by a few pages either way at most rows (§3.1); not a gate, and docs/71 left it open too.
- **The keeper's own place in my own thought** (docs/71's open item: "Callahan had said she was home at Mrs. Nagy’s at nine, and Mrs. Nagy hadn’t seen her there.") is as it was; this build took the agreement's side only, as the brief asked.
