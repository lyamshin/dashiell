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
  /** The one new rule, as the title page prints it: "This time: …", in the book's plain voice. */
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
  /**
   * M14 §1.5: how often each type is dealt, as weights over the types the
   * tier has a trope for. Absent is the pre-M14 draw: one pick over the
   * tropes' own weights.
   */
  caseMix?: Partial<Record<CaseType, number>>;
  /** Which tropes may be drawn. */
  tropes: Id[];
  /**
   * M14: the tropes the tier drew from before M14, the classic draw that the
   * case mix keeps or replaces (`pickMixedTrope`). Absent is `tropes`.
   */
  classicTropes?: Id[];
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
  /**
   * M9: how the night is solved. Absent on a shape built before M9, in which
   * case `deductionOf` reads the tier's preset.
   */
  deduction?: DeductionDials;
}

/**
 * M9 — the logic game's dials for a tier. See `docs/20-m9-deduction.md`.
 *
 * Raw and Coddled teach the one loop (M10 Part B, `catchTheLie`): every
 * innocent cleared by their own word and a sighting that agrees with it, and
 * the culprit's lie heard and caught by the one posted where it claims to
 * have been. The pages still conclude, once two facts agree. Poached brings the innocents' lies; Soft-boiled times sightings by
 * anchors and wants the culprit reached by a chain; Medium brings strangers
 * and descriptions; Hard-boiled wants a hypothesis tested.
 */
export interface DeductionDials {
  /** How many innocents a single findable rule may keep away from the scene at the crime's half hour. */
  directClears: number;
  /** Innocents' secrets make lies in their own accounts. */
  secretLies: boolean;
  /** The culprit also lies about fetching the means. */
  meansLie: boolean;
  /** Alibi companions who lie for somebody, before the ladder adds any. */
  companions: [number, number];
  /** Share of sightings timed by an anchor ("just as the El went over") where an anchor could time them. */
  anchorTimed: number;
  /** Share of pairs with no tie between them who are strangers, so that a sighting is a description. */
  strangers: number;
  /** The culprit's lies are contradicted only by chains, never one rule. */
  culpritChains: boolean;
  /** The culprit is reached at this depth or deeper, and no shallower route exists. */
  culpritDepth: number;
  /** The par route needs a hypothesis tested. */
  hypothesis: boolean;
  /** The pages may state a conclusion ("That cleared Weisglass."). Raw and Coddled only. */
  verdicts: boolean;
  /**
   * Share of the watchers' and the strangers' rules dealt as pieces (counts,
   * absences, descriptions) rather than as a name at a time.
   */
  pieces: number;
  /**
   * Par's floor and ceiling for the logic game. Par is the cheapest rule set
   * the solver needs, walked (M9 §6), which now takes in accounts, questions
   * about people and confrontations; `CaseShape.par` stays the M7 range the
   * no-options case is still held to. Shorter nights: the range holds the
   * par route walked the M9 way (`SolveSummary.walk`), so the cases dealt do
   * not move; `Case.par`, the shorter walk, is what the night is budgeted on.
   */
  par: [number, number];
  /**
   * M9 polish: spare actions over the ladder's slack. Hard-boiled's par route
   * leans on confessions, each two confrontations and a second, independent
   * fact, and a player who reasons found the ladder's slack a call or two
   * short (docs/20-m9-polish-notes.md). Tiered cases only. Shorter nights:
   * two at Hard-boiled — par falls by about two and a half calls there, a
   * player who reasons saves about two, and the budget keeps one of them
   * (docs/24-shorter-nights-notes.md).
   */
  extraSlack?: number;
  /** M14: spare actions over `extraSlack` for one case type, where the design test needs them. */
  typeSlack?: Partial<Record<CaseType, number>>;
  /**
   * M10 Part B, Raw and Coddled: the night teaches the one loop the game is.
   * The culprit's own account is on the par route and lies about the crime's
   * half hour; the watcher of the room it claims knows the culprit and says
   * the culprit was not in. Every innocent is cleared by their own account and
   * one sighting that agrees with it, never by one line and never by another
   * innocent. The client points at an innocent the client knows. The question
   * that catches the lie is on the par route unmarked (`Logic.open`): the
   * marks bring the player to the lie, and the player finds who can break it.
   * The hand is cut to the tier's findable target.
   */
  catchTheLie?: boolean;
  /**
   * M10: the confront verb ("Put it to X") is on. Absent, it follows
   * `secretLies` (Poached up), as M9 built it.
   */
  confront?: boolean;
}

export const DEDUCTION_PLAIN: DeductionDials = {
  directClears: 99,
  secretLies: false,
  meansLie: false,
  companions: [0, 0],
  anchorTimed: 0,
  strangers: 0,
  culpritChains: false,
  culpritDepth: 0,
  hypothesis: false,
  verdicts: true,
  pieces: 0,
  par: [3, 6],
};

