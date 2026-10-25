# Round 7 fixes

*2026-10-25, branch `round7-fixes`, off main at `04b40d7` (clarity-4, #104). Round 7's blind testers played four new nights on main (Raw 23, the Persian cat; Poached 17, a murder; Medium 21, a murder; Hard-boiled 19, a pair night; `scratchpad/round7-digest.md`, reports `scratchpad/r7-*.md`, saves `scratchpad/playtest7-*.json`). All four solved by deduction, and they hit real bugs and wrong facts, each checked against the board. This build fixes the digest's "Bugs and wrong facts", B1–B8, by rule, in the layer that makes the line, never for one night, and B9, the designer's mid-build: the report asks whether anyone else lied, and never says that somebody did. The prose patterns (P1–P9) and the interface items (U1–U4) are the next build's. Every wrong fact a lint can catch has a rule in `hinge-lint.ts` (ten new ones) and a test in `test/hinge.test.ts`; every bug has a regression test on its own night in `test/round7.test.ts`. Nothing in `src/gen/` changed.*

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

- Seven stars: "Ashby, Lindemann and Winslow were at the supper, and nobody had said where any of them was at ten". docs/65's group phrase assumed everybody with access was at the table.
- The parlor: "Whoever it was had been at the supper at the Thorndike flat, one of his guests." (which would rule the lodger out).
- The elimination: "That left one person: somebody who had been at the supper and knew that the door was left unlocked".
- The office: "“Winslow …, and Ashby …,” my client said. “That was everybody.” / His lodger, Lindemann, a shoe clerk, had lost her key again. “So I left the door unlocked for her sake,” he said, “and everybody at the table at eight heard me say so.”" Three testers in four read her as a guest.

**The rule:** "at the supper" only of a group who were all at it. Where the office gave somebody the way in without a seat at the table (the lodger, `givens.access`), the way in is said as what they all knew: the star's group ("Ashby, Lindemann and Winslow knew the door would be unlocked, …": a star's reason never says "left", docs/46 §1), the elimination ("somebody who knew that the door was left unlocked"), the find ("Whoever it was knew the door would be unlocked: one of his guests at the supper at the Thorndike flat, or the lodger it was left unlocked for."). The office says where the lodger was: "His lodger, Lindemann, a shoe clerk, was out, and had lost her key again." (the lodger is never at the party: 79 of 79 latch-key nights, seeds 1–60, both worlds), and so does the notebook ("Lindemann lodges there, was out, and has lost her key again, so the door was left unlocked."). The turn's recap of who could have got in names the guests at the table and leaves the lodger to the office's line ("Mosley and Mulcahy had been at the meeting and knew…", of a lodger, was the same slip on another night).

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
- **A plural name takes "were"** (`places.json`, `connective.json`, `pages.ts` `namePlural`): "Mrs. Nagy’s rooms on East Fourth Street was a tall thin house" (and, on other nights, "The Delmonico rooms was where I’d left it"). A card whose verb says how many takes a name of that number (`{NameOne}`, `{NameMany}`, `{PlaceOne}`); the walk's own were-rule reads the same head noun.
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
| star | B4, B5 | a star's reason, on every page, or a fastest-solve step, asking who somebody passed outside Medium, taking "the way over" as known, or putting somebody at the supper who wasn't at the table |
| party | B5 | the narration putting somebody at the supper who wasn't, or "one of his guests" where the lodger knew the way in too |
| deadline | B6 | a windowed murder's find not saying the hour the means had to be had by; a "hadn't" of somebody there only after, without why |
| clock | B8 | the close at a time the clock didn't show, or "Eight o’clock came" before eight |
| pet-it | B8 | a named pet "it" in the crack |
| gossip | B8 | the neighbors' word on what the client was party to, in the office or the notebook |
| number | B8 | a plural place name with "was" |
| both | B8 | "had all been" of two |

## 3. The measures

MEASURES

## 4. The nights, read

Each of the four nights read in full, page by page, with the choices, the notebook, the grid, the verdict, the story and the curtain: along the tester's own route (replayed from their save, marks and all, `scratchpad/r7fix/night.mts`; and with `npm run read --route … --curtain`) and along the oracle's, on main (`04b40d7`) and on this branch (`scratchpad/r7fix/{before,b1}/`, `scratchpad/r7fix/read/{main,b2}-*`). Everything not listed is main's, word for word, but for a card or a voicing a page or two on that the change in what a page said before it moved (a different walk card at Mrs. Nagy’s, "There was a snag. He had said he was at Moe’s at nine, and Bidwell hadn’t seen him there." for "…didn’t see him there then.").

**Raw 23** (the cat; the tester's route and the oracle's):

