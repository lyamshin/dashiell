# Clarity, build 1

*2026-10-19. The designer, after his nine-note playthrough: "it's improving. It's vaguely playable now, which it wasn't before. But it's so dense and unclear." docs/58 read two nights against his notes and found the density was mostly redundancy and recitation, not voice: the same fact two or three times on a page, watchers and accounts recited hour by hour, thoughts that said the list again, continuity slips, the office out of order, tics, and assembly bugs. This build takes them in that order, generally (never per seed), and is gated by a skim test rather than a preference read. Branch `clarity-1`.*

## 1. What was built

Each item names its rule, where it lives, and one before → after from the nights docs/58 read. All of them are on every tier and both worlds.

### 1.1 Said once

A fact is said once a page. `plan/once.ts` keys every proposition by what makes it that fact (`factAtoms`: a person at a place at an hour is one atom whoever's word it is; an agreement, a collision, a placement drawn at the crime hour are atoms of their own), and measures two sentences' shared content words. `plan/once-pass.ts` runs after the rhythm, before the reference pass:

- a thought's fact whose atoms the page has all said, or a sentence that shares five content words with one before it **and brings fewer than three of its own** (`saysAgain`), goes;
- texture that says a fact again, or does again what the page has just done ("I wrote it down…" twice, "I took my hat off" then "I took off my hat and began…"), or handles a thing in my hands a second time (pencil, notebook, hat), trades for a card that fitted as well, or goes if it's an aside, a hand-off or a close;
- the givens are said once a night outside the turn and the report: the scene no longer says the way in again, and a find says what the room shows and where the key came from, not the office's sugar tin;
- a hand-off isn't said on two pages running (`Page.board.handoffTo`); a pointer says who and when, and leaves where to the account ("Feeney had said he was with Brauer at eight").

The lint is `repeat` (`clarity-lint.ts`): two sentences on a page sharing an atom, or five content words where the later brings fewer than three new ones, outside the turn and the report. One person's own account may name a place and company twice (two hours, docs/43's "whole"), and a put's speech reads the line back by design (as docs/47's "sentences twice" has it).

- Medium 7, the search. Before: "Locking up behind you takes a key, and everybody who drops in at the Delmonico rooms knows the spare is in the sugar tin. / The key that let them in was the spare, and the spare lived in the sugar tin at the Delmonico rooms." After: "Locking up behind you takes a key, and the spare was at the Delmonico rooms. / Whoever let themselves into Kreuzer’s flat had been at the Delmonico rooms first, for the key." (The scene page before it no longer says "a key opened Kreuzer’s door, and the spare key lives in the sugar tin" either.)
- Raw 7, the hand-off. Before, page 4: "Bledsoe’s evening was still a blank in my notebook, and she was at Moskowitz’s", and page 6: "Bledsoe was in the room with me, and I didn’t have her evening yet." After: page 3 says "Bledsoe hadn’t told me her evening yet, and I’d find her at Moskowitz’s", once (a plan, where "and she was at Moskowitz’s" read to the skim test's readers as where she'd been, §3).

### 1.2 Told by change

`tell.ts` `listByChange` and `companyByChange` tell a watcher's hours and a person's company by intervals: who was there throughout, who came and when, who left and when, an hour nobody was in, and "nobody else" once for the span (said without the span, "That was everybody", after a clause that said "all evening"). Each clause is a part of one `seq` composite; `bones/reread.ts` reads every part back and merges them into the hours (`mergeParts`), so the round trip still reads every hour exactly. A standing other who was simply there all evening goes in with the names that were ("Obermann and Benny were at a table all evening"). The lint is `slots`: three or more bare hour-slot clauses in one quotation.

