# M6 — notes

Spec: `docs/15-m6-choices.md`. Branch `m6-choices`.

## What was built

| § | Where |
|---|---|
| 1 choice model | `src/game/choices.ts` — `choicesFor`, `defaultAskPerson`, `openTargets`, `knownObjects`, `knownPeople` |
| 1.1 cost | `priceOf` / `costOf` in `src/game/reducer.ts`; `step` charges by `priceOf` and nothing else |
| 1.4 repeats | `RunState.asked` and `RunState.searched`; a repeat writes a free page that says so and reads the notebook back |
| 2 errands | `src/game/errand.ts` (`planErrand`), dealt in `composePage` from `content/decks/errand.json` (66 placeholder cards) |
| 2.1 tracing | `checkErrand` in `src/game/correspond-pages.ts`, run by `checkRun`; new rule `errand-untraced` |
| 3 clock | `clockStrip` / `usedByPage` in `src/game/clock.ts`; the beats in `content/decks/hours.json` (9 placeholder cards), dealt by `clockBeat` in `page.ts` |
| 4 hover cards | `personCard` / `placeHoverCard` in `src/game/notebook.ts`; `src/ui/hover.ts` |
| 5 the page | `src/ui/book.ts`, `src/ui/choices-view.ts`, `src/ui/book.css`; `PAGE_CEILING` 300 → 220 |
| 6 | `src/ui/menu.ts` deleted; the text prompt removed; the parser, `stepInput`, the oracle and `npm run read` unchanged in what they accept |
| 7 transcript | `renderChoicesText` in `src/game/transcript.ts`; `npm run read` replays the route and prints each page's choices, `>` on the one taken (`--no-choices` to leave them off) |
| 8 tests | `test/m6.test.ts`, `test/m6-valid-d{1,2,3}.test.ts` (sharing `test/m6-walk.ts`) |

## Numbers

**Tests:** 22 files, 461 tests, all passing (`npm test`, ~100 s wall).
`npm run build` clean. `npm run decks`: 0 errors; errand 21/21 reachable
pairs at three cards or more, hours 3/3; the 26 empty tag combinations
reported are the older decks' and unchanged.

**Correspondence:** zero violations over 40 seeds × 3 difficulties, oracle
and wandering player, errand lines on (`node --import tsx scripts/page-correspondence.mjs`
and the §8 test). 1,000+ errand pages traced in the test.

**Oracle:** every command it issues is among the choices offered at that
moment, on all 120 runs, and every run is within par (the §8 test allows par
plus one; none needed it).

### Golden loop

`python3 scripts/golden-loop.py`, pages 1–3 of seeds 1–40 at difficulty 2.

| metric | target | before (main) | after (M6) |
|---|---|---|---|
| orphan_word_ratio | ≤ 0.82 | 0.812 | 0.814 |
| paragraph_cohesion | ≥ 0.66 | 0.674 | **0.645** (0.022) |
| sentence_cohesion | ≥ 0.59 | 0.632 | 0.607 |
| short_share | ≥ 0.36 | 0.387 | 0.375 |
| long_ratio | ≤ 0.06 | 0.040 | 0.040 |
| dialogue_share_p1 | 0.33–0.53 | 0.327 (0.009) | 0.327 (0.009) |
| figures | ≤ 0.5 | 0.442 | 0.308 |
| plain_ratio | ≥ 0.60 | 0.756 | 0.763 |
| words_per_paragraph | 22–35 | 31.5 | 29.6 |
| **aggregate** | < 0.05 | **0.009** | **0.031** |

Per page (means over the forty seeds):

| metric | p1 before | p1 after | p2 before | p2 after | p3 before | p3 after |
|---|---|---|---|---|---|---|
| orphan_word_ratio | 0.779 | 0.779 | 0.799 | 0.802 | 0.857 | 0.861 |
| paragraph_cohesion | 0.727 | 0.727 | 0.564 | 0.531 | 0.732 | 0.679 |
| sentence_cohesion | 0.634 | 0.634 | 0.601 | 0.527 | 0.661 | 0.660 |
| short_share | 0.446 | 0.446 | 0.377 | 0.335 | 0.340 | 0.346 |
| long_ratio | 0.033 | 0.033 | 0.034 | 0.035 | 0.053 | 0.053 |
| dialogue_share | 0.327 | 0.327 | 0.040 | 0.049 | 0.006 | 0.008 |
| figures | 0.075 | 0.075 | 0.600 | 0.175 | 0.650 | 0.675 |
| plain_ratio | 0.872 | 0.872 | 0.790 | 0.801 | 0.607 | 0.616 |
| words_per_paragraph | 22.6 | 22.6 | 33.3 | 29.8 | 38.8 | 36.4 |
| words | 359 | 359 | 244 | 215 | 140 | 143 |
| max words | 380 | 380 | 292 | 220 | 199 | 197 |

Page one does not move: it is the office, it never has an errand line, and
its own ceiling (380) is unchanged. Page two is where M6 lands — it is always
the walk to the scene, so it always carries an errand line, and it was the
page the 300-word ceiling used to let run long. The cost is cohesion on that
page: the errand is a paragraph set apart by design, so the paragraph after
it opens on the walk rather than on anything the errand said, and the
harness counts one more paragraph break that does not hand a noun across.
That is the whole of the new distance (0.022), and I left it: the errand is
meant to stand apart.

The first pass at 220 words came in at **0.088**, with short sentences down to
0.344 and figures up to 0.517. Two changes brought it back, both recorded
below: the errand cards open on a short sentence ("Kreuzer sent me."), and
the page's soft length target (`WORD_TARGET_HIGH`) came down with the ceiling,
because at 250 it had stopped gating anything and the one-simile-a-page pass,
which only runs on a page with room for it, suddenly had room on every page.
I tried the target at 185, 200 and 215: the aggregate is 0.031 at all three.

