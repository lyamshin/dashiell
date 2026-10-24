/**
 * docs/59 items 1 and 7: the page's last look before it's laid out, after the reference and the
 * rhythm. Each rule makes the page say a thing once; none adds a word.
 *
 * - **A thought that says nothing new goes.** A fact of the thought whose propositions earlier facts
 *   on the page have all said (`factAtoms`), or one sentence of which shares five content words with
 *   a sentence the page said before it, is dropped: the face put to them has just said it, or the
 *   answer has.
 * - **Texture that says a fact again is traded or goes.** A sentence of texture sharing five content
 *   words with a fact sentence on the page takes one of the cards that fitted its draw as well; with
 *   none, an aside, a hand-off or a close goes, and anything else stays (a staging or an arrival keeps
 *   the room in order).
 * - **One simile frame a page.** After the page's first, a piece of texture with another takes a card
 *   that fitted as well and has none; with none, the simile is taken off the sentence ("…, eating it
 *   slowly, like somebody paying by the bite" is "…, eating it slowly"), or a sentence that is only a
 *   simile ("The way you touch a sore tooth.") goes.
 */

import type { PlanCtx } from './index.js';
import type { Item } from './types.js';
import { sentencesOf } from './sentences.js';
import { stripMarks } from './refer.js';
import { contentWords, factAtoms, sharedContent, saysAgain, SAME_WORDS, STOP_WORDS } from './once.js';
import { similesIn } from '../tics.js';

/** Slots whose texture may go when it says a fact again and nothing else fits. */
const DROPPABLE = new Set(['gloss', 'hand-off', 'close']);

/** A sentence's narration: its quotations taken out. */
const narr = (t: string): string => stripMarks(t).replace(/“[^”]*”?/g, ' ');

/** The things in my hands and on my head: a page's gestures use each once. */
const HAND_PROPS = /\b(pencil|notebook|hat|cigarette|matches|handkerchief|gloves)\b/gi;
const propsIn = (t: string): string[] => [...narr(t).matchAll(HAND_PROPS)].map((m) => (m[1] as string).toLowerCase());

/** Words that go with a verb and say no act of their own: "took off my hat" is "took my hat off". */
const PARTICLES = new Set(['off', 'up', 'down', 'out', 'in', 'on', 'over', 'back', 'away', 'round', 'around', 'aside']);

/**
 * What a narration sentence of mine does, folded: its first four words ("i wrote it down"), and its
 * verb with the first thing it's done to ("took hat", for "I took my hat off" and "I took off my hat
 * and began…"). The same act twice on a page is the page doing it again.
 */
