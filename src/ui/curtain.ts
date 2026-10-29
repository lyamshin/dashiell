/**
 * curtain (docs/76): behind the curtain, the solved board and how it came together.
 *
 * Top to bottom: the true board in the notebook grid's look (each lie in its cell, what they said struck
 * and where they were under it); the replay, a step list that drives the board (the fastest solve, and
 * the player's own night: what the notebook held after each step, the cells it added lit, the truth
 * faint under every cell not known yet); the report against the truth, as the verdict's ledger; and the
 * lies. The words are the CLI curtain's (`curtainSheet`); only the labels of the replay are new.
 */

import { placeCodes, placesKey, type BoardCell, type BoardGrid } from '../game/board/grid.js';
import { nameOf, placeName, type BoardDeal, type BoardReport, type BoardRun, type Hour, type PersonId, type PlaceId } from '../game/board/model.js';
import { curtainSheet, type CurtainCell, type CurtainMark, type CurtainRow, type CurtainSection } from '../game/board/report.js';
import { TRACK_NAMES, WHOLE_TRUTH, cellKnown, cellTruth, fastestTrack, nightTrack, positionWords, type ReplayTrack, type TrackKind } from '../game/board/replay.js';
import { clear, el } from './dom.js';
import { MARK_HALF, MARK_RIGHT, MARK_WRONG } from './deco.js';
import { cellLabel, cellWords } from './cells.js';

/** About a second a step, as the replay plays. */
const STEP_MS = 1000;

const MARK_WORD: Record<CurtainMark, string> = { right: MARK_RIGHT, wrong: MARK_WRONG, half: MARK_HALF };

