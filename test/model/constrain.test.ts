import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EOT, gapBans, generate, ModelRng, gapSeed, Tokenizer, type TokenizerData } from '../../src/game/board/model/index.js';
import { nameLexicon } from '../../src/game/board/model/verifier.js';
import { loadModel } from '../../scripts/model-load.js';

/**
 * docs/50 §7: what a gap can never say, kept out at the sampler. The mask
 * bans the words the verifier would reject (names, hours, digits, means), and
 * nothing a texture sentence needs.
 */

const tok = new Tokenizer(JSON.parse(readFileSync('model/tokenizer.json', 'utf8')) as TokenizerData);
const id = (s: string): number => {
  const ids = tok.encode(s);
  if (ids.length !== 1) throw new Error(`"${s}" is ${ids.length} tokens`);
  return ids[0] as number;
};

describe('gapBans', () => {
  const mask = gapBans(tok);

  it('bans hour words, digits, honorifics, means and the names either world deals', () => {
    for (const w of [' eight', ' midnight', ' Mrs', ' revolver', ' poison']) expect(mask[id(w)], w).toBe(1);
    expect(mask[id('7')]).toBe(1);
    const name = [...nameLexicon()].find((n) => tok.encode(` ${n}`).length === 1) as string;
    expect(mask[id(` ${name}`)], name).toBe(1);
  });

  it('leaves the words a texture sentence needs', () => {
    for (const w of [' the', ' stairs', ' coat', ' I', ' She', ' door', ' rose', ' cold', ' The']) expect(mask[id(w)], w).toBe(0);
  });

  it('bans the night’s own names and places, word by word', () => {
    // A capitalised word no world deals as a name: banned only on a night that has it.
    let word = '';
    for (let t = 64; t < tok.size && !word; t++) {
      const s = tok.decode([t]);
      if (/^ [A-Z][a-z]{4,}$/.test(s) && mask[t] === 0) word = s.trim();
    }
    expect(word).not.toBe('');
    const night = gapBans(tok, { names: ['Mrs. Rafferty'], places: [`the ${word} Rooms`] });
    expect(night[id(' Rafferty')]).toBe(1);
    expect(night[id(` ${word}`)]).toBe(1);
  });

  it('keeps every banned token out of a sample', () => {
    const lm = loadModel();
    const ctx = [EOT, ...tok.encode('I asked Mrs. Rafferty who had been in and out of her house tonight. She started at eight.')];
    for (let s = 0; s < 4; s++) {
      const ids = generate(lm, ctx, { temperature: 1.2, topP: 1, maxTokens: 30, ban: mask }, new ModelRng(gapSeed('ban', s)));
      for (const t of ids) expect(mask[t]).toBe(0);
    }
  });
});
