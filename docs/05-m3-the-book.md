# Milestone 3 — The Book

The first playable Dashiell. A local web page, no server, that takes a generated case and lets a player investigate it as a bound book with a typed prompt, then file a report. This is a proof of concept for the *feel*: the two-page spread, the clock, the leads, the report. It uses the fragment decks as a placeholder voice to demonstrate the mechanism, not to be good prose yet.

Builds on the M2b generator (`docs/04-m2b-watchers-and-budget.md`, merged). `src/gen/` stays pure and is consumed as a library. Do not change generator behavior in this milestone; if the game needs something the generator lacks, add it as a pure derived function in `src/game/` and note it.

## Stack

- Vite + TypeScript, vanilla DOM. No UI framework. Dev deps only: add `vite` to the existing `typescript`, `tsx`, `vitest`. Zero runtime deps.
- `npm run dev` serves the book. `npm run build` emits a static `dist/` that works when served from any static file server. `npm run preview` serves `dist/`.
- Layout:
  ```
  index.html
  src/main.ts            boot: read URL params, build case, mount book
  src/game/              pure game logic, no DOM: state, reducer, parser, scoring, voice, oracle
  src/ui/                DOM: book, pages, notebook, prompt, report form
  src/ui/book.css
  content/decks/*.json   existing; imported as JSON
  test/game/             vitest for everything in src/game/
  ```
- Existing CLI scripts and generator tests keep working.

## The run

### Title page

The book opens on a title page: **DASHIELL** and a single line for the detective's name, prefilled with `Dashiell`. Below it, a small line of controls: difficulty (1–3, default 2), seed (random by default, editable), and "Open the case." The URL reflects the choice as `?seed=N&d=N` so a case can be shared or replayed.

### The clock

The body was found at midnight. The DA's office opens at 8:00 AM and will file the case with whatever the precinct has if the detective hasn't filed first. That gives eight hours. The case's `budget` is the number of actions; each action advances the clock by `480 / budget` minutes, rounded to the nearest five. The clock is displayed as a time, not a counter. At 8:00 AM the report form opens whether the player likes it or not.

### State

```ts
interface RunState {
  seed: number; difficulty: Difficulty; detectiveName: string;
  at: Id;                       // current place
  actionsUsed: number;
  found: Id[];                  // findable clue ids obtained, in order
  threads: Thread[];            // open leads the player can follow (derived from found clues' leadsTo)
  burned: string[];             // card ids used in this run
  log: PageEntry[];             // everything rendered, for page-back
  filed?: Report;
}
```

The reducer is a pure function `step(state, command, case): { state, page }`. Everything the UI shows comes from `page`. Save `RunState` to `localStorage` on every step so a reload resumes. Burned card ids also persist across runs under a separate key so no player reads the same card twice until the deck is exhausted (then it reshuffles).

### Places and people

The player starts at the scene (the residence). People are found at `Person.foundAt` all night; fixtures at their posts. `look` shows the place description (a place card matching `kind` and `watcher`) followed by who is present, by surname and role.

### Commands

All commands can be typed at the prompt or built by clicking underlined nouns in the prose.

| command | cost | effect |
|---|---|---|
| `go <place>` | 1 action | Travel. Page shows the place (as `look`). No-op if already there, free. |
| `ask <person> about <topic>` | 1 action | If a findable clue exists with source `{person, topic}` and the person is here, deliver it. Otherwise a nothing-answer (see Voice). Costs the action either way. |
| `examine <place \| object>` | 1 action | Deliver all findable clues with source `{place}` here that haven't been found, one page each, as one action. Nothing left: a nothing-answer. |
| `look` | free | Describe the place and who is here. |
| `notebook` | free | Turn to the notebook (also always visible on the right page on wide screens). |
| `file` | ends run | Open the report form. |
| `help` | free | List commands in the book's voice. |

Topics for `ask` are: any person's surname, any place short name, any object name, any anchor name, "that evening", "the victim", and "why I was hired". The parser resolves fuzzy input: surname or given name, place short name or any distinctive word of the full name, case-insensitive, prefix-tolerant. Ambiguity gets a free clarifying page. Unknown verbs get a free help nudge. Nothing the player types by mistake ever costs an action.

### Leads and threads

When a clue is found, each id in its `leadsTo` becomes a **thread** if not already found: rendered in the notebook as an actionable line derived from the target clue's source ("Ask Doyle about Brauer", "Look around Kaplan's"), grouped by place. Clicking a thread runs the command (including travel first, as two actions, with a confirm if the clock is tight: fewer than three actions left). The three starting clues are delivered on the first spread, so the player begins with threads.

The prose also underlines nouns: every person, place, object, and anchor mentioned in a clue's text is a clickable noun. Clicking a person here offers "ask about…" with a topic list; clicking a place offers "go"; clicking an object offers "examine".

### The notebook

The right-hand page. Sections, always current:

1. **The clock** and actions remaining, plainly.
2. **People**: everyone met or mentioned, surname, role, where found, and every `personAt` / `personNotAt` fact established about them, as "9:30 PM — at the speakeasy (Doyle)". Contradictions with a person's own claim are highlighted once the player has both halves. (Claims are learned by asking a person about "that evening", which delivers their claimed timeline as a free-standing page. This is a findable-independent action that always works and costs one action; it is how alibis enter the game. Add it as a derived pseudo-clue in `src/game/`, not in the generator.)
3. **Places**: the six, with objects seen and clues found there.
4. **Threads**: open leads, grouped by place, each one clickable.
5. **Established**: time of death window as currently narrowed, method evidence, motives known.

### The report

Obra Dinn's form. Five fields, each a dropdown of the case's actual options plus "I don't know":

- Who killed the victim (the six suspects)
- How (the six methods in the pool)
- Why (the motive types in the pool)
- When (the twelve ticks)
- Where (the six places)

Filing is final. Scoring: one point per correct field. Par comparison: `actionsUsed` vs `par`. The closing page depends on the result:

- 5/5: the killer hangs. Names the actions used vs par ("Holmes would have done it in ten").
- Wrong killer named: **the wrong man hangs.** The closing page says who really did it and what the detective missed, drawn from the deduction path.
- Killer right, other fields wrong: a conviction on a thin case; note what was thin.
- "I don't know" for the killer: the case goes cold.

Then: "Open another case" (new random seed, same difficulty) and "Read the truth" (renders the M2b truth sheet for this case in a plain readable page; this is the designer's back door and should be styled as a typewritten appendix).

## Voice

`src/game/voice.ts`. The placeholder voice engine. It assembles a page from:

1. Optionally, a **place card** (on arrival at a place only).
2. For a person's answer: a **witness card** matching `fixtureRole` (fixtures) or the nearest archetype tag (suspects: use `register: 'evasion'` when the suspect is lying about the tick the clue concerns, `'truth'` otherwise; `'lie'` when they are delivering their own false claimed timeline).
3. The clue `text` itself, unchanged. This is the factual core and must be rendered verbatim so the game stays fair.
4. Optionally, a **simile card** matching the clue's subject (`target` tag: face / voice / room / street / etc. inferred from clue kind and place kind), at most one per page, intensity 3 at most once per run.

Cards are drawn without replacement from `burned`. Slot filling: `{name}` → the subject's surname, `{place}` → current place short name, `{object}` → the object if any, `{time}` → the clue's time if any, `{detective}` → the detective's name. A card whose slots can't be filled is skipped.

Nothing-answers (asking about a topic that has no clue here) come from a small set of 20 hand-written lines in `src/game/voice-data.ts`, tagged by whether the person exists and is here, exists and is elsewhere, or the topic is meaningless. They should sound like the person is being asked something they don't know, not like a parser error. Clock still advances.

The narrator is first person. The detective's name appears only when other people address him.

## Presentation

A bound book. Cream paper, dark ink, a serif face from Google Fonts (a book face like Libre Baskerville or EB Garamond; one weight plus italic). Two pages side by side on wide screens: prose left, notebook right. Under 900px: one page, with the notebook behind a tab. A page turn on each action: simple, fast, no 3D. The prompt is a single typed line at the foot of the left page with a blinking cursor, styled as typewriter text in the book's margin. Underlined nouns are the only color on the page: a dark red.

Keep it restrained. No parchment textures, no drop shadows, no ornaments beyond a rule under the page header. Every page shows the case's neighborhood name and the clock in the running head.

Light and dark: the paper darkens to charcoal with pale ink under `prefers-color-scheme: dark`. Work at phone width with no horizontal scroll.

## Tests (`test/game/`)

- Parser: every command form, fuzzy names, ambiguity, unknown verbs, no action cost on errors.
- Reducer: costs, travel, clue delivery once only, threads derived correctly, clock math for every budget in 13..20, report scoring for all four endings.
- **Oracle playthrough.** `src/game/oracle.ts`: a pure player that follows spine clues via threads, traveling as needed. For seeds 1..100 at each difficulty, the oracle must obtain every spine clue **within `par` actions** using only the game's own commands. This proves the generator's par is real in the game's action model. If it fails, the bug is in whichever side is wrong; report which.
- Voice: never repeats a card within a run; skips cards with unfillable slots; always renders clue text verbatim.
- localStorage round-trip of `RunState`.

## Deliverables

1. Branch `m3-book`, not pushed. `npm run dev`, `npm run build`, `npm test` all working. Generator tests still green.
2. `docs/05-m3-notes.md`: what fought back; where the action model and par disagreed if they did; what the placeholder voice taught you about what the real voice needs.
3. A `README.md` update: how to run the book locally.

## Out of scope

Reputation, unlocks, persistence between runs beyond burned cards, sound, art, the real voice, multiple neighborhoods' visual identity, following suspects in real time.
