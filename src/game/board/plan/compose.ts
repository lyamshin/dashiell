/**
 * docs/49, Planner 2: composition. The thought's facts joined by what they do
 * to each other, so that a thought of N facts reads as at most ceil(N/2)
 * sentences, not a list of N:
 *
 * - **Two people one list confirms** are one sentence: "Mrs. Szabo had Glick
 *   here at ten, same as he said, and with him Mrs. Blau."
 * - **Who could get at the means** is said of the person, where another fact
 *   names them: "…and with him Mrs. Blau, who hadn’t been at the flats over
 *   Lipsky’s while the rat poison was on the cellar shelf."
 * - **The window narrowed** is one sentence, and at a walk it gets its "so":
 *   "Mrs. Greco had said nine or ten, and Belkin was still alive here at nine,
 *   so it was ten." Above a walk the two stay side by side, without the "so"
 *   (docs/46 §2).
 * - **An evening that held where I could check it, and the hour that mattered
 *   on their word alone**, are one sentence with the page's "but".
 * - **A collision's two lines** are one sentence when the page's "but" has
 *   gone already: "…, and Mrs. Blau passed her on East Houston Street at ten:
 *   one of them was wrong."
 * - The rest join side by side where the second opens on a clause of its own:
 *   ", and", or a semicolon once a page; never past forty words, never a
 *   sentence with two joins in it already.
 *
 * Nothing a fact carries changes: a joined unit carries what both carried, and
 * says how many facts it holds (`Item.n`). The detective's aside after a fact
 * (a gloss) goes after the sentence its fact went into; the aside after an
 * agreement ("So far as it went, it stood up.") is what the "but" says, and
 * goes.
 */

import { pronOf, type BoardCase } from '../model.js';
import type { Item } from './types.js';
import type { PlanCtx } from './index.js';
import { markPronoun } from './refer.js';
import { herIsObject } from './measure.js';
import { sentencesOf, wordsIn } from './sentences.js';

/** The longest sentence composition makes. */
const LONGEST = 40;

/** A fact and the asides that came after it. */
interface Seg {
  fact: Item;
  glosses: Item[];
}

const ruleOf = (x: Item): string => (x.tag?.startsWith('thought:') ? x.tag.slice('thought:'.length) : '');

