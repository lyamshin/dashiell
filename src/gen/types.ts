/**
 * Dashiell — Milestone 2b data model.
 *
 * Everything here is JSON-serializable. No classes, no functions, no undefined
 * that matters: a `Case` round-trips through `JSON.stringify` unchanged.
 *
 * Changes from M1: the map is gone. Places are a deck of six cards with no
 * adjacency between them; what matters is whether a place is watched. Time is
 * pinned by anchors rather than by the coroner. Clues are selected into a
 * small findable graph rather than dumped.
 *
 * Changes from M2: no clue names two subjects, so the spine is longer and the
 * hand is bigger; the budget is computed from par rather than fixed; a secret
 * activity gets one branch however many people share it.
 */

import type { CaseShape, Ladder } from './shape.js';

/** 0..11. Tick 0 is 6:00 PM, tick 11 is 11:30 PM. Half-hour steps. */
export type Tick = number;

export type Id = string;

export const TICKS = 12;

/** M7: 1 Beat, 2 Precinct, 3 Homicide, 4 The DA's Office. */
export type Difficulty = 1 | 2 | 3 | 4;

export type PlaceKind = 'private' | 'semi' | 'public';

export type FixtureRole =
  | 'bartender'
  | 'doorman'
  | 'newsstand'
  | 'counterman'
  | 'ticket-taker'
  | 'elevator-man'
  | 'landlady'
  | 'beat-cop'
  | 'cabbie'
  | 'druggist';

export interface Place {
  id: Id;
  /** The full name. Printed once, in the Places section of the sheet. */
  name: string;
  /** "the speakeasy", "Kaplan's", "the benches". Everything else uses this. */
  shortName: string;
  kind: PlaceKind;
  /** Who is posted here and sees everyone. Absent means unwatched. */
  watcher?: FixtureRole;
  objects: Id[];
  /** The victim's own address. Exactly one drawn place has this. */
  isResidence: boolean;
  /**
   * Close enough to the scene that a loud method is audible from here. Two
   * places per case, chosen when the scene is chosen.
   */
  nearScene: boolean;
}

export interface GameObject {
  id: Id;
  name: string;
  homePlace: Id;
}

export interface Secret {
  type: string;
  label: string;
  description: string;
  cells: { tick: Tick; place: Id }[];
  partnerId?: Id;
}

export interface Motive {
  type: string;
  description: string;
}

export interface Person {
  id: Id;
  /** Given name and surname. Printed once, in Dramatis Personae. */
  name: string;
  /** What everything after the first mention calls them. */
  surname: string;
  role: string;
  kind: 'victim' | 'suspect' | 'fixture';
  /** Which archetype card this person was drawn from. Suspects and victim. */
  archetypeId?: Id;
  /** Which relationship card ties them to the victim. Suspects only. */
  relationshipId?: Id;
  relationshipToVictim?: string;
  /** Fixtures only. */
  fixtureRole?: FixtureRole;
  secret?: Secret;
  /**
   * The killer's `secret` is always the murder, so a killer who also carries a
   * pool secret needs somewhere to put it. Innocents never have one.
   */
  coverSecret?: Secret;
  motive?: Motive;
  isKiller: boolean;
  /** Where the detective finds this person the next day. Not set for the victim. */
  foundAt?: Id;
  /** The one who hired Dashiell. Might be the killer. */
  isClient?: boolean;
  /** Resolved, never a hint. Always agrees with the pool the name came from. */
  gender?: 'm' | 'f';
  /** M5. Everything the world knows about this person, tagged by layer. */
  dossier?: Dossier;
}

export interface Method {
  id: Id;
  name: string;
  noise: 0 | 1 | 2;
  evidenceObjectId: Id;
  bodyEvidence: string;
  /** Where the weapon lived, and by when the killer had to have been there. */
  accessRequirement: { place: Id; beforeTick: Tick };
}

