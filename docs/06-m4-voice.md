# Milestone 4 — Voice: The Page Becomes a Scene

The M3 book works and reads thin. Every page is a record with a hat on: a witness card, a database row with names in it, a simile. The information-to-texture ratio is about 90/10. Hammett's is closer to 30/70. Nothing happens on the page. Nobody lights anything, nobody crosses a room, no time passes, and Dashiell never thinks.

This milestone changes what a page *is*. The generator does not change. The notebook takes the record. The page becomes the scene.

Three decisions already made:

1. **Dashiell talks.** He is a character, thin but present, with his own lines. He may evolve across runs later; design so his roll can be seeded from persistent state without changing anything now.
2. **Dashiell has a life, rolled at initiation.** Circumstance, relationship state, and which people in this neighborhood already know him, weighted by role. Knowing someone is texture and a small mechanic.
3. **Character depth varies.** Every person rolls a temper: enigma, plain, or yap.

Two tracks run in parallel against the schemas in this document: **the engine** (Opus, `src/game/voice/`) and **the content** (Sonnets, `content/decks/`). The engine must run with thin decks and degrade gracefully; the content must validate against the schemas without the engine.

---

## Part A — The engine

### A.1 The record moves to the notebook

The clue's flat `text` is no longer rendered on the page. It is rendered in the notebook under the person or place it came from, verbatim, at the moment it is found. The page dramatizes the same fact. Fairness is preserved because the notebook is always one click away and is the authoritative record.

The page must still contain the fact in some spoken or narrated form, so a player who never opens the notebook is not cheated. See A.5.

### A.2 The roll

At run start, after the case is generated, roll Dashiell's situation with the run seed (deterministic per seed):

```ts
interface DashiellRoll {
  circumstance: 'behind-on-rent' | 'flush' | 'hungover' | 'bruised' | 'off-a-divorce-case' | 'sleepless' | 'just-paid';
  relationship: 'none' | 'someone-waiting' | 'someone-who-left' | 'complicated';
  knows: Record<Id, Acquaintance>;   // personId -> how Dashiell knows them
}
interface Acquaintance { how: 'regular' | 'did-a-job-for' | 'grew-up-with' | 'owes-me' | 'i-owe' | 'old-flame'; warmth: -1 | 0 | 1; }
```

Acquaintance probabilities by role. Fixtures: bartender 0.5, doorman 0.4, beat-cop 0.4, newsstand 0.4, cabbie 0.35, elevator-man 0.3, counterman 0.3, druggist 0.2, landlady 0.2, ticket-taker 0.15. Suspects by archetype class: underworld 0.25, working 0.15, professional 0.10, money 0.05. `old-flame` is only possible for a suspect, only when `relationship` is not `none`, at most one per run, and it may land on the killer.

Mechanics of knowing someone:

- They use Dashiell's name. Dialogue frames use the `familiar` register.
- **The first `ask` to a person who knows Dashiell is free.** Par is unaffected; this is unearned slack and should feel like luck.
- **Bias.** The reactive monologue (A.6) discounts evidence against an `old-flame` or `warmth: 1` acquaintance until the contradiction is undeniable (two independent facts against their claim). Until then it rationalizes. After, it turns. This is the narrator-being-wrong mechanic and it must be *visible* in the prose, not just a flag.

Circumstance and relationship feed the ambient monologue and the asides deck. They never touch the mystery.

### A.3 Temper

Every suspect and fixture rolls `temper: 'enigma' | 'plain' | 'yap'` at case start, weighted by archetype (a ward heeler yaps; a seamstress is plain; a nurse may be an enigma). Fixtures lean plain. Weights live in a data file so a writer can tune them.

Effects:

- **Enigma.** Answers in one clause. Little business. The fact lands in the fewest words the utterance deck allows. Dashiell's monologue fills the page. Enigmas require the exact topic (they do already).
- **Plain.** The default shape.
- **Yap.** Long answers, extra business, colour about people who aren't in the room. **Once per run, a yapper volunteers one findable clue from their own topic buckets that the player did not ask for.** Prefer a noise clue. Deliver it on the same page, after the asked-for fact, and record it in the notebook like any other. This is how noise enters a conversation.

### A.4 Portraits

At case start, every person gets a portrait: `{ trait, habit, clothing }`, each a card from the portraits deck filtered by gender hint, class, and role. Assigned once and reused every time the person is on the page. Consistency is what makes a stock description feel authored. The first appearance uses all three; later appearances use one, chosen to vary. Portraits burn across runs.

### A.5 The page grammar

A page is assembled from slots. Not every slot fires on every page; the engine picks by action type, temper, roll, and time. Target 120–250 words per page, sentences median 10 words.

