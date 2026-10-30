/**
 * docs/39 §5: the teach-once page, and the book's help.
 *
 * Plain modern English, one short sentence a line, no detective voice
 * (the designer, 2026-10-16: "should not be written in period language and
 * should be MUCH MUCH simpler"). The eight lines:
 *
 * - everyone gives you their whole evening, with company;
 * - whoever kept the bar or the stairs names everyone, hour by hour;
 * - people lie about their own evening and who was in it, never about where they saw anybody else (round 9: a pair's "Obermann joined me at ten" is a lie about who she saw);
 * - when two stories don't match, tell one what the other said;
 * - a refusal isn't proof;
 * - docs/78: the case closes on five answers: who did it, who caught them out, when, how, why;
 * - docs/78: who caught them out is the person who told you what shows the one who did it was lying (never "whose word": the
 *   voice script's jargon rule reads it as board-speak);
 * - docs/67: the Hint button, and that there are fewer as the cases get harder. The page shows once,
 *   so it never says tonight's count; the night's first page does (`hints.ts` `hintsNote`).
 */

export const BOARD_TEACH_TITLE = 'How this works';

export const BOARD_TEACH_LINES: readonly string[] = [
  'Ask anyone where they were tonight, and they’ll tell you their whole evening and who they were with.',
  'A bartender or a landlady can tell you everyone who came in, hour by hour.',
  'People lie about their own evening, and who was in it. Nobody lies about where they saw anybody else.',
  'When two stories don’t match, tell the person what the other one said.',
  'Some innocent people refuse to explain. A refusal isn’t proof.',
  'To close the case you answer five questions: who did it, who caught them out, when, how, and why.',
  'Who caught them out is the person who told you what shows the one who did it was lying.',
  'Stuck? The Hint button shows you a good next step and why. You get fewer as the cases get harder.',
];

/**
 * docs/82 (puzzles B, behind the flag, from Soft-boiled up): the one thing B teaches. Two stories may
 * fall apart, and only one of the two did it: the hour, or who could have had the means, says which.
 */
export function teachB(c: { type: string; tier: number; puzzles?: readonly string[] } | undefined): string | null {
  if (!c?.puzzles?.includes('B') || c.tier < 3) return null;
  return `When two people have lied, only one of them could have done it. Find out when it happened, and who ${c.type === 'murder' ? 'could have got the weapon' : 'could have known the way in'}.`;
}

/**
 * docs/83 (puzzles A, behind the flag, from Poached up): the one thing A teaches. The notebook writes
 * down what was said and draws nothing from it; finding where two stories don't fit is the player's.
 */
export function teachA(c: { tier: number; puzzles?: readonly string[] } | undefined): string | null {
  if (!c?.puzzles?.includes('A') || c.tier < 2) return null;
  return 'From here on the notebook only writes down what you were told. Where two stories don’t fit is yours to find.';
}

/**
 * The teach page's lines for a night. The same eight from every world (the neighbourhood's map line
 * went with the period voice); `world` is kept so callers needn't change. docs/82: with puzzles B, the
 * line it teaches after the refusal's. docs/83: with A, its line after the one about two stories.
 */
export function teachLines(world?: string, c?: { type: string; tier: number; puzzles?: readonly string[] }): readonly string[] {
  void world;
  const a = teachA(c);
  const b = teachB(c);
  if (!a && !b) return BOARD_TEACH_LINES;
  return [...BOARD_TEACH_LINES.slice(0, 4), ...(a ? [a] : []), BOARD_TEACH_LINES[4] as string, ...(b ? [b] : []), ...BOARD_TEACH_LINES.slice(5)];
}

/**
 * The book's help, for the play CLI and the title page's "How it plays": how a night plays. docs/80:
 * what the teach lines above don't say, and read after them (the drawer and the CLI's help print the
 * eight first), so no rule is said twice in one place: the five answers and who caught them out are
 * the teach page's, the Hint button its last line's.
 */
export const BOARD_RULES: readonly string[] = [
  'Each page ends in choices: who to ask, what to search, where to go. Each takes an action, and you have until eight in the morning.',
  'The notebook keeps what you’ve learned. Its grid shows where everyone says they were, and where the stories clash.',
  // (Case 2312, the owner's ruling: the report asks "When did it happen?", so a poisoning's when is said here.)
  // (docs/78: five answers, one point each; a lost thing asks where it is now in place of how.)
  'Each answer is a point. Who caught them out can be their own second story, if they changed it. For a poisoning, when is the hour the poison was given, not the hour of death. For a lost thing, you say where it is now instead of how.',
  // docs/67: no star by itself; the Hint button gives one.
  'A perfect report earns a star; a perfect one with no hints, a gold star.',
];
