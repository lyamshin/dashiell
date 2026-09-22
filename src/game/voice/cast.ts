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
import { NAME_POOLS } from '../../gen/data/names.js';
import weightsJson from '../../../content/temper-weights.json';
import { DECKS, motifsOf, tagIs, type Card } from './cards.js';
import { contradictsWeather } from './motifs.js';
import { rollDashiell, type DashiellRoll } from './roll.js';

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
  /** The motifs of the three cards, for the page's motif set (§A.2). */
  motifs: string[];
}

export interface CastSheet {
  roll: DashiellRoll;
  temper: Record<Id, Temper>;
  portraits: Record<Id, Portrait>;
  /** Which component of each portrait was shown last, so a repeat varies. */
  order: Record<Id, number>;
}

/**
 * Given names, as the generator's pools have them. The name is the most
 * reliable thing on a person: a fixture has no archetype at all, and a
 * suspect's relationship to the victim can force a gender the archetype's own
 * hint does not have ("opposeVictimGender"). Both of those are decided before
 * the name is drawn, so the name always agrees with the truth and the hint
 * does not.
 */
const GIVEN_NAME_GENDER = ((): Map<string, 'm' | 'f'> => {
  const out = new Map<string, 'm' | 'f'>();
  for (const pool of NAME_POOLS) {
    for (const given of pool.given.male) out.set(given.toLowerCase(), 'm');
    for (const given of pool.given.female) out.set(given.toLowerCase(), 'f');
  }
  return out;
})();

/**
 * What gender a card has to be written for to suit this person. Portraits
 * filter on it, and so does business: "folded the newspaper she'd been
 * reading" attached to a man is the whole reason the tag exists.
 */
export function genderHintOf(person: Person): 'm' | 'f' | 'any' {
  const given = person.name.split(/\s+/)[0]?.toLowerCase() ?? '';
  const byName = GIVEN_NAME_GENDER.get(given);
  if (byName) return byName;
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
  // The night is rolled first, because a portrait has to agree with it (§A.5).
  const roll = rollDashiell(kase, opts?.seed === undefined ? {} : { seed: opts.seed });
  const weather = roll.weather;

  const temper: Record<Id, Temper> = {};
  const portraits: Record<Id, Portrait> = {};
  const order: Record<Id, number> = {};

  for (const person of kase.people) {
    if (person.kind !== 'victim') temper[person.id] = pickWeighted(rng, weightsFor(person));
    const gender = genderHintOf(person);
    const klass = classOf(person);
    const cardIds: string[] = [];
    const motifs: string[] = [];
    const parts: Record<string, string> = {};
    for (const component of ['trait', 'habit', 'clothing'] as const) {
      const fits = (c: Card): boolean =>
        tagIs('portraits', c, 'component', component) &&
        (tagIs('portraits', c, 'gender', gender) || gender === 'any') &&
        // §A.5: a portrait whose clothing implies a sky is a portrait for that
        // night only. A collar up and wet boots on a clear night is the tell.
        !contradictsWeather(motifsOf(c), c, weather);
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
      for (const m of motifsOf(pick)) if (!motifs.includes(m)) motifs.push(m);
      parts[component] = pick.text;
    }
    portraits[person.id] = {
      trait: fragment(parts.trait ?? ''),
      habit: fragment(parts.habit ?? ''),
      clothing: fragment(parts.clothing ?? ''),
      cardIds,
      motifs,
    };
    // Which of habit and clothing goes beside the trait on the first meeting,
    // fixed per person so the callback (§A.6) can repeat it exactly once.
    order[person.id] = hash(person.id) % 2;
  }

  return { roll, temper, portraits, order };
}

/** A stable small number off an id, so a choice can be made without state. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1024;
}

export function temperOf(cast: CastSheet, personId: Id): Temper {
  return cast.temper[personId] ?? 'plain';
}

/**
 * Every portrait card the cast sheet spent, for the burn pile, once each.
 * A deck too thin for the cast gives two people the same detail; the pile
 * still only wants to hear about the card once.
 */
export function portraitCardIds(cast: CastSheet): string[] {
  return [...new Set(Object.values(cast.portraits).flatMap((p) => p.cardIds))];
}

/**
 * Portrait cards arrive as sentences ("A split thumbnail he kept looking at.").
 * On the page they are joined mid-sentence, so they are stored as fragments:
 * lower-case start, no full stop of their own. Otherwise the page reads
 * "Hanrahan, and Hands that stayed folded..".
 */
