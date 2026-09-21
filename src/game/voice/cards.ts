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
 * - `free` — transitions, business, Humphrey's lines, utterances. These are
 *   the furniture of a page and are allowed to come round again.
 */

import { Rng } from '../../gen/rng.js';
import schemaJson from '../../../content/deck-schema.json';
import similesJson from '../../../content/decks/similes.json';
import placesJson from '../../../content/decks/places.json';
import witnessJson from '../../../content/decks/witness.json';
import portraitsJson from '../../../content/decks/portraits.json';
import businessJson from '../../../content/decks/business.json';
import humphreyJson from '../../../content/decks/humphrey.json';
import framesJson from '../../../content/decks/frames.json';
import utterancesJson from '../../../content/decks/utterances.json';
import findJson from '../../../content/decks/find.json';
import arrivalsJson from '../../../content/decks/arrivals.json';
import transitionsJson from '../../../content/decks/transitions.json';
import ambientJson from '../../../content/decks/ambient.json';
import asidesJson from '../../../content/decks/asides.json';
import endingsJson from '../../../content/decks/endings.json';

export type DeckName =
  | 'similes'
  | 'portraits'
  | 'business'
  | 'humphrey-lines'
  | 'frames'
  | 'utterances'
  | 'find'
  | 'arrivals'
  | 'transitions'
  | 'ambient'
  | 'asides'
  | 'places'
  | 'endings'
  | 'witness';

export type BurnTier = 'run-to-run' | 'within-run' | 'free';

export type TagValue = string | number;

export interface Card {
  id: string;
  deck: string;
  text: string;
  tags: Record<string, TagValue>;
  avoidNear?: string[];
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
  vocab: Record<string, TagValue[]>;
  decks: Record<string, DeckSpec>;
}

export const SCHEMA = schemaJson as unknown as Schema;

const RAW: Record<DeckName, unknown> = {
  similes: similesJson,
  places: placesJson,
  witness: witnessJson,
  portraits: portraitsJson,
  business: businessJson,
  'humphrey-lines': humphreyJson,
  frames: framesJson,
  utterances: utterancesJson,
  find: findJson,
  arrivals: arrivalsJson,
  transitions: transitionsJson,
  ambient: ambientJson,
  asides: asidesJson,
  endings: endingsJson,
};

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
  const spec = SCHEMA.decks[deck]?.tags[name];
  const direct = card.tags[name];
  if (direct !== undefined) return direct;
  if (spec?.alias !== undefined && card.tags[spec.alias] !== undefined) return card.tags[spec.alias];
  return spec?.default;
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
  let out = card.text;
  for (const name of slotsOf(card)) {
    const value = slots[name];
    if (value === undefined || value.length === 0) return null;
    out = out.split(`{${name}}`).join(value);
  }
  if (/^\{/.test(card.text)) out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

export interface Drawn {
  text: string;
  cardId: string;
  deck: DeckName;
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
  private readonly persisted: Set<string>;
  readonly spent: string[] = [];

  constructor(seed: number, runBurned: Iterable<string>, persistedBurned: Iterable<string>) {
    this.rng = new Rng(seed >>> 0);
    this.run = new Set(runBurned);
    this.persisted = new Set(persistedBurned);
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

  private take(deck: DeckName, card: Card, slots: Slots): Drawn | null {
    const text = fill(card, slots);
    if (text === null) return null;
    this.run.add(card.id);
    this.spent.push(card.id);
    return { text, cardId: card.id, deck };
  }

  /**
   * Deal from `deck`, trying each match in turn from the narrowest to the
   * widest. Nothing repeats until the deck's whole pool is spent, at which
   * point it reshuffles — M3's lesson: widen all the way to the deck before
   * reaching back for a card already read.
   */
  draw(deck: DeckName, matches: Match[], slots: Slots = {}, strict = false): Drawn | null {
    const pool = DECKS[deck] ?? [];
    if (pool.length === 0) return null;
    // `strict` refuses the last widening step. A frame with the wrong register
    // still carries the fact and is worth having; an utterance for the wrong
    // fact kind is a lie, so the utterance deck is always drawn strictly.
    const ladder: Match[] = strict ? [...matches] : [...matches, () => true];
    for (const match of ladder) {
      const fresh = pool.filter((c) => match(c) && !this.burned(deck, c.id));
      // A `free` deck may repeat, but it should not repeat while anything
      // else fits: within a page and within a run, prefer what has not been
      // dealt yet. Transitions and business are furniture, not wallpaper.
      const shuffled = this.rng
        .shuffle(fresh)
        .sort((a, b) => Number(this.run.has(a.id)) - Number(this.run.has(b.id)));
      for (const card of shuffled) {
        const drawn = this.take(deck, card, slots);
        if (drawn) return drawn;
      }
    }
    // Everything that fits has been read. Reshuffle inside the narrowest match
    // that has any cards at all.
    for (const match of ladder) {
      const all = pool.filter(match);
      if (all.length === 0) continue;
      for (const card of this.rng.shuffle(all)) {
        const drawn = this.take(deck, card, slots);
        if (drawn) return drawn;
      }
    }
    return null;
  }

  /** Look without spending: does anything unburned fit? */
  has(deck: DeckName, match: Match): boolean {
    return (DECKS[deck] ?? []).some((c) => match(c) && !this.burned(deck, c.id));
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
}

function allowedValues(deck: DeckName, tagName: string): TagValue[] {
  const spec = SCHEMA.decks[deck]?.tags[tagName];
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
    const knownSlots = new Set([...SCHEMA.common.slots, ...(spec.slots ?? [])]);

    for (const card of cards) {
      byStatus[card.status] = (byStatus[card.status] ?? 0) + 1;
      if (seen.has(card.id)) errors.push(`${card.id}: duplicate id`);
      seen.add(card.id);
      if (!spec.deckValues.includes(card.deck)) errors.push(`${card.id}: deck "${card.deck}"`);
      if (!SCHEMA.common.statuses.includes(card.status))
        errors.push(`${card.id}: status "${card.status}"`);
      for (const [tagName, tagSpec] of Object.entries(spec.tags)) {
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
      for (const slot of spec.requiredSlots ?? []) {
        if (!card.text.includes(`{${slot}}`)) errors.push(`${card.id}: needs {${slot}}`);
      }
    }

    const gaps: string[] = [];
    let cells = 0;
    let filled = 0;
    for (const tuple of spec.coverage ?? []) {
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
      target: spec.target ?? null,
      burn: spec.burn,
      byStatus,
      errors,
      gaps,
      cells,
      filled,
    };
  });
}
