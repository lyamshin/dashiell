/**
 * docs/43: the book on the small board.
 *
 * The paper (book.css: the spread, the running head and its clock, the
 * choices' buttons, the pager, the weather, the hover cards, the report and
 * the verdict page), run on the board engine (`src/game/board/`). A page
 * lists the people here; a name opens their topics; "Put it to …" opens the
 * picker under them. The notebook's page is the board: the grid, then
 * everything held, by whose word.
 *
 * The URL says which night: `?seed=4&t=2[&type=lost-pet]`.
 */

import { clockStrip, usedByPage } from '../game/board/clock.js';
import { boardChoices, pickerFor, pickerNote, type Picker } from '../game/board/choices.js';
import { newBoardRun, stepBoard } from '../game/board/engine.js';
import { FACE_MARK, boardGrid, faceMarkDue, meansAsked, meansReasons, placesKey, shownPlaces, type BoardCell, type BoardGrid } from '../game/board/grid.js';
import { knownPeople, knownPlaces, lineShown, linesHeld } from '../game/board/knowledge.js';
import {
  BOARD_SAVE_KEY,
  budgetCalls,
  castOf,
  dealBoard,
  deadlineWords,
  hourWord,
  nameOf,
  personOf,
  placeName,
  tierName,
  type BoardDeal,
  type BoardReport,
  type BoardRun,
  type CaseType,
  type TierIndex,
} from '../game/board/model.js';
import { recapClauses } from '../game/board/pages.js';
import { nameInFull, peopleLine } from '../game/board/gloss.js';
import { BACK_TO_CASE, BREAKS_LABEL, CLEARED_LABEL, HUNCH, NOBODY, whereByLabel, blankReport, blankRule, boardFields, canGoBack, chargeLines, breakOptionsShown, clearOptions, fastestSolveLines, hoursThatMattered, keptPick, lineGroupHeads, notebookLines, reportFrom, scoreBoard, storyOfBoard, whereByOptions, type FieldKey, type LineOption, type Verdict } from '../game/board/report.js';
import { BOARD_RULES, BOARD_TEACH_LINES, BOARD_TEACH_TITLE, teachLines } from '../game/board/teach.js';
import { ACTION_KEY, CLOSE_HEADING, CLOSE_NOTE, CLOSE_TAG, TALK_HEADING, chapterShown, costText, officeLines, questionsText } from '../game/board/text.js';
import { hasHints, hintLabel, hintStanding, hintsLeft, hintsNote, takeHint } from '../game/board/hints.js';
import { bestAt, continuityOf, dealtIds, fileToProfile, loadProfile, seenOf, teachOn, tierOpen, tonightTier, type KeyValueStore, type Profile } from '../game/board/profile.js';
import { isWorld } from '../gen/board/world/index.js';
import { SITUATED } from '../game/board/plan/situated.js';
import { TEXTURE, setTexture } from '../game/board/plan/texture.js';
import { plainPage } from '../game/board/bones/plain.js';
import type { CellMark, OfferedChoice, OfferedGroup, Page } from '../game/board/types.js';
import { typesFor } from '../gen/board/index.js';
import { clear, el } from './dom.js';
import { attachCard, hideCard, type CardSource } from './hover.js';
import { renderVerdict, type TierNews } from './report.js';
import { cellLabel, cellWords } from './cells.js';
import { curtainNode } from './curtain.js';
import { AGAINST, CONCERNING, COURT, DETECTIVES_REPORT, clockNode, clockParts, crest, reportTo, routeSvg, setback } from './deco.js';
import { createWeatherLayer, loadWeatherOn, saveWeatherOn } from './weather.js';
import './board.css';

/** What the browser keeps of a board night: the deal and every command, replayed on load. */
interface BoardSaved {
  engine: 'board';
  seed: number;
  tier: TierIndex;
  type?: CaseType;
  /** docs/48: the world the night was cast from (`?world=neighbourhood`), when it isn't the dealt cast. */
  world?: string;
  detective: string;
  commands: string[];
  marks: Record<string, Record<string, CellMark>>;
  filed?: BoardReport;
  /** docs/55 6: what the profile's last nights dealt, as this night began. */
  seen?: { recent: string[]; last: string[] };
}

type Screen = { kind: 'title' } | { kind: 'teach' } | { kind: 'book' } | { kind: 'verdict'; verdict: Verdict; news?: TierNews };

const NAME_KEY = 'dashiell:detective';

/** A night the board can deal: a whole seed, a tier, and a case type the tier builds (or none). */
function dealable(seed: unknown, tier: unknown, type: unknown): boolean {
  if (!Number.isInteger(seed) || (seed as number) < 1) return false;
  if (!Number.isInteger(tier) || (tier as number) < 0 || (tier as number) > 5) return false;
  return type === undefined || type === null || typesFor(tier as TierIndex).includes(type as CaseType);
}

