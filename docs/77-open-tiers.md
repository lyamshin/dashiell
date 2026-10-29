# Every tier open (2026-10-28)

The designer: "I don't think we should have to beat prior difficulties to unlock ... or at least not
get perfect. The unlocking mechanism doesn't seem to be working."

## What was wrong

- A tier was cleared only by a perfect report (`points === asked`), and only a cleared tier opened the
  next. A 4½ out of 5 with the right culprit opened nothing.
- The verdict and the title page disagreed. On the first perfect report the verdict said "Raw is
  cleared. **Coddled is next.**", but "Open tonight's case" kept opening Raw until Raw had been
  cleared twice (`tonightTier`); Coddled was open only under "Choose a case".

## What it is now

- **Every tier is open from the first night.** "Choose a case" lists all six; no locks, no "clear
  Raw to open" (`tierOpen` and the picker's locked state are gone).
- **"Open tonight's case" is a suggestion** that moves up one tier on any report that names the right
  culprit at a tier above any named before, perfect or not (`tonightTier`: one above the highest
  tier in `cleared` or `named`, Hard-boiled at most). A hunch with the right name counts.
- **The verdict says so on that report and only then**: "Raw is cleared. **Coddled is next.**", or
  "Hard-boiled is cleared, and that is the last of them." (`recordRun`'s `news`, `tierNewsLines`).
  The right culprit again at a lower tier, or the wrong one, says nothing.
- **Stars are unchanged**: a star is a perfect report, a gold star a perfect one with no hint; the
  picker still shows a tier's best. `cleared`, `clears` and `golds` keep counting perfect reports.
- **The profile** gains `named` (tiers with the right culprit named), and a filed report carries
  `culprit` (the web book and the CLI pass whether `who` was right). A profile from before counts its
  cleared tiers as named, so nobody moves back.
- The teach page still shows until the first full-credit report, as before.

Tests: test/board-profile.test.ts. Checked in the browser on Raw 33: a 3½ out of 4 with the right
culprit said "Raw is cleared. **Coddled is next.**", the title page then said "Tonight: Coddled",
and every tier was pickable.
