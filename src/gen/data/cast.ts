import type { CaseType, Id, Purpose, Want } from '../types.js';
import { AFFAIR_RELATIONSHIPS, M14_RELATIONSHIPS } from './ties.js';

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
  /**
   * The same specifics in the client's own mouth, one for one with
   * `backstory`. The third person serves the truth sheet and the notebook;
   * this serves page one, where the person is in the room saying it. Written
   * rather than transformed: a conjugating rewrite is right about two hundred
   * phrases out of two hundred until somebody writes the two hundred and
   * first.
   */
  backstoryFirst: string[];
  /** "since '18", "going back to the war", "three years this spring". */
  since: string[];
  /**
   * M11 §B.2: the same specifics said another way, one for one with
   * `backstory` (null where none is written), for a case that deals one
   * relationship to three people and has run out of variants: two tenants
   * never say the same sentence. Words only; the facts are the variant's.
   */
  backstoryAlt?: ([string, string] | null)[];
  /**
   * Why a person in this relationship would hire a detective, by case type,
   * and how often. Eligibility is the first half of the rule and the weight is
   * the second: a purpose is in a cell only when its `cost` sentence is *true*
   * of that relationship — only somebody with a stake in the goods "cannot
   * report the loss without saying where the thing came from" — and the weight
   * then says how much of that cell it takes. A missing weight means the
   * purpose is not open to this relationship in this kind of case.
   */
  purposes: Record<'murder' | 'robbery' | 'missing', PurposeWeights> & Partial<Record<CaseType, PurposeWeights>>;
}

/** A cell of the purpose table: the purposes that fit, and their weights. */
export type PurposeWeights = Partial<Record<Purpose, number>>;

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
  /**
   * The same details in the person's own mouth, one for one with
   * `professionDetails`. Hone 2 §Track B: a client on page one says what they
   * do rather than being described doing it, and says it the way somebody
   * says it who has been asked before — two or three sentences, one of them
   * short. The record keeps the third person for the sheet.
   */
  professionFirst: string[];
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
  /**
   * The same, for a case that is not a crime against them: the owner of a
   * lost cat or a lost watch, or the one an affair is about. The designer: a
   * cat's owner is not introduced as the keeper of a file of what was never
   * printed. Three, like `standing`, and the story reads them as variants 3–5.
   */
  standingMundane: string[];
}

