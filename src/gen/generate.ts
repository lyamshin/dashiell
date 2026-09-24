import {
  TICKS,
  speakTimes,
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
import { TROPE_BY_ID, TROPES, pickMixedTrope, pickTrope, type Trope, type TropeContext } from './tropes/index.js';
import { buildVictimBio } from './victim.js';
import { buildClientBrief } from './client.js';
import { briefingStrings, buildBriefing } from './briefing.js';
import { SECRET_BY_TYPE } from './data/secrets.js';
import {
  LEGACY_TROPES,
  deductionOf,
  logicSlackFor,
  resolveDials,
  slackFor,
  unknownsFor,
  type Dials,
  type ShapeOptions,
} from './shape.js';
import type { Clue, Description, Fact, Id as PersonId } from './types.js';
import { assignBlocks } from './logic/travel.js';
import { buildSchedules9 } from './logic/schedule.js';
import { buildPool } from './logic/rules.js';
import { selectLogic, type LogicSelection } from './logic/select.js';
import { selectV2, type V2Selection } from './v2/select.js';
import { chooseBook } from './v2/book.js';
import { checkLogic } from './logic/check.js';
import { ambiguousDescription, edgesOf } from './logic/acquaint.js';
import { applyRule } from './logic/lines.js';
import { ownTopics } from './topics.js';
import { coherenceFlags, type CoherenceRule } from './coherence.js';

/** What a kept classic case is turned down for: its ties and where it keeps things. */
const CLASSIC_RULES: CoherenceRule[] = ['tie-trade', 'tie-home', 'keeping-place'];

const OUTER_ATTEMPTS = 120;
const INNER_ATTEMPTS = 30;

export interface Diagnostics {
  attempts: number;
  /** One entry per discarded attempt, saying what it was discarded for. */
  rejections: string[];
}

/**
 * M7: `shape` and `ladder` (or `tier` and `level`, the presets by name) set
 * the size of the case and the dials of the night. Leave them all out and the
 * case is Hard-boiled on the pre-M7 dials for `difficulty`, byte for byte what
 * it was before M7.
 */
export interface GenerateOptions extends ShapeOptions {
  detectiveName?: string;
  difficulty?: Difficulty;
  /** M5: force a shape, for reading. Leave both out and the weights decide. */
  type?: CaseType;
  tropeId?: Id;
  /**
   * M14: a tier's classic draw with no case mix — the case the seed dealt
   * before M14, draw for draw. For the goldens and the tests pinned to them.
   */
  classic?: boolean;
  /**
   * The rewrite (docs/35): `v2` builds the puzzle first (`v2/puzzle.ts`) and
   * chooses a book for it (`v2/book.ts`). Murder and lost pets only. Absent
   * or `v1` is the game as it is.
   */
  engine?: 'v1' | 'v2';
}

/**
 * v2's case mix: murder and lost pets, two to one. The classic draw is kept
 * where it is a murder the mix has room for, so seed 3 at Medium is still
 * the Sirkin case the worked example is built on.
 */
function pickV2Trope(
  tropeRng: Rng,
  mixRng: Rng,
  classicList: PersonId[],
  pickOpts: { type?: CaseType; tropeId?: PersonId; allowed?: PersonId[] },
): { trope: Trope; kept: boolean } {
  if (pickOpts.tropeId !== undefined || pickOpts.type !== undefined) {
    return pickMixedTrope(tropeRng, mixRng, { murder: 2, 'lost-pet': 1 }, classicList, pickOpts);
  }
  const wantMurder = 2 / 3;
  const drawn = pickTrope(tropeRng, { allowed: classicList });
  const pool = TROPES.filter((t) => classicList.includes(t.id));
  const total = pool.reduce((n, t) => n + t.weight, 0);
  const shareMurder = pool.filter((t) => t.type === 'murder').reduce((n, t) => n + t.weight, 0) / Math.max(1, total);
  const keep = shareMurder > 0 ? Math.min(1, wantMurder / shareMurder) : 0;
  const roll = mixRng.next();
  if (drawn.type === 'murder' && roll < keep) return { trope: drawn, kept: true };
  const kept = shareMurder * keep;
  const murderLeft = Math.max(0, wantMurder - kept);
  const type: CaseType = mixRng.next() < murderLeft / Math.max(1e-9, 1 - kept) ? 'murder' : 'lost-pet';
  return { trope: pickTrope(mixRng, { type, ...(pickOpts.allowed ? { allowed: pickOpts.allowed } : {}) }), kept: false };
}

/** The single public entry point. Same seed and options, same case. */
export function generateCase(seed: number, opts?: GenerateOptions): Case {
  return run(seed, opts?.detectiveName ?? 'Dashiell', resolveDials(opts), undefined, opts);
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
  const dials = resolveDials({ ...opts, difficulty });
  const kase = run(seed, 'Dashiell', dials, diagnostics, opts);
  diagnostics.attempts = kase.attempts;
  return { case: kase, diagnostics };
}

/**
 * M14: generation with the caller's diagnostics, which are filled in even
 * when the case cannot be dealt and this throws. For the tuning scripts.
 */
export function generateCaseDiagnosed(seed: number, opts: GenerateOptions | undefined, diagnostics: Diagnostics): Case {
  return run(seed, opts?.detectiveName ?? 'Dashiell', resolveDials(opts), diagnostics, opts);
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

/**
 * A salt per tier, so that Raw seed 7 and Coddled seed 7 are not the same
 * neighbourhood with a room taken away. Zero for the no-options path, which is
 * what keeps its streams where they were.
 */
function tierSalt(dials: Dials): number {
  if (dials.plain) return 0;
  const t = dials.shape.tier;
  return typeof t === 'number' ? t + 1 : t === 'over-easy' ? 7 : 8;
}

function run(
  seed: number,
  detectiveName: string,
  dials: Dials,
  diagnostics?: Diagnostics,
  opts?: GenerateOptions,
): Case {
  // M9: a case dealt with a tier is a logic game. The no-options case is not,
  // and keeps every draw it made before M9.
  if (!dials.plain) return ownTopics(runLogic(seed, detectiveName, dials, diagnostics, opts));
  // M14: the mundane three exist only as logic games. Asked for by name on
  // the untiered path — a reader's `--trope pet-taken`, a test sweeping every
  // trope — they are dealt at Hard-boiled on the spec's ladder at that level.
  const forced = opts?.tropeId !== undefined ? TROPE_BY_ID[opts.tropeId]?.type : opts?.type;
  if (forced === 'lost-pet' || forced === 'lost-item' || forced === 'affair') {
    return run(seed, detectiveName, resolveDials({ tier: 5, level: dials.difficulty }), diagnostics, opts);
  }
  const { shape, ladder, difficulty } = dials;
  const salt = tierSalt(dials);
  const rng = new Rng(seed + difficulty * 7919 + salt * 104729);
  let attempts = 0;

  /*
   * M5 §2: the trope is drawn once, before any retry, out of a stream of its
   * own. Drawing it inside the loop would let the distribution be bent by
   * which shapes happen to be cheap to build, and the whole point of the
   * weights is that `body-at-scene` stays the commonest thing that happens.
   */
  const tropeRng = new Rng((seed * 2654435761 + difficulty * 40503 + salt * 7727) >>> 0);
  // mulberry32's first output off a seed that moves by one is not well spread,
  // and a trope is drawn from exactly one number. Three throwaway draws fix it.
  for (let i = 0; i < 3; i++) tropeRng.next();
  // M7: a tier deals only its own tropes. Hard-boiled deals all eight, and a
  // filter that keeps all eight leaves the weighted draw exactly where it was.
  // M14: the untiered case draws from the eight it always drew from, so the
  // mundane three, which only a tier deals, never move its weights.
  const trope: Trope = pickTrope(tropeRng, {
    ...(opts?.type !== undefined ? { type: opts.type } : {}),
    ...(opts?.tropeId !== undefined ? { tropeId: opts.tropeId } : {}),
    allowed: shape.tropes.filter((id) => LEGACY_TROPES.includes(id)),
  });
  const caseType = trope.type;

  for (let outer = 0; outer < OUTER_ATTEMPTS; outer++) {
    const setting = buildSetting(rng, caseType, trope.id, shape);
    if (!setting) {
      diagnostics?.rejections.push('the place deck would not deal a legal hand');
      continue;
    }
    const cast = buildCast(rng, setting, dials);
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
        otherAccess: shape.proof.includes('access'),
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
      /*
       * M7: the window narrows with the tier. Two hours at Hard-boiled, as
       * before; an hour at Soft-boiled and Medium, always the half hour before
       * and the half hour of, so that the one anchor it needs is one the
       * detective has to find rather than the scene report handing it over;
       * the exact half hour at Raw, Coddled and Poached.
       */
      const coronerWindow: [Tick, Tick] =
        shape.coronerWidth === 4 ? [lo, lo + 3] : shape.coronerWidth === 2 ? [M - 1, M] : [M, M];

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
        methodGiven: shape.methodGiven,
      };
      const tropeShape = trope.shape(shapeCtx);
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
        unknowns: unknownsFor(shape, trope.type, trope.unknowns),
        ...tropeShape,
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
      const clientBrief = buildClientBrief({ rng, cast, setting, build, act, dials });
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
        knowledgeTests: shape.knowledgeTests,
        pointerMotive: shape.innocentMotives > 0,
      });

      // The signature. Minted after the pool so its ids cannot collide, and
      // folded into the pool so the selector treats it like anything else.
      const signature = trope.signature(tropeCtx);
      candidates.clues.push(...signature.clues);

      /*
       * §A.3. Every clue comes out twice, like every briefing line: the record
       * keeps the clock face and the page gets the hour as somebody says it.
       * Done here, before the selection copies anything, so both forms travel
       * together wherever a clue goes.
       */
      for (const clue of candidates.clues) {
        if (clue.textRecord === undefined) clue.textRecord = clue.text;
        clue.text = speakTimes(clue.textRecord);
      }

      const selection = selectFindable({
        rng,
        cast,
        build,
        candidates,
        dials,
        places: placeIds,
        sceneId: build.murderPlaceId,
        extraRequirements: [signature.requirement],
        ...(diagnostics
          ? { reject: (reason: string) => diagnostics.rejections.push(reason) }
          : {}),
      });
      if (!selection) continue;
      // The budget is par plus slack, so a case that costs fourteen actions to
      // solve is given fourteen plus six to solve it in, and the dial is how
      // little room that leaves. M7: below Medium the room shrinks with par.
      const slack = slackFor(shape, ladder, selection.par);

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
        briefingText: briefingStrings(briefing),
        // M7: a case dealt with options carries them, so that the checker, the
        // sheet and the book can read back what it was dealt as. The
        // no-options case carries nothing new, which keeps it byte-identical.
        ...(dials.plain ? {} : { shape, ladder }),
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

/**
 * M9 — a tiered case, built as a logic game (`docs/20-m9-deduction.md`).
 *
 * The same setting, cast, trope, victim, client and briefing as before; a
 * different evening (`logic/schedule.ts`), a different pool of clues
 * (`logic/rules.ts`), and a solver that decides what is findable, what par
 * is, and whether the case is accepted at all (`logic/select.ts`).
 */
function runLogic(
  seed: number,
  detectiveName: string,
  dials: Dials,
  diagnostics?: Diagnostics,
  opts?: GenerateOptions,
): Case {
  const { shape, ladder, difficulty } = dials;
  const ded = deductionOf(shape);
  const salt = tierSalt(dials);
  const rng = new Rng(seed + difficulty * 7919 + salt * 104729);
  let attempts = 0;
  const tropeRng = new Rng((seed * 2654435761 + difficulty * 40503 + salt * 7727) >>> 0);
  for (let i = 0; i < 3; i++) tropeRng.next();
  // M14 §1.5: the classic draw as it always was, then the case mix keeps it
  // or deals the seed something else, off a stream of its own
  // (`pickMixedTrope`). A kept case is the case the seed dealt before M14.
  const pickOpts = {
    ...(opts?.type !== undefined ? { type: opts.type } : {}),
    ...(opts?.tropeId !== undefined ? { tropeId: opts.tropeId } : {}),
    allowed: shape.tropes,
  };
  const mixRng = new Rng((seed * 1597334677 + difficulty * 3812015801 + salt * 104723 + 17) >>> 0);
  for (let i = 0; i < 3; i++) mixRng.next();
  const classicList = shape.classicTropes ?? shape.tropes;
  const v2 = opts?.engine === 'v2';
  const mixed = opts?.classic
    ? { trope: pickTrope(tropeRng, { ...pickOpts, allowed: classicList }), kept: true }
    : v2
    ? pickV2Trope(tropeRng, mixRng, classicList, pickOpts)
    : shape.caseMix
    ? pickMixedTrope(tropeRng, mixRng, shape.caseMix, classicList, pickOpts)
    : { trope: pickTrope(tropeRng, pickOpts), kept: true };
  const trope: Trope = mixed.trope;
  const caseType = trope.type;
  const reject = diagnostics ? (reason: string) => diagnostics.rejections.push(reason) : undefined;
  // Whether the client did it is the seed's, not the attempt's: a client who
  // is the culprit is one fewer innocent to clear, and deciding it per
  // attempt let the easier deal win it more often than a quarter of the time.
  // M14: never in an affair, where the client is married to the one it is
  // about and the culprit is the one they were with.
  const clientIsKiller = shape.clientMayBeCulprit ? (caseType === 'affair' ? false : tropeRng.chance(0.25)) : undefined;
  // The same for where an innocent client points: at the culprit at chance,
  // one in however many others there are to point at.
  const pointerOnKiller = shape.clientMayBeCulprit ? tropeRng.chance(1 / Math.max(1, shape.suspects - 1)) : undefined;

  // The coherence pass: a case the mix dealt new is dealt coherent; a kept
  // classic case is dealt as it always was and turned down below if it does
  // not hang together, and is dealt coherent from then on.
  let coherent = !mixed.kept;
  for (let outer = 0; outer < OUTER_ATTEMPTS; outer++) {
    const setting = buildSetting(rng, caseType, trope.id, shape, coherent);
    if (!setting) {
      reject?.('the place deck would not deal a legal hand');
      continue;
    }
    const cast = buildCast(rng, setting, dials, clientIsKiller, {
      type: caseType,
      ...(trope.motive !== undefined ? { motive: trope.motive } : {}),
      // A kept classic case keeps its classic cast, draw for draw.
      classic: mixed.kept,
      coherent,
    });
    if (!cast) {
      reject?.('no cast fits the victim and the rooms');
      continue;
    }
    // The hypothesis a Hard-boiled night needs is two innocents who tell the
    // truth about the crime's half hour and fit one description; with every
    // innocent but two lying about it there is rarely such a pair. Three
    // innocents stay honest about the half hour.
    if (ded.hypothesis && cast.innocents.length - cast.mLiarIds.length < 3) {
      cast.mLiarIds = cast.mLiarIds.slice(0, Math.max(0, cast.innocents.length - 3));
    }

    for (let inner = 0; inner < INNER_ATTEMPTS; inner++) {
      attempts++;
      const M: Tick = rng.range(3, TICKS - 2);
      const anchors = anchorsFor(setting, M, rng);
      const placeIds = setting.places.map((p) => p.id);
      const L = setting.murderPlaceId;
      const blocks = assignBlocks(rng, placeIds, L, [[setting.low.placeId as PersonId, L]]);
      if (!blocks) {
        reject?.('m9: the blocks would not lay out');
        continue;
      }
      const build = buildSchedules9({
        rng,
        setting,
        cast,
        murderTick: M,
        caseType,
        tropeId: trope.id,
        blocks,
        dials: ded,
        extraLies: ladder.extraLies,
        ...(reject ? { reject } : {}),
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
      assignFoundAt(rng, cast.people, build, placeIds, setting.places.find((p) => p.isResidence)?.id);

      const people: Person[] = cast.people.map((p) => {
        const clone: Person = { id: p.id, name: p.name, surname: p.surname, role: p.role, kind: p.kind, isKiller: p.isKiller };
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
      for (const p of people) {
        if (!p.dossier) continue;
        const secret = p.id === cast.killer.id ? build.coverSecret : build.secrets[p.id];
        const template = secret ? SECRET_BY_TYPE[secret.type] : undefined;
        const hint = template?.hints[0];
        if (!secret || !hint) continue;
        const where = setting.places.find((pl) => pl.id === secret.cells[0]?.place)?.shortName ?? '';
        const partner = cast.people.find((q) => q.id === secret.partnerId)?.surname ?? 'somebody';
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
      const coronerWindow: [Tick, Tick] =
        shape.coronerWidth === 4 ? [lo, lo + 3] : shape.coronerWidth === 2 ? [M - 1, M] : [M, M];

      const shapeCtx = {
        rng,
        setting,
        cast,
        build,
        method,
        means: setting.method,
        objects: setting.objects,
        coronerWindow,
        methodGiven: shape.methodGiven,
      };
      const act: Act = {
        type: trope.type,
        tropeId: trope.id,
        actorId: trope.id === 'left' ? cast.victim.id : cast.killer.id,
        tick: M,
        place: build.murderPlaceId,
        method,
        givens: { facts: [], text: [] },
        unknowns: unknownsFor(shape, trope.type, trope.unknowns),
        ...trope.shape(shapeCtx),
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
      const clientBrief = buildClientBrief({ rng, cast, setting, build, act, dials, ...(pointerOnKiller !== undefined ? { pointerOnKiller } : {}) });
      const briefing = buildBriefing({ cast, act, bio: victimBio, brief: clientBrief });

      const legacy = deriveCandidates({
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
        lowAnchor: anchors[0] as Anchor,
        highAnchor: anchors[1] as Anchor,
        coronerWindow,
        soundMasked: setting.soundMasked,
        act,
        brief: clientBrief,
        knowledgeTests: false,
        m9: true,
        pointerMotive: shape.innocentMotives > 0,
      });
      for (const clue of legacy.clues) {
        if (clue.textRecord === undefined) clue.textRecord = clue.text;
        clue.text = speakTimes(clue.textRecord);
      }

      // The trope's signature, kept to the lie rule: a record that places the
      // culprit, or clears the one who was framed, in one line is a
      // conclusion, and M9 deals the pieces instead. The document keeps what
      // it proves about the key or the weapon; the room and the hour go.
      const signature = trope.signature(tropeCtx);
      const sigClues = signature.clues.map((c) => {
        c.establishes = c.establishes.filter(
          (f) =>
            !(
              (f.kind === 'personAt' || f.kind === 'personNotAt') &&
              cast.suspects.some((s) => s.id === f.personId)
            ),
        );
        if (trope.id === 'the-frame' && c.kind === 'document') {
          c.text = c.text.replace(/\s[^.]*\bwas at\b[^.]*\.$/, '');
        }
        // M14: the inside job's sign-in book, likewise, now that a robbery
        // is dealt below Medium, where the page tests read every hour. The
        // key list keeps what it proves; the hour went with the placement.
        // (docs/23-m10-a-notes.md listed it under "Not fixed".) A kept
        // classic case turned down by the coherence pass is a new case, and
        // is fixed with the rest.
        if (trope.id === 'inside-job' && c.kind === 'document' && coherent) {
          c.text = c.text.replace(/\sThe sign-in book has [^.]*\.$/, '');
        }
        if (c.textRecord === undefined) c.textRecord = c.text;
        c.text = speakTimes(c.textRecord);
        return c;
      });

      const pool = buildPool({
        rng,
        cast,
        setting,
        build,
        anchors,
        dials: ded,
        legacy,
        knowledgeTests: shape.coronerWidth > 1,
        caseType,
      });
      for (const c of sigClues) {
        applyRule(c, c.source.type === 'place' ? `Found at ${placeName(c.source.placeId)}.` : `${whoOf(c.source.personId)} says so.`, pool.names);
      }

      // M14: an affair opens where they said they would be, as a moved body
      // opens where it was found, so `where` is a question and not a room.
      const startId =
        trope.id === 'body-moved' && act.bodyFoundAt && act.bodyFoundAt !== act.place
          ? act.bodyFoundAt
          : act.type === 'affair' && act.claimedAt && act.claimedAt !== act.place
            ? act.claimedAt
            : build.murderPlaceId;
      const selectInput = {
        rng,
        cast,
        setting,
        build,
        pool,
        signature: sigClues,
        dials,
        act,
        startId,
        blocks,
        ...(reject ? { reject } : {}),
      };
      // v2, stage 1: the solved grid is the one v1 deals for this seed. v1's
      // selection runs first as the gate (it consumes the attempt's stream
      // exactly as v1 does), so where the puzzle stage accepts the same
      // attempt the night is v1's night: seed 3 at Medium is still the
      // Sirkin case. The puzzle stage then draws on a stream of its own.
      const gate = v2 ? selectLogic(selectInput) : null;
      if (v2 && !gate) continue;
      const selection: LogicSelection | V2Selection | null = v2
        ? selectV2({ ...selectInput, rng: new Rng((seed * 2246822519 + attempts * 3266489917 + salt) >>> 0) })
        : selectLogic(selectInput);
      if (!selection) continue;
      // v2: a call more from Medium up, where the night leans on a confession or two (docs/36).
      const slack = logicSlackFor(shape, ladder, selection.par, selection.summary.walk, caseType) + (v2 && typeof shape.tier === 'number' && shape.tier >= 4 ? 1 : 0);

      const descriptions: Record<PersonId, Description> = {};
      for (const p of cast.suspects) descriptions[p.id] = ambiguousDescription(p, cast.suspects);
      const candidates: Clue[] = [
        ...pool.starting,
        ...pool.testimony,
        ...pool.accounts,
        ...pool.descriptions,
        ...pool.watch,
        ...pool.timing,
        ...pool.knowledge,
        ...pool.kept,
        ...pool.material.flatMap((m) => [...m.hints, ...m.traces, ...m.disqualifiers]),
        ...sigClues,
      ];
      if (v2) {
        // A witness the dig made a stranger says so in the truth as well.
        const now = new Map(selection.findable.map((c) => [c.id, c]));
        for (let i = 0; i < candidates.length; i++) {
          const c = now.get((candidates[i] as Clue).id);
          if (c) candidates[i] = c;
        }
      }

      const underTest: CaseUnderTest = {
        seed,
        attempts,
        difficulty,
        detectiveName,
        neighborhood: setting.neighborhood,
        places: setting.places.map((p) => ({ ...p, name: p.name.split('{V}').join(cast.victim.surname) })),
        objects: setting.objects,
        people,
        method,
        anchors,
        nearScene: setting.nearScene,
        soundMasked: setting.soundMasked,
        schedules,
        observations,
        candidates,
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
        briefingText: briefingStrings(briefing),
        shape,
        ladder,
        logic: {
          blocks,
          acquaintance: edgesOf(build.acq),
          descriptions,
          lies: selection.lies,
          confrontations: selection.confrontations,
          solve: selection.summary,
          ...(selection.open.length > 0 ? { open: selection.open } : {}),
        },
      };

      if (v2) {
        const graph = (selection as V2Selection).graph;
        // v2 accepts by its own rules (the puzzle stage); M9's checker still
        // writes the deduction path the truth sheet prints.
        const deduction = checkLogic(underTest).deduction;
        const kase: Case = { ...underTest, deduction, engine: 'v2', v2: { graph, book: null as never } };
        kase.v2 = { graph, book: chooseBook(kase, graph) };
        return kase;
      }
      const check = checkSolvability(underTest);
      if (!check.ok) {
        diagnostics?.rejections.push(...check.failures);
        continue;
      }
      // A kept classic case that does not hang together — a tie its owner
      // cannot carry, an inside job's box on a public bench — is turned down
      // here, after every draw it always made, and the night is dealt again.
      if (!coherent && coherenceFlags(underTest).some((f) => CLASSIC_RULES.includes(f.rule))) {
        reject?.('the world does not hang together');
        coherent = true;
        break;
      }
      return { ...underTest, deduction: check.deduction };
    }
  }
  throw new Error(`could not generate a solvable case for seed ${seed}`);
}
