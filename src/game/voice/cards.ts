/**
 * The decks, and the one loader that deals them.
 *
 * `content/deck-schema.json` is the M4 Part B schema as data. It is the same
 * file `scripts/validate-decks.mjs` reads, so a deck that passes the validator
 * is a deck this loader can deal, and a tag a writer adds there is a tag the
 * engine can match on without a code change.
 *
 * Burn tiers (A.8) live in the schema too, and the dealer notes (docs/25)
 * say why each deck has the one it has:
 *
 * - `run-to-run` — every deck a reader reads, bar the people's. A card read
 *   is not dealt again, that night or a later one, until every card that fits
 *   the same ask has been read; then that ask reshuffles. The browser keeps a
 *   read count per card (`storage.ts`).
 * - `within-run` — `activity`, which belongs to the person doing it: the
 *   planner keeps what each person did on earlier visits tonight, and a new
 *   night is a new cast.
 * - `free` — may repeat. No deck uses it now.
 */

import { Rng } from '../../gen/rng.js';
import { tidyPunctuation } from './prose.js';
import {
  MOTIFS,
  readMotifs,
  scoreMotifs,
  type MotifContext,
} from './motifs.js';
import schemaJson from '../../../content/deck-schema.json';
import similesJson from '../../../content/decks/similes.json';
import placesJson from '../../../content/decks/places.json';
import witnessJson from '../../../content/decks/witness.json';
import portraitsJson from '../../../content/decks/portraits.json';
import businessJson from '../../../content/decks/business.json';
import dashiellJson from '../../../content/decks/dashiell.json';
import framesJson from '../../../content/decks/frames.json';
import utterancesJson from '../../../content/decks/utterances.json';
import findJson from '../../../content/decks/find.json';
import arrivalsJson from '../../../content/decks/arrivals.json';
import transitionsJson from '../../../content/decks/transitions.json';
import ambientJson from '../../../content/decks/ambient.json';
import asidesJson from '../../../content/decks/asides.json';
import endingsJson from '../../../content/decks/endings.json';
import officeJson from '../../../content/decks/office.json';
import entrancesJson from '../../../content/decks/entrances.json';
import hiringJson from '../../../content/decks/hiring.json';
import portraitPairsJson from '../../../content/decks/portrait-pairs.json';
import errandJson from '../../../content/decks/errand.json';
import hoursJson from '../../../content/decks/hours.json';
import establishJson from '../../../content/decks/establish.json';
import watchJson from '../../../content/decks/watch.json';
import returnJson from '../../../content/decks/return.json';
import activityJson from '../../../content/decks/activity.json';
import thoughtJson from '../../../content/decks/thought.json';
import bridgeJson from '../../../content/decks/bridge.json';
import carryJson from '../../../content/decks/carry.json';
import answerJson from '../../../content/decks/answer.json';
import placeAmbientJson from '../../../content/decks/place-ambient.json';
import searchActJson from '../../../content/decks/search-act.json';
import crowdJson from '../../../content/decks/crowd.json';
import decideJson from '../../../content/decks/decide.json';
import confrontJson from '../../../content/decks/confront.json';
import tellingJson from '../../../content/decks/telling.json';
import groundingJson from '../../../content/decks/grounding.json';
import followupJson from '../../../content/decks/followup.json';
import tailJson from '../../../content/decks/tail.json';
import noteJson from '../../../content/decks/note.json';
import characterJson from '../../../content/decks/character.json';
import approachJson from '../../../content/decks/approach.json';
import lookJson from '../../../content/decks/look.json';
import tryJson from '../../../content/decks/try.json';
import closeJson from '../../../content/decks/close.json';
import recapJson from '../../../content/decks/recap.json';
import greetJson from '../../../content/decks/greet.json';

