/**
 * docs/60 item 1: the texture budget, a dial.
 *
 * docs/59's skim test found that a quarter to a third of the sentences readers stop on are the voice's
 * texture: the bible's lines, place gags, callbacks, staging and closers. With `TEXTURE.mode` at `lean`
 * (the default), a page keeps, besides its facts and its signposts (why I came, where next):
 *
 * - **what the place is and who's there doing what**, on the way in: the place's own sentence (two when
 *   the first is a word or two, "Midnight."), and a sentence a person; a second atmosphere sentence (a
 *   prop, the street outside) goes;
 * - **one joke or flourish** (a line whose job is wit, simile or atmosphere): a callback when one is due
 *   (a gag the night set up, paid off), else the joke the page dealt; nothing else of the kind. The
 *   closer stays only when it's that joke;
 * - **one staging line** (where I sit, how I open): on a page that asks somebody something, the ask,
 *   which says what the answer answers; else the first.
 *
 * The order the planner keeps things in is facts > the place-and-people sentence > the one joke >
 * staging > atmosphere > callback, and a callback beats a fresh joke when one is due. Everything else
 * decorative goes. A set-up that goes (a prop, the street's role, the office's prop) takes its
 * pay-offs with it (`Item.onDrop`): nothing calls back to a line the page never said.
 *
 * `full` (`?texture=full`, `--texture full`) writes the pages as they read before docs/60, byte for
 * byte: every docs/60 rule asks `lean()` first.
 */

import type { Item } from './types.js';
import type { PlanCtx } from './index.js';
import { stripMarks } from './refer.js';
import { sentencesOf, wordsIn } from './sentences.js';
import { situatedDeck } from './situated.js';
import { similesIn } from '../tics.js';

export { TEXTURE, lean, setTexture } from './dial.js';
import { lean } from './dial.js';

/**
 * What a piece of texture is for, as the budget sees it:
 *
 * - `keep`: a signpost or an aside that carries something (the watcher's line, "nobody watching the
 *   stairs", the door nobody forced, the money on the desk): never budgeted;
 * - `place`: what the place is (trimmed to its own sentence); `people`: who's there doing what;
 * - `staging`, `ask`: where I sit, how I open;
 * - `flourish`: wit, a reaction, a voice line, an aphorism; `atmosphere`: a prop, the street, the room;
 * - `close`: the page's last line; `callback`: a pay-off of a gag set up earlier tonight.
 */
export type TexRole = 'keep' | 'place' | 'people' | 'staging' | 'ask' | 'flourish' | 'atmosphere' | 'close' | 'callback';

/** A page's budget, across its sections (the page and the turn after it). */
export interface TexSpent {
  joke: boolean;
  staging: boolean;
  /** docs/60 item 2: the page's one lead-in on a collision ("One thing didn't fit: …"). */
  sign?: boolean;
}

/** docs/60 item 2: the lead-ins on a collision, plain, one a page: before a short one, with a colon; before a long one, a sentence of its own. */
const DIDNT_FIT = ['One thing didn’t fit', 'One thing didn’t fit', 'Something didn’t fit', 'One thing didn’t add up'];

/**
 * docs/60 item 2: a signpost back, said once: the page's first collision in the thought opens on a
 * short lead-in, so a reader skimming for the point finds it ("One thing didn't fit: she had said
 * Moskowitz's at ten, and Hauck hadn't seen her there"). The preference readers found the point by it.
 */