/**
 * M10 Part B: Raw. Nobody is cleared by one line; the culprit's lie is heard
 * and caught (`catchTheLie`). The pages still conclude, once two facts agree.
 */
export const DEDUCTION_RAW: DeductionDials = {
  ...DEDUCTION_PLAIN,
  directClears: 0,
  catchTheLie: true,
  confront: true,
  par: [5, 7],
  // Beat's slack scaled to Raw's par is five calls; three keeps the budget
  // near ten, so the clock matters gently on the first night (spec Part B).
  extraSlack: -2,
};

/** Coddled: Raw's night with a fourth suspect, and the method to show. */
export const DEDUCTION_CODDLED: DeductionDials = {
  ...DEDUCTION_RAW,
  par: [6, 9],
  extraSlack: 0,
};

export const DEDUCTION_POACHED: DeductionDials = {
  ...DEDUCTION_PLAIN,
  directClears: 1,
  secretLies: true,
  meansLie: true,
  verdicts: false,
  pieces: 0.3,
  par: [5, 9],
};

export const DEDUCTION_SOFT: DeductionDials = {
  ...DEDUCTION_POACHED,
  anchorTimed: 0.5,
  culpritChains: true,
  culpritDepth: 3,
  pieces: 0.5,
  par: [6, 11],
};

export const DEDUCTION_MEDIUM: DeductionDials = {
  ...DEDUCTION_SOFT,
  companions: [1, 1],
  strangers: 1 / 3,
  culpritDepth: 4,
  pieces: 0.6,
  par: [8, 14],
  // M14: the design test is held per case type now. A robbery or a
  // disappearance at Medium and Hard-boiled ran the reasoning player out of
  // night a call short of it one time in five (docs/33-m14-notes.md).
  typeSlack: { robbery: 1, missing: 1 },
};

export const DEDUCTION_HARD: DeductionDials = {
  ...DEDUCTION_MEDIUM,
  companions: [1, 2],
  anchorTimed: 0.6,
  strangers: 1 / 2,
  culpritDepth: 4,
  hypothesis: true,
  pieces: 0.7,
  par: [10, 22],
  extraSlack: 2,
};

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
   * M9: added to the tier's share of pieces (counts, absences, descriptions)
   * over conclusions. A dial, like the noise.
   */
  pieces: number;
  /** M9: alibi companions over what the tier deals. */
  extraLies: number;
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
/** The eight tropes before M14: what the untiered case draws from, and nothing else. */
export const LEGACY_TROPES: Id[] = ALL_TROPES.slice();
/** M14: the mundane three, every trope of each. */
const MUNDANE_TROPES: Id[] = [
  'pet-left-open',
  'pet-taken',
  'pet-followed',
  'item-borrowed',
  'item-pawned',
  'item-hidden',
  'item-mislaid',
  'the-affair',
  'the-secret',
  'the-business',
];
/**
 * M14: the robbery and missing tropes a small tier can deal. `left` asks where
 * and why and never who, and a tier below Medium asks neither, so it waits.
 */
const SMALL_OTHER: Id[] = ['inside-job', 'payroll', 'taken'];
const ALL_TYPES: CaseType[] = ['murder', 'robbery', 'missing', 'lost-pet', 'lost-item', 'affair'];
/**
 * M14 §1.5, the designer: "too much murder". Every tier deals every type, and
 * murder is about a third of it.
 */
export const CASE_MIX: Record<CaseType, number> = {
  murder: 34,
  'lost-pet': 16,
  'lost-item': 16,
  affair: 16,
  robbery: 9,
  missing: 9,
};
const ALL_FIELDS: ReportField[] = ['who', 'how', 'why', 'when', 'where'];
const ALL_LEGS: ProofLeg[] = ['access', 'method', 'motive', 'signature'];

/* ------------------------------------------------------------- the tiers */

export const RAW: CaseShape = {
  tier: 0,
  name: 'Raw',
  rule: 'This time: three people, three rooms, and one name to put on the report.',
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
  caseTypes: ALL_TYPES,
  caseMix: CASE_MIX,
  tropes: [...MURDER_AT_SCENE, ...SMALL_OTHER, ...MUNDANE_TROPES],
  classicTropes: MURDER_AT_SCENE,
  reportFields: ['who'],
  methodGiven: true,
  proof: [],
  par: [4, 5],
  findable: 13,
  scaleSlack: true,
  lockedLevel: 1,
  deduction: DEDUCTION_RAW,
};

const { lockedLevel: _rawLevel, ...RAW_UNLOCKED } = RAW;

export const CODDLED: CaseShape = {
  ...RAW_UNLOCKED,
  tier: 1,
  name: 'Coddled',
  rule: 'This time: four people, and the report asks how it was done.',
  suspects: 4,
  places: 4,
  reportFields: ['who', 'how'],
  methodGiven: false,
  proof: ['method'],
  par: [5, 6],
  findable: 17,
  deduction: DEDUCTION_CODDLED,
};

