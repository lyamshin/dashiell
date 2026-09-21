/**
 * The roll (A.2). Who the detective is tonight, and who in this neighbourhood
 * already knows him.
 *
 * Rolled once, after the case is generated, off the run seed: the same seed is
 * the same night, every time. `rollDashiell` takes its seed as an argument
 * rather than reading it off the case, so that a later milestone can seed it
 * from persistent state — a detective who is carrying last week with him —
 * without any of this changing.
 *
 * Knowing somebody is texture and a small mechanic:
 *
 * - they use his name, and the dialogue frames go to the `familiar` register;
 * - the first question to them is free (the reducer, not here);
 * - the reactive monologue discounts evidence against a warm acquaintance
 *   until two independent facts say otherwise (`reactive.ts`).
 *
 * Circumstance and relationship feed the ambient monologue and the asides.
 * Neither of them ever touches the mystery.
 */

import { Rng } from '../../gen/rng.js';
import type { Case, Id, Person } from '../../gen/types.js';
import { ARCHETYPE_BY_ID, type SuspectClass } from '../../gen/data/cast.js';

export type Circumstance =
  | 'behind-on-rent'
  | 'flush'
  | 'hungover'
  | 'bruised'
  | 'off-a-divorce-case'
  | 'sleepless'
  | 'just-paid';

export type RelationshipState = 'none' | 'someone-waiting' | 'someone-who-left' | 'complicated';

export type AcquaintanceHow =
  | 'regular'
  | 'did-a-job-for'
  | 'grew-up-with'
  | 'owes-me'
  | 'i-owe'
  | 'old-flame';

/** Not in A.2's interface, but the arrivals deck is tagged by it. */
export type Weather = 'clear' | 'rain' | 'fog' | 'cold';

export interface Acquaintance {
  how: AcquaintanceHow;
  warmth: -1 | 0 | 1;
}

export interface DashiellRoll {
  circumstance: Circumstance;
  relationship: RelationshipState;
  knows: Record<Id, Acquaintance>;
  weather: Weather;
}

export const CIRCUMSTANCES: Circumstance[] = [
  'behind-on-rent',
  'flush',
  'hungover',
  'bruised',
  'off-a-divorce-case',
  'sleepless',
  'just-paid',
];

export const RELATIONSHIP_STATES: RelationshipState[] = [
  'none',
  'someone-waiting',
  'someone-who-left',
  'complicated',
];

/** How likely a fixture is to know him, by the post he keeps. */
export const FIXTURE_ODDS: Record<string, number> = {
  bartender: 0.5,
  doorman: 0.4,
  'beat-cop': 0.4,
  newsstand: 0.4,
  cabbie: 0.35,
  'elevator-man': 0.3,
  counterman: 0.3,
  druggist: 0.2,
  landlady: 0.2,
  'ticket-taker': 0.15,
};

/** How likely a suspect is, by what kind of person their archetype is. */
export const CLASS_ODDS: Record<SuspectClass, number> = {
  underworld: 0.25,
  working: 0.15,
  professional: 0.1,
  money: 0.05,
};

/** The chance that one suspect acquaintance is an old flame instead. */
export const OLD_FLAME_ODDS = 0.35;

const FIXTURE_HOWS: AcquaintanceHow[] = [
  'regular',
  'regular',
  'did-a-job-for',
  'owes-me',
  'i-owe',
  'grew-up-with',
];

const SUSPECT_HOWS: AcquaintanceHow[] = [
  'did-a-job-for',
  'did-a-job-for',
  'grew-up-with',
  'owes-me',
  'i-owe',
];

/** How warm a way of knowing somebody is. One of these, rolled. */
const WARMTH: Record<AcquaintanceHow, (-1 | 0 | 1)[]> = {
  regular: [1, 1, 0],
  'did-a-job-for': [1, 0, 0],
  'grew-up-with': [1, 1, 0],
  'owes-me': [0, -1, -1],
  'i-owe': [0, 0, -1],
  'old-flame': [1],
};

export function oddsFor(person: Person): number {
  if (person.kind === 'victim') return 0;
  if (person.fixtureRole) return FIXTURE_ODDS[person.fixtureRole] ?? 0.2;
  const archetype = person.archetypeId ? ARCHETYPE_BY_ID[person.archetypeId] : undefined;
  return CLASS_ODDS[archetype?.class ?? 'working'];
}

const SALT = 0x5f3a91;

export function rollDashiell(kase: Case, opts?: { seed?: number }): DashiellRoll {
  const rng = new Rng(((opts?.seed ?? kase.seed) * 2654435761 + SALT) >>> 0);
  const circumstance = rng.pick(CIRCUMSTANCES);
  const relationship = rng.pick(RELATIONSHIP_STATES);
  // Rain in the case's own anchors is rain in the street; otherwise the night
  // is whatever it is. Weather never touches the mystery — the generator's
  // rain anchor does, and this only agrees with it.
  const raining = kase.anchors.some((a) => a.templateId === 'rain');
  const weather: Weather = raining ? 'rain' : rng.pick(['clear', 'fog', 'cold', 'clear']);

  const knows: Record<Id, Acquaintance> = {};
  const suspectsKnown: Id[] = [];
  for (const person of kase.people) {
    if (person.kind === 'victim') continue;
    if (!rng.chance(oddsFor(person))) continue;
    const how = rng.pick(person.fixtureRole ? FIXTURE_HOWS : SUSPECT_HOWS);
    knows[person.id] = { how, warmth: rng.pick(WARMTH[how]) };
    if (!person.fixtureRole) suspectsKnown.push(person.id);
  }

  // An old flame is a suspect, at most one, and only when there is anything to
  // be an old flame against. It may land on the killer; that is the point.
  if (relationship !== 'none' && suspectsKnown.length > 0 && rng.chance(OLD_FLAME_ODDS)) {
    const who = rng.pick(suspectsKnown);
    knows[who] = { how: 'old-flame', warmth: 1 };
  }

  return { circumstance, relationship, knows, weather };
}

/** Does this person know him well enough to be biased about? */
export function isWarm(roll: DashiellRoll, personId: Id): boolean {
  const acq = roll.knows[personId];
  return acq !== undefined && (acq.how === 'old-flame' || acq.warmth === 1);
}

export function knowsHim(roll: DashiellRoll, personId: Id): boolean {
  return roll.knows[personId] !== undefined;
}

/** How a person's acquaintance reads on the page, the first time it shows. */
export const ACQUAINTANCE_GLOSS: Record<AcquaintanceHow, string> = {
  regular: 'I have been drinking on this one’s shift for two years.',
  'did-a-job-for': 'I did a job for this one once and got paid for most of it.',
  'grew-up-with': 'We were on the same block before either of us had a trade.',
  'owes-me': 'There is money owing here, and it has been owing a while.',
  'i-owe': 'I owe here, which changes the shape of a question.',
  'old-flame': 'There was a year when this was the only address I knew by heart.',
};
