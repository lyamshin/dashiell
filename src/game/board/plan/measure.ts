/**
 * docs/49 §4: the microplanner's measures, over a page as the player reads it.
 *
 * - **sentences per fact unit**: the sentences the fact units take, over how
 *   many fact units there are (target ≤ 1.2);
 * - **list smell**: three or more narration sentences in a row opening on the
 *   same two words, or three in a row in one length band (short ≤ 8 words,
 *   medium 9–20, long 21+). Speech is somebody else's rhythm, so a sentence
 *   with a quotation in it breaks the run (target 0 pages);
 * - **pronoun ambiguity**: a he, him, his, she or her in the narration that
 *   could be two people of its sex in the last two sentences: its own, and
 *   the one before. Two named in its own sentence before it, or, when its own
 *   names none, two named in the sentence before. Speech is somebody else
 *   talking: the names in it are theirs, and a quotation is skipped over. An
 *   object pronoun is never its own clause's subject ("Hauck passed her"
 *   isn't Hauck), and a reflexive never counts (target 0);
 * - **joins**: the connectives that say what a fact does ("But", "So",
 *   "which was what Coffin had", "same as she said", "and Ellery would swear
 *   to it", "One of them was wrong"), counted in the fact units (report;
 *   target 1–3 a page that has facts);
 * - **restated pointer**: a page's why-here saying again the words of the
 *   hand-off on the page before (target 0).
 *
 * Pure. The planner's own operations count the same way (`rhythm.ts`,
 * `refer.ts`), so what it fixes is what this measures.
 */

import type { Block, Page } from '../types.js';
import { pronOf, type BoardCase } from '../model.js';
import type { Unit } from './types.js';
import { bandOf, markedSentences, openingOf, sentencesOf, type Band } from './sentences.js';

/** The page's sentences in reading order, speech marked, with a break at a chapter heading. */
export function pageSentences(blocks: readonly Block[]): { text: string; speech: boolean; chapter?: boolean }[] {
  const out: { text: string; speech: boolean; chapter?: boolean }[] = [];
  for (const b of blocks) {
    if (b.kind !== 'prose') continue;
    if (b.voice === 'chapter') {
      out.push({ text: b.text, speech: true, chapter: true });
      continue;
    }
    for (const s of markedSentences(b.text).sentences) out.push(s);
  }
  return out;
}

