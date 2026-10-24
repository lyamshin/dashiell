# Round 5: the interface, the report and the walks

*2026-10-24, branch `round5-ui`, off main at `e09e83c` (clarity-2). Round 5's four blind testers (Raw 11, Poached 5, Medium 14, Hard-boiled 8; the digest's section U) all solved by deduction, 8–14% over par, and none called the game opaque. The interface tripped them in the same places: the "free · 1 question" label (4 of 4), the report's "cleared counts down this same list" (4 of 4), report groups that mixed in lines about other people (3), fences in the report the night never named (2), report lines that didn't match the page, a verdict that docked the put the turn had just offered without saying which call was spare, a Hard-boiled picker that named a face, and walks a New Yorker would balk at. This build fixes those, by rule, in the book and the CLI alike. Page prose (composition, voicings, cards, thoughts, turns, puts' dialogue) is clarity-3's and isn't touched here.*

*The puzzle didn't move: the dealt boards hash the same (seeds 1–40, every tier and type, both worlds: dealt `b906a1009c23fe86`, neighbourhood `af89ea961f7168e1`), nothing in `src/gen/` changed, and par and the score are what they were: the verdict only says more.*

## 1. What was built, item by item

Each item says the rule, where it lives, and the testers' own line before → after, from their saves replayed through `npm run play`.

### U1. Picking somebody is free; each question is a call (`text.ts`, `play-lib.ts`, `board-book.ts`)

The heading says what's free and what costs, once, in the same words in the book and the CLI (`TALK_HEADING`, `TALK_NOTE`); a person's row counts the questions still open to ask them (`questionsText`), "all asked" when none are. The book said "Talk to" and "2 topics"; the CLI said the parenthesis below and "free · 2 questions".

> Talk to (choosing somebody opens what to ask them; that is free):
> &nbsp;&nbsp;&nbsp;1. * Mrs. Kowalski — The spare key is in the sugar tin there — ask who was there&nbsp;&nbsp;&nbsp;**free · 1 question**

> Talk to (picking someone is free; each question costs a call):
> &nbsp;&nbsp;&nbsp;1. * Mrs. Kowalski — The spare key is in the sugar tin there — ask who was there&nbsp;&nbsp;&nbsp;**1 question**
> &nbsp;&nbsp;&nbsp;…&nbsp;&nbsp;Alfano&nbsp;&nbsp;&nbsp;**all asked**

The first page's key also says what a put is ("Every question, search and walk costs one call, and so does reading somebody a line with “Put it to”", where it said "and put", a word the Raw tester didn't know yet).

### U2. "Cleared" is a number from the same list (`play-lib.ts`)

> If Reinhardt is who else lied, cleared counts down this same list.

> If Reinhardt is the other liar, give “cleared” as a number from this list too.

The form's own hints say it the same way ("Name them first: … lists what I have that names them, the same list as for breaks. Give “cleared” as a number from it, or cleared=hunch."), and so do the CLI's refusals ("cleared is a number from the list `report <name>` shows for them"). The book shows that list under the question itself, so it needs no sentence.

### U3. The first group keeps its lines, and its heading says what they are (`report.ts` `lineGroupHeads`)

