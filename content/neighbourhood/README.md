# The neighbourhood bible

A few blocks of the Lower East Side: ten places and twenty-four people, written once and cast from every night. The spec is `docs/48-neighbourhood.md` §1; the voice is `docs/golden/seed3-camp.md`.

## The blocks

Start at the top, on Second Avenue, where the Lyric is in the twelfth triumphant week of *The Rabbi's Daughter* and Pinsky the usher mouths the death scene from the back of the house. Come down past Houston to Allen Street, where the el rattles the card room over Feingold's garage and every losing hand is the el's fault. Around the corner on Rivington, Sokol's sells bread at the front and gin through the door marked FLOUR, and Fishel takes bets in the back booth. West on Chrystie, the Peacock swings in a cellar under an undertaker's, with Ruby Szabo at the slot and Lola Marsh selling Luckies and looking at wrists. South on Orchard, Wojcik smokes in the cellar steps of the flats over Lipsky's cloth shop and argues with his boiler; on Eldridge, Mrs. Rafferty keeps her stairs from a kitchen chair on the first landing; on the Bowery, under the el, Wexler sits in his cage beside a set of false teeth nobody has come back for. East along Grand Street the soup is crossed off the slate at Steinmetz's chop house. Up on Clinton, Dr. Hirsch drills over the bank. And on East Houston the Excelsior leaves its front door open an inch for anybody, with nobody watching.

## Files

`places.json`

```json
{ "places": [ {
  "id": "sokols", "name": "Sokol’s", "kind": "bar", "street": "Rivington Street", "number": 71,
  "hours": { "open": 19, "close": 2 },
  "watcher": { "person": "sokol", "counts": "…", "sees": "…", "blind": "…" },
  "minutes": { "raffertys": 10, "lipskys": 5 },
  "arrivals": [ { "band": "early", "weather": "any", "text": "…" } ],
  "details": [ { "id": "sokols-booth", "kind": "prop", "text": "…" } ],
  "hides": [ "the back booth behind the flour sacks" ]
} ] }
```

`people.json`

```json
{ "people": [ {
  "id": "rafferty", "first": "Nora", "last": "Rafferty", "honorific": "Mrs.", "gender": "f", "age": "60s",
  "job": "the landlady", "home": "raffertys", "works": { "place": "raffertys", "open": 19, "close": 24 },
  "manner": "plain", "doing": [ "…" ],
  "looks": [ { "setting": "raffertys", "text": "…" } ],
  "voice": { "ask": [], "deflect": [], "nobodyElse": [], "hours": { "7": "…", "8": "…", "9": "…", "10": "…", "11": "…" }, "refuse": [], "ownUp": [] },
  "ties": [ { "to": "gutman", "kind": "lodger", "line": "…" } ],
  "secrets": [ { "text": "…", "place": "raffertys" } ],
  "asVictim": { "why": "…", "foundWith": "…" }
} ] }
```

## Conventions

- **kind** is the engine's `PlaceKind` (`src/gen/board/types.ts`): `home`, `bar`, `restaurant`, `theatre`, `club`, `work`. The rooming house and both blocks of flats are `home`; the card room is `club`, as in `UNWATCHED`.
- **hours** and **works** use a 24-hour clock. `close` can be smaller than `open`, which means after midnight (`19` to `2`). `24` is midnight. `hours` is `null` for a home, which is always open to the people who live there.
- **watcher** is `null` for the card room and the Excelsior. `counts` is the watcher's own words. `sees` and `blind` are noun phrases ("the stairs inside, once you’re past the first turn"). A blind spot is somewhere *within* the place (a back room, behind a door), never a way in, so the watcher's list still counts everybody who came.
- **minutes** gives the walk to every other place: symmetric, 5 to 25. It's computed from a street grid (blocks east of the Bowery, blocks south of Houston) at a slow night pace and rounded to 5.
- **arrivals**: `band` is the detective's night: `early` is midnight to 2, `mid` is 2 to 4, `late` is 4 to 8 (the engine's `midnight-2`, `2-4`, and `4-6` plus `6-8`). Every place has one `any`-weather arrival per band, plus weather ones. Each arrival names the place, says what it's doing at that hour, and gives one thing to notice. No arrival places a suspect or lands a gag.
- **details**: `prop`, `habit` or `gag`. Each place has exactly one gag, and nothing like it appears at another place. Means for the generator are props: chloral (Rafferty's, the surgery), the revolver (Rafferty's, Wexler's), the pistol (the card room), rat poison (Lipsky's), and blades (Sokol's bread knife, the Peacock's ice pick, Steinmetz's steak knives, the Lyric's sword).
- **manner** is the engine's `Manner` (`plain`, `terse`, `careful`). Watchers draw `watcher` cards by role whatever their manner.
- **honorific** is `"Mrs."`, `"Miss"`, `"Dr."` or `null` (the men go by their surnames).
- **voice.hours** are 7 to 11 in the evening. For anybody who isn't a watcher or a fence, the hour lines are moods and habits, never a place or company, so they can frame any account the engine writes. Watchers' and fences' hour lines may name their own post.
- **ties**: `kind` is what `to` is to this person ("they are my landlady"), except `owes` (I owe them) and `owed` (they owe me). Every tie is returned: `lodger`↔`landlady`, `owes`↔`owed`, `employer`↔`employee`, and `old-flame`, `in-law`, `rival`, `feud`, `friend` both ways. Everybody has two to four.
- **secrets** happen at their `place`. Lines in ties, looks and details don't give a secret away.
- **Watchers** (8): Rafferty (Rafferty’s), Wojcik (Lipsky’s), Sokol (Sokol’s), Szabo (the Peacock), Pinsky (the Lyric), Demos (Steinmetz’s), Gutman (the surgery), Wexler (Wexler’s). **Fences** (2): Fishel at Sokol's, Marsh at the Peacock. The other fourteen are the client and suspect pool.
