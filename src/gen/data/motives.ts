/**
 * Motives. `letter` and `overheard` are the two independent sources the
 * generator needs for every motive it puts in play: one document found at a
 * place, one thing a person heard. `{V}` is the victim, `{P}` the motive holder.
 */
export interface MotiveTemplate {
  type: string;
  description: string;
  letter: string;
  overheard: string;
}

export const MOTIVE_TEMPLATES: MotiveTemplate[] = [
  {
    type: 'inheritance',
    description: 'stands to inherit',
    letter: 'A draft codicil in {V}’s hand striking {P} out of the will, dated last Tuesday and unsigned.',
    overheard: '{V} told {P} the lawyer was coming Thursday and that the arrangement would be changed.',
  },
  {
    type: 'jealousy',
    description: 'was jealous of the victim',
    letter: 'Three letters in {V}’s hand to a woman {P} is engaged to, kept in a drawer, the last one opened.',
    overheard: '{P} told {V} to keep away, loud enough to turn heads.',
  },
  {
    type: 'silence-a-witness',
    description: 'needed the victim silent',
    letter: 'A subpoena naming {V} before the grand jury, with {P}’s name written in the margin.',
    overheard: '{V} said to {P} that a man who testifies sleeps better.',
  },
  {
    type: 'debt',
    description: 'owed the victim money',
    letter: 'A promissory note for $4,000 signed by {P}, endorsed to {V}, three months past due.',
    overheard: '{V} told {P} that Friday was the end of it, one way or the other.',
  },
  {
    type: 'revenge',
    description: 'blamed the victim for a ruin',
    letter: 'A clipping about the failure of {P}’s business, with {V}’s name underlined twice in pencil.',
    overheard: '{P} said {V} had taken everything and would be made to feel it.',
  },
  {
    type: 'exposure',
    description: 'was about to be exposed by the victim',
    letter: 'A typed page of dates and sums in {V}’s file, headed with {P}’s name.',
    overheard: '{V} told {P} that the story would run whether {P} liked it or not.',
  },
  {
    type: 'property',
    description: 'wanted the victim out of a lease',
    letter: 'A lease assignment made out in {P}’s name, waiting only on {V}’s signature.',
    overheard: '{V} told {P} the lease would go to somebody else at the quarter day.',
  },
  {
    type: 'insurance',
    description: 'was the beneficiary of a policy on the victim',
    letter: 'A policy on {V}’s life for $10,000, twenty months old, with {P} named on the face of it.',
    overheard: '{V} asked {P} straight out who had been paying the premiums, and got no answer.',
  },
  {
    type: 'protect-another',
    description: 'was covering for somebody else',
    letter: 'A note to {P}, unsigned, asking {P} to see that {V} never says any of it aloud.',
    overheard: '{P} told {V} that if it came out, it would not be {P} who suffered for it.',
  },
];

export const MOTIVE_BY_TYPE: Record<string, MotiveTemplate> = Object.fromEntries(
  MOTIVE_TEMPLATES.map((m) => [m.type, m]),
);
