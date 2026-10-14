/**
 * docs/50 §2 and §8: the browser half of the benchmark (`scripts/model-bench.html`).
 * Fetches the export from `model/export/` (the dev server serves the repo), runs the same gap
 * benchmark as `npm run model:bench` on the page's main thread, then the page-cache benchmark
 * (a five-gap page) twice: on the main thread, and in a Web Worker through `GapWorker`, the way
 * the book would (prefetch a page, take it when it's done). Prints three seeded samples, which
 * should read exactly as `npm run model:sample` prints its first three. The result also goes on
 * `window.__modelBench` for a script to read.
 */

import { benchContext, benchGap, benchPage, benchPlan, EOT, fetchModel, generate, ModelRng, gapSeed, type PagePlan } from '../src/game/board/model/index.js';
import { GapWorker } from '../src/game/board/model/worker.js';

const BASE = '/model/export/';
const out = document.getElementById('out') as HTMLElement;
const say = (s: string): void => {
  out.textContent = s;
};
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
const r2 = (x: number): number => Math.round(x * 100) / 100;

/** The page bench in a worker: `runs` pages, one after another, each prefetched and taken when done. */
async function workerPages(runs: number, gapTokens: number): Promise<{ loadMs: number; pageMs: number[]; wallMs: number[] }> {
  const worker = new Worker(new URL('../src/game/board/model/worker.ts', import.meta.url), { type: 'module' });
  const gw = new GapWorker(worker as unknown as ConstructorParameters<typeof GapWorker>[0]);
  const t0 = performance.now();
  gw.load(BASE);
  const plan = benchPlan(5);
  const opts = { temperature: 0.8, topP: 0.9, maxTokens: gapTokens, fixedLength: true, acceptAll: true };
  // The first page waits for the load; it's the warm-up.
  gw.prefetch('warm', { ...plan, seed: ['warm'] }, opts);
  await gw.take('warm', 60_000);
  const loadMs = performance.now() - t0 - (gw.timings.get('warm') ?? 0);
  const pageMs: number[] = [];
  const wallMs: number[] = [];
  for (let i = 0; i < runs; i++) {
    const id = `p${i}`;
    const p: PagePlan = { ...plan, seed: [...plan.seed, i] };
    const t = performance.now();
    gw.prefetch(id, p, opts);
    const r = await gw.take(id, 60_000);
    if (!r) throw new Error(`worker: page ${id} didn't come back (${gw.errors.join('; ')})`);
    wallMs.push(performance.now() - t);
    pageMs.push(gw.timings.get(id) ?? NaN);
  }
  worker.terminate();
  return { loadMs, pageMs, wallMs };
}

async function main(): Promise<void> {
  const t0 = performance.now();
  const lm = await fetchModel(BASE);
  const loadMs = performance.now() - t0;
  say(`loaded in ${loadMs.toFixed(0)} ms; running…`);
  await new Promise((r) => setTimeout(r, 50));
  const r = benchGap(lm, benchContext(lm.tokenizer, 120), () => performance.now(), 20, 30);
  const page = benchPage(lm, benchPlan(5), () => performance.now(), 8, 30);
  say(`main thread done; the worker…`);
  const w = await workerPages(8, 30);
  const samples: string[] = [];
  for (let i = 0; i < 3; i++) {
    const ids = generate(lm, [EOT], { temperature: 0.8, topP: 0.9, maxTokens: 120 }, new ModelRng(gapSeed('sample', 1, i)));
    samples.push(lm.tokenizer.decode(ids).replace(/\s*¶\s*$/, '').trim());
  }
  const worker = { loadMs: Math.round(w.loadMs), page: { median: r2(median(w.pageMs)), max: r2(Math.max(...w.pageMs)) }, wall: { median: r2(median(w.wallMs)), max: r2(Math.max(...w.wallMs)) } };
  const result = { userAgent: navigator.userAgent, loadMs: Math.round(loadMs), ...r, page, worker, samples };
  (window as unknown as { __modelBench: unknown }).__modelBench = result;
  say(
    [
      `${navigator.userAgent}`,
      `load (fetch, dequantize): ${result.loadMs} ms`,
      `gap: ${r.contextTokens} tokens of context, then ${r.gapTokens} sampled, ${r.runs} runs`,
      `  ms per gap:   median ${r.gap.median}, p90 ${r.gap.p90}, best ${r.gap.min}`,
      `  context:      median ${r.prefill.median} ms`,
      `  each token:   median ${r.perToken.median} ms`,
      `page, main thread: ${page.gaps} gaps of ${page.gapTokens} tokens, ${page.fed} fed, ${page.sampled} sampled, ${page.reprimes} re-primes, ${page.runs} runs`,
      `  ms per page:  median ${page.page.median}, p90 ${page.page.p90}; per gap ${page.perGap.median}`,
      `  the page fed alone, gaps as cards: median ${page.feedOnly.median} ms; each gap adds ${page.perGapAdded.median} ms`,
      `page, in a worker (prefetch → take), 8 pages: load ${worker.loadMs} ms`,
      `  ms per page in the worker: median ${worker.page.median}, worst ${worker.page.max}`,
      `  ms from prefetch to taken: median ${worker.wall.median}, worst ${worker.wall.max}`,
      '',
      ...samples.map((s, i) => `— ${i + 1} —\n${s.replace(/ ¶ /g, '\n\n')}\n`),
    ].join('\n'),
  );
  document.title = 'Tiny model bench: done';
}

main().catch((e: unknown) => say(`failed: ${String(e)}`));
