import { describe, expect, it } from 'vitest';
import type { Fact, Id } from '../src/gen/types.js';
import {
  crimeTicks,
  culpritOf,
  placesAt,
  solve,
  whyNot,
  whyTick,
  type SolverProblem,
  type SolverRule,
} from '../src/gen/logic/solver.js';

/**
 * M9 — the deduction solver, rule type by rule type, on a grid small enough
 * to check by hand: three suspects (A, B and K), four places (the scene S,
 * then P, Q and R), the twelve half hours of the evening.
 *
 * Blocks: S and P on block 0, Q on block 1, R on block 2. So R is across the
 * neighbourhood from S and P, and Q is a walk from everywhere.
 */
const SUSPECTS = ['A', 'B', 'K'];
const PLACES = ['S', 'P', 'Q', 'R'];
const BLOCKS: Record<Id, number> = { S: 0, P: 0, Q: 1, R: 2 };

function problem(rules: (Fact[] | SolverRule)[], opts: Partial<SolverProblem> = {}): SolverProblem {
  return {
    suspects: SUSPECTS,
    places: PLACES,
    blocks: BLOCKS,
    scene: 'S',
    victimId: 'V',
    murder: true,
    rules: rules.map((r, i) => (Array.isArray(r) ? { id: `r${i}`, facts: r } : r)),
    exactlyOne: true,
    probe: false,
    ...opts,
  };
}

const at = (personId: Id, place: Id, tick: number): Fact => ({ kind: 'personAt', personId, place, tick });
const coroner = (lo: number, hi: number): Fact => ({ kind: 'timeOfDeath', ticks: [lo, hi] });

describe('M9 solver: one rule at a time', () => {
  it('fixes a placement, and strikes a negative one', () => {
    const st = solve(problem([[at('A', 'P', 4)], [{ kind: 'personNotAt', personId: 'B', place: 'Q', tick: 4 }]])).state;
    expect(placesAt(st, 'A', 4)).toEqual(['P']);
    expect(placesAt(st, 'B', 4)).toEqual(['S', 'P', 'R']);
    expect(whyNot(st, 'A', 4, 'S')?.depth).toBe(1);
  });

  it('reads an absence as a strike for everybody not excepted', () => {
    const st = solve(problem([[{ kind: 'absentFrom', place: 'Q', ticks: [3, 4], except: ['B'] }]])).state;
    expect(placesAt(st, 'A', 3)).not.toContain('Q');
    expect(placesAt(st, 'K', 4)).not.toContain('Q');
    expect(placesAt(st, 'B', 4)).toContain('Q');
  });

  it('travel: across the neighbourhood is out of reach in a half hour', () => {
    const st = solve(problem([[at('A', 'R', 3)]])).state;
    expect(placesAt(st, 'A', 4)).toEqual(['Q', 'R']);
    expect(placesAt(st, 'A', 2)).toEqual(['Q', 'R']);
    // Placement plus the map: two premises, depth 2.
    expect(whyNot(st, 'A', 4, 'S')?.depth).toBe(2);
  });

  it('a description resolves when only one person it fits could have been there', () => {
    const described: Fact = {
      kind: 'describedAt',
      description: { features: { gender: 'm' }, text: 'a man', matches: ['A', 'B'] },
      place: 'Q',
      tick: 5,
    };
    const alone = solve(problem([[described]])).state;
    expect(placesAt(alone, 'A', 5)).toContain('S');
    const withB = solve(problem([[described], [at('B', 'P', 5)]])).state;
    expect(placesAt(withB, 'A', 5)).toEqual(['Q']);
    expect(whyNot(withB, 'A', 5, 'S')?.depth).toBe(2);
  });

  it('a count, once filled, closes the room to everybody else', () => {
    const st = solve(problem([[{ kind: 'countAt', place: 'Q', tick: 5, count: 1 }], [at('B', 'Q', 5)]])).state;
    expect(placesAt(st, 'A', 5)).not.toContain('Q');
    expect(placesAt(st, 'K', 5)).not.toContain('Q');
  });

  it('an anchored sighting lands on the grid only once the anchor is timed', () => {
    const sighting: Fact = { kind: 'personAtAnchor', personId: 'A', place: 'Q', anchorId: 'el' };
    const margin = solve(problem([[sighting]])).state;
    expect(placesAt(margin, 'A', 6)).toHaveLength(4);
    const timed = solve(problem([[sighting], [{ kind: 'anchorAt', anchorId: 'el', ticks: [6] }]])).state;
    expect(placesAt(timed, 'A', 6)).toEqual(['Q']);
  });

  it('the conditional: anybody there knew; this one did not', () => {
    const premise: Fact = { kind: 'anchorKnowledge', anchorId: 'fight', place: 'P', ticks: [7], knowledge: 'how it ended' };
    const test: Fact = { kind: 'knows', personId: 'B', anchorId: 'fight', knows: false };
    const st = solve(problem([[premise], [test]])).state;
    expect(placesAt(st, 'B', 7)).not.toContain('P');
    expect(whyNot(st, 'B', 7, 'P')?.depth).toBe(2);
  });

  it('together and apart', () => {
    const st = solve(
      problem([
        [{ kind: 'together', personIds: ['A', 'B'], ticks: [2] }],
        [at('A', 'P', 2)],
        [{ kind: 'apart', personIds: ['A', 'K'], ticks: [2] }],
      ]),
    ).state;
    expect(placesAt(st, 'B', 2)).toEqual(['P']);
    expect(placesAt(st, 'K', 2)).not.toContain('P');
  });
});

