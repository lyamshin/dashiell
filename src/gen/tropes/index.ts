import type { CaseType, Id, Unknown } from '../types.js';
import type { Rng } from '../rng.js';
import { bodyAtScene } from './body-at-scene.js';
import { bodyMoved } from './body-moved.js';
import { lockedRoom } from './locked-room.js';
import { theFrame } from './the-frame.js';
import { insideJob } from './inside-job.js';
import { payroll } from './payroll.js';
import { left } from './left.js';
import { taken } from './taken.js';

export * from './kit.js';
export { framedPerson } from './the-frame.js';

/**
 * Eight tropes. `body-at-scene` carries a weight of 40 out of 100 so that it
 * stays the commonest thing that happens at the default settings, which is
 * what the spec asks for and what keeps a run of cases feeling like one game.
 */
export const TROPES = [
  bodyAtScene,
  bodyMoved,
  lockedRoom,
  theFrame,
  insideJob,
  payroll,
  left,
  taken,
] as const;

export const TROPE_BY_ID: Record<Id, (typeof TROPES)[number]> = Object.fromEntries(
  TROPES.map((t) => [t.id, t]),
);

export const TROPE_IDS: Id[] = TROPES.map((t) => t.id);

/**
 * The trope is drawn once per (seed, difficulty), before any of the generate
 * loop's retries, so that the distribution over a corpus is the weights and
 * not the weights bent by which shapes happen to be easy to build.
 */
export function pickTrope(
  rng: Rng,
  opts?: { type?: CaseType; tropeId?: Id },
): (typeof TROPES)[number] {
  if (opts?.tropeId) {
    const forced = TROPE_BY_ID[opts.tropeId];
    if (!forced) throw new Error(`no such trope: ${opts.tropeId}`);
    return forced;
  }
  const pool = TROPES.filter((t) => opts?.type === undefined || t.type === opts.type);
  if (pool.length === 0) throw new Error(`no trope of type ${opts?.type}`);
  const total = pool.reduce((n, t) => n + t.weight, 0);
  let roll = rng.next() * total;
  for (const t of pool) {
    roll -= t.weight;
    if (roll < 0) return t;
  }
  return pool[pool.length - 1] as (typeof TROPES)[number];
}

/** The unknowns a trope's report asks, as a sorted list. */
export function unknownsOf(tropeId: Id): Unknown[] {
  return (TROPE_BY_ID[tropeId]?.unknowns ?? []).slice();
}
