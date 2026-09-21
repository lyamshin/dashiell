/**
 * The page grammar (A.5). A page is a set of slots; the engine decides which
 * of them fire from the action, the temper, the roll and the hour.
 *
 *   transition · arrival · place · presence · approach · exchange ·
 *   volunteer · find · reactive monologue · ambient · aside · simile
 *
 * Not every slot fires on every page. The target is 120–250 words, and the
 * optional slots at the end of the list are what the engine adds when a page
 * has come out thin and leaves off when it has come out long.
 *
 * Nothing in here knows about `RunState` beyond what the `Stage` hands it, and
 * nothing in here touches the document.
 */

import type { Clue, Id, Person, Tick } from '../../gen/types.js';
import { clock } from '../../gen/types.js';
import { NIGHT_MINUTES } from '../types.js';
import type { Block, ProseVoice } from '../types.js';
import type { CaseView, ClaimedAccount, Established } from '../derive.js';
import { establishedFrom, peopleHere } from '../derive.js';
import {

  FAMILIAR_GREETINGS,
  NOTHING_LINES,
  NOTHING_LEFT,
  PLAIN_ARRIVALS,
  PLAIN_TRANSITIONS,
  ROOM_LINES,
  type NothingLine,
} from '../voice-data.js';
import { Dealer, tagIs, tagOf, type Card, type Slots } from './cards.js';
import { describePerson, temperOf, type CastSheet, type Temper } from './cast.js';
import {
  askKindOf,
  businessLine,
  frameAnswer,
  humphreyLine,
  registerFor,
  speakClue,
  type AskKind,
  type Register,
} from './exchange.js';
import { findKindOf } from './facts.js';
import { knowsHim } from './roll.js';
import { reactiveMonologue, type ReactiveResult } from './reactive.js';

export type HourBand = 'midnight-2' | '2-4' | '4-6' | '6-8';

export function hourBandOf(minutesPastMidnight: number): HourBand {
  const m = Math.max(0, Math.min(NIGHT_MINUTES, minutesPastMidnight));
  if (m < 120) return 'midnight-2';
  if (m < 240) return '2-4';
  if (m < 360) return '4-6';
  return '6-8';
}

export type CaseState = 'cold' | 'warm' | 'hot' | 'tight';

export function caseStateOf(view: CaseView, found: Id[], actionsLeft: number): CaseState {
  if (actionsLeft > 0 && actionsLeft < 4) return 'tight';
  const share = found.length / Math.max(1, view.kase.findable.length);
  if (share < 0.2) return 'cold';
  if (share < 0.45) return 'warm';
  return 'hot';
}

/** What a simile on this page should be about, best guess first. */
export function simileTargets(view: CaseView, clue: Clue | null, placeId: Id): string[] {
  const kind = view.placeById.get(placeId)?.kind ?? 'semi';
  const byPlace =
    kind === 'public' ? ['street', 'city'] : kind === 'private' ? ['room'] : ['room', 'drink'];
  if (!clue) return [...byPlace, 'silence', 'weather'];
  switch (clue.kind) {
    case 'observation':
      return ['face', 'voice', ...byPlace];
    case 'denial':
      return ['lie', 'voice', 'face'];
    case 'overheard':
      return ['voice', 'lie', ...byPlace];
    case 'client':
      return ['money', 'face', 'voice'];
    case 'document':
      return ['money', 'lie', 'hands'];
    case 'physical':
      return ['hands', ...byPlace, 'clothes'];
    case 'morgue':
      return ['body', 'silence', 'hands'];
    case 'scene':
      return ['room', 'silence', 'body'];
    case 'anchor':
      return ['silence', ...byPlace, 'voice'];
    default:
      return byPlace;
  }
}

/* ------------------------------------------------------------------ *
 * What happened, as the reducer sees it.
 * ------------------------------------------------------------------ */

