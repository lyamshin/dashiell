# Round 3: what four blind playtesters found, fixed

*2026-10-11, branch `round3-fixes`, after #70 (docs/41 rule 9, two broken stories at one hour). Four blind testers each played one night through `npm run play` and sent about thirty line edits apiece: Raw 11 (a gold watch), Poached 5 (a murder, laudanum), Medium 14 (a dachshund) and Hard-boiled 8 (a murder, chloral). All four solved who; Hard-boiled 8 guessed the why wrong, and Poached 5 got it right only by reading the why list's order. None found the game opaque about the puzzle. All four found it opaque about its own bookkeeping: costs in minutes, a score that didn't match the ticks, a footer on every page, an eighteen-line breaks list.*

*The puzzle didn't move. 600 boards (seeds 1–40 at every tier and case type, the board, the lies, the lists, the accounts' places and company, the finds, the confrontations, par and the path) hash the same before and after: `0ff15286…`. The whole case JSON doesn't (`c7f8e385…` → `4413b626…`), because its words changed: the office's lines, the reasons people give, the holders' names, a motive, a few spellings. Every one of those was changed in place, so every draw picks what it picked before. No regeneration rule was needed.*

## A. The interface

| | item | status | what changed |
|---|---|---|---|
| 1 | Costs in calls | done | Every label says "1 call" or "free" (`text.ts` `costLabel`); "(rounded)" and minutes are gone from the book and the CLI. The picker says "Looking is free; reading one to her costs a call." The clock strip is as it was. The walk no longer counts minutes: it says how far ("a few blocks uptown and west", "round the corner", "a long walk"), from a new `walk-way` family of 22 frames (`content/board/walk.json`); the 20 `walk-frame` cards that said "twenty-five minutes on foot" are gone. The walk between the scene and the means still says it can be walked there and back inside the hour. |
| 2 | The verdict line | done | `Verdict.scoreLine`: "4 out of 4: who (and the line that breaks the story), when, how and why." A line asked under an answer prints indented under it in the CLI, as it already did in the book. |
| 3 | The footer once | done | The CLI prints the key to the marks on page 1 only, in the testers' words ("A star means it’s worth doing next, and says why. A tick means done, and free to read again."). The book never had a per-page footer. |
| 4 | The breaks list | done (marked, not cut) | `breakOptionsShown`: the lines that touch the named person's own story at the hours that mattered (say where they were then, or who was at the place they claimed then) come first, under "Lines that touch Shapiro’s own story at nine:", the rest after. The book draws them the same way, with a rule in the accent. Nothing is dropped: cutting the list would make the wanderer's random pick a better-than-chance guess. The garbled footer is now "For breaks, give the number from that person’s list… leave breaks out and it goes in as a hunch." |
| 5 | The grid | done | A row for the dead man ("Carbone †") or the lost pet, filled from held lines. The "?" hours narrow when that row puts him somewhere other than the scene (this reverses docs/46 §2's choice for the grid; the thought still stops at the link). ✓ needs a held line from somebody else for that place and hour, so a person alone at home is no longer ✓. "means" is worked out for everybody on the grid, lodgers and company included. `pencil` takes "ten" or "10" (and "o’clock"), says what it pencilled, and the mark shows beside what the cell already holds (`"Kowalski"✗→cards ~cards`). The CLI's place key lists only places the night has named. |
| 6 | "Put it to" | done | "free to look" in the CLI and the book; "Which of her claims?", "Put nothing to her", "Her line, and the line that breaks it". |

## B. The puzzle and its facts

| | item | status | what changed |
|---|---|---|---|
| 7 | Motive | done | The papers (`motives.ts`) say every suspect's grievance by name, a line each, in an order of the night's own, with nobody on top, at every tier ("Reinhardt: a court transcript, his own testimony against her brother."). The report's why list says each reason without the suspect's pronoun ("He testified against their brother") and in a seeded order that is never the who list's. The search reads "His papers — who had what against him" (on its star when starred). The client's letter card says "It was on top, and I didn’t look any further." "The report wanted a why" is gone from the engine and the cards. The papers name people without introducing them: nobody joins the notebook, the grid or the walks from a page in a box. |
| 8 | Nobody before the prose | done | The recap, the turn and "Where it stands" speak only of people the night has named, and say the ones nobody has placed in one clause ("Hanrahan, Winslow and Reinhardt hadn’t told me where they were at nine, and nobody else had either."). The grid's key lists known places only. A company witness who becomes talkable mid-visit is placed on the page that names them, before the hand-off: "It turned out Ashby had come back in and was three rows back with her hat over her eyes." The office's aside introduces each suspect with a trade ("Pickering, a milliner, and I haven’t spoken…"). |
| 9 | Facts that agree | done, with leftovers | The spare key is where the office said, in its words, all night (`SPARE_KEY`: a nail or a sugar tin), and nothing says it came back. The clock clue fits the room (the woman across the landing heard him "laugh with somebody and then go quiet"; there's no glass broken); the police say "his heart" when he's found in his chair; the arrival names the means only if the office did. A watcher's face is "somebody in a camel coat, back to the room, I couldn’t swear who", not "I didn’t know" of a man named an hour before; in the detective's mouth a companion is "somebody nobody could put a name to". Reasons that brought in people the lists don't have ("met my sister", "a sick friend", "a lodger", "a standing date") or contradicted the same evening ("hadn’t eaten" after supper) are rewritten in place; an evening eats supper once; "the party" is the occasion it was ("the meeting"). The soup on the slate no longer gets eaten (cards). A lost pet is "he" or "she" everywhere (`pronOf`, the form's labels, the office's window line, the arrival). American spellings in the cards and the engine's strings. The client "had beaten me there" and waits on the landing. Leaving and coming back are said only by pages that do it. The motive page's reaction comes before the answer. Leftover: "grey" (it's in the Hard-boiled faces, which are list entries and so in the puzzle hash). |
| 10 | Stars that matter | done | `movedAt`: somebody another line has at one place the hour before an hour that mattered and at another then was out on the street at that hour. Their star says so ("Pickering walked from the Delmonico rooms to the chop house at ten — ask what she passed"), and at Medium the hand-off and the turn carry it onto the next page ("Pickering had walked from the Delmonico rooms to the chop house at ten. I wanted to know what she’d passed on the way."). A refusal now points: "A refusal isn’t a confession. But if she wasn’t home at ten, somebody saw her where she was, and if nobody had, that would say something too." The words are the same for the guilty and the innocent. |
| 11 | Raw's elimination | done | The page whose fact settles who reads like any other page. The elimination is walked once (`eliminationOf`): by the turn, when the turn falls there or later ("Here’s what I had. At ten Steinbach was here, and Alfano said so…"), else on the next page's thought, else on the report page. The turn no longer recaps what the elimination says. |

## C. Prose

### 12. The testers' line edits

120 edits (Raw 11: 28, Poached 5: 32, Medium 14: 30, Hard-boiled 8: 30), each quote traced with `npm run trace` against the tester's own save. About 80 traced to cards: one helper agent applied those to a brief (268 cards changed, ids, families and tags untouched), and I reviewed every family it touched and fixed what read wrong in place. The rest traced to the engine, and I fixed the templates.

- **Applied or adapted: 117.** Where the tester's rewrite was in voice it went in nearly as written ("Thin, and bent at the shoulders from years over a sewing machine, he wore clothes too good to have been bought. He’d made every stitch."; "That was a hole in Ruggiero’s story, all right. I wasn’t sure yet it was the one I was looking for."); where it was seed-specific the fix was made general (Raw 11's "Pardo who buys things" eight times became a rule for every holder; Hard-boiled 8's "Carbone’s place" four times became the walk that never names where it left).
- **Adapted against the tester's letter: 1.** Raw 11 #3 asked to cut "That left one person…". The brief keeps Raw's walk (docs/46), so it moved to the turn instead and is said once (B11).
- **Skipped: 2.** Poached 5 #17 (an arrival joins two of one person's lines, one about another hour; both are the real pointers to questions in that room). Hard-boiled 8 #15 (the turn's chapter heading and its recap are the design; at Hard-boiled the recap says only what's held and open).

Of the 161 quoted fragments, 10 are still on the testers' nights (their saves replayed, and `npm run read` of the same seeds), and none of them is the problem any more: "4 out of 4" now goes on to say what it scored; "I’d paid the landlady" now agrees with the retainer; "on the top floor" now has a woman across the landing; "in the chair by the table" now has the police saying his heart; "That left one person…" is in the turn; the Medium page note "(Eight o’clock, and Hauck was at the door…)" stays and the report form no longer says it again; "I went to the Odessa, a café…" and the Hard-boiled turn heading are in what's left.

### 13. Patterns

- **Place names bolted on:** no prop card names its place (47 cards); the walk names where it's going and never where it left; a list's thought says nothing of "this room" ("Mrs. Sirkin had Thorndike at both, Abramowitz at nine and Winslow at ten."); a collision's list is "here" in its own room; the means' house is "here" when you're in it.
- **Board-reading phrases:** "with the list under both" is "and Ellery would swear to it" (or "by her count" on the keeper's own page, "on his word" on the speaker's); "X had himself at…" is "X says he was at…"; "X’s flat at ten" is "home"; "The office had given me" is "Hauck had said"; "while the laudanum was there" is "earlier, when the laudanum was there for the taking"; "with Alfano’s word under it" is "Alfano said so"; agreements say a place once ("Kowalski’s at eight and nine, with…"); the hours that mattered are said once ("For ten, the hour that mattered, he said Moe’s.").
- **Quest-log signposts:** the "So, X." / "X it was." / "Which brought me to" / "X was the one I’d come for" cards are gone (19). A page right after the arrival in its room, or after a hand-off that named who it's about, carries that reason (`Page.board.carried`) instead of saying it again; the one line the testers kept ("I hadn’t come for the furniture. I’d come for Alfano.") comes back at most once a night. Medium's "The next place worth the walk was…" became the star's own reason; the account hand-offs that only said "X was next" now say why.
- **Account openers:** the hour openers turn by speaker as well as by night, with a fifth ("Around nine"); being alone is said once an account ("Nobody was with me at nine or ten."), not tacked onto every hour.
- **Running gags:** a prop, trait or street is paid off at most twice a night (`GAG_MAX`), and the chair, seltzer, spittoon and radio pay lines are three jokes each, not one joke three ways.
- **The machine card:** rewritten (above).
- **The lost thing comes home:** when the report found it, the ending says so ("By nine Fritz was back in his basket by the stove, smelling of the chop house and not a bit sorry."). The story says where it went in the right order ("Fritz ended up with Benny, a pawnbroker’s runner who sits there late, at the chop house."), and the story's poison went into "his cocoa" when the table had cocoa on it.

### 14. The lints

`src/game/board/prose-lint.ts` (`proseIssues`), counted in `scripts/board-prose.ts` over the oracle's, the wanderer's and the reader's nights, and held to zero by `test/round3.test.ts` on six seeds a tier: place names bolted on, banned phrases (the board read aloud, signposts, game talk, British spelling), pages with two or more signposts, gags paid off three or more times, and a pet called "it" on a page or on the form.

## Measures

### The puzzle: `npx tsx scripts/board-measure.ts --seeds 50`

Before is main at `d270f86`; after is this branch. 50 seeds per tier and case type, summed by tier. Every column is the same before and after, to the night:

| tier | nights | oracle solved, with the line | wanderer files who right | wanderer files solved | wanderer solved, citing its collision | refusal shortcut under par | reader files solved | reader naming the first liar it caught | reader naming anybody with access | reader naming a liar at random | reader naming the last liar it caught | innocent liar’s story breaks first |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Raw | 150 | 100% | 55% | 6% | 22% | 19 | 100% | 100% | 100% | 100% | 100% | — |
| Coddled | 150 | 100% | 49% | 8% | 18% | 19 | 100% | 100% | 100% | 100% | 100% | — |
| Poached | 150 | 100% | 44% | 3% | 15% | 0 | 0% | 29% | 24% | 37% | 39% | 57% (0%) |
| Soft-boiled | 100 | 100% | 37% | 5% | 16% | 0 | 0% | 36% | 37% | 46% | 64% | 68% (0%) |
| Medium | 100 | 100% | 26% | 0% | 1% | 1 | 0% | 22% | 23% | 45% | 60% | 74% (0%) |
| Hard-boiled | 100 | 100% | 16% | 1% | 5% | 0 | 0% | 0% | 0% | 0% | 0% | 63% (22%) |

The per-type rows are the same too (par, the confession route, lint and plain terms at 0, choices a page 7–8 / 9–10), except board-measure's callback pages: 62–74% before, 62–71% after (Poached murder 71% → 67%, lost item 74% → 69%, lost pet 73% → 69%; Soft-boiled 68/71% → 67/69%; Medium 70/72% → 68/70%; Hard-boiled lost pet 72% → 71%), because a gag now lands at most twice a night.

An early version had the papers introduce every suspect to the notebook, which put their places in the walks and moved the murders' wanderer by a point or two either way; the papers now name people without introducing them, and the wanderer is back to the night.

### The prose: `npx tsx scripts/board-prose.ts`

30 nights a tier, mixed types, along the oracle's route; the lints over the oracle's, the wanderer's and the reader's nights. Before → after:

| tier | words a page, median [p10–p90] | why-here or walk | thought names an earlier fact | callbacks | lint, correspondence, level, plain terms | cards twice, sentences twice | names 3+ a page, clues 3+ a night |
|---|---|---|---|---|---|---|---|
| Raw | 183 [55–299] → 180 [95–295] | 100% → 100% | 100% → 100% | 70% → 70% | 0, 0, 0, 0 → 0, 0, 0, 0 | 0, 0 → 0, 0 | 0, 0 → 0, 0 |
| Coddled | 179 [59–298] → 180 [59–301] | 100% → 100% | 100% → 100% | 71% → 71% | 0 → 0 | 0, 0 → 0, 0 | 0, 0 → 0, 0 |
| Poached | 170 [104–292] → 172 [108–287] | 100% → 100% | 100% → 100% | 75% → 73% | 0 → 0 | 0, 0 → 0, 0 | 0, 0 → 0, 0 |
| Soft-boiled | 169 [100–320] → 169 [91–316] | 100% → 100% | 100% → 100% | 71% → 69% | 0 → 0 | 0, 0 → 0, 0 | 0, 0 → 0, 0 |
| Medium | 167 [109–300] → 166 [104–285] | 100% → 100% | 100% → 100% | 71% → 69% | 0 → 0 | 0, 0 → 0, 0 | 0, 0 → 0, 0 |
| Hard-boiled | 162 [114–259] → 160 [112–254] | 100% → 100% | 100% → 100% | 71% → 70% | 0 → 0 | 0, 0 → 0, 0 | 0, 0 → 0, 0 |

"Why-here or walk" now counts a page that carries the reason the page before said (C13); without that, the cut signposts would read as missing whys.

The new lints, counted the same way. "Before" is this branch's `prose-lint.ts` run over main's nights (90 a tier: the oracle's, the wanderer's and the reader's):

| tier | place names bolted on | banned phrases | pages with 2+ signposts | gags paid off 3+ times | a pet called “it” |
|---|---|---|---|---|---|
| Raw | 4 → 0 | 820 → 0 | 0 → 0 | 38 → 0 | 72 → 0 |
| Coddled | 13 → 0 | 738 → 0 | 0 → 0 | 18 → 0 | 64 → 0 |
| Poached | 16 → 0 | 1,057 → 0 | 0 → 0 | 61 → 0 | 70 → 0 |
| Soft-boiled | 19 → 0 | 1,167 → 0 | 1 → 0 | 56 → 0 | 82 → 0 |
| Medium | 13 → 0 | 1,273 → 0 | 0 → 0 | 60 → 0 | 73 → 0 |
| Hard-boiled | 7 → 0 | 772 → 0 | 0 → 0 | 82 → 0 | 69 → 0 |

Banned phrases before are mostly "So, X." and its kin, "with the list under", "had himself at", "The office had given me" and British spellings; the pet count includes the report form's "Who took it", once on every lost-pet night.

## Read and played

- **The four testers' nights**, read in full with `npm run read` (Raw 11 lost item, Poached 5 murder, Medium 14 lost pet, Hard-boiled 8 murder) and replayed from their own saves. Fixed while reading: "my witness" where the name was fine (the name rule now counts only the names a new sentence says, and not the lists'); two pointers from one list naming the list's house twice; "he’d come to see who heard it" on a murder's list; three watcher cards that called a booth's cashier "the girl"; a staging card and a reaction card dealt twice in one Hard-boiled night (five new cards); "the Delmonico rooms" that "was"; the story's "Thorndike’s flat" for Thorndike's own home.
- **Played by hand,** Poached seed 21 (a murder), through `npm run play`: the costs ("1 call", "free to look"), the papers' page and its note, a put that owned up and the witness placed in the corner, `pencil "Broadnax nine at card room"` (the mark beside the collision), `report Shapiro` (one line under "Lines that touch Shapiro’s own story at nine", seven after it), and the verdict ("4 out of 4: who (and the line that breaks the story), when, how and why.", 12 calls at par 12). The curtain says "Never put to her; put, it would have been: refused." for the lie nobody put.
- **The book,** served from this branch and opened at desktop width on Poached seed 21: every button says "1 call" or "free"; "Put it to Broadnax" says "free to look", the picker "Looking is free; reading one to her costs a call", each line "1 call"; the report groups "Lines that touch Broadnax’s own story at nine:" above "Other lines I hold:" with a rule in the accent; the why list is pronoun-free and shuffled; the grid has "Wehrle †" on top. It builds (`npm run build`). Not checked at 375 px this round.

## What's left

- **"grey"** in the Hard-boiled faces ("in a grey fedora"): the look is in the watchers' list entries, so changing it changes the puzzle hash. One spelling, left for a round that regenerates anyway.
- **The breaks list is marked, not cut.** Cutting it to the touching lines would hand the wanderer a better-than-chance line; the measure says so. The designer may want it cut anyway.
- **The grid narrows the window from the victim's row,** which docs/46 §2 chose not to do. The testers wanted it; the designer should confirm.
- **The turn at Medium** still says "Before I did anything about it, I wanted to get over to Thorndike’s flat" when the next star has no reason that matters.
- **An arrival after a walk** still begins "I went to the Odessa, a café…" when the walk has just said I was there (Hard-boiled 8 #18): about half the `arrive` cards open that way.
- **The face variant** puts every suspect's look in front of their doing card on first sight, which reads as a parade when three come to their doors (the helper thinned the door cards).
- **A doing card can contradict the evening** ("finishing a late supper" at seven in the morning, after supper at eight in the account). The soup is fixed card by card; a general rule would tag such cards against the night's reasons.
- **Callbacks fell 1–5 points** (67–71% by board-measure's count) because a gag now lands at most twice.
- **Name thinning** can still make a collision's breaker "He" after a sentence about somebody else ("Shapiro said the Bijou at nine. He had Colquitt and Kreuzer here at nine o’clock").
- **No blind playtest,** as instructed.
