/**
 * docs/43 §4: the grid is the board.
 *
 * Rows are the suspects the player knows of, then company-only witnesses once
 * met; columns are the hours, and one column is "could get the means". Each
 * cell shows what the player holds: what they say themselves, what somebody
 * else saw, a collision where those disagree (both lines on hover or tap),
 * and the player's own pencil. The crime hour is marked once known. Every
 * mark is read off the held lines and the solver on them, never the truth.
 */

import type { CellMark } from '../types.js';
import { linesHeld, accountOf, solveRun, knownPeople } from './knowledge.js';
import { cap, hourWord, isMurder, nameOf, personOf, placeName, suspectsOf, type BoardCase, type BoardRun, type Hour, type PersonId, type PlaceId } from './model.js';
import { sourceName } from './stars.js';

export interface BoardCell {
  /** Their own account's place at this hour. */
  says?: PlaceId;
  /** Where somebody else's word puts them: the place and whose word. */
  seen?: { place: PlaceId; by: string };
  /** Their own word agrees with somebody else's. */
  confirmed: boolean;
  /** Their own word and somebody else's disagree. */
  collision: boolean;
  /** A second story told when it was put to them, or what they owned up to. */
  second?: PlaceId;
  admitted?: PlaceId;
  /** The lines behind the cell, for the hover or tap. */
  lines: string[];
  pencil?: CellMark;
}

export interface BoardRow {
  id: PersonId;
  name: string;
  company: boolean;
  cells: Record<number, BoardCell>;
  /** Could get the means: yes, no, or not known yet. */
  means: 'yes' | 'no' | '?';
  meansWhy?: string;
}

export interface BoardGrid {
  hours: Hour[];
  rows: BoardRow[];
  /** The crime hour, once the player can know it. */
  crimeHour: Hour | null;
  /** The hours it could still have been. */
  window: Hour[];
  /** A short label for every place the grid names, and the key to them. */
  codes: Record<PlaceId, string>;
  meansLabel: string;
}

const STOP = new Set(['the', 'back', 'room', 'rooms', 'flat', 'place', 'shop', 'house', 'mrs.', 'mr.', 'card', 'night', 'desk', 'club', 'office']);

/** Short labels, unique within the case: "Odessa", "Rafferty", "Sokol". The scene is "scene". */
export function placeCodes(c: BoardCase): Record<PlaceId, string> {
  const out: Record<PlaceId, string> = {};
  const used = new Set<string>();
  for (const p of c.places) {
    let code: string;
    if (p.scene) code = isMurder(c) ? 'scene' : 'flat';
    else {
      const words = p.short
        .split(/\s+/)
        .map((w) => w.replace(/[’']s$/, '').replace(/[’']/g, ''))
        .filter((w) => w.length > 0 && !STOP.has(w.toLowerCase()));
      code = (words[0] ?? p.short).slice(0, 8);
      if (/card room/.test(p.short)) code = 'cards';
      if (/print shop/.test(p.short)) code = 'print';
      if (/exchange/.test(p.short)) code = 'exchange';
      if (/night desk/.test(p.short)) code = 'Graphic';
      if (/club office/.test(p.short)) code = 'Eagle';
    }
    let k = code;
    for (let i = 2; used.has(k); i++) k = `${code.slice(0, 7)}${i}`;
    used.add(k);
    out[p.id] = k;
  }
  return out;
}

