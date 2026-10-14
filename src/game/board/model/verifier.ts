/**
 * docs/50 §1: the verifier. A gap is texture; facts stay in the locked units.
 * So a gap the model wrote is rejected when it has:
 *
 * - **a person's or a place's name**: the night's own (`names`, `places`),
 *   any name either world can deal (the name pools, the venues and houses,
 *   the bible's people and places), and any capitalised word that doesn't open
 *   a sentence (a name the model made up), or an honorific;
 * - **an hour**: seven to twelve as words, midnight, noon, o'clock, half past,
 *   a quarter to; one to six where they read as a time ("at two", "till four");
 * - **a digit**;
 * - **"nobody else"** (no one else, not a soul else): that's a list's fact;
 * - **a means or a clue**: any word for a murder's means (the words
 *   `src/gen/board/world/means.ts` reads a means from, and the generator's
 *   poison and gun), and the night's own clue words (`facts`: the lost thing,
 *   the pet's name, what was found). The first pretrained model's commonest
 *   bad gap was a means sentence with no name in it ("The laudanum had come
 *   from here."), which nothing else here catches;
 * - **a banned phrase**: the prose lints (`BANNED`, docs/47 C14), the book's
 *   machinery (`machineryIn`, docs/26), a verdict above its level
 *   (`OVERSTEP`, docs/46) and the plain-terms list (`content/plain-terms.json`);
 * - **a repeat** of a sentence already on the page, or of itself;
 * - **the wrong shape**: outside the length bounds (8–40 tokens when a token
 *   count is given, else 5–32 words), more than two sentences, not opening a
 *   sentence, not ending one, unbalanced quotes, a paragraph mark, a special
 *   token or a character the tokenizer didn't know.
 *
 * On a rejection the caller resamples once, then takes the card default.
 *
 * Pure: it reads the text and the lists.
 */

import plainTermsJson from '../../../../content/plain-terms.json';
import biblePeopleJson from '../../../../content/neighbourhood/people.json';
import biblePlacesJson from '../../../../content/neighbourhood/places.json';
import { NAME_POOLS } from '../../../gen/board/names.js';
import { LOST_SCENES, NIGHT_SHIFTS, ROOMING, SCENE_HOMES, UNWATCHED, VENUES, WORKPLACES } from '../../../gen/board/content.js';
import { BANNED } from '../prose-lint.js';
import { machineryIn } from '../reader-lint.js';
import { OVERSTEP } from '../lint.js';

export interface GapContext {
  /** The night's people, as the page writes them: "Corrigan", "Mrs. Krantz", "Nora Hanrahan". */
  names?: readonly string[];
  /** The night's places and streets. */
  places?: readonly string[];
  /** The night's clue words: the lost thing, the pet's name, the means as dealt, what was found. */
  facts?: readonly string[];
  /** The page so far (and after), as text; a gap may not repeat any sentence of it. */
  page?: readonly string[];
  /** The tokenizer's count, when there is one: the bounds are then in tokens. */
  countTokens?: (text: string) => number;
  minTokens?: number;
  maxTokens?: number;
  minWords?: number;
  maxWords?: number;
  maxSentences?: number;
}

export interface GapVerdict {
  ok: boolean;
  reasons: string[];
}

/* ------------------------------------------------------------- the lexicon */

/** Capitalised words in the place and name lists that are ordinary words, not names. */
const GENERIC = new Set(
  'The A An Street Avenue Place Square Row Lane Alley Hall House Rooms Room Hotel Theater Theatre Bar Club Cafe Café East West North South Lower Upper Side Old New Little Big Grand St Mr Mrs Miss Dr Saint Market Building Flats Apartments Bakery Laundry Exchange Pharmacy Studio Surgery Office Shop Store Works Yard Pier Dock Bank Church Station Bridge Park Garden Gardens Restaurant Saloon Chop'.split(
    ' ',
  ),
);

function capitalWords(s: string): string[] {
  return (s.match(/[A-Z][A-Za-z\u00C0-\u024F]+(?:[’'][A-Za-z]+)*/g) ?? []).map((w) => w.replace(/[’']s$/, '')).filter((w) => !GENERIC.has(w));
}

function stringsUnder(v: unknown, keys: ReadonlySet<string>, out: string[], key = ''): void {
  if (typeof v === 'string') {
    if (keys.has(key)) out.push(v);
  } else if (Array.isArray(v)) {
    for (const x of v) stringsUnder(x, keys, out, key);
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) stringsUnder(x, keys, out, k);
  }
}

let LEXICON: Set<string> | null = null;

