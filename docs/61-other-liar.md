# The other liar

*2026-10-24, branch `other-liar`. From Poached up two people lie about the crime hour (docs/41 rule 9, decided 2026-10-11): the culprit, and an innocent hiding a secret (at Hard-boiled, the culprit's friend in the pair). The report already wanted the line that shows the culprit lied (docs/46 §3), so a guess counts half. But a player who caught both liars could still pick one: `board-measure`'s "last liar caught" reader named the culprit and filed solved on 39–74% of nights from Poached to Medium, and the readers that follow the stars rose at Medium when the stars started pointing at the question that catches. The deduction the designer wants is telling the two broken stories apart. This build makes the report ask for it.*

## 1. What the report asks

After "What shows they lied", on a night with an innocent liar (every night from Poached up; never at Raw or Coddled), the form asks:

> **Somebody else’s story didn’t hold either. Who, and what cleared them?**

The player picks a person, or **Nobody else**, and then a line from what they hold, or **A hunch**. The lines are the same list "What shows they lied" offers for that name: the lines that touch that person's story at the hours that mattered first ("What I have about Zeldin’s own evening at nine:"), then the rest. In the book the list is rebuilt when the name changes; picking Nobody else leaves only the hunch ("Nobody else, so there’s nothing to clear."). The wording is plain, because it's an instruction and not narration.

What clears the other liar (`heldClearers`, `report.ts`) is a line held at the hour they lied that puts them where they really were, on a word that holds, once what's held places them there:

- **an admission, checked**: the witness the admission named, whose story has them together ("Doyle says he was at the Automat at nine o’clock, with Zeldin."). The owning-up itself is the liar's own line and isn't offered (decided 2026-09-28: an admission is checked, not believed);
- **the list that places them**: a keeper who saw them where they were ("Renfro: at eleven o’clock, Reinhardt and two union men I didn’t know were at the print shop."), or at Hard-boiled the barman's face, once the friend's own story has put a name to it.

Nothing clears the culprit: nothing true puts them anywhere but the scene.

## 2. Scoring

- **Solved** is who right, on the line that truly breaks their story, the other liar named, on a line that truly clears them, and the rest right.
- The other question is **its own point**, so a Poached murder is out of 5 where it was out of 4. The other liar wrong, Nobody else, I don't know, or the right name on a hunch or a line that doesn't clear them, costs that point; the outcome is `thin` (or `lucky`, if who was on a hunch too), and the profile clears a tier only on a full score, as before.
- **The verdict says so plainly.** With the right culprit: "You had the right name, but you didn’t rule out Zeldin." The right other liar on the wrong line: "…but you didn’t rule out Reinhardt: the line you picked doesn’t clear her." On a hunch: "…: a hunch doesn’t clear him." The row itself says "Klara Reinhardt ✗ — the right name, but not what cleared her" in place of "it was".
- **The true answer beside the player's, in the same words**: the verdict's rows give the true name and the true line in the form's own words; the curtain gains "WHO ELSE LIED, AND WHAT CLEARED THEM", their claim, "What cleared him:" and "You filed:", as "HOW THE LIE CAME OUT" does for the culprit.
- No change below Poached, or on a night without an innocent liar: the question isn't shown and nothing is scored for it.

## 3. The CLI, the teach page and the help

- `report <Name>` lists the lines that touch that person's story, as before, and now says "If Zeldin is who else lied, cleared counts down this same list." `file "who=…; breaks=…; other=Zeldin; cleared=4; …"` files it; `cleared=hunch` is a hunch; `cleared` without `other` fails plainly ("Name who else lied first"), and so does `cleared` on a night that doesn't ask. The save records `other` and `cleared`.
- **The teach page** splits its sixth line in two (the one-sentence version ran to 22 words with two asides): "To close the case you need a name and the fact that proves they lied." and "When two stories break, you also need what clears the other one." The rules (CLI help, "How it plays") add "When two stories break, it also asks who else lied and what cleared them."
- The voice script's warm-up says the question, "What cleared them" and "Nobody else" as lines of their own. The script's lint allows "cleared" and the bare "Nobody else." in the book's own help text, as it already allowed "the grid" and "the notebook": they're the report's question and answer, not narration (docs/53's engine words still hold everywhere else). The script also reads the hour's label by its key now, since "other" sits second on the form.

## 4. Measures

`npx tsx scripts/board-measure.ts --seeds 50`, 50 seeds a tier and case type. Before is main at `1904966`. The shortcut readers answer the new question the way each would: another liar it caught besides the one it named (a liar a star pointed it at first, if any), cleared by the first line the form offers for them, or Nobody else if it caught only one.

