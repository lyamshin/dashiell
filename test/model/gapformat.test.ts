import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkSpecials, ENDGAP, EOT, GAP, GAP_BUDGET, gapExample, gapHeaderIds, SEP, showExample, specialName, Tokenizer, type TokenizerData } from '../../src/game/board/model/index.js';
import { GAP_SPECIALS_END } from '../../src/game/board/model/gapformat.js';

/**
 * docs/50 §8: the gap format is the contract between the target writers, the
 * fine-tune and the book. Its specials are the tokenizer's (model/tokenizer.py
 * names them; the JSON carries the names), and its budgets fit the context.
 */

const data = JSON.parse(readFileSync('model/tokenizer.json', 'utf8')) as TokenizerData;
const tok = new Tokenizer(data);
const header = JSON.parse(readFileSync('model/export/dashiell.json', 'utf8')) as { config: { ctx: number }; tokenizer: TokenizerData };

describe('the gap format', () => {
  it('names its specials as the tokenizer does, id for id', () => {
    expect(checkSpecials(data.specials)).toEqual([]);
    expect(GAP_SPECIALS_END).toBe(38);
    expect(data.specials[ENDGAP]).toBe('<|endgap|>');
    expect(specialName(5)).toBe('<|slot:why-here|>');
    expect(specialName(37)).toBe('<|manner:none|>');
  });

  it('is the exported model’s tokenizer', () => {
    expect(header.tokenizer.merges).toEqual(data.merges);
    expect(checkSpecials(header.tokenizer.specials)).toEqual([]);
  });

  it('heads a gap with its slot, tier, place kind and manner', () => {
    const ids = gapHeaderIds({ slot: 'walk', tier: 4, kind: 'bar', manner: 'none' });
    expect(ids).toEqual([GAP, 6, 16, 18, 37, SEP]);
    expect(() => gapHeaderIds({ slot: 'walk', tier: 6, kind: 'bar', manner: 'none' })).toThrow(/tier/);
  });

  it('fits the context: before, header, after, separator and target', () => {
    const b = GAP_BUDGET;
    expect(b.before.max + 6 + b.after + 1 + b.target.max).toBeLessThanOrEqual(header.config.ctx);
  });

  it('writes one example: the page so far, the header, the unit after, the target and <|endgap|>', () => {
    const before = 'Midnight. My office was a room at the top of a walk-up on Mulberry Street. ¶';
    const ex = gapExample(tok, { slot: 'why-here', tier: 2, kind: 'office', manner: 'none' }, before, '“My name is Ilse Hauck,” she said.', 'Nobody climbs those stairs at that hour to be sociable.');
    expect(ex.prompt[0]).toBe(EOT);
    expect(ex.prompt[ex.prompt.length - 1]).toBe(SEP);
    expect(ex.target[ex.target.length - 1]).toBe(ENDGAP);
    const shown = showExample(tok, ex);
    expect(shown).toBe(
      '<|eot|>Midnight. My office was a room at the top of a walk-up on Mulberry Street. ¶<|gap|><|slot:why-here|><|tier:poached|><|kind:office|><|manner:none|><|sep|> “My name is Ilse Hauck,” she said.<|sep|> Nobody climbs those stairs at that hour to be sociable.<|endgap|>',
    );
  });

  it('is the same example, id for id, as the fine-tune’s Python (model/gapformat.py)', () => {
    const rows = readFileSync('model/data/gap-parity.jsonl', 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { slot: 'walk'; tier: number; kind: 'bar'; manner: 'none'; before: string; after: string; target: string; before_tokens: number; prompt: number[]; target_ids: number[] });
    expect(rows.length).toBeGreaterThanOrEqual(30);
    for (const r of rows) {
      const ex = gapExample(tok, { slot: r.slot, tier: r.tier, kind: r.kind, manner: r.manner }, r.before, r.after, r.target, r.before_tokens);
      expect(ex.prompt).toEqual(r.prompt);
      expect(ex.target).toEqual(r.target_ids);
    }
  });

  it('cuts the page so far to its last tokens, and the unit after to its budget', () => {
    const long = Array.from({ length: 80 }, (_, i) => `Sentence ${i} went by.`).join(' ');
    const ex = gapExample(tok, { slot: 'close', tier: 0, kind: 'street', manner: 'plain' }, long, long, 'It was late.', 120);
    const after = ex.prompt.slice(ex.prompt.indexOf(GAP) + 6, -1);
    expect(ex.prompt.indexOf(GAP)).toBe(121);
    expect(after.length).toBe(GAP_BUDGET.after);
    expect(tok.decode(ex.prompt.slice(1, 121)).endsWith('Sentence 79 went by.')).toBe(true);
  });
});
