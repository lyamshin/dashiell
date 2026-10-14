/**
 * docs/50 §7: what a gap can never say, as tokens the sampler never draws.
 *
 * The verifier rejects a gap with a name, an hour, a digit or a means in it,
 * after the draft is written. Most of those are single tokens in this
 * tokenizer (nearly every word is one), so they can be kept out of the draft
 * in the first place: a mask over the vocabulary, built once a night, that
 * the sampler applies (`writePage`, `generate`'s `ban`). The verifier still
 * checks every draft; the mask only means fewer drafts fail it.
 *
 * Banned: any token whose letters are a name either world can deal
 * (`nameLexicon`) or a word of the night's own names and places; an
 * honorific (Mr, Mrs, Dr…); an hour word (seven to twelve, midnight, noon,
 * o'clock); a means word; any token with a digit. A token is matched on its
 * letters with the leading space and case ignored for the hours and means,
 * and with case kept for names (so "Rose" the name is banned, " rose" the verb
 * isn't).
 *
 * Pure: the tokenizer and the lists.
 */

import type { Tokenizer } from './tokenizer.js';
import { N_SPECIAL } from './tokenizer.js';
import { nameLexicon } from './verifier.js';

const HOURS = new Set(['seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'midnight', 'noon', 'o’clock', "o'clock"]);
const MEANS = /^(?:chloral|laudanum|revolver|pistols?|guns?|colt|arsenic|strychnine|cyanide|prussic|poison(?:ed|ing|s)?|knife|knives|razors?|cleaver|bullets?)$/i;
const HONORIFICS = new Set(['Mr', 'Mrs', 'Ms', 'Dr', 'St', 'Miss', 'Father', 'Sister', 'Officer', 'Sergeant', 'Patrolman', 'Captain', 'Doctor']);

export interface BanLists {
  names?: readonly string[];
  places?: readonly string[];
}

let LEXICON_MASK: { tok: Tokenizer; mask: Uint8Array } | null = null;

/** The mask for everything but the night's own lists (cached a tokenizer). */
function baseMask(tok: Tokenizer): Uint8Array {
  if (LEXICON_MASK && LEXICON_MASK.tok === tok) return LEXICON_MASK.mask;
  const lex = nameLexicon();
  const mask = new Uint8Array(tok.size);
  for (let id = N_SPECIAL; id < tok.size; id++) {
    const s = tok.decode([id]);
    if (/\d/.test(s)) {
      mask[id] = 1;
      continue;
    }
    const w = s.trim().replace(/[’']s$/, '');
    if (!/^[A-Za-z’']+$/.test(w)) continue;
    if (HOURS.has(w.toLowerCase()) || MEANS.test(w) || HONORIFICS.has(w) || (/^[A-Z]/.test(w) && lex.has(w))) mask[id] = 1;
  }
  LEXICON_MASK = { tok, mask };
  return mask;
}

/**
 * The night's mask: the base, plus every capitalised word of its names and
 * places. (Its clue words stay with the verifier: they are phrases, "the spare
 * key", and banning their words one by one would ban "key".)
 */
export function gapBans(tok: Tokenizer, lists: BanLists = {}): Uint8Array {
  const mask = Uint8Array.from(baseMask(tok));
  const words = new Set<string>();
  for (const n of [...(lists.names ?? []), ...(lists.places ?? [])]) for (const w of n.match(/[A-Z][A-Za-z’']+/g) ?? []) words.add(w.replace(/[’']s$/, ''));
  if (words.size === 0) return mask;
  for (let id = N_SPECIAL; id < tok.size; id++) {
    const w = tok.decode([id]).trim().replace(/[’']s$/, '');
    if (words.has(w)) mask[id] = 1;
  }
  return mask;
}
