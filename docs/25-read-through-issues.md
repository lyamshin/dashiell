# Read-through issues for the next writing batches

Found reading full runs after M10 and shorter nights (2026-09-23). Each item names where it shows up.

- **Search finds still print generator sentences as narration.** Seed 7, Hard-boiled, page 5: "The bank confirmed the account: Brennan had been taking two hundred a month for a year, and was at the fourth floor doing exactly that from eleven o'clock. It was theft, and it was not murder." A disqualifier found by searching needs its own telling: what the detective finds, and what it means for that person's lie.
- **A verdict above Coddled:** "It came down to embezzling from an employer. Brennan was out of it." An explained secret shows why someone lied. It doesn't clear them of the murder, and the page shouldn't say it does from Poached up.
- **Anchored sightings garble:** "While the milk wagon was in the street, she was at the Automat once and here once." Two sightings tied to the same event need two clauses, each with its place.
- **Tails that read as filler:** "I remember it because it was tonight." Audit the tail deck for lines that say nothing or joke at the game's expense.
- **Relation plus description stacked on first sight:** "He was in Renfro's debt, a man in his fifties." Give the description, and let the relation come from the page's reason for being there.
- **A search thought that doesn't follow from its find:** "The register had a room paid for at nine o'clock… / Renfro had been at the fourth floor at nine o'clock, later than I had Renfro before. If it held, somebody had it wrong." When the find's rule line doesn't name the person, the thought shouldn't either.
- **An anchor's time gets restated.** Seed 5, Soft-boiled, pages 2 and 3: "The singing under the window stopped at half past seven" is on page 2. Page 3 then says "The drunk singing under the window was at half past seven" twice, once inside the search paragraph and once as a thought. An anchor's time is established once, and later pages use it without restating it.
- **Questions ask about acquaintance but get sightings.** "What's Renfro to you?" is answered with where Renfro was. Three of the five ask-person question cards ask how the witness knows the person, not where they were. Match the question to the family being told.
- **Unsupplied slots:** `{dashiell}` on three hiring cards, and `{name}`/`{subject}` on some answer and thought cards. Nameless asks ("the key") fall to the "Tell me about {topic}" placeholder. They should use the place or object question lines, and that routing is in the reducer.

## After M11 (people), 2026-09-23
- **The client who found the body says it twice.** "She was found dead at the walk-up. That is where it happened. Half past eleven. That is when I found Lindemann at the walk-up." When the client is the finder, the finding is said once, in her own words.
- **The description line after "Why me?" lands on its own.** "She traded on the street for men who would rather not be seen doing it." It needs a lead-in, or should fold into her line.
- **The arrival observation repeats the presence activity word for word.** "reading a folded newspaper, not turning the page" appears in both. The observation should add the tie to the case without repeating the activity. *Engine side fixed in M12 (docs/29-m12-notes.md): the observation keeps only the plain action (up to the first comma, short of a second clause) with the hour and the tie, and says "still at it" where the plain action is all the activity was; a question's approach names the plain action only. `stoppedDoing` cuts at a clause, not at every "and".*
- **"Not turning the page" is a common activity.** It turns up for several people across seeds. It needs more variety. *Engine side in M12: a visit's activity is never one somebody else has been doing tonight while the trade has anything else. The variety across seeds is the activity deck's (the camp pass).*
- **The office has no camp closing on the hiring.** The hiring deck needs camp lines like the golden's "kept two fingers on it until I picked it up".
- **The 680 character cards need a camp pass.** They were written before the camp ruling, so the look cards and the fixtures' victim cards read sober.

