import type { Id } from '../types.js';

/**
 * The one setting type for M1: a residential hotel. Eight rooms.
 *
 * The graph below is the skeleton; `buildSetting` varies objects, adds one
 * optional shortcut edge and renames nothing. Sightlines are what makes a
 * location useful as a source of clues, so they are deliberately concentrated
 * on the ground floor where the two fixtures stand.
 */

export const LOC = {
  lobby: 'lobby',
  frontDesk: 'front-desk',
  bar: 'bar',
  kitchen: 'kitchen',
  stairs: 'service-stairs',
  suite: 'suite',
  roof: 'roof',
  street: 'street',
} as const;

export interface LocationTemplate {
  id: Id;
  name: string;
  adjacent: Id[];
  sightlines: Id[];
  noiseCarriesTo: Id[];
  isPublic: boolean;
}

export const LOCATION_TEMPLATES: LocationTemplate[] = [
  {
    id: LOC.lobby,
    name: 'Lobby',
    adjacent: [LOC.frontDesk, LOC.street, LOC.bar, LOC.stairs, LOC.suite, LOC.roof],
    sightlines: [LOC.frontDesk, LOC.street, LOC.bar],
    noiseCarriesTo: [LOC.frontDesk, LOC.street, LOC.bar, LOC.stairs],
    isPublic: true,
  },
  {
    id: LOC.frontDesk,
    name: 'Front Desk',
    adjacent: [LOC.lobby],
    sightlines: [LOC.lobby],
    noiseCarriesTo: [LOC.lobby],
    isPublic: true,
  },
  {
    id: LOC.bar,
    name: 'Bar',
    adjacent: [LOC.lobby, LOC.kitchen],
    sightlines: [LOC.lobby, LOC.kitchen],
    noiseCarriesTo: [LOC.lobby, LOC.kitchen],
    isPublic: true,
  },
  {
    id: LOC.kitchen,
    name: 'Kitchen',
    adjacent: [LOC.bar, LOC.stairs],
    sightlines: [LOC.bar],
    noiseCarriesTo: [LOC.bar, LOC.stairs],
    isPublic: false,
  },
  {
    id: LOC.stairs,
    name: 'Service Stairs',
    adjacent: [LOC.kitchen, LOC.lobby, LOC.suite, LOC.roof],
    sightlines: [],
    noiseCarriesTo: [LOC.kitchen, LOC.lobby],
    isPublic: false,
  },
  {
    id: LOC.suite,
    name: "Victim's Suite",
    adjacent: [LOC.stairs, LOC.lobby],
    sightlines: [],
    noiseCarriesTo: [LOC.stairs],
    isPublic: false,
  },
  {
    id: LOC.roof,
    name: 'Roof Garden',
    adjacent: [LOC.stairs, LOC.lobby],
    sightlines: [],
    noiseCarriesTo: [LOC.stairs],
    isPublic: false,
  },
  {
    id: LOC.street,
    name: 'Street',
    adjacent: [LOC.lobby],
    sightlines: [LOC.lobby],
    noiseCarriesTo: [LOC.lobby],
    isPublic: true,
  },
];

/** Edges served by the passenger elevator; unusable while it is out of order. */
export const ELEVATOR_EDGES: [Id, Id][] = [
  [LOC.lobby, LOC.suite],
  [LOC.lobby, LOC.roof],
];

/** Per-case flavour: at most one of these is added to the graph. */
export const OPTIONAL_EDGES: { a: Id; b: Id; note: string }[] = [
  { a: LOC.kitchen, b: LOC.street, note: 'a service entrance onto the areaway' },
  { a: LOC.roof, b: LOC.suite, note: 'a fire escape past the suite windows' },
  { a: LOC.frontDesk, b: LOC.stairs, note: 'a back-office door onto the stairs' },
];