| slot | fires when | source |
|---|---|---|
| **transition** | every action that costs time | transitions deck, by hour band |
| **arrival** | `go` | arrivals deck, by place kind × hour band × weather |
| **place** | first `look` at a place | places deck (now including unwatched and empty rooms) |
| **presence** | arrival, look | portraits of who is here, one component each |
| **approach** | `ask` | business deck, by role or temper: what they're doing when Dashiell speaks |
| **exchange** | `ask` | dialogue frames × Dashiell's lines × utterances (below) |
| **volunteer** | yap, once per run | a second exchange with the volunteered clue |
| **find** | `examine` | find frames: how the object or trace is come upon |
| **reactive monologue** | whenever the established board changed | derived templates, see A.6 |
| **ambient monologue** | when the page is short, or every third page | ambient deck, by hour band × case state × circumstance |
| **aside** | at most once per hour band | asides deck, by relationship × circumstance; burns per run |
| **simile** | at most one per page, intensity 3 once per run | similes deck |

**The exchange** is the heart. It is built from three decks:

- **Dashiell's lines**: how he opens ("Brauer," I said.), how he asks about a person / a place / an object / that evening / why I was hired, how he follows up, how he closes. Keyed by `familiar` vs `stranger`.
- **Dialogue frames**: the shape of the answer by register (`truth` / `evasion` / `lie`) × temper × familiar. A frame is 2–5 beats with a `{fact}` slot, `{business}` slots, and optional `{colour}` slots. Truth is short. Evasion answers a different question first. A lie is too complete.
- **Utterances**: the fact itself as speech, keyed by `Fact.kind` × temper, with slots for `{subject}`, `{place}`, `{time}`, `{object}`. "Eight o'clock, about. Had the one and left before the second round." A denial has its own utterance shapes. Documents and physical clues use `find` frames instead.

Register is chosen as M3 does: fixtures `truth`; a suspect delivering a clue is `evasion` if they are lying about the tick it concerns, else `truth`; a suspect giving their own claimed timeline is `lie` on the lied-about ticks and `truth` elsewhere.

**The player never loses information.** If no utterance fits a fact, the engine falls back to the flat clue text as a spoken line in quotation marks. Log the fallback so the content team can see the gap.

### A.6 Reactive monologue

Derived from the established board, not from decks. Templates with slots in `src/game/voice/reactive.ts`, several variants each:

- A person's claim is contradicted by one fact (mild: "That wasn't what Carbone had said. I let it sit.")
- Contradicted by two independent facts (hard: the story is dead)
- The time-of-death window narrowed
- A secret explained (a red herring knocked down)
- **The leading theory**, stated as fact in Dashiell's voice: the suspect with the most facts against them so far. This will often be wrong, and that is the point. Recompute per page; when it changes, say so ("I had been looking at the wrong man.").
- **Bias** (A.2): for an old flame or a warm acquaintance, the mild-contradiction template rationalizes instead; only the hard template turns.
- Clock pressure: at fewer than four actions left, the monologue notices.

### A.7 Transitions and the investigation night

Every costed action produces one transition line keyed to the hour band (midnight–2, 2–4, 4–6, 6–8). The case's anchors are reused as ambiance: the El, the beat cop's pass, the milk wagon, chairs going up. This is free variety and it teaches the player the anchors exist.

### A.8 Burn tiers

- **Never repeat across runs** (burn in localStorage until exhausted, then reshuffle): similes, portraits, asides.
- **Never repeat within a run**: dialogue frames, place cards, ambient monologue, arrivals.
- **May repeat**: transitions, business, Dashiell's lines, utterances.

### A.9 The transcript tool

`npm run read -- --seed 7 [--difficulty 2]`: plays the oracle through the case and prints the entire run as prose, page by page, exactly as a player would read it, with the notebook state at the end and the filed report. This is how the designer reads a run without playing it. Also `--random` for a plausible imperfect player who follows some noise branches.

### A.10 Engine deliverables

- `src/game/voice/` replacing M3's `voice.ts`: roll, temper, portraits, page grammar, exchange builder, reactive monologue, burn tiers, fallback logging.
- Notebook renders flat clue text per source; page does not.
- Card loader validates every deck file against the schemas in Part B at startup and reports counts and gaps (which tag combinations have zero cards).
- Placeholder cards: enough hand-written cards in every deck (5–10 each) that the engine demonstrably works before the content lands. Mark them `status: 'placeholder'`.
- Tests: roll determinism; temper weights; portrait consistency across pages; every fact kind has an utterance or falls back; page word counts within 80–300 for 100 oracle runs; burn tiers honoured; free first ask for acquaintances; yap volunteers exactly once; bias flips only on two facts; transcript tool runs for seeds 1–20.
- `docs/06-m4-engine-notes.md`.

