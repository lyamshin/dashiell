/**
 * docs/49: the microplanner.
 *
 * ```
 * job (facts, links) → content plan (beats) → MICROPLANNER → skeleton → realization → page
 * ```
 *
 * The page writers (`pages.ts`) fill beats with items: facts, with what the
 * engine knows about each (new, confirms, collides, narrows; who; where;
 * when) and the propositions it says (docs/52), and texture, with its card.
 * The sheet (`sheets.ts`) says which beats come in what order and which share
 * a paragraph. The planner then decides how many sentences, in what order,
 * with what joins, and what each person is called.
 *
 * docs/52's order: bones → compose → voicing → textures → the reference and
 * rhythm pass.
 *
 * - **composition on the bones** (`../bones/compose.ts`): aggregation, the
 *   connectives and Planner 2's thought, run on propositions; each composite
 *   is said in its voicing (`../bones/voice.ts`, `content/board/voicings.json`)
 *   or in the writer's own words;
 * - **textures** (`situated.ts`, `situate`): the situated deck fills the gaps,
 *   the one place texture attaches;
 * - **rhythm** (`rhythm.ts`): sentence lengths vary, a joke ends short, paragraphs follow beats;
 * - **reference** (`refer.ts`): what a person is called follows what the last sentence was about.
 *
 * What comes out is the skeleton (`Unit[]`): fact units, locked, each with its
 * bones (`Unit.bones`: the composites, their propositions, the voicing), and
 * gap units, each with its card default. Realization concatenates them, a
 * paragraph to a block; the plain page (`../bones/plain.ts`) says the same
 * bones with no voice.
 *
 * `PLAN.ops = false` runs the same items through with none of the planner's
 * operations: the page as it read before docs/49, word for word, in the
 * writers' own words. The measures use it for "before".
 */

import type { Block } from '../types.js';
import type { Beat } from '../sheets.js';
import type { BoardCase, BoardRun } from '../model.js';
import type { Item, Unit } from './types.js';
import type { PageBudget } from './types.js';
import { aggregate, bonesOf, compose, connect, sayAll } from '../bones/compose.js';
import { VOICED, checkVoiced } from '../bones/reread.js';
import type { Composite } from '../bones/types.js';
import type { VoiceHand } from '../bones/say.js';
import { rhythm } from './rhythm.js';
import { refer, stripMarks } from './refer.js';
import { situate, type SituCtx } from './situated.js';
import { capThingClose } from './closers.js';
import { sayOnce } from './once-pass.js';
import { pronounAmbiguity } from './measure.js';
import { speakerOf } from './speaker.js';
import { budgetTexture, droppable, introduce, lean, namePut, petKind, type TexSpent } from './texture.js';
export { speakerOf } from './speaker.js';
export { TEXTURE, lean, setTexture } from './texture.js';

