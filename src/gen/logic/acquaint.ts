/**
 * M9 — who knows whom.
 *
 * A neighbourhood is not a room where everybody knows everybody. Some people
 * know each other by name, most know a few faces, and plenty are strangers.
 * The graph is rolled per case from what the case already has:
 *
 * - **ties**: everybody who was somebody to the victim knows the victim, and
 *   two people in one secret know each other;
 * - **trade**: a watcher knows the regulars of their own door by name, the
 *   patrolman knows faces on his beat, two people in one line of work know
 *   each other by what they do;
 * - **places**: two people who spent an evening in the same room know each
 *   other's faces afterwards (added once the evening exists, in `addSightings`);
 * - **a roll** for everybody else.
 *
 * Strength decides what a witness can do. Somebody who knows a person by name
 * or by what they are to them can be asked about them by name, and names them
 * in what they saw. Somebody who knows only the face, or not even that,
 * describes them.
 */

import type {
  Acquaintance,
  AcquaintanceEdge,
  Description,
  DescriptionFeatures,
  Id,
  Person,
} from '../types.js';
import type { Rng } from '../rng.js';
import type { Cast } from '../cast.js';
import type { Setting } from '../setting.js';
import type { DeductionDials } from '../shape.js';
import { ARCHETYPE_BY_ID } from '../data/cast.js';

export interface AcqGraph {
  edges: Map<string, AcquaintanceEdge>;
  /** Watched place -> suspects who drink there, eat there, live there: its regulars. */
  regulars: Record<Id, Id[]>;
}

const key = (from: Id, to: Id): string => `${from}>${to}`;

export function edgeOf(g: AcqGraph, from: Id, to: Id): AcquaintanceEdge | undefined {
  return g.edges.get(key(from, to));
}

/** Can `from` be asked about `to` by name, and name them in what they saw? */
export function canName(g: AcqGraph, from: Id, to: Id): boolean {
  const s = g.edges.get(key(from, to))?.strength;
  return s === 'name' || s === 'relation';
}

export function strengthOf(g: AcqGraph, from: Id, to: Id): Acquaintance {
  return g.edges.get(key(from, to))?.strength ?? 'stranger';
}

/* ------------------------------------------------------------ descriptions */

const DECADE: Record<number, string> = {
  1: 'twenties',
  2: 'twenties',
  3: 'thirties',
  4: 'forties',
  5: 'fifties',
  6: 'sixties',
};

/** "in her thirties": what a look gives up about age. */
export function ageBand(person: Person): string {
  const age = person.dossier?.age ?? 40;
  const their = genderOf(person) === 'f' ? 'her' : 'his';
  if (age >= 70) return 'past seventy';
  return `in ${their} ${DECADE[Math.floor(age / 10)] ?? 'forties'}`;
}

export function genderOf(person: Person): 'm' | 'f' {
  return person.dossier?.gender ?? person.gender ?? 'm';
}

