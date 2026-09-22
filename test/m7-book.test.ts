/**
 * M7, the book half: the profile, the tier in the save, the URL, the title
 * page's rules and the closing page's news. Pure: no DOM.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { CAMPAIGN, FIELD_OF, TIERS, type Level } from '../src/gen/shape.js';
import { buildView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import {
  caseOptions,
  emptyProfile,
  fileToProfile,
  isUnlocked,
  levelFor,
  loadProfile,
  lockedTiers,
  paramsForPick,
  pickFromParams,
  pickOfRun,
  PROFILE_KEY,
  recordRun,
  runMatches,
  sanitizeProfile,
  saveProfile,
  unlockedTiers,
  withCurrent,
  type Profile,
  type TierKey,
} from '../src/game/profile.js';
import { fileReport, newRun, stepInput } from '../src/game/reducer.js';
import { fieldsFor, truthReport } from '../src/game/report-form.js';
import { scoreReport } from '../src/game/scoring.js';
import { deserializeRun, loadRun, saveRun, serializeRun, type KeyValueStore } from '../src/game/storage.js';
import { tierNewsLines } from '../src/ui/report.js';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

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

const clean = (tier: TierKey | undefined, level: Level, over = 0) => ({
  ...(tier === undefined ? {} : { tier }),
  level,
  points: 3,
  asked: 3,
  actionsUsed: 6 + over,
  par: 6,
});

const hash = (x: unknown): string => JSON.stringify(x);

/* ------------------------------------------------------------ profile */

