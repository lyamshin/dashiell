/**
 * docs/50 §2: the tiny model's forward pass, in plain TypeScript.
 *
 * The same network as `model/gpt.py` (pre-norm blocks, causal attention, a
 * tanh-GELU MLP four times the width, learned positions, the output head tied
 * to the token embedding, no Linear biases), run on the int8 export that
 * `model/export.py` writes: one binary of tensors and a JSON header saying where
 * each one is. Weights are dequantized to Float32Array once, at load. A KV
 * cache keeps every position's keys and values, so a gap costs one batched
 * pass over its context and then one cheap step a token.
 *
 * Pure: typed arrays and loops, no DOM, no Node, no dependencies.
 */

import { Tokenizer, type TokenizerData } from './tokenizer.js';

export interface ModelConfig {
  vocab: number;
  ctx: number;
  layers: number;
  heads: number;
  width: number;
}

export interface TensorEntry {
  name: string;
  dtype: 'int8' | 'f32';
  shape: number[];
  /** Byte offset of the data in the binary. */
  offset: number;
  /** int8 only: byte offset of the float32 scale per row. */
  scales?: number;
}

/** `model/export/dashiell.json`. */
export interface ModelHeader {
  format: 'dashiell-tiny-lm';
  version: number;
  config: ModelConfig;
  tokenizer: TokenizerData;
  tensors: TensorEntry[];
  bytes: number;
  /** Where the weights came from: the run, its step and its held-out loss. */
  trained?: Record<string, unknown>;
}

interface Layer {
  ln1w: Float32Array;
  ln1b: Float32Array;
  qkv: Float32Array;
  proj: Float32Array;
  ln2w: Float32Array;
  ln2b: Float32Array;
  up: Float32Array;
  down: Float32Array;
}

/** One tensor out of the binary, as float32: int8 rows times their scale, or float32 as it is. */
function tensor(h: ModelHeader, bin: ArrayBuffer, name: string, shape: number[]): Float32Array {
  const e = h.tensors.find((t) => t.name === name);
  if (!e) throw new Error(`model: no tensor ${name}`);
  if (e.shape.join('x') !== shape.join('x')) throw new Error(`model: ${name} is ${e.shape.join('x')}, expected ${shape.join('x')}`);
  const n = shape.reduce((a, b) => a * b, 1);
  if (e.dtype === 'f32') return new Float32Array(bin.slice(e.offset, e.offset + 4 * n));
  const rows = shape[0] as number;
  const cols = n / rows;
  const q = new Int8Array(bin, e.offset, n);
  const s = new Float32Array(bin.slice(e.scales as number, (e.scales as number) + 4 * rows));
  const out = new Float32Array(n);
  for (let r = 0; r < rows; r++) {
    const sc = s[r] as number;
    const o = r * cols;
    for (let k = 0; k < cols; k++) out[o + k] = (q[o + k] as number) * sc;
  }
  return out;
}

/** One output: Σₖ x[xo + k] · w[wo + k]. */
function dot(x: Float32Array, xo: number, w: Float32Array, wo: number, cols: number): number {
  let a = 0;
  for (let k = 0; k < cols; k++) a += (w[wo + k] as number) * (x[xo + k] as number);
  return a;
}

/**
 * out[t·rows + r] = Σₖ x[t·cols + k] · w[r·cols + k], for T rows of x.
 *
 * The kernels are the fastest of the shapes measured in V8 on an M1 Pro
 * (docs/50, the benchmark): one token at a time, four weight rows share each
 * load of x (about 1.8 GMAC/s); a batch, four rows by four tokens, sixteen
 * sums in registers (about 3 GMAC/s). Int8 weights in an Int8Array ran no
 * faster than float32, so the weights are dequantized at load.
 */
