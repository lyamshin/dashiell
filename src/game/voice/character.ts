/**
 * M11 Part C, the engine's side: archetype character cards, dealt.
 *
 * A character card is true of a type of person and asserts nothing about the
 * case — the look of a bartender going soft, what the street says about a
 * landlady, the line a dentist says about the chair. The golden marks them ◆.
 * They are keyed by the person's role (their archetype, or the door a fixture
 * stands at) and by what they are for:
 *
 *   look    on first sight, after what they are doing
 *   street  on first sight and on page one, how the block sees the type
 *   talk    asked about themselves, a line in their own mouth
 *   victim  asked about themselves, how the type dealt with the victim's type
 *   client  in the client's rundown, how the client names somebody
 *
 * The deck may hold nothing for a role, and then nothing is said: a missing
 * character line is a thinner page, never a wrong one.
 */

import type { Person } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { DECKS, Dealer, fill, tagIs, tagOf, type Card, type Slots } from './cards.js';
import { pronounOf } from './cast.js';
import { isSubjectless, sentencesOf } from '../scene/text.js';

export type CharacterKind = 'look' | 'street' | 'talk' | 'victim' | 'client';

/** The key a person's cards are dealt by: the fixture's door, else the archetype. */
export function characterRole(person: Person): string | null {
  if (person.kind === 'fixture' && person.fixtureRole) return person.fixtureRole;
  if (person.kind === 'suspect' && person.archetypeId) return person.archetypeId;
  return null;
}

/** The slots a card about `person` is filled with. */
export function characterSlots(view: CaseView, person: Person): Slots {
  const she = pronounOf(person) === 'she';
  const place = view.placeById.get(person.foundAt ?? '')?.shortName;
  return {
    name: person.surname,
    He: she ? 'She' : 'He',
    She: she ? 'She' : 'He',
    he: she ? 'she' : 'he',
    she: she ? 'she' : 'he',
    him: she ? 'her' : 'him',
    his: she ? 'her' : 'his',
    victim: view.victim.surname,
    ...(place ? { place } : {}),
  };
}

/**
 * A victim card speaks of the victim with a bare pronoun ("He came round
 * twice a year…"): the writer wrote it for the victim's type, and the type
 * can be either sex. It is not dealt against a victim of the other one.
 */
function victimPronounFits(card: Card, victim: Person): boolean {
  const she = pronounOf(victim) === 'she';
  const text = card.text.replace(/\{[A-Za-z]+\}/g, '');
  const his = /\b(?:He|he|him|his|His|himself)\b/.test(text);
  const hers = /\b(?:She|she|her|Her|herself)\b/.test(text);
  return she ? !his : !hers;
}

/**
 * One card of `kind` for `person`, filled, or null when the deck has none for
 * their role. Spent like any other card, so a reader meets a role's lines in
 * turn across nights.
 */
export function characterLine(
  dealer: Dealer,
  view: CaseView,
  person: Person,
  kind: CharacterKind,
  /** `need`: a line the page must have (a first sight's), even once it has told its joke. */
  opts: { avoid?: readonly string[]; accept?: (text: string) => boolean; need?: boolean } = {},
): { text: string; cardId: string } | null {
  const role = characterRole(person);
  if (role === null) return null;
  const slots = characterSlots(view, person);
  const is = (c: Card): boolean =>
    tagIs('character', c, 'role', role) &&
    tagIs('character', c, 'kind', kind) &&
    !(opts.avoid ?? []).includes(c.id) &&
    // Narration with no subject ("Dressed for an office, she had…" is fine;
    // "Dressed for an office." is not) is what the beat check refuses.
    (kind === 'talk' || kind === 'victim' || kind === 'client' || !sentencesOf(fill(c, slots) ?? c.text).some(isSubjectless)) &&
    (opts.accept === undefined || opts.accept(fill(c, slots) ?? c.text));
  const victimRole = view.victim.archetypeId ?? 'any';
  const ladder =
    kind === 'victim'
      ? [
          (c: Card) => is(c) && tagOf('character', c, 'victimRole') === victimRole && victimPronounFits(c, view.victim),
          (c: Card) => is(c) && (tagOf('character', c, 'victimRole') ?? 'any') === 'any' && victimPronounFits(c, view.victim),
        ]
      : [is];
  const drawn = dealer.draw('character', ladder, slots, true, undefined, opts.need === true);
  if (!drawn) return null;
  return { text: drawn.text, cardId: drawn.cardId };
}

/** Does the deck hold anything of `kind` for this person, without spending it? */
export function hasCharacter(person: Person, kind: CharacterKind): boolean {
  const role = characterRole(person);
  if (role === null) return false;
  return DECK().some((c) => tagIs('character', c, 'role', role) && tagIs('character', c, 'kind', kind));
}

/** A card as the page prints it for a given person, without dealing it (tests). */
export function fillCharacter(view: CaseView, card: Card, person: Person): string | null {
  return fill(card, characterSlots(view, person));
}

/**
 * Does a card say again what the page has just said? Three words running in
 * common, or the arrival's own "came up the stairs": "He took whatever walks
 * up the stairs" as her trade, and then a street line about whatever came up
 * the stairs, is the same image twice in two sentences.
 */
export function echoes(text: string, others: readonly string[]): boolean {
  const words = (t: string): string[] =>
    t
      .toLowerCase()
      .replace(/[^a-z’' ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);
  const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'at', 'he', 'she', 'his', 'her', 'was', 'it', 'i', 'for', 'with', 'that']);
  const grams = (t: string): Set<string> => {
    const w = words(t);
    const out = new Set<string>();
    for (let i = 0; i + 2 < w.length; i++) {
      const g = w.slice(i, i + 3);
      if (g.every((x) => STOP.has(x))) continue;
      out.add(g.join(' '));
    }
    return out;
  };
  if (/\b(?:came|comes|walks|walked) up the stairs\b/i.test(text) && others.some((o) => /\bup the stairs\b/i.test(o))) return true;
  const mine = grams(text);
  return others.some((o) => [...grams(o)].some((g) => mine.has(g)));
}

function DECK(): Card[] {
  return DECKS.character ?? [];
}
