# 26 — Deck batches B and C

Writing batches B (places) and C (people and the office), against the targets in [25](25-dealer-notes.md) and the read-through list in [25-read-through-issues](25-read-through-issues.md). Content only: no file under `src/` changed, and no deck outside the eleven below.

## Counts

| deck | before | after | what changed |
| --- | ---: | ---: | --- |
| activity | 307 | 364 | +57 fixture-role cards; 2 trade tasks gated to their room; 3 rewritten |
| watch | 66 | 72 | +6 `watcher=none`; 2 rewritten |
| establish | 144 | 144 | 61 rewritten (below) |
| place-ambient | 245 | 245 | 2 rewritten |
| search-act | 140 | 140 | read through, nothing wrong |
| return | 40 | 40 | 9 rewritten |
| crowd | 129 | 129 | 1 rewritten |
| office | 30 | 44 | +14 openings, two per circumstance; 2 rewritten |
| hiring | 20 | 25 | +5; 6 rewritten, 3 of them because they needed `{dashiell}`; all quotes made curly |
| entrances | 40 | 51 | +11; all quotes made curly |
| portrait-pairs | 120 | 120 | `recallAction` written for the 23 pairs that had none; 7 rewritten |

Every new card is status `generated`. `npm run decks`: 5,005 cards across 39 decks, 0 errors, 0 banned terms. `corpus/tools/overlap.mjs` is clean on every card this pass wrote or rewrote (233 texts, including the recall actions); ten first drafts shared a stock five-word run ("all the way to the", "at the back of the house") and were reworded.

## B. Places

### Activity: six cards for every fixture role, in every room it works

The planner deals a fixture its role's cards for the place kind, then the role-less cards. Seven roles had three cards each, one of them hour-banded, and the beat cop had none and borrowed the role-less ones ("Lindemann was sitting with a drink and not drinking it" — a patrolman on duty). The rule I wrote to: every role has at least six cards that can be dealt in **every** room it is posted to, **in every hour band**. The table is per room, per band (after midnight / small hours / dawn):

| role | rooms | cards per band |
| --- | --- | --- |
| bartender | Dolan's, the speakeasy | 7 / 6 / 6 |
| doorman | the Wyckoff | 6 / 7 / 6 |
| newsstand | the newsstand | 6 / 6 / 7 |
| counterman, public | the Automat (all gated `place: automat`) | 7 / 6 / 6 |
| counterman, semi | Mancuso's, Zelinsky's, the chop suey place, Ruggiero's, the garage | 6–7 each |
| ticket-taker | the Bijou, the Arcadia | 6 / 7 / 6 |
| elevator man | the Hallam | 6 / 6 / 7 |
| landlady, private | the third floor, Mrs. Teague's | 7 / 6 / 6 |
| landlady, semi | the stairwell, the parlour | 6 / 7 / 6 |
| cabbie | the cab stand | 6 / 7 / 6 |
| druggist | Kaplan's | 6 / 6 / 7 |
| beat cop, public | ten public places, indoors and out | 6 / 6 / 6 |
| beat cop, semi | twelve semi places, from Dolan's to the side chapel | 6 / 6 / 6 |

That is 57 cards rather than 22's "about 27", because the landlady and the beat cop work two place kinds, the beat cop starts from nothing, and six in every band needs one more than six in all.

Gating. The read-through found pool-hall cards at the pawnshop; that was fixed in M9 with the `place` tag, and every new counterman card is gated to its one room. Two trade tasks that belong to one room were not:

- act-197, a stagehand "checking the theater's rehearsal schedule", was dealt at the Arcadia: now `place: movie-house`.
- act-217, a night man "going through the register, checking a name against a room number", was dealt at the garage: now `place: hotel-lobby`.

Rewritten because they read wrong where they are dealt:

- act-221: a night man "counting the till twice before locking it" in the Hallam's vestibule, which has no till.
- act-086: a lawyer "reading a will aloud to an empty room", with the detective standing in it.
- act-036: an heir checking a wristwatch "though nobody was expecting {name} anywhere", a fact the card cannot know.

The beat cop's cards read right on the El platform, at the benches and in the side chapel: no door, counter or drink is assumed. None of the new cards names an hour, a sky or a pronoun.

