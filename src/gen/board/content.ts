/**
 * Plain pools for the small board. 4a needs no decks: template sentences are
 * enough for the designer to judge the puzzles. Names come from the existing
 * name pools (src/gen/data/names.ts); these are only places, jobs and lines.
 */

/**
 * The night venue everybody passes through (decided 2026-09-28: the evenings vary). A bar, a
 * club, a restaurant or a picture house, open all evening, with somebody whose job keeps them
 * there to list who came in.
 */
export interface VenueDef {
  name: string;
  short: string;
  street: string;
  kind: 'bar' | 'club' | 'restaurant' | 'theatre' | 'work';
  job: string;
  /** For a night shift: what the person who works there does. */
  workerJob?: string;
}

export const VENUES: VenueDef[] = [
  { name: 'the Velvet Room, six steps down under a hat shop', short: 'the Velvet Room', street: 'Elizabeth Street', kind: 'bar', job: 'the bartender' },
  { name: 'the Shamrock, a bar on the corner', short: 'the Shamrock', street: 'Avenue B', kind: 'bar', job: 'the bartender' },
  { name: 'Hanley’s, a saloon with sawdust on the floor', short: 'Hanley’s', street: 'Houston Street', kind: 'bar', job: 'the bartender' },
  { name: 'Moe’s, a back-room bar behind a cigar store', short: 'Moe’s', street: 'Rivington Street', kind: 'bar', job: 'the bartender' },
  { name: 'the Blue Lantern, a cellar club behind a laundry', short: 'the Blue Lantern', street: 'Mulberry Street', kind: 'club', job: 'the doorkeeper' },
  { name: 'the Kit Kat, a speakeasy over a garage', short: 'the Kit Kat', street: 'Chrystie Street', kind: 'club', job: 'the doorkeeper' },
  { name: 'Moskowitz’s, a Romanian restaurant four steps down on Second Avenue', short: 'Moskowitz’s', street: 'Second Avenue', kind: 'restaurant', job: 'the head waiter' },
  { name: 'the Odessa, a café where the actors eat after the show', short: 'the Odessa', street: 'Second Avenue', kind: 'restaurant', job: 'the cashier at the register' },
  { name: 'the Grand Street chop house', short: 'the chop house', street: 'Grand Street', kind: 'restaurant', job: 'the head waiter' },
  { name: 'the Orpheum, a picture house with continuous shows till midnight', short: 'the Orpheum', street: 'Second Avenue', kind: 'theatre', job: 'the usher' },
  { name: 'the Bijou, a picture house on Clinton Street', short: 'the Bijou', street: 'Clinton Street', kind: 'theatre', job: 'the ticket seller' },
  { name: 'the Thalia, a Yiddish theatre on the Bowery', short: 'the Thalia', street: 'the Bowery', kind: 'theatre', job: 'the house manager' },
];

/**
 * A second watched place for the small cases at Raw and Coddled, when it isn't a rooming house:
 * a night shift. Picture houses and restaurants come from VENUES.
 */
export const NIGHT_SHIFTS: VenueDef[] = [
  { name: 'the telephone exchange on Spring Street', short: 'the exchange', street: 'Spring Street', kind: 'work', job: 'the night supervisor', workerJob: 'a switchboard operator on the night shift' },
  { name: 'Pechter’s bakery, where the night shift starts at eight', short: 'Pechter’s bakery', street: 'Ludlow Street', kind: 'work', job: 'the foreman', workerJob: 'a baker on the night shift' },
  { name: 'the night desk of the Evening Graphic', short: 'the Graphic’s night desk', street: 'Park Row', kind: 'work', job: 'the night editor', workerJob: 'a copy reader on the night desk' },
];

/**
 * The murder's origin in working hours (rule 11: "chloral sits on a landlady's shelf or in a
 * dentist's cabinet"). Open from the first hour until the means stops being there; somebody at
 * the desk lists who came in. A surgery is the worker's own.
 */
