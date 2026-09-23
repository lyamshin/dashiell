/**
 * The "say what it is" check (docs/style-guide.md; docs/21-plain-terms-notes.md).
 *
 * `content/plain-terms.json` is the list: every genre term, bit of period
 * slang or trade word that hides what a sentence means from a reader who has
 * never read Hammett, with the plain words to use instead and the literal
 * senses that are allowed. This module reads the list and finds the terms in
 * a piece of text. It is plain JavaScript so that both `npm run decks`
 * (scripts/validate-decks.mjs) and the generated-text test
 * (test/plain-terms.test.ts) use the same code on the same list.
 *
 * A term matches when any of its `patterns` matches, case-insensitively, and
 * the match is not inside a match of one of its `allow` patterns. `allow` is
 * where a literal sense lives: a newspaper is a paper, a written note is a
 * note, a fence around a lot is a fence.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLAIN_TERMS_PATH = join(resolve(HERE, '..'), 'content', 'plain-terms.json');

/** The list, as data, with its patterns compiled. */
export function loadPlainTerms(path = PLAIN_TERMS_PATH) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const terms = raw.terms.map((t) => ({
    ...t,
    res: t.patterns.map((p) => new RegExp(p, 'gi')),
    allowRes: (t.allow ?? []).map((a) => new RegExp(a.pattern, 'gi')),
  }));
  return { ...raw, terms };
}

function spans(re, text) {
  const out = [];
  re.lastIndex = 0;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    out.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

/**
 * Every banned term in `text`: `{ term, match, plain, index }` for each hit
 * that no allowed literal sense covers.
 */
export function findJargon(text, list) {
  const hits = [];
  if (typeof text !== 'string' || text.length === 0) return hits;
  for (const t of list.terms) {
    const allowed = t.allowRes.flatMap((re) => spans(re, text));
    for (const re of t.res) {
      for (const [a, b] of spans(re, text)) {
        if (allowed.some(([x, y]) => x <= a && b <= y)) continue;
        hits.push({ term: t.term, match: text.slice(a, b), plain: t.plain, index: a });
      }
    }
  }
  return hits;
}
