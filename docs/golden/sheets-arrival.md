# Golden: sheets for walking into a room with people in it

*Blessed 2026-09-24: "Sheet A, seed 3 is the most golden golden." Callbacks (a role paid off later in the sheet) should run on about 70% of pages, not every page.*

> The designer: "We need another element that'll make it sing, and that's a 'sheet.' … like a madlib page. Now I don't want ours to be that formalized … cards from the decks slot into known holes in each sheet. Sheets should be mutable and have their own internal roles … it demand[s] cards from specified decks in the correct places and … reuse[s], in the same sheet, some of the info from those cards."
>
> "A 'page' [is] multiple sheets."

## How a sheet works

A **sheet** is a short hand-written skeleton for one part of a page. It has three kinds of content:

- **sheet text:** words the sheet itself supplies, usually the joins. These are what stop a page reading as cards laid side by side.
- **holes:** `⟨like this⟩`. Each hole demands a card from a named deck, with conditions, and the draw is random among the cards that fit. A hole can be optional (`?`) or repeated once per person (`*`).
- **roles:** named things the sheet makes a card fill and then **reuses later in the same sheet**:
  - **the prop:** a thing in the room, introduced once and brought back;
  - **the foil:** whoever or whatever the page's one joke lands on;
  - **the tell:** the person the closing observation lands on.

A card fills a role by **exporting** it. Each export has a name and a short form for referring back:

- pam-102 exports `prop = "the mirror" (short: "the mirror")`;
- chr-503 exports `tell-trait = "eyes that went to the door"`.

A later hole can demand a card that uses `{prop}`, or the sheet text can use it directly.

A **page** is several sheets in order. An arrival page is an **arrival sheet** (getting there and the room) followed by a **company sheet** (who's there). Each has several variants, and variety comes from mixing variants as well as from the cards. One joke slot per sheet at most.

In the fills below, card text is followed by its id, *[pam-102]*. Everything unmarked is sheet text, or a fact from the case. Seed 3 at Medium: the speakeasy at about one in the morning. Hargrove (bartender, the watcher), Crowninshield (dentist, who found the body), Hauck (the client), and Vitale and Marchetti at the bar.

---

## Sheet A — "The room looks at me"

*The watcher sizes the detective up first, the room reacts, and the tell is the one person who didn't look.*

```
⟨establish(place)⟩
⟨ambient(place) → exports prop⟩
Nobody looked up except the one person paid to.
⟨activity(watcher)⟩ ⟨character.look(watcher) → exports watcher-trait⟩
⟨presence(client)?⟩
⟨crowd | presence*(others)⟩
The only one who didn't look at me at all was ⟨tell = a present person with a tie to the case⟩. ⟨tell's activity, short⟩, ⟨tell's tie⟩.
⟨close: a dry line on {prop} or {watcher-trait}⟩
```

**Filled, seed 3:**

> The speakeasy was an illegal bar under a hat shop, down six steps and through a door you had to knock on, a formality, since everybody knew about the door. At this hour most of the stools were empty. *[est-057]* Behind the bar, clean glasses stood in rows under a mirror whose silvering had gone, spotted black in the corners. *[pam-102 → prop: the mirror]*
>
> Nobody looked up except the one person paid to. Hargrove was drawing a beer, setting it down before anybody asked, which is the whole art. *[act-001]* He had a pleasant, forgettable face, which in that trade is the whole trick, and eyes that went to the door every time it opened, and came back. *[chr-503 → watcher-trait: eyes that went to the door]*
>
> Hauck had a table at the back and moved her gloves off the other chair when she saw me. Vitale and Marchetti sat at the bar a few stools apart, each of them minding a glass.
>
> The only one who didn't look at me at all was Crowninshield. She was reading a newspaper, the woman who had found Sirkin.
>
> I caught myself in the mirror behind the bar. The silvering had gone in the corners, and so, I noticed, had I.

**What the sheet did that the deck alone couldn't:**

- **The prop comes back.** The mirror is introduced by one card and paid off by the closing line. The joke has a setup because the sheet made it.
- **The watcher's trait sets up the tell.** Hargrove's "eyes that went to the door" makes Crowninshield's not looking noticeable.
- **"Nobody looked up except the one person paid to"** is sheet text. It's the join between the place and the people, and no deck could have dealt it knowing what came before and after.

---

## Sheet B — "One thing in the room"

*A single object dominates. People are placed in relation to it, and the close pays it off. Good for small places.*

```
⟨establish(place), short form⟩
The first thing you noticed was ⟨ambient(place), kind: object → exports prop⟩
⟨watcher⟩ was ⟨activity(watcher)⟩, under/beside/in front of {prop}.
⟨presence*(others), each placed relative to {prop}: "at the far end of…", "with her back to…"⟩
⟨character.street(one present person)?⟩
⟨close: {prop} does something, or the detective does something to it⟩
```

**Filled, seed 3:**

> You came down six stone steps, knocked, and were let in by a slot in the door. *[pam-101, short form of establish]* The first thing you noticed was the coloured bulbs over the bar, which gave the room a red and green cast. A furnace behind the wall thumped every so often to remind the room it was there. *[pam-103 → prop: the coloured bulbs]*
>
> Hargrove was rinsing glasses in a basin under the bulbs. *[act-003]* Crowninshield sat at the far end, where the green reached and the red didn't, reading a newspaper. Hauck had the table at the back, out of the light altogether, which I suspected was the point. Vitale and Marchetti were at the bar, a few stools apart.
>
> The regulars said Hargrove poured an honest drink and forgot nothing, and sold none of it. *[chr-504]*
>
> Under the bulbs, everybody looked like they'd been drinking for a week. I probably looked like I'd been drinking for two.

**Filled, seed 7:** Kaplan's, the drugstore, at 1:15 AM, with Prentiss (the druggist, the watcher) and Zeldin (a bookmaker in Renfro's debt).

