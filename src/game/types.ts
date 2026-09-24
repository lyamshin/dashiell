/**
 * Milestone 3 — the game's own data model.
 *
 * Everything here is pure data. `src/gen/` produces the truth; this describes
 * a run through it. Nothing in `src/game/` touches the DOM, and nothing in
 * `src/gen/` knows this file exists.
 */

import type { Difficulty, Entry, Id, Unknown } from '../gen/types.js';
import type { CastSheet } from './voice/cast.js';
import type { ConfrontRecord } from './m9.js';

export type { Difficulty, Entry, Id, Unknown };
export type { CastSheet };

/** What the player can ask a person about. */
export type TopicRef =
  /** A person, by surname or given name. "the victim" resolves here too. */
  | { kind: 'person'; id: Id }
  | { kind: 'place'; id: Id }
  | { kind: 'object'; id: Id }
  | { kind: 'anchor'; id: Id }
  /** The person's own account of the night. Always answerable. */
  | { kind: 'evening' }
  /**
   * M5 §3. The person themselves: layer 1 of their dossier, in their own
   * mouth. Always answerable, one action the first time and free after.
   */
  | { kind: 'self' }
  /** Only the client has anything to say. */
  | { kind: 'hire' }
  /**
   * One exact topic string out of the generator, as printed on a thread.
   * Clicking a lead is precise; typing a surname is not.
   */
  | { kind: 'exact'; personId: Id; topic: string };

export type CommandKind =
  | 'go'
  | 'ask'
  | 'examine'
  | 'look'
  | 'notebook'
  | 'file'
  | 'help'
  | 'confront'
  | 'continue'
  | 'rundown'
  | 'recap';

export type Command =
  | { kind: 'go'; placeId: Id }
  | { kind: 'ask'; personId: Id; topic: TopicRef }
  /** `objectId` is set when the player named an object rather than the room. */
  | { kind: 'examine'; placeId: Id; objectId?: Id }
  | { kind: 'look' }
  | { kind: 'notebook' }
  | { kind: 'file' }
  | { kind: 'help' }
  /**
   * M9 §3: put a fact from the notebook to somebody. `clueId` is a clue in
   * hand; the generator's solver decides whether it breaks what they said.
   * `part` (M9 polish) is one of its `ruleParts`, typed `put x012 part 2 to Hauck`.
   */
  | { kind: 'confront'; personId: Id; clueId: Id; part?: number }
  /**
   * M10 §A.3: "Go on". The conversation (or the search) a page broke off after
   * three families of fact goes on, at no cost to the clock.
   */
  | { kind: 'continue' }
  /**
   * M11 §A.5: "Ask Hauck who's here". With the client in the room, the client
   * names who else is in it, the way the client knows them. Free, and once a
   * visit.
   */
  | { kind: 'rundown' }
  /**
   * M12 Part 2: "Go over what I have". The detective takes stock of what the
   * notebook holds, and what is still open. Free, anywhere but the office.
   */
  | { kind: 'recap' };

/**
 * M10 §A.3: what a page had still to tell when it stopped at three families.
 * A question keeps its person and its key; a search keeps its room.
 */
export interface Pending {
  kind: 'ask' | 'examine';
  placeId: Id;
  personId?: Id;
  /** The question's `askKey`, so asking it again goes on instead of reading back. */
  key?: string;
  topic?: TopicRef;
  objectId?: Id;
  clueIds: Id[];
}

/**
 * What the parser hands back when it cannot make a command. Always free.
 *
 * `absent-person` and `unknown-topic` carry enough for the reducer to reach
 * for a nothing-answer in the book's voice instead of a parser message.
 */
export interface ParseProblem {
  kind:
    | 'empty'
    | 'unknown-verb'
    | 'ambiguous'
    | 'unknown-noun'
    | 'incomplete'
    | 'absent-person'
    | 'unknown-topic';
  message: string;
  /** For `ambiguous`: what the player might have meant, as typed commands. */
  options?: string[];
  /** For `absent-person` and `unknown-topic`. */
  personId?: Id;
  /** For `unknown-topic`: what they tried to ask about. */
  topicText?: string;
}

