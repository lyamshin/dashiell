import type { Id } from '../types.js';
import type { Relationship } from './cast.js';

/**
 * A tie in the owner's words (the world-coherence pass, rule 2).
 *
 * The designer, on a Raw lost-item night: "I am a customer of Daniel
 * Feeney's … I bought from him for years. Everybody on the block did" —
 * "what did he buy from the victim — very odd." A relationship card is
 * written once, for any owner, and some owners cannot carry its words: a
 * theatrical agent has no customers, an heiress no business partner, a
 * landlord no landlord. A case the mix deals new draws another tie
 * (`coherence.ts`); a classic case the mix keeps is dealt draw for draw as it
 * always was, and its tie is said here in words that fit the owner: a
 * "customer" of an agent is an act on the agent's books, of a bondsman
 * somebody he stood bail for, of an heiress a tradesman she bought from.
 *
 * One for one with the card: three backstories with `{third}` where the
 * card has it, the same alternatives and three `since` lines, so the dossier
 * takes exactly the draws it took and only the words change. A field left out
 * is the card's own. Keyed by the owner's archetype, or, for a tie about the
 * address, by the residence.
 */
export interface TieWords {
  text?: string;
  backstory?: [string, string, string];
  backstoryFirst?: [string, string, string];
  /** One for one with the card's `backstoryAlt`: [record, first person], or null. */
  backstoryAlt?: ([string, string] | null)[];
  since?: [string, string, string];
  /** `RELATION_PLAIN`'s sentence for this owner: "was on {V}’s books". */
  plain?: string;
  /** `RELATION_WHY`'s line for this owner. */
  why?: string;
}

/** A partner in a sideline: what the owner put in, where a business would put its name. */
function sideline(what: string): TieWords {
  return {
    text: '{V}’s partner in a sideline',
    backstory: [
      '{person} and {victim} went into a sideline together in {year} and have been arguing about it since',
      `{person} put up the money and {victim} put up ${what}, and neither of them ever wrote it down`,
      '{person} bought into {victim}’s sideline the year {third} walked out of it',
    ],
    backstoryFirst: [
      '{victim} and I went into a sideline together in {year}. We have been arguing about it since. Not once in front of anybody.',
      `I put up the money. {victim} put up ${what}. Neither of us ever wrote any of it down.`,
      'I bought into {victim}’s sideline the year {third} walked out of it. I have wondered about that since. It seemed a bargain at the time.',
    ],
    backstoryAlt: [
      [
        '{person} went into a sideline with {victim} in {year}, and the two of them have argued about it ever since',
        'I went into a sideline with {victim} in {year}. We have argued about it ever since, and never in front of anybody.',
      ],
      [
        `The money in the sideline was {person}’s and ${what} was {victim}’s to give, and nothing was ever put on paper`,
        `The money was mine and ${what} was {victim}’s to give. Nothing was ever put on paper.`,
      ],
      null,
    ],
    plain: 'was in a sideline with {V}',
    why: 'A partner in a sideline knows where the money goes.',
  };
}

/** A witness against the people a self-employed owner did business with. */
const DID_BUSINESS_WITH: TieWords = {
  text: 'a witness against the people {V} did business with',
  backstory: [
    '{person} gave a statement about the people {victim} did business with and has been careful ever since',
    '{person} is due before the grand jury about {victim}’s business friends, and the date is set',
    '{person} talked to the district attorney in {year} and {third} has not spoken to {person} since',
  ],
  backstoryFirst: [
    'I gave a statement about the people {victim} did business with. Since then I have been careful. Very careful.',
    'I am due before the grand jury about {victim}’s business friends. The date is set. I cannot put it off.',
    'I talked to the district attorney in {year}. {third} has not spoken to me since. Not a word.',
  ],
  backstoryAlt: [
    [
      'since making a statement about the people {victim} did business with, {person} has been careful',
      'Since I made my statement about the people {victim} did business with, I have been careful.',
    ],
    [
      '{person} has a date before the grand jury about {victim}’s business friends',
      'I have a date before the grand jury about {victim}’s business friends. It is set.',
    ],
    null,
  ],
  plain: 'was going to testify against the people {V} did business with',
};

