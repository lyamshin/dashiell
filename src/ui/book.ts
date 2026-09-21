/**
 * The book itself: the only file that owns the document.
 *
 * Everything it renders comes out of `src/game/`. It holds three pieces of
 * state of its own — which screen is showing, which page of the log is turned
 * to, and whether the notebook tab is open on a narrow screen — and nothing
 * else.
 */

import { generateCase, type Case, type Difficulty } from '../gen/index.js';
import { ALL_CARDS } from '../game/decks.js';
import { buildView, type CaseView, type Noun } from '../game/derive.js';
import { buildNotebook } from '../game/notebook.js';
import { fileReport, newRun, planThread, remaining, stepInput } from '../game/reducer.js';
import { scoreReport, type Verdict } from '../game/scoring.js';
import {
  addBurned,
  clearRun,
  loadBurned,
  loadRun,
  saveRun,
  type KeyValueStore,
} from '../game/storage.js';
import type { Report, RunState, Thread } from '../game/types.js';
import { clear, el } from './dom.js';
import { closeMenu, openNounMenu } from './menu.js';
import { renderNotebook } from './notebook-view.js';
import { renderPage } from './prose.js';
import { renderReportForm, renderVerdict } from './report.js';
import { renderTruth } from './truth.js';

type Screen =
  | { kind: 'title' }
  | { kind: 'book' }
  | { kind: 'verdict'; verdict: Verdict }
  | { kind: 'truth' };

const DEFAULT_NAME = 'Humphrey';
const NAME_KEY = 'humphrey:detective';

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

export function mount(root: HTMLElement): void {
  const store = safeStore();
  let screen: Screen = { kind: 'title' };
  let kase: Case | null = null;
  let view: CaseView | null = null;
  let state: RunState | null = null;
  let turned = 0;
  let turning = false;
  let promptText = '';

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

  function openCase(seed: number, difficulty: Difficulty, name: string, resume: boolean): void {
    kase = generateCase(seed, { difficulty, detectiveName: name });
    view = buildView(kase);
    const saved = resume ? loadRun(store) : null;
    if (saved && saved.seed === seed && saved.difficulty === difficulty) {
      state = saved;
    } else {
      clearRun(store);
      state = newRun(view, { detectiveName: name, persistedBurned: loadBurned(store) });
      addBurned(store, state.burned, ALL_CARDS.length);
      saveRun(store, state);
    }
    turned = state.log.length - 1;
    // A filed run is over. Reopening its URL reopens the verdict, not the
    // prompt: the report is final, and that has to survive a reload.
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
    closeMenu();
    const result = stepInput(state, input, view, loadBurned(store));
    state = result.state;
    addBurned(store, result.page.cardsUsed, ALL_CARDS.length);
    saveRun(store, state);
    turned = state.log.length - 1;
    turning = true;
    promptText = '';
    document.body.classList.remove('notebook-open');
    render();
  }

  function followLead(thread: Thread): void {
    if (!view || !state || !kase) return;
    const plan = planThread(state, thread);
    if (plan.length > 1 && remaining(state, kase.budget) < 3) {
      const left = remaining(state, kase.budget);
      const ok = window.confirm(
        `${thread.label} means walking there first. Two actions, and there ${
          left === 1 ? 'is 1' : `are ${left}`
        } left before eight. Go?`,
      );
      if (!ok) return;
    }
    for (const command of plan) runCommand(command);
  }

  function onNoun(noun: Noun, anchor: HTMLElement): void {
    if (!view || !state) return;
    openNounMenu(noun, anchor, view, state, runCommand);
  }

  function file(report: Report): void {
    if (!view || !state) return;
    state = fileReport(state, report);
    saveRun(store, state);
    screen = { kind: 'verdict', verdict: scoreReport(view, state, report) };
    render();
  }

  /* ------------------------------------------------------------ drawing */

  function render(): void {
    clear(root);
    closeMenu();
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

    const input = root.querySelector('.prompt input') as HTMLInputElement | null;
    if (input && window.matchMedia('(min-width: 900px)').matches) input.focus();
  }

  function leftPage(): HTMLElement {
    const page = el('section', { class: 'page page--prose' });
    page.append(runningHead());

    const leaf = el('div', { class: `leaf${turning ? ' turning' : ''}` });
    turning = false;

    if (screen.kind === 'verdict') {
      leaf.append(
        renderVerdict(
          screen.verdict,
          () => openCase(randomSeed(), (kase as Case).difficulty, (state as RunState).detectiveName, false),
          () => {
            screen = { kind: 'truth' };
            render();
          },
        ),
      );
      page.append(leaf);
      return page;
    }

    const run = state as RunState;
    if (run.reportOpen && !run.filed) {
      leaf.append(renderReportForm(view as CaseView, run, file));
      page.append(leaf);
      return page;
    }

    const shown = run.log[Math.min(turned, run.log.length - 1)];
    if (shown) {
      for (const node of renderPage(shown, view as CaseView, onNoun)) {
        leaf.append(node);
      }
    }
    page.append(leaf, prompt());
    return page;
  }

  function runningHead(): HTMLElement {
    const run = state as RunState;
    const book = buildNotebook(view as CaseView, run);
    return el(
      'header',
      { class: 'runhead' },
      el('span', { text: (kase as Case).neighborhood }),
      el('span', { text: book.clock.time }),
    );
  }

  function prompt(): HTMLElement {
    const run = state as RunState;
    const wrap = el('footer', { class: 'prompt' });
    const form = el('form');
    const input = el('input', {
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'What now?',
      placeholder: turned === run.log.length - 1 ? 'look, go, ask, examine…' : 'turned back',
    });
    input.value = promptText;
    input.addEventListener('input', () => {
      promptText = input.value;
    });
    form.append(el('span', { class: 'caret', text: '›' }), input);
    const send = (): void => {
      const value = input.value;
      input.value = '';
      promptText = '';
      runCommand(value);
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      send();
    });
    // A form with no submit button relies on implicit submission, which is a
    // thin reed. Take the key directly as well.
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      send();
    });
    wrap.append(form);

    const hint = el('div', { class: 'hint' });
    const back = el('button', { type: 'button', text: '‹ back' });
    back.addEventListener('click', () => {
      turned = Math.max(0, turned - 1);
      turning = true;
      render();
    });
    const forward = el('button', { type: 'button', text: 'forward ›' });
    forward.addEventListener('click', () => {
      turned = Math.min(run.log.length - 1, turned + 1);
      turning = true;
      render();
    });
    hint.append(
      back,
      el('span', { text: `page ${turned + 1} of ${run.log.length}` }),
      forward,
      (() => {
        const help = el('button', { type: 'button', text: 'help' });
        help.addEventListener('click', () => runCommand('help'));
        return help;
      })(),
    );
    wrap.append(hint);
    return wrap;
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
    page.append(
      renderNotebook(buildNotebook(view as CaseView, state as RunState), followLead, () =>
        runCommand('file'),
      ),
    );
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
      el('h1', { text: 'HUMPHREY' }),
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
          'Type at the prompt, or click anything underlined. look, notebook and help are free; go, ask and examine cost you an hour of the night. The DA files at eight whether you have or not.',
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
