/**
 * docs/50 §8: the gaps, written off the main thread, a page ahead.
 *
 * The book never waits for the model (§1). So the model lives in a Web
 * Worker: the book loads it once, and as soon as it knows the next page's
 * skeleton (while the player is still reading this one), it asks the worker
 * to write that page's gaps. When the player turns the page, the book takes
 * whatever is ready by then, and the card defaults for anything that isn't.
 *
 * Two halves, one file:
 *
 * - **the worker's side**, `createGapHost(post, load)`: takes `load`, `page`
 *   and `cancel` messages, writes pages one at a time in the order asked
 *   (`writePage`), and posts each result back. When this module runs as a
 *   worker it wires itself to `self` (the guard at the bottom);
 * - **the book's side**, `GapWorker`: wraps a `Worker` (or anything with
 *   `postMessage` and `onmessage`): `load(base)`, `prefetch(id, plan)`, and
 *   `take(id, waitMs)`, which resolves with the page or with `null` (the card
 *   defaults) when it isn't ready in time.
 *
 * In the book (not yet wired, docs/50 §5):
 *
 *   const gw = new GapWorker(new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }));
 *   gw.load('/model/');            // the export's URL, wherever the build puts it
 *   gw.prefetch(nextId, nextPlan); // as soon as the next page is dealt
 *   const r = await gw.take(nextId, 0); // on the page turn: ready, or the cards
 */

import type { TinyLM } from './gpt.js';
import { fetchModel } from './load.js';
import { writePage, type PagePlan, type PageResult, type WriteOptions } from './page.js';
import { DEFAULT_SAMPLING } from './sample.js';

export type GapRequest =
  | { type: 'load'; base: string }
  | { type: 'page'; id: string; plan: PagePlan; options?: Partial<WriteOptions> }
  | { type: 'cancel'; id: string };

export type GapReply =
  | { type: 'loaded'; ms: number }
  | { type: 'page'; id: string; result: PageResult; ms: number }
  | { type: 'error'; id?: string; message: string };

/**
 * The worker's side. `post` sends a reply to the book; `load` reads the model
 * (`fetchModel` in a worker). Pages wait in a queue until the model is loaded,
 * then run one at a time, in the order they were asked for; a cancelled page
 * that hasn't started is dropped.
 */
export function createGapHost(post: (r: GapReply) => void, load: (base: string) => Promise<TinyLM>, now: () => number = () => Date.now()): (m: GapRequest) => void {
  let lm: TinyLM | null = null;
  const queue: { id: string; plan: PagePlan; options?: Partial<WriteOptions> }[] = [];
  let busy = false;

  const pump = (): void => {
    if (busy || !lm) return;
    const job = queue.shift();
    if (!job) return;
    busy = true;
    // One page per turn of the worker's event loop, so a cancel or a newer request can get in between.
    setTimeout(() => {
      try {
        const t0 = now();
        const result = writePage(lm as TinyLM, job.plan, { ...DEFAULT_SAMPLING, ...job.options });
        post({ type: 'page', id: job.id, result, ms: now() - t0 });
      } catch (e) {
        post({ type: 'error', id: job.id, message: String((e as Error).message ?? e) });
      }
      busy = false;
      pump();
    }, 0);
  };

  return (m: GapRequest): void => {
    if (m.type === 'load') {
      const t0 = now();
      load(m.base).then(
        (model) => {
          lm = model;
          post({ type: 'loaded', ms: now() - t0 });
          pump();
        },
        (e: unknown) => post({ type: 'error', message: `load: ${String((e as Error).message ?? e)}` }),
      );
    } else if (m.type === 'page') {
      queue.push({ id: m.id, plan: m.plan, options: m.options });
      pump();
    } else if (m.type === 'cancel') {
      const k = queue.findIndex((j) => j.id === m.id);
      if (k >= 0) queue.splice(k, 1);
    }
  };
}

/** What `GapWorker` needs of a Worker. */
export interface WorkerLike {
  postMessage(m: GapRequest): void;
  onmessage: ((e: { data: GapReply }) => void) | null;
}

/** The book's side: ask for a page's gaps early, take them when the page turns. */
export class GapWorker {
  private readonly done = new Map<string, PageResult>();
  private readonly waiting = new Map<string, (r: PageResult | null) => void>();
  private loadedFlag = false;
  readonly errors: string[] = [];
  /** How long each page took in the worker, ms, by id. */
  readonly timings = new Map<string, number>();

  constructor(private readonly w: WorkerLike) {
    w.onmessage = (e) => this.receive(e.data);
  }

  get loaded(): boolean {
    return this.loadedFlag;
  }

  load(base: string): void {
    this.w.postMessage({ type: 'load', base });
  }

  /** Ask for a page's gaps now, to have them by the time the page turns. */
  prefetch(id: string, plan: PagePlan, options?: Partial<WriteOptions>): void {
    if (this.done.has(id)) return;
    this.w.postMessage({ type: 'page', id, plan, ...(options ? { options } : {}) });
  }

  cancel(id: string): void {
    this.w.postMessage({ type: 'cancel', id });
    this.finish(id, null);
  }

  /** The page's gaps if they're ready within `waitMs` (0: only if ready now); else null, and the page is the cards. */
  take(id: string, waitMs = 0): Promise<PageResult | null> {
    const r = this.done.get(id);
    if (r) return Promise.resolve(r);
    if (waitMs <= 0) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.finish(id, null), waitMs);
      this.waiting.set(id, (x) => {
        clearTimeout(timer);
        resolve(x);
      });
    });
  }

  private finish(id: string, r: PageResult | null): void {
    const f = this.waiting.get(id);
    if (f) {
      this.waiting.delete(id);
      f(r);
    }
  }

  private receive(m: GapReply): void {
    if (m.type === 'loaded') this.loadedFlag = true;
    else if (m.type === 'page') {
      this.done.set(m.id, m.result);
      this.timings.set(m.id, m.ms);
      this.finish(m.id, m.result);
    } else {
      this.errors.push(m.message);
      if (m.id) this.finish(m.id, null);
    }
  }
}

/*
 * When this module is a worker's entry, it is the host. Wired synchronously, as the module is
 * evaluated, so the book's first message (posted right after `new Worker`) finds a listener.
 */
declare const self: unknown;
declare const WorkerGlobalScope: (abstract new () => unknown) | undefined;
const inWorker = typeof WorkerGlobalScope !== 'undefined' && typeof self === 'object' && self !== null && self instanceof (WorkerGlobalScope as abstract new () => unknown);
if (inWorker) {
  const scope = self as { postMessage: (m: GapReply) => void; onmessage: ((e: { data: GapRequest }) => void) | null };
  const host = createGapHost((r) => scope.postMessage(r), (base) => fetchModel(base));
  scope.onmessage = (e) => host(e.data);
}
