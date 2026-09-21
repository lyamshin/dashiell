import { describe, expect, it } from 'vitest';
import { checkSolvability, generateCase, type Case, type CaseUnderTest } from '../src/gen/index.js';

/**
 * Constraint-first placement means the solvability check never actually
 * rejects an attempt in practice — every discard over seeds 1..200 comes from
 * the scheduler. These tests damage a good case on purpose, so the check is
 * known to be load-bearing rather than a tautology.
 */
function damaged(seed: number, mutate: (c: Case) => void): CaseUnderTest {
  const c = JSON.parse(JSON.stringify(generateCase(seed))) as Case;
  mutate(c);
  const { deduction: _deduction, ...rest } = c;
  return rest;
}

const killerOf = (c: Case) => c.solution.killerId;
const innocentsOf = (c: Case) =>
  c.people.filter((p) => p.kind === 'suspect' && p.id !== c.solution.killerId);

describe('the solvability check bites', () => {
  it('accepts an untouched case', () => {
    const untouched = damaged(3, () => {});
    expect(checkSolvability(untouched).ok).toBe(true);
  });

  it('rejects a case with no body report', () => {
    const result = checkSolvability(damaged(3, (c) => {
      c.clues = c.clues.filter((cl) => cl.kind !== 'morgue');
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('no morgue report');
  });

  it('rejects a case where the time of death cannot be narrowed', () => {
    const result = checkSolvability(damaged(3, (c) => {
      for (const cl of c.clues) {
        cl.establishes = cl.establishes.filter(
          (f) => f.kind !== 'victimAliveAt' && f.kind !== 'noiseAt',
        );
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('time of death cannot be narrowed to a single tick');
  });

  it('rejects a case where an innocent cannot be cleared', () => {
    const result = checkSolvability(damaged(3, (c) => {
      const target = innocentsOf(c)[0] as { id: string; name: string };
      for (const cl of c.clues) {
        cl.establishes = cl.establishes.filter(
          (f) =>
            !(
              (f.kind === 'personAt' || f.kind === 'personNotAt') &&
              f.personId === target.id &&
              f.tick === c.solution.murderTick
            ),
        );
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('is not exculpable'))).toBe(true);
  });

  it("rejects a case where the killer's alibi stands up", () => {
    const result = checkSolvability(damaged(3, (c) => {
      for (const cl of c.clues) {
        cl.establishes = cl.establishes.filter(
          (f) => !(f.kind === 'personNotAt' && f.personId === killerOf(c)),
        );
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      "the killer's alibi is not contradicted from two independent sources",
    );
  });

  it('rejects a case where only one source contradicts the killer', () => {
    const result = checkSolvability(damaged(3, (c) => {
      let kept: string | null = null;
      c.clues = c.clues.filter((cl) => {
        const contradicts = cl.establishes.some(
          (f) => f.kind === 'personNotAt' && f.personId === killerOf(c) && f.tick === c.solution.murderTick,
        );
        if (!contradicts) return true;
        const key = cl.source.type === 'person' ? cl.source.personId : cl.source.locationId;
        if (kept === null) kept = key;
        return key === kept;
      });
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      "the killer's alibi is not contradicted from two independent sources",
    );
  });

  it('rejects a case where nothing ties the killer to the method', () => {
    const result = checkSolvability(damaged(3, (c) => {
      for (const cl of c.clues) {
        cl.establishes = cl.establishes.filter(
          (f) => !(f.kind === 'hadAccess' && f.personId === killerOf(c)),
        );
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('nothing ties the killer to the method');
  });

  it('rejects a case where the motive rests on one source', () => {
    const result = checkSolvability(damaged(3, (c) => {
      let seen = false;
      for (const cl of c.clues) {
        cl.establishes = cl.establishes.filter((f) => {
          if (f.kind !== 'hasMotive' || f.personId !== killerOf(c)) return true;
          if (seen) return false;
          seen = true;
          return true;
        });
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('the motive rests on a single source');
  });

  it('rejects a case where only one innocent lies about the murder tick', () => {
    const result = checkSolvability(damaged(3, (c) => {
      let kept = false;
      for (const p of innocentsOf(c)) {
        const s = c.schedules.find((x) => x.personId === p.id);
        if (!s?.lies.includes(c.solution.murderTick)) continue;
        if (!kept) {
          kept = true;
          continue;
        }
        s.lies = s.lies.filter((t) => t !== c.solution.murderTick);
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('fewer than two innocents lie about the murder tick');
  });

  it('rejects a case where only the killer has a motive', () => {
    const result = checkSolvability(damaged(3, (c) => {
      for (const p of innocentsOf(c)) delete (p as { motive?: unknown }).motive;
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('no innocent has a motive');
  });

  it('rejects a case carrying a suspect with nothing going on', () => {
    const result = checkSolvability(damaged(3, (c) => {
      const target = innocentsOf(c)[0] as { id: string; motive?: unknown; secret?: unknown };
      delete target.motive;
      delete target.secret;
      const s = c.schedules.find((x) => x.personId === target.id);
      if (s) {
        s.lies = [];
        s.claimed = s.truth.slice();
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('dead weight'))).toBe(true);
  });

  it('rejects a case where the killer alone could reach the weapon', () => {
    const result = checkSolvability(damaged(3, (c) => {
      for (const cl of c.clues) {
        cl.establishes = cl.establishes.filter(
          (f) => !(f.kind === 'hadAccess' && f.personId !== killerOf(c)),
        );
      }
    }));
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('the killer is the only person with access to the method');
  });
});
