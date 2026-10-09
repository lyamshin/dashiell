# Build: connective tissue on the board

*2026-10-09, branch `board-connective`. The target is `docs/golden/board-connective.md`: the board's seed 1 Medium lost-pet night, rewritten page for page at golden length, with the beats that join one fact to the next. Its beat table and its "What the engine needs" section are the spec.*

## What was built

### 1. Page sheets for the board (`src/game/board/sheets.ts`)

M13's sheets (docs/32), on the small board. A sheet is the order a page's beats come in, and which of them share a paragraph. The beats are the golden's: **why here, the walk, arrival, staging, the ask, reaction, the job, the thought, close, hand-off**.

- One or more sheets per job: the office, arrival (three), account (three), the admission check, list (two), search, put it to, the motive, the turn, the report, and the free pages (a question read back, going over what I have, back to the office).
- Each writer in `pages.ts` now fills beats (`put(w, beat, text)`) instead of pushing paragraphs, and `lay()` lays them out on one of the job's sheets, drawn by the page's hand. A beat with nothing in it is skipped.
- Each page records its sheet, the beats it filled, its thought and the held lines that thought cites (`Page.board.sheet`, `beats`, `thought`), for the measure and the tests.
- Changed from the golden's table: the hand-off always comes before the close, as on the golden's own pages 3 and 11, so the page ends on its joke. The reaction always comes before the answer.

### 2. Cards for the new slots

584 cards in `content/board/connective.json` (530) and `content/board/still.json` (54). I wrote each family's first cards and the brief. One helper wrote the volume (455 cards). I read all of it, cut eight cards, rewrote eight, and wrote the `still`, `search-watch` and `put-stage` families myself.

| family | cards | what it is |
|---|---|---|
| `why` | 90 | frames for the thread: by job (account, check, list, search, papers, put, motive, arrive), the scene, nobody pointed (`presence`), and "the one I'd come for" when the arrival has just said why (`again`) |
| `walk-frame`, `walk` | 20, 47 | the distance, and a line of the street by weather and hour band. Half the street lines export a role that a later walk calls back to (the cat on the step) |
| `staging`, `still`, `put-stage` | 65, 32, 10 | where I sit and how I open, by place kind, person or watcher, and manner. `still` is where somebody met earlier is now ("Corrigan was reading the programme for the third time, in case the cast had changed") |
| `ask` | 38 | in the detective's words, by job, with a slot for the reason said to their face ("Coffin has you here at nine.") |
| `reaction` | 45 | by job and manner only, so liars and the truthful draw from one pool (tested). The motive and search pages get one too (`search-watch`: the client at the scene) |
| `handoff` | 36 | what next, by the first star's kind |
| `office-ask`, `office-chair`, `aside` | 20, 7, 8 | the detective's questions between the client's lines, the chair, and the client's aside |
| `coat-q`, `coat-a` | 5, 10 | "What was under the coat?" / "Something that moved." |
| closes | 50 arrive, 10 search, 10 turn, 23 account/list/motive, 47 report | the page's last line, when nothing is called back |

Rules the cards keep: no facts, no hour words, no names except through slots, curly quotes, plain terms. Theatre cards fit a picture house and a stage alike. New families are dealt without widening past their tags, so a bar's staging never lands in a club's doorway.

### 3. The thought, from the engine (`src/game/board/thought.ts`)

After each job, one to three plain sentences that tie the new fact to facts held before it, by name. In order of weight:

- **a lie caught:** their line and the line that breaks it, side by side;
- **an agreement:** "So here at eleven, with Feeney, which was what Coffin had";
- **a list that agrees with an account** held before;
- **the window narrowed:** "The office had given me ten or eleven. At ten Duchess was here. So it went at eleven o’clock";
- **the scene's street:** "Corrigan on Stuyvesant Street at eleven, going fast, no hat. Stuyvesant Street was where Prentiss kept Duchess";
- **who had the way in,** by name and hour: "Feeney and Corrigan heard about the key at eight, and Abramowitz at nine. Ashby never heard Prentiss tell the room";
- **placements at the hours that matter,** whose word is under them;
- **the handover,** said no further than it's held: "And whatever went out of the Prentiss flat, something under a coat had come in here at twelve and gone to Pardo." The recap says the same; it names the thing only after a crack says whose it was;
- **who's left,** when one rival is left and the clock is still open (Medium and below);
- **the elimination,** on the page that settles who, at Medium and below: every rival placed by somebody else's word or without the way in, then "That left one person who had heard about the key, with no true account for eleven, and who’d been seen on Stuyvesant Street at eleven." At Hard-boiled it stops before the last sentence (tested);
- **the hours that matter,** when nothing else touched: what this person, or this watcher, says for them.

