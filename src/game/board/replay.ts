/**
 * curtain (docs/76): behind the curtain, how the case came together. Two tracks:
 *
 * - the fastest solve: the designed path, worded as the curtain words it (`curtainSheet`), and the
 *   papers for the motive (its "+");
 * - your night: every question, search and confrontation the player made, in the order they made
 *   them, labelled as the curtain labels an action (`actionLabel`).
 *
 * Each step carries the notebook's grid as it stood after it (`boardGrid` on the questions held so
 * far), the cells it changed and the stories it broke. The grid is read as the held lines prove it: a
 * coat or a hat a watcher saw is put on its owner, so a clash that rests on a face shows at the step
 * that brings it (the notebook leaves that match to the player's own mark). Nobody's guess is on it.
 *
 * Built only when the curtain opens; nothing here is dealt or scored.
 */

import { boardGrid, type BoardCell, type BoardGrid } from './grid.js';
import { listOf } from './knowledge.js';
import { OFFICE, andList, cap, placeName, pronOf, type BoardDeal, type BoardRun, type Hour, type PersonId, type PlaceId } from './model.js';
import { actionLabel, confrontWords, curtainSheet, kindsWords, type CurtainSheet } from './report.js';
import { questionById } from '../../gen/board/solver.js';
import type { CellMark } from './types.js';

export type TrackKind = 'fastest' | 'night';

/** The track's name, as its switch says it. */
export const TRACK_NAMES: Record<TrackKind, string> = { fastest: 'The fastest solve', night: 'Your night' };

/** The last position on either track: every cell true, the lies struck. */
export const WHOLE_TRUTH = 'The whole truth';

export interface ReplayStep {
  /** "1", "2", …; the motive's "+". */
  n: string;
  q: string;
  label: string;
  /** Why, as the curtain says it (the fastest solve), or what came of it (a confrontation); else empty. */
  why: string;
  /** The notebook's grid after this step. */
  grid: BoardGrid;
  /** The cells (`person@hour`) this step changed. */
  added: string[];
  /** The cells whose story this step broke (the notebook's clash, ✗). */
  broke: string[];
}

export interface ReplayTrack {
  kind: TrackKind;
  /** "13 actions (6 questions, a search, a look at the papers for the motive and 5 walks)" */
  caption: string;
  steps: ReplayStep[];
  /** The grid before the first step: what the client said. */
  start: BoardGrid;
}

/** "Step 3 of 7", the motive's step, or the whole truth: where a track stands, said. */
export function positionWords(track: ReplayTrack, i: number): string {
  const s = track.steps[i];
  if (!s) return WHOLE_TRUTH;
  if (s.n === '+') return 'The motive';
  const count = track.steps.filter((x) => x.n !== '+').length;
  return `Step ${s.n} of ${count}`;
}

/** The truth about a cell, as one sentence: "She was at Grasso’s place, with Grasso." A lie says what they said first. */
export function cellTruth(d: BoardDeal, sheet: CurtainSheet, person: PersonId, h: Hour): string {
  const c = d.kase;
  const row = sheet.board.rows.find((r) => r.id === person);
  const cell = row?.cells.find((x) => x.hour === h);
  if (!row || !cell) return '';
  const pr = pronOf(c, person);
  const company = sheet.board.rows.filter((r) => r.id !== person && r.cells.find((x) => x.hour === h)?.place === cell.place).map((r) => r.name);
  const was = `${pr.he} was at ${placeName(c, cell.place)}${company.length ? `, with ${andList(company)}` : ''}`;
  const lie = sheet.lies.items.find((l) => l.person === person && l.hour === h);
  return lie ? `${lie.said.lead}${lie.said.where}${lie.said.tail}; ${was}.` : `${cap(was)}.`;
}

/**
 * When a cell came out on a track, in a sentence: "Known from step 5.", "She was caught out at step 7.",
 * "Only his own word, from step 3."; or, never on the board, "The fastest solve never needed it." /
 * "You never found it out."
 */
