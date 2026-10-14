/**
 * docs/49: the microplanner.
 *
 * ```
 * job (facts, links) → content plan (beats) → MICROPLANNER → skeleton → realization → page
 * ```
 *
 * The page writers (`pages.ts`) fill beats with items: facts, with what the
 * engine knows about each (new, confirms, collides, narrows; who; where;
 * when), and texture, with its card. The sheet (`sheets.ts`) says which beats
 * come in what order and which share a paragraph. The planner then decides
 * how many sentences, in what order, with what joins, and what each person is
 * called, in four operations:
 *
 * - **aggregation** (`aggregate.ts`): facts that share a predicate become one sentence;
 * - **connectives** (`connect.ts`): the join says what the fact does, from the logic;
 * - **rhythm** (`rhythm.ts`): sentence lengths vary, a joke ends short, paragraphs follow beats;
 * - **reference** (`refer.ts`): what a person is called follows what the last sentence was about.
 *
 * What comes out is the skeleton (`Unit[]`): fact units, locked, and gap
 * units, each with its card default. Realization concatenates them, a
 * paragraph to a block.
 *
 * `PLAN.ops = false` runs the same items through with none of the four
 * operations: the page as it read before the planner, word for word. The
 * measures use it for "before".
 */

import type { Block } from '../types.js';
import type { Beat } from '../sheets.js';
import type { BoardCase, BoardRun } from '../model.js';
import type { Item, Unit } from './types.js';
import { aggregate } from './aggregate.js';
import { connect, type PageBudget } from './connect.js';
import { rhythm } from './rhythm.js';
import { refer, stripMarks } from './refer.js';
import { situate, type SituCtx } from './situated.js';

export type { Item, Unit, Relation, GapSlot, Join, Agg } from './types.js';
export { sentencesOf, wordsIn, bandOf, markedSentences, openingOf } from './sentences.js';
export { markPronoun, stripMarks } from './refer.js';
export { SITUATED, type SituCtx } from './situated.js';

/** The planner's switch. Off, the four operations are skipped and the page reads as it did before docs/49. */
export const PLAN: { ops: boolean } = { ops: true };

export interface PlanCtx {
  c: BoardCase;
  /** What the page has spent of its joins: one "so" chain, one "but". */
  budget: PageBudget;
  /** A shuffle for the planner's few hand-written joins, so two pages don't say them alike. */
  pick: (key: string, lines: readonly string[]) => string;
  /** The tier's thought level (docs/46): which joins a fact may take. */
  level: 'walk' | 'link' | 'fact';
  /** The run as it stands with this page's question asked: what the player holds (the crime hour, for aggregation). */
  run?: BoardRun;
  /** Narrated sentences said earlier tonight: a sentence the planner makes isn't one of them again. */
  said?: ReadonlySet<string>;
  /** The prose of the pages before this one: what the thought may tie back to by name (docs/44). */
  earlier?: string;
  /** The page's own shuffle, for the planner's choices among cards that fit. */
  int?: (n: number) => number;
  /** docs/51: the page's situation, for keying its gaps and dealing the situated deck. */
  situ?: SituCtx;
}

export function newBudget(): PageBudget {
  return { but: 0, so: 0, joins: 0 };
}

function words(t: string): number {
  return t.split(/\s+/).length;
}

/**
 * Plan one section of a page (the page, or the turn's chapter after it):
 * the items by beat, laid out by the sheet's paragraphs, into units and the
 * blocks they realize. `firstBlock` is where this section's blocks start on
 * the page, so a unit's `para` is its block's index.
 */
export function planSection(
  items: Partial<Record<Beat, Item[]>>,
  paras: Beat[][],
  ctx: PlanCtx,
  firstBlock: number,
): { units: Unit[]; blocks: Block[]; beats: Beat[] } {
  const byBeat: Partial<Record<Beat, Item[]>> = {};
  for (const [b, xs] of Object.entries(items) as [Beat, Item[]][]) byBeat[b] = PLAN.ops ? aggregate(xs, ctx) : xs;
  // The beats in the sheet's order, then any the sheet hasn't room for, at the end.
  const order: { beats: Beat[] }[] = [];
  const placed = new Set<Beat>();
  for (const para of paras) {
    const filled = para.filter((b) => (byBeat[b] ?? []).length > 0);
    if (filled.length === 0) continue;
    for (const b of filled) placed.add(b);
    order.push({ beats: filled });
  }
  for (const b of Object.keys(byBeat) as Beat[]) if (!placed.has(b) && (byBeat[b] ?? []).length > 0) order.push({ beats: [b] });
  if (PLAN.ops) connect(order.flatMap((o) => o.beats.flatMap((b) => byBeat[b] ?? [])), ctx);
  // Paragraphs: a beat alone in its paragraph gives each of its items a paragraph of its own (an
  // item that runs on stays with the one before); beats that share a paragraph run together when
  // they're short enough to read as one.
  const groups: Item[][][] = [];
  const beats: Beat[] = [];
  for (const o of order) {
    beats.push(...o.beats);
    const runs: Item[][] = [];
    for (const b of o.beats) {
      for (const it of byBeat[b] ?? []) {
        const last = runs[runs.length - 1];
        if (it.runOn && last) last.push(it);
        else runs.push([it]);
      }
    }
    if (o.beats.length === 1) {
      for (const r of runs) groups.push([r]);
      continue;
    }
    const out: Item[][][] = [];
    for (const r of runs) {
      const last = out[out.length - 1];
      const lw = last ? last.flat().reduce((n, x) => n + words(x.text), 0) : 0;
      const rw = r.reduce((n, x) => n + words(x.text), 0);
      if (last && lw + rw <= 70) last.push(r);
      else out.push([r]);
    }
    groups.push(...out);
  }
  // Each paragraph is a list of items now.
  let paraItems: Item[][] = groups.map((g) => g.flat());
  // docs/51: the gaps' situations, and the situated deck, before the rhythm and the reference.
  if (PLAN.ops) situate(paraItems, ctx, firstBlock);
  if (PLAN.ops) {
    paraItems = rhythm(paraItems, ctx);
    referWithTrades(paraItems, ctx);
  }
  // The engine's marks on its pronouns are the planner's; the page never sees them.
  for (const ps of paraItems) for (const x of ps) x.text = stripMarks(x.text);
  const units: Unit[] = [];
  const blocks: Block[] = [];
  paraItems.forEach((ps, i) => {
    const kept = ps.filter((x) => x.text.trim().length > 0);
    if (kept.length === 0) return;
    const para = firstBlock + blocks.length;
    blocks.push({ kind: 'prose', text: kept.map((x) => x.text).join(' '), voice: (kept[0] as Item).voice });
    for (const x of kept) units.push(toUnit(x, para));
    void i;
  });
  return { units, blocks, beats };
}