const actsOf = (t: string): string[] => {
  const w = narr(t).trim().toLowerCase().replace(/[^a-z’' ]+/g, ' ').split(/\s+/).filter(Boolean);
  if (w[0] !== 'i' || w.length < 3) return [];
  const out = w.length >= 4 ? [w.slice(0, 4).join(' ')] : [];
  const obj = w.slice(2, 6).find((x) => !PARTICLES.has(x) && !STOP_WORDS.has(x));
  if (obj) out.push(`${w[1]} ${obj}`);
  return out;
};

/** The simile clause a sentence ends on, or a sentence that is only one: what comes off. */
const TRAILING_SIMILE = /,? (?:like (?:a|an|somebody|someone|the) |as if |as though |the way (?:you’d |you |people |a man |a woman |men |women |somebody |someone |everybody |anybody |(?:other|most|some) (?:men|women|people) ))[^.;:!?“”]*(?=[.!?]$)/i;
const ONLY_SIMILE = /^(?:The way|Like|As if|As though)\b[^“”]*[.!?]$/;

export function sayOnce(paras: Item[][], ctx: PlanCtx): void {
  void ctx;
  const items = paras.flat();
  // The sentences said so far on the page, in order, with the item each belongs to.
  const before = (it: Item): string[] => {
    const out: string[] = [];
    for (const x of items) {
      if (x === it) break;
      if (!x.text.trim()) continue;
      out.push(...sentencesOf(stripMarks(x.text)));
    }
    return out;
  };
  // 1. A thought's fact that says nothing new.
  for (const it of items) {
    if (it.kind !== 'fact' || it.beat !== 'thought' || !it.text.trim()) continue;
    const earlierFacts = items.slice(0, items.indexOf(it)).filter((x) => x.kind === 'fact' && x.text.trim());
    const said = new Set(earlierFacts.flatMap((x) => (x.props ?? []).flatMap(factAtoms)));
    const mine = (it.props ?? []).flatMap(factAtoms);
    const allSaid = mine.length > 0 && mine.every((a) => said.has(a));
    const prior = before(it);
    const echoes = sentencesOf(stripMarks(it.text)).some((s) => saysAgain(s, prior));
    if (allSaid || echoes) it.text = '';
  }
  // (docs/62, docs/60 §6: an aside that says what the fact before it did, "That much held.", goes with
  // it: never standing alone after its agreement went as said once.)
  for (const ps of paras) {
    let prev: Item | undefined;
    for (const it of ps) {
      if (it.hangs && it.text.trim() && (!prev || prev.kind !== 'fact')) {
        it.text = '';
        it.alts = undefined;
      }
      if (it.text.trim()) prev = it;
    }
  }
  // 2. Texture that says a fact again, or another piece of texture before it; or does again what the
  // page has just done ("I wrote it down. Writing things down is what I do…" and then "I wrote it down
  // as given and put the pencil behind my ear").
  const wordsOf = (xs: Item[]) => xs.filter((x) => x.text.trim()).flatMap((x) => sentencesOf(stripMarks(x.text)).map((s) => contentWords(s)));
  for (const it of items) {
    if (it.kind !== 'gap' || it.speech || !it.text.trim()) continue;
    const i = items.indexOf(it);
    const fw = wordsOf([...items.filter((x) => x.kind === 'fact'), ...items.slice(0, i).filter((x) => x.kind === 'gap')]);
    const done = new Set(before(it).flatMap(actsOf));
    // (And a thing in my hands said once: "…and I put my pencil between them" and then "I asked, and found my pencil".)
    const held = new Set(items.slice(0, i).filter((x) => x.kind === 'gap' && x.text.trim()).flatMap((x) => propsIn(x.text)));
    const echo = (t: string) => sentencesOf(stripMarks(t)).some((s) => actsOf(s).some((a) => done.has(a)) || propsIn(s).some((x) => held.has(x)) || fw.some((f) => sharedContent(contentWords(s), f).length >= SAME_WORDS));
    if (!echo(it.text)) continue;
    const alt = it.alts?.().find((a) => !echo(a.text));
    if (alt) {
      alt.take();
      it.text = alt.text;
      it.alts = undefined;
    } else if (DROPPABLE.has(it.slot ?? '')) it.text = '';
  }
  // 3. One simile frame a page: a fact's or a speech's can't change, so they count first; then the texture's, in order.
  // (A page's section after the turn counts the section before it.)
  let seen = similesIn(ctx.pageSoFar ?? '') + items.filter((x) => x.text.trim() && (x.kind !== 'gap' || x.speech)).reduce((n, x) => n + similesIn(x.text), 0);
  for (const it of items) {
    if (!it.text.trim() || it.kind !== 'gap' || it.speech) continue;
    const n = similesIn(it.text);
    if (n === 0) continue;
    if (seen === 0 && n === 1) {
      seen = 1;
      continue;
    }
    const room = seen === 0 ? 1 : 0;
    const alt = it.alts?.().find((a) => similesIn(a.text) <= room);
    if (alt) {
      alt.take();
      it.text = alt.text;
      it.alts = undefined;
      seen += similesIn(alt.text);
      continue;
    }
    // Off the sentence, or the sentence goes (the page's first stays).
    const out: string[] = [];
    for (const x of sentencesOf(it.text)) {
      const k = similesIn(x);
      if (k === 0) {
        out.push(x);
        continue;
      }
      if (seen === 0 && k === 1) {
        out.push(x);
        seen = 1;
        continue;
      }
      if (ONLY_SIMILE.test(narr(x).trim())) continue;
      const cut = x.replace(TRAILING_SIMILE, '');
      out.push(similesIn(cut) === 0 && /[.!?]$/.test(cut) && cut.split(/\s+/).length >= 4 ? cut : x);
    }
    it.text = out.join(' ');
    it.alts = undefined;
  }
}
