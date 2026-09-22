# Hone 2 — A beat budget, and the client's own words

Golden: `docs/golden/seed3-opening.md` (v2). Harness: `python3 scripts/golden-loop.py --label "Hone 2"`, before and after, into `docs/golden/rounds.md`. Five items from the designer's read of Hone 1's seed 3, page one. Two tracks, disjoint files.

## Track A — Engine rules (`src/game/voice/`, `src/game/`)

### A.1 The beat budget
Interstitial beats ("She went straight on." "She was not done." "I said nothing." "I let her sit with it.") are capped at **one per page**, two on a page with four or more exchanges, and only where the content earns a pause: after a question the client answers slowly (the purpose, the pointer), or after a one-word answer. Never between two consecutive client turns; those join into one turn with the golden's attribution move (`"…," she said. "…"`) or simply run on. A beat must not repeat within a run.

### A.2 No contradictions between a portrait pair and a business beat
A pair card's motifs and body words (hands, fingers, coin, hat, coat, eyes, mouth) exclude business beats and plain beats on the same page that use the same body part or object. Specifically: a pair about the hands forbids "hands folded", "hands flat", and every business card tagged `hands`; a pair about a hat forbids hat business; and so on via the motif tags. When no non-conflicting beat exists, drop the beat.

### A.3 Pronouns and speech for the dossier
The layer-0/1 dossier paragraph on page one ("Gretchen Kreuzer is 30 years old and a pawnbroker's clerk. Kreuzer writes the tickets…") is rewritten by rule: full name once, then pronouns; the surname is never the subject of two consecutive sentences anywhere on a page (substitute she/he after the first). Profession and detail go **into the client's mouth** on page one when the template has a first-person form (Track B supplies them); Dashiell's narration keeps only what he can see (gender, rough age) and one sentence of standing about the victim.

### A.4 Entrance order
The entrance beats are sequenced: stairs → door → sit → speak. "A woman came up the stairs after midnight, and sat down" cannot precede "shut the door"; the plain arrival atom is chosen to match the entrance card's stage, or dropped.

### A.5 Tests
Beats per page ≤ budget over 40 seeds × 3 pages; no body-part conflict between pair and beat on any page; no surname as subject of two consecutive sentences; entrance order holds on every page one; existing tests green; correspondence zero.

## Track B — The client's own words (`src/gen/data/`, Opus writing pass)

The first-person templates the client speaks are still one field each. Rewrite them so she sounds like a person, in the golden's register, with variable length and at least one short sentence per template:

- `backstoryFirst` (57 sentences, one per relationship backstory): e.g. "I am a customer of Sweeney's." → "I bought from Sweeney. Everybody on the block did, but I paid on time, which he noticed." Keep every fact the third-person form states; add nothing the checker cannot verify (no new names, places, times).
- `professionFirst` (new): the profession detail in her mouth, per archetype `professionDetails`: "I write the tickets at Feldman's. I know what things are worth." Slots as the third-person form allows.
- `PURPOSE_TEXT_FIRST` and `COST_TEXT_FIRST`: per purpose, three variants each, in the golden's shape ("I want what I am owed. If the man who killed him has my money, then yes, I want him too.").
- `foundTextFirst` and `LastSeen.textFirst`: three variants each.
- `prompt` variants: review the prompts written in Hone 1 against rule 3 (a real question, answerable only by its sentence); rewrite any that are prods.
- `breath` forms: where Hone 1 derived them by splitting at conjunctions, write them by hand for the templates above.

Constraints: clarity first; period detail, no slang; no similes; every template's first-person form states exactly the facts of its third-person form; correspondence zero over seeds 1..200 at all difficulties (run it); `npm run read -- --seed 3`, `--seed 7`, `--seed 12` read aloud before finishing, and anything a reader would parse twice is rewritten.

## Deliverables
Track A: branch `hone-2-engine`. Track B: branch `hone-2-templates`. Neither pushed. Each with a notes file (`docs/13-hone-2-{engine,templates}-notes.md`), tests green, and the seed 3 page one pasted in the report. The lead merges both, runs the harness, and presents.
