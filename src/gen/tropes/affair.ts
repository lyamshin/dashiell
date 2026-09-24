import { clock, type Errand, type Fact } from '../types.js';
import { SECRET_ERRANDS } from '../data/mundane.js';
import { between, essential, twoSources, type ShapeContext, type Trope, type TropeContext } from './kit.js';

/**
 * M14 — an affair, or what looks like one.
 *
 * The client is married to the one the case is about, or engaged to them, and
 * was told a story about where they would be. They were there the half hour
 * before (`act.claimedAt`, where the night opens) and somewhere else at the
 * one that matters, with somebody. To the machine it is a meeting: the one the
 * report asks for was alone at the scene at the half hour with the person the
 * case is about, who is alive before and after and says nothing to a detective
 * their husband or wife hired. The report asks with whom, when, and — from
 * Medium, where the report asks where — where.
 *
 * Three tropes: a real affair; a secret that looks like one (a night class, a
 * second job, a surprise, a sick relative); and a meeting that was business.
 * The report scores the facts, not which of the three it was. The ending is
 * the player's choice of what to tell the client.
 *
 * Signature: two things that put the one it is about at the scene at the
 * half hour — something of theirs left behind, and somebody who saw them go
 * in and not come out.
 */

function he(ctx: TropeContext): string {
  return ctx.cast.victim.gender === 'f' ? 'she' : 'he';
}

function his(ctx: TropeContext): string {
  return ctx.cast.victim.gender === 'f' ? 'her' : 'his';
}

function givens(ctx: TropeContext, closer: string) {
  const V = ctx.who(ctx.cast.victim.id);
  const P = ctx.placeName(ctx.act.claimedAt ?? ctx.build.victimSeenPlace);
  const [lo, hi] = ctx.coronerWindow;
  const facts: Fact[] = [{ kind: 'timeOfDeath', ticks: [lo, hi] }];
  return {
    facts,
    text: [
      `${V} said ${he(ctx)} would be at ${P} all evening.`,
      `Some time ${between(lo, hi)}, ${V} was somewhere else, with somebody.`,
      `${V} came home late with a story about ${P}, and the story had a hole in it the size of the evening.`,
      closer,
    ],
  };
}

function signature(ctx: TropeContext, id: string, left: (V: string, L: string, T: string) => string) {
  const V = ctx.who(ctx.cast.victim.id);
  const L = ctx.act.place;
  const M = ctx.act.tick;
  const fact: Fact[] = [{ kind: 'personAt', personId: ctx.cast.victim.id, place: L, tick: M }];
  const [a] = twoSources(ctx);
  const clues = [
    ctx.add(
      'physical',
      { type: 'place', placeId: L },
      L,
      fact,
      left(V, ctx.placeName(L), clock(M)),
    ),
    ctx.add(
      'overheard',
      { type: 'person', personId: a.id, topic: `${V} that evening` },
      ctx.foundAt(a.id),
      fact,
      `${ctx.who(a.id)} says ${V} went in at ${ctx.placeName(L)} at ${clock(M)} and did not come out for the half hour, and ${V} was not in there by ${his(ctx) === 'her' ? 'herself' : 'himself'}.`,
    ),
  ];
  return { clues, requirement: essential(id, `where ${V} was at ${clock(M)}`, clues) };
}

function cap(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}

const shape = (errand: (ctx: ShapeContext) => Errand) => (ctx: ShapeContext) => ({
  claimedAt: ctx.build.victimSeenPlace,
  errand: errand(ctx),
});

const base = {
  type: 'affair' as const,
  unknowns: ['who', 'when', 'where'] as Trope['unknowns'],
};

export const theAffair: Trope = {
  ...base,
  id: 'the-affair',
  weight: 6,
  label: 'an affair, as the client feared',
  motive: 'love',
  shape: shape(() => 'affair'),
  givens: (ctx) => givens(ctx, `This is the third Tuesday running.`),
  signature: (ctx) => signature(ctx, 'the-affair', (V, L, T) => `There is a scarf of ${V}’s over the back of a chair at ${L}, left there at ${T}, and it smells of somebody else’s cigarettes.`),
};

export const theSecret: Trope = {
  ...base,
  id: 'the-secret',
  weight: 6,
  label: 'a secret that looks like an affair and is not one',
  motive: 'secret-kept',
  shape: shape((ctx) => ctx.rng.pick(SECRET_ERRANDS)),
  givens: (ctx) => givens(ctx, `${cap(he(ctx))} has been tired, and short with everybody, and pleased with something.`),
  signature: (ctx) => signature(ctx, 'the-secret', (V, L, T) => `There is a pair of ${V}’s gloves on the table at ${L}, left there at ${T} and folded by somebody tidy.`),
};

export const theBusiness: Trope = {
  ...base,
  id: 'the-business',
  weight: 4,
  label: 'a meeting that was business',
  motive: 'business-done',
  shape: shape(() => 'business'),
  givens: (ctx) => givens(ctx, `${cap(he(ctx))} came home and went through the accounts until two in the morning.`),
  signature: (ctx) => signature(ctx, 'the-business', (V, L, T) => `${V}’s fountain pen is on the table at ${L}, left there at ${T} with the cap off and a column of figures beside it.`),
};
