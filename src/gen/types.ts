/**
 * Humphrey — Milestone 2 data model.
 *
 * Everything here is JSON-serializable. No classes, no functions, no undefined
 * that matters: a `Case` round-trips through `JSON.stringify` unchanged.
 *
 * Changes from M1: the map is gone. Places are a deck of six cards with no
 * adjacency between them; what matters is whether a place is watched. Time is
 * pinned by anchors rather than by the coroner. Clues are selected into a
 * small findable graph rather than dumped.
 */

/** 0..11. Tick 0 is 6:00 PM, tick 11 is 11:30 PM. Half-hour steps. */
export type Tick = number;

export type Id = string;

export const TICKS = 12;

export type Difficulty = 1 | 2 | 3;

export type PlaceKind = 'private' | 'semi' | 'public';

export type FixtureRole =
  | 'bartender'
  | 'doorman'
  | 'newsstand'
  | 'counterman'
  | 'ticket-taker'
  | 'elevator-man'
  | 'landlady'
  | 'beat-cop'
  | 'cabbie'
  | 'druggist';

export interface Place {
  id: Id;
  name: string;
  kind: PlaceKind;
  /** Who is posted here and sees everyone. Absent means unwatched. */
  watcher?: FixtureRole;
  objects: Id[];
  /** The victim's own address. Exactly one drawn place has this. */
  isResidence: boolean;
  /**
   * Close enough to the scene that a loud method is audible from here. Two
   * places per case, chosen when the scene is chosen.
   */
  nearScene: boolean;
}

export interface GameObject {
  id: Id;
  name: string;
  homePlace: Id;
}

export interface Secret {
  type: string;
  label: string;
  description: string;
  cells: { tick: Tick; place: Id }[];
  partnerId?: Id;
}

export interface Motive {
  type: string;
  description: string;
}

export interface Person {
  id: Id;
  name: string;
  role: string;
  kind: 'victim' | 'suspect' | 'fixture';
  /** Which archetype card this person was drawn from. Suspects and victim. */
  archetypeId?: Id;
  /** Which relationship card ties them to the victim. Suspects only. */
  relationshipId?: Id;
  relationshipToVictim?: string;
  /** Fixtures only. */
  fixtureRole?: FixtureRole;
  secret?: Secret;
  /**
   * The killer's `secret` is always the murder, so a killer who also carries a
   * pool secret needs somewhere to put it. Innocents never have one.
   */
  coverSecret?: Secret;
  motive?: Motive;
  isKiller: boolean;
  /** Where the detective finds this person the next day. Not set for the victim. */
  foundAt?: Id;
  /** The one who hired Humphrey. Might be the killer. */
  isClient?: boolean;
}

export interface Method {
  id: Id;
  name: string;
  noise: 0 | 1 | 2;
  evidenceObjectId: Id;
  bodyEvidence: string;
  /** Where the weapon lived, and by when the killer had to have been there. */
  accessRequirement: { place: Id; beforeTick: Tick };
}

export type AnchorTrace =
  /** Only those present know X (how the fight ended, what song played). */
  | { kind: 'knowledge'; description: string }
  /** A reliable person notes who was present at exactly this tick. */
  | { kind: 'sighting' }
  /** A physical trace on those present (wet coat, plaster dust, ink). */
  | { kind: 'mark'; description: string }
  /** Something started or stopped; those nearby can time events by it. */
  | { kind: 'sound'; description: string };

export interface Anchor {
  templateId: Id;
  name: string;
  /** Absent means it happens across the whole neighborhood. */
  placeId?: Id;
  ticks: Tick[];
  /** For a walking anchor (the beat cop): where he is at each of `ticks`. */
  route?: Id[];
  traces: AnchorTrace[];
  /** "just as the El went over" — how a clue times something against this. */
  timing: string;
  /** How it reads when it is the thing that times the scene. */
  sceneTiming: string;
}

export interface Schedule {
  personId: Id;
  truth: (Id | null)[];
  claimed: (Id | null)[];
  claimedCompanion: (Id | null)[];
  lies: Tick[];
}

export interface Observation {
  observerId: Id;
  subjectId: Id;
  place: Id;
  tick: Tick;
  withheld: boolean;
}

