# The book's look: the Close-the-case trap, the chrome's access, the night, the phone, and the Deco frame

*2026-10-27, branch `book-look`, off main at `57b0679` (round9-prose, #114). The designer ran an impeccable critique of dashiell.app today (24/40; `scratchpad/look/critique.md`) and asked for all five of its priority issues in one build, staying dark. Item 5's look follows a parallel direction study (`scratchpad/look/direction/direction.md`, "Deco noir": a Deco frame around a noir page), with the coordinator's defaults for its open decisions. This is a refinement of the incumbent world: the night palette, EB Garamond, the 34rem measure, the first-line indents, the running head and its clock strip, the hover cards, the weather and the prose stay. Nothing in `src/gen/` changed. Method: impeccable 4.8 (`harden`, `clarify`, `polish`, `adapt`, `bolder`, `delight`), run as a subagent with no question tool, so its interview steps were taken from the brief.*

Screenshots are in `scratchpad/look/shots/`: `before-*.png` from this worktree before the first edit, `after-*.png` at the end, each at desktop (1366) and 375 px (`-desktop`, `-375`). The views that match the direction mock's are `after-mock-desktop-1440*.png` and `after-mock-phone-375*.png` (Medium 12 at the Kit Kat with Rafferty's questions open; then its report, the charge said back, the verdict and, at 375, the notebook), beside the mock's own `mock-desktop-1440*.png` and `mock-phone-375*.png` in `scratchpad/look/direction/`.

## 1. What was built, by item

### 1. The Close-the-case trap (P0)

"Close the case — free" sat on page 1 at every tier, drawn like a walk, and pressing it ran the engine's `file`, which opened the report for good: nothing ever reopened the night (`engine.ts`: "The case is being closed: close it.").

