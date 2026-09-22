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
  { id: 'obj-chloral', name: 'a bottle of chloral drops' },
  { id: 'obj-bookend', name: 'a bronze bookend' },
  { id: 'obj-roofkey', name: 'the roof-door key' },
  { id: 'obj-cord', name: 'a length of sash cord' },
  { id: 'obj-revolver', name: 'a nickel-plated revolver' },
  { id: 'obj-icepick', name: 'an ice pick' },

  { id: 'obj-ledger', name: 'a day ledger' },
  { id: 'obj-cashbox', name: 'a japanned cash box' },
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
];

/** The goods, by trope. A payroll job takes a payroll. */
export const SWAG_IDS: Id[] = ['obj-payroll', 'obj-bonds', 'obj-jewels', 'obj-cashbox'];

export const OBJECT_NAMES: Record<Id, string> = Object.fromEntries(
  OBJECT_TEMPLATES.map((o) => [o.id, o.name]),
);
