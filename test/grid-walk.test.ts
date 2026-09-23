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
import { walk, walkTiered } from './grid-walk.js';

describe('the grid holds only what the notebook holds, off the oracle’s route', () => {
  it('on every page of forty wandering runs at difficulty 2, conflicts included', () => {
    const r = walk(2, true);
    expect(r.problems.slice(0, 20)).toEqual([]);
    // The wanderer takes accounts and meets the lies: conflicts are drawn.
    expect(r.conflicts).toBeGreaterThan(0);
  });

  it('on every page of forty oracle runs at difficulties 1 and 3', () => {
    const r1 = walk(1, false);
    const r3 = walk(3, false);
    expect([...r1.problems, ...r3.problems].slice(0, 20)).toEqual([]);
  });
});

describe('M9: the grid holds only what the notebook holds, with the logic game in it', () => {
  it('on every page of Medium and Hard-boiled runs with facts put to people and strangers linked', () => {
    const m = walkTiered(4, 2, 12);
    const h = walkTiered(5, 2, 8);
    expect([...m.problems, ...h.problems].slice(0, 20)).toEqual([]);
    // The walk reaches the new pieces: what was said under pressure, links, margins.
    expect(m.said + h.said).toBeGreaterThan(0);
    expect(m.linked + h.linked).toBeGreaterThan(0);
  }, 240_000);

  it('at Poached and Soft-boiled, where lies begin and nothing is flagged', () => {
    const p = walkTiered(2, 2, 10);
    const s = walkTiered(3, 2, 10);
    expect([...p.problems, ...s.problems].slice(0, 20)).toEqual([]);
  }, 240_000);
});
