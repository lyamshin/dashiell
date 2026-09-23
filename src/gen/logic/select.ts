/**
 * M9 — what the player can find, what par is, and what happens when a liar
 * is caught.
 *
 * Testimony and accounts are always findable: anybody can be asked anything.
 * The board's other rules — descriptions, a watcher's door, anchors, the
 * conditional, the weapon, the motives — are filtered and dealt around them,
 * and the innocents' secrets are dealt as noise as in M7.
 *
 * A case is accepted only when the solver, over everything findable:
 *
 * - names the culprit, pins the crime's half hour, and (from Medium up) fills
 *   the crime column, all of it true;
 * - needed no hypothesis test where the tier forbids one, and needed one at
 *   Hard-boiled;
 * - reached the culprit no shallower than the tier's depth;
 * - found every innocent's lie contradicted two independent ways.
 *
 * And no single findable rule clears an innocent the tier did not allow, or
 * breaks the culprit's lie where the tier wants chains.
 *
 * Par is the cheapest rule set the solver still solves the case with, walked
 * the way the oracle walks it. Leads come from content: a clue opens the
 * person it names, the watcher of the room it names, the companion somebody
 * claimed.
 */

import { TICKS, type Act, type Clue, type Confrontation, type ConfrontResponse, type Fact, type Id, type LieBlock, type Person, type SolveSummary, type Tick, type Derivation } from '../types.js';
import type { Rng } from '../rng.js';
import type { Cast } from '../cast.js';
import type { Setting } from '../setting.js';
import type { Dials } from '../shape.js';
import { deductionOf } from '../shape.js';
import type { Pool } from './rules.js';
import type { Schedule9Build } from './schedule.js';
import { culpritOf, crimeTicks, placesAt, solve, whyNot, whyPlaced, whyTick, type SolverProblem, type SolverRule, type SolverState, type Why } from './solver.js';
import { hm, span } from './lines.js';

export interface LogicSelectInput {
  rng: Rng;
  cast: Cast;
  setting: Setting;
  build: Schedule9Build;
  pool: Pool;
  signature: Clue[];
  dials: Dials;
  act: Act;
  /** Where the night's first room is: the scene, or where the body was found. */
  startId: Id;
  blocks: Record<Id, 0 | 1 | 2>;
  reject?: (reason: string) => void;
}

export interface LogicSelection {
  findable: Clue[];
  starting: Id[];
  par: number;
  summary: SolveSummary;
  lies: LieBlock[];
  confrontations: Confrontation[];
}

/** For tuning: called with the solver's state when a case is turned down. */
export const debug: {
  hook: ((info: { reason: string; input: LogicSelectInput; state: SolverState; findable: Clue[] }) => void) | null;
  /** Milliseconds spent per phase, when set to an object. */
  timings: Record<string, number> | null;
} = { hook: null, timings: null };

let phaseAt = 0;
function phase(name: string): void {
  if (!debug.timings) return;
  const now = performance.now();
  if (phaseAt > 0) debug.timings[name] = (debug.timings[name] ?? 0) + (now - phaseAt);
  phaseAt = now;
}

/* ----------------------------------------------------------------- helpers */

export interface ProblemFrame {
  suspects: Id[];
  places: Id[];
  blocks: Record<Id, number>;
  scene: Id;
  victimId: Id;
  murder: boolean;
  givens: Fact[];
  /** What an innocent admits once their lie is shown false. Ids start `confess:`. */
  confessions?: SolverRule[];
}

export function problemOf(frame: ProblemFrame, clues: Clue[], probe: boolean, bare = false): SolverProblem {
  return {
    suspects: frame.suspects,
    places: frame.places,
    blocks: frame.blocks,
    scene: frame.scene,
    victimId: frame.victimId,
    murder: frame.murder,
    rules: [
      { id: 'given', facts: frame.givens },
      ...clues.map((c) => ({ id: c.id, facts: c.establishes })),
      ...(bare ? [] : (frame.confessions ?? [])),
    ],
    exactlyOne: true,
    probe,
  };
}

/** The confession an innocent's lie comes to on the second confrontation. */
export function confessionRule(personId: Id, claimed: Id, ticks: Tick[], facts: Fact[], accountId: Id): SolverRule {
  return {
    id: `confess:${personId}:${ticks[0]}`,
    facts,
    when: { personId, place: claimed, ticks: ticks.slice(), requires: accountId },
  };
}

