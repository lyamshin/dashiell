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

import type { CellMark } from './types.js';
import { linesHeld, lineShown, accountOf, solveRun, knownPeople, knownPlaces, faceUnmatched } from './knowledge.js';
import { cap, hourWord, isMurder, nameOf, personOf, placeName, suspectsOf, type BoardCase, type BoardRun, type Hour, type PersonId, type PlaceId } from './model.js';
import { sourceName } from './stars.js';
import { meansKnew } from './bones/phrase.js';

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
  /** docs/47 A5: the dead man's row, or the lost pet's: where somebody's word puts them, hour by hour. */
  victim?: boolean;
  cells: Record<number, BoardCell>;
  /** Could get the means: yes, no, or not known yet. Empty on the victim's row. */
  means: 'yes' | 'no' | '?' | '';
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

export function boardGrid(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts' | 'visited' | 'marks'> & Partial<Pick<BoardRun, 'log'>>): BoardGrid {
  const s = solveRun(c, run);
  const hours = c.board.hours;
  const known = knownPeople(c, run);
  const lines = linesHeld(c, run);
  const codes = placeCodes(c);
  // docs/47 A5: the dead man, or the lost pet, has a row of his own: where somebody's word put him.
  const victim = personOf(c, c.crime.victim);
  const victimRow = isMurder(c) || c.type === 'lost-pet';
  const ids = [
    ...(victimRow && victim ? [victim.id] : []),
    ...suspectsOf(c).filter((p) => known.has(p)),
    ...c.people.filter((p) => p.role === 'company' && known.has(p.id)).map((p) => p.id),
  ];
  const placed = s.placed;
  /** A held line from somebody else that puts them at that place at that hour: a second source. */
  const support = (id: PersonId, h: Hour, place: PlaceId) => lines.find((l) => l.hour === h && l.place === place && l.speaker !== id && l.about.includes(id) && l.kind !== 'find');
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
      // Seen only on somebody else's held word for that place and hour, never on the solver's say alone,
      // so ✓ means two sources agree (docs/47 A5).
      const by = p && others.length > 0 ? support(id, h, p.place) : undefined;
      if (p && by) cell.seen = { place: p.place, by: sourceName(c, by.q) };
      const st = s.status.get(k);
      // docs/65 §3: a clash that rests on a face not yet matched to a name is the player's to find.
      if (st?.s === 'broken' && !faceUnmatched(c, run, id, h)) cell.collision = true;
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
        if (l.kind === 'claim' && l.speaker === id) cell.lines.push(lineShown(c, run, l));
        else if (l.about.includes(id) || (cell.says && l.place === cell.says && (l.kind === 'list' || l.kind === 'claim'))) cell.lines.push(lineShown(c, run, l));
      }
      if (run.marks[id]?.[String(h)]) cell.pencil = run.marks[id]?.[String(h)];
      cells[h] = cell;
    }
    // The means: the same for everybody on the grid who could have had it, a lodger or a regular as
    // much as a suspect (docs/47 A5). The victim's row has none.
    let means: BoardRow['means'] = id === c.crime.victim ? '' : '?';
    let meansWhy: string | undefined;
    if (id !== c.crime.victim) {
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
    const isVictim = id === c.crime.victim;
    return { id, name: isVictim && isMurder(c) ? `${nameOf(c, id)} †` : nameOf(c, id), company: personOf(c, id)?.role === 'company', ...(isVictim ? { victim: true } : {}), cells, means, ...(meansWhy ? { meansWhy } : {}) };
  });
  // docs/46 §2 marked the hours the office gave and left the narrowing to the player. docs/47 A5: the
  // victim's row shows the sighting, so the grid narrows with it: an hour the victim's row puts him
  // somewhere other than the scene is no longer one it could have been. The thought still stops at the link.
  const office = c.givens.window ?? c.crime.window;
  const vrow = rows.find((r) => r.victim);
  const away = (h: Hour) => {
    const seen = vrow?.cells[h]?.seen;
    return !!seen && seen.place !== c.crime.scene;
  };
  const window = c.tier === 0 ? [...s.possibleHours] : office.filter((h) => !away(h)).length > 0 ? office.filter((h) => !away(h)) : [...office];
  return {
    hours,
    rows,
    crimeHour: window.length === 1 ? (window[0] as Hour) : null,
    window,
    codes,
    meansLabel: meansKnew(c),
  };
}