export type ParseResult = { ok: true; command: Command } | { ok: false; problem: ParseProblem };

/**
 * Which slot of the page grammar (M4 §A.5) a run of prose came out of. The
 * `record` voice is the one case where a clue's flat text is on the page: no
 * utterance in the deck fit it and its own sentence is written about the
 * speaker rather than by them. Everything else dramatizes.
 */
export type ProseVoice =
  | 'transition'
  | 'arrival'
  | 'place'
  | 'presence'
  | 'approach'
  | 'exchange'
  | 'find'
  | 'monologue'
  | 'ambient'
  | 'aside'
  | 'simile'
  | 'narrator'
  | 'nothing'
  | 'record'
  /**
   * M6 §2. Why the detective came: one or two sentences, first on a page that
   * moved him, set apart in italics. Never cut, never joined, never re-worded
   * by a later pass, because the correspondence checker traces it verbatim.
   */
  | 'errand'
  /** M12 Part 2: the detective taking stock of the notebook. */
  | 'recap'
  /* M8 — the planned page. Each beat of §1 that is prose has its own voice. */
  | 'establish'
  | 'act'
  | 'thought'
  | 'bridge'
  | 'answer';

/**
 * A run of prose on a page. `clueId` marks the paragraph that carries a
 * clue, so the book can underline it and a test can check that every clue
 * found reached the page in some form. The clue's *flat* text is the
 * notebook's business now, not the page's (M4 §A.1).
 */
export type Block =
  | { kind: 'prose'; text: string; voice: ProseVoice; clueId?: Id }
  /**
   * Who is in the room. M4b §A.4 makes this one sentence — "Carbone and Mosley
   * at the far end, Doyle behind the bar" — written by the engine so that the
   * book and the transcript print the same words. `personIds` stays, because
   * the book makes every name in it clickable.
   */
  | { kind: 'presence'; personIds: Id[]; text?: string }
  /** A person's own claimed account of the evening. */
  | { kind: 'timeline'; personId: Id; rows: { tick: number; placeId: Id | null }[] }
  | { kind: 'help' }
  | { kind: 'note'; text: string };

export interface Page {
  /** Index in the log. */
  n: number;
  /** The running head's left side. */
  head: string;
  blocks: Block[];
  /** Actions this page cost. Zero for everything free. */
  cost: number;
  /** Deck card ids spent on this page. */
  cardsUsed: string[];
  /** Clue ids delivered by this page, in order. */
  found: Id[];
  /** Where the detective stands after this page. */
  at: Id;
  /**
   * Where the decks had nothing and the engine had to fall back. Logged, not
   * hidden: this is the list the content team works from.
   */
  gaps: string[];
  /**
   * M5 §1. Sentences on this page that carry no image, and sentences that came
   * off a deck card that does. The ratio between them is the milestone's
   * number, and the assembler holds it above a floor of 0.5.
   */
  plain: number;
  image: number;
  /**
   * M4b §A.2. The motifs of the image-bearing blocks that survived the image
   * budget, in page order. The coherence number — the mean count of motifs two
   * adjacent image blocks share — is measured off this and nothing else.
   */
  imageMotifs: string[][];
  /**
   * M6 §2. What the errand line on this page was built from, so the
   * correspondence checker can trace it back to the notebook. Absent on a page
   * that did not move the detective.
   */
  errand?: ErrandTrace;
  /**
   * M6 §6. The choices this page offered, as the book showed them. The reducer
   * never sets it; the book does, so a page turned back to can show its
   * choices greyed. Pure data, and optional so a save from before M6 loads.
   */
  offered?: OfferedGroup[];
  /**
   * M8 §1. Which page shape the planner laid this page out as, and the beats
   * it planned, each with whether it reached the page. Absent on the office
   * page and on a save from before M8.
   */
  shape?: PageShape;
  beats?: BeatTrace[];
  /** M13: the sheets the page was written from, and whether it paid a role off. */
  sheets?: SheetUse[];
}

