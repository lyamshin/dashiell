import {
  SLACK,
  TICKS,
  type Anchor,
  type Case,
  type Difficulty,
  type Id,
  type Method,
  type Person,
  type Schedule,
  type Tick,
} from './types.js';
import { Rng } from './rng.js';
import { buildCast } from './cast.js';
import { buildSetting, type AnchorDraw, type Setting } from './setting.js';
import { buildSchedules, type ScheduleBuild } from './schedule.js';
import { deriveCandidates, deriveObservations } from './clues.js';
import { selectFindable } from './select.js';
import { checkSolvability, type CaseUnderTest } from './solvability.js';

const OUTER_ATTEMPTS = 120;
const INNER_ATTEMPTS = 30;

export interface Diagnostics {
  attempts: number;
  /** One entry per discarded attempt, saying what it was discarded for. */
  rejections: string[];
}

/** The single public entry point. Same seed and difficulty, same case. */
export function generateCase(
  seed: number,
  opts?: { detectiveName?: string; difficulty?: Difficulty },
): Case {
  return run(seed, opts?.detectiveName ?? 'Dashiell', opts?.difficulty ?? 2);
}

/**
 * Same generation, with the discard reasons kept. Deliberately not re-exported
 * from the package index: `generateCase` is the public entry point. This is
 * for tuning the constraints and for the milestone notes.
 */
export function diagnoseCase(seed: number, difficulty: Difficulty = 2): {
  case: Case;
  diagnostics: Diagnostics;
} {
  const diagnostics: Diagnostics = { attempts: 0, rejections: [] };
  const kase = run(seed, 'Dashiell', difficulty, diagnostics);
  diagnostics.attempts = kase.attempts;
  return { case: kase, diagnostics };
}

function recurring(phase: number, everyN: number): Tick[] {
  const out: Tick[] = [];
  for (let t = phase % everyN; t < TICKS; t += everyN) out.push(t);
  return out;
}

function instantiate(draw: AnchorDraw, ticks: Tick[]): Anchor {
  const anchor: Anchor = {
    templateId: draw.template.id,
    name: draw.template.name,
    ticks,
    traces: draw.template.traces.map((t) => ({ ...t })),
    timing: draw.template.timing,
    highTiming: draw.template.highTiming,
    sceneFact: draw.template.sceneFact,
    masks: draw.template.masks,
  };
  if (draw.placeId !== undefined) anchor.placeId = draw.placeId;
  return anchor;
}

function anchorsFor(setting: Setting, M: Tick, rng: Rng): Anchor[] {
  const out: Anchor[] = [];

  const lowT = setting.low.template;
  out.push(
    instantiate(
      setting.low,
      lowT.ticks === 'single' ? [M - 1] : recurring(M - 1, lowT.everyN ?? 3),
    ),
  );

  const highT = setting.high.template;
  out.push(
    instantiate(setting.high, highT.ticks === 'single' ? [M] : recurring(M, highT.everyN ?? 3)),
  );

  for (const draw of setting.extra) {
    const t = draw.template;
    if (t.id === 'cop-pass') {
      const ticks = recurring(setting.beatCopPhase, 3);
      const anchor = instantiate(draw, ticks);
      anchor.route = ticks.map((_, i) => setting.beatCopRoute[i % setting.beatCopRoute.length] as Id);
      out.push(anchor);
      continue;
    }
    out.push(
      instantiate(draw, t.ticks === 'single' ? [rng.range(1, TICKS - 2)] : recurring(rng.int(t.everyN ?? 3), t.everyN ?? 3)),
    );
  }
  return out;
}

/** Where the detective finds each suspect the day after. */
function assignFoundAt(
  rng: Rng,
  people: Person[],
  build: ScheduleBuild,
  placeIds: Id[],
  residenceId: Id | undefined,
): void {
  const open = placeIds.filter((p) => p !== build.murderPlaceId && p !== residenceId);
  for (const p of people) {
    if (p.kind !== 'suspect') continue;
    const counts = new Map<Id, number>();
    for (const cell of build.truth[p.id] as (Id | null)[]) {
      if (!cell || cell === build.murderPlaceId || cell === residenceId) continue;
      counts.set(cell, (counts.get(cell) ?? 0) + 1);
    }
    let bestPlace: Id | null = null;
    let bestCount = -1;
    for (const [place, n] of counts) {
      if (n > bestCount) {
        bestCount = n;
        bestPlace = place;
      }
    }
    p.foundAt = bestPlace ?? rng.pick(open.length > 0 ? open : placeIds);
  }
}