export function cellKnown(d: BoardDeal, sheet: CurtainSheet, track: ReplayTrack, person: PersonId, h: Hour): string {
  const truth = sheet.board.rows.find((r) => r.id === person)?.cells.find((x) => x.hour === h)?.place;
  const k = `${person}@${h}`;
  const pr = pronOf(d.kase, person);
  const at = (g: BoardGrid) => g.rows.find((r) => r.id === person)?.cells[h];
  const settled = (x: BoardCell | undefined) => !!x && (x.seen?.place === truth || x.admitted === truth);
  const shown = (x: BoardCell | undefined) => !!x && (!!x.says || !!x.seen);
  const name = (i: number) => (track.steps[i] as ReplayStep).n;
  const broke = track.steps.findIndex((s) => s.broke.includes(k));
  const known = settled(at(track.start)) ? -1 : track.steps.findIndex((s) => settled(at(s.grid)));
  const said = shown(at(track.start)) ? -1 : track.steps.findIndex((s) => shown(at(s.grid)));
  const out: string[] = [];
  // (docs/64: "breaks" is retired from the chrome; the game's word is caught out.)
  if (broke >= 0) out.push(`${cap(pr.he)} was caught out at step ${name(broke)}.`);
  if (known === -1 && settled(at(track.start))) out.push('Known from the start.');
  else if (known >= 0) out.push(`Known from step ${name(known)}.`);
  if (out.length) return out.join(' ');
  if (said >= 0) return `Only ${pr.his} own word, from step ${name(said)}.`;
  if (said === -1 && shown(at(track.start))) return `Only ${pr.his} own word, from the start.`;
  return track.kind === 'fastest' ? 'The fastest solve never needed it.' : 'You never found it out.';
}

/** A coat or a hat each held list saw, put on its owner: the match the notebook leaves to the player's mark. */
function faceMarks(d: BoardDeal, asked: readonly string[]): Record<PersonId, Record<string, CellMark>> {
  const c = d.kase;
  const out: Record<PersonId, Record<string, CellMark>> = {};
  for (const q of asked) {
    if (!q.startsWith('list:')) continue;
    const l = listOf(c, q.slice('list:'.length) as PersonId);
    if (!l) continue;
    for (const [hs, es] of Object.entries(l.entries)) {
      for (const e of es ?? []) {
        if (!('look' in e)) continue;
        const owner = c.people.find((p) => p.look === e.look);
        if (owner) out[owner.id] = { ...(out[owner.id] ?? {}), [hs]: { at: l.place } };
      }
    }
  }
  return out;
}

/** The grid on what's held, as the lines prove it, with no guess on it. */
function gridOn(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts' | 'visited'> & Partial<Pick<BoardRun, 'log'>>): BoardGrid {
  // (docs/83: the solver's grid, ✗ and all, whatever the flag: the curtain shows every clash.)
  const g = boardGrid(d.kase, { ...run, marks: faceMarks(d, run.asked) }, { solved: true });
  for (const r of g.rows) {
    for (const h of g.hours) {
      const cell = r.cells[h];
      if (!cell) continue;
      delete cell.pencil;
      cell.lines = cell.lines.filter((t) => !t.startsWith('Your guess:'));
    }
  }
  return g;
}

/** What a cell shows, for telling which cells a step changed. */
function cellSign(cell: BoardCell | undefined): string {
  if (!cell) return '';
  return [cell.says ?? '', cell.seen?.place ?? '', cell.confirmed ? 'c' : '', cell.collision ? 'x' : '', cell.second ?? '', cell.admitted ?? '', cell.secondClash ? 'x2' : ''].join('|');
}

const BLANK = cellSign({ confirmed: false, collision: false, lines: [] });

