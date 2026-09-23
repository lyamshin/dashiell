/**
 * Saving. Pure: the store is passed in, so the tests use a plain object and
 * the browser passes `window.localStorage`.
 *
 * Three keys. The run is thrown away when a new case opens; the reader's
 * history is not, so no player reads the same line twice until they have read
 * the rest of its key (docs/25). The third remembers which case's closing page
 * was last counted, so a reload does not count it twice.
 */

import { BURNED_KEY, SAVE_KEY, type RunState } from './types.js';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeRun(state: RunState): string {
  return JSON.stringify(state);
}

export function deserializeRun(raw: string | null): RunState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRunState(parsed)) return null;
  // M6 §1.4 added two lists. A run saved before them has asked nothing twice
  // yet, as far as the repeat rule can tell, and that is the honest default.
  const run = parsed as RunState & Partial<Pick<RunState, 'asked' | 'searched'>>;
  return {
    ...run,
    asked: Array.isArray(run.asked) ? run.asked : [],
    searched: Array.isArray(run.searched) ? run.searched : [],
    // The grid's pencil. Anything that is not a plain object is not a mark.
    ...(typeof run.marks === 'object' && run.marks !== null && !Array.isArray(run.marks)
      ? { marks: run.marks }
      : { marks: undefined }),
    // M9: confrontations and description links. A malformed one is dropped.
    confronts: Array.isArray(run.confronts) ? run.confronts : undefined,
    links:
      typeof run.links === 'object' && run.links !== null && !Array.isArray(run.links) ? run.links : undefined,
    // M10 §A.3: what a page held back for "Go on". A malformed list is dropped.
    pending: Array.isArray(run.pending)
      ? run.pending.filter(
          (p) =>
            typeof p === 'object' &&
            p !== null &&
            (p.kind === 'ask' || p.kind === 'examine') &&
            typeof p.placeId === 'string' &&
            Array.isArray(p.clueIds),
        )
      : undefined,
  };
}

function isRunState(value: unknown): value is RunState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.seed === 'number' &&
    // M7: level 4, the DA's Office.
    (v.difficulty === 1 || v.difficulty === 2 || v.difficulty === 3 || v.difficulty === 4) &&
    // M7: a tier and a level, both optional. A save from before them is the
    // untiered case it always was; a tier that is not one is not a save.
    (v.tier === undefined || [0, 1, 2, 3, 4, 5, 'over-easy'].includes(v.tier as number | string)) &&
    (v.level === undefined || v.level === 1 || v.level === 2 || v.level === 3 || v.level === 4) &&
    typeof v.detectiveName === 'string' &&
    typeof v.at === 'string' &&
    typeof v.actionsUsed === 'number' &&
    Array.isArray(v.found) &&
    Array.isArray(v.threads) &&
    Array.isArray(v.burned) &&
    Array.isArray(v.log) &&
    Array.isArray(v.met) &&
    Array.isArray(v.accounts) &&
    typeof v.reportOpen === 'boolean' &&
    // M4b. A run saved before the office existed has no client in the chair
    // and no motifs behind it, and the engine would read `undefined` off it
    // three pages later. A save from an older shape is not a save: the menu
    // comes back and the player opens a case. Nothing else in here versions,
    // because nothing else in here ever changed shape.
    typeof v.clientInOffice === 'boolean' &&
    typeof v.clientAsks === 'number' &&
    typeof v.sceneSeen === 'boolean' &&
    Array.isArray(v.previousMotifs) &&
    typeof v.appearances === 'object' &&
    v.appearances !== null
  );
}

export function saveRun(store: KeyValueStore, state: RunState): void {
  try {
    store.setItem(SAVE_KEY, serializeRun(state));
  } catch {
    /* a full or blocked store is not a reason to lose the page */
  }
}

