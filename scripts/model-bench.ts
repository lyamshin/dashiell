/**
 * docs/50 §2 and §8: `npm run model:bench [-- --runs 20 --context 120 --gap 30 --gaps 5 --model DIR]`
 *
 * Two numbers, on this machine's CPU, one thread (Node runs the model on its
 * main thread; nothing here is parallel):
 *
 * - **a gap from cold**: 120 tokens of context fed from an empty cache, then 30
 *   sampled (phase 1's measure);
 * - **a page with the page cache** (§8): the golden's office page as a
 *   skeleton with five gaps, every locked unit fed once, each gap's header and
 *   after-unit fed after the page so far, 30 tokens drafted, rolled back, the
 *   draft fed as page text: ms for the page, and per gap.
 *
 * The browser's numbers, on the main thread and in a worker, come from
 * `scripts/model-bench.html` on the dev server.
 */

import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { benchContext, benchGap, benchPage, benchPlan } from '../src/game/board/model/index.js';
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
const gaps = arg('gaps', 5);
const pr = benchPage(lm, benchPlan(gaps), () => performance.now(), Math.max(3, Math.round(arg('runs', 20) / 2)), arg('gap', 30));
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
    `page (§8, the page cache): ${pr.gaps} gaps of ${pr.gapTokens} tokens, ${pr.fed} tokens fed and ${pr.sampled} sampled a page, ${pr.reprimes} re-primes, ${pr.runs} runs`,
    `  ms per page:  median ${pr.page.median}, p90 ${pr.page.p90}, best ${pr.page.min}`,
    `  ms per gap:   median ${pr.perGap.median} (the page over its gaps)`,
    `  the page fed alone, gaps as cards: median ${pr.feedOnly.median} ms; each gap adds ${pr.perGapAdded.median} ms`,
    '',
  ].join('\n'),
);
