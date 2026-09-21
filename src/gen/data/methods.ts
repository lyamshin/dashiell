import type { Id } from '../types.js';
import { LOC } from './locations.js';

/**
 * How the victim died.
 *
 * `accessLocations` does double duty: it is the set of places the method's
 * evidence object may live, and whichever one is chosen becomes the method's
 * access requirement. Every entry is a location that at least one fixture can
 * see into, because the killer's visit there has to be witnessable or the
 * inculpation leg of the proof has nothing to stand on.
 */
export interface MethodTemplate {
  id: Id;
  name: string;
  noise: 0 | 1 | 2;
  /** Where the murder can take place. */
  murderLocations: Id[];
  evidenceObjectId: Id;
  accessLocations: Id[];
  bodyEvidence: string;
  /** Flat description of the physical trace the method leaves behind. */
  evidenceNote: string;
  /** How the killer had to prepare. Used in the truth-sheet prose. */
  accessNote: string;
}

export const METHOD_TEMPLATES: MethodTemplate[] = [
  {
    id: 'poison',
    name: 'poison in a drink',
    noise: 0,
    murderLocations: [LOC.suite, LOC.roof],
    evidenceObjectId: 'obj-decanter',
    accessLocations: [LOC.bar, LOC.kitchen],
    bodyEvidence: 'Chloral hydrate in the stomach. No wound, no bruising, no sign of a struggle.',
    evidenceNote: 'The stopper has been wiped and the dregs test positive for chloral.',
    accessNote: 'had to reach the chloral and doctor the drink',
  },
  {
    id: 'blunt',
    name: 'a blunt object',
    noise: 1,
    murderLocations: [LOC.suite, LOC.kitchen, LOC.stairs],
    evidenceObjectId: 'obj-bookend',
    accessLocations: [LOC.frontDesk],
    bodyEvidence: 'One depressed fracture at the back of the skull. Death was not instant.',
    evidenceNote: 'There is a clean square in the dust where it stood.',
    accessNote: 'had to pick it up',
  },
  {
    id: 'push',
    name: 'a push from the roof garden',
    noise: 1,
    murderLocations: [LOC.roof],
    evidenceObjectId: 'obj-roofkey',
    accessLocations: [LOC.frontDesk],
    bodyEvidence: 'Fractures consistent with a fall of six storeys. Two fingernails torn back.',
    evidenceNote: 'The roof door was found unlocked and the key is not on its hook.',
    accessNote: 'had to take the key to get the roof door open',
  },
  {
    id: 'strangle',
    name: 'strangling with a cord',
    noise: 0,
    murderLocations: [LOC.suite, LOC.stairs, LOC.roof],
    evidenceObjectId: 'obj-cord',
    accessLocations: [LOC.kitchen],
    bodyEvidence: 'A ligature furrow across the throat. Three fibres of hemp in the skin.',
    evidenceNote: 'A cut end of the same hemp is still tied to the fitting it was taken from.',
    accessNote: 'had to cut the cord down',
  },
  {
    id: 'shot',
    name: 'a gunshot',
    noise: 2,
    murderLocations: [LOC.suite, LOC.roof],
    evidenceObjectId: 'obj-revolver',
    accessLocations: [LOC.frontDesk],
    bodyEvidence: 'One bullet below the sternum. Powder burns on the shirt front: fired close.',
    evidenceNote: 'The drawer it was kept in is open and the oiled cloth is still in it.',
    accessNote: 'had to open the drawer and take the gun',
  },
];