export function loadRun(store: KeyValueStore): RunState | null {
  try {
    return deserializeRun(store.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function clearRun(store: KeyValueStore): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    /* nothing to do */
  }
}

/*
 * The reader's history (docs/25). How many times each card has been read,
 * across every night this browser has played, so the dealer can keep a card
 * back until the rest of its key has been read. Stored as
 * `{ "v": 2, "reads": { id: count } }`. The M3 pile was a plain list of ids,
 * each read once; one of those still loads, as a count of one each.
 *
 * `loadBurned` hands the history over as a list with an id once for each time
 * it was read, so every caller that only asks "has this been read?" keeps
 * working, and the dealer counts the repeats (`readCounts`).
 */

/** The history as counts, whatever shape the store has it in. */
export function loadReads(store: KeyValueStore): Map<string, number> {
  const out = new Map<string, number>();
  try {
    const raw = store.getItem(BURNED_KEY);
    if (!raw) return out;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const id of parsed) if (typeof id === 'string') out.set(id, 1);
      return out;
    }
    if (typeof parsed !== 'object' || parsed === null) return out;
    const reads = (parsed as { reads?: unknown }).reads;
    if (typeof reads !== 'object' || reads === null || Array.isArray(reads)) return out;
    for (const [id, n] of Object.entries(reads as Record<string, unknown>)) {
      if (typeof n === 'number' && Number.isFinite(n) && n >= 1) out.set(id, Math.min(Math.floor(n), 1000));
    }
    return out;
  } catch {
    return out;
  }
}

function saveReads(store: KeyValueStore, reads: Map<string, number>): void {
  try {
    store.setItem(BURNED_KEY, JSON.stringify({ v: 2, reads: Object.fromEntries(reads) }));
  } catch {
    /* a full or blocked store forgets; the next night deals as if it were new */
  }
}

/** Counts, spelled out: an id once for each time it was read. */
function spell(reads: Map<string, number>): string[] {
  const out: string[] = [];
  for (const [id, n] of reads) for (let i = 0; i < n; i++) out.push(id);
  return out;
}

export function loadBurned(store: KeyValueStore): string[] {
  return spell(loadReads(store));
}

/**
 * Remember cards across nights: one more read for each id. `settle` is the
 * pile's housekeeping (`settleReads` in `voice/cards.ts`), run before saving.
 */
export function addBurned(
  store: KeyValueStore,
  ids: readonly string[],
  settle?: (reads: Map<string, number>) => void,
): string[] {
  const reads = loadReads(store);
  for (const id of ids) reads.set(id, (reads.get(id) ?? 0) + 1);
  settle?.(reads);
  saveReads(store, reads);
  return spell(reads);
}

/*
 * The closing page — the verdict's last line and the story behind the
 * curtain — is worked out again every time it is shown, and it has to come
 * out the same on a reload. So it is dealt against the history as it stood
 * before this case's closing was first read, and its cards are counted once
 * a case, however many times the page is drawn.
 */
const CLOSING_KEY = 'dashiell:closing';

function loadClosing(store: KeyValueStore): { key: string; ids: string[] } | null {
  try {
    const raw = store.getItem(CLOSING_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { key, ids } = parsed as { key?: unknown; ids?: unknown };
    if (typeof key !== 'string' || !Array.isArray(ids)) return null;
    return { key, ids: ids.filter((x): x is string => typeof x === 'string') };
  } catch {
    return null;
  }
}

/** The history the closing page of case `key` is dealt against. */
export function closingHistory(store: KeyValueStore, key: string): string[] {
  const reads = loadReads(store);
  const last = loadClosing(store);
  if (last?.key === key) {
    for (const id of last.ids) {
      const n = (reads.get(id) ?? 0) - 1;
      if (n > 0) reads.set(id, n);
      else reads.delete(id);
    }
  }
  return spell(reads);
}

/** Count the closing page's cards as read, once for case `key`. */
export function noteClosing(
  store: KeyValueStore,
  key: string,
  ids: readonly string[],
  settle?: (reads: Map<string, number>) => void,
): void {
  const last = loadClosing(store);
  if (last?.key === key) return;
  addBurned(store, ids, settle);
  try {
    store.setItem(CLOSING_KEY, JSON.stringify({ key, ids }));
  } catch {
    /* nothing to do */
  }
}
