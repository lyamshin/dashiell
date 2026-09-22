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


## Review fixes (PR #25, part A)

From the coordinator's read of seed 3 pages 2–5.

1. **A watcher is introduced once.** A watcher in the room is never in the
   place's paragraph: the `watch` clause is dealt as the watcher's arrival
   thought (the `view` of a watcher), and the first-sight line gives the job
   without the post ("She was the bartender, a woman in her forties"). The
   `watch` deck's `none` cards stay in the place's paragraph. Establish cards
   are dealt with no `{watcher}` value, so a card that names the watcher is
   not dealt (see part B for what that did to the drafts).
2. **Recall is something the person does.** `portrait-pairs` gains
   `recallAction` (schema documented), written for 97 of the 120 pairs — every
   one whose detail is a habit or a gesture ("The coin was going over {his}
   knuckles again."). The 23 whose detail is only a thing about them (the
   resoled shoes, the twice-broken nose) have none, and are not recalled. The
   planner recalls only people whose pair has an action, once a visit.
3. **Spans are spoken.** `spokenSpan` says a run of half hours "from ten until
   half past", "from half past nine until ten"; a record's "from ten o'clock
   to half past ten" in a quote is turned the same way, and "some time after
   ten o'clock to half past ten" becomes a between. An utterance gets a span
   only if its `{time}` stands free (`takesSpan`: at the head of the card or
   after punctuation, and followed by punctuation); "By {time}", "around
   {time}", "{time} on" take one hour. A test fills every utterance with a
   point and, where it can take one, a span, and reads every exchange over
   forty seeds at three difficulties for a span hung off a one-hour
   preposition.
4. **No dealt business on night pages.** The only gesture in an answer is the
   person's own recall action, when it has not been spent this visit; else
   nothing. The business deck is not dealt on a planned page at all (tested).
5. **No "Which…" fragments.** An observer-placed thought that opens on
   "Which" joins the sentence before it, or gets its own subject ("Kreuzer
   had seen it, which…"); `isSubjectless` now counts a non-question "Which…"
   sentence as a fragment, so the coverage check holds it.
6. **The note line** is the golden's family: "I wrote it down.", "I wrote
   that down.", "I put it in the notebook.", …, then "Then I looked at what
   I'd written." and its variants.
7. **Local place names in speech.** `spokenPlace` derives the name the block
   uses from the place's full name where it carries a street — "the
   third-floor walk-up on Ninth" is "the walk-up on Ninth" in a witness's
   mouth; "the garage on Eleventh Avenue" stays whole — and leaves every other
   place its short name. Narration keeps the short name the notebook and the
   buttons use.

Also: texture is now cut to keep M5's plain floor as well as to get under the
ceiling (a place card and the weather together can outweigh a short page), and
a night page's word floor in the old page-grammar test is 30 (§8 gives night
pages targets, not a floor; the night harness measures length).

## Integration (part B)

