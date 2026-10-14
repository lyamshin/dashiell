/**
 * docs/50 §2: sampling, seeded by the night.
 *
 * Temperature and top-p (nucleus) sampling over the model's logits, drawn
 * from a small seeded generator, so the same night, page and gap render the
 * same way every time. Ties in the sort break by token id, so the order is
 * total and the draw is the same on every engine that computes the same
 * logits.
 *
 * Pure: no DOM, no Node, no dependencies.
 */

import { EOT, N_SPECIAL } from './tokenizer.js';
import type { TinyLM } from './gpt.js';

/** A seeded generator: splitmix32 over a 32-bit state, floats in [0, 1). */
export class ModelRng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x9e3779b9) >>> 0;
    let z = this.s;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 4294967296;
  }
}

/** The seed for one gap: the night's seed and tier, the page, the gap, and which try (0, then 1 on a resample). */
export function gapSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface SampleOptions {
  temperature: number;
  topP: number;
}

export const DEFAULT_SAMPLING: SampleOptions = { temperature: 0.8, topP: 0.9 };

/**
 * One token from `logits`: divide by the temperature, softmax, keep the
 * smallest set of most likely tokens whose mass reaches `topP`, draw from
 * them. `banned` tokens (the specials, say) never come up.
 */
let scratch = new Float64Array(0);

export function sampleToken(logits: Float32Array, o: SampleOptions, rng: ModelRng, banned?: (id: number) => boolean): number {
  const V = logits.length;
  if (scratch.length < V) scratch = new Float64Array(V);
  const p = scratch;
  const inv = 1 / Math.max(o.temperature, 1e-4);
  let max = -Infinity;
  for (let i = 0; i < V; i++) {
    const z = logits[i] as number;
    if (z > max && !banned?.(i)) max = z;
  }
  let sum = 0;
  for (let i = 0; i < V; i++) {
    const e = banned?.(i) ? 0 : Math.exp(((logits[i] as number) - max) * inv);
    p[i] = e;
    sum += e;
  }
  // Only tokens that could be in the nucleus need sorting: anything under (1 - topP)/V of the
  // mass can't be reached before the rest, so it is cut before the sort. (The cut is exact:
  // the nucleus is the same set the full sort would find.)
  const floor = o.topP >= 1 ? 0 : ((1 - o.topP) / V) * sum;
  const ids: number[] = [];
  for (let i = 0; i < V; i++) if ((p[i] as number) > 0 && (p[i] as number) >= floor) ids.push(i);
  ids.sort((a, b) => (p[b] as number) - (p[a] as number) || a - b);
  const want = o.topP * sum;
  let acc = 0;
  let k = 0;
  for (; k < ids.length; k++) {
    acc += p[ids[k] as number] as number;
    if (acc >= want) {
      k++;
      break;
    }
  }
  k = Math.max(1, Math.min(k, ids.length));
  let mass = 0;
  for (let j = 0; j < k; j++) mass += p[ids[j] as number] as number;
  let u = rng.next() * mass;
  for (let j = 0; j < k; j++) {
    u -= p[ids[j] as number] as number;
    if (u < 0) return ids[j] as number;
  }
  return ids[k - 1] as number;
}

export interface GenerateOptions extends SampleOptions {
  maxTokens: number;
  /** Stop after this token (it is kept). Default: <|eot|>. */
  stop?: (id: number) => boolean;
}

/**
 * Feed `prompt` from an empty cache, then sample up to `maxTokens` more. The
 * specials other than <|eot|> never come up. Returns the new ids only.
 */
export function generate(lm: TinyLM, prompt: readonly number[], o: GenerateOptions, rng: ModelRng): number[] {
  const ctx = lm.config.ctx;
  const stop = o.stop ?? ((id: number) => id === EOT);
  const all = prompt.slice(-Math.max(1, ctx - o.maxTokens));
  lm.reset();
  let logits = lm.feed(all);
  const out: number[] = [];
  for (let i = 0; i < o.maxTokens; i++) {
    // The specials but <|eot|> never come up: their logits go to -Infinity (the buffer is ours
    // until the next feed).
    for (let b = EOT + 1; b < N_SPECIAL; b++) logits[b] = -Infinity;
    const id = sampleToken(logits, o, rng);
    out.push(id);
    all.push(id);
    if (stop(id) || i === o.maxTokens - 1) break;
    if (lm.length + 1 > ctx) {
      // Past the window: keep the last half and run it again.
      lm.reset();
      logits = lm.feed(all.slice(-Math.floor(ctx / 2)));
    } else {
      logits = lm.feed([id]);
    }
  }
  return out;
}
