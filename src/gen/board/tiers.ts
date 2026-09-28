import type { TierIndex } from './types.js';

/** docs/42 §2: the named techniques. */
export type Technique =
  | 'read-off'
  | 'collision'
  | 'elimination'
  | 'access'
  | 'confrontation'
  | 'time-window'
  | 'side-remark'
  | 'pair'
  | 'face';

/** The tier ladder in docs/41: one new idea per tier. */
export const LADDER: Technique[][] = [
  ['read-off', 'collision', 'elimination'],
  ['access'],
  ['confrontation'],
  ['time-window'],
  ['side-remark'],
  ['pair', 'face'],
];

export function techniquesUpTo(tier: number): Set<Technique> {
  const out = new Set<Technique>();
  for (let t = 0; t <= tier && t < LADDER.length; t++) for (const x of LADDER[t] as Technique[]) out.add(x);
  return out;
}

export interface TierSpec {
  suspects: number;
  hours: number;
  /** Places besides the scene. */
  places: number;
  /** Budget is par + this (docs/42 §2). */
  slack: number;
  /** Rule 17: routes per rival. */
  width: { min: number; max?: number };
  /** Rule 10: below Hard-boiled, two agreeing accounts are both true. */
  corroboration: boolean;
}

/** Rule 1's table, rule 16's budget and rule 17's width. */
export const TIERS: Record<TierIndex, TierSpec> = {
  0: { suspects: 3, hours: 3, places: 2, slack: 3, width: { min: 2 }, corroboration: true },
  1: { suspects: 3, hours: 3, places: 3, slack: 2, width: { min: 2 }, corroboration: true },
  2: { suspects: 4, hours: 4, places: 3, slack: 2, width: { min: 1 }, corroboration: true },
  3: { suspects: 4, hours: 4, places: 3, slack: 2, width: { min: 1 }, corroboration: true },
  4: { suspects: 4, hours: 4, places: 4, slack: 2, width: { min: 1 }, corroboration: true },
  5: { suspects: 5, hours: 4, places: 4, slack: 1, width: { min: 1, max: 1 }, corroboration: false },
};

/** Rule 16: the designed path is 5 to 9 questions. */
export const PAR_TARGET: [number, number] = [5, 9];

export function parseTier(raw: string | undefined): TierIndex | null {
  if (raw === undefined) return null;
  const names = ['raw', 'coddled', 'poached', 'soft-boiled', 'medium', 'hard-boiled'];
  const i = names.indexOf(raw.toLowerCase());
  if (i >= 0) return i as TierIndex;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? (n as TierIndex) : null;
}
