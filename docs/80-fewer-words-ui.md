# Fewer words: the book's own

*2026-10-29, branch `text-ui`, off main at `c99e5d1` (closing, #124, docs/78). The designer: "the voicing, look, and feel are much better than they were, though GLOBALLY there's too much text and claudisms. It really needs a run to remove all superfluous text everywhere." Two halves at once: this one is everything the book says about the night (the head, the choices, the notebook's frame, the report, the verdict, the curtain, the title page, the rules and the CLI's wrapping); the night's prose is docs/81's. A cut, not a rewrite: a rule is said once, where it's first needed, and what the page already shows isn't said again under it. No fact went.*

## 1. What went

| where | was | now |
|---|---|---|
| **The running head**, every page | "Nine actions left. The DA charges somebody at eight." | "Nine actions left." Who waits at eight is said on the first page and again with one action or none left (`clock.ts` `headLeft`; the CLI's head too). |
| **"Close the case"**, every page and the notebook | the bar, "ends the night", and under it "It opens the report first. That costs nothing, and you can come back until you close it." | all three on the first page, as the key is; after it the bar says its name. (The CLI likewise; its aria-label still says "ends the night".) |
| **The pager**, every page | "page 9 of 9" | said only on a page turned back to, where it tells you something. |
| **His papers**, once searched | "His papers ✓ — who had what against him" | "His papers ✓": the note says why to search them, until you have. |
| **The confront box** | its note (how to pick, the cost, that the report doesn't need it, what they may say back) at both steps, every time | the whole note the first time a night confronts anybody, on the hour's step; after that "Pick the hour that doesn’t match, then who says otherwise."; the line's step says only a last action ("This is your last action: if he names somebody, you won’t be able to ask them.", shorter). |
| **The fastest solve vs the confront box** (the closing tester's catch) | "It doesn’t confront Tillman. Confronting her caught her in the lie", against the box's "isn’t needed to prove she lied" | "It doesn’t confront Tillman: what I’d been told already showed she was lying." (and, where it got something, "Confronting her got her to own up." / "…got another story out of her."). Both say the same now. "It can’t be done in fewer." after "the fastest solve takes 12" went. |
| **The notebook** | "Hauck’s evening: Hauck says he was at Moe’s at seven o’clock, with Grasso…", "Who Schilling saw: Schilling: at seven o’clock, only…" | under their own headings the lines start after the name: "At Moe’s at seven o’clock, with Grasso and Dandridge.", "At seven o’clock, only Hauck, Grasso and Dandridge were at Moe’s." The picker and the grid's cells still quote them whole. |
| | "Where things stand" opened with "Hauck, Petrosino, Ellery and Grasso had each told me their evening. Schilling and Marchetti had told me who came and went." | gone from the book's notebook: the grid's rows and "What I was told" under it say whose. (The CLI's notebook is `text.ts`, docs/81's; it still says it.) |
| | "What my client said" began "Lindemann, the client, is Isaiah Dandridge’s sister." | gone: "People and places" says it ("my client, Dandridge’s sister"). |
| | a place's reason said its name again: "Moe’s — Dandridge had been at Moe’s earlier." | "Moe’s — Dandridge had been there earlier." (`choices.ts` `placeWhy`; the Go-to notes too.) |
| | "Why “no”: Corrigan was never at Kessler’s surgery while it was there." (the blind tester read it twice: what "it"?) | "…while the chloral was there", "…too late for the revolver" on a murder. |
| **The verdict** | "Gold star: a perfect report, with no hints." | "A gold star." The score and the tally above it say perfect and the hints. |
| **"What really happened"** | "Ellery did it. The reason was an old one: Dandridge jilted his sister…" | "Ellery did it, because Dandridge jilted his sister…" |
| | a lost thing's "heard about the key under the mat, which Vogel told the room at the Velvet Room about" (docs/56's open bug) | "heard Vogel tell the room about the key under the mat"; a spare key's "…at the Delmonico rooms" at the Delmonico rooms said once. |
| **The curtain** | each step's reason ended in the ask its label had just said: "Ask Hauck: where were you tonight? Hauck found him: ask Hauck where he was." | "Ask Hauck: where were you tonight? Hauck found him." An ask that says more ("ask Pickering who she passed on the way") stays. |
| | "You confronted her, but nothing you put to her broke what she said about ten, so she stood by it; with something that did, she would have told another story." | "…broke what she said about ten; if it had, she would have told another story." |
| **The title page** | "New? The first night teaches you as you go. How it plays"; the picker's "Case number (any number; the same number gives the same night)" | "How it plays"; "Case number". |
| **"How it plays"** (the drawer, and the CLI's `help`) | the rules, then the teach page's eight lines under them, the five answers and the Hint button said twice | the eight lines, then only what they don't say: the night's choices and its end, the notebook and grid, a point an answer, the second story, a poisoning's when, a lost thing's where, the stars (`teach.ts`). |
| **The CLI** (`play-lib.ts`, docs/37) | `do <person>`, the picker and an hour in it reprinted the whole page above what opened (558 words a night) | what opened, alone; `look` prints the page. ("Close the case" writes the report's own page, so it prints it.) |
| | the title's "Medium. Ask anybody where they were and you get the whole evening; ask a barman… Murders, lost pets and lost things." over the teach page that says the same; "(Shown on a first night. `new --no-teach` leaves it out.)" | the name and its line; the teach page. |
| | "Hints: 1 left (`hint`)." under every page; "Free:" over "Review my notes — free" | the count on the first page, from `hint` and on the form; the free row under no heading. |
| | "Not ready? `do back` puts the report away and goes back to the case. It costs nothing."; "Closing the case is final. Leave anything out if you’re not sure: it goes in as “I don’t know”." | "Not ready? `do back` goes back to the case, free."; "Closing the case is final. Anything you leave out goes in as “I don’t know”." |

Added, because the blind tester (§4) needed it: the CLI's first-page key says "Picking somebody is free: it shows what you can ask them". And the site has an icon (`public/favicon.svg`: the plaque's setback mark in the lamp's #f3e5c8 on #101012, three bars on a 16-pixel grid), so a page load no longer asks for a `/favicon.ico` that isn't there.

## 2. The numbers

The 36 nights the claudisms lint reads (`scripts/claudisms.ts`), along the oracle's route. **The book** is what the page shows at 1280, read off the page with a browser, region by region: the head, the choices (with nobody picked), the picked person's questions and the confront box where the next step needs them, the pager, once a night the notebook at the night's end, the report, the confirm, the verdict, the story and the curtain. **The CLI** is everything `npm run play` prints a blind tester who plays the route a command at a time (`help` once, `new`, every `do`, `notebook` and `grid` once, `report`, `close`, `story`, `curtain`). Words a night, mean; "the page" is the night's prose, docs/81's, measured here only to set the rest against (the same in both columns: that half's work isn't in this branch).

| the book | before | after | | the CLI | before | after | |
|---|---|---|---|---|---|---|---|
| the head | 166 | 103 | −38% | the title | 50 | 16 | −68% |
| the choices | 642 | 433 | −33% | the teach page | 146 | 136 | −7% |
| the pager | 90 | 45 | −50% | `help` | 331 | 370 | +12% |
| somebody's questions | 46 | 46 | | the heads | 241 | 101 | −58% |
| the confront box | 28 | 19 | −34% | the choices | 755 | 535 | −29% |
| the notebook | 716 | 621 | −13% | the notes under them | 62 | 45 | −28% |
| the report | 112 | 112 | | the page printed again | 558 | 0 | −100% |
| the confirm | 40 | 40 | | the questions, the picker | 114 | 104 | −9% |
| the verdict | 115 | 110 | −4% | the notebook and grid | 946 | 947 | |
| the story | 119 | 110 | −8% | the report | 341 | 319 | −6% |
| the curtain | 361 | 333 | −8% | the verdict | 128 | 117 | −9% |
| | | | | the story | 116 | 107 | −8% |
| | | | | the curtain | 338 | 310 | −8% |
| **the book's own words** | **2,437** | **1,973** | **−19%** | **the CLI's own words** | **4,126** | **3,108** | **−25%** |
| with the page | 3,770 | 3,305 | −12% | with the page | 5,488 | 4,470 | −19% |

By tier, the book's own words: Raw −16%, Coddled −16%, Poached −20%, Soft-boiled −20%, Medium −21%, Hard-boiled −20%; the CLI's −22%, −21%, −29%, −25%, −25%, −24%. Once a night: the title page 51 → 33 words, the case picker 33 → 24, "How it plays" 298 → 245; the teach page is as it was (137).

The chrome a page carries (the head, the choices and the pager) is down 35% in the book; what's left of "the book's own words" is mostly the notebook's testimony, the report's answers and the curtain's truth, which are the facts. `help` grew because it now prints the teach page's eight lines, so it is complete on its own; with them it says each rule once (§3).

**Stock sentences** (the book's own words, names and hours masked, on more than a third of the nights): read 91 times a night, 587 words, before; 67 times, 402 words, after. The top two before were "It opens the report first." and "That costs nothing, and you can come back until you close it.", 12.3 times a night each; now once. "The DA charges somebody at eight." / "… wants an answer at eight.": 407 times over the 36 nights → 42. "ends the night": 443 → 36. "Gold star: a perfect report, with no hints." and "It can’t be done in fewer." went from the top twenty. What's left there is the frame read once or twice a night: the questions' "Where were you tonight?", the report's five questions, "WHAT I WAS TOLD", "Back to the case", "5 out of 5.".

| top 20 before (nights, a night) | top 20 after |
|---|---|
| 36, 12.3: It opens the report first. | 36, 3.6: nothing left to ask |
| 36, 12.3: That costs nothing, and you can come back until you close it. | 36, 3.0: WHAT I WAS TOLD |
| 36, 3.6: nothing left to ask | 36, 2.8: Where were you tonight? |
| 36, 3.0: WHAT I WAS TOLD | 36, 2.6: Ask X: where were you tonight? (the curtain's steps) |
| 36, 2.8: Where were you tonight? | 36, 2.0: Who was here tonight? |
| 36, 2.6: Ask X: where were you tonight? | 36, 2.0: WHO CAUGHT THEM OUT? |
| 36, 2.0: Who was here tonight? | 36, 2.0: WHEN DID SHE GO? |
| 36, 2.0: WHO CAUGHT THEM OUT? | 36, 1.0: It opens the report first. |
| 36, 2.0: WHEN DID SHE GO? | 36, 1.0: That costs nothing, and you can come back until you close it. |
| 36, 1.0: Everything you do takes one action unless it says free. | 36, 1.0: Everything you do takes one action unless it says free. |
| 36, 1.0: CASE № N · TIER | 36, 1.0: CASE № N · TIER |
| 36, 1.0: How to read the grid | 36, 1.0: How to read the grid |
| 36, 1.0: DETECTIVE’S REPORT CASE № N · TIER | 36, 1.0: DETECTIVE’S REPORT CASE № N · TIER |
| 36, 1.0: Back to the case | 36, 1.0: Back to the case |
| 36, 1.0: Once it’s closed, it stays closed. | 36, 1.0: Once it’s closed, it stays closed. |
| 36, 1.0: 5 out of 5. | 36, 1.0: 5 out of 5. |
| 36, 1.0: Gold star: a perfect report, with no hints. | 36, 1.0: LOOK BEHIND THE CURTAIN |
| 36, 1.0: LOOK BEHIND THE CURTAIN | 36, 1.0: It took me 12 actions, and the fastest solve takes 12. |
| 36, 1.0: It took me 12 actions, and the fastest solve takes 12. | 36, 1.0: WHERE THEY REALLY WERE |
| 36, 1.0: It can’t be done in fewer. | 36, 1.0: Tap a cell for what was said and when it came out. |

**Claudisms** (`scripts/claudisms.ts`): nothing rose. Its patterns are nearly all the narration's (docs/81's half); on this half's surfaces A16 ("worth") 1 → 0 and B06 ("star", "deck" as the builders say them) 13 → 11 in the book's own strings; B23 ("free to look" on the Confront button) is as it was, 0.94 a night (§3). `--gates` holds.

## 3. Left as it was, for the designer

- **"free to look; an action if you go ahead"** on the Confront button (`text.ts` `PICKER_COST`, the lint's B23). Round 7's testers chose it over "free to open"; nothing shorter says both halves.
- **"Searched · free to reread"**: two tags on a done choice. "free" alone read as a refund in round 6.
- **The teach page's eight lines** are as they were; four are pinned word for word by the closing work and round 9. The blind tester read "Who caught them out is the person who told you what shows the one who did it was lying." twice.
- **`help` and `new` both print the eight lines.** `help` has to be complete for a tester who reads it first; `new` shows them as the book's first night does. A CLI tester who runs both reads them twice; the blind tester said so.
- **Who caught them out lists only whom you asked** (docs/78 left it for the designer): the blind tester never asked the man who had passed the culprit in the street, didn't know the list was only the people asked, and guessed.
- **For docs/81's half** (their files): the CLI notebook's "Where things stand" still opens with whose evenings you have (`text.ts`); on Poached 153 the notebook says "Vogel’s late husband’s gold watch" of a widower whose page said "my late father’s" (`officeLines`); "the Velvet Room — Vogel told the room there" (the generator's pointer, "X told the room at P"); a small case's charge reads "The reason: Owes Lou the bookmaker forty dollars…" (the option's capital, `motives.ts`); the turn's "— Where things stood —" recap repeated two things the tester knew.
- **Files outside the list**: `hinge-lint.ts` reads the curtain's steps, so its "hint" rule now reads a reason without the ask ("…at eight." where it read "…at eight: ask Dandridge where he was."); `test/curtain.test.ts`'s hash changed on purpose (`246 d668041b76bbc7a2`), the steps and the missed confrontation only.

## 4. Checks

- The deal didn't move: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a` (docs/71's script). Nothing in `src/gen/` or `content/` changed.
- The suite, three workers: 1,107 passed, 3 todo. `npx tsc --noEmit`, `npm run build`: clean. `scripts/board-prose.ts`: every lint 0 at every tier. `scripts/claudisms.ts --gates`: hold.
- `test/fewer-words.test.ts` (new): the head's two forms; the close note on the first page only; the CLI's steps without the page; the hints' count; the picker's note once a night; no fastest solve over seeds 1–20 at Poached and Medium says a confrontation caught anybody in the lie; the rules and the teach lines say nothing twice, and the help says each once; no curtain step repeats its ask; the story's place said once and its reason said plainly. Pinned lines updated to the shorter ones: book-look, clarity5b, closing, curtain, hinge, hints, round5, round7, round9.
- Read whole, page by page, before and after, in the book and the CLI: Poached 153 (a lost thing), Medium 141 (a murder), Hard-boiled 148 (a murder).
- Stills at 1280 and 375 of the title page, the drawer, the first and second pages' choices, the confront box at both steps, the notebook, a page turned back, the verdict, the story and the curtain: no sideways scroll, no console errors. The icon at 16 and 32 pixels.
- **One blind playtester**, the CLI, Medium 45 (a murder, two liars), knowing only the help: named the right culprit, the hour, the means and the reason by elimination, 4 out of 5 in all 14 actions. It guessed who caught her out, because it never asked the man who had passed her in the street (§3). It found nothing it needed missing but one: whether picking somebody costs an action (the person's row has no "free"), now said in the key. It knew the actions left and the deadline all night. The questions and picker screens "stood alone" without the page above. What still felt repeated: `help` and `new`'s eight lines (§3), "Free: / Review my notes — free" (now one "free"), the turn's recap (docs/81's), and the fastest solve's count in both `story` and `curtain`.
