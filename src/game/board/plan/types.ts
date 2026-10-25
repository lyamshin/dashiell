/**
 * docs/49: the microplanner's shapes.
 *
 * A writer (`pages.ts`) hands the planner **items**: every fact a page carries,
 * with what the engine knows about it (new, confirms, collides, narrows; who
 * it's about; which place and hour) and, since docs/52, its propositions
 * (`props`), and every piece of texture, with the card it came from. The planner decides how many sentences, in what order, with
 * what joins, and what each person is called, and hands back the **skeleton**:
 * a list of units, in order, which realization concatenates into the page.
 *
 * A fact unit is locked: its words carry a fact and nothing may change them
 * after the planner. A gap unit is texture, with its card text as the default;
 * the tiny model (docs/50) may one day replace a gap's text and nothing else.
 */

import type { Beat } from '../sheets.js';
import type { ProseVoice } from '../types.js';
import type { Composite, Prop, Shape } from '../bones/types.js';
import type { Args } from '../bones/voice.js';
import type { TexRole } from './texture.js';

/** docs/49 §2: what the page has spent of its joins: one "so" chain, one "but", and Planner 2's semicolons. */
export interface PageBudget {
  but: number;
  so: number;
  joins: number;
  /** docs/49, Planner 2: semicolons the planner has put between two facts on the page. */
  semi?: number;
}

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
  /** The whole item is speech: never rewritten. */
  speech?: boolean;
  /** Names said here stay names (a hand-off names where it points). */
  keepNames?: boolean;
  /** A watcher's list, a person's own account, the notebook said aloud: they have to name people, and don't count. */
  exempt?: boolean;
  /**
   * docs/59: exempt, but its names count toward the page's cap all the same (the office's finding is
   * left as written, and the reader has read the names in it: the line after says "the dead man").
   */
  counted?: boolean;
  /** Somebody else talking (a watcher's list): a pronoun after it could be theirs. */
  barrier?: boolean;
  /** Runs on in the paragraph of the item before it in the beat, instead of starting a paragraph. */
  runOn?: boolean;
  /** The join the planner gave it, for the skeleton and the measure. */
  joined?: string;
  /** docs/49, Planner 2: how many of the writer's facts it says, when the planner joined several (1 when unset). */
  n?: number;
  /** docs/49, Planner 2: facts the planner joined into one sentence on purpose: the rhythm never parts it again. */
  composed?: boolean;
  /** The writer's own bookkeeping: which rule or line said it. */
  tag?: string;
  /**
   * Texture only: other cards that fitted the same draw as well, for the rhythm. `take` makes the
   * trade with the hand (the card given back is free to be dealt again tonight).
   */
  /** `lastResort`: only for a name a third time (`referWithTrades`), never for the rhythm. */
  alts?: () => { text: string; take: () => void; lastResort?: boolean }[];
  /**
   * docs/51: texture the situated deck may fill. Present only on a card the writer dealt from a
   * family as it was dealt (or a hand-written aside): `lead` is what stays before the card (a
   * why-here's reason), `tail` what stays after it (a first look put on the staging), `joke` whether
   * the card dealt was the page's joke. The planner adds `key`, the gap's situation, and `card`, the
   * situated card that filled it.
   */
  sit?: { lead?: string; tail?: string; joke?: boolean; key?: string; card?: string; who?: string };
  /** docs/52: a fact's bones, the propositions it says, from the engine's own knowledge (`bones/extract.ts`). */
  props?: Prop[];
  /**
   * docs/52: what the writer drew or knew for the planner's voicing of it: a collision's closing
   * line, a placement's "and Ellery would swear to it", whether the sentence before named them.
   */
  flesh?: Record<string, unknown>;
  /** docs/52: an opening "So" or "But" the writer's own words carry, said only when the page's join is free. */
  opener?: 'So' | 'But';
  /** docs/52: the composite the planner made of it, and how it was said. */
  comp?: Composite;
  /**
   * docs/52 build 2: the composite as the writer hands it over to be voiced: its shape, the flags
   * that pick its voicings, its arguments (typed where the round trip reads them back by type), and
   * the speaker's manner. The planner says it in a voicing (`bones/say.ts`); `text` is the plain
   * fallback where none fits.
   */
  say?: SaySpec;
  /** docs/52 build 2: words said in the same breath after the voicing (inside its closing quotation mark): the office's pointer's reason. */
  sayAfter?: string;
  /** docs/60 item 1: what the texture is for, for the budget (`texture.ts`); unset, its slot says. */
  tex?: TexRole;
  /** docs/60 item 1: the card was dealt as the page's joke. */
  jk?: boolean;
  /** docs/60 item 1: what the budget undoes when it takes this off the page (a set-up's pay-offs). */
  onDrop?: () => void;
  /**
   * docs/69: a list's reason, where the arrival in this room gave one already: only the cap's last
   * resort may take it off (`droppable`), where a name would be said a third time, and the page then
   * carries it.
   */
  reasonGiven?: boolean;
  /** docs/60 item 1: what the budget undoes when it trims this to its first sentence. */
  onTrim?: () => void;
  /** docs/62 §6 of docs/60: an aside that says what the fact before it did ("That much held."): it goes with that fact. */
  hangs?: boolean;
}

/** docs/52 build 2: a composite to be voiced. */
export interface SaySpec {
  shape: Shape;
  flags: string[];
  args: Args;
  manner?: string;
  /** Where no voicing fits, keep the writer's own words (the case's description of a find), not the plain page's. */
  keep?: boolean;
  /**
   * docs/59 item 2: a composite said as a run of clauses (a list told by what changed, a stretch of
   * company): each part voiced on its own, the parts joined by `sep`. A part's `props` are what that
   * clause says; the item's own props are what they add up to (`bones/reread.ts` merges them back).
   */
  parts?: SaySpec[];
  sep?: string;
  /** docs/59: a part's propositions: what the clause says of the whole. */
  props?: Prop[];
  /** docs/59: a part in the speaker's own words (the bible's last "that's the lot"), not a voicing. */
  own?: string;
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
      /** docs/49, Planner 2: how many of the writer's facts the unit says, when the planner joined several. */
      facts?: number;
      /** docs/52: the bones, as composites: the propositions the unit says, how they were joined, and the voicing. */
      bones?: Composite[];
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
      /** docs/51: the situation of a gap the situated deck may fill, and the card that filled it. */
      key?: string;
      card?: string;
      /** docs/51: whom the card's tokens mean ({they}, {role}). */
      who?: string;
      /** docs/51: what stays either side of the card (a why-here's reason, a first look). */
      lead?: string;
      tail?: string;
    };
