import type { CaseType, Dossier, FixtureRole, Id, Mention, Person } from './types.js';
import { surnameOf } from './types.js';
import { liarsFor, type Dials } from './shape.js';
import { NAME_POOLS } from './data/names.js';
import {
  ARCHETYPE_BY_ID,
  BACKSTORY_YEARS,
  FIXTURE_CARDS,
  RELATIONSHIP_BY_ID,
  VICTIM_ARCHETYPES,
  relationshipFor,
  type Archetype,
  type FixtureCard,
  type SuspectClass,
  type VictimArchetype,
} from './data/cast.js';
import { AFFAIR_MOTIVES, MOTIVE_TEMPLATES, MUNDANE_MOTIVES, type MotiveTemplate } from './data/motives.js';
import { M14_TIE_IDS, tieWeight } from './data/ties.js';
import { SECRET_BY_TYPE, type SecretTemplate } from './data/secrets.js';
import { tieFits } from './coherence.js';
import {
  buildDossier,
  createMentionPool,
  fillSlots,
  genderForms,
  relationshipOf,
  varyTies,
  type MentionPool,
  type Namer,
} from './dossier.js';
import type { Setting } from './setting.js';
import { Rng } from './rng.js';

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
  cabbie: 'the cabbie on the stand',
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
export function relationshipsFor(a: Archetype, victim: VictimArchetype, tiered = false): Id[] {
  const victimGender = genderOf(victim.genderHint);
  const suspectGender = genderOf(a.genderHint);
  // M14: a tiered case may draw the ties beyond money as well as the card's own.
  const menu = tiered ? [...a.relationships, ...M14_TIE_IDS.filter((id) => !a.relationships.includes(id))] : a.relationships;
  return menu.filter((id) => {
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

/**
 * Six archetypes with distinct roles and at least one of three classes. M7: as
 * many as the shape asks for, three at the least, which is one of each class.
 */
function drawArchetypes(rng: Rng, victim: VictimArchetype, count = 6): Archetype[] | null {
  const pool = victim.allowedSuspects
    .map((id) => ARCHETYPE_BY_ID[id])
    .filter((a): a is Archetype => a !== undefined)
    .filter((a) => relationshipsFor(a, victim).length > 0);
  const needed: SuspectClass[] = ['money', 'working', 'underworld'];
  for (let attempt = 0; attempt < 40; attempt++) {
    const picked = rng.pickN(pool, count);
    if (picked.length < count) return null;
    const classes = new Set(picked.map((a) => a.class));
    if (needed.every((c) => classes.has(c))) return picked;
  }
  return null;
}

/**
 * M14: what the cast needs to know about the case it is being dealt for. A
 * mundane case's culprit has the trope's small reason and nobody's inheritance,
 * and an affair's client is married to the one the case is about.
 */
export interface CastCase {
  type: CaseType;
  /** The culprit's motive, where the trope decides it. */
  motive?: string;
  /**
   * The case is the classic draw the seed dealt before M14, kept by the case
   * mix: its cast is drawn as it was, from the archetypes' own ties.
   */
  classic?: boolean;
  /**
   * A kept classic case already turned down for not hanging together: its
   * ties are drawn again where they do not fit, as a new case's are.
   */
  coherent?: boolean;
}

export function buildCast(
  rng: Rng,
  setting: Setting,
  dials: Dials,
  clientIsKiller?: boolean,
  kind?: CastCase,
): Cast | null {
  const { shape, ladder } = dials;
  // M14 §1.4: the ties beyond money, for every case the mix dealt new.
  const tiered = !dials.plain && kind?.classic !== true;
  const mundane = kind !== undefined && (kind.type === 'lost-pet' || kind.type === 'lost-item' || kind.type === 'affair');
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
    role: genderForms(victimArchetype.role, drawnVictim.gender),
    kind: 'victim',
    archetypeId: victimArchetype.id,
    isKiller: false,
    gender: drawnVictim.gender,
  };

  const archetypes = drawArchetypes(rng, victimArchetype, shape.suspects);
  if (!archetypes) return null;

  const residenceId = setting.places.find((p) => p.isResidence)?.id;
  const suspects: Person[] = [];
  for (const [i, a] of archetypes.entries()) {
    // M14: one back fence, one ladder, one old flame to a case.
    const options = relationshipsFor(a, victimArchetype, tiered).filter(
      (id) => !M14_TIE_IDS.includes(id) || !suspects.some((p) => p.relationshipId === id),
    );
    if (options.length === 0) return null;
    // M14 §1.4: in a tiered case a debt is one tie among many, and weighs a
    // fraction of the rest. The untiered draw is the old uniform pick.
    let relId = tiered ? weightedPick(rng, options, tieWeight) : rng.pick(options);
    // The world-coherence pass: a tie the owner's trade or address cannot
    // carry — a customer of a buildings inspector, the neighbour over the
    // backyard fence of a hotel suite — is drawn again among those it can.
    // Drawn again rather than filtered first, off a stream of its own seeded
    // by who this is, so every draw after it is the draw it was.
    //
    // A classic case the mix kept is not drawn again at first: it is dealt
    // exactly as before, and the generator turns it down once it is built
    // (`runLogic`), so a seed whose classic case was coherent already — the
    // goldens' — is that case byte for byte, attempts turned down on the way
    // included. Once one has been turned down the seed's case is a new one
    // anyway, and it is dealt coherent from then on (`CastCase.coherent`).
    const coherent = tiered || (!dials.plain && kind?.coherent === true);
    if (coherent && !tieFits(relId, victimArchetype.id, residenceId, a.id)) {
      const fitting = options.filter((id) => tieFits(id, victimArchetype.id, residenceId, a.id));
      if (fitting.length === 0) return null;
      const again = new Rng(hashText(`${victimName}|${i}|${a.id}|${relId}`));
      relId = tiered ? weightedPick(again, fitting, tieWeight) : again.pick(fitting);
    }
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
      relationshipToVictim: genderForms(rel?.text ?? relId, drawn.gender).split('{V}').join(victimSurname),
      isKiller: false,
      gender: drawn.gender,
    });
  }

  const archetypeOf = (p: Person): Archetype => ARCHETYPE_BY_ID[p.archetypeId as Id] as Archetype;
  const allowedMotives = (p: Person): string[] => {
    // M14: the small reasons are anybody's. Nobody loses a dog for an inheritance.
    if (mundane) return MUNDANE_MOTIVES.map((m) => m.type);
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

  const killerMotiveType = kind?.motive ?? rng.pick(allowedMotives(killer));
  const killerMotive = [...MOTIVE_TEMPLATES, ...MUNDANE_MOTIVES, ...AFFAIR_MOTIVES].find(
    (m) => m.type === killerMotiveType,
  ) as MotiveTemplate;
  assignMotive(killer, killerMotive);

  /* --- one to three innocents carry a motive too ----------------------- *
   *
   * M7: up to the shape's count, and none at all below Medium, where the
   * report does not ask why and a second motive would be a question nobody
   * is asking.
   */
  const usedMotives = new Set<string>([killerMotiveType]);
  // M14: an affair asks nobody why, and the only reason in it is the one the
  // pair of them had; the others are just people on the street.
  const wantInnocentMotives = shape.innocentMotives > 0 && kind?.type !== 'affair' ? rng.range(1, shape.innocentMotives) : 0;
  let given = 0;
  for (const p of rng.shuffle(innocents)) {
    if (given >= wantInnocentMotives) break;
    const fresh = allowedMotives(p).filter((m) => !usedMotives.has(m));
    if (fresh.length === 0) continue;
    const type = rng.pick(fresh);
    const t = [...MOTIVE_TEMPLATES, ...MUNDANE_MOTIVES].find((m) => m.type === type) as MotiveTemplate;
    assignMotive(p, t);
    usedMotives.add(type);
    given++;
  }
  if (given === 0 && wantInnocentMotives > 0) return null;

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

  const [liarMin, liarMax] = liarsFor(shape, ladder);
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

  // M7: every innocent keeps a secret at Hard-boiled. Below it, only as many
  // as the shape says, liars first; the rest are only what they seem.
  const everyone = shape.innocentSecrets >= innocents.length;
  const room = Math.max(0, shape.innocentSecrets - liars.length);
  const rest = everyone
    ? innocents.filter((p) => !liarIds.includes(p.id))
    : rng
        .shuffle(innocents.filter((p) => !liarIds.includes(p.id)))
        .slice(0, room);

  // An affair takes two people who are both allowed one and a room that will
  // hold them, so it is settled before the singles are dealt with.
  let affairPair: Person[] = [];
  if (hostedAnywhere.has('affair') && rest.length >= 2 && rng.chance(0.55)) {
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
  if (shape.killerCoverSecret && rng.chance(0.5)) {
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
  // M7: never the culprit below Hard-boiled. M9: a tiered case decides it
  // once per seed (`clientIsKiller`), so that attempts turned down do not
  // tilt the share towards whichever is easier to deal.
  let client =
    clientIsKiller !== undefined
      ? clientIsKiller && shape.clientMayBeCulprit
        ? killer
        : rng.pick(innocents)
      : shape.clientMayBeCulprit && rng.chance(0.25)
        ? killer
        : rng.pick(innocents);
  /*
   * M14 §1.3: tell me the truth about my husband. The client of an affair is
   * married to the one it is about, or engaged to them, and is not the one
   * they were with. Nobody else in the case is a spouse, and the tie words
   * come from the relationship card, so the dossier below agrees.
   */
  if (kind?.type === 'affair') {
    if (client.isKiller) return null;
    if (client.gender === victim.gender) {
      const other = innocents.find((p) => p.gender !== victim.gender);
      if (!other) return null;
      client = other;
    }
    // An heiress between marriages is engaged, not married.
    const wed = rng.chance(0.75) && tieFits('rel-wed', victimArchetype.id);
    const relId = wed ? 'rel-wed' : 'rel-intended';
    client.relationshipId = relId;
    client.relationshipToVictim = genderForms(RELATIONSHIP_BY_ID[relId]?.text ?? relId, client.gender)
      .split('{V}')
      .join(victimSurname);
    const spoken = client;
    if (suspects.some((p) => p.id !== spoken.id && ['rel-spouse', 'rel-engaged'].includes(p.relationshipId ?? ''))) return null;
  }
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
      // A cat's owner, a watch's, or the one an affair is about stands on the
      // block for something other than who would want them dead.
      backstory: `${victimSurname} ${fillSlots(rng.pick(mundane ? victimArchetype.standingMundane : victimArchetype.standing), {
        victim: victimSurname,
        person: victimSurname,
        place: slotPlace(victim.id),
        year: rng.pick(BACKSTORY_YEARS),
        gender: drawnVictim.gender,
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
      relationship: dials.plain ? relationshipOf(p.relationshipId) : tradeRelationship(p.relationshipId, victimArchetype.id),
      victimSurname,
      placeName: slotPlace(p.id),
      mentions,
      characterKey: p.archetypeId as Id,
    });
    p.relationshipToVictim = dossiers[p.id]?.tie.text ?? p.relationshipToVictim;
  }

  // M11 §B.2: no two people in a case share a tie sentence.
  varyTies(
    suspects.map((p) => ({ dossier: dossiers[p.id] as Dossier, surname: p.surname, keep: p.isClient === true })),
  );

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
      characterKey: f.fixtureRole as string,
      detailsFirst: card.detailsFirst,
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

/** A tie's card in the owner's words: a customer of a pawnbroker pawns. */
function tradeRelationship(relationshipId: Id | undefined, ownerArchetypeId: Id) {
  const rel = relationshipOf(relationshipId);
  return rel ? relationshipFor(rel, ownerArchetypeId) : null;
}

/** FNV-1a: a string to a 32-bit seed, the same on every platform. */
function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** One of `options`, by weight. */
function weightedPick(rng: Rng, options: Id[], weight: (id: Id) => number): Id {
  const total = options.reduce((n, id) => n + weight(id), 0);
  let roll = rng.next() * total;
  for (const id of options) {
    roll -= weight(id);
    if (roll < 0) return id;
  }
  return options[options.length - 1] as Id;
}
