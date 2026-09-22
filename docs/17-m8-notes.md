# M8 — notes

Spec: `docs/17-m8-the-scene.md`. Target: `docs/golden/seed3-night.md`. Branch
`m8-scene`. The eight scene decks ship with placeholder cards; the real ones
are being written on `m8-scene-content` into `content/drafts/scene/`, which
this branch does not touch.

## What was built

| § | Where |
|---|---|
| 1 the planner | `src/game/scene/plan.ts` — `planPage(input) → { shape, beats, memory }`, pure; the `Beat` union and `REQUIRED` per shape. `composePage` hands every scene but the office opening and the parser's nothing-page to `composeScene` (`src/game/scene/index.ts`) |
| 1 realization | `src/game/scene/realize.ts` — every beat rendered from the decks and the engine's templates, into golden-shaped paragraphs |
| 2 errand, carry, answer | move pages keep M6's errand (now with a short form after a bridge, `bridged: yes`); searches and questions get a `carry` line; a question that is a lead's subject with a known relation carries its own reason and drops it; the `answer` beat closes a page no thought has closed |
| 3 the place | `establish` (+ `watch`, the weather as texture, and on the scene the precinct's line and the trope's own given) on the first visit; `return` on a later one; the body at the start room on every murder, first sight and every return |
| 4 the people | presence: everyone in the room, one paragraph each, watcher first; an activity from `activity`, chosen once a visit and stored in `RunState.scene.activities`; first sight names sex, rough age and why they matter; a recall phrase once a visit as something noticed, never an epithet; spoken to, they stop what they are doing |
| 5 the thought | `src/game/scene/thought.ts` — `candidateThoughts`, `thoughtsFor`, `viewOf`: classes derived from the clue facts, kind, source, and the notebook; at most two a page plus the `unmentioned` rider |
| 6 the bridge | `src/game/scene/bridge.ts` — `planBridge`: one a page, spine first; who, subject, tie, where |
| 7 continuity | clue records past-tensed and re-addressed (`pastTense`, `stripHere`, `pageFact`); hour texture filtered at every draw (`impliedSpan`, `hourAgrees`); a clause on every name's first appearance on a page (`introduceNames`); subjectless business given its subject (`subjectify`); the client's goodbye off the walk; no sign-off on a night page at all |
| 8 length | no ceiling below 600 on night pages; `CUT_ORDER` is texture only (similes, ambient, weather); required beats are never cut |
| 9 decks | `content/decks/{establish,watch,return,activity,thought,bridge,carry,answer}.json` (409 placeholder cards), schema entries in `content/deck-schema.json`, loader entries in `src/game/voice/cards.ts`; 36 short-form errand placeholders |
| 10 measurement | `src/game/scene/coverage.ts` (`checkRunCoverage`); `checkBeats` in `src/game/correspond-pages.ts` (rules `thought-untraced`, `bridge-untraced`); `python3 scripts/golden-loop.py --night`; `src/cli/golden.ts` writes each page's shape; `npm run read -- --route "…"` plays a given route |
| 11 tests | `test/m8.test.ts` (34 tests) |

## Numbers

**Tests:** 30 files, 634 tests, all passing (`npm test`). Baseline on `main`
was 29 files, 600 tests. `npm run typecheck` clean; `npm run decks`: 0 errors,
the same 26 empty tag combinations in the older decks as before, and every
new deck's keys covered (thin, at placeholder counts).

**Beat coverage (§10):** 5,292 of 5,292 night pages covered — every required
beat for the shape, no required beat cut (26,053 of 26,053 written), no
epithet, no subjectless fragment, no hour texture against the clock, no name
without its clause, no leak, no sign-off to the client — over seeds 1–40 at
three difficulties with the oracle and the wandering player, and 15 seeds of
each case type forced. **100 percent**, and `test/m8.test.ts` holds it there.

**Correspondence:** zero violations over the same runs, the new thought and
bridge traces included (`checkRun`, and M6's forty-seed test, which now runs
`checkBeats` too).

### The night harness (pages 2–8, seeds 1–40, Precinct, oracle)

Per shape against the night golden; targets and how they were set are in
`docs/golden/GAP.md`. 92 arrivals, 26 searches, 162 questions.

