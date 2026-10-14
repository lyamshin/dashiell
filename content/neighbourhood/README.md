# The neighbourhood bible

A few blocks of the Lower East Side: eleven places and thirty-three people, written once and cast from every night. The spec is `docs/48-neighbourhood.md` §1; the voice is `docs/golden/seed3-camp.md`.

## The blocks

Start at the top, on Second Avenue, where the Lyric is in the twelfth triumphant week of *The Rabbi's Daughter*, Pinsky the usher mouths the death scene from the back of the aisle, and Mrs. Shapiro keeps the costumes under the stage and buys the odd mink collar off men who shouldn't have one. Come down past Houston to Allen Street, where the el rattles the card room over Feingold's garage, every losing hand is the el's fault, and Margolis the mechanic sits by the oil stove buying the losers' watches. Around the corner on Rivington, Sokol's sells bread at the front and gin through the door marked FLOUR, and Fishel takes bets in the back booth. West on Chrystie, the Peacock swings in a cellar under an undertaker's, with Ruby Szabo at the slot and Lola Marsh selling Luckies and looking at wrists. South on Orchard, Wojcik smokes on the cellar steps of the flats over Lipsky's cloth shop and argues with his boiler; on Eldridge, Mrs. Rafferty keeps her stairs from a kitchen chair on the first landing; on the Bowery, under the el, Wexler sits in his cage beside a set of false teeth nobody has come back for. East along Grand Street the soup is crossed off the slate at Steinmetz's chop house, and Tierney sings at the oyster bar and buys rings off men short of the price of a steak. Up on Clinton, Dr. Hirsch drills over the bank.

Nobody watches two buildings. On East Houston the Excelsior leaves its front door open an inch for anybody: a dentist, a card-room keeper, a leading man, a cook, a rent collector, an alderman's clerk, a bookmaker and a wardrobe mistress. And on Ludlow Street the Belvedere, five floors of cold-water flats over Brodsky's pickle store, has no doorman, no janitor and a loop of string where the lock should be: Mrs. Ostrow the matchmaker, Miss Kahane the union organizer, Glick the insurance agent, Mrs. Pomerantz the wigmaker, Kaminsky the prizefighter and Mrs. Blau the spiritualist, who blow into the dead speaking tube by the door like everybody else.

## Files

`places.json`

```json
{ "places": [ {
  "id": "sokols", "name": "Sokol’s", "kind": "bar", "street": "Rivington Street", "number": 71,
  "hours": { "open": 19, "close": 2 },
  "watcher": { "person": "sokol", "counts": [ "…", "…", "…" ], "sees": "…", "blind": "…" },
  "minutes": { "raffertys": 10, "lipskys": 5 },
  "arrivals": [ { "band": "early", "weather": "any", "text": "…" } ],
  "details": [ { "id": "sokols-booth", "kind": "prop", "text": "…" } ],
  "hides": [ { "name": "the back booth behind the flour sacks", "arrival": "…" } ]
} ] }
```

`people.json`

```json
{ "people": [ {
  "id": "rafferty", "first": "Nora", "last": "Rafferty", "honorific": "Mrs.", "gender": "f", "age": "60s",
  "job": "the landlady", "home": "raffertys", "works": { "place": "raffertys", "open": 19, "close": 24 },
  "manner": "plain",
  "doing": [ { "setting": "raffertys", "text": "…" }, { "setting": "any", "text": "…" } ],
  "looks": [ { "setting": "raffertys", "text": "…" } ],
  "voice": { "ask": [], "deflect": [], "nobodyElse": [], "hours": { "7": "…", "8": "…", "9": "…", "10": "…", "11": "…" }, "refuse": [], "ownUp": [] },
  "ties": [ { "to": "gutman", "kind": "lodger", "line": "…" } ],
  "secrets": [ { "text": "…", "place": "raffertys" } ],
  "asVictim": { "why": "…", "foundWith": "…" }
} ] }
```

## Conventions

