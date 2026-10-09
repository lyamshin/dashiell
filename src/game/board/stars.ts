/**
 * docs/43 §3: stars follow the motivated path.
 *
 * A star marks a question the player has been pointed to by something they
 * hold (4a.2's pointers), on the cheapest way from what they hold to the
 * report. Nothing is starred that what's held doesn't point at, the client is
 * never starred, and there are at most three a page.
 *
 * By tier:
 * - Raw and Coddled: generous. Every open step of every cheapest way on.
 * - Poached to Medium: the open steps of one cheapest way on.
 * - Hard-boiled: only the designed path's first two steps, while they're open.
 */

import { minimalSets } from '../../gen/board/path.js';
import { GIVENS, pointerIndex } from '../../gen/board/pointers.js';
import { questionsOf } from '../../gen/board/solver.js';
import type { Question } from '../../gen/board/types.js';
import { knownPeople, solveHeld, solveRun } from './knowledge.js';
import { cap, isMurder, nameOf, placeName, pronOf, solverHeld, type BoardCase, type BoardDeal, type BoardRun, type PersonId } from './model.js';

export interface Star {
  /** The question it serves. */
  q: string;
  /** Why, in the detective's voice: "Tramonti says Lindemann was with her at ten — ask Lindemann". */
  why: string;
}

/** The longest completion searched for. A night past this has wandered far; stars rest then. */
const MAX_REST = 9;

const REST = new Map<string, string[][]>();

/**
 * The cheapest sets of further questions, each pointed to by what's held or by
 * another in the set, that take what's held to a finished report. Empty when
 * it's finished already, or nothing within reach finishes it.
 */
