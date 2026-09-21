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
 * action model line up exactly with `computePar`, which counts one action per
 * spine clue and one per move. See `docs/05-m3-notes.md`.
 */

import type { Clue, Id } from '../gen/types.js';
import { TICKS, clock } from '../gen/types.js';
import type { Block, Command, Page, RunState, Thread, TopicRef } from './types.js';
import { EMPTY_REPORT } from './types.js';
import { actionsLeft, isOver } from './clock.js';
import type { CaseView } from './derive.js';
import {
  claimedAccount,
  leadFor,
  peopleHere,
  threadsFor,
  topicKey,
} from './derive.js';
import { parse } from './parser.js';
import { Voice, registerFor, simileTargets, slotsFor } from './voice.js';

export interface StepResult {
  state: RunState;
  page: Page;
}

const VOICE_SALT = 1000003;

function voiceFor(state: RunState, view: CaseView, persistedBurned: string[]): Voice {
  const seed =
    (state.seed * VOICE_SALT + state.log.length * 97 + state.actionsUsed * 7 + state.difficulty) >>>
    0;
  return new Voice(view, state.detectiveName, [...persistedBurned, ...state.burned], seed);
}

export function newRun(
  view: CaseView,
  opts: { detectiveName: string; persistedBurned?: string[] },
): RunState {
  const kase = view.kase;
  const base: RunState = {
    seed: kase.seed,
    difficulty: kase.difficulty,
    detectiveName: opts.detectiveName,
    at: kase.solution.murderPlaceId,
    actionsUsed: 0,
    found: [],
    threads: [],
    burned: [],
    log: [],
    met: [],
    accounts: [],
    reportOpen: false,
  };
  const voice = voiceFor(base, view, opts.persistedBurned ?? []);
  const blocks: Block[] = [];

  const place = view.placeById.get(base.at);
  blocks.push({
    kind: 'note',
    text: `Midnight. ${place?.name ?? 'The address'}, ${kase.neighborhood}. They found ${
      view.victim.name
    } and then they found a telephone.`,
  });
  const card = voice.placeCard(base.at);
  if (card) blocks.push({ kind: 'prose', text: card.text, voice: 'place' });
  else blocks.push({ kind: 'prose', text: voice.plainArrival(base.at), voice: 'narrator' });

  const opening = kase.starting
    .map((id) => view.findableById.get(id))
    .filter((c): c is Clue => c !== undefined);
  for (const c of opening) blocks.push({ kind: 'clue', clueId: c.id, text: c.text });

  const last = opening[opening.length - 1] ?? null;
  const sim = voice.simile(simileTargets(view, last, base.at), slotsFor(view, opts.detectiveName, base.at, last, null));
  if (sim) blocks.push({ kind: 'prose', text: sim.text, voice: 'simile' });

  const here = peopleHere(view, base.at).map((p) => p.id);
  blocks.push({ kind: 'presence', personIds: here });

  const found = opening.map((c) => c.id);
  const state: RunState = {
    ...base,
    found,
    burned: voice.spent,
    met: mergeMet(view, base.met, found, here),
    threads: makeThreads(view, found),
  };
  const page: Page = {
    n: 0,
    head: place?.shortName ?? kase.neighborhood,
    blocks,
    cost: 0,
    cardsUsed: voice.spent,
    found,
    at: state.at,
  };
  state.log = [page];
  return state;
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

/** Has this room already been described this run? Place cards are per room. */
function described(state: RunState, placeId: Id): boolean {
  return state.log.some(
    (p) => p.at === placeId && p.blocks.some((b) => b.kind === 'prose' && b.voice === 'place'),
  );
}

/** Which findable clues one question answers, in the order the case deals them. */
export function answersTo(
  view: CaseView,
  personId: Id,
  topic: TopicRef,
  found: Id[],
): Clue[] {
  const have = new Set(found);
  if (topic.kind === 'exact') {
    return (view.exactBuckets.get(personId)?.get(topic.topic) ?? []).filter(
      (c) => !have.has(c.id),
    );
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
  return (view.exactBuckets.get(personId)?.get(topicString) ?? []).filter(
    (c) => !have.has(c.id),
  );
}

interface Draft {
  blocks: Block[];
  cost: number;
  found: Id[];
  at: Id;
  head: string;
  accounts: Id[];
}

export function step(
  state: RunState,
  command: Command,
  view: CaseView,
  persistedBurned: string[] = [],
): StepResult {
  const kase = view.kase;
  const voice = voiceFor(state, view, persistedBurned);
  const draft: Draft = {
    blocks: [],
    cost: 0,
    found: [],
    at: state.at,
    head: view.placeById.get(state.at)?.shortName ?? kase.neighborhood,
    accounts: [],
  };

  const describe = (placeId: Id, force: boolean): void => {
    if (force || !described(state, placeId)) {
      const card = voice.placeCard(placeId);
      if (card) draft.blocks.push({ kind: 'prose', text: card.text, voice: 'place' });
      else draft.blocks.push({ kind: 'prose', text: voice.plainArrival(placeId), voice: 'narrator' });
    } else {
      draft.blocks.push({ kind: 'prose', text: voice.plainArrival(placeId), voice: 'narrator' });
    }
    draft.blocks.push({ kind: 'presence', personIds: peopleHere(view, placeId).map((p) => p.id) });
  };

  switch (command.kind) {
    case 'look': {
      describe(state.at, false);
      break;
    }
    case 'go': {
      if (command.placeId === state.at) {
        draft.blocks.push({ kind: 'note', text: 'Already here.' });
        describe(state.at, false);
        break;
      }
      draft.cost = 1;
      draft.at = command.placeId;
      draft.head = view.placeById.get(command.placeId)?.shortName ?? draft.head;
      describe(command.placeId, false);
      break;
    }
    case 'notebook': {
      draft.head = 'The notebook';
      draft.blocks.push({ kind: 'note', text: 'Everything written down, on the right-hand page.' });
      break;
    }
    case 'help': {
      draft.head = 'How this works';
      draft.blocks.push({ kind: 'help' });
      break;
    }
    case 'file': {
      draft.head = 'The report';
      draft.blocks.push({
        kind: 'note',
        text: 'I put paper in the machine. Five questions, and the DA only reads the answers.',
      });
      break;
    }
    case 'examine': {
      draft.cost = 1;
      const available = (view.placeClues.get(state.at) ?? []).filter(
        (c) => !state.found.includes(c.id),
      );
      const object = command.objectId ? view.objectById.get(command.objectId) : undefined;
      if (available.length === 0) {
        draft.blocks.push({ kind: 'prose', text: voice.nothingLeft(state.at), voice: 'nothing' });
        break;
      }
      if (object) {
        draft.blocks.push({
          kind: 'note',
          text: `I start with ${object.name} and work outward.`,
        });
      }
      for (const c of available) {
        draft.blocks.push({ kind: 'clue', clueId: c.id, text: c.text });
        draft.found.push(c.id);
      }
      const last = available[available.length - 1] as Clue;
      const sim = voice.simile(
        simileTargets(view, last, state.at),
        slotsFor(view, state.detectiveName, state.at, last, null),
      );
      if (sim) draft.blocks.push({ kind: 'prose', text: sim.text, voice: 'simile' });
      break;
    }
    case 'ask': {
      const person = view.personById.get(command.personId);
      const here = peopleHere(view, state.at).some((p) => p.id === command.personId);
      if (!person || !here) {
        // A mistake at the prompt. Free.
        const line = voice.nothingAnswer('elsewhere', {
          name: person?.surname,
          place: view.placeById.get(state.at)?.shortName,
          detective: state.detectiveName,
        });
        draft.blocks.push({ kind: 'prose', text: line.text, voice: 'nothing' });
        break;
      }
      draft.cost = 1;
      if (command.topic.kind === 'evening') {
        const account = claimedAccount(view, command.personId);
        const lies = view.liesOf.get(command.personId);
        const register = lies && lies.size > 0 ? 'lie' : 'truth';
        const card = voice.witnessCard(command.personId, register, {
          name: person.surname,
          place: view.placeById.get(state.at)?.shortName,
          detective: state.detectiveName,
        });
        if (card) draft.blocks.push({ kind: 'prose', text: card.text, voice: 'witness' });
        if (account) {
          draft.blocks.push({ kind: 'timeline', personId: command.personId, rows: account.rows });
          draft.accounts.push(command.personId);
        } else {
          draft.blocks.push({
            kind: 'note',
            text: `${person.surname} keeps no account of the evening worth writing down.`,
          });
        }
        const sim = voice.simile(
          ['voice', 'lie', 'face'],
          slotsFor(view, state.detectiveName, state.at, null, command.personId),
        );
        if (sim) draft.blocks.push({ kind: 'prose', text: sim.text, voice: 'simile' });
        break;
      }

      const answers = answersTo(view, command.personId, command.topic, state.found);
      if (answers.length === 0) {
        const line = voice.nothingAnswer('present', {
          name: person.surname,
          topic: topicLabel(view, command.topic),
          place: view.placeById.get(state.at)?.shortName,
          detective: state.detectiveName,
        });
        draft.blocks.push({ kind: 'prose', text: line.text, voice: 'nothing' });
        break;
      }
      const first = answers[0] as Clue;
      const card = voice.witnessCard(
        command.personId,
        registerFor(view, command.personId, first),
        slotsFor(view, state.detectiveName, state.at, first, subjectOf(view, first)),
      );
      if (card) draft.blocks.push({ kind: 'prose', text: card.text, voice: 'witness' });
      for (const c of answers) {
        draft.blocks.push({ kind: 'clue', clueId: c.id, text: c.text });
        draft.found.push(c.id);
      }
      const sim = voice.simile(
        simileTargets(view, first, state.at),
        slotsFor(view, state.detectiveName, state.at, first, subjectOf(view, first)),
      );
      if (sim) draft.blocks.push({ kind: 'prose', text: sim.text, voice: 'simile' });
      break;
    }
  }

  const actionsUsed = state.actionsUsed + draft.cost;
  const found = [...state.found, ...draft.found];
  const overNow = isOver(actionsUsed, kase.budget);
  if (draft.cost > 0 && overNow && !state.reportOpen) {
    draft.blocks.push({
      kind: 'note',
      text: 'Eight o’clock. Somebody from the DA’s office is at the door with a folder and a pen, and the folder is mine whether I write in it or not.',
    });
  }

  const next: RunState = {
    ...state,
    at: draft.at,
    actionsUsed,
    found,
    burned: [...state.burned, ...voice.spent],
    met: mergeMet(view, state.met, found, peopleHere(view, draft.at).map((p) => p.id)),
    accounts: [...new Set([...state.accounts, ...draft.accounts])],
    threads: makeThreads(view, found),
    reportOpen: state.reportOpen || overNow || command.kind === 'file',
  };
  const page: Page = {
    n: state.log.length,
    head: draft.head,
    blocks: draft.blocks,
    cost: draft.cost,
    cardsUsed: voice.spent,
    found: draft.found,
    at: draft.at,
  };
  next.log = [...state.log, page];
  return { state: next, page };
}

function subjectOf(view: CaseView, clue: Clue): Id | null {
  for (const f of clue.establishes) if ('personId' in f) return f.personId;
  if (clue.source.type === 'person') return clue.source.personId;
  void view;
  return null;
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
  const voice = voiceFor(state, view, persistedBurned);
  const blocks: Block[] = [];
  if (problem.kind === 'absent-person' || problem.kind === 'unknown-topic') {
    const person = problem.personId ? view.personById.get(problem.personId) : undefined;
    const line = voice.nothingAnswer(
      problem.kind === 'absent-person' ? 'elsewhere' : 'meaningless',
      {
        name: person?.surname,
        topic: problem.topicText,
        place: view.placeById.get(state.at)?.shortName,
        detective: state.detectiveName,
      },
    );
    blocks.push({ kind: 'prose', text: line.text, voice: 'nothing' });
    if (problem.kind === 'absent-person' && person?.foundAt) {
      blocks.push({
        kind: 'note',
        text: `${person.surname} is at ${view.placeById.get(person.foundAt)?.shortName ?? 'another address'}.`,
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
    cardsUsed: voice.spent,
    found: [],
    at: state.at,
  };
  const next: RunState = {
    ...state,
    burned: [...state.burned, ...voice.spent],
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
export function fileReport(state: RunState, report: RunState['filed']): RunState {
  return { ...state, filed: report ?? EMPTY_REPORT, reportOpen: true };
}

/** The twelve ticks, for the report's "when". */
export const TICK_OPTIONS = Array.from({ length: TICKS }, (_, t) => ({ tick: t, label: clock(t) }));

export function remaining(state: RunState, budget: number): number {
  return actionsLeft(state.actionsUsed, budget);
}

export { leadFor };