export function matmulT(out: Float32Array, x: Float32Array, w: Float32Array, T: number, rows: number, cols: number): void {
  const r4 = rows - (rows % 4);
  if (T === 1) {
    for (let r = 0; r < r4; r += 4) {
      const w0 = r * cols;
      const w1 = w0 + cols;
      const w2 = w1 + cols;
      const w3 = w2 + cols;
      let a = 0;
      let b = 0;
      let c = 0;
      let d = 0;
      for (let k = 0; k < cols; k++) {
        const xk = x[k] as number;
        a += (w[w0 + k] as number) * xk;
        b += (w[w1 + k] as number) * xk;
        c += (w[w2 + k] as number) * xk;
        d += (w[w3 + k] as number) * xk;
      }
      out[r] = a;
      out[r + 1] = b;
      out[r + 2] = c;
      out[r + 3] = d;
    }
    for (let r = r4; r < rows; r++) out[r] = dot(x, 0, w, r * cols, cols);
    return;
  }
  const t4 = T - (T % 4);
  for (let r = 0; r < r4; r += 4) {
    const w0 = r * cols;
    const w1 = w0 + cols;
    const w2 = w1 + cols;
    const w3 = w2 + cols;
    for (let t = 0; t < t4; t += 4) {
      const x0 = t * cols;
      const x1 = x0 + cols;
      const x2 = x1 + cols;
      const x3 = x2 + cols;
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0; // prettier-ignore
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0; // prettier-ignore
      let c0 = 0, c1 = 0, c2 = 0, c3 = 0; // prettier-ignore
      let d0 = 0, d1 = 0, d2 = 0, d3 = 0; // prettier-ignore
      for (let k = 0; k < cols; k++) {
        const p = x[x0 + k] as number;
        const q = x[x1 + k] as number;
        const s = x[x2 + k] as number;
        const u = x[x3 + k] as number;
        const wa = w[w0 + k] as number;
        const wb = w[w1 + k] as number;
        const wc = w[w2 + k] as number;
        const wd = w[w3 + k] as number;
        a0 += wa * p; a1 += wa * q; a2 += wa * s; a3 += wa * u; // prettier-ignore
        b0 += wb * p; b1 += wb * q; b2 += wb * s; b3 += wb * u; // prettier-ignore
        c0 += wc * p; c1 += wc * q; c2 += wc * s; c3 += wc * u; // prettier-ignore
        d0 += wd * p; d1 += wd * q; d2 += wd * s; d3 += wd * u; // prettier-ignore
      }
      const o0 = t * rows + r;
      const o1 = o0 + rows;
      const o2 = o1 + rows;
      const o3 = o2 + rows;
      out[o0] = a0; out[o1] = a1; out[o2] = a2; out[o3] = a3; // prettier-ignore
      out[o0 + 1] = b0; out[o1 + 1] = b1; out[o2 + 1] = b2; out[o3 + 1] = b3; // prettier-ignore
      out[o0 + 2] = c0; out[o1 + 2] = c1; out[o2 + 2] = c2; out[o3 + 2] = c3; // prettier-ignore
      out[o0 + 3] = d0; out[o1 + 3] = d1; out[o2 + 3] = d2; out[o3 + 3] = d3; // prettier-ignore
    }
    for (let t = t4; t < T; t++) {
      for (let j = 0; j < 4; j++) out[t * rows + r + j] = dot(x, t * cols, w, (r + j) * cols, cols);
    }
  }
  for (let r = r4; r < rows; r++) {
    for (let t = 0; t < T; t++) out[t * rows + r] = dot(x, t * cols, w, r * cols, cols);
  }
}

function layerNorm(out: Float32Array, x: Float32Array, w: Float32Array, b: Float32Array, T: number, d: number): void {
  for (let t = 0; t < T; t++) {
    const o = t * d;
    let mean = 0;
    for (let k = 0; k < d; k++) mean += x[o + k] as number;
    mean /= d;
    let v = 0;
    for (let k = 0; k < d; k++) {
      const z = (x[o + k] as number) - mean;
      v += z * z;
    }
    const inv = 1 / Math.sqrt(v / d + 1e-5);
    for (let k = 0; k < d; k++) out[o + k] = ((x[o + k] as number) - mean) * inv * (w[k] as number) + (b[k] as number);
  }
}

const GELU_C = Math.sqrt(2 / Math.PI);

