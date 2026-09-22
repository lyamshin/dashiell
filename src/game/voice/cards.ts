/**
 * The decks, and the one loader that deals them.
 *
 * `content/deck-schema.json` is the M4 Part B schema as data. It is the same
 * file `scripts/validate-decks.mjs` reads, so a deck that passes the validator
 * is a deck this loader can deal, and a tag a writer adds there is a tag the
 * engine can match on without a code change.
 *
 * Burn tiers (A.8) live in the schema too:
 *
 * - `run-to-run` — similes, portraits, asides, endings. Never repeated across
 *   runs; the browser remembers the ids until the deck is exhausted.
 * - `within-run` — frames, places, ambient, arrivals, find. Never repeated
 *   inside one run.
 * - `free` — transitions, business, Dashiell's lines, utterances. These are
 *   the furniture of a page and are allowed to come round again.
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
  | 'answer';

export type BurnTier = 'run-to-run' | 'within-run' | 'free';

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
  status: string;
  notes?: string;
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

/** Which card ids are worth remembering between runs. */
export function crossRunOnly(ids: string[]): string[] {
  return ids.filter((id) => {
    const deck = deckOf(id);
    return deck !== null && burnTier(deck) === 'run-to-run';
  });
}

/** How many cards the cross-run pile holds when it is full. */
export const CROSS_RUN_TOTAL = DECK_NAMES.filter((d) => burnTier(d) === 'run-to-run').reduce(
  (n, d) => n + DECKS[d].length,
  0,
);

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
  let out = card.text;
  for (const name of names) {
    const value = slots[name];
    if (value === undefined || value.length === 0) return null;
    out = out.split(`{${name}}`).join(value);
  }
  if (/^\{/.test(card.text)) out = out.charAt(0).toUpperCase() + out.slice(1);
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
 * The dealer. One per page, seeded from the run; it knows which cards this run
 * has already spent and which ones the browser remembers from earlier runs,
 * and it honours the burn tier of whichever deck it is dealing from.
 */
export class Dealer {
  private readonly rng: Rng;
  private readonly run: Set<string>;
  /** The same ids in the order the run spent them, newest last. */
  private readonly order: string[];
  private readonly persisted: Set<string>;
  private readonly reshuffles = new Set<DeckName>();
  readonly spent: string[] = [];

  constructor(seed: number, runBurned: Iterable<string>, persistedBurned: Iterable<string>) {
    this.rng = new Rng(seed >>> 0);
    this.order = [...runBurned];
    this.run = new Set(this.order);
    this.persisted = new Set(persistedBurned);
  }

  /**
   * The last `n` cards this run dealt from `deck`, oldest first.
   *
   * A `free` deck may come round again — that is what the tier means — but a
   * transition is the first line on a page, and the same first line on three
   * pages running is not a free deck working, it is a reader losing their
   * place. One transition is dealt a page, so the last four ids from that deck
   * are the last four pages that had one, and the page grammar can keep off
   * them without any state of its own.
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

  burned(deck: DeckName, id: string): boolean {
    switch (burnTier(deck)) {
      case 'run-to-run':
        return this.run.has(id) || this.persisted.has(id);
      case 'within-run':
        return this.run.has(id);
      default:
        return false;
    }
  }

  private take(deck: DeckName, card: Card, slots: Slots, score: number): Drawn | null {
    const text = fill(card, slots);
    if (text === null) return null;
    this.run.add(card.id);
    this.order.push(card.id);
    this.spent.push(card.id);
    return { text, cardId: card.id, deck, motifs: motifsOf(card), score };
  }

  /**
   * Deal from `deck`, trying each match in turn from the narrowest to the
   * widest. Nothing repeats until the deck's whole pool is spent, at which
   * point it reshuffles — M3's lesson: widen all the way to the deck before
   * reaching back for a card already read.
   *
   * M4b §A.2 adds closeness on top of the tag match, which stays the hard
   * filter: inside one rung of the ladder the cards are ordered by their motif
   * score, and a card whose weather contradicts the night is not in the rung
   * at all. Ties are broken by the seeded shuffle exactly as before, so the
   * same seed is still the same night.
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
    const scoreOf = (card: Card): number =>
      ctx ? scoreMotifs(motifsOf(card), card, ctx) : 0;
    /** Best first: score, then a card this run has not read yet. */
    const order = (cards: Card[]): { card: Card; score: number }[] =>
      this.rng
        .shuffle(cards)
        .map((card) => ({ card, score: scoreOf(card) }))
        .filter((c) => c.score !== -Infinity)
        .sort(
          (a, b) =>
            b.score - a.score || Number(this.run.has(a.card.id)) - Number(this.run.has(b.card.id)),
        );

    for (const match of ladder) {
      const fresh = pool.filter((c) => match(c) && !this.burned(deck, c.id));
      // A `free` deck may repeat, but it should not repeat while anything
      // else fits: within a page and within a run, prefer what has not been
      // dealt yet. Transitions and business are furniture, not wallpaper.
      for (const { card, score } of order(fresh)) {
        const drawn = this.take(deck, card, slots, score);
        if (drawn) return drawn;
      }
    }
    // Everything that fits has been read. Reshuffle inside the narrowest match
    // that has any cards at all, and say so: a deck that reshuffles inside one
    // run is a deck that is too thin for the tag it was asked for, which is
    // the content team's business and not something to hide.
    for (const match of ladder) {
      const all = pool.filter(match);
      if (all.length === 0) continue;
      for (const { card, score } of order(all)) {
        const drawn = this.take(deck, card, slots, score);
        if (drawn) {
          this.reshuffles.add(deck);
          return drawn;
        }
      }
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

  /** Look without spending: does anything unburned fit, and suit the night? */
  has(deck: DeckName, match: Match, ctx?: MotifContext): boolean {
    return (DECKS[deck] ?? []).some(
      (c) =>
        match(c) &&
        !this.burned(deck, c.id) &&
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