### Watch: six more for unwatched places, and two fixed

The unwatched places include the benches, the El platform, the ferry slip and the roof. "Nobody minded who used the stairs." (wch-061) and "Nobody watched that door, and nobody ever had." (wch-063) were dealt at the benches, which have neither. Both now say it of the place. The six new cards are written to fit every unwatched place.

### Establish: 61 cards that read wrong for their own place

The largest fix of the pass, and none of it was on the targets list. Three faults, all found by filling the cards with the place's real short name:

1. **The short name used as if it were something else.** `{place}` is "the roof", "the back lot", "the Hallam", "Mrs. Teague's", "the Wyckoff", "Zelinsky's". Cards wrote "The roof holding the roof", "The alley making up the alley", "The drying yard making up the drying yard", "The brownstone took up the parlor floor of a brownstone", "The Wyckoff was the lobby of a hotel", "Mrs. Teague's was a back room in a rooming house", "The drugstore with the soda fountain, where Kaplan's was". About thirty cards now name the right thing: "The vestibule at the Hallam", "The back room at Zelinsky's", "The house on the back lot".
2. **The place said to be empty or shut while people are in it.** The Bijou "held nobody at all", the barber shop was "shuttered, the chairs empty, the mirrors dark", the Arcadia's "last couples gone" and its "floor bare", the fountain's stools "sat empty". The watcher is always in a watched room, and the crowd deck may put people there too, so the next paragraph contradicted the first. These now describe the hour without emptying the room ("the band had packed up, and the floor belonged to whoever was left").
3. **Details that break the night.** "The tar underfoot had gone soft with the day's heat" on a cold night; a pawnshop card saying "nobody minded the front of the store, so no one saw who slipped through" in a place the counterman watches; the barber shop with "two chairs" in establish and three in place-ambient; "the chair" in the stairwell that no card had introduced; "over the laundry" on the four cards for his own office, whose trade downstairs varies by case (a tailor's, a printer's, a hat shop).

Three cards that asked for `{watcher}` (est-041, est-052, est-118) were never dealt, because the establish beat does not supply it. They are rewritten without it. est-044 (`{watcher}` and `{owner}` at the walk-up on Ninth, which is never the victim's) and est-031 (`{owner}` at the office over the tailor's) are still unfillable; they are left for whoever decides what `{owner}` means off the victim's address.

### The rest

- **place-ambient.** pam-129 had popcorn in the Bijou's auditorium, and crd-064 and est-110 had a popcorn machine in its lobby. Picture houses did not sell popcorn until the thirties; they now have a candy counter. pam-145 had a ceiling fan turning over the fountain on what may be a cold night.
- **return.** Four cards winked ("{place} was where I had left it", "It still felt like the room where it happened, because it was"). Two asserted a watcher at semi places that may have none (the side chapel, the union hall). One asserted a crowd that had "turned over". All nine now say only that he is back.
- **search-act, crowd.** Read through in full. Nothing else read wrong.

## C. People and the office

### Office: fourteen openings

Two per circumstance, spread across the skies the dealer keys on. Clear is half of all nights and had the fewest cards, so nine of the fourteen are for clear or fog:

| circumstance | added | cards per sky after (clear / fog / cold / rain) |
| --- | --- | --- |
| behind on rent | clear, fog | 3 / 3 / 4 / 3 |
| flush | any, fog | 4 / 4 / 4 / 3 |
| hungover | clear, fog | 3 / 3 / 3 / 3 |
| bruised | clear, rain | 4 / 3 / 4 / 4 |
| off a divorce case | clear, cold | 3 / 4 / 3 / 2 |
| sleepless | cold, rain | 5 / 4 / 5 / 5 |
| just paid | clear, fog | 4 / 4 / 4 / 3 |

None names the trade downstairs, which varies by case. None says "midnight": the page's first line already does, and the arrival sentence after it says "after midnight".

The sky is gated by each card's `weather` field and tag. Its motifs are the props it shows (door, window, lamp, coat, telephone), not the sky: the coherence test measures shared motifs between the office card and the entrance and portrait that follow it, and the first version, with a weather word in each card's motifs, took the synthetic measure from 0.340 to 0.277, under the 0.28 floor. It is 0.319 now, and the real-deck number is 0.421 (0.406 in 25).