export type DeckName =
  | 'similes'
  | 'portraits'
  | 'business'
  | 'dashiell-lines'
  | 'frames'
  | 'utterances'
  | 'find'
  | 'arrivals'
  | 'transitions'
  | 'ambient'
  | 'asides'
  | 'places'
  | 'endings'
  | 'witness'
  /* M4b §B.4. Written on the content branch; absent decks deal nothing. */
  | 'office'
  | 'entrances'
  | 'hiring'
  /* Hone 1 §B.4, the same way: written on the `portrait-pairs` branch. */
  | 'portrait-pairs'
  /* M6 §2 and §3: why he came, and the clock's own beats. */
  | 'errand'
  | 'hours'
  /* M8 §9: the scene. Placeholders on the engine branch; content in parallel. */
  | 'establish'
  | 'watch'
  | 'return'
  | 'activity'
  | 'thought'
  | 'bridge'
  | 'carry'
  | 'answer'
  /* Night Hone 1: the room's own texture, the search's path, a crowd said at once, the decision after a catch. */
  | 'place-ambient'
  | 'search-act'
  | 'crowd'
  | 'decide'
  /* M9 §3: a fact put to somebody, and what they did with it. */
  | 'confront'
  /* M10 §A.1: a family of facts told — the frame, how they know, the follow-up, the tail, the note. */
  | 'telling'
  | 'grounding'
  | 'followup'
  | 'tail'
  | 'note'
  /* M11 Part C: archetype character cards — the look, the street's view, the talk, the victim, the client's word. */
  | 'character'
  /* M12: the ask staged (the approach, the look, the try, the last word) and the recap's frame. */
  | 'approach'
  | 'look'
  | 'try'
  | 'close'
  | 'recap'
  /* M13: the client's greeting on a sheet. */
  | 'greet';

export type BurnTier = 'run-to-run' | 'within-run' | 'free';

export type SpentPolicy = 'widen' | 'reshuffle';

export type TagValue = string | number;

export interface Card {
  id: string;
  deck: string;
  text: string;
  /**
   * Per-deck tags, plus `gender` (§A.3), which M4b adds to every deck and
   * which lives inside `tags` because that is where the business deck has had
   * it since M4 and because the dealer matches on it like any other tag.
   */
  tags: Record<string, TagValue | TagValue[]>;
  /**
   * M4b §A.2 and §A.5, both **top-level** fields beside `tags` rather than
   * inside it: a list is not something the dealer can match on, and the night
   * excludes a card outright rather than ranking it. `tags.motifs` and
   * `tags.weather` are read too, so a deck written the other way still scores.
   */
  motifs?: string[];
  weather?: string;
  avoidNear?: string[];
  /**
   * Hone 1 §B.4, `portrait-pairs` only: the phrase a later page calls this
   * person by — "the broken finger". A card in any other deck has none.
   */
  recall?: string;
  /** M8 §4, `portrait-pairs` only: the recall as something the person does. */
  recallAction?: string;
  /**
   * M13: what a sheet may reuse of this card later on the page — the prop it
   * puts in the room ("the mirror"), the trait it gives a person ("eyes that
   * went to the door"), the thing somebody has in hand.
   */
  exports?: Record<string, CardExport>;
  /** M13: the last words of the card's short form (its first clause or sentence, by default). */
  cut?: string;
  status: string;
  notes?: string;
}

/** M13: one role a card offers a sheet. */
export interface CardExport {
  /** The whole noun phrase: "a mirror whose silvering had gone, spotted black in the corners". */
  text: string;
  /** How the page refers back to it: "the mirror". */
  short: string;
  /** What kind of thing it is, for the close deck's lines (`light`, `glass`, `sound`…). */
  kind?: string;
  /** Where somebody stands by it: "under the mirror". */
  near?: string;
  /** Closing lines written for this card's prop, the best callbacks there are. */
  pay?: string[];
}

/**
 * M13: a card's short form, as the page prints it. Up to and through its
 * `cut` when it has one, else its first sentence.
 */
export function shortOf(card: Card, filled: string): string {
  if (card.cut !== undefined) {
    const at = filled.indexOf(card.cut);
    if (at >= 0) {
      const head = filled.slice(0, at + card.cut.length).replace(/[,;:\s]+$/, '');
      return /[.!?”]$/.test(head) ? head : `${head}.`;
    }
  }
  // The first sentence, not the first full stop: "Mrs." and "St." are not an end.
  const m = /^(.+?(?<!\b(?:Mrs|Mr|Dr|St|Mt|Jr|Sr))[.!?])(?:\s|$)/.exec(filled);
  return m ? (m[1] as string) : filled;
}

