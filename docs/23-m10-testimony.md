# M10 — Testimony, and a real first case

Two problems, both found by reading whole runs page by page (seed 11 at Raw, seed 3 at Medium).

1. **The facts arrive raw.** The designer: "still way way way too dense. We need plain text (and maybe some flavor text) wrapping each of the facts, so that the cards are expanded. That way the details can slot in and it feels more organic." The target is `docs/golden/seed3-testimony.md` and its eight rules. Read it first.
2. **Raw is too easy.** The client points at an innocent, and two suspects place each other at the crime's half hour. The last name standing is the culprit, who is never questioned. It's solved in 5 calls by elimination, with no lie caught.

## Part A — Facts told, not printed

### A.1 The telling

Replace how exchange beats render facts. Every answer that carries facts becomes a **telling**, built from:

- **the question,** in the detective's words, and clearly the detective's. It opens with the detective's action or name, never with a bare line after the witness "looked up" that reads as the witness speaking;
- **the fact family,** said once in the witness's words (see A.2);
- **a grounding line:** how the witness knows, from their trade, their post, their acquaintance with the subject, or their own claimed account of where they were. It states no case fact beyond the fact itself, and it may lie only where the lie rule lets it, meaning about the witness themselves;
- **a follow-up** where the fact has a natural second half: the rest of a person's evening, "You're sure it was her?", "The ones you didn't know?";
- **a tail:** attitude, opinion, a small joke. It's never a fact, and it's the only place a figure of speech goes;
- **the detective's note:** one or two sentences on what the fact is worth. Never a rule restated, never a verdict above Coddled, never a mechanics word (§A.4).

### A.2 Fact families, told together

Facts of one family arrive in one natural answer, never one question per fact:

| family | told as |
|---|---|
| one person's comings and goings | "He was up here at seven. Gone by half past. Back at nine, and not for long." Spans spoken, ordered, with "and the rest of the evening" as the follow-up for the negative span. |
| a place's head counts and "nobody but" | "Quiet night. One at half past six. One at half past eight. Two at nine…" |
| strangers seen | "A woman under forty at half past six. A man in his thirties at half past seven. I didn't know either of them." |
| a sighting tied to an event | "When the fight came on the radio, she was at the end of the bar." |
| knowing and not knowing | "Carmine Vitale. Everybody on this block knows Carmine Vitale." / "Never heard of her." |
| access, means, motive facts | said as the thing the witness knows about: "There's one key. Tonight it wasn't on the hook. Marchetti had it." |
| the witness's own evening | "Where were you, start to finish?" told as a short story of their night in their register, with a grounding line |

**Never quote a generator sentence.** No clue's `text` or `rule` string ever appears inside quotation marks on a page. That's a test.

### A.3 Pacing

- **At most three fact families told on one page.** When a witness has more, the page ends on a free **"Go on"** choice: the same conversation continues on the next page, at no cost to the clock.
- **Each person present is described once per visit.** On later pages of the same visit, they appear only if they do something new. Recall actions ("again") appear at most once per visit, and that rule is enforced across pages.
- **The establish paragraph states the watch once.** Today "No one was posted to watch who came down to it" and "No one was posted to see who came and went" both appear.

### A.4 Words that never appear in narration

The page is a story, and the book's machinery belongs in the notebook. These words never appear in narration or dialogue:

- grid, margin, rule, lead, beat, card;
- "the notebook had…";
- "put it on/in the grid";
- "the coroner's hours" as a noun phrase (say "the time the coroner gave").

A test runs over 40 seeds × every tier. It checks the list, the garbled errand forms seen in play ("On X's word, I asked X about…", "I came to put X to Y."), and empty thoughts ("I wrote it down and thought about it.").

### A.5 Bugs from the read-through, all to fix

- **Relationship words ignore gender:** "I am his brother-in-law" is said by a woman. Every relation label with a gendered form gets both forms.
- **The victim's pronoun is wrong in scene clue text:** "The lamp came down with him" for a woman. Audit every clue template with a pronoun.
- **The client uses the detective's name** ("…same as always, Dashiell") though they have never met, unless the roll says they know each other.
- **Contradictory portraits:** "a voice thinned with age" on someone in their thirties. Gate portrait cards by age band.
- **The window thought prints "from half past eight until half past eight."**
- **Page one closes on "Down it went." / "I noted it. It was late."** It has a present-tense aside ("She is still in the chair. Two questions on the house…"). It also has "She took a moment. I did not linger."
- **The closing page says "I closed it the way it opened, X at the center of it"** when the case opened on someone else.
- **The errand-deck pronoun "their"** for a person whose sex is known.
- **A search that turns up several documents lists them flat.** Tell each find as its own short moment, subject to the three-families pacing.

### A.6 Content

New decks for tellings: `telling`, keyed by family × temper (enigma / plain / yap) × acquaintance strength, with slots for the fact parts. Also `grounding` (by trade, post and acquaintance), `followup` (by family), `tail` (by temper and family) and `note` (by family and tier band). Write a first full set in the golden's voice. The deck-expansion writers extend it afterwards.

## Part B — Raw teaches the real game

Raw's job is to teach the one loop that is the whole game: **someone lies about where they were, somebody else's word catches it, and you put it to them.** Today Raw teaches elimination.

Raw becomes:

- 3 suspects, 3 places, with a coroner who names the half hour;
- **the culprit's own account is on the solving route and lies about the crime's half hour;**
- one witness, a watcher, puts the culprit somewhere else at that half hour;
- the two innocents are cleared by their own accounts plus one corroboration each, not by clearing each other;
- the client points at an innocent;
- verdict thoughts are allowed at Raw (it's teaching). But the page never says "That cleared X" until two facts agree;
- the par route is about 6–7 calls, with a budget of about 10;
- **findable clues about 12–15** (today a Raw case deals 46).

The design test for Raw: a player who only follows marks names the culprit ≤60%, and a reasoning player ≥95%. Coddled follows the same shape, plus the method.

## Tests and measures

- The whole suite stays green, correspondence has 0 violations, beat coverage is 100%, and the plain-terms check is clean.
- **A reader lint** (A.4), plus these checks:
  - no quoted generator sentence;
  - no question line repeated within a page;
  - no presence re-description within a visit;
  - at most 3 fact families per page.
- The night harness is re-measured with a new target: the testimony golden's pages for ask pages.
- The design test per tier with `scripts/diagnose-play.ts`: the Raw targets above, and no tier made worse.
- **Read-through:** render full runs for seeds 11 (Raw), 3 (Medium) and 7 (Hard-boiled) and include them in the notes, so a reader can check them page by page.
