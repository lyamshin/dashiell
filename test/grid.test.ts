/**
 * "Where they were" — the deduction grid.
 *
 * The one rule: the grid never shows anything the notebook does not hold. On
 * every page of forty seeds, played by the oracle and by the wandering player,
 * every entry traces to a found clue that makes exactly that placement, to an
 * account taken down, or to a briefing sentence the notebook prints; every
 * source sentence is word for word in the notebook; the band is the
 * notebook's window; every anchor and every rule traces the same way. And the
 * pencil is never a fact.
 */


import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { buildView } from '../src/game/derive.js';
import { applyMark, gridFrom, isConflict, markOf, placeAbbrevs, tickLabel } from '../src/game/grid.js';
import { parseMarkSpec, renderGridText } from '../src/game/grid-text.js';
import { playOracle } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { deserializeRun, serializeRun } from '../src/game/storage.js';
import { SEEDS, walk } from './grid-walk.js';

describe('the grid holds only what the notebook holds', () => {
  it('on every page of forty oracle runs at difficulty 2', () => {
    const r = walk(2, false);
    expect(r.problems.slice(0, 20)).toEqual([]);
    expect(r.pages).toBeGreaterThan(400);
    expect(r.entries).toBeGreaterThan(1000);
  });
});

describe('the grid on seed 3', () => {
  const view = buildView(generateCase(3, { difficulty: 2 }));
  const run = playOracle(view);
  const grid = gridFrom(view, run.state);
  const row = (name: string) => [...grid.rows, ...grid.fixtures].find((r) => r.name === name);

  it('has twelve columns, 6 to 11:30', () => {
    expect(grid.ticks.map((t) => t.label)).toEqual([
      '6', '6:30', '7', '7:30', '8', '8:30', '9', '9:30', '10', '10:30', '11', '11:30',
    ]);
    expect(tickLabel(8)).toBe('10');
  });

  it('narrows the window to ten o’clock and marks it', () => {
    expect(grid.window?.ticks).toEqual([8]);
    expect(grid.crimeTick).toBe(8);
    expect(grid.anchors.map((a) => [a.anchorId, a.tick])).toEqual([
      ['piano-lesson', 7],
      ['el-train', 8],
    ]);
  });

  it('puts Grasso not at the third floor on Marchetti’s word and Kreuzer’s', () => {
    const grasso = row('Grasso');
    const at10 = grasso?.cells[8]?.entries ?? [];
    expect(at10.map((e) => [e.placeId, e.present, e.source, e.by])).toEqual([
      ['walkup-flat', false, 'witness', 'p-s2'],
      ['walkup-flat', false, 'witness', 'p-f2'],
    ]);
    expect(grasso?.cells[8]?.conflict).toBe(false);
  });

  it('draws the victim alive, then the window, then dead', () => {
    const sweeney = row('Sweeney');
    expect(sweeney?.kind).toBe('victim');
    expect(sweeney?.cells.map((c) => c.life)).toEqual([
      'before', 'before', 'before', 'before', 'before', 'before', 'before', 'before', 'window', 'after', 'after', 'after',
    ]);
  });

  it('highlights the scene in the legend', () => {
    expect(grid.places.find((p) => p.scene)?.id).toBe('res-suite');
  });

  it('writes the designer’s rule', () => {
    expect(grid.rules.map((r) => r.text)).toContain('Hanrahan: third floor, 10:00–10:30 (Kreuzer saw her)');
  });

  it('prints for the transcript', () => {
    const text = renderGridText(view, run.state);
    expect(text).toContain('WHERE THEY WERE');
    expect(text).toContain('-third:M');
    expect(text).toContain('RULES');
  });
});

describe('conflicts', () => {
  it('two places at once, or an at against a not-at', () => {
    const e = (placeId: string, present: boolean) =>
      ({ placeId, present, source: 'witness' as const, clueId: 'x' });
    expect(isConflict([e('a', true), e('a', true)])).toBe(false);
    expect(isConflict([e('a', true), e('b', true)])).toBe(true);
    expect(isConflict([e('a', true), e('a', false)])).toBe(true);
    expect(isConflict([e('a', true), e('b', false)])).toBe(false);
    expect(isConflict([e('a', false), e('b', false)])).toBe(false);
  });
});

