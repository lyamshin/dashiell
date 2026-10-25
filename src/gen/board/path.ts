import type { BoardCase, Hour, PersonId, PlaceId, Question, TierIndex } from './types.js';
import { key, questionsOf, solve, type Solved, type Step } from './solver.js';
import { TIERS, techniquesUpTo, type Technique } from './tiers.js';
import { closure, GIVENS, pointerIndex, reasonFor } from './pointers.js';

/**
 * docs/42 §2: par, the designed path, rivals and their routes, the Tatham
 * rating, the suggested order, and the interaction check.
 */

export interface PathStep {
  q: string;
  label: string;
  at: PlaceId;
  /** What the step adds: the solver's new derivations. */
  gives: string[];
  /** The earlier steps it joins with. */
  connects: string[];
  techniques: Technique[];
  /** Rivals this step finishes clearing. */
  removes: PersonId[];
  /** 4a.2: why a detective asks this now, naming the earlier step (or the office) that points at it. */
  why: string;
  /** The earlier step that points at it, or `givens`. */
  pointedBy: string;
}

export interface Rival {
  id: PersonId;
  routes: string[][];
}

export interface Analysis {
  /** False when even every question at the tier's techniques can't finish. */
  solvable: boolean;
  par: number;
  walks: number;
  path: PathStep[];
  /** Murder: the motive search, asked on top of par. */
  motive?: string;
  budget: number;
  rivals: Rival[];
  /** The lowest tier whose techniques finish the case (Tatham). */
  rating: TierIndex | null;
  suggested: { q: string; label: string; why: string }[];
  interaction: { ok: boolean; loners: string[]; settles: string[] };
  full: Solved;
}

export interface Shortcut {
  /** Two or more liars refuse, so "name whoever refuses" names nobody. */
  fails: boolean;
  /** The fewest questions for the shortcut (a lower bound when `capped`). */
  cost: number | null;
  /** Par minus the shortcut's cost: above zero, the shortcut beats par. */
  gain: number | null;
  capped: boolean;
}

/**
 * Decided 2026-09-28: the refusal shortcut. Catch every liar, put it to each, and name whoever
 * refuses. It must never beat par. `maxK` bounds the search; past it the cost is reported as a
 * bound. Motive searches aren't counted, as in par.
 */
export function refusalShortcut(c: BoardCase, par: number, maxK = par + 2): Shortcut {
  const T = techniquesUpTo(c.tier);
  const motive = motiveFind(c);
  const pool = questionsOf(c)
    .map((q) => q.id)
    .filter((id) => id !== motive);
  const holdouts = new Set(c.lies.filter((l) => c.confrontations.find((k) => k.person === l.person && k.hour === l.hour)?.response !== 'admit').map((l) => l.person));
  if (holdouts.size !== 1) return { fails: true, cost: null, gain: null, capped: false };
  const goal = (held: string[]) => {
    const s = solve(c, closure(c, held), { techniques: T, tell: true });
    return s.done && s.who === c.crime.culprit;
  };
  if (!goal(pool)) return { fails: true, cost: null, gain: null, capped: false };
  const sets = minimalSets(pool, [], goal, maxK, true);
  if (sets.length === 0) return { fails: false, cost: maxK + 1, gain: par - (maxK + 1), capped: true };
  const cost = (sets[0] as string[]).length;
  return { fails: false, cost, gain: par - cost, capped: false };
}

const LIMIT_PAR = 11;

function motiveFind(c: BoardCase): string | undefined {
  if (c.type !== 'murder') return undefined;
  const f = c.finds.find((x) => x.gives.why);
  return f ? `search:${f.id}` : undefined;
}

