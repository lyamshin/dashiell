/**
 * docs/43 §2 and docs/44: pages, one job each, laid out on sheets.
 *
 * - the office: the givens, in the client's mouth, one quoted line a paragraph;
 * - arriving at a place: the walk, who's here, what they're doing, why I came;
 * - "Where were you tonight?": one whole account;
 * - "Who was here tonight?": one watcher's whole list;
 * - a search: one find;
 * - put it to: their line against the line that breaks it;
 * - the turn: a recap at the first lie caught, as a chapter break;
 * - the report: the form, and where I sat to fill it in.
 *
 * Each writer fills the beats it has (`sheets.ts`): why here, the walk, the
 * arrival, the staging, the ask, the reaction, the job, the thought, the close
 * and the hand-off. The sheet lays them out. About one joke a page (the hand
 * deals one card flagged `joke`, or a callback, and then only plain ones).
 * Every fact on a page is a line the player now holds, said the way that
 * person would say it; the thought (`thought.ts`) says only what those lines
 * add up to, never a verdict.
 */

import { tidyPunctuation, type Card } from './cards.js';
import type { Block, Page, ProseVoice } from './types.js';
import { minutesAfter } from './clock.js';
import type { Line } from './knowledge.js';
import {
  accountOf,
  candidateLines,
  collisionsOf,
  confrontationOf,
  crimeHourKnown,
  judgeLine,
  knownPeople,
  linesHeld,
  listOf,
  peopleAt,
  solveHeld,
  solveRun,
  type Judgement,
} from './knowledge.js';
import { Hand } from './decks.js';
import { hoursWithReason, spokenAccountLines, spokenListLines, type Manner, type SaidLine } from './tell.js';
import { listExhaustive as listWhole, shutAt as shutAtPlace } from './knowledge.js';
import {
  OFFICE,
  andList,
  budgetCalls,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  oclock,
  personOf,
  placeName,
  placeOf,
  pronOf,
  solverHeld,
  suspectsOf,
  thoughtLevel,
  victimOf,
  type BoardCase,
  type BoardDeal,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';
import { movedAt, sourceName, starPlace, starredSteps, walksOnly } from './stars.js';
import { sheetsFor, type Beat, type SheetJob } from './sheets.js';
import { placeThread, sourceOf as sourceOfQ, threadFor, type Pointer } from './thread.js';
import { breakSaid, claimSaid, eliminationOf, shortOther, thoughtOf, type Thought, type ThoughtPart } from './thought.js';
import { wayKnown } from './bones/phrase.js';
import { roleOf } from './plan/refer.js';
import { walkBetween } from './walk.js';
import { papersLine, whyOrder } from './motives.js';
import { worldAccountVoice, worldDeck, worldFoundWith, worldListLines, worldLook, worldManner, worldStaging } from './world.js';
import { sayFirst } from './bones/say.js';
import { PLAN, chapterUnit, markPronoun, newBudget, planSection, stripMarks, type GapSlot, type Item, type Relation, type SituCtx, type Unit } from './plan/index.js';
import { lean, type TexSpent } from './plan/texture.js';
import type { PageBudget, SaySpec } from './plan/types.js';
import type { Prop } from './bones/types.js';
import { KNOCKED, SAT, STANDING, seatedAfter } from './plan/situated.js';
import { ARRIVAL_MOVES, ASK_SIT, FEET, SITTING, VISITOR_SAT, WALK_ARRIVES } from './clarity-lint.js';
import { sentencesOf } from './plan/sentences.js';
import { gagNoun, ticsIn } from './tics.js';
import { finderGloss, glossOf, guestsGlossed } from './gloss.js';
import { isPoison, officeWhen } from './when.js';
import { titleClient } from './home.js';
import { LOWER } from './bones/voice.js';
import type { GivenLine } from '../../gen/board/types.js';
import type { VoiceHand } from './bones/say.js';
import { breakerProp, claimProp, findProps, givenProps, lineProps, meansProp as meansPropOf, srcOfQ } from './bones/extract.js';

export { breakSaid };

/* ------------------------------------------------------------------ *
 * The writer.
 * ------------------------------------------------------------------ */

type Voice = ProseVoice;

/** docs/49: what a writer hands the microplanner, a fact or a piece of texture (`plan/types.ts`). */
type Part = Item;

export interface Writer {
  d: BoardDeal;
  c: BoardCase;
  /** The run as it stands with this page's question asked. */
  run: BoardRun;
  /** The run as it stood before this page. */
  before: BoardRun;
  hand: Hand;
  blocks: Block[];
  /** The page paid off a role set up earlier (a callback). */
  callback?: boolean;
  told: Set<string>;
  hours: Set<number>;
  people: Set<string>;
  places: Set<string>;
  /** docs/44: the beats filled so far, waiting for the sheet. */
  parts: Partial<Record<Beat, Part[]>>;
  /** The sheet the page was laid out on, and the beats it filled, in order. */
  sheet?: string;
  beats: string[];
  thought?: { text: string; refs: string[] };
  /** The hand-off's words, so the next page needn't give the reason again. */
  handoff?: string;
  /** docs/59 item 1: the step the page's hand-off pointed at. */
  handoffTo?: string;
  /** The recap's clauses: the notebook said aloud, which has to name people. */
  recap?: string;
  /** docs/48 §4: what the arrival and staging beats said, before names were thinned, for the bible's share. */
  said: Partial<Record<Beat, string[]>>;
  /**
   * docs/47 C13: the page's reason was said on the page before (its hand-off named who or where,
   * or the arrival in this room said why), so this page doesn't say it again ("So, Moe’s.",
   * "Alfano it was.", "Mrs. Kowalski was the one I’d come for").
   */
  carried?: boolean;
  /** docs/47 B8: whoever this page's answer put in the room has been placed in a line. */
  placed?: boolean;
  /** docs/49: the skeleton, unit by unit, as the planner laid it out. */
  units: Unit[];
  /** docs/49 §2: what the page has spent of its joins (one "so" chain, one "but"). */
  budget: PageBudget;
  /** docs/49: the last running gag paid off, and the other lines that would have paid it off as well. */
  lastPay?: { id: string; others: { l: string; id: string }[] };
  /** Planner 2: the page's own job ends the visit (the report), so it may close on the last I saw of them. */
  leaves?: boolean;
  /** docs/60 item 1: the page's texture budget, spent across its sections. */
  tex: TexSpent;
}

export function writer(d: BoardDeal, before: BoardRun, run: BoardRun, page: number): Writer {
  const hand = new Hand(run.seed * 7 + run.tier, page, run.spent, run.seen);
  // docs/48 §3: a night from the neighbourhood deals the bible's own lines first.
  const deck = worldDeck(d, run);
  if (deck) hand.world = deck;
  const w: Writer = {
    d,
    c: d.kase,
    run,
    before,
    hand,
    blocks: [],
    told: new Set(),
    hours: new Set(),
    people: new Set(),
    places: new Set(),
    parts: {},
    beats: [],
    said: {},
    units: [],
    budget: newBudget(),
    tex: { joke: false, staging: false },
  };
  // docs/55 2: inside already, no card knocks; sitting already, no card has me standing on the mat.
  if (insideNow(w)) hand.avoid = alsoAvoid(hand.avoid, KNOCKED);
  if (seatedNow(w)) hand.avoid = alsoAvoid(alsoAvoid(hand.avoid, STANDING), SAT);
  return w;
}

function tidy(text: string): string {
  return tidyPunctuation(text.replace(/\s+/g, ' ').trim());
}

/** The gap a beat's texture fills, when the writer doesn't say (docs/49 §3). */
const SLOT: Record<Beat, GapSlot> = {
  why: 'why-here',
  walk: 'walk',
  arrival: 'arrival',
  staging: 'staging',
  ask: 'ask',
  reaction: 'reaction',
  job: 'gloss',
  thought: 'gloss',
  close: 'close',
  handoff: 'hand-off',
};

/** What the planner may know about a part: a fact's relation and what it's about, a gap's slot. */
type Meta = Partial<Omit<Item, 'beat' | 'voice' | 'text'>>;

/**
 * Fill a beat with texture (a gap, its card's text the default). Several parts in one beat are
 * several paragraphs, unless the sheet runs the beat into another, or a part runs on.
 */
function put(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice = 'narrator', meta: Meta = {}): void {
  if (!text) return;
  const t = tidy(text);
  if (!t) return;
  // docs/49: a card just dealt, said as dealt, can be traded for another that fitted the draw as
  // well, when the page's rhythm wants a sentence of another length.
  const last = w.hand.last;
  const alts = meta.alts ?? (last && last.text === text && meta.kind !== 'fact' ? altsOf(w, last) : undefined);
  // docs/60 item 1: a card dealt as the page's joke, for the texture budget.
  const jk = meta.kind !== 'fact' && last && last.text === text && last.joke ? { jk: true } : {};
  (w.parts[beat] ??= []).push({ kind: 'gap', slot: SLOT[beat], ...jk, ...meta, beat, voice, text: t, ...(alts ? { alts } : {}) });
}

/** docs/49: the other lines a hand-written aside could have been (`Hand.pick`), as the rhythm's alternatives. */
function pickAlts(w: Writer, text: string): Item['alts'] {
  const p = w.hand.picks.get(text);
  if (!PLAN.ops || !p || p.others.length === 0) return undefined;
  return () => p.others.filter((o) => !w.hand.used(o.id)).map((o) => ({ text: stripMarks(tidy(o.l)), take: () => w.hand.swap(p.id, o.id) }));
}

/**
 * docs/49: the cards that fitted a draw as well as the one dealt (`Hand.last`, taken right after
 * the draw), as the planner's alternatives for the rhythm; `shape` is whatever the writer did to
 * the card it dealt, done to these too. Texture only, and only with the planner on.
 */
function altsOf(w: Writer, last: Hand['last'], shape: (t: string) => string = (t) => t): Item['alts'] {
  if (!PLAN.ops || !last || last.others.length === 0) return undefined;
  // (docs/59 item 7: never a trade that says a night's tic again; one taken notes its own.)
  return () =>
    last.others
      .filter((o) => !w.hand.used(o.id) && !ticsIn(o.text).some((id) => w.hand.used(id)))
      .map((o) => ({
        text: tidy(shape(o.text)),
        take: () => {
          w.hand.swap(last.id, o.id);
          for (const id of ticsIn(o.text)) w.hand.note(id);
        },
      }));
}

/**
 * docs/51: texture the situated deck may fill: the card just dealt from a family, as it was dealt
 * (not a bible line, a pay-off or a fallback the writer wrote). `lead` is what stays said before
 * the card: a why-here's reason.
 */
function sit(w: Writer, text: string | null | undefined, lead?: string): Pick<Item, 'sit'> {
  const last = w.hand.last;
  if (!text || !last || last.text !== text) return {};
  return { sit: { ...(lead ? { lead: tidy(lead) } : {}), joke: last.joke } };
}

/** Fill a beat with a fact: locked, with what the engine knows about it (docs/49 §3). */
function fact(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice, meta: Meta & { carries: string[] }): void {
  put(w, beat, text, voice, { relation: 'new', ...meta, kind: 'fact' });
}

/** Run a part onto the last one in the beat ("…in the doorway. Up close he was thin…"). */
function putOn(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice = 'narrator'): void {
  if (!text) return;
  const ps = w.parts[beat];
  const last = ps?.[ps.length - 1];
  if (last) {
    last.text = tidy(`${last.text} ${text}`);
    // A card traded for another keeps what was put on after it (the look after the staging).
    const was = last.alts;
    if (was) last.alts = () => was().map((o) => ({ ...o, text: tidy(`${o.text} ${text}`) }));
    // docs/51: and so does a situated card.
    if (last.sit) last.sit.tail = tidy(`${last.sit.tail ?? ''} ${text}`);
  } else put(w, beat, text, voice);
}

/**
 * Lay the page out on one of the job's sheets: paragraphs in the sheet's
 * order, beats that share a paragraph run together when they're short enough
 * to read as one.
 */
function lay(w: Writer, job: SheetJob): void {
  if (job !== 'arrival' && job !== 'office' && job !== 'return' && job !== 'turn') placeNewcomers(w);
  const sheets = sheetsFor(job);
  const sheet = sheets[sheets.length > 1 ? w.hand.rng.int(sheets.length) : 0];
  if (!sheet) return;
  w.sheet = w.sheet ? `${w.sheet}+${sheet.id}` : sheet.id;
  // docs/48 §4: what the arrival and the staging said, before the planner touched a name.
  for (const b of Object.keys(w.parts) as Beat[]) w.said[b] = [...(w.said[b] ?? []), ...(w.parts[b] ?? []).map((p) => stripMarks(p.text))];
  // docs/49: the microplanner lays the beats out by the sheet, and says them.
  const planned = planSection(w.parts, sheet.paras, { c: w.c, budget: w.budget, pick: (k, ls) => w.hand.pick(k, ls), level: thoughtLevel(w.c), run: w.run, said: saidTonight(w), earlier: earlierProse(w), int: (n) => w.hand.rng.int(n), situ: situOf(w, job), hand: voiceHand(w.hand), tex: w.tex, pageSoFar: w.blocks.map((b) => (b.kind === 'prose' && b.voice !== 'answer' ? b.text : '')).join('\n') }, w.blocks.length);
  w.beats.push(...planned.beats);
  w.blocks.push(...planned.blocks);
  w.units.push(...planned.units);
  // The thought as the page says it, for the measure and the level lint.
  const thought = planned.units.filter((u) => u.kind === 'fact' && u.beat === 'thought' && u.voice === 'thought');
  if (PLAN.ops && w.thought && thought.length) w.thought = { ...w.thought, text: thought.map((u) => u.text).join(' ') };
  // The notebook said aloud, as the page says it: the block its clauses went into.
  const recap = planned.units.find((u) => u.kind === 'fact' && u.beat === 'job' && u.voice === 'recap');
  if (PLAN.ops && recap) {
    const b = w.blocks[recap.para];
    if (b?.kind === 'prose') w.recap = b.text;
  }
  w.parts = {};
}

/** docs/52 §4, build 2: the page's hand, as the voicings' chooser sees it. */
function voiceHand(h: Hand): VoiceHand {
  return {
    lastUse: (id) => h.lastUse(id),
    uses: (id) => h.uses(id),
    note: (id) => h.note(id),
    swap: (a, b) => h.swap(a, b),
    forget: (id) => h.forget(id),
    get mayJoke() {
      return h.mayJoke;
    },
    joke: () => h.joke(),
    int: (n) => h.voiceRng.int(n),
    seenBefore: (id) => h.seenBefore(id),
  };
}

/** docs/51: the page's situation, for the situated deck: what kind of page, where, whose, and how a put went. */
function situOf(w: Writer, job: SheetJob): SituCtx {
  const c = w.c;
  const fresh = w.run.asked.filter((q) => !w.before.asked.includes(q));
  const lastPut = w.run.puts.length > w.before.puts.length ? w.run.puts[w.run.puts.length - 1] : undefined;
  const q = fresh[fresh.length - 1];
  const subject = q && /^(account|list|motive|confront):/.test(q) ? (q.split(':')[1] ?? '').split('@')[0] : lastPut?.person;
  let put: SituCtx['put'] = 'none';
  if (job === 'put' && lastPut) {
    const k = confrontationOf(c, lastPut.person, lastPut.hour);
    put = !lastPut.landed ? 'held' : lastPut.again ? 'refused' : k?.response === 'admit' ? 'admitted' : k?.response === 'crack' ? 'cracked' : k?.response === 'second-lie' ? 'landed' : 'refused';
  }
  const page: SituCtx['page'] = job === 'check' ? 'admission-check' : job;
  return {
    page,
    place: w.run.at === OFFICE ? 'office' : placeKind(c, w.run.at),
    tier: c.tier,
    put,
    manner: (p) => (personOf(c, p) && !personOf(c, p)?.object ? mannerOf(c, p) : undefined),
    ...(subject ? { subject } : {}),
    leaving: job === 'office',
    jokeFree: w.hand.jokeFree,
    seed: [w.run.seed, w.run.tier, w.before.log.length],
    used: (id) => w.hand.used(id),
    seenBefore: (id) => w.hand.seenBefore(id),
    note: (id) => w.hand.note(id),
    swap: (a, b) => w.hand.swap(a, b),
    placeName: w.run.at === OFFICE ? 'the office' : placeOf(c, w.run.at)?.short,
    weather: w.run.weather,
    ...(theatreAvoid(c, w.run.at) || (job === 'search' && w.hand.avoid?.source.includes('Rooms where')) ? { avoid: [theatreAvoid(c, w.run.at), job === 'search' && w.hand.avoid?.source.includes('Rooms where') ? PAPERS_NOT_ROOM : undefined].filter((x): x is RegExp => !!x).reduce((a, b) => alsoAvoid(a, b)) } : {}),
    // docs/55 1c: the page's person has a line held against them.
    ...(subject && personOf(c, subject) && collisionsOf(c, w.run, subject).length > 0 ? { crossed: true } : {}),
    // docs/55 2: already inside, and sitting or not, from the pages before in this room.
    ...(insideNow(w) ? { inside: true } : {}),
    ...(seatedNow(w) ? { seated: true } : {}),
    ...(subject && theySitNow(w, subject) ? { theySit: true } : {}),
    ...(subject && theySitNow(w, subject, true) ? { theyPlaced: true } : {}),
    gags: w.hand.gagWords(),
  };
}

/**
 * docs/59 item 4: whether somebody is sitting as this page starts: the pages since I came into this
 * room had them on a chair, a stool, at a table ("Mrs. Nagy sat on a kitchen chair at the foot of the
 * stairs"). Nobody asks them to sit down.
 */
export function theySitNow(w: Writer, p: PersonId, anywhere = false): boolean {
  if (!insideNow(w)) return false;
  const who = personOf(w.c, p);
  if (!who) return false;
  const log = w.before.log;
  let i = log.length;
  while (i > 0 && (log[i - 1] as Page).at === w.run.at && (log[i - 1] as Page).board?.job !== 'arrive') i--;
  const opens = new RegExp(`^(?:${esc(who.short)}|${who.female ? 'She' : 'He'})\\b`);
  // (`anywhere`: the arrival put them somewhere, sitting or not.)
  // (docs/60 item 1: and a clause of a sentence that says who's there: "…, and Crowninshield stood on the landing".)
  const clauses = (t: string) => (lean() ? t.split(/, (?:and )?(?=[A-Z])/) : [t]);
  return log.slice(Math.max(0, i - 1)).some((pg) => pg.at === w.run.at && pg.blocks.some((b) => b.kind === 'prose' && b.voice !== 'answer' && sentencesOf(stripMarks(b.text).replace(/“[^”]*”/g, ' ')).flatMap(clauses).some((t) => opens.test(t.trim()) && t.includes(who.short) && (anywhere || SITTING.test(t)))));
}

/** docs/55 2: texture about going over a room, which a page reading the papers doesn't do. */
const PAPERS_NOT_ROOM = /\bcorners?\b|\b(?:the|a|this) room\b|\bon my feet\b|\bthe floor\b|a yard at a time|end to end|\bI didn’t sit down\b|\bRooms where\b|\bthe doorway\b|\bchairs\b|\bon my knees\b|\beye level\b|\bA place doesn’t\b/i;

/** docs/55 2: I was in this room on the page before: nothing on this page knocks to come in. */
export function insideNow(w: Writer): boolean {
  return w.run.at !== OFFICE && w.before.at === w.run.at && w.before.log.length > 0;
}

/** docs/55 2: whether I'm sitting down as this page starts: the pages since I came into this room, read in order. */
export function seatedNow(w: Writer): boolean {
  if (!insideNow(w)) return false;
  const log = w.before.log;
  let i = log.length;
  while (i > 0 && (log[i - 1] as Page).at === w.run.at && (log[i - 1] as Page).board?.job !== 'arrive') i--;
  let seated = false;
  for (const p of log.slice(Math.max(0, i - 1))) {
    if (p.at !== w.run.at) continue;
    for (const b of p.blocks) if (b.kind === 'prose' && b.voice !== 'answer' && b.voice !== 'chapter') seated = seatedAfter(b.text.replace(/“[^”]*”/g, ' '), seated);
  }
  return seated;
}

/**
 * docs/51: a theater with a stage has no pictures, and a picture house no plays: a situated card
 * written for one kind isn't dealt in the other (`stageGuard`, for the old decks, is the first half).
 */
function theatreAvoid(c: BoardCase, at: PlaceId): RegExp | undefined {
  const pl = at === OFFICE ? undefined : placeOf(c, at);
  if (pl?.kind !== 'theatre') return undefined;
  return pl.stage ? /\bpictures?\b|\bscreen\b|\bnewsreel\b|\bfilm\b|\bprojector\b/i : /\bplays?\b|\bacts?\b|\bactors?\b|\bcast\b|\bperformance\b|\brehears\w*|\bplaybill\b|\bscene\b|\bfootlights\b|\bwings\b|\bcue\b/i;
}

/** The narrated sentences of six words or more said on the pages before this one (docs/44's "sentences twice"). */
function saidTonight(w: Writer): Set<string> {
  const out = new Set<string>();
  if (!PLAN.ops) return out;
  for (const pg of w.before.log) {
    for (const b of pg.blocks) {
      if (b.kind !== 'prose' || b.voice === 'answer' || b.voice === 'recap' || b.voice === 'chapter') continue;
      for (const s of b.text.replace(/“[^”]*”/g, ' ').split(/(?<!\b(?:Mrs?|Dr)\.)(?<=[.!?][”’]?)\s+/)) if (s.split(/\s+/).length >= 6) out.add(s.trim());
    }
  }
  return out;
}

/** The prose of the pages before this one. */
function earlierProse(w: Writer): string {
  if (!PLAN.ops) return '';
  return w.before.log.map((pg) => pg.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n')).join('\n');
}

/** docs/43 §2: the turn's chapter heading, a block and a unit of its own. */
function chapter(w: Writer, text: string): void {
  w.units.push(chapterUnit(text, w.blocks.length));
  w.blocks.push({ kind: 'prose', text, voice: 'chapter' });
  w.beats.push('chapter');
}

/**
 * docs/47 B8: nobody is talkable before a page has put them in the room. Somebody this page's
 * answer named who is in this room (an admission's witness, a companion on a list) is placed here,
 * in a line, on the page that names them: "Ashby, it turned out, was three rows back with her hat
 * over her eyes." Somebody whose evening ended elsewhere had come back.
 */
function placeNewcomers(w: Writer): void {
  const c = w.c;
  const here = w.run.at;
  if (here === OFFICE || w.before.at !== here || w.placed) return;
  w.placed = true;
  const was = new Set(peopleAt(c, w.before, here));
  const fresh = peopleAt(c, w.run, here).filter((p) => !was.has(p) && personOf(c, p)?.role === 'company');
  const last = c.board.hours[c.board.hours.length - 1] as Hour;
  for (const p of fresh) {
    const pr = pronOf(c, p);
    const back = c.board.rows[p]?.[last] !== undefined && c.board.rows[p]?.[last] !== here;
    // (docs/60 item 1: lean, where they are and nothing after it.)
    const spot: Record<string, string> = lean()
      ? { theatre: 'three rows back', bar: 'at the end of the bar', restaurant: 'at a table by the wall', home: 'in the front room', work: 'at the far bench', back: 'in the corner', office: 'by the door', any: 'over by the wall' }
      : {
          theatre: `three rows back with ${pr.his} hat over ${pr.his} eyes`,
          bar: 'at the far end of the bar, nursing something',
          restaurant: 'at a table by the wall, behind a menu',
          home: 'in the front room, in the good chair',
          work: 'at the far bench, keeping busy',
          back: 'in the corner, out of the light',
          office: 'by the door',
          any: 'over by the wall',
        };
    const kind = placeOf(c, here)?.kind === 'theatre' ? 'theatre' : stageKind(c, here);
    const at = spot[kind] ?? (spot.any as string);
    // Named twice on the page already (an admission says the name and says it again): "my witness".
    // (docs/60 item 3: lean, the name, never "my witness": the reader has to work out who that is.)
    const who = lean() || namesFit(w, `${nameOf(c, p)}`) ? nameOf(c, p) : `my witness${markPronoun(c, p)}`;
    // docs/55 1e: somebody who was in the room all along "was" there; "it turned out" only for one who came back in.
    fact(w, 'thought', back ? `${cap(who)}, it turned out, had come back in and was ${at}.` : `${cap(who)} was ${at}.`, 'presence', {
      about: [p],
      // (Who turns out to be in the room is introduced, by name: never a pronoun a paragraph could give to somebody else.)
      keepNames: true,
      place: here,
      carries: [`here:${p}`],
      props: [{ k: 'PRESENT', person: p, place: here }],
      say: { shape: 'PRESENT', flags: [back ? 'back' : 'first'], args: { who, where: at } },
    });
    w.people.add(p);
  }
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Slots with a capitalised twin for every key: `{name}` and `{Name}`. */
export function withCaps(slots: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...slots };
  for (const [k, v] of Object.entries(slots)) {
    const K = cap(k);
    if (K !== k && out[K] === undefined && v !== undefined) out[K] = cap(v);
  }
  return out;
}

/** A person's slots: name, pronouns, and how Dashiell addresses them ("Mr. Ashby", "Mrs. Cheatham"). */
function who(c: BoardCase, p: PersonId): Record<string, string | undefined> {
  const pr = pronOf(c, p);
  const short = nameOf(c, p);
  const female = personOf(c, p)?.female === true;
  const title = /^Mrs\.|^Mr\.|^Miss |^Dr\. /.test(short) ? short : female ? undefined : `Mr. ${short}`;
  return { name: short, he: pr.he, him: pr.him, his: pr.his, title };
}

/** docs/49: a person's pronouns as the engine writes them in a fact, marked with whom they mean (`plan/refer.ts`). */
function markedPron(c: BoardCase, p: PersonId): ReturnType<typeof pronOf> {
  const pr = pronOf(c, p);
  const m = markPronoun(c, p);
  return { ...pr, he: pr.he + m, him: pr.him + m, his: pr.his + m, He: pr.He + m, His: pr.His + m };
}

/** License what a pointer or a thought names, for the reader lint. */
function license(w: Writer, x: { hours: Hour[]; people: PersonId[]; places: PlaceId[] }): void {
  for (const h of x.hours) w.hours.add(h);
  for (const p of x.people) w.people.add(p);
  for (const p of x.places) if (p) w.places.add(p);
}

/* ------------------------------------------------------------------ *
 * Places and people, by kind.
 * ------------------------------------------------------------------ */

export type PlaceKind = 'bar' | 'club' | 'restaurant' | 'theatre' | 'rooming' | 'scene-murder' | 'scene-lost' | 'work' | 'shift' | 'unwatched' | 'flat' | 'rooms' | 'home';

export function placeKind(c: BoardCase, id: PlaceId): PlaceKind {
  const p = placeOf(c, id);
  if (!p) return 'home';
  const key = p.key ?? '';
  if (p.scene) return isMurder(c) ? 'scene-murder' : 'scene-lost';
  if (key.startsWith('rooming')) return 'rooming';
  if (key.startsWith('work')) return 'work';
  if (key.startsWith('shift')) return 'shift';
  if (key.startsWith('unwatched')) return 'unwatched';
  if (key === 'flat') return 'flat';
  if (key === 'rooms') return 'rooms';
  if (p.kind === 'bar' || p.kind === 'club' || p.kind === 'restaurant' || p.kind === 'theatre') return p.kind;
  return p.kind === 'work' ? 'work' : 'home';
}

/** The staging cards' kinds: where a person sits down to be asked. */
function stageKind(c: BoardCase, id: PlaceId): string {
  if (id === OFFICE) return 'office';
  const k = placeKind(c, id);
  if (k === 'club') return 'bar';
  if (k === 'rooming' || k === 'flat' || k === 'rooms' || k === 'home' || k === 'scene-lost' || k === 'scene-murder') return 'home';
  if (k === 'shift') return 'work';
  if (k === 'unwatched') return 'back';
  return k;
}

/** One more kind of card a draw mustn't deal, on top of what the page already avoids. */
function alsoAvoid(base: RegExp | null, more: RegExp): RegExp {
  return base ? new RegExp(`${base.source}|${more.source}`, 'i') : more;
}

/** A theatre with a stage has no pictures: a card that says otherwise isn't dealt there. */
function stageGuard(w: Writer, place: PlaceId): void {
  w.hand.avoid = placeOf(w.c, place)?.stage ? /\bpictures?\b|\bscreen\b|\bnewsreel\b/i : null;
}

/** A watcher's job, from the case's description: "the bartender at the Velvet Room" → `bartender`. */
export function jobKey(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('bartender') || d.includes('barman') || d.includes('barkeep')) return 'bartender';
  if (d.includes('doorkeeper') || d.includes('doorman')) return 'doorkeeper';
  if (d.includes('head waiter')) return 'waiter';
  if (d.includes('change booth')) return 'booth';
  if (d.includes('cashier')) return 'cashier';
  if (d.includes('usher') || d.includes('ticket seller') || d.includes('house manager')) return 'usher';
  if (d.includes('landlady')) return 'landlady';
  if (d.includes('receptionist')) return 'desk';
  if (d.includes('pharmacist') || d.includes('pawnbroker') || d.includes('at the counter')) return 'counter';
  if (d.includes('supervisor') || d.includes('foreman') || d.includes('night editor')) return 'boss';
  if (d.includes('runs the game')) return 'game';
  if (d.includes('slips')) return 'slips';
  if (d.includes('steward')) return 'steward';
  return 'counter';
}

/** "the house manager", from "the house manager at the Thalia". */
function jobWords(desc: string): string {
  return desc.split(/,| at /)[0] ?? desc;
}

/** The old `watch` deck's fixture role for a watcher's job, when there is one. */
const WATCH_ROLE: Record<string, string> = { bartender: 'bartender', doorkeeper: 'doorman', waiter: 'counterman', cashier: 'counterman', usher: 'ticket-taker', landlady: 'landlady', counter: 'druggist' };

/** The character deck's archetype for a job, where one fits exactly (M11's look of a trade). */
const ARCHETYPE: [RegExp, string][] = [
  [/switchboard/, 'arch-switchboard'],
  [/piano teacher/, 'arch-piano-teacher'],
  [/bookmaker/, 'arch-bookmaker'],
  [/sewing-machine/, 'arch-seamstress'],
  [/cab driver/, 'arch-hackman'],
  [/typist/, 'arch-secretary'],
  [/dentist/, 'arch-dentist'],
  [/pawnbroker/, 'arch-pawnman'],
  [/copy reader/, 'arch-reporter'],
  [/bartender/, 'bartender'],
  [/landlady/, 'landlady'],
  [/usher|ticket seller/, 'ticket-taker'],
  [/doorkeeper/, 'doorman'],
  [/pharmacist/, 'druggist'],
  [/insurance agent|night-school teacher/, 'arch-bookkeeper'],
  [/milliner/, 'arch-seamstress'],
  [/takes the slips/, 'arch-runner'],
  [/runs the game/, 'arch-bouncer'],
  [/receptionist/, 'arch-secretary'],
];

function archetypeOf(desc: string): string | undefined {
  return ARCHETYPE.find(([re]) => re.test(desc))?.[1];
}

/** A first look at somebody, from the character deck, when their trade has a card. */
function lookAt(w: Writer, p: PersonId): string | null {
  const who_ = personOf(w.c, p);
  if (!who_) return null;
  // docs/60 item 1: a first look is a flourish, and the callback to it a look the reader has to hold: lean pages say neither.
  if (lean()) return null;
  const own = worldLook(w.c, w.run, w.hand, p);
  if (own !== undefined) return own;
  const arch = archetypeOf(who_.job ?? who_.description);
  if (!arch) return null;
  const pr = pronOf(w.c, p);
  const drawn = w.hand.drawOld(
    'character',
    (card: Card) => card.tags.role === arch && card.tags.kind === 'look' && !/\{place\}|\{victim\}/.test(card.text) && !w.hand.used(card.id),
    { He: pr.He, he: pr.he, his: pr.his, him: pr.him, His: pr.His, name: who_.short },
    true,
    // docs/55 6: a look (and the line that pays it off) isn't dealt two nights running.
    true,
  );
  const trait = drawn?.card.exports?.trait;
  if (trait?.pay?.length) w.run.traits = { ...(w.run.traits ?? {}), [p]: { short: trait.short, pay: trait.pay } };
  return drawn?.text ?? null;
}

/**
 * Set a page up to pay somebody off: their trait, from a first look now if
 * they haven't had one, and the page's joke kept for the last word. Returns
 * the look, when there is one to say.
 */
function setUp(w: Writer, p: PersonId): string | null {
  const look = w.run.traits?.[p] ? null : lookAt(w, p);
  if (hasRole(w, p)) w.hand.hold(true);
  return look;
}

/** Something on this page could be paid off: their trait, or the place's prop. */
function hasRole(w: Writer, p?: PersonId): boolean {
  return (p !== undefined && !!w.run.traits?.[p]) || !!w.run.props?.[w.run.at];
}

/**
 * A callback: a page closes on a line that pays off a role set up earlier
 * tonight (M13's roles): the trait of the person the page is about, or failing
 * that the prop of the place it's in. One a page, each line once a night, and
 * only while the page still has its joke to tell.
 */
function payOff(w: Writer, p?: PersonId): string | null {
  w.hand.hold(false);
  if (!w.hand.jokeFree) return null;
  const roles: { key: string; pay: string[] }[] = [];
  const t = p !== undefined ? w.run.traits?.[p] : undefined;
  if (t && p !== undefined) roles.push({ key: `pay:${p}`, pay: t.pay });
  const prop = w.run.props?.[w.run.at];
  if (prop) roles.push({ key: `prop:${w.run.at}`, pay: prop.pay });
  for (const r of roles) {
    const all = r.pay.map((l) => ({ l, id: `pay:${l.slice(0, 40)}` }));
    // docs/47 C13: a running gag lands at most twice a night (the short-legged chair four times was three too many).
    if (all.filter((x) => w.hand.used(x.id)).length >= GAG_MAX) continue;
    const fresh = all.filter((x) => !w.hand.used(x.id));
    if (fresh.length === 0) continue;
    const x = fresh[w.hand.rng.int(fresh.length)] as { l: string; id: string };
    w.hand.note(x.id);
    w.hand.joke();
    w.callback = true;
    const said = (l: string) => staying(w, l, r.key.startsWith('pay:') ? p : undefined);
    w.lastPay = { id: x.id, others: fresh.filter((y) => y.id !== x.id).map((y) => ({ ...y, l: said(y.l) })) };
    return said(x.l);
  }
  return null;
}

/**
 * docs/49, Planner 2: "…: that was the last I saw of her" only where the page's own job ends the
 * visit. A question page doesn't know whether the next page is in this room or not (in play nobody
 * does), so it closes on them still at it: "Counting bills with a rubber thumb: I didn’t interrupt her."
 */
function staying(w: Writer, line: string, p: PersonId | undefined): string {
  if (w.leaves || p === undefined) return line;
  // docs/56 A22: "Mrs. Szabo went back to counting bills", not "Counting bills: I didn’t interrupt her".
  const m = /^(.+) was still (.+) when I left\.$/.exec(line);
  if (!m) return line;
  // (The pronoun, marked, as the old line had it: the planner names them there when it must.)
  const he = markedPron(w.c, p).he;
  return `${he.charAt(0).toUpperCase()}${he.slice(1)} went back to ${m[2]}.`;
}

/** docs/49: the other lines a gag could have been paid off with, as the rhythm's alternatives. */
function payAlts(w: Writer, said: string | null | undefined): Item['alts'] {
  const p = w.lastPay;
  if (!PLAN.ops || !p || !said || p.others.length === 0) return undefined;
  return () => p.others.filter((o) => !w.hand.used(o.id)).map((o) => ({ text: tidy(o.l), take: () => w.hand.swap(p.id, o.id) }));
}

/**
 * docs/60 item 1: a pay-off, for the texture budget: the page's joke when one is due; taken off the
 * page, the gag isn't paid off tonight after all (it may be on a later page).
 */
function callbackOf(w: Writer): Pick<Item, 'tex' | 'onDrop'> {
  const id = w.lastPay?.id;
  return {
    tex: 'callback',
    onDrop: () => {
      w.callback = false;
      if (id) w.hand.forget(id);
    },
  };
}

/** docs/49: a hand-written aside with the planner on, one of a few; with it off, as it always was (the first). */
function aside(w: Writer, key: string, lines: readonly string[]): string {
  return PLAN.ops ? w.hand.pick(key, lines) : (lines[0] as string);
}

/** docs/47 C13: how many times a night one running gag (a prop, a trait, the street) may be paid off; docs/59 item 7: once, so it's said twice at most, set up and paid off. */
export const GAG_MAX = 1;

/** The page's close: a callback when there's a role to pay off, or a close card (the joke, if it's still free). */
function closeWith(w: Writer, p: PersonId | undefined, family: string, want: Record<string, string | undefined>, slots: Record<string, string | undefined>): void {
  const pay = payOff(w, p);
  if (pay) {
    // docs/49: where the pay-off would say their name a third time, a plain close of the family.
    const own = payAlts(w, pay);
    const payId = w.lastPay?.id;
    const plain = PLAN.ops && payId ? w.hand.options(family, want, slots, /\{[Nn]ame\}|\{[Hh]e\}|\{[Hh]is\}|\{[Hh]im\}/) : [];
    const alts: Item['alts'] = own || plain.length ? () => [...(own ? own() : []), ...plain.filter((o) => !w.hand.used(o.id)).map((o) => ({ text: tidy(o.text), take: () => w.hand.swap(payId as string, o.id), lastResort: true }))] : undefined;
    put(w, 'close', pay, 'thought', { alts, tag: 'pay', ...(p ? { about: [p] } : {}), ...callbackOf(w) });
    return;
  }
  // A name twice at most a page: a close that would say it a third time isn't dealt.
  const named = slots.name;
  const already = named ? Object.values(w.parts).flat().reduce((n, x) => n + (x?.text.match(new RegExp(`\\b${esc(named)}\\b`, 'g')) ?? []).length, 0) : 0;
  const avoid = w.hand.avoid;
  if (already >= 2) w.hand.avoid = alsoAvoid(avoid, /\{[Nn]ame\}/);
  const close = w.hand.draw(family, want, slots, { widen: true, joke: true });
  put(w, 'close', close, 'thought', { ...(p ? { about: [p] } : {}), ...sit(w, close) });
  w.hand.avoid = avoid;
}

/* ------------------------------------------------------------------ *
 * The thread: why here, and what next.
 * ------------------------------------------------------------------ */

/** Why the detective asked this, from the pointer that sent him (the star's own reason). */
function whyHere(w: Writer, q: string, kind: string, slots: Record<string, string | undefined>): Pointer {
  const ptr = threadFor(w.c, w.before, q, w.run.at);
  license(w, ptr);
  // Straight after walking in, the arrival has said why already: say only that this is who (or what) I came for.
  const last = w.before.log[w.before.log.length - 1]?.board;
  // The last page's hand-off named them: the reason is said; just turn to them.
  const subject = q.split(':')[1] ?? '';
  const named = personOf(w.c, subject)?.short;
  // docs/47 C13: no quest-log signposts. When the last page's hand-off named them, or the arrival in
  // this room (or any page tonight) has said why already, the page turns straight to them: the
  // reason is carried, not said again ("So, Corrigan.", "Alfano it was.", "X was the one I’d come for").
  if (last?.handoff && named && last.handoff.includes(named)) {
    w.carried = true;
    return ptr;
  }
  // docs/49: the turn's what-next ("I wanted to know what Miss Moskin had passed on the way to
  // Sokol’s at nine") is a hand-off too, for the person it names: their page doesn't say it again.
  // (A place it names keeps its why: the turn said where, not why.)
  const turnHand = PLAN.ops && last?.turn ? (last.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'hand-off').map((u) => stripMarks(u.text)).join(' ') : '';
  if (named && turnHand.includes(named)) {
    w.carried = true;
    return ptr;
  }
  // Said already tonight (the arrival joined it with others): don't say it twice.
  const saidBefore = !!ptr.clause && w.before.log.some((pg) => pg.blocks.some((b) => b.kind === 'prose' && b.text.includes(stripMarks(cap(ptr.clause)))));
  if (((last?.job === 'arrive' && w.before.at === w.run.at) || saidBefore) && ptr.src !== 'presence') {
    w.carried = true;
    // The one the testers kept ("I hadn’t come for the furniture. I’d come for Alfano."), once a night at most.
    if (named && w.hand.jokeFree) put(w, 'why', w.hand.draw('why', { kind: 'carried' }, withCaps(slots), { plain: true, fresh: true }), 'narrator', lean() ? { tex: 'flourish' } : {});
    return ptr;
  }
  // The last page's hand-off said this pointer whole (docs/53 names its place now, where it said
  // "here", so the two read as the same line): carried, not said again.
  if (ptr.clause && last?.handoff && last.handoff.toLowerCase().includes(stripMarks(ptr.clause).toLowerCase())) {
    w.carried = true;
    return ptr;
  }
  if (ptr.clause) {
    // The pointer names them already: a frame that names them again says it twice.
    const k = ptr.src === 'presence' ? 'presence' : named && ptr.clause.includes(named) && (kind === 'account' || kind === 'check') ? `${kind}-named` : kind;
    const why = w.hand.draw('why', { kind: k }, withCaps({ ...slots, src: ptr.clause }), { plain: true });
    put(w, 'why', why ?? `${cap(ptr.clause)}.`, 'narrator', sit(w, why, `${cap(ptr.clause)}.`));
    // The reason is in the narration now: the ask needn't say it to their face as well.
    return { ...ptr, face: undefined } as Pointer;
  }
  return ptr;
}

/**
 * The hand-off: what this page makes the detective want next. It is the
 * page's first star, said in his voice, so it always agrees with the starred
 * choice. No star (Hard-boiled after page one, Medium in the room the next
 * step is in), no hand-off. At Medium the star is a walk, so the hand-off
 * says only where to go (docs/46 §1).
 */
function handOff(w: Writer, always = false): void {
  const c = w.c;
  // The turn has its own what-next.
  if (w.run.turn === undefined && collisionsOf(c, w.run).length > 0) return;
  const steps = starredSteps(w.d, w.run);
  const q = steps[0];
  if (!q) return;
  void always;
  const [kind, rest] = q.split(':') as [string, string];
  const at = starPlace(c, q);
  // docs/59 item 1: the page before pointed here already ("Bledsoe’s evening was still a blank…" two
  // pages running): said once; the star still shows the way.
  if (w.before.log[w.before.log.length - 1]?.board?.handoffTo === q) return;
  // "That made …" says this page pointed there: only when it did.
  const fromHere = sourceOfQ(c, w.run.asked, q) === (w.run.asked[w.run.asked.length - 1] ?? '') && w.run.asked.length > w.before.asked.length;
  const away = at !== w.run.at ? 'yes' : 'no';
  const slots: Record<string, string | undefined> = { place: placeName(c, at) };
  let k = kind;
  // docs/55 1b: somebody out on the street at an hour that mattered is the reason that matters, and
  // the hand-off names them and the question, never the ground ("I wanted the place behind them"):
  // "Pickering had walked from the Delmonico rooms to the chop house at ten. I wanted to know who
  // she'd passed on the way." Said whole: no texture is traded for the question. Every other step,
  // at Medium too, is handed off by the person and the question (the cards below).
  const mover = kind === 'account' && walksOnly(c) ? movedAt(c, w.run, rest) : null;
  if (mover) {
    const pr = markedPron(c, rest);
    // (Said in one of a few ways, so a night that hands off to the same walk twice doesn't say it twice.)
    const ask = w.hand.pick('handoff-passed', [`I wanted to know who ${pr.he}’d passed on the way.`, `${cap(pr.he)} might have passed somebody on the way, and I wanted to know who.`, `Whoever ${pr.he}’d passed on the way, I wanted to hear about it.`]);
    let said: string | null = `${nameOf(c, rest)} had walked from ${placeName(c, mover.from)} to ${placeName(c, mover.to)} at ${hourWord(mover.h)}. ${ask}`;
    // A name twice at most a page (docs/39 §4): a reason that would say one a third time isn't said; the star still shows the way.
    if (!namesFit(w, said)) said = `I wanted to know who ${nameOf(c, rest)} had passed on the way over at ${hourWord(mover.h)}.`;
    if (!namesFit(w, said)) said = null;
    if (said) {
      w.people.add(rest);
      w.places.add(mover.from);
      w.places.add(mover.to);
      w.places.add(at);
      w.hours.add(mover.h);
    }
    put(w, 'handoff', said, 'thought', { keepNames: true });
    if (said) {
      w.handoff = stripMarks(said);
      w.handoffTo = q;
    }
    return;
  }
  if (kind === 'account' || kind === 'list') {
    const p = personOf(c, rest);
    if (!p) return;
    const known = knownPeople(c, w.run).has(rest);
    Object.assign(slots, who(c, rest));
    slots.job = jobWords(p.description);
    // (docs/59: the place said once: "the keeper at the card room", never "the card-room keeper at the card room".)
    const placeWords = new Set(placeName(c, at).toLowerCase().split(/[\s-]+/));
    const jw = (slots.job ?? '').split(/[\s-]+/);
    if (jw.length > 2 && jw.slice(1, -1).some((x) => x.length > 2 && placeWords.has(x.toLowerCase()))) slots.job = `${jw[0]} ${jw[jw.length - 1]}`;
    if (kind === 'list' && !known) k = 'list-job';
    // (docs/59: a watcher by their job at a room of a bigger place is at the place: "the leading man at
    // the Lyric", never "the leading man at the boxes at the Lyric"; the star shows the room.)
    if (k === 'list-job') slots.place = / at (.+)$/.exec(placeName(c, at))?.[1] ?? slots.place;
    // (docs/59: somebody to be found at a home called after them is found "at home", not "at Hargrove’s
    // flat" beside "Hargrove"; a home with a name of its own keeps it, "at the Delmonico rooms".)
    if (kind === 'account' && p.home === at && placeName(c, at).includes(p.short.replace(/^(?:Mrs\.|Mr\.|Miss|Dr\.) /, ''))) slots.place = 'home';
    if (kind === 'account' && threadFor(c, w.run, q, w.run.at).src.startsWith('confront:')) k = 'check';
    for (const x of [rest]) if (known) w.people.add(x);
    if (!known && kind === 'account') return;
  } else if (kind === 'confront') {
    const [p] = rest.split('@') as [string];
    Object.assign(slots, who(c, p));
    k = 'put';
    w.people.add(p);
  } else if (kind === 'search') {
    const f = c.finds.find((x) => x.id === rest);
    slots.what = f?.what;
    k = f?.gives.why ? 'papers' : 'search';
  }
  w.places.add(at);
  const avoid = w.hand.avoid;
  if (!fromHere) w.hand.avoid = alsoAvoid(avoid, /^That\b/);
  // A name twice at most a page (docs/39 §4): a hand-off that would say it a third time is left to the star.
  const named = slots.name;
  if (named) {
    const already = Object.values(w.parts).flat().reduce((n, x) => n + (x?.text.match(new RegExp(`\\b${esc(named)}\\b`, 'g')) ?? []).length, 0);
    if (already >= 2) return;
  }
  const said = w.hand.draw('handoff', { kind: k, away }, withCaps(slots), { plain: true });
  put(w, 'handoff', said, 'thought', { keepNames: true });
  if (said) {
    w.handoff = stripMarks(said);
    w.handoffTo = q;
  }
  w.hand.avoid = avoid;
}

/** Whether a sentence added to the page keeps everybody's name to twice a page or fewer (docs/39 §4). */
function namesFit(w: Writer, text: string): boolean {
  // A list or an account has to name people, and doesn't count (docs/39 §4's exemption).
  const all = [...Object.values(w.parts).flat().filter((x) => x?.voice !== 'answer').map((x) => x?.text ?? ''), text].join(' ');
  const count = (p: { short: string }) => (all.match(new RegExp(`\\b${esc(p.short)}\\b`, 'g')) ?? []).length;
  // Only the people the new words name: somebody else said three times already isn't this sentence's doing.
  return w.c.people.every((p) => p.object || !new RegExp(`\\b${esc(p.short)}\\b`).test(text) || count(p) <= 2);
}

/** The thought: the engine's, after the job. Recorded for the measure, and licensed for the lint. */
function think(w: Writer, q: string, extra: Thought | null = null): Thought {
  const t = thoughtOf({ c: w.c, before: w.before, run: w.run, q, here: w.run.at, level: thoughtLevel(w.c), pick: (k, ls) => w.hand.pick(k, ls) });
  const parts: ThoughtPart[] = partsOf(t);
  if (extra) {
    t.sentences.unshift(...extra.sentences);
    t.refs.push(...extra.refs);
    t.hours.push(...extra.hours);
    t.people.push(...extra.people);
    t.places.push(...extra.places);
    parts.unshift(...partsOf(extra));
  }
  // docs/47 B11: at Raw the elimination is walked once, on the page after the one that settled it
  // (unless the turn walked it already), so the page with the fact never concludes for the player.
  const el = walkedElimination(w);
  if (el) {
    t.sentences.unshift(...el.sentences);
    t.refs.push(...el.refs);
    t.hours.push(...el.hours);
    t.people.push(...el.people);
    t.places.push(...el.places);
    parts.unshift(...partsOf(el));
  }
  license(w, t);
  if (t.sentences.length) {
    const text = t.sentences.join(' ');
    // docs/49: one fact a sentence, each with what it does; the thought is one paragraph.
    parts.forEach((x, i) => {
      if (x.rule === 'gloss') {
        put(w, 'thought', x.text, 'thought', { slot: 'gloss', about: x.people, runOn: i > 0, alts: pickAlts(w, x.text), sit: { joke: false }, ...(lean() && x.tex ? { tex: x.tex } : {}) });
        return;
      }
      fact(w, 'thought', x.text, 'thought', {
        relation: x.relation,
        about: x.people,
        carries: x.refs.length ? x.refs : [`thought:${x.rule}`],
        ...(x.hours.length === 1 ? { hour: x.hours[0] } : {}),
        ...(x.places.length === 1 && x.places[0] ? { place: x.places[0] } : {}),
        ...(x.props ? { props: x.props } : {}),
        ...(x.flesh ? { flesh: x.flesh } : {}),
        ...(x.say ? { say: x.say } : {}),
        ...(x.opener ? { opener: x.opener } : {}),
        ...(x.say ? { say: x.say } : {}),
        tag: `thought:${x.rule}`,
        runOn: i > 0,
      });
      // The detective's aside after it, with no fact in it: a gap (docs/49 §3).
      // (docs/60 item 1: "That much held." says what the fact before it did: a signpost, kept.)
      if (x.gloss) put(w, 'thought', x.gloss, 'thought', { slot: 'gloss', about: x.people, runOn: true, alts: pickAlts(w, x.gloss), sit: { joke: false }, ...(lean() ? { tex: 'keep' as const } : {}) });
    });
    w.thought = { text: stripMarks(tidy(text)), refs: [...new Set(t.refs)] };
  }
  // Whoever this answer put in the room is placed now, before the hand-off counts names (docs/47 B8).
  placeNewcomers(w);
  return t;
}

/**
 * docs/47 B11: the walk's elimination, when it's due: Raw, who settled on what was held before
 * this page, and not walked yet tonight. `now` is for the turn and the report, which may say it on
 * the settling page's own run (the turn is that page's chapter break, after the fact).
 */
function walkedElimination(w: Writer, now = false): Thought | null {
  if (thoughtLevel(w.c) !== 'walk' || w.hand.used('walk:elimination')) return null;
  const settled = solveRun(w.c, now ? w.run : w.before).who !== undefined;
  if (!settled) return null;
  const el = eliminationOf(w.c, w.run, w.run.at);
  if (!el) return null;
  w.hand.note('walk:elimination');
  return el;
}

/** docs/49: the detective's aside in a thought, with no fact in it: a gap, not a fact unit. */
interface Gloss {
  gloss: string;
}

/** docs/52: a sentence of a page's own thought, with the propositions it says (and an opening "So" or "But" it carries). */
interface Said {
  text: string;
  props: Prop[];
  /** docs/52 build 2: the sentence as a composite to be voiced. */
  say?: SaySpec;
  /** The opening join, and the sentence said without it (when the page's join has gone). */
  opener?: 'So' | 'But';
  bare?: string;
}

/**
 * A page's own thought: its sentences, the asides among them marked (`{ gloss }`), with what the
 * facts in it do. The words are the sentences joined, as they always were.
 */
function thoughtOnly(sentences: (Said | Gloss)[], refs: string[], o: { hours?: Hour[]; people?: PersonId[]; places?: PlaceId[]; rel?: Relation; rule?: string } = {}): Thought {
  const parts = sentences.map(
    (x) =>
      ({
        text: 'gloss' in x ? x.gloss : x.text,
        relation: o.rel ?? 'new',
        rule: 'gloss' in x ? 'gloss' : (o.rule ?? 'page'),
        refs,
        hours: o.hours ?? [],
        people: o.people ?? [],
        places: o.places ?? [],
        ...('gloss' in x ? {} : { props: x.props, ...(x.opener ? { opener: x.opener, flesh: { bare: x.bare } } : {}), ...(x.say ? { say: x.say } : {}) }),
      }) as ThoughtPart,
  );
  return { sentences: sentences.map((x) => ('gloss' in x ? x.gloss : x.text)), refs, hours: o.hours ?? [], people: o.people ?? [], places: o.places ?? [], parts };
}

/** A thought's facts, one a sentence (docs/49): its own parts, or each sentence as a plain new fact. */
function partsOf(t: Thought): ThoughtPart[] {
  if (t.parts && t.parts.length === t.sentences.length) return [...t.parts];
  // (A sentence of several facts, each a part of its own: the walk's elimination, docs/49 Planner 2.)
  if (t.parts && t.parts.length && t.parts.map((x) => (x.gloss ? `${x.text} ${x.gloss}` : x.text)).join(' ') === t.sentences.join(' ')) return [...t.parts];
  return t.sentences.map((text) => ({ text, relation: 'new', rule: 'page', refs: t.refs, hours: t.hours, people: t.people, places: t.places }));
}

/* ------------------------------------------------------------------ *
 * The office.
 * ------------------------------------------------------------------ */

/**
 * docs/59 item 5, the designer's note 1: the office's first paragraph is my own room, and no money is
 * in it. The client's is the first money on the page: the circumstances that are money (flush, just
 * paid) aren't dealt here, nor a card that counts what's in my wallet. (A closing callback may still
 * pay off what the opening set up: the rent envelope, "for once I had something to put in it".)
 */
const CIRCUMSTANCES = ['behind-on-rent', 'hungover', 'bruised', 'sleepless'];
const OPENING_MONEY = /\b(?:money|fees?|retainer|dollars?|cash|paid|wallet|bank account|new bills)\b/i;

/** docs/52 build 2: a card's slots as a voicing's arguments: the words, nothing undefined. */
function stringArgs(v: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

/**
 * docs/53, the dial: what a small case's way in carries, so a voicing can say all of it: the party
 * (whose, what, at what hour), or the room the client told (whose talk, from when until when). The
 * flag says which. A murder's way in is its origin, said already.
 */
export function meansArgs(c: BoardCase): { flags: string[]; args: SaySpec['args'] } {
  if (isMurder(c)) return { flags: [], args: {} };
  const x = meansPropOf(c) as Extract<Prop, { k: 'MEANS' }>;
  const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
  if (x.how === 'party') return { flags: ['party'], args: { client: { t: 'person', id: c.client }, occasion: party?.occasion ?? '', hour: { t: 'hour', h: (x.hours ?? [])[0] as number } } };
  if (x.how === 'told') {
    const hs = x.hours ?? [];
    return { flags: ['told'], args: { client: { t: 'person', id: c.client }, from: { t: 'hour', h: Math.min(...hs) }, till: { t: 'hour', h: Math.max(...hs) + 1 } } };
  }
  return { flags: [], args: {} };
}

/** Words said in the same breath, inside the closing quotation mark when the line ends on one. */
export function afterQuote(text: string, also: string): string {
  return /”$/.test(text) ? `${text.slice(0, -1)}${also}”` : `${text}${also}`;
}

/**
 * A line about somebody, put in the client's own mouth: "asked me what it was worth", "she and I
 * haven’t spoken". The dead man is "he" once the office has named him (a dead woman "she"), unless
 * the line's other "he" is the one it's about ("Rafferty had been squeezing him for years" stays
 * named: "He had been squeezing him" is two men at once).
 */
/**
 * docs/59: what the dead man was to the client, in the client's own mouth ("my cousin", "my
 * brother-in-law", "my tenant"), from what the client said they were to him; null where it isn't one
 * of the office's own ties.
 */
function victimToClient(c: BoardCase): string | null {
  const rel = c.givens.lines?.find((g) => g.kind === 'relation')?.vars.relation ?? '';
  const male = !victimOf(c).female;
  const inverse: Record<string, string> = {
    'sister-in-law': male ? 'brother-in-law' : 'sister-in-law',
    'brother-in-law': male ? 'brother-in-law' : 'sister-in-law',
    sister: male ? 'brother' : 'sister',
    brother: male ? 'brother' : 'sister',
    'business partner': 'partner',
    landlady: 'lodger',
    landlord: 'lodger',
    fiancée: male ? 'fiancé' : 'fiancée',
    fiancé: male ? 'fiancé' : 'fiancée',
    cousin: 'cousin',
    neighbor: 'neighbor',
    friend: 'friend',
    // (The neighbourhood's ties, as the client said them: what the client was to the dead man.)
    'old sweetheart': 'old sweetheart',
    lodger: male ? 'landlord' : 'landlady',
    clerk: 'employer',
    employer: 'clerk',
  };
  return inverse[rel] ?? null;
}

function inClientMouth(c: BoardCase, text: string, about?: PersonId): string {
  const cl = clientOf(c);
  const me = cl.short;
  if (isMurder(c)) {
    const vic = victimOf(c);
    const vp = pronOf(c, vic.id);
    const rest = text.replace(new RegExp(`^${esc(vic.short)}\\b`), '');
    const twoOfOne = about !== undefined && pronOf(c, about).he === vp.he && new RegExp(`\\b(?:${vp.he}|${vp.him}|${vp.his})\\b`, 'i').test(rest);
    if (!twoOfOne) text = text.replace(new RegExp(`^${esc(vic.short)}\\b`), vp.He);
    // docs/59: the dead man further on in the line is what he was to the client ("He owed my cousin
    // four hundred dollars"): the client knew him, and his name has been said twice already.
    const mine = victimToClient(c);
    if (mine && twoOfOne) text = text.replace(new RegExp(`^${esc(vic.short)}\\b`), `My ${mine}`);
    if (mine) text = text.replace(new RegExp(`(?<=\\S )${esc(vic.short)}(’s)?\\b`, 'g'), (_m, s: string | undefined) => `my ${mine}${s ?? ''}`);
  }
  return text
    .replace(new RegExp(`\\band ${me} haven’t\\b`), 'and I haven’t')
    .replace(new RegExp(`\\basked ${me}\\b`), 'asked me')
    .replace(new RegExp(`\\bthe late Mr\\. ${me}\\b`), cl.female ? 'my late husband' : 'my late father')
    .replace(new RegExp(`\\bday ${me} brought\\b`), 'day I brought')
    .replace(new RegExp(`\\bwasted on its owner\\b`), 'wasted on me')
    // docs/55 8: "She says the watch was promised to her by my late husband" has two women in it (Raw 11's #9).
    .replace(/^([Ss]he|[Hh]e) says (the [\w ]+?) was promised to (her|him) by (.+)$/, '$1 goes around saying $4 promised $3 $2')
    .replace(/^([Ss]he|[Hh]e) says (.+?) was promised to (her|him), (.+)$/, '$1 goes around saying $2 was promised to $3, $4')
    .replace(new RegExp(`\\b${me}’s\\b`, 'g'), 'my');
}

/**
 * docs/59 item 5: the office's lines in the order a person tells it. A murder: who's dead (the client
 * and what they were to him), how and by whom he was found, with the police's word and the coroner's
 * in the same breath; then when, once, the answer opening on the hour; where he'd been; who'd want it;
 * the money. A small case: what's gone; whoever minds it, introduced before anything they hold (the
 * neighbor who keeps the spare key is met before the key); the party, the way in; when; who; the money.
 */
function officeOrder(c: BoardCase, lines: GivenLine[]): GivenLine[] {
  const at = (k: GivenLine['kind']) => lines.filter((g) => g.kind === k);
  if (isMurder(c)) return [...at('relation'), ...at('found'), ...at('clock'), ...at('window'), ...at('venue'), ...at('pointer'), ...at('aside'), ...lines.filter((g) => !['relation', 'found', 'clock', 'window', 'venue', 'pointer', 'aside'].includes(g.kind))];
  const keeper = at('keeper');
  const means = at('means');
  // The keeper first, when the way in names them (the spare key in their sugar tin).
  const keeperFirst = keeper.length > 0 && means.some((m) => [m.vars.keeper, m.vars.Keeper].some((k) => !!k && [keeper[0]?.vars.keeper, keeper[0]?.vars.Keeper].includes(k)));
  const order = [...at('gone'), ...(keeperFirst ? keeper : []), ...at('party'), ...means, ...at('clock'), ...at('window'), ...(keeperFirst ? [] : keeper), ...at('pointer'), ...at('aside')];
  return [...order, ...lines.filter((g) => !order.includes(g))];
}

export function writeOffice(w: Writer): void {
  const { c } = w;
  const cl = clientOf(c);
  const cp = pronOf(c, c.client);
  const circ = CIRCUMSTANCES[(c.seed * 7 + c.tier) % CIRCUMSTANCES.length] as string;
  const avoid0 = w.hand.avoid;
  w.hand.avoid = alsoAvoid(avoid0, OPENING_MONEY);
  const open = w.hand.draw('office-open', {}, {}, { widen: true });
  const office = w.hand.drawOld('office', (card) => card.tags.circumstance === circ && (card.weather === undefined || card.weather === w.run.weather || card.weather === 'any'), {}, true);
  w.hand.avoid = avoid0;
  if (office?.card.exports?.prop) w.run.prop = { short: office.card.exports.prop.short, pay: office.card.exports.prop.pay ?? [] };
  // docs/59 item 7: a gag set up is the night's: nothing else brings its thing up again.
  if (office?.card.exports?.prop && gagNoun(office.card.exports.prop.short)) w.hand.note(`gag:${gagNoun(office.card.exports.prop.short)}`);
  if (lean() && open && office?.text) {
    // docs/60 item 1: my own room in a sentence; the circumstance after it is atmosphere, and when it
    // goes, the prop it set up goes with it (the report won't call back to a clock nobody heard).
    put(w, 'arrival', open, 'establish', { tex: 'place' });
    put(w, 'arrival', office.text, 'establish', { runOn: true, tex: 'atmosphere', ...(office.card.exports?.prop ? { onDrop: () => (w.run.prop = undefined) } : {}) });
  } else put(w, 'arrival', [open, office?.text].filter(Boolean).join(' '), 'establish');
  // docs/59 item 4: one knock: "…and then a knock, so soft I nearly missed it. My visitor knocked once"
  // is the door knocked on twice.
  // (docs/60 item 1: lean, the visitor comes in, without the knock and the wisdom about who climbs stairs at this hour.)
  const knock = lean() ? null : w.hand.draw('knock', {}, {}, { widen: true });
  const knocked = /\bknock/i.test(knock ?? '');
  const entrance = w.hand.drawOld('entrances', (card) => (card.tags.gender === 'any' || card.tags.gender === (cl.female ? 'f' : 'm')) && card.tags.familiar !== 'yes' && ['working', 'professional', 'any'].includes(String(card.tags.class)) && !/\{detective\}/.test(card.text) && !(knocked && /\bknock/i.test(card.text)), { name: cl.short }, true);
  put(w, 'arrival', [knock, entrance?.text].filter(Boolean).join(' '), 'establish', lean() ? { tex: 'staging' } : {});
  // docs/59 item 4, note 3: the client sits down once. The entrance may say it; if it doesn't, the
  // client's first line may (a relation voicing that sits), and the chair line otherwise.
  let sat = VISITOR_SAT.test(entrance?.text ?? '');
  const firstLineSits = !sat && isMurder(c) && (c.seed + c.tier) % 2 === 0;
  // docs/59 item 5, note 4: whom the client has said who-they-are of already (their job, their tie).
  const glossed = new Set<string>();

  const base = { client: cl.short, cHe: cp.he, cHim: cp.him, cHis: cp.his, thing: victimOf(c).short, victim: victimOf(c).short };
  const lines = officeOrder(c, c.givens.lines ?? c.givens.text.map((t) => ({ kind: 'found' as const, id: 'text', text: t, vars: {} as Record<string, string> })));
  const gone = lines.find((g) => g.kind === 'gone')?.vars;
  const pthem = gone?.pthem ?? 'it';
  let asked = { when: false, who: false, venue: false };
  const aside = lines.some((g) => g.kind === 'aside');
  let pointerTold = false;
  /** The chair, once the client has said who they are and what's wrong, if nothing has sat them down yet. */
  const chair = () => {
    if (sat) return;
    sat = true;
    // docs/59 item 4: my feet come off the desk once.
    const avoidChair = w.hand.avoid;
    if (FEET.test(Object.values(w.parts).flat().map((x) => x?.text ?? '').join(' '))) w.hand.avoid = alsoAvoid(avoidChair, FEET);
    const chairLine = w.hand.draw('office-chair', {}, withCaps({ ...base, ...who(c, c.client) }), { widen: true });
    w.hand.avoid = avoidChair;
    put(w, 'job', chairLine, 'act', { slot: 'staging', about: [c.client], ...sit(w, chairLine) });
  };
  // docs/44: one quoted line a paragraph. Between them, the detective's own questions and the chair.
  for (const g of lines) {
    // The client's own line, in the client's mouth: "nine or ten, I’d say", "he telephoned me".
    const me = cl.short;
    const line = g.kind === 'found' || g.kind === 'relation' ? g.text : g.text
      .replace(new RegExp(`,? ${me} says\\b`), ', I’d say')
      .replace(new RegExp(`\\btelephoned ${me}\\b`), 'telephoned me')
      .replace(new RegExp(`\\b${me}’s\\b`, 'g'), 'my')
      .replace(new RegExp(`\\b${me} is out\\b`), 'I’m out');
    const v: Record<string, string | undefined> = { ...base, ...g.vars, line };
    // docs/59 item 6, notes 5, 6 and 9: the answer to "when?" opens on the hour, says what fixes it,
    // and for a poisoning that he was poisoned then and died after; the cause went with the finding.
    if (g.kind === 'clock' || g.kind === 'window') v.line = officeWhen(c, g, c.givens.window ?? c.crime.window) ?? line;
    // docs/55 2: the pet's place is said without the client's name in it ("in a basket by the stove",
    // not "in Hauck's basket", which the reference pass makes "my client's"), Medium 14's #1.
    // (docs/55 7, docs/59: a widow says her title when she says who she is, "“I’m Mrs. Marchetti,” she said".)
    if (g.kind === 'gone' && titleClient(c, cl.short) !== cl.short) v.clientFull = titleClient(c, cl.short);
    if (g.kind === 'gone' && v.where) v.where = v.where.replace(new RegExp(`\\b(?:${esc(me)}’s|his|her)\\b`), 'a');
    if (v.where) v.whereFrom = v.where.replace(/^(in|on) /, '');
    // docs/59: the police's word without the dead man's pronoun beside the finder's ("called it his heart").
    if (v.police) v.police = v.police.replace(/^(?:his|her) heart$/, 'heart failure').replace(/ (?:he|she) disturbed$/, ' disturbed in the act');
    // The client's own watch: "my late husband’s gold watch", not "a late husband’s" (Raw 11's #23).
    if (v.thingName) v.thingName = v.thingName.replace(/^a late husband’s\b/, 'my late husband’s');
    // "found in his own walk-up", not "found in Dandridge’s walk-up" of Dandridge (Poached 5's #1).
    if (g.kind === 'found' && v.scene && isMurder(c)) v.scene = v.scene.replace(new RegExp(`^${esc(victimOf(c).short)}’s `), `${pronOf(c, c.crime.victim).his} own `);
    // docs/59 note 4: the finder with who they are (their job, what they were to him, why they came round).
    if (g.kind === 'found' && isMurder(c)) {
      const fp = c.people.find((x) => x.short === v.finder);
      if (fp) {
        v.finderGloss = finderGloss(c, fp.id, v.finderWhy ?? '');
        glossed.add(fp.id);
      }
      v.means = c.means.name.replace(/^(?:a|an) /, '');
    }
    if (g.kind === 'pointer' && v.motive) v.motive = inClientMouth(c, v.motive, c.givens.pointer);
    // docs/55 2: a reason that calls them "her" or "him" before anything has said which: their whole
    // name the first time, so the pronoun has somebody to be (Hard-boiled 8's #3).
    if (g.kind === 'pointer' && v.P && /\b(?:her|him|she|he)\b/i.test(v.motive ?? v.behaviour ?? '')) {
      const pp = c.people.find((x) => x.short === v.P);
      // (A title says it already: "Miss Kahane" stays as the case calls her.)
      if (pp && pp.name !== pp.short && !/^(?:Mr|Mrs|Miss|Dr)\.? /.test(pp.short)) v.P = pp.name.replace(/^(?:Mr\.|Mrs\.|Miss|Dr\.) (?=\S+ \S)/, '');
    }
    if (g.kind === 'pointer' && v.behaviour) v.behaviour = v.behaviour.replace(new RegExp(`\\b${cl.short}’s\\b`, 'g'), 'my');
    // docs/59 note 4: the pointer with their job, the first time the client names them ({pj} before a
    // comma or a full stop, {pjm} mid-sentence); nothing when the office has said who they are already.
    if (g.kind === 'pointer') {
      const pid = c.givens.pointer ?? c.people.find((x) => x.short === v.P || x.name === v.P)?.id;
      const job = pid && !glossed.has(pid) ? glossOf(c, pid) : null;
      v.pj = job ? `, ${job}` : '';
      v.pjm = job ? `, ${job},` : '';
      if (pid) glossed.add(pid);
    }
    // The client's guests, each with their job the first time.
    if (g.kind === 'party' && v.guests) {
      const ns = c.people.filter((x) => x.role !== 'client' && !x.object && new RegExp(`\\b${esc(x.short)}\\b`).test(v.guests ?? ''));
      ns.sort((a, b) => (v.guests ?? '').indexOf(a.short) - (v.guests ?? '').indexOf(b.short));
      v.guests = guestsGlossed(c, ns.map((x) => x.id), glossed);
    }
    // docs/59 note 4: the neighbor who keeps the spare key, said with who she is the first time the
    // client names her ("Mrs. Kowalski, the landlady, keeps my spare key…"), where no line before has.
    if (g.kind === 'means') {
      for (const k of ['keeper', 'Keeper']) {
        const kp = v[k] ? c.people.find((x) => x.short === v[k]) : undefined;
        const first = kp ? (kp.job ?? kp.description.split(/;|,/)[0]?.trim() ?? '') : '';
        if (kp && !glossed.has(kp.id) && /^(?:a|an|the) /.test(first) && !/\bclient\b/.test(first)) v[k] = `${v[k]}, ${first},`;
      }
    }
    // The neighbor who minds the pet, or keeps the key: met once, with where they live.
    for (const k of ['keeper', 'Keeper', 'resident']) {
      const kp = v[k] ? c.people.find((x) => x.short === v[k] || (v[k] ?? '').startsWith(`${x.short}, `)) : undefined;
      if (kp) glossed.add(kp.id);
    }
    if (v.pthey) v.Pthey = cap(v.pthey);
    if (g.kind === 'means' && v.resident) {
      const res = c.people.find((p) => p.short === v.resident);
      if (res) v.rtheir = pronOf(c, res.id).his;
    }
    // What the office names, the page may name.
    for (const p of c.people) if (g.text.includes(p.short)) w.people.add(p.id);
    const g0 = g;
    if (g.kind === 'aside') {
      // The report asks why: the client's aside gives every reason the pointer didn't, in passing.
      // It runs as talk: two at a time, the second with an "And", and a beat between. The one the
      // client pointed at has had their reason said with the pointer, so they aren't named again.
      const n = Number(v.n ?? 0);
      const pointed = c.givens.pointer ? nameOf(c, c.givens.pointer) : '';
      const said: string[] = [];
      // docs/52: whose reason each line is.
      const saidWho: PersonId[] = [];
      const asideAbout = c.people.filter((x) => Object.entries(v).some(([k, y]) => /^p\d+$/.test(k) && y === x.short)).map((x) => x.id);
      for (let i = 0; i < n; i++) {
        if (pointerTold && v[`p${i}`] === pointed) continue;
        // Somebody named for the first time is said with their trade (Medium 14's #24: "And Pickering, the milliner").
        const who = c.people.find((x) => x.role === 'suspect' && x.short === v[`p${i}`]);
        let m = inClientMouth(c, v[`m${i}`] ?? '', who?.id);
        const fresh = !!who?.job && !glossed.has(who.id);
        if (who) glossed.add(who.id);
        // docs/55 8: "There’s Rafferty, a bus conductor. We haven’t spoken since…", not an apposition in speech (Raw 11's #12).
        if (fresh && who?.job && new RegExp(`^${esc(who.short)} and I haven’t\\b`).test(m)) m = m.replace(new RegExp(`^${esc(who.short)} and I haven’t\\b`), `there’s ${who.short}, ${who.job}. We haven’t`);
        else if (fresh && who?.job) m = m.replace(new RegExp(`\\b${esc(who.short)}\\b`), `${who.short}, ${who.job},`);
        said.push(`${cap(m)}.`);
        saidWho.push(c.people.find((x) => x.short === v[`p${i}`])?.id ?? '');
      }
      if (said.length === 0) continue;
      const groups = said.length <= 2 ? [said] : [said.slice(0, 2), said.slice(2)];
      const whose = said.length <= 2 ? [saidWho] : [saidWho.slice(0, 2), saidWho.slice(2)];
      // (docs/56: "And there’s Feeney", not "And There’s Feeney": a name keeps its capital, nothing else does.)
      const talk = (g: string[]) => g.map((x, i) => (i === 0 ? x : `And ${/^(?:There|The|He|She|It|They|A|An|His|Her|Their|That|This|Then|Somebody|Nobody)\b/.test(x) ? `${x.charAt(0).toLowerCase()}${x.slice(1)}` : x}`)).join(' ');
      const cs = withCaps({ ...base, ...who(c, c.client) });
      groups.forEach((g, gi) => {
        const props = givenProps(c, g0, { aside: whose[gi] ?? [] });
        // docs/52 build 2: the aside, a composite of the office (OFFICE `aside`), in a voicing of its own.
        const spec: SaySpec = { shape: 'OFFICE', flags: ['aside', gi === 0 ? 'first' : 'more'], args: stringArgs({ ...cs, said: talk(g) }) };
        fact(w, 'job', sayFirst(c, spec) ?? `“${talk(g)}”`, 'exchange', { about: asideAbout, carries: ['givens:aside'], props, say: spec });
      });
      continue;
    }
    // The detective's questions, where a speech would want one.
    if (!asked.when && (g.kind === 'clock' || g.kind === 'window')) {
      asked = { ...asked, when: true };
      const ask = w.hand.draw('office-ask', { before: 'when', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...base, pthem }), { plain: true });
      // (docs/60 item 1: the office's questions frame the client's answers: kept, and plain.)
      put(w, 'job', ask, 'exchange', { slot: 'ask', ...(lean() ? { tex: 'keep' as const } : sit(w, ask)) });
    }
    // docs/55 7: the client never answers a question nobody asked: where the dead man had been is asked for.
    if (!asked.venue && g.kind === 'venue') {
      asked = { ...asked, venue: true };
      const vp = markedPron(c, c.crime.victim);
      put(w, 'job', w.hand.pick('office-ask-venue', [`I asked where ${vp.he}’d spent the evening.`, `“Where had ${vp.he} been earlier in the evening?” I asked.`, `“Was ${vp.he} out at all tonight?” I asked.`]), 'exchange', { slot: 'ask', ...(lean() ? { tex: 'keep' as const } : {}) });
    }
    if (!asked.who && g.kind === 'pointer') {
      asked = { ...asked, who: true };
      const ask = w.hand.draw('office-ask', { before: 'who', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...base, pthem }), { plain: true });
      put(w, 'job', ask, 'exchange', { slot: 'ask', ...(lean() ? { tex: 'keep' as const } : sit(w, ask)) });
    }
    let kind: string = g.kind;
    if (g.kind === 'clock' && !isMurder(c)) kind = 'small-clock';
    // A pointer said for what they did, not why: their reason follows in the same breath ("And he lost his job on Friday…").
    let pointerAlso = '';
    if (g.kind === 'pointer' && g.id === 'behaviour' && c.givens.pointer && aside) {
      const pp = personOf(c, c.givens.pointer);
      const reason = pp?.motive ? inClientMouth(c, pp.motive, pp.id) : '';
      // (docs/59 item 8: "And he lost his job", never "And He lost".)
      if (reason) pointerAlso = ` And ${LOWER.test(reason) ? reason.charAt(0).toLowerCase() + reason.slice(1) : reason}.`;
    }
    // docs/59 notes 3, 4 and 6: the client's first line may sit them down (nothing else has); the
    // finding says the police's word and, for a poisoning, the coroner's, in the same breath.
    const finderSex = g.kind === 'found' ? (c.people.find((x) => x.short === v.finder)?.female ? 'finder-woman' : 'finder-man') : '';
    const flags =
      g.kind === 'pointer' || g.kind === 'gone' || g.kind === 'means' || g.kind === 'keeper'
        ? [kind, g.id]
        : g.kind === 'relation'
          ? [kind, ...(firstLineSits && !sat ? ['sit'] : [])]
          : g.kind === 'found' && isMurder(c) && v.finderGloss
            ? [kind, isPoison(c) ? 'poison' : 'struck', finderSex]
            : [kind];
    const args = stringArgs(withCaps(v));
    // docs/52 build 2: the office's line, a composite (OFFICE, by kind), said in a voicing; the
    // pointer's reason, when it's said in the same breath, after it.
    const spec: SaySpec = { shape: 'OFFICE', flags, args };
    let text = c.givens.lines ? sayFirst(c, spec) : null;
    if (pointerAlso) pointerTold = true;
    if (text && pointerAlso) text = afterQuote(text, pointerAlso);
    if (g.kind === 'relation' && flags.includes('sit') && text && VISITOR_SAT.test(text.replace(/“[^”]*”/g, ' '))) sat = true;
    fact(w, 'job', text ?? `“${g.text}”`, g.kind === 'found' ? 'narrator' : 'exchange', {
      ...(c.givens.lines ? { say: spec, ...(pointerAlso ? { sayAfter: pointerAlso } : {}) } : {}),
      about: c.people.filter((x) => !x.object && g.text.includes(x.short)).map((x) => x.id),
      carries: [`givens:${g.kind}`],
      // docs/52: the office's line by kind; a pointer says its reason unless it says what they did, alone.
      props: givenProps(c, g, { motive: g.kind === 'pointer' && (g.id !== 'behaviour' || pointerTold) }),
      ...(g.kind === 'clock' || g.kind === 'window' ? { relation: 'narrows' as Relation } : {}),
      // docs/59 note 4: the finding names the dead man and the finder, and "his heart" is his: the
      // reference pass leaves it as written ("the dead man’s heart" was stiff).
      ...(g.kind === 'found' && v.finderGloss ? { exempt: true, counted: true } : {}),
    });
    // The chair, once the client has said who they are and what's wrong.
    if (g.kind === 'gone' || g.kind === 'found') chair();
  }
  chair();
  for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
  for (const f of c.givens.facts) w.hours.add(f.h);
  const retainer = w.hand.draw('retainer', { type: isMurder(c) ? 'murder' : 'small' }, withCaps(base), { need: true });
  put(w, 'job', retainer, 'exchange', { slot: 'close', about: [c.client], ...(lean() ? { tex: 'keep' as const } : {}) });
  const officeClose = w.hand.draw('office-close', {}, {}, { widen: true });
  put(w, 'close', officeClose, 'exchange', sit(w, officeClose));
  w.beats.push('why');
  lay(w, 'office');
}

