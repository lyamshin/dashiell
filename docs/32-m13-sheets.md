# M13 — Sheets

The target is `docs/golden/sheets-arrival.md`. **Sheet A, filled for seed 3, is the blessed golden:** "the most golden golden." Read the whole doc for the format. Sheets B and C are good variants.

The designer's idea, in brief: pages feel disjointed because each card is dealt blind to its neighbours. A **sheet** is a hand-written skeleton for part of a page. It holds **sheet text** (the joins), **holes** that demand cards from named decks, and **roles** (prop, foil, tell) that cards fill by **exporting** them and that later parts of the same sheet reuse. A page is several sheets in order. Draws are random among the cards that fit, with no return to best-weighted choice.

## Decisions

- **Callbacks** (a role introduced and paid off later in the sheet) run on **about 70% of pages**, not every page. It's a seeded roll per page. When it's off, the sheet uses a variant of its closing line that needs no role.
- **Sheet text is where the camp jokes live.** The sheet knows the setup. At most one joke slot per sheet.
- **Books** (arcs across a whole night) come after this milestone, on the same machinery.

## 1. The engine

1. **A sheet format** in `content/sheets/*.json`, authored as data, with a validator in `npm run decks`. A sheet has:
   - an id and the moment it serves: arrival, company, the ask, a telling, a search, a confrontation, a recap, the office;
   - conditions: place kind, whether the client or a watcher is present, case type, tier band;
   - an ordered list of parts. Each part is sheet text with `{slots}`, or a hole (deck, conditions, optional `?` or repeated `*`, the role it binds, and whether a short form is wanted);
   - a closing line with a callback variant and a plain variant.
2. **Card exports and short forms.** Cards may carry `exports: { role: { text, short } }` and a `cut` marking where their short form ends. Start with the decks the arrival sheets use: place-ambient, establish, character, activity. More follows as sheets need it.
3. **The realizer picks a sheet per moment** among those whose conditions fit, at random, with memory like the dealer's. It then fills the holes, binds the roles, rolls the 70% callback, and renders. The beat planner still decides what the page must carry, and every required beat must land in a hole or in sheet text. Beat coverage, correspondence, reader lint and plain terms all stay green.
4. **Pronouns and grammar across holes.** The engine already has pronoun slots. Sheet text uses them the same way.

## 2. The content, in the blessed golden's voice

Write sheets for every moment:

| moment | sheets |
|---|---|
| arrival and company | 6–8 (A, B and C to start, written as data) |
| the ask | 5–6 |
| a telling | 5–6 |
| a search | 5–6 |
| a confrontation | 4–5 |
| a recap | 3–4 |
| the office | 3–4 |

Add exports and cut points to the cards those sheets draw on. Also write the small decks the sheets need: `greet` (the client's greeting), and `close` lines that take `{prop}` or `{trait}`, with plain variants.

## 3. Measure

- Render seeds 3/4, 11/0, 7/5 and 12/2 in full and read them against Sheet A.
- Seed 3's speakeasy arrival should read at Sheet A's level.
- Report the share of pages with a callback, which should be about 70%.
- Report how often each sheet is used, and repeats within a night.
- The design test must not move.
