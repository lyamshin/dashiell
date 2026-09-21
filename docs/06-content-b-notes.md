# Content B — Notes

Seven decks, 604 new cards, `content-b` branch. What was hardest, what's
left thin, and where the B.1/B.2 schema pushed back against the writing.

## Hardest tag combinations

**Ambient's `caseState` axis is the thinnest lever in any deck.** The
brief is Humphrey "thinking about nothing useful," and `hourBand` and
`circumstance` both give real, concrete material (the hour has a
physical feel; a circumstance is a fact about his life). `caseState`
(cold/warm/hot/tight) is a fact about the *investigation*, and the spec
is explicit that circumstance and relationship "never touch the
mystery" — so an ambient card can register the case's temperature only
as background pressure on the prose's tempo (tight reads clipped, cold
reads more adrift), never as content. Writing 4 distinct-feeling
variants of the same circumstance across cold/warm/hot/tight, without
ever letting the case's actual facts leak in, produced some pairs
(warm vs. hot, especially) that differ more in word choice than in
substance. If this deck gets a second pass, `caseState` is where I'd
spend it.

**Transitions' anchor coverage requirement forced a few anchors into
hours they don't naturally belong in.** `theater-out` (a curtain
letting out) and `garage-shift` (a shift change) are evening/early-
morning events respectively; the requirement to place at least one
card per `anchors.ts` template meant writing `theater-out` twice at
`midnight-2` (plausible for a late show) and `garage-shift` once at
`2-4`, which is early for it. `el-train`, `church-bells`, `rain`, and
`cop-pass` are hour-agnostic and were easy; the single-tick, time-of-
day-flavored anchors (`last-edition`, `ice-delivery`, `theater-out`,
`garage-shift`) were the ones where "at least one card per template"
and "put it in a believable hour" pulled in different directions.

**Places' `watcher` + `empty` combination needed a judgment call the
schema doesn't spell out.** For a watched place, does `empty: yes`
mean nobody at all (including the fixture), or nobody *besides* the
fixture? I read it as the latter — a watched place is only ever
"empty" of the company the fixture would otherwise be watching, since
the fixture's presence is what `watcher` already encodes — and wrote
all 12 watcher+empty:yes cards as "the fixture, alone." That's a
reasonable reading but not the only one, and it's worth confirming
against how the engine track actually consumes the tag before the
placeholder cards get replaced.

## What's left thin

- **Similes' `city` target** got the smallest allocation (10 of the
  200 new cards, vs. 20 for `face`). The style guide's own numbers
  justify this — noir spends its descriptive budget on faces, hands,
  and voices, not on the skyline — but it means `city` has the least
  headroom against `avoidNear` collisions if the engine draws it hard
  in one run.
- **Asides' `complicated` relationship** only got the contractual
  minimum (2 cards per circumstance, 14 total, plus none of the 4
  extras). It's the vaguest of the four relationship states by
  design, and it shows: the cards lean on one register (guarded,
  wry-bitter) more than `someone-waiting` or `someone-who-left` do.
  A future pass could split "complicated" into more distinct flavors
  (unresolved vs. actively renegotiating vs. amicable-but-awkward)
  without adding a new tag value.
- **Endings' hanged/at cards** are the safest, least differentiated
  pair in the deck — a correct, on-schedule conviction doesn't have
  much narrative tension to work with compared to wrong-man or cold,
  so those two cards are closer to each other in shape than any other
  pair in the file.

## Where the schema fought the writing

**"One simile per card, and only in the similes deck" is harder to
honor than it sounds, because ordinary English is full of `like`/`as`
comparisons that aren't the banned move.** I had to distinguish
figurative similes ("the fog came up like spilled milk" — banned
outside similes.json) from idiomatic ones ("it didn't feel like
enough," "a fee like that," "same as always" — fine, not images).
The build scripts for every non-simile deck ran a regex sweep for
`\blike\b` as a first pass, but every hit needed a human read, since
the regex can't tell "felt like a favor" (idiom, kept) from "empty as
a hearse" (simile, cut) apart on its own.

**The overlap checker caught more accidental collisions than
expected, and almost all of them were ordinary phrases, not borrowed
sentences.** "At four in the morning," "one way or the other," "as
much as I should have," "the far side of the" — five-word runs of
completely unremarkable English kept matching somewhere in the
1.15M-word corpus. This isn't a sign anything was copied; it's a sign
that a corpus this size has near-total coverage of common five-word
sequences, so *any* writer working against it should expect a real
back-and-forth with `overlap.mjs`, not a one-shot pass. Every deck
needed at least one round of fixes; the largest was ambient, with 15
hits out of 120 cards on the first pass.

**Arrivals' `weather` tag sits in direct tension with style-guide §3**,
which measures weather as the *lowest*-frequency description target
in the fiction corpus and calls it out explicitly as a pastiche tell.
An arrivals deck keyed in part on weather is asking for exactly the
crutch the guide warns against. I handled this by treating weather as
one concrete sensory beat per card (wet stoop steps, frost on a
railing) rather than the card's whole reason for existing, and by
never reaching for fog or rain as unearned atmosphere — but the tag
itself pulls against the guide's own numbers, and a future writer
should know that going in rather than rediscover it.

**Endings' omniscient close is a real point-of-view shift from every
other deck.** Everywhere else, Humphrey's monologue is limited — he
can be wrong, and the game's whole design rests on that (Vision
principle 5). The wrong-man ending's `{missed}`/`{killer}` slots
require the closing paragraph to state the actual truth plainly, which
only makes sense if endings are read as the case file's postscript
rather than something Humphrey himself narrates in the moment. I
wrote them that way (report-register, past tense, slightly outside
his own head), but this is worth confirming against how the engine
actually frames the closing page — if it's meant to still read as
Humphrey's own voice, the wrong-man cards need another pass.

## Validation

`scripts/validate-decks.mjs` did not exist at any point during this
work, so `scripts/validate-content-b.mjs` (added in this branch) is a
stand-in scoped to these seven decks: card shape, volumes, tag-combo
coverage, and the wrong-man slot requirement. `corpus/tools/overlap.mjs`
is clean on every deck, checked individually and as a full run.