/** Every inclusion-minimal subset of `pool` (up to `maxK`) that, with `base`, meets `goal`. */
export function minimalSets(
  pool: string[],
  base: string[],
  goal: (held: string[]) => boolean,
  maxK: number,
  smallestOnly: boolean,
): string[][] {
  if (!goal([...base, ...pool])) return [];
  if (goal(base)) return [[]];
  const memo = new Map<string, boolean>();
  const reach = (inc: string[], from: number): boolean => {
    const k = `${inc.join(',')}|${from}`;
    let v = memo.get(k);
    if (v === undefined) {
      v = goal([...base, ...inc, ...pool.slice(from)]);
      memo.set(k, v);
    }
    return v;
  };
  const found: string[][] = [];
  const dfs = (i: number, inc: string[], k: number) => {
    if (inc.length > 0 && goal([...base, ...inc])) {
      found.push(inc);
      return;
    }
    if (inc.length === k || i === pool.length) return;
    if (pool.length - i < 1) return;
    if (!reach(inc, i)) return;
    dfs(i + 1, [...inc, pool[i] as string], k);
    dfs(i + 1, inc, k);
  };
  if (smallestOnly) {
    for (let k = 1; k <= maxK; k++) {
      dfs(0, [], k);
      const exact = found.filter((s) => s.length === k);
      if (exact.length > 0) return exact;
      found.length = 0;
    }
    return [];
  }
  dfs(0, [], maxK);
  // Keep the inclusion-minimal ones.
  found.sort((a, b) => a.length - b.length);
  const out: string[][] = [];
  for (const s of found) if (!out.some((m) => m.every((x) => s.includes(x)))) out.push(s);
  return out;
}

/**
 * Rule 18, with 4a.2's rule that every suggestion is pointed to by something the player already
 * holds: the scene first; then whoever found him; then the watchers at the places the victim was
 * and where the means came from, each once something names the place; then the people the lists
 * and accounts name. Each reason says what points to it.
 */
export function suggestedOrder(c: BoardCase): { q: string; label: string; why: string }[] {
  const idx = pointerIndex(c);
  const qs = questionsOf(c).filter((q) => q.kind !== 'confront');
  const v = c.crime.victim;
  const victimPlaces = new Set(c.board.hours.filter((h) => h < c.crime.hour).map((h) => c.board.rows[v]?.[h]).filter((p): p is PlaceId => !!p && p !== c.crime.scene));
  const meansFind = c.finds.find((f) => f.gives.means);
  // Decided 2026-10-11: of the two liars' stories, the one the case leads with is suggested first.
  const innocent = innocentLie(c)?.person;
  const leads = innocent ? (c.lead === 'culprit' ? c.crime.culprit : innocent) : undefined;
  const prio = (q: Question): number => {
    if (meansFind && q.id === `search:${meansFind.id}`) return 0;
    // Rule 18: whoever found him, or last saw it (the neighbour the office names, who kept the dog).
    if (q.kind === 'account' && (q.subject === c.crime.finder || (c.givens.known ?? []).includes(q.subject))) return 1;
    if (q.kind === 'list') return victimPlaces.has(q.at) ? 2 : q.at === c.means.origin ? 3 : 4;
    if (q.kind === 'account' && q.subject === leads) return 4.5;
    if (q.kind === 'account') return c.people.find((p) => p.id === q.subject)?.role === 'suspect' ? 5 : 6;
    return 7;
  };
  const asked: string[] = [];
  const out: { q: string; label: string; why: string }[] = [];
  // Questions in the order they first became pointed to, so ties go to what came up first.
  const since = new Map<string, number>();
  for (;;) {
    for (const q of qs) {
      if (since.has(q.id) || asked.includes(q.id)) continue;
      const by = idx.by.get(q.id);
      if (by && (by.has(GIVENS) || asked.some((a) => by.has(a)))) since.set(q.id, since.size);
    }
    const open = qs.filter((q) => since.has(q.id) && !asked.includes(q.id));
    if (open.length === 0) break;
    open.sort((a, b) => prio(a) - prio(b) || (since.get(a.id) as number) - (since.get(b.id) as number));
    const q = open[0] as Question;
    const r = reasonFor(c, q.id, asked, (i) => `suggestion ${i + 1}`);
    out.push({ q: q.id, label: q.label, why: r?.text ?? 'nothing points here' });
    asked.push(q.id);
  }
  return out;
}

