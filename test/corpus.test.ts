import { describe, expect, it } from 'vitest';
import { TICKS, checkSolvability, generateCase, type Case, type Tick } from '../src/gen/index.js';

const SEEDS = 200;

const corpus: Case[] = [];
for (let seed = 1; seed <= SEEDS; seed++) corpus.push(generateCase(seed));

const scheduleOf = (c: Case, id: string) => c.schedules.find((s) => s.personId === id);
const suspectsOf = (c: Case) => c.people.filter((p) => p.kind === 'suspect');

describe('hard constraints over seeds 1..200', () => {
  it('puts the killer and the victim alone at the murder cell', () => {
    for (const c of corpus) {
      const { killerId, murderTick: M, murderLocationId: L } = c.solution;
      const victim = c.people.find((p) => p.kind === 'victim');
      expect(victim).toBeDefined();
      const killerLine = scheduleOf(c, killerId);
      const victimLine = scheduleOf(c, victim?.id as string);
      expect(killerLine?.truth[M]).toBe(L);
      expect(victimLine?.truth[M]).toBe(L);
      for (const s of c.schedules) {
        if (s.personId === killerId || s.personId === victim?.id) continue;
        expect(s.truth[M]).not.toBe(L);
      }
    }
  });

  it('leaves the victim with no location after the murder tick', () => {
    for (const c of corpus) {
      const victim = c.people.find((p) => p.kind === 'victim');
      const line = scheduleOf(c, victim?.id as string);
      for (let t = c.solution.murderTick + 1; t < TICKS; t++) {
        expect(line?.truth[t]).toBeNull();
        expect(line?.claimed[t]).toBeNull();
      }
    }
  });

  it('never puts the murder in the first or last tick', () => {
    for (const c of corpus) {
      expect(c.solution.murderTick).toBeGreaterThanOrEqual(1);
      expect(c.solution.murderTick).toBeLessThanOrEqual(TICKS - 2);
    }
  });

  it('only moves people between adjacent locations', () => {
    for (const c of corpus) {
      const byId = new Map(c.locations.map((l) => [l.id, l]));
      for (const s of c.schedules) {
        for (let t = 1; t < TICKS; t++) {
          const prev = s.truth[t - 1];
          const now = s.truth[t];
          if (!prev || !now || prev === now) continue;
          expect(byId.get(prev)?.adjacent).toContain(now);
        }
      }
    }
  });
});

describe('lies over seeds 1..200', () => {
  it('records every divergence between claimed and truth in `lies`', () => {
    for (const c of corpus) {
      for (const s of c.schedules) {
        for (let t = 0; t < TICKS; t++) {
          if (s.claimed[t] !== s.truth[t]) expect(s.lies).toContain(t);
        }
      }
    }
  });

  it('backs every lie with a secret cell or the murder cell', () => {
    for (const c of corpus) {
      for (const p of suspectsOf(c)) {
        const s = scheduleOf(c, p.id);
        const cells = new Set<Tick>([
          ...(p.secret?.cells ?? []).map((cell) => cell.tick),
          ...(p.coverSecret?.cells ?? []).map((cell) => cell.tick),
        ]);
        for (const t of s?.lies ?? []) expect(cells.has(t)).toBe(true);
      }
    }
  });

  it('gives every lied-about tick a different claimed location', () => {
    for (const c of corpus) {
      for (const s of c.schedules) {
        for (const t of s.lies) expect(s.claimed[t]).not.toBe(s.truth[t]);
      }
    }
  });

  it('never has anyone claim the murder location for a lied-about tick', () => {
    for (const c of corpus) {
      for (const s of c.schedules) {
        for (const t of s.lies) expect(s.claimed[t]).not.toBe(c.solution.murderLocationId);
      }
    }
  });
});

describe('fixtures over seeds 1..200', () => {
  it('never lie and never withhold', () => {
    for (const c of corpus) {
      const fixtureIds = c.people.filter((p) => p.kind === 'fixture').map((p) => p.id);
      expect(fixtureIds.length).toBe(2);
      for (const id of fixtureIds) {
        const s = scheduleOf(c, id);
        expect(s?.lies).toEqual([]);
        expect(s?.claimed).toEqual(s?.truth);
        expect(s?.claimedCompanion.every((x) => x === null)).toBe(true);
      }
      for (const o of c.observations) {
        if (fixtureIds.includes(o.observerId)) expect(o.withheld).toBe(false);
      }
    }
  });

  it('are never the killer', () => {
    for (const c of corpus) {
      const killer = c.people.find((p) => p.id === c.solution.killerId);
      expect(killer?.kind).toBe('suspect');
    }
  });
});

