/**
 * docs/43 §7: the teach-once page, rewritten for the small board. Four lines
 * in the detective's voice, and docs/46 §3's fifth:
 *
 * - everyone gives you their whole evening;
 * - whoever kept the door or the bar names everyone;
 * - every lie runs into something true;
 * - not everyone who refuses is guilty;
 * - a name's no good without the line that breaks it.
 */

export const BOARD_TEACH_TITLE = 'Before the office';

export const BOARD_TEACH_LINES: readonly string[] = [
  'Ask anybody where they were tonight and you get the whole evening, every hour of it, and who was with them. People like to be thorough about themselves.',
  'Somebody whose job keeps them in one place all night, the barman at the taps, the landlady on her stairs, can tell you everybody who came in, hour by hour, and when they say that was everybody, it was.',
  'A lie always runs into something true: a barman who never saw them come in, or somebody else who saw them somewhere else. When two stories don’t agree, put it to the one you doubt: read them what the other said.',
  'Not everybody who won’t explain themselves did it. Some people would rather be suspected than found out, and somebody else will have to say where they were.',
  'A name’s no good to me without the line that breaks it.',
];

/** docs/48 §3: the map line, on a night from the neighbourhood. */
export const WORLD_MAP_LINE = 'Same few blocks every night. You’ll get to know them.';

/** The teach page's lines for a night: the five, and the map line when it's cast from a world. */
export function teachLines(world?: string): readonly string[] {
  return world ? [...BOARD_TEACH_LINES, WORLD_MAP_LINE] : BOARD_TEACH_LINES;
}

/** The book's help, for the play CLI and the title page: how a board night plays. */
export const BOARD_RULES: readonly string[] = [
  'Every page ends in choices: who to talk to, what to search, where to go. Each says what it costs of the night. A star marks one worth taking now and says why, never what the answer will be; the harder the tier, the fewer the stars. The office is free.',
  'Asked "Where were you tonight?", anybody gives the whole evening, and who was with them. Asked "Who was here tonight?", whoever kept the door or the bar names everybody who came in, hour by hour, and says "nobody else" when that was everybody. They tell the truth, and so does anybody who was only there as company; what somebody tells you about their own evening may not be.',
  'When somebody’s story doesn’t agree with something you hold, "Put it to …" reads them the line that breaks it. They own up and name somebody who can check it, they refuse, they tell a second story, or they crack. A refusal proves nothing.',
  'The grid in the notebook sets everybody against every hour: what they say, what somebody else saw, and where the two don’t agree. Pencil in what you think; it is never a fact.',
  'File the report when you are ready, or at eight when the calls run out: who, what breaks their story, when, how and why; for a lost thing, where it is now and what puts it there instead of how. What breaks their story is one of the lines you hold, or a hunch. The right name on a hunch counts half.',
];