/** The tiny model, loaded, with one KV cache: one gap (or one sample) at a time. */
export class TinyLM {
  readonly config: ModelConfig;
  readonly tokenizer: Tokenizer;
  private readonly tok: Float32Array;
  private readonly pos: Float32Array;
  private readonly layers: Layer[];
  private readonly lnfw: Float32Array;
  private readonly lnfb: Float32Array;
  private readonly kc: Float32Array[];
  private readonly vc: Float32Array[];
  /** How many positions the cache holds. */
  private n = 0;
  private readonly logits: Float32Array;
  private bufT = 0;
  private x = new Float32Array(0);
  private h = new Float32Array(0);
  private qkv = new Float32Array(0);
  private att = new Float32Array(0);
  private a = new Float32Array(0);
  private u = new Float32Array(0);
  private readonly scores: Float64Array;
  private readonly acc: Float64Array;

  constructor(header: ModelHeader, bin: ArrayBuffer) {
    if (header.format !== 'dashiell-tiny-lm') throw new Error(`model: not a dashiell-tiny-lm header (${String(header.format)})`);
    if (bin.byteLength !== header.bytes) throw new Error(`model: the binary is ${bin.byteLength} bytes, the header says ${header.bytes}`);
    const c = header.config;
    this.config = c;
    this.tokenizer = new Tokenizer(header.tokenizer);
    if (this.tokenizer.size !== c.vocab) throw new Error(`model: the tokenizer has ${this.tokenizer.size} tokens, the model ${c.vocab}`);
    const d = c.width;
    this.tok = tensor(header, bin, 'tok', [c.vocab, d]);
    this.pos = tensor(header, bin, 'pos', [c.ctx, d]);
    this.layers = [];
    for (let i = 0; i < c.layers; i++) {
      this.layers.push({
        ln1w: tensor(header, bin, `b${i}.ln1.w`, [d]),
        ln1b: tensor(header, bin, `b${i}.ln1.b`, [d]),
        qkv: tensor(header, bin, `b${i}.qkv`, [3 * d, d]),
        proj: tensor(header, bin, `b${i}.proj`, [d, d]),
        ln2w: tensor(header, bin, `b${i}.ln2.w`, [d]),
        ln2b: tensor(header, bin, `b${i}.ln2.b`, [d]),
        up: tensor(header, bin, `b${i}.up`, [4 * d, d]),
        down: tensor(header, bin, `b${i}.down`, [d, 4 * d]),
      });
    }
    this.lnfw = tensor(header, bin, 'ln_f.w', [d]);
    this.lnfb = tensor(header, bin, 'ln_f.b', [d]);
    this.kc = this.layers.map(() => new Float32Array(c.ctx * d));
    this.vc = this.layers.map(() => new Float32Array(c.ctx * d));
    this.logits = new Float32Array(c.vocab);
    this.scores = new Float64Array(c.ctx);
    this.acc = new Float64Array(c.width / c.heads);
  }

  /** How many positions are in the cache. */
  get length(): number {
    return this.n;
  }

  /** Forget the cache: the next `feed` starts at position 0. */
  reset(): void {
    this.n = 0;
  }

  /**
   * Roll the cache back to its first `n` positions, as if nothing after them
   * had been fed (docs/50 §8, the page cache: a gap's prompt and draft are
   * fed after the page so far, then rolled back, and the page goes on). The
   * keys and values before `n` don't depend on anything after it, so this is
   * exact, and free.
   */
  truncate(n: number): void {
    if (!(n >= 0 && n <= this.n)) throw new Error(`model: can't roll the cache back to ${n} (it holds ${this.n})`);
    this.n = n;
  }

  private ensure(T: number): void {
    if (T <= this.bufT) return;
    const d = this.config.width;
    this.bufT = T;
    this.x = new Float32Array(T * d);
    this.h = new Float32Array(T * d);
    this.qkv = new Float32Array(T * 3 * d);
    this.att = new Float32Array(T * d);
    this.a = new Float32Array(T * d);
    this.u = new Float32Array(T * 4 * d);
  }

