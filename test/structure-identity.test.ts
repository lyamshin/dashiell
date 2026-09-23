import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { structureHash } from '../src/gen/structure.js';

/**
 * The plain-terms pass (docs/21-plain-terms-notes.md): a wording change may
 * change what a case says, never what it is. The fixture was written by
 * `scripts/snapshot-structure.ts --write` on `main` before the pass changed a
 * word; it hashes each case with every player-visible text field blanked.
 */
const baseline = JSON.parse(
  readFileSync(new URL('./fixtures/structure-hashes.json', import.meta.url), 'utf8'),
) as Record<string, string[]>;

describe('plain terms: the case structure is untouched by wording', () => {
  for (const difficulty of [1, 2, 3] as const) {
    it(`matches the pre-pass structure hash for 200 seeds at difficulty ${difficulty}`, () => {
      const want = baseline[String(difficulty)] as string[];
      expect(want).toHaveLength(200);
      const differ: number[] = [];
      for (let seed = 1; seed <= 200; seed++) {
        if (structureHash(generateCase(seed, { difficulty })) !== want[seed - 1]) differ.push(seed);
      }
      expect(differ).toEqual([]);
    });
  }
});