/* ------------------------------------------------------------------ *
 * As text, for the play CLI and the read tool.
 * ------------------------------------------------------------------ */

/** One cell in a few characters: `Odessa✓`, `"Odessa"✗`, `[Sokol]`, `~Odessa` (pencil). */
export function cellText(g: BoardGrid, cell: BoardCell): string {
  const code = (p: PlaceId) => g.codes[p] ?? p;
  // docs/47 A5: the pencil shows beside whatever else the cell holds, never under it.
  const pencil = cell.pencil?.at ? `~${code(cell.pencil.at)}` : cell.pencil?.notAt?.length ? `~not ${code(cell.pencil.notAt[0] as string)}` : '';
  let base = '';
  if (cell.collision) {
    const tail = cell.admitted ? `→${code(cell.admitted)}` : cell.second ? `→"${code(cell.second)}"` : '';
    base = `"${code(cell.says ?? '')}"✗${tail}`;
  } else if (cell.confirmed && cell.says) base = `${code(cell.says)}✓`;
  else if (cell.seen) base = `[${code(cell.seen.place)}]`;
  else if (cell.says) base = `"${code(cell.says)}"`;
  if (base && pencil) return `${base} ${pencil}`;
  return base || pencil || '·';
}

/**
 * docs/64: the last column, asked as a question with the night's own means: "Could they get the
 * laudanum?", "Could they get the spare key?", "Did they know where the key was?".
 */
export function meansAsked(label: string): string {
  const got = /^could have got (.+)$/.exec(label);
  if (got) return `Could they get ${got[1]}?`;
  const knew = /^knew (?:that )?(.+)$/.exec(label);
  return knew ? `Did they know ${knew[1]}?` : `${label.charAt(0).toUpperCase()}${label.slice(1)}?`;
}

/**
 * docs/64: the grid's key, cut to what matters (what they say, who saw them, where the two clash), and
 * the rest only when the grid shows it: both saying so, owning up, your own guess.
 */
export function gridKey(g: BoardGrid): string[] {
  const cells = g.rows.flatMap((r) => g.hours.map((h) => r.cells[h] as BoardCell));
  const out = ['"X" they say so', '[X] somebody saw them there', '"X"✗ where they clash'];
  if (cells.some((x) => x.confirmed)) out.push('X✓ both say so');
  if (cells.some((x) => x.admitted || x.second)) out.push('→Y owned up');
  if (cells.some((x) => x.pencil)) out.push('~X your own guess');
  return out;
}

export function boardGridText(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts' | 'visited' | 'marks'> & Partial<Pick<BoardRun, 'log'>>): string {
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
  out.push(`${''.padEnd(w0)}${head}${meansAsked(g.meansLabel)}`);
  for (const r of g.rows) {
    out.push(`${r.name.padEnd(w0)}${g.hours.map((h) => cellText(g, r.cells[h] as BoardCell).padEnd(cw)).join('')}${r.means}`);
  }
  out.push('');
  out.push(gridKey(g).join('  ·  '));
  out.push(g.crimeHour !== null ? '! the hour it happened' : '? the hours it could have been');
  // docs/47 B8: the key names only the places the night has named.
  const known = knownPlaces(c, run);
  out.push(`Places: ${Object.entries(g.codes).filter(([id]) => known.has(id) || id === c.crime.scene).map(([id, code]) => `${code} = ${placeName(c, id)}`).join('; ')}`);
  const coll = g.rows.flatMap((r) => g.hours.filter((h) => r.cells[h]?.collision).map((h) => ({ r, h })));
  if (coll.length > 0) {
    out.push('');
    out.push('WHERE THEY CLASH');
    for (const { r, h } of coll) {
      out.push(`${r.name}, ${hourWord(h)}:`);
      for (const l of r.cells[h]?.lines ?? []) out.push(`  ${l}`);
    }
  }
  return out.join('\n');
}

export { cap };
