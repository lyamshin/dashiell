/**
 * docs/43 §1: the engine, `board`. The book on the small board.
 *
 * The case is `src/gen/board/` (docs/41, docs/42): suspects × whole hours, and
 * the few things a detective can ask for — a whole account, a whole watcher's
 * list, one search, one confrontation. This file holds the run's own data and
 * the plain lookups every other file of the engine uses.
 *
 * Nothing here touches the DOM.
 */

import { analyse, generateBoard, type Analysis } from '../../gen/board/index.js';
import type { BoardCase, CaseType, Hour, Person, PersonId, Place, PlaceId, TierIndex } from '../../gen/board/types.js';
import { TIER_NAMES } from '../../gen/board/types.js';
import { fmtHour } from '../../gen/board/solver.js';
import { TIERS } from '../../gen/board/tiers.js';
import { worldCtx } from '../../gen/board/world/index.js';
import type { CellMark, Page } from './types.js';
import type { Weather } from './types.js';

export type { BoardCase, Hour, Person, PersonId, Place, PlaceId, TierIndex, CaseType };

/** Where a board night is kept in the browser. */
export const BOARD_SAVE_KEY = 'dashiell:board-run';

/** The office is a place of its own, off the board. */
export const OFFICE = 'office';

/**
 * One confrontation, as the player made it: whose claim, at which hour, and
 * the line read them. `landed` is whether that line breaks the claim given
 * what was held then; a pair that doesn't break costs the call and says why.
 */
export interface PutRecord {
  person: PersonId;
  hour: Hour;
  /** The id of the line read them (`Line.id`). */
  line: string;
  landed: boolean;
  /** For a claim put a second time after a second lie: the second story it was put against. */
  again?: boolean;
  page: number;
}

/**
 * docs/67: a hint the player asked for. It stars one step (a question id) with its reason, or
 * (`q` null) says the report can be closed on what's held. A hint that would give nothing new (the
 * starred step again) isn't recorded: a player never pays twice for the same step.
 */
export interface HintRecord {
  /** The page it was asked on (its index in the log). */
  page: number;
  /** The step it starred, or null: you have what you need. */
  q: string | null;
}

/** What the player files (docs/43 §2, the report). Any field left out is "I don't know". */
export interface BoardReport {
  who: PersonId | null;
  when: Hour | null;
  /** Murder: how (the means). */
  how?: string | null;
  /** Why: the motive, by whose motive it is. */
  why: PersonId | null;
  /** Lost item or pet: where it is now. */
  where?: string | null;
  /**
   * docs/46 §3: what breaks their story, as the id of a line held (`Line.id`). Null or left out
   * is a hunch. Recorded so a measure can tell a name worked out from a name guessed.
   */
  breaks?: string | null;
  /** docs/46 §3, a lost thing: which line put it where it is now (a held line's id, or `crack:p@h`). Null is a hunch. */
  whereBy?: string | null;
  /**
   * docs/61, from Poached up on a night with an innocent liar: who else lied (a suspect's id, or
   * `nobody`). Null is "I don't know".
   */
  other?: PersonId | null;
  /** docs/61: the held line that cleared the other liar (`Line.id`). Null is a hunch. */
  cleared?: string | null;
}

export interface BoardRun {
  engine: 'board';
  seed: number;
  tier: TierIndex;
  /** The case type, when the night was dealt with one asked for. */
  type?: CaseType;
  detectiveName: string;
  /** Where the detective stands: a place id, or `office`. */
  at: PlaceId;
  /** Calls spent. */
  used: number;
  /** Question ids asked, in order: `search:x`, `list:w`, `account:p`, `motive:p`, `confront:p@h` (landed only). */
  asked: string[];
  puts: PutRecord[];
  /** Places walked into, in order of first visit. */
  visited: PlaceId[];
  log: Page[];
  /** docs/67: the hints taken tonight, in order. Free; the tier sets how many (`hints.ts`). */
  hints?: HintRecord[];
  /** The player's pencil on the board. Free, never a fact. */
  marks: Record<PersonId, Record<string, CellMark>>;
  reportOpen: boolean;
  filed?: BoardReport;
  /** The page the turn (the first lie caught) fell on. */
  turn?: number;
  /** Deck cards and noted lines spent tonight, so none comes round twice. */
  spent: string[];
  weather: Weather;
  /** The office's prop, when its card exported one, for the night's last word. */
  prop?: { short: string; pay: string[] };
  /** Visits per place, for "back at …". */
  visits: Record<PlaceId, number>;
  /**
   * M13's roles, on the board: the trait a first look gave somebody ("the
   * squint"), and the lines that pay it off later. A page about them may close
   * on one (a callback).
   */
  traits?: Record<PersonId, { short: string; pay: string[] }>;
  /** M13's props, on the board: something in a place set up on the first visit, paid off later there. */
  props?: Record<PlaceId, { short: string; pay: string[] }>;
  /** docs/44: the street's own role, set up on the night's first walk and paid off on a later one. */
  street?: { short: string; pay: string[] };
  /**
   * docs/55 6: what the profile's last ten nights dealt (cards, voicings, asides), and the last night
   * alone, as the night began: the hand prefers what none of them dealt. Saved with the night, so a
   * replay deals what it dealt.
   */
  seen?: { recent: string[]; last: string[] };
}

