import { describe, expect, it } from 'vitest';
import { ModelRng, gapSeed, sampleToken } from '../../src/game/board/model/index.js';

/** docs/50 §2: temperature and top-p, seeded by the night. */

const logits = Float32Array.from([2, 1, 0.5, 0, -1, -3]);

function counts(o: { temperature: number; topP: number }, n = 4000, seed = 1): number[] {
  const rng = new ModelRng(seed);
  const c = new Array(logits.length).fill(0) as number[];
  for (let i = 0; i < n; i++) c[sampleToken(logits, o, rng)]++;
  return c;
}

describe('sampling', () => {
  it('draws the same sequence from the same seed', () => {
    const a = new ModelRng(gapSeed(3, 4, 'page 2', 'walk', 0));
    const b = new ModelRng(gapSeed(3, 4, 'page 2', 'walk', 0));
    const xs = Array.from({ length: 10 }, () => a.next());
    expect(Array.from({ length: 10 }, () => b.next())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(gapSeed(3, 4, 'page 2', 'walk', 1)).not.toBe(gapSeed(3, 4, 'page 2', 'walk', 0));
  });

  it('keeps only the nucleus: top-p 0.5 never draws past the first token here', () => {
    // softmax([2,1,…]) puts about 0.57 on the first token.
    const c = counts({ temperature: 1, topP: 0.5 });
    expect(c[0]).toBe(4000);
  });

  it('top-p 0.8 draws from the first two or three, in proportion', () => {
    const c = counts({ temperature: 1, topP: 0.8 });
    expect((c[3] as number) + (c[4] as number) + (c[5] as number)).toBe(0);
    expect(c[0]).toBeGreaterThan(c[1] as number);
    expect(c[1]).toBeGreaterThan(c[2] as number);
  });

  it('top-p 1 can draw anything; a low temperature sharpens toward the top', () => {
    const wide = counts({ temperature: 1, topP: 1 }, 20000);
    expect(wide.every((x) => x > 0)).toBe(true);
    const cold = counts({ temperature: 0.2, topP: 1 });
    expect(cold[0]).toBeGreaterThan(3900);
  });

  it('never draws a banned token', () => {
    const rng = new ModelRng(5);
    for (let i = 0; i < 500; i++) expect(sampleToken(logits, { temperature: 1, topP: 1 }, rng, (id) => id === 0)).not.toBe(0);
  });

  it('breaks a tie by token id, so the order is total', () => {
    const flat = Float32Array.from([0, 0, 0, 0]);
    // A tiny nucleus over four equal tokens is the first by id.
    expect(sampleToken(flat, { temperature: 1, topP: 0.01 }, new ModelRng(9))).toBe(0);
  });
});
