/**
 * docs/67: hints. No star appears on a page by itself; a hint gives one.
 *
 * | tier | hints a night |
 * |---|---|
 * | Raw | unlimited |
 * | Coddled | 3 |
 * | Poached | 1 |
 * | Soft-boiled, Medium, Hard-boiled | none (no button) |
 *
 * One hint stars one step, with its reason, exactly as a star read before (`stars.ts` `hintStep`,
 * `starReason`), and the star stays until the step is taken or is no longer on a cheapest way. A hint
 * costs no action and no points; the count is the cost, and the verdict says how many were taken. A
 * player never pays twice for the same step: pressing again when nothing new can be starred says so,
 * free. With nothing left to find, it says the report can be closed (at Raw, with the elimination the
 * walk thought used to say); on the report page, what's still missing.
 *
 * The words are chrome (docs/64): plain modern English, never the detective's voice; the star's
 * reason is the star's own.
 */

import { solveRun } from './knowledge.js';
import { andList, cap, hourWord, nameOf, suspectsOf, tierName, type BoardDeal, type BoardRun, type Hour, type PersonId, type TierIndex } from './model.js';
import { hintStep, hintWords, reportReady, starCommand, starredSteps } from './stars.js';
import { eliminationOf } from './thought.js';
import { FACE_MARK, faceMarkDue } from './grid.js';

/** Hints a night, by tier (Raw first). */
export const HINTS_A_NIGHT: readonly number[] = [Infinity, 3, 1, 0, 0, 0];

export function hintsAllowed(tier: TierIndex | number): number {
  return HINTS_A_NIGHT[tier] ?? 0;
}

/** Whether tonight's tier has a Hint button at all. */
export function hasHints(tier: TierIndex | number): boolean {
  return hintsAllowed(tier) > 0;
}

/** Hints taken tonight: the ones that gave something new. */
export function hintsUsed(run: Pick<BoardRun, 'hints'>): number {
  return (run.hints ?? []).length;
}

/** Hints left tonight (Infinity at Raw). */
export function hintsLeft(run: Pick<BoardRun, 'tier' | 'hints'>): number {
  return Math.max(0, hintsAllowed(run.tier) - hintsUsed(run));
}

/** "one hint", "two hints" (a count said in words, as the first page says it). */
const COUNT = ['no', 'one', 'two', 'three'];

/**
 * The night's first page, where the Hard-boiled star note sat (docs/67 §4): tonight's count, in
 * chrome. Soft-boiled is the first tier without hints and says so; Medium says nothing; Hard-boiled
 * keeps its mark line (docs/66, `FACE_MARK`).
 */
export function hintsNote(d: BoardDeal, run: Pick<BoardRun, 'log'>): string | null {
  const t = d.kase.tier;
  // (Round 7, U4: Hard-boiled's mark line once a night, on the page that brings the first coat or hat,
  // never on page one before anybody has seen one.)
  if (faceMarkDue(d.kase, run)) return FACE_MARK;
  if (run.log.length !== 1) return null;
  const n = hintsAllowed(t);
  if (n === Infinity) return 'Hints are unlimited tonight.';
  if (n > 0) return `You have ${COUNT[n] ?? n} ${n === 1 ? 'hint' : 'hints'} tonight.`;
  if (t === 3) return 'No hints from here on.';
  return null;
}

/** The button's words: "Hint" at Raw, "Hint (2 left)", "Hint (none left)". */
export function hintLabel(run: Pick<BoardRun, 'tier' | 'hints'>): string {
  const allowed = hintsAllowed(run.tier);
  if (allowed === Infinity) return 'Hint';
  const left = hintsLeft(run);
  return `Hint (${left === 0 ? 'none' : left} left)`;
}

/** The CLI's line under a page's choices, on a tier with hints: "Hints: 2 left (`hint`)." */
export function hintsLine(run: Pick<BoardRun, 'tier' | 'hints'>): string | null {
  const allowed = hintsAllowed(run.tier);
  if (allowed === 0) return null;
  if (allowed === Infinity) return 'Hints: unlimited (`hint`).';
  const left = hintsLeft(run);
  return left === 0 ? 'Hints: none left.' : `Hints: ${left} left (\`hint\`).`;
}

/** What a press of the button did. */
export interface HintSaid {
  /** A new step starred; the report ready; the starred step again (free); nothing to point to (free). */
  kind: 'step' | 'ready' | 'again' | 'none';
  /** The step starred (or still starred). */
  q: string | null;
  /** What the book's note and the CLI say. */
  text: string;
  /** It spent a hint. */
  spent: boolean;
}

export type HintResult = { run: BoardRun; said: HintSaid } | { error: string };

/**
 * Take a hint (docs/67 §1). The run gets a record when the hint gives something new; pressing again
 * on a starred step, or on a ready report, is free and records nothing.
 */
