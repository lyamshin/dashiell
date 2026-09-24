import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../src/gen/index.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from '../scripts/plain-terms.mjs';
import { CASE_TYPES, playerText } from './plain-helpers.js';

/**
 * "Say what it is" (docs/style-guide.md, docs/21-plain-terms-notes.md).
 *
 * Every string a player can read — the briefing, every clue sentence, every
 * dossier line, the notebook, each page an oracle run renders through the
 * transcript tool, the verdict — for 40 seeds at difficulties 1 to 3 and every
 * case type, run through the banned-terms list in `content/plain-terms.json`.
 * `npm run decks` holds the decks to the same list; this holds the generator's
 * and the engine's own sentences to it, and the decks as the engine deals them.
 *
 * A deck the list names as pending another pass's rewrite may still carry a
 * banned term; a hit that lies inside the words of one of that deck's own
 * offending cards is counted and excused, and nothing else is.
 */

interface Hit {
  term: string;
  match: string;
  index: number;
}

const list = loadPlainTerms();
const find = (text: string): Hit[] => findJargon(text, list) as Hit[];

/** The slot-free pieces of pending-deck cards that carry a banned term. */
const pendingFragments: string[] = (() => {
  const pending = new Set<string>(list.pendingDecks?.decks ?? []);
  const out: string[] = [];
  const dir = new URL('../content/decks/', import.meta.url);
  for (const file of readdirSync(dir)) {
    if (!pending.has(file.replace(/\.json$/, ''))) continue;
    const cards = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as Record<string, unknown>[];
    for (const card of cards) {
      for (const field of ['text', 'recall', 'recallAction']) {
        const text = card[field];
        if (typeof text !== 'string') continue;
        for (const piece of text.split(/\{[^}]+\}/)) {
          const clean = piece.replace(/\s+/g, ' ').trim();
          if (find(clean).length > 0) out.push(clean.toLowerCase());
        }
      }
    }
  }
  return out;
})();

function excused(text: string, hit: Hit): boolean {
  const lower = text.toLowerCase();
  for (const frag of pendingFragments) {
    for (let at = lower.indexOf(frag); at >= 0; at = lower.indexOf(frag, at + 1)) {
      if (at <= hit.index && hit.index < at + frag.length) return true;
    }
  }
  return false;
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

  for (const type of CASE_TYPES) {
    // M14: the mundane three are Hard-boiled logic games, slower to deal and
    // play, so they are read over fewer seeds.
    const seeds = ['lost-pet', 'lost-item', 'affair'].includes(type) ? 12 : 40;
    it(`finds none in ${seeds} seeds × 3 difficulties of ${type} cases`, () => {
      const found: string[] = [];
      let pending = 0;
      for (const difficulty of [1, 2, 3] as Difficulty[]) {
        for (let seed = 1; seed <= seeds; seed++) {
          for (const { where, text } of playerText(seed, difficulty, type)) {
            for (const hit of find(text)) {
              if (excused(text, hit)) {
                pending++;
                continue;
              }
              const around = text.slice(Math.max(0, hit.index - 40), hit.index + hit.match.length + 40);
              found.push(`${type} d${difficulty} seed ${seed} ${where}: "${hit.match}" (${hit.term}) …${around}…`);
            }
          }
        }
      }
      // Only the pending decks' own cards may carry a term, and only until
      // their rewrite lands; `pending` counts those, and is not a failure.
      expect(found.slice(0, 20), `${found.length} hits (${pending} excused as pending)`).toEqual([]);
    }, 600_000);
  }
});
