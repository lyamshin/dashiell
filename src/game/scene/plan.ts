/**
 * M8 §1 — the page is planned before it is written.
 *
 * Every page after the office is laid out here as an ordered list of beats,
 * each with the data it needs, before a single card is dealt. Prose
 * realization (`realize.ts`) then renders each beat. The planner is pure: it
 * reads the action, the notebook before and after, the case and the scene's
 * memory, and returns the beats and the memory the next page will have. The
 * tests assert beats, not sentences.
 *
 *   go, first visit   clock?, errand, establish, presence, finds, thought?, bridge?, answer
 *   go, return        clock?, errand, return, presence, answer?
 *   search            clock?, errand (carry), act, finds, thought, bridge?, answer
 *   ask               clock?, errand (carry, unless the question carries it),
 *                     exchange, finds, thought, bridge?, answer?
 *   look              return (or establish), presence
 *
 * `answer` is required wherever the table has it without a question mark, and
 * a thought that closes the page answers it (§2): the answer beat is planned
 * only on a page with no thought.
 */

import type { Clue, Id, Person, Precinct, Tick } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { threadsFor } from '../derive.js';
import { openerOf, type ErrandPlan } from '../errand.js';
import type { Activity, BeatKind, PageShape, SceneMemory } from '../types.js';
import { EMPTY_SCENE } from '../types.js';
import { DECKS, fill, motifsOf, tagIs, tagOf, type Card } from '../voice/cards.js';
import { NO_CONTEXT, scoreMotifs } from '../voice/motifs.js';
import type { Weather } from '../voice/roll.js';
import { planBridge, subjectOfTopic, type BridgePlan } from './bridge.js';
import { bandOf, hourAgrees } from './text.js';
import { thoughtsFor, viewOf, type Thought } from './thought.js';

/* ------------------------------------------------------------------ *
 * The beats.
 * ------------------------------------------------------------------ */

export type CarryFor =
  | 'ask-person'
  | 'ask-thing'
  | 'ask-place'
  | 'ask-evening'
  | 'ask-self'
  | 'search-room'
  | 'search-thing';

export interface CarryPlan {
  for: CarryFor;
  lead: boolean;
  /** The clue in the notebook that sent him, when a lead did. */
  sourceId?: Id;
  /** The lead's target, when a lead did. */
  targetId?: Id;
  slots: { who?: string; subject?: string; name?: string };
}

export interface PresencePerson {
  personId: Id;
  activity: Activity;
  /** Not met before this page: name, sex, rough age and why they matter. */
  firstSight: boolean;
  /** Use their recall phrase on this page (once a visit, never an epithet). */
  recall: boolean;
  /**
   * Night Hone 1 §3: somebody the case has given no reason to single out yet,
   * said together with the others like them in one sentence.
   */
  grouped?: boolean;
  /** Why they matter, when they do: the reason their first sight gives. */
  why?: 'watcher' | 'client' | 'known' | 'lead';
}

/** Who the detective does about a catch, and how (Night Hone 1 §5). */
export type DecideAct = 'hold' | 'press' | 'note';

export type SceneMark = 'body' | 'body-again' | 'robbery' | 'missing';

export type Beat =
  | { kind: 'clock'; required: true; beat: 'hour' | 'two-left' | 'last-call'; hour?: string }
  | { kind: 'errand'; required: true; form: 'move' | 'short'; plan: ErrandPlan }
  | { kind: 'errand'; required: true; form: 'carry'; carry: CarryPlan }
  | {
      kind: 'establish';
      required: true;
      placeId: Id;
      watcherId?: Id;
      ownerId?: Id;
      precinct?: Precinct;
    }
  | { kind: 'return'; required: true; placeId: Id; placeKind: 'public' | 'semi' | 'private' | 'scene' }
  | { kind: 'presence'; required: true; scene?: SceneMark; people: PresencePerson[] }
  | { kind: 'act'; required: true; objectId?: Id; left: Id[] }
  | { kind: 'find'; required: true; clueId: Id }
  | {
      kind: 'exchange';
      required: true;
      personId: Id;
      /** The question carries its own reason (§2), and names the lead's subject with its tie. */
      carried: boolean;
      subjectId?: Id;
      clueIds: Id[];
      account: boolean;
      self: boolean;
      volunteerId?: Id;
      /** The first question to them this visit: they stop what they are doing. */
      stops: boolean;
      /** Their recall action is this page's one piece of business (once a visit). */
      recall: boolean;
    }
  | { kind: 'thought'; required: true; thought: Thought }
  | {
      kind: 'decide';
      required: true;
      /** The one a thought just caught out. */
      personId: Id;
      who: 'client' | 'watcher' | 'suspect';
      act: DecideAct;
      /** In the room with him. */
      present: boolean;
      placeId?: Id;
      tick?: Tick;
    }
  | { kind: 'bridge'; required: true; bridge: BridgePlan }
  | {
      kind: 'answer';
      required: true;
      outcome: 'found' | 'dead-end' | 'something-else';
      targetId?: Id;
      subject?: string;
      name?: string;
    }
  | { kind: 'texture'; required: false; texture: 'weather' | 'ambient' | 'simile' | 'place' };

