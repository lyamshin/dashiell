# Hone 3 — order, redundancy, pronouns in speech, breath tails

Branch `hone-3`. Six commits, one per item of `docs/14-hone-3.md` plus the
tests: the order; the collapse; the pronouns; the breath audit; the spot
checks; the corpus tests. 443 tests green, 13 of them new. Correspondence zero
over seeds 1..200 at all three difficulties and over all eight tropes forced.
The harness went from 0.016 to 0.009.

---

## What was hardest

**The order was two sentences of work and a week of consequences.** Putting
"Martin Sweeney is dead." at the head of the briefing is one line. What it
costs is a sentence, and the briefing had a stated budget of sixteen. On
`body-at-scene` §2 pays for it exactly — the trope's two scene sentences
become one — and the count does not move. On the other three murder shapes,
whose givens state four separate facts, the briefing runs to seventeen, and
there is no honest way to get it back: cutting the cap to three givens loses
`the-frame` its planted weapon and the framed man's denial, which are the
whole of what that trope is. So the ceiling moved by one, with the reason
written where the number is. That is the deviation I am least comfortable
with and the one I would defend longest.

**Which sentence is the headline, per case type.** The spec asks for the death
on a murder, the loss on a robbery and who is gone on a missing person, and
only the first of those is a sentence the generator has to write. The other
two are already the trope's own first given — "A jewel case was taken from the
suite, which is Sweeney's", "Stannard has not been seen since half past seven
on Tuesday evening" — and writing a second one beside them would have produced
exactly the redundancy §2 is about. So murder gets one new sentence and the
other two get an order. The tell that this is right is the robbery: the given
ends on a possessive, "which is Sweeney's", and the standing now follows it
immediately, which is what the possessive was reaching for all along.

**The pronoun pass is a grammar problem in disguise.** "Sweeney" can become
"he", "him" or "his", and nothing in the data says which. Three drafts:

1. A word list for what follows the name, which got "I came to him and paid"
   wrong — the verb after the name said subject and the preposition before it
   said object, and only the preposition was telling the truth.
2. The same lists with what comes before decided first, which got that right
   and then kept the name in "Tillman could put a name on a bill", because
   "could" was not on any list and never would be: the list of verbs English
   can put after a subject is not a list.
3. A structural rule for the commonest case — a bare name at the head of a
   sentence, with a lower-case word after it and no comma in between, is that
   sentence's subject — with the word lists left to handle the middle of a
   sentence. That is what shipped.

The rule that matters most is the one about not firing. A comma after the name
means an apposition or a list is coming — "Brennan, Sterling Ainsworth and I
came over on the same boat", "We grew up on the same block, Bidwell and I" —
and a pronoun there is worse than the name. Every position the pass does not
recognise keeps its surname, which is never wrong, only flat.

**The ambiguity guard costs more than it looks.** "If another person of the
same gender is named in the same turn, keep the surname" is right, and on the
seeds I read it fires on two turns out of four, because the tie's backstory
names a third party and the pointer's reason names the suspect. So the rule
only really bites on the first turn — which is the turn the spec was written
about, and the one the golden shows. The turns where it does not fire read no
worse than they did.

**Two probes were wrong before anything else was.** `generateCase(seed, opts)`
takes the seed positionally, and my first scratch probe passed `{ seed,
difficulty }` as the seed. Every case it built was the same case, so the trope
distribution came back as `body-at-scene` 600 times and the correspondence
sweep came back clean without having checked anything. It cost an hour and it
is the reason the tests in `test/hone-3.test.ts` force all eight tropes
explicitly rather than trusting the weights to deal them.

---

## Five before and after

**1. The order.** Seed 3, page one.

> before: "I write the tickets behind the grille. I know what things are
> worth. Sweeney was the reason four places on the street stayed open. Everyone
> knew it." / "Sweeney was found dead at the suite," she said. "Sweeney was
> killed at the suite. Nothing was carried out of the room afterwards."
>
> after: "I write the tickets behind the grille. I know what things are worth.
> Martin Sweeney is dead." / "He was the reason four places on the street
> stayed open," she said. "Everyone knew it. He was found dead at the suite.
> That is where it happened."

