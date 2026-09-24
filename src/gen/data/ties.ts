import type { CaseType, Id } from '../types.js';
import type { PurposeWeights, Relationship } from './cast.js';

/**
 * M14 §1.4 — relationships beyond money.
 *
 * The designer: "too much murder, too much money lending." Two of the twenty
 * ties the cast deck had were a debt (`rel-creditor`, `rel-debtor`), and the
 * money-shaped victims drew them far more than their share. These are the
 * ties a street actually has: the fence at the back, the one who got away,
 * the league, the band, the cat, the ladder and the washing line.
 *
 * They are open to every archetype, but only in a tiered case: the untiered
 * case (`generateCase(seed, { difficulty })`) draws exactly what it drew
 * before, byte for byte, so none of these is ever on its menu.
 *
 * Slots as in `cast.ts`: `{victim}`, `{person}`, `{year}`, `{third}`,
 * `{place}`, and `{his form|her form}` resolved for the person.
 */

/** A purpose cell for the three old types, for a tie with nothing to gain. */
const PLAIN_PURPOSES = {
  murder: { 'find-the-killer-police-wont': 40, 'clear-my-name': 34, 'keep-it-quiet': 26 },
  robbery: { 'find-it-before-the-cops': 42, 'clear-my-name': 32, 'keep-it-quiet': 26 },
  missing: { 'bring-them-home': 46, 'clear-my-name': 30, 'keep-it-quiet': 24 },
} as const satisfies Record<'murder' | 'robbery' | 'missing', PurposeWeights>;

