# M6 — Choices

The text box goes. Every page ends in big, clear buttons: ask, search, go. Each move says why the detective came. The clock is always in view.

This replaces the prompt as the way a person plays. It does not change the engine's rules, the generator, or what a clue is. The parser stays, because the transcript tool, the oracle player and the tests all drive the game with typed commands.

The complexity tiers in `07-m5-shape.md` are the milestone after this one.

## Decisions already made

These came from the designer and are not open.

1. **Leads are marked.** A choice that takes an open lead carries a mark. Unmarked choices still work.
2. **Every place is listed from the start.** The neighborhood is small. The choice is where to spend the half hour, not whether a place exists.
3. **Two clicks for a lead in another room.** Going is one choice and one half hour. Asking is another. A notebook lead never does both at once.

## 1. The choice model (`src/game/choices.ts`, pure)

One pure function builds everything a page offers:

```ts
export interface Choice {
  /** The typed command this choice issues. The reducer sees nothing else. */
  command: string;
  /** Button text, sentence case, no verb when the group heading carries it. */
  label: string;
  /** Minutes this choice will move the clock. 0 means free. */
  minutes: number;
  /** Takes an open lead. Drawn with the mark. */
  lead: boolean;
  /** Already done. Still offered; see §1.4. */
  done: boolean;
}

export interface ChoiceGroup {
  kind: 'ask' | 'search' | 'go' | 'free';
  /** "Ask Callahan about", "Search", "Go to". */
  heading: string;
  /** For `ask` only: whose topics these are. */
  personId?: Id;
  choices: Choice[];
}

export function choicesFor(view: CaseView, state: RunState): ChoiceGroup[];
```

### 1.1 Cost is never a guess

Add `costOf(command, state, view): number` in the reducer module and use it inside `step`. The choice model calls the same function. A button's minutes are `minutesAfter(used + cost) - minutesAfter(used)`, so the label matches what the clock will do, rounding included. A test walks every choice on every page of forty seeds and checks the clock moved by exactly what the button said.

### 1.2 Ask

One `ask` group per person in the room. Topics, in this order:

1. **Open leads for this person**, marked. These are the exact generator topics from `threadsFor`.
2. **Their evening**, and **themselves**.
3. **Why I was hired**, for the client only.
4. **People** the notebook knows: met, or heard named. Never the person being asked.
5. **Places** the notebook knows.
6. **Things** the notebook knows: objects seen or found.

A topic that is also an open lead appears once, in the lead position, marked. The victim appears as a topic but never as someone to ask, under the existing rules for each case type.

When the room holds more than one person, the page shows one person's topics at a time, with a free row of name buttons to switch. Switching costs nothing and does not write a page. The default person is the one with a marked lead, else the one most recently spoken to, else the first to enter.

A person's topic list beyond twelve choices collapses under a free "Other topics" button. Marked leads, evening and themselves are never collapsed.

### 1.3 Search

"Go through the room" for the place, then each object the notebook knows is here. Marked when an open lead points at it.

### 1.4 Repeats

With buttons, a person will click something twice by accident. So a repeat costs nothing and says so. Asking the same person the same topic a second time replays the notebook's record of the answer, and the page says it was already asked. Searching a room or object a second time works the same way. This extends the parser's rule that "nothing typed by mistake costs an action" to clicks. `done` choices draw with a check and "free".

The one existing exception stays: `themselves` is already free the second time.

### 1.5 Go

Every place in the case, the office included, minus the one you are in. Alphabetical by short name, with the office last. A place with any open lead is marked. A place not yet visited says so in small type.

### 1.6 Free

Notebook, and File the report. `look` and `help` are no longer offered as buttons. The page already shows who is in the room.

## 2. The errand line

Every page that moves the detective somewhere opens with one or two sentences in the detective’s voice saying why they came. It is the first thing on the page, set apart in italics, before the arrival texture.

### 2.1 Where the reason comes from

The reason is derived, never invented. On arriving at place P:

1. Collect the open leads whose target clue is at P.
2. For each, find the clue already in the notebook that opened it: a found clue whose `leadsTo` includes the target. The newest such clue wins.
3. The errand is built from two parts:
   - **Because**: who or what sent the detective. A person said something, a document named it, or a thing found somewhere pointed here. The subject is the source clue's person or place.
   - **For**: what the detective came to do. This comes from the lead's shape: ask this person about that person, about a thing, about a place, about their evening, or search the room or a thing.

The correspondence checker must trace every errand sentence to the source clue and the target lead, the same way it traces everything else. An errand line may repeat what the notebook holds. It may never say anything the notebook does not.

### 2.2 The cases without a lead

