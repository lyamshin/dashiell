import { clock } from '../types.js';
import { between, essential, methodGiven, twoSources, type Trope } from './kit.js';

/**
 * One door, one key, and the key was where it belongs in the morning. The
 * where and the how-it-looks are given; what the report wants on top of the
 * usual three is how anybody got in at all.
 *
 * Signature: the key, and the book beside it that people sign.
 */
export const lockedRoom: Trope = {
  id: 'locked-room',
  type: 'murder',
  weight: 8,
  label: 'a room that was locked, and one key',
  unknowns: ['who', 'why', 'when', 'entry'],

  shape: (ctx) => ({ bodyFoundAt: ctx.build.murderPlaceId, entry: 'key', fate: 'dead' }),

  givens: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const L = ctx.placeName(ctx.act.place);
    const [lo, hi] = ctx.coronerWindow;
    return {
      facts: [
        { kind: 'timeOfDeath', ticks: [lo, hi] },
        ...(methodGiven(ctx) ? [{ kind: 'methodEvidence' as const, methodId: ctx.method.id }] : []),
      ],
      text: [
        `${V} was found dead at ${L}.`,
        `The door at ${L} was locked and the windows were painted shut.`,
        `There is one key to ${L}, and it was on its hook at ${ctx.placeName(ctx.build.accessPlaceId)} this morning.`,
        `The coroner puts it ${between(lo, hi)}.`,
        ...(methodGiven(ctx) ? [`It was ${ctx.method.name}.`] : []),
      ],
    };
  },

  signature: (ctx) => {
    const killer = ctx.cast.killer;
    const access = ctx.build.accessPlaceId;
    const L = ctx.act.place;
    const t = ctx.build.killerAccessTick;
    const [, b] = twoSources(ctx);
    const clues = [
      ctx.add(
        'document',
        { type: 'place', placeId: access },
        access,
        [
          { kind: 'hadAccess', personId: killer.id, methodId: ctx.method.id },
          { kind: 'personAt', personId: killer.id, place: access, tick: t },
        ],
        `The key book at ${ctx.placeName(access)} is signed out and in for every night this month, and at ${clock(t)} it is signed in ${ctx.who(killer.id)}’s hand.`,
      ),
      ctx.add(
        'overheard',
        { type: 'person', personId: b.id, topic: 'the key' },
        ctx.foundAt(b.id),
        [{ kind: 'hadAccess', personId: killer.id, methodId: ctx.method.id }],
        `${ctx.who(b.id)} says there has only ever been the one key to ${ctx.placeName(L)}, it lives at ${ctx.placeName(access)}, and ${ctx.who(killer.id)} had it off the hook that evening.`,
      ),
    ];
    return {
      clues,
      requirement: essential('locked-room', `how ${ctx.who(killer.id)} got into ${ctx.placeName(L)}`, clues),
    };
  },
};
