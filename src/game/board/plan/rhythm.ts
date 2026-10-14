/**
 * docs/49 §2, rhythm. Across the page, sentence lengths fall in bands (short
 * ≤ 8 words, medium 9–20, long 21+), and no three sentences in a row share a
 * band; nor do three in a row open on the same two words. Speech is somebody
 * else's rhythm: a quotation breaks the run. A beat that carries the joke
 * ends short. Paragraphs follow beats (the sheet's), and the answer's
 * quotation stands alone in its paragraph.
 *
 * The planner mends a run of three, trying in turn:
 *
 * - **joining** two sentences side by side into one ("…, and he…", "…, but
 *   …"), inside one piece of texture or across two facts in one paragraph;
 * - **trading** a card for another that fitted its draw as well, of another
 *   length (`Item.alts`);
 * - **parting** a sentence at a seam it already has ("; ", ", and the…",
 *   ", but …").
 *
 * Never across a fact and a gap (the skeleton keeps them apart), never inside
 * a quotation, and a mend is kept only when the run it was for is gone and no
 * new one starts near it. When nothing mends a run it's left, and the measure
 * counts it.
 */

import type { Item } from './types.js';
import type { PlanCtx } from './index.js';
import { bandOf, openingOf, sentencesOf, wordsIn, type Band } from './sentences.js';

interface S {
  /** Paragraph, item within it, sentence within the item. */
  p: number;
  i: number;
  k: number;
  text: string;
  speech: boolean;
  band: Band;
  open: string;
}

/** A word a clause may open on: a pronoun, or a determiner before its noun. A name opens one too. */
const OPENER = /^(?:I|He|She|It|They|We|You|There|Nobody|Somebody|Everybody|Anybody|Nothing|Everything|That|This|The|A|An|His|Her|My|Their|Its|Every|Each|No|Some|All|Both|Most|One|Mrs\.|Mr\.|Miss|Dr\.)$/;
/** The names a sentence of tonight's may open on (set by `rhythm`). */
let NAMES = new Set<string>();
/** Capitalized words that open something other than a clause with its subject first. */
const NOT_SUBJECT = /^(?:But|So|And|Then|Or|If|When|While|Whatever|Whoever|Here’s|Here|There’s|Up|Down|In|On|At|For|With|From|By|After|Before|Over|What|Which|Who|Not|Just|Only|Still|Even|Once|Now|Out|Back|Yes|Of|Because|Since|Until|As|Like|Whether|Either|Neither|Many|Much|Somewhere|Anywhere|Nowhere|Everywhere|Never|Always|Maybe|Perhaps|Too|Also|Well|Oh|Midnight|Above|Below|Outside|Inside|Behind|Beyond|Across|Around|Along|Through|Under|Upstairs|Downstairs|Thin|Round|Young|Old|Tall|Short|Big|Small|Neat|Sharp|Two|Three)$/;
const VERB = /^(?:was|were|is|are|had|has|did|didn’t|wasn’t|weren’t|hadn’t|said|says|could|couldn’t|would|wouldn’t|might|must|kept|took|went|came|looked|sat|stood|knew|thought|turned|put|got|made|left|gave|found|heard|saw|nodded|shrugged|smiled|waited|let|held|watched|wrote|started|stopped|seemed|tried|asked|told|moved|lifted|lit|folded|still|never|always|only|just|already|also|hung|lay|ran|sang|swung|shone|grinned|smelled|knocked|creaked|hissed|ticked|burned|steamed|leaned|rattled|sold|ate|drank|read|stayed|shut|opened|closed|does|do|needed|wanted|liked|meant|carried|dropped|picked|sees|knows|keeps|takes|waits|stands|sits|goes|comes|gets|makes|wants|needs|asks|tells|can|can’t|will|won’t|isn’t|aren’t|doesn’t|don’t)$/;

function cap(s: string): string {
  return s ? (s[0] as string).toUpperCase() + s.slice(1) : s;
}

/** "He" and "The" go lower case after a comma; "I" and a name keep their capital. */
function lowerFirst(s: string): string {
  if (/^(?:He|She|It|They|We|You|There|Nobody|Somebody|Everybody|Anybody|Nothing|Everything|That|This|The|A|An|His|Her|My|Their|Its|Every|Each|No|Some|All|Both|Most|One)\b/.test(s)) return (s[0] as string).toLowerCase() + s.slice(1);
  return s;
}

