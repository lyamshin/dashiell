import type { CaseType, Id, Purpose, Want } from '../types.js';

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
 *
 * M2b adds three more gates, because M2 still produced "a ward heeler, the
 * victim's rival in trade" over a retired dry-goods wholesaler:
 *
 * - `requiresTrade` — the suspect and the victim must carry the same `trade`
 *   tag. You cannot be somebody's rival in a trade neither of you is in.
 * - `forcesGender` — the relationship only reads one way round ("engaged to
 *   the victim's daughter"), so it picks the suspect's gender.
 * - `opposeVictimGender` — a spouse of the opposite sex, in 1929.
 *
 * M5 adds the dossier layer. An archetype now carries an age band, three or
 * more professional details (what the role looks like up close), a weighted
 * list of the things a person of that kind wants out of life, and whether the
 * profession shows on sight. A relationship carries backstory templates and a
 * vocabulary of "since": the specifics that turn "the victim's tenant" into
 * "has rented from Sweeney since '22 and has the same window and the same
 * complaint".
 *
 * Backstory slots: `{victim}`, `{person}`, `{year}`, `{third}`, `{place}`.
 * A template that uses `{third}` names somebody who is not in the case; the
 * generator invents them once, files them in `case.mentions`, and every later
 * sentence uses the same name.
 */

export type SuspectClass = 'money' | 'working' | 'underworld' | 'professional';

export interface Relationship {
  id: Id;
  /** `{V}` is the victim's surname: "{V}’s business partner". */
  text: string;
  impliesMotives?: string[];
  /** Suspect and victim must share a `trade` tag. */
  requiresTrade?: boolean;
  /** The suspect must be this gender for the phrase to make sense. */
  forcesGender?: 'm' | 'f';
  /** The suspect must be the other gender from the victim. */
  opposeVictimGender?: boolean;
  /** Three or more specifics for the tie. Slots as above. */
  backstory: string[];
  /** "since '18", "going back to the war", "three years this spring". */
  since: string[];
  /** Why a person in this relationship would hire a detective, by case type. */
  purposes: Record<CaseType, Purpose[]>;
}

export interface Archetype {
  id: Id;
  role: string;
  genderHint?: 'm' | 'f' | 'any';
  relationships: Id[];
  motives: string[];
  secrets: string[];
  class: SuspectClass;
  /** What line of work they are in, for `rel-rival`. */
  trade?: string;
  /** Inclusive range the dossier's age is drawn from. */
  ageBand: [number, number];
  /** What the work looks like up close. `{place}` is allowed. */
  professionDetails: string[];
  /** Weighted by repetition: what a person of this kind wants. */
  wants: Want[];
  /** True when the work shows on sight — a uniform, a hook, hands. */
  visibleProfession: boolean;
}

export interface VictimArchetype {
  id: Id;
  role: string;
  genderHint?: 'm' | 'f' | 'any';
  allowedSuspects: Id[];
  /** What line of work they were in, for `rel-rival`. */
  trade?: string;
  ageBand: [number, number];
  professionDetails: string[];
  wants: Want[];
  visibleProfession: boolean;
  /** Where they stood in the neighbourhood. `{V}` is the surname. */
  standing: string[];
}

/** Everything a person can want out of life, in the plain register. */
export const WANT_TEXT: Record<Want, string> = {
  money: 'wants money, and is not particular about the shape it arrives in',
  respectability: 'wants to be thought respectable by people who are not',
  'to-be-left-alone': 'wants to be left alone',
  'to-get-out': 'wants out of the neighbourhood and has wanted it for years',
  'to-keep-a-marriage': 'wants a marriage kept together, whatever it costs',
  'to-be-feared': 'wants to be the one people are careful around',
  'to-be-forgiven': 'wants to be forgiven for something nobody else remembers',
  'to-be-somebody': 'wants a name people know',
  'to-keep-what-they-have': 'wants to keep what they have and add nothing to it',
};

/** The years a backstory can hang on. */
export const BACKSTORY_YEARS: string[] = [
  '’18', '’19', '’20', '’21', '’22', '’23', '’24', '’25', '’26', '’27',
];

export const RELATIONSHIPS: Relationship[] = [
  {
    id: 'rel-partner',
    text: '{V}’s business partner',
    impliesMotives: ['debt', 'property', 'exposure', 'inheritance'],
    backstory: [
      '{person} and {victim} took the lease together in {year} and have been arguing about it since',
      '{person} put up the money and {victim} put up the name, and neither of them ever wrote it down',
      '{person} bought into {victim}’s business the year {third} walked out of it',
    ],
    since: ['since {year}', 'going on eight years', 'three years this spring'],
    purposes: {
      murder: ['keep-it-quiet', 'find-the-killer-police-wont', 'settle-a-debt-with-the-dead'],
      robbery: ['find-it-before-the-cops', 'get-it-back', 'keep-it-quiet'],
      missing: ['bring-them-home', 'keep-it-quiet'],
    },
  },
  {
    id: 'rel-tenant',
    text: '{V}’s tenant',
    impliesMotives: ['property', 'revenge', 'debt'],
    backstory: [
      '{person} has rented from {victim} since {year} and has the same window and the same complaint',
      '{person} took the rooms over {place} from {victim} and has been two weeks behind since the spring',
      '{victim} put {person}’s rent up twice in a year and {person} paid it twice',
    ],
    since: ['since {year}', 'since the flu year', 'four years in the same rooms'],
    purposes: {
      murder: ['clear-my-name', 'find-the-killer-police-wont'],
      robbery: ['clear-my-name', 'get-it-back'],
      missing: ['bring-them-home', 'clear-my-name'],
    },
  },
  {
    id: 'rel-landlord',
    text: '{V}’s landlord',
    impliesMotives: ['property', 'debt', 'revenge'],
    backstory: [
      '{victim} rented from {person} and was three months behind when it happened',
      '{person} has held the paper on the building {victim} lived in since {year}',
      '{person} put {victim} into the rooms as a favour to {third} and regretted it inside a month',
    ],
    since: ['since {year}', 'the better part of ten years', 'two leases running'],
    purposes: {
      murder: ['keep-it-quiet', 'clear-my-name'],
      robbery: ['keep-it-quiet', 'find-it-before-the-cops'],
      missing: ['make-sure-they-stay-gone', 'clear-my-name'],
    },
  },
  {
    id: 'rel-employee',
    text: '{V}’s former employee',
    impliesMotives: ['revenge', 'exposure', 'debt'],
    backstory: [
      '{person} worked for {victim} for four years and was let go in {year} without a reference',
      '{victim} put {person} out of a job over forty dollars that was never found',
      '{person} kept {victim}’s books until {third} was brought in over {person}’s head',
    ],
    since: ['since {year}', 'four years, and then nothing', 'until last winter'],
    purposes: {
      murder: ['clear-my-name', 'settle-a-debt-with-the-dead'],
      robbery: ['clear-my-name', 'get-it-back'],
      missing: ['clear-my-name', 'bring-them-home'],
    },
  },
  {
    id: 'rel-creditor',
    text: '{V}’s creditor',
    impliesMotives: ['debt', 'insurance', 'property'],
    backstory: [
      '{person} has been carrying {victim}’s paper since {year} and renewing it every ninety days',
      '{victim} borrowed from {person} to cover a note and never mentioned it to anybody',
      '{person} lent {victim} money in front of {third} and has been reminded of it ever since',
    ],
    since: ['since {year}', 'three renewals running', 'going back to the war'],
    purposes: {
      murder: ['settle-a-debt-with-the-dead', 'find-the-killer-police-wont'],
      robbery: ['get-it-back', 'find-it-before-the-cops'],
      missing: ['make-sure-they-stay-gone', 'bring-them-home'],
    },
  },
  {
    id: 'rel-debtor',
    text: 'in {V}’s debt',
    impliesMotives: ['debt', 'exposure', 'revenge'],
    backstory: [
      '{person} has owed {victim} money since {year} and has not been asked for it lately',
      '{victim} carried {person} through a bad winter and has been collecting on it ever since',
      '{person} signed a note to {victim} that {third} witnessed and nobody has torn up',
    ],
    since: ['since {year}', 'since the flu year', 'two winters running'],
    purposes: {
      murder: ['clear-my-name', 'settle-a-debt-with-the-dead'],
      robbery: ['clear-my-name', 'keep-it-quiet'],
      missing: ['clear-my-name', 'bring-them-home'],
    },
  },
  {
    id: 'rel-lawyer',
    text: '{V}’s lawyer',
    impliesMotives: ['exposure', 'inheritance', 'property'],
    backstory: [
      '{person} has drawn every paper {victim} ever signed, going back to {year}',
      '{person} keeps {victim}’s will in a box and has read it more often than {victim} did',
      '{victim} brought {person} the business {third} would not touch',
    ],
    since: ['since {year}', 'for eleven years', 'going back to the war'],
    purposes: {
      murder: ['keep-it-quiet', 'find-the-killer-police-wont'],
      robbery: ['keep-it-quiet', 'find-it-before-the-cops'],
      missing: ['keep-it-quiet', 'bring-them-home'],
    },
  },
  {
    id: 'rel-cousin',
    text: '{V}’s cousin',
    impliesMotives: ['inheritance', 'jealousy', 'insurance'],
    backstory: [
      '{person} and {victim} are cousins and were raised four doors apart',
      '{person} is {victim}’s cousin on the mother’s side and has not been asked to dinner since {year}',
      '{person} and {victim} came over on the same boat with {third} and split up inside a year',
    ],
    since: ['all their lives', 'since {year}', 'since they were children on the same block'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'clear-my-name'],
      robbery: ['get-it-back', 'find-it-before-the-cops'],
      missing: ['bring-them-home', 'find-the-killer-police-wont'],
    },
  },
  {
    id: 'rel-inlaw',
    text: '{V}’s brother-in-law',
    impliesMotives: ['inheritance', 'jealousy', 'debt'],
    backstory: [
      '{person} married {victim}’s sister in {year} and has been in the family ever since',
      '{person} is {victim}’s brother-in-law and has been told so at every holiday',
      '{victim} stood up at {person}’s wedding and {third} has never let either of them forget it',
    ],
    since: ['since {year}', 'since the wedding', 'nine years of Sundays'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'keep-it-quiet'],
      robbery: ['get-it-back', 'keep-it-quiet'],
      missing: ['bring-them-home', 'keep-it-quiet'],
    },
  },
  {
    id: 'rel-rival',
    text: '{V}’s rival in trade',
    impliesMotives: ['revenge', 'property', 'exposure'],
    requiresTrade: true,
    backstory: [
      '{person} and {victim} have been in the same trade on the same street since {year}',
      '{person} took two of {victim}’s best accounts and {victim} took one of them back',
      '{person} and {victim} both bid for what {third} was selling, and {victim} got it',
    ],
    since: ['since {year}', 'six years of it', 'since they were both starting out'],
    purposes: {
      murder: ['clear-my-name', 'keep-it-quiet'],
      robbery: ['clear-my-name', 'find-it-before-the-cops'],
      missing: ['clear-my-name', 'make-sure-they-stay-gone'],
    },
  },
  {
    id: 'rel-spouse',
    text: '{V}’s estranged spouse',
    impliesMotives: ['inheritance', 'jealousy', 'insurance'],
    opposeVictimGender: true,
    backstory: [
      '{person} married {victim} in {year} and they have lived apart for three of those years',
      '{person} is {victim}’s wife in law and nothing else, and has been since {year}',
      '{person} and {victim} separated over {third} and never went near a court about it',
    ],
    since: ['since {year}', 'three years apart', 'since the winter they stopped speaking'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'clear-my-name'],
      robbery: ['get-it-back', 'clear-my-name'],
      missing: ['bring-them-home', 'make-sure-they-stay-gone'],
    },
  },
  {
    id: 'rel-nurse',
    text: '{V}’s private nurse',
    impliesMotives: ['inheritance', 'silence-a-witness', 'protect-another'],
    backstory: [
      '{person} has sat nights with {victim} since {year}, six nights out of seven',
      '{person} was put in to nurse {victim} by {third} and stayed on after the fee stopped',
      '{person} knows what {victim} took, and when, and how much of it was necessary',
    ],
    since: ['since {year}', 'since the spring', 'eleven months of nights'],
    purposes: {
      murder: ['clear-my-name', 'find-the-killer-police-wont'],
      robbery: ['clear-my-name', 'get-it-back'],
      missing: ['bring-them-home', 'clear-my-name'],
    },
  },
  {
    id: 'rel-secretary',
    text: '{V}’s secretary',
    impliesMotives: ['exposure', 'silence-a-witness', 'jealousy'],
    backstory: [
      '{person} has answered {victim}’s letters since {year} and reads them all first',
      '{person} keeps {victim}’s diary and knows which of the entries are true',
      '{person} was hired on {third}’s word and has been more use than {third} ever was',
    ],
    since: ['since {year}', 'for six years', 'since the office moved'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'clear-my-name'],
      robbery: ['clear-my-name', 'find-it-before-the-cops'],
      missing: ['bring-them-home', 'clear-my-name'],
    },
  },
  {
    id: 'rel-engaged',
    text: 'engaged to {V}’s daughter',
    impliesMotives: ['inheritance', 'jealousy'],
    forcesGender: 'm',
    backstory: [
      '{person} has been engaged to {victim}’s daughter since {year}, with no date set',
      '{person} asked {victim} for the daughter and was told to come back when there was money',
      '{person} and {victim}’s daughter have been engaged since {year}, and {third} calls it a long engagement',
    ],
    since: ['since {year}', 'two years engaged', 'since last Easter'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'clear-my-name'],
      robbery: ['get-it-back', 'clear-my-name'],
      missing: ['bring-them-home', 'clear-my-name'],
    },
  },
  {
    id: 'rel-childhood',
    text: 'a childhood friend of {V}’s from the same block',
    impliesMotives: ['revenge', 'protect-another', 'debt'],
    backstory: [
      '{person} and {victim} grew up on the same block and have known each other since {year}',
      '{person} and {victim} were boys together and neither of them ever left the neighbourhood',
      '{person}, {victim} and {third} were inseparable for ten years and have not been in a room together since',
    ],
    since: ['all their lives', 'since {year}', 'since they were boys on the same stoop'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'settle-a-debt-with-the-dead'],
      robbery: ['get-it-back', 'clear-my-name'],
      missing: ['bring-them-home', 'find-the-killer-police-wont'],
    },
  },
  {
    id: 'rel-willed',
    text: 'named in {V}’s will',
    impliesMotives: ['inheritance', 'insurance'],
    backstory: [
      '{person} has been named in {victim}’s will since {year} and has known it that long',
      '{victim} told {person} there was something in the will and never said how much',
      '{person} and {third} are both named in it, and only one of them knows',
    ],
    since: ['since {year}', 'since the will was redrawn', 'for as long as there has been a will'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'clear-my-name'],
      robbery: ['get-it-back', 'find-it-before-the-cops'],
      missing: ['bring-them-home', 'clear-my-name'],
    },
  },
  {
    id: 'rel-witness',
    text: 'a witness against the people {V} worked for',
    impliesMotives: ['silence-a-witness', 'protect-another', 'exposure'],
    backstory: [
      '{person} gave a statement about the people {victim} worked for and has been careful ever since',
      '{person} is due before the grand jury about {victim}’s people, and the date is set',
      '{person} talked to the district attorney in {year} and {third} has not spoken to {person} since',
    ],
    since: ['since {year}', 'since the indictment', 'since last autumn'],
    purposes: {
      murder: ['clear-my-name', 'find-the-killer-police-wont'],
      robbery: ['clear-my-name', 'keep-it-quiet'],
      missing: ['clear-my-name', 'make-sure-they-stay-gone'],
    },
  },
  {
    id: 'rel-customer',
    text: 'a customer of {V}’s',
    impliesMotives: ['debt', 'revenge', 'exposure'],
    backstory: [
      '{person} has bought from {victim} for years and settled at the end of every month',
      '{person} has been on {victim}’s books as a customer since {year}',
      '{person} came to {victim} on {third}’s introduction and has stayed a customer',
    ],
    since: ['since {year}', 'for years', 'since the shop opened'],
    purposes: {
      murder: ['clear-my-name', 'settle-a-debt-with-the-dead'],
      robbery: ['get-it-back', 'clear-my-name'],
      missing: ['clear-my-name', 'bring-them-home'],
    },
  },
  {
    id: 'rel-neighbor',
    text: '{V}’s neighbour across the airshaft',
    impliesMotives: ['revenge', 'jealousy', 'property'],
    backstory: [
      '{person} lives across the airshaft from {victim} and can hear the wireless through it',
      '{person} has lived on the same landing as {victim} since {year}',
      '{person} and {victim} share a wall, a landing and a long argument about {third}',
    ],
    since: ['since {year}', 'five years on the same landing', 'since the building changed hands'],
    purposes: {
      murder: ['find-the-killer-police-wont', 'clear-my-name'],
      robbery: ['clear-my-name', 'find-it-before-the-cops'],
      missing: ['bring-them-home', 'clear-my-name'],
    },
  },
];

