# Build: the neighbourhood

*2026-10-11. Phase 4 of the 15% plan. The prose ceiling of cards dealt over a random cast is below the goldens, and ten rounds of polish have shown it. Murdle, Clue and Columbo get their character from a fixed cast; Dashiell gets a fixed neighbourhood: a few blocks of the Lower East Side, about ten places and about twenty-four people, all hand-written, with the puzzle generated over them every night.*

*What it buys: character prose written once and deeply, reused; relationships, grudges and secrets that are true facts rather than dealt cards; places with real geography, so walks and distances mean something; running gags that belong to a place; a neighbourhood the player learns, as they learn Clue's six suspects.*

## 1. The bible, `content/neighbourhood/`

### Places, `places.json` (about ten)

Each place has:

- **name, kind** (home, rooming house, bar, club, restaurant, theatre, work, card room), **street and number**, **hours** (when it's open; a home is always "open" to its residents);
- **minutes on foot to every other place** (one table; symmetric);
- **the watcher,** if any: who, their job, their manner, how they count ("I tear every ticket in half personally"), their one line about what they can and can't see (the stair but not the hall; the room but not the back room);
- **arrivals:** four to six, by hour band and weather, each one paragraph in the voice (what the place is, what it's doing at this hour);
- **details:** six to eight concrete props and habits (the slate with the soup crossed off, the seltzer bottles, the chair with the short leg) for staging and callbacks. **A gag lives at one place only.**
- **what hides here:** the back room, the card table, the fence's booth, which the generator can use for secrets and handovers.

The kinds must cover what the generator needs: at least two watched homes (a rooming house with a landlady; flats over a shop with a janitor), two watched venues (a bar with a barman, a club with a doorkeeper), a theatre with an usher, a restaurant or automat (unwatched or with a head waiter), two workplaces with hours (a dental surgery, a pawnshop or a pharmacy, a newspaper's night desk), a card room, and private flats nobody watches.

### People, `people.json` (about twenty-four)

Each person has:

- **name, age band, job, home** (a place), **works** (a place and hours), **manner** (the engine's manners), **what they'd be found doing** (three or four);
- **looks:** three or four, concrete, one sentence each, by setting;
- **voice:** eight to twelve lines in their own mouth: how they answer the ask, how they deflect, how they say "nobody else", a line for each hour-band ("that's the hour I do the books"), how they refuse, how they own up;
- **ties:** two to four relationships with named others (lodger and landlady, old flame, owes money, in-laws, bowling-league rivals, the coal-bill feud), each with the grudge or warmth written as the person would say it. **Motives are drawn from ties,** never dealt loose;
- **secrets:** one or two (the card game sworn off at Easter, the meeting promised at home never to have), each tied to a place where it happens;
- **as a victim:** one line on why someone might want them dead, one on what they'd be found with. Anyone in the suspect pool may be the victim on a given night.

The watchers are fixed to their places (about eight of the twenty-four). Fences are fixed: one per bar or club, by name. The client pool is everyone who isn't a watcher. Keep the egg-tier shapes: a Hard-boiled night needs five suspects with ties among them and two places the culprit could claim.

## 2. The generator casts a night

- **Pick the scene** (a home or a workplace with a resident or owner as victim or thing-owner), then **three or four places** within sensible walking range, then **the suspects** from people who live, work or drink at those places, so that homes and works are consistent with the places in play.
- **Means with lead time** come from the places' details (the landlady's chloral, the dentist's cabinet, the pawnshop's revolver) and only those.
- **Motives** come from ties between the victim and each suspect; where no tie exists, the generator picks a suspect who has one. **Secrets** come from the person's own list and happen at their place.
- **The fence** is the bar's fixed fence; "where it is now" is written for them.
- **Everything the solver needs stays as it is:** accounts, lists, collisions, access, invariants, the Tatham rating, two broken stories at one hour. The boards change (new names and places); the puzzle rules don't.
- **Continuity:** the profile remembers the last few nights' culprits and victims; the generator avoids the same culprit twice running and the same victim within ten nights.

## 3. Prose draws on the bible first

- Arrivals, looks, staging and the watcher's manner come from the place's and person's own material first; the connective and still decks fill what's left.
- A person's voice lines carry their asks, deflections, refusals and admissions. The hour-by-hour account itself stays engine-written (the facts must be exact), framed by their voice.
- Running gags belong to places and land at most twice a night (docs/47's lint).
- The teach-once page gains a map line: "Same few blocks every night. You'll get to know them."

## 4. Measures

- **Variety:** over 200 nights per tier, distinct casts (sets of suspects) at or above 150; no culprit twice running; every place and every person used within 60 nights.
- **Puzzle:** `board-measure` unchanged or better on every column; the sweep at 100% success, 0 invariant failures, pars in range.
- **Prose:** `board-prose` all zeros, including docs/47's lints; the share of arrival, look and staging text that comes from the bible rather than the decks, reported per tier (target above 70%).
- **Read:** one night per tier in full, plus two nights at Medium with overlapping casts, to check the neighbourhood feels like one place and the same person reads the same across nights.

## 5. Writing the bible

One helper agent writes the first draft of the bible to this spec against `docs/golden/seed3-camp.md`, `docs/golden/board-connective.md` and the four round-3 "keeps" (quoted in `scratchpad/round3-digest.md`): plain words, one joke a beat, every line concrete. The lead reviews every entry, cuts what's flat, and checks that no two people share a first name or a job and that ties are mutual. The designer blesses the bible before it ships as the default; until then it's behind `?world=neighbourhood`, with the dealt cast as the default.

## Done means

- The bible exists and reads in voice; the generator casts from it; all measures hold.
- A "Built" section here, the leftovers in docs/25.
- A PR, not merged, and a short reading list for the designer: three nights to play.

## Built (2026-10-11)

Branch `neighbourhood`. The dealt cast is still the default. The bible is behind `?world=neighbourhood` in the book and `--world neighbourhood` in `read`, `play`, `case`, `board-sweep`, `board-measure` and `board-prose`. Dealt nights come out exactly as main deals them: the boards and every page of the oracle's, the wanderer's and the reader's runs hash the same as main's.

### §1 The loader, `src/gen/board/world/`

- **`load.ts`** parses the two files and checks them. A bible that fails stops with every problem, each naming its entry ("people/doyle: tie to krantz has no tie back"). It checks:
  - ids, places and people that refer to each other, and minutes that are symmetric;
  - mutual ties, with the kind read the bible's way round (`owes` and `owed` are each other's back);
  - unique first names and jobs;
  - that watchers live or work where they watch, and that each gag is at one place only;
  - that every kind of place the generator needs is there (`coverage`): two watched night places, a watched home with a means, a workplace with hours, a watcher and a means, somewhere unwatched or a back room, and private flats with three residents, one of them a man.
- **`types.ts`** reads `hours` the bible's way (`close` before `open` runs past midnight, `null` is a home), and maps the voice's hour lines onto the board's hours.
- **`means.ts`** reads a detail as tonight's means: chloral, laudanum, a revolver, a knife, cyanide or rat poison.
- **The stub bible,** `content/neighbourhood/stub/` (3 places, 8 people), parses but fails `coverage` by design. The test says what it's missing.
- **Fixes to the bible,** all of them clear cases:
  - plain-terms hits: areaway, dry-goods, numbers slips, stevedore, marker, mouthpiece, hack license;
  - machinery words: "rule four", "Ten's the rule", "picks up the beat";
  - six doing lines in the present tense inside the narration's past ("at a man who is talking" is now "was talking").

  The README notes the areaway.

### §2 Casting a night, `cast.ts` and `motives.ts`, with hooks in `generate.ts`

- **The cast fills the generator's own slots** from the bible:
  - the venue (a watched place open all evening);
  - the second place: the workplace whose cabinet holds the means, when its hours fit; otherwise a watched home with a means; on a small case, a second venue or a watched home;
  - the scene: the victim's flat in an unwatched building;
  - somewhere unwatched: the card room, or a back room inside a watched place ("the back booth behind the flour sacks at Sokol's", "the undertaker's cellar, through the coal hole at the Peacock"). It has to be a room you can be at, not a drawer or "behind the velvet curtain";
  - the culprit's flat at Medium and up;
  - the admitter's witness's rooms.
- **Suspects** are people who live, work or drink at those places. Each role's rules on lodging and working are kept, so homes and works agree with the board.
- **Fixed people:** watchers belong to their places. The fence is fixed per venue: Fishel at Sokol's and Miss Marsh at the Peacock; anywhere else, one of the pool's three, always the same one at that place.
- **Means** come only from the places' details.
- **Reasons come from ties,** in this order:
  - the person's own tie to the dead man or the owner, with the bible's line as what they say;
  - a grudge on behalf of somebody they're close to ("Doyle was squeezing Teitel, her in-law, for money Teitel didn't have"). When the one in between is in the case too, it is said without the name ("her in-law");
  - on a small case, a debt of their own to somebody outside the case;
  - on a murder, last, the dead man's hold on them: a secret from their own list, at their own place, never a place in play.
- **Suspects are picked for their ties to the dead man** where the bible has them.
- **The puzzle is untouched:** every invariant, the lead time, the rating and the two broken stories at one hour. The sweep runs the same invariant list on every world night.
- **Continuity,** `model.ts` and `profile.ts`:
  - The profile keeps the last ten culprits and wronged (the dead man or the owner) as `recent`.
  - `dealBoard` steps the seed until the night keeps them. It tries no culprit twice running and no wronged within ten, and then relaxes the wronged a step at a time.
  - The culprit is never relaxed while any seed keeps it. The generator stays a pure function of seed, tier, type and world.
  - The book passes the profile's `recent` when a night is opened fresh.

### §3 Prose from the bible first, `src/game/board/world.ts`

- **The hand takes the bible's lines first,** through a hook in `decks.ts` (`Hand.world`); the decks fill what's left. The bible's lines used:
  - **arrivals,** by band and weather;
  - **details:** props, habits for staging, gags paid off at most twice a night;
  - **watchers:** what they can see and how they count;
  - **looks,** by setting;
  - **doing lines,** only where the person lives or works;
  - **manners;**
  - **voice lines:** the ask, the deflection, the refusal, the owning up, the "nobody else" at the end of a list, and one hour line framing an account (only for an hour the page already tells);
  - **what the dead man was found with.**
- **Accounts stay engine-written.**
- **A back room inside a place** gets the board's words for a room with no name on it, and only those lines of the place's own that are about that room. The bar's stuffed peacock stays in the bar.
- **A person's last line** ("Counting bills with a rubber thumb: that was the last I saw of her") is their own doing line. It is said only where they live or work, and never when the page already said they were doing it.
- **The teach page** has the map line: "Same few blocks every night. You'll get to know them."

### §4 Measures, the neighbourhood against the dealt cast

**The sweep** (200 nights a tier, seeds 1–200). Both casts:

- 200/200 generated at every tier, with 0 invariant failures;
- the same par ranges;
- 0 duplicate reasons, and 0 nights with the culprit and the liar at one place and hour.

Givens matching another seed's word for word: 3 neighbourhood nights, 0 dealt. On the same few blocks that's reported, not failed.

**Variety** (neighbourhood only):

| tier | distinct casts | culprits / wronged used | culprit twice running, by seed | with continuity | wronged within ten (twice running) | places in 60 nights | people in 60 nights |
|---|---|---|---|---|---|---|---|
| Raw | 99 of 200 | 13 / 6 | 25 | 0 | 186 (0) | 7 of 10 | 20 of 24 |
| Coddled | 79 | 13 / 6 | 35 | 0 | 186 (0) | 10 | 22 |
| Poached | 105 | 12 / 6 | 35 | 0 | 184 (0) | 9 | 20 |
| Soft-boiled | 102 | 13 / 6 | 27 | 0 | 178 (0) | 9 | 21 |
| Medium | 107 | 6 / 6 | 55 | 0 | 183 (0) | 10 | 22 |
| Hard-boiled | 115 | 6 / 6 | 67 | 0 | 182 (0) | 8 | 21 |

**The target isn't met: 79–115 distinct casts, against 150.** The cause is the bible's shape, not the casting:

- The Excelsior is its only unwatched building, so it is every night's scene. Its six residents outside the fences are every night's wronged.
- Its three men are the only murder victims.
- At Medium and up the culprit needs an unwatched flat of their own, so the same six are the only culprits.
- Gutman, Wexler and Miss Marsh are rarely cast: two watchers of workplaces and a fence.

What would get there, in the bible:

- a second private building, or two or three unwatched flats over shops, with five or six more residents;
- more ties, now 2–4 a person (3.3 on average), especially among people who don't live at the Excelsior;
- women as victims, which needs "him" taken out of the scene and office cards.

Continuity holds where it can: no culprit twice running, and no wronged twice running. "Within ten" can't be kept with six wronged; the dealer relaxes it and says so.

**`board-measure`** (50 seeds a type, by tier), neighbourhood / dealt:

| tier | wanderer files who right | wanderer solved | refusal shortcut under par | reader, a liar at random | reader, the last liar | innocent liar's story first (same step) | callback pages |
|---|---|---|---|---|---|---|---|
| Raw | 52% / 55% | 3% / 6% | 19 / 19 | 100% / 100% | 100% / 100% | — | 63% / 64% |
| Coddled | 50% / 49% | 8% / 8% | 11 / 19 | 100% / 100% | 100% / 100% | — | 64% / 67% |
| Poached | 39% / 44% | 3% / 3% | 0 / 0 | 34% / 37% | 46% / 39% | 61% (0%) / 57% (0%) | 48% / 68% |
| Soft-boiled | 39% / 37% | 1% / 5% | 0 / 0 | 47% / 46% | 60% / 64% | 59% (0%) / 68% (0%) | 51% / 68% |
| Medium | 27% / 26% | 1% / 0% | 0 / 1 | 41% / 45% | 57% / 60% | 70% (0%) / 74% (0%) | 47% / 69% |
| Hard-boiled | 20% / 16% | 2% / 1% | 0 / 0 | 0% / 0% | 0% / 0% | 59% (28%) / 63% (22%) | 55% / 70% |

- On both casts: the oracle solves 100% at par, the reader files 0% at Poached and up, and lint and plain-terms hits are 0.
- The puzzle columns are within the spread of 50 seeds.
- **Callback pages fell, from 64–70% to 47–64%.** A person's last line is their own doing, and it's now said only where they live or work. Elsewhere the page closes without one, rather than "polishing a trombone nobody will redeem" in the undertaker's cellar. The fix is in the bible: `doing` lines tagged by setting, as looks are, with two or three for anywhere.

**`board-prose`** (30 nights a tier). Reader lint, correspondence, plain terms, cards twice, sentences twice, clues three times, banned phrases, signposts, gags and pets are 0 on both casts. The neighbourhood has three hits:

- two Medium lost-pet list pages name a suspect three times. The fence (Fishel) is a third man in the collision line, so the second mention can't become "he";
- one Soft-boiled page says "the Lyric" three times, in the board's own confirmation ("So the Lyric at nine, with Doyle and the Lyric at eight…").

All three come from engine lines shared with dealt nights. Words a page run about 15% longer than dealt (median 186–220 against 160–180), from the bible's arrivals.

**The share of arrival, look and staging text from the bible:**

| tier | all three | arrivals and looks | staging |
|---|---|---|---|
| Raw | 66% | 75% | 38% |
| Coddled | 69% | 77% | 42% |
| Poached | 61% | 69% | 38% |
| Soft-boiled | 61% | 68% | 43% |
| Medium | 65% | 73% | 42% |
| Hard-boiled | 66% | 73% | 43% |

**That's under the 70% target.** Three reasons:

- Staging carries the board's own sentences around the bible's ("I hadn't come for the furniture. I'd come for Sokol.").
- A back room gets the board's arrival.
- People away from home and work get the board's doing cards.

An earlier cut read 75–78%, with bible lines where they didn't belong: the Peacock's dance floor described in the undertaker's cellar, a pawnshop clerk's doing line in a nightclub. Hide arrivals and setting-tagged doing lines in the bible would close the gap.

### Read

One night per tier in full, plus two Medium nights with overlapping casts and a Poached night with a back room. Every one was solved at par by the oracle's route. The commands are `npm run read -- --seed N --tier T --type X --world neighbourhood --no-choices`.

- **Raw, seed 1, murder:** clean, and the bible's arrivals and voices carry it.
- **Coddled, seed 2, lost pet:** reads well. The Lyric's fence is the generic "Benny the pawnbroker's runner". A doing line in the present tense ("at a man who is talking") is fixed in the bible.
- **Poached, seed 4, murder:** the liar-with-a-witness reads naturally. The back room was "the alley door to the yard" with a gambling-room arrival; doors are no longer hides.
- **Soft-boiled, seed 3, murder:** it holds, but the back room's keeper (Mabry, from ten) gets the board's watcher lines ("ran out of fingers before he ran out of night") for a one-hour list, and a "behind the counter" doing card in a cellar.
- **Medium, seeds 5 and 8, murder:** Mrs. Krantz, Miss Lowenthal and Dr. Hirsch are in both. They read the same across the two nights (looks, voices, manners), and each night breaks on a different walk seen on East Houston Street. Page 2 is the same Excelsior paragraph both nights, and the watchers' standing lines are word for word.
- **Hard-boiled, seed 4, murder (pair):** solid. A prop that repeated the arrival (the wooden wedge in the door, twice on one page) is fixed.
- **Poached, seed 1, murder, with a back room:** found the host's dance floor in the undertaker's cellar, a pawnshop clerk's doing line in it, and a last line repeating the page's first. All three are fixed, with tests.

### Not done

See docs/25, "The neighbourhood". The two that matter for the designer are both in the bible:

- **variety:** more unwatched homes, residents and ties;
- **share and callbacks:** doing lines by setting, and an arrival for each back room.

Both are done in Bible 2, below.

## Bible 2 (2026-10-14)

Branch `bible-2`. The first bible's shape held the game back: one unwatched building, so the Excelsior was every night's scene and its three men every night's dead; one arrival per band, so page 2 repeated; one standing line per watcher; two fences; doing lines only at home or work. This pass deepens the bible, and grows its schema where it had to.

### What the bible has now

- **Eleven places, thirty-three people.** The new place is **the Belvedere**, five floors of cold-water flats over Brodsky's pickle store on Ludlow Street, with no doorman, no janitor and a loop of string for a lock. Its six residents are Mrs. Ostrow (the matchmaker), Miss Kahane (the union organizer), Glick (the insurance agent), Mrs. Pomerantz (the wigmaker), Kaminsky (the prizefighter) and Mrs. Blau (the spiritualist): four women, two men. Mrs. Shapiro moves into the Excelsior, which is now four women and four men.
- **A fence of its own at every night place:** Mrs. Shapiro (the wardrobe mistress) at the Lyric, Tierney (the oyster opener) at Steinmetz's and Margolis (the mechanic) at the card room, with Fishel and Miss Marsh. The card room is never a night's venue, so Margolis stays in the pool.
- **Arrivals:** 86, up from 52. Every place has an `any` arrival for each band, and rain and cold ones: seven or eight in all, and nine at the Excelsior and the Belvedere, three of them early. Three lines of the first bible that named an hour ("In By Ten", "come down at seven") could never be said; they're reworded.
- **Back rooms:** every `hides` entry is `{ name, arrival }`, 33 in all, and every one is a room you can stand in (the hall-stand drawer, the pledge case and the cigarette tray's bottom layer became the back kitchen, the little room behind the cage and the stock room behind the bar). No back room's arrival speaks of the place's watcher, who isn't in the case on a night it's used.
- **Watchers** have three standing lines each (`watcher.counts` is a list): where they sit, what they read people by, what nobody gets past.
- **Doing lines** are `{ setting, text }`, 188 in all, five to seven a person, at least two away from home.
- **Ties:** 194 ends, 5.9 a person (4 to 8), all eleven kinds, and everybody in the pool tied to at least three others in it. The twelve who can be found dead are each tied to five or six others in the pool, so the same three suspects don't follow them.
- **Women are found dead too** (`WOMEN_VICTIMS` in `cast.ts`). The board's 58 cards that said "him" of the dead (the office's setup and questions, the body, the finds, the papers) now name the dead or say it without a pronoun, on dealt nights too. A dead woman's reasons say "her" (`ofVictim` in `motives.ts`), and so do the shelf's words ("Somebody made her cocoa"); her flat is "the Kahane flat", so the office's "his own flat" doesn't fire. The engine's own lines still say "him": docs/25 has the list.

### The loader and the prose

- `load.ts` checks the new shapes and names the entry: a doing line's setting is a place or `any`; a hide is `{ name, arrival }`, its name unique in the place; `counts` is a list.
- `world.ts` (the bible's reader in the book) says a doing line only at its setting: in a building of flats only in their own flat, in a back room only if it's about the room. A back room walks in on its own arrival. A watcher's standing line is one of their three. The share counts hide arrivals, the three standing lines and the doing lines.
- `cast.ts`: the client is a warm tie, then a debt, then a neighbor from the same building; never a feud, and never somebody a suspect's reason runs through ("he had been at war with Kaminsky’s old flame", said by the old flame). The new back rooms have their own reasons for being there (a cellar, a band room, the plaster room).

### Measures, before → after

**The sweep** (200 nights a tier): 200/200 at every tier, 0 invariant failures, the same par ranges, 0 duplicate reasons, 0 nights with the culprit and the liar at one place and hour.

| tier | distinct casts | culprits / wronged used | wronged again within ten | places in 60 nights | people in 60 nights | dead women / men |
|---|---|---|---|---|---|---|
| Raw | 99 → **160** | 13 / 6 → 21 / 12 | 186 → 10 | 7 of 10 → 8 of 11 | 20 of 24 → 27 of 33 | 0 / 91 → 51 / 40 |
| Coddled | 79 → **166** | 13 / 6 → 21 / 12 | 186 → 14 | 10 → 11 | 22 → 29 | 0 / 91 → 46 / 45 |
| Poached | 105 → **178** | 12 / 6 → 20 / 12 | 184 → 21 | 9 → 11 | 20 → 28 | 0 / 91 → 57 / 34 |
| Soft-boiled | 102 → **175** | 13 / 6 → 20 / 12 | 178 → 15 | 9 → 11 | 21 → 29 | 0 / 91 → 51 / 40 |
| Medium | 107 → **180** | 6 / 6 → 12 / 12 | 183 → 12 | 10 → 11 | 22 → 30 | 0 / 91 → 49 / 42 |
| Hard-boiled | 115 → **186** | 6 / 6 → 12 / 12 | 182 → 14 | 8 → 9 | 21 → 29 | 0 / 91 → 50 / 41 |

No culprit twice running, and no wronged twice running, with continuity. The scene is the Excelsior about half the nights and the Belvedere the other half. Over 40 Medium murders, page 2 says eight different arrivals, none more than ten times, and every watcher met says more than one of their three lines.

**Not met: every place and person within 60 nights.** What's missing is the engine's shape, not the bible's:

- Raw has no unwatched place and no workplace, so the card room, the surgery and Wexler's never appear there. Hard-boiled has no workplace murders, so the surgery and Wexler's appear only as back rooms, without their watchers.
- Gutman and Wexler, the workplaces' watchers, are cast only when their workplace is the night's second place (Coddled and Medium murders).
- A fence appears in a small case as who the thing went to, which isn't one of the case's people, and the sweep counts only those. Fishel, Miss Marsh, Mrs. Shapiro and Tierney are counted only on nights they keep a back room.

**`board-prose`** (30 nights a tier), the share of arrival, look and staging text from the bible:

| tier | all three | arrivals and looks | staging |
|---|---|---|---|
| Raw | 66% → **74%** | 75% → 85% | 38% → 40% |
| Coddled | 69% → **75%** | 77% → 85% | 42% → 45% |
| Poached | 61% → **75%** | 69% → 84% | 38% → 48% |
| Soft-boiled | 61% → **75%** | 68% → 85% | 43% → 50% |
| Medium | 65% → **78%** | 73% → 87% | 42% → 52% |
| Hard-boiled | 66% → **77%** | 73% → 85% | 43% → 51% |

Callback pages are 62–68%. Reader lint, correspondence, plain terms, cards twice, clues three times, banned phrases, signposts, gags and pets are 0. Four hits, all from engine lines on these nights' casts, as the first bible's three were:

- a place said three times in a paragraph by the board's confirmation and collision lines ("So Rafferty’s at nine, with Mrs. Pomerantz and Rafferty’s at eight": Medium 16, Soft-boiled 28);
- a name three times on a Medium lost-pet list page (Belkin, with the fence a third man in the collision line: Medium 13);
- a thought said twice in a night ("For nine, the hour that mattered, he said the costume room at the Lyric": Hard-boiled 14).

### Read

- **Medium, seed 2, murder (Miss Kahane, the union organizer, dead in the Belvedere):** the bible's side reads right: her flat, her body, her papers ("a complaint she’d made against him"), her reasons, the cocoa. The engine's own lines still say "him" (docs/25).
- **Medium, seed 10, murder (Belkin, with the costume room under the Lyric as the back room):** the back room's own arrival, Kaminsky's chorus secret owned up in it, and the new standing lines at Steinmetz's. Fixed from it: a client feuding with the dead man and called his "neighbor", and a reason that ran through the client herself.
- **Coddled, seed 9, lost item (Mrs. Blau's spoons):** the Lyric's new fence takes the spoons ("went straight to Shapiro"), and Pinsky stands his new way. Fixed from these: two `any` doing lines that only fit one place ("haggling with a customer" in a card room at six in the morning, "holding a fork up to the light").