/* ------------------------------------------------------------------ *
 * The walk.
 * ------------------------------------------------------------------ */

/** The hours of the night, for cards that only fit some of them: "midnight-2", "2-4", "4-6", "6-8". */
function band(w: Writer): string {
  const m = minutesAfter(w.run.used, budgetCalls(w.d));
  return m < 120 ? 'midnight-2' : m < 240 ? '2-4' : m < 360 ? '4-6' : '6-8';
}

/** The street between: the distance, and a line of the night outside. The first walk sets the street's role up; a later one may pay it off. */
function writeWalk(w: Writer, from: PlaceId, to: PlaceId, back = false, noArrive = false): void {
  const c = w.c;
  const wk = walkBetween(c, from, to);
  // A return names its place once, in the arrival's "back at …" (docs/25, the decks' dial): the walk says only that it's the same door.
  const dest = to === OFFICE ? 'the office' : back ? 'the same door as before' : placeName(c, to);
  const fromName = from === OFFICE ? 'the office' : placeName(c, from);
  // Where it matters: from the scene to where the way in was had, the night turns on who could walk it in an hour.
  const matters = (from === c.crime.scene && to === c.means.origin) || (to === c.crime.scene && from === c.means.origin);
  // docs/47 A1: the walk says how far, never how many minutes: the clock moves a call's worth
  // whatever the walk, and the strip shows it. The way is the direction alone; the place walked
  // from is where the last page stood, and saying it again is the place name bolted on.
  const slots = withCaps({ dest, from: fromName, far: wk.far, way: wk.near ? undefined : wk.dir, street: wk.street, place: dest });
  // docs/59 item 4: where the arrival walks in itself ("I went down to Moskowitz’s…"), the walk doesn't arrive too.
  const avoidWalk = w.hand.avoid;
  if (noArrive) w.hand.avoid = alsoAvoid(avoidWalk, WALK_ARRIVES);
  let frame = w.hand.draw('walk-way', { matters: matters ? 'yes' : 'no', near: wk.near ? 'yes' : 'no' }, slots, { plain: true, untic: true }) ?? (wk.near ? `${cap(dest)} was round the corner.` : `It was ${wk.far} to ${dest}, ${wk.dir}.`);
  const frameDrawn = w.hand.last;
  w.hand.avoid = avoidWalk;
  // "The Delmonico rooms were", not "was".
  // (With the planner on, only where the rooms are what the sentence is about: "From there to the
  // Delmonico rooms was a long walk" is a walk.)
  const were = (t: string) => (/\brooms$|^the flats\b/i.test(dest) ? t.replace(new RegExp(`${PLAN.ops ? '^' : ''}(${esc(cap(dest))}|${esc(dest)}) was\\b`), '$1 were') : t);
  frame = were(frame);
  // A later walk may pay the street's role off; the first sets it up.
  let line: string | null = null;
  // docs/60 item 1: the street line's part in the budget: a pay-off, or a set-up its pay-offs go with.
  let lineTex: Pick<Item, 'tex' | 'onDrop'> = {};
  const role = w.run.street;
  if (role && w.hand.jokeFree && w.hand.rng.int(10) < 6) {
    const all = role.pay.map((l) => ({ l, id: `pay:${l.slice(0, 40)}` }));
    const spent = all.filter((x) => w.hand.used(x.id)).length >= GAG_MAX;
    const fresh = spent ? [] : all.filter((x) => !w.hand.used(x.id));
    const x = fresh.length ? (fresh[w.hand.rng.int(fresh.length)] as { l: string; id: string }) : undefined;
    if (x) {
      w.hand.note(x.id);
      w.hand.joke();
      w.callback = true;
      line = x.l;
      lineTex = { tex: 'callback', onDrop: () => ((w.callback = false), w.hand.forget(x.id)) };
    }
  }
  // docs/51: a street line is texture the situated deck may fill, unless it sets up the street's role or pays it off.
  let lineSit: Pick<Item, 'sit'> = {};
  if (!line) {
    const drawn = w.hand.drawCard('walk', { weather: w.run.weather, band: band(w) }, slots, {});
    line = drawn?.text ?? null;
    const ex = drawn?.card.exports?.street;
    if (!role && ex?.pay?.length) {
      w.run.street = { short: ex.short, pay: ex.pay };
      lineTex = { onDrop: () => delete w.run.street };
    } else if (!ex?.pay?.length) lineSit = sit(w, line);
  }
  // docs/49: the frame and the street, two pieces of one paragraph.
  put(w, 'walk', frame, 'establish', { alts: altsOf(w, frameDrawn, were) });
  put(w, 'walk', line, 'establish', { runOn: true, ...lineSit, ...lineTex });
  w.places.add(to);
  if (from !== OFFICE) w.places.add(from);
}

