# Style Guide — Dashiell's Voice

Grounded in `corpus/tools/stats.mjs`, run against the fiction corpus (Dashiell
Hammett's four public-domain works, Carroll John Daly's *The White Circle*,
Ben Hecht's *A Thousand and One Afternoons in Chicago* — 655,835 words) and
the period corpus (the WPA Guide to New York City minus its bibliography,
plus three years of *Evening World* pages — 422,144 words). Full numbers in
`corpus/derived/stats.json`. Ring Lardner's *You Know Me Al* was measured
too but is a **contrast**, not a donor — see the note at the end.

This is a rulebook for writing fragment-deck cards (`content/decks/*.json`),
not a literary essay. Every number below is measured, not felt. Where a
measurement is a heuristic rather than a parse (fragment detection, the
concrete noun bank), that's flagged — treat those numbers as directional,
not exact.

## 1. Cadence

**Sentence length.** Mean 11.9 words, median 10, p10 = 3, p90 = 24. That
spread is the whole game: most sentences are short declaratives, and the
tail is doing the work. A card whose every sentence runs 15–20 words reads
like nobody real wrote it. Write most cards' sentences in the 6–14 word
range and let one sentence in five run long.

**Fragments.** ~19% of fiction-corpus sentences have no finite verb, by a
verb-form heuristic (see Methodology). That's not sloppiness, it's
punctuation doing a verb's job: *"No answer."* *"Just the smell of gin and
wet wool."* One fragment per two or three full sentences in a card is in
range. A card that's all fragments reads like ad copy.

**Paragraphs.** Mean 2.6 sentences, median 2. Cards should be short — the
place/witness card targets (two-to-three, one-to-two sentences) already sit
inside this range. Don't write a four-sentence paragraph and call it a card.

**The long-then-short move.** Of sentences over 25 words, about **12%** are
immediately followed by one under 8 words. That's roughly one time in eight
— not a rule to apply every card, but the single most identifiable Hammett
tic when it does appear. *Long sentence loads detail; short sentence lands
the fact.* Reserve it for `intensity: 3` cards — the one line per few that's
allowed to show off. Don't spend it on `intensity: 1`.

Example of the shape, quoted:

> "Thaler was watching me with a hard small smile in eyes and mouth." —
> Dashiell Hammett, *Red Harvest* (1929)

(13 words, mid-range — but it earns its length: three concrete targets
—smile, eyes, mouth—compressed into one clause, no filler.)

## 2. The simile grammar

**Rate.** 1.35 similes per 1,000 words in the fiction corpus (882 total
across 656k words) against **0.88 per 1,000** in the period corpus. Noir
similes about twice as often as a newspaper or guidebook, but still
*rare in absolute terms* — roughly one every 740 words, not one per
paragraph. A card deck that hands the player a simile every other line is
overplaying the hand the corpus actually plays.

**Construction, by frequency in a 200-sentence sample** (`corpus/derived/
similes-sample.txt`): "as if" leads (71 of 200), then "like a" (56), "as a"
(49 — inflated by non-simile uses like "worked as a doorman"; treat this
one as an upper bound), "like the" (20), "like an" (5), "the way a" (1,
functionally unused — skip it). **Prefer "like a"/"like the" and "as if."**
"As a" is a trap: it reads as a simile far less often than the raw count
suggests, so don't lean on it.

**What sits on the far side of "like."** Sampled hits: *a threatening
cloud, a gigantic wing, a grate, a bath-mat, a cell, a knife across the
wires, a locomotive, an alphabet, a rag tearing.* Ordinary, handleable
objects — kitchenware, hardware, street furniture, the contents of a
tenement, not cosmic imagery. The far side of a good noir simile is
something you could buy, drop, or trip over in 1920s New York. It is never
another abstraction ("like a metaphor for loss") and rarely weather.

**Specificity test.** If the far side of the "like" could be swapped into
any other book without anyone noticing — *fog, shadow, smoke, a nightmare*
— cut it. The corpus's best similes fail this swap test: "air that stung
like ammonia," "his other hand was a small hard fist," a voice like "a
knife across the wires." Named substance, named object, named sensation.

Quoted examples:

> "He looked rather pleasantly like a blond satan." — Dashiell Hammett,
> *The Maltese Falcon* (1930)

> "Air that stung like ammonia came through the opening." — Dashiell
> Hammett, *The Dain Curse* (1929)

> "It is almost as if one saw the bodies of men lying in shadows." — Ben
> Hecht, *A Thousand and One Afternoons in Chicago* (1922)

## 3. What noir describes, and what it skips

Description-target frequency per 1,000 words, fiction vs. period (rough
keyword tagging — see Methodology):

| target  | fiction | period | fiction : period |
|---|---|---|---|
| room    | 5.77 | 2.27 | 2.5× |
| face    | 5.35 | 0.29 | 18.4× |
| hands   | 3.19 | 0.34 | 9.3× |
| street  | 2.28 | 6.10 | 0.37× |
| weapon  | 1.68 | 0.23 | 7.5× |
| money   | 1.43 | 1.82 | 0.79× |
| voice   | 1.33 | 0.08 | 16.1× |
| clothes | 1.05 | 0.40 | 2.6× |
| weather | 0.62 | 0.44 | 1.4× |
| drink   | 0.59 | 0.51 | 1.2× |

Three things worth noting because they cut against the pastiche instinct:

- **Faces, hands, and voices are the real estate.** Noir spends 16–18× the
  period corpus's rate on faces and voices. This is where the specificity
  budget for witness lines and simile cards should go — a face, a pair of
  hands, a way of talking, not a room.
- **Weather is not the crutch the pastiche thinks it is.** 0.62 per 1,000
  words — the *lowest* of the ten targets measured, barely above drink.
  Fog, rain, and cigarette smoke are a caricature of the genre, not a habit
  of it. Use weather as a one-time anchor trace (the game already has this:
  "rain starting," per `docs/02-m2-generator-revision.md`), never as
  ambient texture in every card.
- **Money and street are period-corpus strengths, not fiction ones** —
  the guidebook and newspaper talk about geography and price more than the
  novels do. That's useful in reverse: when a place or witness card needs
  a concrete price or an avenue name, lean on `corpus/derived/concrete-
  nouns-period-over-fiction.txt`, not on fiction's habits.

Clothes and drink sit near parity — mentionable, not a focus. Nobody in
this corpus stops to describe the furniture unless it's load-bearing to the
scene (a chair someone's tied to, a window someone came through).

## 4. Dialogue

**Ratio.** 34% of fiction-corpus sentences fall inside or touch quotation
marks (an upper-bound measure — see Methodology), against 10% in the
period corpus. A third of the prose is people talking. Cards should assume
dialogue carries the specific, not the description around it.

**Tags.** Of tagged lines, "said" is used **63%** of the time; the
remaining 37% splits across asked, muttered, growled, snapped, cried,
answered, and the like. That ratio — roughly two "said"s for every one
fancy tag — is the target for witness-deck writing: default to "said" (or
no tag at all, letting the line carry it), and spend a colorful tag only
when the delivery *is* the information (a growl means something a "said"
wouldn't).

**No stage business tags.** The corpus doesn't hang adverbs off dialogue
tags ("she said, coldly") anywhere near as often as pastiche assumes — most
tags are bare. Let the line's own word choice carry tone; don't double it
with an adverb.

## 5. Density — one joke per page

This one isn't a single measured rate so much as a boundary the corpus
respects and modern pastiche doesn't. Comic-marker words (grinned,
chuckled, smirked, wisecrack, dryly, snorted, guffawed) appear about **once
every 4,000 words** across the fiction corpus — once every sixteen
pages at a 250-word page. Wit in this material is not absent, it's rationed:
one dry line per scene, delivered flat, never followed by a second one
that undercuts it.

**Rule for the decks:** at most one line per card that asks to be funny,
and if a witness card already has a wry `mood`, the *next* card drawn from
that fixture shouldn't also be wry. `avoidNear` exists for exactly this —
use it to keep two `mood: 'wry'` cards from the same fixture from landing
back to back. A joke that's followed by a second joke reads as shtick, not
voice.

## 6. The parody line

Where a card stops being noir and starts being a noir *impression*, and
should be cut or rewritten:

- **The narrator winks.** The instant a line acknowledges it's being
  hard-boiled — a simile that's proud of itself, a tag like "he said,
  ironically" — it's parody. The corpus's narrators never comment on their
  own style; Dashiell can't either (Vision principle 5: he can be wrong,
  never arch).
- **Two adjectives where the corpus uses one noun.** "The cold, damp,
  shadowy alley" is pastiche; "the alley" plus one concrete trace (a
  drainpipe, a milk crate, a busted sconce) is the corpus's actual move.