Search, put and motive pages add their own: where the means came from against the office's window; an admission "only as good as whoever’s in it with you"; a refusal "isn’t an answer, and it isn’t a confession either"; a second story and who would know; a reason against what the office said.

### 4. The walk and the thread

- **The walk** (`walk.ts`). The streets are real, in their real order, so the places sit on a small map of the Lower East Side. Distances are minutes on foot, in fives, the same both ways (tested). "Where it matters", the walk between the scene and where the way in was had, says so once ("which I wrote down, because the night was going to be about who could walk where in an hour").
- **The thread** (`thread.ts`). Each page opens on the pointer that sent the detective there, which is the same source the star shows (`sourceOf`, the latest held line that points at the question, or the office), said in the voice: "Coffin’s list had Ashby here at eleven." An arrival joins up to two of them, as the golden's Delmonico rooms do: "Abramowitz had said Mrs. Cheatham was with him here at eight. Ashby had said Mrs. Cheatham was with him here at ten." Two pointers from one list run together.
- **Not said twice.** The page straight after an arrival, or any page whose pointer was already said tonight, says only "Mrs. Cheatham was the one I’d come for."
- **The reason to their face.** It's said only when it can't tip anybody off: a list or a companion that has them somewhere at an hour outside the office's window ("Coffin has you at the Thalia at nine. Now tell me the rest of it"). That depends only on what's held and on the office, never on who lies.
- **The hand-off** is the page's first star, said in the voice ("The house manager at the Thalia would have seen everybody who came in"). With no star, as at Hard-boiled after the first two steps, there's no hand-off. "That made …" frames are dealt only when this page is what pointed. The turn has its own what-next: "I could put it to Corrigan now. Or I could find out first what Abramowitz had to say for himself."

### 5. The motive on the path

A small case's report asks why, and nothing on the path used to say it. In `generate.ts`, the office now ends with the client's aside, giving the reason of **every suspect the pointer line didn't**: "Then, smaller: “Feeney has wanted Duchess since the day I brought her home. Ashby is three weeks behind on the rent… Corrigan lost her job on Friday, and asked me what Duchess was worth. Abramowitz and I haven’t spoken since the business over the coal bill.”"

- The golden named only the culprit. That would be a tell from the second night on, so everybody gets one.
- The aside adds no pointer, so the path, par and the stars don't move.
- A murder's report already gets its why from the papers on the path.

### 6. The office

One quoted line a paragraph. Between them come the detective's own questions ("When did this happen, as near as you can say?", "Who’d want her badly enough to take her?") and the chair, unless the entrance card already pointed at it.

### 7. Generator nits

- **No two people share a first name.** A repeat is drawn again from its own community's names, on a stream of its own, so nothing else in the case moves. Tested over every tier and type.
- **A stage has plays and shows.** The Thalia is marked `stage`, "to see the new picture" becomes "to see the new play" there, and no card mentioning pictures or a screen is dealt at a stage.
- **A standing fact is said once:** "Mr. Prentiss telling the room about his key", then "Mr. Prentiss, still telling it". In the thoughts, "Lou the bookmaker in his back booth" is Lou.
- **"Stayed till ten … at ten went up to" is gone.** A run now says its own last hour: "At eight I went to the Automat for a plate of beans, and stayed through nine." Tested.
- From docs/25's 4b list: a prop no longer says "at the Thalia" right after the arrival has named the Thalia.

## Measures

### Prose: `npx tsx scripts/board-prose.ts`

30 nights a tier, mixed types, along the oracle's route, with the lint over the oracle's and the wanderer's nights. The table shows before → after. Before is main at `ed33298`, measured with the same script.