function run(
  seed: number,
  detectiveName: string,
  difficulty: Difficulty,
  diagnostics?: Diagnostics,
): Case {
  const rng = new Rng(seed + difficulty * 7919);
  let attempts = 0;
  // The budget is no longer a number per difficulty. It is par plus slack, so
  // a case that costs fourteen actions to solve is given fourteen plus six to
  // solve it in, and the dial is how little room that leaves.
  const slack = SLACK[difficulty];

  for (let outer = 0; outer < OUTER_ATTEMPTS; outer++) {
    const setting = buildSetting(rng);
    if (!setting) {
      diagnostics?.rejections.push('the place deck would not deal a legal hand');
      continue;
    }
    const cast = buildCast(rng, setting, difficulty);
    if (!cast) {
      diagnostics?.rejections.push('no cast fits the victim and the rooms');
      continue;
    }

    for (let inner = 0; inner < INNER_ATTEMPTS; inner++) {
      attempts++;

      const M: Tick = rng.range(1, TICKS - 2);
      const anchors = anchorsFor(setting, M, rng);
      const lowAnchor = anchors[0] as Anchor;
      const highAnchor = anchors[1] as Anchor;

      const build = buildSchedules({
        rng,
        setting,
        cast,
        difficulty,
        murderTick: M,
        ...(diagnostics
          ? { reject: (reason: string) => diagnostics.rejections.push(reason) }
          : {}),
      });
      if (!build) continue;

      const method: Method = {
        id: setting.method.id,
        name: setting.method.name,
        noise: setting.method.noise,
        evidenceObjectId: setting.method.evidenceObjectId,
        bodyEvidence: setting.method.bodyEvidence,
        accessRequirement: { place: build.accessPlaceId, beforeTick: M },
      };

      const placeIds = setting.places.map((p) => p.id);
      assignFoundAt(
        rng,
        cast.people,
        build,
        placeIds,
        setting.places.find((p) => p.isResidence)?.id,
      );

      const people: Person[] = cast.people.map((p) => {
        const clone: Person = {
          id: p.id,
          name: p.name,
          surname: p.surname,
          role: p.role,
          kind: p.kind,
          isKiller: p.isKiller,
        };
        if (p.archetypeId !== undefined) clone.archetypeId = p.archetypeId;
        if (p.relationshipId !== undefined) clone.relationshipId = p.relationshipId;
        if (p.relationshipToVictim !== undefined) clone.relationshipToVictim = p.relationshipToVictim;
        if (p.fixtureRole !== undefined) clone.fixtureRole = p.fixtureRole;
        const secret = build.secrets[p.id];
        if (secret) clone.secret = secret;
        if (p.id === cast.killer.id && build.coverSecret) clone.coverSecret = build.coverSecret;
        if (p.motive) clone.motive = { type: p.motive.type, description: p.motive.description };
        if (p.foundAt !== undefined) clone.foundAt = p.foundAt;
        if (p.isClient) clone.isClient = true;
        return clone;
      });

      const schedules: Schedule[] = cast.people.map((p) => ({
        personId: p.id,
        truth: (build.truth[p.id] as (Id | null)[]).slice(),
        claimed: (build.claimed[p.id] as (Id | null)[]).slice(),
        claimedCompanion: (build.companions[p.id] as (Id | null)[]).slice(),
        lies: (build.lies[p.id] as Tick[]).slice(),
      }));

      const observations = deriveObservations(cast, build);

      const offset = rng.range(0, 3);
      let lo = M - offset;
      if (lo < 0) lo = 0;
      if (lo + 3 > TICKS - 1) lo = TICKS - 4;
      const coronerWindow: [Tick, Tick] = [lo, lo + 3];

      const candidates = deriveCandidates({
        rng,
        cast,
        setting,
        build,
        method,
        methodEvidenceNote: setting.method.evidenceNote,
        sceneTrace: setting.method.sceneTrace,
        soundNote: setting.method.soundNote,
        objects: setting.objects,
        observations,
        anchors,
        lowAnchor,
        highAnchor,
        coronerWindow,
        soundMasked: setting.soundMasked,
      });

      const selection = selectFindable({
        rng,
        cast,
        build,
        candidates,
        difficulty,
        places: placeIds,
        sceneId: build.murderPlaceId,
        ...(diagnostics
          ? { reject: (reason: string) => diagnostics.rejections.push(reason) }
          : {}),
      });
      if (!selection) continue;

      const underTest: CaseUnderTest = {
        seed,
        attempts,
        difficulty,
        detectiveName,
        neighborhood: setting.neighborhood,
        places: setting.places,
        objects: setting.objects,
        people,
        method,
        anchors,
        nearScene: setting.nearScene,
        soundMasked: setting.soundMasked,
        schedules,
        observations,
        candidates: candidates.clues,
        findable: selection.findable,
        starting: selection.starting,
        clientId: cast.client.id,
        par: selection.par,
        slack,
        budget: selection.par + slack,
        coronerWindow,
        solution: {
          killerId: cast.killer.id,
          methodId: method.id,
          motiveType: cast.killerMotive.type,
          murderTick: M,
          murderPlaceId: build.murderPlaceId,
        },
      };

      const check = checkSolvability(underTest);
      if (!check.ok) {
        diagnostics?.rejections.push(...check.failures);
        continue;
      }

      return { ...underTest, deduction: check.deduction };
    }
  }

  throw new Error(`could not generate a solvable case for seed ${seed}`);
}
