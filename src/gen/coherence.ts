import { isMundane, type Case, type Id, type PetKind } from './types.js';
import { RELATIONSHIP_BY_ID, VICTIM_ARCHETYPE_BY_ID } from './data/cast.js';
import { relationshipFor, tieWordsFor } from './data/tie-words.js';

/**
 * The world-coherence pass: the solved world has to make sense before any of
 * it is said. The designer, reading a lost-item case: "why would he keep a
 * gold watch at the benches; what did he buy from the victim — very odd."
 *
 * Four things are checked here, and the same tables are what the generator
 * deals from, so a case is coherent by construction and this module only has
 * to confirm it:
 *
 * 1. **Where a thing is kept, or a pet lives,** is the owner's own place: the
 *    residence, which is the only drawn place that is theirs. Never a public
 *    bench, a kiosk or a pier. A goat needs a yard.
 * 2. **A tie follows the owner's trade and address.** Nobody is a customer of
 *    a buildings inspector, a partner in an heiress's business, or the
 *    neighbour over a backyard fence of somebody in a hotel suite.
 * 3. **The owner's standing line fits the case.** A cat's owner is not
 *    introduced as the keeper of a file of what was never printed.
 *
 * Everything here is the owner's: the "victim" of a lost pet or item is the
 * owner, and of an affair the one it is about.
 */

/* --------------------------------------------------------------- the owners */

/** What an owner has that a tie can lean on. */
export type OwnerHas =
  /** A business somebody could be a partner in. */
  | 'business'
  /** Something to sell that a customer could buy. */
  | 'sells'
  /** Rents from somebody: a landlord of their own. */
  | 'rents'
  /** Works for people a witness could testify against. */
  | 'works-for-people'
  /** Is, or could be, married: not between marriages. */
  | 'married';

/**
 * What each victim archetype has. A tie that needs something the owner does
 * not have is never dealt to them (`TIE_NEEDS`). Only the plain absurdities
 * are barred: anybody can have let a room, kept a clerk or owed money, and
 * the golden's buildings inspector did all three.
 */
export const OWNER_HAS: Record<Id, OwnerHas[]> = {
  // Owns the houses: a landlord three months behind on the rent is a joke
  // nobody meant.
  'vic-landlord': ['business', 'married'],
  'vic-bootlegger': ['business', 'sells', 'rents', 'works-for-people', 'married'],
  // Between marriages, with no business but spending and no employer at all.
  'vic-heiress': ['rents'],
  // An agent's people are clients, not customers, and the agent is the boss.
  'vic-agent': ['business', 'rents', 'married'],
  // A city man: no business of his own and nothing to sell, but a machine
  // to work for.
  'vic-inspector': ['rents', 'works-for-people', 'married'],
  'vic-union-treasurer': ['rents', 'works-for-people', 'married'],
  'vic-pawnbroker': ['business', 'sells', 'rents', 'married'],
  // The paper is not "the people she worked for" in the grand-jury sense.
  'vic-columnist': ['rents', 'married'],
  // Stands bail for the ward, and nobody buys anything from a bondsman.
  'vic-bondsman': ['business', 'rents', 'works-for-people', 'married'],
  'vic-wholesaler': ['business', 'sells', 'rents', 'married'],
};

/** What a tie needs of the owner. A tie not listed needs nothing. */
export const TIE_NEEDS: Record<Id, OwnerHas> = {
  'rel-partner': 'business',
  'rel-customer': 'sells',
  'rel-landlord': 'rents',
  'rel-witness': 'works-for-people',
  'rel-spouse': 'married',
  'rel-wed': 'married',
};

/**
 * Who can be a customer of whom, where the trade sells to the trade. A cloth
 * wholesaler sold to tailors and dressmakers, not to the block.
 */
export const CUSTOMERS_OF: Record<Id, Id[]> = {
  'vic-wholesaler': ['arch-tailor', 'arch-seamstress'],
};

/* ------------------------------------------------------------ the addresses */

/** What an address has that a tie or a pet can lean on. */
export type HomeHas = 'yard' | 'washing-line' | 'airshaft';