function diff(before: BoardGrid, after: BoardGrid): { added: string[]; broke: string[] } {
  const added: string[] = [];
  const broke: string[] = [];
  for (const r of after.rows) {
    const was = before.rows.find((x) => x.id === r.id);
    for (const h of after.hours) {
      const a = r.cells[h];
      const b = was?.cells[h];
      const now = cellSign(a) || BLANK;
      if (now !== BLANK && now !== (cellSign(b) || BLANK)) added.push(`${r.id}@${h}`);
      if (a?.collision && !b?.collision) broke.push(`${r.id}@${h}`);
    }
  }
  return { added, broke };
}

/** Where each question is asked, so the grid knows who's been met there. */
function placesOf(d: BoardDeal, asked: readonly string[]): PlaceId[] {
  const out: PlaceId[] = [];
  for (const q of asked) {
    const at = questionById(d.kase, q)?.at;
    if (at && !out.includes(at)) out.push(at);
  }
  return out;
}

/** The fastest solve, step by step. */
export function fastestTrack(d: BoardDeal, sheet: CurtainSheet = curtainSheet(d)): ReplayTrack {
  const start = gridOn(d, { asked: [], puts: [], visited: [] });
  let before = start;
  const asked: string[] = [];
  const steps: ReplayStep[] = sheet.fastest.steps.map((s) => {
    asked.push(s.q);
    const grid = gridOn(d, { asked: [...asked], puts: [], visited: placesOf(d, asked) });
    const { added, broke } = diff(before, grid);
    before = grid;
    return { n: s.n, q: s.q, label: s.label, why: s.why, grid, added, broke };
  });
  return { kind: 'fastest', caption: `${sheet.fastest.par} actions (${sheet.fastest.kinds})`, steps, start };
}

/** The paid pages of a night that asked something: a question, a search, a confrontation (landed or not). */
const ASKING = new Set(['account', 'list', 'search', 'motive', 'confront']);

/** The player's own night, step by step, in the order they did it. */
export function nightTrack(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts' | 'log' | 'used'>): ReplayTrack {
  const c = d.kase;
  const start = gridOn(d, { asked: [], puts: [], visited: [] });
  let before = start;
  const asked: string[] = [];
  const visited: PlaceId[] = [];
  const steps: ReplayStep[] = [];
  const counts = { questions: 0, searches: 0, confrontations: 0, papers: false, walks: 0 };
  for (const p of run.log) {
    if (p.cost > 0 && p.at && p.at !== OFFICE && !visited.includes(p.at)) visited.push(p.at);
    if (p.cost <= 0) continue;
    if (p.board.job === 'arrive') counts.walks++;
    const q = p.board.q;
    if (!q || !ASKING.has(p.board.job)) continue;
    if (p.board.job === 'search') {
      if (q === d.analysis.motive) counts.papers = true;
      else counts.searches++;
    } else if (p.board.job === 'confront') counts.confrontations++;
    else counts.questions++;
    if (run.asked.includes(q) && !asked.includes(q)) asked.push(q);
    const puts = run.puts.filter((x) => x.page <= p.n);
    const grid = gridOn(d, { asked: [...asked], puts, visited: [...visited], log: run.log.slice(0, p.n + 1) });
    const { added, broke } = diff(before, grid);
    before = grid;
    let why = '';
    if (q.startsWith('confront:')) {
      const [who, hs] = q.slice('confront:'.length).split('@') as [PersonId, string];
      const pr = pronOf(c, who);
      why = run.asked.includes(q) && puts.some((x) => x.person === who && x.hour === Number(hs) && x.landed) ? `${cap(pr.he)} ${confrontWords(d, who, Number(hs) as Hour)}.` : `${cap(pr.he)} stood by ${pr.his} story.`;
    }
    steps.push({ n: String(steps.length + 1), q, label: actionLabel(d, q), why, grid, added, broke });
  }
  const used = run.used;
  return { kind: 'night', caption: `${used} ${used === 1 ? 'action' : 'actions'} (${kindsWords(counts)})`, steps, start };
}