- **Weather or smoke standing in for a description that was too much
  trouble to write.** See §3 — the corpus barely uses it; a card that
  reaches for fog because it can't think of a concrete noun has failed the
  lexicon requirement, not embraced a convention.
- **A simile that fails the specificity test in §2.** Generic imagery
  (a nightmare, a shadow, a stone) is available to every pastiche ever
  written and therefore proves nothing about this one.
- **Slang used as seasoning rather than information.** Every period term in
  `content/lexicon.json` should be doing a job (naming a real object, a
  real price, a real place) — never dropped in just to sound the part.

## 7. Quotations

Fifteen short quotations, each under fifteen words, illustrating the rules
above. All from the public-domain fiction corpus (`corpus/MANIFEST.md`).
Quoted for calibration only — never reused verbatim in card text
(`corpus/tools/overlap.mjs` enforces this).

1. "He looked rather pleasantly like a blond satan." — Dashiell Hammett,
   *The Maltese Falcon* (1930)
2. "Her voice was placid as her face." — Dashiell Hammett, *The Dain
   Curse* (1929)
3. "Air that stung like ammonia came through the opening." — Dashiell
   Hammett, *The Dain Curse* (1929)
4. "Thaler was watching me with a hard small smile in eyes and mouth." —
   Dashiell Hammett, *Red Harvest* (1929)
