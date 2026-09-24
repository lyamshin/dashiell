/**
 * A case with its words taken out.
 *
 * The M7 identity test hashes a whole case, so any change to a sentence the
 * player reads changes the hash. A wording pass (docs/21-plain-terms-notes.md)
 * has to be able to show that it changed the words and nothing else: the same
 * people at the same places at the same ticks, the same clues pointing at the
 * same clues, the same killer. `structureOf` keeps every id, enum, tick, flag
 * and link and blanks every field a reader sees as prose, so two builds that
 * differ only in wording give the same structure hash.
 *
 * A key in `TEXT_KEYS` is blanked wherever it appears, whatever it holds — a
 * string, or an array of strings (a self-account, a briefing's breaths), whose
 * length is itself a fact of the wording.
 */

import { createHash } from 'node:crypto';
import type { Case } from './types.js';

/** Every key whose value is words on a page, a sheet or a notebook. */
export const TEXT_KEYS: ReadonlySet<string> = new Set([
  // names and labels
  'name',
  'shortName',
  'surname',
  'label',
  'role',
  'neighborhood',
  'detectiveName',
  'topic',
  // sentences
  'text',
  'textRecord',
  'textFirst',
  'description',
  'bodyEvidence',
  'timing',
  'highTiming',
  'sceneFact',
  'relationshipToVictim',
  'backstory',
  'backstoryFirst',
  'since',
  'detail',
  'detailFirst',
  'prompt',
  'selfAccount',
  'standing',
  'foundText',
  'foundTextFirst',
  'foundPrompt',
  'purposeText',
  'purposeTextFirst',
  'purposePrompt',
  'cost',
  'costFirst',
  'tellTexts',
  'withholdTexts',
  'reason',
  'reasonSpoken',
  'pointerPrompt',
  'ownEvening',
  'briefingText',
  'spoken',
  'breath',
  // M9 (a tiered case only; a no-options case has none of these keys): the
  // notebook's rule lines and the title page's, how one person refers to
  // another, what an anchor's witnesses know, and what a derivation concludes.
  'rule',
  'ref',
  'knowledge',
  'what',
]);

/**
 * Words added after the baseline was taken, left out whole rather than
 * blanked. A blanked key is still a key, and the baseline has none of these:
 * M11 §B.1's dossier character (details, a history, a talk register) is prose
 * a person says or is said about them, and no id, tick or link hangs on it.
 */
export const ADDED_TEXT_KEYS: ReadonlySet<string> = new Set(['character']);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (ADDED_TEXT_KEYS.has(k)) continue;
      out[k] = TEXT_KEYS.has(k) ? '~' : strip(v);
    }
    return out;
  }
  return value;
}

/** The case as JSON with every player-visible text field blanked. */
export function structureOf(c: Case): string {
  return JSON.stringify(strip(c));
}

/** sha256 of `structureOf`. */
export function structureHash(c: Case): string {
  return createHash('sha256').update(structureOf(c)).digest('hex');
}
