/**
 * v2 — the book on the page (docs/35 §2, stages 3–5).
 *
 * The generator chose a book for the case's deduction graph (`gen/v2/book.ts`):
 * The Count, The Stranger, The Alibi Web, The Clock or The One Who Lied, with
 * its acts as cuts through the graph. This writes it onto the night as the
 * player plays it, in whatever order they take the steps:
 *
 * - **Chapters.** Page one carries the book's title and chapter one (the hook).
 *   Each act after it opens with a chapter heading on the page where the
 *   night reaches it: the scene (the first time the scene is reached), the
 *   widening (the page after), the turn (the first page on which the notebook
 *   holds everything that breaks somebody's own account), the narrowing (the
 *   page after the turn).
 * - **Night-long roles**, bound on one page and paid off on a later one:
 *   - the running gag, planted in the office on page one (or taken from the
 *     office's own words when they already have it: the radiator), paid off
 *     on the last page;
 *   - the motif, the anchor nearest the crime's half hour (the whistle),
 *     planted at the scene, paid off at the turn and in the ending;
 *   - the tell, planted by the page that brings the piece the book is about
 *     (the count, the empty doorway, the stranger's face), paid off at the turn.
 * - **The turn** is a recap as a chapter break, written from the notebook:
 *   the lie as two things that do not agree, side by side ("Three people said
 *   they were on those stairs at half past eight. Rafferty counted one."),
 *   never as a verdict. It takes the place of M12's recap on that page.
 * - **The ending**: the client's question answered in the client's terms, the
 *   motif, and the gag's payoff (`bookClosing`, read by the closing page).
 *
 * What stays the engine's: every page still has its choices, costs, the grid,
 * confront with the free second pick, the rundown, and M12's recaps at their
 * own triggers everywhere but the turn.
 */

import booksJson from '../../../content/books.json';
import { spokenClock, type Clue, type Fact, type Id, type Person, type Tick } from '../../gen/types.js';
import type { ActId, Book, BookId } from '../../gen/v2/book.js';
import type { DeductionGraph, GraphStep } from '../../gen/v2/graph.js';
import type { CaseView } from '../derive.js';
import { displayName } from '../m9.js';
import type { Block, Page, RunState } from '../types.js';
import { pronounOf } from '../voice/cast.js';

/* ------------------------------------------------------------------ data */

interface Lines {
  books: Record<BookId, { title: string; chapters: Partial<Record<ActId, string[]>>; turnClose: string[] }>;
  hookByType: Record<string, string[]>;
  turnOpen: string[];
  turn: Record<string, string[]>;
  turnMore: string[];
  turnNext: string[];
  tell: Record<string, { carry: string[]; text: string; short: string; pay: string[] }>;
  motifs: Record<string, { plant: string[]; turn: string[]; end: string[] }>;
  gags: Record<string, { match: string; plant: string[]; end: string[] }>;
  purposes: Record<string, string[]>;
}

export const BOOK_LINES = booksJson as unknown as Lines;

/** The book's memory across the night's pages. Plain JSON, saved with the run. */
export interface V2Memory {
  /** Acts opened, in order: each had its chapter heading on the page it opened. */
  acts: ActId[];
  /** The page each act opened on. */
  actPages: number[];
  /** Night roles bound, by name: `gag`, `motif`, `tell`. */
  roles: Record<string, { text: string; short: string; kind: string }>;
  /** Lie steps the notebook has held everything for. */
  caught: string[];
  /** Lines said tonight, so a line is not said twice. */
  said: string[];
}

export function bookOf(view: CaseView): Book | null {
  return view.kase.v2?.book ?? null;
}

function graphOf(view: CaseView): DeductionGraph | null {
  return view.kase.v2?.graph ?? null;
}

export function newMemory(): V2Memory {
  return { acts: [], actPages: [], roles: {}, caught: [], said: [] };
}

/* ------------------------------------------------------------ the words */