export type { Item, Unit, Relation, GapSlot, PageBudget } from './types.js';
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
  /** docs/52 §4, build 2: the page's hand, for the voicings' least-recently-used rule and the page's joke. */
  hand?: VoiceHand;
  /** docs/59 item 7: the page's own prose laid out already (the section before the turn), for its one simile. */
  pageSoFar?: string;
  /** docs/60 item 1: what the page has spent of its texture budget (its one joke, its one staging line), across its sections. */
  tex?: TexSpent;
  /** docs/60 item 3: people the reference pass named a third time, pressed from the start when it's run again. */
  press?: Set<string>;
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
  // docs/52 build 2: the writers' composites said in their voicings, before anything is joined.
  for (const xs of Object.values(items)) sayAll(xs ?? [], ctx);
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
  // docs/49, Planner 2: the thought's facts joined by what they do to each other.
  if (PLAN.ops && byBeat.thought) byBeat.thought = compose(byBeat.thought, ctx);
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
  // docs/51, docs/52 §4: textures attach after the voicing, here and only here: the gaps'
  // situations, and the situated deck. Then the reference and the rhythm.
  if (PLAN.ops) situate(paraItems, ctx, firstBlock);
  // docs/60 item 1: the texture budget (lean only): one joke, one staging line, the place and its people.
  if (PLAN.ops) budgetTexture(paraItems, ctx);
  if (PLAN.ops) {
    // (docs/62: who somebody is, before the rhythm, which then sees the sentence as it will read; and
    // again below, for a line the rhythm or said-once traded in.)
    introduce(paraItems, ctx, ctx.pageSoFar ?? '');
    paraItems = rhythm(paraItems, ctx);
    // docs/59 items 1 and 7: said once on the page, and one simile frame (before the reference, so a
    // line traded in has its pronouns settled with the rest).
    sayOnce(paraItems, ctx);
    // (docs/60 item 6: lean, the rhythm again on what said-once left, where it took a sentence out.)
    if (lean()) paraItems = rhythm(paraItems, ctx);
    // docs/62 items 1 and 4: the first time the night's narration meets somebody, who they are, once
    // (before the reference pass, which counts the names it says).
    introduce(paraItems, ctx, ctx.pageSoFar ?? '');
    referWithTrades(paraItems, ctx);
    // (docs/62 item 3: a put says to somebody, by name, before "You told me…".)
    namePut(paraItems, ctx);
    // docs/60 item 5: a pet named in the reckoning says what it is, once a page.
    petKind(paraItems, ctx, ctx.pageSoFar ?? '');
    // docs/55 6: about half a night's pages end on a thing having a feeling, at most.
    if (ctx.run) capThingClose(paraItems, ctx.run.log);
  }
  // docs/52: the round trip on the voiced composites, when it's asked for: after the rhythm, which
  // may have traded a voicing for another of another length.
  if (VOICED.check) {
    for (const it of paraItems.flat()) {
      const speaker = speakerOf(it, ctx.c);
      const walk = (x: Composite) => {
        checkVoiced(x, { c: ctx.c, here: ctx.run?.at ?? '', ...(speaker ? { speaker } : {}) });
        for (const y of x.parts ?? []) walk(y);
      };
      if (it.comp) walk(it.comp);
    }
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
      ...((x.n ?? 1) > 1 ? { facts: x.n } : {}),
      ...(bonesOf(x, VOICED.check) ? { bones: bonesOf(x, VOICED.check) } : {}),
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
    if (trades.length === 0) break;
    const restore = () => paras.forEach((ps, i) => ps.forEach((x, k) => (x.text = original[i]?.[k] as string)));
    restore();
    for (const t of trades) t.it.text = t.text;
    const again = refer(paras, ctx);
    if (again.length >= breaks.length) {
      restore();
      refer(paras, ctx);
      break;
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
  // docs/60 item 3: lean, where a name would still be said a third time in the narration (no pronoun
  // was clear, and no role is allowed there), the decoration that says it goes: a close, a flourish, a
  // staging line, latest first. The reference pass is run again on what's left.
  const restore0 = () => paras.forEach((ps, i) => ps.forEach((x, k) => (x.text = original[i]?.[k] as string)));
  for (let round = 0; lean() && round < 3 && breaks.length > 0; round++) {
    let dropped = false;
    for (const b of breaks) {
      const p = ctx.c.people.find((x) => x.id === b.who);
      if (!p) continue;
      const said = (x: Item) => {
        const i = paras.findIndex((ps) => ps.includes(x));
        const k = i >= 0 ? (paras[i] as Item[]).indexOf(x) : -1;
        return k >= 0 && ((original[i]?.[k] ?? '').includes(p.short) || ((x.about ?? []).includes(p.id) && x.kind === 'gap'));
      };
      const it = [b.item, ...[...paras.flat()].reverse().filter((x) => x !== b.item)].find((x) => droppable(x) && x.text.trim() && said(x));
      if (!it) continue;
      paras.forEach((ps, i) => {
        const k = ps.indexOf(it);
        if (k >= 0) (original[i] as string[])[k] = '';
      });
      it.alts = undefined;
      it.onDrop?.();
      dropped = true;
    }
    if (!dropped) break;
    restore0();
    breaks = refer(paras, ctx);
  }
  // (Still a third name: run again with them pressed from the start, kept where it names fewer.)
  if (lean() && breaks.length > 0) {
    const press = new Set(breaks.map((b) => b.who));
    const was = paras.map((ps) => ps.map((x) => x.text));
    restore0();
    const before = ctx.press;
    ctx.press = press;
    const again = refer(paras, ctx);
    ctx.press = before;
    if (again.length < breaks.length) breaks = again;
    else {
      paras.forEach((ps, i) => ps.forEach((x, k) => (x.text = was[i]?.[k] as string)));
    }
  }
  // docs/59 item 8: a card whose pronoun the page leaves to two people ("Bernstein looked once at the
  // place where Fritz belonged, and then kept his eyes on me") takes another card that fitted its draw
  // as well, where the page then has fewer such pronouns. (Tried on the words before the reference
  // pass, and the pass run again on them.)
  const restore = () => paras.forEach((ps, i) => ps.forEach((x, k) => (x.text = original[i]?.[k] as string)));
  for (let round = 0; round < 3; round++) {
    const n = unclearPronouns(paras, ctx);
    if (n === 0) return;
    let found: { it: Item; text: string; take: () => void } | null = null;
    for (const it of paras.flat()) {
      // (Texture's other cards, or a voiced fact's other voicings.)
      if (it.speech || !it.alts || !/\b(?:he|him|his|she|her)\b/i.test(stripMarks(it.text))) continue;
      const k = paras.findIndex((ps) => ps.includes(it));
      const at = (paras[k] as Item[]).indexOf(it);
      for (const o of it.alts().filter((x) => !x.lastResort)) {
        restore();
        it.text = o.text;
        refer(paras, ctx);
        const m = unclearPronouns(paras, ctx);
        it.text = (original[k] as string[])[at] as string;
        if (m < n) {
          found = { it, text: o.text, take: o.take };
          break;
        }
      }
      if (found) break;
    }
    restore();
    if (!found) {
      refer(paras, ctx);
      return;
    }
    found.take();
    found.it.alts = undefined;
    found.it.text = found.text;
    paras.forEach((ps, i) => {
      const k = ps.indexOf((found as { it: Item }).it);
      if (k >= 0) (original[i] as string[])[k] = (found as { text: string }).text;
    });
    refer(paras, ctx);
  }
}

/** Pronouns two people could be, on the section as it stands (the measure's count). */
function unclearPronouns(paras: Item[][], ctx: PlanCtx): number {
  const blocks: Block[] = paras.map((ps) => ({ kind: 'prose', voice: ps[0]?.voice ?? 'narrator', text: ps.map((x) => stripMarks(x.text)).filter((x) => x.trim()).join(' ') }) as Block);
  return pronounAmbiguity(ctx.c, blocks, ctx.situ?.subject ? { subject: ctx.situ.subject } : {}).length;
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