/** The five residences, and what each of them has out the back. */
export const HOME_HAS: Record<Id, HomeHas[]> = {
  'res-apartment': ['washing-line', 'airshaft'],
  'res-brownstone': ['yard', 'washing-line', 'airshaft'],
  'res-walkup': ['washing-line', 'airshaft'],
  // A suite at a residential hotel has a light well and a night desk, and
  // no yard or washing line at all.
  'res-suite': ['airshaft'],
  // A house of its own on the back lot: a yard, and nobody across a shaft.
  'res-backhouse': ['yard', 'washing-line'],
};

/** What a tie needs of the owner's address. */
export const TIE_HOME_NEEDS: Record<Id, HomeHas> = {
  'rel-fence': 'yard',
  'rel-ladder': 'yard',
  'rel-clothesline': 'washing-line',
  'rel-neighbor': 'airshaft',
};

/** What an animal needs of the address it lives at. */
export const PET_HOME_NEEDS: Partial<Record<PetKind, HomeHas>> = {
  goat: 'yard',
};

/* ------------------------------------------------------------- the checks */

/** Whether a tie fits the owner's trade (and, selling to the trade, the one who took it). */
export function tradeFits(relId: Id, ownerArchetypeId: Id, suspectArchetypeId?: Id): boolean {
  const need = TIE_NEEDS[relId];
  if (need !== undefined && !(OWNER_HAS[ownerArchetypeId] ?? []).includes(need)) return false;
  if (relId === 'rel-customer' && suspectArchetypeId !== undefined) {
    const only = CUSTOMERS_OF[ownerArchetypeId];
    if (only !== undefined && !only.includes(suspectArchetypeId)) return false;
  }
  return true;
}

/** Whether a tie fits the owner's address. */
export function homeFits(relId: Id, residenceId?: Id): boolean {
  const need = TIE_HOME_NEEDS[relId];
  return need === undefined || residenceId === undefined || (HOME_HAS[residenceId] ?? []).includes(need);
}

/**
 * Whether a tie fits its owner as the card says it: the owner's trade, the
 * owner's address, and, for a trade that sells to the trade, the one who took
 * it. A case the mix deals new draws only these.
 */
export function tieFits(relId: Id, ownerArchetypeId: Id, residenceId?: Id, suspectArchetypeId?: Id): boolean {
  return tradeFits(relId, ownerArchetypeId, suspectArchetypeId) && homeFits(relId, residenceId);
}

/** Whether an animal can live at an address. */
export function petFits(pet: PetKind, residenceId: Id): boolean {
  const need = PET_HOME_NEEDS[pet];
  return need === undefined || (HOME_HAS[residenceId] ?? []).includes(need);
}

/**
 * The standing lines a case type draws from: the old three read the card's
 * `standing`, the mundane three its `standingMundane`.
 */
export function standingsFor(ownerArchetypeId: Id, type: Case['act']['type']): string[] {
  const card = VICTIM_ARCHETYPE_BY_ID[ownerArchetypeId];
  if (!card) return [];
  return isMundane(type) ? card.standingMundane : card.standing;
}

/** A template as a pattern: slots match anything, `{a|b}` either form. */
function templatePattern(template: string): RegExp {
  let out = '';
  for (const part of template.split(/(\{[^}]*\})/)) {
    if (part.startsWith('{') && part.endsWith('}')) {
      const inner = part.slice(1, -1);
      out += inner.includes('|')
        ? `(?:${inner.split('|').map(escape).join('|')})`
        : '.+?';
    } else out += escape(part);
  }
  return new RegExp(`^${out}\\.?$`);
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether `text` is one of `templates`, filled. */
export function fromTemplates(text: string, templates: string[], prefix = ''): boolean {
  return templates.some((t) => templatePattern(`${prefix}${t}`).test(text));
}

export type CoherenceRule = 'tie-trade' | 'tie-home' | 'tie-words' | 'keeping-place' | 'pet-home' | 'standing';

export interface CoherenceFlag {
  rule: CoherenceRule;
  /** Who or what it is about: a person id, a place id. */
  subject: Id;
  detail: string;
}

/**
 * Every place in a case where the solved world does not hang together. An
 * empty list is a coherent case. For the tests and the read-throughs; the
 * generator deals from the same tables and never needs to call it.
 */
