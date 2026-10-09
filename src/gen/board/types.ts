/**
 * docs/41-small-board.md, built as docs/42 §1: the small board.
 *
 * A case is a board of suspects × whole hours, each cell one place, and the
 * few things the player can ask for: a whole account, a whole watcher's list,
 * one search, or one confrontation. Everything the solver knows comes from
 * those, and nothing else.
 */

export type Hour = number;
export type PersonId = string;
export type PlaceId = string;

export type TierIndex = 0 | 1 | 2 | 3 | 4 | 5;
export const TIER_NAMES = ['Raw', 'Coddled', 'Poached', 'Soft-boiled', 'Medium', 'Hard-boiled'] as const;
export type TierName = (typeof TIER_NAMES)[number];

export type CaseType = 'murder' | 'lost-item' | 'lost-pet';
export const CASE_TYPES: CaseType[] = ['murder', 'lost-item', 'lost-pet'];

/** Rule 2: where people are at night. `transit` exists only so the invariant can refuse it. */
export type PlaceKind = 'home' | 'bar' | 'restaurant' | 'theatre' | 'club' | 'work' | 'transit';

/**
 * - suspect: a row of the board;
 * - victim: the dead man, or the lost thing (a watch, a dog), whose row the clock reads;
 * - client: talks in the office, for free, and is never a suggestion;
 * - watcher: kept in one place all night by a job, and lists who was there;
 * - company: not a suspect, but in someone's company; tells the truth.
 */
export type Role = 'suspect' | 'victim' | 'client' | 'watcher' | 'company';

export interface Person {
  id: PersonId;
  name: string;
  /** What the prose calls them after the first mention: "Marchetti", "the dentist". */
  short: string;
  role: Role;
  /** One line: "a switchboard operator; lodges at Rafferty's". */
  description: string;
  /** Hard-boiled faces: what a watcher who doesn't know the name would say ("in a camel coat"). */
  look?: string;
  /** Where the detective finds them after midnight, for costing walks. */
  foundAt: PlaceId;
  /** Why they might have done it. Several people have one; it never settles who. */
  motive?: string;
  /** 4b: which pool entry the motive came from (`m3`, `s7`), so the book can voice it. */
  motiveId?: string;
  /** 4b: the job alone, as the description begins: "a switchboard operator". */
  job?: string;
  /** What an innocent liar is hiding. */
  secret?: string;
  /** The lost thing is a thing, not a person: no account, no list entry. */
  object?: boolean;
  /** For pronouns in the reading ("Feeney says he was…"). */
  female?: boolean;
  /** Where they live, when it's a place in the case (a lodger's rooming house, the culprit's flat). */
  home?: PlaceId;
  /** Where they work, when it's a place in the case; they're plausibly there in its open hours. */
  works?: PlaceId;
}

/**
 * Somebody the case puts at a place who isn't a row of the board (4a.2): the fence the lost
 * thing went to, the client telling the room, an innocent liar's companion. A watcher lists them
 * like anyone else; one they can't name is listed as such ("and a man I didn't know").
 */
export interface Other {
  id: string;
  /** What the watcher calls them: "Pardo, who buys things", "a man I didn't know". */
  name: string;
  /** The hours they were there, and where. */
  at: Record<Hour, PlaceId>;
  /** False when the watcher can't name them. Then the list isn't exhaustive at that hour. */
  known: boolean;
}

/** 4a.2: the three things a case's setup varies, by id, for the sweep's variety count. */
export interface Setup {
  /** How it went missing, or how the victim was reached: the means and its access. */
  means: string;
  /** What fixes the hour. */
  clock: string;
  /** Why the client points where they do. */
  pointer: string;
}

/** Something the office names, which points the player at a place or a person (4a.2). */
export interface GivenPoint {
  kind: 'place' | 'person';
  ref: string;
  /** The plain reason: "Lanza told the room at the Shamrock about the key". */
  text: string;
}

