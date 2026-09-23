/**
 * M9 — the solver, as the engine calls it.
 *
 * Everything here reads a finished `Case` and the ids of the clues the player
 * holds. Nothing reads the truth, so what it says is what the notebook
 * supports — which is what a report or a confrontation has to be checked
 * against. See `docs/20-m9-gen-notes.md` §6.
 */

import type { AcquaintanceEdge, Case, Id, Tick } from '../types.js';
import { deductionOf, dialsOf } from '../shape.js';
import { frameOf } from './check.js';
import { problemOf } from './select.js';
import { crimeTicks, culpritOf, placesAt, solve, whyNot, type SolverState, type Why } from './solver.js';

export interface HeldOptions {
  /**
   * Take accounts the notebook corroborates as standing (the default), or
   * reason from what others said and what was found only. A partial notebook
   * can take a lie for the truth when the facts that break it are not in hand
   * yet; `false` never does.
   */
  soft?: boolean;
  /** Test hypotheses where propagation stalls. Defaults to the tier's need for one. */
  probe?: boolean;
  /**
   * The people the detective has broken twice: their confessions are in the
   * notebook. By default, every confession whose lie the held clues break.
   */
  confessed?: Id[];
}

/** Solve the grid from the clues the player holds. */
export function solveHeld(kase: Case, held: Id[], opts: HeldOptions = {}): SolverState {
  const heldSet = new Set(held);
  const clues = kase.findable.filter((c) => heldSet.has(c.id));
  const frame = frameOf(kase);
  if (opts.confessed) {
    const allowed = new Set(opts.confessed);
    frame.confessions = (frame.confessions ?? []).filter((r) => allowed.has(r.when?.personId ?? ''));
  }
  const soft = opts.soft ?? true;
  const probe = opts.probe ?? deductionOf(dialsOf(kase).shape).hypothesis;
  const usable = soft ? clues : clues.map((c) => ({ ...c, establishes: c.establishes.filter((f) => f.kind !== 'claims') }));
  return solve(problemOf(frame, usable, probe)).state;
}

/**
 * Does what the player holds break this person's claim — the place, at any
 * of these half hours? The notebook as it stands: other people's accounts
 * count where something corroborates them, which is how a chain breaks the
 * culprit's word. `rules` is the clue ids that do it, for the page to point
 * at. Pass `{ soft: false }` to count only what others saw and what was found.
 */
export function contradicts(
  kase: Case,
  held: Id[],
  claim: { personId: Id; place: Id; ticks: Tick[] },
  opts: HeldOptions = {},
): { yes: boolean; rules: Id[]; depth: number } {
  const st = solveHeld(kase, held, opts);
  for (const t of claim.ticks) {
    const w = whyNot(st, claim.personId, t, claim.place);
    if (w) return { yes: true, rules: idsOf(st, w), depth: w.depth };
  }
  return { yes: false, rules: [], depth: 0 };
}

/** What the notebook settles about the crime: the half hour, the culprit, the column. */
export function crimeFromHeld(
  kase: Case,
  held: Id[],
  opts: HeldOptions = {},
): { ticks: Tick[]; culprit: Id | null; column: Record<Id, Id[]> } {
  const st = solveHeld(kase, held, opts);
  const ticks = crimeTicks(st);
  const who = culpritOf(st);
  const column: Record<Id, Id[]> = {};
  const t = ticks.length === 1 ? (ticks[0] as Tick) : kase.solution.murderTick;
  for (const s of st.problem.suspects) column[s] = placesAt(st, s, t);
  return { ticks, culprit: who?.id ?? null, column };
}

/**
 * M10 Part B: who the notebook keeps out of the room it happened in, at every
 * half hour it could have happened in, and on which clues. A page may say
 * "That cleared X" at Raw and Coddled only once `rules` holds two or more:
 * two facts that agree, such as their own account and a sighting inside it
 * (`clearedByTwo`). Accounts count where something corroborates them, as
 * everywhere; nothing here reads the truth.
 */
export function clearedBy(kase: Case, held: Id[], opts: HeldOptions = {}): Record<Id, Id[]> {
  const st = solveHeld(kase, held, opts);
  const ticks = crimeTicks(st);
  const scene = kase.solution.murderPlaceId;
  const out: Record<Id, Id[]> = {};
  if (ticks.length === 0) return out;
  for (const s of st.problem.suspects) {
    const rules = new Set<Id>();
    let clear = true;
    for (const t of ticks) {
      const w = whyNot(st, s, t, scene);
      if (!w) {
        clear = false;
        break;
      }
      for (const id of idsOf(st, w)) rules.add(id);
    }
    if (clear) out[s] = [...rules];
  }
  return out;
}

/** The suspects the notebook clears on two clues or more (`clearedBy`). */
export function clearedByTwo(kase: Case, held: Id[], opts: HeldOptions = {}): Id[] {
  return Object.entries(clearedBy(kase, held, opts))
    .filter(([, rules]) => rules.length >= 2)
    .map(([id]) => id);
}

/** How `from` knows `to`, from the case's acquaintance graph. */
export function acquaintanceOf(kase: Case, from: Id, to: Id): AcquaintanceEdge | undefined {
  return kase.logic?.acquaintance.find((e) => e.from === from && e.to === to);
}

/**
 * The words `from` uses for `to`: a name, "my landlord", "the tall one I know
 * by sight", or a description. Falls back to the surname on a case without
 * the graph.
 */
export function referenceOf(kase: Case, from: Id, to: Id): string {
  return acquaintanceOf(kase, from, to)?.ref ?? kase.people.find((p) => p.id === to)?.surname ?? to;
}

/** Can `from` be asked about `to` by name? */
export function knowsByName(kase: Case, from: Id, to: Id): boolean {
  const s = acquaintanceOf(kase, from, to)?.strength;
  return s === undefined || s === 'name' || s === 'relation';
}

function idsOf(st: SolverState, w: Why): Id[] {
  return w.rules
    .map((r) => st.problem.rules[r]?.id as Id)
    .filter((id) => id !== undefined && id !== 'given' && !id.startsWith('confess:'));
}
