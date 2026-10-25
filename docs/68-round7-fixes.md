# Round 7 fixes

*2026-10-25, branch `round7-fixes`, off main at `04b40d7` (clarity-4, #104), with main at `c1c6745` (hints, #105, docs/67) merged in; the measures are against `c1c6745`. Round 7's blind testers played four new nights on main (Raw 23, the Persian cat; Poached 17, a murder; Medium 21, a murder; Hard-boiled 19, a pair night; `scratchpad/round7-digest.md`, reports `scratchpad/r7-*.md`, saves `scratchpad/playtest7-*.json`). All four solved by deduction, and they hit real bugs and wrong facts, each checked against the board. This build fixes the digest's "Bugs and wrong facts", B1–B8, by rule, in the layer that makes the line, never for one night, and B9, the designer's mid-build: the report asks whether anyone else lied, and never says that somebody did. The prose patterns (P1–P9) and the interface items (U1–U4) are the next build's. Every wrong fact a lint can catch has a rule in `hinge-lint.ts` (ten new ones) and a test in `test/hinge.test.ts`; every bug has a regression test on its own night in `test/round7.test.ts`. Nothing in `src/gen/` changed.*

## 1. The bugs, and the rules

### B1. Confronting somebody from another room did nothing, silently (`src/cli/play-lib.ts`)

**Before** (Medium 21 once, Hard-boiled 19 three times): `confront Mosley` at the card room opened the picker for anybody, wherever they were. The last pick was committed to the save as an event; `stepBoard` answered "Mosley isn’t here." and the CLI printed the page again without a word. The curtain then said "You never confronted him."

**The rule:** a confrontation is made to their face. `confront <Name>` refuses where they aren't, with where they are: "Mosley isn’t here. He’s at Moskowitz’s, and confronting him takes a walk there first." And every command the CLI commits goes through the engine first (`commit`): whatever the engine turns down is said, and the save keeps nothing of it (a save with a picker left open from before the fix gets "Mosley isn’t here." on the pick, its events untouched).

**The book can't get there:** its picker opens only from a person's row on the page, and a page's rows are the people in the room (`boardChoices` over `peopleAt`); a test walks the oracle's nights at Poached up and finds no picker for anybody away.

### B2. A telling by change invented a coming and a going (`src/game/board/tell.ts`)

**Before:**

- Hard-boiled 19, Bledsoe: "Somebody in a fur collar came in for a bite at nine and was gone by ten. Mosley came in at ten." The fur collar was Mosley, there both hours. The tester nearly dropped the right answer.
- Poached 17, Dandridge (lying about nine): "Renfro and Quill were with me at first and left after eight. Nobody with me at nine." Renfro was at Moe's all evening (Bidwell said so). The tester spent thought on it as a second lie.

**Where it came from:** the telling, both times. A watcher's list is told by what changed (`listByChange`), entry by entry; a face (`look:in a fur collar`) and a name (`mosley`) were two entries, so the face "was gone by ten" and the name "came in at ten". A stretch of somebody's company is told the same way (`companyByChange`): the generator gives a liar's lie hour no company (`claimOverride`, "nobody with me", the liar's lie about themselves), so the companion of the hour before was missing from it, and the telling said they "left after eight". Nobody lies about what they saw: the account's facts never had Renfro leave; the telling inferred it. So the telling is where it's fixed, and nothing in the generator changed.