> Kaplan's was a drugstore with a soda fountain and a light still on. The first thing you noticed was the two tall glass globes of coloured water in the window, one red and one green, standing on pedestals over a display of toothbrushes and talcum tins. *[pam-143 → prop: the globes]*
>
> Prentiss was counting pills into a small envelope behind the counter, under the globes' glow, folding the top down twice. *[act-031]* Zeldin sat on a fountain stool with his back to the window, doing sums on his fingers without moving his lips. *[chr-409, first clause]*
>
> The block came to Prentiss before it went to the doctor, because he was cheaper and just about as good. *[chr-666]*
>
> The red globe said stop and the green one said go. Nobody in there was doing either.

**What the sheet did:**

- **The prop does real work.** Everyone is placed by it, so the room has a geography instead of a list.
- **The close is written for the prop.** The final joke is about the globes, not a random tail card.
- **Same sheet, different place.** It works as well in a drugstore as in a bar.

---

## Sheet C — "The client waves me over"

*The client is present, and the page leans on her. The others are seen over her shoulder, and her free rundown is set up. Used only when the client is present.*

```
⟨establish(place), short form⟩
⟨client⟩ saw me before I saw ⟨her/him⟩. ⟨client's recall action⟩
⟨client's line: a greeting in character, from a new `greet` deck keyed by the client's purpose and temper⟩
⟨presence*(others), in one or two sentences, from the detective's side of the table⟩
⟨the rundown offer, as sheet text: "She looked like she was about to tell me who everybody was, whether I asked or not."⟩
```

**Filled, seed 3:**

> The speakeasy was a long room with a low ceiling, a bar down one side and a scatter of tables along the other. *[est-059, first sentence]*
>
> Hauck saw me before I saw her. She smoothed the new gloves again, the price tag still folded in one cuff. *[recall]*
>
> "You took your time," she said. "I've been here long enough to be charged rent." *[greet: keep-it-quiet × plain]*
>
> From her table you could see the whole room. Hargrove behind the bar with a towel, Crowninshield at the end with a newspaper, and two people at the bar a few stools apart, minding their glasses.
>
> She looked like she was about to tell me who everybody was, whether I asked or not.

*"Ask Hauck who's here" follows as the free choice. The last line sets it up, so the choice reads as the next beat of the scene rather than a menu item.*

---

## What sheets need from the decks

1. **Exports on cards.** Ambient, establish and character cards declare their props and traits, with short forms. We start with the decks the arrival sheets use: place-ambient, establish, character, activity.
2. **Short forms.** Some holes want a card's first clause, or a clipped version: `activity.short`, `establish.short`. Cards get a marked cut point.
3. **New small decks written for sheets:** `greet` (a client's greeting), `close` (dry closing lines that take `{prop}` or `{trait}`), and join lines that belong to sheets rather than decks.
4. **Sheet variety.** Aim for 5 to 8 sheets per common moment: arrival, company, the ask, a telling, a search, a confrontation, a recap. The engine picks among the variants that fit the situation, at random, with a memory like the dealer's, so the same sheet isn't used on two pages in a row.

## Questions for the designer

1. Do these three read as the thing you meant? Which is closest?
2. Is the prop callback too neat if it happens on every page? My instinct is one callback per page, sometimes none.
3. Is sheet text (the joins) the right place for most of the camp jokes, since the sheet knows the setup?