export interface AnalyseOptions {
  /** Skip the route count (the sweep's inner loop can do without it until a case is accepted). */
  routes?: boolean;
}

export function analyse(c: BoardCase, opts: AnalyseOptions = {}): Analysis {
  const T = techniquesUpTo(c.tier);
  const qs = questionsOf(c);
  const byId = new Map(qs.map((q) => [q.id, q]));
  const motive = motiveFind(c);
  const all = qs.map((q) => q.id);
  const pool = all.filter((id) => id !== motive);
  const full = solve(c, all, { techniques: T });
  const suggested = suggestedOrder(c);
  const rank = new Map(suggested.map((s, i) => [s.q, i]));

  const rating = rate(c);

  const rivals = rivalsOf(c);
  const empty: Analysis = {
    solvable: false,
    par: Infinity,
    walks: Infinity,
    path: [],
    ...(motive ? { motive } : {}),
    budget: Infinity,
    rivals: rivals.map((id) => ({ id, routes: [] })),
    rating,
    suggested,
    interaction: { ok: false, loners: [], settles: [] },
    full,
  };
  if (!full.done) return empty;

  // Par: the fewest questions to the report. Order the pool by the suggested order so the search
  // meets the natural sets first.
  // 4a.2: only what the player can be pointed to counts, so the goal reads the set's closure.
  const ordered = [...pool].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  const goal = (held: string[]) => solve(c, closure(c, held), { techniques: T }).done;
  const sets = minimalSets(ordered, [], goal, LIMIT_PAR, true);
  if (sets.length === 0) return empty;

  // Decided 2026-10-11: among the orders with the fewest walks, one where the story the case leads
  // with (`c.lead`: the innocent liar's on most nights) breaks before the other, wherever there is
  // one, so the first lie a player meets isn't the culprit's for the asking, nor the last.
  const innocent = innocentLie(c);
  const culprit = { person: c.crime.culprit, hour: c.crime.hour };
  const breaks = (x: { person: PersonId; hour: Hour }) => (s: Solved) => s.status.get(key(x.person, x.hour))?.s === 'broken';
  // Decided 2026-10-25 (docs/69 §1.4): on a night with one liar, one where the culprit's story breaks
  // while somebody else is still unchecked, wherever the walks allow it: so the first lie a player
  // meets isn't one they can close on, "nobody else", without checking the rest.
  const others = c.people.filter((p) => p.role === 'suspect' && p.id !== c.crime.culprit).map((p) => p.id);
  const lead: Lead | undefined = innocent
    ? c.lead === 'culprit'
      ? { first: breaks(culprit), then: breaks(innocent) }
      : { first: breaks(innocent), then: breaks(culprit) }
    : oneLiar(c)
      ? { first: breaks(culprit), then: (s) => others.every((p) => s.cleared.has(p)) }
      : undefined;
  let best: { order: string[]; walks: number; late: number; rankSum: number } | null = null;
  for (const s of sets.slice(0, 60)) {
    const o = orderPath(c, s, rank, T, lead);
    if (!o) continue;
    const rankSum = o.order.reduce((acc, q, i) => acc + Math.abs(i - (rank.get(q) ?? 99)), 0);
    if (!best || o.walks < best.walks || (o.walks === best.walks && (o.late < best.late || (o.late === best.late && rankSum < best.rankSum)))) best = { ...o, rankSum };
  }
  if (!best) return empty;

  const path = describePath(c, best.order, T, rivals, byId);

  // Rule 17: routes per rival, the crime hour taken as known, from the scene search on.
  const routeOut: Rival[] = [];
  if (opts.routes !== false) {
    const meansQ = c.finds.find((f) => f.gives.means);
    const base = meansQ ? [`search:${meansQ.id}`] : [];
    // A route is a way the rival falls; it only counts if something in the case points at it.
    const reachable = new Set(closure(c, all));
    const rpool = pool.filter((q) => !base.includes(q) && reachable.has(q));
    for (const r of rivals) {
      const g = (held: string[]) =>
        solve(c, held, { techniques: T, forceHours: [c.crime.hour] }).cleared.has(r);
      routeOut.push({ id: r, routes: minimalSets(rpool, base, g, 4, false) });
    }
  }

  // Rule 15: every clue on the path joins another in some deduction (the scene search is the
  // entry, and counts as joined), and no single question settles who.
  const final = solve(c, best.order, { techniques: T });
  const joined = new Set<string>();
  for (const st of final.log) if (st.deps.length >= 2) for (const d of st.deps) joined.add(d);
  const meansQ = c.finds.find((f) => f.gives.means);
  const loners = best.order.filter((q) => q !== `search:${meansQ?.id}` && !joined.has(q));
  const settles = pool.filter((q) => solve(c, [q], { techniques: T }).who !== undefined);

  return {
    solvable: true,
    par: best.order.length,
    walks: best.walks,
    path,
    ...(motive ? { motive } : {}),
    budget: best.order.length + TIERS[c.tier].slack,
    rivals: routeOut.length > 0 ? routeOut : rivals.map((id) => ({ id, routes: [] })),
    rating,
    suggested,
    interaction: { ok: loners.length === 0 && settles.length === 0, loners, settles },
    full,
  };
}

