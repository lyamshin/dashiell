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
  /** docs/44: a stage, not a screen. It has plays and shows, never pictures. */
  stage?: boolean;
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
  { name: 'the Thalia, a Yiddish theatre on the Bowery', short: 'the Thalia', street: 'the Bowery', kind: 'theatre', job: 'the house manager', stage: true },
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
  means: 'chloral' | 'gun' | 'poison';
  /** The means' name, as the office and the reading say it. */
  meansName: string;
  shelf: string;
  /** How the scene ties the means to the place. */
  label: string;
  /** Why a customer drops in. */
  visit: string[];
}

export const WORKPLACES: WorkDef[] = [
  { name: '{owner}’s dental surgery over the bank on Clinton Street', short: '{owner}’s surgery', street: 'Clinton Street', workerJob: 'a dentist', job: 'the receptionist at the front desk', means: 'chloral', meansName: 'chloral', shelf: 'the chloral in the surgery cabinet', label: 'Under the table an empty brown bottle with a surgery label: {place}.', visit: ['went to {p} to have a tooth seen to', 'went to {p} about a loose filling', 'went to {p} to pay a bill'] },
  { name: 'Weiss’s pharmacy on Essex Street', short: 'Weiss’s pharmacy', street: 'Essex Street', workerJob: 'a pharmacist’s clerk', job: 'the pharmacist, behind his counter', means: 'chloral', meansName: 'chloral', shelf: 'the chloral on the dispensary shelf', label: 'Under the table an empty bottle with a Weiss’s pharmacy label, from the dispensary shelf.', visit: ['went to {p} for a powder for {their} nerves', 'went to {p} for cough mixture', 'went to {p} to have a prescription made up'] },
  { name: 'Kaplan’s pawnshop on the Bowery', short: 'Kaplan’s pawnshop', street: 'the Bowery', workerJob: 'a pawnbroker’s clerk', job: 'the pawnbroker, behind his cage', means: 'gun', meansName: 'a revolver', shelf: 'the revolver in the pledge case', label: 'A revolver under the chair, one chamber fired, with Kaplan’s pledge ticket still tied to the trigger guard.', visit: ['went to {p} to redeem a pledge', 'went to {p} to pawn a coat', 'went to {p} to ask about a ring in the window'] },
  { name: 'Feld’s photographic studio on Canal Street', short: 'Feld’s studio', street: 'Canal Street', workerJob: 'a photographer’s assistant', job: 'Mr. Feld, at the counter', means: 'poison', meansName: 'cyanide', shelf: 'the cyanide in the darkroom', label: 'A glass that smells of bitter almonds, and beside it a darkroom bottle labelled {place}.', visit: ['went to {p} to sit for a portrait', 'went to {p} to collect some prints', 'went to {p} about a photograph for a passport'] },
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
  /** 4b: more honest reasons, for a second person there or the first hour. Never the place's own kind's pool. */
  more: string[];
  /** Who keeps the place, when an innocent refuses and the place has to speak for them. */
  keeper: string;
  /** Who the secret was with, as the keeper lists them: somebody they can't name (4a.2). */
  companion?: string;
}

