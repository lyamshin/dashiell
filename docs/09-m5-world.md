# Milestone 5 — The World: Dossiers, the Act, Case Types, and the Plain Register

*Supersedes the ordering in `docs/07-m5-shape.md`: this comes first. Complexity tiers become M6 and build on it.*

## Why

Playing a case showed two things that are one thing. The prose is thin and leans on genre because there is no plain register: every sentence has to carry flavor because there is no fact for it to carry. And the case is thin because the people in it are names with alibis. "Tramonti was jealous of the victim." Of what? Who was the victim? Is the client someone I know? What do they know, and why are they hiring me?

The fix is to build the world before the puzzle. Every person gets a dossier. The victim gets a life and a discovery. The client gets a purpose. The case gets a type and a trope, and declares what is *known* at the briefing and what the report actually asks. Every rendered sentence traces to a field, and a checker proves it.

Two phases. **Phase 1 (generator)** builds the model, the derived texts, the checker, and the sheet. **Phase 2 (engine)** renders it: the briefing, the plain register, the notebook dossiers, the report by unknowns.

---

## Part 1 — Dossiers

### 1.1 Every person

```ts
interface Dossier {
  age: number;                         // from the archetype's ageBand range
  gender: 'm' | 'f';                   // resolved, never a hint
  profession: { role: string; detail: string };   // "a longshoreman" / "works the Elizabeth Street pier when there's work"
  want: Want;                          // broad motive, not the crime's
  tie: Tie;                            // relationship to the victim, with a specific
  selfAccount: string[];               // 2–3 plain sentences they would say about themselves; omits their secret
  layers: DossierFact[];               // every fact above, tagged with how it can be learned
}
type Want = 'money' | 'respectability' | 'to-be-left-alone' | 'to-get-out' | 'to-keep-a-marriage' | 'to-be-feared' | 'to-be-forgiven' | 'to-be-somebody' | 'to-keep-what-they-have';
interface Tie { relationshipId: Id; text: string; since?: string; third?: Id; }   // "the victim's nephew, raised by him after the flu took his parents in '18"
interface DossierFact { kind: 'age' | 'gender' | 'profession' | 'detail' | 'want' | 'tie' | 'since' | 'third' | 'secret-hint'; text: string; layer: 0 | 1 | 2 | 3; }
```

**Layers.**
- **0, on sight**: gender, rough age, profession where it shows (a longshoreman's hands, a chambermaid's uniform).
- **1, volunteered**: the self-account. Learned by `ask X about themselves`, a pseudo-clue like "that evening": always available, one action.
- **2, by others**: want, the specific of the tie, hints at the secret. Attached to existing observation and overheard clues *about* X when the speaker is a yap or knows X; the yap volunteer draws from here too.
- **3, documents**: the secret's specifics. Already in the candidate pool as document clues; tag them.

Enigmas give up layer 0 and a two-sentence self-account. Yappers give up layer 2 about everyone else. Temper already exists; it now governs dossier reveal.

### 1.2 Archetype and relationship data

`cast.ts` archetypes gain `ageBand: [min, max]`, `professionDetails: string[]` (3+ each, slots `{place}` allowed), `wants: Want[]` (weighted), `visibleProfession: boolean`. Relationships gain `backstory: string[]` (3+ templates each; slots `{victim}`, `{person}`, `{year}`, `{third}`, `{place}`) and `since: string[]` ("since '18", "going back to the war", "three years this spring").

**Third parties.** A backstory may name someone who is not in the case ("the woman they'd both been seeing"). Such names are generated once, stored in `case.mentions: Mention[]` (`{ id, name, gender, role, text }`), and every later rendering must use the same name. The correspondence checker treats mentions as known names.

### 1.3 The victim

```ts
interface VictimBio extends Dossier {
  standing: string;                    // "kept the hotel on Rivington; half the block owed him something"
  discovery: { foundById: Id; foundAt: Id; foundTick: Tick; foundText: string; precinct: 'came-and-went' | 'called-it-a-fall' | 'took-a-statement' | 'not-yet-called' | 'closed-it-in-an-hour' };
}
```

`foundTick` is after M and before midnight. `foundById` is a fixture or a suspect who was there (must agree with schedules). For a missing person, `discovery` becomes `lastSeen` (by whom, where, when).

### 1.4 The client

