/**
 * The oracle player.
 *
 * A pure player who already knows which of the findable clues carry the proof,
 * and who is allowed nothing else: it types the same strings a person types,
 * through the same parser, into the same reducer. What it proves is that the
 * generator's `par` is a real number in the game's action model — that eleven
 * spine clues spread over three rooms really can be collected in the ten
 * actions the case was budgeted against.
 *
 * It plans optimally, because `computePar` is itself an optimal-play number:
 * a greedy lead-follower would be testing the oracle's taste rather than the
 * case's arithmetic.
 */

import type { Clue, Id } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { leadFor } from './derive.js';
import { newRun, stepInput } from './reducer.js';
import type { RunState } from './types.js';

export interface OracleStep {
  command: string;
  gained: Id[];
}

export interface OracleResult {
  ok: boolean;
  /** Why it could not be done, when it could not. */
  reason: string | null;
  actions: number;
  par: number;
  budget: number;
  steps: OracleStep[];
  /** Spine clues never obtained. */
  missing: Id[];
  state: RunState;
}

interface Group {
  command: string;
  placeId: Id;
  /** Which of the wanted clues this one action delivers. */
  gains: Set<Id>;
}

/** Every command that would fetch at least one of `wanted`, deduplicated. */
function groupsFor(view: CaseView, wanted: Clue[]): Group[] {
  const want = new Set(wanted.map((c) => c.id));
  const byCommand = new Map<string, Group>();
  for (const clue of wanted) {
    const lead = leadFor(view, clue);
    const existing = byCommand.get(lead.command);
    if (existing) {
      existing.gains.add(clue.id);
      continue;
    }
    const gains = new Set<Id>();
    if (clue.source.type === 'place') {
      for (const c of view.placeClues.get(clue.source.placeId) ?? [])
        if (want.has(c.id)) gains.add(c.id);
    } else {
      const bucket = view.exactBuckets.get(clue.source.personId)?.get(clue.source.topic) ?? [];
      for (const c of bucket) if (want.has(c.id)) gains.add(c.id);
    }
    byCommand.set(lead.command, { command: lead.command, placeId: lead.placeId, gains });
  }
  return [...byCommand.values()];
}

/** Shortest sequence of commands, counting travel. Breadth-first, exact. */
function plan(view: CaseView, from: Id, groups: Group[]): string[] | null {
  if (groups.length === 0) return [];
  if (groups.length > 22) return null;
  const places = view.kase.places.map((p) => p.id);
  const start = Math.max(0, places.indexOf(from));
  const n = groups.length;
  const span = 1 << n;
  const goal = span - 1;
  const key = (p: number, m: number): number => p * span + m;
  const prev = new Map<number, { from: number; command: string }>();
  const seen = new Set<number>([key(start, 0)]);
  let frontier = [key(start, 0)];
  let depth = 0;

  while (frontier.length > 0 && depth <= 80) {
    const next: number[] = [];
    for (const state of frontier) {
      const m = state % span;
      const p = (state - m) / span;
      if (m === goal) {
        const out: string[] = [];
        let cursor = state;
        while (cursor !== key(start, 0)) {
          const back = prev.get(cursor);
          if (!back) return null;
          out.push(back.command);
          cursor = back.from;
        }
        return out.reverse();
      }
      for (let i = 0; i < n; i++) {
        if (m & (1 << i)) continue;
        const g = groups[i] as Group;
        if (g.placeId !== places[p]) continue;
        let mask = m | (1 << i);
        // One command may cover several groups at once when they share a room
        // and a question; the group list is already deduplicated by command,
        // so this only ever folds in groups the same string would fetch.
        for (let j = 0; j < n; j++) {
          if (mask & (1 << j)) continue;
          if ((groups[j] as Group).command === g.command) mask |= 1 << j;
        }
        const k = key(p, mask);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, { from: state, command: g.command });
        next.push(k);
      }
      for (let q = 0; q < places.length; q++) {
        if (q === p) continue;
        const k = key(q, m);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, { from: state, command: `go ${view.placeById.get(places[q] as Id)?.shortName ?? ''}` });
        next.push(k);
      }
    }
    frontier = next;
    depth++;
  }
  return null;
}

export function playOracle(view: CaseView, detectiveName = 'Humphrey'): OracleResult {
  const kase = view.kase;
  let state = newRun(view, { detectiveName });
  const spine = kase.findable.filter((c) => c.role === 'spine');
  const wanted = spine.filter((c) => !state.found.includes(c.id));
  const steps: OracleStep[] = [];

  const script = plan(view, state.at, groupsFor(view, wanted));
  const fail = (reason: string): OracleResult => ({
    ok: false,
    reason,
    actions: state.actionsUsed,
    par: kase.par,
    budget: kase.budget,
    steps,
    missing: spine.filter((c) => !state.found.includes(c.id)).map((c) => c.id),
    state,
  });
  if (script === null) return fail('no route collects the spine');

  for (const command of script) {
    const result = stepInput(state, command, view);
    // A free page with nothing on it means the parser would not take the
    // string, which is a failure of the game and not of the route.
    if (result.page.cost === 0 && result.page.found.length === 0) {
      return fail(`the prompt refused "${command}"`);
    }
    state = result.state;
    steps.push({ command, gained: result.page.found });
  }

  const missing = spine.filter((c) => !state.found.includes(c.id)).map((c) => c.id);
  if (missing.length > 0) return fail('the script ran out before the spine did');
  if (state.actionsUsed > kase.par)
    return fail(`took ${state.actionsUsed} actions against a par of ${kase.par}`);

  return {
    ok: true,
    reason: null,
    actions: state.actionsUsed,
    par: kase.par,
    budget: kase.budget,
    steps,
    missing: [],
    state,
  };
}
