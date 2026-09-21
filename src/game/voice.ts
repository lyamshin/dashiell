/**
 * The placeholder voice engine.
 *
 * It decorates around a clue and never rewrites one. A page is, at most:
 *
 *   place card  →  witness card  →  THE CLUE TEXT, VERBATIM  →  simile
 *
 * Only the middle line is load-bearing. Everything else is drawn from the
 * decks without replacement, so no player reads the same card twice until the
 * deck is exhausted, and an intensity-3 simile lands once a run at most.
 */

import { Rng } from '../gen/rng.js';
import type { Clue, Id, Person, Tick } from '../gen/types.js';
import { clock } from '../gen/types.js';
import type { Card } from './decks.js';
import { ALL_CARDS, PLACE_DECK, SIMILE_DECK, WITNESS_DECK, fill } from './decks.js';
import type { CaseView } from './derive.js';
import { clueTick } from './derive.js';
import {
  NOTHING_LINES,
  NOTHING_LEFT,
  PLAIN_ARRIVALS,
  ROOM_LINES,
  type NothingLine,
} from './voice-data.js';

const CARD_BY_ID = new Map<string, Card>(ALL_CARDS.map((c) => [c.id, c]));

export interface Drawn {
  text: string;
  /** The card spent, when a card was spent. Hand-written lines burn too. */
  cardId: string | null;
}

export type Slots = Record<string, string | undefined>;

/**
 * Which witness-deck voice a suspect speaks in. The deck tags its non-fixture
 * lines by the four archetypes it was written for; a suspect is filed under
 * whichever fits their relationship to the victim. Derived here, not in the
 * generator.
 */
export const ARCHETYPE_VOICE: Record<string, string> = {
  'rel-partner': 'business-partner',
  'rel-rival': 'business-partner',
  'rel-creditor': 'business-partner',
  'rel-debtor': 'business-partner',
  'rel-lawyer': 'business-partner',
  'rel-customer': 'business-partner',
  'rel-cousin': 'relative',
  'rel-inlaw': 'relative',
  'rel-spouse': 'relative',
  'rel-engaged': 'relative',
  'rel-willed': 'relative',
  'rel-secretary': 'secretary',
  'rel-employee': 'secretary',
  'rel-witness': 'secretary',
  'rel-nurse': 'secretary',
  'rel-neighbor': 'neighbor',
  'rel-tenant': 'neighbor',
  'rel-landlord': 'neighbor',
  'rel-childhood': 'neighbor',
};

export function voiceRoleOf(person: Person): string {
  if (person.fixtureRole) return person.fixtureRole;
  return ARCHETYPE_VOICE[person.relationshipId ?? ''] ?? 'neighbor';
}