describe('M9 solver: the crime, accounts, confessions and hypotheses', () => {
  it('pins the half hour and names the culprit by elimination', () => {
    const st = solve(
      problem([[coroner(4, 5)], [{ kind: 'victimAliveAt', tick: 4 }], [at('A', 'P', 5)], [at('B', 'Q', 5)]]),
    ).state;
    expect(crimeTicks(st)).toEqual([5]);
    expect(whyTick(st)?.rules.length).toBeGreaterThan(0);
    const who = culpritOf(st);
    expect(who?.id).toBe('K');
    expect(placesAt(st, 'K', 5)).toEqual(['S']);
  });

  it('takes an account only once something corroborates it, and never a contradicted one', () => {
    const account: Fact = { kind: 'claims', personId: 'A', place: 'Q', ticks: [4, 5] };
    const bare = solve(problem([[coroner(5, 5)], [account]])).state;
    expect(placesAt(bare, 'A', 5)).toContain('S');
    const vouched = solve(problem([[coroner(5, 5)], [account], [at('A', 'Q', 4)]])).state;
    expect(placesAt(vouched, 'A', 5)).toEqual(['Q']);
    const broken = solve(problem([[coroner(5, 5)], [account], [at('A', 'Q', 4)], [at('A', 'P', 5)]])).state;
    expect(placesAt(broken, 'A', 5)).toEqual(['P']);
  });

  it('a confession comes only when the lie is broken and the account is held', () => {
    const account: SolverRule = { id: 'acc', facts: [{ kind: 'claims', personId: 'B', place: 'R', ticks: [5] }] };
    const confession: SolverRule = {
      id: 'confess:B:5',
      facts: [at('B', 'Q', 5)],
      when: { personId: 'B', place: 'R', ticks: [5], requires: 'acc' },
    };
    const breaker: Fact = { kind: 'personNotAt', personId: 'B', place: 'R', tick: 5 };
    const noAccount = solve(problem([[breaker], confession])).state;
    expect(placesAt(noAccount, 'B', 5)).toContain('S');
    const unbroken = solve(problem([account, confession])).state;
    expect(placesAt(unbroken, 'B', 5)).toContain('S');
    const both = solve(problem([account, [breaker], confession])).state;
    expect(placesAt(both, 'B', 5)).toEqual(['Q']);
  });

  it('two descriptions of two people in two rooms clear both, but only by a hypothesis', () => {
    const man = { features: { gender: 'm' as const }, text: 'a man', matches: ['A', 'B'] };
    const rules: Fact[][] = [
      [coroner(6, 6)],
      [{ kind: 'describedAt', description: man, place: 'P', tick: 6 }],
      [{ kind: 'describedAt', description: man, place: 'Q', tick: 6 }],
    ];
    const flat = solve(problem(rules)).state;
    expect(placesAt(flat, 'A', 6)).toContain('S');
    expect(culpritOf(flat)).toBeNull();
    const probed = solve(problem(rules, { probe: true })).state;
    expect(placesAt(probed, 'A', 6)).not.toContain('S');
    expect(placesAt(probed, 'B', 6)).not.toContain('S');
    expect(probed.usedProbe).toBe(true);
    expect(culpritOf(probed)?.id).toBe('K');
    expect(culpritOf(probed)?.why.hyp).toBe(true);
  });

  it('keeps a lie out of the grid until something hard settles it', () => {
    // A says Q for the crime's half hour and was at P. B saw A at P. The
    // account is struck before it can stand, whatever order it came in.
    const st = solve(
      problem([[coroner(3, 3)], [{ kind: 'claims', personId: 'A', place: 'Q', ticks: [3] }], [at('A', 'P', 3)]]),
    ).state;
    expect(placesAt(st, 'A', 3)).toEqual(['P']);
    expect(st.contradiction).toBeNull();
  });
});