```ts
interface ClientBrief {
  purpose: Purpose;
  tells: Fact[];            // what the client states at the briefing; all true unless purpose says otherwise
  withholds: Fact[];        // what the client knows and does not say (their own secret, at least)
  points: { personId: Id; reason: string; honest: boolean };   // the client's suspicion and why
  ownEvening: string[];     // the client's account of their night, from their claimed schedule
}
type Purpose = 'find-the-killer-police-wont' | 'clear-my-name' | 'keep-it-quiet' | 'find-it-before-the-cops' | 'get-it-back' | 'bring-them-home' | 'make-sure-they-stay-gone' | 'settle-a-debt-with-the-dead';
```

Purpose is drawn by relationship × case type from a table in `cast.ts`. It must make sense: a nephew does not hire you to keep it quiet unless he is the killer. The **pointer** is the client's suspicion: honest at difficulty 1–2 (a real fact about the pointed-at person, usually a motive), and at difficulty 3 it may be a noise branch entry (the client points at their own red herring). If the client is the killer, `points.honest` is false and the pointer is the frame.

The client's opening clue text is **replaced** by the briefing (Part 4). The `client` clue kind stays for the fact it establishes.

---

## Part 2 — The Act and Case Types

### 2.1 The act

The one thing the case is about, separated from the mystery machinery that does not care what it is:

```ts
type CaseType = 'murder' | 'robbery' | 'missing';
interface Act {
  type: CaseType;
  tropeId: Id;
  actorId: Id;                 // the one who did it (or, for 'missing'/'left', the person themselves)
  tick: Tick;
  place: Id;                   // where it happened
  method?: Method;             // murder
  bodyFoundAt?: Id;            // murder; differs from place when the body was moved
  taken?: GameObject;          // robbery
  entry?: 'key' | 'window' | 'let-in' | 'never-left' | 'combination';   // robbery
  goodsWentTo?: Id;            // robbery: a place (the pawnshop, a locker)
  whereabouts?: Id | 'gone';   // missing
  fate?: 'left' | 'taken' | 'dead';   // missing
}
```

Schedules, secrets, lies, observations, anchors, clue selection, branches, par: unchanged. They constrain "actor alone at place at tick" as they do today. Robbery has no victim schedule ending. Missing: the person's true schedule continues after the tick to `whereabouts` and nobody observes it (or one person does, for `taken`).

### 2.2 Givens and unknowns

```ts
type Unknown = 'who' | 'why' | 'when' | 'where' | 'how' | 'entry' | 'whereabouts' | 'fate' | 'goods';
interface Givens { facts: Fact[]; text: string[]; }
```

Each trope declares its givens and its unknowns. **The report asks only the unknowns.** The briefing states the givens in plain sentences. "Where" is asked only when it is genuinely unknown.

| trope | type | givens | unknowns |
|---|---|---|---|
| `body-at-scene` | murder | who died, where found (= where killed), roughly when, how it looks | who, why, when (exact tick) |
| `body-moved` | murder | who died, where found | who, why, when, **where** |
| `locked-room` | murder | who died, where, the one key | who, why, when, **how they got in** (entry) |
| `the-frame` | murder | who died, where, and evidence pointing at an innocent | who, why, when; the frame must be disqualified |
| `inside-job` | robbery | what was taken, from where, roughly when, no forced entry | who, entry, goods |
| `payroll` | robbery | the envelope, the route, the hour it went missing | who, where it went, how |
| `left` | missing | who is gone, when last seen, by whom | whereabouts, why |
| `taken` | missing | who is gone, when last seen | who, whereabouts, why |

Eight tropes for now, with weights so `body-at-scene` remains the commonest at default settings. Solvability per trope: the essential fact set is declared alongside the unknowns (e.g. `left` needs a chain of sightings after the tick ending at `whereabouts`, two routes; `payroll` needs the actor at the route at the tick, the goods at `goodsWentTo`, and the entry method). Reuse the existing two-route machinery.

### 2.3 Trope signatures

Each trope adds one **signature clue pattern** so it reads as its own kind of story: the body moved leaves marks on the stairs and a cab that took a heavy fare; the locked room has one key and a person who had it; the frame plants the weapon at an innocent's place with a provenance clue that unwinds it; the inside job has a lock that was not forced and a key holder list; the payroll has a route with fixtures along it; `left` has a pawn ticket and a train timetable; `taken` has someone paying for a room. Implement each as a small function in `src/gen/tropes/<id>.ts` that adds candidate clues and essential facts.