By tier, all case types together (Raw and Coddled never ask, and are unchanged at 100% for every reader, as before):

| tier | oracle solved, with the lines | wanderer files solved | wanderer, citing its collisions | reader (every star) files solved | reader naming the first liar it caught | anybody with access | a liar at random | **the last liar it caught** | the last liar, citing what caught the other one |
|---|---|---|---|---|---|---|---|---|---|
| Poached | 100% → 100% | 3% → 0% | 15% → 0% | 0% → 0% | 29% → **0%** | 24% → 1% | 37% → **1%** | 39% → **1%** | 39% → 1% |
| Soft-boiled | 100% → 100% | 5% → 0% | 16% → 0% | 0% → 0% | 36% → **0%** | 37% → 0% | 46% → **0%** | 64% → **0%** | 64% → 42% |
| Medium | 100% → 100% | 0% → 0% | 1% → 0% | 0% → 0% | 26% → **0%** | 29% → 0% | 56% → **0%** | 74% → **0%** | 74% → 44% |
| Hard-boiled | 100% → 100% | 1% → 0% | 5% → 1% | 0% → 0% | 0% → 0% | 0% → 0% | 0% → 0% | 0% → 0% | 0% → 0% |

(The last column is new; its "before" is the last-liar reader before the question existed, which is what it was.)

- **The oracle** files solved, at par, on every night, with the other question (the innocent liar, on the check or the list its path holds).
- **The puzzle columns didn't move**: par, the refusal shortcut, the confession route, the wanderer's who-right, whose story breaks first on the path, the lint and plain terms are the same before and after. Nothing in `src/gen/` changed, so the boards are the ones dealt before.
- **The shortcut readers fall to the wanderer's floor.** Each still names the culprit as often as before; what changed is that the name is no longer solved without ruling out the other one, and the first line the form offers for the other one is almost never what cleared them (the check, or the keeper's list, comes later in what's held than the lines that caught them).

**What's left: citing the grid's own line.** The last-liar reader that answers "what cleared them" with the line the grid set against the other liar, rather than the first line offered, still solves **42% at Soft-boiled and 44% at Medium** (1% at Poached, 0% at Hard-boiled). Every one of those nights is a refuser's (20 seeds a type: 20 of the 28 refusers' nights at Soft-boiled, 19 of 23 at Medium, none of the nights where the innocent owns up; at Poached the reader seldom gets as far as the keeper, 2 of 23). An innocent who refuses is cleared by the keeper's list at the place they really were (rule 9), and that list also breaks their story (it puts them somewhere else), so once it's held it's the line the grid shows against them. On those nights the clearing line costs a careless player nothing beyond the name, and the name is the old shortcut: the culprit's story is the one met last on 64–74% of nights. Where the innocent owns up (every Poached murder, about half the Poached lost things, and a third to two fifths of the nights at Soft-boiled and Medium) the check is a third person's story, which the grid never shows against them, and the shortcut is gone. Closing the refuser's case is the generator's or the grid's, not the report's (see §8).

## 5. Played by hand

Through `npm run play`, every page read.

