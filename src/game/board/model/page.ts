/**
 * docs/50 §8: a page's gaps, written with one cache.
 *
 * The microplanner's skeleton (docs/49 §3) is a list of units: locked fact
 * sentences, and gaps with a card default. `writePage` walks it in order and
 * keeps the page so far in the model's KV cache, so each piece of text is fed
 * once:
 *
 * - a locked unit is fed and stays;
 * - a gap: remember the cache's length, feed the gap's header and the unit
 *   after it (`gapformat.ts`), remember again, and sample the draft; if the
 *   verifier rejects it, roll back to the second mark and sample once more;
 *   if that fails too, the card default. Then roll back to the first mark and
 *   feed the chosen text as page text, and go on.
 *
 * When the next piece won't fit in the context, the cache is primed again
 * with the last `GAP_BUDGET.before.min` tokens of the page (the one place the
 * page is fed twice).
 *
 * Seeded by the night (`seed` parts + the unit's index + the try), so a page
 * reads the same every time it is written. Pure: the model, ids and strings.
 */

import type { TinyLM } from './gpt.js';
import { gapBans } from './constrain.js';
import { ENDGAP, GAP_BUDGET, gapHeaderIds, type GapHeader } from './gapformat.js';
import { gapSeed, ModelRng, sampleToken, type SampleOptions } from './sample.js';
import { EOT, N_SPECIAL, SEP } from './tokenizer.js';
import { verifyGap, type GapContext } from './verifier.js';

export type PageUnit =
  | { kind: 'fact'; text: string; /** Starts a new paragraph. */ para?: boolean }
  | { kind: 'gap'; slot: GapHeader['slot']; manner: GapHeader['manner']; /** The card default. */ text: string; para?: boolean };

export interface PagePlan {
  units: PageUnit[];
  tier: number;
  kind: GapHeader['kind'];
  /** The night's seed parts (seed, tier, page): the gaps' draws hang off them. */
  seed: (string | number)[];
  /** For the verifier: the night's names, places and clue words. */
  names?: string[];
  places?: string[];
  facts?: string[];
}

export interface GapResult {
  /** The unit's index in the plan. */
  index: number;
  text: string;
  /** model: the first draft passed; resample: the second did; card: both failed. */
  from: 'model' | 'resample' | 'card';
  /** The drafts the verifier turned down, and why. */
  rejected: { text: string; reasons: string[] }[];
}

export interface PageResult {
  /** Every unit's final text, in order. */
  texts: string[];
  gaps: GapResult[];
  /** The page as it reads: paragraphs joined by " ¶ ". */
  page: string;
  /** Tokens fed in batches (the page, headers, re-primes) and sampled one at a time. */
  fed: number;
  sampled: number;
  reprimes: number;
}

export interface WriteOptions extends SampleOptions {
  /** Sample this many tokens at most (and, with `fixedLength`, exactly this many: the benchmark's worst case). */
  maxTokens?: number;
  fixedLength?: boolean;
  /** Take the first draft whatever it says (the benchmark: one try a gap). */
  acceptAll?: boolean;
  /** Keep names, hours, digits and means out of the drafts at the sampler (`gapBans`); the verifier still checks. Default true. */
  constrain?: boolean;
}

/** The page's text from units: a paragraph mark where a unit starts one. */
function joinUnits(units: PageUnit[], texts: string[]): string {
  let s = '';
  units.forEach((u, i) => {
    const t = (texts[i] as string).trim();
    if (!t) return;
    s += s === '' ? t : u.para ? ` ¶ ${t}` : ` ${t}`;
  });
  return s;
}

