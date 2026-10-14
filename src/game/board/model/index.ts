/**
 * docs/50: the tiny model, for inference. Phase 1 is the machinery: the
 * tokenizer, the forward pass, seeded sampling, the gap verifier and a
 * benchmark. Nothing in the book uses it yet; phase 2 decides whether it
 * ships (docs/50 §4).
 *
 * Pure apart from `fetchModel`, which only needs a `fetch`.
 */

import { TinyLM, type ModelHeader } from './gpt.js';

export { TinyLM, matmulT, type ModelConfig, type ModelHeader, type TensorEntry } from './gpt.js';
export { Tokenizer, chunks, EOT, UNK, GAP, SEP, N_SPECIAL, type TokenizerData } from './tokenizer.js';
export { ModelRng, gapSeed, sampleToken, generate, DEFAULT_SAMPLING, type SampleOptions, type GenerateOptions } from './sample.js';
export { verifyGap, type GapContext, type GapVerdict } from './verifier.js';
export { benchGap, benchContext, BENCH_TEXT, type GapBench } from './bench.js';

/** Where the export lives, next to the page: `public/model/` in the repo. */
export const MODEL_FILES = { header: 'dashiell.json', weights: 'dashiell.bin' } as const;

/** Load the export over `fetch` from `base` (a URL ending in "/"). */
export async function fetchModel(base: string, f: typeof fetch = fetch): Promise<TinyLM> {
  const [h, b] = await Promise.all([f(`${base}${MODEL_FILES.header}`), f(`${base}${MODEL_FILES.weights}`)]);
  if (!h.ok || !b.ok) throw new Error(`model: could not fetch the export from ${base} (${h.status}, ${b.status})`);
  const header = (await h.json()) as ModelHeader;
  return new TinyLM(header, await b.arrayBuffer());
}
