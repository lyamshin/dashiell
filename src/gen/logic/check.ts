/**
 * M9 — the checker for a tiered case: the solver's conditions, re-run over
 * the finished case, and the shape rules the budget depends on. Replaces
 * M7's requirement-by-requirement check, which counted one-sentence clears
 * and is exactly what M9 is built to get rid of.
 */

import type { Case, Clue, DeductionPath, Fact, Id, Tick } from '../types.js';
import { TICKS } from '../types.js';
import { deductionOf, dialsOf, logicSlackFor } from '../shape.js';
import { culpritOf, crimeTicks, placesAt, solve, whyNot } from './solver.js';
import { confessionRule, problemOf, type ProblemFrame } from './select.js';

export type LogicCaseUnderTest = Omit<Case, 'deduction'>;

export function frameOf(c: LogicCaseUnderTest): ProblemFrame {
  const blocks: Record<Id, number> = {};
  for (const [id, b] of Object.entries(c.logic?.blocks ?? {})) blocks[id] = b;
  return {
    suspects: c.people.filter((p) => p.kind === 'suspect').map((p) => p.id),
    places: c.places.map((p) => p.id),
    blocks,
    scene: c.solution.murderPlaceId,
    victimId: c.people.find((p) => p.kind === 'victim')?.id as Id,
    murder: c.act.type === 'murder',
    givens: c.act.givens.facts,
    confessions: (c.logic?.confrontations ?? [])
      .filter((k) => k.responses[1].facts && (k.responses[1].kind === 'admit' || k.responses[1].kind === 'withdraw'))
      .map((k) =>
        confessionRule(
          k.personId,
          k.lie.claimed,
          k.lie.ticks,
          (k.responses[1].facts ?? []).filter((f) => f.kind === 'personAt'),
          k.lie.accountId,
        ),
      ),
  };
}

