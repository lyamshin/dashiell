/**
 * M7 test helpers: generate a tier at a level once, and hold every case the
 * spec's Tests section asks about to the same list of checks. Not a test file
 * itself; the four `m7-tier-*.test.ts` files split the tiers between them so
 * that vitest can run them side by side.
 */
import { expect, it } from 'vitest';
import {
  buildRequirements,
  checkSolvability,
  generateCase,
  requirementInputForCase,
  sourceKey,
  type Case,
  type Fact,
} from '../src/gen/index.js';
import { proofSpecOf } from '../src/gen/select.js';
import {
  FIELD_OF,
  LADDERS,
  TIERS,
  deductionOf,
  dialsOf,
  slackFor,
  logicSlackFor,
  type Level,
  type TierId,
} from '../src/gen/shape.js';
import { buildView, gamePar } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';

export type PresetTier = Exclude<TierId, 'custom'>;

export function levelsOf(tier: PresetTier): Level[] {
  return TIERS[tier].lockedLevel !== undefined ? [TIERS[tier].lockedLevel] : [1, 2, 3, 4];
}

const cache = new Map<string, Case[]>();

export function casesFor(tier: PresetTier, level: Level, seeds: number): Case[] {
  const key = `${tier}:${level}:${seeds}`;
  let list = cache.get(key);
  if (!list) {
    list = [];
    for (let seed = 1; seed <= seeds; seed++) list.push(generateCase(seed, { tier, level }));
    cache.set(key, list);
  }
  return list;
}

/**
 * Every tier at every level it allows: solvable, par inside the tier's range,
 * the shape it asked for, the client never the culprit below Hard-boiled, and
 * the report asking something the tier allows.
 */