export type AnchorTrace =
  /** Only those present know X (how the fight ended, what song played). */
  | { kind: 'knowledge'; description: string }
  /** A reliable person notes who was present at exactly this tick. */
  | { kind: 'sighting' }
  /** A physical trace on those present (wet coat, plaster dust, ink). */
  | { kind: 'mark'; description: string }
  /** Something started or stopped; those nearby can time events by it. */
  | { kind: 'sound'; description: string };

export interface Anchor {
  templateId: Id;
  name: string;
  /** Absent means it happens across the whole neighborhood. */
  placeId?: Id;
  ticks: Tick[];
  /** For a walking anchor (the beat cop): where he is at each of `ticks`. */
  route?: Id[];
  traces: AnchorTrace[];
  /** "just as the El went over" — how a clue times something against this. */
  timing: string;
  /** "just after the lesson stopped" — at the moment the anchor marks. */
  highTiming: string;
  /**
   * A plain fact about the anchor at the murder tick, for the scene report.
   * States what happened and when; never what it means. `{T}` is the time.
   */
  sceneFact: string;
  /**
   * The anchor is loud enough to bury a noise. When the anchor that times the
   * scene masks, nobody hears the killing and no clue claims anybody did.
   */
  masks: boolean;
}

export interface Schedule {
  personId: Id;
  truth: (Id | null)[];
  claimed: (Id | null)[];
  claimedCompanion: (Id | null)[];
  lies: Tick[];
}

export interface Observation {
  observerId: Id;
  subjectId: Id;
  place: Id;
  tick: Tick;
  withheld: boolean;
}

export type ClueSource =
  | { type: 'person'; personId: Id; topic: string }
  | { type: 'place'; placeId: Id };

export type ClueKind =
  | 'observation'
  /** A named alibi companion refusing the alibi. The one clue kind whose
   *  source may be lying about that tick themselves: denying that you were
   *  with somebody costs you nothing and admits nothing. */
  | 'denial'
  | 'physical'
  | 'morgue'
  | 'document'
  | 'overheard'
  | 'anchor'
  | 'scene'
  | 'client';

export type ClueRole = 'spine' | 'corroboration' | 'noise' | 'disqualifier';

export interface Clue {
  id: Id;
  kind: ClueKind;
  source: ClueSource;
  establishes: Fact[];
  /**
   * What the clue says on a page: the hours in it spoken the way people say
   * hours (§A.3). This is what the exchange quotes and what a find card
   * carries.
   */
  text: string;
  /**
   * The same sentence with the clock faces left in, for the surfaces that are
   * records rather than prose: the truth sheet and the notebook. Set on every
   * clue; a clue with no hour in it reads the same either way.
   */
  textRecord?: string;
  /** Where the clue is obtained: the place, or where the person is found. */
  place: Id;
  /** Other findable clues this one points at. Empty in the candidate pool. */
  leadsTo: Id[];
  role: ClueRole;
  branchId?: Id;
  /** The anchor this clue leans on to fix a time, if any. */
  anchorId?: Id;
  /** The innocent whose secret this clue is about. Every noise clue has one. */
  aboutSecretOf?: Id;
}

export type Fact =
  | { kind: 'personAt'; personId: Id; place: Id; tick: Tick }
  | { kind: 'personNotAt'; personId: Id; place: Id; tick: Tick }
  | { kind: 'objectMissing'; objectId: Id; fromPlace: Id }
  | { kind: 'noiseAt'; place: Id; tick: Tick }
  /** The coroner's four-tick window. */
  | { kind: 'timeOfDeath'; ticks: Tick[] }
  | { kind: 'hasMotive'; personId: Id; motiveType: string }
  | { kind: 'hadAccess'; personId: Id; methodId: Id }
  /** The victim was still alive at the end of this tick. */
  | { kind: 'victimAliveAt'; tick: Tick }
  /** The victim was already dead by the end of this tick. */
  | { kind: 'victimDeadBy'; tick: Tick }
  | { kind: 'methodEvidence'; methodId: Id }
  /** This person's secret is accounted for and is not the murder. */
  | { kind: 'secretExplained'; personId: Id; secretType: string };

