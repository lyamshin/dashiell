/**
 * The card shape, filling a card's slots, and the four decks from before the
 * board that it still deals from as they are: the office (the room at
 * midnight, and its prop), the client's entrance, the watcher's clause, and
 * the look of a trade (the character deck's `look` cards and their traits).
 *
 * The board's own families live in `content/board/` (`decks.ts`).
 */

import characterJson from '../../../content/decks/character.json';
import entrancesJson from '../../../content/decks/entrances.json';
import officeJson from '../../../content/decks/office.json';
import watchJson from '../../../content/decks/watch.json';
import { LOWER, midSentence } from './bones/voice.js';

export type TagValue = string | number;

export interface Card {
  id: string;
  deck: string;
  text: string;
  tags: Record<string, TagValue | TagValue[]>;
  /** The night's weather the card is written for, if any. */
  weather?: string;
  /** What a later line may reuse of this card: the prop it puts in the room, the trait it gives a person. */
  exports?: Record<string, CardExport>;
  /** A punchline, or a figure meant to be funny. A page tells about one. */
  joke?: boolean;
  status: string;
  notes?: string;
}

/** One role a card offers a later line. */
export interface CardExport {
  /** The whole noun phrase: "a mirror whose silvering had gone, spotted black in the corners". */
  text: string;
  /** How the page refers back to it: "the mirror". */
  short: string;
  kind?: string;
  near?: string;
  /** Closing lines written for this card's prop, the best callbacks there are. */
  pay?: string[];
}

export type DeckName = 'office' | 'entrances' | 'watch' | 'character';

const RAW: Record<DeckName, unknown> = {
  office: officeJson,
  entrances: entrancesJson,
  watch: watchJson,
  character: characterJson,
};

export const DECKS: Record<DeckName, Card[]> = Object.fromEntries(
  (Object.keys(RAW) as DeckName[]).map((name) => [name, (RAW[name] as Card[]).filter((c) => c.status !== 'cut')]),
) as Record<DeckName, Card[]>;

export function slotsOf(card: { text: string }): string[] {
  const out = new Set<string>();
  for (const m of card.text.matchAll(/\{(\w+)\}/g)) out.add(m[1] as string);
  return [...out];
}

export type Slots = Record<string, string | undefined>;

/**
 * Fill a card, or return null when a slot has nothing to go in it.
 *
 * A slot that opens a sentence gets its first letter put up, wherever it
 * falls: at the start of the card, or after a sentence's end, closing
 * quotation mark and all ("…on it.” A hundred dollars went…").
 */
export function fill(card: { text: string }, slots: Slots): string | null {
  const names = slotsOf(card);
  for (const name of names) {
    const value = slots[name];
    if (value === undefined || value.length === 0) return null;
  }
  const out = card.text.replace(/\{(\w+)\}/g, (_m, name: string, at: number, whole: string) => {
    const value = slots[name] as string;
    // Not after "?”" or "!”": "“Where?” {pronoun} asked" is still one sentence.
    const opens = at === 0 || /(?:\.[”"’)]+|[.!?])\s+$/.test(whole.slice(0, at));
    if (opens) return value.charAt(0).toUpperCase() + value.slice(1);
    // docs/59 item 8: a clause the case says whole ("He threw her out…") goes lower case inside a sentence.
    return name === name.toLowerCase() && LOWER.test(value) && midSentence(whole, at) ? value.charAt(0).toLowerCase() + value.slice(1) : value;
  });
  // Only a card that had something put into it can have a seam in it. A card
  // with no slots is exactly what the writer wrote, punctuation and all.
  return names.length > 0 ? tidyPunctuation(out) : out;
}

/**
 * "the a bronze bookend": a slot's own article after the frame's. The frame's
 * "the" stays; an "a" the frame wrote is made to agree with what follows it.
 */
export function collapseArticles(text: string): string {
  return text.replace(/\b(the|a|an|The|A|An)\s+(?:an?|the)\s+([A-Za-z])/g, (_m, outer: string, first: string) => {
    if (outer.toLowerCase() === 'the') return `${outer} ${first}`;
    const vowel = /[aeiou]/i.test(first);
    const article = outer[0] === 'A' ? (vowel ? 'An' : 'A') : vowel ? 'an' : 'a';
    return `${article} ${first}`;
  });
}

/**
 * A full stop that closes a sentence, with a lower-case word behind it. The
 * lookbehinds spare an abbreviation: "3 a.m. was empty", "Mrs. Teague's",
 * "St. Mark's Place".
 */
const STOP_THEN_LOWER =
  /(?<!\b[a-z])(?<!\b(?:[Mm]r|[Mm]rs|[Mm]s|[Dd]r|[Ss]t|[Jj]r|[Ss]r|[Nn]o))(\.[”"’)]+|[.!?…])(\s+["“'(]*)([a-z])/g;

/**
 * Collapse the punctuation a join produced: a card's full stop and the mark
 * the frame wanted after it, two stops in a row, a stop inside the quotation
 * marks and another outside. Nothing here invents punctuation; a sentence a
 * slot started lower-case ("the speakeasy" always is) keeps its stop and gets
 * a capital.
 */
export function tidyPunctuation(text: string): string {
  return collapseArticles(text)
    .replace(/\.\s*(?=[,;:])/g, '')
    .replace(/([.!?…])\s*\1/g, '$1')
    .replace(/\.\s*([!?…])/g, '$1')
    .replace(/([!?…])\s*\./g, '$1')
    .replace(/([.!?…])(["”’'])\s*\./g, '$1$2')
    .replace(STOP_THEN_LOWER, (_m, stop: string, gap: string, letter: string) => `${stop}${gap}${letter.toUpperCase()}`)
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
