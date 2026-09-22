# Hone 2, Track B — the client's own words

Branch `hone-2-templates`. Five commits, one per template family:
`backstoryFirst`; the purpose, its price and the prompts; `professionFirst`;
the discovery and the breath; the tests.

What changed, in numbers: 57 ties rewritten, 81 profession sentences written,
24 purpose variants, 24 cost variants, 9 discovery variants, 11 prompts
rewritten or removed, 1 prompt pool added. 414 tests green. Correspondence
zero over seeds 1..200 at all three difficulties.

---

## What was hardest

**Not adding facts while adding sentences.** The brief asks for the client to
sound like a person and for every first-person form to state exactly the facts
of its third-person twin. Those pull against each other: a person talking says
more than a record does, and most of what makes speech sound like speech is
the part that is not a fact. The golden settles it — "I bought from Sweeney"
becomes "Everybody on the block did, but I paid on time, which he noticed",
which adds a great deal and names nobody. So the rule I wrote to is the
checker's rule rather than the record's: an elaboration is free if it
introduces no name, no place and no hour. "Not once in front of anybody" is
free. "That was in '23" is not, because a year is a claim the sheet can
contradict. The slot test enforces the second half of that: a first-person
form carries exactly the slots its twin carries, minus `{person}`.

**The word a sentence opens on.** Correspondence reads every capitalised token
as a claim that somebody exists, and `KNOWN_WORDS` is deliberately closed. Once
the forms became two and three sentences each, every new sentence needed an
opener the checker already knew. Three drafts died on it — "Nights, mostly.",
"Apart, not divorced.", "Twice to the precinct." — and rather than widen the
list I rewrote them, because the list being closed is the feature. There is a
test for it now, so the next writer finds out in a second rather than after a
two-hundred-seed sweep.

**Keeping the seeds still.** Every variant needs an index, and every index is a
draw, and a draw inserted anywhere in `client.ts` or `victim.ts` moves the
whole clue pool downstream of it — a different case for every seed, and the
golden written against seed 3 stops being about seed 3. The way out was to
stop drawing twice for things that were written once: the purpose, its price
and the question that asks for it now share one index, and so do the discovery
sentence and its question, and so do the profession detail and its two forms.
Each is a single `rng.int(n)` where a single `rng.pick` used to be. Nothing
moved. Seed 3 is still Kreuzer, Sweeney, Grasso and the Lower East Side.

**Rule 3 is harder on statements than on questions.** Most of Hone 1's prompts
were fine. The ones that failed failed in two different ways, and only one of
them looks like failure. "And if {V} comes back?" is a real question — it is
just a question about a fact no sentence of the briefing has, so the client
answers something else and the exchange reads as two people talking past each
other. "Money, then." is the opposite: perfectly answered, but two words long,
which is a prod wearing a full stop. The test I wrote separates them: a
question needs three words, a guess needs four, and neither may be one of
fifteen listed continuers.

**The breath, and where it belongs.** Hone 1 derived breaths by splitting at
conjunctions. Written forms make the derivation unnecessary — a form that is
already two or three sentences comes back as those sentences — but `breathe`
tested its own discovery shapes *first*, and those shapes are regexes anchored
on the final full stop. Given a two-sentence form they matched across the
middle full stop and handed back a sentence nobody wrote. Moving the
already-breathed test above the shapes is four lines and it is the whole of
"hand-written breath": where a writer has breathed, the engine stops guessing.

---

## Five before and after

**1. The tie.** `rel-customer`, backstory 0.

> before: I have bought from Sweeney for years and settled at the end of every
> month.
>
> after: I bought from Sweeney for years. Everybody on the block did, but I
> settled at the end of every month.

The first is the record with its pronouns turned around. The second is the
spec's own example and it does two things the first cannot: the short sentence
lands the fact, and the long one tells you what kind of customer she was
without claiming anything the sheet could deny.

**2. The profession.** `arch-pawnman`, detail 0. New; there was no
first-person form at all, and Dashiell said it about her.

> before: Kreuzer writes the tickets behind the grille and knows what a thing
> is worth.
>
> after: "I write the tickets behind the grille. I know what things are worth."

The record still reads exactly as it did — the sheet files a person by name —
but page one has her say it, which is the golden's second breath and the one
place on the page where a stranger establishes herself.

**3. The discovery.** Murder, variant 1, against the question "Who found {V}?"

> before: I found Sweeney at the suite at half past eleven.
>
> after: I did. I found Sweeney at the suite, at half past eleven.

One sentence answered three different questions equally badly. There are three
now, indexed to the three questions, and each opens on the fact its question
asked for. "I did." is two words and it is the whole answer; the rest is her
filling in the room she is already being asked about.

**4. The purpose and its price.** `keep-it-quiet`, variant 2.

> before: Tillman wants it settled quietly, before it is settled loudly. /
> I am paying to have something found and then not said.
>
> after: "I want it settled quietly. If I wait, it gets settled loudly
> instead." … "I am paying for two things. One is that it is found. The other
> is that nobody hears about it."

The first draft of this one read "I want it quiet. I want it settled quietly,
before it is settled loudly" — three cognates in eleven words, which I only
heard when I read seed 12 aloud. That is the rewrite the brief asks for at the
end, and it is the only one I would not have caught any other way.

**5. The prompt.** `settle-a-debt-with-the-dead`, variant 2.

> before: Money, then.
>
> after: So it is the money you want.

Both are the same move — Dashiell guessing, flat, so the client can correct
him. Only the second is long enough that there is something to correct. The
same pool lost "So you want the one who killed {V}", which had been asked in
robberies and missing-person cases about people who were not dead.

---

## What Track B did not do

The dossier paragraph on page one still names the client twice ("Gretchen
Kreuzer is 30 years old and a pawnbroker's clerk. Kreuzer writes…" — the
second sentence is now hers, so the surname-as-subject rule has one fewer
sentence to fix, but the rule itself is §A.3 and belongs to the engine). The
interstitial beats on page one are Hone 1's and are Track A's budget. Neither
was touched here: this branch changes `src/gen/` and its tests and nothing
else.
