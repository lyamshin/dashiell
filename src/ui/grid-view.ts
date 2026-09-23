/**
 * "Where they were" — the deduction grid, on the notebook page.
 *
 * Draws `gridFrom` and nothing else. People down the side (names stick while
 * the half hours scroll under them), the evening across the top, the
 * notebook's window as a shaded band, the anchors it knows as marks over their
 * hours, and the crime's half hour once it is one. A cell shows each source
 * in its own style, stacked; a disagreement is outlined in the one red.
 *
 * Tapping a cell opens its sources in full, word for word from the notebook,
 * and the pencil: "was at", "not at", rub out. The pencil is the player's and
 * is drawn apart from everything sourced. Tapping a name turns the notebook to
 * that person's entry. Under the grid, every fact as one rule; tapping one
 * lights the cells it touches.
 *
 * The section redraws itself in place, so a pencil mark or a tap never moves
 * the notebook's scroll or the page on the left.
 */

import type { Id } from '../gen/types.js';
import type { GridCell, GridEntry, GridPlace, GridRow, GridView, MarkAction } from '../game/grid.js';
import { el } from './dom.js';

type Selection =
  | { kind: 'cell'; personId: Id; tick: number }
  | { kind: 'column'; tick: number };

/** What the grid remembers between redraws. The book owns it, so a new page keeps it. */
export interface GridUi {
  collapsed: Set<Id>;
  fixturesOpen: boolean;
  selected: Selection | null;
  rule: string | null;
  scrollLeft: number;
}

export function newGridUi(): GridUi {
  return { collapsed: new Set(), fixturesOpen: false, selected: null, rule: null, scrollLeft: 0 };
}

export interface GridHandlers {
  grid: () => GridView;
  onMark: (personId: Id, tick: number, action: MarkAction) => void;
  onPerson: (personId: Id) => void;
}

export function renderGridSection(ui: GridUi, h: GridHandlers): HTMLElement {
  const section = el('section', { class: 'dgrid-section', 'aria-label': 'Where they were' });
  const draw = (): void => {
    const old = section.querySelector('.dgrid-scroll') as HTMLElement | null;
    if (old) ui.scrollLeft = old.scrollLeft;
    const grid = h.grid();
    section.replaceChildren(...build(grid, ui, h, draw));
    const scroller = section.querySelector('.dgrid-scroll') as HTMLElement | null;
    if (scroller) scroller.scrollLeft = ui.scrollLeft;
  };
  draw();
  return section;
}

