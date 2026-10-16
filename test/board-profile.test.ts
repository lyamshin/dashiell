/**
 * The profile, on the board alone: reports filed, full credit, tiers cleared.
 * A profile the engines before the board wrote (`dashiell:profile`, with its
 * Over easy and its levels) is never read.
 */
import { describe, expect, it } from 'vitest';
import { clearsAt, emptyProfile, fileToProfile, loadProfile, PROFILE_KEY, recordRun, sanitizeProfile, teachOn, tierOpen, tonightTier, type KeyValueStore, type Profile } from '../src/game/board/profile.js';
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

describe('board: the tier the title page chooses', () => {
  const win = (p: Profile, tier: 0 | 1 | 2 | 3 | 4 | 5): Profile => recordRun(p, { tier, points: 3, asked: 3, actionsUsed: 8, par: 8 }).profile;
  const lose = (p: Profile, tier: 0 | 1 | 2 | 3 | 4 | 5): Profile => recordRun(p, { tier, points: 1, asked: 3, actionsUsed: 8, par: 8 }).profile;

  it('opens Raw on a first visit, and on a profile with nothing cleared', () => {
    expect(tonightTier(emptyProfile())).toBe(0);
    expect(tonightTier(lose(lose(emptyProfile(), 0), 2))).toBe(0);
    expect(tierOpen(emptyProfile(), 0)).toBe(true);
    expect(tierOpen(emptyProfile(), 1)).toBe(false);
  });

  it('stays on the highest tier cleared until it is cleared twice, then moves up one', () => {
    let p = win(emptyProfile(), 0);
    expect(tonightTier(p)).toBe(0);
    expect(tierOpen(p, 1)).toBe(true);
    expect(tierOpen(p, 2)).toBe(false);
    p = lose(p, 0);
    expect(tonightTier(p)).toBe(0);
    p = win(p, 0);
    expect(clearsAt(p, 0)).toBe(2);
    expect(tonightTier(p)).toBe(1);
    // A loss at the new tier keeps the player on it; one clear there makes it the highest, cleared once.
    p = lose(p, 1);
    expect(tonightTier(p)).toBe(1);
    p = win(p, 1);
    expect(tonightTier(p)).toBe(1);
    p = win(p, 1);
    expect(tonightTier(p)).toBe(2);
  });

  it('goes by the highest tier cleared, whatever was cleared under it', () => {
    let p = win(win(emptyProfile(), 0), 0);
    p = win(p, 3);
    expect(tonightTier(p)).toBe(3);
    expect(tierOpen(p, 4)).toBe(true);
    expect(tierOpen(p, 5)).toBe(false);
    expect(tonightTier(win(p, 3))).toBe(4);
  });

  it('stops at Hard-boiled', () => {
    const p = win(win(win(emptyProfile(), 5), 5), 5);
    expect(clearsAt(p, 5)).toBe(3);
    expect(tonightTier(p)).toBe(5);
  });

  it('counts a tier cleared on a profile from before the count as cleared once', () => {
    const old = sanitizeProfile({ version: 1, cleared: [0, 1], best: {}, runs: 5, wins: 4 });
    expect(old.clears).toBeUndefined();
    expect(clearsAt(old, 1)).toBe(1);
    expect(tonightTier(old)).toBe(1);
    expect(tonightTier(win(old, 1))).toBe(2);
    // The count survives the store, and a count for a tier not cleared is dropped.
    expect(sanitizeProfile({ version: 1, cleared: [0], best: {}, runs: 3, wins: 2, clears: { 0: 2, 3: 4, 1: 'x' } }).clears).toEqual({ 0: 2 });
  });
});
