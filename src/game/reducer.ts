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
import type {
  Block,
  Command,
  ErrandTrace,
  Page,
  Report,
  RunState,
  Thread,
  TopicRef,
} from './types.js';
import { EMPTY_REPORT, EMPTY_SCENE } from './types.js';
import type { BeatTrace, PageShape, SceneMemory } from './types.js';
import { actionsLeft, isOver, minutesAfter } from './clock.js';
import type { CaseView } from './derive.js';
import {
  claimedAccount,
  gameBudget,
  leadFor,
  peopleHereNow,
  threadsFor,
  topicKey,
} from './derive.js';
import { planErrand } from './errand.js';
import {
  accountClueOf,
  canConfront,
  judgeConfront,
  type ConfrontRecord,
} from './m9.js';
import { namedIn, proseTexts } from './scene/text.js';
import { parse } from './parser.js';
import { possessiveOf } from './voice/cast.js';
import { DA_AT_THE_DOOR } from './voice-data.js';
import {
  Dealer,
  askKindOf,
  composePage,
  gossipTarget,
  knowsHim,
  portraitCardIds,
  rollCast,
  selfAccountFor,
  showedOff,
  temperOf,
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

/** The client's own brief — why Dashiell was hired. Page one's `{fact}`. */
export function clientClueOf(view: CaseView): Clue | null {
  for (const id of view.kase.starting) {
    const clue = view.findableById.get(id);
    if (clue?.kind === 'client') return clue;
  }
  return null;
}

/**
 * The report from the scene and the coroner's note. M3 handed these over on
 * page one; M4b hands them over on the first arrival at the scene, free,
 * because page one is now the office and a detective has not seen the body yet.
 */
export function sceneCluesOf(view: CaseView): Clue[] {
  return view.kase.starting
    .map((id) => view.findableById.get(id))
    .filter((c): c is Clue => c !== undefined && c.kind !== 'client');
}

export function newRun(
  view: CaseView,
  opts: { detectiveName: string; persistedBurned?: string[] },
): RunState {
  const kase = view.kase;
  const persisted = opts.persistedBurned ?? [];
  const cast = rollCast(kase, { persistedBurned: persisted });
  const tier = kase.shape?.tier;
  const base: RunState = {
    seed: kase.seed,
    difficulty: kase.difficulty,
    // M7: a tiered case records what it was dealt at, so a reload deals it again.
    ...(tier !== undefined && tier !== 'custom' && kase.ladder !== undefined
      ? { tier, level: kase.ladder.level }
      : {}),
    detectiveName: opts.detectiveName,
    // §B.2: the run starts at the office, at midnight.
    at: view.office.id,
    actionsUsed: 0,
    found: [],
    threads: [],
    burned: portraitCardIds(cast),
    log: [],
    met: [],
    accounts: [],
    selfTold: [],
    gossip: [],
    reportOpen: false,
    cast,
    freeAsked: [],
    waived: 0,
    volunteered: [],
    asideBands: [],
    portrayed: [],
    appearances: {},
    theory: null,
    lastSimile: null,
    previousMotifs: [],
    clientInOffice: true,
    clientAsks: 0,
    sceneSeen: false,
    asked: [],
    searched: [],
  };

  const clientClue = clientClueOf(view);
  const found = clientClue ? [clientClue.id] : [];
  const dealer = dealerFor(base, persisted);
  const composed = composePage(
    stageFor(base, view, dealer, {
      at: base.at,
      cost: 0,
      foundAfter: found,
      accountsAfter: [],
      persisted,
      clientHere: true,
    }),
    { kind: 'open', clientClue },
  );

  const here = peopleHereNow(view, base.at, { clientInOffice: true, found }).map((p) => p.id);
  const page: Page = {
    n: 0,
    head: view.placeById.get(base.at)?.shortName ?? kase.neighborhood,
    blocks: composed.blocks,
    cost: 0,
    cardsUsed: dealer.spent,
    found,
    at: base.at,
    gaps: composed.gaps,
    imageMotifs: composed.imageMotifs,
    plain: composed.plain,
    image: composed.image,
  };
  const state: RunState = {
    ...base,
    found,
    burned: [...base.burned, ...dealer.spent],
    met: mergeMet(view, base.met, found, here),
    threads: makeThreads(view, found),
    asideBands: composed.asideBand ? [composed.asideBand] : [],
    portrayed: composed.portrayed,
    appearances: countAppearances({}, composed.appeared),
    theory: composed.theory,
    lastSimile: composed.simileTarget,
    previousMotifs: composed.motifs,
    log: [page],
  };
  return state;
}

/** How many pages each person has been portrayed on, for §A.6's callback. */
function countAppearances(before: Record<Id, number>, appeared: Id[]): Record<Id, number> {
  const out = { ...before };
  for (const id of new Set(appeared)) out[id] = (out[id] ?? 0) + 1;
  return out;
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
    /** Whether the client is still in the office while this page happens. */
    clientHere?: boolean;
  },
): Stage {
  const used = state.actionsUsed + at.cost;
  const budget = gameBudget(view.kase);
  return {
    view,
    cast: state.cast,
    dealer,
    detectiveName: state.detectiveName,
    at: at.at,
    cost: at.cost,
    minutes: minutesAfter(used, budget),
    minutesBefore: minutesAfter(state.actionsUsed, budget),
    actionsLeft: actionsLeft(used, budget),
    foundBefore: state.found,
    foundAfter: at.foundAfter,
    accountsBefore: state.accounts,
    accountsAfter: at.accountsAfter,
    describedPlaces: describedPlaces(state),
    portrayed: state.portrayed,
    appearances: state.appearances,
    met: state.met,
    selfTold: state.selfTold,
    gossip: state.gossip,
    asideBands: state.asideBands,
    pageIndex: state.log.length,
    previousTheory: state.theory,
    lastSimile: state.lastSimile,
    previousMotifs: state.previousMotifs,
    showedOff: showedOff([...state.burned, ...at.persisted]),
    here: peopleHereNow(view, at.at, { clientInOffice: at.clientHere, found: at.foundAfter }),
    memory: state.scene ?? EMPTY_SCENE,
    visitedBefore: [...new Set(state.log.map((p) => p.at))],
    namedBefore: namedIn(view, state.log.flatMap(proseTexts)),
    ...(state.marks ? { marks: state.marks } : {}),
    ...(state.confronts ? { confronts: state.confronts } : {}),
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
  if (topic.kind === 'self') return [];
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
    // M9 (gen notes §13.1): a tiered case's evening is the account clue.
    const account = accountClueOf(view, personId);
    return account && !have.has(account.id) ? [account] : [];
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

/* ------------------------------------------------------------------ *
 * M6 §1.1 — what a command costs, before it is run.
 * ------------------------------------------------------------------ */

/** Why a command costs what it costs. `step` reads the reason; a button reads the number. */
export interface Price {
  cost: number;
  /**
   * Slack the clock never sees and par still counts: the client's two
   * questions on the house, and the free first ask of somebody who knows him.
   */
  waived: number;
  reason:
    | 'free'
    | 'still'
    | 'move'
    | 'search'
    | 'search-again'
    | 'ask'
    | 'ask-again'
    | 'house'
    | 'familiar'
    | 'self-told'
    | 'nobody'
    /** M9 §4: a question that would get nothing new is free, and says so. */
    | 'told'
    /** M9 §3: a fact put to somebody. */
    | 'confront'
    /** The same fact put to the same person again: free, read back. */
    | 'confront-again'
    /** Nothing of theirs to put it to yet, or not a fact in hand. Free. */
    | 'no-confront';
}

/** The key a question is remembered under: who, and the topic as the parser reads it. */
export function askKey(personId: Id, topic: TopicRef): string {
  return `${personId}|${topicKey(topic)}`;
}

/** Has this exact question been put before? */
export function askedBefore(state: RunState, personId: Id, topic: TopicRef): boolean {
  const key = askKey(personId, topic);
  return (state.asked ?? []).some((a) => a.key === key);
}

/**
 * The price of one command against one state. `step` charges exactly this and
 * the choice model prints exactly this, so a button never says one thing and
 * the clock another.
 */
export function priceOf(command: Command, state: RunState, view: CaseView): Price {
  switch (command.kind) {
    case 'look':
    case 'notebook':
    case 'help':
    case 'file':
      return { cost: 0, waived: 0, reason: 'free' };
    case 'go':
      return command.placeId === state.at
        ? { cost: 0, waived: 0, reason: 'still' }
        : { cost: 1, waived: 0, reason: 'move' };
    case 'examine':
      // §1.4: a room gives up everything it has to the first search, so the
      // second one finds nothing and costs what nothing costs.
      return (state.searched ?? []).includes(state.at)
        ? { cost: 0, waived: 0, reason: 'search-again' }
        : { cost: 1, waived: 0, reason: 'search' };
    case 'confront': {
      const here = peopleHereNow(view, state.at, {
        clientInOffice: state.clientInOffice,
        found: state.found,
      }).some((p) => p.id === command.personId);
      if (!here) return { cost: 0, waived: 0, reason: 'nobody' };
      if (!canConfront(view, state, command.personId) || !state.found.includes(command.clueId)) {
        return { cost: 0, waived: 0, reason: 'no-confront' };
      }
      if (
        (state.confronts ?? []).some(
          (r) => r.personId === command.personId && r.clueId === command.clueId && r.part === command.part,
        )
      ) {
        return { cost: 0, waived: 0, reason: 'confront-again' };
      }
      return { cost: 1, waived: 0, reason: 'confront' };
    }
    case 'ask': {
      const person = view.personById.get(command.personId);
      const here = peopleHereNow(view, state.at, {
        clientInOffice: state.clientInOffice,
        found: state.found,
      }).some((p) => p.id === command.personId);
      if (!person || !here) return { cost: 0, waived: 0, reason: 'nobody' };
      // M5 §3's own repeat, which predates §1.4 and keeps its own page.
      if (command.topic.kind === 'self' && state.selfTold.includes(person.id)) {
        return { cost: 0, waived: 0, reason: 'self-told' };
      }
      if (askedBefore(state, person.id, command.topic)) {
        return { cost: 0, waived: 0, reason: 'ask-again' };
      }
      // M9 §4: "An exhausted person says so." A question that would get
      // nothing new costs nothing: no more paying to find that out. The first
      // question about themselves always tells something, and so does the
      // client's own reason for hiring.
      if (
        view.kase.logic &&
        command.topic.kind !== 'self' &&
        command.topic.kind !== 'hire' &&
        answersTo(view, person.id, command.topic, state.found).length === 0
      ) {
        return { cost: 0, waived: 0, reason: 'told' };
      }
      const clientOnTheHouse =
        state.clientInOffice &&
        person.id === view.client.id &&
        state.at === view.office.id &&
        state.clientAsks < 2;
      if (clientOnTheHouse) return { cost: 0, waived: 1, reason: 'house' };
      if (knowsHim(state.cast.roll, person.id) && !state.freeAsked.includes(person.id)) {
        return { cost: 0, waived: 1, reason: 'familiar' };
      }
      return { cost: 1, waived: 0, reason: 'ask' };
    }
  }
}

/**
 * M6 §1.1. Actions a command will spend. A typed string is parsed exactly as
 * `stepInput` parses it, and a string the parser refuses costs nothing,
 * because a refused string is a free page.
 */
export function costOf(command: Command | string, state: RunState, view: CaseView): number {
  if (typeof command !== 'string') return priceOf(command, state, view).cost;
  const parsed = parseFor(state, command, view);
  return parsed.ok ? priceOf(parsed.command, state, view).cost : 0;
}

function parseFor(state: RunState, raw: string, view: CaseView): ReturnType<typeof parse> {
  return parse(
    view,
    state.at,
    raw,
    peopleHereNow(view, state.at, {
      clientInOffice: state.clientInOffice,
      found: state.found,
    }).map((p) => p.id),
    state.found,
  );
}

/**
 * §1.4. The page a repeated question or search writes: it says so, and reads
 * the notebook's record of the first answer back. Nothing is dealt, nothing is
 * found, and the clock does not move.
 */
function repeatBlocks(view: CaseView, state: RunState, command: Command): Block[] {
  const records = (ids: Id[]): Block[] =>
    ids
      .map((id) => view.findableById.get(id))
      .filter((c): c is Clue => c !== undefined)
      .map((c) => ({ kind: 'note', text: `“${c.textRecord ?? c.text}”` }) as Block);
  if (command.kind === 'examine') {
    const place = view.placeById.get(state.at)?.shortName ?? 'the room';
    const had = state.found.filter((id) => {
      const c = view.findableById.get(id);
      return c?.source.type === 'place' && c.source.placeId === state.at;
    });
    return [
      {
        kind: 'note',
        text:
          had.length > 0
            ? `I had been through ${place} already. What it gave up is in the notebook, and I read it back instead of going through it twice.`
            : `I had been through ${place} already. It gave up nothing then and would give up nothing now.`,
      },
      ...records(had),
    ];
  }
  if (command.kind !== 'ask') return [];
  const person = view.personById.get(command.personId);
  const surname = person?.surname ?? 'them';
  const key = askKey(command.personId, command.topic);
  const first = (state.asked ?? []).find((a) => a.key === key);
  const clues = first?.clues ?? [];
  const out: Block[] = [];
  if (command.topic.kind === 'evening' && state.accounts.includes(command.personId)) {
    out.push({
      kind: 'note',
      text: `I had asked ${surname} that already. The answer is in the notebook, and I read it back instead of asking twice.`,
    });
    const account = claimedAccount(view, command.personId);
    if (account) out.push({ kind: 'timeline', personId: command.personId, rows: account.rows });
    return out;
  }
  out.push({
    kind: 'note',
    text:
      clues.length > 0
        ? `I had asked ${surname} that already. The answer is in the notebook, and I read it back instead of asking twice.`
        : `I had asked ${surname} that already. It got nothing the first time, and asking again would get the same.`,
  });
  out.push(...records(clues));
  return out;
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
  const selfTold: Id[] = [];
  const gossip: Id[] = [];
  const freeAsked: Id[] = [];
  const volunteered: Id[] = [];
  let blocks: Block[] = [];
  let gaps: string[] = [];
  let asideBand: string | null = null;
  let portrayed: Id[] = [];
  let appeared: Id[] = [];
  let imageMotifs: string[][] = [];
  let plain = 0;
  let image = 0;
  let theory = state.theory;
  let lastSimile = state.lastSimile;
  let previousMotifs = state.previousMotifs;
  // §B.2.4: the client is in the office until he is asked twice or walked out
  // on, whichever comes first, and after that he is at his own address.
  let clientInOffice = state.clientInOffice;
  let clientAsks = state.clientAsks;
  let sceneSeen = state.sceneSeen;
  // §1.1: the price is decided once, before anything happens, by the same
  // function the buttons are labelled with.
  const price = priceOf(command, state, view);
  const asked: { key: string; clues: Id[] }[] = [];
  const searched: Id[] = [];
  let errand: ErrandTrace | undefined;
  let shape: PageShape | undefined;
  let beats: BeatTrace[] | undefined;
  let memory: SceneMemory | undefined;
  let confronted: ConfrontRecord | null = null;

  switch (command.kind) {
    case 'look':
      scene = { kind: 'look' };
      break;
    case 'go': {
      if (command.placeId === state.at) {
        scene = { kind: 'travel', to: state.at, already: true };
        break;
      }
      cost = price.cost;
      at = command.placeId;
      head = view.placeById.get(command.placeId)?.shortName ?? head;
      // The scene report and the coroner's note, on the first arrival, free.
      // M5 §6: at the start place, which is the scene for seven tropes out of
      // eight and the foot of the stairs for `body-moved`.
      const firstSight = at === view.startId && !state.sceneSeen;
      // M6 §2: why he came, derived from what the notebook held when he left.
      const plan = planErrand(view, state, command.placeId, firstSight);
      const opening = firstSight
        ? sceneCluesOf(view).filter((c) => !state.found.includes(c.id))
        : [];
      if (firstSight) sceneSeen = true;
      gained = opening.map((c) => c.id);
      // Walking out of the office ends the client's visit.
      const leaves = state.at === view.office.id && clientInOffice;
      if (leaves) clientInOffice = false;
      scene = {
        kind: 'travel',
        to: command.placeId,
        already: false,
        ...(opening.length > 0 ? { openingClues: opening } : {}),
        ...(leaves ? { clientLeaves: true } : {}),
        errand: plan,
      };
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
          text: 'I put a sheet of paper in the typewriter. Five questions, and the DA only reads the answers.',
        },
      ];
      break;
    case 'examine': {
      if (price.reason === 'search-again') {
        blocks = repeatBlocks(view, state, command);
        shape = 'repeat';
        break;
      }
      cost = price.cost;
      searched.push(state.at);
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
    case 'confront': {
      const person = view.personById.get(command.personId);
      if (!person || price.reason === 'nobody') {
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
      if (price.reason === 'no-confront') {
        blocks = [
          {
            kind: 'note',
            text: state.accounts.includes(person.id)
              ? `That was nothing I had written down.`
              : `${person.surname} had not told me ${possessiveOf(person)} evening yet. There was nothing of ${pronounObject(person)} to put anything to.`,
          },
        ];
        shape = 'repeat';
        break;
      }
      if (price.reason === 'confront-again') {
        const before = (state.confronts ?? []).find(
          (r) => r.personId === person.id && r.clueId === command.clueId && r.part === command.part,
        );
        blocks = [
          {
            kind: 'note',
            text: `I had put that to ${person.surname} already. What came of it is in the notebook, and I read it back instead of asking twice.`,
          },
          ...(before && before.outcome === 'wrong'
            ? [{ kind: 'note', text: '“That doesn’t touch anything I told you.”' } as Block]
            : []),
        ];
        shape = 'repeat';
        break;
      }
      const clue = view.findableById.get(command.clueId);
      if (!clue) break;
      cost = price.cost;
      const judged = judgeConfront(view, state, person.id, clue.id, command.part);
      confronted = {
        personId: person.id,
        clueId: clue.id,
        ...(command.part === undefined ? {} : { part: command.part }),
        lieKey: judged.lieKey,
        outcome: judged.outcome,
        ...(judged.n === undefined ? {} : { n: judged.n }),
        page: state.log.length,
      };
      scene = { kind: 'confront', personId: person.id, clue, judged, ...(command.part === undefined ? {} : { part: command.part }) };
      break;
    }
    case 'ask': {
      const person = view.personById.get(command.personId);
      const here = peopleHereNow(view, state.at, {
        clientInOffice: state.clientInOffice,
        found: state.found,
      }).some((p) => p.id === command.personId);
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
      // §1.4: the same question twice is read back out of the notebook, free.
      if (price.reason === 'ask-again') {
        blocks = repeatBlocks(view, state, command);
        shape = 'repeat';
        break;
      }
      // M9 §4: a question that would get nothing new. Free, and they say so.
      if (price.reason === 'told') {
        blocks = [{ kind: 'note', text: `${person.surname} shook ${possessiveOf(person)} head. “I’ve told you what I know.”` }];
        shape = 'repeat';
        asked.push({ key: askKey(person.id, command.topic), clues: [] });
        break;
      }
      cost = price.cost;
      // §B.2.4: while the client is in the office, his first two questions are
      // free. A man hiring you answers your questions. Like the free first ask
      // this is slack handed to the player and never a shorter route, so it is
      // counted as waived and par's accounting does not move.
      const clientOnTheHouse = price.reason === 'house';
      if (clientOnTheHouse) {
        waived = 1;
        clientAsks += 1;
        if (clientAsks >= 2) clientInOffice = false;
      } else if (price.reason === 'familiar') {
        // The free first ask. Unearned slack, and it should feel like luck.
        waived = 1;
        freeAsked.push(person.id);
      }
      // M9: a tiered case's evening is a clue (answered below); the old
      // pseudo-account from the schedule is the no-options case's alone.
      const account =
        command.topic.kind === 'evening' && !view.kase.logic ? claimedAccount(view, person.id) : null;
      if (account) accounts.push(person.id);
      // §3: `ask X about themselves`. A pseudo-clue like "that evening":
      // always available, one action, and free the second time because the
      // second time gets nothing. Free means free — it is not waived slack,
      // because there is no route through it and par never counted it.
      const askedSelf = command.topic.kind === 'self';
      const toldAlready = askedSelf && state.selfTold.includes(person.id);
      let told: { personId: Id; text: string } | null = null;
      if (askedSelf) {
        if (toldAlready) {
          // priceOf already said 'self-told': free, and not waived slack.
          waived = 0;
          freeAsked.length = 0;
        } else {
          selfTold.push(person.id);
          // §3: a yapper gives up the account and then a fact about somebody
          // else. It goes in the notebook under that somebody, which is where
          // a fact about them belongs.
          if (temperOf(state.cast, person.id) === 'yap') {
            told = gossipTarget(view, person.id, {
              found: state.found,
              met: state.met,
              selfTold: state.selfTold,
              gossip: state.gossip,
            });
            if (told) gossip.push(told.personId);
          }
        }
      }
      const answers =
        (command.topic.kind === 'evening' && !view.kase.logic) || askedSelf
          ? []
          : answersTo(view, command.personId, command.topic, state.found);
      gained = answers.map((c) => c.id);
      for (const c of answers) {
        if (c.kind === 'account' && c.source.type === 'person') accounts.push(c.source.personId);
      }
      asked.push({ key: askKey(person.id, command.topic), clues: gained });
      const volunteer =
        answers.length > 0 || account || (askedSelf && !toldAlready)
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
        topicRef: topicRefOf(command.topic),
        ...(askedSelf
          ? {
              self: {
                told: toldAlready,
                lines: selfAccountFor(person, temperOf(state.cast, person.id)),
                ...(told === null ? {} : { gossip: told }),
              },
            }
          : {}),
        ...(clientOnTheHouse && !clientInOffice ? { clientLeaves: true } : {}),
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
        // The client is on the page he leaves on, and gone from the next one.
        clientHere: state.clientInOffice,
      }),
      scene,
    );
    blocks = composed.blocks;
    gaps = composed.gaps;
    if (composed.errand) errand = composed.errand;
    if (composed.shape) shape = composed.shape;
    if (composed.beats) beats = composed.beats;
    if (composed.memory) memory = composed.memory;
    asideBand = composed.asideBand;
    portrayed = composed.portrayed;
    appeared = composed.appeared;
    theory = composed.theory;
    // A page with no simile keeps the last one, so the page after it still
    // has something to avoid.
    lastSimile = composed.simileTarget ?? state.lastSimile;
    previousMotifs = composed.motifs;
    imageMotifs = composed.imageMotifs;
    plain = composed.plain;
    image = composed.image;
  }

  const actionsUsed = state.actionsUsed + cost;
  const overNow = isOver(actionsUsed, gameBudget(kase));
  if (cost > 0 && overNow && !state.reportOpen) {
    blocks.push({ kind: 'note', text: DA_AT_THE_DOOR });
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
      peopleHereNow(view, at, { clientInOffice, found }).map((p) => p.id),
    ),
    accounts: accountsAfter,
    selfTold: [...new Set([...state.selfTold, ...selfTold])],
    gossip: [...state.gossip, ...gossip],
    threads: makeThreads(view, found),
    reportOpen: state.reportOpen || overNow || command.kind === 'file',
    freeAsked: [...state.freeAsked, ...freeAsked],
    waived: state.waived + waived,
    volunteered: [...state.volunteered, ...volunteered],
    asideBands: asideBand ? [...state.asideBands, asideBand] : state.asideBands,
    portrayed: [...new Set([...state.portrayed, ...portrayed])],
    appearances: countAppearances(state.appearances, appeared),
    theory,
    lastSimile,
    previousMotifs,
    clientInOffice,
    clientAsks,
    sceneSeen,
    asked: [...(state.asked ?? []), ...asked],
    searched: [...new Set([...(state.searched ?? []), ...searched])],
    ...(confronted ? { confronts: [...(state.confronts ?? []), confronted] } : {}),
    ...(memory ? { scene: memory } : state.scene ? { scene: state.scene } : {}),
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
    imageMotifs,
    plain,
    image,
    ...(errand === undefined ? {} : { errand }),
    ...(shape === undefined ? {} : { shape }),
    ...(beats === undefined ? {} : { beats }),
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

/** M8: the topic as plain data, for the planner. */
function topicRefOf(topic: TopicRef): { kind: string; id?: Id; topic?: string } {
  switch (topic.kind) {
    case 'person':
    case 'place':
    case 'object':
    case 'anchor':
      return { kind: topic.kind, id: topic.id };
    case 'exact':
      return { kind: 'exact', topic: topic.topic };
    default:
      return { kind: topic.kind };
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
    case 'self':
      return 'themselves';
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
  const result = parseFor(state, raw, view);
  if (result.ok) return step(state, result.command, view, persistedBurned);

  const problem = result.problem;
  const dealer = dealerFor(state, persistedBurned);
  const blocks: Block[] = [];
  let gaps: string[] = [];
  let composedMotifs: string[][] = [];
  let composedPlain = 0;
  let composedImage = 0;
  if (problem.kind === 'absent-person' || problem.kind === 'unknown-topic') {
    const person = problem.personId ? view.personById.get(problem.personId) : undefined;
    const composed = composePage(
      stageFor(state, view, dealer, {
        at: state.at,
        cost: 0,
        foundAfter: state.found,
        accountsAfter: state.accounts,
        persisted: persistedBurned,
        clientHere: state.clientInOffice,
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
    composedMotifs = composed.imageMotifs;
    composedPlain = composed.plain;
    composedImage = composed.image;
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
    imageMotifs: composedMotifs,
    plain: composedPlain,
    image: composedImage,
  };
  const next: RunState = {
    ...state,
    burned: [...state.burned, ...dealer.spent],
    log: [...state.log, page],
  };
  return { state: next, page };
}

function pronounObject(person: { gender?: string } & Parameters<typeof possessiveOf>[0]): string {
  return possessiveOf(person) === 'her' ? 'her' : 'him';
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
