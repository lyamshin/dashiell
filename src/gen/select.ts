import {
  BRANCH_COUNT_FLOOR,
  FINDABLE_TOLERANCE,
  SPINE_CAP,
  type Case,
  type Clue,
  type Fact,
  type Id,
  type Tick,
} from './types.js';
import type { Cast } from './cast.js';
import type { ScheduleBuild } from './schedule.js';
import type { CandidateSet, SecretBranchMaterial } from './clues.js';
import type { Rng } from './rng.js';
import type { CaseShape, Dials, Ladder, ProofLeg } from './shape.js';

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

/**
 * M7: which legs of the proof a case must carry, and on how many routes.
 * The no-options case is `LEGACY_PROOF`: two anchors, all four legs, and the
 * big five corroborated — the proof as it was before M7.
 */
export interface ProofSpec {
  anchorsRequired: 0 | 1 | 2;
  legs: ProofLeg[];
  corroboration: Ladder['corroboration'];
}

export const LEGACY_PROOF: ProofSpec = {
  anchorsRequired: 2,
  legs: ['access', 'method', 'motive', 'signature'],
  corroboration: 'bigFive',
};

export function proofSpecOf(dials: Pick<Dials, 'shape' | 'ladder'>): ProofSpec {
  return {
    anchorsRequired: dials.shape.anchorsRequired,
    legs: dials.shape.proof,
    corroboration: dials.ladder.corroboration,
  };
}

/** The spine cap, stretched by one for every suspect past six. */
export function spineCapFor(shape: Pick<CaseShape, 'suspects'>): number {
  return SPINE_CAP + Math.max(0, shape.suspects - 6);
}

/** Routes a requirement of the big five wants, and an exculpation wants. */
function routesFor(spec: ProofSpec, kind: 'bigFive' | 'exculpation'): number {
  if (spec.corroboration === 'single') return 1;
  if (kind === 'exculpation') return spec.corroboration === 'full' ? 2 : 1;
  return 2;
}

