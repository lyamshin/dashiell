/**
 * The reducer. `step` is a pure function of (state, command, case); everything
 * the book shows comes out of the `page` it returns.
 *
 * The action model, which is the whole game:
 *
 * | command  | cost | what it gets                                          |
 * |----------|------|-------------------------------------------------------|
 * | go       | 1    | a room (free if you are already standing in it)        |
 * | ask      | 1    | every findable clue that one question answers          |
 * | examine  | 1    | every findable clue the room has left                  |
 * | look     | 0    | the room and who is in it                              |
 * | notebook | 0    | the right-hand page                                    |
 * | help     | 0    | the commands                                           |
 * | file     | —    | the report form, and the end of the night              |
 *
 * `ask` delivering more than one clue is a deliberate reading of the spec's
 * "deliver it": a question is a question, and the generator will happily give
 * one person two clues under one topic string. Grouping them makes the game's
 * action model line up exactly with `computePar`. See `docs/05-m3-notes.md`.
 *
 * M4 adds two ways the night can come cheaper than par, and no way it can come
 * dearer:
 *
 * - **The free first ask.** The first question to somebody who already knows
 *   the detective costs nothing. `waived` counts them, so par accounting is
 *   untouched while the clock genuinely runs slower.
 * - **The yap volunteer.** Once a run, a yapper hands over a clue nobody
 *   asked for. It is never a spine clue, so no route the oracle plans is ever
 *   shortened or lengthened by one.
 */

import type { Clue, Id } from '../gen/types.js';
import { TICKS, clock } from '../gen/types.js';
import type { Block, Command, Page, Report, RunState, Thread, TopicRef } from './types.js';
import { EMPTY_REPORT } from './types.js';
import { actionsLeft, isOver, minutesAfter } from './clock.js';
import type { CaseView } from './derive.js';
import { claimedAccount, leadFor, peopleHere, threadsFor, topicKey } from './derive.js';
import { parse } from './parser.js';
import {
  Dealer,
  askKindOf,
  composePage,
  knowsHim,
  portraitCardIds,
  rollCast,
  showedOff,
  volunteerFrom,
  type Scene,
  type Stage,
} from './voice/index.js';

export interface StepResult {
  state: RunState;
  page: Page;
}

const VOICE_SALT = 1000003;

function dealerFor(state: RunState, persistedBurned: string[]): Dealer {
  const seed =
    (state.seed * VOICE_SALT + state.log.length * 97 + state.actionsUsed * 7 + state.difficulty) >>>
    0;
  return new Dealer(seed, state.burned, persistedBurned);
}

export function newRun(
  view: CaseView,
  opts: { detectiveName: string; persistedBurned?: string[] },
): RunState {
  const kase = view.kase;
  const persisted = opts.persistedBurned ?? [];
  const cast = rollCast(kase, { persistedBurned: persisted });
  const base: RunState = {
    seed: kase.seed,
    difficulty: kase.difficulty,
    detectiveName: opts.detectiveName,
    at: kase.solution.murderPlaceId,
    actionsUsed: 0,
    found: [],
    threads: [],
    burned: portraitCardIds(cast),
    log: [],
    met: [],
    accounts: [],
    reportOpen: false,
    cast,
    freeAsked: [],
    waived: 0,
    volunteered: [],
    asideBands: [],
    portrayed: [],
    theory: null,
    lastSimile: null,
  };

  const found = kase.starting.slice();
  const dealer = dealerFor(base, persisted);
  const composed = composePage(
    stageFor(base, view, dealer, {
      at: base.at,
      cost: 0,
      foundAfter: found,
      accountsAfter: [],
      persisted,
    }),
    { kind: 'open' },
  );

  const here = peopleHere(view, base.at).map((p) => p.id);
  const page: Page = {
    n: 0,
    head: view.placeById.get(base.at)?.shortName ?? kase.neighborhood,
    blocks: composed.blocks,
    cost: 0,
    cardsUsed: dealer.spent,
    found,
    at: base.at,
    gaps: composed.gaps,
  };
  const state: RunState = {
    ...base,
    found,
    burned: [...base.burned, ...dealer.spent],
    met: mergeMet(view, base.met, found, here),
    threads: makeThreads(view, found),
    asideBands: composed.asideBand ? [composed.asideBand] : [],
    portrayed: composed.portrayed,
    theory: composed.theory,
    lastSimile: composed.simileTarget,
    log: [page],
  };
  return state;
}

