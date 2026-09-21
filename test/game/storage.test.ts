import { describe, expect, it } from 'vitest';
import { generateCase } from '../../src/gen/index.js';
import { buildView } from '../../src/game/derive.js';
import { newRun, stepInput } from '../../src/game/reducer.js';
import {
  addBurned,
  clearRun,
  deserializeRun,
  loadBurned,
  loadRun,
  saveRun,
  serializeRun,
  type KeyValueStore,
} from '../../src/game/storage.js';
import { ALL_CARDS, type Card } from '../../src/game/voice/index.js';
import { BURNED_KEY, SAVE_KEY } from '../../src/game/types.js';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const view = buildView(generateCase(7, { difficulty: 2 }));

describe('the run survives a reload', () => {
  it('round-trips a state that has been played into', () => {
    let state = newRun(view, { detectiveName: 'Marlowe' });
    for (const input of ['look', 'examine', 'help', `go ${view.kase.places[3]?.shortName}`]) {
      state = stepInput(state, input, view).state;
    }
    const store = memoryStore();
    saveRun(store, state);
    const back = loadRun(store);
    expect(back).toEqual(state);
    expect(store.data.has(SAVE_KEY)).toBe(true);
  });

  it('round-trips through a plain string', () => {
    const state = newRun(view, { detectiveName: 'Humphrey' });
    expect(deserializeRun(serializeRun(state))).toEqual(state);
  });

  it('refuses rubbish rather than resuming into it', () => {
    expect(deserializeRun(null)).toBeNull();
    expect(deserializeRun('not json')).toBeNull();
    expect(deserializeRun('{"seed":7}')).toBeNull();
    expect(deserializeRun('[]')).toBeNull();
    expect(deserializeRun('{"seed":"seven","difficulty":2}')).toBeNull();
  });

  it('survives a store that throws on every call', () => {
    const hostile: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const state = newRun(view, { detectiveName: 'Humphrey' });
    expect(() => saveRun(hostile, state)).not.toThrow();
    expect(loadRun(hostile)).toBeNull();
    expect(loadBurned(hostile)).toEqual([]);
    expect(() => clearRun(hostile)).not.toThrow();
  });

  it('clears the run without clearing the burned pile', () => {
    const store = memoryStore();
    saveRun(store, newRun(view, { detectiveName: 'Humphrey' }));
    addBurned(store, ['SIM-001'], ALL_CARDS.length);
    clearRun(store);
    expect(loadRun(store)).toBeNull();
    expect(loadBurned(store)).toEqual(['SIM-001']);
  });
});

describe('burned cards outlive the run', () => {
  it('accumulates across runs', () => {
    const store = memoryStore();
    addBurned(store, ['SIM-001', 'WIT-002'], ALL_CARDS.length);
    addBurned(store, ['WIT-002', 'PLACE-003'], ALL_CARDS.length);
    expect(loadBurned(store).sort()).toEqual(['PLACE-003', 'SIM-001', 'WIT-002']);
    expect(store.data.has(BURNED_KEY)).toBe(true);
  });

  it('reshuffles the pile once every card has been read', () => {
    const store = memoryStore();
    const everything = ALL_CARDS.map((c: Card) => c.id);
    addBurned(store, everything, ALL_CARDS.length);
    // Full: the next run starts from just what it burned itself.
    const after = addBurned(store, ['SIM-001'], ALL_CARDS.length);
    expect(after).toEqual(['SIM-001']);
    expect(loadBurned(store)).toEqual(['SIM-001']);
  });

  it('ignores a pile that is not a list of strings', () => {
    const store = memoryStore();
    store.setItem(BURNED_KEY, '{"nope":true}');
    expect(loadBurned(store)).toEqual([]);
    store.setItem(BURNED_KEY, '[1,2,"SIM-001"]');
    expect(loadBurned(store)).toEqual(['SIM-001']);
  });
});
