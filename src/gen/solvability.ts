import {
  BRANCH_COUNT_FLOOR,
  FINDABLE_TOLERANCE,
  type Case,
  type Clue,
  type DeductionPath,
  type Fact,
  type Id,
  type Tick,
} from './types.js';
import {
  buildRequirements,
  isLooseEnd,
  proofSpecOf,
  requirementInputForCase,
  sourceKey,
  spineCapFor,
} from './select.js';
import { MASKING_PHRASES } from './data/anchors.js';
import { dialsOf, liarsFor, slackFor } from './shape.js';

export interface CheckResult {
  ok: boolean;
  failures: string[];
  deduction: DeductionPath;
}

export type CaseUnderTest = Omit<Case, 'deduction'>;

function independentSources(clues: Clue[]): number {
  return new Set(clues.map(sourceKey)).size;
}

function ids(clues: Clue[]): Id[] {
  const seen = new Set<Id>();
  const out: Id[] = [];
  for (const c of clues) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c.id);
  }
  return out;
}

function establishing(clues: Clue[], pred: (f: Fact, c: Clue) => boolean): Clue[] {
  return clues.filter((c) => c.establishes.some((f) => pred(f, c)));
}

/**
 * Which secret *activity* a person's secret belongs to. Two people in an
 * affair share one activity and therefore one branch; a blackmailer whose
 * partner is the victim has an activity of his own, because the victim is in
 * no position to carry half a branch.
 */
export function activityKey(c: Pick<CaseUnderTest, 'people'>, personId: Id): string {
  const person = c.people.find((p) => p.id === personId);
  const partnerId = person?.secret?.partnerId;
  const partner = partnerId ? c.people.find((p) => p.id === partnerId) : undefined;
  if (!partner || partner.kind !== 'suspect') return personId;
  return [personId, partnerId].sort().join('+');
}

/**
 * The spec's five conditions over the *findable* set, the interestingness
 * heuristics, and the shape rules the budget depends on. Returns the proof it
 * found so the truth sheet can print it.
 */
