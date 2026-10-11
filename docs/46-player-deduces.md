# Build: the player deduces

*2026-10-11. Phase 2 of the 15% plan. The designer, an LSAT logic-games ace, wants a deduction game. As built, the board engine does the deducing for the player: through Medium, stars say which button to press, and the thought beat walks the elimination to the name. The player reads. This build moves the deduction back to the player without making the game opaque again (see docs/39 for what "opaque" meant: unreadable mechanics, not a lack of hints).*

*The deduction that fits this game is choosing the question that settles it next, and then saying what broke the culprit's story. Those become the player's two jobs.*

## 1. Stars point, they don't answer

A star marks a choice that would give the player a fact they don't hold. Its reason names the pointer, never the outcome: "Coffin has Ashby here at eleven", not "this clears Ashby". Rules:

- A star never names what the answer will show, who is cleared, or who is left.
- "Put it to X" is starred only at Raw and Coddled, where the pair is ready-made. From Poached up the player sees that X has a collision (the grid shows it) and chooses to put it, unstarred.
- The client is never starred.

Thinning by tier (today: Raw and Coddled every open step; Poached to Medium one cheapest path; Hard-boiled the first two steps):

| tier | stars |
|---|---|
| Raw | every open step of every cheapest way (as now) |
| Coddled | the open steps of one cheapest way (as now for Poached) |
| Poached, Soft-boiled | at most one star a page: the nearest open step |
| Medium | stars only on walks and arrivals (where to go), never on which question to ask |
| Hard-boiled | one star: the scene, on page one. None after |

## 2. Thoughts stop at the link

The thought beat after a job stays, but what it may conclude depends on the tier:

| level | tiers | may say | may not say |
|---|---|---|---|
| **walk** | Raw | everything it says today, including the elimination on the page that settles it | |
| **link** | Coddled to Medium | collisions ("Corrigan said home at eleven. Ashby had her on Stuyvesant Street at eleven. One of those can stand."), agreements ("which was what Coffin had"), the link to the scene ("Stuyvesant Street was where Prentiss kept Duchess"), the way in ("Three people heard where the key was") | "that cleared X", "that left N", "only X is left", any sentence that names who did it or how many remain |
| **fact** | Hard-boiled | restates the fact in the voice, and the collision when both lines are on this page | any link to an earlier page |

The turn (the recap at the first lie caught) follows the same level. "Go over what I have" lists what's held and what's open, and at link level says which claims have nothing under them, never who's left.

## 3. The report asks what broke the story

The report form gains one question after "who": **"What breaks their story?"** The player picks from the lines they hold that mention that person or the crime hour (a watcher's list, another person's account, a side remark), plus "A hunch." For a lost thing, "where it is now" likewise asks which line put it there (the handover remark), or "A hunch."

Scoring:

- who right + the true breaking line = **solved**;
- who right + a hunch or a wrong line = **right, but you couldn't have known**: half credit on who, said plainly on the verdict page;
- who wrong = as now.

The curtain shows the true breaking line next to the player's. The play CLI's `report` and `file` carry the new question. The save records it, so a measure can tell deduced from guessed.

The teach-once page gains its fifth line: "A name's no good to me without the line that breaks it."

## 4. Measures

In `scripts/board-measure.ts`:

- **oracle:** solved, at par, with the breaking line (must be 100%);
- **wanderer:** files who right (as now), and **files solved** (with the line). The second is the number that matters; target under 10% from Poached up;
- **refusal shortcut:** unchanged;
- **a new "reader" player:** follows every star and otherwise picks the first choice. Its solved rate must fall by tier: near the oracle at Raw, under 50% at Poached, under 20% at Medium, near the wanderer at Hard-boiled. This is the check that stars no longer solve the game.

In `scripts/board-prose.ts`: no thought above walk level contains "that left", "only … left", "cleared", or names the culprit before the report page. Add it as a lint.

## 5. Open rules, decided here

- **Small cases cracking on the first put:** unchanged. The put is now the player's work, and the report asks for it.
- **Raw and Coddled, where any caught lie names the culprit:** unchanged. They're the teaching tiers, and the report's new question is the lesson.

## Done means

- The measures above hold, on 50 seeds per tier.
- Read one night per tier with `npm run read` and confirm no thought oversteps its level; play a Poached night and a Medium night by hand through the CLI, filing once with the line and once on a hunch, and check both verdict pages.
- The browser at desktop and 375 px: the report's new question, the verdict's two forms, the curtain.
- A "Built" section in this doc.
