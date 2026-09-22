import {
  SLACK,
  TICKS,
  type Act,
  type Anchor,
  type Case,
  type CaseType,
  type Difficulty,
  type DossierFact,
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
import { pickTrope, type Trope, type TropeContext } from './tropes/index.js';
import { buildVictimBio } from './victim.js';
import { buildClientBrief } from './client.js';
import { buildBriefing } from './briefing.js';
import { SECRET_BY_TYPE } from './data/secrets.js';
import type { Clue, Fact } from './types.js';

const OUTER_ATTEMPTS = 120;
const INNER_ATTEMPTS = 30;

export interface Diagnostics {
  attempts: number;
  /** One entry per discarded attempt, saying what it was discarded for. */
  rejections: string[];
}

export interface GenerateOptions {
  detectiveName?: string;
  difficulty?: Difficulty;
  /** M5: force a shape, for reading. Leave both out and the weights decide. */
  type?: CaseType;
  tropeId?: Id;
}

/** The single public entry point. Same seed and difficulty, same case. */
export function generateCase(seed: number, opts?: GenerateOptions): Case {
  return run(seed, opts?.detectiveName ?? 'Dashiell', opts?.difficulty ?? 2, undefined, opts);
}

/**
 * Same generation, with the discard reasons kept. Deliberately not re-exported
 * from the package index: `generateCase` is the public entry point. This is
 * for tuning the constraints and for the milestone notes.
 */
export function diagnoseCase(
  seed: number,
  difficulty: Difficulty = 2,
  opts?: GenerateOptions,
): {
  case: Case;
  diagnostics: Diagnostics;
} {
  const diagnostics: Diagnostics = { attempts: 0, rejections: [] };
  const kase = run(seed, 'Dashiell', difficulty, diagnostics, opts);
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
  opts?: GenerateOptions,
): Case {
  const rng = new Rng(seed + difficulty * 7919);
  let attempts = 0;
  // The budget is no longer a number per difficulty. It is par plus slack, so
  // a case that costs fourteen actions to solve is given fourteen plus six to
  // solve it in, and the dial is how little room that leaves.
  const slack = SLACK[difficulty];

  /*
   * M5 §2: the trope is drawn once, before any retry, out of a stream of its
   * own. Drawing it inside the loop would let the distribution be bent by
   * which shapes happen to be cheap to build, and the whole point of the
   * weights is that `body-at-scene` stays the commonest thing that happens.
   */
  const tropeRng = new Rng((seed * 2654435761 + difficulty * 40503) >>> 0);
  // mulberry32's first output off a seed that moves by one is not well spread,
  // and a trope is drawn from exactly one number. Three throwaway draws fix it.
  for (let i = 0; i < 3; i++) tropeRng.next();
  const trope: Trope = pickTrope(tropeRng, {
    ...(opts?.type !== undefined ? { type: opts.type } : {}),
    ...(opts?.tropeId !== undefined ? { tropeId: opts.tropeId } : {}),
  });
  const caseType = trope.type;

  for (let outer = 0; outer < OUTER_ATTEMPTS; outer++) {
    const setting = buildSetting(rng, caseType);
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
        caseType,
        tropeId: trope.id,
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
        if (p.gender !== undefined) clone.gender = p.gender;
        const dossier = cast.dossiers[p.id];
        if (dossier) clone.dossier = { ...dossier, layers: dossier.layers.slice() };
        return clone;
      });

      /*
       * M5 §1.1, layer 3: the secret's specifics are documents, and the
       * documents only exist once the secret has a room and an hour. The
       * dossier's last layer is therefore fastened on here, not in the cast.
       */
      for (const p of people) {
        if (!p.dossier) continue;
        const secret = p.id === cast.killer.id ? build.coverSecret : build.secrets[p.id];
        const template = secret ? SECRET_BY_TYPE[secret.type] : undefined;
        const hint = template?.hints[0];
        if (!secret || !hint) continue;
        const where = setting.places.find((pl) => pl.id === secret.cells[0]?.place)?.shortName ?? '';
        const partnerId = secret.partnerId;
        const partner = cast.people.find((q) => q.id === partnerId)?.surname ?? 'somebody';
        const fact: DossierFact = {
          kind: 'secret-hint',
          layer: 3,
          text: hint
            .split('{P}').join(p.surname)
            .split('{Q}').join(partner)
            .split('{V}').join(cast.victim.surname)
            .split('{L}').join(where || 'somewhere on the block')
            .split('{T}').join('that evening'),
        };
        p.dossier.layers = [...p.dossier.layers, fact];
      }

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

      /* --- the act, M5 §2 ------------------------------------------------ */
      const shapeCtx = {
        rng,
        setting,
        cast,
        build,
        method,
        means: setting.method,
        objects: setting.objects,
        coronerWindow,
      };
      const shape = trope.shape(shapeCtx);
      const act: Act = {
        type: trope.type,
        tropeId: trope.id,
        // For a disappearance the actor is the one who went; for everything
        // else it is the one who did it. The core simulation turns on a
        // suspect either way, and for `left` that suspect is the one who saw
        // them off and has been lying about the evening since.
        actorId: trope.id === 'left' ? cast.victim.id : cast.killer.id,
        tick: M,
        place: build.murderPlaceId,
        method,
        givens: { facts: [], text: [] },
        unknowns: trope.unknowns.slice(),
        ...shape,
      };

      const tropeClues: Clue[] = [];
      let tropeCounter = 0;
      const placeName = (id: Id | null | undefined): string =>
        id ? (setting.places.find((p) => p.id === id)?.shortName ?? id) : 'somewhere';
      const whoOf = (id: Id): string => cast.people.find((p) => p.id === id)?.surname ?? id;
      const tropeCtx: TropeContext = {
        ...shapeCtx,
        act,
        placeName,
        who: whoOf,
        foundAt: (id) => (cast.people.find((p) => p.id === id)?.foundAt ?? build.murderPlaceId) as Id,
        at: (id, t) => (build.truth[id] as (Id | null)[] | undefined)?.[t] ?? null,
        truthful: (id, t) => !(build.lies[id] ?? []).includes(t),
        add: (kind, source, place, establishes: Fact[], text) => {
          tropeCounter += 1;
          const clue: Clue = {
            id: `t${String(tropeCounter).padStart(3, '0')}`,
            kind,
            source,
            establishes,
            text,
            place,
            leadsTo: [],
            role: 'noise',
          };
          tropeClues.push(clue);
          return clue;
        },
      };
      act.givens = trope.givens(tropeCtx);

      const victimBio = buildVictimBio({
        rng,
        cast,
        setting,
        build,
        act,
        dossier: cast.dossiers[cast.victim.id] as NonNullable<Person['dossier']>,
      });
      const clientBrief = buildClientBrief({ rng, cast, setting, build, act, difficulty });
      const briefing = buildBriefing({ cast, act, bio: victimBio, brief: clientBrief });

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
        act,
        brief: clientBrief,
      });

      // The signature. Minted after the pool so its ids cannot collide, and
      // folded into the pool so the selector treats it like anything else.
      const signature = trope.signature(tropeCtx);
      candidates.clues.push(...signature.clues);

      const selection = selectFindable({
        rng,
        cast,
        build,
        candidates,
        difficulty,
        places: placeIds,
        sceneId: build.murderPlaceId,
        extraRequirements: [signature.requirement],
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
        // M5 §3: the victim's own address is named after them. The place deck
        // carries `{V}` because it is dealt before anybody is named.
        places: setting.places.map((p) => ({
          ...p,
          name: p.name.split('{V}').join(cast.victim.surname),
        })),
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
        act,
        mentions: cast.mentions.mentions.slice(),
        victimBio,
        clientBrief,
        briefing,
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