export function takeHint(d: BoardDeal, run: BoardRun): HintResult {
  const c = d.kase;
  if (!hasHints(c.tier)) return { error: `There are no hints at ${tierName(c.tier)}.` };
  if (run.filed) return { error: 'The case is closed.' };
  if (hintsLeft(run) <= 0) return { error: 'No hints left tonight.' };
  const page = run.log.length - 1;
  const add = (q: string | null): BoardRun => ({ ...run, hints: [...(run.hints ?? []), { page, q }] });
  const starred = starredSteps(d, run);
  if (reportReady(d, run)) {
    const given = (run.hints ?? []).some((h) => h.q === null);
    const text = readyText(d, run);
    return given ? { run, said: { kind: 'ready', q: null, text, spent: false } } : { run: add(null), said: { kind: 'ready', q: null, text, spent: true } };
  }
  if (run.reportOpen) {
    // The report page: no choice to star, so the step in words. A step starred already is said again, free.
    const q = starred[0] ?? hintStep(d, run, [], false);
    if (!q) return { run, said: { kind: 'none', q: null, text: withWalk(d, run, 'There’s nothing new to point to from here.'), spent: false } };
    const text = withWalk(d, run, `Still missing: ${hintWords(c, run, q)}.`);
    return starred.includes(q) ? { run, said: { kind: 'again', q, text, spent: false } } : { run: add(q), said: { kind: 'step', q, text, spent: true } };
  }
  const q = hintStep(d, run, starred);
  if (!q) {
    if (starred[0]) return { run, said: { kind: 'again', q: starred[0], text: withWalk(d, run, pageStarsCount(d, run) > 1 ? 'The starred choices are still your best next steps.' : 'The starred choice is still your best next step.'), spent: false } };
    return { run, said: { kind: 'none', q: null, text: withWalk(d, run, 'There’s nothing new to point to from here.'), spent: false } };
  }
  const next = add(q);
  return { run: next, said: { kind: 'step', q, text: withWalk(d, next, `Hint: ${stepWhy(d, next, q)}.`), spent: true } };
}

/** How many choices the standing stars sit on (two steps in one far room are one walk). */
function pageStarsCount(d: BoardDeal, run: BoardRun): number {
  return new Set(starredSteps(d, run).map((q) => starCommand(d, run, q)).filter(Boolean)).size;
}

/** The star's reason, as the choice it sits on says it (a walk says where). */
function stepWhy(d: BoardDeal, run: BoardRun, q: string): string {
  return hintWords(d.kase, run, q, starCommand(d, run, q)?.startsWith('go ') ?? false);
}

/** "You have what you need to close the case.", and on the report page, that it can be filled in. */
function readyText(d: BoardDeal, run: BoardRun): string {
  return withWalk(d, run, run.reportOpen ? 'You can fill in the report from what you have.' : 'You have what you need to close the case.');
}

/**
 * docs/67 §2: Raw's walk thought, moved into the hint. Once who is settled on what's held, the
 * elimination ("…That left one person who could have had the spare key, with nobody to back up
 * where they were at ten."); before that, with one suspect not cleared and the hour still open,
 * "That left Feeney, and the clock still open between ten and eleven." Raw only.
 */
export function rawWalk(d: BoardDeal, run: BoardRun): string | null {
  const c = d.kase;
  if (c.tier !== 0) return null;
  const a = solveRun(c, run);
  if (a.who !== undefined) {
    const el = eliminationOf(c, run, run.at);
    return el ? el.sentences.join(' ') : null;
  }
  const left = suspectsOf(c).filter((p) => !a.cleared.has(p));
  if (left.length === 1 && a.possibleHours.length > 1) {
    const [h0, h1] = [a.possibleHours[0] as Hour, a.possibleHours[a.possibleHours.length - 1] as Hour];
    return `That left ${andList(left.map((p) => nameOf(c, p as PersonId)))}, and the clock still open between ${hourWord(h0)} and ${hourWord(h1)}.`;
  }
  return null;
}

function withWalk(d: BoardDeal, run: BoardRun, text: string): string {
  const walk = rawWalk(d, run);
  return walk ? `${text} ${cap(walk)}` : text;
}

/**
 * The note under the button when the page is drawn again (a reload, a page later): the ready line,
 * which stays true once given, or the last hint's step while its star stands and it was taken on
 * this page. Null otherwise: the stars speak for themselves.
 */
export function hintStanding(d: BoardDeal, run: BoardRun): string | null {
  const hs = run.hints ?? [];
  if (hs.some((h) => h.q === null) && reportReady(d, run)) return readyText(d, run);
  const last = hs[hs.length - 1];
  if (!last?.q || last.page !== run.log.length - 1) return null;
  if (run.reportOpen) return withWalk(d, run, `Still missing: ${hintWords(d.kase, run, last.q)}.`);
  return starredSteps(d, run).includes(last.q) ? withWalk(d, run, `Hint: ${stepWhy(d, run, last.q)}.`) : null;
}
