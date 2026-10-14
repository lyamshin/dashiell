/**
 * docs/50 §7 (phase 2a): the public-domain prose under `corpus/raw/`, cleaned
 * to the book's own character set, for the tiny model's first stage of
 * pretraining (plain period English before the game's voice).
 *
 * Kept: Hammett (the four Standard Ebooks texts), Daly's *The White Circle*
 * (a cleaned OCR) and Hecht's *A Thousand and One Afternoons in Chicago*
 * (Gutenberg), whole; the WPA Guide to New York City (OCR) only where a
 * paragraph is running prose (no page references, few figures, the words
 * spelled). Left out: Lardner's *You Know Me Al*, which is spelled and
 * punctuated wrong on purpose (a busher's letters, speech without quotation
 * marks); and the three years of *Evening World* pages, which are headline
 * fragments in raw newspaper OCR ("tho", "havo", "mado"). `corpus/MANIFEST.md`
 * has where each came from.
 *
 * The book's text has no dashes, ellipses or accents but é, so the prose is
 * brought to it: a dash becomes a comma, an ellipsis a full stop, straight
 * quotes curl, small capitals (the WPA's landmark names) become title case,
 * and a paragraph with any other character left in is dropped.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Every character the book's own text uses beyond printable ASCII (the phase-1 tokenizer's set). */
export const BOOK_EXTRA_CHARS = '¢¶×é‘’“”◆';

const ALLOWED = new Set<string>([...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)), ...BOOK_EXTRA_CHARS]);

export interface PdSource {
  file: string;
  /** OCR text: a paragraph is kept only when its lowercase words are spelled (see `spelled`). */
  ocr: boolean;
  /** A guidebook: running prose only (no page references, few figures, longer paragraphs). */
  guide?: boolean;
  /** Hard-wrapped (Gutenberg): a paragraph runs over several lines, and blank lines part them. Else one a line. */
  wrapped?: boolean;
}

export const PD_SOURCES: PdSource[] = [
  { file: 'fiction/hammett-red-harvest-1929.txt', ocr: false },
  { file: 'fiction/hammett-dain-curse-1929.txt', ocr: false },
  { file: 'fiction/hammett-maltese-falcon-1930.txt', ocr: false },
  { file: 'fiction/hammett-continental-op-stories-1923-1930.txt', ocr: false },
  { file: 'fiction/hecht-thousand-one-afternoons-chicago-1922.txt', ocr: false, wrapped: true },
  { file: 'fiction/daly-white-circle-1926.txt', ocr: true },
  { file: 'period/wpa-guide-new-york-city-1939.txt', ocr: true, guide: true },
];

export const PD_LEFT_OUT = [
  'fiction/lardner-you-know-me-al-1916.txt',
  'period/evening-world-1920-selected-pages.txt',
  'period/evening-world-1921-selected-pages.txt',
  'period/evening-world-1922-selected-pages.txt',
];

