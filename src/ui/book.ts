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

import { generateCase, type Case } from '../gen/index.js';
import { LADDERS, type Level } from '../gen/shape.js';
import { crossRunOnly, settleReads } from '../game/voice/index.js';
import {
  caseOptions,
  fileToProfile,
  loadProfile,
  levelFor,
  paramsForPick,
  pickFromParams,
  pickOfRun,
  runMatches,
  saveProfile,
  shapeOf,
  TIER_ORDER,
  unlockedTiers,
  withCurrent,
  type CasePick,
  type TierKey,
} from '../game/profile.js';
import { choicesFor, defaultAskPerson } from '../game/choices.js';
import { clockStrip, usedByPage } from '../game/clock.js';
import { buildView, gameBudget, peopleHereNow, type CaseView, type Noun } from '../game/derive.js';
import { applyLink, applyMark, gridFrom } from '../game/grid.js';
import { displayName } from '../game/m9.js';
import { buildNotebook, personCard, placeHoverCard } from '../game/notebook.js';
import { fileReport, newRun, stepInput } from '../game/reducer.js';
import { scoreReport, type Verdict } from '../game/scoring.js';
import {
  addBurned,
  clearRun,
  closingHistory,
  loadBurned,
  noteClosing,
  loadRun,
  saveRun,
  type KeyValueStore,
} from '../game/storage.js';
import type { Id, OfferedChoice, OfferedGroup, Report, RunState, Thread } from '../game/types.js';
import { renderChoices } from './choices-view.js';
import { clear, el } from './dom.js';
import { newGridUi, renderGridSection, type GridUi } from './grid-view.js';
import { hideCard, type CardSource } from './hover.js';
import { renderNotebook } from './notebook-view.js';
import { renderPage } from './prose.js';
import { renderReportForm, renderTellChoice, renderVerdict, type TierNews } from './report.js';
import { storyCardIds, storyOf, storyParagraphs } from '../game/story.js';
import { LIE_RULE } from '../game/voice-data.js';
import { renderTruthSheet } from '../sheet/truthSheet.js';
import { createWeatherLayer, loadWeatherOn, saveWeatherOn } from './weather.js';
import './weather.css';

