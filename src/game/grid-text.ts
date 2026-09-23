/**
 * "Where they were" in type, for `npm run read -- --grid`: the deduction grid
 * as a reviewer reads it without a browser. Pure, like the transcript.
 *
 * One line per row, more when a cell stacks sources:
 *
 *   `third~`   their own account      `third:K`  seen by K (the key names K)
 *   `third#`   evidence               `-third`   not there
 *   `!`        the sources disagree   `(third)` `(-third)`  the player's pencil
 *   `·`        nothing known
 *
 * The victim's row opens each cell with the life line (`alive`, `?` inside the
 * notebook's window, `dead`). Above the columns: the window as `====`, the
 * anchors the notebook knows, and `†` on the crime's half hour once the
 * notebook has it to one. Under it the legend, the key, and every rule.
 */

import type { Id } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { personName } from './derive.js';
import { applyMark, gridFrom, type GridCell, type GridEntry, type GridRow, type MarkAction } from './grid.js';
import { wrap } from './transcript.js';
import type { RunState } from './types.js';

const WIDTH = 76;
const NAME = 22;
const COL = 10;

export function renderGridText(view: CaseView, state: RunState): string {
  const grid = gridFrom(view, state);
  const abbrev = new Map(
    grid.places.map((p) => [p.id, p.abbrev.length > 6 ? `${p.abbrev.slice(0, 5)}.` : p.abbrev]),
  );
  const ab = (id: Id): string => abbrev.get(id) ?? id;
  const initial = (id: Id): string => (view.personById.get(id)?.surname ?? id).charAt(0);
  const fit = (s: string, n: number): string => (s.length >= n ? `${s.slice(0, n - 1)} ` : s.padEnd(n));
  const line = (label: string, cells: string[]): string =>
    `${fit(label, NAME)}${cells.map((c) => fit(c, COL)).join('')}`.trimEnd();
  const rule = (ch: string, label = ''): string => `${label}${ch.repeat(NAME + COL * grid.ticks.length - label.length)}`;

  const out: string[] = ['WHERE THEY WERE', '═'.repeat(WIDTH), ''];
  out.push(line('', grid.ticks.map((t) => t.label)));
  if (grid.window) {
    const w = new Set(grid.window.ticks);
    out.push(line(grid.window.label, grid.ticks.map((t) => (w.has(t.tick) ? '========' : ''))));
  }
  if (grid.anchors.length > 0) {
    out.push(
      line(
        'anchors',
        grid.ticks.map((t) =>
          grid.anchors
            .filter((a) => a.tick === t.tick)
            .map((a) => `^${a.name.replace(/^the /i, '').split(/\s+/)[0] ?? ''}`)
            .join(''),
        ),
      ),
    );
  }
  if (grid.crimeTick !== null) {
    out.push(line(grid.crimeLabel, grid.ticks.map((t) => (t.tick === grid.crimeTick ? '†' : ''))));
  }

  const cellLines = (cell: GridCell): string[] => {
    const lines: string[] = [];
    if (cell.life && grid.life) {
      lines.push(cell.life === 'before' ? grid.life.before : cell.life === 'after' ? grid.life.after : '?');
    }
    const groups = new Map<string, { e: GridEntry; by: Set<string> }>();
    for (const e of cell.entries) {
      const key = `${e.placeId}|${e.present}|${e.source}`;
      const g = groups.get(key) ?? { e, by: new Set<string>() };
      if (e.source === 'witness' && e.by) g.by.add(initial(e.by));
      groups.set(key, g);
    }
    const first = lines.length;
    for (const { e, by } of groups.values()) {
      const suffix = e.source === 'claimed' ? '~' : e.source === 'evidence' ? '#' : `:${[...by].join('')}`;
      lines.push(`${e.present ? '' : '-'}${ab(e.placeId)}${suffix}`);
    }
    if (cell.conflict && lines.length > first) lines[first] = `!${lines[first] ?? ''}`;
    if (cell.mark?.at) lines.push(`(${ab(cell.mark.at)})`);
    for (const p of cell.mark?.notAt ?? []) lines.push(`(-${ab(p)})`);
    return lines;
  };

  const rowLines = (row: GridRow): string[] => {
    const cells = row.cells.map(cellLines);
    const height = Math.max(1, ...cells.map((c) => c.length));
    const out: string[] = [];
    for (let i = 0; i < height; i++) {
      out.push(line(i === 0 ? rowLabel(row) : '', cells.map((c) => c[i] ?? (i === 0 ? '·' : ''))));
    }
    return out;
  };

  out.push(rule('─'));
  for (const row of grid.rows) out.push(...rowLines(row));
  if (grid.fixtures.length > 0) {
    out.push(rule('─', '─ fixtures '));
    for (const row of grid.fixtures) out.push(...rowLines(row));
  }
  out.push('');

  out.push(
    wrap(
      `places: ${grid.places
        .map((p) => `${ab(p.id)} = ${p.shortName}${p.sceneLabel ? ` (${p.sceneLabel})` : ''}`)
        .join(' · ')}`,
    ),
  );
  const witnesses = new Set<Id>();
  for (const r of [...grid.rows, ...grid.fixtures]) {
    for (const c of r.cells) for (const e of c.entries) if (e.source === 'witness' && e.by) witnesses.add(e.by);
  }
  const who = [...witnesses].map((id) => `${initial(id)} ${personName(view, id)}`).join(', ');
  out.push(
    wrap(
      'key: x~ their own account · x:K seen by K · x# evidence · -x not there · ! the sources disagree · ' +
        `(x) (-x) pencil, never a fact · · nothing known${who ? ` · witnesses: ${who}` : ''}`,
    ),
  );
  out.push('', 'RULES');
  if (grid.rules.length === 0) out.push('  None yet.');
  grid.rules.forEach((r, i) => {
    const [first, ...rest] = wrap(r.text, WIDTH - 5).split('\n');
    out.push(`${String(i + 1).padStart(3)}. ${first ?? ''}`, ...rest.map((l) => `     ${l}`));
  });
  return out.join('\n');
}