/** Straight quotes to curly, as the book sets them. */
function curlQuotes(s: string): string {
  return s
    .replace(/(^|[\s(\[—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s(\[—–-])'(?=[A-Za-z])/g, '$1‘')
    .replace(/'/g, '’');
}

/** One paragraph, brought to the book's characters; null when something is left that it never uses. */
export function normalizeParagraph(p: string): string | null {
  let s = p
    .replace(/[\u2060\u200a\u200b\ufeff]/g, '')
    .replace(/[\u00a0\u2009\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Accents the book never sets come off ("naïve", "crêpe"); é stays ("café").
  s = s
    .replace(/é/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/\u0001/g, 'é');
  s = curlQuotes(s);
  s = s
    .replace(/[\u2011\u2010]/g, '-')
    .replace(/(\d)[–‒](\d)/g, '$1-$2')
    .replace(/\s*(?:\.\s?){3,}|\s*…/g, '.')
    // A speech broken off (“Now—”) ends in a full stop; any other dash is a comma.
    .replace(/\s*(?:—|--+)”/g, '.”')
    .replace(/\s*(?:—|―|⸺|⸻|--+|–|‒)\s*/g, ', ')
    // What a dash next to other punctuation leaves behind.
    .replace(/([“‘(]), /g, '$1')
    .replace(/, ([,.;:!?”’)])/g, '$1')
    .replace(/([.;:!?]), /g, '$1 ')
    .replace(/^, /, '')
    .replace(/, $/, '.')
    .replace(/\.\.+/g, '.')
    .replace(/ {2,}/g, ' ')
    .trim();
  for (const ch of s) if (!ALLOWED.has(ch)) return null;
  return s;
}

/** A word of capitals (two letters or more, not a Roman numeral run), as a name is written: "EMPIRE" → "Empire". */
function titleCaseCaps(s: string): string {
  return s.replace(/\b([A-Z])([A-Z’']+)\b/g, (m, a: string, b: string) => (/^[IVXLC]+$/.test(m) ? m : a + b.toLowerCase()));
}

const words = (s: string): string[] => s.match(/[A-Za-z]+(?:[’'][A-Za-z]+)*/g) ?? [];

/** The share of a paragraph's lowercase words that a clean text also has: OCR damage shows as words nobody spells. */
export function spelled(p: string, vocab: ReadonlySet<string>): number {
  const ws = words(p).filter((w) => /^[a-z]/.test(w));
  if (ws.length === 0) return 0;
  return ws.filter((w) => vocab.has(w.replace(/[’']s$/, ''))).length / ws.length;
}

function paragraphs(text: string, wrapped: boolean): string[] {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/);
  return wrapped ? blocks.map((b) => b.split('\n').join(' ')) : blocks.flatMap((b) => b.split('\n'));
}

/** A paragraph ends a sentence (or opens a quotation: "she said:"). */
const ENDS = /[.!?:][”’]?$|[.!?,][”’]$/;

/** OCR damage a vocabulary can't see: letters and figures in one word ("i6l", "3Oth"), but not "42d" or "14th". */
const MIXED = /\b(?![0-9]+(?:st|nd|rd|th|d)\b)(?=[A-Za-z]*[0-9])(?=[0-9]*[A-Za-z])[A-Za-z0-9]{2,}\b|\b[a-z]*[A-Z]+[a-z]+[A-Z]\w*\b|\blI\b|\bIl\b|(?<![\w.])T [a-z]/;

/** Paragraphs a page break cut in two: one that stops mid-sentence, then one that starts in lowercase. */
function rejoin(paras: string[]): string[] {
  const out: string[] = [];
  for (const raw of paras) {
    const p = raw.replace(/\s+/g, ' ').trim();
    const prev = out[out.length - 1];
    if (prev !== undefined && p && /^[a-z]/.test(p) && prev && !/[.!?:][”’]?$/.test(prev)) out[out.length - 1] = `${prev} ${p}`;
    else out.push(p);
  }
  return out;
}

export interface PdChunk {
  file: string;
  text: string;
}

export interface PdStats {
  file: string;
  paragraphs: number;
  kept: number;
  bytes: number;
}

/**
 * The kept paragraphs, joined with " ¶ " into chunks of about a page (up to
 * `maxChars`); a chunk ends wherever a paragraph was dropped, so a chunk never
 * runs across a heading or a gap.
 */
export function pdChunks(root: string, cleanVocab: ReadonlySet<string>, maxChars = 1200): { chunks: PdChunk[]; stats: PdStats[] } {
  const chunks: PdChunk[] = [];
  const stats: PdStats[] = [];
  for (const src of PD_SOURCES) {
    const text = readFileSync(join(root, src.file), 'utf8');
    const paras = rejoin(paragraphs(text, src.wrapped === true));
    const st: PdStats = { file: src.file, paragraphs: paras.length, kept: 0, bytes: 0 };
    let cur: string[] = [];
    let len = 0;
    const flush = (): void => {
      if (cur.length) chunks.push({ file: src.file, text: cur.join(' ¶ ') });
      cur = [];
      len = 0;
    };
    for (const raw of paras) {
      let p = raw.replace(/\s+/g, ' ').trim();
      if (src.guide) p = titleCaseCaps(p);
      const n = normalizeParagraph(p);
      const ws = n ? words(n) : [];
      const keep =
        n !== null &&
        // A line of speech can be one word ("“Yes.”"); anything else is three or more.
        (ws.length >= 3 || (ws.length >= 1 && n.startsWith('“'))) &&
        ENDS.test(n) &&
        // A heading, a chapter number, a title in capitals.
        !/^[^a-z]*$/.test(n) &&
        (!src.ocr || (spelled(n, cleanVocab) >= 0.92 && !MIXED.test(n))) &&
        (!src.guide || (ws.length >= 20 && !/\(see|\bpage \d|\bpp?\.\s?\d|\bTel\.|\bAdmission\b|\bHours?:|\$/i.test(n) && (n.match(/\d/g) ?? []).length <= n.length / 60 && (n.match(/\b(?:St|Sts|Ave|Aves|Blvd|Pl|Rd)\./g) ?? []).length <= 3));
      if (!keep || n === null) {
        flush();
        continue;
      }
      st.kept++;
      st.bytes += Buffer.byteLength(n, 'utf8') + 1;
      if (len + n.length > maxChars && cur.length) flush();
      cur.push(n);
      len += n.length + 3;
    }
    flush();
    stats.push(st);
  }
  return { chunks, stats };
}

/** The lowercase words of the clean texts (no OCR): what the OCR'd texts are spelled against. */
export function cleanVocabulary(root: string, extra: readonly string[]): Set<string> {
  const v = new Set<string>();
  const add = (t: string): void => {
    for (const w of words(t)) if (/^[a-z]/.test(w)) v.add(w.replace(/[’']s$/, '').replace(/'/g, '’'));
  };
  for (const src of PD_SOURCES) if (!src.ocr) add(curlQuotes(readFileSync(join(root, src.file), 'utf8')));
  for (const t of extra) add(t);
  // The same words with a straight apostrophe, since the OCR'd texts are curled after the check.
  for (const w of [...v]) if (w.includes('’')) v.add(w.replace(/’/g, "'"));
  return v;
}
