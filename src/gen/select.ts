import {
  BRANCH_COUNT,
  BRANCH_COUNT_FLOOR,
  BRANCH_DEPTH,
  FINDABLE_TARGET,
  FINDABLE_TOLERANCE,
  NOISE_RATIO,
  PAR_CEILING,
  PAR_FLOOR,
  SPINE_CAP,
  type Case,
  type Clue,
  type Difficulty,
  type Fact,
  type Id,
  type Tick,
} from './types.js';
import type { Cast } from './cast.js';
import type { ScheduleBuild } from './schedule.js';
import type { CandidateSet, SecretBranchMaterial } from './clues.js';
import type { Rng } from './rng.js';

/**
 * The heart of M2, re-cut for M2b. Simulation produces a couple of hundred
 * true things about the evening; a player can absorb thirty-odd. So the
 * findable set is *selected*: a spine that carries the proof, corroboration so
 * that the parts of it that matter do not rest on one voice, and noise that is
 * every bit as true as the spine but about somebody else's secret.
 *
 * What changed in M2b: with no roll calls, clearing five innocents costs five
 * clues instead of one, so the spine runs to eleven or thirteen instead of
 * seven, par runs to twelve or fourteen instead of six, and the budget is
 * computed from par rather than fixed. The corroboration rule changed to
 * match: the five legs that name the killer need two routes each, but an
 * innocent's alibi needs only one in the spine — the second, when there is
 * one, falls out of the disqualifier at the end of that innocent's branch.
 */

export function sourceKey(clue: Clue): string {
  return clue.source.type === 'person' ? `p:${clue.source.personId}` : `l:${clue.source.placeId}`;
}

/** One thing the player has to establish. Every `part` needs covering. */
export interface Requirement {
  id: string;
  label: string;
  /** How many independent sources this leg of the proof needs. */
  routes: number;
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
      routes: 2,
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
      // One route in the spine. A second is welcome and usually turns up in
      // the disqualifier that ends this person's branch — a drinker on a stool
      // at half past nine is exculpated by the thing he is ashamed of.
      routes: 1,
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
      routes: 2,
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
      routes: 2,
      parts: [{ key: 'access', clues: pick((f) => f.kind === 'hadAccess' && f.personId === killerId) }],
    },
    {
      id: 'method',
      label: 'the method',
      routes: 2,
      parts: [{ key: 'method', clues: pick((f) => f.kind === 'methodEvidence') }],
    },
    {
      id: 'motive',
      label: 'the motive',
      routes: 2,
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
      // already walking to, because par is counted in footsteps. With roll
      // calls gone `n` is almost always 1, so this tie-break does most of the
      // work, and par is mostly the shape of the spine's route.
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
 * The minimum corroboration: every requirement up to its own route count. No
 * padding — the padding happens later, once the size of the noise is known.
 */
function corroborate(rng: Rng, reqs: Requirement[], spine: Clue[], universe: Clue[]): Clue[] | null {
  const chosen = new Set(spine.map((c) => c.id));
  const extra: Clue[] = [];
  const placesUsed = new Set(spine.map((c) => c.place));
  const taken = (c: Clue): boolean => chosen.has(c.id) || extra.some((e) => e.id === c.id);

  const sourcesOf = (r: Requirement): Set<string> =>
    new Set(r.parts.flatMap((p) => p.clues).filter(taken).map(sourceKey));

  let guard = 0;
  while (guard++ < 60) {
    const thin = reqs.filter((r) => sourcesOf(r).size < r.routes);
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
      const score = n * 4 + (placesUsed.has(c.place) ? 0 : 1);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) return null;
    extra.push(best);
    placesUsed.add(best.place);
  }
  if (reqs.some((r) => sourcesOf(r).size < r.routes)) return null;
  return extra;
}

/**
 * Bring the proof up to the size the noise plan leaves for it, with third and
 * fourth routes. Depth goes where it is thinnest first: a leg standing on one
 * voice gets a second before a leg with two gets a third.
 */
function padProof(
  rng: Rng,
  reqs: Requirement[],
  spine: Clue[],
  extra: Clue[],
  universe: Clue[],
  want: number,
): void {
  const taken = (c: Clue): boolean =>
    spine.some((s) => s.id === c.id) || extra.some((e) => e.id === c.id);
  const sourcesOf = (r: Requirement): Set<string> =>
    new Set(r.parts.flatMap((p) => p.clues).filter(taken).map(sourceKey));

  let guard = 0;
  while (spine.length + extra.length < want && guard++ < 60) {
    let best: Clue | null = null;
    let bestDepth = Infinity;
    for (const r of [...reqs].sort((a, b) => sourcesOf(a).size - sourcesOf(b).size)) {
      const depth = sourcesOf(r).size;
      if (depth >= bestDepth) continue;
      const keys = sourcesOf(r);
      const options = rng
        .shuffle(r.parts.flatMap((p) => p.clues))
        .filter((c) => !taken(c) && !keys.has(sourceKey(c)));
      if (options.length === 0) continue;
      best = options[0] as Clue;
      bestDepth = depth;
    }
    if (!best) {
      const any = rng.shuffle(universe).find((c) => !taken(c));
      if (!any) break;
      extra.push(any);
      continue;
    }
    extra.push(best);
  }
}