- **Poached, murder seed 31** (a carving knife from the Delmonico rooms). The scene, the papers, the landlady's list (Feldman, Hurwitz and Zeldin had been there while the knife was in the drawer), the chop house's head waiter (Callahan and Hurwitz there at nine), Feldman's evening (the chop house at nine: Lanza says otherwise), the put to Feldman (she refused), the walk to the Automat, Zeldin's evening (home at nine: the landlady says nobody), the put to Zeldin (owned up: the Automat, with Doyle), Doyle's evening (the Automat at nine, with Zeldin). `report Zeldin` lists Doyle's line fourth under "What I have about where Zeldin said he was at nine:". Filed right, 13 calls against par 12:

  > Who else lied: Sol Zeldin ✓
  >     What cleared them: Doyle says he was at the Automat at nine o’clock, with Zeldin. ✓
  >
  > 5 out of 5: who (and what shows they lied), who else lied (and what cleared them), when, how and why.

  The same night with `other=Hurwitz; cleared=1` (Lanza's nine, which places Hurwitz, who never lied):

  > Who else lied: Bernard Hurwitz ✗ — it was Sol Zeldin
  >     What cleared them: Lanza: at nine o’clock, only Callahan and Hurwitz were at the chop house. ✗ — it was Doyle says he was at the Automat at nine o’clock, with Zeldin.
  >
  > 4 out of 5: who (and what shows they lied), who else lied (and what cleared them), when, how and why.
  > You had the right name, but you didn’t rule out Zeldin.

  and behind the curtain "You filed: Hurwitz, on Lanza: at nine o’clock, … ✗" under "What cleared him: Doyle says …".

- **Medium, lost pet seed 33** (Fritz, ten or eleven). The flat, the Odessa's cashier (who heard about the key; Margolis there all evening; Hanrahan never heard), Reinhardt's evening (the Odessa at eleven: Lathrop says otherwise), Brennan's (home at ten and eleven, alone), Mrs. Thorndike's (Fritz at hers at ten, so it went at eleven), Hanrahan's ("I passed Brennan on Avenue B. She was going fast, with no hat on."), the put to Reinhardt (refused: "I didn’t take anything", and the page pointed at the print shop from her own story), the print shop's foreman (Reinhardt there at eleven). The calls ran out on that page, 14 against par 12. Filed right: "Who else lied: Klara Reinhardt ✓ / What cleared them: Renfro: at eleven o’clock, Reinhardt and two union men I didn’t know were at the print shop. ✓", 5 out of 5. The same night with `cleared=2`, the line that broke her story rather than the one that cleared her:

  > Who else lied: Klara Reinhardt ✗ — the right name, but not what cleared her
  >     What cleared them: Lathrop: at eleven o’clock, only Hanrahan, Margolis and Lou were at the Odessa. ✗ — it was Renfro: at eleven o’clock, Reinhardt and two union men I didn’t know were at the print shop.
  >
  > 4 out of 5: who (and what shows they lied), who else lied (and what cleared them), when, where (and what puts it there) and why.
  > You had the right name, but you didn’t rule out Reinhardt: the line you picked doesn’t clear her.

  This night is also the §4 leftover by hand: Renfro's list is what clears Reinhardt, and once it's held it's also what the grid shows against her.

## 6. The browser

This worktree's build (`vite preview`), at the pane's desktop width and at 375 px: the teach page's seven lines; the report form's new question after "What shows they lied", its list rebuilt for "Sol Zeldin" and for "Klara Reinhardt" with the touching group first, and "Nobody else" leaving only the hunch; the verdict solved (Poached 31, 5 out of 5) and with the right name on the wrong line (Medium 33 lost pet, the row's "the right name, but not what cleared her" and the plain line under the score); the curtain's new block. At 375 px nothing scrolls sideways (the document is 375 wide) and the question wraps to two lines.

## 7. Tests

**773** (was 766), all passing at three workers; `tsc` is clean and `npm run build` works. New, `test/other-liar.test.ts` (7): the question is asked from Poached up, second on the form, and never below; the oracle files it solved on the check or the list, never the liar's own owning up, and the form offers that line under the name; a hunch, the wrong line, the wrong name, nobody or I don't know cost one point with the plain line; nothing clears the culprit; the curtain's block; the first-liar, last-liar and star readers under 10%; the teach page's two lines; the CLI's `other=`/`cleared=`, its plain refusals, the save, and no question on a Raw night. Updated: the play CLI's two filing tests (5 out of 5 with the other liar; 3 out of 5 and "didn’t rule out" on a hunch), and the world test's seven teach lines. (The suite took about six minutes here, with the machine's load average over 100 from other work; the same suite took two before that load.)

## 8. What's open

- **The refuser's night (§4).** A careless player who names the last liar caught and cites the grid's own line against the other one still solves 42–44% at Soft-boiled and Medium. Two ways to close it, neither the report's: the grid could keep a refuser's collision on the line that first broke the story (the claimed room's keeper, "nobody else") instead of switching to the keeper who places them once that list is held (`knowledge.ts` `breakersOf`, which the picker's pairs, the turn and the stars also read, so it wants its own read through); or the generator could stop the culprit's story being the one met last on most nights (docs/41 rule 9's three in five, 64–74% for this reader). Or leave it: on those nights the citing reader is right about the other liar for the right reason, and only the name was a guess.
- **A night filed before this build**, still on its verdict page in somebody's browser, is scored again on load and now shows the new question unanswered (4 out of 5 where it said 4 out of 4). The profile recorded the night when it was filed, so nothing else changes.
- **`model/voice/script.json`** isn't rebuilt here (between sittings, per model/voice/README; it's already behind main's pages). Rebuilt, its warm-up gains this build's lines: the teach page's seventh, the rules' new sentence, the question, "What cleared them.", "Nobody else.", the five-out-of-five score and the two plain lines.
- No blind playtests, as instructed. The CLI plays the new question through (`report <Name>`, `other=`, `cleared=`).
