/**
 * The page grammar (M4 §A.5, rebuilt under M4b §A).
 *
 *   transition · arrival · place · presence · approach · exchange ·
 *   volunteer · find · reactive monologue · ambient · aside · simile
 *
 * M4 made a page a scene. It was dense, and it was dense because it was
 * disconnected: seven images in a hundred and fifty words, no two of them
 * about the same thing, none of them followed. M4b keeps the slots and adds
 * attention:
 *
 * - **§A.1 an image budget.** Blocks are load-bearing (the exchange, the find,
 *   the fact, the monologue, the record) or image-bearing (transition,
 *   arrival, place, portrait, ambient, aside). Load-bearing blocks are filled
 *   first; then at most three image blocks, or two when the page has an
 *   exchange or a find, chosen by score.
 * - **§A.2 closeness.** The page builds a motif set before it draws a single
 *   image card, and the dealer orders every rung of its ladder by how much of
 *   that set the card already holds.
 * - **§A.3 no dangling similes.** A simile is a clause of the sentence it
 *   modifies. It is never a paragraph, never appears twice on a page, and is
 *   never about what the page before it was about.
 * - **§A.4 woven portraits**, and a presence roll that is one sentence.
 * - **§A.6 glue.** A thought may open on the prop the line before it named.
 *
 * Nothing in here knows about `RunState` beyond what the `Stage` hands it, and
 * nothing in here touches the document.
 */

import type { Clue, Id, Person, Tick } from '../../gen/types.js';
import { clock } from '../../gen/types.js';
import { NIGHT_MINUTES } from '../types.js';
import type { Block, ProseVoice } from '../types.js';
import type { CaseView, ClaimedAccount, Established } from '../derive.js';
import { establishedFrom } from '../derive.js';
import {
  CARRY_TEMPLATES,
  FAMILIAR_GREETINGS,
  GUEST_POSTS,
  NOTHING_LINES,
  NOTHING_LEFT,
  PLAIN_ARRIVALS,
  PLAIN_TRANSITIONS,
  ROOM_LINES,
  WATCHER_POSTS,
  type NothingLine,
} from '../voice-data.js';
import { DECKS, Dealer, tagIs, tagOf, type Card, type Slots } from './cards.js';
import {
  appendMark,
  capitalizeFirst,
  endsInPeriod,
  endsSentence,
  joinSentences,
  tidyPunctuation,
} from './prose.js';
import {
  classOf,
  describePerson,
  genderHintOf,
  pronounOf,
  temperOf,
  type CastSheet,
  type Temper,
} from './cast.js';
import {
  askKindOf,
  businessLine,
  frameAnswer,
  dashiellLine,
  registerFor,
  speakClue,
  type AskKind,
  type Register,
  type SpokenClue,
} from './exchange.js';
import { findKindOf } from './facts.js';
import { knowsHim } from './roll.js';
import { reactiveMonologue, type ReactiveResult } from './reactive.js';
import {
  BODY_MOTIFS,
  PROP_MOTIFS,
  pageMotifSet,
  placeMotifs,
  type MotifContext,
} from './motifs.js';
import { clientLeavingLine, entranceCard, hiringFrame, officeCard, retainerFor } from './office.js';

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

/* ------------------------------------------------------------------ *
 * §A.1 — the image budget.
 * ------------------------------------------------------------------ */

/** The image-bearing voices. Everything else on a page is load-bearing. */
export const IMAGE_VOICES: ReadonlySet<ProseVoice> = new Set<ProseVoice>([
  'transition',
  'arrival',
  'place',
  'presence',
  'approach',
  'ambient',
  'aside',
]);

export const IMAGE_BUDGET = 3;
export const IMAGE_BUDGET_WITH_EXCHANGE = 2;

/** How many image blocks a page with this much work to do is allowed. */
export function budgetFor(hasExchangeOrFind: boolean): number {
  return hasExchangeOrFind ? IMAGE_BUDGET_WITH_EXCHANGE : IMAGE_BUDGET;
}

/** How many image-bearing blocks a finished page carries. The test counts this. */
export function imageBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => b.kind === 'prose' && IMAGE_VOICES.has(b.voice));
}

/* ------------------------------------------------------------------ *
 * §A.3 — what a simile may be a clause of.
 * ------------------------------------------------------------------ */

/**
 * Targets bind. A simile about a voice goes on a spoken line; one about hands
 * or a face goes on a beat about the person those hands belong to; a room goes
 * on the place card; the street and the weather go on an arrival or a
 * transition; silence goes on a pause. If no block on the page hosts the
 * target, **the page gets no simile** — which reads better than a simile about
 * a room the page never entered.
 */
export const SIMILE_HOSTS: Record<string, ProseVoice[]> = {
  voice: ['exchange'],
  lie: ['exchange'],
  face: ['approach', 'presence'],
  hands: ['approach', 'presence', 'find'],
  clothes: ['approach', 'presence'],
  body: ['find', 'record'],
  room: ['place'],
  drink: ['place', 'arrival'],
  street: ['arrival', 'transition'],
  city: ['arrival', 'transition'],
  weather: ['arrival', 'transition'],
  money: ['find', 'exchange'],
  silence: ['nothing', 'monologue', 'exchange'],
};

/** Targets that are about a person's body or voice: the gender filter applies. */
export const GENDERED_TARGETS: ReadonlySet<string> = new Set([
  'face',
  'hands',
  'voice',
  'clothes',
  'body',
]);

/**
 * Short connectives, for a simile card written as a bare clause. Most cards in
 * the deck are finished sentences and carry their own "like" or "the way"; a
 * card that does not gets one here rather than being stranded.
 */
export const SIMILE_CONNECTIVES: string[] = ['the way', 'like'];

const OPENS_AS_CLAUSE = /^(like|the way|as if|as though|as\b)/i;

