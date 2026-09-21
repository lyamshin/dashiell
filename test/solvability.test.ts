import { describe, expect, it } from 'vitest';
import { checkSolvability, generateCase, type Case, type CaseUnderTest, type Id } from '../src/gen/index.js';

/**
 * Constraint-first generation means the solvability check almost never rejects
 * an attempt in practice. These tests damage a good case on purpose, so the
 * check is known to be load-bearing rather than a tautology.
 */
function damaged(seed: number, mutate: (c: Case) => void): CaseUnderTest {
  const c = JSON.parse(JSON.stringify(generateCase(seed))) as Case;
  mutate(c);
  const { deduction: _deduction, ...rest } = c;
  return rest;
}

const killerOf = (c: Case): Id => c.solution.killerId;
const innocentsOf = (c: Case) =>
  c.people.filter((p) => p.kind === 'suspect' && p.id !== c.solution.killerId);

describe('the solvability check bites', () => {
  it('accepts an untouched case', () => {
    expect(checkSolvability(damaged(3, () => {})).ok).toBe(true);
  });

  it('rejects a case with no body report', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        c.findable = c.findable.filter((cl) => cl.kind !== 'morgue');
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('no morgue report');
  });

  it('rejects a coroner window that is not four ticks wide', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const cl of c.findable) {
          for (const f of cl.establishes) {
            if (f.kind === 'timeOfDeath') f.ticks = [f.ticks[0] as number, f.ticks[0] as number];
          }
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('the coroner window is not four ticks');
  });

  it('rejects a case where nothing puts the victim alive before the murder', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter((f) => f.kind !== 'victimAliveAt');
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      'nothing puts the victim alive at the tick before the murder',
    );
  });

  it('rejects a case where nothing closes the window from above', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter((f) => f.kind !== 'victimDeadBy');
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('nothing closes the window from above');
  });

  it('rejects a time of death that hangs on a single anchor', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        const first = c.findable.find((cl) => cl.anchorId)?.anchorId;
        for (const cl of c.findable) if (cl.anchorId) cl.anchorId = first;
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('the time of death does not hang on two anchors');
  });

  it('rejects a case where an innocent cannot be cleared', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        const target = innocentsOf(c)[0] as { id: Id };
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter(
            (f) =>
              !(
                (f.kind === 'personAt' || f.kind === 'personNotAt') &&
                f.personId === target.id &&
                f.tick === c.solution.murderTick
              ),
          );
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('is not exculpable'))).toBe(true);
  });

  it("rejects a case where the killer's alibi stands up", () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter(
            (f) => !(f.kind === 'personNotAt' && f.personId === killerOf(c)),
          );
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      "the killer's alibi is not contradicted from two independent sources",
    );
  });

  it('rejects a case where only one source contradicts the killer', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        let kept: string | null = null;
        c.findable = c.findable.filter((cl) => {
          const contradicts = cl.establishes.some(
            (f) =>
              f.kind === 'personNotAt' &&
              f.personId === killerOf(c) &&
              f.tick === c.solution.murderTick,
          );
          if (!contradicts) return true;
          const key = cl.source.type === 'person' ? cl.source.personId : cl.source.placeId;
          if (kept === null) kept = key;
          return key === kept;
        });
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      "the killer's alibi is not contradicted from two independent sources",
    );
  });

  it('rejects a case where nothing ties the killer to the weapon', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter(
            (f) => !(f.kind === 'hadAccess' && f.personId === killerOf(c)),
          );
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('nothing independent ties the killer to the weapon');
  });

  it('rejects a case where the method rests on one source', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        let seen = false;
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter((f) => {
            if (f.kind !== 'methodEvidence') return true;
            if (seen) return false;
            seen = true;
            return true;
          });
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('the method rests on a single source');
  });

  it('rejects a case where the motive rests on one source', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        let seen = false;
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter((f) => {
            if (f.kind !== 'hasMotive' || f.personId !== killerOf(c)) return true;
            if (seen) return false;
            seen = true;
            return true;
          });
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('the motive rests on a single source');
  });

  it('rejects a case where too few innocents lie about the murder tick', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
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
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('innocents lie about the murder tick'))).toBe(true);
  });

  it('rejects a case where only the killer has a motive', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const p of innocentsOf(c)) delete (p as { motive?: unknown }).motive;
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('no innocent has a motive');
  });

  it('rejects a case carrying a suspect with nothing going on', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        const target = innocentsOf(c)[0] as { id: Id; motive?: unknown; secret?: unknown };
        delete target.motive;
        delete target.secret;
        const s = c.schedules.find((x) => x.personId === target.id);
        if (s) {
          s.lies = [];
          s.claimed = s.truth.slice();
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('dead weight'))).toBe(true);
  });

  it('rejects a case where the killer alone could reach the weapon', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const cl of c.findable) {
          cl.establishes = cl.establishes.filter(
            (f) => !(f.kind === 'hadAccess' && f.personId !== killerOf(c)),
          );
        }
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      'the killer is the only person the player can see near the weapon',
    );
  });

  it('rejects a hand that is not thirty clues', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        c.findable = c.findable.slice(0, 20);
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('not 30 ± 2'))).toBe(true);
  });

  it('rejects noise that does not come out of a secret', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        const noise = c.findable.find((cl) => cl.role === 'noise');
        if (noise) delete noise.aboutSecretOf;
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes("does not come out of an innocent's secret"))).toBe(
      true,
    );
  });

  it('rejects a branch that never gets disqualified', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        const disq = c.findable.find((cl) => cl.role === 'disqualifier');
        if (disq) disq.role = 'noise';
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('never gets disqualified'))).toBe(true);
  });

  it('rejects a graph with clues nobody can be led to', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        for (const cl of c.findable) cl.leadsTo = [];
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('cannot be reached from the opening'))).toBe(true);
  });

  it('rejects a par that eats the slack', () => {
    const result = checkSolvability(
      damaged(3, (c) => {
        c.par = c.budget - 1;
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('less than six actions of slack'))).toBe(true);
  });
});
