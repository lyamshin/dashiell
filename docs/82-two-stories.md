# Two broken stories, one killer (puzzles B, behind a flag)

*2026-10-29, branch `puzzles-b`, off main at `c99e5d1` (closing, #124, docs/78), with `puzzle-lab` (docs/79, the rig) merged in. Phase 2a of docs/79: idea B, prototyped behind a flag that's off by default, and measured. The designer chose all five ideas, each behind a flag, and one-liar nights at about one in six from Soft-boiled up. With the flag off nothing dealt moves (§5.2).*

## 0. In short

- **B is built, behind `puzzles: ['B']`** (`?puzzles=B`, `play new --puzzles B`, `lazy-rig --puzzles B`, `board-measure --puzzles B`), off by default. With it off nothing dealt moves: dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`, main's. Raw to Poached are the same with it on.
- **From Soft-boiled up the innocent liar was alone** at the hour they lie about, with nobody to name; put to it they refuse or try a second story, as the culprit does, half and half. Both are found where they said they were, both stories break on the same kind of answer, and the designed path meets either first on an even draw.
- **What tells them apart is the hour at Soft-boiled** (the lies fall at the window's two hours, the crime at the earlier on 58% of nights, a sighting on a list fixes it: the dead man at the bar, or the barman's boy who found him "in his chair with his eyes open" just before the later hour), **the means at Medium** (both say "home", both are seen out by a passer-by, the innocent was never where the means was kept), **and either on Hard-boiled's face nights.** The pair is left as it was. A new invariant, `discriminated`, holds on every two-liar night: without the hour or the means, both liars are left standing.
- **One night in six has one liar** from Soft-boiled up (17%, 17%, 18%); a one-liar night may be four questions (§3).
- **The lazy strategies that don't read the discriminator are near a coin flip** on two-liar nights: elimination by placement 37% and 65%, the first liar 51% and 48% (Soft-boiled, Medium); first clash 36% and 66%, outside ten points. **The ones that read the grid still win** (the notebook reader 72%, 100%; the cross-referencer 72%, 100%), because the grid says the means and the dead man's hours for the player: that's A's to take away. The first liar still files a perfect report on half the nights (it's a coin flip on two liars and certain on one).
- **Two blind testers** (Soft-boiled and Medium) solved five out of five, one action over par each, and each said why the other liar didn't do it in B's own terms: "the hour did", and "couldn't have got the laudanum".


## 1. The flag

`puzzles: string[]`, so far only `['B']`. It goes through `generateBoard`'s and `dealBoard`'s options (`DealWorld.puzzles`, part of the deal cache's key), and is kept with the night wherever the night is kept:

- **The book:** `?puzzles=B`. The night's save (`dashiell:board-run`) records `puzzles`, the URL keeps it, and "Back to the case" reopens the night with it. A save without it is a night without it.
- **The CLI:** `npm run play -- new --seed N --tier T --puzzles B --save F`. The save records `puzzles`; `--puzzles Z` is refused ("the prototypes there are: B"); a save naming one the book doesn't have is refused as damaged. `npm run read -- … --puzzles B` reads a night with it.
- **The tools:** `npx tsx scripts/lazy-rig.ts --puzzles B`, `npx tsx scripts/board-measure.ts --puzzles B`.
- **The case** records it (`BoardCase.puzzles`, `BoardCase.discriminator`) only when B applied, so a night without the flag, and a night the flag doesn't touch (Raw to Poached, and Hard-boiled's pair), is main's, byte for byte.

`parsePuzzles` reads the flag from any of these and keeps only the ones there are.

## 2. What B deals

From Soft-boiled up, on every night but Hard-boiled's pair (§2.4). docs/41's rule 9 changes for these nights; everything else holds.

### 2.1 The innocent liar was alone

The innocent liar's real hour, the one they lie about, has no witness: alone at the unwatched place of their secret, with no keeper's list and nobody with them (`buildCase`'s `alone`; the veto "the liar wasn't alone at the secret place"). There's no `ukeeper`, no `Y`, no companion. Their secret is said as an hour alone (`UDef.alone`: "an hour alone at the Automat, writing a letter she had promised her family never to send"); a night cast from the neighbourhood keeps the bible's own secret, at the place it names.

Put to them, they never own up with a name. They refuse ("I've told you where I was.") or, where there's another place a list covers that they could claim, tell a second story that breaks too, about half the time each. The culprit does the same, half and half where there's a second place to try, so how somebody answers says nothing (at Medium, before this, the culprit always tried a second story where one was possible). The refusal page already says a refusal with nowhere to point plainly ("But if he wasn't at the Shamrock at ten, he was somewhere, and he wasn't saying where."), and points at a list their own story names when there is one, guilty or not.

After midnight both are back where they say they were (`foundAt` = their claim), by the same rule.

### 2.2 What tells them apart: the hour (Soft-boiled)

- **The window, either hour.** The office's window is the same two hours as before; the crime is at the earlier on about half the nights (`bRng.chance(0.5)`) and the later on the rest. The means had to be had before the window's first hour, whichever hour it was (the scene still says "had to fetch it from Kowalski's before nine, the earliest he could have been given it").
- **The two lies at different hours.** The culprit lies about the crime hour; the innocent liar about the window's other hour, when they were alone. At the crime hour the innocent is somewhere a list sees them (the bar, or the house where the means was); at the other hour the culprit is. Both lie about somewhere a list covers, so both stories break on a list (or, for a lost pet, the neighbour who sat in all evening). Both had the means.
- **The sighting that fixes the hour** is on a list the office sends you to:
  - crime at the later hour: the dead man on the bar's list at the earlier hour, as before ("Hargrove was in early, like every night, and stayed till past nine");
  - crime at the earlier hour, a murder: the barman's boy, sent round with what the dead man left on the bar, saw him at the window's later hour ("A little before ten I sent the boy round to Hargrove's with the umbrella he left here. The boy was back by ten: Hargrove was in his chair with his eyes open, and didn't answer when the boy called. I should have gone myself."; both blind testers read the first draft's "he" as ambiguous, and one asked whether a shot at five past ten was ruled out, so the boy is back before the hour). How the boy saw him is how he's found: in his chair with a drink, on the floor shot, face down by the door stabbed;
  - crime at the earlier hour, a lost pet: the neighbour who minds it looked in just before the later hour ("A little before ten I looked in on Caruso with his supper, and he was gone").

  The solver reads these as the time-window technique (`Remark.done`: it was done by that hour, so in an hour before it).

So without the hour each of the two is placed at one hour of the window and not the other, and elimination leaves both; with it, the innocent was somewhere a list saw them, and the culprit is the one left.

### 2.3 The means (Medium)

- Both lie about the crime hour, and both say they were home: the culprit their flat, as Medium always had them, the innocent liar a flat of their own (`lhome`, "Brauer's flat on Clinton Street"; from the bible, their own home, unwatched), which nobody watches. A passer-by saw each of them out ("Walking over to the Bijou at nine, I passed Dandridge on Ludlow Street, going fast, no hat."), two passers-by where the walks allow it, else one who saw them both, each on the street nearest the dead man's door that the two walks share (so "seen on his street" isn't the culprit's alone: §6). So both stories fall to a side remark, and "the remark breaks the culprit" is gone. The innocent goes home after the hour of their secret, so the secret place is in nobody's story, theirs included.
- The innocent liar never had the means: they were never where it was kept while it was there (`lieMatters`: "had access, so the means can't tell the two apart"), never lodge or work there, and the origin's own whole list, with the hours the means was there (the landlady's "there at seven", the scene's "before nine, the earliest"), says so: closed on both sides. A small case's "means" is the way in: they weren't at the party, didn't hear the client tell the room, never went where the spare key hangs.
- The crime is at either hour of the window here too (and the sighting that fixes it is the same as at Soft-boiled), but the hour doesn't tell the two apart: both lie about it.

### 2.4 Hard-boiled

On face nights, the hour or the means, an even draw:

- **The hour** as at Soft-boiled, but both lie about the bar, whose list has the face at both hours of the window (the one innocent the barman knows only by a coat is there at both), so both stories break on a coat matched to a name and neither on a plain list.
- **The means** as at Medium: both home, both seen out by a passer-by; the face at the bar clears a rival.

The pair is left as it is: the culprit's friend lies with them, and the barman's coat puts the friend at the bar. A pair with B would need the friend unplaced, and then one of the two stories breaks on a passer-by and the other only through the partner, which tells them apart (whichever the remark names is the innocent one, or the night rates Medium); that's §8's.

### 2.5 No other tell, and the shares

- **`INNOCENT_LEADS` is 0.5 with B** (`INNOCENT_LEADS_B`): which story the designed path meets first is an even draw.
- **One liar on about one night in six** from Soft-boiled up (`ONE_LIAR_SHARE_B`: 0.15, 0.22 and 0.45 (Hard-boiled's of face nights) drawn, for the realized shares in §4). Poached is untouched.
- Either may claim home (Medium, Hard-boiled's means), either may be the one who lodges where the means was (Soft-boiled), and either may be found where the office sends you first.

### 2.6 What the player is told

The teach page gains one line, with the flag on and from Soft-boiled up only, after the one about refusals (`teachB`): "When two people have lied, only one of them could have done it. Find out when it happened, and who could have got the weapon." (a lost thing: "who could have known the way in"). It's plain, as the teach page is (docs/53's addendum), and says "lied" where the brief said "break" (docs/64: the chrome says "lied" and "checked out"). The book shows the teach page on a fresh night with B, whatever the profile, so the line isn't lost on a player who's won before; the CLI's `new` prints it. The prose B needs was nearly all there: a refusal with nowhere to point (the refusal page's "he was somewhere, and he wasn't saying where"), a second story that breaks (the culprit's, now the innocent's too), and an hour alone (said as the secret, in the curtain's THE LIES). What's new is the boy's sighting, the pet-minder's empty basket, and the six hours alone (`UDef.alone`); nothing in `content/`, `pages.ts`, `thought.ts` or `tell.ts` changed.

## 3. The solver, the gates, the path

- **The solver** has the techniques; what's new is that they decide who. `Remark.done` joins the time-window technique beside "seen alive somewhere else" (`solve`).
- **`discriminated`**, a new invariant on B's two-liar nights: with every question held, at the tier's techniques less the discriminator's (`time-window` for the hour, `access` for the means), neither liar is cleared and nobody is named. With it, the solver names the culprit (`unique`).
- **`lieMatters`** for B: nothing places the innocent liar at the hour they lie about, they don't own up, and with the hour they had the means (with the means, they didn't).
- **`twoStories`**: with the hour, the innocent lies about the window's other hour, never the crime's.
- **`liarsApart`** reads the innocent's second story too.
- **Par** with B counts breaking both stories (docs/41 rule 9, "both stories are on the path"): the designed path meets the red herring, since what clears the innocent isn't their story any more. Par is 5 to 7 questions on two-liar nights (§4). **A one-liar night may be 4** (`reject`'s floor, with B only): the honest innocent's hour alone is the window's other hour, and the list that sees them at the crime hour is one the night needs anyway, so most Soft-boiled one-liar nights are the scene, two lists and the liar's story. With the floor at five, 74 of 79 one-liar Soft-boiled nights were turned down and one night in a hundred had one liar, not the designer's one in six. The designer may prefer the floor and fewer one-liar nights, or a witness for the honest innocent's crime hour that only their own story names (C's agreement), which would make it five.
- **The Tatham check** holds as before: the night rates its tier (the tier below has no time-window to narrow the hour, or no side remark to break either "home"), and the refusal shortcut names nobody: two people hold out on every two-liar night.

## 4. Before and after

The rig, 25 seeds a tier and type, both worlds (750 nights), flag off (main, the new "before") against flag B. Raw to Poached deal the same with the flag on, so their "with B" is the flag-off run's. Every night's record is in the scratchpad's `puzzles/b/` (`before-all.json`, `after.json`; `compare.py` makes these tables from them). The rig takes 25 minutes on one core flag off; with B, 12 for Soft-boiled up.

### 4.1 The rig, ported

`scripts/lazy-rig.ts` files docs/78's five answers: who; who caught them out (whoever's word was in the line it put to them, else the line the grid set against them, else the form's first person); the hour their story broke at; how or where if the night told it; their own reason. "On a true line" is now "named who caught them out rightly", and perfect is five out of five. It gains three strategies:

- **the cross-referencer** (`xref`): the notebook reader's sweep, but it makes the one-lookup join itself (each claim against every whole list at that place and hour, a company witness's evening, a passer-by's remark), places people, reads the means off the origin's list and the hours off the dead man's sightings, and never reads the grid's ✗ or its placements; it confronts what its own join breaks and names whoever its join leaves standing;
- **first liar** (`firstLiar`): docs/78 §4's `playFirstLiar`, the designed path until a story breaks, then closes on that liar and their catcher;
- **elimination by placement** (`elim`): the notebook reader's sweep, naming whoever the grid's placements alone leave standing at the office's hours, with neither the means column nor the dead man's row: what's left when nothing tells two broken stories apart.

It also records per night whether the generator dealt the seed and in how many attempts, the crime at the earlier hour, and par in questions beside par in actions. `tsc` covers it (`tsconfig.json`'s `include`).

### 4.2 The right culprit on nights with two liars

| strategy | Soft-boiled | Medium | Hard-boiled (all) | Hard-boiled, B's face nights only (n=34) |
|---|---|---|---|---|
| random suspect | 27% → 29% | 19% → 23% | 14% → 12% | 9% |
| anybody with the means | 26% → 27% | 39% → 41% | 20% → 22% | 26% |
| means and lists only | 45% → 76% | 46% → 84% | 34% → 34% | 38% |
| first clash | 50% → 36% | 10% → 66% | 14% → 24% | 29% |
| first liar | 29% → 51% | 38% → 48% | 16% → 40% | 71% |
| elimination by placement | 39% → 37% | 52% → 65% | 78% → 78% | 47% |
| notebook reader | 61% → 72% | 94% → 100% | 96% → 99% | 97% |
| cross-referencer | 53% → 72% | 99% → 100% | 39% → 61% | 94% |
| the tier's trick | 64% → 73% | 100% → 70% | 64% → 71% | 91% |
| oracle | 100% → 100% | 100% → 100% | 100% → 100% | 100% |
| *nights* | 66 → 83 | 69 → 83 | 85 → 82 | |

(Hard-boiled's pair, 48 of the 82, is as it was: elimination 100%, the notebook reader 100%.)

### 4.3 All nights: the right culprit, and the perfect report

| strategy | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|
| first clash | 67% → 46%; perfect 67% → 43% | 35% → 63%; 34% → 58% | 14% → 29%; 6% → 21% |
| first liar | 53% → 59%; 33% → 50% | 57% → 57%; 44% → 47% | 20% → 46%; 0% → 23% |
| elimination by placement | 60% → 46%; 60% → 46% | 67% → 63%; 55% → 57% | 80% → 80%; 75% → 75% |
| notebook reader | 74% → 76%; 70% → 51% | 96% → 100%; 17% → 2% | 97% → 99%; 70% → 66% |
| cross-referencer | 69% → 76%; 67% → 51% | 99% → 100%; 24% → 0% | 46% → 66%; 32% → 49% |
| the tier's trick | 76% → 77%; 74% → 76% | 100% → 75%; 89% → 53% | 69% → 76%; 48% → 57% |
| means and lists only | 51% → 74% | 51% → 86% | 34% → 37% |
| star follower | 45% → 70%; 34% → 41% | 31% → 64%; 0% → 0% | 18% → 28%; 0% → 4% |
| oracle | 100% → 100%; 100% → 100% | the same | the same |

(The rest, Raw to Poached and the floors, are unchanged: `compare.md`.)

### 4.4 The deal

| | Soft-boiled | Medium | Hard-boiled |
|---|---|---|---|
| dealt on the seed | 100% → 100% | 100% → 100% | 100% → 100% |
| attempts, mean | 3.1 → 2.0 | 3.3 → 1.6 | 2.5 → 2.1 |
| crime at the earlier hour | 0% → 58% | 0% → 50% | 0% → 25% (B's nights: hour 58%, means 42%; the pair always the later) |
| one-liar nights | 34% → 17% | 31% → 17% | 15% → 18% |
| par, questions (mean, range) | 6.2 (6–7) → 4.8 (4–5) | 7.2 (6–8) → 6.1 (4–7) | 7.0 (7–7) → 6.6 (5–7) |
| par, actions (mean) | 10.7 → 8.3 | 12.4 → 11.2 | 12.5 → 11.6 |
| budget, actions (mean) | 12.7 → 10.3 | 14.4 → 13.2 | 13.5 → 12.6 |

Over more seeds (1–60, both worlds, 240 nights a tier, `probe/share.mts`) the one-liar shares are 16.7%, 17.5% and 15.8%, and the earlier hour 51%, 54% and (B's nights) 54%. Proof depth (the rig's last table) is unchanged in kind: every culprit's story breaks on one answer at Soft-boiled and Medium, and the hour is narrowed on one; at Soft-boiled the innocent liar is a rival who clears on one answer (the list that sees them at the crime hour).

## 5. Targets, hit and missed

- **Hit: the deal.** The crime at the earlier hour on 58%, 50% and 42–58% (target 40–60%); one-liar nights 17%, 17%, 18% (target about one in six); the oracle 100%; the generator deals every seed, in fewer attempts than before; `discriminated` holds on every two-liar night (the invariant, and the test).
- **Hit: elimination by placement and the first liar on two-liar nights, near a coin flip.** Elimination 37% at Soft-boiled and 65% at Medium (±15 of 50%), the first liar 51% and 48%. With two broken stories and nothing placed under either, the night doesn't give the name away by who was where.
- **Missed: first clash,** 36% at Soft-boiled and 66% at Medium: within 16 points of a coin flip, not 10. Which broken story the room-by-room sweep meets first isn't the designed path's lead (that's even): at Soft-boiled it's the innocent's more often, at Medium the culprit's.
- **Missed, as the brief expected: the readers that read the grid.** The notebook reader (72%, 100%, 99%), the cross-referencer (72%, 100%), "means and lists only" (76%, 84%) and the tier's trick (73%, 70%) win the hour and the means nights, because the book still does the discriminator's sum: the means column says "no" with its reason, the dead man's row and a list's page say when he was alive, and at Hard-boiled "Alfano was still alive at the Bijou at nine" is said outright. That is A's (§8). What B changed is that they now win by reading the hour or the means, not by placement: elimination alone falls to a coin flip.
- **Missed: Hard-boiled overall.** The pair is untouched (§2.4) and is 59% of Hard-boiled's two-liar nights; elimination is still 100% there. On B's face nights (n=34) the first liar is 71% (the designed path meets the culprit's coat first on the means nights), and first clash 29%.
- **Missed: par 5 to 9.** Two-liar nights are 5 to 7 questions; one-liar nights are 4 on most at Soft-boiled and some at Medium (§3: the floor is 4 there, or the share falls to 1%). Soft-boiled two-liar nights are all 5: the scene, two lists, two stories.
- **The perfect report.** B doesn't stop the shortcut: the first liar files a perfect report on 50%, 47% and 23% of nights (33%, 44%, 0% before). On a two-liar night it's a coin flip (and its catcher is right whenever its name is); on a one-liar night it's right by construction, and B halved those nights' share but evened the lead (0.6 → 0.5), which raised it on two. Under 10% needs the grid to stop concluding (A) and a false clash on one-liar nights (D).

### 5.1 The three parked gates, live under the flag

Each was `it.todo` since docs/78; each is now a live test with the flag on, from Soft-boiled up, set at what B achieves (seeds as the old gates had them; `probe/gates2.mts`):

| gate | file | with B | the gate |
|---|---|---|---|
| the first liar's perfect report | one-liar.test.ts §3 | 55% of nights, 53% of two-liar nights | no more than 60% of either (the old target was under 10%: §5) |
| "the first liar you catch did it" against anybody with access, two-liar nights | board-engine.test.ts | 20% against 13% | no more than access plus ten points: the original gate, met |
| the shortcut readers (the first and the last liar caught) | closing.test.ts | 23% and 19% | no more than a quarter (the old target was under 10%) |




### 5.2 The deal didn't move

With the flag off, the dealt boards hash as main's, seeds 1–40, every tier and type, both worlds (docs/71's script): dealt 600 `4fb4585bb4150adf`, neighbourhood 600 `6fac2173840f859a`. `test/puzzles-b.test.ts` pins seeds 1–3 (`c338c8d68e283ea7`), checks that `puzzles: []` is the same night, and that Raw to Poached are the same night with the flag on.

## 6. Four nights, read page by page

With the flag on, along the designed path (`npm run read -- --seed N --tier T --type X --puzzles B --curtain`; the reads are in the scratchpad's `puzzles/b/read/`).

**Soft-boiled 2, a murder, the hour** (laudanum from the Delmonico rooms; the window nine or ten; done at nine). The office gives the two hours; the table, the bottle and "before nine, the earliest"; the papers. At the Shamrock, Weisglass's list has Hargrove there at eight (an hour before the window, so it settles nothing) and the boy: "A little before ten I sent the boy round … The boy was back by ten: Hargrove was in his chair with his eyes open." Sweeney's story (the Shamrock at nine) and Pickering's (the Shamrock at ten) both break on the same list, and the page says each ("Here was the trouble"). Mrs. Havemeyer has Sweeney in the house at seven and Pickering at eight, so both could have had the laudanum, and Pickering in the house at nine. **Where the reasoning happened:** nowhere on the page. The grid keeps nine and ten both "?", marks both stories ✗ and both "yes" for the poison; the player has to put the boy against the window (done by ten, so nine), see that Pickering's lie is about an hour that doesn't matter, and read Mrs. Havemeyer for nine. That's the whole deduction, and it's three things held together for the first time in the game.

**Medium 2, a murder, the means** (cyanide from Feld's studio; nine). Brauer, who found him, says he was home from seven to nine; Dandridge says home from nine. Broadnax passed Dandridge on Ludlow Street at nine, "going fast, with no hat on" (and the page adds that Ludlow Street was where Hargrove lived); Moretti passed Brauer on Rivington Street at nine, in the same words. Schilling's list at Feld's studio: Broadnax all evening, Dandridge at eight, shut at nine; the cyanide there at seven. Salerno's boy fixes nine. **Where the reasoning happened:** half in the grid. The grid's means column says Brauer "no" ("never at Feld's studio while it was there") and Dandridge "yes", so the two broken stories are told apart for the player; what's left is noticing that the column is what decides it. The page's own aside ("Ludlow Street was where Hargrove lived") could have been a tell, since the culprit walks to the scene and the innocent doesn't; both sightings are put on the street nearest the scene the two walks share, so over the 106 means nights with two liars (seeds 1–25, Medium and Hard-boiled, both worlds) the culprit is seen on the dead man's own street on 52% and the innocent on 45%, and on the same street as each other on 60%.

**Medium 4, a lost canary, the means** (the window nine or ten; taken at nine). The office's card party is the means: Rosenbaum and Tillman were there, "and that was everybody". Feeney's whole story is "home all evening, by myself"; Rosenbaum's is the supper, home at nine, the chop house at ten. Tillman passed Feeney, and Brennan passed Rosenbaum, both at nine and both "no hat". **Where the reasoning happened:** in the office. Feeney was never at the party, which the office said at the start and the grid's column repeats, so she couldn't have known about the window. The hour comes from Rosenbaum's own story checking out at ten (the chop house's list), not from a sighting.

**Hard-boiled 7, a murder, a face night, the hour** (chloral from Kowalski's; ten). Bledsoe says the Bijou at ten, Steinbach the Bijou at nine; Dettweiler's list has only "somebody in a sailor's pea coat" at ten, and the pea coat with Tramonti and Alfano at nine. Rafferty walked in wearing the pea coat. Mrs. Kowalski has Steinbach in the house at ten. **Where the reasoning happened:** the coat (twice: neither liar was the coat) and the hour, which the page gives away: "Alfano was still alive at the Bijou at nine." (A's work: that sentence is a sum.) With the hour, Steinbach's lie is about nine and he's at Kowalski's at ten.

## 7. Two blind playtests

Fresh agents, the CLI and its own help only, the flag on, told nothing of B (prompt: `puzzles/b/play/prompt.txt`; saves beside it).

| | Soft-boiled 11, a murder (the hour; done at nine) | Medium 9, a murder (the means; nine) |
|---|---|---|
| solved | 5 out of 5, gold, right name | 5 out of 5, gold, right name |
| actions | 10, par 9 | 14, par 13 (budget 15) |
| stories that broke | two: Ruggiero's (nine) and Renfro's (ten) | one, as they played it: Tillman's; Margolis's would have broken on Steinbach's word, which they never asked |
| why not the other | "the time ruled him out. Callahan was dead by the time the boy came at ten, so the shot was at nine, and at nine Mrs. Nagy had Renfro in her hall. His missing hour came after the killing. Both of them could have taken the revolver, so the weapon didn't settle it; the hour did." | "she never set foot in Rafferty's and couldn't have got the laudanum" |

Both named the other liar's way out as B means it: the hour, and the means. What they flagged, and what came of it:

- **The boy's "he"** ("The boy said he was on the floor…"): both read it as ambiguous, and it's the line that settles the hour. Now it names the dead man. The Soft-boiled tester also asked whether a shot just after ten was ruled out by a boy *sent* at ten; the boy is now "back by ten", sent "a little before".
- **An empty lead** (Medium): the innocent's secret place was in their own story at the hour after, so the place list offered it, with nobody there to ask, an action spent for nothing. With the means the innocent now goes home after the secret hour, and the place is in nobody's story. At Soft-boiled it can still be in their story at the hour next to it (taking that away leaves the crime at the later hour with no evening that fits on four nights in five).
- Not B's, left for the text run: "Whoever shot he had to fetch the revolver…" (the names pass made the dead man a nominative "he"), "early on" for seven on a list, `do back` refused after `report` in the CLI, and the finder "finding" at half past eleven a man the boy saw at ten ("I should have gone myself" half covers it).

## 8. What's left for A, C, D and E

- **A, the notebook stops concluding.** B moves what decides *who* to the hour and the means, but the book still reads both off for the player: the grid's means column says "no" with its reason ("Brauer was never at Feld's studio while it was there"), the dead man's row shows where he was seen alive, a list's page can say "Alfano was still alive at the Bijou at nine", and the grid marks every clash. So the readers that read the grid (the notebook reader, the tier's trick, means and lists) win the hour and the means nights, as §5 shows. With A, those become facts the player must join; B's nights are what A has to work on.
- **C and D, two-step proofs and imperfect witnesses.** Every break is still one answer: a list, a passer-by, a coat. The hour is one sighting, the means one list. C's two sources for the means window ("in the drawer at seven", a lodger's "gone when I looked at eight") and the hour, and D's false clashes on one-liar nights (which are what stop "the first liar" there), are next.
- **E, time and distance,** is Hard-boiled's third discriminator. Until then Hard-boiled's face nights draw the hour or the means, and the pair is as it was: a B for the pair needs the friend unplaced, and then one of the two stories breaks on a passer-by and the other only through the partner, which tells them apart (the remark names the innocent one, or the night rates Medium); the walk, or a second sighting, is what would make it even.
- **One-liar nights.** On a night with one liar the liar did it, by construction: every strategy that names a liar it caught is right on all of them. At one in six that's the floor §4 shows for "first clash" and "first liar"; D's false clash is what takes it away.

## 9. Files

New: `test/puzzles-b.test.ts`, this doc. The generator: `generate.ts` (B, behind `bOn`, its draws on a stream of their own), `index.ts` (`parsePuzzles`, the flag through `generateBoard`, the one-liar floor), `solver.ts` (`Remark.done`), `invariants.ts`, `path.ts`, `types.ts`, `content.ts` (`UDef.alone`, added), `world/cast.ts` (the liar's flat, the window's first hour). The game: `model.ts` (`DealWorld.puzzles`), `teach.ts` (`teachB`, `teachLines`' second argument), `bones/extract.ts` (a `done` remark is said in the speaker's words: one line), `ui/board-book.ts` (the flag in the URL, the save and the teach page), `cli/play-lib.ts` and `cli/read.ts` (`--puzzles`). The tools: `scripts/lazy-rig.ts`, `scripts/board-measure.ts`, `tsconfig.json`. The three gates: `test/one-liar.test.ts`, `test/board-engine.test.ts`, `test/closing.test.ts`. Of the files another run is cutting text in, this touched `teach.ts`, `ui/board-book.ts`, `cli/play-lib.ts` and `bones/extract.ts`, each by additions behind the flag; nothing in `content/`, `pages.ts`, `thought.ts` or `tell.ts`.
