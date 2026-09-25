/**
 * Night Hone 1 — the few lines the scene writes in code rather than deals,
 * and the plain-words tables the realizer reads.
 *
 * None of these prints an hour or a name of its own: every name and hour in
 * them comes from a slot the engine fills from the case.
 */

import type { Case, Id } from '../../gen/types.js';
import { tieWordsFor } from '../../gen/data/tie-words.js';

/**
 * A search of one thing, the golden's way: go to it, look at it properly,
 * then at what is around it. {object} is the thing with "the" on it.
 */
export const SEARCH_THING_ACTS: string[] = [
  'I started with {object}. I looked it over, and then at where it stood and what was around it.',
  'I went to {object} first and gave it a proper look, then the space around it.',
  'I took my time over {object}, front and back, and then looked at the place it had been kept.',
];

/**
 * A relation to the victim said in plain words, as a sentence about the
 * person: "Hochstetter rented from Grasso." Keyed by the relationship card
 * (`src/gen/data/cast.ts`); {V} is the victim's surname. Used where a
 * sentence already has somebody's relation set off in commas, so that no
 * sentence stacks two ("Hochstetter, Grasso's tenant, would know about
 * Dandridge, Grasso's business partner").
 */
export const RELATION_PLAIN: Record<Id, string> = {
  'rel-partner': 'was in business with {V}',
  'rel-tenant': 'rented from {V}',
  'rel-landlord': 'collected {V}’s rent',
  'rel-employee': 'used to work for {V}',
  'rel-creditor': 'had lent {V} money',
  'rel-debtor': 'owed {V} money',
  'rel-lawyer': 'did {V}’s legal work',
  'rel-cousin': 'was {V}’s cousin',
  'rel-inlaw': 'had married into {V}’s family',
  'rel-rival': 'competed with {V} for the same customers',
  'rel-spouse': 'was married to {V} and living apart',
  'rel-nurse': 'nursed {V} at home',
  'rel-secretary': 'kept {V}’s appointments',
  'rel-engaged': 'was engaged to {V}’s daughter',
  'rel-childhood': 'had grown up on the same block as {V}',
  'rel-willed': 'was named in {V}’s will',
  'rel-witness': 'was going to testify against the people {V} worked for',
  'rel-customer': 'did business with {V}',
  'rel-neighbor': 'lived across the airshaft from {V}',
  // M14: the ties beyond money.
  'rel-fence': 'lived over the backyard fence from {V}',
  'rel-old-flame': 'used to walk out with {V}',
  'rel-bowling': 'bowled against {V} on Thursdays',
  'rel-chess': 'played chess with {V} on Tuesdays',
  'rel-band': 'played in the band with {V}',
  'rel-cat-feud': 'had been feuding with {V} over a cat',
  'rel-ladder': 'had borrowed {V}’s ladder and kept it',
  'rel-clothesline': 'shared a washing line with {V}',
  'rel-wed': 'was married to {V}',
  'rel-intended': 'was engaged to {V}',
};

/**
 * Why somebody in this relation to the victim is worth a question, as a thing
 * anybody knows (golden page 3: "A man in Sweeney's line keeps a secretary,
 * and a secretary knows who has an appointment"). No names, no hours: it says
 * what the relation is good for, and the bridge says the rest.
 */
export const RELATION_WHY: Record<Id, string> = {
  'rel-partner': 'A partner knows where the money goes.',
  'rel-tenant': 'A tenant hears who comes and goes on the stairs.',
  'rel-landlord': 'A landlord knows when the rent is late, and why.',
  'rel-employee': 'People who have been let go remember why.',
  'rel-creditor': 'People who are owed money keep track of the people who owe it.',
  'rel-debtor': 'A debt is a reason to come calling.',
  'rel-lawyer': 'A lawyer knows who stands to gain.',
  'rel-cousin': 'Family knows things the neighbours don’t.',
  'rel-inlaw': 'Family by marriage knows things the neighbours don’t.',
  'rel-rival': 'A rival keeps a close eye on the competition.',
  'rel-spouse': 'A spouse who has moved out still knows the old habits.',
  'rel-nurse': 'A private nurse knows who visits the sickroom.',
  'rel-secretary': 'A secretary knows who has an appointment.',
  'rel-engaged': 'Somebody marrying into a family learns its business fast.',
  'rel-childhood': 'Somebody from the same block knows the old stories.',
  'rel-willed': 'Being named in a will is a reason to take an interest.',
  'rel-witness': 'A witness against dangerous people has reason to be careful.',
  'rel-customer': 'A regular customer knows the hours and the habits.',
  'rel-neighbor': 'A neighbour across the airshaft hears most of what goes on.',
  // M14.
  'rel-fence': 'A neighbour over the backyard fence sees who uses the back way.',
  'rel-old-flame': 'An old flame keeps track, whatever they tell you.',
  'rel-bowling': 'A rival in the league knows where the other one is on a Thursday.',
  'rel-chess': 'A chess partner knows how the other one thinks, and when.',
  'rel-band': 'A band plays the same halls on the same nights, and notices who is missing.',
  'rel-cat-feud': 'A feud over a cat is carried on from a windowsill, which is a good place to watch from.',
  'rel-ladder': 'Somebody who owes you a ladder keeps an eye on your windows.',
  'rel-clothesline': 'A shared washing line means knowing everybody’s business by Monday.',
  'rel-wed': 'A husband or a wife knows the habits, and the stories told about them.',
  'rel-intended': 'Somebody engaged to be married keeps a close eye on the other party.',
};