export const RELATIONSHIP_BY_ID: Record<Id, Relationship> = Object.fromEntries(
  RELATIONSHIPS.map((r) => [r.id, r]),
);

export const SUSPECT_ARCHETYPES: Archetype[] = [
  /* ------------------------------------------------------------------ money */
  {
    id: 'arch-heir',
    // Was "the victim's nephew, at loose ends", which fought with three of its
    // own four relationships: a nephew is not a cousin, not a brother-in-law,
    // and should not be engaged to the victim's daughter.
    role: 'a young man living on expectations',
    genderHint: 'm',
    relationships: ['rel-cousin', 'rel-willed', 'rel-inlaw', 'rel-engaged'],
    motives: ['inheritance', 'debt', 'jealousy'],
    secrets: ['gambling-debt', 'affair', 'secret-drinking', 'dope'],
    class: 'money',
    ageBand: [24, 34],
    professionDetails: [
      'has no occupation anybody can name and an account at three tailors',
      'draws an allowance on the first of the month and has it spent by the eighth',
      'keeps a desk at a brokerage where nobody expects him before noon',
    ],
    wants: ['money', 'money', 'to-be-somebody', 'to-keep-what-they-have'],
    visibleProfession: false,
  },
  {
    id: 'arch-widow',
    role: 'a widow with rooms on the avenue',
    genderHint: 'f',
    // `rel-spouse` removed: a widow cannot be the estranged spouse of a man
    // who was alive this morning.
    relationships: ['rel-willed', 'rel-cousin', 'rel-neighbor'],
    motives: ['inheritance', 'jealousy', 'insurance'],
    secrets: ['affair', 'blackmail', 'secret-drinking', 'hidden-family'],
    class: 'money',
    ageBand: [42, 64],
    professionDetails: [
      'keeps rooms on the avenue and a girl who comes in three mornings a week',
      'lives on an annuity and the rent from a house in Flushing',
      'has not worked since her marriage and does not mean to start',
    ],
    wants: ['respectability', 'respectability', 'to-keep-what-they-have', 'to-be-left-alone'],
    visibleProfession: false,
  },
  {
    id: 'arch-broker',
    role: 'a curb broker',
    relationships: ['rel-partner', 'rel-creditor', 'rel-debtor', 'rel-rival', 'rel-inlaw'],
    motives: ['debt', 'exposure', 'property'],
    secrets: ['embezzling', 'gambling-debt', 'fence'],
    class: 'money',
    trade: 'money',
    ageBand: [30, 52],
    professionDetails: [
      'works the curb outside the Exchange in all weathers',
      'trades on the street for men who would rather not be seen doing it',
      'carries three telephone numbers and no office',
    ],
    wants: ['money', 'money', 'to-be-somebody', 'to-keep-what-they-have'],
    visibleProfession: false,
  },
  {
    id: 'arch-society',
    role: 'a society columnist',
    relationships: ['rel-rival', 'rel-neighbor', 'rel-witness'],
    motives: ['exposure', 'revenge', 'silence-a-witness'],
    secrets: ['blackmail', 'affair', 'dope'],
    class: 'money',
    trade: 'press',
    ageBand: [28, 48],
    professionDetails: [
      'files three columns a week and dines out for all of them',
      'has a standing table at a place the bill never comes to',
      'keeps a card index of everybody worth a paragraph',
    ],
    wants: ['to-be-somebody', 'to-be-somebody', 'money', 'respectability'],
    visibleProfession: false,
  },
  {
    id: 'arch-blockowner',
    role: 'the owner of the block',
    relationships: ['rel-landlord', 'rel-rival', 'rel-partner'],
    motives: ['property', 'debt', 'revenge'],
    secrets: ['embezzling', 'fence', 'blackmail'],
    class: 'money',
    trade: 'property',
    ageBand: [45, 66],
    professionDetails: [
      'owns four buildings on the same street and collects in person',
      'carries the rent book himself on the first of the month',
      'has a boilerman, a lawyer and no partners',
    ],
    wants: ['to-keep-what-they-have', 'to-keep-what-they-have', 'money', 'to-be-feared'],
    visibleProfession: false,
  },

  /* ----------------------------------------------------------- professional */
  {
    id: 'arch-lawyer',
    role: 'a lawyer with one clerk',
    relationships: ['rel-lawyer', 'rel-partner', 'rel-creditor', 'rel-engaged'],
    motives: ['exposure', 'inheritance', 'property'],
    secrets: ['embezzling', 'gambling-debt', 'blackmail'],
    class: 'professional',
    ageBand: [34, 58],
    professionDetails: [
      'keeps two rooms over a bank and one clerk who does the typing',
      'practises alone and takes whatever walks up the stairs',
      'has a list of clients and will not read any of it aloud',
    ],
    wants: ['respectability', 'respectability', 'money', 'to-keep-what-they-have'],
    visibleProfession: false,
  },
  {
    id: 'arch-bookkeeper',
    role: 'a bookkeeper',
    relationships: ['rel-employee', 'rel-partner', 'rel-debtor'],
    motives: ['exposure', 'debt', 'revenge'],
    secrets: ['embezzling', 'forged-identity', 'gambling-debt'],
    class: 'professional',
    ageBand: [28, 52],
    professionDetails: [
      'keeps the books for two firms and a lodge',
      'sits the same desk from eight until six and rules the columns by hand',
      'does the payroll on Thursdays and the ledgers the rest of the week',
    ],
    wants: ['to-be-left-alone', 'to-be-left-alone', 'respectability', 'money'],
    visibleProfession: false,
  },
  {
    id: 'arch-nurse',
    role: 'a private nurse',
    genderHint: 'f',
    relationships: ['rel-nurse', 'rel-neighbor', 'rel-willed'],
    motives: ['inheritance', 'silence-a-witness', 'protect-another'],
    secrets: ['dope', 'hidden-family', 'affair'],
    class: 'professional',
    ageBand: [26, 46],
    professionDetails: [
      'sits nights with patients the hospitals have sent home',
      'has a registry card and takes the cases nobody else will',
      'nursed overseas and has not been out of work since',
    ],
    wants: ['to-be-forgiven', 'respectability', 'money', 'to-be-left-alone'],
    visibleProfession: true,
  },
  {
    id: 'arch-dentist',
    role: 'a dentist with rooms on the third floor',
    relationships: ['rel-tenant', 'rel-neighbor', 'rel-debtor'],
    motives: ['debt', 'exposure', 'property'],
    secrets: ['dope', 'affair', 'forged-identity'],
    class: 'professional',
    ageBand: [32, 56],
    professionDetails: [
      'has a chair, a waiting room and a girl on the door',
      'pulls teeth for the neighbourhood at a dollar a time',
      'bought the practice second-hand and is still paying for the chair',
    ],
    wants: ['respectability', 'money', 'to-be-left-alone'],
    visibleProfession: false,
  },
  {
    id: 'arch-secretary',
    role: 'a private secretary',
    relationships: ['rel-secretary', 'rel-employee', 'rel-engaged'],
    motives: ['exposure', 'jealousy', 'silence-a-witness'],
    secrets: ['affair', 'embezzling', 'blackmail'],
    class: 'professional',
    ageBand: [24, 42],
    professionDetails: [
      'answers the letters, keeps the diary, and knows what is in both',
      'has worked for three men in six years and left none of them badly',
      'takes the dictation and does the banking',
    ],
    wants: ['to-be-somebody', 'respectability', 'to-get-out', 'money'],
    visibleProfession: false,
  },
  {
    id: 'arch-reporter',
    role: 'a stringer for the evening papers',
    relationships: ['rel-witness', 'rel-rival', 'rel-neighbor'],
    motives: ['exposure', 'silence-a-witness', 'revenge'],
    secrets: ['blackmail', 'secret-drinking', 'gambling-debt'],
    class: 'professional',
    trade: 'press',
    ageBand: [26, 44],
    professionDetails: [
      'sells two hundred words at a time to whichever desk is short',
      'works the precincts at night and the courts in the morning',
      'has a press card and no salary',
    ],
    wants: ['to-be-somebody', 'money', 'to-get-out'],
    visibleProfession: false,
  },
  {
    id: 'arch-piano-teacher',
    role: 'a piano teacher',
    relationships: ['rel-tenant', 'rel-neighbor', 'rel-childhood'],
    motives: ['revenge', 'protect-another', 'property'],
    secrets: ['affair', 'hidden-family', 'secret-drinking'],
    class: 'professional',
    ageBand: [30, 58],
    professionDetails: [
      'takes pupils in the front room from four until seven and hears every scale twice',
      'teaches at the settlement house three afternoons a week',
      'has eleven pupils and a piano that wants tuning',
    ],
    wants: ['to-be-left-alone', 'respectability', 'to-be-forgiven'],
    visibleProfession: false,
  },
  {
    id: 'arch-adjuster',
    role: 'an insurance adjuster',
    relationships: ['rel-creditor', 'rel-rival', 'rel-witness'],
    motives: ['insurance', 'exposure', 'property'],
    secrets: ['forged-identity', 'gambling-debt', 'embezzling'],
    class: 'professional',
    trade: 'insurance',
    ageBand: [32, 54],
    professionDetails: [
      'walks fire jobs for the company and writes up what he finds',
      'settles claims for a casualty office and is paid to doubt people',
      'has a district that runs from the river to Eighth Avenue',
    ],
    wants: ['money', 'respectability', 'to-keep-what-they-have'],
    visibleProfession: false,
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
    ageBand: [19, 40],
    professionDetails: [
      'does eleven rooms a day and the linen after',
      'has the third and fourth floors and is finished at four',
      'has been on the same floors for six years and knows every door on them',
    ],
    wants: ['to-get-out', 'to-get-out', 'money', 'to-be-left-alone'],
    visibleProfession: true,
  },
  {
    id: 'arch-longshoreman',
    role: 'a longshoreman',
    genderHint: 'm',
    relationships: ['rel-tenant', 'rel-childhood', 'rel-debtor'],
    motives: ['debt', 'revenge', 'protect-another'],
    secrets: ['union-organizing', 'gambling-debt', 'fence'],
    class: 'working',
    ageBand: [24, 48],
    professionDetails: [
      'works the Elizabeth Street pier when there is work',
      'shapes up at seven and takes whatever the boss hands out',
      'has a hook, a union button and three days a week',
    ],
    wants: ['money', 'to-be-feared', 'to-keep-what-they-have'],
    visibleProfession: true,
  },
  {
    id: 'arch-seamstress',
    role: 'a seamstress',
    genderHint: 'f',
    relationships: ['rel-tenant', 'rel-employee', 'rel-neighbor'],
    motives: ['revenge', 'property', 'exposure'],
    secrets: ['hidden-family', 'affair', 'union-organizing'],
    class: 'working',
    ageBand: [22, 50],
    professionDetails: [
      'finishes coats at home by the piece and takes the bundles back on Fridays',
      'works a machine in a loft and is paid by the dozen',
      'sews for a house on the avenue and is never named in it',
    ],
    wants: ['to-get-out', 'money', 'to-be-forgiven', 'respectability'],
    visibleProfession: true,
  },
  {
    id: 'arch-hackman',
    role: 'a hack driver',
    genderHint: 'm',
    relationships: ['rel-tenant', 'rel-debtor', 'rel-childhood'],
    motives: ['debt', 'revenge'],
    secrets: ['gambling-debt', 'fence', 'secret-drinking'],
    class: 'working',
    ageBand: [26, 52],
    professionDetails: [
      'works the stand outside the hotel from six until the small hours',
      'drives nights and sleeps while the city works',
      'owns the cab and owes on it',
    ],
    wants: ['money', 'to-be-left-alone', 'to-keep-what-they-have'],
    visibleProfession: true,
  },
  {
    id: 'arch-tailor',
    role: 'a tailor',
    relationships: ['rel-tenant', 'rel-customer', 'rel-neighbor'],
    motives: ['property', 'debt', 'revenge'],
    secrets: ['fence', 'hidden-family', 'union-organizing'],
    class: 'working',
    ageBand: [30, 60],
    professionDetails: [
      'presses and turns coats in a shop the width of a hallway',
      'has a shop under the stairs and a boy who delivers',
      'makes to measure for men who settle at Christmas',
    ],
    wants: ['respectability', 'money', 'to-keep-what-they-have'],
    visibleProfession: true,
  },
  {
    id: 'arch-stagehand',
    role: 'a stagehand at the Selwyn',
    relationships: ['rel-childhood', 'rel-neighbor', 'rel-customer'],
    motives: ['revenge', 'jealousy', 'debt'],
    secrets: ['union-organizing', 'secret-drinking', 'gambling-debt'],
    class: 'working',
    ageBand: [24, 46],
    professionDetails: [
      'works the fly floor and is out of the house by eleven',
      'sets and strikes for whatever is playing',
      'has been on the same crew since the house opened',
    ],
    wants: ['money', 'to-be-left-alone', 'to-be-somebody'],
    visibleProfession: true,
  },
  {
    id: 'arch-switchboard',
    role: 'a switchboard operator',
    genderHint: 'f',
    relationships: ['rel-employee', 'rel-tenant', 'rel-neighbor'],
    motives: ['exposure', 'silence-a-witness', 'jealousy'],
    secrets: ['blackmail', 'affair', 'hidden-family'],
    class: 'working',
    ageBand: [20, 38],
    professionDetails: [
      'sits the board from four until midnight and hears both ends of everything',
      'works the exchange and knows every number on the floor',
      'plugs the calls through and is not supposed to listen',
    ],
    wants: ['to-get-out', 'to-be-somebody', 'money'],
    visibleProfession: true,
  },
  {
    id: 'arch-nightman',
    role: 'the night manager at the hotel',
    relationships: ['rel-employee', 'rel-tenant', 'rel-partner', 'rel-inlaw'],
    motives: ['revenge', 'exposure', 'debt'],
    secrets: ['embezzling', 'secret-drinking', 'fence'],
    class: 'working',
    ageBand: [30, 55],
    professionDetails: [
      'has the desk from six at night until six in the morning',
      'runs the house while the day manager sleeps',
      'keeps the register, the keys, and a memory of who is not in the register',
    ],
    wants: ['to-keep-what-they-have', 'respectability', 'money'],
    visibleProfession: true,
  },
  {
    id: 'arch-chorus',
    role: 'a chorus girl between engagements',
    genderHint: 'f',
    relationships: ['rel-neighbor', 'rel-spouse', 'rel-customer'],
    motives: ['jealousy', 'exposure', 'debt'],
    secrets: ['affair', 'dope', 'secret-drinking'],
    class: 'working',
    ageBand: [19, 32],
    professionDetails: [
      'makes the rounds of the agencies at eleven and is home by one',
      'did two seasons in the line and is waiting on a third',
      'rehearses when there is anything to rehearse for',
    ],
    wants: ['to-be-somebody', 'to-get-out', 'money'],
    visibleProfession: false,
  },

  /* ------------------------------------------------------------- underworld */
  {
    id: 'arch-bookmaker',
    role: 'a bookmaker in a small way',
    relationships: ['rel-creditor', 'rel-customer', 'rel-debtor'],
    motives: ['debt', 'silence-a-witness', 'revenge'],
    secrets: ['fence', 'forged-identity', 'gambling-debt'],
    class: 'underworld',
    ageBand: [30, 55],
    professionDetails: [
      'takes bets in a small way out of the back of a cigar store',
      'runs a book on the horses for four blocks and no further',
      'writes the odds on a slate and rubs them off before six',
    ],
    wants: ['money', 'to-be-feared', 'to-be-left-alone'],
    visibleProfession: false,
  },
  {
    id: 'arch-heeler',
    role: 'a ward heeler',
    genderHint: 'm',
    relationships: ['rel-witness', 'rel-rival', 'rel-partner'],
    motives: ['silence-a-witness', 'exposure', 'property'],
    secrets: ['blackmail', 'fence', 'gambling-debt'],
    class: 'underworld',
    trade: 'graft',
    ageBand: [32, 58],
    professionDetails: [
      'carries the district for the club and is paid in favours',
      'delivers the vote on the block and the coal in February',
      'sits in the clubhouse and settles what can be settled there',
    ],
    wants: ['to-be-feared', 'to-be-somebody', 'money'],
    visibleProfession: false,
  },
  {
    id: 'arch-pawnman',
    role: 'a pawnbroker’s man',
    relationships: ['rel-customer', 'rel-creditor', 'rel-rival'],
    motives: ['debt', 'exposure', 'revenge'],
    secrets: ['fence', 'forged-identity', 'dope'],
    class: 'underworld',
    trade: 'pawn',
    ageBand: [26, 50],
    professionDetails: [
      'writes the tickets behind the grille and knows what a thing is worth',
      'minds the shop while the broker is at the auctions',
      'handles the redemptions, and the ones nobody comes back for',
    ],
    wants: ['money', 'to-be-left-alone', 'to-keep-what-they-have'],
    visibleProfession: false,
  },
  {
    id: 'arch-bouncer',
    role: 'a doorman at a club with no sign on it',
    genderHint: 'm',
    relationships: ['rel-childhood', 'rel-debtor', 'rel-witness'],
    motives: ['debt', 'protect-another', 'silence-a-witness'],
    secrets: ['fence', 'gambling-debt', 'dope'],
    class: 'underworld',
    ageBand: [26, 44],
    professionDetails: [
      'stands the door at a club with no sign on it and knows every face that comes to it',
      'keeps the wrong people out and the right people quiet',
      'has the door from nine until they close',
    ],
    wants: ['to-be-feared', 'money', 'to-keep-what-they-have'],
    visibleProfession: true,
  },
  {
    id: 'arch-runner',
    role: 'a policy runner',
    genderHint: 'm',
    relationships: ['rel-customer', 'rel-debtor', 'rel-childhood'],
    motives: ['debt', 'silence-a-witness', 'revenge'],
    secrets: ['gambling-debt', 'fence', 'dope'],
    class: 'underworld',
    ageBand: [20, 38],
    professionDetails: [
      'carries the slips between four corners and a candy store',
      'collects the plays in the morning and pays out in the afternoon',
      'runs policy for a bank uptown and is trusted with the bag',
    ],
    wants: ['money', 'to-be-somebody', 'to-get-out'],
    visibleProfession: false,
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
    // `arch-blockowner` was excluded, which left `property` with no rival at
    // all. A landlord and the man who owns the block are exactly rivals.
    allowedSuspects: except('arch-chorus'),
    trade: 'property',
    ageBand: [48, 68],
    professionDetails: [
      'collected the rents in person on the first and never sent a man',
      'held three tenements on Ninth Avenue and the mortgages on two more',
      'kept the buildings full and the repairs undone',
    ],
    wants: ['to-keep-what-they-have', 'money', 'to-be-feared'],
    visibleProfession: false,
    standing: [
      'held three houses on Ninth Avenue, and half the block was behind on the rent for one of them',
      'was the man a hundred and forty people paid to keep a roof over them',
      'owned more of the street than anybody who lived on it',
    ],
  },
  {
    id: 'vic-bootlegger',
    role: 'a bootlegger with the lease on the top floor',
    genderHint: 'm',
    allowedSuspects: except('arch-nurse', 'arch-piano-teacher', 'arch-seamstress'),
    ageBand: [32, 52],
    professionDetails: [
      'brought the stuff in off the boats and had the lease on the top floor to keep it in',
      'supplied four houses on the block and took cash only',
      'paid the precinct monthly and was never once raided',
    ],
    wants: ['money', 'to-be-feared', 'to-keep-what-they-have'],
    visibleProfession: false,
    standing: [
      'supplied half the bars on the block, and the other half wished otherwise',
      'was the reason four places on the street stayed open, and everyone knew it',
      'was owed favours by people who would rather not be reminded of them',
    ],
  },
  {
    id: 'vic-heiress',
    role: 'an heiress between marriages',
    genderHint: 'f',
    allowedSuspects: except('arch-longshoreman', 'arch-runner', 'arch-tailor'),
    ageBand: [28, 46],
    professionDetails: [
      'lived on the income of a trust and signed for nothing',
      'had money from a father nobody in the neighbourhood ever met',
      'kept an apartment, a maid and no occupation at all',
    ],
    wants: ['to-be-somebody', 'respectability', 'to-keep-what-they-have'],
    visibleProfession: false,
    standing: [
      'had money in a neighbourhood that had none, and was watched for it',
      'was the one name on the block the papers would have printed',
      'lent to people who could not pay it back and never asked twice',
    ],
  },
  {
    id: 'vic-agent',
    role: 'a theatrical agent',
    allowedSuspects: except('arch-longshoreman', 'arch-nurse'),
    trade: 'theatrical',
    ageBand: [38, 60],
    professionDetails: [
      'booked acts into four houses and took ten per cent of all of it',
      'kept an office with two chairs and a telephone that never stopped',
      'had the say over who worked in the spring and who did not',
    ],
    wants: ['money', 'to-be-somebody', 'to-keep-what-they-have'],
    visibleProfession: false,
    standing: [
      'decided who worked this season, which made for a great many careful friendships',
      'had half the neighbourhood waiting on a telephone call that never came',
      'could put a name on a bill or leave it off, and did both',
    ],
  },
  {
    id: 'vic-inspector',
    role: 'a buildings inspector',
    genderHint: 'm',
    allowedSuspects: except('arch-chorus', 'arch-widow', 'arch-nurse'),
    trade: 'graft',
    ageBand: [40, 62],
    professionDetails: [
      'signed off the boilers and the fire escapes for six blocks',
      'walked the buildings with a book and wrote in it what he was asked to',
      'had a district and a price for everything in it',
    ],
    wants: ['money', 'to-be-feared', 'to-keep-what-they-have'],
    visibleProfession: false,
    standing: [
      'could close a building with a signature, and had closed two',
      'was owed an envelope by every landlord on six blocks',
      'was the reason three houses on the street were still standing open',
    ],
  },
  {
    id: 'vic-union-treasurer',
    role: 'a union treasurer',
    allowedSuspects: except('arch-widow', 'arch-society', 'arch-nurse'),
    trade: 'labor',
    ageBand: [36, 58],
    professionDetails: [
      'held the local’s books and the local’s cash box',
      'counted the dues on Fridays with the door shut',
      'was elected twice and opposed once',
    ],
    wants: ['to-keep-what-they-have', 'to-be-feared', 'respectability'],
    visibleProfession: false,
    standing: [
      'held the money four hundred men had paid in, and they all knew the figure',
      'decided who shaped up in the morning and who stood at the back',
      'was the local, as far as the street was concerned',
    ],
  },
  {
    id: 'vic-pawnbroker',
    role: 'a pawnbroker',
    allowedSuspects: except('arch-society', 'arch-nurse', 'arch-piano-teacher'),
    trade: 'pawn',
    ageBand: [42, 64],
    professionDetails: [
      'kept the shop on the corner and the tickets in a spike behind the grille',
      'lent on watches, coats and wedding rings, at a quarter of what they were worth',
      'opened at eight and closed when the last customer had gone',
    ],
    wants: ['money', 'to-keep-what-they-have', 'to-be-left-alone'],
    visibleProfession: false,
    standing: [
      'held something belonging to half the block in a back room, and had the tickets to prove it',
      'knew what everybody on the street was worth, down to the coat',
      'was the last resort on the block, and charged accordingly',
    ],
  },
  {
    id: 'vic-columnist',
    role: 'a society columnist',
    allowedSuspects: except('arch-longshoreman', 'arch-tailor'),
    trade: 'press',
    ageBand: [34, 56],
    professionDetails: [
      'filed six columns a week and never named a source in any of them',
      'dined out on other people’s evenings and wrote them up by midnight',
      'kept a file of what could not be printed yet',
    ],
    wants: ['to-be-somebody', 'money', 'to-be-feared'],
    visibleProfession: false,
    standing: [
      'could put a name in the paper, and had put several there for good',
      'kept a file of what was not printed, and let it be known that it existed',
      'was invited everywhere, mostly by people who were afraid of the column',
    ],
  },
  {
    id: 'vic-bondsman',
    role: 'a bail bondsman',
    allowedSuspects: except('arch-society', 'arch-piano-teacher'),
    trade: 'money',
    ageBand: [38, 60],
    professionDetails: [
      'wrote bonds out of an office across from the courthouse',
      'took a house or a wedding ring as security and kept the paper on both',
      'was in night court four evenings out of seven',
    ],
    wants: ['money', 'to-keep-what-they-have', 'to-be-feared'],
    visibleProfession: false,
    standing: [
      'had stood bail for most of the block at one time or another, and held the paper still',
      'was the first telephone call anybody on the street made at two in the morning',
      'owned a piece of four houses that had been put up as security',
    ],
  },
  {
    id: 'vic-wholesaler',
    role: 'a retired dry-goods wholesaler',
    genderHint: 'm',
    allowedSuspects: except('arch-chorus', 'arch-runner'),
    // Nothing in the suspect deck is in dry goods, so this victim never has a
    // rival in trade. That is the seed-7 ward heeler, gone.
    trade: 'dry-goods',
    ageBand: [55, 74],
    professionDetails: [
      'sold the warehouse in ’24 and has lived on the proceeds since',
      'ran a dry-goods house on Canal Street for thirty years',
      'kept his hand in by lending to people who had been his customers',
    ],
    wants: ['to-be-left-alone', 'to-keep-what-they-have', 'respectability'],
    visibleProfession: false,
    standing: [
      'was the richest man on the landing and the only one who never mentioned it',
      'had lent money to four families on the block and forgiven none of it',
      'was thirty years in the trade and is still owed by people who left it',
    ],
  },
];