/** "Sweeney (victim)", "Kreuzer (client)", "Grasso", "Callahan (bartender)". */
function rowLabel(row: GridRow): string {
  if (row.kind === 'victim') return `${row.name} (${row.role.replace(/^the /, '')})`;
  if (row.kind === 'client') return `${row.name} (client)`;
  if (row.kind === 'fixture') return `${row.name} (${row.role.replace(/^(the|a|an) /, '')})`;
  return row.name;
}

/**
 * A pencil mark as typed for `--marks`: "Grasso 10 at the suite", "Grasso 9:30
 * not the third floor", "Grasso 10 clear". Null when it names nobody, no
 * half hour of the evening, or no place in the case.
 */
export function parseMarkSpec(
  view: CaseView,
  spec: string,
): { personId: Id; tick: number; action: MarkAction } | null {
  const m = /^(\S+)\s+(\d{1,2})(?::(\d\d))?\s+(at|not|clear)\s*(.*)$/i.exec(spec.trim());
  if (!m) return null;
  const person = view.kase.people.find((p) => p.surname.toLowerCase() === (m[1] ?? '').toLowerCase());
  const tick = (Number(m[2]) - 6) * 2 + (m[3] === '30' ? 1 : 0);
  if (!person || tick < 0 || tick > 11) return null;
  const verb = (m[4] ?? '').toLowerCase();
  if (verb === 'clear') return { personId: person.id, tick, action: { kind: 'clear' } };
  const name = (m[5] ?? '').trim().toLowerCase().replace(/^at /, '');
  const place = view.places.find(
    (p) => p.shortName.toLowerCase() === name || p.shortName.toLowerCase().replace(/^the /, '') === name,
  );
  if (!place) return null;
  return { personId: person.id, tick, action: { kind: verb === 'at' ? 'at' : 'not', placeId: place.id } };
}

/** Pencil every `;`-separated mark in `specs` in; the ones that do not read come back. */
export function withMarkSpecs(
  view: CaseView,
  state: RunState,
  specs: string,
): { state: RunState; unread: string[] } {
  let marked = state;
  const unread: string[] = [];
  for (const spec of specs.split(';').map((s) => s.trim()).filter((s) => s.length > 0)) {
    const mark = parseMarkSpec(view, spec);
    if (mark) marked = applyMark(marked, mark.personId, mark.tick, mark.action);
    else unread.push(spec);
  }
  return { state: marked, unread };
}
