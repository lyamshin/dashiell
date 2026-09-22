/**
 * The voice. M3's `voice.ts` decorated around a clue; this decides what a page
 * *is*.
 *
 *   plain.ts     the register with no image in it: facts, connectives, reports
 *   roll.ts      who the detective is tonight, and who already knows him
 *   cast.ts      temper and portraits, rolled once and never again
 *   cards.ts     the decks, the schema, the burn tiers, the dealer
 *   facts.ts     a clue read as something a person could say
 *   exchange.ts  Dashiell's line × a dialogue frame × the fact as speech
 *   reactive.ts  what he thinks about what just changed, including the theory
 *   page.ts      the slots, and which of them fire
 *
 * The reducer hands this a `Scene` — what happened — and gets back blocks.
 */

export * from './prose.js';
export * from './plain.js';
export * from './motifs.js';
export * from './cards.js';
export * from './roll.js';
export * from './cast.js';
export * from './facts.js';
export * from './exchange.js';
export * from './reactive.js';
export * from './office.js';
export * from './page.js';

import type { Clue, Id, Person } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { Rng } from '../../gen/rng.js';
import { deckOf, tagOf, DECKS } from './cards.js';
import type { CastSheet } from './cast.js';
import { temperOf } from './cast.js';

/** Has this run already spent its one intensity-3 simile? */
export function showedOff(burned: Iterable<string>): boolean {
  for (const id of burned) {
    if (deckOf(id) !== 'similes') continue;
    const card = DECKS.similes.find((c) => c.id === id);
    if (card && tagOf('similes', card, 'intensity') === 3) return true;
  }
  return false;
}

/**
 * The yap volunteer (A.3). Once a run, a yapper hands over a clue nobody asked
 * for out of their own topic buckets.
 *
 * Noise first, and never the spine. A spine clue given away unasked would pay
 * for an action the player never spent, and par is the one number this
 * milestone is not allowed to move. Noise is what the rule is for anyway: it
 * is how noise gets into a conversation instead of sitting in a room.
 */
export function volunteerFrom(
  view: CaseView,
  cast: CastSheet,
  speaker: Person,
  found: Id[],
  alreadyVolunteered: number,
  seed: number,
): Clue | null {
  if (alreadyVolunteered > 0) return null;
  if (temperOf(cast, speaker.id) !== 'yap') return null;
  const have = new Set(found);
  const mine: Clue[] = [];
  for (const bucket of view.exactBuckets.get(speaker.id)?.values() ?? []) {
    for (const clue of bucket) if (!have.has(clue.id)) mine.push(clue);
  }
  const order: Record<string, number> = { noise: 0, disqualifier: 1, corroboration: 2 };
  const eligible = mine
    .filter((c) => c.role !== 'spine')
    .sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.id.localeCompare(b.id));
  if (eligible.length === 0) return null;
  // Deterministic, but not always the same clue in the same case.
  const rng = new Rng((seed >>> 0) || 1);
  const best = eligible.filter((c) => c.role === eligible[0]?.role);
  return rng.pick(best);
}
