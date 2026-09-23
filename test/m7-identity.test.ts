import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';

/**
 * M7 §What the generator needs: with no options, `generateCase` produces
 * today's case, byte for byte, for difficulties 1 to 3. The hashes in the
 * fixture were written by `scripts/snapshot-cases.ts --write` before M7
 * changed a line of the generator.
 *
 * Rewritten once since, by the plain-terms pass (docs/21-plain-terms-notes.md),
 * which changed the words of every case and nothing else: its structure-only
 * hash (`test/structure-identity.test.ts`) is byte-identical to main's for the
 * same 600 cases, so these hashes were regenerated on the new wording.
 */
const baseline = JSON.parse(
  readFileSync(new URL('./fixtures/m7-baseline-hashes.json', import.meta.url), 'utf8'),
) as Record<string, string[]>;

describe('M7: the default options reproduce today’s cases', () => {
  for (const difficulty of [1, 2, 3] as const) {
    it(`matches the pre-M7 hash for 200 seeds at difficulty ${difficulty}`, () => {
      const want = baseline[String(difficulty)] as string[];
      expect(want).toHaveLength(200);
      const differ: number[] = [];
      for (let seed = 1; seed <= 200; seed++) {
        const json = JSON.stringify(generateCase(seed, { difficulty }));
        const hash = createHash('sha256').update(json).digest('hex');
        if (hash !== want[seed - 1]) differ.push(seed);
      }
      expect(differ).toEqual([]);
    });
  }
});
