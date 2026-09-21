import {
  TICKS,
  type Case,
  type Environment,
  type Id,
  type Method,
  type Person,
  type Schedule,
  type Tick,
} from './types.js';
import { Rng } from './rng.js';
import { buildCast } from './cast.js';
import { buildSetting } from './setting.js';
import { MapGraph } from './graph.js';
import { buildSchedules } from './schedule.js';
import { chooseMorgueRange, deriveClues, deriveObservations } from './clues.js';
import { checkSolvability, type CaseUnderTest } from './solvability.js';
import { BROADCASTS } from './data/radio.js';
import { LOC } from './data/locations.js';

const OUTER_ATTEMPTS = 60;
const INNER_ATTEMPTS = 40;

function buildEnvironment(rng: Rng): Environment {
  const env: Environment = {};
  if (rng.chance(0.5)) env.rainStartsAt = rng.range(1, 8);
  if (rng.chance(0.4)) {
    const a = rng.range(1, 8);
    env.elevatorOut = [a, Math.min(TICKS - 1, a + rng.range(1, 2))];
  }
  if (rng.chance(0.65)) {
    const b = rng.pick(BROADCASTS);
    env.radioBroadcastAt = rng.range(2, 10);
    env.radioContent = b.content;
    env.radioOutcome = b.outcome;
  }
  return env;
}

/**
 * The single public entry point. Same seed, same case, byte for byte.
 */
export function generateCase(seed: number, opts?: { detectiveName?: string }): Case {
  const detectiveName = opts?.detectiveName ?? 'Humphrey';
  const rng = new Rng(seed);
  let attempts = 0;

  for (let outer = 0; outer < OUTER_ATTEMPTS; outer++) {
    const cast = buildCast(rng);
    const setting = buildSetting(rng, cast.method);
    const environment = buildEnvironment(rng);
    const graph = new MapGraph(setting.locations, environment);

    for (let inner = 0; inner < INNER_ATTEMPTS; inner++) {
      attempts++;

      const L = rng.pick(cast.method.murderLocations);
      const tickChoices = [];
      for (let t = 1; t <= TICKS - 2; t++) {
        const reachable = [LOC.lobby, LOC.bar].some(
          (w) => w !== L && graph.movesInto(w, t).includes(L),
        );
        if (reachable) tickChoices.push(t);
      }
      if (tickChoices.length === 0) continue;
      const M: Tick = rng.pick(tickChoices);

      const build = buildSchedules({
        rng,
        graph,
        cast,
        accessLocation: setting.accessLocation,
        murderTick: M,
        murderLocationId: L,
      });
      if (!build) continue;

      const method: Method = {
        id: cast.method.id,
        name: cast.method.name,
        noise: cast.method.noise,
        evidenceObjectId: cast.method.evidenceObjectId,
        bodyEvidence: cast.method.bodyEvidence,
        accessRequirement: { location: setting.accessLocation, beforeTick: M },
      };

      const people: Person[] = cast.people.map((p) => {
        const clone: Person = {
          id: p.id,
          name: p.name,
          role: p.role,
          kind: p.kind,
          isKiller: p.isKiller,
        };
        if (p.relationshipToVictim !== undefined) clone.relationshipToVictim = p.relationshipToVictim;
        const secret = build.secrets[p.id];
        if (secret) clone.secret = secret;
        if (p.id === cast.killer.id && build.coverSecret) clone.coverSecret = build.coverSecret;
        if (p.motive) clone.motive = { type: p.motive.type, description: p.motive.description };
        return clone;
      });

      const schedules: Schedule[] = cast.people.map((p) => ({
        personId: p.id,
        truth: (build.truth[p.id] as (Id | null)[]).slice(),
        claimed: (build.claimed[p.id] as (Id | null)[]).slice(),
        claimedCompanion: (build.companions[p.id] as (Id | null)[]).slice(),
        lies: (build.lies[p.id] as Tick[]).slice(),
      }));

      const observations = deriveObservations(cast, graph, build);
      const morgueRange = chooseMorgueRange({ rng, cast, graph, build, method, environment });
      const clues = deriveClues({
        rng,
        cast,
        graph,
        build,
        method,
        methodEvidenceNote: cast.method.evidenceNote,
        environment,
        objects: setting.objects,
        observations,
        morgueRange,
      });

      const underTest: CaseUnderTest = {
        seed,
        attempts,
        detectiveName,
        hotelName: setting.hotelName,
        locations: setting.locations,
        objects: setting.objects,
        people,
        method,
        environment,
        schedules,
        observations,
        clues,
        solution: {
          killerId: cast.killer.id,
          methodId: method.id,
          motiveType: cast.killerMotive.type,
          murderTick: M,
          murderLocationId: L,
        },
      };

      const check = checkSolvability(underTest);
      if (!check.ok) continue;

      return { ...underTest, deduction: check.deduction };
    }
  }

  throw new Error(`could not generate a solvable case for seed ${seed}`);
}
