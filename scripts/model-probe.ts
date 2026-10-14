/**
 * docs/50: the pretrained model tried as a gap-filler, before phase 2b has
 * the microplanner's gaps and the fine-tune.
 *
 * `npx tsx scripts/model-probe.ts [--n 200] [--show 30] [--temperature 0.8] [--top-p 0.9]
 *    [--model model/export] [--train a.txt,b.txt] [--constrain] [--json out.json]`
 *
 * From held-out night pages (`model/data/nights.val.txt`), it takes sentences
 * the verifier would pass as texture, gives the model the page up to that
 * sentence (the last 120 tokens), and asks for one sentence in its place:
 * sampled at the given temperature and top-p, cut at the first sentence end
 * (a paragraph mark before the first word is allowed: the gap opens a paragraph).
 * Then the verifier, with the rest of the page for the repeat check: the pass
 * rate first time, and after one resample. And of what it wrote, how much is
 * **recalled** rather than written: the card's own sentence; another sentence
 * of the training text, verbatim; or a sentence sharing a run of eight words
 * or more with the training text (`--train`, default every
 * `model/data/<source>.train.txt`; for phase 1's model, its own `train.txt`).
 * Prefix only (the gap's "after" is phase 2b's), no slot, no fine-tune: the
 * floor phase 2b starts from. `--constrain` keeps names, hours, digits and
 * means out at the sampler (`gapBans`), as the book's writer does.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_SAMPLING, EOT, gapBans, generate, ModelRng, gapSeed, sentencesOf, verifyGap } from '../src/game/board/model/index.js';
import { EXPORT_DIR, loadModel } from './model-load.js';

function arg(name: string, dflt: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
}
function sarg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const SOURCES = ['goldens', 'cards', 'bible', 'pd', 'nights'];
const n = arg('n', 200);
const sampling = { temperature: arg('temperature', DEFAULT_SAMPLING.temperature), topP: arg('top-p', DEFAULT_SAMPLING.topP) };
const show = arg('show', 30);
const trainFiles = (sarg('train') ?? SOURCES.map((s) => `model/data/${s}.train.txt`).join(',')).split(',');
const lm = loadModel();
const tok = lm.tokenizer;
// --constrain: names, hours, digits and means kept out at the sampler (gapBans), as writePage does.
const ban = process.argv.includes('--constrain') ? gapBans(tok) : undefined;
const val = readFileSync('model/data/nights.val.txt', 'utf8').trim().split('\n');

interface Probe {
  prefix: string;
  original: string;
  page: string[];
}

const probes: Probe[] = [];
for (let i = 0; i < val.length && probes.length < n; i++) {
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
  // A gap may open a new paragraph: a paragraph mark before any word is let through, and dropped.
  const body = (t: string): string => t.replace(/^\s*¶\s*/, '');
  const stop = (id: number): boolean => {
    ids.push(id);
    if (id === EOT) return true;
    const t = body(tok.decode(ids));
    return /¶/.test(t) || (/[.!?][”’]?$/.test(t) && t.trim().split(/\s+/).length >= 4 && (t.match(/“/g) ?? []).length === (t.match(/”/g) ?? []).length && sentencesOf(t.trim()).length === 1);
  };
  const out = generate(lm, ctx, { ...sampling, maxTokens: 48, stop, ...(ban ? { ban } : {}) }, new ModelRng(gapSeed('probe', p.original, attempt)));
  const text = body(tok.decode(out)).replace(/¶.*$/, '').trim();
  return sentencesOf(text)[0] ?? text;
}