export interface Plan {
  shape: PageShape;
  beats: Beat[];
  /** The scene's memory once this page is read. */
  memory: SceneMemory;
}

/** What happened, as the planner needs it. A subset of the reducer's `Scene`. */
export type PlanAction =
  | { kind: 'travel'; to: Id; already: boolean; openingClues?: Clue[]; errand?: ErrandPlan }
  | { kind: 'look' }
  | { kind: 'examine'; placeId: Id; objectId?: Id; clues: Clue[] }
  | {
      kind: 'ask';
      personId: Id;
      topic: { kind: string; id?: Id; topic?: string };
      clues: Clue[];
      account: boolean;
      self: boolean;
      volunteer: Clue | null;
    };

export interface PlanInput {
  view: CaseView;
  action: PlanAction;
  /** Where the page happens, after any walk. */
  at: Id;
  minutes: number;
  minutesBefore?: number;
  actionsLeft: number;
  cost: number;
  foundBefore: readonly Id[];
  foundAfter: readonly Id[];
  accountsBefore: readonly Id[];
  accountsAfter: readonly Id[];
  /** People met before this page. */
  met: readonly Id[];
  /** Who is in the room. */
  here: readonly Person[];
  /** Rooms with a page before this one. */
  visitedBefore: readonly Id[];
  memory?: SceneMemory;
  /** The run's seed, for the choices the planner makes without a dealer. */
  seed: number;
  /** The night's sky, so no activity contradicts it. */
  weather?: string;
  /** People whose portrait has a recall action (§4); nobody else is recalled. */
  recallable?: readonly Id[];
  /** Night Hone 1 §5: each person's temper, for what the detective does about a catch. */
  tempers?: Readonly<Record<Id, string>>;
}

/** Which beats each shape must carry (§10's coverage check reads this). */
export const REQUIRED: Record<PageShape, BeatKind[]> = {
  office: [],
  arrive: ['errand', 'establish', 'presence'],
  return: ['errand', 'return', 'presence'],
  search: ['errand', 'act', 'thought'],
  ask: ['exchange', 'thought'],
  look: ['presence'],
  repeat: [],
  other: [],
};

/* ------------------------------------------------------------------ *
 * The clock (M6 §3), as a beat.
 * ------------------------------------------------------------------ */

const HOUR_WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

function clockBeat(input: PlanInput): Beat | null {
  if (input.cost <= 0) return null;
  if (input.actionsLeft === 1) return { kind: 'clock', required: true, beat: 'last-call' };
  if (input.actionsLeft === 2) return { kind: 'clock', required: true, beat: 'two-left' };
  if (input.minutesBefore === undefined) return null;
  const from = Math.floor(input.minutesBefore / 60);
  const to = Math.floor(input.minutes / 60);
  if (to > from && to >= 1 && to <= 7) {
    return { kind: 'clock', required: true, beat: 'hour', hour: HOUR_WORDS[to] as string };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * §4 — activities, chosen once a visit.
 * ------------------------------------------------------------------ */

function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x9e3779b9;
  }
  return h >>> 0;
}

/**
 * Where a suspect's trade is carried on, by archetype and place template. The
 * activity deck's `at: work` cards are trade tasks, dealt only here (§4: the
 * activity comes from the trade, the place and the hour together).
 */
