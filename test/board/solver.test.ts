import { describe, expect, it } from 'vitest';
import { generateBoard, questionsOf, solve, techniquesUpTo, type BoardCase } from '../../src/gen/board/index.js';
import { key } from '../../src/gen/board/solver.js';
import { seed3 } from '../../src/gen/board/fixtures/seed3.js';

/** docs/42 §2: the named techniques, one at a time. */

const all = (c: BoardCase) => questionsOf(c).map((q) => q.id);
const find = (tier: 0 | 1 | 2 | 3 | 4 | 5, pred: (c: BoardCase) => boolean): BoardCase => {
  for (let s = 1; s < 60; s++) {
    const g = generateBoard(s, tier);
    if (g && pred(g.kase)) return g.kase;
  }
  throw new Error('no such case');
};

describe('the solver', () => {
  it('read-off and collision: a list places the innocent and breaks the liar', () => {
    const c = seed3();
    const s = solve(c, ['list:hargrove', 'account:vitale'], { techniques: techniquesUpTo(0) });
    expect(s.status.get(key('vitale', 9))?.s).toBe('broken');
    expect(s.status.get(key('vitale', 8))?.s).toBe('trusted');
  });

  it('two agreeing accounts are true below Hard-boiled, and their company is exhaustive (a third account)', () => {
    const c = seed3();
    const s = solve(c, ['account:steinbach', 'account:crowninshield', 'account:vitale'], { techniques: techniquesUpTo(4) });
    expect(s.status.get(key('steinbach', 9))?.s).toBe('trusted');
    // Their company at nine names Vitale at the Velvet Room, which breaks his "home".
    expect(s.status.get(key('vitale', 9))?.s).toBe('broken');
  });

  it('access is only a technique from Coddled', () => {
    const c = seed3();
    const q = ['search:table', 'list:rafferty'];
    expect(solve(c, q, { techniques: techniquesUpTo(0) }).accessNo.size).toBe(0);
    expect([...solve(c, q, { techniques: techniquesUpTo(1) }).accessNo]).toEqual(['crowninshield']);
  });

  it('confrontation: an innocent admits and is placed; without the technique he stays open', () => {
    const c = find(2, (k) => k.lies.some((l) => l.kind === 'secret'));
    const lie = c.lies.find((l) => l.kind === 'secret')!;
    const q = all(c);
    const with2 = solve(c, q, { techniques: techniquesUpTo(2) });
    const with1 = solve(c, q, { techniques: techniquesUpTo(1) });
    expect(with2.cleared.has(lie.person)).toBe(true);
    expect(with1.cleared.has(lie.person)).toBe(false);
  });

  it('time window: the last sighting of the victim away from the scene narrows two hours to one', () => {
    const c = find(3, (k) => k.type === 'murder');
    const q = all(c);
    expect(solve(c, q, { techniques: techniquesUpTo(3) }).possibleHours).toEqual([c.crime.hour]);
    expect(solve(c, q, { techniques: techniquesUpTo(2) }).possibleHours).toEqual(c.crime.window);
  });

  it('side remark: only Medium may break an unwatched "home" with a remark in passing', () => {
    const c = find(4, () => true);
    const k = key(c.crime.culprit, c.crime.hour);
    expect(solve(c, all(c), { techniques: techniquesUpTo(4) }).status.get(k)?.tech).toBe('side-remark');
    expect(solve(c, all(c), { techniques: techniquesUpTo(3) }).status.get(k)).toBeUndefined();
  });

  it('pair: the story falls when one half is placed elsewhere, and agreeing is no alibi at Hard-boiled', () => {
    const c = find(5, (k) => k.variant === 'pair');
    const k = key(c.crime.culprit, c.crime.hour);
    const hb = solve(c, all(c), { techniques: techniquesUpTo(5) });
    expect(hb.status.get(k)?.tech).toBe('pair');
    expect(solve(c, all(c), { techniques: techniquesUpTo(4) }).status.get(k)).toBeUndefined();
  });

  it('face: a watcher’s stranger is resolved only by meeting people', () => {
    const c = find(5, (k) => k.variant === 'face');
    const k = key(c.crime.culprit, c.crime.hour);
    expect(solve(c, all(c), { techniques: techniquesUpTo(5) }).status.get(k)?.tech).toBe('face');
    expect(solve(c, all(c), { techniques: techniquesUpTo(4) }).status.get(k)).toBeUndefined();
    const bar = c.lists.find((l) => (l.entries[c.crime.hour] ?? []).some((e) => 'look' in e))!;
    const culpritAccount = `account:${c.crime.culprit}`;
    expect(solve(c, [`list:${bar.watcher}`], { techniques: techniquesUpTo(5) }).status.get(k)).toBeUndefined();
    expect(solve(c, [`list:${bar.watcher}`, culpritAccount], { techniques: techniquesUpTo(5) }).status.get(k)?.s).toBe('broken');
  });

  it('never uses a refusal as a tell: confronting the culprit adds nothing', () => {
    const c = seed3();
    const base = ['search:table', 'list:rafferty', 'account:marchetti'];
    const a = solve(c, base, { techniques: techniquesUpTo(4) });
    const b = solve(c, [...base, 'confront:marchetti@9'], { techniques: techniquesUpTo(4) });
    expect(a.done).toBe(false);
    expect(b.done).toBe(false);
  });
});
