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
import { pronOf } from '../model.js';
import type { PlanCtx } from './index.js';
import { markPronoun, stripMarks } from './refer.js';
import { sentencesOf, wordsIn } from './sentences.js';
import { situatedDeck } from './situated.js';
import { similesIn } from '../tics.js';
import { glossedIn, introOf } from '../gloss.js';
import { maskPlaces, narrationOf } from './measure.js';

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
  // (The lead-in is a short sentence of its own, which the page's rhythm wants too; before a collision of
  // a few words, a colon.)
  const long = wordsIn(stripMarks(sentencesOf(body1)[0] ?? '')) > 4;
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

/** docs/60 item 3: decoration the narrator's cap may take off the page, where a name would be said a third time. */
export function droppable(it: Item): boolean {
  if (it.kind !== 'gap' || it.speech || it.slot === 'chapter') return false;
  const r = roleOf(it);
  return r === 'close' || r === 'flourish' || r === 'callback' || r === 'atmosphere' || r === 'staging';
}

/**
 * docs/60 item 5: a pet by name in the detective's reckoning ("…and at ten Duchess was at the flats over
 * Lipsky’s") says what it is the first time a page names it there: "Duchess, the Pomeranian,". A
 * reader who didn't hold the office can't place a name alone.
 */
export function petKind(paras: Item[][], ctx: PlanCtx, sofar = ''): void {
  if (!lean() || ctx.c.type !== 'lost-pet') return;
  const pet = ctx.c.people.find((p) => p.id === ctx.c.crime.victim);
  const kind = pet ? /^[^,]+, (?:a|an) (.+)$/.exec(pet.name)?.[1] : undefined;
  if (!pet || !kind) return;
  const items = paras.flat();
  const said = (t: string) => new RegExp(`\\b${kind.split(' ').slice(-1)[0]}\\b`, 'i').test(t);
  // (docs/62 item 1: once a night. The office's "My dachshund" says it, and every page after has the name alone.)
  if (said(sofar) || said(ctx.earlier ?? '')) return;
  for (const it of items) {
    if (!it.text.trim()) continue;
    const t = stripMarks(it.text);
    if (said(t.replace(/“[^”]*”?/g, ' '))) return;
    if (it.speech || it.kind !== 'fact' || (it.voice !== 'thought' && it.voice !== 'recap')) continue;
    // Its first mention in the narration, not a possessive and not inside quotation marks.
    const re = new RegExp(`(?<![\\w’])${pet.short}(?![\\w’])(?!’s)`);
    const m = re.exec(t.replace(/“[^”]*”?/g, (q) => ' '.repeat(q.length)));
    if (!m) continue;
    const at = m.index + pet.short.length;
    const after = t.slice(at);
    it.text = /^[.,;:!?]/.test(after) ? `${t.slice(0, at)}, the ${kind}${after}` : `${t.slice(0, at)}, the ${kind},${after}`;
    it.alts = undefined;
    return;
  }
}

/**
 * docs/62 items 1 and 4, P12: nobody appears bare. The first time the night's narration names somebody,
 * the sentence says who they are, unless that sentence or the one before already does, or the night
 * said it before (the office's "Ask about Althea Tillman, a piano teacher", the papers' "Reinhardt: …"):
 * "Hanrahan, a regular, was at a table by the wall", "Zeldin, the barman, stood at the register end",
 * "Vogel, the woman Steinbach had named, was in the corner". Said once: after that, the name alone.
 * After the reference pass, on what it left; never inside quotation marks, a list of names or a
 * possessive.
 */
