# 33 — M14 Cases that aren't murder: notes

*Branch `m14-cases`, off `main` at a5ce597, with M13 (sheets, PR #48) merged in. The spec is [33-m14-cases](33-m14-cases.md); its source and decisions are [31-books-and-cases](31-books-and-cases.md). The voice is `docs/golden/seed3-camp.md`.*

## In one paragraph

Every tier now deals six kinds of night: murder about a third of the time, a lost pet, a lost item and an affair about a sixth each, and a robbery and a disappearance the rest. The three new types run on the logic game unchanged. A lost pet and a lost item are thefts to the machine: the owner is alive and elsewhere, one thing went from one room at one half hour, and the report asks who let it out or took it, when, where it is now, and why. An affair is a meeting: the one it is about was at the scene at the half hour with the person the report asks for, and is alive before and after. The report asks with whom, when and (from Medium) where; the night opens where they said they would be. Ten tropes with givens, unknowns, signatures and a culprit's small reason (spite, jealousy of a thing, embarrassment, affection, pride). New client purposes (find my dog, find my ring, get it back before they notice, tell me the truth, put my mind at rest), and the affair's client is married or engaged to the one it is about. Ten new ties (the back fence, an old flame, the bowling league, the chess club, the band, a cat, a ladder, a clothesline, and the two an affair's client holds), so debts and loans are about 11% of ties in a tiered case, down from 18%. After an affair's report the player chooses what to tell the client — the truth, a kinder half, or nothing — which changes the closing page and the last line of the story, is counted in the profile, and never changes the score. A seed whose classic draw the mix keeps deals exactly the case it dealt before M14, so the goldens (seed 3 at Medium) and the sheets built on them stand.

## What changed where

| file | what |
|---|---|
| `src/gen/types.ts` | `CaseType` gains `lost-pet`, `lost-item`, `affair`; `CASE_TYPES`; `machineOf` (murder, theft, missing, meeting), `isTheft`, `isMundane`; five new `Purpose`s; `Act.claimedAt`, `Act.errand`, `Act.pet`; `Errand`, `PetKind`. |
| `src/gen/tropes/lost-pet.ts`, `lost-item.ts`, `affair.ts` (new) | Ten tropes: `pet-left-open`, `pet-taken`, `pet-followed`; `item-borrowed`, `item-pawned`, `item-hidden`, `item-mislaid`; `the-affair`, `the-secret` (a night class, a second job, a surprise, a sick relative), `the-business`. Each has its givens, unknowns, signature (where it is now, found there, and one witness; for an affair, something of theirs left at the scene and somebody who saw them go in) and the culprit's reason (`Trope.motive`). |
| `src/gen/tropes/index.ts` | `pickMixedTrope`: the classic draw as it always was, then a second stream keeps it or deals the seed a new type, so the tier lands on its mix. |
| `src/gen/shape.ts` | `CASE_MIX` (murder 34, lost pet 16, lost item 16, affair 16, robbery 9, missing 9); every tier's `caseTypes` is all six, `caseMix`, `classicTropes` (what the tier drew before M14); `tropes` adds the mundane ten and, below Medium, inside-job, payroll and taken (`left` never asks who, so it waits for Medium); `LEGACY_TROPES`; `DeductionDials.typeSlack` (robbery and missing, +1 at Medium and Hard-boiled). |
| `src/gen/data/means.ts` | `PET_MEANS`, `ITEM_MEANS`, `MEETING_MEANS`: four ways each, on the old object ids so no place card changes; a pet's way out is gated by the animal (no goat in a hatbox). |
| `src/gen/data/objects.ts`, `data/mundane.ts` (new) | The four animals and five lost things; the words both halves share (the empty collar, what the affair was). |
| `src/gen/data/motives.ts` | `MUNDANE_MOTIVES` (spite, envy, embarrassment, affection, pride) and `AFFAIR_MOTIVES` (love, a secret kept, business). |
| `src/gen/data/ties.ts` (new), `data/cast.ts` | The ten ties with backstories in both persons, purpose cells for the mundane three, `tieWeight` (a debt weighs 0.3, a new tie 0.3, the rest 1), `purposesOf`; the new purposes' texts and prompts. |
| `src/gen/cast.ts` | New ties for every case the mix dealt new (one of each to a case); the trope's reason for the culprit, mundane reasons for the innocents (none in an affair); an affair's client is re-tied as the spouse or the intended. |
| `src/gen/setting.ts`, `logic/schedule.ts`, `clues.ts`, `victim.ts`, `briefing.ts`, `client.ts`, `logic/rules.ts`, `logic/lines.ts`, `logic/acquaint.ts`, `logic/check.ts`, `generate.ts` | A pet goes missing from home and an affair is never carried on there; the meeting machine (no discovery, alive after); scene, morgue and witness lines by type; the lost thing's discovery and the affair's missing last sighting; the briefing's order for the new types; pointer prompts and hunches; rule lines that assume no death; relation words for the new ties; `classic` generation option; the untiered path deals the mundane three at Hard-boiled when asked for by name. |
| `src/game/derive.ts`, `parser.ts`, `report-form.ts`, `grid.ts`, `notebook.ts`, `recap.ts`, `voice/plain.ts`, `voice/facts.ts`, `scene/plan.ts`, `scene/realize.ts`, `scene/thought.ts`, `scene/people.ts`, `scene/lines.ts`, `voice-data.ts`, `clock.ts`, `reducer.ts`, `transcript.ts` | The scene lines (the empty collar, the empty drawer, the room they said they were in), the opening note, the report's labels and the why menu by type, grid and notebook labels (the owner; the one it is about), the recap's when-line, thoughts reaching the right cards, the finder "who had found the gold pocket watch gone", the relation lines for the new ties, "Eight o’clock, and the knock at the door is Vitale" instead of the DA. |
| `src/game/scoring.ts` | Closings for the three types, the affair's by what I told the client; the endings deck keyed by `told`. |
| `src/game/story.ts` | Beats `claimed`, `errand`, `told`, `pet`; facts `claimed`, `errand`, `told`; a `mundane` context tag. |
| `src/game/types.ts`, `profile.ts`, `src/ui/book.ts`, `src/ui/report.ts`, `src/cli/read.ts` | `Told`, `Report.told`; the "What I tell Vitale" page after an affair's report; `Profile.told` counts; `npm run read -- --told truth|half|nothing`. |
| `content/decks/story.json` | 188 cards (STY-501–688): headlines, means, acts, goods, owners, found, since, claimed, errand, told, pet, thirty ties, the new motives. |
| `content/decks/thought.json`, `endings.json`, `greet.json` | 63 thoughts (tht-n001–063), 60 endings (end-n001–060), 10 greetings (GRT-041–050); eleven robbery-worded thoughts tagged `case: robbery`. |
| `scripts/m14-gen.ts`, `m14-scan.ts`, `m14-classic.ts`; `diagnose-play.ts --type` | Generation per tier × type, the mix, the ties; a page scan for gaps and wrong words; the classic-draw identity check against main; the design test per type. |
| tests | `test/m14-cases.test.ts` (new, 13); updated with reasons: `m5` (the eight are the untiered eight), `m5-engine`, `m7-shape` (every tier deals every type), `m7-helpers`, `story` (the new beats), `hone-3` (an affair has no discovery), `plain-helpers` and `plain-terms` (the new types, 12 seeds), `m12` (a carried question is reported after its reason), and the tests pinned to golden seeds use `classic: true`. |

## The three types

| type | machine | the scene | the report (Medium up) | below Medium |
|---|---|---|---|---|
| lost pet | theft: the owner elsewhere, the animal gone from the owner's home | the owner's address | who let it out, when, where it is now, why | who |
| lost item | theft | any unwatched room | who had it last, when, where it is now, why | who |
| affair | meeting: the one it is about at the scene with the culprit, alive before and after; no discovery | never a residence; the night opens where they said they would be (`claimedAt`, their last sighting) | with whom, when, where | with whom (where is a given) |

The culprit of an affair is the person they were with: a lover, a teacher, an employer, somebody helping with a surprise or a sick relative, a business contact. They lie about where they were, as the lie rule allows. The client of an affair is never the culprit; the client of a lost pet or item may be, at Hard-boiled, a quarter of the time.

## The case mix, 200 seeds a tier

| tier | murder | robbery | missing | lost pet | lost item | affair |
| --- | --- | --- | --- | --- | --- | --- |
| Raw | 35% | 9% | 8% | 15% | 17% | 17% |
| Coddled | 35% | 11% | 8% | 22% | 13% | 13% |
| Poached | 35% | 8% | 10% | 16% | 15% | 17% |
| Soft-boiled | 41% | 7% | 5% | 12% | 18% | 18% |
| Medium | 38% | 9% | 10% | 15% | 16% | 13% |
| Hard-boiled | 31% | 11% | 11% | 11% | 20% | 17% |

**How the mix is dealt.** The trope is drawn first, off the same stream and over the same list as before M14 (the tier's `classicTropes`). A second stream then keeps that case or replaces it with a new type. The keep rate is the largest that leaves every type within its share, and the replacements fill what the kept draws leave short. A kept case is the case its seed dealt before M14, byte for byte apart from the shape object it carries (`scripts/m14-classic.ts` against main's generator: every kept seed identical, tiers 0–5, 30 seeds each). That is what keeps seed 3 at Medium, the camp golden and M13's sheets goldens where they were. `generateCase(seed, { tier, classic: true })` deals the classic draw with no mix, which is what the golden-pinned tests ask for. A kept case also keeps its cast, so its ties are the archetypes' own; the new ties go to every case the mix dealt new.

**Ties.** Debts and loans (`rel-creditor`, `rel-debtor`, or a tie whose words lend, owe or borrow): 11.0%, 8.9%, 10.0%, 12.5%, 11.2%, 11.6% of ties from Raw to Hard-boiled, 200 seeds each, against 17.9% before (the untiered case, which is unchanged).

## The affair's ending

After the report is filed, the book shows "What I tell Vitale": the client waiting on the stairs with a hat in hand, and three buttons — the truth, all of it; a kinder half of it; nothing at all. The report is final already and scored on its facts; the choice changes the closing page's middle paragraph (by what it was: an affair, a secret, or business), the endings deck's last line (tagged `told`), and the story's last line before the close. `Profile.told` counts each choice; a profile from before M14 reads without it. `npm run read` takes `--told`.

## Measure

### The design test, per type

`npx tsx scripts/diagnose-play.ts --design --seeds 100 --configs T0,T1L2,T2L2,T3L2,T4L2,T5L2 --type <type>`, and 200 seeds at Medium and Hard-boiled for the three types nearest the line. The columns are the design test's: the marks-follower names the culprit; the reasoning player gets who, when and the column right within budget; the button-pusher names the culprit.

| type | tier | marks-follower | reasoning player (who, when, column) | button-pusher | par / budget |
| --- | --- | --- | --- | --- | --- |
| lost-pet | Raw | 14% | 100% | 13% | 7 / 10 |
| lost-pet | Coddled | 24% | 100% | 15% | 9 / 14 |
| lost-pet | Poached | 38% | 98% | 35% | 7 / 11 |
| lost-pet | Soft-boiled | 37% | 99% | 28% | 9 / 14 |
| lost-pet | Medium | 21% | 94% | 24% | 13 / 19 |
| lost-pet | Hard-boiled | 18% | 86% | 11% | 17 / 25 |
| lost-item | Raw | 12% | 100% | 16% | 7 / 10 |
| lost-item | Coddled | 18% | 100% | 12% | 8 / 13 |
| lost-item | Poached | 34% | 98% | 30% | 7 / 11 |
| lost-item | Soft-boiled | 39% | 100% | 26% | 9 / 14 |
| lost-item | Medium | 21% | 89% | 23% | 13 / 19 |
| lost-item | Hard-boiled | 18% | 83% | 22% | 17 / 25 |
| affair | Raw | 8% | 100% | 13% | 6 / 8 |
| affair | Coddled | 7% | 100% | 8% | 8 / 13 |
| affair | Poached | 32% | 100% | 28% | 6 / 10 |
| affair | Soft-boiled | 29% | 100% | 25% | 9 / 13 |
| affair | Medium | 27% | 85% (200 seeds: 86%) | 25% | 13 / 19 |
| affair | Hard-boiled | 21% | 78% (200 seeds: 82%) | 20% | 17 / 25 |
| murder | Raw | 23% | 100% | 22% | 7 / 10 |
| murder | Coddled | 18% | 100% | 21% | 9 / 14 |
| murder | Poached | 31% | 97% | 25% | 7 / 11 |
| murder | Soft-boiled | 28% | 98% | 25% | 9 / 14 |
| murder | Medium | 28% | 84% | 25% | 12 / 18 |
| murder | Hard-boiled | 27% | 84% | 20% | 17 / 25 |
| robbery | Raw | 21% | 100% | 35% | 7 / 10 |
| robbery | Coddled | 23% | 100% | 37% | 9 / 14 |
| robbery | Poached | 31% | 99% | 24% | 7 / 12 |
| robbery | Soft-boiled | 30% | 98% | 16% | 9 / 14 |
| robbery | Medium | 22% | 87% (200 seeds: 87%) | 20% | 13 / 20 |
| robbery | Hard-boiled | 15% | 81% (200 seeds: 81%) | 16% | 16 / 25 |
| missing | Raw | 20% | 100% | 17% | 7 / 10 |
| missing | Coddled | 19% | 100% | 8% | 9 / 14 |
| missing | Poached | 29% | 96% | 23% | 8 / 12 |
| missing | Soft-boiled | 39% | 99% | 31% | 9 / 14 |
| missing | Medium | 20% | 82% (200 seeds: 85%) | 21% | 13 / 20 |
| missing | Hard-boiled | 14% | 80% (200 seeds: 83%) | 18% | 17 / 26 |

Targets: the marks-follower at or under 60% at Raw and Coddled and 50% from Poached up; the reasoning player at or over 95% at Raw and Coddled and 80% from Poached up. Every cell holds. The affair at Hard-boiled is the one row that crosses the line inside 100 seeds' noise (78%); over 200 seeds it is 82%, and so are the other rows marked. The numbers are the same after merging M13: the players read choices, not pages.

**What moved the old types.** Held per type, a robbery and a disappearance at Medium and Hard-boiled fell short of 80%: the reasoning player ran out of night a call short of settling it (every failure at Hard-boiled robbery was "acts = budget, not settled"), the same shape the mixed table had always averaged over. `typeSlack` gives those two one call more at Medium and Hard-boiled; 200 seeds put them at 81–87%. Murder at Hard-boiled is its classic draw and needed nothing.

### The rest

- **Tests:** the full suite after merging main (M13): 50 files, 920 of 921 passing; the one failure was `m13-sheets`' seed-3 golden, which a case mix changes, now pinned to the classic draw (18 of 18). `m14-cases` then gained its sweep (13 of 13), and the suite was run again to finish: 50 files, 922 of 922 passing. `npx tsc --noEmit` clean.
- **Correspondence:** 0. The M10 sweep, now the case mix (40 seeds × every tier, every type in it): 0 violations and no excused generator hours. The M14 sweep (the three new types × every tier × 4 seeds, oracle and wanderer, 144 runs): 0.
- **Beat coverage:** 100%: M8's 5,455 of 5,455 night pages; M10's 2,938 of 2,938; M9's 1,299 of 1,299; M14's 1,606 of 1,606.
- **Reader lint:** clean over the M10 and M14 sweeps (it caught "lead" in the dog's lead, now a leash, and an empty thought where a way out's words repeated the find).
- **Plain terms:** `npm run decks`: 6,836 cards across 46 decks, 0 errors, 0 banned terms; `test/plain-terms.test.ts` reads the three new types too. "The back fence" became "the backyard fence", the one literal sense the list allows.
- **Story:** 579 cases, 234 to 392 words, every line's facts true of the case (`test/story.test.ts`).

## Read-through

Rendered after merging main, through M13's sheets, with `npm run read` (the oracle's route) and read page by page. What read wrong and was fixed on the way: the lost thing's discovery answering a dropped question ("I did, at half past eleven"); "a saucer of milk that nobody has drunk"; "No the ginger tomcat at the back lot" (the utterance cards want the name bare); a thought that put the cat at the garage because somebody at the garage had spoken of it; the dog's lead read as machinery; the roof-door key's note repeating the thought's own words; a sign-in book still naming an hour after the logic game took the placement out (a robbery now comes below Medium, where every page test reads the hours); "Moretti said Moretti would be"; an affair set at the client's own home; the office's "found" line with no "found" in it; greetings for the new purposes; "Least of all Moretti" read as a name.

### A lost pet — seed 11, Soft-boiled, Precinct (`--type lost-pet`)

The office:

> Midnight. My office was a room at the top of a walk-up on Mulberry Street, in Little Italy. The mirror over the washbasin showed more of the night before than I wanted explained. I turned the lamp away from it. A man came up the stairs after midnight.
>
> Feeney hung his own coat and sat like somebody who'd waited in better rooms and billed for it. He capped and uncapped a fountain pen through every pause in the conversation, never once touching it to paper the whole visit. Daniel Feeney was in his forties. He kept one hand in a pocket.
>
> “My name is Daniel Feeney,” he said. “I am Percival Colquitt’s neighbour over the backyard fence. Colquitt’s ginger tomcat is gone from the back lot and has not come home.”
>
> I didn’t say anything. He wasn’t finished, and I had nowhere to be but here.
>
> “Colquitt kept a file of what was not printed, and let it be known that it existed,” Feeney said. “I have lived on the other side of his backyard fence since ’26. The fence posts lean my way. They have always leaned my way. It did not let itself out: the way out of the back lot is always kept shut. It was found standing open. It was me, at half past eleven. I got to the back lot and found the ginger tomcat gone.”
>
> “What did the police make of it?”
>
> “The precinct has not been called, and is not going to be. The ginger tomcat went between eight o’clock and half past eight. Colquitt says it never goes anywhere with anybody, which everybody who has met it knows is not true.”
>
> “Then why come to me?”
>
> “I want the ginger tomcat found and brought home. Colquitt has been standing at the window since supper. It is a pitiful sight. I have walked every street on the block twice. I am embarrassed to be paying you for the third time. I am paying anyway.”
>
> He sat the same desk from eight until six and ruled the columns by hand.
>
> “Who would you start with?”
>
> Feeney was capping and uncapping a fountain pen again. “Start with Carbone. She never liked that animal and never pretended to.” Feeney put fifty dollars on the blotter and kept two fingers on it until I picked it up. I respected that.
>
> I didn’t look in the mirror over the washbasin. One of us had had a long night, and it wasn’t the mirror.

The scene, next page: "There was a saucer of milk on the floor, full to the brim and going warm, and no cat." The ending, filed right (Hanrahan, who fed it):

> The ginger tomcat is at the roof, and I carry it home to Colquitt myself, which it permits. Hanrahan let it out of the back lot at 8:30 PM, and has a reason that sounds worse said out loud.
>
> Colquitt cries on the step, and on me, and on the cat. 1 out of 1, and it took me 9 calls. It could have been done in 10. I will not be telling anybody.
>
> I am back at my desk before the milk comes, with hair or feathers on my only good coat. Hanrahan can do the explaining to the neighbours, and I hope it takes all week.

What really happened opens "Nobody took the ginger tomcat from Percival Colquitt. It followed Nora Hanrahan home, and Hanrahan let it." and ends "The ginger tomcat was never lost, as far as the ginger tomcat was concerned. It knew exactly where it was the whole time."

### A lost item — seed 7, Soft-boiled, Precinct (`--type lost-item`)

A gold pocket watch gone from Brauer's drawer, the client a witness against the people Brauer worked for. The oracle searched the drying yard on page 4 and found it "pushed to the back behind something heavy, where nobody would look and somebody wanted it not found. It was not lost. It was put there." The ending:

> The gold pocket watch was at the drying yard, and it goes back where it lives before breakfast. Stannard took it from the back lot at 8:30 PM, and has an explanation that gets worse the longer it goes on.
>
> Brauer puts it back and looks at it for a long time. 1 out of 1, and it took me 7 calls. It could have been done in 9. I will not be telling anybody.
>
> I am home in time to put the kettle on, which is a first. Stannard has the whole morning to think up a better story, and will need it.

### An affair — seed 5, Medium, Precinct (`--type affair`), three ways

Vitale, a bookkeeper, is Angelina Moretti's husband: "She said she would be at the newsstand all evening … Some time between half past nine and ten, she was somewhere else, with somebody. She came home late with a story about the newsstand. The story had a hole in it the size of the evening." At the newsstand: "Moretti was not there. She had been, earlier, which is not the same thing." Her gloves turn up at the ferry slip. It was Weisglass, and it was a night class: Moretti is learning to read. The report is 8 of 8 each time; only what follows changes.

The truth:

> I tell Vitale all of it. It was not what Vitale was afraid of, and it was a secret all the same, and now it is not one. I have spoiled better things in my time, but not many.
>
> It is done early, and the truth keeps no better for being early. I walk home past the ferry slip, and it looks like anywhere else, which is the trouble with places.

The story ends: "I told Vitale all of it: where Moretti had been, and that Weisglass was there too."

A kinder half:

> I tell Vitale there is nothing in it to lose sleep over, which is true, and nothing about what it was, which is kind. Some secrets are better let out by their owners.
>
> I finish early, hand over half of it, and keep the other half in my coat. Weisglass never finds out which half I kept.

The story ends: "I told Vitale where Moretti had been, and not who with."

Nothing:

> I tell Vitale I found nothing. In a month or so Vitale will find out for himself, and like it better that way.
>
> I finish early and say nothing, which makes it the quickest nothing I ever sold. Weisglass will never know my name, and I will not forget Weisglass’s.

The story ends: "I told Vitale nothing, and kept the smaller half of the fee."

## Where I judged

1. **The owner is the "victim" of a lost pet or item, and the client somebody tied to them.** The client is a suspect in the machine and the owner cannot be one, so "find my dog" is "find Colquitt's cat" said by the neighbour, the tenant or the wife who was minding it, and `before-they-notice` exists because that is who comes up the stairs. "Mislaid by the owner and blamed on others" is mislaid by somebody in the house, who let the street call it stolen; at Hard-boiled that can be the client.
2. **Where is a given below Medium in an affair.** The logic game assumes the scene is known. From Medium the report asks where, the night opens where they said they would be, and the scene is found (a thing of theirs left there, and a witness), as a moved body is. Below Medium the givens say where, and the question is only who with.
3. **The classic draw is kept.** A mix that simply drew the type first changed every seed's case, the goldens and M13's sheets goldens among them. The two-stream draw keeps the old case wherever the mix keeps its type, so the new types are added rather than swapped in. The price is that a kept murder keeps its old ties; the debt share is counted over all ties and is 9–12% at every tier.
4. **The affair's choice sits after the report and before the closing page**, as a page of its own. It is the last thing the night asks and the only thing it asks that is not scored.
5. **A robbery and a disappearance get one call more at Medium and Hard-boiled.** Per type, they were the two under 80%; murder and the new three were not.
6. **The untiered case is untouched** (the M7 and structure identity tests, 600 cases each). Asked for a mundane type by name, it deals a Hard-boiled logic game, so a reader's `--trope pet-taken` and a test sweeping every trope still work.
