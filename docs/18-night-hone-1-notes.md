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
| 2 thoughts | Every thought card names at least one slot; 18 cut, 85 rewritten, 76 added (log below). New slots: `{means}` and `{how}` (the method and what whoever did it had to do first, from `MURDER_MEANS`/`ROBBERY_MEANS`/`MISSING_MEANS`), `{motive}` (the motive as the case has it, past tense), `{span}` (the coroner's hours, said). The secret on `secret`/`dead-end` is said as something a person had been doing, in plain words (`SECRET_DOING`: "selling stolen goods", not "fencing"). What used to fall through to an empty `context` is its own thought: **absent** (somebody off a room at an hour: "If Dandridge was not at Mancuso's at half past six, anybody who said Dandridge was would have some explaining to do."), **hint** (noise about a secret), **window** `dead-by`/`alive-at`, **context** `self`, `account`, `outside` (a placement outside the hours that matter) and `placed` (no window yet); **contradicts** is keyed `at`/`not-at` so every card can name both places. A stranger gets no view until there is something to think. A card that says the specific (the motive, the method, the hours) is preferred when the case gives it, and the "never says the find again" check reads the card as filled. Cards that speak of a death are `case: murder`. | `content/decks/thought.json`, `thought.ts`, `realize.ts` `thoughtSlots`/`thoughtLine` |
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
nothing a search found) and checked by script; seven cards were fixed on the
way in (three that opened on a participle the fragment check reads as a
subjectless verb, one that invented a stoker, two that said "apron"/"slip"
for a ferry landing, one that walked a yard "fence to fence").

## Numbers

**Tests:** 36 files, 709 tests, all passing (`npm test`, after the merge of main); `test/night-hone-1.test.ts`
is new (19 tests). `npm run typecheck` clean. `npm run decks`: 0 errors and 0 plain-terms hits (the scene decks are off `pendingDecks` since the merge of main), the
same 26 empty tag combinations in the older decks as on `main`.

**Beat coverage:** 5,292 of 5,292 night pages covered, every required beat
written, over seeds 1–40 at three difficulties with the oracle and the
wandering player and 15 seeds of each case type forced — now with the new
`stacked` rule and the relation-said-once reading of `unexplained-name`.

**Correspondence:** zero violations over the same 330 runs (`checkRun`).

