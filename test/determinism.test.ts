import { describe, expect, it } from 'vitest';
import { BRANCH_DEPTH, generateCase } from '../src/gen/index.js';

describe('determinism', () => {
  it('produces byte-identical JSON for the same seed and difficulty', () => {
    for (const seed of [1, 7, 42, 199, 1000]) {
      for (const difficulty of [1, 2, 3] as const) {
        const a = JSON.stringify(generateCase(seed, { difficulty }));
        const b = JSON.stringify(generateCase(seed, { difficulty }));
        expect(a).toBe(b);
      }
    }
  });

  it('produces different cases for different seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) seen.add(JSON.stringify(generateCase(seed)));
    expect(seen.size).toBe(30);
  });

  it('produces different cases at different difficulties', () => {
    for (const seed of [1, 7, 42]) {
      const seen = new Set<string>();
      for (const difficulty of [1, 2, 3] as const) {
        seen.add(JSON.stringify(generateCase(seed, { difficulty })));
      }
      expect(seen.size).toBe(3);
    }
  });

  it('defaults to difficulty 2', () => {
    expect(generateCase(9).difficulty).toBe(2);
    expect(JSON.stringify(generateCase(9))).toBe(JSON.stringify(generateCase(9, { difficulty: 2 })));
  });

  it('honours a custom detective name without changing the case', () => {
    const plain = generateCase(5);
    const named = generateCase(5, { detectiveName: 'Marlowe' });
    expect(named.detectiveName).toBe('Marlowe');
    expect(JSON.stringify({ ...named, detectiveName: 'Humphrey' })).toBe(JSON.stringify(plain));
  });
});

describe('the difficulty dials', () => {
  it('sets the budget from the difficulty', () => {
    expect(generateCase(4, { difficulty: 1 }).budget).toBe(22);
    expect(generateCase(4, { difficulty: 2 }).budget).toBe(20);
    expect(generateCase(4, { difficulty: 3 }).budget).toBe(18);
  });

  it('holds every rule at every difficulty', () => {
    for (const difficulty of [1, 3] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const c = generateCase(seed, { difficulty });
        expect(c.findable.length).toBeGreaterThanOrEqual(28);
        expect(c.findable.length).toBeLessThanOrEqual(32);
        expect(c.budget - c.par).toBeGreaterThanOrEqual(6);
        const innocents = c.people.filter(
          (p) => p.kind === 'suspect' && p.id !== c.solution.killerId,
        );
        const liars = innocents.filter((p) =>
          (c.schedules.find((s) => s.personId === p.id)?.lies ?? []).includes(
            c.solution.murderTick,
          ),
        );
        expect(liars.length).toBeGreaterThanOrEqual(difficulty === 3 ? 3 : 2);
        const depths = new Map<string, number>();
        for (const cl of c.findable) {
          if (cl.role !== 'noise' || !cl.branchId) continue;
          depths.set(cl.branchId, (depths.get(cl.branchId) ?? 0) + 1);
        }
        for (const [, depth] of depths) {
          expect(depth).toBeGreaterThanOrEqual(1);
          expect(depth).toBeLessThanOrEqual(BRANCH_DEPTH[difficulty][1]);
        }
      }
    }
  });
});
