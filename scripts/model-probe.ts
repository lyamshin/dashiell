/**
 * docs/50: a first read of the pretrained model as a gap-filler, before
 * phase 2 has the microplanner's gaps and the fine-tune.
 *
 * `npx tsx scripts/model-probe.ts [--n 200] [--show 10] [--temperature 0.8] [--top-p 0.9]`
 *
 * From held-out night pages (`model/data/val.txt`, nights only), it takes
 * sentences the verifier would pass as texture, gives the model the page up to
 * that sentence (the last 120 tokens), and asks for one sentence in its place:
 * sampled at the default temperature and top-p, cut at the first sentence end.
 * Then the verifier, with the rest of the page for the repeat check: the pass
 * rate first time, and after one resample, and how much of what it wrote is
 * the card's own sentence or another sentence it saw in training (recall)
 * rather than new. Prefix only (the gap's "after" is phase 2's), no slot, no
 * fine-tune: the floor phase 2 starts from.
 */

import { readFileSync } from 'node:fs';
import { DEFAULT_SAMPLING, EOT, generate, ModelRng, gapSeed, verifyGap } from '../src/game/board/model/index.js';
import { sentencesOf } from '../src/game/board/model/verifier.js';
import { loadModel } from './model-load.js';

function arg(name: string, dflt: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
}

const n = arg('n', 200);
const sampling = { temperature: arg('temperature', DEFAULT_SAMPLING.temperature), topP: arg('top-p', DEFAULT_SAMPLING.topP) };
const show = arg('show', 10);
const lm = loadModel();
const tok = lm.tokenizer;
const val = readFileSync('model/data/val.txt', 'utf8').trim().split('\n');
const src = readFileSync('model/data/val.src', 'utf8').trim().split('\n');

interface Probe {
  prefix: string;
  original: string;
  page: string[];
}

const probes: Probe[] = [];
for (let i = 0; i < val.length && probes.length < n; i++) {
  if (src[i] !== 'nights') continue;
  const paras = (val[i] as string).split(' ¶ ');
  const flat: { s: string; p: number }[] = paras.flatMap((p, pi) => sentencesOf(p).map((s) => ({ s, p: pi })));
  let taken = 0;
  for (let k = 3; k < flat.length && taken < 2; k += 4) {
    const cur = flat[k] as { s: string; p: number };
    const page = flat.filter((_, j) => j !== k).map((x) => x.s);
    if (!verifyGap(cur.s, { page }).ok) continue;
    // The page up to here, paragraph marks kept.
    let prefix = '';
    for (let j = 0; j < k; j++) {
      const f = flat[j] as { s: string; p: number };
      prefix += j === 0 ? f.s : (f.p !== (flat[j - 1] as { p: number }).p ? ' ¶ ' : ' ') + f.s;
    }
    if (cur.p !== (flat[k - 1] as { p: number }).p) prefix += ' ¶';
    probes.push({ prefix, original: cur.s, page });
    taken++;
    if (probes.length >= n) break;
  }
}

function fill(p: Probe, attempt: number): string {
  const ctx = [EOT, ...tok.encode(p.prefix).slice(-119)];
  const ids: number[] = [];
  const stop = (id: number): boolean => {
    ids.push(id);
    if (id === EOT) return true;
    const t = tok.decode(ids);
    return /¶/.test(t) || (/[.!?][”’]?$/.test(t) && t.trim().split(/\s+/).length >= 4 && (t.match(/“/g) ?? []).length === (t.match(/”/g) ?? []).length);
  };
  const out = generate(lm, ctx, { ...sampling, maxTokens: 48, stop }, new ModelRng(gapSeed('probe', p.original, attempt)));
  const text = tok.decode(out).replace(/¶.*$/, '').trim();
  return sentencesOf(text)[0] ?? text;
}

// Whether a sentence is the model writing or recalling: every sentence of the training text.
const seen = new Set<string>();
for (const line of readFileSync('model/data/train.txt', 'utf8').split('\n')) for (const para of line.split(' ¶ ')) for (const s of sentencesOf(para)) seen.add(s);

let first = 0;
let second = 0;
let same = 0;
let recalled = 0;
let accepted = 0;
const reasons = new Map<string, number>();
const rows: string[] = [];
const t0 = Date.now();
for (const p of probes) {
  const a = fill(p, 0);
  const va = verifyGap(a, { page: p.page });
  let final = a;
  if (va.ok) first++;
  else {
    for (const r of va.reasons) reasons.set(r.split(':')[0] as string, (reasons.get(r.split(':')[0] as string) ?? 0) + 1);
    const b = fill(p, 1);
    if (verifyGap(b, { page: p.page }).ok) {
      second++;
      final = b;
    } else final = `(card default) — tried: ${a}`;
  }
  let kind = '';
  if (!final.startsWith('(card default)')) {
    accepted++;
    if (final === p.original) {
      same++;
      kind = ' (the card’s own)';
    } else if (seen.has(final)) {
      recalled++;
      kind = ' (recalled from training)';
    } else kind = ' (NEW)';
  }
  if (rows.length < show) rows.push(`  page:  …${p.prefix.slice(-160)}\n  card:  ${p.original}\n  model: ${final}${kind}${va.ok ? '' : `   [first try failed: ${va.reasons.join('; ')}]`}`);
}
const N = probes.length;
process.stdout.write(
  [
    `${N} gaps from held-out night pages, prefix only, no fine-tune; temperature ${sampling.temperature}, top-p ${sampling.topP}; ${((Date.now() - t0) / 1000).toFixed(0)} s`,
    `verifier pass, first sample: ${first} (${((100 * first) / N).toFixed(0)}%)`,
    `after one resample: ${first + second} (${((100 * (first + second)) / N).toFixed(0)}%)`,
    `of the ${accepted} taken: the card's own sentence ${same} (${((100 * same) / Math.max(1, accepted)).toFixed(0)}%), another sentence from training ${recalled} (${((100 * recalled) / Math.max(1, accepted)).toFixed(0)}%), new ${accepted - same - recalled} (${((100 * (accepted - same - recalled)) / Math.max(1, accepted)).toFixed(0)}%)`,
    `first-try rejections: ${[...reasons.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`,
    '',
    ...rows.slice(0, show).map((r, i) => `${i + 1}.\n${r}`),
    '',
  ].join('\n'),
);