/** A dealt night: the case and its analysis. */
export interface BoardDeal {
  kase: BoardCase;
  analysis: Analysis;
}

const DEALT = new Map<string, BoardDeal>();

/**
 * docs/48 §2: a night cast from a world, and who to keep off it. The culprit of the last night isn't
 * the culprit tonight, and nobody wronged (killed, or robbed) in the last ten nights is wronged
 * again (`recentCast` in the profile keeps them).
 */
export interface DealWorld {
  world?: string;
  avoid?: { culprits?: string[]; victims?: string[] };
}

/** The bible ids a night's culprit and wronged party (the dead man, or the owner) were cast from. */
export function castOf(c: BoardCase): { culprit?: string; victim?: string } {
  const culprit = personOf(c, c.crime.culprit)?.world;
  const wronged = c.type === 'murder' ? personOf(c, c.crime.victim)?.world : personOf(c, c.client)?.world;
  return { ...(culprit ? { culprit } : {}), ...(wronged ? { victim: wronged } : {}) };
}

/** Does a night keep its continuity: a fresh culprit, and nobody wronged lately wronged again. */
export function keepsContinuity(c: BoardCase, avoid: DealWorld['avoid']): boolean {
  if (!avoid) return true;
  const k = castOf(c);
  return !(k.culprit && avoid.culprits?.includes(k.culprit)) && !(k.victim && avoid.victims?.includes(k.victim));
}

/**
 * Deal the case for a seed and tier, as `npm run board` would. The generator
 * accepts every seed at every tier (docs/42's sweep); a seed it can't build
 * moves on to the next one, so a night always opens.
 *
 * docs/48: with a world, the night is cast from its bible, and a seed whose
 * cast breaks the continuity moves on to the next one too, so the seed the
 * night carries (and the link that shares it) is always the night itself.
 */
export function dealBoard(seed: number, tier: TierIndex, type?: CaseType, w: DealWorld = {}): BoardDeal {
  const key = `${seed}|${tier}|${type ?? ''}|${w.world ?? ''}|${JSON.stringify(w.avoid ?? {})}`;
  const hit = DEALT.get(key);
  if (hit) return hit;
  const ctx = w.world ? worldCtx(w.world) : undefined;
  const made = new Map<number, ReturnType<typeof generateBoard>>();
  const make = (s: number) => {
    if (!made.has(s)) made.set(s, generateBoard(s, tier, { ...(type ? { type } : {}), ...(ctx ? { world: ctx } : {}) }));
    return made.get(s) ?? null;
  };
  // Continuity as far as the bible allows it: the whole of it over the next sixteen seeds, then the
  // last few nights' wronged only, then the last night's, then a fresh culprit only, which is never
  // let go while one is anywhere in reach. A small bible runs out of victims first.
  const v = w.avoid?.victims ?? [];
  const levels: (DealWorld['avoid'] | undefined)[] = w.avoid
    ? [w.avoid, { ...w.avoid, victims: v.slice(-5) }, { ...w.avoid, victims: v.slice(-2) }, { ...w.avoid, victims: v.slice(-1) }, { culprits: w.avoid.culprits ?? [] }, undefined]
    : [undefined];
  for (const avoid of levels) {
    const span = avoid && avoid.victims?.length ? 16 : 50;
    for (let s = seed; s < seed + span; s++) {
      const g = make(s);
      if (g && keepsContinuity(g.kase, avoid)) {
        const deal = { kase: g.kase, analysis: g.analysis };
        if (DEALT.size > 12) DEALT.delete(DEALT.keys().next().value as string);
        DEALT.set(key, deal);
        return deal;
      }
    }
  }
  throw new Error(`no board case near seed ${seed} at tier ${tier}`);
}

/** For tests and tools: the analysis again, for a case built by hand. */
export function dealOf(kase: BoardCase): BoardDeal {
  return { kase, analysis: analyse(kase) };
}

/* ------------------------------------------------------------------ *
 * Lookups.
 * ------------------------------------------------------------------ */

export function personOf(c: BoardCase, id: PersonId): Person | undefined {
  return c.people.find((p) => p.id === id);
}

export function placeOf(c: BoardCase, id: PlaceId): Place | undefined {
  return c.places.find((p) => p.id === id);
}