describe('the profile', () => {
  it('starts a new player at Raw, at Beat, with only Raw open', () => {
    const p = emptyProfile();
    expect(p.current).toEqual({ tier: 0, level: 1 });
    expect(unlockedTiers(p)).toEqual([0]);
    expect(lockedTiers(p)).toEqual([1, 2, 3, 4, 5]);
    expect(p.runs).toBe(0);
    expect(p.wins).toBe(0);
  });

  it('clears a tier on a full-credit report and opens the next', () => {
    const out = recordRun(emptyProfile(), clean(0, 1, -1));
    expect(out.won).toBe(true);
    expect(out.firstClear).toBe(0);
    expect(out.unlocked).toBe(1);
    expect(out.profile.cleared).toEqual([0]);
    expect(out.profile.current.tier).toBe(1);
    expect(out.profile.runs).toBe(1);
    expect(out.profile.wins).toBe(1);
    expect(out.profile.best['0']).toEqual({ level: 1, parDelta: -1 });
    expect(isUnlocked(out.profile, 1)).toBe(true);
    expect(isUnlocked(out.profile, 2)).toBe(false);
  });

  it('does not clear on partial credit, and losing never locks anything', () => {
    let p = recordRun(emptyProfile(), clean(0, 1)).profile;
    const lost = recordRun(p, { tier: 1, level: 2, points: 1, asked: 2, actionsUsed: 9, par: 6 });
    expect(lost.won).toBe(false);
    expect(lost.unlocked).toBeNull();
    expect(lost.firstClear).toBeNull();
    expect(lost.profile.cleared).toEqual([0]);
    expect(lost.profile.runs).toBe(2);
    expect(lost.profile.wins).toBe(1);
    p = lost.profile;
    expect(unlockedTiers(p)).toEqual([0, 1]);
    // A wrong man at Raw, after Raw was cleared, takes nothing back.
    p = recordRun(p, { tier: 0, level: 1, points: 0, asked: 1, actionsUsed: 5, par: 5 }).profile;
    expect(unlockedTiers(p)).toEqual([0, 1]);
  });

  it('clears at any level, and keeps the best level and the best par delta apart', () => {
    let p = recordRun(emptyProfile(), clean(0, 1)).profile;
    p = recordRun(p, clean(1, 4, 2)).profile; // cleared at the DA's Office, two over
    expect(p.cleared).toEqual([0, 1]);
    p = recordRun(p, clean(1, 1, -1)).profile; // again at Beat, one under
    expect(p.best['1']).toEqual({ level: 4, parDelta: -1 });
    p = recordRun(p, clean(1, 2, 3)).profile;
    expect(p.best['1']).toEqual({ level: 4, parDelta: -1 });
  });

  it('a second clear of the same tier opens nothing and is not a first clear', () => {
    const once = recordRun(emptyProfile(), clean(0, 1)).profile;
    const twice = recordRun(once, clean(0, 1));
    expect(twice.firstClear).toBeNull();
    expect(twice.unlocked).toBeNull();
    expect(twice.profile.wins).toBe(2);
    // The title page stays wherever the player last left it.
    expect(twice.profile.current).toEqual(once.current);
  });

  it('Raw is recorded at Beat whatever level was asked for', () => {
    const out = recordRun(emptyProfile(), clean(0, 3));
    expect(out.profile.best['0']?.level).toBe(1);
    expect(levelFor(0, 4)).toBe(1);
    expect(levelFor(1, 4)).toBe(4);
  });

  it('clearing Hard-boiled opens Over easy, which is never listed as locked', () => {
    let p = emptyProfile();
    for (const t of [0, 1, 2, 3, 4] as TierKey[]) p = recordRun(p, clean(t, 2)).profile;
    expect(isUnlocked(p, 5)).toBe(true);
    expect(isUnlocked(p, 'over-easy')).toBe(false);
    expect(lockedTiers(p)).toEqual([]);
    const out = recordRun(p, clean(5, 2));
    expect(out.unlocked).toBe('over-easy');
    expect(out.profile.current.tier).toBe('over-easy');
    expect(unlockedTiers(out.profile)).toContain('over-easy');
    const after = recordRun(out.profile, clean('over-easy', 3));
    expect(after.firstClear).toBe('over-easy');
    expect(after.unlocked).toBeNull();
  });

  it('an untiered case counts as a run and a win and clears nothing', () => {
    const out = recordRun(emptyProfile(), clean(undefined, 2));
    expect(out.won).toBe(true);
    expect(out.profile.runs).toBe(1);
    expect(out.profile.wins).toBe(1);
    expect(out.profile.cleared).toEqual([]);
    expect(out.unlocked).toBeNull();
  });

  it('a report that asked nothing is not a win', () => {
    const out = recordRun(emptyProfile(), { tier: 0, level: 1, points: 0, asked: 0, actionsUsed: 3, par: 5 });
    expect(out.won).toBe(false);
    expect(out.profile.cleared).toEqual([]);
  });

  it('a link straight to a later tier opens everything up to the next one', () => {
    const out = recordRun(emptyProfile(), clean(3, 2));
    expect(unlockedTiers(out.profile)).toEqual([0, 1, 2, 3, 4]);
    expect(out.unlocked).toBe(4);
  });

  it('remembers the title page choice, but never a locked tier, and Raw keeps the level', () => {
    let p = recordRun(emptyProfile(), clean(0, 1)).profile;
    p = withCurrent(p, 1, 3);
    expect(p.current).toEqual({ tier: 1, level: 3 });
    expect(withCurrent(p, 4, 2)).toBe(p);
    p = withCurrent(p, 0, 4);
    expect(p.current).toEqual({ tier: 0, level: 3 });
  });
});

