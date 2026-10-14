/**
 * docs/49: the microplanner's shapes.
 *
 * A writer (`pages.ts`) hands the planner **items**: every fact a page carries,
 * with what the engine knows about it (new, confirms, collides, narrows; who
 * it's about; which place and hour), and every piece of texture, with the card
 * it came from. The planner decides how many sentences, in what order, with
 * what joins, and what each person is called, and hands back the **skeleton**:
 * a list of units, in order, which realization concatenates into the page.
 *
 * A fact unit is locked: its words carry a fact and nothing may change them
 * after the planner. A gap unit is texture, with its card text as the default;
 * the tiny model (docs/50) may one day replace a gap's text and nothing else.
 */

import type { Beat } from '../sheets.js';
import type { ProseVoice } from '../types.js';

/** What a fact does on its page. */
export type Relation = 'new' | 'confirms' | 'collides' | 'narrows';

/**
 * Where a gap sits. The spec's seven (why-here, walk, staging, ask, reaction,
 * close, hand-off), plus four this engine has: what a place is and who's in
 * it on the way in (`arrival`); a person's own voice line inside their answer
 * (`voice`); the detective's aside on a fact, with no fact in it (`gloss`);
 * and the turn's chapter heading (`chapter`, never replaced).
 */
export type GapSlot = 'why-here' | 'walk' | 'arrival' | 'staging' | 'ask' | 'reaction' | 'voice' | 'gloss' | 'close' | 'hand-off' | 'chapter';

/**
 * Facts that share a predicate, said together (aggregation). `key` is the
 * predicate; items with one key, side by side in one beat, may become one
 * sentence through the realizer registered for that predicate (`aggregate.ts`).
 */
export interface Agg {
  key: string;
  /** The parts the realizer needs, by predicate. */
  data: Record<string, unknown>;
  /** The board hour the fact is about, for "never across the crime hour and another". */
  hour?: number;
  /** A fact the player must notice on its own: never aggregated. */
  alone?: boolean;
}

/** One piece of a page as a writer hands it over. */
export interface Item {
  kind: 'fact' | 'gap';
  beat: Beat;
  voice: ProseVoice;
  text: string;
  slot?: GapSlot;
  relation?: Relation;
  /** People the fact is about; for a gap, whose pronouns the card's slots carry. */
  about?: string[];
  hour?: number;
  place?: string;
  /** The atomic facts a fact item carries: line ids, `givens:<kind>`, or keys of the engine's own. */
  carries?: string[];
  agg?: Agg;
  /**
   * Connective: the fact's core and the joins the logic allows. `core` is the
   * fact said plainly; `joins` are what the relation lets the planner add, in
   * order of preference. Without them the item's text stands as written.
   */
  core?: string[];
  joins?: Join[];
  /** The whole item is speech: never rewritten. */
  speech?: boolean;
  /** Names said here stay names (a hand-off names where it points). */
  keepNames?: boolean;
  /** A watcher's list, a person's own account, the notebook said aloud: they have to name people, and don't count. */
  exempt?: boolean;
  /** Somebody else talking (a watcher's list): a pronoun after it could be theirs. */
  barrier?: boolean;
  /** Runs on in the paragraph of the item before it in the beat, instead of starting a paragraph. */
  runOn?: boolean;
  /** The join the planner gave it, for the skeleton and the measure. */
  joined?: string;
  /** The writer's own bookkeeping: which rule or line said it. */
  tag?: string;
  /**
   * Texture only: other cards that fitted the same draw as well, for the rhythm. `take` makes the
   * trade with the hand (the card given back is free to be dealt again tonight).
   */
  /** `lastResort`: only for a name a third time (`referWithTrades`), never for the rhythm. */
  alts?: () => { text: string; take: () => void; lastResort?: boolean }[];
}

/** A join the logic allows, and what it does to the fact's sentences. */
export interface Join {
  /** `but`, `so`, `which`, `same`, `swear`, `two` (one of them was wrong), `gloss` (a sentence after). */
  kind: 'but' | 'so' | 'which' | 'same' | 'swear' | 'two' | 'left' | 'gloss';
  /** The sentences with the join in them, replacing `core`. */
  text: string[];
}

/** The skeleton: what the page is made of, in order. */
export type Unit =
  | {
      kind: 'fact';
      text: string;
      locked: true;
      about: string[];
      hour?: number;
      place?: string;
      relation: Relation;
      /** docs/49 §3, and this engine's: the beat, the paragraph, the voice, what it carries, the join the planner gave it. */
      beat: Beat;
      para: number;
      voice: ProseVoice;
      carries: string[];
      join?: string;
    }
  | {
      kind: 'gap';
      slot: GapSlot;
      /** The card default. */
      text: string;
      /** Indexes of the fact units either side. */
      before?: number;
      after?: number;
      beat: Beat;
      para: number;
      voice: ProseVoice;
    };
