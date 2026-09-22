import { TICKS, clock, type Fact, type Tick } from '../types.js';
import { elsewhere, essential, twoSources, type Trope } from './kit.js';

/**
 * The body was carried. The precinct found it at the foot of a stair or in an
 * areaway and wrote down a fall; it happened somewhere else, and where is the
 * fourth thing the report asks for.
 *
 * Signature: marks where something heavy went down the stairs, and a hackman
 * who took a heavy fare and would rather not talk about the load.
 */
export const bodyMoved: Trope = {
  id: 'body-moved',
  type: 'murder',
  weight: 10,
  label: 'a body found where it did not happen',
  unknowns: ['who', 'why', 'when', 'where'],

  shape: (ctx) => ({
    // Where somebody actually walked in on it, so that the discovery and the
    // trope agree about which stairs the marks are on.
    bodyFoundAt: ctx.build.discovery?.placeId ?? elsewhere(ctx),
    fate: 'dead',
  }),

  givens: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const found = ctx.placeName(ctx.act.bodyFoundAt);
    const [lo, hi] = ctx.coronerWindow;
    return {
      facts: [{ kind: 'timeOfDeath', ticks: [lo, hi] }],
      text: [
        `${V} was found dead at ${found}.`,
        `${V} was not killed at ${found}: there is no blood there and no sign of a struggle.`,
        `The coroner puts it between ${clock(lo)} and ${clock(hi)}.`,
        `It was ${ctx.method.name}, and it happened somewhere else.`,
      ],
    };
  },

  signature: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const L = ctx.act.place;
    const found = ctx.act.bodyFoundAt ?? L;
    const M = ctx.act.tick;
    const after: Tick = Math.min(TICKS - 1, M + 1);
    const fact: Fact[] = [{ kind: 'personAt', personId: ctx.cast.victim.id, place: L, tick: M }];
    const [a] = twoSources(ctx);
    const clues = [
      ctx.add(
        'physical',
        { type: 'place', placeId: found },
        found,
        fact,
        `The stairs down to ${ctx.placeName(found)} are scuffed the whole way in two parallel lines, and the dust in the scuffs is the grey dust off the floor at ${ctx.placeName(L)}.`,
      ),
      ctx.add(
        'overheard',
        { type: 'person', personId: a.id, topic: 'a heavy fare that evening' },
        ctx.foundAt(a.id),
        fact,
        `${ctx.who(a.id)} says somebody carried a heavy thing down from ${ctx.placeName(L)} to ${ctx.placeName(found)} at ${clock(after)}, wrapped in a rug, and did not want help with it.`,
      ),
    ];
    return {
      clues,
      requirement: essential('body-moved', `${V} was killed at ${ctx.placeName(L)}`, clues),
    };
  },
};