| tier | words a page, median [p10–p90] | why-here or walk | job pages whose thought names an earlier fact | callbacks | lint, correspondence, plain terms | cards twice, sentences twice |
|---|---|---|---|---|---|---|
| Raw | 105 [6–221] → **193** [55–305] | 0% → **100%** | 62% → **100%** | 48% → **70%** | 0, 0, 0 → 0, 0, 0 | — , 0 → 0, 0 |
| Coddled | 104 [6–229] → **180** [56–323] | 0% → 100% | 55% → 100% | 49% → 71% | 0 → 0 | — , 0 → 0, 0 |
| Poached | 97 [54–223] → **175** [119–310] | 0% → 100% | 52% → 100% | 56% → 73% | 0 → 0 | — , 0 → 0, 0 |
| Soft-boiled | 101 [67–236] → **182** [117–326] | 0% → 100% | 58% → 100% | 54% → 72% | 0 → 0 | — , 0 → 0, 0 |
| Medium | 104 [66–223] → **188** [116–315] | 0% → 100% | 58% → 100% | 56% → 73% | 0 → 0 | — , 0 → 0, 0 |
| Hard-boiled | 108 [69–235] → **182** [109–321] | 0% → 100% | 66% → 100% | 50% → 71% | 0 → 0 | — , 0 → 0, 0 |

- **Before:** the old engine records no beats, so why-here or walk is 0%. Its thought share counts any thought paragraph that names something from an earlier page; the old engine had no cited lines to check. "Cards twice" wasn't counted before.
- **Words, by job** (Medium): office 315, account 212, arrival 187, list 190, confront 189, search 136, report 47.
- **On the golden's own night,** the pages run 315, 173, 138, 264, 245, 263, 351, 172, 201, 189, 133, 156, 226, 46 words. The golden's run 312, 189, 156, 228, 208, 241, 292, 154, 192, 171, 157, 153, 204, 111. Both medians are about 190–195.
- **The median misses the 200 floor by 7–25 words at every tier.** The short pages are the search (about 140), the list at Raw and Hard-boiled (about 150–170), and the report page (47, where the form is taken out). See what's open.

### The puzzle: `npx tsx scripts/board-measure.ts --seeds 50`

Unchanged from main on every puzzle column, at every tier and type:

- the oracle solves 100%, all at par;
- the refusal shortcut is under par in 19 Raw murders, 19 Coddled murders and 3 Medium murders, as before;
- the confession route is the same, and so is the wanderer (0–34%, the same numbers);
- lint and plain terms are 0.

Callback pages (this script's count, which leaves out the office and the report): 51–63% before, **62–75%** after.

## Read in full

- `npm run read -- --engine board --seed 1 --tier 4 --type lost-pet` (the golden's night). Read side by side with the golden, it has the same shape. The thread and the walk are on every page; the Stuyvesant Street link, the access by hour, the collision, the admission and its check, the hour from Mrs. Cheatham and the walked elimination all land. Fixed while reading:
  - "That pointed me at Abramowitz" when nothing on that page had;
  - the arrival's why said again on the next page;
  - the hand-off run into the page's joke;
  - "Mrs. Rafferty had her Rafferty’s";
  - the two-sentence "All of that pointed here" card on a one-pointer page.
- `… --seed 2 --tier 0 --type murder` (Raw). Clean and quick, the elimination named nobody, as wanted. Fixed: "Mrs. Nagy’s rooms … was quiet".
- `… --seed 3 --tier 2 --type lost-item` (Poached). Two Mrs. Tramonti pointers now run together, and a doorkeeper is no longer staged "wiping a glass".
- `… --seed 1 --tier 5 --type murder` (Hard-boiled). The face, the walk to Hanrahan's flat and the turn on page 13. The last step is left to the player. Fixed: "a hand on the bottle" for a revolver, and "so far only Bledsoe's" when a face on a list might be hers.

The browser, at 375 px, with `?engine=board&seed=1&t=4&type=lost-pet`: the office (1,777 px of prose) and Coffin's list scroll inside the page. There's no sideways scroll, and the choices sit below the prose.

## What's open

- **Words a page:** median 175–193, against 200–300. The golden's own night is about 190 by the same count. More would come from a richer search page (the golden's page 3 is 156 words, too) and lists at Raw.
- **The aside names every suspect's reason.** That's at least two and up to four in the office. It's a long speech at Hard-boiled (five suspects), but it's honest: nobody is singled out.
- **Reaction cards are a judgement call.** They're drawn by manner alone, but "looked at me for a while first" reads as nerves to some ears. The pool is shared, so it can't be a tell, but it may feel like one.
- **Distances are a sketch.** The map of streets is real; the minutes are a walk's, while the clock moves a call's worth (about 35 minutes).
- **Callbacks:** 70–73% here (62–75% by board-measure's count), from places, people, the office's prop and now the street. They're not rolled per page. They land whenever there's a role, so the share follows how often roles exist.
- **The rules problems in docs/43** (the Raw and Coddled refusal shortcut, the crack in small cases) are untouched, as they need generator decisions.
- **No blind playtest,** as instructed.
