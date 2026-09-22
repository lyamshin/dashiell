# M8 scene decks — drafts

*Moved: this was `content/drafts/scene/README.md`. The drafts are now in `content/decks/`, reconciled with the engine; every change made on the way in is listed in `docs/17-m8-notes.md`, "What the drafts needed". `scripts/check-scene-drafts.mjs` went with the drafts; `npm run decks` validates the same decks against their schema entries.*

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

Card counts (924 total): establish 144, watch 66, return 40, activity
276, thought 168, bridge 45, carry 140, answer 45.

## Revision pass (review of PR #24)

The first draft had six problems a reviewer caught; this pass fixed
all six on the same branch. Noted here because they change how a few
decks read from the original PR description:

1. **Tense.** All eight decks are past tense throughout (pages are
   first person, past tense; narration never switches to present).
   `activity` was the worst offender — roughly 240 of its cards were
   present tense ("{name} is restocking...") — and is now uniformly
   past progressive, the device the golden itself uses ("Callahan was
   behind the bar... putting clean glasses back on the shelf"). Every
   deck was re-scanned for stray present-tense narration (gnomic
   asides like "the way a landlady keeps..." are now "kept").
2. **No invented names.** `establish` no longer names any building or
   person beyond what `{place}` itself resolves to (its template's
   `shortName`). "The Dover's roof," "Mrs. Teague's," "the Wyckoff,"
   "Zelinsky's," "the Bijou," "the Arcadia," "the Hallam," "Rivington
   Street," "Eleventh Avenue," "Twenty-Third Street" and the rest are
   gone, replaced with generic descriptors ("the roof," "the rooming
   house," "the hotel lobby," "the garage," "the picture house," "the
   dance hall," "the vestibule"). The reasoning: `{place}` already
   carries the template's own established name; any *other* proper
   noun in the card text is one the reader has no way to have been
   introduced to, which is exactly what the continuity rule against
   unexplained names forbids for buildings as much as for people.
3. **`thought` no longer sounds like a rules engine.** Rewrote all 168
   cards off the banned-word list (`placement`, `holds`, `if that
   placement`, `the hour that matters`, `when it counted`, `whatever
   else is true`, `had what it took`) and modeled every card on
   golden page 5's two-sentence shape: an inference that names the
   scene, the victim, or a spoken-style time (`{time}` renders as "ten
   o'clock," not "22:00"), followed by a short human second sentence
   saying who it helps or hurts, or what it leaves open. **Added a
   `{scene}` slot** — the place where it happened, distinct from
   `{place}` (an elsewhere a subject is placed) — since several classes
   (`implicates`, `not-robbery`, `robbery-shape`, `context`) read much
   more like a person thinking once they can name the scene directly.
   This is new relative to §9's original slot list for `thought`
   (`{subject}`, `{place}`, `{time}`, `{source}`, `{victim}`, `{other}`)
   and needs adding on the engine side.
4. **`answer`** no longer reads like a receipt ("I had what I came
   for: {subject}"). Rewritten as a person closing a chapter of the
   night, mostly tied to `{name}` (who sent them) rather than a bare
   `{subject}` listing — "found" leans on whether the tip was worth
   the walk, "dead-end" on the lead running dry, "something-else" on
   the errand turning into a different, better question. A minority
   of cards per outcome (3 of the 15 now on file) keep `{subject}`
   instead of `{name}`, for the case where an errand had no sender to
   credit or blame (an unmarked `carry: no-lead` search or question).
5. **`bridge` and `carry`** had their wooden template variants cut
   ("That made {subject} {tie}, which was reason enough…", "So did I,
   on {subject}."). `bridge` was rewritten in full, closer to golden
   page 3's last paragraph: naming `{tie}` as the reason `{subject}`
   matters, then saying plainly who (`{who}`) would know more.
   `carry`'s 140 cards keep the shape golden page 3's first line uses
   ("The precinct had looked at Sweeney. I wanted to look at the
   room.") — a handful of specifically wooden lines (the "So did I"
   constructions) were rewritten; the rest were already in that
   register and were left alone rather than rewritten for no reason.
6. **`activity` is pruned to what the generator can actually deal.**
   A fixture role only ever appears at the placeKind(s)
   `src/gen/data/places.ts` assigns it as `watcher` for — e.g. a
   `bartender` is watcher only at `semi` places (Dolan's, the
   speakeasy), never `public` or `private` — so those unreachable
   cells were deleted rather than padded for a count. This cut the
   fixture-role share of `activity` from 90 cards (10 roles × 3
   placeKinds × 3) to 33 (11 reachable role/placeKind cells × 3).
   **`beat-cop` is dropped from `activity` entirely**: it's in the
   `fixtureRole` vocabulary (and still has its 6 `watch` cards, since
   that deck isn't scoped to place assignments) but is never a
   `watcher` for any place template in the current data, so it has no
   reachable placeKind to write for. If the engine wants a beat-cop
   presence beat, that needs a place assignment first — this is a data
   gap, not an oversight, and is flagged rather than papered over with
   cards for a cell nothing will ever deal. Suspect archetypes were
   left at the full 3 placeKinds each, since a suspect can plausibly
   be found anywhere, not only where their trade would put them.

## Other notes and judgment calls (from the original PR)

- **`establish`'s `office` key** is the detective's own office (two
  rooms above a laundry), not `office-over-tailor` (a suspect's
  business, whose `shortName` also happens to be "the office"). §12
  puts the office page's own prose out of scope, so these four cards
  deliberately don't reuse the office golden's sentences, and — per
  the no-invented-names fix above — no longer name the street or the
  laundry's trade either. They're new phrasing for the rare case the
  engine needs an `establish` card at that key.

- **`bridge`'s `{where}` slot** is used on roughly a third of the
  cards per `tie` (the ones ending "...at `{where}`") and left out of
  the rest, since §9 says it's only available "if the notebook knows."
  A card without `{where}` should be the default draw; one with it
  should only be dealt when the source's location is actually known.

- **Suspect-archetype count.** `src/gen/data/cast.ts` currently has 27
  suspect archetype ids, not the 26 the task brief's arithmetic
  assumed — `activity`'s suspect share is 27 roles × 3 placeKinds × 3
  cards = 243 (plus the 33 reachable fixture cards above = 276 total).

- **Motifs.** Every card ships `"motifs": []`. None of these decks
  are especially image-bearing (they're closer to `errand`/`hours`
  than to `similes`/`portraits`), and §9 allows zero motifs on a card
  with no image in it.

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
  reads naturally (the tailor's office, the walk-up flat, the rooming
  house room). Every place still has at least one establish card with
  neither slot, per the task brief ("write most cards without, some
  with").