---

## Part 3 — Correspondence

`src/gen/correspond.ts`: **every rendered sentence traces to a field.**

- `renderedFacts(text): { names: string[]; places: string[]; times: string[] }` extracts capitalized tokens, place short names, and clock times.
- `check(case, text, context): Violation[]`: every name is a person or a mention; every place is a place; every time is within the window and, given the fact the text renders, agrees with the schedule or the coroner's window.
- Applied to: every clue text, the briefing, every dossier sentence, every self-account, the givens, the truth sheet.
- **Rule:** no clue text may say "the victim" without also naming them once, and no motive text may lack its object ("jealous of Sweeney over Rosa Ferrante", never "jealous of the victim").
- Test: zero violations over seeds 1..200 at every difficulty. Print the first ten violations when it fails.

---

## Part 4 — The briefing (generator derives, engine renders)

`case.briefing: string[]`: 10–16 plain sentences, derived, in this order:

1. When the client came in and who they are (layer 0 + profession detail). Whether Dashiell knows them is the engine's roll, so the generator emits the sentence without that and the engine adds it.
2. What happened: the givens, in the victim's terms. Name, standing, where found, by whom, roughly when, what the precinct did.
3. The client's tie to the victim, with its specific.
4. Why they are hiring: the purpose, in one sentence, and one sentence of what it costs them (a suspect says they were there and knows how it looks).
5. The pointer: whom they suspect and the reason, as a fact about that person.
6. The retainer (engine).

The briefing is the model of the **plain register**: declarative, information-bearing, no images. Phase 2 measures pages against it.

---

## Part 5 — Truth sheet and CLI

- New sections: **Dossiers** (one block per person: age, gender, profession, want, tie, self-account, layers), **The Act** (type, trope, givens, unknowns), **The Client** (purpose, tells, withholds, pointer and whether it is honest), **The Briefing** (the sentences verbatim), **Mentions**.
- Header adds type and trope.
- `npm run case -- --seed N --type murder|robbery|missing --trope <id>` to force a shape for reading.
- Batch: regenerate `docs/samples/` for seeds 1–20 at default; add `docs/samples/tropes/` with two seeds per trope.

---

## Part 6 — Engine (Phase 2, separate spec addendum after Phase 1 lands)

Summary so Phase 1 leaves the right hooks:

- **Plain register.** `src/game/voice/plain.ts`: declarative shapes for dossier facts, givens, and connective sentences ("I went up. The door was open."). Target ≥ 55% of sentences on a page carry no image card; measured and tested.
- **The briefing page** replaces the hiring exchange's `{fact}` with the briefing sentences, keeping the entrance and the retainer.
- **Notebook People** shows the dossier by learned layer.
- **Report** shows the case's unknowns only; endings by type and trope.
- `ask X about themselves` delivers layer 1.

---

## Phase 1 tests

- Every person has a complete dossier; ages within band; gender resolved and consistent with the name pool; profession detail present; want from the pool; tie text non-empty with the relationship's specific.
- Victim bio complete; `foundTick` after M; `foundById` was at `foundAt` at `foundTick` per schedule (or is a fixture posted there).
- Client purpose is allowed for (relationship, type); pointer honest at difficulty ≤ 2; the pointed-at person has the stated fact.
- Every trope appears over seeds 1..400; `body-at-scene` ≥ 35% at default; each trope's unknowns are exactly what the report asks; `where` is an unknown only for `body-moved`.
- Solvability holds per trope's essential set; oracle par computed for all types.
- Correspondence: zero violations over seeds 1..200 at every difficulty, across clue texts, briefing, dossiers, self-accounts, givens.
- Mentions: a third party named in one sentence is named identically everywhere.
- Determinism by seed unchanged; existing generator tests green or updated with a reason; game tests green (the game reads the client clue and the report fields; keep the client clue kind and expose `case.act.unknowns` so Phase 2 can switch the report).

## Phase 1 deliverables

Branch `m5-world-gen`, not pushed. `src/gen/` changes, `src/sheet/` changes, CLI flags, samples regenerated, `docs/09-m5-gen-notes.md` with trope distribution, correspondence results, and the three hardest things.
