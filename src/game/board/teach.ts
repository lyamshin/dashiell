/**
 * docs/43 §7: the teach-once page, rewritten for the small board. Four lines
 * in the detective's voice:
 *
 * - everyone gives you their whole evening;
 * - a watcher lists everyone;
 * - every lie collides with something true;
 * - not everyone who refuses is guilty.
 */

export const BOARD_TEACH_TITLE = 'Before the office';

export const BOARD_TEACH_LINES: readonly string[] = [
  'Ask anybody where they were tonight and you get the whole evening, every hour of it, and who was with them. People like to be thorough about themselves.',
  'Somebody whose job keeps them in one place all night, the barman at the taps, the landlady on her stairs, can tell you everybody who came in, hour by hour, and when nobody else did.',
  'A lie always runs into something true: a list that hasn’t got them on it, or somebody else’s evening that has them somewhere else. When two stories collide, put the one to the other.',
  'Not everybody who won’t explain themselves did it. Some people would rather be suspected than found out, and somebody else will have to say where they were.',
];

/** The book's help, for the play CLI and the title page: how a board night plays. */
export const BOARD_RULES: readonly string[] = [
  'Every page ends in choices: who to talk to, what to search, where to go. Each says what it costs of the night; a star marks one worth taking now, and says why. The office is free.',
  'Asked "Where were you tonight?", anybody gives the whole evening, with company. Asked "Who was here tonight?", a watcher lists everybody, hour by hour, and says "nobody else" when that is so. Lists and the people who were only company tell the truth; a person’s own story may not.',
  'When somebody’s story collides with something you hold, "Put it to …" reads them the line that breaks it. They own up and name somebody who can check it, they refuse, they tell a second story, or they crack. A refusal proves nothing.',
  'The grid in the notebook is the board: everybody against every hour, what they say, what somebody else saw, and where the two collide. Pencil in what you think; it is never a fact.',
  'File the report when you are ready, or at eight when the calls run out: who, when, how and why, or for a lost thing who, when, where it is now and why.',
];
