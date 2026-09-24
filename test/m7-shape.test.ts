import { describe, expect, it } from 'vitest';
import {
  BRANCH_COUNT,
  BRANCH_DEPTH,
  FINDABLE_TARGET,
  M_LIARS,
  NOISE_RATIO,
  PAR_CEILING,
  PAR_FLOOR,
  SLACK,
  checkSolvability,
  generateCase,
  type CaseType,
} from '../src/gen/index.js';
import {
  BEAT,
  CAMPAIGN,
  DAS_OFFICE,
  HARD_BOILED,
  LADDERS,
  LEGACY_LADDERS,
  OVER_EASY,
  RAW,
  TIERS,
  dialsOf,
  resolveDials,
  slackFor,
  unknownsFor,
  type Level,
} from '../src/gen/shape.js';
import { TROPE_BY_ID } from '../src/gen/tropes/index.js';
import { buildView } from '../src/game/derive.js';
import { newRun } from '../src/game/reducer.js';
import { deserializeRun, serializeRun } from '../src/game/storage.js';
import { renderTruthSheet } from '../src/sheet/truthSheet.js';
import { parseTierLevel } from '../src/cli/args.js';

describe('M7: the presets', () => {
  it('names the campaign in order, egg by egg, with Over easy after it', () => {
    expect(CAMPAIGN.map((s) => s.name)).toEqual([
      'Raw',
      'Coddled',
      'Poached',
      'Soft-boiled',
      'Medium',
      'Hard-boiled',
    ]);
    expect(CAMPAIGN.map((s) => s.tier)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(TIERS['over-easy']).toBe(OVER_EASY);
    expect(Object.values(LADDERS).map((l) => l.name)).toEqual([
      'Beat',
      'Precinct',
      'Homicide',
      'The DA’s Office',
    ]);
  });

  it('grows the case tier by tier, one idea at a time', () => {
    for (let i = 1; i < CAMPAIGN.length; i++) {
      const a = CAMPAIGN[i - 1]!;
      const b = CAMPAIGN[i]!;
      expect(b.suspects).toBeGreaterThanOrEqual(a.suspects);
      expect(b.innocentSecrets).toBeGreaterThanOrEqual(a.innocentSecrets);
      expect(b.par[0]).toBeGreaterThanOrEqual(a.par[0]);
      expect(b.reportFields.length).toBeGreaterThanOrEqual(a.reportFields.length);
      expect(b.caseTypes.length).toBeGreaterThanOrEqual(a.caseTypes.length);
      expect(b.tropes.length).toBeGreaterThanOrEqual(a.tropes.length);
    }
    expect(RAW.reportFields).toEqual(['who']);
    expect(TIERS[1].reportFields).toEqual(['who', 'how']);
    expect(TIERS[2].innocentSecrets).toBe(1);
    expect(TIERS[3].coronerWidth).toBe(2);
    expect(TIERS[3].anchorsRequired).toBe(1);
    // M14 §1.5: every tier deals every case type, the mundane three included.
    for (const s of CAMPAIGN) expect(s.caseTypes).toEqual(['murder', 'robbery', 'missing', 'lost-pet', 'lost-item', 'affair']);
    expect(HARD_BOILED.clientMayBeCulprit).toBe(true);
    for (const s of CAMPAIGN.slice(0, 5)) expect(s.clientMayBeCulprit).toBe(false);
    // Raw through Poached deal only the murders with the body at the scene;
    // Soft-boiled opens every murder trope. `left` waits for Medium, whose
    // report asks where and why, since it never asks who.
    const murders = (s: (typeof CAMPAIGN)[number]) => s.tropes.filter((t) => TROPE_BY_ID[t]?.type === 'murder');
    for (const s of CAMPAIGN.slice(0, 3)) expect(murders(s)).toEqual(['body-at-scene']);
    expect(murders(TIERS[3]).length).toBe(4);
    for (const s of CAMPAIGN.slice(0, 4)) expect(s.tropes).not.toContain('left');
  });

  it('spreads the noise across the ladder and ends single-route', () => {
    const mids = Object.values(LADDERS).map((l) => (l.noiseRatio[0] + l.noiseRatio[1]) / 2);
    for (let i = 1; i < mids.length; i++) expect(mids[i]).toBeGreaterThan(mids[i - 1]!);
    expect(Object.values(LADDERS).map((l) => l.slack)).toEqual([8, 6, 4, 3]);
    expect(DAS_OFFICE.corroboration).toBe('single');
    expect(DAS_OFFICE.noiseRatio[0]).toBeGreaterThan(0.5);
  });

  it('keeps Hard-boiled and the legacy ladders exactly today’s dials', () => {
    expect(HARD_BOILED.suspects).toBe(6);
    expect(HARD_BOILED.places).toBe(6);
    expect(HARD_BOILED.par).toEqual([PAR_FLOOR, PAR_CEILING]);
    expect(HARD_BOILED.findable).toBe(FINDABLE_TARGET);
    for (const d of [1, 2, 3] as const) {
      const l = LEGACY_LADDERS[d];
      expect(l.legacy).toBe(true);
      expect(l.slack).toBe(SLACK[d]);
      expect(l.noiseRatio).toEqual(NOISE_RATIO);
      expect(l.branchDepth).toEqual(BRANCH_DEPTH[d]);
      expect(l.branchCount).toBe(BRANCH_COUNT[d]);
      expect(l.liars).toEqual(M_LIARS[d]);
      expect(l.corroboration).toBe('bigFive');
    }
    expect(LEGACY_LADDERS[4]).toBe(DAS_OFFICE);
  });
});

describe('M7: resolving options into dials', () => {
  it('is today’s case with no options, and Hard-boiled at the DA’s Office at difficulty 4', () => {
    const plain = resolveDials();
    expect(plain.plain).toBe(true);
    expect(plain.shape).toBe(HARD_BOILED);
    expect(plain.ladder).toBe(LEGACY_LADDERS[2]);
    expect(resolveDials({ difficulty: 3 }).ladder).toBe(LEGACY_LADDERS[3]);
    const da = resolveDials({ difficulty: 4 });
    expect(da.ladder).toBe(DAS_OFFICE);
    expect(da.difficulty).toBe(4);
  });

  it('reads a tier alone at Precinct and a level alone as Hard-boiled on the M7 ladder', () => {
    expect(resolveDials({ tier: 3 }).ladder).toBe(LADDERS[2]);
    expect(resolveDials({ tier: 3, difficulty: 3 }).ladder).toBe(LADDERS[3]);
    const lvl = resolveDials({ level: 3 });
    expect(lvl.shape).toBe(HARD_BOILED);
    expect(lvl.ladder).toBe(LADDERS[3]);
    expect(lvl.plain).toBe(false);
    expect(resolveDials({ shape: TIERS[2], ladder: LADDERS[4] }).ladder).toBe(LADDERS[4]);
  });

  it('plays Raw at Beat whatever level is asked for', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      expect(resolveDials({ tier: 0, level }).ladder).toBe(BEAT);
      expect(resolveDials({ shape: RAW, ladder: LADDERS[level] }).ladder).toBe(BEAT);
    }
    for (const seed of [1, 2, 3, 17, 40]) {
      const beat = JSON.stringify(generateCase(seed, { tier: 0, level: 1 }));
      for (const level of [2, 3, 4] as Level[]) {
        const c = generateCase(seed, { tier: 0, level });
        expect(c.difficulty).toBe(1);
        expect(c.ladder?.name).toBe('Beat');
        expect(JSON.stringify(c)).toBe(beat);
      }
    }
  });

  it('reads the dials back off a finished case', () => {
    const tiered = generateCase(3, { tier: 2, level: 3 });
    expect(dialsOf(tiered).shape.name).toBe('Poached');
    expect(dialsOf(tiered).ladder.name).toBe('Homicide');
    const plain = generateCase(3, { difficulty: 1 });
    expect(plain.shape).toBeUndefined();
    expect(plain.ladder).toBeUndefined();
    expect(dialsOf(plain).ladder).toBe(LEGACY_LADDERS[1]);
  });

  it('refuses a trope the tier does not deal', () => {
    // M14: every tier deals every type now, but `left` still waits for Medium,
    // and the moved body for Soft-boiled.
    expect(() => generateCase(1, { tier: 0, tropeId: 'left' })).toThrow();
    expect(() => generateCase(1, { tier: 2, tropeId: 'body-moved' })).toThrow();
  });
});