/* ------------------------------------------------------------------ M5 --
 *
 * Dossiers, the act, and the client's brief. The world is built before the
 * puzzle: every person is somebody in particular, the victim had a life and
 * was found by somebody, and the client walked in for a reason.
 * ----------------------------------------------------------------------- */

/** The broad thing a person wants out of life. Never the crime's motive. */
export type Want =
  | 'money'
  | 'respectability'
  | 'to-be-left-alone'
  | 'to-get-out'
  | 'to-keep-a-marriage'
  | 'to-be-feared'
  | 'to-be-forgiven'
  | 'to-be-somebody'
  | 'to-keep-what-they-have';

/** How this person stands to the victim, with the specific that makes it real. */
export interface Tie {
  relationshipId: Id;
  /** The relationship, with the victim named: "Sweeney’s tenant". */
  text: string;
  /** The backstory: one plain sentence with a specific in it. */
  backstory: string;
  /**
   * The same sentence in this person's own mouth, when the card carries one.
   * The third person serves the sheet and the notebook; the first serves the
   * briefing, where the client is in the room saying it.
   */
  backstoryFirst?: string;
  since?: string;
  /** A third party named in the backstory. An id into `case.mentions`. */
  third?: Id;
}

/** How a fact about a person can be learned. See the layer table in the spec. */
export type DossierLayer = 0 | 1 | 2 | 3;

export interface DossierFact {
  kind:
    | 'age'
    | 'gender'
    | 'profession'
    | 'detail'
    | 'want'
    | 'tie'
    | 'since'
    | 'third'
    | 'secret-hint';
  text: string;
  layer: DossierLayer;
}

export interface Dossier {
  /** Drawn from the archetype's age band. */
  age: number;
  /** Resolved, never a hint. */
  gender: 'm' | 'f';
  /**
   * What they do, and what it looks like up close.
   *
   * Hone 2 §Track B: `detailFirst` is the detail in their own mouth, and
   * `prompt` is the question it answers — "What do you do?" Both are set only
   * where the archetype carries a written first-person form, and the briefing
   * is the only thing that renders them, because only the client is in the
   * room to say it.
   */
  profession: { role: string; detail: string; detailFirst?: string; prompt?: string };
  want: Want;
  tie: Tie;
  /** Two or three plain sentences they would say about themselves. */
  selfAccount: string[];
  layers: DossierFact[];
}

/**
 * Somebody a backstory names who is not in the case. Generated once and used
 * by that name everywhere after; the correspondence checker counts a mention
 * as a known name.
 */
export interface Mention {
  id: Id;
  name: string;
  surname: string;
  gender: 'm' | 'f';
  role: string;
  /** One plain sentence introducing them. */
  text: string;
}

/** What the precinct did about it before Dashiell was called. */
export type Precinct =
  | 'came-and-went'
  | 'called-it-a-fall'
  | 'took-a-statement'
  | 'not-yet-called'
  | 'closed-it-in-an-hour';

export interface Discovery {
  foundById: Id;
  foundAt: Id;
  foundTick: Tick;
  foundText: string;
  /**
   * The same sentence in the finder's own mouth, set only when the finder is
   * the client — "I found Sweeney at the suite at half past eleven". The
   * briefing is the only thing that renders it, and only the client speaks.
   */
  foundTextFirst?: string;
  /**
   * §A.1. The question Dashiell asks that this sentence, and only this
   * sentence, answers — "Where did you find {V}, and when?" Written by the
   * same hand as `foundTextFirst` and set only when the client is the finder,
   * because only a sentence somebody says can be asked for.
   */
  foundPrompt?: string;
  precinct: Precinct;
}

/** Who saw the missing person last, and where. The `missing` form of discovery. */
export interface LastSeen {
  byId: Id;
  place: Id;
  tick: Tick;
  text: string;
  /** The same, in the client's mouth, when the client is the one who saw them. */
  textFirst?: string;
  /** §A.1. The question `textFirst` answers, and nothing else does. */
  prompt?: string;
}