export const WORKPLACES: Record<string, string[]> = {
  'arch-pawnman': ['pawnshop'],
  'arch-bouncer': ['dolans-bar', 'speakeasy', 'dance-hall', 'pool-hall'],
  'arch-hackman': ['cab-stand'],
  'arch-chambermaid': ['hotel-lobby', 'res-suite', 'rooming-house-room', 'boarding-parlor'],
  'arch-longshoreman': ['pier-shed', 'ferry-slip'],
  'arch-bookmaker': ['pool-hall', 'dolans-bar', 'speakeasy'],
  'arch-runner': ['pool-hall', 'corner-newsstand'],
  'arch-chorus': ['dance-hall', 'movie-house'],
  'arch-stagehand': ['movie-house', 'dance-hall'],
  'arch-nightman': ['hotel-lobby', 'hotel-garage', 'hallam-vestibule'],
  'arch-switchboard': ['hotel-lobby', 'hallam-vestibule'],
  'arch-tailor': ['office-over-tailor'],
  'arch-seamstress': ['office-over-tailor', 'laundry-yard'],
  'arch-heeler': ['union-hall'],
  'arch-secretary': ['office-over-tailor'],
  'arch-lawyer': ['office-over-tailor'],
  'arch-broker': ['office-over-tailor'],
  'arch-bookkeeper': ['office-over-tailor', 'union-hall'],
  'arch-adjuster': ['office-over-tailor'],
  'arch-dentist': ['office-over-tailor'],
  'arch-nurse': ['drugstore'],
  'arch-reporter': ['corner-newsstand'],
  'arch-piano-teacher': ['boarding-parlor'],
  'arch-blockowner': ['office-over-tailor'],
  'arch-society': [],
  'arch-heir': [],
  'arch-widow': [],
};

/** The activity-deck role for a person: fixture role, else archetype, else `any`. */
export function activityRole(person: Person): string {
  if (person.kind === 'fixture' && person.fixtureRole) return person.fixtureRole;
  return person.archetypeId ?? 'any';
}

/**
 * One activity for one person, from their trade, the place and the hour.
 * Deterministic in the run's seed, the person and the visit, so it is the same
 * whichever page asks and a test can check it without a dealer.
 */
export function chooseActivity(
  view: CaseView,
  person: Person,
  placeId: Id,
  minutes: number,
  visit: number,
  seed: number,
  weather?: string,
  /** Cards somebody else in the room is already doing. */
  taken: ReadonlySet<string> = new Set(),
): Activity {
  const place = view.placeById.get(placeId);
  const kind = place?.kind ?? 'semi';
  const band = bandOf(minutes);
  const role = activityRole(person);
  const roleIs = (c: Card, want: string): boolean => tagOf('activity', c, 'role') === want;
  const sky = weather === undefined ? null : NO_CONTEXT(weather as Weather);
  const fits = (c: Card): boolean =>
    hourAgrees(c.text, minutes) &&
    tagIs('activity', c, 'band', band) &&
    (sky === null || scoreMotifs(motifsOf(c), c, sky) !== -Infinity);
  // A trade task only where the person works: a pawnbroker's clerk sorts
  // tickets at the pawnshop, and at a speakeasy has a coffee like anybody.
  const atWork = (WORKPLACES[person.archetypeId ?? ''] ?? []).includes(placeId);
  const may = (c: Card): boolean => atWork || tagOf('activity', c, 'at') !== 'work';
  const ladder: ((c: Card) => boolean)[] = [
    (c) => may(c) && roleIs(c, role) && tagIs('activity', c, 'placeKind', kind) && tagOf('activity', c, 'band') === band,
    (c) => may(c) && roleIs(c, role) && tagIs('activity', c, 'placeKind', kind),
    (c) => roleIs(c, 'any') && tagOf('activity', c, 'placeKind') === kind,
    (c) => may(c) && roleIs(c, role),
    (c) => roleIs(c, 'any') && tagIs('activity', c, 'placeKind', kind),
  ];
  const slots = { name: person.surname, place: place?.shortName };
  for (const rung of ladder) {
    const pool = DECKS.activity.filter((c) => rung(c) && fits(c) && !taken.has(c.id));
    if (pool.length === 0) continue;
    const start = hash(seed, person.id, visit, placeId) % pool.length;
    for (let i = 0; i < pool.length; i++) {
      const card = pool[(start + i) % pool.length] as Card;
      const text = fill(card, slots);
      if (text !== null) return { visit, placeId, cardId: card.id, text, stopped: false };
    }
  }
  return { visit, placeId, cardId: '', text: `${person.surname} was there.`, stopped: false };
}

/* ------------------------------------------------------------------ *
 * §2 — the carry line for a search or a question at the same place.
 * ------------------------------------------------------------------ */

