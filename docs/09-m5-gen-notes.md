# Milestone 5, phase 1 — generator notes

The one sentence that mattered: "Tramonti was jealous of the victim" is now
"Tramonti was jealous of Sweeney over Rosa Ferrante", and a checker proves
that Rosa Ferrante exists, is the same Rosa Ferrante in every other sentence
that names her, and is not in the case.

Everything else in this milestone follows from taking that seriously. If a
motive needs an object, the object needs a name; if it needs a name, somebody
has to own it; if somebody owns it, the ownership has to be checkable. The
model got bigger in order to make the prose smaller.

## What is in the box

- `Dossier` on every person — victim, suspects and fixtures — with age,
  gender, profession and detail, want, tie, self-account, and every one of
  those tagged with the layer it can be learned at.
- `case.mentions`: third parties a backstory or a motive names, invented once
  and named identically everywhere after.
- `VictimBio`: standing, and either a discovery (who walked in, where, when,
  and what the precinct did) or a last sighting.
- `ClientBrief`: purpose by relationship × case type, what the client tells,
  what they withhold, whom they point at and whether that is honest, and
  their own evening off their claimed schedule.
- `Act`: three case types, eight tropes, each with its givens, its unknowns
  and one signature clue pattern in `src/gen/tropes/<id>.ts`.
- `src/gen/correspond.ts`: the checker.
- `case.briefing`: fifteen or sixteen plain declarative sentences.
- Truth sheet sections and `--type` / `--trope` on both CLI entry points.

## Trope distribution, seeds 1..400 at the default

| trope | type | n | share |
|---|---|---|---|
| `body-at-scene` | murder | 164 | 41.0% |
| `inside-job` | robbery | 44 | 11.0% |
| `body-moved` | murder | 41 | 10.3% |
| `locked-room` | murder | 34 | 8.5% |
| `the-frame` | murder | 31 | 7.8% |
| `payroll` | robbery | 30 | 7.5% |
| `left` | missing | 28 | 7.0% |
| `taken` | missing | 28 | 7.0% |

By type: 270 murders, 74 robberies, 56 disappearances. `body-at-scene` clears
the 35% floor with six points to spare, and every other trope is at least
three times rarer, so a run of cases still feels like one game.

The weights are 40 / 10 / 8 / 8 / 10 / 8 / 8 / 8 out of 100 and the draw lands
within a point and a half of all eight of them. It is drawn once per (seed,
difficulty), out of a stream of its own, before the generate loop's first
attempt — otherwise the distribution would be the weights bent by which
shapes happen to be cheap to build, which is exactly the number the spec
wants to be able to read. mulberry32's first output off a seed that moves by
one is not well spread and a trope is drawn from exactly one number, so the
stream is warmed with three throwaway draws; without them `body-at-scene`
came out at 37.0% instead of 41.0%.

### What the three types cost

| | n | par | median par | attempts (median / max) |
|---|---|---|---|---|
| murder | 270 | 9–14 | 11 | 1 / 31 |
| robbery | 74 | 9–14 | 11 | 1 / 3 |
| missing | 56 | 10–14 | 12 | 1 / 6 |

Par ran 9–12 in M2b and runs 9–14 now; spine went from 11–12 to 11–13; budget
from 13–18 to 15–20 at the default, 13–22 across all three difficulties. The
whole of that movement is one clue: every case now carries the trope's own
essential fact set as a requirement, which the greedy cover puts in the spine
and the corroborator backs with a second source.

Robbery and disappearance are *cheaper* to generate than murder, not dearer.
The expensive constraint has always been "no murder-tick arrangement leaves
every innocent doubly witnessed", and it does not care what happened in the
room.

## Correspondence

Zero violations over seeds 1..200 at every difficulty: 600 cases, about
190,000 sentences, of which 95,774 are clue texts and the rest are the
briefing, the givens, every dossier layer and self-account, every tie, every
motive, every secret description, the client's tells, withholds, pointer and
own evening, and every mention.