Three things at once: the reader is told there is a body before being told
what the body was worth to the block, the same fact is not stated twice, and
the surname is said once and then pronouned. The full name is the only place
in the run where the dead man gets both his names, which is what a stranger
does when she says it for the first time.

**2. The collapse.** `body-at-scene`'s givens.

> before: `{V} was found dead at {L}.` / `{V} was killed at {L}, and nothing
> was carried out of the room afterwards.`
>
> after: `{V} was found dead at {L}, and that is where it happened.`

The room the body is in being the room it happened in is the whole of what
this trope means, so those are one fact and not two. The clause that carried a
second fact — nothing was carried out — is the trope's signature and both of
its signature clues state it: the rug rucked up and the chair over backwards
at the scene, and the door nobody came out of carrying anything. It is said
once where it is proved rather than twice where it is asserted.

**3. The missing person saying it twice.** `left`, seed 3.

> before: "Pickering saw Stannard at the third floor at half past seven, and
> nobody has seen Stannard since." … "Pickering saw Stannard at the third
> floor at half past seven, and nobody has seen Stannard since."
>
> after: said once.

`left` writes a given that is word for word the victim's last sighting, and
`taken` writes the same sentence with its tail cut off. Both went into the
briefing beside the sighting itself. The generator refuses a sentence it has
already said, or a shorter form of one, and containment either way catches
both. It never fires anywhere else: nothing else the generator writes is a
substring of anything else it writes, and there is a test that says so.

**4. The coroner's aside.** Seed 3, pages one and two.

> before, page one: "The coroner puts it between half past nine and eleven.
> Two hours of nothing useful." / before, page two: "The coroner puts death
> between half past nine and eleven — two hours of nothing useful."
>
> after, page two: "The coroner puts death between half past nine and eleven."

The same six words in two mouths about one window. It is the client's: it is a
judgement about whether the hour helps, which is what somebody hiring a
detective is thinking about and not what a coroner pencils on the back of an
intake form.

**5. The hiring frame.** Seed 3's close, and six more cards like it.

> before: "…," Kreuzer said. I took a roll with a rubber band round it before
> Kreuzer had gotten halfway through the second sentence.
>
> after: "…," Kreuzer said. I took a roll with a rubber band round it before
> she had gotten halfway through the second sentence.

Seven of the twenty hiring cards name the client in both halves, not one, so
all seven are fixed. The deck gets `{pronoun}`, `{them}` and `{their}`, filled
from the client's gender where the card is dealt, which keeps one card rather
than making two with a gender tag on each.

---

## The breath audit, which found nothing

§4 asked for every hand-written breath form to be checked for appending, and
the answer is that none of them append. There are 171 of them — 57 tie
backstories, 81 profession details, the purposes, their prices and the nine
discovery variants — and all are two or three sentences, none over
`BREATH_MAX`, and every one comes back out of `breathe` as exactly its own
sentences. Over seeds 1..200 at three difficulties and all eight tropes
forced, no breath carries a word its spoken sentence did not, beyond the five
`breathe` itself writes: the leads "but", "so" and "because" on a second
piece, and the "it was" the robbery discovery shape supplies.

What was missing was the guard. Hone 1 tested that a breath loses nothing;
nothing tested that it gains nothing, and a hand-written form that answered
more than it was asked would have gone in unnoticed. Both halves are tested
now, and together they say a breath is the same words in a different number of
pieces.

---

## What Hone 3 did not do

**The engine's beats and the hiring frame's length** are untouched, and
dialogue share on page one is still nine thousandths under the band. The
shortfall is not that she says too little; it is that the narration around her
is long. That is an engine item and it belongs to whoever writes the next one.

**A double full stop** shows on a handful of seeds: `brief.points.reason` is
sometimes written with its own full stop and the briefing adds another, so the
record reads "…on a street that does not exist.." It predates this branch,
it is one character, and it is not one of the five items, so it is written
down here rather than fixed in passing.

**The pronoun pass does not follow the victim across a turn boundary**, by
design: a new turn is a new answer to a new question, and the reader has had
Dashiell's voice in between. Whether that is one turn too generous is a
question for a read of forty seeds rather than for three.
