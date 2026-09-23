/**
 * M9 — the deduction solver.
 *
 * A constraint solver over the grid the player fills: each suspect × each
 * half hour has a domain of places, and every rule in the notebook narrows
 * some of them. It is what the generator uses to accept a case, what par is
 * computed from, and what the engine may call to check a report or a
 * confrontation. Pure: no randomness, no case mutation.
 *
 * Constraints:
 *
 * - **one place at a time** is the domain itself;
 * - **travel**: consecutive half hours are never across the neighbourhood
 *   from each other (the map is given);
 * - every rule type of `Fact`: fixed and negative placement, absence, counts,
 *   together and apart, anchor-timed sightings once the anchor's time is held,
 *   descriptions ("one of these was there"), the conditional (anybody there
 *   knew the thing; this one did not);
 * - **exactly one suspect was at the scene at the crime's half hour**, which
 *   is what makes elimination work;
 * - the crime's half hour itself, narrowed by the coroner, by anybody seen
 *   alive, by anybody who heard it.
 *
 * **Self-accounts are soft.** A span of somebody's own account stands when
 * nothing contradicts it and either something hard puts them there for one of
 * its half hours (corroboration) or they are already known not to have been
 * at the scene for any of it. A span never stands on another person's say-so
 * of what they did not see: people lie about themselves, and only about
 * themselves.
 *
 * **Depth.** Each conclusion records the rules it rests on and how many
 * rounds of combining it took: a rule read straight off is depth 1; two rules
 * put together, 2; a conclusion that uses a depth-3 conclusion, 4; and so on.
 * Propagation commits the shallowest conclusions first, so the depth recorded
 * is the shallowest route this calculus has.
 *
 * **Hypothesis tests.** When propagation stalls, the solver may try each
 * value of an open cell at the crime's half hour ("if she was at the bar…"),
 * propagate, and strike the value if it ends in a contradiction. A
 * conclusion that needed one is marked.
 */

import type { Fact, Id, Tick } from '../types.js';
import { TICKS } from '../types.js';

export interface SolverRule {
  id: Id;
  facts: Fact[];
  /**
   * A confession: the facts hold only once this person's claim — the place,
   * at these half hours — is shown false. It is what an innocent gives up
   * when a lie is put to them with the facts that break it (spec §3). The
   * culprit has none.
   */
  when?: { personId: Id; place: Id; ticks: Tick[] };
}

export interface SolverProblem {
  suspects: Id[];
  places: Id[];
  blocks: Record<Id, number>;
  scene: Id;
  victimId: Id;
  /** A murder: a sighting of the victim alive bounds the crime's half hour. */
  murder: boolean;
  rules: SolverRule[];
  /** Somebody among the suspects was at the scene at the crime's half hour, alone. */
  exactlyOne: boolean;
  /** Allow hypothesis tests when propagation stalls. */
  probe: boolean;
  /** Stop as soon as these hold (skips work the caller does not want). */
  stopWhen?: (s: SolverState) => boolean;
}

/** Why a value was struck, or a half hour ruled out. */
export interface Why {
  depth: number;
  /** Rule indices into `problem.rules`. */
  rules: number[];
  hyp: boolean;
}

export interface SolverState {
  problem: SolverProblem;
  S: number;
  P: number;
  /** Place bitmask per suspect × tick. */
  dom: Uint16Array;
  /** Crime ticks still possible, as a bitmask. */
  tdom: number;
  /** Why value p was struck at (s, t): index (s * TICKS + t) * P + p. */
  why: (Why | undefined)[];
  whyT: (Why | undefined)[];
  contradiction: string | null;
  /** Premises of the contradiction, for a probe. */
  conflict: Why | null;
  rounds: number;
  probes: number;
  usedProbe: boolean;
  /** Account spans that stood, by rule index and span index. */
  stood: Set<string>;
}

interface Premise {
  rules: number[];
  whys: Why[];
}

