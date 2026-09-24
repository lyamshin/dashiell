/**
 * v2 — the deduction graph and what the puzzle stage hands on (docs/35 §1,
 * stage 2; docs/34 §3, step 7).
 *
 * Leaves are facts (clue ids). Steps are the conclusions they force, each with
 * the technique it needs and what it rests on: facts and earlier steps (the
 * AND). A rival (another answer the report could be given) is broken by one
 * or more routes (the OR): disjoint sets of facts, found by taking each route
 * away and looking for another. The targets are the report's questions.
 */

import type { Id, Tick } from '../types.js';
import type { Tech } from '../logic/solver.js';

export type StepKind =
  /** Where somebody was at a half hour, worked out (not read off). */
  | 'place'
  /** Where somebody was not, worked out. */
  | 'not'
  /** A half hour the crime did not happen at. */
  | 'tick'
  /** A self-account shown false: a lie caught. */
  | 'lie'
  /** What a caught innocent gives up. */
  | 'confess'
  /** The one left at the scene: who. */
  | 'who'
  /** The half hour: when. */
  | 'when'
  /** A leg of the report read off a fact: how, the way in, why, where it is now. */
  | 'leg';

export interface GraphStep {
  id: string;
  kind: StepKind;
  tech: Tech;
  /** The dearest technique under it, as a cost. */
  peak: number;
  /** How many rounds of combining it took (the M9 depth). */
  depth: number;
  /** In plain words, for the notes and the truth sheet. */
  label: string;
  /** Who it is about, when it is about somebody. */
  personId?: Id;
  place?: Id;
  ticks?: Tick[];
  /** The facts it rests on directly (clue ids). */
  facts: Id[];
  /** The steps it rests on (the AND). */
  needs: string[];
  /** Every fact under it, all the way down. */
  leaves: Id[];
}

export interface RivalInfo {
  id: string;
  kind: 'who' | 'when';
  label: string;
  personId?: Id;
  tick?: Tick;
  /** One of the one or two innocents nearest the scene, or the crime's half hour. */
  key: boolean;
  /** Disjoint routes at the tier's techniques: R(r). */
  routes: number;
  /** Each route's facts (removable ones only; accounts and the givens are always there). */
  routeFacts: Id[][];
  /** The dearest technique on the first route. */
  tech: Tech;
  /** The step that breaks it. */
  step: string;
}

export interface GraphStats {
  /** The hardest technique on the cheapest path. */
  peak: Tech;
  /** Steps at or above the tier's signature technique. */
  load: number;
  /** Open steps along a reasoning player's path: the least, and the median. */
  widthMin: number;
  widthMedian: number;
  /** Facts whose loss leaves some rival standing. */
  critical: Id[];
  /** Single facts that break a key rival alone. */
  backdoors: Id[];
  /** Solvable with the tier's techniques, and not one rung down (Tatham). */
  tatham: boolean;
  /** The complete check: no rival has a world. */
  unique: boolean;
  /** Rivals the complete check ran out of budget on. */
  uniqueUnknown: number;
  /** How many facts were dug out at the level of the world, and how. */
  dug: { board: number; edges: number };
  /** Which band rules held, by name, and which did not. */
  bands: Record<string, boolean>;
}

export interface DeductionGraph {
  steps: GraphStep[];
  /** The report's questions: step ids. */
  targets: string[];
  rivals: RivalInfo[];
  /** The rival the tier's signature technique was planted on. */
  bottleneck: string | null;
  /** The step on the bottleneck's route that needs the signature technique. */
  bottleneckStep: string | null;
  /** Lie steps, in the order a player would first be able to catch them. */
  lies: string[];
  /** Every fact in the findable set, by what it is to the puzzle. */
  classes: Record<Id, 'route' | 'overlap' | 'dead-end' | 'given'>;
  stats: GraphStats;
}
