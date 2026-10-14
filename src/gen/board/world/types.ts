/**
 * docs/48 §1: the bible. A few blocks of the Lower East Side, about ten places
 * and about twenty-four people, written once by hand. The generator casts a
 * night from it (`cast.ts`); the book draws its arrivals, looks, staging and
 * voices from it first (`src/game/board/world.ts`).
 *
 * The shape is `content/neighbourhood/places.json` and `people.json`, exactly.
 * Hours here are clock hours (19 is seven in the evening, 2 is two in the
 * morning); the board's own hours are 7 to 11 (`boardOpen`).
 */

/** The engine's place kinds (`PlaceKind`, less transit, which nobody lives at). */
export type WorldKind = 'home' | 'bar' | 'club' | 'restaurant' | 'theatre' | 'work';
export const WORLD_KINDS: WorldKind[] = ['home', 'bar', 'club', 'restaurant', 'theatre', 'work'];

export type Band = 'early' | 'mid' | 'late';
export type WorldWeather = 'rain' | 'cold' | 'clear' | 'any';

export interface BibleWatcher {
  /** The person kept there all night by the job. */
  person: string;
  /**
   * How they keep count, in their own words: three standing lines, each a different angle on how
   * they see ("I tear every ticket in half personally"). One is said the first time I meet them.
   */
  counts: string[];
  /** What they can see: "the stair". */
  sees: string;
  /** What they can't: "not the hall". */
  blind: string;
}

export interface BibleArrival {
  band: Band;
  weather: WorldWeather;
  text: string;
}

/**
 * Somewhere inside a place a person can spend an hour unseen (the back booth, the cellar, the
 * wings), with its own arrival, said when a night's unwatched place is this room.
 */
export interface BibleHide {
  name: string;
  /** One paragraph, for any hour and weather: what the room is, and one thing to notice. */
  arrival: string;
}

/** Something somebody would be found doing, and where: a place's id, or "any" for anywhere. */
export interface BibleDoing {
  setting: string;
  text: string;
}

export interface BibleDetail {
  id: string;
  kind: 'prop' | 'habit' | 'gag';
  text: string;
}

export interface BiblePlace {
  id: string;
  name: string;
  kind: WorldKind;
  street: string;
  number: number;
  /** When it's open, in clock hours; null for a home, always open to the people who live there. */
  hours: { open: number; close: number } | null;
  watcher: BibleWatcher | null;
  /** Minutes on foot to every other place. Symmetric. */
  minutes: Record<string, number>;
  arrivals: BibleArrival[];
  details: BibleDetail[];
  /** What hides here: the back room, the booth, the cellar, each with its arrival. */
  hides: BibleHide[];
}

export type TieKind = 'lodger' | 'landlady' | 'owes' | 'owed' | 'old-flame' | 'in-law' | 'rival' | 'feud' | 'friend' | 'employer' | 'employee';
export const TIE_KINDS: TieKind[] = ['lodger', 'landlady', 'owes', 'owed', 'old-flame', 'in-law', 'rival', 'feud', 'friend', 'employer', 'employee'];
/** A tie's other end: a lodger's landlady, a debtor's creditor. The rest are the same both ways. */
export const TIE_BACK: Record<TieKind, TieKind> = {
  lodger: 'landlady',
  landlady: 'lodger',
  owes: 'owed',
  owed: 'owes',
  employer: 'employee',
  employee: 'employer',
  'old-flame': 'old-flame',
  'in-law': 'in-law',
  rival: 'rival',
  feud: 'feud',
  friend: 'friend',
};

export type WorldManner = 'plain' | 'terse' | 'careful';
export const WORLD_MANNERS: WorldManner[] = ['plain', 'terse', 'careful'];

export interface BibleVoice {
  /** How they answer "Where were you tonight?" before the account itself. */
  ask: string[];
  deflect: string[];
  /** How they say "nobody else". */
  nobodyElse: string[];
  /** A line for an hour of the evening, keyed by the hour ("7", "11"): "that's the hour I do the books". */
  hours: Record<string, string>;
  refuse: string[];
  ownUp: string[];
}

export interface BibleTie {
  to: string;
  kind: TieKind;
  /** The grudge or the warmth, as this person would say it. */
  line: string;
}

export interface BiblePerson {
  id: string;
  first: string;
  last: string;
  honorific: string | null;
  gender: 'f' | 'm';
  age: '20s' | '30s' | '40s' | '50s' | '60s';
  job: string;
  home: string;
  works: { place: string; open: number; close: number } | null;
  manner: WorldManner;
  /** What they'd be found doing, by setting, as looks are: "darning a lodger’s sock on the first landing". */
  doing: BibleDoing[];
  looks: { setting: string; text: string }[];
  voice: BibleVoice;
  ties: BibleTie[];
  secrets: { text: string; place: string }[];
  asVictim: { why: string; foundWith: string };
}

export interface Bible {
  /** Where it came from, for the errors: "neighbourhood", "stub". */
  name: string;
  places: BiblePlace[];
  people: BiblePerson[];
}

/**
 * Clock hours as board hours, inclusive: the board's 7 is seven in the evening, its 13 one in the
 * morning. A bar open 19 to 2 is open [7, 13]; a surgery open 9 to 21 is open [-3, 8], so it shuts
 * at nine; a place open 0 to 24, or open and shut at one hour, never shuts.
 */
export function hoursOnBoard(h: { open: number; close: number }): [number, number] {
  if (h.open % 24 === h.close % 24) return [-99, 99];
  const o = h.open - 12;
  let c = h.close - 12;
  if (c <= o) c += 24;
  return [o, c - 1];
}

/** The board hours a place is open, inclusive, as `Place.open` says them. A home is always open. */
export function boardOpen(p: Pick<BiblePlace, 'hours'>): [number, number] {
  return p.hours ? hoursOnBoard(p.hours) : [-99, 99];
}

/** The board hours somebody is at work. */
export function worksOpen(w: { open: number; close: number }): [number, number] {
  return hoursOnBoard(w);
}

/** A voice line's hour key as a board hour: "7" and "19" are both seven in the evening. */
export function voiceHour(key: string): number {
  const n = Number(key);
  return n >= 12 ? n - 12 : n;
}

/** "Mrs. Nora Rafferty", "Sol Pincus". */
export function fullName(p: Pick<BiblePerson, 'first' | 'last' | 'honorific'>): string {
  return `${p.honorific ? `${p.honorific} ` : ''}${p.first} ${p.last}`;
}

/** What the prose calls them after the first mention: "Mrs. Rafferty", "Pincus". */
export function shortName(p: Pick<BiblePerson, 'last' | 'honorific'>): string {
  return p.honorific && /^(Mrs|Miss|Mme|Dr)\.?$/.test(p.honorific) ? `${p.honorific} ${p.last}` : p.last;
}
