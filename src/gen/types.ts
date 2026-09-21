/**
 * Humphrey — Milestone 1 data model.
 *
 * Everything here is JSON-serializable. No classes, no functions, no undefined
 * that matters: a `Case` round-trips through `JSON.stringify` unchanged.
 */

/** 0..11. Tick 0 is 6:00 PM, tick 11 is 11:30 PM. Half-hour steps. */
export type Tick = number;

export type Id = string;

export const TICKS = 12;

export interface Location {
  id: Id;
  name: string;
  /** Where you can walk in one tick. */
  adjacent: Id[];
  /** Locations a person standing here can see into. */
  sightlines: Id[];
  /** Where a gunshot or a shout here would be heard. */
  noiseCarriesTo: Id[];
  /** Many people pass through. */
  isPublic: boolean;
  objects: Id[];
}

export interface GameObject {
  id: Id;
  name: string;
  homeLocation: Id;
}

export interface Secret {
  type: string;
  description: string;
  cells: { tick: Tick; location: Id }[];
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
  relationshipToVictim?: string;
  secret?: Secret;
  /**
   * Extension to the spec: the killer's `secret` is always the murder, so a
   * killer who also carries a pool secret needs somewhere to put it. Innocents
   * never have one.
   */
  coverSecret?: Secret;
  motive?: Motive;
  isKiller: boolean;
}

export interface Method {
  id: Id;
  name: string;
  noise: 0 | 1 | 2;
  evidenceObjectId?: Id;
  bodyEvidence: string;
  accessRequirement?: { location: Id; beforeTick: Tick };
}

export interface Environment {
  rainStartsAt?: Tick;
  elevatorOut?: [Tick, Tick];
  radioBroadcastAt?: Tick;
  radioContent?: string;
  /** What actually happened on the broadcast. Only true listeners can say. */
  radioOutcome?: string;
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
  location: Id;
  tick: Tick;
  withheld: boolean;
}

export type ClueSource =
  | { type: 'person'; personId: Id; topic: string }
  | { type: 'location'; locationId: Id };

export type ClueKind =
  | 'observation'
  | 'physical'
  | 'morgue'
  | 'document'
  | 'overheard'
  | 'environment'
  | 'radio';

export interface Clue {
  id: Id;
  kind: ClueKind;
  source: ClueSource;
  establishes: Fact[];
  text: string;
}

export type Fact =
  | { kind: 'personAt'; personId: Id; location: Id; tick: Tick }
  | { kind: 'personNotAt'; personId: Id; location: Id; tick: Tick }
  | { kind: 'objectMissing'; objectId: Id; fromLocation: Id }
  | { kind: 'noiseAt'; location: Id; tick: Tick }
  | { kind: 'timeOfDeath'; ticks: Tick[] }
  | { kind: 'hasMotive'; personId: Id; motiveType: string }
  | { kind: 'hadAccess'; personId: Id; methodId: Id }
  | { kind: 'victimAliveAt'; tick: Tick };

export interface Solution {
  killerId: Id;
  methodId: Id;
  motiveType: string;
  murderTick: Tick;
  murderLocationId: Id;
}

/** Clue ids that carry each leg of the proof. */
export interface DeductionPath {
  timeOfDeath: Id[];
  exculpations: Record<Id, Id[]>;
  inculpation: Id[];
  method: Id[];
  motive: Id[];
}

export interface Case {
  seed: number;
  attempts: number;
  detectiveName: string;
  hotelName: string;
  locations: Location[];
  objects: GameObject[];
  people: Person[];
  /**
   * Extension to the spec: `Solution.methodId` would otherwise dangle, since
   * the spec's `Case` has nowhere to hang the chosen `Method`.
   */
  method: Method;
  environment: Environment;
  schedules: Schedule[];
  observations: Observation[];
  clues: Clue[];
  solution: Solution;
  deduction: DeductionPath;
}

const PREPOSITIONS: Record<Id, string> = {
  'front-desk': 'at',
  street: 'on',
  'service-stairs': 'on',
};

/** "in the Bar", "at the Front Desk", "on the Street". */
export function placePhrase(locationId: Id, locationName: string): string {
  return `${PREPOSITIONS[locationId] ?? 'in'} the ${locationName}`;
}

/** "6:00 PM" .. "11:30 PM" */
export function clock(tick: Tick): string {
  const minutes = 18 * 60 + tick * 30;
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m === 0 ? '00' : String(m)} PM`;
}