function toUnit(x: Item, para: number): Unit {
  if (x.kind === 'fact') {
    return {
      kind: 'fact',
      text: x.text,
      locked: true,
      about: [...new Set(x.about ?? [])],
      ...(x.hour !== undefined ? { hour: x.hour } : {}),
      ...(x.place !== undefined ? { place: x.place } : {}),
      relation: x.relation ?? 'new',
      beat: x.beat,
      para,
      voice: x.voice,
      carries: [...new Set(x.carries ?? [])],
      ...(x.joined ? { join: x.joined } : {}),
    };
  }
  const sit = x.sit?.key ? { key: x.sit.key, ...(x.sit.card ? { card: x.sit.card } : {}), ...(x.sit.who ? { who: x.sit.who } : {}), ...(x.sit.lead ? { lead: stripMarks(x.sit.lead) } : {}), ...(x.sit.tail ? { tail: stripMarks(x.sit.tail) } : {}) } : {};
  return { kind: 'gap', slot: x.slot ?? 'gloss', text: x.text, beat: x.beat, para, voice: x.voice, ...sit };
}

/**
 * Reference, and the cap's last resort: where a name would be said a third time on the page (no
 * pronoun would be clear, and the person has no role), a card that fitted its draw as well and
 * doesn't need the person at all is taken instead, when there is one. Kept only when it leaves
 * fewer third names than before.
 */
function referWithTrades(paras: Item[][], ctx: PlanCtx): void {
  const original = paras.map((ps) => ps.map((x) => x.text));
  let breaks = refer(paras, ctx);
  for (let round = 0; round < 2 && breaks.length > 0; round++) {
    const trades: { it: Item; text: string; take: () => void }[] = [];
    for (const b of breaks) {
      const p = ctx.c.people.find((x) => x.id === b.who);
      if (!p) continue;
      const pronoun = p.female ? /\b(?:she|her|hers|herself)\b/i : /\b(?:he|him|his|himself)\b/i;
      // The card that said the name, or any card on the page that spoke of them, by name or not.
      const cards = [b.item, ...paras.flat().filter((x) => x !== b.item && (x.text.includes(p.short) || ((x.about ?? []).includes(p.id) && pronoun.test(x.text))))];
      for (const it of cards) {
        if (!it.alts || trades.some((t) => t.it === it)) continue;
        const os = it.alts();
        const ok = (o: { text: string }) => !pronoun.test(o.text) && !o.text.includes(p.short);
        // Its own kind first (another pay-off, another card of the draw), a plain one last.
        const alt = os.find((o) => !o.lastResort && ok(o)) ?? os.find(ok);
        if (alt) {
          trades.push({ it, text: alt.text, take: alt.take });
          break;
        }
      }
    }
    if (trades.length === 0) return;
    const restore = () => paras.forEach((ps, i) => ps.forEach((x, k) => (x.text = original[i]?.[k] as string)));
    restore();
    for (const t of trades) t.it.text = t.text;
    const again = refer(paras, ctx);
    if (again.length >= breaks.length) {
      restore();
      refer(paras, ctx);
      return;
    }
    for (const t of trades) {
      t.take();
      t.it.alts = undefined;
      paras.forEach((ps, i) => {
        const k = ps.indexOf(t.it);
        if (k >= 0) (original[i] as string[])[k] = t.text;
      });
    }
    breaks = again;
  }
}

/** A chapter heading, as a unit of its own. */
export function chapterUnit(text: string, para: number): Unit {
  return { kind: 'gap', slot: 'chapter', text, beat: 'staging', para, voice: 'chapter' };
}

/** Fill in each gap's neighbours: the fact units either side (docs/49 §3). */
export function linkGaps(units: Unit[]): Unit[] {
  const facts = units.map((u, i) => (u.kind === 'fact' ? i : -1)).filter((i) => i >= 0);
  return units.map((u, i) => {
    if (u.kind !== 'gap') return u;
    const before = [...facts].reverse().find((f) => f < i);
    const after = facts.find((f) => f > i);
    return { ...u, ...(before !== undefined ? { before } : {}), ...(after !== undefined ? { after } : {}) };
  });
}

/** Realization: the units' text in order, a paragraph to a block. */
export function realize(units: readonly Unit[]): Block[] {
  const out: Block[] = [];
  let at = -1;
  for (const u of units) {
    if (u.para !== at) {
      out.push({ kind: 'prose', text: u.text, voice: u.voice });
      at = u.para;
    } else {
      const b = out[out.length - 1] as Block & { kind: 'prose' };
      b.text = `${b.text} ${u.text}`;
    }
  }
  return out;
}
