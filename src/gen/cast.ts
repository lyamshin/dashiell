import type { Difficulty, Dossier, FixtureRole, Id, Mention, Person } from './types.js';
import { M_LIARS, surnameOf } from './types.js';
import { NAME_POOLS } from './data/names.js';
import {
  ARCHETYPE_BY_ID,
  BACKSTORY_YEARS,
  FIXTURE_CARDS,
  RELATIONSHIP_BY_ID,
  VICTIM_ARCHETYPES,
  type Archetype,
  type FixtureCard,
  type SuspectClass,
  type VictimArchetype,
} from './data/cast.js';
import { MOTIVE_TEMPLATES, type MotiveTemplate } from './data/motives.js';
import { SECRET_BY_TYPE, type SecretTemplate } from './data/secrets.js';
import {
  buildDossier,
  createMentionPool,
  fillSlots,
  relationshipOf,
  type MentionPool,
  type Namer,
} from './dossier.js';
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
  /* --- M5 ------------------------------------------------------------- */
  /** Third parties named in backstories and motives. Not people in the case. */
  mentions: MentionPool;
  /** Every person in the case, victim and fixtures included. */
  dossiers: Record<Id, Dossier>;
  /** The object of a person's motive, where the motive has one. */
  motiveObject: Record<Id, Mention>;
  /** Draws more period names out of the same pools, without collisions. */
  namer: Namer;
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

/**
 * Where the role's own words decide it. M5 states a person's gender as a fact
 * in their dossier, so "the man behind the counter" has to be a man.
 */
const FIXTURE_GENDER: Partial<Record<FixtureRole, 'male' | 'female'>> = {
  landlady: 'female',
  'beat-cop': 'male',
  doorman: 'male',
  'elevator-man': 'male',
  counterman: 'male',
  cabbie: 'male',
};

/**
 * M5: the namer now returns the gender it resolved, because a dossier states
 * gender as a fact and it has to be the one the given name came out of.
 */
function makeNamer(rng: Rng): Namer {
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
      return { name: `${given} ${family}`, gender: g === 'male' ? 'm' : 'f' };
    }
    throw new Error('name pool exhausted');
  };
}

function genderOf(hint: 'm' | 'f' | 'any' | undefined): 'male' | 'female' | undefined {
  if (hint === 'm') return 'male';
  if (hint === 'f') return 'female';
  return undefined;
}

/**
 * Which of an archetype's relationships to the victim actually hold up.
 *
 * `rel-rival` needs a shared trade tag, which is the whole point of M2b's cast
 * pass: a ward heeler is not a retired dry-goods wholesaler's rival in trade,
 * because neither of them is in the other's trade.
 */
export function relationshipsFor(a: Archetype, victim: VictimArchetype): Id[] {
  const victimGender = genderOf(victim.genderHint);
  const suspectGender = genderOf(a.genderHint);
  return a.relationships.filter((id) => {
    const rel = RELATIONSHIP_BY_ID[id];
    if (!rel) return false;
    if (rel.requiresTrade && (a.trade === undefined || a.trade !== victim.trade)) return false;
    if (rel.forcesGender && suspectGender !== undefined) {
      if (suspectGender !== genderOf(rel.forcesGender)) return false;
    }
    if (rel.opposeVictimGender) {
      if (victimGender === undefined) return false;
      if (suspectGender !== undefined && suspectGender === victimGender) return false;
    }
    return true;
  });
}

/** The gender a relationship forces on the suspect who takes it, if any. */
function genderFor(
  a: Archetype,
  victim: VictimArchetype,
  relId: Id,
): 'male' | 'female' | undefined {
  const rel = RELATIONSHIP_BY_ID[relId];
  if (rel?.forcesGender) return genderOf(rel.forcesGender);
  if (rel?.opposeVictimGender) {
    return genderOf(victim.genderHint) === 'male' ? 'female' : 'male';
  }
  return genderOf(a.genderHint);
}

