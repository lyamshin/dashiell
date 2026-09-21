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
 * An anchor's strings are all *facts*. `sceneFact` says what happened and
 * when; it never says what that means. Drawing the conclusion is the player's
 * job and the deduction path's, not a clue's.
 *
 * `masks` marks the anchors loud enough to bury a killing. If the anchor that
 * times the scene masks, nobody in the neighbourhood heard the killing, and
 * the derivation emits no hearers. If it does not mask, hearers exist and
 * nothing anywhere claims the noise was covered. One or the other, per case.
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
  /** "while the lesson was still going on" — during the anchor's own tick. */
  timing: string;
  /** "just after the lesson stopped" — at the moment the anchor marks. */
  highTiming: string;
  /** A plain fact for the scene report. `{T}` is the murder tick's clock. */
  sceneFact: string;
  /** Loud enough that nobody nearby would have heard the killing. */
  masks: boolean;
}

export const ANCHOR_TEMPLATES: AnchorTemplate[] = [
  {
    id: 'bar-radio',
    name: 'the fight card on the bar radio',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    masks: true,
    traces: [
      { kind: 'knowledge', description: 'the challenger went down in the fourth and the crowd booed it' },
      { kind: 'sound', description: 'the set was turned up loud enough to carry into the street' },
    ],
    timing: 'while the fight was on the radio',
    highTiming: 'while the fight was on the radio',
    sceneFact:
      'The fight card was on the bar radio at {T}, turned up loud enough to carry into the street, and off when the card ended.',
  },
  {
    id: 'regular-stool',
    name: 'the regular who takes the same seat every night',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    masks: false,
    traces: [
      { kind: 'sighting' },
      { kind: 'knowledge', description: 'the regular was drinking sherry, and said twice what he thought of the beer' },
    ],
    timing: 'when the regular came in for his seat',
    highTiming: 'as the regular was settling on his stool',
    sceneFact: 'The regular took his stool at {T}, which is the hour he takes it six nights a week.',
  },
  {
    id: 'cop-pass',
    name: 'the beat cop’s pass',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 3,
    masks: false,
    traces: [{ kind: 'sighting' }],
    timing: 'when the cop came round',
    highTiming: 'as the cop was coming round',
    sceneFact: 'The patrolman’s round brought him two streets off at {T}.',
  },
  {
    id: 'piano-lesson',
    name: 'the piano lesson on the floor above',
    attachesTo: 'place',
    placeKinds: ['private', 'semi'],
    ticks: 'single',
    masks: false,
    traces: [
      { kind: 'sound', description: 'the same four bars, over and over, and then nothing' },
      { kind: 'knowledge', description: 'the child never did get the passage right' },
    ],
    timing: 'while the lesson was still going on overhead',
    highTiming: 'just after the lesson overhead stopped',
    sceneFact: 'The lesson overhead stopped at {T} and nothing was played after it.',
  },
  {
    id: 'el-train',
    name: 'the El going over',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 2,
    masks: true,
    traces: [{ kind: 'sound', description: 'everything under the structure stops being audible for twenty seconds' }],
    timing: 'just as the El went over',
    highTiming: 'just as the El went over',
    sceneFact:
      'The El went over at {T}, running to timetable, and for twenty seconds nothing under the structure can be heard at all.',
  },
  {
    id: 'church-bells',
    name: 'the bells at St. Malachy’s',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 2,
    masks: false,
    traces: [{ kind: 'sound', description: 'the half hours are rung and the whole hours are rung twice' }],
    timing: 'as the bells were going',
    highTiming: 'while the bells were going',
    sceneFact:
      'The bells rang the half hour at {T}. The sexton rings them off the sacristy clock and it keeps good time.',
  },
  {
    id: 'last-edition',
    name: 'the last edition coming off the truck',
    attachesTo: 'place',
    placeKinds: ['public', 'semi'],
    ticks: 'single',
    masks: false,
    traces: [
      { kind: 'sighting' },
      { kind: 'knowledge', description: 'the late edition led with the bridge contract and not the hold-up' },
      { kind: 'mark', description: 'ink still wet enough to come off on a glove' },
    ],
    timing: 'when the last edition came up',
    highTiming: 'as the last edition was coming up',
    sceneFact:
      'The last edition came off the truck at {T}, and a paper from that run is here with the ink still wet.',
  },
  {
    id: 'fuse',
    name: 'the fuse going in the building',
    attachesTo: 'place',
    placeKinds: ['private', 'semi'],
    ticks: 'single',
    masks: false,
    traces: [
      { kind: 'sound', description: 'a crack in the cellar and every light on the riser out at once' },
      { kind: 'knowledge', description: 'it was the second floor that went dark and not the whole house' },
      { kind: 'mark', description: 'candle smoke on the ceilings of everyone who sat it out' },
    ],
    timing: 'when the lights went',
    highTiming: 'just after the lights went',
    sceneFact: 'The fuse went at {T} and the lights on that riser were dead from then until the morning.',
  },
  {
    id: 'rain',
    name: 'the rain starting',
    attachesTo: 'neighborhood',
    ticks: 'single',
    masks: false,
    traces: [{ kind: 'mark', description: 'a coat soaked through at the shoulders' }],
    timing: 'just after the rain came on',
    highTiming: 'just after the rain came on',
    sceneFact:
      'The rain came on at {T}. It got in at the window, and the wet had stopped spreading by the time the body was found.',
  },
  {
    id: 'milk-wagon',
    name: 'the milk wagon on its rounds',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 4,
    masks: false,
    traces: [{ kind: 'sound', description: 'iron tyres and a horse that will not stand still' }],
    timing: 'while the milk wagon was in the street',
    highTiming: 'while the milk wagon was in the street',
    sceneFact: 'The milk wagon was at the corner at {T}, where the driver’s round puts him every night.',
  },
  {
    id: 'theater-out',
    name: 'the theatre letting out',
    attachesTo: 'place',
    placeKinds: ['public', 'semi'],
    ticks: 'single',
    masks: true,
    traces: [
      { kind: 'sighting' },
      { kind: 'knowledge', description: 'there was an understudy on, and the house was told about it at the door' },
    ],
    timing: 'in the crush when the theatre let out',
    highTiming: 'in the crush when the theatre let out',
    sceneFact:
      'The curtain came down at {T}, the same minute six nights a week, and the street was full for a quarter of an hour.',
  },
  {
    id: 'garage-shift',
    name: 'the shift change at the garage',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    masks: false,
    traces: [
      { kind: 'sighting' },
      { kind: 'knowledge', description: 'the foreman was two men short and said in front of everybody what he thought of it' },
      { kind: 'mark', description: 'cylinder oil on a cuff' },
    ],
    timing: 'at the shift change',
    highTiming: 'as the night men were punching in',
    sceneFact: 'The night men punched in at {T} and the yard was full of them for the half hour.',
  },
  {
    id: 'drunk-singing',
    name: 'the drunk singing under the window',
    attachesTo: 'place',
    placeKinds: ['private', 'semi', 'public'],
    ticks: 'single',
    masks: false,
    traces: [
      { kind: 'sound', description: 'the same two verses until somebody threw a shoe' },
      { kind: 'knowledge', description: 'it was a shoe, and it was thrown by a woman, and it did not land' },
    ],
    timing: 'while the singing was still going on',
    highTiming: 'just as the singing stopped',
    sceneFact: 'The singing under the window stopped at {T}, when the shoe came down.',
  },
  {
    id: 'dumbwaiter',
    name: 'the dumbwaiter squeal',
    attachesTo: 'place',
    placeKinds: ['private', 'semi'],
    ticks: 'recurring',
    everyN: 3,
    masks: false,
    traces: [
      { kind: 'sound', description: 'a noise the whole shaft hears and nobody in the building can sleep through' },
      { kind: 'knowledge', description: 'the car came up with somebody’s wash still in it, and stuck halfway' },
    ],
    timing: 'when the dumbwaiter went up',
    highTiming: 'as the dumbwaiter was going up',
    sceneFact: 'The dumbwaiter car was worked at {T}, as it is on the hour and the half hour.',
  },
  {
    id: 'ice-delivery',
    name: 'the ice being brought in',
    attachesTo: 'place',
    placeKinds: ['semi', 'public'],
    ticks: 'single',
    masks: false,
    traces: [
      { kind: 'sighting' },
      { kind: 'knowledge', description: 'the iceman dropped a block on the step and it went in three' },
      { kind: 'mark', description: 'a wet patch down one side of a coat' },
    ],
    timing: 'when the ice came',
    highTiming: 'as the ice was being brought in',
    sceneFact: 'The ice was brought in at {T} and the iceman’s book has the delivery timed and signed for.',
  },
  {
    id: 'steam-whistle',
    name: 'the whistle off the river',
    attachesTo: 'neighborhood',
    ticks: 'recurring',
    everyN: 4,
    masks: false,
    traces: [{ kind: 'sound', description: 'two long and one short, and you can hear it a mile inland' }],
    timing: 'when the whistle went off the river',
    highTiming: 'as the whistle went off the river',
    sceneFact: 'The whistle went off the river at {T}, two long and one short, and the boat’s log has the hour.',
  },
];

export const ANCHOR_BY_ID: Record<Id, AnchorTemplate> = Object.fromEntries(
  ANCHOR_TEMPLATES.map((a) => [a.id, a]),
);

/** An anchor can time the scene only if it leaves a sound or a mark. */
export function canTimeScene(t: AnchorTemplate): boolean {
  return t.traces.some((tr) => tr.kind === 'sound' || tr.kind === 'mark');
}

/** Phrases that claim a noise was covered. Only a masking case may use them. */
export const MASKING_PHRASES = [
  'loud enough to carry into the street',
  'nothing under the structure can be heard',
  'the street was full',
];
