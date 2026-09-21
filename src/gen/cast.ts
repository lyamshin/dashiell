import type { Id, Person } from './types.js';
import { NAME_POOLS } from './data/names.js';
import { RELATIONSHIPS, SUSPECT_ROLES, VICTIM_ROLES } from './data/roles.js';
import { METHOD_TEMPLATES, type MethodTemplate } from './data/methods.js';
import { MOTIVE_TEMPLATES, type MotiveTemplate } from './data/motives.js';
import { SECRET_TEMPLATES, type SecretTemplate } from './data/secrets.js';
import type { Rng } from './rng.js';

export interface Cast {
  people: Person[];
  victim: Person;
  suspects: Person[];
  killer: Person;
  innocents: Person[];
  doorman: Person;
  bartender: Person;
  method: MethodTemplate;
  killerMotive: MotiveTemplate;
  /** Person id -> secret template. Innocents only; the killer's secret is the murder. */
  innocentSecrets: Record<Id, SecretTemplate>;
  /** The killer's optional second secret, muddying the water. Never an affair. */
  killerCoverSecret?: SecretTemplate;
}

const WITNESSABLE = (t: SecretTemplate): boolean => t.witnessLocations.length > 0;

function makeNamer(rng: Rng): (gender?: 'male' | 'female') => string {
  const usedGiven = new Set<string>();
  const usedFamily = new Set<string>();
  return (gender) => {
    for (let i = 0; i < 400; i++) {
      const pool = rng.pick(NAME_POOLS);
      const g = gender ?? (rng.chance(0.5) ? 'male' : 'female');
      const given = rng.pick(pool.given[g]);
      const family = rng.pick(pool.family);
      if (usedGiven.has(given) || usedFamily.has(family)) continue;
      usedGiven.add(given);
      usedFamily.add(family);
      return `${given} ${family}`;
    }
    throw new Error('name pool exhausted');
  };
}

export function buildCast(rng: Rng): Cast {
  const name = makeNamer(rng);

  const victimRole = rng.pick(VICTIM_ROLES);
  const victim: Person = {
    id: 'p-victim',
    name: name(victimRole.gender),
    role: victimRole.text,
    kind: 'victim',
    isKiller: false,
  };

  const roles = rng.pickN(SUSPECT_ROLES, 6);
  const relationships = rng.pickN(RELATIONSHIPS, 6);
  const suspects: Person[] = roles.map((role, i) => ({
    id: `p-s${i + 1}`,
    name: name(role.gender),
    role: role.text,
    kind: 'suspect' as const,
    relationshipToVictim: relationships[i] as string,
    isKiller: false,
  }));

  const doorman: Person = {
    id: 'p-doorman',
    name: name(rng.chance(0.75) ? 'male' : 'female'),
    role: 'the doorman',
    kind: 'fixture',
    isKiller: false,
  };
  const bartender: Person = {
    id: 'p-bartender',
    name: name(),
    role: 'the bartender',
    kind: 'fixture',
    isKiller: false,
  };

  const killerIndex = rng.int(6);
  const killer = suspects[killerIndex] as Person;
  killer.isKiller = true;
  const innocents = suspects.filter((s) => s.id !== killer.id);

  const method = rng.pick(METHOD_TEMPLATES);

  // Motives: the killer always, plus one to three innocents, all distinct types.
  const motivePool = rng.shuffle(MOTIVE_TEMPLATES);
  const killerMotive = motivePool[0] as MotiveTemplate;
  killer.motive = { type: killerMotive.type, description: killerMotive.description };
  const innocentMotiveCount = rng.range(1, 3);
  for (const [i, person] of rng.shuffle(innocents).slice(0, innocentMotiveCount).entries()) {
    const t = motivePool[1 + i] as MotiveTemplate;
    person.motive = { type: t.type, description: t.description };
  }

  // Secrets for the five innocents. At least three must be the kind that can
  // sit on the murder tick and still be witnessed, or the interestingness
  // heuristic "two innocents lie about the murder tick" has nothing to work
  // with and every attempt would be thrown away.
  let picks: SecretTemplate[] = [];
  for (let i = 0; i < innocents.length; i++) picks.push(rng.pick(SECRET_TEMPLATES));
  const witnessable = SECRET_TEMPLATES.filter(WITNESSABLE);
  while (picks.filter(WITNESSABLE).length < 3) {
    const swapIndex = picks.findIndex((p) => !WITNESSABLE(p));
    if (swapIndex < 0) break;
    picks[swapIndex] = rng.pick(witnessable);
  }
  // Affairs come in pairs. An odd one out gets re-rolled into something solo.
  const affairIndexes = picks.map((p, i) => (p.type === 'affair' ? i : -1)).filter((i) => i >= 0);
  if (affairIndexes.length % 2 === 1) {
    const solo = SECRET_TEMPLATES.filter((t) => t.type !== 'affair');
    picks[affairIndexes[affairIndexes.length - 1] as number] = rng.pick(solo);
  }
  if (picks.filter((p) => p.type === 'affair').length > 2) {
    // Keep it to a single couple; three is a farce, not a mystery.
    const extra = picks.map((p, i) => (p.type === 'affair' ? i : -1)).filter((i) => i >= 0).slice(2);
    const solo = SECRET_TEMPLATES.filter((t) => t.type !== 'affair');
    for (const i of extra) picks[i] = rng.pick(solo);
    if (picks.filter((p) => p.type === 'affair').length % 2 === 1) {
      const lone = picks.findIndex((p) => p.type === 'affair');
      picks[lone] = rng.pick(solo);
    }
  }

  const innocentSecrets: Record<Id, SecretTemplate> = {};
  innocents.forEach((p, i) => {
    innocentSecrets[p.id] = picks[i] as SecretTemplate;
  });

  const cast: Cast = {
    people: [victim, ...suspects, doorman, bartender],
    victim,
    suspects,
    killer,
    innocents,
    doorman,
    bartender,
    method,
    killerMotive,
    innocentSecrets,
  };

  if (rng.chance(0.5)) {
    const coverPool = SECRET_TEMPLATES.filter((t) => t.type !== 'affair');
    cast.killerCoverSecret = rng.pick(coverPool);
  }

  return cast;
}