/**
 * Set a simile down as part of the sentence it modifies (§A.3): a comma when
 * the card opens on a connective, a full stop when it is a sentence of its own.
 * Either way it is in the same paragraph, which is the whole point.
 *
 * The comma is the only one the page grammar puts in, and it goes in under two
 * conditions together: the simile begins lower-case, so it is a clause and not
 * a sentence, and the line it joins ends on a full stop. A question or an
 * exclamation is not a clause anybody can hang another clause off — "Where were
 * you?, flat as a nickel on a bar" — so those keep their mark and the simile
 * starts a sentence of its own.
 */
export function attachSimile(host: string, simile: string): string {
  const s = simile.trim();
  if (s.length === 0) return host;
  const clause = OPENS_AS_CLAUSE.test(s) || /^[a-z]/.test(s);
  if (!clause) return joinSentences(host, s);
  if (endsInPeriod(host) || !endsSentence(host)) {
    return tidyPunctuation(`${appendMark(host, ',')} ${s}`);
  }
  return joinSentences(host, capitalizeFirst(s));
}

/**
 * What a simile on *this* page should be about, best guess first, read off
 * what the page actually contains. A page that led with an exchange is about a
 * voice; one that led with a walk is about the street.
 */
export function simileTargetsFor(
  view: CaseView,
  scene: Scene,
  blocks: Block[],
  placeId: Id,
  clue: Clue | null,
): string[] {
  const kind = view.placeById.get(placeId)?.kind ?? 'semi';
  const out: string[] = [];
  const push = (...targets: string[]): void => {
    for (const t of targets) if (!out.includes(t)) out.push(t);
  };
  const has = (...voices: ProseVoice[]): boolean =>
    blocks.some((b) => b.kind === 'prose' && voices.includes(b.voice));
  const portrayed = has('presence', 'approach');
  const aboutThePlace =
    scene.kind === 'look' || scene.kind === 'open' || scene.kind === 'examine' || has('place');

  switch (scene.kind) {
    case 'ask':
      push('voice', 'lie', 'face', 'hands');
      break;
    case 'travel':
      push('street', 'weather', kind === 'public' ? 'city' : 'drink');
      break;
    case 'examine':
    case 'open':
      push(...simileTargets(view, clue, placeId).filter((t) => t !== 'room' || aboutThePlace));
      break;
    default:
      break;
  }
  if (portrayed) push('face', 'hands', 'clothes');
  if (clue) push(...simileTargets(view, clue, placeId).filter((t) => t !== 'room' || aboutThePlace));
  if (aboutThePlace) push('room', 'silence');
  push('silence');
  return out;
}

/** What a simile after a given clue should be about, best guess first. */
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
  /** Page one: the office, midnight, and somebody on the stairs (§B.2). */
  | { kind: 'open'; clientClue: Clue | null }
  | {
      kind: 'travel';
      to: Id;
      already: boolean;
      /** First time at the scene: the report and the coroner's note, free. */
      openingClues?: Clue[];
      /** He walked out of the office and the client walked out with him. */
      clientLeaves?: boolean;
    }
  | { kind: 'look' }
  | {
      kind: 'ask';
      personId: Id;
      askKind: AskKind;
      topicLabel: string;
      /**
       * What the question is *about*, resolved by the reducer: `subject` for a
       * person, `place` for a place, `object` for a thing. Never the person
       * being spoken to — see `askSlots`.
       */
      topicSlots: Slots;
      clues: Clue[];
      account: ClaimedAccount | null;
      volunteer: Clue | null;
      free: boolean;
      /** That was the second free question and the client has a bus to catch. */
      clientLeaves?: boolean;
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
  /** How many pages each person has already been portrayed on (§A.6). */
  appearances: Record<Id, number>;
  /** People already met, so the presence roll knows whose role to print. */
  met: Id[];
  /** Hour bands that have already spent an aside. */
  asideBands: string[];
  /** Pages so far, for "every third page". */
  pageIndex: number;
  previousTheory: Id | null;
  /** What the previous page's simile was about. This page picks another. */
  lastSimile: string | null;
  /** The motifs the previous page's cards used (§A.2). */
  previousMotifs: string[];
  /** This run has already spent its one intensity-3 simile. */
  showedOff: boolean;
  /** Who is standing here, including the client while he is in the office. */
  here: Person[];
}

export interface Composed {
  blocks: Block[];
  gaps: string[];
  /** Hour band, if this page spent its aside. */
  asideBand: string | null;
  /** People portrayed in full by this page. */
  portrayed: Id[];
  /** Everybody this page put a portrait sentence on, for the callback count. */
  appeared: Id[];
  theory: Id | null;
  /** What this page's simile was about, if it had one. */
  simileTarget: string | null;
  /** Every motif this page's cards carried, for the next page's context. */
  motifs: string[];
  /**
   * The motifs of the image-bearing blocks that survived the budget, in page
   * order. This is what the coherence number is measured on (§A.2): the mean
   * number of motifs two blocks standing next to each other have in common.
   */
  imageMotifs: string[][];
}

/**
 * §A.2's number, and the one the milestone is judged on: the mean count of
 * motifs shared by two image-bearing blocks that are next to each other on a
 * page. Zero means every image on the page is an island, which is what M4b
 * was written to fix. Pages with fewer than two image blocks contribute
 * nothing either way.
 */
export function meanSharedMotifs(pages: { imageMotifs?: string[][] }[]): {
  mean: number;
  pairs: number;
} {
  let total = 0;
  let pairs = 0;
  for (const page of pages) {
    const blocks = page.imageMotifs ?? [];
    for (let i = 1; i < blocks.length; i++) {
      const a = blocks[i - 1] as string[];
      const b = blocks[i] as string[];
      total += a.filter((m) => b.includes(m)).length;
      pairs++;
    }
  }
  return { mean: pairs === 0 ? 0 : total / pairs, pairs };
}

