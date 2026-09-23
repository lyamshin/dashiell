# M9 — Deduction

*Draft, 2026-09-23. It is written ahead of the play diagnosis (`docs/18-diagnosis.md`) and gets revised against its numbers before anything builds.*

## The problem, in the designer's words

> This should be a deduction game. That's really what you're solving. I think there has to be a way to show where people were as a grid. And you may have to make it so it's not so obvious that people weren't at the murder scene. And people probably need to lie a bit more, so that you're forced to puzzle it through.
>
> As built, it feels like you're just pushing random buttons, hoping to run into a person who gives you something. It seems glad to loop you around endlessly for no reason.

Today almost every useful clue is a finished conclusion: "Kreuzer says Hanrahan was at the third floor at ten." The player collects conclusions until one name is left. There is nothing to work out. So the only skill is finding the right button, and the buttons are many.

The fix is to hand the player **pieces that have to be put together**, and a board to put them on.

## The board: the grid

The notebook's "Where they were" grid is being built in parallel (`docs/19-grid-notes.md`). Rows are people and columns are half hours. Each cell holds claims with their sources: a person's own account, another person's word, or evidence.

M9 makes the grid the center of the game, not a summary of it.

## 1. One rule about lies, taught early

> **People lie about themselves. Nobody lies about what they saw.**

- **A suspect's own account may be false.** It may be false where it covers the crime (the culprit) or where it covers a secret (the innocents with something to hide).
- **A statement about someone else is true** as far as the speaker could see. Fixtures, documents and physical evidence are always true.
- **An alibi companion is the one exception.** They lie for the person they're covering, and only about the ticks they share.

This one rule makes the puzzle solvable by reasoning instead of luck. The player always knows which cells to trust. It's printed on the title page at the tier where lies first matter ("This time: somebody else is lying too." at Poached). It's also in the help.

**More lies.** Every suspect with a secret lies about the ticks their secret covers, not only the ones at the crime's half hour. The culprit lies about the crime tick and about the fetch of the means. Every lie that matters is contradicted by at least one findable fact. That is a solvability requirement, checked by the generator.

## 2. Pieces, not conclusions

Placements come in forms that need combining. Each form is a new clue shape, and the grid shows each one honestly.

1. **Anchor-relative time.** "I saw Hanrahan go up the stairs on Ninth just as the El went over." The sighting has no clock time. It lands on the grid only once the player knows when the El ran, from another clue. Until then, it sits in a margin row under the anchor's name.
2. **Description instead of a name.** A witness who doesn't know the person describes them: "a woman in her thirties, turning a coin over her knuckles." Strangers describe and acquaintances name, using the acquaintance data the cast already has. The player links a description to a person when the notebook holds enough to match, meaning the portrait, sex, age band and trade. It's a tap on the grid entry, "That was Kreuzer," and it's free. A wrong link is allowed, and the report is where it costs.
3. **Absence.** "Nobody came up those stairs between nine and eleven except the landlady." It's a negative fact covering a place and a span, and it clears anyone who claimed to be there, or catches them.
4. **Direct placements stay,** but fewer. At the crime's half hour, no innocent is cleared by a single direct statement from a single source above Coddled. Clearing takes two pieces: an account plus a corroborating sighting, a sighting plus an anchor, or an absence plus a claim.

**Tiering.** Raw and Coddled keep today's direct placements, so the first runs stay short and plain. Poached adds lies about secrets and the confront verb. Soft-boiled adds anchor-relative times. Medium adds descriptions. Hard-boiled has all of it.

## 3. A verb: confront

The player lacks a way to act on what they've worked out. Add one.

When the grid shows a conflict involving a person's own account, that person gets a new marked choice: **"Put it to Hanrahan."** It costs a half hour. What happens depends on who they are:

- **An innocent with a secret** gives up the secret. "All right. I was on Ninth. I was fixing the books." This clears them of the crime. The grid cell resolves, and a real lead usually opens from what they admit.
- **The culprit** doesn't confess. They either tell a second lie, which is itself contradictable and is a strong tell once it's caught, or they go quiet. On a page, the quiet reads as a tell.
- **An alibi companion** withdraws the alibi. That leaves the person they covered with an empty cell at the crime's half hour.

Confronting without a conflict isn't offered. This turns catching a lie into the payoff it should be, and it gives every lie a reason to exist.

## 4. Fewer, better choices

- **Ask topics shrink.** For each person present: their evening, themselves, people the notebook knows, open leads (marked), and "put it to them" when there is a conflict. Places and things drop out except as leads. They were the main source of half hours spent for nothing.
- **An exhausted person says so.** Once someone has nothing more to give, their topics come back free with "I've told you what I know." The notebook marks them done. No more paying to find that out.
- **No loops.** A lead never points back to a clue already found, a bridge never sends the detective to a person with nothing left, and the leads graph is acyclic. The diagnosis will say how often each happens today.
- **The grid suggests the next question** without answering it. An empty cell at the crime's half hour on a person's row is itself a reason to ask about that person. The errand line can say so: "Nobody had placed Schilling at ten. I wanted somebody to."

## 5. The report

The report becomes a page of the grid. Across tiers it asks the following:

- **who,** at every tier;
- **when,** the half hour, from Soft-boiled up;
- **where each suspect was** at the crime's half hour, from Medium up. That's the crime column filled in.

Scoring counts correct cells, like Obra Dinn's fates. This rewards reasoning, not a lucky name. At Hard-boiled, a correct "who" with a wrong column is partial credit and says so.

## 6. What the generator needs

- **The lie model** from §1: secrets' ticks, the culprit's means fetch, alibi companions, and every lie contradicted by something findable.
- **The new clue shapes** from §2, with their `Establishes` facts: `sightingAtAnchor`, `describedAt`, `absentFrom`.
- **A deduction solver** to replace the current solvability check. It reasons over the grid the way a careful player would:
  - trust non-self statements;
  - resolve anchors to times;
  - link descriptions when the features are unique among the known cast;
  - apply absences;
  - treat a self-account as true only when corroborated.

  A case is accepted only if the solver reaches a unique culprit and a filled crime column from the findable clues within par. Par is recomputed as the shortest route that gives the solver enough.
- **Two new difficulty dials:** the share of placements that are pieces rather than conclusions, and the number of lies.

## 7. What the engine needs

- **Grid entries for the new shapes:** a margin row for anchor-relative sightings until the anchor is known, unlinked descriptions, absences as spans, and the link interaction.
- **The confront choice and its outcomes,** with thought classes for each outcome and page shapes for a confrontation.
- **The topic trimming, exhausted people, and loop fixes** from §4.
- **The report as the crime column,** and its scoring.
- **The rule about lies,** in the title page, the help, and the first-run text.

## 8. Open questions for the designer

1. **Descriptions and linking.** This is the most Obra Dinn thing here, and the most new work. Keep it in M9 or hold it for the next milestone?
2. **Confront outcomes for the culprit.** A second lie or silence? Or should the culprit sometimes break at Raw and Coddled, so the first runs end on a confession?
3. **The report as the crime column.** At Medium and up, or only at Hard-boiled?
