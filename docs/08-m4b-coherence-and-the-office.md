# Milestone 4b — Coherence, and the Office

Two problems with the M4 prose, both from reading seed 7 twice:

1. **It is dense because it is disconnected.** Every card is an island. A page gives seven images in 150 words and follows none of them. The engine has words and no attention.
2. **The opening is wrong.** A private eye's case starts at his desk when someone comes in to hire him. You always have a client and you always know you are being paid.

## Part A — Coherence rules (engine)

### A.1 Image budget

Blocks are either **load-bearing** (exchange, find, the fact itself, reactive monologue about the case, the notebook record) or **image-bearing** (transition, arrival, place, portrait, simile, ambient, aside, colour beats). A page may carry **at most three image-bearing blocks**, and at most **two** when the page has an exchange or a find. The engine fills load-bearing blocks first, then spends the image budget by score (A.2).

### A.2 Closeness: motifs and scoring

Every card carries `motifs: string[]` from a fixed vocabulary (below) and, where it implies weather, `weather: 'fog' | 'rain' | 'cold' | 'clear' | 'any'`. The content track tags every existing card; the engine reads them.

A page has a **motif set** built before any image card is drawn:

- the night's weather from the roll (one of fog / rain / cold / clear; add it to the roll, deterministic per seed)
- the anchors in play tonight (radio, piano, el, bells, singing, …)
- the current place's kind and watcher (bar → drink, glass, counter; street → traffic, el)
- the clue's subject: the person's portrait motifs, the object, the fact kind (money for motive, hands for a physical trace)
- what the previous page used (so a motif can carry across a page turn, once)

Card score = tag match (as now, the hard filter) + **2 per shared motif** + **1 if it shares a motif with the block immediately before it** − **∞ if its `weather` contradicts the night** − **3 if its motifs were used on the previous page and are not in tonight's set** (no accidental echoes). Draw the highest score; break ties with the seeded RNG so determinism holds. Cards with no `motifs` score neutral.

**Motif vocabulary** (`content/motifs.json`, fixed; the validator rejects anything else):

```
weather:  fog rain cold heat clear wind snow
time:     late dawn midnight
sound:    radio el piano bells traffic quiet singing footsteps
props:    drink cigarette money keys paper ledger glass hat coat telephone clock lamp door window stairs counter mirror photograph
body:     hands face eyes voice mouth shoulders breath
place:    street alley room bar kitchen office roof cellar church station
theme:    funeral market theater baseball boxing gambling law medicine sea machinery animals food childhood work sleep memory
```

### A.3 No dangling similes

A simile is **a clause of the sentence it modifies**, never its own paragraph. The engine appends it to the block whose target it matches, joined with a comma or a full stop and a short connective drawn from a tiny list ("the way…", "like…" already in the card). Targets bind: `voice` and `mouth` to a spoken line; `hands` and `face` and `eyes` to a business or portrait beat about that person; `room` to a place block; `street` and `weather` to an arrival or transition; `silence` to a pause beat in an exchange. If no block on the page has a matching target, **the page gets no simile**. Never two similes on one page. Never the same target on consecutive pages.

Similes with gendered pronouns need a `gender` tag (content track); the engine filters on the subject's gender when the target is a body part or voice.

### A.4 Portraits as sentences

Portraits are woven, not listed. On first meeting: **trait + one of habit/clothing**, in a sentence that also says what the person is doing (the business beat), using a small set of weaving templates in the engine:

- "{Surname} had {trait}, and {habit-as-clause} while {he/she} waited."
- "{Surname}: {trait}. {Clothing-sentence}."
- "{trait-as-subject} — that was {Surname}, {business}."

Later meetings: one component, as a clause in the approach beat. Never three components at once. The presence block becomes **one sentence**: "Carbone and Mosley at the far end, Doyle behind the bar." Roles appear only if the person has not been met.

### A.5 Weather is a fact about the night

The roll gains `weather`. Arrivals, transitions, ambient, similes, portraits, business, and places with a `weather` tag must agree with it or be excluded. Clothing that implies weather (raincoat, coat collar up, wet boots) counts. The content track tags these.

### A.6 Line-to-line glue

Two cheap devices, used sparingly:

- **Carry a noun.** If the block before mentions a tagged prop (the ledger, the rag, the glass), the reactive or ambient monologue that follows may open on it: "The ledger stayed open." Template-level; five or six templates.
- **Callbacks.** When a person is met a second time, prefer the *same* portrait component as the first meeting once, then vary. A repeated detail is what makes a stock detail feel authored.