export function introduce(paras: Item[][], ctx: PlanCtx, sofar = ''): void {
  if (!lean()) return;
  const c = ctx.c;
  const people = c.people.filter((x) => !x.object && x.short.length >= 3 && (x.role === 'suspect' || x.role === 'company' || x.role === 'watcher'));
  if (!people.length) return;
  const reOf = (x: { short: string }) => new RegExp(`(?<![\\w’])${x.short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`);
  const met = new Set<string>();
  // What the night has said already: a name in the narration, or said in somebody's mouth with who they
  // are. (Quotation marks carried through a paragraph, sentence to sentence.)
  const quote = (s: string, inQ: boolean): boolean => {
    let q = inQ;
    for (const ch of s) {
      if (ch === '“') q = true;
      if (ch === '”') q = false;
    }
    return q;
  };
  for (const block of stripMarks(`${ctx.earlier ?? ''}\n${sofar}`).split(/\n+/)) {
    let inQ = false;
    for (const s of sentencesOf(block)) {
      const n = maskPlaces(c, narrationOf(s, inQ));
      inQ = quote(s, inQ);
      for (const x of people) if (!met.has(x.id) && reOf(x).test(s) && (reOf(x).test(n) || glossedIn(c, x.id, s))) met.add(x.id);
    }
  }
  if (people.every((x) => met.has(x.id))) return;
  let prev = '';
  for (const para of paras) {
    let inQ = false;
    for (const it of para) {
      if (!it.text.trim()) continue;
      const startQ = inQ;
      for (const s of sentencesOf(stripMarks(it.text))) {
        const sn = maskPlaces(c, narrationOf(s, inQ));
        inQ = quote(s, inQ);
        for (const x of people) {
          if (met.has(x.id) || !reOf(x).test(s)) continue;
          if (!reOf(x).test(sn)) {
            if (glossedIn(c, x.id, s)) met.add(x.id);
            continue;
          }
          met.add(x.id);
          if (it.speech || glossedIn(c, x.id, s) || glossedIn(c, x.id, prev)) continue;
          const intro = introOf(c, x.id, ctx.run?.at);
          if (!intro) continue;
          // In the item's own words (marks and all): the first time the name stands in its narration.
          const t = it.text;
          const tn = maskPlaces(c, narrationOf(t, startQ));
          const m = reOf(x).exec(tn);
          if (!m) continue;
          const at = m.index + x.short.length;
          const before = tn.slice(0, m.index);
          const after = t.slice(at);
          // (Not a possessive, nor one of a list of names: "Mosley, Bledsoe and Hanrahan".)
          // (A clause of its own after a comma, ", and Coffin was finishing a late supper", is no list.)
          if (/^’s\b/.test(after) || /^(?:, (?:(?:Mrs\.|Miss|Dr\.) )?[A-Z][\w’.-]+(?:,| and)| and (?:(?:Mrs\.|Miss|Dr\.) )?[A-Z])/.test(after) || /[A-Z][\w’.-]+(?:,| and) $/.test(before)) continue;
          it.text = /^[.,;:!?]/.test(after) ? `${t.slice(0, at)}, ${intro}${after}` : `${t.slice(0, at)}, ${intro},${after}`;
          it.alts = undefined;
        }
        if (sn.trim()) prev = s;
      }
    }
  }
}

/**
 * docs/62, P4: a page doesn't open on a pointer standing on its own ("Zeldin had seen Reinhardt at the
 * Shamrock at seven and ten." and then, a paragraph down, "I asked her to walk me through her night").
 * The pointer is said in the asking: "Zeldin had seen Reinhardt at the Shamrock at seven and ten, so I
 * asked her to walk me through her night." An ask in quotation marks follows it in its paragraph.
 */
