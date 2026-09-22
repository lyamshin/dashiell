/**
 * Every suspect has exactly one secret. A secret is a shape of movement plus a
 * reason: a run of ticks at one place that the person will lie about.
 *
 * Where a secret can happen is a property of the place deck (`secretsHosted`),
 * not of the secret. A secret can sit on the murder tick only if some drawn
 * place that hosts it is watched — otherwise the liar would have no way of
 * being cleared, and the whole point of an innocent lying about the murder
 * tick is that somebody else can still place them.
 *
 * `hints`, `traces` and `disqualifiers` are the raw material for noise. Every
 * noise clue in a case comes out of one of these lists, which is what makes
 * the noise true: it is a real fact about a real secret that is not the murder.
 *
 * {P} person, {Q} partner, {L} place, {T} time range.
 */
export interface SecretTemplate {
  type: string;
  label: string;
  minTicks: number;
  maxTicks: number;
  partner: 'none' | 'suspect' | 'victim';
  description: string;
  /** Things somebody noticed, in the order a branch should reveal them. */
  hints: string[];
  /** A physical trace, found at a place. */
  traces: string[];
  /** The clue that explains the secret and takes it off the board. */
  disqualifiers: string[];
}

export const SECRET_TEMPLATES: SecretTemplate[] = [
  {
    type: 'affair',
    label: 'Affair',
    minTicks: 2,
    maxTicks: 3,
    partner: 'suspect',
    description: '{P} is with {Q} at {L} from {T}, and both will say they were somewhere else.',
    hints: [
      '{P} was seen going into {L} alone and came out with somebody half an hour later.',
      'Somebody asked {P} a plain question about the evening and got three different answers.',
      '{Q} answers for {P} before {P} can answer, and neither of them likes being asked twice.',
    ],
    traces: [
      'Two glasses at {L}, one of them with a lip print on it, and only one of them paid for.',
      'A note in a woman’s hand at {L}, no name on it, naming a time and nothing else.',
      'A man’s hat at {L} that fits nobody who admits to being there.',
    ],
    disqualifiers: [
      '{Q} breaks and says it plainly: {Q} was with {P} at {L} for the whole of it, from {T}, and it is a marriage they are hiding, not a killing.',
      'The keeper at {L} knows them both by sight and says the pair of them were there from {T}, and that it is nobody’s business but theirs.',
    ],
  },
  {
    type: 'embezzling',
    label: 'Embezzling',
    minTicks: 1,
    maxTicks: 2,
    partner: 'none',
    description: '{P} goes through the books at {L} from {T}, while there is nobody to see.',
    hints: [
      '{P} had a key to {L} that {P} had no business having.',
      'The accounts at {L} are in two hands, and the second hand only appears in the last column.',
      'Somebody heard a drawer being worked at {L} some time after {T}.',
    ],
    traces: [
      'A carbon of a deposit slip at {L}, made out in {P}’s hand to an account in another name.',
      'Ledger pages at {L} where the totals have been rubbed and written over.',
    ],
    disqualifiers: [
      'The bank confirms the account: {P} has been taking two hundred a month for a year, and was at {L} doing exactly that from {T}. It is theft, and it is not murder.',
      'The books at {L} settle it. {P} spent from {T} covering a hole in the accounts, which is why {P} would rather be suspected of anything else.',
    ],
  },
  {
    type: 'gambling-debt',
    label: 'Gambling debt',
    minTicks: 1,
    maxTicks: 2,
    partner: 'none',
    description: '{P} slips off to {L} from {T} to settle with a bookmaker.',
    hints: [
      '{P} was asking around for a hundred dollars in a hurry earlier in the week.',
      'A man nobody knew was waiting for {P} at {L} and would not give a name.',
      '{P} goes very quiet when the racing wire is mentioned.',
    ],
    traces: [
      'Betting slips at {L} in {P}’s pocketbook, all of them losers, all of them this month.',
      'A book of markers at {L} with {P}’s initials against four of them.',
    ],
    disqualifiers: [
      'The bookmaker’s runner is found and will say it: {P} was at {L} from {T} paying off eleven hundred dollars, a dollar at a time, and went nowhere near the killing.',
      'The book at {L} has the payment entered against {P}’s name and the time beside it, from {T}, in the clerk’s own hand.',
    ],
  },
  {
    type: 'fence',
    label: 'Fencing stolen goods',
    minTicks: 1,
    maxTicks: 2,
    partner: 'none',
    description: '{P} hands a parcel of stolen goods to a man at {L} from {T}.',
    hints: [
      '{P} was carrying a parcel into {L} and came out without it.',
      'There is a man who meets people at {L} and nobody will say his name out loud.',
      '{P} has been selling things that were never {P}’s to sell.',
    ],
    traces: [
      'Wrapping paper and a cut string at {L}, and the shop it came from closed two years ago.',
      'A pawn ticket at {L} in a name that does not exist, made out at the hour in question.',
    ],
    disqualifiers: [
      'The receiver at {L} would rather talk than be held: {P} was there from {T} handing over a parcel of somebody else’s silver, which is a charge {P} will take over this one.',
      'The goods turn up, tagged and dated, and the tag puts {P} at {L} from {T} with both hands full.',
    ],
  },
  {
    type: 'blackmail',
    label: 'Blackmail',
    minTicks: 1,
    maxTicks: 2,
    partner: 'victim',
    description: '{P} meets {V} alone at {L} from {T} and asks for money.',
    hints: [
      '{P} and {V} were heard at {L}, and one of them was doing all the talking.',
      '{P} has come into money lately and has no visible way of having come into money.',
      '{V} had been drawing cash in amounts that did not match anything in the accounts.',
    ],
    traces: [
      'An envelope at {L} with nothing in it, addressed in {V}’s hand to no one.',
      'A photograph at {L}, folded small, of something {V} would have paid to keep folded.',
    ],
    disqualifiers: [
      '{V}’s bank book settles it: four payments, and {P} at {L} from {T} collecting the fifth. It is extortion, and an extortionist wants {V} alive.',
      'The thing {P} was holding over {V} turns up, and it was worth more to {P} every month than once.',
    ],
  },
  {
    type: 'secret-drinking',
    label: 'Drinking in secret',
    minTicks: 2,
    maxTicks: 2,
    partner: 'none',
    description: '{P} drinks alone at {L} from {T} and will claim to have been anywhere else.',
    hints: [
      '{P} had taken a drink and had gone to some trouble about the smell of it.',
      '{P} is on a temperance pledge that {P} mentions before anybody asks.',
      'Somebody at {L} says {P} is in more often than {P} lets on.',
    ],
    traces: [
      'A bottle at {L} pushed behind the pipes, the seal broken and the level down.',
      'A tab at {L} in a name that is not {P}’s, in {P}’s handwriting.',
    ],
    disqualifiers: [
      'The man behind the counter at {L} knows exactly: {P} was on the same stool from {T} and was in no condition to walk anywhere, let alone do this.',
      'The tab at {L} is dated and timed, from {T}, and {P} was there to run it up.',
    ],
  },
  {
    type: 'forged-identity',
    label: 'Forged identity',
    minTicks: 0,
    maxTicks: 0,
    partner: 'none',
    description:
      '{P} is not the person the papers say. Nothing about the evening is hidden; the lie is all in the paperwork.',
    hints: [
      '{P}’s registration card gives an address on a street that does not exist.',
      'Two signatures of {P}’s, a month apart, are in different hands.',
      '{P} answers to the name a half-second late, every time.',
    ],
    traces: [
      'A union card in {P}’s coat lining carries a different surname and a 1919 date.',
      'A steamship ticket stub among {P}’s things, in the name of a man who died at Belleau Wood.',
    ],
    disqualifiers: [
      'The name {P} was born with turns up on a desertion warrant from 1918. {P} has been hiding from the Army for eleven years and from nobody else.',
      'The papers are forged and the reason is plain: {P} was put out of the country once already and does not mean to be put out twice.',
    ],
  },
  {
    type: 'dope',
    label: 'Buying morphine',
    minTicks: 1,
    maxTicks: 2,
    partner: 'none',
    description: '{P} buys morphine at {L} from {T} and would rather be thought a murderer than a hop-head.',
    hints: [
      '{P}’s sleeves are buttoned at the wrist in a warm room.',
      'Somebody at {L} sells what a druggist will not, and {P} knows which door.',
      '{P} was steady at nine and shaking at seven, and it was not nerves about the police.',
    ],
    traces: [
      'A paper of powder at {L}, folded the way one particular hand folds them.',
      'A prescription blank at {L} signed by a doctor who has been dead since the spring.',
    ],
    disqualifiers: [
      'The man who sells it at {L} gives it up rather than be held: {P} was there from {T}, and stayed until it took hold.',
      'The doctor {P} used to see confirms the habit and the hour: {P} was at {L} from {T}, and could not have crossed the street unhelped.',
    ],
  },
  {
    type: 'union-organizing',
    label: 'Organizing the shop',
    minTicks: 2,
    maxTicks: 2,
    partner: 'none',
    description: '{P} is at {L} from {T} signing men up, which is a firing offence and worse.',
    hints: [
      '{P} has been seen with men from three different shops and none of them were drinking.',
      'There is a list going round and {P}’s name is at the top of it.',
      'A private agency has had a man on {P} for a fortnight.',
    ],
    traces: [
      'A sheaf of signed cards at {L}, forty of them, in a strapped envelope.',
      'A hall rental receipt at {L} made out to a name that means nothing to anyone.',
    ],
    disqualifiers: [
      'Forty men will swear to it if they have to: {P} was at {L} from {T} taking their names, and the only thing {P} is guilty of is a charter.',
      'The agency’s own operative confirms it. He was watching {P} at {L} for the whole of it, from {T}, and wrote it up for his employer.',
    ],
  },
  {
    type: 'hidden-family',
    label: 'A child boarded out',
    minTicks: 1,
    maxTicks: 2,
    partner: 'none',
    description: '{P} goes to {L} from {T} to see a child nobody is supposed to know about.',
    hints: [
      '{P} sends money out of every pay envelope and cannot say where it goes.',
      'A woman at {L} asked for {P} by a name {P} has not used in years.',
      '{P} keeps a photograph and will not be asked about it twice.',
    ],
    traces: [
      'A board-and-keep receipt at {L}, monthly, eight years of them.',
      'A child’s shoe at {L}, and nobody at {L} has any children.',
    ],
    disqualifiers: [
      'The woman who keeps the child says it straight out: {P} was at {L} from {T}, the same as every week, and left with the same face as always.',
      'The parish register at {L} has the christening in it, and the board money receipted through the evening in question.',
    ],
  },
];

export const SECRET_BY_TYPE: Record<string, SecretTemplate> = Object.fromEntries(
  SECRET_TEMPLATES.map((s) => [s.type, s]),
);