export function checkLogic(c: LogicCaseUnderTest): { ok: boolean; failures: string[]; deduction: DeductionPath } {
  const failures: string[] = [];
  const dials = dialsOf(c);
  const { shape, ladder } = dials;
  const ded = deductionOf(shape);
  const logic = c.logic;
  const M = c.solution.murderTick;
  const L = c.solution.murderPlaceId;
  const killerId = c.solution.killerId;
  const deduction: DeductionPath = {
    timeOfDeath: [],
    timeOfDeathAnchors: [],
    exculpations: {},
    inculpation: [],
    access: [],
    method: [],
    motive: [],
  };
  if (!logic) return { ok: false, failures: ['no logic on a tiered case'], deduction };
  const frame = frameOf(c);
  const truth = (id: Id, t: Tick): Id | null => c.schedules.find((s) => s.personId === id)?.truth[t] ?? null;

  /* --- the whole findable set solves it, truly ----------------------------- */
  const st = solve(problemOf(frame, c.findable, ded.hypothesis)).state;
  if (st.contradiction) failures.push(`the findable rules contradict each other: ${st.contradiction}`);
  for (const s of frame.suspects) {
    for (let t = 0; t < TICKS; t++) {
      const tr = truth(s, t);
      if (tr && !placesAt(st, s, t).includes(tr)) failures.push(`the solver rules out where ${s} was at tick ${t}`);
    }
  }
  const who = culpritOf(st);
  if (!who || who.id !== killerId) failures.push('the findable rules do not name the culprit');
  const ticks = crimeTicks(st);
  if (!ticks.includes(M)) failures.push('the findable rules rule out the crime tick');
  if (shape.coronerWidth > 1 && ticks.length !== 1) failures.push('the findable rules do not pin the half hour');
  const needColumn = typeof shape.tier === 'number' ? shape.tier >= 4 : true;
  if (needColumn) {
    for (const s of frame.suspects) {
      if (placesAt(st, s, M).length !== 1) failures.push(`the crime column is open for ${s}`);
    }
  }
  if (who && who.why.depth < ded.culpritDepth) failures.push(`the culprit is reached at depth ${who.why.depth}`);
  if (ded.hypothesis) {
    const flat = solve(problemOf(frame, c.findable, false)).state;
    if (culpritOf(flat)?.id === killerId && (!needColumn || frame.suspects.every((s) => placesAt(flat, s, M).length === 1))) {
      failures.push('no hypothesis test is needed');
    }
  }

  /* --- nobody cleared by one rule who should not be ------------------------ */
  const innocents = frame.suspects.filter((s) => s !== killerId);
  const allowedOne = ded.directClears >= innocents.length ? innocents.length : ded.directClears;
  if (logic.solve.clearedByOne.length > allowedOne) {
    failures.push(`${logic.solve.clearedByOne.length} innocents are cleared by one rule`);
  }

  /* --- every innocent's lie is contradicted twice ----------------------------- */
  if (ded.secretLies) {
    for (const k of logic.confrontations) {
      if (k.personId === killerId) continue;
      if (k.contradictions.length < 2) failures.push(`${k.personId}'s lie has ${k.contradictions.length} way(s) to break it`);
    }
  }

  /* --- par, slack, budget -------------------------------------------------- */
  // Shorter nights: the range bounds the size of the game, walked the M9
  // way (`SolveSummary.walk`); the night is budgeted on the shorter `par`.
  const [lo, hi] = ded.par;
  const size = logic.solve.walk ?? c.par;
  if (size < lo) failures.push(`par ${size} (walked as M9 walked it) is under the floor of ${lo}`);
  if (size > hi) failures.push(`par ${size} (walked as M9 walked it) is over the ceiling of ${hi}`);
  if (c.par > size) failures.push(`par ${c.par} is longer than the M9 walk of ${size}`);
  const slack = logicSlackFor(shape, ladder, c.par, size, c.act.type);
  if (c.slack !== slack) failures.push(`slack ${c.slack} is not ${slack}`);
  if (c.budget !== c.par + c.slack) failures.push('budget is not par plus slack');

  /* --- the par route can be walked: every spine clue has a way in ------------- */
  const byId = new Map(c.findable.map((cl) => [cl.id, cl]));
  // A search is always on the page, so what a search finds is in hand to lead on.
  // M10: a par-route question the page leaves unmarked is on it all the same.
  const reached = new Set<Id>([
    ...c.starting,
    ...c.findable.filter((cl) => cl.source.type === 'place').map((cl) => cl.id),
    ...(logic.open ?? []),
  ]);
  const queue = [...reached];
  while (queue.length > 0) {
    const cur = byId.get(queue.shift() as Id);
    if (!cur) continue;
    for (const next of cur.leadsTo) {
      if (reached.has(next) || !byId.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
  }
  // A search is always on the page; a question needs a lead to it.
  for (const cl of c.findable) {
    if (cl.role === 'spine' && cl.source.type === 'person' && !reached.has(cl.id)) {
      failures.push(`spine clue ${cl.id} cannot be reached`);
    }
  }

  /* --- the deduction path, for the sheet --------------------------------- */
  const summary = logic.solve;
  deduction.timeOfDeath = summary.crimeTick.rules.slice();
  deduction.timeOfDeathAnchors = Array.from(
    new Set(summary.crimeTick.rules.map((id) => byId.get(id)?.anchorId).filter((x): x is Id => !!x)),
  ).sort();
  for (const id of innocents) deduction.exculpations[id] = (summary.cleared[id]?.rules ?? []).slice();
  deduction.inculpation = summary.culprit.rules.slice();
  const withFact = (pred: (f: Fact) => boolean): Id[] =>
    c.findable.filter((cl: Clue) => cl.establishes.some(pred)).map((cl) => cl.id);
  deduction.access = withFact((f) => f.kind === 'hadAccess' && f.personId === killerId);
  deduction.method = withFact((f) => f.kind === 'methodEvidence' && f.methodId === c.method.id);
  deduction.motive = withFact((f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === c.solution.motiveType);
  void whyNot;
  void L;

  return { ok: failures.length === 0, failures, deduction };
}