## After M13 (sheets), 2026-09-24
- **A forced callback.** Sheet C: "From where she was you could see all of it, the floor overhead included." The prop was a creak, which you can't see. A callback has to fit the prop's sense: sound, sight or smell. Tag props with their sense and gate the lines that use them.
- **The relation sentence lands mid-paragraph.** "Hargrove was the bartender at the speakeasy." is inserted after the first mention inside a list sentence. In sheets, the first-mention clause should go into the sheet's own slot for it, or be dropped when the sheet already says who the person is.
- **Errand-line jokes that don't fit:** "Hauck had said as much, and my feet had made me promise to keep it short."
- **A redundant place:** "Petrosino, the cabbie on the stand at the cab stand."
- **A clunky bridge:** "Sirkin and eight o'clock: that was the next question, and it was for Crowninshield. I wasn't done with Crowninshield yet."
- **Left open by M13:** counterman looks mention a grill and can land at a pawnshop; the seat check doesn't know chairs; the notebook's own lines repeat within a night.

## After M14 (new cases), 2026-09-24
- **The client's briefing for a lost pet garbles who found what:** "It did not let itself out: the way out of the back lot is always kept shut. It was found standing open. It was me, at half past eleven. I got to the back lot and found the ginger tomcat gone." The finding needs to be said once, in the client's words: "I went round at half past eleven and the gate was standing open. The cat was gone."
- **The owner's description comes from the archetype's standing line,** so a cat owner is introduced as "kept a file of what was not printed". For the new cases, the owner's standing line should fit the case.
- **The trade line after "Why me?" still lands on its own:** "He sat the same desk from eight until six and ruled the columns by hand." This is the same problem as the item after M11.

## After v2 slice, 2026-09-24
- **Chloral both gone and present on one search page** (seed 3, Medium, v2, page 5): "A bottle of chloral sleeping drops was gone from the third floor… There was a bottle of chloral sleeping drops in the room." The object list for a place must exclude an object that a find says is missing.
- **The whistle heard twice on the scene page** (the motif plant, then the scene clue). Fold the motif plant into the clue when both land on one page.
- **The detective's gender** comes up in one ending card: "I have never been a man who opens drawers that aren't his." Decide whether the detective has a fixed gender, or make these lines neutral.

## After playtest round 2, 2026-09-25
Four blind playtesters (v2: seed 11 Raw, 2 Poached, 3 Medium, 21 Medium) all solved, and hit bugs against the rule "People lie about themselves. Nobody lies about what they saw." Branch `trust-fixes`. Each is fixed at its root, with a test in `test/trust-fixes.test.ts`.

