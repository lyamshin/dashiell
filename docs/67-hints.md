# Hints

*2026-10-25, branch `hints`, off main at `04b40d7` (clarity-4, #104). Round 7's blind testers (`scratchpad/round7-digest.md`, designer items 1 and 2) said the stars do the deducing: Raw finishes it for you ("That left one person…", then "I could face Winslow with it"), and Poached feels like rails ("every step was starred"). The designer decided (`scratchpad/hints-spec.md`): no stars on the page; a Hint button instead, unlimited at Raw, three at Coddled, one at Poached, none from Soft-boiled up; hints cost nothing but show on the verdict; a perfect report earns a star, a perfect one with no hints a gold star; "How this works" explains it. This build is that, game side only: the generator, the boards, par and the paths didn't change, and the dealt boards hash as main's.*

## The decisions (the spec's)

| Tier | Hints a night | Before: stars by themselves (docs/46 §1) |
|---|---|---|
| Raw | unlimited | every open step of every cheapest way |
| Coddled | 3 | the open steps of one cheapest way |
| Poached | 1 | one star, the nearest open step |
| Soft-boiled | none (no button) | one star, the nearest open step |
| Medium | none | walks, and the question in the room |
| Hard-boiled | none | the scene, on page one |

- **No star appears by itself** at any tier. **A hint gives one step**, starred with its reason as a star read before ("Coffin has Ashby here at eleven — ask Ashby"): the nearest open step of a cheapest way on, by docs/46's Poached rule (in this room first, then the commonest across the cheapest ways, then path order), **confronts included**. Among suspects the held evidence treats the same (docs/65 §4, `sameStanding`) it goes to the first by name.
- **It stays given** until the step is taken or is no longer on a cheapest way; a player never pays twice for a step. **Pressing again** gives the next step (at Coddled, for another hint). With nothing left to find, it says **"You have what you need to close the case."**, and at Raw the elimination the walk thought used to say. Out of reach of a cheapest way, it gives the designed path's next open step. **On the report page**, what's still missing, or that the report can be filled from what you have.
- **A hint costs no action and no points**; the count is the cost.
- **Off the pages, at every tier:** the hand-off, the turn's what-next ("I could put it to X now", "I could face X with it", "Before I did anything about it…", Medium's "…to get over to Sokol’s back room"), Raw's walk thought (`thoughtLevel`: Raw is `link` now) and Hard-boiled's page-one star note (its mark line, `FACE_MARK`, stays). **Kept:** the curtain's fastest solve and its star reasons, and the link tiers' "So…" lines. The level lint holds every tier to it.
- **The verdict:** a star for a perfect report (outcome `solved`), a gold star for a perfect one with no hint taken (every perfect report from Soft-boiled up), and the hints beside the actions ("11 actions, 2 hints."). **The profile** counts stars and gold stars per tier; **the title page's tier list** shows each tier's best. The page's choice mark stays `*`; the verdict's star is ★, the gold star ★ in gold, both with words for a screen reader.
- **"How this works"** gets "Stuck? The Hint button shows you a good next step and why. You get fewer as the cases get harder."; **the night's first page** says tonight's count ("Hints are unlimited tonight.", "You have three hints tonight.", "You have one hint tonight.", "No hints from here on."); **the button** carries its count ("Hint", "Hint (2 left)") and greys out at none; **the help** says "The Hint button stars a choice worth taking now and says why. A perfect report earns a star; a perfect one with no hints, a gold star."
- **The CLI** has `hint`; **the save** records it; **the blind-playtest prompt** gets a line.
- **The measures:** the reader becomes the hint-taker; the oracle and the wanderer take no hints and don't move.

{{BUILT}}