function foldPointer(paras: Item[][], ctx: PlanCtx): void {
  if (!ASKING.has(ctx.situ?.page ?? '')) return;
  const items = paras.flat();
  const why = items.find((it) => it.slot === 'why-here' && it.text.trim());
  const ask = items.find((it) => roleOf(it) === 'ask' && it.text.trim());
  if (!why || !ask || items.indexOf(ask) < items.indexOf(why)) return;
  const w = stripMarks(why.text).trim();
  if (sentencesOf(w).length !== 1 || !/\b(?:had|has) (?:seen|said|told me|passed|mentioned|named)\b/.test(w)) return;
  // Nothing else between them but the staging budgeted away.
  const between = items.slice(items.indexOf(why) + 1, items.indexOf(ask)).filter((x) => x.text.trim());
  if (between.length > 0) return;
  const a = stripMarks(ask.text).trim();
  const wp = paras.find((ps) => ps.includes(why)) as Item[];
  const ap = paras.find((ps) => ps.includes(ask)) as Item[];
  const subj = ctx.situ?.subject ? ctx.c.people.find((x) => x.id === ctx.situ?.subject) : undefined;
  // (One sentence only where "her" can be nobody but whom I asked: not after "Feeney had seen Quill".)
  const crowded = !!subj && ctx.c.people.some((x) => x.id !== subj.id && (!x.object || ctx.c.type === 'lost-pet') && pronOf(ctx.c, x.id).he === pronOf(ctx.c, subj.id).he && new RegExp(`\\b${x.short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(w));
  if (/^I asked\b/.test(a) && !crowded) {
    // (Whom I asked is the pointer's person, said once: "…, so I asked her for her evening", never "…, so I asked Quill".)
    const askText = subj && w.includes(subj.short) ? ask.text.trim().replace(new RegExp(`^I asked ${subj.short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), `I asked ${subj.female ? 'her' : 'him'}${markPronoun(ctx.c, subj.id)}`) : ask.text.trim();
    why.text = `${why.text.replace(/\.\s*$/, '')}, so ${askText}`;
    why.alts = undefined;
    // (The ask's pronouns are the person asked: the sentence is about them now too.)
    why.about = [...new Set([...(why.about ?? []), ...(ask.about ?? [])])];
    ask.text = '';
    ask.alts = undefined;
  } else if (wp !== ap) {
    ap.splice(ap.indexOf(ask), 1);
    wp.splice(wp.indexOf(why) + 1, 0, ask);
    ask.runOn = true;
  }
  for (const ps of paras) for (let k = ps.length - 1; k >= 0; k--) if ((ps[k] as Item).kind === 'gap' && !(ps[k] as Item).text.trim()) ps.splice(k, 1);
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
  // docs/62 item 3, P3: a put says to their face what they told me and what says otherwise; the why-here
  // that said it first ("Steinbach had told me she was home at eleven, and Mrs. Mulcahy said otherwise.")
  // is the same thing a line before. It goes, and the card after it with it.
  if (ctx.situ?.page === 'put' && paras.flat().some((x) => x.kind === 'fact' && x.relation === 'collides' && x.voice === 'exchange' && /\byou (?:told me|said)\b/i.test(x.text))) {
    for (const it of items) if (it.slot === 'why-here') drop(it, paras);
  }
  for (const it of items) {
    if (it.slot === 'why-here' && it.sit?.lead && !it.tex && it.text.trim() && it.text !== it.sit.lead) {
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
    // (Nor a pronoun the sentence before could lend to somebody else: "with her back to the room".)
    const alt = it.alts().find((a) => similesIn(a.text) === 0 && wordsIn(stripMarks(a.text)) <= Math.min(18, n - 1) && !/\b(?:he|him|his|she|her)\b/i.test(stripMarks(a.text)));
    if (!alt) continue;
    alt.take();
    it.text = alt.text;
    it.alts = undefined;
  }
  // The one joke or flourish: a callback when one is due, else the page's joke. (On a page that asks,
  // the ask is the staging line: a joke dealt on the staging or the ask isn't the page's joke there,
  // or the ask would go and the answer would answer nothing.)
  const asks = ASKING.has(ctx.situ?.page ?? '') && items.some((it) => roleOf(it) === 'ask');
  const funny = items.filter((it) => {
    const r = roleOf(it);
    // (A staging line with a simile in it is a flourish too: "A missing thing leaves a gap in a room,
    // the way a pulled tooth leaves one in a smile.")
    return r === 'flourish' || r === 'atmosphere' || r === 'close' || r === 'callback' || (!asks && (r === 'staging' || r === 'ask') && (isJoke(it) || similesIn(stripMarks(it.text)) > 0 || /, the way an? /.test(stripMarks(it.text))));
  });
  // (A line that stays whatever it is, the visitor coming in, and is a joke as dealt: the page's joke.)
  if (items.some((it) => it.slot === 'arrival' && it.tex === 'keep' && isJoke(it))) spent.joke = true;
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
  // (An ask that names nobody, "Mrs. Nagy saw you here at nine. Tell me about the rest.", on a page where
  // nothing else says whom I'm asking: the staging line that names them stays too.)
  const subject = ctx.situ?.subject ? ctx.c.people.find((p) => p.id === ctx.situ?.subject) : undefined;
  const says = (it: Item) => !!subject && stripMarks(it.text).includes(subject.short);
  const nobodyNamed = asking && !!keep && !!subject && !says(keep) && !items.some((it) => it !== keep && (it.slot === 'why-here' || it.tex === 'keep') && it.text.trim() && says(it));
  // (One with their pronoun will do: the reference pass says a first mention as the name.)
  const also = nobodyNamed ? (stage.find((it) => it !== keep && it.text.trim() && says(it)) ?? stage.find((it) => it !== keep && it.text.trim() && (it.about ?? []).includes(subject.id) && /\b(?:he|him|his|she|her)\b/i.test(stripMarks(it.text)))) : undefined;
  for (const it of stage) if (it !== keep && it !== joke && it !== also) drop(it, paras);
  if (keep || jokeStages) spent.staging = true;
  leadIn(paras, ctx, spent);
  foldPointer(paras, ctx);
  // What went is out of the paragraphs, so what's left stands side by side for the rhythm.
  for (const ps of paras) for (let k = ps.length - 1; k >= 0; k--) if ((ps[k] as Item).kind === 'gap' && !(ps[k] as Item).text.trim()) ps.splice(k, 1);
  ctx.tex = spent;
}
