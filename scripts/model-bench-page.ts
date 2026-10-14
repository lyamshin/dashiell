/**
 * docs/50 §2: the browser half of the benchmark (`scripts/model-bench.html`).
 * Fetches the export from `public/model/`, runs the same gap benchmark as
 * `npm run model:bench` on the page's main thread, and prints three seeded
 * samples, which should read exactly as `npm run model:sample` prints its
 * first three. The result also goes on `window.__modelBench` for a script to read.
 */

import { benchContext, benchGap, EOT, fetchModel, generate, ModelRng, gapSeed } from '../src/game/board/model/index.js';

const out = document.getElementById('out') as HTMLElement;
const say = (s: string): void => {
  out.textContent = s;
};

async function main(): Promise<void> {
  const t0 = performance.now();
  const lm = await fetchModel('/model/');
  const loadMs = performance.now() - t0;
  say(`loaded in ${loadMs.toFixed(0)} ms; running…`);
  await new Promise((r) => setTimeout(r, 50));
  const r = benchGap(lm, benchContext(lm.tokenizer, 120), () => performance.now(), 20, 30);
  const samples: string[] = [];
  for (let i = 0; i < 3; i++) {
    const ids = generate(lm, [EOT], { temperature: 0.8, topP: 0.9, maxTokens: 120 }, new ModelRng(gapSeed('sample', 1, i)));
    samples.push(lm.tokenizer.decode(ids).replace(/\s*¶\s*$/, '').trim());
  }
  const result = { userAgent: navigator.userAgent, loadMs: Math.round(loadMs), ...r, samples };
  (window as unknown as { __modelBench: unknown }).__modelBench = result;
  say(
    [
      `${navigator.userAgent}`,
      `load (fetch, dequantize): ${result.loadMs} ms`,
      `gap: ${r.contextTokens} tokens of context, then ${r.gapTokens} sampled, ${r.runs} runs`,
      `  ms per gap:   median ${r.gap.median}, p90 ${r.gap.p90}, best ${r.gap.min}`,
      `  context:      median ${r.prefill.median} ms`,
      `  each token:   median ${r.perToken.median} ms`,
      '',
      ...samples.map((s, i) => `— ${i + 1} —\n${s.replace(/ ¶ /g, '\n\n')}\n`),
    ].join('\n'),
  );
  document.title = 'Tiny model bench: done';
}

main().catch((e: unknown) => say(`failed: ${String(e)}`));