interface TagSpec {
  required?: boolean;
  default?: TagValue;
  alias?: string;
  vocab?: string;
  values?: TagValue[];
  extraValues?: TagValue[];
  /** A tag whose value is a list of vocabulary words rather than one word. */
  list?: boolean;
}

interface DeckSpec {
  file: string;
  deckValues: string[];
  idPrefix: string;
  placeholderPrefix: string;
  burn: BurnTier;
  spent?: SpentPolicy;
  target?: number;
  legacy?: string;
  slots?: string[];
  requiredSlots?: string[];
  mandatorySlots?: Record<string, string[]>;
  minPerCoverageCell?: number;
  tags: Record<string, TagSpec>;
  coverage?: string[][];
}

interface Schema {
  common: { slots: string[]; statuses: string[]; optionalTags: Record<string, { values: TagValue[] }> };
  /** M4b: the three tags every deck carries. Merged under each deck's own. */
  commonTags?: Record<string, TagSpec>;
  vocab: Record<string, TagValue[]>;
  decks: Record<string, DeckSpec>;
}

export const SCHEMA = schemaJson as unknown as Schema;

/**
 * A deck's tags, with the schema's `commonTags` underneath its own. `motifs`,
 * `weather` and `gender` belong to every deck now; a deck that already
 * declares one of them — `arrivals.weather` is required, `portraits.gender`
 * is — keeps its own stricter spec.
 */
export function tagSpecs(deck: DeckName): Record<string, TagSpec> {
  const own = SCHEMA.decks[deck]?.tags ?? {};
  return { ...(SCHEMA.commonTags ?? {}), ...own };
}

const RAW: Record<DeckName, unknown> = {
  similes: similesJson,
  places: placesJson,
  witness: witnessJson,
  portraits: portraitsJson,
  business: businessJson,
  'dashiell-lines': dashiellJson,
  frames: framesJson,
  utterances: utterancesJson,
  find: findJson,
  arrivals: arrivalsJson,
  transitions: transitionsJson,
  ambient: ambientJson,
  asides: asidesJson,
  endings: endingsJson,
  office: officeJson,
  entrances: entrancesJson,
  hiring: hiringJson,
  'portrait-pairs': portraitPairsJson,
  errand: errandJson,
  hours: hoursJson,
  establish: establishJson,
  watch: watchJson,
  return: returnJson,
  activity: activityJson,
  thought: thoughtJson,
  bridge: bridgeJson,
  carry: carryJson,
  answer: answerJson,
  'place-ambient': placeAmbientJson,
  'search-act': searchActJson,
  crowd: crowdJson,
  decide: decideJson,
  confront: confrontJson,
  telling: tellingJson,
  grounding: groundingJson,
  followup: followupJson,
  tail: tailJson,
  note: noteJson,
  character: characterJson,
  approach: approachJson,
  look: lookJson,
  try: tryJson,
  close: closeJson,
  recap: recapJson,
  greet: greetJson,
};

/** Every deck is on disk and imported; nothing is missing. */
export const MISSING_DECKS: readonly DeckName[] = [];

export const DECK_NAMES = Object.keys(RAW) as DeckName[];

export const DECKS: Record<DeckName, Card[]> = Object.fromEntries(
  DECK_NAMES.map((name) => [name, (RAW[name] as Card[]).filter((c) => c.status !== 'cut')]),
) as Record<DeckName, Card[]>;

export const ALL_CARDS: Card[] = DECK_NAMES.flatMap((name) => DECKS[name]);

const CARD_DECK = new Map<string, DeckName>();
for (const name of DECK_NAMES) for (const card of DECKS[name]) CARD_DECK.set(card.id, name);

export function deckOf(cardId: string): DeckName | null {
  return CARD_DECK.get(cardId) ?? null;
}

/**
 * Swap a deck's contents for the length of one call, and put them back.
 *
 * The only reason this exists: M4b forbids touching `content/decks/`, and the
 * motif scoring (§A.2) cannot be shown to work against decks that are not
 * tagged yet. A test builds a small tagged deck inline, runs the engine on it
 * and measures. Nothing in `src/` calls it.
 */
