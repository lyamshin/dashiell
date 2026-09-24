import type { Id } from '../types.js';

/**
 * Things that can go missing or bear traces. A place template lists the object
 * ids that could plausibly be found there; the draw decides which actually are.
 *
 * The six weapon objects at the top are each one method's evidence object, so
 * they are deliberately spread across a lot of places: the method can only be
 * used if some drawn place other than the scene holds its weapon.
 */
export interface ObjectTemplate {
  id: Id;
  name: string;
}

export const OBJECT_TEMPLATES: ObjectTemplate[] = [
  { id: 'obj-chloral', name: 'a bottle of chloral sleeping drops' },
  { id: 'obj-bookend', name: 'a bronze bookend' },
  { id: 'obj-roofkey', name: 'the roof-door key' },
  { id: 'obj-cord', name: 'a length of sash cord' },
  { id: 'obj-revolver', name: 'a nickel-plated revolver' },
  { id: 'obj-icepick', name: 'an ice pick' },

  { id: 'obj-ledger', name: 'a day ledger' },
  { id: 'obj-cashbox', name: 'a black-lacquered cash box' },
  { id: 'obj-typewriter', name: 'an Underwood typewriter' },
  { id: 'obj-photograph', name: 'a framed photograph' },
  { id: 'obj-cigarette-case', name: 'a silver cigarette case' },
  { id: 'obj-umbrella', name: 'a brass umbrella stand' },
  { id: 'obj-overcoat', name: 'a camel-hair overcoat on a hook' },
  { id: 'obj-suitcase', name: 'a strapped suitcase' },
  { id: 'obj-pawn-ticket', name: 'a spike of pawn tickets' },
  { id: 'obj-timetable', name: 'a pasted-up timetable' },
  { id: 'obj-newspapers', name: 'a folded stack of evening papers' },
  { id: 'obj-mop-bucket', name: 'a mop and bucket' },
  { id: 'obj-seltzer', name: 'a seltzer siphon' },
  { id: 'obj-flowerpot', name: 'a terracotta flower pot' },
  { id: 'obj-toolbox', name: 'a mechanic’s toolbox' },
  { id: 'obj-hatbox', name: 'a stack of hatboxes' },
  { id: 'obj-ashtray', name: 'a standing ashtray' },
  { id: 'obj-telephone', name: 'a wall telephone' },

  /**
   * M5: what a thief comes for. These are never dealt into a room at random;
   * a robbery puts exactly one of them at the scene, because a case about a
   * theft needs something worth the trouble of taking.
   */
  { id: 'obj-payroll', name: 'a payroll envelope' },
  { id: 'obj-bonds', name: 'a packet of bearer bonds' },
  { id: 'obj-jewels', name: 'a jewel case' },

  /**
   * M14: what goes missing when nobody is a thief. Like the goods above, never
   * dealt into a room at random — a lost-pet or lost-item case puts exactly one
   * at the scene, on purpose — and never listed in a place card, so the draw
   * for every other case is untouched.
   */
  { id: 'obj-pet-dog', name: 'the fox terrier' },
  { id: 'obj-pet-cat', name: 'the ginger tomcat' },
  { id: 'obj-pet-parrot', name: 'the green parrot' },
  { id: 'obj-pet-goat', name: 'the nanny goat' },
  { id: 'obj-ring', name: 'a gold wedding ring' },
  { id: 'obj-watch', name: 'a gold pocket watch' },
  { id: 'obj-medal', name: 'a war medal in a velvet box' },
  { id: 'obj-teeth', name: 'a set of false teeth' },
  { id: 'obj-trophy', name: 'a bowling trophy' },
];

/** M14: the animal, by kind. */
export const PET_OBJECT: Record<'dog' | 'cat' | 'parrot' | 'goat', Id> = {
  dog: 'obj-pet-dog',
  cat: 'obj-pet-cat',
  parrot: 'obj-pet-parrot',
  goat: 'obj-pet-goat',
};

/** M14: what a lost-item case can lose. */
export const LOST_ITEM_IDS: Id[] = ['obj-ring', 'obj-watch', 'obj-medal', 'obj-teeth', 'obj-trophy'];

/** The goods, by trope. A payroll job takes a payroll. */
export const SWAG_IDS: Id[] = ['obj-payroll', 'obj-bonds', 'obj-jewels', 'obj-cashbox'];

export const OBJECT_NAMES: Record<Id, string> = Object.fromEntries(
  OBJECT_TEMPLATES.map((o) => [o.id, o.name]),
);
