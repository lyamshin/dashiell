import {
  TICKS,
  clock,
  type Clue,
  type Environment,
  type Fact,
  type GameObject,
  type Id,
  type Method,
  type Observation,
  type Person,
  type Tick,
} from './types.js';
import type { MapGraph } from './graph.js';
import type { Cast } from './cast.js';
import type { ScheduleBuild } from './schedule.js';
import { LOC } from './data/locations.js';
import { MOTIVE_TEMPLATES } from './data/motives.js';
import { FORGED_IDENTITY_DOCUMENTS } from './data/secrets.js';
import type { Rng } from './rng.js';

export function deriveObservations(cast: Cast, graph: MapGraph, build: ScheduleBuild): Observation[] {
  const out: Observation[] = [];
  for (let t = 0; t < TICKS; t++) {
    for (const observer of cast.people) {
      const oLoc = (build.truth[observer.id] as (Id | null)[])[t];
      if (!oLoc) continue;
      const withheld = (build.lies[observer.id] as Tick[]).includes(t);
      for (const subject of cast.people) {
        if (subject.id === observer.id) continue;
        const sLoc = (build.truth[subject.id] as (Id | null)[])[t];
        if (!sLoc) continue;
        if (!graph.canSee(oLoc, sLoc)) continue;
        out.push({
          observerId: observer.id,
          subjectId: subject.id,
          location: sLoc,
          tick: t,
          withheld,
        });
      }
    }
  }
  return out;
}

function span(ticks: Tick[]): string {
  const first = ticks[0] as Tick;
  const last = ticks[ticks.length - 1] as Tick;
  return first === last ? `at ${clock(first)}` : `from ${clock(first)} to ${clock(last)}`;
}

interface ClueContext {
  rng: Rng;
  cast: Cast;
  graph: MapGraph;
  build: ScheduleBuild;
  method: Method;
  /** Flat description of the trace the method leaves where the weapon lived. */
  methodEvidenceNote: string;
  environment: Environment;
  objects: GameObject[];
  observations: Observation[];
  /** The coroner's two-tick window. */
  morgueRange: [Tick, Tick];
}

/** Maximal runs of consecutive ticks over a sorted tick list. */
function runs(ticks: Tick[]): Tick[][] {
  const out: Tick[][] = [];
  for (const t of ticks) {
    const last = out[out.length - 1];
    if (last && (last[last.length - 1] as Tick) === t - 1) last.push(t);
    else out.push([t]);
  }
  return out;
}

export function chooseMorgueRange(ctx: {
  rng: Rng;
  cast: Cast;
  graph: MapGraph;
  build: ScheduleBuild;
  method: Method;
  environment: Environment;
}): [Tick, Tick] {
  const M = ctx.build.murderTick;
  if (ctx.method.noise >= 1 && M + 1 <= TICKS - 1) {
    const hearers = noiseHearers(ctx.cast, ctx.graph, ctx.build, ctx.method, ctx.environment);
    if (hearers.length >= 2 && ctx.rng.chance(0.5)) return [M, M + 1];
  }
  return [M - 1, M];
}

function noiseHearers(
  cast: Cast,
  graph: MapGraph,
  build: ScheduleBuild,
  method: Method,
  environment: Environment,
): { person: Person; location: Id }[] {
  if (method.noise < 1) return [];
  const M = build.murderTick;
  const L = build.murderLocationId;
  const carries = graph.loc(L).noiseCarriesTo;
  const out: { person: Person; location: Id }[] = [];
  for (const p of cast.people) {
    if (p.id === cast.killer.id || p.id === cast.victim.id) continue;
    if ((build.lies[p.id] as Tick[]).includes(M)) continue;
    const loc = (build.truth[p.id] as (Id | null)[])[M];
    if (!loc || !carries.includes(loc)) continue;
    // A loud radio in the bar covers a lot.
    if (environment.radioBroadcastAt === M && loc === LOC.bar) continue;
    out.push({ person: p, location: loc });
  }
  return out;
}

