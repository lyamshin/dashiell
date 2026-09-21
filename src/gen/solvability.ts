import type { Case, Clue, DeductionPath, Fact, Id, Tick } from './types.js';

export interface CheckResult {
  ok: boolean;
  failures: string[];
  deduction: DeductionPath;
}

export type CaseUnderTest = Omit<Case, 'deduction'>;

function sourceKey(clue: Clue): string {
  return clue.source.type === 'person' ? `p:${clue.source.personId}` : `l:${clue.source.locationId}`;
}

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

function establishing(clues: Clue[], pred: (f: Fact) => boolean): Clue[] {
  return clues.filter((c) => c.establishes.some(pred));
}

/**
 * The spec's five conditions, plus the four interestingness heuristics.
 * Returns the proof it found, so the truth sheet can print it.
 */
export function checkSolvability(c: CaseUnderTest): CheckResult {
  const failures: string[] = [];
  const M = c.solution.murderTick;
  const L = c.solution.murderLocationId;
  const killerId = c.solution.killerId;
  const clues = c.clues;

  const deduction: DeductionPath = {
    timeOfDeath: [],
    exculpations: {},
    inculpation: [],
    method: [],
    motive: [],
  };

  const scheduleOf = (id: Id) => c.schedules.find((s) => s.personId === id);
  const suspects = c.people.filter((p) => p.kind === 'suspect');
  const innocents = suspects.filter((p) => p.id !== killerId);

  /* 1. Time of death. ---------------------------------------------------- */
  const morgue = clues.find((cl) => cl.kind === 'morgue');
  const morgueFact = morgue?.establishes.find((f) => f.kind === 'timeOfDeath');
  if (!morgue || !morgueFact || morgueFact.kind !== 'timeOfDeath') {
    failures.push('no morgue report');
  } else {
    const range = morgueFact.ticks;
    if (!range.includes(M)) failures.push('morgue range does not contain the murder tick');
    const eliminators: Clue[] = [];
    let allEliminated = true;
    for (const wrong of range.filter((t) => t !== M)) {
      const cands =
        wrong < M
          ? establishing(clues, (f) => f.kind === 'victimAliveAt' && f.tick >= wrong)
          : establishing(clues, (f) => f.kind === 'noiseAt' && f.location === L && f.tick === M);
      if (cands.length === 0) {
        allEliminated = false;
        break;
      }
      eliminators.push(...cands);
    }
    if (!allEliminated) {
      failures.push('time of death cannot be narrowed to a single tick');
    } else if (independentSources(eliminators) < 2) {
      failures.push('only one independent route to the time of death');
    } else {
      deduction.timeOfDeath = ids([morgue, ...eliminators]);
    }
  }

  /* 2. Every innocent is cleared. ---------------------------------------- */
  for (const p of innocents) {
    const cands = establishing(
      clues,
      (f) =>
        (f.kind === 'personAt' && f.personId === p.id && f.tick === M && f.location !== L) ||
        (f.kind === 'personNotAt' && f.personId === p.id && f.tick === M && f.location === L),
    );
    if (independentSources(cands) < 2) {
      failures.push(`${p.name} is not exculpable at the murder tick`);
    } else {
      deduction.exculpations[p.id] = ids(cands);
    }
  }

  /* 3. The killer is not. ------------------------------------------------ */
  const killerSchedule = scheduleOf(killerId);
  const killerClaim = killerSchedule?.claimed[M] ?? null;
  if (!killerClaim) {
    failures.push('the killer claims nothing for the murder tick');
  } else {
    const contradictions = establishing(
      clues,
      (f) => f.kind === 'personNotAt' && f.personId === killerId && f.tick === M && f.location === killerClaim,
    );
    const access = establishing(
      clues,
      (f) => f.kind === 'hadAccess' && f.personId === killerId && f.methodId === c.method.id,
    );
    if (independentSources(contradictions) < 2) {
      failures.push("the killer's alibi is not contradicted from two independent sources");
    } else if (access.length === 0) {
      failures.push('nothing ties the killer to the method');
    } else {
      deduction.inculpation = ids([...contradictions, ...access]);
    }
  }

  /* 4. The method. -------------------------------------------------------- */
  const methodClues: Clue[] = [];
  if (morgue) methodClues.push(morgue);
  methodClues.push(
    ...establishing(clues, (f) => f.kind === 'objectMissing' && f.objectId === c.method.evidenceObjectId),
  );
  methodClues.push(...establishing(clues, (f) => f.kind === 'noiseAt' && f.location === L));
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
  const liarsAtM = innocents.filter((p) => (scheduleOf(p.id)?.lies ?? []).includes(M as Tick));
  if (liarsAtM.length < 2) failures.push('fewer than two innocents lie about the murder tick');

  if (!innocents.some((p) => p.motive)) failures.push('no innocent has a motive');

  for (const p of suspects) {
    const s = scheduleOf(p.id);
    const fullyCorroborated = (s?.lies.length ?? 0) === 0;
    if (fullyCorroborated && !p.motive && !p.secret) {
      failures.push(`${p.name} is dead weight: no lie, no motive, no secret`);
    }
  }

  const othersWithAccess = suspects.filter(
    (p) =>
      p.id !== killerId &&
      establishing(clues, (f) => f.kind === 'hadAccess' && f.personId === p.id).length > 0,
  );
  if (othersWithAccess.length === 0) {
    failures.push('the killer is the only person with access to the method');
  }

  return { ok: failures.length === 0, failures, deduction };
}