Across 100 seeds (oracle and wandering), 2% of pages after page one run past
220 words, the longest 349. Every one of them is a page of finds or a long
exchange with no thinking left on it — `CUT_ORDER` has cut everything it is
allowed to, and what is left is the record. The §5 test holds that: over the
ceiling only with no aside, ambient or monologue on the page, and under 5% of
pages over.

### The page in a browser

`scripts/check-layout.mjs` (playwright-core driving the Chrome already on the
machine; no browser download) walks the oracle's route for seeds 1–10 at
difficulty 2 by clicking the button whose command is the oracle's next, and
measures every page, 134 of them, at both sizes.

| | 1280×800 | 390×844 |
|---|---|---|
| first group's heading and first button on screen | 134 / 134 | 134 / 134 |
| whole first group on screen | 134 / 134 | 16 / 134 |
| share of the first group's buttons on screen (mean) | 100% | 54% (never fewer than 2) |
| page itself scrolled / horizontal scroll | 0 / 0 | 0 / 0 |
| buttons under 44 px | — | 0 (smallest 44) |
| prose area height | 278 px | ~210 px |

I also clicked through by hand in the same browser: a repeat search (free, says
so, notch count unchanged), a turned-back page (choices greyed and disabled),
a two-person room (the name row, the default person carrying the lead), and a
hover card on a name in a group heading.

## Where I judged differently from the spec

1. **The layout pins the choices; the prose scrolls.** On 1280×800 a 220-word
   page and a twelve-topic ask group do not both fit, and page one is 380
   words. So the left page is a column: the running head and strip, the prose
   in its own scrolling leaf, the choices under it (at most 42% of the page
   height, scrolling inside themselves if they must), and the pager. The first
   group is on screen on every page without the window scrolling, which is
   what §5 asks; the price is that a long page's prose scrolls inside its
   margins, which it already did before M6.
2. **The phone shows the start of the first group, not all of it.** Buttons
   stack full width at 44 px as §5 says, so a twelve-topic group is 600 px on
   its own. The heading and at least the first two buttons are always on
   screen; the rest scroll inside the panel. The row of names to switch
   between people wraps across rather than stacking, still 44 px tall.
3. **"Why I was hired" is not marked on page one.** §5 lists it among the
   client's marked topics, but the brief it would fetch is the brief already
   in hand, so asking it takes no open lead; §8's "marked if and only if it
   takes an open lead" wins. The people the client named *are* marked — they
   are the client's own lead topics — and every client button on page one
   says "free".
4. **A search is a search of the room.** Going through the room and going
   through a thing in it both take everything the room has (that is how
   `examine` has always worked), so: an object search is marked whenever the
   room is (it takes the same lead), and once a room has been searched every
   search in it is the repeat — free, "✓", and it reads the room's records
   back.
5. **No Search group in the office.** It holds nothing findable and nothing
   to go through; offering a half hour to search your own desk would only ever
   be a trap.
6. **Two extra slots and a tag in the errand deck.** `{who}` (the person the
   lead says to ask) and `{from}` (the room a document or a thing came out
   of), because "I came to ask about Grasso" without saying who was not
   enough to act on. Both are in the notebook already — `{who}` is printed in
   the lead's own label — and the checker traces both. A `searched` tag keys
   §2.2's "returning to a place already searched" apart from a plain return.
   The schema lists the reachable tag pairs as `reachable`, and the validator
   now reports those rather than the whole 6 × 7 cross product.
7. **The clock's beats are their own deck, `hours.json`,** rather than a tag
   on `transitions`, so the transition draw needs no new exclusion. Order of
   precedence: one call left, two calls left, then an hour crossed — the count
   is what a player acts on and the head already shows the hour. "The last
   one" is said on the page after which one call remains (the next call is the
   last); the page that spends the last call already gets the DA at the door.
8. **The oracle is gated on open leads.** Its plan used to ask exact topics
   before any lead had opened them (30 of 1,492 commands over 120 runs), which
   no button offers. The search now only allows a question once something in
   hand, or fetched earlier on the route, leads to it. Par is unchanged and no
   run needed the "par plus one" slack.
9. **A repeated question to the client in the office** is free and does not
   spend one of the two questions on the house.
10. **The Notebook button does not write a page.** On a phone it opens the
    notebook; on a wide screen, where the notebook is always open, it moves
    focus there. The `notebook` command still parses and still writes its page
    for the transcript tool.
11. **Turned-back pages keep their choices on the page** (`Page.offered`,
    optional). The book sets it, not the reducer; a save from before M6 loads
    and its old pages simply show no choices.
12. **Only people and places are marked in the prose now.** Objects and hours
    were clickable because the menu could act on them; with the menu gone they
    are plain text.
13. **The page-turn animation is gone** — §3 says nothing but the notch
    animates. The notch fills over half a second, and not at all under
    reduced motion.
14. **The transcript prints the free row too**, collapsed topics in brackets
    as `[other topics: …]`, `✓` on anything already done, and a minutes note
    beside any choice that costs other than the rest of its line.

## Seen in passing, not touched

- The notebook's on-sight line for a fixture reads "Callahan is a The
  bartender." — `onSightSentence`/`dossierSentence` prefix an article to a
  role that already has one. Pre-existing; not an M6 change.
- The errand cards are placeholders, three a pair. Several pairs are thin in
  a way a reader will notice within a night (the same three `said × ask-person`
  cards come round). The content pass to fifteen a pair is the fix.
