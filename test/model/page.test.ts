import { describe, expect, it } from 'vitest';
import { benchPlan, EOT, verifyGap, writePage, type PagePlan } from '../../src/game/board/model/index.js';
import { loadModel } from '../../scripts/model-load.js';

/**
 * docs/50 §8: a page's gaps written with one cache. Rolling the cache back is
 * exact; the locked units come out verbatim; each gap is the model's (passing
 * the verifier) or the card's; and the same night writes the same page.
 */

const lm = loadModel();
const tok = lm.tokenizer;

describe('the cache, rolled back', () => {
  it('gives the same logits as if the rolled-back tokens had never been fed', () => {
    const a = tok.encode(' I went up the stairs.');
    const b = tok.encode(' The door was open, which it never is.');
    const c = tok.encode(' Somebody had been there first.');
    lm.reset();
    lm.feed([EOT, ...a]);
    const mark = lm.length;
    lm.feed(b);
    lm.truncate(mark);
    const rolled = Float32Array.from(lm.feed(c));
    lm.reset();
    const fresh = Float32Array.from(lm.feed([EOT, ...a, ...c]));
    let m = 0;
    for (let i = 0; i < fresh.length; i++) m = Math.max(m, Math.abs((rolled[i] as number) - (fresh[i] as number)));
    expect(m).toBeLessThan(1e-4);
    expect(() => lm.truncate(lm.length + 1)).toThrow(/roll/);
  });
});

describe('writePage', () => {
  const plan: PagePlan = benchPlan(5);

  it('keeps every locked unit verbatim and fills every gap, from the model or the card', () => {
    const r = writePage(lm, plan, { temperature: 0.8, topP: 0.9 });
    expect(r.texts).toHaveLength(plan.units.length);
    expect(r.gaps).toHaveLength(5);
    plan.units.forEach((u, i) => {
      if (u.kind === 'fact') expect(r.texts[i]).toBe(u.text);
    });
    for (const g of r.gaps) {
      const u = plan.units[g.index];
      expect(u?.kind).toBe('gap');
      if (g.from === 'card') expect(g.text).toBe(u?.text);
      else {
        const others = r.texts.filter((_, k) => k !== g.index);
        expect(verifyGap(g.text, { page: others, countTokens: (t) => tok.encode(t).length, minTokens: 8, maxTokens: 40 }).ok).toBe(true);
      }
      expect(g.rejected.length).toBe(g.from === 'model' ? 0 : g.from === 'resample' ? 1 : 2);
    }
    expect(r.page.split(' ¶ ').length).toBe(5);
  }, 30_000);

  it('writes the same page from the same night, and another from another', () => {
    const a = writePage(lm, plan, { temperature: 0.8, topP: 0.9 });
    const b = writePage(lm, plan, { temperature: 0.8, topP: 0.9 });
    expect(b.page).toBe(a.page);
    const c = writePage(lm, { ...plan, seed: ['another night'] }, { temperature: 0.8, topP: 0.9, acceptAll: true });
    const d = writePage(lm, plan, { temperature: 0.8, topP: 0.9, acceptAll: true });
    expect(c.page).not.toBe(d.page);
  }, 60_000);

  it('feeds the page once, and primes again only when the window fills', () => {
    const r = writePage(lm, plan, { temperature: 0.8, topP: 0.9, maxTokens: 30, fixedLength: true, acceptAll: true });
    const pageTokens = tok.encode(r.page).length;
    expect(r.sampled).toBe(5 * 30);
    // The page, each gap's header and after-unit, and a re-prime of at most 121 tokens each time.
    expect(r.fed).toBeLessThan(pageTokens + 5 * (2 + 6 + 48 + 1) + r.reprimes * 121 + 1);
    expect(r.reprimes).toBeGreaterThan(0);
  }, 30_000);
});
