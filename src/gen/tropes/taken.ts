import { TICKS, clock, type Id, type Tick } from '../types.js';
import { essential, twoSources, type Trope } from './kit.js';

/**
 * Somebody took them. The report asks who, where they are, and why; it does
 * not ask when, because the hour they stopped being seen is a given.
 *
 * Signature: somebody paying for a room. Exactly one person saw the two of
 * them after the hour, which is the one observation a disappearance allows.
 */
export const taken: Trope = {
  id: 'taken',
  type: 'missing',
  weight: 8,
  label: 'somebody taken, and a room paid for in cash',
  unknowns: ['who', 'whereabouts', 'why'],

  shape: (ctx) => ({
    whereabouts: ctx.build.whereabouts ?? 'gone',
    fate: 'taken',
  }),

  givens: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const seen = ctx.placeName(ctx.build.victimSeenPlace);
    const seenAt = ctx.build.victimSeenAt;
    const by = ctx.build.lastSeenById;
    return {
      facts: [
        {
          kind: 'personAt',
          personId: ctx.cast.victim.id,
          place: ctx.build.victimSeenPlace,
          tick: seenAt,
        },
      ],
      text: [
        `${V} has not been seen since ${clock(seenAt)} on Tuesday evening.`,
        `${by ? ctx.who(by) : 'Somebody'} saw ${V} at ${seen} at ${clock(seenAt)}.`,
        `${V}’s coat and hat are still on the hook and the money is still in the drawer.`,
        `The precinct came, looked at the room, and said to wait a day or two.`,
      ],
    };
  },

  signature: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const where = (ctx.act.whereabouts === 'gone' ? undefined : ctx.act.whereabouts) as
      | Id
      | undefined;
    const M = ctx.act.tick;
    const t1: Tick = Math.min(TICKS - 1, M + 1);
    const home = where ?? ctx.act.place;
    const killer = ctx.cast.killer;
    const [a] = twoSources(ctx);
    const clues = [
      ctx.add(
        'document',
        { type: 'place', placeId: home },
        home,
        [{ kind: 'personAt', personId: ctx.cast.victim.id, place: home, tick: t1 }],
        `The register at ${ctx.placeName(home)} has a room paid for at ${clock(t1)}, cash, a week in advance, in a name nobody at the desk could read back.`,
      ),
      ctx.add(
        'overheard',
        { type: 'person', personId: a.id, topic: `the room at ${ctx.placeName(home)}` },
        ctx.foundAt(a.id),
        [{ kind: 'personAt', personId: killer.id, place: home, tick: t1 }],
        `${ctx.who(a.id)} says ${ctx.who(killer.id)} paid for a room at ${ctx.placeName(home)} at ${clock(t1)} and went up with somebody who was not walking easily, and that the somebody had ${V}’s coat over one arm.`,
      ),
    ];
    return { clues, requirement: essential('taken', `where ${V} is being kept`, clues) };
  },
};
