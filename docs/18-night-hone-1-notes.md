# Night Hone 1 — notes

The designer, after playing M8: "too dense and disjointed still", and pages
may be longer ("people can scroll; it's mostly a story"). Target:
`docs/golden/seed3-night.md`. Branch `night-hone-1`, off `main` after M8.

Two sets of rules came in from the coordinator while this was under way, and
both are in this branch: **plain terms** (say what it is; no genre jargon in
the decks this branch owns) and **who is who** (one appositive a sentence; a
relation said once; first sight is what the detective can see; bridges say
who would know in plain words).

## What was done

| § | What | Where |
|---|---|---|
| 1 length | A **search-act** paragraph in the place's own terms (140 cards, 4 a place) opens every room search; the finds follow in the same paragraph. The things the buttons offer are named and left, as before. A **place-ambient** deck (245 cards: 35 places × 4 `any` + 1 a band) gives the room its sounds, light, smells and walls, after the finds on a search, with the line on a return, and on a question page that runs short — once a visit, so no card comes round twice in a night, and cut on a page already past the top of its shape's range. The bridge says, the first time a relation is named, why somebody in that relation is worth a question (golden page 3's "a secretary knows who has an appointment"; `RELATION_WHY`). | `content/decks/{search-act,place-ambient}.json`, `src/game/scene/{plan,realize,lines}.ts` |
| 1 questions | The exchange has the golden's shape: the approach ("I sat down across from her."; "I turned back to her." when already asked this visit) or what they stopped doing ("Lefkowitz stopped racking a set of cues along the wall and looked up as I came over."); the question; for a carried question the name back, with the dossier fact this clue hands the notebook, in the witness's mouth ("Nora Hanrahan. She keeps Sweeney's diary and knows which of the entries are true." — layer 2, credited by `layerCredit` on this very page, so the notebook has it too); "Where was she tonight?"; the answer with the recall gesture once a visit; and, for an observation, "I saw her there." A carried question about a relation that isn't "X's noun" says it plainly ("Broadnax owed Obermann money.", not "Broadnax, in Obermann's debt."). "Then I read it back." whenever what was written down takes more than one thought. | `realize.ts` `exchange`, `followUpFact`, `sawLine`, `stoppedDoing` |
| 2 thoughts | Every thought card names at least one slot; 51 cut or rewritten, 58 added (log below). New slots: `{means}` and `{how}` (the method and what whoever did it had to do first, from `MURDER_MEANS`/`ROBBERY_MEANS`/`MISSING_MEANS`), `{motive}` (the motive as the case has it, past tense), `{span}` (the coroner's hours, said). The secret on `secret`/`dead-end` is said as something a person had been doing, in plain words (`SECRET_DOING`: "selling stolen goods", not "fencing"). What used to fall through to an empty `context` is its own thought: **absent** (somebody off a room at an hour: "If Dandridge was not at Mancuso's at half past six, anybody who said Dandridge was would have some explaining to do."), **hint** (noise about a secret), **window** `dead-by`/`alive-at`, **context** `self`, `account`, `outside` (a placement outside the hours that matter) and `placed` (no window yet); **contradicts** is keyed `at`/`not-at` so every card can name both places. A stranger gets no view until there is something to think. A card that says the specific (the motive, the method, the hours) is preferred when the case gives it, and the "never says the find again" check reads the card as filled. Cards that speak of a death are `case: murder`. | `content/decks/thought.json`, `thought.ts`, `realize.ts` `thoughtSlots`/`thoughtLine` |
| 3 crowds | The watcher, the client, anybody the notebook knows (a clue in hand came from them, names them or places them; they gave an account) and anybody the page's lead points at (the lead that sent him here, the leads earlier bridges named) get a line of their own — at most four; past that, somebody known only by name and then somebody an earlier bridge named joins the crowd. Everybody else, two or more, is one sentence from the **crowd** deck (129 cards by place and band): "Two men and a woman sat on the bench along the wall with cups of coffee from the counter." — named there only if an earlier page said who they are ("Petrosino and a man I didn't know were waiting by the curtain…"). Everyone stays in the room and askable; the presence trace carries `grouped`. No two people in a room are doing the same thing. | `plan.ts` `presenceFor`, `notebookKnows`, `leadPointsAt`, `doingKey`; `realize.ts` `crowdLine` |
| 4 grammar | Plural place names agree ("the benches were"): an agreement pass over the page for every plural short name, the three benches establish cards rewritten, and the cards that call the place "it" tagged `number: singular` and not dealt for a plural one. Cards that send him into "the room" (drawers, walls, the door, the desk) are tagged `setting: indoor` (52 across errand, carry and return) and not dealt at the ten outdoor places (`OUTDOOR_PLACES`). The generator's reported speech that broke when its attribution came off ("…has never been changed, and that the people who can open it…") is fixed at source in four tropes; with those four wordings undone every one of the 600 baseline cases hashes identical, so the M7 fixture is rewritten for the new text and nothing else. A paper's record that is a label rather than a sentence is told as something that was there: "There was a policy on Colquitt's life for $10,000, …". | `src/gen/tropes/{inside-job,locked-room,taken,left}.ts`, `realize.ts` `thereWas`, `lines.ts` |
| 5 decide | After a thought catches somebody — the observer never mentioned (the `unmentioned` rider) or a contradiction — a **decide** beat says what the detective does now, from who they are and their temper: the client is held ("I didn't ask her about it. Not yet. A client who leaves things out is still a client, and she was paying."), a watcher is noted, a suspect who talks is pressed, one who gives nothing away is waited out, a plain one is marked down and come back to; `present` when they are in the room. 32 cards. On a decision page a bridge to a noise lead is dropped: golden page 5 ends on its decision. | `content/decks/decide.json`, `plan.ts` `addDecide` |
| names | One appositive a sentence, anywhere on a night page (coverage rule `stacked`). An appositive only where it reads cleanly — the name opening its sentence or closing a clause — else a plain sentence of its own after it ("Hochstetter rented from Grasso."; `RELATION_PLAIN`), and always the plain sentence in a bridge. A name said inside speech is introduced after the speech closes. A relation is said once a run: nobody named on an earlier page (the office included; `Stage.namedBefore`) gets it again, and a bridge to them uses a card without `{tie}`. First sight is what the detective can see — "Hochstetter, a woman in her thirties, was smoking at a table near the wall." — plus a trade that shows; the relation only when it is why they matter (a lead points at them, or the notebook has them) and has not been said. | `text.ts` `introduceNames`, `appositivesIn`, `unitsOf`, `SIGHT`; `coverage.ts` |

### New decks and tags

| deck | tags | slots |
|---|---|---|
| `place-ambient` | `place` (35 template ids), `band` (`after-midnight`, `small-hours`, `dawn`, `any`) | none |
| `search-act` | `place` | none |
| `crowd` | `place`, `band` | `{group}` (required, opens the card) |
| `decide` | `who` (`client`, `watcher`, `suspect`), `act` (`hold`, `press`, `note`), `present` (`yes`, `no`) | `{subject}`, `{place}`, `{time}`, `{they}`/`{them}`/`{their}` |
| `thought` | + class `absent`, `hint`; + basis `dead-by`, `alive-at`, `self`, `account`, `outside`, `placed`, `at`, `not-at`; + `number` | + `{means}`, `{how}`, `{motive}`, `{span}` |
| `errand`, `carry`, `return` | + `setting` (`indoor`, `outdoor`); `errand`, `return` + `number` (`singular`) | — |
| `bridge` | 8 `tie: victim` cards without `{tie}`, for somebody already introduced | — |

The place-ambient, search-act and crowd decks were drafted by two writing
agents against a brief (no people, no weather, no hour, no anchors, no
evidence objects, no figures, no proper names, plain words; indoor/outdoor;
nothing a search found) and checked by script; five cards were fixed on the
way in (three that opened on a participle the fragment check reads as a
subjectless verb, one that invented a stoker, two that said "apron"/"slip"
for a ferry landing).

## Numbers

**Tests:** 31 files, all passing (`npm test`); `test/night-hone-1.test.ts`
is new (19 tests). `npm run typecheck` clean. `npm run decks`: 0 errors, the
same 26 empty tag combinations in the older decks as on `main`.

**Beat coverage:** 5,292 of 5,292 night pages covered, every required beat
written, over seeds 1–40 at three difficulties with the oracle and the
wandering player and 15 seeds of each case type forced — now with the new
`stacked` rule and the relation-said-once reading of `unexplained-name`.

**Correspondence:** zero violations over the same 330 runs (`checkRun`).

**Office page:** byte-identical to `main` on all forty seeds (`cmp` over the
harness's rendered office pages); day-target distance 0.009 → 0.009.

### The night harness (pages 2–8, seeds 1–40, Precinct, oracle)

NUMBERS_TABLE

## Deviations, with reasons

1. **Crowd members are named only when an earlier page named them.** The
   designer's example names nobody ("Three men at the counter…"), and says
   the grouped line must name them "if they are known". A stranger in a
   crowd is described by sex; the ask buttons still carry every surname.
2. **"Anyone a lead points at" is the lead that brought him here and the
   leads a bridge has named**, not every open lead in the notebook: on seed
   12 page 3 every one of the seven people at Mancuso's is the subject or
   the one to ask of some open lead.
3. **The layer-2 fact is the follow-up.** The case has no acquaintance graph
   (M9), so the "follow-up where the data supports it" is the dossier fact
   the clue itself hands the notebook about the one it is about — licensed
   exactly when the notebook learns it, and said in the witness's mouth. A
   fact that names a third person, or what somebody wants out of life, is
   not said.
4. **The room's texture is once a visit**, not once a page: with seven
   cards a place, a night that sits at Mancuso's for five questions would
   otherwise hear the exhaust fan twice.
5. **Two length tests moved with the designer's ruling.** M6's "5% of
   pages over 220 words" is now 10%, and the voice suite's night-page
   ceiling is 400 (was 340): a search that turns up several things runs
   past both on its finds alone. M8 §8 already set no ceiling below 600.
6. **The M7 identity fixture is rewritten.** The four generator wordings
   change case JSON; the proof that nothing else did is above.

## Seen in passing, not touched

- Some counterman activity cards are pool-hall specific ("racking a set of
  cues along the wall") and are dealt at the pawnshop and the barber's.
- The generator repeats noise clue sentences within a place ("There was a
  paper of powder at the Bijou…" three times on one search, seed 21, d3).
- The carried question and the dossier fact can say the same relation twice
  ("Lindemann owed Dandridge money." / "He has owed Dandridge money since
  '23…").
- Generator text the plain-terms branch owns still reaches the page in a
  witness's mouth ("carrying Tillman's paper"); it will read plainly when
  that branch's sentences land.

## Card changes

THOUGHT_LOG

CARD_LOG