export type ClueSource =
  | { type: 'person'; personId: Id; topic: string }
  | { type: 'place'; placeId: Id };

export type ClueKind =
  | 'observation'
  | 'physical'
  | 'morgue'
  | 'document'
  | 'overheard'
  | 'anchor'
  | 'scene'
  | 'client';

export type ClueRole = 'spine' | 'corroboration' | 'noise' | 'disqualifier';

export interface Clue {
  id: Id;
  kind: ClueKind;
  source: ClueSource;
  establishes: Fact[];
  text: string;
  /** Where the clue is obtained: the place, or where the person is found. */
  place: Id;
  /** Other findable clues this one points at. Empty in the candidate pool. */
  leadsTo: Id[];
  role: ClueRole;
  branchId?: Id;
  /** The anchor this clue leans on to fix a time, if any. */
  anchorId?: Id;
  /** The innocent whose secret this clue is about. Every noise clue has one. */
  aboutSecretOf?: Id;
}

export type Fact =
  | { kind: 'personAt'; personId: Id; place: Id; tick: Tick }
  | { kind: 'personNotAt'; personId: Id; place: Id; tick: Tick }
  | { kind: 'objectMissing'; objectId: Id; fromPlace: Id }
  | { kind: 'noiseAt'; place: Id; tick: Tick }
  /** The coroner's four-tick window. */
  | { kind: 'timeOfDeath'; ticks: Tick[] }
  | { kind: 'hasMotive'; personId: Id; motiveType: string }
  | { kind: 'hadAccess'; personId: Id; methodId: Id }
  /** The victim was still alive at the end of this tick. */
  | { kind: 'victimAliveAt'; tick: Tick }
  /** The victim was already dead by the end of this tick. */
  | { kind: 'victimDeadBy'; tick: Tick }
  | { kind: 'methodEvidence'; methodId: Id }
  /** This person's secret is accounted for and is not the murder. */
  | { kind: 'secretExplained'; personId: Id; secretType: string };

export interface Solution {
  killerId: Id;
  methodId: Id;
  motiveType: string;
  murderTick: Tick;
  murderPlaceId: Id;
}

/** Clue ids that carry each leg of the proof. Findable clues only. */
export interface DeductionPath {
  timeOfDeath: Id[];
  /** The two anchors the time of death hangs on. */
  timeOfDeathAnchors: Id[];
  exculpations: Record<Id, Id[]>;
  inculpation: Id[];
  access: Id[];
  method: Id[];
  motive: Id[];
}

export interface Case {
  seed: number;
  attempts: number;
  difficulty: Difficulty;
  detectiveName: string;
  neighborhood: string;
  places: Place[];
  objects: GameObject[];
  people: Person[];
  method: Method;
  anchors: Anchor[];
  /** The two places within earshot of the scene. */
  nearScene: Id[];
  schedules: Schedule[];
  observations: Observation[];
  /** The full pool. This is the truth, and what a report is graded against. */
  candidates: Clue[];
  /** Exactly what the player can find. 30 ± 2. */
  findable: Clue[];
  /** The three opening clues, always in the spine. */
  starting: Id[];
  clientId: Id;
  par: number;
  budget: number;
  coronerWindow: [Tick, Tick];
  solution: Solution;
  deduction: DeductionPath;
}

/** "at the Automat", "in Dolan's Bar", "on the El platform". */
export function placePhrase(name: string): string {
  return name;
}

/** "6:00 PM" .. "11:30 PM" */
export function clock(tick: Tick): string {
  const minutes = 18 * 60 + tick * 30;
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m === 0 ? '00' : String(m)} PM`;
}

/** Budget in actions, by difficulty. */
export const BUDGETS: Record<Difficulty, number> = { 1: 22, 2: 20, 3: 18 };

/** How deep a noise branch runs, by difficulty. */
export const BRANCH_DEPTH: Record<Difficulty, [number, number]> = {
  1: [1, 1],
  2: [1, 2],
  3: [2, 3],
};

/** How many innocents lie about the murder tick, by difficulty. */
export const M_LIARS: Record<Difficulty, [number, number]> = {
  1: [2, 2],
  2: [2, 3],
  3: [3, 3],
};
