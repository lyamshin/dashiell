/**
 * M7 — Shape: complexity tiers and the difficulty ladder.
 *
 * Two axes, kept apart. A `CaseShape` is the size of the case: how many
 * people, how many rooms, how many of them have something to hide, how wide
 * the coroner's window is, what the report asks. A `Ladder` is how tight the
 * night is and how much of the hand is lies. Tiers and levels are named
 * presets over the two, and they all live here, in one file, so that the whole
 * of the game's progression can be read in one place.
 *
 * `generateCase(seed)` with no options is Hard-boiled on one of the three
 * legacy ladders — today's dials exactly — so that every seed from before M7
 * still means the case it meant. The spec's ladder (noise spread 30 / 40 / 50 /
 * 65 per cent) is what `{ tier, level }` or `{ shape, ladder }` deals.
 */

import type { CaseType, Difficulty, Id, Unknown } from './types.js';

export type TierId = 0 | 1 | 2 | 3 | 4 | 5 | 'over-easy' | 'custom';
export type Level = Difficulty;

/** What the report may ask. A ceiling: a case asks the ones it left unknown. */
export type ReportField = 'who' | 'how' | 'why' | 'when' | 'where';

/**
 * The legs of the proof beyond the two that every case has — clearing the
 * innocents and breaking the culprit's alibi, which is what `who` is. The time
 * of death is governed by `anchorsRequired`, not listed here.
 */
export type ProofLeg = 'access' | 'method' | 'motive' | 'signature';

export interface CaseShape {
  tier: TierId;
  /** The egg name. */
  name: string;
  /** The one new rule, as the title page prints it. */
  rule: string;
  suspects: 3 | 4 | 5 | 6 | 8;
  places: 3 | 4 | 5 | 6 | 8;
  /** How many of the drawn places have somebody posted at them. */
  watched: [number, number];
  /** How many innocents carry a secret. 0..suspects-1. */
  innocentSecrets: number;
  /** At most this many innocents carry a motive too (at least one, if any). */
  innocentMotives: number;
  /** The coroner's window, in half hours. */
  coronerWidth: 1 | 2 | 4;
  /** How many anchors the time of death has to hang on. */
  anchorsRequired: 0 | 1 | 2;
  /** A liar who claims a room with something memorable in it must know it. */
  knowledgeTests: boolean;
  /** The most innocents that may lie about the crime's half hour. */
  liarsAtCrime: 0 | 1 | 2 | 3;
  killerCoverSecret: boolean;
  clientMayBeCulprit: boolean;
  caseTypes: CaseType[];
  /** Which tropes may be drawn. */
  tropes: Id[];
  reportFields: ReportField[];
  /**
   * The murder tropes name the method in their givens ("It was a knife.").
   * Where the tier teaches the method instead, the givens stay quiet about it
   * and `how` joins the unknowns.
   */
  methodGiven: boolean;
  /** Which legs of the proof the selector must cover and the checker holds. */
  proof: ProofLeg[];
  /** The generator's par, floor and ceiling. */
  par: [number, number];
  /** The findable hand this shape aims at. A target, not a constraint. */
  findable: number;
  /** Below Medium, slack scales with par: `round(slack × par / 12)`, never below 3. */
  scaleSlack: boolean;
  /** A tier that is always played at one level, whatever was asked for. */
  lockedLevel?: Level;
}

export interface Ladder {
  level: Level;
  name: string;
  /** Spare actions over par. */
  slack: number;
  /** Noise, disqualifiers and loose ends included, as a share of the hand. */
  noiseRatio: [number, number];
  /** Noise clues before a branch's disqualifier. */
  branchDepth: [number, number];
  /** How many noise branches the hand would like, before it bends. */
  branchCount: number;
  /** How many innocents lie about the crime's half hour, before the shape caps it. */
  liars: [number, number];
  /**
   * `full`: every essential fact has two routes. `bigFive`: the time, the
   * contradiction, access, method and motive have two, exculpations one.
   * `single`: every essential fact has exactly one findable source.
   */
  corroboration: 'full' | 'bigFive' | 'single';
  /**
   * Where noise hangs. `quiet`: off the spine clues in the least-walked rooms.
   * `busy`: off the opening clues and the most-walked room, so the ratio bites.
   * `random`: anywhere, as before M7.
   */
  noisePlacement: 'quiet' | 'random' | 'busy';
  /** The client may point at the head of an innocent's noise branch. */
  clientRedHerring: boolean;
  /**
   * The pre-M7 dials. A legacy ladder runs the old noise planner and the old
   * hand-size checks exactly, which is what keeps `{ difficulty }` byte for
   * byte what it was.
   */
  legacy?: true;
}

