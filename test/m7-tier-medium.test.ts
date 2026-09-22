import { describe } from 'vitest';
import { tierSuite } from './m7-helpers.js';

/** M7 §Tests, for Medium. See `m7-tier-small.test.ts`. */
describe('M7 tiers: Medium', () => {
  tierSuite(4, 200, 100);
});
