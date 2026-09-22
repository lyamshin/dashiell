import { describe } from 'vitest';
import { tierSuite } from './m7-helpers.js';

/**
 * M7: Over easy, the post-game shape. Not a campaign tier, so over fewer seeds
 * than the six: each case is eight suspects and eight rooms, twice the work.
 */
describe('M7 tiers: Over easy', () => {
  tierSuite('over-easy', 50, 25);
});