export const M14_RELATIONSHIPS: Relationship[] = [
  {
    id: 'rel-fence',
    text: '{V}’s neighbour across the back fence',
    impliesMotives: ['property', 'revenge'],
    backstory: [
      '{person} has lived on the other side of {victim}’s back fence since {year}, and the fence has leaned toward {person}’s side the whole time',
      '{person} and {victim} have talked across the back fence every morning since {year} and agreed about nothing in all that time',
      '{person} planted tomatoes along {victim}’s fence in {year}, and {victim} has been picking them ever since',
    ],
    backstoryFirst: [
      'I have lived on the other side of {victim}’s back fence since {year}. The fence leans my way. It has always leaned my way.',
      '{victim} and I talk across the back fence every morning. Since {year}. We have not agreed about one thing.',
      'I planted tomatoes along {victim}’s fence in {year}. {victim} has been picking them ever since. On {victim}’s side, you understand.',
    ],
    since: ['since {year}', 'every morning for years', 'since the fence went up'],
    purposes: PLAIN_PURPOSES,
  },
  {
    id: 'rel-old-flame',
    text: '{V}’s old flame',
    impliesMotives: ['jealousy', 'revenge', 'exposure'],
    opposeVictimGender: true,
    backstory: [
      '{person} walked out with {victim} for two summers before {year} and still crosses the street to avoid {victim}',
      '{person} was engaged to {victim} in {year} for eleven days, which is a record on this block',
      '{person} and {victim} were sweet on each other before {third} came along, and everybody on the street remembers it but {victim}',
    ],
    backstoryFirst: [
      '{victim} and I walked out together for two summers. That was before {year}. I still cross the street.',
      'I was engaged to {victim} in {year}. For eleven days. People on this block still bring it up.',
      '{victim} and I were sweet on each other before {third} came along. Everybody on the street remembers it. {victim} does not, apparently.',
    ],
    since: ['since {year}', 'two summers, a long time ago', 'since before {third}'],
    purposes: PLAIN_PURPOSES,
  },
  {
    id: 'rel-bowling',
    text: '{V}’s rival in the Thursday bowling league',
    impliesMotives: ['revenge', 'exposure'],
    backstory: [
      '{person} has bowled against {victim} every Thursday since {year} and lost the cup to {victim} by one pin',
      '{person} and {victim} have been the two best bowlers in the Thursday league since {year}, and each says the other cheats',
      '{person} bowled on {victim}’s team until {year}, when {victim} dropped {person} for {third}',
    ],
    backstoryFirst: [
      'I have bowled against {victim} every Thursday since {year}. {victim} took the cup off me by one pin. One.',
      '{victim} and I have been the best two in the Thursday league since {year}. {victim} cheats. Ask anybody but {victim}.',
      'I bowled on {victim}’s team until {year}. Then {victim} dropped me for {third}. {third} cannot bowl.',
    ],
    since: ['since {year}', 'every Thursday for years', 'since the league started'],
    purposes: PLAIN_PURPOSES,
  },
  {
    id: 'rel-chess',
    text: '{V}’s opponent at the chess club',
    impliesMotives: ['revenge', 'exposure'],
    backstory: [
      '{person} has played {victim} at the chess club every Tuesday since {year} and has not won since the spring',
      '{person} and {victim} have one game going at the chess club that has lasted since {year}, and neither will resign',
      '{person} taught {victim} the game in {year}, and {victim} has been beating {person} at it ever since',
    ],
    backstoryFirst: [
      'I play {victim} at the chess club every Tuesday. Since {year}. I have not won since the spring.',
      '{victim} and I have one game going at the club. It has been going since {year}. Neither of us will resign.',
      'I taught {victim} the game in {year}. {victim} has been beating me at it ever since. I taught it too well.',
    ],
    since: ['since {year}', 'every Tuesday for years', 'one game, since {year}'],
    purposes: PLAIN_PURPOSES,
  },
  {
    id: 'rel-band',
    text: 'in the band with {V}',
    impliesMotives: ['revenge', 'jealousy', 'exposure'],
    backstory: [
      '{person} has played second trumpet behind {victim} in the Saturday dance band since {year}, and would like to play first',
      '{person} and {victim} started the dance band together in {year}, and have fallen out over the name of it four times',
      '{person} plays in the band {victim} leads, and was fined a dollar by {victim} for coming in late in {year}, and has not forgotten the dollar',
    ],
    backstoryFirst: [
      'I have played second trumpet behind {victim} in the Saturday band since {year}. I would like to play first. Everybody knows it.',
      '{victim} and I started the band together in {year}. We have fallen out over the name four times. It still has no name.',
      'I play in the band {victim} leads. In {year} {victim} fined me a dollar for coming in late. I still think about the dollar.',
    ],
    since: ['since {year}', 'every Saturday night for years', 'since the band had four players'],
    purposes: PLAIN_PURPOSES,
  },
  {
    id: 'rel-cat-feud',
    text: 'the other side of {V}’s feud about a cat',
    impliesMotives: ['revenge', 'property'],
    backstory: [
      '{person} says {victim}’s cat has been sleeping on {person}’s windowsill since {year}, and {victim} says it is {person}’s windowsill that is the problem',
      '{person} fed a cat that {victim} says is {victim}’s, and the two of them have not spoken since {year} except about the cat',
      '{person} and {victim} both call the same cat by a different name, and it answers to neither',
    ],
    backstoryFirst: [
      '{victim}’s cat has slept on my windowsill since {year}. {victim} says the trouble is my windowsill. It is not my windowsill.',
      'I fed a cat. {victim} says it is {victim}’s cat. We have not spoken since {year}, except about the cat.',
      '{victim} and I call the same cat by different names. It answers to neither of us. That is cats.',
    ],
    since: ['since {year}', 'since the cat', 'three winters, over one cat'],
    purposes: PLAIN_PURPOSES,
  },
  {
    id: 'rel-ladder',
    text: 'the neighbour who borrowed {V}’s ladder',
    impliesMotives: ['property', 'revenge'],
    backstory: [
      '{person} borrowed {victim}’s ladder in {year} to fix a gutter and still has it, and has fixed the gutter twice since',
      '{person} says the ladder was always {person}’s, and {victim} painted a name on it in {year} to prove otherwise',
      '{person} lent the ladder on to {third} in {year}, and {victim} has been asking {person} for it back ever since',
    ],
    backstoryFirst: [
      'I borrowed {victim}’s ladder in {year} to fix a gutter. I still have it. I have fixed the gutter twice since.',
      'That ladder was always mine. {victim} painted a name on it in {year}, and the name was {victim}’s. That proves nothing about ladders.',
      'I lent the ladder on to {third} in {year}. {victim} has been asking me for it back ever since. I have been asking {third}.',
    ],
    since: ['since {year}', 'since the gutter', 'since the ladder went'],
    purposes: PLAIN_PURPOSES,
  },
  {
    id: 'rel-clothesline',
    text: '{V}’s neighbour on the shared clothesline',
    impliesMotives: ['exposure', 'revenge'],
    backstory: [
      '{person} and {victim} have shared one clothesline across the yard since {year}, and argue about whose turn Monday is',
      '{person} has taken {victim}’s washing in off the shared line every time it rained since {year}, and has never once been thanked',
      '{person} knows more about {victim} from the shared clothesline than anybody on the street, and has since {year}',
    ],
    backstoryFirst: [
      '{victim} and I have shared the one line across the yard since {year}. We argue about whose turn Monday is. It is mine.',
      'Every time it has rained since {year} I have taken {victim}’s washing in off the line. Not once a thank you. Not once.',
      'You learn a lot about a person from a shared clothesline. I have been learning about {victim} since {year}.',
    ],
    since: ['since {year}', 'every washday for years', 'since the line went up'],
    purposes: PLAIN_PURPOSES,
  },
];

