import { clock, type Fact } from '../types.js';
import { essential, methodGiven, twoSources, type Trope } from './kit.js';

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
    const named = methodGiven(ctx);
    const facts: Fact[] = [
      { kind: 'timeOfDeath', ticks: [lo, hi] },
      ...(named ? [{ kind: 'methodEvidence' as const, methodId: ctx.method.id }] : []),
    ];
    // M7: two hours is nothing useful; an hour is something; the half hour is
    // what Raw, Coddled and Poached are dealt, so the coroner says so.
    const width = hi - lo + 1;
    const coroner =
      width === 1
        ? `The coroner puts it at ${clock(lo)}, and will swear to the half hour.`
        : width === 2
          ? `The coroner puts it between ${clock(lo)} and ${clock(hi)}, and will not come closer than the hour.`
          : `The coroner puts it between ${clock(lo)} and ${clock(hi)}, which is two hours of nothing useful.`;
    return {
      facts,
      text: [
        /*
         * Hone 3 §2. This was two sentences — "{V} was found dead at {L}." and
         * "{V} was killed at {L}, and nothing was carried out of the room
         * afterwards." — and the first two thirds of the second one restated
         * the first. On the page it came out as "Sweeney was found dead at the
         * suite. Sweeney was killed at the suite.", which is the same fact
         * twice with the same subject and the same place in it, and a reader
         * hears the machine.
         *
         * For this trope the two are one fact: the room the body is in is the
         * room it happened in, and that is the whole of what `body-at-scene`
         * means. One sentence carries both, and `Givens.facts` is a flat list
         * for the case rather than a list per sentence, so nothing the report
         * or the notebook reads has moved.
         *
         * The clause that did carry a second fact — nothing was carried out —
         * is this trope's signature, and both of its signature clues state it
         * (the rug and the chair at the scene, and the door that nobody came
         * out of carrying anything). So it is not lost by being said once
         * where it is proved rather than twice where it is asserted.
         */
        `${V} was found dead at ${L}, and that is where it happened.`,
        coroner,
        ...(named ? [`It was ${ctx.method.name}.`] : []),
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
