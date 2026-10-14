/**
 * docs/49 §2, connectives from the logic. The engine knows what each fact
 * does; the join says it.
 *
 * | relation | joins |
 * |---|---|
 * | confirms | "which was what Coffin had", "same as she said", "and Ellery would swear to it" |
 * | collides | "But…", "One of them was wrong.", "Two stories, and only one could stand." |
 * | narrows | "So it was ten.", "That left two." (Raw only, docs/46) |
 * | new | plain, no join |
 *
 * A page has at most one "so" chain and one "but"; the rest is plain. A
 * collision takes one join, not two: with the page's "but" free it's one
 * sentence ("Corrigan said home at eleven, but Ashby passed her on Stuyvesant
 * Street at eleven."); otherwise the two lines side by side and the short
 * join after them. A join that would put a pronoun where it could be read
 * as somebody else is passed over for one that doesn't.
 */

import { andList, hourWord, nameOf, pronOf, type Hour } from '../model.js';
import type { Item } from './types.js';
import type { PlanCtx } from './index.js';
import { markPronoun } from './refer.js';

export interface PageBudget {
  but: number;
  so: number;
  joins: number;
}

function cap(s: string): string {
  return s ? (s[0] as string).toUpperCase() + s.slice(1) : s;
}

function words(t: string): number {
  return t.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length;
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** People of `p`'s sex named in `text`, other than `p`. */
function sameSexIn(ctx: PlanCtx, p: string, text: string): string[] {
  const female = pronOf(ctx.c, p).he === 'she';
  return ctx.c.people.filter((x) => x.id !== p && !x.object && pronOf(ctx.c, x.id).he === (female ? 'she' : 'he') && new RegExp(`\\b${esc(x.short)}\\b`).test(text)).map((x) => x.id);
}

/** A person's pronouns, marked with whom they mean, for the planner's reference. */
function pr(ctx: PlanCtx, p: string): { he: string; him: string; his: string } {
  const x = pronOf(ctx.c, p);
  const m = markPronoun(ctx.c, p);
  return { he: x.he + m, him: x.him + m, his: x.his + m };
}

/** The sentences of a fact that open on "So" or "But": a join, whoever wrote it. */
function opensOn(text: string, word: 'So' | 'But'): boolean {
  return new RegExp(`(?:^|[.!?]\\s+)${word}\\b`).test(text.replace(/“[^”]*”/g, ' '));
}

/** "So the gun came from Rafferty’s" → "The gun came from Rafferty’s": the join taken off. */
function dropOpener(text: string, word: 'So' | 'But'): string {
  return text.replace(new RegExp(`(^|[.!?]\\s+)${word},? (\\S)`), (_m, a: string, b: string) => `${a}${b.toUpperCase()}`);
}

export function connect(items: Item[], ctx: PlanCtx): void {
  const b = ctx.budget;
  items.forEach((it, i) => {
    if (it.kind !== 'fact') return;
    const a = it.agg;
    const before = items
      .slice(0, i)
      .filter((x) => x.kind === 'fact')
      .map((x) => x.text)
      .join(' ');
    if (a?.key === 'collision') {
      const d = a.data as { p: string; claim: string; breaker: string; twos: string[]; two: string; subtle?: boolean };
      const one = `${d.claim}, but ${d.breaker}.`;
      // One sentence only when its pronouns stay clear: "Steinbach said home, but Mrs. Mulcahy says
      // she was…" has two women before the "she".
      const clash = sameSexIn(ctx, d.p, d.breaker).length > 0 && /\b(?:he|she|him|her|his)\b/.test(d.breaker.replace(/⁣\d+⁤/g, ''));
      if (b.but === 0 && words(one) <= 26 && !/;/.test(d.breaker) && !clash && !d.subtle) {
        it.text = one;
        it.joined = 'but';
        b.but++;
        b.joins++;
        return;
      }
      // Two lines side by side, and one short join: never "him" where the breaker named another man.
      const clash2 = sameSexIn(ctx, d.p, d.breaker).length > 0;
      const ok = d.twos.filter((t) => !(clash2 && /\b(him|her|his)⁣/.test(t)));
      const two = ok.includes(d.two) ? d.two : (ok[0] ?? d.two);
      it.text = `${d.claim}. ${cap(d.breaker)}. ${two}`;
      it.joined = 'two';
      b.joins++;
      return;
    }
    if (a?.key === 'agree') {
      const d = a.data as { p: string; bits: string; src: string; parts?: { at: string; hs: string; comp: string }[] };
      // One place at two hours with different company is said once: "the Lyric at nine, with Doyle,
      // and at eight", not "the Lyric at nine, with Doyle and the Lyric at eight".
      const [p0, p1] = d.parts ?? [];
      if (p0 && p1 && d.parts?.length === 2 && p0.at === p1.at) d.bits = `${p0.at} at ${p0.hs}${p0.comp ? `, with ${p0.comp},` : ''} and at ${p1.hs}${p1.comp ? `, with ${p1.comp}` : ''}`;
      // Not "So" before a line that opens on it ("So far as it went, it stood up.").
      const next = items[i + 1];
      if (b.so === 0 && !(next && /^So\b/.test(next.text))) {
        it.text = `So ${d.bits}, which was what ${d.src}.`;
        it.joined = 'so';
        b.so++;
      } else {
        it.text = `${cap(d.bits)}, which was what ${d.src}.`;
        it.joined = 'which';
      }
      b.joins++;
      return;
    }
    if (a?.key === 'agree-rest') {
      const d = a.data as { p: string; src: string; parts: { at: string; h: number; hs?: number[]; comp: string }[] };
      const [q0, q1] = d.parts;
      // One place at two hours with different company is said once: "at the flats over Lipsky’s at
      // eight, with Mrs. Greco, and at nine".
      const bits =
        q0 && q1 && d.parts.length === 2 && q0.at === q1.at
          ? `${q0.at} at ${hourWord(q0.h as Hour)}${q0.comp ? `, with ${q0.comp},` : ''} and at ${hourWord(q1.h as Hour)}${q1.comp ? `, with ${q1.comp}` : ''}`
          : andList(d.parts.map((y) => `${y.at} at ${andList((y.hs ?? [y.h]).map((h) => hourWord(h as Hour)))}${y.comp ? `, with ${y.comp}` : ''}`)).replace(/(\w), (with [^,]+) and (here|at|home)\b/, '$1, $2, and $3');
      const p = pr(ctx, d.p);
      // After a collision that named somebody of their sex, "same as she said" could be either
      // of them: the evening is theirs by name, and the join is the holding.
      if (sameSexIn(ctx, d.p, `${before} ${d.src}`).length > 0) {
        it.text = `The rest of ${nameOf(ctx.c, d.p)}’s evening held where I could check it: ${d.src} had ${p.him} ${bits}.`;
        it.joined = 'held';
      } else {
        it.text = `The rest held where I could check it: ${d.src} had ${p.him} ${bits}, same as ${p.he} said.`;
        it.joined = 'same';
      }
      b.joins++;
      return;
    }
    if (a?.key === 'list-agree') {
      const d = a.data as { watcher: string; at: string; agreed: { p: string; h: number }[]; clear: boolean };
      if (d.agreed.length === 1) {
        const y = d.agreed[0] as { p: string; h: number };
        const p = pr(ctx, y.p);
        const W = nameOf(ctx.c, d.watcher);
        if (pronOf(ctx.c, d.watcher).he === pronOf(ctx.c, y.p).he) {
          // "Prentiss had Marchetti here at ten, same as she said": she could be either.
          it.text = `${nameOf(ctx.c, y.p)} had told me ${d.at} at ${hourWord(y.h as Hour)}, and ${W} had ${p.him} ${d.at === 'here' ? 'here' : 'there'} too.`;
          it.joined = 'too';
        } else {
          it.text = `${W} had ${d.clear ? p.him : nameOf(ctx.c, y.p)} ${d.at} at ${hourWord(y.h as Hour)}, same as ${p.he} said.`;
          it.joined = 'same';
        }
        b.joins++;
        return;
      }
    }
    if (a?.key === 'hours') {
      // What they said for the hours that mattered, plain (no join: it's new), said one of two ways
      // so two pages don't say it word for word.
      const d = a.data as { p: string; hs: string; n: number; what: string; named: boolean };
      const who = d.named ? nameOf(ctx.c, d.p) : pr(ctx, d.p).he;
      const hours = `the ${d.n > 1 ? 'hours' : 'hour'} that mattered`;
      // (Not "He said the flats at nine and the Peacock at ten for nine and ten": hours said twice.)
      const shapes = [(x: string) => `For ${d.hs}, ${hours}, ${x} said ${d.what}.`, ...(d.what.includes(',') || / at (?:seven|eight|nine|ten|eleven|twelve|midnight)\b/.test(d.what) ? [] : [(x: string) => `${cap(x)} said ${d.what} for ${d.hs}, ${hours}.`])];
      const forms = shapes.map((f) => f(who));
      // Not a shape an earlier page said word for word, with the name or with "he".
      const fresh = shapes.filter((f) => ![nameOf(ctx.c, d.p), pronOf(ctx.c, d.p).he].some((x) => ctx.said?.has(f(x))));
      it.text = fresh.length === 1 ? (fresh[0] as (x: string) => string)(who) : ctx.pick('hours-form', forms);
      it.alts = () => forms.filter((f) => f !== it.text).map((f) => ({ text: f, take: () => {} }));
      return;
    }
    if (a?.key === 'placed') {
      // The one who gave their word says it, as the subject: "He put Tillman here at ten." The keeper
      // of a list counts: "By her count, Margolis and Grasso were here at ten."
      const d = a.data as { self?: string; keeper?: string; bits: string[]; runs: { names: string; n: number; at: string; h: number }[] };
      if (d.bits.some((x) => /⁣/.test(x))) return;
      if (d.self) {
        it.text = `${cap(pr(ctx, d.self).he)} put ${andList(d.bits)}.`;
        it.joined = 'self';
        // Where "he" would be read as somebody else, the same fact without them in it.
        const plain = `${cap(andList(d.runs.map((r) => `${r.names} ${r.n > 1 ? 'were' : 'was'} ${r.at} at ${hourWord(r.h as Hour)}`)))}, by the same account.`;
        it.alts = () => [{ text: plain, take: () => {} }];
      } else if (d.keeper) {
        it.text = `By ${pr(ctx, d.keeper).his} count, ${andList(d.runs.map((r) => `${r.names} ${r.n > 1 ? 'were' : 'was'} ${r.at} at ${hourWord(r.h as Hour)}`))}.`;
        it.joined = 'count';
      }
      return;
    }
    // Whoever wrote it: a page has one "so" chain and one "but".
    if (opensOn(it.text, 'So')) {
      if (b.so > 0) it.text = dropOpener(it.text, 'So');
      else {
        b.so++;
        b.joins++;
        it.joined ??= 'so';
      }
    }
    if (opensOn(it.text, 'But')) {
      if (b.but > 0) it.text = dropOpener(it.text, 'But');
      else {
        b.but++;
        b.joins++;
        it.joined ??= 'but';
      }
    }
  });
}