export interface Place {
  id: PlaceId;
  name: string;
  short: string;
  kind: PlaceKind;
  /** Open from `open[0]` through `open[1]`, whole board hours, inclusive. Homes are always open. */
  open: [Hour, Hour];
  scene?: boolean;
  /** The street it's on, for side remarks ("I passed her on Grand Street"). */
  street: string;
  /** 4b: which pool entry it came from (`venue:3`, `rooming:1`, `flat`), so the book can describe it. */
  key?: string;
  /** docs/44: a theatre with a stage, not a screen: plays and shows, never pictures. */
  stage?: boolean;
  /**
   * A company-only witness's own rooms, where nobody else goes: somewhere for them to be before
   * and after the hour they matter. Not one of rule 1's places.
   */
  offBoard?: boolean;
}

/** The truth: every board person's place at every hour, and why they moved. */
export interface Board {
  hours: Hour[];
  rows: Record<PersonId, Record<Hour, PlaceId>>;
  /** The reason for arriving where they are at `hour`, when it's a move. */
  reasons: Record<PersonId, Record<Hour, string>>;
}

export type Fact =
  | { k: 'at'; p: PersonId; h: Hour; place: PlaceId }
  | { k: 'notAt'; p: PersonId; h: Hour; place: PlaceId };

/** What a search, a remark or a confrontation hands the report, besides board facts. */
export interface Gives {
  /** The means and where it came from (origin, the hours it was there). */
  means?: boolean;
  /** Why: the motive (murder), or the reason it was taken. */
  why?: boolean;
  /** Where the lost thing is now. */
  whereNow?: boolean;
}

/** One hour of an account. */
export interface Claim {
  place: PlaceId;
  /** Everyone on the board they say was with them there. A truthful account is exhaustive. */
  company: PersonId[];
  /** The reason for being there, when it's a move ("closed up and went for a drink"). */
  reason?: string;
}

export interface Remark {
  text: string;
  facts: Fact[];
  /**
   * A side remark (Medium): a fact said in passing, about someone else, that breaks a claim
   * nobody's list covers. The solver may use it only with the side-remark technique.
   */
  side: boolean;
  gives?: Gives;
  /** Places and people the remark names without placing anyone (gossip: "she goes on to the Palace"). */
  mentions?: { places?: PlaceId[]; people?: PersonId[]; why?: string };
}

/** Rule 4: asked "Where were you tonight?", everyone gives the whole evening, with company. */
export interface Account {
  person: PersonId;
  claims: Record<Hour, Claim>;
  remarks: Remark[];
}

export type ListEntry = { person: PersonId } | { look: string } | { other: string };

/** Rule 6: a watcher lists everyone they saw each hour, and says "nobody else". */
export interface WatchList {
  watcher: PersonId;
  place: PlaceId;
  entries: Record<Hour, ListEntry[]>;
  /**
   * People this watcher can't see (they never pass him). docs/41 has no such thing; only the
   * lost-watch fixture uses it, for the janitor who can't see across the hall.
   */
  unseen?: PersonId[];
  remarks: Remark[];
}

export interface Find {
  id: string;
  place: PlaceId;
  /** What you search: "the table", "the file box". */
  what: string;
  text: string;
  gives: Gives;
  facts: Fact[];
}

export interface Means {
  kind: 'chloral' | 'poison' | 'gun' | 'blade' | 'item' | 'pet';
  name: string;
  /** Where it could be picked up (rule 11). For a lost thing, the scene itself. */
  origin: PlaceId;
  /** The hours it sat there to be taken, all before the crime. */
  available: Hour[];
  /** Minutes from the dose or the shot to the effect (rule 13): chloral 20–60, a gun 0. */
  delay: [number, number];
  /** One line on where it came from: "the chloral bottle off Rafferty's hall shelf". */
  originText: string;
}

export type LieKind = 'culprit' | 'secret' | 'pair';

