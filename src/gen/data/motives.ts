import type { Id } from '../types.js';

/**
 * Motives. `letter` and `overheard` are the two independent sources the
 * generator needs for every motive it puts in play: one document found at a
 * place, one thing a person heard. `{V}` is the victim, `{P}` the motive
 * holder, `{O}` the object of the motive where it has one.
 *
 * M5 §3: no motive text may lack its object. "Jealous of the victim" is not a
 * motive, it is a category. `descriptionTemplate` is what a person's motive
 * actually reads as once the case is in hand — "was jealous of Sweeney over
 * Rosa Ferrante" — and `objectRole`, where present, is the third party the
 * generator has to invent and file in `case.mentions` to say it.
 *
 * `description` is the bare category, kept because the report's menu and the
 * notebook's summary have no case in hand when they render it. It never says
 * "the victim".
 */
export interface MotiveTemplate {
  type: string;
  /** The bare category. No object, and never the words "the victim". */
  description: string;
  /** What it reads as in a case. `{V}`, `{P}`, `{O}`. */
  descriptionTemplate: string;
  /** The mention role this motive needs as its object, if it needs one. */
  objectRole?: Id;
  letter: string;
  overheard: string;
}

export const MOTIVE_TEMPLATES: MotiveTemplate[] = [
  {
    type: 'inheritance',
    description: 'stands to inherit',
    descriptionTemplate: 'stands to inherit from {V}',
    letter: 'A draft codicil in {V}’s hand striking {P} out of the will, dated last Tuesday and unsigned.',
    overheard: '{V} told {P} the lawyer was coming Thursday and that the arrangement would be changed.',
  },
  {
    type: 'jealousy',
    description: 'was jealous over a woman',
    descriptionTemplate: 'was jealous of {V} over {O}',
    objectRole: 'men-woman',
    letter: 'Three letters in {V}’s hand to {O}, kept in {P}’s drawer, the last one opened.',
    overheard: '{P} told {V} to keep away from {O}, loud enough to turn heads.',
  },
  {
    type: 'silence-a-witness',
    description: 'needed a witness silenced',
    descriptionTemplate: 'needed {V} silent before the grand jury',
    letter: 'A subpoena naming {V} before the grand jury, with {P}’s name written in the margin.',
    overheard: '{V} said to {P} that a man who testifies sleeps better.',
  },
  {
    type: 'debt',
    description: 'owed money',
    descriptionTemplate: 'owed {V} four thousand dollars and was past due on it',
    letter: 'A promissory note for $4,000 signed by {P}, endorsed to {V}, three months past due.',
    overheard: '{V} told {P} that Friday was the end of it, one way or the other.',
  },
  {
    type: 'revenge',
    description: 'blamed somebody for a ruin',
    descriptionTemplate: 'blamed {V} for the ruin of {P}’s business',
    letter: 'A clipping about the failure of {P}’s business, with {V}’s name underlined twice in pencil.',
    overheard: '{P} said {V} had taken everything and would be made to feel it.',
  },
  {
    type: 'exposure',
    description: 'was about to be exposed',
    descriptionTemplate: 'was about to be exposed by {V}',
    letter: 'A typed page of dates and sums in {V}’s file, headed with {P}’s name.',
    overheard: '{V} told {P} that the story would run whether {P} liked it or not.',
  },
  {
    type: 'property',
    description: 'wanted a lease',
    descriptionTemplate: 'wanted {V} out of the lease and the lease in {P}’s name',
    letter: 'A lease assignment made out in {P}’s name, waiting only on {V}’s signature.',
    overheard: '{V} told {P} the lease would go to somebody else at the quarter day.',
  },
  {
    type: 'insurance',
    description: 'was the beneficiary of a policy',
    descriptionTemplate: 'was the beneficiary of a ten-thousand-dollar policy on {V}’s life',
    letter: 'A policy on {V}’s life for $10,000, twenty months old, with {P} named on the face of it.',
    overheard: '{V} asked {P} straight out who had been paying the premiums, and got no answer.',
  },
  {
    type: 'protect-another',
    description: 'was covering for somebody else',
    descriptionTemplate: 'was covering for {O}, and {V} knew what there was to cover',
    objectRole: 'men-brother',
    letter: 'A note to {P}, unsigned, asking {P} to see that {V} never says any of it aloud about {O}.',
    overheard: '{P} told {V} that if it came out, it would be {O} who suffered for it.',
  },
];

export const MOTIVE_BY_TYPE: Record<string, MotiveTemplate> = Object.fromEntries(
  MOTIVE_TEMPLATES.map((m) => [m.type, m]),
);
