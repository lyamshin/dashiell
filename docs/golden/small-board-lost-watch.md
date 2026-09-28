# Golden: the small board, a lost watch at Poached

> **Note, 2026-09-28 (after build 4a and the designer's decisions).** The prose below is kept as written. The solver found it wrong:
> - **The watch path never asks Mr. Pulaski,** so nothing clears Mrs. Pulaski. It clears her because nothing collides with her account, and only her husband could collide with it. With him added, par is 5, not 6.
> - **It rates Raw,** because Szabo falls to two lists and his confrontation is never needed.
> - **It contradicts its own truth table.** Mulcahy's eleven o'clock leaves Szabo out, and Szabo's "home to bed at nine" lies about three hours.
>
> It also breaks rules decided since: Mulcahy places Szabo at the lied hours, so his lie never matters, and his admission is taken on his word.
>
> **The repaired fixture** (`lostWatchRepaired` in `src/gen/board/fixtures/lost-watch.ts`; `npm run board -- --fixture lost-watch-repaired`) makes these changes:
> - The Thursday game is in the Shamrock's back room, which Mulcahy can't see.
> - Szabo is at the Lyric at nine and lies about ten only. He refuses, as Oskar does, and Kasper, who deals the game, clears him. Mulcahy saw Kasper out front at eight.
> - Dombrowski is at the boiler at ten, and Mulcahy doesn't see what changes hands, so where the watch is comes from Oskar's crack.
>
> **Repaired, it doesn't match the golden's numbers:** it rates Poached, but par is 8, not 6, and Szabo refuses where the golden has him admit.

*2026-09-28. This checks that `docs/41-small-board.md` holds for a case that isn't a murder. For a lost item, the report asks who took it, when, where it is now, and why. Poached is 4 suspects, 4 hours and 3 places besides the scene, with one innocent liar.*

## The case

**The givens (the office).** Mrs. Adele Brandauer's late husband's gold watch, which sits on her parlour mantel under a glass dome, is gone. She had her Thursday card party in the parlour from eight until nine. At nine she wound the watch, as she does every night, "so it doesn't stop and remind me." Then she went to the pictures at the Lyric with Mrs. Gilchrist. She left the flat on the latch, because her nephew Oskar, who lodges with her, had lost his key again. She came home at eleven and the dome was empty.

She points at Mrs. Pulaski, across the hall: "She always said it was wasted on a widow."

**The people:**
- **Oskar Brandauer,** the nephew, a clerk who plays the horses. *He took it.* He owes Lou, a bookmaker who takes bets in a back booth at the Shamrock.
- **Mrs. Pulaski,** across the hall. She played cards at eight. She has envied the watch for years. She's innocent.
- **Lenny Szabo,** a card-party guest who lives two streets over. He's innocent, but he'll lie: he's promised his wife he's given up cards for money.
- **Mrs. Gilchrist,** a card-party guest. She was at the Lyric with the client, and she's innocent.

**The places:** the Brandauer flat (the scene), the Pulaskis' flat across the hall, the Shamrock (a bar on the corner), and the Lyric (a picture house).

**The watchers:**
- **Dombrowski,** the janitor, who sits in the lobby by the only stair with his pipe and his radio, and sees everyone who comes in or goes out.
- **Mulcahy,** the Shamrock's bartender.
- **Mr. Pulaski**, not a watcher: company in his wife's account, and worth asking.

## The truth

| | 8 | 9 | 10 | 11 |
|---|---|---|---|---|
| **Oskar** | the Shamrock | the Shamrock | **the Brandauer flat** (in and out) | the Shamrock, Lou's booth |
| Mrs. Pulaski | the card party | the Pulaskis' | the Pulaskis' | the Pulaskis' |
| Szabo | the card party | the Shamrock, **at cards** | the Shamrock | the Shamrock |
| Mrs. Gilchrist | the card party | the Lyric | the Lyric | the Lyric |

**The means and its lead time:** the watch was on the mantel at nine, when Mrs. Brandauer wound it. Anyone who wanted it had to come through an unlatched door between nine and eleven. From outside the building, that meant passing Dombrowski. From across the hall, it didn't. So Mrs. Pulaski is the rival, and she's the client's pointer too.

**What each person says:**

| | says | true? |
|---|---|---|
| Oskar | "The Shamrock, from eight till gone midnight. Ask Mulcahy." | **Lie at 10.** Dombrowski saw him come in and go up at ten, and down again in ten minutes. Mulcahy's list at ten doesn't have him. |
| Mrs. Pulaski | "Cards at eight. Then home, across the hall, with Mr. Pulaski and the radio, till bed. We heard the Brandauer door go, once, about ten." | true. Mr. Pulaski says the same. |
| Szabo | "Cards at eight, then home to bed at nine." | **Lie at 9.** He was at the Shamrock at a card table; Mulcahy's list has him. Put to him, he admits it. |
| Mrs. Gilchrist | "Cards, then the pictures with Adele from nine. Out at eleven." | true, and the client says so too. |

**The watchers' lists:**
- **Dombrowski,** the lobby: "Eight, the card ladies and Szabo come in and go up. Nine, Szabo goes out, the widow and Mrs. Gilchrist go out. Mrs. Pulaski goes across the hall; she doesn't come by me. Ten, the nephew comes in, goes up, comes down ten minutes after with his hands in his pockets. Nobody else. Eleven, the widow comes home. Nobody else."
- **Mulcahy,** the Shamrock: "Eight and nine: Oskar at the rail. Nine: Szabo, at the card table in the corner, where he isn't supposed to be. Ten: Szabo. Oskar had stepped out. Eleven: Oskar back, straight to Lou's booth, and something went across the table. Lou put it in his waistcoat. Nobody else I know."

## The designed path (six questions; par 6, budget 8)

| step | question | what it gives | what it connects to |
|---|---|---|---|
| 1 | Search the mantel | The empty dome; the door on the latch; the watch wound at nine | It went between nine and eleven, through the door. Who was in the building? |
| 2 | Ask Dombrowski who came in | At ten, Oskar, up and down in ten minutes. Nobody else from outside | Only Oskar came from outside. Mrs. Pulaski didn't need to |
| 3 | Ask Mrs. Pulaski her evening | Home with Mr. Pulaski. They heard the door go once, about ten | If her account holds, she was home with company, and the one door-sound fits Oskar |
| 4 | Ask Oskar his evening | "The Shamrock all night" | It collides with Dombrowski at ten |
| 5 | Ask Mulcahy who was in | Oskar not there at ten; at eleven, something across the table to Lou | Where the watch is now, and why (Lou) |
| 6 | Put Dombrowski's line to Oskar | "I went up for my key. I'd left it on the hook." (He'd lost it.) A second lie, and it breaks on the client's own word | Solved: Oskar, at ten, to Lou, for a debt |

- **Why it's Poached:** Szabo lies too, and a player who asks him first will think they've found something. Mulcahy's list clears him, and so does his admission when it's put to him. It's worth one wasted question, which the budget allows.
- **Why Mrs. Pulaski falls:** her account is whole and names company, Mr. Pulaski confirms it if asked, and nothing true collides with it. Every lie collides with something, and hers collides with nothing. That's the rule the player is taught on the first night.

## Two pages, for the voice

### The lobby: Dombrowski's list

> Dombrowski had a kitchen chair at the foot of the stairs, a radio the size of a bread box, and a pipe he didn't so much smoke as argue with. Nobody gets up those stairs without going round him, and he knows it, and he wants you to know he knows it.
>
> I asked him who'd come and gone tonight, all of it.
>
> "Eight, the card ladies, and Szabo, in his good hat. Nine, Szabo goes, the widow and Mrs. Gilchrist go to the pictures. Mrs. Pulaski goes back across the hall; that's not by me. Ten, the nephew." He pointed the pipe at the ceiling. "In, up, down again in ten minutes, hands in his pockets, whistling. He doesn't whistle. Eleven, the widow comes home. Nobody else."
>
> Oskar had come home at ten for ten minutes, whistling, and he doesn't whistle. The watch had been on the mantel at nine, on the latch, and gone at eleven. I didn't know yet what Oskar had gone up for, but I knew what he'd come down with. It was in his pockets, with his hands.

### Put to Oskar

> "Dombrowski saw you come in at ten," I said. "Up and down in ten minutes, whistling."
>
> Oskar looked hurt, the way young men do when the world won't agree to their version of it. "I went up for my key. I'd left it on the hook."
>
> "Your aunt left the door on the latch because you'd lost your key."
>
> He thought about that for a long time. It didn't get any better while he thought about it.
>
> "Lou was going to have my legs," he said finally, to the floor. "It's only in hock. I'll get it back Saturday."
>
> The watch was in a bookmaker's waistcoat at the Shamrock. It kept good time there. It was the only thing in that booth that did.

*The culprit gives a second lie that collides with the client's own givens, and then, since this isn't a murder, he tells the truth. At the low tiers a small-case culprit may crack. At Medium and up they don't.*
