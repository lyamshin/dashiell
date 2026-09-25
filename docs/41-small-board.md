# The small board: rules for building a Dashiell logic game

*Draft for the designer, 2026-09-25. This replaces the puzzle part of docs/35. The designer played the legible-play build and wrote:*

> "the logic puzzle aspect is completely and utterly broken … you need to read how to create a logic game and set clear rules for that. I agree that this seems too complicated. So make it less complicated. We can arrive at story richness other ways. I think all of these take way too many steps."

The designer named four failures:

1. The suggested actions aren't logical. They point at the client first, when that isn't where anyone would start.
2. The deduction should be about **connections between stories**. If someone was at a place at a time, who else was there then? That's how a lie shows. Unless two people are in on it, there's no reason for a gap.
3. People have gaps in their evenings for no reason. Places and durations don't make sense either: people are out at bars or at home, and nobody stands around a subway kiosk for an hour.
4. There's no lead time. Poison acts instantly, and guns appear in hands.

## What the good ones do

- **LSAT games** have a setup, a handful of entities, four to six short rules, and a board small enough to draw. Every inference comes from rules **interacting**: two rules that share a person, a slot or a place. No single rule settles anything. A strong solver finds the two or three rules that touch all the rest.
- **Murdle** has three or four suspects, three or four weapons and three or four places, laid out as a grid where each suspect gets exactly one of each. Six to ten clues fill it. At higher levels each suspect makes a statement, and **only the murderer lies**. The grid is the whole game. The story is a paragraph and a joke per clue, and it's charming anyway.
- **Zebra puzzles** start from the solution, list every true clue, and remove clues while the answer stays unique. Every clue left is needed.

**What Dashiell has been doing:** it simulates a whole evening (six people, five places, twelve half hours, about 300 cells) and hides the puzzle inside it. It spreads about 140 facts across forty paid questions, and uses five kinds of inference at once: lies, strangers described, head counts with gaps, anchor events, and who knows whom. That's a search problem wearing a puzzle's clothes. Every fix since has been a signpost through the search.

## The rules

### The board

1. **It's small.**

   | | Raw | Coddled | Poached | Soft-boiled | Medium | Hard-boiled |
   |---|---|---|---|---|---|---|
   | suspects | 3 | 3 | 4 | 4 | 4 | 5 |
   | hours | 3 | 3 | 4 | 4 | 4 | 4 |
   | places, besides the scene | 2 | 3 | 3 | 3 | 4 | 4 |

   Slots are whole hours, such as 7, 8, 9 and 10. The board is suspects × hours, and each cell holds one place. The largest board is 5 × 4 = 20 cells, small enough to draw as the in-game grid.
2. **Places are where people are at night:** home, a bar or speakeasy, a restaurant, a theatre, a club, or work during working hours (a dentist until eight, a bartender all night). Transit is only ever something you pass through. Nobody spends an hour at a kiosk.
3. **People move for reasons, and not often.** A typical evening has one or two moves, each with a reason that gets said: "I closed up at eight and went for a drink."

### Accounts: whole, with company

4. **Asked "Where were you tonight?", everyone gives the whole evening,** every hour, and **who else was there.** "I was home until eight. Then the Velvet Room, with Steinbach and Vitale, till closing." There are no gaps. One question gets one whole account.
5. **Truthful accounts never contradict each other.** If two stories disagree, someone is lying. That's the game.
6. **A watcher** is someone whose job keeps them in one place all night: a bartender, a landlady, a doorman. Asked "Who was here tonight?", a watcher lists everyone they saw each hour, and says "nobody else" when that's true. That's the exhaustive list, like a closed LSAT group.

### Lies

7. **Every lie collides with something true.** A lie claims a place at an hour, and at least one truthful account or watcher at that place and hour doesn't include the liar. No lie is a gap, and no lie is undetectable.
8. **The culprit lies about the crime hour,** and about the means if needed. They never confess. Put to them, they refuse or tell a second lie, and the second lie collides too.
9. **One innocent may lie (from Poached up),** about one hour, to hide a secret: a card game, an affair, a debt. Put to them, they admit it, and the admission places them truthfully. That keeps lying from being a tell.
10. **Two people lie together only at Hard-boiled,** as the tier's signature: a matched pair of stories that agree with each other and collide with a watcher.

### Means take time

11. **Every weapon has an origin:** a place and an hour when it could be picked up. Chloral sits on a landlady's shelf or in a dentist's cabinet. A gun belongs to someone, and it's in a drawer until somebody takes it.
12. **The culprit was at the origin before the crime.** At least one innocent was too, and that innocent is the rival the player has to rule out. The scene tells the player where the weapon came from, for example by a label on the bottle or a gun that's registered to someone.
13. **Weapons act on real time.** Chloral takes twenty minutes to an hour, so it went into the drink before he was found asleep. A gun is fired where it's heard. The coroner's window covers one or two hours, and the scene or a sighting of the victim alive narrows it.