/** What the prose calls them: "Marchetti", "Mrs. Rafferty". */
export function nameOf(c: BoardCase, id: PersonId): string {
  return personOf(c, id)?.short ?? id;
}

/** The place's short name: "the Velvet Room", "Rafferty’s". The office is "the office". */
export function placeName(c: BoardCase, id: PlaceId): string {
  if (id === OFFICE) return 'the office';
  return placeOf(c, id)?.short ?? id;
}

export interface Pron {
  he: string;
  him: string;
  his: string;
  He: string;
  His: string;
  /** "himself". */
  self: string;
}

export function pronOf(c: BoardCase, id: PersonId): Pron {
  const p = personOf(c, id);
  // docs/47 B9: a lost pet is "he" or "she", as the office says it; only a thing is "it".
  if (p?.object && c.type === 'lost-pet') {
    const they = c.givens.lines?.find((g) => g.kind === 'gone')?.vars.pthey;
    if (they === 'she') return { he: 'she', him: 'her', his: 'her', He: 'She', His: 'Her', self: 'herself' };
    if (they === 'he') return { he: 'he', him: 'him', his: 'his', He: 'He', His: 'His', self: 'himself' };
  }
  if (p?.object) return { he: 'it', him: 'it', his: 'its', He: 'It', His: 'Its', self: 'itself' };
  return p?.female ? { he: 'she', him: 'her', his: 'her', He: 'She', His: 'Her', self: 'herself' } : { he: 'he', him: 'him', his: 'his', He: 'He', His: 'His', self: 'himself' };
}

/** "nine", "ten". */
export function hourWord(h: Hour): string {
  return fmtHour(h);
}

/** "nine o’clock". */
export function oclock(h: Hour): string {
  return `${fmtHour(h)} o’clock`;
}

export const cap = (s: string): string => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

/** "Fairbanks, Sweeney and Sirkin". */
export function andList(xs: readonly string[]): string {
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0] as string;
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function suspectsOf(c: BoardCase): PersonId[] {
  return c.people.filter((p) => p.role === 'suspect').map((p) => p.id);
}

export function victimOf(c: BoardCase): Person {
  return personOf(c, c.crime.victim) as Person;
}

export function clientOf(c: BoardCase): Person {
  return personOf(c, c.client) as Person;
}

export function isMurder(c: BoardCase): boolean {
  return c.type === 'murder';
}

/** The thing a small case is about, or the dead man, as the prose says it: "Fritz", "the watch", "Weisglass". */
export function victimWord(c: BoardCase): string {
  return victimOf(c).short;
}

export function tierName(t: TierIndex): string {
  return TIER_NAMES[t];
}

/**
 * docs/46 §2: how far a thought may go.
 * - walk: everything, the elimination to its last step included. docs/67: no tier deals it any
 *   more; Raw's elimination is the hint's to say, when the player asks (`hints.ts`);
 * - link (Raw to Medium): collisions, agreements, the link to the scene,
 *   the way in; never who is cleared, who is left or how many remain;
 * - fact (Hard-boiled): this page's fact said again in the voice, and a
 *   collision only when both its lines are on this page.
 * The turn and "Go over what I have" follow the same level.
 */
export type ThoughtLevel = 'walk' | 'link' | 'fact';

export function thoughtLevel(c: Pick<BoardCase, 'tier'>): ThoughtLevel {
  return c.tier === 5 ? 'fact' : 'link';
}

/* ------------------------------------------------------------------ *
 * Par and the night's budget (docs/43 §6).
 * ------------------------------------------------------------------ */

/**
 * Par in calls: the designed path's questions, the motive search a murder's
 * report needs on top, and the walks the path takes from the office. Every
 * question and every walk is a call.
 */
export function parCalls(d: BoardDeal): number {
  return d.analysis.par + (d.analysis.motive ? 1 : 0) + d.analysis.walks;
}

/** The night's budget: par and the tier's slack (rule 16: +3 at Raw down to +1 at Hard-boiled). */
export function budgetCalls(d: BoardDeal): number {
  return parCalls(d) + TIERS[d.kase.tier].slack;
}

/** Who waits at eight: the DA for a murder, the client for a lost thing. */
export function deadlineWords(c: BoardCase): string | undefined {
  // docs/55 7: a widowed client keeps her "Mrs.".
  const cl = clientOf(c);
  const name = cl.female && /\ba widow\b/.test(cl.description) && !/^(?:Mrs|Miss|Dr)\.? /.test(cl.short) ? `Mrs. ${cl.short}` : cl.short;
  return isMurder(c) ? undefined : `${name} wants an answer at eight`;
}

/** The questions a run has asked that the solver reads. */
export function solverHeld(run: Pick<BoardRun, 'asked'>): string[] {
  return run.asked.filter((q) => !q.startsWith('motive:'));
}
