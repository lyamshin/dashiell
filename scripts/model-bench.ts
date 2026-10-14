/**
 * docs/50 §2: `npm run model:bench [-- --runs 20 --context 120 --gap 30]`
 *
 * Milliseconds per 30-token gap after a 120-token context, on this machine's
 * CPU, one thread (Node runs the model on its main thread; nothing here is
 * parallel). The browser's number comes from `scripts/model-bench.html` on the
 * dev server.
 */

import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { benchContext, benchGap } from '../src/game/board/model/index.js';
import { EXPORT_DIR, loadModel, modelHeader } from './model-load.js';
import { statSync } from 'node:fs';
import { join } from 'node:path';

function arg(name: string, dflt: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
}

const t0 = performance.now();
const lm = loadModel();
const loadMs = performance.now() - t0;
const h = modelHeader();
const ctx = benchContext(lm.tokenizer, arg('context', 120));
const r = benchGap(lm, ctx, () => performance.now(), arg('runs', 20), arg('gap', 30));
const bytes = statSync(join(EXPORT_DIR, 'dashiell.bin')).size + statSync(join(EXPORT_DIR, 'dashiell.json')).size;
const params = (h.trained?.params as number | undefined) ?? 0;
process.stdout.write(
  [
    `model: ${h.config.layers} layers, width ${h.config.width}, ${h.config.heads} heads, context ${h.config.ctx}, vocab ${h.config.vocab}; ${(params / 1e6).toFixed(2)}M parameters; ${(bytes / 1e6).toFixed(2)} MB on disk (int8 + header)`,
    `cpu: ${cpus()[0]?.model ?? '?'}, Node ${process.version}, one thread`,
    `load: ${loadMs.toFixed(0)} ms (read, dequantize)`,
    `gap: ${r.contextTokens} tokens of context, then ${r.gapTokens} sampled, ${r.runs} runs`,
    `  ms per gap:   median ${r.gap.median}, p90 ${r.gap.p90}, best ${r.gap.min}`,
    `  context:      median ${r.prefill.median} ms`,
    `  each token:   median ${r.perToken.median} ms`,
    '',
  ].join('\n'),
);