const NUMBER_WORDS = ['nobody', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const ORDINAL_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

function cap(s: string): string {
  return s.length === 0 ? s : `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}

const SLOT = /\{([A-Za-z][\w]*(?:\.[\w]+)?)\}/g;

/**
 * Fill a line. `{Name}` is `{name}` put up. Null when a slot has nothing to
 * put in it: the caller tries another line or says nothing.
 */
export function fillLine(template: string, slots: Record<string, string | undefined>, sentence = true): string | null {
  let missing = false;
  const out = template.replace(SLOT, (_m, key: string, at: number, whole: string) => {
    const [head, field] = key.split('.') as [string, string | undefined];
    const lower = `${head.charAt(0).toLowerCase()}${head.slice(1)}`;
    const up = head !== lower;
    const direct = slots[key];
    const value = direct ?? slots[`${lower}${field ? `.${field}` : ''}`];
    if (value === undefined || value.length === 0) {
      missing = true;
      return '';
    }
    const opens = sentence && (at === 0 || /[.!?:]\s+$/.test(whole.slice(0, at)));
    return up || opens ? cap(value) : value;
  });
  return missing ? null : out;
}

function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const c of parts.join('|')) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}

/** One of some lines that fills, not said tonight when one is left; seeded, so a night reads the same. */
function sayOne(
  lines: readonly string[] | undefined,
  slots: Record<string, string | undefined>,
  mem: V2Memory,
  seed: number,
  key: string,
): string | null {
  const filled = (lines ?? [])
    .map((t) => ({ t, text: fillLine(t, slots) }))
    .filter((x): x is { t: string; text: string } => x.text !== null);
  if (filled.length === 0) return null;
  const fresh = filled.filter((x) => !mem.said.includes(x.t));
  const pool = fresh.length > 0 ? fresh : filled;
  const pick = pool[hash(seed, key, mem.said.length) % pool.length] as { t: string; text: string };
  mem.said.push(pick.t);
  return pick.text;
}

function personSlots(view: CaseView, state: Pick<RunState, 'log' | 'found'>, prefix: string, person: Person | undefined): Record<string, string | undefined> {
  if (!person) return {};
  const he = pronounOf(person);
  const him = he === 'she' ? 'her' : 'him';
  const his = he === 'she' ? 'her' : 'his';
  const name = person.kind === 'fixture' ? person.surname : displayName(view, state, person.id);
  if (prefix === '') return { he, him, his, He: cap(he), Him: cap(him), His: cap(his) };
  return {
    [prefix]: name,
    [`she.${prefix[0]}`]: he,
    [`her.${prefix[0]}`]: his,
    [`She.${prefix[0]}`]: cap(he),
  };
}

/* ------------------------------------------------------------ chapters */

const ACT_ORDER: ActId[] = ['hook', 'scene', 'widening', 'turn', 'narrowing'];

function chapterTitle(view: CaseView, book: Book, act: ActId, mem: V2Memory, override?: string[]): string | null {
  const lines = BOOK_LINES.books[book.id];
  const motifName = book.motif?.name;
  const slots: Record<string, string | undefined> = {
    motif: motifName ? titleCase(motifName) : undefined,
    victim: view.victim.surname,
    title: book.title,
  };
  const pool = override ?? (act === 'hook' ? (BOOK_LINES.hookByType[view.kase.act.type] ?? lines.chapters.hook) : lines.chapters[act]);
  const name = sayOne(pool, slots, mem, view.kase.seed, `chapter:${act}`) ?? (act === 'scene' ? 'The Scene' : null);
  if (!name) return null;
  const n = mem.acts.length + 1;
  return `Chapter ${ORDINAL_WORDS[n] ?? String(n)}: ${name}`;
}

/** "the whistle off the river" as a chapter heading: The Whistle off the River. */
function titleCase(s: string): string {
  const small = new Set(['a', 'an', 'the', 'of', 'off', 'on', 'in', 'at', 'to', 'and', 'by', 'for', 'under']);
  return s
    .split(/\s+/)
    .map((w, i) => (i === 0 || !small.has(w) ? cap(w) : w))
    .join(' ');
}

function chapterBlock(text: string): Block {
  return { kind: 'prose', text, voice: 'chapter' };
}

function openAct(view: CaseView, book: Book, act: ActId, mem: V2Memory, page: number, override?: string[]): Block | null {
  if (mem.acts.includes(act)) return null;
  // Acts only go forward: a later act opened closes the earlier ones.
  const at = ACT_ORDER.indexOf(act);
  if (mem.acts.some((a) => ACT_ORDER.indexOf(a) > at)) return null;
  const title = chapterTitle(view, book, act, mem, override);
  mem.acts.push(act);
  mem.actPages.push(page);
  return title ? chapterBlock(title) : null;
}

/* ------------------------------------------------------------ page one */

/**
 * The office: the book's title and chapter one over the page, and the
 * running gag planted — or taken up where the office's own words already
 * have it (the radiator that decided to be a sculpture).
 */
export function officePass(view: CaseView, page: Page): V2Memory {
  const mem = newMemory();
  const book = bookOf(view);
  if (!book) return mem;
  const heading = openAct(view, book, 'hook', mem, 0);
  const title: Block = chapterBlock(book.title.toUpperCase());
  const first = page.blocks.findIndex((b) => b.kind === 'prose');
  const office = first >= 0 ? (page.blocks[first] as Extract<Block, { kind: 'prose' }>) : null;
  const officeText = page.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ').toLowerCase();
  // The gag the office already tells, if it tells one; otherwise the book's.
  const already = Object.entries(BOOK_LINES.gags).find(([, g]) => new RegExp(`\\b${g.match}\\b`).test(officeText));
  const gagId = already?.[0] ?? book.gag;
  const gag = BOOK_LINES.gags[gagId];
  if (gag) {
    mem.roles.gag = { text: gagId, short: gagId, kind: 'gag' };
    if (!already && office) {
      const line = sayOne(gag.plant, {}, mem, view.kase.seed, 'gag');
      if (line) office.text = `${office.text} ${line}`;
    }
  }
  page.blocks = [title, ...(heading ? [heading] : []), ...page.blocks];
  return mem;
}

/* ------------------------------------------------------------ the night */

function heldAll(ids: readonly Id[], found: ReadonlySet<Id>): boolean {
  return ids.length > 0 && ids.every((id) => found.has(id));
}

/** What caught a lie: the kind of piece that breaks it, for the turn's words. */
function catcherOf(view: CaseView, step: GraphStep): { kind: string; clue?: Clue; fact?: Fact } {
  const clues = step.leaves.map((id) => view.findableById.get(id)).filter((c): c is Clue => !!c);
  const liar = step.personId as Id;
  const ticks = step.ticks ?? [];
  // The half hour that matters first, where the piece says it: the crime's.
  const M = view.kase.solution.murderTick;
  const atM = (f: Fact): boolean => ('tick' in f && f.tick === M) || ('ticks' in f && f.ticks.includes(M));
  const find = (pred: (f: Fact) => boolean): { clue: Clue; fact: Fact } | null => {
    let first: { clue: Clue; fact: Fact } | null = null;
    for (const c of clues) {
      for (const f of c.establishes) {
        if (!pred(f)) continue;
        if (atM(f)) return { clue: c, fact: f };
        first ??= { clue: c, fact: f };
      }
    }
    return first;
  };
  const count = find((f) => f.kind === 'countAt' && f.place === step.place && ticks.includes(f.tick));
  if (count) return { kind: 'count', ...count };
  const absent = find((f) => f.kind === 'absentFrom' && f.place === step.place && f.ticks.some((t) => ticks.includes(t)) && !f.except.includes(liar));
  if (absent) return { kind: 'absence', ...absent };
  const notThere = find((f) => f.kind === 'personNotAt' && f.personId === liar && f.place === step.place && ticks.includes(f.tick));
  if (notThere) return { kind: 'notThere', ...notThere };
  const elsewhere = find((f) => f.kind === 'personAt' && f.personId === liar && ticks.includes(f.tick) && f.place !== step.place);
  if (elsewhere) return { kind: 'elsewhere', ...elsewhere };
  const anchored = find((f) => f.kind === 'personAtAnchor' && f.personId === liar && f.place !== step.place);
  if (anchored) return { kind: 'anchor', ...anchored };
  const described = find((f) => f.kind === 'describedAt' && f.place === step.place && ticks.includes(f.tick));
  if (described) return { kind: 'stranger', ...described };
  const together = find((f) => f.kind === 'together' || f.kind === 'apart');
  if (together) return { kind: 'together', ...together };
  const anyCount = find((f) => f.kind === 'countAt');
  if (anyCount) return { kind: 'count', ...anyCount };
  return { kind: 'any' };
}

/** The pieces the book is about: the clues that plant its tell. */
function tellPieces(view: CaseView, book: Book, graph: DeductionGraph): { kind: string; ids: Set<Id> } | null {
  const kind = book.id === 'count' ? 'count' : book.id === 'stranger' ? 'stranger' : book.id === 'clock' ? 'anchor' : book.id === 'web' ? 'together' : null;
  if (!kind) return null;
  const want = (f: Fact): boolean =>
    kind === 'count'
      ? f.kind === 'countAt' || f.kind === 'absentFrom'
      : kind === 'stranger'
        ? f.kind === 'describedAt'
        : kind === 'anchor'
          ? f.kind === 'anchorAt' || f.kind === 'personAtAnchor'
          : f.kind === 'together' || f.kind === 'apart' || (f.kind === 'claims' && f.with !== undefined);
  const ids = new Set<Id>();
  const byId = new Map(graph.steps.map((s) => [s.id, s]));
  // Under the lies the turn is made of, first; then anywhere in the graph.
  const roots = book.turn.length > 0 ? book.turn : graph.lies;
  const seen = new Set<string>();
  const walk = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const s = byId.get(id);
    if (!s) return;
    for (const leaf of s.leaves) {
      const c = view.findableById.get(leaf);
      if (c && c.establishes.some(want)) ids.add(leaf);
    }
    for (const n of s.needs) walk(n);
  };
  for (const r of roots) walk(r);
  if (ids.size === 0) for (const s of graph.steps) for (const leaf of s.leaves) {
    const c = view.findableById.get(leaf);
    if (c && c.establishes.some(want)) ids.add(leaf);
  }
  return ids.size > 0 ? { kind, ids } : null;
}

function insertAfterFirst(page: Page, blocks: Block[]): void {
  // After the first paragraph that is not the errand (why he came).
  const i = page.blocks.findIndex((b, k) => b.kind === 'prose' && b.voice !== 'errand' && b.voice !== 'chapter' && k >= 0);
  if (i < 0) page.blocks.push(...blocks);
  else page.blocks.splice(i + 1, 0, ...blocks);
}

/** Before the recap, if the page has one; at the end otherwise. */
function insertBeforeRecap(page: Page, blocks: Block[]): void {
  const i = page.blocks.findIndex((b) => b.kind === 'prose' && b.voice === 'recap');
  if (i < 0) page.blocks.push(...blocks);
  else page.blocks.splice(i, 0, ...blocks);
}

/**
 * After a page is written and the state moved on: open the act the night has
 * reached, plant what the page's steps plant, and at the turn, write the
 * chapter break. Mutates `page` and `after.v2`.
 */
export function bookPass(view: CaseView, before: RunState, after: RunState, page: Page): void {
  const book = bookOf(view);
  const graph = graphOf(view);
  if (!book || !graph) return;
  const mem: V2Memory = JSON.parse(JSON.stringify(before.v2 ?? newMemory())) as V2Memory;
  const seed = view.kase.seed;
  const found = new Set(after.found);
  const top: Block[] = [];

  // The scene: the first time the night's first room is reached.
  if (after.sceneSeen && !before.sceneSeen) {
    const h = openAct(view, book, 'scene', mem, page.n);
    if (h) top.push(h);
    const motif = book.motif ? (BOOK_LINES.motifs[book.motif.anchorId] ?? BOOK_LINES.motifs['any']) : null;
    if (motif && book.motif) {
      const line = sayOne(motif.plant, {}, mem, seed, 'motif');
      if (line) {
        mem.roles.motif = { text: book.motif.name, short: book.motif.name, kind: 'motif' };
        insertAfterFirst(page, [{ kind: 'prose', text: line, voice: 'ambient' }]);
      }
    }
  } else if (mem.acts.includes('scene') && !mem.acts.includes('widening') && page.n > (mem.actPages[mem.acts.indexOf('scene')] ?? 0)) {
    const h = openAct(view, book, 'widening', mem, page.n);
    if (h) top.push(h);
  } else if (!mem.acts.includes('scene') && !mem.acts.includes('widening') && page.n >= 2 && page.at !== view.office.id) {
    // A night that goes somewhere else before the scene is widening already.
    const h = openAct(view, book, 'widening', mem, page.n);
    if (h) top.push(h);
  }

  // The tell: the page that brings the piece the book is about, while it can
  // still set the turn up.
  if (!mem.roles.tell && !mem.acts.includes('turn')) {
    const pieces = tellPieces(view, book, graph);
    const gained = page.found.filter((id) => pieces?.ids.has(id));
    if (pieces && gained.length > 0) {
      const clue = view.findableById.get(gained[0] as Id) as Clue;
      const spec = BOOK_LINES.tell[pieces.kind];
      const slots = tellSlots(view, after, clue, pieces.kind);
      const carry = spec ? sayOne(spec.carry, slots, mem, seed, 'tell') : null;
      const text = spec ? fillLine(spec.text, slots, false) : null;
      const short = spec ? fillLine(spec.short, slots, false) : null;
      if (carry && text && short) {
        mem.roles.tell = { text, short, kind: pieces.kind };
        // Right after the words that brought the piece, before what he makes of it.
        const at = page.blocks.findIndex((b) => b.kind === 'prose' && b.clueId === clue.id);
        // Else before the page names its next lead, or its recap.
        const bridge = page.blocks.findIndex((b) => b.kind === 'prose' && (b.voice === 'bridge' || b.voice === 'recap'));
        const line: Block = { kind: 'prose', text: carry, voice: 'thought' };
        // After his note on it, when the next paragraph is his and not theirs.
        const note = page.blocks[at + 1];
        const after = note && note.kind === 'prose' && !/^[“"]/.test(note.text) && note.voice !== 'bridge' && note.voice !== 'recap' ? at + 2 : at + 1;
        if (at >= 0) page.blocks.splice(after, 0, line);
        else if (bridge >= 0) page.blocks.splice(bridge, 0, line);
        else insertBeforeRecap(page, [line]);
      }
    }
  }

  // The turn: the first page the notebook holds everything that breaks somebody's word.
  const newly = graph.lies.filter((id) => {
    if (mem.caught.includes(id)) return false;
    const s = graph.steps.find((x) => x.id === id);
    return !!s && heldAll(s.leaves, found) && heldAll(s.facts, found);
  });
  if (newly.length > 0) {
    mem.caught.push(...newly);
    if (!mem.acts.includes('turn')) {
      const turn = turnRecap(view, book, graph, before, after, newly, mem);
      if (turn) {
        // The turn is the page's recap: M12's, if it wrote one here, gives way.
        page.blocks = page.blocks.filter((b) => !(b.kind === 'prose' && b.voice === 'recap'));
        page.beats = (page.beats ?? []).filter((b) => b.kind !== 'recap');
        const h = openAct(view, book, 'turn', mem, page.n, turn.matched ? undefined : TURN_PLAIN);
        page.blocks.push(...(h ? [h] : []), ...turn.paras.map((text) => ({ kind: 'prose' as const, text, voice: 'recap' as const })));
      }
    }
  } else if (mem.acts.includes('turn') && !mem.acts.includes('narrowing') && page.n > (mem.actPages[mem.acts.indexOf('turn')] ?? 0)) {
    const h = openAct(view, book, 'narrowing', mem, page.n);
    if (h) top.push(h);
  }

  if (top.length > 0) page.blocks = [...top, ...page.blocks];
  after.v2 = mem;
}

function tellSlots(view: CaseView, state: RunState, clue: Clue, kind: string): Record<string, string | undefined> {
  const src = clue.source.type === 'person' ? view.personById.get(clue.source.personId) : undefined;
  const slots: Record<string, string | undefined> = {
    ...personSlots(view, state, 'watcher', src),
    motif: bookOf(view)?.motif?.name,
  };
  for (const f of clue.establishes) {
    if (f.kind === 'countAt') {
      slots.k = NUMBER_WORDS[f.count] ?? String(f.count);
      slots.place = view.placeById.get(f.place)?.shortName;
      slots.hour = spokenClock(f.tick);
      break;
    }
    if (f.kind === 'absentFrom') {
      slots.place = view.placeById.get(f.place)?.shortName;
      slots.hour = spokenClock(f.ticks[0] as Tick);
      break;
    }
    if (f.kind === 'describedAt') {
      slots.desc = f.description.text;
      slots.place = view.placeById.get(f.place)?.shortName;
      slots.hour = spokenClock(f.tick);
      break;
    }
  }
  void kind;
  return slots;
}

/** The chapter break at the turn, from the notebook: two things that do not agree, side by side. */
function turnRecap(
  view: CaseView,
  book: Book,
  graph: DeductionGraph,
  before: RunState,
  after: RunState,
  newly: string[],
  mem: V2Memory,
): { paras: string[]; matched: boolean } | null {
  const seed = view.kase.seed;
  const step = graph.steps.find((s) => s.id === newly[0]);
  if (!step || !step.personId || !step.place) return null;
  const liar = view.personById.get(step.personId);
  const caught = catcherOf(view, step);
  const M = view.kase.solution.murderTick as Tick;
  const lieTicks = step.ticks ?? [];
  const factTicks: Tick[] = !caught.fact ? [] : 'tick' in caught.fact ? [caught.fact.tick] : 'ticks' in caught.fact ? caught.fact.ticks : [];
  const both = factTicks.filter((t) => lieTicks.includes(t));
  const tick: Tick = both.includes(M) ? M : (both[0] ?? (lieTicks.includes(M) ? M : (lieTicks[lieTicks.length - 1] as Tick)));
  const witness = caught.clue?.source.type === 'person' ? view.personById.get(caught.clue.source.personId) : undefined;
  const slots: Record<string, string | undefined> = {
    ...personSlots(view, after, 'liar', liar),
    ...personSlots(view, after, '', liar),
    ...personSlots(view, after, 'watcher', witness),
    ...personSlots(view, after, 'witness', witness),
    place: view.placeById.get(step.place)?.shortName,
    hour: spokenClock(tick),
    motif: book.motif?.name,
  };
  let kind = caught.kind;
  if (kind === 'count' && caught.fact?.kind === 'countAt') {
    const k = caught.fact.count;
    slots.k = NUMBER_WORDS[k] ?? String(k);
    // How many held accounts put themselves there at that half hour.
    const claimants = view.kase.findable.filter(
      (c) =>
        c.kind === 'account' &&
        after.found.includes(c.id) &&
        c.establishes.some((f) => f.kind === 'claims' && f.place === step.place && f.ticks.includes(tick)),
    ).length;
    if (claimants > k) slots.n = NUMBER_WORDS[claimants] ?? String(claimants);
    else kind = 'countOne';
  }
  const out: string[] = [];
  const first: string[] = [];
  const open = sayOne(BOOK_LINES.turnOpen, slots, mem, seed, 'turnOpen');
  if (open) first.push(open);
  const line = sayOne(BOOK_LINES.turn[kind], slots, mem, seed, 'turn') ?? sayOne(BOOK_LINES.turn['any'], slots, mem, seed, 'turn');
  if (!line) return null;
  first.push(line);
  // The motif, where the notebook has its hour.
  const motif = book.motif;
  if (motif && mem.roles.motif) {
    const heard = view.kase.findable
      .filter((c) => after.found.includes(c.id))
      .flatMap((c) => c.establishes)
      .find((f): f is Extract<Fact, { kind: 'anchorAt' }> => f.kind === 'anchorAt' && f.anchorId === motif.anchorId);
    // Or the scene said it: the scene's report gives the motif's hour at the crime.
    const sceneSaid = view.kase.findable.some(
      (c) => c.kind === 'scene' && after.found.includes(c.id) && (c.textRecord ?? c.text).toLowerCase().includes((motif.name.replace(/^the /, '').split(' ')[0] ?? '').toLowerCase()),
    );
    const at =
      heard?.ticks.find((t) => t === tick) ??
      heard?.ticks.find((t) => t === view.kase.solution.murderTick) ??
      (sceneSaid && motif.ticks.includes(view.kase.solution.murderTick) ? view.kase.solution.murderTick : undefined);
    if (at !== undefined) {
      const m = BOOK_LINES.motifs[motif.anchorId] ?? BOOK_LINES.motifs['any'];
      const said = sayOne(m?.turn, { ...slots, hour: spokenClock(at) }, mem, seed, 'motifTurn');
      if (said) first.push(said);
    }
  }
  out.push(first.join(' '));
  const second: string[] = [];
  const tell = mem.roles.tell;
  // The tell pays off here unless the turn's own line already said it.
  if (tell && !kind.startsWith(tell.kind)) {
    const spec = BOOK_LINES.tell[tell.kind];
    const pay = spec ? sayOne(spec.pay, { ...slots, tell: tell.short, Tell: tell.short }, mem, seed, 'tellPay') : null;
    if (pay) second.push(pay);
  }
  if (newly.length > 1) {
    const more = sayOne(BOOK_LINES.turnMore, { ...slots, n: NUMBER_WORDS[newly.length] }, mem, seed, 'turnMore');
    if (more) second.push(more);
  }
  // The book's own last word, when what caught the lie is what the book is
  // about; otherwise the plain one (a Count book whose first lie fell to a
  // plain sighting does not talk about counting yet).
  const matched = turnMatches(book, kind);
  const close = sayOne(BOOK_LINES.books[matched ? book.id : 'lied'].turnClose, slots, mem, seed, 'turnClose');
  if (close) second.push(close);
  const next = sayOne(BOOK_LINES.turnNext, slots, mem, seed, 'turnNext');
  if (next) second.push(next);
  if (second.length > 0) out.push(second.join(' '));
  void before;
  return { paras: out, matched };
}

/** Does the piece that caught the lie belong to the book's technique? */
function turnMatches(book: Book, kind: string): boolean {
  const kinds: Record<BookId, string[]> = {
    count: ['count', 'countOne', 'absence'],
    stranger: ['stranger'],
    clock: ['anchor'],
    web: ['together'],
    lied: [],
  };
  return book.id === 'lied' || kinds[book.id].includes(kind);
}

/** The turn's chapter, when the lie fell to something other than the book's own piece. */
const TURN_PLAIN = ['Something That Didn’t Fit', 'Two Stories'];

/* ------------------------------------------------------------ the ending */

/**
 * The closing page's book lines: the client's question answered in the
 * client's terms (after the body), and the motif and the gag (the last word).
 */
export function bookClosing(view: CaseView, state: RunState): { middle: string[]; last: string[] } {
  const book = bookOf(view);
  if (!book) return { middle: [], last: [] };
  const mem: V2Memory = JSON.parse(JSON.stringify(state.v2 ?? newMemory())) as V2Memory;
  const seed = view.kase.seed;
  const slots: Record<string, string | undefined> = {
    ...personSlots(view, state, 'client', view.client),
    victim: view.victim.surname,
    motif: book.motif?.name,
  };
  const middle: string[] = [];
  const purpose = view.kase.clientBrief.purpose;
  const said = sayOne(BOOK_LINES.purposes[purpose] ?? BOOK_LINES.purposes['any'], slots, mem, seed, 'purpose');
  if (said) middle.push(said);
  const last: string[] = [];
  if (book.motif) {
    const m = BOOK_LINES.motifs[book.motif.anchorId] ?? BOOK_LINES.motifs['any'];
    const line = sayOne(m?.end, { ...slots, hour: spokenClock(view.kase.solution.murderTick as Tick) }, mem, seed, 'motifEnd');
    if (line) last.push(line);
  }
  const gagId = mem.roles.gag?.text ?? book.gag;
  const gag = BOOK_LINES.gags[gagId];
  if (gag) {
    const line = sayOne(gag.end, slots, mem, seed, 'gagEnd');
    if (line) last.push(line);
  }
  return { middle, last: last.length > 0 ? [last.join(' ')] : [] };
}
