# 26 — Deck batches A and E: notes

*Branch `decks-ae`, off `main` at d5ac9c9 (PR #39, the dealer, merged). Targets: [25](25-dealer-notes.md), "Writing targets, recomputed", batches A and E. Voice: [the night golden](golden/seed3-night.md) for A, [the testimony golden](golden/seed3-testimony.md) for E, and [the style guide](style-guide.md). Content only: nothing under `src/` changed.*

## In one paragraph

Batch A (the detective's reasoning) gets 101 new cards and batch E (the testimony) 189, 290 in all, every one `generated`. They go first to the keys that repeated inside a night: the thought on somebody's own account (3 cards, read 2.7 times a night, a repeat in 37% of nights) and the grounding for a suspect's own evening (4 cards, read 3.1 times a night). Every key on 25's A and E lists now has its cards, and no key in either batch repeats inside a night in more than 1.3% of nights. Along the way, 52 cards were rewritten in place. Twelve thoughts about an explained secret said a verdict ("Brennan was out of it", "it took him off my list", "I let him go") at every tier; the engine has no per-card tier gate for thoughts, so they now say what the secret explains and what it doesn't. Sixteen tails and three groundings said nothing ("That's it.", "I remember it because it was tonight."). Two telling frames said "Oh, I saw him all right" before tellings that can be "He wasn't here." Two view thoughts called somebody already met "only a name in the notebook". Four answers used "lead" as a noun. And thirteen method thoughts were read against every method they can be dealt for: "It was strangling with a cord. That meant whoever did it had to cut the cord down." read as a hanging, and now says the cord was cut down first.

## What was added

| deck | before | after | new | rewritten in place |
| --- | ---: | ---: | ---: | ---: |
| thought | 334 | 385 | 51 | 27 |
| bridge | 73 | 120 | 47 | |
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

| deck | key | cards before → after | nights with a repeat | first stale night (median reader) |
| --- | --- | --- | --- | --- |
FILL_A

What went where:

- **`touches` × `account`** (24 cards). Somebody's own evening in their own words. Every card says what kind of fact it is (one person's word about one person, the one kind that can be wrong on purpose, a story with one teller) and none says whether it is true. Two are `case: murder` ("It was Hanrahan’s side of the night Sweeney died. There would be other sides."); the rest serve robbery and missing cases too.
- **`view` × `known`** (9, and two rewritten). "Known" is somebody met on an earlier page *or* named in something the notebook holds (`plan.ts`, `viewOf`'s caller), so a card cannot say "only a name until now". The two old cards that did are rewritten; the new ones read right either way ("I knew who Vitale was. I didn’t know yet what Vitale had to do with any of it.").
- **`view` × `client`** (3). The client met again at night.
- **`implicates` × `access`** (7). A way in, never more. Every card carries an "if", "might", "could" or "would", because an access thought is usually one person's word (`markSingle`) and the M8 test holds the whole class to it.
- **`window`** (3), **`touches` × `described`, `placement`, `timing`, `absence`** (5). One or two each, to the recomputed targets.
- **`bridge` × `victim`** (37). The first round wrote 19 cards that say the relation and 2 that don't. The exposure run showed the key barely moved (5 → 8). Most victim bridges are to somebody already named on an earlier page, and the ladder then takes only cards *without* `{tie}` (`realize.ts`, `said`). That rung had 4 cards with `{where}` and 4 without. Round two wrote 16 more of those, 12 with `{where}` and 4 without.
- **`bridge` × `time`** (8), **`account`** (2). With `{where}`, because the ladder asks for it first whenever the notebook knows where the one to ask is.
- **`carry` × `ask-place` × `lead: yes`** (3). No `{name}`: seven of the key's cards need it, and a carry has it only when a person sent him.

### Batch E, by key

| deck | key | cards before → after | nights with a repeat | first stale night (median reader) |
| --- | --- | --- | --- | --- |
FILL_E

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

`npx tsx scripts/deck-exposure.ts --seeds 50 --people 10`: 2,550 nights, 30 readers of 85 nights each. Before is `main` at d5ac9c9; after is this branch. Deterministic.

### Per deck

| deck | cards | nights with a same-night repeat | stale, nights 11–20 | first stale night (median reader) |
| --- | --- | --- | --- | --- |
FILL_DECKS

**How to read "stale".** As 25 says, with memory a key comes back only once it has been read through. A key sized to about ten nights of reading is read through by night 11, so "stale, nights 11–20" stays high or even rises on the keys this batch filled to exactly that size (the account thought: 85% → 99%). The measure of the writing is the same-night repeat and the first stale night. The account thought went from a repeat in 37% of nights, and a stale read on night 2, to none, and night 9.

### Checks

FILL_CHECKS

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
