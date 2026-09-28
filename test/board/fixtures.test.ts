import { describe, expect, it } from 'vitest';
import { seed3, seed3Repaired, SEED3_GOLDEN_PATH } from '../../src/gen/board/fixtures/seed3.js';
import { lostWatch, LOST_WATCH_GOLDEN_PATH } from '../../src/gen/board/fixtures/lost-watch.js';
import { analyse, checkInvariants, solve, techniquesUpTo } from '../../src/gen/board/index.js';
import { renderCase } from '../../src/gen/board/render.js';

/**
 * docs/42 §3: the two hand-built goldens as fixtures. Where the solver and a
 * golden disagree, the test pins the solver's answer and says which is wrong
 * (docs/42 Built has the long form).
 */

describe('golden: seed 3 at Medium', () => {
  const c = seed3();
  const a = analyse(c);

  it('the golden path solves it, and the solver finds a path inside it', () => {
    const s = solve(c, SEED3_GOLDEN_PATH, { techniques: techniquesUpTo(c.tier) });
    expect(s.done).toBe(true);
    expect(s.who).toBe('marchetti');
    expect(s.when).toBe(9);
    for (const step of a.path) expect(SEED3_GOLDEN_PATH).toContain(step.q);
  });

  it('par is 4 plus the motive search, not 7: the golden’s Vitale steps are a detour', () => {
    // Hargrove's list already has Vitale at nine, so asking him and putting it to him (golden
    // steps 4–5) clears nobody new, and Marchetti's refusal (step 7) adds nothing the report needs.
    expect(a.par).toBe(4);
    expect(a.motive).toBe('search:filebox');
    expect(a.path.map((s) => s.q)).toEqual(['search:table', 'list:hargrove', 'list:rafferty', 'account:marchetti']);
    const without = SEED3_GOLDEN_PATH.filter((q) => !['account:vitale', 'confront:vitale@9', 'confront:marchetti@9'].includes(q));
    expect(solve(c, without, { techniques: techniquesUpTo(c.tier) }).done).toBe(true);
  });

  it('the rivals are Vitale and Steinbach, two routes each', () => {
    expect(a.rivals.map((r) => r.id).sort()).toEqual(['steinbach', 'vitale']);
    for (const r of a.rivals) expect(r.routes.length).toBe(2);
  });

  it('it rates Raw as written: Rafferty’s “nine and ten, nobody but me” is a list, and breaks Marchetti directly', () => {
    expect(a.rating).toBe(0);
  });

  it('repaired (Rafferty up to bed at half past eight) it rates Medium: only the side remark breaks “home”', () => {
    const r = seed3Repaired();
    const ar = analyse(r);
    expect(ar.rating).toBe(4);
    expect(solve(r, SEED3_GOLDEN_PATH, { techniques: techniquesUpTo(3) }).done).toBe(false);
    expect(ar.par).toBe(4);
    expect(ar.path.some((s) => s.techniques.includes('side-remark'))).toBe(true);
  });

  it('holds its invariants', () => {
    const inv = checkInvariants(c);
    expect(inv.everyLieCollides).toEqual([]);
    expect(inv.unique).toEqual([]);
    expect(inv.leadTime).toEqual([]);
    expect(inv.truthful).toEqual([]);
  });
});

describe('golden: the lost watch at Poached', () => {
  const c = lostWatch();
  const a = analyse(c);

  it('the golden path does not finish: nothing it asks clears Mrs. Pulaski', () => {
    // The golden clears her because "nothing collides with her account". The only thing that
    // could collide with it is Mr. Pulaski, whom the path never asks.
    const s = solve(c, LOST_WATCH_GOLDEN_PATH, { techniques: techniquesUpTo(c.tier) });
    expect(s.done).toBe(false);
    expect(s.cleared.has('pulaski')).toBe(false);
    const fixed = solve(c, [...LOST_WATCH_GOLDEN_PATH, 'account:mrpulaski'], { techniques: techniquesUpTo(c.tier) });
    expect(fixed.done).toBe(true);
    expect(fixed.who).toBe('oskar');
    expect(fixed.when).toBe(10);
  });

  it('par is 5, not 6: Mulcahy alone breaks Oskar and clears Szabo, and Dombrowski is not needed', () => {
    expect(a.par).toBe(5);
    expect(a.path.map((s) => s.q).sort()).toEqual(['account:mrpulaski', 'account:oskar', 'account:pulaski', 'list:mulcahy', 'search:mantel']);
  });

  it('Mr. Pulaski can only be asked once his wife has named him', () => {
    const s = solve(c, ['search:mantel', 'list:mulcahy', 'account:oskar', 'account:mrpulaski'], { techniques: techniquesUpTo(c.tier) });
    expect(s.cleared.has('pulaski')).toBe(false);
  });

  it('the rivals are Mrs. Pulaski and Szabo', () => {
    expect(a.rivals.map((r) => r.id).sort()).toEqual(['pulaski', 'szabo']);
    const pulaski = a.rivals.find((r) => r.id === 'pulaski');
    expect(pulaski?.routes).toEqual([['account:pulaski', 'account:mrpulaski']]);
  });

  it('it rates Raw: Szabo falls to two lists, so his confrontation is never needed', () => {
    expect(a.rating).toBe(0);
  });

  it('the golden’s own mistakes show as invariant failures', () => {
    const inv = checkInvariants(c);
    // Szabo's "home to bed at nine" covers three hours (rule 9 allows one).
    expect(inv.oneHourLies).toEqual(['szabo lies about 3 hours']);
    expect(inv.everyLieCollides).toEqual([]);
    expect(inv.unique).toEqual([]);
  });

  it('renders for the designer', () => {
    const text = renderCase(c, a);
    expect(text).toContain('THE DESIGNED PATH');
    expect(text).toContain('Mr. Pulaski');
  });
});
