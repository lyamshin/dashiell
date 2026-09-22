/**
 * Milestone 3 — the game's own data model.
 *
 * Everything here is pure data. `src/gen/` produces the truth; this describes
 * a run through it. Nothing in `src/game/` touches the DOM, and nothing in
 * `src/gen/` knows this file exists.
 */

import type { Difficulty, Entry, Id, Unknown } from '../gen/types.js';
import type { CastSheet } from './voice/cast.js';

export type { Difficulty, Entry, Id, Unknown };
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
  /**
   * M5 §3. The person themselves: layer 1 of their dossier, in their own
   * mouth. Always answerable, one action the first time and free after.
   */
  | { kind: 'self' }
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
  | 'record'
  /**
   * M6 §2. Why the detective came: one or two sentences, first on a page that
   * moved him, set apart in italics. Never cut, never joined, never re-worded
   * by a later pass, because the correspondence checker traces it verbatim.
   */
  | 'errand';

/**
 * A run of prose on a page. `clueId` marks the paragraph that carries a
 * clue, so the book can underline it and a test can check that every clue
 * found reached the page in some form. The clue's *flat* text is the
 * notebook's business now, not the page's (M4 §A.1).
 */
export type Block =
  | { kind: 'prose'; text: string; voice: ProseVoice; clueId?: Id }
  /**
   * Who is in the room. M4b §A.4 makes this one sentence — "Carbone and Mosley
   * at the far end, Doyle behind the bar" — written by the engine so that the
   * book and the transcript print the same words. `personIds` stays, because
   * the book makes every name in it clickable.
   */
  | { kind: 'presence'; personIds: Id[]; text?: string }
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
  /**
   * M5 §1. Sentences on this page that carry no image, and sentences that came
   * off a deck card that does. The ratio between them is the milestone's
   * number, and the assembler holds it above a floor of 0.5.
   */
  plain: number;
  image: number;
  /**
   * M4b §A.2. The motifs of the image-bearing blocks that survived the image
   * budget, in page order. The coherence number — the mean count of motifs two
   * adjacent image blocks share — is measured off this and nothing else.
   */
  imageMotifs: string[][];
  /**
   * M6 §2. What the errand line on this page was built from, so the
   * correspondence checker can trace it back to the notebook. Absent on a page
   * that did not move the detective.
   */
  errand?: ErrandTrace;
  /**
   * M6 §6. The choices this page offered, as the book showed them. The reducer
   * never sets it; the book does, so a page turned back to can show its
   * choices greyed. Pure data, and optional so a save from before M6 loads.
   */
  offered?: OfferedGroup[];
}

/** One choice as the book drew it, kept on the page it was offered under. */
export interface OfferedChoice {
  command: string;
  label: string;
  minutes: number;
  lead: boolean;
  done: boolean;
  note?: string;
}

export interface OfferedGroup {
  kind: 'ask' | 'search' | 'go' | 'free';
  heading: string;
  personId?: Id;
  choices: OfferedChoice[];
  more?: OfferedChoice[];
}

/**
 * M6 §2.1 — the errand line, as data. `because` and `for` are the deck tags
 * the card was dealt on; the ids are what the checker traces.
 */
export interface ErrandTrace {
  because: 'said' | 'document' | 'found' | 'none' | 'office' | 'return';
  for:
    | 'ask-person'
    | 'ask-thing'
    | 'ask-place'
    | 'ask-evening'
    | 'search-room'
    | 'search-thing'
    | 'none';
  /** `lead` for an open lead, `scene` for the client's pointer on first sight. */
  kind: 'lead' | 'scene' | 'none' | 'office' | 'return';
  /** The clue in the notebook that sent him: a found clue whose `leadsTo` includes `targetId`. */
  sourceId?: Id;
  /** The lead's target clue, not yet found. For `scene`, the first opening clue. */
  targetId?: Id;
  /** How many open leads pointed here. "And there was the other thing" at exactly two. */
  leads: number;
  /** For a no-lead return: whether the room had been gone through already. */
  searched?: boolean;
  /** The values the card's slots were filled with. */
  slots: Record<string, string>;
  /** Exactly the words on the page. */
  text: string;
}

/**
 * What the player files.
 *
 * M5 §5: the form asks exactly `case.act.unknowns`, which is three fields for
 * a body at the scene, four when the body was moved, and a different three for
 * an inside job. The five original keys stay because five of the nine unknowns
 * are exactly them; the four that are new are optional, and a field the case
 * does not ask is never read.
 */
export interface Report {
  /** `who`. */
  killerId: Id | null;
  /** `how`. */
  methodId: Id | null;
  /** `why`. */
  motiveType: string | null;
  /** `when`. */
  tick: number | null;
  /** `where`. */
  placeId: Id | null;
  /** `entry` — how they got in. */
  entry?: Entry | null;
  /** `whereabouts` — where the missing person is, or that they are gone. */
  whereabouts?: Id | 'gone' | null;
  /** `fate` — left, taken, or dead. */
  fate?: 'left' | 'taken' | 'dead' | null;
  /** `goods` — where what was taken went. */
  goodsPlaceId?: Id | null;
}

export const EMPTY_REPORT: Report = {
  killerId: null,
  methodId: null,
  motiveType: null,
  tick: null,
  placeId: null,
  entry: null,
  whereabouts: null,
  fate: null,
  goodsPlaceId: null,
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
  /** M5 §3: people who have been asked about themselves. Layer 1, once each. */
  selfTold: Id[];
  /** M5 §3: people a yapper has given up a layer-2 fact about, unasked. */
  gossip: Id[];
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
  /**
   * What the previous page's simile was about, so this one is about something
   * else. Four pages of "the room was ... as ..." is one page repeated.
   */
  lastSimile: string | null;

  /* --------------------------------------------------- M4b: coherence */

  /**
   * How many pages each person has been portrayed on. The second meeting
   * repeats the first meeting's detail once (§A.6's callback) and every one
   * after that varies.
   */
  appearances: Record<Id, number>;
  /**
   * The motifs the previous page's cards carried (§A.2). A motif may carry
   * across a page turn once; an echo of one that tonight is not about costs
   * a card three points.
   */
  previousMotifs: string[];

  /* ------------------------------------------------------ M4b: the office */

  /** The client is in the chair. He leaves after two questions, or when we do. */
  clientInOffice: boolean;
  /** How many of the two questions on the house have been spent. */
  clientAsks: number;
  /** Whether the scene has been arrived at, and its report handed over. */
  sceneSeen: boolean;

  /* ------------------------------------------------------- M6: repeats */

  /**
   * M6 §1.4. Every question put, as `personId|topicKey`, with the clues it
   * delivered. The second identical question costs nothing and reads the
   * notebook's record back instead of asking again.
   */
  asked: { key: string; clues: Id[] }[];
  /** Rooms already gone through. A second search of one is free and finds nothing. */
  searched: Id[];
}

export const SAVE_KEY = 'dashiell:run';
export const BURNED_KEY = 'dashiell:burned';

/** The eight hours between the body and the DA, in minutes. */
export const NIGHT_MINUTES = 480;