Two existing cards rewritten:

- off-023 put "Midnight" three times into three sentences: "Midnight. Two rooms over a Chinese laundry… Midnight came and went… A woman came up the stairs after midnight."
- off-008: "past midnight" becomes "all night", for the same reason.

### Hiring

- **`{dashiell}` is not supplied**, and nothing in the schema says what it would be. hir-010, hir-012 and hir-019 are rewritten without it and are now dealt.
- **Five new cards.** Three need no `{business}` (enigma, plain and yap strangers), for a client described by the three portrait components. Two carry `{business}`.
- **The retainer as speech.** `{retainer}` is "a roll with a rubber band round it" for the underworld. hir-007 had the client say it ("'A roll with a rubber band round it,' she said") and hir-008 had Dashiell name it as his price. Both now put it on the desk.
- **Two more fixed.** hir-005 had the retainer pocketed "before she finished standing up", and the next paragraph has her still in the chair. hir-003 opened a sentence with `{retainer}` straight after a closing quotation mark, which printed "…on it.” a hundred dollars went into my coat". The capitalizer (`STOP_THEN_LOWER` in `prose.ts`) does not look past a closing quote. The card no longer depends on it; the engine gap is listed below.
- **Quotation marks.** The hiring and entrance decks were the only dealt decks with straight quotes, so page one had “curly” speech from the client and "straight" speech in the hiring. Both decks are now curly.

### Entrances

There are eleven new cards. Eight are gender-`any` stranger cards, one for each enigma and yap class key. At rung 0 those keys (temper × class × familiar, per gender) held one card each. Three are class-`any` cards for an acquaintance, in the enigma, yap and plain keys that had none for some classes. None uses a pronoun, and none implies an age.

On ages: `entrances` has no `ageBand` tag and the engine does not gate it by age. I checked every entrance card for an age word; the only one is ent-008's "you old crook", said to Dashiell. The same check over `portraits` and `portrait-pairs` found that every card implying an age already carries the matching band. That is M10's fix: pp-028, "a voice thinned with age", is `old`. Nothing needed changing.

### Portrait pairs: a recall action for all 120

The 23 pairs without a `recallAction` now have one. Each is something the person does with their own body or belongings, so it reads the same at the office desk (where the hiring says it as `{business}`) and on a later page at the El platform. Seven existing actions are rewritten:

- Five assumed furniture a later place may not have. "…pressed {his} fingers flat against the table again" is said at the benches. pp-074 and pp-081 needed a chair, pp-079 a table, and pp-105 and pp-119 a table edge.
- pp-097's action was "The coin was going over {his} knuckles again." It names nobody in a room of three, and it describes a different trick from the pair's own, which flips the coin off a thumb.

All new actions open on `{name}` and use `{his}` only where the possessive reads better. "the white dust in the creases of the knuckles" became "in her knuckles" after the read-through.

**No new pairs.** 22's list suggested four to six for underworld and professional; 25's targets do not call for them. Adding any would also move every temper in every case. `rollTempers` in `cast.ts` replays the old portrait stream to keep tempers fixed, and that stream shuffles the pair deck's matching cards, so a longer deck changes the draws. That is an engine decision, not a writing one.

## Slot needs

| deck | slots the new and rewritten cards use | supplied? |
| --- | --- | --- |
| activity | `{name}` | yes |
| watch | none | — |
| establish | `{place}`, `{owner}` (residences only, as before) | yes; est-031 and est-044 still unfillable, see above |
| return | `{place}` | yes |
| office | none | — |
| hiring | `{fact}`, `{retainer}`, `{name}`, `{them}`, `{pronoun}`, `{business}` | yes. `{business}` is now supplied for every client with a pair. `{dashiell}` is no longer used by any card. |
| entrances | `{name}`; `{detective}` on familiar cards only | yes |
| portrait-pairs `recallAction` | `{name}`, `{his}` | yes |

## Measurements