/** Whether a sentence opens on a clause of its own: a subject, then a verb within a few words. */
function opensOnClause(b: string): boolean {
  const ws = b.split(/\s+/).map((x) => x.replace(/[,.;:!?”’]+$/, ''));
  const w0 = ws[0] ?? '';
  if (w0 === "What" && /^(?:I|he|she|they|we|you)$/.test(ws[1] ?? "")) return ws.slice(2, 5).some((x) => VERB.test(x));
  if (NOT_SUBJECT.test(w0)) return false;
  if (!OPENER.test(w0) && !NAMES.has(w0)) return false;
  return ws.slice(1, 7).some((x) => VERB.test(x) || /^[a-z]+ed$/.test(x));
}

/** Two sentences said as one: "…, and he…", "…, but …". Null when they won't go. */
function joinable(a: string, b: string): string | null {
  // Entries of a list ("Hargrove: an IOU…") run on with a semicolon.
  const entry = /^(?:Mrs\. |Mr\. |Miss |Dr\. )?[A-Z][\w’]+: /;
  if (entry.test(a) && entry.test(b) && /\.$/.test(a) && !/;/.test(a) && !/;/.test(b)) return `${a.slice(0, -1)}; ${b}`;
  if (!/[a-z’)]\.$/.test(a) || /[“”"]/.test(a) || /[“”"]/.test(b)) return null;
  // A sentence with a semicolon or a colon in it is built already; it takes no more.
  if (/[;:]/.test(a) || /[;:]/.test(b)) return null;
  if (wordsIn(a) + wordsIn(b) > 30) return null;
  if (/^But\b/.test(b) && !/, but /.test(a)) return `${a.slice(0, -1)}, but ${b.slice(4)}`;
  // One "and" a sentence is plenty.
  if (/, and /.test(a) || /, and /.test(b) || /\bbut\b/.test(b)) return null;
  if (!opensOnClause(b)) return null;
  return `${a.slice(0, -1)}, and ${lowerFirst(b)}`;
}

