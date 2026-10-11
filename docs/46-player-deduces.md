# Build: the player deduces

*2026-10-11. Phase 2 of the 15% plan. The designer, an LSAT logic-games ace, wants a deduction game. As built, the board engine does the deducing for the player: through Medium, stars say which button to press, and the thought beat walks the elimination to the name. The player reads. This build moves the deduction back to the player without making the game opaque again (see docs/39 for what "opaque" meant: unreadable mechanics, not a lack of hints).*

*The deduction that fits this game is choosing the question that settles it next, and then saying what broke the culprit's story. Those become the player's two jobs.*

## 1. Stars point, they don't answer

A star marks a choice that would give the player a fact they don't hold. Its reason names the pointer, never the outcome: "Coffin has Ashby here at eleven", not "this clears Ashby". Rules:

- A star never names what the answer will show, who is cleared, or who is left.
- "Put it to X" is starred only at Raw and Coddled, where the pair is ready-made. From Poached up the player sees that X has a collision (the grid shows it) and chooses to put it, unstarred.
- The client is never starred.

Thinning by tier (today: Raw and Coddled every open step; Poached to Medium one cheapest path; Hard-boiled the first two steps):

| tier | stars |
|---|---|
| Raw | every open step of every cheapest way (as now) |
| Coddled | the open steps of one cheapest way (as now for Poached) |
| Poached, Soft-boiled | at most one star a page: the nearest open step |
| Medium | stars only on walks and arrivals (where to go), never on which question to ask |
| Hard-boiled | one star: the scene, on page one. None after |

## 2. Thoughts stop at the link

The thought beat after a job stays, but what it may conclude depends on the tier:

| level | tiers | may say | may not say |
|---|---|---|---|
| **walk** | Raw | everything it says today, including the elimination on the page that settles it | |
| **link** | Coddled to Medium | collisions ("Corrigan said home at eleven. Ashby had her on Stuyvesant Street at eleven. One of those can stand."), agreements ("which was what Coffin had"), the link to the scene ("Stuyvesant Street was where Prentiss kept Duchess"), the way in ("Three people heard where the key was") | "that cleared X", "that left N", "only X is left", any sentence that names who did it or how many remain |
| **fact** | Hard-boiled | restates the fact in the voice, and the collision when both lines are on this page | any link to an earlier page |

The turn (the recap at the first lie caught) follows the same level. "Go over what I have" lists what's held and what's open, and at link level says which claims have nothing under them, never who's left.

## 3. The report asks what broke the story

The report form gains one question after "who": **"What breaks their story?"** The player picks from the lines they hold that mention that person or the crime hour (a watcher's list, another person's account, a side remark), plus "A hunch." For a lost thing, "where it is now" likewise asks which line put it there (the handover remark), or "A hunch."

Scoring:

- who right + the true breaking line = **solved**;
- who right + a hunch or a wrong line = **right, but you couldn't have known**: half credit on who, said plainly on the verdict page;
- who wrong = as now.

The curtain shows the true breaking line next to the player's. The play CLI's `report` and `file` carry the new question. The save records it, so a measure can tell deduced from guessed.

The teach-once page gains its fifth line: "A name's no good to me without the line that breaks it."

## 4. Measures

In `scripts/board-measure.ts`:

- **oracle:** solved, at par, with the breaking line (must be 100%);
- **wanderer:** files who right (as now), and **files solved** (with the line). The second is the number that matters; target under 10% from Poached up;
- **refusal shortcut:** unchanged;
- **a new "reader" player:** follows every star and otherwise picks the first choice. Its solved rate must fall by tier: near the oracle at Raw, under 50% at Poached, under 20% at Medium, near the wanderer at Hard-boiled. This is the check that stars no longer solve the game.

In `scripts/board-prose.ts`: no thought above walk level contains "that left", "only … left", "cleared", or names the culprit before the report page. Add it as a lint.

## 5. Open rules, decided here

- **Small cases cracking on the first put:** unchanged. The put is now the player's work, and the report asks for it.
- **Raw and Coddled, where any caught lie names the culprit:** unchanged. They're the teaching tiers, and the report's new question is the lesson.

## Done means

- The measures above hold, on 50 seeds per tier.
- Read one night per tier with `npm run read` and confirm no thought oversteps its level; play a Poached night and a Medium night by hand through the CLI, filing once with the line and once on a hunch, and check both verdict pages.
- The browser at desktop and 375 px: the report's new question, the verdict's two forms, the curtain.
- A "Built" section in this doc.

## Built