const WORD_TARGET_LOW = 120;
const WORD_TARGET_HIGH = 250;

/**
 * How long a page reads. Prose and notes are counted word for word; a claimed
 * timeline is counted at what it takes up on the paper, because it is text on
 * the page even though no deck wrote it. The presence roll is one sentence now
 * (§A.4) and is counted like any other.
 */
export function countWords(blocks: Block[]): number {
  let n = 0;
  const count = (text: string): number =>
    text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  for (const b of blocks) {
    if (b.kind === 'prose' || b.kind === 'note') n += count(b.text);
    if (b.kind === 'presence') n += b.text ? count(b.text) : 6 * Math.max(1, b.personIds.length);
    if (b.kind === 'timeline') n += 4 + 5 * b.rows.length;
  }
  return n;
}

const words = countWords;

/** A block on its way to the page, with everything the trims need to know. */
interface Laid {
  block: Block;
  /** §A.1: image-bearing blocks are the ones the budget is spent on. */
  image: boolean;
  motifs: string[];
  score: number;
  /** Which simile targets this block can host (§A.3). */
  targets: string[];
  /** Who the block is about, for the simile's gender filter. */
  personId?: Id;
  /** Higher survives the image trim. */
  keep: number;
}

interface SayOpts {
  clueId?: Id;
  motifs?: readonly string[];
  score?: number;
  personId?: Id;
  keep?: number;
  /** Override the default host list for this block's voice. */
  targets?: string[];
}

