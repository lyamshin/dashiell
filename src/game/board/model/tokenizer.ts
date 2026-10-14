/**
 * docs/50 §2: the tokenizer, for inference. Character-level BPE, about 6,000
 * tokens, trained in Python (`model/tokenizer.py`), which states the rules.
 * This is the same algorithm, written again; `test/model-tokenizer.test.ts`
 * checks the two agree on 500 held-out lines. Change one, change the other.
 *
 * Pure: no DOM, no Node, no dependencies.
 */

/** What `model/tokenizer.json` holds, and the export's header carries. */
export interface TokenizerData {
  version: number;
  specials: string[];
  chars: string[];
  merges: [string, string][];
}

export const N_SPECIAL = 64;
export const EOT = 0;
export const UNK = 1;
export const GAP = 2;
export const SEP = 3;

function isLetter(c: string): boolean {
  const o = c.codePointAt(0) as number;
  return (o >= 65 && o <= 90) || (o >= 97 && o <= 122) || (o >= 0xc0 && o <= 0x24f && o !== 0xd7 && o !== 0xf7);
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9' && c.length === 1;
}

const isApostrophe = (c: string): boolean => c === "'" || c === '’';

/** The pre-tokenizer, by code point. Mirrors `chunks` in model/tokenizer.py exactly. */
export function chunks(text: string): string[] {
  const cs = Array.from(text);
  const out: string[] = [];
  const n = cs.length;
  let i = 0;
  while (i < n) {
    const start = i;
    if (cs[i] === ' ') {
      if (i + 1 >= n || cs[i + 1] === ' ') {
        out.push(' ');
        i++;
        continue;
      }
      i++;
    }
    const c = cs[i] as string;
    if (isLetter(c)) {
      i++;
      while (i < n) {
        const d = cs[i] as string;
        if (isLetter(d)) i++;
        else if (isApostrophe(d) && i + 1 < n && isLetter(cs[i + 1] as string)) i += 2;
        else break;
      }
    } else if (isDigit(c)) {
      i++;
    } else {
      i++;
      while (i < n) {
        const d = cs[i] as string;
        if (isLetter(d) || isDigit(d) || d === ' ') break;
        i++;
      }
    }
    out.push(cs.slice(start, i).join(''));
  }
  return out;
}

export class Tokenizer {
  readonly vocab: string[];
  private readonly tokenId = new Map<string, number>();
  private readonly rank = new Map<string, number>();
  private readonly cache = new Map<string, number[]>();

  constructor(readonly data: TokenizerData) {
    this.vocab = [...data.specials, ...data.chars, ...data.merges.map(([a, b]) => a + b)];
    for (let i = N_SPECIAL; i < this.vocab.length; i++) {
      const s = this.vocab[i] as string;
      if (!this.tokenId.has(s)) this.tokenId.set(s, i);
    }
    data.merges.forEach(([a, b], r) => this.rank.set(`${a}\u0000${b}`, r));
  }

  get size(): number {
    return this.vocab.length;
  }

  private encodeChunk(chunk: string): number[] {
    const hit = this.cache.get(chunk);
    if (hit) return hit;
    let syms: (string | null)[] = Array.from(chunk).map((c) => (this.tokenId.has(c) ? c : null));
    while (syms.length > 1) {
      let best: [string, string] | null = null;
      let bestRank = Infinity;
      for (let k = 0; k < syms.length - 1; k++) {
        const a = syms[k];
        const b = syms[k + 1];
        if (a === null || a === undefined || b === null || b === undefined) continue;
        const r = this.rank.get(`${a}\u0000${b}`);
        if (r !== undefined && r < bestRank) {
          bestRank = r;
          best = [a, b];
        }
      }
      if (best === null) break;
      const merged: (string | null)[] = [];
      for (let k = 0; k < syms.length; ) {
        if (k + 1 < syms.length && syms[k] === best[0] && syms[k + 1] === best[1]) {
          merged.push(best[0] + best[1]);
          k += 2;
        } else {
          merged.push(syms[k] as string | null);
          k++;
        }
      }
      syms = merged;
    }
    const ids = syms.map((s) => (s === null ? UNK : (this.tokenId.get(s) as number)));
    if (this.cache.size < 50000) this.cache.set(chunk, ids);
    return ids;
  }

  encode(text: string): number[] {
    const out: number[] = [];
    for (const ch of chunks(text)) for (const id of this.encodeChunk(ch)) out.push(id);
    return out;
  }

  /** The text of some ids; special tokens say nothing. */
  decode(ids: readonly number[]): string {
    let s = '';
    for (const id of ids) if (id >= N_SPECIAL && id < this.vocab.length) s += this.vocab[id];
    return s;
  }
}