export interface Lie {
  person: PersonId;
  hour: Hour;
  kind: LieKind;
  truth: PlaceId;
  claim: PlaceId;
}

export interface Confrontation {
  person: PersonId;
  hour: Hour;
  /**
   * - admit: an innocent owns up, and names someone to check it by;
   * - refuse: the culprit, or (decided 2026-09-28) an innocent whose secret is worse than the
   *   suspicion. Never evidence either way;
   * - second-lie: the culprit tries another place, which collides too;
   * - crack: a small-case culprit at Raw–Poached.
   */
  response: 'admit' | 'refuse' | 'second-lie' | 'crack';
  text: string;
  /**
   * Board facts the confrontation settles. An admission settles none on the liar's own word
   * (decided 2026-09-28): it names someone to check, and the check places them.
   */
  facts: Fact[];
  /** Company-only witnesses the admission names, who can then be asked. */
  names?: PersonId[];
  gives?: Gives;
  /** The second lie, and what it collides with. */
  secondLie?: { text: string; collidesWith: string; place?: PlaceId };
}

export interface Crime {
  culprit: PersonId;
  /** The crime hour: the dose, the shot, the theft. */
  hour: Hour;
  /** What the player is told at first: one hour at Raw–Poached, two from Soft-boiled. */
  window: Hour[];
  scene: PlaceId;
  /** The victim, or the lost thing (a Person with `object`). */
  victim: PersonId;
  why: string;
  /** Lost item or pet: where it is now. */
  whereNow?: { place: PlaceId; text: string };
  /** Who found the body, or noticed the loss (rule 18). */
  finder?: PersonId;
}

/**
 * 4b: one line of the office, by what it says, with the values it was filled from, so the book
 * can put it in the client's mouth without parsing the sentence. `text` is the plain line.
 */
export interface GivenLine {
  kind: 'relation' | 'found' | 'clock' | 'venue' | 'pointer' | 'gone' | 'party' | 'means' | 'window' | 'keeper' | 'aside';
  /** The pool entry it came from: a clock's id, a small case's means, the pointer's kind. */
  id: string;
  text: string;
  vars: Record<string, string>;
}

export interface Givens {
  /** The office, in plain lines. */
  text: string[];
  /** 4b: the same lines, by kind, with their values. Absent on the hand-built fixtures. */
  lines?: GivenLine[];
  /** Hard facts the client hands over for free. */
  facts: Fact[];
  /** People known to have access without a board visit (a lodger at the scene). */
  access: PersonId[];
  /** Who the client points at. */
  pointer?: PersonId;
  /** Company-only witnesses the office names (a neighbour who feeds the dog). Others must be named by a list or an account first. */
  known?: PersonId[];
  /** The hours the office's window names, as the text says them. They must be board hours. */
  window?: Hour[];
  /** Places and people the office's text names, with why (4a.2: what motivates a question). */
  points?: GivenPoint[];
}

export interface BoardCase {
  id: string;
  seed: number;
  tier: TierIndex;
  type: CaseType;
  people: Person[];
  places: Place[];
  board: Board;
  crime: Crime;
  means: Means;
  accounts: Account[];
  lists: WatchList[];
  finds: Find[];
  confrontations: Confrontation[];
  givens: Givens;
  lies: Lie[];
  /** Hard-boiled variant, when there is one. */
  variant?: 'pair' | 'face';
  client: PersonId;
  /** People at watched places who aren't rows of the board (4a.2). */
  others?: Other[];
  /** The setup's three choices (4a.2). */
  setup?: Setup;
}

export type QuestionKind = 'search' | 'list' | 'account' | 'confront';

/** One paid question: a search, a watcher's list, a whole account, or a confrontation. */
export interface Question {
  id: string;
  kind: QuestionKind;
  /** The find, the watcher or the person. */
  subject: string;
  hour?: Hour;
  /** Where you have to be to ask it. */
  at: PlaceId;
  label: string;
}
