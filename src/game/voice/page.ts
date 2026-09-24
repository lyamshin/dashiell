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

import type { Clue, Id, Person } from '../../gen/types.js';
import type { Rng } from '../../gen/rng.js';
import { spokenClock } from '../../gen/types.js';
import { NIGHT_MINUTES } from '../types.js';
import type { BeatTrace, Block, ErrandTrace, PageShape, ProseVoice, RunState, SceneMemory, SheetUse } from '../types.js';
import { officeFrame, personRoleSlots } from '../scene/sheet-pages.js';
import { sheetsOn } from '../scene/realize.js';
import type { ConfrontJudgement, ConfrontRecord } from '../m9.js';
import { markedTheory, verdictsOn } from '../m9.js';
import { composeScene, isNightScene } from '../scene/index.js';
import { OTHER_THING, type ErrandPlan } from '../errand.js';
import type { CaseView, ClaimedAccount, Established } from '../derive.js';
import { clueTick, establishedFrom } from '../derive.js';
import {
  CARRY_TEMPLATES,
  FAMILIAR_GREETINGS,
  GUEST_POSTS,
  HIRING_DASHIELL,
  NOTHING_LINES,
  NOTHING_LEFT,
  PLAIN_ARRIVALS,
  PLAIN_TRANSITIONS,
  ROOM_LINES,
  WATCHER_POSTS,
  type NothingLine,
} from '../voice-data.js';
import {
  DECKS,
  Dealer,
  motifsOf,
  tagIs,
  tagOf,
  type Card,
  type Match,
  type Slots,
  type TagValue,
} from './cards.js';
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
  recallClause,
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
  selfQuestion,
  speakClue,
  type AskKind,
  type Register,
  type SpokenClue,
} from './exchange.js';
import { findKindOf } from './facts.js';
import {
  BRIEFING_SETTLE,
  PLAIN_BEATS,
  OFFICE_BEATS,
  PLAIN_FLOOR,
  PLAIN_NOTED,
  PLAIN_STOCK,
  SELF_ALREADY,
  SELF_QUESTIONS,
  briefingQuestion,
  fillPlain,
  clueAbout,
  connective,
  pickShape,
  type ConnectiveKind,
  countSentences,
  dossierKnown,
  layerOfClue,
  layerSentences,
  onSightSentence,
  opensOnSubject,
  pronounSubject,
  seenSentence,
  openingNote,
  plainRatio,
  type PlainCount,
} from './plain.js';
import { knowsHim } from './roll.js';
import { reactiveMonologue, type ReactiveResult } from './reactive.js';
import {
  BODY_MOTIFS,
  PROP_MOTIFS,
  bodyConflict,
  bodyWordsOf,
  pageMotifSet,
  placeMotifs,
  type MotifContext,
} from './motifs.js';
import {
  OFFICE_ASK_POLICE,
  OFFICE_ASK_START,
  OFFICE_ASK_WHY,
  OFFICE_FIRST_BEAT,
  arrivalAtom,
  clientLeavingLine,
  entranceCard,
  hiringFrame,
  officeCard,
  officePlan,
  officeTurns,
  pronounOfficeTurns,
  retainerFor,
  speechParagraphs,
  splitBriefing,
} from './office.js';
import { characterLine, echoes } from './character.js';

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
  'mouth',
  'clothes',
  'body',
  // A `lie` simile is about the mouth it came out of — "Her denial came out
  // flat as a nickel on a bar" — and twenty-two of the twenty-four cards under
  // that target name a pronoun. It was not on this list, which is how a man
  // got a "her".
  'lie',
]);

/**
 * What a simile is a simile *about*, where its own words say so.
 *
 * A card that names a register is making a claim about the line it modifies:
 * "Her denial came out flat" says the line was a denial, and putting it after
 * an answer that denied nothing — or after Dashiell's own goodbye — is the
 * engine asserting something the page does not contain. So a card whose text
 * names one binds only to a line delivered in that register, and to no other
 * block at all. The words are few and they are the load-bearing ones; anything
 * else in the deck carries no register and goes wherever its target does.
 */
const REGISTER_WORDS: [RegExp, Register][] = [
  [/\b(?:denial|denials|denied|lie|lies|lied|lying)\b/i, 'lie'],
  [/\b(?:truth|truthful|confession|confessed)\b/i, 'truth'],
];

export function simileRegister(text: string): Register | null {
  for (const [re, register] of REGISTER_WORDS) if (re.test(text)) return register;
  return null;
}

/**
 * Which of the two registers a block reads as, for the rule above. The
 * exchange's own three registers collapse to two here: an evasion and a lie
 * are both a line that is not the truth, and that is the whole of what a
 * simile about a denial needs to know.
 */
export function simileRegisterOf(register: Register, kind?: string): Register {
  return register !== 'truth' || kind === 'denial' ? 'lie' : 'truth';
}

/**
 * Dashiell's own lines in an exchange. A simile about a voice, a mouth or a
 * denial belongs to the person being interviewed; hung on the detective's
 * goodbye it describes a speaker who is not there — "'That's all for now.'
 * Her denial came out flat as a nickel on a bar." A pause is the one thing his
 * line can be about, so `silence` stays and nothing else does.
 */
export const DASHIELL_TARGETS: string[] = ['silence'];

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
      /** M6 §2: why he came, planned by the reducer out of the notebook. */
      errand?: ErrandPlan;
    }
  | { kind: 'look' }
  /** M11 §A.5: the client names who is in the room. */
  | { kind: 'rundown' }
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
      /**
       * M5 §3 — `ask X about themselves`. Layer 1 of their dossier, in their
       * own mouth, cut to their temper. `told` means they have given it
       * already, which is free and gets nothing.
       */
      self?: {
        told: boolean;
        lines: string[];
        /** M11 §A.3: who they were to the dead, in their words (a suspect's tie). */
        tie?: string[];
        /** M11 §A.3: how they came to the work, which leads when the question asked how long. */
        history?: string;
        /** A yapper's layer-2 fact about somebody else. */
        gossip?: { personId: Id; text: string };
      };
      volunteer: Clue | null;
      free: boolean;
      /** M8: the topic as the parser read it, so the planner knows what kind of question it was. */
      topicRef?: { kind: string; id?: Id; topic?: string };
      /** That was the second free question and the client has a bus to catch. */
      clientLeaves?: boolean;
      /** M10 §A.3: this page goes on with a conversation "Go on" continued. */
      continued?: boolean;
      /** M10 §A.3: there is more to tell, and the page ends on "Go on". */
      more?: boolean;
    }
  | { kind: 'examine'; placeId: Id; objectId?: Id; clues: Clue[]; continued?: boolean; more?: boolean }
  /** M9 §3: a fact from the notebook put to somebody, and what came of it. */
  | { kind: 'confront'; personId: Id; clue: Clue; judged: ConfrontJudgement; part?: number; follow?: boolean }
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
  /**
   * M6 §3. Minutes past midnight before it was paid for, so the page knows
   * whether this action carried the clock across an hour.
   */
  minutesBefore?: number;
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
  /** M5 §3: people who have already given an account of themselves. */
  selfTold: Id[];
  /** M5 §3: people a yapper has already given up a layer-2 fact about. */
  gossip: Id[];
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
  /** M8: the scene's memory before this page — visits, activities, bridges. */
  memory?: SceneMemory;
  /** M8: rooms with a page before this one. */
  visitedBefore?: Id[];
  /** Night Hone 1: people an earlier page has named, and so said who they are. */
  namedBefore?: Id[];
  /** M9: the player's pencil, which is all the monologue may read for a theory. */
  marks?: RunState['marks'];
  /** M9: every fact put to somebody so far. */
  confronts?: ConfrontRecord[];
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
  /** M5 §1: sentences on this page that carry no image, and sentences that do. */
  plain: number;
  image: number;
  /** M6 §2: the errand line this page opened on, as the checker traces it. */
  errand?: ErrandTrace;
  /** M8 §1: the page's shape, its beats as written, and the scene's memory after it. */
  shape?: PageShape;
  beats?: BeatTrace[];
  memory?: SceneMemory;
  /** M13: the sheets the page was written from. */
  sheets?: SheetUse[];
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
const WORD_TARGET_HIGH = 200;

/**
 * The hard ceiling a page is trimmed down to, and page one's own.
 *
 * M6 §5 took it from 300 to 220: the page is prose and then choices now, and
 * on a 1280×800 window the first group of choices has to be on the screen
 * without anybody scrolling for it. `CUT_ORDER` does the cutting as before —
 * thinking first, then texture — and the errand line is never among it.
 */
export const PAGE_CEILING = 220;
/**
 * M11 §A.1: page one runs the golden's length. The golden office page is
 * about 400 words: the entrance with the gloves in it, six turns of her
 * talking and three of his questions. At 380 the entrance was the texture
 * the ceiling cut first, and the page lost the one thing the reader sees.
 */
export const OPENING_CEILING = 440;

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
  /** Whether this line was delivered as the truth or as something else (§A.3). */
  register?: Register;
  /** Higher survives the image trim. */
  keep: number;
  /** §1's measurement: how many of this block's sentences carry no image. */
  plainN: number;
  /** ...and how many came off a deck card that does. */
  imageN: number;
  /** This block has the page's one simile attached to it and cannot be cut. */
  hosts?: boolean;
  /**
   * Which paragraph this line belongs to (the golden loop, §2's joiners).
   *
   * A block is not a paragraph. The engine wrote one paragraph per `say`,
   * which is how a page of twelve blocks became twelve paragraphs of twenty
   * words, each opening on a subject the one before it had never mentioned —
   * the disjointedness GAP.md measures as paragraph cohesion. The golden
   * writes the walk and the room it ends in as one paragraph, the entrance and
   * the portrait and what she is as another, and each find with the fact that
   * rode along on it as a third. Adjacent blocks carrying the same tag are
   * joined at the end of assembly, while the paragraph stays a paragraph.
   */
  para?: string;
  /**
   * The generator's own sentences inside this block, exactly as it wrote them.
   * §5's join puts a sentence's first letter down to make a clause of it, and
   * a sentence the generator wrote has to reach the page as it was written, so
   * the join steps over any pair whose second half is one of these. It is the
   * pair that is spared and not the paragraph: a paragraph with one of the
   * generator's sentences in it may still carry the page's long one.
   */
  verbatim?: string[];
}

/** The longest a fused paragraph may get. Past this it is a wall, not a scene. */
export const PARAGRAPH_CEILING = 60;

/** M13: the office's first paragraph, the hour, the room and a line of the sheet's. */
export const OFFICE_PARAGRAPH_CEILING = 72;

/**
 * §5's carrying sentence: the band a joined pair has to land in to be one.
 *
 * The style guide measures the corpus at a mean of 11.9 words and a p90 of 24,
 * and says the tail is the whole game. `style-metrics.py` counts anything over
 * twenty-five, and the golden runs one such sentence in eleven. Below the low
 * mark a join buys nothing; above the high mark it is not a carrying sentence,
 * it is a run-on.
 */
export const CARRY_LOW = 22;
export const CARRY_HIGH = 34;