/* ------------------------------------------------------------------ *
 * Arriving.
 * ------------------------------------------------------------------ */

export function writeArrive(w: Writer, place: PlaceId): void {
  const { c } = w;
  const first = !w.before.visited.includes(place);
  const pl = placeOf(c, place);
  if (!pl) return;
  stageGuard(w, place);
  // docs/55 2: walking in, I don't sit down yet: the page that asks does that, or doesn't.
  w.hand.avoid = alsoAvoid(w.hand.avoid, SAT);
  const kind = placeKind(c, place);
  // A later visit: somebody here already has a trait, and the page's last word pays it off.
  const again = first ? undefined : peopleAt(c, w.run, place).find((x) => w.run.traits?.[x]);
  const callback = (!first && (again !== undefined || !!w.run.props?.[place])) || (!!w.run.street && w.hand.rng.int(10) < 3);
  if (callback) w.hand.hold(true);
  // `{name}` is the whole name ("the Odessa, a café where the actors eat after the show"); as the
  // subject of a sentence it takes the closing comma its aside needs (`{nameSubj}`).
  const slots = withCaps({ name: pl.name, nameSubj: pl.name.includes(',') ? `${pl.name},` : pl.name, place: pl.short, street: pl.street });
  // docs/59 item 4: one arrival a visit. The arrival is dealt first; where it walks in itself ("I went
  // down to Moskowitz’s…"), the walk doesn't arrive too ("…round the corner, and there it was").
  const arrive0 = first ? (w.hand.draw('arrive', { kind, key: pl.key }, slots, { need: true }) ?? `I went to ${pl.name}.`) : (w.hand.draw('return', {}, slots, { widen: true }) ?? `Back at ${pl.short}.`);
  const arriveLast = w.hand.last?.text === arrive0 ? w.hand.last : null;
  writeWalk(w, w.before.at, place, !first, ARRIVAL_MOVES.test(arrive0));
  // (And where the walk arrived, the rhythm doesn't trade the arrival for one that walks in again.)
  const walkArrives = WALK_ARRIVES.test((w.parts.walk ?? []).map((x) => stripMarks(x.text)).join(' '));
  const keepStill = (alts: Item['alts']): Item['alts'] => (alts && walkArrives ? () => alts().filter((x) => !ARRIVAL_MOVES.test(x.text)) : alts);
  if (first) {
    const arrive = arrive0;
    // (Planner 2: the cards that fitted the arrival's draw as well, taken before the prop's draw.)
    // (docs/60 item 5: an arrival says its street once: "the passage from the street", not from Allen Street again.)
    const arriveAlts = keepStill(altsOf(w, arriveLast, (t) => streetOnce(t, pl.street)));
    // M13's prop: something in the room a later page here can call back to.
    const prop = w.hand.drawCard('prop', { kind }, w.hand.world ? { ...slots, arrived: arrive } : slots);
    // docs/59 item 7: a thing the night has brought up already ("one radiator…" in another house) isn't
    // set up as a running gag here: said here, it's said twice, and that's its lot.
    const noun = prop?.card.exports?.prop ? gagNoun(prop.card.exports.prop.short) : null;
    const seen = !!noun && new RegExp(`\\b${noun}s?\\b`, 'i').test(stripMarks(w.before.log.map((pg) => pg.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ')).join(' ')));
    const ex = seen ? undefined : prop?.card.exports?.prop;
    if (prop && ex?.pay?.length) w.run.props = { ...(w.run.props ?? {}), [place]: { short: ex.short, pay: ex.pay } };
    if (prop && ex?.pay?.length && noun) w.hand.note(`gag:${noun}`);
    // The arrival has just named the place: the prop needn't say "at the Thalia" again (docs/25, 4b open).
    const unplace = (t: string) => (arrive.includes(pl.short) ? t.replace(` at ${pl.short}`, '') : t);
    const propText = prop?.text ? unplace(prop.text) : prop?.text;
    // (A prop that pays off later is the night's: it isn't traded for another.)
    const propAlts = prop && !ex?.pay?.length ? altsOf(w, w.hand.last?.text === prop.text ? w.hand.last : null, unplace) : () => [];
    put(w, 'arrival', streetOnce(arrive, pl.street), 'establish', arriveAlts ? { alts: arriveAlts } : {});
    // (docs/60 item 1: a prop is atmosphere; when the budget takes it off the page, nothing calls back to it.)
    put(w, 'arrival', propText, 'establish', { runOn: true, ...(propAlts ? { alts: propAlts } : {}), ...(prop && ex?.pay?.length ? { onDrop: () => { const ps = { ...(w.run.props ?? {}) }; delete ps[place]; w.run.props = ps; } } : {}) });
  } else {
    put(w, 'arrival', arrive0, 'establish');
  }
  const vict = victimOf(c);
  if (pl.scene && first) {
    // (docs/60 item 1: lean, how he lay, and not the flourish after it; the bible's "found with" stays whole.)
    if (isMurder(c)) put(w, 'arrival', w.hand.draw('scene-body', { means: c.means.kind }, withCaps({ victim: vict.short }), { need: true, widen: true }), 'establish', { about: [c.crime.victim], ...(lean() ? { tex: worldFoundWith(c) ? ('keep' as const) : ('place' as const) } : {}) });
    // docs/48 §3: and what the bible says he'd be found with.
    if (isMurder(c)) putOn(w, 'arrival', worldFoundWith(c), 'establish');
    else put(w, 'arrival', w.hand.draw('scene-empty', { kind: c.type === 'lost-pet' ? 'pet' : 'item' }, withCaps({ client: clientOf(c).short, thing: vict.short }), { need: true, widen: true }), 'establish', { about: [c.client], ...(lean() ? { tex: 'keep' as const } : {}) });
  }
  // Who's here, and what they're doing.
  const here = peopleAt(c, w.run, place);
  // docs/49: a sentence a person, each a piece of the one paragraph, with the cards it could have been.
  const sentences: { text: string; about: PersonId[]; alts?: Item['alts'] }[] = [];
  // Back in a room: nobody does the same thing twice tonight. Whoever has no fresh line left is
  // "still there", together, in one sentence at the end.
  const stillThere: string[] = [];
  const freshOnly = first ? {} : { fresh: true };
  let watcherLine: string | null = null;
  let looked = false;
  for (const p of here) {
    const person = personOf(c, p);
    if (!person) continue;
    w.people.add(p);
    const s = withCaps(who(c, p));
    if (person.role === 'client') {
      // At a lost thing's flat the client is already in the room's own line.
      if (pl.scene && !isMurder(c) && first) continue;
      // docs/59 item 4: the client at a murder's scene says how they got there ahead of me.
      const avoidHere: RegExp | null = w.hand.avoid;
      if (pl.scene && isMurder(c) && first) w.hand.avoid = alsoAvoid(avoidHere, /^(?![\s\S]*(?:ahead of me|arrived first|had come ahead|in a cab))/);
      const here_ = w.hand.draw('client-here', {}, s, { widen: true, plain: true });
      w.hand.avoid = avoidHere;
      sentences.push({ text: here_ ?? `${person.short} was there.`, about: [p], alts: here_ ? altsOf(w, w.hand.last) : undefined });
      continue;
    }
    if (person.role === 'watcher') {
      const job = jobKey(person.description);
      const doingW = w.hand.draw('doing', { job }, s, { plain: true, ...freshOnly });
      const doingDrawn = w.hand.last;
      if (doingW === null && !first) {
        stillThere.push(person.short);
        continue;
      }
      sentences.push({ text: doingW ?? `${person.short} was there, ${person.description}.`, about: [p], alts: doingW ? altsOf(w, doingDrawn) : undefined });
      const met = w.before.visited.includes(place);
      if (!met) {
        const look = !looked ? lookAt(w, p) : null;
        if (look) {
          looked = true;
          sentences.push({ text: look, about: [p] });
        }
        watcherLine = w.hand.draw('watcher', { job }, s) ?? oldWatch(w, job, person.short);
      }
      continue;
    }
    const k = kind === 'unwatched' ? 'back' : kind === 'rooming' || kind === 'flat' || kind === 'rooms' ? 'home' : kind === 'shift' ? 'work' : kind;
    // Hard-boiled's face: everybody's look is plain on first sight, so a face on a list can be matched.
    // Decided 2026-10-11: the pair has one too, the culprit's friend at the bar.
    if ((c.variant === 'face' || c.variant === 'pair') && person.role === 'suspect' && person.look) {
      s.name = `${person.short}, ${person.look},`;
      s.Name = s.name;
    }
    const drawn = w.hand.draw('doing', { kind: k }, s, { plain: true, ...freshOnly });
    const doingDrawn = w.hand.last;
    if (drawn === null && !first) {
      stillThere.push(person.short);
      continue;
    }
    const doing = drawn ?? `${person.short} was there.`;
    // One first look a page, at the first suspect met here: more is a parade.
    const look = first && person.role === 'suspect' && !looked ? lookAt(w, p) : null;
    if (look) looked = true;
    sentences.push({ text: doing, about: [p], alts: drawn && !s.name?.includes(',') ? altsOf(w, doingDrawn) : undefined });
    if (look) sentences.push({ text: look, about: [p] });
  }
  if (stillThere.length > 0) sentences.push({ text: `${cap(andList(stillThere))} ${stillThere.length > 1 ? 'were' : 'was'} still there.`, about: here.filter((x) => stillThere.includes(nameOf(c, x))) });
  // docs/60 item 1: lean, who's there doing what in a sentence or two, not a sentence a person.
  const said = lean() ? peopleInBrief(c, sentences) : sentences;
  // (Lean, in the place's own paragraph: "what the place is and who's there doing what".)
  said.forEach((x, i) => put(w, 'arrival', x.text, 'presence', { about: x.about, runOn: i > 0 || (lean() && (w.parts.arrival ?? []).length > 0), ...(x.alts ? { alts: x.alts } : {}) }));
  if (sentences.length === 0 && !pl.scene) put(w, 'arrival', `There was nobody there to ask.`, 'presence');
  // Why here: the pointers to what waits in this room, from what's held, the starred one first.
  const lastHand = w.before.log[w.before.log.length - 1]?.board?.handoff;
  // (The turn's what-next is a hand-off too: "I wanted to know what Coffin had passed on the way to the print shop at nine".)
  const turnHand = (w.before.log[w.before.log.length - 1]?.board?.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'hand-off').map((u) => stripMarks(u.text)).join(' ');
  const handed = (!!lastHand && lastHand.includes(pl.short)) || (PLAN.ops && turnHand.includes(pl.short));
  const ptrs = (pl.scene && first) || handed ? [] : placeThread(c, w.before, place, starredSteps(w.d, w.before), place);
  const sameSubject = (clause: string, before: string) => sameSubjectIn(c, clause, before);
  // The last page's hand-off sent me here, and the walk says I came: no "So, Moe’s." (docs/47 C13).
  if (handed) w.carried = true;
  for (const p of ptrs) license(w, p);
  if (ptrs.length > 0) {
    // Two lines from one list run together: "Mrs. Tramonti’s list had Lathrop there at nine, and Mulcahy at eight and nine."
    const [p0, p1] = ptrs as [Pointer, Pointer | undefined];
    const head = /^(.+? had seen )/.exec(p0.clause)?.[1];
    const said = /^(.+? had said )/.exec(p0.clause)?.[1];
    // "Grasso had said she was here at seven, with Abramowitz", not "…here at seven, and that
    // Abramowitz was with her here at seven" (Hard-boiled 8's #18).
    const m0 = /^.+? had said (?:he|she)(?:\u2063\d+\u2064)? was (here|at .+?) at (\w+)$/.exec(p0.clause);
    // (docs/59 item 1: the companion's pointer says who and when, no place: "…had said she was with Mrs. Pomerantz at ten".)
    const m1 = p1 && said && p1.src === p0.src ? new RegExp(`^${esc(said)}(?:he|she)(?:\u2063\\d+\u2064)? was with (.+?)(?: (here|at .+?))? at (\\w+)$`).exec(p1.clause) : null;
    // docs/53: one list's two people at the same place and hours, said once: "Mrs. Kowalski’s list had
    // Brauer and Brennan at Kowalski’s all evening", not the place twice.
    const r0 = head ? /^(.+?)( at .+)$/.exec(p0.clause.slice(head.length)) : null;
    const r1 = head && p1 && p1.src === p0.src && p1.clause.startsWith(head) ? /^(.+?)( at .+)$/.exec(p1.clause.slice(head.length)) : null;
    // docs/59 item 8: two people one answer had with them, at one place: "Kavanagh had said Abramowitz
    // and Broadnax were with him at the Lanza flat at eight", never "…, and that Broadnax was with
    // Kavanagh at…" (the name twice in one sentence).
    const wm = (cl: string) => (said ? new RegExp(`^${esc(said)}((?:he|she)(?:\u2063\\d+\u2064)?) was (home )?with (.+?)(?: (here|at .+?))? at (\\w+)$`).exec(cl) : null);
    const w0 = wm(p0.clause);
    const w1 = p1 && p1.src === p0.src ? wm(p1.clause) : null;
    const src = w0 && w1 && (w0[2] ?? '') === (w1[2] ?? '') && (w0[4] ?? '') === (w1[4] ?? '')
      ? w0[5] === w1[5]
        ? `${said}${w0[1]} was ${w0[2] ?? ''}with ${w0[3]} and ${w1[3]}${w0[4] ? ` ${w0[4]}` : ''} at ${w0[5]}`
        : `${p0.clause}, and with ${w1[3]} at ${w1[5]}`
      : w0 && w1
      ? `${p0.clause}, and with ${w1[3]}${w1[4] ? ` ${w1[4]}` : ''} at ${w1[5]}`
      : m0 && m1 && (m1[2] === undefined || m0[1] === m1[2]) && m0[2] === m1[3]
      ? `${p0.clause}, with ${m1[1]}`
      : r0 && r1 && r0[2] === r1[2]
      ? `${head}${r0[1]} and ${r1[1]}${r0[2]}`
      : p1 && head && p1.src === p0.src && p1.clause.startsWith(head)
      ? `${p0.clause}, and ${p1.clause.slice(head.length).replace(/ at the [^,]+? at /, ' at ').replace(new RegExp(` at ${esc(pl.short)} at `), ' at ').replace(p0.places[0] ? new RegExp(` at ${esc(placeName(c, p0.places[0]))} at `) : /$^/, ' at ').replace(p0.places[0] ? new RegExp(` at ${esc(placeName(c, p0.places[0]))}(?= all evening)`) : /$^/, '')}`
      : p1 && said && p1.src === p0.src && p1.clause.startsWith(said)
        ? `${p0.clause}, and that ${p1.clause.slice(said.length)}`
        : ptrs.map((p, i) => (i === 0 ? p.clause : cap(sameSubject(p.clause, p0.clause)))).join('. ');
    const why = w.hand.draw('why', { kind: 'arrive' }, withCaps({ src, place: pl.short }), { plain: true });
    put(w, 'why', why ?? `${cap(src)}.`, 'narrator', sit(w, why, `${cap(src)}.`));
  } else if (pl.scene && !first) {
    put(w, 'why', w.hand.draw('why', { kind: 'scene', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ victim: vict.short, thing: vict.short, client: clientOf(c).short, place: 'here' }), { plain: true }), 'narrator', lean() ? { tex: 'keep' } : {});
  }
  // What the detective thinks on the way in: what a watcher is good for, or the scene against the office's clock.
  // (docs/60 item 1: what a watcher is good for, or that nobody watches here, is a signpost: kept.)
  if (watcherLine) put(w, 'thought', watcherLine, 'thought', { about: here.filter((x) => personOf(c, x)?.role === 'watcher'), ...(lean() ? { tex: 'keep' as const } : {}) });
  else if (first && !c.lists.some((l) => l.place === place)) {
    const none = w.hand.drawOld('watch', (card) => card.tags.watcher === 'none', {}, true);
    put(w, 'thought', none?.text, 'thought', lean() ? { tex: 'keep' } : {});
  }
  // docs/59 items 1 and 3: on the way into the scene, not the office's hours and way in again. A
  // murder's door says what it means, as an aside with no fact in it; a small case's says nothing more.
  if (pl.scene && first && isMurder(c)) {
    const m = c.means.name.replace(/^(a|an) /, '');
    // docs/47 B9: the means is named here only when the office named it; otherwise the table says it, a page on.
    const officeSaid = c.givens.text.some((t) => t.toLowerCase().includes(m.toLowerCase()));
    const V = victimOf(c).short;
    const aside = officeSaid
      ? w.hand.pick('scene-said', [`Whoever did it had walked in with the ${m} already in hand.`, `The ${m} had come in at the front door, with whoever it was.`])
      : w.hand.pick('scene-door', [`Nobody had forced the lock, so ${V} had let whoever it was in.`, `There wasn’t a mark on the door. ${V} had opened it to whoever it was.`, `Nobody had picked the lock. ${V} had let the visitor in.`]);
    put(w, 'thought', aside, 'thought', { slot: 'gloss', about: [c.crime.victim], alts: pickAlts(w, aside), sit: { joke: false }, ...(lean() ? { tex: 'keep' as const } : {}) });
  }
  if (callback) {
    const pay = payOff(w, again);
    // (docs/49: somebody's own last-I-saw line is about them, for the planner's "him".)
    const theirs = PLAN.ops && again !== undefined && !!pay && (w.run.traits?.[again]?.pay ?? []).some((l) => `pay:${l.slice(0, 40)}` === w.lastPay?.id);
    put(w, 'close', pay, 'thought', { alts: payAlts(w, pay), ...(theirs ? { about: [again] } : {}), ...(pay ? callbackOf(w) : {}) });
  }
  if (!(w.parts.close ?? []).length) {
    const close = w.hand.draw('arrive-close', { kind: pl.scene && first ? 'scene' : stageKind(c, place) }, withCaps({ place: pl.short }), { joke: true });
    put(w, 'close', close, 'thought', sit(w, close));
  }
  w.places.add(place);
  lay(w, 'arrival');
  w.hand.avoid = null;
}

/**
 * docs/60 item 5: a street said once in a clause (lean): "the passage from the street", never "…on Allen
 * Street the passage from Allen Street". (Further on, "because on Second Avenue nobody goes home…", it's
 * the joke, and stays.)
 */
function streetOnce(text: string, street: string): string {
  if (!lean() || !street) return text;
  const re = new RegExp(`\\b${esc(street)}\\b`, 'g');
  let last = -1;
  return text.replace(re, (m, at: number) => {
    const near = last >= 0 && text.slice(last, at).split(/\s+/).length <= 6;
    last = at + m.length;
    return near ? 'the street' : m;
  });
}

/**
 * docs/60 item 1: who's there doing what, in a sentence or two: each person's line to its first clause
 * (what they're doing, not the flourish after it: "Mrs. Bledsoe was in the hall with a dustpan", not
 * "…, sweeping a stair that had been swept already"), up to three to a sentence. A line whose pronoun
 * could be somebody named before it in the sentence starts a sentence of its own; the client and
 * somebody "still there" keep theirs.
 */
function peopleInBrief(c: BoardCase, xs: { text: string; about: PersonId[]; alts?: Item['alts'] }[]): { text: string; about: PersonId[]; alts?: Item['alts'] }[] {
  const out: { text: string; about: PersonId[]; alts?: Item['alts'] }[] = [];
  let group: { text: string; head: string; about: PersonId[]; alts?: Item['alts'] }[] = [];
  const flush = () => {
    // (One person alone keeps their whole line, what they're doing and all: "stacking nickels into columns".)
    if (group.length === 1) {
      const g = group[0] as (typeof group)[number];
      out.push({ text: g.text, about: g.about, ...(g.alts ? { alts: g.alts } : {}) });
    } else if (group.length > 1) {
      const parts = group.map((g) => g.head.replace(/\.$/, ''));
      out.push({ text: `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`, about: group.flatMap((g) => g.about) });
    }
    group = [];
  };
  for (const x of xs) {
    const p = x.about.length === 1 ? personOf(c, x.about[0] as PersonId) : undefined;
    // (Only a line that opens on its one person's name: the client's own, and "still there", stand alone.)
    if (!p || p.role === 'client' || !x.text.startsWith(p.short) || /\bstill there\.$/.test(x.text) || sentencesOf(x.text).length > 1) {
      flush();
      out.push(x);
      continue;
    }
    // Their name (a face said with it, "Winslow, in a green hat,"), and what they're doing, to its first comma.
    const look = new RegExp(`^${esc(p.short)}, [^,]+, `).exec(x.text)?.[0] ?? `${p.short} `;
    const rest = x.text.slice(look.length);
    const comma = rest.indexOf(', ');
    const head = comma >= 0 && !/^and\b/.test(rest.slice(comma + 2)) && `${look}${rest.slice(0, comma)}`.split(/\s+/).length >= 6 ? `${look}${rest.slice(0, comma)}.` : x.text;
    // (A pronoun after somebody of that sex already in the sentence could be theirs: a sentence of its own.)
    const pr = /\b(she|her|he|him|his)\b/i.exec(head.slice(look.length))?.[1]?.toLowerCase();
    const female = pr === 'she' || pr === 'her';
    const clash = !!pr && group.some((g) => g.about.some((id) => personOf(c, id)?.female === female));
    if (clash || group.length === 3) flush();
    group.push({ text: x.text, head, about: x.about, ...(x.alts ? { alts: x.alts } : {}) });
  }
  flush();
  return out;
}

/** A second pointer that opens on somebody the first just named opens on "he" or "she" instead. */
function sameSubjectIn(c: BoardCase, clause: string, before: string): string {
  for (const p of c.people) {
    if (p.object || !clause.startsWith(`${p.short} `) || !before.includes(p.short)) continue;
    const others = c.people.filter((x) => x !== p && !x.object && x.female === p.female && before.includes(x.short));
    if (others.length) return clause;
    return `${pronOf(c, p.id).he}${clause.slice(p.short.length)}`;
  }
  return clause;
}

function oldWatch(w: Writer, job: string, name: string): string | null {
  const role = WATCH_ROLE[job];
  if (!role) return null;
  return w.hand.drawOld('watch', (card) => card.tags.watcher === role, { watcher: name })?.text ?? null;
}

/** Back to the office: the walk, the room, and why (there's nothing to ask there). */
export function writeReturn(w: Writer): void {
  writeWalk(w, w.before.at, OFFICE);
  put(w, 'arrival', 'I went back up to the office. It had kept my chair warm for nobody.', 'establish');
  const why = w.hand.draw('why', { kind: 'return' }, {}, { plain: true });
  put(w, 'why', why, 'narrator', { ...sit(w, why), ...(lean() ? { tex: 'flourish' as const } : {}) });
  lay(w, 'return');
}

/* ------------------------------------------------------------------ *
 * "Where were you tonight?"
 * ------------------------------------------------------------------ */

const MANNERS: Manner[] = ['plain', 'plain', 'terse', 'careful'];

export function mannerOf(c: BoardCase, p: PersonId): Manner {
  let h = 0;
  for (const ch of `${c.id}|${p}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return worldManner(c, p) ?? (MANNERS[h % MANNERS.length] as Manner);
}

/**
 * Staging, the ask and the reaction, the same for everybody of a manner in a
 * place of a kind: the reaction never knows whether they're about to lie.
 */
function stageAndAsk(w: Writer, p: PersonId, job: 'account' | 'check' | 'list' | 'motive', ptr: Pointer | null, extra: Record<string, string | undefined> = {}): void {
  const c = w.c;
  const s = withCaps({ ...who(c, p), ...extra });
  const manner = personOf(c, p)?.role === 'watcher' ? 'watcher' : mannerOf(c, p);
  const look = setUp(w, p);
  // Somebody met on an earlier page has moved, or hasn't: where they are now, before I sit down.
  const seenBefore = personOf(c, p)?.role !== 'watcher' && w.before.log.some((pg) => pg.at === w.run.at && pg.board?.job === 'arrive') && !(w.before.log[w.before.log.length - 1]?.board?.job === 'arrive' && w.before.at === w.run.at);
  // The why has named them already: where they are now would be the second name before a word is asked.
  const namedInWhy = (w.parts.why ?? []).some((x) => x.text.includes(nameOf(c, p)));
  if (seenBefore && !namedInWhy) put(w, 'staging', w.hand.draw('still', { kind: stageKind(c, w.run.at) }, s), 'act', { about: [p] });
  // A watcher is staged by the job: a club's doorkeeper isn't behind a bar.
  const watcher = personOf(c, p)?.role === 'watcher';
  const sk = stageKind(c, w.run.at);
  const kind = watcher && sk === 'bar' && jobKey(personOf(c, p)?.description ?? '') !== 'bartender' ? 'any' : sk;
  // Met on the way in: they've already opened the door to me.
  const metHere = w.before.log.some((pg) => pg.at === w.run.at && pg.board?.job === 'arrive');
  const avoidStage = w.hand.avoid;
  if (metHere) w.hand.avoid = alsoAvoid(avoidStage, /\bdoor\b/);
  // docs/48 §3: the bible first (what they're doing, the place's own habit); the deck fills what's left.
  const own = worldStaging(c, w.run, w.hand, p);
  if (theySitNow(w, p)) w.hand.avoid = alsoAvoid(w.hand.avoid, ASK_SIT);
  const staged = own ?? w.hand.draw('staging', { kind, who: watcher ? 'watcher' : 'person', manner }, s);
  put(w, 'staging', staged, 'act', { about: [p], ...(own ? {} : sit(w, staged)) });
  w.hand.avoid = avoidStage;
  putOn(w, 'staging', look, 'act');
  const face = ptr?.face && job === 'account' ? ptr.face : undefined;
  // "Mr. Ashby." to his face is a name too: not when the why has said it.
  const avoid = w.hand.avoid;
  // An evening with a side remark in it will name them again in the thought (the collision it makes): no "Mr. Stannard." to their face as well (docs/39 §4).
  const remarks = job === 'account' && (accountOf(c, p)?.remarks.length ?? 0) > 0;
  // docs/49: with the planner on, not when the staging has just said the name either: the thought will want it.
  const namedInStaging = PLAN.ops && (w.parts.staging ?? []).some((x) => x.text.includes(nameOf(c, p)));
  if (namedInWhy || remarks || namedInStaging) w.hand.avoid = alsoAvoid(avoid, /\{Title\}/);
  // docs/59 item 4: nobody already sitting is asked to sit.
  if (theySitNow(w, p)) w.hand.avoid = alsoAvoid(w.hand.avoid, ASK_SIT);
  // docs/60 item 1: lean, the ask is the page's one staging line, so it says whom I'm asking, where
  // nothing before it on the page has.
  // (A why the budget will take off the page, "Hauck was the one I wanted to talk to.", doesn't count.)
  const named = (w.parts.why ?? []).some((x) => x.tex !== 'flourish' && x.text.includes(nameOf(c, p)));
  if (lean() && !face && !named) w.hand.avoid = alsoAvoid(w.hand.avoid, /^(?![\s\S]*\{(?:[Nn]ame|Title)\})/);
  // (And, sitting already, the ask doesn't sit me down again: the situated deck saw to that, and lean the ask is the hand's.)
  if (lean() && seatedNow(w)) w.hand.avoid = alsoAvoid(w.hand.avoid, SAT);
  const asked = w.hand.draw('ask', { job, face: face ? 'yes' : 'no' }, withCaps({ ...s, reason: face }));
  // (docs/60 item 1: lean, an ask said to their face names nobody: where nothing before it has named
  // them, a plain line says whom I'm asking, and it stays.)
  if (lean() && face && asked && !named) put(w, 'ask', `I went over to ${nameOf(c, p)}.`, 'act', { about: [p], tex: 'keep' });
  // (An ask that says the reason to their face carries it: it stays.)
  put(w, 'ask', asked, 'exchange', { about: [p], ...(face ? {} : sit(w, asked)), ...(lean() && face && asked && !named ? { runOn: true } : {}) });
  w.hand.avoid = avoid;
  const reaction = w.hand.draw('reaction', { job: job === 'check' ? 'account' : job, manner }, s);
  put(w, 'reaction', reaction, 'act', { about: [p], ...sit(w, reaction) });
}

export function writeAccount(w: Writer, p: PersonId): void {
  const { c } = w;
  const a = accountOf(c, p);
  if (!a) return;
  stageGuard(w, w.run.at);
  const q = `account:${p}`;
  const s = withCaps(who(c, p));
  const check = (sourceOfQ(c, w.before.asked, q) ?? '').startsWith('confront:');
  const ptr = whyHere(w, q, check ? 'check' : 'account', s);
  stageAndAsk(w, p, check ? 'check' : 'account', ptr);
  const said = spokenAccountLines(c, a, mannerOf(c, p), c.seed % 4);
  // docs/48 §3: the evening is the engine's, exactly; how they open and close it is their own.
  const v = worldAccountVoice(c, w.hand, p, hoursWithReason(c, a));
  // Planner 2: their line for an hour frames the account, never inside it: after the evening's own
  // lines (and before anything they passed on the way). (docs/59: never the evening's first hour,
  // whose line sat before that hour's own fact, "Eight, I think about mortality. At eight o’clock I
  // was at Russo’s"; `worldAccountVoice` doesn't pick it.)
  const told: (SaidLine | { voice: string })[] = [...said];
  if (v.coda) {
    const remark = said.findIndex((x) => x.remark !== undefined);
    const at = v.codaHour === c.board.hours[0] ? 0 : remark < 0 ? said.length : remark;
    told.splice(at, 0, { voice: v.coda });
  }
  // docs/49: the answer a line a fact (the hours it tells), their own voice lines gaps, one quotation.
  answer(
    w,
    [...(v.open ? [{ voice: v.open }] : []), ...told].map((x) =>
      'voice' in x
        ? { text: x.voice, gap: true }
        : {
            text: x.text,
            about: [...new Set([p, ...(x.remark !== undefined ? (x.people ?? []) : x.hours.flatMap((h) => a.claims[h as Hour]?.company ?? []))])],
            carries: x.remark !== undefined ? [`remark:account:${p}#${x.remark}`] : x.hours.map((h) => `claim:${p}@${h}`),
            props: x.props,
            ...(x.say ? { say: x.say } : {}),
          },
    ),
  );
  for (const h of c.board.hours) {
    w.told.add(`claim:${p}@${h}`);
    w.hours.add(h);
    for (const x of a.claims[h]?.company ?? []) w.people.add(x);
    w.places.add(a.claims[h]?.place ?? '');
  }
  a.remarks.forEach((r, i) => {
    w.told.add(`remark:account:${p}#${i}`);
    for (const f of r.facts) {
      w.hours.add(f.h);
      w.people.add(f.p);
    }
  });
  think(w, q);
  // docs/60 item 5 (docs/59 §7): lean, the sighting said to their face ("Demos saw you here at eight and
  // eleven") isn't said again in the thought ("Some of his evening did hold: Demos saw him at Steinmetz’s
  // at eight and eleven"): the page has said it.
  if (lean() && ptr?.face) {
    const by = ptr.src.split(':')[1] ?? '';
    const ps = w.parts.thought ?? [];
    for (let i = ps.length - 1; i >= 0; i--) {
      const x = ps[i] as Item;
      const props = x.props ?? [];
      if (!/^thought:agree/.test(x.tag ?? '') || !props.length || !props.every((y) => y.k === 'CONFIRMS' && (y.by as { who?: string }).who === by)) continue;
      ps.splice(i, 1);
      // (And the aside that said it held, after it.)
      if ((ps[i] as Item | undefined)?.slot === 'gloss' && (ps[i] as Item).runOn) ps.splice(i, 1);
      if (ps[0]) ps[0].runOn = false;
    }
  }
  handOff(w, check);
  closeWith(w, p, 'account-close', {}, s);
  lay(w, check ? 'check' : 'account');
  w.hand.avoid = null;
}

