import type { BoardCase, Hour, PersonId, PlaceId, Question, TierIndex } from './types.js';
import { key, questionsOf, solve, type Solved, type Step } from './solver.js';
import { TIERS, techniquesUpTo, type Technique } from './tiers.js';

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

/** Rule 18: the scene; whoever found him or last saw him; the watchers where he was and at the origin; the people they name. */
export function suggestedOrder(c: BoardCase): { q: string; label: string; why: string }[] {
  const qs = questionsOf(c);
  const byId = new Map(qs.map((q) => [q.id, q]));
  const out: { q: string; label: string; why: string }[] = [];
  const seen = new Set<string>();
  const push = (id: string | undefined, why: string) => {
    if (!id || seen.has(id) || !byId.has(id)) return;
    seen.add(id);
    out.push({ q: id, label: (byId.get(id) as Question).label, why });
  };
  const meansFind = c.finds.find((f) => f.gives.means);
  push(meansFind ? `search:${meansFind.id}` : undefined, 'start where it happened: the time, the means, and where the means came from');
  const finder = c.crime.finder;
  if (finder && finder !== c.client) {
    const w = c.lists.find((l) => l.watcher === finder);
    push(w ? `list:${finder}` : `account:${finder}`, 'who found him');
  }
  // Last seen alive: the latest hour before the crime that a list or account puts the victim somewhere.
  const v = c.crime.victim;
  let lastList: string | undefined;
  let lastHour = -Infinity;
  for (const l of c.lists) {
    for (const [hs, es] of Object.entries(l.entries)) {
      const h = Number(hs);
      if (h < c.crime.hour && h > lastHour && es.some((e) => 'person' in e && e.person === v)) {
        lastHour = h;
        lastList = `list:${l.watcher}`;
      }
    }
  }
  push(lastList, 'who saw him last');
  const victimPlaces = new Set(c.board.hours.map((h) => c.board.rows[v]?.[h]).filter(Boolean) as PlaceId[]);
  for (const l of c.lists) if (victimPlaces.has(l.place) && l.place !== c.crime.scene) push(`list:${l.watcher}`, 'the watcher where he was tonight');
  for (const l of c.lists) if (l.place === c.means.origin) push(`list:${l.watcher}`, 'the watcher where the means came from');
  for (const l of c.lists) push(`list:${l.watcher}`, 'a watcher');
  for (const l of c.lists) {
    for (const h of c.board.hours) {
      for (const e of l.entries[h] ?? []) {
        if ('person' in e && c.people.find((p) => p.id === e.person)?.role === 'suspect') {
          push(`account:${e.person}`, `named on ${c.people.find((p) => p.id === l.watcher)?.short}'s list`);
        }
      }
    }
  }
  for (const a of c.accounts) push(`account:${a.person}`, 'the rest of the people');
  for (const f of c.finds) push(`search:${f.id}`, 'a search');
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
  const ordered = [...pool].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  const goal = (held: string[]) => solve(c, held, { techniques: T }).done;
  const sets = minimalSets(ordered, [], goal, LIMIT_PAR, true);
  if (sets.length === 0) return empty;

  let best: { order: string[]; walks: number; rankSum: number } | null = null;
  for (const s of sets.slice(0, 60)) {
    const o = orderPath(c, s, rank, T);
    if (!o) continue;
    const rankSum = o.order.reduce((acc, q, i) => acc + Math.abs(i - (rank.get(q) ?? 99)), 0);
    if (!best || o.walks < best.walks || (o.walks === best.walks && rankSum < best.rankSum)) best = { ...o, rankSum };
  }
  if (!best) return empty;

  const path = describePath(c, best.order, T, rivals, byId);

  // Rule 17: routes per rival, the crime hour taken as known, from the scene search on.
  const routeOut: Rival[] = [];
  if (opts.routes !== false) {
    const meansQ = c.finds.find((f) => f.gives.means);
    const base = meansQ ? [`search:${meansQ.id}`] : [];
    const rpool = pool.filter((q) => !base.includes(q));
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

/** Tatham: the lowest tier whose techniques finish the case with every question asked. */
export function rate(c: BoardCase): TierIndex | null {
  const all = questionsOf(c).map((q) => q.id);
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

/** The cheapest order for a set: fewest walks, confrontations after what breaks the line, then the suggested order. */
function orderPath(
  c: BoardCase,
  set: string[],
  rank: Map<string, number>,
  T: ReadonlySet<Technique>,
): { order: string[]; walks: number } | null {
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
  // A company-only witness can be asked only once someone in the set has named them.
  const anyOf: number[] = set.map((q) => {
    const qq = qs.get(q) as Question;
    if (qq.kind !== 'account' || c.people.find((p) => p.id === qq.subject)?.role !== 'company') return 0;
    if (c.givens.known?.includes(qq.subject)) return 0;
    let mask = 0;
    set.forEach((other, j) => {
      const [kind, rest] = other.split(':') as [string, string];
      const names =
        kind === 'list'
          ? Object.values(c.lists.find((l) => l.watcher === rest)?.entries ?? {}).some((es) => es.some((e) => 'person' in e && e.person === qq.subject))
          : kind === 'account'
            ? Object.values(c.accounts.find((a) => a.person === rest)?.claims ?? {}).some((cl) => cl.company.includes(qq.subject))
            : false;
      if (names) mask |= 1 << j;
    });
    return mask;
  });
  const ok = (j: number, mask: number) => ((need[j] as number) & mask) === need[j] && (anyOf[j] === 0 || ((anyOf[j] as number) & mask) !== 0);
  const FULL = (1 << n) - 1;
  // best[mask][last]: fewest walks to finish from here. last = n means the office.
  const best: number[][] = Array.from({ length: 1 << n }, () => new Array(n + 1).fill(Infinity));
  for (let last = 0; last <= n; last++) (best[FULL] as number[])[last] = 0;
  for (let mask = FULL - 1; mask >= 0; mask--) {
    for (let last = 0; last <= n; last++) {
      if (last < n && !(mask & (1 << last))) continue;
      let v = Infinity;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j) || !ok(j, mask)) continue;
        const step = last === n || loc[last] !== loc[j] ? 1 : 0;
        v = Math.min(v, step + ((best[mask | (1 << j)] as number[])[j] as number));
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
      const step = last === n || loc[last] !== loc[j] ? 1 : 0;
      if (step + ((best[mask | (1 << j)] as number[])[j] as number) !== here) continue;
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
  return { order, walks: total };
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
    steps.push({
      q,
      label: qq.label,
      at: qq.at,
      gives: fresh.map((x) => x.text),
      connects: [...connects].map((d) => `step ${order.indexOf(d) + 1}`),
      techniques: [...new Set(fresh.map((x) => x.tech))],
      removes,
    });
    prevLog = new Set(s.log.map((x) => x.text));
    prevCleared = cleared;
  }
  return steps;
}

export { key };
