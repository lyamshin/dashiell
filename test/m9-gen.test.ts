import { describe, expect, it } from 'vitest';
import {
  acquaintanceOf,
  contradicts,
  crimeFromHeld,
  generateCase,
  knowsByName,
  referenceOf,
  type Case,
  type Clue,
  type Fact,
  type Id,
  type Tick,
} from '../src/gen/index.js';
import { TIERS, deductionOf, type Level } from '../src/gen/shape.js';
import { TEXT_KEYS } from '../src/gen/structure.js';
import { NOTHING_ASKED } from '../src/game/voice-data.js';
import { frameOf } from '../src/gen/logic/check.js';
import { problemOf } from '../src/gen/logic/select.js';
import { crimeTicks, culpritOf, placesAt, solve } from '../src/gen/logic/solver.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from '../scripts/plain-terms.mjs';

/**
 * M9 — the generator half of Deduction (docs/20-m9-deduction.md, build plan
 * item 1; docs/20-m9-gen-notes.md). Every tier, held to the logic game's
 * rules: who knows whom, the lie rule, the rule types, testimony for every
 * question, leads from content, the solver's targets and the client's pointer.
 */

type T = 0 | 1 | 2 | 3 | 4 | 5;
const cache = new Map<string, Case[]>();
function cases(tier: T, level: Level, seeds: number): Case[] {
  const key = `${tier}:${level}:${seeds}`;
  let list = cache.get(key);
  if (!list) {
    list = [];
    for (let seed = 1; seed <= seeds; seed++) list.push(generateCase(seed, { tier, level }));
    cache.set(key, list);
  }
  return list;
}
const TIER_LIST: T[] = [0, 1, 2, 3, 4, 5];
const levelFor = (tier: T): Level => (tier === 0 ? 1 : 2);
const truthOf = (c: Case, id: Id): (Id | null)[] => c.schedules.find((s) => s.personId === id)?.truth ?? [];

/** Every fact that is not a self-account, checked against the truth. */
function factHolds(c: Case, f: Fact): boolean {
  const at = (id: Id, t: Tick): Id | null => truthOf(c, id)[t] ?? null;
  const suspects = c.people.filter((p) => p.kind !== 'victim');
  switch (f.kind) {
    case 'personAt':
      return at(f.personId, f.tick) === f.place;
    case 'personNotAt':
      return at(f.personId, f.tick) !== f.place;
    case 'personAtAnchor': {
      const a = c.anchors.find((x) => x.templateId === f.anchorId);
      return !!a && a.ticks.some((t) => at(f.personId, t) === f.place);
    }
    case 'anchorAt': {
      const a = c.anchors.find((x) => x.templateId === f.anchorId);
      return !!a && f.ticks.every((t) => a.ticks.includes(t));
    }
    case 'describedAt':
      return f.description.matches.some((id) => at(id, f.tick) === f.place);
    case 'absentFrom':
      return suspects.every((p) => f.except.includes(p.id) || f.ticks.every((t) => at(p.id, t) !== f.place));
    case 'countAt':
      return c.people.filter((p) => p.kind === 'suspect' && at(p.id, f.tick) === f.place).length === f.count;
    case 'together':
      return f.ticks.every((t) => at(f.personIds[0], t) !== null && at(f.personIds[0], t) === at(f.personIds[1], t));
    case 'apart':
      return f.ticks.every((t) => at(f.personIds[0], t) === null || at(f.personIds[0], t) !== at(f.personIds[1], t));
    case 'anchorKnowledge':
      return true;
    case 'knows': {
      const a = c.anchors.find((x) => x.templateId === f.anchorId);
      const there = !!a && a.ticks.some((t) => at(f.personId, t) === a.placeId);
      return f.knows ? true : !there;
    }
    case 'victimAliveAt':
      return c.solution.murderTick > f.tick;
    case 'victimDeadBy':
      return c.solution.murderTick <= f.tick;
    case 'timeOfDeath':
      return c.solution.murderTick >= (f.ticks[0] as Tick) && c.solution.murderTick <= (f.ticks[f.ticks.length - 1] as Tick);
    default:
      return true;
  }
}

