import { describe } from 'vitest';
import { tierSuite } from './m7-helpers.js';

/**
 * M7 §Tests, for Hard-boiled on the M7 ladder. The no-options Hard-boiled — the
 * pre-M7 dials — is held byte for byte by `m7-identity.test.ts` and by every
 * test that was here before M7.
 */
describe('M7 tiers: Hard-boiled', () => {
  tierSuite(5, 200, 100);
});
