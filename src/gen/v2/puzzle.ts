/**
 * v2 — the puzzle stage (docs/35 §1 stage 2; docs/34 §3).
 *
 * The truth is built as before (stage 1). This decides what the player can
 * find, the way a sudoku setter digs a solved grid:
 *
 * 1. **Targets and rivals.** The report asks who, and from Soft-boiled up
 *    when; how, the way in, why and where it is now are read off a fact. A
 *    rival is another answer: an innocent at the scene when it happened, or
 *    another half hour.
 * 2. **Techniques.** The solver commits the cheapest technique first and
 *    tags every conclusion (T1 read-off … T10 hypothesis). The tier's rung is
 *    a cap: a solver held to it never uses a dearer technique.
 * 3. **Routes.** R(r) is how many disjoint sets of facts break a rival:
 *    find one, take its facts away, look again. A person's own account is
 *    never taken away (anybody can tell their evening), nor what the night
 *    starts with.
 * 4. **Dig, at the level of the world.** Start from everything the truth
 *    supports. While the case can be solved one rung down, pick the key rival
 *    (an innocent nearest the scene) and take away a fact on its cheap route:
 *    a watcher who was not counting, a stranger nobody noticed, an anchor
 *    nobody timed — or, for a sighting by name, a witness who never knew the
 *    person's name (the acquaintance edge is cut, so asking them now gets
 *    "never heard of him", and nothing is hidden). Keep a dig only if the case
 *    still solves at the tier's rung, truly, and every lie that has to be
 *    broken still can be. Then narrow the key rivals to the tier's band.
 * 5. **Accept by Tatham's rule** (solvable at the rung, not one rung down) and
 *    the complete uniqueness check (`unique.ts`).
 * 6. **The graph**: steps from the solver's reasons, with techniques, what
 *    they rest on, the rivals and their routes, and the stats the bands are
 *    measured by.
 */

import { TICKS, clock, speakTimes, type Clue, type Fact, type Id, type Tick } from '../types.js';
import {
  TECH_COST,
  crimeTicks,
  culpritOf,
  placesAt,
  solve,
  whyNot,
  whyTick,
  type SolverState,
  type Tech,
  type Why,
} from '../logic/solver.js';
import { idsOf, problemOf, sourceKey, type LogicSelectInput, type ProblemFrame } from '../logic/select.js';
import { applyRule } from '../logic/lines.js';
import { edgeOf } from '../logic/acquaint.js';
import type { AcquaintanceEdge } from '../types.js';
import { rivalWorld } from './unique.js';
import type { DeductionGraph, GraphStep, RivalInfo, StepKind } from './graph.js';

/** The rung each tier is solved at, and the rung below it that must not solve it. */
export const TIER_CAP = [1.5, 1.5, 2.5, 3, 5, 7] as const;
export const TIER_FLOOR = [null, null, 1.5, 2.5, 3, 5] as const;

export interface Band {
  keyMin: number;
  keyMax: number;
  otherMin: number;
  otherMax: number;
  criticalMax: number;
  widthMin: number;
  loadMax: number;
}

/** docs/34 §5, the suggested bands. Key rivals are the one or two innocents nearest the scene, and the half hour. */
export const BANDS: Band[] = [
  { keyMin: 3, keyMax: 99, otherMin: 2, otherMax: 99, criticalMax: 0, widthMin: 3, loadMax: 99 },
  { keyMin: 3, keyMax: 99, otherMin: 2, otherMax: 99, criticalMax: 0, widthMin: 3, loadMax: 99 },
  { keyMin: 2, keyMax: 99, otherMin: 2, otherMax: 99, criticalMax: 0, widthMin: 2, loadMax: 4 },
  { keyMin: 2, keyMax: 2, otherMin: 1, otherMax: 99, criticalMax: 1, widthMin: 2, loadMax: 4 },
  { keyMin: 1, keyMax: 2, otherMin: 1, otherMax: 99, criticalMax: 2, widthMin: 1, loadMax: 4 },
  { keyMin: 1, keyMax: 1, otherMin: 1, otherMax: 2, criticalMax: 3, widthMin: 1, loadMax: 3 },
];

export function tierIndex(tier: number | string): number {
  return typeof tier === 'number' ? Math.max(0, Math.min(5, tier)) : 5;
}

interface Rival {
  id: string;
  kind: 'who' | 'when';
  personId?: Id;
  tick?: Tick;
  key: boolean;
}

export interface Puzzle {
  /** The findable core: the givens, all testimony (some of it cut to "never heard of him"), every account, and the board kept. */
  core: Clue[];
  /** Acquaintance edges cut by the dig: from, to, and what they are now. */
  dugEdges: { from: Id; to: Id; strength: 'stranger' | 'sight' | 'name' }[];
  graph: DeductionGraph;
  cap: number;
  floor: number | null;
}