/* ------------------------------------------------------------------ *
 * "Who was here tonight?"
 * ------------------------------------------------------------------ */

export function writeList(w: Writer, watcher: PersonId): void {
  const { c } = w;
  const l = listOf(c, watcher);
  if (!l) return;
  stageGuard(w, w.run.at);
  const q = `list:${watcher}`;
  const s = withCaps({ ...who(c, watcher), job: jobWords(personOf(c, watcher)?.description ?? '') });
  whyHere(w, q, 'list', s);
  stageAndAsk(w, watcher, 'list', null, { job: s.job });
  // docs/48 §3: in the watcher's own words at either end. docs/59 item 2: the list told by what
  // changed, with "nobody else" once for the span: the watcher's own last words from the bible, where
  // they have some ("That's the lot."), say it in place of the clause that would.
  const kept = c.board.hours.filter((h) => l.entries[h] !== undefined);
  const peopled = kept.filter((h) => !shutAtPlace(c, l.place, h) && (l.entries[h] ?? []).length > 0);
  const own = worldListLines(c, w.hand, watcher, kept, peopled.length > 0 && peopled.every((h) => listWhole(c, l, h)));
  // (docs/60 item 1: lean, the bible's own last words, "Anybody else came to my slot, he’s still out on the sidewalk", are its voice: the plain clause says nobody else.)
  const lines = spokenListLines(c, l, c.seed % 4, mannerOf(c, watcher), lean() ? undefined : own.nobody);
  // docs/49: a line a fact (the hours it tells); the watcher's own opening line a gap.
  answer(
    w,
    [...(own.open ? [{ text: own.open, gap: true }] : []), ...lines.map((x) => {
      const ppl = x.remark !== undefined ? (x.people ?? []) : x.hours.flatMap((h) => (l.entries[h as Hour] ?? []).flatMap((e) => ('person' in e ? [e.person] : [])));
      return {
        text: x.text,
        about: [watcher, ...ppl],
        carries: x.remark !== undefined ? [`remark:list:${watcher}#${x.remark}`] : x.hours.map((h) => `list:${watcher}@${h}`),
        place: l.place,
        props: x.props,
        ...(x.say ? { say: x.say } : {}),
      };
    })],
    true,
  );
  // The handover: what was under the coat is the question anybody would ask, and the answer says no more than the watcher saw.
  if (l.remarks.some((r) => r.gives?.whereNow)) {
    const what = c.type === 'lost-pet' ? 'pet' : 'item';
    put(w, 'job', w.hand.draw('coat-q', {}, {}, { widen: true, plain: true }), 'exchange', { slot: 'ask', ...(lean() ? { tex: 'keep' as const } : {}) });
    const r = l.remarks.findIndex((x) => x.gives?.whereNow);
    // docs/52 build 2: what was under the coat, a composite of its own (HANDOVER `coat`), in the watcher's voicing.
    const coat: SaySpec = { shape: 'HANDOVER', flags: ['coat', what === 'pet' ? 'alive' : 'small'], args: {}, manner: mannerOf(c, watcher) };
    fact(w, 'job', `“${sayFirst(c, coat) ?? 'Something.'}”`, 'answer', {
      about: [watcher],
      carries: [`remark:list:${watcher}#${r}`],
      props: [{ k: 'HANDOVER', to: 'other:fence', place: l.place, hour: c.crime.hour + 1, what: what === 'pet' ? 'alive' : 'small' }],
      speech: true,
      say: coat,
    });
  }
  for (const h of c.board.hours) {
    if (!l.entries[h]) continue;
    w.told.add(`list:${watcher}@${h}`);
    w.hours.add(h);
    for (const e of l.entries[h] ?? []) if ('person' in e) w.people.add(e.person);
  }
  l.remarks.forEach((r, i) => {
    w.told.add(`remark:list:${watcher}#${i}`);
    for (const f of r.facts) w.hours.add(f.h);
    for (const p of r.mentions?.people ?? []) w.people.add(p);
    for (const p of r.mentions?.places ?? []) w.places.add(p);
  });
  // A remark may name hours of its own ("I came on at ten", "the chloral … at seven").
  for (const h of c.board.hours) if (l.remarks.some((r) => r.text.includes(hourWord(h)))) w.hours.add(h);
  w.places.add(l.place);
  // A second story told earlier, and this list is where it said: they aren't on it.
  const extra: Said[] = [];
  const refs: string[] = [];
  // The second story was an earlier page: at fact level the grid shows the collision, the thought doesn't.
  for (const putx of thoughtLevel(c) === 'fact' ? [] : w.run.puts.filter((x) => x.landed && !x.again)) {
    const k = confrontationOf(c, putx.person, putx.hour);
    if (k?.secondLie?.place !== l.place) continue;
    const es = l.entries[putx.hour] ?? [];
    if (es.some((e) => 'person' in e && e.person === putx.person)) continue;
    extra.push({
      text: `${nameOf(c, putx.person)}’s second story had ${markedPron(c, putx.person).him} at ${placeName(c, l.place)} at ${oclock(putx.hour)}. ${nameOf(c, l.watcher)} didn’t have ${markedPron(c, putx.person).him}.`,
      props: [{ k: 'COLLIDES', person: putx.person, place: l.place, hour: putx.hour, second: true, with: { k: 'list', who: l.watcher } }],
      say: { shape: 'COLLISION-PAIR', flags: ['second-list'], args: { person: { t: 'person', id: putx.person }, at: { t: 'at', id: l.place, here: w.run.at }, hour: { t: 'hour', h: putx.hour }, watcher: { t: 'person', id: l.watcher } } },
    });
    refs.push(`second:${putx.person}@${putx.hour}`);
    w.hours.add(putx.hour);
    w.people.add(putx.person);
  }
  think(w, q, extra.length ? thoughtOnly(extra, refs) : null);
  handOff(w);
  closeWith(w, watcher, 'list-close', {}, s);
  lay(w, 'list');
  w.hand.avoid = null;
}

