# Clarity, build 5

*2026-10-25, branch `clarity-5`, off main at `444cbc1` (round7-fixes, #106, with hints, #105), with main's one-liar build (#107, `5f849a1`) merged in before the gates. Round 7's blind testers (four new nights on clarity-4: Raw 23, the Persian cat; Poached 17, a murder; Medium 21, a murder; Hard-boiled 19, a pair night; `scratchpad/round7-digest.md`, reports `scratchpad/r7-*.md`, saves `scratchpad/playtest7-*.json`) solved all four by deduction, and liked the scenes and the one-line jokes. What failed again was the joining text and some chrome: answers that read like timetables, walks that named the place the arrival named, people a confession named left bare in the room, lines that ran ahead of what was known, thoughts that stacked their logic, staging against itself, long star reasons said seven times, the office's three double meanings, and the report's numbered lists. This build fixes the scope's twelve prose items (`scratchpad/clarity5-scope.md`: the digest's P1–P9, the seed's, docs/66's and docs/67's open items), the coordinator's three leftovers from docs/68 §6, and U1–U4, each by rule in the layer that makes the line, never for one night, as docs/60, 62 and 66 did. Each rule has a lint (`hinge-lint.ts`, thirteen new rules beside the 42) and a test (`test/hinge.test.ts`: the line main said, and the line this build says), and the four nights hold to it along the testers' own routes (`test/clarity5.test.ts`). Nothing in `src/gen/`, the invariants or the scoring changed; the report's lists changed only in how they're numbered and labelled. Lean only, like docs/60 to 66.*

## 1. What was built, and where

### 1.1 The new hinge rules (`hinge-lint.ts`)

Each is a kind of line round 7 stopped on, read over a whole night as a player reads it, target 0, in `hingeIssues` (so `proseIssues`' `hinge` rule, `board-prose`'s hinge column and its table) and `test/hinge.test.ts`.

| rule | item | catches |
|---|---|---|
| walk-name | P2 | the walk and the arrival's first sentence both naming the place ("Moe’s was a short walk. At Moe’s, a back-room bar…"); "the same door as before"; a word of the place's own name said again in the arrival's sentence ("by the tailor’s passage to Mulcahy’s rooms behind the tailor’s") |
| timetable | P1, seed 6 | in an answer: an hour and a colon ("Nine: nobody in."), the means and a colon ("…kitchen drawer: there at seven."), an hours fragment ("Seven through eight. I went…"), "the start of the evening" or its end twice, one purpose twice ("to write letters"), a gathering said alone ("for the committee meeting, alone"), alone three times without "still", and the hours alone after the company left or before it came said as a row |
| named-bare | P3 | somebody an owning up named, placed bare on that page ("By then Bledsoe was in the corner.") |
| ahead | P4, seed 3 | who couldn't have had the means said by where it was kept ("…while the carving knife was in the kitchen drawer"), which the page may not know yet |
| stacked | P5 | a thought with a colon and then a semicolon, or a semicolon and then "since" or "because" |
| contradicts | P6, seed 5 | "a song nobody was playing" beside a piano; somebody "ten feet away" the visit never put in the room; knees or baseboards after the desk; a chair pulled across in rows of seats; "at the bar all evening" of somebody the way in had in a booth or at a table |
| hint | P7, docs/68 §6 | a shared star reason said again on a later page; a suspect's evening pointed at by an hour that doesn't matter |
| repeats | P8, seed 1 | "earlier in the evening" more than once a night; the means' origin said again on the way in after the find; "my client" twice on a page, or four times counting whose ("my client’s place") |
| office (more) | P9 | "The table at his place was set at eight"; "Whichever it was, that’s when he was poisoned"; "“Ask Mosley, the one who found him”" |
| father | seed 7 | a man's "my late husband’s" |
| turn-hour | seed 9 | the turn saying the settled hour last, after its reason ("…, so it happened at eleven o’clock.") |
| drew | docs/67 | a way in with nothing to say why I came, to somebody an earlier page put there; what drew me said again to their face |
| company | docs/68 §6 | one answer saying company two ways ("Renfro kept me company at eight. Quill was with me at first and left after eight.") |
| lodger | docs/68 §6 | the turn's who-knew clause on a latch-key night leaving out the lodger who knew |

Two of docs/66's changed with them: **papers** allows "the dead man" twice on the page, not three times (a whose, "the dead man’s old friend", isn't counted: it's the role the line needs beside a "him" that's the one on the page), and **newcomer** lets "the woman Dandridge had named" stand beside the name as a gloss (P3's own form); standing in for the name, it's still the naming said again. **restated** lets a way in that has nothing else to say name what drew me (`drew` holds it).

### 1.2 Answers said as people say them (P1, seed 6)

- **No colon after an hour, no hours fragment** (`voicings.json`, 16 LIST-HOUR and CLAIM-SPAN templates): "Nine: nobody in." → "Nobody in at nine."; "{Hours}: nobody in the house but me." → "At {hours} I had the house to myself."; "Seven through eight. I went…" → "Seven through eight, I went…".
- **The means, then where it was** (`tell.ts` `remarkLine`, the REMARK `there` voicings): "The carving knife in my kitchen drawer: there at seven." → "The carving knife was in my kitchen drawer at seven, and I didn’t look again." The thing and its place are two arguments where the case gives "there"; no semicolons in the careful ones.
- **The hours alone, as the stretch's end or start** (`tell.ts` `companyByChange`, flags `rest` and `before`, eight new CLAIM-SPAN voicings, `reread.ts` reading them as the part's own hours, the way "with me at first" is read): "Salerno was with me at first and left after eight. At nine and ten I had nobody with me." → "…and left after eight. From then on it was just me."; "At seven and eight I had nobody with me. Donnelly came by at nine and stayed." → "At first it was just me. Donnelly joined me at nine and stayed." An hour alone between two with company keeps its hours. (The clarity check reads "from then on", "to begin with" and "early on" as the spans they say, `clarity.ts`.)
- **"The start of the evening" once an answer, and its end once** (`compose.ts` `onceMust`, a firm filter in `say.ts` `preview` where a voicing without it fits; thirteen "early on" LIST-HOUR voicings and two careful "joined me at {from} and stayed on" CLAIM-SPAN voicings for it to fall back on): "Salerno was in from the start of the evening, … Quill was in from the start of the evening, like every night" → "…Quill was in early, like every night, and stayed till past eight."
- **One purpose an evening** (`tell.ts`): a stretch whose reason repeats an earlier one's purpose says where it went: "At nine I went to the Eagle club office to write letters" after "back to my room to write letters" → "At nine I went to the Eagle club office, by myself."
- **A gathering isn't alone** (`tell.ts`, `SOCIAL`): a reason with other people in it (a meeting, a game, a call, "for the company"), or the office's own gathering at the scene, takes no alone tag and isn't in the hours alone: "for the committee meeting, alone" → "for the committee meeting"; "Eight, I was at Winslow’s for the meeting, alone." → "Eight, I was at Winslow’s for the meeting." A reason that leaves it is alone again: "At nine I left the meeting when the gin ran out and went to the Blue Lantern alone".
- **Alone a third time is "still"** (`tell.ts`): "on my own … on my own again … on my own" → "… still on my own".