- Raw 7, page 6. Before: "Eight o’clock, Mosley, Bledsoe and Hanrahan. That was everybody. Then nine: Mosley, Rafferty and Hanrahan, and that was the whole place. At ten I had Mosley and Hanrahan, and not another soul." After: "Mosley and Hanrahan were at a table all evening. Bledsoe ate at eight and left. Rafferty came in at nine, like every night, and was gone by ten. That was everybody."
- Raw 7, page 9. Before: "First, eight o’clock: Reinhardt and Crowninshield, and that was everybody, I’m quite sure. At nine o’clock, only Bledsoe, Reinhardt and Crowninshield. Ten: Reinhardt and Crowninshield, and not a soul more." After: "Reinhardt and Crowninshield were present all evening, start to finish. Bledsoe came by at nine and was gone by ten. Nobody else came in or out."
- Medium 7, page 5 (company). Before: "Hour by hour, Hargrove was with me at eight; Steinbach was with me at nine; Colquitt was with me at ten; at eleven it was just me." After: "Hargrove came by at eight, Steinbach at nine and Colquitt at ten, one at a time. I had nobody with me at eleven o’clock."
- A person's own evening, Raw 7, page 7: "At eight I was at Moskowitz’s, with Mosley and Hanrahan. At nine I went round to Mrs. Nagy’s to borrow a hatpin, with Reinhardt and Crowninshield. Then at ten I went to Moskowitz’s for supper, alone." (docs/58's target, near enough; the "back" form for a return to the same place is open, §7.)

### 1.3 The thought gives the consequence