export const VICTIM_ARCHETYPE_BY_ID: Record<Id, VictimArchetype> = Object.fromEntries(
  VICTIM_ARCHETYPES.map((v) => [v.id, v]),
);

/**
 * The fixtures get dossiers too. They are the people a detective talks to
 * most, and "the bartender" is not a person. These cards carry no
 * relationship to the victim: a fixture's tie is the door they stand in.
 */
export interface FixtureCard {
  role: string;
  ageBand: [number, number];
  professionDetails: string[];
  wants: Want[];
  visibleProfession: boolean;
  /** `{place}` is where they are posted. */
  tie: string;
}

export const FIXTURE_CARDS: Record<string, FixtureCard> = {
  bartender: {
    role: 'the bartender',
    ageBand: [28, 58],
    professionDetails: [
      'has had the stick at {place} for nine years and remembers what everybody drinks',
      'works {place} from four until they lock the door',
      'pours at {place} six nights a week and takes Mondays',
    ],
    wants: ['to-be-left-alone', 'money', 'to-keep-what-they-have'],
    visibleProfession: true,
    tie: 'behind the bar at {place}, every night of the week',
  },
  doorman: {
    role: 'the doorman',
    ageBand: [30, 62],
    professionDetails: [
      'stands the door at {place} and logs nobody, and forgets nobody',
      'has had the door at {place} since the building changed hands',
      'opens the door at {place} from six until two and sees every face twice',
    ],
    wants: ['to-keep-what-they-have', 'respectability', 'money'],
    visibleProfession: true,
    tie: 'on the door at {place}',
  },
  newsstand: {
    role: 'the news dealer',
    ageBand: [35, 66],
    professionDetails: [
      'sells papers at {place} from before six until the last edition is gone',
      'has had the stand at {place} for twenty years and knows every regular by their paper',
      'runs the stand at {place} and misses nothing that crosses the pavement',
    ],
    wants: ['to-be-left-alone', 'money', 'to-keep-what-they-have'],
    visibleProfession: true,
    tie: 'at the stand at {place}, every day of the year',
  },
  counterman: {
    role: 'the man behind the counter',
    ageBand: [24, 54],
    professionDetails: [
      'works the counter at {place} on the evening shift',
      'has the counter at {place} from four until midnight',
      'serves at {place} and has never once been asked his name',
    ],
    wants: ['money', 'to-be-left-alone', 'to-get-out'],
    visibleProfession: true,
    tie: 'behind the counter at {place}',
  },
  'ticket-taker': {
    role: 'the ticket-taker',
    ageBand: [22, 60],
    professionDetails: [
      'takes the tickets at {place} and tears every one of them in half',
      'stands the box at {place} from seven until the last house goes in',
      'has taken tickets at {place} since the house opened',
    ],
    wants: ['to-be-left-alone', 'money', 'respectability'],
    visibleProfession: true,
    tie: 'on the door at {place}, every performance',
  },
  'elevator-man': {
    role: 'the elevator man',
    ageBand: [30, 66],
    professionDetails: [
      'runs the car at {place} and knows which floor everybody wants before they say it',
      'has the car at {place} from three until eleven',
      'has run the car at {place} for eleven years and never lost a day',
    ],
    wants: ['to-keep-what-they-have', 'to-be-left-alone', 'money'],
    visibleProfession: true,
    tie: 'in the car at {place}',
  },
  landlady: {
    role: 'the landlady',
    ageBand: [40, 70],
    professionDetails: [
      'keeps {place} and sits where she can see the stairs',
      'has kept {place} for twenty-two years and knows every board that creaks',
      'lets the rooms at {place} and collects on Saturdays',
    ],
    wants: ['respectability', 'to-keep-what-they-have', 'money'],
    visibleProfession: true,
    tie: 'the keeper of {place}',
  },
  'beat-cop': {
    role: 'the patrolman on the beat',
    ageBand: [26, 52],
    professionDetails: [
      'walks the same eight corners every night and rattles every door on them',
      'has had this post for four years and can time the round to the minute',
      'came on at six and will go off at two, the same as every night',
    ],
    wants: ['to-be-feared', 'respectability', 'to-keep-what-they-have'],
    visibleProfession: true,
    tie: 'the patrolman whose post takes in {place}',
  },
  cabbie: {
    role: 'the hackman on the stand',
    ageBand: [26, 58],
    professionDetails: [
      'sits the stand at {place} and takes the fares as they come',
      'has worked the stand at {place} for six years and knows every regular fare on it',
      'drives nights off the stand at {place} and sleeps in the mornings',
    ],
    wants: ['money', 'to-be-left-alone', 'to-keep-what-they-have'],
    visibleProfession: true,
    tie: 'on the stand at {place}',
  },
  druggist: {
    role: 'the druggist',
    ageBand: [32, 64],
    professionDetails: [
      'keeps {place} open until eleven and fills what is brought in',
      'has had {place} since before the war and knows what everybody on the block takes',
      'stands the counter at {place} and writes down every prescription twice',
    ],
    wants: ['respectability', 'to-keep-what-they-have', 'money'],
    visibleProfession: true,
    tie: 'behind the counter at {place}',
  },
};