export function checkSolvability(c: CaseUnderTest): CheckResult {
  // M7: the conditions are the shape's and the ladder's. A no-options case is
  // Hard-boiled on the legacy ladder, and every check below reduces to the one
  // it was before M7.
  const dials = dialsOf(c);
  const { shape, ladder } = dials;
  const spec = proofSpecOf(dials);
  const legacy = ladder.legacy === true;
  const single = spec.corroboration === 'single';
  const bigFiveRoutes = single ? 1 : 2;
  const exculpationRoutes = spec.corroboration === 'full' ? 2 : 1;
  const needs = (leg: 'access' | 'method' | 'motive'): boolean => spec.legs.includes(leg);
  const failures: string[] = [];
  const M = c.solution.murderTick;
  const L = c.solution.murderPlaceId;
  const killerId = c.solution.killerId;
  const clues = c.findable;

  const deduction: DeductionPath = {
    timeOfDeath: [],
    timeOfDeathAnchors: [],
    exculpations: {},
    inculpation: [],
    access: [],
    method: [],
    motive: [],
  };

  const scheduleOf = (id: Id) => c.schedules.find((s) => s.personId === id);
  const suspects = c.people.filter((p) => p.kind === 'suspect');
  const innocents = suspects.filter((p) => p.id !== killerId);

  /* 1. Time of death, four ticks down to one. ---------------------------- */
  const morgue = clues.find((cl) => cl.kind === 'morgue');
  const morgueFact = morgue?.establishes.find((f) => f.kind === 'timeOfDeath');
  if (!morgue || !morgueFact || morgueFact.kind !== 'timeOfDeath') {
    failures.push('no morgue report');
  } else {
    const [lo, hi] = morgueFact.ticks as [Tick, Tick];
    if (hi - lo + 1 !== shape.coronerWidth) {
      const width = { 1: 'one tick', 2: 'two ticks', 4: 'four ticks' }[shape.coronerWidth];
      failures.push(`the coroner window is not ${width}`);
    }
    if (M < lo || M > hi) failures.push('the coroner window does not contain the murder tick');
  }
  const alive = establishing(
    clues,
    (f, cl) => f.kind === 'victimAliveAt' && f.tick === M - 1 && cl.anchorId !== undefined,
  );
  const dead = establishing(clues, (f) => f.kind === 'victimDeadBy' && f.tick === M);
  const anchorsOf = (list: Clue[]): Id[] => {
    const anchorIds = new Set<Id>();
    for (const cl of list) if (cl.anchorId) anchorIds.add(cl.anchorId);
    return [...anchorIds].sort();
  };
  if (shape.anchorsRequired < 2) {
    // M7: the coroner's window is an hour, or the half hour itself. One
    // anchor, the victim alive at the half hour before, closes an hour; the
    // half hour needs nothing.
    deduction.timeOfDeath = ids([...(morgue ? [morgue] : []), ...alive, ...dead]);
    deduction.timeOfDeathAnchors = anchorsOf([...alive, ...dead]);
    if (shape.anchorsRequired === 1) {
      if (alive.length === 0) {
        failures.push('nothing puts the victim alive at the tick before the murder');
      } else if (independentSources(alive) < bigFiveRoutes) {
        failures.push(`the victim alive rests on fewer than ${bigFiveRoutes} sources`);
      }
    }
  } else if (alive.length === 0) {
    failures.push('nothing puts the victim alive at the tick before the murder');
  } else if (dead.length === 0) {
    failures.push('nothing closes the window from above');
  } else if (independentSources([...alive, ...dead]) < 2) {
    failures.push('only one independent route to the time of death');
  } else {
    deduction.timeOfDeath = ids([...(morgue ? [morgue] : []), ...alive, ...dead]);
    const anchorIds = new Set<Id>();
    for (const cl of [...alive, ...dead]) if (cl.anchorId) anchorIds.add(cl.anchorId);
    deduction.timeOfDeathAnchors = [...anchorIds].sort();
    if (deduction.timeOfDeathAnchors.length < 2) {
      failures.push('the time of death does not hang on two anchors');
    }
  }

  /* 2. Every innocent is cleared. ----------------------------------------
   *
   * One route, not two. With one subject per clue, insisting on two witnesses
   * for each of five innocents costs ten clues of a fifteen-clue spine and
   * leaves no room for the rest of the proof. A second route is common — the
   * disqualifier at the end of an innocent's own branch usually supplies it —
   * but it is not required.
   */
  for (const p of innocents) {
    const cands = establishing(
      clues,
      (f) =>
        (f.kind === 'personAt' && f.personId === p.id && f.tick === M && f.place !== L) ||
        (f.kind === 'personNotAt' && f.personId === p.id && f.tick === M && f.place === L),
    );
    if (independentSources(cands) < exculpationRoutes) {
      failures.push(`${p.name} is not exculpable at the murder tick`);
    } else {
      deduction.exculpations[p.id] = ids(cands);
    }
  }

  /* 3. The killer is not. ------------------------------------------------ */
  const killerClaim = scheduleOf(killerId)?.claimed[M] ?? null;
  if (!killerClaim) {
    failures.push('the killer claims nothing for the murder tick');
  } else {
    const contradictions = establishing(
      clues,
      (f) =>
        f.kind === 'personNotAt' && f.personId === killerId && f.tick === M && f.place === killerClaim,
    );
    if (independentSources(contradictions) < bigFiveRoutes) {
      failures.push("the killer's alibi is not contradicted from two independent sources");
    } else {
      deduction.inculpation = ids(contradictions);
    }
  }
  // M7: a leg the tier does not ask for is still printed when the hand has
  // it, and never failed for.
  const access = establishing(
    clues,
    (f) => f.kind === 'hadAccess' && f.personId === killerId && f.methodId === c.method.id,
  );
  if (!needs('access')) {
    deduction.access = ids(access);
  } else if (independentSources(access) < bigFiveRoutes) {
    failures.push('nothing independent ties the killer to the weapon');
  } else {
    deduction.access = ids(access);
  }

  /* 4. The method. -------------------------------------------------------- */
  const methodClues = establishing(
    clues,
    (f) => f.kind === 'methodEvidence' && f.methodId === c.method.id,
  );
  if (!needs('method')) {
    deduction.method = ids(methodClues);
  } else if (independentSources(methodClues) < bigFiveRoutes) {
    failures.push('the method rests on a single source');
  } else {
    deduction.method = ids(methodClues);
  }

  /* 5. The motive. -------------------------------------------------------- */
  const motiveClues = establishing(
    clues,
    (f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === c.solution.motiveType,
  );
  if (!needs('motive')) {
    deduction.motive = ids(motiveClues);
  } else if (independentSources(motiveClues) < bigFiveRoutes) {
    failures.push('the motive rests on a single source');
  } else {
    deduction.motive = ids(motiveClues);
  }

  /* M7: single route. ------------------------------------------------------
   *
   * At the DA's Office every essential fact has exactly one source in the
   * proof. The one thing that may say it again is the disqualifier at the
   * end of an innocent's own branch, which places a liar where the secret
   * was — and that is noise the player has to chase to reach.
   */
  if (single) {
    const proof = clues.filter((cl) => cl.role === 'spine' || cl.role === 'corroboration');
    for (const r of buildRequirements(requirementInputForCase(c), proof, spec)) {
      for (const part of r.parts) {
        const n = independentSources(part.clues);
        if (n !== 1) failures.push(`${part.key} has ${n} routes where the DA allows one`);
      }
    }
  }

  /* Interestingness. ------------------------------------------------------ */
  const [liarMin] = liarsFor(shape, ladder);
  const liarsAtM = innocents.filter((p) => (scheduleOf(p.id)?.lies ?? []).includes(M));
  if (liarsAtM.length < liarMin) {
    failures.push(`fewer than ${liarMin} innocents lie about the murder tick`);
  }
  // M7: below Medium only the culprit has a motive, and below Hard-boiled not
  // every innocent has a secret; a suspect with nothing to hide is simply
  // somebody who was out that evening.
  if (shape.innocentMotives > 0 && !innocents.some((p) => p.motive)) {
    failures.push('no innocent has a motive');
  }
  if (shape.innocentSecrets >= innocents.length) {
    for (const p of suspects) {
      const s = scheduleOf(p.id);
      if ((s?.lies.length ?? 0) === 0 && !p.motive && !p.secret) {
        failures.push(`${p.name} is dead weight: no lie, no motive, no secret`);
      }
    }
  }
  const othersWithAccess = suspects.filter(
    (p) =>
      p.id !== killerId &&
      establishing(clues, (f) => f.kind === 'hadAccess' && f.personId === p.id).length > 0,
  );
  if (needs('access') && othersWithAccess.length === 0) {
    failures.push('the killer is the only person the player can see near the weapon');
  }

  /* The shape of the hand. ------------------------------------------------ */
  // M7: the hand is 34 ± 2 on the legacy ladders. Elsewhere its size is a
  // target the noise ratio is allowed to move, so only the ratio is held.
  if (legacy) {
    const lo = shape.findable - FINDABLE_TOLERANCE;
    const hi = shape.findable + FINDABLE_TOLERANCE;
    if (clues.length < lo || clues.length > hi) {
      failures.push(
        `the findable set is ${clues.length} clues, not ${shape.findable} \u00b1 ${FINDABLE_TOLERANCE}`,
      );
    }
  }
  const spine = clues.filter((cl) => cl.role === 'spine');
  const spineCap = spineCapFor(shape);
  if (spine.length > spineCap) {
    failures.push(`the spine is ${spine.length} clues, over the cap of ${spineCap}`);
  }
  const [parFloor, parCeiling] = shape.par;
  if (c.par < parFloor) failures.push(`par ${c.par} is under the floor of ${parFloor}`);
  if (c.par > parCeiling) failures.push(`par ${c.par} is over the ceiling of ${parCeiling}`);
  const slack = slackFor(shape, ladder, c.par);
  if (c.slack !== slack) {
    failures.push(`slack ${c.slack} is not the ${slack} ${ladder.name} allows at par ${c.par}`);
  }
  if (c.budget !== c.par + c.slack) {
    failures.push(`budget ${c.budget} is not par ${c.par} plus slack ${c.slack}`);
  }

  /* One subject per observation or denial. No roll calls. ----------------- */
  for (const cl of clues) {
    if (cl.kind !== 'observation' && cl.kind !== 'denial') continue;
    const subjects = new Set(
      cl.establishes
        .filter((f) => f.kind === 'personAt' || f.kind === 'personNotAt')
        .map((f) => (f as { personId: Id }).personId),
    );
    if (subjects.size > 1) {
      failures.push(`${cl.id} is a roll call: it places ${subjects.size} people at once`);
    }
  }

  /* Sound consistency: heard, or masked, never both. ---------------------- */
  const heard = c.candidates.filter((cl) =>
    cl.establishes.some((f) => f.kind === 'noiseAt' && f.place === L && f.tick === M),
  );
  if (c.soundMasked && heard.length > 0) {
    failures.push(`${heard.length} clues hear a killing the anchor was loud enough to bury`);
  }
  const maskPhrases = MASKING_PHRASES.filter((phrase) =>
    c.candidates.some((cl) => cl.text.includes(phrase)),
  );
  if (!c.soundMasked && maskPhrases.length > 0) {
    failures.push(`a clue calls the noise covered in a case where people heard it`);
  }

  const noiseCount = clues.filter(
    (cl) => cl.role === 'noise' || cl.role === 'disqualifier',
  ).length;
  const noiseShare = clues.length === 0 ? 0 : noiseCount / clues.length;
  const [nLo, nHi] = ladder.noiseRatio;
  if (noiseShare < nLo - 1e-9 || noiseShare > nHi + 1e-9) {
    failures.push(
      `noise is ${Math.round(noiseShare * 100)}% of the hand, outside ` +
        `${Math.round(nLo * 100)}-${Math.round(nHi * 100)}%`,
    );
  }

  const innocentIds = new Set(innocents.map((p) => p.id));
  const lies: Record<Id, Tick[]> = {};
  for (const s of c.schedules) lies[s.personId] = s.lies;
  for (const cl of clues) {
    if (cl.role !== 'noise' && cl.role !== 'disqualifier') continue;
    if (cl.aboutSecretOf && innocentIds.has(cl.aboutSecretOf)) continue;
    // M7: or a loose end, off a ladder that is not the legacy one.
    if (
      !legacy &&
      cl.role === 'noise' &&
      !cl.branchId &&
      isLooseEnd(cl, { murderTick: M, innocentIds }, lies)
    ) {
      continue;
    }
    failures.push(`${cl.id} is noise that does not come out of an innocent's secret`);
  }
  const branches = new Map<Id, Clue[]>();
  for (const cl of clues) {
    if (!cl.branchId) continue;
    const list = branches.get(cl.branchId) ?? [];
    list.push(cl);
    branches.set(cl.branchId, list);
  }
  const activitySeen = new Map<string, Id>();
  for (const [branchId, list] of branches) {
    const disq = list.filter((cl) => cl.role === 'disqualifier');
    if (disq.length === 0) {
      failures.push(`branch ${branchId} never gets disqualified`);
    } else if (disq.length > 1) {
      failures.push(`branch ${branchId} is disqualified ${disq.length} times over`);
    }
    // One branch per secret *activity*: an affair is two people and one
    // branch, whose single disqualifier clears them both.
    const keys = new Set(
      list
        .map((cl) => cl.aboutSecretOf)
        .filter((id): id is Id => id !== undefined)
        .map((id) => activityKey(c, id)),
    );
    if (keys.size > 1) {
      failures.push(`branch ${branchId} covers ${keys.size} different secrets`);
    }
    for (const key of keys) {
      const already = activitySeen.get(key);
      if (already !== undefined) {
        failures.push(`branches ${already} and ${branchId} are the same secret twice`);
      } else {
        activitySeen.set(key, branchId);
      }
    }
  }
  // M7: three branches, or one per secret the tier deals when that is fewer.
  const activities = new Set(
    innocents.filter((p) => p.secret).map((p) => activityKey(c, p.id)),
  );
  const branchFloor = legacy ? BRANCH_COUNT_FLOOR : Math.min(BRANCH_COUNT_FLOOR, activities.size);
  if (branches.size < branchFloor) {
    failures.push(`only ${branches.size} noise branches, fewer than ${branchFloor}`);
  }

  const byId = new Map(clues.map((cl) => [cl.id, cl]));
  const reached = new Set<Id>(c.starting);
  const queue = [...reached];
  while (queue.length > 0) {
    const cur = byId.get(queue.shift() as Id);
    if (!cur) continue;
    for (const next of cur.leadsTo) {
      if (reached.has(next) || !byId.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
  }
  if (reached.size !== clues.length) {
    failures.push(`${clues.length - reached.size} findable clues cannot be reached from the opening`);
  }

  return { ok: failures.length === 0, failures, deduction };
}
