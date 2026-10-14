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
import { GAP_SLOTS, type GapSlot } from './gapformat.js';
import { writePage, type PagePlan, type PageUnit } from './page.js';
import { generate, ModelRng, gapSeed } from './sample.js';
import { EOT, type Tokenizer } from './tokenizer.js';
import { sentencesOf } from './verifier.js';

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

/**
 * docs/50 §8: a page to time the page cache on. The golden's office page
 * (`BENCH_TEXT`) as a skeleton: its sentences locked, but `gaps` of them,
 * spread down the page, turned into gaps (their text the card default).
 */
export function benchPlan(gaps = 5): PagePlan {
  const units: PageUnit[] = [];
  BENCH_TEXT.split(' ¶ ').forEach((par, pi) => {
    sentencesOf(par).forEach((s, si) => units.push({ kind: 'fact', text: s, para: pi > 0 && si === 0 }));
  });
  const n = units.length;
  for (let g = 0; g < gaps; g++) {
    const i = Math.min(n - 1, Math.round(((g + 0.5) * n) / gaps));
    const u = units[i] as PageUnit;
    units[i] = { kind: 'gap', slot: GAP_SLOTS[g % GAP_SLOTS.length] as GapSlot, manner: 'none', text: u.text, para: u.para };
  }
  return { units, tier: 4, kind: 'office', seed: ['bench', gaps] };
}

export interface PageBench {
  runs: number;
  gaps: number;
  /** Tokens a gap may sample; the bench samples exactly this many (no early stop), the worst case. */
  gapTokens: number;
  /** ms to write the whole page: every locked unit fed once, every gap's header, after-unit and draft. */
  page: { median: number; p90: number; min: number };
  /** The page's ms over its gaps. */
  perGap: { median: number };
  /** ms to feed the same page with every gap as its card (no drafting): reading the page into the cache. */
  feedOnly: { median: number };
  /** What a gap adds to that: its header and after-unit, its draft, the roll-back and the draft fed as page text. */
  perGapAdded: { median: number };
  fed: number;
  sampled: number;
  reprimes: number;
}

/** Time `writePage` on a plan: the whole page, gaps drafted `gapTokens` long, one try each. */
export function benchPage(lm: TinyLM, plan: PagePlan, now: () => number, runs = 10, gapTokens = 30, warmup = 2): PageBench {
  const times: number[] = [];
  const feeds: number[] = [];
  let last = { fed: 0, sampled: 0, reprimes: 0 };
  const gaps = plan.units.filter((u) => u.kind === 'gap').length;
  const factsOnly: PagePlan = { ...plan, units: plan.units.map((u) => ({ kind: 'fact', text: u.text, para: u.para })) };
  for (let i = 0; i < warmup + runs; i++) {
    const f0 = now();
    writePage(lm, factsOnly, { temperature: 0.8, topP: 0.9 });
    if (i >= warmup) feeds.push(now() - f0);
    const t0 = now();
    // A verifier that takes every draft, so each gap is one try of exactly gapTokens (the resample is the rare case).
    const r = writePage(lm, { ...plan, seed: [...plan.seed, i] }, { temperature: 0.8, topP: 0.9, maxTokens: gapTokens, fixedLength: true, acceptAll: true });
    const t1 = now();
    if (i >= warmup) times.push(t1 - t0);
    last = { fed: r.fed, sampled: r.sampled, reprimes: r.reprimes };
  }
  return {
    runs,
    gaps,
    gapTokens,
    page: { median: r2(median(times)), p90: r2(pct(times, 0.9)), min: r2(Math.min(...times)) },
    perGap: { median: r2(median(times) / Math.max(1, gaps)) },
    feedOnly: { median: r2(median(feeds)) },
    perGapAdded: { median: r2((median(times) - median(feeds)) / Math.max(1, gaps)) },
    ...last,
  };
}
