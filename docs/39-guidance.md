# Guidance: making the way in visible

*2026-09-24. This follows three blind playtests (seeds 11 Raw, 3 Medium and 21 Medium, all on the new engine): all three solved, all three used every call, and all three called the game "opaque more than hard." It also follows the designer's own play: "the gameplay doesn't work." Build it after `honest-mechanics` lands.*

## 1. Confront help, by tier (designer approved)

- **Raw and Coddled:** when the notebook holds a fact that breaks someone's own account, offer the confrontation ready-made as its own choice, with the fact named: "Put it to Rafferty: Tillman says you weren't at the Garibaldi at half past eight." This teaches the move. A ready-made confrontation is only offered when the fact really breaks the account.
- **From Poached up:** "Put it to …" opens a picker showing only the facts about that person at the half hours their own account covers, grouped by half hour, plus facts that place someone they claim to have been with. Nothing is marked as the one that breaks it: the player still has to see it. The full notebook stays one tap away ("Everything else in the notebook").
- **A landed confrontation looks like one** at every tier. The page says the story broke ("That was a hole, and she knew it") and the notebook records it. Silence from the culprit reads as refusal on a broken story, not as nothing happening.

## 2. Stars follow the deduction, not the client

In v2 the engine knows the deduction graph, so a star marks a choice that serves an **open step** of the graph: a fact the player doesn't yet hold but can reach from here.

- **At most three stars on a page.** Prefer the step nearest the bottleneck.
- **The client's pointer is never starred for being the client's.**
- **At a place with a watcher, on the first visit,** "Ask <watcher> about <this place>" is starred when that count or those sightings serve an open step. The first time a player meets a watcher, the page says what watchers are good for, in one line of the detective's voice ("A landlady who sits on her stairs knows who used them. Names, maybe not.").
- **v1** keeps its leads, with the client's pointer no longer starred.

## 3. The grid shows what should jump out

- **A missing sighting:** when a witness was at a place at a half hour and names who was there, anyone who claims that place and half hour but isn't named gets a soft mark in their cell: "? not seen by Abramowitz". It's a mark to think about, not a verdict.
- **A count that doesn't add up:** when a count at a place and half hour is lower than the number of people who claim to be there, the cells get a mark: "counted 1, 3 claim it".
- **At Raw and Coddled,** a cell marked like this also makes the ready-made confrontation available. From Poached up, the mark is the only help.

## 4. Fewer quips, cleaner testimony

- **About one quip a page.** Playtesters called three or four per page "padding between facts." That means one sheet-level joke per page, and card quips (activity tails, closes, tails) are dealt only when the page has no other joke yet.
- **No raw time lists in testimony.** "Not here from six until half past seven or from half past eight until half past ten. Not at the El at eight o'clock" reads as "machine output wearing a fedora." Tellings must follow `docs/golden/seed3-testimony.md`: the ordinary span said plainly, the one that matters said with weight, and the rest summarized ("the rest of the evening he wasn't here").

## 5. Teach once

The first night on a profile gets a short, skippable teaching page before the office. It's four lines in the detective's voice:

- **the lie rule**, as it's taught today;
- **watchers count their rooms;**
- **a story that breaks is worth putting to them;**
- **the grid is your board.**

Players on the first tier see the page every night until their first solved case.

## Measure

Blind playtests again, on the same three seeds, plus one new seed at Poached, using the same prompt as before. They pass if:

- nobody loses calls to mislabelled costs;
- every tester uses confront at least once;
- testers finish with calls to spare at Raw;
- no report calls the game "opaque".
