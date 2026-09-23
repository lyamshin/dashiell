# M9 — Deduction

*Draft, 2026-09-23. It is written ahead of the play diagnosis (`docs/18-diagnosis.md`) and gets revised against its numbers before anything builds.*

## The problem, in the designer's words

> This should be a deduction game. That's really what you're solving. I think there has to be a way to show where people were as a grid. And you may have to make it so it's not so obvious that people weren't at the murder scene. And people probably need to lie a bit more, so that you're forced to puzzle it through.
>
> As built, it feels like you're just pushing random buttons, hoping to run into a person who gives you something. It seems glad to loop you around endlessly for no reason.

Today almost every useful clue is a finished conclusion: "Kreuzer says Hanrahan was at the third floor at ten." The player collects conclusions until one name is left. There is nothing to work out. So the only skill is finding the right button, and the buttons are many.

The fix is to hand the player **pieces that have to be put together**, and a board to put them on.

## The model: an LSAT logic game

The designer's model: it should feel like an LSAT logic game. That settles the design's shape.

A logic game has four parts:

- a fixed set of entities;
- a fixed set of slots;
- a short list of rules, each precise and each weak on its own;
- questions that can only be answered by combining the rules on a diagram.

Solvers draw the board, write each rule in shorthand, and derive what must be true. Most of the work is noticing that two rules together force a third fact.

Dashiell maps onto it directly:

| logic game | Dashiell |
|---|---|
| entities | the suspects, the client and the victim |
| slots | the grid: each person × each half hour → a place |
| implicit rule | nobody is in two places at once |
| rules | clues, each stated in the notebook as one precise line with its source |
| the diagram | the grid, where the notebook's facts are inked and the player's own marks are pencilled |
| "which must be true?" | the report |
| the clock | there isn't time to collect every rule, so choosing which rules to go after is the roguelike part |

**Two registers, kept apart.** The pages dramatize: a witness says it in her own words, with a gesture and the detective's thought. The notebook states the same fact as a rule, precisely and without flavor: "Hanrahan: third floor, 10:00–10:30. Kreuzer saw her." The player reads the story and solves on the rules. Neither voice leaks into the other.

**Rule types.** A good game mixes them, as a logic game does:

| type | as testimony or evidence | as a rule |
|---|---|---|
| fixed placement | "Grasso was at the bar at nine." (Callahan) | Grasso: speakeasy, 9:00 |
| negative placement | "He wasn't here all night." (the counterman) | Grasso: not garage, 6:00–11:30 |
| sequence | "She went up just before the El." | Hanrahan: third floor from the El's run, which the player must time |
| absence and numbers | "Nobody came up those stairs between nine and eleven but the landlady." | third floor, 9:00–11:00: only Marchetti |
| together | "We were together the whole evening." (an alibi companion, who may be lying) | Schilling with Grasso, 9:30–10:30 |
| apart | "Those two wouldn't be in the same room." | Coffin and Mulcahy: never the same place |
| conditional | "If anybody had come in the back, the bell would have rung. It didn't." | back door, 9:00–11:00: nobody |
| identity | "A woman in her thirties, turning a coin." | somebody matching this: third floor, 10:00 |

**Each rule weak; the game in the combining.** Measured by the generator's solver:

- above Coddled, no innocent is ruled out at the crime's half hour by a single rule;
- from Soft-boiled up, the culprit is reached only by chaining at least three rules;
- at Hard-boiled, at least one deduction requires testing a hypothesis. That's the logic game's "if Grasso was at the garage, then Schilling was lying, but Schilling's account is corroborated, so…" step.

## The board: the grid

The notebook's "Where they were" grid is being built in parallel (`docs/19-grid-notes.md`). Rows are people and columns are half hours. Each cell holds claims with their sources: a person's own account, another person's word, or evidence.

M9 makes the grid the center of the game, not a summary of it.