function carryForSearch(input: PlanInput, objectId: Id | undefined): CarryPlan {
  const { view } = input;
  const open = threadsFor(view, [...input.foundBefore]).filter((t) => {
    const c = view.findableById.get(t.clueId);
    return c?.source.type === 'place' && c.place === input.at;
  });
  const object = objectId ? view.objectById.get(objectId)?.name : undefined;
  const base: CarryPlan = {
    for: objectId ? 'search-thing' : 'search-room',
    lead: false,
    slots: object ? { subject: object } : {},
  };
  // The newest opener among the leads that point at this room.
  let best: { source: Clue; target: Id; at: number } | null = null;
  for (const t of open) {
    const opener = openerOf(view, input.foundBefore, t.clueId);
    if (opener && (best === null || opener.at > best.at)) best = { source: opener.clue, target: t.clueId, at: opener.at };
  }
  if (!best) return base;
  const name =
    best.source.source.type === 'person' ? view.personById.get(best.source.source.personId)?.surname : undefined;
  return {
    ...base,
    lead: true,
    sourceId: best.source.id,
    targetId: best.target,
    slots: { ...base.slots, ...(name ? { name } : {}) },
  };
}

function carryForAsk(
  input: PlanInput,
  action: Extract<PlanAction, { kind: 'ask' }>,
): { carry: CarryPlan; subjectId?: Id } {
  const { view } = input;
  const asked = view.personById.get(action.personId);
  const who = asked?.surname ?? '';
  const t = action.topic;
  let forWhat: CarryFor = 'ask-thing';
  let subject = '';
  let subjectId: Id | undefined;
  switch (t.kind) {
    case 'self':
      forWhat = 'ask-self';
      subject = who;
      break;
    case 'evening':
      forWhat = 'ask-evening';
      subject = who;
      break;
    case 'person':
      subjectId = t.id;
      subject = view.personById.get(t.id ?? '')?.surname ?? '';
      forWhat = t.id === action.personId ? 'ask-evening' : 'ask-person';
      break;
    case 'place':
      forWhat = 'ask-place';
      subject = view.placeById.get(t.id ?? '')?.shortName ?? '';
      break;
    case 'object':
      forWhat = 'ask-thing';
      subject = view.objectById.get(t.id ?? '')?.name ?? '';
      break;
    case 'anchor':
      forWhat = 'ask-thing';
      subject = view.anchorById.get(t.id ?? '')?.name ?? '';
      break;
    case 'hire':
      forWhat = 'ask-thing';
      subject = 'why I was hired';
      break;
    default: {
      const topic = t.topic ?? '';
      const named = subjectOfTopic(view, topic);
      if (named !== null && named !== action.personId) {
        forWhat = 'ask-person';
        subjectId = named;
        subject = view.personById.get(named)?.surname ?? topic;
      } else if (named !== null || /evening|account/i.test(topic)) {
        forWhat = 'ask-evening';
        subject = who;
      } else {
        const place = view.places.find((p) => topic.toLowerCase().includes(p.shortName.toLowerCase()));
        forWhat = place ? 'ask-place' : 'ask-thing';
        subject = place?.shortName ?? topic;
      }
    }
  }
  // A lead: one of the answers was an open lead's target.
  const open = new Set(threadsFor(view, [...input.foundBefore]).map((x) => x.clueId));
  const target = action.clues.find((c) => open.has(c.id));
  const carry: CarryPlan = { for: forWhat, lead: false, slots: { who, ...(subject ? { subject } : {}) } };
  if (target) {
    const opener = openerOf(view, input.foundBefore, target.id);
    carry.lead = true;
    carry.targetId = target.id;
    if (opener) {
      carry.sourceId = opener.clue.id;
      if (opener.clue.source.type === 'person') {
        const name = view.personById.get(opener.clue.source.personId)?.surname;
        if (name) carry.slots.name = name;
      }
    }
  }
  return { carry, ...(subjectId === undefined ? {} : { subjectId }) };
}

/* ------------------------------------------------------------------ *
 * §2 — the answer.
 * ------------------------------------------------------------------ */

