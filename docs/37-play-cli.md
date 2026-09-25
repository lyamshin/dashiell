# 37 — `npm run play`: the book, played blind, in plain text

*Branch `play-cli`. For blind playtesters (people, or LLM agents with a shell): they play the book one choice at a time and see exactly what a player of the book sees, and nothing of the truth until the report is filed.*

## How to play (for a newcomer)

This is the game's own help, from the title page and the book's help page, with the commands of this tool beside it.

**A murder, an evening, and eight hours to write it down.** Somebody died between six and midnight. You start in your office at midnight with the client in the chair, and the DA files at eight whether you have or not. (In a lost dog, a lost thing or an affair, it is the client who wants an answer at eight.)

**Every page ends in choices: ask, search, go.** Each one says what it costs of the night, and a lead is marked with a star. Walking somewhere, asking somebody something, and going through a room each cost a call (about 20–30 minutes, depending on the night's budget); the page's head shows the clock and how many calls are left. The first question to somebody brings their own evening as well. Doing something again is free and marked ✓. The notebook, the grid, the pencil and filing are free.

**People lie about themselves. Nobody lies about what they saw.** A person's own account of their evening may be false. What anybody says they saw of somebody else is true, and so is anything found in a room. The one exception is somebody who says they were with somebody: they may be covering for them.

**Put it to them.** Once somebody's evening is written down, "Put it to …" opens every fact in the notebook: read them the one that breaks what they told you. It costs a call; if it lands, a second fact right after is free. A fact that doesn't touch their story costs the time all the same.

**Where they were.** The notebook keeps a grid of every person against every half hour, filled in from what you have found. Pencil your own marks on it (free, never a fact), and put a name to a stranger somebody saw.

**The report.** File it when you are ready, or at eight when the calls run out. It asks what this case asks (who, when, how, why, …, and at the harder tiers where every suspect was when it happened). Filing is final; a line left blank is "I don't know". Then the verdict, the closing page, and — if you want them — what really happened and the curtain.

A night, start to finish:

```sh
npm run play -- new --seed 3 --tier 4 --engine v2 --save night.json
npm run play -- do 4 --save night.json            # a choice by its number
npm run play -- do "Sirkin’s place" --save night.json   # or by its words
npm run play -- notebook --save night.json
npm run play -- grid --save night.json
npm run play -- pencil "Marchetti 8:30 not the third floor" --save night.json
npm run play -- confront Marchetti --save night.json    # then: do <fact number>
npm run play -- report --save night.json
npm run play -- file "who=Marchetti; when=8:30 PM; how=poison; why=exposure; entry=key" --save night.json
npm run play -- story --save night.json           # after filing only
```

## The commands

Every command but `help` takes `--save <file>`. Output goes to stdout; a command that can't be done prints why on stderr, exits 1 and leaves the save alone.

| command | what it does |
|---|---|
| `new --seed N --tier 0..5\|over-easy [--level 1..4] [--engine v2] [--name X] [--no-teach] --save F` | Deals the night (level defaults to 2, Precinct; Raw always plays at Beat, as in the book), writes the save, and prints the title page's rules, the case line (as the notebook's header has it), the teaching page (docs/39 §5: this tool keeps no profile, so every night is a first night; `--no-teach` leaves it out) and the first page with its choices. |
| `look` | The current page and its choices again — or, once the form is out, the page and the report form; after filing, the verdict. |
| `do "<n or words>"` | One choice, by its number on the current list or its words exactly as printed (the label, or the command behind it). Saves, and prints the page it lands on. `do` on "Notebook" prints the notebook; on "File the report" it takes out the form; on "Put it to X" it opens the picker. |
| `page <n>` | Turns back to an earlier page (the book's "‹ back"). Read only. |
| `notebook` | The notebook page: the clock, people, places (with the things in each), leads, established. |
| `grid` | "Where they were", as text: every row against every half hour, the counts, the anchors, the strangers, the soft marks (docs/39 §3: `?not:K` and `n<m#` in a cell, and "MARKS TO THINK ABOUT" in full under the grid), the key, the rules. |
| `pencil "<Name> <hour> at\|not\|clear [place]"` | A pencil mark, as in the book: "Grasso 10 at the suite", "Grasso 9:30 not the third floor", "Grasso 9:30 clear". Hours run 6 to 11:30 (a trailing "PM" is fine); a place is its name or its grid label. Free, never a fact; prints the grid. |
| `link` / `link "<n> <Name>\|none"` | Lists the strangers' sightings, numbered, one line a sighting (the same face, one place, half hours in a row); links one to a person on the grid, or rubs it out, and says what it linked. Free, never a fact. |
| `confront "<Name>"` | Opens the "Put it to …" picker for somebody in the room whose account is written down: what they told you, then the facts, numbered, with who said it. At Raw and Coddled that is every fact in the notebook, under the person or place it is about. From Poached up (docs/39 §1) it opens on the facts about them at the half hours their own story covers, grouped by the half hour ("8:30 · she says the third floor"), then "Everything else in the notebook (N more)", which opens the rest; nothing is marked as the one that breaks it. `do <n>` reads them fact n; the last number is "Put nothing to them". After a fact lands, the page offers "Put another fact to …", free, and `confront` opens it the same way. `confront off` shuts the picker. At Raw and Coddled, a fact in hand that truly breaks somebody's story is also on the page itself, ready-made: "Put it to Rafferty: Tillman says you weren't at the Garibaldi at eight o'clock and half past eight." |
| `report` | The report form: each question the case asks, its key (`who`, `when`, …) and its options, numbered; and the crime column, when the tier asks it. |
| `file "<key=answer; …>"` | Files the report. Keys are the form's (`who`, `why`, `when`, `where`, `how`, `entry`, `whereabouts`, `fate`, `goods`) and, for the column, the suspects' surnames. An answer is an option's number, its words, or enough of them to be unambiguous ("Marchetti", "8:30 PM", "poison", "kiosk"). A line left out is "I don't know". If the form is not out yet, filing takes it out first (the notebook's "File the report"). An affair then asks what to tell the client: `do 1|2|3` (or `told=truth\|half\|nothing` in the answers). Prints the verdict and the closing. |
| `story` | What really happened. Only after filing. |
| `curtain` | Behind the curtain: how each answer could be known, and the whole truth sheet. Only after filing. |
| `help` | The title page's rules, the book's help page, the lie rule, what a call costs tonight (with `--save`), and these commands. |

## What it prints, and what it never does

The page is the book's page: `Page.blocks` rendered by the transcript's own renderer (`renderPageBody`, now split out of `renderPageText`), under a running head with the place, the clock, the page number and the strip of calls (`[xxxo....] Seventeen calls left before the DA files at eight.`, from `clockStrip`, the book's own words). The choices are `choicesFor` — the model the book draws its buttons from — numbered in the book's order, each with its minutes (the reducer's own price), the star on a lead, ✓ on a thing done and "not been" on a place never visited. Where the book shows one person's topics at a time behind a row of names, this lists every person's, with the row of names (and its stars) above them; "Other topics" are listed, not folded. The picker, the report form, the affair's last question and the verdict use the book's wording (`src/ui/choices-view.ts`, `src/ui/report.ts`).

Never printed: the truth, the oracle or its route, the `>` mark for the oracle's choice, `[gap: …]` diagnostics, word counts, par, the cast sheet's temper, the solver's findings, the truth sheet, and the story or the curtain before the report is filed. (After filing, the closing page's own words may say how many calls a better detective would have needed, as the book's does.)

**The save file** holds what the player did and nothing the case knows: the deal (seed, tier, level, engine, name), then every choice, pencil mark, link and the filed report, in order, plus whether the picker is open. Every command deals the case again and replays that list through `stepInput`, the same function the book calls, so the night on the page is the night the book would write. A tester who wants to cheat can of course deal the seed with `npm run case`; the tool doesn't make that any easier.

## Where it lives

| file | what |
|---|---|
| `src/cli/play-lib.ts` (new) | Everything: the save, the replay, the numbered choices, the picker, the form and its parser, the verdict. `runPlay(argv, io)` returns the text, so a test drives it in-process. |
| `src/cli/play.ts` (new) | The shell: node's fs as the io, stdout/stderr, the exit code. `npm run play`. |
| `src/game/transcript.ts` | `renderPageBody` split out of `renderPageText` (same words); `renderNotebookText(view, state, { book: true })` adds what the book's notebook page has and the transcript didn't: the things in each room, "go there first" beside a lead elsewhere, the book's clock line. `npm run read` is unchanged. |
| `src/game/parser.ts` | A fix found by playing: a place's own short name now always means that place. In v2 seed 3 the office over the Imperial Tailoring Company also answers to "the office", so the book's "Go to: the office" button (and its price, shown as free) wrote a "Which one?" page instead of walking home. |
| `test/play-cli.test.ts` (new) | Three nights (v2 seed 3 tier 4; seed 5 tier 2, a robbery; seed 12 tier 2, an affair) played through the tool along the oracle's route, one offered choice at a time, with the picker opened and shut, a pencil mark, the notebook, the grid and the form: nothing printed before filing holds `[gap`, par, the oracle, word counts, a `>` mark, the verdict, the story or the truth sheet, and the save holds no solution; then the truth is filed by the form's own words and scores full marks, the affair's question is answered, and the story and the curtain open. |