/* What counts as recalled: every training sentence, and every run of eight words, hashed. */
const RUN = 8;
const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
function h2(ws: string[], from: number): number {
  let a = 2166136261;
  let b = 5381;
  for (let i = from; i < from + RUN; i++) {
    const w = ws[i] as string;
    for (let k = 0; k < w.length; k++) {
      const c = w.charCodeAt(k);
      a = Math.imul(a ^ c, 16777619);
      b = (Math.imul(b, 33) + c) | 0;
    }
    a = Math.imul(a ^ 32, 16777619);
    b = (Math.imul(b, 33) + 32) | 0;
  }
  return (a >>> 0) * 2097152 + ((b >>> 0) & 2097151);
}
const seen = new Set<string>();
const runs = new Set<number>();
for (const f of trainFiles) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    for (const para of line.split(' ¶ ')) {
      for (const s of sentencesOf(para)) seen.add(s);
      const ws = words(para);
      for (let i = 0; i + RUN <= ws.length; i++) runs.add(h2(ws, i));
    }
  }
}
function longestRun(s: string): boolean {
  const ws = words(s);
  for (let i = 0; i + RUN <= ws.length; i++) if (runs.has(h2(ws, i))) return true;
  return false;
}

type Kind = 'card' | 'verbatim' | 'run8' | 'new';
let first = 0;
let second = 0;
const kinds: Record<Kind, number> = { card: 0, verbatim: 0, run8: 0, new: 0 };
let accepted = 0;
const reasons = new Map<string, number>();
const rows: { page: string; card: string; model: string; kind: Kind | 'card default'; firstTry: string }[] = [];
const t0 = Date.now();
for (const p of probes) {
  const a = fill(p, 0);
  const va = verifyGap(a, { page: p.page });
  let final: string | null = a;
  if (va.ok) first++;
  else {
    for (const r of va.reasons) reasons.set(r.split(':')[0] as string, (reasons.get(r.split(':')[0] as string) ?? 0) + 1);
    const b = fill(p, 1);
    if (verifyGap(b, { page: p.page }).ok) {
      second++;
      final = b;
    } else final = null;
  }
  let kind: Kind | 'card default' = 'card default';
  if (final !== null) {
    accepted++;
    kind = final === p.original ? 'card' : seen.has(final) ? 'verbatim' : longestRun(final) ? 'run8' : 'new';
    kinds[kind]++;
  }
  rows.push({ page: p.prefix.slice(-200), card: p.original, model: final ?? `(card default; tried: ${a})`, kind, firstTry: va.ok ? '' : va.reasons.join('; ') });
}
const N = probes.length;
const pc = (x: number, of: number): string => `${((100 * x) / Math.max(1, of)).toFixed(0)}%`;
const recalled = kinds.card + kinds.verbatim + kinds.run8;
const summary = {
  model: EXPORT_DIR,
  constrained: ban !== undefined,
  gaps: N,
  sampling,
  seconds: Math.round((Date.now() - t0) / 1000),
  passFirst: first / N,
  passAfterResample: (first + second) / N,
  accepted,
  kinds,
  recalled: recalled / Math.max(1, accepted),
  rejections: Object.fromEntries([...reasons.entries()].sort((x, y) => y[1] - x[1])),
};
process.stdout.write(
  [
    `${N} gaps from held-out night pages, prefix only, no fine-tune; ${EXPORT_DIR}; temperature ${sampling.temperature}, top-p ${sampling.topP}; ${summary.seconds} s`,
    `verifier pass, first sample: ${first} (${pc(first, N)})`,
    `after one resample: ${first + second} (${pc(first + second, N)})`,
    `of the ${accepted} taken: the card's own sentence ${kinds.card} (${pc(kinds.card, accepted)}), another training sentence verbatim ${kinds.verbatim} (${pc(kinds.verbatim, accepted)}), eight words or more from training ${kinds.run8} (${pc(kinds.run8, accepted)}), new ${kinds.new} (${pc(kinds.new, accepted)}); recalled in all ${recalled} (${pc(recalled, accepted)})`,
    `first-try rejections: ${Object.entries(summary.rejections)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`,
    '',
    ...rows.slice(0, show).map((r, i) => `${i + 1}. [${r.kind}]\n  page:  …${r.page}\n  card:  ${r.card}\n  model: ${r.model}${r.firstTry ? `   [first try failed: ${r.firstTry}]` : ''}`),
    '',
  ].join('\n'),
);
const out = sarg('json');
if (out) writeFileSync(out, `${JSON.stringify({ ...summary, rows }, null, 2)}\n`);
