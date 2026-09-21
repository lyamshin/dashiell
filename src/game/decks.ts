/**
 * The fragment decks, as data. The cards themselves live in `content/decks/`
 * and were written in M-style; this milestone only deals them.
 */

import placesJson from '../../content/decks/places.json';
import witnessJson from '../../content/decks/witness.json';
import similesJson from '../../content/decks/similes.json';

export interface CardTags {
  mood: 'flat' | 'wry' | 'menace' | 'grief' | 'tired' | 'tender';
  target?: string;
  placeKind?: 'private' | 'semi' | 'public';
  fixtureRole?: string;
  register?: 'truth' | 'lie' | 'evasion';
  intensity: 1 | 2 | 3;
}

export interface Card {
  id: string;
  deck: 'simile' | 'place' | 'witness';
  text: string;
  tags: CardTags;
  avoidNear?: string[];
  status: string;
  notes?: string;
}

export const PLACE_DECK = placesJson as unknown as Card[];
export const WITNESS_DECK = witnessJson as unknown as Card[];
export const SIMILE_DECK = similesJson as unknown as Card[];

export const ALL_CARDS: Card[] = [...PLACE_DECK, ...WITNESS_DECK, ...SIMILE_DECK];

/** Which slots a card's text asks to be filled. */
export function slotsOf(card: Card): string[] {
  const out = new Set<string>();
  for (const m of card.text.matchAll(/\{(\w+)\}/g)) out.add(m[1] as string);
  return [...out];
}

/**
 * Fill a card. Returns null when a slot has nothing to go in it — the voice
 * engine skips the card rather than printing a hole.
 */
export function fill(card: Card, slots: Record<string, string | undefined>): string | null {
  let out = card.text;
  for (const name of slotsOf(card)) {
    const value = slots[name];
    if (value === undefined || value.length === 0) return null;
    out = out.split(`{${name}}`).join(value);
  }
  return out;
}
