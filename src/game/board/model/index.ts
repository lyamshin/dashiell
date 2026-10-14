/**
 * docs/50: the tiny model, for inference. Phase 1 is the machinery: the
 * tokenizer, the forward pass, seeded sampling, the gap verifier and a
 * benchmark; phase 2a adds the gap format, the page cache and the worker
 * (`worker.ts`, imported on its own: it is a worker's entry). Nothing in the
 * book uses it yet; phase 2b decides whether it ships (docs/50 §4).
 *
 * Pure apart from `fetchModel`, which only needs a `fetch`.
 */

export { TinyLM, matmulT, type ModelConfig, type ModelHeader, type TensorEntry } from './gpt.js';
export { Tokenizer, chunks, EOT, UNK, GAP, SEP, N_SPECIAL, type TokenizerData } from './tokenizer.js';
export { ModelRng, gapSeed, sampleToken, generate, DEFAULT_SAMPLING, type SampleOptions, type GenerateOptions } from './sample.js';
export { verifyGap, sentencesOf, type GapContext, type GapVerdict } from './verifier.js';
export { benchGap, benchContext, benchPage, benchPlan, BENCH_TEXT, type GapBench, type PageBench } from './bench.js';
export { ENDGAP, GAP_BUDGET, GAP_SLOTS, GAP_TIERS, GAP_KINDS, GAP_MANNERS, gapHeaderIds, gapExample, showExample, checkSpecials, specialName, type GapHeader, type GapExample } from './gapformat.js';
export { writePage, type PagePlan, type PageUnit, type PageResult, type GapResult, type WriteOptions } from './page.js';
export { fetchModel, MODEL_FILES } from './load.js';
export { gapBans, type BanLists } from './constrain.js';