export interface WorkDef {
  /** `{owner}` is the worker suspect's family name. */
  name: string;
  short: string;
  street: string;
  workerJob: string;
  job: string;
  means: 'chloral' | 'gun';
  shelf: string;
  /** How the scene ties the means to the place. */
  label: string;
  /** Why a customer drops in. */
  visit: string[];
}

export const WORKPLACES: WorkDef[] = [
  { name: '{owner}’s dental surgery over the bank on Clinton Street', short: '{owner}’s surgery', street: 'Clinton Street', workerJob: 'a dentist', job: 'the receptionist at the front desk', means: 'chloral', shelf: 'the chloral in the surgery cabinet', label: 'Under the table an empty brown bottle with a surgery label: {place}.', visit: ['went to {p} to have a tooth seen to', 'went to {p} about a loose filling', 'went to {p} to pay a bill'] },
  { name: 'Weiss’s pharmacy on Essex Street', short: 'Weiss’s pharmacy', street: 'Essex Street', workerJob: 'a pharmacist’s clerk', job: 'the pharmacist, behind his counter', means: 'chloral', shelf: 'the chloral on the dispensary shelf', label: 'Under the table an empty bottle with a Weiss’s pharmacy label, from the dispensary shelf.', visit: ['went to {p} for a powder for {their} nerves', 'went to {p} for cough mixture', 'went to {p} to have a prescription made up'] },
  { name: 'Kaplan’s pawnshop on the Bowery', short: 'Kaplan’s pawnshop', street: 'the Bowery', workerJob: 'a pawnbroker’s clerk', job: 'the pawnbroker, behind his cage', means: 'gun', shelf: 'the revolver in the pledge case', label: 'A revolver under the chair, one chamber fired, with Kaplan’s pledge ticket still tied to the trigger guard.', visit: ['went to {p} to redeem a pledge', 'went to {p} to pawn a coat', 'went to {p} to ask about a ring in the window'] },
];

export interface HouseDef {
  name: string;
  short: string;
  street: string;
  /** The landlady's family name, when the house carries it. */
  landlady?: string;
}

/** Rooming houses: a landlady on her stairs, lodgers, and a shelf or a drawer. */
export const ROOMING: HouseDef[] = [
  { name: 'Rafferty’s rooming house on Mott Street', short: 'Rafferty’s', street: 'Mott Street', landlady: 'Rafferty' },
  { name: 'Mrs. Kowalski’s boarding house on Orchard Street', short: 'Kowalski’s', street: 'Orchard Street', landlady: 'Kowalski' },
  { name: 'the Delmonico rooms over the fish market', short: 'the Delmonico rooms', street: 'Catherine Street' },
  { name: 'Mrs. Nagy’s rooms on East Fourth Street', short: 'Mrs. Nagy’s', street: 'East Fourth Street', landlady: 'Nagy' },
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
  kind: 'club' | 'home' | 'restaurant' | 'theatre' | 'work';
  /** What an innocent liar was really doing there. */
  secret: string;
  /** Why an honest person goes there. */
  honest: string;
  /** Who keeps the place, when an innocent refuses and the place has to speak for them. */
  keeper: string;
}