describe('observations over seeds 1..200', () => {
  it('withholds exactly those observations made during the observer\'s own lies', () => {
    for (const c of corpus) {
      const lies = new Map(c.schedules.map((s) => [s.personId, new Set(s.lies)]));
      for (const o of c.observations) {
        expect(o.withheld).toBe(lies.get(o.observerId)?.has(o.tick) ?? false);
      }
    }
  });

  it('only records observations the observer could actually make', () => {
    for (const c of corpus) {
      const byId = new Map(c.locations.map((l) => [l.id, l]));
      const truth = new Map(c.schedules.map((s) => [s.personId, s.truth]));
      for (const o of c.observations) {
        const oLoc = truth.get(o.observerId)?.[o.tick];
        const sLoc = truth.get(o.subjectId)?.[o.tick];
        expect(sLoc).toBe(o.location);
        expect(oLoc === o.location || byId.get(oLoc as string)?.sightlines.includes(o.location)).toBe(
          true,
        );
      }
    }
  });
});

describe('solvability over seeds 1..200', () => {
  it('passes the full check, including every interestingness heuristic', () => {
    for (const c of corpus) {
      const { deduction: _ignored, ...rest } = c;
      const result = checkSolvability(rest);
      if (!result.ok) {
        throw new Error(`seed ${c.seed} failed: ${result.failures.join('; ')}`);
      }
      expect(result.ok).toBe(true);
    }
  });

  it('cites a deduction path for every leg', () => {
    for (const c of corpus) {
      expect(c.deduction.timeOfDeath.length).toBeGreaterThan(0);
      expect(c.deduction.inculpation.length).toBeGreaterThan(0);
      expect(c.deduction.method.length).toBeGreaterThan(0);
      expect(c.deduction.motive.length).toBeGreaterThan(0);
      const innocents = suspectsOf(c).filter((p) => !p.isKiller);
      for (const p of innocents) {
        expect((c.deduction.exculpations[p.id] ?? []).length).toBeGreaterThan(0);
      }
      const clueIds = new Set(c.clues.map((cl) => cl.id));
      const cited = [
        ...c.deduction.timeOfDeath,
        ...c.deduction.inculpation,
        ...c.deduction.method,
        ...c.deduction.motive,
        ...Object.values(c.deduction.exculpations).flat(),
      ];
      for (const id of cited) expect(clueIds.has(id)).toBe(true);
    }
  });

  it('never lets the killer be the only suspect with a motive', () => {
    for (const c of corpus) {
      const innocents = suspectsOf(c).filter((p) => !p.isKiller);
      expect(innocents.some((p) => p.motive)).toBe(true);
    }
  });
});

describe('spread over seeds 1..200', () => {
  it('spreads the killer across all six suspect positions', () => {
    const positions = new Set<number>();
    for (const c of corpus) {
      positions.add(suspectsOf(c).findIndex((p) => p.isKiller));
    }
    expect([...positions].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('uses at least four methods', () => {
    const methods = new Set(corpus.map((c) => c.solution.methodId));
    expect(methods.size).toBeGreaterThanOrEqual(4);
  });

  it('uses at least five secret types', () => {
    const types = new Set<string>();
    for (const c of corpus) {
      for (const p of suspectsOf(c)) {
        if (p.secret && p.secret.type !== 'murder') types.add(p.secret.type);
        if (p.coverSecret) types.add(p.coverSecret.type);
      }
    }
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  it('uses more than one murder location and more than one hotel', () => {
    expect(new Set(corpus.map((c) => c.solution.murderLocationId)).size).toBeGreaterThan(1);
    expect(new Set(corpus.map((c) => c.hotelName)).size).toBeGreaterThan(1);
  });
});

describe('regeneration cost over seeds 1..200', () => {
  it('keeps the median attempt count at or under 20 and the max at or under 500', () => {
    const attempts = corpus.map((c) => c.attempts).sort((a, b) => a - b);
    const median = attempts[Math.floor((attempts.length - 1) / 2)] as number;
    const max = attempts[attempts.length - 1] as number;
    // Printed so the numbers land in the test output, not just the assertion.
    // eslint-disable-next-line no-console
    process.stdout.write(`\n  attempts over seeds 1..200 — median ${median}, max ${max}\n`);
    expect(median).toBeLessThanOrEqual(20);
    expect(max).toBeLessThanOrEqual(500);
  });
});
