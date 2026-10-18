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
import { contentWords, factAtoms, sharedContent, SAME_WORDS } from './once.js';
import { similesIn } from '../tics.js';

/** Slots whose texture may go when it says a fact again and nothing else fits. */
const DROPPABLE = new Set(['gloss', 'hand-off', 'close']);

/** A sentence's narration: its quotations taken out. */
const narr = (t: string): string => stripMarks(t).replace(/“[^”]*”?/g, ' ');

/** The simile clause a sentence ends on, or a sentence that is only one: what comes off. */
const TRAILING_SIMILE = /,? (?:like (?:a|an|somebody|someone|the) |as if |as though |the way (?:you’d |you |people |a man |a woman |somebody |someone |everybody |anybody ))[^.;:!?“”]*(?=[.!?]$)/i;
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
    const prior = before(it).map((s) => contentWords(s));
    const echoes = sentencesOf(stripMarks(it.text)).some((s) => {
      const w = contentWords(s);
      return prior.some((p) => sharedContent(w, p).length >= SAME_WORDS);
    });
    if (allSaid || echoes) it.text = '';
  }
  // 2. Texture that says a fact again, or another piece of texture before it.
  const wordsOf = (xs: Item[]) => xs.filter((x) => x.text.trim()).flatMap((x) => sentencesOf(stripMarks(x.text)).map((s) => contentWords(s)));
  for (const it of items) {
    if (it.kind !== 'gap' || it.speech || !it.text.trim()) continue;
    const i = items.indexOf(it);
    const fw = wordsOf([...items.filter((x) => x.kind === 'fact'), ...items.slice(0, i).filter((x) => x.kind === 'gap')]);
    const echo = (t: string) => sentencesOf(stripMarks(t)).some((s) => fw.some((f) => sharedContent(contentWords(s), f).length >= SAME_WORDS));
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
