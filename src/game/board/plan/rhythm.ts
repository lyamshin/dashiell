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
import { LIST_ENTRY, indefiniteFor, maskPlaces, pronounAmbiguity } from './measure.js';
import { LOWER } from '../bones/compose.js';
import type { Block, ProseVoice } from '../types.js';
import { bandOf, openingOf, sentencesOf, wordsIn, type Band } from './sentences.js';
import { lean } from './dial.js';

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

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function cap(s: string): string {
  return s ? (s[0] as string).toUpperCase() + s.slice(1) : s;
}

/** "He" and "The" go lower case after a comma; "I" and a name keep their capital. */
function lowerFirst(s: string): string {
  if (LOWER.test(s)) return (s[0] as string).toLowerCase() + s.slice(1);
  return s;
}

/** Whether a sentence opens on a clause of its own: a subject, then a verb within a few words. */
function opensOnClause(b: string): boolean {
  const ws = b.replace(/⁣\d+⁤/g, '').split(/\s+/).map((x) => x.replace(/[,.;:!?”’]+$/, ''));
  const w0 = ws[0] ?? '';
  if (w0 === "What" && /^(?:I|he|she|they|we|you)$/.test(ws[1] ?? "")) return ws.slice(2, 5).some((x) => VERB.test(x));
  // "I’d opened…", "She’s…", "There’s…": the subject and its verb in one word (Planner 2).
  if (/^(?:I|He|She|It|They|We|You|There|That)’(?:d|s|ll|ve|re|m)$/.test(w0)) return true;
  // Planner 2: a short place or time before the clause ("Under it somebody had written…", "In the
  // street the first pushcart man was…"): the subject comes after it, then its verb.
  if (LEAD.test(w0)) {
    // (After an adverb, "Somewhere a radio was playing", the subject's article comes straight after it.)
    const adverb = /^(?:Somewhere|Upstairs|Downstairs|Overhead|Inside|Outside)$/.test(w0);
    for (let k = 1; k <= 5 && k < ws.length; k++) {
      const w = (ws[k] ?? '').replace(/’s$/, '');
      const subject = NAMES.has(w) || /^(?:I|somebody|nobody|everybody|anybody|he|she|they|it|there|Mrs|Mr|Miss|Dr)$/.test(w) || ((k >= 2 || adverb) && /^(?:the|a|an)$/.test(w));
      if (subject) return ws.slice(k + 1, k + 6).some((x) => VERB.test(x));
    }
    return false;
  }
  if (NOT_SUBJECT.test(w0)) return false;
  // ("That she was with Mrs. Pomerantz at ten" is what somebody said, not a sentence: its "That" is no subject.)
  if (w0 === 'That' && (/^(?:I|he|she|they|we|you|it|there|Mrs|Mr|Miss|Dr)$/.test(ws[1] ?? '') || NAMES.has(ws[1] ?? ''))) return false;
  // (A possessive opens a subject too: "Somebody’s galoshes stood by the door".)
  const w0s = w0.replace(/’s$/, '');
  if (!OPENER.test(w0s) && !NAMES.has(w0s)) return false;
  return ws.slice(1, 7).some((x) => VERB.test(x) || /^[a-z]+ed$/.test(x));
}

/** A situated card that is something I did, for the why-here's fold (docs/52): its subject and its act. */
const FOLD_ACT = /^I (?:went|stood|stayed|kept my (?:voice|questions)|took|found|let|loosened|hung|nodded|waved|followed|crossed|came|walked|got out|sat|pulled|asked if|made my way|slipped|edged|eased|knocked|stepped)\b/;

/** docs/59: the longest sentence two facts make together (the skim test's readers stopped on longer). */
const FACTS_LONGEST = 26;

/** Words a short lead of place or time opens on, before a clause's subject. */
const LEAD = /^(?:For|In|On|Under|Over|At|Behind|Above|Below|Through|Outside|Inside|Across|Along|Beside|Near|Upstairs|Downstairs|Somewhere|Overhead|Down|Up)$/;

