import type { Dossier, DossierCharacter, DossierFact, Id, Mention, Tie, Want } from './types.js';
import { characterFor } from './data/character.js';
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
  /**
   * M10 §A.5: the sex of `{person}`, for a word with two forms. A template
   * writes both, the man's first: `{brother-in-law|sister-in-law}`.
   */
  gender?: 'm' | 'f';
}

/**
 * A word with a man's form and a woman's form, written `{his form|her form}`,
 * resolved for one person. "I am his brother-in-law" said by a woman was the
 * bug: every relation word with two forms carries both, and the person's sex
 * picks. With no sex known the first form stands.
 */
export function genderForms(template: string, gender: 'm' | 'f' | undefined): string {
  return template.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_m, him: string, her: string) =>
    gender === 'f' ? her : him,
  );
}

/** The one substitution everything in this milestone goes through. */
export function fillSlots(template: string, ctx: SlotContext): string {
  return genderForms(template, ctx.gender)
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
  /**
   * M11 §B.1: whose character lines this person gets — their archetype id, or
   * the door a fixture stands at. None for the victim.
   */
  characterKey?: string;
  /**
   * M11 §B.1: a fixture's profession details in its own mouth, one for one
   * with the card's details. A suspect's are `archetype.professionFirst`.
   */
  detailsFirst?: string[];
}

/**
 * M11 §B.2: the variant drawn, or — when somebody else in the case already
 * has it — the next one along that uses `{third}` exactly when the drawn one
 * does. Never a new draw, so nothing after it in the case moves.
 */
export function unusedVariant(templates: readonly string[], drawn: number, used: ReadonlySet<number> | undefined): number {
  if (used === undefined || !used.has(drawn)) return drawn;
  const third = (templates[drawn] ?? '').includes('{third}');
  for (let step = 1; step < templates.length; step++) {
    const i = (drawn + step) % templates.length;
    if (used.has(i)) continue;
    if ((templates[i] ?? '').includes('{third}') !== third) continue;
    return i;
  }
  return drawn;
}

/**
 * A choice made without the case's stream. The dossier's draws are what the
 * case is built on, and a line of character is words: taking another draw
 * for it would move every draw after it, and every case with them. So the
 * character lines are chosen by a hash of who the person is instead.
 */
export function wordHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
  let tieFill: TieFill | undefined;
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
      gender,
      ...(third ? { third: third.name } : {}),
    };
    tie = {
      relationshipId: relationship.id,
      text: fillSlots(relationship.text, ctx),
      backstory: asSentence(fillSlots(backstoryTemplate, ctx)),
      since: fillSlots(rng.pick(relationship.since), ctx),
    };
    tieFill = { relationship, backstory: backstoryIndex, ctx };
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
    gender,
  };
  const professionDetail = fillSlots(detail, slotsForDetail);
  const detailFirstTemplate = archetype.professionFirst?.[detailIndex];
  const professionDetailFirst =
    detailFirstTemplate === undefined ? undefined : fillSlots(detailFirstTemplate, slotsForDetail);
  const professionPrompt =
    detailFirstTemplate === undefined
      ? undefined
      : (PROFESSION_PROMPTS[detailIndex % PROFESSION_PROMPTS.length] as string);

  const role = genderForms(archetype.role, gender);
  const character = characterOf(input, {
    detail: professionDetail,
    detailFirst:
      professionDetailFirst ??
      (input.detailsFirst?.[detailIndex] === undefined
        ? undefined
        : fillSlots(input.detailsFirst[detailIndex] as string, slotsForDetail)),
    slots: slotsForDetail,
  });
  const selfAccount: string[] = [
    `${surname} is ${age} years old and ${role}.`,
    `${surname} ${professionDetail}.`,
    `${surname} is ${tie.text}.`,
  ];

  const layers: DossierFact[] = [
    { kind: 'gender', text: gender === 'f' ? 'A woman.' : 'A man.', layer: 0 },
    { kind: 'age', text: roughAge(age, gender), layer: 0 },
    {
      kind: 'profession',
      text: asSentence(role),
      layer: archetype.visibleProfession ? 0 : 1,
    },
    { kind: 'detail', text: `${surname} ${professionDetail}.`, layer: 1 },
    { kind: 'tie', text: tie.backstory, layer: 2 },
    // M11 §B.2: "wants to keep what they have" of a woman whose sex is known.
    { kind: 'want', text: `${surname} ${genderForms(WANT_TEXT[want], gender)}.`, layer: 2 },
  ];
  if (tie.since) {
    layers.push({ kind: 'since', text: `${surname} has been ${tie.text}, ${tie.since}.`, layer: 2 });
  }
  if (third) layers.push({ kind: 'third', text: third.text, layer: 2 });
  if (input.secretHint) layers.push({ kind: 'secret-hint', text: input.secretHint, layer: 3 });

  const dossier: Dossier = {
    age,
    gender,
    profession: {
      role,
      detail: professionDetail,
      ...(professionDetailFirst === undefined ? {} : { detailFirst: professionDetailFirst }),
      ...(professionPrompt === undefined ? {} : { prompt: professionPrompt }),
    },
    want,
    tie,
    selfAccount,
    layers,
    ...(character ? { character } : {}),
  };
  if (tieFill) TIE_FILLS.set(dossier, tieFill);
  return dossier;
}

