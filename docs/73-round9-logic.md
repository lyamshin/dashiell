# Round 9, the logic: the rules, the grid, confront and the report

*2026-10-27, branch `round9-logic`, off main at `2fb370b` (thin-sums, #112, docs/72). The round-9 blind playtest (three testers on the thin-sums build: Poached 37, Medium 37 and Hard-boiled 39, `scratchpad/round9-notes.md`) solved by deduction on every night and found rule and screen bugs: the grid marking the settled hour from Poached up, a grid column that applied a rule nothing said, a confrontation that failed on the line the verdict then took as the proof, a curtain that said a confronted culprit was never confronted, a refusal that sent a tester out to find a witness who didn't exist, and the report's words. With them, round 8's B1, B4, B6, B9 and B10 (`scratchpad/round8-digest.md`). The designer approved the build after round 9. Each item is fixed by rule in the layer that makes it, with a test (`test/round9.test.ts`: the tester's night where it showed, and the rule over nights where it's a rule) and, where a lint can read it, a lint (`hinge-lint.ts`: `witness` and `restate`). Nothing in `src/gen/` changed; the dealt boards hash as main's. The narration is `round9-prose`'s (docs/74), built at the same time; this build touches it only where an item names the line: the refusal's hand-off (item 5) and the confrontation's restatement (item 6).*

## 1. What was built, by item

Quotes are from the testers' nights on their routes (their saves' actions), main (`2fb370b`) → this build.

### 1. The grid stops marking the hour from Poached up (`grid.ts`, `board-book.ts`)

docs/47 A5 narrowed the grid's hours with the victim's row: an hour the row puts him away from the scene isn't one it could have been. docs/72 stopped the narration doing that sum from Poached up; the grid still did it, as chrome, and Hard-boiled 39's tester read "ten !" on the first look at the grid, before the cocoa. The grid now uses docs/72's tier test (`model.ts` `sumsSaid`): where the sums aren't said, the window is the office's hours, never narrowed, each marked "?", and `crimeHour` is never set. Raw and Coddled keep the narrowing; the full dial (`?texture=full`) narrows as before.

- The CLI's head and key: "nine  ten !" / "! the hour it happened" → "nine ?  ten ?" / "? the hours Lefkowitz gave" (`BoardGrid.givenBy`, the client, as the turn says whose hours they were: "Lefkowitz had given me nine or ten o’clock."); Poached's one office hour, "ten ?" / "? the hour Rosenbaum gave".
- The web key: "The marked hour is when it happened." → "The marked hours are the ones Lathrop gave." (Medium 37), "The marked hour is the one Rosenbaum gave." (Poached 37); the hour's title, "an hour Lathrop gave". Raw 33: "The marked hour is when it happened.", as before.

### 2. The weapon column gives its reason, and a poisoning's asks for the poison (`grid.ts` `meansReasons`)

The last column applies "fetched before the earliest hour" (round 7, B6; `meansLate`). thin-sums took the clause off the find from Poached up, so Medium 37's "Broadnax: no" from the first look read as a leak; the prose build puts the rule back on the find as a fact. On this side, wherever the column says "no", the grid says why, in the grid itself, with the reason it already had (`meansWhy`, the web's hover title until now):