- **"Never heard of him" after naming him.** Seed 3: Hauck says "Start with Steinbach…", then "Never heard of him"; Rafferty says Marchetti had the key off the hook, then "Never heard of her." Seed 11: the landlady had never heard of the owner of the block. *Cause:* the acquaintance graph (rolled, then cut by the v2 dig) never looked at the lines a person speaks; the dig had cut Rafferty's edge to Marchetti to make the stranger at the third floor the count book turns on. *Fix (knowing, not describing):* whoever names a person in a line of their own (the client's pointer and briefing, an overheard motive, the key seen taken) knows the name, and a landlady knows who owns property on her block. The edge keeps its strength, so what they saw is still a description and every case deals as before; it is marked `heard`, and asked about the name they say "I know the name. I couldn't put a face to it." (`nameHeard` in `gen/generate.ts`, `markHeard` and `knownByTrade` in `gen/logic/acquaint.ts`; the telling, the record, the rule line, a thought basis `name-only` and two telling frames follow it.) Describing instead would have taken the name, and the fact, out of the pointer and the key line; raising the edge to a full name would have named the stranger in every sighting and dealt seed 3 as a different case.
- **Owed and was owed.** Seed 21: "Petrosino owed money" from a witness, the notebook and the story, of the man Lefkowitz owed. *Cause:* docs/38 turned the debt round in the motive's own words but not in the bare category ("owed money") or the story deck. *Fix:* `motiveCategory` says "was owed money" where the tie runs the debt the other way (the witness's talk, the rules list, the notebook's motives); the story deals `debt-owed` cards; the report's menu says "money owed, one way or the other".
- **Grid marks on bad ground.** "? not seen by Bellucci" from Bellucci's own false claim; "? not seen by Rafferty" on Marchetti, whom Rafferty could not name, and not on Hauck in the same cell. *Fix:* a witness's presence is shown only by what they said they saw there then (a count, a face, somebody by name) or by somebody else's sighting of them, never by any account of their own evening; the mark needs the notebook to hold the witness's sightings of the claimant by name; and none where the witness's own story has them elsewhere then. A "nobody but …" counts everybody it names, the patrolman on his round included, as the words do (Hargrove's "Hauck and the patrolman" is Velvet=2), and is no longer a count mark (whoever it leaves out is already struck in ink).
- **Counts with holes.** Hargrove gave no number at eight o'clock, the half hour the victim was at the bar; the Lyric stand had none at half past eight; "two came in at six o'clock" read as arrivals. *Cause:* the generator leaves out a count where the victim or another doorkeeper was in the room, or where a single half hour was empty, and the dig takes counts away on purpose (docs/35), so the holes are part of the puzzle: a number at the victim's half hour would hand over the time of death. *Fix:* every half hour a watcher kept the door is said: a number, a name, "nobody besides me", or "I couldn't swear to a number". A gap is never silent. A watcher's count may come in parts over two questions, and the parts never contradict each other: "couldn't swear to a number" is said only of a half hour none of that watcher's counts covers, whether it is in hand or not, and only in the first part they give. A part says it is a part ("That's only part of the count. Ask me for the whole of it."), and the rest says the earlier part was given ("The rest of the count I gave you already."). Found in review: seed 3's route had Rafferty say "From six until half past ten I couldn't swear to a number" on one page, then give numbers for those hours on the next. A count says who was there ("At six o'clock there were two in here, besides me"); the questions, the records ("there were 2 people at the Velvet Room at 6:00 PM besides himself") and the thoughts say the same.
- **Text that mismatched the choice or the facts.** Asked for her evening, Lathrop's page asked about Rosenbaum's (the account now answers first, and anything volunteered follows, unasked). "When I said six o'clock" of a story broken at half past seven (the confrontation's hour is the half hour the fact broke). The third floor offered "a bottle of chloral sleeping drops" to search, then said it was gone (a thing a find says is missing is never in the room's list, find or no find). "She never came in, any time I was here" and "It put her somewhere" of somebody not seen (now "She wasn't here, any time I was", and a note's seen or unseen is read from the facts). "It was there, just as Hauck said it would be" of a bartender nobody had asked yet (a walk that finds the person to ask says so).
- **A fact that broke one lie could not break the next.** Prentiss's first story broke on Obermann's word, and the same fact broke the second; putting it again read "I had put that to Prentiss already." *Fix:* a fact already put may be put again once the story it was put to has been replaced (a second story, an admission, a companion given up), and it lands if it breaks the story told now (`putBeforeOnThisStory`, `judgeConfront`).
- **"Go over what I have".** Answered "Nothing had moved since the last time, including me", or said the hour was not known after the client had said it. *Fix:* asked for, it goes over all of it and ends the stock-taking on what is still open ("I still didn't know which of those half hours it was, or who."); the briefing's hour is in hand from page one.
- **The play CLI.** `link` printed the whole grid, rules and all, for every link: it now lists one line a sighting (the same face, one place, half hours in a row), links the whole of it, and says what it linked. The notebook listed each count twice ("nobody but Vitale" and "one person" at seven): a door's counts are one line, a half hour once.
- **20 minutes against 25.** Not travel or a surcharge: the clock's running total is rounded to five minutes so that the last call lands on eight, and a call that comes out five minutes off the night's usual now says so: "20 min (rounded)". The CLI's help says why.
- **Checks.** Every case deals as before (seed 3 at Medium is still the Sirkin case; the m7 and structure hashes are untouched). The four saves replay to the end, and each page above was read again after the fix. The v2 design test (`--design --seeds 50 --configs T0,T1L2,T2L2,T4L2,T5L2 --engine v2`), before → after: marks-follower Raw 24% → 28%, Coddled 14% → 18%, Poached 28% → 28%, Medium 24% → 24%, Hard-boiled 14% → 14%; the reasoning player 100 / 100 / 98 / 82 / 82%, unchanged. The marks-follower moves only where the grid's soft marks drive the ready-made confrontation (fewer marks, each on ground).
- **Left as it is.** A watcher's stated gaps can run long where the one the case is about sat in their room all evening (a lost cat's owner in the landlady's parlour: "From nine until half past eleven I couldn't swear to a number"). Counting them would give away where the owner was, and the puzzle stage takes counts away on purpose; the gap is said, not filled.

## After legible play (docs/40), 2026-09-25
Branch `legible-play`. What changed is logged in docs/40 "Built". These were found reading seeds 3 and 21 (Medium), 2 (Poached) and 11 (Raw) through `npm run read --route`, and playing seed 3 through `npm run play`.

- **Fixed here.**
  - The wrong-put closes said "half hour" of a call, and "they did not cross anywhere" of a fact the new held line explains (cnf-007/008/009/012).
  - The Raw ready-made label lost who was seen ("Abramowitz: the Garibaldi, 8:00").
  - Broken hours read as a list ("at ten o'clock and at half past ten and at eleven o'clock").
- **Chapters crowd.**
  - Seed 2, pages 5 and 6: "Chapter Four: Something That Didn't Fit", then "Chapter Five: Nowhere to Stand" on the next page.
  - Seed 3, played by hand, pages 6 and 7: Chapters Three and Four, one after the other.

  The book's acts can turn faster than the night does.
- **The picker files other people's own word under the one being confronted.** Marchetti's picker lists "own word: the Velvet Room, 7:00–7:30 (Hauck)" under "7:00 · she says the Velvet Room". Somebody else's story is no fact against hers.
- **A Raw ready-made put that rests on a chain says only one link.** Seed 11: "Put it to Rafferty: Abramowitz saw Fairbanks at the Garibaldi at eight o'clock…". That breaks Rafferty's story only through Fairbanks's own account, and the label doesn't say how.
- **The closing overstates the time to spare.** Seed 3, played by hand and filed with seven calls left, closes with "the night's last hour to spare".

## Small board, 4b (docs/43), 2026-10-08
Branch `small-board-4b`. Found reading six board nights in full (`npm run read -- --engine board`: Raw 2 murder, Coddled 8 lost item, Poached 4, Soft-boiled 3 murder, Medium 1 lost pet, Hard-boiled 1 murder) and playing Raw 5 and Medium 7 through `npm run play`.

- **Fixed here.**
  - The generator's reasons said more than the board: "to get off her feet for two hours" for one hour, "turned in early" with a move after it. Two people ran errands to one rooming house in one hour from the same party. Nobody had a reason to be at somebody else's home at the first hour, and a second person at the numbers room went there "to dance".
  - The barman's handover remark named the thief, which settled who in one line.
  - The client spoke of themselves in the third person: "She and Hargrove haven’t spoken", "stood at Prentiss’s elbow", "nine or ten o’clock, Bernstein says". The relation line ran backwards ("Coffin was my landlady"), and the finder's clause dangled.
  - A trade's look card off duty: an order pad in an apron at the pictures; a cab driver's thermos with no cab. The same look card was dealt to two people, so its payoff came twice. "Purse" and "the way a man stands" were said of whoever was there.
  - "Duchess were"; "home at Weisglass’s rooms" said by Weisglass; "with Abramowitz" right after "to meet Abramowitz"; "Then at eleven I came off shift at eleven"; two "So …" thoughts in a row.
  - Putting any line from the same answer landed (Tillman's own eleven o'clock, against Hargrove's home, because Tillman's remark was in the same evening). Now a line has to touch the claim. The picker's short list held only the breaker; it now holds everything at that hour.
  - A face on a list ("somebody with a cane") with no cane ever described; then the face named before its owner had been met.
  - A star named a watcher not yet met ("ask Feldman who was there", from the office).
  - "On the latch", "the wireless", "didn’t miss a beat", "the call was gone" (a call as the game's cost), and a prop clock at a murder scene, where clocks are evidence.
- **Open.**
  - People come to the door "in stocking feet" twice on one page (seed 1, Hard-boiled: Corrigan and Petrosino). The home doing cards need more spread, or a rule against two of a kind on a page.
  - Props are said "at {place}" in the sentence right after the arrival names the place ("A brass spittoon stood at the foot of the bar at the Velvet Room").
  - The office's lines come as three quotations in a row on lost-thing nights (what's gone, the party, the way in). It reads as one speech, but long.
  - The card room and the print shop are "unwatched" when nobody refuses there, yet the arrival can mention the night shift's presses and the man who runs the game ("Nobody was paid to notice, so nobody did").
  - A small case's culprit cracks on the first put, so a player who catches the lie has the confession (docs/43 Built).

## Board connective tissue (docs/44), 2026-10-09
Branch `board-connective`. Found reading four board nights in full (`npm run read -- --engine board`: Medium 1 lost pet beside the golden, Raw 2 murder, Poached 3 lost item, Hard-boiled 1 murder), and at 375 px in the book.

- **Fixed here.**
  - A hand-off said "That pointed me at Abramowitz" on a page where nothing had. "That …" frames now come only when the page itself pointed.
  - The arrival's why was said again, word for word, on the next page. Now the next page says only who I'd come for.
  - The hand-off ran into the page's closing joke ("…he was at the Automat. One hand came unfolded…"). They are separate paragraphs now.
  - A reaction landed after the answer it was reacting to. The reaction comes before the job on every sheet.
  - "Mrs. Rafferty had her Rafferty’s at seven"; "Mrs. Nagy’s rooms on East Fourth Street was quiet"; "The Delmonico rooms was twenty minutes"; "uptown of the office".
  - "A reason isn’t a hand on the bottle" for a revolver.
  - "So far only Bledsoe’s" when a face on a list might be hers. The own-word lines now claim nothing.
  - A club's doorkeeper staged "wiping a glass that was already dry". A watcher's staging now follows the job.
  - A handover thought and the recap named the thing under the coat before anything said whose it was.
  - "The landlady at Mrs. Nagy’s would know who’d been in to hear it" at a murder: the frame belonged to the told-the-room case.
  - From 4b's open list: a prop said "at {place}" right after the arrival named the place.
- **Open.**
  - People still come to the door "in stocking feet" more than once a night (4b's item).
  - "Thin and a little bent at the shoulders from the machine" for a milliner: the seamstress look card is the milliner's archetype.
  - The Bijou's ticket seller is described standing at the back with a torch, like an usher. The job key groups ushers and ticket sellers.
  - A search page is still short (about 140 words), and so is a Raw list. See docs/44.
- **Round two, from the coordinator's read of the golden's night (fixed).**
  - Names said four and five times a page ("Ashby" ×5 on page 6, "Prentiss" all over pages 1–3). Now twice at most, with the rest as pronouns or roles where that's clear.
  - "Corrigan on Stuyvesant Street at eleven, going fast, no hat" said three times running. The thought now points at the street, and the next page opens "So, Corrigan."
  - "Mrs. Cheatham, at the Delmonico rooms, minds Duchess when I’m out." stood with no lead-in. Every office quote now has one, and the aside runs as talk with a beat.
  - Found on the reread: Mrs. Cheatham "opened the door the width of a face" a page after she'd opened the door. A person met on the way in isn't staged at the door again.
