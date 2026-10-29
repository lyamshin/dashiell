/**
 * The profile, on the board alone: reports filed, full credit, tiers cleared, and (docs/77) the tiers
 * where the right culprit was named, which move tonight's case on.
 * A profile the engines before the board wrote (`dashiell:profile`, with its
 * Over easy and its levels) is never read.
 */
import { describe, expect, it } from 'vitest';
import { clearsAt, emptyProfile, fileToProfile, loadProfile, PROFILE_KEY, recordRun, sanitizeProfile, teachOn, tonightTier, type KeyValueStore, type Profile } from '../src/game/board/profile.js';
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

  it('clears a tier on its first full-credit report, and keeps the best par delta', () => {
    let p = emptyProfile();
    let o = recordRun(p, { tier: 1, points: 3, asked: 4, actionsUsed: 9, par: 9 });
    expect(o).toMatchObject({ won: false, news: null });
    p = o.profile;
    o = recordRun(p, { tier: 1, points: 4, asked: 4, actionsUsed: 11, par: 9 });
    expect(o).toMatchObject({ won: true, news: { done: 1, next: 2 } });
    p = o.profile;
    o = recordRun(p, { tier: 1, points: 4, asked: 4, actionsUsed: 8, par: 9 });
    expect(o.news).toBeNull();
    expect(o.profile).toMatchObject({ cleared: [1], named: [1], best: { 1: -1 }, runs: 3, wins: 2 });
  });

  it('docs/77: the right culprit moves tonight on, perfect or not, and the verdict says so once', () => {
    let o = recordRun(emptyProfile(), { tier: 0, points: 3.5, asked: 4, actionsUsed: 9, par: 9, culprit: true });
    expect(o).toMatchObject({ won: false, news: { done: 0, next: 1 } });
    expect(o.profile.cleared).toEqual([]);
    expect(o.profile.named).toEqual([0]);
    // Again at Raw: nothing new to say. The wrong culprit at Coddled: nothing either.
    o = recordRun(o.profile, { tier: 0, points: 2, asked: 4, actionsUsed: 9, par: 9, culprit: true });
    expect(o.news).toBeNull();
    o = recordRun(o.profile, { tier: 1, points: 2, asked: 4, actionsUsed: 9, par: 9, culprit: false });
    expect(o.news).toBeNull();
    expect(o.profile.named).toEqual([0]);
    expect(tierNewsLines({ done: 1, next: 2 })).toEqual(['Coddled is cleared. **Poached is next.**']);
    expect(tierNewsLines({ done: 5, next: null })).toEqual(['Hard-boiled is cleared, and that is the last of them.']);
    // The tiers named survive the store; nonsense in it is dropped.
    expect(sanitizeProfile({ version: 1, cleared: [], best: {}, runs: 2, wins: 0, named: [3, 'x', 0, 9] }).named).toEqual([0, 3]);
  });

  it('teaches before the office until the first full-credit report: on the first night, and at Raw', () => {
    expect(teachOn({ runs: 0, wins: 0 }, 3)).toBe(true);
    expect(teachOn({ runs: 2, wins: 0 }, 0)).toBe(true);
    expect(teachOn({ runs: 2, wins: 0 }, 2)).toBe(false);
    expect(teachOn({ runs: 2, wins: 1 }, 0)).toBe(false);
  });

});

describe('board: the tier the title page suggests (docs/77: every tier is open)', () => {
  const win = (p: Profile, tier: 0 | 1 | 2 | 3 | 4 | 5): Profile => recordRun(p, { tier, points: 3, asked: 3, actionsUsed: 8, par: 8 }).profile;
  const named = (p: Profile, tier: 0 | 1 | 2 | 3 | 4 | 5): Profile => recordRun(p, { tier, points: 2, asked: 3, actionsUsed: 8, par: 8, culprit: true }).profile;
  const lose = (p: Profile, tier: 0 | 1 | 2 | 3 | 4 | 5): Profile => recordRun(p, { tier, points: 1, asked: 3, actionsUsed: 8, par: 8 }).profile;

  it('suggests Raw on a first visit, and until the right culprit is named', () => {
    expect(tonightTier(emptyProfile())).toBe(0);
    expect(tonightTier(lose(lose(emptyProfile(), 0), 2))).toBe(0);
  });

  it('moves up one on the right culprit at the highest tier so far, perfect or not', () => {
    let p = named(emptyProfile(), 0);
    expect(tonightTier(p)).toBe(1);
    p = lose(p, 1);
    expect(tonightTier(p)).toBe(1);
    p = win(p, 1);
    expect(tonightTier(p)).toBe(2);
    // The right culprit lower down doesn't move it back.
    expect(tonightTier(named(p, 0))).toBe(2);
  });

  it('goes by the highest tier named, whatever came under it', () => {
    const p = named(win(emptyProfile(), 0), 3);
    expect(tonightTier(p)).toBe(4);
  });

  it('stops at Hard-boiled', () => {
    expect(tonightTier(named(emptyProfile(), 5))).toBe(5);
    expect(tonightTier(win(win(emptyProfile(), 4), 5))).toBe(5);
  });

  it('counts the tiers a profile from before cleared, and their counts still make the stars', () => {
    const old = sanitizeProfile({ version: 1, cleared: [0, 1], best: {}, runs: 5, wins: 4 });
    expect(old.clears).toBeUndefined();
    expect(old.named).toBeUndefined();
    expect(clearsAt(old, 1)).toBe(1);
    expect(tonightTier(old)).toBe(2);
    // The count survives the store, and a count for a tier not cleared is dropped.
    expect(sanitizeProfile({ version: 1, cleared: [0], best: {}, runs: 3, wins: 2, clears: { 0: 2, 3: 4, 1: 'x' } }).clears).toEqual({ 0: 2 });
  });
});
