import type { Id } from '../types.js';

/**
 * Cast archetypes.
 *
 * M1 drew role, relationship, motive and secret from four uncoupled pools and
 * produced a chambermaid who was the victim's landlord and a seamstress who
 * was embezzling. Here they are coupled: an archetype is a card that says what
 * a person of that kind can be to the victim, what they can want, and what
 * they can be hiding. Nothing outside a card's own lists is ever assigned to
 * a person drawn from it.
 *
 * `Relationship.impliesMotives`, where present, narrows it further: whatever
 * motive a person ends up with has to be allowed by both their archetype and
 * their relationship to the victim.
 */

export type SuspectClass = 'money' | 'working' | 'underworld' | 'professional';

export interface Relationship {
  id: Id;
  text: string;
  impliesMotives?: string[];
}

export interface Archetype {
  id: Id;
  role: string;
  genderHint?: 'm' | 'f' | 'any';
  relationships: Id[];
  motives: string[];
  secrets: string[];
  class: SuspectClass;
}

export interface VictimArchetype {
  id: Id;
  role: string;
  genderHint?: 'm' | 'f' | 'any';
  allowedSuspects: Id[];
}

export const RELATIONSHIPS: Relationship[] = [
  { id: 'rel-partner', text: 'the victim’s business partner', impliesMotives: ['debt', 'property', 'exposure', 'inheritance'] },
  { id: 'rel-tenant', text: 'the victim’s tenant', impliesMotives: ['property', 'revenge', 'debt'] },
  { id: 'rel-landlord', text: 'the victim’s landlord', impliesMotives: ['property', 'debt', 'revenge'] },
  { id: 'rel-employee', text: 'the victim’s former employee', impliesMotives: ['revenge', 'exposure', 'debt'] },
  { id: 'rel-creditor', text: 'the victim’s creditor', impliesMotives: ['debt', 'insurance', 'property'] },
  { id: 'rel-debtor', text: 'in the victim’s debt', impliesMotives: ['debt', 'exposure', 'revenge'] },
  { id: 'rel-lawyer', text: 'the victim’s lawyer', impliesMotives: ['exposure', 'inheritance', 'property'] },
  { id: 'rel-cousin', text: 'the victim’s cousin', impliesMotives: ['inheritance', 'jealousy', 'insurance'] },
  { id: 'rel-inlaw', text: 'the victim’s brother-in-law', impliesMotives: ['inheritance', 'jealousy', 'debt'] },
  { id: 'rel-rival', text: 'the victim’s rival in trade', impliesMotives: ['revenge', 'property', 'exposure'] },
  { id: 'rel-spouse', text: 'the victim’s estranged spouse', impliesMotives: ['inheritance', 'jealousy', 'insurance'] },
  { id: 'rel-nurse', text: 'the victim’s private nurse', impliesMotives: ['inheritance', 'silence-a-witness', 'protect-another'] },
  { id: 'rel-secretary', text: 'the victim’s secretary', impliesMotives: ['exposure', 'silence-a-witness', 'jealousy'] },
  { id: 'rel-engaged', text: 'engaged to the victim’s daughter', impliesMotives: ['inheritance', 'jealousy'] },
  { id: 'rel-childhood', text: 'a childhood friend of the victim’s from the same block', impliesMotives: ['revenge', 'protect-another', 'debt'] },
  { id: 'rel-willed', text: 'named in the victim’s will', impliesMotives: ['inheritance', 'insurance'] },
  { id: 'rel-witness', text: 'a witness against the people the victim worked for', impliesMotives: ['silence-a-witness', 'protect-another', 'exposure'] },
  { id: 'rel-customer', text: 'a customer of the victim’s', impliesMotives: ['debt', 'revenge', 'exposure'] },
  { id: 'rel-neighbor', text: 'the victim’s neighbour across the airshaft', impliesMotives: ['revenge', 'jealousy', 'property'] },
];

