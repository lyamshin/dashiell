/**
 * docs/50 §2: `npm run model:sample [-- --n 20 --tokens 120 --temperature 0.8 --top-p 0.9 --seed 1]`
 *
 * Twenty unconditioned samples from the tiny model: each starts from
 * <|eot|> (the start of a page, as the model learned it) and runs to the
 * next <|eot|> or `--tokens`. Seeded, so the same command prints the same
 * twenty. " ¶ " in the corpus is a paragraph break, and is printed as one.
 */

import { performance } from 'node:perf_hooks';
import { EOT, generate, ModelRng, gapSeed, verifyGap } from '../src/game/board/model/index.js';
import { sentencesOf } from '../src/game/board/model/verifier.js';
import { wrap } from '../src/game/board/text.js';
import { loadModel, modelHeader } from './model-load.js';

function arg(name: string, dflt: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
}

const n = arg('n', 20);
const tokens = arg('tokens', 120);
const temperature = arg('temperature', 0.8);
const topP = arg('top-p', 0.9);
const seed = arg('seed', 1);
const lm = loadModel();
const h = modelHeader();
const out: string[] = [];
out.push(`${n} samples · ${h.trained?.run ?? '?'} (step ${String(h.trained?.step ?? '?')}, held-out loss ${String(h.trained?.val_loss_int8 ?? '?')}) · temperature ${temperature}, top-p ${topP}, up to ${tokens} tokens`);
let ms = 0;
let generated = 0;
let sentences = 0;
let passing = 0;
for (let i = 0; i < n; i++) {
  const rng = new ModelRng(gapSeed('sample', seed, i));
  const t0 = performance.now();
  const ids = generate(lm, [EOT], { temperature, topP, maxTokens: tokens }, rng);
  ms += performance.now() - t0;
  generated += ids.length;
  const ended = ids[ids.length - 1] === EOT;
  const text = lm.tokenizer.decode(ids).replace(/\s*¶\s*$/, '').trim();
  // How much of it the verifier would take as a gap, sentence by sentence (a rough read, unconditioned).
  for (const p of text.split(' ¶ ')) {
    for (const s of sentencesOf(p)) {
      sentences++;
      if (verifyGap(s).ok) passing++;
    }
  }
  out.push('');
  out.push(`— ${i + 1} —${ended ? '' : ' (cut at the token limit)'}`);
  out.push(
    text
      .split(' ¶ ')
      .map((p) => wrap(p.trim()))
      .join('\n\n'),
  );
}
out.push('');
out.push(`${generated} tokens in ${(ms / 1000).toFixed(1)} s (${(ms / Math.max(1, generated)).toFixed(1)} ms a token, context included); ${passing} of ${sentences} sentences would pass the gap verifier on their own.`);
process.stdout.write(`${out.join('\n')}\n`);
