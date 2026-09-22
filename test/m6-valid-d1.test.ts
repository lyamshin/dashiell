/**
 * M6 §8 — every choice is valid, costs exactly its minutes, and carries the
 * lead mark if and only if it takes an open lead. Difficulty 1; the walk
 * itself is in `m6-walk.ts`.
 */

import { describe, expect, it } from 'vitest';
import { walkChoices } from './m6-walk.js';

describe('§8 every choice is valid, and the mark means a lead — difficulty 1', () => {
  it('parses, is accepted, costs its minutes, and is marked iff it takes a lead', () => {
    const { problems, checked } = walkChoices(1);
    expect(checked).toBeGreaterThan(1000);
    expect(problems.slice(0, 20)).toEqual([]);
  });
});