function leadIn(paras: Item[][], ctx: PlanCtx, spent: TexSpent): void {
  if (spent.sign) return;
  const it = paras.flat().find((x) => x.kind === 'fact' && x.beat === 'thought' && x.relation === 'collides' && x.text.trim() && !x.speech);
  if (!it) return;
  const t = stripMarks(it.text).trim();
  // (Not a collision said with a lead of its own, nor one built on a colon or a semicolon already.)
  if (/^(?:One thing|Something|Here was|Two stories)\b/.test(t) || /[:;]/.test(sentencesOf(t)[0] ?? '')) return;
  const lead = ctx.pick('didnt-fit', DIDNT_FIT);
  const body = it.text.replace(/^(?:But|So|And) /, (x) => (x === 'But ' || x === 'So ' || x === 'And ' ? '' : x));
  const body1 = body.charAt(0).toUpperCase() + body.slice(1);
  const first = (/^(\S+)/.exec(stripMarks(body1))?.[1] ?? '').replace(/[,.]$/, '');
  const lower = /^(?:He|She|They|It|There|The|A|An|His|Her|Their|At|By|Nobody|Somebody)$/.test(first);
  // (A long collision takes the lead-in as a short sentence of its own, which the page's rhythm wants too.)
  const long = wordsIn(stripMarks(sentencesOf(body1)[0] ?? '')) > 14;
  it.text = long ? `${lead}. ${body1}` : `${lead}: ${lower ? body1.charAt(0).toLowerCase() + body1.slice(1) : body1}`;
  it.alts = undefined;
  spent.sign = true;
}

let JOKES: Map<string, boolean> | null = null;
function situatedJoke(id: string): boolean {
  if (!JOKES) JOKES = new Map(situatedDeck().map((c) => [c.id, !!c.joke]));
  return JOKES.get(id) === true;
}

/** Whether an item is the page's joke as dealt: a card flagged joke, or a situated joke that filled it. */
function isJoke(it: Item): boolean {
  if (it.sit?.card) return situatedJoke(it.sit.card);
  return it.jk === true || it.sit?.joke === true;
}

/** The role an item plays, from what its writer said or its slot. */
export function roleOf(it: Item): TexRole {
  if (it.tex) return it.tex;
  switch (it.slot) {
    case 'staging':
      return 'staging';
    case 'ask':
      return 'ask';
    case 'walk':
      return it.runOn ? 'atmosphere' : 'staging';
    case 'arrival':
      return it.voice === 'presence' ? 'people' : it.runOn ? 'atmosphere' : 'place';
    case 'reaction':
    case 'voice':
    case 'gloss':
      return 'flourish';
    case 'close':
      return 'close';
    default:
      return 'keep';
  }
}

/** Take a piece of texture off the page, and anything it set up with it. */
function drop(it: Item, paras: Item[][]): void {
  if (!it.text.trim()) return;
  const t = it.text;
  // (A voice line inside an answer carries the answer's quotation marks: they go to its neighbours.)
  if (it.speech) {
    const para = paras.find((ps) => ps.includes(it)) ?? [];
    const k = para.indexOf(it);
    const open = /^“/.test(stripMarks(t).trim());
    const close = /”$/.test(stripMarks(t).trim());
    const next = para.slice(k + 1).find((x) => x.text.trim());
    const prev = [...para.slice(0, k)].reverse().find((x) => x.text.trim());
    if (open && close) {
      // A quotation of its own.
    } else if (open && next) next.text = `“${next.text.replace(/^“/, '')}`;
    else if (close && prev) prev.text = `${prev.text.replace(/”$/, '')}”`;
  }
  it.text = '';
  it.alts = undefined;
  it.onDrop?.();
}

/** The place's own sentence: its first, and the next when the first is a word or two ("Midnight."). */
function trimPlace(it: Item): void {
  const xs = sentencesOf(it.text);
  if (xs.length <= 1) return;
  const keep = wordsIn(stripMarks(xs[0] as string)) < 6 ? 2 : 1;
  if (xs.length <= keep) return;
  it.text = xs.slice(0, keep).join(' ');
  it.alts = undefined;
  // (What it set up went with the sentences after: the office's prop, say.)
  it.onTrim?.();
}

/**
 * docs/60 item 3: the narrator's cap, after the reference pass: where somebody is named a third time in
 * the narration and nothing could be said instead (no pronoun was clear, and no role is allowed there),
 * a piece of decoration that names them goes, latest first (a close, a flourish, a callback, an
 * atmosphere line). The facts and the signposts stay.
 */