/** Everything the page grammar needs that is not the scene itself. */
function stageFor(
  state: RunState,
  view: CaseView,
  dealer: Dealer,
  at: {
    at: Id;
    cost: number;
    foundAfter: Id[];
    accountsAfter: Id[];
    persisted: string[];
  },
): Stage {
  const used = state.actionsUsed + at.cost;
  return {
    view,
    cast: state.cast,
    dealer,
    detectiveName: state.detectiveName,
    at: at.at,
    cost: at.cost,
    minutes: minutesAfter(used, view.kase.budget),
    actionsLeft: actionsLeft(used, view.kase.budget),
    foundBefore: state.found,
    foundAfter: at.foundAfter,
    accountsBefore: state.accounts,
    accountsAfter: at.accountsAfter,
    describedPlaces: describedPlaces(state),
    portrayed: state.portrayed,
    asideBands: state.asideBands,
    pageIndex: state.log.length,
    previousTheory: state.theory,
    lastSimile: state.lastSimile,
    showedOff: showedOff([...state.burned, ...at.persisted]),
  };
}

function mergeMet(view: CaseView, met: Id[], found: Id[], present: Id[]): Id[] {
  const out = new Set(met);
  for (const id of present) out.add(id);
  for (const id of found) {
    const clue = view.findableById.get(id);
    if (!clue) continue;
    if (clue.source.type === 'person') out.add(clue.source.personId);
    const lower = clue.text.toLowerCase();
    for (const p of view.kase.people) {
      if (lower.includes(p.surname.toLowerCase())) out.add(p.id);
    }
    for (const f of clue.establishes) {
      if ('personId' in f) out.add(f.personId);
    }
  }
  return [...out];
}

function makeThreads(view: CaseView, found: Id[]): Thread[] {
  return threadsFor(view, found).map((t) => ({
    clueId: t.clueId,
    placeId: t.placeId,
    placeLabel: t.placeLabel,
    label: t.label,
    command: t.command,
  }));
}

/** Which rooms have already had their place card. Derived, never stored. */
function describedPlaces(state: RunState): Id[] {
  const out = new Set<Id>();
  for (const page of state.log) {
    if (page.blocks.some((b) => b.kind === 'prose' && b.voice === 'place')) out.add(page.at);
  }
  return [...out];
}

/** Which findable clues one question answers, in the order the case deals them. */
export function answersTo(view: CaseView, personId: Id, topic: TopicRef, found: Id[]): Clue[] {
  const have = new Set(found);
  if (topic.kind === 'exact') {
    return (view.exactBuckets.get(personId)?.get(topic.topic) ?? []).filter((c) => !have.has(c.id));
  }
  if (topic.kind === 'evening' || topic.kind === 'hire') {
    if (topic.kind === 'hire') {
      const key = topicKey(topic);
      const hit = view.kase.findable.find(
        (c) =>
          c.source.type === 'person' &&
          c.source.personId === personId &&
          !have.has(c.id) &&
          (view.answers.get(c.id) ?? []).includes(key),
      );
      if (!hit) return [];
      const bucket =
        view.exactBuckets.get(personId)?.get((hit.source as { topic: string }).topic) ?? [];
      return bucket.filter((c) => !have.has(c.id));
    }
    return [];
  }
  const key = topicKey(topic);
  const hit = view.kase.findable.find(
    (c) =>
      c.source.type === 'person' &&
      c.source.personId === personId &&
      !have.has(c.id) &&
      (view.answers.get(c.id) ?? []).includes(key),
  );
  if (!hit) return [];
  const topicString = (hit.source as { topic: string }).topic;
  return (view.exactBuckets.get(personId)?.get(topicString) ?? []).filter((c) => !have.has(c.id));
}