/**
 * Decided 2026-10-11: the innocent liar's lie, the culprit's rival story at the crime hour (a
 * secret, or the pair's cover).
 */
export function innocentLie(c: BoardCase): { person: PersonId; hour: Hour } | undefined {
  const l = c.lies.find((x) => x.person !== c.crime.culprit);
  return l ? { person: l.person, hour: l.hour } : undefined;
}

/** Decided 2026-10-25 (docs/69): a night from Poached up where nobody but the culprit lies. */
export function oneLiar(c: BoardCase): boolean {
  return c.tier >= 2 && !innocentLie(c);
}

/**
 * Tatham (docs/42 §2): the tier's techniques finish the night and the tier below's don't. Decided
 * 2026-10-25 (docs/69 §1.2): a Poached night with one liar is the exception. Poached's technique is the
 * innocent liar's (resolving an admission), so without one the night finishes on lower tiers'
 * techniques; it's dealt from a night that rated Poached with its second liar, and in place of the
 * floor its path must check every rival and need more than the culprit's broken story
 * (`rivalsChecked`). From Soft-boiled up a night with one liar still needs its tier's technique.
 */
export function ratesAt(c: BoardCase, rating: TierIndex | null): boolean {
  if (rating === c.tier) return true;
  return c.tier === 2 && oneLiar(c) && rating !== null && rating < c.tier;
}

/** Decided 2026-10-11: the step at which a story first breaks on a path (1-based), or Infinity. */
export function breaksAt(c: BoardCase, order: readonly string[], T: ReadonlySet<Technique>, p: PersonId, h: Hour): number {
  for (let i = 1; i <= order.length; i++) if (solve(c, order.slice(0, i), { techniques: T }).status.get(key(p, h))?.s === 'broken') return i;
  return Infinity;
}

/** Tatham: the lowest tier whose techniques finish the case with every question a player can be pointed to asked. */
export function rate(c: BoardCase): TierIndex | null {
  const all = closure(
    c,
    questionsOf(c).map((q) => q.id),
  );
  for (let t = 0; t <= 5; t++) if (solve(c, all, { techniques: techniquesUpTo(t) }).done) return t as TierIndex;
  return null;
}