export function deriveClues(ctx: ClueContext): Clue[] {
  const { cast, graph, build, method, environment, objects, observations, morgueRange, rng } = ctx;
  const M = build.murderTick;
  const L = build.murderLocationId;
  const clues: Clue[] = [];
  let counter = 0;
  const add = (
    kind: Clue['kind'],
    source: Clue['source'],
    establishes: Fact[],
    text: string,
  ): Clue => {
    counter += 1;
    const clue: Clue = { id: `c${String(counter).padStart(3, '0')}`, kind, source, establishes, text };
    clues.push(clue);
    return clue;
  };

  const personById = (id: Id): Person => cast.people.find((p) => p.id === id) as Person;

  /* 1. Observations people are willing to repeat. ---------------------- */
  const reportable = cast.people.filter((p) => p.kind !== 'fixture');
  for (const observer of cast.people) {
    for (const subject of reportable) {
      if (subject.id === observer.id) continue;
      const mine = observations.filter(
        (o) => o.observerId === observer.id && o.subjectId === subject.id && !o.withheld,
      );
      if (mine.length === 0) continue;
      const byLocation = new Map<Id, Tick[]>();
      for (const o of mine) {
        const list = byLocation.get(o.location) ?? [];
        list.push(o.tick);
        byLocation.set(o.location, list);
      }
      for (const [location, ticks] of byLocation) {
        for (const run of runs(ticks.slice().sort((a, b) => a - b))) {
          const facts: Fact[] = run.map((t) => ({
            kind: 'personAt' as const,
            personId: subject.id,
            location,
            tick: t,
          }));
          if (subject.id === cast.victim.id) {
            for (const t of run) facts.push({ kind: 'victimAliveAt', tick: t });
          }
          if (
            location === build.accessLocation &&
            run.some((t) => t < M) &&
            subject.kind === 'suspect'
          ) {
            facts.push({ kind: 'hadAccess', personId: subject.id, methodId: method.id });
          }
          add(
            'observation',
            { type: 'person', personId: observer.id, topic: subject.name },
            facts,
            `${observer.name} says ${subject.name} was in the ${graph.name(location)} ${span(run)}.`,
          );
        }
      }
    }
  }

  /* 2. Flat contradictions of a claimed alibi. -------------------------- */
  for (const liar of cast.suspects) {
    const lieTicks = build.lies[liar.id] as Tick[];
    if (lieTicks.length === 0) continue;
    for (const block of runs(lieTicks)) {
      const claimLoc = (build.claimed[liar.id] as (Id | null)[])[block[0] as Tick];
      if (!claimLoc) continue;
      const named = (build.companions[liar.id] as (Id | null)[])[block[0] as Tick];

      for (const denier of cast.people) {
        if (denier.id === liar.id || denier.id === cast.victim.id) continue;
        const denierLies = build.lies[denier.id] as Tick[];
        const usable = block.filter((t) => {
          if (denierLies.includes(t)) return false;
          const dLoc = (build.truth[denier.id] as (Id | null)[])[t];
          if (!dLoc) return false;
          if ((build.truth[liar.id] as (Id | null)[])[t] === claimLoc) return false;
          return graph.canSee(dLoc, claimLoc);
        });
        if (usable.length === 0) continue;
        for (const run of runs(usable)) {
          const dLoc = (build.truth[denier.id] as (Id | null)[])[run[0] as Tick] as Id;
          const facts: Fact[] = run.map((t) => ({
            kind: 'personNotAt' as const,
            personId: liar.id,
            location: claimLoc,
            tick: t,
          }));
          add(
            'observation',
            { type: 'person', personId: denier.id, topic: `${liar.name}'s account` },
            facts,
            `${denier.name} was in the ${graph.name(dLoc)} ${span(run)} and says ${liar.name} was not in the ${graph.name(claimLoc)}.`,
          );
        }
      }

      if (named) {
        const companion = personById(named);
        const companionLies = build.lies[named] as Tick[];
        const usable = block.filter((t) => {
          if (companionLies.includes(t)) return false;
          const cLoc = (build.truth[named] as (Id | null)[])[t];
          return Boolean(cLoc) && cLoc !== claimLoc && !graph.canSee(cLoc as Id, claimLoc);
        });
        if (usable.length > 0) {
          for (const run of runs(usable)) {
            const cLoc = (build.truth[named] as (Id | null)[])[run[0] as Tick] as Id;
            const facts: Fact[] = run.map((t) => ({
              kind: 'personNotAt' as const,
              personId: liar.id,
              location: claimLoc,
              tick: t,
            }));
            add(
              'observation',
              { type: 'person', personId: named, topic: `${liar.name}'s account` },
              facts,
              `${liar.name} says ${companion.name} was there. ${companion.name} says otherwise: ${companion.name} was in the ${graph.name(cLoc)} ${span(run)}, not the ${graph.name(claimLoc)}.`,
            );
          }
        }
      }
    }
  }

  /* 3. The body. --------------------------------------------------------- */
  add(
    'morgue',
    { type: 'location', locationId: L },
    [{ kind: 'timeOfDeath', ticks: [morgueRange[0], morgueRange[1]] }],
    `${cast.victim.name} was found in the ${graph.name(L)}. The coroner puts death between ${clock(morgueRange[0])} and ${clock(morgueRange[1])}. ${method.bodyEvidence}`,
  );

  /* 4. The weapon. ------------------------------------------------------- */
  const evidence = objects.find((o) => o.id === method.evidenceObjectId);
  if (evidence) {
    add(
      'physical',
      { type: 'location', locationId: evidence.homeLocation },
      [{ kind: 'objectMissing', objectId: evidence.id, fromLocation: evidence.homeLocation }],
      `${evidence.name[0]?.toUpperCase()}${evidence.name.slice(1)} is missing from the ${graph.name(evidence.homeLocation)}. ${ctx.methodEvidenceNote}`.trim(),
    );
  }

  /* 5. Noise. ------------------------------------------------------------ */
  const noiseWord = method.noise === 2 ? 'a shot' : 'a heavy fall and a cry cut short';
  for (const hearer of noiseHearers(cast, graph, build, method, environment)) {
    add(
      'physical',
      { type: 'person', personId: hearer.person.id, topic: 'the noise' },
      [{ kind: 'noiseAt', location: L, tick: M }],
      `${hearer.person.name} was in the ${graph.name(hearer.location)} at ${clock(M)} and heard ${noiseWord} from the direction of the ${graph.name(L)}.`,
    );
  }

  /* 6. Weather and the elevator. ----------------------------------------- */
  if (environment.rainStartsAt !== undefined) {
    const R = environment.rainStartsAt;
    add(
      'environment',
      { type: 'location', locationId: LOC.street },
      [],
      `Rain began at ${clock(R)} and did not let up. Anyone out on the street after that came back in wet.`,
    );
    for (const p of cast.people) {
      if (p.kind === 'fixture') continue;
      const line = build.truth[p.id] as (Id | null)[];
      for (let t = R; t < TICKS - 1; t++) {
        if (line[t] !== LOC.street) continue;
        const next = line[t + 1];
        if (!next || next === LOC.street) continue;
        const witness = cast.people.find(
          (q) =>
            q.id !== p.id &&
            !(build.lies[q.id] as Tick[]).includes(t + 1) &&
            Boolean(line[t + 1]) &&
            Boolean((build.truth[q.id] as (Id | null)[])[t + 1]) &&
            graph.canSee((build.truth[q.id] as (Id | null)[])[t + 1] as Id, next),
        );
        if (!witness) continue;
        add(
          'environment',
          { type: 'person', personId: witness.id, topic: 'the rain' },
          [{ kind: 'personAt', personId: p.id, location: LOC.street, tick: t }],
          `${witness.name} says ${p.name} came in off the street at ${clock(t + 1)} with a soaked coat, so ${p.name} was outside at ${clock(t)}.`,
        );
        break;
      }
    }
  }

  if (environment.elevatorOut) {
    const [e1, e2] = environment.elevatorOut;
    add(
      'environment',
      { type: 'location', locationId: LOC.lobby },
      [],
      `The passenger elevator was out of order from ${clock(e1)} to ${clock(e2)}. Anyone changing floors in that time used the service stairs.`,
    );
    for (const p of cast.people) {
      if (p.kind === 'fixture') continue;
      const line = build.truth[p.id] as (Id | null)[];
      for (let t = e1; t <= e2; t++) {
        if (line[t] !== LOC.stairs) continue;
        add(
          'physical',
          { type: 'location', locationId: LOC.stairs },
          [{ kind: 'personAt', personId: p.id, location: LOC.stairs, tick: t }],
          `The service stairs were whitewashed that afternoon. There is whitewash on ${p.name}'s sleeve; ${p.name} was on the stairs at ${clock(t)}.`,
        );
        break;
      }
    }
  }

  /* 7. The radio. -------------------------------------------------------- */
  if (environment.radioBroadcastAt !== undefined) {
    const B = environment.radioBroadcastAt;
    add(
      'radio',
      { type: 'person', personId: cast.bartender.id, topic: 'the radio' },
      [],
      `${cast.bartender.name} says the bar radio carried ${environment.radioContent} at ${clock(B)}, and that ${environment.radioOutcome}. Anyone in the bar could tell you that.`,
    );
    for (const p of cast.suspects) {
      const claimedLoc = (build.claimed[p.id] as (Id | null)[])[B];
      const trueLoc = (build.truth[p.id] as (Id | null)[])[B];
      if (claimedLoc !== LOC.bar || trueLoc === LOC.bar) continue;
      add(
        'radio',
        { type: 'person', personId: cast.bartender.id, topic: `${p.name}'s account` },
        [{ kind: 'personNotAt', personId: p.id, location: LOC.bar, tick: B }],
        `${p.name} says ${p.name} was in the bar at ${clock(B)} but cannot say how the broadcast ended.`,
      );
    }
  }

  /* 8. Papers that do not hold up. --------------------------------------- */
  for (const p of cast.suspects) {
    const secret = build.secrets[p.id];
    const cover = p.id === cast.killer.id ? build.coverSecret : undefined;
    const forged = secret?.type === 'forged-identity' || cover?.type === 'forged-identity';
    if (!forged) continue;
    add(
      'document',
      { type: 'location', locationId: LOC.frontDesk },
      [],
      `${p.name}'s papers do not hold up. ${rng.pick(FORGED_IDENTITY_DOCUMENTS)}`,
    );
  }

  /* 9. Motive, two sources each. ----------------------------------------- */
  const motiveHolders = cast.suspects.filter((p) => p.motive);
  for (const p of motiveHolders) {
    const template = MOTIVE_TEMPLATES.find((t) => t.type === p.motive?.type);
    if (!template) continue;
    const fill = (s: string): string => s.split('{V}').join(cast.victim.name).split('{P}').join(p.name);
    const letterLocation = rng.chance(0.5) ? LOC.suite : LOC.frontDesk;
    add(
      'document',
      { type: 'location', locationId: letterLocation },
      [{ kind: 'hasMotive', personId: p.id, motiveType: p.motive?.type as string }],
      `Found in the ${graph.name(letterLocation)}: ${fill(template.letter)}`,
    );
    const speakerPool = rng.chance(0.6)
      ? [cast.doorman, cast.bartender]
      : cast.suspects.filter((q) => q.id !== p.id);
    const speaker = rng.pick(speakerPool.length > 0 ? speakerPool : [cast.bartender]);
    add(
      'overheard',
      { type: 'person', personId: speaker.id, topic: `${p.name} and ${cast.victim.name}` },
      [{ kind: 'hasMotive', personId: p.id, motiveType: p.motive?.type as string }],
      `${speaker.name} says ${fill(template.overheard)}`,
    );
  }

  return clues;
}