/* ------------------------------------------------------------------ *
 * A search.
 * ------------------------------------------------------------------ */

function pastTense(s: string): string {
  return s.replace(/\bis\b/g, 'was').replace(/There’s/g, 'There was').replace(/\bhangs\b/g, 'hung');
}

export function writeSearch(w: Writer, findId: string): void {
  const { c } = w;
  const f = c.finds.find((x) => x.id === findId);
  if (!f) return;
  const vict = victimOf(c);
  const q = `search:${findId}`;
  const what = f.gives.why ? 'papers' : /table/.test(f.what) ? 'table' : /floor/.test(f.what) ? 'floor' : 'parlour';
  // docs/55 2: going through a box of papers isn't going over a room (Hard-boiled 8's #19, Poached 5's #5).
  if (f.gives.why) w.hand.avoid = alsoAvoid(w.hand.avoid, PAPERS_NOT_ROOM);
  if (hasRole(w)) w.hand.hold(true);
  whyHere(w, q, f.gives.why ? 'papers' : 'search', withCaps({ client: clientOf(c).short, victim: vict.short, thing: vict.short }));
  const act = w.hand.draw('search-act', { what }, withCaps({ client: clientOf(c).short, victim: vict.short }), { widen: true });
  put(w, 'staging', act, 'act', { about: [c.crime.victim], ...sit(w, act) });
  // The client is at the scene, and watches: the page's reaction beat.
  if (!f.gives.why) {
    const watch = w.hand.draw('search-watch', { type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...who(c, c.client), client: clientOf(c).short, thing: vict.short }));
    put(w, 'reaction', watch, 'act', { about: [c.client], ...sit(w, watch) });
  }
  w.told.add(`find:${findId}`);
  if (f.gives.why) {
    // docs/47 B7: a page on each of them, a grievance on each page by name, and nobody's on top.
    // (docs/46 had the pages name nobody, which made the report's why a guess; before that, the one
    // on top named who.) At every tier: the papers say why, never who.
    // docs/52 build 2: what the papers were (FIND `papers`), and what each page said (MOTIVE-SET `papers-list`), in voicings.
    const papers: SaySpec = { shape: 'FIND', flags: ['papers'], args: { victim: { t: 'person', id: c.crime.victim } } };
    fact(w, 'job', sayFirst(c, papers) ?? `${pronOf(c, c.crime.victim).He} had a page on every one of them, and a reason on every page.`, 'find', { about: [c.crime.victim], carries: [`find:${findId}`], props: findProps(c, findId), say: papers });
    const ps = whyOrder(c, suspectsOf(c));
    const pages: SaySpec = { shape: 'MOTIVE-SET', flags: ['papers-list'], args: { lines: ps.map((p) => papersLine(c, p, PLAN.ops)).join(' ') } };
    fact(w, 'job', ps.map((p) => papersLine(c, p, PLAN.ops)).join(' '), 'find', { about: ps, carries: ps.map((p) => `motive:${p}`), keepNames: true, props: ps.map((p) => ({ k: 'MOTIVE', person: p }) as Prop), flesh: { papers: ps.map((p) => papersLine(c, p, PLAN.ops)) }, say: pages });
    for (const p of ps) w.people.add(p);
    w.people.add(c.crime.victim);
    const V = vict.short;
    // docs/59 item 3 (and the designer's note 7): what the pages mean, as an aside, plainly: a reason
    // isn't proof. Not the pages again, and not "a hand on the laudanum".
    think(w, q, thoughtOnly([{ gloss: w.hand.pick('papers-even', [`Everybody in ${V}’s box had a reason, and a reason isn’t proof.`, `A reason isn’t proof, and everybody in ${V}’s box had one.`]) }], ['givens:found'], { people: [c.crime.victim] }));
    handOff(w);
    closeWith(w, undefined, 'search-close', {}, {});
    lay(w, 'search');
    return;
  }
  const origin = placeName(c, c.means.origin);
  const empty = isMurder(c) ? '' : emptyOf(c, pastTense(thingEmpty(c)));
  // docs/52 build 2: what the search turned up (FIND, by the way in), in a voicing; the case's own words where none fits.
  const ma = meansArgs(c);
  // (docs/59: the poison by name, so the thought after the find isn't the first the page says of it.)
  const found: SaySpec = { shape: 'FIND', flags: ['means', c.setup?.means ?? '', ...ma.flags], args: { ...stringArgs(withCaps({ x: origin, victim: vict.short, empty, thing: vict.short, means: c.means.name.replace(/^(?:a|an|the) /, '') })), ...ma.args }, keep: true };
  fact(w, 'job', sayFirst(c, found) ?? f.text, 'find', { about: [c.crime.victim], carries: [`find:${findId}`], place: c.means.origin, props: findProps(c, findId), say: found });
  w.places.add(c.means.origin);
  // docs/59 item 3: what it means, not the find again: whoever did it had been where the means was, first.
  const mode = c.setup?.means ?? '';
  const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
  const kind = isMurder(c) ? (c.means.kind === 'gun' ? 'gun' : c.means.kind === 'blade' ? 'blade' : 'poison') : party ? 'party' : /^told/.test(mode) ? 'told' : 'spare';
  const at = kind === 'party' ? c.crime.scene : c.means.origin;
  const there = placeName(c, at);
  const cl = clientOf(c).short;
  const body =
    kind === 'gun'
      ? `Whoever shot ${vict.short} had been at ${there} first, for the gun.`
      : kind === 'blade'
        ? `Whoever used the knife on ${vict.short} had been at ${there} first, to take it.`
        : kind === 'poison'
          ? `Whoever gave it to ${vict.short} had been at ${there} first, to get it.`
          : kind === 'party'
            ? `Whoever it was had been at ${cl}’s ${party?.occasion ?? 'party'} at ${there} first.`
            : kind === 'told'
              ? `Whoever it was had heard ${cl} at ${there} first.`
              : `Whoever let themselves into ${cl}’s flat had been at ${there} first, for the key.`;
  const props: Prop[] = [{ k: 'MEANS', how: 'first', place: at }];
  const say: SaySpec = { shape: 'WINDOW-MEANS', flags: ['find', 'first', kind], args: { origin: { t: 'place', id: at }, victim: { t: 'person', id: c.crime.victim }, client: { t: 'person', id: c.client }, occasion: party?.occasion ?? '', means: c.means.name.replace(/^(?:a|an|the) /, '') } };
  const refs = isMurder(c) ? ['givens:found'] : ['givens:means'];
  void origin;
  // (docs/56 A19: the search's reasoning says itself, without a "So" in front of it.)
  think(w, q, thoughtOnly([{ text: body, props, say }], refs, { places: [at] }));
  handOff(w);
  closeWith(w, undefined, 'search-close', {}, {});
  lay(w, 'search');
}