/** Six archetypes with distinct roles and at least one of three classes. */
function drawArchetypes(rng: Rng, victim: VictimArchetype): Archetype[] | null {
  const pool = victim.allowedSuspects
    .map((id) => ARCHETYPE_BY_ID[id])
    .filter((a): a is Archetype => a !== undefined)
    .filter((a) => relationshipsFor(a, victim).length > 0);
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
  const mentions = createMentionPool(name);
  const motiveObject: Record<Id, Mention> = {};

  const victimArchetype = rng.pick(VICTIM_ARCHETYPES);
  const drawnVictim = name(genderOf(victimArchetype.genderHint));
  const victimName = drawnVictim.name;
  const victimSurname = surnameOf(victimName);
  const victim: Person = {
    id: 'p-victim',
    name: victimName,
    surname: victimSurname,
    role: victimArchetype.role,
    kind: 'victim',
    archetypeId: victimArchetype.id,
    isKiller: false,
    gender: drawnVictim.gender,
  };

  const archetypes = drawArchetypes(rng, victimArchetype);
  if (!archetypes) return null;

  const suspects: Person[] = [];
  for (const [i, a] of archetypes.entries()) {
    const options = relationshipsFor(a, victimArchetype);
    if (options.length === 0) return null;
    const relId = rng.pick(options);
    const rel = RELATIONSHIP_BY_ID[relId];
    // The relationship is drawn before the name, because some relationships
    // only read one way round and so decide who this person is.
    const drawn = name(genderFor(a, victimArchetype, relId));
    const fullName = drawn.name;
    suspects.push({
      id: `p-s${i + 1}`,
      name: fullName,
      surname: surnameOf(fullName),
      role: a.role,
      kind: 'suspect',
      archetypeId: a.id,
      relationshipId: relId,
      // M5 §3: the relationship names the victim. "Sweeney’s tenant", never
      // "the victim's tenant".
      relationshipToVictim: (rel?.text ?? relId).split('{V}').join(victimSurname),
      isKiller: false,
      gender: drawn.gender,
    });
  }

  const archetypeOf = (p: Person): Archetype => ARCHETYPE_BY_ID[p.archetypeId as Id] as Archetype;
  const allowedMotives = (p: Person): string[] => {
    const a = archetypeOf(p);
    const rel = RELATIONSHIP_BY_ID[p.relationshipId as Id];
    const implied = rel?.impliesMotives;
    return implied ? a.motives.filter((m) => implied.includes(m)) : a.motives.slice();
  };

  /**
   * M5 §3: a motive with no object is a category, not a motive. "Jealous"
   * becomes "jealous of Sweeney over Rosa Ferrante", and Rosa Ferrante is
   * invented once, here, and filed in the mentions.
   */
  const assignMotive = (p: Person, t: MotiveTemplate): void => {
    let object: Mention | undefined;
    if (t.objectRole !== undefined) {
      object = mentions.mentionFor(t.objectRole);
      motiveObject[p.id] = object;
    }
    p.motive = {
      type: t.type,
      description: fillSlots(t.descriptionTemplate, {
        victim: victimSurname,
        person: p.surname,
        place: '',
        year: '',
        ...(object ? { object: object.name } : {}),
      }),
    };
  };

  /* --- the killer, who always has a motive ----------------------------- */
  const killerCandidates = suspects.filter((p) => allowedMotives(p).length > 0);
  if (killerCandidates.length === 0) return null;
  const killer = rng.pick(killerCandidates);
  killer.isKiller = true;
  const innocents = suspects.filter((p) => p.id !== killer.id);

  const killerMotiveType = rng.pick(allowedMotives(killer));
  const killerMotive = MOTIVE_TEMPLATES.find((m) => m.type === killerMotiveType) as MotiveTemplate;
  assignMotive(killer, killerMotive);

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
    assignMotive(p, t);
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
    const drawn = name(FIXTURE_GENDER[w.role]);
    const person: Person = {
      id: `p-f${i + 1}`,
      name: drawn.name,
      surname: surnameOf(drawn.name),
      role: FIXTURE_ROLE_TEXT[w.role],
      kind: 'fixture',
      fixtureRole: w.role,
      isKiller: false,
      foundAt: w.placeId,
      gender: drawn.gender,
    };
    fixtures.push(person);
    watcherOf[w.placeId] = person.id;
  });

  let beatCop: Person | undefined;
  if (setting.hasBeatCop) {
    const drawn = name('male');
    beatCop = {
      id: 'p-cop',
      name: drawn.name,
      surname: surnameOf(drawn.name),
      role: FIXTURE_ROLE_TEXT['beat-cop'],
      kind: 'fixture',
      fixtureRole: 'beat-cop',
      isKiller: false,
      foundAt: setting.beatCopRoute[0] as Id,
      gender: drawn.gender,
    };
    fixtures.push(beatCop);
  }

  /* --- who hired us ------------------------------------------------------ */
  const client = rng.chance(0.25) ? killer : rng.pick(innocents);
  client.isClient = true;

  /* --- M5: a dossier for everybody --------------------------------------- */
  const dossiers: Record<Id, Dossier> = {};
  const fixturePlaceOf: Record<Id, Id> = {};
  for (const f of fixtures) if (f.foundAt) fixturePlaceOf[f.id] = f.foundAt;
  /** A drawn room to hang a `{place}` slot on. Never the scene. */
  const slotPlace = (personId: Id): string => {
    const own = setting.places.find((pl) => pl.id === (fixturePlaceOf[personId] ?? ''));
    if (own) return own.shortName;
    const pool = setting.places.filter((pl) => pl.id !== setting.murderPlaceId);
    return rng.pick(pool.length > 0 ? pool : setting.places).shortName;
  };

  dossiers[victim.id] = buildDossier({
    rng,
    surname: victim.surname,
    gender: drawnVictim.gender,
    archetype: victimArchetype,
    relationship: null,
    fallbackTie: {
      text: 'the one this is about',
      backstory: `${victimSurname} ${fillSlots(rng.pick(victimArchetype.standing), {
        victim: victimSurname,
        person: victimSurname,
        place: slotPlace(victim.id),
        year: rng.pick(BACKSTORY_YEARS),
      })}.`,
    },
    victimSurname,
    placeName: slotPlace(victim.id),
    mentions,
  });

  for (const p of suspects) {
    dossiers[p.id] = buildDossier({
      rng,
      surname: p.surname,
      gender: p.gender as 'm' | 'f',
      archetype: ARCHETYPE_BY_ID[p.archetypeId as Id] as Archetype,
      relationship: relationshipOf(p.relationshipId),
      victimSurname,
      placeName: slotPlace(p.id),
      mentions,
    });
    p.relationshipToVictim = dossiers[p.id]?.tie.text ?? p.relationshipToVictim;
  }

  for (const f of fixtures) {
    const card = FIXTURE_CARDS[f.fixtureRole as string] as FixtureCard;
    const where = slotPlace(f.id);
    dossiers[f.id] = buildDossier({
      rng,
      surname: f.surname,
      gender: f.gender as 'm' | 'f',
      archetype: card,
      relationship: null,
      fallbackTie: {
        text: card.tie.split('{place}').join(where),
        backstory: `${f.surname} is ${card.tie.split('{place}').join(where)}.`,
      },
      victimSurname,
      placeName: where,
      mentions,
    });
  }

  for (const p of [victim, ...suspects, ...fixtures]) p.dossier = dossiers[p.id];

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
    mentions,
    dossiers,
    motiveObject,
    namer: name,
  };
  if (beatCop) cast.beatCop = beatCop;
  if (killerCoverSecret) cast.killerCoverSecret = killerCoverSecret;
  return cast;
}
