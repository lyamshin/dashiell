# 32 — M13 Sheets: notes

*Branch `m13-sheets`, off `main` at a5ce597 (the sheets golden, blessed, and the M13 and M14 specs). The spec is [32-m13-sheets](32-m13-sheets.md). The target is `docs/golden/sheets-arrival.md`, **Sheet A filled for seed 3**; B and C are the good variants.*

## In one paragraph

A page is written from sheets now. A **sheet** (`content/sheets/*.json`) is a short hand-written skeleton for part of a page: **sheet text**, the joins, where the jokes live because the sheet knows the setup ("Nobody looked up except the one person paid to."); **holes**, which take a card from a named deck or a piece the realizer writes itself (the establish card, the watcher's activity, the question and everything answered, the finds); and **roles** — a prop, a trait, a thing in hand, a figure — that a card **exports** and a later part of the page brings back. The mirror comes in with the place and goes out as the page's last line: "I caught myself in the mirror behind the bar. The silvering had gone in the corners, and so, I noticed, had I." A seeded roll decides whether a page pays anything off; it wants one on three pages in four, and 67.4% of the pages written from sheets pay one off (the designer: about seventy in a hundred, not every page). The chooser picks among the sheets that fit, at random, with a memory like the dealer's: never the one a moment had last while another fits, then the least used tonight, and a line of sheet text said tonight waits while another way of saying it has not been. An arrival with no finds is an arrival sheet and a company sheet; a question, a confrontation, a search, the first family a witness tells, the recap and the office each have a frame of their own. Every required beat still lands, in a hole or in sheet text, and the trace says where. The sheets change nothing but words: the design test is the same table.

## What changed where

| file | what |
|---|---|
| `src/game/scene/sheets.ts` (new) | The machinery and nothing else. The format (`Sheet`, `SheetPart`, `SheetClose`), loaded from `content/sheets/*.json`; conditions (`holds`, `fitsWhen`: a flag, a list, `">=2"`); the chooser (`chooseSheet`: the sheets that fit and can be filled, those that can pay something off on a page that rolled for it, never the last one for the moment while another fits, the least used tonight, then a weighted roll); the roll (`callbackRoll`, seeded on the run and the page, `CALLBACK_SHARE` 0.7); the interpreter (`runSheet`: parts into paragraphs, a card's `exports` bound to the page's roles on a callback page, a role named again later is a payoff, text parts and their `alt`s picked among those not said tonight, whatever the page must carry and the sheet did not place put in before the close; `closeLine`: the role's own `pay` lines first, then the close deck's for its kind, then the sheet's; otherwise the plain lines, the deck's plain ones, or the engine's own last word). |
| `src/game/scene/sheet-pages.ts` (new) | The moments. `arrivalPage` (an arrival sheet then a company sheet, chosen knowing what the first bound; claims the establish, weather, presence, every thought and the answer, and marks each with the words that said it); `framesFor` (the question and the confrontation: the setup before he asks and the last word; the search: how he went through the room and a last word); `tellingFrame` (a line before the first family told and one after); `recapFrame`, `officeFrame`. Holes: `deckPiece` (a card preferring one that exports the role wanted; the `named` form puts a street card's first pronoun back to the surname), `closeDeckLine`, `personRoleSlots` (`{tell}`, `{tell.He}`, `{tell.doing}`, `{tell.tie}` …), `cutActivity`, `lineMemory` (the dealer remembers sheet lines like cards). `PageSheets`: one page's roll, its shared roles, what it used. |
| `src/game/scene/realize.ts` | An arrival page from sheets claims its beats and the loop leaves them to it; a question's and a confrontation's setup and last word, a search's first paragraph and last word, and a telling's lines come from the frames. `setupOf` split into `approachOf` and `lookOf` (with the card's exports), `searchActOf`. `setSheets` (off, for the test that shows sheets change nothing but words). A first sight is at most five sentences, the tie included (M11 §A.2's rule, which a two-sentence look and a two-sentence street card together could break). |
| `src/game/scene/plan.ts` | The things he leaves alone on a search never include the thing that was taken. |
| `src/game/recap.ts` | The recap's opening and closing lines from a recap sheet (its own roll); a recap refused for want of anything new uses no sheet. |
| `src/game/voice/page.ts` | The office's first paragraph and its last line from an office sheet; the office paragraph may run to 72 words (the golden's is sixty-odd); a sheet's own lines on page one are the first thing the ceiling takes, before the entrance. |
| `src/game/voice/cards.ts` | `Card.exports` (`CardExport`: `text`, `short`, `kind`, `near`, `pay`), `Card.cut`, `shortOf` (up to the cut, else the first sentence, and "Mrs." is not the end of one), `Dealer.notedLike`, the `greet` deck. |
| `src/game/types.ts`, `reducer.ts`, `scene/index.ts` | `Page.sheets` (`SheetUse`: the sheet, the moment, whether the page paid a role off, whether it rolled for one, how many sheets were in the running), from the page and its recap; `BeatTrace.parts.sheet` (a telling's sheet lines). |
| `src/game/correspond-pages.ts` | The engine's vocabulary reads the exports and the sheets; a telling's sheet lines are held to naming nobody but the witness, no hour and no place. |
| `src/game/reader-lint.ts` | `machineryIn`, so the sheets' lines are held to the same words as a page. |
| `scripts/validate-decks.mjs` | The sheets (moments, holes, flags, slots, roles, one joke a sheet, a callback close that brings a role back and a plain one that needs none, plain terms, no verdict) and the cards' `exports` and `cut`. |
| `scripts/sheet-stats.ts` (new) | The measure: the callback share, each sheet's use, repeats in a night, and coverage, correspondence and lint over the same runs; `--dump <moment>` prints those pages with their sheets. |
| `content/sheets/` (new) | 43 sheets in eight files, one a moment: `arrival` 4 (arr-a is Sheet A's first half, arr-b Sheet B's, arr-c Sheet C's, arr-d the night then the place), `company` 7 (com-a Sheet A, com-b Sheet B, com-c Sheet C, and the one I came to see, somebody minding the place, nobody home, faces in the room), `ask` 6, `telling` 7, `search` 6, `confront` 5, `recap` 4, `office` 4. 93 other ways of saying a line (`alt`), 123 closing lines of the sheets' own. |
| `content/decks/` | Exports: `place-ambient` 211 props (every place has five to seven, each with its own closing line, 223 in all), `character` 111 traits on the look cards (35 of those cards rewritten so they read after an activity line: fragments made sentences, none that presumes a conversation), `look` 114 traits, `activity` 287 things in hand, `approach` 9 props (his hat, his matches), `search-act` 65 props, `office` 44 props, `recap` 20 figures (and 10 new opening cards). Cut points: `establish` 13, `activity` 6. New: `greet`, 40 cards, the client's greeting by purpose and temper. `close`: 146 sheet closes (`outcome: sheet`, by `moment`, `callback` and `kind`). The schema: the `greet` deck, the close deck's `moment`/`callback`/`kind` tags, the `exportKind` vocabulary. 586 pay lines in all. |
| tests | `test/m13-sheets.test.ts` (new). `m11-people` (the observation is said where the company sheet puts it; the page ends on the sheet's last line), `m8` (the one the page ties to the case may be named in the observation's own line), `game/voice` (sheets and their lines are remembered under `sheet:` and `line:`). |

## The format

A sheet file is `{ "moment": …, "sheets": [...] }`, and each file's `$comment` lists the holes, slots and flags its moment has. A sheet:

```json
{
  "id": "com-a",
  "name": "The room looks at me",
  "when": { "watcher": true, "tell": true, "tellWatcher": false, "tellClient": false },
  "weight": 2,
  "parts": [
    { "para": true, "text": "Nobody looked up except the one person paid to.", "says": "watcher-view", "alt": ["One head came up. It was paid to.", "…"] },
    { "hole": "watcher", "form": "activity" },
    { "hole": "trait", "deck": "character", "tags": { "kind": "look" }, "of": "watcher", "bind": "trait", "optional": true },
    { "para": true, "hole": "client", "optional": true },
    { "hole": "others", "optional": true },
    { "hole": "views", "optional": true },
    { "para": true, "text": "The only one who didn’t look at me at all was {tell}. {tell.He} was {tell.doing}, {tell.tie}." },
    { "hole": "answer", "optional": true }
  ],
  "close": { "roles": ["prop", "trait"], "deck": true, "callback": ["…{prop}…"], "plain": ["…"], "joke": true }
}
```

- **Parts** run in order into paragraphs (`para` breaks). A text part whose slots cannot all be filled fails the sheet unless it is `optional`; a role slot is only filled on a page that rolled for a callback, so text that names a role is optional or `if: callback`. `alt` holds other ways of saying a line: the sheet's own `text` the first time tonight (the golden's words, where they are the golden's), then one of its alts not said yet.
- **Holes** are the moment's own pieces (the establish card, the watcher's activity, the question and all that follows it as `body`) or a card (`deck`, `tags`, `of` for whose). `bind` makes a card's export a role for the rest of the page; `form` says how a piece is written (`short`, `activity`, `placed`, `list`, `recall`, `named`, or `bind` to draw a card silently for the sheet's text to say).
- **Roles** are `prop`, `trait`, `thing`, `figure`, `mark`. A card offers one in `exports` (`text`, the whole noun phrase; `short`, how the page refers back; `kind`; `near`, where somebody stands by it; `pay`, closing lines written for that very prop). Slots: `{prop}`, `{prop.text}`, `{prop.near}`, `{prop.it}` (it or them), `{Prop}` put up. Sheet text may offer a role itself (`bind` with `exports` on the part: "I turned to a clean page…" offers the page).
- **The close**: on a callback page, a role already on the page, paid off — its own `pay` lines first, then the close deck's for its kind, then the sheet's `callback` lines; else the `plain` lines, the close deck's plain ones, or the moment's own last word (M12's close deck for a question, the recap deck's closing card). A close with `roles: []` is plain on purpose (Sheet C always ends on the rundown's setup).
- **One joke slot a sheet**: `joke` on a part or the close, counted by the validator.

`npm run decks` validates all of it: moments, holes and flags a moment has, slots a moment can fill (dotted ones too), roles, one joke a sheet, a callback close that brings a role back and a plain one that needs none, plain terms, no verdict; and every card's `exports` and `cut`.

## The engine

**Choosing.** `chooseSheet` takes the sheets of the moment whose `when` holds and that the adapter can fill (a sheet that needs a prop the arrival did not bind is not in the running). On a page that rolled for a callback, those that can pay something off go first. Then like the dealer: never the sheet the moment had last while another fits, the least used tonight, and a weighted roll (Sheet A and its first half weigh two, the golden's). Tonight's sheets are noted in the dealer's run memory (`sheet:<id>#…`), so a saved night remembers them, and so are the sheets' lines (`line:<hash>`).

**The roll.** `callbackRoll(seed, page)` wants a callback on 75% of pages (`CALLBACK_SHARE` 0.7 on the hash's spread, 76.2% measured). A page that wanted one pays one off when a bound role reaches the close or a later line; some can't (no card with an export fit, a sheet whose last line is always plain), which is how the share lands near seventy.

**Arrival and company** (`arrivalPage`). A first visit with no finds (the scene keeps its own page, the body and the report). The arrival sheet takes the establish card (whole or its short form), tonight's weather, and a place-ambient card that may put a prop in the room. The company sheet is chosen knowing whether a prop is bound (and whether somebody can stand by it), and writes who is there: the watcher, the client, the one the page ties to the case (the tell), everybody else, the detective's view of them, and what came of the walk. It claims the establish, weather, presence and every thought and answer beat, and marks each with the words that said it: the watcher's view with "Nobody looked up except the one person paid to.", the observation with "The only one who didn't look at me at all was Crowninshield. She was reading a newspaper, the woman who had found Sirkin." Whatever it does not place goes in before the close, so nobody present is left out and the observation always lands. People are named exactly where the plan's page names them — everybody with a line of their own, a crowd by count unless an earlier page named them — because a name on the page is a person the player can ask about (M9's who-knows-whom).

**The question and the confrontation** (`framesFor`). The setup before he asks (the approach and the look, the room's prop in a paragraph of its own, what they have in hand, a line for a second question or somebody guarded) replaces M12's `setupOf` paragraph, and the sheet's close replaces M12's last word — M12's card when no role fits. The body is the engine's, unchanged.

**The telling** (`tellingFrame`). The first family a witness tells on a page may get a line before it (in the answer's paragraph) and after it (on the end of its last paragraph): putting down what they hold and picking it back up, a count on the fingers, the talker who stopped only to breathe, the guarded one ("I've had chattier telegrams."). A telling does not bring back a prop or a thing the question's last word already paid off. The lines assert nothing: `checkTelling` holds them to naming nobody but the witness, no hour and no place.

**The search**. How he went through the room (the search-act card, which may offer a thing he went through; or the room's prop first), and a last word before any decision or next lead — often the thing he left alone, which the page names after the first find ("I left the suitcase where it was."). The things left alone never include the thing that was taken.

**The recap** (`recapFrame`, its own roll) and **the office** (`officeFrame`). The recap's opening and closing lines around the engine's clauses; a recap refused for want of anything new uses no sheet. The office's first paragraph (the office card, and a join) and a last line before she is left in the chair; the office paragraph may run to 72 words, and a sheet's own lines on page one are the first thing the ceiling takes, before the entrance.

## Measure

Over 280 nights (seeds 1–20 × tiers 0–5 and untiered × the oracle and the wanderer), `npx tsx scripts/sheet-stats.ts --seeds 20 --tiers 0,1,2,3,4,5,none`:

- **Pages written from sheets:** 2,960 of 3,476 (85.2%). The rest are returns, the scene's first page, "Go on" and parser pages.
- **Callback share: 67.4%** of sheeted pages paid a role off (1,994 of 2,960); the roll wanted one on 76.2%. By moment: the arrival page 71.9%, the office 80.0%, the recap 64.3%, the search 66.9%, a question 56.0% (a question page counts with its telling). The designer's number is about seventy in a hundred.
- **Sheet use:**

| moment | sheet | uses |
|---|---|---|
| arrival | arr-a The place, and one thing in it | 229 |
| | arr-b The first thing you noticed | 120 |
| | arr-c In from the night | 51 |
| | arr-d The night, then the place | 163 |
| company | com-a The room looks at me (Sheet A) | 120 |
| | com-b One thing in the room (Sheet B) | 140 |
| | com-c The client waves me over (Sheet C) | 32 |
| | com-d The one I came to see | 178 |
| | com-e Somebody minding the place | 50 |
| | com-f Nobody home | 23 |
| | com-g Faces in the room | 20 |
| ask | ask-a Stool and trade | 524 |
| | ask-b The room first | 520 |
| | ask-c Hands full | 471 |
| | ask-d One more | 322 |
| | ask-e A cool welcome | 96 |
| | ask-f About them, for once | 0 (the players never ask anybody about their life) |
| telling | tel-a Straight | 1,128 |
| | tel-b Put it down | 51 |
| | tel-c On the fingers | 67 |
| | tel-d Could have gone on | 224 |
| | tel-e Not a word wasted | 150 |
| | tel-f Enjoying it | 223 |
| | tel-g Told to the room | 0 (the question's last word nearly always pays the prop off first) |
| search | sea-a The way through | 63 |
| | sea-b The room first | 20 |
| | sea-c One thing, properly | 0 (the players never search one thing) |
| | sea-d A good haul | 38 |
| | sea-e Down on the floor | 10 |
| | sea-f Not much | 2 |
| recap | rcp-a Taking stock | 222 |
| | rcp-b A clean page | 158 |
| | rcp-c My feet | 157 |
| | rcp-d Again | 105 |
| office | off-a The room at midnight | 178 |
| | off-b Good news waits | 12 |
| | off-c A clean notebook | 56 |
| | off-d Still up | 34 |

  The players never put a fact to anybody, so the confrontation sheets are measured on M12's confrontation runs instead (the oracle's route and every lie put, seeds 1–12, Medium and tiers 3–5): 129 confrontations, con-a 42, con-b 26, con-c 23, con-d 10, con-e 28, with 0 coverage, correspondence or lint issues.
- **Repeats in a night:** 6.5 uses a night of a sheet already used that night (a night has fifteen or so pages and a moment five to seven sheets, so sheets come round); **none twice running for one moment while another fitted** (602 twice running where it was the only one that fitted, nearly all `tel-a` and the recap). A sheet that comes round says itself differently: every join and joke has three `alt`s, and a line said tonight waits. Over the four read-through nights below no sheet line is said twice.
- **Beat coverage:** 21,649 of 21,649 required beats written; 0 coverage issues. **Correspondence:** 0 from the engine (the one hit is the generator's seed 15 sentence docs/23 lists under "Not fixed"). **Reader lint:** 0.

## The design test

`npx tsx scripts/diagnose-play.ts --design --seeds 100`, once, at the end, gives the same table as `main` (docs/29-m12-notes.md), line for line:

| config | marks-follower names the culprit | reasoning player: who, when and the column all right, within budget | button-pusher names the culprit | reasoning player: facts put to somebody / run | reasoning player: actions | reasoning player: median calls to solve | median par / budget |
| --- | --- | --- | --- | --- | --- | --- | --- |
| d1 | 99% | 91% (who 99%, column —) | 65% | 0.0 (— landed) | 20.4 | 20 (budget 20) | 12 / 20 |
| d2 | 93% | 84% (who 97%, column —) | 54% | 0.0 (— landed) | 18.6 | 18 (budget 19) | 13 / 19 |
| d3 | 93% | 84% (who 96%, column —) | 50% | 0.0 (— landed) | 16.8 | 17 (budget 17) | 13 / 17 |
| T0 | 23% | 100% (who 100%, column —) | 22% | 0.0 (— landed) | 6.2 | 6 (budget 10) | 7 / 10 |
| T1L1 | 19% | 100% (who 100%, column —) | 18% | 0.0 (— landed) | 7.9 | 8 (budget 15) | 9 / 15 |
| T1L2 | 18% | 100% (who 100%, column —) | 21% | 0.0 (— landed) | 8.0 | 8 (budget 14) | 9 / 14 |
| T3L2 | 28% | 98% (who 98%, column —) | 25% | 0.1 (100% landed) | 10.0 | 9 (budget 14) | 9 / 14 |
| T2L1 | 28% | 99% (who 99%, column —) | 28% | 0.1 (100% landed) | 8.7 | 9 (budget 13) | 7 / 13 |
| T2L2 | 31% | 97% (who 97%, column —) | 25% | 0.1 (100% landed) | 8.7 | 9 (budget 11) | 7 / 11 |
| T2L3 | 35% | 95% (who 95%, column —) | 26% | 0.2 (100% landed) | 9.0 | 9 (budget 10) | 7 / 10 |
| T4L1 | 22% | 91% (who 93%, column 96%) | 16% | 0.5 (92% landed) | 14.6 | 14 (budget 21) | 13 / 21 |
| T4L2 | 24% | 85% (who 88%, column 93%) | 18% | 0.4 (97% landed) | 14.9 | 14 (budget 18) | 12 / 18 |
| T4L3 | 30% | 74% (who 84%, column 90%) | 29% | 0.6 (100% landed) | 14.6 | 14 (budget 17) | 13 / 17 |
| T5L1 | 21% | 81% (who 85%, column 94%) | 27% | 2.3 (95% landed) | 22.2 | 21 (budget 27) | 17 / 27 |
| T5L2 | 19% | 84% (who 89%, column 95%) | 17% | 2.4 (96% landed) | 21.8 | 22 (budget 25) | 17 / 25 |
| T5L3 | 24% | 72% (who 78%, column 90%) | 19% | 1.9 (97% landed) | 21.1 | 20 (budget 23) | 17 / 23 |

A first run moved Raw and Coddled by a point (T0's marks-follower 23% → 24%, T1's button-pusher 18/21% → 19/20%). The cause was words after all: Sheet C's list named a stranger and a fixture that the crowd line would have counted, and a name on a page is a person the player may ask about. The list now names exactly whom the plan's page names, and `test/m13-sheets.test.ts` plays the same commands with the sheets on and off and compares the choices offered at every step, as well as the notebook, clock, leads, volunteers, pages and confrontations.

## Checks

- **Tests:** the full suite, once at the end: 49 files, 906 of 906 (`npx vitest run --minWorkers=1 --maxWorkers=3`); `npx tsc --noEmit` clean. `test/m13-sheets.test.ts` is new (18 tests: the format and the counts, one joke a sheet, Sheet A as the golden wrote it, no machinery or verdict in any sheet line, pay line or sheet close, a role never makes machinery of a line, cut points, binding and paying off, the plain close, filling, conditions, the chooser's memory, the roll's share, every moment on the page, the callback share over 64 nights, never twice running while another fits, coverage, seed 3's speakeasy, and the same night and choices with the sheets on or off). Older tests brought to M13, each with a note: `m11-people` (a sheeted arrival says the observation where its company sheet puts it and ends on the sheet's last line), `m8` (the one the page ties to the case may be named in the observation's own line), `game/voice` (the run remembers `sheet:` and `line:` ids), `m6` (the share of pages past 220 words is 25.5% with the sheets' last lines; its bound is 28%).
- **Beat coverage 100%, correspondence 0, reader lint and plain terms clean**: as above, over the 280 nights; the tests' own sweeps (M8, M9, M10, M11, M12) pass; `npm run decks`: 6,515 cards across 46 decks and 43 sheets, 0 errors, 0 banned terms.
- **M14.** `main` has not moved since a5ce597; nothing of M14 is merged yet. Every sheet can take a case type (`when.caseType`), none needs one, and no sheet line says body, murder or killer.

## Where I judged

1. **The arrival page is two sheets, the arrival and the company**, as the golden describes a page ("an arrival sheet … followed by a company sheet"), and A, B and C are each split into their halves. The halves mix: arr-a with com-b, arr-b with com-a. The company sheet is chosen after the arrival has run, so it knows whether there is a prop to place people by.
2. **The tell in Sheet A gets no description of their own.** The golden gives Crowninshield only the tell line; I followed it. Everybody else met for the first time still gets M11's three to five sentences, in a paragraph of their own.
3. **The observation moves.** M11 closed an arrival on the observation; now it is the sheet's tell line, and the page closes on the sheet's last line. The observation is still said, always, and traced.
4. **Callbacks are a page's, not a sheet's.** The roles a page's sheets bind are shared: the arrival's prop is the company's close; a question's look is its last word; a telling won't bring back what the last word already did.
5. **The golden's own lines first.** A sheet says its `text` the first time in a night and its alts after, so Sheet A reads as blessed the first time it comes.
6. **A prop that cannot be stood by is not for Sheet B.** "Across the room from the far shore" is why `propNear` gates com-b; a room's texture is never read twice in a night, and a hole with no fresh card goes empty.
7. **The page may be a line longer.** An arrival now has a closing line and a search a last word; M6's share past 220 words went from 22.9% to 25.5%.

## Not fixed

- **ask-f, tel-g, sea-c** never came up in the measured runs (see the table); they are validated, and tel-g and ask-c were read on hand-picked routes.
- **The confrontation's callback** is paid on about one in five: its setup rarely binds a trait the close can reach (the look's trait only binds on the first word to them, and a confrontation's close is more often M12's own).
- **Counterman look cards at the pawnshop.** The counterman's cards mention a grill; the role covers the pawnshop and the barber's too, so "a burn scar where the grill had won an argument" can land on a pawnshop's man (seed 3 tier 3). The deck needs a place tag.
- **"On the bench … who was sitting in a hard chair."** M12's seat check knows stools, tables and benches, not chairs (seed 12, tier 2, page 9).
- **The notebook's own lines repeat** ("I wrote it in the book." three times a night): those are the engine's, not the sheets'.

## Read-through

Rendered after the last change (`npm run read -- --seed N --tier T --no-choices`), every page read against Sheet A. What read wrong and was the engine's is fixed in the commits: a watcher's look card that presumed a conversation; a street card's "him" after somebody else's sentence (the `named` form); "within reach of the ceiling fan"; "the globes … not looking at it"; the observation said twice (a placed line and then the observation); a telling bringing back the bulbs the last word had just brought back; a search leaving alone the bonds that were stolen; the office's close line pushing the entrance off page one; "The notebook had its first page filled" (the machinery); "the stagehand at the Selwyn Dettweiler had told me to start with"; the same sheet line three times a night; "From her side of the room" on a stair.

Seed 3's speakeasy arrival (page 8) came out as Sheet C, the golden's own C fill nearly word for word ("Hauck saw me before I saw her. She smoothed the new gloves again…", "“You took your time,” she said. “I’ve been here long enough to be charged rent.”"), and closes on the rundown's setup. Sheet A fires at seed 12's cab stand (tier 2, page 3), the watcher's scarf paid off by the last line; at seed 3, tier 3, Zelinsky's (page 7); and Sheet B at seed 7's Kaplan's (tier 5, page 6), the golden's own B case, placed by the ceiling fan.

### Seed 3 at Medium (tier 4), the oracle

```
my office                                             12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a room behind a door with my name on it, three
flights up off Mulberry Street, in Little Italy. My knuckle had split open
again in the same place as last month, which was at least consistent of it.
Frost had crept across the window glass from the inside.

Hauck came up the stairs slow, like somebody not sure they wanted to arrive.
My stairs have that effect. She wore gloves new enough that a price tag was
still folded down inside one cuff, where a saleswoman had missed it. She had
not noticed either, or had not cared to.

Ilse Hauck was a woman in her thirties. Quick on her feet and quicker with
her eyes, she checked her watch twice in the first minute without ever
seeing what it said.

“My name is Ilse Hauck,” she said. “I am Isidore Sirkin’s sister-in-law. He
is dead.”

I let that sit. It was the only thing in the office doing any work.

“Sirkin was a buildings inspector,” Hauck said. “He could close a building
with a signature, and had closed two. Nobody on this street is going to send
flowers. He was found dead at the walk-up. Crowninshield found him at the
walk-up at half past eleven.”

“And the police?”

“The precinct wrote it down as a fall and closed the book on it. The door at
the walk-up was locked and the windows were painted shut. There is one key
to the walk-up. It was on its hook at the third floor this morning. The
coroner puts it between eight o’clock and half past eight.”

“Why me, and not the precinct again?”

“I want it settled quietly. If I wait, it gets settled loudly instead. I am
paying for two things. One is that it is found. The other is that nobody
hears about it.”

She traded on the street for men who would rather not be seen doing it. Half
the block had bought something from her once. The other half had been talked
out of it by the first half.

“Where would you start?”

Hauck smoothed the new gloves again, the price tag still folded in one cuff.
“Start with Steinbach. Steinbach blamed Sirkin for the ruin of his
business.” I named my rate, a little high, in case. Hauck put a hundred
dollars on the desk without arguing, and I wished I’d said more.

The frost had got halfway across the window while we talked. It was making
better progress than I was.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 438 words]

the walk-up                                           12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

Hauck set me on it. I came to give the room a proper going-over, which is
more than my own room ever gets.

The cold had sent everybody indoors early. The front steps had a skin of
frost on them. You climbed to the walk-up by an outside stair fixed along
the rear wall, the kind landlords added when the front one got too crowded.
It smelled of the drugstore's cherry syrup all three flights up. At this
hour nobody else on the stair was coming or going. There was nobody on duty,
and nobody to ask who had been by. The police had called it a fall and gone
home.

Sirkin lay where he had fallen. Nobody had covered him yet. There was nobody
else in the room. A glass was on its side and the spill had not yet reached
the edge of the table when it dried. The whistle went off the river at half
past eight, two long and one short, and the boat’s log had the hour.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death between eight o’clock and half past eight.
Chloral, a sleeping drug, in the stomach. No wound, no bruising, no sign of
a struggle.

If it held, it was over by about half past eight. What people did before
then counted. What they did after didn’t. If it was poison in a drink,
whoever did it had to get at the chloral and put it in the drink first.

[1 action, 2 written down, 259 words]

the walk-up                                           12:55 AM   page 3
────────────────────────────────────────────────────────────────────────────

No one had pointed me at the room. I went through it on my own account.

I took it from the landing in: the coat hooks, the little table, the shelves
by the stove, then the bed and the space behind the dresser. I finished at
the window over the drugstore sign. There was an IOU for $4,000 signed by
Crowninshield, made out to Sirkin, three months past due.

There was a strapped suitcase in the room, and a length of sash cord. I left
them both alone for now.

That was motive, plainly: Crowninshield owed Sirkin four thousand dollars
and was past due on it.

There was a typed page of dates and sums in Sirkin’s file, headed with
Marchetti’s name. Marchetti used to work for Sirkin.

So Marchetti was about to be exposed by Sirkin. That was a reason, if
Marchetti needed one.

There was a clipping about the failure of Steinbach’s business, with
Sirkin’s name underlined twice in pencil.

That gave Steinbach a reason: Steinbach blamed Sirkin for the ruin of
Steinbach’s business. The drugstore sign was still lit under the window when
I left. At least somebody on the street was keeping regular hours.

Somebody had to account for the key at eight o’clock. Rafferty was the one
to ask. She was the landlady at the third floor.

[1 action, 3 written down, 222 words]

the third floor                                       1:20 AM   page 4
────────────────────────────────────────────────────────────────────────────

The key was the question, and Rafferty was the one to put it to.

I had until eight, and it was already past one. The third floor was up two
flights from the street door. The stairs were bare, the banister loose in
two places. At this hour most of the building was dark but for one lit
window on the top floor. Across the air shaft a radio played dance music low
behind a drawn shade, a band going round and round the same tune and never
getting anywhere with it.

Rafferty, a woman in her forties, was counting out coins from a rent
envelope, stacking them by denomination and trusting none of them. She was
the landlady. The street said she was hard and the tenants said she was
fair, and neither of them was wrong.

Rafferty watched the door the way any landlady did, without appearing to.
She was the only one there, and had the look of somebody who liked it that
way.

It made for a short list. I’ve worked with shorter, but not by choice.

[1 action, 181 words]

the third floor                                       1:45 AM   page 5
────────────────────────────────────────────────────────────────────────────

I had a question about the key, and Rafferty was the one to ask.

I sat down on the step below Rafferty and put my hat on the step beside me,
where it would get the worst of the draught. She had the look of a woman who
had heard every excuse for late rent and kept a drawer for each of them.

I asked her what she knew about the key.

“Here’s what I know about it,” Rafferty said. “There has only ever been the
one key to the walk-up. It lives at the third floor. Marchetti had it off
the hook that evening. I don’t say a thing about my tenants unless I know
it. I don’t say it to make trouble. I say it because it’s so.” Rafferty was
enjoying this more than I was, and I was the one being paid for it.

I wrote it in the book. Marchetti could have reached the walk-up without
asking anybody. That made Marchetti possible, and no more than that.

“Any faces you couldn’t put a name to?”

Rafferty had noticed, and was pleased to have noticed. “A woman under forty
at ten o’clock. I didn’t know her. I don’t learn names off the backs of
people’s coats. People around here don’t stop to be known, and I don’t ask.”

A woman under forty at the third floor at ten o’clock, and no name to go
with it. Somebody in the case would fit, or nobody would. Every stranger is
somebody’s cousin. That’s the trouble with this neighbourhood.

People who are owed money keep track of the people who owe it. Vitale was
Sirkin’s creditor, and Rafferty was the one to ask about Vitale. Rafferty
was still in front of me.

[1 action, 2 written down, 292 words]
[gap: no-fact: overheard (t002) states nothing structured; its own line stands]

the third floor                                       2:15 AM   page 6
────────────────────────────────────────────────────────────────────────────

It was two now. Rafferty hadn’t gone anywhere, and neither had I. She leaned
in, glad of the company.

Vitale had lent Sirkin money. I asked her about Vitale’s evening, as much of
it as she had seen.

Rafferty had plenty to say, and started at once. “I saw him here from seven
until half past. He was back at nine o’clock.”

“What about the other hours of the evening?”

“Not here. I’d have heard him. I hear the mice. I don’t miss much. Some
nights I wish I did.”

I put it in the notebook. So Vitale might not have been at the third floor
at eight o’clock. It was worth remembering if Vitale ever claimed it. I gave
the notebook a pat. It was getting heavier, or I was getting tired.

Rafferty was next. The question was the third floor, around eight o’clock. I
wasn’t done with Rafferty yet.

I turned to a clean page and wrote out what I had, in order, the way they
teach you and nobody does it.

Sirkin died at the walk-up between eight and half past eight. The whistle
off the river was at half past eight, and so far it was the only honest
clock on the street. The how of it was poison in a drink.

Vitale’s evening I had only from Rafferty, and it had a hole in it between
eight and half past eight. Nobody had told me where Hauck, Crowninshield,
Marchetti and Steinbach were between eight and half past eight, and none of
them had told me either.

The page looked tidier than the night did. Neat handwriting will do that. I
wanted Rafferty next, about the third floor, and then Hauck to tell me her
evening in her own words.

[1 action, 1 written down, 294 words]

the third floor                                       2:40 AM   page 7
────────────────────────────────────────────────────────────────────────────

I had a reason to ask about the third floor, and Rafferty was the one to
ask.

Every door on the third-floor landing had a number painted on it and nothing
else, and the paint was chipped to the wood.

I had another one for Rafferty. She brightened, which is what that kind does
when you come back.

“How many came in tonight?” I asked. “Everybody, in order.”

Rafferty liked this question. It was the first thing all night anybody had
liked about me. “One came in at half past six. One at half past eight. Two
at nine o’clock. One at half past nine. At half past ten it was Ilse Hauck,
and nobody with her. I sit where I can see the door. Nobody goes up without
I know it.” Rafferty had used up one hand on it and was starting on the
other.

I wrote it in the book. Only the ones Rafferty named went into the third
floor at half past ten. If anybody else said they were there then, Rafferty
said otherwise.

“And people you didn’t know? Anybody?”

Rafferty was pleased to have something to tell. “A woman under forty at half
past six. Then a man in his thirties at half past seven and one from half
past eight until half past nine. One or two I knew by sight. None of them by
name. If I don’t rent to somebody, they’re nobody to me.”

Rafferty had no name for a woman under forty. Whoever it proved to be had
been at the third floor at half past six. Every door on the landing had a
number and nothing else. It seemed a sensible way to live. Nobody knocks on
a number.

[1 action, 9 written down, 288 words]

the speakeasy                                         3:05 AM   page 8
────────────────────────────────────────────────────────────────────────────

Hauck had said as much, and my feet had made me promise to keep it short. I
had come to ask Crowninshield about Hauck, nothing more.

It was three by every clock in the neighborhood, and for once they agreed.
The speakeasy was an illegal bar under a hat shop, down six steps and
through a door you had to knock on, a formality, since everybody knew about
the door. The first thing you noticed was the hat shop’s floor overhead,
giving a long creak as the building settled.

Hauck saw me before I saw her. She smoothed the new gloves again, the price
tag still folded in one cuff.

“You took your time,” she said. “I’ve been here long enough to be charged
rent.”

From where she was you could see all of it, the floor overhead included:
Hargrove counting the bottles on the back shelf, Vitale tapping a pencil
against a slate of odds and Marchetti reading the back of a matchbook.
Hargrove was the bartender at the speakeasy.

Crowninshield was there too, waiting, the woman who had found Sirkin.
Nothing crossed that bar that Hargrove didn’t notice, including the change.

She leaned in. I was about to be introduced to the whole room, whether it
liked it or not.

[1 action, 212 words]

the speakeasy                                         3:35 AM   page 9
────────────────────────────────────────────────────────────────────────────

I took the stool next to Crowninshield. She watched my mouth while I talked,
which is a professional habit and not a comfortable one.

Hauck had married into Sirkin’s family. I asked her where Hauck had been
tonight.

Crowninshield didn’t have to look anything up. “I saw her here from half
past eight until ten. She was back at eleven o’clock. While the fight was on
the radio, she was here. I was there. I saw it myself. I don’t keep track of
her beyond that. I’ve got my own troubles.”

I wrote it down. Hauck at the speakeasy at half past eight. That was inside
the time the coroner gave, if the word was good.

“And where were you, all evening?”

“All right,” Crowninshield said. “I was at the subway kiosk at seven
o’clock. Then the third floor, at half past seven. From eight until half
past nine I was here. A person knows where they’ve been. I do, anyway.
Nothing worth telling, but you asked.”

I had an evening from Crowninshield, and I kept it apart from what the
others had seen. I closed my mouth when I was done and kept it closed.
There’s only so much a dentist should see for free.

Sirkin and eight o’clock: that was the next question, and it was for
Crowninshield. I wasn’t done with Crowninshield yet.

[1 action, 2 written down, 226 words]

the speakeasy                                         4:00 AM   page 10
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at Sirkin. Crowninshield was the one to
ask.

I had lost track of the time. It was past four. I pushed my glass an inch to
one side and turned back to Crowninshield. She had hoped one question would
be the end of me. Most people do.

I asked her where Sirkin had been tonight.

“I saw him at the subway kiosk from six until seven. At half past seven he
was at the third floor. At eight o’clock he was here. I know his face and I
know his walk. I don’t keep a clock on people. I just notice.”

I put it in the notebook. Whoever did it had been at the walk-up at half
past eight. That was the time everybody would have to account for. Somebody
always sees you. It’s the one thing this neighbourhood does for free.

If anyone knew where Crowninshield had been tonight, it would be Steinbach,
at the subway kiosk.

The hour that mattered had got smaller, and I went over everything else
against it.

Sirkin died at the walk-up at half past eight.

For Hauck I had Crowninshield’s word, and nothing of her own. Crowninshield
had told me her evening, and so far nobody else had said a word about it.
Marchetti I had only seen, at the speakeasy. Nobody had told me where
Vitale, Marchetti and Steinbach were at half past eight, and none of them
had told me either.

The hour that mattered was smaller than it had been. So, by then, was my
patience. I wanted Steinbach next, about Crowninshield, and then Vitale’s
own account of his evening.

[1 action, 1 written down, 276 words]

the speakeasy                                         4:25 AM   page 11
────────────────────────────────────────────────────────────────────────────

The speakeasy had come up, and I wanted to hear about it from Crowninshield.

The ceiling was low and crossed with the hat shop's pipes, and a string of
coloured bulbs ran along the bar beneath them.

I kept my stool and turned back to Crowninshield. She looked at me, then at
the clock, and decided I was still there.

I asked whether anybody had come through that she didn’t know.

Crowninshield thought about the faces. “A man in his thirties from eight
until half past, one at eight o’clock and one from half past nine until
eleven. Then a woman under forty from nine until half past. One or two I
knew by sight. None of them by name. I don’t know everybody. Nobody does.”

No name from Crowninshield, only a man in his thirties. I wrote it down the
way it was said. I kept my hat on under the pipes. It seemed only polite,
considering whose pipes they were.

[1 action, 4 written down, 162 words]

the subway kiosk                                      4:55 AM   page 12
────────────────────────────────────────────────────────────────────────────

Steinbach would know about Crowninshield.

Ice had skinned over the puddles in the gutter. A lone figure crossed fast,
breath trailing behind him. The subway kiosk was open at all hours, being a
stair and not a building, and no one minded who used it. A single bulb lit
the top step, brighter than anything the bottom ever got. This late that
stair saw fewer people than at any other hour of the day. Down the stair the
tiled passage ran off under bare bulbs, and the only sound coming up from it
was a drip somewhere out of sight.

I saw Steinbach before he saw me, which is the right way round. He was
checking a small watch pinned to a collar, the man Hauck had told me to
start with.

Renfro, a man in his fifties, was eating an apple in small bites, looking
around between them. He was the patrolman on the beat. The street liked him
because he knew when not to see something.

The drip down in the passage kept on, one at a time. I counted a few. It
didn’t help, but it was something to be good at.

[1 action, 195 words]

the subway kiosk                                      5:20 AM   page 13
────────────────────────────────────────────────────────────────────────────

The hour was five now. I fell in next to Steinbach and turned my collar up.
He had the patient, faintly pained face of somebody who listens to children
practise for a living.

Crowninshield rented from Sirkin. I asked what he had seen of Crowninshield
tonight.

“Oh, I know her all right,” Steinbach said. “I saw her here at six o’clock.
She was back at seven o’clock.” He went on. “At half past seven she was at
the third floor. At eight o’clock she was at the speakeasy. When the whistle
went off the river, she was here. I know her. There’s no mixing her up with
anybody.” Steinbach stopped there, but only to breathe.

I wrote it down. Crowninshield had been at the subway kiosk during the
whistle off the river. That went more than once a night, and I knew only one
of the times.

“And you? Where were you tonight?”

“You want the whole evening? Fine,” Steinbach said. “I was here at seven
o’clock. Then the third floor, at half past seven. Then the speakeasy, at
eight o’clock. Then the third floor, from half past eight until half past
nine. That’s the order it happened in.”

It was an account, not a sighting. Nobody had vouched for any of it but
Steinbach. I got the same patient, pained face the children get. I’d have
practised, if I’d known.

[1 action, 2 written down, 231 words]
```

### Seed 11 at Raw (tier 0), the oracle

```
the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a room at the end of a hall over a Chinese laundry
on Great Jones Street, in the Bowery. The mirror over the washbasin showed
more of the night before than I wanted explained. I turned the lamp away
from it. A woman came up the stairs after midnight.

Steinbach came in composed, her gloves still on, and took the chair before I
could offer it twice. She opened a compact before answering anything hard,
checked nothing in it, and closed it again. The powder inside was worn
through to bare metal in one spot, from the same two fingers every time.

Klara Steinbach was in her thirties. Quick on her feet and quicker with her
eyes, she checked her watch twice in the first minute without ever seeing
what it said.

“My name is Klara Steinbach,” she said. “I am Wilhelmina Lindemann’s
creditor. She is dead.”

I didn’t say anything. She wasn’t finished, and I had nowhere to be but
here.

“Lindemann was a society columnist,” Steinbach said. “She could put a name
in the paper, and had put several there for good. Half the city wanted to be
in the column, and the other half wanted to stay out of it. She borrowed
from me to pay off another debt. It was never mentioned to anybody. Not by
either of us. She was found dead at the walk-up. That is where it happened.
Half past eleven. That is when I found Lindemann at the walk-up.”

“I take it the police have been.”

“The precinct came, walked through it, and went. It was a blunt object. The
coroner puts it at half past nine, and will swear to the half hour.”

“Why me, and not the precinct again?”

“I want the one who killed Lindemann found. The precinct has stopped
looking. That is why I am here. I know that asking questions on this block
is a way of being asked some. I know that much.”

She traded on the street for men who would rather not be seen doing it.

“Who would you start with?”

Steinbach opened the compact again, looked at nothing, and shut it. “Start
with Donnelly. He was in and out of there all week.” I named my rate, a
little high, in case. Steinbach put a hundred dollars on the desk without
arguing, and I wished I’d said more.

I didn’t look in the mirror over the washbasin. One of us had had a long
night, and it wasn’t the mirror.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 438 words]

the walk-up                                           12:55 AM   page 2
────────────────────────────────────────────────────────────────────────────

Steinbach had named it first. I came to go through it, drawer by drawer.

It was a clear night and a still one. I could hear my own heels on the
pavement going up to the door. The walk-up sat over the drugstore, up a
flight that started just past the pharmacy's side door. The stairs were bare
wood, no runner, no light past the second landing. This late the drugstore
below had been closed for hours, its window dark. Nobody kept a list of who
came and went, on paper or in their head. The police had come and gone.

Lindemann was still on the floor where she had fallen. There was nobody else
in the room. The lamp came down in the fall and the bulb was still warm in
its socket, unbroken. The singing under the window stopped at half past
nine, when the shoe came down.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death at half past nine. One blow broke in the back of
the skull. Death was not instant.

Lindemann would have been dead by about half past nine. That was the latest
it could have been. Anything anybody had timed by the drunk singing under
the window had that hour too.

[1 action, 2 written down, 219 words]

the stairwell                                         1:45 AM   page 3
────────────────────────────────────────────────────────────────────────────

I wanted to hear Steinbach tell the evening.

Across the way a window went dark. It was past one, and somebody had finally
gone to bed, the lucky devil. The stairwell ran up the middle of the
building, bare bulbs on alternating landings, the rest left dark to save on
the electric bill. The first thing you noticed was a bare bulb on the
landing, buzzing on its wire.

Steinbach saw me before I saw her. She opened the compact again, looked at
nothing, and shut it.

“Well?” she said. “Sit down. The police already stood around, and look where
that got anybody.”

From where she was you could see all of it, the bare bulb included: Corrigan
counting rent money out of a tin box and a man and a woman I didn’t know.
Corrigan was the landlady at the stairwell.

Donnelly was there too, reading a folded newspaper, the man Steinbach had
told me to start with. Corrigan kept the building and knew who came and went
by heart.

She had the whole room sorted and labelled, and was only waiting for me to
sit down.

[1 action, 188 words]

the stairwell                                         2:40 AM   page 4
────────────────────────────────────────────────────────────────────────────

I wanted Steinbach’s evening, hour by hour.

Somewhere, two had already come and gone. Brown paint covered the walls to
shoulder height and green above, and the green had flaked away in patches
the size of a hand.

I caught up with Steinbach on the stair. She kept one eye on me and the
other on the door, in case a better customer came through it.

I asked her for her evening, start to finish.

Steinbach told it simply. “I was here at eight o’clock. Then the ferry slip,
from half past eight until ten. At half past ten I was here. I can give you
every place, in the order I went. I didn’t expect anybody to ask about it.”

I wrote that down. It was an account, not a sighting. Nobody had vouched for
any of it but Steinbach. The green paint went on coming off the wall in
patches. I kept my shoulder off it. My coat has enough on it already.

I had a question about Steinbach, and it was for Donnelly. Donnelly was
right there.

Another hour had gone, and I went over what it had bought me.

Lindemann died at the walk-up, at half past nine. The drunk singing under
the window was at half past nine, and so far it was the only honest clock on
the street. As for how, it was a blunt object.

Steinbach had told me her evening, and so far nobody else had said a word
about it. Donnelly I had only seen, at the stairwell. Nobody had told me
where Donnelly and the woman in her twenties were at half past nine, and
none of them had told me either.

I put the pencil away. It had worked harder than I had, and it hadn’t
complained once. I’d ask Donnelly about Steinbach next.

[1 action, 1 written down, 306 words]

the stairwell                                         3:35 AM   page 5
────────────────────────────────────────────────────────────────────────────

A cab went by slowly, looking for a fare. It took one look at me and kept
going. It was after three. I climbed up to Donnelly, who was reading a
folded newspaper. He had the look of a man who could tell you what anything
was worth, and what you’d take for it.

“Lindemann had a creditor,” I said. “Steinbach.”

“Klara Steinbach.”

“Where was Steinbach tonight?”

“I know her to say hello to,” Donnelly said. “I saw her here from six until
eight. At nine o’clock she was at the ferry slip. From half past ten until
eleven she was here. It’s not a face I’d get wrong.” Donnelly stopped there,
but only to breathe.

I put it in the notebook. Steinbach could have got into the walk-up without
much trouble. That was a reason to keep asking.

“Now your own night, if you don’t mind. And if you do mind, the same.”

Donnelly started talking before I had finished asking. “I was here from
eight until half past. Then the ferry slip, at nine o’clock. From half past
nine until half past ten I was here. I know how I spent my own evening. If
I’d known anybody would ask, I’d have done something worth hearing about.”

It was a whole evening on Donnelly’s say-so. That didn’t make it false. It
made it something to check. I licked the pencil and wrote it down. It’s the
only part of the job that tastes of anything.

The next question was Donnelly, and it was for Mulcahy. Mulcahy did business
with Lindemann. She was right there.

[1 action, 2 written down, 266 words]

the stairwell                                         4:25 AM   page 6
────────────────────────────────────────────────────────────────────────────

Past four, and eight was not getting any further off. I stopped two steps
below Mulcahy, which is a bad place to ask anybody anything. She was between
engagements and dressed for the next one, just in case it walked in.

Donnelly did business with Lindemann. I asked her about Donnelly’s evening,
as much of it as she had seen.

“I saw him here from six until half past eight. He was back from ten until
half past eleven. I’ve seen enough of him to know him.”

I got it down on paper. A way into the walk-up was something Donnelly had
and most people didn’t. It might mean nothing.

“And you? Where were you tonight?”

Mulcahy took a moment to get it straight first. “I was here from eight until
half past ten. I remember it clearly enough. It wasn’t that long ago.
Nothing worth telling, but you asked.”

Mulcahy had given me the evening start to finish. It was the only account of
it I had so far. The next engagement didn’t walk in. I did, which was
nobody’s idea of a booking.

I got the notebook out again. We were getting to know each other.

Steinbach had given me her evening, and Donnelly’s word sat under part of
it. Donnelly’s evening had Mulcahy backing up some of it. Mulcahy had told
me her evening, and so far nobody else had said a word about it.

I put the notebook away. It had more in it than last time, and it looked
about as tired as I did. It was time to hold the evenings I had up against
each other and see where they didn’t meet.

[1 action, 2 written down, 279 words]

the stairwell                                         4:25 AM   page 7
────────────────────────────────────────────────────────────────────────────

No one sent me to Corrigan. I asked about Mulcahy anyway; I’m self-employed.

Water pipes along the stairwell wall knocked as something drained through
them from the top floor, and then the stairs went silent.

I met Corrigan on the landing, which was the only flat place in the
building. She counted everything, and I got the feeling I was being counted
too.

I asked her where Mulcahy had been tonight.

Corrigan knew me from before, and that saved us both some time.

She nodded at the name. “I saw her here from six until half past seven. She
was back at half past eight. And again from ten until half past eleven.”

“Any time you can say she wasn’t around?”

“Not at the ferry slip at eight o’clock. Not here from nine until half past.
I know her step. I’d know it in my sleep.”

I wrote it down. At half past nine, Mulcahy claimed the stairwell. This took
Mulcahy out of it. I said thank you. It’s cheap, and people remember it.

I started a clean page with Mulcahy’s name at the head of it. It could wait
an hour. It could not wait all night.

[free, 1 written down, 198 words]
```

### Seed 7 at Hard (tier 5), the oracle

```
the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a desk in a shared room over a printer’s on East
Eighty-Sixth Street, in Yorkville. I counted my wallet twice, hoping for a
mistake, and it came to eleven dollars both times. The rent was thirty. Fog
stood against the window and hid the street, which suited me. Good news
waits for morning, like a gentleman. The other kind takes the stairs.

“Still here, Dashiell,” Weisglass said, and took the chair without waiting
to be offered it. A fine white dust sat in the creases of her knuckles,
plaster rather than flour, the kind that gets into the skin over a long day
and does not fully wash out by morning.

Minnie Weisglass was a woman in her thirties. The flat shoes and thick
ankles were those of somebody who climbed stairs all day, and she had the
look of being ready to be off again the moment anybody rang.

“I am Isaiah Renfro’s former employee,” she said. “He has not been seen
since eight o’clock on Tuesday evening.”

I didn’t say anything. She wasn’t finished, and I had nowhere to be but
here.

“Renfro was owed favours by people who would rather not be reminded of
them,” Weisglass said. “I worked for him four years. I was let go in ’23,
without a reference. Broadnax saw Renfro at the Automat at eight o’clock.
Nobody has seen Renfro since.”

“What did the police make of it?”

“The precinct came, looked at the room, and said to wait a day or two.
Renfro’s coat and hat are still on the hook and the money is still in the
drawer.”

“Why me, and not the precinct again?”

“I want what I am owed. Renfro has it, and I mean to be paid whichever way
this ends. The money I am spending is money I was owed. I may never see any
of it. I am spending it anyway.”

She did eleven rooms a day and the linen after. The guests never noticed
her, which was the point, and the other maids said she noticed everything,
which was the joke.

“If it were yours to do, where would you start?”

“Start with Dettweiler. She wanted Renfro out of the lease and the lease in
her name, Dashiell.” Weisglass rubbed at the white dust in her knuckles
again. Twenty dollars changed hands quick, the way it does between two
people who’ve both been broke.

I sat back and let it settle. It’s the last quiet minute a case gives you.

She was still in the chair. I had a question or two for her before she went.

[free, 1 written down, 437 words]

the subway kiosk                                      12:20 AM   page 2
────────────────────────────────────────────────────────────────────────────

Weisglass had sent me. I came to search the place.

Fog softened the streetlamps to a string of pale rings. Nobody was about,
and every railing I touched was beaded with damp, and before long so was I.
The subway kiosk threw a little iron shadow over the stair going down.
Nobody watched who came up it or went down it, day or night. At this hour
hardly anyone used it.

There was no sign of Renfro, and nobody had expected one.

Renfro was not at the subway kiosk and had not been since that evening. The
room was left tidy and the bed was not slept in. The milk wagon was at the
corner at half past eight, where the driver’s round put him every night.

Nobody could put it closer than between seven o’clock and half past eight.
The precinct took a statement and filed it. A grown person was allowed to go
where they like.

If it was a train out, and the timetable it was read off, somebody had to
read the departures off the wall: Renfro, or whoever took Renfro.

Alfano would know when the milk wagon on its rounds came by. He was the man
behind the counter at the Automat.

[1 action, 2 written down, 207 words]

the fourth floor                                      12:40 AM   page 3
────────────────────────────────────────────────────────────────────────────

Nobody had mentioned the fourth floor. I went to see what was there.

The fog had come in off the river and settled between the buildings. I could
see the door and not much past it. The fourth floor was reached by a narrow
stair round the back, the kind that creaked on every other step and
complained about the rest. The lock was nothing special, a five-cent job any
building super could open. At this hour the rest of that floor stayed quiet,
every door shut. No clerk, no doorman, nobody behind a counter: nobody saw
who came. In the kitchen a tap dripped into a chipped enamel sink, one drop
every few seconds, onto a rust mark it had been working on for years.

There was nobody there. I checked twice, which is once more than an empty
room needs. It came to nothing, and I told myself so plainly.

The tap went on dripping onto its rust mark. Years at one small job, and it
still hadn’t finished. I admired the dedication, if not the progress.

[1 action, 179 words]

the fourth floor                                      1:00 AM   page 4
────────────────────────────────────────────────────────────────────────────

Nobody had told me to search it. I did, on my own account, which was already
overdrawn.

It was past one, which was later than I liked and earlier than it was going
to get. I took the front room first, low to high: under the furniture, along
the sill, across the tops of the shelves. Then I did the bedroom the same
way and finished in the kitchen by the sink. There was a lease assignment
made out in Dettweiler’s name, waiting only on Renfro’s signature.

A black-lacquered cash box was there, and a framed photograph. I left them
both where they were for now.

Dettweiler wanted Renfro out of the lease and the lease in Dettweiler’s
name. That put Dettweiler among the people with a reason to want Renfro
gone.

There was an IOU for $4,000 signed by Brennan, Renfro’s brother-in-law, made
out to Renfro, three months past due.

So Brennan owed Renfro four thousand dollars and was past due on it. That
was a reason, if Brennan needed one.

The register had a room paid for at nine o’clock, cash, a week in advance,
in a name nobody at the desk could read back.

It put somebody at the fourth floor at nine o’clock, and it did not say who.
I didn’t guess yet. I ran the tap in the sink and washed my hands. It was
the only thing in the place that did what it was asked.

[1 action, 3 written down, 242 words]

the fourth floor                                      1:00 AM   page 5
────────────────────────────────────────────────────────────────────────────

I wasn’t through with the fourth floor yet.

I went on from where I had left off. In the back of a drawer was a bank book
in a name that was not Brennan’s, kept in Brennan’s hand: two hundred
dollars a month for a year. It had Brennan here at eleven o’clock. Four
floors down, the avenue still carried the odd taxi, and its tires drummed on
the cobbles in the stretch outside the building.

That was Brennan’s secret, then: embezzling from an employer. It was a
reason to lie about the hour, and no answer to the disappearance.

[free, 1 written down, 100 words]

Kaplan’s                                              1:15 AM   page 6
────────────────────────────────────────────────────────────────────────────

I came on Weisglass's word. I had a question for Zeldin about Dettweiler.
Zeldin owed Renfro money.

Kaplan’s kept a soda fountain running most of the day and a light on well
past it. The first thing you noticed was a ceiling fan hanging still over
the fountain.

Prentiss, the druggist at Kaplan’s, was wiping down the soda fountain with a
damp cloth under the ceiling fan. Zeldin, a man in his fifties, was reading
a folded newspaper in plain sight of the ceiling fan, and not looking at it
once.

The block came to Prentiss before it went to the doctor, because he was
cheaper and just about as good. Zeldin had come up once tonight already.
People who come up once usually come up again. A druggist's counter saw the
whole neighborhood eventually, and Prentiss had seen most of it.

The ceiling fan hung still over the fountain. It had been told to wait for
summer, and it was waiting. I admired the patience. I’ve never had any.

[1 action, 170 words]

Kaplan’s                                              1:35 AM   page 7
────────────────────────────────────────────────────────────────────────────

A weighing scale stood by the door with a round mirror in its front, and the
floor was small black and white tiles, worn grey by the fountain stools.

I stepped up to the counter beside Zeldin and lit a cigarette, to give my
hands something to do while my mouth worked. He was friendly, with the
friendliness of a man who knows exactly what you owe him.

Dettweiler lived across the airshaft from Renfro. I asked him where
Dettweiler had been tonight. I put a nickel on the counter for his coffee.
At that hour it’s practically a bribe.

“Sure, I know her,” Zeldin said. “I saw her at the fourth floor at eight
o’clock. At half past eleven she was here.” He kept going. “While the milk
wagon was in the street, she was at the Automat. Another time, she was here.
I know her voice and I know her coat.”

I got it down on paper. That put Dettweiler at the fourth floor at eight
o’clock, if it held, and that was inside the hours that mattered. It was one
pair of eyes on one person, and it went in beside the others.

“And yourself? Where did your evening go?”

Zeldin told it in order. “I was at the Hallam with Lotte Dettweiler at seven
o’clock. Then the Automat, at half past seven. Then the fourth floor, at
eight o’clock. Then the Hallam, from half past eight until nine. At half
past nine I was here. That’s the order it happened in.”

The account was Zeldin’s. If any hour of it was wrong, somebody else would
be the one to show it. I didn’t get on the scale by the door. I knew what it
would say, and the little mirror would show me taking it badly.

Zeldin came next. Whitfield might know where Zeldin had spent the evening.
He was the elevator man at the Hallam.

[1 action, 2 written down, 320 words]

the Hallam                                            1:55 AM   page 8
────────────────────────────────────────────────────────────────────────────

I came to ask Whitfield about Zeldin.

The Hallam kept a night bell in the vestibule for callers after the desk had
closed. At this hour it rang rarely, and everyone in the building knew it
when it did. Through the street doors' glass the avenue's signs showed red
and white, and the marble squares took a faint wash of their colour.

I saw Weisglass before she saw me, which is the right way round. She was
waiting, the chambermaid who was paying me.

Whitfield, a man in his thirties, was oiling the hinges of the gate from a
small can, working it back and forth. He was the elevator man. The tenants
at the Hallam said he knew which floor you wanted by your shoes and whether
you’d had a good day by your hat.

Whitfield ran the elevator and saw every floor anybody wanted.

I kept my hat on and my eyes open, which is most of what I know how to do.

[1 action, 165 words]

the Hallam                                            2:15 AM   page 9
────────────────────────────────────────────────────────────────────────────

It was past two. I met Whitfield on the landing, which was the only flat
place in the building. He had the look of a man who went up and down all day
and had strong opinions about both. He didn’t put the oil can down for me.

Zeldin owed Renfro money. I asked him where Zeldin had been tonight.

Whitfield answered the question and nothing more. “He wasn’t here. Not once
all evening. I know who lives here, and on which floor, and what kind of day
they’ve had.”

I wrote that down. That was one hour Zeldin could not claim the Hallam for,
if it held. I didn’t ask which way he preferred. I had a feeling it was
down, and I was the reason.

Nobody had told me about the Hallam at seven o’clock yet. Whitfield might.
He was still in front of me.

I turned to a clean page and wrote out what I had, in order, the way they
teach you and nobody does it.

Renfro went missing from the subway kiosk between seven and half past eight.
The milk wagon on its rounds was at half past eight, and so far it was the
only honest clock on the street.

Zeldin said the Hallam at seven o’clock, and Whitfield said he wasn’t there.
All I had of Dettweiler’s evening came from Zeldin. Nobody had told me where
Weisglass and Brennan were between seven and half past eight, and none of
them had told me either.

I read the page over twice. It didn’t get any longer. I wanted Whitfield
next, about the Hallam, and then Weisglass’s own account of her evening.

[1 action, 1 written down, 277 words]

the Hallam                                            2:35 AM   page 10
────────────────────────────────────────────────────────────────────────────

I wanted Whitfield to tell me about the Hallam.

Whitfield hadn’t gone anywhere, and neither had I. He had hoped one question
would be the end of me. Most people do.

I asked him who had come and gone tonight, and when.

Whitfield put the oil can down to answer, which was a courtesy. “At six
o’clock it was Lotte Dettweiler, and nobody with her. Nobody came in from
seven until eight. One at half past eight. Nobody came in from nine until
half past. One at half past ten. One at half past eleven. I run the car all
night. I see who rides.” Then Whitfield picked the oil can back up, and that
was the end of the courtesy.

I wrote it down. Whitfield named who came into the Hallam at seven o’clock,
and nobody else. Anybody else who claimed the Hallam at seven o’clock would
have to explain it.

“Did you see anybody tonight you didn’t know?”

“Here’s what I noticed,” Whitfield said. “A man in his fifties at half past
six. Then a man at half past eight. I knew the faces. Not one of the names.
People ride up and ride down. Nobody introduces himself between floors.”

A man in his fifties at the Hallam at half past six, and no name to go with
it. Somebody in the case would fit, or nobody would. Faces without names are
the city’s favourite joke, and it never gets tired of telling it.

[1 action, 8 written down, 246 words]

the Automat                                           2:55 AM   page 11
────────────────────────────────────────────────────────────────────────────

Zeldin started me on this. I wanted to know where Dettweiler had been all
evening.

Fog off the river had swallowed the street a block away. A foghorn sounded
once, a long way off. You got into the Automat through a door that never
locked, the whole point of a place like it being that it was always open.

Nobody looked up except the one person paid to. Alfano was restocking a
shelf, checking each item against a list. He had a white apron and a paper
cap and sleeves rolled to the elbow, and a burn scar across one wrist where
the grill had won an argument.

Brennan, a man in his thirties, was checking a pocket watch against the
street clock, and siding with the watch. Quick on his feet and quicker with
his eyes, he checked his watch twice in the first minute without ever seeing
what it said. Half the block had bought something from him once. The other
half had been talked out of it by the first half. He had married into
Renfro’s family.

Broadnax and a man I didn’t know sat at separate tables near the wall of
little doors, each of them with a cup gone lukewarm.

The only one who didn’t look at me at all was Dettweiler. She was waiting,
the woman Weisglass had told me to start with.

The room went back to what it had been doing. I tried to look like part of
it and didn’t fool anybody.

[1 action, 251 words]

the Automat                                           3:10 AM   page 12
────────────────────────────────────────────────────────────────────────────

It had come round to three. I stepped up to the counter beside Dettweiler
and lit a cigarette, to give my hands something to do while my mouth worked.
She had the look of a woman who had measured me for a better suit the moment
I came in.

“Zeldin owed Renfro money,” I said.

“Sol Zeldin.”

“Where was Zeldin tonight?”

“That one? I know him,” Dettweiler said. “I saw him here at half past six.
At eight o’clock he was at the fourth floor.” She thought a moment. “At nine
o’clock he was here. At half past eleven he was at Kaplan’s. While the milk
wagon was in the street, he was at Kaplan’s. I’ve known him for years. That
much I’m sure of.” Dettweiler was enjoying this more than I was, and I was
the one being paid for it.

I wrote it down. Eight o’clock was one of the half hours that mattered, and
now Zeldin was somewhere in it: the fourth floor, if it was true. It was
somebody seeing him, which is worth more than him saying so.

“Is there anything else you know about it?”

“Since you ask,” Dettweiler said. “Weisglass paid for a room at the fourth
floor at nine o’clock and went up with somebody who wasn’t walking easily.
The somebody had Renfro’s coat over one arm. I’m not repeating gossip. This
I know. I only know it because nobody around here can keep a thing to
themselves.”

It didn’t point anywhere yet. It was one more thing I knew about Renfro’s
night.

“Now tell me about you. Where were you tonight?”

“I’ve got nothing to hide,” Dettweiler said. “I was at the Hallam with Sol
Zeldin at seven o’clock. Then the newsstand, at half past seven. Then the
fourth floor, from eight until half past. From nine until half past I was
here. I’m not mixing it up with any other night. They don’t get that
interesting.”

I wrote it down as Dettweiler told it. It was one person’s word about one
person. Somewhere in her head I was wearing a better suit. I hoped I looked
well in it.

The fourth floor and seven o’clock: that was the next question, and it was
for Dettweiler. Dettweiler was still in front of me.

One story had just turned into a different one. When that happens, I count
all the others again.

Dettweiler said the Hallam at seven o’clock, and Whitfield said she wasn’t
there. Broadnax I had only seen, at the Automat. Nobody had told me where
Broadnax and the man in his thirties were between seven and half past eight,
and none of them had told me either.

That was the whole of it, as of now. It’s always the whole of it, as of now.
I’d ask Dettweiler about the fourth floor next, and then Weisglass to tell
me her evening in her own words.

[1 action, 3 written down, 486 words]
[gap: no-fact: overheard (t002) states nothing structured; its own line stands]
[gap: deck-exhausted: approach came round again inside one run]

the Automat                                           3:10 AM   page 13
────────────────────────────────────────────────────────────────────────────

Something I had turned up pointed at the milk wagon on its rounds. Alfano
might know about it.

A refrigerator motor ran somewhere behind the wall of little doors, a steady
drone under the clock ticking over the entrance.

I leaned on the counter across from Alfano. He leaned on his counter with
the calm of somebody who owns the only warm room on the block.

I asked him what time the milk wagon on its rounds was.

Alfano knew me from before, and that saved us both some time.

He was sure of it, and said so. “That was at half past six, half past eight
and half past ten. It’s the kind of thing people set their evening by. It’s
about the only thing around here that’s on time.” Alfano stopped there, but
only to breathe.

I got it down on paper. Now the milk wagon on its rounds had its hours, and
so did anybody seen somewhere by it, if I knew which time. A clock you can
hear across the street is worth two on a wall.

I wanted to hear about Dettweiler from Alfano. I wasn’t done with Alfano
yet.

[free, 1 written down, 195 words]

the Automat                                           3:30 AM   page 14
────────────────────────────────────────────────────────────────────────────

I stood at the counter next to Broadnax, who was smoking under the nearest
light. He had the steady hands of somebody who tells people it won’t hurt
for a living, and the eyes of somebody who knows better.

“Renfro had a former employee,” I said. “Weisglass.”

“I know who you mean. I know the face.”

Broadnax didn’t need to be asked twice. “Weisglass blamed somebody for a
ruin, for months, and was not quiet about it either, not where I could help
hearing. I wouldn’t tell you if I wasn’t sure. I could tell you more about
this street than the street would like.” Broadnax was having a lovely time.
One of us ought to.

I wrote that down. That was motive, plainly: Weisglass blamed Renfro for the
ruin of Weisglass’s business. That didn’t make her anything yet. It made her
somebody who could.

“And you, from the start of the evening? Where were you?”

“You want the whole evening? Fine,” Broadnax said. “I was here from seven
until eight. Then the Hallam, at half past eight. From nine until half past
I was here. Then the newsstand, from eleven until half past. Every bit of
that I can stand behind.”

It was a whole evening on Broadnax’s say-so. That didn’t make it false. It
made it something to check. It hadn’t hurt, so far. That’s exactly what they
tell you, just before.

I still had nothing on Renfro at seven o’clock. Broadnax was the one to ask.
He was still in front of me.

[1 action, 2 written down, 256 words]

the Automat                                           3:50 AM   page 15
────────────────────────────────────────────────────────────────────────────

I had a question for Broadnax about Renfro.

I stayed where I was, next to Broadnax. Nobody is glad to see me the second
time. He kept up the tradition.

I asked what he had seen of Renfro tonight.

“You want to know about him? I’ll tell you,” Broadnax said. “I saw him here
from seven until eight. At ten o’clock he was at the fourth floor. I was
there, and I have eyes. People think nobody sees them. Somebody always does,
and usually it’s me.” Broadnax had more lined up behind his teeth.

I wrote it down. Later than the last sighting, Renfro had turned up at the
fourth floor, at ten o’clock. Somebody could tell me more. I licked the
pencil and wrote it down. It’s the only part of the job that tastes of
anything.

I found somewhere to sit and gave my feet a rest while my head did the
walking.

Renfro went missing from the subway kiosk at half past eight.

Zeldin said the Hallam at half past eight, and Whitfield said he wasn’t
there. Broadnax had told me his evening, and so far nobody else had said a
word about it. Nobody had told me where Weisglass, Brennan and the man in
his thirties were at half past eight, and none of them had told me either.

That was where things stood. It wasn’t far, but it was further than the
police had got. I’d ask Dettweiler about the fourth floor next, and then
Weisglass’s own account of her evening.

[1 action, 1 written down, 256 words]

the Automat                                           4:10 AM   page 16
────────────────────────────────────────────────────────────────────────────

I wanted to ask Dettweiler about the fourth floor.

A milk wagon went by in the street, the bottles rattling in their crates. It
was after four. I turned back to Dettweiler. She had been hoping I’d ask
something else, and it showed.

“Any faces tonight you didn’t know?” I asked.

“Faces I didn’t know?” Dettweiler said. “A man at the fourth floor at half
past eight. I’d seen him around. I couldn’t give you a name. I notice faces.
I don’t ask for names. A stranger’s a stranger. You can’t make friends with
everybody. I’ve tried.”

No name from Dettweiler, only a man. I wrote it down the way it was said.
People will tell you a lot if you look tired enough. I didn’t have to
pretend.

[1 action, 1 written down, 129 words]

the newsstand                                         4:30 AM   page 17
────────────────────────────────────────────────────────────────────────────

Broadnax started me on this. I meant to ask Ruggiero about Brauer, Renfro’s
creditor. Ruggiero was the news dealer at the newsstand.

It was still fogged in, though the shapes of things were starting to come
clear. A tugboat whistle sounded somewhere out on the river. The newsstand
kept a small shelf of magazines under glass, with everything else left open
to the weather. This late there was hardly a customer to be seen. The
traffic light on the corner went on changing, red to green and back, for the
benefit of no traffic at all.

Ruggiero was counting the unsold papers from the evening edition under the
traffic light. Bernstein, the patrolman on the beat at the newsstand, was
swinging the nightstick on its strap, at the far end, well away from the
traffic light.

People on the corner at the newsstand said Ruggiero had never taken a day
off, and the corner wasn’t sure how it would manage one. A newsstand was a
good post for watching, and Ruggiero had years of practice at it.

The light on the corner went on changing for nobody at all. I’ve had jobs
like that. I may have one now.

[1 action, 199 words]

the newsstand                                         4:50 AM   page 18
────────────────────────────────────────────────────────────────────────────

I leaned on the front of the stand, where Ruggiero was counting the unsold
papers from the evening edition. He had newsprint on his fingers and the
whole neighbourhood’s business somewhere behind his eyes. He kept hold of
the papers.

“Renfro had a creditor,” I said. “Brauer.” I held out my cigarettes. He took
two, which I decided to call progress.

“Konrad Brauer.”

“Where was Brauer tonight?”

Ruggiero knew who I meant. “I saw him here at nine o’clock. He was back at
half past eleven. While the milk wagon was in the street, he was here.”

“Any time you’d swear he wasn’t there?”

“Not here from six until eight or from half past nine until eleven. I’d have
seen him. He would’ve had to walk right past me.”

I wrote it in the book. Brauer was missing from the newsstand at six
o’clock, if the word was good. Missing from one place meant present at
another. I had newsprint on my own fingers by then. None of the
neighbourhood’s business came with it.

[1 action, 1 written down, 174 words]
```

### Seed 12 at tier 2, the oracle

```
the office                                            12:00 AM   page 1
────────────────────────────────────────────────────────────────────────────

Midnight. My office was a room behind a door with my name on it, three
flights up off West Twenty-Eighth Street, in the Tenderloin. The mirror over
the washbasin showed more of the night before than I wanted explained. I
turned the lamp away from it. I had a clean notebook open and nothing to put
in it.

“Dashiell, long time,” Fairbanks said, and meant it more than most people
who say it do. He counted the bills by feel, thumb running the edges,
without once looking down at his own hands. He kept his eyes on me for all
of it.

Lyman Fairbanks was a man in his forties. He was big and square and quiet,
with a flattened nose and a collar a size too small for his neck. Most
things were.

“I am a witness against the people Francis Corrigan worked for,” he said.
“He is dead.”

I let him sit before I asked anything. There is a right way to do this, and
I do it about half the time.

“Corrigan was a buildings inspector,” Fairbanks said. “Corrigan could close
a building with a signature, and had closed two. Nobody on this street is
going to send flowers. I talked to the district attorney in ’19. Prescott
Coffin has not spoken to me since. Not a word. Corrigan was found dead at
the walk-up. That is where it happened. Weisglass found Corrigan at the
walk-up at half past eleven.”

“What did the police make of it?”

“The precinct took a statement at the desk and filed it. The coroner puts it
at half past ten, and will swear to the half hour.”

“Why me?”

“I want it settled quietly. Before somebody settles it loudly. I am paying
to have something found. And then not said.”

He was a doorman at a club with no sign on it. He kept the wrong people out
and the right people quiet. The club people said he never forgot a face and
never let the wrong one in twice.

“Who would you start with?”

Fairbanks was running a thumb along the edges of some bills again without
looking down. “Start with Margolis. He was in and out of there all week,
Dashiell.” Fairbanks had a roll with a rubber band round it out before I’d
named a figure, which saved me pretending to think of one.

There was writing in the notebook now. It looked happier for it.

He was still in the chair. I had a question or two for him before he went.

[free, 1 written down, 425 words]

the walk-up                                           12:35 AM   page 2
────────────────────────────────────────────────────────────────────────────

Fairbanks set me on it. I came to give the room a proper going-over, which
is more than my own room ever gets.

The cold had sent everybody indoors early. The front steps had a skin of
frost on them. The walk-up belonged to Corrigan, above a drugstore that had
kept its lights lit later than most. The stairwell window looked down on the
street lamp on the corner. Past midnight the building had gone as quiet as
it ever got. It was the kind of place nobody kept an eye on. The precinct
had taken its statement and gone home.

Corrigan was on the floor where he had gone down, and nobody had moved him.
There was nobody else in the room. The tap was left running and the basin
had overflowed a clean ring onto the boards. The El went over at half past
ten, running to timetable, and for twenty seconds nothing under the
structure could be heard at all.

The coroner’s man had left a note on the back of an intake form. The coroner
put death at half past ten. A single narrow puncture under the ribs. Very
little blood outside the body.

That would put Corrigan dead by about half past ten. Whoever did it was at
the walk-up before then. So it was an ice pick. Whoever did it had to take
the pick off the block first.

[1 action, 2 written down, 235 words]

the cab stand                                         1:15 AM   page 3
────────────────────────────────────────────────────────────────────────────

I had it from Fairbanks. I wanted to hear what Weisglass knew about
Margolis.

Another hour gone. It was past one. The cab stand sat outside a theater, a
line painted on the curb where the cabs were meant to wait their turn. At
this hour there were more cabs waiting than fares to fill them. The first
cab in line had its motor idling, and its meter flag stood up, white, in the
light from the marquee.

Nobody looked up except the one person paid to. Petrosino, the cabbie on the
stand at the cab stand, was sitting behind the wheel with the door open,
reading the racing page. Lean and hollow-cheeked from night work, he had a
scarf wound twice round his neck and both hands jammed in his pockets.

Margolis, a man in his thirties, was checking a pocket watch against the
street clock, and finding the street clock slow again. He was the night
manager at the hotel. The guests said he was discreet. The bellhops said he
knew everything and kept a note of it. Fairbanks had told me to start with
him.

The only one who didn’t look at me at all was Weisglass. He was tapping a
cigarette against a case, the man who had found Corrigan.

I turned my collar up. Next to that scarf, it looked like I wasn’t trying.

[1 action, 229 words]

the cab stand                                         1:50 AM   page 4
────────────────────────────────────────────────────────────────────────────

I caught up with Weisglass, who was tapping a cigarette against a case. He
had the look of a man who could make a party sound wonderful without having
enjoyed a minute of it.

“Corrigan had a tenant,” I said. “Margolis.” I held out my cigarettes. He
took two, which I decided to call progress.

“Louis Margolis.”

“Where was Margolis tonight?”

Weisglass nodded at the name. “I saw him here from six until seven. He was
back at half past eight. From ten until half past he was at Pier 46. I know
him well enough. It was him. I don’t keep track of him beyond that. I’ve got
my own troubles.”

I wrote that down. So Margolis had been at Pier 46 at half past ten, if it
held. That was an hour that mattered.

“All right. And you, tonight?”

Weisglass thought back to the start of the evening. “I was at Pier 46 at
nine o’clock. At half past nine I was here. Then Pier 46, from ten until
eleven. Then the walk-up, at half past eleven. I’m not mixing it up with any
other night. They don’t get that interesting.”

So that was Weisglass’s version of the night. Every version gets checked,
and this one would be too. I touched my hat, which is as far as my manners
go without costing money.

For Weisglass, the one to ask was Tillman. Tillman competed with Corrigan
for the same customers. I would find Tillman at the ferry slip.

[1 action, 2 written down, 250 words]

the ferry slip                                        2:30 AM   page 5
────────────────────────────────────────────────────────────────────────────

Tillman was the one who would know where Weisglass had been.

I checked the time. It was past two, and the DA would have it at eight
whether I was ready or not. The cold had the street to itself. A newsboy’s
stack sat unguarded under a lamp, weighted down with a brick. The ferry slip
sat where the street met the water, and it smelled of tar and river both. No
one watched the gate at this hour; there was no one posted to. It was as
quiet a stretch of the waterfront as the city had to offer, this late.
Across the river the far shore showed as a line of lights along the water,
broken wherever the piers ran out.

Tillman, a man in his forties, was standing out of the wind, hands in
pockets. The good overcoat hung unbuttoned so the suit showed, and there was
cigar ash on the lapels of both, the mark of a good day’s handshaking. Every
widow on the street got a sack of coal from him in February and a visit from
him in November.

Renfro, a man in his thirties, was taking a slow look at everything in
sight, the way the job asked. He was the patrolman on the beat. The block
said he knew every door on his round, and which ones would open to him for a
cup of coffee.

Tillman was somebody I knew about. Now Tillman was here, where I could ask.

The lights on the far shore looked warm from where I stood. They always do.
I’ve been over there, and they’re not.

Another hour had gone, and I went over what it had bought me.

Corrigan died at the walk-up, at half past ten. The El going over was at
half past ten. It was the nearest thing I had to a clock I could trust. The
how of it was an ice pick.

Weisglass had told me his evening, and so far nobody else had said a word
about it. Tillman I had only seen, at the ferry slip. For Margolis I had
Weisglass’s word, and nothing of his own. Nobody had told me where Fairbanks
and Tillman were at half past ten, and none of them had told me either.

That was what the hour had bought me. I’ve paid more for less. I wanted
Fairbanks next, about Margolis.

[1 action, 399 words]

the ferry slip                                        3:05 AM   page 6
────────────────────────────────────────────────────────────────────────────

I had lost track of the time. It was past three. The float bumped against
the pilings with a slow, heavy knock, over and over, and the river ran past
the slip black and quick.

I caught up with Tillman, who was standing out of the wind. He had the look
of a man who knew every voter on the block and what each of them wanted for
Christmas.

Weisglass was going to testify against the people Corrigan worked for. I
asked what he had seen of Weisglass tonight.

“You want to know about him? I’ll tell you,” Tillman said. “I saw him at
Pier 46 at ten o’clock. He was there again at eleven o’clock. I know his
voice and I know his coat. People think a street at night is empty. It never
is.” Tillman was enjoying this more than I was, and I was the one being paid
for it.

I wrote that down. Weisglass could have got into the walk-up. That put it
within reach, if nothing more.

“And Petrosino?”

Tillman counted it off on his fingers. “I saw him at the cab stand at half
past eleven. I was there, and I have eyes. He takes the stairs like each one
owes him money.”

It went with the rest of what I had on Corrigan, to be read again later.
That was one place and one hour. A night has a good many of both.

“And you? Take me through your own evening.”

Tillman enjoyed the telling. I could have charged admission. “I was at the
cab stand at eight o’clock. Then the walk-up, at nine o’clock. Then Pier 46,
from half past nine until ten. Then the cab stand, at half past ten. Then
Pier 46, at eleven o’clock. Then the cab stand, at half past eleven. Ask me
again tomorrow and you’ll get the same answer.”

An evening told by the one who spent it is the only kind of fact that can be
wrong on purpose. I put Tillman’s down as told. The float knocked against
the pilings again, slow and heavy, like somebody who knows you’re home. I
didn’t answer that either.

I had a question about Fairbanks, and it was for Tillman. I wasn’t done with
Tillman yet.

[1 action, 3 written down, 378 words]
[gap: deck-exhausted: approach came round again inside one run]

the ferry slip                                        3:40 AM   page 7
────────────────────────────────────────────────────────────────────────────

I stamped my feet for the warmth and turned back to Tillman. He had hoped
one question would be the end of me. Most people do.

“Fairbanks was going to testify against the people Corrigan worked for,” I
said.

“Lyman Fairbanks.”

“Where was Fairbanks tonight?”

Tillman had plenty to say, and started at once. “I saw him at Pier 46 from
half past nine until ten. He was there again at eleven o’clock. It’s not a
face I’d get wrong. People think nobody sees them. Somebody always does, and
usually it’s me.” Tillman stopped there, but only to breathe.

I wrote that down. If Fairbanks could get into the walk-up, the list of
people who could was one name longer. A sighting says where, not why. I had
the where. People notice more than they let on, and let on more than they
should.

Fairbanks knew something about Tillman, or ought to. I would go to Pier 46
and see.

[1 action, 1 written down, 160 words]

Pier 46                                               4:20 AM   page 8
────────────────────────────────────────────────────────────────────────────

I came to ask Fairbanks about Tillman. And there was the other thing.

By then four had come and gone. The shed covering Pier 46 smelled of tar and
rope and the river underneath both. Anybody could have come and gone, and
nobody would have known it. The first thing you noticed was the rafters
under the corrugated roof, white with gull droppings.

Fairbanks was sitting in a hard chair, at the far end, well away from the
rafters, the doorman at a club with no sign on it who was paying me.

I kept my hat on under the rafters. The gulls had been at work up there for
years, and I wasn’t going to be the thing they finished on.

[1 action, 122 words]

Pier 46                                               4:20 AM   page 9
────────────────────────────────────────────────────────────────────────────

I sat down at the other end of the bench from Fairbanks, who was sitting in
a hard chair. He had the look of a man whose whole job was standing in a
doorway being larger than the doorway.

Tillman competed with Corrigan for the same customers. I asked what he had
seen of Tillman tonight.

Fairbanks knew me from before, and that saved us both some time.

He gave it to me straight. “I saw him here from half past nine until ten. He
was back at eleven o’clock. I’m sure of that much.”

I got it down on paper. Tillman might have had a way into the walk-up, and a
way in was not nothing. A place and an hour was worth something. It would be
worth more with a second one beside it.

“Where were you yourself tonight?”

“My evening?” Fairbanks said. “I was at the cab stand at nine o’clock. From
half past nine until half past eleven I was here. Every bit of that I can
stand behind. Nothing worth telling, but you asked.”

I wrote it down as Fairbanks told it. It was one person’s word about one
person. He was still larger than the doorway. I’d be going out through it
later, and I was already making myself small.

[free, 2 written down, 216 words]
```