export function composePage(stage: Stage, scene: Scene): Composed {
  const { view, cast, dealer } = stage;
  const gaps: string[] = [];
  const laid: Laid[] = [];
  const portrayed: Id[] = [];
  const appeared: Id[] = [];
  const band = hourBandOf(stage.minutes);
  const place = view.placeById.get(stage.at);
  const base: Slots = {
    detective: stage.detectiveName,
    place: place?.shortName,
    object: view.objectById.get(view.kase.method.evidenceObjectId)?.name,
    time: clock(0 as Tick),
  };

  /* ------------------------------------------------- §A.2: the motif set */
  const focusClue = lastClue(scene);
  const focusPerson =
    scene.kind === 'ask'
      ? view.personById.get(scene.personId)
      : scene.kind === 'open'
        ? view.client
        : undefined;
  const motifSet = pageMotifSet({
    night: cast.roll.weather,
    anchorIds: view.kase.anchors.map((a) => a.templateId),
    place,
    clue: focusClue,
    subjectMotifs: subjectPortraitMotifs(stage, scene, focusPerson),
    objectName: base.object,
    previous: stage.previousMotifs,
  });
  const usedMotifs: string[] = [];
  /**
   * The context handed to every draw, with `before` moving as the page grows.
   *
   * §A.2's adjacency bonus is "+1 if it shares a motif with the block
   * immediately before it", and the first block on a page has nothing before
   * it — except that on an exchange page the engine already knows what comes
   * next, because the portrait is fixed at case start. So the transition
   * opens against its *neighbour*, which is the block after it. The rule is
   * line-to-line adjacency; which side the neighbour is on is an accident of
   * the order the engine happens to draw in.
   */
  const ctx: MotifContext & { before: string[] } = {
    night: cast.roll.weather,
    page: motifSet,
    previous: new Set(stage.previousMotifs),
    before: scene.kind === 'ask' ? (cast.portraits[scene.personId]?.motifs ?? []) : [],
  };

  // §A.1: two images, not three, on a page that also has an exchange or a
  // find to carry — including the first arrival at the scene, which carries
  // the report and the coroner's note.
  const budget = budgetFor(
    scene.kind === 'ask' ||
      scene.kind === 'examine' ||
      scene.kind === 'open' ||
      (scene.kind === 'travel' && (scene.openingClues?.length ?? 0) > 0),
  );
  const imageCount = (): number => laid.filter((l) => l.image).length;

  const say = (text: string, voice: ProseVoice, opts: SayOpts = {}): void => {
    const trimmed = text.replace(/\s{2,}/g, ' ').trim();
    if (trimmed.length === 0) return;
    const block: Block =
      opts.clueId === undefined
        ? { kind: 'prose', text: trimmed, voice }
        : { kind: 'prose', text: trimmed, voice, clueId: opts.clueId };
    const motifs = [...(opts.motifs ?? [])];
    laid.push({
      block,
      image: IMAGE_VOICES.has(voice),
      motifs,
      score: opts.score ?? 0,
      targets: opts.targets ?? hostedTargets(voice),
      ...(opts.personId === undefined ? {} : { personId: opts.personId }),
      keep: opts.keep ?? 1,
    });
    for (const m of motifs) if (!usedMotifs.includes(m)) usedMotifs.push(m);
    ctx.before = motifs;
  };
  const put = (block: Block): void => {
    laid.push({ block, image: false, motifs: [], score: 0, targets: hostedTargets(null), keep: 9 });
  };

  /* --------------------------------------------- §B.2.4: the client leaves */
  // Before the walk, because the walk is what he leaves for: two questions on
  // the house, or the detective picking up his hat, and the visit is over.
  if ((scene.kind === 'ask' || scene.kind === 'travel') && scene.clientLeaves) {
    const client = view.client;
    say(
      clientLeavingLine(
        dealer,
        client.surname,
        view.placeById.get(client.foundAt ?? '')?.shortName ?? 'the address he gave me',
      ),
      'narrator',
    );
  }

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
      ctx,
    );
    say(drawn?.text ?? dealer.random.pick(PLAIN_TRANSITIONS), 'transition', {
      motifs: drawn?.motifs,
      score: drawn?.score,
    });
  }

  /* --------------------------------------------- §B.2: the office opening */
  if (scene.kind === 'open') {
    openTheOffice(stage, scene, { say, put, base, ctx, gaps, portrayed, appeared });
  }

  /* -------------------------------------- arrival, place and who is in it */
  const describes =
    scene.kind === 'look' || scene.kind === 'travel';
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
        false,
        ctx,
      );
      say(arrival?.text ?? plainArrival(dealer, place?.shortName), 'arrival', {
        motifs: arrival?.motifs,
        score: arrival?.score,
      });
    }
    if (!stage.describedPlaces.includes(stage.at)) {
      const card = placeCard(dealer, view, stage.at, ctx);
      say(card?.text ?? plainArrival(dealer, place?.shortName), 'place', {
        motifs: card?.motifs,
        score: card?.score,
      });
    } else if (scene.kind === 'look') {
      say(plainArrival(dealer, place?.shortName), 'narrator');
    }
    put(presenceBlock(stage));
    // §A.1: the portraits are image-bearing and the budget is about to be
    // spent, so only as many as the page can afford are even drawn.
    for (const person of stage.here.slice(0, 2)) {
      if (imageCount() >= budget) break;
      const seen = stage.portrayed.includes(person.id) || portrayed.includes(person.id);
      const times = stage.appearances[person.id] ?? 0;
      const portrait = cast.portraits[person.id];
      say(
        describePerson({
          cast,
          personId: person.id,
          surname: person.surname,
          times,
          pronoun: pronounOf(person),
          nth: stage.pageIndex,
        }),
        'presence',
        { motifs: portrait?.motifs, personId: person.id, score: sharedWith(portrait?.motifs, motifSet) },
      );
      appeared.push(person.id);
      if (!seen) portrayed.push(person.id);
    }
  }

  /* ---------------------------------------------- first sight of the scene */
  if (scene.kind === 'travel' && scene.openingClues && scene.openingClues.length > 0) {
    put({
      kind: 'note',
      text: `${capitalize(place?.name ?? 'the address')}, ${view.kase.neighborhood}. They found ${
        view.victim.name
      } here and then they found a telephone.`,
    });
    for (const clue of scene.openingClues) {
      const line = findLine(dealer, view, clue, stage.at, base, ctx);
      say(line.text, 'find', { clueId: clue.id, motifs: line.motifs, score: line.score });
    }
  }

  /* --------------------------------------------------------- the exchange */
  if (scene.kind === 'ask') {
    const person = view.personById.get(scene.personId);
    const temper = temperOf(cast, scene.personId);
    const familiar = knowsHim(cast.roll, scene.personId);
    const slots: Slots = askSlots(base, scene, person?.surname);
    // One page, one piece of business per draw: the same hands must not be
    // doing the same thing twice in the same paragraph.
    const usedBusiness = new Set<string>();

    /**
     * A clue that states two facts is two answers, not one breath. The first
     * answers the question; each one after it gets a follow-up in front of it,
     * so Dashiell is seen to ask again for what he did not get the first time.
     */
    const sayTheRest = (spoken: SpokenClue, isFamiliar: boolean, withSlots: Slots): void => {
      for (const more of spoken.rest) {
        const follow = dashiellLine(dealer, 'follow-up', isFamiliar, withSlots);
        say(follow?.text ?? '"And then."', 'exchange', { personId: scene.personId });
        say(`"${more}"`, 'exchange', { clueId: spoken.clueId, personId: scene.personId });
      }
    };

    /* approach — who they are, and what their hands are doing */
    const seen = stage.portrayed.includes(scene.personId);
    if (person) {
      const approach = businessLine(dealer, person, temper, slots, usedBusiness, gaps, ctx);
      if (approach) usedBusiness.add(approach.cardId);
      const portrait = describePerson({
        cast,
        personId: scene.personId,
        surname: person.surname,
        times: stage.appearances[scene.personId] ?? 0,
        business: approach?.text,
        pronoun: pronounOf(person),
        nth: stage.pageIndex,
      });
      appeared.push(scene.personId);
      if (!seen) portrayed.push(scene.personId);
      const greeting =
        familiar && !seen
          ? dealer.random.pick(FAMILIAR_GREETINGS).split('{name}').join(person.surname)
          : '';
      // The business beat is inside the portrait when the weave used it; a
      // weave that did not use it sets it down after, as its own sentence.
      const carriedBusiness = approach !== null && portrait.includes(trimTail(approach.text));
      say(
        joinSentences(portrait, carriedBusiness ? '' : (approach?.text ?? ''), greeting),
        'approach',
        {
          personId: scene.personId,
          motifs: [...(cast.portraits[scene.personId]?.motifs ?? []), ...(approach?.motifs ?? [])],
          score: sharedWith(cast.portraits[scene.personId]?.motifs, motifSet),
          // A page whose whole business is this person keeps their portrait.
          keep: 2,
        },
      );
      if (scene.free) {
        put({ kind: 'note', text: 'No charge on this one. There never is, the first time.' });
      }
    }

    /* Dashiell's line */
    const opener = dashiellLine(dealer, scene.askKind, familiar, slots);
    if (opener) say(opener.text, 'exchange', { personId: scene.personId });
    else say(`“${scene.topicLabel},” I said.`, 'exchange', { personId: scene.personId });

    /* the answer */
    if (scene.account) {
      const register: Register = (view.liesOf.get(scene.personId)?.size ?? 0) > 0 ? 'lie' : 'truth';
      answerAccount(
        stage,
        (text) => say(text, 'exchange', { personId: scene.personId, targets: ['voice', 'lie', 'silence'] }),
        put,
        scene,
        person,
        temper,
        register,
        familiar,
        slots,
        opener?.text ?? '',
        usedBusiness,
        gaps,
      );
    }
    for (const [i, clue] of scene.clues.entries()) {
      if (i > 0) {
        const follow = dashiellLine(dealer, 'follow-up', familiar, slots);
        if (follow) say(follow.text, 'exchange', { personId: scene.personId });
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
        gaps,
      );
      for (const id of answer.cardIds) usedBusiness.add(id);
      say(answer.text, spoken.mode === 'record' ? 'record' : 'exchange', {
        clueId: clue.id,
        personId: scene.personId,
        targets: register === 'truth' ? ['voice', 'silence'] : ['voice', 'lie', 'silence'],
      });
      sayTheRest(spoken, familiar, slots);
    }
    if (scene.clues.length === 0 && !scene.account) {
      say(nothingLine(dealer, 'present', slots), 'nothing');
    }

    /* the volunteer — a yapper, once a run */
    if (scene.volunteer) {
      put({
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
        gaps,
      );
      say(answer.text, spoken.mode === 'record' ? 'record' : 'exchange', {
        clueId: scene.volunteer.id,
        personId: scene.personId,
      });
      sayTheRest(spoken, familiar, slots);
    }

    const closer = dashiellLine(dealer, 'close', familiar, slots);
    if (closer) say(closer.text, 'exchange', { personId: scene.personId });
  }

  /* ------------------------------------------------------------ the find */
  if (scene.kind === 'examine') {
    if (scene.objectId) {
      put({
        kind: 'note',
        text: `I start with ${view.objectById.get(scene.objectId)?.name ?? 'the thing'} and work outward.`,
      });
    }
    for (const clue of scene.clues) {
      const line = findLine(dealer, view, clue, stage.at, base, ctx);
      say(line.text, 'find', { clueId: clue.id, motifs: line.motifs, score: line.score });
    }
    if (scene.clues.length === 0) {
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
  let carried = false;
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
    for (const [i, line] of reaction.lines.entries()) {
      // A page that is already long keeps the first thought and drops the
      // second. Two paragraphs of thinking on top of three finds is a page
      // nobody reads to the end of.
      if (i > 0 && words(blocksOf(laid)) > WORD_TARGET_HIGH - 20) break;
      // §A.6: the first thought may open on the prop the line before named.
      const glue = i === 0 && !carried ? carryNoun(dealer, ctx.before) : null;
      if (glue) carried = true;
      say(glue ? joinSentences(glue, line) : line, 'monologue');
    }
  }

  /* ------------------------------------- ambient, aside, simile: the trim */
  let asideBand: string | null = null;
  const state = caseStateOf(view, stage.foundAfter, stage.actionsLeft);
  const thin = (): boolean => words(blocksOf(laid)) < WORD_TARGET_LOW;
  const room = (): boolean => words(blocksOf(laid)) < WORD_TARGET_HIGH;
  const drawAmbient = (): boolean => {
    if (imageCount() >= budget) return false;
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
      false,
      ctx,
    );
    if (!ambient) return false;
    const glue = carried ? null : carryNoun(dealer, ctx.before);
    if (glue) carried = true;
    say(glue ? joinSentences(glue, ambient.text) : ambient.text, 'ambient', {
      motifs: ambient.motifs,
      score: ambient.score,
      keep: 0,
    });
    return true;
  };

  // The every-third-page thought only fires when the page has room for it.
  if (scene.kind !== 'nothing' && (thin() || (stage.pageIndex % 3 === 2 && room()))) drawAmbient();

  if (
    scene.kind !== 'nothing' &&
    !stage.asideBands.includes(band) &&
    thin() &&
    imageCount() < budget
  ) {
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
      ctx,
    );
    if (aside) {
      say(aside.text, 'aside', { motifs: aside.motifs, score: aside.score, keep: 0 });
      asideBand = band;
    }
  }

  // A page that is still short has run its decks out rather than had nothing
  // to say. Keep reaching for the monologue until it is a page and not a
  // paragraph: two more goes, and then it is as long as it is going to be.
  for (let i = 0; scene.kind !== 'nothing' && i < 2 && words(blocksOf(laid)) < 90; i++) {
    if (!drawAmbient()) break;
  }

  /* ------------------------------------------------- §A.1: the image trim */
  while (imageCount() > budget) {
    let worst = -1;
    for (let i = 0; i < laid.length; i++) {
      const l = laid[i] as Laid;
      if (!l.image) continue;
      const w = laid[worst] as Laid | undefined;
      if (!w || l.keep < w.keep || (l.keep === w.keep && l.score <= w.score)) worst = i;
    }
    if (worst < 0) break;
    laid.splice(worst, 1);
  }

  /* ------------------------------------------------ §A.3: one simile, bound */
  let simileTarget: string | null = null;
  if (scene.kind !== 'nothing' && words(blocksOf(laid)) < WORD_TARGET_HIGH - 25) {
    const wanted = simileTargetsFor(view, scene, blocksOf(laid), stage.at, focusClue).filter(
      // Two pages running about the same thing is the repetition a reader
      // notices first, so last page's target is off the table entirely.
      (t) => t !== stage.lastSimile,
    );
    const placed = placeSimile(stage, laid, wanted, {
      ...base,
      name: focusClue ? subjectName(view, focusClue) : undefined,
    }, ctx);
    if (placed) simileTarget = placed;
  }

  /* ---------------------------------------------------- the hard ceiling */
  // With the full decks a find page or a yapper's volunteer can push past 300
  // words even after the trims above; drop the optional blocks from the end
  // until it fits. The record is never among them. Thinking goes first, then
  // texture; the exchange and the finds stay.
  const CUT_ORDER: ReadonlySet<string>[] = [
    new Set(['aside', 'ambient', 'monologue']),
    new Set(['transition', 'arrival', 'approach', 'place']),
  ];
  for (const cuttable of CUT_ORDER) {
    while (words(blocksOf(laid)) > 300) {
      let cut = -1;
      for (let i = laid.length - 1; i >= 0; i--) {
        const b = (laid[i] as Laid).block;
        if (b.kind === 'prose' && cuttable.has(b.voice) && b.clueId === undefined) {
          cut = i;
          break;
        }
      }
      if (cut < 0) break;
      laid.splice(cut, 1);
    }
  }

  for (const deck of dealer.takeReshuffles()) {
    gaps.push(`deck-exhausted: ${deck} came round again inside one run`);
  }

  return {
    blocks: blocksOf(laid),
    gaps,
    asideBand,
    portrayed,
    appeared,
    theory: reaction.theory,
    simileTarget,
    motifs: usedMotifs,
    imageMotifs: laid.filter((l) => l.image).map((l) => l.motifs),
  };
}