export function step(
  state: RunState,
  command: Command,
  view: CaseView,
  persistedBurned: string[] = [],
): StepResult {
  const kase = view.kase;
  const dealer = dealerFor(state, persistedBurned);

  let at = state.at;
  let cost = 0;
  let waived = 0;
  let head = view.placeById.get(state.at)?.shortName ?? kase.neighborhood;
  let scene: Scene | null = null;
  let gained: Id[] = [];
  const accounts: Id[] = [];
  const freeAsked: Id[] = [];
  const volunteered: Id[] = [];
  let blocks: Block[] = [];
  let gaps: string[] = [];
  let asideBand: string | null = null;
  let portrayed: Id[] = [];
  let theory = state.theory;
  let lastSimile = state.lastSimile;

  switch (command.kind) {
    case 'look':
      scene = { kind: 'look' };
      break;
    case 'go': {
      if (command.placeId === state.at) {
        scene = { kind: 'travel', to: state.at, already: true };
        break;
      }
      cost = 1;
      at = command.placeId;
      head = view.placeById.get(command.placeId)?.shortName ?? head;
      scene = { kind: 'travel', to: command.placeId, already: false };
      break;
    }
    case 'notebook':
      head = 'The notebook';
      blocks = [{ kind: 'note', text: 'Everything written down, on the right-hand page.' }];
      break;
    case 'help':
      head = 'How this works';
      blocks = [{ kind: 'help' }];
      break;
    case 'file':
      head = 'The report';
      blocks = [
        {
          kind: 'note',
          text: 'I put paper in the machine. Five questions, and the DA only reads the answers.',
        },
      ];
      break;
    case 'examine': {
      cost = 1;
      const available = (view.placeClues.get(state.at) ?? []).filter(
        (c) => !state.found.includes(c.id),
      );
      gained = available.map((c) => c.id);
      scene = {
        kind: 'examine',
        placeId: state.at,
        clues: available,
        ...(command.objectId === undefined ? {} : { objectId: command.objectId }),
      };
      break;
    }
    case 'ask': {
      const person = view.personById.get(command.personId);
      const here = peopleHere(view, state.at).some((p) => p.id === command.personId);
      if (!person || !here) {
        // A mistake at the prompt. Free.
        scene = {
          kind: 'nothing',
          tag: 'elsewhere',
          slots: {
            name: person?.surname,
            place: view.placeById.get(state.at)?.shortName,
            detective: state.detectiveName,
          },
        };
        break;
      }
      cost = 1;
      // The free first ask. Unearned slack, and it should feel like luck.
      if (knowsHim(state.cast.roll, person.id) && !state.freeAsked.includes(person.id)) {
        cost = 0;
        waived = 1;
        freeAsked.push(person.id);
      }
      const account = command.topic.kind === 'evening' ? claimedAccount(view, person.id) : null;
      if (account) accounts.push(person.id);
      const answers =
        command.topic.kind === 'evening'
          ? []
          : answersTo(view, command.personId, command.topic, state.found);
      gained = answers.map((c) => c.id);
      const volunteer =
        answers.length > 0 || account
          ? volunteerFrom(
              view,
              state.cast,
              person,
              [...state.found, ...gained],
              state.volunteered.length,
              state.seed * 31 + state.log.length,
            )
          : null;
      if (volunteer) {
        volunteered.push(volunteer.id);
        gained = [...gained, volunteer.id];
      }
      scene = {
        kind: 'ask',
        personId: command.personId,
        askKind: askKindOf(command.topic.kind),
        topicLabel: topicLabel(view, command.topic),
        topicSlots: topicSlots(view, command.topic),
        clues: answers,
        account,
        volunteer,
        free: waived === 1,
      };
      break;
    }
  }

  const found = [...state.found, ...gained];
  const accountsAfter = [...new Set([...state.accounts, ...accounts])];

  if (scene) {
    const composed = composePage(
      stageFor(state, view, dealer, {
        at,
        cost,
        foundAfter: found,
        accountsAfter,
        persisted: persistedBurned,
      }),
      scene,
    );
    blocks = composed.blocks;
    gaps = composed.gaps;
    asideBand = composed.asideBand;
    portrayed = composed.portrayed;
    theory = composed.theory;
    // A page with no simile keeps the last one, so the page after it still
    // has something to avoid.
    lastSimile = composed.simileTarget ?? state.lastSimile;
  }

  const actionsUsed = state.actionsUsed + cost;
  const overNow = isOver(actionsUsed, kase.budget);
  if (cost > 0 && overNow && !state.reportOpen) {
    blocks.push({
      kind: 'note',
      text: 'Eight o’clock. Somebody from the DA’s office is at the door with a folder and a pen, and the folder is mine whether I write in it or not.',
    });
  }

  const next: RunState = {
    ...state,
    at,
    actionsUsed,
    found,
    burned: [...state.burned, ...dealer.spent],
    met: mergeMet(
      view,
      state.met,
      found,
      peopleHere(view, at).map((p) => p.id),
    ),
    accounts: accountsAfter,
    threads: makeThreads(view, found),
    reportOpen: state.reportOpen || overNow || command.kind === 'file',
    freeAsked: [...state.freeAsked, ...freeAsked],
    waived: state.waived + waived,
    volunteered: [...state.volunteered, ...volunteered],
    asideBands: asideBand ? [...state.asideBands, asideBand] : state.asideBands,
    portrayed: [...new Set([...state.portrayed, ...portrayed])],
    theory,
    lastSimile,
  };
  const page: Page = {
    n: state.log.length,
    head,
    blocks,
    cost,
    cardsUsed: dealer.spent,
    found: gained,
    at,
    gaps,
  };
  next.log = [...state.log, page];
  return { state: next, page };
}

/**
 * What the question is about, as slots the exchange can fill. This is the
 * *subject*, never the person being asked: the two are the same thing only
 * for `evening` and `hire`, and the page grammar decides that, not this.
 *
 * An exact topic is a generated string — "Vitale that evening", "Brauer's
 * account", "Carbone and Vitale" — and the subject is whoever it names first.
 * An anchor or a noise topic names nobody, and then there is no subject at
 * all: Dashiell asks for it by name instead ({topic}).
 */