export function buildPuzzle(input: LogicSelectInput, frame: ProblemFrame): Puzzle | string {
  const { rng, cast, build, pool, dials } = input;
  const tier = tierIndex(dials.shape.tier);
  const cap = TIER_CAP[tier] as number;
  const floor = TIER_FLOOR[tier] ?? null;
  const band = BANDS[tier] as Band;
  const M = build.murderTick;
  const L = build.murderPlaceId;
  const killerId = cast.killer.id;
  const innocents = cast.innocents.map((p) => p.id);
  const suspects = cast.suspects.map((p) => p.id);
  const needTick = dials.shape.coronerWidth > 1;
  const truthAt = (id: Id, t: Tick): Id | null => (build.truth[id] as (Id | null)[] | undefined)?.[t] ?? null;
  const personOf = (id: Id) => cast.people.find((p) => p.id === id);
  const who = (id: Id): string => personOf(id)?.surname ?? id;
  const placeName = (id: Id): string => input.setting.places.find((p) => p.id === id)?.shortName ?? id;

  const starting = pool.starting;
  const free = new Set<Id>([...starting.map((c) => c.id), ...pool.accounts.map((c) => c.id)]);
  const diggableBoard = new Set<Id>([...pool.descriptions, ...pool.watch, ...pool.timing, ...pool.knowledge].map((c) => c.id));

  interface World {
    testimony: Clue[];
    board: Clue[];
    dug: { from: Id; to: Id; strength: 'stranger' | 'sight' | 'name' }[];
    boardDug: number;
  }
  let world: World = {
    testimony: pool.testimony.slice(),
    board: [...pool.descriptions, ...pool.watch, ...pool.timing, ...pool.knowledge, ...pool.kept, ...input.signature],
    dug: [],
    boardDug: 0,
  };
  const cluesOf = (w: World): Clue[] => [...starting, ...w.testimony, ...pool.accounts, ...w.board];

  const solveAt = (clues: Clue[], c: number): SolverState =>
    solve({ ...problemOf(frame, clues, c >= TECH_COST.T10), techniques: true, maxCost: c }).state;

  const truthful = (st: SolverState): boolean => {
    for (const s of suspects) {
      for (let t = 0; t < TICKS; t++) {
        const tr = truthAt(s, t);
        if (tr && !placesAt(st, s, t).includes(tr)) return false;
      }
    }
    return crimeTicks(st).includes(M);
  };
  const settled = (st: SolverState): boolean => {
    if (st.contradiction) return false;
    const c = culpritOf(st);
    if (!c || c.id !== killerId) return false;
    const ticks = crimeTicks(st);
    if (!ticks.includes(M)) return false;
    if (needTick && ticks.length !== 1) return false;
    return truthful(st);
  };

  /* --- rivals ---------------------------------------------------------------- */
  const open = solve({ ...problemOf(frame, starting, false), techniques: true }).state;
  const windowTicks = crimeTicks(open);
  const dist = (id: Id): number => {
    const at = truthAt(id, M);
    return at ? Math.abs((input.blocks[at] ?? 0) - (input.blocks[L] ?? 0)) : 3;
  };
  const byNearness = innocents.slice().sort((a, b) => {
    const d = dist(a) - dist(b);
    if (d !== 0) return d;
    const la = build.mLiars.includes(a) ? 0 : 1;
    const lb = build.mLiars.includes(b) ? 0 : 1;
    return la - lb;
  });
  const keyWho = new Set(byNearness.slice(0, Math.min(2, byNearness.length)));
  const rivals: Rival[] = [
    ...innocents.map((id) => ({ id: `who:${id}`, kind: 'who' as const, personId: id, key: keyWho.has(id) })),
    ...(needTick ? windowTicks.filter((t) => t !== M).map((t) => ({ id: `when:${t}`, kind: 'when' as const, tick: t, key: true })) : []),
  ];

  const brokenWhy = (st: SolverState, r: Rival): Why | null => {
    if (r.kind === 'who') return whyNot(st, r.personId as Id, M, L);
    const t = r.tick as Tick;
    if (st.tdom & (1 << t)) return null;
    return st.whyT[t] ?? { depth: 1, rules: [], hyp: false, tech: 'T1', peak: 1 };
  };
  const routeIds = (st: SolverState, w: Why): Id[] =>
    [...new Set(idsOf(st, w))].filter((id) => !id.startsWith('confess:') && !free.has(id));

  const routesOf = (r: Rival, clues: Clue[], c: number, max: number): Id[][] => {
    const out: Id[][] = [];
    let cur = clues;
    for (let k = 0; k < max; k++) {
      const st = solveAt(cur, c);
      const w = brokenWhy(st, r);
      if (!w) break;
      const ids = routeIds(st, w);
      out.push(ids);
      if (ids.length === 0) break;
      const drop = new Set(ids);
      cur = cur.filter((x) => !drop.has(x.id));
    }
    return out;
  };

  /* --- lies that have to break --------------------------------------------- */
  const ded = input.dials.shape.deduction;
  const secretLies = ded?.secretLies ?? false;
  const lieNeed = (personId: Id, cover: string): number =>
    personId === killerId ? (cover === 'crime' || cover === 'means' ? 1 : 0) : secretLies ? 2 : 0;
  const lieRoutes = (d: { personId: Id; ticks: Tick[]; claimed: Id }, clues: Clue[], c: number, max: number, first?: SolverState): Id[][] => {
    const out: Id[][] = [];
    let cur = clues;
    for (let k = 0; k < max; k++) {
      const st = k === 0 && first ? first : solveAt(cur, c);
      let found: Id[] | null = null;
      for (const t of d.ticks) {
        const w = whyNot(st, d.personId, t, d.claimed);
        if (w) {
          found = idsOf(st, w);
          break;
        }
      }
      if (!found || found.length === 0) break;
      out.push(found);
      const byId = new Map(cur.map((x) => [x.id, x]));
      const drop = new Set(found.map((id) => byId.get(id)).filter((x): x is Clue => !!x).map(sourceKey));
      cur = cur.filter((x) => x.kind === 'scene' || x.kind === 'morgue' || x.kind === 'client' || !drop.has(sourceKey(x)));
    }
    return out;
  };
  const liesOk = (clues: Clue[], first: SolverState): boolean => {
    for (const d of build.lieDrafts) {
      const need = lieNeed(d.personId, d.cover);
      if (need === 0) continue;
      if (lieRoutes(d, clues, cap, need, first).length < need) return false;
    }
    return true;
  };
  const accept = (w: World): boolean => {
    const clues = cluesOf(w);
    const st = solveAt(clues, cap);
    return settled(st) && liesOk(clues, st);
  };

  /* --- the whole truth first ------------------------------------------------ */
  if (!settled(solveAt(cluesOf(world), cap))) {
    return `the truth does not solve at the tier's rung (${cap})`;
  }
  if (!liesOk(cluesOf(world), solveAt(cluesOf(world), cap))) return 'a lie that has to break cannot, even with everything';

  /* --- digging ---------------------------------------------------------------- */
  const testimonyDiggable = (c: Clue): { from: Id; to: Id } | null => {
    if (c.kind !== 'testimony' || !c.about || c.source.type !== 'person') return null;
    const from = c.source.personId;
    const to = c.about;
    if (!suspects.includes(to)) return null;
    if (!c.establishes.some((f) => f.kind === 'personAt' || f.kind === 'personNotAt' || f.kind === 'personAtAnchor' || f.kind === 'apart')) return null;
    const e = edgeOf(build.acq, from, to);
    if (!e || e.basis === 'tie' || e.basis === 'secret') return null;
    if (e.strength !== 'name' && e.strength !== 'relation') return null;
    // A suspect pair is cut both ways, and neither side may be a tie.
    if (suspects.includes(from)) {
      const back = edgeOf(build.acq, to, from);
      if (back && (back.basis === 'tie' || back.basis === 'secret')) return null;
    }
    return { from, to };
  };
  const cutTestimony = (w: World, from: Id, to: Id): World => {
    const shared = (): number => {
      let n = 0;
      for (let t = 0; t < TICKS; t++) {
        const a = truthAt(from, t);
        if (a && a === truthAt(to, t)) n++;
      }
      return n;
    };
    const strength: 'stranger' | 'sight' = shared() >= 2 ? 'sight' : 'stranger';
    const pairs: [Id, Id][] = [[from, to]];
    if (suspects.includes(from)) pairs.push([to, from]);
    const testimony = w.testimony.map((c) => {
      const pair = pairs.find(([a, b]) => c.source.type === 'person' && c.source.personId === a && c.about === b);
      if (!pair) return c;
      const [a, b] = pair;
      const text = strength === 'stranger' ? `${who(a)} does not know anybody called ${who(b)}.` : `${who(a)} might know ${who(b)}'s face, but not the name.`;
      const next: Clue = {
        ...c,
        establishes: [{ kind: 'acquainted', personIds: [a, b], strength }],
        text: speakTimes(text),
        textRecord: text,
        leadsTo: [],
      };
      delete next.rule;
      delete next.ruleParts;
      applyRule(next, '', pool.names);
      return next;
    });
    // A watcher who does not know the name cannot say "nobody but" it.
    const board = w.board.filter(
      (c) =>
        !(
          c.kind === 'watch' &&
          c.source.type === 'person' &&
          pairs.some(([a, b]) => c.source.type === 'person' && c.source.personId === a && c.establishes.some((f) => f.kind === 'absentFrom' && f.except.includes(b)))
        ),
    );
    return {
      ...w,
      testimony,
      board,
      dug: [...w.dug, ...pairs.map(([a, b]) => ({ from: a, to: b, strength }))],
    };
  };
  const digOne = (w: World, id: Id): World | null => {
    if (diggableBoard.has(id)) {
      if (!w.board.some((c) => c.id === id)) return null;
      return { ...w, board: w.board.filter((c) => c.id !== id), boardDug: w.boardDug + 1 };
    }
    const c = w.testimony.find((x) => x.id === id);
    if (!c) return null;
    const pair = testimonyDiggable(c);
    if (!pair) return null;
    return cutTestimony(w, pair.from, pair.to);
  };
  const diggable = (w: World, id: Id): boolean => {
    if (diggableBoard.has(id)) return w.board.some((c) => c.id === id);
    const c = w.testimony.find((x) => x.id === id);
    return !!c && testimonyDiggable(c) !== null;
  };
  /**
   * Try the ids, the first dig the case survives is kept. A sighting by name
   * goes first: narrow and deep means taking away what reads straight off,
   * and keeping the pieces (a count, a stranger, an anchor) that have to be
   * put together. Random within a kind.
   */
  const digRank = (w: World, id: Id): number => {
    const c = w.testimony.find((x) => x.id === id) ?? w.board.find((x) => x.id === id);
    if (!c) return 9;
    if (c.kind === 'testimony') return 0;
    if (c.kind === 'timing') return 1;
    if (c.kind === 'anchor') return 2;
    if (c.kind === 'observation') return 3;
    return 4;
  };
  const tryDig = (w: World, ids: Id[], extra?: (next: World) => boolean): World | null => {
    const shuffled = rng.shuffle([...new Set(ids)].filter((id) => diggable(w, id)));
    shuffled.sort((a, b) => digRank(w, a) - digRank(w, b));
    for (const id of shuffled) {
      const next = digOne(w, id);
      if (!next) continue;
      if (!accept(next)) continue;
      if (extra && !extra(next)) continue;
      return next;
    }
    return null;
  };

  /* --- widening: low tiers want several overlapping routes -------------------- */
  // The other way round from digging: somebody who shared a room with an
  // innocent turns out to know them by name, so asking them about that
  // person now places them. Only where no sighting is timed by an anchor
  // (Raw to Poached), and never at the crime's half hour itself, so nobody
  // is cleared by one line (M10's lesson) — a new sighting inside their own
  // account is a second way of standing it up.
  const anchorTimed = ded?.anchorTimed ?? 0;
  const namedTestimony = (x: Id, y: Id, orig: Clue): Clue | null => {
    const X = who(x);
    const Y = who(y);
    const posted = personOf(x)?.kind === 'fixture';
    const co: Tick[] = [];
    for (let t = 0; t < TICKS; t++) {
      const here = truthAt(x, t);
      if (here && here === truthAt(y, t)) co.push(t);
    }
    const told = co.filter((t) => !(build.lies[x] ?? []).includes(t));
    if (told.includes(M)) return null;
    const facts: Fact[] = [];
    const sentences: string[] = [];
    const byPlace = new Map<Id, Tick[]>();
    for (const t of told) {
      const place = truthAt(x, t) as Id;
      byPlace.set(place, [...(byPlace.get(place) ?? []), t]);
    }
    for (const [place, ticks] of byPlace) {
      for (const t of ticks) {
        facts.push({ kind: 'personAt', personId: y, place, tick: t });
        if (place === build.accessPlaceId && t < M && !facts.some((f) => f.kind === 'hadAccess')) {
          facts.push({ kind: 'hadAccess', personId: y, methodId: input.setting.method.id });
        }
      }
      const runs: Tick[][] = [];
      for (const t of ticks) {
        const last = runs[runs.length - 1];
        if (last && (last[last.length - 1] as Tick) === t - 1) last.push(t);
        else runs.push([t]);
      }
      const when = runs.map((r) => (r.length === 1 ? `at ${clock(r[0] as Tick)}` : `from ${clock(r[0] as Tick)} to ${clock(r[r.length - 1] as Tick)}`)).join(' and ');
      sentences.push(`${X} saw ${Y} at ${placeName(place)} ${when}.`);
    }
    if (posted) {
      const absent: Tick[] = [];
      for (let t = 0; t < TICKS; t++) {
        const here = truthAt(x, t);
        if (!here || co.includes(t)) continue;
        facts.push({ kind: 'personNotAt', personId: y, place: here, tick: t });
        absent.push(t);
      }
      if (absent.length > 0) sentences.push(`${X} did not see ${Y} the rest of the evening.`);
      // A watcher's word about the crime's half hour at the door clears by one line.
      if (absent.includes(M) && truthAt(x, M) === L) return null;
    }
    if (!facts.some((f) => f.kind === 'personAt')) return null;
    const text = sentences.join(' ');
    const next: Clue = { ...orig, establishes: facts, text: speakTimes(text), textRecord: text, leadsTo: [] };
    delete next.rule;
    delete next.ruleParts;
    applyRule(next, `${X} saw ${personOf(y)?.gender === 'f' ? 'her' : 'him'}.`, pool.names);
    return next;
  };
  const promote = (w: World, x: Id, y: Id): World | null => {
    const pairs: [Id, Id][] = [[x, y]];
    if (suspects.includes(x)) pairs.push([y, x]);
    let testimony = w.testimony;
    for (const [a, b] of pairs) {
      const e = edgeOf(build.acq, a, b);
      if (!e || e.strength === 'name' || e.strength === 'relation' || e.basis === 'none' || e.basis === 'tie') return null;
      const orig = testimony.find((c) => c.source.type === 'person' && c.source.personId === a && c.about === b);
      if (!orig) return null;
      const named = namedTestimony(a, b, orig);
      if (!named) {
        if (a === x) return null;
        continue;
      }
      testimony = testimony.map((c) => (c === orig ? named : c));
    }
    // What the witness would have described as a stranger is now a name.
    const board = w.board.filter(
      (c) => !(c.kind === 'observation' && c.source.type === 'person' && pairs.some(([a, b]) => c.source.type === 'person' && c.source.personId === a && c.establishes.some((f) => f.kind === 'describedAt' && f.description.matches.includes(b)))),
    );
    return { ...w, testimony, board, dug: [...w.dug, ...pairs.map(([a, b]) => ({ from: a, to: b, strength: 'name' as const }))] };
  };
  /* --- Tatham: not solvable one rung down ------------------------------------- */
  let bottleneck: Rival | null = null;
  if (floor !== null) {
    const order = [...rng.shuffle(rivals.filter((r) => r.key && r.kind === 'who')), ...rng.shuffle(rivals.filter((r) => r.key && r.kind === 'when')), ...rng.shuffle(rivals.filter((r) => !r.key))];
    const lowAll = solveAt(cluesOf(world), floor);
    // Already beyond the rung below (Hard-boiled's two descriptions): the
    // bottleneck is whichever rival stands there.
    if (!settled(lowAll)) bottleneck = order.find((r) => !brokenWhy(lowAll, r)) ?? order[0] ?? null;
    for (const r of bottleneck ? [] : order) {
      let w = world;
      let ok = false;
      for (let guard = 0; guard < 40; guard++) {
        const low = solveAt(cluesOf(w), floor);
        const lw = brokenWhy(low, r);
        if (!lw || !settled(low)) {
          // One rung down, this rival stands: the case needs the tier's technique.
          ok = true;
          break;
        }
        const next = tryDig(w, routeIds(low, lw), (n) => {
          const hi = solveAt(cluesOf(n), cap);
          return brokenWhy(hi, r) !== null;
        });
        if (!next) break;
        w = next;
      }
      if (ok && !settled(solveAt(cluesOf(w), floor))) {
        world = w;
        bottleneck = r;
        break;
      }
    }
    if (!bottleneck) return 'no key rival could be made to need the tier\'s technique';
  }

  const keepsTatham = (n: World): boolean => floor === null || !settled(solveAt(cluesOf(n), floor));
  // The bottleneck is a key rival whatever its distance (Hard-boiled's pair
  // stand a walk off); it takes the place of the farther of the two nearest.
  if (bottleneck && bottleneck.kind === 'who' && !bottleneck.key) {
    const keyed = byNearness.filter((id) => keyWho.has(id));
    const drop = rivals.find((r) => r.kind === 'who' && r.personId === keyed[keyed.length - 1]);
    if (drop) drop.key = false;
    bottleneck.key = true;
  }

  /* --- the turn on the road: a lie that has to be caught ---------------------- */
  // docs/35: the turn falls at the first lie caught, and in the worked example
  // the liars are cleared by what they give up once caught (T8). From
  // Poached up, an innocent who lies about the crime's half hour is cleared
  // by their confession where the world allows it: their other ways out of
  // the scene are dug, so that catching them is on the road to the report.
  const viaConfession = (st: SolverState, r: Rival): boolean => {
    const w = brokenWhy(st, r);
    return !!w && idsOf(st, w).some((id) => id.startsWith('confess:'));
  };
  if (secretLies && tier >= 2) {
    const liars = rivals.filter((r) => r.kind === 'who' && build.mLiars.includes(r.personId as Id));
    for (const r of rng.shuffle(liars)) {
      for (let guard = 0; guard < 12; guard++) {
        const st = solveAt(cluesOf(world), cap);
        if (viaConfession(st, r)) break;
        const w = brokenWhy(st, r);
        if (!w) break;
        const next = tryDig(world, routeIds(st, w), (n) => keepsTatham(n) && brokenWhy(solveAt(cluesOf(n), cap), r) !== null);
        if (!next) break;
        world = next;
      }
    }
  }

  /* --- narrow the key rivals to the band -------------------------------------- */
  if (band.keyMax < 99) {
    const narrowing = [...(bottleneck && bottleneck.kind === 'who' ? [bottleneck] : []), ...rivals.filter((r) => r.key && r.kind === 'who' && r !== bottleneck)];
    for (const r of tier >= 4 ? narrowing : narrowing.slice(0, 1)) {
      for (let guard = 0; guard < 16; guard++) {
        const rs = routesOf(r, cluesOf(world), cap, band.keyMax + 1);
        if (rs.length <= band.keyMax) break;
        const first = new Set(rs[0] ?? []);
        const later = rs.slice(1).flat().filter((id) => !first.has(id));
        const next = tryDig(world, later, (n) => keepsTatham(n) && brokenWhy(solveAt(cluesOf(n), cap), r) !== null);
        if (!next) break;
        world = next;
      }
    }
  }

  if (band.keyMin >= 2 && anchorTimed === 0) {
    for (const r of rivals) {
      if (r.kind !== 'who') continue;
      const want = r.key ? band.keyMin : band.otherMin;
      const y = r.personId as Id;
      const askers = cast.people.filter((p) => p.kind !== 'victim' && p.id !== y).map((p) => p.id);
      for (const x of rng.shuffle(askers)) {
        const have = routesOf(r, cluesOf(world), cap, want).length;
        if (have >= want) break;
        const next = promote(world, x, y);
        if (!next || !accept(next) || !keepsTatham(next)) continue;
        if (routesOf(r, cluesOf(next), cap, want).length > have) world = next;
      }
    }
  }

  const core = cluesOf(world);
  const full = solveAt(core, cap);
  if (!settled(full)) return 'the dug case does not solve';
  if (!liesOk(core, full)) return 'a lie that has to break cannot, after digging';

  /* --- the complete check ------------------------------------------------------- */
  const confessionFacts: Fact[] = [];
  for (const d of build.lieDrafts) {
    if (d.personId === killerId) continue;
    if (!d.ticks.some((t) => whyNot(full, d.personId, t, d.claimed))) continue;
    for (const t of d.ticks) confessionFacts.push({ kind: 'personAt', personId: d.personId, place: truthAt(d.personId, t) as Id, tick: t });
  }
  const worldFacts: Fact[] = [...frame.givens, ...core.flatMap((c) => c.establishes), ...confessionFacts];
  let unique = true;
  let uniqueUnknown = 0;
  for (const r of rivals) {
    const ans = rivalWorld(
      { suspects, places: frame.places, blocks: frame.blocks, scene: L, murder: frame.murder, facts: worldFacts },
      r.kind === 'who' ? { kind: 'who', personId: r.personId as Id } : { kind: 'when', tick: r.tick as Tick },
    );
    if (ans.ok) {
      unique = false;
      return `not unique: ${r.id} has a world under the taught rules`;
    }
    if (ans.unknown) uniqueUnknown++;
  }

  /* --- routes, critical facts, backdoors ------------------------------------------ */
  const rivalRoutes = new Map<string, Id[][]>();
  for (const r of rivals) rivalRoutes.set(r.id, routesOf(r, core, cap, 4));
  const floorState = floor === null ? null : solveAt(core, floor);
  const tatham = settled(full) && (floorState === null || !settled(floorState));
  const onRoutes = new Set<Id>([...rivalRoutes.values()].flat(2));
  const critical: Id[] = [];
  for (const id of onRoutes) {
    const st = solveAt(core.filter((c) => c.id !== id), cap);
    if (!settled(st)) critical.push(id);
  }
  const backdoors: Id[] = [];
  for (const r of rivals) {
    if (!r.key) continue;
    for (const route of rivalRoutes.get(r.id) ?? []) if (route.length === 1) backdoors.push(route[0] as Id);
  }

  /* --- the graph ------------------------------------------------------------------ */
  const graph = graphOf({
    input,
    frame,
    full,
    core,
    rivals,
    rivalRoutes,
    bottleneck,
    floor,
    cap,
    tier,
    band,
    critical,
    backdoors,
    tatham,
    unique,
    uniqueUnknown,
    dug: { board: world.boardDug, edges: world.dug.length },
    names: { who, placeName },
    brokenWhy: (st, r) => brokenWhy(st, r as Rival),
  });
  return { core, dugEdges: world.dug, graph, cap, floor };
}

