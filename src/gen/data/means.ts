import type { Entry } from '../types.js';
import { METHOD_TEMPLATES, type MethodTemplate } from './methods.js';

/**
 * M5 §2. A robbery and a disappearance run through exactly the machinery a
 * murder runs through: the actor is alone at a place at a tick, had to fetch
 * something beforehand, and left a trace behind. What changes is what the
 * something is.
 *
 * For a murder the means is the weapon. For a robbery it is the way in — the
 * key off the board, the combination out of the book, the cord made fast to
 * the fire escape rail. For a disappearance it is what the person needed to
 * go, or what the one who took them needed to take them.
 *
 * A means card is a `MethodTemplate` with one extra field, so that everything
 * downstream — the access leg of the proof, the physical clue where the object
 * lived, the scene report, par — works without knowing which deck it came out
 * of. `bodyEvidence` is the official report, whatever the officials call it;
 * `sceneTrace` is what the room still shows; `soundNote` is what a neighbour
 * heard.
 */
export interface MeansTemplate extends MethodTemplate {
  /** How they got in. Robbery only. */
  entry?: Entry;
}

export const MURDER_MEANS: MeansTemplate[] = METHOD_TEMPLATES;

export const ROBBERY_MEANS: MeansTemplate[] = [
  {
    id: 'took-the-key',
    name: 'a key off the board',
    entry: 'key',
    noise: 0,
    evidenceObjectId: 'obj-roofkey',
    bodyEvidence:
      'The precinct report says the lock was not forced. It was opened, and it was locked again afterwards.',
    evidenceNote: 'The key is off its hook, and the hook has not been dusty in a week.',
    sceneTrace: 'There is a clean rectangle in the dust where it stood, and nothing else in the room was moved.',
    accessNote: 'had to take the key off the board',
    soundNote: 'a door being locked from the outside',
  },
  {
    id: 'worked-the-combination',
    name: 'the combination, written down where it should not have been',
    entry: 'combination',
    noise: 0,
    evidenceObjectId: 'obj-ledger',
    bodyEvidence:
      'The precinct report says the safe was opened and not broken. Whoever turned the dial knew the numbers.',
    evidenceNote: 'The book is gone from the shelf, and the numbers were written on the flyleaf of it.',
    sceneTrace: 'The dial is back at zero and the door was pushed to but never locked again.',
    accessNote: 'had to get at the book the numbers were written in',
    soundNote: 'a safe door swinging on a dry hinge',
  },
  {
    id: 'came-in-the-window',
    name: 'a cord tied to the fire escape',
    entry: 'window',
    noise: 1,
    evidenceObjectId: 'obj-cord',
    bodyEvidence:
      'The precinct report says the window catch was sprung from outside and the sill was scraped.',
    evidenceNote: 'A cut end of the same hemp is still tied to the rail it was taken from.',
    sceneTrace: 'The window is down but not latched, and there is grit from the fire escape on the sill.',
    accessNote: 'had to tie the cord to the fire escape',
    soundNote: 'a window going up and somebody on the fire escape outside',
  },
  {
    id: 'never-left',
    name: 'a case left in the cloakroom that morning',
    entry: 'never-left',
    noise: 0,
    evidenceObjectId: 'obj-suitcase',
    bodyEvidence:
      'The precinct report says there was no entry at all. Whoever it was was inside before the door was shut.',
    evidenceNote: 'The strapped case is gone from where it was checked, and the check is still in the book.',
    sceneTrace: 'Nothing was forced and nothing was broken. Whoever it was had all night and took twenty minutes.',
    accessNote: 'had to collect the case before the room was shut up',
    soundNote: 'somebody moving about in a room that was supposed to be empty',
  },
  {
    id: 'was-let-in',
    name: 'a telephone call that got the door opened',
    entry: 'let-in',
    noise: 0,
    evidenceObjectId: 'obj-telephone',
    bodyEvidence:
      'The precinct report says the door was opened from inside. Nothing about it was forced.',
    evidenceNote: 'The call went through this telephone at a quarter to, and the operator has a record of it.',
    sceneTrace: 'Two chairs are pulled round to face each other and one of them was sat in.',
    accessNote: 'had to reach a telephone and be believed on it',
    soundNote: 'a bell, and then a door being opened to somebody',
  },
];

export const MISSING_MEANS: MeansTemplate[] = [
  {
    id: 'the-timetable',
    name: 'a train out, and the timetable it was read off',
    noise: 0,
    evidenceObjectId: 'obj-timetable',
    bodyEvidence:
      'The precinct took a statement and filed it. A grown person is allowed to go where they like.',
    evidenceNote: 'The timetable has been pulled off the wall, and the corner of it is still pasted there.',
    sceneTrace: 'The room was left tidy and the bed was not slept in.',
    accessNote: 'had to read the departures off the wall',
    soundNote: 'a door pulled shut on an empty room',
  },
  {
    id: 'the-packed-case',
    name: 'a case packed in a hurry',
    noise: 0,
    evidenceObjectId: 'obj-suitcase',
    bodyEvidence:
      'The precinct took a statement and filed it. Nobody at the desk thought it was a police matter.',
    evidenceNote: 'The strapped case is gone from the wardrobe, and the straps were bought new last week.',
    sceneTrace: 'Two drawers are open and the good coat is off its hanger.',
    accessNote: 'had to get the case out of the wardrobe',
    soundNote: 'somebody going down the stairs with something heavy',
  },
  {
    id: 'the-pawned-ring',
    name: 'money raised in a hurry at a pawnshop, on a spike of pawn tickets',
    noise: 0,
    evidenceObjectId: 'obj-pawn-ticket',
    bodyEvidence:
      'The precinct took a statement and filed it. They will look again in a week if nobody turns up.',
    evidenceNote: 'The spike has a gap in it and the last ticket written was torn off the pad.',
    sceneTrace: 'The drawer was gone through and the only thing missing is what was worth money.',
    accessNote: 'had to raise the money on something',
    soundNote: 'a drawer being turned out fast',
  },
  {
    id: 'the-borrowed-coat',
    name: 'a coat borrowed off a hook and never brought back',
    noise: 0,
    evidenceObjectId: 'obj-overcoat',
    bodyEvidence:
      'The precinct came, looked at the room, and said to wait a day or two.',
    evidenceNote: 'The camel-hair coat is off its hook and the hook is the only empty one.',
    sceneTrace: 'The lamp was left burning and the door was left shut but not locked.',
    accessNote: 'had to take a coat that would not be recognised',
    soundNote: 'the street door going, and nobody coming back through it',
  },
];
