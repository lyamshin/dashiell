/**
 * M8 §10 — beat coverage: the mechanical check over a run.
 *
 * Every night page carries every required beat for its shape, and no required
 * beat was cut; every clue the page delivered has a find beat; and the page's
 * words pass the four text rules — no epithet constructions, no subjectless
 * fragments, no hour texture that disagrees with the clock, no name without a
 * clause on its first appearance on the page. Plus the two continuity rules of
 * §7 that a text check can see: the client's exit line does not leak onto a
 * walk, and the sign-off "Don't leave town" is never said to the client.
 *
 * The target is a hundred percent, and a test holds it there.
 */

import { minutesAfter } from '../clock.js';
import type { CaseView } from '../derive.js';
import { gameBudget } from '../derive.js';
import type { Page, RunState } from '../types.js';
import { REQUIRED } from './plan.js';
import { epithetsIn, hourAgrees, isSubjectless, nameables, namesWithoutClause, sentencesOf } from './text.js';

export interface CoverageIssue {
  page: number;
  shape: string;
  rule:
    | 'missing-beat'
    | 'cut-required'
    | 'find-unwritten'
    | 'unanswered'
    | 'epithet'
    | 'fragment'
    | 'hour-texture'
    | 'unexplained-name'
    | 'leak'
    | 'sign-off';
  detail: string;
}

/** The text of a page that the reader reads as prose, in order. */
function proseOf(page: Page): string[] {
  const out: string[] = [];
  for (const b of page.blocks) {
    if (b.kind === 'prose' || b.kind === 'note') out.push(b.text);
    if (b.kind === 'presence' && b.text) out.push(b.text);
  }
  return out;
}

/** Narration only: the words inside quotation marks are somebody talking. */
function narration(text: string): string {
  return text.replace(/“[^”]*”/g, '“…”').replace(/"[^"]*"/g, '"…"');
}

/** The client's goodbye from the office (office.ts's CLIENT_LEAVING), by its one fixed phrase. */
const EXIT_LINE = /That[’']s where I[’']ll be/;

export function checkPageCoverage(
  view: CaseView,
  page: Page,
  minutes: number,
  recalls: { surname: string; recall: string }[] = [],
): CoverageIssue[] {
  const shape = page.shape;
  if (shape === undefined || shape === 'office' || shape === 'repeat' || shape === 'other') return [];
  const out: CoverageIssue[] = [];
  const add = (rule: CoverageIssue['rule'], detail: string): void => {
    out.push({ page: page.n, shape, rule, detail });
  };
  const beats = page.beats ?? [];
  const has = (kind: string): boolean => beats.some((b) => b.kind === kind && b.rendered);

  /* ------------------------------------------------------------ beats */
  for (const kind of REQUIRED[shape]) {
    if (kind === 'errand' && shape === 'ask') continue;
    if (!has(kind)) add('missing-beat', `${shape} has no ${kind}`);
  }
  if (shape === 'ask' && !has('errand')) {
    const carried = beats.some((b) => b.kind === 'exchange' && b.tag === 'carried');
    if (!carried) add('missing-beat', 'ask has neither a carry line nor a question that carries it');
  }
  if ((shape === 'arrive' || shape === 'search') && !has('thought') && !has('answer')) {
    add('unanswered', `${shape} neither thinks nor answers its errand`);
  }
  for (const b of beats) {
    if (b.required && !b.rendered) add('cut-required', `${b.kind}${b.tag ? ` (${b.tag})` : ''} was planned and not written`);
  }
  for (const id of page.found) {
    if (!beats.some((b) => b.kind === 'find' && b.rendered && (b.clueIds ?? []).includes(id))) {
      add('find-unwritten', `${id} was delivered with no find beat`);
    }
  }

  /* ------------------------------------------------------------- text */
  const texts = proseOf(page);
  for (const text of texts) {
    for (const e of epithetsIn(text, recalls)) add('epithet', e);
    for (const s of sentencesOf(narration(text))) {
      if (isSubjectless(s)) add('fragment', s);
      if (!hourAgrees(s, minutes)) add('hour-texture', `${s} (at ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')})`);
    }
    if (shape !== 'ask' && EXIT_LINE.test(text)) add('leak', text);
  }
  for (const name of namesWithoutClause(texts, nameables(view))) add('unexplained-name', name);
  const toClient = beats.some((b) => b.kind === 'exchange' && (b.personIds ?? [])[0] === view.client.id);
  if (toClient && texts.some((t) => /leave town/i.test(t))) add('sign-off', 'a sign-off for a suspect, said to the client');
  return out;
}

export interface CoverageReport {
  pages: number;
  covered: number;
  issues: CoverageIssue[];
  /** Required beats planned, and how many were written. */
  required: number;
  written: number;
}

/** The check over a whole run's night pages. */
export function checkRunCoverage(view: CaseView, state: RunState): CoverageReport {
  const budget = gameBudget(view.kase);
  const recalls = view.kase.people.flatMap((p) => {
    const recall = state.cast.portraits[p.id]?.pair?.recall;
    return recall ? [{ surname: p.surname, recall }] : [];
  });
  let used = 0;
  let pages = 0;
  let covered = 0;
  let required = 0;
  let written = 0;
  const issues: CoverageIssue[] = [];
  for (const page of state.log) {
    used += page.cost;
    const shape = page.shape;
    if (shape === undefined || shape === 'office' || shape === 'repeat' || shape === 'other') continue;
    pages++;
    for (const b of page.beats ?? []) {
      if (!b.required) continue;
      required++;
      if (b.rendered) written++;
    }
    const found = checkPageCoverage(view, page, minutesAfter(used, budget), recalls);
    if (found.length === 0) covered++;
    issues.push(...found);
  }
  return { pages, covered, issues, required, written };
}
