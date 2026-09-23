import { describe, expect, it } from 'vitest';
import { generateCase } from '../../src/gen/index.js';
import { buildView } from '../../src/game/derive.js';
import { newRun, stepInput } from '../../src/game/reducer.js';
import {
  addBurned,
  clearRun,
  closingHistory,
  deserializeRun,
  loadBurned,
  loadReads,
  loadRun,
  noteClosing,
  saveRun,
  serializeRun,
  type KeyValueStore,
} from '../../src/game/storage.js';
import { DECKS, settleReads, type Card } from '../../src/game/voice/index.js';
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
    const state = newRun(view, { detectiveName: 'Dashiell' });
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
    const state = newRun(view, { detectiveName: 'Dashiell' });
    expect(() => saveRun(hostile, state)).not.toThrow();
    expect(loadRun(hostile)).toBeNull();
    expect(loadBurned(hostile)).toEqual([]);
    expect(() => clearRun(hostile)).not.toThrow();
  });

  it('clears the run without clearing the reader’s history', () => {
    const store = memoryStore();
    saveRun(store, newRun(view, { detectiveName: 'Dashiell' }));
    addBurned(store, ['SIM-001'], settleReads);
    clearRun(store);
    expect(loadRun(store)).toBeNull();
    expect(loadBurned(store)).toEqual(['SIM-001']);
  });
});

describe('the reader’s history outlives the run (docs/25)', () => {
  it('counts every read, across runs', () => {
    const store = memoryStore();
    addBurned(store, ['SIM-001', 'WIT-002'], settleReads);
    addBurned(store, ['WIT-002', 'PLACE-003'], settleReads);
    // An id once for each time it was read: the dealer counts the repeats.
    expect(loadBurned(store).sort()).toEqual(['PLACE-003', 'SIM-001', 'WIT-002', 'WIT-002']);
    expect(loadReads(store).get('WIT-002')).toBe(2);
    expect(store.data.has(BURNED_KEY)).toBe(true);
  });

  it('takes a round off a deck once every card in it has been read', () => {
    const store = memoryStore();
    const office = DECKS.office.map((c: Card) => c.id);
    addBurned(store, office.slice(1), settleReads);
    // One card still unread: nothing settles, and the reads stand.
    expect(loadReads(store).get(office[1] as string)).toBe(1);
    addBurned(store, [office[0] as string, office[1] as string], settleReads);
    // The last one read: every card down by one, and the one read twice keeps
    // its lead, so the dealer still holds it back.
    const reads = loadReads(store);
    expect(reads.get(office[0] as string)).toBeUndefined();
    expect(reads.get(office[1] as string)).toBe(1);
    expect(reads.get(office[2] as string)).toBeUndefined();
  });

  it('keeps the counts small however many nights are played', () => {
    const store = memoryStore();
    const hours = DECKS.hours.map((c: Card) => c.id);
    for (let night = 0; night < 50; night++) addBurned(store, hours, settleReads);
    expect(Math.max(0, ...loadReads(store).values())).toBeLessThanOrEqual(1);
  });

  it('loads the old pile, a plain list, as one read each, and ignores anything else', () => {
    const store = memoryStore();
    store.setItem(BURNED_KEY, '{"nope":true}');
    expect(loadBurned(store)).toEqual([]);
    store.setItem(BURNED_KEY, '[1,2,"SIM-001"]');
    expect(loadBurned(store)).toEqual(['SIM-001']);
    store.setItem(BURNED_KEY, '{"v":2,"reads":{"SIM-001":2,"WIT-002":"x","PLACE-003":-1}}');
    expect(loadBurned(store)).toEqual(['SIM-001', 'SIM-001']);
  });

  it('forgets quietly when the store is blocked', () => {
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
    expect(() => addBurned(hostile, ['SIM-001'], settleReads)).not.toThrow();
    expect(loadBurned(hostile)).toEqual([]);
    expect(closingHistory(hostile, 'x')).toEqual([]);
    expect(() => noteClosing(hostile, 'x', ['END-001'], settleReads)).not.toThrow();
  });

  it('counts a closing page once a case, and deals it the same on a reload', () => {
    const store = memoryStore();
    addBurned(store, ['SIM-001'], settleReads);
    const first = closingHistory(store, '7|4|2');
    noteClosing(store, '7|4|2', ['STY-001', 'STY-002'], settleReads);
    // Drawn again: the same history as the first time, and no second count.
    expect(closingHistory(store, '7|4|2')).toEqual(first);
    noteClosing(store, '7|4|2', ['STY-001', 'STY-002'], settleReads);
    expect(loadReads(store).get('STY-001')).toBe(1);
    // The next case's closing is dealt knowing this one was read.
    expect(closingHistory(store, '8|4|2')).toContain('STY-001');
  });
});
