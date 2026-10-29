# The curtain: the solved board, and how it came together

*2026-10-28, branch `curtain`, off main at `42463d4` (lacquer, #116). The verdict page's second door, "Look behind the curtain", was the CLI's curtain text in a `<pre>`: a column table that wrapped into a jumble even at 1280 px, ASCII marks (`*`, `†`, `✓`), hyphen bullets, no hierarchy. The designer said what it's for: "seeing a solved board, ideally with interactions. it's the 'behind the scenes' of how it came together", and chose the look: the true board like the notebook grid the player filled in all night, each lie in its cell. Presentation only: nothing in `src/gen/` changed, nothing dealt or scored moved, and the CLI's `curtain` says what it said, byte for byte.*

Screenshots are in `scratchpad/curtain/shots/`, each at 1280 and 375 (`-1280`, `-375`): HB 39 (`hb39-*`: the whole truth, a mid step, Tillman's ten o'clock open at step 7, your night, the whole truth with a cell open, the report, the lies), and the same views for Raw 33 (a lost thing), Poached 3 (a lost thing nobody else lied on), Poached 6 (the first liar's night, a half), Medium 37 (a wrong pick) and Medium 2 (a lost pet).

## 1. What was built

Inside the same disclosure (`disclosure('ending-curtain', …)`, built when it first opens), top to bottom:

### The solved board

- **The notebook grid's table** (`.bgrid`, its cells, its key, its open cell under the row), as `.bgrid--curtain`. The notebook's own cell rules carry `.bgrid-said` beside theirs, so the two can't drift apart. Rows as the CLI orders them: the suspects, the company, and on a murder the dead man (†). Columns: the hours, labelled as the notebook labels its places (`placeCodes`, and the places key where a label isn't the place's name). No means column. Four hours fit 375 px with nothing cut and no sideways scroll.
- **Who did it:** "did it" in the frame's nickel caps under the name. It isn't red, because red is the law's hand.
- **A lie in its cell:** what they said, struck through in the law's red, and where they really were under it, in ink. The crime's hour is marked as the notebook marks it.

### The replay: how it came together

- **Two tracks**, a small two-button switch:
  - **The fastest solve** (the default): the path and its "+" for the motive, worded exactly as the CLI words them, with the caption "13 actions (6 questions, a search, a look at the papers for the motive and 5 walks)".
  - **Your night:** every question, search and confrontation the player made, in order, with its own caption ("14 actions (6 questions, a search, a confrontation, a look at the papers for the motive and 5 walks)", which adds up to the actions used). A confrontation says what it got ("She told another story.", or "She stood by her story." when it didn't land).
- **Each step is a button:** its number set like the directory's room numbers (Josefin light), the action, and the reason under it in `--ink-soft`.
- **Selecting a step sets the board to that moment:**
  - The board shows what the notebook held after it, in the notebook's own cell language (says so, seen there, ✓, the clash ✗).
  - The cells it added are edged in jade on a 5% jade wash, the edge landing wide and settling. This is the only thing jade means here.
  - Every cell not known yet shows where they really were, faint, under what it shows.
- **The last position is "The whole truth"**, where the curtain opens.
- **Back and Next** walk it as a ring: Next from the whole truth is step 1. "Step 3 of 7" is said between them ("The motive" for the "+").
- **Play** walks from step 1 (or on from where it was stopped) at a second a step, and Stop stops it. Under reduced motion there's no Play: Next walks it.
- **Tapping a cell opens it under its row**, as the notebook does:
  - Where they really were and with whom: "Tillman said she was home at ten; she was at Grasso’s place, with Grasso."
  - What was said about that hour by then.
  - When it came out: "Known from step 4.", "She was caught out at step 7.", "Only her own word, from step 7.", "Known from the start.", or "The fastest solve never needed it." / "You never found it out."
- **The board and its bar stay pinned** under the running head while the steps scroll, when they take no more than two thirds of the page. A cell opened on a phone makes the board taller, and then it scrolls with the page.

### The report against the truth

The sections, in today's words: How the lie came out; Who else lied, and what cleared them, or Did anyone else lie?; Where it went. Each one is set as the verdict's ledger:
- the head in the frame's caps, and what was said in the book's prose face;
- "What gave it away" as a ledger label with its line;
- "You picked" as a ledger label, the pick typed in carbon, and the ledger's mark word in its box (Right, Wrong, Half), never a ✓ ✗ ½ glyph. A wrong pick is struck through in red, as the ledger strikes it.

### The lies

One entry for each lie, in today's words:
- the name, then the claim struck ("Tillman said she was ~~home~~ at ten; she was at Grasso’s place, to hide the crime.");
- the confrontation sentence under it ("When you confronted her, she told another story.").

The name can be pressed, like the names in the prose, and opens its cell on the board. Pointing at an entry, or focusing it, outlines the cell in ink.

### Elsewhere

- **The open door** (`.ending-toggle[aria-expanded='true']`) was the law's red. It's now the nickel edge on a raised sheet.
- **The endings' heads are h2s** under the running head's h1, the story's too (they were h3 and h4, skipping a level).
- **The verdict's page is kept** while the verdict is the same. Opening a cell in the notebook beside it used to redraw the spread, which shut the curtain and lost the replay's place.

### Accessibility

- The board is a real table with column and row headers. A cell's button says the person, the hour and what it shows: "Tillman at 10: says Tillman’s flat; the two don’t agree; really at Grasso’s place".
- The steps are an ordered list of buttons, the selected one `aria-current="step"`.
- One polite status says "Step 3 of 7: Ask Obermann: where were you tonight?". It stays quiet while Play runs and says where it stopped.
- The track switch is two pressed buttons. Tab reaches the cells, Back, Next, Play, the switch, the steps and the lies' names. Focus rings are the book's own.
- Every control is 44 px. Every text colour reads at 4.5:1 on every wash it sits on (the crime hour's, a step's jade, a pointed cell, the current step's raised sheet), and the jade edge reads at 3:1 (`test/book-look.test.ts`).

## 2. The rules

- **The sheet** (`report.ts`): `curtainSheet(d, run?, filed?)` is the curtain as data: the sections (head, what was said, the proof under its label, the pick and its mark), the board's rows and cells (each lie's claim in its cell), the lies (what was said in parts, so a view can strike the claim), and the fastest solve's steps and count. `curtainText(sheet)` is the text, and `curtainOfBoard` = `curtainText(curtainSheet(…))`. The CLI, the read tool, the hinge lint and every test that reads the curtain read the same words.
- **Proof the text didn't move:**
  - Before the refactor, the curtain's text was snapshot over 1,088 nights (`scratchpad/curtain/before.json`). The spread was every tier and type, both worlds, seeds 1–6 dealt and 1–3 from the neighbourhood. Each night was read with no run, with the oracle's run (filed true, and not filed), with a wrong filing, with a blank filing, and with the first liar's, the wanderer's and the reader's runs, plus the round-9 testers' saves. After the refactor every one is identical.
  - `test/curtain.test.ts` holds a 246-night hash of it as main said it.
- **The replay** (`replay.ts`):
  - `fastestTrack(d)` and `nightTrack(d, run)` give each step's grid (`boardGrid` on what was held by then), the cells it added and the stories it broke, and `cellTruth` and `cellKnown` give the open cell's sentences. They're built only when the curtain opens.
  - A replayed grid puts a coat or a hat a watcher saw on its owner, so a clash that rests on a face shows at the step that brings it. The notebook leaves that match to the player's own mark.
  - Nobody's guess is on a replayed grid.
- **Shared words** (`report.ts`): `kindsWords` (the fastest solve's count, now the night's too), `actionLabel`, `confrontWords`. `src/ui/cells.ts` is the notebook's cell label and its words for a screen reader, now shared by the notebook and the curtain.
- **Tests:**
  - `test/curtain.test.ts` (new): the hash; the sheet against the night; every lie caught out at a step of the fastest solve, and the culprit's on the oracle's own night, over 150 nights; the night's steps and caption; HB 39's steps, sentences and a confrontation that didn't land; no guesses; the view's rules from the source.
  - `test/book-look.test.ts`: the curtain's contrast pairs.
  - `test/plain-words.test.ts`: the replay's words over a spread, and `curtain.ts`, `cells.ts` and `replay.ts` read for retired words. "Breaks" is retired (docs/64), so a broken story is "caught out".

## 3. The gates

- **The puzzle is main's.** `git diff 42463d4 -- src/gen` is empty. The dealt boards hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`.
- **The curtain's text is main's:** 1,088 of 1,088 nights identical, and the 246-night hash.
- **The suite:** 1,079 tests, 43 files, pass (`test/curtain.test.ts` new: 8; `book-look` +1, `plain-words` +1). `tsc` is clean; `npm run build` builds.
- **The detector.** `impeccable detect src/ui`: 0 anti-patterns. The one advisory is the search tag's bounce, the designer's pick.
- **The detector on the page.** It ran on the curtain itself, open in headless Chrome over its DevTools port (`--cdp`), at 1280×800 and 375×812, at the whole truth and at step 7 with a cell open: 0 anti-patterns. Its first run found a skipped heading level, tight leading and a long line in the open cell, and a long line in the key under the board; all fixed. What's left is advisory:
  - three one-word last lines in the notebook's "What I was told" (not the curtain's);
  - at 375, a flat type hierarchy, which is the frame's 12 px caps heads over the grid's 12 px.
- **The browser.** Vite on this worktree (5194). Checked in headless Chrome at 1280×800 and 375×812, and in the built-in browser's DOM, on six nights:
  - Nothing scrolls sideways: the page's scroll width is the viewport's. No cell cuts its label.
  - The board stays pinned while the steps scroll.
  - By click and by keyboard: Next twice keeps the focus on Next, and a lie's name takes the focus to its cell. Pointing at a lie outlines its cell.
  - Play advances a step a second, stops, plays on, and ends on the whole truth. Under reduced motion there's no Play.
  - A lost thing's WHERE IT WENT, a nobody-else-lied night (right, and half), and a wrong pick struck all render.
  - Opening a notebook cell leaves the curtain open where it stood.

## 4. What's open

- **Your night's clashes are the lines' own.** The replay matches a coat to its owner on both tracks, so your night can show a ✗ that your notebook didn't show if you never marked the face. The alternative is the player's own marks: honest to their notebook, but a Hard-boiled night's clash might never show.
- **Your night has a reason line only on confrontations.** The other steps have the player's own reasons, which the game doesn't know.
- **Back and Next wrap around**, and they say "Back", the book's word for the pager, rather than "Prev".
- **Play is hidden under reduced motion**, rather than shown and doing nothing.
- **The pinned board.** On a phone the steps scroll in about 250 px under it. The pin lets go when a cell is open, or when the board would take more than two thirds of the page.
- **Pointing at a lie outlines its cell** only if the board is in view. On most screens it has scrolled away by then, so pressing the name is the way to reach it.
- **New copy**, for the designer to keep or change:
  - the head "How it came together";
  - the key's "what they said", "where they really were", "where they really were, not known yet" and "what this step added", and "Tap a cell for what was said and when it came out.";
  - the open cell's "when" sentences;
  - "did it" under the culprit's name;
  - "Opens its cell on the board." (for a screen reader).
- **"You picked"** is set as a ledger label, in caps. The brief could be read as wanting the label itself in the typed carbon face too.