interface Candidate {
  kind: 'cell' | 'tick' | 'fail';
  s: number;
  t: number;
  p: number;
  depth: number;
  premise: Premise;
  note?: string;
  /** From a self-account: committed only once nothing hard is left to derive. */
  soft?: 1 | 2;
}

const bit = (i: number): number => 1 << i;

function popcount(x: number): number {
  let n = 0;
  while (x) {
    x &= x - 1;
    n++;
  }
  return n;
}

function only(x: number): number {
  return 31 - Math.clz32(x);
}

function depthOf(prem: Premise): number {
  if (prem.whys.length === 0 && prem.rules.length <= 1) return 1;
  let d = prem.rules.length > 0 ? 1 : 0;
  for (const w of prem.whys) if (w.depth > d) d = w.depth;
  return d + 1;
}

function mergeWhy(prem: Premise, depth: number, hyp = false): Why {
  const set = new Set<number>(prem.rules);
  let h = hyp;
  for (const w of prem.whys) {
    for (const r of w.rules) set.add(r);
    if (w.hyp) h = true;
  }
  return { depth, rules: [...set].sort((a, b) => a - b), hyp: h };
}

/* ------------------------------------------------------- compiled problem */

interface Compiled {
  sIndex: Map<Id, number>;
  pIndex: Map<Id, number>;
  L: number;
  reach: Uint16Array; // per place: bitmask of places reachable next half hour
  direct: { r: number; s: number; t: number; keep?: number; strike?: number }[];
  tickDirect: { r: number; keep: number }[];
  anchorAt: Map<Id, { r: number; ticks: number }>;
  sightings: { r: number; s: number; p: number; a: Id }[];
  victimSightings: { r: number; a: Id }[];
  described: { r: number; t: number; p: number; matches: number[] }[];
  counts: { r: number; t: number; p: number; n: number }[];
  together: { r: number; a: number; b: number; ticks: number[] }[];
  apart: { r: number; a: number; b: number; ticks: number[] }[];
  knowledge: { r: number; a: Id; p: number; ticks: number[] }[];
  ignorance: { r: number; s: number; a: Id }[];
  spans: { r: number; k: number; s: number; p: number; ticks: number[]; with: number }[];
  confessions: { r: number; s: number; p: number; ticks: number[]; keep: { s: number; t: number; p: number }[] }[];
}