describe('M7: slack at small tiers', () => {
  it('scales with par below Medium, never below three', () => {
    expect(slackFor(RAW, BEAT, 4)).toBe(3);
    expect(slackFor(RAW, BEAT, 5)).toBe(3);
    expect(slackFor(TIERS[3], BEAT, 8)).toBe(5);
    expect(slackFor(TIERS[3], LADDERS[4], 8)).toBe(3);
    expect(slackFor(TIERS[2], LADDERS[2], 7)).toBe(4);
    expect(slackFor(TIERS[4], BEAT, 10)).toBe(8);
    expect(slackFor(HARD_BOILED, LADDERS[3], 12)).toBe(4);
  });
});

describe('M7: the report asks the tier’s questions', () => {
  it('puts the tier’s ceiling over the trope’s unknowns', () => {
    const bas = TROPE_BY_ID['body-at-scene']!.unknowns;
    expect(unknownsFor(RAW, 'murder', bas)).toEqual(['who']);
    expect(unknownsFor(TIERS[1], 'murder', bas)).toEqual(['who', 'how']);
    expect(unknownsFor(TIERS[4], 'murder', bas)).toEqual(['who', 'how', 'why', 'when']);
    // Hard-boiled is today's report: the method is a given.
    expect(unknownsFor(HARD_BOILED, 'murder', bas)).toEqual(bas);
    const locked = TROPE_BY_ID['locked-room']!.unknowns;
    expect(unknownsFor(TIERS[3], 'murder', locked)).toEqual(['who', 'how', 'entry']);
  });

  it('asks at least one question for every case type and trope each tier deals', () => {
    for (const shape of [...CAMPAIGN, OVER_EASY]) {
      const types = new Set<CaseType>();
      for (const tropeId of shape.tropes) {
        for (const seed of [1, 2, 3]) {
          const tier = shape.tier as 0 | 1 | 2 | 3 | 4 | 5 | 'over-easy';
          const c = generateCase(seed, { tier, level: 2, tropeId });
          expect(c.act.unknowns.length, `${shape.name} ${tropeId}`).toBeGreaterThan(0);
          types.add(c.act.type);
        }
      }
      expect([...types].sort()).toEqual(shape.caseTypes.slice().sort());
    }
  });

  it('never names the method in the givens where the report asks how', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      // M14: a murder, which is the case type the method belongs to.
      const c = generateCase(seed, { tier: 1, level: 2, type: 'murder' });
      expect(c.act.unknowns).toContain('how');
      expect(c.act.givens.text.some((t) => t.includes(c.method.name))).toBe(false);
      expect(c.act.givens.facts.some((f) => f.kind === 'methodEvidence')).toBe(false);
      const raw = generateCase(seed, { tier: 0, type: 'murder' });
      expect(raw.act.givens.text.some((t) => t.includes(raw.method.name))).toBe(true);
    }
  });
});

