/**
 * v2 — what the player can find, par, leads, lies and confrontations, with
 * the findable core from the puzzle stage (`puzzle.ts`) instead of M9's hand.
 *
 * Everything after the core is M9's machinery, reused: par is the cheapest
 * set that still solves the report's targets at the tier's rung, walked the
 * oracle's way; the innocents' secrets are dealt as dead ends as before;
 * leads come from content; every lie has its confrontation. What is gone is
 * the crime column (the report asks who, when, how, the way in and why, as the
 * tier asks) and every rejection test the puzzle stage replaces.
 */

import { TICKS, type Clue, type Derivation, type Fact, type Id, type LieBlock, type SolveSummary, type Tick } from '../types.js';
import { deductionOf } from '../shape.js';
import { TECH_COST, crimeTicks, culpritOf, placesAt, solve, whyNot, whyTick, type SolverState, type Why } from '../logic/solver.js';
import {
  confessionRule,
  confront,
  idsOf,
  problemOf,
  sourceKey,
  teachTheLie,
  walkPar,
  wireLeads,
  type LogicSelectInput,
  type LogicSelection,
  type ProblemFrame,
} from '../logic/select.js';
import { hm } from '../logic/lines.js';
import { describeAs } from '../logic/acquaint.js';
import { buildPuzzle, type Puzzle } from './puzzle.js';
import type { DeductionGraph } from './graph.js';

export interface V2Selection extends LogicSelection {
  graph: DeductionGraph;
  puzzle: Puzzle;
}

