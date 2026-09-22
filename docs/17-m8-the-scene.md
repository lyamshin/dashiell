# M8 — The scene

Every page after the office has to answer four questions: where am I, who is here, what are they doing, and what does the detective make of it. And the reason the detective came has to run through the page, not just sit at the top.

The target is `docs/golden/seed3-night.md`, blessed 2026-09-22. Read it before anything else, including its ten rules. The office page keeps its own golden and is out of scope, except where noted.

The designer's rulings:

1. **Pages may be longer.** People scroll. It's mostly a story: a fancy choose-your-own-adventure.
2. **The errand line is useful and must extend into the narrative.**

## 1. The page is planned before it is written

Today a page is built by dealing cards into slots and cutting when it runs long. Replace that for every page after the office with a **planner**. It takes the action, the state before and after, and the case, and produces an ordered list of beats. Each beat carries its data. Prose realization then renders each beat from cards and templates.

```ts
type Beat =
  | { kind: 'errand'; ... }        // why the detective is doing this (§2)
  | { kind: 'establish'; ... }     // what the place is, first visit (§3)
  | { kind: 'return'; ... }        // one line for a return visit (§3)
  | { kind: 'presence'; ... }      // who is here and what they are doing (§4)
  | { kind: 'act'; ... }           // what the detective does: the search, the question
  | { kind: 'find'; ... }          // what the world shows, one per clue, with its source
  | { kind: 'exchange'; ... }      // dialogue for an ask, the answer in the witness's mouth
  | { kind: 'thought'; ... }       // what the detective makes of it (§5)
  | { kind: 'bridge'; ... }        // the next lead, named, and why (§6)
  | { kind: 'answer'; ... }        // what came of the errand, when no find says it (§2)
  | { kind: 'clock'; ... }         // the hour line, two calls left, the last call
  | { kind: 'texture'; ... };      // weather, ambient, similes: the only cuttable beat
```

Beats carry a `required` flag. The page renders every required beat. Texture is optional and is the only thing cut.

The planner is pure and testable without prose. Tests assert beats, not sentences.

### Page shapes

