# Character cards: drafts

M11 Part C (`docs/28-m11-people.md`), written against `docs/golden/seed3-people.md`. These are the ◆ lines: habits, how a person talks, how the street sees the type, and how the type deals with the victim's type. Each card is true of the type and asserts nothing about the case.

`character.json` has **680 cards** across **37 roles**: the 27 suspect archetypes in `src/gen/data/cast.ts` and the 10 fixture roles in `content/deck-schema.json` (`vocab.fixtureRole`). The breakdown is look 111, street 111, talk 111, client 111 and victim 236. The victim cards cover 81 pairings, plus 2 `any` per role.

The engine builds `content/decks/character.json` in parallel with placeholders. These drafts move in when both sides land. Nothing here touches `content/decks/` or `src/`.

## Shape

The shape is the same as every other deck: `id` (`chr-001`…), `deck: "character"`, `text`, `tags`, and `status: "generated"`. There are no motifs and no weather. No card implies a sky.

| tag | values |
| --- | --- |
| `role` | a suspect archetype id (`arch-heir`…) or a fixture role (`bartender`, `landlady`…). A `client` card is keyed by the role of the person being described, not by the client's own role. |
| `kind` | `look`, `street`, `talk`, `client`, `victim` |
| `victimRole` | victim cards only: a victim archetype id (`vic-inspector`…) or `any` |

## What each kind is, and how it reads

| kind | voice | tense | example |
| --- | --- | --- | --- |
| `look` | Dashiell's narration, about the subject | past | "{He} had red hands from the laundry soap and a way of standing near the wall, clear of the traffic, as if a guest might want to pass." |
| `street` | Dashiell's narration of how the street sees the type | past | "{He}'d lend you a quarter for the gas meter and remember it on rent day. That kind of landlady." |
| `talk` | the subject, first person, about their own trade or life | present | "I don't keep an office. An office is a place people can find you when the market goes the wrong way." |
| `victim` | the subject, first person, about the victim in the victim's trade terms | past for the victim | "An inspector is part of the cost of a building, like coal. {victim} was a large part." |
| `client` | the client, naming this person in a rundown | present | "{He} keeps the books for half the firms on the street and never says a word about any of them." |

