/**
 * docs/50 §2: the benchmark, shared by `npm run model:bench` (Node, one
 * thread) and `scripts/model-bench.html` (the browser).
 *
 * A gap, as docs/50 §1 sizes it: about 120 tokens of context fed from an
 * empty cache, then 30 tokens sampled one at a time. Timed end to end, and
 * the two halves on their own.
 *
 * Pure: it takes a clock.
 */

import type { TinyLM } from './gpt.js';
import { generate, ModelRng, gapSeed } from './sample.js';
import { EOT, type Tokenizer } from './tokenizer.js';

/** The benchmark's context: the golden's office page (docs/golden/seed3-camp.md), cut to length. */
export const BENCH_TEXT =
  'Midnight. My office was a room at the top of a walk-up on Mulberry Street, and the radiator had decided that tonight it would be a sculpture. Frost had got in on the inside of the window. My knuckle had split open again in the same place as last month, which was at least consistent of it. ¶ A woman came up the stairs after midnight. Nobody comes up those stairs after midnight with good news. The good news waits for morning, like a gentleman. ¶ She had new gloves with the price tag still tucked in one cuff. She was in her thirties and dressed for an office she didn’t have. ¶ “My name is Ilse Hauck,” she said. “My sister was married to Isidore Sirkin. He’s dead.” ¶ I offered her the chair. It’s the good chair, which tells you about the other one.';

/** <|eot|> and the first `n - 1` tokens of `BENCH_TEXT`: a gap's worth of context. */
export function benchContext(tok: Tokenizer, n = 120): number[] {
  const ids = tok.encode(BENCH_TEXT);
  if (ids.length < n - 1) throw new Error(`model: the bench text is only ${ids.length} tokens`);
  return [EOT, ...ids.slice(0, n - 1)];
}

export interface GapBench {
  runs: number;
  contextTokens: number;
  gapTokens: number;
  /** ms per gap, context and sampling together. */
  gap: { median: number; p90: number; min: number };
  /** ms to feed the context. */
  prefill: { median: number };
  /** ms a sampled token, after the context. */
  perToken: { median: number };
}

const sorted = (xs: number[]): number[] => [...xs].sort((a, b) => a - b);
const median = (xs: number[]): number => sorted(xs)[Math.floor(xs.length / 2)] as number;
const pct = (xs: number[], p: number): number => sorted(xs)[Math.min(xs.length - 1, Math.floor(p * xs.length))] as number;
const r2 = (x: number): number => Math.round(x * 100) / 100;

export function benchGap(lm: TinyLM, context: readonly number[], now: () => number, runs = 20, gapTokens = 30, warmup = 3): GapBench {
  const gaps: number[] = [];
  const prefills: number[] = [];
  const perTok: number[] = [];
  const never = (): boolean => false;
  for (let i = 0; i < warmup + runs; i++) {
    const rng = new ModelRng(gapSeed('bench', i));
    const t0 = now();
    generate(lm, context, { temperature: 0.8, topP: 0.9, maxTokens: gapTokens, stop: never }, rng);
    const t1 = now();
    lm.reset();
    const t2 = now();
    lm.feed(context);
    const t3 = now();
    if (i >= warmup) {
      gaps.push(t1 - t0);
      prefills.push(t3 - t2);
      perTok.push((t1 - t0 - (t3 - t2)) / gapTokens);
    }
  }
  return {
    runs,
    contextTokens: context.length,
    gapTokens,
    gap: { median: r2(median(gaps)), p90: r2(pct(gaps, 0.9)), min: r2(Math.min(...gaps)) },
    prefill: { median: r2(median(prefills)) },
    perToken: { median: r2(median(perTok)) },
  };
}
