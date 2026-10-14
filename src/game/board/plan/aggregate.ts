/**
 * docs/49 §2, aggregation: facts that share a predicate become one sentence.
 *
 * - A watcher's hour and its "nobody else": "Ten, Feeney. Nobody else." is
 *   "Ten, Feeney, and nobody else."
 * - The notebook said aloud: people placed on one person's word go in one
 *   sentence ("Coffin had Feeney at the Thalia at ten and Ashby at eleven"),
 *   and so do the evenings nobody else has spoken for.
 * - The rest of an evening that held: one place at two hours is said once
 *   ("at Mrs. Nagy’s at eight and nine").
 *
 * The rules: four at most; the exception last; never across the crime hour
 * and another hour (the hour the player has to notice stays apart); and never
 * a fact the player must notice on its own (a collision stays its own
 * sentence: `Agg.alone`).
 */

import { andList } from '../model.js';
import { solveRun } from '../knowledge.js';
import type { Item } from './types.js';
import type { PlanCtx } from './index.js';

/** The most facts one sentence carries. */
const MOST = 4;

/** Keep an answer line's quotation marks where they were. */
function inQuotes(old: string, said: string): string {
  return `${old.startsWith('“') ? '“' : ''}${said}${old.endsWith('”') ? '”' : ''}`;
}

/** One item said its aggregated way, alone (a watcher's hour and its "nobody else"). */
function alone(it: Item): Item {
  const a = it.agg;
  if (!a) return it;
  if (a.key === 'list-hour') {
    const d = a.data as { when: string; names: string; whole: boolean; nobody: string };
    if (!d.whole) return it;
    const tail = /at all/.test(d.nobody) ? 'nobody else at all' : /that hour/.test(d.nobody) ? 'nobody else that hour' : 'nobody else';
    return { ...it, text: inQuotes(it.text, `${d.when}, ${d.names}, and ${tail}.`), joined: 'nobody else' };
  }
  return it;
}

/** The crime hour, when the player holds it; otherwise null. */
function crimeHour(ctx: PlanCtx): number | null {
  const s = ctx.run ? solveRun(ctx.c, ctx.run) : undefined;
  return s && s.possibleHours.length === 1 ? (s.possibleHours[0] as number) : null;
}

/** Whether facts at these hours may share a sentence: all at the crime hour, or none of them. */
function sameSide(hours: number[], hc: number | null): boolean {
  if (hc === null) return true;
  const at = hours.map((h) => h === hc);
  return at.every((x) => x === at[0]);
}

/** The hours a notebook clause is about. */
function hoursOf(it: Item): number[] {
  const cl = (it.agg?.data as { clause?: { hours: number[] } } | undefined)?.clause;
  return cl?.hours ?? (it.hour !== undefined ? [it.hour] : []);
}

/** The notebook's placements, parsed back: "Feeney was at the Thalia at ten and eleven; Coffin said so." */
function placed(it: Item): { who: string; at: string; by: string } | null {
  if (it.agg?.key !== 'clause:placed') return null;
  const m = /^(?:(Here’s what I had\.) )?(.+?) was at (.+?); (.+?) said so\.$/.exec(it.text);
  if (!m) return null;
  return { who: m[2] as string, at: m[3] as string, by: m[4] as string };
}

function own(it: Item): { who: string; said: string } | null {
  if (it.agg?.key !== 'clause:own') return null;
  const m = /^(?:Here’s what I had\. )?(.+?) said (.+?), and nobody else had said so yet\.$/.exec(it.text);
  if (!m) return null;
  return { who: m[1] as string, said: m[2] as string };
}

export function aggregate(items: Item[], ctx: PlanCtx): Item[] {
  const hc = crimeHour(ctx);
  const out: Item[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i] as Item;
    // The notebook's placements on one person's word: one sentence.
    const p0 = placed(it);
    if (p0) {
      const run = [it];
      for (let k = i + 1; k < items.length && run.length < MOST; k++) {
        const q = placed(items[k] as Item);
        if (!q || q.by !== p0.by || !sameSide([...hoursOf(it), ...hoursOf(items[k] as Item)], hc)) break;
        run.push(items[k] as Item);
      }
      if (run.length > 1) {
        const lead = /^Here’s what I had\. /.test(it.text) ? 'Here’s what I had. ' : '';
        const ps = run.map((x) => placed(x) as { who: string; at: string });
        // One place and hour for all of them is said once: "Kavanagh and Renfro at the Velvet Room at eleven".
        const byAt = new Map<string, string[]>();
        for (const x of ps) byAt.set(x.at, [...(byAt.get(x.at) ?? []), x.who]);
        out.push({
          ...it,
          text: `${lead}${p0.by} had ${andList([...byAt.entries()].map(([at, who]) => `${andList(who)} at ${at}`))}.`,
          about: [...new Set(run.flatMap((x) => x.about ?? []))],
          carries: run.flatMap((x) => x.carries ?? []),
          joined: 'aggregated',
        });
        i += run.length - 1;
        continue;
      }
    }
    // The evenings nobody else has spoken for: one sentence.
    const o0 = own(it);
    if (o0) {
      const run = [it];
      for (let k = i + 1; k < items.length && run.length < MOST; k++) {
        if (!own(items[k] as Item)) break;
        run.push(items[k] as Item);
      }
      if (run.length > 1) {
        const lead = /^Here’s what I had\. /.test(it.text) ? 'Here’s what I had. ' : '';
        const os = run.map((x) => own(x) as { who: string; said: string });
        out.push({
          ...it,
          text: `${lead}${andList(os.map((x, j) => (j === 0 ? `${x.who} said ${x.said}` : `${x.who} ${x.said}`)))}, and nobody else had said so yet.`,
          about: [...new Set(run.flatMap((x) => x.about ?? []))],
          carries: run.flatMap((x) => x.carries ?? []),
          joined: 'aggregated',
        });
        i += run.length - 1;
        continue;
      }
    }
    // The rest of an evening that held: one place at two hours said once.
    if (it.agg?.key === 'agree-rest') {
      const d = it.agg.data as { parts: { at: string; h: number; comp: string }[] };
      const ps = d.parts;
      if (ps.length === 2 && ps[0]?.at === ps[1]?.at && !ps[0]?.comp && !ps[1]?.comp && sameSide(ps.map((x) => x.h), hc)) {
        it.agg = { ...it.agg, data: { ...d, parts: [{ at: ps[0]?.at, h: ps[0]?.h, hs: [ps[0]?.h, ps[1]?.h], comp: '' }] } };
      }
    }
    out.push(alone(it));
  }
  return out;
}