describe('the profile in storage', () => {
  it('round-trips through a store', () => {
    const store = memoryStore();
    const out = fileToProfile(store, clean(0, 1));
    expect(out.unlocked).toBe(1);
    expect(store.data.has(PROFILE_KEY)).toBe(true);
    expect(loadProfile(store)).toEqual(out.profile);
  });

  it('plays on with blocked storage: loads empty, saves nothing, never throws', () => {
    expect(loadProfile(hostile)).toEqual(emptyProfile());
    expect(() => saveProfile(hostile, emptyProfile())).not.toThrow();
    const out = fileToProfile(hostile, clean(0, 1));
    expect(out.unlocked).toBe(1);
  });

  it('takes rubbish and keeps only what makes sense', () => {
    const store = memoryStore();
    store.setItem(PROFILE_KEY, 'not json');
    expect(loadProfile(store)).toEqual(emptyProfile());
    store.setItem(PROFILE_KEY, '[1,2]');
    expect(loadProfile(store)).toEqual(emptyProfile());
    const odd = sanitizeProfile({
      cleared: [0, 'seven', 9, 1, 0],
      best: { '0': { level: 2, parDelta: -1 }, '1': { level: 9, parDelta: 0 }, '4': { level: 1, parDelta: 0 } },
      runs: 3,
      wins: 12,
      current: { tier: 5, level: 3 },
    });
    expect(odd.cleared).toEqual([0, 1]);
    expect(odd.best).toEqual({ '0': { level: 2, parDelta: -1 } });
    expect(odd.wins).toBe(3);
    // Tier 5 is not open with only Raw and Coddled cleared.
    expect(odd.current).toEqual({ tier: 0, level: 3 });
  });
});

/* ---------------------------------------------------------------- URL */

describe('the URL', () => {
  const read = (q: string) => pickFromParams(new URLSearchParams(q));

  it('an old link opens the untiered case it always did', () => {
    expect(read('?seed=3&d=2')).toEqual({ seed: 3, pick: { level: 2 } });
    expect(read('?seed=3')).toEqual({ seed: 3, pick: { level: 2 } });
    expect(read('?seed=3&d=9')).toEqual({ seed: 3, pick: { level: 2 } });
    expect(read('?seed=3&d=4')).toEqual({ seed: 3, pick: { level: 4 } });
    expect(read('')).toEqual({ seed: null, pick: { level: 2 } });
  });

  it('t= makes it a tier; Raw is always Beat; a bad tier is ignored', () => {
    expect(read('?seed=3&d=2&t=1')).toEqual({ seed: 3, pick: { tier: 1, level: 2 } });
    expect(read('?seed=3&d=3&t=0')).toEqual({ seed: 3, pick: { tier: 0, level: 1 } });
    expect(read('?seed=3&d=4&t=over-easy')).toEqual({ seed: 3, pick: { tier: 'over-easy', level: 4 } });
    expect(read('?seed=3&d=2&t=custom')).toEqual({ seed: 3, pick: { level: 2 } });
    expect(read('?seed=3&d=2&t=')).toEqual({ seed: 3, pick: { level: 2 } });
    expect(read('?seed=3&d=2&t=7')).toEqual({ seed: 3, pick: { level: 2 } });
  });

  it('writes what it reads, with the level actually played', () => {
    expect(paramsForPick(3, { level: 2 })).toBe('?seed=3&d=2');
    expect(paramsForPick(3, { tier: 0, level: 4 })).toBe('?seed=3&d=1&t=0');
    expect(paramsForPick(3, { tier: 'over-easy', level: 3 })).toBe('?seed=3&d=3&t=over-easy');
    for (const pick of [{ level: 3 as Level }, { tier: 2 as TierKey, level: 4 as Level }]) {
      expect(read(paramsForPick(11, pick))).toEqual({ seed: 11, pick });
    }
  });

  it('an untiered pick deals exactly the case the old link dealt', () => {
    for (const d of [1, 2, 3] as Level[]) {
      expect(hash(generateCase(5, caseOptions({ level: d })))).toBe(hash(generateCase(5, { difficulty: d })));
    }
  });

  it('Raw asked for at any level plays at Beat', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      const kase = generateCase(4, caseOptions({ tier: 0, level }));
      expect(kase.difficulty).toBe(1);
      expect(kase.ladder?.name).toBe('Beat');
      expect(kase.shape?.name).toBe('Raw');
    }
  });
});