type Screen =
  | { kind: 'title' }
  | { kind: 'book' }
  | { kind: 'verdict'; verdict: Verdict; story: string[]; news?: TierNews }
  /** M14 §2.2: an affair's report is in, and the client is waiting to be told something. */
  | { kind: 'tell'; report: Report };

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
  /** M9 §3: the "Put it to …" picker, open or shut. */
  let pickerOpen = false;
  /** M9 polish: the picker narrowed to one person, or everybody. */
  let pickerFilter: Id | null = null;
  /** How many calls the page that just landed spent, for the one animation. */
  let justSpent = 0;
  /** What the grid has open, folded and lit. Kept across pages, reset per case. */
  let gridUi: GridUi = newGridUi();
  /**
   * docs/27: the night's weather on the glass. The spread is kept from one
   * render to the next so the layer inside it keeps running (and the frost,
   * once formed, stays formed) while pages are turned.
   */
  const weather = createWeatherLayer({ enabled: loadWeatherOn(store) });
  let spread: HTMLElement | null = null;

  /* ------------------------------------------------------------ routing */

  function readUrl(): { seed: number | null; pick: CasePick } {
    return pickFromParams(new URLSearchParams(window.location.search));
  }

  function writeUrl(seed: number | null, pick?: CasePick): void {
    const query = seed === null || pick === undefined ? '' : paramsForPick(seed, pick);
    window.history.replaceState(null, '', `${window.location.pathname}${query}`);
  }

  /**
   * The closing page and the story behind it, dealt against the reader's
   * history as it stood before this case's closing was first read, and
   * counted into it once (docs/25), so a reload shows the same page.
   */
  function closingOf(v: CaseView, run: RunState, report: Report): { verdict: Verdict; story: string[] } {
    const key = `${run.seed}|${run.tier ?? ''}|${run.level ?? run.difficulty}`;
    const history = closingHistory(store, key);
    const verdict = scoreReport(v, run, report, history);
    const story = storyOf(v.kase, history, report.told);
    noteClosing(store, key, [...crossRunOnly(verdict.cardsUsed ?? []), ...storyCardIds(story)], settleReads);
    return { verdict, story: storyParagraphs(story) };
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

  function openCase(seed: number, pick: CasePick, name: string, resume: boolean): void {
    // M7: a tier deals its own shape on the spec's ladder; no tier is today's
    // untiered case. Raw plays at Beat whatever level was asked for.
    kase = generateCase(seed, { ...caseOptions(pick), detectiveName: name });
    view = buildView(kase);
    const saved = resume ? loadRun(store) : null;
    // A save resumes only into the case it was dealt from: the same seed, the
    // same tier (none, for a save from before tiers), the same level.
    if (saved && runMatches(saved, seed, pick)) {
      state = saved;
    } else {
      clearRun(store);
      state = newRun(view, { detectiveName: name, persistedBurned: loadBurned(store) });
      addBurned(store, crossRunOnly(state.burned), settleReads);
    }
    state = withOffered(state, view);
    saveRun(store, state);
    turned = state.log.length - 1;
    selected = null;
    showMore = false;
    justSpent = 0;
    gridUi = newGridUi();
    // A filed run is over. Reopening its URL reopens the verdict, not the
    // page: the report is final, and that has to survive a reload.
    screen = state.filed ? { kind: 'verdict', ...closingOf(view, state, state.filed) } : { kind: 'book' };
    writeUrl(seed, pick);
    try {
      store.setItem(NAME_KEY, name);
    } catch {
      /* a full store forgets the name; the case still opens */
    }
    render();
  }

  /** Back to the title page, with the URL cleared so a reload stays there. */
  function toTitle(): void {
    screen = { kind: 'title' };
    kase = null;
    view = null;
    state = null;
    writeUrl(null);
    render();
    window.scrollTo?.({ top: 0 });
  }

  /* ------------------------------------------------------------ playing */

  function runCommand(input: string): void {
    if (!view || !state || state.filed) return;
    hideCard();
    const result = stepInput(state, input, view, loadBurned(store));
    state = withOffered(result.state, view);
    addBurned(store, crossRunOnly(result.page.cardsUsed), settleReads);
    saveRun(store, state);
    turned = state.log.length - 1;
    selected = null;
    showMore = false;
    pickerOpen = false;
    pickerFilter = null;
    justSpent = result.page.cost;
    document.body.classList.remove('notebook-open');
    render();
    // The new page starts at its top, whatever the last one was scrolled to.
    root.querySelector('.page--prose')?.scrollTo?.({ top: 0 });
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
    // M14 §2.2: after an affair's report, before the closing page, what to
    // tell the client. The report is final already; the choice only changes
    // the words that follow it.
    if (view.kase.act.type === 'affair' && report.told === undefined) {
      screen = { kind: 'tell', report };
      render();
      return;
    }
    state = fileReport(state, report);
    saveRun(store, state);
    const { verdict, story } = closingOf(view, state, report);
    // M7: the profile hears about every filed report, once. A tiered case can
    // clear its tier, and a first clear can open the next one.
    const outcome = fileToProfile(store, {
      ...(state.tier === undefined ? {} : { tier: state.tier }),
      level: state.level ?? state.difficulty,
      points: verdict.points,
      asked: verdict.asked,
      actionsUsed: verdict.actionsUsed,
      par: verdict.par,
      ...(report.told === undefined ? {} : { told: report.told }),
    });
    const news: TierNews | undefined =
      state.tier !== undefined && (outcome.firstClear !== null || outcome.unlocked !== null)
        ? { cleared: state.tier, unlocked: outcome.unlocked, firstClear: outcome.firstClear !== null }
        : undefined;
    screen =
      news === undefined ? { kind: 'verdict', verdict, story } : { kind: 'verdict', verdict, story, news };
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

  /* ------------------------------------------------------------ drawing */

  function render(): void {
    hideCard();
    if (screen.kind === 'title' || !kase || !view || !state) {
      clear(root);
      spread = null;
      weather.show(null);
      root.append(titlePage());
      return;
    }
    if (!spread || spread.parentNode !== root) {
      clear(root);
      spread = el('div', { class: 'spread' });
      root.append(spread);
    }
    for (const node of [...root.childNodes]) if (node !== spread) node.remove();
    for (const node of [...spread.childNodes]) if (node !== weather.element) node.remove();
    spread.append(leftPage(), rightPage());
    weather.show(state.cast.roll.weather);
    weather.attach(spread);

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

    if (screen.kind === 'tell') {
      const report = screen.report;
      leaf.append(renderTellChoice(view as CaseView, (told) => file({ ...report, told })));
      page.append(leaf);
      return page;
    }

    if (screen.kind === 'verdict') {
      leaf.append(
        renderVerdict(
          screen.verdict,
          // M7: another case starts on the title page, which is where the
          // tiers are chosen and where a newly opened one shows.
          () => toTitle(),
          {
            story: screen.story,
            truthSheet: () => renderTruthSheet(kase as Case),
          },
          screen.news,
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
            pickerOpen = false;
            pickerFilter = null;
            justSpent = 0;
            render();
          },
          onToggleMore: () => {
            showMore = !showMore;
            justSpent = 0;
            render();
          },
          pickerOpen,
          onTogglePicker: () => {
            pickerOpen = !pickerOpen;
            pickerFilter = null;
            justSpent = 0;
            render();
          },
          pickerFilter,
          onPickerFilter: (id) => {
            pickerFilter = id;
            justSpent = 0;
            render();
          },
          // M9, "Who knows whom": a stranger is what anybody can see until named.
          nameOf: (id) => displayName(view as CaseView, run, id),
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
    hint.append(back, el('span', { text: `page ${turned + 1} of ${run.log.length}` }), forward, weatherToggle());
    return hint;
  }

  /** docs/27: the one quiet switch for the weather, remembered. */
  function weatherToggle(): HTMLElement {
    const toggle = el('button', {
      class: 'wx-toggle',
      type: 'button',
      'aria-label': 'Weather effects',
      'aria-pressed': String(weather.enabled),
      text: weather.enabled ? 'weather on' : 'weather off',
    });
    toggle.addEventListener('click', () => {
      const on = !weather.enabled;
      saveWeatherOn(store, on);
      weather.setEnabled(on);
      toggle.setAttribute('aria-pressed', String(on));
      toggle.textContent = on ? 'weather on' : 'weather off';
    });
    return toggle;
  }

  function rightPage(): HTMLElement {
    const page = el('aside', { class: 'page page--notebook', 'aria-label': 'Notebook' });
    page.append(
      el(
        'header',
        { class: 'runhead' },
        el('span', { text: 'Notebook' }),
        el('span', { text: caseLine(kase as Case) }),
      ),
    );
    const book = buildNotebook(view as CaseView, state as RunState);
    const grid = renderGridSection(gridUi, {
      grid: () => gridFrom(view as CaseView, state as RunState),
      // The pencil is free and writes no page: it changes the run's marks,
      // is saved with the run, and redraws the grid alone.
      onMark: (personId, tick, action) => {
        if (!state) return;
        state = applyMark(state, personId, tick, action);
        saveRun(store, state);
      },
      onPerson: (personId) => showEntry(personId),
      // M9 §2: "That was Kreuzer." Free, saved with the run, never a fact.
      onLink: (key, personId) => {
        if (!state) return;
        state = applyLink(state, key, personId);
        saveRun(store, state);
      },
    });
    const body = renderNotebook(book, followLead, () => runCommand('file'), grid);
    body.setAttribute('tabindex', '-1');
    page.append(body);
    const back = el('button', { class: 'plain-button nb-back', type: 'button', text: 'Back to the page' });
    back.addEventListener('click', () => document.body.classList.remove('notebook-open'));
    page.append(back);
    return page;
  }

  /** A name on the grid, tapped: the notebook turns to that person's entry. */
  function showEntry(personId: Id): void {
    const entry = root.querySelector(`#nb-person-${CSS.escape(personId)}`) as HTMLElement | null;
    if (!entry) return;
    entry.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    entry.focus?.({ preventScroll: true });
    entry.classList.remove('nb-flash');
    void entry.offsetWidth;
    entry.classList.add('nb-flash');
  }

  /* -------------------------------------------------------- title page */

  function storedName(): string {
    try {
      return store.getItem(NAME_KEY) ?? DEFAULT_NAME;
    } catch {
      return DEFAULT_NAME;
    }
  }

  /**
   * M7: the current tier and level, the tier's one rule, the difficulty (not
   * on Raw, which is always Beat), and the ladder of tiers below with the
   * locked ones marked. What was chosen is remembered in the profile.
   */
  function titlePage(): HTMLElement {
    let profile = loadProfile(store);
    const open = unlockedTiers(profile);
    let tier: TierKey = profile.current.tier;
    let level: Level = profile.current.level;

    const wrap = el('div', { class: 'title-page' });
    const form = el('form');
    const name = el('input', {
      type: 'text',
      value: storedName(),
      'aria-label': 'The detective’s name',
      autocomplete: 'off',
    });
    const seed = el('input', {
      type: 'number',
      value: String(randomSeed()),
      min: '1',
      'aria-label': 'Seed',
    });

    const now = el('p', { class: 'tier-now' });
    const rule = el('p', { class: 'tier-rule' });
    // M9 §1: the one rule about lies, from the tier where lies first matter.
    const lies = el('p', { class: 'tier-rule lie-rule', text: LIE_RULE });

    // The tier: a choice only once there is more than one to choose from.
    const tierField = el('div', { class: 'field' }, el('label', { text: 'Tier' }));
    let tierSelect: HTMLSelectElement | null = null;
    if (open.length > 1) {
      tierSelect = el('select', { 'aria-label': 'Tier', name: 'tier' });
      for (const t of open) {
        const option = el('option', { value: String(t) }, shapeOf(t).name);
        if (t === tier) option.selected = true;
        tierSelect.append(option);
      }
      tierField.append(tierSelect);
    } else {
      tierField.append(el('span', { class: 'fixed', text: shapeOf(tier).name }));
    }

    // The level: the four rungs by name, or Beat and nothing to choose on Raw.
    const levelField = el('div', { class: 'field' }, el('label', { text: 'Difficulty' }));
    const levelSelect = el('select', { 'aria-label': 'Difficulty', name: 'difficulty' });
    for (const l of [1, 2, 3, 4] as Level[]) {
      const option = el('option', { value: String(l) }, LADDERS[l].name);
      if (l === level) option.selected = true;
      levelSelect.append(option);
    }
    const levelFixed = el('span', { class: 'fixed', text: LADDERS[1].name });
    levelField.append(levelSelect, levelFixed);

    const ladder = el('ol', { class: 'ladder', 'aria-label': 'The tiers' });

    function paint(): void {
      const shape = shapeOf(tier);
      const locked = shape.lockedLevel !== undefined;
      const played = levelFor(tier, level);
      now.textContent = `${shape.name}, at ${LADDERS[played].name}`;
      rule.textContent = shape.rule;
      lies.hidden = tier === 0 || tier === 1;
      levelSelect.hidden = locked;
      levelFixed.hidden = !locked;
      clear(ladder);
      for (const t of TIER_ORDER) {
        const isOpen = open.includes(t);
        // Over easy is not listed until it is open: it is the post-game.
        if (t === 'over-easy' && !isOpen) continue;
        const best = profile.best[String(t)];
        const status = !isOpen
          ? 'locked'
          : best !== undefined
            ? `cleared at ${LADDERS[best.level].name}, ${parWords(best.parDelta)}`
            : 'open';
        ladder.append(
          el(
            'li',
            {
              class: `ladder-row${isOpen ? '' : ' locked'}${t === tier ? ' current' : ''}`,
              'data-tier': String(t),
            },
            el('span', { class: 'ladder-name', text: shapeOf(t).name }),
            el('span', { class: 'ladder-status', text: status }),
          ),
        );
      }
    }

    tierSelect?.addEventListener('change', () => {
      const value = tierSelect?.value;
      const next = open.find((t) => String(t) === value);
      if (next !== undefined) tier = next;
      paint();
    });
    levelSelect.addEventListener('change', () => {
      level = Number(levelSelect.value) as Level;
      paint();
    });

    form.append(
      el('h1', { text: 'DASHIELL' }),
      el('p', { class: 'sub', text: 'A murder, an evening, and eight hours to write it down.' }),
      el('div', { class: 'name-line' }, el('label', { text: 'The detective' }), name),
    );

    // A case left open on the desk can be gone back to, dealt again from the
    // tier and level it was saved with (or as the untiered case it was).
    const saved = loadRun(store);
    if (saved && !saved.filed) {
      const pick = pickOfRun(saved);
      const back = el('button', { class: 'plain-button', type: 'button', text: 'Go back to it' });
      back.addEventListener('click', () => openCase(saved.seed, pick, saved.detectiveName, true));
      form.append(
        el(
          'div',
          { class: 'resume' },
          el('p', { text: `Case ${saved.seed} is still open on the desk: ${pickWords(pick)}.` }),
          back,
        ),
      );
    }

    form.append(
      now,
      rule,
      lies,
      el('div', { class: 'controls' }, tierField, levelField, el('div', { class: 'field' }, el('label', { text: 'Seed' }), seed)),
      el('button', { class: 'open-case', type: 'submit', text: 'Open the case' }),
      ladder,
    );
    if (profile.runs > 0) {
      form.append(
        el('p', {
          class: 'stats',
          text: `${profile.runs} ${profile.runs === 1 ? 'report' : 'reports'} filed, ${profile.wins} of them clean.`,
        }),
      );
    }
    form.append(
      el('p', {
        class: 'footnote',
        text:
          `Every page ends in choices: ask, search, go. Each one says what it costs of the night, and a lead is marked with a star. The DA files at eight whether you have or not. A clean report opens the next tier.${
            profile.runs === 0 ? ` ${LIE_RULE}` : ''
          }`,
      }),
    );
    paint();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const chosen = Number(seed.value) || randomSeed();
      profile = withCurrent(profile, tier, level);
      saveProfile(store, profile);
      openCase(chosen, { tier, level: levelFor(tier, level) }, name.value.trim() || DEFAULT_NAME, true);
    });
    wrap.append(form);
    return wrap;
  }

  /* --------------------------------------------------------------- boot */

  const url = readUrl();
  if (url.seed !== null) {
    openCase(url.seed, url.pick, storedName(), true);
  } else {
    render();
  }
}

/** The notebook's header line: the case, and what it was dealt at. */
function caseLine(kase: Case): string {
  if (kase.shape !== undefined && kase.ladder !== undefined) {
    return `case ${kase.seed} · ${kase.shape.name} · ${kase.ladder.name}`;
  }
  return `case ${kase.seed} · difficulty ${kase.difficulty}`;
}

function pickWords(pick: CasePick): string {
  if (pick.tier === undefined) return `difficulty ${pick.level}, from before the tiers`;
  return `${shapeOf(pick.tier).name}, at ${LADDERS[levelFor(pick.tier, pick.level)].name}`;
}

function parWords(delta: number): string {
  if (delta === 0) return 'at par';
  return delta < 0 ? `${-delta} under par` : `${delta} over par`;
}
