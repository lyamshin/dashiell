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
