# Clarity, build 4

*2026-10-25, branch `clarity-4`, off main at `ffc35e7` (clarity-3), with main merged at `7d9033c` (puzzle-fixes, #103). Round 6's blind testers (four nights on clarity-3, `scratchpad/round6-digest.md`, reports `scratchpad/r6-*.md`) solved every night by deduction and agreed on one thing: the scenery, the reactions and the jokes work, and the joining text doesn't: the "So…" lines, the pointer lines, the confront screen, the labels and the People list. This build fixes every item of the digest's prose list (P1–P12) and interface list (U1–U6), and the seed's (`scratchpad/clarity4-seed.md`), by rule, in the layer that makes each line, never for one night, as docs/60 and docs/62 did. The puzzle stays where it was: nothing in `src/gen/`, `knowledge.ts`, `stars.ts` or the grid's clash logic changed (the grid's labels, key and codes are this build's). Each new rule has a lint (`hinge-lint.ts`, thirteen new rules beside docs/62's nineteen) and a test (`test/hinge.test.ts`: the line it catches, and the line this build says instead). Lean only, like docs/60 and docs/62.*

## 1. What was built, and where

### 1.1 The new hinge rules (`hinge-lint.ts`)

Each is a kind of line round 6 stopped on, read over a whole night as a player reads it, target 0, in `proseIssues` (rule `hinge`), `board-prose`'s hinge column and table, and `test/hinge.test.ts`.

| rule | item | catches |
|---|---|---|
| unsettled | P1 | at the link and the walk (Raw to Medium), the dead or the pet seen at one of the client's two hours, and no thought after it that says the hour it leaves |
| hedge | P1 | "when it could have happened" at the link once a thought has said the hour; at Hard-boiled, the window said again after a sighting on the same page, and the window's reason ("when it could have happened", "when Carbone could have been given the chloral") more than once a night |
| restated | P3 | a way in that says where somebody in the room had been seen or said they'd been (the notebook a third time) |
| find | P3 | "I'd find X at Y" more than once a night |
| presumes | P3 | "I wanted to know who Pickering had passed" (that she had); an agreement's "…did see him at…, though." against nothing |
| newcomer | P4 | "come back in" (from where?); "the woman Alfano had named" on the page Alfano named her; somebody placed in the room after the thought |
| office | P5 | "Ask about Elsa Steinbach" (a menu's verb); "was found… The body was found by"; "behind on the rent" (whose?) |
| alone | P6 | one evening that says alone two ways ("by myself", "alone", "on my own"); "After that" twice in an answer; "After that, at nine, I left the meeting" |
| walk | P7 | "a fair few"; one distance three times a night |
| log | P9 | "I noted that"; "Before Dandridge was given the laudanum, somebody had been at…"; "would check out where … hadn't"; "had been at it" |
| papers | P10 | the papers' page saying "papers" or "grudge" more than twice, or the dead by their role more than three times |
| staging | P8 | "a late supper" after four in the morning; "The DA's man was on the stairs"; "the whole point of the place" at a picture house; a watcher "on her stairs" where the page had her somewhere else |
| retired | P12 | "nobody left out because…", "take it untidy", "kept my hand off the rail", "Ask me where I was at ten again in the morning" |

### 1.2 The hour, by docs/46's level (P1)

- **At the link (Coddled to Medium) the thought says the hour once the page's facts settle it** (`thought.ts`, a part of its own, `rule: 'narrows'`, the WINDOW-ALIVE `narrows link` voicings): "At nine, Fritz was still at the Delmonico rooms, and Hauck had said nine or ten. So Fritz was taken at ten." The hour is a link and everybody's; never who, never "cleared", "that left" or a name beside a verdict (`levelIssues` holds at 0). It's a sentence of its own: the composition and the rhythm don't join it to the next fact (`compose.ts` `sideBySide`, `rhythm.ts` `mendable`), and it moves to the front with the sighting it follows from.
- **After that, the link says what happened at the hour** (`thought.ts` `reasonFor`): "So Marchetti and Pickering were at the chop house at ten, when Fritz went", never "when it could have happened" of an hour that's settled. On the page whose own sighting settles it, a list's consequence is at the hour it leaves, never the two hours again.
- **The turn says it too, at the link** (`pages.ts` `recapClausesMarked`, the `when` clause): "Hauck had given me nine or ten, and Fritz was still at the Delmonico rooms at nine, so it happened at ten o’clock." Every clause after it is about that hour.
- **At Hard-boiled the thought says the fact** (docs/46's fact level): "Carbone was still alive at the Odessa at nine." and nothing after it: not the client's two hours beside it, and not "So at nine and ten, when it could have happened, …", which read as undoing it. The window's reason is said once a night (`reasonSaidBefore`); after that the hours go bare ("Grasso said she was at the Automat at nine, and nobody had backed it up."), in the `bare` voicings of OWN-WORD and PLACED-SET.
- **The walk (Raw) is as it was**: the elimination walked on the page after the one that settled it.

### 1.3 Pronouns, and the wrong fact (P2)

- **The cause of "Ruggiero had said she was with Hanrahan at seven, and with him at eight."** Two things. The account's pointer named only the person it pointed at, so "with Winslow and Dandridge at eight" became "with Winslow at eight" (wrong: she was with both); and the reference pass made the second of two parallel names, "with Winslow", into "him" (the paragraph before had a man in it). Fixed where each happens: the pointer says the company whole (`thread.ts` `pointerSaid`); the second of two parallel phrases ("with X at seven, and with Y at eight") keeps its name (`refer.ts`, `parallel`); and the arrival no longer says a pointer to somebody in the room at all (§1.4), which is where this one stood.
- **The reference pass** (`refer.ts` `resolves`, `unclaimed`): a pronoun is never somebody's when an answer since named somebody else of that sex ("She had said she was at the Shamrock at nine, and he hadn’t seen her there", the "he" Zeldin's from a paragraph back, after Reinhardt's answer named Winslow and Dandridge); nor when the sentence before gave a pronoun of that sex to somebody else ("I’d find her at Sokol’s back room. She gave me the night…"); nor when the narration's last person of that sex, however far back, was somebody else. The hand-off is about whom it hands off to (`pages.ts` `handOff`, `about`), so its pronouns are theirs and the card about the speaker after it is said by name ("Ellery gave me the night the way a good waiter brings the check"). The office's pet's own pronoun is marked as the pet's ("and now he was gone"), so the client's card after it says "My client sat.", not "He sat."
- **The pronoun check, extended** (`plan/measure.ts` `pronounAntecedents`, inside `pronounAmbiguity` and `pageAmbiguity`): besides two people a pronoun could be, it now catches a pronoun with nobody of its sex to be ("no antecedent"), one across an answer that named somebody else of that sex ("across speech"), the second of two parallel names made a pronoun ("parallel"), and a card about the page's speaker after the narration turned to somebody else ("speaker card"). The office's subject is the client; "he said" after a quotation is its speaker's.

### 1.4 Pointers and the way in (P3)

- **The way in says why the place** (`pages.ts` `writeArrive`): its list, its search, what the office said of it. A pointer to somebody in the room ("Mrs. Kowalski had seen Bellucci and Steinbach at Kowalski’s at eight and nine", "Pickering had said she was with him at eleven") is gone: the ask says it to their face a page on, once. That's also the coordinator's first routed item (Thorndike's arrival).
- **The asking says no pointer of its own** (`whyHere`, lean, an account): what can be said to their face is said there ("Reinhardt saw you at the Odessa at eight"); where it can't, the asking is the reason.
- **A face never names a wrong hour** (`thread.ts`): where the watcher saw them at an hour of the window too, the face says the sighting without its hours ("Ellery saw you here tonight."), never "Ellery saw you here at eleven" when Ellery had her from ten (two rounds running).
- **A remark that puts them somewhere at an hour of the window is why they matter** (`thread.ts`): "Pickering had passed him on Broome Street at ten", ahead of company at an hour outside it.
- **The walk first** (`handOff`): "Pickering had walked over from the Delmonico rooms at ten, and might have passed somebody on the way." (never "I wanted to know who Pickering had passed").
- **"I'd find X at Y" once a night** (the hand-off voicings): "Next was Mrs. Whitfield, at the Delmonico rooms. I didn’t have a word of her evening yet.", "Pickering was at the chop house, and still hadn’t told me where she’d been tonight."
- **An agreement after a story that didn't check out** is said only at an hour that matters (`thought.ts`, `restOutside`): "Hauck did see him at the Hauck flat at eight, though." after the hole at ten contrasted with nothing, and its "though" voicing is retired.

### 1.5 Who's in the room, and when they're met (P4)

- **On the way in, the people the night hasn't named are said as what they are** (`pages.ts` `anonPresence`): "A lodger was in the front room.", "A regular was at the far end of the bar.", "Somebody was in the back booth, keeping to themselves." Each in a spot of the room's own nobody has (`SPOTS`, `spotFor`).
- **They're named when the answer names them** (`placeNewcomers`, now on every page in lean, after the answer and before the thought): "The lodger in the front room was Moretti.", "The regular at the far end of the bar was Lanza. The one in the back booth was Pardo." So Pardo is placed before the confession says he "was sitting across the room". Not where the answer said the spot itself ("Lou the bookmaker was in his back booth all evening").
- **Somebody an owning up names** is in by then, said once: "Ashby was in by then, three rows back." Never "Ashby, the woman Ruggiero had named, had come back in": the naming had just been said, and "back" was from nowhere the reader saw. The introduce pass doesn't gloss them again (`texture.ts`, tag `newcomer:named`).
- **The papers say who somebody is** beside the name, where the night hasn't met them (§1.11).

### 1.6 The office (P5)

- **Whose landlady** (`writeOffice`): "Mrs. Kowalski, who runs the boarding house on Orchard Street, keeps my spare key in the sugar tin on the kitchen shelf at Kowalski’s", never "Mrs. Kowalski, the landlady," with the key "at Kowalski’s", which read as a bar.
- **Whose rent** (`inClientMouth`): "Bellucci, a milliner, is three weeks behind on his rent".
- **No menu's verb** (the gossip pointer's voicings): "“If you want a name, try Elsa Steinbach, an insurance agent,” Mrs. Marchetti said."
- **A moment for the dose** (`when.ts`): "The woman across the hall heard him laughing with somebody when the Fleischmann Hour came on at nine." (not "all through the Fleischmann Hour, which starts at nine"); and Hard-boiled's "The woman across the landing heard him laughing with somebody, and then nothing, but she’d dozed off over the radio and can’t say if it was nine or ten." (not "…and then go quiet at one or the other").
- **The finder, as the finder** (`writeOffice`, the letter pointer): "There was a letter from Grasso, the one who found him, in the desk," (not "I found a letter in the desk, and it was from Carmela Grasso").
- **Found once** (the lean OFFICE `found` voicings): "…was found in his own walk-up over the drugstore on Grand Street at half past eleven, by Ruggiero, a sewing-machine operator who heard his radio still going and knocked."
- **The key under the mat** (OFFICE `means-mat`): "Everybody at his table at eight had heard that he’d leave the key under the mat for his sister. “And I did,” he said."; and the visitor card "My visitor had found fault with the stairs, the room and my lack of a secretary before he sat down." (for "was already diagnosing the room").

### 1.7 Accounts (P6)

- **Alone, one word an evening** (`tell.ts`): "by myself" (or whichever the manner gives) the first time, "on my own again" after, never three words for it in three clauses.
- **"After that" once an answer** (`compose.ts` `sayAll`), and never before a leaving (flag `left`: "Come nine, I left the meeting to get some air…", not "After that, at nine, I left the meeting early").
- **"From the start" says of what**: "in from the start of the evening" (the LIST-HOUR voicings), and "Pickering was with me at first and left after nine."
- **The stranger beside somebody** (`tell.ts`, `phrase.ts` `strangerSaid`): "Grasso and a stranger at the same table were in as long as I was." (not "Grasso and somebody at the same table I didn’t know", the misplaced modifier).

### 1.8 Repeated formulas (P7)

- **The walk's distance said one of a few ways, the least said first** (`writeWalk`), and once each has been said, a walk that doesn't matter says no distance at all ("I walked over to the chop house."); "a fair few" is gone.
- **A bearing on the night's first walk and on the walk that matters**, not every walk (a card that says it, where it's said); and the walk that matters ("near enough to get there and back inside the hour") once a night, where a route goes back and forth between the two.
- **"One thing didn’t fit" is one of four** lead-ins ("Something didn’t add up", "There was a problem with that", "Here was the trouble"), each once before any again (`texture.ts`).
- **The rain in the doorways**: a night tic (`tics.ts`), and the street role's pay-off is a change, not the same picture: "The doorways had emptied out. Whoever had been standing in them had found somewhere better to be, which was more than I had."

### 1.9 Staging against the arrival or the clock (P8)

- A watcher's line on the way in is the job, never a chair or the stairs ("A landlady who sits on her stairs knows who used them" beside "sat in the open door of the front room") (`writeArrive`).
- No "late supper" from four in the morning; "(Eight o’clock. The DA’s man was at the door…)"; "the whole point of the place" not at a picture house either (`theatreAvoid`).
- A card that sits me beside somebody agrees with where the room put them (`seatAvoid`): in a booth or at a table, no stool; at the bar, no booth.
- One simile frame a page, in a voicing too (`sayAll`, with what the page's other beats say): the office's "the way people do" after the arrival's "as if he’d booked it" was two.

### 1.10 Lines that read like a log (P9)

- "I noted that" is gone (ACCESS-SET).
- The origin find: "To give Carbone the chloral, somebody had to go to the Delmonico rooms for it first." or "The laudanum Dandridge was given meant a stop at the Delmonico rooms first." (the WINDOW-MEANS `find first poison lean` voicings), never "Before Dandridge was given the laudanum, somebody had been at the Delmonico rooms for it." (A first try, "The one who gave Dandridge the laudanum…", was the verdict lint's "the one who".)
- "If she told it the same way, it was the Palace and not the Delmonico rooms." (never "would check out where … hadn’t").
- "Alfano, Thorndike and Marchetti had been at the meeting, where everybody heard where the key was; Pickering hadn’t been there." (never "had been at it").
- The long then-line is two sentences: "So Steinbach and Bellucci had been at Kowalski’s at eight and nine, where the spare key was kept, and had left by ten. Rafferty was still in at ten." (the PLACED-SET `then means` voicings).

### 1.11 The papers (P10)

- The pointer to them says neither word: "If anybody had a reason, the desk would say so." (`thread.ts`; "his desk", first, had nobody for the "his" at the top of a page, skim round 3); the search card "I went through {victim}’s desk a drawer at a time" for "People keep their worst habits in their papers, filed under something else" (also the seed's "filed").
- Who they are, beside the name, where the night hasn't met them: "Renfro, a milliner, owed him four hundred dollars. … Winslow, a night-school teacher, had a brother Carbone had testified against." (`papersLine`, lean).
- The dead by their role twice on the page, then by what they were where nobody else that night was ("the dentist"), since a third name goes back to the role in the reference pass.

### 1.12 Witness lines (P12)

"I asked Alfano for everybody she’d seen tonight, in order, friends included."; "I asked Zeldin who’d been in tonight, and told him not to tidy it up for me."; "I caught Grasso at the turn of the stairs and stood a step below, so it wouldn’t look like a fight."; "“Ask me again in the morning where I was at ten,” he said."

### 1.13 The seed

- **A card about a speaker after the hand-off to somebody else** (Medium 14): §1.3.
- **"I went over to Thorndike." to somebody I was already talking to** (`namePut`): "I turned back to Thorndike." where the page before was a word with them in the same room.
- **The report page's lead-in** folds the report away as before; its cards say "read it through once", never "signed" or "folded it… safe from me".
- **Poached 5's turn says "nine" four times**: open (§6).
- **"filed under something else"** (`telling.json`): gone (§1.11).

### 1.14 The chrome (U1–U6, P11)

Built in a fork of this branch (`clarity-4-chrome`, merged at d238cfb):

- **U1, the confront screen** (`choices.ts` `pickerNote`, the help): it says plainly that confronting costs an action whether or not they crack, that it's optional, and that the report takes the proof either way; no bare "it".
- **U2, the labels** (`text.ts`, `play-lib.ts`, `board-book.ts`): "free to open", "free to reread", "nothing left to ask", "`back` takes you back to the page"; a claim as the sentence says it: "She said she was home at the Delmonico rooms at ten".
- **U3, the grid** (`grid.ts`): whole words for its codes ("Delmonico", "Thorndike’s"), never "Delmonic"; the key "“X”✓ they say so, and somebody saw them there"; the client's word counts as a second source, so a guest at the client's party isn't "·" at it. At Hard-boiled only, the coordinator's teach line, a rule about the tool and never a hint about tonight: "When somebody saw only a coat or a hat, mark on the grid who you think it was, and the grid will show who that leaves out." (`grid.ts` `FACE_MARK`, the first page's note, and the book's grid key by the pencil).
- **U4**: a person's question count leaves out Confront.
- **U5, the report** (`report.ts`): the first group stays wide (docs/55 §5) under an honest heading, "What you know about nine and ten:"; "With Pardo", never a person in a place's slot; `report <Name>` shows that person's list; the close command on a line of its own; the key `evidence` (with `whereproof` still read).
- **U6, the People list** (`gloss.ts` `peopleLine`): no posture ("lives on Cannon Street", never "lives at Thorndike’s flat"; no landlady "on a chair at the foot of her stairs"); company by who named them ("Millicent Fairbanks: Alfano named her, and says they were together at Sokol’s back room at ten."); the why form's "promised her the watch", never "them" for one woman.
- **P11, the verdict, story and curtain** (`report.ts`, `night.json`): "4 out of 4: who, when, where and why, with the proof for who and for where."; "I didn’t need to confront Bellucci: the coat Alfano saw go straight to Pardo at eleven told me where the watch went."; "Bellucci, when I confronted him:"; the story says how the lie came out ("Asked, he said he had been at Moe’s at ten. Alfano, the bartender, hadn’t seen him there.") and the handover ("At eleven o’clock he carried it into Moe’s under a coat and handed it to Pardo…"); the curtain quotes the page's words; and nothing says filed, "file itself", "no line to hang it on" or "the true board" ("I closed the case at a quarter to eight…", "A case doesn’t close itself.", "I had a name and nothing to hold it up with."). `test/plain-words.test.ts` covers the verdict whole, the report's answers, the story, the recap, the curtain and every ending card.
- **The coordinator's second routed item, the curtain's fastest-solve steps**, now say the hour that matters, game side, from the star's own reason (`report.ts`, `starReason`): "Alfano was at the meeting, and nobody had said where she was at ten: ask Alfano where she was." No generator change was needed.

## 2. The measures

TBD

## 3. The skim test

TBD

## 4. The nights, read

TBD

## 5. What's open

TBD