/** M13: one sheet a page used. */
export interface SheetUse {
  id: string;
  moment: string;
  /** The page paid a role off (a callback). */
  callback: boolean;
  /** The page's roll: whether it wanted one. */
  rolled: boolean;
  /** How many sheets were in the running when it was chosen. */
  fitting?: number;
}

/**
 * M8 §1 — the page shapes. `arrive` is a first visit to a place, `return` a
 * later one; `look` is a free look round (or a walk to where he already is);
 * `repeat` is a question or a search already done, read back free.
 */
export type PageShape =
  | 'office'
  | 'arrive'
  | 'return'
  | 'search'
  | 'ask'
  | 'repeat'
  | 'look'
  | 'other'
  | 'confront'
  /** M11 §A.5: the client names who is in the room. */
  | 'rundown'
  /** M12 Part 2: "Go over what I have" — the recap on its own page. */
  | 'recap';

export type BeatKind =
  | 'errand'
  | 'establish'
  | 'return'
  | 'presence'
  | 'act'
  | 'find'
  | 'exchange'
  | 'thought'
  | 'bridge'
  | 'answer'
  | 'clock'
  | 'texture'
  | 'decide'
  /** M9: a fact put to somebody, and what they said to it. */
  | 'confront'
  /** M10: a family of facts, told in the witness's words. */
  | 'telling'
  /** M10: the detective's note on what a family is worth. */
  | 'note'
  /** M11 §A.5: the client naming who is in the room. */
  | 'rundown'
  /** M12 Part 1: the wry last word of a question or a confrontation. */
  | 'close'
  /** M12 Part 2: the detective taking stock of what the notebook holds. */
  | 'recap';

/**
 * One planned beat, as it went onto the page. The planner's `Beat` carries
 * everything it was built from; this is what the page keeps of it, so the beat
 * coverage check and the correspondence checker can read a page back without
 * running the planner again.
 */
export interface BeatTrace {
  kind: BeatKind;
  required: boolean;
  /** False only for texture the length rule cut (§8). */
  rendered: boolean;
  /**
   * The beat's key: the thought class, the bridge tie, the answer outcome, the
   * carry form (`move`, `carry`, `short`), the texture kind.
   */
  tag?: string;
  /** Clues that license the beat: the find, or the facts a thought reads. */
  clueIds?: Id[];
  /** People the beat is about, in slot order where it has slots. */
  personIds?: Id[];
  /** Places the beat names. */
  placeIds?: Id[];
  /** For a bridge or an answer: the lead's target clue. */
  targetId?: Id;
  /** Exactly the words it put on the page, when it put any. */
  text?: string;
  /** A thought on one witness's word or an anchor: the words must hedge (§5). */
  hedge?: boolean;
  /** Presence: the people said together in one sentence, not a line each (Night Hone 1 §3). */
  grouped?: Id[];
  /**
   * M10, a telling only: its words by part, so the correspondence checker can
   * hold the fact-bearing sentences to the family's facts and the rest to
   * saying no case fact at all.
   */
  parts?: {
    /** M13: the telling's sheet lines, before and after it; they assert no case fact. */
    sheet?: string[];
    /** The detective's question for this family, when it had its own. */
    question?: string;
    /** The sentences that carry the facts. */
    told: string[];
    grounding?: string;
    followup?: string;
    tail?: string;
    /** The telling card's frame and business around the words. */
    frame?: string;
    /** The told sentences are an old clue kind's own record, said the witness's way. */
    fromRecord?: boolean;
  };
  /** M10, a telling only: the half hours its fact sentences may name. */
  ticks?: number[];
  /**
   * M12 Part 2, a recap only: every clause it said, with what it rests on, so
   * the correspondence checker can hold each one to the notebook as it stood.
   */
  clauses?: RecapClauseTrace[];
}

