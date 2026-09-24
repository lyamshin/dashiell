import type { Fact, Id } from '../types.js';
import { between, elsewhere, essential, stealable, twoSources, type ShapeContext, type Trope, type TropeContext } from './kit.js';

/**
 * M14 — a lost item: a ring, a watch, a medal, a set of teeth, a trophy. To the
 * machine it is a theft with nobody who would call it one. The report asks who
 * had it last, when it went, where it is now and why.
 *
 * Four tropes: borrowed without asking, pawned, hidden to spite somebody, and
 * put away somewhere safe by somebody in the house who then forgot, and said
 * it was stolen sooner than say so.
 *
 * Signature: the thing itself, found where it is now, and somebody who saw
 * the place it was kept standing open.
 */

function cap(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}

function thing(ctx: TropeContext): string {
  return ctx.act.taken?.name ?? 'the thing';
}

/** "a gold wedding ring" -> "the gold wedding ring", once it has been introduced. */
function theThing(ctx: TropeContext): string {
  return thing(ctx).replace(/^(a|an) /, 'the ');
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
      `${cap(thing(ctx))} is gone from ${L}, where ${V} keeps it.`,
      `Nothing at ${L} was forced, and nothing else was touched.`,
      `It went ${between(lo, hi)}.`,
      closer,
    ],
  };
}

function signature(ctx: TropeContext, id: string, whereNow: (place: string) => string) {
  const L = ctx.act.place;
  const went = (ctx.act.goodsWentTo ?? elsewhere(ctx)) as Id;
  const taken = ctx.act.taken;
  const [a] = twoSources(ctx);
  const gone: Fact[] = taken ? [{ kind: 'objectMissing', objectId: taken.id, fromPlace: L }] : [];
  const clues = [
    ctx.add('physical', { type: 'place', placeId: went }, went, gone, whereNow(ctx.placeName(went))),
    ctx.add(
      'overheard',
      { type: 'person', personId: a.id, topic: theThing(ctx) },
      ctx.foundAt(a.id),
      gone,
      `${ctx.who(a.id)} says ${theThing(ctx)} was always kept at ${ctx.placeName(L)}, where anybody who knew the house could put a hand on it, and that is not a long list.`,
    ),
  ];
  return { clues, requirement: essential(id, `where ${theThing(ctx)} went`, clues) };
}

const shape = (ctx: ShapeContext) => ({
  taken: stealable(ctx),
  goodsWentTo: elsewhere(ctx),
});

/** A pawnshop, if the night has one; somewhere quiet otherwise. */
const pawnShape = (ctx: ShapeContext) => {
  const shop = ctx.setting.places.find((p) => /pawn/i.test(p.shortName) && p.id !== ctx.build.murderPlaceId);
  return { taken: stealable(ctx), goodsWentTo: shop?.id ?? elsewhere(ctx) };
};

const base = {
  type: 'lost-item' as const,
  unknowns: ['who', 'when', 'goods', 'why'] as Trope['unknowns'],
};

export const itemBorrowed: Trope = {
  ...base,
  id: 'item-borrowed',
  weight: 5,
  label: 'a thing borrowed without asking',
  motive: 'pride',
  shape,
  givens: (ctx) => givens(ctx, `${ctx.who(ctx.cast.victim.id)} says it has never once left the house except on ${ctx.who(ctx.cast.victim.id)}.`),
  signature: (ctx) =>
    signature(ctx, 'item-borrowed', (place) =>
      `${cap(theThing(ctx))} turned up at ${place}, polished, which is more than ${ctx.who(ctx.cast.victim.id)} ever did for it. Somebody wore it out that evening and meant to put it back.`,
    ),
};

export const itemPawned: Trope = {
  ...base,
  id: 'item-pawned',
  weight: 4,
  label: 'a thing pawned by somebody who meant to buy it back',
  motive: 'embarrassment',
  shape: pawnShape,
  givens: (ctx) => givens(ctx, 'Whoever took it knew exactly where it was kept, which is a short list.'),
  signature: (ctx) =>
    signature(ctx, 'item-pawned', (place) =>
      `${cap(theThing(ctx))} is at ${place}, tagged and on a shelf, pawned that evening for less than it is worth by somebody who asked twice how long they had to buy it back.`,
    ),
};

export const itemHidden: Trope = {
  ...base,
  id: 'item-hidden',
  weight: 4,
  label: 'a thing hidden to spite somebody',
  motive: 'spite',
  shape,
  givens: (ctx) => givens(ctx, `${ctx.who(ctx.cast.victim.id)} has turned the house over twice and started on the neighbours.`),
  signature: (ctx) =>
    signature(ctx, 'item-hidden', (place) =>
      `${cap(theThing(ctx))} is at ${place}, pushed to the back behind something heavy, where nobody would look and somebody wanted it not found. It was not lost. It was put there.`,
    ),
};

export const itemMislaid: Trope = {
  ...base,
  id: 'item-mislaid',
  weight: 4,
  label: 'a thing put away safe, forgotten, and called stolen',
  motive: 'embarrassment',
  shape,
  givens: (ctx) => givens(ctx, 'The word on the street is that it was stolen, and the word got there very fast.'),
  signature: (ctx) =>
    signature(ctx, 'item-mislaid', (place) =>
      `${cap(theThing(ctx))} is at ${place}, wrapped in a clean handkerchief and put somewhere safe, which is exactly how people lose things.`,
    ),
};
