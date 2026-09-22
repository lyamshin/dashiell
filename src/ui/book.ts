/**
 * The book itself: the only file that owns the document.
 *
 * Everything it renders comes out of `src/game/`. It holds a little state of
 * its own — which screen is showing, which page of the log is turned to,
 * whose topics are showing when a room holds more than one person, and
 * whether the notebook tab is open on a narrow screen — and nothing else.
 *
 * M6: there is no text box. Every page ends in choices, and every choice is a
 * typed command handed to `stepInput`, exactly as the prompt used to hand it.
 */

import { generateCase, type Case, type Difficulty } from '../gen/index.js';
import { CROSS_RUN_TOTAL, crossRunOnly } from '../game/voice/index.js';
import { choicesFor, defaultAskPerson } from '../game/choices.js';
import { clockStrip, usedByPage } from '../game/clock.js';
import { buildView, gameBudget, peopleHereNow, type CaseView, type Noun } from '../game/derive.js';
import { buildNotebook, personCard, placeHoverCard } from '../game/notebook.js';
import { matchPlaces } from '../game/parser.js';
import { fileReport, newRun, stepInput } from '../game/reducer.js';
import { scoreReport, type Verdict } from '../game/scoring.js';
import {
  addBurned,
  clearRun,
  loadBurned,
  loadRun,
  saveRun,
  type KeyValueStore,
} from '../game/storage.js';
import type { Id, OfferedChoice, OfferedGroup, Report, RunState, Thread } from '../game/types.js';
import { renderChoices } from './choices-view.js';
import { clear, el } from './dom.js';
import { hideCard, type CardSource } from './hover.js';
import { renderNotebook } from './notebook-view.js';
import { renderPage } from './prose.js';
import { renderReportForm, renderVerdict } from './report.js';
import { renderTruth } from './truth.js';

type Screen =
  | { kind: 'title' }
  | { kind: 'book' }
  | { kind: 'verdict'; verdict: Verdict }
  | { kind: 'truth' };

const DEFAULT_NAME = 'Dashiell';
const NAME_KEY = 'dashiell:detective';

function safeStore(): KeyValueStore {
  try {
    const probe = window.localStorage;
    probe.getItem(NAME_KEY);
    return probe;
  } catch {
    const data = new Map<string, string>();
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  }
}

function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 999_999);
}

/** A page's choices as the book keeps them: plain data, saved with the page. */
function offeredOf(groups: readonly OfferedGroup[]): OfferedGroup[] {
  return groups.map((g) => ({
    kind: g.kind,
    heading: g.heading,
    ...(g.personId === undefined ? {} : { personId: g.personId }),
    choices: g.choices.map(plainChoice),
    ...(g.more && g.more.length > 0 ? { more: g.more.map(plainChoice) } : {}),
  }));
}

function plainChoice(c: OfferedChoice): OfferedChoice {
  return {
    command: c.command,
    label: c.label,
    minutes: c.minutes,
    lead: c.lead,
    done: c.done,
    ...(c.note === undefined ? {} : { note: c.note }),
  };
}