/* ------------------------------------------------------------------ *
 * The pieces.
 * ------------------------------------------------------------------ */

function blocksOf(laid: Laid[]): Block[] {
  return laid.map((l) => l.block);
}

function capitalize(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** The tail of a business line, for spotting it inside a woven portrait. */
function trimTail(text: string): string {
  return text.trim().replace(/[.!?]+$/, '');
}

function sharedWith(motifs: readonly string[] | undefined, set: ReadonlySet<string>): number {
  if (!motifs) return 0;
  let n = 0;
  for (const m of motifs) if (set.has(m)) n += 2;
  return n;
}

/** Which simile targets a block of this voice can be a clause of. */
function hostedTargets(voice: ProseVoice | null): string[] {
  if (voice === null) return [];
  const out: string[] = [];
  for (const [target, voices] of Object.entries(SIMILE_HOSTS)) {
    if (voices.includes(voice)) out.push(target);
  }
  return out;
}

/** The portrait motifs of whoever the page is about (§A.2's "clue's subject"). */
function subjectPortraitMotifs(stage: Stage, scene: Scene, person: Person | undefined): string[] {
  const out: string[] = [];
  const add = (id: Id | undefined): void => {
    for (const m of (id && stage.cast.portraits[id]?.motifs) ?? []) if (!out.includes(m)) out.push(m);
  };
  add(person?.id);
  if (scene.kind === 'travel' || scene.kind === 'look') {
    for (const p of stage.here.slice(0, 2)) add(p.id);
  }
  return out;
}

/** §A.6: the prop the line before named, as the opening of the thought after. */
function carryNoun(dealer: Dealer, before: readonly string[]): string | null {
  const props = before.filter((m) => PROP_MOTIFS.has(m));
  if (props.length === 0) return null;
  // Sparingly. The device works because it is rare.
  if (!dealer.random.chance(0.35)) return null;
  const noun = dealer.random.pick(props);
  return dealer.random.pick(CARRY_TEMPLATES).split('{noun}').join(noun);
}

/**
 * §A.4 — the presence roll as one sentence. "Carbone at the far end, Mosley
 * near the door, and Doyle behind the bar." Roles appear only for somebody not
 * yet met.
 *
 * A role is itself set off by commas — "Ainsworth, the landlady, in the hall" —
 * so a comma between the people as well gives a reader four commas and no way
 * to tell which of them separates two people: "Dandridge by the window,
 * Ainsworth, the landlady, in the hall" reads as three people, one of them
 * called The Landlady. When any clause carries a role the list goes up a level
 * and is separated by semicolons instead, and either way the last of three or
 * more is introduced by "and", so the end of the list is audible.
 */
export function presenceSentence(stage: Stage): string {
  const { view } = stage;
  const place = view.placeById.get(stage.at);
  const guests = GUEST_POSTS[place?.kind ?? 'semi'] ?? (GUEST_POSTS.semi as string[]);
  const clauses: string[] = [];
  let hasRole = false;
  let group: { post: string; names: string[] } | null = null;
  const flush = (): void => {
    if (!group) return;
    clauses.push(`${listOf(group.names)} ${group.post}`);
    group = null;
  };
  for (const [i, person] of stage.here.entries()) {
    const isWatcher = place?.watcher !== undefined && person.fixtureRole === place.watcher;
    const post = isWatcher
      ? (WATCHER_POSTS[person.fixtureRole as string] ?? (guests[0] as string))
      : (guests[i % guests.length] as string);
    const met = stage.met.includes(person.id);
    if (!met) {
      flush();
      hasRole = true;
      clauses.push(`${person.surname}, ${person.role}, ${post}`);
      continue;
    }
    if (group && group.post === post) group.names.push(person.surname);
    else {
      flush();
      group = { post, names: [person.surname] };
    }
  }
  flush();
  return clauses.length === 0 ? '' : `${capitalize(joinClauses(clauses, hasRole))}.`;
}

/**
 * The people in the room, as one list. Semicolons where a clause has a role
 * with commas of its own; "and" before the last of three or more, where it
 * marks the end of the list rather than getting in the way of a pair.
 */
export function joinClauses(clauses: string[], hasRole: boolean): string {
  if (clauses.length <= 1) return clauses[0] ?? '';
  const sep = hasRole ? '; ' : ', ';
  if (clauses.length === 2) return clauses.join(sep);
  const last = clauses[clauses.length - 1] as string;
  return `${clauses.slice(0, -1).join(sep)}${sep}and ${last}`;
}

function listOf(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function presenceBlock(stage: Stage): Block {
  const ids = stage.here.map((p) => p.id);
  const text = presenceSentence(stage);
  return text.length > 0
    ? { kind: 'presence', personIds: ids, text }
    : { kind: 'presence', personIds: ids };
}

/**
 * §A.3 — find a block this page's simile can be a clause of, and make it one.
 * Returns the target, or null when nothing on the page hosts one.
 */
function placeSimile(
  stage: Stage,
  laid: Laid[],
  wanted: string[],
  slots: Slots,
  ctx: MotifContext,
): string | null {
  const { dealer } = stage;
  const cap = (c: Card): boolean => {
    const i = tagOf('similes', c, 'intensity');
    return typeof i === 'number' && i <= (stage.showedOff ? 2 : 3);
  };
  for (const target of wanted) {
    // The last block that can host it: a simile falls after what it is about.
    let host = -1;
    for (let i = 0; i < laid.length; i++) {
      if ((laid[i] as Laid).targets.includes(target)) host = i;
    }
    if (host < 0) continue;
    const block = laid[host] as Laid;
    const gender = genderOfBlock(stage, block, target);
    const fits = (c: Card): boolean =>
      cap(c) &&
      tagIs('similes', c, 'target', target) &&
      (gender === 'any' || tagIs('similes', c, 'gender', gender));
    if (!dealer.has('similes', fits, ctx)) continue;
    const drawn = dealer.draw('similes', [fits], slots, true, ctx);
    if (!drawn) continue;
    const b = block.block;
    if (b.kind !== 'prose') continue;
    block.block = { ...b, text: attachSimile(b.text, drawn.text) };
    for (const m of drawn.motifs) if (!block.motifs.includes(m)) block.motifs.push(m);
    return target;
  }
  return null;
}

/**
 * Whose gender a simile has to agree with. Only for a target that is a body or
 * a voice: "her hands" on a man is the tell the tag exists for, and a simile
 * about the street does not have a gender to get wrong.
 */
function genderOfBlock(stage: Stage, block: Laid, target: string): 'm' | 'f' | 'any' {
  if (!GENDERED_TARGETS.has(target) && !BODY_MOTIFS.has(target)) return 'any';
  const person = block.personId ? stage.view.personById.get(block.personId) : undefined;
  return person ? genderHintOf(person) : 'any';
}

/** The ask kinds where the question is about the person being asked. */
export const ASK_ABOUT_ADDRESSEE: ReadonlySet<AskKind> = new Set<AskKind>([
  'ask-evening',
  'ask-hired',
]);

/**
 * Every slot the exchange is built with, and what each one means.
 *
 *   {name}       the subject of the question — who or what is being asked
 *                about. Never the person being spoken to, unless they are
 *                also the subject.
 *   {subject}    the same, under the name the utterance deck uses for it.
 *   {addressee}  the person being spoken to. A vocative, nothing more.
 *   {place}      the place the question is about, or the room they are
 *                standing in when the question is about neither.
 *   {object}     the thing the question is about, else the case's evidence.
 *   {detective}  Dashiell, always.
 *   {topic}      the thread as the player clicked it, verbatim.
 */
export function askSlots(
  base: Slots,
  scene: Extract<Scene, { kind: 'ask' }>,
  addressee: string | undefined,
): Slots {
  const topic = scene.topicSlots;
  const subject = ASK_ABOUT_ADDRESSEE.has(scene.askKind) ? addressee : topic.subject;
  return {
    ...base,
    place: topic.place ?? base.place,
    object: topic.object ?? base.object,
    name: subject,
    subject,
    addressee,
    topic: scene.topicLabel,
  };
}

/* ------------------------------------------------------------------ *
 * §B.2 — page one.
 * ------------------------------------------------------------------ */

interface OpenTools {
  say: (text: string, voice: ProseVoice, opts?: SayOpts) => void;
  put: (block: Block) => void;
  base: Slots;
  ctx: MotifContext & { before: string[] };
  gaps: string[];
  portrayed: Id[];
  appeared: Id[];
}

/**
 * The office at midnight, somebody on the stairs, and a retainer on the
 * blotter. Four beats, in order: where he is, who came in, what the job is and
 * what it pays, and then two questions on the house.
 */
function openTheOffice(stage: Stage, scene: Extract<Scene, { kind: 'open' }>, t: OpenTools): void {
  const { view, cast, dealer } = stage;
  const client = view.client;
  const place = view.placeById.get(stage.at);
  const klass = classOf(client);
  const temper = temperOf(cast, client.id);
  const familiar = knowsHim(cast.roll, client.id);
  const gender = genderHintOf(client);
  const retainer = retainerFor(klass);
  const slots: Slots = { ...t.base, name: client.surname, subject: client.surname, retainer };

  t.put({
    kind: 'note',
    text: `Midnight. ${capitalize(place?.name ?? 'the office')}, ${view.kase.neighborhood}.`,
  });

  /* 1. The office at this hour. */
  const office = officeCard(dealer, cast.roll.circumstance, cast.roll.weather, slots, t.ctx);
  if (office.gap) t.gaps.push(office.gap);
  t.say(office.text, 'place', { motifs: office.motifs, score: office.score, keep: 2 });

  /* 2. The entrance, with the client's portrait woven into it (§A.4). */
  const entrance = entranceCard(
    dealer,
    { temper, klass, gender, familiar },
    cast.roll.weather,
    slots,
    t.ctx,
  );
  if (entrance.gap) t.gaps.push(entrance.gap);
  const portrait = describePerson({
    cast,
    personId: client.id,
    surname: client.surname,
    times: stage.appearances[client.id] ?? 0,
    pronoun: pronounOf(client),
    nth: stage.pageIndex,
  });
  t.appeared.push(client.id);
  t.portrayed.push(client.id);
  t.say(joinSentences(entrance.text, portrait), 'presence', {
    personId: client.id,
    motifs: [...entrance.motifs, ...(cast.portraits[client.id]?.motifs ?? [])],
    score: entrance.score,
    keep: 2,
  });

  /* 3. The hiring: the client's own clue, and the money. */
  const clue = scene.clientClue;
  const fact = clue ? stripAttribution(clue.text, client.surname) : null;
  const hiring = hiringFrame(dealer, { temper, klass, gender, familiar }, { ...slots, fact: fact ?? undefined }, t.ctx);
  if (hiring.gap) t.gaps.push(hiring.gap);
  if (fact === null) {
    t.gaps.push('no-client-clue: the case has no client brief; the hiring says only what it pays');
  }
  t.say(hiring.text, 'exchange', {
    ...(clue ? { clueId: clue.id } : {}),
    personId: client.id,
    motifs: hiring.motifs,
    score: hiring.score,
  });

  /* 4. Two questions on the house, while he is still standing there. */
  t.put({
    kind: 'note',
    text: `${client.surname} is still in the chair. Two questions on the house — a man hiring you answers his questions.`,
  });
}

/**
 * The client brief is written as a record — "Dandridge hired us, and wants it
 * known that…". On page one he is in the room saying it, so the attribution
 * comes off and what is left is what he said.
 */
export function stripAttribution(text: string, surname: string): string {
  const name = surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${name}\\s+hired\\s+us,\\s*and\\s+wants\\s+it\\s+known\\s+that\\s+`, 'i');
  const m = re.exec(text);
  if (m) {
    const rest = text.slice(m[0].length).trim();
    if (rest.length > 0) return capitalize(rest);
  }
  return text;
}

/* ------------------------------------------------------------------ *
 * Cards.
 * ------------------------------------------------------------------ */

function plainArrival(dealer: Dealer, shortName: string | undefined): string {
  return tidyPunctuation(
    dealer.random.pick(PLAIN_ARRIVALS).split('{place}').join(shortName ?? 'the address'),
  );
}

function nothingLeft(dealer: Dealer, shortName: string | undefined): string {
  return tidyPunctuation(
    dealer.random.pick(NOTHING_LEFT).split('{place}').join(shortName ?? 'the room'),
  );
}

function nothingLine(dealer: Dealer, tag: NothingLine['tag'], slots: Slots): string {
  const pool = NOTHING_LINES.filter((l) => l.tag === tag);
  const line = dealer.random.pick(pool);
  let text = line.text;
  for (const [k, v] of Object.entries(slots)) {
    if (v === undefined) continue;
    text = text.split(`{${k}}`).join(v);
  }
  return tidyPunctuation(text.replace(/\{[a-z]+\}/g, 'it'));
}

interface Rendered {
  text: string;
  motifs: string[];
  score: number;
}

function placeCard(
  dealer: Dealer,
  view: CaseView,
  placeId: Id,
  ctx: MotifContext,
): Rendered | null {
  const place = view.placeById.get(placeId);
  if (!place) return null;
  const slots: Slots = { place: place.shortName };
  const watcher = place.watcher ?? 'none';
  const empty = (view.peopleAt.get(placeId) ?? []).length === 0 ? 'yes' : 'no';
  const kind = (c: Card): boolean => tagIs('places', c, 'placeKind', place.kind);
  // An unwatched room never widens onto a watcher's furniture.
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
  const drawn = dealer.draw('places', ladder, slots, true, ctx);
  if (drawn) return { text: drawn.text, motifs: drawn.motifs, score: drawn.score };
  // The M3 stopgap: twelve hand-written lines for a room with nobody posted
  // in it, kept until the places deck has its unwatched cards.
  const pool = ROOM_LINES.filter((l) => l.placeKind === place.kind);
  if (pool.length === 0) return null;
  return {
    text: dealer.random.pick(pool).text.split('{place}').join(place.shortName),
    motifs: placeMotifs(place),
    score: 0,
  };
}

function findLine(
  dealer: Dealer,
  view: CaseView,
  clue: Clue,
  placeId: Id,
  base: Slots,
  ctx: MotifContext,
): Rendered {
  const placeKind = view.placeById.get(placeId)?.kind ?? 'semi';
  const kind = findKindOf(clue);
  if (kind === null) return { text: clue.text, motifs: [], score: 0 };
  const drawn = dealer.draw(
    'find',
    [
      (c) => tagIs('find', c, 'clueKind', kind) && tagIs('find', c, 'placeKind', placeKind),
      (c) => tagIs('find', c, 'clueKind', kind),
    ],
    { ...base, fact: clue.text },
    true,
    ctx,
  );
  if (!drawn) return { text: clue.text, motifs: [], score: 0 };
  const card = DECKS.find.find((c) => c.id === drawn.cardId);
  return {
    text: factOnPage(card?.text ?? '', drawn.text, clue.text),
    motifs: drawn.motifs,
    score: drawn.score,
  };
}

/**
 * A find card that carries `{fact}` has the record inside it already, where
 * the writer put it. One that does not describes the coming-upon and then
 * stops, and the fact it was dealt for would go on the floor. The player never
 * loses information: the card is the first sentence and the record the second.
 */
export function factOnPage(cardText: string, rendered: string, fact: string): string {
  if (cardText.includes('{fact}')) return rendered;
  return joinSentences(rendered, fact);
}

function lastClue(scene: Scene): Clue | null {
  if (scene.kind === 'ask') return scene.clues[scene.clues.length - 1] ?? scene.volunteer ?? null;
  if (scene.kind === 'examine') return scene.clues[scene.clues.length - 1] ?? null;
  if (scene.kind === 'travel') return scene.openingClues?.[scene.openingClues.length - 1] ?? null;
  if (scene.kind === 'open') return scene.clientClue;
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
  say: (text: string) => void,
  put: (block: Block) => void,
  scene: Extract<Scene, { kind: 'ask' }>,
  person: Person | undefined,
  temper: Temper,
  register: Register,
  familiar: boolean,
  slots: Slots,
  dashiell: string,
  exclude: ReadonlySet<string>,
  gaps: string[],
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
    { clueId: '', text: fact, rest: [], mode: 'utterance', cardIds: [] },
    person,
    temper,
    register,
    familiar,
    slots,
    dashiell,
    exclude,
    gaps,
  );
  say(answer.text);
  put({ kind: 'timeline', personId: scene.personId, rows: account.rows });
}

export { askKindOf, clientLeavingLine };