/* ------------------------------------------------------------ the tropes */

const MURDER_AT_SCENE: Id[] = ['body-at-scene'];
const MURDER_TROPES: Id[] = ['body-at-scene', 'body-moved', 'locked-room', 'the-frame'];
const ALL_TROPES: Id[] = [
  'body-at-scene',
  'body-moved',
  'locked-room',
  'the-frame',
  'inside-job',
  'payroll',
  'left',
  'taken',
];
const ALL_FIELDS: ReportField[] = ['who', 'how', 'why', 'when', 'where'];
const ALL_LEGS: ProofLeg[] = ['access', 'method', 'motive', 'signature'];

/* ------------------------------------------------------------- the tiers */

export const RAW: CaseShape = {
  tier: 0,
  name: 'Raw',
  rule: 'Three people, three rooms, and one of them did it.',
  suspects: 3,
  places: 3,
  watched: [1, 1],
  innocentSecrets: 0,
  innocentMotives: 0,
  coronerWidth: 1,
  anchorsRequired: 0,
  knowledgeTests: false,
  liarsAtCrime: 0,
  killerCoverSecret: false,
  clientMayBeCulprit: false,
  caseTypes: ['murder'],
  tropes: MURDER_AT_SCENE,
  reportFields: ['who'],
  methodGiven: true,
  proof: [],
  par: [4, 5],
  findable: 12,
  scaleSlack: true,
  lockedLevel: 1,
};

const { lockedLevel: _rawLevel, ...RAW_UNLOCKED } = RAW;

export const CODDLED: CaseShape = {
  ...RAW_UNLOCKED,
  tier: 1,
  name: 'Coddled',
  rule: 'This time the report asks how it was done.',
  suspects: 4,
  places: 4,
  reportFields: ['who', 'how'],
  methodGiven: false,
  proof: ['method'],
  par: [5, 6],
  findable: 17,
};

export const POACHED: CaseShape = {
  ...CODDLED,
  tier: 2,
  name: 'Poached',
  rule: 'This time somebody else is lying too.',
  watched: [1, 2],
  innocentSecrets: 1,
  liarsAtCrime: 1,
  proof: ['method', 'access'],
  par: [6, 7],
  findable: 21,
};

export const SOFT_BOILED: CaseShape = {
  ...POACHED,
  tier: 3,
  name: 'Soft-boiled',
  rule: 'This time the coroner gives you an hour, and the scene may lie.',
  coronerWidth: 2,
  anchorsRequired: 1,
  tropes: MURDER_TROPES,
  proof: ['method', 'access', 'signature'],
  par: [7, 8],
  findable: 26,
};

export const MEDIUM: CaseShape = {
  tier: 4,
  name: 'Medium',
  rule: 'This time a motive names nobody on its own.',
  suspects: 5,
  places: 5,
  watched: [2, 3],
  innocentSecrets: 3,
  innocentMotives: 2,
  coronerWidth: 2,
  anchorsRequired: 1,
  knowledgeTests: false,
  liarsAtCrime: 2,
  killerCoverSecret: false,
  clientMayBeCulprit: false,
  caseTypes: ['murder', 'robbery', 'missing'],
  tropes: ALL_TROPES,
  reportFields: ALL_FIELDS,
  methodGiven: false,
  proof: ALL_LEGS,
  par: [9, 10],
  findable: 31,
  scaleSlack: false,
};

/**
 * Today's case. Every value here is what the generator did before M7, which is
 * why the no-options path can be this shape and still be byte-identical. The
 * spec's par target for Hard-boiled is 12–14; the floor and ceiling stay at
 * today's 9 and 18 because tightening them would change which seeds pass.
 */
export const HARD_BOILED: CaseShape = {
  tier: 5,
  name: 'Hard-boiled',
  rule: 'This time the one paying you might have done it.',
  suspects: 6,
  places: 6,
  watched: [3, 4],
  innocentSecrets: 5,
  innocentMotives: 3,
  coronerWidth: 4,
  anchorsRequired: 2,
  knowledgeTests: true,
  liarsAtCrime: 3,
  killerCoverSecret: true,
  clientMayBeCulprit: true,
  caseTypes: ['murder', 'robbery', 'missing'],
  tropes: ALL_TROPES,
  reportFields: ALL_FIELDS,
  methodGiven: true,
  proof: ALL_LEGS,
  par: [9, 18],
  findable: 34,
  scaleSlack: false,
};