export function writePage(lm: TinyLM, plan: PagePlan, o: WriteOptions): PageResult {
  const tok = lm.tokenizer;
  const ctx = lm.config.ctx;
  const maxT = o.maxTokens ?? GAP_BUDGET.target.max;
  const texts = plan.units.map((u) => (u.kind === 'fact' ? u.text : ''));
  const gaps: GapResult[] = [];
  const page: number[] = [];
  let fed = 0;
  let sampled = 0;
  let reprimes = 0;

  lm.reset();
  lm.feed([EOT]);
  fed++;

  /** Make room for `need` more positions: re-prime with the page's tail if they won't fit. */
  const room = (need: number): void => {
    if (lm.length + need <= ctx) return;
    const keep = Math.min(page.length, GAP_BUDGET.before.min, ctx - need - 1);
    lm.reset();
    lm.feed([EOT, ...page.slice(page.length - keep)]);
    fed += keep + 1;
    reprimes++;
  };
  /** Page text into the cache, for good. */
  const append = (text: string, para: boolean): void => {
    if (!text) return;
    const ids = tok.encode(page.length === 0 ? text : `${para ? ' ¶ ' : ' '}${text}`);
    for (let i = 0; i < ids.length; i += ctx >> 1) {
      const part = ids.slice(i, i + (ctx >> 1));
      room(part.length);
      lm.feed(part);
      fed += part.length;
      page.push(...part);
    }
  };
  const mask = o.constrain === false ? null : gapBans(tok, { names: plan.names, places: plan.places });
  const banned = (id: number): boolean => (id < N_SPECIAL && id !== ENDGAP) || (mask !== null && mask[id] === 1);

  plan.units.forEach((u, i) => {
    if (u.kind === 'fact') {
      append(u.text, u.para === true && page.length > 0);
      return;
    }
    // The unit after the gap: the next locked one.
    let after = '';
    for (let j = i + 1; j < plan.units.length; j++) {
      const n = plan.units[j] as PageUnit;
      if (n.kind === 'fact') {
        after = `${n.para ? ' ¶ ' : ' '}${n.text}`;
        break;
      }
    }
    const afterIds = after ? tok.encode(after).slice(0, GAP_BUDGET.after) : [];
    const para = u.para === true && page.length > 0;
    const head = gapHeaderIds({ slot: u.slot, tier: plan.tier, kind: plan.kind, manner: u.manner });
    // A gap that opens a paragraph: the page so far ends with the mark, as the corpus writes it.
    const lead = para ? tok.encode(' ¶') : [];
    room(lead.length + head.length + afterIds.length + 1 + maxT);
    const mark = lm.length;
    const prompt = [...lead, ...head, ...afterIds, SEP];
    // The logits after the prompt are the first draw of every try: kept, since the next feed overwrites them.
    const first = Float32Array.from(lm.feed(prompt));
    fed += prompt.length;
    const mark2 = lm.length;
    const others = (): string[] => texts.filter((t, k) => k !== i && t !== '');
    const vctx: GapContext = { names: plan.names, places: plan.places, facts: plan.facts, page: others(), countTokens: (t) => tok.encode(t).length, minTokens: GAP_BUDGET.target.min, maxTokens: GAP_BUDGET.target.max };
    const rejected: { text: string; reasons: string[] }[] = [];
    let chosen: string | null = null;
    let from: GapResult['from'] = 'card';
    for (let attempt = 0; attempt < 2 && chosen === null; attempt++) {
      if (attempt > 0) lm.truncate(mark2);
      const rng = new ModelRng(gapSeed(...plan.seed, i, attempt));
      const out: number[] = [];
      let logits: Float32Array = first;
      for (let k = 0; k < maxT; k++) {
        const id = sampleToken(logits, o, rng, o.fixedLength ? (x) => x < N_SPECIAL : banned);
        sampled++;
        if (id === ENDGAP && !o.fixedLength) break;
        out.push(id);
        if (k === maxT - 1) break;
        logits = lm.feed([id]);
      }
      const text = tok.decode(out).trim();
      const v = o.acceptAll ? { ok: true, reasons: [] } : verifyGap(text, vctx);
      if (v.ok) {
        chosen = text;
        from = attempt === 0 ? 'model' : 'resample';
      } else rejected.push({ text, reasons: v.reasons });
    }
    lm.truncate(mark);
    texts[i] = chosen ?? u.text;
    gaps.push({ index: i, text: texts[i] as string, from, rejected });
    append(texts[i] as string, para);
  });
  return { texts, gaps, page: joinUnits(plan.units, texts), fed, sampled, reprimes };
}
