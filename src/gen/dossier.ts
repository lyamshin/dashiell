import type { Dossier, DossierFact, Id, Mention, Tie, Want } from './types.js';
import { surnameOf } from './types.js';
import {
  BACKSTORY_YEARS,
  MENTION_ROLE_BY_ID,
  MENTION_ROLES,
  PROFESSION_PROMPTS,
  RELATIONSHIP_BY_ID,
  WANT_TEXT,
  type Relationship,
} from './data/cast.js';
import type { Rng } from './rng.js';

/**
 * Dossiers. M5 §1.
 *
 * Before M5 a suspect was a name, a role, an alibi and a secret. "Tramonti was
 * jealous of the victim" — of what? who was the victim? The dossier is the
 * answer: an age, a gender, a profession with a detail in it, a want that is
 * not the crime's motive, and a tie to the victim with a specific attached.
 *
 * Every fact carries the layer it can be learned at, because the engine deals
 * them out by layer: what shows on sight, what a person volunteers about
 * themselves, what other people say about them, and what the documents prove.
 */

export type Namer = (gender?: 'male' | 'female') => { name: string; gender: 'm' | 'f' };

export interface MentionPool {
  mentions: Mention[];
  /** Create-or-return the third party for a role. Same role, same person. */
  mentionFor: (roleId: Id) => Mention;
  /** A role nobody has used yet, or any role if they all have. */
  freeRole: (rng: Rng) => Id;
}

export function createMentionPool(name: Namer): MentionPool {
  const mentions: Mention[] = [];
  const byRole = new Map<Id, Mention>();
  const mentionFor = (roleId: Id): Mention => {
    const already = byRole.get(roleId);
    if (already) return already;
    const role = MENTION_ROLE_BY_ID[roleId];
    if (!role) throw new Error(`no such mention role: ${roleId}`);
    const drawn = name(role.gender === 'f' ? 'female' : 'male');
    const mention: Mention = {
      id: `m-${mentions.length + 1}`,
      name: drawn.name,
      surname: surnameOf(drawn.name),
      gender: role.gender,
      role: role.role,
      text: `${drawn.name} is ${role.role}.`,
    };
    mentions.push(mention);
    byRole.set(roleId, mention);
    return mention;
  };
  return {
    mentions,
    mentionFor,
    freeRole: (rng: Rng): Id => {
      const unused = MENTION_ROLES.filter((r) => !byRole.has(r.id));
      return (unused.length > 0 ? rng.pick(unused) : rng.pick(MENTION_ROLES)).id;
    },
  };
}

/** How old somebody looks, which is all layer 0 gets. */
export function roughAge(age: number, gender: 'm' | 'f'): string {
  const their = gender === 'f' ? 'her' : 'his';
  if (age < 25) return 'Not much past twenty.';
  if (age < 30) return 'In the late twenties.';
  if (age < 40) return `In ${their} thirties.`;
  if (age < 50) return `In ${their} forties.`;
  if (age < 60) return `In ${their} fifties.`;
  if (age < 70) return `In ${their} sixties.`;
  return 'Past seventy.';
}

