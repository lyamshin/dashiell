import type { Difficulty, FixtureRole, Id, Person } from './types.js';
import { M_LIARS } from './types.js';
import { NAME_POOLS } from './data/names.js';
import {
  ARCHETYPE_BY_ID,
  RELATIONSHIP_BY_ID,
  VICTIM_ARCHETYPES,
  type Archetype,
  type SuspectClass,
  type VictimArchetype,
} from './data/cast.js';
import { MOTIVE_TEMPLATES, type MotiveTemplate } from './data/motives.js';
import { SECRET_BY_TYPE, type SecretTemplate } from './data/secrets.js';
import type { Setting } from './setting.js';
import type { Rng } from './rng.js';

export interface Cast {
  people: Person[];
  victim: Person;
  victimArchetype: VictimArchetype;
  suspects: Person[];
  killer: Person;
  innocents: Person[];
  fixtures: Person[];
  beatCop?: Person;
  /** place id -> the fixture posted there. */
  watcherOf: Record<Id, Id>;
  killerMotive: MotiveTemplate;
  /** Innocents only; the killer's secret is the murder. */
  innocentSecrets: Record<Id, SecretTemplate>;
  killerCoverSecret?: SecretTemplate;
  /** Innocents who will lie about the murder tick. */
  mLiarIds: Id[];
  client: Person;
}

const FIXTURE_ROLE_TEXT: Record<FixtureRole, string> = {
  bartender: 'the bartender',
  doorman: 'the doorman',
  newsstand: 'the news dealer',
  counterman: 'the man behind the counter',
  'ticket-taker': 'the ticket-taker',
  'elevator-man': 'the elevator man',
  landlady: 'the landlady',
  'beat-cop': 'the patrolman on the beat',
  cabbie: 'the hackman on the stand',
  druggist: 'the druggist',
};

const FIXTURE_GENDER: Partial<Record<FixtureRole, 'male' | 'female'>> = {
  landlady: 'female',
  'beat-cop': 'male',
  doorman: 'male',
  'elevator-man': 'male',
};

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

function genderOf(hint: 'm' | 'f' | 'any' | undefined): 'male' | 'female' | undefined {
  if (hint === 'm') return 'male';
  if (hint === 'f') return 'female';
  return undefined;
}

/** Six archetypes with distinct roles and at least one of three classes. */
function drawArchetypes(rng: Rng, victim: VictimArchetype): Archetype[] | null {
  const pool = victim.allowedSuspects
    .map((id) => ARCHETYPE_BY_ID[id])
    .filter((a): a is Archetype => a !== undefined);
  const needed: SuspectClass[] = ['money', 'working', 'underworld'];
  for (let attempt = 0; attempt < 40; attempt++) {
    const picked = rng.pickN(pool, 6);
    if (picked.length < 6) return null;
    const classes = new Set(picked.map((a) => a.class));
    if (needed.every((c) => classes.has(c))) return picked;
  }
  return null;
}

