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
import { boardChoices, pickerFor, type Picker } from '../game/board/choices.js';
import { newBoardRun, stepBoard } from '../game/board/engine.js';
import { boardGrid, cellText, type BoardCell, type BoardGrid } from '../game/board/grid.js';
import { knownPeople, knownPlaces, linesHeld } from '../game/board/knowledge.js';
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
import { BREAKS_LABEL, HUNCH, WHERE_BY_LABEL, boardFields, breakOptionsShown, curtainOfBoard, hoursThatMattered, reportFrom, scoreBoard, storyOfBoard, whereByOptions, type FieldKey, type LineOption, type Verdict } from '../game/board/report.js';
import { BOARD_RULES, BOARD_TEACH_TITLE, teachLines } from '../game/board/teach.js';
import { costLabel } from '../game/board/text.js';
import { continuityOf, dealtIds, fileToProfile, loadProfile, seenOf, teachOn, type KeyValueStore } from '../game/board/profile.js';
import { isWorld } from '../gen/board/world/index.js';
import { SITUATED } from '../game/board/plan/situated.js';
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
  /** The grid cell whose lines are open, as `person@hour`. */
  let openCell: string | null = null;
  const weather = createWeatherLayer({ enabled: loadWeatherOn(store) });
  let spread: HTMLElement | null = null;

  const params = (): URLSearchParams => new URLSearchParams(window.location.search);
  // docs/48: `?world=neighbourhood` casts the nights opened from here from the bible.
  const w0 = params().get('world');
  let world: string | undefined = isWorld(w0) ? w0 : undefined;
  // docs/51: `?situated=0` writes the pages from here on with the old decks only, for comparison.
  SITUATED.on = params().get('situated') !== '0';
  // docs/52 §3: `?plain=1` shows each page's plain page: every fact it says, and no voice.
  const PLAIN = params().get('plain') === '1';

  function writeUrl(): void {
    const w = saved && screen.kind !== 'title' ? saved.world : world;
    const q0 = saved && screen.kind !== 'title' ? `?seed=${saved.seed}&t=${saved.tier}${saved.type ? `&type=${saved.type}` : ''}${w ? `&world=${w}` : ''}` : w ? `?world=${w}` : '';
    const q1 = SITUATED.on ? q0 : `${q0 ? `${q0}&` : '?'}situated=0`;
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
    justSpent = r.page.cost;
    document.body.classList.remove('notebook-open');
    render();
    root.querySelector('.page--prose')?.scrollTo?.({ top: 0 });
  }

  function file(report: BoardReport): void {
    if (!d || !run || !saved) return;
    run = { ...run, reportOpen: true, filed: report };
    saved = { ...saved, filed: report };
    writeSaved(store, saved);
    const verdict = scoreBoard(d, run, report);
    const outcome = fileToProfile(store, { tier: run.tier, points: verdict.points, asked: verdict.asked, actionsUsed: verdict.actionsUsed, par: verdict.par, ...(d.kase.world ? { cast: castOf(d.kase) } : {}), dealt: dealtIds(run.spent) });
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
      weather.show(null);
      root.append(titlePage());
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
      for (const line of teachLines(d?.kase.world)) teach.append(el('p', { class: 'teach-line', text: line }));
      const go = el('button', { class: 'plain-button teach-go', type: 'button', text: 'Up the stairs to the office' });
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
    const notches = el('div', { class: 'notches', role: 'img', 'aria-label': `${used} of ${budget} calls spent`, 'data-spent': String(used) });
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
        node.append(withNames(b.text));
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
    const role = p.role === 'client' ? `My client: ${p.description}.` : p.role === 'victim' ? `${p.description[0]?.toUpperCase()}${p.description.slice(1)}. The dead ${p.female ? 'woman' : 'man'}.` : `${p.description[0]?.toUpperCase()}${p.description.slice(1)}.`;
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
      'aria-label': [ch.label, ch.lead && ch.why ? `worth taking now: ${ch.why}` : '', ch.done ? 'already done' : '', ch.command.startsWith('picker') ? 'free to look' : costLabel(ch), ch.note ?? ''].filter(Boolean).join(', '),
    });
    if (ch.lead) b.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
    const label = el('span', { class: 'label', text: ch.label });
    if (ch.done) label.append(el('span', { class: 'check', 'aria-hidden': 'true', text: ' ✓' }));
    b.append(label);
    if (ch.note) b.append(el('span', { class: 'aside', text: ch.note }));
    if (ch.lead && ch.why) b.append(el('span', { class: 'aside why', text: ch.why }));
    b.append(el('span', { class: 'mins', text: ch.command.startsWith('picker') ? (pickerOpen ? 'close' : 'free to look') : ch.done ? 'free' : costLabel(ch) }));
    b.addEventListener('click', onClick);
    return b;
  }

  function choicesPanel(): HTMLElement {
    const groups = boardChoices(d as BoardDeal, run as BoardRun);
    const panel = el('nav', { class: 'choices choices--board', 'aria-label': 'What next' });
    const asks = groups.filter((g) => g.kind === 'ask');
    if (asks.length > 0) {
      const section = el('section', { class: 'choice-group choice-group--people' });
      section.append(el('h3', { class: 'choice-heading', text: 'Talk to' }));
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
          'aria-label': [nameOf((d as BoardDeal).kase, id), star?.why ? `worth taking now: ${star.why}` : '', on ? 'topics open' : `${g.choices.length} topics`, 'free'].filter(Boolean).join(', '),
        });
        if (star) b.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
        b.append(el('span', { class: 'label', text: nameOf((d as BoardDeal).kase, id) }));
        if (star?.why) b.append(el('span', { class: 'aside why', text: star.why }));
        b.append(el('span', { class: 'mins', text: on ? 'close' : `${g.choices.length} ${g.choices.length === 1 ? 'topic' : 'topics'}` }));
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
      section.append(list);
      panel.append(section);
    }
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
    const box = el('div', { class: 'confront-picker board-picker', role: 'group', 'aria-label': `Put it to ${nameOf(c, pk.person)}` });
    // docs/47 A6: the person's own pronouns, never "their" for one woman; costs in calls.
    const female = personOf(c, pk.person)?.female === true;
    const him = female ? 'her' : 'him';
    const his = female ? 'her' : 'his';
    box.append(el('p', { class: 'note', text: `${pk.help} Looking is free; reading one to ${him} costs a call. If it breaks nothing, the call is gone all the same, and the page says why.` }));
    if (pk.ready.length > 0) {
      const sec = el('section', { class: 'picker-sec' });
      sec.append(el('h4', { class: 'picker-head', text: `${his[0]?.toUpperCase()}${his.slice(1)} line, and the line that breaks it` }));
      for (const r of pk.ready) {
        const b = el('button', { class: 'choice choice--fact', type: 'button', 'data-command': r.command, text: r.label });
        b.append(el('span', { class: 'mins', text: '1 call' }));
        b.addEventListener('click', () => command(r.command));
        sec.append(b);
      }
      box.append(sec);
      return box;
    }
    const claim = pickerClaim === null ? null : pk.claims.find((x) => x.hour === pickerClaim);
    if (!claim) {
      const sec = el('section', { class: 'picker-sec' });
      sec.append(el('h4', { class: 'picker-head', text: `Which of ${nameOf(c, pk.person)}’s claims?` }));
      for (const x of pk.claims) {
        const b = el('button', { class: 'choice choice--fact', type: 'button', 'data-claim': String(x.hour) });
        b.append(el('span', { class: 'label', text: `${nameOf(c, pk.person)} says ${x.label}` }), el('span', { class: 'mins', text: 'free' }));
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
    sec.append(el('h4', { class: 'picker-head', text: `Against “${claim.label}”, read ${him}:` }));
    for (const l of claim.lines) {
      const b = el('button', { class: 'choice choice--fact', type: 'button', 'data-command': l.command });
      b.append(el('span', { class: 'label', text: l.label }), el('span', { class: 'fact-src', text: l.source }), el('span', { class: 'mins', text: '1 call' }));
      b.addEventListener('click', () => command(l.command));
      sec.append(b);
    }
    const back = el('button', { class: 'choice choice--more', type: 'button', text: 'Back to the claims' });
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
      el('h2', { text: 'The report' }),
      el('p', { class: 'note', text: r.used >= budgetCalls(d as BoardDeal) ? 'The calls are spent. Whatever is on the page is what gets filed; leave a line blank and it goes in as I don’t know.' : 'Filing is final. Leave a line blank and it goes in as I don’t know.' }),
    );
    const dd = d as BoardDeal;
    const selects = new Map<FieldKey, HTMLSelectElement>();
    const lines = new Map<FieldKey, () => string | null>();
    // docs/46 §3: the hours that mattered, as the notebook has them.
    const hs = hoursThatMattered(dd).map((h) => hourWord(h));
    const hours = hs.length > 1 ? `${hs.slice(0, -1).join(', ')} or ${hs[hs.length - 1]}` : (hs[0] ?? '');
    /** A line question: the lines it offers as a list to pick one from, and a hunch. */
    const lineField = (key: 'breaks' | 'whereBy', label: string, options: () => LineOption[], note: () => string, group: () => string = () => '') => {
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
          if (key === 'breaks' && touching > 0 && i === 0) list.append(el('p', { class: 'line-group', text: group() }));
          if (key === 'breaks' && touching > 0 && i === touching && i < opts.length) list.append(el('p', { class: 'line-group', text: 'Other lines I hold:' }));
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
    for (const f of boardFields(dd)) {
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
          () => (who() ? `The lines I hold that name ${nameOf(dd.kase, who() as string)} or fall at ${hours}.` : `Name them first. Until then, the lines I hold at ${hours}.`),
          () => (who() ? `Lines that touch ${nameOf(dd.kase, who() as string)}’s own story at ${hours}:` : ''),
        );
        s.addEventListener('change', refill);
      }
      if (f.key === 'where') lineField('whereBy', WHERE_BY_LABEL, () => whereByOptions(dd, r), () => 'The remarks and finds I hold, and anything put to them.');
    }
    form.append(el('div', { class: 'after' }, el('button', { class: 'open-case', type: 'submit', text: 'File it' })));
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
    page.append(el('header', { class: 'runhead' }, el('span', { text: 'Notebook' }), el('span', { text: `case ${c.seed} · ${tierName(c.tier)} · the small board` })));
    const body = el('div', { class: 'body', tabindex: '-1' });
    body.append(el('h2', { text: 'Where they were' }), gridNode(boardGrid(c, run as BoardRun)));
    const r = run as BoardRun;
    // Where it stands, plainly.
    if (r.log.length > 1) {
      body.append(el('h2', { text: 'Where it stands' }));
      const ul = el('ul', { class: 'nb-stands' });
      for (const cl of recapClauses(d as BoardDeal, r)) ul.append(el('li', { text: cl.text }));
      body.append(ul);
    }
    // Everything held, by whose word.
    const lines = linesHeld(c, r).filter((l) => l.kind !== 'given');
    if (lines.length > 0) {
      body.append(el('h2', { text: 'What I have' }));
      const bySource = new Map<string, string[]>();
      for (const l of lines) {
        const src = l.q.startsWith('list:') ? `${nameOf(c, l.q.slice(5))}’s list` : l.q.startsWith('account:') ? `${nameOf(c, l.q.slice(8))}’s evening` : l.q.startsWith('search:') ? 'Searched' : 'Put to them';
        bySource.set(src, [...(bySource.get(src) ?? []), l.text]);
      }
      for (const [src, ls] of bySource) {
        const entry = el('div', { class: 'nb-entry' });
        entry.append(el('div', { class: 'who', text: src }));
        const ul = el('ul');
        for (const t of ls) ul.append(el('li', { text: t }));
        entry.append(ul);
        body.append(entry);
      }
    }
    body.append(el('h2', { text: 'The office' }));
    const office = el('ul', { class: 'nb-stands' });
    for (const t of c.givens.text) office.append(el('li', { text: t }));
    body.append(office);
    body.append(el('h2', { text: 'People and places' }));
    const people = el('ul', { class: 'nb-stands' });
    for (const id of knownPeople(c, r)) {
      const p = personOf(c, id);
      if (!p || p.role === 'victim') continue;
      people.append(el('li', { text: `${p.name}: ${p.role === 'client' ? 'my client, ' : ''}${p.description}.` }));
    }
    for (const [id, why] of knownPlaces(c, r)) people.append(el('li', { text: `${placeName(c, id)} — ${why}.` }));
    body.append(people);
    if (!r.reportOpen) {
      const f = el('button', { class: 'plain-button', type: 'button', text: 'File the report' });
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
    head.append(el('th', { scope: 'col', class: 'bgrid-means', title: g.meansLabel, text: 'means' }));
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
        if (cell.lines.length === 0) detail.append(el('p', { class: 'note', text: 'Nothing held about this hour yet.' }));
        for (const l of cell.lines) detail.append(el('p', { class: `bgrid-line${cell.collision ? ' collides' : ''}`, text: l }));
        const pencil = el('div', { class: 'bgrid-pencil', role: 'group', 'aria-label': 'Pencil' });
        pencil.append(el('span', { class: 'bgrid-pencil-label', text: 'Pencil:' }));
        for (const [pid] of knownPlaces(c, run as BoardRun)) {
          const pb = el('button', { type: 'button', class: `chip${cell.pencil?.at === pid ? ' on' : ''}`, text: g.codes[pid] ?? placeName(c, pid) });
          pb.addEventListener('click', () => mark(r.id, h, cell.pencil?.at === pid ? null : { at: pid }));
          pencil.append(pb);
        }
        if (cell.pencil) {
          const rub = el('button', { type: 'button', class: 'chip', text: 'rub out' });
          rub.addEventListener('click', () => mark(r.id, h, null));
          pencil.append(rub);
        }
        detail.append(pencil);
        tbody.append(el('tr', { class: 'bgrid-detail-row' }, detail));
      }
    }
    table.append(tbody);
    wrap.append(table);
    const key = el('p', { class: 'bgrid-key' });
    key.append(
      el('span', { class: 'k is-says', text: 'Odessa' }), ' says so · ',
      el('span', { class: 'k is-seen', text: 'Odessa' }), ' somebody else says so · ',
      el('span', { class: 'k is-confirmed', text: 'Odessa✓' }), ' both · ',
      el('span', { class: 'k is-collision', text: 'Odessa✗' }), ' they collide · ',
      el('span', { class: 'k is-pencil', text: '~Odessa' }), ' your pencil. Tap a cell for the lines behind it.',
    );
    wrap.append(key);
    wrap.append(el('p', { class: 'bgrid-key', text: `${g.crimeHour !== null ? `The marked hour is when it happened.` : g.window.length > 1 ? `It happened at ${g.window.join(' or ')}.` : ''} Means: ${g.meansLabel}. ${Object.entries(g.codes).filter(([id]) => knownPlaces(c, run as BoardRun).has(id) || id === c.crime.scene).map(([id, code]) => `${code}: ${placeName(c, id)}`).join('; ')}.` }));
    return wrap;
  }

  function cellWords(cell: BoardCell): string {
    const c = (d as BoardDeal).kase;
    const bits: string[] = [];
    if (cell.says) bits.push(`says ${placeName(c, cell.says)}`);
    if (cell.seen) bits.push(`${cell.seen.by} puts them at ${placeName(c, cell.seen.place)}`);
    if (cell.collision) bits.push('they collide');
    if (cell.pencil?.at) bits.push(`pencilled at ${placeName(c, cell.pencil.at)}`);
    return bits.join('; ') || 'nothing yet';
  }

  /* ------------------------------------------------------------ title */

  function titlePage(): HTMLElement {
    const wrap = el('div', { class: 'title-page' });
    const form = el('form');
    const name = el('input', { type: 'text', value: storedName(), 'aria-label': 'The detective’s name', autocomplete: 'off' });
    const seed = el('input', { type: 'number', value: String(1 + Math.floor(Math.random() * 9999)), min: '1', 'aria-label': 'Seed' });
    const tier = el('select', { 'aria-label': 'Tier', name: 'tier' });
    for (let t = 0; t <= 5; t++) tier.append(el('option', { value: String(t) }, tierName(t as TierIndex)));
    const type = el('select', { 'aria-label': 'Case', name: 'type' });
    const paintTypes = (): void => {
      const was = type.value;
      clear(type);
      type.append(el('option', { value: '' }, 'Any'));
      for (const x of typesFor(Number(tier.value) as TierIndex)) type.append(el('option', { value: x }, x === 'murder' ? 'A murder' : x === 'lost-pet' ? 'A lost pet' : 'A lost thing'));
      type.value = [...type.options].some((o) => o.value === was) ? was : '';
    };
    tier.addEventListener('change', paintTypes);
    paintTypes();
    form.append(
      el('h1', { text: 'DASHIELL' }),
      el('p', { class: 'sub', text: 'A murder, an evening, and eight hours to write it down.' }),
      el('p', { class: 'tier-rule', text: 'One question gets a whole evening or a whole list, and every lie runs into something true. Murders, lost pets and lost things.' }),
      el('div', { class: 'name-line' }, el('label', { text: 'The detective' }), name),
    );
    const prior = loadSaved(store);
    if (prior && !prior.filed) {
      const back = el('button', { class: 'plain-button', type: 'button', text: 'Go back to it' });
      back.addEventListener('click', () => openCase(prior.seed, prior.tier, prior.type, prior.detective, true, prior.world));
      form.append(el('div', { class: 'resume' }, el('p', { text: `Case ${prior.seed} is still open on the desk: ${tierName(prior.tier)}, the small board.` }), back));
    }
    form.append(
      el('div', { class: 'controls' }, el('div', { class: 'field' }, el('label', { text: 'Tier' }), tier), el('div', { class: 'field' }, el('label', { text: 'Case' }), type), el('div', { class: 'field' }, el('label', { text: 'Seed' }), seed)),
      el('button', { class: 'open-case', type: 'submit', text: 'Open the case' }),
    );
    for (const l of BOARD_RULES) form.append(el('p', { class: 'footnote', text: l }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        store.setItem(NAME_KEY, name.value.trim() || 'Dashiell');
      } catch {
        /* forgets the name */
      }
      openCase(Number(seed.value) || 1, Number(tier.value) as TierIndex, (type.value || undefined) as CaseType | undefined, name.value.trim() || 'Dashiell', true, world, true);
    });
    wrap.append(form);
    return wrap;
  }

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