export function withDecks<T>(decks: Partial<Record<DeckName, Card[]>>, fn: () => T): T {
  const saved: Partial<Record<DeckName, Card[]>> = {};
  for (const [name, cards] of Object.entries(decks) as [DeckName, Card[]][]) {
    saved[name] = DECKS[name].slice();
    DECKS[name].splice(0, DECKS[name].length, ...cards);
    for (const card of cards) CARD_DECK.set(card.id, name);
  }
  try {
    return fn();
  } finally {
    for (const [name, cards] of Object.entries(saved) as [DeckName, Card[]][]) {
      DECKS[name].splice(0, DECKS[name].length, ...cards);
      for (const card of cards) CARD_DECK.set(card.id, name);
    }
  }
}

export function burnTier(deck: DeckName): BurnTier {
  return (SCHEMA.decks[deck]?.burn ?? 'free') as BurnTier;
}

/**
 * What the dealer does when every card on the asked key has been read
 * tonight (the schema's `spentPolicy`): try the next rung first, or bring
 * the key round again first.
 */
export function spentPolicy(deck: DeckName): SpentPolicy {
  return SCHEMA.decks[deck]?.spent === 'reshuffle' ? 'reshuffle' : 'widen';
}

/** Which card ids are worth remembering between runs. */
export function crossRunOnly(ids: string[]): string[] {
  return ids.filter((id) => {
    const deck = deckOf(id);
    return deck !== null && burnTier(deck) === 'run-to-run';
  });
}

/**
 * A tag off a card, with the schema's alias and default applied. `fixtureRole`
 * on an M3 place card reads back as `watcher`; a find card with no `placeKind`
 * reads back as `any`.
 */
export function tagOf(deck: DeckName, card: Card, name: string): TagValue | undefined {
  const spec = tagSpecs(deck)[name];
  const direct = scalar(card.tags[name]);
  if (direct !== undefined) return direct;
  if (spec?.alias !== undefined) {
    const aliased = scalar(card.tags[spec.alias]);
    if (aliased !== undefined) return aliased;
  }
  return spec?.default;
}

/** A list-valued tag is not a tag you can compare. `motifsOf` reads those. */
function scalar(value: TagValue | TagValue[] | undefined): TagValue | undefined {
  return Array.isArray(value) ? undefined : value;
}

/** The motifs on a card (§A.2), from `tags.motifs` or the top-level field. */
export function motifsOf(card: Card): string[] {
  return readMotifs(card);
}

/**
 * M10 §A.5. A card that has the speaker already know the detective: tagged
 * for an old acquaintance, or calling him by name. Dealt only where the roll
 * says the two of them know each other.
 */
export function knowsTheDetective(deck: DeckName, card: Card): boolean {
  return tagOf(deck, card, 'familiar') === 'yes' || card.text.includes('{detective}');
}

/** Match a tag, treating "any" on the card as a wildcard. */
export function tagIs(deck: DeckName, card: Card, name: string, want: TagValue): boolean {
  const have = tagOf(deck, card, name);
  return have === want || have === 'any';
}

export function slotsOf(card: Card): string[] {
  const out = new Set<string>();
  for (const m of card.text.matchAll(/\{(\w+)\}/g)) out.add(m[1] as string);
  return [...out];
}

export type Slots = Record<string, string | undefined>;

/**
 * Fill a card, or return null when a slot has nothing to go in it.
 *
 * A card that opens on a slot gets its first letter put up, because the place
 * names are written lower case — "the speakeasy" — and a sentence is not.
 */