/**
 * docs/59: the empty place says what isn't there ("The cushion by the radiator was empty: no Duchess.",
 * "There was a clean square in the dust on the sideboard, where the cigarette case had been."): the
 * skim readers couldn't tell from the page what was gone.
 */
function emptyOf(c: BoardCase, line: string): string {
  const thing = victimOf(c).short;
  if (!line) return line;
  if (/^There was a clean square\b/.test(line)) return line.replace(/\.$/, `, where ${thing} had been.`);
  return line.replace(/\.$/, `: no ${thing.replace(/^the /, '')}.`);
}

function thingEmpty(c: BoardCase): string {
  const line = c.finds.find((f) => f.gives.means)?.text ?? '';
  // The find's first sentence is the empty basket or dome.
  return line.split(/(?<=\.)\s/)[0] ?? '';
}

/* ------------------------------------------------------------------ *
 * The victim, or the thing: a suspect's reason, in their own words.
 * ------------------------------------------------------------------ */

export function writeMotive(w: Writer, p: PersonId): void {
  const { c } = w;
  const person = personOf(c, p);
  if (!person) return;
  const vict = victimOf(c);
  const cl = clientOf(c);
  const vars = c.givens.lines?.find((g) => g.kind === 'gone')?.vars ?? {};
  const s = withCaps({ ...who(c, p), victim: vict.short, thing: vict.short, client: cl.short, breed: vars.breed, pthem: vars.pthem ?? 'it' });
  const q = `motive:${p}`;
  const ptr = threadFor(c, w.before, `account:${p}`, w.run.at);
  license(w, ptr);
  // (docs/49: the card's "how he felt" is theirs, whoever else its pointer names.)
  const msrc = ptr.clause || `${person.short} was in the room`;
  const mwhy = w.hand.draw('why', { kind: 'motive' }, withCaps({ ...s, src: msrc }), { plain: true });
  put(w, 'why', mwhy, 'narrator', { ...(PLAN.ops ? { about: [p] } : {}), ...sit(w, mwhy, `${cap(msrc)}.`) });
  const look = setUp(w, p);
  const staged = w.hand.draw('staging', { kind: stageKind(c, w.run.at), who: 'person', manner: mannerOf(c, p) }, s);
  put(w, 'staging', staged, 'act', { about: [p], ...sit(w, staged) });
  putOn(w, 'staging', look, 'act');
  const mask = w.hand.draw('motive-ask', {}, s, { widen: true });
  put(w, 'ask', mask, 'act', { about: [p], ...sit(w, mask) });
  const mreact = w.hand.draw('reaction', { job: 'motive', manner: mannerOf(c, p) }, s);
  put(w, 'reaction', mreact, 'act', { about: [p], ...sit(w, mreact) });
  fact(w, 'job', w.hand.draw('motive', { id: person.motiveId }, s, { need: true }) ?? `“${cap(person.motive ?? 'Nothing')}.”`, 'answer', { about: [p], carries: [`motive:${p}`], props: [{ k: 'MOTIVE', person: p }] });
  // The thought: the reason against what the office said, and against the hours that matter.
  const aside = c.givens.lines?.find((g) => g.kind === 'aside');
  const inAside = !!aside && Object.entries(aside.vars).some(([k, v]) => /^p\d+$/.test(k) && v === person.short);
  const pointerSaid = c.givens.pointer === p && /motive|gossip/.test(c.setup?.pointer ?? '');
  // docs/59 item 3: not "that was their reason" (they've just said it), but whose word it backs: the office's, or nobody's.
  const sentences: (Said | Gloss)[] = [];
  const refs: string[] = [];
  // docs/47 C13: said as a detective thinks it, never as the form asks it ("the report wants both").
  const notHour = w.hand.pick('reason-hour', ['A reason isn’t an hour, though.', 'Plenty of people have a reason. Fewer have the hour to go with it.', 'A reason is the easy half.']);
  if (inAside || pointerSaid) {
    sentences.push({ text: `It was what ${cl.short} had said in the office, near enough.`, props: [{ k: 'MOTIVE', person: p, said: 'office' }], say: { shape: 'MOTIVE-SET', flags: ['office'], args: { client: { t: 'person', id: c.client } } } }, { gloss: notHour });
    refs.push(pointerSaid ? 'givens:pointer' : 'givens:aside');
  } else {
    // docs/55 2: a reason the papers had already isn't "news to me" (Hard-boiled 8's #1).
    const papers = w.before.asked.some((x) => x.startsWith('search:') && !!c.finds.find((f) => `search:${f.id}` === x)?.gives.why);
    sentences.push({ text: `${cl.short} hadn’t mentioned it.`, props: [{ k: 'MOTIVE', person: p, said: 'not-office' }], say: { shape: 'MOTIVE-SET', flags: ['not-office', ...(papers ? ['papers'] : [])], args: { client: { t: 'person', id: c.client } } } }, { gloss: notHour });
    refs.push('givens:pointer');
  }
  w.people.add(c.client);
  // At fact level the thought doesn't reach back to their evening, an earlier page.
  if (w.run.asked.includes(`account:${p}`) && thoughtLevel(c) !== 'fact') {
    const hc = crimeHourKnown(c, w.run);
    const hs = hc !== null ? [hc] : (c.givens.window ?? c.crime.window);
    sentences.push({ text: `For ${andList(hs.map(hourWord))}, ${markedPron(c, p).he} had told me ${andList(hs.map((h) => claimSaid(c, p, h)))}.`, props: hs.map((h) => claimProp(c, p, h, { place: true, company: false })), say: { shape: 'OWN-WORD', flags: ['told'], args: { person: { t: 'person', id: p }, hours: { t: 'hours', hs: [...hs] }, said: andList(hs.map((h) => claimSaid(c, p, h))) } } });
    refs.push(...hs.map((h) => `claim:${p}@${h}`));
    for (const h of hs) w.hours.add(h);
    for (const h of hs) w.places.add(accountOf(c, p)?.claims[h]?.place ?? '');
  }
  think(w, q, thoughtOnly(sentences, refs, { rel: inAside || pointerSaid ? 'confirms' : 'new', people: [p, c.client] }));
  closeWith(w, p, 'motive-close', {}, s);
  w.people.add(c.crime.victim);
  lay(w, 'motive');
}

/* ------------------------------------------------------------------ *
 * Put it to them.
 * ------------------------------------------------------------------ */

/**
 * docs/52 build 2: why a put didn't land, as a composite (REACTION `held`): whose line it was, what
 * it said, and the reason's code. Null where the reason isn't one of the judge's own.
 */
function heldSay(c: BoardCase, p: PersonId, h: Hour, j: Judgement, line: Line): SaySpec | null {
  if (!j.why) return null;
  const code = j.code ?? 'second-time';
  const args: SaySpec['args'] = { person: { t: 'person', id: p }, hour: { t: 'hour', h } };
  if (line.speaker) args.by = { t: 'person', id: line.speaker as PersonId };
  if (line.place) args.place = { t: 'place', id: line.place as PlaceId };
  const cl = accountOf(c, p)?.claims[h];
  if (cl) args.where = { t: 'place', id: cl.place };
  const hourless = code === 'untouched' && !/ at (?:seven|eight|nine|ten|eleven|twelve) o’clock\.$/.test(j.why);
  return { shape: 'REACTION', flags: ['held', code, ...(hourless ? ['hourless'] : [])], args };
}

