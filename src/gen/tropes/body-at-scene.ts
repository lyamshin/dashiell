import { clock, type Fact } from '../types.js';
import { essential, twoSources, type Trope } from './kit.js';

/**
 * The commonest shape, and the one the rest are variations on: a body in a
 * room, and the room is where it happened. Everything about the where is a
 * given; what is left is who, why, and the half hour.
 *
 * Signature: the room as found. Nothing was carried out of it, which is what
 * makes the scene the scene, and two people can say so.
 */
export const bodyAtScene: Trope = {
  id: 'body-at-scene',
  type: 'murder',
  weight: 40,
  label: 'a body in the room it happened in',
  unknowns: ['who', 'why', 'when'],

  shape: (ctx) => ({ bodyFoundAt: ctx.build.murderPlaceId, fate: 'dead' }),

  givens: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const L = ctx.placeName(ctx.act.place);
    const [lo, hi] = ctx.coronerWindow;
    const facts: Fact[] = [
      { kind: 'timeOfDeath', ticks: [lo, hi] },
      { kind: 'methodEvidence', methodId: ctx.method.id },
    ];
    return {
      facts,
      text: [
        `${V} was found dead at ${L}.`,
        `${V} was killed at ${L}, and nothing was carried out of the room afterwards.`,
        `The coroner puts it between ${clock(lo)} and ${clock(hi)}, which is two hours of nothing useful.`,
        `It was ${ctx.method.name}.`,
      ],
    };
  },

  signature: (ctx) => {
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
        `The rug at ${ctx.placeName(L)} is rucked up under ${V} and the chair beside it went over backwards. Nothing was carried out of the room.`,
      ),
      ctx.add(
        'overheard',
        { type: 'person', personId: a.id, topic: `${ctx.placeName(L)} that evening` },
        ctx.foundAt(a.id),
        fact,
        `${ctx.who(a.id)} says the door at ${ctx.placeName(L)} was shut from ${clock(M)} on, and nobody came out of it carrying anything.`,
      ),
    ];
    return { clues, requirement: essential('body-at-scene', `${V} died where ${V} was found`, clues) };
  },
};