**The rule:** a telling by change says somebody came or left only where the board has them come or go, and a face and a name at one place are one person, the face's owner. Each clause's run of hours is checked against the board an hour either side: where the board has them there the hour before (no coming) or the hour after (no going), the clause says only the hours (`seen`): "Mosley was here at ten.", "Renfro kept me company at eight." (never "was with me at eight", which read as one more hour slot of a timetable, clarity's `slots`); a single hour they really did come in at says so ("Somebody in a fur collar came in for a bite at nine."). New voicings (`list/c-seen-*`, `claim/w-seen-*`), read back by `reread.ts` (`seen`: the hours said).

**After:**

- "Hauck and Vitale were in from the start of the evening and didn’t leave till after eight. Somebody in a fur collar came in for a bite at nine. Mosley was here at ten. Nobody else came in all evening."
- "Eight, I went to Moe’s to see who was in, and stayed through nine. Renfro kept me company at eight. Quill was with me at first and left after eight. Nobody with me at nine."

### B3. A pair night cited the partner's agreeing line as what broke the story (`knowledge.ts`, `report.ts`, `grid.ts`)

**Before** (Hard-boiled 19, Grasso covered by Mosley, Mosley seen at Moskowitz's only as "somebody in a fur collar"):

- The curtain: "What gave it away: Mosley says he was at Grasso’s flat at nine o’clock, with Grasso." That's her alibi.
- The story: "Asked, she said she had been home at nine. Bledsoe and Mosley said otherwise."
- The grid's WHERE THEY CLASH, after the tester's mark: "Mosley, nine: Mosley says … with Grasso. Grasso says … with Mosley." Two lines that agree.

**The rule:** what broke a story is never a line that says what the liar said (`agreesWith`: a line from somebody else placing them where they claimed, at that hour). On a pair night the solver's break rests on the partner's story too, so it's still one of the collision's lines (and the report still takes it), but it comes after the lines that don't agree (`breakersOf`, `agreeingLast`): the curtain's "What gave it away", the oracle's own filing and the readers' proof are the face. The story says the pair for what it was (`breakerOf`): the partner said the same, to cover, and the face was theirs; a "said otherwise" never names somebody whose line agrees. The grid's clash lists the person's own word, what broke it (the lines that touch the claim, and a face that was theirs to match), the player's mark that matched it, and what came after; never a line that only agrees. The curtain says whose the face was: it's where the truth is told.

**After:**

- "What gave it away: Bledsoe: at nine o’clock, only somebody in a fur collar was at Moskowitz’s; Bledsoe couldn’t say who that was. The one in a fur collar was Mosley."
- "Asked, she said she had been home at nine. Mosley said the same, to cover for her, but Bledsoe, the head waiter, had seen only somebody in a fur collar at Moskowitz’s at nine, and that was Mosley."
- "Mosley, nine: Mosley says he was at Grasso’s flat at nine o’clock, with Grasso. / Bledsoe: at nine o’clock, only somebody in a fur collar was at Moskowitz’s; … / Your guess: Mosley at Moskowitz’s at nine." (and the same under Grasso, nine).

### B4. A star asked who somebody passed, where nobody passes anybody (`stars.ts` `starReason`)

**Before** (Hard-boiled 19's fastest solve, step 7, which since clarity-4 is the star's reason): "Ask Grasso: where were you tonight? ask Grasso who she passed on the way over at nine." Three things wrong: it named no pointer at all; "on the way over" was a walk home; and only Medium has a passer-by's word (docs/65 §1), so the question pointed at nothing an answer could hold. At Medium the same reason took the walk as known ("ask Vitale who she passed on the way over at ten"), as the hand-off had until docs/66.

**The rule:** a star asks who somebody passed only at Medium, and says the walk first, as what's known, with where it went: "Vitale walked over from Kowalski’s at ten — ask Vitale who she passed on the way" (and "walked home" for a walk home). Elsewhere the reason is the pointer, as for any evening: "Mosley says Grasso was with him at Grasso’s flat at nine: ask Grasso where she was." Wording only; the star's choice is the `hints` build's.

### B5. "Were at the supper" of a lodger who wasn't at the table (`stars.ts`, `bones/phrase.ts`, `pages.ts`, `voicings.json`)

**Before** (Raw 23, the door left unlocked for the lodger, Lindemann):

- Seven stars (on `04b40d7`; since docs/67 the reason a hint quotes, and the fastest solve's step 2): "Ashby, Lindemann and Winslow were at the supper, and nobody had said where any of them was at ten". docs/65's group phrase assumed everybody with access was at the table.
- The parlor: "Whoever it was had been at the supper at the Thorndike flat, one of his guests." (which would rule the lodger out).
- The elimination: "That left one person: somebody who had been at the supper and knew that the door was left unlocked".
- The office: "“Winslow …, and Ashby …,” my client said. “That was everybody.” / His lodger, Lindemann, a shoe clerk, had lost her key again. “So I left the door unlocked for her sake,” he said, “and everybody at the table at eight heard me say so.”" Three testers in four read her as a guest.

**The rule:** "at the supper" only of a group who were all at it. Where the office gave somebody the way in without a seat at the table (the lodger, `givens.access`), the way in is said as what they all knew: the star's group ("Ashby, Lindemann and Winslow knew the door would be unlocked, …": a star's reason never says "left", docs/46 §1), the elimination ("somebody who knew that the door was left unlocked"), the find ("Whoever it was knew the door would be unlocked: one of his guests at the supper at the Thorndike flat, or the lodger it was left unlocked for."). The office says where the lodger was: "His lodger, Lindemann, a shoe clerk, was out, and had lost her key again." (the lodger is never at the party: 79 of 79 latch-key nights, seeds 1–60, both worlds), and so does the notebook ("Lindemann lodges there, was out, and has lost her key again, so the door was left unlocked."). Where the find's own card has said already that the door was left unlocked for the lodger, just as the client told the table, the thought after it goes, saying nothing new (docs/59's once pass). The turn's recap of who could have got in names the guests at the table and leaves the lodger to the office's line ("Mosley and Mulcahy had been at the meeting and knew…", of a lodger, was the same slip on another night).

### B6. The weapon's deadline was never said (`pages.ts`, `thought.ts`, `bones/compose.ts`, `knowledge.ts`)

**Before** (Medium 21, the knife "there at seven", the window nine or ten): a windowed murder's means had to be taken before the window's first hour (`generate.ts`: `available` is the hours before it), so Sweeney (there at eight) could have had it and Vitale (there at nine) couldn't. The page said "Whoever stabbed Mulcahy had been at Kowalski’s first." and then "Mosley had been at Kowalski’s earlier, when the carving knife was there for the taking; Vitale hadn’t, though." about a woman the landlady had in the house at nine. The tester never understood it.

**The rule:** the page that finds where the means came from says when it had to be had by, plainly: "Whoever stabbed Mulcahy had been at Kowalski’s for the knife before nine, the earliest it could have happened." (a MEANS `first` with `before`, voicings `window-means/find-first-*-before`). Who's ruled out on it, having been where it was kept only after, is said with why (`meansLate`; ACCESS with the hour they came): "Vitale didn’t come till nine, too late for it." The notebook's "How it adds up" says it too, and the grid's hover for the means column. Not on the "How this works" page: that's the designer's call, still open.

### B7. The confront box wasn't quite true (`choices.ts` `pickerNote`)

**Before:** "Confronting her takes an action, whether she talks or not. You don’t have to: the report takes what proves she lied either way." (23 words). Confronting the innocent liar is how you learn who clears them.

**After:** "Confronting her takes an action and isn’t needed to prove she lied, but she may name somebody who can clear her." (20 words), from Poached up, where an innocent liar can be dealt; at Raw and Coddled, "… but he may tell you more." (18).

### B8. The small slips

- **The verdict's time** (`night.json`, `report.ts`): "I closed the case at a quarter to eight" at 8:00. An ending names only the clock's time: "I closed the case at {closedAt}" (`clock.ts` `clockWords`: "eight", "ten to seven"), from five, when the city is waking up; "Eight o’clock came" only when it had.
- **A named cat is "her"** (`voicings.json`, `pages.ts`, `report.ts`): "“All right. I took it. It’s with Pardo…”" → "“All right. I took her. She’s with Pardo, a man who buys things and asks nothing.”"; the form's "What proves where it is" → "What proves where she is" (`whereByLabel`), under "Where she is now".
- **The neighbors' word** (`pages.ts`, `text.ts`): "He lost his job on Friday, and asked me what Mimi was worth. I had it from the neighbors" → "He lost his job on Friday. I had that from the neighbors, and they hear most things. And he asked me what Mimi was worth." The neighbors' word covers only what the client couldn't know himself; a reason he was party to all through ("he and I haven’t spoken") is his own. The notebook: "Thorndike points at Winslow: he asked Thorndike what Mimi was worth, and the neighbors say he lost his job on Friday."
- **A plural name takes "were"** (`places.json`, `connective.json`, `pages.ts` `namePlural`): "Mrs. Nagy’s rooms on East Fourth Street was a tall thin house" (and, on other nights, "The Delmonico rooms was where I’d left it"). A card whose verb says how many takes a name of that number (`{NameOne}`, `{NameMany}`, `{PlaceOne}`); the walk's own were-rule reads the same head noun. Mrs. Nagy's is the one place whose own card (`bpl-1045`, key `rooming:3`) then fitted nothing, so it takes the short name, which is one house: "Mrs. Nagy’s was a tall thin house on East Fourth Street that leaned a little on its neighbor, …".
- **"Had both been"** (`thought.ts`, `voicings.json`): "So Dandridge and Callahan had all been at Mrs. Nagy’s …, and had all left by nine" → "had both been …, and had both left by nine" (and "every one of them" of two → "both of them").
- "Someone else lied too" beside "Nobody else" was left to the designer at first; it's B9 now.

### B9. The report said that somebody else lied before the player had found them (`report.ts`, `teach.ts`, `play-lib.ts`)

The designer's, mid-build: the report must never say that somebody else lied.

**Before:** the form's question was "Someone else lied too. Who, and what clears them?", and the help said "When two people lied, it also asks who else lied and what clears them." It was asked only on a night with an innocent liar (`asksOther` was `otherLie(d) !== null`), so the question being there was the tell (three testers in round 7, two in round 6). The CLI's own words leaned the same way: "If Grasso is the other liar, give “cleared” …", "Name who else lied first", "Tonight’s form doesn’t ask who else lied"; the verdict's row was "Who else lied" and its score line "who, who else lied, when, …".

**The rule:** asked, never told, and asked on every night from Poached up, by tier (`asksOther`: `tier >= 2`), with "Nobody else" a real answer, scored right where nobody else lied. Today every night from Poached up deals an innocent liar (the coordinator's count: 270 of 270, seeds 1–30, every type), so nothing changes in play; the code is ready for the generator to deal one-liar nights.

**After:**

- The form (book and CLI): "Did anyone else lie? If so, who, and what clears them?", the suspects and "Nobody else" for answers; "What clears them" under it, asked of a name.
- The help: "… A hunch counts half. On the harder cases it also asks whether anyone else lied, and if so, what clears them."
- The CLI: "If you say Grasso lied too, give “cleared” as a number from this list too."; "Name them first (other=…): …"; "Tonight’s form doesn’t ask whether anyone else lied, so there’s nothing to clear."; the help's "other and cleared from Poached up: whether anyone else lied (other=nobody if not), and what clears them".
- The verdict: the row asks "Did anyone else lie?"; the score line "who, whether anyone else lied, when, …", with "and what clears the other liar" only where there was one (after the case is closed, the truth may be told). On a one-liar night, naming somebody says "Nobody else lied: Dandridge had told the truth."; the curtain has "DID ANYONE ELSE LIE? / Nobody else." with what was picked.
- Left as it is (the designer): the teach page's "When two people lied, you also need what clears the innocent one." It doesn't say how often.

**How the one-liar path is tested:** no dealt night has one, so `test/round7.test.ts` makes one: Poached 17 with the innocent liar's lie struck from the deal's `lies` (`{ ...d, kase: { ...d.kase, lies: [the culprit's] } }`), which is how a one-liar deal would read to the report (`otherLie` is null). On it the form asks, the truth is "Nobody else" with no line to clear, "Nobody else" scores 5 of 5 (no "what clears" row), Dandridge scores the point away and the verdict says why, and the curtain says nobody else lied. `test/plain-words.test.ts` holds every piece of chrome to it: the question, its labels, the help, the CLI's form, lists, help and refusals over a night, and the book's own strings never say "someone else lied", "who else lied", "the other liar" or "when two people lied, it also asks".

## 2. The lints (`hinge-lint.ts`)

Ten new rules, in `hingeIssues` (the pages) and `nightIssues` (the after-pages: the curtain, the story, the grid, the close, the notebook), each with a test that catches the line main said and passes the line this build says.

| rule | item | catches |
|---|---|---|
| moved | B2 | a telling by change (a list, a stretch of company) saying a coming or going the board doesn't have, a face counted as its owner (read off the clauses' voicings and propositions) |
| agrees | B3 | the curtain's "What gave it away", the story's "said otherwise" or a clash's list citing a line that agrees with the lie |
| star | B4, B5 | a star's reason (the designed stars and the step a hint would give, on every page, as the choice it would sit on says it), or a fastest-solve step, asking who somebody passed outside Medium, taking "the way over" as known, or putting somebody at the supper who wasn't at the table |
| party | B5 | the narration putting somebody at the supper who wasn't, or "one of his guests" where the lodger knew the way in too |
| deadline | B6 | a windowed murder's find not saying the hour the means had to be had by; a "hadn't" of somebody there only after, without why |
| clock | B8 | the close at a time the clock didn't show, or "Eight o’clock came" before eight |
| pet-it | B8 | a named pet "it" in the crack |
| gossip | B8 | the neighbors' word on what the client was party to, in the office or the notebook |
| number | B8 | a plural place name with "was" |
| both | B8 | "had all been" of two |

## 3. The measures, main → this branch

Main is `c1c6745` (hints merged, an exported copy, `scratchpad/r7fix/main2`), measured with this branch's lint and its own scripts; this branch at its last commit, with main merged in. Every run held the shared lock, one at a time, three vitest workers at most (`scratchpad/r7fix/gates.sh`, `finals2.sh`, outputs in `scratchpad/r7fix/out/`, `main2-*` and `br3-*`; `measures.py` makes these tables).

**The hinge lint** (30 nights a tier, both worlds, three routes: the oracle's, the wanderer's and the reader's, with `nightIssues` on the oracle's): this branch is 0 on all 42 rules, in every row. On main the 32 rules before this build are 0, and the ten new ones find 1,983 lines:

| world | tier | moved | agrees | star | party | deadline | clock | pet-it | gossip | number | both | all |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dealt | Raw | 32 | 0 | 76 | 10 | 0 | 2 | 2 | 18 | 8 | 6 | 154 |
| dealt | Coddled | 16 | 0 | 51 | 11 | 0 | 2 | 6 | 9 | 6 | 0 | 101 |
| dealt | Poached | 52 | 0 | 15 | 5 | 0 | 1 | 8 | 18 | 5 | 1 | 105 |
| dealt | Soft-boiled | 44 | 0 | 108 | 12 | 36 | 2 | 0 | 12 | 6 | 6 | 226 |
| dealt | Medium | 0 | 0 | 119 | 3 | 41 | 2 | 0 | 15 | 10 | 3 | 193 |
| dealt | Hard-boiled | 100 | 76 | 114 | 2 | 35 | 2 | 0 | 3 | 5 | 0 | 337 |
| neighbourhood | Raw | 22 | 0 | 0 | 0 | 0 | 2 | 0 | 15 | 0 | 5 | 44 |
| neighbourhood | Coddled | 14 | 0 | 12 | 0 | 0 | 2 | 6 | 39 | 0 | 0 | 73 |
| neighbourhood | Poached | 37 | 0 | 0 | 0 | 0 | 1 | 3 | 27 | 1 | 2 | 71 |
| neighbourhood | Soft-boiled | 36 | 0 | 54 | 0 | 40 | 2 | 0 | 15 | 5 | 6 | 158 |
| neighbourhood | Medium | 0 | 0 | 141 | 0 | 43 | 3 | 0 | 9 | 3 | 3 | 202 |
| neighbourhood | Hard-boiled | 89 | 54 | 128 | 0 | 35 | 2 | 0 | 9 | 2 | 0 | 319 |
| **all** | | 442 | 130 | 818 | 43 | 230 | 23 | 25 | 189 | 51 | 32 | **1,983** |

- **moved** counts a person a route: mostly a liar's company "with me at first and left after nine" when they were there at ten too (Raw 3: "Cheatham and Reinhardt were with me at first and left after nine. At ten I had nobody with me."), or "joined me at ten" of somebody there at nine; at Hard-boiled, faces too. Medium has none in either world.
- **agrees** is Hard-boiled only: only pair nights have a partner to agree.
- **star** counts every page's star reasons and the step a hint would give there, on each route, and the fastest solve's steps, so one wrong reason counts on every page it stands on (Raw 1, the dealt world: "Doyle, Lathrop and Rafferty were at the supper, …", of Rafferty, the lodger, on page after page of all three routes).
- **deadline** is from Soft-boiled up: only a windowed murder has a window to be before.
- On `04b40d7`, before hints merged, the same ten rules found 2,013 (moved 467, agrees 130, star 791, party 47, deadline 240, clock 30, pet-it 14, gossip 189, number 55, both 50; `out/main04-hinge.txt`); the hints build moved them a little, as it moved the pages.

**Dealt boards** (`scratchpad/r7fix/dealhash.mts`, docs/62 §2's: seeds 1–40, every tier and type, both worlds): dealt 600 `7b413655bf181abb`, neighbourhood 600 `1c2bed28c49370c6`, main's. Nothing in `src/gen/` changed.

**board-measure** (`--seeds 20`): **identical to main's, every cell of every row**, the oracle's, the wanderer's, the readers', par, the shortcuts, the innocent liar's first break, lint issues (0), plain-terms hits (0), choices a page and callback pages. (Before Mrs. Nagy's card was given its singular name, B8, callback pages had risen a point or two on six rows: dropping "Mrs. Nagy’s rooms … was a tall thin house" changed the cards drawn after it, and one of them set up a cat that paid off two pages on. With the card back, the dice fall as they did.)

**board-prose** (30 nights a tier, both worlds; the oracle's route for the page measures, three routes for the lints): every lint at 0 in both worlds, the 32 rules before this build and the ten new ones.

| world | tier | words a page (median) | words per new fact | list smell, pages (oracle) | pronoun ambiguity (three routes) |
|---|---|---|---|---|---|
| dealt | Raw | 106 → 106 (0%) | 64.0 → 64.0 | 31 of 280 → 31 of 280 | 0 → 0 |
| dealt | Coddled | 102 → 102 (0%) | 62.4 → 62.4 | 16 of 276 → 16 of 276 | 0 → 0 |
| dealt | Poached | 105 → 105 (0%) | 56.0 → 55.9 | 30 of 398 → 30 of 398 | 0 → 0 |
| dealt | Soft-boiled | 106 → 108 (+1.9%) | 52.2 → 52.4 | 30 of 383 → 30 of 383 | 0 → 0 |
| dealt | Medium | 99 → 100 (+1.0%) | 48.1 → 48.2 | 36 of 441 → 36 of 441 | 0 → 0 |
| dealt | Hard-boiled | 97 → 97 (0%) | 46.1 → 46.1 | 20 of 435 → 20 of 435 | 0 → 0 |
| neighbourhood | Raw | 123 → 123 (0%) | 67.9 → 67.8 | 23 of 280 → 23 of 280 | 0 → 0 |
| neighbourhood | Coddled | 113 → 113 (0%) | 67.4 → 67.4 | 19 of 276 → 19 of 276 | 0 → 0 |
| neighbourhood | Poached | 114 → 114 (0%) | 57.0 → 56.9 | 43 of 407 → 43 of 407 | 0 → 0 |
| neighbourhood | Soft-boiled | 117 → 117 (0%) | 56.5 → 56.6 | 55 of 385 → 55 of 385 | 0 → 0 |
| neighbourhood | Medium | 111 → 112 (+0.9%) | 53.2 → 53.3 | 41 of 436 → 41 of 436 | 0 → 0 |
| neighbourhood | Hard-boiled | 104 → 105 (+1.0%) | 50.9 → 51.0 | 29 of 435 → 29 of 435 | 0 → 0 |

- **Words a page** rose by a word or two at Soft-boiled and Medium in the dealt world, and at Medium and Hard-boiled in the neighbourhood: the find says the means' deadline from Soft-boiled up (B6: "…for the knife before nine, the earliest it could have happened."), and a list page now and then says who came too late. On a latch-key night the find says that the lodger knew the way in too (B5), a longer line. The median search page, dealt: Raw 90 → 93, Coddled 91 → 92, Poached 92 → 96, Soft-boiled 100 → 104, Medium 95 → 98, Hard-boiled 93 → 95 (a median of 40 pages, so a few changed pages move it: at Raw five of 40 changed, at Poached two). Where the find's own card has said already that the door was left unlocked for the lodger, as the table heard, the lodger's thought goes as saying nothing new (docs/59's once pass: five content words shared), and the page is shorter: Raw 11 and Poached 20, lost pets. List smell along the oracle's route is main's in every row; across the three routes it moved by a page or three either way (dealt Poached 73 → 74, Medium 79 → 82; the neighbourhood's Raw 70 → 68, Poached 91 → 92, Medium 87 → 88).

**The round trip** (`scripts/roundtrip.ts`, 30 nights a tier, three routes): every page read back, plain and voiced, and every voiced composite clear, 100% in every row of both worlds; flesh units naming all they say 100% but for the neighbourhood's Poached (171 of 174) and Medium (131 of 133), Nowak's admission at the Peacock, as on main. The new clauses (`seen`, a MEANS `before`, an ACCESS with the hour they came) are in the bones and read back.

**Clarity** (`scripts/clarity-measure.ts`, 30 nights a tier): every lint at 0 in both worlds, as on main (`slots` included: "kept me company at eight", never "was with me at eight", B2); words per new fact within 0.2 of main's in every row (the table above).

**The suite**: 887 tests in 33 files, all passing at three workers; `tsc` is clean (§5).

## 4. The nights, read

Each of the four nights read in full, page by page, with the choices, the notebook, the grid, the verdict, the story and the curtain: along the tester's own route (replayed from their save, marks and all, `scratchpad/r7fix/night.mts`; and with `npm run read --route … --curtain`) and along the oracle's, on main (`04b40d7`, and again on `c1c6745` once hints had merged) and on this branch, before and after main was merged in (`scratchpad/r7fix/{before,b1}/`, `scratchpad/r7fix/read/{main,b2,main2,b3,b4}-*`). The quotes are main's → this branch's; where hints moved a line (Raw's elimination is the hint's now, docs/67 §2), the line is quoted where it is now. Everything not listed is main's, word for word, but for a card or a voicing a page or two on that the change in what a page said before it moved ("There was a snag. He had said he was at Moe’s at nine, and Bidwell hadn’t seen him there." for "…didn’t see him there then.").

**Raw 23** (the cat; the tester's route and the oracle's):

- The office: "His lodger, Lindemann, a shoe clerk, had lost her key again." → "…, was out, and had lost her key again."; "He lost his job on Friday, and asked me what Mimi was worth. I had it from the neighbors, and they hear most things." → "He lost his job on Friday. I had that from the neighbors, and they hear most things. And he asked me what Mimi was worth."
- Seven stars, the office to the Shamrock, and the fastest solve's step 2: "Ashby, Lindemann and Winslow were at the supper, and nobody had said where any of them was at ten" → "Ashby, Lindemann and Winslow knew the door would be unlocked, and nobody had said where any of them was at ten". After Pickering's list (Lindemann placed), "Ashby and Winslow were at the supper, …", as on main: both were.
- The parlor: "Whoever it was had been at the supper at the Thorndike flat, one of his guests." → "Whoever it was knew the door would be unlocked: one of his guests at the supper at the Thorndike flat, or the lodger it was left unlocked for."
- The elimination (the Odessa's turn on `04b40d7`, the hint's on `c1c6745`): "That left one person: somebody who had been at the supper and knew that the door was left unlocked, …" → "That left one person who knew that the door was left unlocked, with nobody to back up where they were at ten."
- The confrontation (the tester's): "“All right. I took it. It’s with Pardo, …”" → "“All right. I took her. She’s with Pardo, …”", and on the form and in the verdict "What proves where it is" → "What proves where she is".
- The notebook: "Lindemann lodges there and has lost her key again, …" → "Lindemann lodges there, was out, and has lost her key again, …"; "Thorndike points at Winslow. The neighbors say he lost his job on Friday, and asked Thorndike what Mimi was worth." → "Thorndike points at Winslow: he asked Thorndike what Mimi was worth, and the neighbors say he lost his job on Friday."

**Poached 17** (the tester's route and the oracle's):

- Mrs. Nagy’s, the way in (the tester's): "Mrs. Nagy’s rooms on East Fourth Street was a tall thin house that leaned a little on its neighbor, …" → "Mrs. Nagy’s was a tall thin house on East Fourth Street that leaned a little on its neighbor, …".
- Mrs. Nagy’s list: "So Dandridge and Callahan had all been at Mrs. Nagy’s, where the carving knife was kept, and had all left by nine." → "…had both been …, and had both left by nine."
- Dandridge's evening: "Renfro and Quill were with me at first and left after eight. Nobody with me at nine." → "Renfro kept me company at eight. Quill was with me at first and left after eight. Nobody with me at nine."
- The verdict: "I closed the case at a quarter to eight" → "at eight" (the tester's, at 8:00) and "at ten to seven" (the oracle's, at 6:50); "Who else lied: Rufus Dandridge ✓" → "Did anyone else lie? Rufus Dandridge ✓"; the score line "who, who else lied, when, …" → "who, whether anyone else lied, when, …". The form's question: "Someone else lied too. Who, and what clears them?" → "Did anyone else lie? If so, who, and what clears them?".
- The confront box: "… You don’t have to: the report takes what proves she lied either way." → "Confronting her takes an action and isn’t needed to prove she lied, but she may name somebody who can clear her."

**Medium 21** (the tester's route and the oracle's):

- The floor: "Whoever stabbed Mulcahy had been at Kowalski’s first." ("Mulcahy’s killer had been at Kowalski’s first, for the knife." on `c1c6745`) → "Whoever stabbed Mulcahy had been at Kowalski’s for the knife before nine, the earliest it could have happened."
- Mrs. Kowalski's list: "Mosley had been at Kowalski’s earlier, when the carving knife was there for the taking; Vitale hadn’t, though. So Salerno and Sweeney had all been at Kowalski’s, …, and had all left by ten." → "…, and Vitale didn’t come till nine, too late for it. So Salerno and Sweeney had both been at Kowalski’s, …, and had both left by ten." (The oracle's: "…every one of them had gone by ten" → "both of them had gone by ten".)
- The stars to the Blue Lantern and on Vitale (on `04b40d7`; on `c1c6745` no star shows at Medium, and the reason is what the curtain's steps and a star would say): "ask Vitale who she passed on the way over at ten" → "Vitale walked over from Kowalski’s at ten — ask Vitale who she passed on the way".
- The notebook: "The carving knife came from Kowalski’s, so whoever used it had been there first." → "…, so whoever used it had been there before nine, the earliest it could have happened."
- The tester's silent `confront Salerno` from the Eagle club office now answers "Salerno isn’t here. She’s at Salerno’s flat, and confronting her takes a walk there first."

**Hard-boiled 19** (the tester's route, with the tester's mark, and the oracle's):

- The table: "To give Vitale the chloral, somebody had to go to the Delmonico rooms for it first." → "Whoever gave Vitale the chloral had been at the Delmonico rooms for it before eight, the earliest it could have happened."
- Bledsoe: "Somebody in a fur collar came in for a bite at nine and was gone by ten. Mosley came in at ten." → "Somebody in a fur collar came in for a bite at nine. Mosley was here at ten."
- The grid after the mark, WHERE THEY CLASH: "Mosley, nine: Mosley says … with Grasso. / Grasso says … with Mosley." → "Mosley says … with Grasso. / Bledsoe: at nine o’clock, only somebody in a fur collar was at Moskowitz’s; … / Your guess: Mosley at Moskowitz’s at nine." (and so under Grasso).
- The verdict's proof on the oracle's own filing: "Mosley says he was at Grasso’s flat at nine o’clock, with Grasso. ✓" → "Bledsoe: at nine o’clock, only somebody in a fur collar was at Moskowitz’s; … ✓".
- The story, the curtain's "What gave it away" and step 7 of the fastest solve: as in §1, B3 and B4.
- The tester's three silent confrontations from the card room: "Mosley isn’t here. He’s at Moskowitz’s, and confronting him takes a walk there first." (and "Grasso isn’t here. She’s at Grasso’s flat, …").

## 5. Tests

**887** in 33 files (main's 856 in 32 at `c1c6745`, and 31 new), all passing at three workers (`npx vitest run --minWorkers=1 --maxWorkers=3`); `tsc` is clean.

- `test/round7.test.ts` (19): B1 on Hard-boiled 19 (refused with where he is, the save untouched; in the room it opens; an old save's open picker says "Mosley isn’t here." and keeps nothing; no picker for anybody away on the oracle's nights at Poached up); B2 on Hard-boiled 19 and Poached 17; B3 on Hard-boiled 19 (curtain, story, both clash lists); B4 on Hard-boiled 19's step 7 and Medium 21's star; B5 on Raw 23 (the stars, the office, the parlor, the turn); B6 on Medium 21 (the find, Vitale, `meansLate`, the grid's hover) and Hard-boiled 19; B7 at Poached and Raw; B8 (the clock's words and the close, the cat, the label, the gossip in the office and the notebook, plural names and Mrs. Nagy’s own card, "both"); B9 (asked by tier at every tier; the constructed one-liar night).
- `test/hinge.test.ts` (9): each new rule catches main's line and passes this build's (§2).
- `test/plain-words.test.ts` (3): B9's chrome.
- Updated: `round4.test.ts` (Medium 14's star: "Pickering walked over from the Delmonico rooms at ten — ask Pickering who she passed on the way"), `plain-words.test.ts` (the confront box), `board-engine.test.ts`, `other-liar.test.ts` and `round5.test.ts` (B9's words).

## 6. What's open

- **B9 waits for the generator.** Every night from Poached up deals an innocent liar today (270 of 270), so the question is asked where the answer is always a name, and "Nobody else" scored right is tested on a constructed deal only. Dealing one-liar nights is the generator's, and the designer's, call.
- **B6 on the "How this works" page**: the deadline is said on the night's pages, in the notebook and in the grid's hover; whether the teach page says it too is the designer's call.
- **A hint before the means is placed cites the pointer's own hour**: "Bidwell saw Callahan at Moe’s at seven — ask Callahan where she was." (Poached 17, both routes, on a page and on the report page, docs/67 §5; docs/67 §7 left it to this branch as B4's). It's true, it's docs/65 §5's last fallback (nothing held yet puts her near the knife), and it's main's word for word; once Mrs. Nagy's list is in, the reason is the hour that matters ("Callahan and Dandridge could have had the carving knife, and nobody had said where either of them was at nine"). Whether the fallback should add the hour that matters is for the next hints or prose build. It's not a wrong fact, so it has no lint.
- **Two ways of saying company, side by side** (B2): "Renfro kept me company at eight. Quill was with me at first and left after eight." Both true; folding them is the prose build's.
- **The turn's recap and the lodger** (B5): the recap of who knew the way in names the guests at the table and leaves the lodger to the office's line. It says nothing false, but it leaves her out; a clause of her own is the prose build's.
- **The prose patterns (P1–P9) and the interface items (U1–U4)** are the next build's, as the digest has them.