**Office page:** byte-identical to `main` on all forty seeds (`cmp` over the
harness's rendered office pages); day-target distance 0.009 → 0.009.

### The night harness (pages 2–8, seeds 1–40, Precinct, oracle)

Against `main` as it stands after the plain-terms pass (the office page is
byte-identical to it). Before the merge, against the M8 commit, the numbers
were the same shape: aggregate 0.302 → 0.182; words a page arrive 194.9 →
191.3, search 123.7 → 178.8, ask 97.4 → 121.4.

| metric | arrive main | arrive after | search main | search after | ask main | ask after |
|---|---|---|---|---|---|---|
| orphan_word_ratio | 0.840 | 0.841 | 0.851 | 0.819 | 0.798 | 0.789 |
| paragraph_cohesion | 0.601 | 0.607 | 0.622 | 0.637 | 0.699 | 0.686 |
| sentence_cohesion | 0.574 | 0.555 | 0.653 | 0.617 | 0.547 | 0.537 |
| short_share | 0.140 | 0.143 | 0.180 | 0.125 | 0.518 | 0.533 |
| long_ratio | 0.012 | 0.012 | 0.025 | 0.036 | 0.003 | 0.002 |
| dialogue_share | 0.000 | 0.000 | 0.000 | 0.000 | 0.349 | 0.302 |
| figures | 0.120 | 0.098 | 0.000 | 0.000 | 0.000 | 0.000 |
| plain_ratio | 0.731 | 0.721 | 1.000 | 1.000 | 1.000 | 1.000 |
| words_per_paragraph | 32.7 | 32.9 | 20.5 | 30.9 | 13.3 | 15.8 |
| words | 195.9 | 191.8 | 125.7 | 180.9 | 97.4 | 121.4 |
| **distance** | **0.313** | **0.336** | **0.104** | **0.000** | **0.462** | **0.209** |

**Night aggregate: 0.293 → 0.182.** Office page (day targets): 0.008 → 0.008. Pages: 92 arrivals, 26 searches, 162 questions.

The search now meets every target. The question's distance is short
sentences and length (121 words against the golden's 138; the golden's page
5 is two-thirds dialogue in short turns) and a dialogue share just under the
band, because the approach line and the room are narration. The arrival
moved from 0.313 to 0.336, all of it sentence cohesion (0.574 → 0.555): the
relation's reason on a bridge and the crowd line open on nouns the
sentence before them never used.


## The pages

Seed 3, the golden's own route (`npm run read -- --seed 3 --route "go the suite; examine the suite; go the speakeasy; ask Kreuzer about Hanrahan"`), pages 2–5:

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
put death between half past nine and eleven. One blow broke in the back of
the skull. Death was not instant.

If ten o’clock was the hour, the El going over was the clock. I did not know
yet that it was.

[1 action, 2 written down, 221 words]

the suite                                             12:50 AM   page 3
────────────────────────────────────────────────────────────────────────────

The last thing I had turned up pointed here. I went through the room.

I took the sitting room in a slow circle, desk and sideboard and the low
shelves under the window. Then I went through the bedroom, dresser and
wardrobe and nightstand, and did the bathroom cabinet last. The rug was
rucked up under Sweeney and the chair beside it went over backwards. Nothing
was carried out of the room.

A day ledger was there, and a nickel-plated revolver. I left them both where
they were for now. Out the window, the hotel's sign lit the fire escape red,
and the street below still had a taxi or two nosing along it.

Whoever came, came for Sweeney, not for anything Sweeney owned.

A secretary knows who has an appointment. Hanrahan was Sweeney’s secretary.
The question was for Kreuzer, at the speakeasy.

[1 action, 1 written down, 143 words]

the speakeasy                                         1:15 AM   page 4
────────────────────────────────────────────────────────────────────────────

Kreuzer would know about Hanrahan.

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

[1 action, 129 words]

the speakeasy                                         1:40 AM   page 5
────────────────────────────────────────────────────────────────────────────

The coloured bulbs over the bar gave the room a red and green cast, and a
furnace behind the wall thumped every so often. Kreuzer looked up as I came
over. “Sweeney had a secretary. Hanrahan.”

“Nora Hanrahan. She keeps Sweeney’s diary and knows which of the entries are
true.”

“Where was Hanrahan tonight?”

“From ten until half past. Hanrahan was right there, at the walk-up on
Ninth. I saw her there.”

I wrote it in the book. Then I read it back.

If Hanrahan was at the third floor at ten o’clock, that put Hanrahan well
clear of the suite. Good news, if it was true. Kreuzer placed Hanrahan at
the third floor, at ten o’clock — and in saying so, put Kreuzer there too.
She had told me plenty, and skipped that.

I didn’t put it to her. Not tonight, and not while Kreuzer was the one
paying.

[1 action, 1 written down, 150 words]
```

Seed 12 (oracle), pages 2–4 — page 3 is the designer's roll call:

```
the benches                                           12:25 AM   page 2
────────────────────────────────────────────────────────────────────────────

Tillman's own words sent me. I came to go through what was there.

The benches stood at the square’s north end, facing a fountain that had been
shut off for the season. Nobody minded who used them, at this hour least of
all. The square was still enough to hear a step on the gravel path. There
was no one to notice who passed through. The police had called it a fall and
gone home. Grasso was not killed at the benches: there was no blood there
and no sign of a struggle.

He was still on the ground where he had been left.

Dandridge was waiting, and looking up the street now and then.

A glass was on its side and the spill had not yet reached the edge of the
table when it dried. The El went over at half past six, running to
timetable, and for twenty seconds nothing under the structure could be heard
at all.

The coroner’s note was on the table under a glass, left for whoever came
next. The coroner put death between six o’clock and half past seven.
Chloral, a sleeping drug, in the stomach. No wound, no bruising, no sign of
a struggle.

If half past six was the hour, the El going over was the clock. I did not
know yet that it was. That made it poison in a drink. Whoever did it had to
get at the chloral and put it in the drink, and then had to leave the suite
without being stopped. I had Dandridge’s name before I had the face.

I wanted Hochstetter’s word on Dandridge. Hochstetter rented from Grasso.
She was at Mancuso’s.

[1 action, 2 written down, 279 words]

Mancuso’s                                             12:55 AM   page 3
────────────────────────────────────────────────────────────────────────────

A document at the suite pointed here. I came to hear Lefkowitz out on
Steinbach, Grasso’s lawyer. Lefkowitz was the man behind the counter at
Mancuso’s.

The cold had cleared most of the block out early. A last stubborn pair stood
outside Mancuso’s, not talking. The hall making up Mancuso’s kept its lamps
low over the tables, leaving the rest of that room dark by comparison. A
rack of cues lined one wall, half of them missing tips. At this hour the
room was quieter than it had any right to look, given the hour it usually
kept.

Lefkowitz was racking a set of cues along the wall, straightening each one.
He was the man behind the counter, a man in his forties.

Hochstetter, a woman in her thirties, was smoking at a table near the wall.

Steinbach was tapping ash from a cigarette onto a saucer. She was Grasso’s
lawyer, a woman in her forties.

Tillman was sitting with a drink and not drinking it. She opened the compact
again, looked at nothing, and shut it.

Two men and a woman sat on the bench along the wall with cups of coffee from
the counter.

Hochstetter was in the notebook already. Now there was a face to go with it.
Lefkowitz kept the counter and kept an eye on who sat at it.

[1 action, 224 words]

Mancuso’s                                             1:20 AM   page 4
────────────────────────────────────────────────────────────────────────────

It was past one, and the night went on. The pressed tin overhead had gone
brown with smoke, and an exhaust fan high in the rear wall turned slowly,
pulling the haze toward it. Hochstetter looked up when I sat down. “Grasso
had a business partner. Dandridge.”

“Roscoe Dandridge.”

“Where was Dandridge tonight?”

“I'd have noticed Dandridge at Mancuso’s by half past six, and I didn't.”
Hochstetter turned a wrist again to read the watch worn face-in.

I wrote it in the book.

If Dandridge was not at Mancuso’s at half past six, then Dandridge had been
somewhere else, and I did not know where yet.

Lanza might know where Dandridge had spent the evening, and Lanza was at
Mancuso’s. He rented from Grasso.

[1 action, 1 written down, 124 words]
```

Seed 7 (oracle), page 4 — the generator sentence that broke in a witness's mouth:

```
the speakeasy                                         1:25 AM   page 4
────────────────────────────────────────────────────────────────────────────

The notebook had a question for Lanza about the lock.

The night had reached one without my noticing. The coloured bulbs over the
bar gave the room a red and green cast, and a furnace behind the wall
thumped every so often. Lanza stopped rinsing glasses in a basin and looked
up as I came over. “Tell me about the lock.”

“The lock at the back lot has never been changed, and the people who can
open it can be counted on one hand.” Lanza tapped two fingers against her
temple again. “Mosley has been on Brennan’s books as a customer since ’20.”

I wrote it in the book.

Mosley might have had a way into the back lot, and a way in was not nothing.

Being named in a will is a reason to take an interest. The next name was
Brauer, named in Brennan’s will. Lanza was the one to ask.

[1 action, 1 written down, 153 words]
[gap: no-fact: overheard (t003) states nothing structured; its own line stands]
```

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

### thought

```
thought tht-045: overlapped the decide beat, and named nothing: "A client who left things out was still a client. {source} had left this out." -> "{source} had not mentioned being at {place} when we talked in my office."
thought tht-046: states no inference: "That was the first I had heard of it, and it should not have been." -> "That was the first I had heard of {source} at {place}, and it should not have been."
thought tht-049: named no place and no hour: "{subject} had said otherwise. This did not agree with it." -> "{subject} had told me {other}, at {time}. This put {subject} at {place}. One of the two was wrong."
thought tht-050: named no place and no hour: "That was not what {subject} told me. One of the two was wrong." -> "At {time}, {subject} had said {other}. This said {place}. {subject} could not have been at both."
thought tht-051: named no place and no hour: "{subject}’s account did not match what I had just found." -> "If this was right, {subject} was at {place} at {time}, and the story about {other} was not."
thought tht-052: named no place and no hour: "It contradicted {subject} plainly, and {subject} would have to explain it." -> "{subject} had claimed {other} at {time}. Now I had {subject} at {place} instead, and {subject} would have to explain it."
thought tht-053: named no place and no hour: "{subject} had said one thing. This said another." -> "{subject}'s account had {other} at {time}. This had {place}. I wanted to know which one {subject} would stand behind."
thought tht-054: named no place: "Either {subject} was wrong about {time}, or {subject} had not told me the truth." -> "Either {subject} was at {other} at {time}, as {subject} told it, or at {place}, as this told it. Not both."
thought tht-055: named no place and no hour: "That did not square with what {subject} claimed." -> "{subject} had told me {place}, at {time}. This said {subject} was not there."
thought tht-056: named no place and no hour: "{subject}’s story and this did not agree, and I noted just where they split." -> "At {time}, {subject} claimed {place}. This took {subject} out of it."
thought tht-057: named no place and no hour: "It was a straight contradiction of {subject}’s own account." -> "{subject}'s evening had {subject} at {place} at {time}. If this was right, that part of it was a lie."
thought tht-058: named no place: "{subject} had told it differently before. That alone was worth asking why." -> "If {subject} was not at {place} at {time}, then {subject} had lied to me about {time}."
thought tht-059: named no place and no hour: "That put a hole in what {subject} had said." -> "{subject} had put {subject} at {place} at {time}. Somebody else's word said otherwise, and one of them was wrong."
thought tht-060: named no place and no hour: "{subject} would have an explanation for this, or {subject} would not." -> "I had {subject} at {other} at {time} in {subject}’s own words, and at {place} in somebody else’s. That was a lie with an hour on it."
thought tht-061: states no inference: "{subject} had reason enough where {victim} was concerned. This was it." -> "So {subject} {motive}. That was a reason, if {subject} needed one."
thought tht-063: states no inference: "It was motive, and not a subtle one." -> "{subject} {motive}. People had been killed for less."
thought tht-066: states no inference: "It was the kind of reason that got people killed." -> "That gave {subject} a reason: {subject} {motive}."
thought tht-069: states no inference: "It was not proof. It was a reason, and reasons mattered." -> "{subject} {motive}. It was not proof of anything, but it was a reason."
thought tht-071: states no inference: "That was motive enough for most people." -> "{subject} {motive}. That put {subject} among the people with a reason to want {victim} gone."
thought tht-064: states no inference: "{subject} had a reason to want it done. Now there was something to show for it." -> "That was motive, plainly: {subject} {motive}."
thought tht-070: states no inference: "{subject} had wanted something from {victim}, and this was what it was." -> "If {subject} {motive}, then {victim} dead was worth something to {subject}."
thought tht-062: said the reason was ordinary without saying whose: "That gave {subject} a reason, plain and ordinary." -> "That gave {subject} a reason to want {victim} gone."
thought tht-073: states no inference: "That was how it had been done." -> "So it was {means}. Whoever did it {how}."
thought tht-074: states no inference: "It matched the method, plain enough." -> "It was {means}. That meant whoever did it {how}."
thought tht-075: said the thing was the means and stopped: "{other} was the means, or close to it." -> "{other} was the means. Whoever did it {how}."
thought tht-076: states no inference: "It told how, if not who." -> "If it was {means}, whoever did it {how} first."
thought tht-077: cut (the designer's example: "That was consistent with how it had happened"): "That was consistent with how it had happened."
thought tht-078: states no inference: "It answered the how, at least." -> "Now I knew how: {means}. Whoever did it {how}."
thought tht-079: states no inference: "It was the sort of trace a method leaves behind." -> "{other} told me how. Whoever did it {how}."
thought tht-080: states no inference: "It fit how the thing had been done." -> "It was {means}, and it had not happened by accident. Whoever did it {how}."
thought tht-081: states no inference: "{other} was proof of how, if not of who." -> "{other} was how it was done, if not who did it. Whoever it was {how}."
thought tht-082: cut (restated the coroner): "It matched what the coroner had said about the method."
thought tht-083: states no inference: "That was the method, spelled out plainly." -> "That made it {means}. Whoever did it {how}, and then had to leave {scene} without being stopped."
thought tht-084: states no inference: "It told the story of how. Who came after." -> "It was {means}. Whoever did it {how}, and that narrowed who could have."
thought tht-e001: said the coroner gave hours without saying which: "The coroner had given me hours. What I wanted was the minute." -> "Whoever did it had been at {scene} some time {span}. That was the stretch everybody would have to account for."
thought tht-e002: states no inference: "It was still a window, and a wide one." -> "The coroner's hours ran {span}. Anybody I could put somewhere else for all of it was out of it."
thought tht-e003: states no inference: "The coroner’s hours were narrower now. Not narrow enough." -> "So it had happened {span}. Where people were in those hours was what mattered now."
thought tht-e004: states no inference: "The hours had closed in a little. It happened somewhere inside them." -> "{victim} died some time {span}. Everybody’s evening came down to those hours."
thought tht-097: gave the room no name: "Nothing had been carried out. It was not a robbery." -> "Nothing had been carried out of {scene}. It was not a robbery."
thought tht-099: states no inference: "Nothing was gone. That ruled out robbery, whatever else it was." -> "Nothing of {victim}'s was gone. Whatever this was, it was not a robbery."
thought tht-100: said the same as tht-105: "It was not theft. Nothing in the room said otherwise." -> "Whoever came into {scene} had not come to steal."
thought tht-101: states no inference: "Nothing had been taken. So it was not robbery that brought them there." -> "Nothing had been taken, so it was not money that brought anybody to {scene}."
thought tht-102: states no inference: "The place had not been gone through for valuables. It was not that kind of crime." -> "Nobody had gone through {scene} for valuables. Somebody had wanted {victim}, not what {victim} owned."
thought tht-103: states no inference: "Nothing obvious was gone, and nothing quiet seemed to be either." -> "Nothing of value was gone from {scene}. It was {victim} they had come for."
thought tht-104: states no inference: "Nothing missing meant nothing taken. It was not robbery." -> "With nothing missing, it was not robbery. It was about {victim}."
thought tht-110: states no inference: "Something had been taken, and that changed the shape of it." -> "{other} had been taken from {place}. That made it a robbery first, whatever else it was."
thought tht-111: invented a drawer: "The drawer was empty where {other} should have been. That was robbery." -> "{place} was short {other}. That was robbery, whatever else it turned out to be."
thought tht-113: assumed a room indoors: "{other} was missing, and nothing else about the room explained why." -> "{other} was gone from {place}, and nothing else there explained why."
thought tht-120: states no inference: "That was what was missing, and it was enough to call it robbery." -> "{other} was missing, and that was enough to call it robbery."
thought tht-121: states no inference: "That explained the secret, and it was not murder." -> "So {subject} had been {other}. That was what {subject} had been keeping quiet."
thought tht-122: states no inference: "It was not what it looked like. It was {other}, and nothing more." -> "{subject} had been {other}. It was a secret, and it was not the same thing as killing {victim}."
thought tht-123: states no inference: "The secret came out, and it was smaller than the case." -> "What {subject} was hiding was {other}. It was not {victim}."
thought tht-124: states no inference: "That was the secret, and it did not reach as far as {victim}." -> "{subject}'s secret was {other}. Whatever else {subject} was, the secret wasn't murder."
thought tht-126: states no inference: "So that was what {subject} had been hiding. It was not this." -> "That explained {subject}: {other}. It did not explain {victim}."
thought tht-127: states no inference: "The secret was real. It was just not the killing." -> "{subject} had been {other}, and that was what {subject} had been hiding."
thought tht-129: states no inference: "It was a smaller crime hiding behind a bigger one." -> "So the thing {subject} kept quiet about was {other}. It was a smaller crime than the one I was working."
thought tht-131: the designer's example: "That was worth knowing, and it was worth setting aside": "That was worth knowing, and it was worth setting aside." -> "{subject} had been {other}. That was trouble for {subject}, but not the kind {victim} was in."
thought tht-132: states no inference: "The secret explained the fear. It did not explain {victim}." -> "The secret was {other}. It explained why {subject} was nervous. It did not explain {victim}."
thought tht-133: states no inference: "That closed it. Nothing more here was worth asking." -> "So {subject} had been {other}. That was what {subject} was hiding, and it took {subject} off my list."
thought tht-134: states no inference: "That ruled it out plainly. That line was finished." -> "That closed {subject} off. {subject} had been {other}, and that was all it was."
thought tht-135: states no inference: "That ruled it out. There was no coming back to this." -> "{subject}'s secret was {other}. It was a dead end, and I let {subject} go."
thought tht-136: states no inference: "Whatever I had hoped for, this was not it." -> "What {subject} was hiding was {other}. It was ugly, maybe, but it wasn't {victim}."
thought tht-137: states no inference: "That answered the question by closing it." -> "The line on {subject} stopped there: {other}, and nothing worse."
thought tht-138: states no inference: "It was not what I had been chasing. This was over." -> "{subject} had been {other}. I crossed {subject} off, and felt no better for it."
thought tht-139: states no inference: "That shut the door on it. There was no more here." -> "It came down to {other}. {subject} was out of it."
thought tht-140: states no inference: "It closed the door on that line of asking." -> "So that was {subject}: {other}. It closed the door on {subject} for tonight."
thought tht-141: states no inference: "The thread stopped there." -> "The thread on {subject} stopped at {other}."
thought tht-142: states no inference: "None of it went anywhere further. I let it go." -> "{subject} had been {other}. None of it went anywhere near {victim}, and I let it go."
thought tht-143: states no inference: "It disqualified the idea outright." -> "It took {subject} out of it. {subject} had been {other}, which was {subject}'s trouble and not mine."
thought tht-144: states no inference: "That settled it, in the negative, and settled it for good." -> "That settled {subject}, in the negative: {other}, and not murder."
thought tht-145: cut (said only that it did not matter): "It did not touch the case that I could see."
thought tht-146: cut (said only that it did not matter): "That was true, and it did not matter."
thought tht-147: cut (said only that it did not matter): "It was noise, honestly come by, and noise all the same."
thought tht-148: cut (said only that it did not matter): "None of it bore on what happened to {victim}."
thought tht-149: cut (said only that it did not matter): "It was the kind of fact a case turns up without needing."
thought tht-150: cut (said only that it did not matter): "That did not move the case at all."
thought tht-151: cut (said only that it did not matter): "It was true enough, and beside the point."
thought tht-152: cut (said only that it did not matter): "That told something about {subject}, and nothing about the case."
thought tht-153: cut (said only that it did not matter): "It did not touch the killing that I could see."
thought tht-154: cut (said only that it did not matter): "That was real, and it was not what I was looking for."
thought tht-155: cut (said only that it did not matter): "It filled in the picture without changing it."
thought tht-156: cut (said only that it did not matter): "That was worth knowing, and it was worth setting aside."
thought tht-157: states no inference: "Half an hour, and nothing to show for it." -> "{place} had nothing for me. Whatever I was after, it was not there."
thought tht-158: states no inference: "There was nothing here. I looked anyway." -> "I had gone through {place} for nothing, and that was worth knowing too: it was not there."
thought tht-159: states no inference: "It came to nothing." -> "{place} was a dead end, at least tonight."
thought tht-160: states no inference: "I found nothing worth the trip." -> "Whatever {place} knew, it was not telling me tonight."
thought tht-161: states no inference: "Nothing was in it, and I let the matter drop." -> "{place} gave me nothing. I crossed it off, for now."
thought tht-162: states no inference: "Nothing turned up, and I had not expected much." -> "Nothing at {place}. The next place would have to do better."
thought tht-163: states no inference: "It was a wasted half hour, or close to it." -> "{subject} had nothing for me on that, or nothing {subject} would give."
thought tht-164: states no inference: "There was nothing to find, and nothing was what I found." -> "That was a dead end with {subject}. If {subject} knew more, it would take another question."
thought tht-165: states no inference: "I had come for something and left with nothing." -> "{subject} was no help on that one. I did not hold it against {subject}, yet."
thought tht-166: states no inference: "It was quiet, and quiet meant nothing to report." -> "Nothing from {subject}. Either {subject} didn't know or wouldn't say, and I couldn't tell which."
thought tht-167: states no inference: "There was nothing here worth writing down." -> "{subject} had nothing to give on it, and I had half an hour less."
thought tht-168: states no inference: "Empty-handed again. It was not the first time, and it would not be the last." -> "I had asked {subject} and got nothing. That was an answer of a kind."
thought tht-e049: cut (a stranger gets no thought until there is something to think): "I knew the name. The face was new, and I looked at it a while."
thought tht-e050: cut (a stranger gets no thought until there is something to think): "Nobody had given me {subject}’s name yet."
thought tht-e051: cut (a stranger gets no thought until there is something to think): "{subject} was nobody to me yet, and that could change."
thought tht-e052: cut (a stranger gets no thought until there is something to think): "I had nothing on {subject}. Not yet."
thought tht-e013: plain terms: "in the wind": "It was not in the wind after all. {other} had been at {place}." -> "It was not lost for good after all. {other} had been at {place}."
thought tht-e025: plain terms: "sworn to": "{place}, at {time}, was the last place anybody had sworn to {victim} yet." -> "{place}, at {time}, was the last place anybody had put {victim} yet."
thought tht-e031: plain terms: "gone meant something else": "{place} at {time} was later than anybody had put {victim} before. If it was true, gone meant something else." -> "{place} at {time} was later than anybody had put {victim} before. If it was true, {victim} had not disappeared when I thought."
thought tht-e032: plain terms: "had {victim} gone": "At {time}, {victim} was at {place}, if the word was good. Whoever had {victim} gone earlier would have to think again." -> "At {time}, {victim} was at {place}, if the word was good. Whoever thought {victim} had disappeared earlier would have to think again."
thought tht-e021: the style metrics count "as far as" as a figure: "What I had on {victim} ran as far as {place}, at {time}. It stopped there." -> "What I had on {victim} stopped at {place}, at {time}. After that there was nothing."
thought tht-020: tagged case: murder (it speaks of a death)
thought tht-063: tagged case: murder (it speaks of a death)
thought tht-070: tagged case: murder (it speaks of a death)
thought tht-085: tagged case: murder (it speaks of a death)
thought tht-087: tagged case: murder (it speaks of a death)
thought tht-088: tagged case: murder (it speaks of a death)
thought tht-090: tagged case: murder (it speaks of a death)
thought tht-092: tagged case: murder (it speaks of a death)
thought tht-094: tagged case: murder (it speaks of a death)
thought tht-122: tagged case: murder (it speaks of a death)
thought tht-124: tagged case: murder (it speaks of a death)
thought tht-130: tagged case: murder (it speaks of a death)
thought tht-144: tagged case: murder (it speaks of a death)
thought tht-e002: tagged case: murder (it speaks of a death)
thought tht-e004: tagged case: murder (it speaks of a death)
thought tht-h038: tagged case: murder (it speaks of a death)
thought tht-h040: tagged case: murder (it speaks of a death)
thought tht-h074: tagged case: murder (it speaks of a death)
```

### establish, watch, return, activity, bridge, carry, answer, errand, hours

```
establish est-013: "{place} was on an upper floor of a residential hotel, the kind of building where the rent was paid by the week and the desk clerk didn't ask many questions. The door off the hallway looked no different from the others nearby. At this hour the hall lights had been turned down to save the current." -> "{place} was on an upper floor of a residential hotel, the kind of building where the rent was paid by the week and the desk clerk didn’t ask many questions. The door off the hallway looked no different from the others nearby. At this hour the hall lights had been turned down to save on the electric bill."
establish est-045: "{place} was the entry hall of the building, marble underfoot and a bank of brass mailboxes along one wall. At this hour the lobby was empty but for whoever was waiting on the car." -> "{place} was the entry hall of the building, marble underfoot and a bank of brass mailboxes along one wall. At this hour the lobby was empty but for whoever was waiting on the elevator."
establish est-057: "{place} sat under a hat shop, down six steps and through a door you had to knock on. At this hour most of the stools were empty." -> "{place} was an illegal bar under a hat shop, down six steps and through a door you had to knock on. At this hour most of the stools were empty."
establish est-058: "You got into {place} by the hat shop's side entrance, then down a narrow stair to a door with a slot cut in it. By day the street knew the shop as a place to buy a hat; after midnight it was something else entirely. Past midnight the room upstairs had long since gone dark." -> "You got into {place} by the hat shop’s side entrance, then down a narrow stair to a door with a slot cut in it. By day the street knew the shop as a place to buy a hat; after midnight the room under it sold liquor, which the law said nobody could. The shop upstairs had long since gone dark."
establish est-060: "The room under the hat shop, where {place} was, had no sign and needed none. A hallway from the street door ran back to the bar, dim on purpose. At this hour the tables at the back were the ones still occupied." -> "The room under the hat shop, where {place} was, had no sign and needed none: it sold liquor, and selling liquor was against the law. A hallway from the street door ran back to the bar, dim on purpose. At this hour the tables at the back were the ones still occupied."
establish est-065: "{place} ran up the middle of the building, bare bulbs on alternating landings, the rest left dark to save the current. At this hour the building had settled into the particular quiet of people sleeping four to a room." -> "{place} ran up the middle of the building, bare bulbs on alternating landings, the rest left dark to save on the electric bill. At this hour the building had settled into the particular quiet of people sleeping four to a room."
establish est-099: "{place} was the local's meeting hall, used for whatever the union needed a room for: votes, speeches, the occasional dance. Nobody minded who used the stairs once the day's business was done. This late the hall's own lamps were usually out, the room lit only from the street." -> "{place} was the union’s meeting hall, used for whatever the members needed a room for: votes, speeches, the occasional dance. Nobody minded who used the stairs once the day’s business was done. This late the hall’s own lamps were usually out, the room lit only from the street."
establish est-116: "The dance hall making up {place} kept its lights low for dancing and merciless for cleaning up after. By this hour it was well past the second. A single bulb over the bandstand was usually the only one still lit." -> "The dance hall making up {place} kept its lights low for dancing and merciless for cleaning up after. By this hour the last dance was long over. A single bulb over the bandstand was usually the only one still lit."
establish est-120: "The drugstore with the soda fountain, where {place} was, ran a single bulb over the register, the rest of the shop left half dark to save the current. At this hour it drew the kind of customer with a headache or nowhere else open." -> "The drugstore with the soda fountain, where {place} was, ran a single bulb over the register, the rest of the shop left half dark to save on the electric bill. At this hour it drew the kind of customer with a headache or nowhere else open."
establish est-129: "{place} sat under a row of trees along one side of the square, the kind of bench nobody owns and everybody uses. No one was posted to mind who sat there. At this hour the square around it was empty, the paths unlit past the nearest lamp." -> "{place} sat under a row of trees along one side of the square, the kind of bench nobody owned and everybody used. No one was posted to mind who sat there. At this hour the square around them was empty, the paths unlit past the nearest lamp."
establish est-131: "{place} was public in the plainest sense, open on every side, watched by no one in particular. A lamp at the corner of the square gave what light reached the benches at all. This late they sat empty more often than not." -> "{place} were public in the plainest sense, open on every side, watched by no one in particular. A lamp at the corner of the square gave what light reached them at all. This late they sat empty more often than not."
establish est-132: "{place} sat among the benches at the square's north end, facing a fountain that had been shut off for the season. Nobody minded who used them, at this hour least of all. The square was still enough to hear a step on the gravel path." -> "{place} stood at the square’s north end, facing a fountain that had been shut off for the season. Nobody minded who used them, at this hour least of all. The square was still enough to hear a step on the gravel path."
establish est-133: "{place} sat where the street ran out, the pavement giving way to a wooden apron and the water beyond it. No one was posted to watch who came down to it. At this hour the ferries ran on a reduced schedule, long gaps between crossings." -> "{place} sat where the street ran out, the pavement giving way to a wooden ramp and the water beyond it. No one was posted to watch who came down to it. At this hour the ferries ran on a reduced schedule, long gaps between crossings."
establish est-134: "You reached {place} by walking the street straight to its end, the slip itself unmistakable once you got there. A waiting room stood nearby, unlit and locked past a certain hour. Past midnight there was hardly anyone waiting on the next boat." -> "You reached {place} by walking the street straight to its end, the ferry landing itself unmistakable once you got there. A waiting room stood nearby, unlit and locked past a certain hour. Past midnight there was hardly anyone waiting on the next boat."
watch wch-002: "Nothing crossed that bar that {watcher} didn't clock." -> "Nothing crossed that bar that {watcher} didn’t notice."
watch wch-033: "{watcher} knew who lived where, and who visited whom, from running the car all day." -> "{watcher} knew who lived where, and who visited whom, from running the elevator all day."
watch wch-052: "A hack driver could tell a hurried fare from a patient one, and {watcher} noticed both kinds." -> "A cab driver could tell a hurried fare from a patient one, and {watcher} noticed both kinds."
return ret-005: tagged number: singular
return ret-014: tagged setting: indoor
return ret-018: tagged setting: indoor
return ret-022: tagged setting: indoor
return ret-025: tagged setting: indoor
return ret-031: tagged setting: indoor
return ret-034: tagged setting: indoor
return ret-037: tagged setting: indoor
return ret-040: tagged setting: indoor
activity act-020: "{name} was polishing the brass rail inside the car with a rag." -> "{name} was polishing the brass rail inside the elevator with a rag."
activity act-052: "{name} was scanning a folded page of quotations, a pencil marking a column." -> "{name} was scanning a folded page of stock prices, a pencil marking a column."
activity act-057: "{name} was checking a ticker tape pulled from a pocket." -> "{name} was checking a strip of ticker tape with the day’s stock prices on it."
activity act-084: "{name} was checking a list of names against a docket." -> "{name} was checking a list of names against the court’s calendar of cases."
activity act-111: "{name} was counting the day's take into a small box." -> "{name} was counting the day’s money into a small box."
activity act-113: "{name} was checking a ledger of accounts against a stack of unpaid cards." -> "{name} was checking a ledger of accounts against a stack of unpaid bills."
activity act-132: "{name} was counting a stack of notes into a coat pocket." -> "{name} was counting a stack of dollar bills into a coat pocket."
activity act-149: "{name} was checking a policy against a list of exclusions." -> "{name} was checking an insurance policy against a list of exclusions."
activity act-160: "{name} was leaning against a lamppost, a hook hanging from a belt." -> "{name} was leaning against a lamppost, a cargo hook hanging from a belt."
activity act-163: "{name} was sitting with a hook set on the table, turning a glass slowly." -> "{name} was sitting with a cargo hook set on the table, turning a glass slowly."
activity act-166: "{name} was sitting with a hook laid across a knee, working a knot loose from a length of rope." -> "{name} was sitting with a cargo hook laid across a knee, working a knot loose from a length of rope."
activity act-172: "{name} was going through a bundle of piecework, counting the pieces." -> "{name} was counting a bundle of finished sewing, paid for by the piece."
activity act-197: "{name} was checking a call sheet against a wristwatch." -> "{name} was checking the theater’s rehearsal schedule against a wristwatch."
activity act-198: "{name} was carrying a folded flat under one arm." -> "{name} was carrying a folded piece of stage scenery under one arm."
activity act-204: "{name} was counting a stack of call sheets into order." -> "{name} was putting a stack of rehearsal schedules in order."
activity act-225: "{name} was folding an agency's listing into a pocket." -> "{name} was folding a list of auditions from a booking agency into a pocket."
activity act-231: "{name} was checking a call sheet pinned to a mirror." -> "{name} was checking a rehearsal schedule pinned to a mirror."
activity act-232: "{name} was chalking a number on a slate, then rubbing half of it off." -> "{name} was chalking odds on a slate, then rubbing half of them off."
activity act-234: "{name} was checking a folded slip against a list." -> "{name} was checking a folded betting slip against a list."
activity act-242: "{name} was checking a list of names against a ward map." -> "{name} was checking a list of names against a map of the voting district."
activity act-243: "{name} was counting coal chits into a stack." -> "{name} was counting vouchers for free coal into a stack."
activity act-246: "{name} was counting a stack of tickets into a coat pocket." -> "{name} was counting a stack of raffle tickets into a coat pocket."
activity act-256: "{name} was weighing a ring on a small scale, checking the mark twice." -> "{name} was weighing a ring on a small scale, checking the maker’s stamp twice."
activity act-258: "{name} was checking a ledger of redemptions against a stack of tickets." -> "{name} was checking a ledger of what customers had bought back against a stack of tickets."
activity act-268: "{name} was folding a slip into a pocket without breaking stride." -> "{name} was folding a lottery slip into a pocket without breaking stride."
activity act-271: "{name} was going through a stack of slips, sorting them by number." -> "{name} was going through a stack of illegal lottery slips, sorting them by number."
activity act-273: "{name} was checking a slip against a list of numbers." -> "{name} was checking a lottery slip against a list of winning numbers."
activity act-275: "{name} was checking a ledger of plays against a column of numbers." -> "{name} was checking a ledger of lottery bets against a column of numbers."
activity act-276: "{name} was folding a stack of slips into a rubber band." -> "{name} was folding a stack of lottery slips into a rubber band."
bridge brg-k01: added: "If anyone knew where {subject} had been tonight, it would be {who}." {"tie": "victim"}
bridge brg-k02: added: "If anyone knew where {subject} had been tonight, it would be {who}, at {where}." {"tie": "victim"}
bridge brg-k03: added: "{who} would know where {subject} had been. That was the next question." {"tie": "victim"}
bridge brg-k04: added: "{who} was the one to ask about {subject}, and {who} was at {where}." {"tie": "victim"}
bridge brg-k05: added: "The next question was {subject}, and it was for {who}." {"tie": "victim"}
bridge brg-k06: added: "I wanted {who}’s word on {subject}. {who} was at {where}." {"tie": "victim"}
bridge brg-k07: added: "{subject} came next. {who} might know where {subject} had spent the evening." {"tie": "victim"}
bridge brg-k08: added: "{who} might know where {subject} had spent the evening, and {who} was at {where}." {"tie": "victim"}
carry cry-102: tagged setting: indoor
carry cry-103: tagged setting: indoor
carry cry-105: tagged setting: indoor
carry cry-107: tagged setting: indoor
carry cry-110: tagged setting: indoor
carry cry-113: tagged setting: indoor
carry cry-114: tagged setting: indoor
carry cry-116: tagged setting: indoor
carry cry-n01: tagged setting: indoor
carry cry-n02: tagged setting: indoor
errand err-061: tagged setting: indoor
errand err-064: tagged setting: indoor
errand err-065: tagged setting: indoor
errand err-068: tagged setting: indoor
errand err-070: tagged setting: indoor
errand err-072: tagged setting: indoor
errand err-073: tagged setting: indoor
errand err-075: tagged setting: indoor
errand err-088: tagged setting: indoor
errand err-089: "{name} had said as much. I came to run {subject} down." -> "{name} had said as much. I came to track {subject} down."
errand err-151: tagged setting: indoor
errand err-154: tagged setting: indoor
errand err-155: tagged setting: indoor
errand err-158: tagged setting: indoor
errand err-160: tagged setting: indoor
errand err-162: tagged setting: indoor
errand err-163: tagged setting: indoor
errand err-165: tagged setting: indoor
errand err-178: tagged setting: indoor
errand err-179: "Something written at {from} sent me. I came to run {subject} down." -> "Something written at {from} sent me. I came to track {subject} down."
errand err-241: tagged setting: indoor
errand err-244: tagged setting: indoor
errand err-245: tagged setting: indoor
errand err-248: tagged setting: indoor
errand err-250: tagged setting: indoor
errand err-252: tagged setting: indoor
errand err-253: tagged setting: indoor
errand err-255: tagged setting: indoor
errand err-268: tagged setting: indoor
errand err-269: "What was lying at {from} sent me. I came to run {subject} down." -> "What was lying at {from} sent me. I came to track {subject} down."
errand err-307: tagged number: singular
errand err-310: tagged number: singular
errand err-315: tagged number: singular
errand err-317: tagged setting: indoor
errand err-318: tagged setting: indoor
errand err-323: tagged setting: indoor
errand err-328: tagged setting: indoor
errand err-b017: tagged number: singular
errand err-b019: tagged number: singular
errand err-b020: tagged setting: indoor
errand err-b041: tagged number: singular
errand err-b043: tagged number: singular
errand err-b044: tagged setting: indoor
errand err-b065: tagged number: singular
errand err-b067: tagged number: singular
errand err-b068: tagged setting: indoor
hours hrs-002: "It had gone {hour}." -> "It was after {hour}."
hours hrs-007: "It was gone {hour}." -> "It was past {hour}, and later than I liked."
```

### place-ambient, search-act (after drafting)

```
place-ambient pam-065, pam-166, pam-205: opened on a participle ("Packed dirt made…", "Pressed tin…", "Riveted iron columns…"), which the fragment check reads as a subjectless verb; reworded.
place-ambient pam-103: "…the furnace next door thumped as the stoker fed it" invented a person; "…a furnace behind the wall thumped every so often".
place-ambient pam-218, pam-220: "apron", "the slip" -> "ramp", "landing".
search-act sac-039: "fence to fence" -> "starting along the fence" (plain terms reads the bare word as the trade).
thought tht-e021: "ran as far as" (counted as a figure by the style metrics) -> "stopped at".
```
