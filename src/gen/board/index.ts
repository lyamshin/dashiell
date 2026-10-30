import { Rng } from './rng.js';
import type { BoardCase, CaseType, TierIndex } from './types.js';
import { PUZZLES, buildCase, lastVeto, oneLiarDrawn, oneLiarNight, typesFor } from './generate.js';
import { analyse, oneLiar, rate, ratesAt, refusalShortcut, type Analysis } from './path.js';
import { checkInvariants, invariantFailures } from './invariants.js';
import { PAR_TARGET, TIERS } from './tiers.js';
import type { WorldCtx } from './world/cast.js';

export type { WorldCtx } from './world/cast.js';

export * from './types.js';
export { analyse, oneLiar, refusalShortcut, type Analysis, type Shortcut } from './path.js';
export { checkInvariants, invariantFailures } from './invariants.js';
export { solve, questionsOf } from './solver.js';
export { closure, pointed, pointerIndex } from './pointers.js';
export { techniquesUpTo, TIERS, LADDER, parseTier } from './tiers.js';
export { typesFor, REFUSE_SHARE, ONE_LIAR_SHARE, ONE_LIAR_SHARE_B, PUZZLES, puzzleB, oneLiarDrawn, oneLiarNight } from './generate.js';

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
  if (!ratesAt(c, a.rating)) return `rates ${a.rating}`;
  // docs/82 (puzzles B): a night with one liar may be a question shorter. The honest innocent's hour alone
  // is the window's other hour, and the list that sees them at the crime hour is one the night needs
  // anyway, so it's four questions (the scene, two lists, the liar's story) on most Soft-boiled nights;
  // with the floor at five, one night in a hundred had one liar, not the designer's one in six.
  const floor = c.puzzles?.includes('B') && oneLiar(c) ? Math.min(PAR_FLOOR[c.tier], 4) : PAR_FLOOR[c.tier];
  if (a.par < floor || a.par > PAR_TARGET[1]) return `par ${a.par}`;
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

/**
 * docs/82: the harder-puzzle flags a night is dealt with, as the tools and the book take them ("B",
 * "b,c", `['B']`): the ones there are, upper case, in order. Anything else is dropped.
 */
export function parsePuzzles(raw: string | readonly string[] | null | undefined): string[] {
  if (!raw) return [];
  const xs = (typeof raw === 'string' ? raw.split(',') : [...raw]).map((x) => x.trim().toUpperCase());
  return (PUZZLES as readonly string[]).filter((p) => xs.includes(p));
}

export function generateBoard(
  seed: number,
  tier: TierIndex,
  opts: { type?: CaseType; maxAttempts?: number; onReject?: (why: string) => void; world?: WorldCtx; puzzles?: readonly string[] } = {},
): Generated | null {
  const type = opts.type ?? pickType(seed, tier);
  const max = opts.maxAttempts ?? MAX_ATTEMPTS;
  const puzzles = parsePuzzles(opts.puzzles);
  for (let attempt = 0; attempt < max; attempt++) {
    const c = buildCase(seed, tier, type, attempt, opts.world, puzzles);
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
    // Decided 2026-10-25 (docs/69 §1.1): on a one-liar draw the night is dealt without its innocent
    // liar: the night above, accepted, with the second lie dropped (`oneLiarNight`). It must pass every
    // gate again as a night with one liar, or it's dealt again; a night with two keeps the deal it had.
    if (oneLiarDrawn(seed, tier, type, attempt, puzzles)) {
      const o = oneLiarNight(c);
      if (o) {
        const g = accepted(o);
        if ('why' in g) {
          opts.onReject?.(`one liar: ${g.why}`);
          continue;
        }
        return { kase: o, analysis: g.analysis, attempts: attempt + 1 };
      }
    }
    return { kase: c, analysis: a, attempts: attempt + 1 };
  }
  return null;
}

/** Every gate on a built night: the invariants, the rating, then `reject` on its analysis. */
function accepted(c: BoardCase): { why: string } | { analysis: Analysis } {
  const pre = invariantFailures(checkInvariants(c));
  if (pre.length > 0) return { why: `invariant: ${pre[0]}` };
  const rating = rate(c);
  if (!ratesAt(c, rating)) return { why: `rates ${rating}` };
  const analysis = analyse(c);
  const why = reject(c, analysis);
  return why ? { why } : { analysis };
}
