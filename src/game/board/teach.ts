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
 * The teach page's lines for a night. The same eight from every world (the neighbourhood's map line
 * went with the period voice); `world` is kept so callers needn't change.
 */
export function teachLines(world?: string): readonly string[] {
  void world;
  return BOARD_TEACH_LINES;
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
