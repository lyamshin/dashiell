import type { AnchorTrace, Id, PlaceKind } from '../types.js';

/**
 * An anchor is an event with a known time that leaves a trace on whoever was
 * near it. Anchors are how the evening gets a clock: the coroner's window is
 * four ticks wide and useless on its own, and everything that narrows it comes
 * from here.
 *
 * Two of the drawn anchors do the work. One of them puts the victim somewhere
 * alive at the tick before the murder. The other one times the scene: either a
 * neighbourhood sound that a hearer can pin the noise against, or something
 * that stopped at the murder tick and left the room in a state the next day
 * can still read.
 *
 * A place-attached anchor can only land on a drawn place whose template lists
 * it in `anchorsHosted`, and whose kind is in `placeKinds` if that is set.
 */
export interface AnchorTemplate {
  id: Id;
  name: string;
  attachesTo: 'place' | 'neighborhood';
  placeKinds?: PlaceKind[];
  ticks: 'single' | 'recurring';
  /** For `recurring`: the period in ticks. */
  everyN?: number;
  traces: AnchorTrace[];
  /** "just as {X}" — how a clue times something against this anchor. */
  timing: string;
  /** How the anchor reads when it is used to time the scene. */
  sceneTiming: string;
}

export const ANCHOR_TEMPLATES: AnchorTemplate[] = [
  {
    id: 'bar-radio',
    name: 'the fight card on the bar radio',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    traces: [
      { kind: 'knowledge', description: 'the challenger went down in the fourth and the crowd booed it' },
      { kind: 'sound', description: 'the set was turned up loud enough to carry into the street' },
    ],
    timing: 'while the fight was on the radio',
    sceneTiming: 'the set was loud enough to cover it, and it was only loud for that half hour',
  },
  {
    id: 'regular-stool',
    name: 'the regular who takes the same seat every night',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    traces: [{ kind: 'sighting' }],
    timing: 'when the regular came in for his seat',
    sceneTiming: 'the regular sets his watch by it and it had not gone wrong that night',
  },
  {
    id: 'cop-pass',
    name: 'the beat cop’s pass',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 3,
    traces: [{ kind: 'sighting' }],
    timing: 'when the cop came round',
    sceneTiming: 'the patrolman was two streets off on his round and heard it',
  },
  {
    id: 'piano-lesson',
    name: 'the piano lesson on the floor above',
    attachesTo: 'place',
    placeKinds: ['private', 'semi'],
    ticks: 'single',
    traces: [
      { kind: 'sound', description: 'the same four bars, over and over, and then nothing' },
      { kind: 'knowledge', description: 'the child never did get the passage right' },
    ],
    timing: 'while the lesson was still going on overhead',
    sceneTiming: 'the piano stopped and what was heard next was heard against silence',
  },
  {
    id: 'el-train',
    name: 'the El going over',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 2,
    traces: [{ kind: 'sound', description: 'everything under the structure stops being audible for twenty seconds' }],
    timing: 'just as the El went over',
    sceneTiming: 'the El was running to timetable and it covers the half hour exactly',
  },
  {
    id: 'church-bells',
    name: 'the bells at St. Malachy’s',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 2,
    traces: [{ kind: 'sound', description: 'the half hours are rung and the whole hours are rung twice' }],
    timing: 'as the bells were going',
    sceneTiming: 'the bells fix it: the sexton rings them off the sacristy clock and it keeps good time',
  },
  {
    id: 'last-edition',
    name: 'the last edition coming off the truck',
    attachesTo: 'place',
    placeKinds: ['public', 'semi'],
    ticks: 'single',
    traces: [
      { kind: 'sighting' },
      { kind: 'mark', description: 'ink still wet enough to come off on a glove' },
    ],
    timing: 'when the last edition came up',
    sceneTiming: 'the truck run is timed to the minute and the papers were out on the stand',
  },
  {
    id: 'fuse',
    name: 'the fuse going in the building',
    attachesTo: 'place',
    placeKinds: ['private', 'semi'],
    ticks: 'single',
    traces: [
      { kind: 'sound', description: 'a crack in the cellar and every light on the riser out at once' },
      { kind: 'mark', description: 'candle smoke on the ceilings of everyone who sat it out' },
    ],
    timing: 'when the lights went',
    sceneTiming: 'the lights on that riser were dead from then until the morning',
  },
  {
    id: 'rain',
    name: 'the rain starting',
    attachesTo: 'neighborhood',
    ticks: 'single',
    traces: [{ kind: 'mark', description: 'a coat soaked through at the shoulders' }],
    timing: 'just after the rain came on',
    sceneTiming: 'the rain got in and the marks it left had stopped spreading by the time it was found',
  },
  {
    id: 'milk-wagon',
    name: 'the milk wagon on its rounds',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 4,
    traces: [{ kind: 'sound', description: 'iron tyres and a horse that will not stand still' }],
    timing: 'while the milk wagon was in the street',
    sceneTiming: 'the driver keeps to his round and he was at the corner for it',
  },
  {
    id: 'theater-out',
    name: 'the theatre letting out',
    attachesTo: 'place',
    placeKinds: ['public', 'semi'],
    ticks: 'single',
    traces: [{ kind: 'sighting' }],
    timing: 'in the crush when the theatre let out',
    sceneTiming: 'the curtain comes down at the same minute six nights a week',
  },
  {
    id: 'garage-shift',
    name: 'the shift change at the garage',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    traces: [
      { kind: 'sighting' },
      { kind: 'mark', description: 'cylinder oil on a cuff' },
    ],
    timing: 'at the shift change',
    sceneTiming: 'the night men were punching in and the yard was full of witnesses to the hour',
  },
  {
    id: 'drunk-singing',
    name: 'the drunk singing under the window',
    attachesTo: 'place',
    placeKinds: ['private', 'semi', 'public'],
    ticks: 'single',
    traces: [
      { kind: 'sound', description: 'the same two verses until somebody threw a shoe' },
      { kind: 'knowledge', description: 'it was a shoe, and it was thrown by a woman, and it did not land' },
    ],
    timing: 'while the singing was still going on',
    sceneTiming: 'the singing stopped when the shoe came down, and that was the half hour',
  },
  {
    id: 'dumbwaiter',
    name: 'the dumbwaiter squeal',
    attachesTo: 'place',
    placeKinds: ['private', 'semi'],
    ticks: 'recurring',
    everyN: 3,
    traces: [{ kind: 'sound', description: 'a noise the whole shaft hears and nobody in the building can sleep through' }],
    timing: 'when the dumbwaiter went up',
    sceneTiming: 'the shaft carries and the car was worked on the hour and the half hour',
  },
  {
    id: 'ice-delivery',
    name: 'the ice being brought in',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    traces: [
      { kind: 'sighting' },
      { kind: 'mark', description: 'a wet patch down one side of a coat' },
    ],
    timing: 'when the ice came',
    sceneTiming: 'the iceman’s book has the delivery timed and signed for',
  },
  {
    id: 'steam-whistle',
    name: 'the whistle off the river',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 4,
    traces: [{ kind: 'sound', description: 'two long and one short, and you can hear it a mile inland' }],
    timing: 'when the whistle went off the river',
    sceneTiming: 'the boat keeps a schedule and the whistle is logged',
  },
];

export const ANCHOR_BY_ID: Record<Id, AnchorTemplate> = Object.fromEntries(
  ANCHOR_TEMPLATES.map((a) => [a.id, a]),
);

/** An anchor can time the scene only if it leaves a sound or a mark. */
export function canTimeScene(t: AnchorTemplate): boolean {
  return t.traces.some((tr) => tr.kind === 'sound' || tr.kind === 'mark');
}