| metric | arrive before | arrive after | search before | search after | ask before | ask after |
|---|---|---|---|---|---|---|
| orphan word ratio | 0.838 | 0.812 | 0.825 | 0.852 | 0.886 | 0.787 |
| paragraph cohesion | 0.683 | 0.668 | 0.725 | 0.578 | 0.558 | 0.781 |
| sentence cohesion | 0.638 | 0.543 | 0.680 | 0.624 | 0.438 | 0.588 |
| short sentences | 0.324 | 0.241 | 0.312 | 0.100 | 0.391 | 0.476 |
| long sentences | 0.067 | 0.003 | 0.043 | 0.021 | 0.023 | 0.006 |
| dialogue share | 0.021 | 0.000 | 0.000 | 0.000 | 0.268 | 0.310 |
| figures a page | 0.543 | 0.043 | 0.577 | 0.000 | 0.525 | 0.043 |
| plain ratio | 0.721 | 0.772 | 0.636 | 0.924 | 0.601 | 0.923 |
| words a paragraph | 31.6 | 29.2 | 40.0 | 23.3 | 22.2 | 14.4 |
| words | 185.6 | 175.8 | 143.1 | 139.5 | 149.9 | 119.6 |
| **distance** | **0.205** | **0.288** | **0.405** | **0.006** | **0.584** | **0.317** |

**Night aggregate: 0.398 → 0.204.**

What is left is what placeholders cost: the arrival's cohesion (the
placeholder establish, watch and activity cards share no nouns with each
other or with the page), the question's short sentences and length (the
golden's page 5 is two-thirds dialogue in short turns; the placeholder thought
cards are single long sentences). Figures fell from half a page to one in
twenty-odd because the night no longer deals similes, transitions or colour.

### The office page

Every office page of the forty seeds is byte-identical before and after
(`cmp` over the rendered pages). Its numbers under the day targets are
unchanged to the last digit: orphan 0.779, paragraph cohesion 0.727, sentence
cohesion 0.634, short 0.446, long 0.033, dialogue 0.327, figures 0.075, plain
0.872, 22.6 words a paragraph; distance **0.009 → 0.009**.