/** "a longshoreman" -> "A longshoreman." */
function asSentence(text: string): string {
  const trimmed = text.trim();
  const capped = `${(trimmed[0] ?? '').toUpperCase()}${trimmed.slice(1)}`;
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

export interface SlotContext {
  victim: string;
  person: string;
  place: string;
  year: string;
  third?: string;
  object?: string;
}

/** The one substitution everything in this milestone goes through. */
export function fillSlots(template: string, ctx: SlotContext): string {
  return template
    .split('{victim}').join(ctx.victim)
    .split('{person}').join(ctx.person)
    .split('{place}').join(ctx.place)
    .split('{year}').join(ctx.year)
    .split('{third}').join(ctx.third ?? 'somebody')
    .split('{V}').join(ctx.victim)
    .split('{P}').join(ctx.person)
    .split('{L}').join(ctx.place)
    .split('{O}').join(ctx.object ?? 'somebody');
}

/**
 * The shape a dossier needs out of a card. Suspect archetypes, the victim's
 * archetype and the fixture cards all satisfy it.
 */
export interface DossierArchetype {
  role: string;
  ageBand: [number, number];
  professionDetails: string[];
  /**
   * Hone 2 §Track B. The same details in the person's own mouth, one for one
   * with `professionDetails`. Optional here because the victim's card and the
   * fixture cards have none: the victim is past saying anything, and a fixture
   * is somebody Dashiell goes to rather than somebody who comes up the stairs.
   */
  professionFirst?: string[];
  wants: Want[];
  visibleProfession: boolean;
}

export interface DossierInput {
  rng: Rng;
  surname: string;
  gender: 'm' | 'f';
  archetype: DossierArchetype;
  /** The relationship card, or null for the victim and the fixtures. */
  relationship: Relationship | null;
  /** Used when there is no relationship card. */
  fallbackTie?: { text: string; backstory: string };
  victimSurname: string;
  /** A short name from the drawn deck, for the `{place}` slot. */
  placeName: string;
  mentions: MentionPool;
  /** One hint at what this person is hiding, already rendered. */
  secretHint?: string;
}

export function buildDossier(input: DossierInput): Dossier {
  const { rng, archetype, relationship, surname, gender, victimSurname, placeName } = input;
  const [minAge, maxAge] = archetype.ageBand;
  const age = rng.range(minAge, maxAge);
  // Picked by index rather than by value, because the first-person form and
  // the question that asks for it are one for one with the third-person one
  // and the three have to stay together. Same single draw as `rng.pick`.
  const detailIndex = rng.int(archetype.professionDetails.length);
  const detail = archetype.professionDetails[detailIndex] as string;
  const want = rng.pick(archetype.wants) as Want;
  const year = rng.pick(BACKSTORY_YEARS);

  let third: Mention | undefined;
  let tie: Tie;
  if (relationship) {
    // The card is picked by index, because the first-person variants are one
    // for one with the third-person ones and the pair has to stay together.
    const backstoryIndex = rng.int(relationship.backstory.length);
    const backstoryTemplate = relationship.backstory[backstoryIndex] as string;
    const backstoryFirstTemplate = relationship.backstoryFirst[backstoryIndex];
    if (backstoryTemplate.includes('{third}')) {
      third = input.mentions.mentionFor(input.mentions.freeRole(rng));
    }
    const ctx: SlotContext = {
      victim: victimSurname,
      person: surname,
      place: placeName,
      year,
      ...(third ? { third: third.name } : {}),
    };
    tie = {
      relationshipId: relationship.id,
      text: fillSlots(relationship.text, ctx),
      backstory: asSentence(fillSlots(backstoryTemplate, ctx)),
      since: fillSlots(rng.pick(relationship.since), ctx),
    };
    if (backstoryFirstTemplate !== undefined) {
      tie.backstoryFirst = asSentence(fillSlots(backstoryFirstTemplate, ctx));
    }
    if (third) tie.third = third.id;
  } else {
    // The victim and the fixtures have no relationship card, so the caller
    // supplies the tie: the victim's is their standing, a fixture's is the
    // door they stand in.
    tie = {
      relationshipId: 'rel-none',
      text: input.fallbackTie?.text ?? 'known to everybody on the block',
      backstory:
        input.fallbackTie?.backstory ?? `${surname} is known to everybody on the block.`,
    };
  }

  const slotsForDetail: SlotContext = {
    victim: victimSurname,
    person: surname,
    place: placeName,
    year,
  };
  const professionDetail = fillSlots(detail, slotsForDetail);
  const detailFirstTemplate = archetype.professionFirst?.[detailIndex];
  const professionDetailFirst =
    detailFirstTemplate === undefined ? undefined : fillSlots(detailFirstTemplate, slotsForDetail);
  const professionPrompt =
    detailFirstTemplate === undefined
      ? undefined
      : (PROFESSION_PROMPTS[detailIndex % PROFESSION_PROMPTS.length] as string);

  const selfAccount: string[] = [
    `${surname} is ${age} years old and ${archetype.role}.`,
    `${surname} ${professionDetail}.`,
    `${surname} is ${tie.text}.`,
  ];

  const layers: DossierFact[] = [
    { kind: 'gender', text: gender === 'f' ? 'A woman.' : 'A man.', layer: 0 },
    { kind: 'age', text: roughAge(age, gender), layer: 0 },
    {
      kind: 'profession',
      text: asSentence(archetype.role),
      layer: archetype.visibleProfession ? 0 : 1,
    },
    { kind: 'detail', text: `${surname} ${professionDetail}.`, layer: 1 },
    { kind: 'tie', text: tie.backstory, layer: 2 },
    { kind: 'want', text: `${surname} ${WANT_TEXT[want]}.`, layer: 2 },
  ];
  if (tie.since) {
    layers.push({ kind: 'since', text: `${surname} has been ${tie.text}, ${tie.since}.`, layer: 2 });
  }
  if (third) layers.push({ kind: 'third', text: third.text, layer: 2 });
  if (input.secretHint) layers.push({ kind: 'secret-hint', text: input.secretHint, layer: 3 });

  return {
    age,
    gender,
    profession: {
      role: archetype.role,
      detail: professionDetail,
      ...(professionDetailFirst === undefined ? {} : { detailFirst: professionDetailFirst }),
      ...(professionPrompt === undefined ? {} : { prompt: professionPrompt }),
    },
    want,
    tie,
    selfAccount,
    layers,
  };
}

/** The relationship card for a person, or null when there is none. */
export function relationshipOf(relationshipId: Id | undefined): Relationship | null {
  if (relationshipId === undefined) return null;
  return RELATIONSHIP_BY_ID[relationshipId] ?? null;
}
