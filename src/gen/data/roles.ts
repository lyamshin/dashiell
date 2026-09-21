/**
 * Roles, relationships and hotel names.
 *
 * `gender` is only a hint for picking a given name that sits well with the
 * role; leave it off and the generator picks either. Extend any list freely.
 */
export interface RoleTemplate {
  text: string;
  gender?: 'male' | 'female';
}

export const VICTIM_ROLES: RoleTemplate[] = [
  { text: 'the owner of the hotel' },
  { text: 'a bootlegger with the lease on the top floor', gender: 'male' },
  { text: 'an heiress between marriages', gender: 'female' },
  { text: 'a theatrical agent' },
  { text: 'a buildings inspector', gender: 'male' },
  { text: 'a union treasurer' },
  { text: 'a pawnbroker' },
  { text: 'a society columnist' },
  { text: 'a shipping clerk who had come into money' },
  { text: 'the landlord of three tenements on Ninth Avenue' },
  { text: 'a bail bondsman' },
  { text: 'a retired dry-goods wholesaler' },
];

export const SUSPECT_ROLES: RoleTemplate[] = [
  { text: 'the night manager' },
  { text: 'a chambermaid', gender: 'female' },
  { text: 'a travelling salesman in patent medicines', gender: 'male' },
  { text: 'a piano teacher' },
  { text: 'a longshoreman', gender: 'male' },
  { text: 'a seamstress', gender: 'female' },
  { text: 'a private secretary' },
  { text: 'a bookkeeper' },
  { text: 'a chorus girl between engagements', gender: 'female' },
  { text: 'a stringer for the evening papers' },
  { text: 'a dentist with rooms on the third floor' },
  { text: 'a tailor' },
  { text: 'a private nurse' },
  { text: 'a stagehand at the Selwyn' },
  { text: 'an insurance adjuster' },
  { text: 'a ward heeler', gender: 'male' },
  { text: 'a wine steward out of work since the Act' },
  { text: 'a switchboard operator', gender: 'female' },
  { text: 'a bookmaker in a small way' },
  { text: 'a photographer for the rotogravure section' },
];

export const RELATIONSHIPS: string[] = [
  "the victim's business partner",
  "the victim's tenant",
  "the victim's former employee",
  "the victim's creditor",
  "the victim's debtor",
  "the victim's lawyer",
  "the victim's cousin",
  "the victim's brother-in-law",
  "the victim's rival in trade",
  "the victim's estranged spouse",
  "the victim's private nurse",
  "the victim's secretary",
  "engaged to the victim's daughter",
  'a childhood friend of the victim from the same block',
  "the victim's landlord",
  "named in the victim's will",
];

export const HOTEL_NAMES: string[] = [
  'The Ardsley',
  'Hotel Marchmont',
  'The Belvoir',
  'The Colonnade',
  'Hotel Saint Clair',
  'The Wexford Arms',
  'The Rensselaer',
  'Hotel Dunbarton',
  'The Gildersleeve',
  'The Penwick',
  'Hotel Amsterdam Court',
  'The Bellwether',
  'The Calloway',
  'The Norwood',
  'The Tarleton',
  'Hotel Craddock',
];
