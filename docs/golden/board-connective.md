# Golden: connective tissue on the small board

*2026-10-09. This rewrites the board engine's seed 1 Medium lost-pet night (`npm run read -- --engine board --seed 1 --tier 4 --type lost-pet`), page for page. It keeps the same facts, the same path and the same choices, but adds the beats that join one fact to the next. The engine's pages run about 116 words. These run about 200–300.*

*The voice is `seed3-camp.md`: about one joke a page, everything else plain.*

## The beats

Each page is built from these, in this order. Not every page uses all of them.

| beat | what it does | where it comes from |
|---|---|---|
| **why here** | Which earlier line sent me, by name. | The path's pointer for this step (4a.2's `pathMotivated` reason), in the voice. |
| **the walk** | The street between, one or two lines. Only on a page that changes place. | Place and weather cards. |
| **arrival** | What the place is, who's there, what they're doing. | Establish, place and people cards (as now). |
| **staging** | Where I sit, how I open, what it costs me. | Staging cards by place kind and the person's manner. |
| **the ask** | The question in Dashiell's own words. | Ask cards by job. |
| **reaction** | How they take it before they answer. | Reaction cards by manner, and by whether they're lying (never a tell on its own). |
| **the job** | The account, list, find or confrontation. | The engine, as now. |
| **the thought** | What it means, tied back to something already held, **by name**. | The engine: from the board's links (which place, which hour, which person). Not from a card. |
| **close** | The page's one joke, or a callback. | Close and callback cards. |
| **hand-off** | What this makes me want next. It agrees with the starred choice. | The path's next pointer, in the voice. |

The thought is the beat that matters most. It's where the player is shown which two facts touch. In this night it points out that Stuyvesant Street is where Prentiss lives, a link a player could easily miss.

---

## Page 1 — the office, midnight

> Midnight. My office was a room at the top of the stairs on Mulberry Street, with a desk, a lamp and a coat stand that had outlasted two tenants. The radiator knocked twice and thought better of it.
>
> I heard steps on the stairs, stopping on every landing to think it over. The man who came in wore a good overcoat over pyjamas, as if he had dressed from the outside in and lost his nerve halfway.
>
> "Percival Prentiss," he said. "It's Duchess. My Pomeranian. She's gone from her cushion by the radiator."
>
> I offered him the chair. He looked at it the way you'd look at a dog that might bite, and sat anyway.
>
> "I went to the Thalia tonight," he said. "Eight until ten. I told everybody who'd listen that I was off to my sister's for the night and the key was under the mat, for Mrs. Cheatham. She minds Duchess when I'm out. She has rooms at the Delmonico, over the fish market." He heard it as he said it. "Everybody who'd listen. That was a good many people."
>
> "And when did Duchess go?"
>
> He had it on the back of an envelope. "The woman downstairs heard the stairs creak at ten, or at eleven. She can't say which. She was listening to the radio, not to the stairs."
>
> "Who'd want her?"
>
> "Abramowitz. He stood at my elbow at the Thalia the whole time I was talking. He has a face for it." Then, smaller: "Miss Corrigan asked me on Friday what Duchess was worth. I took it as a compliment."
>
> He counted out ten dollars in ones and change, and the change was the part that got to me. "Who, and where. That's all I'm asking. By eight, if you can. My sister really is expecting me."
>
> I took the money and my hat, in that order.

```
  Go to:  * Prentiss's flat  [start where she went missing]
          * the Thalia  [he told the room there — the man at the door will know who heard]
          the Automat (Abramowitz) · the Delmonico rooms (Mrs. Cheatham)
```

*Beats: arrival · ask · job (the givens) · reaction · close. The why surfaces here, in passing ("asked me what Duchess was worth"). The engine's night never showed the motive on any page, though the report asked for it. One quoted line per paragraph: the engine fused two.*

---

## Page 2 — the Prentiss flat