/** Every name either world can deal, word by word: given names, family names, places, streets. */
export function nameLexicon(): Set<string> {
  if (LEXICON) return LEXICON;
  const raw: string[] = [];
  for (const p of NAME_POOLS) raw.push(...p.given.male, ...p.given.female, ...p.family);
  const keys = new Set(['name', 'short', 'street', 'tail', 'first', 'last']);
  stringsUnder([VENUES, NIGHT_SHIFTS, WORKPLACES, ROOMING, SCENE_HOMES, LOST_SCENES, UNWATCHED], keys, raw);
  stringsUnder(biblePeopleJson, new Set(['first', 'last']), raw);
  stringsUnder(biblePlacesJson, new Set(['name', 'street']), raw);
  LEXICON = new Set(raw.flatMap(capitalWords));
  return LEXICON;
}

/* ---------------------------------------------------------- the plain terms */

interface PlainTerm {
  term: string;
  res: RegExp[];
  allow: RegExp[];
}

let PLAIN: PlainTerm[] | null = null;

function plainTerms(): PlainTerm[] {
  if (PLAIN) return PLAIN;
  const raw = plainTermsJson as unknown as { terms: { term: string; patterns: string[]; allow?: { pattern: string }[] }[] };
  PLAIN = raw.terms.map((t) => ({ term: t.term, res: t.patterns.map((p) => new RegExp(p, 'gi')), allow: (t.allow ?? []).map((a) => new RegExp(a.pattern, 'gi')) }));
  return PLAIN;
}

