/**
 * docs/39 §5: the teach-once page, and the book's help.
 *
 * Plain modern English, one short sentence a line, no detective voice
 * (the designer, 2026-10-16: "should not be written in period language and
 * should be MUCH MUCH simpler"). The seven lines:
 *
 * - everyone gives you their whole evening, with company;
 * - whoever kept the bar or the stairs names everyone, hour by hour;
 * - people lie about themselves, never about what they saw;
 * - when two stories don't match, tell one what the other said;
 * - a refusal isn't proof;
 * - the case closes on a name and the fact that proves they lied;
 * - docs/61: when two people lied, it also needs what clears the innocent one (docs/64's words).
 */

export const BOARD_TEACH_TITLE = 'How this works';

export const BOARD_TEACH_LINES: readonly string[] = [
  'Ask anyone where they were tonight, and they’ll tell you their whole evening and who they were with.',
  'A bartender or a landlady can tell you everyone who came in, hour by hour.',
  'People lie about themselves. Nobody lies about what they saw.',
  'When two stories don’t match, tell the person what the other one said.',
  'Some innocent people refuse to explain. A refusal isn’t proof.',
  'To close the case you need a name and the fact that proves they lied.',
  'When two people lied, you also need what clears the innocent one.',
];

/**
 * The teach page's lines for a night. The same seven from every world (the neighbourhood's map line
 * went with the period voice); `world` is kept so callers needn't change.
 */
export function teachLines(world?: string): readonly string[] {
  void world;
  return BOARD_TEACH_LINES;
}

/** The book's help, for the play CLI and the title page's "How it plays": how a night plays. */
export const BOARD_RULES: readonly string[] = [
  'Each page gives you choices: who to ask, what to search, where to go. Each one takes an action, and you have the night, until eight in the morning.',
  'A star marks a choice worth taking now, and says why.',
  'The notebook keeps what you’ve learned. The grid shows where everyone says they were, and where the stories clash.',
  'Close the case when you’re ready: who, when, how, why, and what proves it. A hunch counts half. When two people lied, it also asks who else lied and what clears them.',
];