## Part B — The office (engine + content)

### B.1 The seventh place

Every case has **the office**: Dashiell's, a `private` unwatched place, never a scene, never drawn from the deck, not counted against the place slider. It holds no findable clues. It has a `shortName` "the office" and a full name that varies with the neighborhood ("two rooms over a tailor's on Rivington").

### B.2 The opening

The run starts **at the office, at midnight**. Page one:

1. **The office at this hour**: an `office` card by circumstance and weather ("The rent was on the desk in an envelope I hadn't opened. The radiator had given up around ten.").
2. **The entrance**: an `entrances` card by the client's temper, class, and gender. The client's portrait is woven in per A.4. If Dashiell knows the client (the roll), the `familiar` register applies and the entrance card says so.
3. **The hiring**: an exchange built from a `hiring` frame. The client's opening clue (`kind: 'client'`) is the `{fact}`. The frame carries `{retainer}` (an amount by client class: working $20, professional $50, money $100, underworld "a roll with a rubber band") and Dashiell's acceptance line.
4. **Two free questions.** While the client is in the office, the first two `ask <client> about …` cost nothing. A man hiring you answers your questions. After two, or when Dashiell leaves, the client leaves: one line ("I'll be at Mrs. Teague's if you want me," using their `foundAt`). From then on the client is found at `foundAt` as before.

The scene report and the coroner's note are **delivered on first arrival at the scene**, free, as the M3 opening did at page one. The oracle's first action is now `go <scene>`.

### B.3 Par and budget

The generator does not change. The game's par is `case.par + 1` (the walk from the office) and the game's budget is `case.budget + 1`, so slack is unchanged. The oracle test asserts within `par + 1`. The clock still maps eight hours onto the budget.

### B.4 Content: three small decks

| deck | file | tags | volume |
|---|---|---|---|
| office | `office.json` | circumstance, weather, motifs | 30 |
| entrances | `entrances.json` | temper, class, gender, familiar, motifs | 40 |
| hiring | `hiring.json` | temper, familiar; slots `{fact}`, `{retainer}`, `{detective}`, `{business}` | 20 |

The office cards are the one place Dashiell's circumstance is allowed to be *plot*: behind on rent means the envelope is on the desk; the retainer matters.

## Part C — Content: tagging pass

Two Sonnets, disjoint files, both on branch-per-agent:

- **Tagging C1**: `similes`, `portraits`, `business`, `frames`, `utterances`, `find`, `dashiell`. Add `motifs` to every card from the fixed vocabulary (one to three each; zero is allowed for cards with no image). Add `weather` where implied. Add `gender` to similes with pronouns. Do not rewrite text except to fix a card that contradicts itself.
- **Tagging C2**: `arrivals`, `transitions`, `ambient`, `asides`, `places`, `endings`, `witness`, plus **write** the three new decks in B.4. Same tagging rules.

Validator: `motifs` must be from the vocabulary; `weather` from its enum; report per-deck motif coverage.

## Tests (engine)

- Image-bearing blocks ≤ 3 per page, ≤ 2 on exchange/find pages, over 100 oracle runs and 40 wandering runs.
- No page has a prose block that is only a simile. No two similes on a page. Simile target differs from the previous page's.
- No card whose `weather` contradicts the roll's weather appears in a run.
- Motif overlap: over 100 runs, the mean number of shared motifs between adjacent image blocks is ≥ 0.6 (a coherence floor; report the number).
- Portrait blocks never contain two semicolons. Presence is one sentence.
- Run starts at the office; the client is present; the first two client asks are free; the client leaves after two or on departure; scene and morgue clues arrive on first arrival at the scene.
- Oracle solves within `par + 1` at every difficulty. Budget = case budget + 1.
- All existing tests green.

## Deliverables

- Engine: branch `m4b-engine`, not pushed. Do not modify `content/decks/*.json`; test fixtures inline. Update `content/deck-schema.json` and add `content/motifs.json`. Transcript tool updated. `docs/08-m4b-engine-notes.md`, including the measured coherence number before and after.
- Content: branches `tag-c1`, `tag-c2`, not pushed. Validator clean. `docs/08-tagging-notes.md` per agent naming cards that fought the vocabulary.