export function coherenceFlags(c: Omit<Case, 'deduction'>): CoherenceFlag[] {
  const flags: CoherenceFlag[] = [];
  const victim = c.people.find((p) => p.kind === 'victim');
  if (!victim) return flags;
  const owner = victim.archetypeId as Id;
  const residence = c.places.find((p) => p.isResidence)?.id;
  const type = c.act.type;

  /* 1. Where it is kept, or where it lives. */
  if (type === 'lost-item' || type === 'lost-pet') {
    if (c.act.place !== residence) {
      flags.push({
        rule: 'keeping-place',
        subject: c.act.place,
        detail: `${type}: ${c.act.taken?.name ?? 'it'} is kept at ${c.act.place}, which is not ${victim.surname}’s`,
      });
    }
  }
  // An inside job anywhere but a room of the owner's is the owner's locker
  // there, and says so; it never calls a ferry slip the owner's.
  const saysTheirs = c.act.givens.text.some((t) => /, which is [^.]*’s\.$/.test(t));
  if (type === 'robbery' && c.act.tropeId === 'inside-job' && c.act.place !== residence && !OWNABLE_ROOMS.includes(c.act.place) && saysTheirs) {
    flags.push({
      rule: 'keeping-place',
      subject: c.act.place,
      detail: `inside job: ${c.act.taken?.name ?? 'it'} is taken from ${c.act.place}, "which is ${victim.surname}’s"`,
    });
  }
  if (type === 'lost-pet' && c.act.pet !== undefined && residence !== undefined && !petFits(c.act.pet, residence)) {
    flags.push({ rule: 'pet-home', subject: residence, detail: `a ${c.act.pet} living at ${residence}` });
  }

  /* 2. The ties: drawn to fit, or said in words that fit (`data/tie-words.ts`). */
  for (const p of c.people) {
    const rel = p.relationshipId;
    if (p.kind !== 'suspect' || rel === undefined) continue;
    const words = tieWordsFor(rel, owner, residence);
    if (!tradeFits(rel, owner, p.archetypeId) && !tieWordsFor(rel, owner)) {
      flags.push({ rule: 'tie-trade', subject: p.id, detail: `${rel} to ${owner} (${p.archetypeId})` });
    }
    if (!homeFits(rel, residence) && !(residence !== undefined && homeWords(rel, residence))) {
      flags.push({ rule: 'tie-home', subject: p.id, detail: `${rel} to somebody living at ${residence}` });
    }
    // Where the owner has words for the tie, the dossier says them.
    const card = RELATIONSHIP_BY_ID[rel];
    const tie = p.dossier?.tie;
    if (words && card && tie) {
      const said = relationshipFor(card, owner, residence);
      const third = [...said.backstory, ...(said.backstoryAlt ?? []).flatMap((a) => (a ? [a[0]] : []))];
      const first = [...said.backstoryFirst, ...(said.backstoryAlt ?? []).flatMap((a) => (a ? [a[1]] : []))];
      const wrong =
        (words.text !== undefined && !fromTemplates(tie.text, [said.text])) ||
        !fromTemplates(tie.backstory, third) ||
        (tie.backstoryFirst !== undefined && !fromTemplates(tie.backstoryFirst, first));
      if (wrong) flags.push({ rule: 'tie-words', subject: p.id, detail: `${rel} to ${owner}: "${tie.text}", "${tie.backstoryFirst ?? tie.backstory}"` });
    }
  }

  /* 3. The owner's standing. */
  const standings = standingsFor(owner, type);
  if (!fromTemplates(c.victimBio.standing, standings, `${victim.surname} `)) {
    flags.push({ rule: 'standing', subject: victim.id, detail: `${type}: "${c.victimBio.standing}"` });
  }
  return flags;
}

/**
 * Rooms that are not the residence but can still be somebody's own: the
 * office over the tailor's shop is an office, and an office is a tenant's.
 */
export const OWNABLE_ROOMS: Id[] = ['office-over-tailor'];

/** Whether the owner's address has words for a tie its card cannot carry there. */
function homeWords(relId: Id, residenceId: Id): boolean {
  return tieWordsFor(relId, '', residenceId) !== undefined;
}