/** Post-game. Not a campaign tier. */
export const OVER_EASY: CaseShape = {
  ...HARD_BOILED,
  tier: 'over-easy',
  name: 'Over easy',
  rule: 'Eight people, eight rooms, and three of them lying about the half hour.',
  suspects: 8,
  places: 8,
  watched: [4, 5],
  innocentSecrets: 7,
  par: [14, 18],
  findable: 44,
};

export const TIERS: Record<0 | 1 | 2 | 3 | 4 | 5 | 'over-easy', CaseShape> = {
  0: RAW,
  1: CODDLED,
  2: POACHED,
  3: SOFT_BOILED,
  4: MEDIUM,
  5: HARD_BOILED,
  'over-easy': OVER_EASY,
};

/** The campaign, in order. Over easy is a post-game unlock, not a tier. */
export const CAMPAIGN: CaseShape[] = [RAW, CODDLED, POACHED, SOFT_BOILED, MEDIUM, HARD_BOILED];

/* ------------------------------------------------------------ the ladder */

export const BEAT: Ladder = {
  level: 1,
  name: 'Beat',
  slack: 8,
  noiseRatio: [0.25, 0.35],
  branchDepth: [1, 1],
  branchCount: 5,
  liars: [2, 2],
  corroboration: 'full',
  noisePlacement: 'quiet',
  clientRedHerring: false,
};

export const PRECINCT: Ladder = {
  level: 2,
  name: 'Precinct',
  slack: 6,
  noiseRatio: [0.35, 0.45],
  branchDepth: [1, 2],
  branchCount: 4,
  liars: [2, 3],
  corroboration: 'full',
  noisePlacement: 'random',
  clientRedHerring: false,
};

export const HOMICIDE: Ladder = {
  level: 3,
  name: 'Homicide',
  slack: 4,
  noiseRatio: [0.45, 0.55],
  branchDepth: [2, 3],
  branchCount: 4,
  liars: [3, 3],
  corroboration: 'bigFive',
  noisePlacement: 'busy',
  clientRedHerring: true,
};

export const DAS_OFFICE: Ladder = {
  level: 4,
  name: 'The DA’s Office',
  slack: 3,
  noiseRatio: [0.55, 0.7],
  branchDepth: [2, 3],
  branchCount: 5,
  liars: [3, 3],
  corroboration: 'single',
  noisePlacement: 'busy',
  clientRedHerring: true,
};

export const LADDERS: Record<Level, Ladder> = { 1: BEAT, 2: PRECINCT, 3: HOMICIDE, 4: DAS_OFFICE };

/**
 * The dials as they were before M7, as ladders. Noise held between 35 and 45
 * per cent at all three levels, branch depth 1–2 / 1–3 / 2–3, five / four /
 * three branches, and the big five corroborated. Level 4 never existed before,
 * so it has no legacy: `{ difficulty: 4 }` is Hard-boiled at the DA's Office.
 */
export const LEGACY_LADDERS: Record<Level, Ladder> = {
  1: {
    ...BEAT,
    noiseRatio: [0.35, 0.45],
    branchDepth: [1, 2],
    corroboration: 'bigFive',
    noisePlacement: 'random',
    legacy: true,
  },
  2: { ...PRECINCT, noiseRatio: [0.35, 0.45], branchDepth: [1, 3], corroboration: 'bigFive', legacy: true },
  3: { ...HOMICIDE, noiseRatio: [0.35, 0.45], branchDepth: [2, 3], branchCount: 3, noisePlacement: 'random', legacy: true },
  4: DAS_OFFICE,
};

/* --------------------------------------------------------------- resolving */

export interface Dials {
  shape: CaseShape;
  ladder: Ladder;
  /** `ladder.level`, as the case records it. */
  difficulty: Difficulty;
  /** Neither a shape nor a ladder was asked for: today's case. */
  plain: boolean;
}

export interface ShapeOptions {
  difficulty?: Difficulty;
  shape?: CaseShape;
  ladder?: Ladder;
  tier?: Exclude<TierId, 'custom'>;
  level?: Level;
}