/**
 * M14 §1.3 — the client of an affair case is married to the one they suspect,
 * or about to be. These two are never drawn off an archetype; the cast gives
 * one to the client of an affair and nobody else.
 */
export const AFFAIR_RELATIONSHIPS: Relationship[] = [
  {
    id: 'rel-wed',
    text: '{V}’s {husband|wife}',
    impliesMotives: ['jealousy', 'insurance', 'inheritance'],
    opposeVictimGender: true,
    backstory: [
      '{person} married {victim} in {year} and never had a reason to wonder until this spring',
      '{person} has been married to {victim} since {year} and still sets two places at supper',
      '{person} married {victim} in {year}, the week after {third} turned {victim} down',
    ],
    backstoryFirst: [
      'I married {victim} in {year}. Until this spring I never had a reason to wonder.',
      'We have been married since {year}. I still set two places at supper. Lately one of them stays set.',
      '{victim} and I married in {year}. The week before, {third} had turned {victim} down. I try not to count that.',
    ],
    since: ['since {year}', 'eleven years this June', 'since the week after the war'],
    purposes: {
      murder: { 'find-the-killer-police-wont': 50, 'clear-my-name': 30, 'keep-it-quiet': 20 },
      robbery: { 'get-it-back': 50, 'keep-it-quiet': 30, 'clear-my-name': 20 },
      missing: { 'bring-them-home': 70, 'keep-it-quiet': 30 },
      affair: { 'tell-me-the-truth': 60, 'put-my-mind-at-rest': 40 },
    },
  },
  {
    id: 'rel-intended',
    text: 'engaged to {V}',
    impliesMotives: ['jealousy', 'inheritance'],
    opposeVictimGender: true,
    backstory: [
      '{person} has been engaged to {victim} since {year}, and the date has been put back twice',
      '{person} got engaged to {victim} last Christmas, in front of {third}, who cried, and not from happiness',
      '{person} is to marry {victim} in June, and has paid for the hall',
    ],
    backstoryFirst: [
      '{victim} and I have been engaged since {year}. The date has been put back twice. Not by me.',
      '{victim} asked me last Christmas, in front of {third}. {third} cried. Not from happiness.',
      'I am to marry {victim} in June. I have paid for the hall. The hall does not give money back.',
    ],
    since: ['since {year}', 'since last Christmas', 'until June'],
    purposes: {
      murder: { 'find-the-killer-police-wont': 50, 'clear-my-name': 30, 'keep-it-quiet': 20 },
      robbery: { 'get-it-back': 40, 'keep-it-quiet': 30, 'clear-my-name': 30 },
      missing: { 'bring-them-home': 70, 'keep-it-quiet': 30 },
      affair: { 'tell-me-the-truth': 55, 'put-my-mind-at-rest': 45 },
    },
  },
];

/** The new ties an archetype may draw in a tiered case, whatever its card says. */
export const M14_TIE_IDS: Id[] = M14_RELATIONSHIPS.map((r) => r.id);

/**
 * The two ties that are a debt. M14 §1.4: at most about fifteen per cent of
 * ties. A tiered case draws a tie by weight, and these weigh a fraction.
 */
export const DEBT_TIE_IDS: Id[] = ['rel-creditor', 'rel-debtor'];

/** How much a tie weighs in a tiered draw. */
export function tieWeight(relId: Id): number {
  if (DEBT_TIE_IDS.includes(relId)) return 0.3;
  if (M14_TIE_IDS.includes(relId)) return 0.3;
  return 1;
}

/**
 * The purpose cells of the three mundane cases, for every relationship that
 * does not write its own. §1.3: find my dog, find my ring, tell me the truth.
 * A pet or an item goes missing on somebody's watch, so `clear-my-name` and
 * `before-they-notice` are true of anybody tied to the owner.
 */
export const MUNDANE_PURPOSES: Record<'lost-pet' | 'lost-item' | 'affair', PurposeWeights> = {
  'lost-pet': { 'find-the-pet': 55, 'clear-my-name': 25, 'before-they-notice': 20 },
  'lost-item': { 'find-the-thing': 42, 'before-they-notice': 30, 'clear-my-name': 28 },
  affair: { 'tell-me-the-truth': 60, 'put-my-mind-at-rest': 40 },
};

/** A relationship's purpose cell for a case type, falling back for the mundane three. */
export function purposesOf(rel: Relationship | undefined, type: CaseType): PurposeWeights | undefined {
  if (!rel) return undefined;
  const own = rel.purposes[type];
  if (own) return own;
  if (type === 'lost-pet' || type === 'lost-item' || type === 'affair') return MUNDANE_PURPOSES[type];
  return undefined;
}
