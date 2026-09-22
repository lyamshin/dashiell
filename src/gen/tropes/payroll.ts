import { clock, type Fact } from '../types.js';
import { elsewhere, essential, stealable, twoSources, type Trope } from './kit.js';

/**
 * An envelope with four hundred men's wages in it went along a route it goes
 * along every Friday, and somewhere on that route it stopped going. The hour
 * is given, because the route is timed; who, how, and where it went are not.
 *
 * Signature: the route itself — the people posted along it who see the same
 * thing at the same time every week — and where the envelope turned up empty.
 */
export const payroll: Trope = {
  id: 'payroll',
  type: 'robbery',
  weight: 8,
  label: 'a payroll that never reached the end of its route',
  unknowns: ['who', 'goods', 'how'],

  shape: (ctx) => ({
    taken: stealable(ctx),
    entry: ctx.means.entry ?? 'never-left',
    goodsWentTo: elsewhere(ctx),
  }),

  givens: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const L = ctx.placeName(ctx.act.place);
    const seen = ctx.placeName(ctx.build.victimSeenPlace);
    const M = ctx.act.tick;
    const taken = ctx.act.taken;
    const facts: Fact[] = [{ kind: 'timeOfDeath', ticks: ctx.coronerWindow }];
    if (taken) facts.push({ kind: 'objectMissing', objectId: taken.id, fromPlace: ctx.act.place });
    return {
      facts,
      text: [
        `${cap(taken?.name ?? 'the payroll envelope')} went from ${seen} to ${L} the way it goes every Friday, and ${V} carried it.`,
        `${V} had it at ${seen} at ${clock(Math.max(0, M - 1))}, buttoned into an inside pocket.`,
        `It was gone from ${L} by ${clock(M)}.`,
        `Nobody was hurt and nothing was broken.`,
      ],
    };
  },

  signature: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const seenPlace = ctx.build.victimSeenPlace;
    const seenAt = ctx.build.victimSeenAt;
    const went = ctx.act.goodsWentTo ?? ctx.act.place;
    const taken = ctx.act.taken;
    const [a] = twoSources(ctx);
    const clues = [
      ctx.add(
        'overheard',
        { type: 'person', personId: a.id, topic: 'the route that evening' },
        ctx.foundAt(a.id),
        [{ kind: 'personAt', personId: ctx.cast.victim.id, place: seenPlace, tick: seenAt }],
        `${ctx.who(a.id)} sees ${V} come past ${ctx.placeName(seenPlace)} at ${clock(seenAt)} every week of the year, and saw it that evening, with the envelope still buttoned in.`,
      ),
      ctx.add(
        'physical',
        { type: 'place', placeId: went },
        went,
        taken ? [{ kind: 'objectMissing', objectId: taken.id, fromPlace: ctx.act.place }] : [],
        `${taken ? cap(taken.name) : 'The envelope'} turned up at ${ctx.placeName(went)}, behind the pipes, empty and slit along the fold.`,
      ),
    ];
    return { clues, requirement: essential('payroll', 'where the payroll went', clues) };
  },
};

function cap(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}