export type Scene =
  | { kind: 'open' }
  | { kind: 'travel'; to: Id; already: boolean }
  | { kind: 'look' }
  | {
      kind: 'ask';
      personId: Id;
      askKind: AskKind;
      topicLabel: string;
      clues: Clue[];
      account: ClaimedAccount | null;
      volunteer: Clue | null;
      free: boolean;
    }
  | { kind: 'examine'; placeId: Id; objectId?: Id; clues: Clue[] }
  | { kind: 'nothing'; tag: NothingLine['tag']; slots: Slots };

export interface Stage {
  view: CaseView;
  cast: CastSheet;
  dealer: Dealer;
  detectiveName: string;
  /** Where the page happens — after travel, not before. */
  at: Id;
  cost: number;
  /** Minutes past midnight once this page's action is paid for. */
  minutes: number;
  actionsLeft: number;
  foundBefore: Id[];
  foundAfter: Id[];
  accountsBefore: Id[];
  accountsAfter: Id[];
  /** Places already described this run. */
  describedPlaces: Id[];
  /** People already portrayed in full this run. */
  portrayed: Id[];
  /** Hour bands that have already spent an aside. */
  asideBands: string[];
  /** Pages so far, for "every third page". */
  pageIndex: number;
  previousTheory: Id | null;
  /** This run has already spent its one intensity-3 simile. */
  showedOff: boolean;
}

export interface Composed {
  blocks: Block[];
  gaps: string[];
  /** Hour band, if this page spent its aside. */
  asideBand: string | null;
  /** People portrayed in full by this page. */
  portrayed: Id[];
  theory: Id | null;
}

const WORD_TARGET_LOW = 120;
const WORD_TARGET_HIGH = 250;

function words(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.kind === 'prose' || b.kind === 'note') n += b.text.trim().split(/\s+/).length;
    if (b.kind === 'presence') n += 6 * Math.max(1, b.personIds.length);
    if (b.kind === 'timeline') n += 8 * b.rows.length;
  }
  return n;
}

