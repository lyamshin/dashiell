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
import { FACE_MARK, boardGrid, cellText, faceMarkDue, meansAsked, placesKey, shownPlaces, type BoardCell, type BoardGrid } from '../game/board/grid.js';
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
import { peopleLine } from '../game/board/gloss.js';
import { BREAKS_LABEL, CLEARED_LABEL, HUNCH, NOBODY, whereByLabel, blankRule, boardFields, breakOptionsShown, clearOptions, curtainOfBoard, hoursThatMattered, lineGroupHeads, reportFrom, scoreBoard, storyOfBoard, whereByOptions, type FieldKey, type LineOption, type Verdict } from '../game/board/report.js';
import { BOARD_RULES, BOARD_TEACH_LINES, BOARD_TEACH_TITLE, teachLines } from '../game/board/teach.js';
import { ACTION_KEY, TALK_HEADING, chapterShown, costText, officeLines, questionsText } from '../game/board/text.js';
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
    document.body.classList.remove('notebook-open');
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
    const b = el('button', { class: 'choice choice--hint hint-button', type: 'button', 'aria-describedby': 'hint-note' });
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
    render();
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

  function render(): void {
    hideCard();
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
    weather.show(run.weather);
    weather.attach(spread);
  }

  function leftPage(): HTMLElement {
    const page = el('section', { class: 'page page--prose' });
    const r = run as BoardRun;
    const shown = Math.min(turned, r.log.length - 1);
    page.append(runningHead(shown));
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
        render();
      });
      teach.append(el('div', { class: 'teach-buttons' }, go));
      leaf.append(teach);
      page.append(leaf);
      return page;
    }
    if (screen.kind === 'verdict') {
      leaf.append(
        renderVerdict(screen.verdict, () => toTitle(), { story: storyOfBoard(d as BoardDeal), truthSheet: () => curtainOfBoard(d as BoardDeal, r, r.filed) }, screen.news),
      );
      page.append(leaf);
      return page;
    }
    const newest = shown === r.log.length - 1;
    if (r.reportOpen && !r.filed && newest) {
      const p = r.log[shown];
      if (p) for (const n of pageNodes(p)) leaf.append(n);
      leaf.append(reportForm());
      page.append(leaf, pager());
      return page;
    }
    const p = r.log[shown];
    if (p) for (const n of pageNodes(p)) leaf.append(n);
    page.append(leaf);
    if (newest) page.append(choicesPanel());
    else page.append(el('p', { class: 'note turned-note', text: 'A page turned back to.' }));
    page.append(pager());
    return page;
  }

  function runningHead(i: number): HTMLElement {
    const r = run as BoardRun;
    const budget = budgetCalls(d as BoardDeal);
    const used = usedByPage(r.log, i);
    const strip = clockStrip(used, budget, deadlineWords((d as BoardDeal).kase));
    const head = el('header', { class: 'runhead runhead--clock' });
    const nbLink = el('button', { class: 'nb-link', type: 'button', text: 'Notebook' });
    nbLink.addEventListener('click', () => document.body.classList.add('notebook-open'));
    head.append(el('div', { class: 'runhead-line' }, el('span', { class: 'place', text: r.log[i]?.head ?? '' }), nbLink, el('span', { class: 'time', text: strip.time })));
    const notches = el('div', { class: 'notches', role: 'img', 'aria-label': `${used} of ${budget} actions used`, 'data-spent': String(used) });
    strip.notches.forEach((kind, j) => {
      const fresh = i === r.log.length - 1 && justSpent > 0 && kind === 'spent' && j >= used - justSpent;
      notches.append(el('span', { class: `notch notch--${kind}${fresh ? ' notch--fresh' : ''}` }));
    });
    head.append(notches, el('div', { class: 'calls-left', text: strip.left }));
    return head;
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
        const span = el('span', { class: `noun noun--${n.kind}`, tabindex: '0', text: m[0] });
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
    return { title: p.name, lines };
  }

  /* ----------------------------------------------------------- choices */

  function button(ch: OfferedChoice, onClick: () => void, extra = ''): HTMLButtonElement {
    const b = el('button', {
      class: `choice${ch.lead ? ' choice--lead' : ''}${ch.done ? ' choice--done' : ''}${extra}`,
      type: 'button',
      'data-command': ch.command,
      'aria-label': [ch.label, ch.lead && ch.why ? `starred: ${ch.why}` : '', ch.done ? 'already done' : '', costText(ch), ch.note ?? ''].filter(Boolean).join(', '),
    });
    if (ch.lead) b.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
    const label = el('span', { class: 'label', text: ch.label });
    if (ch.done) label.append(el('span', { class: 'check', 'aria-hidden': 'true', text: ' ✓' }));
    b.append(label);
    if (ch.note) b.append(el('span', { class: 'aside', text: ch.note }));
    if (ch.lead && ch.why) b.append(el('span', { class: 'aside why', text: ch.why }));
    b.append(el('span', { class: 'mins', text: ch.command.startsWith('picker') && pickerOpen ? 'close' : costText(ch) }));
    b.addEventListener('click', onClick);
    return b;
  }

  function choicesPanel(): HTMLElement {
    const groups = boardChoices(d as BoardDeal, run as BoardRun);
    const panel = el('nav', { class: 'choices choices--board', 'aria-label': 'What next' });
    const asks = groups.filter((g) => g.kind === 'ask');
    if (asks.length > 0) {
      const section = el('section', { class: 'choice-group choice-group--people' });
      // Round 5, U1, in docs/64's words: "Talk to", the CLI's heading; the key says what's free.
      section.append(el('h3', { class: 'choice-heading', text: TALK_HEADING }));
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
          'aria-label': [nameOf((d as BoardDeal).kase, id), star?.why ? `starred: ${star.why}` : '', on ? 'questions open' : questionsText(g, (d as BoardDeal).kase), 'free to pick'].filter(Boolean).join(', '),
        });
        if (star) b.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
        b.append(el('span', { class: 'label', text: nameOf((d as BoardDeal).kase, id) }));
        if (star?.why) b.append(el('span', { class: 'aside why', text: star.why }));
        b.append(el('span', { class: 'mins', text: on ? 'close' : questionsText(g, (d as BoardDeal).kase) }));
        b.addEventListener('click', () => {
          selected = on ? null : id;
          pickerOpen = false;
          pickerClaim = null;
          justSpent = 0;
          renderInPlace();
        });
        row.append(b);
      }
      section.append(row);
      panel.append(section);
      const g = asks.find((x) => x.personId === selected);
      if (g) panel.append(topicsSection(g));
    }
    for (const g of groups) {
      if (g.kind === 'ask') continue;
      const section = el('section', { class: `choice-group choice-group--${g.kind}` });
      if (g.heading) section.append(el('h3', { class: 'choice-heading', text: g.heading }));
      const list = el('div', { class: 'choice-list' });
      for (const ch of g.choices) list.append(button(ch, () => (ch.command === 'file' ? command('file') : command(ch.command))));
      if ((g.more ?? []).length > 0) {
        const t = el('button', { class: 'choice choice--more', type: 'button', 'aria-expanded': moreGo ? 'true' : 'false' });
        t.append(el('span', { class: 'label', text: moreGo ? 'Fewer places' : `Other places (${(g.more ?? []).length})` }), el('span', { class: 'mins', text: 'free' }));
        t.addEventListener('click', () => {
          moreGo = !moreGo;
          justSpent = 0;
          renderInPlace();
        });
        list.append(t);
        if (moreGo) for (const ch of g.more ?? []) list.append(button(ch, () => command(ch.command)));
      }
      // docs/67: the Hint button sits with the free choices, and what it said under them.
      const [hb, hnote] = g.kind === 'free' ? hintNodes() : [];
      if (hb) list.append(hb);
      section.append(list);
      if (hnote) section.append(hnote);
      panel.append(section);
    }
    // docs/64: the key, on the first page, as the CLI says it; docs/67: and tonight's hints (Hard-boiled: its mark line).
    if ((run as BoardRun).log.length === 1) panel.append(el('p', { class: 'note action-key', text: ACTION_KEY }));
    const hints = hintsNote(d as BoardDeal, run as BoardRun);
    if (hints) panel.append(el('p', { class: 'note hints-note', text: hints }));
    return panel;
  }

  function topicsSection(g: OfferedGroup): HTMLElement {
    const id = g.personId as string;
    const section = el('section', { class: 'choice-group choice-group--ask' });
    section.append(el('h3', { class: 'choice-heading', text: `Ask ${nameOf((d as BoardDeal).kase, id)} about` }));
    const list = el('div', { class: 'choice-list' });
    for (const ch of g.choices) {
      if (ch.command.startsWith('picker ')) {
        list.append(
          button(ch, () => {
            pickerOpen = !pickerOpen;
            pickerClaim = null;
            justSpent = 0;
            renderInPlace();
          }, ' choice--confront'),
        );
        continue;
      }
      list.append(button(ch, () => command(ch.command)));
    }
    section.append(list);
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
    const back = el('button', { type: 'button', text: '‹ back' });
    back.disabled = turned <= 0;
    back.addEventListener('click', () => {
      turned = Math.max(0, turned - 1);
      justSpent = 0;
      render();
    });
    const forward = el('button', { type: 'button', text: 'forward ›' });
    forward.disabled = turned >= r.log.length - 1;
    forward.addEventListener('click', () => {
      turned = Math.min(r.log.length - 1, turned + 1);
      justSpent = 0;
      render();
    });
    const wx = el('button', { class: 'wx-toggle', type: 'button', 'aria-pressed': String(weather.enabled), text: weather.enabled ? 'weather on' : 'weather off' });
    wx.addEventListener('click', () => {
      const on = !weather.enabled;
      saveWeatherOn(store, on);
      weather.setEnabled(on);
      wx.textContent = on ? 'weather on' : 'weather off';
    });
    hint.append(back, el('span', { text: `page ${turned + 1} of ${r.log.length}` }), forward, wx);
    return hint;
  }

  /* ------------------------------------------------------------ the form */

  function reportForm(): HTMLElement {
    const r = run as BoardRun;
    const form = el('form', { class: 'report' });
    form.append(
      el('h2', { text: 'Close the case' }),
      // Round 5, U6: what a blank goes in as, once, the CLI's words.
      el('p', { class: 'note', text: blankRule(d as BoardDeal, r.used >= budgetCalls(d as BoardDeal)) }),
    );
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
        clear(list);
        const opts: LineOption[] = options();
        // docs/47 A4: the lines that touch the named person's own story come first, under a heading.
        const touching = opts.filter((o) => o.touches).length;
        [...opts, { value: '', label: HUNCH }].forEach((o, i) => {
          const heads = group();
          if (heads && touching > 0 && i === 0) list.append(el('p', { class: 'line-group', text: heads.touching }));
          if (heads && touching > 0 && i === touching && i < opts.length) list.append(el('p', { class: 'line-group', text: heads.rest }));
          const id = `rf-${key}-${i}`;
          const input = el('input', { type: 'radio', name: key, value: o.value, id });
          if (o.value === '') input.checked = true;
          list.append(el('label', { class: `line-option${o.value === '' ? ' line-option--hunch' : ''}${(o as LineOption).touches ? ' line-option--touches' : ''}`, for: id }, input, el('span', { text: o.label })));
        });
      };
      fill();
      lines.set(key, () => (list.querySelector('input:checked') as HTMLInputElement | null)?.value || null);
      form.append(box);
      return fill;
    };
    for (const f of boardFields(dd, r)) {
      const s = el('select', { name: f.key });
      s.append(el('option', { value: '' }, 'I don’t know'));
      for (const o of f.options) s.append(el('option', { value: o.value }, o.label));
      selects.set(f.key, s);
      form.append(el('div', { class: 'field' }, el('label', { text: f.label }), s));
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
          () => (other() === NOBODY ? 'Nobody else, so there’s nothing to clear.' : named() ? 'Pick what clears them, or “A hunch”.' : `Pick who first. Until then, this is what you were told about ${hours} o’clock.`),
          () => (other() && other() !== NOBODY ? lineGroupHeads(dd, r, other() as string) : null),
        );
        s.addEventListener('change', refill);
      }
      if (f.key === 'where') lineField('whereBy', whereByLabel(dd), () => whereByOptions(dd, r), () => 'What people let slip, what you found, and what they said when you confronted them.');
    }
    form.append(el('div', { class: 'after' }, el('button', { class: 'open-case', type: 'submit', text: 'Close the case' })));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const answers: Partial<Record<FieldKey, string | null>> = {};
      for (const [k, s] of selects) answers[k] = s.value || null;
      for (const [k, v] of lines) answers[k] = v();
      file(reportFrom(dd, answers));
    });
    return form;
  }

  /* ------------------------------------------------------- the notebook */

  function rightPage(): HTMLElement {
    const page = el('aside', { class: 'page page--notebook', 'aria-label': 'Notebook' });
    const c = (d as BoardDeal).kase;
    page.append(el('header', { class: 'runhead' }, el('span', { text: 'Notebook' }), el('span', { text: `case ${c.seed} · ${tierName(c.tier)}` })));
    const body = el('div', { class: 'body', tabindex: '-1' });
    body.append(el('h2', { text: 'Where they were' }), gridNode(boardGrid(c, run as BoardRun)));
    const r = run as BoardRun;
    // Where it stands, plainly.
    if (r.log.length > 1) {
      body.append(el('h2', { text: 'How it adds up' }));
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
      people.append(el('li', { text: `${p.name}: ${peopleLine(c, id)}.` }));
    }
    for (const [id, why] of knownPlaces(c, r)) people.append(el('li', { text: `${placeName(c, id)} — ${why}.` }));
    body.append(people);
    if (!r.reportOpen) {
      const f = el('button', { class: 'plain-button', type: 'button', text: 'Close the case' });
      f.addEventListener('click', () => command('file'));
      body.append(f);
    }
    page.append(body);
    const back = el('button', { class: 'plain-button nb-back', type: 'button', text: 'Back to the page' });
    back.addEventListener('click', () => document.body.classList.remove('notebook-open'));
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
      head.append(el('th', { scope: 'col', class: `bgrid-hour${crime ? ' bgrid-hour--crime' : ''}${maybe ? ' bgrid-hour--maybe' : ''}`, title: crime ? 'when it happened' : maybe ? 'it may have happened then' : '', text: `${h}` }));
    }
    head.append(el('th', { scope: 'col', class: 'bgrid-means', title: meansAsked(meansWords(g.meansLabel)), text: meansHead(g.meansLabel) }));
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
        const b = el('button', { type: 'button', class: 'bgrid-btn', 'aria-expanded': openCell === k ? 'true' : 'false', 'aria-label': `${r.name} at ${h}: ${cellWords(cell)}`, text: cellText(g, cell).replace(/["[\]]/g, '').replace(/→.*$/, '') });
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
          const pb = el('button', { type: 'button', class: `chip${cell.pencil?.at === pid ? ' on' : ''}`, text: g.codes[pid] ?? placeName(c, pid) });
          pb.addEventListener('click', () => mark(r.id, h, cell.pencil?.at === pid ? null : { at: pid }));
          pencil.append(pb);
        }
        if (cell.pencil) {
          const rub = el('button', { type: 'button', class: 'chip', text: 'clear' });
          rub.addEventListener('click', () => mark(r.id, h, null));
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
    // (clarity-5b, item 7: the sample is a label from tonight's grid, the scene's, never "Odessa" on a night with none.)
    const lab = g.codes[c.crime.scene] ?? 'X';
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
    wrap.append(el('p', { class: 'bgrid-key', text: `${g.crimeHour !== null ? `The marked hour is when it happened.` : g.window.length > 1 ? `It happened at ${g.window.join(' or ')}.` : ''} The last column: ${meansAsked(meansWords(g.meansLabel))}${places ? ` ${places}` : ''}` }));
    return wrap;
  }

  /** docs/56: the grid's last column in words a player has, not the builders' "means". */
  function meansWords(label: string): string {
    return label.replace(/\bknew the way in\b/, 'knew how to get in');
  }

  /** docs/64: the column's head, the night's means: "laudanum?", "spare key?", "key?" (the key below asks it whole). */
  function meansHead(label: string): string {
    const what = /^could have got (?:the |a |an )?(.+)$/.exec(label)?.[1] ?? /\b(key|window|lock|door)\b/.exec(label)?.[1] ?? 'how';
    return `${what}?`;
  }

  /** "Corrigan’s list" (the grid's source name) said as what happened: "Corrigan saw them at the Velvet Room". */
  function seenWords(by: string, place: string): string {
    const list = /^(.+)’s list$/.exec(by);
    if (list) return `${list[1]} saw them at ${place}`;
    const said = /^(.+)’s (?:story|word)$/.exec(by);
    if (said) return `${said[1]} says they were at ${place}`;
    return `${by} says they were at ${place}`;
  }

  function cellWords(cell: BoardCell): string {
    const c = (d as BoardDeal).kase;
    const bits: string[] = [];
    if (cell.says) bits.push(`says ${placeName(c, cell.says)}`);
    if (cell.seen) bits.push(seenWords(cell.seen.by, placeName(c, cell.seen.place)));
    if (cell.collision) bits.push('the two don’t agree');
    if (cell.pencil?.at) bits.push(`your guess: ${placeName(c, cell.pencil.at)}`);
    return bits.join('; ') || 'nothing yet';
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

    wrap.append(el('h1', { text: 'DASHIELL' }), el('p', { class: 'sub', text: 'A murder, an evening, and eight hours to write it down.' }));

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