> Prentiss's flat was the parlour floor of a house on Stuyvesant Street, ten minutes' walk east. The cold had got into the gutters and the gutters had given up. A cat on a step watched me go by and decided I was nobody's business, which is the most a cat will do for you.
>
> The house was old and proud of it, with a carpet on the stairs held down by brass rods, and every rod shone. Somebody polished them. Somebody, I'd guess, who also kept an eye on who came and went, though nobody in this house was paid to.
>
> The door had no mark on it. Prentiss stood in the parlour doorway and looked at the place where Duchess ought to be, which is a thing you can do for a long time without it helping. A framed sampler on the wall said *Bless This House* in red cross-stitch.
>
> If she went at ten or eleven, the house had been empty, and anyone who'd heard him at the Thalia had known where the key was. That was the room, more or less. It was a big room.

```
  Search: * the parlour  [start where she went missing]
```

*Beats: the walk · arrival · thought (the access problem, said plainly before the search) · close.*

---

## Page 3 — the parlour

> I went over the parlour, then the door, then the parlour again, because the first time I was looking for a dog and the second time I was looking for a person.
>
> The cushion by the radiator was empty, and still had a dent in it the shape of a small, opinionated animal. The key was back under the mat, exactly square to the edges, the way a man leaves a thing he wants to look as if it was never moved. No marks on the lock. No marks on the frame. Whoever came in had walked in.
>
> So it was somebody who'd heard Prentiss at the Thalia between eight and ten, and had come here after. That made the Thalia the place to start counting. The man who seats people there would know who was in to hear it.
>
> *Bless This House*, said the sampler. It hadn't said anything about the people coming into it.

```
  Go to:  > the Thalia  [who heard about the key?]
```

*Beats: staging (how I search) · job (the find) · thought (who had access) · hand-off · close.*

---

## Page 4 — the Thalia

> The Thalia is a Yiddish theatre on the Bowery, and it was only fifteen minutes from Prentiss's door, which I wrote down because the night was going to be about who could walk where in an hour.
>
> The play was over, but the stage still had its painted village up, a little wooden town waiting under one work light for the next performance. The lobby carpet was red and gold swirls, worn to the threads in a path from the door to the seats.
>
> A man stood at the back of the house with a torch pointed at the floor, ready to seat people who weren't coming. That was Coffin, the house manager. A woman in the lobby was reading the bills for next week as if they might change: Feeney, Prentiss had said, the piano teacher, with a pianist's back, bolt upright. A thin man sat near the front with both hands on the seat in front of him. That was Ashby. And at the back, hat in hand, as if she'd just come in or was just going, a neat woman with her collar pinned: Miss Corrigan.
>
> A man who seats a house all night sees every face in it. He might not know what they came for. He'd know they came.
>
> Coffin lifted the torch an inch, which in a theatre counts as a greeting.

```
  Coffin ›    * who was here tonight?  [he seated everyone who heard about the key]
  Feeney › Ashby › Corrigan ›   where were you tonight? · Duchess
```

*Beats: why here · the walk (the distance, which is what this night is about) · arrival · watcher line · close.*

---

## Page 5 — Coffin's list

> I asked Coffin to take me through the night, hour by hour, everybody in the house. He turned the torch off to think, which saved the batteries.
>
> "Pardo's here every night, all night. Back row, left. He buys things." He said it the way you'd say a man had a limp. "Eight o'clock: Miss Feeney, Miss Corrigan, and Mr. Prentiss telling the room about his key. Nine: Miss Feeney, Mr. Abramowitz, and Mr. Prentiss, still telling it. Ten: Miss Feeney. Nobody else. Eleven: Miss Feeney, and Mr. Ashby came in for the late show. Nobody else. Then about twelve somebody came in with something under a coat, went straight to Pardo, and it changed hands. I was watching the coat, not the face."
>
> "What was under the coat?"
>
> "Something that moved."
>
> So Feeney was here all evening with Coffin's word under it. Corrigan heard about the key at eight, and Abramowitz at nine. Ashby didn't come in until eleven, after the talking was done. And whatever went out of Prentiss's flat had come in here at twelve and gone to Pardo.
>
> Pardo, back row left, was asleep with his hat over his face, like a man with nothing on his conscience, or nothing he'd admit to before breakfast.

