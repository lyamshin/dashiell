import type { Id } from '../types.js';
import { LOC } from './locations.js';

/**
 * Things that can go missing or bear traces. `homes` lists the locations the
 * object could plausibly live in; the generator picks one per case so the map
 * is not identical every run.
 */
export interface ObjectTemplate {
  id: Id;
  name: string;
  homes: Id[];
}

export const OBJECT_TEMPLATES: ObjectTemplate[] = [
  { id: 'obj-decanter', name: 'a cut-glass decanter', homes: [LOC.bar, LOC.kitchen] },
  { id: 'obj-cord', name: 'a length of sash cord', homes: [LOC.kitchen, LOC.stairs] },
  { id: 'obj-bookend', name: 'a bronze bookend', homes: [LOC.frontDesk, LOC.suite] },
  { id: 'obj-revolver', name: 'a nickel-plated revolver', homes: [LOC.frontDesk, LOC.suite] },
  { id: 'obj-roofkey', name: 'the roof door key', homes: [LOC.frontDesk] },
  { id: 'obj-ledger', name: 'the house ledger', homes: [LOC.frontDesk] },
  { id: 'obj-cigarette-case', name: 'a silver cigarette case', homes: [LOC.bar, LOC.lobby, LOC.roof] },
  { id: 'obj-umbrella-stand', name: 'a brass umbrella stand', homes: [LOC.lobby, LOC.street] },
  { id: 'obj-icepick', name: 'an ice pick', homes: [LOC.kitchen, LOC.bar] },
  { id: 'obj-coat', name: "a camel-hair overcoat on a hook", homes: [LOC.lobby, LOC.stairs] },
  { id: 'obj-flowerpot', name: 'a terracotta flower pot', homes: [LOC.roof] },
  { id: 'obj-watering-can', name: 'a galvanised watering can', homes: [LOC.roof, LOC.kitchen] },
  { id: 'obj-guest-register', name: 'the guest register', homes: [LOC.frontDesk] },
  { id: 'obj-mop-bucket', name: 'a mop and bucket', homes: [LOC.stairs, LOC.kitchen] },
  { id: 'obj-seltzer', name: 'a seltzer siphon', homes: [LOC.bar] },
  { id: 'obj-steamer-trunk', name: 'a steamer trunk', homes: [LOC.suite, LOC.stairs] },
  { id: 'obj-writing-desk', name: 'a writing desk with a locked drawer', homes: [LOC.suite, LOC.lobby] },
  { id: 'obj-newsstand', name: 'a folded stack of evening papers', homes: [LOC.street, LOC.lobby] },
];