export interface VictimBio extends Dossier {
  /** Where they stood in the neighbourhood, in one plain sentence. */
  standing: string;
  /** Murder and robbery: the body, or the empty shelf, and who found it. */
  discovery?: Discovery;
  /** Missing: who saw them last, and when. */
  lastSeen?: LastSeen;
}

export type Purpose =
  | 'find-the-killer-police-wont'
  | 'clear-my-name'
  | 'keep-it-quiet'
  | 'find-it-before-the-cops'
  | 'get-it-back'
  | 'bring-them-home'
  | 'make-sure-they-stay-gone'
  | 'settle-a-debt-with-the-dead';

export interface ClientBrief {
  purpose: Purpose;
  /** The purpose as one plain sentence. */
  purposeText: string;
  /** The same sentence in the client's own mouth, for the briefing. */
  purposeTextFirst: string;
  /**
   * §A.1. The question `purposeTextFirst` answers: "Why come to me instead of
   * the precinct?" One of the three the briefing is allowed to ask, drawn per
   * purpose so forty seeds do not ask it the same way.
   */
  purposePrompt: string;
  /** What it costs them to hire somebody, in one plain sentence. */
  cost: string;
  /** The same, in the client's own mouth. */
  costFirst: string;
  /** What the client states at the briefing. True unless the purpose says not. */
  tells: Fact[];
  /** The same, as sentences, in the same order. */
  tellTexts: string[];
  /** What the client knows and does not say. Their own secret, at least. */
  withholds: Fact[];
  withholdTexts: string[];
  /**
   * Whom the client suspects, and why.
   *
   * `reason` names the suspected person twice where the motive template does —
   * "Grasso blamed Sweeney for the ruin of Grasso's business" — because the
   * sheet reads a line at a time and a pronoun in it would have no antecedent.
   * `reasonSpoken` is the same fact as somebody would actually say it, with the
   * second mention as a pronoun. It is still the third person: the client is
   * talking about somebody else.
   */
  points: { personId: Id; reason: string; reasonSpoken: string; honest: boolean };
  /** §A.1. The question the pointer answers: "Who do you think did it?" */
  pointerPrompt: string;
  /** The client's account of their own night, from their claimed schedule. */
  ownEvening: string[];
}

export type CaseType = 'murder' | 'robbery' | 'missing';

/** What the report still has to work out. Givens are not asked. */
export type Unknown =
  | 'who'
  | 'why'
  | 'when'
  | 'where'
  | 'how'
  | 'entry'
  | 'whereabouts'
  | 'fate'
  | 'goods';

export interface Givens {
  facts: Fact[];
  text: string[];
}

export type Entry = 'key' | 'window' | 'let-in' | 'never-left' | 'combination';

/**
 * The one thing the case is about, separated from the machinery that does not
 * care what it is. Schedules, secrets, lies, observations, anchors, selection
 * and par all constrain "the actor alone at the place at the tick"; the act
 * says what happened there.
 */
export interface Act {
  type: CaseType;
  tropeId: Id;
  /** The one who did it. For `left`, the person who went. */
  actorId: Id;
  tick: Tick;
  place: Id;
  /** Murder. */
  method?: Method;
  /** Murder: where the body was found, when that is not where it happened. */
  bodyFoundAt?: Id;
  /** Robbery. */
  taken?: GameObject;
  entry?: Entry;
  /** Robbery: the pawnshop, the locker, wherever the goods went. */
  goodsWentTo?: Id;
  /** Missing. */
  whereabouts?: Id | 'gone';
  fate?: 'left' | 'taken' | 'dead';
  givens: Givens;
  /** Exactly what the report asks. */
  unknowns: Unknown[];
}

export interface Solution {
  killerId: Id;
  methodId: Id;
  motiveType: string;
  murderTick: Tick;
  murderPlaceId: Id;
}

/** Clue ids that carry each leg of the proof. Findable clues only. */
export interface DeductionPath {
  timeOfDeath: Id[];
  /** The two anchors the time of death hangs on. */
  timeOfDeathAnchors: Id[];
  exculpations: Record<Id, Id[]>;
  inculpation: Id[];
  access: Id[];
  method: Id[];
  motive: Id[];
}

