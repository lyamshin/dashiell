# The Golden Loop — closing the gap between the engine and the golden example

## The job

An Opus **stylist-overseer** runs an iterative loop that moves the engine's pages toward `docs/golden/seed3-opening.md`, measured by `scripts/style-metrics.py` against the targets in `docs/golden/GAP.md`, until improvement stalls. It may direct Sonnet writers. It reports back to the lead with numbers and pages.

## Ground rules

- The generator (`src/gen/`) and the facts do not change. Every fact still reaches the page. The correspondence checker stays at zero violations.
- The exchange and the finds are never dropped. Plainness is added around them, not by removing them.
- Cards keep `status: "generated"`; the human tunes later. New atoms are additions to existing decks or new small decks with schema entries.
- Every round is measured on the **same fixed set**: pages 1–3 of seeds 1–40 at difficulty 2, plus the full seed 3 for reading. Numbers are computed by a script, not estimated.
- No new dependencies. Tests stay green. Commit per round on branch `golden-loop`.

## What the loop is allowed to change

1. **Plain atoms.** Connective sentences and dialogue business with no image: arrivals ("I went up."), presence ("She was at the table."), pauses ("She let that sit."), Dashiell's short questions for the briefing ("What were you doing there at half past eleven?"), acknowledgements ("I knew the name."), exits ("I wrote it down and went to find the night man."). Tagged by function so the assembler can place them. These are a deck (`plain.json`) or engine data; the overseer decides and documents.
2. **Joiners.** Rules that hand a noun from one block to the next: the reactive line opens on the last prop mentioned; the arrival names the place the transition walked toward; a portrait detail gets a reason to be seen (the hand in the pocket) before the detail.
3. **The briefing as an exchange.** Split the client's sixteen sentences into turns with Dashiell's questions between them, drawn from the plain deck by what the next sentence establishes (a question about time before the discovery hour; "Why me?" before the purpose; "Who do you like for it?" before the pointer).
4. **Portraits followed, not listed.** First meeting: one detail plus one sentence about it, in the golden's shape. The other two components wait for later pages.
5. **Rhythm.** The assembler enforces sentence-length variety: at least a quarter of sentences six words or fewer, and one long carrying sentence per eight. It may split or fuse plain atoms to get there; it may never alter a fact's words.
6. **Image budget** may be lowered further (two per page, one on the briefing page).

## The round

1. Measure the fixed set. Record every metric's mean and worst page in `docs/golden/rounds.md`, plus page one of seeds 3, 7, 12 verbatim.
2. Read the three pages against the eight rules at the bottom of the golden. Write two sentences on what is furthest from the golden and why.
3. Choose the one or two changes most likely to move the furthest metric. Write the atoms (Sonnet writers, in parallel, with a brief that names the function and gives three examples from the golden) and make the assembler change.
4. Run the tests. Measure again. Record the delta per metric.
5. **Stop** when the aggregate improvement (sum of normalized distances to target) is under 3% for two consecutive rounds, or after eight rounds, or when every target is met. Then write the final report.

## The final report

`docs/golden/REPORT.md`: the round table (metric by round), the three pages before and after, what moved and what didn't, what the overseer believes is beyond this loop (structural changes that need the lead or the designer), and a recommendation: bless, hone, or regroup. Paste page one of seed 3 before and after inline in the message back to the lead.