### The solve

14. **The answer is unique.** After every lie is resolved, exactly one person had access to the means **and** has no true account for the crime hour. The generator checks this with a solver on the small board. Motive matters for the report, but several people have one (Clue-style), so it never settles who.
15. **Every clue interacts.** Each clue shares a person, place or hour with at least one other clue, and no clue settles the case alone.
16. **The designed path is 5 to 9 questions,** because one question returns a whole account or a whole watcher's list. Par is that path. The night's budget is par + 3 at Raw, down to par + 1 at Hard-boiled.
17. **Low tiers are wide, high tiers narrow.** At Raw every rival falls two ways, for example two watchers or a watcher plus an account. At Hard-boiled each rival falls one way.

### Where to start

18. **Suggestions follow the order a detective would take:**
    - the scene first: the time, the means and where the means came from;
    - then whoever found the body, or last saw the victim alive;
    - then the watchers at the places the victim was, and where the means came from;
    - then the people those lists name.

    The client talks in the office, for free. Nothing suggests asking the client about the client.

### What goes

- Head counts, and the "couldn't swear to a number" holes.
- Half-hour slots.
- Strangers described as the main mechanic. They survive only as a Hard-boiled seasoning: a watcher knows one face but not the name.
- The acquaintance roll as a puzzle input. It stays for flavour.
- Anchor events (the whistle) as puzzle inputs. They stay for mood.
- The 140-column grid.
- A 60-fact confrontation picker. A confrontation becomes **their line against the line that breaks it**, which the player chooses from the accounts they hold.

**What stays:** the writing, the voice, sheets, decks, books, the lie rule, confrontations, the clock, the tiers, and the report. The story gets richer from the sheets and the people, not from more facts.

### The tier ladder (one new idea per tier)

| tier | what's new |
|---|---|
| Raw | Accounts and one watcher. The culprit's lie collides with the watcher. Time of death given exactly. |
| Coddled | Means with lead time: who could have got the weapon? |
| Poached | One innocent liar with a secret. |
| Soft-boiled | Time of death is a window. The last sighting of the victim alive narrows it. |
| Medium | The culprit claims somewhere nobody watches ("home, alone"). The lie falls to a side account (the landlady saw her go out), not a list. |
| Hard-boiled | Two people lie together, or one face without a name. |

## Worked example: seed 3, the Sirkin case, at Medium

*The same victim, people and places as the old seed 3, rebuilt on the small board.*

**The givens (the office).** Hauck, the client, is Sirkin's sister-in-law. Sirkin, a buildings inspector, was found dead in his walk-up over the drugstore on Grand Street at half past eleven, by Crowninshield. The police called it a fall. The coroner says chloral in a drink, dead between nine and ten. Hauck points at Steinbach, who blamed Sirkin for his ruin.

**The suspects:**
- **Marchetti,** a switchboard operator, lodges at Rafferty's. Sirkin had a file on her.
- **Steinbach,** a piano teacher, lodges at Rafferty's too. Sirkin ruined his business.
- **Vitale,** a bookmaker, owed Sirkin a favour gone sour.
- **Crowninshield,** a dentist, owed Sirkin $4,000.

**The places:** Sirkin's walk-up (the scene), Rafferty's rooming house on Mott Street, the Velvet Room (a speakeasy), and Crowninshield's surgery.

**The watchers:** Rafferty, the landlady, who sits on her stairs and knows her lodgers' steps; and Hargrove, the bartender at the Velvet Room.

**The truth** (the solved board):

| | 7 | 8 | 9 | 10 |
|---|---|---|---|---|
| **Marchetti** | Rafferty's (home) | Rafferty's | **Sirkin's walk-up** | the Velvet Room |
| Steinbach | Rafferty's (a lesson in his room) | the Velvet Room | the Velvet Room | Rafferty's |
| Vitale | Rafferty's (collecting from Steinbach) | the Velvet Room | the Velvet Room, **in the back room at cards** | the Velvet Room |
| Crowninshield | her surgery | her surgery | the Velvet Room | the Velvet Room |
| *Sirkin* | *his walk-up* | *the Velvet Room* | *his walk-up* | *dying* |

**The means:** chloral from the bottle on Rafferty's hall shelf. The bottle at the scene still has Rafferty's label on it. It was there at seven, and gone by nine. Crowninshield has chloral in her surgery too, which is a false lead, and her bottle is full.

**What each person says:**

