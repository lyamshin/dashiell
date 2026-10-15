# The dial on the other decks

*2026-10-15. Branch `decks-dial`.*

Docs/53's rule, applied to every deck the game still deals from besides the situated one (docs/51 has that one). The decks covered:

- the board's families in `content/board/` (all but `situated.json` and `voicings.json`);
- the four old decks in `content/decks/`;
- the bible's voice lines (`content/neighbourhood/people.json`) and its arrivals (`places.json`).

Content only: no file in `src/` changed. Every card id, tag, token and joke flag is kept, as is every family's count. No line was cut.

## The audit

`npx tsx scripts/decks-dial.ts` covers all of this; its header documents it. The clarity lint now lives in `scripts/clarity.ts`, shared with `situated-dial.ts`, and it takes two options here:

- `anyToken`: a token (`{Src}`, `{name}`) counts as the noun a "that" can mean;
- `speech`: for the bible's voice lines, which answer a question, the pronoun rule is let be.

A line is one piece of text the game says. That covers 2,525 lines:

- each card's text;
- the export phrases and pay-offs of the props and traits;
- each voice line and each arrival.

They were read in seven batches by file, one helper at a time, under one brief. The brief gave docs/53, docs/51's dial section, the flags and verdicts as in docs/51, and one more flag, `repeat`: a line that names a place or a time the page has already named.

I read every rewrite in each batch and a seeded tenth of its keeps, and changed 21 rewrites:

- three hit the prose lints' banned "had … in this room";
- one hit "That was why I’d come";
- the rest were flat, or made several cards say the same new phrase.

`check` holds each rewrite to:

- the same tokens, curly quotes, and the plain terms;
- no verifier reason the line didn't already have (docs/50);
- the same opening and ending shape.

It also checks the words the dealer and the bible's filters read, so a rewrite can't move a draw or change who is eligible:

- a hand-off that opens on "That";
- "door";
- pictures, a screen or a newsreel (any of these makes a theater a picture house);
- the watcher's name or trade in an arrival;
- the hours named, and no other person or place in a voice line;
- the leaving words that drop an hour line;
- the nobody/all/the lot in a "nobody else".

The audit is `model/data/decks-dial.jsonl`: one line per line audited, with its flags, its verdict, and its text before and after.

| file | lines | flagged | tag | ellipsis | compressed | rhythm | translate | pronoun | place | long | repeat | rewritten | cut | kept |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| board/connective.json | 568 | 54 | 0 | 6 | 8 | 4 | 4 | 17 | 24 | 0 | 0 | 54 | 0 | 514 |
| board/still.json | 70 | 8 | 0 | 1 | 2 | 0 | 4 | 0 | 1 | 0 | 0 | 8 | 0 | 62 |
| board/walk.json | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 22 |
| board/office.json | 105 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 3 | 0 | 102 |
| board/places.json | 395 | 25 | 0 | 2 | 2 | 0 | 3 | 0 | 4 | 0 | 14 | 11 | 0 | 384 |
| board/people.json | 231 | 9 | 0 | 1 | 0 | 0 | 2 | 0 | 6 | 0 | 0 | 9 | 0 | 222 |
| board/telling.json | 95 | 7 | 0 | 0 | 0 | 0 | 0 | 5 | 2 | 0 | 0 | 7 | 0 | 88 |
| board/confront.json | 94 | 17 | 1 | 1 | 2 | 0 | 0 | 14 | 2 | 0 | 0 | 17 | 0 | 77 |
| board/night.json | 64 | 8 | 0 | 1 | 1 | 0 | 0 | 6 | 0 | 0 | 0 | 8 | 0 | 56 |
| decks/character.json | 153 | 20 | 1 | 16 | 1 | 0 | 3 | 1 | 2 | 0 | 0 | 19 | 0 | 134 |
| decks/entrances.json | 18 | 3 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 15 |
| decks/office.json | 114 | 6 | 0 | 1 | 3 | 1 | 0 | 3 | 0 | 0 | 0 | 6 | 0 | 108 |
| decks/watch.json | 48 | 3 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 3 | 0 | 45 |
| neighbourhood/people.json (voice) | 462 | 21 | 0 | 2 | 4 | 4 | 11 | 1 | 1 | 0 | 0 | 21 | 0 | 441 |
| neighbourhood/places.json (arrivals) | 86 | 17 | 0 | 3 | 3 | 1 | 4 | 1 | 1 | 7 | 1 | 16 | 0 | 70 |
| **all** | **2,525** | **201** | **2** | **35** | **30** | **11** | **31** | **49** | **44** | **7** | **17** | **185** | **0** | **2,340** |

Sixteen flagged lines are kept. All but one were put back after the blind read (below):

- the fourteen return cards;
- one trait pay-off (`chr-282`);
- one arrival (`lyric/arrival/1`).

What the rewrites were, mostly:

- **"here" and "there" for the place:** "had been here all night" became "had been on duty all night", and "{Name} was right here" became "{Name} was in the same room".
- **"That was X." and "It was X." for the fact before:**
  - in the confrontation's closes ("That was a hole, and {name} had filled it with a name", which is docs/53's own example);
  - in the account and motive closes, the report's closes and the endings.
- **Pay-offs that only made sense right after their setup:** a trait's or a prop's call-back is said pages later, so it now names its thing ("It was neither" became "It was neither the police nor a winner").
- **Riddles in the bible's voices:** "Two falls out of three. You got the first." "It went by in shells." "Here’s the whole cloth" said before a confession. Each person kept their trade's flavor word.

### The two leftovers from #86

- **"{Src}. That settled where I was going." (`bcn-2050`)** is said on arrival, after I've got there. It is now "{Src}, and that was what had brought me." The obvious "That was why I’d come" is on the prose lints' banned list.
- **A card naming a place or a time the page already named:**
  - Both office knocks that said "midnight" (`bof-101`, `bof-102`) come after every office opening has said "Midnight." They now say "this late" and "at this hour".
  - The fourteen return cards ("Back at {place}. …") come right after the walk line names the place, on 452 of 458 return pages in 240 nights. They were rewritten without `{place}`; return draws always fill it, so no draw could move. Both blind readers then took the old cards in every pair that showed one ("‘I was back’ makes you check where back is"), so the old cards are back. The repeat wants mending in the walk line, which is the engine's (below).
  - The other place repeats are the hand-offs ("{Job} at {place} would know who’d been in"). They are pointers to the next place, so they keep the place.

## The clarity lint

`npx tsx scripts/decks-dial.ts lint`, against `eef86d6`:

| file | before | after |
|---|---|---|
| board/connective.json | 42 | 5 |
| board/still.json | 1 | 0 |
| board/walk.json | 2 | 2 |
| board/office.json | 4 | 4 |
| board/places.json | 9 | 5 |
| board/people.json | 6 | 0 |
| board/telling.json | 7 | 0 |
| board/confront.json | 16 | 1 |
| board/night.json | 9 | 3 |
| decks/character.json | 2 | 0 |
| decks/entrances.json | 0 | 0 |
| decks/office.json | 1 | 1 |
| decks/watch.json | 2 | 0 |
| neighbourhood/people.json | 5 | 4 |
| neighbourhood/places.json | 8 | 2 |
| **lines flagged** | **114** | **27** |
| pronoun | 56 | 13 |
| place | 49 | 9 |
| long | 11 | 5 |
| tag | 0 | 0 |

The 27 left were each read and kept:

- hand-offs that must open on "That" (the dealer reads it);
- the client's "It’s {thing}" and other speech;
- "from there to {dest}" in the walk frames;
- "It was a clear night" and "It didn’t take long";
- four find paragraphs over 40 words, each a run of short clue sentences;
- one arrival the readers preferred long.

As in docs/51, the lint is a floor, not the audit: 114 lines tripped it, and the reading flagged 201.

## Measures

**Dealt boards are unchanged.** The digest of every dealt board, over 60 nights × both worlds × both routes, is `4163fbca9152` before and after (`decks-dial.ts dump`, then `boards`).

**The dealer's draws** are the same. Where a page's cards differ (49 of 3,208 pages), the difference is a choice made on the text by design:

- the microplanner's rhythm, which trades a card for another the same draw could deal, by its length;
- the bible's staging, which passes over a detail that echoes the arrival's words.

With the planner off, 12 pages differ: ten are bible staging details after a rewritten arrival, and two are search closes in the neighbourhood (`bcn-3062`–`3064`), which I haven't traced.

**`board-prose`,** 30 nights a tier from seed 41, both worlds, before → after:

- **Every lint is unchanged:**
  - reader lint, correspondence, over-level, plain terms, cards twice, names, clues, place names, banned phrases, signposts, gags and pets are 0;
  - the one dealt Hard-boiled sentence said twice and the neighbourhood's Poached pronoun ambiguity are as before.
- **Words a page** move by 0–2.
- **List smell, oracle:**
  - dealt: Raw 21 → 19, Coddled 11 → 10, Poached 25 → 19, Soft-boiled 16 → 15, Medium 34 → 30, Hard-boiled 36 → 31;
  - neighbourhood: Raw 31 → 29, Coddled 20 → 21, Hard-boiled and the rest unchanged.
- **List smell, all three routes:**
  - dealt: down at every tier;
  - neighbourhood: 788 → 786, with Coddled 81 → 82 and Hard-boiled 118 → 121.

  The neighbourhood's few new runs are three medium sentences where a split arrival sentence or a rewritten card fell next to two others. Two rewrites were taken back towards their old shape for it: `wch-063` and `peacock/arrival/1`.

The full suite passes: 678 tests.

## The blind read

`decks-dial.ts read --before … --after …` made the pairs: 20 pages, both worlds, every tier, office, arrival, account, list, search and turn pages, each written twice from the same night. Two readers read them one at a time, unlabeled, with docs/53's rubric: which page is clearer, and still sounds like the game, in that order. `situated-dial.ts score` scored them.