/** The trade, when it shows on sight (dossier layer 0), without its article. */
export function visibleTrade(person: Person): string | undefined {
  const d = person.dossier;
  if (!d) return undefined;
  const shown = d.layers.some((f) => f.kind === 'profession' && f.layer === 0);
  if (!shown) return undefined;
  return d.profession.role.replace(/^(an?|the)\s+/i, '').replace(/\.$/, '');
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function featuresText(f: DescriptionFeatures): string {
  const noun = f.gender === 'f' ? 'a woman' : 'a man';
  const age = f.age ? ` ${f.age}` : '';
  const trade = f.trade ? `, ${article(f.trade)} ${f.trade} by the look of ${f.gender === 'f' ? 'her' : 'him'}` : '';
  return `${noun}${age}${trade}`;
}

function fits(person: Person, f: DescriptionFeatures): boolean {
  if (genderOf(person) !== f.gender) return false;
  if (f.age !== undefined && ageBand(person).replace(/\b(his|her)\b/, 'X') !== f.age.replace(/\b(his|her)\b/, 'X')) return false;
  if (f.trade !== undefined && visibleTrade(person) !== f.trade) return false;
  return true;
}

/** Every suspect the features fit. */
export function matchesOf(suspects: Person[], f: DescriptionFeatures): Id[] {
  return suspects.filter((p) => fits(p, f)).map((p) => p.id);
}

/**
 * How a stranger would describe `person`. `grain` is how much the witness
 * gives: everything a look shows, man or woman and age, or man or woman only.
 */
export function describeAs(
  person: Person,
  suspects: Person[],
  grain: 'fine' | 'age' | 'coarse',
): Description {
  const features: DescriptionFeatures = { gender: genderOf(person) };
  if (grain !== 'coarse') features.age = ageBand(person);
  const trade = visibleTrade(person);
  if (grain === 'fine' && trade) features.trade = trade;
  const matches = matchesOf(suspects, features);
  const d: Description = { features, text: featuresText(features), matches };
  if (matches.length === 1) d.portrait = 'habit';
  return d;
}

/**
 * The description a witness gives when the case wants a piece and not a
 * conclusion: the finest grain that still fits somebody else too. Where
 * nothing fits two people, the finest there is.
 */
export function ambiguousDescription(person: Person, suspects: Person[]): Description {
  for (const grain of ['fine', 'age', 'coarse'] as const) {
    const d = describeAs(person, suspects, grain);
    if (d.matches.length >= 2) return d;
  }
  return describeAs(person, suspects, 'fine');
}

/* ------------------------------------------------------------- reference */

/** What a person is to the victim, turned round: the tenant calls the victim "my landlord". */
function victimRefFrom(relationshipId: Id | undefined, victim: Person): string | null {
  const f = genderOf(victim) === 'f';
  switch (relationshipId) {
    case 'rel-partner':
      return 'my partner';
    case 'rel-tenant':
      return f ? 'my landlady' : 'my landlord';
    case 'rel-landlord':
      return 'my tenant';
    case 'rel-employee':
      return 'my old boss';
    case 'rel-creditor':
      return f ? 'a woman who owes me money' : 'a man who owes me money';
    case 'rel-debtor':
      return f ? 'the woman I owe' : 'the man I owe';
    case 'rel-lawyer':
      return 'my client';
    case 'rel-cousin':
      return 'my cousin';
    case 'rel-inlaw':
      return f ? 'my sister-in-law' : 'my brother-in-law';
    case 'rel-spouse':
      return f ? 'my wife' : 'my husband';
    case 'rel-nurse':
      return 'my patient';
    case 'rel-secretary':
      return f ? 'the woman I work for' : 'the man I work for';
    case 'rel-neighbor':
      return 'my neighbour across the airshaft';
    default:
      return null;
  }
}

/** What the victim called them. */
function suspectRefFromVictim(p: Person): string {
  switch (p.relationshipId) {
    case 'rel-partner':
      return 'my partner';
    case 'rel-tenant':
      return 'my tenant';
    case 'rel-landlord':
      return genderOf(p) === 'f' ? 'my landlady' : 'my landlord';
    case 'rel-employee':
      return genderOf(p) === 'f' ? 'a woman who used to work for me' : 'a man who used to work for me';
    case 'rel-cousin':
      return 'my cousin';
    case 'rel-secretary':
      return 'my secretary';
    case 'rel-nurse':
      return 'my nurse';
    case 'rel-lawyer':
      return 'my lawyer';
    default:
      return p.name;
  }
}

function tradeRef(p: Person): string {
  const role = (p.dossier?.profession.role ?? p.role).replace(/^(an?|the)\s+/i, '').replace(/\.$/, '');
  return `the ${role}`;
}

function fixtureRef(f: Person, setting: Setting): string {
  const place = setting.places.find((pl) => pl.id === f.foundAt)?.shortName;
  const role = f.role.replace(/^the\s+/i, '');
  return f.fixtureRole === 'beat-cop' || !place ? `the ${role}` : `the ${role} at ${place}`;
}

/* ------------------------------------------------------------------ roll */

export interface AcqInput {
  rng: Rng;
  cast: Cast;
  setting: Setting;
  dials: DeductionDials;
  /** Somebody who must be a regular at a watched place: the one innocent a watcher names. */
  forceRegular?: { personId: Id; placeId: Id };
  /** Pairs that must not know each other by name (the arrangement's strangers). */
  forceStranger?: [Id, Id][];
}

export function rollAcquaintance(input: AcqInput): AcqGraph {
  const { rng, cast, setting, dials } = input;
  const edges = new Map<string, AcquaintanceEdge>();
  const suspects = cast.suspects;
  const plain = dials.strangers === 0 && dials.directClears >= 99;
  const set = (from: Person, to: Person, strength: Acquaintance, basis: AcquaintanceEdge['basis'], ref?: string): void => {
    edges.set(key(from.id, to.id), {
      from: from.id,
      to: to.id,
      strength,
      basis,
      ref: ref ?? refFor(from, to, strength),
    });
  };
  const refFor = (_from: Person, to: Person, strength: Acquaintance): string => {
    if (to.kind === 'fixture') return fixtureRef(to, setting);
    if (strength === 'name') return to.name;
    if (strength === 'relation') return tradeRef(to);
    const d = describeAs(to, suspects, 'age');
    return strength === 'sight' ? `${d.text} I know by sight` : d.text;
  };

  /* --- regulars: who is known by name at which door --------------------- */
  const regulars: Record<Id, Id[]> = {};
  for (const w of setting.watchers) {
    regulars[w.placeId] = suspects.filter(() => rng.chance(0.3)).map((p) => p.id);
  }
  if (input.forceRegular) {
    const list = regulars[input.forceRegular.placeId] ?? [];
    if (!list.includes(input.forceRegular.personId)) list.push(input.forceRegular.personId);
    regulars[input.forceRegular.placeId] = list;
  }
  const forced = new Set((input.forceStranger ?? []).map(([a, b]) => key(a, b)));
  const isForced = (a: Id, b: Id): boolean => forced.has(key(a, b));
  // A forced stranger at a door is not a regular there.
  for (const w of setting.watchers) {
    const watcherId = cast.watcherOf[w.placeId];
    if (!watcherId) continue;
    regulars[w.placeId] = (regulars[w.placeId] ?? []).filter((id) => !isForced(watcherId, id));
  }

  const victim = cast.victim;
  for (const from of cast.people) {
    for (const to of cast.people) {
      if (from.id === to.id) continue;
      if (to.kind === 'fixture') {
        // Everybody knows the people who stand at doors, by what they do.
        set(from, to, 'relation', 'trade');
        continue;
      }
      if (from.kind === 'victim') {
        set(from, to, 'relation', 'tie', suspectRefFromVictim(to));
        continue;
      }
      if (to.kind === 'victim') {
        if (from.kind === 'suspect') {
          const ref = victimRefFrom(from.relationshipId, victim) ?? victim.surname;
          set(from, to, 'name', 'tie', ref);
        } else {
          const byName = plain || rng.chance(0.7);
          set(from, to, byName ? 'name' : 'sight', 'roll', byName ? victim.surname : `the one from ${setting.places.find((p) => p.isResidence)?.shortName ?? 'round here'}`);
        }
        continue;
      }
      // `to` is a suspect.
      if (from.kind === 'fixture') {
        const post = from.foundAt;
        if (isForced(from.id, to.id)) {
          set(from, to, 'stranger', 'none');
        } else if (post && (regulars[post] ?? []).includes(to.id) && from.fixtureRole !== 'beat-cop') {
          set(from, to, 'name', 'regular');
        } else if (plain) {
          set(from, to, 'name', 'trade');
        } else if (from.fixtureRole === 'beat-cop') {
          set(from, to, rng.chance(0.5) ? 'name' : 'sight', 'trade');
        } else if (dials.strangers === 0) {
          set(from, to, rng.chance(0.4) ? 'name' : 'sight', 'roll');
        } else {
          const r = rng.next();
          const pStranger = Math.min(0.85, dials.strangers * 1.6);
          set(from, to, r < pStranger ? 'stranger' : r < pStranger + 0.3 ? 'sight' : 'name', 'roll');
        }
        continue;
      }
      // Two suspects: symmetric, so only the first of the pair rolls.
      if (edges.has(key(to.id, from.id))) {
        const back = edges.get(key(to.id, from.id)) as AcquaintanceEdge;
        set(from, to, back.strength, back.basis);
        continue;
      }
      const tradeA = ARCHETYPE_BY_ID[from.archetypeId ?? '']?.trade;
      const tradeB = ARCHETYPE_BY_ID[to.archetypeId ?? '']?.trade;
      if (isForced(from.id, to.id) || isForced(to.id, from.id)) {
        set(from, to, 'stranger', 'none');
      } else if (tradeA !== undefined && tradeA === tradeB) {
        set(from, to, 'relation', 'trade');
      } else if (dials.strangers === 0) {
        set(from, to, rng.chance(0.5) ? 'name' : 'relation', 'roll');
      } else {
        const r = rng.next();
        set(from, to, r < dials.strangers ? 'stranger' : r < dials.strangers + 0.2 ? 'sight' : r < 0.8 ? 'name' : 'relation', 'roll');
      }
    }
  }
  return { edges, regulars };
}

/** Two people in one secret know each other by name, whatever the roll said. */
export function tieSecret(g: AcqGraph, a: Person, b: Person): void {
  g.edges.set(key(a.id, b.id), { from: a.id, to: b.id, strength: 'name', basis: 'secret', ref: b.name });
  g.edges.set(key(b.id, a.id), { from: b.id, to: a.id, strength: 'name', basis: 'secret', ref: a.name });
}

/**
 * An evening spent in the same room: two strangers who shared a place for two
 * half hours or more know each other's faces afterwards. Never upgrades
 * anybody to a name, so it cannot turn a piece into a conclusion.
 */
export function addSightings(
  g: AcqGraph,
  people: Person[],
  truth: Record<Id, (Id | null)[]>,
  suspects: Person[],
): void {
  for (const a of people) {
    if (a.kind === 'victim') continue;
    for (const b of suspects) {
      if (a.id === b.id) continue;
      const e = g.edges.get(key(a.id, b.id));
      if (!e || e.strength !== 'stranger' || e.basis === 'none') continue;
      const ta = truth[a.id] ?? [];
      const tb = truth[b.id] ?? [];
      let shared = 0;
      for (let t = 0; t < ta.length; t++) if (ta[t] && ta[t] === tb[t]) shared++;
      if (shared >= 2) {
        const d = describeAs(b, suspects, 'age');
        g.edges.set(key(a.id, b.id), { ...e, strength: 'sight', basis: 'place', ref: `${d.text} I know by sight` });
      }
    }
  }
}

export function edgesOf(g: AcqGraph): AcquaintanceEdge[] {
  return [...g.edges.values()];
}