export function composePage(stage: Stage, scene: Scene): Composed {
  const { view, cast, dealer } = stage;
  const gaps: string[] = [];
  const blocks: Block[] = [];
  const portrayed: Id[] = [];
  const band = hourBandOf(stage.minutes);
  const place = view.placeById.get(stage.at);
  const base: Slots = {
    detective: stage.detectiveName,
    place: place?.shortName,
    object: view.objectById.get(view.kase.method.evidenceObjectId)?.name,
    time: clock(0 as Tick),
  };
  const say = (text: string, voice: ProseVoice, clueId?: Id): void => {
    const trimmed = text.replace(/\s{2,}/g, ' ').trim();
    if (trimmed.length === 0) return;
    blocks.push(clueId === undefined ? { kind: 'prose', text: trimmed, voice } : { kind: 'prose', text: trimmed, voice, clueId });
  };

  /* -------------------------------------------------------- transition */
  if (stage.cost > 0 && scene.kind !== 'open') {
    const anchorIds = view.kase.anchors.map((a) => a.templateId);
    const drawn = dealer.draw(
      'transitions',
      [
        (c) => {
          const anchor = tagOf('transitions', c, 'anchorTemplate');
          return (
            typeof anchor === 'string' &&
            anchorIds.includes(anchor) &&
            tagIs('transitions', c, 'hourBand', band)
          );
        },
        (c) => {
          const anchor = tagOf('transitions', c, 'anchorTemplate');
          return typeof anchor === 'string' && anchorIds.includes(anchor);
        },
        (c) =>
          tagOf('transitions', c, 'anchorTemplate') === undefined &&
          tagIs('transitions', c, 'hourBand', band),
      ],
      base,
      true,
    );
    say(drawn?.text ?? dealer.random.pick(PLAIN_TRANSITIONS), 'transition');
  }

  /* ----------------------------------------------------------- opening */
  if (scene.kind === 'open') {
    const where = place?.name ?? 'the address';
    blocks.push({
      kind: 'note',
      text: `Midnight. ${where.charAt(0).toUpperCase()}${where.slice(1)}, ${
        view.kase.neighborhood
      }. They found ${view.victim.name} and then they found a telephone.`,
    });
  }

  /* -------------------------------------- arrival, place and who is in it */
  const describes =
    scene.kind === 'open' ||
    scene.kind === 'look' ||
    (scene.kind === 'travel' && !scene.already) ||
    (scene.kind === 'travel' && scene.already);
  if (describes) {
    if (scene.kind === 'travel' && !scene.already) {
      const arrival = dealer.draw(
        'arrivals',
        [
          (c) =>
            tagIs('arrivals', c, 'placeKind', place?.kind ?? 'semi') &&
            tagIs('arrivals', c, 'hourBand', band) &&
            tagIs('arrivals', c, 'weather', cast.roll.weather),
          (c) =>
            tagIs('arrivals', c, 'placeKind', place?.kind ?? 'semi') &&
            tagIs('arrivals', c, 'hourBand', band),
          (c) => tagIs('arrivals', c, 'hourBand', band),
          (c) => tagIs('arrivals', c, 'placeKind', place?.kind ?? 'semi'),
        ],
        base,
      );
      say(arrival?.text ?? plainArrival(dealer, place?.shortName), 'arrival');
    }
    if (!stage.describedPlaces.includes(stage.at)) {
      say(placeCard(dealer, view, stage.at) ?? plainArrival(dealer, place?.shortName), 'place');
    } else if (scene.kind === 'look') {
      say(plainArrival(dealer, place?.shortName), 'narrator');
    }
    const here = peopleHere(view, stage.at);
    blocks.push({ kind: 'presence', personIds: here.map((p) => p.id) });
    for (const person of here.slice(0, 2)) {
      const seen = stage.portrayed.includes(person.id) || portrayed.includes(person.id);
      say(
        describePerson(cast, person.id, person.surname, seen, stage.pageIndex),
        'presence',
      );
      if (!seen) portrayed.push(person.id);
    }
  }

  /* --------------------------------------------------------- the exchange */
  if (scene.kind === 'ask') {
    const person = view.personById.get(scene.personId);
    const temper = temperOf(cast, scene.personId);
    const familiar = knowsHim(cast.roll, scene.personId);
    const slots: Slots = { ...base, name: person?.surname, topic: scene.topicLabel };
    // One page, one piece of business per draw: the same hands must not be
    // doing the same thing twice in the same paragraph.
    const usedBusiness = new Set<string>();

    /* approach — who they are, and what their hands are doing */
    const seen = stage.portrayed.includes(scene.personId);
    if (person) {
      const portrait = describePerson(cast, scene.personId, person.surname, seen, stage.pageIndex);
      if (!seen) portrayed.push(scene.personId);
      const approach = businessLine(dealer, person, temper, slots, usedBusiness);
      if (approach) usedBusiness.add(approach.cardId);
      const greeting =
        familiar && !seen
          ? dealer.random.pick(FAMILIAR_GREETINGS).split('{name}').join(person.surname)
          : '';
      say([portrait, approach?.text ?? '', greeting].filter((s) => s.length > 0).join(' '), 'approach');
      if (scene.free) {
        blocks.push({
          kind: 'note',
          text: 'No charge on this one. There never is, the first time.',
        });
      }
    }

    /* Humphrey's line */
    const opener = humphreyLine(dealer, scene.askKind, familiar, slots);
    if (opener) say(opener.text, 'exchange');
    else say(`“${scene.topicLabel},” I said.`, 'exchange');

    /* the answer */
    if (scene.account) {
      const register: Register = (view.liesOf.get(scene.personId)?.size ?? 0) > 0 ? 'lie' : 'truth';
      answerAccount(
        stage,
        blocks,
        scene,
        person,
        temper,
        register,
        familiar,
        slots,
        opener?.text ?? '',
        usedBusiness,
      );
    }
    for (const [i, clue] of scene.clues.entries()) {
      if (i > 0) {
        const follow = humphreyLine(dealer, 'follow-up', familiar, slots);
        if (follow) say(follow.text, 'exchange');
      }
      const register = registerFor(view, scene.personId, clue);
      const spoken = speakClue(dealer, view, cast, clue, person, register, slots, gaps);
      const answer = frameAnswer(
        dealer,
        spoken,
        person,
        temper,
        register,
        familiar,
        slots,
        opener?.text ?? '',
        usedBusiness,
      );
      for (const id of answer.cardIds) usedBusiness.add(id);
      say(answer.text, spoken.mode === 'record' ? 'record' : 'exchange', clue.id);
    }
    if (scene.clues.length === 0 && !scene.account) {
      say(nothingLine(dealer, 'present', slots), 'nothing');
    }

    /* the volunteer — a yapper, once a run */
    if (scene.volunteer) {
      blocks.push({
        kind: 'note',
        text: `I had what I came for. ${person?.surname ?? 'He'} was not finished.`,
      });
      const register = registerFor(view, scene.personId, scene.volunteer);
      const spoken = speakClue(dealer, view, cast, scene.volunteer, person, register, slots, gaps);
      const answer = frameAnswer(
        dealer,
        spoken,
        person,
        temper,
        register,
        familiar,
        slots,
        opener?.text ?? '',
        usedBusiness,
      );
      say(answer.text, spoken.mode === 'record' ? 'record' : 'exchange', scene.volunteer.id);
    }

    const closer = humphreyLine(dealer, 'close', familiar, slots);
    if (closer) say(closer.text, 'exchange');
  }

  /* ------------------------------------------------------------ the find */
  if (scene.kind === 'examine' || scene.kind === 'open') {
    const clues = scene.kind === 'examine' ? scene.clues : openingClues(view);
    if (scene.kind === 'examine' && scene.objectId) {
      blocks.push({
        kind: 'note',
        text: `I start with ${view.objectById.get(scene.objectId)?.name ?? 'the thing'} and work outward.`,
      });
    }
    for (const clue of clues) {
      say(findLine(dealer, view, clue, stage.at, base), 'find', clue.id);
    }
    if (scene.kind === 'examine' && clues.length === 0) {
      say(nothingLeft(dealer, place?.shortName), 'nothing');
    }
  }

  /* --------------------------------------------------------- the nothing */
  if (scene.kind === 'nothing') {
    say(nothingLine(dealer, scene.tag, { ...base, ...scene.slots }), 'nothing');
  }

  /* ------------------------------------------------- reactive monologue */
  const before: Established = establishedFrom(view, stage.foundBefore, stage.accountsBefore);
  const after: Established = establishedFrom(view, stage.foundAfter, stage.accountsAfter);
  const touched = touchedPeople(view, stage.foundAfter.slice(stage.foundBefore.length), scene);
  let reaction: ReactiveResult = { lines: [], theory: stage.previousTheory };
  if (scene.kind !== 'nothing') {
    reaction = reactiveMonologue({
      view,
      roll: cast.roll,
      before,
      after,
      touched,
      actionsLeft: stage.actionsLeft,
      previousTheory: stage.previousTheory,
      seed: (stage.pageIndex + 1) * 7919 + view.kase.seed,
    });
    for (const line of reaction.lines) say(line, 'monologue');
  }

  /* ------------------------------------- ambient, aside, simile: the trim */
  let asideBand: string | null = null;
  const state = caseStateOf(view, stage.foundAfter, stage.actionsLeft);
  const thin = (): boolean => words(blocks) < WORD_TARGET_LOW;
  const room = (): boolean => words(blocks) < WORD_TARGET_HIGH;

  if (scene.kind !== 'nothing' && (thin() || stage.pageIndex % 3 === 2)) {
    const ambient = dealer.draw(
      'ambient',
      [
        (c) =>
          tagIs('ambient', c, 'hourBand', band) &&
          tagIs('ambient', c, 'caseState', state) &&
          tagIs('ambient', c, 'circumstance', cast.roll.circumstance),
        (c) => tagIs('ambient', c, 'hourBand', band) && tagIs('ambient', c, 'caseState', state),
        (c) => tagIs('ambient', c, 'caseState', state),
        (c) => tagIs('ambient', c, 'hourBand', band),
      ],
      base,
    );
    if (ambient) say(ambient.text, 'ambient');
  }

  if (scene.kind !== 'nothing' && !stage.asideBands.includes(band) && thin()) {
    const aside = dealer.draw(
      'asides',
      [
        (c) =>
          tagIs('asides', c, 'relationship', cast.roll.relationship) &&
          tagIs('asides', c, 'circumstance', cast.roll.circumstance),
        (c) => tagIs('asides', c, 'circumstance', cast.roll.circumstance),
        (c) => tagIs('asides', c, 'relationship', cast.roll.relationship),
      ],
      base,
      true,
    );
    if (aside) {
      say(aside.text, 'aside');
      asideBand = band;
    }
  }

  if (scene.kind !== 'nothing' && room()) {
    const last = lastClue(scene);
    const sim = simile(
      dealer,
      simileTargets(view, last, stage.at),
      { ...base, name: last ? subjectName(view, last) : undefined },
      stage.showedOff,
    );
    if (sim) say(sim, 'simile');
  }

  return { blocks, gaps, asideBand, portrayed, theory: reaction.theory };
}

