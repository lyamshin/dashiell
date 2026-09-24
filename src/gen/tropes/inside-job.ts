import { clock, type Fact } from '../types.js';
import { between, elsewhere, essential, stealable, twoSources, type Trope, type TropeContext } from './kit.js';
import { OWNABLE_ROOMS } from '../coherence.js';

/**
 * Nothing was forced. Whatever was taken went out through a door that was
 * opened properly, which means it was opened by somebody who could open it.
 * Nobody died, so there is no coroner and no method; what the report asks is
 * who, how they got in, and where the goods went.
 *
 * Signature: the lock that was not forced, and the list of who holds a key.
 */
export const insideJob: Trope = {
  id: 'inside-job',
  type: 'robbery',
  weight: 10,
  label: 'a theft with no forced entry',
  unknowns: ['who', 'entry', 'goods'],

  shape: (ctx) => ({
    taken: stealable(ctx),
    entry: ctx.means.entry ?? 'key',
    goodsWentTo: elsewhere(ctx),
  }),

  givens: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const L = ctx.placeName(ctx.act.place);
    const taken = ctx.act.taken;
    const [lo, hi] = ctx.coronerWindow;
    const facts: Fact[] = [{ kind: 'timeOfDeath', ticks: [lo, hi] }];
    if (taken) facts.push({ kind: 'objectMissing', objectId: taken.id, fromPlace: ctx.act.place });
    // The coherence pass: a room of the owner's is theirs, and says so unless
    // its name already does ("Feeney’s place, which is Feeney’s" says it
    // twice). Anywhere else — a kept classic case on the ferry slip — it was
    // the locker the owner rents there, which is a thing a ferry slip has.
    const theirs = owns(ctx);
    return {
      facts,
      text: [
        theirs
          ? `${cap(taken?.name ?? 'the box')} was taken from ${L}${ctx.coherent === true && L.includes(V) ? '' : `, which is ${V}’s`}.`
          : `${cap(taken?.name ?? 'the box')} was taken from the locker ${V} rents at ${L}.`,
        theirs
          ? `Nothing at ${L} was forced: the lock was turned and the door was shut again after.`
          : `Nothing at ${L} was forced: the locker was opened with its key and shut again after.`,
        `The precinct puts it ${between(lo, hi)}.`,
        `${V} is not saying much about what was in it.`,
      ],
    };
  },

  signature: (ctx) => {
    const killer = ctx.cast.killer;
    const L = ctx.act.place;
    const access = ctx.build.accessPlaceId;
    const taken = ctx.act.taken;
    const [, b] = twoSources(ctx);
    const clues = [
      ctx.add(
        'physical',
        { type: 'place', placeId: L },
        L,
        taken ? [{ kind: 'objectMissing', objectId: taken.id, fromPlace: L }] : [],
        owns(ctx)
          ? `The jamb at ${ctx.placeName(L)} has not been touched and the screws in the plate have paint across them. ${taken ? `${cap(taken.name)} is gone from the shelf` : 'The shelf is empty'}, and nothing either side of it was moved.`
          : `The locker at ${ctx.placeName(L)} has not been touched, and there is dust along the edge of its door. ${taken ? `${cap(taken.name)} is gone from it` : 'It is empty'}, and nothing either side of it was moved.`,
      ),
      ctx.add(
        'document',
        { type: 'place', placeId: access },
        access,
        [
          { kind: 'hadAccess', personId: killer.id, methodId: ctx.method.id },
          {
            kind: 'personAt',
            personId: killer.id,
            place: access,
            tick: ctx.build.killerAccessTick,
          },
        ],
        `The key list at ${ctx.placeName(access)} runs to four names, and ${ctx.who(killer.id)} is the third of them. The sign-in book has ${ctx.who(killer.id)} there at ${clock(ctx.build.killerAccessTick)}.`,
      ),
      ctx.add(
        'overheard',
        { type: 'person', personId: b.id, topic: 'the lock' },
        ctx.foundAt(b.id),
        [{ kind: 'hadAccess', personId: killer.id, methodId: ctx.method.id }],
        owns(ctx)
          ? `${ctx.who(b.id)} says the lock at ${ctx.placeName(L)} has never been changed, and the people who can open it can be counted on one hand.`
          : `${ctx.who(b.id)} says the lock on ${ctx.who(ctx.cast.victim.id)}’s locker at ${ctx.placeName(L)} has never been changed, and the people who can open it can be counted on one hand.`,
      ),
    ];
    return {
      clues,
      requirement: essential('inside-job', 'the door was opened, not forced', clues.slice(1)),
    };
  },
};

/** The room it was taken from is the owner's own: the residence, or an office. */
function owns(ctx: TropeContext): boolean {
  if (ctx.coherent !== true) return true;
  const place = ctx.setting.places.find((p) => p.id === ctx.act.place);
  return place?.isResidence === true || OWNABLE_ROOMS.includes(ctx.act.place);
}

function cap(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}