/**
 * The world-coherence pass: a relation said in the owner's words, where the
 * card's own do not fit the owner (`gen/data/tie-words.ts`): a "customer" of
 * a theatrical agent "was on Tramonti's books". A tiered case only; the
 * untiered case says what it always said.
 */
function wordsOf(kase: Case, relId: Id) {
  if (kase.shape === undefined) return undefined;
  const owner = kase.people.find((p) => p.kind === 'victim')?.archetypeId;
  if (owner === undefined) return undefined;
  return tieWordsFor(relId, owner, kase.places.find((p) => p.isResidence)?.id);
}

/** `RELATION_PLAIN` for this case's owner. */
export function relationPlain(kase: Case, relId: Id | undefined): string | undefined {
  if (relId === undefined) return undefined;
  return wordsOf(kase, relId)?.plain ?? RELATION_PLAIN[relId];
}

/** `RELATION_WHY` for this case's owner. */
export function relationWhy(kase: Case, relId: Id | undefined): string | undefined {
  if (relId === undefined) return undefined;
  return wordsOf(kase, relId)?.why ?? RELATION_WHY[relId];
}


/** Two to five, said. */
export const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

/**
 * Places with no roof over them, or none worth the name. A card that sends the
 * detective into "the room" is not dealt here (`setting: indoor`), and one
 * written for the open air is not dealt anywhere else.
 */
export const OUTDOOR_PLACES: ReadonlySet<Id> = new Set([
  'rooftop',
  'back-alley',
  'pier-shed',
  'laundry-yard',
  'corner-newsstand',
  'cab-stand',
  'el-platform',
  'square-benches',
  'ferry-slip',
  'subway-kiosk',
]);

/** Place short names that take a plural verb ("the benches were"). */
export function isPluralPlace(shortName: string): boolean {
  return /^the [a-z ]*(?:benches|stairs|steps|docks|stables|rooms|flats|arches|gardens)$/i.test(shortName);
}

/** Golden page 5: "I sat down across from her." Somebody not yet spoken to this visit. */
export const APPROACH: string[] = ['I went over to {name}.', 'I sat down across from {name}.', 'I found {name} and pulled up a chair.'];

/** Somebody already spoken to this visit, asked again. */
export const APPROACH_AGAIN: string[] = ['I turned back to {name}.', 'I had another question for {name}.', 'I wasn’t finished with {name}.'];

/**
 * Shorter nights §1: the second fact, put in the same breath as the first.
 * The detective's own line, before he says what the fact is.
 */
export const FOLLOW_ON: string[] = [
  'I didn’t give {name} long with it. “There’s something else,” I said.',
  'I let that sit, and then I turned the page. “And there’s this,” I said.',
  'I didn’t close the notebook. “I’m not done,” I said.',
  '“That’s one thing,” I said. I had another.',
];

/** Playtest round 2: a walk that found the one to ask, and nothing asked yet. */
const ASK_HERE_NAMED = [
  '{name} had sent me to the right door. The one I wanted was here.',
  'The one I had come to ask was here, where {name} had said.',
  'I had come on {name}’s word, and the one I wanted was here to be asked.',
];
const ASK_HERE = ['The one I had come to ask was here.', 'The one I wanted was here to be asked.'];

/** The answer beat's line when the walk found the person to ask, not yet the answer. */
export function askHereLine(name: string | undefined, salt: number): string {
  const lines = name ? ASK_HERE_NAMED : ASK_HERE;
  return (lines[Math.abs(salt) % lines.length] as string).split('{name}').join(name ?? '');
}
