# M11 — People

The target is `docs/golden/seed3-people.md`, with its seven rules. The designer's read: pages are too thin, people talk about themselves as mysteries, the order is wrong, and when you walk in on the client they should tell you who's in the room.

Why it reads thin, measured on seed 3 Medium:

- **Self-accounts are the generator's record read aloud:** "I am 45 years old and the landlady. I keep the third floor… I am the keeper of the third floor."
- **The detective's self-questions frame people as mysteries:** "Who are you when nobody is asking?"
- **Tempers:** enigma is rolled for a third of people, and truncates their self-account to two sentences.
- **First sight gives two facts:** "She was the landlady, a woman in her forties."
- **The dossiers themselves are thin:** one detail line each. Wants are generic, with the pronoun "they" for a known sex. Two tenants share the same tie sentence: "has the same window and the same complaint".
- **The office briefing is in generator order,** and Dashiell's questions don't follow what was just said.
- **Groundings are stapled to the wrong fact family:** "It's my business to be sure who has my keys." after a debt.

## Part A — Engine (`src/game`)

1. **The office in the order a person tells it** (golden §1): relation → death → where and who found him → police → what's wrong with that → when → why me → what I want → who first → money. Each Dashiell question responds to the line before it. Re-plan the briefing's order in the generator's briefing lines, or in the office planner, whichever owns the sequence. Keep the correspondence checker at zero.
2. **First sight is a character:** three to five sentences from layer 0 (look, age, what they're doing), trade, one archetype character line (◆, see Part C), and the tie to the case if known. It's once per person per night, and later visits use the recall action.
3. **Asked about themselves:** plain questions (a new question-line set in `dashiell` keyed `ask-self` by archetype family). The answer is a first-person telling of their life from the dossier plus archetype talk cards. Never "I am N years old and…". Delete the mystery-framing question lines.
4. **Enigma means guarded, not mysterious:** at most one enigma per case, rolled. Guarded people answer about themselves plainly and briefly, and hold back only on the night. Keep temper rolls reproducible: the change must not shift other people's tempers more than it has to. Document the effect on existing seeds.
5. **The client's rundown:** when the client is present at the detective's place, **"Ask <client> who's here"** is a free choice once per visit. The page is the client naming each present person by their acquaintance edge (name, relation, by sight, or "I don't know her at all") and the watcher by trade, with one ◆ line per person where the client would plausibly say one. Strangers stay unnamed on the grid.
6. **An arrival page closes on one observation of Dashiell's own** that ties someone present to the case (their activity plus their tie). The detective's view already exists; make it concrete, never generic.
7. **Groundings match their fact family:** a debt fact never gets a keys grounding. Key groundings by family and trade, not trade alone. Add a lint rule.

## Part B — Generator (`src/gen`)

1. **Richer dossiers per archetype:** three to five `detail` lines per archetype (today there's one), a `history` line (how long, how they came to it), and a `talk` register tag. The layers stay the same, so what's volunteered and what's learned from others is unchanged. The new lines are layer 1 (volunteered) or layer 2 (from others) as appropriate.
2. **Wants use the person's pronoun.** No shared tie sentence between two people in one case: vary the tie templates per relationship.
3. **The briefing's order,** if the office planner can't reorder it (A.1).
4. **Case structure must not change:** the structure hash stays identical. Only text fields are added and changed.

## Part C — Archetype character cards (content)

A new deck `character`, keyed by `role`: every suspect archetype id and fixture role. Each card has a `kind`:

| kind | what it is | example (◆ in the golden) |
|---|---|---|
| `look` | how the type looks and carries themselves, beyond layer 0 | "a big man going soft" |
| `street` | how the street sees the type | "the kind of bartender who knew what you drank before you did and never said your name out loud" |
| `talk` | a line the person would say about their own trade or life, first person | "People think that's nosiness. It's rent." |
| `victim` | how this type deals with the victim's type, keyed also by `victimRole` or `any` | "twice a year I paid him not to find anything" (landlady → buildings inspector) |
| `client` | how a client of this type would name someone in a rundown | "He knows everybody's drink and nobody's business." |

Slots: `{name}`, `{He}`/`{She}`/`{he}`/`{she}`, `{victim}`, `{place}`.

**Rules:**

- **True of the type, never a case fact.** No times, no places beyond the slot, no crimes, no motives the case doesn't hold.
- **`victim` cards** may speak about the victim only in terms of the victim's trade. They must not give a motive, and they're dealt only when the case's tie between the two fits or is `any`.
- **Plain words.** One figure at most.
- **Counts:** at least 3 of each kind per role, and 2 `victim` cards per common pairing.

The content is written into `content/drafts/character/character.json` in parallel with the engine. The engine creates the deck file and schema with placeholders, then the drafts are moved in.

## Measure

- **Reader lint:** add rules for mystery-framing questions, "I am N years old", grounding-family mismatch, and more than one enigma per case.
- **Read-through:** full runs of seeds 3 (Medium), 11 (Raw) and 7 (Hard-boiled), read page by page against the golden, before merging.
- **Keep green:** the design test unchanged, correspondence 0, beat coverage 100%, plain terms clean.
