import type { Fact, Id, PetKind } from '../types.js';
import { PET_WORD } from '../data/mundane.js';
import { between, elsewhere, essential, stealable, twoSources, type ShapeContext, type Trope, type TropeContext } from './kit.js';

/**
 * M14 — a lost pet. The owner is alive and elsewhere, which to the machine is
 * a theft: one thing went from one room at one half hour, and somebody was
 * alone there with it. The report asks who let it out, when, where it is now
 * and why; the why is small, and it is always a person's.
 *
 * Three tropes: a door left open by somebody who will not admit it, an animal
 * taken on purpose over a feud, and one that followed somebody home.
 *
 * Signature: where the animal is now, found there, and one person who saw the
 * way out standing open.
 */

function petOf(ctx: ShapeContext): PetKind {
  return ctx.setting.pet ?? 'dog';
}

function cap(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}

/** "fox terrier", for "Prentiss's fox terrier". */
function bare(ctx: TropeContext): string {
  return thing(ctx).replace(/^(the|a|an) /, '');
}

/** The thing itself, "the fox terrier". */
function thing(ctx: TropeContext): string {
  return ctx.act.taken?.name ?? `the ${PET_WORD[petOf(ctx)]}`;
}

function givens(ctx: TropeContext, closer: string) {
  const V = ctx.who(ctx.cast.victim.id);
  const L = ctx.placeName(ctx.act.place);
  const [lo, hi] = ctx.coronerWindow;
  const facts: Fact[] = [{ kind: 'timeOfDeath', ticks: [lo, hi] }];
  if (ctx.act.taken) facts.push({ kind: 'objectMissing', objectId: ctx.act.taken.id, fromPlace: ctx.act.place });
  return {
    facts,
    text: [
      `${V}’s ${bare(ctx)} is gone from ${L} and has not come home.`,
      `It did not let itself out: the way out of ${L} is always kept shut, and it was found standing open.`,
      `${cap(thing(ctx))} went ${between(lo, hi)}.`,
      closer,
    ],
  };
}

/** Where it is now, found there, and the way out that somebody saw open. */
function signature(ctx: TropeContext, id: string, whereNow: (place: string) => string) {
  const V = ctx.who(ctx.cast.victim.id);
  const L = ctx.act.place;
  const pet = petOf(ctx);
  const went = (ctx.act.goodsWentTo ?? elsewhere(ctx)) as Id;
  const taken = ctx.act.taken;
  const [a] = twoSources(ctx);
  const gone: Fact[] = taken ? [{ kind: 'objectMissing', objectId: taken.id, fromPlace: L }] : [];
  const clues = [
    ctx.add('physical', { type: 'place', placeId: went }, went, gone, whereNow(ctx.placeName(went))),
    ctx.add(
      'overheard',
      { type: 'person', personId: a.id, topic: `${V}’s ${PET_WORD[pet]}` },
      ctx.foundAt(a.id),
      gone,
      `${ctx.who(a.id)} says the way out of ${ctx.placeName(L)} was standing open that evening, and ${ctx.who(a.id)} thought at the time that somebody would catch it for that.`,
    ),
  ];
  return { clues, requirement: essential(id, `where ${thing(ctx)} went`, clues) };
}

const base = {
  type: 'lost-pet' as const,
  unknowns: ['who', 'when', 'goods', 'why'] as Trope['unknowns'],
  shape: (ctx: ShapeContext) => ({
    taken: stealable(ctx),
    goodsWentTo: elsewhere(ctx),
    pet: petOf(ctx),
  }),
};

export const petLeftOpen: Trope = {
  ...base,
  id: 'pet-left-open',
  weight: 6,
  label: 'a way out left open by somebody who will not say so',
  motive: 'embarrassment',
  givens: (ctx) => givens(ctx, 'Nobody on the street will say they were the one who left it open.'),
  signature: (ctx) =>
    signature(ctx, 'pet-left-open', (place) =>
      `${cap(thing(ctx))} is at ${place}, where it wandered in on its own that evening and has been given the run of the place, and something to eat.`,
    ),
};

export const petTaken: Trope = {
  ...base,
  id: 'pet-taken',
  weight: 5,
  label: 'an animal taken on purpose, over a feud',
  motive: 'spite',
  givens: (ctx) =>
    givens(ctx, `${ctx.who(ctx.cast.victim.id)} has a list of the people who would like to think it wandered off, and has read it to the whole street.`),
  signature: (ctx) =>
    signature(ctx, 'pet-taken', (place) =>
      `${cap(thing(ctx))} is shut in at ${place}, with a bowl of water and a blanket, put there on purpose by somebody who wanted it kept and not hurt.`,
    ),
};

export const petFollowed: Trope = {
  ...base,
  id: 'pet-followed',
  weight: 5,
  label: 'an animal that followed somebody home',
  motive: 'affection',
  givens: (ctx) =>
    givens(ctx, `${ctx.who(ctx.cast.victim.id)} says it never goes anywhere with anybody, which everybody who has met it knows is not true.`),
  signature: (ctx) =>
    signature(ctx, 'pet-followed', (place) =>
      `${cap(thing(ctx))} is at ${place}, curled up where somebody it likes sits, and has been fed there before by the look of it. It went after somebody that evening and would not be sent home.`,
    ),
};
