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
  /**
   * docs/38: the same motive where the tie already runs the money the other
   * way. A creditor or a landlord who "owed the victim four thousand dollars"
   * reads as two debts in one breath ("held the mortgage… owed him $4,000"),
   * so between those two the motive's words turn round: the victim owed them.
   * Words only — the motive, its type and its draws are the same.
   */
  owedTo?: { description: string; descriptionTemplate: string; letter: string };
  /**
   * Playtest round 2: the report's menu line, where the category alone would
   * say a direction the case may not have ("owed money" of the one who was
   * owed it). Absent: the category.
   */
  menu?: string;
}

/** Ties where the victim already owed the other one money. */
export const OWED_TO_TIES: readonly string[] = ['rel-creditor', 'rel-landlord'];

/** A motive's words for somebody with this tie: the reverse-direction ones where the tie needs them. */
export function motiveWords(t: MotiveTemplate, relationshipId: string | undefined): { descriptionTemplate: string; letter: string } {
  if (t.owedTo && relationshipId !== undefined && OWED_TO_TIES.includes(relationshipId)) return t.owedTo;
  return { descriptionTemplate: t.descriptionTemplate, letter: t.letter };
}

/**
 * Playtest round 2: whether this motive, for somebody with this tie, runs the
 * other way (the victim owed them). One direction everywhere, from the truth:
 * the witness's talk, the rules list, the notebook, the story and the curtain.
 */
export function owedTheOtherWay(type: string, relationshipId: string | undefined): boolean {
  const t = MOTIVE_BY_TYPE[type];
  return t?.owedTo !== undefined && relationshipId !== undefined && OWED_TO_TIES.includes(relationshipId);
}

/**
 * The bare category, for one person: "owed money", or "was owed money" where
 * the tie runs the debt the other way. `fallback` is the category of a motive
 * outside the murder list (a mundane or an affair's).
 */
export function motiveCategory(type: string, relationshipId: string | undefined, fallback?: string): string {
  const t = MOTIVE_BY_TYPE[type];
  if (t?.owedTo && owedTheOtherWay(type, relationshipId)) return t.owedTo.description;
  return t?.description ?? fallback ?? type;
}