```
  Ashby ›     * where were you tonight?  [Coffin has him here only at eleven]
  Corrigan ›  * where were you tonight?  [she heard about the key at eight]
  Go to:      * the Automat  [Abramowitz heard it at nine]
```

*Beats: staging · ask · job (the list) · reaction (the question that gets "something that moved") · thought (who heard the key, by name and hour) · close.*

---

## Page 6 — Ashby

> Coffin's list had Ashby here at eleven and nowhere before it, so Ashby was next. He'd moved down to the third row, as if the play might start again if he waited long enough.
>
> I sat one seat over. Up close he was thin and a little bent at the shoulders from bending over hat blocks, in a suit better made than anything a milliner could buy. It hadn't been bought.
>
> "Mr. Ashby. Where were you tonight? All of it, if you don't mind."
>
> He minded a little, then decided it was cheaper not to.
>
> "At eight I went to the Automat for a plate of beans and made them last. At ten I went up to the Delmonico rooms to see Mrs. Cheatham about some money. At eleven I came here for the late show, and sat with Miss Feeney." He thought of something. "Walking over here at eleven I passed Miss Corrigan on Stuyvesant Street. Going fast. No hat."
>
> So the Automat until ten, the Delmonico rooms at ten with Mrs. Cheatham, and here at eleven with Feeney, which was what Coffin had. One evening that held, where I could check it. The part worth keeping came last. Stuyvesant Street at eleven, going fast, no hat. Stuyvesant Street was where Prentiss kept his dog.
>
> He looked at my coat on the way out. My coat came from a store. You could tell from across the room, and somebody had.

```
  Corrigan ›  > where were you tonight?  [Ashby passed her on Stuyvesant Street at eleven]
```

*Beats: why here · staging · ask · reaction · job (the account) · thought (the link the player might miss) · close · hand-off (the star agrees).*

---

## Page 7 — Corrigan, and the turn

> Miss Corrigan was still at the back with her hat in her hand. She hadn't put it on and she hadn't put it down. I've known people stand like that outside a dentist's.
>
> I took out my pencil, which makes some people nervous and makes the rest feel important, and asked her where she'd spent the evening.
>
> She was neat in a way that took effort: every button done, the collar pinned, the hair flat. Her hands stayed folded until she needed one, and then only the one.
>
> "I was here at eight, with Miss Feeney. At nine I went home to listen to the radio, and I stayed home the rest of the evening. On my own."
>
> One hand came unfolded, did something small, and went back. I've seen banks spend less carefully.
>
> She said home at eleven. Ashby said Stuyvesant Street at eleven, going fast, no hat. Two stories about the same woman at the same hour, and only one of them could stand.
>
> **The turn.**
>
> *I lit a cigarette I didn't want, to give my hands something to do while my head did the rest.*
>
> *Here's what I had. It went at ten or eleven, and I didn't know which. Three people heard about the key: Feeney, Corrigan and Abramowitz. Feeney never left this theatre, by Coffin's word. Corrigan says home, and Ashby put her on Prentiss's street. Abramowitz I hadn't met. And something that moved went to a man called Pardo at twelve.*
>
> *I could put it to her now. Or I could find out first which hour it was, and whether Abramowitz had an evening that stood up. A good story is like a good chair. You find out which one holds before you sit in it.*

```
  Corrigan ›  Put it to her (opens the claims)
  Go to:      > the Automat  [Abramowitz heard about the key at nine]
              * the Delmonico rooms  [Mrs. Cheatham minds the dog; Ashby was with her at ten]
```

*Beats: staging · ask · reaction · job · thought · close · the turn (a chapter break, recapping by name) · hand-off. The recap no longer claims more than the player holds: "something that moved", not "Duchess".*

---

## Page 8 — the Automat

> The Automat on Delancey Street was ten minutes the other way, a long bright room that never closes, which is the nicest thing anyone ever said about it. Little glass doors ran down one wall, each with a sandwich or a slice of pie behind it, and a nickel would open any one of them. A bare bulb hung on a cord over the coffee urns and swung whenever the street door shut.
>
> Prentiss had pointed me here: Abramowitz, the man who'd stood at his elbow at the Thalia while he told the room about the key. He was at a table by the wall with a cup he'd stopped drinking, watching the room the way people watch rooms they shouldn't be in.
>
> Nobody keeps a list at an Automat. That's what it's for.
>
> I bought a coffee to look like I belonged. It cost a nickel, and I got about a nickel's worth.