/* ------------------------------------------------------------------ *
 * The pieces.
 * ------------------------------------------------------------------ */

function openingClues(view: CaseView): Clue[] {
  return view.kase.starting
    .map((id) => view.findableById.get(id))
    .filter((c): c is Clue => c !== undefined);
}

function plainArrival(dealer: Dealer, shortName: string | undefined): string {
  return dealer.random.pick(PLAIN_ARRIVALS).split('{place}').join(shortName ?? 'the address');
}

function nothingLeft(dealer: Dealer, shortName: string | undefined): string {
  return dealer.random.pick(NOTHING_LEFT).split('{place}').join(shortName ?? 'the room');
}

function nothingLine(dealer: Dealer, tag: NothingLine['tag'], slots: Slots): string {
  const pool = NOTHING_LINES.filter((l) => l.tag === tag);
  const line = dealer.random.pick(pool);
  let text = line.text;
  for (const [k, v] of Object.entries(slots)) {
    if (v === undefined) continue;
    text = text.split(`{${k}}`).join(v);
  }
  return text.replace(/\{[a-z]+\}/g, 'it');
}

function placeCard(dealer: Dealer, view: CaseView, placeId: Id): string | null {
  const place = view.placeById.get(placeId);
  if (!place) return null;
  const slots: Slots = { place: place.shortName };
  const watcher = place.watcher ?? 'none';
  const empty = peopleHere(view, placeId).length === 0 ? 'yes' : 'no';
  const kind = (c: Card): boolean => tagIs('places', c, 'placeKind', place.kind);
  // An unwatched room never widens onto a watcher's furniture. That was M3's
  // loudest complaint: the scene is always unwatched, it is the first page of
  // every run, and it was being described in the landlady's voice.
  const ladder: ((c: Card) => boolean)[] =
    watcher === 'none'
      ? [
          (c) => kind(c) && tagIs('places', c, 'watcher', 'none') && tagIs('places', c, 'empty', empty),
          (c) => kind(c) && tagIs('places', c, 'watcher', 'none'),
        ]
      : [
          (c) => kind(c) && tagIs('places', c, 'watcher', watcher) && tagIs('places', c, 'empty', empty),
          (c) => kind(c) && tagIs('places', c, 'empty', empty),
          (c) => kind(c) && tagIs('places', c, 'watcher', watcher),
          kind,
        ];
  const drawn = dealer.draw('places', ladder, slots, true);
  if (drawn) return drawn.text;
  // The M3 stopgap: twelve hand-written lines for a room with nobody posted
  // in it, kept until the places deck has its unwatched cards.
  const pool = ROOM_LINES.filter((l) => l.placeKind === place.kind);
  if (pool.length === 0) return null;
  return dealer.random.pick(pool).text.split('{place}').join(place.shortName);
}

