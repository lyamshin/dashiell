# Closing the case in five answers

*2026-10-29, branch `closing`, off main at `a64a5a6` (proof-rows, #122). The designer: "the case closure interface ... is very wordy and there are a million options. I think requiring the 'who else lied' bit is odd. I think red herrings should make the deduction more difficult, not just add more tasks to run down; as built it really makes it more like a secondary challenge." They chose five short answers.*

## 1. What it is now

The report is five questions, one point each, out of five. Nothing is half.

| question | the answer | right when |
|---|---|---|
| **Who did it?** (a lost thing: "Who took it?", "Who took her?") | a suspect | it's the culprit |
| **Who caught them out?** | somebody whose evening or list you asked for, in the order you asked; and "Their own second story" once somebody has told one | the culprit is named, and that person's word, held tonight, breaks the culprit's story (`heldBreakers`, each line by whose it is: the speaker, or `second` for a story changed when it was put to them) |
| **When** ("When did it happen?", "When was he poisoned?", "When did she go?") | an hour | the crime's hour (a poisoning's is the hour the dose went in, as before) |
| **How?** (a murder) or **Where is it now?** (a lost thing) | the means; or a fence the night named, or still at the scene | the truth |
| **Why?** | a reason | the culprit's |

- **Outcomes** (the closing lines' decks are unchanged): five right is `solved`; the right name but not who caught them out is `lucky` ("I had the right name and nothing to prove it"); the right name and who caught them out, something else wrong, is `thin`; the wrong name is `wrong-man`; nobody named is `cold`.
- **The star** is as docs/67 has it: five out of five, gold with no hints.
- **Who caught them out, against the wrong name, is wrong.** An innocent's story may have been broken too (the other liar is still dealt), but the report asks who caught *them* out, the one you charged.
- **A find, or the office's word, never breaks a story** (`bearsOn` reads neither), so the answer is always a person or a second story. The brief's "What I found" never shows: no night has a find that breaks the culprit's story. If one ever does, `sourceOf` is where it goes.

## 2. Where it shows

- **The book's form** (`board-book.ts` `reportForm`): the plaque with "Who" as its typed blank, then the other four as ruled rows the way the verdict's ledger hands them back (the question in the frame's caps, the pick typed in carbon with the plaque's nickel caret, a row still at "I don't know" in the soft ink), the Close the case button, and under it the free controls (the hint, "Back to the case"). No rules on the form: each select starts at "I don't know", and the confirm still says the charge back and that it stays closed ("Feeney caught her out." among it). At 375 each row stacks its question over its pick.
- **The verdict** (`ui/report.ts`): five ledger rows, Right or Wrong, a wrong one struck through and corrected short: "it was Tillman", "Feeney caught her out", "Feeney caught Tillman out, not Obermann" (the right person against the wrong name), "Feeney would have caught her out" (nobody you asked), "it was ten o’clock", "it was laudanum", "it was with Benny", "it was Tillman’s: Grasso threw her out of a lease" (the reason said with whose it was; "it was Grasso threw her out…" read as broken grammar). Then "4 out of 5.", the tally and the star. The ledger's label column is wider (11.5rem) so "Who caught them out?" keeps to one line.
- **The curtain** (`curtainSheet`): "Who caught them out" (what they said, "What gave it away" with the line, and "You named: Feeney." against it, "Feeney, but you charged Obermann." when the name was wrong) and, for a lost thing, "Where it went" with "You said: With Lou.". "Who else lied" and "Did anyone else lie?" are gone from it; the board, the replay and THE LIES (every lie, the innocent one's too) are as they were. The CLI's `curtain` changed with it, on purpose (test/curtain.test.ts's hash: `246 2293a68e8ec074e0`).
- **The CLI** (`play-lib.ts`): `report` prints the five questions with their keys and numbered answers, and the command to close; `report <Name>` prints the same form. `close "who=…; caught=…; when=…; how=…; why=…"` (`where=…` for a lost thing), each a number or enough words, as every select answer already was ("Rafferty" is Mrs. Rafferty when she's the only Rafferty offered). The old keys are refused, saying what to give instead: `proof` and `breaks` ("Say who caught them out instead: caught=<name>."), `other`, `cleared`, `evidence`, `whereproof`, `whereBy`. docs/37 has the new rows.
- **What the player is taught** (`teach.ts`): the teach page's two lines about the proof and the innocent liar are now "To close the case you answer five questions: who did it, who caught them out, when, how, and why." and "Who caught them out is the person who told you what shows the one who did it was lying." The rules drawer's last line says the five, one point each, and the second story. ("Whose word" was the first draft; the voice script's jargon rule reads "whose word" as board-speak, and "the report asks" is the prose lint's. "The one who did it" is after the blind tester below, who wondered whether "them" meant every liar.) Every question on the form ends in a question mark now ("Who did it?", "How?", "Why?"), which the tester found uneven before.

## 3. What went

`breaks`, `whereBy`, `other` and `cleared` on the report; "What proves they lied", "What proves where it is", "Did anyone else lie? If so, who, and what clears them?", "What clears them", "Nobody else", "A hunch" and the line pickers with their group headings; `breakOptions(Shown)`, `whereByOptions`, `clearOptions`, `heldClearers`, `nobodyElseProved`, `otherLie`, `asksOther`, `keptPick`, `lineGroupHeads`, `lineNumbers`, `hoursThatMattered` and their words; half credit (`half`, `pointsText`, "right, but you couldn't have known", the verdict's plain lines, the "Half" mark); the CLI's per-person lists. The notebook keeps its numbers (its own, in the order things were held). A report filed before this may carry the old keys; nothing reads them, and its who caught them out is "I don't know".

The oracle files the five (who caught them out from what its path holds); the wanderer picks somebody off the form at random (`alt`: whoever its collision showed); the readers name whoever's word was in the line they put, or the collision's; `playFirstLiar` names whoever's word the grid set against the first liar.

## 4. What the other liar's question was holding

"Did anyone else lie?" and "Nobody else" on a hunch at half were what kept "close at the first lie" from paying. Without them it pays, until the second liar is a red herring inside the deduction (the work still to come). Over seeds 1–20, every type (`scratchpad/closing/probe/shortcuts.mts`); before is docs/69 §3's (50 seeds, main):

| tier | first liar (`playFirstLiar`), perfect: before → now | on one-liar nights | on two-liar nights | the reader naming the first liar it caught, solved: before → now | the hint-taker, solved | the wanderer, solved |
|---|---|---|---|---|---|---|
| Poached | 1% → 47% | 74% | 30% | 0% → 42% | 3% | 5% |
| Soft-boiled | 0% → 30% | 55% | 21% | 0% → 33% | 3% | 3% |
| Medium | 0% → 43% | 82% | 28% | 0% → 0% | 0% | 0% |
| Hard-boiled | 0% → 0% | 0% | 0% | 0% → 0% | 0% | 0% |

(Raw and Coddled have one liar and always did: the first liar is the culprit there, as before. Hard-boiled's culprit clash rests on a face the player has to put a name to, so the shortcut walks past it.)

Three gates that held these under 10% are `it.todo` now, each saying what it waits for: one-liar.test.ts §3, board-engine.test.ts's "the first liar you catch did it" (19% against 3% for anybody with access, over its 8 seeds), and closing.test.ts's readers. board-engine.test.ts keeps "no more than half the nights" as a live ceiling, and the hint-taker and the wanderer stay under 10% as gates.

## 5. Checks

- test/closing.test.ts (new): the five questions on every tier and type; who caught them out offers whom you asked, in order, and the second story once told; the oracle at five out of five and a gold star on every night; who caught them out right for exactly the people whose held word breaks the story; the right person against the wrong name; every outcome and every correction; "it was with Benny"; the charge; the curtain's sections and THE LIES whole; the CLI's form, `caught=` by name, part of a name and number, and every old key refused; the help and the rules. Rewritten to the new report: board-engine, book-look, case-2312 (the second story caught him out), curtain, hints, one-liar, plain-words, puzzle-fixes, round3, round4, round5, round7, round9. Deleted with what they tested: other-liar, proof-rows, report-pick.
- The puzzle is main's: nothing in `src/gen/` or `content/` changed; the dealt boards hash as main's, seeds 1–40, every tier and type, both worlds: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`.
- One blind playtester, through the CLI (Poached 21, a murder with two liars): closed five out of five, gold, 13 of 14 actions, and read "Who caught them out?" as the verdict scored it. The report "felt short and clear". Two things came of it, both in: the questions' punctuation was uneven ("Who did it (who):" beside "Who caught them out? (caught):"), and with the innocent liar's people on the list (Mrs. Kowalski, Broadnax, Lindemann) the tester wondered for a moment whether "them" meant every liar, so the rules say "the one who did it". Left for the designer: the list still offers everybody you asked, the innocent liar's witnesses and the culprit too, so it never hints which story matters.
- Stills of the form, the confirm, the verdict and the curtain at 1280, 1512 and 375: `scratchpad/closing/shots/`.