- **Ink is what the notebook holds.** The player can't edit it.
- **Pencil is the player's own work.** They can mark "was at", cross out "not at", or clear a mark. Pencil marks are free, saved with the run, and never counted as facts.
- **A rules list under the grid** holds every notebook fact as a one-line rule. Tapping a rule highlights the cells it touches.

The grid agent is building the pencil marks and the rules list now.

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
2. **Description instead of a name, sometimes.** *(Designer's ruling: "SOMETIMES. It should be a roll as to whether they know them.")* Whether a witness knows the person they saw is rolled per case, as part of a real acquaintance graph (see "Who knows whom" below). A witness who knows the person names them. One who doesn't describes them: "a woman in her thirties, turning a coin over her knuckles." The player links a description to a person when the notebook holds enough to match, meaning the portrait, sex, age band and trade. It's a free tap on the grid entry, "That was Kreuzer." A wrong link is allowed, and the report is where it costs. Descriptions come in from Medium, where about a third of sightings are of strangers. At Hard-boiled it's about half.
3. **Absence.** "Nobody came up those stairs between nine and eleven except the landlady." It's a negative fact covering a place and a span, and it clears anyone who claimed to be there, or catches them.
4. **Direct placements stay,** but fewer. At the crime's half hour, no innocent is cleared by a single direct statement from a single source above Coddled. Clearing takes two pieces: an account plus a corroborating sighting, a sighting plus an anchor, or an absence plus a claim.

**Tiering.** Raw and Coddled keep today's direct placements, so the first runs stay short and plain. Poached adds lies about secrets and the confront verb. Soft-boiled adds anchor-relative times. Medium adds descriptions. Hard-boiled has all of it.

## Who knows whom

*(Designer: "There is an odd feeling that everyone knows everyone here and introduces them in the strangest way imaginable.")*

Today every witness knows every suspect by full name and relation, and speaks as if reading from a file. For example: "Hochstetter, Grasso's tenant, would know about Dandridge, Grasso's business partner." A neighbourhood isn't like that. Some people know each other, most know a few faces, and plenty are strangers.

**The acquaintance graph.** Each case gets a graph, rolled from what the case already has:

- **Ties.** Relationships to the victim and to each other: tenant and landlord, employer, partner, family, debtor and lender.
- **Places.** Regulars at the same place over the evening know each other by sight. Watchers know the regulars of their own place by name.
- **Trade.** A bartender knows drinkers; a doorman knows the building's tenants.
- **A roll** on top of all this for everyone else: most pairs are strangers, and some know each other by sight only.

Each edge has a strength:

| strength | how the witness refers to the person |
|---|---|
| **by name** | the name: "Nora Hanrahan" |
| **by relation** | "Sweeney's secretary", "my landlord", "the fellow who runs the garage" |
| **by sight** | "the tall one who drinks at the end of the bar", "the woman from the fourth floor" |
| **stranger** | a description |

**How people are introduced.**

- **A witness introduces people the way they know them.** That means their own relation to the person, not the person's relation to the victim. A tenant says "my landlord", a bartender says "one of my regulars", and a stranger gives a description.
- **The detective learns names from the people who know them,** and the notebook records the name once a knower has said it. Until then, the notebook uses the witness's own words.
- **At most one appositive per sentence.** No "X, Y's A, would know about Z, Y's B." A person's relation to the victim is stated once, when it's first learned, and after that they are just their name.
- **Nobody hands the detective a list.** A witness who doesn't know someone says so ("Never heard of her."), and that's itself a small fact: it's evidence about who knows whom.

**What it changes elsewhere.**

- Bridges say who to ask in terms of who would know: "Callahan knows her regulars. If Grasso drank here, Callahan would know his name."
- Asking someone about a person they don't know gets a short, honest "Don't know her," which is free on a repeat.
- The solver treats knowing and not knowing as data. A person who claims not to know someone they have a tie to is lying about themselves, which the lie rule allows.

## 3. A verb: confront

The player lacks a way to act on what they've worked out. Add one.

When the grid shows a conflict involving a person's own account, that person gets a new marked choice: **"Put it to Hanrahan."** It costs a half hour. What happens depends on who they are:

- **The culprit never confesses.** *(Designer's ruling.)* Usually they lie again: a new account that is itself contradictable. Sometimes they go quiet.
- **Innocents lie too, so lying is not a tell.** *(Designer's ruling: "the solve for that is to make sure that other people lie too.")* An innocent with a secret often doubles down on the first confrontation with a second lie. They give up the secret only when a second, independent fact contradicts them: "All right. I was on Ninth. I was fixing the books." That clears them of the crime and usually opens a real lead. Alibi companions sometimes hold the alibi through one confrontation and withdraw it on the second.
- **So demeanor never solves the case; the grid does.** Everyone lies when cornered. The difference is *what* the lie covers. An innocent's lies cover their secret's half hours. The culprit's lies cover the crime's half hour and the fetching of the means. The player finds the culprit by filling the crime column, not by watching who squirms.
- **Generator requirements that follow:**
  - Every innocent with a secret has at least two independent findable contradictions.
  - The share of confrontations that produce a second lie is about the same for innocents and for the culprit, within ten points at every tier from Poached up.
  - The solver never uses "lied when confronted" as evidence.

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
- **where every suspect was** at the crime's half hour, from Medium up *(designer's ruling)*. That's the full crime column.

Scoring counts correct cells, like Obra Dinn's fates. This rewards reasoning, not a lucky name. At Hard-boiled, a correct "who" with a wrong column is partial credit and says so.

## 6. What the generator needs

- **The lie model** from §1: secrets' ticks, the culprit's means fetch, alibi companions, and every lie contradicted by something findable.
- **The new clue shapes** from §2, with their `Establishes` facts: `sightingAtAnchor`, `describedAt`, `absentFrom`.
- **A deduction solver** to replace the current solvability check. It's a constraint solver over the grid:
  - Each cell (person × half hour) has a domain of places.
  - Every rule type in the table above is a constraint.
  - The implicit one-place-at-a-time rule applies.
  - Self-accounts are soft: true unless contradicted.
  - Anchors resolve to times when their timing rule is held.
  - Descriptions resolve when their features are unique among the known cast.

  The solver propagates constraints and records the **inference depth** each conclusion needed: one rule, a chain, or a hypothesis test. A case is accepted only when three things hold:
  - The findable rules force a unique culprit and a filled crime column within par.
  - The depth targets for its tier are met.
  - No weaker route reaches the culprit.

  Par is recomputed as the cheapest set of rules the solver needs.
- **Two new difficulty dials:** the share of placements that are pieces rather than conclusions, and the number of lies.

## 7. What the engine needs

- **Grid entries for the new shapes:** a margin row for anchor-relative sightings until the anchor is known, unlinked descriptions, absences as spans, and the link interaction.
- **The confront choice and its outcomes,** with thought classes for each outcome and page shapes for a confrontation.
- **The topic trimming, exhausted people, and loop fixes** from §4.
- **The report as the crime column,** and its scoring.
- **The rule about lies,** in the title page, the help, and the first-run text.

## 8. What the report asks, logic-game style

The report doesn't ask "who did it" and stop there. It asks a few "must be true" questions the grid answers:

- who, at every tier;
- when the crime happened, from Soft-boiled up;
- where every suspect was at that half hour, from Medium up: the full crime column;
- at Hard-boiled, one question whose answer needs a hypothesis test.

The DA scores each question. The closing page says which ones the detective got, and the curtain shows the rule chain that proved each.

## 9. Open questions for the designer

1. **Descriptions and linking.** Decided: sometimes, by a roll on whether the witness knows them. In M9, from Medium up.
Decided 2026-09-23:

- **Confront.** The culprit never confesses and often lies. Innocents lie too, so a lie is not a tell (§3).
- **The report.** The full crime column is asked from Medium up (§5, §8).