- **No lead points here.** "Nobody sent me. I came to see." A short deck of these, keyed by whether this is a return.
- **Two or more leads point here.** Name the newest. Add "and there was the other thing" only when there are exactly two. Never list them.
- **The first arrival at the scene.** The client's pointer is the reason. The existing scene opening follows.
- **Back to the office.** Its own few lines: going back to the desk to think is a real move and costs the half hour like any other.
- **Returning to a place already searched.** Keyed separately, because "I came back" reads differently.

### 2.3 The deck

A new deck, `content/decks/errand.json`, with cards shaped like every other deck. Tags:

- `because`: `said` (a person said it), `document` (paper named it), `found` (a thing pointed here), `none`, `office`, `return`.
- `for`: `ask-person`, `ask-thing`, `ask-place`, `ask-evening`, `search-room`, `search-thing`, `none`.

Slots: `{name}` for the source person, `{subject}` for the person, thing or place the errand is about, `{place}` for here. Cards are plain register. The golden rules hold: one clause of figure at most, nothing clever, clarity first.

The engine agent writes at least three placeholder cards per tag pair that the engine can reach, marked `status: placeholder`, so the build compiles and the tests have something to deal. A content pass fills the deck to about fifteen per pair afterward.

### 2.4 Budget

The errand line counts against the page's word ceiling and is never cut. If the page runs over, `CUT_ORDER` cuts from the texture as it does now. It does not count as the page's one beat.

## 3. The clock

Three places, all always in view.

1. **The running head** shows the time large, in the book's serif, beside the place name.
2. **A strip under it** has one notch per call in the night's budget. Spent notches are filled. The next notch is amber. The text under the strip says how many calls are left before the DA files at eight, in words up to twenty.
3. **Every costed button** shows its minutes. "½ hr" when it is thirty, else "25 min". Free buttons say "free".

When an action carries the clock across an hour, the page's passage-of-time beat is an hour line: "It was past three." When two calls remain, the beat says so in the detective's voice. On the last call, it says this is the last one. These replace the existing passage-of-time beat, never add to it. They can live in `transitions.json` under an `hour` tag or in a new deck, as the engine agent judges.

The strip animates the notch filling when an action lands. Nothing else animates.

## 4. Names on hover

Every person's name in the prose, and on the ask buttons, shows a card on hover. On touch, a tap shows it and a tap elsewhere hides it. The card holds only what the notebook holds: full name if known, age band, trade, where they were met or who named them, and the one newest line in the notebook about them. For someone not yet met, the card says who named them.

Places get the same card: kind, who watches it, visited or not, open leads here.

Clicking a name no longer opens the action menu in `menu.ts`. The buttons are the actions now. Remove the menu.

## 5. The page

The page is prose, then choices. On a 1280×800 window the first group of choices must be visible without scrolling on every page of the golden loop seeds. On a 390×844 phone, buttons stack full width with at least a 44-pixel tap target, and the prose scrolls above them.

The word ceiling in `page.ts` drops from 300 to 220. `CUT_ORDER` does the cutting, thinking first, then texture. Run the golden loop harness after the change and report the distance. The aggregate may rise; it must stay under 0.05. Report per-page numbers either way.

The office page is page one and works the same way. The client is the one person in the room. "Why I was hired" and the people the client named are the marked topics. The two questions on the house still apply, and those buttons say "free".

When the night is over or the report is filed, the choices are replaced by the report form as now.

## 6. What stays

- The parser, the typed command strings, and `stepInput`. Buttons call `stepInput` with their `command`.
- The oracle player and `npm run read`.
- Turning back through pages. A turned-back page shows its choices greyed and inert.

## 7. The transcript tool

`npm run read` prints each page's choices under it, one line per group, with marks, so a reviewer can read a run without a browser:

```
  Ask Callahan about:  *Grasso · his evening · himself · Sweeney · Kreuzer   (½ hr each)
  Search:  the room · the till                                               (½ hr each)
  Go to:   *the pawnshop · the suite · the office                            (½ hr each)
```

The oracle's chosen command is marked with `>`.

## 8. Tests

- **Every choice is valid.** On every page of forty seeds at each difficulty, every offered command parses, the reducer accepts it, and it costs exactly the minutes on the button.
- **The choices are enough.** Every command the oracle issues is among the choices offered at that moment, and the oracle still solves every seed within par plus one using only offered choices.
- **Leads are marked, and only leads.** A choice is marked if and only if it takes an open lead.
- **No leaks.** No topic, person or thing appears in a choice or a hover card before the notebook holds it. Places are the exception, by decision 2.
- **Repeats are free.** A second identical ask or search costs zero and finds nothing new.
- **Errands trace.** The correspondence checker passes with zero violations over forty seeds with errand lines on.
- **The clock.** The strip's filled notches equal actions used on every page.

## 9. Out of scope

- Keyboard shortcuts beyond ordinary tab and enter.
- Sound, animation beyond the one notch.
- Any change to the generator, the budget, par, or the dials.
- Filling the errand deck past placeholders. That is a separate content pass.