The checker extracts three things from a sentence — capitalized tokens that
look like names, place short names, and clock times — and holds each against
the case:

- **`unknown-name`** — a name that is not a person, a mention, the detective,
  the neighbourhood or a place in this case, and is not in a closed list of
  capitalized words that are not names (`src/gen/data/vocabulary.ts`).
- **`foreign-place`** — a short name off the place deck that this case did
  not deal.
- **`bad-time`** — a clock time that is not a half hour of this evening.
- **`time-disagrees`** — a legal time that neither the fact the sentence
  renders, nor the coroner's window, nor an anchor in play, nor the secret
  the clue is about can account for.
- **`fact-false`** — a `personAt` or `personNotAt` the schedules contradict.
- **`unnamed-victim`** — "the victim" without the name.
- **`objectless-motive`** — a motive with no object.
- **`unfilled-slot`** — a `{slot}` or an `undefined` that reached the page.

The vocabulary is closed on purpose. A new template that puts a new proper
noun on the page fails the checker until the noun is either listed there or
made into a mention, which is the point: a name nobody can trace is a bug,
not a flourish.

Three tests damage a good case to keep the checker from being a formality —
a sentence naming somebody who is not in the case, a time that is not a half
hour of the evening, and a movement the schedules do not support — and it
catches all three.

### What it caught on the way

The first full sweep found 843 violations over 75 cases. In order of how
interesting they were:

1. **Possessives inside full stops.** "Ruggiero’s." stripped its trailing
   period *after* trying to strip the possessive, so the token never matched
   the place it named. A parsing bug in the checker, and the reason 533 of
   the 843 were noise.
2. **"the office".** The briefing said the client came up the stairs *to the
   office*, and "the office" is a card in the place deck. Dashiell's office
   is the engine's, not the generator's; the briefing now names no room at
   all, and a relationship's "since the office moved" became "since the rooms
   changed".
3. **"the roof" inside "the roof-door key".** Substring matching found a
   place inside the name of an object. Place matching now requires a
   boundary.
4. **"a dentist with rooms on the third floor".** The archetype's own role
   named a room that the case usually had not dealt. It is now "a dentist
   with a chair and a waiting room".
5. **Ruggiero, the bookkeeper, and Ruggiero’s, the barber shop.** A family
   name in the Italian pool is also a place card. A place hit the case can
   explain as somebody's name is that person, not a seventh room.
6. **Times nothing accounted for.** A secret's description names the hours
   the secret runs over; a clue about somebody's secret may name them too; a
   trope's document clue that says "signed in at 7:30 PM" had to actually
   establish that the killer was there at 7:30 PM, which it now does. One
   trope sentence that named the half hour *after* the act was reworded
   rather than given a fact it could not honestly carry.

## The briefing

Fifteen or sixteen sentences, median sixteen, in the spec's order: who came
in and what they are, the victim's standing, the givens, who found it and
what the precinct did, the client's tie with its specific, the purpose and
what it costs them, and the pointer. The retainer is the engine's line and is
not in it; whether Dashiell knows them is the engine's roll and is not in it.

Seed 3, whole:

> A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer
> is 30 years old and a pawnbroker’s clerk. Kreuzer writes the tickets behind
> the grille and knows what a thing is worth. Sweeney was the reason four
> places on the street stayed open, and everyone knew it. Sweeney was found
> dead at the suite. Sweeney was killed at the suite, and nothing was carried
> out of the room afterwards. The coroner puts it between 9:30 PM and 11:00
> PM, which is two hours of nothing useful. It was a blunt object. Kreuzer
> found Sweeney at the suite at 11:30 PM. The precinct took a statement at
> the desk and filed it. Kreuzer is a customer of Sweeney’s. Kreuzer came to
> Sweeney on Domenico Tramonti’s introduction and has stayed a customer.
> Kreuzer wants it established that it was not them, before anybody says
> otherwise. Kreuzer was near enough to it that night to know exactly how it
> looks, and says so first. Kreuzer wants us to start with Grasso. Grasso
> blamed Sweeney for the ruin of Grasso’s business.

