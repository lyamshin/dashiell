import {
  BRANCH_COUNT_FLOOR,
  FINDABLE_TARGET,
  FINDABLE_TOLERANCE,
  M_LIARS,
  NOISE_RATIO,
  PAR_CEILING,
  PAR_FLOOR,
  SLACK,
  SPINE_CAP,
  type Case,
  type Clue,
  type DeductionPath,
  type Fact,
  type Id,
  type Tick,
} from './types.js';
import { sourceKey } from './select.js';
import { MASKING_PHRASES } from './data/anchors.js';

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
    if (hi - lo + 1 !== 4) failures.push('the coroner window is not four ticks');
    if (M < lo || M > hi) failures.push('the coroner window does not contain the murder tick');
  }
  const alive = establishing(
    clues,
    (f, cl) => f.kind === 'victimAliveAt' && f.tick === M - 1 && cl.anchorId !== undefined,
  );
  const dead = establishing(clues, (f) => f.kind === 'victimDeadBy' && f.tick === M);
  if (alive.length === 0) {
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
    if (independentSources(cands) < 1) {
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
    if (independentSources(contradictions) < 2) {
      failures.push("the killer's alibi is not contradicted from two independent sources");
    } else {
      deduction.inculpation = ids(contradictions);
    }
  }
  const access = establishing(
    clues,
    (f) => f.kind === 'hadAccess' && f.personId === killerId && f.methodId === c.method.id,
  );
  if (independentSources(access) < 2) {
    failures.push('nothing independent ties the killer to the weapon');
  } else {
    deduction.access = ids(access);
  }

  /* 4. The method. -------------------------------------------------------- */
  const methodClues = establishing(
    clues,
    (f) => f.kind === 'methodEvidence' && f.methodId === c.method.id,
  );
  if (independentSources(methodClues) < 2) {
    failures.push('the method rests on a single source');
  } else {
    deduction.method = ids(methodClues);
  }

  /* 5. The motive. -------------------------------------------------------- */
  const motiveClues = establishing(
    clues,
    (f) => f.kind === 'hasMotive' && f.personId === killerId && f.motiveType === c.solution.motiveType,
  );
  if (independentSources(motiveClues) < 2) {
    failures.push('the motive rests on a single source');
  } else {
    deduction.motive = ids(motiveClues);
  }

  /* Interestingness. ------------------------------------------------------ */
  const [liarMin] = M_LIARS[c.difficulty];
  const liarsAtM = innocents.filter((p) => (scheduleOf(p.id)?.lies ?? []).includes(M));
  if (liarsAtM.length < liarMin) {
    failures.push(`fewer than ${liarMin} innocents lie about the murder tick`);
  }
  if (!innocents.some((p) => p.motive)) failures.push('no innocent has a motive');
  for (const p of suspects) {
    const s = scheduleOf(p.id);
    if ((s?.lies.length ?? 0) === 0 && !p.motive && !p.secret) {
      failures.push(`${p.name} is dead weight: no lie, no motive, no secret`);
    }
  }
  const othersWithAccess = suspects.filter(
    (p) =>
      p.id !== killerId &&
      establishing(clues, (f) => f.kind === 'hadAccess' && f.personId === p.id).length > 0,
  );
  if (othersWithAccess.length === 0) {
    failures.push('the killer is the only person the player can see near the weapon');
  }

  /* The shape of the hand. ------------------------------------------------ */
  const lo = FINDABLE_TARGET - FINDABLE_TOLERANCE;
  const hi = FINDABLE_TARGET + FINDABLE_TOLERANCE;
  if (clues.length < lo || clues.length > hi) {
    failures.push(
      `the findable set is ${clues.length} clues, not ${FINDABLE_TARGET} \u00b1 ${FINDABLE_TOLERANCE}`,
    );
  }
  const spine = clues.filter((cl) => cl.role === 'spine');
  if (spine.length > SPINE_CAP) {
    failures.push(`the spine is ${spine.length} clues, over the cap of ${SPINE_CAP}`);
  }
  if (c.par < PAR_FLOOR) failures.push(`par ${c.par} is under the floor of ${PAR_FLOOR}`);
  if (c.par > PAR_CEILING) failures.push(`par ${c.par} is over the ceiling of ${PAR_CEILING}`);
  if (c.slack !== SLACK[c.difficulty]) {
    failures.push(`slack ${c.slack} is not the ${SLACK[c.difficulty]} difficulty ${c.difficulty} allows`);
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
  if (noiseShare < NOISE_RATIO[0] || noiseShare > NOISE_RATIO[1]) {
    failures.push(`noise is ${Math.round(noiseShare * 100)}% of the hand, outside 35-45%`);
  }

  const innocentIds = new Set(innocents.map((p) => p.id));
  for (const cl of clues) {
    if (cl.role !== 'noise' && cl.role !== 'disqualifier') continue;
    if (!cl.aboutSecretOf || !innocentIds.has(cl.aboutSecretOf)) {
      failures.push(`${cl.id} is noise that does not come out of an innocent's secret`);
    }
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
  if (branches.size < BRANCH_COUNT_FLOOR) {
    failures.push(`only ${branches.size} noise branches, fewer than ${BRANCH_COUNT_FLOOR}`);
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
