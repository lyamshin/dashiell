import { describe } from 'vitest';
import { tierSuite, type PresetTier } from './m7-helpers.js';

/**
 * M7 §Tests, for Raw, Coddled, Poached and Soft-boiled: every tier at every
 * level it allows generates a solvable case for 200 seeds with par inside the
 * tier's range, the oracle solves it within par plus one, and at the DA's
 * Office every essential fact has exactly one findable source.
 */
describe('M7 tiers: Raw to Soft-boiled', () => {
  for (const tier of [0, 1, 2, 3] as PresetTier[]) tierSuite(tier, 200, 200);
});
