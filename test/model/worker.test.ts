import { describe, expect, it } from 'vitest';
import { benchPlan, writePage, type PageResult } from '../../src/game/board/model/index.js';
import { createGapHost, GapWorker, type GapReply, type GapRequest, type WorkerLike } from '../../src/game/board/model/worker.js';
import { loadModel } from '../../scripts/model-load.js';

/**
 * docs/50 §8: the worker writes pages a page ahead; the book takes what is
 * ready when the page turns, and the cards for what isn't. Here the worker's
 * side runs in-process, behind a stand-in for `Worker` that passes messages
 * asynchronously, as a real one does.
 */

const lm = loadModel();
const plan = benchPlan(5);
const sampling = { temperature: 0.8, topP: 0.9 };

/** A Worker stand-in: the book's messages go to the host, the host's replies come back, each a task later. */
function fakeWorker(loadDelay = 0): { w: WorkerLike; sent: GapRequest[] } {
  const sent: GapRequest[] = [];
  const w: WorkerLike = { onmessage: null, postMessage: (m) => sent.push(m) && setTimeout(() => host(m), 0) };
  const host = createGapHost(
    (r: GapReply) => setTimeout(() => w.onmessage?.({ data: r }), 0),
    () => new Promise((resolve) => setTimeout(() => resolve(lm), loadDelay)),
  );
  return { w, sent };
}

describe('the gap worker', () => {
  it('writes a prefetched page, the same page writePage writes', async () => {
    const { w } = fakeWorker();
    const gw = new GapWorker(w);
    gw.load('/model/export/');
    gw.prefetch('p1', plan, sampling);
    const r = await gw.take('p1', 30_000);
    expect(r).not.toBeNull();
    expect((r as PageResult).page).toBe(writePage(lm, plan, sampling).page);
    expect(gw.loaded).toBe(true);
    expect(gw.timings.get('p1')).toBeGreaterThan(0);
    // Once written, a page is there to take at once.
    expect(await gw.take('p1', 0)).toBe(r);
  }, 60_000);

  it('holds pages asked for before the model loads, and writes them in order', async () => {
    const { w } = fakeWorker(50);
    const order: string[] = [];
    const gw = new GapWorker(w);
    const inner = w.onmessage;
    w.onmessage = (e) => {
      if (e.data.type === 'page') order.push(e.data.id);
      inner?.(e);
    };
    gw.prefetch('a', plan, sampling);
    gw.prefetch('b', { ...plan, seed: ['b'] }, sampling);
    gw.load('/model/export/');
    const [ra, rb] = await Promise.all([gw.take('a', 30_000), gw.take('b', 30_000)]);
    expect(ra).not.toBeNull();
    expect(rb).not.toBeNull();
    expect(order).toEqual(['a', 'b']);
  }, 60_000);

  it('gives the cards (null) when the page isn’t ready in time, or was cancelled', async () => {
    const { w } = fakeWorker(200);
    const gw = new GapWorker(w);
    gw.load('/model/export/');
    gw.prefetch('slow', plan, sampling);
    expect(await gw.take('slow', 0)).toBeNull();
    expect(await gw.take('slow', 10)).toBeNull();
    gw.prefetch('gone', plan, sampling);
    const pending = gw.take('gone', 30_000);
    gw.cancel('gone');
    expect(await pending).toBeNull();
  }, 60_000);

  it('reports a model that won’t load, and the book keeps the cards', async () => {
    const sent: GapRequest[] = [];
    const w: WorkerLike = { onmessage: null, postMessage: (m) => sent.push(m) && setTimeout(() => host(m), 0) };
    const host = createGapHost(
      (r) => setTimeout(() => w.onmessage?.({ data: r }), 0),
      () => Promise.reject(new Error('404')),
    );
    const gw = new GapWorker(w);
    gw.load('/nowhere/');
    gw.prefetch('p', plan, sampling);
    expect(await gw.take('p', 100)).toBeNull();
    expect(gw.errors.join(' ')).toMatch(/load: 404/);
    expect(gw.loaded).toBe(false);
  });
});