export interface Case {
  seed: number;
  attempts: number;
  difficulty: Difficulty;
  detectiveName: string;
  neighborhood: string;
  places: Place[];
  objects: GameObject[];
  people: Person[];
  method: Method;
  anchors: Anchor[];
  /** The two places within earshot of the scene. */
  nearScene: Id[];
  /**
   * The anchor that times the scene was loud enough to bury the killing. When
   * true no clue reports hearing it; when false no clue says it was covered.
   */
  soundMasked: boolean;
  schedules: Schedule[];
  observations: Observation[];
  /** The full pool. This is the truth, and what a report is graded against. */
  candidates: Clue[];
  /** Exactly what the player can find. 34 ± 2. */
  findable: Clue[];
  /** The three opening clues, always in the spine. */
  starting: Id[];
  clientId: Id;
  par: number;
  /** Spare actions over par, by difficulty. */
  slack: number;
  /** Always `par + slack`. */
  budget: number;
  coronerWindow: [Tick, Tick];
  solution: Solution;
  deduction: DeductionPath;
  /* --- M5 ------------------------------------------------------------- */
  /** What the case is about, and what the report will ask. */
  act: Act;
  /** Third parties named in backstories. Never in `people`. */
  mentions: Mention[];
  /** The victim's life, and how the case came to light. */
  victimBio: VictimBio;
  /** Why the client walked in, what they say and what they keep back. */
  clientBrief: ClientBrief;
  /**
   * 10–16 plain declarative sentences, each with who says it and how they say
   * it. The model of the plain register.
   */
  briefing: BriefingLine[];
  /**
   * The same sentences as bare third-person strings, in the same order: what
   * the truth sheet prints and what the notebook writes down. The page reads
   * `briefing`; everything that files the case away reads this.
   */
  briefingText: string[];
  /* --- M7 ------------------------------------------------------------- */
  /**
   * The size of the case and the dials of the night, when it was dealt with
   * options. Absent on a no-options case, which is Hard-boiled on the pre-M7
   * dials for its difficulty; `dialsOf` reads either back.
   */
  shape?: CaseShape;
  ladder?: Ladder;
}

/**
 * One sentence of the briefing.
 *
 * `text` is the record's form — third person, the client's own name in it —
 * and is what the truth sheet and the notebook keep. `spoken` is the form that
 * goes on page one when the client says it out loud, which is the first person
 * where the sentence is about them and the same words where it is not. A
 * narration line has no spoken form, because Dashiell is the one saying it.
 */
export interface BriefingLine {
  text: string;
  spoken: string | null;
  speaker: 'client' | 'narration';
  /**
   * §A.1. The question Dashiell would ask that this sentence answers, and that
   * no other sentence of this briefing answers. Two or three of a briefing's
   * sentences carry one — the discovery, the purpose, the pointer — and the
   * rest run on as the client's own turn. A question that could precede any
   * answer is a prod, not a prompt, and is left undefined.
   */
  prompt?: string;
  /**
   * §A.2. The spoken form split where a person would breathe: one to three
   * short sentences carrying the same facts, at least one of them six words or
   * fewer where the sense allows. The page uses it when its short-sentence
   * share is under target; correspondence is checked on the joined form.
   */
  breath?: string[];
}

/** "Salvatore Vitale" -> "Vitale". Names are always given-then-family. */
export function surnameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? fullName) as string;
}

/** The hours as words, for the six o'clock to half past eleven of an evening. */
const SPOKEN_HOURS = ['six', 'seven', 'eight', 'nine', 'ten', 'eleven'] as const;

/**
 * The same hour as somebody says it out loud: "half past eleven", not
 * "11:30 PM". Nobody in a chair at midnight reads a clock face aloud, and the
 * briefing's first-person sentences are somebody talking.
 *
 * The evening is twelve half hours long, so the set of strings this can return
 * is closed and small, and the correspondence checker reads it back.
 */
export function spokenClock(tick: Tick): string {
  const hour = SPOKEN_HOURS[Math.floor(tick / 2)] ?? 'eleven';
  return tick % 2 === 0 ? `${hour} o’clock` : `half past ${hour}`;
}