- **Opening the report by choice is reversible** (`engine.ts`, the new `back` verb). It costs nothing and writes no page: the report page comes off the log and the cards it dealt go back, so the log, its page numbers, the cards spent and the clock are exactly what they were before `file`. A night with a detour to the report and back reads, page for page and card for card, as the night without it (`test/book-look.test.ts`), so the lints and the round trip see the same nights. A hint taken on the report page stays taken. A second `file` while the report is out by choice is refused ("The report is out already.").
- **When the clock runs out, the report stays final.** `back` is refused ("No actions left: the case has to be closed now."), and no "Back to the case" is offered (`canGoBack`).
- **The book.** The report has a "Back to the case — free" control under its plaque, before the first question; it returns to the page you left. "Close the case" no longer says "free" and no longer sits with the walks: it's a full-width bar of its own at the foot of the choices, behind a double rule, with "ends the night" on its right (the direction's treatment; the name stays "Close the case") and under it what pressing it does: "It opens the report first. That costs nothing, and you can come back until you close it." The free row, the "Other places" toggle and the hint sit between it and the last walk, so it's never a thumb-slip away.
- **The confirm.** The report's own button still says "Close the case"; pressing it says the charge back in plain words (`report.ts` `chargeLines`, shared with the CLI): "You’re charging Minnie Hurwitz: at ten o’clock, with a revolver." "The reason: Petrosino testified against her brother." "What proves she lied: Feldman: at ten o’clock, only Obermann and Schilling were at the Bijou." It says whose reason it is when it isn't theirs, what's left as "I don't know" ("You don’t know when and how."), a hunch as a hunch, a small case's where-it-is-now and what shows it, and another liar with what clears them. Then "Once it’s closed, it stays closed.", with **Close it** and **Not yet**. Changing an answer while it's up takes it down, so what's closed is what was read.
- **A blank report** says so before it closes: "Every answer is “I don’t know”. Closing the case now charges nobody." (`BLANK_REPORT`).
- **The CLI** (`play-lib.ts`) says and does the same. The page prints "Close the case" under its own heading, "The report:", as "Close the case — ends the night", with the same note under it. The report says "Not ready? `do back` puts the report away and goes back to the case. It costs nothing." while there are actions left, and `do back` does it. `close` prints the charge (`chargeLines`) above the verdict; a `close` with every answer blank is refused with the blank line and `close "blank"` to close it anyway. The help says `do back`.
- **Wording, one departure from the brief:** the confirm's button is **Close it**, not "File it". docs/64's retired words (the designer's ruling, held by `test/plain-words.test.ts`) bar "File the report" and "File it" from the chrome; "Close it" names the same act in the words the rules, the teach page and the CLI use. The designer can have "File it" back by lifting that rule.

Before → after (Raw 12, page 1): the free row's "Close the case free" chip under the walks → a bar at the foot, "Close the case · ends the night", and the note under it (`before-raw12-p1-choices-375.png` → `after-raw12-p1-choices-375.png`). Opening it: a report with no way back → "Back to the case free" (`after-report-*.png`, `after-back-to-case-*.png`); the button straight to the verdict → the charge said back (`after-confirm-*.png`).

### 2. Screen-reader and keyboard play (P1)

- **Labels** name their selects (`for`/`id`, `rf-who` …); the "Who" field, set as the plaque's typed blank, keeps its own label (visually hidden, since the caption says it).
- **Landmarks and headings.** The play screen is `main`; the place in the running head is the page's `h1`; the notebook is an `aside` labelled by its own heading; the choices' heads are `h2`, a person's questions `h3`, the confront picker's `h4`.
- **Focus follows the page.** After every action, after "Back to the case" and after Start, the focus moves to the new page's `h1` (it's announced: the place). The notebook's button moves it to the notebook's heading and "Back to the page" back to the `h1`. Choices redrawn in place (a person's questions, the picker, a grid cell, a guess, "Other places", the pager) keep the focus on the same control (`focusKey`). After closing, the focus is on the verdict's heading.
- **One focus ring:** a 2px ink outline with a 2px offset on every control (`:focus-visible`), never the star's red mark or hover's border (the star no longer paints a border at all). Grid cells take it inset, since a cell clips; the plaques' frames are `border-image`, which never clips a ring.
- **The notebook's button** has `aria-expanded` and `aria-controls`.
- **The names in the prose** are `role="button"`, ringed on focus, and Enter or Space keeps the card up or puts it away (`hover.ts`); `--accent-soft` was `#b8635400`, fully transparent, and is a real tint now.
- **The pager and the old `.open-case`** get the same ring; the pager's buttons say "Back a page" and "Forward a page".
- **A skip** past a page's names straight to its choices (or the report), shown only when a keyboard reaches it, right after the `h1`.
- **Number keys 1–9** pick the page's choices as the CLI numbers them (people, searches, walks with the folded places, the free row, "Close the case"; with a person's questions open, those). The numbers show, in amber, only while the keyboard is in the choices; they never fire inside a form field or with a modifier.
- **Checked:** keyboard only, in the built-in browser on Raw 12: Tab to Start, Enter; the skip, Enter, the first walk, Enter (focus on "Petrosino’s place"); two searches the same way; Tab to "Close the case", Enter; the report, "Back to the case", Enter (page 4 of 4, no page written); "Close the case" again, the submit, Enter (focus on the confirm's heading, "A blank report"); Tab to "Close it", Enter (focus on the verdict's `h1`, "The verdict", the stamp "Dismissed"). The accessibility tree (`read_page`): `main`, `heading "the office"`, `navigation "What next"`, the report's selects named by their labels, `complementary` with `heading "Notebook"`.

### 3. Contrast and the dead palette (P1)

- The cream palette, its "Cream paper, dark ink" comment, every `prefers-color-scheme` and `data-theme` branch in `book.css` and `weather.css`, and `data-theme="dark"` on `<html>` are gone; the night's values are the base `:root`, with `color-scheme: dark` and the `<meta name="color-scheme" content="dark">`.
- `--ink-faint` (the actions-left line, the pager, the key) is lifted to 5.1:1; it still reads under `--ink-soft`.
- A control's edge is a token of its own, `--line` (3.7:1). The old `--rule` (1.5:1) bounded every choice; now `--rule` only separates (hairlines, the double rule), and never bounds a control by itself.

Every text token against the page (`--paper`, `#17171a`), the raised sheets (`--paper-raised`, `#1e1e22`) and outside the book (`--paper-edge`, `#101012`), WCAG 2:

| Token | Before | After | On paper | On raised | On edge | Role |
|---|---|---|---|---|---|---|
| `--ink` | `#ded7c9` | same | 12.50 | 11.61 | 13.28 | Body text |
| `--ink-soft` | `#a49c8e` | same | 6.58 | 6.11 | 6.99 | Secondary text |
| `--ink-faint` | `#756e63` (3.55) | `#8f887c` | 5.09 | 4.73 | 5.41 | Tertiary: the pager, the key, the actions-left line |
| `--nickel` | – | `#a3a8b1` | 7.49 | 6.96 | 7.96 | The frame's caps heads |
| `--nickel-dim` | – | `#878c95` | 5.29 | 4.92 | 5.63 | Minor caps ("asked", "free", the 12), ornament |
| `--accent` | `#d08573` (6.21) | `#df7b67` | 6.10 | 5.67 | 6.49 | The nouns, Confront, the stamp, a wrong answer |
| `--amber` | `#d9a441` | same | 7.95 | 7.39 | 8.45 | Time only: the next notch, the 8, a gold star |
| `--carbon` | – | `#aeb0d6` | 8.50 | 7.90 | 9.03 | Typed carbon: the verdict's answers, the curtain |
| `--line` | – (`--rule` `#3a3833`, 1.53) | `#6e727b` | 3.71 | 3.45 | 3.94 | Every edge that marks a control |
| `--rule` | `#3a3833` | `#3d3f45` | 1.70 | 1.58 | 1.81 | Decorative hairlines only |

Paper on ink (the one solid button) is 12.50; paper on amber (the lit 8) 7.95. `test/book-look.test.ts` reads the tokens out of `book.css` and holds every text token at 4.5:1 on the paper and on a raised sheet, `--line` at 3:1, and faint under soft.

### 4. The phone (P2)

