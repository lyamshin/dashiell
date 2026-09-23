import type { Id } from '../types.js';

/**
 * How the victim died.
 *
 * Where a method can be used is a property of the place deck, not of the
 * method: a place template lists the methods it can host in `murderMethods`.
 * What a method carries is its weapon, the trace that weapon leaves where it
 * lived, the trace the scene bears afterwards, and how loud it was.
 *
 * `sceneTrace` is the half of the scene report that fixes the half hour: it is
 * always something that stopped, spilled or was interrupted, so that an anchor
 * at the murder tick can time it.
 */
export interface MethodTemplate {
  id: Id;
  name: string;
  noise: 0 | 1 | 2;
  evidenceObjectId: Id;
  bodyEvidence: string;
  /** The trace left where the weapon lived. */
  evidenceNote: string;
  /** The trace the scene bears, which an anchor can time. */
  sceneTrace: string;
  /** How the killer had to prepare. Used in the truth sheet prose. */
  accessNote: string;
  /** What the sound was, for hearers nearby. Only used when `noise` > 0. */
  soundNote: string;
}

export const METHOD_TEMPLATES: MethodTemplate[] = [
  {
    id: 'poison',
    name: 'poison in a drink',
    noise: 0,
    evidenceObjectId: 'obj-chloral',
    bodyEvidence: 'Chloral, a sleeping drug, in the stomach. No wound, no bruising, no sign of a struggle.',
    evidenceNote: 'The bottle is gone from the shelf and the ring of dust it stood in is still there.',
    sceneTrace: 'A glass is on its side and the spill had not yet reached the edge of the table when it dried.',
    accessNote: 'had to get at the chloral and put it in the drink',
    soundNote: 'a chair going over',
  },
  {
    id: 'blunt',
    name: 'a blunt object',
    noise: 1,
    evidenceObjectId: 'obj-bookend',
    bodyEvidence: 'One blow broke in the back of the skull. Death was not instant.',
    evidenceNote: 'There is a clean square in the dust where it stood.',
    sceneTrace: 'The lamp came down in the fall and the bulb is still warm in its socket, unbroken.',
    accessNote: 'had to pick it up and carry it',
    soundNote: 'a heavy fall and a cry cut short',
  },
  {
    id: 'fall',
    name: 'a push from the parapet',
    noise: 1,
    evidenceObjectId: 'obj-roofkey',
    bodyEvidence: 'Fractures consistent with a fall of six storeys. Two fingernails torn back.',
    evidenceNote: 'The key is not on its hook and the door it opens was found standing wide.',
    sceneTrace: 'The dust on the parapet is scored where the heels went over, and the scuff has not weathered.',
    accessNote: 'had to take the key to get the door open',
    soundNote: 'a shout and then something hitting the ground below',
  },
  {
    id: 'strangle',
    name: 'strangling with a cord',
    noise: 0,
    evidenceObjectId: 'obj-cord',
    bodyEvidence: 'A groove across the throat where a cord was pulled tight. Three fibres of hemp in the skin.',
    evidenceNote: 'A cut end of the same hemp is still tied to the fitting it was taken from.',
    sceneTrace: 'The wristwatch broke against the floor and the hands have not moved since.',
    accessNote: 'had to cut the cord down',
    soundNote: 'a scuffle and a chair dragging',
  },
  {
    id: 'shot',
    name: 'a gunshot',
    noise: 2,
    evidenceObjectId: 'obj-revolver',
    bodyEvidence: 'One bullet below the sternum. Powder burns on the shirt front: fired close.',
    evidenceNote: 'The drawer it was kept in is open and the oiled cloth is still in it.',
    sceneTrace: 'The cigarette left going burned itself out on the sill where it fell.',
    accessNote: 'had to open the drawer and take the gun',
    soundNote: 'a shot',
  },
  {
    id: 'stab',
    name: 'an ice pick',
    noise: 1,
    evidenceObjectId: 'obj-icepick',
    bodyEvidence: 'A single narrow puncture under the ribs. Very little blood outside the body.',
    evidenceNote: 'The block is out and half melted and the pick that belongs with it is gone.',
    sceneTrace: 'The tap was left running and the basin had overflowed a clean ring onto the boards.',
    accessNote: 'had to take the pick off the block',
    soundNote: 'a struggle and something going over',
  },
];

export const METHOD_BY_ID: Record<Id, MethodTemplate> = Object.fromEntries(
  METHOD_TEMPLATES.map((m) => [m.id, m]),
);
