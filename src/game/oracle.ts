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

import type { Clue, Id, Tick } from '../gen/types.js';
import { Rng } from '../gen/rng.js';
import type { CaseView } from './derive.js';
import { establishedFrom, gameBudget, gamePar, leadFor, peopleHere } from './derive.js';
import { continuationOf, newRun, sceneCluesOf, stepInput } from './reducer.js';
import { leadingTheory } from './voice/reactive.js';
import type { Report, RunState } from './types.js';

export interface OracleStep {
  command: string;
  gained: Id[];
}

export interface OracleResult {
  ok: boolean;
  /** Why it could not be done, when it could not. */
  reason: string | null;
  /**
   * The route's cost in par's own accounting: one action per fetch, one per
   * move, whether or not the book charged for it. M4's free first ask waives
   * the charge on a question to somebody who already knows the detective —
   * that is slack handed to the player, not a cheaper route, and par is a
   * statement about routes. This is the number the oracle test asserts on.
   */
  actions: number;
  /** What the clock actually ran: `actions` minus the questions waived. */
  spent: number;
  /** Questions the free-first-ask rule waived on this route. */
  waived: number;
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
  /** Every clue this one action delivers, wanted or not. */
  fetches: Set<Id>;
  /**
   * M6 §8: a question is only on the page once a lead has opened it, so the
   * oracle may only ask it once one has. Clues whose `leadsTo` names any clue
   * this action fetches. Empty for a search, which is always on the page.
   */
  openers: Set<Id>;
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
    const fetches = new Set<Id>();
    const openers = new Set<Id>();
    if (clue.source.type === 'place') {
      for (const c of view.placeClues.get(clue.source.placeId) ?? []) {
        fetches.add(c.id);
        if (want.has(c.id)) gains.add(c.id);
      }
    } else {
      const bucket = view.exactBuckets.get(clue.source.personId)?.get(clue.source.topic) ?? [];
      for (const c of bucket) {
        fetches.add(c.id);
        if (want.has(c.id)) gains.add(c.id);
      }
      for (const c of view.kase.findable) {
        if (c.leadsTo.some((t) => fetches.has(t))) openers.add(c.id);
      }
    }
    byCommand.set(lead.command, {
      command: lead.command,
      placeId: lead.placeId,
      gains,
      fetches,
      openers,
    });
  }
  return [...byCommand.values()];
}

/**
 * Shortest sequence of commands, counting travel. Breadth-first, exact.
 *
 * M6 §8: gated the way the page is. A question is only offered once an open
 * lead names it — the choices list exact topics as leads and nowhere else —
 * so a group that asks is available only once something already in hand, or
 * fetched by a group earlier on the route, leads to it. A search is always on
 * the page. The gate can only lengthen a route, and `computePar` gates the
 * spine the same way, so the route is still par's.
 */
