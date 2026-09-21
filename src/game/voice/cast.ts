/**
 * Temper (A.3) and portraits (A.4), rolled once at case start and then never
 * again. Together with the roll they make the cast sheet: everything about the
 * people in this case that is true of them on every page they appear on.
 *
 * Consistency is the whole point. A stock description feels authored when the
 * split thumbnail is there both times.
 */

import { Rng } from '../../gen/rng.js';
import type { Case, Id, Person } from '../../gen/types.js';
import { ARCHETYPE_BY_ID, VICTIM_ARCHETYPES } from '../../gen/data/cast.js';
import weightsJson from '../../../content/temper-weights.json';
import { DECKS, tagIs, type Card } from './cards.js';
import { rollHumphrey, type HumphreyRoll } from './roll.js';

export type Temper = 'enigma' | 'plain' | 'yap';

export const TEMPERS: Temper[] = ['enigma', 'plain', 'yap'];

interface Weights {
  default: Record<Temper, number>;
  classes: Record<string, Record<Temper, number>>;
  archetypes: Record<string, Record<Temper, number>>;
  fixtures: Record<string, Record<Temper, number>>;
}

export const TEMPER_WEIGHTS = weightsJson as unknown as Weights;

/** The weights that apply to one person, narrowest table first. */
export function weightsFor(person: Person): Record<Temper, number> {
  if (person.fixtureRole) {
    return (
      TEMPER_WEIGHTS.fixtures[person.fixtureRole] ??
      TEMPER_WEIGHTS.fixtures.default ??
      TEMPER_WEIGHTS.default
    );
  }
  const byArchetype = person.archetypeId
    ? TEMPER_WEIGHTS.archetypes[person.archetypeId]
    : undefined;
  if (byArchetype) return byArchetype;
  const archetype = person.archetypeId ? ARCHETYPE_BY_ID[person.archetypeId] : undefined;
  const byClass = archetype ? TEMPER_WEIGHTS.classes[archetype.class] : undefined;
  return byClass ?? TEMPER_WEIGHTS.default;
}

function pickWeighted(rng: Rng, weights: Record<Temper, number>): Temper {
  const total = TEMPERS.reduce((n, t) => n + Math.max(0, weights[t] ?? 0), 0);
  if (total <= 0) return 'plain';
  let roll = rng.next() * total;
  for (const t of TEMPERS) {
    roll -= Math.max(0, weights[t] ?? 0);
    if (roll < 0) return t;
  }
  return 'plain';
}

export interface Portrait {
  trait: string;
  habit: string;
  clothing: string;
  /** The card ids, so the burn pile can be told about them. */
  cardIds: string[];
}

export interface CastSheet {
  roll: HumphreyRoll;
  temper: Record<Id, Temper>;
  portraits: Record<Id, Portrait>;
  /** Which component of each portrait was shown last, so a repeat varies. */
  order: Record<Id, number>;
}

/** What gender a portrait card has to be written for to suit this person. */
export function genderHintOf(person: Person): 'm' | 'f' | 'any' {
  if (person.kind === 'victim') {
    const vic = VICTIM_ARCHETYPES.find((v) => v.id === person.archetypeId);
    return vic?.genderHint ?? 'any';
  }
  const archetype = person.archetypeId ? ARCHETYPE_BY_ID[person.archetypeId] : undefined;
  return archetype?.genderHint ?? 'any';
}

export function classOf(person: Person): string {
  if (person.fixtureRole) return 'working';
  const archetype = person.archetypeId ? ARCHETYPE_BY_ID[person.archetypeId] : undefined;
  return archetype?.class ?? 'working';
}

const PORTRAIT_SALT = 0x27d4eb;

/**
 * One trait, one habit and one piece of clothing per person, drawn against
 * the burn pile so that a player does not meet the same split thumbnail two
 * runs running. Everything is chosen here, once; the page grammar only ever
 * reads it back.
 */
export function rollCast(
  kase: Case,
  opts?: { seed?: number; persistedBurned?: Iterable<string> },
): CastSheet {
  const seed = opts?.seed ?? kase.seed;
  const rng = new Rng((seed * 1103515245 + PORTRAIT_SALT) >>> 0);
  const burned = new Set(opts?.persistedBurned ?? []);
  const deck = DECKS.portraits;

  const temper: Record<Id, Temper> = {};
  const portraits: Record<Id, Portrait> = {};
  const order: Record<Id, number> = {};

  for (const person of kase.people) {
    if (person.kind !== 'victim') temper[person.id] = pickWeighted(rng, weightsFor(person));
    const gender = genderHintOf(person);
    const klass = classOf(person);
    const cardIds: string[] = [];
    const parts: Record<string, string> = {};
    for (const component of ['trait', 'habit', 'clothing'] as const) {
      const fits = (c: Card): boolean =>
        tagIs('portraits', c, 'component', component) &&
        (tagIs('portraits', c, 'gender', gender) || gender === 'any');
      const exact = deck.filter((c) => fits(c) && tagIs('portraits', c, 'class', klass));
      const loose = deck.filter(fits);
      const pick =
        rng.shuffle(exact.filter((c) => !burned.has(c.id)))[0] ??
        rng.shuffle(loose.filter((c) => !burned.has(c.id)))[0] ??
        rng.shuffle(exact)[0] ??
        rng.shuffle(loose)[0];
      if (!pick) continue;
      burned.add(pick.id);
      cardIds.push(pick.id);
      parts[component] = pick.text;
    }
    portraits[person.id] = {
      trait: parts.trait ?? '',
      habit: parts.habit ?? '',
      clothing: parts.clothing ?? '',
      cardIds,
    };
    order[person.id] = 0;
  }

  return { roll: rollHumphrey(kase, opts?.seed === undefined ? {} : { seed: opts.seed }), temper, portraits, order };
}

export function temperOf(cast: CastSheet, personId: Id): Temper {
  return cast.temper[personId] ?? 'plain';
}

/** Every portrait card the cast sheet spent, for the burn pile. */
export function portraitCardIds(cast: CastSheet): string[] {
  return Object.values(cast.portraits).flatMap((p) => p.cardIds);
}

/**
 * The first time a person is on the page they get all three components; after
 * that one, and a different one each time, so the same man is described twice
 * without being described the same way twice.
 */
export function describePerson(
  cast: CastSheet,
  personId: Id,
  surname: string,
  seenBefore: boolean,
  nth: number,
): string {
  const portrait = cast.portraits[personId];
  if (!portrait) return surname;
  const parts = [portrait.trait, portrait.habit, portrait.clothing].filter((p) => p.length > 0);
  if (parts.length === 0) return surname;
  if (!seenBefore) return `${surname}: ${parts.join('; ')}.`;
  const one = parts[nth % parts.length] as string;
  return `${surname}, and ${one}.`;
}