export function tierSuite(tier: PresetTier, seeds: number, oracleSeeds: number): void {
  const shape = TIERS[tier];
  for (const level of levelsOf(tier)) {
    const ladder = LADDERS[level];
    it(`${shape.name} at ${ladder.name}: ${seeds} seeds, solvable, par ${shape.par[0]}–${shape.par[1]}`, () => {
      const bad: string[] = [];
      for (const c of casesFor(tier, level, seeds)) {
        const tag = `seed ${c.seed}`;
        const dials = dialsOf(c);
        const { deduction: _d, ...rest } = c;
        const check = checkSolvability(rest);
        if (!check.ok) bad.push(`${tag}: ${check.failures.join('; ')}`);
        // M9: a tiered case's par is the logic game's, walked over its cheapest
        // rule set (docs/20-m9-gen-notes.md); `shape.par` is the M7 range the
        // no-options case is still held to.
        const parRange = c.logic ? deductionOf(shape).par : shape.par;
        // Shorter nights: the range holds the par route walked the M9 way
        // (`SolveSummary.walk`); the night's par is that walk or shorter.
        const size = c.logic?.solve.walk ?? c.par;
        if (size < parRange[0] || size > parRange[1]) bad.push(`${tag}: par ${size}`);
        if (c.par > size) bad.push(`${tag}: par ${c.par} over the walk ${size}`);
        if (dials.shape.name !== shape.name || dials.ladder.level !== level) bad.push(`${tag}: dials`);
        if (c.difficulty !== level) bad.push(`${tag}: difficulty ${c.difficulty}`);
        // M9 polish: a tiered case adds the tier's `extraSlack` (Hard-boiled).
        const slack = c.logic ? logicSlackFor(shape, ladder, c.par, size) : slackFor(shape, ladder, c.par);
        if (c.slack !== slack) bad.push(`${tag}: slack ${c.slack}`);
        if (c.budget !== c.par + c.slack) bad.push(`${tag}: budget`);
        const suspects = c.people.filter((p) => p.kind === 'suspect');
        if (suspects.length !== shape.suspects) bad.push(`${tag}: ${suspects.length} suspects`);
        if (c.places.length !== shape.places) bad.push(`${tag}: ${c.places.length} places`);
        const watched = c.places.filter((p) => p.watcher !== undefined).length;
        if (watched < shape.watched[0] || watched > shape.watched[1]) bad.push(`${tag}: ${watched} watched`);
        const secrets = suspects.filter((p) => !p.isKiller && p.secret).length;
        if (secrets !== shape.innocentSecrets) bad.push(`${tag}: ${secrets} innocent secrets`);
        const width = c.coronerWindow[1] - c.coronerWindow[0] + 1;
        if (width !== shape.coronerWidth) bad.push(`${tag}: coroner ${width}`);
        const client = c.people.find((p) => p.isClient);
        if (!shape.clientMayBeCulprit && client?.isKiller) bad.push(`${tag}: the client did it`);
        if (!shape.caseTypes.includes(c.act.type)) bad.push(`${tag}: ${c.act.type}`);
        if (!shape.tropes.includes(c.act.tropeId)) bad.push(`${tag}: ${c.act.tropeId}`);
        if (c.act.unknowns.length === 0) bad.push(`${tag}: the report asks nothing`);
        for (const u of c.act.unknowns) {
          if (!shape.reportFields.includes(FIELD_OF[u])) bad.push(`${tag}: asks ${u}`);
        }
        // M9: testimony and accounts are findable by anybody who asks, so the
        // noise is measured over the rest of the board, and the ladder's band
        // is held on average (test/m9-gen.test.ts), not case by case.
        if (!c.logic) {
          const noise = c.findable.filter((x) => x.role === 'noise' || x.role === 'disqualifier');
          const share = noise.length / c.findable.length;
          if (share < ladder.noiseRatio[0] - 1e-9 || share > ladder.noiseRatio[1] + 1e-9) {
            bad.push(`${tag}: noise ${Math.round(share * 100)}%`);
          }
        }
      }
      expect(bad).toEqual([]);
    });

    it(`${shape.name} at ${ladder.name}: the client is ${shape.clientMayBeCulprit ? 'the culprit about a quarter of the time' : 'never the culprit'}`, () => {
      const cases = casesFor(tier, level, seeds);
      const guilty = cases.filter((c) => c.people.find((p) => p.isClient)?.isKiller).length;
      if (!shape.clientMayBeCulprit) expect(guilty).toBe(0);
      else {
        expect(guilty / cases.length).toBeGreaterThan(0.1);
        expect(guilty / cases.length).toBeLessThan(0.4);
      }
    });

    it(`${shape.name} at ${ladder.name}: the oracle solves ${oracleSeeds} seeds within par plus one`, () => {
      const bad: string[] = [];
      for (const c of casesFor(tier, level, seeds).slice(0, oracleSeeds)) {
        const result = playOracle(buildView(c));
        // Par plus one is the walk from the office to the first room, which the
        // game adds to the generator's par; `body-moved` re-costs the route
        // from the stairs, and `gamePar` is that number.
        if (!result.ok) bad.push(`seed ${c.seed}: ${result.reason}`);
        else if (result.actions > gamePar(c)) {
          bad.push(`seed ${c.seed}: ${result.actions} actions against ${gamePar(c)}`);
        }
        if (c.act.tropeId !== 'body-moved' && gamePar(c) !== c.par + 1) {
          bad.push(`seed ${c.seed}: game par ${gamePar(c)} is not par ${c.par} plus one`);
        }
      }
      expect(bad).toEqual([]);
    });

    if (level === 4) {
      it(`${shape.name} at the DA’s Office: every essential fact has exactly one findable source`, () => {
        const bad: string[] = [];
        for (const c of casesFor(tier, level, seeds)) {
          if (c.logic) {
            // M9: the proof is the solver's, and the par route is its
            // cheapest rule set, so nothing in it is there twice for its own
            // sake. The motive, which the solver never needs, is the leg that
            // shows it: exactly one clue of it on the par route.
            const spine = c.findable.filter((x) => x.role === 'spine');
            const killer = c.solution.killerId;
            const legs: [string, (f: Fact) => boolean][] = [
              ['motive', (f) => f.kind === 'hasMotive' && f.personId === killer && f.motiveType === c.solution.motiveType],
            ];
            for (const [name, pred] of legs) {
              if (!dialsOf(c).shape.proof.includes(name as 'motive' | 'access')) continue;
              const n = spine.filter((x) => x.establishes.some(pred)).length;
              if (n > 1) bad.push(`seed ${c.seed}: the ${name} on ${n} spine clues`);
            }
            continue;
          }
          const reqs = buildRequirements(requirementInputForCase(c), c.findable, proofSpecOf(dialsOf(c)));
          for (const r of reqs) {
            for (const part of r.parts) {
              // The one thing allowed to say it again is the disqualifier at
              // the end of an innocent's own branch, which places that innocent
              // where the secret was: noise the player has to chase to reach.
              const routes = new Set(part.clues.filter((x) => x.role !== 'disqualifier').map(sourceKey));
              if (routes.size !== 1) bad.push(`seed ${c.seed}: ${part.key} on ${routes.size} routes`);
              for (const d of part.clues.filter((x) => x.role === 'disqualifier')) {
                const own = d.establishes.flatMap((f) =>
                  f.kind === 'secretExplained' ? [`exc:${f.personId}`] : [],
                );
                if (!own.includes(part.key)) {
                  bad.push(`seed ${c.seed}: disqualifier ${d.id} is a route to ${part.key}`);
                }
              }
            }
          }
          if (c.findable.some((x) => x.role === 'corroboration' && reqs.some((r) => r.parts.some((p) => p.clues.includes(x))))) {
            bad.push(`seed ${c.seed}: a corroboration clue carries an essential fact`);
          }
        }
        expect(bad).toEqual([]);
      });
    }
  }
}