export function topicSlots(view: CaseView, topic: TopicRef): Record<string, string | undefined> {
  switch (topic.kind) {
    case 'person':
      return { subject: view.personById.get(topic.id)?.surname };
    case 'place':
      return { place: view.placeById.get(topic.id)?.shortName };
    case 'object':
      return { object: view.objectById.get(topic.id)?.name };
    case 'exact':
      return { subject: surnameIn(view, topic.topic) };
    default:
      return {};
  }
}

/** The first person named in a generated topic string, if it names one. */
function surnameIn(view: CaseView, text: string): string | undefined {
  let best: { at: number; surname: string } | null = null;
  for (const person of view.kase.people) {
    const at = text.toLowerCase().indexOf(person.surname.toLowerCase());
    if (at < 0) continue;
    // A surname inside a longer word is a coincidence, not a mention.
    const before = text.charAt(at - 1);
    const after = text.charAt(at + person.surname.length);
    if (/[A-Za-z]/.test(before) || /[A-Za-z]/.test(after)) continue;
    if (best === null || at < best.at) best = { at, surname: person.surname };
  }
  return best?.surname;
}

export function topicLabel(view: CaseView, topic: TopicRef): string {
  switch (topic.kind) {
    case 'person':
      return view.personById.get(topic.id)?.surname ?? 'them';
    case 'place':
      return view.placeById.get(topic.id)?.shortName ?? 'the place';
    case 'object':
      return view.objectById.get(topic.id)?.name ?? 'the thing';
    case 'anchor':
      return view.anchorById.get(topic.id)?.name ?? 'that hour';
    case 'evening':
      return 'that evening';
    case 'hire':
      return 'why I was hired';
    case 'exact':
      return topic.topic;
  }
}

/** The prompt: parse, then step. A problem is a free page and no more. */
export function stepInput(
  state: RunState,
  raw: string,
  view: CaseView,
  persistedBurned: string[] = [],
): StepResult {
  const result = parse(view, state.at, raw);
  if (result.ok) return step(state, result.command, view, persistedBurned);

  const problem = result.problem;
  const dealer = dealerFor(state, persistedBurned);
  const blocks: Block[] = [];
  let gaps: string[] = [];
  if (problem.kind === 'absent-person' || problem.kind === 'unknown-topic') {
    const person = problem.personId ? view.personById.get(problem.personId) : undefined;
    const composed = composePage(
      stageFor(state, view, dealer, {
        at: state.at,
        cost: 0,
        foundAfter: state.found,
        accountsAfter: state.accounts,
        persisted: persistedBurned,
      }),
      {
        kind: 'nothing',
        tag: problem.kind === 'absent-person' ? 'elsewhere' : 'meaningless',
        slots: {
          name: person?.surname,
          topic: problem.topicText,
          place: view.placeById.get(state.at)?.shortName,
          detective: state.detectiveName,
        },
      },
    );
    blocks.push(...composed.blocks);
    gaps = composed.gaps;
    if (problem.kind === 'absent-person' && person?.foundAt) {
      blocks.push({
        kind: 'note',
        text: `${person.surname} is at ${
          view.placeById.get(person.foundAt)?.shortName ?? 'another address'
        }.`,
      });
    }
  } else if (problem.kind === 'empty') {
    blocks.push({ kind: 'note', text: 'Say something.' });
  } else {
    blocks.push({ kind: 'note', text: problem.message });
    if (problem.kind === 'unknown-verb') blocks.push({ kind: 'help' });
  }
  if (problem.options && problem.options.length > 0) {
    blocks.push({ kind: 'note', text: problem.options.map((o) => `· ${o}`).join('\n') });
  }

  const page: Page = {
    n: state.log.length,
    head: view.placeById.get(state.at)?.shortName ?? view.kase.neighborhood,
    blocks,
    cost: 0,
    cardsUsed: dealer.spent,
    found: [],
    at: state.at,
    gaps,
  };
  const next: RunState = {
    ...state,
    burned: [...state.burned, ...dealer.spent],
    log: [...state.log, page],
  };
  return { state: next, page };
}

/** Clicking a lead: travel first if the lead is elsewhere. Two actions, then. */
export function planThread(state: RunState, thread: Thread): string[] {
  return state.at === thread.placeId
    ? [thread.command]
    : [`go ${thread.placeLabel}`, thread.command];
}

/** Filing. The report is final. */
export function fileReport(state: RunState, report: Report | undefined): RunState {
  return { ...state, filed: report ?? EMPTY_REPORT, reportOpen: true };
}

/** The twelve ticks, for the report's "when". */
export const TICK_OPTIONS = Array.from({ length: TICKS }, (_, t) => ({ tick: t, label: clock(t) }));

export function remaining(state: RunState, budget: number): number {
  return actionsLeft(state.actionsUsed, budget);
}

export { leadFor };