export function completions(d: BoardDeal, run: Pick<BoardRun, 'asked'>): string[][] {
  const c = d.kase;
  const held = solverHeld(run);
  const key = `${c.id}|${held.join(',')}`;
  const hit = REST.get(key);
  if (hit) return hit;
  const heldSet = new Set(held);
  const idx = pointerIndex(c);
  const motive = d.analysis.motive;
  // Asked but not landed confrontations aren't held; a murder's motive search is in the pool (the report asks why).
  const pool = questionsOf(c)
    .map((q) => q.id)
    .filter((q) => !heldSet.has(q));
  const rank = new Map(d.analysis.suggested.map((s, i) => [s.q, i]));
  const pathRank = new Map(d.analysis.path.map((s, i) => [s.q, i]));
  pool.sort((a, b) => (pathRank.get(a) ?? 50) - (pathRank.get(b) ?? 50) || (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  const reachable = (extra: string[]): string[] => {
    const got = new Set<string>();
    for (let grew = true; grew; ) {
      grew = false;
      for (const q of extra) {
        if (got.has(q)) continue;
        const by = idx.by.get(q);
        if (!by) continue;
        if (by.has(GIVENS) || [...by.keys()].some((s) => heldSet.has(s) || got.has(s))) {
          got.add(q);
          grew = true;
        }
      }
    }
    return extra.filter((q) => got.has(q));
  };
  const needMotive = isMurder(c) && motive !== undefined && !heldSet.has(motive) && !run.asked.some((q) => q === `motive:${c.crime.culprit}`);
  const goal = (x: string[]): boolean => {
    const extra = reachable(x.filter((q) => !heldSet.has(q)));
    if (needMotive && !extra.includes(motive as string)) return false;
    return solveHeld(c, [...held, ...extra]).done;
  };
  let out: string[][] = [];
  if (!goal(held)) out = minimalSets(pool, held, goal, MAX_REST, true).map((s) => s.filter((q) => !heldSet.has(q)));
  if (REST.size > 300) REST.delete(REST.keys().next().value as string);
  REST.set(key, out);
  return out;
}

/** A question is open when what's held (or the office) points at it, and a confrontation when its claim is broken. */
export function isOpen(c: BoardCase, run: Pick<BoardRun, 'asked'>, q: string): boolean {
  if (run.asked.includes(q)) return false;
  if (q.startsWith('confront:')) {
    const k = q.slice('confront:'.length);
    return run.asked.includes(`account:${k.split('@')[0]}`) && solveRun(c, run).status.get(k)?.s === 'broken';
  }
  const by = pointerIndex(c).by.get(q);
  if (!by) return false;
  return by.has(GIVENS) || run.asked.some((a) => by.has(a));
}

/** The steps a star may go on tonight, best first. */
export function starredSteps(d: BoardDeal, run: Pick<BoardRun, 'asked'>): string[] {
  const c = d.kase;
  if (c.tier === 5) {
    // Hard-boiled: only the designed path's first two steps.
    return d.analysis.path.slice(0, 2).map((s) => s.q).filter((q) => isOpen(c, run, q));
  }
  const rest = completions(d, run);
  if (rest.length === 0) return [];
  const pathRank = new Map(d.analysis.path.map((s, i) => [s.q, i]));
  const order = (qs: string[]) => [...qs].sort((a, b) => (pathRank.get(a) ?? 50) - (pathRank.get(b) ?? 50));
  if (c.tier <= 1) {
    // Generous: every open step of every cheapest way on, the commonest first.
    const count = new Map<string, number>();
    for (const s of rest) for (const q of s) count.set(q, (count.get(q) ?? 0) + 1);
    return [...count.keys()].filter((q) => isOpen(c, run, q)).sort((a, b) => (count.get(b) as number) - (count.get(a) as number) || (pathRank.get(a) ?? 50) - (pathRank.get(b) ?? 50));
  }
  return order(rest[0] as string[]).filter((q) => isOpen(c, run, q));
}

/* ------------------------------------------------------------------ *
 * The reason, in a few plain words.
 * ------------------------------------------------------------------ */

/** "ask Brauer who was there", "ask Lindemann where she was", "search the table", "put it to Hargrove". */
export function actionWords(c: BoardCase, q: Question): string {
  const p = c.people.find((x) => x.id === q.subject);
  const name = p?.short ?? q.subject;
  if (q.kind === 'search') return `search ${c.finds.find((f) => f.id === q.subject)?.what ?? 'the room'}`;
  if (q.kind === 'list') return `ask ${name} who was there`;
  if (q.kind === 'confront') return `put it to ${name}`;
  return `ask ${name} where ${pronOf(c, q.subject).he} was`;
}

/**
 * Why a step is starred: what points at it, the latest thing held that does
 * (or the office), and what to do about it.
 */
export function starReason(c: BoardCase, run: Pick<BoardRun, 'asked'>, qid: string): string {
  const q = questionsOf(c).find((x) => x.id === qid);
  if (!q) return '';
  if (q.kind === 'confront') {
    const [p, hs] = q.subject === undefined ? ['', ''] : [q.subject, String(q.hour)];
    const st = solveRun(c, run).status.get(`${p}@${hs}`);
    const by = st?.deps.find((d) => d !== `account:${p}` && d !== qid);
    const src = by ? sourceName(c, by) : '';
    return `${nameOf(c, p)}’s story at ${hourWords(Number(hs))} against ${src || 'what I had'}`;
  }
  if (q.kind === 'search') {
    const f = c.finds.find((x) => x.id === q.subject);
    if (f?.gives.why) return isMurder(c) ? 'who had a reason? his papers' : 'who had a reason?';
    return isMurder(c) ? 'start where he died' : 'start where it went missing';
  }
  const by = pointerIndex(c).by.get(qid);
  if (!by) return '';
  let why: string | undefined;
  for (let i = run.asked.length - 1; i >= 0 && why === undefined; i--) why = by.get(run.asked[i] as string);
  why ??= by.get(GIVENS);
  if (!why) return '';
  // A watcher not met yet is asked for by the job ("ask the bartender who was there").
  let act = actionWords(c, q);
  if (q.kind === 'list' && !knownPeople(c, { asked: run.asked, visited: (run as Partial<BoardRun>).visited ?? [] }).has(q.subject)) {
    const job = (c.people.find((x) => x.id === q.subject)?.description ?? '').split(/,| at /)[0];
    if (job) act = act.replace(nameOf(c, q.subject), job);
  }
  return `${cap(shorten(why, nameOf(c, c.client)))} — ${act}`;
}

function hourWords(h: number): string {
  return ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'][h % 12] ?? String(h);
}

/** Whose answer a question id is: "Shapiro’s list", "Tramonti’s story". */
export function sourceName(c: BoardCase, q: string): string {
  const [kind, rest] = q.split(':') as [string, string];
  if (kind === 'list') return `${nameOf(c, rest)}’s list`;
  if (kind === 'account') return `${nameOf(c, rest)}’s story`;
  if (kind === 'search') return 'what the room said';
  if (kind === 'confront') return `${nameOf(c, rest.split('@')[0] as string)}’s word`;
  return 'the office';
}

/** The pointer's own words, made short: "Shapiro’s list has Tramonti at the Odessa at ten" → "Shapiro has Tramonti at the Odessa at ten". */
function shorten(why: string, client: string): string {
  return why
    .replace(/’s list has /, ' has ')
    .replace(/^the office names /, `${client} mentioned `)
    .replace(/^the office puts /, `${client} puts `)
    .replace(/^the office says /, `${client} says `)
    .replace(/^the office /, '');
}

/** A star's place in the page: where its question is asked. */
export function starPlace(c: BoardCase, qid: string): string {
  return questionsOf(c).find((x) => x.id === qid)?.at ?? '';
}

export function placeWords(c: BoardCase, id: string): string {
  return placeName(c, id);
}

export type { PersonId };