### 1.3 The walk says how far, the arrival says where (P2, seed 2, seed 4)

- **The walk names its place only where the arrival doesn't** (`pages.ts` `writeWalk`, `named`; `walk.json`, sixteen walk cards with no `{dest}`): every arrival and return card names its place, so the walk says the distance: "Moe’s was a short walk. At Moe’s, a back-room bar…" → "It was a short walk. At Moe’s, a back-room bar…"; "Salerno’s flat was a fair stretch on foot. … I went round to Salerno’s flat on Norfolk Street" → "It was a fair stretch on foot. … I went round to Salerno’s flat…". The return to the office says "the office" in its arrival, so its walk doesn't.
- **No "same door as before"**: a return's walk is the distance ("It was a few blocks."), and the return card says "back at the Shamrock".
- **No word of the place's name twice** (`pages.ts` `writeArrive`, an avoid on the page's cards for the name's own nouns; `places.json` `bpl-1068`): "I went in by the tailor’s passage to Mulcahy’s rooms behind the tailor’s" → "I went in by the side passage to Mulcahy’s rooms behind the tailor’s on Allen Street."; "behind a laundry, … from the laundry upstairs" isn't dealt.

### 1.4 Who somebody a confession named is (P3)

`pages.ts` `placeNewcomers`, PRESENT `named` voicings (`{gloss}`): the job where the night has one (`gloss.ts` `glossOf`), else who named them: "By then Bledsoe was in the corner." → "By then Bledsoe, the woman Dandridge had named, was in the corner."; "Winslow was in the corner." → "Winslow, the man Sweeney had named, was at the far table." (`whoTheyAre` gives a confession's company "was with Dandridge at Sokol’s back room; nobody else knows it", the notebook's line, which doesn't fit a sentence; `glossOf` is its job.)

### 1.5 Nothing ahead of what's known (P4, seed 3)

`bones/phrase.ts` `accessPhrase`: who couldn't have had the means is said by the hour the office gave, which is what the player holds when the find says where it came from: "Renfro hadn’t been at Mrs. Nagy’s while the carving knife was in the kitchen drawer." (at Moe's, before anybody had said when the knife was in the drawer) → "Renfro hadn’t been at Mrs. Nagy’s before nine, when the carving knife was there to take."; Poached 5's "Winslow hadn’t been at the Delmonico rooms while the laudanum was in the medicine cupboard." → "…before nine, when the laudanum was there to take." (The means is said with the hour since skim round 1: "Bledsoe hadn’t been at Mrs. Nagy’s before nine." alone left a reader asking what it ruled out.)

### 1.6 One step of logic a sentence (P5)

