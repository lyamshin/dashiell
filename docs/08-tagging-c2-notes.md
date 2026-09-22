# Tagging C2 notes

Branch `tag-c2`. Files touched: `content/decks/{arrivals,transitions,ambient,
asides,places,endings,witness}.json` (tagged in place) and three new decks,
`content/decks/{office,entrances,hiring}.json` (written from scratch, per
B.4). Checker: `scripts/check-motifs-c2.mjs`. Zero errors on all ten files;
see the run pasted into the final report.

## Method

With ~560 cards to tag by hand, a pure read-and-judge pass over every card
wasn't a good use of the time budget, so tagging went in two passes: a
heuristic tagger (a scratch script, not shipped — a regex dictionary mapping
each A.2 term to its likely surface forms, scored per card) proposed motifs
and weather, and I read every card's proposal against its text, fixing
whatever the heuristic got wrong by hand before writing the final files. That
second pass caught a real class of bugs worth naming, because a checker
wouldn't have caught them (they're all vocabulary-valid, just wrong):

- **Homonym collisions.** "still" (quiet vs. "still hadn't"), "watch" (a
  clock vs. the verb), "ring" (boxing vs. a coffee-cup ring), "single"
  (containing "sing"), "grand" (money vs. "grand jury"), "sign" (paper vs. a
  shop sign), "smoke"/"ash" (cigarette vs. chimney smoke, ash cans), "bottle"
  (drink vs. a milk bottle), "picture" (photograph vs. "picture house").
  Every one of these produced a plausible-looking but wrong motif until I
  read the actual sentence.
- **Idiom vs. fact.** `endings.json`'s outcome is literally `cold` for a
  third of the deck (an unsolved case), which is not the same fact as the
  night's weather being cold — three cards (`end-021`, `end-023`, `end-024`)
  had to lose an auto-assigned `weather: cold` that was really about the
  case, not the sky. Same issue with `witness.json`'s `WIT-007` ("rain or
  shine" as a routine, not tonight's forecast) and `trn-030` (an ice
  delivery, not the night's temperature) — motif kept, `weather` field
  dropped in both.
- **Deferring to an author's existing tag over my own read.** Three
  `arrivals.json` cards (`arr-024`, `arr-042`, `arr-053`) already carried an
  authored `tags.weather` (cold/rain/cold) from the original writer, and my
  text-inferred guess (fog, from "fogged glass" — condensation, not
  outdoor fog) disagreed. The existing tag is the ground truth about the
  night; my heuristic lost those three.

## Cards that fought the vocabulary

- **`places.json`'s `PLACE-044`** (a barbershop: shaving mugs, gold-lettered
  names, a shop that stays open Friday nights) has real, specific imagery
  and no vocabulary term for any of it — no `shop`, no `mirror` in the text
  itself (barbershops have them; this card doesn't say so), nothing to hang
  a tag on. Left at zero motifs rather than force a weak match.
- **The `bruised`-circumstance cluster in `ambient.json`** (`amb-049`
  through `amb-064`, roughly) is almost entirely zero-motif, and it's a real
  gap: "ribs," "jaw," "knuckle" ache and a headache throb through fifteen
  cards, and the body vocabulary (`hands face eyes voice mouth shoulders
  breath`) doesn't cover ribs or a head. `face` covers the jaw cards; the
  ribs cards get nothing.
- **`asides.json`'s bruise references** (`asd-022`, `asd-036`, `asd-049`,
  `asd-050`) have the same gap — a concrete, recurring image (the bruise)
  with no vocabulary slot.
- **`endings.json`** is by design the thinnest deck for imagery — it's a
  closing paragraph about a report and an outcome, not a scene — and 16 of
  30 cards are legitimately zero-motif. That's not a vocabulary failure, it's
  the deck doing what B.2's spec asked of it.
- **Pure-loyalty witness lines** (`WIT-042`, `043`, `045`, `048`, `050` —
  partners and family declining to say more) are the same kind of
  legitimately imageless card: the content is entirely relational, nothing
  in the room.

## Motifs I wished existed

