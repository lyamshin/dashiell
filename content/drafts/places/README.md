# Place names (drafts)

Content only. Nothing reads these files yet. They get wired in after the generator and page-planner rewrite.

- `names.json`: 252 name sets across all 35 place templates in `src/gen/data/places.ts`, 6–10 per template.
- `streets.json`: streets and avenues for each of the twelve neighbourhoods, used to fill the `{street}` and `{avenue}` slots.
- `rules.md`: how the engine uses each form (proper, local, epithet, short) and how the keeping place of a lost item or pet is named.
- `scripts/check-place-names.mjs`: the check. Run `node scripts/check-place-names.mjs --table`.

## A name set

```json
{
  "id": "pwn-moskowitz",
  "proper": "the back room of Moskowitz’s pawnshop on {street}",
  "local": ["Moskowitz’s"],
  "short": "Moskowitz’s",
  "epithets": ["behind a grille that came down with a noise like a dropped drawer of cutlery", "…"],
  "sense": ["sound"]
}
```

These fields are optional:

- `fits`: the neighbourhoods the set may be drawn in. It's used when a set names a real landmark or a fixed street.
- `keeping: true`: the set names the place as `{V}`'s own, for example the owner's pawnshop in a lost-item case.

## Slots the engine must supply

| slot | what | where from |
|---|---|---|
| `{street}` | a cross street in the case's neighbourhood, full name ("Rivington Street") | `streets.json` → `streets` |
| `{avenue}` | a north–south avenue or main street, with any article it carries ("Tenth Avenue", "the Bowery") | `streets.json` → `avenues` |
| `{V}` | family name of the person whose own place it is: the victim at their address, or the owner of a lost item or pet | the case |
| `{W}` | family name of the landlady posted at the place (walkup-flat, rooming-house-room, tenement-stairwell, boarding-parlor) | the landlady fixture |

Every residence set carries `{V}` in `proper`, `short` and at least one `local` form. Outside the residences, `{V}` appears only in `keeping` sets.

## Counts

| template | sets | any neighbourhood | fitted | keeping |
|---|---|---|---|---|
| res-apartment | 7 | 7 | 0 | 0 |
| res-brownstone | 7 | 7 | 0 | 0 |
| res-walkup | 7 | 7 | 0 | 0 |
| res-suite | 7 | 7 | 0 | 0 |
| res-backhouse | 7 | 7 | 0 | 0 |
| rooftop | 7 | 6 | 0 | 1 |
| back-alley | 7 | 6 | 0 | 1 |
| office-over-tailor | 7 | 5 | 1 | 1 |
| pier-shed | 7 | 7 | 0 | 0 |
| laundry-yard | 7 | 6 | 0 | 1 |
| walkup-flat | 7 | 6 | 1 | 0 |
| hallam-vestibule | 7 | 7 | 0 | 0 |
| rooming-house-room | 7 | 6 | 0 | 1 |
| dolans-bar | 8 | 6 | 1 | 1 |
| speakeasy | 7 | 7 | 0 | 0 |
| hotel-lobby | 7 | 7 | 0 | 0 |
| corner-newsstand | 7 | 6 | 0 | 1 |
| automat | 7 | 6 | 1 | 0 |
| movie-house | 7 | 7 | 0 | 0 |
| dance-hall | 7 | 7 | 0 | 0 |
| drugstore | 7 | 6 | 0 | 1 |
| cab-stand | 7 | 4 | 3 | 0 |
| tenement-stairwell | 7 | 6 | 0 | 1 |
| pool-hall | 7 | 7 | 0 | 0 |
| pawnshop | 7 | 6 | 0 | 1 |
| chop-suey | 7 | 6 | 0 | 1 |
| boarding-parlor | 7 | 7 | 0 | 0 |
| barber-shop | 7 | 6 | 0 | 1 |
| hotel-garage | 7 | 6 | 0 | 1 |
| el-platform | 8 | 4 | 4 | 0 |
| square-benches | 10 | 4 | 6 | 0 |
| ferry-slip | 9 | 3 | 6 | 0 |
| subway-kiosk | 7 | 5 | 2 | 0 |
| side-chapel | 7 | 7 | 0 | 0 |
| union-hall | 7 | 7 | 0 | 0 |
| **total** | **252** | | | |

"Any neighbourhood" counts the sets that can be drawn in every case (no `fits`, not keeping). Every template has at least three. The benches, the ferry slip and the El lean on real landmarks (Stuyvesant Square, the Hoboken ferry, the Third Avenue El), so a Gramercy case gets Stuyvesant Square and a Harlem case gets Mount Morris Park.

## What the check enforces

- Every template is covered, with 6–10 sets. Ids are unique.
- The required fields are present. `short` is at most two words. There are 3–5 epithets, starting lower-case with no full stop.
- Only the four slots appear, and each appears only where it belongs.
- No banned plain terms (`content/plain-terms.json`).
- No clock times and no case words (murder, police, suspect…).
- No words for evidence objects, lost pets and items, or timed anchors. An epithet must never be mistaken for a clue, so there's no radio, bell, piano, ice, rain, stool, dog, ring or watch.
- No family names the cast generator deals (`src/gen/data/names.ts`).
- `streets.json` covers all twelve neighbourhoods.

## Changes from the current templates

- **Ruggiero's barber shop** is now Esposito's (the first set). Ruggiero is a family name the cast generator deals, so a suspect could share a name with a shop.
- **Mrs. Teague's** (rooming-house-room, boarding-parlor) is now `Mrs. {W}'s`, named for whichever landlady the case deals. Today the landlady who "rents out the rooms at Mrs. Teague's" can be called Brody.
- **"the stairwell of the Mott Street tenement"** now takes `{street}`. Mott Street is Little Italy, and the template was dealt in every neighbourhood.
- **"the third-floor walk-up on Ninth"** now takes `{avenue}`, for the same reason.
- **Kept as the first set of their template:** Dolan's, Kaplan's, the Wyckoff, the Bijou, the Arcadia, Mancuso's, Zelinsky's, the Hallam, the Dover roof, Pier 46, the Hippodrome cab stand and St. Malachy's. So the golden pages still have their places.
- **Every set agrees with the template's establish and ambient cards:** the speakeasy is always under a hat shop, the walk-up always over a drugstore, the chop suey place always over a laundry, the union hall always over a bakery, the office always over a tailor's.
