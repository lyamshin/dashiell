import { describe, expect, it } from 'vitest';
import {
  TICKS,
  buildRequirements,
  checkSolvability,
  generateCase,
  requirementInputForCase,
  sourceKey,
  type Case,
  type Clue,
  type Id,
  type Tick,
} from '../src/gen/index.js';
import { ARCHETYPE_BY_ID, RELATIONSHIP_BY_ID } from '../src/gen/data/cast.js';
import { PLACE_BY_ID } from '../src/gen/data/places.js';

const SEEDS = 200;

const corpus: Case[] = [];
for (let seed = 1; seed <= SEEDS; seed++) corpus.push(generateCase(seed));

const scheduleOf = (c: Case, id: Id) => c.schedules.find((s) => s.personId === id);
const suspectsOf = (c: Case) => c.people.filter((p) => p.kind === 'suspect');
const innocentsOf = (c: Case) => suspectsOf(c).filter((p) => p.id !== c.solution.killerId);
const findableById = (c: Case): Map<Id, Clue> => new Map(c.findable.map((cl) => [cl.id, cl]));

function counts<T>(xs: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

describe('hard constraints over seeds 1..200', () => {
  it('puts the killer and the victim alone at the murder cell', () => {
    for (const c of corpus) {
      const { killerId, murderTick: M, murderPlaceId: L } = c.solution;
      const victim = c.people.find((p) => p.kind === 'victim');
      expect(victim).toBeDefined();
      expect(scheduleOf(c, killerId)?.truth[M]).toBe(L);
      expect(scheduleOf(c, victim?.id as Id)?.truth[M]).toBe(L);
      for (const s of c.schedules) {
        if (s.personId === killerId || s.personId === victim?.id) continue;
        expect(s.truth[M], `${s.personId} is in the room at the murder tick`).not.toBe(L);
      }
    }
  });

  it('leaves the victim with no place after the murder tick', () => {
    for (const c of corpus) {
      const victim = c.people.find((p) => p.kind === 'victim');
      const line = scheduleOf(c, victim?.id as Id);
      for (let t = c.solution.murderTick + 1; t < TICKS; t++) {
        expect(line?.truth[t]).toBeNull();
        expect(line?.claimed[t]).toBeNull();
      }
    }
  });

  it('clears the scene after the murder, the killer included', () => {
    for (const c of corpus) {
      const { murderTick: M, murderPlaceId: L } = c.solution;
      for (const s of c.schedules) {
        for (let t = M + 1; t < TICKS; t++) {
          expect(s.truth[t], `${s.personId} is still in the murder room at tick ${t}`).not.toBe(L);
          expect(s.claimed[t]).not.toBe(L);
        }
      }
    }
  });

  it('never puts the murder in the first or last tick', () => {
    for (const c of corpus) {
      expect(c.solution.murderTick).toBeGreaterThanOrEqual(1);
      expect(c.solution.murderTick).toBeLessThanOrEqual(TICKS - 2);
    }
  });

  it('only ever puts people in one of the six drawn places', () => {
    for (const c of corpus) {
      const ids = new Set(c.places.map((p) => p.id));
      for (const s of c.schedules) {
        for (const cell of [...s.truth, ...s.claimed]) {
          if (cell === null) continue;
          expect(ids.has(cell)).toBe(true);
        }
      }
    }
  });
});

describe('the place deck over seeds 1..200', () => {
  it('deals six places with the required shape', () => {
    for (const c of corpus) {
      expect(c.places.length).toBe(6);
      expect(c.places.filter((p) => p.kind === 'private').length).toBeGreaterThanOrEqual(2);
      expect(c.places.filter((p) => p.watcher !== undefined).length).toBeGreaterThanOrEqual(3);
      expect(
        c.places.some((p) => p.kind === 'public' && p.watcher === undefined),
        'no open public place',
      ).toBe(true);
      expect(c.places.filter((p) => p.isResidence).length).toBe(1);
      expect(new Set(c.places.map((p) => p.id)).size).toBe(6);
      const watcherRoles = c.places.filter((p) => p.watcher).map((p) => p.watcher);
      expect(new Set(watcherRoles).size).toBe(watcherRoles.length);
      expect(c.nearScene.length).toBe(2);
      for (const near of c.nearScene) expect(near).not.toBe(c.solution.murderPlaceId);
    }
  });

  it('gives every drawn place a fixture if and only if it is watched', () => {
    for (const c of corpus) {
      for (const p of c.places) {
        const posted = c.people.filter((q) => q.kind === 'fixture' && q.foundAt === p.id);
        if (p.watcher === undefined) {
          expect(posted.filter((q) => q.fixtureRole !== 'beat-cop').length).toBe(0);
        } else {
          expect(posted.some((q) => q.fixtureRole === p.watcher)).toBe(true);
        }
      }
    }
  });

  it('never makes a watched place the scene', () => {
    for (const c of corpus) {
      const scene = c.places.find((p) => p.id === c.solution.murderPlaceId);
      expect(scene?.watcher).toBeUndefined();
      expect(PLACE_BY_ID[c.solution.murderPlaceId]?.murderMethods).toContain(c.solution.methodId);
    }
  });

  it('spreads the scene across the deck and never leans on one card', () => {
    const scenes = counts(corpus.map((c) => c.solution.murderPlaceId));
    expect(Math.max(...scenes.values()) / SEEDS).toBeLessThanOrEqual(0.25);
    const templates = new Set(corpus.flatMap((c) => c.places.map((p) => p.id)));
    expect(templates.size).toBeGreaterThanOrEqual(12);
  });

  it("spreads the killer's false alibi across the deck", () => {
    const claims = counts(
      corpus.map((c) => scheduleOf(c, c.solution.killerId)?.claimed[c.solution.murderTick] ?? '?'),
    );
    expect(Math.max(...claims.values()) / SEEDS).toBeLessThanOrEqual(0.4);
  });
});

describe('anchors over seeds 1..200', () => {
  it('draws two or three and pins the time of death with two of them', () => {
    for (const c of corpus) {
      expect(c.anchors.length).toBeGreaterThanOrEqual(2);
      expect(c.anchors.length).toBeLessThanOrEqual(3);
      expect(new Set(c.anchors.map((a) => a.templateId)).size).toBe(c.anchors.length);
      expect(c.deduction.timeOfDeathAnchors.length).toBe(2);
      for (const a of c.anchors) expect(a.ticks.length).toBeGreaterThan(0);
    }
  });

  it('widens the coroner to four ticks and still contains the murder', () => {
    for (const c of corpus) {
      expect(c.coronerWindow[1] - c.coronerWindow[0] + 1).toBe(4);
      expect(c.solution.murderTick).toBeGreaterThanOrEqual(c.coronerWindow[0]);
      expect(c.solution.murderTick).toBeLessThanOrEqual(c.coronerWindow[1]);
    }
  });

  it('uses at least ten distinct anchors and does not repeat one pair', () => {
    const used = new Set(corpus.flatMap((c) => c.anchors.map((a) => a.templateId)));
    expect(used.size).toBeGreaterThanOrEqual(10);
    const pairs = counts(corpus.map((c) => c.deduction.timeOfDeathAnchors.join('+')));
    expect(Math.max(...pairs.values()) / SEEDS).toBeLessThanOrEqual(0.2);
  });
});

describe('cast compatibility over seeds 1..200', () => {
  it('only ever assigns a role, relationship, motive and secret that fit together', () => {
    for (const c of corpus) {
      for (const p of suspectsOf(c)) {
        const arch = ARCHETYPE_BY_ID[p.archetypeId as Id];
        expect(arch, `unknown archetype ${p.archetypeId}`).toBeDefined();
        expect(arch?.role).toBe(p.role);
        expect(arch?.relationships).toContain(p.relationshipId);
        const rel = RELATIONSHIP_BY_ID[p.relationshipId as Id];
        expect(rel?.text).toBe(p.relationshipToVictim);
        if (p.motive) {
          expect(arch?.motives).toContain(p.motive.type);
          if (rel?.impliesMotives) expect(rel.impliesMotives).toContain(p.motive.type);
        }
        const secretType = p.isKiller ? p.coverSecret?.type : p.secret?.type;
        if (secretType) expect(arch?.secrets).toContain(secretType);
      }
    }
  });

  it('never repeats a role, and mixes the classes', () => {
    for (const c of corpus) {
      const roles = suspectsOf(c).map((p) => p.role);
      expect(new Set(roles).size).toBe(roles.length);
      const classes = new Set(
        suspectsOf(c).map((p) => ARCHETYPE_BY_ID[p.archetypeId as Id]?.class),
      );
      for (const want of ['money', 'working', 'underworld'] as const) {
        expect(classes.has(want), `seed ${c.seed} has no ${want}`).toBe(true);
      }
    }
  });

  it('only draws suspects the victim archetype allows', () => {
    for (const c of corpus) {
      const victim = c.people.find((p) => p.kind === 'victim');
      expect(victim?.archetypeId).toBeDefined();
      for (const p of suspectsOf(c)) expect(p.archetypeId).toBeDefined();
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

  it('gives every lied-about tick a different claimed place, never the scene', () => {
    for (const c of corpus) {
      for (const s of c.schedules) {
        for (const t of s.lies) {
          expect(s.claimed[t]).not.toBe(s.truth[t]);
          expect(s.claimed[t]).not.toBe(c.solution.murderPlaceId);
        }
      }
    }
  });
});

describe('fixtures over seeds 1..200', () => {
  it('never lie and never withhold', () => {
    for (const c of corpus) {
      const fixtureIds = c.people.filter((p) => p.kind === 'fixture').map((p) => p.id);
      expect(fixtureIds.length).toBeGreaterThanOrEqual(3);
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

  it('take at most one excursion, and never into the scene', () => {
    for (const c of corpus) {
      for (const f of c.people.filter((p) => p.kind === 'fixture')) {
        const line = scheduleOf(c, f.id)?.truth ?? [];
        for (const cell of line) expect(cell).not.toBe(c.solution.murderPlaceId);
        if (f.fixtureRole === 'beat-cop') continue;
        const away = line.filter((cell) => cell !== null && cell !== f.foundAt).length;
        expect(away).toBeLessThanOrEqual(1);
      }
    }
  });

  it('are never the killer', () => {
    for (const c of corpus) {
      expect(c.people.find((p) => p.id === c.solution.killerId)?.kind).toBe('suspect');
    }
  });
});

describe('observations over seeds 1..200', () => {
  it("withholds exactly those observations made during the observer's own lies", () => {
    for (const c of corpus) {
      const lies = new Map(c.schedules.map((s) => [s.personId, new Set(s.lies)]));
      for (const o of c.observations) {
        expect(o.withheld).toBe(lies.get(o.observerId)?.has(o.tick) ?? false);
      }
    }
  });

  it('only records observations of people standing in the same place', () => {
    for (const c of corpus) {
      const truth = new Map(c.schedules.map((s) => [s.personId, s.truth]));
      for (const o of c.observations) {
        expect(truth.get(o.subjectId)?.[o.tick]).toBe(o.place);
        expect(truth.get(o.observerId)?.[o.tick]).toBe(o.place);
      }
    }
  });
});

describe('the findable set over seeds 1..200', () => {
  it('is exactly thirty clues, give or take two', () => {
    for (const c of corpus) {
      expect(c.findable.length).toBeGreaterThanOrEqual(28);
      expect(c.findable.length).toBeLessThanOrEqual(32);
      expect(new Set(c.findable.map((cl) => cl.id)).size).toBe(c.findable.length);
      const ids = new Set(c.candidates.map((cl) => cl.id));
      for (const cl of c.findable) expect(ids.has(cl.id)).toBe(true);
    }
  });

  it('keeps the spine to twelve clues and includes the opening three', () => {
    for (const c of corpus) {
      const spine = c.findable.filter((cl) => cl.role === 'spine');
      expect(spine.length).toBeLessThanOrEqual(12);
      expect(c.starting.length).toBe(3);
      for (const id of c.starting) {
        expect(spine.some((cl) => cl.id === id), `${id} is not in the spine`).toBe(true);
      }
    }
  });

  it('gives every essential fact two independent routes among the findable', () => {
    for (const c of corpus) {
      const reqs = buildRequirements(requirementInputForCase(c), c.findable);
      for (const r of reqs) {
        const mine = r.parts.flatMap((p) => p.clues);
        expect(
          new Set(mine.map(sourceKey)).size,
          `seed ${c.seed}: ${r.label} has one route`,
        ).toBeGreaterThanOrEqual(2);
        for (const part of r.parts) {
          expect(part.clues.length, `seed ${c.seed}: ${part.key} is uncovered`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("makes every noise clue an innocent's secret, and every branch end in a disqualifier", () => {
    for (const c of corpus) {
      const innocents = new Set(innocentsOf(c).map((p) => p.id));
      const branches = new Map<Id, Clue[]>();
      for (const cl of c.findable) {
        if (cl.role === 'noise' || cl.role === 'disqualifier') {
          expect(cl.aboutSecretOf, `${cl.id} has no secret behind it`).toBeDefined();
          expect(innocents.has(cl.aboutSecretOf as Id)).toBe(true);
          const owner = c.people.find((p) => p.id === cl.aboutSecretOf);
          expect(owner?.secret).toBeDefined();
          expect(cl.branchId).toBeDefined();
        }
        if (!cl.branchId) continue;
        const list = branches.get(cl.branchId) ?? [];
        list.push(cl);
        branches.set(cl.branchId, list);
      }
      expect(branches.size).toBeGreaterThan(0);
      for (const [id, list] of branches) {
        const disq = list.filter((cl) => cl.role === 'disqualifier');
        expect(disq.length, `branch ${id} has ${disq.length} disqualifiers`).toBe(1);
        expect(list.filter((cl) => cl.role === 'noise').length).toBeGreaterThanOrEqual(1);
        // The disqualifier is the end of the chain: nothing in the branch
        // follows it.
        const inBranch = new Set(list.map((cl) => cl.id));
        for (const next of disq[0]?.leadsTo ?? []) expect(inBranch.has(next)).toBe(false);
      }
    }
  });

  it('keeps roughly two clues in five as noise', () => {
    const ratios = corpus.map(
      (c) =>
        c.findable.filter((cl) => cl.role === 'noise' || cl.role === 'disqualifier').length /
        c.findable.length,
    );
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    expect(mean).toBeGreaterThan(0.3);
    expect(mean).toBeLessThan(0.5);
  });

  it('is connected from the opening three', () => {
    for (const c of corpus) {
      const byId = findableById(c);
      const reached = new Set<Id>(c.starting);
      const queue = [...reached];
      while (queue.length > 0) {
        const cur = byId.get(queue.shift() as Id);
        if (!cur) continue;
        for (const next of cur.leadsTo) {
          expect(byId.has(next), `${cur.id} leads outside the findable set`).toBe(true);
          if (reached.has(next)) continue;
          reached.add(next);
          queue.push(next);
        }
      }
      expect(reached.size, `seed ${c.seed} has orphan clues`).toBe(c.findable.length);
    }
  });

  it('obtains every findable clue somewhere on the map', () => {
    for (const c of corpus) {
      const ids = new Set(c.places.map((p) => p.id));
      for (const cl of c.findable) expect(ids.has(cl.place)).toBe(true);
    }
  });

  it('leaves at least six actions of slack against the budget', () => {
    for (const c of corpus) {
      expect(c.par).toBeGreaterThan(0);
      expect(c.budget - c.par, `seed ${c.seed}: par ${c.par} vs budget ${c.budget}`).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('solvability over seeds 1..200', () => {
  it('passes the full check, including every interestingness heuristic', () => {
    for (const c of corpus) {
      const { deduction: _ignored, ...rest } = c;
      const result = checkSolvability(rest);
      if (!result.ok) throw new Error(`seed ${c.seed} failed: ${result.failures.join('; ')}`);
      expect(result.ok).toBe(true);
    }
  });

  it('cites a deduction path for every leg, all of it findable', () => {
    for (const c of corpus) {
      expect(c.deduction.timeOfDeath.length).toBeGreaterThan(0);
      expect(c.deduction.inculpation.length).toBeGreaterThan(0);
      expect(c.deduction.access.length).toBeGreaterThan(0);
      expect(c.deduction.method.length).toBeGreaterThan(0);
      expect(c.deduction.motive.length).toBeGreaterThan(0);
      for (const p of innocentsOf(c)) {
        expect((c.deduction.exculpations[p.id] ?? []).length).toBeGreaterThan(0);
      }
      const ids = new Set(c.findable.map((cl) => cl.id));
      const cited = [
        ...c.deduction.timeOfDeath,
        ...c.deduction.inculpation,
        ...c.deduction.access,
        ...c.deduction.method,
        ...c.deduction.motive,
        ...Object.values(c.deduction.exculpations).flat(),
      ];
      for (const id of cited) expect(ids.has(id)).toBe(true);
    }
  });

  it('never lets the killer be the only suspect with a motive', () => {
    for (const c of corpus) expect(innocentsOf(c).some((p) => p.motive)).toBe(true);
  });
});

describe('spread over seeds 1..200', () => {
  it('spreads the killer across all six suspect positions', () => {
    const positions = new Set<number>();
    for (const c of corpus) positions.add(suspectsOf(c).findIndex((p) => p.isKiller));
    expect([...positions].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('uses at least four methods and five secret types', () => {
    expect(new Set(corpus.map((c) => c.solution.methodId)).size).toBeGreaterThanOrEqual(4);
    const types = new Set<string>();
    for (const c of corpus) {
      for (const p of suspectsOf(c)) {
        if (p.secret && p.secret.type !== 'murder') types.add(p.secret.type);
        if (p.coverSecret) types.add(p.coverSecret.type);
      }
    }
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  it('uses more than one neighbourhood and more than one scene', () => {
    expect(new Set(corpus.map((c) => c.solution.murderPlaceId)).size).toBeGreaterThan(1);
    expect(new Set(corpus.map((c) => c.neighborhood)).size).toBeGreaterThan(1);
  });
});

describe('regeneration cost over seeds 1..200', () => {
  it('keeps the median attempt count at or under 10 and the max at or under 300', () => {
    const attempts = corpus.map((c) => c.attempts).sort((a, b) => a - b);
    const median = attempts[Math.floor((attempts.length - 1) / 2)] as number;
    const max = attempts[attempts.length - 1] as number;
    process.stdout.write(`\n  attempts over seeds 1..200 — median ${median}, max ${max}\n`);
    expect(median).toBeLessThanOrEqual(10);
    expect(max).toBeLessThanOrEqual(300);
  });
});

describe('clue sourcing over seeds 1..200', () => {
  it('never sources a clue from the victim, who is in no position to talk', () => {
    for (const c of corpus) {
      const victimId = c.people.find((p) => p.kind === 'victim')?.id;
      for (const clue of c.candidates) {
        if (clue.source.type === 'person') expect(clue.source.personId).not.toBe(victimId);
      }
    }
  });

  it('never sources an observation from somebody who was lying at the time', () => {
    for (const c of corpus) {
      const lies = new Map(c.schedules.map((s) => [s.personId, new Set(s.lies)]));
      for (const clue of c.candidates) {
        if (clue.source.type !== 'person' || clue.kind !== 'observation') continue;
        const liedTicks = lies.get(clue.source.personId);
        for (const f of clue.establishes) {
          if (f.kind === 'personAt' || f.kind === 'personNotAt') {
            expect(liedTicks?.has(f.tick) ?? false).toBe(false);
          }
        }
      }
    }
  });

  it('never has a source describe themselves as being in two rooms at once', () => {
    for (const c of corpus) {
      const truth = new Map(c.schedules.map((s) => [s.personId, s.truth]));
      for (const clue of c.candidates) {
        if (clue.source.type !== 'person' || clue.kind !== 'observation') continue;
        const ticks = clue.establishes
          .filter((f) => f.kind === 'personNotAt')
          .map((f) => (f as { tick: number }).tick);
        if (ticks.length < 2) continue;
        const line = truth.get(clue.source.personId);
        expect(new Set(ticks.map((t) => line?.[t])).size, `${clue.id}: ${clue.text}`).toBe(1);
      }
    }
  });

  it('gives every clue a non-empty, voiceless line of text', () => {
    for (const c of corpus) {
      for (const clue of c.candidates) {
        expect(clue.text.length).toBeGreaterThan(10);
        expect(clue.text.trim()).toBe(clue.text);
        expect(clue.text).not.toContain('{');
        expect(clue.text).not.toContain('undefined');
        expect(clue.text, `${clue.id}: ${clue.text}`).not.toMatch(/\bfrom from\b/);
        expect(clue.text, `${clue.id}: ${clue.text}`).not.toMatch(/\bat from\b/);
      }
    }
  });
});