/** Unwatched places: where a secret goes, or a person who was alone. */
export const UNWATCHED: UDef[] = [
  { name: 'the card room over the Bowery garage', short: 'the card room', street: 'Forsyth Street', kind: 'club', secret: 'a card game {they} swore off at Easter', honest: 'went up to the card room to do the books', more: ['went up to the card room to watch the game and not play', 'went up to the card room to collect what {they} was owed'], keeper: 'the man who runs the game', companion: 'two men off the docks I didn’t know' },
  { name: 'the back of Sokol’s bakery on Rivington Street, where the numbers are taken', short: 'Sokol’s back room', street: 'Rivington Street', kind: 'club', secret: 'playing the numbers, sworn off at Easter', honest: 'went round to Sokol’s for coffee with Sokol', more: ['went round to Sokol’s to sit in the warm by the ovens', 'went round to Sokol’s to buy the morning’s rolls the night before'], keeper: 'the man who takes the slips' },
  { name: 'the back office of the Eagle Social Club', short: 'the Eagle club office', street: 'Eldridge Street', kind: 'club', secret: 'a meeting with a man who lends money', honest: 'went to the Eagle club office to write letters', more: ['went to the Eagle club office to pay {their} dues', 'went to the Eagle club office for the committee meeting'], keeper: 'the club steward', companion: 'a man from uptown I didn’t know' },
  { name: 'the Automat on Delancey Street, open all night', short: 'the Automat', street: 'Delancey Street', kind: 'restaurant', secret: 'a meeting {they} promised at home never to have', honest: 'went to the Automat for coffee and a newspaper', more: ['went to the Automat for a plate of beans', 'went to the Automat to sit somewhere warm for a nickel'], keeper: 'the cashier in the change booth', companion: 'somebody at the same table I didn’t know' },
  { name: 'the back row of the Palace, a picture house on Delancey Street', short: 'the Palace', street: 'Delancey Street', kind: 'theatre', secret: 'an evening with someone {they} is not married to', honest: 'went to the Palace to sit through the double bill', more: ['went to the Palace for the newsreel and the cartoon', 'went to the Palace because the picture had Ronald Colman in it'], keeper: 'the usher', companion: 'somebody in the next seat I didn’t know' },
  { name: 'the print shop on Centre Street, which runs a night shift', short: 'the print shop', street: 'Centre Street', kind: 'work', secret: 'printing handbills for the union, which {their} boss would fire {them} for', honest: 'went in to the print shop to set type for the morning', more: ['went in to the print shop to run off the church bulletin', 'went in to the print shop to sweep up for a dollar'], keeper: 'the foreman', companion: 'two union men I didn’t know' },
];

/**
 * Reasons for a move, by the kind of place moved to (rule 3). A case draws each at most once:
 * no two people give the same reason (decided 2026-09-28). `{p}` is the place; `{they}`,
 * `{them}` and `{their}` the mover; `{h}` the hour.
 */
export const REASONS: Record<string, string[]> = {
  bar: ['went over to {p} for a drink', 'met a friend at {p}', 'wanted company, so went to {p}', 'went down to {p} to hear the piano', 'had a standing date at {p}', 'went to {p} to settle a bet', 'stopped in at {p} to get warm', 'went to {p} to hear the fight on the radio'],
  club: ['went to {p} to dance', 'went to {p}, where the band was new', 'met some people at {p}', 'went down to {p} to hear the trumpet', 'had a table at {p}', 'went to {p}, because a friend was on the door'],
  restaurant: ['went to {p} for supper', 'hadn’t eaten, so went to {p}', 'met {their} sister at {p} for supper', 'went to {p} for coffee and pie', 'went to {p} to read the late paper over a plate of soup', 'went to {p} for a glass of tea'],
  theatre: ['went to the second show at {p}', 'had a ticket for {p}', 'went to {p} to see the new picture', 'went to {p} to get off {their} feet for two hours', 'went to {p}, because a friend was in the show'],
  work: ['went on shift at {p}', 'started {their} shift at {p}', 'was called in to {p} to cover a shift', 'went in to {p} early, for the overtime'],
  home: ['went home', 'went home to bed', 'went home to listen to the radio', 'went home to iron a shirt for the morning', 'went back to {their} room to write letters', 'went home to change', 'went home, because {their} feet hurt', 'turned in early'],
  /** An errand at somebody else's home: an hour at most (4a.2). */
  errand: ['went up to {p} to see a lodger about money', 'went to {p} to collect a debt', 'dropped a parcel off at {p}', 'went round to {p} to borrow a collar stud', 'went round to {p} to return a borrowed umbrella', 'took a letter round to a lodger at {p}'],
  /** A real visit at somebody else's home, which can last the evening. */
  visit: ['called on a friend who lodges at {p}', 'went to {p} to sit with a sick friend', 'went to {p} for a game of pinochle with a lodger', 'went to {p} to help a friend write letters home'],
  /**
   * 4b: going along with somebody on their errand. Two errands to one house in one hour read as a
   * coincidence; the second person who came from the same place went with the first.
   */
  along: ['went along with {x} to {p}', 'walked round to {p} with {x}', 'kept {x} company as far as {p}'],
  party: ['left the party early', 'left the party when the cards went badly', 'left the party when the gin ran out', 'left the party to get some air'],
  closed: ['closed up at {h}', 'came off shift at {h}', 'locked up at {h}'],
};