---

## Part B — The content

### B.1 Schema

All decks are JSON arrays of cards. Extend M3's `Card`:

```ts
interface Card {
  id: string;                       // deck prefix + zero-padded number
  deck: DeckName;
  text: string;                     // may contain slots
  tags: Record<string, string | number>;   // per-deck, below
  avoidNear?: string[];
  status: 'generated' | 'kept' | 'tuned' | 'cut' | 'placeholder';
  notes?: string;
}
```

Slots available everywhere: `{detective}`, `{name}` (subject surname), `{place}`, `{object}`, `{time}`. Deck-specific slots listed below. Text is original; the overlap checker (five shared words with the corpus fails) runs on every deck.

### B.2 Deck inventory and volumes

| deck | file | tags | volume | notes |
|---|---|---|---|---|
| similes | `similes.json` | mood, target, intensity | **+200** (to 300) | Fix the tells: no explanatory tail after a dash, no genre self-reference (alibis, bill collectors), no knowing aphorisms. |
| portraits | `portraits.json` | component (trait/habit/clothing), gender (m/f/any), class, ageBand (young/middle/old) | **150** (50 per component) | One concrete detail each. "A split thumbnail he kept looking at." Reusable as a callback. |
| business | `business.json` | role (fixture roles + 'suspect'), temper | **120** | What they're doing when spoken to, and mid-answer gestures. Fixtures have props. Suspects have nerves. |
| dashiell-lines | `dashiell.json` | kind (open/ask-person/ask-place/ask-object/ask-evening/ask-hired/follow-up/close), familiar (yes/no) | **80** | Short. He asks like a man who has asked before. |
| frames | `frames.json` | register, temper, familiar | **110** | 2–5 beats. Slots `{fact}`, `{business}`, `{colour}`, `{dashiell}`. Every combination of register × temper × familiar has at least 4 frames. |
| utterances | `utterances.json` | factKind, temper, register | **160** | The fact as speech. Every `Fact.kind` × temper has at least 3. Denials and secretExplained included. |
| find | `find.json` | clueKind (physical/document/morgue/scene), placeKind | **50** | How a thing is come upon. |
| arrivals | `arrivals.json` | placeKind, hourBand, weather (clear/rain/fog/cold) | **60** | The street at that hour. |
| transitions | `transitions.json` | hourBand, anchorTemplate? | **80** | One line each. Include one per anchor template in the generator's `anchors.ts`. |
| ambient | `ambient.json` | hourBand, caseState (cold/warm/hot/tight), circumstance | **120** | Dashiell thinking about nothing useful. |
| asides | `asides.json` | relationship, circumstance | **60** | His life, in fragments. Never plot. |
| places | `places.json` | placeKind, watcher? (role or 'none'), empty (yes/no) | **+60** (to 110) | Unwatched rooms and empty rooms are the gap. |
| endings | `endings.json` | outcome (hanged/wrong-man/thin-case/cold), parDelta (under/at/over) | **24** | Closing paragraphs. The wrong-man ending names what was missed via `{missed}`. |

### B.3 Rules

- Original. Overlap checker clean on every deck.
- Concrete, period, New York, 1900–1935. Use the lexicon.
- Sentences median 10 words. Fragments allowed. One simile per card at most, and only in the similes deck itself.
- The narrator never winks. No aphorisms about the city keeping its own hours.
- Dashiell is tired, competent, not clever on purpose. He notices; he does not comment.
- Utterances must carry the fact completely. A player reading only the page must learn who, where, when.
- Every card `status: 'generated'`. The human tunes.

### B.4 Content deliverables

Two Sonnets, two branches, disjoint files:

- **Content A** (`content-a`): portraits, business, dashiell-lines, frames, utterances, find. Read `src/gen/types.ts` for `Fact` kinds and `src/gen/data/cast.ts` for archetypes first.
- **Content B** (`content-b`): similes (+200), arrivals, transitions, ambient, asides, places (+60), endings. Read `src/gen/data/anchors.ts` for anchor templates first.

Each: a `scripts/validate-decks.mjs` run (the engine track will provide one; until then, a local schema check of tag coverage), `corpus/tools/overlap.mjs` clean, and a `docs/06-content-{a,b}-notes.md` naming the tag combinations that were hardest to write for and any you left thin.

---

## Out of scope

Reputation, persistence beyond burn tiers, Dashiell's evolution across runs, sound, art. The generator.
