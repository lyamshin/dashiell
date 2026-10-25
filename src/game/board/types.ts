/**
 * The shapes a board night hands the book and the CLIs: a page, its blocks,
 * the choices under it, and the pencil on the grid. Plain data, saved and
 * replayed as it is.
 */

import type { Unit } from './plan/types.js';

/** The night's sky, rolled with the deal. The book's weather layer draws it. */
export type Weather = 'clear' | 'rain' | 'fog' | 'cold';

/** Which kind of line a run of prose is. The book sets each voice its own way. */
export type ProseVoice =
  | 'narrator'
  | 'establish'
  | 'presence'
  | 'exchange'
  | 'thought'
  | 'find'
  | 'answer'
  | 'act'
  /** The notebook said aloud. */
  | 'recap'
  /** A chapter heading: the turn. */
  | 'chapter';

export type Block = { kind: 'prose'; text: string; voice: ProseVoice } | { kind: 'note'; text: string };

/** What a page was for (docs/43 §2). */
export type PageJob = 'office' | 'arrive' | 'account' | 'list' | 'search' | 'motive' | 'confront' | 'recap' | 'repeat' | 'nothing';

export interface Page {
  /** Index in the log. */
  n: number;
  /** The running head's left side. */
  head: string;
  blocks: Block[];
  /** Calls this page cost. Zero for everything free. */
  cost: number;
  /** Card ids, and noted lines, dealt on this page. */
  cardsUsed: string[];
  /** Where the detective stands after this page. */
  at: string;
  /**
   * What the page was for, the question it answered, and the lines it told,
   * so the correspondence check can hold every hour and name on it to what
   * the player held.
   */
  board: {
    job: PageJob;
    q?: string;
    /** Line ids (`claim:p@h`, `list:w@h`, …) the page tells. */
    told: string[];
    /** The board hours the page may name. */
    hours: number[];
    /** People and places the page may name, besides those present. */
    people: string[];
    places: string[];
    /** The turn (the first lie caught) fell on this page. */
    turn?: boolean;
    /** The page paid off something set up earlier tonight (M13's callback). */
    callback?: boolean;
    /** docs/44: the sheet the page was laid out on, and the beats it filled, in order. */
    sheet?: string;
    beats?: string[];
    /** docs/44: the page's thought, and the held lines (or questions) it ties the new fact to. */
    thought?: { text: string; refs: string[] };
    /** docs/44: cards dealt again tonight because nothing fresh fitted. */
    repeats?: number;
    /** docs/44: the hand-off's words, so the next page needn't give the reason again. */
    handoff?: string;
    /** docs/59 item 1: the step the hand-off pointed at, so the page after doesn't point at it again. */
    handoffTo?: string;
    /** Round 7, docs/67: the pointer the way in said as what drew me (its source), so the ask doesn't say it to their face again. */
    drew?: string;
    /** docs/44: the recap's clauses (the notebook said aloud), which may name people more than twice. */
    recap?: string;
    /** docs/47 C13: the page's reason was said on the page before, so it isn't said again here. */
    carried?: boolean;
    /** docs/48 §4: on a night from the neighbourhood, what the arrival and the staging said, for the bible's share. */
    said?: { arrival: string; staging: string };
    /** docs/49 §3: the skeleton the page was realized from: fact units, locked, and gap units with their card defaults. */
    units?: Unit[];
  };
}

export interface OfferedChoice {
  command: string;
  label: string;
  minutes: number;
  /** Starred: worth taking now. */
  lead: boolean;
  done: boolean;
  note?: string;
  /**
   * Every call is one call, but the clock keeps to five-minute marks and
   * still lands on eight, so now and then a call moves it five minutes less
   * or more than the night's usual. Such a label says so: "20 min (rounded)".
   */
  rounded?: true;
  /** docs/40 §2: why this choice carries the star, in the detective's voice. */
  why?: string;
}

export interface OfferedGroup {
  kind: 'ask' | 'search' | 'go' | 'free';
  heading: string;
  personId?: string;
  choices: OfferedChoice[];
  more?: OfferedChoice[];
}

/** The player's pencil in one cell of the grid. Never a fact. */
export interface CellMark {
  at?: string;
  notAt?: string[];
}
