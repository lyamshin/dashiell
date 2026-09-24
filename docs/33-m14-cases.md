# M14 — Cases that aren't murder

The source is `docs/31-books-and-cases.md`, and its Decisions section is final.

- **Three new case types:** a lost pet, a lost item, and an affair.
- **Mixed at every tier.** Each tier deals a mix of all case types, murder included.
- **The affair ends on the player's choice** of what to tell the client.
- **Relationships beyond money.** Debts and loans become one tie among many.

The designer: "too much murder, too much money lending … that's part of what makes this feel like a slog."

## 1. The generator (`src/gen`)

1. **Case types `lost-pet`, `lost-item` and `affair`,** alongside murder, robbery and missing. Each gets tropes, givens and unknowns, and a report shape. The deduction machine is unchanged: the grid, the lie rule, confrontations, the solver, and the tier targets.

   | type | the half hour that matters | tropes (at least two each) |
   |---|---|---|
   | **lost pet** (dog, cat, parrot, one day a goat) | when a gate or door was left open, or the pet last seen | left open by someone who won't admit it; taken on purpose (a feud); followed someone home |
   | **lost item** (a ring, a watch, a medal, false teeth, a trophy) | when it went from where it was kept | borrowed without asking; pawned; hidden to spite someone; mislaid by the owner and blamed on others |
   | **affair** (spouse, fiancé or partner suspected) | the hour the client suspects | a real affair; a secret that looks like one (night classes, a second job, a surprise, a sick relative); a meeting that was business |

   **Who did it:**
   - For a lost pet or item, the culprit is whoever let the pet out or took the item, and "why" is their small, human reason.
   - For an affair, the unknowns are where the suspected person was, and with whom.
   - "Together" and "apart" facts become central. The together/apart rule types already exist.
2. **The report per type.**
   - Lost pet and lost item: who, when, where it is now, and why.
   - Affair: where they were, with whom, and when. From Medium up, the full column is asked for the half hour that matters.
3. **The client** gets new purposes: find my dog, find my ring, tell me the truth about my husband. There are new tells, the client may be the culprit where it fits, and briefings are written for each.
4. **Relationships:** new ties, including:
   - neighbours across a fence;
   - an old flame;
   - bowling-league or chess-club rivals;
   - the band;
   - a feud over a cat;
   - in-laws;
   - a borrowed ladder;
   - a shared clothesline.

   Motives for mundane cases are spite, jealousy, embarrassment, affection and pride. Rebalance so debt and lending are at most about 15% of ties overall.
5. **Case mix per tier.** Every tier deals every type, weighted so murder is about a third. Raw and Coddled keep their small shapes. Tier presets, par and design targets hold for every type.

## 2. The engine and book (`src/game`, `src/ui`)

1. **Scene and briefing lines per type:** no body where there's no death, the pet's empty collar, the item's empty drawer. Thoughts, answers and recaps must say the right thing for each type. Use the existing robbery and missing paths as templates.
2. **The affair ending.** After the report, the player chooses what to tell the client:
   - the truth;
   - a kinder half-truth;
   - nothing.

   The closing page and the story follow from that choice. Scoring is unchanged: the report is scored on facts. The choice changes the ending's text, and it's recorded in the profile.
3. **Endings and stories** for each new type, in camp. The crime-only story ("What really happened") covers only the case itself, as before.
4. **Decks:** everything these types deal needs cards, including establish, finds, thoughts, recaps, endings and story. Write them in the camp golden's voice (`docs/golden/seed3-camp.md`), in plain words.

## 3. Measure

- The design test per tier, **per case type:** the marks-follower stays at or below 50% from Poached up, at or below 60% at Raw and Coddled, and the reasoning player at or above 80% (at or above 95% at Raw and Coddled).
- The case-type mix per tier over 200 seeds.
- Correspondence 0, beat coverage 100%, reader lint and plain terms clean.
- Read full runs of one lost-pet case, one lost-item case, and one affair case with each ending choice.