function plan(
  view: CaseView,
  from: Id,
  groups: Group[],
  inHand: ReadonlySet<Id> = new Set(),
): string[] | null {
  if (groups.length === 0) return [];
  if (groups.length > 22) return null;
  // A search has no openers and is open from the start; a question with no
  // opener anywhere in the case is one nothing will ever put on the page.
  const isAsk = groups.map((g) => !g.command.startsWith('examine '));
  // M10: a par-route question the case leaves unmarked (`Logic.open`) is on
  // the page all the same, and the oracle may ask it.
  const unmarked = new Set(view.kase.logic?.open ?? []);
  const alwaysOpen = groups.map(
    (g, i) => !isAsk[i] || [...g.openers].some((id) => inHand.has(id)) || [...g.fetches].some((id) => unmarked.has(id)),
  );
  const openedBy = groups.map((g) => {
    let m = 0;
    groups.forEach((other, j) => {
      if ([...other.fetches].some((id) => g.openers.has(id))) m |= 1 << j;
    });
    return m;
  });
  // The office is never worth walking to: nothing findable is in it, and a
  // route through it is a route one action longer than the same route without.
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
        if (isAsk[i] && !alwaysOpen[i] && (m & (openedBy[i] as number)) === 0) continue;
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

export function playOracle(view: CaseView, detectiveName = 'Dashiell'): OracleResult {
  const kase = view.kase;
  let state = newRun(view, { detectiveName });
  const spine = kase.findable.filter((c) => c.role === 'spine');
  // M4b §B.2: the night opens at the office, the client's brief is already in
  // hand, and the scene report and the coroner's note are handed over free on
  // the first arrival at the scene. So the oracle's first action is `go
  // <scene>` — which is the one action §B.3 adds to par — and it plans the
  // rest of the route from the scene, exactly as `computePar` does.
  const free = new Set(sceneCluesOf(view).map((c) => c.id));
  // M10: the unmarked question that catches a lie comes after the lie, where
  // the route can choose; the route is no longer for it.
  const unmarked = new Set(kase.logic?.open ?? []);
  const wanted = spine
    .filter((c) => !state.found.includes(c.id) && !free.has(c.id))
    .sort((a, b) => Number(unmarked.has(a.id)) - Number(unmarked.has(b.id)));
  const steps: OracleStep[] = [];

  // M5 §6: the first room is the scene for seven tropes and the foot of the
  // stairs for `body-moved`, and par is computed from wherever it is.
  const toTheScene = `go ${view.placeById.get(view.startId)?.shortName ?? ''}`;
  // In hand when the route starts: the client's brief, and the scene's report
  // and the coroner's note, handed over on the walk in.
  const inHand = new Set<Id>([...state.found, ...free]);
  const rest = plan(view, view.startId, groupsFor(view, wanted), inHand);
  const script = rest === null ? null : [toTheScene, ...rest];
  const fail = (reason: string): OracleResult => ({
    ok: false,
    reason,
    actions: state.actionsUsed + state.waived,
    spent: state.actionsUsed,
    waived: state.waived,
    par: gamePar(kase),
    budget: gameBudget(kase),
    steps,
    missing: spine.filter((c) => !state.found.includes(c.id)).map((c) => c.id),
    state,
  });
  if (script === null) return fail('no route collects the spine');

  for (const command of script) {
    const before = state.waived;
    const result = stepInput(state, command, view);
    // A free page with nothing on it means the parser would not take the
    // string, which is a failure of the game and not of the route. A page the
    // free-first-ask rule waived is free and still an action in par's terms.
    const waived = result.state.waived > before;
    if (result.page.cost === 0 && !waived && result.page.found.length === 0) {
      return fail(`the prompt refused "${command}"`);
    }
    state = result.state;
    steps.push({ command, gained: result.page.found });
    // M10 §A.3: a page that stops at three families ends on "Go on", which
    // is free; the oracle always takes it.
    for (let more = continuationOf(view, state); more !== null; more = continuationOf(view, state)) {
      const next = stepInput(state, more, view);
      if (next.page.found.length === 0) break;
      state = next.state;
      steps.push({ command: more, gained: next.page.found });
    }
  }

  const missing = spine.filter((c) => !state.found.includes(c.id)).map((c) => c.id);
  const actions = state.actionsUsed + state.waived;
  if (missing.length > 0) return fail('the script ran out before the spine did');
  const par = gamePar(kase);
  if (actions > par) return fail(`took ${actions} actions against a par of ${par}`);

  return {
    ok: true,
    reason: null,
    actions,
    spent: state.actionsUsed,
    waived: state.waived,
    par,
    budget: gameBudget(kase),
    steps,
    missing: [],
    state,
  };
}

/* ------------------------------------------------------------------ *
 * The other player: a plausible imperfect one.
 * ------------------------------------------------------------------ */

export interface WanderResult {
  state: RunState;
  steps: OracleStep[];
  report: Report;
}

/**
 * A player who does not know which clues are the spine.
 *
 * He works the notebook the way a person does: he takes the lead in front of
 * him, he prefers the interesting-looking one, he goes down noise branches
 * because noise is interesting, he asks people for their evening because that
 * is what a detective does, and he runs out of night. Then he files what he
 * has, naming whoever the monologue was accusing when the clock ran out —
 * which is the point: the leading theory is very often the wrong man.
 *
 * `npm run read -- --random` reads a run of his.
 */
/** The last room a found clue puts the victim in after the hour they went. */
function lastSightingAfter(view: CaseView, found: readonly Id[]): Id | null {
  const victimId = view.victim.id;
  let best: { tick: Tick; place: Id } | null = null;
  for (const id of found) {
    for (const f of view.findableById.get(id)?.establishes ?? []) {
      if (f.kind !== 'personAt' || f.personId !== victimId) continue;
      if (f.tick <= view.kase.act.tick) continue;
      if (best === null || f.tick > best.tick) best = { tick: f.tick, place: f.place };
    }
  }
  return best?.place ?? null;
}

export function playWandering(
  view: CaseView,
  seed: number,
  detectiveName = 'Dashiell',
): WanderResult {
  const kase = view.kase;
  const rng = new Rng(((seed || 1) * 2246822519) >>> 0);
  let state = newRun(view, { detectiveName });
  const steps: OracleStep[] = [];
  const interesting = (clueId: Id): number => {
    const role = view.findableById.get(clueId)?.role;
    return role === 'noise' || role === 'disqualifier' ? 2 : 1;
  };

  let guard = 0;
  while (state.actionsUsed < gameBudget(kase) && guard++ < 80) {
    const here = state.threads.filter((t) => t.placeId === state.at);
    const elsewhere = state.threads.filter((t) => t.placeId !== state.at);
    let command: string | null = null;

    if (here.length > 0 && (elsewhere.length === 0 || !rng.chance(0.25))) {
      const weighted = here.flatMap((t) => Array<typeof t>(interesting(t.clueId)).fill(t));
      command = rng.pick(weighted).command;
    } else if (elsewhere.length > 0) {
      const weighted = elsewhere.flatMap((t) => Array<typeof t>(interesting(t.clueId)).fill(t));
      command = `go ${rng.pick(weighted).placeLabel}`;
    }

    // Every so often he does the human thing instead of the efficient one.
    // M5 §7: whoever is actually standing here, which is not the same list as
    // `peopleAt` once a robbery's owner and a found missing person are on it.
    const peopleHereIds = peopleHere(view, state.at, state.found).map((p) => p.id);
    const unasked = peopleHereIds.filter((id) => !state.accounts.includes(id));
    if ((command === null || rng.chance(0.3)) && unasked.length > 0) {
      command = `ask ${view.personById.get(rng.pick(unasked))?.surname} about that evening`;
    }
    if (command === null) {
      const unsearched = (view.placeClues.get(state.at) ?? []).some(
        (c) => !state.found.includes(c.id),
      );
      command = unsearched
        ? 'examine'
        : `go ${rng.pick(view.places.filter((p) => p.id !== state.at)).shortName}`;
    }

    const result = stepInput(state, command, view);
    state = result.state;
    steps.push({ command, gained: result.page.found });
    for (let more = continuationOf(view, state); more !== null; more = continuationOf(view, state)) {
      const next = stepInput(state, more, view);
      if (next.page.found.length === 0) break;
      state = next.state;
      steps.push({ command: more, gained: next.page.found });
    }
    if (result.page.cost === 0 && result.page.found.length === 0 && state.threads.length === 0) break;
  }

  const est = establishedFrom(view, state.found, state.accounts);
  // M5 §5: he files the unknowns, and he files them off what he has. Where the
  // case asks where somebody went, the best he can do is the last room a clue
  // put them in after the hour they vanished; where it asks how a lock was
  // turned or where the goods ended up, he has nothing and says so.
  const seenAfter = lastSightingAfter(view, state.found);
  const report: Report = {
    killerId: leadingTheory(view, est),
    methodId: est.methodEvidence ? kase.method.id : null,
    motiveType: est.motives[0]?.motiveType ?? null,
    tick: est.deathTicks.length === 1 ? (est.deathTicks[0] as Tick) : null,
    placeId: kase.solution.murderPlaceId,
    entry: null,
    whereabouts: seenAfter,
    fate: seenAfter === null ? null : 'left',
    goodsPlaceId: null,
  };
  return { state, steps, report };
}
