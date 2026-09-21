# Style Notes — Phase B

Half a page of what the numbers actually showed, honestly, plus the places
where measurement ran out and judgment had to take over.

## What surprised me

**Fog and cigarette smoke are a caricature, not a habit.** Weather is the
*lowest*-frequency description target in the fiction corpus — 0.62
mentions per 1,000 words, barely above drink and well below face (5.35) or
even street (2.28). I went in assuming noir leans on weather as atmospheric
wallpaper. It doesn't. Hammett, Daly, and Hecht spend their descriptive
budget on people — faces, hands, voices — not on the sky. This directly
shaped the style guide's §3 and §6 (the parody line explicitly calls out
weather-as-crutch as a pastiche tell) and it's the single measurement I'd
put in front of a new writer first.

**"As a" is a bad proxy for "simile."** It's the second-most-common match
in the 200-sentence sample (49 hits) but a large fraction are non-similes
("worked as a bartender," "known as a civic reformer"). "As if" (71 hits)
and "like a" (56) are the honest workhorses. If I'd reported the raw
simile rate without checking the sample by hand, the number would have
been inflated and the grammar guidance wrong.

**The long-then-short rhythm move is rarer than its reputation.** It's the
most quotable Hammett tic, but only ~12% of long sentences (>25 words) get
the short punch-line follow-up. It's a special-occasion tool, not a
paragraph-level habit — which is why the style guide reserves it for
`intensity: 3` cards specifically, rather than treating it as a default
cadence.

**Fragments are load-bearing, not sloppy, and there are a lot of them.**
~19% of fiction-corpus sentences have no finite verb by my heuristic. That's
nearly one in five. It reframes fragments from "acceptable exception" to
"a real fraction of the instrument."

**Lardner's dialogue ratio measured as exactly zero**, which looked like a
bug until I checked the source: *You Know Me Al* is written as letters, so
spoken exchanges are reported inside run-on first-person prose with no
quotation marks at all. The measurement was right; my assumption that
"vernacular first-person" implies "lots of dialogue punctuation" was
wrong. It's a good reminder that a structural choice (epistolary form) can
swamp a stylistic one (vernacular voice) on any single metric.

**The concrete-noun bank surfaced a proper name, not a style fact.**
"Spade" is the single most fiction-skewed word after the obvious
grammar-agnostic ones — because Sam Spade is a character, not because
noir prose has some special relationship with the word "spade." Frequency
comparison can't distinguish "the corpus's vocabulary" from "one book's
protagonist's name." I left it in `corpus/derived/concrete-nouns-fiction-
over-period.txt` for transparency but didn't let it inform the lexicon or
cards. Anyone using that file for anything besides spot-reading should
expect a few more character names and one-off proper nouns mixed in with
real style signal.

**Money and geography are period-corpus strengths, not fiction ones** —
exactly backwards from my first guess. The WPA Guide and the *Evening
World* name streets, prices, and distances with a precision the novels
never bother with; the novels spend their specificity on people instead.
Practical effect: when a place or witness card needed a concrete price or
a real cross-street, I pulled from `concrete-nouns-period-over-fiction.txt`
and the WPA Guide's own text, not from Hammett's habits.

## What the corpus does that I couldn't turn into a rule

**Register shifts inside a single book.** Sam Spade doesn't talk like Gutman,
and neither talks like Effie Perine — but a corpus-wide word-frequency
count flattens all three into one "Hammett" signal. The style guide's
numbers describe the narrator's voice (close-third or hard first person,
mostly Continental Op/Spade-adjacent), not the full range of character
voices inside the books. Witness-deck writing had to do this by ear —
matching register to archetype (a landlady's cadence vs. a business
partner's) — because no corpus statistic tells you where one character's
diction ends and another's begins without hand-tagging speaker by speaker,
which was out of scope for a zero-dependency word-count tool.

**Comic timing.** The "one joke per page" rule in the style guide is
grounded in a real number (comic-marker words appear roughly once per
4,000 words), but *timing* — the fact that the joke almost always lands
right after a flat, unremarkable sentence, never after another joke or
after something grim — is a felt pattern from reading the simile sample
and the Hecht vignettes, not something the n-gram tooling measures. I used
`avoidNear` on a handful of simile cards to encode a piece of this by
hand, but the underlying comic rhythm is bigger than what one field can
carry.

**The gap between "fixtures never lie" (docs/02-m2-generator-revision.md
§2) and the witness-card schema's request for lie/evasion variants "for
at least six fixture roles."** I resolved this by writing the ten
canonical fixture roles (bartender, doorman, etc.) with truth and evasion
registers only — where "evasion" means a true-but-deflecting answer, not
a deception, which keeps faith with the simulation rule — and adding four
non-fixture civilian archetypes (secretary, neighbor, business-partner,
relative) who get the full truth/lie/evasion spread, since they're the
speakers who can actually lie in the case simulation. This satisfies the
letter of the Phase B schema (14 distinct `fixtureRole` values total, well
past "at least six") without contradicting the generator's own rule about
its fixtures. It's a judgment call, not a corpus finding, and a future
milestone should sanity-check it against however M3 actually wires
fixture dialogue to registers.

**OCR noise shows up in the numbers if you're not looking for it.** The
top hit in `concrete-nouns-period-over-fiction.txt` by a wide margin is
"tho" (3,793 occurrences, ratio 364×) — not a real word-frequency signal,
just standard 1920s newspaper typesetting shorthand for "though" showing
up at industrial scale across 48 pages of *Evening World* OCR. It's
harmless for lexicon purposes (I didn't pull it into `content/lexicon.json`)
but it's a reminder that raw frequency counts need a human pass before
they're trusted, especially against OCR'd sources.

**One explicitly-requested term never showed up.** The Automat is named
directly in `docs/03-corpus-and-style.md`'s target list, but it never
appears verbatim anywhere in the collected corpus (the closest hits are
all false-positive matches on "automatic," a gun). I kept the lexicon
entry and wrote Automat-flavored place cards anyway — Horn & Hardart
Automats were operating in New York throughout this period and it's core
to the setting docs/00-vision.md and docs/02 both assume — but flagged the
citation honestly as "not directly attested" rather than inventing a
corpus quote for it. 45 other lexicon entries (of 311) got the same
honest flag, mostly narrower slang (sawbuck, C-note, reefer, chiseler)
that's well-documented period usage but didn't happen to land in these
eleven specific files.