describe('M9: who knows whom', () => {
  it('has one edge for every ordered pair, with a way of saying who', () => {
    for (const tier of TIER_LIST) {
      for (const c of cases(tier, levelFor(tier), 20)) {
        const edges = c.logic?.acquaintance ?? [];
        const n = c.people.length;
        expect(edges.length, `T${tier} seed ${c.seed}`).toBe(n * (n - 1));
        for (const e of edges) expect(e.ref.length).toBeGreaterThan(0);
        // Everybody who was somebody to the victim knows the victim.
        for (const p of c.people.filter((x) => x.kind === 'suspect')) {
          const e = edges.find((x) => x.from === p.id && x.to === c.people.find((v) => v.kind === 'victim')?.id);
          expect(e?.strength).toBe('name');
        }
      }
    }
  });

  it('rolls strangers from Medium up, more at Hard-boiled; below it only nobody-names-them-at-the-crime ones, and no descriptions', () => {
    const share = (tier: T): number => {
      let strangers = 0;
      let pairs = 0;
      for (const c of cases(tier, 2, 20)) {
        const suspects = new Set(c.people.filter((p) => p.kind === 'suspect').map((p) => p.id));
        for (const e of c.logic?.acquaintance ?? []) {
          if (!suspects.has(e.to) || !suspects.has(e.from)) continue;
          pairs++;
          if (e.strength === 'stranger') strangers++;
        }
      }
      return strangers / pairs;
    };
    // Below Medium the roll deals no strangers; the only ones are the pairs
    // the crime's half hour needed kept apart, and nobody describes anybody.
    expect(share(2)).toBeLessThan(0.15);
    expect(share(4)).toBeGreaterThan(share(2));
    expect(share(5)).toBeGreaterThan(share(4));
    for (const c of cases(2, 2, 20)) {
      expect(c.findable.some((cl) => cl.establishes.some((f) => f.kind === 'describedAt'))).toBe(false);
    }
  });

  it('describes each suspect by what a look gives up, and the description fits them', () => {
    for (const c of cases(5, 2, 20)) {
      for (const [id, d] of Object.entries(c.logic?.descriptions ?? {})) {
        expect(d.matches).toContain(id);
        expect(d.text).toMatch(/^a (man|woman)/);
        if (d.portrait) expect(d.matches).toHaveLength(1);
      }
    }
  });
});