function compile(pr: SolverProblem): Compiled {
  const sIndex = new Map(pr.suspects.map((id, i) => [id, i]));
  const pIndex = new Map(pr.places.map((id, i) => [id, i]));
  const P = pr.places.length;
  const reach = new Uint16Array(P);
  for (let a = 0; a < P; a++) {
    let m = 0;
    for (let b = 0; b < P; b++) {
      const d = Math.abs((pr.blocks[pr.places[a] as Id] ?? 0) - (pr.blocks[pr.places[b] as Id] ?? 0));
      if (d <= 1) m |= bit(b);
    }
    reach[a] = m;
  }
  const c: Compiled = {
    sIndex,
    pIndex,
    L: pIndex.get(pr.scene) ?? 0,
    reach,
    direct: [],
    tickDirect: [],
    anchorAt: new Map(),
    sightings: [],
    victimSightings: [],
    described: [],
    counts: [],
    together: [],
    apart: [],
    knowledge: [],
    ignorance: [],
    spans: [],
    confessions: [],
  };
  const allTicks = (1 << TICKS) - 1;
  pr.rules.forEach((rule, r) => {
    if (rule.when) {
      const s = sIndex.get(rule.when.personId);
      const p = pIndex.get(rule.when.place);
      if (s === undefined || p === undefined) return;
      const keep: { s: number; t: number; p: number }[] = [];
      for (const f of rule.facts) {
        if (f.kind !== 'personAt') continue;
        const fs = sIndex.get(f.personId);
        const fp = pIndex.get(f.place);
        if (fs !== undefined && fp !== undefined) keep.push({ s: fs, t: f.tick, p: fp });
      }
      c.confessions.push({ r, s, p, ticks: rule.when.ticks.slice(), keep });
      return;
    }
    let k = 0;
    for (const f of rule.facts) {
      switch (f.kind) {
        case 'personAt': {
          const s = sIndex.get(f.personId);
          const p = pIndex.get(f.place);
          if (s !== undefined && p !== undefined) c.direct.push({ r, s, t: f.tick, keep: p });
          break;
        }
        case 'personNotAt': {
          const s = sIndex.get(f.personId);
          const p = pIndex.get(f.place);
          if (s !== undefined && p !== undefined) c.direct.push({ r, s, t: f.tick, strike: p });
          break;
        }
        case 'absentFrom': {
          const p = pIndex.get(f.place);
          if (p === undefined) break;
          for (const [id, s] of sIndex) {
            if (f.except.includes(id)) continue;
            for (const t of f.ticks) c.direct.push({ r, s, t, strike: p });
          }
          break;
        }
        case 'timeOfDeath': {
          const lo = f.ticks[0] as Tick;
          const hi = f.ticks[f.ticks.length - 1] as Tick;
          let m = 0;
          for (let t = lo; t <= hi; t++) m |= bit(t);
          c.tickDirect.push({ r, keep: m });
          break;
        }
        case 'victimAliveAt': {
          let m = 0;
          for (let t = f.tick + 1; t < TICKS; t++) m |= bit(t);
          c.tickDirect.push({ r, keep: m });
          break;
        }
        case 'victimDeadBy': {
          let m = 0;
          for (let t = 0; t <= f.tick; t++) m |= bit(t);
          c.tickDirect.push({ r, keep: m });
          break;
        }
        case 'anchorAt': {
          let m = 0;
          for (const t of f.ticks) m |= bit(t);
          if (!c.anchorAt.has(f.anchorId)) c.anchorAt.set(f.anchorId, { r, ticks: m & allTicks });
          break;
        }
        case 'personAtAnchor': {
          const p = pIndex.get(f.place);
          if (f.personId === pr.victimId) {
            if (pr.murder) c.victimSightings.push({ r, a: f.anchorId });
            break;
          }
          const s = sIndex.get(f.personId);
          if (s !== undefined && p !== undefined) c.sightings.push({ r, s, p, a: f.anchorId });
          break;
        }
        case 'describedAt': {
          const p = pIndex.get(f.place);
          if (p === undefined) break;
          const matches = f.description.matches
            .map((id) => sIndex.get(id))
            .filter((x): x is number => x !== undefined);
          c.described.push({ r, t: f.tick, p, matches });
          break;
        }
        case 'countAt': {
          const p = pIndex.get(f.place);
          if (p !== undefined) c.counts.push({ r, t: f.tick, p, n: f.count });
          break;
        }
        case 'together':
        case 'apart': {
          const a = sIndex.get(f.personIds[0]);
          const b = sIndex.get(f.personIds[1]);
          if (a === undefined || b === undefined) break;
          (f.kind === 'together' ? c.together : c.apart).push({ r, a, b, ticks: f.ticks.slice() });
          break;
        }
        case 'anchorKnowledge': {
          const p = pIndex.get(f.place);
          if (p !== undefined) c.knowledge.push({ r, a: f.anchorId, p, ticks: f.ticks.slice() });
          break;
        }
        case 'knows': {
          const s = sIndex.get(f.personId);
          if (s !== undefined && !f.knows) c.ignorance.push({ r, s, a: f.anchorId });
          break;
        }
        case 'claims': {
          const s = sIndex.get(f.personId);
          const p = pIndex.get(f.place);
          if (s === undefined || p === undefined) break;
          const w = f.with !== undefined ? (sIndex.get(f.with) ?? -1) : -1;
          c.spans.push({ r, k: k++, s, p, ticks: f.ticks.slice(), with: w });
          break;
        }
        default:
          break;
      }
    }
  });
  return c;
}

/* ------------------------------------------------------------------ state */

