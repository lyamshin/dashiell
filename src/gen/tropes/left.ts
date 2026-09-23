import { TICKS, clock, type Fact, type Id, type Tick } from '../types.js';
import { essential, twoSources, type Trope } from './kit.js';

/**
 * Nobody took them. They went, and somebody on this block helped them go and
 * has been lying about the evening ever since. The report asks where they are
 * and why they went; it does not ask who, because nobody did anything to them.
 *
 * `act.actorId` is the person who left. The core simulation still turns on a
 * suspect — the one who saw them off and will not say so — because the spine,
 * the exculpations and par all hang on one contradicted alibi. Finding that
 * person is how the whereabouts is found.
 *
 * Signature: a chain of sightings after the hour, ending where they are.
 */
export const left: Trope = {
  id: 'left',
  type: 'missing',
  weight: 8,
  label: 'somebody who went, and was helped to go',
  unknowns: ['whereabouts', 'why'],

  shape: (ctx) => ({
    whereabouts: ctx.build.whereabouts ?? 'gone',
    fate: 'left',
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
        `${by ? ctx.who(by) : 'Somebody'} saw ${V} at ${seen} at ${clock(seenAt)}, and nobody has seen ${V} since.`,
        `${V}’s rooms were left tidy and the rent was paid to the end of the month.`,
        `The precinct took a statement and filed it, because a grown person may go where they like.`,
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
    const t2: Tick = Math.min(TICKS - 1, M + 3);
    const home = where ?? ctx.act.place;
    const facts1: Fact[] = [
      { kind: 'personAt', personId: ctx.cast.victim.id, place: home, tick: t1 },
    ];
    const facts2: Fact[] = [
      { kind: 'personAt', personId: ctx.cast.victim.id, place: home, tick: t2 },
    ];
    const [a] = twoSources(ctx);
    const clues = [
      ctx.add(
        'document',
        { type: 'place', placeId: home },
        home,
        facts1,
        `A pawn ticket written at ${ctx.placeName(home)} at ${clock(t1)}, for a ring, in a hand that matches the rent book ${V} signs.`,
      ),
      ctx.add(
        'overheard',
        { type: 'person', personId: a.id, topic: `${V} since Tuesday` },
        ctx.foundAt(a.id),
        facts2,
        `${ctx.who(a.id)} says there was somebody at ${ctx.placeName(home)} at ${clock(t2)} reading the departures off a timetable, and it was ${V}.`,
      ),
    ];
    return { clues, requirement: essential('left', `where ${V} went`, clues) };
  },
};