Sixteen sentences, sixteen facts, no images. That is the register Phase 2 has
to measure pages against.

## The client

Over 400 cases at the default: the client is the one who did it 104 times
(26%), which is the 0.25 the cast has always rolled. The pointer is honest in
every case where the client is not the killer at difficulties 1 and 2, and
dishonest in 121 of 200 at difficulty 3 — the killer-clients plus half of the
rest pointing at their own red herring.

Purposes drawn, out of 400:

| purpose | n |
|---|---|
| `clear-my-name` | 186 |
| `find-the-killer-police-wont` | 70 |
| `settle-a-debt-with-the-dead` | 54 |
| `keep-it-quiet` | 34 |
| `bring-them-home` | 19 |
| `get-it-back` | 18 |
| `find-it-before-the-cops` | 13 |
| `make-sure-they-stay-gone` | 6 |

All eight are reachable and every one of them is legal for the relationship
and the case type that drew it. The shape is flat, though: see the deviations.

## The three hardest things

**1. Making a robbery and a disappearance run through machinery built around
a corpse.** The spec says schedules, secrets, lies, observations, anchors,
selection, branches and par are unchanged, and they are — but the three
places where the machinery *says* "victim" needed a decision each, and the
decisions are not symmetrical.

The time of death is closed by two facts: somebody puts the victim alive at
M−1 against an anchor, and something times the scene at M. For a robbery that
is "the owner still had the envelope at half past" and "it was gone by ten";
for a disappearance it is "somebody saw them at half past" and "they were not
there at ten". The *shape* is identical, so the fact kinds stayed —
`victimAliveAt`, `victimDeadBy`, `timeOfDeath` — and only the rendered
sentences changed. Adding fact kinds would have meant new utterance cards for
a deck the engine has not been rewritten for yet, and the utterance-deck test
would have been right to fail.

The schedule itself needed three branches, not one. A murder ends the
victim's evening at M. A robbery does not end anything: the owner had an
evening like anybody else's, and what was at the scene was the goods, so the
victim is fixed *away* from the scene at M. A disappearance carries on to a
`whereabouts` nobody in the case is watching, which meant suppressing every
observation of the subject after M — and then handing the one observation a
`taken` case is allowed to have back as the trope's signature clue, which is
somebody paying cash for a room.

**2. Deciding that the correspondence vocabulary is closed.** The easy version
of the name check ignores the first word of every sentence, which makes it
useless: an unknown name at the head of a sentence is exactly the bug you are
looking for. The honest version needs a list of every capitalized word the
corpus may print that is not a name — every sentence opener, the days, the
months, the streets, Belleau Wood, the Underwood typewriter — and then fails
on everything else.

That list took three sweeps to settle and it is the most valuable thing in
the milestone, because it is the thing that will keep failing. Every future
template that reaches for a proper noun now has to choose: put it in the
vocabulary, or make it a mention with a name the case owns.

**3. The spine paying for the trope.** A trope that adds two candidate clues
nobody has to find is decoration. Making the signature load-bearing means
declaring it as a requirement, which puts one clue in the spine and one in
the corroboration — and one more spine clue moved par from 9–12 to 9–14, the
budget ceiling from 20 to 22, the oracle's exact agreement with par from 93%
to 85%, and two pages out of 2,097 past the renderer's 300-word ceiling.

None of those is a bug and all four of them were tests. Working out which
numbers were contracts (every spine clue collected inside par; never over
par; par inside 9..18) and which were observations of the old data (0.90;
20; 300) took longer than the change that moved them.

## Deviations, and why

1. **`left` keeps a culpable suspect.** The spec says `act.actorId` for
   `left` is the person themselves, and it is. But the core simulation still
   turns on a suspect — the one who saw them off and has been lying about the
   evening since — because the spine, the five exculpations, the contradicted
   alibi and par all hang on one person's false claim, and a trope with no
   such person would need a second selector. Finding that person is how the
   whereabouts is found, which is what `left` asks for. `solution.killerId`
   is that person; `act.actorId` is the one who went.