function newState(pr: SolverProblem): SolverState {
  const S = pr.suspects.length;
  const P = pr.places.length;
  const dom = new Uint16Array(S * TICKS);
  dom.fill((1 << P) - 1);
  return {
    problem: pr,
    S,
    P,
    dom,
    tdom: (1 << TICKS) - 1,
    why: new Array(S * TICKS * P),
    whyT: new Array(TICKS),
    contradiction: null,
    conflict: null,
    rounds: 0,
    probes: 0,
    usedProbe: false,
    stood: new Set(),
  };
}

function cloneState(st: SolverState): SolverState {
  return {
    ...st,
    dom: st.dom.slice(),
    why: st.why.slice(),
    whyT: st.whyT.slice(),
    stood: new Set(st.stood),
  };
}

/** The premises that put (s, t) at its one remaining place. */
function placedWhy(st: SolverState, s: number, t: number): Why[] {
  const out: Why[] = [];
  const base = (s * TICKS + t) * st.P;
  const d = st.dom[s * TICKS + t] as number;
  for (let p = 0; p < st.P; p++) {
    if (d & bit(p)) continue;
    const w = st.why[base + p];
    if (w) out.push(w);
  }
  return out;
}

function struck(st: SolverState, s: number, t: number, p: number): Why | undefined {
  return st.why[(s * TICKS + t) * st.P + p];
}

function tickWhys(st: SolverState): Why[] {
  const out: Why[] = [];
  for (let t = 0; t < TICKS; t++) {
    if (st.tdom & bit(t)) continue;
    const w = st.whyT[t];
    if (w) out.push(w);
  }
  return out;
}

/* ------------------------------------------------------------- propagate */