/** The rivals: innocents the player has to rule out. At Raw every other suspect; above, those with access. */
export function rivalsOf(c: BoardCase): PersonId[] {
  const suspects = c.people.filter((p) => p.role === 'suspect' && p.id !== c.crime.culprit).map((p) => p.id);
  // The office clears some for free (the client's companion at the pictures).
  const office = solve(c, [], { techniques: techniquesUpTo(c.tier), forceHours: [c.crime.hour] });
  const open = suspects.filter((p) => !office.cleared.has(p));
  if (c.tier === 0) return open;
  return open.filter((p) => hadAccess(c, p));
}

export function hadAccess(c: BoardCase, p: PersonId): boolean {
  if (c.givens.access.includes(p)) return true;
  return c.means.available.some((h) => c.board.rows[p]?.[h] === c.means.origin);
}

/**
 * What the path meets first and what after, as what's held shows them: decided 2026-10-11, with two
 * liars, the story the night leads with breaking before the other; decided 2026-10-25 (docs/69 §1.4),
 * with one, the culprit's story breaking before everybody else is cleared.
 */
interface Lead {
  first: (s: Solved) => boolean;
  then: (s: Solved) => boolean;
}

/**
 * The cheapest order for a set: fewest walks, confrontations after what breaks the line; then
 * (decided 2026-10-11) `lead.first` happening before `lead.then` where the walks allow it; then the
 * suggested order. `late` is 0 when it does, 1 when both happen on one step, 2 when the other
 * happens first.
 */
function orderPath(c: BoardCase, set: string[], rank: Map<string, number>, T: ReadonlySet<Technique>, lead?: Lead): { order: string[]; walks: number; late: number } | null {
  const qs = new Map(questionsOf(c).map((q) => [q.id, q]));
  const n = set.length;
  const loc = set.map((q) => qs.get(q)?.at ?? '');
  const solvedSet = solve(c, set, { techniques: T });
  const need: number[] = set.map((q) => {
    const qq = qs.get(q) as Question;
    let mask = 0;
    if (qq.kind === 'confront') {
      const st = solvedSet.status.get(key(qq.subject, qq.hour as Hour));
      for (const d of st?.deps ?? []) {
        const j = set.indexOf(d);
        if (j >= 0 && j !== set.indexOf(q)) mask |= 1 << j;
      }
      const acc = set.indexOf(`account:${qq.subject}`);
      if (acc >= 0) mask |= 1 << acc;
    }
    return mask;
  });
  // 4a.2: every question is asked only once something already held points at it (the office,
  // or an earlier answer naming its place or person). A company-only witness is the old case.
  const idx = pointerIndex(c);
  const free: boolean[] = set.map((q) => idx.by.get(q)?.has(GIVENS) ?? false);
  const anyOf: number[] = set.map((q) => {
    const by = idx.by.get(q);
    let mask = 0;
    set.forEach((other, j) => {
      if (other !== q && by?.has(other)) mask |= 1 << j;
    });
    return mask;
  });
  const ok = (j: number, mask: number) => ((need[j] as number) & mask) === need[j] && (free[j] || ((anyOf[j] as number) & mask) !== 0);
  const FULL = (1 << n) - 1;
  // Decided 2026-10-11: which of the two stories a mask's answers break (bit 1 the one to meet
  // second, bit 2 the one to meet first), and what a step costs in being late: 2 when the second
  // breaks while the first still stands after it, 1 when both break on that step. A walk outweighs
  // any of it.
  const brokenMemo = new Map<number, number>();
  const broken = (mask: number): number => {
    let v = brokenMemo.get(mask);
    if (v === undefined) {
      const st = solve(
        c,
        set.filter((_, j) => mask & (1 << j)),
        { techniques: T },
      );
      v = lead ? (lead.then(st) ? 1 : 0) | (lead.first(st) ? 2 : 0) : 0;
      brokenMemo.set(mask, v);
    }
    return v;
  };
  const late = (mask: number, next: number): number => {
    if (!lead) return 0;
    const a = broken(mask);
    if (a & 1) return 0;
    const b = broken(next);
    if (!(b & 1)) return 0;
    return a & 2 ? 0 : b & 2 ? 1 : 2;
  };
  const W = lead ? 4 : 1;
  // best[mask][last]: fewest walks (×4, plus lateness) to finish from here. last = n means the office.
  const best: number[][] = Array.from({ length: 1 << n }, () => new Array(n + 1).fill(Infinity));
  for (let last = 0; last <= n; last++) (best[FULL] as number[])[last] = 0;
  const cost = (mask: number, last: number, j: number): number => {
    const step = last === n || loc[last] !== loc[j] ? W : 0;
    const next = (best[mask | (1 << j)] as number[])[j] as number;
    return Number.isFinite(next) ? step + late(mask, mask | (1 << j)) + next : Infinity;
  };
  for (let mask = FULL - 1; mask >= 0; mask--) {
    for (let last = 0; last <= n; last++) {
      if (last < n && !(mask & (1 << last))) continue;
      let v = Infinity;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j) || !ok(j, mask)) continue;
        v = Math.min(v, cost(mask, last, j));
      }
      (best[mask] as number[])[last] = v;
    }
  }
  const total = (best[0] as number[])[n] as number;
  if (!Number.isFinite(total)) return null;
  const order: string[] = [];
  let mask = 0;
  let last = n;
  while (mask !== FULL) {
    let pick = -1;
    let pickRank = Infinity;
    const here = (best[mask] as number[])[last] as number;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j) || !ok(j, mask)) continue;
      if (cost(mask, last, j) !== here) continue;
      const r = rank.get(set[j] as string) ?? 99;
      if (r < pickRank) {
        pickRank = r;
        pick = j;
      }
    }
    order.push(set[pick] as string);
    mask |= 1 << pick;
    last = pick;
  }
  return { order, walks: Math.floor(total / W), late: total % W };
}