- CLI, a line under the key: "Why “no”: Broadnax didn’t come to Mrs. Nagy’s till nine, too late for it. Bledsoe was never at Mrs. Nagy’s while it was there."
- Web, a line of the key under the table, the same words (the cell's title was hover-only, so a phone never had it).
- On a poisoning (chloral or poison, `when.ts` `isPoison`) the column asks "Could they get the poison?" (web head "poison?"), never "the weapon", which was asked of a medicine bottle; never by name either (case 2312's ruling: "carving knife?" answered How).

### 3. Confront and the report agree on which lines break a story (`knowledge.ts` `storyBreakers`, `bearsOn`)

Hard-boiled 39, a pair night: Tillman said she was home at ten, with Obermann; Feeney's list had only somebody in a sailor's pea coat at the Kit Kat at ten, and the tester had marked the pea coat as Obermann's. The confront offered Feeney's line to put to Tillman; it cost an action and answered "Feeney could only say who was at the Kit Kat at ten o’clock, and she had said nothing of the Kit Kat."; the verdict then took the same line as the proof. Two sets of breaking lines that should have been one:

- **the confront's** (`judgeLine`): a line lands when the solver's break rests on it, or needs it, or makes it alone, and the line "touches" the claim: it's about them or about the place they named;
- **the report's** (`heldBreakers`): the collision's breakers (what the solver's first break rested on) and the lines that land.

They differed both ways. A collision's breaker that didn't touch the claim was scored by the report and didn't land: a face on a list that was the partner's (HB 39), the passer-by's own evening beside her remark (the solver's break rests on whole answers, `account:x`, so every line of the answer rode in). And a line that agrees with the claim landed and was scored: on pair nights the partner's own story ("Obermann says he was at Tillman’s flat at ten o’clock, with Tillman.") is a dependency of the face match, so putting it to Tillman landed, and the report would have taken it as proof she lied. On the final runs of six nights a tier, every type, both worlds, the three routes (540 runs, `scratchpad/r9l/sets.mts`), main: 30 of the report's 348 breaking lines didn't land when put, 66 of the collisions' 461 breakers didn't, and 13 lines that agree with the claim landed and were scored; the confront menu offered 541 lines on those collisions, 359 of them about nobody in the claim.

**The rule, one source.** `storyBreakers(c, run, p, h)` is the set: what the collision's first break rests on (`breakersOf`), then any other line that breaks it, each one that *bears on* what they said and doesn't agree with it. `bearsOn`: a line at that hour, somebody else's, about them, or about the place they named, or, where the solver reads company (Hard-boiled's `pair` technique), about somebody they said they were with, a face that was that person's included. Then:

- `judgeLine` lands a put exactly when the line is in the set; their response is the deal's (refuse, a second story, own up);
- the report's `heldBreakers` is the set at each of the culprit's lies (and, as before, the list that breaks a second story, and the second story itself);
- the collision's `breakers` (the grid's clash lines, the notebook's "said otherwise", the Raw and Coddled ready pairs, the oracle's put, the readers' proof) are its head;
- the confront menu offers only lines that bear on them (`pickerFor`); a line that bears may still not land (it agrees, or its word doesn't stand up yet, or the list had strangers in it), and the page says why, as before;
- the report's first group, at Hard-boiled, holds what bears on whoever they said they were with: "About Tillman, anybody she said she was with, or anywhere she said she was tonight, at nine or ten o’clock:" (the tester: the proof "sat under ‘About anybody else’").

HB 39 on the tester's route: the put now lands, "She gave a short laugh with nothing in it, and looked at the wall. “All right, I was out. I was at the Kit Kat, not home.”", the verdict takes Feeney's line as before (5 out of 5, gold), and Obermann's story, put to Tillman, doesn't land (`judgeLine`'s reason `company`: he had her with him at ten, which agreed with her). A put's "and Lindemann says the same" never names a line that agrees with them.

This build, the same runs: 0 of the report's 309 lines that don't land, 0 of the collisions' 421 breakers, 0 agreeing lines landing or scored, and 181 menu lines, every one about somebody in the claim. The oracle, the wanderer and the reader solve the same nights (180, 3 and 36 of 180), and board-measure's wanderer and reader columns are main's to the digit (§2). The rule over nights is in `test/round9.test.ts`.

### 4. The curtain knows every confront (`report.ts` `curtainOfBoard`)

"You never confronted her; if you had, she would have told another story." came after the tester had confronted Tillman (with the line that didn't land). The curtain read only landed confrontations (`confront:p@h` in `asked`); it now reads every put (`run.puts`):

- landed: "When you confronted her, she told another story." (HB 39 now, since the put lands);
- made, none landed: "You confronted her, but nothing you put to her broke what she said about ten, so she stood by it; with something that did, she would have told another story.";
- none: "You never confronted him; if you had, he would have refused to say.", as before.

### 5. A refusal's hand-off claims no witness (`voicings.json`, `pages.ts` `writeConfront`; hinge rule `witness`)

Poached 37: Vogel refused, and the page said "But somebody had seen him at ten if he wasn’t home." Nobody had: he was at the scene. It sent the tester to the Orpheum for a witness. The refusal's thought (REACTION `refuse-thought`) had five voicings that said somebody saw them, or would have; they say only what's true now:

- "If he wasn’t home at ten, somebody saw him where he was, and if nobody had, that would say something too." → "If he wasn’t home at ten, he was somewhere, and he wasn’t saying where." (and the `away` form, and the writer's own fallback);
- "…, he was someplace else, and somebody would have seen him; if nobody had, that told me something too." → "…, he had been someplace else, and whatever it was, he wasn’t telling me.";
- Poached 37: "But somebody had seen him at ten if he wasn’t home. He had told me he was at the Orpheum at nine, so the Orpheum might know about ten too." → "But if he wasn’t home at ten, he wasn’t saying where he was. He had told me he was at the Orpheum at nine, so the Orpheum might know about ten too."

Checked with them, and kept: "…, and somewhere usually has a witness, or pointedly doesn’t." and "…somewhere with a witness, or pointedly without one." (an absence is said to count too; no witness is claimed), the pointer to their own story's watched place ("I’d ask at the Orpheum about ten"), and a second story's "If Vogel was telling it straight, Feeney would have seen him." (a condition on what they said, at a place somebody keeps). The lint rule `witness` reads every confrontation page for "somebody saw him…", "somebody had seen her…", "somebody would have seen them".

### 6. The confrontation says only what the line said (round 8, B10; `bones/phrase.ts` `breakToFace`; hinge rule `restate`)

"Pickering says he was at the Orpheum at ten, on his own, and you weren’t there." (Hard-boiled 34): Pickering never said she wasn't. A claim said to their face now ends where the claim does: "Pickering says he was at the Orpheum at ten, on his own." ("…, and not with you" went the same way.) A claim that had them with the speaker says "with you", where it used to drop them: HB 39's menu offered Obermann's story to put to Tillman as "Obermann says he was at Tillman’s flat at ten, on his own, and you weren’t there", wrong twice; it's "Obermann says he was at Tillman’s flat at ten, with you" (and it doesn't land, item 3). A keeper's list says "and not you" only at the place they said they were: at another place, the list leaving them out says nothing of them ("Mrs. Rafferty says she had Abramowitz and Bidwell in at ten, and not you" and "Feeney saw somebody in a sailor’s pea coat at the Kit Kat at ten, and not you", to a woman who said she was home, lose the tail). The lint rule `restate` reads every put for the old tails.

### 7. The report's words (`play-lib.ts`, `report.ts`, `board-book.ts`, `choices.ts`)

- **B2, six testers of eight.** "If you say Tillman lied too, give “cleared” as a number from this list too." sat on the culprit's own `report <Name>` page, under the proof. It's said only under the question it answers, in plain words: the person's page has a heading of its own, "Did anyone else lie?", and under it "If your answer is Tillman, pick what clears her from this same list: somebody else’s word, not her own." (The brief's example, "If Brennan is the other liar", says a second liar exists, which round 7's B9 rule forbids anywhere before the verdict; `test/plain-words.test.ts` holds it.) The whole form's "What clears them" says "If you name somebody, `report <name>` shows what you were told about them. Pick what clears them from it: somebody else’s word, not their own. Give its number, or “hunch”."
- **Field names stay in the command's line.** "Give proof as one of those numbers, or proof=hunch.", "Give cleared as one of those numbers, or cleared=hunch." and "For proof and cleared, give a number…" → "Give one of those numbers, or “hunch”." and "What proves they lied, and what clears anyone else who lied, are each a number from `report <name>` (the notebook numbers them the same), or “hunch”." The keys are in `close "who=…; proof=…; …"` and in the headings' brackets, never in a sentence.
- **The verdict says a line as a line.** "✗ — it was Bledsoe says he was at the print shop at ten o’clock, with Sirkin." → "✗ — what cleared him: Bledsoe says he was at the print shop at ten o’clock, with Sirkin." (`scoreBoard` gives every line question its `why`, so the CLI, the book and `npm run read` say it the same; "what proved it" for the proof and a lost thing's evidence).
- **What clears the other liar is somebody else's word.** Medium 37 filed Sirkin's own owning up and lost the point, never told why. The teach page: "When two people lied, you also need what clears the innocent one: somebody else’s word, not their own."; How it plays and the CLI help: "…and if so, what clears them. What clears them is somebody else’s word, not their own." (two sentences: the voice script's clips are 22 words at most); the report's prompts, CLI and web ("Pick what clears them: somebody else’s word, not their own. Or “A hunch”."); and the verdict, where the pick was their own word: "You had the right name, but you didn’t rule out Sirkin: his own word doesn’t clear him; somebody else’s has to."
- **Confronting on the last action.** The confront box says so (`pickerNote`, both): "This is your last action: if he names somebody, asking them would take another, and you won’t have one." (Medium 37 confronted Sirkin with the last action; he named Bledsoe.)

### 8. The rules are true on a pair night (`teach.ts`)

"People lie about themselves. Nobody lies about what they saw." On a pair night Tillman's "Obermann joined me at ten" is a lie about who she saw. The teach page, How it plays (the web's drawer shows both) and the CLI's `new` now say: "People lie about their own evening, and who was in it. Nobody lies about where they saw anybody else."

### 9. One numbering, from the notebook's list (round 8, B1; `report.ts` `notebookLines`, `lineNumbers`; `text.ts`)

Raw 33: `report` offered Bidwell's confession as 12, the notebook never listed it, and the parlor search found after it took 12 (the crack was numbered after everything, so every line held after it pushed it on; the office's facts, after the lines, moved the same way, and weren't in the notebook either). The numbers now come from one list, the notebook's "What I was told" (`notebookLines`): the office's facts first (held from the start), then every line in the order it was held, a crack in its place, after the lines held before the confrontation that drew it. A number never moves as the night goes on, and every line the form can offer is listed. Raw 33: "12. Bidwell, when I confronted him: “All right, all right. I took it. …”", "13. The parlor at the Mosley flat: …". The web's notebook lists the confession too, under "When I faced them with it".

### 10. The fastest solve counts by kind (round 8, B6; `report.ts` `fastestKinds`)

"10 actions (6 questions, a look at the papers…)" counted the table's search as a question (Poached 34). The curtain counts the path by kind: "THE FASTEST SOLVE: 13 actions (6 questions, a search, a look at the papers for the motive and 5 walks)" (HB 39; a confrontation on the path is "a confrontation"). The kinds add up to par on every night (the test's rule).

### 11. A second story is marked against the list where it claims to be (round 8, B9; `grid.ts`, `knowledge.ts` `secondBreakers`)

After a second lie the new claim wasn't marked against the keeper's list (Coddled 35's Margolis; Medium 37's Ashby, "the Orpheum" after the put, never against Alfano). `secondBreakers` is the one set for a second story (the put made again lands on it, the report scores it, and now the grid marks it): a list held for that place and hour, without them on it.

- CLI: `"Ashby’s"✗→"Orpheum"` → `"Ashby’s"✗→"Orpheum"✗`, the key's "→"Y"✗ where that clashes too", and under WHERE THEY CLASH, after "Ashby now says she was at the Orpheum at ten o’clock.", "Alfano: at ten o’clock, only Prentiss and Broadnax were at the Orpheum."; Coddled 35, `"Moe’s"✗→"Kowalski’s"✗` with Mrs. Kowalski's list.
- Web: the cell's lines (the tap) end on the same list, and its label says "then said the Orpheum, and that doesn’t agree either".
- The notebook's "How it adds up" still says "Faced with it, Ashby changed the answer to the Orpheum." (§3, open).

### 12. The hint says what's missing (round 8, B4; `stars.ts` `starReason`)

"Hint: start where it went missing" six actions in (Raw 33). "Start" is said only before anything is done; after, what's missing: "Hint: you haven’t seen where it went missing yet." (the scene not visited), "you haven’t searched where he died yet." (there, not searched). The star on the walk says the same.

## 2. The gates

Measured once, at the end, on the branch's last code (`scratchpad/r9l/gates.sh`, outputs in `scratchpad/r9l/out/g1-*`).

- **The puzzle is main's.** Nothing in `src/gen/` changed; the dealt boards hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`.
- **board-measure, 20 seeds**: main's (`2fb370b`, run the same way) table for table and column for column, the `diff` empty: the oracle at 100% with the lines and at par, par, the shortcuts, the wanderer (who right, solved, citing), the readers, the one-liar reader, lint issues 0, plain terms 0, callback pages. The confront change doesn't move the wanderer or the reader columns: the wanderer now picks its puts from fewer lines and more of them land, but what it files (a liar it caught, a line from the form) doesn't turn on them, and the reader takes stars; §1.3's runs solve the same nights too.
- **The lints, 20 nights a tier, both worlds, the three routes (720 runs)**: the level lint (`level` and `sum`) 0, the hinge lints (64 rules, `witness` and `restate` new, with the night and epilogue rules) 0, the prose lint 0 (`scratchpad/r9l/lints.mts`). board-prose along the oracle's route, both worlds: every lint column 0 (the reader lint, correspondence, level, plain terms, engine words, continuity, the hinge table).
- **Round trip** (`roundtrip.ts --nights 20 --routes oracle,wanderer,reader`): every plain page and every voiced composite reads back and is clear, 100.0% at every tier in both worlds; the flesh column's two misses are main's (Miss Nowak's owning up).
- **The suite**: 1,018 tests, 40 files, pass (`npx vitest run --minWorkers=1 --maxWorkers=3`): `test/round9.test.ts` new (26), and eleven of main's tests rewritten to the rule (the grid's hour from Poached up in `board-engine` and `round3`, the B2 sentence in `board-engine`, `other-liar` and `round5`, the teach line in `other-liar` and `plain-words`, the form's prompts and the one numbering in `plain-words`, the fastest solve in `round4`, the report's heading at Hard-boiled in `round5`). tsc is clean; `npm run build` builds.
- **By hand, the CLI** (`npm run play`, the testers' saves):
  - HB 39 on the tester's route (with the mark): the put of Feeney's line lands, Tillman tells another story, the verdict 5 out of 5 as before, "I didn’t need to confront Tillman: I had enough to close the case without it.", and the curtain "When you confronted her, she told another story."; the grid "nine ? ten ?", "? the hours Lefkowitz gave", "Could they get the poison?".
  - Poached 37: "But if he wasn’t home at ten, he wasn’t saying where he was. He had told me he was at the Orpheum at nine, so the Orpheum might know about ten too."; "ten ?", "? the hour Rosenbaum gave", "Why “no”: Mosley was never at Kowalski’s while it was there. Schilling was never at Kowalski’s while it was there."
  - Medium 37: "nine ? ten ?", "? the hours Lathrop gave", "Why “no”: Broadnax didn’t come to Mrs. Nagy’s till nine, too late for it. …", `"Ashby’s"✗→"Orpheum"✗`; `report Sirkin` with "Did anyone else lie?" under the list; the confront on the last action says so; the verdict "what cleared him: Bledsoe says…" and "his own word doesn’t clear him; somebody else’s has to".
  - Raw 33 on the tester's route: the confession is 12 in the notebook and on the form, the parlor 13; the hint six actions in, "you haven’t seen where it went missing yet".
- **The browser** (Vite on this worktree, `localhost:5192`), at desktop and 375 px: the grid's key at Poached 37 ("The marked hour is the one Rosenbaum gave.", "poison?") and Raw 33 ("The marked hour is when it happened."), Medium 37's ("The marked hours are the ones Lathrop gave.") with the reasons line under it, Ashby's ten tapped (her second story and Alfano's list, "then said the Orpheum, and that doesn’t agree either"), the report form's "What clears them" prompt, How it plays and How this works. At 375 px nothing scrolls sideways (375 of 375).

## 3. What's open

In docs/25 too.

- **The confront menu is shorter.** Only lines that bear on what they said are offered, about a third as many as before (541 → 181 on §1.3's runs); a claim whose only bearing line is the one that breaks it is a one-line choice. That's the brief's rule; whether the confront should keep a longer list to pick the line from is the designer's call.
- **The brief's example sentence** for B2, "If Brennan is the other liar, …", says a second liar exists, which round 7's B9 rule (a test in `plain-words.test.ts`) forbids before the verdict; the page says "If your answer is Brennan, pick what clears her from this same list: somebody else’s word, not her own." under the question.
- **The notebook's "How it adds up"** still says a second story as "Faced with it, Ashby changed the answer to the Orpheum." (B9): the clause is the narration's (the turn and "Go over what I have" say it too), `round9-prose`'s; the grid, its clash lines and the web's tap mark it.
- **The web's cells** still show only the first story ("Ashby’s✗"), as before (375 px); the second, and its ✗, are in the tap and the cell's label.
- **Two refusal voicings kept**: "…, and somewhere usually has a witness, or pointedly doesn’t." and "…somewhere with a witness, or pointedly without one." claim no witness (the absence counts too); if they read as sending the player out for one, they're the next to go.
- **Shared with `round9-prose`**: this build edits five REACTION `refuse-thought` templates in `content/board/voicings.json`, the refusal's fallback in `pages.ts` `writeConfront` (two lines), and `bones/phrase.ts` `breakToFace`'s tails; a merge there wants a look.