/** Seams in one sentence to part it at: "; ", ", but …", ", and he…", ", and the…". */
function partings(s: string, tail = false, colon = true): [string, string][] {
  if (/[“”"]/.test(s)) return [];
  const out: [string, string][] = [];
  // What's seen may end on its last touch alone, the way the corpus does: "…the stair. Like a
  // remark nobody had asked for." "…hid the street. Which suited me."
  if (tail) {
    for (const m of s.matchAll(/, (like|as if|which|the way) /g)) {
      const at = m.index ?? 0;
      const a = s.slice(0, at).trim();
      const b = s.slice(at + 2).trim();
      if (wordsIn(a) >= 5 && wordsIn(b) >= 2 && wordsIn(b) <= 10 && !/,/.test(b)) out.push([`${a}.`, cap(b)]);
    }
  }
  // (Not ", so": half the time it's "so that", and a purpose parted from its act reads as a consequence.)
  for (const m of s.matchAll(colon ? /; |: |, but |, and /g : /; |, but |, and /g)) {
    const at = m.index ?? 0;
    const a = s.slice(0, at).trim();
    const b = s.slice(at + m[0].length).trim();
    if (wordsIn(a) < 4 || wordsIn(b) < (m[0] === '; ' ? 2 : 3)) continue;
    if (m[0] === ', but ') out.push([`${a}.`, `But ${b}`]);
    else if (m[0] === '; ' || opensOnClause(cap(b))) out.push([`${a}.`, cap(b)]);
  }
  return out;
}

function sentencesOfPage(paras: Item[][]): S[] {
  const out: S[] = [];
  paras.forEach((para, p) => {
    let inQ = false;
    para.forEach((it, i) => {
      sentencesOf(it.text).forEach((text, k) => {
        const was = inQ;
        let touched = false;
        for (const ch of text) {
          if (ch === '“') {
            inQ = true;
            touched = true;
          } else if (ch === '”') {
            inQ = false;
            touched = true;
          }
        }
        out.push({ p, i, k, text, speech: was || touched || it.slot === 'chapter', band: bandOf(text), open: openingOf(text) });
      });
    });
  });
  return out;
}

/** Where the first run of three in the narration starts, at or after `from`; -1 when there's none. */
function firstRun(ss: S[], from = 0): number {
  let run: number[] = [];
  for (let j = 0; j < ss.length; j++) {
    const s = ss[j] as S;
    if (s.speech) {
      run = [];
      continue;
    }
    run.push(j);
    if (run.length >= 3) {
      const start = run[run.length - 3] as number;
      if (start < from) continue;
      const [a, b, c] = run.slice(-3).map((x) => ss[x] as S) as [S, S, S];
      if ((a.band === b.band && b.band === c.band) || (a.open === b.open && b.open === c.open)) return start;
    }
  }
  return -1;
}

/** Whether an item's sentences may be joined or parted: texture, or the narration of a fact, never an answer. */
function mendable(it: Item): boolean {
  if (it.speech || it.slot === 'chapter' || it.slot === 'voice') return false;
  // "The part worth keeping came last." stands alone: it's the beat before the link.
  if (it.tag === 'thought:street') return false;
  return true;
}

/**
 * Whether two of an item's sentences may become one with "and": what's seen and done (the walk,
 * the room, the staging, a reaction, a close) and the facts, but not the detective's reasoning
 * (a why, an aside, a hand-off), where "and" would say they follow from each other.
 */
function joins(it: Item): boolean {
  // (A collision is its two lines and its one join: "and" inside it would say one follows from the other.)
  if (it.kind === 'fact') return it.relation !== 'collides';
  return it.slot === 'arrival' || it.slot === 'walk' || it.slot === 'staging' || it.slot === 'reaction' || it.slot === 'close' || it.slot === 'ask';
}

/** Whether joining `a` to `b` would put somebody of the same sex as `b`'s pronoun's person before it. */
function clash(ctx: PlanCtx, a: string, b: string, ib: Item): boolean {
  const pron = /\b(he|him|his|she|her)\b/i.exec(b.replace(/⁣\d+⁤/g, ''));
  if (!pron) return false;
  const female = /^(she|her)$/i.test(pron[1] as string);
  const mine = new Set(ib.about ?? []);
  return ctx.c.people.some((p) => !p.object && !!p.female === female && !mine.has(p.id) && a.includes(p.short));
}

type Try = () => (() => void) | null;

/** The mends for the run starting at `j`, best first. Each applies itself and hands back its undo, or null. */
function mends(paras: Item[][], ss: S[], j: number, ctx: PlanCtx, budget: { fragments: number }): Try[] {
  const trio = [ss[j], ss[j + 1], ss[j + 2]] as [S, S, S];
  const out: Try[] = [];
  const itemOf = (s: S) => paras[s.p]?.[s.i] as Item;
  // Join two side by side.
  for (const [a, b] of [
    [trio[1], trio[2]],
    [trio[0], trio[1]],
  ] as [S, S][]) {
    out.push(() => {
      if (a.p !== b.p) return null;
      const ia = itemOf(a);
      const ib = itemOf(b);
      if (!mendable(ia) || !mendable(ib) || !joins(ia) || !joins(ib)) return null;
      // Two people of one sex in one sentence, and a pronoun after them, is a pronoun for either.
      if (ia !== ib && clash(ctx, a.text, b.text, ib)) return null;
      const joined = joinable(a.text, b.text);
      if (!joined) return null;
      if (a.i === b.i) {
        const old = ia.text;
        const xs = sentencesOf(ia.text);
        xs.splice(a.k, 2, joined);
        ia.text = xs.join(' ');
        ia.alts = undefined;
        return () => {
          ia.text = old;
        };
      }
      // Two facts side by side become one, and so do two pieces of one kind of texture: a ends its
      // item, b opens the next.
      const same = (ia.kind === 'fact' && ib.kind === 'fact') || (ia.kind === 'gap' && ib.kind === 'gap');
      if (!same || b.i !== a.i + 1 || b.k !== 0 || a.k !== sentencesOf(ia.text).length - 1) return null;
      const before = { ...ia };
      const para = paras[a.p] as Item[];
      const xs = sentencesOf(ia.text);
      const ys = sentencesOf(ib.text);
      xs.splice(a.k, 1, joined);
      ia.text = [...xs, ...ys.slice(1)].join(' ');
      ia.carries = [...new Set([...(ia.carries ?? []), ...(ib.carries ?? [])])];
      ia.about = [...new Set([...(ia.about ?? []), ...(ib.about ?? [])])];
      if (ib.relation && ib.relation !== 'new' && ia.relation === 'new') ia.relation = ib.relation;
      ia.joined = ia.joined ?? ib.joined;
      para.splice(b.i, 1);
      return () => {
        Object.assign(ia, before);
        para.splice(b.i, 0, ib);
      };
    });
  }
  // Trade a card for another of another length: the middle first.
  for (const s of [trio[1], trio[2], trio[0]]) {
    const it = itemOf(s);
    if (!it.alts || !mendable(it)) continue;
    const options = it.alts();
    const start = ctx.int && options.length ? ctx.int(options.length) : 0;
    for (let n = 0; n < options.length; n++) {
      const o = options[(start + n) % options.length] as { text: string; take: () => void };
      if (sentencesOf(o.text).every((x) => bandOf(x) === s.band)) continue;
      out.push(() => {
        const old = it.text;
        const alts = it.alts;
        it.text = o.text;
        it.alts = undefined;
        return () => {
          it.text = old;
          it.alts = alts;
        };
      });
      // The trade is made with the hand only when it's kept (`keep`, below).
      (out[out.length - 1] as Try & { take?: () => void }).take = o.take;
    }
  }
  // Part one at a seam it already has: the middle first, then the ends. What's seen may end on its
  // last touch alone ("…hid the street. Which suited me."), twice a page at most.
  for (const s of [trio[1], trio[2], trio[0]]) {
    const it = itemOf(s);
    if (!mendable(it)) continue;
    const seen = it.kind === 'gap' && (it.slot === 'arrival' || it.slot === 'walk' || it.slot === 'staging' || it.slot === 'reaction' || it.slot === 'close');
    // (A colon in a piece of texture is the writer's: "Counting bills with a rubber thumb: that was the last I saw of her.")
    for (const parted of partings(s.text, seen && budget.fragments < 2, it.kind === 'fact')) {
      // Never a sentence said on an earlier page tonight ("That was the last I saw of her.").
      if (parted.some((x) => wordsIn(x) >= 6 && ctx.said?.has(x))) continue;
      if (parted.every((x) => bandOf(x) === s.band)) continue;
      const fragment = /^(?:Like|As if|Which|The way)\b/.test(parted[1]);
      out.push(() => {
        const old = it.text;
        const xs = sentencesOf(it.text);
        xs.splice(s.k, 1, ...parted);
        it.text = xs.join(' ');
        it.alts = undefined;
        return () => {
          it.text = old;
        };
      });
      if (fragment) (out[out.length - 1] as Try & { take?: () => void }).take = () => budget.fragments++;
    }
  }
  return out;
}

/** A joke ends short: the close's last sentence, parted where it has a seam near its end. */
function jokeEndsShort(paras: Item[][], said?: ReadonlySet<string>): void {
  for (const para of paras) {
    for (const it of para) {
      if (it.kind !== 'gap' || it.slot !== 'close' || !mendable(it)) continue;
      const xs = sentencesOf(it.text);
      const last = xs[xs.length - 1];
      if (!last || wordsIn(last) <= 8) continue;
      const parted = partings(last, true, false).filter((p) => wordsIn(p[1]) <= 8 && !/^(?:But|So)\b/.test(p[1]) && !p.some((x) => wordsIn(x) >= 6 && said?.has(x)));
      const p = parted[parted.length - 1];
      if (!p) continue;
      xs.splice(xs.length - 1, 1, ...p);
      it.text = xs.join(' ');
      it.alts = undefined;
    }
  }
}

/** How many runs of three the page has: every start of one. */
function runs(ss: S[]): number {
  let n = 0;
  for (let j = firstRun(ss, 0); j >= 0; j = firstRun(ss, j + 1)) n++;
  return n;
}

export function rhythm(paras: Item[][], ctx: PlanCtx): Item[][] {
  // The night's people: a sentence may open on one of their names.
  NAMES = new Set(ctx.c.people.filter((p) => !p.object).map((p) => p.short.replace(/^(?:Mrs\.|Mr\.|Miss|Dr\.) /, '')));
  jokeEndsShort(paras, ctx.said);
  const budget = { fragments: 0 };
  let from = 0;
  for (let guard = 0; guard < 60; guard++) {
    const ss = sentencesOfPage(paras);
    const j = firstRun(ss, from);
    if (j < 0) break;
    const now = runs(ss);
    let mended = false;
    for (const t of mends(paras, ss, j, ctx, budget)) {
      const undo = t();
      if (!undo) continue;
      // Kept only when the page has fewer runs than it had: never a mend that starts another.
      if (runs(sentencesOfPage(paras)) < now) {
        (t as Try & { take?: () => void }).take?.();
        mended = true;
        break;
      }
      undo();
    }
    if (!mended) from = j + 1;
  }
  return paras;
}
