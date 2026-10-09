import { Rng } from '../rng.js';
import type { BoardCase, CaseType, TierIndex } from './types.js';
import { buildCase, lastVeto, typesFor } from './generate.js';
import { analyse, rate, refusalShortcut, type Analysis } from './path.js';
import { checkInvariants, invariantFailures } from './invariants.js';
import { PAR_TARGET, TIERS } from './tiers.js';

export * from './types.js';
export { analyse, refusalShortcut, type Analysis, type Shortcut } from './path.js';
export { checkInvariants, invariantFailures } from './invariants.js';
export { solve, questionsOf } from './solver.js';
export { closure, pointed, pointerIndex } from './pointers.js';
export { techniquesUpTo, TIERS, LADDER, parseTier } from './tiers.js';
export { typesFor, REFUSE_SHARE } from './generate.js';

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
 * Par floor by tier. docs/41 rule 16 says 4 to 5 at Raw (decided 2026-09-28: two watchers, each
 * clearing one rival), and Coddled is brought to 4 or more the same way. See docs/42.
 */
export const PAR_FLOOR: Record<TierIndex, number> = { 0: 4, 1: 4, 2: PAR_TARGET[0], 3: PAR_TARGET[0], 4: PAR_TARGET[0], 5: PAR_TARGET[0] };

export function pickType(seed: number, tier: TierIndex): CaseType {
  const rng = new Rng((seed * 2654435761) >>> 0);
  const types = typesFor(tier);
  // Half murders; the small cases share the rest.
  return rng.chance(0.5) ? 'murder' : (rng.pick(types.filter((t) => t !== 'murder')) as CaseType);
}

export function reject(c: BoardCase, a: Analysis): string | null {
  const inv = invariantFailures(checkInvariants(c, a));
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
  // Decided 2026-09-28: "confront every liar, name whoever refuses" must not beat par.
  const sc = refusalShortcut(c, a.par, a.par - 1);
  if (!sc.fails && !sc.capped) return `the refusal shortcut takes ${sc.cost}, under par ${a.par}`;
  return null;
}

/**
 * 4a.2: the office's text with people's names taken out. No two seeds' givens may match word for
 * word apart from names; the sweep and the tests compare these.
 */
export function givensSignature(c: BoardCase): string {
  const tokens = new Set<string>();
  for (const p of c.people) {
    tokens.add(p.name);
    tokens.add(p.short);
    for (const w of p.name.split(/[\s,]+/)) if (/^[A-Z][a-z’']+$/.test(w) && !['Mr', 'Mrs', 'Miss'].includes(w)) tokens.add(w);
  }
  let s = c.givens.text.join(' ');
  for (const t of [...tokens].sort((a, b) => b.length - a.length)) s = s.split(t).join('{who}');
  return s;
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
      opts.onReject?.(`truth: ${lastVeto}`);
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