/* ------------------------------------------------------------- resume */

describe('resuming a run', () => {
  it('a tiered run saves its tier and level and deals the same case again', () => {
    const kase = generateCase(9, caseOptions({ tier: 2, level: 3 }));
    const view = buildView(kase);
    let state = newRun(view, { detectiveName: 'Spade' });
    expect(state.tier).toBe(2);
    expect(state.level).toBe(3);
    state = stepInput(state, `go ${view.placeById.get(view.startId)?.shortName}`, view).state;

    const store = memoryStore();
    saveRun(store, state);
    const back = loadRun(store);
    expect(back).toEqual(state);
    if (!back) throw new Error('no save');
    const pick = pickOfRun(back);
    expect(pick).toEqual({ tier: 2, level: 3 });
    expect(hash(generateCase(back.seed, caseOptions(pick)))).toBe(hash(kase));
    // The untiered case on the same seed and level is a different case.
    expect(hash(generateCase(back.seed, { difficulty: 3 }))).not.toBe(hash(kase));
    expect(runMatches(back, 9, { tier: 2, level: 3 })).toBe(true);
    expect(runMatches(back, 9, { level: 3 })).toBe(false);
    expect(runMatches(back, 9, { tier: 1, level: 3 })).toBe(false);
    expect(runMatches(back, 9, { tier: 2, level: 2 })).toBe(false);
    expect(runMatches(back, 8, { tier: 2, level: 3 })).toBe(false);
  });

  it('a Raw run resumes whatever level the link asks for, since Raw is always Beat', () => {
    const view = buildView(generateCase(2, caseOptions({ tier: 0, level: 1 })));
    const state = newRun(view, { detectiveName: 'Dashiell' });
    expect(state.level).toBe(1);
    expect(runMatches(state, 2, { tier: 0, level: 3 })).toBe(true);
  });

  it('an untiered run carries no tier', () => {
    const view = buildView(generateCase(6, { difficulty: 2 }));
    const state = newRun(view, { detectiveName: 'Dashiell' });
    expect('tier' in state).toBe(false);
    expect('level' in state).toBe(false);
    expect(pickOfRun(state)).toEqual({ level: 2 });
    expect(runMatches(state, 6, { level: 2 })).toBe(true);
    expect(runMatches(state, 6, { tier: 5, level: 2 })).toBe(false);
  });

  it('a save from before tiers loads as the untiered case it was', () => {
    const kase = generateCase(12, { difficulty: 1 });
    const view = buildView(kase);
    const state = stepInput(newRun(view, { detectiveName: 'Dashiell' }), 'look', view).state;
    // Written by the old code: no tier, no level.
    const old = JSON.parse(serializeRun(state)) as Record<string, unknown>;
    delete old.tier;
    delete old.level;
    const back = deserializeRun(JSON.stringify(old));
    expect(back).not.toBeNull();
    if (!back) throw new Error('no save');
    expect(back.tier).toBeUndefined();
    expect(pickOfRun(back)).toEqual({ level: 1 });
    expect(hash(generateCase(back.seed, caseOptions(pickOfRun(back))))).toBe(hash(kase));
    expect(runMatches(back, 12, { level: 1 })).toBe(true);
    expect(runMatches(back, 12, { tier: 5, level: 1 })).toBe(false);
  });

  it('a save with a tier that is not one is not a save', () => {
    const view = buildView(generateCase(3, caseOptions({ tier: 1, level: 2 })));
    const state = JSON.parse(serializeRun(newRun(view, { detectiveName: 'D' }))) as Record<string, unknown>;
    expect(deserializeRun(JSON.stringify({ ...state, tier: 'custom' }))).toBeNull();
    expect(deserializeRun(JSON.stringify({ ...state, tier: 9 }))).toBeNull();
    expect(deserializeRun(JSON.stringify({ ...state, level: 7 }))).toBeNull();
    expect(deserializeRun(JSON.stringify(state))).not.toBeNull();
  });
});