`thought.ts`: after a list, what it means at the hour that matters (`sayThen`): who was still there, who had gone, and who had been where the means was kept and gone before it happened; after an account, that nobody else had said where they were then (`UNBACKED`), or nothing (an aside) where something held already speaks to it; after a find, that whoever did it had been where the means was, first. A collision is said by what it does to the story, not by reciting the line again: "She had said Moskowitz’s at ten, and Hauck hadn’t seen her there" (`COLLISION-PAIR` `here`, for a watcher's list on any page and an account on the page that told it). docs/46's levels hold: above Raw the hour is one of the office's ("at eleven, one of the two hours Kreuzer had given me"), never yet the hour it happened, and at Hard-boiled the thought states a fact and links nothing.

- Raw 7, page 6. Before: "I went over what she had told me, an hour at a time, and it came to this: Mosley was at Moskowitz’s at ten." After: "So at ten, when Rafferty died, Mosley was still at Moskowitz’s. Bledsoe had left by then."
- Raw 7, page 9. Before: "She said that at ten, when Rafferty died, only Reinhardt and Crowninshield were at Mrs. Nagy’s. Bledsoe had been in at nine and gone out after." After: "So Bledsoe had been at Mrs. Nagy’s at nine, where the revolver was kept, and gone before ten; Reinhardt was still there at ten."
- Raw 7, page 7. Before: "Here was the trouble: she said Moskowitz’s at ten, but Hauck said only Mosley and Hanrahan were at Moskowitz’s at ten o’clock." After: "She had said Moskowitz’s at ten, and Hauck hadn’t seen her there."
- Raw 7, page 3 (the find). Before: "The gun had been at Mrs. Nagy’s, and since Rafferty died at ten, whoever pulled the trigger had been there earlier to fetch it." After: "Whoever pulled the trigger on Rafferty had been at Mrs. Nagy’s first, to fetch the revolver."
- Who was there and who had left are two sentences ("So at eleven, when it could have happened, Sirkin and Grasso were at the Bijou. Whitfield and Rosenbaum had left by then.", where one sentence, "…were at the Bijou and Whitfield and Rosenbaum had gone", read as four names in a row); beside who had been where the means was, who hadn't is said short ("…, when the spare key was there for the taking, but Tillman hadn’t"); an agreement after a collision says only the hours it checked ("Wojcik did see her at the flats over Lipsky’s at seven, just like she said", never "The rest of her story held up"); and a find names the poison, so the thought after it isn't the first the page says of it.

### 1.4 Continuity

One sit-down a visit, one arrival a visit (the walk says "I was there" or the arrival walks in, never both), nobody already seated asked to sit, nobody already placed in the room brought in ("She came out to see who was on her stairs" after the arrival had her on a chair at the foot of them), one knock at the office door, my feet off the desk once, and the client at the scene explained or absent (`pages.ts`, `plan/situated.ts`; the lint is `continuity`).

- Raw 7, page 5. Before: "It was no distance to Moskowitz’s: round the corner, and there it was. … I went down to Moskowitz’s, a Romanian restaurant four steps down…" After: "Moskowitz’s was only round the corner, and I was there before I’d finished a thought. … Moskowitz’s, a Romanian restaurant four steps down on Second Avenue, was still serving at this hour…"
- Raw 7, page 9. Before: "In the front hall, I asked the landlady if she would sit down with me a minute" (she was on a kitchen chair at the foot of the stairs). After: "She took me into the front parlor and sat with her back to the window, where she could still hear the stairs."
- Raw 7, page 2. Before: "Steinbach was there, with a cup of something she hadn’t touched and her coat still buttoned." After: "Steinbach had got there ahead of me in a cab, and had a cup of something she hadn’t touched, with her coat still buttoned."
- Medium 7, the office. Before: "My visitor didn’t sit until I told her to. … I moved the chair an inch nearer the lamp, and she sat down in it without hurrying." After: "She sat down in the client’s chair a little at a time, and I waited until all of her had arrived."

### 1.5 The office in natural order

Who's dead; how and by whom found, the finder glossed with their job and what they were to the dead (`gloss.ts`); the police's view and the coroner's in the same beat; when, once, the answer opening on the hour (`when.ts`); who'd want it, every name glossed the first time, the neighbour who minds the pet introduced before the key she keeps, and the keeper of a spare key glossed where nothing before has; the money last, the first money on the page (the opening and the entrance never mention money). A test holds the "when" answer to opening on the hour.

- Raw 7. Before: "I had money in the desk drawer for once; I’d opened the drawer twice to make sure…" / "…by Mosley, who’d come round to collect a debt." / "Steinbach had it all by heart… “His watch broke when he fell, and stopped at ten past ten.”" After: "My head was pounding in time with the clock over the safe…" / "Rafferty, a bail bondsman, was found in his own rooms behind the tailor’s on Allen Street at half past eleven. The body was found by Mosley, a bus conductor who owed the dead man money and had come round about it. The police had a look and called it a robbery gone wrong." (the finder after the finding, his gloss at the end of its sentence, never between him and the verb) / "“Ten o’clock, near enough. His watch broke when he fell, and stopped at ten past ten.”" The notebook says the finder the same way now (it said "who’d come round to collect a debt", the debt the wrong way round).
- Medium 7. Before: the key ("Mrs. Mulcahy keeps the spare key in the sugar tin…") two lines before the neighbour ("Of an evening, Mrs. Mulcahy looks in on Fritz… A neighbor"), and "Money sat in the office for once instead of a promise of it." After: the neighbour first, then the key; the opening is cold coffee.
- Raw 11. After: "Mrs. Kowalski, the landlady, keeps my spare key in the sugar tin…" (was a bare "Mrs. Kowalski"); and the client says who she is before her flat is anybody's: "“I’m Assunta Marchetti,” she said, “and something is gone from my flat.”" (before: "Something was missing from Mrs. Marchetti’s flat. “It’s my late husband’s gold watch,”…", before anybody had said who was in the chair).
- The client's gossip is the neighbors', not "the woman downstairs", somebody the page never meets. Raw 7, before: "“There’s Clementine Bledsoe,” she said. “I don’t like gossip, but He threw her out of a lease. The woman downstairs told me.”" After: "“Ask about Clementine Bledsoe, a cafeteria cashier,” she said. “I don’t like gossip, but he threw her out of a lease. The neighbors all know it.”"

### 1.6 The nine notes

| note | rule | where |
|---|---|---|
| 1. a retainer before the client pays | no money in the opening or the entrance; the client's money is the first on the page | `pages.ts` `OPENING_MONEY`; ent-013 |
| 2. "a second one for the first" | "came in apologizing for the hour, then for apologizing, and was still at it sitting down" | ent-048 |
| 3. "He didn't wait to be asked"; two sit-downs | the client's first line says the act ("before I could ask"); one sit-down, the lint's `continuity` | voicings, `pages.ts` |
| 4. names with no gloss | the finder, the pointer, the guests and the keeper glossed the first time (job, tie) | `gloss.ts`, `pages.ts` |
| 5. the when answer answers the cause | the answer opens on the hour; the cause is the police's and the coroner's, in the finding's beat | `when.ts`, voicings |
| 6. the coroner twice | police and coroner in one beat, nowhere else | voicings `office/found-*` |
| 7. the papers make you infer the debt | an entry a suspect, the grudge with its direction: "Mosley: he owed the dead man the rent on a shop, and it was being called in." | `motives.ts` `PAPERS_SAID` |
| 8. a watcher recites hour by hour | told by change (1.2) | `tell.ts` |
| 9. the poisoning's time | "when" is the hour the dose was given, said once in the givens ("Whichever it was, that’s when she was poisoned; rat poison takes twenty minutes to an hour, so she died within the hour"); the report asks "When was she poisoned?"; verdict and curtain use the same words. The generator's crime hour was already the dose hour: no generator change. | `when.ts`, `report.ts` |

The papers, before (Raw 7): "Mosley: the lease on a shop, the rent owing, and a carbon of the dead man’s letter calling it in. Reinhardt: a wedding invitation nobody ever used; the dead man jilted his sister a week before the wedding. Bledsoe: a notice to quit, from when the dead man put her out on the street." After: "Mosley: he owed the dead man the rent on a shop, and it was being called in. Reinhardt: the dead man had jilted his sister a week before the wedding. Bledsoe: the dead man had thrown her out of a lease."

### 1.7 Tics

`tics.ts` names them; the hand, the voicings' chooser and the situated deck pass over a line that would say one again, and the said-once pass takes a second simile frame off a page. One simile frame a page ("as if", "as though", "like a/somebody…", "the way you’d / people / other men…"); the room-asked-to-help family once a night; "as it turned out" and "which I wrote down" once a night; a running gag (the radiator, the register, the spittoon, the sampler) twice a night at most, nothing else bringing its noun up. They're gates in `scripts/claudisms.ts --gates` (and a test over twelve nights).

- Raw 7. Before: "as if the tables could help" (page 6) and "as if the house might want to add something" (page 9); the radiator three times (pages 2, 3, 4); the register three times (5, 6, 7: "A cash register the size of a church organ", "The register by the door gleamed", "Like an organ before the hymn"). After: the tables once, the radiator twice, the register not at all.

### 1.8 Assembly

Lints for "would" before a past participle ("would spent"), a capital pronoun after a lower-case word ("but He threw"), one name twice in a sentence, a place said as a pronoun ("The table at her was set at eight"; the voice kit's find), and "them" for one known person in the verdict's why. Fixed at the source: the reference pass says "had spent" for "he’d spent"; a clause spliced mid-sentence loses its capital; a place said as whose it is ("at Kreuzer’s") is never a pronoun (it's "her place"); the subject of its own clause keeps its pronoun ("…and the man in a fur collar never said he was there", never "…never said the man in a fur collar was there"); a role isn't said twice in a sentence; a card whose pronoun the page leaves to two people trades for one that fitted as well (`plan/index.ts`); the verdict's why says the person.

- Raw 7. Before: "I asked where the dead man would spent the evening." / "I don’t like gossip, but He threw her out of a lease." / "Why: He threw them out of a lease." After: "I asked where the dead man had spent the evening" (on this night now "“Where had he been earlier in the evening?” I asked.") / "…but he threw her out of a lease." / "Why: Rafferty threw her out of a lease."
- Found by the skim test (§3): "her" before a determiner is the object ("I’d read her the wrong line", which the reference pass had made "I’d read the milliner’s the wrong line"); a place named past its title is named ("went round to Dr. Hirsch’s for a game of gin", once followed by ", at Dr. Hirsch’s flat"); a quotation that gives somebody's whole name names them ("“I’m Hinda Pomerantz,” she said", not "…,” Mrs. Pomerantz said"); and a means link says its place once ("…so whoever used it had paid the place a visit first", not "had paid the flats over Lipsky’s a visit first" after "came from the flats over Lipsky’s").

## 2. The measures

`scripts/clarity-measure.ts` over 30 nights a tier, both worlds, along the oracle's route; "before" is a copy of main (edb6f51) read with this build's measures (`--root`). Words per new fact is every word on every page over every fact the player gained (a line newly held, an office line).

| world | tier | words a page | words per new fact | repeat: same fact | repeat: same words | givens restated | slots | continuity | tics | assembly | verdict's why |
|---|---|---|---|---|---|---|---|---|---|---|---|
| dealt | Raw | 192 → 181 | 108.6 → 104.7 | 154 → 0 | 19 → 0 | 50 → 0 | 21 → 0 | 17 → 0 | 55 → 0 | 14 → 0 | 7 → 0 |
| dealt | Coddled | 191 → 181 | 108.6 → 104.2 | 167 → 0 | 12 → 0 | 50 → 0 | 27 → 0 | 18 → 0 | 59 → 0 | 12 → 0 | 8 → 0 |
| dealt | Poached | 184 → 177 | 95.6 → 92.0 | 173 → 0 | 20 → 0 | 50 → 0 | 56 → 0 | 26 → 0 | 94 → 0 | 22 → 0 | 8 → 0 |
| dealt | Soft-boiled | 183 → 177 | 87.4 → 85.3 | 138 → 0 | 17 → 0 | 45 → 0 | 59 → 0 | 26 → 0 | 89 → 0 | 39 → 0 | 11 → 0 |
| dealt | Medium | 176 → 166 | 82.3 → 80.0 | 120 → 0 | 14 → 0 | 45 → 0 | 59 → 0 | 33 → 0 | 94 → 0 | 58 → 0 | 12 → 0 |
| dealt | Hard-boiled | 177 → 164 | 82.6 → 78.2 | 319 → 0 | 4 → 0 | 45 → 0 | 54 → 0 | 25 → 0 | 84 → 0 | 105 → 0 | 12 → 0 |
| neighbourhood | Raw | 219 → 218 | 117.2 → 112.9 | 161 → 0 | 10 → 0 | 50 → 0 | 30 → 0 | 11 → 0 | 27 → 0 | 13 → 0 | 9 → 0 |
| neighbourhood | Coddled | 215 → 211 | 119.4 → 114.6 | 131 → 0 | 12 → 0 | 50 → 0 | 29 → 0 | 7 → 0 | 36 → 0 | 15 → 0 | 12 → 0 |
| neighbourhood | Poached | 206 → 197 | 100.0 → 95.8 | 191 → 0 | 52 → 0 | 50 → 0 | 48 → 0 | 12 → 0 | 70 → 0 | 11 → 0 | 7 → 0 |
| neighbourhood | Soft-boiled | 203 → 205 | 96.5 → 94.6 | 128 → 0 | 16 → 0 | 45 → 0 | 54 → 0 | 14 → 0 | 37 → 0 | 28 → 0 | 12 → 0 |
| neighbourhood | Medium | 199 → 198 | 93.2 → 91.2 | 126 → 0 | 34 → 0 | 45 → 0 | 57 → 0 | 15 → 0 | 48 → 0 | 47 → 0 | 9 → 0 |
| neighbourhood | Hard-boiled | 210 → 199 | 94.2 → 89.7 | 307 → 0 | 10 → 0 | 45 → 0 | 59 → 0 | 13 → 0 | 35 → 0 | 122 → 0 | 10 → 0 |

Words a page fell 6–7% on the dealt nights and 0–5% in the neighbourhood (one tier rose by two words): what went was said twice, and some of it came back as glosses (the finder's job, the keeper, the client's line opening on the hour) and as the consequence sentences. Words per new fact fell 2–5% everywhere. The rest held:

- **Round trip and clarity** (`scripts/roundtrip.ts --nights 30`): every plain page and every voiced composite read back, and every voiced composite clear, 100.0% on every tier in both worlds. The flesh column's misses are the neighbourhood's Miss Nowak naming Mrs. Rafferty, as before this build (3 and 2 units).
- **board-prose**: every lint 0 at every tier in both worlds, the five new columns (repeat, hour slots, continuity, tics, assembly) included; pronoun ambiguity 0 (oracle and all three routes); cards twice 0.
- **Jargon**: plain terms 0, engine words 0 (board-prose; `npm test`'s no-jargon).
- **Dealt boards** hash the same, seeds 1–40, every tier and type, both worlds (dealt 600 `1e8b196daf9470f9`, neighbourhood 600 `6677e6847de611de`): no generator change. The generator's crime hour was already the hour the dose went in (note 9).
- **board-measure**: every puzzle column unchanged (oracle, wanderer and reader, shortcuts, the innocent liar's break, lint issues 0, plain-terms hits 0, choices a page). "Callback pages" fell (Raw murder 72% → 57%, Hard-boiled lost pet 72% → 62%): the thoughts that said an earlier page's fact again were most of the callbacks.
- **board-prose's own measures**: "job pages with a thought naming an earlier fact" is 100% at Raw to Medium and 70% (dealt) / 68% (neighbourhood) at Hard-boiled, from 99% (§7); list smell rose (dealt Raw 9 → 23 pages of 280, Medium 51 → 65, Hard-boiled 29 → 53; neighbourhood Raw 34 → 43) (§7).
- **The claudisms gates** (`scripts/claudisms.ts --gates`) hold over the 36 nights.

## 3. The skim test

TODO

## 4. The preference read, for the record

TODO

## 5. The four nights, read

Read in full, page by page, after the last change: `npm run read -- --seed 7 --tier 0 --type murder --no-choices` (Raw 7), `--seed 7 --tier 4` (Medium 7), `--seed 11 --tier 0` (Raw 11), `--world neighbourhood --seed 5 --tier 4 --type murder` (the neighbourhood's Medium 5). §1 quotes the examples docs/58 named. The read itself found more, all fixed by rule before the measures above:

- **Two knocks** in the office: "…and then a knock, so soft I nearly missed it. My visitor knocked once, came in…" (the knock card and the entrance card). The entrance is drawn after the knock and never knocks again; the `continuity` lint counts a door knocked on twice.
- **Somebody brought in who was in the room**: "She came out to see who was on her stairs" after the arrival had Mrs. Nagy on a chair at the foot of them. A card that brings a placed person in is passed over.
- **A thing in my hands twice**: "…and I put my pencil between them." then "“Do you have a time for it…?” I asked, and found my pencil."
- **The notebook said the finder the other way round**: "by Mosley, who’d come round to collect a debt", where the office (and Mosley's papers) had him owing the dead man. The notebook says the finder as the office does.
- **"That’s one hour"** after "Pinsky saw you here at seven and eight" (an ask card): it's "That’s part of your evening. Tell me about the rest."
- **Money before the client's**: an entrance card had the client ask "straight off what it would cost".
- **The crime hour settled above Raw**: Medium 7's list page said "at eleven, when Fritz went" where the player is to work out which of Kreuzer's two hours it was. Above a walk the thought says "one of the two hours Kreuzer had given me".
- **The office's given in the find** (the sugar tin, Medium 7 and Raw 11), and **the keeper unglossed** (Raw 11's "Mrs. Kowalski keeps my spare key…").
- **A thought dropped that drew something new** (the neighbourhood's Medium 5, Doyle's page): "So he had it right, and Pinsky said the same: the Lyric at ten and at seven; East Houston Street was where Mrs. Krantz lived, and that was what mattered" shares five words with the account's "I passed Glick on East Houston Street" and was taken for a repeat. A sentence that brings three words of its own is new (`saysAgain`).
- **A second simile frame the lint didn't count**: "The way other men carry a newspaper" beside "like a meter running". The frames now include "the way other men / most people".

Words a page on these four nights, before → after: Raw 7 197 → 192, Medium 7 185 → 178, Raw 11 204 → 197, the neighbourhood's Medium 5 211 → 210. What's left on them is in §7.

## 6. Reused from the earlier attempt

The stopped attempt on the nine notes (`designer-notes-1`, uncommitted) was read before anything here was written:

- **Kept, then reworked:** `gloss.ts` (the finder, the pointer and the guests glossed the first time) now reads a job from the description where the case gives none, says the debt's direction from the finder's own grievance, and says "the dead man" where finder and dead are of one sex; `when.ts` (what "when" means, the client's answer opening on the hour, the poison's delay) now says "died within the hour", adds the report's question and `whenDone` for the notebook, the verdict and the story, and folds the small case's answer in.
- **Kept after a read:** its office voicing rewrites (the found line with the police and the coroner in one beat, the time answers opening on the hour), note 2's entrance card (ent-048), and the rule that the opening paragraph has no money in it.
- **Rewritten:** its changes to `pages.ts`, `plan/refer.ts`, `plan/situated.ts`, `bones/schema.ts` and `prose-lint.ts` were the start of the office's order and a posture lint; the office order, the continuity rules, the reference pass's place rule and the lints here are new code.

## 7. Open

In docs/25 too.

- **The voice kit's coverage test** (`test/voice.test.ts`, merged to main in #95 after this branch began) needs two composite shapes on its twelve fixed nights that this build no longer writes there: ADMIT-CHECK (a put's "his story had a hole in it…, but if what he said now was true, he had been at…", the owning up said again; the page now says who could check it) and CONFIRMED-WITH (an agreement's "…and at the same hour the same witness saw Marchetti there", now the list's consequence). Merged with main, that one test fails; everything else passes. The kit wants a hand line for each (as it has for ATTACH) or more nights. This branch stays out of `scripts/voice-*` and the kit's test, as asked.

- **Hard-boiled's thought.** At Hard-boiled the thought used to say the account's own hour again ("She said home at Kowalski’s at eleven, when Caruso went, and nobody had backed that up yet"); said once, it says that nobody else had said where they were, or, where a line already speaks to that hour, nothing but an aside. "Job pages with a thought naming an earlier fact" fell from 99% to 70% at Hard-boiled (dealt; 68% in the neighbourhood). Whether Hard-boiled wants a fact there that isn't a link is the designer's call.
- **List smell** (docs/49: three narration sentences in a row of one length band) rose: the consequence and the collision are each one medium sentence, and the rhythm can't trade a fact. The hand-over aside now comes in three lengths; more of the thought's own sentences could.
- **A return to the same place with the same people** says them again ("To start with, at seven I went to the Delmonico rooms to collect a debt, with Donnelly, K… Later, at nine, I went up to the Delmonico rooms to see about some money owed, with Donnelly…"): a "back … with them" form for accounts, with its reader.
- **Turn recaps** still say the collision the page before said (exempt by the brief: "outside the turn and the report").
- **A bible voice line about one hour can land after a later hour** ("Eight’s a good hour for a favor" after the ten o’clock clause).
- **Medium 7's search** says "the Delmonico rooms" in three sentences running (the find, the thought, the hand-off).
- **Miss Nowak's admission** still names Mrs. Rafferty (the flesh column's misses, as before this build).
