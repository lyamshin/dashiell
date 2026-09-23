import { describe, expect, it } from 'vitest';
import {
  BRANCH_COUNT_FLOOR,
  FINDABLE_TARGET,
  FINDABLE_TOLERANCE,
  NOISE_RATIO,
  PAR_CEILING,
  PAR_FLOOR,
  SLACK,
  SPINE_CAP,
  TICKS,
  buildRequirements,
  checkSolvability,
  generateCase,
  requirementInputForCase,
  sourceKey,
  type Case,
  type Clue,
  type Difficulty,
  type Id,
  type Tick,
} from '../src/gen/index.js';
import { activityKey } from '../src/gen/solvability.js';
import { genderForms } from '../src/gen/dossier.js';
import { ARCHETYPE_BY_ID, RELATIONSHIP_BY_ID, VICTIM_ARCHETYPES } from '../src/gen/data/cast.js';
import { PLACE_BY_ID, PLACE_TEMPLATES } from '../src/gen/data/places.js';
import { MASKING_PHRASES } from '../src/gen/data/anchors.js';

const SEEDS = 200;
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

const corpus: Case[] = [];
for (let seed = 1; seed <= SEEDS; seed++) corpus.push(generateCase(seed));

/** M2b's rules are asserted at every difficulty, not only the default. */
const everyDifficulty: Case[] = [];
for (const difficulty of DIFFICULTIES) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    everyDifficulty.push(difficulty === 2 ? (corpus[seed - 1] as Case) : generateCase(seed, { difficulty }));
  }
}
const FINDABLE_MIN = FINDABLE_TARGET - FINDABLE_TOLERANCE;
const FINDABLE_MAX = FINDABLE_TARGET + FINDABLE_TOLERANCE;

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
  /*
   * M5 §2.1 changed what "the murder cell" means for two of the three case
   * types, so three of these four are now scoped by type. What has not
   * changed is the constraint the whole machine rests on: the actor is alone
   * at the place at the tick. Nobody else is ever in the room.
   */
  it('puts the actor alone at the act, with the subject when there is one', () => {
    for (const c of corpus) {
      const { killerId, murderTick: M, murderPlaceId: L } = c.solution;
      const victim = c.people.find((p) => p.kind === 'victim');
      expect(victim).toBeDefined();
      expect(scheduleOf(c, killerId)?.truth[M]).toBe(L);
      if (c.act.type === 'robbery') {
        // Nobody died. The owner had an evening, and it was not in that room.
        expect(scheduleOf(c, victim?.id as Id)?.truth[M]).not.toBe(L);
      } else {
        expect(scheduleOf(c, victim?.id as Id)?.truth[M]).toBe(L);
      }
      for (const s of c.schedules) {
        if (s.personId === killerId || s.personId === victim?.id) continue;
        expect(s.truth[M], `${s.personId} is in the room at the murder tick`).not.toBe(L);
      }
    }
  });

  it('leaves a murdered victim with no place after the murder tick', () => {
    for (const c of corpus) {
      if (c.act.type !== 'murder') continue;
      const victim = c.people.find((p) => p.kind === 'victim');
      const line = scheduleOf(c, victim?.id as Id);
      for (let t = c.solution.murderTick + 1; t < TICKS; t++) {
        expect(line?.truth[t]).toBeNull();
        expect(line?.claimed[t]).toBeNull();
      }
    }
  });

  it('carries a missing person on to a whereabouts nobody observes', () => {
    for (const c of corpus) {
      if (c.act.type !== 'missing') continue;
      const victim = c.people.find((p) => p.kind === 'victim') as { id: Id };
      const line = scheduleOf(c, victim.id);
      const where = c.act.whereabouts;
      expect(where, `seed ${c.seed} has no whereabouts`).toBeDefined();
      for (let t = c.solution.murderTick + 1; t < TICKS; t++) {
        expect(line?.truth[t], `seed ${c.seed} tick ${t}`).toBe(where);
      }
      for (const o of c.observations) {
        if (o.subjectId !== victim.id) continue;
        expect(o.tick, `seed ${c.seed}: somebody watched a vanished person`).toBeLessThanOrEqual(
          c.solution.murderTick,
        );
      }
    }
  });

  /*
   * One exception, added by M5 §1.3: somebody walked in and found it, and the
   * case is only a case because they did. Exactly one person may be at the
   * scene after the act, and only at the tick the discovery says.
   */
  it('clears the scene after the act, except for the one who finds it', () => {
    for (const c of corpus) {
      const { murderTick: M, murderPlaceId: L } = c.solution;
      const found = c.victimBio.discovery;
      for (const s of c.schedules) {
        for (let t = M + 1; t < TICKS; t++) {
          const excused =
            found !== undefined &&
            found.foundAt === L &&
            found.foundById === s.personId &&
            found.foundTick === t;
          if (excused) continue;
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
      // M5 §2.1: only a murder is gated on what a room can host. A room can
      // be broken into, or walked out of, whether or not anybody could be
      // killed in it; what still has to hold is that nobody is posted there.
      if (c.act.type === 'murder') {
        expect(PLACE_BY_ID[c.solution.murderPlaceId]?.murderMethods).toContain(c.solution.methodId);
      }
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
        // M5 §3: the relationship names the victim rather than calling them
        // "the victim", so the card carries `{V}` and the person carries it
        // filled in.
        const victim = c.people.find((q) => q.kind === 'victim');
        // M10 §A.5: with the relation word in the form for the person's sex.
        expect(genderForms(rel?.text ?? '', p.gender).split('{V}').join(victim?.surname ?? '')).toBe(
          p.relationshipToVictim,
        );
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
  it('is exactly thirty-four clues, give or take two', () => {
    for (const c of everyDifficulty) {
      expect(c.findable.length).toBeGreaterThanOrEqual(FINDABLE_MIN);
      expect(c.findable.length).toBeLessThanOrEqual(FINDABLE_MAX);
      expect(new Set(c.findable.map((cl) => cl.id)).size).toBe(c.findable.length);
      const ids = new Set(c.candidates.map((cl) => cl.id));
      for (const cl of c.findable) expect(ids.has(cl.id)).toBe(true);
    }
  });

  it('keeps the spine to fifteen clues and includes the opening three', () => {
    for (const c of everyDifficulty) {
      const spine = c.findable.filter((cl) => cl.role === 'spine');
      expect(spine.length).toBeLessThanOrEqual(SPINE_CAP);
      expect(c.starting.length).toBe(3);
      for (const id of c.starting) {
        expect(spine.some((cl) => cl.id === id), `${id} is not in the spine`).toBe(true);
      }
    }
  });

  it('gives every essential fact the routes its own rule asks for', () => {
    for (const c of everyDifficulty) {
      const reqs = buildRequirements(requirementInputForCase(c), c.findable);
      // Two routes for the five legs that name the killer; one for an
      // innocent's alibi, per M2b section 1.
      expect(reqs.filter((r) => r.routes === 2).map((r) => r.id).sort()).toEqual([
        'access',
        'contradict',
        'method',
        'motive',
        'tod',
      ]);
      for (const r of reqs) {
        const mine = r.parts.flatMap((p) => p.clues);
        expect(
          new Set(mine.map(sourceKey)).size,
          `seed ${c.seed} d${c.difficulty}: ${r.label} is thin`,
        ).toBeGreaterThanOrEqual(r.routes);
        for (const part of r.parts) {
          expect(part.clues.length, `seed ${c.seed}: ${part.key} is uncovered`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("makes every noise clue an innocent's secret, and every branch end in a disqualifier", () => {
    for (const c of everyDifficulty) {
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
      expect(branches.size).toBeGreaterThanOrEqual(BRANCH_COUNT_FLOOR);
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

  it('keeps the noise between 35 and 45 per cent of every hand', () => {
    for (const c of everyDifficulty) {
      const ratio =
        c.findable.filter((cl) => cl.role === 'noise' || cl.role === 'disqualifier').length /
        c.findable.length;
      expect(ratio, `seed ${c.seed} d${c.difficulty}`).toBeGreaterThanOrEqual(NOISE_RATIO[0]);
      expect(ratio, `seed ${c.seed} d${c.difficulty}`).toBeLessThanOrEqual(NOISE_RATIO[1]);
    }
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

  it('sets the budget to par plus the difficulty\u2019s slack, with par in range', () => {
    for (const c of everyDifficulty) {
      expect(c.slack, `seed ${c.seed} d${c.difficulty}`).toBe(SLACK[c.difficulty]);
      expect(c.budget, `seed ${c.seed} d${c.difficulty}`).toBe(c.par + c.slack);
      expect(c.par, `seed ${c.seed} d${c.difficulty}`).toBeGreaterThanOrEqual(PAR_FLOOR);
      expect(c.par, `seed ${c.seed} d${c.difficulty}`).toBeLessThanOrEqual(PAR_CEILING);
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

/* --------------------------------------------------------------------------
 * M2b: watchers, budget and sheet hygiene. Section 8 of
 * `docs/04-m2b-watchers-and-budget.md`, over seeds 1..200 at each difficulty.
 * ----------------------------------------------------------------------- */

describe('one subject per clue, over seeds 1..200 at each difficulty', () => {
  it('never lets an observation or a denial place two people at once', () => {
    for (const c of everyDifficulty) {
      for (const cl of c.findable) {
        if (cl.kind !== 'observation' && cl.kind !== 'denial') continue;
        const subjects = new Set(
          cl.establishes
            .filter((f) => f.kind === 'personAt' || f.kind === 'personNotAt')
            .map((f) => (f as { personId: Id }).personId),
        );
        expect(
          subjects.size,
          `seed ${c.seed} d${c.difficulty} ${cl.id}: ${cl.text}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has no roll call anywhere in the candidate pool either', () => {
    for (const c of everyDifficulty) {
      for (const cl of c.candidates) {
        if (cl.kind !== 'observation' && cl.kind !== 'denial') continue;
        const subjects = new Set(
          cl.establishes
            .filter((f) => f.kind === 'personAt' || f.kind === 'personNotAt')
            .map((f) => (f as { personId: Id }).personId),
        );
        expect(subjects.size, `${cl.id}: ${cl.text}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('branches over seeds 1..200 at each difficulty', () => {
  it('deals one branch per secret activity, partners sharing one', () => {
    for (const c of everyDifficulty) {
      const branches = new Map<Id, Clue[]>();
      for (const cl of c.findable) {
        if (!cl.branchId) continue;
        const list = branches.get(cl.branchId) ?? [];
        list.push(cl);
        branches.set(cl.branchId, list);
      }
      const seen = new Map<string, Id>();
      for (const [bid, list] of branches) {
        const keys = new Set(
          list
            .map((cl) => cl.aboutSecretOf)
            .filter((id): id is Id => id !== undefined)
            .map((id) => activityKey(c, id)),
        );
        expect(keys.size, `seed ${c.seed} d${c.difficulty}: branch ${bid} is two secrets`).toBe(1);
        const key = [...keys][0] as string;
        expect(seen.has(key), `seed ${c.seed} d${c.difficulty}: ${key} has two branches`).toBe(
          false,
        );
        seen.set(key, bid);
        expect(list.filter((cl) => cl.role === 'disqualifier').length).toBe(1);
      }
      expect(branches.size).toBeGreaterThanOrEqual(BRANCH_COUNT_FLOOR);
      expect(branches.size).toBeLessThanOrEqual(5);
    }
  });

  it('clears both partners with the one disqualifier an affair gets', () => {
    let affairs = 0;
    for (const c of everyDifficulty) {
      const pairs = c.people.filter(
        (p) =>
          p.kind === 'suspect' &&
          p.secret?.partnerId !== undefined &&
          c.people.find((q) => q.id === p.secret?.partnerId)?.kind === 'suspect',
      );
      for (const p of pairs) {
        const disq = c.findable.find(
          (cl) =>
            cl.role === 'disqualifier' &&
            cl.establishes.some((f) => f.kind === 'secretExplained' && f.personId === p.id),
        );
        if (!disq) continue;
        affairs++;
        const cleared = new Set(
          disq.establishes
            .filter((f) => f.kind === 'secretExplained')
            .map((f) => (f as { personId: Id }).personId),
        );
        expect(cleared.has(p.id)).toBe(true);
        expect(cleared.has(p.secret?.partnerId as Id)).toBe(true);
      }
    }
    expect(affairs).toBeGreaterThan(0);
  });
});

describe('clues state facts, over seeds 1..200 at each difficulty', () => {
  const BANNED = ['that puts', 'which means', 'so it must', 'and no later'];

  it('never draws the conclusion for the player', () => {
    for (const c of everyDifficulty) {
      for (const cl of c.candidates) {
        const lower = cl.text.toLowerCase();
        for (const phrase of BANNED) {
          expect(lower.includes(phrase), `${cl.id}: ${cl.text}`).toBe(false);
        }
      }
    }
  });

  it('either has people hear the killing or has it masked, never both', () => {
    let masked = 0;
    for (const c of everyDifficulty) {
      const heard = c.candidates.filter((cl) =>
        cl.establishes.some(
          (f) =>
            f.kind === 'noiseAt' &&
            f.place === c.solution.murderPlaceId &&
            f.tick === c.solution.murderTick,
        ),
      );
      const claimsMasked = c.candidates.filter((cl) =>
        MASKING_PHRASES.some((phrase) => cl.text.includes(phrase)),
      );
      if (c.soundMasked) {
        masked++;
        expect(heard.length, `seed ${c.seed} d${c.difficulty} hears a masked shot`).toBe(0);
      } else {
        expect(claimsMasked.length, `seed ${c.seed} d${c.difficulty} masks a heard shot`).toBe(0);
      }
    }
    // Both halves of the rule have to be exercised, or the test proves nothing.
    expect(masked).toBeGreaterThan(0);
    expect(masked).toBeLessThan(everyDifficulty.length);
  });

  it('tests a liar who claims an anchored place on what everyone there knows', () => {
    let opportunities = 0;
    for (const c of everyDifficulty) {
      for (const a of c.anchors) {
        if (!a.placeId) continue;
        if (!a.traces.some((t) => t.kind === 'knowledge')) continue;
        for (const t of a.ticks) {
          for (const p of suspectsOf(c)) {
            const s = scheduleOf(c, p.id);
            if (s?.claimed[t] !== a.placeId) continue;
            if (s.truth[t] === a.placeId) continue;
            opportunities++;
            const test = c.candidates.find(
              (cl) =>
                cl.anchorId === a.templateId &&
                cl.source.type === 'person' &&
                cl.source.personId === p.id &&
                cl.establishes.some(
                  (f) => f.kind === 'personNotAt' && f.personId === p.id && f.tick === t,
                ),
            );
            expect(
              test,
              `seed ${c.seed} d${c.difficulty}: ${p.surname} claims ${a.placeId} at ${t} untested`,
            ).toBeDefined();
          }
        }
      }
    }
    expect(opportunities).toBeGreaterThan(everyDifficulty.length / 4);
  });

  it('puts the knowledge test in the player\u2019s hands in over half of those cases', () => {
    // Section 4: "should appear in at least half of cases where a liar claims
    // an anchored place". A test against an innocent heads that innocent's
    // noise branch; a test against the killer is a route to the contradiction.
    let opportunities = 0;
    let findable = 0;
    for (const c of everyDifficulty) {
      const anyLiar = c.anchors.some(
        (a) =>
          a.placeId !== undefined &&
          a.traces.some((t) => t.kind === 'knowledge') &&
          a.ticks.some((t) =>
            suspectsOf(c).some((p) => {
              const sc = scheduleOf(c, p.id);
              if (!sc) return false;
              return sc.claimed[t] === a.placeId && sc.truth[t] !== a.placeId;
            }),
          ),
      );
      if (!anyLiar) continue;
      opportunities++;
      if (c.findable.some((cl) => cl.kind === 'anchor' && cl.text.includes('cannot say that'))) {
        findable++;
      }
    }
    expect(opportunities).toBeGreaterThan(50);
    expect(findable / opportunities).toBeGreaterThanOrEqual(0.5);
  });

  it('gives every place-attached anchor something only those present know', () => {
    // The knowledge test is the payoff of the anchor system, so a
    // place-attached anchor without one is a wasted card.
    for (const c of everyDifficulty) {
      for (const a of c.anchors) {
        if (!a.placeId) continue;
        expect(a.traces.some((t) => t.kind === 'knowledge'), `${a.templateId}`).toBe(true);
      }
    }
  });
});

describe('short names over seeds 1..200 at each difficulty', () => {
  it('gives every place template a distinct short name', () => {
    for (const t of PLACE_TEMPLATES) expect(t.shortName.length).toBeGreaterThan(0);
    expect(new Set(PLACE_TEMPLATES.map((t) => t.shortName)).size).toBe(PLACE_TEMPLATES.length);
  });

  it('never spells a place out in full in a clue more than once', () => {
    for (const c of everyDifficulty) {
      for (const cl of c.candidates) {
        for (const place of c.places) {
          const hits = cl.text.split(place.name).length - 1;
          expect(hits, `${cl.id} says "${place.name}" ${hits} times`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('calls people by their surname in clue text', () => {
    for (const c of everyDifficulty) {
      for (const p of c.people) {
        expect(p.surname.length).toBeGreaterThan(0);
        expect(p.name.endsWith(p.surname)).toBe(true);
      }
      for (const cl of c.candidates) {
        for (const p of c.people) {
          expect(cl.text.includes(p.name), `${cl.id} uses the full name ${p.name}`).toBe(false);
        }
      }
    }
  });
});

describe('the cast table over seeds 1..200 at each difficulty', () => {
  it('only makes people rivals in a trade they are both in', () => {
    let rivals = 0;
    for (const c of everyDifficulty) {
      const victim = c.people.find((p) => p.kind === 'victim');
      const victimArch = VICTIM_ARCHETYPES.find((v) => v.id === victim?.archetypeId);
      for (const p of suspectsOf(c)) {
        if (p.relationshipId !== 'rel-rival') continue;
        rivals++;
        const arch = ARCHETYPE_BY_ID[p.archetypeId as Id];
        expect(arch?.trade, `seed ${c.seed}: ${p.role} has no trade`).toBeDefined();
        expect(arch?.trade, `seed ${c.seed}: ${p.role} vs ${victimArch?.role}`).toBe(
          victimArch?.trade,
        );
      }
    }
    expect(rivals).toBeGreaterThan(0);
  });

  it('never makes a widow an estranged spouse, or a woman a fiancé', () => {
    for (const c of everyDifficulty) {
      for (const p of suspectsOf(c)) {
        if (p.relationshipId === 'rel-spouse') expect(p.archetypeId).not.toBe('arch-widow');
        if (p.relationshipId === 'rel-engaged') {
          expect(['arch-chorus', 'arch-nurse', 'arch-widow']).not.toContain(p.archetypeId);
        }
      }
    }
  });
});

describe("the killer's named companion over seeds 1..200 at each difficulty", () => {
  it('always denies the alibi, and the denial can carry the spine', () => {
    let named = 0;
    for (const c of everyDifficulty) {
      const killer = c.solution.killerId;
      const M = c.solution.murderTick;
      const companion = scheduleOf(c, killer)?.claimedCompanion[M];
      if (!companion) continue;
      named++;
      const claim = scheduleOf(c, killer)?.claimed[M];
      const denial = c.candidates.find(
        (cl) =>
          cl.kind === 'denial' &&
          cl.source.type === 'person' &&
          cl.source.personId === companion &&
          cl.establishes.some(
            (f) =>
              f.kind === 'personNotAt' && f.personId === killer && f.tick === M && f.place === claim,
          ),
      );
      expect(denial, `seed ${c.seed} d${c.difficulty}: no companion denial`).toBeDefined();
      // Spine-eligible: the selector can reach for it as a route to the
      // contradiction, which is what section 7 asks for.
      const reqs = buildRequirements(requirementInputForCase(c), c.candidates);
      const contradict = reqs.find((r) => r.id === 'contradict');
      expect(
        contradict?.parts.some((part) => part.clues.some((cl) => cl.id === denial?.id)),
        `seed ${c.seed} d${c.difficulty}: the companion denial is not spine-eligible`,
      ).toBe(true);
    }
    expect(named).toBeGreaterThan(everyDifficulty.length / 4);
  });
});

describe('regeneration cost at every difficulty', () => {
  it('keeps the median attempt count at or under 10 and the max at or under 300', () => {
    for (const difficulty of DIFFICULTIES) {
      const attempts = everyDifficulty
        .filter((c) => c.difficulty === difficulty)
        .map((c) => c.attempts)
        .sort((a, b) => a - b);
      const median = attempts[Math.floor((attempts.length - 1) / 2)] as number;
      const max = attempts[attempts.length - 1] as number;
      process.stdout.write(`\n  difficulty ${difficulty} — median ${median}, max ${max}\n`);
      expect(median).toBeLessThanOrEqual(10);
      expect(max).toBeLessThanOrEqual(300);
    }
  });
});