/**
 * Options into dials. `tier` and `level` are the presets by name; `shape` and
 * `ladder` are the objects themselves and win when both are given. A tier with
 * a locked level plays at it whatever was asked for: Raw is always Beat.
 */
export function resolveDials(opts?: ShapeOptions): Dials {
  const askedShape = opts?.shape ?? (opts?.tier !== undefined ? TIERS[opts.tier] : undefined);
  const askedLevel = opts?.level ?? opts?.difficulty ?? 2;
  const askedLadder = opts?.ladder ?? (opts?.level !== undefined ? LADDERS[opts.level] : undefined);
  if (askedShape === undefined && askedLadder === undefined) {
    return {
      shape: HARD_BOILED,
      ladder: LEGACY_LADDERS[askedLevel],
      difficulty: askedLevel,
      plain: true,
    };
  }
  const shape = askedShape ?? HARD_BOILED;
  let ladder = askedLadder ?? LADDERS[askedLevel];
  if (shape.lockedLevel !== undefined && ladder.level !== shape.lockedLevel) {
    ladder = LADDERS[shape.lockedLevel];
  }
  return { shape, ladder, difficulty: ladder.level, plain: false };
}

/**
 * The dials a finished case was dealt with. A case made with options carries
 * its shape and ladder; one made without them is Hard-boiled on the legacy
 * ladder for its difficulty, which is what it was dealt with.
 */
export function dialsOf(c: { difficulty: Difficulty; shape?: CaseShape; ladder?: Ladder }): Dials {
  if (c.shape !== undefined && c.ladder !== undefined) {
    return { shape: c.shape, ladder: c.ladder, difficulty: c.ladder.level, plain: false };
  }
  return {
    shape: HARD_BOILED,
    ladder: LEGACY_LADDERS[c.difficulty],
    difficulty: c.difficulty,
    plain: true,
  };
}

/** Spare actions for a case of this par. Below Medium, a small case gets a small night. */
export function slackFor(shape: CaseShape, ladder: Ladder, par: number): number {
  if (!shape.scaleSlack) return ladder.slack;
  return Math.max(3, Math.round((ladder.slack * par) / 12));
}

/** How many liars the level wants, capped by what the shape allows. */
export function liarsFor(shape: CaseShape, ladder: Ladder): [number, number] {
  const cap = Math.min(shape.liarsAtCrime, shape.innocentSecrets);
  return [Math.min(ladder.liars[0], cap), Math.min(ladder.liars[1], cap)];
}

/** Which report field an unknown answers to, for the ceiling. */
export const FIELD_OF: Record<Unknown, ReportField> = {
  who: 'who',
  why: 'why',
  when: 'when',
  where: 'where',
  how: 'how',
  entry: 'how',
  fate: 'how',
  whereabouts: 'where',
  goods: 'where',
};

/**
 * What the report asks: the trope's unknowns, under the tier's ceiling. Where
 * the tier teaches the method, a murder asks `how` as well, right after `who`.
 */
export function unknownsFor(shape: CaseShape, type: CaseType, tropeUnknowns: Unknown[]): Unknown[] {
  const out = tropeUnknowns.slice();
  if (type === 'murder' && !shape.methodGiven && !out.includes('how')) {
    const at = out.indexOf('who');
    out.splice(at < 0 ? 0 : at + 1, 0, 'how');
  }
  return out.filter((u) => shape.reportFields.includes(FIELD_OF[u]));
}

/** A one-line read-out of the dials, for sheet headers and transcripts. */
export function describeDials(d: Dials): string {
  const s = d.shape;
  const l = d.ladder;
  const pct = (x: number): string => `${Math.round(x * 100)}`;
  return (
    `${s.name} (${s.suspects} suspects, ${s.places} places, ${s.innocentSecrets} secrets, ` +
    `coroner ${s.coronerWidth / 2 === 0.5 ? 'half an hour' : `${s.coronerWidth / 2}h`}, ` +
    `par ${s.par[0]}–${s.par[1]}) at ${l.name} (level ${l.level}, slack ${l.slack}, ` +
    `noise ${pct(l.noiseRatio[0])}–${pct(l.noiseRatio[1])}%, ` +
    `depth ${l.branchDepth[0] === l.branchDepth[1] ? l.branchDepth[0] : `${l.branchDepth[0]}–${l.branchDepth[1]}`}, ` +
    `${l.corroboration}${l.legacy ? ', pre-M7 dials' : ''})`
  );
}
