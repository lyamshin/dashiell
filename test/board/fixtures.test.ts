import { describe, expect, it } from 'vitest';
import { seed3, seed3Repaired, SEED3_GOLDEN_PATH, SEED3_REPAIRED_PATH } from '../../src/gen/board/fixtures/seed3.js';
import { lostWatch, lostWatchRepaired, LOST_WATCH_GOLDEN_PATH } from '../../src/gen/board/fixtures/lost-watch.js';
import { analyse, checkInvariants, invariantFailures, questionsOf, refusalShortcut, solve, techniquesUpTo } from '../../src/gen/board/index.js';
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
    // 4a.2: in the order the player is pointed. The label sends you to Rafferty's, her list names
    // Marchetti, and Marchetti's "the Velvet Room at ten" sends you to Hargrove.
    expect(a.path.map((s) => s.q)).toEqual(['search:table', 'list:rafferty', 'account:marchetti', 'list:hargrove']);
    expect(a.path.map((s) => s.pointedBy)).toEqual(['givens', 'search:table', 'list:rafferty', 'account:marchetti']);
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
    expect(solve(r, SEED3_REPAIRED_PATH, { techniques: techniquesUpTo(3) }).done).toBe(false);
    expect(ar.path.some((s) => s.techniques.includes('side-remark'))).toBe(true);
  });

  it('holds its invariants as written, bar the rules decided since', () => {
    const inv = checkInvariants(c);
    expect(inv.everyLieCollides).toEqual([]);
    expect(inv.unique).toEqual([]);
    expect(inv.leadTime).toEqual([]);
    expect(inv.truthful).toEqual([]);
    expect(inv.windowFits).toEqual([]);
    // Hargrove's list places Vitale in the back room, so his lie never matters; his admission is
    // taken on his word; and he and Marchetti are both at Rafferty's at seven and the bar at ten.
    expect(inv.lieMatters[0]).toContain('list:hargrove');
    expect(inv.admissionChecked).toHaveLength(2);
    expect(inv.liarsApart).toEqual(['marchetti and vitale both claim rafferty at 7', 'marchetti and vitale both claim velvet at 10']);
  });
});

describe('golden: seed 3 repaired to the decisions of 2026-09-28', () => {
  const c = seed3Repaired();
  const a = analyse(c);

  it('holds every invariant', () => {
    expect(invariantFailures(checkInvariants(c, a))).toEqual([]);
  });

  it('par is 7 again, the golden’s count: Vitale’s lie matters, and Shoes checks his admission', () => {
    expect(a.par).toBe(7);
    expect([...a.path.map((s) => s.q)].sort()).toEqual([...SEED3_REPAIRED_PATH].sort());
    expect(solve(c, SEED3_REPAIRED_PATH, { techniques: techniquesUpTo(4) }).done).toBe(true);
  });

  it('Vitale’s admission clears nobody until Shoes is asked, and Shoes can’t be asked before it', () => {
    const T = techniquesUpTo(4);
    const all = questionsOf(c).map((q) => q.id);
    expect(solve(c, all.filter((q) => q !== 'account:shoes'), { techniques: T, forceHours: [9] }).cleared.has('vitale')).toBe(false);
    expect(solve(c, all.filter((q) => q !== 'confront:vitale@9'), { techniques: T, forceHours: [9] }).cleared.has('vitale')).toBe(false);
    expect(solve(c, all, { techniques: T, forceHours: [9] }).cleared.has('vitale')).toBe(true);
  });

  it('the refusal shortcut ties par', () => {
    expect(refusalShortcut(c, a.par)).toMatchObject({ fails: false, gain: 0 });
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

describe('golden: the lost watch repaired to the decisions of 2026-09-28', () => {
  const c = lostWatchRepaired();
  const a = analyse(c);

  it('holds every invariant, and rates Poached', () => {
    expect(invariantFailures(checkInvariants(c, a))).toEqual([]);
    expect(a.rating).toBe(2);
  });

  it('Szabo refuses, and only Kasper’s account clears him; Oskar’s crack says where the watch is', () => {
    expect(a.par).toBe(8);
    expect(a.path.map((s) => s.q)).toContain('account:kasper');
    expect(a.path.map((s) => s.q)).toContain('confront:oskar@10');
    const T = techniquesUpTo(2);
    const all = questionsOf(c).map((q) => q.id);
    expect(solve(c, all.filter((q) => q !== 'account:kasper'), { techniques: T }).cleared.has('szabo')).toBe(false);
  });

  it('Mulcahy lists Lou, whom the case puts in his booth; leave him out and the list is incomplete (4a.2)', () => {
    const cut = lostWatchRepaired();
    const m = cut.lists.find((l) => l.watcher === 'mulcahy')!;
    for (const h of Object.keys(m.entries)) m.entries[Number(h)] = m.entries[Number(h)]!.filter((e) => !('other' in e));
    expect(checkInvariants(cut).listsComplete).toHaveLength(4);
    expect(renderCase(c, a)).toContain('Lou the bookmaker in his booth');
  });

  it('the refusal shortcut names nobody: two of them won’t own up', () => {
    expect(refusalShortcut(c, a.par).fails).toBe(true);
  });
});
