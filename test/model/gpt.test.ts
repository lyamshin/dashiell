import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generate, matmulT, ModelRng, gapSeed, EOT } from '../../src/game/board/model/index.js';
import { loadModel, modelHeader } from '../../scripts/model-load.js';

/**
 * docs/50 §2: the TypeScript forward pass runs the network `model/gpt.py`
 * trained, on the int8 export in `model/export/`. `model/export.py` writes the
 * logits the int8 model gives after a held-out line (`model/data/fwd-parity.json`,
 * computed in PyTorch, float32); these must match.
 */

const header = modelHeader();
const lm = loadModel();
const fixture = JSON.parse(readFileSync('model/data/fwd-parity.json', 'utf8')) as {
  sha256: string;
  ids: number[];
  top: number[];
  logits: number[];
  stride: number;
  mid: number;
  logits_mid: number[];
};

function maxDiff(got: Float32Array, want: number[], stride: number): number {
  let m = 0;
  want.forEach((w, i) => {
    m = Math.max(m, Math.abs((got[i * stride] as number) - w));
  });
  return m;
}

describe('the export', () => {
  it('is at most 8 MB, int8 matrices and a JSON header', () => {
    const bytes = readFileSync('model/export/dashiell.bin').length + readFileSync('model/export/dashiell.json').length;
    expect(bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(header.tensors.filter((t) => t.dtype === 'int8').length).toBe(2 + 4 * header.config.layers);
  });

  it('lives in model/export/, not public/, so the built book doesn’t carry it', () => {
    expect(existsSync('public/model')).toBe(false);
    expect(existsSync('model/export/dashiell.bin')).toBe(true);
  });

  it('is the export the fixture was computed on', () => {
    expect(fixture.sha256).toBe((header as unknown as { sha256: string }).sha256);
  });
});

describe('the forward pass', () => {
  it('matches PyTorch’s logits on the int8 weights', () => {
    lm.reset();
    const got = lm.feed(fixture.ids);
    expect(maxDiff(got, fixture.logits, fixture.stride)).toBeLessThan(2e-3);
    const top = [...got.keys()].sort((a, b) => (got[b] as number) - (got[a] as number)).slice(0, 5);
    expect(top).toEqual(fixture.top.slice(0, 5));
  });

  it('gives the same logits fed at once, in pieces, or a token at a time (the KV cache)', () => {
    const ids = fixture.ids.slice(0, fixture.mid);
    lm.reset();
    const all = Float32Array.from(lm.feed(ids));
    expect(maxDiff(all, fixture.logits_mid, fixture.stride)).toBeLessThan(2e-3);
    lm.reset();
    lm.feed(ids.slice(0, 17));
    const pieces = Float32Array.from(lm.feed(ids.slice(17)));
    lm.reset();
    let one = new Float32Array(0);
    for (const id of ids) one = Float32Array.from(lm.feed([id]));
    for (let i = 0; i < all.length; i += 7) {
      expect(Math.abs((pieces[i] as number) - (all[i] as number))).toBeLessThan(1e-4);
      expect(Math.abs((one[i] as number) - (all[i] as number))).toBeLessThan(1e-4);
    }
  });

  it('refuses to run past its context', () => {
    lm.reset();
    expect(() => lm.feed(new Array(header.config.ctx + 1).fill(EOT))).toThrow(/context/);
  });

  it('samples the same text from the same seed, and other text from another', () => {
    const o = { temperature: 0.8, topP: 0.9, maxTokens: 40 };
    const a = generate(lm, [EOT], o, new ModelRng(gapSeed(7, 2, 'p3', 'g1')));
    const b = generate(lm, [EOT], o, new ModelRng(gapSeed(7, 2, 'p3', 'g1')));
    const c = generate(lm, [EOT], o, new ModelRng(gapSeed(8, 2, 'p3', 'g1')));
    expect(a).toEqual(b);
    expect(lm.tokenizer.decode(a)).not.toBe(lm.tokenizer.decode(c));
    expect(a.every((id) => id === EOT || id >= 64)).toBe(true);
  });

  it('carries on past its window by keeping the last half', () => {
    const out = generate(lm, [EOT], { temperature: 1, topP: 1, maxTokens: header.config.ctx + 20, stop: () => false }, new ModelRng(1));
    expect(out).toHaveLength(header.config.ctx + 20);
  });
});

describe('matmulT', () => {
  it('agrees with the plain sum on every shape, tails included', () => {
    for (const [T, rows, cols] of [
      [1, 7, 5],
      [1, 8, 16],
      [3, 6, 9],
      [5, 9, 4],
      [8, 12, 33],
    ] as [number, number, number][]) {
      const x = Float32Array.from({ length: T * cols }, (_, i) => Math.sin(i + 1));
      const w = Float32Array.from({ length: rows * cols }, (_, i) => Math.cos(i * 0.7));
      const out = new Float32Array(T * rows);
      matmulT(out, x, w, T, rows, cols);
      for (let t = 0; t < T; t++)
        for (let r = 0; r < rows; r++) {
          let s = 0;
          for (let k = 0; k < cols; k++) s += (x[t * cols + k] as number) * (w[r * cols + k] as number);
          expect(out[t * rows + r]).toBeCloseTo(s, 4);
        }
    }
  });
});