export const RELATIONSHIP_BY_ID: Record<Id, Relationship> = Object.fromEntries(
  RELATIONSHIPS.map((r) => [r.id, r]),
);

export const SUSPECT_ARCHETYPES: Archetype[] = [
  /* ------------------------------------------------------------------ money */
  {
    id: 'arch-heir',
    role: 'the victim’s nephew, at loose ends',
    genderHint: 'm',
    relationships: ['rel-cousin', 'rel-willed', 'rel-inlaw', 'rel-engaged'],
    motives: ['inheritance', 'debt', 'jealousy'],
    secrets: ['gambling-debt', 'affair', 'secret-drinking', 'dope'],
    class: 'money',
  },
  {
    id: 'arch-widow',
    role: 'a widow with rooms on the avenue',
    genderHint: 'f',
    relationships: ['rel-spouse', 'rel-willed', 'rel-cousin', 'rel-neighbor'],
    motives: ['inheritance', 'jealousy', 'insurance'],
    secrets: ['affair', 'blackmail', 'secret-drinking', 'hidden-family'],
    class: 'money',
  },
  {
    id: 'arch-broker',
    role: 'a curb broker',
    relationships: ['rel-partner', 'rel-creditor', 'rel-debtor', 'rel-rival'],
    motives: ['debt', 'exposure', 'property'],
    secrets: ['embezzling', 'gambling-debt', 'fence'],
    class: 'money',
  },
  {
    id: 'arch-society',
    role: 'a society columnist',
    relationships: ['rel-rival', 'rel-neighbor', 'rel-witness'],
    motives: ['exposure', 'revenge', 'silence-a-witness'],
    secrets: ['blackmail', 'affair', 'dope'],
    class: 'money',
  },
  {
    id: 'arch-blockowner',
    role: 'the owner of the block',
    relationships: ['rel-landlord', 'rel-rival', 'rel-partner'],
    motives: ['property', 'debt', 'revenge'],
    secrets: ['embezzling', 'fence', 'blackmail'],
    class: 'money',
  },

  /* ----------------------------------------------------------- professional */
  {
    id: 'arch-lawyer',
    role: 'a lawyer with one clerk',
    relationships: ['rel-lawyer', 'rel-partner', 'rel-creditor'],
    motives: ['exposure', 'inheritance', 'property'],
    secrets: ['embezzling', 'gambling-debt', 'blackmail'],
    class: 'professional',
  },
  {
    id: 'arch-bookkeeper',
    role: 'a bookkeeper',
    relationships: ['rel-employee', 'rel-partner', 'rel-debtor'],
    motives: ['exposure', 'debt', 'revenge'],
    secrets: ['embezzling', 'forged-identity', 'gambling-debt'],
    class: 'professional',
  },
  {
    id: 'arch-nurse',
    role: 'a private nurse',
    genderHint: 'f',
    relationships: ['rel-nurse', 'rel-neighbor', 'rel-willed'],
    motives: ['inheritance', 'silence-a-witness', 'protect-another'],
    secrets: ['dope', 'hidden-family', 'affair'],
    class: 'professional',
  },
  {
    id: 'arch-dentist',
    role: 'a dentist with rooms on the third floor',
    relationships: ['rel-tenant', 'rel-neighbor', 'rel-debtor'],
    motives: ['debt', 'exposure', 'property'],
    secrets: ['dope', 'affair', 'forged-identity'],
    class: 'professional',
  },
  {
    id: 'arch-secretary',
    role: 'a private secretary',
    relationships: ['rel-secretary', 'rel-employee'],
    motives: ['exposure', 'jealousy', 'silence-a-witness'],
    secrets: ['affair', 'embezzling', 'blackmail'],
    class: 'professional',
  },
  {
    id: 'arch-reporter',
    role: 'a stringer for the evening papers',
    relationships: ['rel-witness', 'rel-rival', 'rel-neighbor'],
    motives: ['exposure', 'silence-a-witness', 'revenge'],
    secrets: ['blackmail', 'secret-drinking', 'gambling-debt'],
    class: 'professional',
  },
  {
    id: 'arch-piano-teacher',
    role: 'a piano teacher',
    relationships: ['rel-tenant', 'rel-neighbor', 'rel-childhood'],
    motives: ['revenge', 'protect-another', 'property'],
    secrets: ['affair', 'hidden-family', 'secret-drinking'],
    class: 'professional',
  },
  {
    id: 'arch-adjuster',
    role: 'an insurance adjuster',
    relationships: ['rel-creditor', 'rel-rival', 'rel-witness'],
    motives: ['insurance', 'exposure', 'property'],
    secrets: ['forged-identity', 'gambling-debt', 'embezzling'],
    class: 'professional',
  },

  /* ---------------------------------------------------------------- working */
  {
    id: 'arch-chambermaid',
    role: 'a chambermaid',
    genderHint: 'f',
    relationships: ['rel-employee', 'rel-tenant'],
    motives: ['revenge', 'exposure', 'debt'],
    secrets: ['fence', 'hidden-family', 'affair'],
    class: 'working',
  },
  {
    id: 'arch-longshoreman',
    role: 'a longshoreman',
    genderHint: 'm',
    relationships: ['rel-tenant', 'rel-childhood', 'rel-debtor'],
    motives: ['debt', 'revenge', 'protect-another'],
    secrets: ['union-organizing', 'gambling-debt', 'fence'],
    class: 'working',
  },
  {
    id: 'arch-seamstress',
    role: 'a seamstress',
    genderHint: 'f',
    relationships: ['rel-tenant', 'rel-employee', 'rel-neighbor'],
    motives: ['revenge', 'property', 'exposure'],
    secrets: ['hidden-family', 'affair', 'union-organizing'],
    class: 'working',
  },
  {
    id: 'arch-hackman',
    role: 'a hack driver',
    genderHint: 'm',
    relationships: ['rel-tenant', 'rel-debtor', 'rel-childhood'],
    motives: ['debt', 'revenge'],
    secrets: ['gambling-debt', 'fence', 'secret-drinking'],
    class: 'working',
  },
  {
    id: 'arch-tailor',
    role: 'a tailor',
    relationships: ['rel-tenant', 'rel-customer', 'rel-neighbor'],
    motives: ['property', 'debt', 'revenge'],
    secrets: ['fence', 'hidden-family', 'union-organizing'],
    class: 'working',
  },
  {
    id: 'arch-stagehand',
    role: 'a stagehand at the Selwyn',
    relationships: ['rel-childhood', 'rel-neighbor', 'rel-customer'],
    motives: ['revenge', 'jealousy', 'debt'],
    secrets: ['union-organizing', 'secret-drinking', 'gambling-debt'],
    class: 'working',
  },
  {
    id: 'arch-switchboard',
    role: 'a switchboard operator',
    genderHint: 'f',
    relationships: ['rel-employee', 'rel-tenant', 'rel-neighbor'],
    motives: ['exposure', 'silence-a-witness', 'jealousy'],
    secrets: ['blackmail', 'affair', 'hidden-family'],
    class: 'working',
  },
  {
    id: 'arch-nightman',
    role: 'the night manager at the hotel',
    relationships: ['rel-employee', 'rel-tenant', 'rel-partner'],
    motives: ['revenge', 'exposure', 'debt'],
    secrets: ['embezzling', 'secret-drinking', 'fence'],
    class: 'working',
  },
  {
    id: 'arch-chorus',
    role: 'a chorus girl between engagements',
    genderHint: 'f',
    relationships: ['rel-neighbor', 'rel-engaged', 'rel-customer'],
    motives: ['jealousy', 'exposure', 'debt'],
    secrets: ['affair', 'dope', 'secret-drinking'],
    class: 'working',
  },

  /* ------------------------------------------------------------- underworld */
  {
    id: 'arch-bookmaker',
    role: 'a bookmaker in a small way',
    relationships: ['rel-creditor', 'rel-customer', 'rel-debtor'],
    motives: ['debt', 'silence-a-witness', 'revenge'],
    secrets: ['fence', 'forged-identity', 'gambling-debt'],
    class: 'underworld',
  },
  {
    id: 'arch-heeler',
    role: 'a ward heeler',
    genderHint: 'm',
    relationships: ['rel-witness', 'rel-rival', 'rel-partner'],
    motives: ['silence-a-witness', 'exposure', 'property'],
    secrets: ['blackmail', 'fence', 'gambling-debt'],
    class: 'underworld',
  },
  {
    id: 'arch-pawnman',
    role: 'a pawnbroker’s man',
    relationships: ['rel-customer', 'rel-creditor', 'rel-rival'],
    motives: ['debt', 'exposure', 'revenge'],
    secrets: ['fence', 'forged-identity', 'dope'],
    class: 'underworld',
  },
  {
    id: 'arch-bouncer',
    role: 'a doorman at a club with no sign on it',
    genderHint: 'm',
    relationships: ['rel-childhood', 'rel-debtor', 'rel-witness'],
    motives: ['debt', 'protect-another', 'silence-a-witness'],
    secrets: ['fence', 'gambling-debt', 'dope'],
    class: 'underworld',
  },
  {
    id: 'arch-runner',
    role: 'a policy runner',
    genderHint: 'm',
    relationships: ['rel-customer', 'rel-debtor', 'rel-childhood'],
    motives: ['debt', 'silence-a-witness', 'revenge'],
    secrets: ['gambling-debt', 'fence', 'dope'],
    class: 'underworld',
  },
];