`m8-scene-content` (PR #24) merged into `m8-scene`. The drafts are now
`content/decks/{establish,watch,return,activity,thought,bridge,carry,answer}.json`,
replacing the placeholders; `content/drafts/scene/` is gone, its README kept
as `docs/17-m8-content-notes.md`, and `scripts/check-scene-drafts.mjs` removed
because `npm run decks` now validates the same decks against their schema
entries.

### Numbers, with the real cards

- **Tests:** 30 files, 641 passing.
- **Decks:** `npm run decks` — 3,291 cards across 28 decks, 0 errors, the same
  26 empty tag combinations (all in the older decks). Every scene deck's key
  covered.
- **Overlap:** `node corpus/tools/overlap.mjs` over the nine touched decks —
  clean (five of my own new cards reworded to get there).
- **Beat coverage:** 5,292 of 5,292 night pages; 26,053 of 26,053 required
  beats written. No deck fallback (`no-card` gap) anywhere over the sweep, and
  no activity fallback (2,284 activities chosen).
- **Correspondence:** zero violations, thoughts and bridges traced.

**Night harness** (pages 2–8, seeds 1–40, Precinct, oracle):

| shape | before M8 | placeholders | after part A | real cards |
|---|---|---|---|---|
| arrive | 0.205 | 0.288 | 0.431 | 0.360 |
| search | 0.405 | 0.006 | 0.006 | 0.000 |
| ask | 0.584 | 0.317 | 0.352 | 0.388 |
| **night aggregate** | **0.398** | **0.204** | **0.263** | **0.250** |

With the real cards the search page meets every target. The arrival misses
on paragraph and sentence cohesion (0.587 and 0.556 against 0.775 and 0.63):
the presence paragraph opens on a name the place's paragraph never used, now
that the watcher is not named there — golden page 4 bridges the same gap with
the word "bar". The question misses on short sentences (0.481 against 0.584),
length (114 words against 130) and words a paragraph (13.7 against 14.7): the
golden's page 5 is two-thirds dialogue in short turns and carries a dossier
line ("She's been with him since 'eighteen.") the engine is not licensed to
volunteer.

**Office page:** every office page byte-identical to `main`; day-target
distance 0.009. The day loop over pages 1–3 reads 0.299 (short sentences on
the two night pages it includes, as before, and orphan words 0.826 against
0.82).

### Seed 3, pages 2–5, with the real cards

```
the suite                                             12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

Kreuzer had named it first. I came to go through it, drawer by drawer.

The cold cut through, and the block had emptied early because of it. Every
stoop light was out but the one over the door. The hotel holding the suite
was six floors of brick, plain outside and plainer in. A house phone sat on
a table by the stairs, unanswered at this hour. The building had the
particular quiet of a place where everybody paying by the week had learned
to keep to themselves. There was no one to notice who passed through. The
precinct had taken its statement and gone home.

Sweeney lay where he had fallen. Nobody had covered him yet. There was
nobody else in the room. The lamp came down with him and the bulb was still
warm in its socket, unbroken. The El went over at ten o’clock, running to
timetable, and for twenty seconds nothing under the structure could be heard
at all.

The coroner’s man had left a note on the back of an intake form. The coroner
put death between half past nine and eleven. One depressed fracture at the
back of the skull. Death was not instant.

That put a number on it: ten o’clock, and nothing vaguer.

[1 action, 2 written down, 211 words]

the suite                                             12:50 AM   page 3
────────────────────────────────────────────────────────────────────────────

The last thing I had turned up pointed here. I went through the room.

I took the room one wall at a time. The rug was rucked up under Sweeney and
the chair beside it went over backwards. Nothing was carried out of the
room.

There was a day ledger in the room, and a nickel-plated revolver. I left
them both alone for now. I could have used a glass of water two hours ago.

Nothing had been carried out. It was not a robbery.

I had not known Hanrahan was Sweeney’s secretary. Kreuzer would, and I meant
to ask.

[1 action, 1 written down, 100 words]

the speakeasy                                         1:15 AM   page 4
────────────────────────────────────────────────────────────────────────────

Kreuzer would know about Hanrahan, Sweeney’s secretary.

The hour had turned to one. The cold had cleared most of the block out
early. A last stubborn pair stood outside the speakeasy, not talking. The
speakeasy was a long room with a low ceiling, a bar down one side and a
scatter of tables along the other. This late the crowd had thinned to
whoever had nowhere better to be.

Callahan was rinsing glasses in a basin, setting them out to dry. She was
the bartender, a woman in her forties.

Kreuzer was going through a tray of tickets, sorting them by date. The coin
was going over her knuckles again.

Kreuzer was the client. Clients kept their own hours, and I let them.
Callahan kept half an eye on the glasses and half on the door.

[1 action, 136 words]

the speakeasy                                         1:40 AM   page 5
────────────────────────────────────────────────────────────────────────────

Kreuzer put it aside when I sat down. “Sweeney had a secretary. Hanrahan.”

“Nora Hanrahan.”

“Where was Hanrahan tonight?”

“Hanrahan, the walk-up on Ninth, from ten until half past. Gone before the
next round.”

The landlady's note was still folded in my coat, unread twice already.

I got it down on paper. Then I read it back.

At ten o’clock, Hanrahan was at the third floor — and if so, not at the
suite, where it happened. That was not only what Kreuzer said about
Hanrahan. It put Kreuzer at the third floor at ten o’clock too. It was the
kind of thing a person says first, if they mean to say it at all. Kreuzer
had not.

That Schilling was Sweeney’s former employee changed things. Hargrove, the
doorman at the Wyckoff, would know the rest of it.

[1 action, 1 written down, 138 words]
```

### What the drafts needed

Every change is below. In short: 37 establish cards lost the sentence that
named the watcher (4 more, where that sentence also names the place, are kept
as written and are not dealt tonight); 15 time-tie bridges were rewritten and
3 victim-tie bridges re-ordered, because the engine's `{tie}` is an hour for
`time` and the relation can be a predicate ("named in Lathrop's will"); 3
thought cards fixed (a doubled subject, an unlicensed lie, the word
"disqualifier"); implicates, window and unmentioned tagged with `basis` and
`via`. Added in the same voice: 55 thought cards (window by the coroner's
hours alone, goods, last-seen, seen-after, view), 18 carry cards for a lead a
paper or a room opened, 9 answer cards with neither slot, 6 `any` activities,
4 `lead: search` bridges, and the errand's 72 short-form cards. Nothing was
dropped.

```
establish est-041: kept as written, and unreachable while its watcher is in the room (always, tonight): the sentence naming {watcher} also names {place}, or nothing is left without it: "{place} was up two flights from a street door {watcher} kept a closer eye on than most tenants realized. The stairs were bare, the banister loose in two places. At this hour most of the building was dark, save for a single lit window two flights up."
establish est-044: kept as written, and unreachable while its watcher is in the room (always, tonight): the sentence naming {watcher} also names {place}, or nothing is left without it: "The walk-up holding {place} was owned by {owner}, six units over a street-level door with a mail slot for each. {watcher} had the ground-floor rooms and heard most of what happened on the stairs. At this hour, though, even {watcher} had usually gone to bed."
establish est-045: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was the entry hall of the building, marble underfoot and a bank of brass mailboxes along one wall. {watcher} ran the elevator from a stool just past the door. At this hour the lobby was empty but for whoever was waiting on the car." -> "{place} was the entry hall of the building, marble underfoot and a bank of brass mailboxes along one wall. At this hour the lobby was empty but for whoever was waiting on the car."
establish est-048: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "The vestibule holding {place} kept a night bell for callers after the desk had closed. {watcher} answered it from the elevator, whatever floor the car happened to be on. At this hour the bell rang rarely, and everyone in the building knew it when it did." -> "The vestibule holding {place} kept a night bell for callers after the desk had closed. At this hour the bell rang rarely, and everyone in the building knew it when it did."
establish est-049: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a back room in a rooming house, reached down a hall that ran past four other doors just like it. {watcher} had the ground-floor rooms and heard the stairs better than any tenant liked. At this hour the house had gone still, every door shut for the night." -> "{place} was a back room in a rooming house, reached down a hall that ran past four other doors just like it. At this hour the house had gone still, every door shut for the night."
establish est-052: kept as written, and unreachable while its watcher is in the room (always, tonight): the sentence naming {watcher} also names {place}, or nothing is left without it: "The rooming house holding {place} took in boarders one to a door, meals included at set hours. {watcher} had run it for years, and knew every tenant's habits better than they knew them themselves. At this hour, though, even {watcher} had turned in."
establish est-053: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} kept a plain front, no sign past a painted name over the door. {watcher} worked the bar most nights it was open. At this hour the stools were mostly empty, the regulars gone home or gone quiet." -> "{place} kept a plain front, no sign past a painted name over the door. At this hour the stools were mostly empty, the regulars gone home or gone quiet."
establish est-055: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was the kind of bar a block kept for itself, known by name to everyone who drank there and by nobody past it. {watcher} minded the register and most everything else. This late the radio behind the bar was the loudest thing in the room." -> "{place} was the kind of bar a block kept for itself, known by name to everyone who drank there and by nobody past it. This late the radio behind the bar was the loudest thing in the room."
establish est-057: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} sat under a hat shop, down six steps and through a door you had to knock on. {watcher} worked the bar and decided who got past that door. At this hour most of the stools were empty." -> "{place} sat under a hat shop, down six steps and through a door you had to knock on. At this hour most of the stools were empty."
establish est-059: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a long room with a low ceiling, a bar down one side and a scatter of tables along the other. {watcher} kept the glasses moving and the door watched, both at once. This late the crowd had thinned to whoever had nowhere better to be." -> "{place} was a long room with a low ceiling, a bar down one side and a scatter of tables along the other. This late the crowd had thinned to whoever had nowhere better to be."
establish est-061: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} ran the width of the building, red carpet worn thin down the middle where every pair of feet crossed to the elevator. {watcher} stood by the door and watched who came through it. At this hour the lobby had emptied to a few chairs nobody was sitting in." -> "{place} ran the width of the building, red carpet worn thin down the middle where every pair of feet crossed to the elevator. At this hour the lobby had emptied to a few chairs nobody was sitting in."
establish est-063: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was the lobby of a hotel, marble floor, brass fittings polished by somebody's nightly round. {watcher} had the door and the sidewalk both, and missed little of either. This late the chairs by the window sat empty, cushions still holding the shape of whoever had last used them." -> "{place} was the lobby of a hotel, marble floor, brass fittings polished by somebody's nightly round. This late the chairs by the window sat empty, cushions still holding the shape of whoever had last used them."
establish est-065: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} ran up the middle of the building, bare bulbs on alternating landings, the rest left dark to save the current. {watcher} had the ground-floor rooms and heard most of what went up and down. At this hour the building had settled into the particular quiet of people sleeping four to a room." -> "{place} ran up the middle of the building, bare bulbs on alternating landings, the rest left dark to save the current. At this hour the building had settled into the particular quiet of people sleeping four to a room."
establish est-067: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} smelled of a dozen different dinners layered over each other, the way a stairwell did in a building with no other place to cook. {watcher} kept a chair near the bottom and used it more than tenants liked to think about. This late the chair sat empty, though rarely for long." -> "{place} smelled of a dozen different dinners layered over each other, the way a stairwell did in a building with no other place to cook. This late the chair sat empty, though rarely for long."
establish est-069: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} sat below street level, down a short flight from a door with no window in it. {watcher} racked cues and ran the register from behind a low counter. At this hour half the tables were covered, the balls put away for the night." -> "{place} sat below street level, down a short flight from a door with no window in it. At this hour half the tables were covered, the balls put away for the night."
establish est-071: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a room of tables and cues and a radio nobody ever turned all the way off. {watcher} minded the counter and most of what happened around it. This late the crowd had thinned to the ones with nowhere better to be." -> "{place} was a room of tables and cues and a radio nobody ever turned all the way off. This late the crowd had thinned to the ones with nowhere better to be."
establish est-073: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was the room behind a pawnshop's counter, reached past the counter itself and a curtain that didn't quite close. {watcher} minded the shop and the room both, most nights. At this hour the front of the store was shuttered, the window grille down." -> "{place} was the room behind a pawnshop's counter, reached past the counter itself and a curtain that didn't quite close. At this hour the front of the store was shuttered, the window grille down."
establish est-075: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} sat behind a pawnshop, a small room crowded with what hadn't sold and what hadn't been decided about yet. {watcher} kept the books in there as much as at the counter. This late the shop's grille was down and the street outside it was as quiet as the room." -> "{place} sat behind a pawnshop, a small room crowded with what hadn't sold and what hadn't been decided about yet. This late the shop's grille was down and the street outside it was as quiet as the room."
establish est-077: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} sat over a laundry, reached by a stair along the building's side wall, a paper lantern hung at the bottom of it. {watcher} ran the counter and most everything past it. At this hour the tables were down to the last few customers who hadn't left yet." -> "{place} sat over a laundry, reached by a stair along the building's side wall, a paper lantern hung at the bottom of it. At this hour the tables were down to the last few customers who hadn't left yet."
establish est-079: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a long room over a laundry, tables close together, a counter along the back wall. {watcher} watched the room from behind that counter, missing little. This late the kitchen noise had died down to almost nothing." -> "{place} was a long room over a laundry, tables close together, a counter along the back wall. This late the kitchen noise had died down to almost nothing."
establish est-081: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} sat just off the front hall, the room where a boarding house's tenants were meant to receive callers, and mostly didn't. {watcher} kept an eye on it from the hall table. At this hour it was empty, the furniture in it arranged for a use nobody was making of it that night." -> "{place} sat just off the front hall, the room where a boarding house's tenants were meant to receive callers, and mostly didn't. At this hour it was empty, the furniture in it arranged for a use nobody was making of it that night."
establish est-083: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was kept formal, the way a landlady kept the one room in the house meant to be seen by outsiders. {watcher} used it for accounts as much as for company. This late the room's own lamp was usually the only one lit downstairs." -> "{place} was kept formal, the way a landlady kept the one room in the house meant to be seen by outsiders. This late the room's own lamp was usually the only one lit downstairs."
establish est-085: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was shuttered at this hour, the chairs empty, the mirrors dark. {watcher} kept a key and sometimes a reason to be there after closing. You got in through the same door as by day, if you had a key or knew whom to ask." -> "{place} was shuttered at this hour, the chairs empty, the mirrors dark. You got in through the same door as by day, if you had a key or knew whom to ask."
establish est-087: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} kept two chairs and a bench for waiting, a calendar from a barber's supply house tacked up behind the register. {watcher} ran the shop by day and sometimes kept later hours than the sign said. This late the shop was usually closed, its grille down over the window." -> "{place} kept two chairs and a bench for waiting, a calendar from a barber's supply house tacked up behind the register. This late the shop was usually closed, its grille down over the window."
establish est-089: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a wide bay, cars nosed in along both walls, oil-stained concrete underfoot. {watcher} minded the pumps and the register from a little office at the front. At this hour most of the cars sat idle, covers pulled over the ones that wouldn't be needed before morning." -> "{place} was a wide bay, cars nosed in along both walls, oil-stained concrete underfoot. At this hour most of the cars sat idle, covers pulled over the ones that wouldn't be needed before morning."
establish est-091: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} served the hotel's guests and a few others besides, a garage big enough for a dozen cars and loud with machinery by day. {watcher} kept the night shift, mostly alone. This late the bay was quiet but for a radio somewhere in the back." -> "{place} served the hotel's guests and a few others besides, a garage big enough for a dozen cars and loud with machinery by day. This late the bay was quiet but for a radio somewhere in the back."
establish est-101: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} sat on the corner, a wood stand with a corrugated roof and papers weighted down against the wind. {watcher} kept it open later than most businesses on the block. At this hour there was little foot traffic to sell to." -> "{place} sat on the corner, a wood stand with a corrugated roof and papers weighted down against the wind. At this hour there was little foot traffic to sell to."
establish est-103: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} had held that corner since before most of the buildings near it went up, one of the fixtures a neighborhood collects without meaning to. {watcher} ran it alone at this hour, the morning papers not due for hours yet. It was quiet enough to hear the presses two blocks off, if the wind was right." -> "{place} had held that corner since before most of the buildings near it went up, one of the fixtures a neighborhood collects without meaning to. It was quiet enough to hear the presses two blocks off, if the wind was right."
establish est-104: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "The stand at the corner, where {place} was, kept a small shelf of magazines under glass, the rest of the stock left open to the weather. {watcher} had seen every kind of customer the block produced. This late there was hardly a customer to be seen." -> "The stand at the corner, where {place} was, kept a small shelf of magazines under glass, the rest of the stock left open to the weather. This late there was hardly a customer to be seen."
establish est-105: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} kept its lights on all night, a wall of little glass doors and a slot for a nickel behind each one. {watcher} refilled the compartments from somewhere behind the wall, out of sight. At this hour half the tables sat empty, napkin holders lined up straight." -> "{place} kept its lights on all night, a wall of little glass doors and a slot for a nickel behind each one. At this hour half the tables sat empty, napkin holders lined up straight."
establish est-107: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} ran the length of a storefront, mirrors on the walls doubling a room that was already more empty than full at this hour. {watcher} worked behind the machinery, keeping the little doors stocked. This late it drew the kind of customer who had nowhere better to sit." -> "{place} ran the length of a storefront, mirrors on the walls doubling a room that was already more empty than full at this hour. This late it drew the kind of customer who had nowhere better to sit."
establish est-109: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} had a marquee dark at this hour, the last show having let out hours before. {watcher} had gone home with everyone else, the doors locked behind them. You'd have needed a reason and a key to get inside past this point." -> "{place} had a marquee dark at this hour, the last show having let out hours before. You'd have needed a reason and a key to get inside past this point."
establish est-111: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a picture house with a lobby of red carpet gone thin down the aisle where the crowds walked in twice a day. {watcher} worked the door through the evening shows and locked up after the last one. This late the building held nobody at all, unless somebody had reason to be inside it." -> "{place} was a picture house with a lobby of red carpet gone thin down the aisle where the crowds walked in twice a day. This late the building held nobody at all, unless somebody had reason to be inside it."
establish est-113: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} kept a band going most nights until the crowd thinned enough to send home. {watcher} worked the door and knew the regulars from the strangers at a glance. At this hour the music had usually stopped, the floor swept, the last couples gone." -> "{place} kept a band going most nights until the crowd thinned enough to send home. At this hour the music had usually stopped, the floor swept, the last couples gone."
establish est-115: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a hall built for a band and a crowd and not much else. {watcher} had the door through the last dance and stayed to lock up after. This late the chairs were stacked, the floor bare, the whole place smelling faintly of cigarettes and floor wax." -> "{place} was a hall built for a band and a crowd and not much else. This late the chairs were stacked, the floor bare, the whole place smelling faintly of cigarettes and floor wax."
establish est-117: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} kept a soda fountain running most of the day and a light on well past it. {watcher} minded the counter alone at this hour, the fountain's stools mostly empty. You could get in through the front, the only door the shop had." -> "{place} kept a soda fountain running most of the day and a light on well past it. You could get in through the front, the only door the shop had."
establish est-118: kept as written, and unreachable while its watcher is in the room (always, tonight): the sentence naming {watcher} also names {place}, or nothing is left without it: "You reached {place} through a door with a bell that announced every customer whether {watcher} was looking up or not. Shelves of bottles ran behind the counter, labeled in handwriting that hadn't changed in years. Past midnight there was little trade beyond whoever needed something and couldn't wait for morning."
establish est-119: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} was a drugstore with a soda fountain, one of the few storefronts on the block still lit at this hour. {watcher} kept the register and the prescriptions and most of what happened at the counter besides. This late the stools at the fountain sat empty, a rag folded over the nearest one." -> "{place} was a drugstore with a soda fountain, one of the few storefronts on the block still lit at this hour. This late the stools at the fountain sat empty, a rag folded over the nearest one."
establish est-120: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "The drugstore with the soda fountain, where {place} was, ran a single bulb over the register, the rest of the shop left half dark to save the current. At this hour it drew the kind of customer with a headache or nowhere else open. {watcher} had seen most of them before." -> "The drugstore with the soda fountain, where {place} was, ran a single bulb over the register, the rest of the shop left half dark to save the current. At this hour it drew the kind of customer with a headache or nowhere else open."
establish est-121: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} sat outside a theater, a line painted on the curb where the cabs were meant to wait their turn. {watcher} worked the stand most nights, first in line when a fare came out. At this hour there were more cabs waiting than fares to fill them." -> "{place} sat outside a theater, a line painted on the curb where the cabs were meant to wait their turn. At this hour there were more cabs waiting than fares to fill them."
establish est-123: took out the sentence naming {watcher} (a watcher in the room is introduced once, by the presence line and the arrival thought): "{place} served a theater's crowds by evening and whoever else needed a cab the rest of the time. {watcher} had the stand and the patience that came with it. This late the wait for a fare ran longer than the ride usually did." -> "{place} served a theater's crowds by evening and whoever else needed a cab the rest of the time. This late the wait for a fare ran longer than the ride usually did."
answer: added ans-n01..n09, three an outcome with neither slot: an errand a paper or a room sent me on, to a room, has no {name} and no {subject} (15 fallbacks over the sweep before these).
activity: added act-a01..a06, role `any`, the engine’s fallback for a person with no card of their own (a beat-cop, or a pruned cell).
carry: added cry-n01..n18, `lead: yes` without {name}, for a lead a paper or a room opened (every `lead: yes` draft names who sent me, and a place clue has nobody; golden page 3’s carry is this case).
bridge brg-003: opened on {tie} as a noun, and a relation is often a predicate ("named in Lathrop’s will", "engaged to Ashby’s daughter"), which left the sentence without a subject: "{tie} — that alone was worth a question, and {who} was who to ask." -> "{subject}, {tie} — that alone was worth a question, and {who} was who to ask."
bridge brg-009: opened on {tie} as a noun, and a relation is often a predicate ("named in Lathrop’s will", "engaged to Ashby’s daughter"), which left the sentence without a subject: "{tie}. I had not heard that before. {who} would know more, and {who} was at {where}." -> "{subject} was {tie}. I had not heard that before. {who} would know more, and {who} was at {where}."
bridge brg-015: opened on {tie} as a noun, and a relation is often a predicate ("named in Lathrop’s will", "engaged to Ashby’s daughter"), which left the sentence without a subject: "{tie} was the kind of thing that opened a case up. {who} was who I would ask, at {where}." -> "{subject} being {tie} was the kind of thing that opened a case up. {who} was who I would ask, at {where}."
bridge brg-031: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{subject} had been placed at a particular hour: {tie}. {who} could say what it meant." -> "Somebody had to account for {subject} at {tie}. {who} was the one to ask."
bridge brg-032: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{tie}. That put the clock on {subject}, and {who} was who to ask about it." -> "{who} might know about {subject}, and about {tie}."
bridge brg-033: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "Whoever was {tie} mattered for that half hour alone. I wanted {who}’s word on {subject}." -> "It came back to {subject} and {tie}. {who} was who to ask about it."
bridge brg-034: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{subject} turned out to be {tie}. That was an hour worth asking about." -> "Nobody had told me about {subject} at {tie} yet. {who} might."
bridge brg-035: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "It mattered that {subject} was {tie}. {who} could say how much." -> "The next question was {subject}, and the hour was {tie}. {who} would know, at {where}."
bridge brg-036: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "I had not accounted for {subject} at that hour before. {tie} changed that. {who} would know more." -> "{tie} was the hour that mattered, and {subject} was in it somewhere. I wanted {who}’s word on it."
bridge brg-037: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{tie} — a fact nobody had mentioned about that hour. {who} was who to ask." -> "I still had nothing on {subject} at {tie}. {who} was the one to put it to."
bridge brg-038: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "That put a clock on {subject}: {tie}. {who} knew the rest, and {who} was at {where}." -> "{who} was next. The question was {subject}, around {tie}."
bridge brg-039: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{subject}, it turned out, was {tie}. I wanted {who}’s account of that hour." -> "The coroner’s hours opened at {tie}. {who} could tell me about {subject}, and {who} was at {where}."
bridge brg-040: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "Knowing {subject} was {tie} narrowed things. {who} was the one holding the answer." -> "{subject} and {tie}: that was the next question, and {who} would have an answer."
bridge brg-041: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{tie}. It put {subject} at an hour I had not asked about, and {who} could say more." -> "I wanted to know about {subject} around {tie}. {who} was the one who might say."
bridge brg-042: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{subject} being {tie} was news to me. {who} would fill in the hour." -> "{tie} was where the coroner started counting. {who} might know where {subject} fit."
bridge brg-043: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "That gave the hour a name: {tie}. {who} knew the details." -> "I had {subject} and I had {tie}, and nothing to join them. {who} might."
bridge brg-044: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "I wanted to know more about {subject} at that hour. {who} was where to start, at {where}." -> "The hour was {tie}. {who} was the one to ask about {subject}."
bridge brg-045: rewritten. For `tie: time` the engine fills {tie} with the hour the notebook’s window opens on ("half past nine") and {subject} with whom or what the question is about, often the victim or a topic; the draft read {tie} as a predicate ("Whoever was {tie}…"): "{tie} put a time on {subject} that nothing else had. {who} was next." -> "It was {tie} I cared about, and {subject}. {who} might have been around for both."
bridge: added brg-s01..s04, `tie: place`, `lead: search` (a new tag): the bridge to a room to go through, which has no {who}. A `tie: place` draft reads {subject} as a person and would say "The Wyckoff turned out to be the Wyckoff."
thought tht-014: "{subject} put {subject} at {scene}" names the same person twice as two people: "{subject} put {subject} at {scene}, at {time} — the same hour it happened. That did not clear anyone." -> "That put {subject} at {scene}, at {time} — the same hour it happened. That did not clear anyone."
thought tht-128: asserted a lie that a secret explained does not establish: "That accounted for {subject}’s lie. It did not account for the rest." -> "That accounted for {subject}. It did not account for the rest."
thought tht-134: "disqualifier" is the generator’s word, not the detective’s: "It was a disqualifier, plain: this branch was finished." -> "That ruled it out plainly. That line was finished."
thought: tagged `basis` on implicates (placement where the card has {time}, access where it does not) and window (anchor: every draft names {time}); tagged `via` on the unmentioned cards that only make sense for the office briefing (037, 038, 039, 045, 046, 048) or for a told evening (041).
thought: added tht-e001..e055 — window with `basis: coroner` (4; every window draft needs {time}, and a narrowing with no anchor has none), goods (12), last-seen (12), seen-after (12), view (15: watcher, client, known, stranger, and lied).
errand: the short form (`bridged: yes`), err-b001..b072, four a `for` value under each of said, document and found, replacing the 36 placeholders.
```

### Tags and slots, as they stand after integration

As listed above under "Tag vocabularies and slots", with these changes:

- `bridge` gains `lead` (`ask` default, `search`), and its slots mean: `tie:
  victim` — {subject} a person, {tie} the relation; `tie: place` —
  {subject} a person who keeps a place, {tie} "the landlady at the third
  floor"; `tie: time` — {tie} the hour the notebook's window opens on,
  {subject} whom or what the question is about; `lead: search` — no
  {who}, {subject} the room.
- `thought`: `{scene}` always filled; `{other}` on `secret` and
  `dead-end` is what the secret was ("embezzling").
- `portrait-pairs` gains `recallAction`.
- `establish` is dealt with no `{watcher}` (a watcher in the room is
  introduced by the presence line and the arrival thought).


## The designer read (third review)

The coordinator read seed 3 as a player. Seven fixes, each held by a test in
`test/m8.test.ts` ("M8 designer-read fixes").

1. **Thoughts claim no more than they are licensed to.** A thought resting on
   one person's word — a `clears` or `implicates` placement nobody else in the
   notebook corroborates, an `implicates` from access — or on an anchor inside
   the coroner's window is marked `single` and may only be dealt a card that
   hedges (`if`, `might`, `would`, `could`, …). A room's own physical or
   documentary find, or a second clue saying the same, may be stated flat. The
   twelve anchor-window cards were rewritten conditional ("The coroner had
   given me hours. {other} might give me the minute."), seven implicates
   cards hedged (and the invented key taken out), and the goods, last-seen and
   seen-after cards cut back to what the notebook holds. Tests: every card the
   filter can reach hedges, and every single-source thought dealt over the
   sweep does.
2. **A thought never says the find again.** A card sharing three content words
   in a row with a find on the same page — names, places, hours and the verbs
   of being taken out — is passed over ("Nothing had been carried out" after
   "Nothing was carried out of the room"). Three not-robbery cards were also
   rewritten to state the conclusion without inventing drawers or a fight.
3. **No detective-body or inventory texture.** The ambient deck is the
   detective's rent, hangover and bruises, and it invented things ("the
   landlady's note … in my coat"); it is no longer dealt on a night page at
   all. Texture on a night page is the weather, on arrival, and nothing else.
4. **Placements are sentences.** An utterance of the shape "{subject},
   {place}, {time}." or "{time}. {place}. …" is not dealt, and a written
   card is preferred to a placeholder at every rung (the placeholders claimed
   habits: "same as any night of the week").
5. **Bridges state the tie and who to ask.** All 45 rewritten: no "changed
   things", "opened a case up", "worth a question", "knew {subject}". Tested
   against a list of evaluative phrases.
6. **Where the one to ask is found is said when the notebook knows it** — a
   card with `{where}` is preferred — unless the person is a fixture whose
   clause already says it ("Hargrove, the doorman at the Wyckoff").
7. **Activities fit the place.** Suspect activity cards are tagged `at: work`
   (a trade task; 219 of them) or `at: any`, and a trade task is dealt only
   where that archetype works (`WORKPLACES` in `src/game/scene/plan.ts`: a
   pawnbroker's clerk at the pawnshop, a bouncer at a bar or the dance hall, a
   secretary at the office over the tailor's…). Anywhere else the person does
   what anybody does there: 14 new `role: any` cards by place kind (a coffee
   going cold, a newspaper, waiting).

Also from reading seeds 7 and 12: the body out of doors lies "on the ground",
not the floor; a robbery's empty shelf is said once (the scene's given and the
find already say it); a room with nobody in it says so; a person named in a lead
the notebook holds counts as known for the arrival view; the stop line no
longer assumes the person was holding something ("put it aside").

### Numbers

- **Tests:** 30 files, 648 passing.
- **Beat coverage:** 5,292 of 5,292 night pages, 26,053 of 26,053 required
  beats; **correspondence:** 0 violations (330 runs).
- **Decks:** 3,305 cards, 0 errors; overlap clean on the touched decks.
- **Night harness:** arrive 0.313, search 0.131, ask 0.462; aggregate
  **0.302** (0.250 before this round). All of the rise is length and short
  sentences: the ambient line that padded a short page is gone and nothing
  invented stands in for it (questions now average 100 words against the
  golden's 138; searches 124 against 162). The cohesion numbers improved.
- **Office page:** byte-identical on all forty seeds; 0.009.

### Seed 3, pages 2–5

```
the suite                                             12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

Kreuzer had named it first. I came to go through it, drawer by drawer.

The cold cut through, and the block had emptied early because of it. Every
stoop light was out but the one over the door. The hotel holding the suite
was six floors of brick, plain outside and plainer in. A house phone sat on
a table by the stairs, unanswered at this hour. The building had the
particular quiet of a place where everybody paying by the week had learned
to keep to themselves. There was no one to notice who passed through. The
precinct had taken its statement and gone home.

Sweeney lay where he had fallen. Nobody had covered him yet. There was
nobody else in the room. The lamp came down with him and the bulb was still
warm in its socket, unbroken. The El went over at ten o’clock, running to
timetable, and for twenty seconds nothing under the structure could be heard
at all.

The coroner’s man had left a note on the back of an intake form. The coroner
put death between half past nine and eleven. One depressed fracture at the
back of the skull. Death was not instant.

If ten o’clock was the hour, the El going over was the clock. I did not know
yet that it was.


the suite                                             12:50 AM   page 3
────────────────────────────────────────────────────────────────────────────

The last thing I had turned up pointed here. I went through the room.

I took the room one wall at a time. The rug was rucked up under Sweeney and
the chair beside it went over backwards. Nothing was carried out of the
room.

There was a day ledger in the room, and a nickel-plated revolver. I left
them both alone for now.

Whoever came, came for Sweeney, not for anything Sweeney owned.

The next name was Hanrahan, Sweeney’s secretary. Kreuzer could tell me more,
at the speakeasy.


the speakeasy                                         1:15 AM   page 4
────────────────────────────────────────────────────────────────────────────

Kreuzer would know about Hanrahan, Sweeney’s secretary.

The hour had turned to one. The cold had cleared most of the block out
early. A last stubborn pair stood outside the speakeasy, not talking. The
speakeasy was a long room with a low ceiling, a bar down one side and a
scatter of tables along the other. This late the crowd had thinned to
whoever had nowhere better to be.

Callahan was rinsing glasses in a basin, setting them out to dry. She was
the bartender, a woman in her forties.

Kreuzer was waiting, and not for me. The coin was going over her knuckles
again.

Kreuzer was the client. Clients kept their own hours, and I let them.
Callahan kept half an eye on the glasses and half on the door.


the speakeasy                                         1:40 AM   page 5
────────────────────────────────────────────────────────────────────────────

Kreuzer looked up as I came over. “Sweeney had a secretary. Hanrahan.”

“Nora Hanrahan.”

“Where was Hanrahan tonight?”

“From ten until half past. Hanrahan was right there, at the walk-up on
Ninth.”

I wrote it in the book. Then I read it back.

If Hanrahan was at the third floor at ten o’clock, that put Hanrahan well
clear of the suite. Good news, if it was true. Kreuzer placed Hanrahan at
the third floor, at ten o’clock — and in saying so, put Kreuzer there too.
She had told me plenty, and skipped that.

The next name was Schilling, Sweeney’s former employee. Hargrove, the
doorman at the Wyckoff, was the one to ask.

```

### Seed 7, pages 2–4 (oracle)

```
the back lot                                          12:30 AM   page 2
────────────────────────────────────────────────────────────────────────────

Salerno started me on this. I meant to turn the place over.

Fog sat low over the row houses, blurring the streetlamps to smears.
Somewhere a window sash went down. The back lot belonged to Brennan, tucked
behind a larger house, out of sight the way a poor relation so often was.
The path in was gravel, loud underfoot. This late there was nobody else back
there to hear it. There was no one to notice who passed through. The police
had come and gone. A japanned cash box came off a shelf in this room, and
Brennan was alive and at Mrs. Teague’s, which was the first thing anybody
said about it. Nothing at the back lot was forced: the lock was turned and
the door was shut again after.

I had the back lot to myself.

A japanned cash box was gone from the back lot, which was Brennan’s. Nothing
was forced and nothing was broken. Whoever it was had all night and took
twenty minutes. The fight card was on the bar radio at half past ten, turned
up loud enough to carry into the street, and off when the card ended.

The desk sergeant's report put it between ten o’clock and half past eleven.
The precinct report said there was no entry at all. Whoever it was was
inside before the door was shut.

That was consistent with how it had happened.

Bidwell was Brennan’s former employee. The question was for Salerno, at the
speakeasy.


the speakeasy                                         12:55 AM   page 3
────────────────────────────────────────────────────────────────────────────

Something on paper at the back lot sent me. I wanted an answer from Lanza,
the bartender at the speakeasy, about the lock.

Fog wrapped the block's lamps into soft yellow rings. The speakeasy's sign
was barely legible from the corner. The speakeasy was a long room with a low
ceiling, a bar down one side and a scatter of tables along the other. This
late the crowd had thinned to whoever had nowhere better to be.

Lanza was rinsing glasses in a basin, setting them out to dry. She was the
bartender: a woman in her thirties.

Salerno was sitting with a drink and not drinking it. She kept her legs
uncrossed again, over the pinned hem.

Salerno was the client. Clients kept their own hours, and I let them.
Whoever came or went, Lanza would have marked it.


the speakeasy                                         1:25 AM   page 4
────────────────────────────────────────────────────────────────────────────

The notebook had a question for Lanza, the bartender at the speakeasy, about
the lock.

The night had reached one without my noticing. Lanza left off and looked up.
“Tell me about the lock.”

“The lock at the back lot has never been changed, and that the people who
can open it can be counted on one hand.” Lanza tapped two fingers against
her temple again.

I put it in the notebook.

Mosley, a customer of Brennan’s, could have got into the back lot without
much trouble. That was a reason to keep asking.

Brauer was named in Brennan’s will. Lanza might know Brauer, and I meant to
ask.

```

### Seed 12, pages 2–4 (oracle)

```
the benches                                           12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

It was what Tillman said. I wanted a proper look at the room.

The benches was public in the plainest sense, open on every side, watched by
no one in particular. A lamp at the corner of the square gave what light
reached the benches at all. This late they sat empty more often than not.
There was no one to notice who passed through. The police had called it a
fall and gone home. Grasso was not killed at the benches: there was no blood
there and no sign of a struggle.

He was still on the ground where he had been left.

Dandridge, Grasso’s business partner, was waiting, and looking up the street
now and then.

A glass was on its side and the spill had not yet reached the edge of the
table when it dried. The El went over at half past six, running to
timetable, and for twenty seconds nothing under the structure could be heard
at all.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death between six o’clock and half past seven. Chloral
hydrate in the stomach. No wound, no bruising, no sign of a struggle.

The El going over came at half past six, inside the coroner’s hours. If the
rest fit, that could be when. That was consistent with how it had happened.
I had Dandridge’s name before I had the face.

Hochstetter, Grasso’s tenant, would know about Dandridge, Grasso’s business
partner. Hochstetter was at Mancuso’s.


Mancuso’s                                             12:55 AM   page 3
────────────────────────────────────────────────────────────────────────────

A document at the suite pointed here. I came to hear Lefkowitz, the man
behind the counter at Mancuso’s, out on Steinbach, Grasso’s lawyer.

The cold had cleared most of the block out early. A last stubborn pair stood
outside Mancuso’s, not talking. The hall making up Mancuso’s kept its lamps
low over the tables, leaving the rest of that room dark by comparison. A
rack of cues lined one wall, half of them missing tips. At this hour the
room was quieter than it had any right to look, given the hour it usually
kept.

Lefkowitz was racking a set of cues along the wall, straightening each one.
He was the man behind the counter, a man in his forties.

Hochstetter was smoking at a table near the wall. She was a piano teacher, a
woman in her thirties.

Salerno was at a table with a cup of coffee going cold. She was a dentist
with a chair and a waiting room, a woman in her forties.

Lanza was counting out coins for a round, stacking them by size. He was a
longshoreman, a man in his thirties.

Steinbach was tapping ash from a cigarette onto a saucer. She was a lawyer
with one clerk, a woman in her forties.

Hanrahan was watching the door over a cup of coffee. He was the patrolman on
the beat: a man in his thirties.

Tillman was tapping ash from a cigarette without breaking a sentence. She
opened the compact again, looked at nothing, and shut it.

Hochstetter was in the notebook already. Now there was a face to go with it.
Whoever came in, Lefkowitz had a look at them from behind the counter.


Mancuso’s                                             1:20 AM   page 4
────────────────────────────────────────────────────────────────────────────

It was past one, and the night went on. Hochstetter, Grasso’s tenant, looked
up when I sat down. “Grasso had a business partner. Dandridge.”

“Roscoe Dandridge.”

“Where was Dandridge tonight?”

“I'd have noticed Dandridge at Mancuso’s by half past six, and I didn't.”
Hochstetter turned a wrist again to read the watch worn face-in.

That was worth knowing, and it was worth setting aside.

Dandridge was Grasso’s business partner. The question was for Lanza,
Grasso’s tenant, at Mancuso’s.

```

### Card changes this round

```
thought tht-014: "That put {subject} at {scene}, at {time} — the same hour it happened. That did not clear anyone." -> "If {subject} was at {scene} at {time}, {subject} was there the same hour it happened. That cleared nobody."
thought tht-016: "{subject} had a key to {scene}. That put opportunity in {subject}’s hands." -> "{subject} could have got into {scene}. That put it within reach, if nothing more."
thought tht-017: "At {time}, {subject} was at {scene} — right where it happened. That was not an alibi." -> "At {time}, {subject} might have been at {scene}, right where it happened. If so, it was no alibi."
thought tht-019: "{subject} could get into {scene} without trouble. That was reason enough to keep asking." -> "{subject} could have got into {scene} without much trouble. That was a reason to keep asking."
thought tht-021: "{subject} was seen near {scene} at {time}. That did {subject} no favors." -> "If {subject} was near {scene} at {time}, that did {subject} no favors."
thought tht-023: "{subject} had access to {scene}, and access was not nothing." -> "{subject} might have had a way into {scene}, and a way in was not nothing."
thought tht-024: "At {time}, {subject} was where it happened, or close to it. That was bad news for {subject}." -> "If {subject} was where it happened at {time}, or close to it, that was bad news for {subject}."
thought tht-085: "The coroner had given a span. This gave a point inside it: {time}." -> "The coroner had given me hours. {other} might give me the minute."
thought tht-086: "If it happened at {time}, that explained why nobody heard it." -> "If it happened at {time}, it happened during {other}. That was worth holding on to."
thought tht-087: "That narrowed the coroner’s hours down to {time}." -> "{other} at {time} fell inside the coroner’s hours. It might be the minute, and it might not."
thought tht-088: "The window was wide. This made it {time}, if it was right." -> "The coroner’s window was wide. {other} at {time} might narrow it, if the rest agreed."
thought tht-089: "That was an anchor, not a guess: it happened, or did not, at {time}." -> "If it was {time}, then {other} marked it. I did not know yet that it was."
thought tht-090: "If {time} was right, it was worth more than the coroner’s span alone." -> "{other} came at {time}, inside the coroner’s hours. If the rest fit, that could be when."
thought tht-091: "The coroner gave hours. This gave a minute: {time}." -> "It could have happened at {time}. If it did, {other} would have been going on."
thought tht-092: "That turned a span into a single hour: {time}." -> "I had hours from the coroner. {other} at {time} was a guess at the minute, and only a guess."
thought tht-093: "It placed the hour more exactly than the coroner had managed. {time}, if it held." -> "{time} was possible. {other} made it worth thinking about, if nothing more."
thought tht-094: "If {time} was right, that was the minute the coroner could not give." -> "Somewhere in the coroner’s hours was {other}, at {time}. It might be the moment."
thought tht-095: "That put a number on it: {time}, and nothing vaguer." -> "If {time} was the hour, {other} was the clock. I did not know yet that it was."
thought tht-096: "The coroner’s window ran wide. This closed it down to {time}." -> "{other} at {time} sat inside the window. That made it a candidate, if not an answer."
thought tht-098: "The drawers were shut and nothing was missing. Whoever came, came for {victim}, not for things." -> "Whoever came, came for {victim}, not for anything {victim} owned."
thought tht-105: "It was a fight, not a theft. Nothing in {scene} said different." -> "It was not a theft. Nothing in {scene} said different."
thought tht-106: "Whoever came up, came for {victim} and touched nothing else in the room." -> "Whoever came for {victim} came for {victim} and nothing else."
thought tht-e005: "So {other} had passed through {place}. It had not gone far." -> "So {other} had passed through {place}. That was somewhere to start."
thought tht-e006: "{other} had come this way after it left. {place} was where the trail was warm." -> "{other} had come this way after it left, if the finding was honest. {place} was the place to ask."
thought tht-e015: "{other} had stopped at {place}. The trail was shorter than I had feared." -> "{other} had stopped at {place}. Somebody there might know who brought it."
thought tht-e017: "So {victim} had been at {place} at {time}. After that, nobody had {victim} anywhere." -> "So {victim} had been at {place} at {time}. After that I had nothing on {victim}."
thought tht-e018: "{place} at {time}. That was the last anybody had of {victim}." -> "{place} at {time}. That was the last I had of {victim}."
thought tht-e020: "{time} at {place} was the last sight of {victim}. Whatever happened, it happened after." -> "{time} at {place} was the last sight of {victim} I had. Whatever happened, it might have happened after."
thought tht-e021: "The trail on {victim} ran as far as {place}, at {time}. It stopped there." -> "What I had on {victim} ran as far as {place}, at {time}. It stopped there."
thought tht-e022: "{victim} had been at {place} at {time}. That was the edge of what anybody knew." -> "{victim} had been at {place} at {time}. That was the edge of what I knew."
thought tht-e025: "{place}, at {time}, was the last place anybody could swear to {victim}." -> "{place}, at {time}, was the last place anybody had sworn to {victim} yet."
thought tht-e027: "Nobody had seen {victim} since {place} at {time}. That was where to start." -> "Nobody had given me {victim} since {place} at {time}. That was where to start."
thought tht-e028: "{victim} was at {place} at {time}, and then nowhere anybody could name." -> "{victim} was at {place} at {time}, and then nowhere I could name."
thought tht-e029: "{victim} had been at {place} at {time}, after the hour {victim} was supposed to have gone. Somebody had been wrong." -> "{victim} had been at {place} at {time}, later than I had {victim} before. If it held, somebody had it wrong."
thought tht-e030: "So {victim} was still walking around at {time}. Walking meant choosing." -> "So {victim} might still have been walking around at {time}. Walking would mean choosing."
thought tht-e031: "{place} at {time} was later than anybody had put {victim} before. That changed what gone meant." -> "{place} at {time} was later than anybody had put {victim} before. If it was true, gone meant something else."
thought tht-e032: "At {time}, {victim} was at {place}. Whoever had {victim} vanishing earlier had it wrong." -> "At {time}, {victim} was at {place}, if the word was good. Whoever had {victim} gone earlier would have to think again."
thought tht-e033: "That put {victim} at {place} at {time}, after the last sighting I had. {victim} had gone somewhere on foot." -> "That put {victim} at {place} at {time}, after the last sighting I had."
thought tht-e035: "{victim} was seen at {place} at {time}. That was after, and after mattered." -> "{victim} was seen at {place} at {time}. That was after, if it held."
bridge: brg-001..045 rewritten to state the tie and who to ask, never what it does to the case ("changed things", "opened a case up", "worth a question"); six a tie use {where}, for §6’s "where the source is". Draft text kept in the log below.
  was brg-001: {subject} was {tie}. That was worth knowing on its own, and {who} would know more.
  was brg-002: Being {tie} put {subject} in it. I wanted to hear the rest from {who}.
  was brg-003: {subject}, {tie} — that alone was worth a question, and {who} was who to ask.
  was brg-004: {subject}, {tie}, was somebody worth asking about. {who} could say more.
  was brg-005: That {subject} was {tie} changed things. {who} would know the rest of it.
  was brg-006: {subject} was {tie}, and nobody had mentioned it yet. {who} would know why.
  was brg-007: A person who was {tie} was worth a look. {who} knew {subject} best.
  was brg-008: {subject} being {tie} was reason enough by itself. {who} was who to ask, at {where}.
  was brg-009: {subject} was {tie}. I had not heard that before. {who} would know more, and {who} was at {where}.
  was brg-010: I had not known {subject} was {tie}. {who} would, and I meant to ask.
  was brg-011: {subject} was {tie} — that was new, and worth chasing. {who} could tell me the rest.
  was brg-012: That put {subject} in the story: {tie}. {who} was next.
  was brg-013: {subject}, {tie}, was somebody I had not asked about yet. {who} would know where to start.
  was brg-014: Being {tie} gave {subject} a place in this. {who} knew {subject} well enough to say more.
  was brg-015: {subject} being {tie} was the kind of thing that opened a case up. {who} was who I would ask, at {where}.
  was brg-016: {subject} had a connection to the place: {tie}. {who} would know what that connection meant.
  was brg-017: {tie}. That was enough to send me to {who} next.
  was brg-018: Whoever was {tie} belonged in this. I wanted {who}’s word on {subject}.
  was brg-019: {subject} turned out to be {tie}. That was a thread I had not pulled yet.
  was brg-020: It mattered that {subject} was {tie}. {who} could say how much.
  was brg-021: I had not placed {subject} there before. {tie} changed that. {who} would know more.
  was brg-022: {tie} — a fact nobody had mentioned. {who} was who to ask about it.
  was brg-023: That tied {subject} to the place: {tie}. {who} knew the rest, and {who} was at {where}.
  was brg-024: {subject}, it turned out, was {tie}. I wanted {who}’s account of it.
  was brg-025: Knowing {subject} was {tie} opened a door. {who} was the one standing behind it.
  was brg-026: {tie}. It put {subject} somewhere I had not looked yet, and {who} could say where next.
  was brg-027: {subject} being {tie} was news to me. {who} would fill in the rest.
  was brg-028: That gave {subject} a reason to have been there: {tie}. {who} knew the details.
  was brg-029: I wanted to know more about {subject} being {tie}. {who} was where to start, at {where}.
  was brg-030: {tie} put {subject} in the story in a way nothing else had. {who} was next.
  was brg-031: Somebody had to account for {subject} at {tie}. {who} was the one to ask.
  was brg-032: {who} might know about {subject}, and about {tie}.
  was brg-033: It came back to {subject} and {tie}. {who} was who to ask about it.
  was brg-034: Nobody had told me about {subject} at {tie} yet. {who} might.
  was brg-035: The next question was {subject}, and the hour was {tie}. {who} would know, at {where}.
  was brg-036: {tie} was the hour that mattered, and {subject} was in it somewhere. I wanted {who}’s word on it.
  was brg-037: I still had nothing on {subject} at {tie}. {who} was the one to put it to.
  was brg-038: {who} was next. The question was {subject}, around {tie}.
  was brg-039: The coroner’s hours opened at {tie}. {who} could tell me about {subject}, and {who} was at {where}.
  was brg-040: {subject} and {tie}: that was the next question, and {who} would have an answer.
  was brg-041: I wanted to know about {subject} around {tie}. {who} was the one who might say.
  was brg-042: {tie} was where the coroner started counting. {who} might know where {subject} fit.
  was brg-043: I had {subject} and I had {tie}, and nothing to join them. {who} might.
  was brg-044: The hour was {tie}. {who} was the one to ask about {subject}.
  was brg-045: It was {tie} I cared about, and {subject}. {who} might have been around for both.
activity: tagged `at` on the suspect-archetype cards — `work` (219) for a trade task, `any` for the rest — and added act-w01..w14, what anybody does at a place of each kind when it is not their place of work.
```
