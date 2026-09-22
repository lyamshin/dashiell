/**
 * M5 §8 — the correspondence checker, run over what the engine renders.
 *
 * Phase 1 proved that every sentence the *generator* writes traces to a field.
 * The engine writes sentences too — a page is three deck cards and a record
 * and a thought — and the same rule holds for them: **the engine must not
 * introduce names or times the model lacks.** A card that names somebody who
 * is not in the case is a card that cannot be traced, and a clock time on a
 * page that no fact on that page accounts for is the engine asserting an hour.
 *
 * What is checked, and what is allowed:
 *
 * - Every block of prose on every page, plus the notes and the presence roll.
 * - The names in it must be people, mentions, places, the detective or the
 *   neighbourhood — or one of the closed list of capitalized words the corpus
 *   is allowed to print, which is the generator's own `KNOWN_WORDS`.
 * - The times in it must be accounted for by a fact the page renders, by an
 *   anchor, or by the coroner's window. The page's facts are the clues it
 *   delivered plus the claimed schedules it printed, because a claimed
 *   timeline is somebody's account and the hours in it are theirs.
 * - The facts themselves are not re-checked: they are the generator's, and
 *   Phase 1 checked them. `check` is given the page's ticks as `allowTicks`
 *   rather than as `facts` for exactly that reason — the engine renders a
 *   claim, it does not make one.
 */

import { TICKS, type Case, type Tick } from '../gen/types.js';
import { check, renderedFacts, type Violation } from '../gen/correspond.js';
import { establishedFrom, type CaseView } from './derive.js';
import type { Block, Page, RunState } from './types.js';
import { ALL_CARDS } from './voice/cards.js';
import * as VOICE_DATA from './voice-data.js';
import * as PLAIN from './voice/plain.js';

/* ------------------------------------------------------------------ *
 * The engine's own closed vocabulary.
 * ------------------------------------------------------------------ */

/**
 * Every capitalized word the engine is allowed to print that is not a name.
 *
 * The generator's `KNOWN_WORDS` is the same idea and covers the generator's
 * own templates; it does not know about seventeen decks of hand-written noir.
 * A deck card opens on "Whatever", ends on "Don't", and names St. Malachy's
 * and the Woolworth Building, and none of those is a person anybody can trace
 * — they are content, written on purpose, and read by the deck validator.
 *
 * So the engine's list is **derived from the content itself**: every
 * capitalized token that appears literally in a card's text, in one of the
 * hand-written pools in `voice-data.ts`, or in the plain register's own
 * shapes. It is closed in exactly the way the generator's is. A new template
 * that reaches for a new proper noun fails this check until the noun is either
 * written into a card — where the validator can see it — or made into a
 * mention the case owns.
 *
 * `ENGINE_WORDS` is the short hand-written remainder: the words that only
 * appear in a sentence the engine assembles in code, where there is no pool to
 * read them out of.
 */
export const ENGINE_WORDS: readonly string[] = [
  // `page.ts`, the opening note and the notes the grammar writes.
  'Midnight',
  'Two',
  'Eight',
  'Nobody',
  'Somebody',
  'DA',
  'No',
  'There',
  'Say',
  'Which',
  'Whatever',
  'Everything',
  'Go',
  'Ask',
  'Type',
  // The plain register's reported facts and the opening note.
  'Something',
  'People',
  'The',
  'It',
  'From',
  'What',
  'I',
  'This',
  'They',
  'He',
  'She',
  'A',
  'An',
];

export interface EngineVocabulary {
  /** Capitalized tokens the content already contains. */
  names: Set<string>;
  /**
   * Place short names a hand-written line uses as a figure of speech — "the
   * girl on the third floor", "the fellow who keeps the newsstand". A phrase a
   * writer wrote is the same in every case and is not a seventh room; what the
   * rule is about is a place name the engine *assembles*, and those all come
   * out of `view.placeById`.
   */
  places: Set<string>;
}

let cachedVocabulary: EngineVocabulary | null = null;

function collectStrings(value: unknown, into: string[], depth = 0): void {
  if (depth > 4) return;
  if (typeof value === 'string') {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into, depth + 1);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, into, depth + 1);
  }
}