/**
 * 4b: a reason that says how long it lasts fits only a stint that long. "To get off her feet for
 * two hours" is two hours or more; "to bed" or "turned in" is the rest of the evening.
 */
export function reasonFits(reason: string, len: number, toEnd: boolean): boolean {
  if (/\bfor two hours\b/.test(reason)) return len >= 2;
  if (/\bto bed\b|\bturned in\b/.test(reason)) return toEnd;
  return true;
}

/**
 * 4a.2: an errand lasts an hour at most. These are the errand reasons as patterns, so the
 * invariant can tell one in any case, hand-built or generated.
 */
export function isErrand(reason: string): boolean {
  return ERRAND_PATTERNS.some((re) => re.test(reason));
}
const ERRAND_PATTERNS: RegExp[] = [...(REASONS.errand as string[]), ...(REASONS.along as string[]), ...WORKPLACES.flatMap((w) => w.visit)].map(
  (t) =>
    new RegExp(
      t
        .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
        .replace(/\{[px]\}/g, '.+')
        .replace(/\{(they|them|their)\}/g, '\\w+'),
    ),
);

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

/**
 * A murder's motives, by kind (4a.2: the client's reason for pointing is one of the setup's three
 * choices). `{victim}` is the dead man's family name.
 */
export const MOTIVES: { kind: string; text: string }[] = [
  { kind: 'blackmail', text: '{victim} had a file on {them}' },
  { kind: 'blackmail', text: '{victim} had been squeezing {them} for years' },
  { kind: 'blackmail', text: '{victim} knew where {they} was in 1921' },
  { kind: 'debt', text: '{they} owed {victim} four hundred dollars' },
  { kind: 'debt', text: '{they} owed {victim} the rent on a shop, and he was calling it in' },
  { kind: 'ruin', text: '{victim} closed {their} business' },
  { kind: 'ruin', text: '{victim} threw {them} out of a lease' },
  { kind: 'revenge', text: '{victim} testified against {their} brother' },
  { kind: 'revenge', text: '{victim} jilted {their} sister a week before the wedding' },
];

/**
 * How the client says why they point (4a.2). Each wraps the person's motive differently, so a
 * reading never sees one shape twice running.
 */
export const MURDER_POINTERS: { kind: string; text: string }[] = [
  { kind: 'motive', text: '{Client} points at {P}: {motive}.' },
  { kind: 'threat', text: '{Client} points at {P}, who swore at him in the street on Monday, in front of the fruit man: {motive}.' },
  { kind: 'letter', text: '{Client} found a letter from {P} in his desk, and points at {pthem}: {motive}.' },
  { kind: 'gossip', text: '{Client} points at {P}, on the word of the woman downstairs: {motive}.' },
];

/**
 * A small case's motives (4a.2: motives must fit the crime). Nobody takes a dog over the rent
 * unless they mean to sell it, and then they say so; the culprit always sells (`money`).
 * `{thing}` is the lost thing; `{pet}` its name; `{pthem}` its pronoun.
 */
