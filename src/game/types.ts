/**
 * Milestone 3 — the game's own data model.
 *
 * Everything here is pure data. `src/gen/` produces the truth; this describes
 * a run through it. Nothing in `src/game/` touches the DOM, and nothing in
 * `src/gen/` knows this file exists.
 */

import type { Difficulty, Id } from '../gen/types.js';
import type { CastSheet } from './voice/cast.js';

export type { Difficulty, Id };
export type { CastSheet };

/** What the player can ask a person about. */
export type TopicRef =
  /** A person, by surname or given name. "the victim" resolves here too. */
  | { kind: 'person'; id: Id }
  | { kind: 'place'; id: Id }
  | { kind: 'object'; id: Id }
  | { kind: 'anchor'; id: Id }
  /** The person's own account of the night. Always answerable. */
  | { kind: 'evening' }
  /** Only the client has anything to say. */
  | { kind: 'hire' }
  /**
   * One exact topic string out of the generator, as printed on a thread.
   * Clicking a lead is precise; typing a surname is not.
   */
  | { kind: 'exact'; personId: Id; topic: string };

export type CommandKind = 'go' | 'ask' | 'examine' | 'look' | 'notebook' | 'file' | 'help';

export type Command =
  | { kind: 'go'; placeId: Id }
  | { kind: 'ask'; personId: Id; topic: TopicRef }
  /** `objectId` is set when the player named an object rather than the room. */
  | { kind: 'examine'; placeId: Id; objectId?: Id }
  | { kind: 'look' }
  | { kind: 'notebook' }
  | { kind: 'file' }
  | { kind: 'help' };

/**
 * What the parser hands back when it cannot make a command. Always free.
 *
 * `absent-person` and `unknown-topic` carry enough for the reducer to reach
 * for a nothing-answer in the book's voice instead of a parser message.
 */
export interface ParseProblem {
  kind:
    | 'empty'
    | 'unknown-verb'
    | 'ambiguous'
    | 'unknown-noun'
    | 'incomplete'
    | 'absent-person'
    | 'unknown-topic';
  message: string;
  /** For `ambiguous`: what the player might have meant, as typed commands. */
  options?: string[];
  /** For `absent-person` and `unknown-topic`. */
  personId?: Id;
  /** For `unknown-topic`: what they tried to ask about. */
  topicText?: string;
}

export type ParseResult = { ok: true; command: Command } | { ok: false; problem: ParseProblem };

/**
 * Which slot of the page grammar (M4 §A.5) a run of prose came out of. The
 * `record` voice is the one case where a clue's flat text is on the page: no
 * utterance in the deck fit it and its own sentence is written about the
 * speaker rather than by them. Everything else dramatizes.
 */
export type ProseVoice =
  | 'transition'
  | 'arrival'
  | 'place'
  | 'presence'
  | 'approach'
  | 'exchange'
  | 'find'
  | 'monologue'
  | 'ambient'
  | 'aside'
  | 'simile'
  | 'narrator'
  | 'nothing'
  | 'record';

/**
 * A run of prose on a page. `clueId` marks the paragraph that carries a
 * clue, so the book can underline it and a test can check that every clue
 * found reached the page in some form. The clue's *flat* text is the
 * notebook's business now, not the page's (M4 §A.1).
 */
export type Block =
  | { kind: 'prose'; text: string; voice: ProseVoice; clueId?: Id }
  | { kind: 'presence'; personIds: Id[] }
  /** A person's own claimed account of the evening. */
  | { kind: 'timeline'; personId: Id; rows: { tick: number; placeId: Id | null }[] }
  | { kind: 'help' }
  | { kind: 'note'; text: string };

export interface Page {
  /** Index in the log. */
  n: number;
  /** The running head's left side. */
  head: string;
  blocks: Block[];
  /** Actions this page cost. Zero for everything free. */
  cost: number;
  /** Deck card ids spent on this page. */
  cardsUsed: string[];
  /** Clue ids delivered by this page, in order. */
  found: Id[];
  /** Where the detective stands after this page. */
  at: Id;
  /**
   * Where the decks had nothing and the engine had to fall back. Logged, not
   * hidden: this is the list the content team works from.
   */
  gaps: string[];
}

export interface Report {
  killerId: Id | null;
  methodId: Id | null;
  motiveType: string | null;
  tick: number | null;
  placeId: Id | null;
}

export const EMPTY_REPORT: Report = {
  killerId: null,
  methodId: null,
  motiveType: null,
  tick: null,
  placeId: null,
};

/** One open lead: a clue the player has been pointed at but not yet taken. */
export interface Thread {
  /** The clue this lead would fetch. */
  clueId: Id;
  /** Where it is. Threads are grouped by this. */
  placeId: Id;
  /** That place's short name, so a lead can print its own `go`. */
  placeLabel: string;
  /** "Ask Doyle about Brauer", "Look around Kaplan's". */
  label: string;
  /** The command that takes it, as the player would type it. */
  command: string;
}

export interface RunState {
  seed: number;
  difficulty: Difficulty;
  detectiveName: string;
  at: Id;
  actionsUsed: number;
  found: Id[];
  threads: Thread[];
  burned: string[];
  log: Page[];
  filed?: Report;
  /** People the detective has been in a room with or heard named. */
  met: Id[];
  /** Persons whose claimed account of the evening has been taken down. */
  accounts: Id[];
  /** True once the report form is open. It never closes. */
  reportOpen: boolean;

  /* --------------------------------------------------- M4: the voice */

  /**
   * Dashiell's roll, the tempers and the portraits. Fixed at case start and
   * carried in the save so that the same man has the same split thumbnail
   * after a reload.
   */
  cast: CastSheet;
  /** People whose one free question — they know him — has been spent. */
  freeAsked: Id[];
  /**
   * How many actions were waived by the free-first-ask rule. The clock never
   * sees these; par accounting does, because par counts a question as an
   * action whether or not the doorman waived his.
   */
  waived: number;
  /** Clue ids a yapper volunteered. At most one a run. */
  volunteered: Id[];
  /** Hour bands that have already spent their one aside. */
  asideBands: string[];
  /** People described in full already; a second look gets one component. */
  portrayed: Id[];
  /** The suspect the monologue is currently accusing. Often wrong. */
  theory: Id | null;
}

export const SAVE_KEY = 'dashiell:run';
export const BURNED_KEY = 'dashiell:burned';

/** The eight hours between the body and the DA, in minutes. */
export const NIGHT_MINUTES = 480;