- The office: "His lodger, Lindemann, a shoe clerk, had lost her key again." → "…, was out, and had lost her key again."; "He lost his job on Friday, and asked me what Mimi was worth. I had it from the neighbors, and they hear most things." → "He lost his job on Friday. I had that from the neighbors, and they hear most things. And he asked me what Mimi was worth."
- Seven stars, the office to the Shamrock, and the fastest solve's step 2: "Ashby, Lindemann and Winslow were at the supper, and nobody had said where any of them was at ten" → "Ashby, Lindemann and Winslow knew the door would be unlocked, and nobody had said where any of them was at ten". After Pickering's list (Lindemann placed), "Ashby and Winslow were at the supper, …", as on main: both were.
- The parlor: "Whoever it was had been at the supper at the Thorndike flat, one of his guests." → "Whoever it was knew the door would be unlocked: one of his guests at the supper at the Thorndike flat, or the lodger it was left unlocked for."
- The Odessa's turn: "That left one person: somebody who had been at the supper and knew that the door was left unlocked, …" → "That left one person: somebody who knew that the door was left unlocked, …".
- The confrontation (the tester's): "“All right. I took it. It’s with Pardo, …”" → "“All right. I took her. She’s with Pardo, …”", and on the form and in the verdict "What proves where it is" → "What proves where she is".
- The notebook: "Lindemann lodges there and has lost her key again, …" → "Lindemann lodges there, was out, and has lost her key again, …"; "Thorndike points at Winslow. The neighbors say he lost his job on Friday, and asked Thorndike what Mimi was worth." → "Thorndike points at Winslow: he asked Thorndike what Mimi was worth, and the neighbors say he lost his job on Friday."

**Poached 17** (the tester's route and the oracle's):

- Mrs. Nagy’s, the way in: "Mrs. Nagy’s rooms on East Fourth Street was a tall thin house that leaned a little on its neighbor, …" → "Mrs. Nagy’s, on East Fourth Street, was quiet at this hour." (the walk before it takes a line of the street).
- Mrs. Nagy’s list: "So Dandridge and Callahan had all been at Mrs. Nagy’s, where the carving knife was kept, and had all left by nine." → "…had both been …, and had both left by nine."
- Dandridge's evening: "Renfro and Quill were with me at first and left after eight. Nobody with me at nine." → "Renfro kept me company at eight. Quill was with me at first and left after eight. Nobody with me at nine."
- The verdict: "I closed the case at a quarter to eight" → "at eight" (the tester's, at 8:00) and "at ten to seven" (the oracle's, at 6:50); "Who else lied: Rufus Dandridge ✓" → "Did anyone else lie? Rufus Dandridge ✓"; the score line "who, who else lied, when, …" → "who, whether anyone else lied, when, …". The form's question: "Someone else lied too. Who, and what clears them?" → "Did anyone else lie? If so, who, and what clears them?".
- The confront box: "… You don’t have to: the report takes what proves she lied either way." → "Confronting her takes an action and isn’t needed to prove she lied, but she may name somebody who can clear her."

**Medium 21** (the tester's route and the oracle's):

- The floor: "Whoever stabbed Mulcahy had been at Kowalski’s first." → "Whoever stabbed Mulcahy had been at Kowalski’s for the knife before nine, the earliest it could have happened."
- Mrs. Kowalski's list: "Mosley had been at Kowalski’s earlier, when the carving knife was there for the taking; Vitale hadn’t, though. So Salerno and Sweeney had all been at Kowalski’s, …, and had all left by ten." → "…, and Vitale didn’t come till nine, too late for it. So Salerno and Sweeney had both been at Kowalski’s, …, and had both left by ten." (The oracle's: "…every one of them had gone by ten" → "both of them had gone by ten".)
- The stars to the Blue Lantern and on Vitale: "ask Vitale who she passed on the way over at ten" → "Vitale walked over from Kowalski’s at ten — ask Vitale who she passed on the way".
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

**867** (main's 836, and 31 new), all passing at three workers (`npx vitest run --minWorkers=1 --maxWorkers=3`); `tsc` is clean.

- `test/round7.test.ts` (19): B1 on Hard-boiled 19 (refused with where he is, the save untouched; in the room it opens; an old save's open picker says "Mosley isn’t here." and keeps nothing; no picker for anybody away on the oracle's nights at Poached up); B2 on Hard-boiled 19 and Poached 17; B3 on Hard-boiled 19 (curtain, story, both clash lists); B4 on Hard-boiled 19's step 7 and Medium 21's star; B5 on Raw 23 (the stars, the office, the parlor, the turn); B6 on Medium 21 (the find, Vitale, `meansLate`, the grid's hover) and Hard-boiled 19; B7 at Poached and Raw; B8 (the clock's words and the close, the cat, the label, the gossip in the office and the notebook, plural names, "both"); B9 (asked by tier at every tier; the constructed one-liar night).
- `test/hinge.test.ts` (9): each new rule catches main's line and passes this build's (§2).
- `test/plain-words.test.ts` (3): B9's chrome.
- Updated: `round4.test.ts` (Medium 14's star: "Pickering walked over from the Delmonico rooms at ten — ask Pickering who she passed on the way"), `plain-words.test.ts` (the confront box), `board-engine.test.ts`, `other-liar.test.ts` and `round5.test.ts` (B9's words).

## 6. What's open

OPEN