/* ------------------------------------------------------------ the page */

describe('the title page and the closing page', () => {
  it('every tier has one rule line, "This time: …", and no two are the same', () => {
    const rules = [...CAMPAIGN, TIERS['over-easy']].map((s) => s.rule);
    for (const r of rules) {
      expect(r.startsWith('This time: ')).toBe(true);
      expect(r.endsWith('.')).toBe(true);
    }
    expect(new Set(rules).size).toBe(rules.length);
  });

  it('only Raw has no difficulty choice', () => {
    expect(TIERS[0].lockedLevel).toBe(1);
    for (const s of [...CAMPAIGN.slice(1), TIERS['over-easy']]) expect(s.lockedLevel).toBeUndefined();
  });

  it('the closing page says what opened', () => {
    const raw = tierNewsLines({ cleared: 0, firstClear: true, unlocked: 1 });
    expect(raw[0]).toBe('Raw is cleared. **Coddled is open now.**');
    expect(raw[1]).toBe(TIERS[1].rule);
    const top = tierNewsLines({ cleared: 5, firstClear: true, unlocked: 'over-easy' });
    expect(top[0]).toContain('Over easy is open now');
    expect(tierNewsLines({ cleared: 'over-easy', firstClear: true, unlocked: null })).toEqual([
      'Over easy is cleared.',
    ]);
    expect(tierNewsLines({ cleared: 0, firstClear: false, unlocked: null })).toEqual([]);
  });
});

/* ------------------------------------------------------------- report */

describe('the report asks only what the case asks, at every tier', () => {
  const tiers: TierKey[] = [0, 1, 2, 3, 4, 5, 'over-easy'];
  for (const tier of tiers) {
    it(`${TIERS[tier].name}`, () => {
      const shape = TIERS[tier];
      const levels: Level[] = shape.lockedLevel !== undefined ? [shape.lockedLevel] : [1, 4];
      const seeds = tier === 'over-easy' ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
      for (const level of levels) {
        for (const seed of seeds) {
          const view = buildView(generateCase(seed, caseOptions({ tier, level })));
          const keys = fieldsFor(view).map((f) => f.key);
          const tag = `${shape.name} L${level} seed ${seed}`;
          expect(keys, tag).toEqual(view.kase.act.unknowns);
          expect(keys.length, tag).toBeGreaterThan(0);
          for (const k of keys) expect(shape.reportFields, `${tag} ${k}`).toContain(FIELD_OF[k]);
          if (tier === 0) expect(keys, tag).toEqual(['who']);
        }
      }
    });
  }
});

/* ------------------------------------------------------------ the loop */

describe('a Raw case, played and filed, opens Coddled', () => {
  it('the oracle clears Raw and the profile says so', () => {
    const store = memoryStore();
    let profile: Profile = loadProfile(store);
    expect(profile.current.tier).toBe(0);
    const pick = { tier: profile.current.tier, level: profile.current.level };
    const view = buildView(generateCase(1, caseOptions(pick)));
    const played = playOracle(view);
    expect(played.ok).toBe(true);
    const report = truthReport(view);
    const state = fileReport(played.state, report);
    const verdict = scoreReport(view, state, report);
    expect(verdict.points).toBe(verdict.asked);
    const out = fileToProfile(store, {
      ...(state.tier === undefined ? {} : { tier: state.tier }),
      level: state.level ?? state.difficulty,
      points: verdict.points,
      asked: verdict.asked,
      actionsUsed: verdict.actionsUsed,
      par: verdict.par,
    });
    expect(out.unlocked).toBe(1);
    profile = loadProfile(store);
    expect(unlockedTiers(profile)).toEqual([0, 1]);
    expect(profile.current).toEqual({ tier: 1, level: 1 });
    expect(profile.best['0']?.parDelta).toBeLessThanOrEqual(0);
  });
});
