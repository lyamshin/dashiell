import type { Id } from '../types.js';
import { LOC } from './locations.js';

/**
 * Every suspect has exactly one. A secret is a set of (tick, location) cells
 * the person will lie about, so a secret is really a shape of movement plus a
 * reason.
 *
 * `witnessLocations` is the subset of `locations` where the activity can sit on
 * the murder tick and still leave the person exculpable: somewhere a fixture
 * can see into. A secret with none of these can never be scheduled across the
 * murder tick, because the liar would have no way to be cleared.
 *
 * To extend: add an entry with the same shape.
 */
export interface SecretTemplate {
  type: string;
  label: string;
  locations: Id[];
  witnessLocations: Id[];
  minTicks: number;
  maxTicks: number;
  partner: 'none' | 'suspect' | 'victim';
  /** {P} person, {Q} partner, {L} location, {T} time range. */
  description: string;
}

export const SECRET_TEMPLATES: SecretTemplate[] = [
  {
    type: 'affair',
    label: 'Affair',
    locations: [LOC.roof, LOC.stairs],
    witnessLocations: [],
    minTicks: 2,
    maxTicks: 3,
    partner: 'suspect',
    description: '{P} is with {Q} in the {L} from {T}, and both will say they were somewhere else.',
  },
  {
    type: 'embezzling',
    label: 'Embezzling',
    locations: [LOC.suite],
    witnessLocations: [],
    minTicks: 1,
    maxTicks: 2,
    partner: 'none',
    description: '{P} goes through the papers in the {L} from {T} while the victim is downstairs.',
  },
  {
    type: 'gambling-debt',
    label: 'Gambling debt',
    locations: [LOC.street],
    witnessLocations: [LOC.street],
    minTicks: 1,
    maxTicks: 2,
    partner: 'none',
    description: '{P} slips out to the {L} from {T} to settle with a bookmaker.',
  },
  {
    type: 'fence',
    label: 'Fencing stolen goods',
    locations: [LOC.kitchen, LOC.stairs],
    witnessLocations: [LOC.kitchen],
    minTicks: 1,
    maxTicks: 1,
    partner: 'none',
    description: '{P} hands a parcel of stolen goods to a man at the {L} at {T}.',
  },
  {
    type: 'blackmail',
    label: 'Blackmailing the victim',
    locations: [LOC.suite, LOC.roof],
    witnessLocations: [],
    minTicks: 1,
    maxTicks: 2,
    partner: 'victim',
    description: '{P} meets the victim alone in the {L} from {T} and asks for money.',
  },
  {
    type: 'secret-drinking',
    label: 'Drinking in secret',
    locations: [LOC.bar],
    witnessLocations: [LOC.bar],
    minTicks: 2,
    maxTicks: 2,
    partner: 'none',
    description: '{P} drinks alone in the {L} from {T} and will claim to have been anywhere else.',
  },
  {
    type: 'forged-identity',
    label: 'Forged identity',
    locations: [],
    witnessLocations: [],
    minTicks: 0,
    maxTicks: 0,
    partner: 'none',
    description: '{P} is not the person the register says. Nothing is hidden about the evening; the lie is in the paperwork.',
  },
];

export const FORGED_IDENTITY_DOCUMENTS: string[] = [
  'The registration card gives an address in Buffalo. There is no such street in Buffalo.',
  'Two signatures in the guest register, a month apart, are in different hands.',
  'A union card in the coat lining carries a different surname and a 1919 date.',
  'A steamship ticket stub in the name of a man who died at Belleau Wood.',
  'A letter addressed to a name nobody at the hotel has heard used.',
];
