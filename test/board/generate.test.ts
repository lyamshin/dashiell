import { describe, expect, it } from 'vitest';
import {
  analyse,
  checkInvariants,
  generateBoard,
  invariantFailures,
  questionsOf,
  solve,
  techniquesUpTo,
  TIERS,
  typesFor,
  type TierIndex,
} from '../../src/gen/board/index.js';
import { PAR_FLOOR } from '../../src/gen/board/index.js';
import { renderCase } from '../../src/gen/board/render.js';
import { moves } from '../../src/gen/board/generate.js';
import { PAR_TARGET } from '../../src/gen/board/tiers.js';

/** docs/42 §1–2 and §5, on a small sweep: every tier, a dozen seeds. */

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const TIER_LIST: TierIndex[] = [0, 1, 2, 3, 4, 5];

describe.each(TIER_LIST)('tier %i', (tier) => {
  const cases = SEEDS.map((s) => generateBoard(s, tier));

  it('generates every seed', () => {
    expect(cases.every((g) => g !== null)).toBe(true);
  });

  it('holds every invariant', () => {
    for (const g of cases) expect(invariantFailures(checkInvariants(g!.kase))).toEqual([]);
  });

  it('is the size docs/41 rule 1 says', () => {
    const spec = TIERS[tier];
    for (const g of cases) {
      const c = g!.kase;
      expect(c.people.filter((p) => p.role === 'suspect')).toHaveLength(spec.suspects);
      expect(c.board.hours).toHaveLength(spec.hours);
      expect(c.places.filter((p) => !p.scene)).toHaveLength(spec.places);
      const used = new Set(Object.values(c.board.rows).flatMap((r) => Object.values(r)));
      for (const p of c.places) expect(used.has(p.id)).toBe(true);
    }
  });

  it('rates at its tier (Tatham): its techniques finish, the tier below’s don’t', () => {
    for (const g of cases) {
      const c = g!.kase;
      const all = questionsOf(c).map((q) => q.id);
      expect(solve(c, all, { techniques: techniquesUpTo(tier) }).done).toBe(true);
      if (tier > 0) expect(solve(c, all, { techniques: techniquesUpTo(tier - 1) }).done).toBe(false);
    }
  });

  it('has par in range and a budget of par plus the tier’s slack', () => {
    for (const g of cases) {
      const a = g!.analysis;
      expect(a.par).toBeGreaterThanOrEqual(PAR_FLOOR[tier]);
      expect(a.par).toBeLessThanOrEqual(PAR_TARGET[1]);
      expect(a.budget).toBe(a.par + TIERS[tier].slack);
    }
  });

  it('is wide at the bottom and narrow at the top (rule 17)', () => {
    for (const g of cases) {
      for (const r of g!.analysis.rivals) {
        if (tier <= 1) expect(r.routes.length).toBeGreaterThanOrEqual(2);
        if (tier === 5) expect(r.routes.length).toBe(1);
      }
    }
  });

  it('every clue on the path joins another, and no single question settles who (rule 15)', () => {
    for (const g of cases) expect(g!.analysis.interaction).toMatchObject({ ok: true, loners: [], settles: [] });
  });

  it('the path, replayed, solves it and names the culprit', () => {
    for (const g of cases) {
      const c = g!.kase;
      const s = solve(c, g!.analysis.path.map((p) => p.q), { techniques: techniquesUpTo(tier) });
      expect(s.done).toBe(true);
      expect(s.who).toBe(c.crime.culprit);
      expect(s.when).toBe(c.crime.hour);
    }
  });

  it('evenings are sensible: innocents move at most twice, and the scene’s first suggestion is the scene', () => {
    for (const g of cases) {
      const c = g!.kase;
      for (const p of c.people.filter((x) => x.role === 'suspect' && x.id !== c.crime.culprit)) {
        expect(moves(c.board.rows[p.id]!, c.board.hours)).toBeLessThanOrEqual(2);
      }
      expect(g!.analysis.suggested[0]?.q.startsWith('search:')).toBe(true);
      expect(g!.analysis.suggested.some((s) => s.q === `account:${c.client}`)).toBe(false);
    }
  });

  it('is deterministic by seed', () => {
    const again = generateBoard(1, tier);
    expect(JSON.stringify(again?.kase)).toBe(JSON.stringify(cases[0]?.kase));
  });

  it('renders every section the designer reads', () => {
    const g = cases[0]!;
    const text = renderCase(g.kase, g.analysis);
    for (const s of ['THE GIVENS', 'THE TRUE BOARD', 'THE MEANS', 'ACCOUNTS', "WATCHERS' LISTS", 'SCENE FINDS', 'THE LIES', 'THE DESIGNED PATH', 'RIVALS', 'TECHNIQUE RATING']) {
      expect(text).toContain(s);
    }
    expect(text).toContain('Invariants: all hold');
  });
});

describe('case types', () => {
  it('builds every type at the low tiers, and murder and lost pets from Soft-boiled', () => {
    expect(typesFor(0)).toEqual(['murder', 'lost-item', 'lost-pet']);
    expect(typesFor(4)).toEqual(['murder', 'lost-pet']);
    for (const t of TIER_LIST) {
      for (const type of typesFor(t)) {
        const g = generateBoard(7, t, { type });
        expect(g?.kase.type).toBe(type);
      }
    }
  });

  it('a small case says where the thing is now, and why', () => {
    const g = generateBoard(3, 2, { type: 'lost-item' })!;
    const s = solve(g.kase, g.analysis.path.map((p) => p.q), { techniques: techniquesUpTo(2) });
    expect(s.whereNow && s.why).toBe(true);
  });

  it('Hard-boiled builds both variants', () => {
    const variants = new Set(SEEDS.map((s) => generateBoard(s, 5)?.kase.variant));
    expect(variants).toEqual(new Set(['pair', 'face']));
  });

  it('analyse is stable on a generated case', () => {
    const g = generateBoard(5, 3)!;
    expect(analyse(g.kase).par).toBe(g.analysis.par);
  });
});