describe('M9: the lie rule', () => {
  it('nobody lies about anybody else: every fact but a self-account is true', () => {
    for (const tier of TIER_LIST) {
      for (const c of cases(tier, levelFor(tier), 20)) {
        const bad: string[] = [];
        for (const cl of c.findable) {
          for (const f of cl.establishes) if (f.kind !== 'claims' && !factHolds(c, f)) bad.push(`${cl.id} ${f.kind}`);
        }
        expect(bad, `T${tier} seed ${c.seed}`).toEqual([]);
      }
    }
  });

  it('lies only where the rule allows: the crime, the means, a secret, a companion', () => {
    for (const tier of TIER_LIST) {
      const ded = deductionOf(TIERS[tier]);
      for (const c of cases(tier, levelFor(tier), 20)) {
        const killer = c.solution.killerId;
        for (const lie of c.logic?.lies ?? []) {
          const person = c.people.find((p) => p.id === lie.personId);
          if (lie.cover === 'crime' || lie.cover === 'means') expect(lie.personId).toBe(killer);
          if (lie.cover === 'means') expect(ded.meansLie).toBe(true);
          if (lie.cover === 'secret' && lie.personId !== killer) {
            expect(ded.secretLies).toBe(true);
            const cells = person?.secret?.cells.map((x) => x.tick) ?? [];
            for (const t of lie.ticks) expect(cells).toContain(t);
          }
          if (lie.cover === 'companion') expect(lie.with).toBeDefined();
          // The claim is false at every half hour of the span.
          lie.ticks.forEach((_t, i) => expect(lie.truth[i]).not.toBe(lie.claimed));
        }
        // Everybody's account is the truth wherever it is not a lie.
        for (const s of c.schedules) {
          for (let t = 0; t < 12; t++) {
            if (s.lies.includes(t)) continue;
            expect(s.claimed[t]).toBe(s.truth[t]);
          }
        }
      }
    }
  });

  it('breaks every innocent’s lie two independent ways, and the culprit’s by a chain', () => {
    for (const tier of [2, 3, 4, 5] as T[]) {
      for (const c of cases(tier, 2, 20)) {
        for (const k of c.logic?.confrontations ?? []) {
          if (k.personId === c.solution.killerId) {
            if (k.lie.cover === 'crime' || k.lie.cover === 'means') expect(k.contradictions.length).toBeGreaterThan(0);
            if (tier >= 3) for (const r of k.contradictions) expect(r.length, `T${tier} seed ${c.seed}`).toBeGreaterThan(1);
          } else {
            expect(k.contradictions.length, `T${tier} seed ${c.seed} ${k.lie.cover}`).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('the culprit never confesses; innocents give it up the second time', () => {
    for (const tier of [2, 3, 4, 5] as T[]) {
      for (const c of cases(tier, 2, 20)) {
        for (const k of c.logic?.confrontations ?? []) {
          if (k.personId === c.solution.killerId) {
            for (const r of k.responses) expect(['second-lie', 'quiet']).toContain(r.kind);
          } else if (k.lie.cover === 'companion') {
            expect(k.responses[1].kind).toBe('withdraw');
          } else {
            expect(k.responses[1].kind).toBe('admit');
            for (const f of k.responses[1].facts ?? []) expect(factHolds(c, f)).toBe(true);
          }
          for (const r of k.responses) {
            if (r.kind !== 'second-lie') continue;
            // A second lie is a lie, and something findable already breaks it.
            expect(r.contradictedBy?.length).toBeGreaterThan(0);
            for (const t of r.claims?.ticks ?? []) expect(truthOf(c, k.personId)[t]).not.toBe(r.claims?.place);
          }
        }
      }
    }
  });

  it('doubles down as often from the culprit as from an innocent, within ten points, from Poached up', () => {
    for (const tier of [2, 3, 4, 5] as T[]) {
      let culprit = 0;
      let culpritLies = 0;
      let innocent = 0;
      let innocentLies = 0;
      for (const c of cases(tier, 2, 100)) {
        for (const k of c.logic?.confrontations ?? []) {
          const lied = k.responses[0].kind === 'second-lie' ? 1 : 0;
          if (k.personId === c.solution.killerId) {
            culprit++;
            culpritLies += lied;
          } else if (k.lie.cover === 'secret') {
            innocent++;
            innocentLies += lied;
          }
        }
      }
      // A hundred cases carry the rates to within a few points of their
      // settings; the spec's ten points, with room for that.
      expect(Math.abs(culpritLies / culprit - innocentLies / innocent), `T${tier}`).toBeLessThanOrEqual(0.12);
    }
  });
});

describe('M9: rules and testimony', () => {
  it('deals every rule type the tier teaches', () => {
    const kinds = (tier: T): Set<string> => {
      const out = new Set<string>();
      for (const c of cases(tier, 2, 20)) for (const cl of c.findable) for (const f of cl.establishes) out.add(f.kind);
      return out;
    };
    const medium = kinds(4);
    for (const k of ['personAt', 'personNotAt', 'describedAt', 'absentFrom', 'countAt', 'apart', 'claims', 'anchorAt', 'personAtAnchor']) {
      expect(medium.has(k), k).toBe(true);
    }
    const hard = kinds(5);
    for (const k of ['anchorKnowledge', 'knows']) expect(hard.has(k), k).toBe(true);
    const raw = kinds(0);
    expect(raw.has('describedAt')).toBe(false);
    expect(raw.has('personAtAnchor')).toBe(false);
  });

  it('describes about a third of the sightings of strangers at Medium, about half at Hard-boiled', () => {
    const share = (tier: T): number => {
      let named = 0;
      let described = 0;
      for (const c of cases(tier, 2, 20)) {
        const suspects = new Set(c.people.filter((p) => p.kind === 'suspect').map((p) => p.id));
        for (const cl of c.findable) {
          for (const f of cl.establishes) {
            if (f.kind === 'describedAt') described++;
            if ((f.kind === 'personAt' || f.kind === 'personAtAnchor') && suspects.has(f.personId) && cl.kind === 'testimony') named++;
          }
        }
      }
      return described / (named + described);
    };
    const medium = share(4);
    const hard = share(5);
    expect(medium).toBeGreaterThan(0.15);
    expect(medium).toBeLessThan(0.55);
    expect(hard).toBeGreaterThan(medium);
    expect(hard).toBeLessThan(0.75);
  });

  it('answers every question about every person, never with a stock line', () => {
    const stock = new Set<string>(NOTHING_ASKED);
    for (const tier of TIER_LIST) {
      // M10 Part B: Raw and Coddled cut the hand to the tier's findable
      // target, so only the questions it keeps have an answer (test/m10-raw).
      if (deductionOf(TIERS[tier]).catchTheLie) continue;
      for (const c of cases(tier, levelFor(tier), 10)) {
        const testimony = c.findable.filter((cl) => cl.kind === 'testimony');
        const askers = c.people.filter((p) => p.kind !== 'victim');
        for (const x of askers) {
          for (const y of c.people) {
            if (x.id === y.id) continue;
            const hits = testimony.filter((cl) => (cl.source as { personId: Id }).personId === x.id && cl.about === y.id);
            expect(hits, `T${tier} seed ${c.seed} ${x.surname} on ${y.surname}`).toHaveLength(1);
            expect((hits[0] as Clue).text.length).toBeGreaterThan(0);
            expect(stock.has((hits[0] as Clue).text)).toBe(false);
          }
        }
      }
    }
  });

  it('gives every clue its one plain rule line, and none of them is jargon', () => {
    const list = loadPlainTerms();
    const bad: string[] = [];
    const walk = (value: unknown, path: string, inText: boolean): void => {
      if (typeof value === 'string') {
        if (!inText) return;
        for (const hit of findJargon(value, list) as { term: string; match: string }[]) bad.push(`${path}: ${hit.match}`);
        return;
      }
      if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, inText));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, inText || TEXT_KEYS.has(k));
      }
    };
    for (const tier of TIER_LIST) {
      for (const c of cases(tier, levelFor(tier), 10)) {
        for (const cl of c.findable) {
          expect(cl.rule, `T${tier} seed ${c.seed} ${cl.id}`).toBeDefined();
          if (cl.establishes.length > 0) expect((cl.rule as string).length, cl.id).toBeGreaterThan(0);
        }
        walk(c.findable, 'findable', false);
        walk(c.logic, 'logic', false);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

describe('M9: leads', () => {
  it('opens leads from content: most edges share a person with where they come from', () => {
    for (const tier of [2, 4, 5] as T[]) {
      let edges = 0;
      let shared = 0;
      for (const c of cases(tier, 2, 20)) {
        const byId = new Map(c.findable.map((cl) => [cl.id, cl]));
        const victim = c.people.find((p) => p.kind === 'victim')?.id;
        const named = (cl: Clue): Set<Id> => {
          const out = new Set<Id>();
          if (cl.source.type === 'person') out.add(cl.source.personId);
          for (const f of cl.establishes) if ('personId' in f) out.add(f.personId);
          const text = (cl.textRecord ?? cl.text).toLowerCase();
          for (const p of c.people) if (text.includes(p.surname.toLowerCase())) out.add(p.id);
          if (victim) out.delete(victim);
          return out;
        };
        for (const cl of c.findable) {
          for (const to of cl.leadsTo) {
            const target = byId.get(to);
            if (!target) continue;
            // The scene is marked from page one by rule (spec §4), and a room
            // names nobody: that one lead is not a lead from content.
            if (cl.kind === 'client' && target.kind === 'scene') continue;
            edges++;
            const theirs = new Set<Id>();
            if (target.source.type === 'person') theirs.add(target.source.personId);
            if (target.about) theirs.add(target.about);
            for (const f of target.establishes) if ('personId' in f) theirs.add(f.personId);
            const mine = named(cl);
            if ([...theirs].some((p) => mine.has(p))) shared++;
          }
        }
      }
      expect(shared / edges, `T${tier}`).toBeGreaterThanOrEqual(0.8);
    }
  });

  it('marks the scene from page one, and reaches every par clue from the opening', () => {
    for (const tier of TIER_LIST) {
      for (const c of cases(tier, levelFor(tier), 20)) {
        const client = c.findable.find((cl) => cl.kind === 'client');
        const scene = c.findable.find((cl) => cl.kind === 'scene');
        expect(client?.leadsTo).toContain(scene?.id);
        const byId = new Map(c.findable.map((cl) => [cl.id, cl]));
        // A search is always on the page, so what it finds can lead on; and
        // M10's unmarked question is on the page all the same.
        const reached = new Set<Id>([
          ...c.starting,
          ...c.findable.filter((cl) => cl.source.type === 'place').map((cl) => cl.id),
          ...(c.logic?.open ?? []),
        ]);
        const queue = [...reached];
        while (queue.length > 0) {
          for (const next of byId.get(queue.shift() as Id)?.leadsTo ?? []) {
            if (!reached.has(next)) {
              reached.add(next);
              queue.push(next);
            }
          }
        }
        // A question on the par route has a lead to it; a search needs none.
        for (const cl of c.findable.filter((x) => x.role === 'spine' && x.source.type === 'person')) {
          expect(reached.has(cl.id), `${cl.id}`).toBe(true);
        }
        // Nothing leads more than three ways.
        for (const cl of c.findable) expect(cl.leadsTo.length).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe('M9: the solver’s targets', () => {
  it('solves every case from what is findable, truly, and from the par set alone', () => {
    for (const tier of TIER_LIST) {
      for (const c of cases(tier, levelFor(tier), 20)) {
        const ded = deductionOf(TIERS[tier]);
        const frame = frameOf(c);
        const st = solve(problemOf(frame, c.findable, ded.hypothesis)).state;
        expect(culpritOf(st)?.id, `T${tier} seed ${c.seed}`).toBe(c.solution.killerId);
        expect(crimeTicks(st)).toContain(c.solution.murderTick);
        for (const s of frame.suspects) {
          const truth = truthOf(c, s)[c.solution.murderTick];
          expect(placesAt(st, s, c.solution.murderTick)).toContain(truth);
        }
        const par = c.findable.filter((cl) => cl.role === 'spine');
        const ps = solve(problemOf(frame, par, ded.hypothesis)).state;
        expect(culpritOf(ps)?.id, `par T${tier} seed ${c.seed}`).toBe(c.solution.killerId);
        expect(c.logic?.solve.parRules.slice().sort()).toEqual(par.map((x) => x.id).sort());
      }
    }
  });

  it('clears no innocent by one rule above Coddled, but the one a watcher names', () => {
    for (const tier of [2, 3, 4, 5] as T[]) {
      for (const c of cases(tier, 2, 20)) expect(c.logic?.solve.clearedByOne.length ?? 9).toBeLessThanOrEqual(1);
    }
  });

  it('reaches the culprit by a chain from Soft-boiled up, of four at Medium and Hard-boiled', () => {
    for (const [tier, depth] of [[3, 3], [4, 4], [5, 4]] as [T, number][]) {
      for (const c of cases(tier, 2, 20)) {
        expect(c.logic?.solve.culprit.depth ?? 0, `T${tier} seed ${c.seed}`).toBeGreaterThanOrEqual(depth);
      }
    }
  });

  it('needs a hypothesis tested at Hard-boiled, and never below it', () => {
    for (const c of cases(5, 2, 20)) {
      expect(c.logic?.solve.hypothesis).toBe(true);
      const flat = solve(problemOf(frameOf(c), c.findable, false)).state;
      const column = flat.problem.suspects.every((s) => placesAt(flat, s, c.solution.murderTick).length === 1);
      expect(culpritOf(flat)?.id === c.solution.killerId && column).toBe(false);
    }
    for (const tier of [0, 1, 2, 3, 4] as T[]) {
      for (const c of cases(tier, levelFor(tier), 20)) expect(c.logic?.solve.hypothesis).toBe(false);
    }
  });

  it('fills the crime column from Medium up', () => {
    for (const tier of [4, 5] as T[]) {
      for (const c of cases(tier, 2, 20)) {
        const st = solve(problemOf(frameOf(c), c.findable, tier === 5)).state;
        for (const s of st.problem.suspects) expect(placesAt(st, s, c.solution.murderTick)).toHaveLength(1);
      }
    }
  });

  it('keeps Raw and Coddled plain: no lies but the culprit’s, and conclusions allowed', () => {
    for (const tier of [0, 1] as T[]) {
      for (const c of cases(tier, levelFor(tier), 20)) {
        for (const lie of c.logic?.lies ?? []) expect(lie.personId).toBe(c.solution.killerId);
        expect(deductionOf(TIERS[tier]).verdicts).toBe(true);
      }
    }
  });

  it('raises the ladder’s noise with the level, on the board outside testimony', () => {
    const share = (level: Level): number => {
      let noise = 0;
      let board = 0;
      for (const c of cases(4, level, 20)) {
        const rest = c.findable.filter((x) => x.kind !== 'testimony' && x.kind !== 'account');
        board += rest.length;
        noise += rest.filter((x) => x.role === 'noise' || x.role === 'disqualifier').length;
      }
      return noise / board;
    };
    const shares = ([1, 2, 3, 4] as Level[]).map(share);
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan((shares[i - 1] as number) - 0.02);
    expect(shares[3]).toBeGreaterThan(shares[0] as number);
  });
});

describe('M9: the client', () => {
  it('points at an innocent below Hard-boiled, and at the culprit no more than chance from it', () => {
    for (const tier of [0, 1, 2, 3, 4] as T[]) {
      for (const c of cases(tier, levelFor(tier), 20)) {
        expect(c.clientBrief.points.personId).not.toBe(c.solution.killerId);
      }
    }
    const hard = cases(5, 2, 60);
    const hits = hard.filter((c) => c.clientBrief.points.personId === c.solution.killerId).length;
    expect(hits / hard.length).toBeLessThanOrEqual(1 / 6 + 0.08);
  });
});

describe('M9: the solver as the engine calls it', () => {
  it('says a real lie is broken by what is findable, and a true word never is', () => {
    for (const tier of [2, 4, 5] as T[]) {
      for (const c of cases(tier, 2, 10)) {
        const all = c.findable.map((x) => x.id);
        for (const k of c.logic?.confrontations ?? []) {
          if (k.contradictions.length === 0) continue;
          const got = contradicts(c, all, { personId: k.personId, place: k.lie.claimed, ticks: k.lie.ticks });
          expect(got.yes, `T${tier} seed ${c.seed} ${k.lie.cover}`).toBe(true);
          expect(got.rules.length).toBeGreaterThan(0);
        }
        for (const cl of c.findable.filter((x) => x.kind === 'account')) {
          for (const f of cl.establishes) {
            if (f.kind !== 'claims') continue;
            const truth = truthOf(c, f.personId);
            if (f.ticks.some((t) => truth[t] !== f.place)) continue;
            expect(contradicts(c, all, { personId: f.personId, place: f.place, ticks: f.ticks }).yes).toBe(false);
          }
        }
      }
    }
  });

  it('settles the crime from the whole notebook, and names nobody from the opening alone', () => {
    for (const c of cases(4, 2, 10)) {
      const whole = crimeFromHeld(c, c.findable.map((x) => x.id));
      expect(whole.culprit).toBe(c.solution.killerId);
      expect(whole.ticks).toEqual([c.solution.murderTick]);
      const opening = crimeFromHeld(c, c.starting);
      expect(opening.culprit).toBeNull();
    }
  });

  it('refers to people the way the witness knows them', () => {
    for (const c of cases(5, 2, 5)) {
      for (const e of c.logic?.acquaintance ?? []) {
        expect(referenceOf(c, e.from, e.to)).toBe(e.ref);
        expect(knowsByName(c, e.from, e.to)).toBe(e.strength === 'name' || e.strength === 'relation');
        expect(acquaintanceOf(c, e.from, e.to)).toBe(e);
      }
    }
  });
});

describe('M9: determinism', () => {
  it('deals the same case for the same seed and options', () => {
    for (const tier of TIER_LIST) {
      const a = JSON.stringify(generateCase(7, { tier, level: levelFor(tier) }));
      const b = JSON.stringify(generateCase(7, { tier, level: levelFor(tier) }));
      expect(a).toBe(b);
    }
  });
});