| action | beats, in order |
|---|---|
| go, first visit | clock?, errand, establish, presence, finds (the scene's free opening), thought?, bridge?, answer |
| go, return | clock?, errand, return, presence, answer? |
| search | clock?, errand (carry form), act, finds, thought, bridge?, answer |
| ask | clock?, errand (carry form, only if the question does not carry it), exchange (question, answer), finds, thought, bridge?, answer? |
| repeat (free) | a one-line note that it was already done, then the notebook's record |

Texture may be interleaved where the golden puts it: the establish paragraph can hold the weather, and the presence paragraph can hold one ambient detail.

## 2. The errand runs through the page

- **Every action page opens with its reason.** Moves already do this since M6. Searches and questions at the same place now get a **carry** line: one sentence of why this search or this question, from the lead that points at it, or "No one sent me to it" for an unmarked choice. Golden page 3: "The precinct had looked at Sweeney. I wanted to look at the room."
- **When the question carries its own reason,** as in golden page 5 ("Sweeney had a secretary. Hanrahan."), the carry line is dropped. Do this whenever the ask's topic is the lead's subject and a relation to the victim is known.
- **The page answers its errand.** The `answer` beat closes the page when no thought already has. It says one of three things:
  - found what I came for;
  - didn't, and the lead was a dead end (say so plainly);
  - didn't, but found something else.

  Derived from whether the errand's target clue is among this page's finds.

## 3. The place

On the first visit to a place, one **establish** paragraph says:

- what the place is and what kind of place it is;
- how you get in;
- what it is at this hour;
- how the weather has emptied or filled it;
- whose it is, if the case says (the victim's address, a suspect's rooms, a watcher's post).

The paragraph comes from an establish card keyed by place template, plus a watch clause keyed by the place's watcher. An unwatched place reads as "nobody minds who uses the stairs." A watched one names the watcher.

A **return** visit gets one line from a return card.

**The scene** has a body at it for every murder trope where the body is at the scene, and the presence beat must say so. "Nobody in here but the furniture" with a body on the rug is a bug. The body stays all night. Robbery and missing cases have their own scene lines.

## 4. The people

Everyone present at arrival gets a **presence** line: their name, and one activity drawn from their trade, the place and the hour band. The activity is chosen once per visit and stored in run state, so the next page at the same place says it again only if it changes. It changes when the person is spoken to: they stop what they're doing.

- **First sight of anyone:** their name, sex and rough age from layer 0, and one clause of why they matter:
  - a watcher watches the room;
  - the client is the client;
  - someone the notebook knows gets their relation to the case.
- **Recall phrases** (the coin) appear at most once per visit, as something the person does, never as an epithet. Remove every epithet construction of the form "X, the woman with the …".
- **No subjectless fragments.** "Smoothed her skirt and glanced once at the door." as a sentence is a bug.

The **detective's view** of a person is part of the thought beat on arrival. It's one sentence, drawn from the person's relation to the case, their temper, and whether they have lied yet.

## 5. The thought

This is the heart of the milestone. After the finds, the detective says what they mean. The thought is **derived** from the structured facts each clue establishes (`Establishes` in `src/gen/types.ts`), the clue's kind and source, and the notebook. It is never cut.

Thought classes, at minimum. Each maps from clue facts plus state, and each has its own card deck key:

| class | when | golden example |
|---|---|---|
| `clears` | a placement puts a person elsewhere at the crime's half hour | "If Hanrahan was on Ninth Street at ten, she wasn't in the suite when the El went over." |
| `implicates` | a placement puts a person at or near the scene at the crime's half hour, or a means or access fact | |
| `observer-placed` | an observation clue at a tick where the truth puts the observer at that place. **Only if the truth timeline confirms it.** | "which put Kreuzer on Ninth Street at ten o'clock too" |
| `unmentioned` | follows `observer-placed` when the observer is the client and the office page didn't include it, or the person's told account omits it | "She had sat at my desk for half an hour and never mentioned it." |
| `contradicts` | a clue contradicts a person's claimed account | |
| `motive` | a motive fact | |
| `method` | method evidence | |
| `window` | time of death, or an anchor inside the coroner's window | "Kreuzer had given me two hours. The El might give me the minute." |
| `not-robbery` / `robbery-shape` | an `objectMissing` fact or its absence at the scene | "So it was a fight, and it was not a robbery." |
| `secret` | a secret explained: it's theft, and it's not murder | |
| `dead-end` | a disqualifier closes a branch | |
| `context` | noise that establishes nothing | a short, honest "It didn't touch Sweeney that I could see." |
| `nothing` | no find | "Half an hour, and nothing to show for it." Only on pages with no find. |

The robbery and missing case types need their own classes where the facts differ. Derive them from their fact kinds in the same way.

Thought lines are statements of inference and must pass the correspondence checker. Each thought traces to the clue facts and state that licensed it. A thought may say "if" and "would". It may never assert a fact the notebook doesn't hold.

## 6. The bridge

When a find opens a lead, the page names the next lead and says why, in terms the reader already has. Golden page 3: "A man in Sweeney's line keeps a secretary, and a secretary knows who has an appointment. His was a woman named Hanrahan. Kreuzer would know where Hanrahan had been tonight."

Build it from the lead's target clue:

- **Who to ask:** the source.
- **What about:** the subject.
- **Why this subject matters:** the subject's relation to the victim (`relationship` from the cast), to the place, or to the time.
- **Where the source is:** where the person to ask will be found, if the notebook knows.

Revealing the subject's relation to the victim in a bridge is allowed. It is the minimum reason the lead exists.

At most one bridge per page. If a page opens several leads, bridge the one on the spine, else the first. The notebook lists the rest.

The next page's errand line should agree with the bridge. When an errand's lead was bridged on an earlier page, the errand card can be the short form ("Kreuzer would know where the secretary had been").

## 7. Continuity

- **Nothing from the previous page leaks.** The client's exit line ("The speakeasy. That's where I'll be.") belongs to the office page's close, not to the top of the next page.
- **Hour texture agrees with the clock.** No "Four in the morning is when a man reads his own handwriting" at 2:05. Every card that names an hour or a part of the night is tagged, and the engine filters by the clock.
- **No unexplained names.** Anyone named gets one clause saying who they are, the first time they're named on a page. That includes mentions (Thorndike) and fixtures ("the old woman").
- **Clue sentences are never pasted raw.** The generator's sentence ("It is under the radiator, where things go…") is the notebook's record. The page dramatizes it as a find with its source, in past tense.
- **Sign-offs fit the listener.** "Don't leave town on my account" is never said to the client.

## 8. Length

- The 220-word ceiling goes. Night pages have no hard ceiling below 600 words. The target is what the golden runs to: about 180 to 280 words for a search or a question, and 220 to 350 for a first arrival.
- `CUT_ORDER` becomes texture only: similes, then ambient, then weather. Required beats are never cut.
- Revisit `WORD_TARGET_HIGH` and the one-simile gate so longer pages don't bring back figures. The golden has at most one figure a page.

## 9. Decks

Eight new decks. Card shapes follow `content/deck-schema.json`. The tag vocabularies below are fixed so the content can be written in parallel. The engine may add a tag but must not rename one.

| deck | keyed by | slots | count target |
|---|---|---|---|
| `establish` | `place`: every place template id in `src/gen/data/places.ts`, plus `office`. `visit`: `first`. | `{watcher}` (name, may be absent), `{owner}` (whose place, may be absent) | 4 per place |
| `watch` | `watcher`: every fixture role, and `none` | `{watcher}` | 6 per value |
| `return` | `placeKind`: `public`, `semi`, `private`, `scene` | `{place}` | 10 per kind |
| `activity` | `role`: every suspect archetype id and fixture role. `placeKind`: `public`, `semi`, `private`. `band`: `after-midnight` (12:00–2:59), `small-hours` (3:00–5:59), `dawn` (6:00–8:00). | `{name}`, `{place}` | 3 per role and place kind, with band on at least a third |
| `thought` | `class`: the classes in §5 | per class: `{subject}`, `{place}`, `{time}`, `{source}`, `{victim}`, `{other}` | 12 per class |
| `bridge` | `tie`: `victim`, `place`, `time` | `{who}`, `{subject}`, `{tie}`, `{where}` | 15 per tie |
| `carry` | `for`: `ask-person`, `ask-thing`, `ask-place`, `ask-evening`, `ask-self`, `search-room`, `search-thing`. `lead`: `yes`, `no`. | `{who}`, `{subject}`, `{name}` (who sent me) | 10 per pair |
| `answer` | `outcome`: `found`, `dead-end`, `something-else` | `{subject}`, `{name}` | 12 per outcome |


**Voice for all of them:** the golden's rules, and the office golden's ten rules. Plain register first. At most one figure a card, and most cards none. The detective's gender is never stated. Slotted people vary in gender, so never use a pronoun for a slotted person. Each card must read correctly for every value its slots can take.

## 10. Measurement

- Extend the golden loop harness to night pages: seeds 1–40 at Precinct, oracle route, pages 2 to 8. Targets come from measuring `seed3-night.md` pages with `scripts/style-metrics.py`, per page shape. Record them in `docs/golden/GAP.md` beside the office targets.
- **Beat coverage.** A mechanical check over the same run: every page has every required beat for its shape; no epithet constructions; no subjectless fragments; no hour texture that disagrees with the clock; no name without a clause on its first appearance on a page. The target is 100 percent, and it's a test.
- The correspondence checker passes with zero violations, thoughts and bridges included.
- The office page must not regress. Its harness numbers stay within 0.02 of today's.

## 11. Tests

- The planner emits the shapes in §1 for every action over forty seeds, three difficulties, and all case types.
- Thoughts: each class fires on a constructed case where it should and never where it shouldn't. `observer-placed` never fires when the truth timeline doesn't put the observer there.
- Bridges name only leads that are actually open, and the subject is a person the notebook now knows.
- The activity chosen for a person is stable across pages in one visit.
- The body is present at the scene in every body-at-scene trope.
- Every page has every required beat, and no required beat is cut.

## 12. Out of scope

- The office page's prose, which is already honed.
- The choice UI, except that a turned-back page still shows its choices.
- Tiers and generation.

## Build plan

- **Opus, engine:** §1 through §8, §10 and §11. Branch `m8-scene`. It creates the eight deck files with placeholder cards (at least two per reachable key, `status: placeholder`) and their schema entries, so the build and tests run.
- **Sonnet, content, in parallel:** writes the eight decks in the shapes of §9 into `content/drafts/scene/*.json` on branch `m8-scene-content`, never touching `content/decks/`. After the engine lands, a short integration step moves the drafts into `content/decks/`, validates them, and reruns the harness.