export function buildCast(rng: Rng, setting: Setting, difficulty: Difficulty): Cast | null {
  const name = makeNamer(rng);

  const victimArchetype = rng.pick(VICTIM_ARCHETYPES);
  const victim: Person = {
    id: 'p-victim',
    name: name(genderOf(victimArchetype.genderHint)),
    role: victimArchetype.role,
    kind: 'victim',
    archetypeId: victimArchetype.id,
    isKiller: false,
  };

  const archetypes = drawArchetypes(rng, victimArchetype);
  if (!archetypes) return null;

  const suspects: Person[] = archetypes.map((a, i) => {
    const relId = rng.pick(a.relationships);
    const rel = RELATIONSHIP_BY_ID[relId];
    const person: Person = {
      id: `p-s${i + 1}`,
      name: name(genderOf(a.genderHint)),
      role: a.role,
      kind: 'suspect',
      archetypeId: a.id,
      relationshipId: relId,
      relationshipToVictim: rel?.text ?? relId,
      isKiller: false,
    };
    return person;
  });

  const archetypeOf = (p: Person): Archetype => ARCHETYPE_BY_ID[p.archetypeId as Id] as Archetype;
  const allowedMotives = (p: Person): string[] => {
    const a = archetypeOf(p);
    const rel = RELATIONSHIP_BY_ID[p.relationshipId as Id];
    const implied = rel?.impliesMotives;
    return implied ? a.motives.filter((m) => implied.includes(m)) : a.motives.slice();
  };

  /* --- the killer, who always has a motive ----------------------------- */
  const killerCandidates = suspects.filter((p) => allowedMotives(p).length > 0);
  if (killerCandidates.length === 0) return null;
  const killer = rng.pick(killerCandidates);
  killer.isKiller = true;
  const innocents = suspects.filter((p) => p.id !== killer.id);

  const killerMotiveType = rng.pick(allowedMotives(killer));
  const killerMotive = MOTIVE_TEMPLATES.find((m) => m.type === killerMotiveType) as MotiveTemplate;
  killer.motive = { type: killerMotive.type, description: killerMotive.description };

  /* --- one to three innocents carry a motive too ----------------------- */
  const usedMotives = new Set<string>([killerMotiveType]);
  const wantInnocentMotives = rng.range(1, 3);
  let given = 0;
  for (const p of rng.shuffle(innocents)) {
    if (given >= wantInnocentMotives) break;
    const fresh = allowedMotives(p).filter((m) => !usedMotives.has(m));
    if (fresh.length === 0) continue;
    const type = rng.pick(fresh);
    const t = MOTIVE_TEMPLATES.find((m) => m.type === type) as MotiveTemplate;
    p.motive = { type: t.type, description: t.description };
    usedMotives.add(type);
    given++;
  }
  if (given === 0) return null;

  /* --- secrets, constrained by what the drawn places can host ---------- */
  const hostedAnywhere = new Set<string>();
  const hostedWatched = new Set<string>();
  for (const t of Object.values(setting.templates)) {
    if (t.id === setting.murderPlaceId) continue;
    for (const s of t.secretsHosted) {
      hostedAnywhere.add(s);
      if (t.watcher !== undefined) hostedWatched.add(s);
    }
  }
  // Forged identity needs no room: the lie is in the paperwork.
  hostedAnywhere.add('forged-identity');

  const [liarMin, liarMax] = M_LIARS[difficulty];
  const wantLiars = rng.range(liarMin, liarMax);

  // A secret that drags the victim along cannot sit on the murder tick: the
  // victim is busy being murdered. Nor can an affair, which needs a partner
  // and a room with no witnesses in it.
  const canLie = (p: Person): string[] =>
    archetypeOf(p).secrets.filter(
      (s) =>
        s !== 'affair' &&
        hostedWatched.has(s) &&
        (SECRET_BY_TYPE[s]?.partner ?? 'none') !== 'victim',
    );
  const canHide = (p: Person): string[] =>
    archetypeOf(p).secrets.filter((s) => s !== 'affair' && hostedAnywhere.has(s));

  const liarPool = rng.shuffle(innocents).filter((p) => canLie(p).length > 0);
  if (liarPool.length < wantLiars) return null;
  const liars = liarPool.slice(0, wantLiars);
  const liarIds = liars.map((p) => p.id);

  const innocentSecrets: Record<Id, SecretTemplate> = {};
  for (const p of liars) {
    innocentSecrets[p.id] = SECRET_BY_TYPE[rng.pick(canLie(p))] as SecretTemplate;
  }

  const rest = innocents.filter((p) => !liarIds.includes(p.id));

  // An affair takes two people who are both allowed one and a room that will
  // hold them, so it is settled before the singles are dealt with.
  let affairPair: Person[] = [];
  if (hostedAnywhere.has('affair') && rng.chance(0.55)) {
    const eligible = rng.shuffle(rest).filter((p) => archetypeOf(p).secrets.includes('affair'));
    if (eligible.length >= 2) affairPair = eligible.slice(0, 2);
  }
  for (const p of affairPair) {
    innocentSecrets[p.id] = SECRET_BY_TYPE['affair'] as SecretTemplate;
  }

  for (const p of rest) {
    if (innocentSecrets[p.id]) continue;
    const options = canHide(p);
    if (options.length === 0) return null;
    innocentSecrets[p.id] = SECRET_BY_TYPE[rng.pick(options)] as SecretTemplate;
  }

  let killerCoverSecret: SecretTemplate | undefined;
  if (rng.chance(0.5)) {
    const options = archetypeOf(killer).secrets.filter(
      (s) => s !== 'affair' && hostedAnywhere.has(s),
    );
    if (options.length > 0) killerCoverSecret = SECRET_BY_TYPE[rng.pick(options)] as SecretTemplate;
  }

  /* --- the watchers ----------------------------------------------------- */
  const fixtures: Person[] = [];
  const watcherOf: Record<Id, Id> = {};
  setting.watchers.forEach((w, i) => {
    const person: Person = {
      id: `p-f${i + 1}`,
      name: name(FIXTURE_GENDER[w.role]),
      role: FIXTURE_ROLE_TEXT[w.role],
      kind: 'fixture',
      fixtureRole: w.role,
      isKiller: false,
      foundAt: w.placeId,
    };
    fixtures.push(person);
    watcherOf[w.placeId] = person.id;
  });

  let beatCop: Person | undefined;
  if (setting.hasBeatCop) {
    beatCop = {
      id: 'p-cop',
      name: name('male'),
      role: FIXTURE_ROLE_TEXT['beat-cop'],
      kind: 'fixture',
      fixtureRole: 'beat-cop',
      isKiller: false,
      foundAt: setting.beatCopRoute[0] as Id,
    };
    fixtures.push(beatCop);
  }

  /* --- who hired us ------------------------------------------------------ */
  const client = rng.chance(0.25) ? killer : rng.pick(innocents);
  client.isClient = true;

  const cast: Cast = {
    people: [victim, ...suspects, ...fixtures],
    victim,
    victimArchetype,
    suspects,
    killer,
    innocents,
    fixtures,
    watcherOf,
    killerMotive,
    innocentSecrets,
    mLiarIds: liarIds,
    client,
  };
  if (beatCop) cast.beatCop = beatCop;
  if (killerCoverSecret) cast.killerCoverSecret = killerCoverSecret;
  return cast;
}