function spans(re: RegExp, text: string): [number, number][] {
  const out: [number, number][] = [];
  re.lastIndex = 0;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    out.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

/** The plain-terms check, as `scripts/plain-terms.mjs` reads the list: a match not inside an allowed sense. */
function jargonIn(text: string): string[] {
  const out: string[] = [];
  for (const t of plainTerms()) {
    const allowed = t.allow.flatMap((re) => spans(re, text));
    for (const re of t.res) {
      for (const [a, b] of spans(re, text)) {
        if (!allowed.some(([x, y]) => x <= a && b <= y)) out.push(t.term);
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ checks */

const HOUR_ANYWHERE = /\b(?:seven|eight|nine|ten|eleven|twelve|midnight|noon|o[’']clock|half past|half after|quarter (?:past|to|after|of)|a\.m\.|p\.m\.)\b/i;
const HOUR_AS_TIME = /\b(?:at|till|until|by|after|before|since|past|from|around|about) (?:one|two|three|four|five|six)\b(?! (?:of|or|more|other|another|times|men|women|people|dollars|days|weeks|years|blocks|steps|flights|minutes|hours)\b)|\b(?:one|two|three|four|five|six) (?:o[’']clock|sharp|in the morning|at night)\b/i;
/** A murder's means, in any of the words the generator and the bible use for one (means.ts), and the generic ones. */
const MEANS = /\b(?:chloral|laudanum|revolver|pistol|guns?|colt|rat poison|arsenic|strychnine|cyanide|prussic|poison(?:ed|ing)?|knife|knives|razor|cleaver|ice pick|sleeping (?:drug|draught|powder)s?|bullets?|blunt object)\b/i;
const NOBODY_ELSE = /\b(?:nobody|no one|no-one|not a soul|not another soul|no other soul|nobody at all) else\b|\bnobody else\b/i;
const HONORIFIC = /\b(?:Mr|Mrs|Ms|Dr|St)\.|\b(?:Miss|Father|Sister|Officer|Sergeant|Patrolman|Captain|Doctor|Uncle|Aunt) [A-Z]/;
/** Capitalised words a gap may use mid-sentence: the narrator, God, the days and months. */
const ALLOWED_CAPS = new Set(
  'I I’d I’m I’ll I’ve I’d’ve God Lord OK Sunday Monday Tuesday Wednesday Thursday Friday Saturday January February March April May June July August September October November December Christmas Easter American Irish Italian Jewish German Polish Russian Yiddish English'.split(' '),
);

/** A word whose full stop doesn't end a sentence: an honorific, a saint, an initial. */
const ABBREVIATION = /(?:^|[\s“‘(])(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Mt|Messrs|[A-Z])\.$/;

/** The sentences of a run of prose: split after . ! ? (and a closing quote), but not after "Mrs." or "J.". */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const piece of text.split(/(?<=[.!?][”’"]?)\s+/)) {
    cur = cur ? `${cur} ${piece}` : piece;
    if (!ABBREVIATION.test(cur)) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Words of the gap with where each sits: whether it opens a sentence (or a quote). */
function wordsWithPlace(text: string): { word: string; opens: boolean }[] {
  const out: { word: string; opens: boolean }[] = [];
  const re = /[A-Za-z\u00C0-\u024F]+(?:[’'][A-Za-z]+)*/g;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    const before = text.slice(0, m.index).replace(/\s+$/, '');
    const opens = before === '' || /[.!?]["”’]?$/.test(before) || /[“"]$/.test(before) || /[.!?,]?\s*[“"]$/.test(before) || /:$/.test(before);
    out.push({ word: m[0], opens });
  }
  return out;
}

export function verifyGap(text: string, ctx: GapContext = {}): GapVerdict {
  const reasons: string[] = [];
  const t = text.trim();

  // The shape.
  if (t === '') return { ok: false, reasons: ['empty'] };
  if (/<\||\|>|�|¶|\n/.test(t)) reasons.push('mark: a special token, paragraph mark or unknown character');
  if (!/^[“"A-Z]/.test(t)) reasons.push('start: does not open a sentence');
  if (!/[.!?][”’"]?$/.test(t)) reasons.push('end: does not finish a sentence');
  const opens = (t.match(/“/g) ?? []).length;
  const closes = (t.match(/”/g) ?? []).length;
  if (opens !== closes || (t.match(/"/g) ?? []).length % 2 === 1) reasons.push('quotes: unbalanced');
  const sentences = sentencesOf(t);
  const maxS = ctx.maxSentences ?? 2;
  if (sentences.length > maxS) reasons.push(`sentences: ${sentences.length} (at most ${maxS})`);
  if (ctx.countTokens) {
    const n = ctx.countTokens(t);
    const lo = ctx.minTokens ?? 8;
    const hi = ctx.maxTokens ?? 40;
    if (n < lo || n > hi) reasons.push(`length: ${n} tokens (${lo}–${hi})`);
  } else {
    const n = t.split(/\s+/).filter(Boolean).length;
    const lo = ctx.minWords ?? 5;
    const hi = ctx.maxWords ?? 32;
    if (n < lo || n > hi) reasons.push(`length: ${n} words (${lo}–${hi})`);
  }

  // Facts that belong to the locked units.
  if (/\d/.test(t)) reasons.push('digit');
  const hour = HOUR_ANYWHERE.exec(t) ?? HOUR_AS_TIME.exec(t);
  if (hour) reasons.push(`hour: ${hour[0]}`);
  if (NOBODY_ELSE.test(t)) reasons.push('nobody else');
  const means = MEANS.exec(t);
  if (means) reasons.push(`means: ${means[0]}`);
  for (const f of ctx.facts ?? []) {
    if (f.trim().length < 3) continue;
    if (new RegExp(`(?<![A-Za-z])${f.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i').test(t)) reasons.push(`fact: ${f.trim()}`);
  }
  const hon = HONORIFIC.exec(t);
  if (hon) reasons.push(`name: ${hon[0]}`);
  for (const n of [...(ctx.names ?? []), ...(ctx.places ?? [])]) {
    const parts = [n, ...capitalWords(n)];
    for (const p of parts) {
      if (p.length < 2) continue;
      const re = new RegExp(`(?<![A-Za-z])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`);
      if (re.test(t)) {
        reasons.push(`name: ${p}`);
        break;
      }
    }
  }
  const lex = nameLexicon();
  for (const { word, opens: atStart } of wordsWithPlace(t)) {
    const bare = word.replace(/[’']s$/, '');
    if (lex.has(bare)) reasons.push(`name: ${bare}`);
    else if (!atStart && /^[A-Z]/.test(word) && !ALLOWED_CAPS.has(word) && !ALLOWED_CAPS.has(bare)) reasons.push(`name: ${word} (capitalised)`);
  }

  // The lints.
  for (const { name, re } of BANNED) if (new RegExp(re.source, re.flags.replace('g', '')).test(t)) reasons.push(`banned: ${name}`);
  for (const m of machineryIn(t)) reasons.push(`machinery: ${m.split(':')[0]}`);
  for (const { name, re } of OVERSTEP) if (re.test(t)) reasons.push(`verdict: ${name}`);
  for (const j of jargonIn(t)) reasons.push(`plain terms: ${j}`);

  // Repeats.
  const seen = new Set<string>();
  for (const p of ctx.page ?? []) for (const s of sentencesOf(p)) seen.add(norm(s));
  const own = new Set<string>();
  for (const s of sentences) {
    const k = norm(s);
    if (k.split(' ').length < 3) continue;
    if (seen.has(k)) reasons.push(`repeat: “${s}”`);
    else if (own.has(k)) reasons.push(`repeat within the gap: “${s}”`);
    own.add(k);
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}
