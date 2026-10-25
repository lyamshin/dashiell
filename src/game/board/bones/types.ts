/**
 * docs/52 §1–§2: the bones. Every fact unit a page says is one or more
 * **propositions**, typed and made of the engine's own ids (people, places,
 * board hours), never of words. The planner joins them into **composites**, a
 * closed set of shapes, before any word is chosen; a composite is then said
 * plainly (`plain.ts`) or in the voice (`voice.ts`, `content/board/voicings.json`).
 *
 * The set is docs/52's table as the engine actually emits it, with the kinds
 * the table missed (docs/52, Built): `SHIFT`, `PLACED`, `PRESENT`, `UNSPOKEN`,
 * `LEFT`, `HOLD`, `MISSING`, and the office's `RELATION`, `FOUND`, `GONE` and
 * `MEANS`.
 */

export type Id = string;

/**
 * Whose word a line is: a watcher's list, a person's own account, an admission, the office (the
 * client), a remark, a second story, a search. `who` is the watcher, the speaker, the one who owned up.
 */
export interface Src {
  k: 'list' | 'claim' | 'admit' | 'given' | 'remark' | 'second' | 'find';
  who?: Id;
}

/** A list entry: a person's id, `other:<id>` (somebody who isn't a row of the board), or `look:<look>` (a face). */
export type Entry = string;

/** What a put that didn't land ran into (`judgeLine`'s reasons). */
export type HeldWhy = 'agreed' | 'strangers' | 'elsewhere' | 'face' | 'company' | 'other-place' | 'untrusted' | 'nowhere' | 'untouched';

export type Prop =
  /** Somebody's own word for an hour: where (when said), and with whom (when said). Absent: not said. */
  | { k: 'CLAIM'; person: Id; place?: Id; hour: number; company?: Id[] }
  /**
   * A watcher's hour: who was there, and (when said) whether that was everybody; or the place was
   * shut. `faces`: the people the player can put to its looks, by look ("the camel coat was Abramowitz’s").
   */
  | { k: 'LIST'; watcher: Id; place: Id; hour: number; people: Entry[]; whole?: boolean; shut?: boolean; faces?: Record<string, Id> }
  /**
   * A remark: the speaker passed somebody on a street (on the way `via` somewhere), had somebody
   * (the pet) at a place, or saw the means where it was kept (`saw: 'means'`).
   */
  | { k: 'REMARK'; speaker: Id; saw: Id; how: 'passed' | 'had' | 'there'; where: string; hour: number; via?: Id }
  /** A watcher who came on at an hour: before it, the list says nothing. */
  | { k: 'SHIFT'; watcher: Id; from: number }
  /** A search: what was searched. What it shows is its own propositions (MEANS, MOTIVE). */
  | { k: 'FIND'; find: Id; place: Id }
  /** Whether somebody had the way to the means (the key, the window, the chloral), and when they had it. */
  | { k: 'ACCESS'; person: Id; had: boolean; hour?: number }
  /** The hours the crime could have happened in. */
  | { k: 'WINDOW'; hours: number[] }
  /** The victim (or the pet) seen somewhere at an hour inside the window: the last sighting. */
  | { k: 'ALIVE'; victim: Id; place: Id; hour: number }
  /** Somebody's claim for an hour, and the line that says the same. `company`: who was with them, as said. */
  | { k: 'CONFIRMS'; person: Id; place: Id; hour: number; company?: Id[]; by: Src }
  /** Somebody's claim for an hour, and the line it can't live with: the line in full, or whose it was. */
  | { k: 'COLLIDES'; person: Id; place: Id; hour: number; second?: boolean; with: Prop | Src }
  /** The window narrowed to one hour (said at Raw only, docs/46). */
  | { k: 'NARROWS'; hour: number }
  /** Raw's elimination: who's left, or one person with the way in and no true account for the hour. */
  | { k: 'LEFT'; people?: Id[]; hours: number[]; seen?: boolean }
  /** An admission: where they really were (at the hour, when said), with whom, instead of where they said. */
  | { k: 'ADMIT'; person: Id; place: Id; hour?: number; witness?: Id; claimed?: Id }
  /** A refusal to say where they were instead (at the hour, when said). */
  | { k: 'REFUSE'; person: Id; hour?: number }
  /** A second story: another place for the hour (when said). */
  | { k: 'SECOND'; person: Id; place: Id; hour?: number }
  /** A small case's culprit owning up: the thing is with somebody (`other:<id>`), somewhere. */
  | { k: 'CRACK'; person: Id; to: Entry; place: Id }
  /** A put that didn’t land (the reaction), and why (the thought): `by` and `place` are the line put. */
  | { k: 'HELD'; person: Id; hour: number; why?: HeldWhy; by?: Id; place?: Id }
  /** Somebody's reason. `person: '*'` is everybody in the papers. `said`: where it was said besides (the office, or not). */
  | { k: 'MOTIVE'; person: Id; said?: 'office' | 'not-office' }
  /**
   * Something that sends you somewhere: the office points at a person or a place (its pointer, the
   * pet's keeper, where the dead man had been); a remark on the scene's street points at the scene;
   * a second story points at whoever keeps the room it names.
   */
  | { k: 'POINTER'; from: 'office' | 'remark' | 'second' | 'admit'; to: Id; why: 'pointer' | 'keeper' | 'venue' | 'street' | 'watcher' | 'witness' }
  /**
   * The thing's last move: to somebody (`other:<id>`), at a place (and an hour, when the watcher saw
   * it go). `thing`: what it was, once known; `what`: what the watcher saw of it (something alive, something small).
   */
  | { k: 'HANDOVER'; to: Entry; place: Id; hour?: number; thing?: Id; what?: 'alive' | 'small' }
  /** Somebody placed at an hour on somebody else's word. */
  | { k: 'PLACED'; person: Id; place: Id; hour: number; by: Src }
  /**
   * docs/59 item 3: somebody not at a place at an hour, on the word of whoever kept it (a whole list
   * that hasn't them on it): who had gone by the hour it happened.
   */
  | { k: 'AWAY'; person: Id; place: Id; hour: number; by: Src }
  /** docs/59 item 3: nobody but they themselves had said where somebody was at these hours. */
  | { k: 'UNBACKED'; person: Id; hours: number[] }
  /** Somebody turned out to be in the room. */
  | { k: 'PRESENT'; person: Id; place: Id }
  /** Nobody, them included, had said where these people were at these hours. */
  | { k: 'UNSPOKEN'; people: Id[]; hours: number[] }
  /** The notebook at fact level: whose evenings and lists I had. */
  | { k: 'HOLD'; evenings: Id[]; lists: Id[] }
  /** The notebook at fact level: whose evenings I didn't have. */
  | { k: 'MISSING'; people: Id[] }
  /** The office: who the client is to the dead. */
  | { k: 'RELATION'; client: Id; victim: Id }
  /** The office: the dead found, where, by whom. */
  | { k: 'FOUND'; victim: Id; place: Id; finder?: Id }
  /** The office: the thing (or the pet) gone from where it was kept. */
  | { k: 'GONE'; thing: Id; place: Id }
  /**
   * The way in: where the means was had (a murder's origin; the room told about the key; the party;
   * the spare key), and the hours; `who`, the lodger whose key it was, or who keeps the spare.
   * docs/59 item 3: `first`, the conclusion a find draws from it: whoever did it had been at that place
   * first (at those hours, when said). Round 7, B6: `before`, a windowed murder's: the hour it had to be
   * had by, the earliest it could have happened.
   */
  | { k: 'MEANS'; how: 'origin' | 'told' | 'party' | 'spare' | 'first'; place: Id; hours?: number[]; who?: Id; before?: number };