function idsOf(st: SolverState, w: Why | null | undefined): Id[] {
  if (!w) return [];
  return w.rules.map((r) => st.problem.rules[r]?.id as Id).filter((id) => id !== 'given' && id !== undefined);
}

function sourceKey(c: Clue): string {
  return c.source.type === 'person' ? `p:${c.source.personId}` : `l:${c.source.placeId}`;
}

/** Everybody a clue names: its source, its subjects, and surnames in its text. */
export function peopleIn(c: Clue, people: Person[], victimId: Id): Set<Id> {
  const out = new Set<Id>();
  if (c.source.type === 'person') out.add(c.source.personId);
  for (const f of c.establishes) {
    if ('personId' in f) out.add(f.personId);
    if ('personIds' in f) for (const id of f.personIds) out.add(id);
    if (f.kind === 'claims' && f.with) out.add(f.with);
    if (f.kind === 'absentFrom') for (const id of f.except) out.add(id);
  }
  const text = (c.textRecord ?? c.text).toLowerCase();
  for (const p of people) if (text.includes(p.surname.toLowerCase())) out.add(p.id);
  out.delete(victimId);
  return out;
}

function placesIn(c: Clue, places: { id: Id; shortName: string }[]): Set<Id> {
  const out = new Set<Id>();
  if (c.source.type === 'place') out.add(c.source.placeId);
  for (const f of c.establishes) {
    if ('place' in f) out.add(f.place);
    if (f.kind === 'objectMissing') out.add(f.fromPlace);
  }
  const text = (c.textRecord ?? c.text).toLowerCase();
  for (const p of places) if (text.includes(p.shortName.toLowerCase())) out.add(p.id);
  return out;
}

/* --------------------------------------------------------------- par walk */

interface Group {
  key: string;
  placeId: Id;
  isAsk: boolean;
  fetches: Set<Id>;
  gains: Set<Id>;
}

function groupKey(c: Clue): string {
  return c.source.type === 'place' ? `examine:${c.place}` : `ask:${c.source.personId}|${c.source.topic}`;
}

/**
 * The oracle's walk, in the generator: one action per question or search,
 * one per move, a question only once something in hand leads to it. Exact
 * breadth-first search, as `src/game/oracle.ts` plans it.
 */
export function walkPar(
  wanted: Clue[],
  findable: Clue[],
  inHand: Set<Id>,
  places: Id[],
  from: Id,
  /** Always on the page, lead or no lead: the confrontations. */
  open: Set<Id> = new Set(),
): number {
  const groups = new Map<string, Group>();
  const want = new Set(wanted.map((c) => c.id));
  for (const c of findable) {
    const k = groupKey(c);
    let g = groups.get(k);
    if (!g) {
      g = { key: k, placeId: c.place, isAsk: c.source.type === 'person', fetches: new Set(), gains: new Set() };
      groups.set(k, g);
    }
    g.fetches.add(c.id);
    if (want.has(c.id) && !inHand.has(c.id)) g.gains.add(c.id);
  }
  const list = [...groups.values()].filter((g) => g.gains.size > 0);
  const n = list.length;
  if (n === 0) return 0;
  if (n > 20) return Infinity;
  const openers = list.map((g) => {
    const out = new Set<Id>();
    for (const c of findable) if (c.leadsTo.some((t) => g.fetches.has(t))) out.add(c.id);
    return out;
  });
  const alwaysOpen = list.map(
    (g, i) => !g.isAsk || [...g.fetches].some((id) => open.has(id)) || [...(openers[i] as Set<Id>)].some((id) => inHand.has(id)),
  );
  const openedBy = list.map((_, i) => {
    let m = 0;
    list.forEach((other, j) => {
      if ([...other.fetches].some((id) => (openers[i] as Set<Id>).has(id))) m |= 1 << j;
    });
    return m;
  });
  const start = Math.max(0, places.indexOf(from));
  const span_ = 1 << n;
  const goal = span_ - 1;
  const seen = new Uint8Array(places.length * span_);
  let frontier = [start * span_];
  seen[start * span_] = 1;
  let cost = 0;
  while (frontier.length > 0 && cost <= 80) {
    const next: number[] = [];
    for (const state of frontier) {
      const m = state % span_;
      const p = (state - m) / span_;
      if (m === goal) return cost;
      for (let i = 0; i < n; i++) {
        if (m & (1 << i)) continue;
        const g = list[i] as Group;
        if (g.placeId !== places[p]) continue;
        if (g.isAsk && !alwaysOpen[i] && (m & (openedBy[i] as number)) === 0) continue;
        const k = p * span_ + (m | (1 << i));
        if (seen[k]) continue;
        seen[k] = 1;
        next.push(k);
      }
      for (let q = 0; q < places.length; q++) {
        if (q === p) continue;
        const k = q * span_ + m;
        if (seen[k]) continue;
        seen[k] = 1;
        next.push(k);
      }
    }
    frontier = next;
    cost++;
  }
  return Infinity;
}