| | says | true? |
|---|---|---|
| Marchetti | "Home in my room all evening. About ten I went over to the Velvet Room for a nightcap." | **Lie at 9.** Rafferty heard her go out at a quarter to nine, and she's on nobody's list at nine. |
| Steinbach | "A lesson at home at seven, then the Velvet Room with Vitale and Sirkin at eight. I stayed. Home by ten." | true |
| Vitale | "Steinbach's at seven, the Velvet Room at eight, **home at nine**, back to the Velvet Room at ten." | **Lie at 9**, to hide the card game. Put Hargrove's list to him and he admits it. |
| Crowninshield | "Surgery till half past eight, then the Velvet Room. I left at eleven and stopped at Sirkin's with the money I owed. The door was open." | true |

**The watchers' lists:**
- **Hargrove,** the Velvet Room: "Eight: Sirkin, Steinbach, Vitale. Sirkin left before nine. Nine: Steinbach, the dentist, and Vitale went through to the back room. Nobody else. Ten: Steinbach and the dentist, Vitale back out front, and Marchetti came in late, about ten. Nobody else."
- **Rafferty,** her house: "Seven: my two lodgers, Marchetti and Steinbach, and Vitale came up to see Steinbach. Eight: only Marchetti, in her room; the men had gone out. She went out herself at a quarter to nine. Nine: nobody but me. Ten: Steinbach came in. Nobody else. And the chloral off my hall shelf was there at supper and gone by morning."

**The designed path** (seven questions; par 7, budget 8 at Medium):

| step | question | what it gives | what it connects to |
|---|---|---|---|
| 1 | Search the scene | Chloral in the glass, Rafferty's label on the bottle, dead between nine and ten | The means came from Rafferty's. Who was there before nine? |
| 2 | Ask Rafferty who was in tonight | Marchetti, Steinbach and Vitale were all at Rafferty's at seven, so all three had access. Marchetti went out at a quarter to nine | Crowninshield never had access (her own bottle is full). Three rivals remain |
| 3 | Ask Hargrove who was in tonight | Nine o'clock: Steinbach, Crowninshield, and Vitale into the back room | Steinbach is at the bar at nine. Vitale is too, if Hargrove's right |
| 4 | Ask Vitale where he was | "Home at nine" | It collides with Hargrove's list, so one of them is lying |
| 5 | Put Hargrove's list to Vitale | He admits the card game, and the back room at nine | Vitale is cleared |
| 6 | Ask Marchetti where she was | "Home all evening, the Velvet Room about ten" | It collides with Rafferty: she went out at a quarter to nine, and nobody's list has her at nine |
| 7 | Put it to Marchetti | She refuses, or says "I walked" | She had access and no true account at nine. Solved |

- **Why it's Medium:** the culprit claims home, where only the landlady could say otherwise. What breaks it is Rafferty's side remark that Marchetti went out, together with every list at nine lacking her. It takes two clues interacting.
- **The rival:** Vitale had access and lied about nine. He's the red herring the player has to clear by confrontation, which is rule 9.
- **Steinbach**, the client's suspect, is cleared by Hargrove at step 3. Hauck was wrong about him, which the book can enjoy.

**The same case at Raw:** drop Crowninshield and Vitale's lie. Marchetti says "the Velvet Room at nine", and Hargrove's list says otherwise, so it's solved in four questions. Add a second route: Crowninshield passed Marchetti on Grand Street at nine.

**The same case at Hard-boiled:** Marchetti and Vitale cover for each other ("we were at Rafferty's together at nine"). Rafferty went to bed at half past eight, so only the missing bottle and Hargrove's back-room list break it.

## What building it takes

This is a rewrite of the puzzle stage, not a tune:

1. **A new truth simulation at board scale:** hours, sensible places, reasons to move, weapon origins with lead time.
2. **Accounts and watcher lists as the only fact types** (plus scene finds), each question returning one whole account.
3. **A tiny solver for the board:** uniqueness, the path, and the tier technique, checked the Tatham way (a solver limited to the tier's techniques must finish, and one limited below it must not).
4. **The grid as the board:** people × hours, filled with places, and marks where two stories collide.
5. **Confrontation as "their line against this line".**
6. **Pages planned from the path:** the scene, then the watchers, then the people. Sheets and decks carry the prose as now.

The old path stays behind `?engine=v1` until the new one plays better.

## Questions for the designer

1. Does the worked example feel like a logic game you'd enjoy? Try it on paper first.
2. Whole hours, and one question for a whole account: is that the right grain?
3. The tier ladder: is one new idea per tier right, and in this order?
4. Should watchers be people (a bartender, a landlady), or can a record do the same job (a sign-in book, a telephone log)?