/** M12 Part 2: one clause of a recap, and what licenses it. */
export interface RecapClauseTrace {
  /** What the clause asserts, as a key the recap can rebuild from the notebook alone. */
  key: string;
  /** The words it put on the page. */
  text: string;
  /** The people it may name (besides the victim). */
  personIds: Id[];
  /** The places it may name. */
  placeIds: Id[];
  /** The half hours it may name. */
  ticks: number[];
  /** The anchors it may name. */
  anchorIds?: Id[];
}

/** One choice as the book drew it, kept on the page it was offered under. */
export interface OfferedChoice {
  command: string;
  label: string;
  minutes: number;
  lead: boolean;
  done: boolean;
  note?: string;
  /**
   * M9 polish, the confront picker only: the heading the fact sits under (the
   * person or place it is about), everybody it names for the filter, and who
   * said it or where it was found.
   */
  section?: string;
  people?: Id[];
  source?: string;
}

export interface OfferedGroup {
  kind: 'ask' | 'search' | 'go' | 'free' | 'confront' | 'continue' | 'rundown' | 'recap';
  heading: string;
  personId?: Id;
  choices: OfferedChoice[];
  more?: OfferedChoice[];
  /**
   * M9 polish, the confront picker only: what the person being confronted
   * told the detective, a line a span, shown over the facts for reference.
   * Never something to pick.
   */
  reference?: string[];
  /** The picker's filter: everybody the facts name, in the notebook's order, with the name the book uses. */
  filters?: { personId: Id; label: string }[];
  /**
   * Shorter nights §1, the confront picker only: "Put another fact to her" —
   * the second fact of a confrontation that just landed, free. A fact that
   * touches nothing ends it, and costs nothing either.
   */
  follow?: boolean;
}

/**
 * M6 §2.1 — the errand line, as data. `because` and `for` are the deck tags
 * the card was dealt on; the ids are what the checker traces.
 */
export interface ErrandTrace {
  because: 'said' | 'document' | 'found' | 'none' | 'office' | 'return';
  for:
    | 'ask-person'
    | 'ask-thing'
    | 'ask-place'
    | 'ask-evening'
    | 'search-room'
    | 'search-thing'
    | 'none';
  /** `lead` for an open lead, `scene` for the client's pointer on first sight. */
  kind: 'lead' | 'scene' | 'none' | 'office' | 'return';
  /** The clue in the notebook that sent him: a found clue whose `leadsTo` includes `targetId`. */
  sourceId?: Id;
  /** The lead's target clue, not yet found. For `scene`, the first opening clue. */
  targetId?: Id;
  /** How many open leads pointed here. "And there was the other thing" at exactly two. */
  leads: number;
  /** For a no-lead return: whether the room had been gone through already. */
  searched?: boolean;
  /** The values the card's slots were filled with. */
  slots: Record<string, string>;
  /** Exactly the words on the page. */
  text: string;
}

/**
 * What the player files.
 *
 * M5 §5: the form asks exactly `case.act.unknowns`, which is three fields for
 * a body at the scene, four when the body was moved, and a different three for
 * an inside job. The five original keys stay because five of the nine unknowns
 * are exactly them; the four that are new are optional, and a field the case
 * does not ask is never read.
 */
export interface Report {
  /** `who`. */
  killerId: Id | null;
  /** `how`. */
  methodId: Id | null;
  /** `why`. */
  motiveType: string | null;
  /** `when`. */
  tick: number | null;
  /** `where`. */
  placeId: Id | null;
  /** `entry` — how they got in. */
  entry?: Entry | null;
  /** `whereabouts` — where the missing person is, or that they are gone. */
  whereabouts?: Id | 'gone' | null;
  /** `fate` — left, taken, or dead. */
  fate?: 'left' | 'taken' | 'dead' | null;
  /** `goods` — where what was taken went. */
  goodsPlaceId?: Id | null;
  /**
   * M9 §5: from Medium up, where every suspect was at the crime's half hour —
   * the full crime column, one place per suspect, scored cell by cell.
   */
  column?: Record<Id, Id | null> | null;
}

export const EMPTY_REPORT: Report = {
  killerId: null,
  methodId: null,
  motiveType: null,
  tick: null,
  placeId: null,
  entry: null,
  whereabouts: null,
  fate: null,
  goodsPlaceId: null,
};