function candidates(st: SolverState, c: Compiled): Candidate[] {
  const pr = st.problem;
  const out: Candidate[] = [];
  const { S, P, dom } = st;
  const cell = (s: number, t: number): number => dom[s * TICKS + t] as number;
  const strikeC = (s: number, t: number, p: number, premise: Premise): void => {
    if (!(cell(s, t) & bit(p))) return;
    out.push({ kind: 'cell', s, t, p, depth: depthOf(premise), premise });
  };
  const keepC = (s: number, t: number, p: number, premise: Premise): void => {
    const d = cell(s, t);
    if (!(d & bit(p))) {
      out.push({ kind: 'fail', s, t, p, depth: depthOf(premise), premise, note: 'placed where it cannot be' });
      return;
    }
    for (let q = 0; q < P; q++) if (q !== p && d & bit(q)) strikeC(s, t, q, premise);
  };
  const fail = (premise: Premise, note: string): void => {
    out.push({ kind: 'fail', s: -1, t: -1, p: -1, depth: depthOf(premise), premise, note });
  };

  {
    for (const d of c.direct) {
      const premise = { rules: [d.r], whys: [] };
      if (d.keep !== undefined) keepC(d.s, d.t, d.keep, premise);
      else if (d.strike !== undefined) strikeC(d.s, d.t, d.strike, premise);
    }
    for (const d of c.tickDirect) {
      for (let t = 0; t < TICKS; t++) {
        if (st.tdom & bit(t) && !(d.keep & bit(t))) {
          out.push({ kind: 'tick', s: -1, t, p: -1, depth: 1, premise: { rules: [d.r], whys: [] } });
        }
      }
    }
    for (const k of c.knowledge) {
      for (const ig of c.ignorance) {
        if (ig.a !== k.a) continue;
        const premise = { rules: [k.r, ig.r], whys: [] };
        for (const t of k.ticks) strikeC(ig.s, t, k.p, premise);
      }
    }
    for (const v of c.victimSightings) {
      const at = c.anchorAt.get(v.a);
      if (!at || at.ticks === 0) continue;
      const earliest = only(at.ticks & -at.ticks);
      const premise = { rules: [v.r, at.r], whys: [] };
      for (let t = 0; t <= earliest; t++) {
        if (st.tdom & bit(t)) out.push({ kind: 'tick', s: -1, t, p: -1, depth: depthOf(premise), premise });
      }
    }
  }

  // Anchor-timed sightings.
  for (const sg of c.sightings) {
    const at = c.anchorAt.get(sg.a);
    if (!at) continue;
    let open = 0;
    const whys: Why[] = [];
    for (let t = 0; t < TICKS; t++) {
      if (!(at.ticks & bit(t))) continue;
      if (cell(sg.s, t) & bit(sg.p)) open |= bit(t);
      else {
        const w = struck(st, sg.s, t, sg.p);
        if (w) whys.push(w);
      }
    }
    const premise = { rules: [sg.r, at.r], whys };
    if (open === 0) fail(premise, 'an anchored sighting fits no half hour');
    else if (popcount(open) === 1) keepC(sg.s, only(open), sg.p, premise);
  }

  // Descriptions: one of these was there.
  for (const d of c.described) {
    const open: number[] = [];
    const whys: Why[] = [];
    for (const s of d.matches) {
      if (cell(s, d.t) & bit(d.p)) open.push(s);
      else {
        const w = struck(st, s, d.t, d.p);
        if (w) whys.push(w);
      }
    }
    const premise = { rules: [d.r], whys };
    if (open.length === 0) fail(premise, 'a description fits nobody who could have been there');
    else if (open.length === 1) keepC(open[0] as number, d.t, d.p, premise);
  }

  // Counts.
  for (const k of c.counts) {
    const forced: number[] = [];
    const possible: number[] = [];
    for (let s = 0; s < S; s++) {
      const d = cell(s, k.t);
      if (!(d & bit(k.p))) continue;
      possible.push(s);
      if (d === bit(k.p)) forced.push(s);
    }
    if (possible.length < k.n || forced.length > k.n) {
      fail({ rules: [k.r], whys: [] }, 'a count does not add up');
      continue;
    }
    if (forced.length === k.n && possible.length > k.n) {
      const whys = forced.flatMap((s) => placedWhy(st, s, k.t));
      for (const s of possible) if (!forced.includes(s)) strikeC(s, k.t, k.p, { rules: [k.r], whys });
    } else if (possible.length === k.n && forced.length < k.n) {
      const whys: Why[] = [];
      for (let s = 0; s < S; s++) {
        if (possible.includes(s)) continue;
        const w = struck(st, s, k.t, k.p);
        if (w) whys.push(w);
      }
      for (const s of possible) keepC(s, k.t, k.p, { rules: [k.r], whys });
    }
  }

  // Together and apart.
  for (const tg of c.together) {
    for (const t of tg.ticks) {
      for (let p = 0; p < P; p++) {
        const inA = (cell(tg.a, t) & bit(p)) !== 0;
        const inB = (cell(tg.b, t) & bit(p)) !== 0;
        if (inA && !inB) strikeC(tg.a, t, p, { rules: [tg.r], whys: [struck(st, tg.b, t, p)].filter((w): w is Why => !!w) });
        if (inB && !inA) strikeC(tg.b, t, p, { rules: [tg.r], whys: [struck(st, tg.a, t, p)].filter((w): w is Why => !!w) });
      }
    }
  }
  for (const ap of c.apart) {
    for (const t of ap.ticks) {
      const da = cell(ap.a, t);
      const db = cell(ap.b, t);
      if (popcount(da) === 1 && db & da) strikeC(ap.b, t, only(da), { rules: [ap.r], whys: placedWhy(st, ap.a, t) });
      if (popcount(db) === 1 && da & db) strikeC(ap.a, t, only(db), { rules: [ap.r], whys: placedWhy(st, ap.b, t) });
    }
  }

  // Travel.
  for (let s = 0; s < S; s++) {
    for (let t = 0; t < TICKS; t++) {
      const d = cell(s, t);
      for (let p = 0; p < P; p++) {
        if (!(d & bit(p))) continue;
        for (const u of [t - 1, t + 1]) {
          if (u < 0 || u >= TICKS) continue;
          const next = cell(s, u);
          if (next & (c.reach[p] as number)) continue;
          const whys: Why[] = [];
          for (let q = 0; q < P; q++) {
            if (!((c.reach[p] as number) & bit(q))) continue;
            const w = struck(st, s, u, q);
            if (w) whys.push(w);
          }
          strikeC(s, t, p, { rules: [], whys });
        }
      }
    }
  }

  // Exactly one suspect at the scene at the crime's half hour.
  if (pr.exactlyOne) {
    const L = c.L;
    for (let t = 0; t < TICKS; t++) {
      if (!(st.tdom & bit(t))) continue;
      let any = false;
      for (let s = 0; s < S; s++) if (cell(s, t) & bit(L)) any = true;
      if (!any) {
        const whys: Why[] = [];
        for (let s = 0; s < S; s++) {
          const w = struck(st, s, t, L);
          if (w) whys.push(w);
        }
        out.push({ kind: 'tick', s: -1, t, p: -1, depth: depthOf({ rules: [], whys }), premise: { rules: [], whys } });
      }
    }
    if (popcount(st.tdom) === 1) {
      const t = only(st.tdom);
      const tw = tickWhys(st);
      const open: number[] = [];
      for (let s = 0; s < S; s++) if (cell(s, t) & bit(L)) open.push(s);
      if (open.length === 1) {
        const whys = [...tw];
        for (let s = 0; s < S; s++) {
          if (s === open[0]) continue;
          const w = struck(st, s, t, L);
          if (w) whys.push(w);
        }
        keepC(open[0] as number, t, L, { rules: [], whys });
      }
      for (const k of open) {
        if (cell(k, t) !== bit(L)) continue;
        for (const s of open) if (s !== k) strikeC(s, t, L, { rules: [], whys: [...tw, ...placedWhy(st, k, t)] });
      }
    }
  }

  // Confessions: once the claim is shown false, the truth comes out.
  for (const cf of c.confessions) {
    let premise: Premise | null = null;
    for (const t of cf.ticks) {
      const w = struck(st, cf.s, t, cf.p);
      if (w) {
        premise = { rules: [cf.r], whys: [w] };
        break;
      }
    }
    if (!premise) continue;
    for (const k of cf.keep) keepC(k.s, k.t, k.p, premise);
  }

  // Self-accounts: a span stands when uncontradicted and corroborated, or
  // when the person is already known to have been nowhere near the scene.
  for (const sp of c.spans) {
    const key = `${sp.r}:${sp.k}`;
    if (st.stood.has(key)) continue;
    let contradicted = false;
    for (const t of sp.ticks) {
      if (!(cell(sp.s, t) & bit(sp.p))) contradicted = true;
      if (sp.with >= 0 && !(cell(sp.with, t) & bit(sp.p))) contradicted = true;
    }
    if (contradicted) continue;
    let premise: Premise | null = null;
    for (const t of sp.ticks) {
      if (cell(sp.s, t) === bit(sp.p)) {
        premise = { rules: [sp.r], whys: placedWhy(st, sp.s, t) };
        break;
      }
    }
    const corroborated = premise !== null;
    // A span of the crime's half hour stands, too, for somebody already
    // shown clear of the scene then: the crime column is where people say
    // they were, once nothing says otherwise. Never a claim of company:
    // being clear of the scene says nothing about who you were with.
    if (!premise && sp.p !== c.L && sp.with < 0 && sp.ticks.some((t) => st.tdom & bit(t))) {
      const whys: Why[] = [];
      let clear = true;
      for (const t of sp.ticks) {
        if (!(st.tdom & bit(t))) continue;
        if (cell(sp.s, t) & bit(c.L)) {
          clear = false;
          break;
        }
        const w = struck(st, sp.s, t, c.L);
        if (w) whys.push(w);
      }
      for (let t = 0; t < TICKS; t++) {
        if (st.tdom & bit(t)) continue;
        const w = st.whyT[t];
        if (w) whys.push(w);
      }
      if (clear) premise = { rules: [sp.r], whys };
    }
    if (!premise) continue;
    let any = false;
    const before = out.length;
    for (const t of sp.ticks) {
      for (const who of sp.with >= 0 ? [sp.s, sp.with] : [sp.s]) {
        const d = cell(who, t);
        if (d === bit(sp.p)) continue;
        any = true;
        keepC(who, t, sp.p, premise);
      }
    }
    for (let i = before; i < out.length; i++) (out[i] as Candidate).soft = corroborated ? 1 : 2;
    if (!any) st.stood.add(key);
  }

  return out;
}