export const ARCHETYPE_BY_ID: Record<Id, Archetype> = Object.fromEntries(
  SUSPECT_ARCHETYPES.map((a) => [a.id, a]),
);

const ALL_SUSPECTS = SUSPECT_ARCHETYPES.map((a) => a.id);
const except = (...ids: Id[]): Id[] => ALL_SUSPECTS.filter((i) => !ids.includes(i));

export const VICTIM_ARCHETYPES: VictimArchetype[] = [
  {
    id: 'vic-landlord',
    role: 'the landlord of three tenements on Ninth Avenue',
    allowedSuspects: except('arch-blockowner', 'arch-chorus'),
  },
  {
    id: 'vic-bootlegger',
    role: 'a bootlegger with the lease on the top floor',
    genderHint: 'm',
    allowedSuspects: except('arch-nurse', 'arch-piano-teacher', 'arch-seamstress'),
  },
  {
    id: 'vic-heiress',
    role: 'an heiress between marriages',
    genderHint: 'f',
    allowedSuspects: except('arch-longshoreman', 'arch-runner', 'arch-tailor'),
  },
  {
    id: 'vic-agent',
    role: 'a theatrical agent',
    allowedSuspects: except('arch-longshoreman', 'arch-nurse'),
  },
  {
    id: 'vic-inspector',
    role: 'a buildings inspector',
    genderHint: 'm',
    allowedSuspects: except('arch-chorus', 'arch-widow', 'arch-nurse'),
  },
  {
    id: 'vic-union-treasurer',
    role: 'a union treasurer',
    allowedSuspects: except('arch-widow', 'arch-society', 'arch-nurse'),
  },
  {
    id: 'vic-pawnbroker',
    role: 'a pawnbroker',
    allowedSuspects: except('arch-society', 'arch-nurse', 'arch-piano-teacher'),
  },
  {
    id: 'vic-columnist',
    role: 'a society columnist',
    allowedSuspects: except('arch-longshoreman', 'arch-tailor'),
  },
  {
    id: 'vic-bondsman',
    role: 'a bail bondsman',
    allowedSuspects: except('arch-society', 'arch-piano-teacher'),
  },
  {
    id: 'vic-wholesaler',
    role: 'a retired dry-goods wholesaler',
    genderHint: 'm',
    allowedSuspects: except('arch-chorus', 'arch-runner'),
  },
];
