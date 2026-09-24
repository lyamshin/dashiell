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
import type { Talk } from './data/character.js';

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
  | 'client'
  /** M9: somebody's answer when asked about somebody else. True, as far as they could see. */
  | 'testimony'
  /** M9: somebody's own evening, as they tell it. May be false: people lie about themselves. */
  | 'account'
  /** M9: what a posted watcher can say about their own door: who did not come in, and how many did. */
  | 'watch'
  /** M9: when something the whole block times things by happened. */
  | 'timing';

/**
 * M9 adds `testimony`: a testimony or account clue that is findable (anybody
 * can be asked anything) but is not on the par route. Par-route clues are
 * `spine` whatever their kind.
 */
export type ClueRole = 'spine' | 'corroboration' | 'noise' | 'disqualifier' | 'testimony';

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
  /**
   * M9: the same facts as one plain line for the notebook's rules list —
   * "Hanrahan: the third floor, 10:00 PM to 10:30 PM. Kreuzer saw her." No
   * flavour and no conclusion, the source last. Set on every clue of a case
   * dealt with a tier; absent on a no-options case.
   */
  rule?: string;
  /**
   * M9 polish: `rule`, one fact at a time, for the confront picker. Each part
   * is one statement that stands on its own ("Sirkin: the subway kiosk,
   * 6:00–7:00", "Sirkin was alive until at least 8:00") with the indices of
   * the facts in `establishes` it states; every fact with words is in exactly
   * one part.
   */
  ruleParts?: import('./logic/lines.js').RulePart[];
  /** M9, testimony only: the person the source was asked about. */
  about?: Id;
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
  | { kind: 'secretExplained'; personId: Id; secretType: string }
  /* --- M9: pieces, not conclusions. --------------------------------------- */
  /**
   * Sequence. The person was at the place when the anchor happened ("just as
   * the El went over"), at one of the anchor's ticks, with no clock time. It
   * lands on the grid once an `anchorAt` for the same anchor is held; until
   * then it belongs in a margin row under the anchor's name.
   */
  | { kind: 'personAtAnchor'; personId: Id; place: Id; anchorId: Id }
  /** When an anchor happens: every tick it happens at tonight. */
  | { kind: 'anchorAt'; anchorId: Id; ticks: Tick[] }
  /**
   * Identity. Somebody matching the description was at the place at the tick.
   * The witness did not know them. Exactly one of `description.matches` was
   * there.
   */
  | { kind: 'describedAt'; description: Description; place: Id; tick: Tick }
  /**
   * Absence. Nobody but `except` was at the place at any of the ticks. The
   * watcher posted there is always in `except`, and always first.
   */
  | { kind: 'absentFrom'; place: Id; ticks: Tick[]; except: Id[] }
  /**
   * Numbers. Exactly `count` people besides the posted watcher were at the
   * place at the tick. Only dealt where every one of them is a suspect.
   */
  | { kind: 'countAt'; place: Id; tick: Tick; count: number }
  /** The two were in the same place (which, unsaid) at each of the ticks. */
  | { kind: 'together'; personIds: [Id, Id]; ticks: Tick[] }
  /** The two were never in the same place at any of the ticks. */
  | { kind: 'apart'; personIds: [Id, Id]; ticks: Tick[] }
  /**
   * Conditional, the premise: anybody at the place at any of the ticks knows
   * the thing (how the fight ended, what the lesson was playing).
   */
  | { kind: 'anchorKnowledge'; anchorId: Id; place: Id; ticks: Tick[]; knowledge: string }
  /** Conditional, the test: whether this person knows the anchor's thing. */
  | { kind: 'knows'; personId: Id; anchorId: Id; knows: boolean }
  /** Who knows whom, as the first of the two puts it: "Never heard of her." */
  | { kind: 'acquainted'; personIds: [Id, Id]; strength: Acquaintance }
  /**
   * A self-account: the person says they were at the place at the ticks and,
   * with `with`, in that person's company. Soft: it stands only when nothing
   * contradicts it and something corroborates it. It may be false.
   */
  | { kind: 'claims'; personId: Id; place: Id; ticks: Tick[]; with?: Id };

/* ------------------------------------------------------------------ M9 --
 *
 * The contract for the engine. Everything below is set only on a case dealt
 * with a tier (`generateCase(seed, { tier, level })`); a no-options case has
 * none of it. `docs/20-m9-gen-notes.md` is the long form.
 * ----------------------------------------------------------------------- */

/** How far apart two places are: 0 the same block, 1 a walk, 2 across the neighbourhood. */
export type Distance = 0 | 1 | 2;

/** The words for a distance class, for the places list and the rules. */
export const DISTANCE_TEXT: Record<Distance, string> = {
  0: 'the same block',
  1: 'a walk',
  2: 'across the neighbourhood',
};

/**
 * Travel. Nobody is at two places across the neighbourhood from each other in
 * consecutive half hours. The same block and a walk cost nothing.
 */
export function canWalk(d: Distance): boolean {
  return d <= 1;
}