- **kind** is the engine's `PlaceKind` (`src/gen/board/types.ts`): `home`, `bar`, `restaurant`, `theatre`, `club`, `work`. The rooming house and the three buildings of flats are `home`; the card room is `club`, as in `UNWATCHED`.
- **hours** and **works** use a 24-hour clock. `close` can be smaller than `open`, which means after midnight (`19` to `2`). `24` is midnight. `hours` is `null` for a home, which is always open to the people who live there.
- **watcher** is `null` for the card room, the Excelsior and the Belvedere. `counts` is three standing lines in the watcher's own words, each a different angle on how they see (where they sit, what they read people by, what nobody gets past); one is said the first time I meet them, so a watcher met on many nights doesn't say the same thing every time. No line names an hour (seven to eleven), since the page may not tell it. `sees` and `blind` are noun phrases ("the stairs inside, once you’re past the first turn"). A blind spot is somewhere *within* the place (a back room, behind a door), never a way in, so the watcher's list still counts everybody who came.
- **minutes** gives the walk to every other place: symmetric, 5 to 25. It's computed from a street grid (blocks east of the Bowery, blocks south of Houston) at a slow night pace and rounded to 5.
- **arrivals**: `band` is the detective's night: `early` is midnight to 2, `mid` is 2 to 4, `late` is 4 to 8 (the engine's `midnight-2`, `2-4`, and `4-6` plus `6-8`). Every place has seven or eight: an `any`-weather arrival for each band, and rain and cold ones. The two unwatched buildings, which are every night's scene, have eight or nine, three of them early. Each arrival names the place, says what it's doing at that hour, and gives one thing to notice. No arrival places a suspect or lands a gag.
- **details**: `prop`, `habit` or `gag`. Each place has exactly one gag, and nothing like it appears at another place. Means for the generator are props: chloral (Rafferty's, the surgery), the revolver (Rafferty's, Wexler's), the pistol (the card room), rat poison (Lipsky's), and blades (Sokol's bread knife, the Peacock's ice pick, Steinmetz's steak knives, the Lyric's sword). The Belvedere has none.
- **hides** are rooms inside a place you can spend an hour in unseen: a back room, a booth, a cellar, the wings. Never a drawer, a tray or "behind the curtain". Each has its own `arrival`, one paragraph for any hour and weather, said when a night's unwatched place is that room. A hide's arrival never mentions the place's watcher, who isn't in the case that night.
- **manner** is the engine's `Manner` (`plain`, `terse`, `careful`). Watchers draw `watcher` cards by role whatever their manner.
- **honorific** is `"Mrs."`, `"Miss"`, `"Dr."` or `null` (the men go by their surnames).
- **doing** is what they'd be found doing, tagged by setting as looks are: a place's id, or `any` for anywhere. Everybody has five to seven, at least two of them somewhere other than home: at work, at a bar they drink in, or `any`. A line is said only at its setting (in a building of flats, only in their own flat; in a back room, only if it's about the room). An `any` line has to read right in a bar, a back room and a kitchen ("cracking her knuckles one at a time, in order", not "haggling with a customer"). Lowercase, a gerund phrase in the narration's past ("at a man who was talking"), naming nobody and no place.
- **voice.hours** are 7 to 11 in the evening. For anybody who isn't a watcher or a fence, the hour lines are moods and habits, never a place or company, so they can frame any account the engine writes. Watchers' and fences' hour lines may name their own post.
- **ties**: `kind` is what `to` is to this person ("they are my landlady"), except `owes` (I owe them) and `owed` (they owe me). Every tie is returned: `lodger`↔`landlady`, `owes`↔`owed`, `employer`↔`employee`, and `old-flame`, `in-law`, `rival`, `feud`, `friend` both ways. Everybody has four to eight (5.9 on average), and everybody in the client and suspect pool is tied to at least three others in it, so the people a night finds dead don't always bring the same three suspects. A tie line names nobody but the person it's to, and gives no secret away.
- **secrets** happen at their `place`. Lines in ties, looks and details don't give a secret away.
- **Watchers** (8): Rafferty (Rafferty’s), Wojcik (Lipsky’s), Sokol (Sokol’s), Szabo (the Peacock), Pinsky (the Lyric), Demos (Steinmetz’s), Gutman (the surgery), Wexler (Wexler’s).
- **Fences** (5), one a night place, each somebody who works there and buys: Fishel at Sokol's, Marsh at the Peacock, Shapiro at the Lyric, Tierney at Steinmetz's, and Margolis at the card room. The first four are kept out of the client and suspect pool. The card room is never a night's venue (nobody watches it), so Margolis is in the pool like anybody who works there.
- **The dead** come from the people who live in the two unwatched buildings. For now that's their five men: `WOMEN_VICTIMS` in `src/gen/board/world/cast.ts` is off until the engine's own lines can say "her" (docs/25, "Bible 2"). With it on, the dead are all twelve. Everything of the bible's is ready for a dead woman: her flat is "the Krantz flat", and the reasons, the shelf's words and the board's cards say her as one.
- Everything is in American spelling, with curly quotes, and is checked against `content/plain-terms.json` and the reader lint.
