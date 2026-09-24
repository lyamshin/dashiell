/**
 * v2 — the complete uniqueness check (docs/34 §3, step 2).
 *
 * The human-style solver rates a case; it never declares it unique. This does,
 * with exactly the rules the player is taught and nothing else:
 *
 * - one place at a time, and travel (the map is given);
 * - what anybody says about somebody else is true;
 * - a span of somebody's own account is wholly true or wholly false;
 * - exactly one suspect was at the scene when it happened;
 * - every piece in the notebook: sightings, strikes, absences, counts,
 *   descriptions, anchors (timed only where the anchor's time is held),
 *   together and apart, the conditional, the coroner, the victim seen alive;
 * - a confession, where the case lets the lie be broken, is true.
 *
 * A rival is an answer other than the true one to a target the report asks:
 * somebody else at the scene when it happened, or another half hour. The
 * check asks whether any world satisfies every fact and the rival. It is a
 * search with propagation, so it is complete; it has a node budget, and says
 * `unknown` if it runs out rather than guess.
 */

import { TICKS, type Fact, type Id, type Tick } from '../types.js';

const NT: number = TICKS;
const bit = (i: number): number => 1 << i;

function popcount(x: number): number {
  let n = 0;
  while (x) {
    x &= x - 1;
    n++;
  }
  return n;
}
const only = (x: number): number => 31 - Math.clz32(x);

export interface WorldProblem {
  suspects: Id[];
  places: Id[];
  blocks: Record<Id, number>;
  scene: Id;
  murder: boolean;
  /** Every fact held: the givens, the findable set, the confessions the case lets out. */
  facts: Fact[];
}

export type Rival = { kind: 'who'; personId: Id } | { kind: 'when'; tick: Tick };

export type WorldAnswer =
  | { ok: true; world: Id[][]; tick: Tick }
  | { ok: false; unknown?: boolean; nodes: number };

interface Span {
  s: number;
  p: number;
  ticks: number[];
  w: number;
}

interface Compiled {
  S: number;
  P: number;
  L: number;
  reach: number[];
  base: Uint16Array;
  tdom: number;
  counts: { t: number; p: number; n: number }[];
  described: { t: number; p: number; matches: number[] }[];
  sightings: { s: number; p: number; ticks: number }[];
  together: { a: number; b: number; t: number }[];
  apart: { a: number; b: number; t: number }[];
  spans: Span[];
}

