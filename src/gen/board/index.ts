import { Rng } from '../rng.js';
import type { BoardCase, CaseType, TierIndex } from './types.js';
import { buildCase, typesFor } from './generate.js';
import { analyse, rate, type Analysis } from './path.js';
import { checkInvariants, invariantFailures } from './invariants.js';
import { PAR_TARGET, TIERS } from './tiers.js';

export * from './types.js';
export { analyse, type Analysis } from './path.js';
export { checkInvariants, invariantFailures } from './invariants.js';
export { solve, questionsOf } from './solver.js';
export { techniquesUpTo, TIERS, LADDER, parseTier } from './tiers.js';
export { typesFor } from './generate.js';

/**
 * docs/42 §1–2: generate, then accept the way Tatham does. A candidate is kept
 * only if the invariants hold, the tier's techniques finish it and the tier
 * below's don't, par is in range, the width rule holds, and every clue
 * interacts. Otherwise the next attempt.
 */

export interface Generated {
  kase: BoardCase;
  analysis: Analysis;
  attempts: number;
}

export const MAX_ATTEMPTS = 60;

/**
 * Par floor by tier. Raw and Coddled can't reach docs/41's five: one watcher's list, the
 * culprit's account and the scene settle a three-suspect board (docs/41's own Raw example is four
 * with the motive). See docs/42 Built.
 */
export const PAR_FLOOR: Record<TierIndex, number> = { 0: 3, 1: 3, 2: PAR_TARGET[0], 3: PAR_TARGET[0], 4: PAR_TARGET[0], 5: PAR_TARGET[0] };

export function pickType(seed: number, tier: TierIndex): CaseType {
  const rng = new Rng((seed * 2654435761) >>> 0);
  const types = typesFor(tier);
  // Half murders; the small cases share the rest.
  return rng.chance(0.5) ? 'murder' : (rng.pick(types.filter((t) => t !== 'murder')) as CaseType);
}

export function reject(c: BoardCase, a: Analysis): string | null {
  const inv = invariantFailures(checkInvariants(c));
  if (inv.length > 0) return `invariant: ${inv[0]}`;
  if (!a.solvable) return 'unsolvable at its tier';
  if (a.rating !== c.tier) return `rates ${a.rating}`;
  if (a.par < PAR_FLOOR[c.tier] || a.par > PAR_TARGET[1]) return `par ${a.par}`;
  const w = TIERS[c.tier].width;
  for (const r of a.rivals) {
    if (r.routes.length < w.min) return `rival ${r.id} has ${r.routes.length} routes`;
    if (w.max !== undefined && r.routes.length > w.max) return `rival ${r.id} has ${r.routes.length} routes`;
  }
  if (!a.interaction.ok) return `interaction: ${[...a.interaction.loners, ...a.interaction.settles].join(', ')}`;
  return null;
}

export function generateBoard(
  seed: number,
  tier: TierIndex,
  opts: { type?: CaseType; maxAttempts?: number; onReject?: (why: string) => void } = {},
): Generated | null {
  const type = opts.type ?? pickType(seed, tier);
  const max = opts.maxAttempts ?? MAX_ATTEMPTS;
  for (let attempt = 0; attempt < max; attempt++) {
    const c = buildCase(seed, tier, type, attempt);
    if (!c) {
      opts.onReject?.('truth');
      continue;
    }
    const pre = invariantFailures(checkInvariants(c));
    if (pre.length > 0) {
      opts.onReject?.(`invariant: ${pre[0]}`);
      continue;
    }
    const rating = rate(c);
    if (rating !== tier) {
      opts.onReject?.(`rates ${rating}`);
      continue;
    }
    const a = analyse(c);
    const why = reject(c, a);
    if (why) {
      opts.onReject?.(why);
      continue;
    }
    return { kase: c, analysis: a, attempts: attempt + 1 };
  }
  return null;
}