/** Every standing line a victim card has, in the order the story numbers them. */
export function allStandings(card: VictimArchetype): string[] {
  return [...card.standing, ...card.standingMundane];
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
  'to-keep-what-they-have': 'wants to keep what {he|she} has and add nothing to it',
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
    backstoryFirst: [
      '{victim} and I took the lease together in {year}. We have been arguing about it since. Not once in front of anybody.',
      'I put up the money. {victim} put up the name. Neither of us ever wrote any of it down.',
      'I bought into {victim}’s business the year {third} walked out of it. I have wondered about that since. It seemed a bargain at the time.',
    ],
    since: ['since {year}', 'going on eight years', 'three years this spring'],
    backstoryAlt: [
      [
        '{person} went into business with {victim} in {year}, and the two of them have argued about the lease ever since',
        'I went into business with {victim} in {year}. We have argued about the lease ever since, and never in front of anybody.',
      ],
      [
        'The money in the business was {person}’s and the name on it was {victim}’s, and nothing was ever put on paper',
        'The money was mine and the name was {victim}’s. Nothing was ever put on paper.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 30, 'keep-it-quiet': 26, 'settle-a-debt-with-the-dead': 26, 'clear-my-name': 18 },
      robbery: { 'get-it-back': 30, 'find-it-before-the-cops': 26, 'keep-it-quiet': 20, 'settle-a-debt-with-the-dead': 12, 'clear-my-name': 12 },
      missing: { 'bring-them-home': 34, 'keep-it-quiet': 28, 'settle-a-debt-with-the-dead': 24, 'clear-my-name': 14 },
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
    backstoryFirst: [
      'I have rented from {victim} since {year}. The same window. The same complaint about it, every year.',
      'I took the rooms over {place} from {victim}. I have been two weeks behind since the spring. Two weeks, never three.',
      '{victim} put my rent up twice in a year. I paid it twice. I did not argue either time.',
    ],
    since: ['since {year}', 'since the flu year', 'four years in the same rooms'],
    backstoryAlt: [
      [
        '{person} has taken the same rooms from {victim} every year since {year}, and made the same complaint every year',
        'Since {year} I have rented the same rooms from {victim}. Every year I make the same complaint.',
      ],
      [
        '{person} rents the rooms over {place} from {victim} and has been a fortnight late with it since the spring',
        'I rent the rooms over {place} from {victim}. Since the spring I have been a fortnight late with it.',
      ],
      [
        '{person} paid {victim} twice in one year when the rent went up twice',
        'The rent went up twice in one year. I paid {victim} both times.',
      ],
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 50, 'keep-it-quiet': 28, 'clear-my-name': 22 },
      robbery: { 'find-it-before-the-cops': 48, 'keep-it-quiet': 30, 'clear-my-name': 22 },
      missing: { 'bring-them-home': 46, 'keep-it-quiet': 32, 'clear-my-name': 22 },
    },
  },
  {
    id: 'rel-landlord',
    text: '{V}’s {landlord|landlady}',
    impliesMotives: ['property', 'debt', 'revenge'],
    backstory: [
      '{victim} rented from {person} and was three months behind when it happened',
      '{person} has held the mortgage on the building {victim} lived in since {year}',
      '{person} put {victim} into the rooms as a favour to {third} and regretted it inside a month',
    ],
    backstoryFirst: [
      '{victim} rented from me. Three months behind when it happened, and I had said nothing about it.',
      'I have held the mortgage on the building {victim} lived in since {year}. I hold it still.',
      'I put {victim} into the rooms as a favour to {third}. Inside a month I regretted it. The favour was never returned.',
    ],
    since: ['since {year}', 'the better part of ten years', 'two leases running'],
    backstoryAlt: [
      [
        '{victim} was three months behind on the rent to {person} when it happened',
        '{victim} owed me three months’ rent when it happened. I had not said a word about it.',
      ],
      [
        'since {year} the mortgage on {victim}’s building has been {person}’s',
        'The mortgage on {victim}’s building has been mine since {year}.',
      ],
      null,
    ],
    purposes: {
      murder: { 'keep-it-quiet': 36, 'find-the-killer-police-wont': 32, 'settle-a-debt-with-the-dead': 20, 'clear-my-name': 12 },
      robbery: { 'find-it-before-the-cops': 40, 'keep-it-quiet': 34, 'settle-a-debt-with-the-dead': 14, 'clear-my-name': 12 },
      missing: { 'make-sure-they-stay-gone': 38, 'keep-it-quiet': 32, 'settle-a-debt-with-the-dead': 18, 'clear-my-name': 12 },
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
    backstoryFirst: [
      'I worked for {victim} four years. I was let go in {year}, without a reference.',
      '{victim} put me out of a job over forty dollars. The money was never found. I did not take it.',
      'I kept {victim}’s books until {third} was brought in over my head. Nobody told me first.',
    ],
    since: ['since {year}', 'four years, and then nothing', 'until last winter'],
    backstoryAlt: [
      [
        '{victim} let {person} go in {year} after four years, and gave no reference',
        'Four years I worked for {victim}. In {year} I was let go, and there was no reference.',
      ],
      [
        '{person} lost the job with {victim} over forty dollars that nobody ever found',
        'I lost my job with {victim} over forty dollars. Nobody ever found them. I never had them.',
      ],
      null,
    ],
    purposes: {
      murder: { 'settle-a-debt-with-the-dead': 42, 'find-the-killer-police-wont': 34, 'clear-my-name': 24 },
      robbery: { 'get-it-back': 42, 'settle-a-debt-with-the-dead': 36, 'clear-my-name': 22 },
      missing: { 'bring-them-home': 44, 'settle-a-debt-with-the-dead': 34, 'clear-my-name': 22 },
    },
  },
  {
    id: 'rel-creditor',
    text: '{V}’s creditor',
    impliesMotives: ['debt', 'insurance', 'property'],
    backstory: [
      '{person} lent {victim} money in {year} and has extended the loan every ninety days since',
      '{victim} borrowed from {person} to pay off another debt and never mentioned it to anybody',
      '{person} lent {victim} money in front of {third} and has been reminded of it ever since',
    ],
    backstoryFirst: [
      'I lent {victim} money in {year}, and I have extended the loan every ninety days since. Every ninety days, on the day.',
      '{victim} borrowed from me to pay off another debt. It was never mentioned to anybody. Not by either of us.',
      'I lent {victim} money in front of {third}. That was a mistake. I have been reminded of it ever since.',
    ],
    since: ['since {year}', 'through three extensions of the loan', 'going back to the war'],
    backstoryAlt: [
      [
        '{person} has had money out to {victim} since {year}, renewed every ninety days',
        'Since {year} {victim} has had my money, renewed every ninety days.',
      ],
      [
        '{person} quietly lent {victim} the money to settle another debt',
        'I lent {victim} the money to settle another debt. Nobody else knew about it.',
      ],
      null,
    ],
    purposes: {
      murder: { 'settle-a-debt-with-the-dead': 42, 'find-the-killer-police-wont': 32, 'keep-it-quiet': 26 },
      robbery: { 'get-it-back': 34, 'settle-a-debt-with-the-dead': 34, 'find-it-before-the-cops': 32 },
      missing: { 'settle-a-debt-with-the-dead': 34, 'make-sure-they-stay-gone': 34, 'bring-them-home': 32 },
    },
  },
  {
    id: 'rel-debtor',
    text: 'in {V}’s debt',
    impliesMotives: ['debt', 'exposure', 'revenge'],
    backstory: [
      '{person} has owed {victim} money since {year} and has not been asked for it lately',
      '{victim} lent {person} money through a bad winter and has been collecting on it ever since',
      '{person} signed an IOU to {victim} that {third} witnessed and nobody has torn up',
    ],
    backstoryFirst: [
      'I have owed {victim} money since {year}. Nobody has asked for it lately. That is what worries me.',
      '{victim} lent me money through a bad winter. The collecting has not stopped since. I am still paying.',
      'I signed an IOU to {victim}. {third} witnessed it. Nobody has torn it up.',
    ],
    since: ['since {year}', 'since the flu year', 'two winters running'],
    backstoryAlt: [
      [
        '{person} has been in debt to {victim} since {year}, and lately nobody has asked for it',
        'I have been in debt to {victim} since {year}. Nobody has asked for it lately. I do not like that.',
      ],
      [
        '{person} borrowed from {victim} one bad winter and is still paying it back',
        'I borrowed from {victim} one bad winter. I am still paying it back.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 36, 'keep-it-quiet': 34, 'clear-my-name': 30 },
      robbery: { 'find-it-before-the-cops': 44, 'keep-it-quiet': 34, 'clear-my-name': 22 },
      missing: { 'make-sure-they-stay-gone': 46, 'keep-it-quiet': 32, 'clear-my-name': 22 },
    },
  },
  {
    id: 'rel-lawyer',
    text: '{V}’s lawyer',
    impliesMotives: ['exposure', 'inheritance', 'property'],
    backstory: [
      '{person} has drawn up every contract {victim} ever signed, going back to {year}',
      '{person} keeps {victim}’s will in a box and has read it more often than {victim} did',
      '{victim} brought {person} the business {third} would not touch',
    ],
    backstoryFirst: [
      'I have drawn up every contract {victim} ever signed. That goes back to {year}. All of it in my own hand.',
      '{victim}’s will is in my box. I have read it more often than {victim} did.',
      '{victim} brought me the business {third} would not touch. I took it.',
    ],
    since: ['since {year}', 'for eleven years', 'going back to the war'],
    backstoryAlt: [
      [
        'every contract {victim} signed since {year} was drawn up by {person}',
        'Every contract {victim} signed since {year}, I drew up myself.',
      ],
      [
        '{victim}’s will is in {person}’s keeping, and {person} knows it better than {victim} did',
        'I keep {victim}’s will. I know it better than {victim} did.',
      ],
      null,
    ],
    purposes: {
      murder: { 'keep-it-quiet': 40, 'find-the-killer-police-wont': 32, 'settle-a-debt-with-the-dead': 28 },
      robbery: { 'find-it-before-the-cops': 42, 'keep-it-quiet': 34, 'settle-a-debt-with-the-dead': 24 },
      missing: { 'keep-it-quiet': 36, 'bring-them-home': 34, 'make-sure-they-stay-gone': 30 },
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
    backstoryFirst: [
      '{victim} and I are cousins. We were raised four doors apart.',
      'I am {victim}’s cousin on the mother’s side. I have not been asked to dinner since {year}. Not once.',
      '{victim}, {third} and I came over on the same boat. Inside a year we had split up. That was the end of it.',
    ],
    since: ['all their lives', 'since {year}', 'since they were children on the same block'],
    backstoryAlt: [
      [
        '{person} and {victim} are cousins who grew up four doors from each other',
        '{victim} is my cousin. We grew up four doors from each other.',
      ],
      [
        '{person} is a cousin of {victim}’s on the mother’s side, and has not had a dinner invitation since {year}',
        'I am a cousin on the mother’s side. I have not been asked to dinner since {year}.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 42, 'settle-a-debt-with-the-dead': 30, 'clear-my-name': 28 },
      robbery: { 'find-it-before-the-cops': 42, 'keep-it-quiet': 34, 'clear-my-name': 24 },
      missing: { 'bring-them-home': 46, 'clear-my-name': 28, 'keep-it-quiet': 26 },
    },
  },
  {
    id: 'rel-inlaw',
    text: '{V}’s {brother-in-law|sister-in-law}',
    impliesMotives: ['inheritance', 'jealousy', 'debt'],
    backstory: [
      '{person} married {victim}’s {sister|brother} in {year} and has been in the family ever since',
      '{person} is {victim}’s {brother-in-law|sister-in-law} and has been told so at every holiday',
      '{victim} stood up at {person}’s wedding and {third} has never let either of them forget it',
    ],
    backstoryFirst: [
      'I married {victim}’s {sister|brother} in {year}. I have been in the family ever since. For better or worse.',
      'I am {victim}’s {brother-in-law|sister-in-law}. At every holiday somebody has told me so.',
      '{victim} stood up at my wedding. {third} has never let either of us forget it.',
    ],
    since: ['since {year}', 'since the wedding', 'nine years of Sundays'],
    backstoryAlt: [
      [
        '{person} has been family to {victim} since marrying {victim}’s {sister|brother} in {year}',
        'I married {victim}’s {sister|brother} in {year}. I have been family ever since.',
      ],
      [
        '{person} is {victim}’s {brother-in-law|sister-in-law}, and somebody says so at every holiday',
        'I am {victim}’s {brother-in-law|sister-in-law}. Somebody says so at every holiday.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 36, 'keep-it-quiet': 36, 'clear-my-name': 28 },
      robbery: { 'find-it-before-the-cops': 40, 'keep-it-quiet': 36, 'clear-my-name': 24 },
      missing: { 'bring-them-home': 40, 'keep-it-quiet': 32, 'make-sure-they-stay-gone': 28 },
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
    backstoryFirst: [
      '{victim} and I have been in the same trade on the same street since {year}. Neither of us moved.',
      'I took two of {victim}’s best accounts. {victim} took one of them back. We were even enough.',
      '{third} had something to sell. {victim} and I both bid for it. {victim} got it.',
    ],
    since: ['since {year}', 'six years of it', 'since they were both starting out'],
    backstoryAlt: [
      [
        '{person} and {victim} have worked the same trade on the same street since {year}',
        'Since {year} {victim} and I have worked the same trade on the same street.',
      ],
      [
        '{person} took two of {victim}’s best customers, and {victim} won one of them back',
        'I took two of {victim}’s best customers. {victim} won one back.',
      ],
      null,
    ],
    purposes: {
      murder: { 'clear-my-name': 38, 'keep-it-quiet': 36, 'find-the-killer-police-wont': 26 },
      robbery: { 'find-it-before-the-cops': 44, 'keep-it-quiet': 28, 'clear-my-name': 28 },
      missing: { 'make-sure-they-stay-gone': 42, 'clear-my-name': 32, 'keep-it-quiet': 26 },
    },
  },
  {
    id: 'rel-spouse',
    text: '{V}’s estranged {husband|wife}',
    impliesMotives: ['inheritance', 'jealousy', 'insurance'],
    opposeVictimGender: true,
    backstory: [
      '{person} married {victim} in {year} and they have lived apart for three of those years',
      '{person} is {victim}’s {husband|wife} in law and nothing else, and has been since {year}',
      '{person} and {victim} separated over {third} and never went near a court about it',
    ],
    backstoryFirst: [
      'I married {victim} in {year}. Three of those years we have lived apart.',
      'I am {victim}’s {husband|wife} in law and nothing else. That has been true since {year}.',
      '{victim} and I separated over {third}. We never went near a court about it. No papers, no lawyers.',
    ],
    since: ['since {year}', 'three years apart', 'since the winter they stopped speaking'],
    backstoryAlt: [
      [
        '{person} and {victim} married in {year} and have lived apart for three years of it',
        '{victim} and I married in {year}. We have lived apart three years of it.',
      ],
      [
        'since {year} {person} has been {victim}’s {husband|wife} on paper and in nothing else',
        'Since {year} I have been {victim}’s {husband|wife} on paper, and nothing else.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 36, 'keep-it-quiet': 34, 'clear-my-name': 30 },
      robbery: { 'get-it-back': 44, 'keep-it-quiet': 34, 'clear-my-name': 22 },
      missing: { 'bring-them-home': 40, 'make-sure-they-stay-gone': 34, 'clear-my-name': 26 },
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
    backstoryFirst: [
      'I have sat nights with {victim} since {year}. Six nights out of seven.',
      '{third} put me in to nurse {victim}. The fee stopped. I stayed on anyway.',
      'I know what {victim} took, and when. I know how much of it was necessary. Not all of it.',
    ],
    since: ['since {year}', 'since the spring', 'eleven months of nights'],
    backstoryAlt: [
      [
        'six nights in seven since {year}, {person} has sat up with {victim}',
        'Since {year} I have sat up with {victim} six nights in seven.',
      ],
      null,
      [
        '{person} knows every dose {victim} took, and how many of them were needed',
        'I know every dose {victim} took. Not all of them were needed.',
      ],
    ],
    purposes: {
      murder: { 'clear-my-name': 36, 'find-the-killer-police-wont': 36, 'settle-a-debt-with-the-dead': 28 },
      robbery: { 'clear-my-name': 30, 'find-it-before-the-cops': 38, 'settle-a-debt-with-the-dead': 32 },
      missing: { 'bring-them-home': 40, 'clear-my-name': 32, 'settle-a-debt-with-the-dead': 28 },
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
    backstoryFirst: [
      'I have answered {victim}’s letters since {year}. I read them all first. That is the work.',
      'I keep {victim}’s diary. I know which of the entries are true. Not many of them.',
      'I was hired on {third}’s word. I have been more use than {third} ever was. A good deal more.',
    ],
    since: ['since {year}', 'for six years', 'since the rooms changed'],
    backstoryAlt: [
      [
        'every letter {victim} got since {year} came through {person}’s hands first',
        'Every letter {victim} got since {year} came through my hands first.',
      ],
      [
        '{person} keeps {victim}’s appointment book and knows which entries to believe',
        'I keep the appointment book. I know which entries to believe.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 36, 'settle-a-debt-with-the-dead': 34, 'clear-my-name': 30 },
      robbery: { 'find-it-before-the-cops': 44, 'settle-a-debt-with-the-dead': 32, 'clear-my-name': 24 },
      missing: { 'bring-them-home': 36, 'keep-it-quiet': 34, 'clear-my-name': 30 },
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
    backstoryFirst: [
      'I have been engaged to {victim}’s daughter since {year}. No date has been set.',
      'I asked {victim} for the daughter. I was told to come back when there was money. I have not been back.',
      '{victim}’s daughter and I have been engaged since {year}. {third} calls it a long engagement. It is.',
    ],
    since: ['since {year}', 'two years engaged', 'since last Easter'],
    backstoryAlt: [
      [
        'since {year} {person} has been engaged to {victim}’s daughter, and nobody has named a day',
        'Since {year} {victim}’s daughter and I have been engaged. Nobody has named a day.',
      ],
      [
        '{victim} told {person} to come back for the daughter when there was money',
        '{victim} told me to come back for the daughter when I had money. I have not yet.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 46, 'keep-it-quiet': 30, 'clear-my-name': 24 },
      robbery: { 'find-it-before-the-cops': 44, 'keep-it-quiet': 34, 'clear-my-name': 22 },
      missing: { 'bring-them-home': 48, 'keep-it-quiet': 28, 'clear-my-name': 24 },
    },
  },
  {
    id: 'rel-childhood',
    text: 'a childhood friend of {V}’s from the same block',
    impliesMotives: ['revenge', 'protect-another', 'debt'],
    backstory: [
      '{person} and {victim} grew up on the same block and have known each other since {year}',
      '{person} and {victim} were children together and neither of them ever left the neighbourhood',
      '{person}, {victim} and {third} were inseparable for ten years and have not been in a room together since',
    ],
    backstoryFirst: [
      'We grew up on the same block, {victim} and I. We have known each other since {year}. That is a long time.',
      '{victim} and I were children together. Neither of us ever left the neighbourhood. Neither of us tried.',
      '{victim}, {third} and I were inseparable for ten years. We have not been in a room together since. Not once.',
    ],
    since: ['all their lives', 'since {year}', 'since they were children on the same stoop'],
    backstoryAlt: [
      [
        '{person} has known {victim} since {year}, from the same block',
        'I have known {victim} since {year}. We come from the same block.',
      ],
      [
        'neither {person} nor {victim} ever left the neighbourhood they grew up in together',
        '{victim} and I grew up together here. Neither of us ever left.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 42, 'settle-a-debt-with-the-dead': 34, 'clear-my-name': 24 },
      robbery: { 'settle-a-debt-with-the-dead': 40, 'find-it-before-the-cops': 38, 'clear-my-name': 22 },
      missing: { 'bring-them-home': 46, 'settle-a-debt-with-the-dead': 30, 'clear-my-name': 24 },
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
    backstoryFirst: [
      'I have been named in {victim}’s will since {year}. I have known it that long.',
      '{victim} told me there was something in the will. How much was never said. I did not ask.',
      '{third} and I are both named in it. Only one of us knows. I have said nothing to {third}.',
    ],
    since: ['since {year}', 'since the will was redrawn', 'for as long as there has been a will'],
    backstoryAlt: [
      [
        'since {year} {person} has known about being in {victim}’s will',
        'Since {year} I have known I was in {victim}’s will.',
      ],
      [
        '{person} was told there was something in {victim}’s will, but not how much',
        'I was told there was something for me in the will. Not how much.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 38, 'keep-it-quiet': 34, 'clear-my-name': 28 },
      robbery: { 'get-it-back': 46, 'keep-it-quiet': 32, 'clear-my-name': 22 },
      missing: { 'make-sure-they-stay-gone': 38, 'bring-them-home': 34, 'keep-it-quiet': 28 },
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
    backstoryFirst: [
      'I gave a statement about the people {victim} worked for. Since then I have been careful. Very careful.',
      'I am due before the grand jury about {victim}’s people. The date is set. I cannot put it off.',
      'I talked to the district attorney in {year}. {third} has not spoken to me since. Not a word.',
    ],
    since: ['since {year}', 'since the indictment', 'since last autumn'],
    backstoryAlt: [
      [
        'since making a statement about the people {victim} worked for, {person} has been careful',
        'Since I made my statement about the people {victim} worked for, I have been careful.',
      ],
      [
        '{person} has a date before the grand jury about {victim}’s people',
        'I have a date before the grand jury about {victim}’s people. It is set.',
      ],
      null,
    ],
    purposes: {
      murder: { 'keep-it-quiet': 36, 'find-the-killer-police-wont': 36, 'clear-my-name': 28 },
      robbery: { 'get-it-back': 40, 'keep-it-quiet': 38, 'clear-my-name': 22 },
      missing: { 'make-sure-they-stay-gone': 44, 'keep-it-quiet': 34, 'clear-my-name': 22 },
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
    backstoryFirst: [
      'I bought from {victim} for years. Everybody on the block did, but I settled at the end of every month.',
      'I have been on {victim}’s books since {year}. A customer, and never anything else.',
      '{third} introduced me to {victim}. I never went anywhere else after that.',
    ],
    since: ['since {year}', 'for years', 'since the shop opened'],
    backstoryAlt: [
      [
        '{person} has bought from {victim} for years, and paid up at the end of each month',
        'For years I bought from {victim}. I paid up at the end of each month.',
      ],
      [
        'since {year} {person} has had an account with {victim}',
        'I have had an account with {victim} since {year}. Nothing more than that.',
      ],
      null,
    ],
    purposes: {
      murder: { 'settle-a-debt-with-the-dead': 42, 'find-the-killer-police-wont': 34, 'clear-my-name': 24 },
      robbery: { 'find-it-before-the-cops': 40, 'settle-a-debt-with-the-dead': 38, 'clear-my-name': 22 },
      missing: { 'bring-them-home': 44, 'settle-a-debt-with-the-dead': 34, 'clear-my-name': 22 },
    },
  },
  {
    id: 'rel-neighbor',
    text: '{V}’s neighbour across the airshaft',
    impliesMotives: ['revenge', 'jealousy', 'property'],
    backstory: [
      '{person} lives across the airshaft from {victim} and can hear the radio through it',
      '{person} has lived on the same landing as {victim} since {year}',
      '{person} and {victim} share a wall, a landing and a long argument about {third}',
    ],
    backstoryFirst: [
      'I live across the airshaft from {victim}. The radio comes through it. I hear all of it.',
      'I have lived on the same landing as {victim} since {year}. The same landing, all that time.',
      '{victim} and I share a wall and a landing. We share a long argument about {third}. It is not settled.',
    ],
    since: ['since {year}', 'five years on the same landing', 'since the building changed hands'],
    backstoryAlt: [
      [
        '{person} hears {victim}’s radio across the airshaft every night',
        'Across the airshaft I hear {victim}’s radio every night.',
      ],
      [
        'since {year} {person} and {victim} have shared a landing',
        '{victim} and I have shared a landing since {year}.',
      ],
      null,
    ],
    purposes: {
      murder: { 'find-the-killer-police-wont': 48, 'keep-it-quiet': 28, 'clear-my-name': 24 },
      robbery: { 'find-it-before-the-cops': 48, 'keep-it-quiet': 30, 'clear-my-name': 22 },
      missing: { 'bring-them-home': 46, 'keep-it-quiet': 32, 'clear-my-name': 22 },
    },
  },
];

// M14: the ties beyond money, and the two an affair's client holds. Never on
// an archetype's own list, so the untiered draw never sees them.
RELATIONSHIPS.push(...M14_RELATIONSHIPS, ...AFFAIR_RELATIONSHIPS);

export const RELATIONSHIP_BY_ID: Record<Id, Relationship> = Object.fromEntries(
  RELATIONSHIPS.map((r) => [r.id, r]),
);

/**
 * What a customer says on page one, by what the owner sells. The designer, on
 * a tailor who was a customer of a retired cloth wholesaler: "I bought from him
 * for years. Everybody on the block did" — the block does not buy cloth by the
 * bolt. One for one with `rel-customer`'s own lines, `{third}` in the same
 * place, so the draw is the same and only the words change. The record's third
 * person is the card's and fits every trade that sells.
 *
 * Only an owner who sells has a customer at all (`coherence.ts`, `OWNER_HAS`).
 */
export interface CustomerWords {
  backstoryFirst: [string, string, string];
  /** The first-person half of `backstoryAlt`, one for one. */
  backstoryAltFirst: [string, string];
  since: [string, string, string];
}

export const CUSTOMER_WORDS: Record<Id, CustomerWords> = {
  // The card's own words were written for this one: everybody on the block did.
  'vic-bootlegger': {
    backstoryFirst: [
      'I bought from {victim} for years. Everybody on the block did, but I settled at the end of every month.',
      'I have been on {victim}’s books since {year}. A customer, and never anything else.',
      '{third} introduced me to {victim}. I never went anywhere else after that.',
    ],
    backstoryAltFirst: [
      'For years I bought from {victim}. I paid up at the end of each month.',
      'I have had an account with {victim} since {year}. Nothing more than that.',
    ],
    since: ['since {year}', 'for years', 'since Prohibition came in'],
  },
  'vic-pawnbroker': {
    backstoryFirst: [
      'I bought out of {victim}’s window for years, and pawned there when I had to. I settled at the end of every month.',
      'I have been on {victim}’s books since {year}. The tickets are all in my name.',
      '{third} sent me to {victim} with a coat one winter. I never pawned anywhere else after that.',
    ],
    backstoryAltFirst: [
      'For years I bought out of {victim}’s window. I paid up at the end of each month.',
      'I have had an account with {victim} since {year}. Tickets, mostly.',
    ],
    since: ['since {year}', 'for years', 'since the shop opened'],
  },
  'vic-wholesaler': {
    backstoryFirst: [
      'I bought my cloth from {victim} for years, while {victim} was in the trade. I settled at the end of every month.',
      'I have been on {victim}’s books since {year}. I bought cloth, and never anything else.',
      '{third} introduced me to {victim}. I never bought cloth anywhere else after that.',
    ],
    backstoryAltFirst: [
      'For years I bought my cloth from {victim}. I paid up at the end of each month.',
      'I have had an account with {victim} for cloth since {year}. Nothing more than that.',
    ],
    since: ['since {year}', 'for years', 'since before the war'],
  },
};

/** The words a customer of this owner says, or undefined where nobody is one. */
export function customerWordsFor(ownerArchetypeId: Id): CustomerWords | undefined {
  return CUSTOMER_WORDS[ownerArchetypeId];
}

/**
 * A relationship card as it is said to this owner: `rel-customer` in the
 * owner's trade, every other card as it is.
 */
export function relationshipFor(rel: Relationship, ownerArchetypeId: Id): Relationship {
  const words = rel.id === 'rel-customer' ? CUSTOMER_WORDS[ownerArchetypeId] : undefined;
  if (!words) return rel;
  return {
    ...rel,
    backstoryFirst: [...words.backstoryFirst],
    since: [...words.since],
    backstoryAlt: (rel.backstoryAlt ?? []).map((alt, i) => {
      const first = words.backstoryAltFirst[i];
      return alt && first !== undefined ? ([alt[0], first] as [string, string]) : alt;
    }),
  };
}

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
    professionFirst: [
      'I live on family money. I have no occupation anybody can name. I do have an account at three tailors, which keeps me very busy.',
      'I live on an allowance from the family. It comes on the first of the month and leaves by the eighth. It prefers nicer places.',
      'I live on family money. I keep a desk at a brokerage. Nobody there expects me before noon, and I have never once let them down.',
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
    professionFirst: [
      'I am a widow. I keep rooms on the avenue, and a girl comes in three mornings a week. She thinks that is too many.',
      'I am a widow. I live on an annuity and the rent from a house in Flushing. It is not a fortune, but it is extremely regular.',
      'I am a widow. I have not worked since my marriage. I see no reason to rush into it now.',
    ],
    wants: ['respectability', 'respectability', 'to-keep-what-they-have', 'to-be-left-alone'],
    visibleProfession: false,
  },
  {
    id: 'arch-broker',
    role: 'a stockbroker who trades in the street',
    relationships: ['rel-partner', 'rel-creditor', 'rel-debtor', 'rel-rival', 'rel-inlaw'],
    motives: ['debt', 'exposure', 'property'],
    secrets: ['embezzling', 'gambling-debt', 'fence'],
    class: 'money',
    trade: 'money',
    ageBand: [30, 52],
    professionDetails: [
      'trades stocks on the sidewalk outside the Exchange in all weathers',
      'trades on the street for men who would rather not be seen doing it',
      'carries three telephone numbers and no office',
    ],
    professionFirst: [
      'I trade stocks on the street, outside the Exchange. In all weathers. The market doesn’t close for rain, and neither do I, though I have thought about it.',
      'I trade stocks on the street. My customers would rather not be seen doing it themselves. I don’t mind being seen, and it’s good for business.',
      'I trade stocks on the street. I carry three telephone numbers and no office. The office is wherever I am standing, and I am always standing.',
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
    professionFirst: [
      'I write a society column for the papers. Three a week. I dine out for every one of them, and I haven’t cooked since I learned to spell.',
      'I write a society column for the papers. I have a standing table at a place the bill never comes to. The waiter has stopped trying.',
      'I write a society column for the papers. I keep a card index of everybody worth a paragraph. It should be smaller.',
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
      'carries the rent book around the buildings on the first of the month',
      'has a boilerman, a lawyer and no partners',
    ],
    professionFirst: [
      'I own the buildings on this street. Four of them. I collect the rent in person, because nobody says no to my face.',
      'I own the buildings on this street. I carry the rent book around them myself, on the first of the month. Nobody answers the door.',
      'I own the buildings on this street. I have a boilerman and a lawyer, and no partners. A partner wants a say.',
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
    professionFirst: [
      'I am a lawyer. I keep two rooms over a bank, and one clerk does the typing. The bank is the better neighbour, because it keeps quieter hours.',
      'I am a lawyer. I practise alone, and I take whatever walks up the stairs. You would be amazed what walks up the stairs.',
      'I am a lawyer. I have a list of clients, and I will not read any of it aloud. I do not read it aloud to myself either.',
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
    professionFirst: [
      'I am a bookkeeper. I keep the books for two firms and a lodge. The lodge is the difficult one, because they vote on everything.',
      'I am a bookkeeper. I sit the same desk from eight until six, and the columns are ruled by hand. My hand, and straighter than the printed kind.',
      'I am a bookkeeper. I do the payroll on Thursdays, and everybody is very nice to me. The rest of the week is ledgers, and nobody is.',
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
      'is on the nurses’ registry and takes the cases nobody else will',
      'nursed overseas and has not been out of work since',
    ],
    professionFirst: [
      'I am a private nurse. I sit nights with patients the hospitals have sent home. The patient sleeps, and I do not.',
      'I am a private nurse. I am on the registry, and I take the cases nobody else will. It is how I have met some very interesting families.',
      'I am a private nurse. I nursed overseas, and I have not been out of work since. I have not had a proper holiday either.',
    ],
    wants: ['to-be-forgiven', 'respectability', 'money', 'to-be-left-alone'],
    visibleProfession: true,
  },
  {
    id: 'arch-dentist',
    role: 'a dentist with a chair and a waiting room',
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
    professionFirst: [
      'I am a dentist. I have a chair, a waiting room and a girl on the door. The girl on the door is mostly there to stop people leaving.',
      'I am a dentist. I pull teeth for the neighbourhood, a dollar a time. Nobody haggles once they are in the chair.',
      'I am a dentist. I bought the practice second-hand, and I am still paying for the chair. The chair knows it.',
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
    professionFirst: [
      'I am a private secretary. I answer the letters and keep the diary, and I know what is in both. That is more than can be said for him.',
      'I am a private secretary. I have worked for three men in six years, and left none of them badly. I left all of them better organised.',
      'I am a private secretary. I take the dictation, and I do the banking as well. I know what he says and what it costs.',
    ],
    wants: ['to-be-somebody', 'respectability', 'to-get-out', 'money'],
    visibleProfession: false,
  },
  {
    id: 'arch-reporter',
    role: 'a freelance reporter for the evening papers',
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
    professionFirst: [
      'I write for the evening papers, freelance. I sell two hundred words at a time to whichever desk is short. Anything stretches.',
      'I write for the evening papers, freelance. I work the precincts at night and the courts in the morning. I sleep in the gaps.',
      'I write for the evening papers, freelance. I have a press card and no salary. No salary means no lunch.',
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
    professionFirst: [
      'I teach piano. I take pupils in the front room, four until seven, and I hear every scale twice. I hear most of them wrong both times.',
      'I teach piano at the settlement house. Three afternoons a week. The piano there is older than I am, and in better voice.',
      'I teach piano. I have eleven pupils, and a piano that wants tuning. The pupils don’t notice, which is the worst part.',
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
      'inspects fires for the insurance company and writes up what the fire left',
      'settles accident claims for an insurance company and is paid to doubt people',
      'has a district that runs from the river to Eighth Avenue',
    ],
    professionFirst: [
      'I am an insurance adjuster. I inspect fires for the company and write up what the fire left. Everybody remembers owning a great deal more than the fire did.',
      'I am an insurance adjuster. I settle accident claims, and I am paid to doubt people. I would do it for nothing, but I don’t tell the company.',
      'I am an insurance adjuster. I have a district that runs from the river to Eighth Avenue. Everybody in it has had an accident, according to them.',
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
    professionFirst: [
      'I am a chambermaid in a hotel. Eleven rooms a day. Then the linen, and nobody has ever made a bed for me.',
      'I am a chambermaid in a hotel. I have the third and fourth floors, and I am finished at four. Four is my favourite.',
      'I am a chambermaid in a hotel. Six years on the same floors. I know every door on them, and some mornings I do the rounds with my eyes shut.',
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
      'lines up at the pier at seven to be picked for work and takes whatever the boss hands out',
      'has a cargo hook, a union button and three days a week',
    ],
    professionFirst: [
      'I work on the docks. The Elizabeth Street pier, when there’s work. When there isn’t, I am still at the pier, looking at it.',
      'I work on the docks. I line up at the pier at seven to be picked, and I take whatever the boss hands out. I say thank you too, and that’s the hard part.',
      'I work on the docks. I have a cargo hook, a union button and three days a week. The other four I have too, but nobody pays for them.',
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
      'sews for a fashion house on the avenue and never gets her name on the label',
    ],
    professionFirst: [
      'I am a seamstress. I finish coats at home by the piece, and the bundles go back on Fridays. By the night before, I am sleeping on them.',
      'I am a seamstress. I work a machine in a loft, and I am paid by the dozen. I count everything in dozens now, even the stairs.',
      'I am a seamstress. I sew for a fashion house on the avenue, and my name is never on the label. My stitches are, all the way round.',
    ],
    wants: ['to-get-out', 'money', 'to-be-forgiven', 'respectability'],
    visibleProfession: true,
  },
  {
    id: 'arch-hackman',
    role: 'a cab driver',
    genderHint: 'm',
    relationships: ['rel-tenant', 'rel-debtor', 'rel-childhood'],
    motives: ['debt', 'revenge'],
    secrets: ['gambling-debt', 'fence', 'secret-drinking'],
    class: 'working',
    ageBand: [26, 52],
    professionDetails: [
      'waits for fares outside the hotel from six until the small hours',
      'drives nights and sleeps while the city works',
      'owns the cab and owes on it',
    ],
    professionFirst: [
      'I drive a cab. I wait for fares outside the hotel, six until the small hours. The waiting is free, and the driving they pay for.',
      'I drive a cab, nights. I sleep while the city works, and the city is very loud about it.',
      'I drive a cab. I own it, and I owe on it. There is more owe than own.',
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
      'presses coats and remakes old ones in a shop the width of a hallway',
      'has a shop under the stairs and a boy who delivers',
      'makes suits to measure for men who pay their bill at Christmas',
    ],
    professionFirst: [
      'I am a tailor. I press coats and remake old ones, in a shop the width of a hallway. Two customers is a crowd, and the third waits outside.',
      'I am a tailor. I have a shop under the stairs, and a boy does the delivering. He is faster going than coming back.',
      'I am a tailor. I make suits to measure for men who pay their bill at Christmas. The rest of the year I wait.',
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
      'works the ropes above the stage and is out of the theatre by eleven',
      'puts up and takes down the scenery for whatever is playing',
      'has been on the same crew since the theatre opened',
    ],
    professionFirst: [
      'I am a stagehand at the theatre. I work the ropes above the stage, and I am out by eleven. I never see the endings.',
      'I am a stagehand at the theatre. I put up and take down the scenery for whatever is playing. Every wall is mine.',
      'I am a stagehand at the theatre. I have been on the same crew since the theatre opened. We outlast the actors.',
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
      'works the telephone exchange and knows every number on the floor',
      'plugs the calls through and is not supposed to listen',
    ],
    professionFirst: [
      'I am a switchboard operator. I sit the board, four until midnight, and I hear both ends of everything. That is more than either end does.',
      'I am a switchboard operator at the telephone exchange. I know every number on the floor. I forget my own.',
      'I am a switchboard operator. I plug the calls through, and I am not supposed to listen. Nobody ever says what I am supposed to do with my ears.',
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
      'runs the hotel while the day manager sleeps',
      'keeps the register, the keys, and a memory of who is not in the register',
    ],
    professionFirst: [
      'I am the night manager at the hotel. I have the desk from six at night until six in the morning. The lobby never sees sunlight.',
      'I am the night manager at the hotel. I run it while the day manager sleeps. He thinks he runs it.',
      'I am the night manager at the hotel. I keep the register and the keys, and I remember who is not in the register. They are always the most polite.',
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
      'did two seasons in the chorus line and is waiting on a third',
      'rehearses when there is anything to rehearse for',
    ],
    professionFirst: [
      'I dance in the chorus, between shows just now. I make the rounds of the agencies at eleven and I am home by one. Six people say no.',
      'I dance in the chorus. Two seasons in the line, and I am waiting on a third. I have the smile ready, and I just need somewhere to put it.',
      'I dance in the chorus, between shows just now. I rehearse when there is anything to rehearse for. I look hopeful between times.',
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
      'takes illegal bets on the horses for four blocks and no further',
      'writes the odds on a slate and rubs them off before six',
    ],
    professionFirst: [
      'I take bets on the horses. In a small way, out of the back of a cigar store. The cigars are for show, and nobody’s ever bought one.',
      'I take bets on the horses. Four blocks, and no further. Past that it’s somebody else’s four blocks.',
      'I take bets on the horses. I write the odds on a slate and rub them off before six. I go through a lot of chalk.',
    ],
    wants: ['money', 'to-be-feared', 'to-be-left-alone'],
    visibleProfession: false,
  },
  {
    id: 'arch-heeler',
    role: 'a party worker for the local political club',
    genderHint: 'm',
    relationships: ['rel-witness', 'rel-rival', 'rel-partner'],
    motives: ['silence-a-witness', 'exposure', 'property'],
    secrets: ['blackmail', 'fence', 'gambling-debt'],
    class: 'underworld',
    trade: 'graft',
    ageBand: [32, 58],
    professionDetails: [
      'brings in the district’s votes for the club and is paid in favours',
      'delivers the vote on the block and the coal in February',
      'sits in the clubhouse and settles what can be settled there',
    ],
    professionFirst: [
      'I work for the local political club. I bring in the district’s votes, and I am paid in favours. Cash is for amateurs.',
      'I work for the local political club. I deliver the vote on the block, and the coal in February. They remember the coal.',
      'I work for the local political club. I sit in the clubhouse and settle what can be settled there. Most things can.',
    ],
    wants: ['to-be-feared', 'to-be-somebody', 'money'],
    visibleProfession: false,
  },
  {
    id: 'arch-pawnman',
    role: 'a pawnbroker’s clerk',
    relationships: ['rel-customer', 'rel-creditor', 'rel-rival'],
    motives: ['debt', 'exposure', 'revenge'],
    secrets: ['fence', 'forged-identity', 'dope'],
    class: 'underworld',
    trade: 'pawn',
    ageBand: [26, 50],
    professionDetails: [
      'writes the pawn tickets behind the grille and knows what a thing is worth',
      'minds the shop while the broker is at the auctions',
      'hands back what people pay to get out of pawn, and sells what nobody comes back for',
    ],
    professionFirst: [
      'I write tickets at the pawnshop. I know what a thing is worth, and I know what you’ll tell me it’s worth, and they are never the same number.',
      'I clerk at the pawnshop. I mind it while the broker is at the auctions. He comes back with things, and I find room for them.',
      'I clerk at the pawnshop. I hand back what people pay to get out of pawn. What nobody comes back for, I sell, and I try not to get fond of it.',
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
    professionFirst: [
      'I work the door at a club with no sign on it. I know every face that comes to it. Most I would rather not.',
      'I work the door at a club with no sign on it. I keep the wrong people out and the right people quiet. The right people are harder.',
      'I work the door at a club with no sign on it. I am there from nine until they close. Nobody asks me to leave.',
    ],
    wants: ['to-be-feared', 'money', 'to-keep-what-they-have'],
    visibleProfession: true,
  },
  {
    id: 'arch-runner',
    role: 'a bet collector for an illegal lottery',
    genderHint: 'm',
    relationships: ['rel-customer', 'rel-debtor', 'rel-childhood'],
    motives: ['debt', 'silence-a-witness', 'revenge'],
    secrets: ['gambling-debt', 'fence', 'dope'],
    class: 'underworld',
    ageBand: [20, 38],
    professionDetails: [
      'carries the lottery slips between four corners and a candy store',
      'collects the bets in the morning and pays the winners in the afternoon',
      'collects for the numbers, an illegal lottery run from uptown, and is trusted with the money',
    ],
    professionFirst: [
      'I collect bets for the numbers, an illegal lottery. I carry the slips between four corners and a candy store. I never buy the candy.',
      'I collect bets for the numbers, an illegal lottery. I take the bets in the morning and pay the winners in the afternoon. The afternoons are shorter.',
      'I collect bets for the numbers, an illegal lottery run from uptown. They trust me with the money. I have never given them a reason not to, and I have never given them a penny extra either.',
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
    role: '{the landlord|the landlady} of three tenements on Ninth Avenue',
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
      'was {the man|the woman} a hundred and forty people paid to keep a roof over them',
      'owned more of the street than anybody who lived on it',
    ],
    standingMundane: [
      'kept a geranium in every window {he|she} owned, and owned a good many windows',
      'knew every tenant on Ninth Avenue by name, and most of them by their excuses',
      'owned three buildings on the avenue and still swept {his|her} own front step',
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
      'supplied four speakeasies on the block and took cash only',
      'paid the precinct monthly and was never once raided',
    ],
    wants: ['money', 'to-be-feared', 'to-keep-what-they-have'],
    visibleProfession: false,
    standing: [
      'supplied half the bars on the block, and the other half wished otherwise',
      'was the reason four places on the street stayed open, and everyone knew it',
      'was owed favours by people who would rather not be reminded of them',
    ],
    standingMundane: [
      'kept the top floor, the best radio on the street, and regular hours for a bootlegger',
      'was known on the block for good whisky and a bad temper, in that order',
      'was polite to everybody on the stairs, which on that street made him a gentleman',
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
    standingMundane: [
      'had money in a neighbourhood that had none, and spent most of it on hats',
      'had been married twice and photographed more often than that',
      'was the one name on the block the papers would have printed, and she knew it',
    ],
  },
  {
    id: 'vic-agent',
    role: 'a theatrical agent',
    allowedSuspects: except('arch-longshoreman', 'arch-nurse'),
    trade: 'theatrical',
    ageBand: [38, 60],
    professionDetails: [
      'booked acts into four theatres and took ten per cent of all of it',
      'kept an office with two chairs and a telephone that never stopped',
      'had the say over who worked in the spring and who did not',
    ],
    wants: ['money', 'to-be-somebody', 'to-keep-what-they-have'],
    visibleProfession: false,
    standing: [
      'decided who worked this season, which made for a great many careful friendships',
      'had half the neighbourhood waiting on a telephone call that never came',
      'could put a name on a playbill or leave it off, and did both',
    ],
    standingMundane: [
      'knew every act on the circuit and had seen most of them twice',
      'could get anybody a booking in Newark, and said so often',
      'kept a signed photograph of everybody {he|she} ever booked, and booked a great many',
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
      'was owed a bribe by every landlord on six blocks',
      'was the reason three houses on the street were still standing open',
    ],
    standingMundane: [
      'inspected buildings for the city in the same brown suit every day',
      'knew every staircase on six blocks, and which ones to stay off',
      'had a city badge, a pension coming, and a very clean hat',
    ],
  },
  {
    id: 'vic-union-treasurer',
    role: 'a union treasurer',
    allowedSuspects: except('arch-widow', 'arch-society', 'arch-nurse'),
    trade: 'labor',
    ageBand: [36, 58],
    professionDetails: [
      'held the union local’s books and its cash box',
      'counted the dues on Fridays with the door shut',
      'was elected twice and opposed once',
    ],
    wants: ['to-keep-what-they-have', 'to-be-feared', 'respectability'],
    visibleProfession: false,
    standing: [
      'held the money four hundred men had paid in, and they all knew the figure',
      'decided who was picked for work in the morning and who was sent home',
      'was the union, as far as the street was concerned',
    ],
    standingMundane: [
      'kept the union’s accounts in a green ledger and could add a column in {his|her} head',
      'ran the union picnic every summer, and the raffle, and never won it',
      'knew four hundred men by name and most of their wives',
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
    standingMundane: [
      'had three brass balls over the door and a good memory behind the counter',
      'knew the block by what it had pawned, and said good morning to all of it',
      'could price a watch across the room and was seldom wrong',
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
    standingMundane: [
      'wrote about who danced with whom, and was right more often than not',
      'had a seat at every wedding on the block, and wrote about the cake',
      'was invited everywhere, and went to most of it',
    ],
  },
  {
    id: 'vic-bondsman',
    role: 'a bail bondsman',
    allowedSuspects: except('arch-society', 'arch-piano-teacher'),
    trade: 'money',
    ageBand: [38, 60],
    professionDetails: [
      'wrote bail bonds out of an office across from the courthouse',
      'took a house or a wedding ring as security and kept a claim on both',
      'was in night court four evenings out of seven',
    ],
    wants: ['money', 'to-keep-what-they-have', 'to-be-feared'],
    visibleProfession: false,
    standing: [
      'had stood bail for most of the block at one time or another, and was still owed for it',
      'was the first telephone call anybody on the street made at two in the morning',
      'owned a share of four houses that had been put up as security',
    ],
    standingMundane: [
      'kept an office with a bench outside it and a kettle always on',
      'never locked {his|her} office door, because nobody robs a bondsman',
      'sent a card every Christmas to everybody {he|she} ever stood bail for',
    ],
  },
  {
    id: 'vic-wholesaler',
    role: 'a retired cloth wholesaler',
    genderHint: 'm',
    allowedSuspects: except('arch-chorus', 'arch-runner'),
    // Nothing in the suspect deck is in dry goods, so this victim never has a
    // rival in trade. That is the seed-7 ward heeler, gone.
    trade: 'dry-goods',
    ageBand: [55, 74],
    professionDetails: [
      'sold the warehouse in ’24 and has lived on the proceeds since',
      'ran a wholesale cloth business on Canal Street for thirty years',
      'kept his hand in by lending to people who had been his customers',
    ],
    wants: ['to-be-left-alone', 'to-keep-what-they-have', 'respectability'],
    visibleProfession: false,
    standing: [
      'was the richest man on the landing and the only one who never mentioned it',
      'had lent money to four families on the block and forgiven none of it',
      'was thirty years in the trade and is still owed by people who left it',
    ],
    standingMundane: [
      'could tell a good wool from a bad one by the smell, and often did, out loud',
      'had retired from the cloth trade and taken up telling people about it',
      'was the best-dressed man on the landing and the only one who never mentioned it',
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
  /**
   * M11 §B.1: the same details in their own mouth, one for one with
   * `professionDetails`, for when they are asked about themselves. Not handed
   * to the dossier as `professionFirst` — that would give a fixture the
   * briefing's prompt, which only a client says — but to its character lines.
   */
  detailsFirst: string[];
}

export const FIXTURE_CARDS: Record<string, FixtureCard> = {
  bartender: {
    role: 'the bartender',
    ageBand: [28, 58],
    professionDetails: [
      'has tended bar at {place} for nine years and remembers what everybody drinks',
      'works {place} from four until they lock the door',
      'pours at {place} six nights a week and takes Mondays',
    ],
    wants: ['to-be-left-alone', 'money', 'to-keep-what-they-have'],
    visibleProfession: true,
    tie: 'behind the bar at {place}, every night of the week',
    detailsFirst: [
      'I tend bar at {place}. Nine years, and I remember what everybody drinks. Names I forget on purpose.',
      'I tend bar at {place}. I’m here from four until they lock the door. After that I’m somewhere with a chair.',
      'I tend bar at {place}, six nights a week. Mondays are mine. I spend them not listening to anybody.',
    ],
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
    detailsFirst: [
      'I work the door at {place}. I don’t write anybody down, and I don’t forget anybody. It saves on pencils.',
      'I work the door at {place}. I’ve had it since the building changed hands. The owners change, and the door stays.',
      'I work the door at {place}, six until two. I see every face twice, going in and coming out. Coming out, they generally look worse.',
    ],
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
    detailsFirst: [
      'I sell papers at {place}. I start before six and stay till the last edition’s gone. The newspapers go home before I do.',
      'I sell papers at {place}. Twenty years, and I know every regular by the paper they take. Their faces I’m less sure of.',
      'I sell papers at {place}. Nothing crosses that pavement I don’t see. The pigeons have tried.',
    ],
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
    detailsFirst: [
      'I work the counter at {place}. The evening shift, when the coffee’s oldest and so are the customers.',
      'I work the counter at {place}. Four until midnight, and I don’t sit down for any of it.',
      'I work the counter at {place}. Nobody’s ever once asked my name. They know my coffee, which is closer.',
    ],
  },
  'ticket-taker': {
    role: 'the ticket-taker',
    ageBand: [22, 60],
    professionDetails: [
      'takes the tickets at {place} and tears every one of them in half',
      'works the box office at {place} from seven until the last show goes in',
      'has taken tickets at {place} since the place opened',
    ],
    wants: ['to-be-left-alone', 'money', 'respectability'],
    visibleProfession: true,
    tie: 'on the door at {place}, every performance',
    detailsFirst: [
      'I take tickets at {place}. I tear every one of them in half. It’s the only part of the show I’m in.',
      'I take tickets at {place}. I’m there from seven until the last show goes in. After that I’m free to stand around.',
      'I take tickets at {place}. I have since the place opened. I tore the first one, and I expect I’ll tear the last.',
    ],
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
    detailsFirst: [
      'I run the elevator at {place}. I know what floor you want before you say it. People say it anyway, and I let it go.',
      'I run the elevator at {place}. Three until eleven, up and down. Mostly up and down.',
      'I run the elevator at {place}. Eleven years, and I’ve never lost a day. Nothing to do at home but stand still.',
    ],
  },
  landlady: {
    role: 'the landlady',
    ageBand: [40, 70],
    professionDetails: [
      'keeps {place} and sits where she can see the stairs',
      'has kept {place} for twenty-two years and knows every board that creaks',
      'rents out the rooms at {place} and collects on Saturdays',
    ],
    wants: ['respectability', 'to-keep-what-they-have', 'money'],
    visibleProfession: true,
    tie: 'the keeper of {place}',
    detailsFirst: [
      'I rent out the rooms at {place}. I sit where I can see the stairs. People think that’s nosiness. It’s rent.',
      'I rent out the rooms at {place}. Twenty-two years, and I know every board that creaks. Every tenant thinks they’ve found the quiet one.',
      'I rent out the rooms at {place}. I collect on Saturdays. Saturday is when people have money, and Sunday is when they have excuses.',
    ],
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
    detailsFirst: [
      'I walk a beat. The same eight corners every night, and I try every door on them. The doors have got used to me.',
      'I walk a beat. Four years on this post, and I can time the round to the minute. My feet can do it to the second.',
      'I walk a beat. I came on at six and I go off at two, the same as every night. The night has never once let me off early.',
    ],
  },
  cabbie: {
    role: 'the cabbie on the stand',
    ageBand: [26, 58],
    professionDetails: [
      'sits the stand at {place} and takes the fares as they come',
      'has worked the stand at {place} for six years and knows every regular fare on it',
      'drives nights off the stand at {place} and sleeps in the mornings',
    ],
    wants: ['money', 'to-be-left-alone', 'to-keep-what-they-have'],
    visibleProfession: true,
    tie: 'on the stand at {place}',
    detailsFirst: [
      'I drive a cab off the stand at {place}. I take the fares as they come. Some come better than others.',
      'I drive a cab off the stand at {place}. Six years, and I know every regular fare on it. I know where they’re going before they get in, which is more than half of them do.',
      'I drive a cab off the stand at {place}, nights. I sleep in the mornings. The mornings don’t miss me.',
    ],
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
    detailsFirst: [
      'I’m the druggist at {place}. I keep it open until eleven and fill what is brought in. Eleven is when people remember they have a cough.',
      'I’m the druggist at {place}. I have had it since before the war, and I know what everybody on the block takes. Most of it is for their feet.',
      'I’m the druggist at {place}. I stand the counter and write down every prescription twice. Once for the book, and once because I like to be sure.',
    ],
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
  { id: 'men-brother', role: 'a younger brother in prison upstate', gender: 'm' },
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
  'find-the-pet': 'wants {O} found and brought home to {V}',
  'find-the-thing': 'wants {O} found and put back where it belongs',
  'before-they-notice': 'wants {O} back where it belongs before {V} notices it is gone',
  'tell-me-the-truth': 'wants to know where {V} was that evening, and with whom',
  'put-my-mind-at-rest': 'wants to be told there is nothing in it, or to be told there is',
};

/**
 * The same eight, in the client's own mouth, three ways each.
 *
 * Hone 2 §Track B. These used to be the predicate after "I" — one clause a
 * purpose, the same length every time, and the page read like a form being
 * filled in. They are whole sentences now, written the way the golden's client
 * says hers: "I want what I am owed. If the man who killed him has my money,
 * then yes, I want him too." Two or three sentences, one of them six words or
 * fewer, and every fact of the third-person line still in them.
 *
 * The variant is drawn by the same index as the question in `PURPOSE_PROMPTS`,
 * so the answer and the question that asks for it were written together. Each
 * one opens on "I ", because the briefing's third-person twin opens on a name
 * and page one's opens on the person in the chair.
 */
export const PURPOSE_TEXT_FIRST: Record<Purpose, string[]> = {
  'find-the-killer-police-wont': [
    'I want the one who killed {V} found. The precinct has stopped looking. That is why I am here.',
    'I want the one who killed {V} found. Nobody at the precinct is looking any more. I am asking you instead.',
    'I want the one who killed {V} found. The precinct has stopped looking for anybody at all. So I came to you.',
  ],
  'clear-my-name': [
    'I want it established that it was not me. Before anybody says otherwise.',
    'I want it established that it was not me, and I want it done before anybody says otherwise. That is all I want.',
    'I want it established that it was not me. Somebody will say otherwise. I would rather be first.',
  ],
  'keep-it-quiet': [
    'I want it settled quietly. Before somebody settles it loudly.',
    'I want it settled quietly, because the other way it gets settled loudly. I have seen that happen.',
    'I want it settled quietly. If I wait, it gets settled loudly instead.',
  ],
  'find-it-before-the-cops': [
    'I want it found. Before the police find it.',
    'I want it found first. The police will find it if I do not.',
    'I want it in my hands before the police have it. That is the whole errand.',
  ],
  'get-it-back': [
    'I want it back. I do not much care who took it.',
    'I want it back. Who took it is a smaller question than where it is.',
    'I want the thing back. The man who took it does not interest me much.',
  ],
  'bring-them-home': [
    'I want {V} found. I want {V} brought home.',
    'I want {V} found and brought home. That is all of it.',
    'I want {V} home. Found first, and then home.',
  ],
  'make-sure-they-stay-gone': [
    'I want to know {V} is gone for good. And where.',
    'I want to know where {V} is, and that {V} is gone for good. Both of those.',
    'I want to know {V} is gone for good. I want to know where. Those two things.',
  ],
  'settle-a-debt-with-the-dead': [
    'I have something owing with {V}. Death did not settle it.',
    'I have something owing with {V} that death did not settle. It is still owing.',
    'I want what I am owed. {V} and I had something between us that death did not settle.',
  ],
  'find-the-pet': [
    'I want {O} found and brought home. {V} has been standing at the window since supper. It is a pitiful sight.',
    'I want {O} home with {V} by morning. I will pay for the morning.',
    'I want {O} found, for {V}’s sake. I know how that sounds from a grown person at this hour. I am saying it anyway.',
  ],
  'find-the-thing': [
    'I want {O} found. I want it back where it lives, and I want nobody making a fuss.',
    'I want {O} back. It is worth nothing to anybody but us, which is the whole trouble.',
    'I want {O} found. It did not walk off by itself, whatever anybody says.',
  ],
  'before-they-notice': [
    'I want {O} back where it belongs before {V} notices it is gone. {V} notices everything, eventually.',
    'I want it back before {V} misses it, and quietly. That is the whole of it.',
    'I want {O} back in its place before {V} looks for it. {V} will look. {V} always looks.',
  ],
  'tell-me-the-truth': [
    'I want to know where {V} was that evening. And with whom. The with whom, mostly.',
    'I want the truth about {V}. Where, and with whom, and I want it plain.',
    'I want to know where {V} goes on those evenings. I have been told a story. I want the other one.',
  ],
  'put-my-mind-at-rest': [
    'I want to be told there is nothing in it. Or told there is. Either way I would like to sleep.',
    'I want my mind put at rest. If it cannot be, I want to know that too. Either way.',
    'I want to know there is nothing to know. I would pay double for that.',
  ],
};

/**
 * §A.1 — the question the purpose sentence answers, three ways.
 *
 * The golden's is "So you want the man who killed him." — a guess, said flat,
 * which the client's next line corrects: "I want what I am owed." Each of
 * these is answerable by one purpose's sentence and by no other sentence of
 * the briefing, which is what separates a prompt from a prod. `{V}` is the
 * victim's surname.
 */
export const PURPOSE_PROMPTS: Record<Purpose, string[]> = {
  'find-the-killer-police-wont': [
    'Why come to me instead of the precinct?',
    'So you want the one who killed {V}.',
    'What is it you want done about {V}?',
  ],
  'clear-my-name': [
    'What is it you are afraid will be said?',
    'You think somebody will put it on you.',
    'You want it said before somebody else says it.',
  ],
  'keep-it-quiet': [
    'How do you want this settled?',
    'You would rather nobody heard about this.',
    'What happens if it is settled loudly?',
  ],
  'find-it-before-the-cops': [
    'What happens if the police find it first?',
    'Who else is looking for it?',
    'You want it in your hands before the police have it.',
  ],
  'get-it-back': [
    'Is it the thing you want, or the man?',
    'So the thing matters more than the man who took it.',
    'What is it you want back?',
  ],
  'bring-them-home': [
    'What do you want done about {V}?',
    'You want {V} found.',
    'Found, or found and brought back?',
  ],
  'make-sure-they-stay-gone': [
    'What is it you want to know about {V}?',
    'You want to be sure {V} is gone.',
    'What would satisfy you about {V}?',
  ],
  'settle-a-debt-with-the-dead': [
    'What is it {V} left unsettled with you?',
    'What is still between you and {V}?',
    'So it is the money you want.',
  ],
  'find-the-pet': [
    'What is it you want found?',
    'You want the animal back.',
    'Is it the animal you want, or whoever let it out?',
  ],
  'find-the-thing': [
    'What is it you want found?',
    'You want it back.',
    'Is it the thing you want, or whoever took it?',
  ],
  'before-they-notice': [
    'How long before {V} notices?',
    'You want it back before anybody misses it.',
    'Does {V} know yet?',
  ],
  'tell-me-the-truth': [
    'What is it you want to know about {V}?',
    'You want to know where {V} was.',
    'What do you think {V} is doing?',
  ],
  'put-my-mind-at-rest': [
    'What would put your mind at rest?',
    'You want to be told there is nothing in it.',
    'What if there is something in it?',
  ],
};

/**
 * §A.1 and Hone 2 §Track B — the question the profession sentence answers.
 *
 * The plainest question on the page, and the only one whose answer is what the
 * client does for a living. Drawn by the same index as the detail itself, so
 * the question and the sentence that answers it were written side by side.
 */
export const PROFESSION_PROMPTS: string[] = [
  'What do you do?',
  'What line of work are you in?',
  'What is it you do for a living?',
];

/**
 * One purpose assumes a body, and two of the three case types do not have one.
 * A robbery's owner is alive and standing at an address; a missing person may
 * walk back in on Thursday. The debt is the same debt and the sentence is not,
 * so the living get their own wording.
 */
export const PURPOSE_TEXT_LIVING: Partial<Record<Purpose, { third: string; first: string[] }>> = {
  'settle-a-debt-with-the-dead': {
    third: 'has something owing with {V} and means to be paid, whichever way this ends',
    first: [
      'I have something owing with {V}. I mean to be paid, whichever way this ends.',
      'I want what I am owed. {V} has it, and I mean to be paid whichever way this ends.',
      'I have something owing with {V}, and I mean to be paid. However this ends.',
    ],
  },
};

/**
 * M11, the designer's note: "It should often be 'I write tickets at the pawn
 * shop. I know what a thing is worth.' Right now it often will say the second
 * but not the first. Nobody talks that way." When somebody says what they do,
 * the plain fact comes first — the job, and the place, in words anyone knows —
 * and the colour after it. These are the plain words of each job; the first
 * sentence of a person's own account of their work carries one of them
 * (`test/m11-people.test.ts`), and a trade said in the detective's narration
 * that carries none is said plainly in front of it.
 */
export const JOB_WORDS: Record<string, RegExp> = {
  'arch-heir': /family money|allowance|expectations/i,
  'arch-widow': /\bwidow/i,
  'arch-broker': /\bstocks?\b|stockbroker|trade[sd]? on the street/i,
  'arch-society': /society column|columnist/i,
  'arch-blockowner': /own(?:s|ed)? (?:the |four )?buildings|rent book/i,
  'arch-lawyer': /\blawyer|practi[sc]e[sd]/i,
  'arch-bookkeeper': /bookkeeper|\bbooks\b|payroll|columns/i,
  'arch-nurse': /\bnurse|patients|nursed/i,
  'arch-dentist': /dentist|teeth|practice/i,
  'arch-secretary': /secretary|letters|dictation/i,
  'arch-reporter': /papers|reporter|precincts|press card|words at a time/i,
  'arch-piano-teacher': /piano|pupils/i,
  'arch-adjuster': /insurance/i,
  'arch-chambermaid': /chambermaid|rooms a day|floors/i,
  'arch-longshoreman': /\bdocks?\b|\bpier\b|longshoreman/i,
  'arch-seamstress': /seamstress|\bsews?\b|coats|machine in a loft/i,
  'arch-hackman': /\bcab\b|fares/i,
  'arch-tailor': /tailor|coats|suits|shop under the stairs/i,
  'arch-stagehand': /backstage|stagehand|stage|scenery|crew/i,
  'arch-switchboard': /switchboard|telephone exchange|the board|calls/i,
  'arch-nightman': /night manager|the desk|runs the hotel|register/i,
  'arch-chorus': /chorus|agencies|rehearses/i,
  'arch-bookmaker': /\bbets\b|odds/i,
  'arch-heeler': /political club|votes?\b|clubhouse/i,
  'arch-pawnman': /pawnshop|pawn/i,
  'arch-bouncer': /door at a club|the door/i,
  'arch-runner': /collect bets|lottery|bets/i,
  bartender: /tend(?:s|ed)? bar|bartender|bar at/i,
  doorman: /\bdoor\b/i,
  newsstand: /papers|\bstand\b/i,
  counterman: /counter/i,
  'ticket-taker': /tickets|box office/i,
  'elevator-man': /elevator|the car/i,
  landlady: /let the rooms|rooms|keeps? \{place\}|kept \{place\}/i,
  'beat-cop': /walks? a beat|corners|post|round/i,
  cabbie: /\bcab\b|\bstand\b/i,
  druggist: /druggist|\{place\}|prescription/i,
};
