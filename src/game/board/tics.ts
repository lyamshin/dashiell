/**
 * docs/59 item 7: the tics. A night says each of these once at most, and a page one simile frame at
 * most; the hand (cards), the voicings' chooser and the situated deck pass over a line that would
 * say one again, and the lints (`clarity-lint.ts` `tic`, `scripts/claudisms.ts --gates`) count what
 * gets through.
 *
 * - "as it turned out";
 * - "which I wrote down" and its kin ("and I wrote that down", "and that went in the notebook");
 * - the room asked to help: "as if the tables could help", "as if the house might want to add
 *   something";
 * - a simile frame ("as if", "as though", "like a man counting money", "the way you’d carry a full
 *   cup"): one a page.
 */

/** The phrases a night says once, by the id the hand notes when one is said. */
export const NIGHT_TICS: readonly { id: string; name: string; re: RegExp }[] = [
  { id: 'tic:turned-out', name: 'as it turned out', re: /\bas it turned out\b/i },
  { id: 'tic:wrote-down', name: 'which I wrote down', re: /\b(?:which|and) I wrote (?:that |it )?down\b|\band (?:that|it) went in the notebook\b/i },
  {
    id: 'tic:as-if-help',
    name: 'as if the room could help',
    re: /\bas if (?:the |it |any |anything |anybody |they |he |she )?[\w’ ]{0,30}?\b(?:could|might|would) (?:help|add|want to add|have something to add|tell (?:me|him|her|us)|answer|remember)\b/i,
  },
];

/**
 * docs/59 item 7: the one word a running gag goes by ("the radiator", "the register"), once it's set
 * up tonight: nothing else on the night's pages brings it up again (its one pay-off aside).
 */
export function gagNoun(short: string): string | null {
  return /^(?:the|my|a|an) ([a-z]{7,})$/i.exec(short.trim())?.[1]?.toLowerCase() ?? null;
}

/** The night's tics a text says, by id. */
export function ticsIn(text: string): string[] {
  const t = text.replace(/⁣\d+⁤/g, '');
  return NIGHT_TICS.filter((x) => x.re.test(t)).map((x) => x.id);
}

/** Simile frames: "as if", "as though", "like a/somebody …", "the way you’d/people …" (global: for counting). */
export const SIMILE = new RegExp(
  [
    String.raw`\bas if\b`,
    String.raw`\bas though\b`,
    String.raw`(?<!\b(?:would|I’d|I|you’d|you|we|they|didn’t|don’t|felt|look|looks|looked|sounds?|sounded|seem|seems|seemed|more|nothing|things?|anything|something)\s)\blike (?:a|an|somebody|someone|the|it was|he was|she was|they were)\b(?! (?:that|this|it|nothing)\b)`,
    String.raw`(?<!\b(?:on|by|all|of|along|out of|halfway|across|part of|in|that’s|is|was|it’s)\s)\bthe way (?:you’d|you|people|a man|a woman|men|women|somebody|someone|(?:other|most|some) (?:men|women|people))\b`,
  ].join('|'),
  'gi',
);

/** How many simile frames a text's narration says (speech in quotation marks is the speaker's). */
export function similesIn(text: string): number {
  const narr = text.replace(/⁣\d+⁤/g, '').replace(/“[^”]*”?/g, ' ');
  return [...narr.matchAll(SIMILE)].length;
}

/** docs/62, P8: that a place keeps no watch ("No clerk, no doorman, nobody watching the stairs"): said once a night. */
export const UNWATCHED = /\bnobody (?:watching|kept (?:watch|the stairs|an eye)|minded who|on duty|was posted|saw who came)\b|\bno (?:clerk|doorman|one was posted|one on the door)\b|\bnobody in the place was paid to notice\b|\bwhoever came and went did it unseen\b|\bnobody would have known it\b|\banybody could have come and gone\b|\bthere was nobody on duty\b|\bnobody kept watch\b|\bno one was posted\b|\bnobody minded who came\b/i;