*2026-10-11, branch `player-deduces`. The puzzle didn't move: 600 boards (seeds 1–40 at every tier and case type the board builds, the case and its analysis, JSON-hashed) hash the same before and after, `4e325c9a…`. The pages changed; the generator wasn't touched.*

### 1. Stars point, never answer (`stars.ts`, `choices.ts`, `pages.ts`)

- **Thinning, as the table says.** Raw: every open step of every cheapest way. Coddled: the open steps of one cheapest way. Poached and Soft-boiled: at most one, the nearest open step (one in this room first, then the commonest across the cheapest ways, then path order). Medium: only the walk to the nearest open step, and no star at all while that step is in the room you're in. Hard-boiled: the walk to the scene on page one, none after.
- **"Put it to …"** is starred only at Raw and Coddled. From Poached up the grid shows the collision and the put is the player's idea.
- **Reasons name the pointer.** They always did ("Shapiro has Doyle at the Thalia at seven — ask Doyle where she was"); a test now holds them to it (no "clear", "left", "lie", "breaks", "will show"). At Medium the reason ends on the walk, never the question: "Thorndike was at Hauck’s at eight — go to the chop house".
- **What follows the stars.** The hand-off is the first star said aloud, so at Medium it says only where to go (eight new `handoff` cards, kind `go`: "The next place worth the walk was the chop house."). The turn's what-next follows the stars too: "I could put it to X now" only at Raw and Coddled; from Poached up "Before I did anything about it, I wanted to find out what Margolis had to say for herself"; at Medium "…to get over to Sokol’s back room"; at Hard-boiled nothing. A starred walk no longer repeats the place's note in its reason.

### 2. Thoughts stop at the link (`model.ts` `thoughtLevel`, `thought.ts`, `pages.ts`, `lint.ts`)

- **walk (Raw):** as before, the elimination walked to "That left one person who…".
- **link (Coddled to Medium):** collisions, agreements, placements with whose word is under them, the link to the scene's street, the way in. No "who's left", no elimination, and the page that settles who reads like any other page: the agreement, way-in and placement sentences that used to be held back on that page (the elimination covered them) now say themselves. The window stops at the link: "The office had given me nine or ten. At nine Fritz was here." without "So it went at ten".
- **fact (Hard-boiled):** the page's own fact said again at the hours the office gave ("The hours that mattered were eight and nine. Thorndike had Ruggiero and Grasso at eight, and Dettweiler at nine, in this room."), and a collision only when both its lines are on the page. The papers, the motive page and a list's second-story note drop their ties to earlier pages. I read "an earlier page" as an evidence page: the office's hours are the night's frame and are still said.
- **The turn and "Go over what I have"** follow the level. Link: the hour stops at the link, and when the office gave two hours every clause is about both ("Pickering was at the Delmonico rooms at nine and the chop house at ten, with Mrs. Whitfield’s word and Ellery’s word under them"; "Nobody had told me where Rafferty was at nine or ten"). Fact: only what's held and what's open ("I had an evening from Tramonti, and lists from Thorndike and Mrs. Salerno. I didn’t have Havemeyer’s, Winslow’s, Ruggiero’s or Dettweiler’s evenings yet."). The notebook's "Where it stands" uses the same clauses.
- **The lint** (`levelIssues`, rule `level`, run inside `lintBoardRun`, so `board-measure`'s lint column and the tests carry it, and counted on its own in `board-prose.ts`): above Raw, no thought, turn or recap before the report says "that left", "only … left", "cleared", how many remain, or the culprit's name beside a verdict ("did it", "took it", "must have", "the one who"…); at Hard-boiled no thought cites a line from another page. On main's engine it finds 60, 60, 60, 48 and 537 a tier (30 nights each, Coddled to Hard-boiled, the oracle's, the wanderer's and the reader's); on this branch, 0.
- **"Names the culprit before the report page"** is read as naming them as the one who did it. A collision has to name the liar ("Corrigan said home at eleven…"), and §2 allows it.

### 3. The report asks what broke the story (`report.ts`, `play-lib.ts`, `board-book.ts`, `ui/report.ts`)

- **The question.** After who: "What breaks their story?", the lines held that name them or fall at the office's hours (never their own, in the order they came), and "A hunch". The book lists them as lines to tick, rebuilt when the name changes; the CLI's `report <Name>` lists them and `file "…; breaks=3; …"` counts down that list (`breaks=hunch` for a hunch). For a lost thing, after where: "What puts it there?", every remark and find held, the crack if it was heard, and a hunch.
- **Scoring.** A line is right when it breaks one of the culprit's lies on what the player held: a line the collision rests on, a line that lands when put, or the list that breaks a second story. The right name on the right line, and the rest right: **solved**. The right name on a hunch or the wrong line: half a point on who, outcome `lucky`, said plainly under the score ("Right, but you couldn’t have known: half credit on who."), with six ending cards of its own. The wrong name: as before. A lost thing's where on a hunch is half a point on where. Points can be halves ("3½ out of 4"); the profile clears a tier only on a full score, as before.
- **The verdict** shows the line under the name, indented, with the true line when it's wrong. **The curtain** opens with "What broke the story": their claim, the true line and the one filed (and for a lost thing "What put it there").
- **The save** records `breaks` and `whereBy` in the filed report (the CLI's `file` event, the book's `filed`).
- **The teach page's fifth line,** and the CLI's help and the rules say what the report asks.