/** The night on the desk, if there is one. Anything else in the store (an old engine's run, a broken save) is left alone. */
function loadSaved(store: KeyValueStore): BoardSaved | null {
  try {
    const raw = store.getItem(BOARD_SAVE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as BoardSaved;
    if (!v || v.engine !== 'board' || !Array.isArray(v.commands) || !dealable(v.seed, v.tier, v.type) || (v.world !== undefined && !isWorld(v.world))) return null;
    const seen = v.seen && Array.isArray(v.seen.recent) && Array.isArray(v.seen.last) ? { recent: v.seen.recent.filter((x) => typeof x === 'string'), last: v.seen.last.filter((x) => typeof x === 'string') } : undefined;
    const { seen: _seen, ...rest } = v;
    void _seen;
    return { ...rest, ...(seen ? { seen } : {}), detective: typeof v.detective === 'string' ? v.detective : 'Dashiell', marks: v.marks && typeof v.marks === 'object' ? v.marks : {} };
  } catch {
    return null;
  }
}

function writeSaved(store: KeyValueStore, s: BoardSaved): void {
  try {
    store.setItem(BOARD_SAVE_KEY, JSON.stringify(s));
  } catch {
    /* a full store forgets; the night still plays */
  }
}

export function mountBoard(root: HTMLElement, store: KeyValueStore): void {
  let screen: Screen = { kind: 'title' };
  let d: BoardDeal | null = null;
  let run: BoardRun | null = null;
  let saved: BoardSaved | null = null;
  let turned = 0;
  let selected: string | null = null;
  let pickerOpen = false;
  let pickerClaim: number | null = null;
  let moreGo = false;
  let justSpent = 0;
  /** docs/67: what the last press of the Hint button said, until the next choice. */
  let hintSaid: string | null = null;
  /** The grid cell whose lines are open, as `person@hour`. */
  let openCell: string | null = null;
  /** The title page's picker is unfolded ("Choose a case"). */
  let choosing = false;
  const weather = createWeatherLayer({ enabled: loadWeatherOn(store) });
  let spread: HTMLElement | null = null;
  /**
   * book-look, item 2: where the focus goes after the next render. A new page puts it on the page's
   * heading (its place, the `h1`), so a screen reader says where you are; the verdict on its own
   * heading; a choice redrawn in place keeps it on the same control (`focusKey`).
   */
  let focusNext: { to: 'page' } | { to: 'verdict' } | { to: 'key'; key: string } | null = null;
  /** The choices-below cue's watcher, from the last render. */
  let cueWatch: IntersectionObserver | null = null;
  /** book-look, item 5: the render right after closing the case plays the ceremony, once. */
  let ceremony = false;
  /**
   * book-look, item 2: the page's numbered choices, as the CLI numbers them (`play-lib.ts` `pageItems`,
   * and a person's topics once they're open): number keys 1–9 pick them.
   */
  let keyed: { n: number; person?: string; command?: string }[] = [];

  const params = (): URLSearchParams => new URLSearchParams(window.location.search);
  // docs/48: `?world=neighbourhood` casts the nights opened from here from the bible.
  const w0 = params().get('world');
  let world: string | undefined = isWorld(w0) ? w0 : undefined;
  // docs/51: `?situated=0` writes the pages from here on with the old decks only, for comparison.
  SITUATED.on = params().get('situated') !== '0';
  // docs/60: `?texture=full` writes the pages with every line of texture, as before the budget.
  setTexture(params().get('texture'));
  // docs/52 §3: `?plain=1` shows each page's plain page: every fact it says, and no voice.
  const PLAIN = params().get('plain') === '1';

  function writeUrl(): void {
    const w = saved && screen.kind !== 'title' ? saved.world : world;
    const q0 = saved && screen.kind !== 'title' ? `?seed=${saved.seed}&t=${saved.tier}${saved.type ? `&type=${saved.type}` : ''}${w ? `&world=${w}` : ''}` : w ? `?world=${w}` : '';
    const q1a = SITUATED.on ? q0 : `${q0 ? `${q0}&` : '?'}situated=0`;
    const q1 = TEXTURE.mode === 'full' ? `${q1a ? `${q1a}&` : '?'}texture=full` : q1a;
    const q = PLAIN ? `${q1 ? `${q1}&` : '?'}plain=1` : q1;
    window.history.replaceState(null, '', `${window.location.pathname}${q}`);
  }

  function storedName(): string {
    try {
      return store.getItem(NAME_KEY) ?? 'Dashiell';
    } catch {
      return 'Dashiell';
    }
  }

  /* ------------------------------------------------------------ playing */

  /**
   * Open a night. `fresh` is a night picked on the title page: from the neighbourhood it keeps the
   * profile's continuity (no culprit twice running, nobody wronged twice in ten nights), stepping on
   * to the next seed that does, and the seed it lands on is the night's (and the link's).
   */
  function openCase(seed: number, tier: TierIndex, type: CaseType | undefined, name: string, resume: boolean, w: string | undefined = world, fresh = false): void {
    const avoid = fresh && w ? continuityOf(loadProfile(store)) : undefined;
    d = dealBoard(seed, tier, type, w ? { world: w, ...(avoid ? { avoid } : {}) } : {});
    if (w) seed = d.kase.seed;
    world = w;
    const prior = resume ? loadSaved(store) : null;
    const same = prior && prior.seed === seed && prior.tier === tier && (prior.type ?? null) === (type ?? null) && (prior.world ?? null) === (w ?? null);
    // docs/55 6: a fresh night remembers what the last ten dealt, and keeps it with the save so a replay deals the same.
    const seen = same && prior ? prior.seen : seenOf(loadProfile(store));
    saved = same ? prior : { engine: 'board', seed, tier, ...(type ? { type } : {}), ...(w ? { world: w } : {}), detective: name, commands: [], marks: {}, ...(seen && (seen.recent.length || seen.last.length) ? { seen } : {}) };
    run = newBoardRun(d, { detectiveName: saved.detective, ...(type ? { type } : {}), ...(saved.seen ? { seen: saved.seen } : {}) });
    for (const cmd of saved.commands) run = stepBoard(d, run, cmd).run;
    run = { ...run, marks: saved.marks };
    if (saved.filed) run = { ...run, reportOpen: true, filed: saved.filed };
    writeSaved(store, saved);
    turned = run.log.length - 1;
    selected = null;
    pickerOpen = false;
    pickerClaim = null;
    screen = run.filed ? { kind: 'verdict', verdict: scoreBoard(d, run, run.filed) } : !same && teachOn(loadProfile(store), tier) ? { kind: 'teach' } : { kind: 'book' };
    writeUrl();
    render();
  }

  function command(cmd: string): void {
    if (!d || !run || !saved || run.filed) return;
    hideCard();
    const r = stepBoard(d, run, cmd);
    if (r.error) return;
    run = { ...r.run, marks: saved.marks };
    saved = { ...saved, commands: [...saved.commands, cmd] };
    writeSaved(store, saved);
    turned = run.log.length - 1;
    selected = null;
    pickerOpen = false;
    pickerClaim = null;
    moreGo = false;
    openCell = null;
    hintSaid = null;
    justSpent = r.page.cost;
    notebookShown(false);
    focusNext = { to: 'page' };
    render();
    root.querySelector('.page--prose')?.scrollTo?.({ top: 0 });
  }

  /**
   * docs/67: the Hint button. It stars a step (or says the report is ready, or on the report page what's
   * missing) and writes no page; the save keeps it as a command, so a reload gives the same stars and
   * the verdict counts it. A press that gives nothing new is free and isn't kept.
   */
  function hint(): void {
    if (!d || !run || !saved || run.filed) return;
    hideCard();
    const h = takeHint(d, run);
    if ('error' in h) hintSaid = h.error;
    else {
      if (h.said.spent) {
        run = { ...h.run, marks: saved.marks };
        saved = { ...saved, commands: [...saved.commands, 'hint'] };
        writeSaved(store, saved);
      }
      hintSaid = h.said.text;
    }
    justSpent = 0;
    renderInPlace();
    root.querySelector<HTMLElement>('.hint-button')?.focus({ preventScroll: true });
  }

  /** docs/67: the Hint button and what it said, on a tier that has hints (none from Soft-boiled up). */
  function hintNodes(): HTMLElement[] {
    const r = run as BoardRun;
    if (!hasHints(r.tier)) return [];
    const left = hintsLeft(r);
    const b = el('button', { class: 'choice choice--free choice--hint hint-button', type: 'button', 'aria-describedby': 'hint-note' });
    b.append(el('span', { class: 'label', text: hintLabel(r) }), el('span', { class: 'mins', text: 'free' }));
    b.disabled = left <= 0;
    b.addEventListener('click', hint);
    const said = hintSaid ?? hintStanding(d as BoardDeal, r);
    const note = el('p', { class: 'note hint-note', id: 'hint-note', role: 'status', 'aria-live': 'polite' });
    if (said) note.append(withNames(said));
    return [b, note];
  }

  function file(report: BoardReport): void {
    if (!d || !run || !saved) return;
    run = { ...run, reportOpen: true, filed: report };
    saved = { ...saved, filed: report };
    writeSaved(store, saved);
    const verdict = scoreBoard(d, run, report);
    const outcome = fileToProfile(store, { tier: run.tier, points: verdict.points, asked: verdict.asked, actionsUsed: verdict.actionsUsed, par: verdict.par, ...(d.kase.world ? { cast: castOf(d.kase) } : {}), dealt: dealtIds(run.spent), hints: verdict.hints });
    const news: TierNews | undefined = outcome.firstClear !== null ? { cleared: run.tier, firstClear: true } : undefined;
    screen = news ? { kind: 'verdict', verdict, news } : { kind: 'verdict', verdict };
    notebookShown(false);
    focusNext = { to: 'verdict' };
    ceremony = true;
    render();
    root.querySelector('.page--prose')?.scrollTo?.({ top: 0 });
  }

  function mark(person: string, hour: number, m: CellMark | null): void {
    if (!run || !saved) return;
    const marks = { ...saved.marks, [person]: { ...(saved.marks[person] ?? {}) } };
    if (m === null) delete (marks[person] as Record<string, CellMark>)[String(hour)];
    else (marks[person] as Record<string, CellMark>)[String(hour)] = m;
    saved = { ...saved, marks };
    run = { ...run, marks };
    writeSaved(store, saved);
    renderInPlace();
  }

  function toTitle(): void {
    screen = { kind: 'title' };
    d = null;
    run = null;
    writeUrl();
    render();
  }

  /* ------------------------------------------------------------ drawing */

  function renderInPlace(): void {
    const at = document.activeElement instanceof HTMLElement ? focusKey(document.activeElement) : null;
    if (at && !focusNext) focusNext = { to: 'key', key: at };
    const prose = root.querySelector('.page--prose');
    const top = prose ? prose.scrollTop : 0;
    const nb = root.querySelector('.page--notebook .body');
    const nbTop = nb ? nb.scrollTop : 0;
    render();
    const again = root.querySelector('.page--prose');
    if (again) again.scrollTop = top;
    const nb2 = root.querySelector('.page--notebook .body');
    if (nb2) nb2.scrollTop = nbTop;
  }

  /** book-look, item 2: a control's identity across a redraw, from the attributes it's drawn with. */
  function focusKey(node: HTMLElement): string | null {
    for (const a of ['data-focus', 'data-command', 'data-person', 'data-claim', 'data-cell', 'data-mark']) {
      const v = node.getAttribute(a);
      if (v !== null) return `[${a}="${CSS.escape(v)}"]`;
    }
    return null;
  }

  /** After a render: the focus where `focusNext` says, without scrolling the page under the reader. */
  function placeFocus(): void {
    const want = focusNext;
    focusNext = null;
    if (!want) return;
    const heading = () => root.querySelector<HTMLElement>('.runhead .place');
    let target: HTMLElement | null = null;
    if (want.to === 'page') target = heading();
    else if (want.to === 'verdict') target = root.querySelector<HTMLElement>('#verdict-title');
    else {
      const hit = root.querySelector<HTMLElement>(want.key);
      target = hit && !(hit as HTMLButtonElement).disabled ? hit : heading();
    }
    target?.focus({ preventScroll: true });
  }

  /** book-look, items 2 and 4: the notebook's view on a phone, opened and shut, said to a screen reader. */
  function notebookShown(on: boolean, focus = false): void {
    document.body.classList.toggle('notebook-open', on);
    for (const b of root.querySelectorAll('.nb-link')) b.setAttribute('aria-expanded', String(on));
    if (!focus) return;
    if (on) root.querySelector<HTMLElement>('#notebook-title')?.focus({ preventScroll: true });
    else root.querySelector<HTMLElement>('.runhead .place')?.focus({ preventScroll: true });
  }

  function render(): void {
    hideCard();
    cueWatch?.disconnect();
    cueWatch = null;
    if (screen.kind === 'title' || !d || !run) {
      clear(root);
      spread = null;
      const sheet = titlePage();
      root.append(sheet);
      // The title page has its own rain, quietly, unless the weather is switched off.
      weather.show('rain');
      weather.attach(sheet);
      if (!sheet.querySelector('dialog[open]')) sheet.querySelector<HTMLElement>(choosing ? '#case-picker [role="radio"][tabindex="0"]' : '[data-primary]')?.focus({ preventScroll: true });
      return;
    }
    if (!spread || spread.parentNode !== root) {
      clear(root);
      spread = el('div', { class: 'spread spread--board' });
      root.append(spread);
    }
    for (const node of [...root.childNodes]) if (node !== spread) node.remove();
    for (const node of [...spread.childNodes]) if (node !== weather.element) node.remove();
    spread.append(leftPage(), rightPage());
    // (book-look, item 5: the clock strikes eight and the stamp lands, once, as the verdict first shows.)
    spread.classList.toggle('ceremony', ceremony && screen.kind === 'verdict');
    ceremony = false;
    weather.show(run.weather);
    weather.attach(spread);
    watchChoices();
    placeFocus();
  }

  /**
   * book-look, item 4: a long page's quiet cue that the choices are below (Medium 12's first page puts
   * them ~1,130 px down at 375). It shows while they're out of view and goes once they're in it; it's
   * also a way straight to them for a keyboard or a screen reader.
   */
  function watchChoices(): void {
    const page = root.querySelector<HTMLElement>('.page--prose');
    const target = page?.querySelector<HTMLElement>('.choices, form.report');
    const cue = page?.querySelector<HTMLElement>('.cue-below');
    if (!page || !cue) return;
    if (!target || typeof IntersectionObserver !== 'function') {
      cue.hidden = true;
      return;
    }
    cueWatch = new IntersectionObserver(
      (entries) => {
        for (const e of entries) cue.hidden = e.isIntersecting || e.boundingClientRect.top < (e.rootBounds?.top ?? 0);
      },
      { root: page, threshold: 0, rootMargin: '0px 0px -56px 0px' },
    );
    cueWatch.observe(target);
  }

  function leftPage(): HTMLElement {
    // book-look, item 2: the play screen's main landmark; its place is the page's h1.
    const page = el('main', { class: 'page page--prose', id: 'page' });
    const r = run as BoardRun;
    const shown = Math.min(turned, r.log.length - 1);
    page.append(runningHead(shown));
    // book-look, item 2: past the page's names to its choices (or the report) in one key, for a keyboard;
    // hidden until it has the focus.
    if (screen.kind === 'book' && shown === r.log.length - 1) {
      const skip = el('button', { class: 'skip-link', type: 'button', 'data-focus': 'skip', text: r.reportOpen && !r.filed ? 'Skip to the report' : 'Skip to the choices' });
      skip.addEventListener('click', () => {
        const target = root.querySelector<HTMLElement>('.page--prose .choices, .page--prose form.report');
        target?.querySelector<HTMLElement>('button:not(:disabled), select, input')?.focus();
      });
      page.append(skip);
    }
    const leaf = el('div', { class: 'leaf' });
    if (screen.kind === 'teach') {
      const teach = el('div', { class: 'teach', role: 'region', 'aria-label': BOARD_TEACH_TITLE });
      teach.append(el('h2', { class: 'teach-title', text: BOARD_TEACH_TITLE }));
      const list = el('ol', { class: 'teach-list' });
      for (const line of teachLines(d?.kase.world)) list.append(el('li', { class: 'teach-line', text: line }));
      teach.append(list);
      const go = el('button', { class: 'big-button teach-go', type: 'button', text: 'Start' });
      go.addEventListener('click', () => {
        screen = { kind: 'book' };
        focusNext = { to: 'page' };
        render();
      });
      teach.append(el('div', { class: 'teach-buttons' }, go));
      leaf.append(teach);
      // (book-look, item 4: the notebook's button at the foot on every screen of a night, the verdict's too.)
      page.append(leaf, pageFoot('What next'));
      return page;
    }
    if (screen.kind === 'verdict') {
      leaf.append(
        renderVerdict(screen.verdict, () => toTitle(), { story: storyOfBoard(d as BoardDeal), fastest: fastestSolveLines(d as BoardDeal, r, screen.verdict.outcome), curtain: () => curtainNode(d as BoardDeal, r, r.filed) }, screen.news, caption()),
      );
      page.append(leaf, pageFoot('What next'));
      return page;
    }
    const newest = shown === r.log.length - 1;
    if (r.reportOpen && !r.filed && newest) {
      const p = r.log[shown];
      if (p) for (const n of pageNodes(p)) leaf.append(n);
      leaf.append(reportForm());
      page.append(leaf, pager(), pageFoot('The report'));
      return page;
    }
    const p = r.log[shown];
    if (p) for (const n of pageNodes(p)) leaf.append(n);
    page.append(leaf);
    // (book-look, item 5: the setback, the one ornament, between the page and the choices.)
    if (newest) page.append(setback(), choicesPanel());
    else page.append(el('p', { class: 'note turned-note', text: 'A page turned back to.' }));
    page.append(pager(), pageFoot('What next'));
    return page;
  }

  /**
   * book-look, item 4: the foot of the page, held at the bottom of the window: the cue that the
   * choices are below, and on a phone the notebook, where a thumb reaches it.
   */
  function pageFoot(what: string): HTMLElement {
    const foot = el('div', { class: 'page-foot' });
    const cue = el('button', { class: 'cue-below', type: 'button', 'data-focus': 'cue' });
    cue.append(el('span', { text: what }), el('span', { class: 'cue-arrow', 'aria-hidden': 'true', text: '↓' }));
    cue.hidden = true;
    cue.addEventListener('click', () => {
      const target = root.querySelector<HTMLElement>('.page--prose .choices, .page--prose form.report');
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target?.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
      target?.querySelector<HTMLElement>('button:not(:disabled), select, input')?.focus({ preventScroll: true });
    });
    const nb = el('button', { class: 'nb-link nb-foot', type: 'button', 'aria-controls': 'notebook', 'aria-expanded': String(document.body.classList.contains('notebook-open')), text: 'Notebook' });
    nb.addEventListener('click', () => notebookShown(true, true));
    foot.append(cue, nb);
    return foot;
  }

  /**
   * The running head: the place (the page's h1), the clock, and the dial of actions from 12 to 8.
   * book-look, item 5: once the case is closed the clock strikes eight: the head says "The verdict",
   * 8:00 a.m., every notch still left is struck and the 8 lights (`.ceremony` plays it, once).
   */
  function runningHead(i: number): HTMLElement {
    const r = run as BoardRun;
    const budget = budgetCalls(d as BoardDeal);
    const closed = screen.kind === 'verdict';
    const used = closed ? budget : usedByPage(r.log, i);
    const strip = clockStrip(used, budget, deadlineWords((d as BoardDeal).kase));
    const head = el('header', { class: `runhead runhead--clock${closed ? ' runhead--closed' : ''}` });
    const place = closed ? 'The verdict' : (r.log[i]?.head ?? '');
    head.append(el('div', { class: 'runhead-line' }, el('h1', { class: 'place', ...(closed ? { id: 'verdict-title' } : {}), tabindex: '-1', text: place }), clockNode(strip.time)));
    const dial = el('div', { class: `dial${closed ? ' dial--eight' : ''}${budget > 18 ? ' dial--long' : ''}`, role: 'img', 'aria-label': closed ? 'Eight o’clock. The case is closed.' : `${used} of ${budget} actions used`, 'data-spent': String(used) });
    const notches = el('span', { class: 'notches', 'aria-hidden': 'true' });
    strip.notches.forEach((kind, j) => {
      const fresh = !closed && i === r.log.length - 1 && justSpent > 0 && kind === 'spent' && j >= used - justSpent;
      const struck = closed && j >= r.used;
      const n = el('span', { class: `notch notch--${kind}${fresh ? ' notch--fresh' : ''}${struck ? ' notch--struck' : ''}` });
      if (struck) n.style.setProperty('--i', String(j - r.used));
      // The chase to eight: each notch still left knows its place in the run to the 8.
      if (kind === 'left') n.style.setProperty('--i', String(j - strip.notches.indexOf('left')));
      notches.append(n);
    });
    dial.append(el('span', { class: 'dial-end', 'aria-hidden': 'true', text: '12' }), notches, el('span', { class: 'dial-end dial-end--eight', 'aria-hidden': 'true', text: '8' }));
    head.append(dial, el('div', { class: 'calls-left', text: closed ? 'Eight o’clock. The case is closed.' : strip.left }));
    return head;
  }

  /** book-look, item 5: the DA's caption for the report and the verdict, by the case's kind. */
  function caption(): { court: string; against: string; caseLine: string } {
    const c = (d as BoardDeal).kase;
    const client = deadlineWords(c)?.replace(/ wants an answer at eight$/, '');
    return { court: client ? reportTo(client) : COURT, against: client ? CONCERNING : AGAINST, caseLine: `Case № ${c.seed} · ${tierName(c.tier)}` };
  }

  /** A page's blocks as paper, every name in it carrying its card (with `?plain=1`, its plain page). */
  function pageNodes(p: Page): HTMLElement[] {
    const out: HTMLElement[] = [];
    const plain = PLAIN ? plainPage((d as BoardDeal).kase, p) : null;
    if (plain && plain.length === 0) return [el('p', { class: 'note', text: 'Nothing new.' })];
    for (const b of plain ?? p.blocks) {
      if (b.kind === 'prose') {
        const node = el('p', { class: `prose--${b.voice}` });
        // docs/64: the turn's heading is a plain divider, "Where things stood".
        node.append(withNames(b.voice === 'chapter' ? chapterShown(b.text) : b.text));
        out.push(node);
      } else if (b.kind === 'note') {
        const node = el('p', { class: 'note' });
        node.append(withNames(b.text));
        out.push(node);
      }
    }
    return out;
  }

  /** The people and places in a run of text, each with a hover card. */
  function withNames(text: string): DocumentFragment {
    const frag = document.createDocumentFragment();
    const c = (d as BoardDeal).kase;
    const nouns: { word: string; card: CardSource; kind: 'person' | 'place' }[] = [];
    for (const p of c.people) {
      if (p.object) continue;
      nouns.push({ word: p.short, kind: 'person', card: () => personCardOf(p.id) });
    }
    for (const pl of c.places) nouns.push({ word: pl.short.replace(/^the /, ''), kind: 'place', card: () => ({ title: pl.short, lines: [pl.name[0]?.toUpperCase() + pl.name.slice(1) + '.'] }) });
    nouns.sort((a, b) => b.word.length - a.word.length);
    const re = new RegExp(`(${nouns.map((n) => n.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    let last = 0;
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0;
      if (at > last) frag.append(document.createTextNode(text.slice(last, at)));
      const n = nouns.find((x) => x.word === m[0]);
      if (n) {
        // book-look, item 2: a name is a control (its card opens on focus, and on Enter), and says so.
        const span = el('span', { class: `noun noun--${n.kind}`, tabindex: '0', role: 'button', text: m[0] });
        attachCard(span, n.card);
        frag.append(span);
      } else frag.append(document.createTextNode(m[0]));
      last = at + m[0].length;
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    return frag;
  }

  function personCardOf(id: string): { title: string; lines: string[] } | null {
    const c = (d as BoardDeal).kase;
    const p = personOf(c, id);
    if (!p) return null;
    const known = knownPeople(c, run as BoardRun).has(id);
    if (!known) return { title: p.short, lines: ['Not in the notebook yet.'] };
    const who = peopleLine(c, id);
    const role = p.role === 'client' ? `My client: ${p.description}.` : p.role === 'victim' ? `${p.description[0]?.toUpperCase()}${p.description.slice(1)}. The dead ${p.female ? 'woman' : 'man'}.` : `${who[0]?.toUpperCase()}${who.slice(1)}.`;
    const lines = [role];
    if ((run as BoardRun).asked.includes(`account:${id}`)) lines.push('Their own evening is in the notebook.');
    return { title: nameInFull(c, id), lines };
  }

  /* ----------------------------------------------------------- choices */

  /**
   * book-look, item 5: every kind of action has its own form (scratchpad direction.md §7). A question
   * is a line on the interview sheet, a search an evidence tag, a walk a transfer for the el with its
   * stub, confronting the red summons, and what's free a pencilled underline. Each is still a button
   * with its whole label; its `aria-label` says the star, the cost and what's done.
   */
  type Kind = 'ask' | 'search' | 'walk' | 'free' | 'confront';

  function button(ch: OfferedChoice, onClick: () => void, kind: Kind): HTMLButtonElement {
    const b = el('button', {
      class: ['choice', `choice--${kind}`, ch.lead ? 'choice--lead' : '', ch.done ? 'choice--done' : ''].filter(Boolean).join(' '),
      type: 'button',
      'data-command': ch.command,
      'aria-label': [ch.label, ch.lead && ch.why ? `starred: ${ch.why}` : '', ch.done ? 'already done' : '', costText(ch), ch.note ?? ''].filter(Boolean).join(', '),
    });
    const label = el('span', { class: 'label' });
    if (ch.lead) label.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
    label.append(ch.label);
    const cost = ch.command.startsWith('picker') && pickerOpen ? 'close' : costText(ch);
    const aside = ch.note ? el('span', { class: 'aside', text: ch.note }) : null;
    const why = ch.lead && ch.why ? el('span', { class: 'aside why', text: ch.why }) : null;
    if (kind === 'walk') {
      // The destination as the car's roll-sign, the note under it; on the stub, torn off at the dashes,
      // the route from here to there, and a step along it under the finger.
      const body = el('span', { class: 'body' }, label, aside, why);
      const stub = el('span', { class: 'mins stub', 'aria-hidden': 'true' });
      if (cost) stub.textContent = cost;
      else stub.append(routeSvg());
      b.append(body, stub);
    } else {
      b.append(label);
      // (book-look, item 5: done says so in a word, never a ✓ glyph; the aria-label says "already done".)
      if (ch.done) b.append(el('span', { class: 'state', 'aria-hidden': 'true', text: ch.command.startsWith('search ') ? 'searched' : 'asked' }));
      if (cost) b.append(el('span', { class: 'mins', text: cost }));
      if (aside) b.append(aside);
      if (why) b.append(why);
    }
    b.addEventListener('click', onClick);
    return b;
  }

  /** "2 questions" as the directory says it: the number like a room number, the words after it. */
  function roomCount(text: string): HTMLElement {
    const m = /^(\d+) (.*)$/.exec(text);
    return m ? el('span', { class: 'mins' }, el('span', { class: 'num', text: m[1] }), ` ${m[2]}`) : el('span', { class: 'mins', text });
  }

  function choicesPanel(): HTMLElement {
    const groups = boardChoices(d as BoardDeal, run as BoardRun);
    const kase = (d as BoardDeal).kase;
    const panel = el('nav', { class: 'choices choices--board', 'aria-label': 'What next' });
    const asks = groups.filter((g) => g.kind === 'ask');
    if (asks.length > 0) {
      const section = el('section', { class: 'choice-group choice-group--people' });
      // Round 5, U1, in docs/64's words: "Talk to", the CLI's heading; the key says what's free.
      section.append(el('h2', { class: 'choice-heading', text: TALK_HEADING }));
      // book-look, item 5: the lobby directory: the names in the building's letters, the count where
      // the room number goes, and the open name's questions inside the same frame.
      const directory = el('div', { class: 'directory' });
      const row = el('div', { class: 'choice-list who-list', role: 'group', 'aria-label': 'Who to talk to' });
      for (const g of asks) {
        const id = g.personId as string;
        const star = g.choices.find((c) => c.lead);
        const on = id === selected;
        const b = el('button', {
          class: `choice who-choice${on ? ' who-choice--on' : ''}${star ? ' choice--lead' : ''}`,
          type: 'button',
          'data-person': id,
          'aria-expanded': on ? 'true' : 'false',
          'aria-label': [nameOf(kase, id), star?.why ? `starred: ${star.why}` : '', on ? 'questions open' : questionsText(g, kase), 'free to pick'].filter(Boolean).join(', '),
        });
        const label = el('span', { class: 'label' });
        if (star) label.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
        label.append(nameOf(kase, id));
        // The directory's listing: a dotted leader to the count, its number set like a room number.
        b.append(
          el('span', { class: 'namecell' }, label, star?.why ? el('span', { class: 'aside why', text: star.why }) : null),
          el('span', { class: 'leader', 'aria-hidden': 'true' }),
          roomCount(on ? 'close' : questionsText(g, kase)),
        );
        b.addEventListener('click', () => {
          selected = on ? null : id;
          pickerOpen = false;
          pickerClaim = null;
          justSpent = 0;
          renderInPlace();
        });
        row.append(b);
      }
      directory.append(row);
      const g = asks.find((x) => x.personId === selected);
      if (g) directory.append(topicsSection(g));
      section.append(directory);
      panel.append(section);
    }
    for (const g of groups) {
      if (g.kind === 'ask') continue;
      if (g.kind === 'free') {
        // What costs nothing: a pencilled underline, "free" beside it. (book-look, item 1: "Close the case"
        // isn't one of them; it has its own place at the foot.)
        const free = el('div', { class: 'choice-group choice-group--free' });
        const list = el('div', { class: 'choice-list free-list' });
        for (const ch of g.choices) if (ch.command !== 'file') list.append(button(ch, () => command(ch.command), 'free'));
        // docs/67: the Hint button sits with the free choices, and what it said under them.
        const [hb, hnote] = hintNodes();
        if (hb) list.append(hb);
        free.append(list);
        if (hnote) free.append(hnote);
        if (list.childElementCount > 0 || hnote) panel.append(free);
        continue;
      }
      const section = el('section', { class: `choice-group choice-group--${g.kind}` });
      if (g.heading) section.append(el('h2', { class: 'choice-heading', text: g.heading }));
      const kind: Kind = g.kind === 'search' ? 'search' : 'walk';
      const list = el('div', { class: `choice-list${kind === 'walk' ? ' go-list' : ' search-list'}` });
      for (const ch of g.choices) list.append(button(ch, () => command(ch.command), kind));
      if (moreGo) for (const ch of g.more ?? []) list.append(button(ch, () => command(ch.command), kind));
      section.append(list);
      if ((g.more ?? []).length > 0) {
        const t = el('button', { class: 'choice choice--free choice--more', type: 'button', 'data-focus': 'more', 'aria-expanded': moreGo ? 'true' : 'false' });
        t.append(el('span', { class: 'label', text: moreGo ? 'Fewer places' : `Other places (${(g.more ?? []).length})` }), el('span', { class: 'mins', text: 'free' }));
        t.addEventListener('click', () => {
          moreGo = !moreGo;
          justSpent = 0;
          renderInPlace();
        });
        section.append(el('div', { class: 'choice-list free-list' }, t));
      }
      panel.append(section);
    }
    // book-look, item 1: "Close the case" apart from everything that costs, at the foot, its own weight.
    if (groups.some((g) => g.choices.some((c) => c.command === 'file'))) panel.append(closeSection());
    numberChoices(panel, groups);
    // docs/64: the key, on the first page, as the CLI says it; docs/67: and tonight's hints (Hard-boiled: its mark line).
    if ((run as BoardRun).log.length === 1) panel.append(el('p', { class: 'note action-key', text: ACTION_KEY }));
    const hints = hintsNote(d as BoardDeal, run as BoardRun);
    if (hints) panel.append(el('p', { class: 'note hints-note', text: hints }));
    return panel;
  }

  /**
   * book-look, item 2: number the page's choices as the CLI does (people, then searches, walks, the
   * places folded under "Other places", the free row and "Close the case"; with a person's topics open,
   * those topics), and mark each drawn one with its number, shown while the keyboard is in the choices.
   */
  function numberChoices(panel: HTMLElement, groups: OfferedGroup[]): void {
    keyed = [];
    const open = groups.find((g) => g.kind === 'ask' && g.personId === selected);
    if (open) open.choices.forEach((c, i) => keyed.push({ n: i + 1, command: c.command }));
    else {
      let n = 1;
      for (const g of groups) {
        if (g.kind === 'ask') keyed.push({ n: n++, person: g.personId as string });
        else for (const c of [...g.choices, ...(g.more ?? [])]) keyed.push({ n: n++, command: c.command });
      }
    }
    for (const k of keyed) {
      if (k.n > 9) continue;
      const sel = k.person ? `[data-person="${CSS.escape(k.person)}"]` : `[data-command="${CSS.escape(k.command ?? '')}"]`;
      const b = panel.querySelector<HTMLElement>(sel);
      if (!b) continue;
      b.setAttribute('aria-keyshortcuts', String(k.n));
      const where = b.querySelector('.label') ?? b;
      where.prepend(el('span', { class: 'key-num', 'aria-hidden': 'true', text: String(k.n) }));
    }
  }

  /** book-look, item 2: a number key picks that choice, never inside a field, and never with a modifier. */
  function numberKey(e: KeyboardEvent): void {
    if (screen.kind !== 'book' || !run || run.reportOpen || run.filed || turned !== run.log.length - 1) return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key)) return;
    const at = e.target as HTMLElement | null;
    if (at && (at.closest('input, select, textarea, [contenteditable=""], [contenteditable="true"]') || at.isContentEditable)) return;
    if (pickerOpen) return;
    const k = keyed.find((x) => x.n === Number(e.key));
    if (!k) return;
    e.preventDefault();
    if (k.person) {
      selected = selected === k.person ? null : k.person;
      pickerOpen = false;
      pickerClaim = null;
      justSpent = 0;
      focusNext = { to: 'key', key: `[data-person="${CSS.escape(k.person)}"]` };
      renderInPlace();
      return;
    }
    const cmd = k.command ?? '';
    if (cmd.startsWith('picker ')) {
      pickerOpen = true;
      pickerClaim = null;
      justSpent = 0;
      focusNext = { to: 'key', key: `[data-command="${CSS.escape(cmd)}"]` };
      renderInPlace();
      return;
    }
    command(cmd);
  }

  /**
   * book-look, items 1 and 5: "Close the case", the office door at the foot of the choices (and of the
   * notebook): a full-width bar behind a double rule, "ends the night" beside it, and under it what
   * pressing it does: it opens the report first, which goes back in the drawer until you close it.
   */
  function closeSection(where: 'page' | 'notebook' = 'page'): HTMLElement {
    const id = `close-note-${where}`;
    const section = el('section', { class: 'choice-group choice-group--close file', 'aria-labelledby': `close-heading-${where}` });
    section.append(el('h2', { class: 'choice-heading sr-only', id: `close-heading-${where}`, text: CLOSE_HEADING }));
    const b = el('button', { class: 'choice choice--file', type: 'button', 'data-command': 'file', 'aria-label': `Close the case, ${CLOSE_TAG}`, 'aria-describedby': id });
    b.append(el('span', { class: 'label', text: 'Close the case' }), el('span', { class: 'mins', text: CLOSE_TAG }));
    b.addEventListener('click', () => command('file'));
    section.append(b, el('p', { class: 'close-note', id, text: CLOSE_NOTE }));
    return section;
  }

  /** The open name's questions, ruled like an interview sheet, and the summons to confront them. */
  function topicsSection(g: OfferedGroup): HTMLElement {
    const id = g.personId as string;
    const section = el('section', { class: 'choice-group choice-group--ask ask' });
    section.append(el('h3', { class: 'choice-heading', text: `Ask ${nameOf((d as BoardDeal).kase, id)} about` }));
    const list = el('div', { class: 'choice-list ask-list' });
    let confront: HTMLButtonElement | null = null;
    for (const ch of g.choices) {
      if (ch.command.startsWith('picker ')) {
        confront = button(ch, () => {
          pickerOpen = !pickerOpen;
          pickerClaim = null;
          justSpent = 0;
          renderInPlace();
        }, 'confront');
        confront.setAttribute('aria-expanded', String(pickerOpen));
        continue;
      }
      list.append(button(ch, () => command(ch.command), 'ask'));
    }
    section.append(list);
    if (confront) section.append(confront);
    if (pickerOpen) {
      const pk = pickerFor(d as BoardDeal, run as BoardRun, id);
      if (pk) section.append(pickerNode(pk));
    }
    return section;
  }

  /** docs/43 §5: their line against the line that breaks it. */
  function pickerNode(pk: Picker): HTMLElement {
    const c = (d as BoardDeal).kase;
    const box = el('div', { class: 'confront-picker board-picker', role: 'group', 'aria-label': `Confront ${nameOf(c, pk.person)}` });
    // docs/47 A6: the person's own pronouns, never "their" for one woman. Round 5, U7: the CLI's words,
    // and that the report counts it either way. docs/64: an action, said only where it's free.
    const female = personOf(c, pk.person)?.female === true;
    const him = female ? 'her' : 'him';
    box.append(el('p', { class: 'note', text: pickerNote(d as BoardDeal, pk) }));
    if (pk.ready.length > 0) {
      const sec = el('section', { class: 'picker-sec' });
      sec.append(el('h4', { class: 'picker-head', text: `What ${female ? 'she' : 'he'} said, and what says otherwise` }));
      for (const r of pk.ready) {
        const b = el('button', { class: 'choice choice--fact', type: 'button', 'data-command': r.command, text: r.label });
        b.addEventListener('click', () => command(r.command));
        sec.append(b);
      }
      box.append(sec);
      return box;
    }
    const claim = pickerClaim === null ? null : pk.claims.find((x) => x.hour === pickerClaim);
    if (!claim) {
      const sec = el('section', { class: 'picker-sec' });
      sec.append(el('h4', { class: 'picker-head', text: `Which part of ${nameOf(c, pk.person)}’s evening?` }));
      for (const x of pk.claims) {
        const b = el('button', { class: 'choice choice--fact', type: 'button', 'data-claim': String(x.hour) });
        b.append(el('span', { class: 'label', text: x.said }), el('span', { class: 'mins', text: 'free' }));
        b.addEventListener('click', () => {
          pickerClaim = x.hour;
          renderInPlace();
        });
        sec.append(b);
      }
      box.append(sec);
      return box;
    }
    const sec = el('section', { class: 'picker-sec' });
    sec.append(el('h4', { class: 'picker-head', text: `${claim.said}. Tell ${him}:` }));
    for (const l of claim.lines) {
      const b = el('button', { class: 'choice choice--fact', type: 'button', 'data-command': l.command });
      b.append(el('span', { class: 'label', text: l.label }), el('span', { class: 'fact-src', text: l.source }));
      b.addEventListener('click', () => command(l.command));
      sec.append(b);
    }
    const back = el('button', { class: 'choice choice--more', type: 'button', text: `Back to ${nameOf(c, pk.person)}’s evening` });
    back.addEventListener('click', () => {
      pickerClaim = null;
      renderInPlace();
    });
    sec.append(back);
    box.append(sec);
    return box;
  }

  function pager(): HTMLElement {
    const r = run as BoardRun;
    const hint = el('div', { class: 'pager' });
    const back = el('button', { type: 'button', 'data-focus': 'pager-back', 'aria-label': 'Back a page', text: '‹ back' });
    back.disabled = turned <= 0;
    back.addEventListener('click', () => {
      turned = Math.max(0, turned - 1);
      justSpent = 0;
      focusNext = { to: 'key', key: '[data-focus="pager-back"]' };
      render();
    });
    const forward = el('button', { type: 'button', 'data-focus': 'pager-forward', 'aria-label': 'Forward a page', text: 'forward ›' });
    forward.disabled = turned >= r.log.length - 1;
    forward.addEventListener('click', () => {
      turned = Math.min(r.log.length - 1, turned + 1);
      justSpent = 0;
      focusNext = { to: 'key', key: '[data-focus="pager-forward"]' };
      render();
    });
    const wx = el('button', { class: 'wx-toggle', type: 'button', 'aria-pressed': String(weather.enabled), text: weather.enabled ? 'weather on' : 'weather off' });
    wx.addEventListener('click', () => {
      const on = !weather.enabled;
      saveWeatherOn(store, on);
      weather.setEnabled(on);
      wx.textContent = on ? 'weather on' : 'weather off';
    });
    hint.append(back, el('span', { class: 'pager-at', text: `page ${turned + 1} of ${r.log.length}` }), forward, wx);
    return hint;
  }

  /* ------------------------------------------------------------ the form */

  function reportForm(): HTMLElement {
    const r = run as BoardRun;
    const form = el('form', { class: 'report' });
    // book-look, item 5: the report is a typed charge to the DA. The plaque's caption says who it's for
    // ("The People of the State of New York against …", or a small case's "Report to …"), and the blank
    // under it is the "Who" field, a real select with its own label.
    const cap = caption();
    const plaque = el('div', { class: 'plaque report-plaque' });
    plaque.append(crest(), el('p', { class: 'court', text: cap.court }), el('p', { class: 'against', text: cap.against }));
    form.append(
      el('h2', { class: 'sr-only', text: 'Close the case' }),
      plaque,
      // Round 5, U6: what a blank goes in as, once, the CLI's words.
      el('p', { class: 'note report-rule', text: blankRule(d as BoardDeal, r.used >= budgetCalls(d as BoardDeal)) }),
    );
    // book-look, item 1: taken out by choice, the report goes back in the drawer, free; never once the clock is out.
    if (canGoBack(d as BoardDeal, r)) {
      const back = el('button', { class: 'choice choice--free report-back', type: 'button', 'data-command': 'back' });
      back.append(el('span', { class: 'label', text: BACK_TO_CASE }), el('span', { class: 'mins', text: 'free' }));
      back.addEventListener('click', () => command('back'));
      form.append(el('div', { class: 'report-back-row' }, back));
    }
    // docs/67: here a hint says what's still missing, or that the report can be filled from what you have.
    const [hb, hnote] = hintNodes();
    if (hb && hnote) form.append(el('div', { class: 'choice-list report-hint' }, hb), hnote);
    const dd = d as BoardDeal;
    const selects = new Map<FieldKey, HTMLSelectElement>();
    const lines = new Map<FieldKey, () => string | null>();
    // docs/46 §3: the hours that mattered, as the notebook has them.
    const hs = hoursThatMattered(dd).map((h) => hourWord(h));
    const hours = hs.length > 1 ? `${hs.slice(0, -1).join(', ')} or ${hs[hs.length - 1]}` : (hs[0] ?? '');
    /** A line question: the lines it offers as a list to pick one from, and a hunch. */
    const lineField = (key: 'breaks' | 'whereBy' | 'cleared', label: string, options: () => LineOption[], note: () => string, group: () => { touching: string; rest: string } | null = () => null) => {
      const box = el('fieldset', { class: 'field field--lines' });
      box.append(el('legend', { text: label }));
      const hint = el('p', { class: 'line-hint' });
      const list = el('div', { class: 'line-options', role: 'radiogroup', 'aria-label': label });
      box.append(hint, list);
      const fill = () => {
        hint.textContent = note();
        // (A line picked before the name, or before the name changed, stays picked while it's still offered.)
        const was = (list.querySelector('input:checked') as HTMLInputElement | null)?.value;
        clear(list);
        const opts: LineOption[] = options();
        const keep = keptPick(was, opts);
        // docs/47 A4: the lines that touch the named person's own story come first, under a heading.
        const touching = opts.filter((o) => o.touches).length;
        [...opts, { value: '', label: HUNCH }].forEach((o, i) => {
          const heads = group();
          if (heads && touching > 0 && i === 0) list.append(el('p', { class: 'line-group', text: heads.touching }));
          if (heads && touching > 0 && i === touching && i < opts.length) list.append(el('p', { class: 'line-group', text: heads.rest }));
          const id = `rf-${key}-${i}`;
          const input = el('input', { type: 'radio', name: key, value: o.value, id });
          if (o.value === keep) input.checked = true;
          list.append(el('label', { class: `line-option${o.value === '' ? ' line-option--hunch' : ''}${(o as LineOption).touches ? ' line-option--touches' : ''}`, for: id }, input, el('span', { text: o.label })));
        });
      };
      fill();
      lines.set(key, () => (list.querySelector('input:checked') as HTMLInputElement | null)?.value || null);
      form.append(box);
      return fill;
    };
    for (const f of boardFields(dd, r)) {
      const s = el('select', { name: f.key, id: `rf-${f.key}` });
      s.append(el('option', { value: '' }, 'I don’t know'));
      for (const o of f.options) s.append(el('option', { value: o.value }, o.label));
      selects.set(f.key, s);
      // (book-look, item 2: the label names its select. Item 5: "Who" is the plaque's typed blank.)
      if (f.key === 'who') {
        plaque.append(el('div', { class: 'blank' }, el('label', { class: 'sr-only', for: `rf-${f.key}`, text: f.label }), s), el('p', { class: 'meta' }, el('span', { text: DETECTIVES_REPORT }), ' ', el('span', { text: cap.caseLine })));
      } else form.append(el('div', { class: 'field' }, el('label', { for: `rf-${f.key}`, text: f.label }), s));
      if (f.key === 'who') {
        const who = () => s.value || null;
        const refill = lineField(
          'breaks',
          BREAKS_LABEL,
          () => breakOptionsShown(dd, r, who()),
          () => (who() ? 'Pick what proves it, or “A hunch”.' : `Pick who first. Until then, this is what you were told about ${hours} o’clock.`),
          () => (who() ? lineGroupHeads(dd, r, who() as string) : null),
        );
        s.addEventListener('change', refill);
      }
      if (f.key === 'other') {
        // docs/61: who else lied, and the line that cleared them: the same lines as for who, for that name.
        const other = () => s.value || null;
        const named = () => {
          const o = other();
          return o && o !== NOBODY ? nameOf(dd.kase, o) : null;
        };
        const refill = lineField(
          'cleared',
          CLEARED_LABEL,
          () => clearOptions(dd, r, other()),
          () => (other() === NOBODY ? 'Nobody else, so there’s nothing to clear.' : named() ? 'Pick what clears them: somebody else’s word, not their own. Or “A hunch”.' : `Pick who first. Until then, this is what you were told about ${hours} o’clock.`),
          () => (other() && other() !== NOBODY ? lineGroupHeads(dd, r, other() as string) : null),
        );
        s.addEventListener('change', refill);
      }
      if (f.key === 'where') lineField('whereBy', whereByLabel(dd), () => whereByOptions(dd, r), () => 'What people let slip, what you found, and what they said when you confronted them.');
    }
    const submit = el('div', { class: 'after report-submit' }, el('button', { class: 'open-case close-button file-it', type: 'submit', text: 'Close the case' }));
    form.append(submit);
    const answers = (): BoardReport => {
      const a: Partial<Record<FieldKey, string | null>> = {};
      for (const [k, s] of selects) a[k] = s.value || null;
      for (const [k, v] of lines) a[k] = v();
      return reportFrom(dd, a);
    };
    // book-look, item 1: the charge said back in plain words, then "Close it" or "Not yet". Changing
    // an answer while it's up takes it down, so what's closed is always what was read.
    let confirm: HTMLElement | null = null;
    const notYet = (focus: boolean) => {
      confirm?.remove();
      confirm = null;
      submit.hidden = false;
      if (focus) submit.querySelector<HTMLElement>('button')?.focus();
    };
    form.addEventListener('change', () => notYet(false));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const report = answers();
      notYet(false);
      confirm = confirmNode(report, () => file(report), () => notYet(true));
      submit.hidden = true;
      submit.after(confirm);
      confirm.querySelector<HTMLElement>('.file-confirm-title')?.focus();
    });
    return form;
  }

  /**
   * book-look, item 1: before the case is closed, the charge said back (`chargeLines`, the CLI's
   * words too), and a blank report said as blank. "Close it" closes it; "Not yet" goes back to the form.
   */
  function confirmNode(report: BoardReport, yes: () => void, no: () => void): HTMLElement {
    const box = el('section', { class: `file-confirm plaque${blankReport(report) ? ' file-confirm--blank' : ''}`, 'aria-labelledby': 'file-confirm-title' });
    box.append(el('h3', { class: 'file-confirm-title', id: 'file-confirm-title', tabindex: '-1', text: blankReport(report) ? 'A blank report' : 'The charge' }));
    const lines = chargeLines(d as BoardDeal, run as BoardRun, report);
    for (const [i, l] of lines.entries()) box.append(el('p', { class: i === 0 ? 'charge-lead' : 'charge-line', text: l }));
    box.append(el('p', { class: 'charge-final', text: 'Once it’s closed, it stays closed.' }));
    const yesB = el('button', { class: 'open-case close-button file-it', type: 'button', 'data-confirm': 'file', text: 'Close it' });
    yesB.addEventListener('click', yes);
    const noB = el('button', { class: 'plain-button', type: 'button', 'data-confirm': 'not-yet', text: 'Not yet' });
    noB.addEventListener('click', no);
    box.append(el('div', { class: 'after' }, yesB, noB));
    return box;
  }

  /* ------------------------------------------------------- the notebook */

  function rightPage(): HTMLElement {
    const page = el('aside', { class: 'page page--notebook', id: 'notebook', 'aria-labelledby': 'notebook-title' });
    const c = (d as BoardDeal).kase;
    // book-look, item 4: on a phone the notebook hides the page, so it carries the clock too.
    const r0 = run as BoardRun;
    const strip = clockStrip(r0.used, budgetCalls(d as BoardDeal), deadlineWords(c));
    page.append(
      el(
        'header',
        { class: 'runhead runhead--notebook' },
        el('h2', { class: 'nb-title', id: 'notebook-title', tabindex: '-1', text: 'Notebook' }),
        el('span', { class: 'nb-case', text: `Case № ${c.seed} · ${tierName(c.tier)}` }),
        el('span', { class: 'nb-clock', text: screen.kind === 'verdict' ? 'Eight o’clock. The case is closed.' : `${clockParts(strip.time).figures} ${clockParts(strip.time).ampm} · ${strip.left.replace(/\. .*$/, '.')}` }),
      ),
    );
    const body = el('div', { class: 'body', tabindex: '-1' });
    body.append(el('h2', { text: 'Where they were' }), gridNode(boardGrid(c, run as BoardRun)));
    const r = run as BoardRun;
    // Where it stands, plainly.
    if (r.log.length > 1) {
      body.append(el('h2', { text: 'Where things stand' }));
      const ul = el('ul', { class: 'nb-stands' });
      for (const cl of recapClauses(d as BoardDeal, r)) ul.append(el('li', { text: cl.text }));
      body.append(ul);
    }
    // Everything held, by whose word.
    const lines = linesHeld(c, r).filter((l) => l.kind !== 'given');
    if (lines.length > 0) {
      body.append(el('h2', { text: 'What I was told' }));
      const bySource = new Map<string, string[]>();
      for (const l of lines) {
        const src = l.q.startsWith('list:') ? `Who ${nameOf(c, l.q.slice(5))} saw` : l.q.startsWith('account:') ? `${nameOf(c, l.q.slice(8))}’s evening` : l.q.startsWith('search:') ? 'What I found' : 'When I faced them with it';
        bySource.set(src, [...(bySource.get(src) ?? []), lineShown(c, r, l)]);
      }
      // (Round 8, B1: every line the form can offer is here, a confession too.)
      for (const o of notebookLines(d as BoardDeal, r)) if (o.value.startsWith('crack:')) bySource.set('When I faced them with it', [...(bySource.get('When I faced them with it') ?? []), o.label]);
      // (The reasons asked of them, as the CLI's notebook has them.)
      for (const q of r.asked.filter((x) => x.startsWith('motive:'))) bySource.set('Their reasons', [...(bySource.get('Their reasons') ?? []), `${nameOf(c, q.slice(7))}’s reason: ${personOf(c, q.slice(7))?.motive}.`]);
      for (const [src, ls] of bySource) {
        const entry = el('div', { class: 'nb-entry' });
        entry.append(el('div', { class: 'who', text: src }));
        const ul = el('ul');
        for (const t of ls) ul.append(el('li', { text: t }));
        entry.append(ul);
        body.append(entry);
      }
    }
    body.append(el('h2', { text: 'What my client said' }));
    const office = el('ul', { class: 'nb-stands' });
    for (const t of officeLines(d as BoardDeal)) office.append(el('li', { text: t }));
    body.append(office);
    body.append(el('h2', { text: 'People and places' }));
    const people = el('ul', { class: 'nb-stands' });
    for (const id of knownPeople(c, r)) {
      const p = personOf(c, id);
      if (!p || p.role === 'victim') continue;
      // (Round 6, U6: the CLI's words, who they are and never where they sat tonight.)
      people.append(el('li', { text: `${nameInFull(c, id)}: ${peopleLine(c, id)}.` }));
    }
    for (const [id, why] of knownPlaces(c, r)) people.append(el('li', { text: `${placeName(c, id)} — ${why}.` }));
    body.append(people);
    if (!r.reportOpen) body.append(closeSection('notebook'));
    page.append(body);
    const back = el('button', { class: 'plain-button nb-back', type: 'button', text: 'Back to the page' });
    back.addEventListener('click', () => notebookShown(false, true));
    page.append(back);
    return page;
  }

  /** docs/43 §4: the grid is the board. Fits 375 px: four hours and five people, no sideways scroll. */
  function gridNode(g: BoardGrid): HTMLElement {
    const c = (d as BoardDeal).kase;
    const wrap = el('div', { class: 'bgrid-wrap' });
    if (g.rows.length === 0) {
      wrap.append(el('p', { class: 'note', text: 'Nobody on it yet.' }));
      return wrap;
    }
    const table = el('table', { class: 'bgrid' });
    const head = el('tr');
    head.append(el('th', { class: 'bgrid-name', scope: 'col', text: '' }));
    for (const h of g.hours) {
      const crime = g.crimeHour === h;
      const maybe = g.crimeHour === null && g.window.includes(h);
      head.append(el('th', { scope: 'col', class: `bgrid-hour${crime ? ' bgrid-hour--crime' : ''}${maybe ? ' bgrid-hour--maybe' : ''}`, title: crime ? 'when it happened' : maybe ? (g.givenBy ? `an hour ${g.givenBy} gave` : 'it may have happened then') : '', text: `${h}` }));
    }
    head.append(el('th', { scope: 'col', class: 'bgrid-means', title: meansAsked(meansWords(g.meansLabel)) }, el('span', { text: meansHead(g.meansLabel) })));
    table.append(el('thead', {}, head));
    const tbody = el('tbody');
    for (const r of g.rows) {
      const tr = el('tr', { class: r.victim ? 'bgrid-row--victim' : r.company ? 'bgrid-row--company' : '' });
      tr.append(el('th', { scope: 'row', class: 'bgrid-name', text: r.name }));
      for (const h of g.hours) {
        const cell = r.cells[h] as BoardCell;
        const k = `${r.id}@${h}`;
        const cls = ['bgrid-cell', cell.collision ? 'is-collision' : cell.confirmed ? 'is-confirmed' : cell.seen ? 'is-seen' : cell.says ? 'is-says' : cell.pencil ? 'is-pencil' : 'is-empty', g.crimeHour === h ? 'is-crime' : ''].join(' ');
        const td = el('td', { class: cls });
        const b = el('button', { type: 'button', class: 'bgrid-btn', 'data-cell': k, 'aria-expanded': openCell === k ? 'true' : 'false', 'aria-label': `${r.name} at ${h}: ${cellWords(c, cell)}`, text: cellLabel(g, cell) });
        b.addEventListener('click', () => {
          openCell = openCell === k ? null : k;
          renderInPlace();
        });
        td.append(b);
        tr.append(td);
      }
      tr.append(el('td', { class: `bgrid-means is-${r.means === '?' ? 'unknown' : r.means || 'none'}`, title: r.meansWhy ?? '', text: r.means === '?' ? '·' : r.means }));
      tbody.append(tr);
      // The open cell's lines and the pencil, under its row.
      if (openCell && openCell.startsWith(`${r.id}@`)) {
        const h = Number(openCell.split('@')[1]);
        const cell = r.cells[h] as BoardCell;
        const detail = el('td', { colspan: String(g.hours.length + 2), class: 'bgrid-detail' });
        detail.append(el('div', { class: 'bgrid-detail-head', text: `${r.name}, ${h} o’clock` }));
        if (cell.lines.length === 0) detail.append(el('p', { class: 'note', text: 'Nothing yet about this hour.' }));
        for (const l of cell.lines) detail.append(el('p', { class: `bgrid-line${cell.collision ? ' collides' : ''}`, text: l }));
        // docs/64: "mark a guess", never "pencil".
        const pencil = el('div', { class: 'bgrid-pencil', role: 'group', 'aria-label': 'Mark a guess' });
        pencil.append(el('span', { class: 'bgrid-pencil-label', text: 'Your guess:' }));
        for (const [pid] of knownPlaces(c, run as BoardRun)) {
          const pb = el('button', { type: 'button', class: `chip${cell.pencil?.at === pid ? ' on' : ''}`, 'data-mark': `${openCell}:${pid}`, 'aria-pressed': String(cell.pencil?.at === pid), text: g.codes[pid] ?? placeName(c, pid) });
          pb.addEventListener('click', () => mark(r.id, h, cell.pencil?.at === pid ? null : { at: pid }));
          pencil.append(pb);
        }
        if (cell.pencil) {
          const rub = el('button', { type: 'button', class: 'chip', 'data-mark': `${openCell}:clear`, text: 'clear' });
          rub.addEventListener('click', () => {
            // (book-look, item 2: the chip goes with the guess; the focus goes back to its cell.)
            focusNext = { to: 'key', key: `[data-cell="${CSS.escape(openCell ?? '')}"]` };
            mark(r.id, h, null);
          });
          pencil.append(rub);
        }
        detail.append(pencil);
        tbody.append(el('tr', { class: 'bgrid-detail-row' }, detail));
      }
    }
    table.append(tbody);
    wrap.append(table);
    // docs/64: the key cut to what matters (what they say, who saw them, where the two clash), and the
    // rest only when the grid shows it, as the CLI's `gridKey` does.
    const cells = g.rows.flatMap((x) => g.hours.map((h) => x.cells[h] as BoardCell));
    const key = el('p', { class: 'bgrid-key' });
    // (clarity-5b, item 7: never "Odessa" on a night with none. book-look, item 4: and never the scene's own
    // name either ("Petrosino’s✗ where they clash" read as a fact): a neutral sample, as the CLI's "X".)
    const lab = KEY_SAMPLE;
    key.append(el('span', { class: 'k is-says', text: lab }), ' they say so · ', el('span', { class: 'k is-seen', text: lab }), ' somebody saw them there · ', el('span', { class: 'k is-collision', text: `${lab}✗` }), ' where they clash');
    // (Round 6, U3: who "both" are, said: they, and somebody who saw them.)
    if (cells.some((x) => x.confirmed)) key.append(' · ', el('span', { class: 'k is-confirmed', text: `${lab}✓` }), ' they say so, and somebody saw them there');
    if (cells.some((x) => x.pencil)) key.append(' · ', el('span', { class: 'k is-pencil', text: `~${lab}` }), ' your own guess');
    key.append('. Tap a cell for what was said.');
    // (docs/66: at Hard-boiled, how a face's clash shows: the player's own mark, under "Your guess".)
    // (Round 7, U4: once a night, on the page of the first coat or hat, as the CLI says it.)
    if (faceMarkDue(c, run as BoardRun)) key.append(` ${FACE_MARK}`);
    wrap.append(key);
    // (Round 7, U2: the places only where a label isn't the place's own name, as the CLI says them.)
    const places = placesKey(c, run as BoardRun, g.codes, shownPlaces(g, false));
    // (Round 9, item 1: from Poached up the marked hours are the client's, never narrowed: "The marked hour
    // is when it happened." on HB 39's first look gave the hour away.)
    const marked = g.crimeHour !== null ? 'The marked hour is when it happened.' : g.givenBy ? `The marked ${g.window.length > 1 ? 'hours are the ones' : 'hour is the one'} ${g.givenBy} gave.` : g.window.length > 1 ? `It happened at ${g.window.join(' or ')}.` : '';
    wrap.append(el('p', { class: 'bgrid-key', text: `${marked} The last column: ${meansAsked(meansWords(g.meansLabel))}${places ? ` ${places}` : ''}`.trim() }));
    // (Round 9, item 2: why a "no", in the grid itself; the cell's title was hover-only, and "Broadnax: no"
    // from the first look read as a leak.)
    const why = meansReasons(g);
    if (why) wrap.append(el('p', { class: 'bgrid-key bgrid-why', text: why }));
    return wrap;
  }

  /** book-look, item 4: the grid key's neutral sample label (the CLI's key says "X"). */
  const KEY_SAMPLE = 'Place';

  /** docs/56: the grid's last column in words a player has, not the builders' "means". */
  function meansWords(label: string): string {
    return label.replace(/\bknew the way in\b/, 'knew how to get in');
  }

  /** docs/64: the column's head: "weapon?", a small case's "spare key?", "key?" (the key below asks it whole). */
  function meansHead(label: string): string {
    const what = /^could have got (?:the |a |an )?(.+)$/.exec(label)?.[1] ?? /\b(key|window|lock|door)\b/.exec(label)?.[1] ?? 'how';
    return `${what}?`;
  }

  /* ------------------------------------------------------------ title */

  /** A case number for a fresh night: any whole number names one. */
  const freshSeed = (): number => 1 + Math.floor(Math.random() * 9999);

  const KIND_WORDS: Record<CaseType, string> = { murder: 'A murder', 'lost-pet': 'A lost pet', 'lost-item': 'A lost thing' };

  /**
   * The title page: the name, the line under it, and one button that starts a night at the tier the
   * profile has earned (`tonightTier`). A night in progress puts "Back to the case" first. "Choose a
   * case" unfolds the picker; "How it plays" opens the rules in a drawer.
   */
  function titlePage(): HTMLElement {
    const sheet = el('div', { class: 'title-sheet' });
    const wrap = el('main', { class: 'title-page' });
    sheet.append(wrap);
    const profile = loadProfile(store);
    const tonight = tonightTier(profile);
    const prior = loadSaved(store);
    const inProgress = prior && !prior.filed ? prior : null;

    // (book-look, item 5: the setback crest over the name, in the frame's letters.)
    wrap.append(crest(), el('h1', { text: 'DASHIELL' }), el('p', { class: 'sub', text: 'A murder, an evening, and eight hours to write it down.' }));

    const startTonight = (): void => openCase(freshSeed(), tonight, undefined, storedName(), true, world, true);
    const actions = el('div', { class: 'title-actions' });
    const tonightNote = el('p', { class: 'action-note', text: `Tonight: ${tierName(tonight)}` });
    if (inProgress) {
      const back = el('button', { class: 'big-button', type: 'button', 'data-primary': 'true', text: 'Back to the case' });
      back.addEventListener('click', () => openCase(inProgress.seed, inProgress.tier, inProgress.type, inProgress.detective, true, inProgress.world));
      const fresh = el('button', { class: 'big-button big-button--second', type: 'button', text: 'Open a new case' });
      fresh.addEventListener('click', startTonight);
      actions.append(
        el('div', { class: 'action' }, back, el('p', { class: 'action-note', text: `Case ${inProgress.seed} · ${tierName(inProgress.tier)}` })),
        el('div', { class: 'action' }, fresh, tonightNote),
      );
    } else {
      const open = el('button', { class: 'big-button', type: 'button', 'data-primary': 'true', text: 'Open tonight’s case' });
      open.addEventListener('click', startTonight);
      actions.append(el('div', { class: 'action' }, open, tonightNote));
    }
    wrap.append(actions);

    const picker = pickerForm(profile, tonight);
    const choose = el('button', { class: 'quiet-button choose-toggle', type: 'button', 'aria-expanded': String(choosing), 'aria-controls': 'case-picker', text: 'Choose a case' });
    choose.addEventListener('click', () => {
      choosing = !choosing;
      choose.setAttribute('aria-expanded', String(choosing));
      picker.hidden = !choosing;
      if (choosing) picker.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    });
    picker.hidden = !choosing;
    wrap.append(choose, picker);

    const how = el('button', { class: 'link-button', type: 'button', 'aria-haspopup': 'dialog', text: 'How it plays' });
    const drawer = howDrawer();
    how.addEventListener('click', () => {
      if (typeof drawer.showModal === 'function') drawer.showModal();
      else drawer.setAttribute('open', '');
    });
    wrap.append(el('p', { class: 'new-line' }, 'New? The first night teaches you as you go. ', how), drawer);
    return sheet;
  }

  /** The picker, folded under "Choose a case": a row of tiers, a row of kinds, the number, the name. */
  function pickerForm(profile: Profile, tonight: TierIndex): HTMLFormElement {
    const form = el('form', { class: 'picker-form', id: 'case-picker', 'aria-label': 'Choose a case' });
    let tier: TierIndex = tonight;
    let kind: CaseType | '' = '';

    /** A row of small buttons that acts as one radio group: the arrows move along it, Tab leaves it. */
    function radioRow(label: string, items: { value: string; text: string; note?: string; locked?: boolean; star?: 'gold' | 'star' | null }[], current: string, pick: (v: string) => void): HTMLElement {
      const row = el('div', { class: 'pick-row', role: 'radiogroup', 'aria-label': label });
      for (const it of items) {
        const b = el('button', {
          class: `pick${it.locked ? ' pick--locked' : ''}`,
          type: 'button',
          role: 'radio',
          'aria-checked': String(it.value === current),
          'aria-disabled': it.locked ? 'true' : undefined,
          tabindex: it.value === current ? '0' : '-1',
          'data-value': it.value,
        });
        const name = el('span', { class: 'pick-name', text: it.text });
        // docs/67: the tier's best report: a gold star, a star, or nothing yet. The glyph is for the eye; the words for a screen reader.
        if (it.star) name.append(el('span', { class: `pick-star pick-star--${it.star}`, 'aria-hidden': 'true', text: ' ★' }), el('span', { class: 'sr-only', text: it.star === 'gold' ? ', gold star' : ', star' }));
        b.append(name);
        if (it.note) b.append(el('span', { class: 'pick-note', text: it.note }));
        b.addEventListener('click', () => {
          if (!it.locked) pick(it.value);
        });
        row.append(b);
      }
      row.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const open = items.filter((it) => !it.locked);
        const at = open.findIndex((it) => it.value === current);
        const next = open[(at + step + open.length) % open.length];
        if (next) {
          pick(next.value);
          form.querySelector<HTMLElement>(`[aria-label="${label}"] [data-value="${next.value}"]`)?.focus();
        }
      });
      return row;
    }

    const tierSlot = el('div', { class: 'pick-field' });
    const kindSlot = el('div', { class: 'pick-field' });
    const paint = (): void => {
      clear(tierSlot);
      clear(kindSlot);
      const tiers = ([0, 1, 2, 3, 4, 5] as TierIndex[]).map((t) =>
        tierOpen(profile, t) ? { value: String(t), text: tierName(t), star: bestAt(profile, t) } : { value: String(t), text: tierName(t), locked: true, note: `clear ${tierName((t - 1) as TierIndex)} to open` },
      );
      tierSlot.append(
        el('p', { class: 'pick-label', text: 'Tier' }),
        radioRow('Tier', tiers, String(tier), (v) => {
          tier = Number(v) as TierIndex;
          if (kind && !typesFor(tier).includes(kind)) kind = '';
          paint();
        }),
      );
      const kinds = [{ value: '', text: 'Any' }, ...typesFor(tier).map((x) => ({ value: x, text: KIND_WORDS[x] }))];
      kindSlot.append(
        el('p', { class: 'pick-label', text: 'Kind' }),
        radioRow('Kind', kinds, kind, (v) => {
          kind = v as CaseType | '';
          paint();
        }),
      );
    };
    paint();

    const seed = el('input', { id: 'pick-seed', type: 'number', inputmode: 'numeric', min: '1', step: '1', value: String(freshSeed()) });
    const name = el('input', { id: 'pick-name', type: 'text', value: storedName(), autocomplete: 'off', spellcheck: 'false' });
    form.append(
      tierSlot,
      kindSlot,
      el('div', { class: 'pick-field' }, el('label', { class: 'pick-label', for: 'pick-seed', text: 'Case number (any number; the same number gives the same night)' }), seed),
      el('div', { class: 'pick-field' }, el('label', { class: 'pick-label', for: 'pick-name', text: 'The detective' }), name),
      el('button', { class: 'big-button big-button--second', type: 'submit', text: 'Open this case' }),
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const who = name.value.trim() || 'Dashiell';
      try {
        store.setItem(NAME_KEY, who);
      } catch {
        /* forgets the name */
      }
      const n = Math.floor(Number(seed.value));
      openCase(Number.isFinite(n) && n >= 1 ? n : freshSeed(), tier, kind || undefined, who, true, world, true);
    });
    return form;
  }

  /** "How it plays": the rules, and the teach page's seven lines, in a drawer. Esc or Close shuts it. */
  function howDrawer(): HTMLDialogElement {
    const dialog = el('dialog', { class: 'drawer', 'aria-labelledby': 'how-title' });
    const close = el('button', { class: 'quiet-button drawer-close', type: 'button', text: 'Close' });
    close.addEventListener('click', () => (typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open')));
    // A click on the dimmed page around the drawer closes it too.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    // Close sits at the top, so the drawer opens with the focus on it and its first line in view.
    const body = el('div', { class: 'drawer-body' }, el('div', { class: 'drawer-head' }, el('h2', { id: 'how-title', text: 'How it plays' }), close));
    for (const l of BOARD_RULES) body.append(el('p', { text: l }));
    body.append(el('h3', { text: BOARD_TEACH_TITLE }));
    const list = el('ol', { class: 'teach-list' });
    for (const l of BOARD_TEACH_LINES) list.append(el('li', { text: l }));
    body.append(list);
    dialog.append(body);
    return dialog;
  }

  document.addEventListener('keydown', numberKey);

  // On the title page, Enter opens the case even when nothing has the focus (a click on the paper
  // drops it): the first button, "Open tonight's case" or "Back to the case".
  document.addEventListener('keydown', (e) => {
    if (screen.kind !== 'title' || e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
    const at = document.activeElement;
    if (at && at !== document.body && at !== document.documentElement && !at.classList.contains('title-sheet') && !at.classList.contains('title-page')) return;
    const first = root.querySelector<HTMLButtonElement>('[data-primary]');
    if (!first) return;
    e.preventDefault();
    first.click();
  });

  /* --------------------------------------------------------------- boot */

  // `?seed=4&t=2[&type=lost-pet][&world=neighbourhood]` opens that night. Anything else in the URL
  // (an old engine's `d=` or `engine=`, a type the tier doesn't build) is ignored.
  const p = params();
  const s = Number(p.get('seed'));
  const t = Number(p.get('t') ?? 0);
  if (dealable(s, t, undefined)) {
    const ty = p.get('type');
    openCase(s, t as TierIndex, ty !== null && dealable(s, t, ty) ? (ty as CaseType) : undefined, storedName(), true);
  } else {
    render();
  }
}