function commit(st: SolverState, all: Candidate[]): boolean {
  if (all.length === 0) return false;
  // Accounts are defaults: every hard conclusion first, so that a lie the
  // rules break is broken before anybody's word is taken for it.
  const hard = all.filter((x) => !x.soft);
  const vouched = all.filter((x) => x.soft === 1);
  const cand = hard.length > 0 ? hard : vouched.length > 0 ? vouched : all;
  let min = Infinity;
  for (const x of cand) if (x.depth < min) min = x.depth;
  let progressed = false;
  for (const x of cand) {
    if (x.depth !== min) continue;
    if (x.kind === 'fail') {
      if (!st.contradiction) {
        st.contradiction = x.note ?? 'contradiction';
        st.conflict = mergeWhy(x.premise, x.depth);
      }
      continue;
    }
    if (x.kind === 'tick') {
      if (!(st.tdom & bit(x.t))) continue;
      st.tdom &= ~bit(x.t);
      st.whyT[x.t] = mergeWhy(x.premise, x.depth);
      progressed = true;
      if (st.tdom === 0 && !st.contradiction) {
        st.contradiction = 'no half hour is left for the crime';
        st.conflict = mergeWhy({ rules: [], whys: tickWhys(st) }, x.depth);
      }
      continue;
    }
    const i = x.s * TICKS + x.t;
    const d = st.dom[i] as number;
    if (!(d & bit(x.p))) continue;
    st.dom[i] = d & ~bit(x.p);
    st.why[i * st.P + x.p] = mergeWhy(x.premise, x.depth);
    progressed = true;
    if (st.dom[i] === 0 && !st.contradiction) {
      st.contradiction = 'somebody was nowhere';
      st.conflict = mergeWhy({ rules: [], whys: placedWhy(st, x.s, x.t) }, x.depth);
    }
  }
  return progressed || st.contradiction !== null;
}