describe('M7: difficulty 4 with no options', () => {
  it('is Hard-boiled at the DA’s Office, solvable and single-route', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const c = generateCase(seed, { difficulty: 4 });
      expect(c.difficulty).toBe(4);
      expect(c.shape).toBeUndefined();
      const { deduction: _d, ...rest } = c;
      expect(checkSolvability(rest).failures).toEqual([]);
      expect(c.slack).toBe(3);
      const noise = c.findable.filter((x) => x.role === 'noise' || x.role === 'disqualifier');
      expect(noise.length / c.findable.length).toBeGreaterThanOrEqual(DAS_OFFICE.noiseRatio[0]);
    }
  });

  it('survives a save and a reload', () => {
    const state = newRun(buildView(generateCase(5, { difficulty: 4 })), { detectiveName: 'Dashiell' });
    expect(state.difficulty).toBe(4);
    expect(deserializeRun(serializeRun(state))).toEqual(state);
  });
});

describe('M7: reading the shape', () => {
  it('puts the tier, the level and the dials in the truth sheet’s header', () => {
    const sheet = renderTruthSheet(generateCase(2, { tier: 1, level: 3 }));
    expect(sheet).toContain('**Tier** 1 Coddled');
    expect(sheet).toContain('**Level** 3 Homicide');
    expect(sheet).toContain('Coddled (4 suspects, 4 places');
    const plain = renderTruthSheet(generateCase(2));
    expect(plain).toContain('**Tier** 5 Hard-boiled');
    expect(plain).toContain('pre-M7 dials');
  });

  it('lists the loose ends where a tier has too few secrets for its noise', () => {
    const sheet = renderTruthSheet(generateCase(1, { tier: 0 }));
    expect(sheet).toContain('**Loose ends');
  });

  it('parses --tier and --level, and refuses what the game does not have', () => {
    const v = (pairs: [string, string][]) => new Map(pairs);
    expect(parseTierLevel(v([]))).toEqual({});
    expect(parseTierLevel(v([['tier', '0']]))).toEqual({ tier: 0 });
    expect(parseTierLevel(v([['tier', 'over-easy'], ['level', '4']]))).toEqual({
      tier: 'over-easy',
      level: 4,
    });
    expect(parseTierLevel(v([['tier', '6']]))).toBeNull();
    expect(parseTierLevel(v([['level', '5']]))).toBeNull();
  });
});