/** How well one person knows another. */
export type Acquaintance = 'name' | 'relation' | 'sight' | 'stranger';

/**
 * One edge of the acquaintance graph, directed: how `from` knows `to`, and
 * the words `from` uses for them. Every ordered pair of people in the case
 * has exactly one edge; the victim appears only as `to`.
 *
 * - `name`: "Nora Hanrahan". Can be asked about by name.
 * - `relation`: "my landlord", "Sweeney's secretary". Can be asked about by name.
 * - `sight`: "the tall one who drinks at the end of the bar". Knows the face,
 *   not the name: asked about the name, says so; a sighting comes as a
 *   description, with this `ref` in the witness's mouth.
 * - `stranger`: a description.
 */
export interface AcquaintanceEdge {
  from: Id;
  to: Id;
  strength: Acquaintance;
  /** Where the knowing comes from. */
  basis: 'tie' | 'secret' | 'trade' | 'regular' | 'place' | 'roll' | 'none';
  /** How `from` refers to `to`, in `from`'s own words. */
  ref: string;
}

/** What a stranger can see: man or woman, roughly how old, and the trade when it shows. */
export interface DescriptionFeatures {
  gender: 'm' | 'f';
  /** "in her thirties". Absent when the witness gives no age. */
  age?: string;
  /** "a longshoreman". Only when the trade shows (dossier layer 0). */
  trade?: string;
}

export interface Description {
  features: DescriptionFeatures;
  /** "a woman in her thirties". Lower case, with its article. */
  text: string;
  /**
   * Every suspect whose layer-0 dossier fits the features. The truth is one of
   * them; the solver reads it as "one of these was there".
   */
  matches: Id[];
  /**
   * Set only when `matches` is one person: the portrait component the engine
   * may add ("turning a coin over her knuckles"). Never set on a description
   * that fits two people, because a portrait detail would settle it.
   */
  portrait?: 'habit' | 'clothing' | 'trait';
}

/** Why a self-account is false for a span. Truth-sheet data, never shown. */
export type LieCover = 'crime' | 'means' | 'secret' | 'companion';

/** One false span of a self-account. */
export interface LieBlock {
  personId: Id;
  ticks: Tick[];
  /** What they say: where, and in whose company. */
  claimed: Id;
  with?: Id;
  /** Where they really were, tick by tick. */
  truth: Id[];
  cover: LieCover;
  /** The account clue this span is part of. */
  accountId: Id;
}

/**
 * What happens when the detective puts a real contradiction to a liar. Data
 * only; the engine renders it. `claims` is a second lie, itself
 * contradictable; `facts` is what an admission establishes, all of it true.
 */
export interface ConfrontResponse {
  kind: 'second-lie' | 'quiet' | 'admit' | 'hold' | 'withdraw';
  claims?: Extract<Fact, { kind: 'claims' }>;
  facts?: Fact[];
  /** What they say, plainly. */
  text: string;
  /** The notebook's one line for it. */
  rule: string;
  /** Findable clues that contradict a second lie. */
  contradictedBy?: Id[];
}

export interface Confrontation {
  personId: Id;
  /** The lie this is about. */
  lie: LieBlock;
  /**
   * Findable clues that contradict the lie, grouped: each inner list is one
   * independent way of showing it (a clue alone, or a chain). An innocent has
   * two or more. The culprit's are all chains.
   */
  contradictions: Id[][];
  /** On the first confrontation, and on the second. The culprit never admits. */
  responses: [ConfrontResponse, ConfrontResponse];
}

/** How a conclusion was reached: for the report's curtain and for the stats. */
export interface Derivation {
  /** What was concluded, in one plain line. */
  what: string;
  /** The findable clues it rests on. */
  rules: Id[];
  /**
   * Rounds of combining: 1 is a rule read straight off, 2 is two rules put
   * together, and so on up the chain.
   */
  depth: number;
  /** It needed a hypothesis tested: "if she was there, then …". */
  hypothesis: boolean;
}

/** What the solver found at generation. */
export interface SolveSummary {
  /** The clue ids of the cheapest rule set that solves the case: the par route's. */
  parRules: Id[];
  /** The culprit, from the par set. */
  culprit: Derivation;
  /** Each innocent kept away from the scene at the crime's half hour, from the par set. */
  cleared: Record<Id, Derivation>;
  /** The crime's half hour, from the par set. */
  crimeTick: Derivation;
  /** The deepest conclusion the par set needs. */
  depth: number;
  /** The par set needs a hypothesis tested. */
  hypothesis: boolean;
  /** Innocents that one findable rule on its own keeps away from the scene. */
  clearedByOne: Id[];
  /** Account spans on the par route, and how many of them are false. */
  accountSpans: number;
  falseSpans: number;
  /** Propagation rounds and hypothesis probes over the whole findable set. */
  rounds: number;
  probes: number;
  /**
   * Innocents whose confession the par route needs. Shorter nights: each is
   * one confrontation (one action, counted in par) and a second fact put in
   * the same visit, free; the par set holds two independent facts that break
   * the lie.
   */
  confessions: Id[];
  /**
   * Shorter nights: the par route walked the way M9 walked it — every account
   * its own question, every confession two confrontations. The tier's par
   * range (`DeductionDials.par`) bounds this number, so which cases are dealt
   * is what it was; `Case.par` is the shorter walk the night is budgeted on.
   * Absent on a case dealt before shorter nights, where it is `Case.par`.
   */
  walk?: number;
}

