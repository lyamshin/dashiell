/**
 * The profile, on the board alone: reports filed, full credit, tiers cleared.
 * A profile the engines before the board wrote (`dashiell:profile`, with its
 * Over easy and its levels) is never read.
 */
import { describe, expect, it } from 'vitest';
import { emptyProfile, fileToProfile, loadProfile, PROFILE_KEY, recordRun, sanitizeProfile, teachOn, type KeyValueStore } from '../src/game/board/profile.js';
import { tierNewsLines } from '../src/ui/report.js';

function memoryStore(init: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('board: the profile', () => {
  it('ignores an old engine’s profile, and leaves it where it was', () => {
    const old = JSON.stringify({ version: 1, cleared: [0, 1, 2, 3, 4, 5, 'over-easy'], best: { 0: { level: 1, parDelta: 0 } }, runs: 40, wins: 30, current: { tier: 'over-easy', level: 4 } });
    const store = memoryStore({ 'dashiell:profile': old });
    expect(loadProfile(store)).toEqual(emptyProfile());
    expect(teachOn(loadProfile(store), 3)).toBe(true);
    fileToProfile(store, { tier: 2, points: 4, asked: 4, actionsUsed: 9, par: 9 });
    expect(store.data.get('dashiell:profile')).toBe(old);
    expect(JSON.parse(store.data.get(PROFILE_KEY) as string)).toMatchObject({ cleared: [2], runs: 1, wins: 1 });
  });

  it('keeps only what makes sense, and never throws', () => {
    expect(sanitizeProfile(null)).toEqual(emptyProfile());
    expect(sanitizeProfile({ version: 2, runs: 9 })).toEqual(emptyProfile());
    expect(sanitizeProfile({ version: 1, cleared: [5, 'over-easy', 1, 9], best: { 1: -1, 5: 'x' }, runs: 3, wins: 7 })).toEqual({ version: 1, cleared: [1, 5], best: { 1: -1 }, runs: 3, wins: 3 });
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(loadProfile(blocked)).toEqual(emptyProfile());
    expect(fileToProfile(blocked, { tier: 0, points: 4, asked: 4, actionsUsed: 8, par: 8 }).won).toBe(true);
  });

  it('clears a tier on its first full-credit report, keeps the best par delta, and says so once', () => {
    let p = emptyProfile();
    let o = recordRun(p, { tier: 1, points: 3, asked: 4, actionsUsed: 9, par: 9 });
    expect(o).toMatchObject({ won: false, firstClear: null });
    p = o.profile;
    o = recordRun(p, { tier: 1, points: 4, asked: 4, actionsUsed: 11, par: 9 });
    expect(o).toMatchObject({ won: true, firstClear: 1 });
    p = o.profile;
    o = recordRun(p, { tier: 1, points: 4, asked: 4, actionsUsed: 8, par: 9 });
    expect(o.firstClear).toBeNull();
    expect(o.profile).toMatchObject({ cleared: [1], best: { 1: -1 }, runs: 3, wins: 2 });
    expect(tierNewsLines({ cleared: 1, firstClear: true })).toEqual(['Coddled is cleared. **Poached is next.**']);
    expect(tierNewsLines({ cleared: 5, firstClear: true })).toEqual(['Hard-boiled is cleared, and that is the last of them.']);
    expect(tierNewsLines({ cleared: 1, firstClear: false })).toEqual([]);
  });

  it('teaches before the office until the first full-credit report: on the first night, and at Raw', () => {
    expect(teachOn({ runs: 0, wins: 0 }, 3)).toBe(true);
    expect(teachOn({ runs: 2, wins: 0 }, 0)).toBe(true);
    expect(teachOn({ runs: 2, wins: 0 }, 2)).toBe(false);
    expect(teachOn({ runs: 2, wins: 1 }, 0)).toBe(false);
  });
});