### 4. Measures (`scripts/board-measure.ts`, `oracle.ts`)

**Before** is main's stars and thoughts (`48f2e52`'s `stars.ts`, `choices.ts`, `thought.ts`, `pages.ts`, `thread.ts`, `connective.json`) measured with this branch's report and players. 50 seeds per tier and case type:

| tier | oracle solved, with the line | wanderer files who right | wanderer files solved | wanderer, citing its collision | refusal shortcut under par | reader files solved | reader naming a liar |
|---|---|---|---|---|---|---|---|
| Raw | 100% → 100% | 55% → 55% | 6% → 6% | 22% → 22% | 19 → 19 | 100% → **100%** | 100% → 100% |
| Coddled | 100% → 100% | 49% → 49% | 8% → 8% | 18% → 18% | 19 → 19 | 100% → **100%** | 100% → 100% |
| Poached | 100% → 100% | 55% → 53% | 2% → **1%** | 21% → 19% | 0 → 0 | 100% → **0%** | 100% → 35% |
| Soft-boiled | 100% → 100% | 47% → 44% | 7% → **4%** | 23% → 18% | 0 → 0 | 100% → **0%** | 100% → 58% |
| Medium | 100% → 100% | 32% → 32% | 0% → **1%** | 4% → 7% | 3 → 3 | 87% → **0%** | 87% → 78% |
| Hard-boiled | 100% → 100% | 19% → 18% | 0% → **0%** | 7% → 7% | 0 → 0 | 33% → **0%** | 33% → 20% |

- **The oracle** files the true report with the line its path holds: solved, at par, on all 750 nights.
- **The wanderer** plays as before and files whoever it caught lying; its line is a random one of the lines the form offers for that name. "Citing its collision" is the same wanderer filing the line the grid showed against them, for the record: it's what a careless player would do.
- **The refusal shortcut** is unchanged (19 Raw and 19 Coddled murders by one call, 3 Medium murders).
- **The reader** follows every star (a starred put through its picker: the ready-made pair, or the first line) and otherwise takes the first thing a page offers that it hasn't done: the first person's first topic, then the searches, then the first place. It files the name the book handed it: the one a thought walked it to ("That left one person who…", "That left Feeney"), or the one a star or the turn sent it to put it to, on the line the book set against them. Handed no name, it takes the form's first choices. Before, the book handed it the name through Medium; now only at Raw (the walk) and Coddled (the put star and "I could put it to X now", the teaching tier, §5).
- **The reader naming a liar** is the same reader, but handed no name it names a liar the book caught, at random: "the liar did it", which the rules say isn't so from Poached up. It fails the spec's targets at Soft-boiled and Medium, and the stars aren't why. With no stars at all (the reader taking only first choices) the same filing solves about 82% at Poached, 100% at Soft-boiled and 49% at Medium (a scratch run, 50 seeds per type): the culprit's lie is the first one met in the first rooms, and the innocent liar's often never is. At Medium, following the walk stars and asking everybody in each starred room catches only the culprit's lie on about half the nights. That's the generator's (the innocent liar is cleared by a list before anybody needs their own evening), and it's open below.

### Read in full (`npm run read`, one night a tier)

Raw murder seed 6, Coddled lost item 11, Poached lost pet 12, Soft-boiled murder 13, Medium lost pet 14, Hard-boiled murder 15, plus the golden's night (Medium lost pet 1) and Medium murder 3. No thought oversteps its level; the level lint agrees. Fixed while reading:

- **The murder's papers put the culprit's page on top** ("Obermann’s page was on top", and in the notebook "The one on top: Obermann"), at every tier: the book naming who, apart from any star or thought. Above Raw the papers now hold "a page on each of them, a reason on every page" (three new `find-papers` cards; the old five are tagged for Raw), the notebook says the same, and the thought names only the dead man ("Everybody in Grasso’s box had a reason…").
- **The report page said whether you were done** ("Every line had an answer under it"). Above Raw it draws six new neutral `report-why` cards.
- **The report's lines and the grid gave the hour away**: the form offered "the lines I hold at ten" once a sighting had narrowed nine-or-ten to ten, and the grid marked ten. Both now use the office's hours above Raw.
- A list's restatement named a person once per hour ("Rafferty… and at eleven Rafferty and Lou") and repeated its frame across a night; it now names each person once ("Lanza had Rafferty and Lou at both, and Brauer at ten, in this room") with four frames that turn over. The way in now comes before a list's agreements, so the agreement can say "her"; the window link comes after them. The thread no longer repeats a side remark's own words ("going fast, no hat"). The account restatement's last sentence has seven lines to draw from, not three.

### Played by hand (`npm run play`)

- **Poached, seed 21** (murder, chloral): the scene, the papers, then Kowalski's (my choice, not the star) for the way in, the Thalia's list (Sweeney placed at ten), Doyle's evening (the turn: her ten against Shapiro's list), Margolis's (her ten against Mrs. Kowalski's), the put to Margolis (owned up, named Reinhardt), Reinhardt's evening. No star after it, and nothing said who was left. Filed `who=Doyle; breaks=5` (Shapiro's ten): **4 out of 4**, 12 calls at par 12. The same night on a hunch: **3½ out of 4**, "Right, but you couldn’t have known: half credit on who.", and behind the curtain "What broke it: Shapiro: at the Thalia at ten o’clock, Sweeney and Grasso, and nobody else. / You filed: a hunch. ✗".
- **Medium, seed 22** (a dachshund, the window that won't latch): walk stars to the flat and the Blue Lantern, none inside; Brauer's list, Bernstein's evening, Dandridge's (his side remark breaks Bernstein's "home at ten"), the walk star to the Eagle club office (Rafferty placed at ten), Mrs. Thorndike (Fritz at hers at nine, so it went at ten; the thought stops at "At nine Fritz was here."). Filed with Dandridge's remark and Brauer's handover: **4 out of 4** in 10 calls. On a hunch for both lines: **3 out of 4**, half on who and half on where, both said plainly.

### The browser

Vite on this branch, at desktop (the 800 px pane) and at 375 px: the teach page's fifth line; the report form (the lines before a name, rebuilt for "Ida Bernstein" with "nine or ten"); the verdict solved (Poached seed 21) and lucky (Medium seed 22, both half rows); the curtain's "What broke the story" with the line filed; a Medium page with only a walk starred. At 375 px nothing scrolls sideways and the lines wrap.

### Tests

249 (was 243), all passing, in 22 s at three workers; `tsc` clean; `npm run build` works. New or rewritten: the oracle solved with its line, and lucky on a hunch; stars thin by tier along the oracle's and the reader's routes; star reasons never name an outcome; only Raw walks the elimination; the settling page and the report page say nothing of being done; Hard-boiled thoughts tie to nothing earlier; the level lint catches four kinds of overstep and lets them pass at Raw; the papers put nobody on top; the wanderer files solved under 10% from Poached up; the reader falls by tier; the CLI files with a line and on a hunch, records the line in the save and shows it behind the curtain.

### Seen while reading, and left alone

- A holy picture hangs in the hall twice in one arrival when the arrival card and the prop card both have one (Mrs. Kowalski's, Mrs. Nagy's).
- An admission's close and the check's hand-off say nearly the same sentence ("An owned-up story is only as good as whoever’s in it with you." / "A story like that is only as good as whoever’s in it with you.").
- "It was half an hour from the Tramonti flat to the Blue Lantern, uptown and west from the Tramonti flat."
- The curtain's true board wraps at narrow widths.

### What's open

- **"The liar did it" still works** from Poached to Medium for a player who names the one liar they've met: 35–78% with the stars, more without them (above). The fix is the generator's: put the innocent liar's lie where a player meets it as early as the culprit's, or make the innocent liar's own evening needed. The spec's reader target holds; that one would not. *(Taken up 2026-10-11 as docs/41 rule 9, "two broken stories at one hour", branch `two-liars`.)*
- **The wanderer citing its collision** solves 7–19% from Poached to Medium: the line question can't stop a player who files a caught liar on the line the grid showed; only the coin flip between two liars does. Under 10% holds for the wanderer as the spec has it (a line picked, not read off the grid).
- **Coddled is still handed the name** (the put star and the turn's "put it to X now", with one liar); §5 keeps it so.
- **Medium's walk star appears when the room's work is done**, so its appearing says the room has nothing more on the cheapest way. Starring the next room all the time would send a star-follower out of every room before it asked anything.
- No blind playtests, as instructed. The CLI plays the new report through (`report <Name>`, `breaks=`, `whereBy=`).
