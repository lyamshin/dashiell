# Milestone 1 — notes

## The numbers

Over seeds 1..200: **median 2 attempts, max 16**, mean 2.52, p90 5, p99 14. 96 of 200 seeds are accepted on the first attempt; 305 attempts are discarded in total. 45 tests pass. A case carries on average 172 clues, 374 observations (20 of them withheld), 2.17 innocents lying about the murder tick, and 1.91 innocents with a motive. The killer carries a second, non-murder secret in 61 of 200 cases.

## What was hard

**Exculpation drove the whole design.** "Each innocent suspect is exculpable at tick M by two independent clues" is the constraint everything else bent around. Five innocents each need two non-withholding witnesses at one specific tick — under pure rejection sampling that essentially never happens by luck. So the murder-tick row is placed first, searched in memory until every innocent is doubly witnessed and the killer has a claimable room, and only then is the rest of the evening filled in by a walk between fixed points. That search is not counted as an attempt, which is most of why the median is 2 rather than several hundred.

It also forced the map's shape. Sightlines are concentrated on the ground floor and the Doorman is posted in the Lobby rather than the Street, because the Lobby sees the Front Desk, the Street and the Bar. Without that, half the hotel is a blind spot and nobody can be cleared of anything.

**Two constraints fight each other directly.** "At least two innocents lie about the murder tick" wants them hidden; "every innocent is exculpable at the murder tick" wants them seen. The only way to have both is a secret that happens somewhere a fixture can see into, so each secret template declares `witnessLocations`: drinking (Bar), gambling (Street) and fencing (Kitchen) can sit on the murder tick; affairs, embezzling and blackmail cannot, and are scheduled away from it.

**Contradicting the killer is awkward by construction.** Nobody sees the killer at M — they are alone with the victim, which is the definition. So the contradiction has to come from the room they *claim*, via people who were there and say otherwise. That works, but it means the killer's claim has to land somewhere with two truthful occupants, which in practice is almost always the Lobby or the Bar.

## Which constraints actually fired

None of the solvability or interestingness heuristics rejected a single attempt over 200 seeds. Every discard came from the scheduler:

| Discard reason | Count |
|---|---|
| embezzling has nowhere to happen away from the scene | 130 |
| a suspect's evening does not join up | 56 |
| the killer could not be seen reaching the weapon before the murder | 46 |
| fewer than two innocents could hide a secret at the murder tick | 38 |
| the blackmail cannot finish before the murder | 20 |
| no free window for the blackmail secret | 12 |
| the victim's evening does not join up | 3 |

The top one is embezzling colliding with a murder in the Victim's Suite — the secret only has one room and the killer is using it. Blackmail contributes 32 more, because it drags the victim into a private room and the victim also has to be publicly visible at M−1 for the time-of-death proof.

That the check never fires is the intended outcome of constraint-first generation, but it makes the check a regression net rather than a filter. `test/solvability.test.ts` damages a good case twelve ways to prove it is load-bearing.

## What I would change

1. **Clue volume.** 172 clues and 374 observations per case is far more than a player can read. M2 needs salience — most observation runs are noise, and the truth sheet is 700 lines because of it.
2. **The killer's alibi is predictable.** Lobby or Bar, nearly always, because they are the only rooms guaranteed two truthful witnesses. A third fixture (a night clerk, an elevator operator) would widen the choice and make the contradiction less mechanical.
3. **The Roof Garden is the scene 56% of the time** — four of five methods allow it. `murderLocations` needs rebalancing, and the Kitchen (11/200) needs more methods that suit it.
4. **Time of death is established the same way nearly every case:** coroner's window plus two people who saw the victim alive at M−1. The [M, M+1] variant only fires for loud methods with two hearers. More independent ways to pin the tick would make the opening of a case less repetitive.
5. **Withholding is coarse.** A liar withholds *everything* they saw during a lied-about tick, including things that would not incriminate them. More realistic — and more interesting — would be withholding only what places them in the cell they are lying about, and fabricating the rest.
6. **Map variation is thin.** One optional edge and shuffled objects. The adjacency graph is effectively identical every run.
7. **The dead-weight heuristic does not catch forged identity.** A suspect with that secret has no hidden movements, so they can end up never lying and with no motive. The spec's test ("no lie, no motive, no secret") passes because they do have a secret, and they do generate a document clue — but on the page they are the quietest person in the hotel.

## Four bugs worth recording

All four were found by tests over the 200-seed corpus or by reading a generated sheet, not by reading the code.

- A fixture could take two excursions on back-to-back ticks and step straight from the front desk to the street.
- Observation clues were sourced from the victim, who is not available for interview.
- The killer's lies stopped at the murder tick, so they truthfully told the detective they had been standing in the room with the body half an hour after it became one — and a fixture on an excursion could walk in and find it. The killer now leaves the scene on the next tick, and nobody goes back in.
- A denial run could straddle a tick where the denier themselves moved, putting them in one room for a span they spent in two.

The pattern is that every one of them is a statement about *who can say what*, which is the part of this milestone the data model makes easiest to get subtly wrong.
