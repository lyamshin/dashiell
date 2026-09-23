# 26 — Deck batches A and E: notes

*Branch `decks-ae`, off `main` at d5ac9c9 (PR #39, the dealer, merged). Targets: [25](25-dealer-notes.md), "Writing targets, recomputed", batches A and E. Voice: [the night golden](golden/seed3-night.md) for A, [the testimony golden](golden/seed3-testimony.md) for E, and [the style guide](style-guide.md). Content only: nothing under `src/` changed.*

## In one paragraph

Batch A (the detective's reasoning) gets 109 new cards and batch E (the testimony) 189, 298 in all, every one `generated`.

- **The same-night repeats came first.** The worst were the thought on somebody's own account (3 cards, read 2.7 times a night, a repeat in 37% of nights) and the grounding for a suspect's own evening (4 cards, read 3.1 times a night). The 9 cards 25 asked for in A and the 21 in E to stop repeats inside a night are all written, and no key on either list repeats inside a night any more (before: up to 37% of nights).
  - By deck, the thought's nights with a repeat went from 51% to 1.9%, telling's from 39% to 5.6% and grounding's from 14% to 6.7%.
  - The worst key left in the eleven decks repeats in 2.1% of nights: a 2-card telling frame key, read 0.12 times a night.
- **The ten-night targets.** Of the 79 + 174, what 25's formula still asks for after this is 11 in A and 4 in E. All of it is cross-night depth on keys that no longer repeat inside a night.

Along the way, 53 cards were rewritten in place. Twelve thoughts about an explained secret said a verdict ("Brennan was out of it", "it took him off my list", "I let him go") at every tier; the engine has no per-card tier gate for thoughts, so they now say what the secret explains and what it doesn't. Sixteen tails and three groundings said nothing ("That's it.", "I remember it because it was tonight."). Two telling frames said "Oh, I saw him all right" before tellings that can be "He wasn't here." Two view thoughts called somebody already met "only a name in the notebook". Four answers used "lead" as a noun. And thirteen method thoughts were read against every method they can be dealt for: "It was strangling with a cord. That meant whoever did it had to cut the cord down." read as a hanging, and now says the cord was cut down first.

## What was added

| deck | before | after | new | rewritten in place |
| --- | ---: | ---: | ---: | ---: |
| thought | 334 | 385 | 51 | 28 |
| bridge | 73 | 128 | 55 | |
| carry | 161 | 164 | 3 | |
| answer | 54 | 54 | | 4 |
| decide, confront | 32, 84 | 32, 84 | | |
| telling | 64 | 127 | 63 | 2 |
| grounding | 92 | 148 | 56 | 3 |
| followup | 50 | 90 | 40 | |
| tail | 68 | 90 | 22 | 16 |
| note | 40 | 48 | 8 | |

New ids carry an `a` (batch A: `tht-a…`, `brg-a…`, `cry-a…`) or an `e` (batch E: `tel-e…`, `grd-e…`, `fol-e…`, `tai-e…`, `not-e…`). A rewritten card keeps its id, so a reader who read the old words will not get the new ones until the key comes round again. That was judged cheaper than a cut and a new id for every one.

### Batch A, by key

"Cards" is the mean number of cards on the key's rung that fit the ask and can be filled from its slots, as `scripts/deck-exposure.ts` measures it (25's "cards now").

| deck | key | cards before → after (25's add) | nights with a repeat | first stale night (median reader) |
| --- | --- | --- | --- | --- |
| thought | `class=touches case=murder basis=account` | 3 → 27 (+24) | 37% → 0% | 2 → 9 |
| bridge | `tie=victim lead=ask` | 5 → 15 (+19)¹ | 0.6% → 0% | 4 → 11 |
| thought | `class=view case=murder who=known lied=no` | 2 → 11 (+9) | 7.2% → 0% | 3 → 10 |
| carry | `for=ask-place lead=yes setting=indoor` | 6 → 9 (+2) | 0.2% → 0% | 4 → 9 |
| thought | `class=implicates case=murder basis=access` | 3 → 10 (+6) | 0.9% → 0% | 4 → 13 |
| thought | `class=window case=murder basis=dead-by` | 6 → 8 (+2) | 0% → 0% | 9 → 11 |
| bridge | `tie=time lead=ask` | 8 → 11 (+5) | 0% → 0% | 12 → 12 |
| bridge | `tie=account lead=ask` | 5 → 7 (+2) | 0% → 0% | 8 → 11 |
| thought | `class=touches case=murder basis=described` | 4 → 6 (+2) | 1.1% → 0% | 6 → 9 |
| thought | `class=view case=murder who=client lied=no` | 3 → 6 (+2) | 0% → 0% | 7 → 11 |
| thought | `class=touches case=murder basis=placement` | 4 → 5 (+1) | 0.0% → 0% | 9 → 13 |
| thought | `class=touches case=murder basis=timing` | 3 → 4 (+1) | 0.1% → 0% | 9 → 12 |
| thought | `class=touches case=robbery basis=account` | 3 → 25 (+1) | 4.0% → 0% | 9 → 22 |
| thought | `class=window case=murder basis=coroner` | 2 → 3 (+1) | 0% → 0% | 11 → 14 |
| thought | `class=touches case=murder basis=absence` | 3 → 4 (+1) | 0.2% → 0% | 7 → 10 |
| thought | `class=view case=robbery who=known lied=no` | 2 → 11 (+1) | 2.3% → 0% | 17 → 17 |

1. The mean over three rungs of very different size; see `bridge` × `victim` below. The 8 cards of round three were written after the last measurement and are not in the 15.

After this batch, 25's formula asks A for 11 more:

- 1 on the account thought (27 cards against 2.7 reads a night is ten nights to the card);
- 8 on the victim bridge (round three has written those);
- 2 on the time bridge.

What went where:

- **`touches` × `account`** (24 cards). Somebody's own evening in their own words. Every card says what kind of fact it is (one person's word about one person, the one kind that can be wrong on purpose, a story with one teller) and none says whether it is true. Two are `case: murder` ("It was Hanrahan’s side of the night Sweeney died. There would be other sides."); the rest serve robbery and missing cases too.
- **`view` × `known`** (9, and two rewritten). "Known" is somebody met on an earlier page *or* named in something the notebook holds (`plan.ts`, `viewOf`'s caller), so a card cannot say "only a name until now". The two old cards that did are rewritten; the new ones read right either way ("I knew who Vitale was. I didn’t know yet what Vitale had to do with any of it.").
- **`view` × `client`** (3). The client met again at night.
- **`implicates` × `access`** (7). A way in, never more. Every card carries an "if", "might", "could" or "would", because an access thought is usually one person's word (`markSingle`) and the M8 test holds the whole class to it.
- **`window`** (3), **`touches` × `described`, `placement`, `timing`, `absence`** (5). One or two each, to the recomputed targets.
- **`bridge` × `victim`** (45). The key is really four rungs: the relation said or not (said the first time the subject is named, never after: `realize.ts`, `said`), crossed with where the one to ask is found or not (dropped for a fixture at their own post).
  - **Round one** wrote 19 cards with the relation and `{where}`, and 2 without the relation. The exposure run showed the key barely moved (5 → 8): most victim bridges are to somebody already named, whose rungs had 4 cards with `{where}` and 4 without.
  - **Round two** wrote 16 of those, 12 with `{where}` and 4 without. That brought it to 15.
  - **Round three** wrote 8 for the no-`{where}` rungs from the second run's remaining target. They are not in its numbers.
- **`bridge` × `time`** (8), **`account`** (2). With `{where}`, because the ladder asks for it first whenever the notebook knows where the one to ask is.
- **`carry` × `ask-place` × `lead: yes`** (3). No `{name}`: seven of the key's cards need it, and a carry has it only when a person sent him.

### Batch E, by key

| deck | key | cards before → after (25's add) | nights with a repeat | first stale night (median reader) |
| --- | --- | --- | --- | --- |
| grounding | `family=evening role=suspect half=first` | 4 → 32 (+28) | 7.6% → 0% | 2 → 11 |
| followup | `part=open family=evening order=later` | 6 → 21 (+15) | 0% → 0% | 4 → 11 |
| grounding | `family=movements role=suspect knows=name half=first` | 8 → 18 (+9) | 0% → 0% | 5 → 10 |
| telling | `family=movements temper=plain knows=name` | 3 → 13 (+10) | 9.3% → 0% | 3 → 9 |
| telling | `family=evening temper=plain` | 3 → 15 (+11) | 2.4% → 0% | 3 → 11 |
| telling | `family=movements temper=yap knows=name` | 3 → 11 (+8) | 3.1% → 0% | 3 → 10 |
| telling | `family=evening temper=yap` | 2 → 10 (+8) | 4.2% → 0% | 4 → 12 |
| grounding | `family=movements role=suspect knows=relation half=first` | 7 → 13 (+5) | 0% → 0% | 5 → 11 |
| tail | (a family × temper run out tonight; below) | 3 → 5 (+12) | 0% → 0% | 7 → 11 |
| telling | `family=evening temper=enigma` | 2 → 9 (+7) | 3.1% → 0% | 4 → 12 |
| followup | `part=open family=evening order=first` | 4 → 10 (+6) | 0.5% → 0% | 6 → 12 |
| followup | `part=open family=thing order=later` | 2 → 8 (+6) | 3.6% → 0% | 5 → 14 |
| followup | `part=second family=movements ask=other` | 3 → 8 (+5) | 1.4% → 0% | 5 → 13 |
| followup | `part=open family=strangers order=later` | 3 → 8 (+5) | 1.6% → 0% | 6 → 13 |
| followup | `part=open family=counts order=first` | 4 → 7 (+3) | 0% → 0% | 6 → 10 |
| telling | `family=movements temper=enigma knows=name` | 2 → 5 (+3) | 4.3% → 0% | 4 → 8 |
| note | `family=movements band=play polarity=seen` | 4 → 8 (+3) | 0% → 0% | 5 → 9 |
| telling | `family=strangers temper=yap` | 2 → 5 (+3) | 3.3% → 0% | 7 → 15 |
| telling | `family=strangers temper=plain` | 2 → 5 (+3) | 3.1% → 0% | 5 → 13 |
| telling | `family=movements temper=plain knows=relation` | 3 → 9 (+2) | 2.0% → 0% | 4 → 14 |
| telling | `family=movements temper=yap knows=relation` | 3 → 4 (+1) | 0.7% → 0% | 6 → 7 |
| grounding | `family=thing role=suspect half=first` | 2 → 5 (+3) | 0.9% → 0% | 7 → 11 |
| grounding | `family=movements role=suspect half=first` | 4 → 5 (+1) | 2.2% → 1.3% | 13 → 13 |
| telling | `family=thing temper=yap` | 2 → 4 (+2) | 1.3% → 0.0% | 7 → 11 |
| grounding | `family=strangers role=suspect half=first` | 3 → 5 (+2) | 0% → 0% | 11 → 15 |
| telling | `family=counts temper=yap` | 3 → 4 (+1) | 0% → 0% | 9 → 13 |
| telling | `family=thing temper=plain` | 2 → 3 (+1) | 2.2% → 0.8% | 11 → 14 |
| telling | `family=counts temper=plain` | 3 → 4 (+1) | 0.1% → 0% | 10 → 13 |
| telling | `family=movements temper=enigma knows=relation` | 2 → 3 (+1) | 3.5% → 0% | 6 → 11 |
| note | (a family run out tonight) | 3 → 5 (+1) | 0% → 0% | 5 → 13 |
| note | `family=thing band=play` | 1 → 3 (+2) | 0% → 0% | 10 → 17 |
| grounding | `family=movements role=counterman knows=name half=second` | 2 → 3 (+1) | 0.0% → 0% | 8 → 13 |
| grounding | `family=counts role=counterman half=first` | 1 → 2 (+1) | 0% → 0% | 8 → 17 |
| tail | `family=evening temper=plain` | 2 → 3 (+1) | 0% → 0% | 14 → 14 |
| grounding | `family=movements role=ticket-taker knows=name half=second` | 1 → 2 (+1) | 0% → 0% | 15 → 22 |
| grounding | `family=strangers role=counterman half=first` | 1 → 2 (+1) | 0% → 0% | 17 → 23 |
| tail | `family=movements temper=yap` | 1 → 6 (+1) | 0% → 0% | 33 → 28 |

After this batch, 25's formula asks E for 4 more, all on the tail exhaustion row.

What went where:

- **Tellings** (63). The frame around the witness's words, by temper. Plain: "Crowninshield gave it to me in the order it happened." Yap: "“Let me see,” Dettweiler said, and then didn’t have to." Enigma: "Brauer gave me the evening and nothing to go with it." A `movements` telling can be a sighting, an absence ("He wasn’t here. Not once all evening.") or "Never heard of him.", so no frame says the witness saw anybody. Frames that say "I know him" are tagged `knows: name` or `relation`, never `any`, so they are never dealt before "Never heard of him."
- **Groundings** (56). Thirty-two for a suspect's own evening: how a person knows where they were, never what they did ("Those are the places I was. I’m not leaving any out."; "Ask me again tomorrow and you’ll get the same answer."). None has a pronoun: in the `evening` family `{he}` is the witness. Fourteen for a suspect who knows the one asked about by name or relation. The rest for a thing, strangers, and the counterman's and ticket-taker's posts.
- **Follow-ups** (40). Fifteen ways to ask for the witness's own evening after another family ("One more thing. Where were you tonight?"), six for the first question, six for "anything else" after a thing, five for the hours somebody was *not* around, five for strangers after another family, three for a door's first count. The "not around" questions say "around", not "there". The answer is often "Not here", and the witness is standing in the room.
- **Tails** (22, and 16 rewritten). See the audit below. The new ones carry no pronoun, so they fit a family about the victim too (the engine keeps pronoun tails off the victim). One has the tail's one figure: "Some nights you could fire a cannon through here and not hit anybody."
- **Notes** (8). Five for `movements` × `play` × `seen`, two for a thing at `play` with no pronoun (the key's two pronoun cards cannot be filled when the thing is about nobody), and one `family: any`, the first in the deck.

### The tail key with no tags

25's list has `tail gender=— family=— temper=— knows=—` (3 cards, add 12) and `note gender=— …` (3, add 1). Those are not keys. The probe could not read the rung because every card on it had been read tonight: tails and notes are once a night (`dealer.used`), and the probe falls back to a synthetic card when nothing on the rung is unread. They measure a family × temper running out inside one night, which is why the fix was spread across the busiest ones: movements × yap and plain, then counts, strangers, evening, thing and knowing.

## The audits

### Verdicts in thoughts, from Poached up

Checked first: how the scene gates thoughts by tier. `verdictsOn(view)` (`m9.ts`) is read in three places for thoughts:

- `candidateThoughts` deals `clears` and `contradicts` only when it is on;
- `hasLied` says `lied: yes` only when it is on;
- the note deck's `band` is `teach` when it is on and `play` when it is off.

Nothing reads a tier off a thought *card*. `thoughtLine`'s ladder matches `class`, `case`, `basis`, `via`, `who` and `lied`, and a `secret` or `dead-end` thought sets none of the last four, so no tag on the card can keep it off a Poached page. `secret` and `dead-end` come from `secretExplained` at every tier (`thought.ts`, `cls: clue.role === 'disqualifier' ? 'dead-end' : 'secret'`).

So tagging could not fix it, and the cards are rewritten instead. Twelve `secret` and `dead-end` cards said a verdict:

- "It came down to embezzling from an employer. Brennan was out of it." (the read-through's example, tht-139)
- "…it took Brennan off my list", "I let Brennan go", "I crossed Brennan off"
- "It closed the door on Brennan for tonight", "It took Brennan out of it"
- "That settled Brennan, in the negative"
- "It was not Renfro", "None of it went anywhere near Renfro"

Each now says what an explained secret is: the reason for a lie, and nothing about the hours.

- "It came down to embezzling from an employer. That was Brennan’s secret, and it was out now."
- "Brennan had been embezzling from an employer. That answered why Brennan might lie. It didn’t answer where Brennan was when it happened."
- "Brennan’s secret was embezzling from an employer. A secret like that is a reason to lie about an evening. A reason to lie isn’t a reason to kill."

These are safe at every tier, Raw included. The rest of the deck was searched for "out of it", "cleared", "off my list", "crossed", "let … go" and "in the clear". The `clears` cards ("That cleared Weisglass.") are dealt only where `verdictsOn` is true, which is right. "It cleared nobody and hurt nobody" (`context` × `outside`) is not a verdict. "This took Prentiss out of it" is a `contradicts` card, also gated.

**For the engine** (not done here): if the designer wants Raw and Coddled to say "that took X off my list" after an explained secret, the thought deck needs a tag the ladder reads, e.g. `verdict: yes` dealt only when `verdictsOn(view)`, the way the note deck's `band` is. Until then, no thought card may carry a verdict that `candidateThoughts` does not already gate.

### Method thoughts, against every method

The coordinator's find, from seed 21 at Poached, page 2: "It was strangling with a cord. That meant whoever did it had to cut the cord down." That reads as a hanging.

- `{how}` is the method's `accessNote` in `src/gen/data/methods.ts` and `means.ts`: what whoever did it had to do *before* it ("had to cut the cord down" means cut from the fitting it hung on; the method's own evidence note says "A cut end of the same hemp is still tied to the fitting it was taken from").
- The method class has no tag for the method. Every `case: murder` card is dealt for all six murder methods, every `robbery` card for all five robbery means, and every `missing` card for all four.

Every method card was filled with every method it can be dealt for, one line per card and method, and each line was read. Thirteen are rewritten:

- **Eleven murder cards said `{how}` bare.** Each now says it came first, or before: "So it was strangling with a cord. Whoever did it had to cut the cord down first." "The means was a gunshot, and before it, whoever did it had to open the drawer and take the gun." Read with each of the six methods, all of them are now true.
- **Three of those eleven also called `{other}`, the thing gone from its place, "the means" or "how it was done".** For a push from the parapet that thing is the roof-door key, which is how the door was opened, not the means. They now say the thing was gone, and what that told him: "The roof-door key was missing, and that said how, if not who."
- **Two robbery cards.**
  - One called every means "the way in", and a case left in the cloakroom is not one.
  - The other said `{how}` came "first", and a cord tied to the fire escape is cut down after.
  - One of the two also read "That left a case left in the cloakroom".

  Both now say neither: "It was done by a cord tied to the fire escape. Whoever came for it had to cut the cord down."

**For the generator** (not done here): `accessNote` for `strangle` would read better as "had to cut a length of cord from where it hung". The robbery cord means shares the words "had to cut the cord down" and means something else by them (after, not before). The cards now read right with the words as they stand.

### Tails, and groundings, that said nothing

The read-through's example, "I remember it because it was tonight.", is a grounding (grd-081). It and the two groundings beside it ("That’s the whole of it.", "There isn’t any more to it than that.") are rewritten. They now say how the witness knows their own evening: "That was tonight, not last year. None of it has had time to go."

Sixteen tails only closed the answer:

- "That’s it.", "That’s all.", "No."
- "That’s the lot.", "That’s all of them.", "That’s the count."
- "That’s when it was.", "That’s how it was.", "That’s my evening.", "That’s what I know."
- "I’ve told you what I know.", "I’m only telling you what I know.", "That’s all I can tell you about it."
- "People come and go.", "The name means nothing to me."
- "That’s all I saw." (after a telling that can be "he wasn’t here")

Each now carries the witness's attitude. Some examples:

- "I’ve said more than I meant to." (enigma)
- "I could give you those numbers in my sleep." (plain, counts)
- "Half the people who come through here are on their way somewhere else."
- "I’d rather not have known it, if you want the truth."

"The name means nothing to me" also said something the telling might not: it is dealt with `knows: any`. None of the tails joked at the game's expense. The curt ones kept are the enigma's refusals, which are attitude: "That’s all you get.", "That’s all I’ll say about it.", "Write it down if you like."

### Account thoughts that said nobody else had placed the person

An account thought is dealt whenever somebody gives their own evening, whatever else the notebook already holds about them. "Nobody else had said any of it yet" (tht-m021) was false whenever an earlier page had placed them. Seed 21 at Poached happened to ask Thorndike first and Salerno about him a page later. Asked the other way round, the card would have been false. The card now says only what the account is: "Nobody else’s word was in it." Three draft cards said the same thing and were rewritten before they went in.

### Frames that said the witness saw somebody

tel-019 and tel-020, "“Oh, I saw him all right,” Rafferty said.", were dealt before any `movements` telling, including "He wasn’t here. Not once all evening." They now say "“Oh, I know him all right,”" and "“Oh, I know who he is,”", which is what their `knows` tag says.

## Voice checks

- **Slots.** Every card was checked against what its site fills.
  - Telling frames get `{told}`, `{speaker}`, the witness's `{they}`/`{them}`/`{their}` and the subject's lower-case `{he}`/`{him}`/`{his}`. There is no `{He}`, so no frame starts a sentence with the subject's pronoun.
  - Groundings, tails and notes get the subject's pronouns only when the family has a subject.
  - Follow-ups get `{name}`, pronouns and `{anchor}`.
  - Bridges get `{who}`, `{subject}`, `{tie}` and `{where}`, and `{tie}` must be absent when the subject was named before.
  - Every `{tie}` form reads after "was": "Sirkin’s creditor", "in Sirkin’s debt", "named in Sirkin’s will", "engaged to Sirkin’s daughter".
  - No lower-case slot (`{time}`, `{place}`, `{scene}`, `{other}`, `{tie}`, `{where}`) opens a sentence that is not the card's first. The dealer capitalizes only a card's first letter.
- **Nothing beyond the slots.** No telling, grounding, follow-up, tail or note names an hour, a place's short name or anybody. `checkTelling` holds those, and the words "the office", "the roof", "the alley" and "the stairwell" are short names, so they are avoided too. No thought asserts a fact the thought's class does not have.
- **Figures.** One, in a tail. Nothing in a frame: "the way you give directions" was cut from a draft frame.
- **Corpus.** `corpus/tools/overlap.mjs` over the nine decks touched: 41 five-word runs shared with the corpus before, 38 after, none of them in a new or rewritten card. The 38 are common phrases already in the old cards, such as "and the rest of the evening".
- **The bridge test.** `test/m8.test.ts` bans judging words in bridges ("worth a question", "reason enough"). Two first-round cards had them and were rewritten.

## Measurements

`npx tsx scripts/deck-exposure.ts --seeds 50 --people 10`: 2,550 nights, 30 readers of 85 nights each. Before is `main` at d5ac9c9. After is this branch on the same base, with rounds one and two. It does not have round three's 8 bridges, the later text-only rewrites or PR #40's decks B and C, merged afterwards; none of those changes a tag on these decks. Deterministic, 28 minutes a run.

### Per deck

| deck | cards | read / night | nights with a same-night repeat | stale, nights 11–20 | first stale night (median reader) |
| --- | --- | ---: | --- | --- | --- |
| thought | 334 → 385 | 16.6 | 51% → 1.9% | 74% → 75% | 2 → 5 |
| telling | 64 → 127 | 10.5 | 39% → 5.6% | 90% → 85% | 2 → 5 |
| grounding | 92 → 148 | 10.5 | 14% → 6.7% | 86% → 81% | 2 → 5 |
| followup | 50 → 90 | 6.7 | 6.6% → 0.0% | 91% → 79% | 3 → 7 |
| carry | 161 → 164 | 4.2 | 0.5% → 0.1% | 64% → 64% | 4 → 6 |
| bridge | 73 → 120² | 4.1 | 0.6% → 0% | 77% → 52% | 4 → 9 |
| tail | 68 → 90 | 3.2 | 0% → 0% | 68% → 48% | 5 → 9 |
| note | 40 → 48 | 1.4 → 1.6³ | 0% → 0% | 78% → 64% | 4 → 8 |
| answer | 54 | 0.6 | 0% → 0% | 35% → 35% | 45 → 45 |
| confront | 84 | 0.3 | 0% → 0% | 2.2% → 2.2% | 32 → 32 |
| decide | 32 | 0.1 | 0% → 0% | 4.5% → 4.5% | 77 → 77 |

2. Measured before round three's 8; the deck is 128 now.
3. A note is dealt only when an unread one fits, so more notes means a few more of them.

The thought's remaining 1.9% and the testimony decks' 5–7% are the sum over dozens of small keys (the fixtures' own groundings, the bare `“{told}”` frame, the `stranger` thought). No single key in the eleven decks repeats inside a night in more than 2.1% of nights.

**How to read "stale".** As 25 says, with memory a key comes back only once it has been read through. A key sized to about ten nights of reading is read through by night 11, so "stale, nights 11–20" stays high or even rises on the keys this batch filled to exactly that size (the account thought: 85% → 99%). The measure of the writing is the same-night repeat and the first stale night. The account thought went from a repeat in 37% of nights, and a stale read on night 2, to none, and night 9.

### Checks

On the final branch, with PR #40 merged in:

- **`npm run decks`:** 5,303 cards across 39 decks, 0 errors. Plain terms: 0 banned.
- **Tests:** `npx vitest run`, 44 files and 840 tests, all passing. `npx tsc --noEmit` is clean. The run includes:
  - the reader lint (40 seeds × every tier);
  - correspondence on every sweep, with `checkTelling` over every telling and note;
  - plain terms over 40 seeds × 3 difficulties of each case type;
  - M10's "new decks say no case fact";
  - M8's hedging and bridge-judging tests;
  - Night Hone 1's "every thought names a slot".
- **Corpus overlap:** 41 → 38 five-word runs over the nine decks touched, none in a new or rewritten card.

## Read-through

`npm run read -- --seed 3 --tier 4 --no-choices` and `--seed 7 --tier 5`, read page by page as a player, after each round of writing. `--seed 11 --tier 0` was read as well for the Raw thoughts and notes.

Fixed on the way:

- **Double names.** "Zeldin had told me where Zeldin had been." "Broadnax’s evening in Broadnax’s order." "Dettweiler wasn’t a stranger to the case. That made Dettweiler worth a few minutes." A card whose slot is a surname cannot use a pronoun, so the second mention was written out.
- **"It was Zeldin. There was a page for Zeldin…"** opened a view thought on a flat identification.
- **"That made Steinbach possible, not likely."** "Not likely" is a judgement. It is now "possible, and no more than that".
- **Frames.** "“He? I know him,”" was drafted with `{He}`, which a frame is never given.
- **Tails.** "I notice more than I get paid to." was said by a piano teacher.
- **Follow-ups.** "Any time you can say he wasn’t there?" was answered "Not here…".

Seen, and not the decks' to fix. Each is for the engine or the generator:

- **A bridge sends him to somebody already in the room.** "The question was Renfro around seven o’clock, and it was for Broadnax. I would find Broadnax at the Automat." This was said at the Automat, to Broadnax. The bridge's `{where}` is the place the detective is standing in.
- **"Rafferty was next. The question was the third floor, around eight o’clock."** The same, with a place for a subject.
- **A search find printed as a generator sentence.** "…It was theft, and it was not murder." This is 25-read-through's first item, and the verdict is the generator's sentence, not a card.
- **"What's Renfro to you?"** answered with sightings (as 25 noted).
- **An access thought after a telling that was only sightings** (seed 11 Raw page 5). The note after it is about the sighting, not the access.

## Slots and tags the engine does not supply

Listed for the engine branch. None of these was worked around in `src/`.

1. **A tier gate on thought cards.** See "Verdicts in thoughts" above. A tag such as `verdict: yes`, read in `thoughtLine`'s ladder against `verdictsOn(view)`.
2. **`polarity` on telling frames.** A `movements` frame cannot know whether the telling is a sighting or an absence, so no frame may say "I saw him". The note deck already gets `seen`/`unseen` from `lastFamily`. The same value handed to the telling ladder would let a frame say it.
3. **Met, or only named.** `view` × `known` covers both somebody met on an earlier page and somebody only named in a lead. A `met` value on `who` would let a card say "only a name until now" where it is true.
4. **`{He}` in telling frames.** Only lower-case pronouns are filled, so a frame cannot open a sentence on the subject.
5. **`{name}` on carry.** Still 50 cards (11.9 skips a night, 25's table). Writing more lead cards without `{name}` is the content side of it, and batch A did it for its key. The rest is the engine's.
6. **`answer` `{name}` and `{subject}`**, `thought` `{subject}`, `{place}` and `{time}` on the classes that lack them: unchanged from 25.