describe('the pencil', () => {
  const view = buildView(generateCase(3, { difficulty: 2 }));
  const start = newRun(view, { detectiveName: 'Dashiell' });

  it('holds one "at" and several "not at", and clears', () => {
    let s = applyMark(start, 'p-s1', 8, { kind: 'at', placeId: 'res-suite' });
    expect(markOf(s, 'p-s1', 8)).toEqual({ at: 'res-suite' });
    s = applyMark(s, 'p-s1', 8, { kind: 'not', placeId: 'walkup-flat' });
    s = applyMark(s, 'p-s1', 8, { kind: 'not', placeId: 'speakeasy' });
    expect(markOf(s, 'p-s1', 8)).toEqual({ at: 'res-suite', notAt: ['walkup-flat', 'speakeasy'] });
    // "Not at" the place pencilled as "at" rubs the "at" out.
    s = applyMark(s, 'p-s1', 8, { kind: 'not', placeId: 'res-suite' });
    expect(markOf(s, 'p-s1', 8)).toEqual({ notAt: ['walkup-flat', 'speakeasy', 'res-suite'] });
    // "At" a place pencilled "not at" takes it off the not-list.
    s = applyMark(s, 'p-s1', 8, { kind: 'at', placeId: 'speakeasy' });
    expect(markOf(s, 'p-s1', 8)).toEqual({ at: 'speakeasy', notAt: ['walkup-flat', 'res-suite'] });
    s = applyMark(s, 'p-s1', 8, { kind: 'clear' });
    expect(markOf(s, 'p-s1', 8)).toBeUndefined();
    expect(s.marks).toEqual({});
  });

  it('is free and survives a step', () => {
    const s = applyMark(start, view.client.id, 3, { kind: 'at', placeId: 'speakeasy' });
    expect(s.actionsUsed).toBe(start.actionsUsed);
    expect(s.log).toBe(start.log);
    const next = stepInput(s, 'go the suite', view).state;
    expect(markOf(next, view.client.id, 3)).toEqual({ at: 'speakeasy' });
  });

  it('is never a fact', () => {
    const run = playOracle(view);
    let s = run.state;
    const before = gridFrom(view, s);
    for (const row of [...before.rows, ...before.fixtures]) {
      for (let t = 0; t < 12; t++) {
        s = applyMark(s, row.personId, t, { kind: 'at', placeId: 'ferry-slip' });
        s = applyMark(s, row.personId, t, { kind: 'not', placeId: 'walkup-flat' });
      }
    }
    const after = gridFrom(view, s);
    const strip = (g: typeof before) =>
      JSON.stringify({
        ...g,
        places: g.places.map((p) => ({ ...p, used: false })),
        rows: g.rows.map((r) => ({ ...r, cells: r.cells.map(({ mark: _m, ...c }) => c) })),
        fixtures: g.fixtures.map((r) => ({ ...r, cells: r.cells.map(({ mark: _m, ...c }) => c) })),
      });
    expect(strip(after)).toBe(strip(before));
    expect(after.rows[1]?.cells[0]?.mark).toEqual({ at: 'ferry-slip', notAt: ['walkup-flat'] });
  });

  it('is saved with the run, and an older save loads with a clean grid', () => {
    const s = applyMark(start, 'p-s1', 8, { kind: 'not', placeId: 'walkup-flat' });
    const back = deserializeRun(serializeRun(s));
    expect(back?.marks).toEqual({ 'p-s1': { '8': { notAt: ['walkup-flat'] } } });
    const { marks: _drop, ...old } = s;
    expect(deserializeRun(JSON.stringify(old))?.marks).toBeUndefined();
    expect(deserializeRun(JSON.stringify({ ...old, marks: 'nonsense' }))?.marks).toBeUndefined();
  });

  it('reads the transcript tool’s marks', () => {
    expect(parseMarkSpec(view, 'Grasso 10 at the suite')).toEqual({
      personId: 'p-s1',
      tick: 8,
      action: { kind: 'at', placeId: 'res-suite' },
    });
    expect(parseMarkSpec(view, 'Grasso 9:30 not third floor')?.action).toEqual({
      kind: 'not',
      placeId: 'walkup-flat',
    });
    expect(parseMarkSpec(view, 'Nobody 10 at the suite')).toBeNull();
  });
});

describe('place names on the grid', () => {
  it('are short and unique', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      const abbrevs = [...placeAbbrevs(view.places).values()];
      expect(new Set(abbrevs.map((a) => a.toLowerCase())).size).toBe(abbrevs.length);
      for (const a of abbrevs) expect(a.length).toBeLessThanOrEqual(8);
    }
  });
});