function propagate(st: SolverState, c: Compiled): void {

  for (let guard = 0; guard < 400; guard++) {
    const cand = candidates(st, c);

    st.rounds++;
    if (!commit(st, cand)) return;
    if (st.contradiction) return;
    if (st.problem.stopWhen?.(st)) return;
  }
}

/** Hypothesis tests on the crime's half hours. Returns whether anything was struck. */
function probeRound(st: SolverState, c: Compiled): boolean {
  let struckAny = false;
  const ticks: number[] = [];
  for (let t = 0; t < TICKS; t++) if (st.tdom & bit(t)) ticks.push(t);
  if (ticks.length > 4) return false;
  for (const t of ticks) {
    for (let s = 0; s < st.S; s++) {
      const d = st.dom[s * TICKS + t] as number;
      if (popcount(d) <= 1) continue;
      for (let p = 0; p < st.P; p++) {
        if (!((st.dom[s * TICKS + t] as number) & bit(p))) continue;
        const trial = cloneState(st);
        trial.problem = { ...st.problem, stopWhen: undefined };
        const i = s * TICKS + t;
        const hyp: Why = { depth: 1, rules: [], hyp: true };
        for (let q = 0; q < st.P; q++) {
          if (q !== p && (trial.dom[i] as number) & bit(q)) {
            trial.dom[i] = (trial.dom[i] as number) & ~bit(q);
            trial.why[i * st.P + q] = hyp;
          }
        }
        st.probes++;
        propagate(trial, c);
        if (!trial.contradiction) continue;
        const conflict = trial.conflict ?? { depth: 1, rules: [], hyp: true };
        // Everything the trial leaned on, short of the assumption itself.
        st.dom[i] = (st.dom[i] as number) & ~bit(p);
        st.why[i * st.P + p] = { depth: conflict.depth + 1, rules: conflict.rules.slice(), hyp: true };
        st.usedProbe = true;
        struckAny = true;
        if (st.dom[i] === 0) {
          st.contradiction = 'every hypothesis fails';
          return true;
        }
      }
    }
  }
  return struckAny;
}