/* ------------------------------------------------------------------ graph */

interface GraphInput {
  input: LogicSelectInput;
  frame: ProblemFrame;
  full: SolverState;
  core: Clue[];
  rivals: Rival[];
  rivalRoutes: Map<string, Id[][]>;
  bottleneck: Rival | null;
  floor: number | null;
  cap: number;
  tier: number;
  band: Band;
  critical: Id[];
  backdoors: Id[];
  tatham: boolean;
  unique: boolean;
  uniqueUnknown: number;
  dug: { board: number; edges: number };
  names: { who: (id: Id) => string; placeName: (id: Id) => string };
  brokenWhy: (st: SolverState, r: Rival) => Why | null;
}

const TECH_BY_COST = (cost: number, fallback: Tech): Tech => {
  const exact = (Object.keys(TECH_COST) as Tech[]).filter((t) => TECH_COST[t] === cost && t !== 'E');
  return exact.includes(fallback) ? fallback : (exact[0] ?? fallback);
};

function graphOf(g: GraphInput): DeductionGraph {
  const { input, full: st, core, rivals, names } = g;
  const { cast, build } = input;
  const M = build.murderTick;
  const L = build.murderPlaceId;
  const killerId = cast.killer.id;
  const suspects = st.problem.suspects;
  const places = st.problem.places;
  const P = st.P;
  const ruleId = (r: number): Id => st.problem.rules[r]?.id as Id;

  // Every value struck, by the step (premise) that struck it.
  const cellsOf = new Map<number, { s: number; t: number; p: number }[]>();
  const ticksOf = new Map<number, number[]>();
  for (let i = 0; i < st.why.length; i++) {
    const w = st.why[i];
    if (!w || w.key === undefined) continue;
    const p = i % P;
    const cell = (i - p) / P;
    const t = cell % TICKS;
    const s = (cell - t) / TICKS;
    const list = cellsOf.get(w.key) ?? [];
    list.push({ s, t, p });
    cellsOf.set(w.key, list);
  }
  for (let t = 0; t < TICKS; t++) {
    const w = st.whyT[t];
    if (!w || w.key === undefined) continue;
    const list = ticksOf.get(w.key) ?? [];
    list.push(t);
    ticksOf.set(w.key, list);
  }

  const steps = new Map<string, GraphStep>();
  const stepOfWhy = new Map<Why, string | null>();
  const confessIds = new Set(st.problem.rules.filter((r) => r.id.startsWith('confess:')).map((r) => r.id));

  /** The step for a why, or null when it is only a read-off (its facts go to the parent). */
  const visit = (w: Why): { step: string | null; facts: Id[]; needs: string[] } => {
    const cached = stepOfWhy.get(w);
    if (cached !== undefined && cached !== null) return { step: cached, facts: [], needs: [] };
    const childFacts: Id[] = [];
    const childNeeds: string[] = [];
    const inherited = new Set<number>();
    for (const c of w.from ?? []) {
      for (const r of c.rules) inherited.add(r);
      const v = visit(c);
      if (v.step) childNeeds.push(v.step);
      else {
        childFacts.push(...v.facts);
        childNeeds.push(...v.needs);
      }
    }
    const own = w.rules.filter((r) => !inherited.has(r)).map(ruleId).filter((id) => id !== 'given');
    const facts = [...new Set([...own.filter((id) => !confessIds.has(id)), ...childFacts])];
    const tech = w.tech ?? 'T1';
    if (tech === 'T1' && !own.some((id) => confessIds.has(id))) {
      stepOfWhy.set(w, null);
      return { step: null, facts, needs: [...new Set(childNeeds)] };
    }
    const key = `k${w.key ?? Math.random()}`;
    if (!steps.has(key)) {
      const cells = w.key !== undefined ? (cellsOf.get(w.key) ?? []) : [];
      const tks = w.key !== undefined ? (ticksOf.get(w.key) ?? []) : [];
      const placed = w.placed ?? [];
      let kind: StepKind;
      let label: string;
      let personId: Id | undefined;
      let place: Id | undefined;
      let ticks: Tick[] | undefined;
      const confess = own.find((id) => confessIds.has(id));
      if (confess) {
        kind = 'confess';
        personId = confess.split(':')[1] as Id;
        const byTick = placed.filter(([s]) => suspects[s] === personId);
        place = byTick[0] ? (places[byTick[0][2]] as Id) : undefined;
        ticks = [...new Set(byTick.map(([, t]) => t as Tick))].sort((a, b) => a - b);
        label = `${names.who(personId)} gives up where ${names.who(personId)} really was${place ? `: ${names.placeName(place)}` : ''}${ticks.length ? `, ${ticks.map(clock).join(', ')}` : ''}`;
      } else if (tks.length > 0) {
        kind = 'tick';
        ticks = tks.slice().sort((a, b) => a - b);
        label = `It did not happen at ${ticks.map(clock).join(' or ')}`;
      } else if (placed.length > 0) {
        kind = 'place';
        const [s, t, p] = placed[0] as [number, number, number];
        personId = suspects[s] as Id;
        place = places[p] as Id;
        ticks = [...new Set(placed.filter(([x, , y]) => x === s && y === p).map(([, u]) => u as Tick))].sort((a, b) => a - b);
        const others = [...new Set(placed.filter(([x]) => x !== s).map(([x]) => names.who(suspects[x] as Id)))];
        label = `${names.who(personId)} was at ${names.placeName(place)} at ${ticks.map(clock).join(', ')}${others.length ? ` (and ${others.join(', ')} placed with it)` : ''}`;
        void t;
      } else {
        kind = 'not';
        const first = cells[0];
        personId = first ? (suspects[first.s] as Id) : undefined;
        place = first ? (places[first.p] as Id) : undefined;
        ticks = [...new Set(cells.filter((c) => c.s === first?.s).map((c) => c.t as Tick))].sort((a, b) => a - b);
        label = personId && place ? `${names.who(personId)} was not at ${names.placeName(place)} at ${ticks.map(clock).join(', ')}` : 'A value struck';
      }
      const step: GraphStep = {
        id: key,
        kind,
        tech,
        peak: w.peak ?? TECH_COST[tech],
        depth: w.depth,
        label,
        facts,
        needs: [...new Set(childNeeds)],
        leaves: [...new Set(w.rules.map(ruleId).filter((id) => id !== 'given' && !confessIds.has(id)))],
        ...(personId ? { personId } : {}),
        ...(place ? { place } : {}),
        ...(ticks ? { ticks } : {}),
      };
      steps.set(key, step);
    }
    stepOfWhy.set(w, key);
    return { step: key, facts: [], needs: [] };
  };

  /** A step for a why that must be a step (a target, a rival, a lie), read-off or not. */
  const stepFor = (w: Why, kind: StepKind, label: string, extra: Partial<GraphStep>): string => {
    const v = visit(w);
    const id = `${kind}:${extra.personId ?? ''}:${(extra.ticks ?? []).join('.')}:${steps.size}`;
    const step: GraphStep = {
      id,
      kind,
      tech: v.step ? (steps.get(v.step)?.tech ?? 'T1') : (w.tech ?? 'T1'),
      peak: w.peak ?? 1,
      depth: w.depth,
      label,
      facts: v.step ? [] : v.facts,
      needs: v.step ? [v.step] : v.needs,
      leaves: [...new Set(w.rules.map(ruleId).filter((x) => x !== 'given' && !confessIds.has(x)))],
      ...extra,
    };
    steps.set(id, step);
    return id;
  };

  const rivalInfo: RivalInfo[] = [];
  const clearSteps: string[] = [];
  for (const r of rivals) {
    const w = g.brokenWhy(st, r);
    if (!w) continue;
    const label =
      r.kind === 'who'
        ? `${names.who(r.personId as Id)} was not at ${names.placeName(L)} at ${clock(M)}`
        : `It did not happen at ${clock(r.tick as Tick)}`;
    const id = stepFor(w, r.kind === 'who' ? 'not' : 'tick', label, r.kind === 'who' ? { personId: r.personId as Id, place: L, ticks: [M] } : { ticks: [r.tick as Tick] });
    if (r.kind === 'who') clearSteps.push(id);
    const routes = g.rivalRoutes.get(r.id) ?? [];
    rivalInfo.push({
      id: r.id,
      kind: r.kind,
      label,
      ...(r.personId ? { personId: r.personId } : {}),
      ...(r.tick !== undefined ? { tick: r.tick } : {}),
      key: r.key,
      routes: routes.length > 0 && (routes[0] as Id[]).length === 0 ? 99 : routes.length,
      routeFacts: routes,
      tech: TECH_BY_COST(w.peak ?? 1, w.tech ?? 'T1'),
      step: id,
    });
  }

  // The half hour.
  const targets: string[] = [];
  const tw = whyTick(st);
  const whenStep = tw
    ? stepFor(tw, 'when', `It happened at ${clock(M)}`, { ticks: [M] })
    : null;
  if (whenStep) targets.push(whenStep);

  // The lies, caught.
  const lies: { id: string; peak: number; depth: number }[] = [];
  for (const d of build.lieDrafts) {
    let w: Why | null = null;
    for (const t of d.ticks) {
      w = whyNot(st, d.personId, t, d.claimed);
      if (w) break;
    }
    if (!w) continue;
    const peak = w.peak ?? 1;
    const tech: Tech = peak <= TECH_COST.T2 ? 'T8a' : 'T8b';
    const v = visit(w);
    const id = `lie:${d.personId}:${d.ticks.join('.')}`;
    steps.set(id, {
      id,
      kind: 'lie',
      tech,
      peak: Math.max(peak, TECH_COST[tech]),
      depth: w.depth + 1,
      label: `${names.who(d.personId)} said ${names.placeName(d.claimed)} at ${d.ticks.map(clock).join(', ')}, and it is not so`,
      personId: d.personId,
      place: d.claimed,
      ticks: d.ticks.slice(),
      facts: [...(v.step ? [] : v.facts), ...core.filter((c) => c.kind === 'account' && c.source.type === 'person' && c.source.personId === d.personId).map((c) => c.id)],
      needs: v.step ? [v.step] : v.needs,
      leaves: [...new Set(w.rules.map(ruleId).filter((x) => x !== 'given' && !confessIds.has(x)))],
    });
    lies.push({ id, peak, depth: w.depth });
  }
  lies.sort((a, b) => a.peak - b.peak || a.depth - b.depth);

  // Who: the one left at the scene.
  const cul = culpritOf(st);
  if (cul) {
    const id = `who:${killerId}`;
    steps.set(id, {
      id,
      kind: 'who',
      tech: 'E',
      peak: cul.why.peak ?? 1,
      depth: cul.why.depth,
      label: `${names.who(killerId)} was the one at ${names.placeName(L)} at ${clock(M)}`,
      personId: killerId,
      place: L,
      ticks: [M],
      facts: [],
      needs: [...clearSteps, ...(whenStep ? [whenStep] : [])],
      leaves: [...new Set(cul.why.rules.map(ruleId).filter((x) => x !== 'given' && !confessIds.has(x)))],
    });
    targets.unshift(id);
  }

  // The legs: read off a fact.
  const legFacts = (pred: (f: Fact) => boolean): Id[] => core.filter((c) => c.establishes.some(pred)).map((c) => c.id);
  const unknowns = input.act.unknowns;
  const legs: { what: string; ids: Id[] }[] = [];
  if (unknowns.includes('how')) legs.push({ what: 'how', ids: legFacts((f) => f.kind === 'methodEvidence' && f.methodId === input.setting.method.id) });
  if (unknowns.includes('entry')) legs.push({ what: 'entry', ids: legFacts((f) => f.kind === 'hadAccess' && f.personId === killerId) });
  if (unknowns.includes('why')) legs.push({ what: 'why', ids: legFacts((f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === cast.killerMotive.type) });
  if (unknowns.includes('where') || unknowns.includes('whereabouts') || unknowns.includes('goods')) {
    legs.push({ what: 'where', ids: input.signature.filter((c) => core.includes(c)).map((c) => c.id) });
  }
  for (const leg of legs) {
    const id = `leg:${leg.what}`;
    steps.set(id, {
      id,
      kind: 'leg',
      tech: 'T1',
      peak: 1,
      depth: 1,
      label: `${leg.what === 'how' ? 'How' : leg.what === 'entry' ? 'The way in' : leg.what === 'why' ? 'Why' : 'Where it is now'}: read off ${leg.ids.length} fact${leg.ids.length === 1 ? '' : 's'}`,
      facts: leg.ids,
      needs: [],
      leaves: leg.ids,
    });
    targets.push(id);
  }

  /* --- measures ------------------------------------------------------------------- */
  // Only what the targets and the lies stand on.
  const reach = new Set<string>();
  const walk = (id: string): void => {
    if (reach.has(id)) return;
    reach.add(id);
    for (const n of steps.get(id)?.needs ?? []) walk(n);
  };
  for (const t of targets) walk(t);
  for (const l of lies) walk(l.id);
  const kept = [...steps.values()].filter((s) => reach.has(s.id));

  const peakCost = Math.max(1, ...kept.filter((s) => targets.includes(s.id) || s.kind !== 'lie').map((s) => TECH_COST[s.tech]));
  const peakStep = kept.find((s) => TECH_COST[s.tech] === peakCost);
  const peak: Tech = peakStep?.tech ?? 'T1';
  const floorCost = g.floor ?? 0;
  // Load is counted on the way to the targets, and a rival's own step that
  // only renames the step under it is not a second step.
  const toTargets = new Set<string>();
  const walkT = (id: string): void => {
    if (toTargets.has(id)) return;
    toTargets.add(id);
    for (const n of steps.get(id)?.needs ?? []) walkT(n);
  };
  for (const t of targets) walkT(t);
  const alias = (s: GraphStep): boolean => s.facts.length === 0 && s.needs.length === 1 && s.kind !== 'lie' && s.kind !== 'who';
  const load = kept.filter(
    (s) => toTargets.has(s.id) && !alias(s) && s.kind !== 'who' && TECH_COST[s.tech] > floorCost && (g.floor !== null || TECH_COST[s.tech] > 1),
  ).length;

  // Width: a reasoning player's path through the steps, the cheapest open one next.
  const done = new Set<string>();
  const widths: number[] = [];
  for (let guard = 0; guard < kept.length + 2; guard++) {
    const openSteps = kept.filter((s) => !done.has(s.id) && s.needs.every((n) => done.has(n) || !reach.has(n)));
    if (openSteps.length === 0) break;
    widths.push(openSteps.length);
    openSteps.sort((a, b) => a.peak - b.peak || a.depth - b.depth);
    done.add((openSteps[0] as GraphStep).id);
    if (cul && done.has(`who:${killerId}`)) break;
  }
  const sorted = widths.slice().sort((a, b) => a - b);
  const widthMin = sorted[0] ?? 0;
  const widthMedian = sorted[Math.floor(sorted.length / 2)] ?? 0;

  // The bottleneck step: the dearest step on the bottleneck rival's reasons.
  let bottleneckStep: string | null = null;
  if (g.bottleneck) {
    const info = rivalInfo.find((r) => r.id === g.bottleneck?.id);
    if (info) {
      const under = new Set<string>();
      const walkUnder = (id: string): void => {
        if (under.has(id)) return;
        under.add(id);
        for (const n of steps.get(id)?.needs ?? []) walkUnder(n);
      };
      walkUnder(info.step);
      let best: GraphStep | null = null;
      for (const id of under) {
        const s = steps.get(id);
        if (!s) continue;
        if (!best || TECH_COST[s.tech] > TECH_COST[best.tech] || (TECH_COST[s.tech] === TECH_COST[best.tech] && s.depth < best.depth)) best = s;
      }
      bottleneckStep = best?.id ?? null;
    }
  }

  // What each fact is to the puzzle.
  const classes: DeductionGraph['classes'] = {};
  const firstRoutes = new Set<Id>([...rivalInfo.flatMap((r) => r.routeFacts[0] ?? []), ...kept.flatMap((s) => s.leaves)]);
  const otherRoutes = new Set<Id>(rivalInfo.flatMap((r) => r.routeFacts.slice(1).flat()));
  const startIds = new Set(input.pool.starting.map((c) => c.id));
  for (const c of core) {
    classes[c.id] = startIds.has(c.id) ? 'given' : firstRoutes.has(c.id) ? 'route' : otherRoutes.has(c.id) ? 'overlap' : 'dead-end';
  }

  const keyR = rivalInfo.filter((r) => r.key && r.kind === 'who').map((r) => r.routes);
  const otherR = rivalInfo.filter((r) => !r.key).map((r) => r.routes);
  const b = g.band;
  const bands: Record<string, boolean> = {
    peak: g.floor === null ? peakCost <= g.cap : peakCost > g.floor && peakCost <= g.cap,
    keyRoutes: keyR.every((n) => n >= b.keyMin && n <= b.keyMax),
    otherRoutes: otherR.every((n) => n >= b.otherMin && n <= b.otherMax),
    critical: g.critical.length <= b.criticalMax,
    width: widthMin >= b.widthMin,
    load: load <= b.loadMax,
  };

  return {
    steps: kept,
    targets,
    rivals: rivalInfo,
    bottleneck: g.bottleneck?.id ?? null,
    bottleneckStep,
    lies: lies.map((l) => l.id),
    classes,
    stats: {
      peak,
      load,
      widthMin,
      widthMedian,
      critical: g.critical,
      backdoors: g.backdoors,
      tatham: g.tatham,
      unique: g.unique,
      uniqueUnknown: g.uniqueUnknown,
      dug: g.dug,
      bands,
    },
  };
}

export type { AcquaintanceEdge };
void edgeOf;