/** Unwatched places: where a secret goes, or a person who was alone. */
export const UNWATCHED: UDef[] = [
  { name: 'the card room over the Bowery garage', short: 'the card room', street: 'Forsyth Street', kind: 'club', secret: 'a card game {they} swore off at Easter', honest: 'went up to the card room to do the books', keeper: 'the man who runs the game' },
  { name: 'the back of Sokol’s bakery on Rivington Street, where the numbers are taken', short: 'Sokol’s back room', street: 'Rivington Street', kind: 'club', secret: 'playing the numbers, sworn off at Easter', honest: 'went round to Sokol’s for coffee with Sokol', keeper: 'the man who takes the slips' },
  { name: 'the back office of the Eagle Social Club', short: 'the Eagle club office', street: 'Eldridge Street', kind: 'club', secret: 'a meeting with a man who lends money', honest: 'went to the Eagle club office to write letters', keeper: 'the club steward' },
  { name: 'the Automat on Delancey Street, open all night', short: 'the Automat', street: 'Delancey Street', kind: 'restaurant', secret: 'a meeting {they} promised at home never to have', honest: 'went to the Automat for coffee and a newspaper', keeper: 'the cashier in the change booth' },
  { name: 'the back row of the Palace, a picture house on Delancey Street', short: 'the Palace', street: 'Delancey Street', kind: 'theatre', secret: 'an evening with someone {they} is not married to', honest: 'went to the Palace to sit through the double bill', keeper: 'the usher' },
  { name: 'the print shop on Centre Street, which runs a night shift', short: 'the print shop', street: 'Centre Street', kind: 'work', secret: 'printing handbills for the union, which {their} boss would fire {them} for', honest: 'went in to the print shop to set type for the morning', keeper: 'the foreman' },
];

/**
 * Reasons for a move, by the kind of place moved to (rule 3). A case draws each at most once:
 * no two people give the same reason (decided 2026-09-28). `{p}` is the place; `{they}`,
 * `{them}` and `{their}` the mover; `{h}` the hour.
 */
export const REASONS: Record<string, string[]> = {
  bar: ['went over to {p} for a drink', 'met a friend at {p}', 'wanted company, so went to {p}', 'went down to {p} to hear the piano', 'had a standing date at {p}', 'went to {p} to settle a bet', 'stopped in at {p} to get warm', 'went to {p} to hear the fight on the wireless'],
  club: ['went to {p} to dance', 'went to {p}, where the band was new', 'met some people at {p}', 'went down to {p} to hear the trumpet', 'had a table at {p}', 'went to {p}, because a friend was on the door'],
  restaurant: ['went to {p} for supper', 'hadn’t eaten, so went to {p}', 'met {their} sister at {p} for supper', 'went to {p} for coffee and pie', 'went to {p} to read the late paper over a plate of soup', 'went to {p} for a glass of tea'],
  theatre: ['went to the second show at {p}', 'had a ticket for {p}', 'went to {p} to see the new picture', 'went to {p} to get off {their} feet for two hours', 'went to {p}, because a friend was in the show'],
  work: ['went on shift at {p}', 'started {their} shift at {p}', 'was called in to {p} to cover a shift', 'went in to {p} early, for the overtime'],
  home: ['went home', 'went home to bed', 'went back to {their} room to write letters', 'went home to change', 'went home, because {their} feet hurt', 'turned in early'],
  visit: ['went up to {p} to see a lodger about money', 'called on a friend who lodges at {p}', 'went to {p} to collect a debt', 'dropped a parcel off at {p}', 'went round to {p} to borrow a collar stud'],
  party: ['left the party early', 'left the party when the cards went badly', 'left the party when the gin ran out', 'left the party to get some air'],
  closed: ['closed up at {h}', 'came off shift at {h}', 'locked up at {h}'],
};

export const JOBS = [
  'a switchboard operator',
  'a piano teacher',
  'a bookmaker',
  'a bus conductor',
  'a sewing-machine operator',
  'a cafeteria cashier',
  'a shoe clerk',
  'an insurance agent',
  'a cab driver',
  'a typist',
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

/** Who has the lost thing now, and why it was taken; `kinds` are the venues they'd sit in. */
export const HOLDERS = [
  { who: 'Lou, a bookmaker who takes bets in the back booth', why: 'he owes Lou', kinds: ['bar', 'club', 'restaurant'] },
  { who: 'a man called Pardo, who buys things and asks nothing', why: 'he needed the money by morning', kinds: ['bar', 'club', 'restaurant', 'theatre'] },
  { who: 'a pawnbroker’s runner who sits there late', why: 'the rent was due', kinds: ['bar', 'club', 'restaurant', 'theatre'] },
];
