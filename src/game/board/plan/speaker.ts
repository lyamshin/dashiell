import type { BoardCase } from '../model.js';
import type { Item } from './types.js';

/**
 * docs/52: whose words a fact is, for what its voicing folds: the account's or the list's own
 * person, the one who mentioned something besides, the one who owned up or wouldn't, and the client
 * in the office.
 */
export function speakerOf(it: Pick<Item, 'carries' | 'beat' | 'voice'>, c: BoardCase): string | undefined {
  const q = it.carries?.[0] ?? '';
  const m = /^(?:list|claim|motive|admit|second|crack|refused|held):([^@#]+)/.exec(q) ?? /^remark:(?:account|list):([^#]+)#/.exec(q);
  if (m) return m[1];
  if (q.startsWith('givens:') && it.beat === 'job' && it.voice === 'exchange') return c.client;
  return undefined;
}