  /**
   * Run `ids` through the network after what the cache already holds, add
   * them to the cache, and return the logits for the next token (a view
   * that the next call overwrites). The caller keeps within `config.ctx`.
   */
  feed(ids: readonly number[]): Float32Array {
    const c = this.config;
    const d = c.width;
    const T = ids.length;
    if (T === 0) throw new Error('model: nothing to feed');
    if (this.n + T > c.ctx) throw new Error(`model: ${this.n + T} positions is past the context of ${c.ctx}`);
    this.ensure(T);
    const { x, h, qkv, att, a, u } = this;
    const p0 = this.n;
    for (let t = 0; t < T; t++) {
      const id = ids[t] as number;
      if (!(id >= 0 && id < c.vocab)) throw new Error(`model: token ${id} is outside the vocabulary`);
      const to = id * d;
      const po = (p0 + t) * d;
      const xo = t * d;
      for (let k = 0; k < d; k++) x[xo + k] = (this.tok[to + k] as number) + (this.pos[po + k] as number);
    }
    const H = c.heads;
    const hd = d / H;
    const scale = 1 / Math.sqrt(hd);
    for (let li = 0; li < this.layers.length; li++) {
      const L = this.layers[li] as Layer;
      const K = this.kc[li] as Float32Array;
      const V = this.vc[li] as Float32Array;
      layerNorm(h, x, L.ln1w, L.ln1b, T, d);
      matmulT(qkv, h, L.qkv, T, 3 * d, d);
      for (let t = 0; t < T; t++) {
        const qo = t * 3 * d;
        const co = (p0 + t) * d;
        for (let k = 0; k < d; k++) {
          K[co + k] = qkv[qo + d + k] as number;
          V[co + k] = qkv[qo + 2 * d + k] as number;
        }
      }
      for (let t = 0; t < T; t++) {
        const last = p0 + t;
        for (let hh = 0; hh < H; hh++) {
          const qo = t * 3 * d + hh * hd;
          let max = -Infinity;
          for (let s = 0; s <= last; s++) {
            const ko = s * d + hh * hd;
            let dot = 0;
            for (let k = 0; k < hd; k++) dot += (qkv[qo + k] as number) * (K[ko + k] as number);
            dot *= scale;
            this.scores[s] = dot;
            if (dot > max) max = dot;
          }
          let sum = 0;
          for (let s = 0; s <= last; s++) {
            const e = Math.exp((this.scores[s] as number) - max);
            this.scores[s] = e;
            sum += e;
          }
          const oo = t * d + hh * hd;
          const acc = this.acc;
          acc.fill(0);
          const isum = 1 / sum;
          for (let s = 0; s <= last; s++) {
            const p = (this.scores[s] as number) * isum;
            const vo = s * d + hh * hd;
            for (let k = 0; k < hd; k++) acc[k] = (acc[k] as number) + p * (V[vo + k] as number);
          }
          for (let k = 0; k < hd; k++) att[oo + k] = acc[k] as number;
        }
      }
      matmulT(a, att, L.proj, T, d, d);
      for (let i = 0; i < T * d; i++) x[i] = (x[i] as number) + (a[i] as number);
      layerNorm(h, x, L.ln2w, L.ln2b, T, d);
      matmulT(u, h, L.up, T, 4 * d, d);
      for (let i = 0; i < T * 4 * d; i++) {
        const z = u[i] as number;
        u[i] = 0.5 * z * (1 + Math.tanh(GELU_C * (z + 0.044715 * z * z * z)));
      }
      matmulT(a, u, L.down, T, d, 4 * d);
      for (let i = 0; i < T * d; i++) x[i] = (x[i] as number) + (a[i] as number);
    }
    this.n = p0 + T;
    // The head only for the last position: that's the one we sample from.
    const lastRow = x.subarray((T - 1) * d, T * d);
    const hl = h.subarray(0, d);
    layerNorm(hl, lastRow, this.lnfw, this.lnfb, 1, d);
    matmulT(this.logits, hl, this.tok, 1, c.vocab, d);
    return this.logits;
  }
}