function findLine(dealer: Dealer, view: CaseView, clue: Clue, placeId: Id, base: Slots): string {
  const placeKind = view.placeById.get(placeId)?.kind ?? 'semi';
  const kind = findKindOf(clue);
  // The opening brief is not a thing come upon in a room: the client said it.
  // Nothing in the find deck is written for that, so it stands on its own.
  if (kind === null) return clue.text;
  const drawn = dealer.draw(
    'find',
    [
      (c) => tagIs('find', c, 'clueKind', kind) && tagIs('find', c, 'placeKind', placeKind),
      (c) => tagIs('find', c, 'clueKind', kind),
    ],
    { ...base, fact: clue.text },
    true,
  );
  return drawn?.text ?? clue.text;
}

function simile(
  dealer: Dealer,
  targets: string[],
  slots: Slots,
  showedOff: boolean,
): string | null {
  const cap = (c: Card): boolean => {
    const i = tagOf('similes', c, 'intensity');
    return typeof i === 'number' && i <= (showedOff ? 2 : 3);
  };
  for (const target of targets) {
    if (!dealer.has('similes', (c) => cap(c) && tagIs('similes', c, 'target', target))) continue;
    const drawn = dealer.draw(
      'similes',
      [(c) => cap(c) && tagIs('similes', c, 'target', target)],
      slots,
      true,
    );
    if (drawn) return drawn.text;
  }
  // Nothing fresh on anything this page is about: the page goes without,
  // which M3's notes found reads better than reaching for a stranger.
  return null;
}