function isThoughtFact(x: Item): boolean {
  return x.kind === 'fact' && x.voice === 'thought' && x.beat === 'thought';
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "The", "By", "He" go lower case after a comma; "I", a name and "Mrs." keep their capitals. */
export function lowerFirst(s: string): string {
  if (LOWER.test(s)) return (s[0] as string).toLowerCase() + s.slice(1);
  return s;
}

/** The words a sentence opens on that go lower case after a comma or a semicolon: never a name. */
export const LOWER = /^(?:He|She|It|They|We|You|There|Nobody|Somebody|Everybody|Anybody|Nothing|Everything|That|This|The|A|An|His|Her|My|Their|Its|Every|Each|No|Some|All|Both|Most|One|By|For|At|In|On|Under|Over|Behind|Above|Below|Through|Outside|Inside|Across|Along|Beside|Near|Upstairs|Downstairs|Somewhere|Overhead|Down|Up|Whatever|Whoever|Whether|If|When|Fewer|Plenty|Two|Three|Like|As|Just|With|Past|Which|Then|Once)\b/;

/** The narration of a sentence, its marks taken out. */
function plain(t: string): string {
  return t.replace(/⁣\d+⁤/g, '');
}

/**
 * Clauses a sentence has joined already: ", but", a semicolon, a colon, and ", and" before a clause
 * of its own ("…, and Russo hadn’t"), not before a list's next item ("…, and at seven, with Amato").
 */
function joined(t: string): number {
  const p = plain(t).replace(/“[^”]*”/g, ' ');
  const and = /, and (?:I|he|she|they|it|there|nobody|somebody|everybody|(?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+(?: and (?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+)? (?:had|hadn’t|was|wasn’t|were|weren’t|said|says|passed|put|heard|never|did|didn’t))\b/g;
  return (p.match(/, but |; |: /g) ?? []).length + (p.match(and) ?? []).length;
}

/**
 * Whether a sentence opens on a clause the planner may run on after ", and": a subject and its verb
 * near the front, or a short lead ("By her count,", "For ten,") and then one.
 */
function runsOn(t: string, c: BoardCase): boolean {
  const p = plain(t);
  if (/^(?:So|But|And|Then|Here’s|That left|Like|As if|Which)\b/.test(p)) return false;
  if (/^(?:By [^,]+ count|For [^,]+|At [^,]+|If [^,]+|Whatever [^,]+), /.test(p)) return true;
  const names = c.people.filter((x) => !x.object && x.short.length > 2).map((x) => esc(x.short));
  const subject = new RegExp(`^(?:I|He|She|It|They|There|Nobody|Somebody|Everybody|That|This|Fewer|Plenty|The [a-z]+|A [a-z]+${names.length ? `|${names.join('|')}` : ''})\\b`);
  if (!subject.test(p)) return false;
  return /\b(?:was|were|had|hadn’t|wasn’t|weren’t|did|didn’t|said|says|put|passed|heard|never|could|would|is|isn’t|takes|came|went|saw|told|kept|lived)\b/.test(p.split(/\s+/).slice(1, 8).join(' '));
}

function single(t: string): boolean {
  return sentencesOf(plain(t)).length === 1 && /\.$/.test(t.trim()) && !/[“”]/.test(t);
}

/** Two facts become one item: the text given, and what both carried. */
function merge(a: Item, b: Item, text: string, join?: string): void {
  a.text = text;
  a.carries = [...new Set([...(a.carries ?? []), ...(b.carries ?? [])])];
  a.about = [...new Set([...(a.about ?? []), ...(b.about ?? [])])];
  if ((a.relation ?? 'new') === 'new' && b.relation && b.relation !== 'new') a.relation = b.relation;
  a.n = (a.n ?? 1) + (b.n ?? 1);
  a.joined = join ?? a.joined ?? b.joined;
  a.composed = true;
  a.alts = undefined;
  a.agg = undefined;
}

/** A person's pronouns, marked with whom they mean, for the planner's reference. */
function pr(c: BoardCase, p: string): { he: string; him: string; his: string } {
  const x = pronOf(c, p);
  const m = markPronoun(c, p);
  return { he: x.he + m, him: x.him + m, his: x.his + m };
}

function nameOfIn(c: BoardCase, id: string): string {
  return c.people.find((p) => p.id === id)?.short ?? id;
}

/** People of `p`'s sex named in `text`, other than `p`. */
function sameSexIn(c: BoardCase, p: string, text: string): string[] {
  const female = pronOf(c, p).he === 'she';
  return c.people.filter((x) => x.id !== p && !x.object && (pronOf(c, x.id).he === 'she') === female && new RegExp(`\\b${esc(x.short)}\\b`).test(text)).map((x) => x.id);
}

/**
 * The fact said as one sentence, where the engine wrote it as two: the window and its sighting, the
 * street's lead and its link, a collision's two lines once the page's "but" has gone.
 */
function oneSentence(it: Item, ctx: PlanCtx): void {
  const a = it.agg;
  const rule = ruleOf(it);
  if (rule === 'window' && a?.key === 'window') {
    const d = a.data as { one: string; so: boolean };
    // At a walk the "so" is the page's; when it went to an earlier fact, the two sentences stay.
    if (d.so && !/(?:^|[.!?]\s+)So\b/.test(it.text)) return;
    it.text = d.one;
    if (d.so) it.joined = 'so';
    it.composed = true;
    return;
  }
  if (rule === 'street' && a?.key === 'street') {
    const d = a.data as { lead: string; link: string };
    it.text = `${d.lead}: ${d.link}`;
    it.composed = true;
    return;
  }
  if (rule === 'way-in') {
    // Who could and who couldn't, as one: "Belkin heard about the window at eight, and Miss Moskin
    // at nine, but Glick never heard Mrs. Krantz tell the room."
    const xs = sentencesOf(it.text);
    if (xs.length === 2 && wordsIn(plain(it.text)) <= LONGEST) {
      const but = ctx.budget.but === 0 && !/, but /.test(it.text);
      it.text = `${(xs[0] as string).replace(/\.$/, '')}${but ? ', but ' : '; '}${lowerFirst(xs[1] as string)}`;
      if (but) {
        ctx.budget.but++;
        ctx.budget.joins++;
        it.joined = 'but';
      }
      it.composed = true;
    } else if (it.joined === 'aggregated') {
      // Who could, and the one who couldn't, is a contrast: "…, but Vogel hadn’t", where the page's
      // "but" is free.
      const t = it.text.replace(/, and ((?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+(?:(?:, | and )(?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+)* (?:hadn’t|wasn’t|weren’t|never did)\.)$/, ', but $1');
      if (t !== it.text && ctx.budget.but === 0) {
        it.text = t;
        it.joined = 'but';
        ctx.budget.but++;
        ctx.budget.joins++;
      }
      it.composed = true;
    }
    return;
  }
  if (rule === 'collision' && it.joined === 'two' && a?.key === 'collision') {
    const d = a.data as { p: string; claim: string; breaker: string; two: string; twos: string[] };
    const two = (sentencesOf(it.text).pop() ?? d.two).trim();
    const one = `${d.claim}, and ${d.breaker}: ${lowerFirst(two)}`;
    if (/;/.test(d.breaker) || wordsIn(plain(one)) > 34 || !clearAfter(ctx.c, d.p, d.breaker)) return;
    it.text = one;
    it.composed = true;
  }
}

/**
 * Whether the breaker's pronoun for `p` is still theirs with `p` named before it: an object after
 * the breaker's own subject is ("Mrs. Blau passed her"); a subject or a possessive, after somebody
 * of their sex, isn't ("Mrs. Mulcahy says she was…").
 */
export function clearAfter(c: BoardCase, p: string, breaker: string): boolean {
  if (sameSexIn(c, p, breaker).length === 0) return true;
  const t = plain(breaker);
  for (const m of t.matchAll(/\b(he|she|him|her|his)\b/g)) {
    const w = m[1] as string;
    if (w === 'him') continue;
    if (w === 'her' && herIsObject(t.slice((m.index ?? 0) + 3), t.slice(0, m.index ?? 0))) continue;
    return false;
  }
  return true;
}

/**
 * Two people one list confirms, one sentence: the list's agreement with somebody's own word, and the
 * same list's count of somebody else ("…, and with him Mrs. Blau").
 */
function confirmPair(segs: Seg[], ctx: PlanCtx): void {
  for (let i = 0; i + 1 < segs.length; i++) {
    const L = (segs[i] as Seg).fact;
    const P = (segs[i + 1] as Seg).fact;
    if (ruleOf(L) !== 'list-agree' || ruleOf(P) !== 'placed' || L.composed || P.composed) continue;
    const ld = L.agg?.data as { watcher: string; at: string; agreed: { p: string; h: number }[] } | undefined;
    const pd = P.agg?.data as { keeper?: string; runs: { names: string; n: number; at: string; h: number }[] } | undefined;
    if (!ld || !pd || pd.keeper !== ld.watcher || !single(L.text) || !single(P.text)) continue;
    const one = ld.agreed.length === 1 ? (ld.agreed[0] as { p: string; h: number }) : undefined;
    const sameAll = !!one && pd.runs.every((r) => r.at === ld.at && r.h === one.h);
    const hour = (h: number) => HOURS[h] ?? String(h);
    let tail: string;
    if (sameAll && one) {
      const names = pd.runs.map((r) => r.names).join(' and ');
      // "had him here too, with Teitel": "too" said it already; otherwise "and with him Mrs. Blau".
      tail = L.joined === 'too' ? `, with ${names}` : `, and with ${pr(ctx.c, one.p).him} ${names}`;
    } else {
      const bits = pd.runs.map((r) => `${r.names}${r.at === ld.at ? '' : ` ${r.at}`} at ${hour(r.h)}`);
      tail = `, and ${bits.join(' and ')}`;
    }
    const text = `${L.text.replace(/\.$/, '')}${tail}.`;
    if (wordsIn(plain(text)) > LONGEST) continue;
    merge(L, P, text, 'with');
    (segs[i] as Seg).glosses.push(...(segs[i + 1] as Seg).glosses);
    segs.splice(i + 1, 1);
  }
}

const HOURS: Record<number, string> = { 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };

/**
 * Who could get at the means, said of the one person it's about where another fact names them at
 * the end of its sentence ("…and with him Mrs. Blau, who hadn’t been at…"), or opens on them ("By
 * her count, Mrs. Blau was here at ten, and she hadn’t been at…").
 */
function accessAttach(segs: Seg[], ctx: PlanCtx): void {
  const k = segs.findIndex((s) => ruleOf(s.fact) === 'way-in' && !s.fact.composed);
  if (k < 0) return;
  const W = (segs[k] as Seg).fact;
  const d = W.agg?.data as { one?: string; of?: string } | undefined;
  if (!d?.one || !d.of || !single(W.text) || (segs[k] as Seg).glosses.length > 0) return;
  const name = nameOfIn(ctx.c, d.one);
  const nm = esc(name);
  for (let j = 0; j < segs.length; j++) {
    if (j === k) continue;
    const F = (segs[j] as Seg).fact;
    if (ruleOf(F) === 'collision' || !single(F.text) || !/[.]$/.test(F.text)) continue;
    const t = F.text;
    let text: string | undefined;
    // The name ends the sentence: a relative clause after it.
    if (new RegExp(`\\b${nm}\\.$`).test(t)) text = `${t.replace(/\.$/, '')}, who ${d.of}.`;
    // The sentence is about them: "and she…" after it, when nobody else of their sex is named in it.
    else if (new RegExp(`^(?:By [^,]+, )?${nm} (?:was|were|had)\\b`).test(plain(t)) && sameSexIn(ctx.c, d.one, t).length === 0 && joined(t) === 0) text = `${t.replace(/\.$/, '')}, and ${pr(ctx.c, d.one).he} ${d.of}.`;
    if (!text || wordsIn(plain(text)) > LONGEST) continue;
    merge(F, W, text, 'who');
    // Said where they're named, it's no longer said where it was.
    segs.splice(k, 1);
    return;
  }
}

/** An evening that held, and the hour that mattered on their word alone: one sentence, with the "but". */
function heldBut(segs: Seg[], ctx: PlanCtx): void {
  for (let i = 0; i + 1 < segs.length; i++) {
    const A = (segs[i] as Seg).fact;
    const B = (segs[i + 1] as Seg).fact;
    if (ruleOf(A) !== 'agree' || ruleOf(B) !== 'hours' || A.composed || B.composed) continue;
    if (ctx.budget.but > 0 || !single(A.text) || !single(B.text) || /^(?:So|But)\b/.test(B.text)) continue;
    const text = `${A.text.replace(/\.$/, '')}, but ${lowerFirst(B.text)}`;
    if (wordsIn(plain(text)) > LONGEST) continue;
    merge(A, B, text, 'but');
    ctx.budget.but++;
    ctx.budget.joins++;
    // The aside after the agreement ("So far as it went, it stood up.") is what the "but" says.
    (segs[i] as Seg).glosses = [...(segs[i + 1] as Seg).glosses];
    segs.splice(i + 1, 1);
  }
}

/** The rest, side by side, where they'll go: ", and", or a semicolon once a page. */
function sideBySide(segs: Seg[], ctx: PlanCtx, n: number): void {
  const budget = ctx.budget;
  const target = Math.ceil(n / 2);
  const sentences = () => segs.reduce((k, s) => k + sentencesOf(plain(s.fact.text)).length, 0);
  /** How two side by side would go, and what it costs: the joins already in them, and the length. */
  const option = (i: number): { text: string; join?: string; cost: number } | null => {
    const A = (segs[i] as Seg).fact;
    const B = (segs[i + 1] as Seg).fact;
    if (!single(A.text) || !single(B.text) || /^(?:So|But)\b/.test(plain(B.text)) || ruleOf(B) === 'collision') return null;
    const a = A.text.replace(/\.$/, '');
    const b = lowerFirst(B.text);
    let text: string | undefined;
    let join: string | undefined;
    // A collision keeps a clause of its own (docs/49 §2): after it, only a semicolon.
    if (ruleOf(A) === 'collision') {
      if ((budget.semi ?? 0) === 0 && !/;/.test(A.text + B.text) && joined(B.text) === 0) [text, join] = [`${a}; ${b}`, 'semi'];
    } else if (/^That was a hole in\b/.test(plain(A.text)) && /^If it held\b/.test(plain(B.text)) && budget.but === 0) {
      // The hole, and the story owned up to in its place: "but if it held, …".
      [text, join] = [`${a}, but ${b}`, 'but'];
    } else if (ruleOf(B) === 'street' && A.relation === 'confirms' && budget.but === 0 && joined(A.text) === 0) {
      // A confirmed evening, and the thing worth keeping after it: "but".
      [text, join] = [`${a}, but ${b}`, 'but'];
    } else if (joined(A.text) + joined(B.text) === 0 && runsOn(B.text, ctx.c)) {
      text = `${a}, and ${b}`;
    } else if ((budget.semi ?? 0) === 0 && joined(A.text) + joined(B.text) <= 2 && !/;/.test(A.text + B.text) && (runsOn(B.text, ctx.c) || ruleOf(B) === 'street' || ruleOf(B) === 'hours')) {
      [text, join] = [`${a}; ${b}`, 'semi'];
    }
    if (!text || wordsIn(plain(text)) > LONGEST) return null;
    // The plainest join first: fewest joins already in the two, a semicolon last, then the shorter.
    return { text, ...(join ? { join } : {}), cost: (joined(A.text) + joined(B.text)) * 20 + (join === 'semi' ? 30 : 0) + wordsIn(plain(text)) };
  };
  while (sentences() > target) {
    let best: { i: number; text: string; join?: string; cost: number } | null = null;
    for (let i = 0; i + 1 < segs.length; i++) {
      const o = option(i);
      if (o && (!best || o.cost < best.cost)) best = { i, ...o };
    }
    if (!best) return;
    const { i, text, join } = best;
    const A = (segs[i] as Seg).fact;
    const B = (segs[i + 1] as Seg).fact;
    if (join === 'but') {
      budget.but++;
      budget.joins++;
    }
    if (join === 'semi') budget.semi = (budget.semi ?? 0) + 1;
    merge(A, B, text, join === 'semi' ? undefined : join);
    // The asides come after the sentence both facts went into; an agreement's ("So far as it went,
    // it stood up.") is what the join says, and goes.
    (segs[i] as Seg).glosses = [...(ruleOf(A) === 'agree' ? [] : (segs[i] as Seg).glosses), ...(segs[i + 1] as Seg).glosses];
    segs.splice(i + 1, 1);
  }
}

/**
 * Compose the thought beat's facts, in place. Items before the first fact (an arrival's aside) and
 * after the thought (somebody who turned out to be in the room) stay where they are.
 */
export function compose(items: Item[], ctx: PlanCtx): Item[] {
  const first = items.findIndex(isThoughtFact);
  if (first < 0) return items;
  const head = items.slice(0, first);
  const segs: Seg[] = [];
  const tail: Item[] = [];
  for (const it of items.slice(first)) {
    if (isThoughtFact(it)) segs.push({ fact: it, glosses: [] });
    else if (it.kind === 'gap' && it.slot === 'gloss' && tail.length === 0 && segs.length) (segs[segs.length - 1] as Seg).glosses.push(it);
    else tail.push(it);
  }
  const n = segs.reduce((k, s) => k + (s.fact.n ?? 1), 0);
  for (const s of segs) oneSentence(s.fact, ctx);
  confirmPair(segs, ctx);
  accessAttach(segs, ctx);
  heldBut(segs, ctx);
  sideBySide(segs, ctx, n);
  const out = [...head, ...segs.flatMap((s) => [s.fact, ...s.glosses]), ...tail];
  // The thought is one paragraph: everything after its first item runs on.
  const at = out.indexOf((segs[0] as Seg).fact);
  out.forEach((x, i) => {
    if (i > at && x.beat === 'thought' && (isThoughtFact(x) || (x.kind === 'gap' && x.slot === 'gloss'))) x.runOn = true;
  });
  return out;
}