interface SayOpts {
  clueId?: Id;
  motifs?: readonly string[];
  score?: number;
  personId?: Id;
  keep?: number;
  /** Override the default host list for this block's voice. */
  targets?: string[];
  /** For a spoken line: which register a simile about it would have to match. */
  register?: Register;
  /**
   * §1's measurement, where the voice alone does not decide it: a find is a
   * card and a record in one paragraph, and a framed answer carries as many
   * image sentences as the business and colour beats spliced into it.
   */
  imageSentences?: number;
  /**
   * M5 §1: a plain sentence is transparent to §A.2's adjacency bonus. A
   * connective carries no motif by design, and letting it reset the context
   * would mean every image card after it was scored against nothing — which
   * is how the plain register would quietly undo M4b's closeness.
   */
  transparent?: boolean;
  /** Which paragraph this line joins. See `Laid.para`. */
  para?: string;
  /**
   * This line is the generator's words and reaches the page exactly as they
   * were written. §5's carrying sentence leaves it alone: it joins two
   * sentences with a comma and puts the second one's first letter down, which
   * alters nothing a reader would call a word and everything a checker would.
   */
  verbatim?: boolean;
}

export function composePage(stage: Stage, scene: Scene): Composed {
  // M8 §1: every page after the office is planned, then written.
  if (isNightScene(scene)) return composeScene(stage, scene);
  const { view, cast, dealer } = stage;
  const gaps: string[] = [];
  /** M13: the sheets this page used (the office's). */
  const pageSheetUses: SheetUse[] = [];
  const laid: Laid[] = [];
  const portrayed: Id[] = [];
  const appeared: Id[] = [];
  const band = hourBandOf(stage.minutes);
  const place = view.placeById.get(stage.at);
  const base: Slots = {
    detective: stage.detectiveName,
    place: place?.shortName,
    object: view.objectById.get(view.kase.method.evidenceObjectId)?.name,
    // §A.3: an hour on a page is an hour somebody says, never a clock face.
    // And it is an hour the page is allowed to name: the open end of the
    // coroner's window, which the briefing states and every page may print.
    // It used to be six o'clock — tick zero, a default rather than a fact —
    // so "Where were you at 6:00 PM?" asserted an hour nothing accounted for.
    time: spokenClock(view.kase.coronerWindow[0]),
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
    // §1's measurement. A block off an image-bearing deck is image all the way
    // through; everything else — the plain register, a record, a fact in
    // somebody's mouth, a thought about the board — is plain, except for the
    // sentences a caller declares came off a card.
    const sentences = countSentences(trimmed);
    const imageN = Math.min(
      sentences,
      opts.imageSentences ?? (IMAGE_VOICES.has(voice) ? sentences : 0),
    );
    laid.push({
      block,
      image: IMAGE_VOICES.has(voice),
      motifs,
      score: opts.score ?? 0,
      targets: opts.targets ?? hostedTargets(voice),
      ...(opts.personId === undefined ? {} : { personId: opts.personId }),
      ...(opts.register === undefined ? {} : { register: opts.register }),
      keep: opts.keep ?? 1,
      plainN: sentences - imageN,
      imageN,
      ...(opts.para === undefined ? {} : { para: opts.para }),
      ...(opts.verbatim === true ? { verbatim: [trimmed] } : {}),
    });
    for (const m of motifs) if (!usedMotifs.includes(m)) usedMotifs.push(m);
    if (opts.transparent !== true) ctx.before = motifs;
  };
  // A block the engine wrote out of the case's own fields: the roll of who is
  // in the room, a claimed timeline, a note. Plain by construction.
  const put = (block: Block, para?: string, verbatim?: boolean): void => {
    laid.push({
      block,
      image: false,
      motifs: [],
      score: 0,
      targets: hostedTargets(null),
      keep: 9,
      plainN: plainSentencesIn(block),
      imageN: 0,
      ...(para === undefined ? {} : { para }),
      ...(verbatim === true && (block.kind === 'note' || block.kind === 'prose')
        ? { verbatim: [block.text] }
        : {}),
    });
  };

  /* ------------------------------------------ §1 and §3: the plain register */
  // One connective at a time, and never the same shape twice running.
  // Every connective the page has already spent, not just the last one: the
  // plain top-ups run after the arrival did, and a page that says "Nobody
  // stopped me at the door of the cab stand" twice has said it once too often.
  const spentConnectives: string[] = [];
  const plainly = (
    kind: Parameters<typeof connective>[1],
    plainSlots: Slots = {},
    para?: string,
  ): void => {
    const line = connective(dealer.random, kind, plainSlots, spentConnectives);
    if (line.length === 0) return;
    spentConnectives.push(line);
    say(line, 'narrator', {
      transparent: true,
      verbatim: true,
      ...(para === undefined ? {} : { para }),
    });
  };
  // Layer 0, the moment somebody is in front of him: what a longshoreman's
  // hands and a chambermaid's uniform say before anybody opens their mouth.
  const onSight = (person: Person, para?: string): void => {
    if (stage.met.includes(person.id) || person.kind === 'victim') return;
    // A page already at its length says the fact and stops; the dossier is in
    // the notebook either way, and a room with ten things in it is long enough.
    if (words(blocksOf(laid)) > WORD_TARGET_HIGH) return;
    const line = onSightSentence(person);
    if (line.length === 0) return;
    say(line, 'narrator', { transparent: true, ...(para === undefined ? {} : { para }) });
  };
  // §3: a layer-2 fact rides along with the observation or the overheard line
  // that was about that person, one fact a clue, and is set down plainly after
  // the fact rather than dressed up as something somebody said.
  const ridden = new Map<Id, number>();
  const learned = {
    found: stage.foundBefore,
    met: stage.met,
    selfTold: stage.selfTold,
    gossip: stage.gossip,
  };
  const rideAlong = (clue: Clue, para?: string): void => {
    if (layerOfClue(clue) !== 2) return;
    if (words(blocksOf(laid)) > WORD_TARGET_HIGH) return;
    const about = clueAbout(clue);
    if (!about || about === view.victim.id) return;
    const person = view.personById.get(about);
    if (!person) return;
    const known = dossierKnown(view, about, learned);
    const used = ridden.get(about) ?? 0;
    const next = layerSentences(person, 2)[known.layer2.length + used];
    if (next === undefined) return;
    ridden.set(about, used + 1);
    say(next, 'narrator', {
      transparent: true,
      verbatim: true,
      ...(para === undefined ? {} : { para }),
    });
  };

  /* ------------------------------------------------------- M6 §2: why */
  // First on the page and set apart. Dealt from the errand deck on the tags
  // the reducer derived; the slots are the notebook's own words, and the
  // passes below never touch the block, so the checker can trace it verbatim.
  let errand: ErrandTrace | undefined;
  if (scene.kind === 'travel' && scene.errand) {
    const text = errandLine(dealer, scene.errand, { ...base, ...scene.errand.slots }, gaps);
    if (text.length > 0) {
      say(text, 'errand', { transparent: true, verbatim: true, keep: 99 });
      errand = { ...scene.errand, text };
    }
  }

  /* --------------------------------------------- §B.2.4: the client leaves */
  // Before the walk, because the walk is what he leaves for: two questions on
  // the house, or the detective picking up his hat, and the visit is over.
  if ((scene.kind === 'ask' || scene.kind === 'travel') && scene.clientLeaves) {
    const client = view.client;
    say(
      clientLeavingLine(
        dealer,
        client.surname,
        view.placeById.get(client.foundAt ?? '')?.shortName ??
          `the address ${pronounOf(client)} gave me`,
      ),
      'narrator',
    );
  }

  /* -------------------------------------------------------- transition */
  if (stage.cost > 0 && scene.kind !== 'open') {
    // M6 §3: the clock speaks for itself when it has something to say — two
    // calls left, the last call, an hour gone past — and when it does, it is
    // the passage of time on this page and the transition is not dealt.
    const beat = clockBeat(dealer, stage, gaps);
    if (beat !== null) {
      say(beat, 'narrator', { transparent: true, verbatim: true, keep: 9, para: 'walk' });
    } else {
      const drawn = drawTransition(dealer, view, band, base, ctx);
      say(drawn?.text ?? dealer.random.pick(PLAIN_TRANSITIONS), 'transition', {
        motifs: drawn?.motifs,
        score: drawn?.score,
        para: 'walk',
      });
    }
  }

  /* --------------------------------------------- §B.2: the office opening */
  if (scene.kind === 'open') {
    openTheOffice(stage, scene, {
      say,
      put,
      count: () => words(blocksOf(laid)),
      shortShare: () => shortShare(laid),
      base,
      ctx,
      gaps,
      portrayed,
      appeared,
      sheets: pageSheetUses,
    });
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
        para: 'walk',
      });
      plainly('arriving', { place: place?.shortName }, 'walk');
    }
    if (!stage.describedPlaces.includes(stage.at)) {
      const card = placeCard(dealer, view, stage.at, ctx);
      say(card?.text ?? plainArrival(dealer, place?.shortName), 'place', {
        motifs: card?.motifs,
        score: card?.score,
        para: 'walk',
      });
    } else if (scene.kind === 'look') {
      say(plainArrival(dealer, place?.shortName), 'narrator', { para: 'walk' });
    }
    // §5's rhythm: a short sentence at the foot of the room, inside the room's
    // own paragraph. Four words after a twenty-word card is the shape the
    // golden's pages have and the engine's did not.
    say(pickShape(dealer.random, PLAIN_STOCK, { place: place?.shortName }), 'narrator', {
      transparent: true,
      para: 'walk',
    });
    put(presenceBlock(stage));
    if (stage.here.length > 0) {
      plainly(
        'present',
        { name: (stage.here[0] as Person).surname, place: place?.shortName },
        'room',
      );
    } else if (scene.kind === 'look') {
      // An empty room the detective walked into says so once, in the presence
      // roll; an empty room he came back to gets the half hour he spent in it.
      plainly('quiet', {}, 'room');
    }
    for (const person of stage.here.slice(0, 2)) onSight(person, 'room');
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
        {
          motifs: portrait?.motifs,
          personId: person.id,
          score: sharedWith(portrait?.motifs, motifSet),
          para: 'room',
        },
      );
      appeared.push(person.id);
      if (!seen) portrayed.push(person.id);
    }
  }

  /* ---------------------------------------------- first sight of the scene */
  if (scene.kind === 'travel' && scene.openingClues && scene.openingClues.length > 0) {
    const firstOpening = scene.openingClues[0];
    // The note says what room this is; the first thing found in it says what
    // is in the room. One paragraph, the way the golden writes a room.
    put({ kind: 'note', text: openingNote(view, stage.at) }, `find-${firstOpening?.id ?? 'note'}`, true);
    for (const clue of scene.openingClues) {
      const line = findLine(dealer, view, clue, stage.at, base, ctx);
      say(line.text, 'find', {
        clueId: clue.id,
        motifs: line.motifs,
        score: line.score,
        para: `find-${clue.id}`,
        ...(line.imageSentences === undefined ? {} : { imageSentences: line.imageSentences }),
      });
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

    /*
     * §B.2 — the follow-ups, capped and never bare.
     *
     * Two a page beyond the opening question. Past that the answer runs on:
     * the person is talking and nobody has to be seen prompting them. And a
     * follow-up names what it is asking about — the victim, the place, the
     * hour — because "And then?" could precede any answer in the game and a
     * reader hears the engine asking for the next card.
     */
    const followSlots: Slots = {
      ...slots,
      victim: view.victim.surname,
      ...(() => {
        const focus = lastClue(scene) ?? scene.clues[0] ?? null;
        const at = focus === null ? null : clueTick(focus);
        return at === null ? {} : { time: spokenClock(at) };
      })(),
    };
    const spentFollows: string[] = [];
    let follows = 0;
    /** One follow-up, or nothing at all. `after` is what was just said. */
    const askAgain = (after: string): void => {
      if (follows >= FOLLOW_CAP) return;
      const named = briefingQuestion(
        dealer.random,
        'follow-named',
        followSlots,
        spentFollows,
        after,
      );
      if (named.length === 0) {
        gaps.push(
          'nameless-follow-up: nothing on this page could be named in a follow-up; the answer ran on',
        );
        return;
      }
      spentFollows.push(named);
      follows++;
      say(`“${named}”`, 'exchange', {
        personId: scene.personId,
        targets: DASHIELL_TARGETS,
      });
    };

    /**
     * A clue that states two facts is two answers, not one breath. The first
     * answers the question; each one after it may get a follow-up in front of
     * it, while the page has one left to spend.
     */
    const sayTheRest = (spoken: SpokenClue, register: Register): void => {
      for (const more of spoken.rest) {
        askAgain(spoken.text);
        say(`"${more}"`, 'exchange', {
          clueId: spoken.clueId,
          personId: scene.personId,
          targets: spokenTargets(register),
          register,
        });
      }
    };

    /* approach — who they are, and what their hands are doing */
    const seen = stage.portrayed.includes(scene.personId);
    if (person) {
      // Hone 2 §A.2. The pair is fixed at case start, so the page knows what
      // this person's hands are already doing before it deals the gesture that
      // would contradict it.
      const approach = businessLine(
        dealer,
        person,
        temper,
        slots,
        usedBusiness,
        gaps,
        ctx,
        pairBodyWords(cast, scene.personId, stage.appearances[scene.personId] ?? 0),
      );
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
      if ((stage.appearances[scene.personId] ?? 0) === 0 && cast.portraits[scene.personId]?.pair === undefined) {
        gaps.push(
          `missing-pair: no portrait-pairs card fits ${person.surname}; the three-component portrait stood in`,
        );
      }
      const greeting =
        familiar && !seen
          ? dealer.random.pick(FAMILIAR_GREETINGS).split('{name}').join(person.surname)
          : '';
      // The business beat is inside the portrait when the weave used it; a
      // weave that did not use it sets it down after, as its own sentence.
      // Case-insensitively: the weave may have lower-cased the first letter to
      // set the beat down as a clause, and a case-sensitive `includes` then
      // missed it and printed the same gesture twice — "that was Carbone, a
      // hat goes round in two hands, brim to brim. A hat goes round in two
      // hands, brim to brim."
      const carriedBusiness =
        approach !== null &&
        portrait.toLowerCase().includes(trimTail(approach.text).toLowerCase());
      say(
        joinSentences(portrait, carriedBusiness ? '' : (approach?.text ?? ''), greeting),
        'approach',
        {
          personId: scene.personId,
          motifs: [...(cast.portraits[scene.personId]?.motifs ?? []), ...(approach?.motifs ?? [])],
          score: sharedWith(cast.portraits[scene.personId]?.motifs, motifSet),
          // A page whose whole business is this person keeps their portrait.
          keep: 2,
          para: 'approach',
        },
      );
      onSight(person, 'approach');
      if (scene.free) {
        put({ kind: 'note', text: `${person.surname} knew me from before, and that saved us both some time.` });
      }
    }

    /* Dashiell's line */
    const opener = scene.self
      ? null
      : dashiellLine(dealer, scene.askKind, familiar, slots);
    if (scene.self) {
      // M11 §A.3: a plain question about their life, by the kind of person.
      const line = person ? selfQuestion(dealer, person, person.kind === 'fixture' ? 'fixture' : classOf(person), familiar) : null;
      say(line?.text ?? dealer.random.pick(SELF_QUESTIONS), 'exchange', {
        personId: scene.personId,
        targets: DASHIELL_TARGETS,
      });
    } else {
      say(opener?.text ?? `“${scene.topicLabel},” I said.`, 'exchange', {
        personId: scene.personId,
        targets: DASHIELL_TARGETS,
      });
    }

    /* the answer */
    if (scene.account) {
      const register: Register = (view.liesOf.get(scene.personId)?.size ?? 0) > 0 ? 'lie' : 'truth';
      answerAccount(
        stage,
        (text, imageSentences) =>
          say(text, 'exchange', {
            personId: scene.personId,
            targets: spokenTargets(register),
            register: simileRegisterOf(register),
            imageSentences,
          }),
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
      if (i > 0) askAgain(scene.clues[i - 1]?.text ?? '');
      const register = registerFor(view, scene.personId, clue);
      const said = simileRegisterOf(register, clue.kind);
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
        pairBodyWords(cast, scene.personId, stage.appearances[scene.personId] ?? 0),
      );
      for (const id of answer.cardIds) usedBusiness.add(id);
      say(answer.text, spoken.mode === 'utterance' || spoken.mode === 'quote' ? 'exchange' : 'record', {
        clueId: clue.id,
        personId: scene.personId,
        targets: spokenTargets(said),
        register: said,
        imageSentences: answer.imageSentences,
      });
      sayTheRest(spoken, said);
      rideAlong(clue);
    }
    /* §3 — about themselves. Layer 1, in their own mouth. */
    if (scene.self) {
      answerSelf(stage, scene, person, temper, familiar, slots, usedBusiness, gaps, say, put);
    }

    if (scene.clues.length === 0 && !scene.account && !scene.self) {
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
        pairBodyWords(cast, scene.personId, stage.appearances[scene.personId] ?? 0),
      );
      const said = simileRegisterOf(register, scene.volunteer.kind);
      say(answer.text, spoken.mode === 'utterance' || spoken.mode === 'quote' ? 'exchange' : 'record', {
        clueId: scene.volunteer.id,
        personId: scene.personId,
        targets: spokenTargets(said),
        register: said,
        imageSentences: answer.imageSentences,
      });
      sayTheRest(spoken, said);
      rideAlong(scene.volunteer);
    }

    const closer = dashiellLine(dealer, 'close', familiar, slots);
    if (closer) say(closer.text, 'exchange', { personId: scene.personId, targets: DASHIELL_TARGETS });
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
      say(line.text, 'find', {
        clueId: clue.id,
        motifs: line.motifs,
        score: line.score,
        para: `find-${clue.id}`,
        ...(line.imageSentences === undefined ? {} : { imageSentences: line.imageSentences }),
      });
      rideAlong(clue, `find-${clue.id}`);
    }
    if (scene.clues.length === 0) {
      say(nothingLeft(dealer, place?.shortName), 'nothing', { para: 'empty' });
      plainly('quiet', {}, 'empty');
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
  let reaction: ReactiveResult = { lines: [], theory: stage.previousTheory, spent: [] };
  let carried = false;
  // §5 again, and the golden's own move — "I wrote that down and went to find
  // the night man again." A page that learned something says so in four words
  // before it starts thinking about it, at the head of the thinking paragraph.
  if (
    scene.kind !== 'nothing' &&
    // M10 §A.5: page one closes on the client in the chair, not on "Down it
    // went." The brief is what was written down, and the page has said it.
    scene.kind !== 'open' &&
    stage.foundAfter.length > stage.foundBefore.length &&
    words(blocksOf(laid)) < PAGE_CEILING - 20
  ) {
    say(dealer.random.pick(PLAIN_NOTED), 'narrator', { transparent: true, para: 'think' });
  }
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
      used: (id) => dealer.used(notedAs(id)),
      ...(verdictsOn(view) ? {} : { pencilOnly: true, marked: markedTheory(view, stage.marks, after.deathTicks) }),
    });
    let said = 0;
    for (const [i, line] of reaction.lines.entries()) {
      // A page that is already long keeps the first thought and drops the
      // second. Two paragraphs of thinking on top of three finds is a page
      // nobody reads to the end of.
      if (i > 0 && words(blocksOf(laid)) > WORD_TARGET_HIGH - 20) break;
      // §A.6: the first thought may open on the prop the line before named.
      const glue = i === 0 && !carried ? carryNoun(dealer, ctx.before) : null;
      if (glue) carried = true;
      say(glue ? joinSentences(glue, line) : line, 'monologue', { para: 'think' });
      said++;
    }
    // A narrowing line the page dropped for length was never said, so the run
    // has not spent it and may reach for it again.
    for (const { id, line } of reaction.spent) if (line < said) dealer.note(notedAs(id));
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
      para: 'think',
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

  /* ---------------------------------------------------- the hard ceiling */
  // With the full decks a find page or a yapper's volunteer can push past 300
  // words even after the trims above; drop the optional blocks from the end
  // until it fits. The record is never among them. Thinking goes first, then
  // texture; the exchange and the finds stay.
  // M5 §2: the office card and the entrance are page one and are not texture,
  // so the first two passes leave anything the grammar marked as kept alone
  // and the third takes it only when nothing else will do.
  // Page one carries the whole briefing and is meant to be the longest page in
  // the run: sixteen plain sentences is what the client came to say, and the
  // office card and the entrance are the two images §2 keeps around it.
  const ceiling = scene.kind === 'open' ? OPENING_CEILING : PAGE_CEILING;
  const CUT_ORDER: { voices: ReadonlySet<string>; keep: number }[] = [
    // M13: a sheet's own lines on page one (keep 0) go before anything else.
    { voices: new Set(['narrator']), keep: 1 },
    { voices: new Set(['aside', 'ambient', 'monologue']), keep: 2 },
    { voices: new Set(['transition', 'arrival', 'approach', 'place', 'presence']), keep: 2 },
    { voices: new Set(['transition', 'arrival', 'approach', 'place', 'presence']), keep: 9 },
    // A room holding nine findable things is a page of nothing but finds, and
    // the plain sentences riding along with them are the only thing left to
    // cut. The floor is enforced after this, on what survives.
    { voices: new Set(['narrator', 'nothing']), keep: 9 },
  ];
  for (const tier of CUT_ORDER) {
    while (words(blocksOf(laid)) > ceiling) {
      let cut = -1;
      for (let i = laid.length - 1; i >= 0; i--) {
        const l = laid[i] as Laid;
        const b = l.block;
        if (l.keep >= tier.keep) continue;
        if (b.kind === 'prose' && tier.voices.has(b.voice) && b.clueId === undefined) {
          cut = i;
          break;
        }
      }
      if (cut < 0) break;
      laid.splice(cut, 1);
    }
  }

  /* ------------------------------------------------ §A.3: one simile, bound */
  // After the ceiling, so that a simile is never hung on a block the ceiling
  // is about to cut, and only when the page can afford the image: a simile is
  // an image clause, and §1's floor outranks it.
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

  /* ------------------------------------------------- M5 §1: the plain floor */
  // Last, because everything above it moves the number: the image trim, the
  // ceiling and the simile all change what is on the page. Top up first and
  // drop second. A page that has come out image-heavy is usually a page with
  // nothing to say — a walk into a room already described, with nobody in it —
  // and the answer to that is a plain sentence about where he is, not the
  // deletion of the only two lines on it. Only when the page has no room for
  // another plain sentence does an image block come off, and the block the
  // simile is a clause of is never the one that goes.
  const topUpSlots: Slots = { place: place?.shortName, name: stage.here[0]?.surname };
  let topUps = 0;
  topUpPlain(
    laid,
    () => {
      const before = laid.length;
      // A room with somebody in it says who; a room with nobody says so.
      const kind: ConnectiveKind =
        topUps === 0 && stage.here.length > 0 ? 'present' : topUps === 1 ? 'arriving' : 'quiet';
      topUps++;
      // One coda, not three one-line paragraphs at the foot of a thin page.
      plainly(kind, topUpSlots, 'coda');
      return laid.length > before;
    },
    () => words(blocksOf(laid)) < WORD_TARGET_HIGH,
  );
  enforcePlainFloor(laid);

  for (const deck of dealer.takeReshuffles()) {
    gaps.push(`deck-exhausted: ${deck} came round again inside one run`);
  }

  // §A.2's coherence number is measured on the image blocks as they were
  // dealt, before the joiners below fuse any of them into a neighbour: the
  // adjacency it scores is line to line, and a paragraph break is not a line.
  const imageMotifs = laid.filter((l) => l.image).map((l) => l.motifs);

  /* ------------------------------------------ the golden loop §2: joiners */
  fuseParagraphs(laid);

  /* ------------------------------- the golden loop §5: short sentences, long */
  // M10 §A.5: in the office he is at his desk and she is in the chair, so
  // "I did not linger" and "I moved on" are the wrong page's beats.
  // M11 §A.1: page one takes its rhythm from the talk — her short answers and
  // his three questions — and not from beats added on the end of what he saw.
  // "Nothing moved." after the office card and "…, and I had time." after
  // her look were the pass padding a page the golden writes without either.
  const beatPool = scene.kind === 'open' ? OFFICE_BEATS : PLAIN_BEATS;
  if (scene.kind !== 'open') {
    enforceShortRhythm(laid, dealer.random, ceiling, SHORT_TARGET, SHORT_TOP_UPS, beatPool);
    // The join costs the page the word "and", and the ceiling is the ceiling.
    if (words(blocksOf(laid)) < ceiling) carryingSentence(laid);
  }

  /* ------------------------------------------ Hone 2 §A.3: pronouns, last */
  // After every join, because the repetition it is about can be made by one:
  // two blocks fused into one paragraph are two sentences running.
  pronounRepeatedSubjects(laid, [...view.personById.values()]);

  // M10 §A.5: page one ends where the scene does. Whatever the trim and the
  // rhythm laid after the client's last line goes before it.
  if (scene.kind === 'open') {
    const at = laid.findIndex((l) => l.para === OFFICE_CLOSE);
    if (at >= 0 && at < laid.length - 1) laid.push(...laid.splice(at, 1));
  }

  const counted = countsOf(laid);
  return {
    blocks: blocksOf(laid),
    ...(errand === undefined ? {} : { errand }),
    gaps,
    asideBand,
    portrayed,
    appeared,
    theory: reaction.theory,
    simileTarget,
    motifs: usedMotifs,
    imageMotifs,
    plain: counted.plain,
    image: counted.image,
    ...(pageSheetUses.length > 0 ? { sheets: pageSheetUses } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * The pieces.
 * ------------------------------------------------------------------ */

function blocksOf(laid: Laid[]): Block[] {
  return laid.map((l) => l.block);
}

/* ------------------------------------------------------------------ *
 * Hone 2 §A.3 — the surname twice running.
 * ------------------------------------------------------------------ */

/**
 * The surname is never the subject of two consecutive sentences on a page.
 *
 * "Lucia Salerno is 37 years old and a chambermaid. Salerno does eleven rooms
 * a day and the linen after. Salerno kept the coat on." is a card index, not a
 * person: after the first mention English uses a pronoun, and a page that does
 * not is a page assembled out of records.
 *
 * The pass runs last, over the finished blocks in page order, because the
 * repetition it is about can straddle a paragraph break — the dossier's second
 * sentence and the settle beat under it are two blocks and one tic. Sentences
 * inside quotation marks are somebody's speech and are left alone: the client
 * naming a suspect twice is a person talking, and it is the only name she has
 * for him.
 */
export function pronounRepeatedSubjects(laid: Laid[], people: readonly Person[]): number {
  const named = people.filter((p) => p.surname.length > 0);
  if (named.length === 0) return 0;
  let last: string | null = null;
  let swapped = 0;
  for (const l of laid) {
    const block = l.block;
    if (block.kind !== 'prose' && block.kind !== 'note') continue;
    // The errand line stands apart and reaches the page exactly as dealt.
    if (block.kind === 'prose' && block.voice === 'errand') {
      last = null;
      continue;
    }
    const sentences = splitSentences(block.text);
    let changed = false;
    for (const [i, sentence] of sentences.entries()) {
      const bare = sentence.trim();
      // Dialogue is not narration, and it breaks the run either way.
      if (/^[“"]/.test(bare)) {
        last = null;
        continue;
      }
      const person = named.find((p) => opensOnSubject(bare, p.surname));
      if (person === undefined) {
        last = null;
        continue;
      }
      if (last === person.surname) {
        const fixed = pronounSubject(bare, person.surname, pronounOf(person));
        if (fixed !== bare) {
          sentences[i] = sentence.replace(bare, fixed);
          changed = true;
          swapped++;
          last = null;
          continue;
        }
      }
      last = person.surname;
    }
    if (changed) {
      const text = sentences.join(' ');
      l.block = block.kind === 'note' ? { ...block, text } : { ...block, text };
    }
  }
  return swapped;
}

/* ------------------------------------------------------------------ *
 * Hone 2 §A.2 — what the portrait pair has already claimed.
 * ------------------------------------------------------------------ */

/**
 * The parts and props this person's pair card is about, when the pair is the
 * portrait on this page.
 *
 * A pair is printed whole on the first meeting and is a recall phrase after
 * that — "Kreuzer, the woman with the broken finger" — so the claim is only
 * live on the page that prints it. Empty where no pair fits the person, which
 * is the three-component portrait's page and not this rule's business.
 */
export function pairBodyWords(
  cast: CastSheet,
  personId: Id,
  times: number,
): ReadonlySet<string> {
  if (times !== 0) return new Set<string>();
  const portrait = cast.portraits[personId];
  const pair = portrait?.pair;
  if (!pair) return new Set<string>();
  // The pair card's own motifs, not the portrait's: `portrait.motifs` is the
  // union of four cards, and three of them are not on this page.
  const card = (DECKS['portrait-pairs'] ?? []).find((c) => c.id === pair.cardId);
  return bodyWordsOf(pair.text, card ? motifsOf(card) : []);
}

/* ------------------------------------------------------------------ *
 * The golden loop, §5 — the carrying sentence.
 * ------------------------------------------------------------------ */

/**
 * §5's first half, as the spec states it: **at least a quarter of a page's
 * sentences are six words or fewer.**
 *
 * The decks cannot do this. A card is written to be a card — a finished image
 * in eleven to twenty words — and a generated fact is written to be a fact,
 * which takes as many words as the fact takes. Measured over the fixed set the
 * engine printed one short sentence in seven, and a page of nothing but
 * eleven-word sentences has no shape for a fact to land in.
 *
 * So the page counts itself at the end and tops up: a beat of five words or
 * fewer, appended to the end of a paragraph that is not dialogue, until the
 * quarter is met or three have gone in. The beats assert nothing — they are
 * true on any page of any case — because the pass puts them wherever the
 * arithmetic wants one and cannot know what the page has established.
 */
/**
 * The floor the pass tops a page up to, and how many beats it may spend.
 *
 * §5 says "at least a quarter" and GAP.md's target is a **mean** over the
 * fixed set. The distribution either side of the floor is narrow — almost
 * every page sits on it — so the floor is set at the target rather than under
 * it, and not a point higher: past that the beats stop being rhythm and start
 * being padding, and a page of four-word sentences is as flat as a page of
 * eleven-word ones. Hone 1 §B.5 moved the target to 0.36, the mean of golden
 * v2's two pages measured one at a time, and this followed it.
 */
export const SHORT_TARGET = 0.36;
export const SHORT_TOP_UPS = 5;

/**
 * §B.2 — how many follow-ups one page may ask beyond its opening question.
 *
 * The golden loop's report: a long briefing out-questioned a short one and a
 * reader felt the questionnaire underneath. The same is true of an interview
 * that delivers four clues. Two, and then the person goes on talking.
 */
export const FOLLOW_CAP = 2;

/**
 * How many of the client's sentences go in one paragraph of speech.
 *
 * Two. The golden's client speaks in ones and twos and the beat between them
 * is what makes it a scene; three was the number when a prod sat between the
 * paragraphs and the page could not afford one at every break. §B.1 took the
 * prods out, so the break costs four words of narration and the paragraph can
 * be the length the golden's are.
 */
export const SPEECH_PER_PARAGRAPH = 2;

/** How many of the client's turns say who is talking. The golden's number. */
export const ATTRIBUTIONS = 2;

/**
 * §B.3 — under this, the client breathes.
 *
 * Measured before the exchange goes down, so what is being asked is "have the
 * three paragraphs this page opens with left any room for a short sentence".
 * A quarter is the golden's own floor and the rule the rhythm pass enforces at
 * the end; this is the same number asked early enough to do something about it
 * with the client's own words rather than with a beat the engine wrote.
 */
export const BREATH_SHARE_FLOOR = SHORT_TARGET;

/** The short-sentence share of what is on the page so far (§B.3). */
export function shortShare(laid: Laid[]): number {
  let short = 0;
  let total = 0;
  for (const l of laid) {
    const b = l.block;
    if (b.kind !== 'prose' && b.kind !== 'note') continue;
    for (const sentence of splitSentences(b.text)) {
      total++;
      if (wordCount(sentence) <= 6) short++;
    }
  }
  return total === 0 ? 0 : short / total;
}

/** Which paragraphs will take a beat on the end: prose, and nobody speaking. */
function takesABeat(l: Laid): boolean {
  const b = l.block;
  if (b.kind !== 'prose') return false;
  if (/["“”]/.test(b.text)) return false;
  // docs/26: "Neither of us spoke. Nothing moved." A paragraph that already
  // ends on a beat of its own does not take a second one.
  const sentences = splitSentences(b.text);
  const lastSentence = sentences[sentences.length - 1];
  if (lastSentence !== undefined && wordCount(lastSentence) <= 6) return false;
  return b.voice !== 'exchange' && b.voice !== 'record' && b.voice !== 'errand';
}

export function enforceShortRhythm(
  laid: Laid[],
  rng: Rng,
  ceiling: number,
  target = SHORT_TARGET,
  limit = SHORT_TOP_UPS,
  pool: readonly string[] = PLAIN_BEATS,
): number {
  const counts = (): { short: number; total: number } => {
    let short = 0;
    let total = 0;
    for (const l of laid) {
      const b = l.block;
      if (b.kind !== 'prose' && b.kind !== 'note') continue;
      for (const s of splitSentences(b.text)) {
        total++;
        if (wordCount(s) <= 6) short++;
      }
    }
    return { short, total };
  };
  const hosts = laid.filter(takesABeat);
  if (hosts.length === 0) return 0;
  let added = 0;
  let last: string | null = null;
  // One beat a paragraph. A paragraph with two of them on the end is a page
  // padding itself, which is the opposite of what the rhythm is for.
  const most = Math.min(limit, hosts.length);
  while (added < most) {
    const { short, total } = counts();
    if (total === 0 || short / total >= target) break;
    if (words(blocksOf(laid)) > ceiling - 8) break;
    // Spread them: the first goes on the last paragraph that will take one,
    // the next on the one before it, so a page does not end in three beats.
    const host = hosts[hosts.length - 1 - added] as Laid;
    const b = host.block;
    if (b.kind !== 'prose') break;
    // "It went there twice while she sat with me. Nothing moved." A paragraph
    // about a person has them doing something; stillness is not its beat.
    const fits = b.voice === 'presence' ? pool.filter((s) => s !== 'Nothing moved.') : pool;
    const beat = pickShape(rng, fits, {}, last);
    if (beat.length === 0) break;
    last = beat;
    host.block = { ...b, text: joinSentences(b.text, beat) };
    host.plainN += 1;
    added++;
  }
  return added;
}

/** A sentence a comma and an "and" can turn into a clause without lying. */
const CLAUSE_OPENERS: ReadonlySet<string> = new Set([
  'the',
  'a',
  'an',
  'it',
  'they',
  'there',
  'that',
  'this',
  'she',
  'he',
  'nothing',
  'nobody',
  'somebody',
  'every',
  'half',
  'two',
  'one',
  'no',
  'people',
  'his',
  'her',
  'their',
  'down',
  'so',
]);

const ABBREVIATION = /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|No)\.$/;

/** A run of prose as its sentences, without breaking an abbreviation in two. */
export function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…])\s+(?=["“'A-Z])/);
  const out: string[] = [];
  for (const part of parts) {
    const last = out[out.length - 1];
    if (last !== undefined && ABBREVIATION.test(last)) out[out.length - 1] = `${last} ${part}`;
    else out.push(part);
  }
  return out;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * §5 — one long sentence a page, made by joining two the page already says.
 *
 * "Rhythm is not a card; it is an assembly decision." Every card and every
 * generated fact is written short to mid, so no deck can hand the page the one
 * sentence per eight that carries the weight: the only way to have one is for
 * the assembler to make it, and the only honest way to make one is to join two
 * sentences that are already next to each other in the same paragraph. The
 * words are not altered — a full stop becomes a comma and an "and" — and the
 * paragraph they are in is one movement already, because the joiners put them
 * there.
 *
 * Guards: never inside quotation marks, because those words are somebody's and
 * the pause between them is theirs; never after a question or an exclamation,
 * which is not a clause anything can hang off; only where the second sentence
 * opens on a word that can go down to lower case without losing a name; and
 * only where the result lands in the band. One a page, the longest candidate.
 */
export function carryingSentence(laid: Laid[], low = CARRY_LOW, high = CARRY_HIGH): boolean {
  let best: { laid: Laid; sentences: string[]; at: number; total: number } | null = null;
  for (const l of laid) {
    const block = l.block;
    if (block.kind !== 'prose' && block.kind !== 'note') continue;
    if (/["“”]/.test(block.text)) continue;
    // A clue's record reaches the page verbatim or it has not reached the
    // page: the ground rule is that every fact arrives, and a lower-case
    // letter where the generator wrote a capital is a fact the checker can no
    // longer find. The simile is spared for the same reason — §A.3 put those
    // words there as a clause already, and this would make a clause of a
    // clause.
    if (block.kind === 'prose' && block.clueId !== undefined) continue;
    // M6 §2: the errand line is traced word for word and never re-cut.
    if (block.kind === 'prose' && block.voice === 'errand') continue;
    if (l.hosts === true) continue;
    const sentences = splitSentences(block.text);
    for (let i = 0; i + 1 < sentences.length; i++) {
      const a = (sentences[i] as string).trim();
      const b = (sentences[i + 1] as string).trim();
      if (!/\.$/.test(a) || ABBREVIATION.test(a)) continue;
      const head = /^([A-Za-z][A-Za-z'’]*)/.exec(b)?.[1];
      if (head === undefined) continue;
      if (head !== 'I' && !CLAUSE_OPENERS.has(head.toLowerCase())) continue;
      // The second half is the one that loses its capital, so it is the one
      // that has to be the engine's own words rather than the generator's.
      if ((l.verbatim ?? []).some((v) => v.includes(b))) continue;
      const total = wordCount(a) + wordCount(b);
      // The first half has to be the one doing the carrying; two short atoms
      // welded together is a longer short sentence, not a long one.
      if (wordCount(a) < 8 || total < low || total > high) continue;
      if (!best || total > best.total) best = { laid: l, sentences, at: i, total };
    }
  }
  if (!best) return false;
  const { sentences, at } = best;
  const a = (sentences[at] as string).trim().replace(/\.$/, '');
  const raw = (sentences[at + 1] as string).trim();
  const b = raw.startsWith('I ') || raw === 'I' ? raw : `${raw.charAt(0).toLowerCase()}${raw.slice(1)}`;
  sentences.splice(at, 2, `${a}, and ${b}`);
  const text = tidyPunctuation(sentences.join(' '));
  const block = best.laid.block;
  best.laid.block =
    block.kind === 'prose'
      ? { kind: 'prose', text, voice: block.voice, ...(block.clueId === undefined ? {} : { clueId: block.clueId }) }
      : { kind: 'note', text };
  // §1's counts are left where they are on purpose. The join is a full stop
  // become a comma; nothing was added to the page and nothing taken off it,
  // and the ratio it measures is images against facts, neither of which moved.
  return true;
}

/* ------------------------------------------------------------------ *
 * The golden loop, §2 — joiners.
 * ------------------------------------------------------------------ */

/**
 * Fuse adjacent blocks that were tagged as belonging to the same paragraph.
 *
 * A block is a thing the engine had to say; a paragraph is a thing a reader
 * reads. M4b made every `say` its own paragraph, which is why a page of twelve
 * blocks came out as twelve paragraphs of twenty words, every one of them
 * opening on a subject the paragraph before it had never mentioned. The golden
 * writes the walk and the room it ends in as one paragraph, the entrance and
 * the portrait and what she is as another, and a find with the fact that rode
 * along on it as a third.
 *
 * Only prose and notes fuse, and only while the result stays under
 * `PARAGRAPH_CEILING` words — a paragraph that runs past that is a wall, and
 * the golden's longest is sixty-three. Two blocks that each carry a clue never
 * fuse, because a block carries one `clueId` and the book underlines by it, so
 * fusing would lose one. The fused block keeps the first block's kind, voice
 * and clue, and the counts of both.
 */
/**
 * The shortest a paragraph may stand on its own.
 *
 * A one-sentence paragraph of nine words is not a paragraph, it is a block
 * that got left out of one — "Nobody in here but the furniture." between the
 * room and what was found in it. The golden has short paragraphs and they are
 * all dialogue; its narration runs three and four sentences. Anything under
 * this joins whichever neighbour it is nearer to in kind.
 */
export const PARAGRAPH_FLOOR = 20;

export function fuseParagraphs(
  laid: Laid[],
  ceiling = PARAGRAPH_CEILING,
  floor = PARAGRAPH_FLOOR,
): number {
  let fused = 0;
  for (let i = laid.length - 1; i > 0; i--) {
    const here = laid[i] as Laid;
    const before = laid[i - 1] as Laid;
    const tagged = here.para !== undefined && here.para === before.para;
    // Untagged, but one of the two is too short to be a paragraph and neither
    // is anybody speaking: a stray line joins the movement next to it rather
    // than standing alone in the middle of the page.
    const stray =
      !tagged &&
      takesABeat(here) &&
      takesABeat(before) &&
      (countWords([here.block]) < floor || countWords([before.block]) < floor);
    if (!tagged && !stray) continue;
    const a = before.block;
    const b = here.block;
    if (a.kind !== 'prose' && a.kind !== 'note') continue;
    if (b.kind !== 'prose' && b.kind !== 'note') continue;
    if ((a.kind === 'prose' && a.voice === 'errand') || (b.kind === 'prose' && b.voice === 'errand'))
      continue;
    if (a.kind === 'prose' && b.kind === 'prose' && a.clueId !== undefined && b.clueId !== undefined)
      continue;
    const text = joinSentences(a.text, b.text);
    // M13: the office at midnight is one breath, as the golden's (sixty-odd words).
    const limit = tagged && here.para === 'office' ? OFFICE_PARAGRAPH_CEILING : ceiling;
    if (countWords([{ kind: 'note', text }]) > limit) continue;
    const clueId = a.kind === 'prose' ? a.clueId : undefined;
    const keptClue = clueId ?? (b.kind === 'prose' ? b.clueId : undefined);
    // Which voice the paragraph keeps, in order of who has a claim on it.
    // §A.3 binds a simile to the voice of the block it is a clause of — a face
    // simile is only ever on a portrait — and a clue's record is excused for
    // being flat only under the two voices where flatness is the point, so the
    // block that carries the clue keeps its own voice too. Otherwise the
    // paragraph is the first block's and reads as what it opened as.
    const first = a.kind === 'prose' ? a : b.kind === 'prose' ? b : null;
    const second = b.kind === 'prose' ? b : null;
    const carriesClue =
      a.kind === 'prose' && a.clueId !== undefined
        ? a
        : b.kind === 'prose' && b.clueId !== undefined
          ? b
          : null;
    const voice =
      here.hosts === true && second
        ? second.voice
        : carriesClue
          ? carriesClue.voice
          : first
            ? first.voice
            : null;
    before.block =
      voice === null
        ? { kind: 'note', text }
        : { kind: 'prose', text, voice, ...(keptClue === undefined ? {} : { clueId: keptClue }) };
    before.plainN += here.plainN;
    before.imageN += here.imageN;
    before.image = before.image || here.image;
    // The paragraph now carries the simile, so a later fusion into it keeps
    // the voice §A.3 bound the simile to; and a paragraph with the
    // generator's own sentence anywhere inside it is a paragraph §5 leaves
    // alone, because the join lands wherever the longest pair is.
    if (here.hosts === true) before.hosts = true;
    if (here.verbatim) before.verbatim = [...(before.verbatim ?? []), ...here.verbatim];
    before.keep = Math.max(before.keep, here.keep);
    for (const m of here.motifs) if (!before.motifs.includes(m)) before.motifs.push(m);
    laid.splice(i, 1);
    fused++;
  }
  return fused;
}

/**
 * How many plain sentences a non-prose block is worth. A presence roll and a
 * note are one sentence of the engine's own; a claimed timeline is the head
 * plus a row an hour, every one of them a fact and none of them an image.
 */
function plainSentencesIn(block: Block): number {
  switch (block.kind) {
    case 'prose':
    case 'note':
      return countSentences(block.text);
    case 'presence':
      return block.text ? countSentences(block.text) : Math.max(1, block.personIds.length);
    case 'timeline':
      return 1 + block.rows.filter((r) => r.placeId !== null).length;
    default:
      return 0;
  }
}

/**
 * M5 §1 — reach the floor by saying something plain, before reaching it by
 * deleting something.
 *
 * The connectives are furniture and are allowed to repeat, which is exactly
 * what makes them the right thing to add: "I let myself into the speakeasy"
 * costs the page nothing and carries the one fact a reader needs, which is
 * where he is. At most three, and never past the page's word target.
 */
function topUpPlain(laid: Laid[], add: () => boolean, hasRoom: () => boolean, limit = 3): number {
  let added = 0;
  while (added < limit && plainRatio(countsOf(laid)) < PLAIN_FLOOR && hasRoom()) {
    if (!add()) break;
    added++;
  }
  return added;
}

/** §1's number for a page under construction. */
function countsOf(laid: Laid[]): PlainCount {
  let plain = 0;
  let image = 0;
  for (const l of laid) {
    plain += l.plainN;
    image += l.imageN;
  }
  return { plain, image };
}

/**
 * §1 — the assembler enforces the floor.
 *
 * The target is 55% and the contract is 50%: a page that has come out under it
 * has too much weather on it for what happened, so the weather goes. Image
 * blocks are dropped lowest-score first, and the exchange, the finds and the
 * record are never among them — they are not image blocks at all, which is the
 * point. A page that cannot reach the floor by dropping images is a page whose
 * image is load-bearing, and it is left alone rather than gutted.
 */
export function enforcePlainFloor(laid: Laid[], floor = PLAIN_FLOOR): number {
  let dropped = 0;
  while (plainRatio(countsOf(laid)) < floor) {
    let worst = -1;
    for (let i = 0; i < laid.length; i++) {
      const l = laid[i] as Laid;
      if (!l.image || l.imageN === 0) continue;
      if (l.hosts === true) continue;
      const b = l.block;
      if (b.kind === 'prose' && b.clueId !== undefined) continue;
      const w = laid[worst] as Laid | undefined;
      if (!w || l.keep < w.keep || (l.keep === w.keep && l.score <= w.score)) worst = i;
    }
    if (worst < 0) break;
    laid.splice(worst, 1);
    dropped++;
  }
  return dropped;
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

/**
 * A monologue line's id, as the run's spend pile carries it.
 *
 * The prefix belongs to no deck, so `deckOf` returns null for it and nothing
 * that reads the pile as cards — the burn tiers, the cross-run pile, the
 * coherence tests — ever mistakes it for one.
 */
export function notedAs(id: string): string {
  return `monologue:${id}`;
}

/** What a line spoken by the person being interviewed can host (§A.3). */
function spokenTargets(register: Register): string[] {
  return register === 'truth' ? ['voice', 'silence'] : ['voice', 'lie', 'silence'];
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
/**
 * One person in the roll, with their role and where they are standing.
 *
 * §B.6. A role can name its own post — "the hackman on the stand" — and the
 * watcher's post for a cabbie is "on the stand", so the roll printed
 * "Bidwell, the hackman on the stand, on the stand". Where the role has said
 * where they are, it is not said again.
 */
export function presenceClause(surname: string, role: string, post: string): string {
  const named = role.toLowerCase().includes(post.toLowerCase());
  return named ? `${surname}, ${role}` : `${surname}, ${role}, ${post}`;
}

export function presenceSentence(stage: Stage): string {
  const { view, cast } = stage;
  const place = view.placeById.get(stage.at);
  const guests = GUEST_POSTS[place?.kind ?? 'semi'] ?? (GUEST_POSTS.semi as string[]);
  const clauses: string[] = [];
  let hasRole = false;
  // §B.4: one recall phrase a roll. A list where every name carries a clause
  // is a list nobody reads to the end of, and the point of a recall is that
  // the reader already has the detail — it wants naming once, not four times.
  let recalled = false;
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
      clauses.push(presenceClause(person.surname, person.role, post));
      continue;
    }
    // §B.4. Somebody already met is named by what the reader remembers about
    // them: "Kreuzer, the broken finger, at the far end."
    const recall = cast.portraits[person.id]?.pair?.recall;
    if (!recalled && recall !== undefined && recall.length > 0) {
      flush();
      recalled = true;
      hasRole = true;
      clauses.push(`${person.surname}, ${recallClause(recall)}, ${post}`);
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
      genderFits(c, gender) &&
      // A card whose own words name a register binds to a line of that
      // register and to nothing else — not to a truthful answer, and not to
      // a block that was never anybody's answer at all.
      registerFits(simileRegister(c.text), block.register);
    if (!dealer.has('similes', fits, ctx)) continue;
    const drawn = dealer.draw('similes', [fits], slots, true, ctx);
    if (!drawn) continue;
    const b = block.block;
    if (b.kind !== 'prose') continue;
    block.block = { ...b, text: attachSimile(b.text, drawn.text) };
    block.hosts = true;
    // §1: the simile is a clause off a deck card, so the block it joins is one
    // sentence more image than it was. A clause that joined a plain sentence
    // takes that sentence with it.
    if (block.plainN > 0) block.plainN -= 1;
    block.imageN += 1;
    for (const m of drawn.motifs) if (!block.motifs.includes(m)) block.motifs.push(m);
    return target;
  }
  return null;
}

/** Does a card carrying this register belong on a block carrying that one? */
function registerFits(wanted: Register | null, have: Register | undefined): boolean {
  return wanted === null || wanted === have;
}

/**
 * Whose gender a simile has to agree with.
 *
 * Whenever the block is about somebody — an answer they gave, a beat about
 * their hands, their portrait — it is that person's, whatever the target is:
 * "He counted the bills" under a `money` simile on a woman's line is the same
 * wrong as "her hands" on a man, and the deck tags ten of the twenty-two money
 * cards for a gender. A block about nobody has no gender to agree with, and a
 * simile about the street never had one to get wrong.
 */
function genderOfBlock(stage: Stage, block: Laid, target: string): 'm' | 'f' | 'none' | 'any' {
  const person = block.personId ? stage.view.personById.get(block.personId) : undefined;
  if (person) return genderHintOf(person);
  // Nobody to agree with. A body or a voice still must not be given a card
  // that names a pronoun — there is no one on the page for it to refer to —
  // so only the cards written for nobody in particular will do.
  if (GENDERED_TARGETS.has(target) || BODY_MOTIFS.has(target)) return 'none';
  return 'any';
}

/** Does this simile's gender tag suit the block it would go on? */
function genderFits(card: Card, gender: 'm' | 'f' | 'none' | 'any'): boolean {
  if (gender === 'any') return true;
  if (gender === 'none') return tagOf('similes', card, 'gender') === 'any';
  return tagIs('similes', card, 'gender', gender);
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
  put: (block: Block, para?: string) => void;
  /** What the page weighs so far. The opening's optional lines ask before adding. */
  count: () => number;
  /** §B.3: the share of short sentences laid down so far. */
  shortShare: () => number;
  base: Slots;
  ctx: MotifContext & { before: string[] };
  gaps: string[];
  portrayed: Id[];
  appeared: Id[];
  /** M13: the office's sheet, when one framed it. */
  sheets: SheetUse[];
}

/**
 * The office at midnight, somebody on the stairs, and a retainer on the
 * blotter. Five beats, in order: where he is, who came in, what he saw, what
 * she came to say, what it pays, and then two questions on the house.
 *
 * M5 §2 replaces the old `{fact}` — one sentence of client brief inside one
 * hiring frame — with the whole of `case.briefing`. The client's sentences go
 * in her mouth and Dashiell's stay in his, split at the victim's standing, and
 * the pointer is what the hiring frame carries, because the pointer is the
 * job. Sixteen plain sentences on page one, and the register the rest of the
 * run is measured against is the first thing the player reads.
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
  // Hone 3 §5. A hiring card that comes back to the client a second time takes
  // a pronoun rather than the name again: "…," Kreuzer said. I took a roll
  // before she had gotten halfway through the second sentence. The three cases
  // are supplied here because the card is dealt here and the client is who it
  // is about; a card that never asks for them is unaffected.
  const she = pronounOf(client) === 'she';
  const slots: Slots = {
    ...t.base,
    name: client.surname,
    subject: client.surname,
    pronoun: she ? 'she' : 'he',
    them: she ? 'her' : 'him',
    their: she ? 'her' : 'his',
    retainer,
  };

  t.put(
    {
      kind: 'note',
      // The camp golden: "Midnight. My office was a room at the top of a
      // walk-up on Mulberry Street…" — his own place, said as his.
      text: `Midnight. My office was ${place?.name ?? 'the office'}, in ${view.kase.neighborhood}.`,
    },
    // The golden's first paragraph is the hour, the address and what the room
    // is like at that hour, in one breath. So is this one.
    'office',
  );

  /* 1. The office at this hour. M13: as the office's sheet lays it out. */
  const framed = sheetsOn(stage)
    ? officeFrame(stage, {
        flags: {
          temper,
          klass,
          familiar,
          circumstance: cast.roll.circumstance,
          weather: cast.roll.weather,
          purpose: view.kase.clientBrief.purpose,
        },
        slots: { ...personRoleSlots(stage, 'client', client), place: place?.shortName },
        office: (want) => {
          const ex = (c: Card): boolean => want === null || c.exports?.[want] !== undefined;
          const drawn = dealer.draw(
            'office',
            [
              (c) => ex(c) && tagIs('office', c, 'circumstance', cast.roll.circumstance) && tagIs('office', c, 'weather', cast.roll.weather),
              (c) => ex(c) && tagIs('office', c, 'circumstance', cast.roll.circumstance),
              (c) => tagIs('office', c, 'circumstance', cast.roll.circumstance) && tagIs('office', c, 'weather', cast.roll.weather),
              (c) => tagIs('office', c, 'circumstance', cast.roll.circumstance),
              (c) => tagIs('office', c, 'weather', cast.roll.weather),
            ],
            slots,
            false,
            t.ctx,
          );
          if (!drawn) return null;
          const card = DECKS.office.find((c) => c.id === drawn.cardId);
          return { text: drawn.text, motifs: drawn.motifs, score: drawn.score, ...(card?.exports ? { exports: card.exports } : {}) };
        },
        closeDeck: (role, exp) => {
          const c = (x: Card, tag: string, want: string): boolean => tagOf('close', x, tag) === want;
          const m = (x: Card): boolean => c(x, 'outcome', 'sheet') && (c(x, 'moment', 'office') || c(x, 'moment', 'any'));
          const drawn = dealer.draw(
            'close',
            role === null || exp === null
              ? [(x) => m(x) && c(x, 'callback', 'none')]
              : [(x) => m(x) && c(x, 'callback', role) && c(x, 'kind', exp.kind ?? 'thing'), (x) => m(x) && c(x, 'callback', role) && c(x, 'kind', 'any')],
            { ...personRoleSlots(stage, 'client', client), ...(role !== null && exp !== null ? { [role]: exp.short, [`${role}Text`]: exp.text } : {}) },
            true,
          );
          return drawn?.text ?? null;
        },
      })
    : null;
  if (framed) {
    t.sheets.push(framed.use);
    // The office card is page one's image and is kept; the sheet's own lines
    // round it are the first thing the ceiling takes, before the entrance.
    const at = framed.card.length > 0 ? framed.open.indexOf(framed.card) : -1;
    const before = at > 0 ? framed.open.slice(0, at).trim() : '';
    const after = at >= 0 ? framed.open.slice(at + framed.card.length).trim() : '';
    if (before) t.say(before, 'narrator', { transparent: true, verbatim: true, keep: 0, para: 'office' });
    t.say(at >= 0 ? framed.card : framed.open, 'place', { motifs: framed.motifs, score: framed.score, keep: 2, para: 'office', verbatim: true });
    if (after) t.say(after, 'narrator', { transparent: true, verbatim: true, keep: 0, para: 'office' });
  } else {
    const office = officeCard(dealer, cast.roll.circumstance, cast.roll.weather, slots, t.ctx);
    if (office.gap) t.gaps.push(office.gap);
    t.say(office.text, 'place', {
      motifs: office.motifs,
      score: office.score,
      keep: 2,
      para: 'office',
    });
  }

  /* 2. The entrance, with the client's portrait woven into it (§A.4).
   *
   * The generator's first narration sentence — somebody came up the stairs
   * after midnight and sat down — goes in front of it rather than behind it.
   * It used to arrive two paragraphs after the door had already shut and the
   * portrait had already been read, which is the page telling the reader what
   * happened before the thing it has just told them. The golden's order is
   * stairs, knock, coat, hand, and this is that order: it also hands the
   * entrance paragraph the word "midnight", which is the one the paragraph
   * above it opens on.
   *
   * Hone 2 §A.4 finishes the job. The atom used to seat her — "A woman came up
   * the stairs after midnight, and sat down" — a sentence before a card that
   * shuts the door behind her, so the page had her in the chair before she was
   * through the doorway. The card is dealt first now, and the atom is cut to
   * whatever fits in front of it: stairs, door, sit, speak, in that order, or
   * nothing at all where the card climbs the stairs itself.
   */
  const split = splitBriefing(view, familiar);
  const entrance = entranceCard(
    dealer,
    { temper, klass, gender, familiar },
    cast.roll.weather,
    slots,
    t.ctx,
  );
  if (entrance.gap) t.gaps.push(entrance.gap);
  const arrival = arrivalAtom(split.entrance, entrance.text);
  if (arrival !== null)
    t.say(arrival, 'narrator', { transparent: true, verbatim: true, para: 'entrance' });

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
  if (cast.portraits[client.id]?.pair === undefined) {
    t.gaps.push(
      `missing-pair: no portrait-pairs card fits ${client.surname}; the three-component portrait stood in`,
    );
  }
  t.say(joinSentences(entrance.text, portrait), 'presence', {
    personId: client.id,
    motifs: [...entrance.motifs, ...(cast.portraits[client.id]?.motifs ?? [])],
    score: entrance.score,
    keep: 2,
    para: 'entrance',
  });

  /* 3. The briefing (M5 §2, turned into an exchange by the golden loop §3).
   *
   * What he saw, and then what she said — but not as four blocks of quoted
   * declaratives with nobody asking anything. Her sentences are grouped by
   * what they are about and Dashiell's short questions go between the groups,
   * chosen by what the *next* group establishes: a question about the finding
   * before the discovery, one about what she was doing there before the tie,
   * "Why me?" before the purpose. The first turn gets no question, because it
   * is what she came up the stairs to say.
   */
  /*
   * Hone 2 §A.3. The dossier paragraph was a record read aloud — "Gretchen
   * Kreuzer is 30 years old and a pawnbroker's clerk. Kreuzer writes the
   * tickets behind the grille and knows what a thing is worth." Nothing in the
   * room told him either sentence.
   *
   * What is left is what he can see: the full name once and the age as a band.
   * The trade and its detail are hers, and they go into her mouth as the first
   * thing she says where the generator has written the first-person form.
   * Until it has, the sentence stays where it is and takes a pronoun, because
   * the surname twice in two sentences is the tic this rule is about.
   */
  // M11 §A.2: what he can see of her is the name once and the age as a band,
  // and then one line of how she carries herself (golden §1: "She had the look
  // of someone who did her business standing up…"). Her trade is hers to
  // show later, in his words, where the page has room for it.
  const dossierLines: string[] = [seenSentence(client, arrival !== null)];
  // Hone 2 §A.2's rule for the settle beat holds for the look too: nothing
  // about hands the pair has already given something to do.
  const claimedByPair = pairBodyWords(cast, client.id, stage.appearances[client.id] ?? 0);
  const said = [arrival ?? '', entrance.text, portrait];
  // The office in the order she tells it, planned here so that the page
  // knows what it has still to say: the look goes in only where the page has
  // room for all of it, because page one's ceiling cuts the entrance before
  // it cuts a line of narration, and the entrance is the one thing he sees.
  const planned = officePlan(view, familiar, dealer.random);
  const toSay =
    countWords([
      {
        kind: 'note',
        text: [planned.relation, planned.story, planned.police, planned.want, planned.close]
          .flat()
          .map((l) => l.text)
          .join(' '),
      },
    ]) +
    (planned.trade === null ? 0 : countWords([{ kind: 'note', text: planned.trade }])) +
    90;
  const lookFits = (text: string): boolean =>
    t.count() + countWords([{ kind: 'note', text: `${seenSentence(client, arrival !== null)} ${text}` }]) + toSay <= OPENING_CEILING;
  const look = characterLine(dealer, view, client, 'look', {
    accept: (text) => !bodyConflict(claimedByPair, text) && !echoes(text, said) && lookFits(text),
  });
  if (look) dossierLines.push(look.text);
  const seenPara = dossierLines.filter((line) => line.length > 0).join(' ');
  if (seenPara.length > 0)
    t.say(seenPara, 'narrator', {
      transparent: true,
      verbatim: true,
      para: 'entrance',
    });

  const plainSlots: Slots = {
    name: client.surname,
    Pronoun: pronounOf(client) === 'she' ? 'She' : 'He',
  };
  /** Every plain beat the briefing has spent, so none of them comes twice. */
  const spentBeats: string[] = [];
  // She gets into the chair before she starts: one flat sentence of business,
  // unless the look has already given the reader how she sits there.
  //
  // Hone 2 §A.2: not a sentence about hands the pair has already given
  // something else to do; where nothing is left, the beat is dropped.
  const claimed = pairBodyWords(cast, client.id, stage.appearances[client.id] ?? 0);
  const settle = BRIEFING_SETTLE.filter(
    (shape) => !shape.includes('{name}') && !bodyConflict(claimed, fillPlain(shape, plainSlots)),
  );
  if (look === null && settle.length > 0) {
    t.say(pickShape(dealer.random, settle, plainSlots), 'narrator', {
      transparent: true,
      para: 'entrance',
    });
  } else if (look === null) {
    t.gaps.push(
      `pair-conflict: every settle beat claims what ${client.surname}'s pair card already has`,
    );
  }

  /*
   * M11 §A.1. The briefing in the order a person tells it (golden §1):
   *
   *   who she is to him, and that he is dead
   *   who he was, where, and who found him
   *   "And the police?"  what they did, what is wrong with it, and when
   *   "Why me?"          what she wants and what it costs her
   *   her trade, in his words, and how the street sees her kind
   *   "Where would you start?"  the pointer, and then the money
   *
   * Each of his questions answers the line in front of it. The generator's
   * prompts were asked in the generator's order, which put "What happens if
   * it is settled loudly?" before she had said anything about quiet.
   */
  const turns = officeTurns(planned);
  pronounOfficeTurns(view, turns);
  // She talks in short sentences where the generator wrote them (the breath
  // form), always: the page's rhythm is hers now, not the rhythm pass's.
  const breathing = true;
  let attributions = 0;
  const beatLine = (allShapes: readonly string[], slots: Slots): string => {
    const pool = allShapes.filter((shape) => !shape.includes('{name}'));
    const fresh = pool.filter((shape) => {
      const text = fillPlain(shape, slots);
      return text.length > 0 && !dealer.used(`beat:${text}`) && !spentBeats.includes(text);
    });
    const text = pickShape(dealer.random, fresh.length > 0 ? fresh : pool, slots, spentBeats);
    if (text.length === 0) return '';
    spentBeats.push(text);
    dealer.note(`beat:${text}`);
    return text;
  };
  const askLine = (ask: 'police' | 'why' | 'start'): string =>
    dealer.random.pick(
      ask === 'police' ? OFFICE_ASK_POLICE : ask === 'why' ? OFFICE_ASK_WHY[planned.precinct] : OFFICE_ASK_START,
    );
  const firstBeatSlots: Slots = {
    ...plainSlots,
    him: she ? 'her' : 'him',
    He: she ? 'She' : 'He',
  };
  for (const [i, turn] of turns.entries()) {
    if (turn.ask !== null) {
      t.say(`“${askLine(turn.ask)}”`, 'exchange', {
        personId: client.id,
        targets: DASHIELL_TARGETS,
        transparent: true,
      });
    }
    // The golden says who is talking at the head of the first two turns and
    // then lets the questions carry it: "My name is Ilse Hauck," she said.
    const attribution =
      attributions < ATTRIBUTIONS
        ? `${attributions === 0 ? pronounOf(client) : client.surname} said`
        : undefined;
    // What happened is one breath (golden: five sentences in one paragraph);
    // the rest two sentences a paragraph.
    const per = turn.lines === planned.story || turn.lines === planned.police ? 6 : SPEECH_PER_PARAGRAPH + 1;
    const plain = speechParagraphs(turn.lines, per, breathing);
    const paragraphs = speechParagraphs(turn.lines, per, breathing, attribution, plain.length > 1 ? 1 : 0);
    if (attribution !== undefined && paragraphs.some((p) => p.includes(attribution))) attributions++;
    for (const paragraph of paragraphs) {
      t.say(paragraph, 'exchange', {
        personId: client.id,
        register: 'truth',
        targets: ['voice', 'silence'],
        transparent: true,
      });
    }
    // After the first thing she says, he lets her go on.
    if (i === 0 && turns.length > 1) {
      // Not "I offered her the chair" after an entrance that has her in it already,
      // nor "I let her sit" once she has sat.
      const seated = /\b(?:chair|sat|seat|sitting|sit)\b/i.test(`${arrival ?? ''} ${entrance.text}`);
      const line = beatLine(
        seated ? OFFICE_FIRST_BEAT.filter((b) => !/\b(?:chair|sit)\b/.test(b)) : OFFICE_FIRST_BEAT,
        firstBeatSlots,
      );
      if (line.length > 0) t.say(line, 'narrator', { transparent: true });
    }
  }
  // Her trade, in his words, with how the street sees her kind: golden §1's
  // "She traded stocks on the street for men who would rather not be seen
  // doing it themselves." It is profession and motive in one line, and it sets
  // up what she has just said she wants.
  if (planned.trade !== null) {
    const closing = countWords([{ kind: 'note', text: planned.close.map((l) => l.text).join(' ') }]) + 70;
    const street = characterLine(dealer, view, client, 'street', {
      accept: (text) =>
        !echoes(text, [planned.trade ?? '', arrival ?? '', entrance.text, look?.text ?? '']) &&
        t.count() + countWords([{ kind: 'note', text: `${planned.trade ?? ''} ${text}` }]) + closing <= OPENING_CEILING,
    });
    t.say([planned.trade, street?.text].filter((s): s is string => !!s).join(' '), 'narrator', {
      transparent: true,
      verbatim: true,
    });
  }

  /* 4. The hiring: who she would start with, which is the job, and the money. */
  if (planned.close.length > 0) {
    t.say(`“${askLine('start')}”`, 'exchange', {
      personId: client.id,
      targets: DASHIELL_TARGETS,
      transparent: true,
    });
  }
  const clue = scene.clientClue;
  const fact =
    planned.close.length > 0
      ? planned.close.map((l) => l.text).join(' ')
      : clue
        ? stripAttribution(clue.text, client.surname)
        : null;
  // docs/25: the hiring's `{business}` is the client's own — the pair's recall
  // action, the tic the entrance just described, come round once on this
  // visit ("Kreuzer was turning the ring on his smallest finger again."). A
  // client with no recall action is dealt a hiring card that asks for none.
  const business = cast.portraits[client.id]?.pair?.action;
  // docs/25: `{dashiell}` is what he says between her reason and the money —
  // one of his own short lines, as one who knows her or one who does not.
  const dashiell = dealer.random.pick(HIRING_DASHIELL[familiar ? 'yes' : 'no']);
  const hiring = hiringFrame(
    dealer,
    { temper, klass, gender, familiar },
    { ...slots, fact: fact ?? undefined, business, dashiell },
    t.ctx,
  );
  if (hiring.gap) t.gaps.push(hiring.gap);
  if (fact === null) {
    t.gaps.push('no-client-clue: the case has no client brief; the hiring says only what it pays');
  }
  t.say(hiring.text, 'exchange', {
    ...(clue ? { clueId: clue.id } : {}),
    personId: client.id,
    motifs: hiring.motifs,
    score: hiring.score,
    // A man hiring you is not lying to you about why, whatever else he leaves
    // out: a simile about a denial has no business on the brief.
    register: 'truth',
    targets: ['voice', 'silence'],
  });

  /* 5. Two questions on the house, while she is still in the chair. */
  // Hone 2 §A.3: the pronoun, not the surname. The page named her in full
  // four paragraphs ago and has said the name in every attribution since;
  // the last line of it is not where English reaches for the name again.
  //
  // M10 §A.5: the page is told in the past tense, and this is where it
  // closes, so it says the scene's last fact the way the rest was said and
  // leaves the two free questions to the choices under it.
  // M13: the office sheet's last word, before she is left in the chair.
  if (framed?.close) t.say(framed.close, 'narrator', { transparent: true, verbatim: true, keep: 0 });
  t.put({ kind: 'note', text: officeCloseLine(client) }, OFFICE_CLOSE);
}

/** The paragraph tag page one's last line carries, so nothing is laid after it. */
export const OFFICE_CLOSE = 'office-close';

/** Page one's last line: the client still in the chair, and a question or two owed. */
export function officeCloseLine(client: Person): string {
  const she = pronounOf(client) === 'she';
  const [He, him, he] = she ? ['She', 'her', 'she'] : ['He', 'him', 'he'];
  return `${He} was still in the chair. I had a question or two for ${him} before ${he} went.`;
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

/**
 * The first line on a page: the walk that got him here.
 *
 * `transitions` is a `free` deck, which means a card may come round again in a
 * later run and in a later page — but the dealer orders a rung by §A.2's score
 * first, and the highest-scoring card for a case with a `drunk-singing` anchor
 * is the same card every time. Seed 7 opened pages three, four and five with
 * "Somebody was singing the same two verses under a window a block over" and
 * the night stopped moving.
 *
 * So the page keeps off what the last few pages opened with. One transition is
 * dealt a page, so the last four ids from the deck are the last four pages
 * that had one: the top of the ladder refuses all four, the middle refuses the
 * page before, and only after both have come up empty does a card get to
 * repeat itself. Inside that, an anchor-flavoured card prefers an anchor other
 * than the one the last page used, so a case with three anchors in the air
 * sounds like a case with three anchors in the air.
 */
export const TRANSITION_MEMORY = 4;

/* ------------------------------------------------------------------ *
 * M6 §2 and §3 — the errand line and the clock's beats.
 * ------------------------------------------------------------------ */

/** The hour a clock beat names, as a word. The night never reaches eight on a beat. */
const HOUR_WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/**
 * §3. Two calls left, the last call, or an hour gone past — in that order of
 * precedence, because a count of what is left is the thing a player acts on
 * and the running head already shows the hour. Null when the clock has
 * nothing to say and the page's transition should be dealt as usual.
 */
export function clockBeatKind(
  stage: Pick<Stage, 'minutes' | 'minutesBefore' | 'actionsLeft' | 'cost'>,
): { beat: 'last-call' | 'two-left' } | { beat: 'hour'; hour: string } | null {
  if (stage.cost <= 0) return null;
  if (stage.actionsLeft === 1) return { beat: 'last-call' };
  if (stage.actionsLeft === 2) return { beat: 'two-left' };
  const before = stage.minutesBefore;
  if (before === undefined) return null;
  const from = Math.floor(before / 60);
  const to = Math.floor(stage.minutes / 60);
  if (to > from && to >= 1 && to <= 7) return { beat: 'hour', hour: HOUR_WORDS[to] as string };
  return null;
}

function clockBeat(dealer: Dealer, stage: Stage, gaps: string[]): string | null {
  const kind = clockBeatKind(stage);
  if (kind === null) return null;
  const slots: Slots = kind.beat === 'hour' ? { hour: kind.hour } : {};
  const drawn = dealer.draw('hours', [(c) => tagIs('hours', c, 'beat', kind.beat)], slots, true);
  if (drawn) return drawn.text;
  gaps.push(`no-card: hours has nothing for ${kind.beat}; a hand-written line stood in`);
  if (kind.beat === 'hour') return `It was past ${kind.hour}.`;
  return kind.beat === 'two-left' ? 'Two calls left before eight.' : 'One call left before eight.';
}

/** A card for the errand, or the plainest possible line when the deck has nothing. */
function errandLine(dealer: Dealer, plan: ErrandPlan, slots: Slots, gaps: string[]): string {
  const searched = plan.searched === true ? 'yes' : 'no';
  const fits: Match = (c) =>
    tagIs('errand', c, 'because', plan.because) &&
    tagIs('errand', c, 'for', plan.for) &&
    (plan.because !== 'return' || tagIs('errand', c, 'searched', searched));
  const drawn = dealer.draw('errand', [fits], slots, true);
  let text = drawn?.text ?? '';
  if (text.length === 0) {
    gaps.push(`no-card: errand has nothing for ${plan.because} × ${plan.for}; a hand-written line stood in`);
    text =
      plan.kind === 'office'
        ? `I went back to ${slots.place ?? 'the office'} to think.`
        : 'Nobody sent me. I came to see.';
  }
  // §2.2: two leads here. Name the newest and nod at the other; never list them.
  if (plan.kind === 'lead' && plan.leads === 2) text = `${text} ${OTHER_THING}`;
  return text;
}

function drawTransition(
  dealer: Dealer,
  view: CaseView,
  band: HourBand,
  base: Slots,
  ctx: MotifContext,
): { text: string; motifs: string[]; score: number } | null {
  const anchorIds = view.kase.anchors.map((a) => a.templateId);
  const recent = dealer.recent('transitions', TRANSITION_MEMORY);
  const lastId = recent[recent.length - 1];
  const lastCard = lastId ? DECKS.transitions.find((c) => c.id === lastId) : undefined;
  const lastAnchor = lastCard ? tagOf('transitions', lastCard, 'anchorTemplate') : undefined;

  const anchorOf = (c: Card): TagValue | undefined => tagOf('transitions', c, 'anchorTemplate');
  const onAnchor = (c: Card): boolean => {
    const anchor = anchorOf(c);
    return typeof anchor === 'string' && anchorIds.includes(anchor);
  };
  const rotates = (c: Card): boolean => anchorOf(c) !== lastAnchor;
  const inBand = (c: Card): boolean => tagIs('transitions', c, 'hourBand', band);

  const ladder: Match[] = [
    (c) => onAnchor(c) && rotates(c) && inBand(c),
    (c) => onAnchor(c) && rotates(c),
    (c) => anchorOf(c) === undefined && inBand(c),
    (c) => onAnchor(c) && inBand(c),
    onAnchor,
    (c) => anchorOf(c) === undefined,
  ];
  const keepOff = (ids: readonly string[]): Match[] =>
    ladder.map((m) => (c: Card) => m(c) && !ids.includes(c.id));

  const drawn =
    dealer.draw('transitions', keepOff(recent), base, true, ctx) ??
    dealer.draw('transitions', keepOff(lastId === undefined ? [] : [lastId]), base, true, ctx) ??
    dealer.draw('transitions', ladder, base, true, ctx);
  return drawn ? { text: drawn.text, motifs: drawn.motifs, score: drawn.score } : null;
}

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
  /** §1: how many of the sentences came off the card rather than the record. */
  imageSentences?: number;
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
  const kind = findKindOf(view, clue);
  // §1's measurement: the record is the fact and is plain wherever it stands.
  const record = countSentences(clue.text);
  if (kind === null) return { text: clue.text, motifs: [], score: 0, imageSentences: 0 };
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
  if (!drawn) return { text: clue.text, motifs: [], score: 0, imageSentences: 0 };
  const card = DECKS.find.find((c) => c.id === drawn.cardId);
  const text = factOnPage(card?.text ?? '', drawn.text, clue.text);
  return {
    text,
    motifs: drawn.motifs,
    score: drawn.score,
    imageSentences: Math.max(0, countSentences(text) - record),
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

/**
 * M5 §3 — the account somebody gives of themselves.
 *
 * Layer 1 of the dossier, in the first person, inside the same dialogue frame
 * the rest of an exchange uses, so an enigma answering about themselves sounds
 * like the same enigma who answered about the third floor. A yapper goes on
 * past the end of the question and gives up a layer-2 fact about somebody
 * else, which the notebook files under that somebody.
 *
 * Asking twice costs nothing and gets nothing, and says so.
 */
function answerSelf(
  stage: Stage,
  scene: Extract<Scene, { kind: 'ask' }>,
  person: Person | undefined,
  temper: Temper,
  familiar: boolean,
  slots: Slots,
  exclude: ReadonlySet<string>,
  gaps: string[],
  say: (text: string, voice: ProseVoice, opts?: SayOpts) => void,
  put: (block: Block) => void,
): void {
  const self = scene.self;
  if (!self) return;
  const surname = person?.surname ?? 'He';
  if (self.told) {
    say(
      (stage.dealer.random.pick(SELF_ALREADY) as string).split('{name}').join(surname),
      'nothing',
    );
    put({ kind: 'note', text: 'No charge. There is nothing here I do not have.' });
    return;
  }
  const lines = self.lines.filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    say(nothingLine(stage.dealer, 'present', slots), 'nothing');
    return;
  }
  const answer = frameAnswer(
    stage.dealer,
    { clueId: '', text: lines[0] as string, rest: lines.slice(1), mode: 'utterance', cardIds: [] },
    person,
    temper,
    'truth',
    familiar,
    slots,
    '',
    exclude,
    gaps,
    pairBodyWords(stage.cast, scene.personId, stage.appearances[scene.personId] ?? 0),
  );
  say(answer.text, 'exchange', {
    personId: scene.personId,
    targets: ['voice', 'silence'],
    register: 'truth',
    imageSentences: answer.imageSentences,
  });
  for (const more of lines.slice(1)) {
    say(`“${more}”`, 'exchange', {
      personId: scene.personId,
      targets: ['voice', 'silence'],
      register: 'truth',
    });
  }
  if (self.gossip) {
    const about = stage.view.personById.get(self.gossip.personId);
    put({
      kind: 'note',
      text: `${surname} was not finished, and the rest of it was about ${about?.surname ?? 'somebody else'}.`,
    });
    say(`“${self.gossip.text}”`, 'exchange', {
      personId: scene.personId,
      targets: ['voice', 'silence'],
      register: 'truth',
    });
  }
}

function answerAccount(
  stage: Stage,
  say: (text: string, imageSentences: number) => void,
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
      ? `I was at ${stage.view.placeById.get(first.placeId as Id)?.shortName ?? 'home'} and then where I said, ${spokenClock(
          first.tick,
        )} to ${spokenClock(lastRow.tick)}. All of it is in the book if you want the book.`
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
    pairBodyWords(stage.cast, scene.personId, stage.appearances[scene.personId] ?? 0),
  );
  say(answer.text, answer.imageSentences);
  put({ kind: 'timeline', personId: scene.personId, rows: account.rows });
}

export { askKindOf, clientLeavingLine };