/** What a tie sentence was filled from, so the cast can deal it again (§B.2). */
interface TieFill {
  relationship: Relationship;
  backstory: number;
  ctx: SlotContext;
}

const TIE_FILLS = new WeakMap<Dossier, TieFill>();

/**
 * M11 §B.2: no two people in one case say the same tie sentence.
 *
 * Two tenants said "has rented from Sweeney since '22 and has the same window
 * and the same complaint", word for word but for the year. Here, once every
 * suspect has a dossier, a backstory somebody earlier in the case already has
 * is dealt again as the next variant that names a third party exactly when
 * the drawn one did — so the draw that invented that third party still
 * stands — and the same for the "since". The client keeps theirs, because
 * the client's is said on page one and a sentence there is part of the
 * briefing's shape. No draw is taken: the case's stream is untouched, and
 * only words change.
 */
export function varyTies(dossiers: readonly { dossier: Dossier; surname: string; keep: boolean }[]): void {
  const used = new Map<string, Set<number>>();
  const mark = (key: string, i: number): void => {
    const set = used.get(key) ?? new Set<number>();
    set.add(i);
    used.set(key, set);
  };
  const ordered = [...dossiers.filter((d) => d.keep), ...dossiers.filter((d) => !d.keep)];
  for (const { dossier, surname, keep } of ordered) {
    const fill = TIE_FILLS.get(dossier);
    if (!fill) continue;
    const rel = fill.relationship;
    const bKey = `${rel.id}|b`;
    const sKey = `${rel.id}|s`;
    const sinceAt = rel.since.findIndex((x) => fillSlots(x, fill.ctx) === dossier.tie.since);
    const b = keep ? fill.backstory : unusedVariant(rel.backstory, fill.backstory, used.get(bKey));
    const sinceIndex = keep || sinceAt < 0 ? sinceAt : unusedVariant(rel.since, sinceAt, used.get(sKey));
    mark(bKey, b);
    if (sinceIndex >= 0) mark(sKey, sinceIndex);
    if (b !== fill.backstory) {
      const oldText = dossier.tie.backstory;
      dossier.tie.backstory = asSentence(fillSlots(rel.backstory[b] as string, fill.ctx));
      const first = rel.backstoryFirst[b];
      if (first !== undefined) dossier.tie.backstoryFirst = asSentence(fillSlots(first, fill.ctx));
      for (const f of dossier.layers) if (f.kind === 'tie' && f.text === oldText) f.text = dossier.tie.backstory;
    }
    if (sinceIndex >= 0 && sinceIndex !== sinceAt) {
      const oldSince = dossier.tie.since;
      dossier.tie.since = fillSlots(rel.since[sinceIndex] as string, fill.ctx);
      for (const f of dossier.layers) {
        if (f.kind === 'since' && oldSince !== undefined) f.text = f.text.replace(oldSince, dossier.tie.since);
      }
    }
    void surname;
  }
}

/**
 * M11 §B.1: the dossier's character — the drawn detail first, then the
 * type's own details, a history, and a talk register — or nothing for a
 * person whose type has no lines (the victim).
 */
function characterOf(
  input: DossierInput,
  drawn: { detail: string; detailFirst: string | undefined; slots: SlotContext },
): DossierCharacter | undefined {
  const key = input.characterKey;
  const card = key === undefined ? undefined : characterFor(key);
  if (!card) return undefined;
  const { surname } = input;
  const fill = (t: string): string => fillSlots(t, drawn.slots).replace(/\s+/g, ' ').trim();
  const sentence = (predicate: string): string => asSentence(`${surname} ${fill(predicate)}`);
  const said = (t: string): string => asSentence(fill(t));
  const history = card.history[wordHash(`${surname}|${key}|history`) % card.history.length] as {
    text: string;
    first: string;
  };
  return {
    details: [
      {
        text: asSentence(`${surname} ${drawn.detail}`),
        first: drawn.detailFirst === undefined ? asSentence(`${surname} ${drawn.detail}`) : said(drawn.detailFirst),
        layer: 1,
      },
      ...card.details.map((d) => ({ text: sentence(d.text), first: said(d.first), layer: d.layer })),
    ],
    history: { text: sentence(history.text), first: said(history.first) },
    talk: card.talk,
  };
}

/** The relationship card for a person, or null when there is none. */
export function relationshipOf(relationshipId: Id | undefined): Relationship | null {
  if (relationshipId === undefined) return null;
  return RELATIONSHIP_BY_ID[relationshipId] ?? null;
}