/**
 * Third parties: people a backstory can name who are not in the case. The
 * generator draws one of these, gives them a name out of the same pools as
 * everybody else, and files them in `case.mentions` so that every later
 * sentence uses the same name for the same person.
 */
export interface MentionRole {
  id: Id;
  role: string;
  gender: 'm' | 'f';
}

export const MENTION_ROLES: MentionRole[] = [
  { id: 'men-woman', role: 'a woman they had both been seeing', gender: 'f' },
  { id: 'men-partner', role: 'a partner who walked out of the business', gender: 'm' },
  { id: 'men-sister', role: 'a sister who married out of the neighbourhood', gender: 'f' },
  { id: 'men-foreman', role: 'the foreman who did the hiring', gender: 'm' },
  { id: 'men-mortgage', role: 'the man who held the second mortgage', gender: 'm' },
  { id: 'men-daughter', role: 'a daughter who married and moved to Newark', gender: 'f' },
  { id: 'men-clerk', role: 'the clerk who kept the ledger before', gender: 'm' },
  { id: 'men-bail', role: 'an old friend who once put up the bail', gender: 'm' },
  { id: 'men-cousin', role: 'a cousin who went back to the old country', gender: 'm' },
  { id: 'men-landlady', role: 'the landlady at the old address', gender: 'f' },
  { id: 'men-brother', role: 'a younger brother in trouble upstate', gender: 'm' },
];

export const MENTION_ROLE_BY_ID: Record<Id, MentionRole> = Object.fromEntries(
  MENTION_ROLES.map((m) => [m.id, m]),
);

/** What a purpose reads as, in the plain register. `{V}` is the victim. */
export const PURPOSE_TEXT: Record<Purpose, string> = {
  'find-the-killer-police-wont':
    'wants the one who killed {V} found, because the precinct has stopped looking',
  'clear-my-name': 'wants it established that it was not them, before anybody says otherwise',
  'keep-it-quiet': 'wants it settled quietly, before it is settled loudly',
  'find-it-before-the-cops': 'wants it found before the police find it',
  'get-it-back': 'wants it back, and does not much care who took it',
  'bring-them-home': 'wants {V} found and brought home',
  'make-sure-they-stay-gone': 'wants to know {V} is gone for good, and where',
  'settle-a-debt-with-the-dead': 'has something owing with {V} that death did not settle',
};