function describePath(
  c: BoardCase,
  order: string[],
  T: ReadonlySet<Technique>,
  rivals: PersonId[],
  byId: Map<string, Question>,
): PathStep[] {
  const steps: PathStep[] = [];
  let prevLog = new Set<string>();
  let prevCleared = new Set<PersonId>();
  for (let i = 0; i < order.length; i++) {
    const q = order[i] as string;
    const s = solve(c, order.slice(0, i + 1), { techniques: T });
    const fresh: Step[] = s.log.filter((x) => !prevLog.has(x.text));
    const connects = new Set<string>();
    for (const x of fresh) for (const d of x.deps) if (d !== q && order.indexOf(d) < i) connects.add(d);
    const cleared = new Set(s.cleared.keys());
    const removes = rivals.filter((r) => cleared.has(r) && !prevCleared.has(r));
    const qq = byId.get(q) as Question;
    const r = reasonFor(c, q, order.slice(0, i));
    let why = r?.text ?? 'Nothing points here.';
    // A confrontation: their line against the line that breaks it.
    if (qq.kind === 'confront') {
      const st = s.status.get(key(qq.subject, qq.hour as Hour));
      const breakers = (st?.deps ?? []).filter((d) => d !== `account:${qq.subject}` && d !== q && order.indexOf(d) >= 0 && order.indexOf(d) < i).map((d) => `step ${order.indexOf(d) + 1}`);
      if (r && breakers.length) why = why.replace(/: put it to /, `, and ${breakers.join(' and ')} ${breakers.length > 1 ? 'say' : 'says'} otherwise: put it to `);
    }
    steps.push({
      q,
      label: qq.label,
      at: qq.at,
      gives: fresh.map((x) => x.text),
      connects: [...connects].map((d) => `step ${order.indexOf(d) + 1}`),
      techniques: [...new Set(fresh.map((x) => x.tech))],
      removes,
      why,
      pointedBy: r?.by ?? '',
    });
    prevLog = new Set(s.log.map((x) => x.text));
    prevCleared = cleared;
  }
  return steps;
}

export { key };
