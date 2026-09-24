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
 * M14 §1.5 — the case mix, dealt so that the old cases stay the old cases.
 *
 * The trope is drawn first exactly as it was before M14, off the same stream
 * and over the tier's classic list (`classic`). Then a second stream of its
 * own (`mix`) decides whether that case is kept or the seed deals something
 * else instead: a lost pet, a lost item, an affair, or — below Medium, where
 * the classic list is all murder — a robbery or a disappearance. The keep
 * rate is the one that brings murder to the tier's share, and the rest is
 * shared out so each type lands on its weight in `mix`. A kept case is the
 * case that seed dealt before M14, draw for draw, which is what keeps the
 * goldens (seed 3 at Medium) and the sheets built on them where they were.
 *
 * Forced by type: the classic draw, when it deals that type; otherwise a
 * trope of that type off the second stream. Forced by trope: as before.
 */
export function pickMixedTrope(
  classicRng: Rng,
  mixRng: Rng,
  mix: Partial<Record<CaseType, number>>,
  classic: Id[],
  opts?: { type?: CaseType; tropeId?: Id; allowed?: Id[] },
): { trope: (typeof TROPES)[number]; kept: boolean } {
  const allowed = opts?.allowed;
  if (opts?.tropeId) {
    const trope = pickTrope(classicRng, opts);
    return { trope, kept: classic.includes(trope.id) };
  }
  const drawn = pickTrope(classicRng, { allowed: classic });
  if (opts?.type !== undefined) {
    // Asked for a type: the seed's classic case if it is one, so that
    // `{ tier: 4, type: 'murder' }` at seed 3 is the golden's case.
    if (drawn.type === opts.type) return { trope: drawn, kept: true };
    return { trope: pickTrope(mixRng, { type: opts.type, ...(allowed ? { allowed } : {}) }), kept: false };
  }
  // What the classic draw deals, by type: its share of the classic weights.
  const pool = TROPES.filter((t) => classic.includes(t.id));
  const total = pool.reduce((n, t) => n + t.weight, 0);
  const share = (type: CaseType): number => pool.filter((t) => t.type === type).reduce((n, t) => n + t.weight, 0) / total;
  const mixTotal = Object.values(mix).reduce((n, w) => n + (w ?? 0), 0);
  const want = (type: CaseType): number => (mix[type] ?? 0) / mixTotal;
  const types = Object.keys(mix) as CaseType[];
  // Keep as much of the classic draw as fits under every type's share.
  let keep = 1;
  for (const type of types) if (share(type) > 0) keep = Math.min(keep, want(type) / share(type));
  if (mixRng.next() < keep) return { trope: drawn, kept: true };
  // The rest, to the types the kept draws leave short.
  const has = (type: CaseType): boolean => TROPES.some((t) => t.type === type && (!allowed || allowed.includes(t.id)));
  const short = types
    .map((type) => [type, Math.max(0, want(type) - keep * share(type))] as const)
    .filter(([type, w]) => w > 1e-9 && has(type));
  const sum = short.reduce((n, [, w]) => n + w, 0);
  let roll = mixRng.next() * sum;
  let type = short[short.length - 1]?.[0] as CaseType;
  for (const [t, w] of short) {
    roll -= w;
    if (roll < 0) {
      type = t;
      break;
    }
  }
  return { trope: pickTrope(mixRng, { type, ...(allowed ? { allowed } : {}) }), kept: false };
}

/** The unknowns a trope's report asks, as a sorted list. */
export function unknownsOf(tropeId: Id): Unknown[] {
  return (TROPE_BY_ID[tropeId]?.unknowns ?? []).slice();
}