function fragment(p: string): string {
  return p.trim().replace(/[.!?]+$/, '').replace(/^([A-Z])(?![A-Z])/, (m) => m.toLowerCase());
}

function sentence(p: string): string {
  const t = p.trim();
  return t.length === 0 ? '' : `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
}

/**
 * M4b §A.4 — portraits are woven, not listed.
 *
 * M4 printed "Ainsworth: a birthmark the shape of a thumbprint; tucks loose
 * hair behind one ear; shoes a half-size large" and called it a description.
 * Three details separated by semicolons is a catalogue entry: the reader is
 * handed three things to remember about somebody who has not yet done
 * anything, and remembers none of them.
 *
 * So: **trait plus one of habit and clothing**, never all three, in a sentence
 * that also says what the person is doing. Three templates, and the choice of
 * which second component goes with the trait is fixed per person, so the
 * callback below can repeat it exactly once.
 */
export const PORTRAIT_TEMPLATES: { second: 'habit' | 'clothing' | 'none'; text: string }[] = [
  { second: 'habit', text: '{Surname} had {trait}, and {second} while {pronoun} waited.' },
  { second: 'clothing', text: '{Surname}: {trait}. {Second}.' },
  { second: 'none', text: '{Trait} — that was {Surname}{business}.' },
  { second: 'habit', text: '{Surname} came with {trait}, and {second} the whole time.' },
  { second: 'clothing', text: '{Second}, and above it {trait}. {Surname}.' },
];

export interface WeaveInput {
  cast: CastSheet;
  personId: Id;
  surname: string;
  /** How many pages this person has already been portrayed on. */
  times: number;
  /** What their hands are doing, when the page has a business beat for it. */
  business?: string | undefined;
  pronoun: 'he' | 'she';
  /** A number off the page, so two people on one page do not weave alike. */
  nth: number;
}

/**
 * One person, woven. First meeting: two components and a verb. Later: one
 * component as a clause, and the same one as last time exactly once (§A.6's
 * callback — a repeated detail is what makes a stock detail feel authored),
 * then a different one each time after that.
 */
export function describePerson(input: WeaveInput): string {
  const { cast, personId, surname, times, pronoun } = input;
  const portrait = cast.portraits[personId];
  if (!portrait) return surname;
  const has = { trait: portrait.trait, habit: portrait.habit, clothing: portrait.clothing };
  const parts = (['trait', 'habit', 'clothing'] as const).filter((k) => has[k].length > 0);
  if (parts.length === 0) return surname;

  // Which second component belongs to this person, fixed at case start.
  const pick = cast.order[personId] ?? 0;
  const secondName: 'habit' | 'clothing' =
    has.habit.length > 0 && (pick === 0 || has.clothing.length === 0) ? 'habit' : 'clothing';

  if (times > 0) {
    // The callback: the second meeting repeats the first meeting's component,
    // and after that it varies. Never two components at once, ever.
    const later = times === 1 ? secondName : (parts[(times - 1) % parts.length] as keyof typeof has);
    const one = has[later].length > 0 ? has[later] : (has[parts[0] as keyof typeof has] as string);
    return `${surname}, and ${one}.`;
  }

  const business = (input.business ?? '').trim();
  const usable = PORTRAIT_TEMPLATES.filter(
    (t) =>
      (t.second === 'none' ? true : has[t.second].length > 0) &&
      has.trait.length > 0 &&
      (t.second !== 'none' || business.length > 0),
  );
  const pool = usable.filter((t) => t.second === secondName || t.second === 'none');
  const chosen =
    (pool.length > 0 ? pool[input.nth % pool.length] : usable[input.nth % Math.max(1, usable.length)]) ??
    null;
  if (!chosen) return `${surname}, and ${has[parts[0] as keyof typeof has]}.`;

  const second = chosen.second === 'none' ? '' : has[chosen.second];
  return chosen.text
    .split('{Surname}')
    .join(surname)
    .split('{trait}')
    .join(has.trait)
    .split('{Trait}')
    .join(sentence(has.trait))
    .split('{second}')
    .join(second)
    .split('{Second}')
    .join(sentence(second))
    .split('{pronoun}')
    .join(pronoun)
    .split('{business}')
    .join(business.length > 0 ? `, ${fragment(business)}` : '');
}

/** He or she, for the weaving templates. */
export function pronounOf(person: Person | undefined): 'he' | 'she' {
  return person && genderHintOf(person) === 'f' ? 'she' : 'he';
}