export function selectV2(input: LogicSelectInput): V2Selection | null {
  const { rng, cast, setting, build, pool, dials, act } = input;
  const ded = deductionOf(dials.shape);
  const fail = (reason: string): null => {
    input.reject?.(`v2: ${reason}`);
    return null;
  };
  const M = build.murderTick;
  const L = build.murderPlaceId;
  const killerId = cast.killer.id;
  const placeIds = setting.places.map((p) => p.id);
  const innocents = cast.innocents.map((p) => p.id);
  const frame: ProblemFrame = {
    suspects: cast.suspects.map((p) => p.id),
    places: placeIds,
    blocks: input.blocks,
    scene: L,
    victimId: cast.victim.id,
    murder: act.type === 'murder',
    givens: act.givens.facts,
  };
  const truthAt = (id: Id, t: Tick): Id | null => (build.truth[id] as (Id | null)[])[t] ?? null;
  const accountIdOf = new Map(pool.accounts.map((c) => [(c.source as { personId: Id }).personId, c.id]));
  frame.confessions = build.lieDrafts
    .filter((d) => d.personId !== killerId)
    .map((d) =>
      confessionRule(
        d.personId,
        d.claimed,
        d.ticks,
        d.ticks.map((t) => ({ kind: 'personAt' as const, personId: d.personId, place: truthAt(d.personId, t) as Id, tick: t })),
        accountIdOf.get(d.personId) as Id,
      ),
    );

  /* --- 1–4. the puzzle ----------------------------------------------------- */
  const puzzle = buildPuzzle(input, frame);
  if (typeof puzzle === 'string') return fail(puzzle);
  const cap = puzzle.cap;
  const probe = cap >= TECH_COST.T10;
  const solveAt = (clues: Clue[]): SolverState => solve({ ...problemOf(frame, clues, probe), techniques: true, maxCost: cap }).state;
  let findableCore = puzzle.core;
  const starting = pool.starting;
  const needTick = dials.shape.coronerWidth > 1;

  const goals = (st: SolverState): boolean => {
    if (st.contradiction) return false;
    const w = culpritOf(st);
    if (!w || w.id !== killerId) return false;
    const ticks = crimeTicks(st);
    if (!ticks.includes(M)) return false;
    if (needTick && ticks.length !== 1) return false;
    for (const s of frame.suspects) {
      for (let t = 0; t < TICKS; t++) {
        const tr = truthAt(s, t);
        if (tr && !placesAt(st, s, t).includes(tr)) return false;
      }
    }
    return true;
  };
  let full = solveAt(findableCore);

  /* --- 5. lie routes (for the confrontations) -------------------------------- */
  const byId = new Map(findableCore.map((c) => [c.id, c]));
  const routesFor = (personId: Id, ticks: Tick[], claimed: Id, clues: Clue[]): Id[][] => {
    const out: Id[][] = [];
    let current = clues;
    for (let k = 0; k < 3; k++) {
      const st = k === 0 && clues === findableCore ? full : solveAt(current);
      let found: Id[] | null = null;
      for (const t of ticks) {
        const w = whyNot(st, personId, t, claimed);
        if (w) {
          found = idsOf(st, w);
          break;
        }
      }
      if (!found || found.length === 0) break;
      out.push(found);
      const drop = new Set(found.map((id) => byId.get(id)).filter((c): c is Clue => !!c).map(sourceKey));
      current = current.filter((c) => c.kind === 'scene' || c.kind === 'morgue' || c.kind === 'client' || !drop.has(sourceKey(c)));
    }
    return out;
  };
  const lieRoutes = new Map<number, Id[][]>();
  for (const [i, d] of build.lieDrafts.entries()) lieRoutes.set(i, routesFor(d.personId, d.ticks, d.claimed, findableCore));

  /* --- 6. par: the cheapest set that still solves the report's targets ------- */
  const need = new Set<Id>();
  const add = (w: Why | null | undefined): void => {
    for (const id of idsOf(full, w)) {
      need.add(id);
      if (id.startsWith('confess:')) {
        const account = accountIdOf.get(id.split(':')[1] as Id);
        if (account) need.add(account);
      }
    }
  };
  const cul = culpritOf(full);
  if (!cul) return fail('no culprit');
  add(cul.why);
  add(whyTick(full));
  const legs: Clue[][] = [];
  const has = (pred: (f: Fact) => boolean) => findableCore.filter((c) => c.establishes.some(pred));
  const unknowns = act.unknowns;
  if (unknowns.includes('how')) legs.push(has((f) => f.kind === 'methodEvidence'));
  if (unknowns.includes('why')) legs.push(has((f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === cast.killerMotive.type));
  if (unknowns.includes('entry')) legs.push(has((f) => f.kind === 'hadAccess' && f.personId === killerId));
  if (input.signature.length > 0 && (unknowns.includes('where') || unknowns.includes('whereabouts') || unknowns.includes('goods'))) {
    legs.push(input.signature.filter((c) => findableCore.includes(c)));
  }
  for (const leg of legs) {
    if (leg.length === 0) continue;
    if (!leg.some((c) => need.has(c.id))) need.add(rng.pick(leg).id);
  }
  for (const c of starting) need.add(c.id);
  let parSet = findableCore.filter((c) => need.has(c.id));
  const parSolves = (set: Clue[]): boolean => goals(solveAt(set));
  if (!parSolves(parSet)) parSet = findableCore.slice();
  const startIds = new Set(starting.map((c) => c.id));
  const keepsLeg = (set: Clue[]): boolean => legs.every((l) => l.length === 0 || l.some((x) => set.includes(x)));
  const prune = (run: Clue[]): void => {
    if (run.length === 0) return;
    const drop = new Set(run.map((c) => c.id));
    const without = parSet.filter((x) => !drop.has(x.id));
    if (keepsLeg(without) && parSolves(without)) {
      parSet = without;
      return;
    }
    if (run.length === 1) return;
    const half = Math.ceil(run.length / 2);
    prune(run.slice(0, half));
    prune(run.slice(half));
  };
  prune(rng.shuffle(parSet.filter((c) => !startIds.has(c.id))));
  if (!parSolves(parSet)) return fail('the par set does not solve it');

  // Confessions the par route leans on need two independent ways of breaking the lie.
  const parSolved = solveAt(parSet);
  const usedRules = new Set<Id>();
  const collect = (w: Why | null | undefined): void => {
    if (w) for (const r of w.rules) usedRules.add(parSolved.problem.rules[r]?.id as Id);
  };
  collect(culpritOf(parSolved)?.why);
  collect(whyTick(parSolved));
  const confessed = build.lieDrafts.filter((d) => d.personId !== killerId && usedRules.has(`confess:${d.personId}:${d.ticks[0]}`));
  for (const d of confessed) {
    if (routesFor(d.personId, d.ticks, d.claimed, parSet).length >= 2) continue;
    for (const route of lieRoutes.get(build.lieDrafts.indexOf(d)) ?? []) {
      for (const id of route) {
        const c = byId.get(id);
        if (c && !parSet.includes(c)) parSet.push(c);
      }
      if (routesFor(d.personId, d.ticks, d.claimed, parSet).length >= 2) break;
    }
  }
  if (!parSolves(parSet)) return fail('the par set with its confessions does not solve it');

  // Raw and Coddled: the lie heard and caught is the lesson (M10), where the case allows it.
  const open: Id[] = [];
  if (ded.catchTheLie) {
    const legIds = new Set(legs.flatMap((l) => l.map((c) => c.id)));
    const taught = teachTheLie(input, parSet, findableCore, frame, probe, legIds);
    if (typeof taught !== 'string' && parSolves(taught.parSet)) {
      parSet = taught.parSet;
      open.push(taught.catchId);
    }
  }
  const pseudoFor = (times: number[]): Clue[] =>
    confessed.flatMap((d) => {
      const at = cast.people.find((p) => p.id === d.personId)?.foundAt ?? L;
      return times.map((k) => ({
        id: `confront${k}:${d.personId}:${d.ticks[0]}`,
        kind: 'account' as const,
        source: { type: 'person' as const, personId: d.personId, topic: k === 1 ? 'put it to them' : 'put it to them again' },
        establishes: [],
        text: '',
        place: at,
        leadsTo: [],
        role: 'spine' as const,
      }));
    });
  const confrontPseudo = pseudoFor([1]);
  const confrontPseudoM9 = pseudoFor([1, 2]);

  /* --- 7. dead ends: the innocents' secrets, as M7 deals them ----------------- */
  const noise: Clue[] = [];
  const [minD, capD] = dials.ladder.branchDepth;
  const mid = (dials.ladder.noiseRatio[0] + dials.ladder.noiseRatio[1]) / 2;
  // The designer's second kind of extra, kept roughly flat across tiers (docs/34 §5).
  const wantNoise = Math.max(3, Math.round(mid * 8));
  let branchNo = 0;
  for (const m of rng.shuffle(pool.material)) {
    if (noise.length >= wantNoise) break;
    const body = rng.shuffle([...m.hints, ...m.traces]);
    const depth = Math.min(body.length, rng.range(minD, capD));
    if (depth < 1 && m.disqualifiers.length === 0) continue;
    branchNo++;
    const branchId = `b${branchNo}`;
    for (const c of body.slice(0, depth)) {
      c.role = 'noise';
      c.branchId = branchId;
      noise.push(c);
    }
    const disq = m.disqualifiers[0];
    if (disq) {
      disq.role = 'disqualifier';
      disq.branchId = branchId;
      noise.push(disq);
    }
  }

  /* --- 8. roles and leads ------------------------------------------------------- */
  const parIds = new Set(parSet.map((c) => c.id));
  const near = (c: Clue): boolean =>
    c.establishes.some((f) => 'tick' in f && Math.abs((f as { tick: Tick }).tick - M) <= 2) ||
    c.establishes.some((f) => 'ticks' in f && (f as { ticks: Tick[] }).ticks.some((t) => Math.abs(t - M) <= 2));
  for (const c of findableCore) {
    c.leadsTo = [];
    if (parIds.has(c.id)) c.role = 'spine';
    else if (c.kind === 'testimony' || c.kind === 'account') c.role = 'testimony';
    else c.role = near(c) ? 'corroboration' : 'noise';
  }
  for (const c of noise) c.leadsTo = [];
  const findable = [...findableCore, ...noise];
  const unmarked = new Set(open);
  wireLeads(input, findable, parSet.filter((c) => !unmarked.has(c.id)), starting);

  const inHand = new Set(starting.map((c) => c.id));
  const ride = new Map<Id, Id>(
    pool.accounts.filter((c) => c.source.type === 'person' && findable.includes(c)).map((c) => [(c.source as { personId: Id }).personId, c.id]),
  );
  const par = walkPar(
    [...parSet, ...confrontPseudo],
    [...findable, ...confrontPseudo],
    inHand,
    placeIds,
    input.startId,
    new Set([...confrontPseudo.map((c) => c.id), ...open]),
    ride,
  );
  if (!Number.isFinite(par)) return fail('the par route cannot be walked');
  const walk = walkPar(
    [...parSet, ...confrontPseudoM9],
    [...findable, ...confrontPseudoM9],
    inHand,
    placeIds,
    input.startId,
    new Set([...confrontPseudoM9.map((c) => c.id), ...open]),
  );

  /* --- 9. the summary --------------------------------------------------------- */
  full = solveAt(findableCore);
  const parState = solveAt(parSet);
  const derive = (what: string, w: Why | null): Derivation => ({
    what,
    rules: idsOf(parState, w),
    depth: w?.depth ?? 0,
    hypothesis: w?.hyp ?? false,
  });
  const whoName = (id: Id): string => cast.people.find((p) => p.id === id)?.surname ?? id;
  const parCul = culpritOf(parState);
  const cleared: Record<Id, Derivation> = {};
  for (const id of innocents) cleared[id] = derive(`${whoName(id)} was not at the scene at ${hm(M)}`, whyNot(parState, id, M, L));
  const clearedByOne: Id[] = [];
  for (const id of innocents) {
    const w = whyNot(full, id, M, L);
    if (w && w.depth <= 1) clearedByOne.push(id);
  }
  let depth = 0;
  for (const w of parState.why) if (w && w.depth > depth) depth = w.depth;
  const accountSpans = parSet
    .filter((c) => c.kind === 'account')
    .flatMap((c) => c.establishes.filter((f): f is Extract<Fact, { kind: 'claims' }> => f.kind === 'claims'));
  const falseSpans = accountSpans.filter((f) => f.ticks.some((t) => truthAt(f.personId, t) !== f.place)).length;
  const summary: SolveSummary = {
    parRules: parSet.map((c) => c.id),
    culprit: derive(`${whoName(killerId)} was at the scene at ${hm(M)}`, parCul?.why ?? null),
    cleared,
    crimeTick: derive(`It happened at ${hm(M)}`, whyTick(parState)),
    depth: Math.max(depth, parCul?.why.depth ?? 0),
    hypothesis: parState.usedProbe,
    clearedByOne,
    accountSpans: accountSpans.length,
    falseSpans,
    rounds: full.rounds,
    probes: full.probes,
    confessions: confessed.map((d) => d.personId),
    walk: Number.isFinite(walk) ? walk : par,
  };

  /* --- 10. the lies, and their confrontations ---------------------------------- */
  const lies: LieBlock[] = build.lieDrafts.map((d) => ({
    personId: d.personId,
    ticks: d.ticks.slice(),
    claimed: d.claimed,
    ...(d.with ? { with: d.with } : {}),
    truth: d.ticks.map((t) => truthAt(d.personId, t) as Id),
    cover: d.cover,
    accountId: accountIdOf.get(d.personId) as Id,
  }));
  const confrontations = lies.map((lie, i) => confront(input, lie, lieRoutes.get(i) ?? [], full, findableCore));

  /* --- the world, as dug: who no longer knows whom ------------------------------ */
  for (const e of puzzle.dugEdges) {
    const key = `${e.from}>${e.to}`;
    const old = build.acq.edges.get(key);
    const to = cast.people.find((p) => p.id === e.to);
    if (!old || !to) continue;
    const d = describeAs(to, cast.suspects, 'age');
    build.acq.edges.set(
      key,
      e.strength === 'name'
        ? { ...old, strength: 'name', basis: 'place', ref: to.name }
        : { ...old, strength: e.strength, basis: 'none', ref: e.strength === 'sight' ? `${d.text} I know by sight` : d.text },
    );
  }
  for (const list of Object.values(build.acq.regulars)) {
    for (const e of puzzle.dugEdges) {
      const i = list.indexOf(e.to);
      if (i >= 0 && cast.watcherOf[Object.keys(build.acq.regulars).find((k) => build.acq.regulars[k] === list) ?? ''] === e.from) list.splice(i, 1);
    }
  }

  return {
    findable,
    starting: starting.map((c) => c.id),
    par,
    summary,
    lies,
    confrontations,
    open,
    graph: puzzle.graph,
    puzzle,
  };
}