/** Two sentences said as one: "…, and he…", "…, but …", or with a semicolon when `semi`. Null when they won't go. */
function joinable(a0: string, b0: string, semi = false, and = true): string | null {
  // The engine's marks on its pronouns are no part of the words: tested without them, kept in the join.
  const a = a0.replace(/⁣\d+⁤/g, '');
  const b = b0.replace(/⁣\d+⁤/g, '');
  // Entries of a list ("Hargrove: an IOU…") stay entries: two run on with a semicolon and the rest
  // not reads as a slip.
  const entry = /^(?:Mrs\. |Mr\. |Miss |Dr\. )?[A-Z][\w’]+: /;
  if (entry.test(a) || entry.test(b)) return null;
  if (!/[a-z’)]\.$/.test(a) || /[“”"]/.test(a) || /[“”"]/.test(b)) return null;
  // A sentence with a semicolon or a colon in it is built already; it takes no more.
  if (/[;:]/.test(a) || /[;:]/.test(b)) return null;
  if (wordsIn(a) + wordsIn(b) > 34) return null;
  // A lead ("Here’s what I had.") stands on its own.
  if (wordsIn(a) < 5) return null;
  if (/^But\b/.test(b) && !/, but /.test(a)) return and ? `${a0.slice(0, -1)}, but ${b0.slice(4)}` : null;
  if (!opensOnClause(b)) return null;
  if (!and) return semi ? `${a0.slice(0, -1)}; ${lowerFirst(b0)}` : null;
  // One "and" a sentence is plenty: "…as manners allowed and said my name, and she had nails red
  // and bitten" is three. Past that, a semicolon (Planner 2), where the page has one to spare.
  if (/, and /.test(a) || /, and /.test(b) || /\bbut\b/.test(b) || (`${a} ${b}`.match(/ and /g) ?? []).length > 1) return semi ? `${a0.slice(0, -1)}; ${lowerFirst(b0)}` : null;
  return `${a0.slice(0, -1)}, and ${lowerFirst(b0)}`;
}

