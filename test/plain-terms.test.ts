import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from '../scripts/plain-terms.mjs';

/**
 * "Say what it is" (docs/style-guide.md, docs/21-plain-terms-notes.md).
 *
 * The banned-terms list in `content/plain-terms.json` is data, and it knows
 * the terms the designer named. Every card the board can deal is held to it
 * here, words and callbacks; the nights themselves are held to it in
 * test/board-engine.test.ts, over the oracle's and the wanderer's pages.
 */

interface Hit {
  term: string;
  match: string;
  index: number;
}

const list = loadPlainTerms();
const find = (text: string): Hit[] => findJargon(text, list) as Hit[];

/** Every string a player could read off a card: its text, and what it exports for a later line. */
function cardStrings(card: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (typeof card.text === 'string') out.push(card.text);
  const exports = card.exports as Record<string, { text?: string; short?: string; pay?: string[] }> | undefined;
  for (const ex of Object.values(exports ?? {})) {
    if (ex.text) out.push(ex.text);
    if (ex.short) out.push(ex.short);
    out.push(...(ex.pay ?? []));
  }
  return out;
}

describe('plain terms: no banned genre term in anything a player reads', () => {
  it('the list is data, and every pattern compiles', () => {
    expect(list.terms.length).toBeGreaterThan(20);
    for (const t of list.terms) {
      expect(typeof t.term).toBe('string');
      expect(typeof t.plain).toBe('string');
      expect(t.patterns.length).toBeGreaterThan(0);
    }
  });

  it('knows the terms the designer named, and passes their literal senses', () => {
    const banned = [
      'has held the paper on the building Sweeney lived in since ’22',
      'has been carrying Sweeney’s paper since ’22 and renewing it',
      'Fencing stolen goods',
      'A paper of powder at the Arcadia',
      'I run policy for a bank uptown.',
      'I run a book on the horses.',
      'A promissory note for $4,000',
      'A book of markers with his initials against four of them.',
      'Who do you like for it?',
    ];
    for (const s of banned) expect(find(s).length, s).toBeGreaterThan(0);
    const literal = [
      'The landlady’s note was still folded in my coat.',
      'Caught in the fence bordering the lot, a scrap of paper.',
      'The rain had driven everybody off the square but a man asleep under yesterday’s paper.',
      'was the beneficiary of a life-insurance policy',
      'She held the paper at arm’s length.',
      'His voice dropped soft as a hand over a phone mouthpiece.',
      'I wrote it down in the book.',
    ];
    for (const s of literal) expect(find(s), s).toEqual([]);
  });

  it('finds none in any card the board deals: content/board and the four old decks', () => {
    const found: string[] = [];
    let cards = 0;
    for (const dir of ['content/board', 'content/decks']) {
      const url = new URL(`../${dir}/`, import.meta.url);
      for (const file of readdirSync(url).filter((f) => f.endsWith('.json'))) {
        const data = JSON.parse(readFileSync(new URL(file, url), 'utf8')) as Record<string, unknown>[];
        for (const card of data) {
          if (card.status === 'cut') continue;
          cards++;
          for (const s of cardStrings(card)) for (const h of find(s)) found.push(`${dir}/${file} ${String(card.id)}: "${h.match}" (${h.term})`);
        }
      }
    }
    expect(cards).toBeGreaterThan(1000);
    expect(found).toEqual([]);
  });
});