- **The grid at 480 px and under:** text 12px at the least (names were 10.9px, the key 11.6px); every cell 44px tall (was 37); a label too long for its column at 12px ("Blue Lantern✓", "Delmonico✓" with four hours) takes a second line inside its cell, at a space or before its mark, rather than being cut (measured on five nights, 0 cells clipped: `scratchpad/look/ts/measure-grid.mjs`).
- **"Says so" vs "seen there":** their own word is soft italic on a dotted underline; somebody else's sighting is upright with none; a claim somebody backed (✓) a solid underline. The key shows the same three.
- **The key's sample** is neutral, "Place", never the scene's own name ("Petrosino’s✗ where they clash" read as a fact about tonight; the CLI's key says "X").
- **The pager's targets** ("‹ back", "forward ›", "weather on": 29×19, 44×19, 52×19) are 44px.
- **The notebook** opens from the foot of the page, where a thumb is, not the top-right corner: a "Notebook" button held at the bottom of the window as the page scrolls (on every screen of a night, the verdict's too). The notebook's own head carries the clock on a phone ("6:35 a.m. · Two actions left."), since it hides the page that shows it.
- **On a long page** a quiet "What next ↓" sits at the foot while the choices are below and goes once they're in view (Medium 12's first page at 375 puts the first choice ~1,170 px down); it takes you, and the focus, to them.
- **Close the case** is a thumb's distance from the last walk: item 1.

Before → after: `before-grid-375.png` → `after-grid-375.png`, `after-mock-phone-375-notebook.png` (Medium 12, four hours); `before-raw12-p1-375.png` → `after-raw12-p1-375.png` and `after-medium12-p1-375.png` (the cue and the notebook at the foot); `before-notebook-375.png` → `after-notebook-375.png`.

### 5. Character, and the ending (P2)

The look follows the direction study: **a Deco frame around a noir page**. The page you read is unchanged; the frame (the running head, the heads, the forms the choices take, the report and the verdict) is late-1920s New York: nickel and black glass, the 1916 setback, lobby directories, el transfers, the property clerk's tag, the summons. No gold, no fans, no glow, no texture. Josefin Sans (one variable file) for the frame's caps, never below 12px and never in lowercase; Courier Prime only for what was typed (the report's blank, the verdict's carbon, the curtain), fetched only once one shows; one Google Fonts request for the three.

- **The running head:** the place in tracked caps (`--nickel`); the clock in light figures with a lowercase "a.m." (`deco.ts` `clockNode`); the notch strip a dial of tall fluting from "12" to an amber "8", where the DA waits; a double rule under it. The notebook's head in the same caps ("Case № 12 · Raw").
- **The setback** (three stepped bars, inline SVG) is the one ornament: between the page and its choices, as the plaques' crest, over the title.
- **One form per kind of action** (`board-book.ts` `button(…, kind)`; `board.css`):
  - **Talk to:** a lobby directory: a raised sheet, the names in the building's caps two to a row (one on a phone), the count where the room number goes, the open name lit, and that person's questions inside the same frame.
  - **A question:** a ruled line on that interview sheet; a done one says "asked" in caps, never a ✓ glyph (and still "free to reread").
  - **A search:** the evidence tag, its corners canted, a hole for the string (a `border-image`).
  - **A walk:** a transfer for the el: the destination in roll-sign caps, the note under it, the stub torn off at the dashes with an arrow.
  - **Confronting:** the summons, the only red control on the page, double-ruled; its picker a raised sheet.
  - **Free things** ("Review my notes", the hint, "Other places", "Back to the case"): a pencilled underline with "free" beside it.
  - **Closing:** the full-width bar at the foot (item 1).
- **The star** is the red `*` and its red why; it no longer paints a border, so focus, hover and the star share no cue.
- **The report is a typed charge to the DA:** a plaque with the stepped frame, the crest, "The People of the State of New York" *against* and the "Who" select set as the typed blank, "Detective’s report · Case № 12 · Raw" under it. On a lost thing or a lost pet, "Report to Mrs. Marchetti" *concerning*. The form's lines are marked with a drawn box; the touching lines lose their red side stripe (their heading already says it). The one solid button in the night is the report's "Close the case". The charge said back sits on the same plaque.
- **Closing is a ceremony, and the clock strikes eight.** The verdict's running head says "The verdict", **8:00 a.m.**, every notch still left struck and the 8 lit, "Eight o’clock. The case is closed." (it no longer says "7:15 AM · One action left…"). The plaque comes back with the name you charged typed in, and a rubber stamp across its corner: **Case closed** for the right name, **Dismissed** for the wrong one, "8:00 a.m." under it. The ledger is the DA's carbon: the question in caps, your answer typed in carbon, a word in a ruled box (Right, Wrong, Half; no ✓, ✗ or ½ glyphs), a wrong answer struck through in red and corrected beneath. The star is drawn. Everything is there, and the focus on "The verdict", at once; the motion (about 0.9 seconds: the notches strike, the 8 lights, the stamp comes down) plays once, on closing, and with reduced motion only the stamp's 160ms fade.
- **The efficiency note moved** out of the verdict's close into "What really happened", under "The fastest solve" (`report.ts` `fastestSolveLines`; the CLI's `story` prints it too). A night as fast as it can be done isn't scolded: "It took me 8 actions, and the fastest solve takes 8. It can’t be done in fewer." Over it, it says what the fastest solve skips in one sentence, and a confrontation that landed is never called needless: what it got is said. Raw 12, before (the close): "It took me 9 actions. A better detective would have done it in 8. I didn’t need to confront Hurwitz: I had enough to close the case without it." → after ("What really happened"): "It took me 9 actions; the fastest solve takes 8. It doesn’t confront Hurwitz. Confronting her caught her in the lie." Round 5's four testers' nights, held in `test/round5.test.ts`, e.g. Raw 11: "It doesn’t confront Bellucci: the coat Alfano saw go straight to Pardo at eleven shows where the watch went. Confronting him got him to say it." docs/53's dial holds: the plain sentence first, no engine words.
- **Elsewhere, from the direction's §11:** the title in the frame's light caps under the crest; the hover card raised, its title in caps; the turn's divider ("Where things stood") in caps between two hairlines; the curtain on a raised sheet in typed carbon; the title page's "Choose a case" caret drawn, not a ▾ glyph.

The coordinator's defaults for the direction's open decisions, each one constant (`src/ui/deco.ts`, `book.css :root`): the stamp's words, the caption ("The People of the State of New York" / "Report to {client}"), the accent nudged to `#df7b67`, Courier Prime kept for typed answers only, and "a.m." in lowercase small caps.