export const SMALL_MOTIVES: { kind: string; text: string; types: ('lost-item' | 'lost-pet')[]; holder?: string; species?: string[] }[] = [
  { kind: 'money', text: '{they} owes Lou the bookmaker forty dollars, and Lou takes things in kind', types: ['lost-item', 'lost-pet'], holder: 'Lou' },
  { kind: 'money', text: '{they} is three weeks behind on the rent, and has been heard to say what a {breed} with papers fetches', types: ['lost-pet'] },
  { kind: 'money', text: '{they} is three weeks behind on the rent, and once asked what {thing} would pawn for', types: ['lost-item'] },
  { kind: 'money', text: '{they} lost {their} job on Friday, and asked {client} what {thing} was worth', types: ['lost-item', 'lost-pet'] },
  { kind: 'grudge', text: '{pet} bit {them} at Easter, and {they} swore {they}’d see the back of {pthem}', types: ['lost-pet'], species: ['dog', 'cat'] },
  { kind: 'grudge', text: '{pet} sings through {their} wall at five every morning, and {they} has said what {they}’d do about it', types: ['lost-pet'], species: ['bird'] },
  { kind: 'claim', text: '{they} says {thing} was promised to {them} by the late Mr. {client}', types: ['lost-item'] },
  { kind: 'want', text: '{they} has wanted {pet} since the day {client} brought {pthem} home', types: ['lost-pet'] },
  { kind: 'want', text: '{they} always said {thing} was wasted on its owner', types: ['lost-item'] },
  { kind: 'spite', text: '{they} and {client} haven’t spoken since the business over the coal bill', types: ['lost-item', 'lost-pet'] },
];

/** How the client says why they point, in a small case. `behaviour` needs something true of the person. */
export const SMALL_POINTERS: { kind: string; text: string }[] = [
  { kind: 'motive', text: '{Client} points at {P}: {motive}.' },
  { kind: 'gossip', text: '{Client} points at {P}. The woman downstairs says {motive}.' },
  { kind: 'behaviour', text: '{Client} points at {P}, who {behaviour}.' },
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
  { name: 'a late husband’s gold watch', short: 'the watch', where: 'under a glass dome on the parlour mantel', empty: 'The glass dome on the mantel is empty.', weigh: 'took the watch out from under its dome and weighed it in {their} hand' },
  { name: 'a pearl brooch', short: 'the brooch', where: 'in the dish on the dresser', empty: 'The dish on the dresser is empty.', weigh: 'held the brooch up to the lamp to see if the pearls were real' },
  { name: 'a silver cigarette case', short: 'the cigarette case', where: 'on the sideboard', empty: 'There’s a clean square in the dust on the sideboard.', weigh: 'turned the cigarette case over to read the hallmark' },
  { name: 'a set of silver spoons', short: 'the spoons', where: 'in the velvet box in the sideboard drawer', empty: 'The velvet box in the sideboard drawer is empty.', weigh: 'counted the spoons out loud' },
];

export const PETS = [
  { name: 'Fritz, a dachshund', short: 'Fritz', breed: 'dachshund', species: 'dog', male: true, where: 'in his basket by the stove', empty: 'The basket by the stove is empty.', keep: 'for his supper', asks: 'asked twice where Fritz sleeps' },
  { name: 'Mimi, a Persian cat', short: 'Mimi', breed: 'Persian', species: 'cat', male: false, where: 'on the window seat', empty: 'The window seat is empty but for white hairs.', keep: 'to keep the mice down', asks: 'picked Mimi up and asked what she cost' },
  { name: 'Caruso, a canary', short: 'Caruso', breed: 'roller canary', species: 'bird', male: true, where: 'in his cage by the window', empty: 'The hook by the window where the cage hung is empty.', keep: 'to sing for my mother', asks: 'asked whether Caruso was a real Harz roller' },
  { name: 'Duchess, a Pomeranian', short: 'Duchess', breed: 'Pomeranian', species: 'dog', male: false, where: 'on her cushion by the radiator', empty: 'The cushion by the radiator is empty.', keep: 'for her supper', asks: 'asked twice whether Duchess had papers' },
];

/** Who has the lost thing now; `kinds` are the venues they sit in, every night. */
export const HOLDERS = [
  { id: 'Lou', who: 'Lou, a bookmaker who takes bets in the back booth', listed: 'Lou the bookmaker in his back booth', kinds: ['bar', 'club', 'restaurant'] },
  { id: 'Pardo', who: 'a man called Pardo, who buys things and asks nothing', listed: 'Pardo who buys things', kinds: ['bar', 'club', 'restaurant', 'theatre'] },
  { id: 'runner', who: 'a pawnbroker’s runner called Benny, who sits there late', listed: 'Benny the pawnbroker’s runner', kinds: ['bar', 'club', 'restaurant', 'theatre'] },
];

