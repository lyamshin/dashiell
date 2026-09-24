import type { Errand, PetKind } from '../types.js';

/**
 * M14 — the words the three mundane cases share between the generator and the
 * page. A dog goes out of a gate, a cat out of a window and a parrot out of
 * its cage; each has one word for itself and one for the way it went.
 */

/** "the dog". */
export const PET_WORD: Record<PetKind, string> = {
  dog: 'dog',
  cat: 'cat',
  parrot: 'parrot',
  goat: 'goat',
};

/** The way out that was left open, with its article. */
export const PET_DOOR: Record<PetKind, string> = {
  dog: 'the back gate',
  cat: 'the kitchen window',
  parrot: 'the cage door',
  goat: 'the yard gate',
};

/** What it wears or lives in that is left behind: the empty collar, the empty perch. */
export const PET_LEFT: Record<PetKind, string> = {
  dog: 'the collar on its hook by the door, with the lead still clipped to it',
  cat: 'a saucer of milk on the floor that nobody has drunk',
  parrot: 'an empty perch, still swinging a little',
  goat: 'a length of rope tied to the fence with nothing on the other end of it',
};

/** What the affair turned out to be, as a noun phrase for the ending and the story. */
export const ERRAND_TEXT: Record<Errand, string> = {
  affair: 'an affair',
  'night-class': 'a night class',
  'second-job': 'a second job',
  surprise: 'a surprise, being got ready',
  'sick-relative': 'a sick relative nobody was told about',
  business: 'a business meeting',
};

/** Where the affair's errand was going on, as a plain clause about the pair of them. */
export const ERRAND_DOING: Record<Errand, string> = {
  affair: 'were keeping company that neither of them had told anybody about',
  'night-class': 'were at a lesson: reading, which {V} had never let on {V} could not do',
  'second-job': 'were at work: {V} had taken a second job, and the money was going somewhere',
  surprise: 'were getting a surprise ready, for the one who hired me',
  'sick-relative': 'were sitting up with a relative who was ill, and whom nobody else was supposed to know about',
  business: 'were doing business, the kind that is done after hours and not written down',
};

/** The secrets an affair can turn out to be, when it is not one. */
export const SECRET_ERRANDS: Errand[] = ['night-class', 'second-job', 'surprise', 'sick-relative'];
