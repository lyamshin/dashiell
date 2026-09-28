/**
 * Plain pools for the small board. 4a needs no decks: template sentences are
 * enough for the designer to judge the puzzles. Names come from the existing
 * name pools (src/gen/data/names.ts); these are only places, jobs and lines.
 */

export interface BarDef {
  name: string;
  short: string;
  street: string;
  kind: 'bar' | 'club';
  job: string;
}

export const BARS: BarDef[] = [
  { name: 'the Velvet Room, six steps down under a hat shop', short: 'the Velvet Room', street: 'Elizabeth Street', kind: 'bar', job: 'the bartender' },
  { name: 'the Shamrock, a bar on the corner', short: 'the Shamrock', street: 'Avenue B', kind: 'bar', job: 'the bartender' },
  { name: 'Hanley’s, a saloon with sawdust on the floor', short: 'Hanley’s', street: 'Houston Street', kind: 'bar', job: 'the barman' },
  { name: 'the Blue Lantern, a cellar club behind a laundry', short: 'the Blue Lantern', street: 'Mulberry Street', kind: 'club', job: 'the doorman' },
  { name: 'the Kit Kat, a speakeasy over a garage', short: 'the Kit Kat', street: 'Chrystie Street', kind: 'club', job: 'the doorman' },
  { name: 'Moe’s, a back-room bar behind a cigar store', short: 'Moe’s', street: 'Rivington Street', kind: 'bar', job: 'the bartender' },
];

export interface HouseDef {
  name: string;
  short: string;
  street: string;
}

/** Rooming houses: a landlady on her stairs, lodgers, and a shelf or a drawer. */
export const ROOMING: HouseDef[] = [
  { name: 'Rafferty’s rooming house on Mott Street', short: 'Rafferty’s', street: 'Mott Street' },
  { name: 'Mrs. Kowalski’s boarding house on Orchard Street', short: 'Kowalski’s', street: 'Orchard Street' },
  { name: 'the Delmonico rooms over the fish market', short: 'the Delmonico rooms', street: 'Catherine Street' },
  { name: 'Mrs. Nagy’s rooms on East Fourth Street', short: 'Mrs. Nagy’s', street: 'East Fourth Street' },
];

export const SCENE_HOMES: { tail: string; street: string }[] = [
  { tail: 'walk-up over the drugstore on Grand Street', street: 'Grand Street' },
  { tail: 'two rooms over the bakery on Hester Street', street: 'Hester Street' },
  { tail: 'flat on the top floor of 12 Ludlow Street', street: 'Ludlow Street' },
  { tail: 'rooms behind the tailor’s on Allen Street', street: 'Allen Street' },
];

export const LOST_SCENES: { tail: string; street: string }[] = [
  { tail: 'flat on the third floor of 40 Avenue B', street: 'Avenue B' },
  { tail: 'parlour floor on Stuyvesant Street', street: 'Stuyvesant Street' },
  { tail: 'flat over the delicatessen on Second Avenue', street: 'Second Avenue' },
];

export interface UDef {
  name: string;
  short: string;
  street: string;
  kind: 'club' | 'home' | 'restaurant';
  /** What an innocent liar was really doing there. */
  secret: string;
  /** What an honest person does there. */
  honest: string;
}

/** Unwatched places: where a secret goes, or a person who was alone. */
export const UNWATCHED: UDef[] = [
  { name: 'the card room over the Bowery garage', short: 'the card room', street: 'Forsyth Street', kind: 'club', secret: 'a card game {they} swore off at Easter', honest: 'doing the books' },
  { name: 'the back of Sokol’s bakery on Rivington Street, where the numbers are taken', short: 'Sokol’s back room', street: 'Rivington Street', kind: 'club', secret: 'playing the numbers, sworn off at Easter', honest: 'coffee with Sokol' },
  { name: 'the back office of the Eagle Social Club', short: 'the Eagle club office', street: 'Eldridge Street', kind: 'club', secret: 'a meeting with a man who lends money', honest: 'writing letters' },
  { name: 'the all-night Automat on Delancey Street', short: 'the Automat', street: 'Delancey Street', kind: 'restaurant', secret: 'a meeting {they} promised at home never to have', honest: 'coffee and a newspaper' },
];

export const JOBS = [
  'a switchboard operator',
  'a piano teacher',
  'a bookmaker',
  'a dentist',
  'a bus conductor',
  'a seamstress',
  'a waiter',
  'a shoe clerk',
  'an insurance man',
  'a cab driver',
  'a typist',
  'a pharmacist’s clerk',
  'a milliner',
  'a night-school teacher',
];

export const VICTIM_JOBS = ['a buildings inspector', 'a pawnbroker', 'a landlord', 'a moneylender', 'an alderman’s clerk', 'a bail bondsman'];

export const MOTIVES = [
  '{victim} had a file on {them}',
  '{they} owed {victim} four hundred dollars',
  '{victim} closed {their} business',
  '{victim} had been squeezing {them} for years',
  '{victim} testified against {their} brother',
  '{victim} threw {them} out of a lease',
  '{victim} knew where {they} was in 1921',
];

export const SMALL_MOTIVES = [
  '{they} owes a bookmaker',
  '{they} always said it was wasted on its owner',
  '{they} is three weeks behind on the rent',
  '{they} hates the thing, and says so',
];

export const LOOKS = [
  'in a camel coat',
  'in a green hat',
  'with a bandaged hand',
  'in a grey fedora',
  'in a fur collar',
  'in a sailor’s pea coat',
  'with a cane',
];

export const ITEMS = [
  { name: 'a late husband’s gold watch', short: 'the watch', where: 'under a glass dome on the parlour mantel', empty: 'The glass dome on the mantel is empty.' },
  { name: 'a pearl brooch', short: 'the brooch', where: 'in the dish on the dresser', empty: 'The dish on the dresser is empty.' },
  { name: 'a silver cigarette case', short: 'the cigarette case', where: 'on the sideboard', empty: 'There’s a clean square in the dust on the sideboard.' },
];

export const PETS = [
  { name: 'Fritz, a dachshund', short: 'Fritz', where: 'in his basket by the stove', empty: 'The basket by the stove is empty.' },
  { name: 'Mimi, a Persian cat', short: 'Mimi', where: 'on the window seat', empty: 'The window seat is empty but for white hairs.' },
  { name: 'Caruso, a canary', short: 'Caruso', where: 'in his cage by the window', empty: 'The hook by the window where the cage hung is empty.' },
];

export const HOLDERS = [
  { who: 'Lou, a bookmaker who takes bets in the back booth', why: 'he owes Lou' },
  { who: 'a man called Pardo, who buys things and asks nothing', why: 'he needed the money by morning' },
  { who: 'the pawnbroker Kaplan’s runner, who drinks there late', why: 'the rent was due' },
];