function answerFor(
  target: Id | undefined,
  found: readonly Id[],
  reachable: boolean,
  subject: string | undefined,
  name: string | undefined,
): Extract<Beat, { kind: 'answer' }> {
  const outcome: 'found' | 'dead-end' | 'something-else' =
    target !== undefined && (found.includes(target) || reachable)
      ? 'found'
      : found.length > 0
        ? 'something-else'
        : 'dead-end';
  return {
    kind: 'answer',
    required: true,
    outcome,
    ...(target === undefined ? {} : { targetId: target }),
    ...(subject ? { subject } : {}),
    ...(name ? { name } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * The planner.
 * ------------------------------------------------------------------ */

function sceneMark(view: CaseView, at: Id, again: boolean): SceneMark | undefined {
  if (at !== view.startId) return undefined;
  switch (view.kase.act.type) {
    case 'murder':
      return again ? 'body-again' : 'body';
    case 'robbery':
      return view.kase.act.taken ? 'robbery' : undefined;
    case 'missing':
      return 'missing';
  }
}

/**
 * People the notebook knows before this page: whoever a clue in hand came
 * from, names or places, and whoever has given an account.
 */
export function notebookKnows(view: CaseView, found: readonly Id[], accounts: readonly Id[]): Set<Id> {
  const out = new Set<Id>(accounts);
  for (const id of found) {
    const clue = view.findableById.get(id);
    if (!clue) continue;
    if (clue.source.type === 'person') out.add(clue.source.personId);
    for (const f of clue.establishes) if ('personId' in f) out.add(f.personId);
    for (const p of view.kase.people) {
      if (new RegExp(`\\b${p.surname}\\b`).test(clue.text)) out.add(p.id);
    }
  }
  return out;
}

/**
 * People a lead the page has put in front of the reader points at: the lead
 * that sent him here, and the leads a bridge has named — the one to ask, and
 * whoever the question is about. Not every open lead in the notebook: a room
 * where half the notebook can be asked something is still a crowd.
 */
export function leadPointsAt(view: CaseView, found: readonly Id[], named: readonly Id[]): Set<Id> {
  const out = new Set<Id>();
  const open = new Set(threadsFor(view, [...found]).map((t) => t.clueId));
  for (const id of named) {
    const clue = view.findableById.get(id);
    if (!clue || !open.has(id) || clue.source.type !== 'person') continue;
    out.add(clue.source.personId);
    const about = subjectOfTopic(view, clue.source.topic);
    if (about !== null) out.add(about);
  }
  return out;
}

/** Presence for everyone in the room, activities kept for the visit. */
function presenceFor(input: PlanInput, memory: SceneMemory, again: boolean): {
  beat: Extract<Beat, { kind: 'presence' }>;
  memory: SceneMemory;
} {
  const { view } = input;
  const activities = { ...memory.activities };
  const recalled = { ...memory.recalled };
  const people: PresencePerson[] = [];
  // The one who watches the room first (golden page 4), then whoever is new,
  // then whoever the notebook already has.
  const place = view.placeById.get(input.at);
  const order = (p: Person): number =>
    p.kind === 'fixture' && place?.watcher !== undefined && p.fixtureRole === place.watcher
      ? 0
      : input.met.includes(p.id)
        ? 2
        : 1;
  const present = [...input.here].sort((a, b) => order(a) - order(b));
  // Night Hone 1 §3: the watcher, the client, anybody the notebook knows and
  // anybody a lead points at get a line of their own; the rest of a crowded
  // room is said together, once there are two or more of them.
  const known = notebookKnows(view, input.foundBefore, input.accountsBefore);
  // The leads that point into this room: the one to ask is here, or a bridge
  // named them.
  const errandTarget = input.action.kind === 'travel' ? input.action.errand?.targetId : undefined;
  const pointed = leadPointsAt(view, input.foundBefore, [...memory.bridged, ...(errandTarget ? [errandTarget] : [])]);
  const whyOf = (p: Person): PresencePerson['why'] =>
    p.kind === 'fixture' && place?.watcher !== undefined && p.fixtureRole === place.watcher
      ? 'watcher'
      : p.id === view.client.id
        ? 'client'
        : pointed.has(p.id)
          ? 'lead'
          : known.has(p.id)
            ? 'known'
            : undefined;
  const loose = present.filter((p) => whyOf(p) === undefined);
  const grouping = loose.length >= 2;
  const taken = new Set<string>();
  for (const person of present) {
    const kept = activities[person.id];
    const activity =
      kept !== undefined && kept.visit === memory.visit && kept.placeId === input.at
        ? kept
        : chooseActivity(view, person, input.at, input.minutes, memory.visit, input.seed, input.weather, taken);
    taken.add(activity.cardId);
    activities[person.id] = activity;
    const firstSight = !input.met.includes(person.id);
    // A recall phrase, once a visit, for somebody already portrayed.
    const recall =
      !firstSight && recalled[person.id] !== memory.visit && (input.recallable ?? []).includes(person.id);
    const why = whyOf(person);
    const grouped = grouping && why === undefined;
    if (recall && !grouped) recalled[person.id] = memory.visit;
    people.push({
      personId: person.id,
      activity,
      firstSight,
      recall: recall && !grouped,
      ...(grouped ? { grouped: true } : {}),
      ...(why ? { why } : {}),
    });
  }
  const mark = sceneMark(view, input.at, again);
  return {
    beat: { kind: 'presence', required: true, ...(mark ? { scene: mark } : {}), people },
    memory: { ...memory, activities, recalled },
  };
}

export function planPage(input: PlanInput): Plan {
  const { view, action } = input;
  let memory: SceneMemory = structuredClone(input.memory ?? EMPTY_SCENE);
  const beats: Beat[] = [];
  const clock = clockBeat(input);
  const newIds = input.foundAfter.filter((id) => !input.foundBefore.includes(id));
  const newClues = newIds.map((id) => view.findableById.get(id)).filter((c): c is Clue => c !== undefined);
  const thoughtInput = {
    view,
    newClues,
    foundBefore: input.foundBefore,
    foundAfter: input.foundAfter,
    accountsBefore: input.accountsBefore,
    accountsAfter: input.accountsAfter,
  };
  const addBridge = (opts: { scenesOpening?: boolean; decided?: boolean } = {}): void => {
    const bridge = planBridge(view, newClues, input.foundAfter, input.accountsAfter, input.at, opts);
    // Golden page 5 ends on its decision; a lead into somebody's secret can
    // wait for the notebook's list.
    if (bridge && opts.decided && view.findableById.get(bridge.targetId)?.role === 'noise') return;
    if (bridge) {
      beats.push({ kind: 'bridge', required: true, bridge });
      memory = { ...memory, bridged: [...memory.bridged, bridge.targetId] };
    }
  };
  /**
   * Night Hone 1 §5: after a thought catches somebody — seen somewhere they
   * never mentioned, or contradicted — what the detective does about it now,
   * from who they are and their temper. Golden page 5's last paragraph.
   */
  const addDecide = (): boolean => {
    const thoughts = beats.flatMap((b) => (b.kind === 'thought' ? [b.thought] : []));
    const rider = thoughts.find((t) => t.cls === 'unmentioned' && t.sourceId !== undefined);
    const contra = thoughts.find((t) => t.cls === 'contradicts' && t.subjectId !== undefined);
    const caught = rider
      ? { id: rider.sourceId as Id, placeId: rider.placeId, tick: rider.tick }
      : contra
        ? { id: contra.subjectId as Id, placeId: contra.placeId, tick: contra.tick }
        : null;
    if (caught === null) return false;
    const person = view.personById.get(caught.id);
    if (!person || person.id === view.victim.id) return false;
    const post = view.placeById.get(person.foundAt ?? '');
    const who: 'client' | 'watcher' | 'suspect' =
      person.id === view.client.id
        ? 'client'
        : person.kind === 'fixture' && post?.watcher !== undefined && person.fixtureRole === post.watcher
          ? 'watcher'
          : 'suspect';
    const temper = input.tempers?.[person.id] ?? 'plain';
    // A client is still a client; a watcher is marked and kept; a suspect who
    // talks is pressed, one who gives nothing away is waited out, and a plain
    // one is marked down and come back to.
    const act: DecideAct =
      who === 'client' ? 'hold' : who === 'watcher' ? 'note' : temper === 'yap' ? 'press' : temper === 'enigma' ? 'hold' : 'note';
    const present =
      input.here.some((p) => p.id === person.id) || (action.kind === 'ask' && action.personId === person.id);
    beats.push({
      kind: 'decide',
      required: true,
      personId: person.id,
      who,
      act,
      present,
      ...(caught.placeId === undefined ? {} : { placeId: caught.placeId }),
      ...(caught.tick === undefined ? {} : { tick: caught.tick }),
    });
    return true;
  };
  /** The room's texture, once a visit (Night Hone 1 §1): never the same card twice in a night. */
  const addPlace = (): void => {
    if (memory.ambient === memory.visit) return;
    memory = { ...memory, ambient: memory.visit };
    beats.push({ kind: 'texture', required: false, texture: 'place' });
  };
  const addThoughts = (thoughts: Thought[]): void => {
    for (const thought of thoughts) {
      // "Nothing" is said about something: the room gone through, or the
      // person who had nothing to give.
      const located: Thought =
        thought.cls !== 'nothing'
          ? thought
          : action.kind === 'ask'
            ? { ...thought, subjectId: action.personId }
            : { ...thought, placeId: input.at };
      beats.push({ kind: 'thought', required: true, thought: located });
    }
  };

  /* ---------------------------------------------------------- go, look */
  if (action.kind === 'travel' || action.kind === 'look') {
    const moved = action.kind === 'travel' && !action.already;
    if (moved) memory = { ...memory, visit: memory.visit + 1 };
    const first = moved && !input.visitedBefore.includes(input.at) && !memory.established.includes(input.at);
    const shape: PageShape = !moved ? 'look' : first ? 'arrive' : 'return';
    if (clock) beats.push(clock);
    if (moved && action.kind === 'travel' && action.errand) {
      const short = action.errand.targetId !== undefined && memory.bridged.includes(action.errand.targetId);
      beats.push({ kind: 'errand', required: true, form: short ? 'short' : 'move', plan: action.errand });
    }
    const place = view.placeById.get(input.at);
    const establish = first || (!moved && !memory.established.includes(input.at) && !input.visitedBefore.includes(input.at));
    if (establish) {
      const watcher = place?.watcher
        ? input.here.find((p) => p.kind === 'fixture' && p.fixtureRole === place.watcher)
        : undefined;
      const precinct =
        input.at === view.startId && action.kind === 'travel' && (action.openingClues?.length ?? 0) > 0
          ? view.kase.victimBio.discovery?.precinct
          : undefined;
      beats.push({
        kind: 'establish',
        required: true,
        placeId: input.at,
        ...(watcher ? { watcherId: watcher.id } : {}),
        ...(place?.isResidence ? { ownerId: view.victim.id } : {}),
        ...(precinct ? { precinct } : {}),
      });
      beats.push({ kind: 'texture', required: false, texture: 'weather' });
      memory = { ...memory, established: [...memory.established, input.at] };
    } else {
      beats.push({
        kind: 'return',
        required: true,
        placeId: input.at,
        placeKind: input.at === view.startId ? 'scene' : (place?.kind ?? 'semi'),
      });
      if (moved) addPlace();
    }
    const presence = presenceFor(input, memory, !first);
    memory = presence.memory;
    beats.push(presence.beat);

    const opening = action.kind === 'travel' ? (action.openingClues ?? []) : [];
    for (const clue of opening) beats.push({ kind: 'find', required: true, clueId: clue.id });
    // The thought on arrival: what the opening finds mean, then the
    // detective's view of whoever is here (§4), newcomers first.
    if (opening.length > 0) addThoughts(thoughtsFor(thoughtInput));
    if (first || shape === 'return') {
      // The last person the page described first, so the thinking picks up
      // the name the paragraph before it ended on.
      const viewed = presence.beat.people
        .filter((p) => (first || p.firstSight) && !p.grouped)
        .map((p) =>
          viewOf(
            view,
            view.personById.get(p.personId) as Person,
            // Known: met, or named in a lead the notebook holds.
            input.met.includes(p.personId) ||
              threadsFor(view, [...input.foundBefore]).some((t) =>
                new RegExp(`\\b${view.personById.get(p.personId)?.surname ?? '§'}\\b`).test(t.label),
              ),
            input.foundBefore,
            input.accountsBefore,
          ),
        )
        // Night Hone 1 §2: a stranger gets no thought until there is something to think.
        .filter((t) => t.who !== 'stranger' || t.lied === true)
        .slice(0, 2)
        .reverse();
      addThoughts(viewed);
    }
    const decidedHere = opening.length > 0 && addDecide();
    if (opening.length > 0) addBridge({ scenesOpening: true, decided: decidedHere });
    const thought = beats.some((b) => b.kind === 'thought');
    if (!thought && moved && action.kind === 'travel' && action.errand) {
      // What came of the walk: the person to ask is here, or the room to go
      // through is. A lead that sent him to a room with neither is a dead end.
      const target = action.errand.targetId ? view.findableById.get(action.errand.targetId) : undefined;
      const reachable =
        target !== undefined &&
        (target.source.type === 'place' || input.here.some((p) => p.id === (target.source as { personId: Id }).personId));
      if (shape === 'arrive' || target !== undefined) {
        beats.push(
          answerFor(
            action.errand.targetId,
            newIds,
            reachable,
            action.errand.slots.subject ?? action.errand.slots.who,
            action.errand.slots.name,
          ),
        );
      }
    }
    return { shape, beats, memory };
  }

  /* ------------------------------------------------------------ search */
  if (action.kind === 'examine') {
    if (clock) beats.push(clock);
    const carry = carryForSearch(input, action.objectId);
    beats.push({ kind: 'errand', required: true, form: 'carry', carry });
    const place = view.placeById.get(input.at);
    const left = (place?.objects ?? []).filter((id) => id !== action.objectId).slice(0, 2);
    beats.push({ kind: 'act', required: true, ...(action.objectId ? { objectId: action.objectId } : {}), left });
    for (const clue of action.clues) beats.push({ kind: 'find', required: true, clueId: clue.id });
    // Night Hone 1 §1: the room's own texture, after the finds.
    addPlace();
    addThoughts(thoughtsFor(thoughtInput));
    const decided = addDecide();
    addBridge({ decided });
    return { shape: 'search', beats, memory };
  }

  /* --------------------------------------------------------------- ask */
  const { carry, subjectId } = carryForAsk(input, action);
  const subject = subjectId ? view.personById.get(subjectId) : undefined;
  // §2: the question carries its own reason when it is the lead's subject and
  // the notebook knows why that subject matters.
  const carried =
    carry.lead && carry.for === 'ask-person' && subject !== undefined && subject.relationshipToVictim !== undefined;
  if (clock) beats.push(clock);
  if (!carried) beats.push({ kind: 'errand', required: true, form: 'carry', carry });
  // Night Hone 1 §1: the room, if the page runs short (the realizer decides).
  addPlace();
  const kept = memory.activities[action.personId];
  const stops = kept !== undefined && kept.visit === memory.visit && !kept.stopped;
  const recall =
    (input.recallable ?? []).includes(action.personId) && memory.recalled[action.personId] !== memory.visit;
  if (recall) memory = { ...memory, recalled: { ...memory.recalled, [action.personId]: memory.visit } };
  beats.push({
    kind: 'exchange',
    required: true,
    personId: action.personId,
    carried,
    ...(subjectId ? { subjectId } : {}),
    clueIds: action.clues.map((c) => c.id),
    account: action.account,
    self: action.self,
    ...(action.volunteer ? { volunteerId: action.volunteer.id } : {}),
    stops,
    recall,
  });
  if (kept !== undefined && stops) {
    memory = { ...memory, activities: { ...memory.activities, [action.personId]: { ...kept, stopped: true } } };
  }
  for (const id of newIds) beats.push({ kind: 'find', required: true, clueId: id });
  if (action.self && newClues.length === 0) {
    // Somebody's account of themselves is not a find; it is context.
    addThoughts([{ cls: 'context', basis: 'self', subjectId: action.personId, clueIds: [] }]);
  } else if (action.account && newClues.length === 0) {
    // An evening taken down is not a clue, but it can contradict one in hand.
    const accountThoughts = accountThought(input, action.personId);
    addThoughts(accountThoughts);
  } else {
    addThoughts(thoughtsFor(thoughtInput));
  }
  const decided = addDecide();
  addBridge({ decided });
  return { shape: 'ask', beats, memory };
}

/**
 * The thought after somebody gives their evening. A placement already in hand
 * that the account now contradicts is the thought; failing that, the evening
 * is context and says so.
 */
function accountThought(input: PlanInput, personId: Id): Thought[] {
  const { view } = input;
  const claimed = view.claimedOf.get(personId) ?? [];
  for (const id of input.foundBefore) {
    const clue = view.findableById.get(id);
    for (const f of clue?.establishes ?? []) {
      if ((f.kind !== 'personAt' && f.kind !== 'personNotAt') || f.personId !== personId) continue;
      const claim = claimed[f.tick] ?? null;
      if (claim === null) continue;
      const contradicts = f.kind === 'personAt' ? claim !== f.place : claim === f.place;
      if (contradicts) {
        return [
          {
            cls: 'contradicts',
            basis: f.kind === 'personAt' ? 'at' : 'not-at',
            subjectId: personId,
            placeId: f.place,
            tick: f.tick as Tick,
            otherPlaceId: claim,
            clueIds: [id],
            accountIds: [personId],
          },
        ];
      }
    }
  }
  return [{ cls: 'context', basis: 'account', subjectId: personId, clueIds: [], accountIds: [personId] }];
}
