# M8 scene decks — drafts

Eight decks written against `docs/17-m8-the-scene.md` §9, on branch
`m8-scene-content`, against golden voice in `docs/golden/seed3-night.md`
and `docs/golden/seed3-opening.md`. `content/decks/` and
`content/deck-schema.json` are untouched — the `m8-scene` engine branch
owns those; these drafts are meant to be moved in during integration.

`scripts/check-scene-drafts.mjs` validates shape, unique ids, tags,
slots and §9 count targets against these files directly (it doesn't
depend on `content/deck-schema.json` having entries for these decks
yet). `node corpus/tools/overlap.mjs content/drafts/scene/*.json`
comes back clean.

Card counts (972 total): establish 144, watch 66, return 40, activity
333, thought 168, bridge 45, carry 140, answer 36.

## Notes and judgment calls

- **`establish`'s `office` key** is the detective's own office (two
  rooms over a laundry on Rivington Street), not `office-over-tailor`
  (a suspect's business, whose `shortName` also happens to be "the
  office"). §12 puts the office page's own prose out of scope, so
  these four cards deliberately don't reuse the office golden's
  sentences — they're new phrasing for the rare case the engine needs
  an `establish` card at that key (e.g. a first-visit render outside
  the hand-honed office page). If the engine never reaches this key,
  the cards are harmless; if it does, they're in the same voice.

- **`activity`'s role × placeKind cross-product is wider than what the
  generator will ever actually draw.** A fixture role only appears at
  the one placeKind its place template assigns it (e.g. `bartender`
  only at `semi` places), so the `public`/`private` cards for
  fixture roles exist for schema completeness per §9's literal table
  ("placeKind: public, semi, private" for "every suspect archetype id
  and fixture role") rather than because a bartender is ever found in
  a private residence. They're written to the same voice bar as the
  reachable cells rather than left thin, in case that assumption is
  wrong or changes.

- **`bridge`'s `{where}` slot** is used on roughly a third of the
  cards per `tie` (the ones ending "...at `{where}`") and left out of
  the rest, since §9 says it's only available "if the notebook knows."
  A card without `{where}` should be the default draw; one with it
  should only be dealt when the source's location is actually known.

- **Suspect-archetype count.** `src/gen/data/cast.ts` currently has 27
  suspect archetype ids, not the 26 the task brief's arithmetic
  assumed — `activity`'s role list is the fixture roles plus all 27,
  so its total is 37 roles × 3 placeKinds × 3 cards = 333, not 324.

- **Motifs.** Every card ships `"motifs": []`. None of these decks
  are especially image-bearing (they're closer to `errand`/`hours`
  than to `similes`/`portraits`), and §9 allows zero motifs on a card
  with no image in it. A later pass could tag a handful of `establish`
  or `activity` cards that do carry a strong image (a paper lantern,
  a fire escape) if the engine's motif-echo logic would benefit.

- **`return`'s `scene` placeKind** isn't a value of the engine's
  `PlaceKind` type (`private | semi | public`) — it's the fourth key
  §9's own `return` row lists, for a return trip to the murder scene
  specifically (heavier in tone than an ordinary private-place return,
  per the golden's "it hadn't stopped being a crime scene" register).
  Flagging it here only because it's easy to mistake for a typo
  against `src/gen/types.ts`; it's intentional and matches §9's table.

- **`establish`'s `{watcher}`/`{owner}` slots** only appear on cards
  for places that actually have that field in
  `src/gen/data/places.ts` — 19 of the 35 place templates carry a
  `watcher`, and `{owner}` appears only on the five residence
  templates plus a few private non-residence ones where "whose place"
  reads naturally (the tailor's office, the walk-up flat, Mrs.
  Teague's room). Every place still has at least one establish card
  with neither slot, per the task brief ("write most cards without,
  some with").