`bones/compose.ts` (`stacks`, `sideBySide`, `heldBut`, the street's composition): two facts aren't joined when the first has a colon already or the second has its own "since", "because", "so" or "though"; the street is two sentences of its own in lean: "So Broadnax had seen the same: the Blue Lantern at ten; the street was what mattered, since Allen Street was where Mulcahy lived." → "So Broadnax had seen the same: the Blue Lantern at ten. That much checked out. The street rang a bell. Allen Street was where Mulcahy lived."; "So Coffin backed her up: the Coffin flat at eight; but nobody else had said…" → two sentences.

### 1.7 Staging that agrees with itself and the room (P6, seed 5)

- "tapping the time of a song nobody was playing" beside the band's piano: the card (`people.json` `bpe-411`) says what she's doing, "drumming on it with two fingers".
- "She tapped the bar twice" of somebody at a table at the back (`pages.ts` `seatAvoid`): somebody the visit put at a table, in a booth or at the back takes no card with "the bar" in it.
- "Lindemann and Ruggiero were at the bar all evening" of a woman the way in had in a booth: the watcher's line is "were drinking here all evening" (`list/c-all-drink-*`).
- "Pardo, who was sitting ten feet away" on a return the arrival never put him in (`pages.ts` `writeConfront`; `writeArrive`): the return says the one the first visit named in the back booth is still there ("Pardo was still in the back booth.", or "still there" where the room's own line has said the booth), and the crack says "ten feet away" only where this visit has put him in the room.
- "I dusted off my knees" and "along the baseboards, up the walls" after the desk (`pages.ts` `PAPERS_NOT_ROOM`, which the situated deck reads too).
- A chair pulled across in a picture house or a theater (`pages.ts` `theatreAvoid`): their seats are in rows.

### 1.8 A hint's words (P7, docs/68 §6)

`stars.ts` `hintWords`, read by the hint (`hints.ts`) and by every starred choice (`choices.ts` `pageStars`); `starReason`, the curtain's and the fastest solve's, is as it was.

- **A shared reason once**: the first hint that gives it says it; the hints after say only the ask, and its own star says it on the page it was given: "Hint: Ashby, Lindemann and Winslow knew the door would be unlocked, and nobody had said where any of them was at ten — ask Ashby where she was." then "Hint: ask Lindemann where she was." and "Hint: ask Winslow where he was."
- **On the question itself, only the reason** (the choice is the ask): "Where were you tonight? [nobody had said where she was at ten]", not "[… — ask Lindemann where she was]".
- **The hour that matters** (the coordinator's third): anybody's evening, a suspect's or a witness's, pointed at by an hour that doesn't matter, where nothing places them at one that does, is that: "Still missing: Bidwell saw Callahan at Moe’s at seven — ask Callahan where she was." → "Still missing: nobody had said where Callahan was at nine — ask Callahan where she was."; Raw 7's "Hint: Bledsoe says Crowninshield was with her at Mrs. Nagy’s at nine — ask Crowninshield where she was." (ten is the hour) → "Hint: nobody had said where Crowninshield was at ten — ask Crowninshield where she was." One clause, and the docs/46 test holds: no outcome named.

### 1.9 Said once (P8, seed 1)

- **The papers' dead**: the name twice on the page (the papers' own line one of them), the role twice, then what they were (`pages.ts` `writeSearch`): Poached 17's "a brother the dead man had testified against. The dead man had been squeezing Renfro… put out of a lease by the dead man" → "a brother Quill had testified against. The dead man had been squeezing Renfro for years. The dead man knew where Dandridge… had been put out of a lease by the landlord."
- **"Earlier in the evening" once**: the office's question is "Where had he been tonight?" (`pages.ts`) and the answer doesn't say it again (`office/venue-4`); the way in says "Quill had been at Moe’s earlier." (`thread.ts`).
- **The means' origin once on the pages**: the find says it; the way in to the place it came from doesn't say it again (`pages.ts` `writeArrive`): "The carving knife had come from Mrs. Nagy’s." on the way in is gone. (The walk's choice and the notebook keep it: they're chrome.)
- **"My client" once a page** (`plan/refer.ts`): the client's role once, a second time only as whose ("my client’s lodger", where the name in its place would leave the "his" after it to either man), then a pronoun where it's clear, else the name, twice at most (docs/39 §4), and the role again only past that; and after the client's own quotation, "he said" where nobody else of his sex is in the sentence's narration and the narration since had him last, of the men, whoever the quotation names, where the sentence before named no other man (`attrib`): "“Doyle, a switchboard operator, and Lathrop, a night-school teacher,” he said." (Lathrop is talked about, not talking). On the office the client is the one answering, so a name in her own answer doesn't take her pronoun ("…Duchess bit him at Easter…” She put ten dollars on the desk"); and after "my client’s" in a sentence, the pronoun is hers or his: "Everybody at my client’s table at eight had heard that my client would leave the key under the mat for my client’s sister." → "…that he’d leave the key under the mat for his sister." The office takes no situated card that says "my client" itself (`pages.ts` `situOf`). Medium 14's office: "Fritz lived at my client’s place … my client said … The table at my client’s place … my client said" → "Fritz lived at my client’s place … he said … I had people in at eight,” he said".

### 1.10 The office (P9, seed 7)

- "The table at his place was set at eight, for a birthday supper." (eight people, or eight o'clock?) → "At eight there had been people at his place, for a birthday supper." (`office/party-s1`).
- The poisoning's hour (`when.ts` `officeWhen`, `notebookWhen`): "The police surgeon puts it at one or the other, by the warmth of him. Whichever it was, that’s when he was poisoned. Chloral takes twenty minutes to an hour, so he died within the hour." → "That’s as close as the police surgeon can get, by the warmth of him. Chloral works inside the hour, so whichever it was, that’s when he was given it."; the notebook: "He was given the chloral at eight or nine o’clock. …; chloral works inside the hour.", "one or the other" once.
- "“Ask Mosley, the one who found him,” she said." (an errand, or a name?) → "“There’s Mosley, the one who found him,” she said." (`office/pointer-threat-2`).
- The guests as a list after who had them, so the last one's job closes: "Lanza, a typist; … and Lathrop, a bookmaker came round to my client’s place at eight" → "He had people round at eight, to hear the fight on the radio: Lanza, a typist; … and Lathrop, a bookmaker." (`office/party-s2`).
- **A man's watch was his late father's** (`pages.ts` `writeOffice`): "my late husband’s gold watch" from a male client → "my late father’s gold watch", where the deal gives the watch to a man (36 of the lost things in seeds 1–60, both worlds); the generator's name for the thing is unchanged.

### 1.11 Docs/66's and docs/67's open items

- **The turn says the settled hour first** (`pages.ts` `recapClausesMarked`, WINDOW-ALIVE `recap` voicings): "Mulcahy was still alive at the Blue Lantern at nine, and Vogel had said nine or ten, so it happened at ten o’clock." → "It happened at ten o’clock. Vogel had said nine or ten, and at nine Mulcahy was still alive at the Blue Lantern." (Two sentences since skim round 1, where "It happened at eleven o’clock: Kaminsky had said ten or eleven, and Duchess was still at the flats over Lipsky’s at ten." stopped a reader.)
- **A pet's kind once a night, by any word of it** (`plan/texture.ts` `petKind`, and the gloss lint): the office's "my Persian" says what Mimi is, so the Shamrock's thought says "when Mimi went", never "Mimi, the Persian cat," (the tester's "database" line).
- **A way in with nothing else to say says what drew me** (`pages.ts` `writeArrive`, `drew`; the coordinator's ruling): where the way in has no keeper, no find and no other pointer, the account pointer that drew me, in the past, the one at an hour the office gave first, else the latest: Poached 17's Sokol's back room, "…and Dandridge was sitting where he could see the door." → "… Mrs. Nagy had seen him at her place at seven." Never onward: the hints do that. The ask then doesn't say it to their face again ("Mrs. Nagy saw you at Mrs. Nagy’s at seven" is gone from the next page).
- **A place called after its keeper is theirs** (`thread.ts`): "Mrs. Nagy saw you at Mrs. Nagy’s at seven." → "Mrs. Nagy saw you at her place at seven."
- **An agreement the page before asked for stays** (`plan/once-pass.ts`): after "If Winslow told it the same way, it was the Eagle club office and not Kowalski’s.", Winslow's answer had nothing after it (the once pass took the agreement as said, Medium 21's tester asked for it). It stays, and where it would say the answer's words again it says only the agreement: "So he had it the same as Sweeney. That much of it stood up." (Never "So he had it the same as Sweeney: the Eagle club office at ten." straight after "Then at ten I went to the Eagle club office to meet Sweeney.", which the clarity lints' `repeat` stops.)
- **Three people in one sentence** where one has commas of their own, or will have when who they are is said (`pages.ts` `peopleInBrief`): two, and the third a sentence of its own ("Mrs. Corrigan, the landlady, sat …, Hauck, in a green hat, was …, and Lefkowitz, … stood …" was one sentence).
- "Hargrove didn’t see him there then." → "Hargrove never saw him there." (`collision/here-*-unseen-1`).

### 1.12 The coordinator's three (docs/68 §6)

- **Company one way an answer** (`tell.ts` `companyByChange`, `plainly`): where anybody's hours in a stretch must be said plainly (they never left the room), everybody's are, by their hours: "Renfro kept me company at eight. Quill was with me at first and left after eight." → "Renfro and Quill kept me company at eight."
- **The turn names the lodger** (`pages.ts` `recapClausesMarked`, ACCESS-SET `lodger` voicings and reader): "Mosley had been at the meeting and knew that the door was left unlocked, and so did Mulcahy, the lodger it was left unlocked for." On Raw 23 itself the turn has no who-knew clause (Raw's turn never had, docs/60 §1.4), so there's nothing there to disagree; the hint's elimination says "who knew that the door was left unlocked", the lodger included.
- **The hint's hour**: §1.8.

### 1.13 The chrome (U1–U4)

U1–U3 were built in a fork of this branch (`clarity-5-chrome`, merged at `4aae764`):

- **U1, one numbering for the night** (`report.ts` `lineNumbers`, `play-lib.ts`, `text.ts` `notebookText`): every line the form can offer has one number, its place in the notebook's "What I was told", the same on every person's list (Poached 17: Bledsoe was #4 on Dandridge's list and #8 on Callahan's; now #23 on both). `proof=`, `cleared=` and `evidence=` take those numbers; a number from another person's list is refused with whose list to look at. The groups say what's under them: "About Dandridge, or anywhere he said he was tonight, at nine o’clock:" and "About anybody else at nine o’clock, or Dandridge at other hours:" (other people's claims read as theirs). The form's instruction: "Pick who first. Then `report <name>` shows what you were told about them and about nine o’clock, numbered as in the notebook. Give proof as one of those numbers, or proof=hunch." Which lines a list offers, and in what order, is unchanged.
- **U2, labels** (`text.ts`, `grid.ts`, `knowledge.ts`): "free to open" → "free to look; an action if you go ahead"; "1 question · can confront" → "1 question, or confront her"; "→Y where they owned up to being" → "→Y where they admitted they were"; "Dandridge owns up: Sokol’s back room at nine o’clock, with Bledsoe." → "Dandridge admits he was at Sokol’s back room at nine o’clock, with Bledsoe."; the grid's labels are words a player would use ("Quill’s" for the scene, "card room", "Blue Lantern", never "scene", "cards", "Blue"), and its key says only the ones that aren't the place's own name ("In the grid, Sokol’s is Sokol’s back room.", never "Moe’s = Moe’s").
- **U3, the confront box** (`choices.ts` `pickerNote`): "Pick the hour where what he told you doesn’t match, then what you’ll tell him: somebody who saw him somewhere else, or somebody who saw everyone at the place he named, and not him." → "Pick the hour that doesn’t match, then who says otherwise: somebody who saw him somewhere else, or who saw everybody where he said he was, and not him." B7's second sentence stays.
- **U4, the mark line once a night** (`grid.ts` `faceMarkPage`, `faceMarkDue`; `hints.ts` `hintsNote`; the CLI and the book): on the page that brings the night's first sighting of only a coat or a hat, under the page and on the grid while that page is open; never on page one, before anybody has seen a coat, and not under every grid after. Hard-boiled 19: on Bledsoe's list page ("Somebody in a fur collar came in for a bite at nine"), once.

`test/plain-words.test.ts` covers the new chrome (the numbering on every list, the headings and instructions, the labels, the grid's key and labels, the confront box), and "How it adds up" says an admission as the notebook's list does: "Dandridge owned up to Sokol’s back room, with Bledsoe." → "Dandridge admitted he was at Sokol’s back room, with Bledsoe." (`pages.ts`).

### 1.14 What the sweeps and the reading found, fixed by rule

- **An hour and a colon with its lead-in** ("Start with seven: I took a letter round", "First, seven o’clock: Renfro and Salerno", "Then nine:", "From the top:"): twenty-two LIST-HOUR and CLAIM-SPAN voicings aren't dealt in lean where the same draw has one without (`voicings.json` `forbids: ["lean"]`), and the `timetable` rule reads the lead-ins. Dandridge: "Start with seven: I took a letter round to Mrs. Nagy’s, alone." → "Seven, I took a letter round to Mrs. Nagy’s, alone."
- **Who's still in the room, once** (`pages.ts` `writeArrive`): the return's "Lou was still in the back booth." after "Ashby sat at the back with his coat still on." said the back twice: where the room's line has said the spot's noun or its "the back", it's "Lou was still there."
- **What drew me, at the place I'm going** (`thread.ts`): an account's company pointer says the hour they were together here, first: at Grasso's flat, "Mosley had said he was with her at nine." (the gin game), not "Mosley had said he was with Grasso, Donnelly and Lefkowitz at eight." (the Delmonico rooms). And a keeper's place is theirs by the surname: "Mrs. Kowalski had seen him at Kowalski’s at eight." → "…at her place at eight."
- **The drew rule's reach** (`hinge-lint.ts`): only somebody an earlier page put at this place, in a sentence with the place in it; a name the papers gave a motive ("Miss Nowak: the dead man was at war with her friend.") put her nowhere.
- **A night's walks don't run out** (`walk.json`, four more distance-only cards, bwk-084 to 087): with the arrival naming the place, a night of five walks had dealt "It was {far}." twice (board-prose's "cards twice", 14 at Medium and 11 at Hard-boiled in the dealt world); 0 again.
- **The lodger's recap says the gathering, not "there"** (`access-set/recap-party-both-lodger`): "…, the lodger it was left unlocked for. Marchetti hadn’t been there." (the clarity check: "there" with no place before it, twelve composites) → "…Marchetti hadn’t been at the meeting."
- **The holder in the room, where the visit hasn't said so** (`pages.ts`, the crack; HANDOVER `crack`, `here`, `unplaced`; skim round 1): "So Fritz had gone to Tierney, at Steinmetz’s." said at Steinmetz's read as somewhere else → "So Tierney had Fritz, and was somewhere in the room." ("ten feet away" stays for one the visit has put in the room, §1.7.)

### 1.15 Main's one-liar build, merged, and the slips it left (docs/69 §5)

Main moved during the build (one-liar, #107, `5f849a1`): merged into this branch with no conflicts; its `introOf` rule (company named in somebody's own true story isn't "the woman X had named") and this build's P3 gloss (only on the page of an owning up, `placeNewcomers`) say the same thing from two sides. The three it left for the prose build:

- "So Vogel had seen the same: the Bijou at eight and at nine; nobody else had said where Rosenbaum was at ten, when Mulcahy died." (Poached 6) was §1.6's rule already: "…at eight and at nine. That much checked out. Nobody else had said where Rosenbaum was at ten, when Mulcahy died."
- **Who could have had the means, once** (`thought.ts`, the list's consequence where the means was kept): "Crowninshield had been at Rafferty’s earlier, when the carving knife was there for the taking; Abramowitz hadn’t, though. So Rosenbaum and Steinbach had both been at Rafferty’s, where the carving knife was kept, and had both left by ten." left Crowninshield out of the "So": everybody the list has there while it was there for the taking and gone by the hour is in the one sentence, whether or not something else had placed them: "Abramowitz hadn’t been at Rafferty’s before ten, when the carving knife was there to take. So Rosenbaum, Steinbach and Crowninshield had all been at Rafferty’s, where the carving knife was kept, and had all left by ten."
- **A job written for a man, said for her sex** (`gloss.ts` `introOf`, `glossOf`): "Petrosino, the man who takes the slips, was at a table" (Hard-boiled 30) → "Petrosino, the woman who takes the slips, …", as the People list had it.
- **Who they passed, only where they passed somebody** (`stars.ts` `starReason`): Medium 16's fastest solve, "Brauer walked over from Mrs. Nagy’s at ten — ask Brauer who she passed on the way", of somebody who passed nobody → "Ainsworth saw Brauer at the Velvet Room at ten: ask Brauer where she was."

## 2. The measures

30 nights a tier, both worlds, three routes (the oracle's, the wanderer's, the reader's) where the measure walks routes; "main" is `5f849a1` (one-liar merged), read with this build's lints; "this build" is the branch's last commit, in lean.

**The new hinge rules** (§1.1), main's hits to 0 (`scratchpad/c5/hinge.mts`, this build's lint over either tree):

| rule | main | this build |
|---|---|---|
| walk-name | 4,539 | 0 |
| timetable | 482 | 0 |
| named-bare | 58 | 0 |
| ahead | 123 | 0 |
| stacked | 100 | 0 |
| contradicts | 170 | 0 |
| hint | 79 | 0 |
| repeats | 667 | 0 |
| father | 15 | 0 |
| turn-hour | 92 | 0 |
| drew | 39 | 0 |
| company | 62 | 0 |
| lodger | 3 | 0 |
| office (P9's three added) | 276 | 0 |

The 42 rules before them are 0 on both. Every tier, both worlds, every route, is 0 on every rule.

**The pronoun check** (docs/66's, `scratchpad/c5/amb.mts`): 0 on main, 0 on this build, all three routes; board-prose's pronoun columns 0 at every tier in both worlds.

**The pages**, main → this build (board-prose, the oracle's route):

| world | tier | words a page (median) | list smell, pages (oracle) | fact sentences per fact |
|---|---|---|---|---|
| dealt | Raw | 106 → 105 | 31 → 33 of 280 | 1.25 → 1.30 |
| dealt | Coddled | 102 → 100 | 16 → 22 of 276 | 1.23 → 1.25 |
| dealt | Poached | 104 → 100 | 28 → 29 of 385 | 1.17 → 1.21 |
| dealt | Soft-boiled | 106 → 104 | 28 → 33 of 381 | 1.16 → 1.18 |
| dealt | Medium | 100 → 98 | 36 → 38 of 438 | 1.09 → 1.19 |
| dealt | Hard-boiled | 96 → 94 | 19 → 18 of 435 | 1.00 → 1.00 |
| neighbourhood | Raw | 123 → 123 | 23 → 26 of 280 | 1.22 → 1.26 |
| neighbourhood | Coddled | 113 → 112 | 19 → 25 of 276 | 1.23 → 1.26 |
| neighbourhood | Poached | 115 → 114 | 35 → 37 of 391 | 1.12 → 1.19 |
| neighbourhood | Soft-boiled | 117 → 114 | 51 → 40 of 379 | 1.23 → 1.26 |
| neighbourhood | Medium | 111 → 107 | 33 → 37 of 430 | 1.07 → 1.18 |
| neighbourhood | Hard-boiled | 103 → 99 | 25 → 25 of 435 | 1.00 → 1.00 |

Words a page fell at eleven of twelve rows and held at one (the brief's ceiling was +5%): the walks that don't name the place, the answers without their colons, "the dead man" once less, "earlier in the evening" once a night. Fact sentences per fact rose a little, and list smell at ten rows: one step of logic a sentence (P5) is two short sentences where there was one with a semicolon ("…the Blue Lantern at ten. That much checked out. The street rang a bell."). Neither is a gate.

**The turn**, words in its recap (median [most]), main → this build, counted the same way on both (`scratchpad/c5/turns.mts`): dealt Raw 47 [70] → 50 [70], Coddled 47 [72] → 50 [82], Poached 57 [87] → 60 [87], Soft-boiled 72 [98] → 73 [114], Medium 68 [98] → 65 [110], Hard-boiled 48 [52] → 45 [52]; the neighbourhood's within three words of main's median at every tier. By this count main already has turns over the 70 and 90 targets (dealt 9 of 156 turns, the neighbourhood 11 of 156), and this build has a few more (11 and 13): the settled hour said first ("It happened at ten o’clock."), the lodger in the who-knew clause, and the means beside "before nine". The turn's own budget (`turnOrder`) is main's.

The rest held:

- **board-prose**, both worlds: every lint 0 at every tier (names said three times, clues three times, place names bolted on, banned phrases, signposts, gags, a pet called "it", the grid, posture, knocking, engine words, repeats, hour slots, continuity, tics, assembly, the hinge lines); reader lint, correspondence, thoughts over their level and plain terms 0; cards twice and sentences twice 0 (§1.14's walk cards); job pages with a thought naming an earlier fact 100%.
- **Round trip and clarity** (`scripts/roundtrip.ts --nights 30 --routes oracle,wanderer,reader`): every plain page and every voiced composite reads back, and every voiced composite is clear, 100.0% at every tier in both worlds. The flesh column's three misses are main's (Miss Nowak's owning up naming Mrs. Rafferty, the neighbourhood's Poached and Medium).
- **The claudisms gates** hold: one simile frame a page, each night tic once, a running gag twice at most.
- **Engine words and jargon**: 0 in every prose source (pages, voicings, composites, texture, the notebook and grid); the report's, verdict's and curtain's "cleared" and "nobody else" are docs/64's words, as main. Plain terms 0. `test/plain-words.test.ts` passes with its new tests.
- **Dealt boards** hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a` (main's after one-liar). Nothing in `src/gen/` changed.
- **board-measure** (`--seeds 20`, this build against main): every puzzle column is unchanged at every row; only "callback pages" moves, by one or two points either way, at nine rows.
- **The suite**: 939 tests, 35 files, pass (`npx vitest run --minWorkers=1 --maxWorkers=3`), main's 896 among them; `test/hinge.test.ts` has the thirteen new rules (the line each catches and the line said instead), `test/clarity5.test.ts` the four nights along the testers' routes and the rules on other nights. tsc is clean; `npm run build` builds.

## 3. The skim test

`scripts/skim-test.ts`, as docs/62 §3 and docs/66 §3: 24 job pages a round (four each of the office, accounts, lists, finds, puts and turns, both worlds, every tier), each as main writes it and as this build writes it from the same night, three questions each read off the engine's facts; two blind readers (subagents given the packet's text and nothing else), each reading every page once, half in each build, crossed. The gate the coordinator set: questions right at least main's, sentences flagged fewer. Two rounds, on nights no round read before (from 12000 and from 13000), with a fix by rule between them:

| round | nights | before: right | after: right | before: flagged | after: flagged | gate |
|---|---|---|---|---|---|---|
| 1 | from 12000 | 70 of 72 (97%) | 70 of 72 (97%) | 20 | 17 | **pass** |
| 2 | from 13000 | 67 of 72 (93%) | 67 of 72 (93%) | 13 | 13 | fail (even) |
| both | | 137 of 144 | 137 of 144 | 33 | 30 | |

(The script's own stricter gate, flagged sentences cut by half, isn't met in either round.)

Accuracy was even in both rounds, on the same questions in both builds: Hard-boiled's turn, which doesn't say whose story breaks (docs/46, by design: "Nobody's yet" in both builds), and in round 2 a put whose key has it not landing where the owning up came at once.

- **Round 1**, 20 → 17. Main's own lines that stopped readers and this build doesn't say: "my late husband’s gold watch" of a male client (twice; §1.10), and the turn's "Bledsoe hadn’t been at Mrs. Nagy’s while the chloral was on the hall shelf." (P4) with its "At ten, when Doyle was given the chloral, …". This build's own that stopped a reader: the turn's settled hour said with a colon ("It happened at eleven o’clock: Kaminsky had said ten or eleven, and Duchess was still at the flats over Lipsky’s at ten."), "Bledsoe hadn’t been at Mrs. Nagy’s before nine." (what it ruled out wasn't said), and "So Fritz had gone to Tierney, at Steinmetz’s." said at Steinmetz's. Fixed by rule before round 2 (§1.5, §1.11, §1.14): the turn's hour a sentence of its own and its reason after ("It happened at ten o’clock. Vogel had said nine or ten, and at nine Mulcahy was still alive at the Blue Lantern."); the means beside the hour ("…before nine, when the rat poison was there to take"); "So Tierney had Fritz, and was somewhere in the room." The rest were lines both builds have, flagged in both: a card ("Feldman had let somebody in, and then turned away."), the put that doesn't land, the list's "She was here at eleven." and "Lou was the one at the table by the kitchen.", Hard-boiled's turn, "Glick was three rows back.", and "Mrs. Krantz didn’t come to the flats over Lipsky’s till nine, too late for the rat poison." with "At seven, he saw her at Steinmetz’s, right where she said."
- **Round 2**, 13 and 13. This build's own: the turn's reason after the hour (twice: "Kaminsky had said ten or eleven, and at ten Fritz was still at the flats over Lipsky’s."; main's form of the same line, "…, so the hour was eleven.", was flagged twice too), and "Doyle hadn’t been at the flats over Lipsky’s before nine, when the rat poison was there to take." (main's "…while the rat poison was on the cellar shelf." once too). The rest are lines both builds have and both builds' readers flagged: the office's "Mrs. Nagy, who runs the rooms on East Fourth Street, keeps a spare key on a nail in the hall at Mrs. Nagy’s" (twice), Hard-boiled's turn, "Mrs. Shapiro was the one three rows back.", a refusal's "I don’t do that part. Get somebody else to read it."

Across the two rounds this build is flagged a little less (30 to 33), and the line flagged most in both builds is the one docs/62 named: the dead seen alive at an hour the client gave, the deduction the turn leaves to the player (docs/46). Saying the hour first or last didn't change that.

## 4. The nights, read

Read in full, page by page, in lean (`npm run read`), on main (`5f849a1`) and on this build's last commit: the four round-7 nights along the testers' own routes (from `playtest7-*.json`) and along the oracle's, the brief's three (Raw 7 murder, Medium 7, Hard-boiled 8 murder) on the oracle's, Raw 23 and Raw 7 with `--hints every`, and Poached 6 (a one-liar night) for the coordinator's slips. Words a page, main → this build: Raw 23 127 → 126 (the testers' route) and 124 → 123 (the oracle's), Poached 17 111 → 109 and 111 → 110, Medium 21 108 → 106 and 111 → 109, Hard-boiled 19 106 → 100 and 100 → 97; Raw 7 117 → 115, Medium 7 110 → 109, Hard-boiled 8 117 → 114. Each scope item, main → this build:

**Raw 23** (the Persian cat; the testers' route).
- *The office* (P9, P8): "The table at his place was set at eight, for a birthday supper. “Winslow, a cafeteria cashier, and Ashby, a bus conductor,” my client said." → "“I had people in at eight,” he said, “for a birthday supper.” The people at his place were Winslow, a cafeteria cashier, and Ashby, a bus conductor, and that was everybody."; "my client said" twice more → "he said".
- *Walks* (P2): "The Shamrock was a short walk." → "It was a short walk."; "The same door as before was a few blocks" → "It was a few blocks, give or take."
- *Staging* (P6): "Lindemann and Ruggiero were at the bar all evening" (Lindemann in a booth by the wall) → "…were drinking here all evening".
- *The pet's kind* (docs/67's open item): "when Mimi, the Persian cat, went" → "when Mimi went".
- *The fence* (P6): the return says where he is ("Pardo was still in the back booth."), so the crack's "who was sitting ten feet away" has him placed.
- *The hints* (`--hints every`, P7): "Hint: Ashby, Lindemann and Winslow knew the door would be unlocked, and nobody had said where any of them was at ten — ask Ashby where she was." once, then "Hint: ask Lindemann where she was." and "Hint: ask Winslow where he was."; the questions' stars "[nobody had said where she was at ten]".

**Poached 17** (murder; the testers' route).
- *Answers* (P1): Mrs. Nagy's "Nine: nobody in. … The carving knife in my kitchen drawer: there at seven." → "Nobody in at nine. … The carving knife was in my kitchen drawer at seven, and I didn’t look again."; Bidwell's "the start of the evening" twice → once ("Quill was in early, like every night"); Callahan's "At nine and ten I had nobody with me." → "From then on it was just me."; Dandridge's "Start with seven: … Renfro kept me company at eight. Quill was with me at first and left after eight. Nobody with me at nine." → "To start with, at seven o’clock, … Renfro and Quill kept me company at eight. Just me, from then on."
- *Ahead* (P4): "Renfro hadn’t been at Mrs. Nagy’s while the carving knife was in the kitchen drawer." (at Moe's) → "…before nine, when the carving knife was there to take."
- *Who could have had it, once* (§1.15): "Salerno had been at Mrs. Nagy’s earlier, when the carving knife was there for the taking, and I wrote that down. So Dandridge and Callahan had both been…" → "So Dandridge, Callahan and Salerno had all been at Mrs. Nagy’s, where the carving knife was kept, and had all left by nine."
- *Said once* (P8): "earlier in the evening" twice → once; "The carving knife had come from Mrs. Nagy’s." on the way in is gone; the papers' "the dead man" three times → "a brother Quill had testified against … by the landlord".
- *Bledsoe* (P3): "By then Bledsoe was in the corner." → "Bledsoe, the woman Dandridge had named, was in the corner by then."
- *What drew me* (docs/67): Sokol's back room, which said no reason → "Mrs. Nagy had seen him at her place at seven."; the ask doesn't say it to his face again.
- *Walks* (P2, seed 2): "Moe’s was a short walk." → "It was a short walk."; "Getting to the same door as before meant a couple of blocks." → "It was a couple of blocks…".
- *The notebook* (U1, U2): one numbering (Bledsoe #23 on both lists); "Dandridge owns up: Sokol’s back room…" → "Dandridge admits he was at Sokol’s back room at nine o’clock, with Bledsoe."; "How it adds up": "Dandridge owned up to Sokol’s back room, with Bledsoe." → "Dandridge admitted he was at Sokol’s back room, with Bledsoe."

**Medium 21** (murder; the testers' route).
- *Walks and the tailor's* (P2): "I went in by the tailor’s passage to Mulcahy’s rooms behind the tailor’s" → "by the side passage"; "I walked to the same door as before. It was a fair walk." → "It was a fair walk."
- *Staging* (P6): "tapping the time of a song nobody was playing" beside the band's piano → "drumming on it with two fingers"; "She tapped the bar twice" at a table → gone; "I started low, along the baseboards, and worked my way up the walls." at the desk → "I started at the door and missed nothing I could help."
- *Answers* (P1): Mrs. Kowalski's "Ten, nobody in. I had the place to myself. … At seven, the carving knife in my kitchen drawer was there; I didn’t look again after that." → "At ten I had nobody in. … The carving knife was in my kitchen drawer at seven. I didn’t look again."; Vitale's "Seven through eight. I went to the Eagle club office for the committee meeting, alone." → "Seven through eight, I went to the Eagle club office for the committee meeting."; Sweeney's letters written twice → once.
- *One step a sentence* (P5): "So Broadnax had seen the same: the Blue Lantern at ten; the street was what mattered, since Allen Street was where Mulcahy lived." → "…at ten. That much checked out. The street rang a bell. Allen Street was where Mulcahy lived."
- *Who could have had it* (§1.15): "Mosley had been at Kowalski’s earlier, … and Vitale didn’t come till nine, too late for it. So Salerno and Sweeney had both been…" → "Vitale didn’t come to Kowalski’s till nine, too late for the carving knife. So Salerno, Sweeney and Mosley had each been at Kowalski’s earlier, where the carving knife was kept, and every one of them had gone by ten."
- *Winslow* (P3, docs/66's open item): "Winslow was in the corner." → "Winslow, the man Sweeney had named, was at the far table."; his answer now ends "So he had it the same as Sweeney. That much of it stood up."
- *The turn* (seed 9): "Mulcahy was still alive at the Blue Lantern at nine, and Vogel had said nine or ten, so it happened at ten o’clock." → "It happened at ten o’clock. Vogel had said nine or ten, and at nine Mulcahy was still alive at the Blue Lantern."
- *What drew me*: "Mrs. Kowalski had seen him at her place at eight." (the Eagle club office); "Vitale had passed Salerno on Allen Street at ten." (Salerno's flat).

**Hard-boiled 19** (a pair night; the testers' route).
- *The office* (P9): "Whichever it was, that’s when he was poisoned. Chloral takes twenty minutes to an hour, so he died within the hour." → "That’s as close as the police surgeon can get, by the warmth of him. Chloral works inside the hour, so whichever it was, that’s when he was given it."; "“Ask Mosley, the one who found him,”" → "“There’s Mosley, the one who found him,”"; "earlier in the evening" → "tonight too".
- *The papers* (P8, P6): "The dead man had been squeezing Mosley…" → "Vitale had been squeezing Mosley…"; "I dusted off my knees." after the desk is gone.
- *Who's in the room* (docs/67's open item): "Mrs. Corrigan, …, Hauck, in a green hat, was …, and Lefkowitz, in a sailor’s pea coat, stood …" → two, and the third a sentence of its own.
- *Answers* (P1): Mrs. Corrigan's "The chloral on my hall shelf was there at seven o’clock; I didn’t look again after that." → "The chloral was on my hall shelf at seven o’clock. I didn’t look again after that."; Grasso's "From then on it was just me."; Dandridge's "At first it was just me. Donnelly joined me at nine and stayed."
- *What drew me* (§1.14): at Grasso's flat, "Mosley had said he was with her at nine."
- *The mark line* (U4): once, under Bledsoe's list page, the night's first coat.

**Raw 7, Medium 7, Hard-boiled 8** (the oracle's route): the client's "he said" on the office, the walks, the answers' colons gone, and Raw 7's hint "Bledsoe says Crowninshield was with her at Mrs. Nagy’s at nine — ask Crowninshield where she was." → "nobody had said where Crowninshield was at ten — ask Crowninshield where she was." (ten is the hour). Nothing on these nights reads worse than main's, by my read; the leftovers below are both builds'.

**Poached 6** (one-liar): §1.15's three.

## 5. What's open

In docs/25 too.

- **The skim gate** (§3) was met in round 1 (flagged 20 → 17, right even) and not in round 2 (13 and 13, right even). What both builds' readers stop on most is the turn's dead-seen-alive reason, said first or last, and the office's "keeps a spare key … at Mrs. Nagy’s" from somebody named after the house.
- **The turn's length**, by `scratchpad/c5/turns.mts`'s count: a few more turns over 70 (Raw to Poached) or 90 (above) than main's (dealt 11 against 9 of 156 turns, the neighbourhood 13 against 11), from the settled hour said first, the lodger and the means. The turn's budget (`turnOrder`) wasn't changed.
- **List smell** rose at ten of twelve rows (one step of logic a sentence makes short sentences); not a gate.
- **Hard-boiled's hours** are still said bare after the night's one reason, and its turn doesn't say whose story breaks (docs/46, by design; the skim readers answered "nobody's yet" in both builds).
- **The keeper's place in a breaker**: P8's rule reaches the pointer and the way in, not the put: "Mrs. Nagy says nobody was at Mrs. Nagy’s at nine, not you or anybody else." (the clarity check wants the place's name in that line).
- **Seen while reading, left alone** (both builds'): "There was nobody on duty, and nobody to ask who had been by." at a scene; "Pickering had been here all night, and nobody had asked him yet."; "Mrs. Mulcahy’s own answer was the Delmonico rooms at eleven o’clock, alone."; "Mrs. Sirkin talked to me in the hall, with one eye on the front door."; the curtain's fastest solve still cites a pointer's own hour where the hint no longer does ("Brauer says Callahan was with her at Mrs. Nagy’s at seven", Medium 16; `starReason`, which the curtain reads).
- **For the designer** (not this build's): tier names, the means' deadline on "How this works", Whitfield's way in, the body-finder's reason, places full at 5 AM, the tagline.