function compile(pr: WorldProblem): Compiled | null {
  const sIndex = new Map(pr.suspects.map((id, i) => [id, i]));
  const pIndex = new Map(pr.places.map((id, i) => [id, i]));
  const S = pr.suspects.length;
  const P = pr.places.length;
  const reach: number[] = [];
  for (let a = 0; a < P; a++) {
    let m = 0;
    for (let b = 0; b < P; b++) {
      const d = Math.abs((pr.blocks[pr.places[a] as Id] ?? 0) - (pr.blocks[pr.places[b] as Id] ?? 0));
      if (d <= 1) m |= bit(b);
    }
    reach.push(m);
  }
  const base = new Uint16Array(S * NT).fill((1 << P) - 1);
  let tdom = (1 << NT) - 1;
  const c: Compiled = {
    S,
    P,
    L: pIndex.get(pr.scene) ?? 0,
    reach,
    base,
    tdom,
    counts: [],
    described: [],
    sightings: [],
    together: [],
    apart: [],
    spans: [],
  };
  const anchorTicks = new Map<Id, number>();
  for (const f of pr.facts) {
    if (f.kind !== 'anchorAt') continue;
    let m = 0;
    for (const t of f.ticks) m |= bit(t);
    anchorTicks.set(f.anchorId, (anchorTicks.get(f.anchorId) ?? (1 << NT) - 1) & m);
  }
  const ignorance = new Map<Id, number[]>();
  for (const f of pr.facts) if (f.kind === 'knows' && !f.knows) {
    const s = sIndex.get(f.personId);
    if (s !== undefined) ignorance.set(f.anchorId, [...(ignorance.get(f.anchorId) ?? []), s]);
  }
  for (const f of pr.facts) {
    switch (f.kind) {
      case 'personAt': {
        const s = sIndex.get(f.personId);
        const p = pIndex.get(f.place);
        if (s === undefined || p === undefined) break;
        base[s * NT + f.tick] = (base[s * NT + f.tick] as number) & bit(p);
        break;
      }
      case 'personNotAt': {
        const s = sIndex.get(f.personId);
        const p = pIndex.get(f.place);
        if (s === undefined || p === undefined) break;
        base[s * NT + f.tick] = (base[s * NT + f.tick] as number) & ~bit(p);
        break;
      }
      case 'absentFrom': {
        const p = pIndex.get(f.place);
        if (p === undefined) break;
        for (const [id, s] of sIndex) {
          if (f.except.includes(id)) continue;
          for (const t of f.ticks) base[s * NT + t] = (base[s * NT + t] as number) & ~bit(p);
        }
        break;
      }
      case 'timeOfDeath': {
        let m = 0;
        for (let t = f.ticks[0] as number; t <= (f.ticks[f.ticks.length - 1] as number); t++) m |= bit(t);
        tdom &= m;
        break;
      }
      case 'victimAliveAt': {
        let m = 0;
        for (let t = f.tick + 1; t < NT; t++) m |= bit(t);
        tdom &= m;
        break;
      }
      case 'victimDeadBy': {
        let m = 0;
        for (let t = 0; t <= f.tick; t++) m |= bit(t);
        tdom &= m;
        break;
      }
      case 'personAtAnchor': {
        const p = pIndex.get(f.place);
        const ticks = anchorTicks.get(f.anchorId) ?? (1 << NT) - 1;
        if (!pr.suspects.includes(f.personId)) {
          // The victim seen alive when the anchor happened: alive after its first time.
          if (pr.murder && anchorTicks.has(f.anchorId) && ticks !== 0) {
            const earliest = only(ticks & -ticks);
            let m = 0;
            for (let t = earliest + 1; t < NT; t++) m |= bit(t);
            tdom &= m;
          }
          break;
        }
        const s = sIndex.get(f.personId);
        if (s === undefined || p === undefined) break;
        c.sightings.push({ s, p, ticks });
        break;
      }
      case 'describedAt': {
        const p = pIndex.get(f.place);
        if (p === undefined) break;
        const matches = f.description.matches.map((id) => sIndex.get(id)).filter((x): x is number => x !== undefined);
        c.described.push({ t: f.tick, p, matches });
        break;
      }
      case 'countAt': {
        const p = pIndex.get(f.place);
        if (p !== undefined) c.counts.push({ t: f.tick, p, n: f.count });
        break;
      }
      case 'together':
      case 'apart': {
        const a = sIndex.get(f.personIds[0]);
        const b = sIndex.get(f.personIds[1]);
        if (a === undefined || b === undefined) break;
        for (const t of f.ticks) (f.kind === 'together' ? c.together : c.apart).push({ a, b, t });
        break;
      }
      case 'anchorKnowledge': {
        const p = pIndex.get(f.place);
        if (p === undefined) break;
        for (const s of ignorance.get(f.anchorId) ?? []) {
          for (const t of f.ticks) base[s * NT + t] = (base[s * NT + t] as number) & ~bit(p);
        }
        break;
      }
      case 'claims': {
        const s = sIndex.get(f.personId);
        const p = pIndex.get(f.place);
        if (s === undefined || p === undefined) break;
        const w = f.with !== undefined ? (sIndex.get(f.with) ?? -1) : -1;
        c.spans.push({ s, p, ticks: f.ticks.slice(), w });
        break;
      }
      default:
        break;
    }
  }
  c.tdom = tdom;
  return c;
}