- **Spoken cards carry no quotation marks.** That covers `talk`, `victim` and `client`. The page wraps them. A quotation inside one uses single curly quotes (‘Number, please’).
- **Openings vary.** No two cards of one role and kind open with the same two words. Some `client` cards open without a subject ("Charming, for about an hour."), so they can follow the name the client has just said: "That's Kowalski. Charming, for about an hour."
- **`victim` cards never give a motive,** and they talk about the victim only as a person in the victim's trade. A suspect already has a tie to the victim, so a suspect's card may say a little about the victim (as Rafferty's golden line does), but nothing that fights any of that archetype's relationships. A fixture has no tie, so a fixture's victim cards speak of the victim's type ("Inspectors like {victim} never once look at the stairs."). They never claim a dealing the case doesn't hold.
- **Pairings are ones the generator actually deals.** Every named pairing is checked against the victim's `allowedSuspects`. The pairings are the ones where the two trades meet: landlady and inspector, bookmaker and bootlegger, pawnbroker's clerk and pawnbroker, switchboard operator and theatrical agent, and so on. A role with no card for the case's victim falls back to its `any` cards.

## Slot needs (for the engine)

| slot | where | filled with |
| --- | --- | --- |
| `{He}` `{he}` `{his}` `{him}` | `look`, `street`, `client` only | the subject's pronouns: `pronounSlots()` in `src/game/voice/cast.ts` already fills all four. Part C lists `{He}`/`{he}` only. **The cards also need `{his}` and `{him}`.** A sentence never opens on `{his}`, and no card uses `{His}`. |
| `{name}` | allowed in `look`, `street`, `client` | the subject's surname. No card uses it yet. It's allowed so tuned cards can. |
| `{victim}` | `victim` only | the victim's surname. No card uses a pronoun for the victim. |
| `{place}` | fixture roles only | the fixture's post (as in `FIXTURE_CARDS`). No suspect card uses it. |

The spoken kinds (`talk`, `victim`) never use a subject slot or `{name}`, because the subject is the speaker. There are no bare pronouns for the subject or the victim. The few bare *he/she/her* left refer to somebody generic ("a treasurer who counts alone", "the receptionist").

**Gender.** Twelve suspect archetypes and six fixtures have a fixed gender (a `genderHint`, or `FIXTURE_GENDER` in `src/gen/cast.ts`). Their cards may say "a woman who climbed stairs all day". The cards for every other role say nothing gendered about the subject. The validator's five gender warnings are all about other people ("the men on the block", "your pupil's mother"). No card carries a `gender` tag, so none needs filtering.

## Checks

```
node scripts/check-character-drafts.mjs            # shape, tags, counts, slots, words; exit 1 on any error
node scripts/check-character-drafts.mjs --table    # plus the table below
node corpus/tools/overlap.mjs content/drafts/character/character.json
```

The validator reads the roles, the victim archetypes and their `allowedSuspects` from `src/gen/data/cast.ts`, and the fixture roles from `content/deck-schema.json`, so it follows the generator. It fails on:

- plain terms (`content/plain-terms.json`)
- clock times
- named places (anything beyond `{place}`)
- case words (murder, poison…)
- motive words on victim cards (hate, revenge, jealous, died…)
- repeated texts
- two cards of one role and kind with the same opening

It warns on bare pronouns, gendered nouns on a role whose gender isn't fixed, more than one figure in a card, and cards over 55 words. At the time of writing: 0 errors and 17 warnings (12 bare pronouns about generic people, 5 gendered nouns about other people). The corpus overlap check is clean.

## Counts, role × kind

| role | look | street | talk | client | victim (any) | victim pairings |
| --- | --- | --- | --- | --- | --- | --- |
| arch-heir | 3 | 3 | 3 | 3 | 2 | heiress 2, wholesaler 2, columnist 2 |
| arch-widow | 3 | 3 | 3 | 3 | 2 | landlord 2, heiress 2 |
| arch-broker | 3 | 3 | 3 | 3 | 2 | bondsman 2, wholesaler 2, heiress 2 |
| arch-society | 3 | 3 | 3 | 3 | 2 | heiress 2, agent 2, columnist 2 |
| arch-blockowner | 3 | 3 | 3 | 3 | 2 | landlord 2, inspector 2 |
| arch-lawyer | 3 | 3 | 3 | 3 | 2 | bondsman 2, heiress 2, wholesaler 2 |
| arch-bookkeeper | 3 | 3 | 3 | 3 | 2 | union-treasurer 2, wholesaler 2 |
| arch-nurse | 3 | 3 | 3 | 3 | 2 | wholesaler 2, heiress 2 |
| arch-dentist | 3 | 3 | 3 | 3 | 2 | landlord 2, pawnbroker 2 |
| arch-secretary | 3 | 3 | 3 | 3 | 2 | agent 2, columnist 2 |
| arch-reporter | 3 | 3 | 3 | 3 | 2 | columnist 2, bondsman 2, bootlegger 2 |
| arch-piano-teacher | 3 | 3 | 3 | 3 | 2 | landlord 2, agent 2 |
| arch-adjuster | 3 | 3 | 3 | 3 | 2 | landlord 2, pawnbroker 2 |
| arch-chambermaid | 3 | 3 | 3 | 3 | 2 | heiress 2, bootlegger 2 |
| arch-longshoreman | 3 | 3 | 3 | 3 | 2 | union-treasurer 2, bootlegger 2 |
| arch-seamstress | 3 | 3 | 3 | 3 | 2 | landlord 2, wholesaler 2, union-treasurer 2 |
| arch-hackman | 3 | 3 | 3 | 3 | 2 | bootlegger 2, bondsman 2 |
| arch-tailor | 3 | 3 | 3 | 3 | 2 | wholesaler 2, pawnbroker 2 |
| arch-stagehand | 3 | 3 | 3 | 3 | 2 | agent 2, union-treasurer 2 |
| arch-switchboard | 3 | 3 | 3 | 3 | 2 | agent 2, columnist 2 |
| arch-nightman | 3 | 3 | 3 | 3 | 2 | bootlegger 2, heiress 2 |
| arch-chorus | 3 | 3 | 3 | 3 | 2 | agent 2, columnist 2 |
| arch-bookmaker | 3 | 3 | 3 | 3 | 2 | bootlegger 2, bondsman 2 |
| arch-heeler | 3 | 3 | 3 | 3 | 2 | inspector 2, union-treasurer 2, bondsman 2 |
| arch-pawnman | 3 | 3 | 3 | 3 | 2 | pawnbroker 2, bondsman 2 |
| arch-bouncer | 3 | 3 | 3 | 3 | 2 | bootlegger 2, heiress 2 |
| arch-runner | 3 | 3 | 3 | 3 | 2 | bootlegger 2, pawnbroker 2 |
| bartender | 3 | 3 | 3 | 3 | 2 | bootlegger 2, columnist 2 |
| doorman | 3 | 3 | 3 | 3 | 2 | heiress 2, columnist 2 |
| newsstand | 3 | 3 | 3 | 3 | 2 | columnist 2, pawnbroker 2 |
| counterman | 3 | 3 | 3 | 3 | 2 | union-treasurer 2, landlord 2 |
| ticket-taker | 3 | 3 | 3 | 3 | 2 | agent 2, columnist 2 |
| elevator-man | 3 | 3 | 3 | 3 | 2 | heiress 2, agent 2 |
| landlady | 3 | 3 | 3 | 3 | 2 | inspector 2, landlord 2 |
| beat-cop | 3 | 3 | 3 | 3 | 2 | bootlegger 2, bondsman 2 |
| cabbie | 3 | 3 | 3 | 3 | 2 | heiress 2, bondsman 2 |
| druggist | 3 | 3 | 3 | 3 | 2 | bootlegger 2, landlord 2 |