const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The curtain's panel, built when it first opens. */
export function curtainNode(d: BoardDeal, run?: BoardRun, filed?: BoardReport): HTMLElement {
  const c = d.kase;
  const sheet = curtainSheet(d, run, filed);
  const codes = placeCodes(c);
  const code = (p: PlaceId) => codes[p] ?? placeName(c, p);
  const hours = sheet.board.hours;

  const tracks: Partial<Record<TrackKind, ReplayTrack>> = {};
  const trackOf = (k: TrackKind): ReplayTrack => (tracks[k] ??= k === 'fastest' || !run ? fastestTrack(d, sheet) : nightTrack(d, run));
  const night = run ? trackOf('night') : null;
  let kind: TrackKind = 'fastest';
  let track = trackOf(kind);
  /** The position on the track: a step's index, or `steps.length`, the whole truth (where the curtain opens). */
  let pos = track.steps.length;
  let openCell: string | null = null;
  /** The cell a lie entry points at, under the pointer or the focus. */
  let pointed: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** The added cells' wash plays only right after the position changes, never on a redraw. */
  let fresh = false;

  const wrap = el('div', { class: 'curtain' });

  /* ------------------------------------------------ the board and its bar */

  const replay = el('div', { class: 'curtain-replay' });
  const boardHead = el('h3', { class: 'curtain-head', id: 'curtain-board-head', text: sheet.board.head });
  const stage = el('div', { class: 'curtain-stage' });
  const boardWrap = el('div', { class: 'bgrid-wrap curtain-board' });
  const status = el('p', { class: 'curtain-now', role: 'status', 'aria-atomic': 'true' });
  const back = el('button', { type: 'button', class: 'curtain-ctl', 'data-ctl': 'back', 'aria-label': 'Back a step', text: 'Back' });
  const next = el('button', { type: 'button', class: 'curtain-ctl', 'data-ctl': 'next', 'aria-label': 'Next step', text: 'Next' });
  const play = el('button', { type: 'button', class: 'curtain-ctl curtain-play', 'data-ctl': 'play', text: 'Play' });
  const bar = el('div', { class: 'curtain-bar' }, back, status, next, play);
  stage.append(boardWrap, bar);
  const key = el('p', { class: 'bgrid-key curtain-key' });
  const places = placesKey(c, { asked: [], visited: [] }, codes, new Set(sheet.board.rows.flatMap((r) => r.cells.flatMap((x) => [x.place, ...(x.claim ? [x.claim] : [])]))));
  const placesNote = places ? el('p', { class: 'bgrid-key', text: places }) : null;

  const replayHead = el('h3', { class: 'curtain-head', id: 'curtain-replay-head', text: 'How it came together' });
  const switcher = el('div', { class: 'curtain-tracks', role: 'group', 'aria-labelledby': 'curtain-replay-head' });
  const caption = el('p', { class: 'curtain-caption' });
  const steps = el('ol', { class: 'curtain-steps' });
  const trackButtons: Partial<Record<TrackKind, HTMLButtonElement>> = {};
  for (const k of ['fastest', 'night'] as TrackKind[]) {
    if (k === 'night' && !night?.steps.length) continue;
    const b = el('button', { type: 'button', class: 'curtain-track', 'data-track': k, 'aria-pressed': String(k === kind), text: TRACK_NAMES[k] });
    b.addEventListener('click', () => {
      if (kind === k) return;
      stop(false);
      kind = k;
      track = trackOf(k);
      pos = track.steps.length;
      openCell = null;
      fresh = false;
      drawSteps();
      draw();
    });
    trackButtons[k] = b;
    switcher.append(b);
  }
  replay.append(boardHead, stage, key, ...(placesNote ? [placesNote] : []), replayHead, ...(Object.keys(trackButtons).length > 1 ? [switcher] : []), caption, steps);
  wrap.append(replay);

  /** The grid at the position, or null at the whole truth. */
  const gridAt = (i: number): BoardGrid | null => track.steps[i]?.grid ?? null;
  /** What was said by the end of the track: the lines its last step held. */
  const lastGrid = (): BoardGrid => track.steps[track.steps.length - 1]?.grid ?? track.start;

  function cellAt(g: BoardGrid, id: PersonId, h: Hour): BoardCell | undefined {
    return g.rows.find((r) => r.id === id)?.cells[h];
  }

  /** The truth in a cell, and whether the cell already shows it. */
  function truthShown(cell: BoardCell | undefined, truth: PlaceId): { shows: boolean; known: boolean } {
    if (!cell || (!cell.says && !cell.seen)) return { shows: false, known: false };
    const known = cell.seen?.place === truth || cell.admitted === truth;
    const primary = cell.collision || cell.confirmed ? cell.says : (cell.seen?.place ?? cell.says);
    return { shows: !cell.collision && primary === truth, known };
  }

  function cellNode(row: CurtainRow, x: CurtainCell, g: BoardGrid | null, crimeHour: Hour | null): HTMLTableCellElement {
    const k = `${row.id}@${x.hour}`;
    const step = track.steps[pos];
    const lit = !!step && step.added.includes(k);
    const td = el('td', { class: ['bgrid-cell', 'curtain-cell', crimeHour === x.hour ? 'is-crime' : '', lit ? 'is-added' : '', lit && fresh ? 'is-fresh' : '', pointed === k ? 'is-pointed' : ''].filter(Boolean).join(' ') });
    const who = row.mark === 'victim' ? `${row.name} †` : row.name;
    const b = el('button', { type: 'button', class: 'bgrid-btn', 'data-spot': k, 'aria-expanded': String(openCell === k) });
    if (!g) {
      // The whole truth: where they were; a lie, what they said struck, and where they were under it.
      if (x.claim) {
        td.classList.add('is-lie');
        b.append(el('s', { class: 'c-claim', text: code(x.claim) }), el('span', { class: 'c-true', text: code(x.place) }));
        b.setAttribute('aria-label', `${who} at ${x.hour}: said ${placeName(c, x.claim)}; really at ${placeName(c, x.place)}`);
      } else {
        b.append(el('span', { class: 'c-true', text: code(x.place) }));
        b.setAttribute('aria-label', `${who} at ${x.hour}: at ${placeName(c, x.place)}`);
      }
    } else {
      // A step: the notebook's cell as it stood, and the truth faint under it where it didn't show it yet.
      const cell = cellAt(g, row.id, x.hour);
      const state = !cell ? 'is-empty' : cell.collision ? 'is-collision' : cell.confirmed ? 'is-confirmed' : cell.seen ? 'is-seen' : cell.says ? 'is-says' : 'is-empty';
      const t = truthShown(cell, x.place);
      if (state !== 'is-empty' && cell) b.append(el('span', { class: `bgrid-said ${state}`, text: cellLabel(g, cell) }));
      if (!t.shows) b.append(el('span', { class: t.known ? 'c-true' : 'c-ghost', text: code(x.place) }));
      b.setAttribute('aria-label', `${who} at ${x.hour}: ${cell ? cellWords(c, cell) : 'nothing yet'}${t.shows || t.known ? '' : `; really at ${placeName(c, x.place)}`}${lit ? '; just added' : ''}`);
    }
    b.addEventListener('click', () => {
      openCell = openCell === k ? null : k;
      draw(k);
    });
    td.append(b);
    return td;
  }

  function detailRow(row: CurtainRow, h: Hour, g: BoardGrid | null): HTMLTableRowElement {
    const td = el('td', { colspan: String(hours.length + 1), class: 'bgrid-detail curtain-detail' });
    td.append(el('div', { class: 'bgrid-detail-head', text: `${row.name}, ${h} o’clock` }));
    td.append(el('p', { class: 'curtain-truth', text: cellTruth(d, sheet, row.id, h) }));
    const cell = cellAt(g ?? lastGrid(), row.id, h);
    const lines = cell?.lines ?? [];
    if (lines.length === 0 && g) td.append(el('p', { class: 'note bgrid-line', text: 'Nothing yet about this hour.' }));
    for (const l of lines) td.append(el('p', { class: `bgrid-line${cell?.collision ? ' collides' : ''}`, text: l }));
    td.append(el('p', { class: 'note curtain-when', text: cellKnown(d, sheet, track, row.id, h) }));
    return el('tr', { class: 'bgrid-detail-row' }, td);
  }

  function drawBoard(): void {
    const g = gridAt(pos);
    const crimeHour = g ? g.crimeHour : c.crime.hour;
    const table = el('table', { class: 'bgrid bgrid--curtain', 'aria-labelledby': 'curtain-board-head', 'aria-describedby': 'curtain-now' });
    const head = el('tr');
    head.append(el('th', { class: 'bgrid-name', scope: 'col' }, el('span', { class: 'sr-only', text: 'Who' })));
    for (const h of hours) {
      const crime = crimeHour === h;
      const maybe = !!g && g.crimeHour === null && g.window.includes(h);
      head.append(el('th', { scope: 'col', class: `bgrid-hour${crime ? ' bgrid-hour--crime' : ''}${maybe ? ' bgrid-hour--maybe' : ''}`, title: crime ? 'when it happened' : maybe ? (g?.givenBy ? `an hour ${g.givenBy} gave` : 'it may have happened then') : '', text: `${h}` }));
    }
    table.append(el('thead', {}, head));
    const tbody = el('tbody');
    for (const row of sheet.board.rows) {
      const tr = el('tr', { class: [row.mark === 'victim' ? 'bgrid-row--victim' : row.company ? 'bgrid-row--company' : '', row.mark === 'culprit' ? 'curtain-row--culprit' : ''].filter(Boolean).join(' ') });
      const name = el('th', { scope: 'row', class: 'bgrid-name', text: row.mark === 'victim' ? `${row.name} †` : row.name });
      if (row.mark === 'culprit') name.append(el('span', { class: 'curtain-did', text: 'did it' }));
      tr.append(name);
      for (const x of row.cells) tr.append(cellNode(row, x, g, crimeHour));
      tbody.append(tr);
      if (openCell?.startsWith(`${row.id}@`)) tbody.append(detailRow(row, Number(openCell.split('@')[1]) as Hour, g));
    }
    table.append(tbody);
    clear(boardWrap);
    boardWrap.append(table);
  }

  function sample(cls: string, text: string): HTMLElement {
    return el('span', { class: `k ${cls}`, text });
  }

  function drawKey(): void {
    clear(key);
    const g = gridAt(pos);
    const lab = 'Place';
    if (!g) {
      key.append(el('s', { class: 'k c-claim', text: lab }), ' what they said · ', sample('c-true', lab), ' where they really were');
      if (sheet.board.dead) key.append(` · † ${sheet.board.dead}`);
    } else {
      const cells = g.rows.flatMap((r) => hours.map((h) => r.cells[h])).filter((x): x is BoardCell => !!x);
      key.append(sample('bgrid-said is-says', lab), ' they say so · ', sample('bgrid-said is-seen', lab), ' somebody saw them there · ', sample('bgrid-said is-collision', `${lab}✗`), ' where they clash');
      if (cells.some((x) => x.confirmed)) key.append(' · ', sample('bgrid-said is-confirmed', `${lab}✓`), ' they say so, and somebody saw them there');
      key.append(' · ', sample('c-ghost', lab), ' where they really were, not known yet');
      if ((track.steps[pos]?.added.length ?? 0) > 0) key.append(' · ', sample('k-added', lab), ' what this step added');
    }
    key.append('. Tap a cell for what was said and when it came out.');
  }

  function drawBar(announce: boolean): void {
    const s = track.steps[pos];
    const where = positionWords(track, pos);
    clear(status);
    status.append(el('span', { text: where }));
    if (s) status.append(el('span', { class: 'sr-only', text: `: ${s.label}` }));
    // (While it plays, the steps aren't read out one a second; where it stopped is.)
    status.setAttribute('aria-live', announce ? 'polite' : 'off');
    play.textContent = timer ? 'Stop' : 'Play';
    play.setAttribute('aria-label', timer ? 'Stop playing' : pos >= track.steps.length ? 'Play from the first step' : 'Play on from this step');
  }

  function drawSteps(): void {
    clear(steps);
    caption.textContent = track.caption;
    for (const [k, b] of Object.entries(trackButtons)) b?.setAttribute('aria-pressed', String(k === kind));
    track.steps.forEach((s, i) => {
      const b = el('button', { type: 'button', class: 'curtain-step', 'data-step': String(i) }, el('span', { class: 'num', 'aria-hidden': s.n === '+' ? 'true' : undefined, text: s.n }), el('span', { class: 'body' }, el('span', { class: 'label', text: s.label }), s.why ? el('span', { class: 'why', text: s.why }) : null));
      if (s.n === '+') b.setAttribute('aria-label', `The motive: ${s.label}`);
      b.addEventListener('click', () => go(i, false));
      steps.append(el('li', {}, b));
    });
    const whole = el('button', { type: 'button', class: 'curtain-step curtain-step--truth', 'data-step': String(track.steps.length) }, el('span', { class: 'num', 'aria-hidden': 'true' }), el('span', { class: 'body' }, el('span', { class: 'label', text: WHOLE_TRUTH })));
    whole.addEventListener('click', () => go(track.steps.length, false));
    steps.append(el('li', {}, whole));
  }

  function markSteps(scroll: boolean): void {
    for (const b of steps.querySelectorAll<HTMLButtonElement>('.curtain-step')) {
      const on = Number(b.dataset.step) === pos;
      if (on) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      if (on && scroll) b.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }

  /** Redraw at the position; keep the focus on the cell that had it. */
  function draw(focusCell?: string, announce = true, scroll = false): void {
    const had = focusCell ?? (document.activeElement instanceof HTMLElement ? document.activeElement.dataset.spot : undefined);
    drawBoard();
    drawKey();
    drawBar(announce);
    markSteps(scroll);
    if (had) boardWrap.querySelector<HTMLElement>(`[data-spot="${CSS.escape(had)}"]`)?.focus({ preventScroll: true });
    fresh = false;
  }

  /** To a position: a step's index, or the whole truth. */
  function go(i: number, scroll: boolean, announce = true): void {
    if (timer && announce) stop(false);
    pos = i;
    fresh = true;
    draw(undefined, announce, scroll);
  }

  const last = () => track.steps.length;
  back.addEventListener('click', () => go(pos <= 0 ? last() : pos - 1, true));
  next.addEventListener('click', () => go(pos >= last() ? 0 : pos + 1, true));

  /** Play: from the first step (or on from where it was stopped), about a second a step, to the whole truth. */
  function tick(): void {
    timer = null;
    // (A closed curtain stops it.)
    if (!wrap.isConnected || wrap.offsetParent === null) return stop(false);
    pos += 1;
    fresh = true;
    draw(undefined, false, true);
    if (pos >= last()) return stop(true);
    timer = setTimeout(tick, STEP_MS);
    drawBar(false);
  }
  function stop(announce: boolean): void {
    if (timer) clearTimeout(timer);
    timer = null;
    // (Said once, where it stopped.)
    drawBar(announce);
  }
  play.addEventListener('click', () => {
    if (timer) return stop(true);
    // With reduced motion nothing plays: Next walks it a step at a time.
    if (reducedMotion()) return;
    if (pos >= last()) pos = -1;
    tick();
  });

  /* ------------------------------------------------ the report against the truth */

  const report = el('div', { class: 'curtain-report' });
  for (const s of sheet.sections) report.append(sectionNode(s));
  wrap.append(report);

  function sectionNode(s: CurtainSection): HTMLElement {
    const id = `curtain-sec-${s.key}`;
    const sec = el('section', { class: `curtain-sec curtain-sec--${s.key}`, 'aria-labelledby': id });
    sec.append(el('h3', { class: 'curtain-head', id, text: s.head }));
    if (s.said) sec.append(el('p', { class: 'curtain-said', text: s.said }));
    const ledger = el('div', { class: 'curtain-ledger' });
    if (s.proof) ledger.append(el('div', { class: 'verdict-row curtain-proof' }, el('span', { class: 'label', text: s.proof.label }), el('span', { class: 'proof', text: s.proof.text })));
    if (s.picked) {
      const state = s.picked.mark;
      ledger.append(el('div', { class: `verdict-row verdict-row--${state}${state === 'wrong' ? ' wrong' : state === 'half' ? ' half' : ''}` }, el('span', { class: 'label', text: 'You picked' }), el('span', { class: 'given' }, el('span', { class: 'answer', text: s.picked.text })), el('span', { class: 'mark', text: MARK_WORD[state] })));
    }
    if (ledger.childNodes.length) sec.append(ledger);
    return sec;
  }

  /* ------------------------------------------------ the lies */

  const lies = el('section', { class: 'curtain-lies', 'aria-labelledby': 'curtain-lies-head' });
  lies.append(el('h3', { class: 'curtain-head', id: 'curtain-lies-head', text: sheet.lies.head }));
  const list = el('ul', { class: 'curtain-lie-list' });
  for (const l of sheet.lies.items) {
    const k = `${l.person}@${l.hour}`;
    const li = el('li', { class: 'curtain-lie', 'data-lie': k });
    // The name, a press away from its cell on the board; the claim struck, where they were, why.
    const who = nameOf(c, l.person);
    const name = el('button', { type: 'button', class: 'noun curtain-lie-name', 'aria-describedby': 'curtain-lie-hint', text: who });
    const said = el('p', { class: 'curtain-lie-said' }, name, l.said.lead.slice(who.length), el('s', { class: 'c-claim', text: l.said.where }), `${l.said.tail}; ${l.was}, ${l.why}.`);
    li.append(said, el('p', { class: 'curtain-lie-after', text: l.confronted }));
    const point = (on: boolean) => {
      pointed = on ? k : pointed === k ? null : pointed;
      for (const td of boardWrap.querySelectorAll('td.is-pointed')) td.classList.remove('is-pointed');
      if (pointed) boardWrap.querySelector(`[data-spot="${CSS.escape(pointed)}"]`)?.closest('td')?.classList.add('is-pointed');
    };
    li.addEventListener('pointerenter', () => point(true));
    li.addEventListener('pointerleave', () => point(false));
    li.addEventListener('focusin', () => point(true));
    li.addEventListener('focusout', () => point(false));
    name.addEventListener('click', () => {
      openCell = k;
      draw(k);
      const cell = boardWrap.querySelector<HTMLElement>(`[data-spot="${CSS.escape(k)}"]`);
      cell?.scrollIntoView?.({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      cell?.focus({ preventScroll: true });
    });
    list.append(li);
  }
  lies.append(list, el('span', { class: 'sr-only', id: 'curtain-lie-hint', text: 'Opens its cell on the board.' }));
  wrap.append(lies);

  /* ------------------------------------------------ pinned while it fits */

  // The board and its bar stay in view while the steps scroll under them, when they take no more
  // than about two thirds of the page (a cell's lines open on a phone can make it taller: then it scrolls).
  const fit = () => {
    const page = wrap.closest<HTMLElement>('.page--prose');
    if (!page) return;
    const head = page.querySelector<HTMLElement>('.runhead');
    const top = head?.offsetHeight ?? 0;
    replay.style.setProperty('--curtain-top', `${top}px`);
    replay.style.setProperty('--curtain-stage', `${stage.offsetHeight}px`);
    replay.classList.toggle('curtain-replay--pinned', stage.offsetHeight > 0 && stage.offsetHeight <= (page.clientHeight - top) * 0.66);
  };
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);
    queueMicrotask(() => {
      const page = wrap.closest<HTMLElement>('.page--prose');
      if (page) ro.observe(page);
      fit();
    });
  }

  drawSteps();
  draw(undefined, false);
  return wrap;
}