export type PropKind = Prop['k'];
export const PROP_KINDS: readonly PropKind[] = [
  'CLAIM', 'LIST', 'REMARK', 'SHIFT', 'FIND', 'ACCESS', 'WINDOW', 'ALIVE', 'CONFIRMS', 'COLLIDES', 'NARROWS', 'LEFT', 'ADMIT', 'REFUSE', 'SECOND', 'CRACK', 'HELD', 'MOTIVE', 'POINTER', 'HANDOVER', 'PLACED', 'AWAY', 'UNBACKED', 'PRESENT', 'UNSPOKEN', 'HOLD', 'MISSING', 'RELATION', 'FOUND', 'GONE', 'MEANS',
];

/**
 * docs/52 §2: the composite shapes, a closed set. The planner's composition makes these and
 * nothing else; each has a plain rendering and, where the planner phrases it, voicings.
 */
export const SHAPES = [
  /** A claim confirmed by a list, plus the others that list places at that hour. */
  'CONFIRMED-WITH',
  /** Claims one line confirms (an evening that held, a list that says the same). */
  'CONFIRMED',
  /** A watcher's hour with its people and "nobody else". */
  'LIST-HOUR',
  /** The people nobody has placed at the hour. */
  'UNSPOKEN',
  /** Who had the means, with the exception last. */
  'ACCESS-SET',
  /** The window, plus the last sighting (plus NARROWS at Raw). */
  'WINDOW-ALIVE',
  /** The claim and the line that breaks it. */
  'COLLISION-PAIR',
  /** The admission and what it hangs on. */
  'ADMIT-CHECK',
  /** One person's places across hours, in their own word. */
  'CLAIM-SPAN',
  /** The papers' reasons, and anybody's reason. */
  'MOTIVE-SET',
  /** The thing's last move. */
  'HANDOVER',
  /** People placed on one person's word. */
  'PLACED-SET',
  /** The hours that mattered, on somebody's word alone. */
  'OWN-WORD',
  /** A remark that puts somebody on the scene's street, and what that street is. */
  'STREET',
  /** The window and the way in, said together (the scene, the means' origin). */
  'WINDOW-MEANS',
  /** Raw's elimination, walked to its last step. */
  'LEFT',
  /** What was searched, and what it gave. */
  'FIND',
  /** What somebody said when it was put to them. */
  'REACTION',
  /** A line of the office. */
  'OFFICE',
  /** A remark: somebody passed, somebody had, something seen where it was kept, a watcher's hours. */
  'REMARK',
  /** Somebody turned out to be in the room. */
  'PRESENT',
  /** The notebook at fact level: what's held and what isn't. */
  'HOLD',
  /** Two composites in one sentence: ", and", "; " or ", but". */
  'PAIR',
  /** A composite said of somebody another composite names ("…, who hadn’t been…"). */
  'ATTACH',
] as const;
export type Shape = (typeof SHAPES)[number];

/** docs/52 §2: a composite. A leaf holds propositions; `PAIR` and `ATTACH` hold two composites. */
export interface Composite {
  shape: Shape;
  /** The propositions, in the order the plain page says them. For PAIR and ATTACH, the parts'. */
  props: Prop[];
  /** PAIR and ATTACH: the two composites. */
  parts?: Composite[];
  /** PAIR: the join ("and", "semi", "but", "colon"); ATTACH: "who" or "and-he". A leaf: the connective it took ("so", "but", "which", "same", "too", "held", "count", "self", "two"). */
  join?: string;
  /** How it was said: a voicing's id from `voicings.json`, or `flesh` (the writer's own card or speech). */
  voicing?: string;
}

/** What a fact unit carries in the skeleton (docs/52): its composites, the bones and the voicing they were said in. */
export type Bones = Composite[];