export function writeConfront(w: Writer, p: PersonId, h: Hour, line: Line, j: Judgement, again: boolean): void {
  const { c } = w;
  if (hasRole(w, p)) w.hand.hold(true);
  const s = withCaps({ ...who(c, p) });
  const claimLine = again ? `${placeName(c, confrontationOf(c, p, h)?.secondLie?.place ?? '')} at ${hourWord(h)}` : claimSaid(c, p, h);
  // Why: their line and what's held against it.
  // (A watcher by what they are, "the landlady": the put names them a line later; docs/39 §4's three names.)
  const src = line.q.startsWith('list:') ? (roleOf(c, line.q.slice(5)) ?? sourceName(c, line.q)) : sourceName(c, line.q);
  const psrc = `${nameOf(c, p)} had told me ${claimLine}, and ${src} said otherwise`;
  const pwhy = w.hand.draw('why', { kind: 'put' }, withCaps({ ...s, src: psrc, claim: claimLine }), { plain: true });
  put(w, 'why', pwhy, 'narrator', { about: [p], ...sit(w, pwhy, `${cap(psrc)}.`) });
  const pstage = w.hand.draw('put-stage', {}, s);
  put(w, 'staging', pstage, 'act', { about: [p], ...sit(w, pstage) });
  // Said to their face: "Tillman passed you on Avenue B", not "passed Hargrove".
  const toYou = (t: string) => t.replace(new RegExp(`\\b(passed|had|put|saw) ${nameOf(c, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '$1 you');
  // Two people who give each other for company are said once: "Rosenbaum and Broadnax had each other at the Blue Lantern at ten o’clock."
  const other = (j.with ?? [])[0];
  const mutual =
    (j.with ?? []).length === 1 && other && line.kind === 'claim' && other.kind === 'claim' && line.place === other.place && line.hour === other.hour && line.about.includes(other.speaker as string) && other.about.includes(line.speaker as string);
  const breaker = mutual
    ? `${nameOf(c, line.speaker as string)} and ${nameOf(c, other.speaker as string)} had each other at ${placeName(c, line.place as string)} at ${oclock(line.hour as Hour)}.`
    : toYou(`${cap(breakSaid(c, line, p, w.run.asked))}.${(j.with ?? []).length > 0 ? ` ${cap(andList((j.with ?? []).map((x) => breakSaid(c, x, p, w.run.asked))))}.` : ''}`);
  // docs/52 build 2: the put (COLLISION-PAIR `put`): their line and the line against it, in a voicing.
  const putSay: SaySpec = { shape: 'COLLISION-PAIR', flags: ['put', again ? 'second' : 'first'], args: { person: { t: 'person', id: p }, claim: claimLine, breaker } };
  fact(w, 'ask', sayFirst(c, putSay) ?? `“You told me ${claimLine},” I said. “${breaker}”`, 'exchange', {
    say: putSay,
    relation: 'collides',
    about: [p, ...c.people.filter((x) => !x.object && breaker.includes(x.short)).map((x) => x.id)],
    hour: h,
    carries: [`claim:${p}@${h}`, line.id, ...(j.with ?? []).map((x) => x.id)],
    // docs/52: their line (or their second story), against each line put to them.
    props: [line, ...(j.with ?? [])].map(
      (x) => ({ k: 'COLLIDES', person: p, place: again ? (confrontationOf(c, p, h)?.secondLie?.place ?? '') : (accountOf(c, p)?.claims[h]?.place ?? ''), hour: h, ...(again ? { second: true } : {}), with: lineProps(c, x).length ? breakerProp(c, x, p, w.run.asked) : srcOfQ(x.q) }) as Prop,
    ),
  });
  w.hours.add(h);
  w.people.add(p);
  // A face the breaker names ("the only one in a fur collar was Steinbach") came from a held evening.
  for (const x of c.people) if (!x.object && breaker.includes(x.short)) w.people.add(x.id);
  for (const x of [line, ...(j.with ?? [])]) {
    for (const y of x.about) w.people.add(y);
    if (x.speaker) w.people.add(x.speaker);
    if (x.place) w.places.add(x.place);
    w.told.add(x.id);
  }
  const lineRef = [line.id];
  const done = (family: string, thought: (Said | Gloss)[], refs: string[], rel: Relation = 'new') => {
    think(w, `confront:${p}@${h}`, thoughtOnly(thought, refs, { rel, people: [p] }));
    handOff(w);
    closeWith(w, p, family, {}, s);
    lay(w, 'put');
  };
  if (!j.landed) {
    const how = w.hand.draw('react', { response: 'held' }, s, { widen: true });
    react(w, p, how ?? `${nameOf(c, p)} heard me out.`, '“That doesn’t touch anything I told you.”', `held:${p}@${h}`, 'new', sit(w, how), [{ k: 'HELD', person: p, hour: h }], { shape: 'REACTION', flags: ['held-said'], args: { hour: { t: 'hour', h } }, manner: mannerOf(c, p) });
    // docs/52: the reason, and whose line and which place it names (where it names them).
    const code = j.code ?? 'untouched';
    const names = ['agreed', 'strangers', 'elsewhere', 'company', 'other-place', 'untrusted'].includes(code);
    const at = code === 'elsewhere' || code === 'other-place';
    done('held-close', j.why ? [{ text: j.why, props: [{ k: 'HELD', person: p, hour: h, why: code, ...(names && line.speaker ? { by: line.speaker } : {}), ...(at && line.place ? { place: line.place } : {}) }], ...(heldSay(c, p, h, j, line) ? { say: heldSay(c, p, h, j, line) as SaySpec } : {}) }] : [], lineRef);
    return;
  }
  const k = confrontationOf(c, p, h);
  if (!k) return;
  const lie = c.lies.find((l) => l.person === p && l.hour === h);
  const pr = markedPron(c, p);
  if (again) {
    // A second story put back: the culprit holds to it, as a refusal.
    const how = w.hand.draw('react', { response: 'refuse' }, s, { widen: true });
    const howSit = sit(w, how);
    const again2: SaySpec = { shape: 'REACTION', flags: ['refuse-said', 'any'], args: { person: { t: 'person', id: p }, hour: { t: 'hour', h } } };
    react(w, p, how ?? '', sayFirst(c, again2) ?? '“I’ve told you where I was.”', `refused:${p}@${h}`, 'new', howSit, [{ k: 'REFUSE', person: p, hour: h }], again2);
    const second = confrontationOf(c, p, h)?.secondLie?.place ?? '';
    const keeper = c.lists.find((l) => l.place === second)?.watcher;
    done('refuse-close', [{ text: `${nameOf(c, p)}’s second story had a list against it now, and ${pr.he} had nothing to put in its place.`, props: [{ k: 'COLLIDES', person: p, place: second, hour: h, second: true, with: { k: 'list', ...(keeper ? { who: keeper } : {}) } }], say: { shape: 'COLLISION-PAIR', flags: ['second-refused'], args: { person: { t: 'person', id: p }, place: { t: 'place', id: second }, hour: { t: 'hour', h } } } }, { gloss: aside(w, 'silence', ['Silence isn’t a confession. It isn’t an evening either.', 'Silence isn’t an evening.', 'Saying nothing isn’t a confession, and it isn’t an evening either.']) }], lineRef);
    return;
  }
  if (k.response === 'admit' && lie) {
    const y = (k.names ?? [])[0];
    const admit: SaySpec = { shape: 'REACTION', flags: ['admit', placeOf(c, lie.truth)?.key ?? 'any'], args: { person: { t: 'person', id: p }, claim: placeName(c, lie.claim), truth: placeName(c, lie.truth), hour: { t: 'hour', h }, ...(y ? { witness: { t: 'person', id: y } } : {}) } };
    // docs/48 §3: somebody from the neighbourhood owns up in their own words (the bible's), and keeps them.
    const own = w.hand.draw('admit-words', { place: placeOf(c, lie.truth)?.key }, withCaps({ ...s, ...(y ? { witness: nameOf(c, y), wthem: pronOf(c, y).him } : {}), claim: placeName(c, lie.claim), truth: placeName(c, lie.truth) }), {});
    const words = own ?? sayFirst(c, admit);
    const how = w.hand.draw('react', { response: 'admit' }, s, { widen: true });
    react(w, p, how ?? '', words ?? '', `admit:${p}@${h}`, 'new', sit(w, how), [{ k: 'ADMIT', person: p, place: lie.truth, hour: h, ...(y ? { witness: y } : {}), claimed: lie.claim }], own ? undefined : admit);
    if (y) w.people.add(y);
    w.places.add(lie.truth);
    w.places.add(lie.claim);
    done(
      'admit-close',
      y
        ? [
            // docs/59 item 3: not the hole and the story again (the put and the owning up just said them), but who could say whether it held.
            { text: `${nameOf(c, y)} could say whether ${nameOf(c, p)} was telling it straight.`, props: [{ k: 'POINTER', from: 'admit', to: y, why: 'witness' }], say: { shape: 'REACTION', flags: ['witness-thought'], args: { person: { t: 'person', id: p }, witness: { t: 'person', id: y } } } },
            { gloss: aside(w, 'owned-up', ['An owned-up story is only as good as whoever’s in it with you.', 'A story like that leans on whoever’s in it with you.', 'I wasn’t sure yet it was the one I wanted.']) },
          ]
        : [{ text: `${nameOf(c, p)} owned up to ${placeName(c, lie.truth)} at ${hourWord(h)}. Nobody had said so but ${pr.him}.`, props: [{ k: 'ADMIT', person: p, place: lie.truth, hour: h }], say: { shape: 'REACTION', flags: ['owned-hour'], args: { person: { t: 'person', id: p }, place: { t: 'place', id: lie.truth }, hour: { t: 'hour', h } } } }],
      lineRef,
    );
    return;
  }
  if (k.response === 'second-lie' && k.secondLie?.place) {
    const alt = placeName(c, k.secondLie.place);
    const how = w.hand.draw('react', { response: 'second-lie' }, s, { widen: true });
    const second: SaySpec = { shape: 'REACTION', flags: ['second-said', personOf(c, p)?.home === lie?.claim ? 'home' : 'away'], args: { person: { t: 'person', id: p }, claimed: { t: 'place', id: lie?.claim ?? '' }, place: { t: 'place', id: k.secondLie.place } }, manner: mannerOf(c, p) };
    react(w, p, how ?? '', sayFirst(c, second) ?? `“All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${alt}.”`, `second:${p}@${h}`, 'new', sit(w, how), [{ k: 'SECOND', person: p, place: k.secondLie.place }], second);
    w.places.add(k.secondLie.place);
    const watcher = c.lists.find((l) => l.place === k.secondLie?.place)?.watcher;
    const met = watcher ? knownPeople(c, w.run).has(watcher) : false;
    done(
      'second-close',
      // docs/59 item 3: who would know, not the second story again (they just said it).
      [{ text: met && watcher ? `${nameOf(c, watcher)} would know whether ${nameOf(c, p)} had been at ${alt}.` : `Whoever kept the room at ${alt} would know whether ${nameOf(c, p)} was there.`, props: [{ k: 'POINTER', from: 'second', to: met && watcher ? watcher : k.secondLie.place, why: 'watcher' }], say: { shape: 'REACTION', flags: ['second-pointer', met && watcher ? 'met' : 'unmet'], args: { person: { t: 'person', id: p }, place: { t: 'place', id: k.secondLie.place }, ...(met && watcher ? { watcher: { t: 'person', id: watcher } } : {}) } } }],
      lineRef,
    );
    if (met && watcher) w.people.add(watcher);
    return;
  }
  if (k.response === 'crack') {
    const holder = c.crime.whereNow?.text.replace(/, at .*$/, '').replace(/^with /, '') ?? 'somebody';
    const first = k.secondLie?.place ? `“All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${placeName(c, k.secondLie.place)}.” It was thin, and ${pr.he} knew it. ` : '';
    const how = w.hand.draw('react', { response: 'crack' }, s, { widen: true });
    const crack: SaySpec = {
      shape: 'REACTION',
      flags: ['crack-said', k.secondLie?.place ? (personOf(c, p)?.home === lie?.claim ? 'second-home' : 'second-away') : 'straight'],
      args: { person: { t: 'person', id: p }, holder, why: crackWhy(c, p), ...(k.secondLie?.place ? { claimed: { t: 'place', id: lie?.claim ?? '' }, place: { t: 'place', id: k.secondLie.place } } : {}) },
      manner: mannerOf(c, p),
    };
    react(w, p, how ?? '', sayFirst(c, crack) ?? `${first}“All right. I took it. It’s with ${holder}. ${crackWhy(c, p)}”`, `crack:${p}@${h}`, 'narrows', sit(w, how), [
      ...(k.secondLie?.place ? [{ k: 'SECOND', person: p, place: k.secondLie.place } as Prop] : []),
      { k: 'CRACK', person: p, to: 'other:fence', place: c.crime.whereNow?.place ?? '' },
      { k: 'MOTIVE', person: p },
    ], crack);
    if (k.secondLie?.place) w.places.add(k.secondLie.place);
    w.places.add(c.crime.whereNow?.place ?? '');
    // Raw 11's #8: no "the where", and when the holder is in this room, the page looks at him.
    const holderHere = c.crime.whereNow?.place === w.run.at;
    done(
      'crack-close',
      [
        {
          text: `So ${victimOf(c).short} was with ${shortOther(holder).replace(/,.*$/, '')}, ${holderHere ? 'who was sitting ten feet away and hadn’t looked up once' : `at ${placeName(c, c.crime.whereNow?.place ?? '')}`}.`,
          bare: `${victimOf(c).short} was with ${shortOther(holder).replace(/,.*$/, '')}, ${holderHere ? 'who was sitting ten feet away and hadn’t looked up once' : `at ${placeName(c, c.crime.whereNow?.place ?? '')}`}.`,
          opener: 'So',
          props: [{ k: 'HANDOVER', to: 'other:fence', place: c.crime.whereNow?.place ?? '', thing: c.crime.victim }],
          say: { shape: 'HANDOVER', flags: ['crack', holderHere ? 'here' : 'away'], args: { thing: { t: 'person', id: c.crime.victim }, holder: { t: 'people', ids: ['other:fence'] }, at: { t: 'place', id: c.crime.whereNow?.place ?? '' } } },
        },
        { gloss: `That was what ${clientOf(c).short} had paid for.` },
      ],
      ['givens:gone'],
      'narrows',
    );
    w.people.add(c.client);
    return;
  }
  // A refusal: the same words and the same weight, guilty or not.
  // The pair's liar says whose flat it was, as the story had it; everybody else draws from one pool.
  const pairMate = lie?.kind === 'pair' ? accountOf(c, p)?.claims[h]?.company[0] : undefined;
  const partner = pairMate ? nameOf(c, pairMate) : undefined;
  const refuse: SaySpec = { shape: 'REACTION', flags: ['refuse-said', partner ? 'pair' : 'any'], args: { person: { t: 'person', id: p }, hour: { t: 'hour', h }, crime: isMurder(c) ? 'kill anybody' : 'take anything', ...(pairMate ? { partner: { t: 'person', id: pairMate } } : {}) } };
  // docs/48 §3: a refusal from the neighbourhood is in their own words (the bible's), and keeps them.
  const own = w.hand.draw('refuse-words', { who: partner ? 'pair' : 'any' }, withCaps({ ...s, crime: isMurder(c) ? 'kill anybody' : 'take anything', partner }), {});
  const words = own ?? sayFirst(c, refuse);
  const how = w.hand.draw('react', { response: 'refuse' }, s, { widen: true });
  react(w, p, how ?? '', words ?? '“I’ve told you where I was.”', `refused:${p}@${h}`, 'new', sit(w, how), [{ k: 'REFUSE', person: p }, ...(pairMate ? [{ k: 'CLAIM', person: p, hour: h, company: [pairMate] } as Prop] : [])], own ? undefined : refuse);
  if (pairMate) w.people.add(pairMate);
  // docs/47 B10: a refusal points somewhere. Wherever they really were, somebody saw them there.
  const claimed = personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? accountOf(c, p)?.claims[h]?.place ?? '')}`;
  // docs/55 3: and where to ask. Their own story's watched place at the nearest hour (not the place
  // they claimed): "She'd told me the Automat at nine; the Automat might know about ten." Guilty or
  // not, it's read off their own story the same way.
  const claimPlace = lie?.claim ?? accountOf(c, p)?.claims[h]?.place ?? '';
  const heldList = (pl: PlaceId) => c.lists.some((l) => l.place === pl && w.run.asked.includes(`list:${l.watcher}`));
  const near = c.board.hours
    .filter((hh) => hh !== h)
    .map((hh) => ({ hh: hh as Hour, place: accountOf(c, p)?.claims[hh as Hour]?.place }))
    // (A list not asked for yet: one already held says nothing new about that hour, and pointing at it goes round in a circle.)
    .filter((x): x is { hh: Hour; place: PlaceId } => !!x.place && x.place !== claimPlace && x.place !== c.crime.scene && !heldList(x.place) && c.lists.some((l) => l.place === x.place && l.entries[h] !== undefined))
    .sort((a, b) => Math.abs(a.hh - h) - Math.abs(b.hh - h) || a.hh - b.hh)[0];
  const pointsAt = near ? ` ${pr.He} had told me ${placeName(c, near.place)} at ${hourWord(near.hh)}; ${placeName(c, near.place)} might know about ${hourWord(h)}.` : '';
  if (near) {
    w.places.add(near.place);
    w.hours.add(near.hh);
  }
  done(
    'refuse-close',
    [
      // (docs/59 item 3: not the line against it again; the put just said it.)
      { gloss: aside(w, 'refusal', ['A refusal isn’t a confession.', 'Saying nothing isn’t saying it.', 'A refusal is only a refusal, whoever makes it.']) },
      {
        text: `But if ${pr.he} wasn’t ${claimed} at ${hourWord(h)}, somebody saw ${pr.him} where ${pr.he} was, and if nobody had, that would say something too.${pointsAt}`,
        bare: `If ${pr.he} wasn’t ${claimed} at ${hourWord(h)}, somebody saw ${pr.him} where ${pr.he} was, and if nobody had, that would say something too.${pointsAt}`,
        opener: 'But',
        props: [{ k: 'REFUSE', person: p, hour: h }, ...(near ? [{ k: 'CLAIM', person: p, place: near.place, hour: near.hh } as Prop] : [])],
        say: {
          shape: 'REACTION',
          flags: ['refuse-thought', claimed === 'home' ? 'home' : 'away', ...(near ? ['points'] : [])],
          args: { person: { t: 'person', id: p }, hour: { t: 'hour', h }, claimed: { t: 'place', id: claimPlace }, ...(near ? { near: { t: 'place', id: near.place }, nearHour: { t: 'hour', h: near.hh } } : {}) },
        },
      },
    ],
    lineRef,
  );
}

/**
 * docs/49: an answer, one quotation, a line a unit: the lines that tell an hour or a remark are
 * facts (exempt from the name count, as a list or an account has to name people), their own voice
 * lines inside the quotation are gaps.
 */
function answer(w: Writer, lines: { text: string; gap?: boolean; about?: string[]; carries?: string[]; place?: string; props?: Prop[]; flesh?: Record<string, unknown>; say?: SaySpec }[], list = false): void {
  const kept = lines.filter((x) => x.text);
  kept.forEach((x, i) => {
    const text = `${i === 0 ? '“' : ''}${x.text}${i === kept.length - 1 ? '”' : ''}`;
    const run = i > 0;
    if (x.gap) put(w, 'job', text, 'answer', { slot: 'voice', exempt: true, speech: true, runOn: run, ...(list ? { barrier: true } : {}) });
    else
      fact(w, 'job', text, 'answer', {
        about: x.about ?? [],
        carries: x.carries ?? [],
        ...(x.place ? { place: x.place } : {}),
        ...(x.props ? { props: x.props } : {}),
        ...(x.flesh ? { flesh: x.flesh } : {}),
        ...(x.say ? { say: x.say } : {}),
        speech: true,
        exempt: true,
        runOn: run,
        ...(list ? { barrier: true } : {}),
      });
  });
}

/**
 * How they take it (a card, texture) and what they say (the fact: an admission, a refusal, a second
 * story, a crack). docs/49: the two are a gap and a fact, in one paragraph.
 */
function react(w: Writer, p: PersonId, how: string, said: string, carries: string, relation: Relation = 'new', howSit: Pick<Item, 'sit'> = {}, props: Prop[] = [], say?: SaySpec): void {
  // (docs/60: lean, how they take it stays on a put: it says who answers, and both preference readers missed it gone.)
  put(w, 'reaction', how, 'exchange', { about: [p], ...howSit, ...(lean() ? { tex: 'keep' as const } : {}) });
  // docs/52 build 2: what they said, a composite voiced whole (its quotation marks are the voicing's).
  fact(w, 'reaction', said, 'exchange', { about: [p], carries: [carries], relation, runOn: (w.parts.reaction ?? []).length > 0, props, ...(say ? { say } : {}) });
}

/** A small case's culprit, cracking: why, in a word or two of their own. */
function crackWhy(c: BoardCase, p: PersonId): string {
  const m = personOf(c, p)?.motive ?? '';
  const head = m.split(/, and /)[0] ?? m;
  const female = personOf(c, p)?.female === true;
  let s = head
    .replace(/^(he|she) is\b/, 'I’m')
    .replace(/^(he|she) owes\b/, 'I owe')
    // docs/48: a reason from the bible starts the same way.
    .replace(/^(he|she) has\b/, 'I’ve')
    .replace(/^(he|she) says\b/, 'I say')
    .replace(/^(he|she) works\b/, 'I work')
    .replace(/^(he|she) lost\b/, 'I lost');
  s = female ? s.replace(/\bher\b/g, 'my') : s.replace(/\bhis\b/g, 'my');
  return `${cap(s)}.`;
}

/* ------------------------------------------------------------------ *
 * A question already asked: read back, free.
 * ------------------------------------------------------------------ */

export function writeRepeat(w: Writer, q: string): void {
  const { c } = w;
  const [kind, rest] = q.split(':') as [string, string];
  const lines = linesHeld(c, w.run).filter((l) => l.q === q);
  put(w, 'why', kind === 'search' ? 'I’d been over it already. What it had to say was in the notebook.' : `I’d asked ${nameOf(c, rest)} that already. It was in the notebook, as ${pronOf(c, rest).he} said it:`, 'narrator');
  const text = lines.map((l) => l.text).join(' ');
  fact(w, 'job', text, 'narrator', { about: [...new Set(lines.flatMap((l) => [...l.about, ...(l.speaker ? [l.speaker] : [])]))], carries: lines.map((l) => l.id), keepNames: true, props: lines.flatMap((l) => lineProps(c, l, w.run.asked)) });
  for (const l of lines) {
    w.told.add(l.id);
    if (l.hour !== undefined) w.hours.add(l.hour);
    for (const p of l.about) w.people.add(p);
    if (l.speaker) w.people.add(l.speaker);
    if (l.place) w.places.add(l.place);
  }
  lay(w, 'repeat');
}

/* ------------------------------------------------------------------ *
 * The report: the form, and where I sat to fill it in.
 * ------------------------------------------------------------------ */

export function writeReport(w: Writer): void {
  const c = w.c;
  const s = solveRun(c, w.run);
  const at = w.run.at;
  const rstage = w.hand.draw('report-stage', { kind: stageKind(c, at) }, withCaps({ place: at === OFFICE ? 'the office' : placeName(c, at) }), { plain: true });
  put(w, 'staging', rstage ?? 'I sat down with the form.', 'act', sit(w, rstage));
  // Whether what's held is enough is the player's to say above a walk (docs/46 §2): the form gets no hint.
  // (docs/51: at a walk the why says whether it's enough, and it stays.)
  const rwhy = w.hand.draw('report-why', { done: thoughtLevel(c) !== 'walk' ? 'open' : s.done ? 'yes' : 'no' }, {}, { plain: true });
  put(w, 'why', rwhy, 'narrator', { ...(thoughtLevel(c) !== 'walk' ? sit(w, rwhy) : {}), ...(lean() ? { tex: thoughtLevel(c) === 'walk' ? ('keep' as const) : ('flourish' as const) } : {}) });
  // At Raw, the elimination not walked yet tonight is walked here, before the form (docs/47 B11).
  const el = walkedElimination(w, true);
  if (el) {
    license(w, el);
    // docs/52 build 2: each step of it a composite of its own, voiced (as the page after the settling one says it).
    const parts = el.parts ?? [];
    if (PLAN.ops && parts.length > 1) parts.forEach((x, i) => fact(w, 'thought', x.text, 'thought', { relation: 'narrows', about: el.people, carries: el.refs, props: x.props ?? [], runOn: i > 0, ...(x.say ? { say: x.say } : {}) }));
    else fact(w, 'thought', el.sentences.join(' '), 'thought', { relation: 'narrows', about: el.people, carries: el.refs, props: parts.flatMap((x) => x.props ?? []) });
  }
  // The office's prop, paid off: the night began there.
  const prop = w.run.prop;
  const fresh = prop?.pay.filter((l) => !w.hand.used(`pay:${l.slice(0, 40)}`)) ?? [];
  if (prop && fresh.length && w.hand.jokeFree) {
    const l = fresh[w.hand.rng.int(fresh.length)] as string;
    w.hand.note(`pay:${l.slice(0, 40)}`);
    w.hand.joke();
    w.callback = true;
    put(w, 'close', l, 'thought', lean() ? { tex: 'callback', onDrop: () => ((w.callback = false), w.hand.forget(`pay:${l.slice(0, 40)}`)) } : {});
  } else {
    const rclose = w.hand.draw('report-close', {}, {}, { widen: true, joke: true });
    put(w, 'close', rclose, 'thought', sit(w, rclose));
  }
  lay(w, 'report');
}


/* ------------------------------------------------------------------ *
 * The recap: "Go over what I have", and the turn.
 * ------------------------------------------------------------------ */

export interface Clause {
  key: string;
  text: string;
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
  /** docs/52: what the clause says, as propositions. */
  props: Prop[];
  /** docs/52 build 2: the clause as a composite, for the page to voice (`text` is the notebook's). */
  say?: SaySpec;
}

/**
 * What the notebook adds up to, clause by clause. Never a verdict: placed,
 * said, couldn't say. docs/46 §2: at link level the hour stops at the link
 * (the office's two hours and the sighting), and at fact level it's only what's
 * held and what's open, with nothing joined to anything.
 */
export function recapClauses(d: BoardDeal, run: BoardRun): Clause[] {
  const c = d.kase;
  const level = thoughtLevel(c);
  if (level === 'fact') return factClauses(d, run);
  const s = solveHeld(c, solverHeld(run));
  const out: Clause[] = [];
  const hc = s.possibleHours.length === 1 ? (s.possibleHours[0] as Hour) : null;
  // A lost pet went, as "he" or "she"; a thing went, as "it" (docs/47 B9).
  const what = isMurder(c) ? 'It happened' : `${pronOf(c, c.crime.victim).He} went`;
  const office = c.givens.window ?? c.crime.window;
  // docs/47 B8: only the people the night has named are in the notebook's sentences.
  const known = knownPeople(c, run);
  const named = suspectsOf(c).filter((p) => known.has(p));
  // Narrowed from the office's two hours by a sighting: above a walk, the two side by side.
  const gone = hc !== null && office.length > 1 && level === 'link' ? office.filter((h) => h !== hc).map((h) => ({ h, x: s.placed.get(`${c.crime.victim}@${h}`) })).find((y) => y.x && y.x.place !== c.crime.scene) : undefined;
  if (gone?.x) {
    const v = victimOf(c).short;
    const two = `${hourWord(office[0] as Hour)} or ${hourWord(office[1] as Hour)}`;
    // The client said the hours, in the office (Medium 14's #9: "Hauck said it, not the office").
    const cl = clientOf(c).short;
    out.push({
      key: 'when',
      text: isMurder(c) ? `${cl} had said ${two}, and ${v} was at ${placeName(c, gone.x.place)} at ${hourWord(gone.h)}, alive.` : `${cl} had said ${two}, and at ${hourWord(gone.h)} ${v} was at ${placeName(c, gone.x.place)}.`,
      hours: [...office],
      people: [c.crime.victim, c.client],
      places: [gone.x.place],
      props: [{ k: 'WINDOW', hours: [...office] }, { k: 'ALIVE', victim: c.crime.victim, place: gone.x.place, hour: gone.h }],
      say: { shape: 'WINDOW-ALIVE', flags: ['one', isMurder(c) ? 'murder' : 'small'], args: { client: cl, opts: two, victim: v, place: placeName(c, gone.x.place), at: `at ${placeName(c, gone.x.place)}`, hour: hourWord(gone.h) } },
    });
  } else
    out.push(
      hc !== null
        ? { key: 'when', text: `${what} at ${oclock(hc)}.`, hours: [hc], people: [], places: [], props: [{ k: 'WINDOW', hours: [hc] }], say: { shape: 'WINDOW-MEANS', flags: ['when', 'hour', isMurder(c) ? 'murder' : 'small'], args: { hour: { t: 'hour', h: hc }, victim: { t: 'person', id: c.crime.victim } } } }
        : { key: 'when', text: `${what} at ${hourWord(s.possibleHours[0] as Hour)} or ${oclock(s.possibleHours[1] as Hour)}, and I didn’t know which yet.`, hours: [...s.possibleHours], people: [], places: [], props: [{ k: 'WINDOW', hours: [s.possibleHours[0] as Hour, s.possibleHours[1] as Hour] }], say: { shape: 'WINDOW-MEANS', flags: ['when', 'two', isMurder(c) ? 'murder' : 'small'], args: { hours: { t: 'hours', hs: [s.possibleHours[0] as Hour, s.possibleHours[1] as Hour] }, victim: { t: 'person', id: c.crime.victim } } } },
    );
  const meansHeld = run.asked.some((q) => q.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === q)?.gives.means);
  if (meansHeld && isMurder(c)) {
    // (docs/60 item 4: lean, where it came from, plainly: what that means the find's page said.)
    out.push({ key: 'means', text: `The ${c.means.name.replace(/^(a|an) /, '')} came from ${placeName(c, c.means.origin)}, so whoever used it had been there first.`, hours: [], people: [], places: [c.means.origin], props: [{ k: 'MEANS', how: 'origin', place: c.means.origin }], say: { shape: 'WINDOW-MEANS', flags: ['means', lean() ? 'fact' : 'link'], args: { means: c.means.name.replace(/^(a|an) /, ''), origin: { t: 'place', id: c.means.origin } } } });
  }
  // (docs/60 item 4: lean, the turn is the hour, who's accounted for, whose story doesn't hold and what's
  // open: who could have got at the means is the pages' own, not the recap's.)
  if (c.tier >= 1 && (s.accessYes.size > 0 || s.accessNo.size > 0) && (!lean() || !isMurder(c))) {
    const yes = named.filter((p) => s.accessYes.has(p)).map((p) => nameOf(c, p));
    const no = named.filter((p) => s.accessNo.has(p)).map((p) => nameOf(c, p));
    const at = placeName(c, c.means.origin);
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    const told = /^told/.test(c.setup?.means ?? '');
    const were = (xs: string[]) => (xs.length > 1 ? 'were' : 'was');
    const bits: string[] = [];
    if (isMurder(c)) {
      // Plain speech, not the board read aloud ("while the laudanum was there", Poached 5).
      if (yes.length) bits.push(`${andList(yes)} had been at ${at} earlier, when the ${c.means.name.replace(/^(a|an) /, '')} was there for the taking`);
      if (no.length) bits.push(`${andList(no)} hadn’t`);
    } else if (party) {
      if (yes.length) bits.push(`${andList(yes)} ${were(yes)} at the ${party.occasion} and knew ${wayKnown(c)}`);
      if (no.length) bits.push(`${andList(no)} ${no.length > 1 ? 'weren’t' : 'wasn’t'}`);
    } else if (told) {
      if (yes.length) bits.push(`${andList(yes)} ${were(yes)} at ${at} while ${clientOf(c).short} told the room`);
      if (no.length) bits.push(`${andList(no)} ${no.length > 1 ? 'weren’t' : 'wasn’t'}`);
    } else {
      if (yes.length) bits.push(`${andList(yes)} had been in at ${at} earlier, when the spare key was there for the taking`);
      if (no.length) bits.push(`${andList(no)} hadn’t`);
    }
    const yesIds = named.filter((p) => s.accessYes.has(p));
    const noIds = named.filter((p) => s.accessNo.has(p));
    const kind = isMurder(c) ? 'murder' : party ? 'party' : told ? 'told' : 'spare';
    if (bits.length)
      out.push({
        key: 'access',
        text: `${cap(bits.join('; '))}.`,
        hours: [],
        people: named.filter((p) => s.accessYes.has(p) || s.accessNo.has(p)),
        places: [c.means.origin],
        props: [...yesIds.map((p) => ({ k: 'ACCESS', person: p, had: true }) as Prop), ...noIds.map((p) => ({ k: 'ACCESS', person: p, had: false }) as Prop)],
        say: {
          shape: 'ACCESS-SET',
          flags: ['recap', kind, ...(yesIds.length ? ['yes', yesIds.length > 1 ? 'many' : 'one'] : []), ...(noIds.length ? ['no', noIds.length > 1 ? 'nones' : 'none'] : [])],
          args: { people: { t: 'people', ids: yesIds }, none: { t: 'people', ids: noIds }, origin: { t: 'place', id: c.means.origin }, means: c.means.name.replace(/^(a|an) /, ''), client: { t: 'person', id: c.client }, occasion: party?.occasion ?? '', way: wayKnown(c) },
        },
      });
  }
  // Above a walk, when the office gave two hours, every clause is about both: which one it was is the player's to say.
  const twoHours = level === 'link' && office.length > 1;
  const hs = twoHours ? [...office] : hc !== null ? [hc] : [...s.possibleHours];
  // Whose word a placement rests on, as people say it: "Alfano said so", "Mrs. Whitfield and Ellery said so".
  const saidSo = (qs: string[]) => {
    const who = [...new Set(qs.map((q) => sourceName(c, q).replace(/’s (list|story|word)$/, '')))];
    return `${andList(who)} said so`;
  };
  // Nobody's word yet, for several people at the same hours: one clause, not one each (Poached 5's #15).
  const open: PersonId[] = [];
  for (const p of named) {
    const placed = hs.map((h) => ({ h, x: s.placed.get(`${p}@${h}`) })).filter((y) => y.x && y.x.place !== c.crime.scene && y.x.deps.some((dq) => dq !== `account:${p}`));
    const st = hs.map((h) => ({ h, st: s.status.get(`${p}@${h}`) })).find((y) => y.st?.s === 'broken');
    if (st) {
      const cl = accountOf(c, p)?.claims[st.h];
      const by = st.st?.deps.find((dq) => dq !== `account:${p}` && !dq.startsWith('confront:'));
      out.push({
        key: `broken:${p}`,
        text: `${nameOf(c, p)} had told me ${personOf(c, p)?.home === cl?.place ? 'home' : placeName(c, cl?.place ?? '')} at ${hourWord(st.h)}, and ${by ? sourceName(c, by) : 'what I had'} said otherwise.`,
        hours: [st.h],
        people: [p, ...sourcePeople(by)],
        places: [cl?.place ?? ''],
        props: [{ k: 'COLLIDES', person: p, place: cl?.place ?? '', hour: st.h, with: by ? srcOfQ(by) : { k: 'given' } }],
        say: { shape: 'COLLISION-PAIR', flags: ['recap', personOf(c, p)?.home === cl?.place ? 'home' : 'away'], args: { person: { t: 'person', id: p }, place: { t: 'place', id: cl?.place ?? '' }, hour: { t: 'hour', h: st.h }, src: by ? sourceName(c, by) : 'what I had' } },
      });
      const k = c.confrontations.find((x) => x.person === p && x.hour === st.h);
      if (k && run.asked.includes(`confront:${p}@${st.h}`)) {
        const lie = c.lies.find((l) => l.person === p && l.hour === st.h);
        if (k.response === 'admit' && lie) {
          const y = (k.names ?? [])[0];
          const checked = y ? run.asked.includes(`account:${y}`) : false;
          out.push({ key: `admit:${p}`, text: `${nameOf(c, p)} owned up to ${placeName(c, lie.truth)}${y ? `, with ${nameOf(c, y)}` : ''}${y && !checked ? `, and ${nameOf(c, y)} could say whether that was so` : ''}.`, hours: [], people: [p, ...(y ? [y] : [])], places: [lie.truth], props: [{ k: 'ADMIT', person: p, place: lie.truth, ...(y ? { witness: y } : {}) }], say: { shape: 'REACTION', flags: ['owned', ...(y ? ['witness', checked ? 'checked' : 'unchecked'] : ['alone'])], args: { person: { t: 'person', id: p }, place: { t: 'place', id: lie.truth }, ...(y ? { witness: { t: 'person', id: y } } : {}) } } });
        } else if (k.response === 'second-lie' && k.secondLie?.place) {
          const again = run.puts.some((x) => x.person === p && x.hour === st.h && x.again && x.landed);
          out.push({
            key: `second:${p}`,
            text: again
              ? `Put to it, ${nameOf(c, p)} had a second story, ${placeName(c, k.secondLie.place)}; that didn’t hold either, and ${pronOf(c, p).he} wouldn’t say more.`
              : `Put to it, ${nameOf(c, p)} had a second story: ${placeName(c, k.secondLie.place)}.`,
            hours: [],
            people: [p],
            places: [k.secondLie.place],
            props: [{ k: 'SECOND', person: p, place: k.secondLie.place }, ...(again ? [{ k: 'REFUSE', person: p } as Prop] : [])],
            say: { shape: 'REACTION', flags: ['second', again ? 'again' : 'once'], args: { person: { t: 'person', id: p }, place: { t: 'place', id: k.secondLie.place } } },
          });
        } else if (k.response !== 'crack') {
          out.push({ key: `refused:${p}`, text: `${nameOf(c, p)} wouldn’t say where ${pronOf(c, p).he} had been instead.`, hours: [], people: [p], places: [], props: [{ k: 'REFUSE', person: p }], say: { shape: 'REACTION', flags: ['refused'], args: { person: { t: 'person', id: p } } } });
        }
      }
      continue;
    }
    const pl = placed[0];
    if (twoHours) {
      const P = nameOf(c, p);
      if (pl?.x) {
        // Placed at one of the two hours or both, by somebody else's word.
        const bys = [...new Set(placed.map((y) => y.x?.deps.find((dq) => dq !== `account:${p}`) as string))];
        const same = placed.length > 1 && placed.every((y) => y.x?.place === pl.x?.place);
        const at = same ? `${placeName(c, pl.x.place)} at ${andList(placed.map((y) => hourWord(y.h)))}` : andList(placed.map((y) => `${placeName(c, y.x?.place ?? '')} at ${hourWord(y.h)}`));
        out.push({
          key: `placed:${p}`,
          text: `${P} was at ${at}; ${saidSo(bys)}.`,
          hours: placed.map((y) => y.h),
          people: [p, ...bys.flatMap((by) => sourcePeople(by))],
          places: placed.map((y) => y.x?.place ?? ''),
          props: placed.map((y) => ({ k: 'PLACED', person: p, place: y.x?.place ?? '', hour: y.h, by: srcOfQ(y.x?.deps.find((dq) => dq !== `account:${p}`) as string) }) as Prop),
          say: { shape: 'PLACED-SET', flags: ['recap-one'], args: { person: { t: 'person', id: p }, at, src: andList([...new Set(bys.map((q) => sourceName(c, q).replace(/’s (list|story|word)$/, '')))]) } },
        });
      } else if (!run.asked.includes(`account:${p}`)) {
        open.push(p);
      } else {
        // "Home at nine and ten", not "Thorndike’s flat at nine and Thorndike’s flat at ten" (Medium 14's #29).
        const wh = hs.map((h) => claimSaid(c, p, h).replace(/ at \w+$/, ''));
        const said = wh.every((x) => x === wh[0]) ? `${wh[0]} at ${andList(hs.map(hourWord))}` : andList(hs.map((h) => claimSaid(c, p, h)));
        out.push({ key: `own:${p}`, text: `${P} said ${said}, and nobody had backed it up yet.`, hours: [...hs], people: [p], places: hs.map((h) => accountOf(c, p)?.claims[h]?.place ?? ''), props: hs.map((h) => claimProp(c, p, h, { place: true, company: false })), say: { shape: 'OWN-WORD', flags: ['recap-one'], args: { person: { t: 'person', id: p }, said } } });
      }
      continue;
    }
    if (pl?.x && placed.length === hs.length) {
      const by = pl.x.deps.find((dq) => dq !== `account:${p}`) as string;
      out.push({ key: `placed:${p}`, text: `${nameOf(c, p)} was at ${placeName(c, pl.x.place)} at ${hourWord(pl.h)}; ${saidSo([by])}.`, hours: [pl.h], people: [p, ...sourcePeople(by)], places: [pl.x.place], props: [{ k: 'PLACED', person: p, place: pl.x.place, hour: pl.h, by: srcOfQ(by) }], say: { shape: 'PLACED-SET', flags: ['recap-one'], args: { person: { t: 'person', id: p }, at: `${placeName(c, pl.x.place)} at ${hourWord(pl.h)}`, src: sourceName(c, by).replace(/’s (list|story|word)$/, '') } } });
    } else if (hc !== null && !run.asked.includes(`account:${p}`)) {
      open.push(p);
    } else if (hc !== null) {
      out.push({ key: `own:${p}`, text: `${nameOf(c, p)} said ${claimSaid(c, p, hc)}, and nobody had backed it up yet.`, hours: [hc], people: [p], places: [accountOf(c, p)?.claims[hc]?.place ?? ''], props: [claimProp(c, p, hc, { place: true, company: false })], say: { shape: 'OWN-WORD', flags: ['recap-one'], args: { person: { t: 'person', id: p }, said: claimSaid(c, p, hc) } } });
    }
  }
  const ohs = twoHours ? [...office] : hc !== null ? [hc] : [];
  if (open.length > 0 && ohs.length > 0) {
    const at = ohs.length > 1 ? `${hourWord(ohs[0] as Hour)} or ${hourWord(ohs[1] as Hour)}` : hourWord(ohs[0] as Hour);
    const one = open.length === 1 ? (open[0] as PersonId) : undefined;
    out.push({
      key: `open:${open.join(',')}`,
      text: one
        ? `${nameOf(c, one)} hadn’t told me where ${pronOf(c, one).he} was at ${at}, and neither had anybody who’d seen ${pronOf(c, one).him}.`
        : `${andList(open.map((p) => nameOf(c, p)))} hadn’t told me where they were at ${at}, and neither had anybody who’d seen them.`,
      hours: ohs,
      people: [...open],
      places: [],
      props: [{ k: 'UNSPOKEN', people: [...open], hours: [...ohs] }],
      say: { shape: 'UNSPOKEN', flags: [one ? 'one' : 'many', ohs.length > 1 ? 'two' : 'hour'], args: { ...(one ? { person: { t: 'person', id: one } } : { people: { t: 'people', ids: [...open] } }), hours: { t: 'hours', hs: [...ohs] } } },
    });
  }
  if (!isMurder(c) && s.whereNow && c.crime.whereNow) {
    const v = victimOf(c).short;
    // Said only as far as it's held (docs/44): a crack says whose it is; the watcher saw a coat.
    const cracked = c.confrontations.some((k) => k.response === 'crack' && run.asked.includes(`confront:${k.person}@${k.hour}`));
    const holder = shortOther(c.crime.whereNow.text.replace(/^with /, '').replace(/, at .*$/, ''));
    const remark = c.lists.flatMap((l) => l.remarks).find((r) => r.gives?.whereNow);
    const hh = /^(\w+):/.exec(remark?.text ?? '')?.[1]?.toLowerCase();
    out.push(
      cracked || !hh
        ? { key: 'where', text: `${cap(v)} ${/^the \w+s$/.test(v) ? 'were' : 'was'} ${c.crime.whereNow.text}.`, hours: [], people: [c.crime.victim], places: [c.crime.whereNow.place], props: [{ k: 'HANDOVER', to: 'other:fence', place: c.crime.whereNow.place, thing: c.crime.victim }], say: { shape: 'HANDOVER', flags: ['recap', 'known', /^the \w+s$/.test(v) ? 'plural' : 'single'], args: { thing: { t: 'person', id: c.crime.victim }, holder: { t: 'people', ids: ['other:fence'] }, at: { t: 'place', id: c.crime.whereNow.place } } } }
        : { key: 'where', text: `And whatever it was had gone to ${holder} at ${placeName(c, c.crime.whereNow.place)} at ${hh}.`, hours: hh === 'eleven' ? [11] : hh === 'ten' ? [10] : [], people: [], places: [c.crime.whereNow.place], props: [{ k: 'HANDOVER', to: 'other:fence', place: c.crime.whereNow.place, hour: c.crime.hour + 1 }], say: { shape: 'HANDOVER', flags: ['recap', 'unknown'], args: { holder: { t: 'people', ids: ['other:fence'] }, at: { t: 'place', id: c.crime.whereNow.place }, hour: { t: 'hour', h: c.crime.hour + 1 } } } },
    );
  }
  return out;
}

/**
 * docs/46 §2, fact level (Hard-boiled): what's held and what's open, and
 * nothing joined to anything. The office's hours, where the means came from,
 * whose evenings and lists I had, what anybody said when it was put to them,
 * and whose evenings I still didn't have.
 */
function factClauses(d: BoardDeal, run: BoardRun): Clause[] {
  const c = d.kase;
  const out: Clause[] = [];
  const office = c.givens.window ?? c.crime.window;
  const cl = clientOf(c).short;
  out.push({ key: 'when', text: office.length > 1 ? `${cl} had said ${hourWord(office[0] as Hour)} or ${oclock(office[1] as Hour)}.` : `${cl} had said ${oclock(office[0] as Hour)}.`, hours: [...office], people: [c.client], places: [], props: [{ k: 'WINDOW', hours: [...office] }], say: { shape: 'WINDOW-MEANS', flags: ['when', 'office', office.length > 1 ? 'two' : 'hour'], args: { client: { t: 'person', id: c.client }, hours: { t: 'hours', hs: [...office] } } } });
  const meansHeld = run.asked.some((q) => q.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === q)?.gives.means);
  if (meansHeld && isMurder(c)) out.push({ key: 'means', text: `The ${c.means.name.replace(/^(a|an) /, '')} had come from ${placeName(c, c.means.origin)}.`, hours: [], people: [], places: [c.means.origin], props: [{ k: 'MEANS', how: 'origin', place: c.means.origin }], say: { shape: 'WINDOW-MEANS', flags: ['means', 'fact'], args: { means: c.means.name.replace(/^(a|an) /, ''), origin: { t: 'place', id: c.means.origin } } } });
  const evenings = run.asked.filter((q) => q.startsWith('account:')).map((q) => q.slice(8));
  const lists = run.asked.filter((q) => q.startsWith('list:')).map((q) => q.slice(5));
  const bits: string[] = [];
  if (evenings.length) bits.push(`${evenings.length > 1 ? 'evenings' : 'an evening'} from ${andList(evenings.map((p) => nameOf(c, p)))}`);
  if (lists.length) bits.push(`${lists.length > 1 ? 'lists' : 'a list'} from ${andList(lists.map((p) => nameOf(c, p)))}`);
  if (bits.length) out.push({ key: 'held', text: `I had ${bits.join(', and ')}.`, hours: [], people: [...evenings, ...lists], places: [], props: [{ k: 'HOLD', evenings: [...evenings], lists: [...lists] }], say: { shape: 'HOLD', flags: ['hold', evenings.length > 1 ? 'evenings' : evenings.length ? 'evening' : 'no-evening', lists.length > 1 ? 'lists' : lists.length ? 'list' : 'no-list'], args: { evenings: { t: 'people', ids: [...evenings] }, lists: { t: 'people', ids: [...lists] } } } });
  for (const putx of run.puts.filter((x) => x.landed && !x.again)) {
    const k = confrontationOf(c, putx.person, putx.hour);
    if (!k) continue;
    const name = nameOf(c, putx.person);
    const again = run.puts.some((x) => x.person === putx.person && x.hour === putx.hour && x.again && x.landed);
    if (k.response === 'second-lie' && k.secondLie?.place)
      out.push({
        key: `second:${putx.person}`,
        text: again ? `Put to it, ${name} had a second story, ${placeName(c, k.secondLie.place)}, and when that was put back ${pronOf(c, putx.person).he} wouldn’t say more.` : `Put to it, ${name} had a second story: ${placeName(c, k.secondLie.place)}.`,
        hours: [],
        people: [putx.person],
        places: [k.secondLie.place],
        props: [{ k: 'SECOND', person: putx.person, place: k.secondLie.place }, ...(again ? [{ k: 'REFUSE', person: putx.person } as Prop] : [])],
        say: { shape: 'REACTION', flags: ['second', again ? 'again' : 'once'], args: { person: { t: 'person', id: putx.person }, place: { t: 'place', id: k.secondLie.place } } },
      });
    else if (k.response !== 'crack' && k.response !== 'admit') out.push({ key: `refused:${putx.person}`, text: `Put to it, ${name} wouldn’t say where ${pronOf(c, putx.person).he} had been instead.`, hours: [], people: [putx.person], places: [], props: [{ k: 'REFUSE', person: putx.person }], say: { shape: 'REACTION', flags: ['refused'], args: { person: { t: 'person', id: putx.person } } } });
  }
  // docs/47 B8: only the people the night has named.
  const known = knownPeople(c, run);
  const open = suspectsOf(c).filter((p) => !evenings.includes(p) && known.has(p));
  const owners = open.map((p) => `${nameOf(c, p)}’s`);
  const orList = owners.length > 1 ? `${owners.slice(0, -1).join(', ')} or ${owners[owners.length - 1]}` : (owners[0] ?? '');
  if (open.length) out.push({ key: 'open', text: `I didn’t have ${orList} evening${open.length > 1 ? 's' : ''} yet.`, hours: [], people: open, places: [], props: [{ k: 'MISSING', people: [...open] }], say: { shape: 'HOLD', flags: ['missing', open.length > 1 ? 'many' : 'one'], args: { people: { t: 'people', ids: [...open] } } } });
  return out;
}