**After was preferred in 14 of 20 and 13 of 20: 27 of 40 (68%).** The target was 60%.

What the readers were right about, and what was done:

- **The return cards (pairs 6, 10, 12).** "Back at Steinmetz’s says where; I was back makes you check where back is." Both readers took the old card both times. The fourteen old return cards are back.
- **A trait pay-off (pair 11).** "Next to all that handmade sewing" pointed at sewing the page never showed. The old "in that company it knew it" is back.
- **An arrival (pair 17).** The split had made "There were programs in the gutter…" from "had the look of a party after the guests have gone: programs in the gutter…". Both readers took the colon, and the old sentence is back.
- **A cap pay-off (pair 19, one reader each way).** Neither version was clear. It is rewritten again: "That uniform cap had been reshaped by a hundred hot nights. My own hat had had a few nights of its own, and not hot ones."
- **The client-here cards (pair 4).** Both readers took "Mrs. Blau, my client, was already there" over a card that only implied the client. That was the rhythm trading one card for another, but `bpe-1304` now says "my client" too.

The phrases both readers found hardest were all on the side before the dial:

- "It was neither.";
- "I’d never dared.";
- "lighter than holding my head";
- "stopped pretending that mattered to it";
- "for the next one, and found it there".

## Ten before and after, verbatim

- `bcn-2050` (connective, why, compressed)
  - before: "{Src}. That settled where I was going."
  - after: "{Src}, and that was what had brought me."
- `bcn-3039` (connective, arrive-close, translate)
  - before: "I gave the place a minute to show me what it had."
  - after: "I took a minute to look the place over before I did anything else."
- `bcf-311` (confront, admit-close, tag)
  - before: "That was a hole, and {name} had filled it with a name. A name I could ask."
  - after: "Now the hole in {name}’s story had a name in it. It was a name I could ask."
- `bof-101` (office, knock, repeat)
  - before: "Somebody came up the stairs. Nobody comes up those stairs after midnight with good news; the good news waits for morning, like a gentleman."
  - after: "Somebody came up the stairs. Nobody comes up those stairs this late with good news; the good news waits for morning, like a gentleman."
- `bcn-1002` (connective, search-close, compressed)
  - before: "I wrote it down, and where I’d found it, and what it wasn’t."
  - after: "I wrote down what I’d found, and where I’d found it, and what it ruled out."
- `bst-322` (still, aside-beat, compressed)
  - before: "{He} looked at the ceiling for the next one, and found it there."
  - after: "{He} looked up at the ceiling until the next name turned up."
- `chr-410/trait/pay/0` (character, a bookmaker's pay-off, ellipsis)
  - before: "The door opened. It was neither. It hardly ever is, which is how bookmakers stay in business."
  - after: "The door opened. It was neither the police nor a winner. It hardly ever is, which is how bookmakers stay in business."
- `off-022` (office deck, pronoun)
  - before: "… The clock over the door had stopped pretending that mattered to it. I let it keep its own count."
  - after: "… The clock over the door had stopped pretending my sleep mattered to it. I let it keep its own count."
- `szabo/voice/ownUp/0` (the bible, a wrestler owning up, translate)
  - before: "Two falls out of three. You got the first. Here’s the rest."
  - after: "All right, you pinned me fair. Here’s the rest."
- `wexlers/arrival/2` (the bible, an arrival, translate)
  - before: "… because the pawnbroker leaves a lamp on over the jewelry to discourage the people it would encourage."
  - after: "… The pawnbroker leaves a lamp on over the jewelry, to discourage anybody the jewelry might give ideas to."

Kept as they were, because the touch is one anyone gets:

- "Nobody comes or goes in a rooming house without the landlady knowing, and {name} had the look of a landlady who made a point of it."
- "I counted the money once in front of my client, which is rude, and once on the stairs. Which is business."
- "After ten I’m not a landlady, I’m a customs house." Only the sentence before it was rewritten.

## Left over

- **The return page names its place twice:** the walk line ("The Palace lay a few blocks uptown and west.") and then the return card ("Back at the Palace."). The readers want the card's. The walk line on a return could say "back" instead ("It was a few blocks back to the Palace"), which is `pages.ts`'s.
- **Dead cards:**
  - Four hand-offs that the prose lints ban were never dealt in 240 nights: `bcn-2781`, `2785`, `2786` and `2787` ("The next place worth the walk…").
  - Eight bible "nobody else" lines lack a word the filter wants ("That’s the field. No other runners.").
  - Eight hour lines have a leaving word ("asleep", "bed"), and one own-up names another person (`nowak`).

  All of these were left as they are. Each could be made live or retired.
- **Bible hour lines that name a post** ("light the stove in the card room") are used as codas on account pages too, where they could contradict an account that put the person elsewhere.
- **`bof-1402` said "who did this to him"** of a victim who may be a woman. It is now "who did this".
- **The office's pay-off lines mix where they're said from:** some read as if I'm in the office, others from away. Their page decides which.