/* ------------------------------------------------------------- the choice */

export function selectLogic(input: LogicSelectInput): LogicSelection | null {
  const { rng, cast, setting, build, pool, dials, act } = input;
  if (debug.timings) phaseAt = performance.now();
  const ded = deductionOf(dials.shape);
  const fail = (reason: string): null => {
    input.reject?.(`m9 select: ${reason}`);
    return null;
  };
  const M = build.murderTick;
  const L = build.murderPlaceId;
  const killerId = cast.killer.id;
  const placeIds = setting.places.map((p) => p.id);
  const innocents = cast.innocents.map((p) => p.id);
  const plainTier = ded.directClears >= innocents.length;
  const frame: ProblemFrame = {
    suspects: cast.suspects.map((p) => p.id),
    places: placeIds,
    blocks: input.blocks,
    scene: L,
    victimId: cast.victim.id,
    murder: act.type === 'murder',
    givens: act.givens.facts,
  };
  const needTick = dials.shape.coronerWidth > 1;
  const needColumn = typeof dials.shape.tier === 'number' ? dials.shape.tier >= 4 : true;
  const allowed = new Set<Id>(plainTier ? innocents : build.directId ? [build.directId] : []);

  const truthAt = (id: Id, t: Tick): Id | null => (build.truth[id] as (Id | null)[])[t] ?? null;
  const cultLies = build.lieDrafts.filter((d) => d.personId === killerId);
  // An innocent caught twice tells the truth about the span; the culprit never.
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

  phase('setup');
  /* --- 1. single rules that say too much ---------------------------------- */
  const starting = pool.starting;
  // One rule reaches no further than the half hours it names and, by travel,
  // the ones either side; nothing else can be settled by it alone.
  const watchTicks = new Set<number>();
  for (const t of [M - 1, M, M + 1]) watchTicks.add(t);
  if (ded.culpritChains) for (const d of cultLies) for (const t of d.ticks) for (const u of [t - 1, t, t + 1]) watchTicks.add(u);
  const reaches = (c: Clue): boolean =>
    c.establishes.some((f) => {
      // An anchored sighting with no time of its own, and the like: solve it.
      if (f.kind === 'personAtAnchor' || f.kind === 'knows') return true;
      if ('tick' in f) return watchTicks.has((f as { tick: Tick }).tick);
      if ('ticks' in f) return (f as { ticks: Tick[] }).ticks.some((t) => watchTicks.has(t));
      return false;
    });
  const tooMuch = (c: Clue): string | null => {
    if (!reaches(c)) return null;
    const st = solve(problemOf(frame, [...starting, c], false, true)).state;
    if (st.contradiction) return 'contradiction';
    for (const id of innocents) {
      if (allowed.has(id)) continue;
      if (!placesAt(st, id, M).includes(L)) return `clears ${id}`;
    }
    if (ded.culpritChains) {
      for (const d of cultLies) {
        for (const t of d.ticks) if (!placesAt(st, killerId, t).includes(d.claimed)) return 'breaks the culprit';
      }
    }
    return null;
  };
  for (const c of [...pool.testimony, ...pool.accounts]) {
    const why = tooMuch(c);
    if (why) return fail(`testimony ${c.id} ${why}`);
  }
  const board = [
    ...pool.timing,
    ...pool.knowledge,
    ...pool.kept,
    ...pool.watch,
    ...pool.descriptions,
    ...input.signature,
  ].filter((c) => tooMuch(c) === null);

  phase('single rules');
  /* --- 2. the hand ---------------------------------------------------------- */
  const pieces = Math.max(0, Math.min(1, ded.pieces + dials.ladder.pieces));
  const near = (c: Clue): boolean =>
    c.establishes.some((f) => 'tick' in f && Math.abs((f as { tick: Tick }).tick - M) <= 2) ||
    c.establishes.some((f) => 'ticks' in f && (f as { ticks: Tick[] }).ticks.some((t) => Math.abs(t - M) <= 2));
  const hand: Clue[] = [];
  for (const c of board) {
    if (c.kind === 'observation' || c.kind === 'watch') {
      // Pieces near the crime always; the rest of the evening by the dial.
      if (!near(c) && !rng.chance(pieces)) continue;
    }
    hand.push(c);
  }
  const base = [...starting, ...pool.testimony, ...pool.accounts];
  const findableCore = [...base, ...hand];

  /* --- 3. solve it ---------------------------------------------------------- */
  const goals = (st: SolverState): { ok: boolean; why: string } => {
    if (st.contradiction) return { ok: false, why: st.contradiction };
    const who = culpritOf(st);
    if (!who || who.id !== killerId) return { ok: false, why: 'no culprit' };
    const ticks = crimeTicks(st);
    if (!ticks.includes(M)) return { ok: false, why: 'lost the crime tick' };
    if (needTick && ticks.length !== 1) return { ok: false, why: 'the half hour is open' };
    if (needColumn) {
      for (const s of frame.suspects) if (placesAt(st, s, M).length !== 1) return { ok: false, why: `column open at ${s}` };
    }
    return { ok: true, why: '' };
  };
  const truthful = (st: SolverState): boolean => {
    for (const s of frame.suspects) {
      for (let t = 0; t < TICKS; t++) {
        const tr = truthAt(s, t);
        if (tr && !placesAt(st, s, t).includes(tr)) return false;
      }
    }
    return crimeTicks(st).includes(M);
  };
  const full = solve(problemOf(frame, findableCore, ded.hypothesis)).state;
  if (!truthful(full)) {
    debug.hook?.({ reason: 'false', input, state: full, findable: findableCore });
    return fail('the findable rules say something false');
  }
  const g = goals(full);
  if (!g.ok) {
    const open = innocents
      .filter((id) => placesAt(full, id, M).includes(L))
      .map((id) => (build.mLiars.includes(id) ? 'liar' : build.pair?.includes(id) ? 'pair' : 'free'));
    debug.hook?.({ reason: g.why, input, state: full, findable: findableCore });
    return fail(`the findable rules do not solve it: ${g.why} [open: ${open.join(',')}]`);
  }
  if (ded.hypothesis) {
    const flat = solve(problemOf(frame, findableCore, false)).state;
    if (goals(flat).ok) return fail('solved without a hypothesis test');
  } else if (full.usedProbe) {
    return fail('needed a hypothesis where the tier allows none');
  }
  const cul = culpritOf(full);
  if (!cul) return fail('no culprit');
  if (cul.why.depth < ded.culpritDepth) return fail(`the culprit is reached at depth ${cul.why.depth}`);

  phase('full solve');
  /* --- 4. every innocent's lie, two ways ------------------------------------- */
  const byId = new Map(findableCore.map((c) => [c.id, c]));
  const routesFor = (personId: Id, ticks: Tick[], claimed: Id, clues: Clue[]): Id[][] => {
    const out: Id[][] = [];
    let current = clues;
    for (let k = 0; k < 3; k++) {
      const st = k === 0 ? full : solve(problemOf(frame, current, ded.hypothesis)).state;
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
  for (const [i, d] of build.lieDrafts.entries()) {
    const routes = routesFor(d.personId, d.ticks, d.claimed, findableCore);
    lieRoutes.set(i, routes);
    if (d.personId !== killerId && !plainTier && routes.length < 2) {
      return fail(
        `a ${d.cover} lie${d.ticks.includes(M) ? ' at the crime' : ''} (${d.ticks.length} long) has ${routes.length} way(s) to break it`,
      );
    }
    // Every lie that matters is broken by something findable (spec §1): the
    // culprit's about the crime and about the means, by a chain.
    if (d.personId === killerId && (d.cover === 'crime' || d.cover === 'means') && routes.length < 1) {
      return fail(`the culprit's ${d.cover} lie stands`);
    }
  }

  phase('lie routes');
  /* --- 5. par: the cheapest set that still solves it -------------------------- */
  const need = new Set<Id>();
  const add = (w: Why | null | undefined): void => {
    for (const id of idsOf(full, w)) {
      need.add(id);
      // A confession needs the account it breaks, which is no premise of it.
      if (id.startsWith('confess:')) {
        const person = id.split(':')[1] as Id;
        const account = accountIdOf.get(person);
        if (account) need.add(account);
      }
    }
  };
  add(cul.why);
  add(whyTick(full));
  if (needColumn) for (const s of frame.suspects) add(whyPlaced(full, s, M));
  // The legs the tier asks for: one clue each, the cheapest there is.
  const legs: Clue[][] = [];
  const has = (pred: (f: Fact) => boolean) => findableCore.filter((c) => c.establishes.some(pred));
  if (dials.shape.proof.includes('method')) legs.push(has((f) => f.kind === 'methodEvidence'));
  if (dials.shape.proof.includes('motive')) {
    legs.push(has((f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === cast.killerMotive.type));
  }
  if (dials.shape.proof.includes('access')) {
    legs.push(has((f) => f.kind === 'hadAccess' && f.personId === killerId));
  }
  if (dials.shape.proof.includes('signature') && input.signature.length > 0) {
    legs.push(input.signature.filter((c) => findableCore.includes(c)));
  }
  for (const leg of legs) {
    if (leg.length === 0) {
      // Access can also be shown on the grid: the culprit at the means' room before the crime.
      continue;
    }
    if (!leg.some((c) => need.has(c.id))) need.add(rng.pick(leg).id);
  }
  for (const c of starting) need.add(c.id);
  let parSet = findableCore.filter((c) => need.has(c.id));
  const parSolves = (set: Clue[]): boolean => {
    const st = solve(problemOf(frame, set, ded.hypothesis)).state;
    if (!truthful(st) || !goals(st).ok) return false;
    const w = culpritOf(st);
    return !!w && w.why.depth >= ded.culpritDepth;
  };
  if (!parSolves(parSet)) {
    // The union of the shallowest routes can miss a premise that a deeper
    // route needs; fall back to everything and prune.
    if (debug.timings) debug.timings['(par fallbacks)'] = (debug.timings['(par fallbacks)'] ?? 0) + 1;
    parSet = findableCore.slice();
  }
  const legIds = new Set(legs.flatMap((l) => l.map((c) => c.id)));
  const startIds = new Set(starting.map((c) => c.id));
  // Prune in halves: try dropping a whole run of clues, and split it only
  // when the case stops solving without it. Most of the hand goes in a few
  // solves; the rest one at a time.
  const keepsLeg = (set: Clue[]): boolean =>
    legs.every((l) => l.length === 0 || l.some((x) => set.includes(x)));
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
  void legIds;
  if (!parSolves(parSet)) return fail('the par set does not solve it');

  // Confessions the par route leans on: each is two confrontations, and the
  // two need two independent ways of breaking the lie in hand.
  const parSolved = solve(problemOf(frame, parSet, ded.hypothesis)).state;
  const usedRules = new Set<Id>();
  const collect = (w: Why | null | undefined): void => {
    if (w) for (const r of w.rules) usedRules.add(parSolved.problem.rules[r]?.id as Id);
  };
  collect(culpritOf(parSolved)?.why);
  collect(whyTick(parSolved));
  if (needColumn) for (const s of frame.suspects) collect(whyPlaced(parSolved, s, M));
  const confessed = build.lieDrafts.filter(
    (d) => d.personId !== killerId && usedRules.has(`confess:${d.personId}:${d.ticks[0]}`),
  );
  for (const d of confessed) {
    const inPar = routesFor(d.personId, d.ticks, d.claimed, parSet);
    if (inPar.length >= 2) continue;
    const all = lieRoutes.get(build.lieDrafts.indexOf(d)) ?? [];
    for (const route of all) {
      for (const id of route) {
        const c = byId.get(id);
        if (c && !parSet.includes(c)) parSet.push(c);
      }
      if (routesFor(d.personId, d.ticks, d.claimed, parSet).length >= 2) break;
    }
  }
  // What was added for the confessions can settle something earlier and in
  // another order; the set has to still solve the case, and truly.
  if (!parSolves(parSet)) return fail('the par set with its confessions does not solve it');
  const confrontPseudo: Clue[] = confessed.flatMap((d) => {
    const at = cast.people.find((p) => p.id === d.personId)?.foundAt ?? L;
    return [1, 2].map((k) => ({
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

  phase('par set');
  /* --- 6. noise: the innocents' secrets, as M7 deals them --------------------- */
  const noise: Clue[] = [];
  const [minD, capD] = dials.ladder.branchDepth;
  const handSize = hand.length;
  const mid = (dials.ladder.noiseRatio[0] + dials.ladder.noiseRatio[1]) / 2;
  const wantNoise = Math.round((mid * handSize) / (1 - mid));
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

  /* --- 7. roles ---------------------------------------------------------------- */
  const parIds = new Set(parSet.map((c) => c.id));
  for (const c of findableCore) {
    c.leadsTo = [];
    if (parIds.has(c.id)) c.role = 'spine';
    else if (c.kind === 'testimony' || c.kind === 'account') c.role = 'testimony';
    else c.role = near(c) ? 'corroboration' : 'noise';
  }
  for (const c of noise) c.leadsTo = [];
  const findable = [...findableCore, ...noise];

  /* --- 8. leads from content --------------------------------------------------- */
  wireLeads(input, findable, parSet, starting);

  const parPlaces = placeIds;
  const inHand = new Set(starting.map((c) => c.id));
  const par = walkPar(
    [...parSet, ...confrontPseudo],
    [...findable, ...confrontPseudo],
    inHand,
    parPlaces,
    input.startId,
    new Set(confrontPseudo.map((c) => c.id)),
  );
  if (!Number.isFinite(par)) return fail('the par route cannot be walked');

  phase('leads and walk');
  /* --- 9. the summary ---------------------------------------------------------- */
  const parState = solve(problemOf(frame, parSet, ded.hypothesis)).state;
  const derive = (what: string, w: Why | null): Derivation => ({
    what,
    rules: idsOf(parState, w),
    depth: w?.depth ?? 0,
    hypothesis: w?.hyp ?? false,
  });
  const parCul = culpritOf(parState);
  const cleared: Record<Id, Derivation> = {};
  for (const id of innocents) {
    cleared[id] = derive(`${who(cast, id)} was not at the scene at ${hm(M)}`, whyNot(parState, id, M, L));
  }
  const clearedByOne: Id[] = [];
  for (const id of innocents) {
    const st = full;
    const w = whyNot(st, id, M, L);
    if (w && w.depth <= 1) clearedByOne.push(id);
  }
  let depth = 0;
  for (let k = 0; k < parState.why.length; k++) {
    const w = parState.why[k];
    if (w && w.depth > depth) depth = w.depth;
  }
  const accountSpans = parSet
    .filter((c) => c.kind === 'account')
    .flatMap((c) => c.establishes.filter((f): f is Extract<Fact, { kind: 'claims' }> => f.kind === 'claims'));
  const falseSpans = accountSpans.filter((f) => f.ticks.some((t) => truthAt(f.personId, t) !== f.place)).length;
  const summary: SolveSummary = {
    parRules: parSet.map((c) => c.id),
    culprit: derive(`${who(cast, killerId)} was at the scene at ${hm(M)}`, parCul?.why ?? null),
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
  };

  phase('summary');
  /* --- 10. the lies, and what happens when they are put to the liar ------------ */
  const accountOf = new Map(pool.accounts.map((c) => [(c.source as { personId: Id }).personId, c.id]));
  const lies: LieBlock[] = build.lieDrafts.map((d) => ({
    personId: d.personId,
    ticks: d.ticks.slice(),
    claimed: d.claimed,
    ...(d.with ? { with: d.with } : {}),
    truth: d.ticks.map((t) => truthAt(d.personId, t) as Id),
    cover: d.cover,
    accountId: accountOf.get(d.personId) as Id,
  }));
  const confrontations = lies.map((lie, i) =>
    confront(input, lie, lieRoutes.get(i) ?? [], full, findableCore),
  );

  return {
    findable,
    starting: starting.map((c) => c.id),
    par,
    summary,
    lies,
    confrontations,
  };
}

function who(cast: Cast, id: Id): string {
  return cast.people.find((p) => p.id === id)?.surname ?? id;
}

/* ------------------------------------------------------------------ leads */

function wireLeads(input: LogicSelectInput, findable: Clue[], parSet: Clue[], starting: Clue[]): void {
  const { cast, setting } = input;
  const victimId = cast.victim.id;
  const people = cast.people;
  const named = new Map(findable.map((c) => [c.id, peopleIn(c, people, victimId)]));
  const rooms = new Map(findable.map((c) => [c.id, placesIn(c, setting.places)]));
  const targetPeople = (c: Clue): Set<Id> => {
    const out = new Set<Id>();
    if (c.source.type === 'person') out.add(c.source.personId);
    if (c.about) out.add(c.about);
    for (const f of c.establishes) if ('personId' in f) out.add(f.personId);
    out.delete(victimId);
    return out;
  };
  const score = (from: Clue, to: Clue): number => {
    const mentioned = named.get(from.id) as Set<Id>;
    let s = 0;
    for (const p of targetPeople(to)) if (mentioned.has(p)) s = Math.max(s, 3);
    const toPlace = to.source.type === 'place' ? to.source.placeId : cast.watcherOf[to.place] === (to.source as { personId?: Id }).personId ? to.place : null;
    if (toPlace && (rooms.get(from.id) as Set<Id>).has(toPlace)) s = Math.max(s, 2);
    if (to.anchorId && from.anchorId === to.anchorId) s = Math.max(s, 2);
    if (from.establishes.some((f) => f.kind === 'personAtAnchor' && f.anchorId === to.anchorId)) s = Math.max(s, 2);
    if (s === 0 && from.place === to.place) s = 1;
    return s;
  };

  const link = (from: Clue, to: Clue): void => {
    if (from.id === to.id || from.leadsTo.includes(to.id)) return;
    from.leadsTo.push(to.id);
  };

  // The scene is the first lead: marked from page one.
  const client = starting.find((c) => c.kind === 'client');
  const scene = starting.find((c) => c.kind === 'scene');
  if (client && scene) link(client, scene);

  // The par route, in the order content lets it open.
  const reached: Clue[] = starting.slice();
  // Only questions need a lead: a search is always on the page, and a lead
  // into a room's clue from somewhere that names nobody in it is a lead the
  // player cannot read a reason into.
  const left = parSet.filter((c) => !starting.includes(c) && c.source.type === 'person');
  for (const c of parSet) if (c.source.type === 'place' && !reached.includes(c)) reached.push(c);
  const outDegree = new Map<Id, number>();
  let guard = 0;
  while (left.length > 0 && guard++ < 200) {
    let best: { from: Clue; to: Clue; s: number } | null = null;
    for (const to of left) {
      for (const from of reached) {
        const s = score(from, to) - (outDegree.get(from.id) ?? 0) * 0.5;
        if (!best || s > best.s) best = { from, to, s };
      }
    }
    if (!best) break;
    link(best.from, best.to);
    outDegree.set(best.from.id, (outDegree.get(best.from.id) ?? 0) + 1);
    reached.push(best.to);
    left.splice(left.indexOf(best.to), 1);
  }

  // The innocents' secrets, a branch at a time: its head hangs off a clue
  // that names the one keeping it, and each clue of it leads to the next.
  // Nothing else on the board carries a lead: it is found by asking or
  // looking, and a page with five marked leads on it is a page nobody can
  // choose from (spec §4; the diagnosis measured 69–73%).
  const branches = new Map<Id, Clue[]>();
  for (const c of findable) {
    if (!c.branchId) continue;
    const list = branches.get(c.branchId) ?? [];
    list.push(c);
    branches.set(c.branchId, list);
  }
  for (const list of branches.values()) {
    const head = list[0] as Clue;
    const keeper = head.aboutSecretOf;
    let best: { from: Clue; s: number } | null = null;
    for (const from of findable) {
      if (from.branchId || from.kind === 'testimony' || from.kind === 'account') continue;
      if ((outDegree.get(from.id) ?? 0) >= 2) continue;
      const names = keeper !== undefined && (named.get(from.id) as Set<Id>).has(keeper) ? 3 : 0;
      const s = Math.max(names, score(from, head));
      if (s > 0 && (!best || s > best.s)) best = { from, s };
    }
    if (best) {
      link(best.from, head);
      outDegree.set(best.from.id, (outDegree.get(best.from.id) ?? 0) + 1);
    }
    for (let i = 1; i < list.length; i++) link(list[i - 1] as Clue, list[i] as Clue);
  }
}

/* ------------------------------------------------------------ confrontation */

const ADMISSION: Record<string, string> = {
  affair: 'I was with somebody I should not have been with.',
  embezzling: 'I was moving money that was not mine to move.',
  'gambling-debt': 'I owe money on bets, and I was paying some of it back.',
  fence: 'I was selling things that were stolen.',
  blackmail: 'I was being paid to keep quiet about somebody.',
  'secret-drinking': 'I was drinking, and I had promised I had stopped.',
  'forged-identity': 'My papers are not mine. I was keeping out of sight.',
  dope: 'I was buying morphine.',
  'union-organizing': 'I was signing men up for the union.',
  'hidden-family': 'I was seeing a child nobody knows I have.',
};

/** How often a caught innocent tells a second lie on the first confrontation. */
export const SECOND_LIE = 0.7;
/** The same for the culprit, before the room for one runs out; see `confront`. */
export const CULPRIT_SECOND_LIE = 0.75;
/** The culprit, confronted again. */
export const CULPRIT_THIRD_LIE = 0.2;

function confront(
  input: LogicSelectInput,
  lie: LieBlock,
  routes: Id[][],
  full: SolverState,
  findable: Clue[],
): Confrontation {
  const { rng, cast, setting, build } = input;
  const L = build.murderPlaceId;
  const X = who(cast, lie.personId);
  const placeName = (id: Id): string => setting.places.find((p) => p.id === id)?.shortName ?? id;
  const when = span(lie.ticks);
  const isCulprit = lie.personId === cast.killer.id;
  void findable;

  /** A second lie: somewhere else they were not, that something in hand already rules out. */
  const secondLie = (not: Id[]): ConfrontResponse | null => {
    const options = rng.shuffle(setting.places.map((p) => p.id)).filter(
      (p) => p !== L && !not.includes(p) && !lie.truth.includes(p),
    );
    for (const p of options) {
      for (const t of lie.ticks) {
        const w = whyNot(full, lie.personId, t, p);
        if (!w) continue;
        const ids = w.rules.map((r) => full.problem.rules[r]?.id as Id).filter((id) => id !== 'given');
        if (ids.length === 0) continue;
        const claims: Extract<Fact, { kind: 'claims' }> = { kind: 'claims', personId: lie.personId, place: p, ticks: lie.ticks.slice() };
        const last = not[not.length - 1] as Id;
        return {
          kind: 'second-lie',
          claims,
          text:
            not.length > 1
              ? `“Not ${placeName(last)} either, then. I was at ${placeName(p)}.”`
              : `“All right, I wasn’t at ${placeName(lie.claimed)}. I was at ${placeName(p)}.”`,
          rule: `${X} says now: ${placeName(p)}, ${when}.`,
          contradictedBy: ids,
        };
      }
    }
    return null;
  };
  const quiet: ConfrontResponse = {
    kind: 'quiet',
    text: `${X} has nothing more to say about it.`,
    rule: `${X} will not say more about ${when}.`,
  };
  const hold: ConfrontResponse = {
    kind: 'hold',
    text: `${X} says it again: ${placeName(lie.claimed)}, ${when}.`,
    rule: `${X} still says: ${placeName(lie.claimed)}, ${when}.`,
  };

  let first: ConfrontResponse;
  let second: ConfrontResponse;
  if (isCulprit) {
    // The culprit never confesses. A second lie as often as anybody tells one
    // on the first confrontation: the culprit's lies are about the crime's
    // half hours, where fewer rooms are already ruled out, so the culprit is
    // asked a little more often to find one. On the second the culprit mostly
    // goes quiet, so that across both a second lie is no commoner from the
    // culprit than from anybody else (spec §3).
    first = (rng.chance(CULPRIT_SECOND_LIE) ? secondLie([lie.claimed]) : null) ?? quiet;
    const again = first.kind === 'second-lie' ? [lie.claimed, (first.claims as { place: Id }).place] : [lie.claimed];
    second = (rng.chance(CULPRIT_THIRD_LIE) ? secondLie(again) : null) ?? quiet;
  } else if (lie.cover === 'companion') {
    first = rng.chance(SECOND_LIE) ? hold : withdraw();
    second = withdraw();
  } else {
    first = (rng.chance(SECOND_LIE) ? secondLie([lie.claimed]) : null) ?? hold;
    second = admit();
  }

  function admit(): ConfrontResponse {
    const secret = build.secrets[lie.personId];
    const facts: Fact[] = lie.ticks.map((t, i) => ({ kind: 'personAt', personId: lie.personId, place: lie.truth[i] as Id, tick: t }));
    if (secret) facts.push({ kind: 'secretExplained', personId: lie.personId, secretType: secret.type });
    const where = placeName(lie.truth[0] as Id);
    return {
      kind: 'admit',
      facts,
      text: `“All right. I was at ${where}. ${ADMISSION[secret?.type ?? ''] ?? 'It had nothing to do with this.'}”`,
      rule: `${X}: ${where}, ${when}. ${X} says so now.`,
    };
  }
  function withdraw(): ConfrontResponse {
    const facts: Fact[] = lie.ticks.map((t, i) => ({ kind: 'personAt', personId: lie.personId, place: lie.truth[i] as Id, tick: t }));
    const other = lie.with ? who(cast, lie.with) : 'them';
    return {
      kind: 'withdraw',
      facts,
      text: `“I wasn’t with ${other}. I said I was because ${other} asked me to. I was at ${placeName(lie.truth[0] as Id)}.”`,
      rule: `${X}: ${placeName(lie.truth[0] as Id)}, ${when}; not with ${other}. ${X} says so now.`,
    };
  }

  return { personId: lie.personId, lie, contradictions: routes, responses: [first, second] };
}