/** Radio programmes that fix an hour (4a.2). */
export const PROGRAMMES = ['the Eveready Hour', 'the A&P Gypsies', 'the Happiness Boys', 'the Cliquot Club Eskimos', 'the Atwater Kent Hour', 'the Fleischmann Hour'];

/**
 * 4a.2: how a small case's thing went missing, and who could have known the way in.
 * - party: the office's own gathering at the first hour; whoever was there knew.
 * - told: the client told the room at the venue, for two hours; whoever was there heard.
 * - spare: the flat was locked, and the spare key hangs at the neighbour's; whoever was in there
 *   before the theft could have taken it.
 * Vars: {Client}/{client}, {cthey}/{ctheir}, {resident}/{rtheir}, {venue}, {h0}, {h2}, {x}, {Keeper}/{keeper}, {occasion}.
 */
export const SMALL_MEANS: { id: string; mode: 'party' | 'told' | 'spare'; resident?: boolean; office: string; origin: string; scene: string }[] = [
  { id: 'latch-key', mode: 'party', resident: true, office: '{resident} lodges there and has lost {rtheir} key again, so the door was left unlocked.', origin: 'the door, left unlocked for {resident}, which everybody at the {occasion} knew', scene: 'The door is unlocked; no marks on it.' },
  { id: 'broken-lock', mode: 'party', office: 'The lock has been broken since Tuesday, and {client} showed the whole table the locksmith’s card.', origin: 'the broken lock, which everybody at the {occasion} was shown', scene: 'The lock’s tongue is still taped back; no marks on the door.' },
  { id: 'mat', mode: 'party', office: '{Client} went out after the guests and left the key under the mat for {ctheir} sister, as {cthey} told the table {cthey} would.', origin: 'the key under the mat, which everybody at the {occasion} heard about', scene: 'The key is back under the mat; no marks on the door.' },
  { id: 'window', mode: 'party', office: 'The parlour window onto the fire escape won’t latch; {client} showed everybody at the table, laughing.', origin: 'the parlour window that won’t latch, which everybody at the {occasion} was shown', scene: 'The parlour window is up six inches, and there’s soot on the sill.' },
  { id: 'told-mat', mode: 'told', office: '{Client} sat in {venue} from {h0} until {h2}, telling anybody who’d listen that {cthey} was off to {ctheir} sister’s for the night and the key was under the mat.', origin: 'the key under the mat, which {client} told the room at {venue} about', scene: 'The key is back under the mat; no marks on the door.' },
  { id: 'told-window', mode: 'told', office: '{Client} sat in {venue} from {h0} until {h2}, complaining to anybody who’d listen that {ctheir} parlour window won’t latch, and that {cthey} was off to {ctheir} sister’s for the night.', origin: 'the parlour window that won’t latch, which {client} told the room at {venue} about', scene: 'The parlour window is up six inches, and there’s soot on the sill.' },
  { id: 'spare-nail', mode: 'spare', office: '{Client} was at {ctheir} sister’s all evening, and the flat was locked. {Keeper} keeps the spare key on a nail in the hall at {x}, where anybody who comes in can see it. It was back on its nail by morning.', origin: 'the spare key on the nail in the hall at {x}', scene: 'No marks on the door or the window: whoever came in had a key.' },
  { id: 'spare-tin', mode: 'spare', office: '{Client} was at the pictures all evening, and the flat was locked. The spare key lives in the sugar tin on {keeper}’s kitchen shelf at {x}, and everybody who drops in there knows it.', origin: 'the spare key in the sugar tin at {x}', scene: 'The door was locked again behind whoever it was; no marks on it.' },
];

/** What the gathering was, in a party setup. */
export const OCCASIONS = [
  { says: 'for cards', noun: 'card party' },
  { says: 'for a birthday supper', noun: 'supper' },
  { says: 'for the burial society’s meeting', noun: 'meeting' },
  { says: 'to hear the fight on the radio', noun: 'fight party' },
  { says: 'for a christening supper', noun: 'christening supper' },
];

