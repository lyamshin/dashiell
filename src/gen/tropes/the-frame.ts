import { clock, type Fact, type Person } from '../types.js';
import { essential, type Trope } from './kit.js';

/**
 * Somebody has already been fitted for it. The weapon was in an innocent's
 * rooms when the precinct looked, and the precinct stopped looking. The three
 * usual unknowns stand, and the frame has to come apart before any of them
 * can be answered.
 *
 * Signature: the plant, and a provenance clue that unwinds it — where the
 * thing came from, and where the framed one actually was.
 */
export const theFrame: Trope = {
  id: 'the-frame',
  type: 'murder',
  weight: 8,
  label: 'a frame around somebody who did not do it',
  unknowns: ['who', 'why', 'when'],

  shape: (ctx) => ({ bodyFoundAt: ctx.build.murderPlaceId, fate: 'dead' }),

  givens: (ctx) => {
    const V = ctx.who(ctx.cast.victim.id);
    const L = ctx.placeName(ctx.act.place);
    const framed = framedPerson(ctx.cast.innocents, ctx.act.tick);
    const [lo, hi] = ctx.coronerWindow;
    return {
      facts: [
        { kind: 'timeOfDeath', ticks: [lo, hi] },
        { kind: 'methodEvidence', methodId: ctx.method.id },
      ],
      text: [
        `${V} was found dead at ${L}.`,
        `The coroner puts it between ${clock(lo)} and ${clock(hi)}.`,
        `It was ${ctx.method.name}.`,
        `The precinct found the weapon in ${ctx.who(framed.id)}’s rooms and stopped looking.`,
        `${ctx.who(framed.id)} says it was put there, and has been saying so since Tuesday.`,
      ],
    };
  },

  signature: (ctx) => {
    const framed = framedPerson(ctx.cast.innocents, ctx.act.tick);
    const M = ctx.act.tick;
    const truth = (ctx.build.truth[framed.id] ?? [])[M] ?? ctx.foundAt(framed.id);
    const where = ctx.foundAt(framed.id);
    const access = ctx.build.accessPlaceId;
    const object =
      ctx.objects.find((o) => o.id === ctx.method.evidenceObjectId)?.name ?? 'the weapon';
    const fact: Fact[] = [
      { kind: 'personNotAt', personId: framed.id, place: ctx.act.place, tick: M },
    ];
    const clues = [
      ctx.add(
        'physical',
        { type: 'place', placeId: where },
        where,
        fact,
        `${cap(object)} was found at ${ctx.placeName(where)} wrapped in newspaper, and the newspaper is dated the day after ${ctx.who(framed.id)} was last in the room.`,
      ),
      ctx.add(
        'document',
        { type: 'place', placeId: access },
        access,
        fact,
        `The book at ${ctx.placeName(access)} has ${object} going out the day before, in a hand that is not ${ctx.who(framed.id)}’s. ${ctx.who(framed.id)} was at ${ctx.placeName(truth)} at ${clock(M)}.`,
      ),
    ];
    return {
      clues,
      requirement: essential('the-frame', `the frame around ${ctx.who(framed.id)} comes apart`, clues),
    };
  },
};

/** Always the same innocent for the same case: the first one, in cast order. */
export function framedPerson(innocents: Person[], tick: number): Person {
  return innocents[tick % innocents.length] as Person;
}

function cap(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}