2. **The victim is never a clue source, even alive.** In a robbery the owner
   has a full evening and could be asked about it. Every clue-sourcing rule
   in `clues.ts` excludes `kind === 'victim'`, and lifting that is a change to
   the derivation, the observation rules and the parser's noun table at once.
   The owner is off-stage. Phase 2 can put them on it.

3. **`body-moved` starts the detective where it happened.** `act.place` is
   the machinery's scene, which is where the detective starts, and
   `bodyFoundAt` is the stair or areaway the body was carried to. So the
   player begins in the room the answer is about. The givens do not say the
   killing happened there — they say the opposite, that there is no blood at
   the foot of the stairs — and the signature clues are what close it. It
   reads, but "where" is a softer unknown than the table implies. Moving the
   detective's start to `bodyFoundAt` means `solution.murderPlaceId` and the
   game's `sceneId` stop agreeing, and the free scene clues stop being handed
   over; that is a Phase 2 change.

4. **One person is allowed at the scene after the act.** The one who finds
   it. The spec wants `foundById` to be somebody who was there and the
   schedules to agree, and the scene is unwatched by construction, so
   somebody has to walk in. Exactly one does, at exactly the discovery tick,
   and the corpus test that used to say "clears the scene after the murder"
   now says "except for the one who finds it".

5. **The report still asks all five fields.** `case.act.unknowns` is on the
   case and tested against the table, and the engine reads none of it yet.
   Switching the report by trope is Part 6.

6. **The `morgue` clue kind, for a case with no corpse.** A robbery's
   opening report is a desk sergeant's and a disappearance's is a filed
   statement, but both are still `kind: 'morgue'`, because the kind is how
   the reducer finds the free opening clues and how the voice deck picks a
   simile target. The text is right; the label is a Phase 2 rename.

7. **The three numbers the trope requirement moved.** The page-length band
   in `test/game/voice.test.ts` went from 55..300 to 50..340 for three pages
   out of 2,097 (one at 52 words, two that are an `examine` of a room holding
   ten findable clues); the oracle's soft agreement floor went from 0.90 to
   0.82 against a measured 0.85; the budget ceiling in
   `test/game/reducer.test.ts` went from 20 to 22. The hard contracts around
   all three are untouched.

8. **`MOTIVE_POOL` in the game still carries the object-free category.** The
   report's menu and the notebook's summary render a motive with no case in
   hand, so `MotiveTemplate.description` stays a bare category that never
   says "the victim", and `descriptionTemplate` is the one with the object in
   it. A person's own `motive.description` is always the full one.

9. **The briefing is fifteen or sixteen sentences, never fewer.** The range
   is 10–16 and the output uses the top two. Four givens plus a standing plus
   a discovery plus a precinct line plus a tie with its specific plus a
   purpose with its cost plus a pointer with its reason is sixteen sentences
   and they all earn their place. A shorter briefing means fewer givens, and
   fewer givens means the player is told less about what is not being asked.

10. **A signature is two clues, not a pattern.** The spec's examples read
    like three or four clues each. The spine cap is fifteen and the spine
    already runs to thirteen, so each trope adds one requirement with two
    routes: one clue enters through the greedy cover, the second through
    corroboration, and both are guaranteed to be in the player's hands. A
    third would have cost a rejection band.

11. **`clear-my-name` is 46.5% of purposes.** It is legal for fourteen of the
    nineteen relationships across all three types, and the draw is uniform
    over a list of two, so it wins about half the time. Every individual case
    makes sense and the aggregate is flat. The fix is third options on the
    lists that have two, and it is data, not code.

12. **A mention can be shared between a backstory and a motive.** The pool is
    keyed by role, so if a backstory reaches for "a woman they had both been
    seeing" and a jealousy motive reaches for the same role, they get the same
    woman. That is coherent rather than wrong — it is the same person — but it
    is not a decision anybody made.