5. "His voice was a drawling baritone." — Dashiell Hammett, *Continental
   Op* stories (1923–1930)
6. "Placidity came back to Spade's face and voice." — Dashiell Hammett,
   *The Maltese Falcon* (1930)
7. "Her eyes were shiny because they were wet." — Dashiell Hammett, *Red
   Harvest* (1929)
8. "The chain rattled as the door swung open." — Dashiell Hammett,
   *Continental Op* stories (1923–1930)
9. "Amazement washed her swollen face empty of grief." — Dashiell
   Hammett, *The Dain Curse* (1929)
10. "The few I have seen are completely masked—like the man in the
    boat." — Dashiell Hammett, *Continental Op* stories (1923–1930)
11. "I clutched the gun the tighter." — Carroll John Daly, *The White
    Circle* (1926)
12. "There was relief in his face as well as his voice when he spoke." —
    Carroll John Daly, *The White Circle* (1926)
13. "There was no noise in the street." — Ben Hecht, *A Thousand and One
    Afternoons in Chicago* (1922)
14. "It is almost as if one saw the bodies of men lying in shadows." —
    Ben Hecht, *A Thousand and One Afternoons in Chicago* (1922)
15. "The burly man growled: 'That's more like it,' and went away." —
    Dashiell Hammett, *Red Harvest* (1929)

## Note on Lardner (contrast, not donor)

*You Know Me Al* (1916) measures very differently: mean sentence length
22.5 words (nearly double the fiction corpus), fragment rate under 10%
(half the fiction corpus's), and a **dialogue ratio of 0**, because the
book is written as a busher's letters home — reported speech inside
run-on first-person paragraphs, no quotation marks at all. It's vernacular
American first person, useful for period slang and comic rhythm, but its
cadence is the opposite of what this game wants: long, breath-run
sentences instead of clipped ones, no dialogue mechanism at all. Treated
here as a reference for voice contrast, not mined for card cadence or
counted into the simile/dialogue numbers above.

## Methodology notes (from `corpus/tools/stats.mjs`)

- Sentence splitting is regex-based with a short abbreviation list (Mr.,
  Dr., St., etc.), not a parser. Good enough at this corpus size, not exact
  per-sentence.
- "No finite verb" (fragment) detection is a hand-built list of ~250
  common verb inflections plus auxiliary contractions, not a POS tagger.
- The concrete noun bank (`corpus/derived/concrete-nouns-*-over-*.txt`)
  uses a stopword/heuristic filter, not true part-of-speech tagging; spot
  check before treating an entry as a noun.
- Dialogue ratio counts any sentence touching a quotation mark, which is
  an upper bound (catches quoted titles, etc., not just spoken lines).
- "As a" as a simile marker is noisy — see §2.
- Period corpus excludes the WPA Guide's "Books About New York"
  bibliography (noisy OCR, not prose) and skips the first two lines of
  each *Evening World* page block (masthead OCR noise) — see
  `corpus/NOTES.md`.