/** Propagate to a fixpoint. Returns false on a contradiction. */
function propagate(c: Compiled, dom: Uint16Array, tick: number): boolean {
  const { S, P, L, reach } = c;
  for (let guard = 0; guard < 200; guard++) {
    let changed = false;
    const narrow = (i: number, mask: number): boolean => {
      const d = dom[i] as number;
      const n = d & mask;
      if (n === d) return true;
      if (n === 0) return false;
      dom[i] = n;
      changed = true;
      return true;
    };
    // Travel.
    for (let s = 0; s < S; s++) {
      for (let t = 0; t < NT; t++) {
        let ok = (1 << P) - 1;
        for (const u of [t - 1, t + 1]) {
          if (u < 0 || u >= NT) continue;
          const d = dom[s * NT + u] as number;
          let m = 0;
          for (let q = 0; q < P; q++) if (d & bit(q)) m |= reach[q] as number;
          ok &= m;
        }
        if (!narrow(s * NT + t, ok)) return false;
      }
    }
    // Exactly one at the scene when it happened.
    {
      const possible: number[] = [];
      const forced: number[] = [];
      for (let s = 0; s < S; s++) {
        const d = dom[s * NT + tick] as number;
        if (d & bit(L)) possible.push(s);
        if (d === bit(L)) forced.push(s);
      }
      if (possible.length === 0 || forced.length > 1) return false;
      if (possible.length === 1 && !narrow((possible[0] as number) * NT + tick, bit(L))) return false;
      if (forced.length === 1) {
        for (const s of possible) if (s !== forced[0] && !narrow(s * NT + tick, ~bit(L))) return false;
      }
    }
    for (const k of c.counts) {
      const possible: number[] = [];
      const forced: number[] = [];
      for (let s = 0; s < S; s++) {
        const d = dom[s * NT + k.t] as number;
        if (d & bit(k.p)) possible.push(s);
        if (d === bit(k.p)) forced.push(s);
      }
      if (possible.length < k.n || forced.length > k.n) return false;
      if (forced.length === k.n) {
        for (const s of possible) if (!forced.includes(s) && !narrow(s * NT + k.t, ~bit(k.p))) return false;
      } else if (possible.length === k.n) {
        for (const s of possible) if (!narrow(s * NT + k.t, bit(k.p))) return false;
      }
    }
    for (const d of c.described) {
      const open = d.matches.filter((s) => (dom[s * NT + d.t] as number) & bit(d.p));
      if (open.length === 0) return false;
      if (open.length === 1 && !narrow((open[0] as number) * NT + d.t, bit(d.p))) return false;
    }
    for (const g of c.sightings) {
      let open = 0;
      for (let t = 0; t < NT; t++) if (g.ticks & bit(t) && (dom[g.s * NT + t] as number) & bit(g.p)) open |= bit(t);
      if (open === 0) return false;
      if (popcount(open) === 1 && !narrow(g.s * NT + only(open), bit(g.p))) return false;
    }
    for (const g of c.together) {
      const m = (dom[g.a * NT + g.t] as number) & (dom[g.b * NT + g.t] as number);
      if (!narrow(g.a * NT + g.t, m) || !narrow(g.b * NT + g.t, m)) return false;
    }
    for (const g of c.apart) {
      const da = dom[g.a * NT + g.t] as number;
      const db = dom[g.b * NT + g.t] as number;
      if (popcount(da) === 1 && !narrow(g.b * NT + g.t, ~da)) return false;
      if (popcount(db) === 1 && !narrow(g.a * NT + g.t, ~db)) return false;
    }
    // A span is wholly true or wholly false.
    for (const sp of c.spans) {
      let anyOut = false;
      let anyIn = false;
      for (const t of sp.ticks) {
        const d = dom[sp.s * NT + t] as number;
        if (!(d & bit(sp.p))) anyOut = true;
        if (d === bit(sp.p)) anyIn = true;
        if (sp.w >= 0 && !((dom[sp.w * NT + t] as number) & bit(sp.p))) anyOut = true;
      }
      if (anyIn && anyOut) return false;
      if (anyIn) {
        for (const t of sp.ticks) {
          if (!narrow(sp.s * NT + t, bit(sp.p))) return false;
          if (sp.w >= 0 && !narrow(sp.w * NT + t, bit(sp.p))) return false;
        }
      } else if (anyOut) {
        for (const t of sp.ticks) if (!narrow(sp.s * NT + t, ~bit(sp.p))) return false;
      }
    }
    if (!changed) return true;
  }
  return true;
}

/**
 * Is there a world, under the taught rules, where the rival holds? `ok: true`
 * returns one (the rival is not broken); `ok: false` means there is none, or
 * with `unknown` that the budget ran out first.
 */
export function rivalWorld(pr: WorldProblem, rival: Rival, budget = 20000): WorldAnswer {
  const c = compile(pr);
  if (!c) return { ok: false, nodes: 0 };
  let nodes = 0;
  const ticks: number[] = [];
  for (let t = 0; t < NT; t++) if (c.tdom & bit(t)) ticks.push(t);
  const choices = rival.kind === 'when' ? (ticks.includes(rival.tick) ? [rival.tick] : []) : ticks;
  const search = (dom: Uint16Array, tick: number): Uint16Array | null => {
    nodes++;
    if (nodes > budget) return null;
    if (!propagate(c, dom, tick)) return null;
    // The cell with the fewest places left, nearest the crime's half hour.
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < dom.length; i++) {
      const n = popcount(dom[i] as number);
      if (n <= 1) continue;
      const score = n * 100 + Math.abs((i % NT) - tick);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) return dom;
    const d = dom[best] as number;
    for (let p = 0; p < c.P; p++) {
      if (!(d & bit(p))) continue;
      const next = dom.slice();
      next[best] = bit(p);
      const found = search(next, tick);
      if (found) return found;
      if (nodes > budget) return null;
    }
    return null;
  };
  for (const tick of choices) {
    const dom = c.base.slice();
    if (rival.kind === 'who') {
      const s = pr.suspects.indexOf(rival.personId);
      if (s < 0) continue;
      dom[s * NT + tick] = (dom[s * NT + tick] as number) & bit(c.L);
      if (dom[s * NT + tick] === 0) continue;
    }
    const world = search(dom, tick);
    if (world) {
      return {
        ok: true,
        tick,
        world: pr.suspects.map((_, s) => Array.from({ length: NT }, (_, t) => pr.places[only(world[s * NT + t] as number)] as Id)),
      };
    }
    if (nodes > budget) return { ok: false, unknown: true, nodes };
  }
  return { ok: false, nodes };
}
