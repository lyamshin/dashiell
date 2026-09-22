# Portrait pairs — notes for the tuning pass

Track C of Hone 1 (`docs/12-hone-1.md`). `content/decks/portrait-pairs.json`,
120 cards, checked clean by `corpus/tools/overlap.mjs` and by the new
`scripts/check-portrait-pairs.mjs`. Both outputs are pasted at the bottom of
the report back to the lead; this file is the craft note the spec asked for.

## What was hard

**The slot list is shorter than the prose wants.** The spec gives five slots:
`{He}` `{he}` `{his}` `{him}` `{name}` — no capitalized possessive. Every
sentence that wanted to open "His hands were still strong..." had to be
rebuilt to open on the subject instead ("He had hands still strong...") or
on a bare noun with the pronoun implied by context ("The shoes were not:
resoled..."). This was a full second pass across 36 of the 120 cards, done
after the first draft rather than caught while writing it — worth flagging
for whoever writes the next slot-based deck: draft with the slot list open
next to you, not after.

**No similes is a stricter rule than it feels like while drafting.** "As
though," "as if," and "like a" kept creeping in as a hedge — "touched it, as
though checking it was still there" — because that's the easiest way to
write *why* a gesture happens. Cutting the hedge and just stating the reason
plainly ("touched it to check it was still there") was almost always a
strict improvement once made, which matches the golden's rule 1: the
simile-free version reads faster, not just "compliant."

**The overlap checker's five-word net catches ordinary English as often as
real reuse.** Phrases like "at the back of the neck," "did not seem to
notice," and "down on the corner of the desk" are common enough to sit
somewhere in 1.1M words of corpus, so several structurally fine sentences
needed rephrasing around a stock five-word run without losing plainness.
None of the 15 flagged cards were actually derivative; all were fixable with
a synonym or a reordered clause. `corpus/tools/overlap.mjs` is clean on the
final deck (output below).

**Keeping `gender: "any"` cards actually gender-neutral took a second
audit.** The pronoun slots make a card mechanically playable to either
gender, but the *objects* a card reaches for default hard to one gender in
period material culture — a waistcoat pocket, a collar stud, a mustache
brush read as menswear no matter what the tag says. Caught and rewrote two
(`pp-034`, `pp-038`) after a grep for waistcoat/mustache/collar-stud/etc.
against `gender: "any"` cards; a tuning pass should re-run that grep with a
wider word list, because a compass-shaped cufflink (`pp-030`) is still a
mild signal I let stand.

**Never the same detail twice, at 120 cards, in one deck.** A handful of
objects recur by design across classes — spectacles (5 cards), watches or
clocks (4), card cases or pocketbooks (5) — because they're genuinely the
period objects a person's hands go to. Each occurrence is a different
specific mechanic (carried-not-worn vs. mended-with-wire vs.
pushed-to-the-forehead-and-forgotten), so no two cards share a detail, but
the clustering is real and a tuning pass with a bigger budget could spread
the eyewear/timepiece cards further out.

## Which class was thinnest

**Underworld.** The cast archetypes it draws from (bookmaker, ward heeler,
pawnbroker's clerk, bouncer, policy runner) have less period *material
culture* to work with than money or working — no furs, no union buttons, no
laundry marks, nothing as concrete as a factory or a parlor gives the other
classes. Worse, the obvious physical tells for this class — a scar, a
broken nose, a missing tooth — sit closest to the rule against "an injury
that implies the crime," so almost every physical detail needed an explicit
"old" or "healed years back" to stay clear of the case's own wounds, and the
gold-tooth/broken-nose cluster is exactly the parody-line the style guide
warns against (§6, "two adjectives where the corpus uses one noun" — here,
the noir-cliché equivalent is "the scarred tough"). I ended up leaning
harder on behavior than object for underworld — watching the exits, counting
by feel, a rehearsed answer, a coin flipped without looking — which reads
well but meant working from a narrower physical palette than the other three
bands. If the deck grows past 120, underworld is where the next batch should
go first.

## Ten strongest (start the tuning pass here)

1. **pp-001** (money, m, young, anywhere) — "the empty card case": "{He}
   reached for a card case before I asked for one. It came out empty, and
   {he} put it away without a word. Somebody used to keep it filled for
   {him}." Clean three-beat structure, and the last sentence does real work
   without overstating it.
2. **pp-013** (money, m, old, anywhere) — "the hidden photograph": "{He}
   paid me from a pocketbook worn soft at the fold, and a photograph slid
   partway out with the bills: a young woman, turned face down before I
   could see more than the edge of her. {He} pushed it back in without
   looking at it." The "without looking at it" carries more than a stated
   reaction would.
3. **pp-028** (money, f, old, office) — "the money in the vowels": earns its
   abstraction because it's paid off concretely ("sounded twenty years
   younger the moment {he} got angry").
4. **pp-045** (working, m, young, anywhere) — "the folded pawn ticket": a
   period object doing a character's whole economic situation in one
   sentence, no explaining.
5. **pp-052** (working, m, old, office) — "the inked hatband name": real
   period detail (a rooming house stamps its lodgers' hats) used exactly as
   the style guide asks — naming a real practice, not seasoning with slang.
6. **pp-065** (working, f, old, anywhere) — "the loose rosary bead": the
   quietest card in the deck and the strongest for it — no judgment
   sentence needed.
7. **pp-084** (underworld, m, middle, anywhere) — "the missing back tooth":
   the reason-it's-seen (laughs rarely, and only once) is doing as much
   characterization as the detail itself.
8. **pp-092** (underworld, f, middle, office) — "the habit of pricing
   aloud": three concrete objects priced in one breath, a whole trade in a
   sentence.
9. **pp-099** (underworld, any, middle, office) — "the hand out of sight":
   minimal, tense, and works for either gender without straining.
10. **pp-120** (professional, any, old, office) — "the question turned to
    statement": a genuinely different *kind* of tell (a speech habit from a
    career, not an object), good closer for the deck.

## Ten weakest (where the tuning pass should cut first)

1. **pp-004** — "the cheaply resoled shoes": competent but the most
   conventional idea in the deck (money in decline, shown by the shoes);
   it's the version of this card any pastiche would reach for first.
2. **pp-031** — "the unexplained receipt": the weakest visual hook in the
   deck — there's nothing to see, only to infer.
3. **pp-034** — "the unused sharpened pencil": written to fix a
   gender-neutrality problem (see above) rather than from a strong idea, and
   it shows; the motivation for the gesture is thin.
4. **pp-036** — "the borrowed initials": a milder echo of `pp-009`'s
   wrong-initials cigarette case, and less specific for it (a pocket square
   is less charged than a case a stranger hands you).
5. **pp-038** — "the pillbox never opened": the other gender-neutrality
   fix, and the least motivated card in the deck — "touched it twice, never
   opened it" doesn't earn its own attention the way the stronger cards do.
6. **pp-069** — "the temple tapped twice": more cerebral than visual; it
   tells the reader about a habit of mind rather than showing something
   Dashiell's eye actually catches.
7. **pp-074** — "the chair nearest the door": a weaker, more generic version
   of `pp-081`'s "chair facing both exits" — same idea, less specific.
8. **pp-098** — "the repeated last word": a speech tic rather than a
   portrait; thin as something a reader pictures.
9. **pp-106** — "the mid-sentence correction": same problem — accurate
   characterization, but talkier than seen, and close in kind to `pp-120`
   without `pp-120`'s payoff.
10. **pp-116** — "the count stopped at three": the closest thing in the deck
    to a joke, and risks reading as cute rather than noir — worth checking
    against the style guide's one-joke-per-page budget (§5) before it's
    dealt near another wry card.

## Checks

`node corpus/tools/overlap.mjs content/decks/portrait-pairs.json`:

```
Building corpus 5-gram index...
Indexed 1157304 words across 11 corpus files (1136370 distinct 5-grams).

Checked 120 cards across 1 deck file(s).
CLEAN: zero runs of 5+ consecutive words shared with the corpus.
```

`node scripts/check-portrait-pairs.mjs`:

```
Checked 120 cards in content/decks/portrait-pairs.json

By class: {"money":40,"working":40,"underworld":20,"professional":20}
By gender: {"m":44,"f":42,"any":34} (gender:any = 34, want >= 25)
By ageBand: {"young":44,"middle":42,"old":34}
By setting: {"anywhere":85,"office":35} (office = 35, want >= 30)

Motifs used (count, motif):
   31  hands
   16  work
   14  voice
    8  paper
    8  money
    8  coat
    7  eyes
    5  hat
    4  clock
    3  door
    2  cigarette
    2  photograph
    2  window
    2  mouth
    1  mirror
    1  memory
    1  machinery
    1  gambling
    1  keys
    1  face
    1  law
  (29 cards carry zero motifs)

All clear: shape, tags, motifs, recall length, slot spelling, and deck-level distribution all pass.
```

## Handoff

`content/deck-schema.json` is Track B's to update (per `docs/12-hone-1.md`
Track C): add a `portrait-pairs` entry alongside `portraits`, file
`portrait-pairs.json`, `idPrefix: "PP"` or similar, tags `gender` / `class`
(`suspectClass` vocab, minus `any` isn't used here but the vocab already
allows it) / `ageBand` / `setting` (new: `["office", "anywhere"]`), and
`slots: ["detective", "name"]` to match `portraits`. Once that's in,
`scripts/validate-decks.mjs` should be pointed at this file too and
`scripts/check-portrait-pairs.mjs` can be retired or kept as a
deck-specific supplement.
