import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chunks, EOT, N_SPECIAL, Tokenizer, UNK, type TokenizerData } from '../../src/game/board/model/index.js';

/**
 * docs/50 §2: the tokenizer is written twice, in Python for training
 * (`model/tokenizer.py`) and in TypeScript for the book. The two must give
 * the same ids, or the model reads one thing and was taught another.
 * `model/data/tok-parity.jsonl` is 500 held-out lines with the ids Python gave
 * them (`python model/tokenizer.py parity`), edge cases at the end.
 */

const data = JSON.parse(readFileSync('model/tokenizer.json', 'utf8')) as TokenizerData;
const tok = new Tokenizer(data);
const parity = readFileSync('model/data/tok-parity.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l) as { text: string; ids: number[] });

describe('the tokenizer', () => {
  it('has about 6,000 tokens: 64 specials, the characters, the merges', () => {
    expect(tok.size).toBe(6000);
    expect(data.specials).toHaveLength(N_SPECIAL);
    expect(data.specials[EOT]).toBe('<|eot|>');
    expect(data.specials[UNK]).toBe('<|unk|>');
  });

  it('gives the same ids as the Python tokenizer on 500 held-out lines', () => {
    expect(parity.length).toBe(500);
    let mismatched = 0;
    const first: string[] = [];
    for (const { text, ids } of parity) {
      const got = tok.encode(text);
      if (JSON.stringify(got) !== JSON.stringify(ids)) {
        mismatched++;
        if (first.length < 3) first.push(text.slice(0, 80));
      }
    }
    expect(first).toEqual([]);
    expect(mismatched).toBe(0);
  });

  it('decodes what it encodes, when every character is known', () => {
    for (const { text, ids } of parity) {
      if (ids.includes(UNK)) continue;
      expect(tok.decode(tok.encode(text))).toBe(text);
    }
  });

  it('chunks a space onto the word after it, and keeps a contraction whole', () => {
    expect(chunks('He’d gone, “quietly.”')).toEqual(['He’d', ' gone', ',', ' “', 'quietly', '.”']);
    expect(chunks('a  b')).toEqual(['a', ' ', ' b']);
    expect(chunks('1923')).toEqual(['1', '9', '2', '3']);
    expect(chunks("lodgers’ door")).toEqual(['lodgers', '’', ' door']);
  });

  it('marks a character it never saw as <|unk|>, one per code point', () => {
    const ids = tok.encode('a 中😀');
    expect(ids.filter((i) => i === UNK)).toHaveLength(2);
  });

  it('writes the common words of the voice as one token each', () => {
    for (const w of [' the', ' I', ' said', ' nobody', ' door', ' night']) expect(tok.encode(w)).toHaveLength(1);
  });
});