/**
 * Minimum actions to collect the spine, starting at the scene.
 *
 * Exact, not a heuristic: a breadth-first search over (where the detective is,
 * which spine clues he holds), where one action is either fetching a clue in
 * the room he is standing in or moving to another room. Travel is therefore
 * counted, and because the search is exhaustive over the optimal play of a
 * player who already knows which clues are the spine, the number it returns is
 * a floor on what a real evening costs. It never flatters the case.
 */
export function computePar(spine: Clue[], starting: Set<Id>, places: Id[], sceneId: Id): number {
  const need = spine.filter((c) => !starting.has(c.id));
  if (need.length === 0) return 0;
  if (need.length > 16) return Infinity;
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

/** How the noise divides: how many branches, and how long each one runs. */
interface NoisePlan {
  findable: number;
  sizes: number[];
}

function distribute(total: number, buckets: number): number[] {
  const base = Math.floor(total / buckets);
  const rest = total % buckets;
  return Array.from({ length: buckets }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Pick a hand size and a set of branch lengths that land the noise ratio in
 * range. Branch count is the difficulty dial — five shallow branches at 1,
 * three deep ones at 3 — but it bends to whatever the cast can actually
 * supply, and never below three.
 */
function planNoise(
  difficulty: Difficulty,
  materialCount: number,
  proofSize: number,
): NoisePlan | null {
  const [minD, capD] = BRANCH_DEPTH[difficulty];
  const want = BRANCH_COUNT[difficulty];
  const branchOptions = [want, want + 1, want - 1, want + 2, want - 2].filter(
    (b) => b >= BRANCH_COUNT_FLOOR && b <= materialCount,
  );
  if (branchOptions.length === 0) return null;

  const sizeOptions: number[] = [];
  for (let d = -FINDABLE_TOLERANCE; d <= FINDABLE_TOLERANCE; d++) sizeOptions.push(d);
  sizeOptions.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);

  // Branch count is the outer loop, because it is the dial the player feels:
  // five shallow branches or three deep ones is a different evening, and the
  // hand size is only there to keep the noise ratio honest.
  for (const b of branchOptions) {
    for (const delta of sizeOptions) {
      const findable = FINDABLE_TARGET + delta;
      const lo = Math.ceil(NOISE_RATIO[0] * findable);
      const hi = Math.floor(NOISE_RATIO[1] * findable);
      const mid = 0.4 * findable;
      const noiseOptions: number[] = [];
      for (let n = lo; n <= hi; n++) noiseOptions.push(n);
      noiseOptions.sort((a, b2) => Math.abs(a - mid) - Math.abs(b2 - mid) || b2 - a);
      for (const noise of noiseOptions) {
        if (findable - noise < proofSize) continue;
        if (noise < b * (minD + 1) || noise > b * (capD + 1)) continue;
        const sizes = distribute(noise, b);
        if (sizes.some((s) => s < minD + 1 || s > capD + 1)) continue;
        return { findable, sizes };
      }
    }
  }
  return null;
}

export interface SelectContext {
  rng: Rng;
  cast: Cast;
  build: ScheduleBuild;
  candidates: CandidateSet;
  difficulty: Difficulty;
  places: Id[];
  sceneId: Id;
  /** Optional sink for the reason a selection was abandoned. */
  reject?: (reason: string) => void;
}

export function selectFindable(ctx: SelectContext): Selection | null {
  const { rng, cast, build, candidates, difficulty, places, sceneId } = ctx;
  const bail = (reason: string): null => {
    ctx.reject?.(reason);
    return null;
  };
  const pool = candidates.clues;
  const solutionPool = pool.filter((c) => c.aboutSecretOf === undefined);
  const reqs = buildRequirements(requirementInputFor(cast, build), pool);
  for (const r of reqs) {
    for (const part of r.parts) {
      if (part.clues.length === 0) return bail(`nothing at all establishes ${part.key}`);
    }
  }

  // Secret material is reserved for the noise branches. A disqualifier does
  // establish where an innocent was, so it would happily serve as a second
  // route for an exculpation — and then get dealt a second time as the end of
  // its own branch.
  const universe = Array.from(
    new Map(
      reqs
        .flatMap((r) => r.parts.flatMap((p) => p.clues))
        .filter((c) => c.aboutSecretOf === undefined)
        .map((c) => [c.id, c]),
    ).values(),
  );

  const usable: SecretBranchMaterial[] = candidates.material.filter(
    (m) => m.disqualifiers.length > 0 && m.hints.length + m.traces.length > 0,
  );
  if (usable.length < BRANCH_COUNT_FLOOR) {
    return bail('fewer than three innocent secrets can carry a branch');
  }

  const forced = [candidates.scene, candidates.morgue, candidates.client];
  const startingIds = new Set(forced.map((c) => c.id));

  let best: { spine: Clue[]; corroboration: Clue[]; leads: Record<Id, Id[]>; par: number } | null =
    null;
  let sawSpine = false;
  let sawPar = false;
  for (let restart = 0; restart < 8; restart++) {
    const spine = greedySpine(rng, reqs, forced, solutionPool);
    if (!spine) continue;
    sawSpine = true;
    const corroboration = corroborate(rng, reqs, spine, universe);
    if (!corroboration) continue;
    const leads = wireSpine(rng, spine, startingIds);
    const par = computePar(spine, startingIds, places, sceneId);
    if (!Number.isFinite(par)) continue;
    sawPar = true;
    if (par < PAR_FLOOR || par > PAR_CEILING) {
      if (best === null) best = { spine, corroboration, leads, par };
      continue;
    }
    // In range: take the cheapest, which is the one furthest from the ceiling.
    if (best === null || best.par < PAR_FLOOR || best.par > PAR_CEILING || par < best.par) {
      best = { spine, corroboration, leads, par };
    }
  }
  if (!best) {
    if (!sawSpine) return bail(`no spine covers the proof inside ${SPINE_CAP} clues`);
    if (!sawPar) return bail('the spine cannot be walked from the scene');
    return bail('the proof could not be corroborated');
  }
  if (best.par < PAR_FLOOR) return bail(`par came out at ${best.par}, under the floor`);
  if (best.par > PAR_CEILING) return bail(`par came out at ${best.par}, over the ceiling`);

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
    if (!option) return bail('nobody but the killer can be seen near the weapon');
    corroboration.push(option);
  }

  /* --- how big a hand, and how much of it is noise ---------------------- */
  const plan = planNoise(difficulty, usable.length, spine.length + corroboration.length);
  if (!plan) return bail('no hand size puts the noise ratio in range');
  const noiseWanted = plan.sizes.reduce((a, b) => a + b, 0);
  padProof(rng, reqs, spine, corroboration, universe, plan.findable - noiseWanted);

  for (const c of corroboration) {
    c.role = 'corroboration';
    const parent = rng.pick(spine);
    if (!parent.leadsTo.includes(c.id)) parent.leadsTo.push(c.id);
  }

  /* --- noise, one branch per secret activity ----------------------------- */
  const chosen: Clue[] = [...spine, ...corroboration];
  const branches: Clue[] = [];
  const hangPoints = [...spine, ...corroboration];
  const material = rng.shuffle(usable);
  let branchNo = 0;
  for (const [i, size] of plan.sizes.entries()) {
    const m = material[i];
    if (!m) break;
    const used = new Set([...branches, ...chosen].map((c) => c.id));
    const body = rng.shuffle([...m.hints, ...m.traces]).filter((c) => !used.has(c.id));
    const disq = m.disqualifiers.find((c) => !used.has(c.id));
    if (!disq || body.length === 0) continue;
    const depth = Math.min(size - 1, body.length);
    if (depth < 1) continue;
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
  if (branchNo < BRANCH_COUNT_FLOOR) return bail('fewer than three branches could be dealt');

  const findable = [...chosen, ...branches];
  const lo = FINDABLE_TARGET - FINDABLE_TOLERANCE;
  const hi = FINDABLE_TARGET + FINDABLE_TOLERANCE;
  if (findable.length < lo || findable.length > hi) {
    return bail(`the hand came out at ${findable.length} clues`);
  }
  const noiseShare = branches.length / findable.length;
  if (noiseShare < NOISE_RATIO[0] || noiseShare > NOISE_RATIO[1]) {
    return bail(`the noise ratio came out at ${Math.round(noiseShare * 100)}%`);
  }

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
  if (reached.size !== findable.length) return bail('the lead graph does not connect');

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
    killerName: cast.killer.surname,
    motiveType: cast.killer.motive?.type as string,
    innocents: cast.innocents.map((p) => ({ id: p.id, name: p.surname })),
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
    killerName: killer.surname,
    motiveType: c.solution.motiveType,
    innocents: c.people
      .filter((p) => p.kind === 'suspect' && p.id !== killer.id)
      .map((p) => ({ id: p.id, name: p.surname })),
    murderTick: M,
    murderPlaceId: c.solution.murderPlaceId,
    killerClaimAtM: c.schedules.find((s) => s.personId === killer.id)?.claimed[M] as Id,
  };
}
