/**
 * docs/44: page sheets for the board. M13's sheets (docs/32), on the small
 * board: a sheet is the order a page's beats come in, and which of them share
 * a paragraph. The beats are the golden's (docs/golden/board-connective.md):
 *
 * | beat | what it does |
 * |---|---|
 * | why | which earlier line sent me, by name (the star's own reason) |
 * | walk | the street between, on a page that changes place |
 * | arrival | what the place is, who's there, what they're doing |
 * | staging | where I sit, how I open |
 * | ask | the question in Dashiell's own words |
 * | reaction | how they take it before they answer (by manner, never a tell) |
 * | job | the account, list, find or confrontation |
 * | thought | what it means, tied back to something held, by name (the engine's) |
 * | close | the page's one joke, or a callback |
 * | handoff | what this makes me want next; it agrees with the starred choice |
 *
 * A writer fills the beats it has; the sheet lays them out. A beat with
 * nothing in it is skipped, so a sheet is the most a page can be.
 */

export type Beat = 'why' | 'walk' | 'arrival' | 'staging' | 'ask' | 'reaction' | 'job' | 'thought' | 'close' | 'handoff';

export type SheetJob = 'office' | 'arrival' | 'account' | 'check' | 'list' | 'search' | 'put' | 'motive' | 'turn' | 'report' | 'repeat' | 'recap' | 'return';

export interface Sheet {
  id: string;
  job: SheetJob;
  /** Paragraphs in order; the beats in one paragraph run together. */
  paras: Beat[][];
}

export const SHEETS: Sheet[] = [
  // The office (golden page 1): arrival, the ask, the givens, the client's reaction, the close.
  { id: 'office', job: 'office', paras: [['arrival'], ['job'], ['close']] },

  // Arriving (golden pages 2, 4, 8, 12).
  { id: 'arrival-walk-first', job: 'arrival', paras: [['walk'], ['arrival'], ['why'], ['thought'], ['close']] },
  { id: 'arrival-why-first', job: 'arrival', paras: [['why', 'walk'], ['arrival'], ['thought'], ['close']] },
  { id: 'arrival-room', job: 'arrival', paras: [['walk'], ['arrival'], ['why', 'thought'], ['close']] },

  // "Where were you tonight?" (golden pages 6, 7, 9).
  { id: 'account-why', job: 'account', paras: [['why', 'staging'], ['ask'], ['reaction'], ['job'], ['thought'], ['handoff'], ['close']] },
  { id: 'account-sit', job: 'account', paras: [['why'], ['staging', 'ask'], ['reaction'], ['job'], ['thought'], ['handoff'], ['close']] },
  { id: 'account-face', job: 'account', paras: [['why', 'staging'], ['ask', 'reaction'], ['job'], ['thought'], ['handoff'], ['close']] },

  // The admission checked (golden page 11): the one witness who can say whether it was so.
  { id: 'check', job: 'check', paras: [['why', 'staging'], ['ask'], ['reaction'], ['job'], ['thought'], ['handoff'], ['close']] },

  // "Who was here tonight?" (golden page 5).
  { id: 'list-why', job: 'list', paras: [['why'], ['staging', 'ask'], ['reaction'], ['job'], ['thought'], ['handoff'], ['close']] },
  { id: 'list-sit', job: 'list', paras: [['why', 'staging'], ['ask', 'reaction'], ['job'], ['thought'], ['handoff'], ['close']] },

  // A search (golden page 3).
  { id: 'search', job: 'search', paras: [['why', 'staging'], ['reaction'], ['job'], ['thought'], ['handoff'], ['close']] },

  // Put it to them (golden page 10).
  { id: 'put', job: 'put', paras: [['why', 'staging'], ['ask'], ['reaction', 'job'], ['thought'], ['handoff'], ['close']] },

  // The victim or the thing.
  { id: 'motive', job: 'motive', paras: [['why', 'staging'], ['ask'], ['job'], ['thought'], ['close']] },

  // The turn (golden page 7): the chapter, the recap, and what next.
  { id: 'turn', job: 'turn', paras: [['staging'], ['job'], ['handoff'], ['close']] },

  // The report (golden page 14).
  { id: 'report', job: 'report', paras: [['staging', 'why'], ['close']] },

  // A question asked already, read back; going over what I have; back to the office.
  { id: 'repeat', job: 'repeat', paras: [['why'], ['job']] },
  { id: 'recap', job: 'recap', paras: [['why'], ['job'], ['handoff']] },
  { id: 'return', job: 'return', paras: [['walk'], ['arrival'], ['why']] },
];

export function sheetsFor(job: SheetJob): Sheet[] {
  return SHEETS.filter((s) => s.job === job);
}