export function buildRequirements(
  input: RequirementInput,
  pool: Clue[],
  spec: ProofSpec = LEGACY_PROOF,
): Requirement[] {
  const { murderTick: M, murderPlaceId: L, killerClaimAtM: C, killerId, motiveType } = input;

  const pick = (p: (f: Fact, c: Clue) => boolean): Clue[] =>
    pool.filter((c) => c.establishes.some((f) => p(f, c)));

  const reqs: Requirement[] = [];
  // M7: two anchors at Hard-boiled; one at Soft-boiled and Medium, where the
  // window is the half hour before and the half hour of, so the one that
  // matters is the victim alive at the first; none where the coroner names
  // the half hour outright.
  if (spec.anchorsRequired > 0) {
    const alive = {
      key: 'tod-alive',
      clues: pick(
        (f, c) => f.kind === 'victimAliveAt' && f.tick === M - 1 && c.anchorId !== undefined,
      ),
    };
    const dead = { key: 'tod-dead', clues: pick((f) => f.kind === 'victimDeadBy' && f.tick === M) };
    reqs.push({
      id: 'tod',
      label: 'the time of death',
      routes: routesFor(spec, 'bigFive'),
      parts: spec.anchorsRequired === 2 ? [alive, dead] : [alive],
    });
  }

  for (const p of input.innocents) {
    reqs.push({
      id: `exc:${p.id}`,
      label: `${p.name} was not at the scene`,
      // One route in the spine. A second is welcome and usually turns up in
      // the disqualifier that ends this person's branch — a drinker on a stool
      // at half past nine is exculpated by the thing he is ashamed of.
      // M7: two at Beat and Precinct, where every essential fact has two.
      routes: routesFor(spec, 'exculpation'),
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

  const routes = routesFor(spec, 'bigFive');
  reqs.push({
    id: 'contradict',
    label: `${input.killerName}’s alibi does not stand`,
    routes,
    parts: [
      {
        key: 'contradict',
        clues: pick(
          (f) =>
            f.kind === 'personNotAt' && f.personId === killerId && f.tick === M && f.place === C,
        ),
      },
    ],
  });
  if (spec.legs.includes('access')) {
    reqs.push({
      id: 'access',
      label: `${input.killerName} could reach the weapon`,
      routes,
      parts: [{ key: 'access', clues: pick((f) => f.kind === 'hadAccess' && f.personId === killerId) }],
    });
  }
  if (spec.legs.includes('method')) {
    reqs.push({
      id: 'method',
      label: 'the method',
      routes,
      parts: [{ key: 'method', clues: pick((f) => f.kind === 'methodEvidence') }],
    });
  }
  if (spec.legs.includes('motive')) {
    reqs.push({
      id: 'motive',
      label: 'the motive',
      routes,
      parts: [
        {
          key: 'motive',
          clues: pick(
            (f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === motiveType,
          ),
        },
      ],
    });
  }

  return reqs;
}

/**
 * The trope's own requirement, as this proof takes it: not at all where the
 * tier leaves the signature out, on one route at the DA's Office, and as the
 * trope declared it otherwise.
 */
export function signatureRequirements(extra: Requirement[], spec: ProofSpec): Requirement[] {
  if (!spec.legs.includes('signature')) return [];
  if (spec.corroboration !== 'single') return extra;
  return extra.map((r) => ({ ...r, routes: 1 }));
}

/**
 * M7: a loose end. Where a tier has too few secrets to carry its noise in
 * branches — Raw has none at all — the rest of the noise is the evening
 * itself: somebody who is not the culprit, seen somewhere at an hour that has
 * nothing to do with anything, or a grudge an innocent held. True, one
 * subject, never at the crime's half hour, never about the culprit or the
 * victim, never an hour its subject is lying about, and never a fact any leg
 * of the proof turns on. A loose end leads nowhere, which is what makes it a
 * dead end of depth one.
 */
export function isLooseEnd(
  clue: Clue,
  who: { murderTick: Tick; innocentIds: Set<Id> },
  lies: Record<Id, Tick[]>,
): boolean {
  if (clue.aboutSecretOf !== undefined) return false;
  if (!['observation', 'anchor', 'physical', 'document', 'overheard'].includes(clue.kind)) return false;
  if (clue.establishes.length === 0) return false;
  let subject: Id | null = null;
  for (const f of clue.establishes) {
    if (f.kind === 'personAt') {
      if (f.tick === who.murderTick) return false;
      if ((lies[f.personId] ?? []).includes(f.tick)) return false;
    } else if (f.kind !== 'hasMotive') {
      return false;
    }
    if (!who.innocentIds.has(f.personId)) return false;
    if (subject !== null && subject !== f.personId) return false;
    subject = f.personId;
  }
  return subject !== null;
}

export interface Selection {
  findable: Clue[];
  starting: Id[];
  spine: Id[];
  par: number;
  requirements: Requirement[];
}

function greedySpine(
  rng: Rng,
  reqs: Requirement[],
  forced: Clue[],
  pool: Clue[],
  cap = SPINE_CAP,
): Clue[] | null {
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
    if (selected.length >= cap) return null;
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
  /*
   * Every opening clue has to lead somewhere. The free three are the only way
   * into the graph, and one of them that leads nowhere is a dead end on page
   * one — the client tells you why you were hired and hands you nothing.
   * The random wiring above drops one about one case in fifty.
   */
  const children = spine.filter((c) => !starting.has(c.id));
  if (children.length > 0) {
    for (const c of spine) {
      if (!starting.has(c.id) || c.leadsTo.length > 0) continue;
      c.leadsTo.push(rng.pick(children).id);
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
 *
 * M7: this is the legacy planner, run only on the pre-M7 ladders, whose dials
 * it reads off the ladder rather than off the constants — the same numbers.
 */
function planNoise(
  ladder: Ladder,
  FINDABLE_TARGET: number,
  materialCount: number,
  proofSize: number,
): NoisePlan | null {
  const [minD, capD] = ladder.branchDepth;
  const want = ladder.branchCount;
  const NOISE_RATIO = ladder.noiseRatio;
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

/** M7: a noise plan with loose ends in it, for the shaped planner. */
interface ShapedPlan {
  findable: number;
  /** Clues the proof is padded to, corroboration included. */
  proof: number;
  noise: number;
  branches: number;
  loose: number;
}

/**
 * M7: the noise planner for every ladder that is not a pre-M7 one.
 *
 * The noise ratio is the primary dial, so it is held; the hand size is the
 * shape's target where the ratio allows it and moves where it does not — at
 * the DA's Office a single-route proof cannot be padded, so the hand grows
 * until two thirds of it is noise. Branches carry as much of the noise as the
 * secrets can, as near the ladder's count as the cast allows; loose ends carry
 * the rest. Deterministic: no draws.
 */
function planShaped(
  ladder: Ladder,
  target: number,
  bodies: number[],
  proofMin: number,
  padRoom: number,
  looseSupply: number,
  floorB: number,
): ShapedPlan | null {
  const [minD, capD] = ladder.branchDepth;
  const sorted = bodies.slice().sort((a, b) => b - a);
  const canPad = ladder.corroboration !== 'single';
  const want = Math.min(ladder.branchCount, sorted.length);
  let best: (ShapedPlan & { cost: number }) | null = null;
  const hiF = Math.max(target * 3, proofMin * 4);
  const mid = (ladder.noiseRatio[0] + ladder.noiseRatio[1]) / 2;
  for (let F = proofMin + 1; F <= hiF; F++) {
    const lo = Math.ceil(ladder.noiseRatio[0] * F - 1e-9);
    const hi = Math.floor(ladder.noiseRatio[1] * F + 1e-9);
    for (let N = lo; N <= hi; N++) {
      const P = F - N;
      if (P < proofMin) continue;
      if (!canPad && P !== proofMin) continue;
      if (P - proofMin > padRoom) continue;
      // For this hand and this much noise, the branch count that puts the
      // most of it in branches, and of those the nearest the ladder's count.
      let pick: { b: number; loose: number } | null = null;
      for (let b = floorB; b <= sorted.length; b++) {
        const usable = sorted.slice(0, b);
        if (usable.some((len) => len < minD)) continue;
        const most = usable.reduce((n, len) => n + Math.min(capD, len) + 1, 0);
        if (N < b * (minD + 1)) continue;
        const loose = N - Math.min(N, most);
        if (loose > looseSupply) continue;
        if (
          pick === null ||
          loose < pick.loose ||
          (loose === pick.loose && Math.abs(b - want) < Math.abs(pick.b - want))
        ) {
          pick = { b, loose };
        }
      }
      if (pick === null) continue;
      // The hand the shape wants, at the middle of the ladder's noise band.
      const cost =
        Math.abs(F - target) + Math.abs(N - mid * F) * 4 + Math.abs(pick.b - want);
      if (best === null || cost < best.cost) {
        best = { findable: F, proof: P, noise: N, branches: pick.b, loose: pick.loose, cost };
      }
    }
  }
  if (!best) return null;
  return {
    findable: best.findable,
    proof: best.proof,
    noise: best.noise,
    branches: best.branches,
    loose: best.loose,
  };
}

/**
 * M7 §Difficulty: noise placement scales. At Beat a branch hangs off a spine
 * clue in the least-walked room; at Homicide and above off the opening clues
 * or the most-walked room, where the player cannot help but see it.
 */
function hangPointsFor(
  placement: Ladder['noisePlacement'],
  spine: Clue[],
  corroboration: Clue[],
  starting: Set<Id>,
): Clue[] {
  const all = [...spine, ...corroboration];
  if (placement === 'random') return all;
  const visits = new Map<Id, number>();
  for (const c of spine) visits.set(c.place, (visits.get(c.place) ?? 0) + 1);
  if (placement === 'busy') {
    let most = -1;
    for (const n of visits.values()) most = Math.max(most, n);
    const busy = all.filter((c) => starting.has(c.id) || visits.get(c.place) === most);
    return busy.length > 0 ? busy : all;
  }
  const open = all.filter((c) => !starting.has(c.id));
  let least = Infinity;
  for (const c of open) least = Math.min(least, visits.get(c.place) ?? 0);
  const quiet = open.filter((c) => (visits.get(c.place) ?? 0) === least);
  return quiet.length > 0 ? quiet : all;
}

/** Every requirement part a clue covers. */
function partsCovered(reqs: Requirement[], clue: Clue): string[] {
  const out: string[] = [];
  for (const r of reqs) for (const p of r.parts) if (p.clues.some((c) => c.id === clue.id)) out.push(p.key);
  return out;
}

export interface SelectContext {
  rng: Rng;
  cast: Cast;
  build: ScheduleBuild;
  candidates: CandidateSet;
  /** M7: the shape and the ladder. A pre-M7 ladder runs today's selection exactly. */
  dials: Dials;
  places: Id[];
  sceneId: Id;
  /**
   * M5 §2.2: the trope's own essential fact set, declared alongside its
   * unknowns and folded in here so that a signature clue is load-bearing —
   * it goes into the spine, it is corroborated, and it is counted in par.
   */
  extraRequirements?: Requirement[];
  /** Optional sink for the reason a selection was abandoned. */
  reject?: (reason: string) => void;
}

export function selectFindable(ctx: SelectContext): Selection | null {
  const { rng, cast, build, candidates, dials, places, sceneId } = ctx;
  const { shape, ladder } = dials;
  // A pre-M7 ladder runs the selection exactly as it ran before M7: the same
  // planner, the same draws in the same order, the same checks.
  const legacy = ladder.legacy === true;
  const spec = proofSpecOf(dials);
  const bail = (reason: string): null => {
    ctx.reject?.(reason);
    return null;
  };
  const pool = candidates.clues;
  const solutionPool = pool.filter((c) => c.aboutSecretOf === undefined);
  const reqs = [
    ...buildRequirements(requirementInputFor(cast, build), pool, spec),
    ...signatureRequirements(
      (ctx.extraRequirements ?? []).filter((r) => r.parts.every((p) => p.clues.length > 0)),
      spec,
    ),
  ];
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
    (m) => m.disqualifiers.length > 0 && m.leadIns.length + m.hints.length + m.traces.length > 0,
  );
  // M7: three branches at the least, or as many secrets as the tier deals.
  const branchFloor = legacy
    ? BRANCH_COUNT_FLOOR
    : Math.min(BRANCH_COUNT_FLOOR, usable.length);
  if (usable.length < branchFloor) {
    return bail('fewer than three innocent secrets can carry a branch');
  }

  const forced = [candidates.scene, candidates.morgue, candidates.client];
  const startingIds = new Set(forced.map((c) => c.id));
  const spineCap = spineCapFor(shape);
  const [parFloor, parCeiling] = shape.par;

  let best: { spine: Clue[]; corroboration: Clue[]; leads: Record<Id, Id[]>; par: number } | null =
    null;
  let sawSpine = false;
  let sawPar = false;
  for (let restart = 0; restart < 8; restart++) {
    const spine = greedySpine(rng, reqs, forced, solutionPool, spineCap);
    if (!spine) continue;
    sawSpine = true;
    const corroboration = corroborate(rng, reqs, spine, universe);
    if (!corroboration) continue;
    const leads = wireSpine(rng, spine, startingIds);
    const par = computePar(spine, startingIds, places, sceneId);
    if (!Number.isFinite(par)) continue;
    sawPar = true;
    if (par < parFloor || par > parCeiling) {
      if (best === null) best = { spine, corroboration, leads, par };
      continue;
    }
    // In range: take the cheapest, which is the one furthest from the ceiling.
    if (best === null || best.par < parFloor || best.par > parCeiling || par < best.par) {
      best = { spine, corroboration, leads, par };
    }
  }
  if (!best) {
    if (!sawSpine) return bail(`no spine covers the proof inside ${spineCap} clues`);
    if (!sawPar) return bail('the spine cannot be walked from the scene');
    return bail('the proof could not be corroborated');
  }
  if (best.par < parFloor) return bail(`par came out at ${best.par}, under the floor`);
  if (best.par > parCeiling) return bail(`par came out at ${best.par}, over the ceiling`);

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
  // M7: only where access is a leg of the proof; and at the DA's Office the
  // clue that shows it may not be a second route to anything.
  if (spec.legs.includes('access')) {
    const killerId = cast.killer.id;
    const showsOtherAccess = (c: Clue): boolean =>
      c.establishes.some((f) => f.kind === 'hadAccess' && f.personId !== killerId);
    if (![...spine, ...corroboration].some(showsOtherAccess)) {
      const fits = (c: Clue): boolean =>
        showsOtherAccess(c) &&
        (spec.corroboration !== 'single' || partsCovered(reqs, c).length === 0);
      const option = rng.shuffle(solutionPool).find(legacy ? showsOtherAccess : fits);
      if (!option) return bail('nobody but the killer can be seen near the weapon');
      corroboration.push(option);
    }
  }

  // M7: at the DA's Office every essential fact has exactly one route in the
  // proof. The greedy spine almost always gives that on its own; when a clue
  // chosen for one part happens to cover another already covered, start again.
  if (spec.corroboration === 'single') {
    const proof = new Set([...spine, ...corroboration].map((c) => c.id));
    for (const r of reqs) {
      for (const part of r.parts) {
        const sources = new Set(part.clues.filter((c) => proof.has(c.id)).map(sourceKey));
        if (sources.size !== 1) return bail(`${part.key} has ${sources.size} routes at single`);
      }
    }
  }

  const chosen: Clue[] = [...spine, ...corroboration];
  const branches: Clue[] = [];
  let branchNo = 0;

  // Shuffled, then the secrets an anchor already caught somebody out on go
  // first: those branches open on the strongest lead in the hand, and at
  // difficulty 3 only three of the four or five activities get dealt at all.
  const dealBranch = (m: SecretBranchMaterial, size: number, hangPoints: Clue[]): void => {
    const used = new Set([...branches, ...chosen].map((c) => c.id));
    // A lead-in goes first when there is one: an anchor catching a liar out is
    // the strongest thing in a branch, and it should be what opens it.
    const body = [
      ...m.leadIns.filter((c) => !used.has(c.id)),
      ...rng.shuffle([...m.hints, ...m.traces]).filter((c) => !used.has(c.id)),
    ];
    const disq = m.disqualifiers.find((c) => !used.has(c.id));
    if (!disq || body.length === 0) return;
    const depth = Math.min(size - 1, body.length);
    if (depth < 1) return;
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
  };

  if (legacy) {
    /* --- how big a hand, and how much of it is noise -------------------- */
    const plan = planNoise(ladder, shape.findable, usable.length, spine.length + corroboration.length);
    if (!plan) return bail('no hand size puts the noise ratio in range');
    const noiseWanted = plan.sizes.reduce((a, b) => a + b, 0);
    padProof(rng, reqs, spine, corroboration, universe, plan.findable - noiseWanted);

    for (const c of corroboration) {
      c.role = 'corroboration';
      const parent = rng.pick(spine);
      if (!parent.leadsTo.includes(c.id)) parent.leadsTo.push(c.id);
    }
    chosen.splice(0, chosen.length, ...spine, ...corroboration);

    /* --- noise, one branch per secret activity --------------------------- */
    const hangPoints = [...spine, ...corroboration];
    const material = rng
      .shuffle(usable)
      .slice()
      .sort((a, b) => (b.leadIns.length > 0 ? 1 : 0) - (a.leadIns.length > 0 ? 1 : 0));
    for (const [i, size] of plan.sizes.entries()) {
      const m = material[i];
      if (!m) break;
      dealBranch(m, size, hangPoints);
    }
    if (branchNo < BRANCH_COUNT_FLOOR) return bail('fewer than three branches could be dealt');

    const findable = [...chosen, ...branches];
    const lo = shape.findable - FINDABLE_TOLERANCE;
    const hi = shape.findable + FINDABLE_TOLERANCE;
    if (findable.length < lo || findable.length > hi) {
      return bail(`the hand came out at ${findable.length} clues`);
    }
    const noiseShare = branches.length / findable.length;
    if (noiseShare < ladder.noiseRatio[0] || noiseShare > ladder.noiseRatio[1]) {
      return bail(`the noise ratio came out at ${Math.round(noiseShare * 100)}%`);
    }
  } else {
    /* --- M7: the shaped hand --------------------------------------------- */
    const material = rng
      .shuffle(usable)
      .slice()
      .sort((a, b) => (b.leadIns.length > 0 ? 1 : 0) - (a.leadIns.length > 0 ? 1 : 0));
    const bodyOf = (m: SecretBranchMaterial): number =>
      m.leadIns.length + m.hints.length + m.traces.length;
    const proofIds = new Set(chosen.map((c) => c.id));
    const innocentIds = new Set(cast.innocents.map((p) => p.id));
    const looseSupply = rng.shuffle(
      pool.filter(
        (c) =>
          !proofIds.has(c.id) &&
          isLooseEnd(c, { murderTick: build.murderTick, innocentIds }, build.lies) &&
          partsCovered(reqs, c).length === 0,
      ),
    );
    // Variety first: one loose end per person and hour before a second.
    const seenKey = new Set<string>();
    const loosePool: Clue[] = [];
    const later: Clue[] = [];
    for (const c of looseSupply) {
      const f = c.establishes[0] as Fact;
      const key =
        f.kind === 'personAt' ? `${f.personId}@${f.tick}` : `${(f as { personId: Id }).personId}#motive`;
      if (seenKey.has(key)) later.push(c);
      else {
        seenKey.add(key);
        loosePool.push(c);
      }
    }
    loosePool.push(...later);

    const padRoom = universe.filter((c) => !proofIds.has(c.id)).length;
    const plan = planShaped(
      ladder,
      shape.findable,
      material.map(bodyOf),
      chosen.length,
      padRoom,
      loosePool.length,
      branchFloor,
    );
    if (!plan) return bail('no hand size puts the noise ratio in range');
    if (ladder.corroboration !== 'single') {
      padProof(rng, reqs, spine, corroboration, universe, plan.proof);
    }
    for (const c of corroboration) {
      c.role = 'corroboration';
      const parent = rng.pick(spine);
      if (!parent.leadsTo.includes(c.id)) parent.leadsTo.push(c.id);
    }
    chosen.splice(0, chosen.length, ...spine, ...corroboration);

    // The deepest secrets carry the branches, and the noise is poured into
    // them up to the ladder's depth; whatever will not fit is loose ends.
    const [minD, capD] = ladder.branchDepth;
    const dealt = material
      .map((m, i) => ({ m, i, cap: Math.min(capD, bodyOf(m)) + 1 }))
      .sort((a, b) => b.cap - a.cap || a.i - b.i)
      .slice(0, plan.branches)
      .sort((a, b) => a.i - b.i);
    const sizes = dealt.map(() => minD + 1);
    let pour = Math.min(
      plan.noise - plan.loose,
      dealt.reduce((n, d) => n + d.cap, 0),
    ) - sizes.reduce((a, b) => a + b, 0);
    while (pour > 0) {
      let moved = false;
      for (let k = 0; k < sizes.length && pour > 0; k++) {
        if ((sizes[k] as number) < (dealt[k] as { cap: number }).cap) {
          sizes[k] = (sizes[k] as number) + 1;
          pour--;
          moved = true;
        }
      }
      if (!moved) break;
    }
    const hangPoints = hangPointsFor(ladder.noisePlacement, spine, corroboration, startingIds);
    dealt.forEach((d, k) => dealBranch(d.m, sizes[k] as number, hangPoints));
    if (branchNo < branchFloor) return bail(`only ${branchNo} branches could be dealt`);

    // Loose ends make up the rest, and any branch that came out short.
    const wantLoose = plan.noise - branches.length;
    for (const c of loosePool.slice(0, Math.max(0, wantLoose))) {
      c.role = 'noise';
      const parent = rng.pick(hangPoints);
      if (!parent.leadsTo.includes(c.id)) parent.leadsTo.push(c.id);
      branches.push(c);
    }

    const findable = [...chosen, ...branches];
    const noiseShare = branches.length / findable.length;
    if (noiseShare < ladder.noiseRatio[0] - 1e-9 || noiseShare > ladder.noiseRatio[1] + 1e-9) {
      return bail(`the noise ratio came out at ${Math.round(noiseShare * 100)}%`);
    }
  }

  /* --- connectivity ------------------------------------------------------ */
  const findable = [...chosen, ...branches];
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
