# Place names: how the engine uses them

The designer: "'benches' is not sufficiently colorful and should have some level of description tied to it." Every place in a case gets one **name set** from `names.json`. A set is one concrete identity, such as "the benches by the dry fountain in Stuyvesant Square" or "the back room of Moskowitz's pawnshop on Hester Street". The set has four forms, and each form has one job.

| form | where it goes | example |
|---|---|---|
| `proper` | the first time the place is named in a night | Mancuso's pool hall on Tenth Avenue |
| `local` | what people say, in dialogue | "Mancuso's" |
| local form or a pronoun | narration after the first mention | Mancuso's; it; the place; there |
| `epithets` | now and then after the first mention, only where a sheet asks | Mancuso's, where the smoke hung over the tables like a second ceiling |
| `short` | the notebook grid, the rules, the two-letter tags | Mancuso's |

## 1. Drawing a set

- **One set per place per case**, drawn on its own seeded stream the way `officeName` draws the office. It stays fixed for every night of the case.
- **Neighbourhood.** A set with `fits` can only be drawn when the case's neighbourhood is in the list. Those sets name a real landmark or a fixed street, such as Tompkins Square or the Lafayette Theatre on Seventh Avenue. A set without `fits` can be drawn anywhere. Every template has at least three sets that can be drawn anywhere.
- **No clashes within a case.** Two places must not share a `short`, a `local` form, or an owner's name, and no set may contain the family name of anybody in the cast. If a draw clashes, draw again. Every generic form a template's sets share (for example, "the ferry") is fine, because a case deals one ferry slip.
- **Slots.** Fill `{street}` and `{avenue}` from `streets.json` for the neighbourhood. Prefer a different street for each place, and never put the same street in both slots of one set. `{V}` is the family name of the person whose own place it is. `{W}` is the family name of the landlady posted there, and it appears only on the landlady's templates (one landlady per case). A slot stands where a full name would stand, so "on {avenue}" reads "on the Bowery".

## 2. In the text

1. **The first mention in a night uses `proper`,** wherever it falls: the office briefing, a client's rundown, an arrival sheet, a recap. After that, `proper` isn't used again that night. A new night starts over, and its first mention gets `proper` again.
2. **People use `local`.** A character in dialogue says "Mancuso's" or "the square", never the proper name and never the template's bare `shortName`. Keep one speaker on one form for the whole night. When there are two forms, the first is the common one.
3. **Narration uses the local form or a pronoun** after the first mention ("it", "the place", "there", "the room"). It never falls back on the old bare `shortName` ("the benches", "the walk-up", "the garage") once a set is drawn.
4. **Epithets are rationed.** Use at most one epithet per page, and only where a sheet has a hole for one (`⟨epithet(place)?⟩`, optional). It follows the local form after a comma: "Kaplan's, that smelled of vanilla syrup and iodine." Don't use an epithet on the first mention, because `proper` does that job, and don't use the same epithet twice in a case. An epithet describes the place and is never a case fact: no times, objects, anchors or people. The check script enforces this.
5. **`sense` feeds callbacks.** When a sheet wants a sense detail about a place already visited ("the smell of pickle brine was still on my coat"), prefer the sense listed first. A sheet that pays off a sound picks a place whose `sense` includes `sound`.
6. **The grid and the rules use `short`,** and `placeTags` makes the two-letter tags from `short`, as it does from `shortName` today.
7. **The parser accepts every form:** `proper`, each `local`, `short`, and the old `shortName`, with or without "the", with the slots filled in.

## 3. The keeping place of a lost item or a pet

A lost item or a pet was taken from where its owner kept it. **That place is always the owner's own: their residence, their workplace, or its yard.** Its name says whose it is.

- If the keeping place is a **residence**, every residence set already carries `{V}`: "Sweeney's walk-up over Lipsky's drugstore on Ninth Avenue".
- If it is a **workplace or a yard**, draw only from that template's `keeping: true` sets, and always draw one: "the back room of Feeney's pawnshop on Rivington Street", "the drying yard behind Hanrahan's laundry on Hester Street", "the alley behind Kessler's delicatessen on Grand Street".
- Keeping sets are never drawn for a place that is not `{V}`'s own in this case.
- These templates have keeping sets: rooftop, back-alley, office-over-tailor, laundry-yard, rooming-house-room, dolans-bar, corner-newsstand, drugstore, tenement-stairwell, pawnshop, chop-suey, barber-shop, hotel-garage. If the owner's workplace isn't one of them, the keeping place is the owner's residence.

## 4. What changes elsewhere when these are wired in

- **Deck text with a literal name.** `content/decks/places.json` names Dolan's, Kaplan's, the Wyckoff, the Bijou, Mancuso's and Pier 46 outright. Those cards need `{place}`, filled with the local form.
- **`{place}` in establish cards** is filled with `proper` on a first visit if it is also the night's first mention, and with the local form otherwise.
- **St. Malachy's.** The church-bells anchor and one transition card name St. Malachy's. When the side chapel draws a different church, the bells still belong to St. Malachy's down the street, so nothing breaks. The engine may retarget the anchor to the chapel's local form if it prefers.
- **Mrs. Teague.** Tests and comments that expect "Mrs. Teague's" should expect `Mrs. {W}'s` filled with the landlady's name.