/* ------------------------------------------------------------------ API */

export interface Solved {
  state: SolverState;
  compiled: Compiled;
}

export function solve(problem: SolverProblem): Solved {
  const c = compile(problem);
  const st = newState(problem);
  propagate(st, c);
  if (problem.probe) {
    for (let k = 0; k < 6 && !st.contradiction; k++) {
      if (problem.stopWhen?.(st)) break;
      if (!probeRound(st, c)) break;
      propagate(st, c);
    }
  }
  return { state: st, compiled: c };
}

/** Places still possible for a suspect at a tick. */
export function placesAt(st: SolverState, personId: Id, t: Tick): Id[] {
  const s = st.problem.suspects.indexOf(personId);
  if (s < 0) return st.problem.places.slice();
  const d = st.dom[s * TICKS + t] as number;
  return st.problem.places.filter((_, p) => d & bit(p));
}

export function crimeTicks(st: SolverState): Tick[] {
  const out: Tick[] = [];
  for (let t = 0; t < TICKS; t++) if (st.tdom & bit(t)) out.push(t);
  return out;
}

/** Why `place` is ruled out for this person at this half hour, if it is. */
export function whyNot(st: SolverState, personId: Id, t: Tick, place: Id): Why | null {
  const s = st.problem.suspects.indexOf(personId);
  const p = st.problem.places.indexOf(place);
  if (s < 0 || p < 0) return null;
  if ((st.dom[s * TICKS + t] as number) & bit(p)) return null;
  return struck(st, s, t, p) ?? { depth: 1, rules: [], hyp: false };
}

/** Why this person is placed at their one remaining place at this half hour, if they are. */
export function whyPlaced(st: SolverState, personId: Id, t: Tick): Why | null {
  const s = st.problem.suspects.indexOf(personId);
  if (s < 0) return null;
  if (popcount(st.dom[s * TICKS + t] as number) !== 1) return null;
  const whys = placedWhy(st, s, t);
  if (whys.length === 0) return { depth: 0, rules: [], hyp: false };
  return mergeWhy({ rules: [], whys }, Math.max(...whys.map((w) => w.depth)));
}

/** Why the crime's half hour is the one left, if only one is. */
export function whyTick(st: SolverState): Why | null {
  if (popcount(st.tdom) !== 1) return null;
  const whys = tickWhys(st);
  if (whys.length === 0) return { depth: 0, rules: [], hyp: false };
  return mergeWhy({ rules: [], whys }, Math.max(...whys.map((w) => w.depth)));
}

/**
 * The culprit, when only one suspect can have been at the scene at any half
 * hour still open for the crime. With why: every strike of the scene for
 * everybody else at those half hours, and the half hours ruled out.
 */
export function culpritOf(st: SolverState): { id: Id; why: Why } | null {
  const L = st.problem.places.indexOf(st.problem.scene);
  let who = -1;
  const whys: Why[] = [];
  for (let t = 0; t < TICKS; t++) {
    if (!(st.tdom & bit(t))) continue;
    for (let s = 0; s < st.S; s++) {
      if ((st.dom[s * TICKS + t] as number) & bit(L)) {
        if (who >= 0 && who !== s) return null;
        who = s;
      } else {
        const w = struck(st, s, t, L);
        if (w) whys.push(w);
      }
    }
  }
  if (who < 0) return null;
  whys.push(...tickWhys(st));
  const depth = whys.length === 0 ? 1 : Math.max(...whys.map((w) => w.depth)) + 1;
  return { id: st.problem.suspects[who] as Id, why: mergeWhy({ rules: [], whys }, depth) };
}

/** Rule ids for a why. */
export function rulesOf(st: SolverState, w: Why): Id[] {
  return w.rules.map((r) => st.problem.rules[r]?.id as Id);
}