/** What fixes the hour in a small case, one hour (Raw–Poached). Vars: {hc}, {programme}, {dog}. */
export const SMALL_CLOCKS: { id: string; text: string }[] = [
  { id: 'dog', text: 'The {dog} next door went off at {hc} o’clock, the way it does when somebody’s on the stairs.' },
  { id: 'clock', text: 'Whoever it was knocked the parlour clock off the shelf, and it stopped at ten past {hc}.' },
  { id: 'radio', text: 'The woman upstairs heard feet on the stairs in the middle of {programme}, which runs from {hc} o’clock.' },
  { id: 'delivery', text: 'The boy from the delicatessen came up with an order at a quarter past {hc} and passed somebody on the dark stairs, going down in a hurry.' },
  { id: 'el', text: 'The man below heard the door go just after the {hc} o’clock el went by; he sets his watch by it.' },
  { id: 'bell', text: 'St. Teresa’s was striking {hc} when the woman across the hall heard the door.' },
];

/** What gives a small case its window (Soft-boiled up): two hours, said in board hours. Vars: {a}, {b}, {programme}. */
export const WINDOW_LINES: { id: string; text: string }[] = [
  { id: 'gone', text: 'It went at {a} or {b} o’clock.' },
  { id: 'stairs', text: 'The woman downstairs heard the stairs creak at {a} or {b} o’clock; she can’t say which.' },
  { id: 'radio', text: 'The family across the hall heard the door during {programme} or the hour after it: {a} or {b} o’clock.' },
  { id: 'janitor', text: 'The janitor heard the dog in the yard bark at {a} or {b} o’clock, he can’t say which, and found the door ajar at midnight.' },
];

/** The neighbour who has the pet for an hour (the last sighting away from the scene). */
export const KEEPERS: { id: string; intro: string }[] = [
  { id: 'looks-in', intro: '{Keeper}, a neighbour at {x}, looks in on {pet} of an evening.' },
  { id: 'minds', intro: '{Keeper}, at {x}, minds {pet} when {client} is out.' },
  { id: 'borrows', intro: '{Keeper}, a neighbour at {x}, borrows {pet} most evenings.' },
];

/**
 * 4a.2: a murder's means at a rooming house, and how the victim was reached. `{x}` is the house.
 * `shelf` is the landlady's own words for where it was kept.
 */
export const ROOMING_MEANS: { id: string; kind: 'chloral' | 'poison' | 'gun' | 'blade'; name: string; shelf: string; origin: string; scene: string; what: string; police: string; delay: [number, number] }[] = [
  { id: 'chloral', kind: 'chloral', name: 'chloral', shelf: 'the chloral on my hall shelf', origin: 'the chloral bottle off the hall shelf at {x}', scene: 'Two glasses; one smells sweet and chemical. Under the table an empty bottle, labelled from {x}. The lodgers keep it on the hall shelf. He drank with somebody he knew.', what: 'the table', police: 'a fall', delay: [20, 60] },
  { id: 'revolver', kind: 'gun', name: 'a revolver', shelf: 'the revolver in the hall-stand drawer', origin: 'the landlady’s late husband’s revolver, from the hall-stand drawer at {x}', scene: 'A revolver under the chair, one chamber fired. It belongs in the hall-stand drawer at {x}. He was shot from across his own table.', what: 'the floor', police: 'a robbery gone wrong', delay: [0, 0] },
  { id: 'knife', kind: 'blade', name: 'a carving knife', shelf: 'the carving knife in my kitchen drawer', origin: 'the carving knife from the kitchen drawer at {x}', scene: 'A carving knife on the floor by the door, with the mark burnt into the handle that every knife in the kitchen at {x} has. He opened the door to somebody and turned his back.', what: 'the floor', police: 'the work of a burglar he disturbed', delay: [0, 0] },
  { id: 'laudanum', kind: 'poison', name: 'laudanum', shelf: 'the laudanum in my medicine cupboard', origin: 'the laudanum from the medicine cupboard at {x}', scene: 'A cup of cocoa gone cold, bitter at the bottom. Beside it a brown bottle with a chemist’s label made out to {x}. Somebody made him cocoa.', what: 'the table', police: 'his heart', delay: [20, 60] },
];