export function boardGrid(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts' | 'visited' | 'marks'>): BoardGrid {
  const s = solveRun(c, run);
  const hours = c.board.hours;
  const known = knownPeople(c, run);
  const lines = linesHeld(c, run);
  const codes = placeCodes(c);
  const ids = [
    ...suspectsOf(c).filter((p) => known.has(p)),
    ...c.people.filter((p) => p.role === 'company' && known.has(p.id)).map((p) => p.id),
  ];
  const placed = s.placed;
  const rows: BoardRow[] = ids.map((id) => {
    const cells: Record<number, BoardCell> = {};
    const acc = run.asked.includes(`account:${id}`) ? accountOf(c, id) : undefined;
    for (const h of hours) {
      const k = `${id}@${h}`;
      const cell: BoardCell = { confirmed: false, collision: false, lines: [] };
      const says = acc?.claims[h]?.place;
      if (says) cell.says = says;
      const p = placed.get(k);
      const others = p ? p.deps.filter((d) => d !== `account:${id}`) : [];
      if (p && others.length > 0) cell.seen = { place: p.place, by: sourceName(c, others[0] as string) };
      const st = s.status.get(k);
      if (st?.s === 'broken') cell.collision = true;
      else if (says && cell.seen && cell.seen.place === says) cell.confirmed = true;
      // Admissions and second stories, once put.
      const k2 = c.confrontations.find((x) => x.person === id && x.hour === h);
      if (k2 && run.asked.includes(`confront:${id}@${h}`)) {
        const lie = c.lies.find((l) => l.person === id && l.hour === h);
        if (k2.response === 'admit' && lie) cell.admitted = lie.truth;
        if (k2.secondLie?.place) cell.second = k2.secondLie.place;
      }
      // The lines behind it.
      for (const l of lines) {
        if (l.hour !== h) continue;
        if (l.kind === 'claim' && l.speaker === id) cell.lines.push(`Says: ${l.text}`);
        else if (l.about.includes(id) || (cell.says && l.place === cell.says && (l.kind === 'list' || l.kind === 'claim'))) cell.lines.push(l.text);
      }
      if (run.marks[id]?.[String(h)]) cell.pencil = run.marks[id]?.[String(h)];
      cells[h] = cell;
    }
    // The means.
    let means: BoardRow['means'] = '?';
    let meansWhy: string | undefined;
    if (suspectsOf(c).includes(id)) {
      const yes = c.givens.access.includes(id) || c.means.available.some((h) => placed.get(`${id}@${h}`)?.place === c.means.origin);
      const no = !c.givens.access.includes(id) && c.means.available.every((h) => {
        const x = placed.get(`${id}@${h}`);
        return (x && x.place !== c.means.origin) || s.notPlaced.get(`${id}@${h}`)?.has(c.means.origin);
      });
      const meansKnown = run.asked.some((q) => q.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === q)?.gives.means) || !isMurder(c);
      if (meansKnown && yes) {
        means = 'yes';
        meansWhy = `${nameOf(c, id)} was at ${placeName(c, c.means.origin)} while it was there.`;
      } else if (meansKnown && no) {
        means = 'no';
        meansWhy = `${nameOf(c, id)} was never at ${placeName(c, c.means.origin)} while it was there.`;
      }
    }
    return { id, name: nameOf(c, id), company: personOf(c, id)?.role === 'company', cells, means, ...(meansWhy ? { meansWhy } : {}) };
  });
  const window = [...s.possibleHours];
  return {
    hours,
    rows,
    crimeHour: window.length === 1 ? (window[0] as Hour) : null,
    window,
    codes,
    meansLabel: isMurder(c) ? `could get the ${c.means.name.replace(/^(a|an) /, '')}` : 'knew the way in',
  };
}

/* ------------------------------------------------------------------ *
 * As text, for the play CLI and the read tool.
 * ------------------------------------------------------------------ */

/** One cell in a few characters: `Odessa✓`, `"Odessa"✗`, `[Sokol]`, `~Odessa` (pencil). */
export function cellText(g: BoardGrid, cell: BoardCell): string {
  const code = (p: PlaceId) => g.codes[p] ?? p;
  if (cell.collision) {
    const tail = cell.admitted ? `→${code(cell.admitted)}` : cell.second ? `→"${code(cell.second)}"` : '';
    return `"${code(cell.says ?? '')}"✗${tail}`;
  }
  if (cell.confirmed && cell.says) return `${code(cell.says)}✓`;
  if (cell.seen) return `[${code(cell.seen.place)}]`;
  if (cell.says) return `"${code(cell.says)}"`;
  if (cell.pencil?.at) return `~${code(cell.pencil.at)}`;
  if (cell.pencil?.notAt?.length) return `~not ${code(cell.pencil.notAt[0] as string)}`;
  return '·';
}

export function boardGridText(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts' | 'visited' | 'marks'>): string {
  const g = boardGrid(c, run);
  const out: string[] = [];
  out.push('WHERE THEY WERE');
  if (g.rows.length === 0) {
    out.push('', 'Nobody on it yet.');
    return out.join('\n');
  }
  const w0 = Math.max(6, ...g.rows.map((r) => r.name.length)) + 2;
  const cells = g.rows.flatMap((r) => g.hours.map((h) => cellText(g, r.cells[h] as BoardCell)));
  const cw = Math.max(9, ...cells.map((x) => x.length + 2));
  const head = g.hours.map((h) => `${hourWord(h)}${g.crimeHour === h ? ' !' : g.window.includes(h) && g.crimeHour === null ? ' ?' : ''}`.padEnd(cw)).join('');
  out.push(`${''.padEnd(w0)}${head}means`);
  for (const r of g.rows) {
    out.push(`${r.name.padEnd(w0)}${g.hours.map((h) => cellText(g, r.cells[h] as BoardCell).padEnd(cw)).join('')}${r.means}`);
  }
  out.push('');
  out.push(`"X" says so ${''}·  [X] somebody else puts them there  ·  X✓ both  ·  "X"✗ collides  ·  →Y owned up  ·  ~X your pencil`);
  out.push(`${g.crimeHour !== null ? `! the hour it happened` : `? the hours it could have been`}  ·  means: ${g.meansLabel}`);
  out.push(`Places: ${Object.entries(g.codes).map(([id, code]) => `${code} = ${placeName(c, id)}`).join('; ')}`);
  const coll = g.rows.flatMap((r) => g.hours.filter((h) => r.cells[h]?.collision).map((h) => ({ r, h })));
  if (coll.length > 0) {
    out.push('');
    out.push('COLLISIONS');
    for (const { r, h } of coll) {
      out.push(`${r.name}, ${hourWord(h)}:`);
      for (const l of r.cells[h]?.lines ?? []) out.push(`  ${l}`);
    }
  }
  return out.join('\n');
}

export { cap };
