import {
  BRANCH_DEPTH,
  type Case,
  type Clue,
  type Difficulty,
  type Fact,
  type Id,
  type Tick,
} from './types.js';
import type { Cast } from './cast.js';
import type { ScheduleBuild } from './schedule.js';
import type { CandidateSet } from './clues.js';
import type { Rng } from './rng.js';

/**
 * The heart of M2. Simulation produces a hundred and fifty true things about
 * the evening; a player can absorb twenty-five. So the findable set is
 * *selected*: a spine that carries the proof, corroboration so that no leg of
 * it rests on one voice, and noise that is every bit as true as the spine but
 * about somebody else's secret.
 */

export function sourceKey(clue: Clue): string {
  return clue.source.type === 'person' ? `p:${clue.source.personId}` : `l:${clue.source.placeId}`;
}

/** One thing the player has to establish. Every `part` needs covering. */
export interface Requirement {
  id: string;
  label: string;
  parts: { key: string; clues: Clue[] }[];
}

export interface RequirementInput {
  killerId: Id;
  killerName: string;
  motiveType: string;
  innocents: { id: Id; name: string }[];
  murderTick: Tick;
  murderPlaceId: Id;
  killerClaimAtM: Id;
}

export function buildRequirements(input: RequirementInput, pool: Clue[]): Requirement[] {
  const { murderTick: M, murderPlaceId: L, killerClaimAtM: C, killerId, motiveType } = input;

  const pick = (p: (f: Fact, c: Clue) => boolean): Clue[] =>
    pool.filter((c) => c.establishes.some((f) => p(f, c)));

  const reqs: Requirement[] = [
    {
      id: 'tod',
      label: 'the time of death',
      parts: [
        {
          key: 'tod-alive',
          clues: pick(
            (f, c) => f.kind === 'victimAliveAt' && f.tick === M - 1 && c.anchorId !== undefined,
          ),
        },
        { key: 'tod-dead', clues: pick((f) => f.kind === 'victimDeadBy' && f.tick === M) },
      ],
    },
  ];

  for (const p of input.innocents) {
    reqs.push({
      id: `exc:${p.id}`,
      label: `${p.name} was not at the scene`,
      parts: [
        {
          key: `exc:${p.id}`,
          clues: pick(
            (f) =>
              (f.kind === 'personAt' && f.personId === p.id && f.tick === M && f.place !== L) ||
              (f.kind === 'personNotAt' && f.personId === p.id && f.tick === M && f.place === L),
          ),
        },
      ],
    });
  }

  reqs.push(
    {
      id: 'contradict',
      label: `${input.killerName}’s alibi does not stand`,
      parts: [
        {
          key: 'contradict',
          clues: pick(
            (f) =>
              f.kind === 'personNotAt' && f.personId === killerId && f.tick === M && f.place === C,
          ),
        },
      ],
    },
    {
      id: 'access',
      label: `${input.killerName} could reach the weapon`,
      parts: [{ key: 'access', clues: pick((f) => f.kind === 'hadAccess' && f.personId === killerId) }],
    },
    {
      id: 'method',
      label: 'the method',
      parts: [{ key: 'method', clues: pick((f) => f.kind === 'methodEvidence') }],
    },
    {
      id: 'motive',
      label: 'the motive',
      parts: [
        {
          key: 'motive',
          clues: pick(
            (f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === motiveType,
          ),
        },
      ],
    },
  );

  return reqs;
}

export interface Selection {
  findable: Clue[];
  starting: Id[];
  spine: Id[];
  par: number;
  requirements: Requirement[];
}

const TARGET = 30;
/** How much of the thirty the proof itself should take up. */
const PROOF_FLOOR = 17;
const SPINE_CAP = 12;

function greedySpine(rng: Rng, reqs: Requirement[], forced: Clue[], pool: Clue[]): Clue[] | null {
  const selected: Clue[] = forced.slice();
  const chosen = new Set(forced.map((c) => c.id));

  const covers = new Map<string, Set<Id>>();
  for (const r of reqs) {
    for (const part of r.parts) covers.set(part.key, new Set(part.clues.map((c) => c.id)));
  }

  const uncovered = new Set<string>();
  for (const [key, ids] of covers) {
    if (![...ids].some((id) => chosen.has(id))) uncovered.add(key);
  }

  const candidates = rng.shuffle(pool.filter((c) => !chosen.has(c.id)));
  const placesUsed = new Set(selected.map((c) => c.place));

  while (uncovered.size > 0) {
    if (selected.length >= SPINE_CAP) return null;
    let best: Clue | null = null;
    let bestScore = -1;
    for (const c of candidates) {
      if (chosen.has(c.id)) continue;
      let n = 0;
      for (const key of uncovered) if (covers.get(key)?.has(c.id)) n++;
      if (n === 0) continue;
      // Two clues that cover the same ground: prefer the one in a room we are
      // already walking to, because par is counted in footsteps.
      const score = n * 4 + (placesUsed.has(c.place) ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) return null;
    chosen.add(best.id);
    selected.push(best);
    placesUsed.add(best.place);
    for (const key of [...uncovered]) if (covers.get(key)?.has(best.id)) uncovered.delete(key);
  }
  return selected;
}

/**
 * Nothing in the proof may rest on one voice. Every requirement gets two
 * independent sources; every part of a requirement gets a second source too
 * where one is going spare.
 */
function corroborate(rng: Rng, reqs: Requirement[], spine: Clue[], floor: number): Clue[] | null {
  const chosen = new Set(spine.map((c) => c.id));
  const extra: Clue[] = [];
  const placesUsed = new Set(spine.map((c) => c.place));
  const taken = (c: Clue): boolean => chosen.has(c.id) || extra.some((e) => e.id === c.id);
  const addOne = (options: Clue[], keys: Set<string>): boolean => {
    const fresh = rng.shuffle(options).filter((c) => !taken(c) && !keys.has(sourceKey(c)));
    if (fresh.length === 0) return false;
    const preferred = fresh.filter((c) => placesUsed.has(c.place));
    const take = (preferred.length > 0 ? preferred : fresh)[0] as Clue;
    extra.push(take);
    placesUsed.add(take.place);
    return true;
  };

  const sourcesOf = (r: Requirement): Set<string> =>
    new Set(r.parts.flatMap((p) => p.clues).filter(taken).map(sourceKey));
  const universe = Array.from(
    new Map(reqs.flatMap((r) => r.parts.flatMap((p) => p.clues)).map((c) => [c.id, c])).values(),
  );

  // Greedy over requirements rather than one at a time: one second witness who
  // can name four people in a room settles four of these at once, which is the
  // difference between six corroborating clues and twelve.
  let guard = 0;
  while (guard++ < 40) {
    const thin = reqs.filter((r) => sourcesOf(r).size < 2);
    if (thin.length === 0) break;
    let best: Clue | null = null;
    let bestScore = -1;
    for (const c of rng.shuffle(universe)) {
      if (taken(c)) continue;
      const key = sourceKey(c);
      let n = 0;
      for (const r of thin) {
        if (!r.parts.some((p) => p.clues.some((x) => x.id === c.id))) continue;
        if (!sourcesOf(r).has(key)) n++;
      }
      if (n === 0) continue;
      const score = n * 4 + (placesUsed.has(c.place) ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) return null;
    extra.push(best);
    placesUsed.add(best.place);
  }
  if (reqs.some((r) => sourcesOf(r).size < 2)) return null;

  // Best-effort depth: a part with one voice behind it gets a second if one is
  // going spare. The time of death is the one that most wants it, since its
  // two halves are two different arguments.
  for (const r of reqs) {
    for (const part of r.parts) {
      if (spine.length + extra.length >= floor) break;
      const mine = part.clues.filter(taken);
      if (new Set(mine.map(sourceKey)).size >= 2) continue;
      addOne(part.clues, new Set(mine.map(sourceKey)));
    }
  }

  // Roll calls make the spine small — one witness can clear four people — and
  // a small spine would leave more than half the hand as noise. Pad with third
  // and fourth routes until the proof takes up enough of the thirty.
  let pad = 0;
  while (spine.length + extra.length < floor && pad++ < 20) {
    if (!addOne(universe, new Set())) break;
  }

  return extra;
}

/** Minimum actions to collect the spine, starting at the scene. */
export function computePar(spine: Clue[], starting: Set<Id>, places: Id[], sceneId: Id): number {
  const need = spine.filter((c) => !starting.has(c.id));
  if (need.length === 0) return 0;
  if (need.length > 14) return Infinity;
  const index = new Map(need.map((c, i) => [c.id, i]));

  // A clue opens up once any clue that leads to it has been taken.
  const parentsOf: number[][] = need.map(() => []);
  const alwaysOpen: boolean[] = need.map(() => false);
  for (const c of spine) {
    for (const target of c.leadsTo) {
      const ti = index.get(target);
      if (ti === undefined) continue;
      if (starting.has(c.id)) {
        alwaysOpen[ti] = true;
      } else {
        const si = index.get(c.id);
        if (si !== undefined) (parentsOf[ti] as number[]).push(si);
      }
    }
  }

  const placeIndex = new Map(places.map((p, i) => [p, i]));
  const cluePlace = need.map((c) => placeIndex.get(c.place) ?? 0);
  const start = placeIndex.get(sceneId) ?? 0;
  const goal = (1 << need.length) - 1;
  const span = goal + 1;

  const available = (i: number, mask: number): boolean => {
    if (alwaysOpen[i]) return true;
    const parents = parentsOf[i] as number[];
    if (parents.length === 0) return true;
    return parents.some((p) => (mask & (1 << p)) !== 0);
  };

  const seen = new Set<number>([start * span]);
  let frontier: { place: number; mask: number }[] = [{ place: start, mask: 0 }];
  let cost = 0;
  while (frontier.length > 0 && cost <= 60) {
    const next: { place: number; mask: number }[] = [];
    for (const s of frontier) {
      if (s.mask === goal) return cost;
      for (let i = 0; i < need.length; i++) {
        if (s.mask & (1 << i)) continue;
        if (cluePlace[i] !== s.place) continue;
        if (!available(i, s.mask)) continue;
        const mask = s.mask | (1 << i);
        const key = s.place * span + mask;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ place: s.place, mask });
      }
      for (let p = 0; p < places.length; p++) {
        if (p === s.place) continue;
        const key = p * span + s.mask;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ place: p, mask: s.mask });
      }
    }
    frontier = next;
    cost++;
  }
  return Infinity;
}

