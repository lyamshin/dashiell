/**
 * Saving. Pure: the store is passed in, so the tests use a plain object and
 * the browser passes `window.localStorage`.
 *
 * Two keys. The run is thrown away when a new case opens; the burned card ids
 * are not, so no player reads the same line twice until the deck runs out.
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
  return parsed;
}

function isRunState(value: unknown): value is RunState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.seed === 'number' &&
    // M7: level 4, the DA's Office.
    (v.difficulty === 1 || v.difficulty === 2 || v.difficulty === 3 || v.difficulty === 4) &&
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

export function loadBurned(store: KeyValueStore): string[] {
  try {
    const raw = store.getItem(BURNED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/** Remember cards across runs. `total` reshuffles the pile when it is full. */
export function addBurned(store: KeyValueStore, ids: string[], total: number): string[] {
  const merged = new Set([...loadBurned(store), ...ids]);
  const out = merged.size >= total ? [...ids] : [...merged];
  try {
    store.setItem(BURNED_KEY, JSON.stringify(out));
  } catch {
    /* nothing to do */
  }
  return out;
}
