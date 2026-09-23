# Shorter nights at Hard-boiled

*Blessed by the designer 2026-09-23. Build after M10 A (testimony) and M10 B (Raw) land, since it touches the same exchange pages and the par calculation.*

After the M9 polish, a reasoning player typically needs 23 calls to solve Hard-boiled, against a budget of 26 (`docs/20-m9-polish-notes.md`). The target is about 19. The two changes below remove calls that were busywork, not reasoning.

## 1. A second fact in the same confrontation

Today, breaking an innocent's story takes two separate confrontations, each a half hour, because they give up their secret only on the second independent contradiction. Instead, a confrontation that lands can be followed, in the same visit and at no further cost, by **"Put another fact to her"**. It opens the same picker. If the second pick is also a real, independent contradiction, the confession comes on this page. A wrong second pick ends the confrontation with the second lie standing ("That's all I'm going to say about it."), and it costs nothing more.

- **The culprit** gets the same offer, and never confesses. A second right pick draws the culprit's third lie, or silence.
- **The picker still never hints** at which facts contradict.
- **Par and the solver** count a confession as one call plus the facts needed, not two calls.

## 2. The account comes with the first question

Today, asking a suspect about their own evening ("Where were you, start to finish?") is its own call. Instead, the first time the detective asks a suspect anything, the page ends with the suspect's own account of the evening, told the way the testimony golden tells it. It costs no extra call. "Her evening" stays on the buttons for asking again, free and marked done.

- **Leads and bridges** that used to send the detective for someone's account now send them to that person, with any question.
- **The lie rule is unchanged:** the account may lie about the speaker.

## Measure

- The design test per tier (`scripts/diagnose-play.ts`): the marks-follower stays at or below 50% from Poached up, and the reasoning player stays at or above 80% at every tier (at or above 95% at Raw and Coddled after M10 B).
- The median number of calls to solve per tier, before and after, with Hard-boiled at about 19.
- Par drops, and the budget follows it. Report both.
- Read full runs for Hard-boiled seeds 7 and 3, page by page, and include them in the notes.