/** Every spine clue after the opening three hangs off one or two earlier ones. */
function wireSpine(rng: Rng, spine: Clue[], starting: Set<Id>): Record<Id, Id[]> {
  for (const c of spine) c.leadsTo = [];
  for (let i = 0; i < spine.length; i++) {
    const c = spine[i] as Clue;
    if (starting.has(c.id)) continue;
    const earlier = spine.slice(0, i);
    if (earlier.length === 0) continue;
    for (const p of rng.pickN(earlier, Math.min(2, earlier.length))) {
      if (!p.leadsTo.includes(c.id)) p.leadsTo.push(c.id);
    }
  }
  const snapshot: Record<Id, Id[]> = {};
  for (const c of spine) snapshot[c.id] = c.leadsTo.slice();
  return snapshot;
}

export interface SelectContext {
  rng: Rng;
  cast: Cast;
  build: ScheduleBuild;
  candidates: CandidateSet;
  difficulty: Difficulty;
  places: Id[];
  sceneId: Id;
  budget: number;
}

export function selectFindable(ctx: SelectContext): Selection | null {
  const { rng, cast, build, candidates, difficulty, places, sceneId, budget } = ctx;
  const pool = candidates.clues;
  const solutionPool = pool.filter((c) => c.aboutSecretOf === undefined);
  const reqs = buildRequirements(requirementInputFor(cast, build), pool);
  for (const r of reqs) {
    for (const part of r.parts) if (part.clues.length === 0) return null;
  }

  const forced = [candidates.scene, candidates.morgue, candidates.client];
  const startingIds = new Set(forced.map((c) => c.id));

  let best: { spine: Clue[]; corroboration: Clue[]; leads: Record<Id, Id[]>; par: number } | null =
    null;
  for (let restart = 0; restart < 6; restart++) {
    const spine = greedySpine(rng, reqs, forced, solutionPool);
    if (!spine) continue;
    const corroboration = corroborate(rng, reqs, spine, PROOF_FLOOR);
    if (!corroboration) continue;
    const leads = wireSpine(rng, spine, startingIds);
    const par = computePar(spine, startingIds, places, sceneId);
    if (best === null || par < best.par) best = { spine, corroboration, leads, par };
    if (par <= budget - 9) break;
  }
  if (!best || !Number.isFinite(best.par)) return null;
  if (best.par > budget - 6) return null;

  const { spine, corroboration } = best;
  for (const c of pool) {
    c.leadsTo = [];
    delete c.branchId;
  }
  for (const c of spine) {
    c.role = 'spine';
    c.leadsTo = (best.leads[c.id] ?? []).slice();
  }

  // Somebody other than the killer has to be visibly near the weapon, or the
  // access clue names him on its own and there is nothing left to work out.
  const killerId = cast.killer.id;
  const showsOtherAccess = (c: Clue): boolean =>
    c.establishes.some((f) => f.kind === 'hadAccess' && f.personId !== killerId);
  if (![...spine, ...corroboration].some(showsOtherAccess)) {
    const option = rng.shuffle(solutionPool).find(showsOtherAccess);
    if (!option) return null;
    corroboration.push(option);
  }

  for (const c of corroboration) {
    c.role = 'corroboration';
    const parent = rng.pick(spine);
    if (!parent.leadsTo.includes(c.id)) parent.leadsTo.push(c.id);
  }

  /* --- noise, in branches ------------------------------------------------ */
  const chosen: Clue[] = [...spine, ...corroboration];
  const room = TARGET - chosen.length;
  if (room < 4) return null;
  const [dMin, dMax] = BRANCH_DEPTH[difficulty];
  const branches: Clue[] = [];
  const hangPoints = [...spine, ...corroboration];
  const material = rng.shuffle(candidates.material);
  let branchNo = 0;
  let mi = 0;
  let guard = 0;
  while (branches.length < room && guard++ < 60) {
    const m = material[mi % material.length];
    mi++;
    if (!m) break;
    const used = new Set(branches.map((c) => c.id));
    const body = rng.shuffle([...m.hints, ...m.traces]).filter((c) => !used.has(c.id));
    const disq = m.disqualifiers.find((c) => !used.has(c.id));
    if (!disq || body.length === 0) continue;
    const left = room - branches.length;
    const depth = Math.max(1, Math.min(rng.range(dMin, dMax), body.length, left - 1));
    if (depth + 1 > left + 2) break;
    branchNo++;
    const branchId = `b${branchNo}`;
    let prev: Clue = rng.pick(hangPoints);
    for (const c of body.slice(0, depth)) {
      c.role = 'noise';
      c.branchId = branchId;
      if (!prev.leadsTo.includes(c.id)) prev.leadsTo.push(c.id);
      prev = c;
      branches.push(c);
    }
    disq.role = 'disqualifier';
    disq.branchId = branchId;
    if (!prev.leadsTo.includes(disq.id)) prev.leadsTo.push(disq.id);
    branches.push(disq);
  }

  const findable = [...chosen, ...branches];
  if (findable.length < TARGET - 2 || findable.length > TARGET + 2) return null;

  /* --- connectivity ------------------------------------------------------ */
  const byId = new Map(findable.map((c) => [c.id, c]));
  for (const c of findable) c.leadsTo = c.leadsTo.filter((id) => byId.has(id) && id !== c.id);
  const reached = new Set<Id>(forced.map((c) => c.id));
  const queue = [...reached];
  while (queue.length > 0) {
    const cur = byId.get(queue.shift() as Id);
    if (!cur) continue;
    for (const next of cur.leadsTo) {
      if (reached.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
  }
  if (reached.size !== findable.length) return null;

  return {
    findable,
    starting: forced.map((c) => c.id),
    spine: spine.map((c) => c.id),
    par: best.par,
    requirements: reqs,
  };
}

/** The requirement shape the selector wants, out of the live build. */
export function requirementInputFor(cast: Cast, build: ScheduleBuild): RequirementInput {
  return {
    killerId: cast.killer.id,
    killerName: cast.killer.name,
    motiveType: cast.killer.motive?.type as string,
    innocents: cast.innocents.map((p) => ({ id: p.id, name: p.name })),
    murderTick: build.murderTick,
    murderPlaceId: build.murderPlaceId,
    killerClaimAtM: build.killerClaimAtM,
  };
}

/** The same, out of a finished case. Used by the checker and the tests. */
export function requirementInputForCase(
  c: Pick<Case, 'people' | 'schedules' | 'solution'>,
): RequirementInput {
  const killer = c.people.find((p) => p.id === c.solution.killerId) as Case['people'][number];
  const M = c.solution.murderTick;
  return {
    killerId: killer.id,
    killerName: killer.name,
    motiveType: c.solution.motiveType,
    innocents: c.people
      .filter((p) => p.kind === 'suspect' && p.id !== killer.id)
      .map((p) => ({ id: p.id, name: p.name })),
    murderTick: M,
    murderPlaceId: c.solution.murderPlaceId,
    killerClaimAtM: c.schedules.find((s) => s.personId === killer.id)?.claimed[M] as Id,
  };
}