export function mount(root: HTMLElement): void {
  const store = safeStore();
  let screen: Screen = { kind: 'title' };
  let kase: Case | null = null;
  let view: CaseView | null = null;
  let state: RunState | null = null;
  let turned = 0;
  /** Whose topics are showing. Reset to §1.2's default on every new page. */
  let selected: Id | null = null;
  let showMore = false;
  /** How many calls the page that just landed spent, for the one animation. */
  let justSpent = 0;

  /* ------------------------------------------------------------ routing */

  function readUrl(): { seed: number | null; difficulty: Difficulty } {
    const params = new URLSearchParams(window.location.search);
    const rawSeed = params.get('seed');
    const rawDifficulty = Number(params.get('d') ?? 2);
    const difficulty = ([1, 2, 3] as number[]).includes(rawDifficulty)
      ? (rawDifficulty as Difficulty)
      : 2;
    const seed = rawSeed !== null && Number.isFinite(Number(rawSeed)) ? Number(rawSeed) : null;
    return { seed, difficulty };
  }

  function writeUrl(seed: number, difficulty: Difficulty): void {
    const url = `${window.location.pathname}?seed=${seed}&d=${difficulty}`;
    window.history.replaceState(null, '', url);
  }

  /**
   * The newest page keeps the choices it offered, so that turning back to it
   * later shows them greyed. The reducer never sees this; it is the book's
   * note on its own copy of the page.
   */
  function withOffered(run: RunState, v: CaseView): RunState {
    const last = run.log[run.log.length - 1];
    if (!last || last.offered) return run;
    const offered = offeredOf(choicesFor(v, run));
    return { ...run, log: [...run.log.slice(0, -1), { ...last, offered }] };
  }

  function openCase(seed: number, difficulty: Difficulty, name: string, resume: boolean): void {
    kase = generateCase(seed, { difficulty, detectiveName: name });
    view = buildView(kase);
    const saved = resume ? loadRun(store) : null;
    if (saved && saved.seed === seed && saved.difficulty === difficulty) {
      state = saved;
    } else {
      clearRun(store);
      state = newRun(view, { detectiveName: name, persistedBurned: loadBurned(store) });
      addBurned(store, crossRunOnly(state.burned), CROSS_RUN_TOTAL);
    }
    state = withOffered(state, view);
    saveRun(store, state);
    turned = state.log.length - 1;
    selected = null;
    showMore = false;
    justSpent = 0;
    // A filed run is over. Reopening its URL reopens the verdict, not the
    // page: the report is final, and that has to survive a reload.
    screen = state.filed
      ? { kind: 'verdict', verdict: scoreReport(view, state, state.filed) }
      : { kind: 'book' };
    writeUrl(seed, difficulty);
    store.setItem(NAME_KEY, name);
    render();
  }

  /* ------------------------------------------------------------ playing */

  function runCommand(input: string): void {
    if (!view || !state || state.filed) return;
    hideCard();
    const result = stepInput(state, input, view, loadBurned(store));
    state = withOffered(result.state, view);
    addBurned(store, crossRunOnly(result.page.cardsUsed), CROSS_RUN_TOTAL);
    saveRun(store, state);
    turned = state.log.length - 1;
    selected = null;
    showMore = false;
    justSpent = result.page.cost;
    document.body.classList.remove('notebook-open');
    render();
    // The new page starts at its top, whatever the last one was scrolled to.
    root.querySelector('.leaf')?.scrollTo?.({ top: 0 });
  }

  /**
   * A lead in the notebook: one click, one command. Asking somebody who is
   * standing here is the question; a lead in another room is the walk there,
   * and the question is a second click on the page that walk writes (M6
   * decision 3).
   */
  function followLead(thread: Thread): void {
    if (!view || !state) return;
    const clue = view.findableById.get(thread.clueId);
    const here =
      clue?.source.type === 'person'
        ? peopleHereNow(view, state.at, state).some(
            (p) => clue.source.type === 'person' && p.id === clue.source.personId,
          )
        : thread.placeId === state.at;
    runCommand(here ? thread.command : `go ${thread.placeLabel}`);
  }

  function choose(choice: OfferedChoice): void {
    if (choice.command === 'notebook') {
      // The notebook is a page of its own on a phone and always open beside
      // the prose on a wide screen. Neither is a page in the log.
      if (window.matchMedia('(min-width: 900px)').matches) {
        const body = root.querySelector('.page--notebook .body') as HTMLElement | null;
        body?.focus();
        body?.scrollTo?.({ top: 0 });
      } else {
        document.body.classList.add('notebook-open');
      }
      return;
    }
    runCommand(choice.command);
  }

  function file(report: Report): void {
    if (!view || !state) return;
    state = fileReport(state, report);
    saveRun(store, state);
    screen = { kind: 'verdict', verdict: scoreReport(view, state, report) };
    render();
  }

  /* -------------------------------------------------------- hover cards */

  function personSource(id: Id): CardSource {
    return () => (view && state ? personCard(view, state, id) : null);
  }

  function cardFor(noun: Noun): CardSource | null {
    if (noun.kind === 'person') return personSource(noun.id);
    if (noun.kind === 'place') return () => (view && state ? placeHoverCard(view, state, noun.id) : null);
    return null;
  }

  function placeCardForCommand(command: string): CardSource | null {
    if (!view || !command.startsWith('go ')) return null;
    const hit = matchPlaces(view, command.slice(3))[0];
    if (!hit) return null;
    return () => (view && state ? placeHoverCard(view, state, hit.value) : null);
  }

  /* ------------------------------------------------------------ drawing */

  function render(): void {
    clear(root);
    hideCard();
    if (screen.kind === 'title' || !kase || !view || !state) {
      root.append(titlePage());
      return;
    }
    if (screen.kind === 'truth') {
      root.append(
        renderTruth(kase, () => {
          screen = state?.filed
            ? { kind: 'verdict', verdict: scoreReport(view as CaseView, state, state.filed) }
            : { kind: 'book' };
          render();
        }),
      );
      return;
    }

    const spread = el('div', { class: 'spread' });
    spread.append(leftPage(), rightPage());
    root.append(spread);

    const tab = el('button', { class: 'tab', type: 'button', text: 'Notebook' });
    tab.addEventListener('click', () => {
      document.body.classList.toggle('notebook-open');
    });
    root.append(tab);
  }

  function leftPage(): HTMLElement {
    const page = el('section', { class: 'page page--prose' });
    const run = state as RunState;
    const shownIndex = Math.min(turned, run.log.length - 1);
    page.append(runningHead(shownIndex));

    const leaf = el('div', { class: 'leaf' });

    if (screen.kind === 'verdict') {
      leaf.append(
        renderVerdict(
          screen.verdict,
          () => openCase(randomSeed(), (kase as Case).difficulty, run.detectiveName, false),
          () => {
            screen = { kind: 'truth' };
            render();
          },
        ),
      );
      page.append(leaf);
      return page;
    }

    const newest = shownIndex === run.log.length - 1;
    // §5: when the night is over or the report is filed, the choices are
    // replaced by the report form as before.
    if (run.reportOpen && !run.filed && newest) {
      leaf.append(renderReportForm(view as CaseView, run, file));
      page.append(leaf, pager(run));
      return page;
    }

    const shown = run.log[shownIndex];
    if (shown) {
      for (const node of renderPage(shown, view as CaseView, cardFor)) leaf.append(node);
    }
    page.append(leaf);

    const groups: OfferedGroup[] = newest
      ? choicesFor(view as CaseView, run)
      : (shown?.offered ?? []);
    if (groups.length > 0) {
      const who = selected ?? defaultAskPerson(groups, run);
      page.append(
        renderChoices(groups, {
          inert: !newest,
          selected: who,
          showMore,
          onChoose: (choice) => choose(choice),
          onSelectPerson: (id) => {
            selected = id;
            showMore = false;
            justSpent = 0;
            render();
          },
          onToggleMore: () => {
            showMore = !showMore;
            justSpent = 0;
            render();
          },
          personCard: personSource,
          placeCard: placeCardForCommand,
          nameOf: (id) => (view as CaseView).personById.get(id)?.surname ?? id,
        }),
      );
    } else if (!newest) {
      page.append(el('p', { class: 'note turned-note', text: 'A page turned back to.' }));
    }
    page.append(pager(run));
    return page;
  }

  /** §3: the place and the time, large, and the strip of calls under them. */
  function runningHead(shownIndex: number): HTMLElement {
    const run = state as RunState;
    const budget = gameBudget((kase as Case));
    const newest = shownIndex === run.log.length - 1;
    const used = usedByPage(run.log, shownIndex);
    const strip = clockStrip(used, budget);
    const head = el('header', { class: 'runhead runhead--clock' });
    // On a phone the notebook is a page of its own, and the way to it lives
    // in the running head rather than on a tab over the prose.
    const notebookLink = el('button', { class: 'nb-link', type: 'button', text: 'Notebook' });
    notebookLink.addEventListener('click', () => document.body.classList.add('notebook-open'));
    head.append(
      el(
        'div',
        { class: 'runhead-line' },
        el('span', { class: 'place', text: run.log[shownIndex]?.head ?? (kase as Case).neighborhood }),
        notebookLink,
        el('span', { class: 'time', text: strip.time }),
      ),
    );
    const notches = el('div', {
      class: 'notches',
      role: 'img',
      'aria-label': `${used} of ${budget} calls spent`,
      'data-spent': String(used),
    });
    strip.notches.forEach((kind, i) => {
      const fresh = newest && justSpent > 0 && kind === 'spent' && i >= used - justSpent;
      notches.append(el('span', { class: `notch notch--${kind}${fresh ? ' notch--fresh' : ''}` }));
    });
    head.append(notches, el('div', { class: 'calls-left', text: strip.left }));
    return head;
  }

  function pager(run: RunState): HTMLElement {
    const hint = el('div', { class: 'pager' });
    const back = el('button', { type: 'button', text: '‹ back' });
    back.disabled = turned <= 0;
    back.addEventListener('click', () => {
      turned = Math.max(0, turned - 1);
      justSpent = 0;
      render();
    });
    const forward = el('button', { type: 'button', text: 'forward ›' });
    forward.disabled = turned >= run.log.length - 1;
    forward.addEventListener('click', () => {
      turned = Math.min(run.log.length - 1, turned + 1);
      justSpent = 0;
      render();
    });
    hint.append(back, el('span', { text: `page ${turned + 1} of ${run.log.length}` }), forward);
    return hint;
  }

  function rightPage(): HTMLElement {
    const page = el('aside', { class: 'page page--notebook', 'aria-label': 'Notebook' });
    page.append(
      el(
        'header',
        { class: 'runhead' },
        el('span', { text: 'Notebook' }),
        el('span', { text: `case ${(kase as Case).seed} · difficulty ${(kase as Case).difficulty}` }),
      ),
    );
    const body = renderNotebook(buildNotebook(view as CaseView, state as RunState), followLead, () =>
      runCommand('file'),
    );
    body.setAttribute('tabindex', '-1');
    page.append(body);
    const back = el('button', { class: 'plain-button nb-back', type: 'button', text: 'Back to the page' });
    back.addEventListener('click', () => document.body.classList.remove('notebook-open'));
    page.append(back);
    return page;
  }

  /* -------------------------------------------------------- title page */

  function titlePage(): HTMLElement {
    const url = readUrl();
    const wrap = el('div', { class: 'title-page' });
    const form = el('form');
    const name = el('input', {
      type: 'text',
      value: store.getItem(NAME_KEY) ?? DEFAULT_NAME,
      'aria-label': 'The detective’s name',
      autocomplete: 'off',
    });
    const seed = el('input', {
      type: 'number',
      value: String(url.seed ?? randomSeed()),
      min: '1',
      'aria-label': 'Seed',
    });
    const difficulty = el('select', { 'aria-label': 'Difficulty' });
    for (const d of [1, 2, 3]) {
      const option = el('option', { value: String(d) }, String(d));
      if (d === url.difficulty) option.selected = true;
      difficulty.append(option);
    }

    form.append(
      el('h1', { text: 'DASHIELL' }),
      el('p', { class: 'sub', text: 'A murder, an evening, and eight hours to write it down.' }),
      el('div', { class: 'name-line' }, el('label', { text: 'The detective' }), name),
      el(
        'div',
        { class: 'controls' },
        el('div', { class: 'field' }, el('label', { text: 'Difficulty' }), difficulty),
        el('div', { class: 'field' }, el('label', { text: 'Seed' }), seed),
      ),
      el('button', { class: 'open-case', type: 'submit', text: 'Open the case' }),
      el('p', {
        class: 'footnote',
        text:
          'Every page ends in choices: ask, search, go. Each one says what it costs of the night, and a lead is marked with a star. The DA files at eight whether you have or not.',
      }),
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const chosen = Number(seed.value) || randomSeed();
      openCase(
        chosen,
        Number(difficulty.value) as Difficulty,
        name.value.trim() || DEFAULT_NAME,
        true,
      );
    });
    wrap.append(form);
    return wrap;
  }

  /* --------------------------------------------------------------- boot */

  const url = readUrl();
  if (url.seed !== null) {
    openCase(url.seed, url.difficulty, store.getItem(NAME_KEY) ?? DEFAULT_NAME, true);
  } else {
    render();
  }
}