function lastClue(scene: Scene): Clue | null {
  if (scene.kind === 'ask') return scene.clues[scene.clues.length - 1] ?? scene.volunteer ?? null;
  if (scene.kind === 'examine') return scene.clues[scene.clues.length - 1] ?? null;
  return null;
}

function subjectName(view: CaseView, clue: Clue): string | undefined {
  for (const f of clue.establishes) {
    if ('personId' in f) return view.personById.get(f.personId)?.surname;
  }
  if (clue.source.type === 'person') return view.personById.get(clue.source.personId)?.surname;
  return undefined;
}

/** Whose claims the page's new facts speak to. */
function touchedPeople(view: CaseView, newlyFound: Id[], scene: Scene): Id[] {
  const out = new Set<Id>();
  for (const id of newlyFound) {
    const clue = view.findableById.get(id);
    for (const f of clue?.establishes ?? []) {
      if ('personId' in f) out.add(f.personId);
    }
  }
  if (scene.kind === 'ask' && scene.account) out.add(scene.personId);
  return [...out];
}

function answerAccount(
  stage: Stage,
  blocks: Block[],
  scene: Extract<Scene, { kind: 'ask' }>,
  person: Person | undefined,
  temper: Temper,
  register: Register,
  familiar: boolean,
  slots: Slots,
  humphrey: string,
  exclude: ReadonlySet<string>,
): void {
  const account = scene.account;
  if (!account) return;
  const claimed = account.rows.filter((r) => r.placeId !== null);
  const first = claimed[0];
  const lastRow = claimed[claimed.length - 1];
  const fact =
    first && lastRow
      ? `I was at ${stage.view.placeById.get(first.placeId as Id)?.shortName ?? 'home'} and then where I said, ${clock(
          first.tick,
        )} to ${clock(lastRow.tick)}. All of it is in the book if you want the book.`
      : 'I was where I was and I could not tell you the hours of it.';
  const answer = frameAnswer(
    stage.dealer,
    { clueId: '', text: fact, mode: 'utterance', cardIds: [] },
    person,
    temper,
    register,
    familiar,
    slots,
    humphrey,
    exclude,
  );
  blocks.push({ kind: 'prose', text: answer.text, voice: 'exchange' });
  blocks.push({ kind: 'timeline', personId: scene.personId, rows: account.rows });
}

export { askKindOf };