The testers' complaint was that the heading said something its lines weren't ("What I have about where Bellucci said he was at ten", over Mrs. Kowalski's ten o'clock at Kowalski's, where he never said he was at ten), not that there were lines to choose between. So the group is docs/55 5's, unchanged: lines at the hours that mattered about them, or about any place their own story names, in the order held, so the line that breaks a story is "one of several and not first by rank". What changed is the heading, which now says exactly that, from one function the book and the CLI share. Once their own evening is held: "What I have at ten about Bellucci and the places he said he was tonight:"; before it, "What I have at ten about Bellucci:"; with two hours, "at nine or ten". The second group stays "Anything else I have that names Bellucci or is about ten:".

Raw 11, `report Bellucci` (he said Kowalski's at eight and nine, Moe's at ten):

> What I have about where Bellucci said he was at ten:
> &nbsp;&nbsp;1. Mrs. Kowalski: at ten o’clock, only Rafferty and Moretti were at Kowalski’s.
> &nbsp;&nbsp;2. Alfano: at ten o’clock, only Steinbach, Lanza and Pardo were at Moe’s.

> What I have at ten about Bellucci and the places he said he was tonight:
> &nbsp;&nbsp;1. Mrs. Kowalski: at ten o’clock, only Rafferty and Moretti were at Kowalski’s.
> &nbsp;&nbsp;2. Alfano: at ten o’clock, only Steinbach, Lanza and Pardo were at Moe’s.

Medium 14, `report Thorndike`: the same five lines, now under "What I have at nine or ten about Thorndike and the places he said he was tonight:", where "Alfano says she was at the chop house at ten o’clock" fits (he said the chop house at eleven), which "What I have about where Thorndike said he was at nine or ten" didn't. Hard-boiled 8, `report Renfro`: the same seven, under "What I have at nine or ten about Renfro and the places he said he was tonight:" (the Delmonico rooms at seven, the Odessa at eight and ten). Poached 5's "line about the other liar under each" stays too: it's at the hour that mattered, at a place the named person's own story names, and the heading says so.

The first build of this branch narrowed the group to what the old heading claimed instead (lines about them, or about the place they said, at those hours). The coordinator turned that down before merging: the group was then often one line, and that line was the answer (Thorndike 5 → 1, Renfro 7 → 2), so the form did the player's last step, for the culprit and the other liar alike, which is what docs/55 5 was written to stop; and the readers that file the first line the form offers rose from 0% to as much as 9% a tier (§3). The honest heading over the wide group is the choice here; the designer may revisit it.

### U4. The fences offered are the ones the night named (`report.ts` `whereOptions`, `boardFields(d, run)`)

"Where it is now" offers a fence only when a page read or a line held named them. Without a run (the verdict's and the curtain's own words for the truth) it still knows them all.

> Where it is now: 1. Lou 2. Pardo 3. Benny 4. Still at the Marchetti flat

> Where it is now: 1. Pardo 2. Still at the Marchetti flat

(Medium 14: "1. Benny 2. Still at the Hauck flat".) The readers in `oracle.ts` read the same form the player sees.

### U5. The notebook and the report say a line plainly, and as the page did (`knowledge.ts`, `text.ts`, `motives.ts`, `grid.ts`, `board-book.ts`)

One wording for a held line everywhere it's shown: the notebook (book and CLI), the grid's "Where the stories don't agree", the report and the picker (`lineShown`).

- **A watcher's hour, in the third person, no more than they said** (`listText`). A face is "somebody in a camel coat", and who couldn't be named is said once, after; a stranger loses the watcher's own "I didn't know".
  > Reinhardt: at ten o’clock, only somebody in a camel coat, back to the room, I couldn’t swear who was at the Odessa.
  > Broadnax: at ten o’clock, Grasso and somebody at the same table I didn’t know were at the Automat.

  > Reinhardt: at ten o’clock, only somebody in a camel coat was at the Odessa; Reinhardt couldn’t say who that was.
  > Broadnax: at ten o’clock, Grasso was at the Automat, with somebody at the same table; Broadnax didn’t know who that was.
- **A claim says "home" where the page did** (`claimWhere`, docs/55 1d and docs/59's "home at the Delmonico rooms"): "Thorndike says he was at Thorndike’s flat at ten o’clock" → "Thorndike says he was home at ten o’clock"; "Grasso says she was at the Delmonico rooms at ten o’clock" → "Grasso says she was home at the Delmonico rooms at ten o’clock".
- **A remark in the page's words**, in the notebook as the report already had it (docs/55 5): "Pickering: “Walking over to the chop house at ten I passed Thorndike on Second Avenue, going fast, no hat.”" (the case's wording, while the page and the report said) → "Pickering: “Ten, on my way to the chop house, I passed Thorndike on Second Avenue: going fast, no hat.”"
- **The why form, active**: "Says the watch was promised to them by the late Mr. Marchetti" → "Says the late Mr. Marchetti promised them the watch" (still without the suspect's pronoun, docs/47 B7; the verdict says "her").
- **What the client said**, one function for the book and the CLI (`officeLines`): the book printed the office's raw lines ("Marchetti’s late husband’s gold watch…", "The woman downstairs says she says…") while the CLI printed them titled and rewritten. Two more rules: "says she says" is "says she insists" (it was "says she claims", an engine word, docs/53), and after "The neighbors say" too ("The neighbors say she says the watch was promised…" → "The neighbors say she insists…"); and a small case's window says whose going it was ("He went at nine or ten o’clock." after a line about Hauck → "Fritz went at nine or ten o’clock.").
- The book's notebook gains the reasons asked of suspects, as the CLI's had them.

### U6. What a blank goes in as, once (`report.ts` `blankRule`)

> Filing is final. Leave a line blank and it goes in as I don’t know.
> … Leave a line out and it goes in as “I don’t know”; leave breaks or whereBy out and it goes in as a hunch.

> Filing is final. Anything left blank goes in as “I don’t know”, except What shows they lied and What puts it there, which go in as “A hunch”.

One sentence, at the top, the same in the book and the CLI, naming the night's own line questions; the CLI's "File it with" no longer says it again. With the calls spent it opens "The calls are spent, so this is what gets filed."

### U7. The verdict says which call was spare (`report.ts` `spareCalls`, `choices.ts` `pickerNote`)

Over par, the closing names the calls the short way didn't need: questions the run could drop and still have everything par's own test asks for (`analyse`'s goal: the solver done on what a detective could be pointed to), no more than it ran over. Puts first (a refusal, then a crack), then questions the short way doesn't ask, then the rest, the latest first. It says why: a refusal said nothing, a crack's where-it-went was already said by somebody who saw the handover. The score is the score: points and outcome are computed before, and never read this.

> It took me 8 calls. A better detective would have done it in 7.

> It took me 8 calls. A better detective would have done it in 7. Facing Bellucci was a call I didn’t need: Alfano had already told me where the watch went.

Poached 5, Medium 14 and Hard-boiled 8: "Facing Reinhardt / Thorndike / Grasso was a call I didn’t need: she / he / she wouldn’t say, and I had enough to file without it." Over 434 nights filed true off the oracle's route with extra calls spliced in (every put it could make; one extra question mid-route), 162 closings name a spare call in four shapes ("Asking X where she was tonight…" 96, a refusal 47, a put "I had enough to file without it" 10, a crack 9), no engine words, and no score or outcome moved.

And before the call is spent, the picker says the put isn't needed for the report (Medium and Hard-boiled testers couldn't tell): "… If it breaks nothing, the call is gone all the same, and the page says why. **The report counts the line whether you read it to him or not.**" Its first sentence is plainer too: "then the line that breaks it: say, somebody who saw everybody who was there then, and didn’t see him" → "then the line that breaks it, such as somebody who saw everyone there at that hour and not him" (Poached's #23). The book and the CLI share it (the CLI said "I’ll say why", the book "the page says why").

The turn's offer ("I could face Bellucci with it now.") is the turn's, clarity-3's: see §4.

### U8. The CLI's head says the time (`play-lib.ts`)

> Moe’s&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;6:25 AM · page 9 of 9

> Moe’s&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;6:25 AM

The first page's key says "`page <n>` turns back to an earlier page", and a page turned back to says which: "(A page turned back to: page 2 of 9. `look` shows the newest.)". The book's pager ("‹ back · page 8 of 8 · forward ›") is a pager, and stays.

### U9. Hard-boiled: what docs/46 decided, and the picker (`choices.ts`)

- **docs/46 decided** the stars (Hard-boiled: one, on page one), the thoughts (Hard-boiled at "fact" level: no link to an earlier page), the report's line question and the grid's hours (the office's hours above Raw). It said nothing of the put picker's labels.
- **The picker's labels (open, so changed):** a line offered to read somebody is the notebook's line, word for word, and never the face matched to a name. That match ("the camel coat was Abramowitz’s") is the Hard-boiled deduction itself: Abramowitz arrives in a camel coat, says the Odessa at ten, and Reinhardt saw only a camel coat there at ten.
  > Reinhardt said only somebody in a camel coat was at the Odessa at ten o’clock; the camel coat was Abramowitz’s.  (who Reinhardt saw)
  > Abramowitz says he himself was at the Odessa at ten o’clock, alone.

  > Reinhardt: at ten o’clock, only somebody in a camel coat was at the Odessa; Reinhardt couldn’t say who that was.  (who Reinhardt saw)
  > Abramowitz says he was at the Odessa at ten o’clock, on his own.

  The put, once read, still says whose coat it was (its dialogue is the put's, clarity-3's). Raw and Coddled's ready-made pairs keep their sentence ("Alfano said only Steinbach, Lanza and Pardo were at Moe’s at ten o’clock."), with no face (there are none below Hard-boiled).
- **The grid's "ten !" (decided, so left):** docs/46 §2 had the grid mark the office's hours above Raw. docs/47 #5 reversed it on purpose, at every tier: the dead man's row shows where somebody saw him, and an hour that row puts him away from the scene drops out ("this reverses docs/46 §2's choice for the grid; the thought still stops at the link"). So the "!" appearing once Reinhardt puts Carbone at the Odessa at nine is docs/47's decision, not a slip. If Hard-boiled should go back to docs/46 (the "?" on the office's hours, the dead man's row still showing the sighting), it's one line in `grid.ts` (`window`), and the designer's call.

### U10. Hard-boiled's one star, said where it is (`text.ts` `starsNote`)

docs/46 §1: "Hard-boiled | one star: the scene, on page one. None after." That's the design, so it's said once, on page one, under the choices, in the book and the CLI, at Hard-boiled only:

> At Hard-boiled this is the only star you get. After this page, where to go and whom to ask is up to you.

**For the teach page (proposed, not changed; the designer approved it as it stands),** an eighth line after "A refusal isn’t proof.", in its register:

> Stars point to a good next step. The harder the case, the fewer there are, and at Hard-boiled only the first page has one.

With it, the page-one note above could go.

### U11. The streets where they really run (`walk.ts`)

A place sat on its street at a spot its name picked anywhere between Canal and Houston, whatever the street: Second Avenue, which starts at Houston and runs north, came out south of Grand ("I walked downtown and east to the Hauck flat", from Mulberry Street); Avenue B below Grand; Catherine Street (Chatham Square to the river) as far east as Clinton Street; Cannon Street south of Grand. Now every north–south street has the stretch it runs (the avenues north of Houston, at the streets they continue: Second from Chrystie, First from Allen, A from Essex, B from Clinton; Cannon from Grand to Houston; Park Row and Centre below Canal), every east–west street the stretch it crosses (Spring and Kenmare west of the Bowery, Delancey and Rivington east of it, Hester and Canal to Essex), and Catherine Street its diagonal. A place sits on its own stretch, at the spot its name picks, the same all night. Third Avenue, Kenmare, East Fifth and East Houston Street, which fell to the fallback before, are on the map. The dealt boards don't read the walk, so they hash the same.

> I walked downtown and east to the Hauck flat; it was a couple of blocks, and I didn’t hurry.
> The Odessa was a fair few blocks uptown and west. (from Catherine Street to Second Avenue)
> Kowalski’s was a few blocks uptown and west of the Marchetti flat … (Avenue B, put south of Grand)

> I walked uptown and east to the Hauck flat; it was a good walk, and I didn’t hurry.
> The Odessa was a fair few blocks uptown and east.
> Kowalski’s was a couple of blocks west of the Marchetti flat …

Distances follow the map, so some walks say a different distance and the walk card drawn for it can differ ("close enough for anybody to slip over and back inside the hour" is a near walk's card). **Not fixed: Pickering's remark** ("Ten, on my way to the chop house, I passed Thorndike on Second Avenue") comes from the Delmonico rooms on Catherine Street to the chop house on Grand, which never crosses Second Avenue. The remark and its street are the generator's (the scene's street, put in the passer-by's mouth whatever their route), so fixing it moves the dealt boards: §4.

## 2. Tests

`test/round5.test.ts` (17), one or more a rule, on the testers' own routes and over the oracle's nights (three seeds a tier and type):

- U1: the heading, "1 question", "all asked", never "free ·";
- U2, U6: "give “cleared” as a number", never "counts down"; "goes in as" once in the CLI's form, in `blankRule`'s words, which the book uses;
- U3: every line in the first group fits its heading's own test (at an hour that mattered, and about them or a place they said they were tonight), and the heading names the places only once their evening is held; Raw 11's Kowalski ten o'clock is under it; Medium 14's Thorndike and Hard-boiled 8's Renfro keep more than two lines there;
- U4: **a report option for a fence nobody named that night fails**; Raw 11 offers Pardo and the flat;
- U5: the face and stranger lines; no list line says "I didn’t"/"I couldn’t" or "back to the room"; the notebook and the report agree word for word; "home"; "Fritz went"; the why form;
- U7: the four closings, the score unchanged; at par, nothing spare;
- U8: no "page N of N" in the head; a page turned back to says which;
- U9: no face matched on Hard-boiled 8's picker, and every picker line is a notebook line;
- U10: the note on page one at Hard-boiled only;
- U11: every place on an avenue is north of Houston and uptown from the office; Medium 14's first walk is "uptown and east".

Updated: `round4.test.ts` (the cost label; docs/55 5's group test is as on main), `round3.test.ts` (the key's star sentence, read across its new line break), `other-liar.test.ts` and `board-engine.test.ts` (the cleared sentence).

## 3. Measures

- **The suite:** 790 tests, all passing at three workers (773 on main, and 17 new); `tsc` clean; `npm run build` works.
- **Dealt boards:** dealt `b906a1009c23fe86`, neighbourhood `af89ea961f7168e1`, as docs/60.
- **`board-prose`, 30 nights a tier, both worlds:** every lint 0, the engine-words column included, as on main. Words a page (median) moved by one at most (dealt Coddled 102 → 101; the neighbourhood's Poached 121 → 122 and Hard-boiled 113 → 114): the walks say other distances. Every other column is main's.
- **The new chrome, linted** (`jargon.ts`'s `engineWords`): the 162 spare-call closings above, every held line as shown, the client's lines and the picker's new sentences, over the oracle's nights (12 seeds a tier and type; the closings, 15): no engine words, but for the client's own "Nobody else." after a party's guest list, the generator's line, printed as before. (It found "says she claims", main's rule, and the rule says "insists" now. The CLI form's own help says "list" and "cleared" as before; docs/61 allows the form's question and answer.)
- **`board-measure`, 50 seeds a tier and type: main's, byte for byte**, every table and every line under them: the puzzle columns (the oracle 100% solved at par, par, the refusal shortcut, the confession route, the wanderer, whose story breaks first, the lint and plain terms) and the shortcut readers' columns, which answer what cleared the other liar with the first line the form offers (0% at Soft-boiled and Medium for the first, the last and a random liar caught, and anybody with access; 42% and 44% for the reader citing the grid, as docs/61 §4 left them). The readers see the form as the player does, the fences the night named included (U4), and nothing moved.

  For the record, the first build's narrow group (§1 U3) moved those readers on Soft-boiled and Medium murders, all on refusers' nights where the innocent liar said home: Soft-boiled 0% → 18% (first liar caught), 8% (anybody with access), 10% (a liar at random); Medium 0% → 6%, 4%, 16%, and 12% (last liar caught); by tier at most 9%. With the wide group back they're 0% again.

## 4. What's open

- **U3, the designer's to revisit.** The wide group under an honest heading is the coordinator's call over the narrow group the first build had (§1 U3). The testers' Medium 14 line, "Alfano says she was at the chop house at ten o’clock" under Thorndike, now fits its heading but is still there to read past; if that's still noise to a player, the next step is ordering inside the group, not leaving lines out.
- **The turn's offer (U7), clarity-3's.** "I could face Bellucci with it now." (Raw and Coddled, docs/46's teaching tiers) invites the call the verdict now names as spare. Proposed: "I could face Bellucci with it, or file on what I had." `oracle.ts`'s `turnSaid` reads the sentence ("I could face (.+?) with it now\.") and has to follow it.
- **Pickering's route (U11), the generator's.** A side remark puts the passer-by on the scene's street on their way between their two places, whether or not the way runs there. The fix (pick a remark only where the scene's street lies between the two places, or say it without "on my way to") changes the dealt cases, so it isn't made here.
- **The grid's "!" at Hard-boiled (U9):** docs/47 #5's, above; the designer's call.
- **Remarks in the page's words** now reach the notebook, so a remark the page garbles is garbled there too: Hard-boiled 8's Broadnax, "On at ten. Anything earlier, I can’t say." (the case's own words were "I came on at ten. Before that I couldn’t tell you."). clarity-3's P2 rewrites that answer; the notebook follows the page.
- **What the client said** is the generator's text, rewritten at render by two more rules; "The parlor at the Marchetti flat: The glass dome … The door was locked again" (a find's text, "again?") is the generator's too.
- The book's verdict and the CLI's say the same closing; the curtain's short way still says "(Marchetti said so)" without the client's title.
- **A slip of mine, owned:** the first `preview_start` picked up the main checkout's `.claude/launch.json` ("humphrey", `npm run dev` on 5173) instead of this worktree's. It served for a few seconds and was stopped; vite may have left its dependency cache under the main checkout's `node_modules/.vite`. Nothing tracked changed. The checks in this doc ran on this worktree's own vite (`npx vite --port 5291`).

## 5. In the browser

This worktree's vite, at the pane's desktop width (1024) and at 375 px: the Raw 11 turn page ("Talk to (picking someone is free; each question costs a call)", "Alfano all asked", "Steinbach 2 questions"); Bellucci's picker with its note; the report form (the blank rule, "What I have at ten about Bellucci and the places he said he was tonight:" over Mrs. Kowalski's and Alfano's ten o'clock, "Anything else…" over Mrs. Kowalski's eight and nine, re-checked at 375 px after the heading changed, "Where it is now: Pardo / Still at the Marchetti flat", the why "Says the late Mr. Marchetti promised them the watch"); Hard-boiled 8's page one with the star note; its Delmonico page's people at 375; and its verdict ("Facing Grasso was a call I didn’t need…"). At 375 px nothing scrolls sideways (the document is 375 wide) and the heading's note wraps under "Talk to".
