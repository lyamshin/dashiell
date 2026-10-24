# Plain words

*2026-10-24, branch `plain-words`, off main at `687594a` (round 5's interface, #100). The designer read round5-ui's strings: "This still has too much Claude-ese. A 'call' should just be an action." Given the list below, they said: "Change them all, other than 'clear'. I think that's the right word to exonerate someone." This build changes them in everything a player reads that isn't the pages' prose: the CLI and the book's chrome, the report form, the verdict and the score, the grid, the picker, the rules and the title page's drawer. The pages' own prose (thoughts, puts' dialogue, arrivals, the report page's narration) is clarity-3's, which has the prose half ("held"/"didn't hold", "a line").*

*Nothing about the puzzle moved: the dealt boards hash the same (`b906a1009c23fe86` / `af89ea961f7168e1`), and par, the scoring and every board-measure column are main's.*

## 1. Now → plain

| now | plain | where |
|---|---|---|
| a call; "1 call" on every row; "costs a call"; "the calls are spent"; "N of M calls spent" | an action; every choice takes one, so a row says nothing unless it's **free**; "No actions left."; "N of M actions used" | `text.ts` (`costLabel`, `actionsText`), `clock.ts`, the CLI, the book |
| "Fourteen calls left before the DA files at eight." | "Fourteen actions left. The DA charges somebody at eight." (a lost thing: "Three actions left. Mrs. Marchetti wants an answer at eight.") | `clock.ts` |
| Put it to X; "PUT IT TO X"; "read him a line"; "Put nothing to her" | **Confront X**; "CONFRONT X"; "tell him"; "Don’t confront her" | `choices.ts`, the CLI, the book, `stars.ts`, the curtain |
| a line; "the line that breaks it"; "the line you picked" | what you were told; "what you’ll tell him"; "what you picked" | the picker, the form, the verdict |
| What shows they lied (breaks); What puts it there (whereBy) | **What proves they lied (proof)**; **What proves where it is (whereproof)**; `breaks` and `whereBy` still read | `report.ts`, the CLI's keys |
| Somebody else’s story didn’t hold either. Who, and what cleared them? / What cleared them | **Someone else lied too. Who, and what clears them?** / What clears them ("clear" stays) | `report.ts` |
| THE TURN (the heading on the page) | a divider: **Where things stood** | `text.ts` `chapterShown`, the CLI and the book (the page's block is untouched) |
| Go over what I have | **Review my notes** | `choices.ts` |
| pencil; "your own guess in pencil"; "Pencilled:"; "rub out" | **mark a guess**: `mark` (with `pencil` as an alias); "your own guess"; "Your guess:"; "clear" | the CLI, the grid's key, the book's grid |
| could get it? / knew how? | **Could they get the laudanum?**, with the night's means ("the spare key", "the revolver"; "Did they know where the key was?") | `grid.ts` `meansAsked`; the book's narrow column heads it "laudanum?" and asks it whole in the key |
| THE SHORT WAY THROUGH (13 calls: …); par | **THE FASTEST SOLVE: 13 actions (…)**; the detective's joke stays: "It took me 14 actions. A better detective would have done it in 13." | `report.ts` |
| Facing Thorndike was a call I didn’t need: … | **I didn’t need to confront Thorndike: he wouldn’t say, and I had enough to close the case without it.** | `report.ts` |
| File the report; Filing is final; File it; You filed | **Close the case** (the button, the form's heading, the submit); "Closing the case is final."; "You picked"; the CLI's `close`, with `file` as an alias | everywhere |
| "When two stories break, you also need what clears the other one." (the teach page) | **"When two people lied, you also need what clears the innocent one."** The only teach-page line changed. | `teach.ts` |

**The sentences:**

- **The key**, page one: "Every question, search and walk costs one call, and so does reading somebody a line with “Put it to”; the clock moves with the calls. A star means it’s worth doing next, and says why. A tick means done, and free to read again. Picking somebody costs nothing: what to ask them opens, and "back" shuts it. `page <n>` turns back to an earlier page." → **"Everything you do takes one action unless it says free. A star marks a good next step."**, in the book and the CLI alike; the CLI adds "Picking somebody shows what you can ask them; `back` shuts it, and `page <n>` turns back to an earlier page."
- **Talk heading:** "Talk to (picking someone is free; each question costs a call)" → **"Talk to"**.
- **Report groups:** "What I have at ten about Bellucci and the places he said he was tonight:" / "Anything else I have that names Bellucci or is about ten:" → **"What you know about Bellucci at ten:"** / **"Everything else:"**, over docs/55 5's same wide group (less literal than round 5's heading; the designer's call).
- **Blank rule:** "Filing is final. Anything left blank goes in as “I don’t know”, except What shows they lied and What cleared them, which go in as “A hunch”." → **"Closing the case is final. Leave anything blank if you’re not sure."** (with no actions left, "No actions left." first). The scoring is the same: a blank answer is "I don't know", a blank proof a hunch.
- **The picker:** "Pick the hour where his story is wrong, then the line that breaks it, such as somebody who saw everyone there at that hour and not him. Looking is free; reading one to him costs a call. If it breaks nothing, the call is gone all the same, and the page says why. The report counts the line whether you read it to him or not." → **"Pick the hour where what he said doesn’t match, then what you’ll tell him, such as somebody who saw everyone there at that hour and not him. If it doesn’t catch him out, the action is used anyway. The report counts it whether you tell him or not."** (Raw and Coddled: "Pick what you’ll tell him. …")
- **The grid's key**, cut to three and the hour: **"X" they say so · [X] somebody saw them there · "X"✗ where they clash**, and "! the hour it happened"; "X✓ both say so", "→Y owned up" and "~X your own guess" only when the grid shows one. "WHERE THE STORIES DON’T AGREE" is **"WHERE THEY CLASH"**.
- **The rules** ("How it plays", the CLI's help): "Each one costs a call" → "Each one takes an action"; "File the report when you’re ready: … the fact that proves it. … When two stories break, it also asks who else lied and what cleared them." → "Close the case when you’re ready: … what proves it. … When two people lied, it also asks who else lied and what clears them."
- **The curtain:** "You filed:" → "You picked:"; "WHAT PUT IT THERE" → "WHERE IT WENT"; "When you faced him with it, he refused to say." → "When you confronted him, he refused to say."; the fastest solve's steps say "Confront Ruggiero: nine o’clock." and "confront Ruggiero", where the generator's labels say "Put it to" (rewritten as they're shown; the generator isn't touched).
- **Errors and small words:** "The report is filed." → "The case is closed."; "I don’t have that line." → "I wasn’t told that."; "Nothing held about this hour yet." → "Nothing yet about this hour."; the CLI's "Filed already.", "Not until the report is filed.", "The report form is out: `report` shows it, `file` files it." → the case closed, or being closed.

BEFORE-AFTER

## 3. Tests

`test/plain-words.test.ts` (4):

- **The retired words fail a test** wherever the chrome says them: call/calls, "put it to"/"read him a line", "the line"/"lines", breaks, held/didn't hold, pencil, "File the report"/filing/filed, "short way"/par, "the turn", "Go over what I have", "could get it?"/"knew how?", "counts down". Read over the CLI along the oracle's route on a night at every tier and type and a neighbourhood night a tier (every page's choices, labels, notes and stars; the picker's note; page one with its key; the last page; the help; the report form and `report <culprit>`, without its answers; the notebook's headings; the verdict's score, plain lines and the actions line; the curtain's headings, picks and fastest solve; the grid's key and its means question), and over the book's own strings in `src/ui/board-book.ts` and `src/ui/report.ts`.
- The shared words (the key, the heading, the divider, the rules, the teach page, the form's labels, the blank rule, the group heads, the clock) say none of them, and the clock and the teach line say exactly what docs/64 asks.
- `mark` and `pencil`, `close` and `file`, `proof`/`whereproof` and `breaks`/`whereBy`: the same verdict either way.

Updated for the new words: `round5.test.ts` (U1's heading, U6's rule, U3's heads, U7's closings), `round4.test.ts` (the fastest solve), `round3.test.ts` (a choice says nothing or "free"; "Your guess:"), `other-liar.test.ts` (the teach line; "You picked"), `board-engine.test.ts` (the form's labels, "You picked"). `scripts/voice-script.ts`'s fixed lines say the new headings ("Where things stood.", "Close the case.", "Everything else.", "Review my notes.").

MEASURES

## 5. What's open

OPEN