/** "6:00 PM" .. "11:30 PM" */
export function clock(tick: Tick): string {
  const minutes = 18 * 60 + tick * 30;
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m === 0 ? '00' : String(m)} PM`;
}

/** Every clock string the evening can print, with the tick it means. */
const TICK_OF_CLOCK: Map<string, Tick> = new Map(
  Array.from({ length: TICKS }, (_, t) => [clock(t as Tick), t as Tick]),
);

/** "9:30 PM" back to the tick it is, or null when it is not one of ours. */
export function tickOfClock(text: string): Tick | null {
  return TICK_OF_CLOCK.get(text.trim()) ?? null;
}

const CLOCK_IN_TEXT = /\b\d{1,2}:\d{2}\s(?:AM|PM)\b/g;

/**
 * A sentence with the clock faces taken out of it (Hone 1 §A.3).
 *
 * Rule 9 of the golden: time is a fact of the world, never a clock reading as
 * a mechanic. "The coroner puts it between 9:30 PM and 11:00 PM" is the
 * generator's schedule table showing through the prose; "between half past
 * nine and eleven" is the same fact said by somebody who was in the room.
 *
 * Every hour the evening can print is one of twelve, so the swap is a lookup
 * and never a parse. What is left is smoothed at the one place English does it
 * anyway: the far end of a range drops its "o'clock", because "between half
 * past nine and eleven o'clock" is a phrase nobody says. The correspondence
 * checker reads both forms back, the bare hour in a range included.
 */
export function speakTimes(text: string): string {
  const swapped = text.replace(CLOCK_IN_TEXT, (m) => {
    const tick = tickOfClock(m);
    return tick === null ? m : spokenClock(tick);
  });
  return swapped.replace(
    /\b(between|from) (half past (?:six|seven|eight|nine|ten|eleven)|(?:six|seven|eight|nine|ten|eleven) o’clock) (and|to) (six|seven|eight|nine|ten|eleven) o’clock\b/g,
    '$1 $2 $3 $4',
  );
}

/**
 * Spare actions over par, by difficulty. The budget is `par + slack`: a case
 * that costs more to solve is given more room to solve it in, and the dial is
 * how little room that is.
 *
 * M7: these are the dials of a no-options case, which is Hard-boiled. Levels
 * 1 to 3 are the pre-M7 values, untouched; level 4, the DA's Office, is new.
 * Anything dealt with a shape or a ladder reads `src/gen/shape.ts` instead.
 */
export const SLACK: Record<Difficulty, number> = { 1: 8, 2: 6, 3: 4, 4: 3 };

/** Par outside this range is not a case: too small, or too long an evening. Hard-boiled's. */
export const PAR_FLOOR = 9;
export const PAR_CEILING = 18;

/** How many findable clues a case deals, and the tolerance on it. */
export const FINDABLE_TARGET = 34;
export const FINDABLE_TOLERANCE = 2;

/** The spine may not be longer than this, opening three included. */
export const SPINE_CAP = 15;

/** Noise, disqualifiers included, as a share of the findable set. */
export const NOISE_RATIO: [number, number] = [0.35, 0.45];

/** How deep a noise branch runs — noise clues before its disqualifier. */
export const BRANCH_DEPTH: Record<Difficulty, [number, number]> = {
  1: [1, 2],
  2: [1, 3],
  3: [2, 3],
  4: [2, 3],
};

/**
 * How many branches a case wants, by difficulty: shallow and many at 1, deep
 * and few at 3. Never fewer than three, which is a cast rejection instead.
 */
export const BRANCH_COUNT: Record<Difficulty, number> = { 1: 5, 2: 4, 3: 3, 4: 5 };
export const BRANCH_COUNT_FLOOR = 3;

/** How many innocents lie about the murder tick, by difficulty. */
export const M_LIARS: Record<Difficulty, [number, number]> = {
  1: [2, 2],
  2: [2, 3],
  3: [3, 3],
  4: [3, 3],
};