/** One open lead: a clue the player has been pointed at but not yet taken. */
export interface Thread {
  /** The clue this lead would fetch. */
  clueId: Id;
  /** Where it is. Threads are grouped by this. */
  placeId: Id;
  /** That place's short name, so a lead can print its own `go`. */
  placeLabel: string;
  /** "Ask Doyle about Brauer", "Look around Kaplan's". */
  label: string;
  /** The command that takes it, as the player would type it. */
  command: string;
}

export interface RunState {
  seed: number;
  difficulty: Difficulty;
  /**
   * M7: the tier the case was dealt at, and the level. A tiered case is a
   * different case from the untiered one on the same seed, so resuming needs
   * both to deal it again. Absent on an untiered case and on every save from
   * before M7, which load as the untiered case they were.
   */
  tier?: 0 | 1 | 2 | 3 | 4 | 5 | 'over-easy';
  level?: Difficulty;
  detectiveName: string;
  at: Id;
  actionsUsed: number;
  found: Id[];
  threads: Thread[];
  burned: string[];
  log: Page[];
  filed?: Report;
  /** People the detective has been in a room with or heard named. */
  met: Id[];
  /** Persons whose claimed account of the evening has been taken down. */
  accounts: Id[];
  /** M5 §3: people who have been asked about themselves. Layer 1, once each. */
  selfTold: Id[];
  /** M5 §3: people a yapper has given up a layer-2 fact about, unasked. */
  gossip: Id[];
  /** True once the report form is open. It never closes. */
  reportOpen: boolean;

  /* --------------------------------------------------- M4: the voice */

  /**
   * Dashiell's roll, the tempers and the portraits. Fixed at case start and
   * carried in the save so that the same man has the same split thumbnail
   * after a reload.
   */
  cast: CastSheet;
  /** People whose one free question — they know him — has been spent. */
  freeAsked: Id[];
  /**
   * How many actions were waived by the free-first-ask rule. The clock never
   * sees these; par accounting does, because par counts a question as an
   * action whether or not the doorman waived his.
   */
  waived: number;
  /** Clue ids a yapper volunteered. At most one a run. */
  volunteered: Id[];
  /** Hour bands that have already spent their one aside. */
  asideBands: string[];
  /** People described in full already; a second look gets one component. */
  portrayed: Id[];
  /** The suspect the monologue is currently accusing. Often wrong. */
  theory: Id | null;
  /**
   * What the previous page's simile was about, so this one is about something
   * else. Four pages of "the room was ... as ..." is one page repeated.
   */
  lastSimile: string | null;

  /* --------------------------------------------------- M4b: coherence */

  /**
   * How many pages each person has been portrayed on. The second meeting
   * repeats the first meeting's detail once (§A.6's callback) and every one
   * after that varies.
   */
  appearances: Record<Id, number>;
  /**
   * The motifs the previous page's cards carried (§A.2). A motif may carry
   * across a page turn once; an echo of one that tonight is not about costs
   * a card three points.
   */
  previousMotifs: string[];

  /* ------------------------------------------------------ M4b: the office */

  /** The client is in the chair. He leaves after two questions, or when we do. */
  clientInOffice: boolean;
  /** How many of the two questions on the house have been spent. */
  clientAsks: number;
  /** Whether the scene has been arrived at, and its report handed over. */
  sceneSeen: boolean;

  /* ------------------------------------------------------- M6: repeats */

  /**
   * M6 §1.4. Every question put, as `personId|topicKey`, with the clues it
   * delivered. The second identical question costs nothing and reads the
   * notebook's record back instead of asking again.
   */
  asked: { key: string; clues: Id[] }[];
  /** Rooms already gone through. A second search of one is free and finds nothing. */
  searched: Id[];

  /* ------------------------------------------------------- M8: the scene */

  /**
   * M8 §3–§4. What the night pages remember between pages: which visit this
   * is, what each person present is doing, whose recall phrase has been used
   * this visit, which places have had their establish paragraph, and which
   * leads a page has already bridged. Optional, so a save from before M8
   * loads as a night with nothing remembered yet.
   */
  scene?: SceneMemory;