/** What a simile on this page should be about, best guess first. */
export function simileTargets(view: CaseView, clue: Clue | null, placeId: Id): string[] {
  const kind = view.placeById.get(placeId)?.kind ?? 'semi';
  const byPlace = kind === 'public' ? ['street', 'city'] : kind === 'private' ? ['room'] : ['room', 'drink'];
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

export class Voice {
  private readonly rng: Rng;
  private readonly burned: Set<string>;
  readonly spent: string[] = [];

  constructor(
    private readonly view: CaseView,
    private readonly detectiveName: string,
    burned: Iterable<string>,
    seed: number,
  ) {
    this.rng = new Rng(seed >>> 0);
    this.burned = new Set(burned);
  }

  /** True once this run has already shown off. */
  private get showedOff(): boolean {
    for (const id of this.burned) {
      const card = CARD_BY_ID.get(id);
      if (card?.deck === 'simile' && card.tags.intensity === 3) return true;
    }
    return false;
  }

  private take(card: Card, slots: Slots): Drawn | null {
    const text = fill(card, slots);
    if (text === null) return null;
    this.burned.add(card.id);
    this.spent.push(card.id);
    return { text, cardId: card.id };
  }

  /**
   * Draw one unburned card from `pool`, skipping any whose slots cannot be
   * filled. Never repeats.
   */
  private drawFresh(pool: Card[], slots: Slots): Drawn | null {
    for (const card of this.rng.shuffle(pool.filter((c) => !this.burned.has(c.id)))) {
      const drawn = this.take(card, slots);
      if (drawn) return drawn;
    }
    return null;
  }

  /**
   * The last resort: the deck is exhausted, so it reshuffles. Every caller
   * widens its match all the way to its whole deck before reaching for this,
   * so a card only ever comes round twice once there is nothing else left.
   */
  private reshuffle(pool: Card[], slots: Slots): Drawn | null {
    for (const card of this.rng.shuffle(pool)) {
      const drawn = this.take(card, slots);
      if (drawn) return drawn;
    }
    return null;
  }

  /** A place card, on arrival only. Matched on kind, then on the watcher. */
  placeCard(placeId: Id): Drawn | null {
    const place = this.view.placeById.get(placeId);
    if (!place) return null;
    const slots: Slots = { place: place.shortName, detective: this.detectiveName };
    // Every card in the place deck is written in some fixture's furniture, so
    // a room with nobody posted in it gets a hand-written line instead. See
    // ROOM_LINES.
    if (!place.watcher) {
      const pool = ROOM_LINES.filter((l) => l.placeKind === place.kind);
      const fresh = pool.filter((l) => !this.burned.has(l.id));
      const line = (fresh.length > 0 ? fresh : pool)[
        this.rng.int(Math.max(1, (fresh.length > 0 ? fresh : pool).length))
      ];
      if (!line) return null;
      this.burned.add(line.id);
      this.spent.push(line.id);
      return { text: line.text.split('{place}').join(place.shortName), cardId: line.id };
    }
    const exact = PLACE_DECK.filter(
      (c) =>
        c.tags.placeKind === place.kind &&
        (place.watcher ? c.tags.fixtureRole === place.watcher : true),
    );
    const loose = PLACE_DECK.filter((c) => c.tags.placeKind === place.kind);
    return (
      this.drawFresh(exact, slots) ??
      this.drawFresh(loose, slots) ??
      this.drawFresh(PLACE_DECK, slots) ??
      this.reshuffle(exact.length > 0 ? exact : PLACE_DECK, slots)
    );
  }

  plainArrival(placeId: Id): string {
    const place = this.view.placeById.get(placeId);
    const line = this.rng.pick(PLAIN_ARRIVALS);
    return line.split('{place}').join(place?.shortName ?? 'the address');
  }

  nothingLeft(placeId: Id): string {
    const place = this.view.placeById.get(placeId);
    return this.rng.pick(NOTHING_LEFT).split('{place}').join(place?.shortName ?? 'the room');
  }

  /**
   * The line the person says before the fact. `register` is the spec's:
   * evasion when the speaker is lying about the tick this clue is about, lie
   * when they are reciting their own false account, truth otherwise.
   */
  witnessCard(speakerId: Id, register: 'truth' | 'lie' | 'evasion', slots: Slots): Drawn | null {
    const person = this.view.personById.get(speakerId);
    if (!person) return null;
    const role = voiceRoleOf(person);
    const full: Slots = { name: slots.name ?? person.surname, ...slots };
    const exact = WITNESS_DECK.filter(
      (c) => c.tags.fixtureRole === role && c.tags.register === register,
    );
    const byRole = WITNESS_DECK.filter((c) => c.tags.fixtureRole === role);
    const byRegister = WITNESS_DECK.filter((c) => c.tags.register === register);
    return (
      this.drawFresh(exact, full) ??
      this.drawFresh(byRole, full) ??
      this.drawFresh(byRegister, full) ??
      this.drawFresh(WITNESS_DECK, full) ??
      this.reshuffle(exact.length > 0 ? exact : byRole, full)
    );
  }

  /** At most one per page; intensity 3 at most once a run. */
  simile(targets: string[], slots: Slots): Drawn | null {
    const cap = this.showedOff ? 2 : 3;
    const within = SIMILE_DECK.filter((c) => c.tags.intensity <= cap);
    for (const target of targets) {
      const drawn = this.drawFresh(
        within.filter((c) => c.tags.target === target),
        slots,
      );
      if (drawn) return drawn;
    }
    // Nothing fresh on any target this page is about. Rather than reach for a
    // simile about something else, the page simply does without one — until
    // the whole deck is spent, at which point it reshuffles.
    if (within.some((c) => !this.burned.has(c.id))) return null;
    const first = targets[0];
    if (!first) return null;
    return this.reshuffle(
      within.filter((c) => c.tags.target === first),
      slots,
    );
  }

  nothingAnswer(tag: NothingLine['tag'], slots: Slots): Drawn {
    const pool = NOTHING_LINES.filter((l) => l.tag === tag);
    const fresh = pool.filter((l) => !this.burned.has(l.id));
    const line = this.rng.pick(fresh.length > 0 ? fresh : pool);
    this.burned.add(line.id);
    this.spent.push(line.id);
    let text = line.text;
    for (const [k, v] of Object.entries(slots)) {
      if (v === undefined) continue;
      text = text.split(`{${k}}`).join(v);
    }
    // Any slot the caller could not fill loses its sentence rather than
    // printing a brace.
    text = text.replace(/\{[a-z]+\}/g, 'it');
    return { text, cardId: line.id };
  }
}

/** Which register a speaker delivers a clue in. Pure, derived from schedules. */
export function registerFor(view: CaseView, speakerId: Id, clue: Clue | null): 'truth' | 'lie' | 'evasion' {
  if (!clue) return 'truth';
  const tick = clueTick(clue);
  if (tick === null) return 'truth';
  const lies = view.liesOf.get(speakerId);
  if (lies?.has(tick as Tick)) return 'evasion';
  return 'truth';
}

/** Slots a clue makes available to a card. */
export function slotsFor(
  view: CaseView,
  detectiveName: string,
  placeId: Id,
  clue: Clue | null,
  subjectId: Id | null,
): Slots {
  const tick = clue ? clueTick(clue) : null;
  const objectId = view.kase.method.evidenceObjectId;
  const slots: Slots = {
    place: view.placeById.get(placeId)?.shortName,
    detective: detectiveName,
    object: view.objectById.get(objectId)?.name,
  };
  if (subjectId) slots.name = view.personById.get(subjectId)?.surname;
  if (tick !== null) slots.time = clock(tick);
  return slots;
}