- A **body/injury term** — `bruise`, or something that covers ribs and a
  headache the way `face` covers a jaw. Wanted this most in `ambient.json`.
- A **rent/bill/landlady** term distinct from `money` — half the
  `behind-on-rent` cards in `ambient.json` and `office.json` are tagging
  `money` for what's really a very specific, recurring image (the landlady,
  the envelope, the notice on the hall table) that `money` flattens into the
  same bucket as a payoff or a gambling stake.
- A **square/plaza** term separate from `street` — several `arrivals.json`
  and `places.json` cards are specifically about a public square (benches,
  a dry fountain, a streetcar), which I taped to `street` for lack of
  anything closer.
- **`elevator`** as its own prop rather than folded into `machinery` —
  it recurs often enough (lobby cards, witness cards from an elevator man)
  to earn its own tag; `machinery` also has to cover engines, dumbwaiters,
  and factory imagery, which dilutes it.
- A **fatigue/insomnia** term — `sleep` covers "asleep" and "couldn't sleep"
  fine, but a lot of the `sleepless`-circumstance and hungover cards are
  about the *feeling* (grainy eyes, a slowed head) rather than the act of
  sleeping or not, and I was reaching for `eyes` as a proxy more than I'd
  like.

## Text edits

None. I read for self-contradiction (a card whose own two sentences
disagree with each other) across all seven files and found none worth
flagging — the M4-era writing is internally consistent card by card. No
`text` fields were touched; only `motifs` and, where implied, `weather`
were added.

## What was hard about the office decks

**`office.json`.** The brief is specific: this is *the one place*
Dashiell's circumstance is allowed to be plot (the envelope on the desk,
the retainer that matters), in two or three sentences, at a sentence-length
median near ten words. That's a tight budget to hold an image, the
circumstance's plot fact, and (for roughly a third of the cards) a weather
cue, without the card turning into a list of nouns. The first draft ran a
median sentence length of 17 words — accurate but overwritten, closer to
a paragraph doing three jobs than three short sentences doing one each — and
needed a full second pass just on cadence, splitting long compound
sentences and cutting subordinate clauses. That pass also caught several
sentences that had drifted into similes ("like a leak," "like an old man,"
"like a man with the time to enjoy it") — the M4 voice rule reserves
similes for `similes.json` alone, so every one had to be cut or replaced
with a plain declarative, which is a harder discipline than it sounds when
the material (money, rent, a bruise) invites comparison.

**`entrances.json`.** The gender tag is a hard filter (per `business.json`'s
own note in the schema: better to deal the wrong temper than a card that
calls a woman "he"), which meant every `gender: m` or `gender: f` card
needed an actual pronoun in the text to justify the tag, and every
pronoun-free card had to be `any` rather than a guess. Auditing that
(a card in, pronoun out, both ways) turned up several cards I'd tagged `m`
or `f` from instinct with no pronoun in the sentence at all — an easy,
silent way to under-cover `gender: any` if not checked mechanically, which
is why the final pass used a script to catch every mismatch rather than
re-reading forty cards by eye.

**`hiring.json`.** Two mechanical constraints did more to shape the writing
than anything about temper or familiarity. First, `{retainer}` resolves to
either a bare figure ("$20," "$50," "$100") or a phrase that already carries
its own article ("a roll with a rubber band"), so no template could put
"the" or "a" directly in front of the slot without breaking on the
underworld case — every card had to route around that, either quoting
`{retainer}` on its own or making it the subject of its own clause. Second,
`dashiell.json`'s `kind` enum (open / ask-person / ask-place / ask-object /
ask-evening / ask-hired / follow-up / close) has no "accepting payment"
kind, so a `{dashiell}` slot in a hiring frame will pull a generic line —
plausible as a beat, not written for this moment. I used `{dashiell}` in a
handful of frames where a short, generic interjection works either way, and
wrote Dashiell's actual act of taking the money as plain narration
everywhere else, per the brief: he takes it in every frame, and how he
takes it (a hand held out, money folded into a coat without counting, cash
pocketed mid-sentence over a yapper's protest) is where the character
shows up instead.