/** Whose word a question is: the watcher, or the person whose evening it is. */
function sourcePeople(q: string | undefined): PersonId[] {
  if (!q) return [];
  const [kind, rest] = q.split(':') as [string, string];
  return kind === 'list' || kind === 'account' ? [rest] : kind === 'confront' ? [rest.split('@')[0] as string] : [];
}

/**
 * The notebook said aloud, a clause a fact (docs/49): one paragraph, the clauses running on, and
 * the whole of it exempt from the name count (it has to name people).
 */
function recapFacts(w: Writer, clauses: Clause[], lead?: string): void {
  // docs/49: the lead ("Here’s what I had.") carries no fact: a gap of its own, before them.
  const ownLead = PLAN.ops && !!lead && clauses.length > 0;
  if (ownLead) put(w, 'job', lead, 'recap', { exempt: true });
  clauses.forEach((cl, i) =>
    fact(w, 'job', i === 0 && lead && !ownLead ? `${lead} ${cl.text}` : cl.text, 'recap', {
      relation: /^(when|open)/.test(cl.key) ? 'narrows' : 'new',
      about: cl.people,
      carries: [`clause:${cl.key}`],
      ...(cl.hours.length === 1 ? { hour: cl.hours[0] } : {}),
      exempt: true,
      runOn: i > 0 || ownLead,
      props: cl.props,
      tag: `clause:${cl.key.split(':')[0]}`,
      ...(cl.say && !(i === 0 && lead && !ownLead) ? { say: cl.say } : {}),
    }),
  );
  if (clauses.length === 0 && lead) fact(w, 'job', lead, 'recap', { carries: [], exempt: true });
  w.recap = (w.parts.job ?? []).map((x) => x.text).join(' ');
}

export function writeRecap(w: Writer, starsLine: string | null): void {
  const ropen = w.hand.draw('recap-open', {}, {}, { widen: true });
  put(w, 'why', ropen, 'recap', { slot: 'staging', ...sit(w, ropen) });
  const clauses = recapClauses(w.d, w.run);
  for (const cl of clauses) {
    for (const h of cl.hours) w.hours.add(h);
    for (const p of cl.people) w.people.add(p);
    for (const p of cl.places) w.places.add(p);
  }
  recapFacts(w, clauses);
  if (starsLine) put(w, 'handoff', starsLine, 'recap', { keepNames: true });
  lay(w, 'recap');
}

/**
 * docs/43 §2: the turn, at the first lie caught. A chapter break, a recap, and
 * what next: put it to them now, or find out first what the star points at.
 */
export function writeTurn(w: Writer): void {
  const c = w.c;
  const title = w.hand.draw('turn-title', {}, {}, { widen: true, plain: true }) ?? 'Two Stories';
  // docs/55 7: the heading is plain, not a label ("The Turn: Where the Story Broke" before anything broke).
  void title;
  chapter(w, 'The turn');
  const topen = w.hand.draw('turn-open', {}, {}, { widen: true });
  // (docs/60 items 1 and 4: the turn is the chapter, the recap and what next; how I sat down to it goes.)
  put(w, 'staging', topen, 'recap', { ...sit(w, topen), ...(lean() ? { tex: 'flourish' as const } : {}) });
  // docs/47 B11: at Raw, when who is settled by now, the turn walks the elimination instead of
  // reading the notebook back: once, and after the page's own fact, never in its thought.
  const el = walkedElimination(w, true);
  if (el) {
    license(w, el);
    const parts = el.parts ?? [];
    if (PLAN.ops && parts.length > 1) {
      // docs/52 build 2: the lead a gap, and each step of the elimination a composite of its own, voiced.
      // (docs/56 A17: no lead, "Here’s what I had.": the turn starts on its first fact.)
      parts.forEach((x, i) => fact(w, 'job', x.text, 'recap', { relation: 'narrows', about: el.people, carries: el.refs, exempt: true, props: x.props ?? [], runOn: i > 0, ...(x.say ? { say: x.say } : {}) }));
    } else fact(w, 'job', el.sentences.join(' '), 'recap', { relation: 'narrows', about: el.people, carries: el.refs, exempt: true, props: parts.flatMap((x) => x.props ?? []) });
  } else {
    const clauses = lean() ? turnOrder(recapClauses(w.d, w.run), c.tier <= 2 ? 70 : 90) : recapClauses(w.d, w.run);
    for (const cl of clauses) {
      for (const h of cl.hours) w.hours.add(h);
      for (const p of cl.people) w.people.add(p);
      for (const p of cl.places) w.places.add(p);
    }
    recapFacts(w, clauses);
  }
  w.recap = (w.parts.job ?? []).map((x) => x.text).join(' ');
  // What next, by the stars (docs/46 §1): "put it to them now" only where a put is starred
  // (Raw and Coddled); from Poached up, the one star; at Medium, only where to go; none at Hard-boiled.
  const caught = collisionsOfRun(w)[0];
  const steps = starredSteps(w.d, w.run).filter((q) => !q.startsWith('confront:'));
  const next = steps[0];
  if (caught) {
    const name = nameOf(c, caught);
    let first = '';
    const [nk, nrest] = (next ?? '').split(':') as [string, string];
    const mv = next && nk === 'account' ? movedAt(c, w.run, nrest) : null;
    let walked = '';
    if (next && mv && lean()) {
      // (docs/60: the walk first, then who they passed: "Thorndike had walked from the Thalia to the Delmonico
      // rooms at ten. Before I did anything about it, I wanted to know who she’d passed on the way.")
      walked = `${nameOf(c, nrest)} had walked from ${placeName(c, mv.from)} to ${placeName(c, mv.to)} at ${hourWord(mv.h)}. `;
      first = `know who ${pronOf(c, nrest).he}’d passed on the way`;
      w.people.add(nrest);
      w.places.add(mv.from);
      w.places.add(mv.to);
      w.hours.add(mv.h);
    } else if (next && mv) {
      // The reason that matters, not a stop on a route (docs/47 B10).
      first = `know who ${nameOf(c, nrest)} had passed on the way to ${placeName(c, mv.to)} at ${hourWord(mv.h)}`;
      w.people.add(nrest);
      w.places.add(mv.to);
      w.hours.add(mv.h);
    } else if (next) {
      const [k, rest] = next.split(':') as [string, string];
      const p = personOf(c, rest);
      if (k === 'account' && p && knownPeople(c, w.run).has(rest)) first = `find out first what ${p.short} had to say for ${pronOf(c, rest).self}`;
      else if (k === 'list' && p) first = knownPeople(c, w.run).has(rest) ? `find out first who ${p.short} had seen at ${placeName(c, starPlace(c, next))}` : `find out first from ${jobWords(p.description)} at ${placeName(c, starPlace(c, next))} who’d been in`;
      else if (k === 'search') first = `go over ${c.finds.find((f) => f.id === rest)?.what ?? 'the room'} first`;
      if (p && knownPeople(c, w.run).has(rest)) w.people.add(rest);
      w.places.add(starPlace(c, next));
    }
    const said0 = c.tier <= 1 ? (first ? `I could face ${name} with it now. Or I could ${first}.` : `I could face ${name} with it now.`) : first ? `Before I did anything about it, I wanted to ${first.replace(/ first$/, '').replace(/^find out first /, 'find out ')}.` : undefined;
    const said = said0 && walked ? `${walked}${said0}` : said0;
    if (c.tier <= 1) w.people.add(caught);
    put(w, 'handoff', said, 'recap', { keepNames: true });
  }
  const tclose = w.hand.draw('turn-close', {}, {}, { widen: true, joke: true });
  put(w, 'close', tclose, 'recap', sit(w, tclose));
  lay(w, 'turn');
}

/**
 * docs/60 item 4: the turn in the order a reader wants it: the hour, where it came from, who's accounted
 * for and by whom, whose story doesn't hold, what was said when it was put, who's said where they were
 * with nobody to back it, and what's still open.
 */
function turnOrder(cs: Clause[], most: number): Clause[] {
  const head = (k: string) => k.split(':')[0] ?? '';
  const rank = (k: string): number => ({ when: 0, means: 1, access: 2, placed: 3, held: 3, broken: 4, admit: 5, second: 5, refused: 5, own: 6, open: 7, where: 8 } as Record<string, number>)[head(k)] ?? 9;
  const out = cs.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x.key) - rank(b.x.key) || a.i - b.i).map((y) => y.x);
  // docs/60 item 4: one short paragraph, 70 words at Raw to Poached and 90 above: past that, who said
  // where they were with nobody to back it goes first, then who was accounted for, the last first (the
  // hour, where it came from, whose story doesn't hold and what's still open always stay).
  const wordsOf = (xs: Clause[]) => xs.reduce((n, x) => n + x.text.split(/\s+/).length, 0);
  for (const drop of ['own', 'placed']) {
    // (The notebook's words, a little shorter than the page says them.)
    while (wordsOf(out) * 1.2 > most - 2) {
      const k = out.map((x) => head(x.key)).lastIndexOf(drop);
      // (One of who was accounted for always stays.)
      if (k < 0 || (drop === 'placed' && out.filter((x) => head(x.key) === 'placed').length <= 1)) break;
      out.splice(k, 1);
    }
  }
  return out;
}

function collisionsOfRun(w: Writer): PersonId[] {
  return [...new Set(collisionsOf(w.c, w.run).map((x) => x.person))];
}

/** For the confrontation picker: the lines held for that place and hour. */
export { candidateLines, judgeLine, knownPeople, OFFICE };