function build(grid: GridView, ui: GridUi, h: GridHandlers, redraw: () => void): HTMLElement[] {
  const placeById = new Map(grid.places.map((p) => [p.id, p]));
  const nameById = new Map([...grid.rows, ...grid.fixtures].map((r) => [r.personId, r.name]));
  const band = new Set(grid.window?.ticks ?? []);
  const rule = grid.rules.find((r) => r.id === ui.rule) ?? null;
  const lit = (personId: Id, tick: number): boolean =>
    rule !== null && rule.cells.some((c) => c.tick === tick && (c.personId === null || c.personId === personId));
  const litColumn = (tick: number): boolean =>
    rule !== null && rule.cells.some((c) => c.tick === tick && c.personId === null);

  /* ---------------------------------------------------------- the table */
  const table = el('table', { class: 'dgrid' });
  const head = el('thead');
  const marks = el('tr', { class: 'dgrid-marks' }, el('th', { class: 'dgrid-corner', scope: 'col' }));
  const labels = el('tr', { class: 'dgrid-ticks' }, el('th', { class: 'dgrid-corner', scope: 'col', text: '' }));
  for (const t of grid.ticks) {
    const anchors = grid.anchors.filter((a) => a.tick === t.tick);
    const crime = grid.crimeTick === t.tick;
    const tips = [
      ...anchors.map((a) => `${a.name}, ${t.clock}`),
      ...(crime ? [`${t.clock}: ${grid.crimeLabel}`] : []),
      ...(band.has(t.tick) && grid.window ? [`inside the ${grid.window.label}`] : []),
    ];
    const cls = (base: string): string =>
      `${base}${band.has(t.tick) ? ' in-band' : ''}${litColumn(t.tick) ? ' lit' : ''}${
        ui.selected?.kind === 'column' && ui.selected.tick === t.tick ? ' picked' : ''
      }`;
    const markCell = el('th', { class: cls('dgrid-mark'), scope: 'col' });
    if (anchors.length > 0 || crime) {
      const b = el('button', {
        type: 'button',
        class: 'dgrid-markbtn',
        title: tips.join(' · '),
        'aria-label': tips.join('; '),
      });
      if (crime) b.append(el('span', { class: 'dgrid-crime', text: '†' }));
      for (let i = 0; i < anchors.length; i++) b.append(el('span', { class: 'dgrid-anchor', text: '◆' }));
      b.addEventListener('click', () => {
        ui.selected = { kind: 'column', tick: t.tick };
        redraw();
      });
      markCell.append(b);
    }
    marks.append(markCell);
    const label = el('th', { class: cls('dgrid-tick'), scope: 'col', title: tips.length ? `${t.clock} · ${tips.join(' · ')}` : t.clock });
    const lb = el('button', { type: 'button', class: 'dgrid-tickbtn', text: t.label, 'aria-label': t.clock });
    lb.addEventListener('click', () => {
      ui.selected = { kind: 'column', tick: t.tick };
      redraw();
    });
    label.append(lb);
    labels.append(label);
  }
  head.append(marks, labels);
  table.append(head);

  const bodyRow = (row: GridRow): HTMLElement => {
    const collapsed = ui.collapsed.has(row.personId);
    const tr = el('tr', { class: `dgrid-row dgrid-row--${row.kind}${collapsed ? ' collapsed' : ''}` });
    const th = el('th', { class: 'dgrid-name', scope: 'row' });
    const toggle = el('button', {
      type: 'button',
      class: 'dgrid-fold',
      'aria-label': `${collapsed ? 'Open' : 'Fold'} ${row.name}’s row`,
      'aria-expanded': collapsed ? 'false' : 'true',
      text: collapsed ? '▸' : '▾',
    });
    toggle.addEventListener('click', () => {
      if (collapsed) ui.collapsed.delete(row.personId);
      else ui.collapsed.add(row.personId);
      redraw();
    });
    const name = el('button', { type: 'button', class: 'dgrid-who', title: `${row.name}, ${row.role}: the notebook entry` });
    name.append(
      el('span', { class: 'dgrid-surname', text: row.name }),
      el('span', { class: 'dgrid-role', text: shortRole(row) }),
    );
    name.addEventListener('click', () => h.onPerson(row.personId));
    th.append(toggle, name);
    tr.append(th);
    for (const cell of row.cells) tr.append(cellTd(row, cell, collapsed));
    return tr;
  };

  const cellTd = (row: GridRow, cell: GridCell, collapsed: boolean): HTMLElement => {
    const picked = ui.selected?.kind === 'cell' && ui.selected.personId === row.personId && ui.selected.tick === cell.tick;
    const td = el('td', {
      class: `dgrid-cell${band.has(cell.tick) ? ' in-band' : ''}${cell.conflict ? ' conflict' : ''}${
        picked ? ' picked' : ''
      }${lit(row.personId, cell.tick) ? ' lit' : ''}${
        cell.entries.length === 0 && !cell.mark && !cell.life ? ' empty' : ''
      }`,
    });
    const b = el('button', {
      type: 'button',
      class: 'dgrid-cellbtn',
      'aria-label': cellWords(row, cell, grid, placeById, nameById),
    });
    if (!collapsed) {
      if (cell.life && grid.life) {
        b.append(
          el('span', {
            class: `dgrid-life dgrid-life--${cell.life}`,
            text: cell.life === 'before' ? grid.life.before : cell.life === 'after' ? grid.life.after : '?',
          }),
        );
      }
      for (const g of grouped(cell.entries)) b.append(chip(g, placeById, nameById));
      if (cell.conflict) b.append(el('span', { class: 'dgrid-bang', 'aria-hidden': 'true', text: '!' }));
      if (cell.mark?.at) b.append(pencil(cell.mark.at, false, placeById));
      for (const p of cell.mark?.notAt ?? []) b.append(pencil(p, true, placeById));
    }
    b.addEventListener('click', () => {
      ui.selected = picked ? null : { kind: 'cell', personId: row.personId, tick: cell.tick };
      redraw();
    });
    td.append(b);
    return td;
  };

  const main = el('tbody');
  for (const row of grid.rows) main.append(bodyRow(row));
  table.append(main);

  if (grid.fixtures.length > 0) {
    const fx = el('tbody', { class: 'dgrid-fixtures' });
    const tr = el('tr', { class: 'dgrid-fxrow' });
    const th = el('td', { colspan: String(grid.ticks.length + 1) });
    const b = el('button', {
      type: 'button',
      class: 'dgrid-fxbtn',
      'aria-expanded': ui.fixturesOpen ? 'true' : 'false',
      text: `${ui.fixturesOpen ? '▾' : '▸'} Fixtures (${grid.fixtures.length})`,
    });
    b.addEventListener('click', () => {
      ui.fixturesOpen = !ui.fixturesOpen;
      redraw();
    });
    th.append(b);
    tr.append(th);
    fx.append(tr);
    if (ui.fixturesOpen) for (const row of grid.fixtures) fx.append(bodyRow(row));
    table.append(fx);
  }

  const scroller = el('div', { class: 'dgrid-scroll', tabindex: '0', 'aria-label': 'Where they were, by the half hour' }, table);
  scroller.addEventListener('scroll', () => {
    ui.scrollLeft = scroller.scrollLeft;
  });

  const out: HTMLElement[] = [scroller];

  /* ------------------------------------------------------- the detail */
  const detail = detailFor(grid, ui, h, redraw, placeById, nameById);
  if (detail) out.push(detail);

  /* ------------------------------------------------------- the legend */
  out.push(legend(grid));

  /* -------------------------------------------------------- the rules */
  const rules = el('div', { class: 'dgrid-rules' });
  rules.append(el('h3', { text: 'Rules' }));
  if (grid.rules.length === 0) rules.append(el('p', { class: 'note', text: 'Nothing yet.' }));
  const list = el('ol');
  for (const r of grid.rules) {
    const li = el('li');
    const b = el('button', {
      type: 'button',
      class: `dgrid-rule${ui.rule === r.id ? ' on' : ''}`,
      'aria-pressed': ui.rule === r.id ? 'true' : 'false',
      text: r.text,
    });
    b.addEventListener('click', () => {
      ui.rule = ui.rule === r.id ? null : r.id;
      if (ui.rule) {
        // Show what it touches: open the fixtures and any folded row it names.
        for (const c of r.cells) {
          if (c.personId === null) continue;
          ui.collapsed.delete(c.personId);
          if (grid.fixtures.some((f) => f.personId === c.personId)) ui.fixturesOpen = true;
        }
        const first = Math.min(...r.cells.map((c) => c.tick));
        const scroller = document.querySelector('.dgrid-scroll') as HTMLElement | null;
        const col = scroller?.querySelectorAll('.dgrid-ticks th')[first + 1] as HTMLElement | undefined;
        if (scroller && col) {
          const name = scroller.querySelector('.dgrid-corner') as HTMLElement | null;
          const want = col.offsetLeft - (name?.offsetWidth ?? 0) - 4;
          if (want < scroller.scrollLeft || col.offsetLeft + col.offsetWidth > scroller.scrollLeft + scroller.clientWidth) {
            ui.scrollLeft = Math.max(0, want);
          }
        }
      }
      redraw();
      if (ui.rule) {
        (document.querySelector('.dgrid-scroll') as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      }
    });
    li.append(b);
    list.append(li);
  }
  rules.append(list);
  out.push(rules);
  return out;
}

/* ------------------------------------------------------------ pieces */

function shortRole(row: GridRow): string {
  if (row.kind === 'victim') return row.role.replace(/^the /, '');
  if (row.kind === 'client') return 'client';
  return row.role.replace(/^(the|a|an) /, '');
}

interface Group {
  placeId: Id;
  present: boolean;
  source: GridEntry['source'];
  by: Id[];
}

/** One chip per place, presence and kind of source; witnesses on one chip. */
function grouped(entries: readonly GridEntry[]): Group[] {
  const out: Group[] = [];
  for (const e of entries) {
    const g = out.find((x) => x.placeId === e.placeId && x.present === e.present && x.source === e.source);
    if (g) {
      if (e.by && !g.by.includes(e.by)) g.by.push(e.by);
    } else {
      out.push({ placeId: e.placeId, present: e.present, source: e.source, by: e.by ? [e.by] : [] });
    }
  }
  return out;
}

function chip(g: Group, places: Map<Id, GridPlace>, names: Map<Id, string>): HTMLElement {
  const place = places.get(g.placeId);
  const span = el('span', {
    class: `dchip dchip--${g.source}${g.present ? '' : ' dchip--not'}`,
    style: `--pc: var(--place-${place?.slot ?? 0})`,
  });
  if (g.source === 'evidence') span.append(el('span', { class: 'dchip-sq', 'aria-hidden': 'true', text: '▪' }));
  span.append(el('span', { class: 'dchip-name', text: place?.abbrev ?? g.placeId }));
  if (g.source === 'witness' && g.by.length > 0) {
    // Two initials at most on the chip; the detail names every witness.
    const initials = g.by.map((id) => (names.get(id) ?? id).charAt(0));
    span.append(
      el('sup', {
        class: 'dchip-by',
        text: initials.length > 2 ? `${initials.slice(0, 2).join('')}+` : initials.join(''),
      }),
    );
  }
  return span;
}

function pencil(placeId: Id, not: boolean, places: Map<Id, GridPlace>): HTMLElement {
  return el('span', {
    class: `dpencil${not ? ' dpencil--not' : ''}`,
    text: places.get(placeId)?.abbrev ?? placeId,
  });
}

function sourceWords(e: GridEntry | Group, names: Map<Id, string>): string {
  if (e.source === 'claimed') return 'their own account';
  if (e.source === 'evidence') return 'evidence';
  const by = 'by' in e && Array.isArray(e.by) ? e.by : e.by ? [e.by as Id] : [];
  return `seen by ${by.map((id) => names.get(id) ?? id).join(' and ') || 'a witness'}`;
}

function cellWords(
  row: GridRow,
  cell: GridCell,
  grid: GridView,
  places: Map<Id, GridPlace>,
  names: Map<Id, string>,
): string {
  const t = grid.ticks[cell.tick]?.clock ?? '';
  const parts = grouped(cell.entries).map(
    (g) => `${g.present ? 'at' : 'not at'} ${places.get(g.placeId)?.shortName ?? g.placeId}, ${sourceWords(g, names)}`,
  );
  if (cell.life && grid.life) {
    parts.unshift(cell.life === 'before' ? grid.life.before : cell.life === 'after' ? grid.life.after : 'inside the window');
  }
  if (cell.conflict) parts.push('the sources disagree');
  if (cell.mark?.at) parts.push(`pencilled at ${places.get(cell.mark.at)?.shortName ?? ''}`);
  for (const p of cell.mark?.notAt ?? []) parts.push(`pencilled not at ${places.get(p)?.shortName ?? ''}`);
  return `${row.name}, ${t}: ${parts.length > 0 ? parts.join('; ') : 'nothing known'}`;
}

function detailFor(
  grid: GridView,
  ui: GridUi,
  h: GridHandlers,
  redraw: () => void,
  places: Map<Id, GridPlace>,
  names: Map<Id, string>,
): HTMLElement | null {
  const sel = ui.selected;
  if (!sel) return null;
  const box = el('div', { class: 'dgrid-detail', role: 'region', 'aria-live': 'polite' });
  const close = el('button', { type: 'button', class: 'dgrid-close', 'aria-label': 'Close', text: '×' });
  close.addEventListener('click', () => {
    ui.selected = null;
    redraw();
  });
  const tick = grid.ticks[sel.tick];
  const quote = (clueId: Id, how: string): HTMLElement => {
    const src = grid.sources[clueId];
    return el(
      'div',
      { class: 'dgrid-src' },
      el('div', { class: 'nb-record', text: src?.text ?? clueId }),
      el('div', { class: 'dgrid-srcby', text: `— ${src?.label ?? ''}${how ? ` · ${how}` : ''}` }),
    );
  };

  if (sel.kind === 'column') {
    box.append(el('div', { class: 'dgrid-dhead' }, el('span', { text: tick?.clock ?? '' }), close));
    const lines: HTMLElement[] = [];
    if (grid.crimeTick === sel.tick) {
      lines.push(el('p', { class: 'dgrid-dnote', text: `† ${grid.crimeLabel}, as the notebook has it.` }));
    }
    if (grid.window && grid.window.ticks.includes(sel.tick)) {
      lines.push(el('p', { class: 'dgrid-dnote', text: `Inside the ${grid.window.label}, as the notebook has it.` }));
    }
    for (const a of grid.anchors.filter((x) => x.tick === sel.tick)) {
      lines.push(el('p', { class: 'dgrid-dnote', text: `◆ ${a.name}.` }));
      for (const id of a.clueIds) lines.push(quote(id, ''));
    }
    for (const r of grid.rules.filter((x) => x.kind === 'window' && x.cells.some((c) => c.tick === sel.tick))) {
      for (const id of r.clueIds) if (!lines.some((l) => l.dataset.id === id)) lines.push(quote(id, r.text));
    }
    if (lines.length === 0) lines.push(el('p', { class: 'note', text: 'Nothing in the notebook marks this half hour.' }));
    box.append(...lines);
    return box;
  }

  const row = [...grid.rows, ...grid.fixtures].find((r) => r.personId === sel.personId);
  const cell = row?.cells[sel.tick];
  if (!row || !cell) return null;
  box.append(el('div', { class: 'dgrid-dhead' }, el('span', { text: `${row.name} · ${tick?.clock ?? ''}` }), close));
  if (cell.life && grid.life && grid.window) {
    const w = cell.life === 'before' ? `${grid.life.before}: before` : cell.life === 'after' ? `${grid.life.after}: after` : 'inside';
    box.append(el('p', { class: 'dgrid-dnote', text: `${w} the ${grid.window.label} as the notebook has it.` }));
  }
  if (cell.conflict) box.append(el('p', { class: 'dgrid-dnote dgrid-dnote--bang', text: '! The sources disagree.' }));
  const seen = new Set<Id>();
  for (const e of cell.entries) {
    if (seen.has(e.clueId)) continue;
    seen.add(e.clueId);
    const what = `${e.present ? 'at' : 'not at'} ${places.get(e.placeId)?.shortName ?? e.placeId}, ${sourceWords(e, names)}`;
    box.append(quote(e.clueId, what));
  }
  if (cell.entries.length === 0 && !cell.life) {
    box.append(el('p', { class: 'note', text: 'Nothing in the notebook for this half hour.' }));
  }

  // The pencil.
  const pad = el('div', { class: 'dgrid-pencil' });
  pad.append(el('div', { class: 'dgrid-plabel', text: 'Pencil — yours, not a fact. Free.' }));
  const line = (label: string, kind: 'at' | 'not'): HTMLElement => {
    const wrap = el('div', { class: 'dgrid-pline' }, el('span', { class: 'dgrid-pkind', text: label }));
    for (const p of grid.places) {
      const on = kind === 'at' ? cell.mark?.at === p.id : (cell.mark?.notAt ?? []).includes(p.id);
      const b = el('button', {
        type: 'button',
        class: `dgrid-pbtn${on ? ' on' : ''}${kind === 'not' ? ' dgrid-pbtn--not' : ''}`,
        style: `--pc: var(--place-${p.slot})`,
        'aria-pressed': on ? 'true' : 'false',
        title: `${kind === 'at' ? 'Was at' : 'Not at'} ${p.shortName}`,
        text: p.abbrev,
      });
      b.addEventListener('click', () => {
        h.onMark(row.personId, sel.tick, { kind, placeId: p.id });
        redraw();
      });
      wrap.append(b);
    }
    return wrap;
  };
  pad.append(line('was at', 'at'), line('not at', 'not'));
  if (cell.mark) {
    const rub = el('button', { type: 'button', class: 'dgrid-pbtn dgrid-rub', text: 'Rub out' });
    rub.addEventListener('click', () => {
      h.onMark(row.personId, sel.tick, { kind: 'clear' });
      redraw();
    });
    pad.append(rub);
  }
  box.append(pad);
  return box;
}

function legend(grid: GridView): HTMLElement {
  const box = el('div', { class: 'dgrid-legend' });
  const places = el('ul', { class: 'dgrid-places' });
  for (const p of grid.places) {
    const li = el('li', { class: `${p.used ? '' : 'unused'}${p.scene ? ' scene' : ''}` });
    li.append(
      el('span', { class: 'dgrid-swatch', style: `--pc: var(--place-${p.slot})`, 'aria-hidden': 'true' }),
      el('span', { class: 'dgrid-abbr', text: p.abbrev }),
      ` ${p.shortName}`,
    );
    if (p.scene) li.append(el('span', { class: 'dgrid-scene', text: ` — ${p.sceneLabel ?? 'the scene'}` }));
    places.append(li);
  }
  box.append(places);

  const key = el('ul', { class: 'dgrid-key' });
  const sample = (source: GridEntry['source'], present = true, by = ''): HTMLElement => {
    const s = el('span', { class: `dchip dchip--${source}${present ? '' : ' dchip--not'}`, style: '--pc: var(--place-0)' });
    if (source === 'evidence') s.append(el('span', { class: 'dchip-sq', text: '▪' }));
    s.append(el('span', { class: 'dchip-name', text: 'place' }));
    if (by) s.append(el('sup', { class: 'dchip-by', text: by }));
    return s;
  };
  key.append(
    el('li', {}, sample('claimed'), ' their own account'),
    el('li', {}, sample('witness', true, 'K'), ' seen by K'),
    el('li', {}, sample('evidence'), ' evidence'),
    el('li', {}, sample('witness', false, 'K'), ' not there'),
    el('li', {}, el('span', { class: 'dgrid-keybang', text: '!' }), ' the sources disagree'),
    el('li', {}, el('span', { class: 'dpencil', text: 'place' }), ' your pencil, never a fact'),
  );
  if (grid.window) {
    key.append(el('li', {}, el('span', { class: 'dgrid-keyband' }), ` ${grid.window.label}, as the notebook has it`));
  }
  if (grid.anchors.length > 0) key.append(el('li', {}, el('span', { class: 'dgrid-anchor', text: '◆' }), ' an anchor: tap the hour'));
  if (grid.crimeTick !== null) key.append(el('li', {}, el('span', { class: 'dgrid-crime', text: '†' }), ` ${grid.crimeLabel}`));
  box.append(key);
  return box;
}