export function fill(card: Card, slots: Slots): string | null {
  const names = slotsOf(card);
  for (const name of names) {
    const value = slots[name];
    if (value === undefined || value.length === 0) return null;
  }
  // docs/26: a slot that opens a sentence gets its first letter put up
  // wherever it falls — at the start of the card, or after a sentence's end,
  // closing quotation mark and all ("…on it.” A hundred dollars went…").
  const out = card.text.replace(/\{(\w+)\}/g, (_m, name: string, at: number, whole: string) => {
    const value = slots[name] as string;
    // Not after "?”" or "!”": "“Where?” {pronoun} asked" is still one sentence.
    const opens = at === 0 || /(?:\.[”"’)]+|[.!?])\s+$/.test(whole.slice(0, at));
    return opens ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  });
  // Only a card that had something put into it can have a seam in it. A card
  // with no slots is exactly what the writer wrote, punctuation and all.
  return names.length > 0 ? tidyPunctuation(out) : out;
}

export interface Drawn {
  text: string;
  cardId: string;
  deck: DeckName;
  /** The card's motifs, so the page can thread the next block onto them. */
  motifs: string[];
  /** What §A.2 scored it at, for the image budget's trim (§A.1). */
  score: number;
}

export type Match = (card: Card) => boolean;

/**
 * How much more likely a card is for each point of motif score (M4b §A.2).
 * The score used to be a sort, so the best-scoring card won every time it was
 * unread: `off-022` opened 42 of 48 sleepless nights in the rain. Now it is a
 * weight. A card sharing one of the page's motifs (+2) is twice as likely as
 * a neutral one; a card echoing the last page's image (−3) about a third as
 * likely; a card whose weather contradicts the night is still never dealt.
 */
export const MOTIF_WEIGHT = Math.SQRT2;

/** A card's weight in a draw, from its motif score. */
export function weightOf(score: number): number {
  return MOTIF_WEIGHT ** Math.max(-8, Math.min(8, score));
}

/** A reader's history as the store hands it over: one id per time it was read. */
export function readCounts(ids: Iterable<string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of ids) out.set(id, (out.get(id) ?? 0) + 1);
  return out;
}

/**
 * The reset the cross-night pile needs, per deck: once every card of a deck
 * has been read at least once, take one read off each of them, so the counts
 * stay small however many nights a reader plays. The reshuffle itself is the
 * dealer's, per key (it compares counts inside one ask, and a whole deck going
 * down by one changes no comparison); this only keeps the store small.
 *
 * It replaces `CROSS_RUN_TOTAL`, which cleared the pile only when every
 * run-to-run card had been read. `similes` and `asides` are never dealt, so
 * that never happened, and once a key ran out the dealer reshuffled inside it
 * forever.
 */
export function settleReads(reads: Map<string, number>): void {
  for (const deck of DECK_NAMES) {
    if (burnTier(deck) !== 'run-to-run') continue;
    const cards = DECKS[deck];
    if (cards.length === 0) continue;
    let min = Infinity;
    for (const card of cards) {
      min = Math.min(min, reads.get(card.id) ?? 0);
      if (min === 0) break;
    }
    if (!(min > 0) || !Number.isFinite(min)) continue;
    for (const card of cards) {
      const n = (reads.get(card.id) ?? 0) - min;
      if (n > 0) reads.set(card.id, n);
      else reads.delete(card.id);
    }
  }
}

/** One of `items`, each as likely as its weight, off `rng`. */
export function weightedPick<T>(items: readonly T[], weight: (t: T) => number, rng: Rng): T {
  const weights = items.map((t) => Math.max(0, weight(t)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return items[rng.int(items.length)] as T;
  let roll = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] as number;
    if (roll < 0) return items[i] as T;
  }
  return items[items.length - 1] as T;
}

/**
 * Of `items`, the ones the reader has read the fewest times: the part of a
 * key that has not come round yet. When all of them have been read equally
 * often, all of them — which is the reshuffle.
 */
export function leastRead<T>(items: readonly T[], count: (t: T) => number): T[] {
  let least = Infinity;
  for (const t of items) least = Math.min(least, count(t));
  return items.filter((t) => count(t) === least);
}

interface Candidate {
  card: Card;
  score: number;
  text: string;
}

/**
 * The dealer. One per page, seeded from the run; it knows which cards this run
 * has already spent and how often the reader has read each card on earlier
 * nights, and it honours the burn tier of whichever deck it is dealing from.
 *
 * The rule (docs/25): a card that has been read is not dealt again — tonight,
 * or on a later night for a `run-to-run` deck — until the reader has read every
 * card that fits the same ask. Then that ask reshuffles. Among the cards still
 * in the running the draw is a weighted roll, not a sort: motif score is a
 * weight (`weightOf`), and the roll comes off the dealer's seed, which is the
 * run's seed and the page, so the same night read by the same reader is the
 * same transcript.
 */
export class Dealer {
  private readonly rng: Rng;
  private readonly run: Set<string>;
  /** The same ids in the order the run spent them, newest last. */
  private readonly order: string[];
  /** How many times the reader has read each card, as the store had it. */
  private readonly reads: Map<string, number>;
  private readonly reshuffles = new Set<DeckName>();
  readonly spent: string[] = [];

  constructor(seed: number, runBurned: Iterable<string>, persistedBurned: Iterable<string>) {
    this.rng = new Rng(seed >>> 0);
    this.order = [...runBurned];
    this.run = new Set(this.order);
    this.reads = readCounts(persistedBurned);
  }

  /**
   * The last `n` cards this run dealt from `deck`, oldest first.
   *
   * A transition is the first line on a page, and the same first line on
   * three pages running is a reader losing their place. One transition is
   * dealt a page, so the last four ids from that deck are the last four pages
   * that had one, and the page grammar can keep off them without any state of
   * its own.
   */
  recent(deck: DeckName, n: number): string[] {
    const out: string[] = [];
    for (let i = this.order.length - 1; i >= 0 && out.length < n; i--) {
      const id = this.order[i] as string;
      if (deckOf(id) === deck) out.push(id);
    }
    return out.reverse();
  }

  /** The dealer's own randomness, for the handful of hand-written lines. */
  get random(): Rng {
    return this.rng;
  }

  /** How many times the reader has read this card, as the store had it. */
  readCount(id: string): number {
    return this.reads.get(id) ?? 0;
  }

  /**
   * Has this card been read: tonight, or — for a deck remembered across
   * nights — on an earlier night? A card read on an earlier night is not out
   * of the deck for good; it waits until the rest of its key has been read
   * (see `draw`).
   */
  burned(deck: DeckName, id: string): boolean {
    if (this.run.has(id)) return burnTier(deck) !== 'free';
    return burnTier(deck) === 'run-to-run' && this.readCount(id) > 0;
  }

  private take(deck: DeckName, c: Candidate): Drawn {
    this.run.add(c.card.id);
    this.order.push(c.card.id);
    this.spent.push(c.card.id);
    return { text: c.text, cardId: c.card.id, deck, motifs: motifsOf(c.card), score: c.score };
  }

  /**
   * Deal from `deck`, trying each match in turn from the narrowest to the
   * widest. A rung is the key a writer fills: `thought` for a touch on a
   * murder by somebody's account, `hours` for the hour.
   *
   * 1. On each rung, the cards that fit, suit the night's sky and can be
   *    filled from `slots`, less any read tonight.
   * 2. For a deck remembered across nights, only those the reader has read
   *    the fewest times (`leastRead`). A card read on an earlier night waits
   *    until every other card of the key has been read; then they all come
   *    back together. That is the reshuffle, per key and across nights.
   * 3. One of those, weighted by motif score (`weightOf`).
   *
   * A rung with nothing unread tonight widens to the next. When every rung is
   * spent tonight the narrowest rung that has any card at all comes round
   * again, the older half of tonight's reads first, and the deck says so: a
   * deck that reshuffles inside one night is too thin for the tag it was
   * asked for, which is the content team's business and not something to
   * hide.
   */
  draw(
    deck: DeckName,
    matches: Match[],
    slots: Slots = {},
    strict = false,
    ctx?: MotifContext,
  ): Drawn | null {
    const pool = DECKS[deck] ?? [];
    if (pool.length === 0) return null;
    // `strict` refuses the last widening step. A frame with the wrong register
    // still carries the fact and is worth having; an utterance for the wrong
    // fact kind is a lie, so the utterance deck is always drawn strictly.
    const ladder: Match[] = strict ? [...matches] : [...matches, () => true];
    const remembered = burnTier(deck) === 'run-to-run';
    const candidates = (cards: Card[]): Candidate[] => {
      const out: Candidate[] = [];
      for (const card of cards) {
        const score = ctx ? scoreMotifs(motifsOf(card), card, ctx) : 0;
        if (score === -Infinity) continue;
        const text = fill(card, slots);
        if (text === null) continue;
        out.push({ card, score, text });
      }
      return out;
    };
    const roll = (cs: Candidate[]): Candidate => weightedPick(cs, (c) => weightOf(c.score), this.rng);
    // Every card of a key read tonight: it comes round again, the older half
    // of tonight's reads first, so the line just read is not the line read
    // next — and the deck says so.
    const again = (all: Candidate[]): Drawn => {
      const when = (c: Candidate): number => this.order.lastIndexOf(c.card.id);
      const byAge = [...all].sort((a, b) => when(a) - when(b));
      this.reshuffles.add(deck);
      return this.take(deck, roll(byAge.slice(0, Math.max(1, Math.ceil(byAge.length / 2)))));
    };
    const stay = spentPolicy(deck) === 'reshuffle';

    for (const match of ladder) {
      const fits = candidates(pool.filter(match));
      if (fits.length === 0) continue;
      const open = fits.filter((c) => !this.run.has(c.card.id));
      if (open.length > 0) {
        return this.take(deck, roll(remembered ? leastRead(open, (c) => this.readCount(c.card.id)) : open));
      }
      if (stay) return again(fits);
    }
    // Everything that fits has been read tonight, on every rung. Come round
    // again inside the narrowest match that has any cards at all.
    for (const match of ladder) {
      const all = candidates(pool.filter(match));
      if (all.length > 0) return again(all);
    }
    return null;
  }

  /**
   * A choice that was not a card, remembered like one.
   *
   * The reactive monologue is derived rather than dealt — it has to be *about*
   * the board — but "do not say this twice in a night" is exactly what the
   * dealer already knows how to do, and the run's spend is already carried in
   * the save. So a narrowing line is noted here under an id no deck owns:
   * `deckOf` returns null for it, so the burn tiers ignore it and the cross-run
   * pile never sees it, and the run gets its memory for nothing.
   */
  note(id: string): void {
    if (this.run.has(id)) return;
    this.run.add(id);
    this.order.push(id);
    this.spent.push(id);
  }

  /** M13: the noted choices whose ids start with `prefix`, oldest first (tonight's sheets). */
  notedLike(prefix: string): string[] {
    return this.order.filter((id) => id.startsWith(prefix));
  }

  /** Has this id — a card or a noted choice — been spent this run? */
  used(id: string): boolean {
    return this.run.has(id);
  }

  /** Which decks had to come round again since this was last asked. */
  takeReshuffles(): DeckName[] {
    const out = [...this.reshuffles];
    this.reshuffles.clear();
    return out;
  }

  /**
   * Look without spending: does anything fit that has not been read tonight,
   * and suit the night? A key the reader has read out on earlier nights
   * reshuffles rather than running dry, so history never makes this false.
   */
  has(deck: DeckName, match: Match, ctx?: MotifContext): boolean {
    return (DECKS[deck] ?? []).some(
      (c) =>
        match(c) &&
        !this.run.has(c.id) &&
        (!ctx || scoreMotifs(motifsOf(c), c, ctx) !== -Infinity),
    );
  }
}

/* ------------------------------------------------------------------ *
 * Startup validation. The same counts and gaps the script prints, as
 * data, so the book can log them and a test can assert on them.
 * ------------------------------------------------------------------ */

export interface DeckReport {
  deck: DeckName;
  count: number;
  target: number | null;
  burn: BurnTier;
  byStatus: Record<string, number>;
  errors: string[];
  gaps: string[];
  cells: number;
  filled: number;
  /** M4b §A.2: how many of this deck's cards carry at least one motif. */
  tagged: number;
  /** Which motifs this deck uses at all, most used first. */
  motifsUsed: { motif: string; count: number }[];
}

function allowedValues(deck: DeckName, tagName: string): TagValue[] {
  const spec = tagSpecs(deck)[tagName];
  if (!spec) return [];
  const out: TagValue[] = [];
  if (spec.vocab) out.push(...(SCHEMA.vocab[spec.vocab] ?? []));
  if (spec.values) out.push(...spec.values);
  if (spec.extraValues) out.push(...spec.extraValues);
  return out;
}

export function validateDecks(): DeckReport[] {
  return DECK_NAMES.map((deck) => {
    const spec = SCHEMA.decks[deck] as DeckSpec;
    const cards = DECKS[deck];
    const errors: string[] = [];
    const byStatus: Record<string, number> = {};
    const seen = new Set<string>();
    const knownSlots = new Set([...SCHEMA.common.slots, ...(spec?.slots ?? [])]);
    const specTags = tagSpecs(deck);
    const motifCount = new Map<string, number>();
    let tagged = 0;

    for (const card of cards) {
      byStatus[card.status] = (byStatus[card.status] ?? 0) + 1;
      if (seen.has(card.id)) errors.push(`${card.id}: duplicate id`);
      seen.add(card.id);
      if (spec && !spec.deckValues.includes(card.deck)) errors.push(`${card.id}: deck "${card.deck}"`);
      if (!SCHEMA.common.statuses.includes(card.status))
        errors.push(`${card.id}: status "${card.status}"`);

      /* The motif vocabulary is closed (§A.2): a word outside it is an error,
       * never a warning, because a vocabulary that grows to fit the cards
       * stops being one and the scoring stops meaning anything. */
      const rawWeather = card.weather ?? card.tags.weather;
      if (
        typeof rawWeather === 'string' &&
        !['clear', 'rain', 'fog', 'cold', 'any'].includes(rawWeather)
      ) {
        errors.push(`${card.id}: weather = ${rawWeather}`);
      }
      const rawMotifs = card.motifs ?? card.tags.motifs;
      if (rawMotifs !== undefined) {
        const words = Array.isArray(rawMotifs)
          ? rawMotifs.map((w) => String(w))
          : String(rawMotifs).split(/[,\s]+/).filter((w) => w.length > 0);
        for (const word of words) {
          if (!MOTIFS.has(word.trim().toLowerCase()))
            errors.push(`${card.id}: motif "${word}" is not in content/motifs.json`);
        }
        if (words.length > 3)
          errors.push(`${card.id}: ${words.length} motifs; one to three is the rule`);
      }
      const motifs = motifsOf(card);
      if (motifs.length > 0) tagged++;
      for (const m of motifs) motifCount.set(m, (motifCount.get(m) ?? 0) + 1);

      for (const [tagName, tagSpec] of Object.entries(specTags)) {
        if (tagSpec.list) continue;
        const value = tagOf(deck, card, tagName);
        if (value === undefined) {
          if (tagSpec.required) errors.push(`${card.id}: missing tag "${tagName}"`);
          continue;
        }
        if (!allowedValues(deck, tagName).includes(value))
          errors.push(`${card.id}: ${tagName} = ${String(value)}`);
      }
      for (const slot of slotsOf(card)) {
        if (!knownSlots.has(slot)) errors.push(`${card.id}: slot {${slot}}`);
      }
      for (const slot of spec?.requiredSlots ?? []) {
        if (!card.text.includes(`{${slot}}`)) errors.push(`${card.id}: needs {${slot}}`);
      }
    }

    const gaps: string[] = [];
    let cells = 0;
    let filled = 0;
    if (MISSING_DECKS.includes(deck)) {
      gaps.push(`the deck file is not on disk yet; the engine falls back and logs the gap`);
    }
    for (const tuple of spec?.coverage ?? []) {
      const axes = tuple.map((name) => ({
        name,
        values: allowedValues(deck, name).filter((v) => v !== 'any'),
      }));
      const combos = axes.reduce<TagValue[][]>(
        (acc, axis) => acc.flatMap((prefix) => axis.values.map((v) => [...prefix, v])),
        [[]],
      );
      for (const combo of combos) {
        cells++;
        const any = cards.some((card) =>
          axes.every((axis, i) => tagIs(deck, card, axis.name, combo[i] as TagValue)),
        );
        if (any) filled++;
        else gaps.push(`${tuple.join(' × ')}: ${combo.join(' × ')}`);
      }
    }

    return {
      deck,
      count: cards.length,
      target: spec?.target ?? null,
      burn: spec?.burn ?? 'free',
      byStatus,
      errors,
      gaps,
      cells,
      filled,
      tagged,
      motifsUsed: [...motifCount.entries()]
        .map(([motif, count]) => ({ motif, count }))
        .sort((a, b) => b.count - a.count || a.motif.localeCompare(b.motif)),
    };
  });
}