export const MOTIVE_TEMPLATES: MotiveTemplate[] = [
  {
    type: 'inheritance',
    description: 'stands to inherit',
    descriptionTemplate: 'stands to inherit from {V}',
    letter: 'A change to {V}’s will, drafted in {V}’s hand, striking {P} out of it, dated last Tuesday and unsigned.',
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
    menu: 'money owed, one way or the other',
    descriptionTemplate: 'owed {V} four thousand dollars and was past due on it',
    letter: 'An IOU for $4,000 signed by {P}, made out to {V}, three months past due.',
    owedTo: {
      description: 'was owed money',
      descriptionTemplate: 'was owed four thousand dollars by {V} and had given up waiting for it',
      letter: 'An IOU for $4,000 signed by {V}, made out to {P}, three months past due.',
    },
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
    overheard: '{V} told {P} the lease would go to somebody else at the end of the quarter.',
  },
  {
    type: 'insurance',
    description: 'was the beneficiary of a life-insurance policy',
    descriptionTemplate: 'was the beneficiary of a ten-thousand-dollar life-insurance policy on {V}',
    letter: 'A life-insurance policy on {V} for $10,000, twenty months old, with {P} named on the face of it.',
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

/**
 * M14 — the small reasons. A lost dog, a borrowed ring and an hour nobody
 * will account for are not done for an inheritance. The designer's list:
 * spite, jealousy, embarrassment, affection, pride. `envy` is the jealousy of
 * a thing rather than of a person, because `jealousy` above is already the
 * one about a woman and means it.
 *
 * Never drawn off an archetype: the trope decides the culprit's, and the
 * innocents of a mundane case draw theirs from this list and no other. Kept
 * apart from `MOTIVE_TEMPLATES` so the report of a murder still offers the
 * murder's reasons, and a lost dog's report offers these.
 */
export const MUNDANE_MOTIVES: MotiveTemplate[] = [
  {
    type: 'spite',
    description: 'did it out of spite',
    descriptionTemplate: 'had it in for {V} and wanted {V} to feel it',
    letter: 'A note in {P}’s hand to {V}, never sent, which says {V} will be sorry and underlines sorry twice.',
    overheard: '{P} told {V} on the stairs that some people get what is coming to them, and looked right at {V}.',
  },
  {
    type: 'envy',
    description: 'was jealous of what somebody else had',
    descriptionTemplate: 'was jealous of what {V} had, and said so to anybody who would stand still',
    letter: 'A list in {P}’s hand of everything {V} has that {P} has not, with the last line underlined.',
    overheard: '{P} said {V} had everything handed to {V} on a plate and never once said thank you for the plate.',
  },
  {
    type: 'embarrassment',
    description: 'was covering an embarrassment',
    descriptionTemplate: 'did a foolish thing and could not stand for {V} to find out about it',
    letter: 'A note in {P}’s hand that starts an apology to {V} three times and never finishes one.',
    overheard: '{P} told somebody that if {V} ever found out, {P} would have to leave the city, and possibly the state.',
  },
  {
    type: 'affection',
    description: 'did it out of affection',
    descriptionTemplate: 'was fonder of what {V} had than {V} ever was',
    letter: 'A drawing in {P}’s hand on the back of a laundry list, of the very thing {V} lost, done with a great deal of care.',
    overheard: '{P} said {V} did not deserve it, never had, and did not even know how to look after it.',
  },
  {
    type: 'pride',
    description: 'had pride at stake',
    descriptionTemplate: 'had pride at stake against {V} and would not be the one to lose',
    letter: 'A league sheet with {V}’s name at the top and {P}’s second, and {V}’s name gone over with a pen until the paper tore.',
    overheard: '{P} told {V} that one day {P} would have the last laugh, and then laughed early, to practise.',
  },
];

/**
 * M14 — why the one an affair case is about was where they were, with whom.
 * The report does not ask it; the proof's motive leg still wants the reason
 * found, and the ending tells it. Never drawn by anybody but the culprit of
 * an affair.
 */
export const AFFAIR_MOTIVES: MotiveTemplate[] = [
  {
    type: 'love',
    description: 'was in love',
    descriptionTemplate: 'has been in love with {V} since the spring and has stopped pretending otherwise',
    letter: 'A letter in {P}’s hand to {V}, four pages long, and the last page is mostly the word Tuesday.',
    overheard: '{P} told {V} on the stairs that Tuesday could not come round fast enough, and {V} laughed and said hush.',
  },
  {
    type: 'secret-kept',
    description: 'was keeping somebody’s secret',
    descriptionTemplate: 'was keeping {V}’s secret for {V}, and had given {V} a promise about it',
    letter: 'A note in {V}’s hand to {P}: same time, same place, and not a word at home.',
    overheard: '{P} told {V} that nobody would hear it from {P}, and {V} said that was the whole point.',
  },
  {
    type: 'business-done',
    description: 'had business that was not done in daylight',
    descriptionTemplate: 'had business with {V} that neither of them wanted written down',
    letter: 'A page of figures in {P}’s hand with {V}’s initials at the bottom and a date that was a Tuesday.',
    overheard: '{P} told {V} to bring the rest of it on Tuesday, and to come alone, and not to tell anybody at home.',
  },
];

/** The mundane reasons, by type. */
export const MUNDANE_MOTIVE_TYPES: string[] = MUNDANE_MOTIVES.map((m) => m.type);

export const MOTIVE_BY_TYPE: Record<string, MotiveTemplate> = Object.fromEntries(
  [...MOTIVE_TEMPLATES, ...MUNDANE_MOTIVES, ...AFFAIR_MOTIVES].map((m) => [m.type, m]),
);