/** Seams in one sentence to part it at: "; ", ", but …", ", and he…", ", and the…". */
function partings(s: string, tail = false, colon = true, scene = false): [string, string][] {
  if (/[“”"]/.test(s)) return [];
  // An entry of a list ("Teitel: an IOU in his hand, and a note of what was still owing.") is one entry.
  if (/^(?:Mrs\. |Mr\. |Miss |Dr\. )?[A-Z][\w’]+: /.test(s)) return [];
  const out: [string, string][] = [];
  // What's seen may end on its last touch alone, the way the corpus does: "…the stair. Like a
  // remark nobody had asked for." "…hid the street. Which suited me."
  if (tail) {
    // (Planner 2: and "…the name. Just a loop of string over a nail…", "…instead. Which has stood there…".)
    // (docs/60 item 5: lean, never a bare phrase of place or company on its own: "With the lamp behind her." after a look.)
    for (const m of s.matchAll(lean() ? /, (like|as if|which|the way) /g : /, (like|as if|which|the way|the kind of|just|with|past|under|over|through|along|behind|between) /g)) {
      const at = m.index ?? 0;
      const a = s.slice(0, at).trim();
      const b = s.slice(at + 2).trim();
      const most = /^(?:like|as if|the way)$/.test(m[1] as string) ? 10 : 14;
      // (docs/66: never a fragment that opens on "he" or "she": "As if he were keeping count for her." had
      // nobody for the "he" once it stood alone; the cat was in the sentence before.)
      if (wordsIn(a) >= 5 && wordsIn(b) >= 2 && wordsIn(b) <= most && !/,/.test(b) && !(lean() && /^\w+(?: if| though)? (?:he|she)\b/i.test(b))) out.push([`${a}.`, cap(b)]);
    }
  }
  // A place's own sentence may end on what it was full of (Planner 2): "…waking to it floor by
  // floor. A window going up, a baby starting, somebody’s alarm clock being argued with."
  if (scene && tail) {
    const m = /^(.{20,}?): ([a-z][^:;]*,[^:;]*)$/.exec(s);
    if (m && wordsIn(m[1] as string) >= 6 && wordsIn(m[2] as string) >= 5 && !/\bthat was the last\b/.test(s)) out.push([`${m[1]}.`, cap(m[2] as string)]);
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
        out.push({ p, i, k, text, speech: was || touched || it.slot === 'chapter' || LIST_ENTRY.test(text), band: bandOf(text), open: openingOf(text) });
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
  // docs/59 item 3: a consequence is a sentence of its own.
  if (it.tag === 'thought:then') return false;
  // (docs/66, P1: and so is the hour the facts settle: "So he was taken at eleven.", never run on.)
  if (it.tag === 'thought:narrows' || it.say?.flags?.includes('narrows')) return false;
  // (docs/59 note 7: the papers' pages, a grudge to a sentence, stay one each.)
  if (it.say?.flags?.includes('papers-list')) return false;
  return true;
}

/**
 * Whether two of an item's sentences may become one with "and": what's seen and done (the walk,
 * the room, the staging, a reaction, a close) and the facts, but not the detective's reasoning
 * (a why, an aside, a hand-off), where "and" would say they follow from each other.
 */
function joins(it: Item): 'and' | 'semi' | false {
  // docs/51: a reason and the situated card after it are two thoughts, not one ("…telling the room
  // about his parlor window; the kitchen door swung…" read as a non sequitur in the blind read).
  if (it.sit?.card && it.sit.lead) return false;
  // (A collision is its two lines and its one join: "and" inside it would say one follows from the other.)
  // (The notebook said aloud is notes, one after another: two of them take a semicolon, never "and",
  // which makes one follow from the other: "…not even him, and I didn’t know what it was yet".)
  // (docs/60 item 4: lean, the turn's notes are plain sentences, never two run together on a semicolon.)
  if (it.kind === 'fact') return it.relation === 'collides' ? false : it.voice === 'recap' ? (lean() ? false : 'semi') : 'and';
  if (it.slot === 'arrival' || it.slot === 'walk' || it.slot === 'staging' || it.slot === 'reaction' || it.slot === 'close' || it.slot === 'ask') return 'and';
  // The detective's reasoning, an aside or a why, takes a semicolon, never "and" (Planner 2): "I
  // hadn’t come for the furniture; I’d come for Lieb."
  if (it.slot === 'gloss' || it.slot === 'why-here') return 'semi';
  return false;
}

/** Whether joining `a` to `b` would put somebody of the same sex as `b`'s pronoun's person before it. */
function clash(ctx: PlanCtx, a: string, b: string, ib: Item): boolean {
  const pron = /\b(he|him|his|she|her)\b/i.exec(b.replace(/⁣\d+⁤/g, ''));
  if (!pron) return false;
  const female = /^(she|her)$/i.test(pron[1] as string);
  // "…pointing his flashlight at a man who was talking, and he had a white mustache": the man's?
  // ("A free lunch nobody eats" is nobody a "he" could be: Planner 2.)
  if (indefiniteFor(a.replace(/\b(?:[Nn]obody|[Ee]verybody|[Aa]nybody)\b/g, 'it'), female)) return true;
  const mine = new Set(ib.about ?? []);
  return ctx.c.people.some((p) => !p.object && !!p.female === female && !mine.has(p.id) && a.includes(p.short));
}

type Try = () => (() => void) | null;

/** The mends for the run starting at `j`, best first. Each applies itself and hands back its undo, or null. */
function mends(paras: Item[][], ss: S[], j: number, ctx: PlanCtx, budget: { fragments: number; semis: number }): Try[] {
  const trio = [ss[j], ss[j + 1], ss[j + 2]] as [S, S, S];
  const out: Try[] = [];
  const itemOf = (s: S) => paras[s.p]?.[s.i] as Item;
  /** A line that opens on the name of the one it's about. */
  const opensOn = (t: string, it: Item) => (it.about ?? []).some((id) => new RegExp(`^${esc(ctx.c.people.find((p) => p.id === id)?.short ?? '\u0000')}[ ,]`).test(t));
  // Join two side by side.
  for (const [a, b] of [
    [trio[1], trio[2]],
    [trio[0], trio[1]],
  ] as [S, S][]) {
    const t: Try & { take?: () => void } = () => {
      t.take = undefined;
      if (a.p !== b.p) return null;
      const ia = itemOf(a);
      const ib = itemOf(b);
      if (!mendable(ia) || !mendable(ib) || !joins(ia) || !joins(ib)) return null;
      const and = joins(ia) === 'and' && joins(ib) === 'and';
      // A why joined names one person at most: two in one sentence leave the next one's "her" to either.
      if ((ia.slot === 'why-here' || ib.slot === 'why-here') && ctx.c.people.filter((p) => !p.object && `${a.text} ${b.text}`.includes(p.short)).length > 1) return null;
      // Two people of one sex in one sentence, and a pronoun after them, is a pronoun for either.
      if (ia !== ib ? clash(ctx, a.text, b.text, ib) : indefiniteFor(a.text, /^(?:she|her)\b/i.test(/\b(he|him|his|she|her)\b/i.exec(b.text)?.[1] ?? '')) && /\b(he|him|his|she|her)\b/i.test(b.text)) return null;
      // Two people's texture isn't one sentence ("He had a white mustache…, and Teitel was folding a
      // necktie…"), unless each opens on its own person's name ("Mrs. Szabo was knitting a muffler…,
      // and Glick was polishing his derby…", Planner 2).
      if (ia !== ib && ia.kind === 'gap' && (ia.about ?? []).length > 0 && (ib.about ?? []).length > 0 && !(ia.about ?? []).some((x) => (ib.about ?? []).includes(x)) && !(opensOn(a.text, ia) && opensOn(b.text, ib))) return null;
      // docs/59 item 8: two facts that name one person don't go in one sentence.
      if (ia !== ib && ia.kind === 'fact' && ib.kind === 'fact' && ctx.c.people.some((p) => !p.object && p.short.length > 2 && new RegExp(`(?<![\\w’])${esc(p.short)}(?![\\w])`).test(maskPlaces(ctx.c, a.text)) && new RegExp(`(?<![\\w’])${esc(p.short)}(?![\\w])`).test(maskPlaces(ctx.c, b.text)))) return null;
      const joined = joinable(a.text, b.text, budget.semis < 2, and);
      if (!joined) return null;
      if (ia.kind === 'fact' && ib.kind === 'fact' && wordsIn(joined) > FACTS_LONGEST) return null;
      // A semicolon is spent only when the mend is kept.
      if (/; /.test(joined) && !/; /.test(`${a.text} ${b.text}`)) t.take = () => budget.semis++;
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
      // (And where I sit and why, when the why points at nobody: "I took the form out and smoothed it
      // flat on my knee, and there was nothing on it I couldn’t fill in", Planner 2.)
      const pointsAt = (t: string) => ctx.c.people.some((p) => !p.object && t.includes(p.short)) || ctx.c.places.some((p) => t.includes(p.short));
      const same = (ia.kind === 'fact' && ib.kind === 'fact') || (ia.kind === 'gap' && ib.kind === 'gap' && (ia.slot === ib.slot || (ia.slot === 'staging' && ib.slot === 'why-here' && !pointsAt(ib.text))));
      if (!same || b.i !== a.i + 1 || b.k !== 0 || a.k !== sentencesOf(ia.text).length - 1) return null;
      const before = { ...ia, n: ia.n, carries: ia.carries, about: ia.about, relation: ia.relation, joined: ia.joined, comp: ia.comp };
      const para = paras[a.p] as Item[];
      const xs = sentencesOf(ia.text);
      const ys = sentencesOf(ib.text);
      xs.splice(a.k, 1, joined);
      ia.text = [...xs, ...ys.slice(1)].join(' ');
      ia.carries = [...new Set([...(ia.carries ?? []), ...(ib.carries ?? [])])];
      ia.about = [...new Set([...(ia.about ?? []), ...(ib.about ?? [])])];
      if (ia.kind === 'fact') ia.n = (ia.n ?? 1) + (ib.n ?? 1);
      // docs/52: two facts in one sentence are a pair of composites, joined by the rhythm.
      if (ia.kind === 'fact' && ia.comp && ib.comp) ia.comp = { shape: 'PAIR', props: [...ia.comp.props, ...ib.comp.props], parts: [ia.comp, ib.comp], join: 'rhythm' };
      if (ib.relation && ib.relation !== 'new' && ia.relation === 'new') ia.relation = ib.relation;
      ia.joined = ia.joined ?? ib.joined;
      para.splice(b.i, 1);
      return () => {
        Object.assign(ia, before);
        para.splice(b.i, 0, ib);
      };
    };
    out.push(t);
  }
  // Two people's lines the other way round, when the second's pronoun would be read as the first's
  // the right way round (Planner 2): "Lieb was admiring his reflection in the nearest thing that
  // shone, and Teitel was folding a necktie…".
  for (const [a, b] of [
    [trio[1], trio[2]],
    [trio[0], trio[1]],
  ] as [S, S][]) {
    out.push(() => {
      if (a.p !== b.p || b.i !== a.i + 1 || a.k !== 0 || b.k !== 0) return null;
      const ia = itemOf(a);
      const ib = itemOf(b);
      if (ia.kind !== 'gap' || ib.kind !== 'gap' || ia.slot !== 'arrival' || ib.slot !== 'arrival' || !mendable(ia) || !mendable(ib)) return null;
      if (sentencesOf(ia.text).length !== 1 || sentencesOf(ib.text).length !== 1) return null;
      if (!opensOn(a.text, ia) || !opensOn(b.text, ib) || (ia.about ?? []).some((x) => (ib.about ?? []).includes(x))) return null;
      if (clash(ctx, b.text, a.text, ia)) return null;
      const joined = joinable(b.text, a.text, false, true);
      if (!joined) return null;
      const before = { ...ia, about: ia.about, alts: ia.alts };
      const para = paras[a.p] as Item[];
      ia.text = joined;
      ia.about = [...(ib.about ?? []), ...(ia.about ?? [])];
      ia.alts = undefined;
      para.splice(b.i, 1);
      return () => {
        Object.assign(ia, before);
        para.splice(b.i, 0, ib);
      };
    });
  }
  // docs/52: a why-here's reason and the situated card after it, one sentence, where the card is
  // what I did about it ("Coffin’s list had Ashby here at eleven, so I went over to him past the
  // seats"): the reason is the cause, and "so" says so. (Never "and" or a semicolon: the blind read
  // took those for a seam, docs/51.)
  for (const s of [trio[0], trio[1], trio[2]]) {
    out.push(() => {
      const it = itemOf(s);
      const lead = it.sit?.lead;
      if (it.kind !== 'gap' || it.slot !== 'why-here' || !lead || !it.sit?.card || it.sit.tail || !it.text.startsWith(`${lead} `)) return null;
      const card = it.text.slice(lead.length + 1);
      const l = lead.replace(/⁣\d+⁤/g, '');
      if (sentencesOf(l).length !== 1 || sentencesOf(card).length !== 1 || !/[a-z’)]\.$/.test(l) || /[;:“”]/.test(l + card)) return null;
      // The reason is something somebody said or a list had (past tense), and the card is something I
      // did on the strength of it: going in, standing, keeping my voice down. Not a wish, a want, a
      // state of mind: "…, so I wished rooms could talk" is a non sequitur.
      if (!/\b(?:had|said|passed|was|were)\b/.test(l) || /\b(?:are|is|keeps|keep)\b/.test(l)) return null;
      if (!FOLD_ACT.test(card) || /\bso\b/i.test(card) || wordsIn(l) + wordsIn(card) > 34) return null;
      // (docs/59 item 8: not where the card's pronoun could be either of two people the reason names:
      // "Vogel had named Tramonti, so I went… to give her nothing to steer by".)
      if (/\b(?:he|him|his|she|her)\b/i.test(card) && ctx.c.people.filter((p) => p.short.length > 2 && l.includes(p.short)).length >= 2) return null;
      const old = it.text;
      it.text = `${lead.slice(0, -1)}, so ${card}`;
      const alts = it.alts;
      it.alts = undefined;
      return () => {
        it.text = old;
        it.alts = alts;
      };
    });
  }
  // Trade a card for another of another length: the middle first.
  for (const s of [trio[1], trio[2], trio[0]]) {
    const it = itemOf(s);
    if (!it.alts || !mendable(it)) continue;
    const options = it.alts().filter((o) => !o.lastResort);
    const start = ctx.int && options.length ? ctx.int(options.length) : 0;
    for (let n = 0; n < options.length; n++) {
      const o = options[(start + n) % options.length] as { text: string; take: () => void };
      if (sentencesOf(o.text).every((x) => bandOf(x) === s.band)) continue;
      // Not a second sentence on the page opening on "So" or "But" ("So here at seven… So far as it
      // went, it stood up.").
      const opener = /^(So|But)\b/.exec(o.text)?.[1];
      if (opener && paras.flat().some((x) => x !== it && new RegExp(`(?:^|[.!?]\\s+)${opener}\\b`).test(x.text.replace(/“[^”]*”/g, ' ')))) continue;
      out.push(() => {
        const old = it.text;
        const alts = it.alts;
        it.text = o.text;
        // (The rest of the hand stays to hand: a last resort for the names, after, Planner 2.)
        it.alts = alts ? () => alts().filter((x) => x.text !== o.text && x.lastResort) : undefined;
        return () => {
          it.text = old;
          it.alts = alts;
        };
      });
      // The trade is made with the hand only when it's kept (`keep`, below).
      (out[out.length - 1] as Try & { take?: () => void }).take = o.take;
    }
  }
  // docs/60 item 6: lean, who was still there and who had gone may be two sentences again, where the
  // page's rhythm wants one short ("…, Mosley was still at Moskowitz’s. By then Bledsoe had left.").
  if (lean()) {
    for (const s of [trio[1], trio[2], trio[0]]) {
      const it = itemOf(s);
      const m = it.tag === 'thought:then' ? /^(.*\S), and by then (.+)$/.exec(s.text) : null;
      if (!m) continue;
      out.push(() => {
        const old = it.text;
        const xs = sentencesOf(it.text);
        xs.splice(s.k, 1, `${m[1]}.`, `By then ${m[2]}`);
        it.text = xs.join(' ');
        return () => {
          it.text = old;
        };
      });
    }
  }
  // Part one at a seam it already has: the middle first, then the ends. What's seen may end on its
  // last touch alone ("…hid the street. Which suited me."), three times a page at most.
  for (const s of [trio[1], trio[2], trio[0]]) {
    const it = itemOf(s);
    if (!mendable(it)) continue;
    // A collision is never parted: its join is its point ("They couldn’t both be true, and I knew
    // which one I’d bet on."). Nor are facts the planner joined on purpose (Planner 2).
    if (it.kind === 'fact' && (it.relation === 'collides' || it.composed)) continue;
    // A thought's facts are joined by the planner's composition, never parted again (Planner 2).
    if (it.kind === 'fact' && it.voice === 'thought' && it.beat === 'thought') continue;
    const seen = it.kind === 'gap' && (it.slot === 'arrival' || it.slot === 'walk' || it.slot === 'staging' || it.slot === 'reaction' || it.slot === 'close');
    // (A colon in a piece of texture is the writer's: "Counting bills with a rubber thumb: that was the last I saw of her.")
    for (const parted of partings(s.text, seen && budget.fragments < 3, it.kind === 'fact', it.slot === 'arrival' || it.slot === 'walk')) {
      // Never a sentence said on an earlier page tonight ("That was the last I saw of her.").
      if (parted.some((x) => wordsIn(x) >= 6 && ctx.said?.has(x))) continue;
      if (parted.every((x) => bandOf(x) === s.band)) continue;
      const fragment = /^(?:Like|As if|Which|The way|The kind of|Just|With|Past|Under|Over|Through|Along|Behind|Between)\b/.test(parted[1]) || (!opensOnClause(parted[1]) && !/^But\b/.test(parted[1]));
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

/** Pronouns two people could be, on the section as it stands (the measure's count). */
function ambiguous(paras: Item[][], ctx: PlanCtx): number {
  const blocks: Block[] = paras.map((ps) => ({ kind: 'prose', voice: (ps[0]?.voice ?? 'narrator') as ProseVoice, text: ps.map((x) => x.text.replace(/⁣\d+⁤/g, '')).join(' ') }));
  return pronounAmbiguity(ctx.c, blocks, ctx.situ?.subject ? { subject: ctx.situ.subject } : {}).length;
}

export function rhythm(paras: Item[][], ctx: PlanCtx): Item[][] {
  // The night's people: a sentence may open on one of their names.
  NAMES = new Set(ctx.c.people.filter((p) => !p.object).map((p) => p.short.replace(/^(?:Mrs\.|Mr\.|Miss|Dr\.) /, '')));
  jokeEndsShort(paras, ctx.said);
  const budget = { fragments: 0, semis: 0 };
  let from = 0;
  let deep = 0;
  for (let guard = 0; guard < 60; guard++) {
    const ss = sentencesOfPage(paras);
    const j = firstRun(ss, from);
    if (j < 0) break;
    const now = runs(ss);
    let mended = false;
    const unclear = ambiguous(paras, ctx);
    for (const t of mends(paras, ss, j, ctx, budget)) {
      const undo = t();
      if (!undo) continue;
      // Kept only when the page has fewer runs than it had: never a mend that starts another, nor
      // one that leaves a pronoun two people could be (Planner 2: a join moves the sentence before).
      if (runs(sentencesOfPage(paras)) < now && ambiguous(paras, ctx) <= unclear) {
        (t as Try & { take?: () => void }).take?.();
        mended = true;
        break;
      }
      undo();
    }
    // Planner 2: two mends together, where one alone only moves the run: a join that makes a long
    // sentence beside two long ones, and then a parting of one of those.
    if (!mended && deep < 4) {
      deep++;
      // (Without the page's dice: a search that finds nothing leaves the rest of the page as dealt.)
      const still: PlanCtx = { ...ctx, int: () => 0 };
      outer: for (const t1 of mends(paras, ss, j, still, budget)) {
        const undo1 = t1();
        if (!undo1) continue;
        const ss1 = sentencesOfPage(paras);
        const near: number[] = [];
        for (let k = firstRun(ss1, 0); k >= 0; k = firstRun(ss1, k + 1)) if (Math.abs(k - j) <= 4) near.push(k);
        for (const j2 of near) {
          for (const t2 of mends(paras, ss1, j2, still, budget)) {
            const undo2 = t2();
            if (!undo2) continue;
            if (runs(sentencesOfPage(paras)) < now && ambiguous(paras, ctx) <= unclear) {
              (t1 as Try & { take?: () => void }).take?.();
              (t2 as Try & { take?: () => void }).take?.();
              mended = true;
              break outer;
            }
            undo2();
          }
        }
        undo1();
      }
    }
    if (!mended) from = j + 1;
  }
  return paras;
}