/**
 * What fixes a murder's hour. `kinds` are the means it suits; `windowed` lines give two hours.
 * Vars: {hc}, {a}, {b}, {means}, {delay}, {programme}, {client}, {sound}.
 */
export const MURDER_CLOCKS: { id: string; kinds: string[]; windowed: boolean; text: string }[] = [
  { id: 'coroner', kinds: ['chloral', 'poison'], windowed: false, text: 'The coroner says {means} in a drink, taken at {hc} o’clock; {delay}.' },
  { id: 'supper', kinds: ['chloral', 'poison'], windowed: false, text: 'The chop house sent up his supper at {hc} o’clock, and the coroner found {means} in it; {delay}.' },
  { id: 'telephone', kinds: ['chloral', 'poison'], windowed: false, text: 'He telephoned {client} at {hc} o’clock, cheerful, to say he had company. The coroner says {means}, taken then; {delay}.' },
  { id: 'radio', kinds: ['chloral', 'poison'], windowed: false, text: 'The woman across the hall heard him laughing with somebody all through {programme}, which runs from {hc} o’clock. The coroner says {means}, taken then; {delay}.' },
  { id: 'heard', kinds: ['gun'], windowed: false, text: 'Shot at {hc} o’clock: the man downstairs heard it and looked at his clock.' },
  { id: 'el', kinds: ['gun'], windowed: false, text: 'Shot at {hc} o’clock: the woman below took it for a backfire, just after the {hc} o’clock el went by.' },
  { id: 'watch', kinds: ['gun', 'blade'], windowed: false, text: 'His watch broke when he fell, and stopped at ten past {hc}.' },
  { id: 'radio', kinds: ['gun'], windowed: false, text: 'Shot in the middle of {programme}, which runs from {hc} o’clock: the family across the hall turned it up.' },
  { id: 'cry', kinds: ['blade'], windowed: false, text: 'The woman across the hall heard him cry out once, in the middle of {programme}, which runs from {hc} o’clock.' },
  { id: 'delivery', kinds: ['blade'], windowed: false, text: 'The boy from the delicatessen knocked at a quarter past {hc} and heard a chair go over behind the door; he left the order on the mat.' },
  { id: 'coroner', kinds: ['chloral', 'poison'], windowed: true, text: 'The coroner says {means} in a drink, taken at {a} or {b} o’clock; {delay}.' },
  { id: 'radios', kinds: ['gun'], windowed: true, text: 'Shot at {a} or {b} o’clock. Nobody heard it over the radios.' },
  { id: 'surgeon', kinds: ['chloral', 'poison', 'gun', 'blade'], windowed: true, text: 'The police surgeon puts it at {a} or {b} o’clock, by the warmth of him.' },
  { id: 'clock', kinds: ['chloral', 'poison', 'gun', 'blade'], windowed: true, text: 'His mantel clock was knocked over and stopped at five past, but it was never right: {a} or {b} o’clock, {client} says.' },
  { id: 'dozed', kinds: ['chloral', 'poison', 'gun', 'blade'], windowed: true, text: 'The woman upstairs heard {sound} at {a} or {b} o’clock; she’d dozed off over the radio and can’t say which.' },
];

/** The client, in a murder: who they were to him. */
export const RELATIONS: { female: string; male: string }[] = [
  { female: 'sister-in-law', male: 'brother-in-law' },
  { female: 'sister', male: 'brother' },
  { female: 'business partner', male: 'business partner' },
  { female: 'landlady', male: 'landlord' },
  { female: 'fiancée', male: 'cousin' },
];

/** Why the finder came round, after the board's last hour. */
export const FINDER_WHY = [
  'who’d come up for the Thursday card game',
  'who’d come round to collect a debt',
  'who heard his radio still going and knocked',
  'who’d come to return a borrowed book',
  'who’d come to settle a bet',
];