`npx tsx scripts/deck-exposure.ts --seeds 50 --people 10`: 2,550 nights, 30 readers × 85 nights. **Before** is `origin/main` at d5ac9c9 (PR #39). **After** is this branch. The output is deterministic.

| deck | cards | stale, nights 11–20 | first stale night (median reader) | a card back after (shortest 10% / median nights) | off a wider rung | never read |
| --- | --- | --- | --- | --- | --- | --- |
| office | 30 → 44 | 29% → **10%** | 13 → **20** | 4 / 18 → 7 / 26 | 0% → 0% | 0 → 0 |
| entrances | 40 → 51 | 31% → **15%** | 9 → 13 | 2 / 14 → 4 / 21 | 3.6% → **0%** | 0 → 0 |
| hiring | 20 → 25 | 66% → **32%** | 7 → **15** | 2 / 9 → 5 / 15 | 16.2% → **0%** | 3 → 0 |
| portrait-pairs | 120 | 23% → 22% | 10 → 10 | 5 / 18 → 5 / 18 | — | 16 → **0** |
| watch | 66 → 72 | 54% → 49% | 6 → **11** | 3 / 9 → 5 / 13 | 0% | 6 → 6 |
| activity | 307 → 364 | 68% → 59% | 2 → 2 | 1 / 5 → 1 / 5 | — | 155 → 155 |
| establish | 144 | 7.6% → 5.5% | 14 → 19 | 7 / 25 → 8 / 26 | 0% | 17 → 14 |
| place-ambient, search-act, return, crowd | unchanged counts | unchanged | unchanged | unchanged | unchanged | 59 → 58 (place-ambient) |

- **Hiring.** No hiring falls off its asked rung now. The `{business}` and `{dashiell}` rows are gone from the slot table. Before, they skipped 2.12 and 0.66 cards a night.
- **Activity.** Every fixture key now has seven cards. Their stale share over nights 11–20 fell:
  - bartender 83% → 64%
  - ticket-taker 75% → 38%
  - druggist 55% → 24%
  - newsstand 59% → 13%
  - beat cop (public) 83% → 15%
  - beat cop (semi) 100% → 0%

  The deck's own first stale night stays at 2, because the suspects' archetype keys (three cards each) are read by every reader and were not on this batch's list. The 155 never read are almost all `at: work` cards for archetypes with no workplace (heir, widow, society) or whose workplace is of another kind. That is by M9's design.
- **Portrait pairs.** The 16 pairs never read before were pairs without a recall action. Those were never chosen for a person who had to be recalled.
- **Targets left in B and C.** Recomputed by the script after this pass, B asks for 0 cards. C asks for 1, `utterances` `factKind=personAt register=truth`, which was not in this batch.

## Checks

- `npm run decks`: 5,005 cards, 0 errors, 0 banned terms.
- `npx vitest run`: 44 files, 840 tests, all passing. `npx tsc --noEmit` is clean.
- The coherence floor test failed once during the pass, on the first motif lists for the new office cards (above). It passes now.
- Overlap is clean on everything written or rewritten.
- Read-throughs: `npm run read -- --seed N --tier T --no-choices` for 1/0, 5/3 and 7/5, before and after, read as a player. I also read the office pages of seventeen more seeds at tier 2. Fixed from them: hir-003's lower-case retainer, off-023's three midnights, the pronoun-less recall "in the creases of the knuckles", and off-035 and off-043. The page joins short office sentences with "and", and those two built a chain of three: "…paid in full, and for once I owed nobody, and the night outside the window was clear and still, and I sat…". They are rewritten so the join cannot pile up.

## For the engine (not changed here)

- `STOP_THEN_LOWER` (`src/game/voice/prose.ts`) does not capitalize a slot that opens a sentence after a closing quotation mark: `.” a hundred dollars`. hir-003 no longer triggers it, but any card with `”` followed by a lower-case slot will.
- The rhythm pass printed "Neither of us spoke. Nothing moved." on the office page (seed 7, tier 5), two beats for one pause.
- "Now the face was across the room from me." is said on the El platform (seed 5, tier 3, page 7).
- `{owner}` off the victim's own address (est-031, est-044) and `{watcher}` on establish (est-044) are still never supplied.
- New portrait pairs would move tempers through `rollTempers`' replay (above).
