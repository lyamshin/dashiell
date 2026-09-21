/**
 * Milestone 3 — the game's own data model.
 *
 * Everything here is pure data. `src/gen/` produces the truth; this describes
 * a run through it. Nothing in `src/game/` touches the DOM, and nothing in
 * `src/gen/` knows this file exists.
 */

import type { Difficulty, Id } from '../gen/types.js';

export type { Difficulty, Id };

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

/** A run of prose on a page. `voice` is which deck or hand wrote it. */
export type Block =
  | { kind: 'prose'; text: string; voice: 'place' | 'witness' | 'simile' | 'narrator' | 'nothing' }
  /** The factual core. `text` is the generator's, verbatim, always. */
  | { kind: 'clue'; clueId: Id; text: string }
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
}

export const SAVE_KEY = 'humphrey:run';
export const BURNED_KEY = 'humphrey:burned';

/** The eight hours between the body and the DA, in minutes. */
export const NIGHT_MINUTES = 480;