export const POACHED: CaseShape = {
  ...CODDLED,
  tier: 2,
  deduction: DEDUCTION_POACHED,
  name: 'Poached',
  rule: 'This time: somebody else is lying too.',
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
  deduction: DEDUCTION_SOFT,
  name: 'Soft-boiled',
  rule: 'This time: the coroner gives an hour, not a half hour, and the scene can lie.',
  coronerWidth: 2,
  anchorsRequired: 1,
  tropes: [...MURDER_TROPES, ...SMALL_OTHER, ...MUNDANE_TROPES],
  classicTropes: MURDER_TROPES,
  proof: ['method', 'access', 'signature'],
  par: [7, 8],
  findable: 26,
};

export const MEDIUM: CaseShape = {
  tier: 4,
  deduction: DEDUCTION_MEDIUM,
  name: 'Medium',
  rule: 'This time: more than one of them had a reason, and a reason is not proof.',
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
  caseTypes: ALL_TYPES,
  caseMix: CASE_MIX,
  tropes: [...ALL_TROPES, ...MUNDANE_TROPES],
  classicTropes: ALL_TROPES,
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
  deduction: DEDUCTION_HARD,
  name: 'Hard-boiled',
  rule: 'This time: the one paying you might have done it.',
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
  caseTypes: ALL_TYPES,
  caseMix: CASE_MIX,
  tropes: [...ALL_TROPES, ...MUNDANE_TROPES],
  classicTropes: ALL_TROPES,
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
  rule: 'This time: eight people, eight rooms, and three of them lying about the half hour.',
  suspects: 8,
  places: 8,
  watched: [4, 5],
  innocentSecrets: 7,
  par: [14, 18],
  findable: 44,
  deduction: { ...DEDUCTION_HARD, par: [12, 28] },
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
  pieces: -0.1,
  extraLies: 0,
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
  pieces: 0,
  extraLies: 0,
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
  pieces: 0.1,
  extraLies: 1,
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
  pieces: 0.15,
  extraLies: 1,
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

/**
 * M9 polish: a tiered case's slack — the ladder's, plus the tier's
 * `extraSlack` (Hard-boiled). The no-options case never comes here, so its
 * budgets are byte for byte what they were.
 */
export function logicSlackFor(
  shape: CaseShape,
  ladder: Ladder,
  par: number,
  walk: number = par,
  type?: CaseType,
): number {
  // Shorter nights: where slack scales with par, it scales with the size of
  // the game — the par route walked the M9 way (\`SolveSummary.walk\`) — so
  // the budget comes down by exactly the calls the night no longer spends.
  const ded = deductionOf(shape);
  return slackFor(shape, ladder, walk) + (ded.extraSlack ?? 0) + (type !== undefined ? (ded.typeSlack?.[type] ?? 0) : 0);
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
export function describeDials(d: Dials, opts: { targets?: boolean } = {}): string {
  const s = d.shape;
  const l = d.ladder;
  const pct = (x: number): string => `${Math.round(x * 100)}`;
  // A tiered case is held to the deduction dials' par (M9), the plain path to the shape's.
  const par = d.plain ? s.par : deductionOf(s).par;
  // docs/38: the curtain prints the night's own par and budget; the dials'
  // targets (a par band, a level's slack) would be two more numbers that
  // disagree with it, so it leaves them out.
  const targets = opts.targets !== false;
  return (
    `${s.name} (${s.suspects} suspects, ${s.places} places, ${s.innocentSecrets} secrets, ` +
    `coroner ${s.coronerWidth / 2 === 0.5 ? 'half an hour' : `${s.coronerWidth / 2}h`}` +
    `${targets ? `, par ${par[0]}–${par[1]}` : ''}) at ${l.name} (level ${l.level}${targets ? `, slack ${l.slack}` : ''}, ` +
    `noise ${pct(l.noiseRatio[0])}–${pct(l.noiseRatio[1])}%, ` +
    `depth ${l.branchDepth[0] === l.branchDepth[1] ? l.branchDepth[0] : `${l.branchDepth[0]}–${l.branchDepth[1]}`}, ` +
    `${l.corroboration}${l.legacy ? ', pre-M7 dials' : ''})`
  );
}

/**
 * M9: the logic-game dials a shape carries, or its tier's when it carries
 * none (a shape object built before M9). A custom shape takes Hard-boiled's.
 */
export function deductionOf(shape: CaseShape): DeductionDials {
  if (shape.deduction) return shape.deduction;
  const t = shape.tier;
  if (t === 0) return DEDUCTION_RAW;
  if (t === 1) return DEDUCTION_CODDLED;
  if (t === 2) return DEDUCTION_POACHED;
  if (t === 3) return DEDUCTION_SOFT;
  if (t === 4) return DEDUCTION_MEDIUM;
  return DEDUCTION_HARD;
}