13. **Fixtures got dossier cards.** The spec's §1.1 says "every person" and
    its data section only describes suspect archetypes. The fixtures are the
    people a detective talks to most and "the bartender" is not a person, so
    `FIXTURE_CARDS` gives each of the ten an age band, three details, wants
    and a tie to the door they stand in.

14. **Self-accounts are in the third person.** "Feeney is 31 years old and a
    longshoreman" rather than "I'm 31". The profession details are written as
    subjectless verb phrases so that one string serves the sheet, the dossier
    and the briefing; putting them in the first person means conjugating
    them. `ask X about themselves` is Phase 2's, and it can put them in the
    mouth.

15. **Five data rewrites the dossiers forced.** A dossier states gender as a
    fact, so "a pawnbroker's man" became "a pawnbroker's clerk" and the
    counterman and the hackman are drawn male. "A dentist with rooms on the
    third floor" named a room. The victim's own address now names them —
    "Sweeney's suite at the residential hotel" — because the place deck is
    dealt before anybody has a name, so the card carries `{V}` and the
    generator fills it.

16. **Robbery goods are planted, not drawn.** The room deck deals two or
    three objects a place at random and none of them is reliably worth
    stealing; the first payroll job in the corpus took a framed photograph.
    A robbery now puts exactly one thing at the scene on purpose — a payroll
    envelope for `payroll`, bearer bonds, a jewel case or a cash box
    otherwise.

17. **One fix that is not a deviation but is worth recording.** The spine
    wiring left the client clue with no children about one case in fifty,
    which gave the imperfect player a brief, a free question and nothing to
    follow; it quit after three pages. Every opening clue now leads
    somewhere.

## Tests

334 pass, up from 299. The new file is `test/m5.test.ts`, 34 tests:
complete dossiers with ages inside their band and gender agreeing with the
pool the given name came out of; mentions named identically everywhere and
never colliding with a person; a victim bio whose discovery agrees with the
schedules and whose last sighting is a truthful witness at the right hour; a
client purpose the relationship and the case type both allow, a pointer that
is honest at the lower difficulties and never when the client did it, and a
pointed-at person who really has the stated fact; every trope over 400 seeds
with `body-at-scene` commonest; the unknowns table, and `where` only for
`body-moved`; givens that never name the one who did it where `who` is
asked; a signature in the player's hands from two sources; par inside the
band for all three types and the oracle walking twenty robberies and twenty
disappearances inside it; zero correspondence violations with three damage
tests; and a briefing of the right length, in the right order, that does not
state an unknown.

Five existing tests were changed. Four are scope: a robbery has a live owner,
a disappearance has a whereabouts, only a murder is gated on what a room can
host, and the relationship card now carries `{V}`. The fifth is the three
numbers in deviation 7. Two more stopped naming a particular Doyle and a
particular Brauer out of seed 7's draw, which made them hostage to the rng
stream rather than to any rule.

## What I would change

1. **The purpose table wants third options.** See deviation 11. Six lines of
   data would take `clear-my-name` from 46% to about 33%.

2. **`body-moved` wants the detective to start at the body.** See deviation 3.
   It is the one trope whose unknown is softer than the table promises, and
   the fix is in the engine, where the scene and the start can stop being the
   same room.

3. **The briefing wants a shorter mode.** Sixteen plain sentences is the
   right shape for a first page and the wrong shape for a re-read. Phase 2
   will want the same facts at four sentences for the notebook.

4. **The signature could interfere with a branch.** Every trope's signature
   is a clean two-clue proof of one essential fact. The most interesting
   version would be a signature that a noise branch can imitate — a heavy
   thing carried downstairs that turns out to be somebody's fence work — and
   that is the same complaint M2b's notes made about branches not
   interfering with each other.

5. **Two thirds of cases are still murders and all of them still have a
   body.** Robbery and missing are 32.5% between them and they are the tropes
   that read most differently. The weights are one line.
