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
import { petFollowed, petLeftOpen, petTaken } from './lost-pet.js';
import { itemBorrowed, itemHidden, itemMislaid, itemPawned } from './lost-item.js';
import { theAffair, theBusiness, theSecret } from './affair.js';

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
  // M14. After the eight, so a draw filtered to the eight is the draw it was.
  petLeftOpen,
  petTaken,
  petFollowed,
  itemBorrowed,
  itemPawned,
  itemHidden,
  itemMislaid,
  theAffair,
  theSecret,
  theBusiness,
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
  opts?: { type?: CaseType; tropeId?: Id; allowed?: Id[] },
): (typeof TROPES)[number] {
  const allowed = opts?.allowed;
  if (opts?.tropeId) {
    const forced = TROPE_BY_ID[opts.tropeId];
    if (!forced) throw new Error(`no such trope: ${opts.tropeId}`);
    if (allowed && !allowed.includes(forced.id)) {
      throw new Error(`this tier does not deal ${opts.tropeId}`);
    }
    return forced;
  }
  // M7: a tier deals only its own tropes. Filtering by a list that holds all
  // eight keeps the pool, and so the draw, exactly where it was.
  const pool = TROPES.filter(
    (t) => (opts?.type === undefined || t.type === opts.type) && (!allowed || allowed.includes(t.id)),
  );
  if (pool.length === 0) throw new Error(`no trope of type ${opts?.type} in this tier`);
  const total = pool.reduce((n, t) => n + t.weight, 0);
  let roll = rng.next() * total;
  for (const t of pool) {
    roll -= t.weight;
    if (roll < 0) return t;
  }
  return pool[pool.length - 1] as (typeof TROPES)[number];
}

/**
 * M14 §1.5 — the case mix. A tiered case draws its type first, by the tier's
 * weights over the types it has a trope for, and then a trope of that type by
 * the tropes' own weights. Murder is about a third at every tier.
 */
export function pickTieredTrope(
  rng: Rng,
  mix: Partial<Record<CaseType, number>>,
  opts?: { type?: CaseType; tropeId?: Id; allowed?: Id[] },
): (typeof TROPES)[number] {
  if (opts?.tropeId) return pickTrope(rng, opts);
  const allowed = opts?.allowed;
  const has = (type: CaseType): boolean => TROPES.some((t) => t.type === type && (!allowed || allowed.includes(t.id)));
  let type = opts?.type;
  if (type === undefined) {
    const types = (Object.entries(mix) as [CaseType, number][]).filter(([t, w]) => w > 0 && has(t));
    const total = types.reduce((n, [, w]) => n + w, 0);
    let roll = rng.next() * total;
    for (const [t, w] of types) {
      roll -= w;
      if (roll < 0) {
        type = t;
        break;
      }
    }
    type ??= types[types.length - 1]?.[0];
  }
  return pickTrope(rng, { ...(type !== undefined ? { type } : {}), ...(allowed ? { allowed } : {}) });
}

/** The unknowns a trope's report asks, as a sorted list. */
export function unknownsOf(tropeId: Id): Unknown[] {
  return (TROPE_BY_ID[tropeId]?.unknowns ?? []).slice();
}