  /* ------------------------------------------------------- the grid */

  /**
   * The player's pencil on "Where they were": by person, then by tick (as a
   * string, so the save is plain JSON). Never a fact — nothing in the engine
   * reads it but the grid, which draws it apart from every sourced entry.
   * Free, and optional so an older save loads with a clean grid.
   */
  marks?: Record<Id, Record<string, CellMark>>;

  /* ------------------------------------------------------- M9: deduction */

  /**
   * Every fact put to somebody (§3), in order, with what came of it. The
   * second confrontation of a lie reads the first. Optional, so an older save
   * loads with nobody confronted.
   */
  confronts?: ConfrontRecord[];
  /**
   * The player's links from a stranger's description to a person (spec §2):
   * "That was Kreuzer." Keyed by `<clueId>|<tick>`. Free, never a fact; the
   * grid draws a linked sighting in that person's row, and the report is
   * where a wrong one costs.
   */
  links?: Record<string, Id>;
  /**
   * M10 §A.3: conversations and searches that stopped at three families and
   * have more to tell, oldest first. "Go on" takes the newest one that can go
   * on here. Optional, so an older save loads with nothing held back.
   */
  pending?: Pending[];
}

export type { ConfrontRecord };

/** One cell's pencil: at most one "was at", any number of "not at". */
export interface CellMark {
  at?: Id;
  notAt?: Id[];
}

/** One person's activity, chosen once per visit and kept for it (§4). */
export interface Activity {
  /** The visit it was chosen on. A new visit chooses again. */
  visit: number;
  placeId: Id;
  /** The card it came off, or empty for the hand-written fallback. */
  cardId: string;
  text: string;
  /** Spoken to since: they have stopped what they were doing. */
  stopped: boolean;
}

export interface SceneMemory {
  /** Goes up by one every time the detective walks into a different room. */
  visit: number;
  activities: Record<Id, Activity>;
  /** The visit a person's recall phrase was last used on: once a visit (§4). */
  recalled: Record<Id, number>;
  /** Places whose establish paragraph has been written (§3). */
  established: Id[];
  /** Lead targets a bridge has named (§6), so the next errand can be short. */
  bridged: Id[];
  /** Night Hone 1: the visit that has had its room's texture, once a visit. */
  ambient?: number;
  /**
   * docs/25: what each person has been doing on earlier visits tonight (the
   * activity cards and what they were doing), so the next visit finds them at
   * something else. Absent in a save from before it: nobody has done anything.
   */
  did?: Record<Id, string[]>;
  /** M11 §A.5: the visit the client last named the room on. Once a visit. */
  rundown?: number;
  /** M11 §A.6: whom this visit's arrival page closed on, so the rundown closes on somebody else. */
  observed?: Id[];
  /** M12: the visit each person was last asked something on, so a second question is asked again. */
  spoken?: Record<Id, number>;
  /** M12: the visit a question to each person last came back with nothing, so the next one gets a try. */
  nothing?: Record<Id, number>;
  /** M12 Part 2: what the recaps tonight have said, so none says it again. */
  recap?: RecapMemory;
}

/** M12 Part 2: the recaps so far tonight. */
export interface RecapMemory {
  /** How many recaps tonight. */
  n: number;
  /** Every clause key a recap has said tonight. */
  said: string[];
  /** How many things were in the notebook at the last recap. */
  found: number;
  /** The player's links at the last recap, as `key=personId`. */
  links: string[];
  /** The page each `when` key was last said on, so the frame is not said again straight after. */
  saidAt?: Record<string, number>;
}

export const EMPTY_SCENE: SceneMemory = {
  visit: 0,
  activities: {},
  recalled: {},
  established: [],
  bridged: [],
};

export const SAVE_KEY = 'dashiell:run';
export const BURNED_KEY = 'dashiell:burned';

/** The eight hours between the body and the DA, in minutes. */
export const NIGHT_MINUTES = 480;