Before → after: `before-verdict-*.png` → `after-verdict-*.png`; `before-ending-*.png` → `after-ending-*.png`; `before-talk-topics-*.png`, `before-confront-picker-*.png`, `before-search-*.png`, `before-walk-*.png` → their `after-` shots; the mock views `after-mock-*.png`.

## 2. The rules

- **The engine** (`engine.ts`): `back` puts a report taken out by choice away, writing no page; refused once the clock is out. A report out by choice goes out once.
- **Shared text** (`report.ts`, `text.ts`): `BACK_TO_CASE`, `canGoBack`, `BLANK_REPORT`, `blankReport`, `chargeLines`, `fastestSolveLines`; `CLOSE_HEADING`, `CLOSE_TAG`, `CLOSE_NOTE`. The book and the CLI say the same words from the same functions.
- **Tests:** `test/book-look.test.ts` (the engine's `back` and its round trip, the charge, the CLI, and the chrome's rules read from the source: landmarks, labels, the ring, one palette, the contrast table, the phone grid, the frame's words); `test/round5.test.ts` (round 5's U7, said now under the fastest solve, and never "needless"); `test/clarity5b.test.ts` (the key's neutral sample, by rule).

## 3. The gates

Measured once, at the end (`scratchpad/look/gates.sh`, outputs in `scratchpad/look/out/`), against main `57b0679` read the same way.

- **The puzzle is main's.** Nothing in `src/gen/` changed (`git diff 57b0679 -- src/gen`: empty). The dealt boards hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`. `board-measure --seeds 20`: byte for byte main's output, every column.
- **The lints, 10 nights a tier, both worlds, three routes (the oracle's, the wanderer's, the reader's):** all 74 hinge rules 0, the verdict's close (`epilogue`, `clock`) among them; board-prose, both worlds: every lint column 0, the level and sum lint ("thoughts over their level") with them, and the whole table identical to main's. The detour to the report and back leaves a night's log as it was (§1), so no lint rule needed changing.
- **The round trip** (10 nights a tier, both worlds, three routes): every plain page and voiced composite reads back, and every voiced composite is clear, 100.0%; the flesh column's one miss is main's Miss Nowak (the neighbourhood's Poached, 47 of 48).
- **The suite:** 1,068 tests, 42 files, pass (`test/book-look.test.ts` new: 24). `tsc` is clean; `npm run build` builds.
- **The detector** (`impeccable detect --json`, once, at the end) on every changed UI file (`board-book.ts`, `report.ts`, `deco.ts`, `hover.ts`, `book.css`, `board.css`, `weather.css`, `index.html`): 0 findings; on the built CSS (`dist/assets/index-*.css`): 0 (the critique's six minified `side-tab` hits are gone with the side stripes).
- **The browser:** Vite on this worktree only (`npx vite --port 5193`); the built-in browser in its own tab for the keyboard pass and the accessibility tree (§1, item 2), and headless Chrome for the screenshots (`scratchpad/look/ts/shots.mjs`, `mockshots.mjs`): the title page; Raw 12 from page 1 (a walk, a talk, a search, a hint, a confrontation, the grid, the notebook); opening the report, going back to the case, the confirm, the verdict and the ending; Medium 12's first page; desktop and 375.

## 4. What's open

- **"File it" vs "Close it"** on the confirm: docs/64's retired word, above. The designer's call.
- **The direction's open decisions** (the stamp's words, the caption, the accent nudge, Courier Prime, "a.m."): taken with the coordinator's defaults, one constant each, for the designer to change.
- **Number keys are undiscoverable to a pointer** by design (they show only while the keyboard is in the choices); the teach page doesn't mention them.
- **The confront picker's ready pairs** keep the old ruled-row form inside the new sheet; the direction gave them no form of their own.
- **The critique's minor list** isn't in this build: the prose seams (Petrosino's place; Feldman the ticket seller vs usher), the desktop notebook repeating page 1, the profile's gold star beside "Tonight: Raw", "How it plays" vs "How this works".
- **PRODUCT.md and DESIGN.md** aren't written (the brief); `impeccable document` after this merges would record the Deco frame as the system the next builds inherit (the direction's own recommendation).