/** Runs of three in the narration: in one band, or opening on the same two words. */
export function listSmell(blocks: readonly Block[]): { band: string[]; opening: string[] } {
  const ss = pageSentences(blocks);
  const band: string[] = [];
  const opening: string[] = [];
  let run: { text: string; band: Band; open: string }[] = [];
  for (const s of ss) {
    if (s.speech) {
      run = [];
      continue;
    }
    run.push({ text: s.text, band: bandOf(s.text), open: openingOf(s.text) });
    if (run.length >= 3) {
      const [a, b, c] = run.slice(-3) as [(typeof run)[0], (typeof run)[0], (typeof run)[0]];
      if (a.band === b.band && b.band === c.band) band.push(`${a.band}: ${[a, b, c].map((x) => x.text.slice(0, 40)).join(' | ')}`);
      if (a.open === b.open && b.open === c.open) opening.push(`“${a.open}”: ${[a, b, c].map((x) => x.text.slice(0, 40)).join(' | ')}`);
    }
  }
  return { band, opening };
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The people a pronoun could stand for: everybody with a name, and the lost pet, with their sex. */
export function referents(c: BoardCase): { id: string; short: string; female: boolean }[] {
  return c.people
    .filter((p) => (!p.object || c.type === 'lost-pet') && p.short.length > 2)
    .map((p) => ({ id: p.id, short: p.short, female: pronOf(c, p.id).he === 'she' }));
}

/** A sentence with the places' names masked, keeping its length: "Corrigan’s flat" isn't Corrigan. */
export function maskPlaces(c: BoardCase, text: string): string {
  let t = text;
  const names = c.places.flatMap((p) => [p.name, p.short, cap(p.name), cap(p.short)]).filter(Boolean).sort((a, b) => b.length - a.length);
  for (const n of names) if (t.includes(n)) t = t.split(n).join('\u0001'.repeat(n.length));
  // "the Prentiss flat", "Corrigan’s flat": a place called after somebody.
  const alt = c.people.map((p) => esc(p.short.replace(/^Mrs\. /, ''))).join('|');
  if (alt) t = t.replace(new RegExp(`\\b[Tt]he (?:${alt})\\b(?: [a-z]+)?|\\b(?:Mrs\\. )?(?:${alt})’s (?:flat|place|rooms|parlou?r|door)\\b`, 'g'), (m) => '\u0001'.repeat(m.length));
  return t;
}

function cap(s: string): string {
  return s ? (s[0] as string).toUpperCase() + s.slice(1) : s;
}

/** The narration of a sentence: its speech blanked out, keeping its length. */
export function narrationOf(text: string, startsInQuote: boolean): string {
  let inQ = startsInQuote;
  let out = '';
  for (const ch of text) {
    if (ch === '“') inQ = true;
    out += inQ ? ' ' : ch;
    if (ch === '”') inQ = false;
  }
  return out;
}

/** Everybody named in a sentence, with where, in order. */
export function namesAt(c: BoardCase, text: string): { id: string; at: number }[] {
  const t = maskPlaces(c, text);
  const out: { id: string; at: number }[] = [];
  const taken = new Set<number>();
  for (const p of referents(c).sort((a, b) => b.short.length - a.short.length)) {
    for (const m of t.matchAll(new RegExp(`\\b${esc(p.short)}\\b`, 'g'))) {
      const at = m.index ?? 0;
      if (taken.has(at)) continue;
      for (let k = at; k < at + p.short.length; k++) taken.add(k);
      out.push({ id: p.id, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The subject of the clause at `at`, when a name heads it: "Hauck passed her" can't be Hauck. */
export function clauseHead(text: string, names: { id: string; at: number }[], at: number): string | undefined {
  const head = text.slice(0, at);
  const cut = Math.max(head.lastIndexOf(','), head.lastIndexOf(';'), head.lastIndexOf(':'), head.lastIndexOf('“'), head.lastIndexOf(' and '), head.lastIndexOf(' that '), head.lastIndexOf(' said '));
  const from = cut < 0 ? 0 : cut + 1;
  const n = names.filter((x) => x.at >= from && x.at < at)[0];
  if (!n) return undefined;
  const lead = text.slice(from, n.at).replace(/\b(and|that|said|then|so|but|the|Mrs\.|Mr\.|Dr\.|Miss)\b/g, '').trim();
  return lead === '' ? n.id : undefined;
}

/**
 * Whether "her" is the object ("passed her on", "owed her money") or the possessive ("her
 * evening"): what follows, and what comes before (a verb that gives somebody something).
 */
export function herIsObject(after: string, before = ''): boolean {
  if (/\b(?:owed|gave|give|told|sent|bought|showed|handed|offered|promised|lent|paid|asked|brought|cost|wished|left)\s*$/.test(before)) return true;
  return /^(?:⁣\d+⁤)?(?:\s+(?:at|here|there|in|on|with|to|for|about|by|from|into|out|again|now|then|and|or|but|as|if|when|that|than|over|across|before|after|go|alone|yet|either|too|first|last|home|anything|nothing)\b|\s*[,.;:!?”—]|\s*$)/.test(after);
}

const PRONOUN = /\b(he|him|his|himself|she|her|hers|herself)\b/gi;
/**
 * Somebody nameless before a pronoun in its own sentence, and nobody named: the pronoun is theirs
 * ("Somebody at the next table gave a seltzer bottle a squeeze and got his own tie").
 */
const INDEFINITE = /\b(?:[Ss]omebody|[Ss]omeone|[Nn]obody|[Aa]nybody|[Ee]verybody|[Oo]ne of the \w+|(?:[Aa]n?|[Tt]he) (?:[a-z]+ )?(?:kid|cop|waiter|cabby|drunk|tenant|lodger))\b/;
const INDEFINITE_HE = /\b(?:[Aa]n?|[Tt]he) (?:[a-z]+ )?(?:man|fellow|boy|policeman)\b/;
const INDEFINITE_SHE = /\b(?:[Aa]n?|[Tt]he) (?:[a-z]+ )?(?:woman|girl|lady)\b/;

/** Whether `before` has somebody nameless a pronoun of that sex could be theirs ("a large man … his"). */
export function indefiniteFor(before: string, female: boolean): boolean {
  return INDEFINITE.test(before) || (female ? INDEFINITE_SHE : INDEFINITE_HE).test(before);
}
/** A list entry's heading: "Hargrove: …", "Mrs. Nagy: …". */
const ENTRY = /^(?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+: /;
const ENTRY_SEAM = /; (?=(?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+: )/g;

/** Pronouns in the narration with two possible referents (see the header). */
export function pronounAmbiguity(c: BoardCase, blocks: readonly Block[]): string[] {
  const people = referents(c);
  const sexOf = new Map(people.map((p) => [p.id, p.female]));
  const out: string[] = [];
  // Narration sentences, in order; a chapter heading starts again.
  let prior: { id: string; at: number }[][] = [];
  for (const b of blocks) {
    if (b.kind !== 'prose') continue;
    if (b.voice === 'chapter') {
      prior = [];
      continue;
    }
    let inQ = false;
    for (const s of sentencesOf(b.text)) {
      const narr = narrationOf(s, inQ);
      for (const ch of s) {
        if (ch === '“') inQ = true;
        if (ch === '”') inQ = false;
      }
      if (!/[A-Za-z]/.test(narr)) continue;
      const here = namesAt(c, narr);
      // A list's entries ("Hargrove: an IOU…; Lathrop: …") each stand alone: a pronoun in one is
      // its heading's, or nobody's on the page.
      const entries = ENTRY.test(narr) ? [0, ...[...narr.matchAll(ENTRY_SEAM)].map((x) => (x.index ?? 0) + 2)] : null;
      for (const m of narr.matchAll(PRONOUN)) {
        const word = (m[1] as string).toLowerCase();
        if (word === 'himself' || word === 'herself' || word === 'hers') continue;
        const female = word === 'she' || word === 'her';
        const at = m.index ?? 0;
        const object = word === 'him' || (word === 'her' && herIsObject(narr.slice(at + word.length), narr.slice(0, at)));
        const from = entries ? Math.max(...entries.filter((e) => e <= at)) : 0;
        const local = new Set(here.filter((x) => x.at >= from && x.at < at && sexOf.get(x.id) === female).map((x) => x.id));
        if (object) {
          const head = clauseHead(narr, here, at);
          if (head) local.delete(head);
        }
        let cands = local;
        // Named after it in its own sentence, and nobody else of that sex in it: "From her post Mrs.
        // Rafferty could see the stairs."
        const after = new Set(here.filter((x) => x.at > at && sexOf.get(x.id) === female).map((x) => x.id));
        if (local.size === 0 && after.size === 1) continue;
        if (local.size === 0 && indefiniteFor(narr.slice(from, at), female) && !here.some((x) => x.at >= from && x.at < at)) continue;
        if (local.size === 0 && !entries) {
          cands = new Set<string>();
          for (const ns of prior.slice(-1)) for (const x of ns) if (sexOf.get(x.id) === female) cands.add(x.id);
        }
        if (cands.size >= 2) out.push(`“${m[1]}” could be ${[...cands].map((id) => people.find((p) => p.id === id)?.short).join(' or ')}: ${s.slice(0, 90)}`);
      }
      prior.push(here);
    }
  }
  return out;
}

/** docs/49 §2's joins, as the page says them. */
export const JOINS: { name: string; re: RegExp }[] = [
  { name: 'but', re: /(?:^|[.!?]\s+)But\b|, but\b/ },
  { name: 'so', re: /(?:^|[.!?]\s+)So\b/ },
  { name: 'which was what', re: /\bwhich was what\b/ },
  { name: 'same as said', re: /\bsame as (?:he|she|they|[A-Z][\w.’]*(?: [A-Z][\w’]*)?)(?:’d)? said\b/ },
  { name: 'would swear', re: /\bwould swear to it\b|\bwould say so to anybody\b|\bon (?:his|her|[A-Z][\w.’]*(?: [A-Z][\w’]*)?’s) word\b|\b[Bb]y (?:his|her|[A-Z][\w.’]*(?: [A-Z][\w’]*)?’s|the [a-z ]+’s) count\b/ },
  { name: 'one wrong', re: /\bOne of them was wrong\b|\bonly one of them could stand\b|\bcouldn’t both be true\b|\bonly one could stand\b/ },
  { name: 'that left', re: /\bThat left\b|\bwhich cleared\b/ },
  { name: 'that put', re: /\bThat put\b/ },
];

/** The joins in a page's fact units (the narration of them). */
export function joinsIn(units: readonly Unit[]): string[] {
  const out: string[] = [];
  for (const u of units) {
    if (u.kind !== 'fact') continue;
    const narr = u.text.replace(/“[^”]*”/g, ' ');
    for (const j of JOINS) if (j.re.test(narr)) out.push(j.name);
  }
  return out;
}

/** Sentences the fact units take, and how many fact units there are. */
export function factSentences(units: readonly Unit[]): { sentences: number; units: number } {
  let sentences = 0;
  let n = 0;
  for (const u of units) {
    if (u.kind !== 'fact') continue;
    n++;
    sentences += sentencesOf(u.text).length;
  }
  return { sentences, units: n };
}

const STOP = new Set('the a an and or but of to in on at by for with from was were had has have his her him he she it its i me my we you your they them their there here that this then than so as not no nobody somebody something anybody anything what who when where which if into out up down over about after before just only all one two three said says like be been is are did do does would could went came got'.split(' '));

/** Three-word runs with two content words that aren't names: what a restatement would share. */
function grams(text: string, names: ReadonlySet<string>): Set<string> {
  const ws = text.toLowerCase().replace(/[“”"]/g, ' ').split(/[^a-z’'-]+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < ws.length; i++) {
    const g = ws.slice(i, i + 3);
    if (g.filter((w) => w.length >= 3 && !STOP.has(w) && !names.has(w.replace(/’s$/, ''))).length >= 2) out.add(g.join(' '));
  }
  return out;
}

/**
 * The why-here of `page` saying again what the hand-off of `prev` said: the same pointer (the same
 * person or place, and the same hour, three of them between the two), or the same words that
 * aren't names. A frame both happen to use ("that was worth the walk") isn't a pointer said twice.
 */
export function restatedPointer(c: BoardCase, prev: Page | undefined, page: Page): string | null {
  const hand = (prev?.board?.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'hand-off').map((u) => u.text).join(' ');
  const why = (page.board?.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'why-here').map((u) => u.text).join(' ');
  if (!hand || !why) return null;
  const has = (t: string, x: string) => new RegExp(`\\b${esc(x)}\\b`).test(t);
  const people = c.people.filter((p) => !p.object && has(hand, p.short) && has(why, p.short)).map((p) => p.short);
  const places = c.places.filter((p) => has(hand, p.short) && has(why, p.short)).map((p) => p.short);
  const hours = ['seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'].filter((h) => has(hand, h) && has(why, h));
  if (hours.length > 0 && people.length + places.length > 0 && people.length + places.length + hours.length >= 3) return `${[...people, ...places, ...hours].join(', ')}: ${why.slice(0, 80)}`;
  const names = new Set<string>();
  for (const p of c.people) for (const w of p.short.toLowerCase().split(/[^a-z’'-]+/)) if (w) names.add(w);
  for (const p of c.places) for (const w of `${p.short} ${p.name} ${p.street}`.toLowerCase().split(/[^a-z’'-]+/)) if (w) names.add(w.replace(/’s$/, ''));
  for (const w of FRAME) names.add(w);
  const a = grams(hand, names);
  const shared = [...grams(why, names)].filter((g) => a.has(g));
  return shared.length ? `“${shared[0]}”: ${why.slice(0, 80)}` : null;
}

/** The words of the frames a why-here or a hand-off is said in, not of the pointer. */
const FRAME = ['worth', 'walk', 'reason', 'enough', 'wanted', 'next', 'rest', 'evening', 'look', 'thread', 'pull', 'settled', 'going', 'where', 'went', 'meant', 'ask', 'asked', 'question', 'hear', 'tell'];
