# Tagging C1 notes

Files: `content/decks/similes.json`, `portraits.json`, `business.json`, `frames.json`,
`utterances.json`, `find.json`, `dashiell.json`. 1,044 cards tagged. Branch `tag-c1`,
not pushed.

## Where the fields live

`deck-schema.json` and `content/motifs.json` are the engine track's to add (per Part C
deliverables), so this pass had to guess a shape and flag it here for whoever wires the
engine side up:

- `motifs: string[]` and `weather?: 'fog' | 'rain' | 'cold' | 'clear' | 'any'` are added
  as **top-level fields on the card**, siblings of `tags`, not inside `tags`. Two
  reasons: A.2 describes them as things "every card carries," phrased apart from tags,
  and mechanically `Card.tags` is typed `Record<string, string | number>` in
  `src/game/voice/cards.ts` — it has no room for an array value.
- `gender` for similes went **inside `tags`** (`tags.gender`), matching the existing
  convention in `portraits.json` and `business.json`, which already carry a `gender`
  tag. A.3 calls it "a `gender` tag," singular, which reads as the same mechanism.

## Text edits made

None. Part C's own example of a self-contradiction — "though the sky was clear" on a
card also tagged rain — turned out to name a real card (`por-131`, an almost verbatim
match) but not a real bug: the raincoat is a paranoia/habit detail, not evidence about
tonight's weather, and it resolves cleanly by tagging `weather: 'clear'` (which is what
the sentence actually asserts) instead of inferring rain from the garment. The same
pattern showed up three more times — `por-102` ("a rain that wasn't falling"),
`por-134` ("a cold nobody else felt"), `por-142` ("though the night was mild") — and a
milder version in `business.json` (`bus-094`, "kept his coat buttoned though the room
was warm"). All four portrait cards are intentional character irony (a person dressed
for weather that isn't happening), not typos, and none needed a rewrite once tagged
correctly. I went looking for a genuine "the card asserts two different weathers"
case and didn't find one.

## Cards that fought the vocabulary

**Business's occupational props aren't in A.2 at all.** A large share of `business.json`
is specific to a `fixtureRole` — the elevator gate, the ticket stub, the cabbie's meter
flag, the druggist's brass scale, the doorman's rope stanchion, the counterman's pie
case and sugar bowl, a landlady's hall runner and doormats. None of these are props in
the fixed vocabulary (which has `counter`, `glass`, `ledger`, `keys`, but nothing for a
gate, a meter, a scale, a stanchion, a stub). 39/130 business cards end up at zero
motifs, and most of that is this gap, not a missing tag — the image is real, the
vocabulary word for it isn't. Two business cards (`bus-001`, `bus-031`) needed the
mahogany-bar and rang-up-a-sale phrasing pattern-matched by hand rather than a literal
vocabulary word, which the checker can't verify is "right," only that the motif chosen
is legal.

**Portraits' `body` category is coarser than the trait deck.** A.2's body list is
`hands face eyes voice mouth shoulders breath` — seven words. The portraits deck names
specific features constantly: eyebrow, jaw, chin, cheek, dimple, earlobe, temple,
throat, neck, hair, skin, freckles, a widow's peak, a stammer, an accent, a rasp. None
of those are literal vocabulary. I folded head/face-region features into `face`,
wrist/forearm/thumb/callus/nail features into `hands`, and voice-quality words
(stammer, accent, rasp) into `voice`, on the theory that the card is still "about" that
region even without the exact word. That's a real interpretive step, not a lookup, and
a different tagger would fold some of these differently (a jaw scar could plausibly be
its own thing rather than `face`).

**Clothing has exactly two props: `hat` and `coat`.** Everything else a person wears —
skirt, dress, vest, blouse, stockings, necktie, knickers, gaiters, spats, cufflinks,
overcoat, muffler, shawl — got folded into `coat` as the nearest available bucket.
Gloves went to `hands` instead (worn on the hands, manipulated by the hands in every
habit card that mentions them) rather than `coat`. Shoes, garters, and brooches have no
honest home in either direction and are left untagged rather than forced somewhere
wrong (`por-127` shoes, `por-129` brooch, `por-143` garter, `por-150` a bob haircut all
end at zero).

**Four of the eight simile `target` values aren't A.2 motifs at all**: `lie`, `city`,
`body`, and `clothes` are simile *targets* (per `deck-schema.json`'s own `similes.tags`)
but none of those four words are in the fixed vocabulary. A `target: lie` card (an
alibi, a denial, a cover story — `SIM-055` through `SIM-062`, `SIM-217`–`SIM-232`) has
no seed motif to fall back on the way `target: face` seeds `face`; it gets tagged only
from whatever concrete vehicle-image happens to be in the simile ("a shell game," "a
church recitation," "a subway token"), and several land at zero because the vehicle is
itself abstract ("smooth as a new deck of cards" — gambling; "thin as a subway token" —
nothing). Same story for `target: city` and `target: body`, which read as facts about
scale or physique that don't cash out to a concrete noun.

## Homonym collisions worth flagging

Tagging by literal keyword match against A.2 hit the same handful of words playing two
roles, verb and noun, prop and not-a-prop. All instances I found were hand-corrected;
noting the pattern in case a downstream tool re-derives tags automatically and repeats
the mistake:

- **"watch"/"notice"/"match"/"change"** as verbs ("I don't watch every face," "loud
  enough to notice," "they match {method}," "such a change") vs. the noun senses in the
  vocabulary (a wristwatch, a posted notice → `paper`, a matchstick → `cigarette`,
  pocket change → `money`).
- **"corner"** is ambiguous between a street corner (`street`) and any object's own
  corner (a rug's, a notice's, an awning's) — I dropped bare "corner" from the street
  trigger entirely and hand-added `street` back only where it's actually a street
  corner (`bus-065`, `fnd-009`).
- **"block"** (a butcher's block, a cell block) vs. a city block; **"bar"** (a bar of
  soap) vs. a tavern bar; **"curtain"** (a window curtain) vs. a stage curtain;
  **"dress"** ("don't dress it up," an idiom) vs. a garment.
- The utterances deck's `{window}` slot (the coroner's time-of-death span) collides
  with the literal prop word `window`. Slot placeholders are stripped before any
  keyword scan for exactly this reason — worth keeping in mind if `content/motifs.json`
  or the engine ever tags by scanning raw card text instead of curated data.

## Motifs I wished existed

- Something for **an alibi/a lie/a cover story** as its own image, for the `similes`
  `lie`-target group and the `frames`/`utterances` register-lie cards, which are
  thematically the densest "closeness" material in the whole corpus and currently have
  nowhere to land except through their similes' incidental vehicle words.
- A **shoes/garter/jewelry** clothing bucket distinct from `hat`/`coat`, so those
  portrait cards stop being forced into `coat` or left at zero.
- A **finer body vocabulary** (or an explicit note that `face`/`hands` are meant to
  absorb every nearby feature) so two taggers converge on the same answer for "a jaw
  he held tight" or "a birthmark under the left ear."
- A place for the **weather roll's actual range**. The roll (`src/game/voice/roll.ts`)
  only ever produces `rain`, or one of `clear`/`fog`/`cold` (with `clear` weighted
  double) — it never produces `heat`, `wind`, or `snow`, even though all three are
  legal A.2 *motifs*. Cards whose only weather cue is heat, wind, or snow (`SIM-043`
  "the heat sat on the block," `SIM-199` "the wind rattled the fire escape," `SIM-045`
  "the first snow came down") still needed a `weather` field value from the roll's
  actual four-value range to be usable by the hard filter in A.2's scoring rule, so I
  bucketed heat/wind → `clear` and snow → `cold` (documented in the `weatherFromMotifs`
  logic in the tagging script, not visible in the JSON itself). A card can carry the
  motif `heat` while its `weather` field says `clear` — that's not a mistake, it's the
  roll's vocabulary being narrower than A.2's.

## Coverage

Per `scripts/check-motifs.mjs` (pasted in full in the PR/report): 24/306 similes, 19/159
portraits, 39/130 business, 113/122 frames, 139/178 utterances, 16/58 find, and 87/91
dashiell cards carry zero motifs. The last three decks are close to entirely dialogue
frames and bare-fact utterances by design (A.1's "load-bearing" material, not
"image-bearing") — the high zero counts there are correct, not a shortfall.