export const TIE_WORDS: Record<Id, Record<Id, TieWords>> = {
  'rel-customer': {
    // The card was written for this one: everybody on the block did.
    'vic-bootlegger': {
      since: ['since {year}', 'for years', 'since Prohibition came in'],
    },
    'vic-pawnbroker': {
      backstoryFirst: [
        'I bought out of {victim}’s window for years, and pawned there when I had to. I settled at the end of every month.',
        'I have been on {victim}’s books since {year}. The tickets are all in my name.',
        '{third} sent me to {victim} with a coat one winter. I never pawned anywhere else after that.',
      ],
      backstoryAlt: [
        [
          '{person} has bought from {victim} for years, and paid up at the end of each month',
          'For years I bought out of {victim}’s window. I paid up at the end of each month.',
        ],
        ['since {year} {person} has had an account with {victim}', 'I have had an account with {victim} since {year}. Tickets, mostly.'],
        null,
      ],
    },
    'vic-wholesaler': {
      backstoryFirst: [
        'I bought my cloth from {victim} for years, while {victim} was in the trade. I settled at the end of every month.',
        'I have been on {victim}’s books since {year}. I bought cloth, and never anything else.',
        '{third} introduced me to {victim}. I never bought cloth anywhere else after that.',
      ],
      backstoryAlt: [
        [
          '{person} has bought from {victim} for years, and paid up at the end of each month',
          'For years I bought my cloth from {victim}. I paid up at the end of each month.',
        ],
        [
          'since {year} {person} has had an account with {victim}',
          'I have had an account with {victim} for cloth since {year}. Nothing more than that.',
        ],
        null,
      ],
      since: ['since {year}', 'for years', 'since before the war'],
    },
    'vic-landlord': {
      text: 'a shopkeeper who rents from {V}',
      backstory: [
        '{person} has rented a shop front from {victim} for years and paid at the end of every month',
        '{person} has been in {victim}’s rent book since {year}',
        '{person} came to {victim} for a shop front on {third}’s word and has kept it since',
      ],
      backstoryFirst: [
        'I have rented my shop front from {victim} for years. I paid at the end of every month, which is more than the block can say.',
        'I have been in {victim}’s rent book since {year}. A shop front, and never anything else.',
        '{third} sent me to {victim} for a shop front. I have kept it since.',
      ],
      backstoryAlt: [
        [
          '{person} has paid {victim} for a shop front for years, at the end of each month',
          'For years I have paid {victim} for my shop front, at the end of each month.',
        ],
        ['since {year} {person} has rented a shop front from {victim}', 'I have rented a shop front from {victim} since {year}. Nothing more than that.'],
        null,
      ],
      since: ['since {year}', 'for years', 'since the shop opened'],
      plain: 'rented a shop front from {V}',
      why: 'Somebody in a landlord’s rent book knows when the landlord calls.',
    },
    'vic-heiress': {
      text: 'a tradesman {V} bought from',
      backstory: [
        '{victim} has bought from {person} for years and settled at the end of every month',
        '{person} has had {victim} on the books as a customer since {year}',
        '{victim} came to {person} on {third}’s word and never went anywhere else',
      ],
      backstoryFirst: [
        '{victim} bought from me for years. Settled at the end of every month, like a lady.',
        'I have had {victim} on my books since {year}. A customer, and never anything else.',
        '{third} sent {victim} to me. {victim} never went anywhere else after that.',
      ],
      backstoryAlt: [
        ['for years {victim} has bought from {person}, and paid at the end of each month', 'For years {victim} bought from me, and paid at the end of each month.'],
        ['since {year} {victim} has had an account with {person}', '{victim} has had an account with me since {year}. Nothing more than that.'],
        null,
      ],
      since: ['since {year}', 'for years', 'since the first order'],
      plain: 'sold to {V}',
      why: 'Somebody who sells to a rich woman knows where her money goes.',
    },
    'vic-agent': {
      text: 'an act on {V}’s books',
      backstory: [
        '{person} has been on {victim}’s books for years and paid the ten per cent at the end of every month',
        '{person} has been one of {victim}’s acts since {year}',
        '{person} came to {victim} on {third}’s introduction and has stayed on the books',
      ],
      backstoryFirst: [
        'I have been on {victim}’s books for years. Ten per cent, at the end of every month.',
        'I have been one of {victim}’s acts since {year}. An act, and never anything else.',
        '{third} introduced me to {victim}. I never went to another agent after that.',
      ],
      backstoryAlt: [
        ['{person} has paid {victim} ten per cent for years, at the end of each month', 'For years I paid {victim} ten per cent, at the end of each month.'],
        ['since {year} {person} has been on {victim}’s books', 'I have been on {victim}’s books since {year}. Nothing more than that.'],
        null,
      ],
      since: ['since {year}', 'for years', 'since the first booking'],
      plain: 'was on {V}’s books',
      why: 'An act on an agent’s books knows who else is waiting on the telephone.',
    },
    'vic-inspector': {
      text: 'somebody who paid {V} for a clean inspection',
      backstory: [
        '{person} has paid {victim} for a clean inspection every year for years, and always on time',
        '{person} has been in {victim}’s little book since {year}',
        '{person} came to {victim} on {third}’s advice about a fire escape and has paid ever since',
      ],
      backstoryFirst: [
        'I paid {victim} for a clean inspection every year. Everybody on the block did, but I paid on time.',
        'I have been in {victim}’s little book since {year}. A name and a figure, and never anything else.',
        '{third} told me who to see about the fire escape. It was {victim}. I have paid ever since.',
      ],
      backstoryAlt: [
        ['every year for years {person} has paid {victim} for a clean inspection', 'Every year I paid {victim} for a clean inspection, and on time.'],
        ['since {year} {person} has been in {victim}’s little book', 'I have been in {victim}’s little book since {year}. Nothing more than that.'],
        null,
      ],
      since: ['since {year}', 'for years', 'since the last inspection'],
      plain: 'paid {V} for a clean inspection',
      why: 'Somebody who pays an inspector knows what the inspector costs.',
    },
    'vic-union-treasurer': {
      text: 'a member who paid dues to {V}',
      backstory: [
        '{person} has paid dues to {victim} for years and settled at the end of every month',
        '{person} has been in {victim}’s dues ledger since {year}',
        '{person} came into the local on {third}’s word and has paid {victim} dues since',
      ],
      backstoryFirst: [
        'I paid my dues to {victim} for years. Everybody in the local did, but I paid at the end of every month.',
        'I have been in {victim}’s dues ledger since {year}. A member, and never anything else.',
        '{third} signed me up. I have paid my dues to {victim} since.',
      ],
      backstoryAlt: [
        ['{person} has paid {victim} dues for years, at the end of each month', 'For years I paid {victim} my dues, at the end of each month.'],
        ['since {year} {person} has been a member in {victim}’s ledger', 'I have been in {victim}’s ledger since {year}. A member, nothing more.'],
        null,
      ],
      since: ['since {year}', 'for years', 'since the local was chartered'],
      plain: 'paid union dues to {V}',
      why: 'A member who pays dues watches where the dues go.',
    },
    'vic-columnist': {
      text: 'somebody who paid {V} for a mention',
      backstory: [
        '{person} has paid {victim} for a kind word in the column for years, and always on time',
        '{person} has been on {victim}’s list for a mention since {year}',
        '{person} came to {victim} on {third}’s introduction and has been in the column since',
      ],
      backstoryFirst: [
        'I paid {victim} for a kind word in the column for years. Everybody who wanted one did, but I paid on time.',
        'I have been on {victim}’s list since {year}. A mention now and then, and never anything else.',
        '{third} introduced me to {victim}. I have been in the column ever since.',
      ],
      backstoryAlt: [
        ['for years {person} has paid {victim} for a kind word in the column', 'For years I paid {victim} for a kind word, and on time.'],
        ['since {year} {person} has been on {victim}’s list for a mention', 'I have been on {victim}’s list since {year}. Nothing more than that.'],
        null,
      ],
      since: ['since {year}', 'for years', 'since the first mention'],
      plain: 'paid {V} for a mention in the column',
      why: 'Somebody who pays for a mention knows what the column costs, and who else pays.',
    },
    'vic-bondsman': {
      text: 'somebody {V} stood bail for',
      backstory: [
        '{person} has had {victim} stand bail for years and paid the premium at the end of every month',
        '{person} has been on {victim}’s books since {year}',
        '{person} came to {victim} on {third}’s say-so one night in court and has gone back since',
      ],
      backstoryFirst: [
        '{victim} stood my bail more than once. Everybody on the block needed it some time, but I paid the premium on time.',
        'I have been on {victim}’s books since {year}. A bail, and never anything else.',
        '{third} gave me {victim}’s name one night in court. I have gone back since.',
      ],
      backstoryAlt: [
        ['{person} has paid {victim}’s premium for years, at the end of each month', 'For years I paid {victim}’s premium, at the end of each month.'],
        ['since {year} {person} has been on {victim}’s books', 'I have been on {victim}’s books since {year}. Nothing more than that.'],
        null,
      ],
      since: ['since {year}', 'for years', 'since the first night in court'],
      plain: 'owed {V} for a bail',
      why: 'Somebody out on bail keeps close to the one who stood it.',
    },
  },
  'rel-partner': {
    'vic-heiress': {
      text: 'the one who manages {V}’s money',
      backstory: [
        '{person} has managed {victim}’s money since {year} and argued about every cheque',
        '{person} put up the sense and {victim} put up the money, and neither of them ever wrote it down',
        '{person} took over {victim}’s affairs the year {third} walked out on them',
      ],
      backstoryFirst: [
        'I have managed {victim}’s money since {year}. We have argued about every cheque. Not once in front of anybody.',
        '{victim} put up the money. I put up the sense. Neither of us ever wrote any of it down.',
        'I took over {victim}’s affairs the year {third} walked out on them. I have wondered about that since.',
      ],
      backstoryAlt: [
        [
          '{person} has looked after {victim}’s money since {year}, and the two of them have argued about every cheque',
          'I have looked after {victim}’s money since {year}. We have argued about every cheque, never in front of anybody.',
        ],
        [
          'The money was {victim}’s and the sense was {person}’s, and nothing was ever put on paper',
          'The money was {victim}’s and the sense was mine. Nothing was ever put on paper.',
        ],
        null,
      ],
      plain: 'managed {V}’s money',
      why: 'Whoever manages the money knows where it goes.',
    },
    'vic-inspector': sideline('the signatures'),
    'vic-union-treasurer': sideline('the union’s name'),
    'vic-columnist': sideline('the column'),
  },
  'rel-witness': {
    'vic-landlord': DID_BUSINESS_WITH,
    'vic-heiress': DID_BUSINESS_WITH,
    'vic-agent': DID_BUSINESS_WITH,
    'vic-pawnbroker': DID_BUSINESS_WITH,
    'vic-columnist': DID_BUSINESS_WITH,
    'vic-wholesaler': DID_BUSINESS_WITH,
  },
  'rel-landlord': {
    // A landlord's landlord is the bank, or whoever holds the paper.
    'vic-landlord': {
      text: 'the one who holds the mortgage on {V}’s building',
      backstory: [
        '{person} holds the mortgage on one of {victim}’s houses, and {victim} was three months behind when it happened',
        '{person} has held the mortgage on the building {victim} lived in since {year}',
        '{person} lent {victim} the money for a house as a favour to {third} and regretted it inside a month',
      ],
      backstoryFirst: [
        'I hold the mortgage on one of {victim}’s houses. Three months behind when it happened, and I had said nothing about it.',
        'I have held the mortgage on the building {victim} lived in since {year}. I hold it still.',
        'I lent {victim} the money for a house as a favour to {third}. Inside a month I regretted it. The favour was never returned.',
      ],
      backstoryAlt: [
        [
          '{victim} was three months behind on the mortgage to {person} when it happened',
          '{victim} owed me three months on the mortgage when it happened. I had not said a word about it.',
        ],
        ['since {year} the mortgage on {victim}’s building has been {person}’s', 'The mortgage on {victim}’s building has been mine since {year}.'],
        null,
      ],
      since: ['since {year}', 'the better part of ten years', 'two mortgages running'],
      plain: 'held the mortgage on {V}’s building',
      why: 'Whoever holds the mortgage knows when the money is late, and why.',
    },
  },
  'rel-spouse': {
    // Between marriages: the last one, and divorced, not estranged.
    'vic-heiress': {
      text: '{V}’s last {husband|wife}',
      backstory: [
        '{person} married {victim} in {year} and the divorce came through three years later',
        '{person} was {victim}’s {husband|wife} until {year}, and has been nothing since',
        '{person} and {victim} divorced over {third} and still meet at the same parties',
      ],
      backstoryFirst: [
        'I married {victim} in {year}. The divorce came through three years later.',
        'I was {victim}’s {husband|wife} until {year}. Nothing since.',
        '{victim} and I divorced over {third}. We still meet at the same parties.',
      ],
      backstoryAlt: [
        ['{person} and {victim} married in {year} and were divorced three years later', '{victim} and I married in {year}. Three years later we were divorced.'],
        ['until {year} {person} was {victim}’s {husband|wife}, and has been nothing since', 'Until {year} I was {victim}’s {husband|wife}. Nothing since.'],
        null,
      ],
      since: ['since {year}', 'since the divorce', 'since the winter they stopped speaking'],
      plain: 'had been married to {V}',
      why: 'A husband from before still knows the old habits.',
    },
  },
  'rel-neighbor': {
    // A house of its own on the back lot has a yard, and no airshaft.
    'res-backhouse': {
      text: '{V}’s neighbour across the yard',
      backstory: [
        '{person} lives across the yard from {victim} and can hear the radio through the window',
        '{person} has lived next door to {victim} since {year}',
        '{person} and {victim} share a yard, a gate and a long argument about {third}',
      ],
      backstoryFirst: [
        'I live across the yard from {victim}. The radio comes through the window. I hear all of it.',
        'I have lived next door to {victim} since {year}. Next door, all that time.',
        '{victim} and I share a yard and a gate. We share a long argument about {third}. It is not settled.',
      ],
      backstoryAlt: [
        ['{person} hears {victim}’s radio across the yard every night', 'Across the yard I hear {victim}’s radio every night.'],
        ['since {year} {person} and {victim} have shared a yard', '{victim} and I have shared a yard since {year}.'],
        null,
      ],
      since: ['since {year}', 'five years across the same yard', 'since the house changed hands'],
      plain: 'lived across the yard from {V}',
      why: 'A neighbour across the yard hears most of what goes on.',
    },
  },
};

/** The words for a tie to this owner at this address, if the card's own do not fit. */
export function tieWordsFor(relId: Id, ownerArchetypeId: Id, residenceId?: Id): TieWords | undefined {
  const byOwner = TIE_WORDS[relId];
  if (!byOwner) return undefined;
  return byOwner[ownerArchetypeId] ?? (residenceId !== undefined ? byOwner[residenceId] : undefined);
}

/** A relationship card as it is said to this owner: its words, where it has some. */
export function relationshipFor(rel: Relationship, ownerArchetypeId: Id, residenceId?: Id): Relationship {
  const words = tieWordsFor(rel.id, ownerArchetypeId, residenceId);
  if (!words) return rel;
  return {
    ...rel,
    ...(words.text !== undefined ? { text: words.text } : {}),
    ...(words.backstory !== undefined ? { backstory: [...words.backstory] } : {}),
    ...(words.backstoryFirst !== undefined ? { backstoryFirst: [...words.backstoryFirst] } : {}),
    ...(words.backstoryAlt !== undefined ? { backstoryAlt: words.backstoryAlt.map((a) => (a ? ([a[0], a[1]] as [string, string]) : null)) } : {}),
    ...(words.since !== undefined ? { since: [...words.since] } : {}),
  };
}