The day loop over pages 1–3 (`golden-loop.py` without `--night`) reads 0.227
against 0.009, all of it short sentences on pages 2 and 3 (0.282 against the
day's 0.36). Those pages are night pages now, which the night golden writes at
0.0–0.2 short, and they are measured by the night harness; the old rhythm pass
that padded them with four-word beats does not run on them.

## The rendered pages beside the golden

Seed 3, the golden's own route: `npm run read -- --seed 3 --route "go the
suite; examine the suite; go the speakeasy; ask Kreuzer about Hanrahan"`. Every
card from the eight new decks is a placeholder, and reads like one. The shape
is the point: which beats, in which order, about what.

### Page 2 · the suite · 12:25 AM

| golden | engine |
|---|---|
| *Kreuzer said they found Sweeney in his suite. I wanted to see the room before anybody tidied it.* | *Kreuzer had named it first. I came to go through it, drawer by drawer.* |
| The residential hotel was brick, six floors of it, the kind of place where the rent is paid by the week and nobody minds who uses the stairs. Sweeney had kept the suite on the fourth floor. The door was shut but not locked. The precinct had taken its statement and gone home. | The cold cut through, and the block had emptied early because of it. Every stoop light was out but the one over the door. Sweeney’s suite at the residential hotel. After midnight it was the same place with fewer people in it. Nobody watched the place. Anybody could have come and gone. The precinct had taken its statement and gone home. |
| Sweeney was still on the floor where he had fallen. The lamp had come down with him. I held my hand near the bulb. It was still warm, and it had not broken. | Sweeney was still on the floor where he had fallen. There was nobody else in the room. The lamp came down with him and the bulb was still warm in its socket, unbroken. The El went over at ten o’clock, running to timetable, and for twenty seconds nothing under the structure could be heard at all. |
| The coroner's man had left a note on the back of an intake form. Between half past nine and eleven. One blow to the back of the skull, and it had not killed him at once. | The coroner’s office had left a note behind, for whoever came next. The coroner put death between half past nine and eleven. One depressed fracture at the back of the skull. Death was not instant. |
| The El ran past the window, close enough to hit with a thrown shoe. A train had gone over at ten o'clock, on time, and for twenty seconds under that structure nobody hears anything at all. | *(in the paragraph above: the scene report carries the El)* |
| Kreuzer had given me two hours. The El might give me the minute. If it happened at ten, it happened under the train, and a whole building could have missed it. | The El going over at ten o’clock fell inside the coroner's hours. If it happened then, the noise covered it. |

Beats: errand · establish (+ weather, watch `none`, precinct) · presence (body) · find c117 · find c118 · thought `window` (anchor: the El, ten o'clock). No bridge — the golden has none, and the room itself is the next lead. No answer: the thought answers the errand.

### Page 3 · the suite · 12:50 AM

| golden | engine |
|---|---|
| *The precinct had looked at Sweeney. I wanted to look at the room.* | *Something had pointed me at the room. I wanted to look at it myself.* |
| I started at the door and worked in. The rug was rucked up under Sweeney in one long fold, the way a rug goes when two people are standing on it and one of them pushes. The chair beside him had gone over backwards. | I went through it from the door inward. The rug was rucked up under Sweeney and the chair beside it went over backwards. Nothing was carried out of the room. |
| A day ledger lay on the desk. There was a nickel-plated revolver in the room as well. I left them both where they were for now. | There was a day ledger in the room, and a nickel-plated revolver. I left them both alone for now. My head was pounding in time with my own footsteps, which wasn't helping. |
| Nothing had been carried out. The drawers were shut and there were no gaps on the shelves. | *(in the find above)* |
| So it was a fight, and it was not a robbery. Whoever came up those stairs came for Sweeney and nothing else. | Nothing was taken. Whoever came for Sweeney came for Sweeney and nothing else. |
| A man in Sweeney's line keeps a secretary, and a secretary knows who has an appointment. His was a woman named Hanrahan. Kreuzer would know where Hanrahan had been tonight, and Kreuzer had told me where she would be. | Hanrahan was Sweeney’s secretary. Kreuzer would know where Hanrahan had been tonight, and Kreuzer was at the speakeasy. |

Beats: errand (carry, `search-room`, lead: yes) · act (the ledger and the revolver named and left) · find t001 · texture (ambient, because the page ran short) · thought `not-robbery` · bridge (tie `victim`: Kreuzer about Hanrahan, Sweeney’s secretary, at the speakeasy).

### Page 4 · the speakeasy · 1:15 AM

| golden | engine |
|---|---|
| *Sweeney's secretary would know who came to the suite. Kreuzer would know where the secretary had been.* | *Kreuzer would know where Hanrahan, Sweeney’s secretary, had been.* |
| The speakeasy was under the hat shop, six steps down and through a door you had to knock on. By day the street knew it as a place to buy a hat. After midnight it was a long room with a low ceiling and a bar down one side, and most of the stools were empty on account of the cold. | The hour had turned to one. The cold had cleared most of the block out early. A last stubborn pair stood outside the speakeasy, not talking. The place was the speakeasy under the hat shop. You went in off the street, through a door that was open late. Callahan, the bartender at the speakeasy, kept watch behind the bar. |
| Callahan was behind the bar, a woman in her forties with her sleeves pushed up, putting clean glasses back on the shelf one at a time. She looked at me once, the way a bartender looks at everybody, and went back to the glasses. | Callahan was behind the bar, putting clean glasses back on the shelf. She was the bartender at the speakeasy, a woman in her forties. |
| Kreuzer was at a table at the back with a cup of coffee she had not touched. The coin was going over her knuckles again. When she saw me she put it away. | Kreuzer was at a table at the back with a cup of coffee going cold. I saw the unlooked-at coin flip again. |
| If anybody had come or gone tonight, Callahan would know it, and Callahan would decide whether I did. I didn't mind that Kreuzer was here. I minded a little that she had picked the one table with a view of the door. | Kreuzer was here. I did not mind that, yet. Callahan watched the room. That made Callahan worth a question. |

Beats: clock (one o'clock) · errand (short: the lead was bridged on page 3) · establish (+ weather, watch `bartender`) · presence (Callahan first sight, watcher first; Kreuzer, recall once this visit) · thought `view` (client) · thought `view` (watcher).

### Page 5 · the speakeasy · 1:40 AM

| golden | engine |
|---|---|
| I sat down across from her. "Sweeney had a secretary. Hanrahan." | Kreuzer put it aside when I sat down. “Sweeney had a secretary. Hanrahan.” |
| "Nora Hanrahan. She's been with him since 'eighteen." | “Nora Hanrahan.” |
| "Where was she tonight?" | “Where was Hanrahan tonight?” |
| "At the walk-up on Ninth. From ten until half past." Kreuzer turned the coin over once on the table. "I saw her there." | “By ten o’clock to half past ten, Hanrahan was settled in at the third floor.” A hat goes round in two hands, brim to brim. |
| I wrote it down. Then I looked at what I'd written. | *(ambient: The ache behind my eyes kept better time than my watch did.)* Down it went. Then I looked at what I had written. |
| If Hanrahan was on Ninth Street at ten, she wasn't in the suite when the El went over. That was good news for Hanrahan. But Kreuzer had seen her there with her own eyes, which put Kreuzer on Ninth Street at ten o'clock too. She had sat at my desk for half an hour and never mentioned it. | If Hanrahan was at the third floor at ten o’clock, then Hanrahan was not at the suite when it happened. Which put Kreuzer at the third floor at ten o’clock too. Kreuzer had sat in my office for half an hour and never mentioned it. |
| I didn't ask her about it. Not yet. A client who leaves things out is still a client, and she was paying. | Schilling was Sweeney’s former employee, and that made Schilling the next question. Hargrove, the doorman at the Wyckoff, was the one to ask. |

Beats: exchange (carried: no carry line) · find c015 · texture (ambient) · thought `clears` (Hanrahan) · thought `observer-placed` (Kreuzer; the truth has her on the third floor at ten) · thought `unmentioned` (via the office) · bridge (c015 opens only c160, a noise lead: Hargrove on Schilling).

## Tag vocabularies and slots, all eight decks

Every deck also takes the common slots (`{detective}`, `{name}`, `{place}`,
`{object}`, `{time}` where the schema lists them) and the common fields
(`motifs`, `weather`, `gender`). A card that names a slot the page has no
value for is never dealt, so every key needs cards without its optional slots.
`any` on an optional tag is a wildcard.

| deck | tags (required first) | slots |
|---|---|---|
| `establish` | `place` (required): `res-apartment`, `res-brownstone`, `res-walkup`, `res-suite`, `res-backhouse`, `rooftop`, `back-alley`, `office-over-tailor`, `pier-shed`, `laundry-yard`, `walkup-flat`, `hallam-vestibule`, `rooming-house-room`, `dolans-bar`, `speakeasy`, `hotel-lobby`, `corner-newsstand`, `automat`, `movie-house`, `dance-hall`, `drugstore`, `cab-stand`, `tenement-stairwell`, `pool-hall`, `pawnshop`, `chop-suey`, `boarding-parlor`, `barber-shop`, `hotel-garage`, `el-platform`, `square-benches`, `ferry-slip`, `subway-kiosk`, `side-chapel`, `union-hall`, `office`. `visit`: `first` (default). | `{place}` short name; `{watcher}` the watcher's surname (absent where unwatched or the watcher is out); `{owner}` the victim's surname on the victim's address (absent elsewhere) |
| `watch` | `watcher` (required): `bartender`, `doorman`, `newsstand`, `counterman`, `ticket-taker`, `elevator-man`, `landlady`, `beat-cop`, `cabbie`, `druggist`, `none` | `{watcher}` surname (never on `none`); `{place}` |
| `return` | `placeKind` (required): `public`, `semi`, `private`, `scene` | `{place}` |
| `activity` | `role` (required): the 27 suspect archetypes (`arch-heir`, `arch-widow`, `arch-broker`, `arch-society`, `arch-blockowner`, `arch-lawyer`, `arch-bookkeeper`, `arch-nurse`, `arch-dentist`, `arch-secretary`, `arch-reporter`, `arch-piano-teacher`, `arch-adjuster`, `arch-chambermaid`, `arch-longshoreman`, `arch-seamstress`, `arch-hackman`, `arch-tailor`, `arch-stagehand`, `arch-switchboard`, `arch-nightman`, `arch-chorus`, `arch-bookmaker`, `arch-heeler`, `arch-pawnman`, `arch-bouncer`, `arch-runner`) and the ten fixture roles; `any` is the engine's fallback. `placeKind` (required): `public`, `semi`, `private` (`any` allowed). `band`: `after-midnight` (12:00–2:59), `small-hours` (3:00–5:59), `dawn` (6:00–8:00), default `any`. | `{name}` surname, opens the card; `{place}` |
| `thought` | `class` (required): `clears`, `implicates`, `observer-placed`, `unmentioned`, `contradicts`, `motive`, `method`, `window`, `not-robbery`, `robbery-shape`, `secret`, `dead-end`, `context`, `nothing`, and the engine's additions `goods`, `last-seen`, `seen-after`, `view`. Optional, default `any`: `case` (`murder`, `robbery`, `missing`); `basis` (`placement`, `access` for implicates; `anchor`, `coroner` for window); `via` (`office`, `account` for unmentioned); `who` (`watcher`, `client`, `known`, `stranger` for view); `lied` (`yes`, `no` for view). | `{subject}`, `{source}`, `{place}`, `{time}` (always spoken: "ten o’clock"), `{victim}`, `{other}`, `{scene}` (the room it happened in). Per class: clears — subject, place, time, other = the scene; implicates — subject, place, time (basis `access`: subject only); observer-placed — source, subject, place, time; unmentioned — source, place, time; contradicts — subject, place, time, other = the place they claimed; motive — subject; method — other = the thing, place; window — `anchor`: other = the anchor as a noun ("the El going over"), time; `coroner`: none; not-robbery — victim, place; robbery-shape, goods — other = the thing, place; secret, dead-end — subject; context — victim; nothing — place; last-seen, seen-after — victim, place, time; view — subject. `{victim}` and `{scene}` are always filled. |
| `bridge` | `tie` (required): `victim`, `place`, `time` | `{who}` the person to ask (absent when the lead is a room); `{subject}`; `{tie}` — `victim`: the relation ("Sweeney’s secretary"), `place`: a short name, `time`: the spoken hour; `{where}` where `{who}` is found (absent when unknown) |
| `carry` | `for` (required): `ask-person`, `ask-thing`, `ask-place`, `ask-evening`, `ask-self`, `search-room`, `search-thing`. `lead` (required): `yes`, `no` | `{who}` the person asked; `{subject}` what about (the thing, for `search-thing`); `{name}` who sent me (absent when a paper or a room did, and on `lead: no`); `{victim}` |
| `answer` | `outcome` (required): `found`, `dead-end`, `something-else` | `{subject}` what the errand was about; `{name}` who sent me (absent when nobody, or a paper, did) |

And one tag added to M6's `errand` deck: `bridged` (`yes`, `no`, default
`any`). `yes` is the short form, dealt when a bridge on an earlier page already
named the lead and said why; 36 placeholders.

The coordinator's note from the content branch is in: `{scene}` is in the
thought deck's slot list and always filled, `{victim}` always filled, `{time}`
always the spoken form, `{place}` on establish cards is the place's short name,
and `{name}` on answer cards is who sent me.

## Deviations, with reasons

1. **The clock line follows the reason.** §1 lists `clock?` first; the errand
   stays the first block because M6's checker traces it as the page's first
   words, and the hour line opens the paragraph after it. On a carry page the
   same order holds for consistency.
2. **The client's goodbye is gone from the walk, not moved.** §7 says it
   belongs to the office page's close, but the office page is written before
   the player chooses to walk out, and its prose is out of scope. So it is
   simply not on the walk. Where she is, is in the notebook's lead list, and a
   bridge's `{where}` says it when it matters. When she leaves after her two
   questions in the office, the line closes that page, which is the office.
3. **No bridge off the scene's free opening when the room is itself a lead.**
   The report and the coroner's note open most of the night's first leads; the
   golden's page 2 bridges none of them and lets the next page's carry line say
   why the room. Everywhere else the rule is §6's: the spine first, else the
   first opened — which on golden page 5 bridges c160, a noise lead, where the
   golden stops on a decision instead.
4. **The answer beat is planned only where no thought closes the page** (§2's
   text), so a search or a question, which always thinks, never carries a
   separate answer; the table's `answer` on those shapes is answered by the
   thought. Arrivals with nobody and nothing get one.
5. **Four thought classes and five tags added.** `goods`, `last-seen` and
   `seen-after` are the robbery and missing classes §5 asks for; `view` is §4's
   detective's view of a person, with `who` and `lied`. `case`, `basis` and
   `via` key what the facts differ on. No spec tag was renamed.
6. **What licenses a thought.** `clears` and `implicates` are judged against
   the notebook's window, never the truth's hour. `observer-placed` needs a
   suspect observer, a placement inside the notebook's window, and the truth
   timeline; fixtures at their own post are not "placed", and it is said once
   per observer, place and half hour. `not-robbery` is licensed by the victim-
   at-the-scene placement the body-at-scene signature carries, since no fact
   kind says "nothing was carried out". A thing gone that is also the means is
   `method` in every case type.
7. **The clause on a name is the relation to the victim** for a suspect,
   whether or not they have been met, because §7 wants a clause on every name
   and §6 already allows the relation as the minimum reason a person is in the
   case; the job for a fixture, the backstory's role for a mention. First
   sight in a presence line uses the job. M6's errand checker now allows the
   victim's name, which the clause brings.
8. **No similes, transitions, colour beats or ride-along dossier lines on night
   pages.** The golden has at most one figure a page and the content cards will
   bring their own; the ride-along layer-2 sentence was where Thorndike came
   from. The notebook still files the layer-2 facts. `CUT_ORDER` keeps the
   simile slot first so it binds if a simile is ever dealt.
9. **The find deck is not used on night pages.** Its cards invent a thing the
   case does not have ("the telegram", "the {object}") or open on "It" with
   nothing for it to be. A room's find is its own record, past-tensed and
   re-addressed; the coroner's note gets a source line from the engine.
10. **Engine templates, not decks, for the lines no §9 deck covers:** the body,
    the robbery's empty place, the missing person's room, the precinct's line,
    the search act and the things left, the stop line, the first-sight line,
    the carried question, the recall line (`src/game/voice-data.ts`). A recall
    phrase is a noun ("the unlooked-at coin flip"), so without new content it
    reads as something noticed — "I saw the unlooked-at coin flip again" — not
    as something she does.
11. **The activity is chosen by the planner without a dealer**, by a hash of
    the seed, the person and the visit, so the planner stays pure and the same
    person is doing the same thing whichever page asks.
12. **The `office` establish key is never reached.** The office is described
    on page one; a walk back to it is a return. The key stays because §9 lists
    it.
13. **A `look` shape** for the free look and a walk to the room you are in:
    the place (or one line) and who is in it.
14. **Old tests of the old page grammar** — the image budget, the transition's
    rotation, the one-sentence presence roll, bound similes, colour beats, the
    motif pairs — are scoped to the pages still assembled that way (the office
    and the parser's pages); their "at least one" guards are relaxed where the
    night no longer deals the thing. Two assertions changed meaning on purpose:
    a find must carry the fact in the past tense with its clauses taken back
    off, and the walk out of the office must *not* carry the client's goodbye.
15. **Word targets.** The harness bands are the golden's (138–207 words), not
    §8's guess (180–350), for the reason GAP.md gives; the realizer uses §8's
    bands to decide when a page is short enough to take texture.

## Seen in passing, not touched

- The utterance deck's spans read badly in the witness's mouth: "By ten
  o’clock to half past ten, Hanrahan was settled in at the third floor." That
  is the utterance cards, not this branch.
- `pastTense` turns the record's present into the past, but a record that
  already uses a simple past ("the chair went over backwards") stays simple
  past where the golden would say "had gone over".
- The office page still says the client's line about where she will be only
  when she leaves after two questions; a player who walks out first never
  hears it on the page.