export function capNames(paras: Item[][], ctx: PlanCtx): void {
  if (!lean()) return;
  const items = paras.flat();
  const narr = (t: string) => stripMarks(t).replace(/“[^”]*”?/g, ' ');
  const counted = (x: Item) => x.text.trim() && !x.speech && (!x.exempt || x.counted);
  for (const p of ctx.c.people) {
    if (p.object || p.short.length <= 2) continue;
    const re = new RegExp(`(?<![\\w’])${p.short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'g');
    const n = () => items.filter(counted).reduce((k, x) => k + (narr(x.text).match(re) ?? []).length, 0);
    if (n() <= 2) continue;
    for (const it of [...items].reverse()) {
      if (n() <= 2) break;
      if (it.kind !== 'gap' || !counted(it) || !re.test(narr(it.text))) continue;
      re.lastIndex = 0;
      const r = roleOf(it);
      if (r === 'close' || r === 'flourish' || r === 'callback' || r === 'atmosphere') drop(it, paras);
    }
  }
}

/** The pages that ask somebody something: the ask says what the answer answers. */
const ASKING = new Set(['account', 'admission-check', 'list', 'motive']);

/**
 * docs/60 item 1: the budget, on one section's paragraphs, after the situated deck has filled them and
 * before the rhythm. In place.
 */
export function budgetTexture(paras: Item[][], ctx: PlanCtx): void {
  if (!lean()) return;
  const spent = ctx.tex ?? { joke: false, staging: false };
  const items = paras.flat().filter((x) => x.kind === 'gap' && x.slot !== 'chapter' && x.text.trim());
  // A why-here's reason stays; the card after it goes (what I did about it is staging, and the page has its own).
  for (const it of items) {
    if (it.slot === 'why-here' && it.sit?.lead && !it.tex && it.text !== it.sit.lead) {
      it.text = it.sit.lead;
      it.alts = undefined;
    }
  }
  for (const it of items) if (roleOf(it) === 'place') trimPlace(it);
  // Who's there doing what, plainly: a line with a simile in it, or a long one, takes a card that fitted
  // as well and says it shorter, where there is one ("Bledsoe was at a corner table with a plate of
  // toast", not "…, eating it slowly, a corner at a time, like somebody paying by the bite").
  for (const it of items) {
    if (roleOf(it) !== 'people' || !it.alts) continue;
    const n = wordsIn(stripMarks(it.text));
    if (similesIn(it.text) === 0 && n <= 18) continue;
    const alt = it.alts().find((a) => similesIn(a.text) === 0 && wordsIn(stripMarks(a.text)) <= Math.min(18, n - 1));
    if (!alt) continue;
    alt.take();
    it.text = alt.text;
    it.alts = undefined;
  }
  // The one joke or flourish: a callback when one is due, else the page's joke.
  const funny = items.filter((it) => {
    const r = roleOf(it);
    return r === 'flourish' || r === 'atmosphere' || r === 'close' || r === 'callback' || ((r === 'staging' || r === 'ask') && isJoke(it));
  });
  const callback = funny.find((it) => roleOf(it) === 'callback');
  const joke = callback ?? funny.find((it) => isJoke(it));
  for (const it of funny) {
    if (it === joke && !spent.joke) continue;
    drop(it, paras);
  }
  if (joke && joke.text.trim()) spent.joke = true;
  // The one staging line: the ask on a page that asks, else the first.
  const stage = items.filter((it) => it.text.trim() && (roleOf(it) === 'staging' || roleOf(it) === 'ask'));
  const asking = ASKING.has(ctx.situ?.page ?? '');
  // (A joke that is the staging is both: no second staging line.)
  const jokeStages = !!joke && stage.includes(joke);
  const keep = spent.staging || jokeStages ? undefined : ((asking ? stage.find((it) => roleOf(it) === 'ask') : undefined) ?? stage[0]);
  for (const it of stage) if (it !== keep && it !== joke) drop(it, paras);
  if (keep || jokeStages) spent.staging = true;
  leadIn(paras, ctx, spent);
  ctx.tex = spent;
}
