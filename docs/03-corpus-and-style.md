# Corpus and Style — Public Domain Noir Sources and a Fragment Deck

Two phases, two agents. Phase A collects. Phase B analyzes and writes cards. Phase B does not start until Phase A's manifest is committed.

## Phase A — Corpus collection

### Goal

A local, reproducible corpus of **public domain** hard-boiled fiction and period New York source material, with provenance recorded for every file. We will mine it for cadence, lexicon, and level of detail. We will never lift sentences from it.

### Public domain rule

United States law. As of 2026, works **first published in the US in 1930 or earlier** are public domain. US federal government works are public domain regardless of date. **Verify each work's first publication year before saving it.** Record the basis. When in doubt, leave it out.

Explicitly **out**: Raymond Chandler (all), Hammett's *The Glass Key* (1931) and *The Thin Man* (1934), Cornell Woolrich, James M. Cain, Damon Runyon's collections (1931+), anything from *Black Mask* after 1930.

### Targets

Fiction, roughly 400k–800k words total:

- Dashiell Hammett: *Red Harvest* (1929), *The Dain Curse* (1929), *The Maltese Falcon* (1930), and the Continental Op stories published in *Black Mask* 1923–1930 (e.g. "Arson Plus", "The Tenth Clew", "The Golden Horseshoe", "The House in Turk Street", "The Girl with the Silver Eyes", "Dead Yellow Women", "The Gutting of Couffignal", "The Big Knockover", "$106,000 Blood Money", "Fly Paper"). Check each story's year.
- Carroll John Daly: Race Williams stories 1923–1930, *The Snarl of the Beast* (1927).
- Erle Stanley Gardner's *Black Mask* stories 1923–1930.
- Other *Black Mask* and *Dime Detective* fiction through 1930 if found in scanned issues.
- Ben Hecht, *A Thousand and One Afternoons in Chicago* (1922): city vignettes, wrong city, right cadence.
- Ring Lardner stories through 1930: vernacular first person.

Period New York, roughly 200k+ words:

- *The WPA Guide to New York City* (Federal Writers' Project, 1939). US government work, public domain. The single best source for period place detail.
- 1920s New York newspapers from the Library of Congress *Chronicling America* archive: *The Evening World*, *New-York Tribune*, *The Sun*. Pull crime pages, police blotters, and city columns from 1920–1926. OCR text is fine. Aim for 50–100 pages.
- Any 1920s New York guidebook, Automat menu, El timetable, or Sears catalog page you can verify.

### Sources to search

Project Gutenberg, Wikisource, Internet Archive (full text of scanned *Black Mask* issues where available), HathiTrust full-view, Chronicling America (loc.gov). Prefer plain text. Convert scans to text only if OCR is already provided.

### Layout

```
corpus/
  MANIFEST.md          one row per file: title, author, year, source URL, PD basis, word count, notes
  raw/fiction/         one .txt per work, UTF-8, Gutenberg boilerplate stripped
  raw/period/          WPA guide, newspaper pages, ephemera
  tools/               any fetch/clean scripts you wrote (Node, zero deps)
```

Strip headers, footers, license boilerplate, page numbers, and OCR garbage runs, but do not otherwise edit the text.

### Deliverable

Branch `corpus`, committed, not pushed. `corpus/MANIFEST.md` complete. A short `corpus/NOTES.md`: what you found, what you couldn't find, anything you excluded on PD grounds and why.

---

## Phase B — Style analysis and first fragment deck

### Goal

1. A **style guide** grounded in measurements of the corpus, not vibes.
2. A **lexicon** of period nouns and slang with glosses and citations.
3. A **fragment schema** and a first batch of about **200 cards** across three decks, for a human to tune. The cards are original writing. The corpus is for cadence and lexicon only.

### Style guide (`docs/style-guide.md`)

Write `corpus/tools/stats.mjs` (Node, zero deps) that computes, per work and across the fiction corpus:

- Sentence length distribution (mean, median, p10, p90), and the frequency of fragments (no finite verb).
- Paragraph length distribution.
- Simile rate: occurrences of "like a", "like the", "as a", "as if", "the way a" per 1000 words. Pull 200 random simile sentences into `corpus/derived/similes-sample.txt` for reading.
- Dialogue ratio: share of sentences inside quotation marks. Dialogue tag habits: said vs. everything else.
- Concrete noun bank: nouns appearing in the fiction corpus at ≥3× their frequency in the newspaper corpus, and vice versa. Save both lists.
- What gets described: rough tagging of descriptive sentences by target (face, hands, clothes, room, street, weather, drink, money, weapon, voice).
- Rhythm: how often a long sentence (>25 words) is followed by one under 8.

Then write the guide as prose a writer would actually use: cadence rules with numbers behind them, the simile grammar (what goes on each side of "like", how often, how specific), what noir describes in detail and what it skips, dialogue rules, the one-joke-per-page density rule, and the parody line. Include 10–15 short quotations under 15 words each, attributed, as examples. No longer quotations.

### Lexicon (`content/lexicon.json`)

Period nouns, verbs, and slang with gloss, register (street / police / society / press), and a citation (work and approximate location). At least 300 entries. Include the New York specifics: the El, the Automat, the Tenderloin, speakeasy vocabulary, police ranks and precinct language, money slang, drink names, clothing, cars, newspapers.

### Fragment schema and decks

`content/decks/similes.json`, `content/decks/places.json`, `content/decks/witness.json`. Each file is an array of:

```ts
interface Card {
  id: string;                  // deck prefix + zero-padded number
  deck: 'simile' | 'place' | 'witness';
  text: string;                // original writing. may contain slots: {name}, {place}, {object}
  tags: {
    mood: 'flat' | 'wry' | 'menace' | 'grief' | 'tired' | 'tender';
    target?: string;           // simile: face | hands | voice | room | street | weather | money | lie | silence | drink | body | clothes | city
    placeKind?: 'private' | 'semi' | 'public';
    fixtureRole?: string;      // witness: which archetype speaks it
    register?: 'truth' | 'lie' | 'evasion';   // witness deck only
    intensity: 1 | 2 | 3;      // 3 = the one line on the page that's allowed to show off
  };
  avoidNear?: string[];        // card ids or tag values this shouldn't sit next to
  status: 'generated' | 'kept' | 'tuned' | 'cut';
  notes?: string;
}
```

Targets: 100 similes spread across targets and moods, intensity mostly 1–2; 50 place descriptions (two or three sentences each, covering every place kind and several fixture roles); 50 witness lines (short, one to two sentences, with truth / lie / evasion variants for at least six fixture roles and archetypes). All `status: 'generated'`.

Rules for the cards:

- Original. Never a sentence from the corpus. A run of five or more words shared with any corpus file fails; write a checker in `corpus/tools/overlap.mjs` and run it.
- Specific. Concrete nouns from the lexicon, not fog and cigarette smoke. If a simile could appear in anyone's noir pastiche, cut it.
- Period. Nothing anachronistic in object, price, or idiom. 1900–1935 New York.
- No winking. The narrator is never in on the joke.
- Slots are limited to `{name}`, `{place}`, `{object}`, `{time}`.

### Deliverable

Same `corpus` branch or a new `style` branch off it, committed, not pushed. `docs/style-guide.md`, `content/lexicon.json`, three deck files, the two tools, and `corpus/derived/` outputs. A short `docs/03-style-notes.md`: what surprised you in the numbers, what the corpus does that you couldn't capture in a rule.