export function engineVocabulary(): EngineVocabulary {
  if (cachedVocabulary) return cachedVocabulary;
  const strings: string[] = [];
  for (const card of ALL_CARDS) strings.push(card.text);
  collectStrings(VOICE_DATA, strings);
  collectStrings(PLAIN, strings);
  const names = new Set<string>(ENGINE_WORDS);
  const places = new Set<string>();
  for (const text of strings) {
    const rendered = renderedFacts(text);
    for (const token of rendered.names) names.add(token);
    for (const short of rendered.places) places.add(short);
    // The page grammar joins fragments and puts the first letter up: a card
    // written as "collar buttoned, no tie" reaches the page as "Collar
    // buttoned, no tie". The word is the writer's either way.
    const first = /[A-Za-z][A-Za-z'’-]*/.exec(text)?.[0];
    if (first) names.add(`${first.charAt(0).toUpperCase()}${first.slice(1)}`);
    // And the other way about. §5's carrying sentence turns a card's sentence
    // into a clause and puts its first letter down, so a card that opens "The
    // parlour held two boarders" reaches the page as "…, and the parlour held
    // two boarders" — the same phrase the writer wrote, in the same card, and
    // only now spelled the way the place templates spell it.
    const lowered = `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    for (const short of renderedFacts(lowered).places) places.add(short);
  }
  cachedVocabulary = { names, places };
  return cachedVocabulary;
}

/** Everything on a page that is words on paper, with where it came from. */
export function renderedText(view: CaseView, page: Page): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const [i, block] of page.blocks.entries()) {
    const where = `page ${page.n} block ${i}`;
    switch (block.kind) {
      case 'prose':
        out.push({ where: `${where} ${block.voice}`, text: block.text });
        break;
      case 'note':
        out.push({ where: `${where} note`, text: block.text });
        break;
      case 'presence':
        if (block.text) out.push({ where: `${where} presence`, text: block.text });
        break;
      case 'timeline': {
        // The rows are places and hours; the transcript prints them as a table
        // and the book as a list. Either way they are text on the page.
        const rows = block.rows
          .filter((r) => r.placeId !== null)
          .map((r) => view.placeById.get(r.placeId as string)?.shortName ?? '')
          .join(', ');
        out.push({ where: `${where} timeline`, text: rows });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/**
 * Which hours a page is allowed to print.
 *
 * A page may name any hour that a clue it delivered establishes, any hour of a
 * claimed account it took down, and — because a page is read in the context of
 * the run rather than on its own — any hour of a clue already in hand. The
 * coroner's window and the anchors are added by `check` itself.
 */
export function ticksOn(view: CaseView, page: Page, found: readonly string[]): Tick[] {
  const out = new Set<Tick>();
  const add = (t: number): void => {
    if (t >= 0 && t < TICKS) out.add(t as Tick);
  };
  for (const id of found) {
    for (const f of view.findableById.get(id)?.establishes ?? []) {
      if ('tick' in f) add(f.tick);
      if (f.kind === 'timeOfDeath') for (const t of f.ticks) add(t);
    }
  }
  for (const block of page.blocks) {
    if (block.kind !== 'timeline') continue;
    for (const row of block.rows) if (row.placeId !== null) add(row.tick);
  }
  // A page that prints somebody's whole claimed evening prints every hour of
  // the evening, and the evening is twelve half hours long.
  for (const block of page.blocks) {
    if (block.kind === 'timeline') {
      for (let t = 0; t < TICKS; t++) add(t);
      break;
    }
  }
  // The reactive monologue prints the window that is still open — "whatever
  // happened, it happened 9:00 PM to 11:30 PM" — and its two ends are the
  // board rather than any one fact. They are derived from what is in hand, and
  // `establishedFrom` is where they are derived.
  for (const t of establishedFrom(view, [...found], []).deathTicks) add(t);
  // The briefing states the hour the body was found and the hour of the act,
  // and page one renders the briefing entire.
  const bio = view.kase.victimBio;
  if (bio.discovery) add(bio.discovery.foundTick);
  if (bio.lastSeen) add(bio.lastSeen.tick);
  add(view.kase.act.tick);
  return [...out];
}

/** Every violation on one rendered page. */
export function checkPage(
  kase: Case,
  view: CaseView,
  page: Page,
  found: readonly string[],
): Violation[] {
  const allowTicks = ticksOn(view, page, found);
  const vocabulary = engineVocabulary();
  const office = view.office.shortName;
  const out: Violation[] = [];
  for (const { where, text } of renderedText(view, page)) {
    for (const violation of check(kase, text, { where, allowTicks })) {
      // A capitalized word the content already contains is content.
      const quoted = /"([^"]+)"/.exec(violation.detail)?.[1] ?? '';
      if (violation.rule === 'unknown-name' && vocabulary.names.has(quoted)) continue;
      if (violation.rule === 'foreign-place') {
        // §B.1: the office is the engine's seventh room and the generator has
        // never heard of it. It is a place in this case all the same.
        if (quoted === office) continue;
        if (vocabulary.places.has(quoted)) continue;
      }
      out.push(violation);
    }
  }
  return out;
}

/** Every violation in a whole run, page by page as the player read them. */
export function checkRun(view: CaseView, state: RunState): Violation[] {
  const out: Violation[] = [];
  const found: string[] = [];
  for (const page of state.log) {
    found.push(...page.found);
    out.push(...checkPage(view.kase, view, page, found));
  }
  return out;
}

/** The blocks a page turns into, for a test that wants to count them. */
export function pageBlocks(page: Page): Block[] {
  return page.blocks;
}