/** Everything M9 adds to a case. */
export interface Logic {
  /** Each place's block on a line of three; the distance is the difference. */
  blocks: Record<Id, 0 | 1 | 2>;
  acquaintance: AcquaintanceEdge[];
  /** Each suspect as a stranger would put it, and who else that fits. */
  descriptions: Record<Id, Description>;
  lies: LieBlock[];
  confrontations: Confrontation[];
  solve: SolveSummary;
  /**
   * M10 Part B (Raw and Coddled): par-route clues asked without a lead. The
   * question that catches the culprit's lie is on the page anyway (anybody
   * posted can be asked about anybody the detective can name) and carries no
   * mark, so that finding who can break the lie is the player's work. The
   * oracle, the checker and par's walk treat these as always open.
   */
  open?: Id[];
}

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
  /**
   * M11 §B.1: the person as a type fills them in — three to five details
   * (the drawn profession detail first), how they came to the work, and how
   * they talk. Each detail carries the layer it is learned at, as the facts
   * above do. Words only: the structure hash leaves this key out
   * (`src/gen/structure.ts`), because it was added after the baseline and no
   * id, tick or link hangs on it. The victim has none.
   */
  character?: DossierCharacter;
}

/** One line of a dossier's character: the record's sentence and the person's own. */
export interface DossierLine {
  /** Third person, with the surname: "Rafferty keeps the rent book in a drawer she locks." */
  text: string;
  /** In their own mouth: "The rent book’s in a drawer. The drawer’s locked." */
  first: string;
  /** 1: volunteered about themselves. 2: what other people say about them. */
  layer: 1 | 2;
}

export interface DossierCharacter {
  details: DossierLine[];
  history: { text: string; first: string };
  talk: Talk;
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
  | 'settle-a-debt-with-the-dead'
  /* M14: the mundane cases. */
  | 'find-the-pet'
  | 'find-the-thing'
  | 'before-they-notice'
  | 'tell-me-the-truth'
  | 'put-my-mind-at-rest';

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

export type CaseType = 'murder' | 'robbery' | 'missing' | 'lost-pet' | 'lost-item' | 'affair';

/** Every case type, in the order the sheet and the mix tables list them. */
export const CASE_TYPES: CaseType[] = ['murder', 'robbery', 'missing', 'lost-pet', 'lost-item', 'affair'];

/**
 * M14: the three mundane cases run on the machinery of the old three. A lost
 * pet and a lost item are thefts to the schedule and the solver — the owner is
 * alive and elsewhere, one thing went from one room at one half hour — and an
 * affair is a meeting: the suspected person is at the scene at the half hour
 * with the one the report asks for, alive before and after. Words differ by
 * type; the machine differs only by `machineOf`.
 */
export type Machine = 'murder' | 'theft' | 'missing' | 'meeting';

export function machineOf(type: CaseType): Machine {
  switch (type) {
    case 'murder':
      return 'murder';
    case 'robbery':
    case 'lost-pet':
    case 'lost-item':
      return 'theft';
    case 'missing':
      return 'missing';
    case 'affair':
      return 'meeting';
  }
}

/** Something went from where it was kept: a robbery, a lost pet, a lost item. */
export function isTheft(type: CaseType): boolean {
  return machineOf(type) === 'theft';
}

/** The three M14 cases, where nobody died and nothing criminal need have happened. */
export function isMundane(type: CaseType): boolean {
  return type === 'lost-pet' || type === 'lost-item' || type === 'affair';
}

/** What the affair turned out to be. The report never asks it; the ending tells it. */
export type Errand = 'affair' | 'night-class' | 'second-job' | 'surprise' | 'sick-relative' | 'business';

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

/** M14: the animals a lost-pet case deals. */
export type PetKind = 'dog' | 'cat' | 'parrot' | 'goat';

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
  /**
   * M14, affair: where the suspected person said they would be, and where the
   * night opens. They were there the half hour before and gone at the one
   * that matters.
   */
  claimedAt?: Id;
  /** M14, affair: what it really was. */
  errand?: Errand;
  /** M14, lost pet: what kind of animal, for the words ("dog", "cat"). */
  pet?: PetKind;
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
  /* --- M9 ------------------------------------------------------------- */
  /** The logic game: travel, who knows whom, the lies, confrontations, the solver's summary. */
  logic?: Logic;
  /* --- v2 (docs/35) --------------------------------------------------- */
  /** Dealt by the rewrite: the puzzle first, then the book. Absent on every v1 case. */
  engine?: 'v2';
  v2?: {
    graph: import('./v2/graph.js').DeductionGraph;
    book: import('./v2/book.js').Book;
  };
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