```
  Abramowitz ›  > where were you tonight?  [he heard about the key at nine]
```

*Beats: the walk · arrival · why here · close.*

---

## Page 9 — Abramowitz

> I sat down across from him. He moved his cup an inch toward himself, as though I might take it.
>
> "Mr. Abramowitz. You were at the Thalia tonight when Mr. Prentiss was telling the room where he keeps his key. Where did you go after?"
>
> He had the answer ready, which is either honesty or rehearsal.
>
> "At eight I took a letter round to a lodger at the Delmonico rooms. Mrs. Cheatham let me in. At nine I went to the Thalia, because a friend was in the show, and I stood with Miss Feeney. At ten I came here for coffee and a newspaper, on my own. At eleven I went back to the Thalia for the second show, on my own."
>
> I checked it against what I had. Eight, nine and ten were fine, or at least nobody said otherwise. Eleven wasn't. Coffin had Feeney, Ashby and Pardo at the Thalia at eleven, and nobody else. Coffin seats everybody. One of them was wrong, and it wasn't the man with the torch.
>
> Abramowitz turned a page of the newspaper he wasn't reading. That was twice tonight I'd seen it done.

```
  * Put it to Abramowitz  [his story at eleven against Coffin's list]
```

*Beats: staging · ask (in the detective's words, carrying the reason) · reaction · job · thought (the collision, said plainly) · close (a callback to the newspaper habit).*

---

## Page 10 — put to Abramowitz

> "One thing," I said. "You said the Thalia at eleven. Coffin had Miss Feeney, Mr. Ashby and Pardo at eleven, and nobody else. Coffin counts the house for a living."
>
> Abramowitz looked at the floor for a while, as though it had been the one to tell me.
>
> "All right. I wasn't at the Thalia. I was here. Meeting Weisglass, which I promised at home I'd never do again. It's cards. It's only cards." He nodded at a man two tables down who was pretending very hard to be reading the pie. "Ask him. Quietly."
>
> That was a hole, and he knew it, and I wasn't sure yet that it was the one I wanted. An owned-up story is only as good as whoever's in it with you. If Weisglass said the Automat at eleven, then Abramowitz had been here, not on Stuyvesant Street, and Prentiss had been wrong about the face.
>
> The bulb swung as somebody came in from the street, and every shadow in the room changed its mind.

```
  Weisglass ›  > where were you tonight?  [Abramowitz says they were together at eleven]
```

*Beats: the confrontation (their line against the line that breaks it) · reaction · admission naming the check · thought (an admission must be checked) · close.*

---

## Page 11 — Weisglass

> Weisglass had finished pretending to read the pie and started pretending to read the menu, which only had four things on it.
>
> I sat down and asked him where he'd been all evening, in order.
>
> He looked at Abramowitz, and Abramowitz looked at the ceiling, and that settled something between them that I wasn't invited to.
>
> "Home, from eight, on my own. At eleven I came here to meet him." He jerked his head. "Same as Fridays. Don't tell his wife."
>
> So Abramowitz was here at eleven with Weisglass's word under it, and Weisglass had nothing to gain from lending it but a card game. Prentiss's man at the elbow had the face for it, but not the hour. That left Corrigan with her story, and the clock still open between ten and eleven.
>
> The one person who'd know the hour was the one who minds the dog.
>
> I left them their four-item menu. They'd earned it.

```
  Go to:  > the Delmonico rooms  [Mrs. Cheatham minds Duchess]
```

*Beats: staging · ask · reaction · job · thought (who's cleared, what's still open, by name) · hand-off · close.*

---

## Page 12 — the Delmonico rooms

> The Delmonico rooms were over the fish market on First Avenue, named after the grand restaurant uptown, and the only thing they had in common with it was fish. The stairwell smelled of Friday, though it was well into Saturday. A holy picture hung in the hall with a little lamp in red glass under it.
>
> Prentiss had said Mrs. Cheatham minds Duchess when he's out. Ashby had been up here at ten about money, and Abramowitz at eight with a letter. For a woman who lived alone, she'd had a busy evening.
>
> She had the door on the chain and opened it the width of one eye before she opened it the rest of the way. She was in a wrapper and a hairnet and an expression that said she'd been expecting somebody, though not me.
>
> Nobody keeps watch on this stair but her, and she keeps it from behind a chain.

```
  Mrs. Cheatham ›  > where were you tonight?  [she minds the dog; she'll know the hour]
```

*Beats: the walk · arrival · why here (three earlier lines, joined) · staging · close.*

---

## Page 13 — Mrs. Cheatham

> I asked where she'd been tonight, from the beginning, and whether she'd seen the dog.
>
> "Here, all evening. Where else would I be? Mr. Abramowitz brought a letter at eight. Nine, just me. Mr. Ashby at ten, about the money he owes me, which he did not bring. Eleven, just me." She sniffed. "And I had Duchess here at ten for her supper, as I always do when he's out, and I put her back in the flat just before eleven, with the key under the mat where he said."
>
> So the dog was here at ten, eating, and back on her cushion just before eleven. The stairs at Prentiss's creaked at ten or eleven, and at ten Duchess was upstairs at the Delmonico having her supper. It went at eleven.
>
> At eleven Feeney was at the Thalia, with Coffin's word. Ashby too. Abramowitz was at the Automat, with Weisglass's. That left one person who'd heard about the key, with no true account for eleven, and who'd been seen on Prentiss's street at eleven with no hat on, going fast. And she'd asked on Friday what the dog was worth.
>
> The holy picture watched me down the stairs with an expression I couldn't afford.

```
  File the report
```

*Beats: ask · reaction · job · thought (the hour, then the elimination, said by name: every rival placed, one left) · close. The thought here is the solve, written out. At Medium it's said only after the player holds every piece; at Hard-boiled the engine would leave the last two lines to the player.*

---

## Page 14 — the report and the ending

> I sat down on Mrs. Cheatham's stairs with the form, which is where I do my best paperwork, and wrote it down: Corrigan, at eleven, to Pardo at the Thalia, because she'd lost her place at the night school on Friday and Duchess had papers.
>
> I told Prentiss at a quarter to eight, on his own step. He went to the Thalia in the good overcoat over the pyjamas, to see a man in the back row about a dog, with a look on his face I wouldn't have wanted to be on the other end of.
>
> The fee on the blotter had company now. The radiator could make the introductions.

*Beats: the report · the ending in the client's terms ("who, and where") · close (a callback to the radiator on page 1).*

---

## What the engine needs to write like this

1. **Page sheets for the board,** one per job (office, arrival, account, list, search, put it to, admission check, the turn, report), with the beat slots above in order.
2. **Cards for the new slots:**
   - staging by place kind and manner;
   - asks per job, in the detective's words, with room for the reason ("You were at the Thalia when…");
   - reactions by manner, the same for liars and the truthful;
   - closes and callbacks.
3. **Thoughts from the engine.** After each job, write one to three plain sentences that tie the new fact to held facts by name: same place, same hour, the means, the street.
   - Corrigan on Stuyvesant Street at eleven links to the scene's street.
   - Ashby's eleven agrees with Coffin's eleven.
   - Abramowitz's eleven collides with Coffin's list.
4. **The walk on place changes:** the distance in minutes, where it matters.
5. **The thread.** Each page opens on the pointer that sent the player there, said in the voice. It's the same reason the star shows.
6. **The motive surfaces somewhere on the page path,** if the report asks why. Here it's the client's aside in the office.
7. **Generator nits seen here:**
   - two suspects named Kathleen;
   - a Yiddish theatre showing "the new picture";
   - the house manager repeating "telling the room about his key" every hour;
   - "stayed till ten" followed by "at ten went up to".

**Target:** 200–300 words a page. Every page has a why-here or a walk. Every job page has a thought that names an earlier fact. Callbacks on about 70% of pages.
