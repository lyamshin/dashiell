/**
 * docs/50 §2 and §7: the pretraining corpus for the tiny model, one page per line.
 *
 * `npx tsx scripts/model-corpus.ts [--nights 2000] [--out model/data] [--cap 1]`
 *
 * Five sources, each cleaned to plain text, paragraphs joined by " ¶ ", one
 * page (or one card, one golden section, one chunk of a book) per line:
 *
 * - **goldens** (`docs/golden/`): the hand-written pages. Where a golden quotes
 *   its pages (`> …`), the quotes; where it is prose (`seed3-opening*.md`), the
 *   paragraphs. A section (`## …`) is a line. The design notes in a golden
 *   (the preamble, the rules and notes sections, italic paragraphs, lists,
 *   tables, code, card ids in brackets) are left out, and so are the files
 *   that are measurements rather than pages (`GAP.md`, `REPORT.md`,
 *   `rounds.md`, `seed3-current.txt`).
 * - **cards** (`content/board/`, `content/decks/`): every string of five words
 *   or more, with the common slots filled in plainly ({name} → "the man",
 *   {client} → "my client"); a card with a slot left over is skipped.
 * - **the bible** (`content/neighbourhood/people.json`, `places.json`): every
 *   line of five words or more; what a person says is set in quotes.
 * - **engine nights**: the page bodies `npm run read -- --seed S --tier T
 *   [--world neighbourhood] [--random] --no-choices` prints, built in process
 *   with the same calls (`dealBoard`, `playBoardOracle` / `playWanderer`, the
 *   pages' prose blocks), over both worlds and every tier, the case types each
 *   tier builds in turn, two nights in three on the oracle's route and one on
 *   the wanderer's. The chapter heading and the bracketed notes are left out,
 *   as they are not prose. **Deduped** (phase 2a): the engine deals the same
 *   cards night after night, and phase 1's model learned them by heart; so
 *   the training nights keep one copy of each page and one copy of each
 *   sentence (`dedupeNights`).
 * - **public domain** (`corpus/raw/`): Hammett, Daly, Hecht and the WPA guide's
 *   running prose, brought to the book's characters (`model-corpus-pd.ts`).
 *
 * Writes `model/data/raw/` (each source as it came, the nights tagged
 * world/tier/seed/type/route), `model/data/<source>.train.txt` and
 * `<source>.val.txt` for each source (exact duplicate lines dropped across
 * sources; held out: one night in twenty, by seed, whole; one line in twenty
 * of the cards, the bible and the public domain, by hash; seven of the 49
 * golden sections), and `model/data/corpus.json` (the counts). How the sources
 * are weighted into the two training stages is `model/prepare.py`'s. The text
 * files are gitignored and rebuilt by this script; the counts are committed.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { typesFor } from '../src/gen/board/index.js';
import type { TierIndex } from '../src/gen/board/types.js';
import { dealBoard } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import type { Page } from '../src/game/board/types.js';
import { sentencesOf } from '../src/game/board/model/verifier.js';
import { cleanVocabulary, PD_LEFT_OUT, pdChunks } from './model-corpus-pd.js';

const PARA = ' ¶ ';

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : dflt;
}

/** One line of plain text: straight whitespace, no markdown emphasis. */
export function clean(s: string): string {
  return s
    .replace(/\r/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(“"])\*([^*\n]+)\*(?=[\s.,;:!?)”"’]|$)/g, '$1$2')
    .replace(/(^|[\s(“"])_([^_\n]+)_(?=[\s.,;:!?)”"’]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[ \t\n ]+/g, ' ')
    .trim();
}

/** Straight quotes to the book's curly ones, so the corpus has one spelling of each. */
export function curl(s: string): string {
  return s
    .replace(/(^|[\s(\[—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s(\[—–-])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/--/g, '—');
}

function joinParas(paras: string[]): string {
  return paras.map(clean).filter(Boolean).join(PARA);
}

/* ------------------------------------------------------------------ goldens */

const GOLDEN_SKIP = new Set(['GAP.md', 'REPORT.md', 'rounds.md', 'seed3-current.txt']);
const NOT_PAGES = /rules|notes|^##+ what |how a sheet|questions|the beats/i;

function goldenLines(dir: string): { file: string; line: string }[] {
  const out: { file: string; line: string }[] = [];
  for (const f of readdirSync(dir).sort()) {
    if (GOLDEN_SKIP.has(f) || !f.endsWith('.md')) continue;
    const text = readFileSync(join(dir, f), 'utf8');
    const quoted = /^>/m.test(text);
    // Sections by "## ", paragraphs by blank lines (a blank quote line, ">", is a break too). The
    // preamble before the first heading is the doc's own note, and the sections about the golden
    // ("The rules", "Professor's notes", "What sheets need", "Questions for the designer") are not pages.
    const parts = text.split(/^(##+ .*)$/m);
    const sections: string[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      if (!NOT_PAGES.test(parts[i] as string)) sections.push(parts[i + 1] ?? '');
    }
    for (const sec of sections) {
      const paras: string[] = [];
      let cur: string[] = [];
      let inCode = false;
      const flush = () => {
        if (cur.length) paras.push(cur.join(' '));
        cur = [];
      };
      for (const raw of sec.split('\n')) {
        if (raw.startsWith('```')) {
          inCode = !inCode;
          flush();
          continue;
        }
        if (inCode) continue;
        if (quoted) {
          if (!raw.startsWith('>')) {
            flush();
            continue;
          }
          const body = raw.replace(/^>\s?/, '');
          // A note in a quote ("> **Note, …**") is the designer's, not the page's.
          if (body.trim() === '' || /^\*\*Note\b/.test(body) || /^[-*] /.test(body.trim())) {
            flush();
            continue;
          }
          cur.push(body);
        } else {
          const t = raw.trim();
          if (t === '' || t.startsWith('#') || t.startsWith('|') || /^[-*] /.test(t) || /^---+$/.test(t) || (/^\*.*\*$/.test(t) && !/^\*\*/.test(t))) {
            flush();
            continue;
          }
          cur.push(t);
        }
      }
      flush();
      // A card id in brackets ("[pam-101, short form of establish]") marks where a card went.
      const line = joinParas(paras.map((p) => curl(p.replace(/\s*\*?\[[a-z]{2,4}-\d+[^\]]*\]\*?/g, ''))));
      if (line.split(' ').length >= 8) out.push({ file: f, line });
    }
  }
  return out;
}

/* -------------------------------------------------------------------- cards */

const FILL: Record<string, (f: boolean) => string> = {
  name: (f) => (f ? 'the woman' : 'the man'),
  Name: (f) => (f ? 'The woman' : 'The man'),
  NameSubj: (f) => (f ? 'The woman' : 'The man'),
  he: (f) => (f ? 'she' : 'he'),
  He: (f) => (f ? 'She' : 'He'),
  his: (f) => (f ? 'her' : 'his'),
  His: (f) => (f ? 'Her' : 'His'),
  him: (f) => (f ? 'her' : 'him'),
  client: () => 'my client',
  Client: () => 'My client',
  victim: () => 'the dead man',
  Victim: () => 'The dead man',
  watcher: () => 'the doorman',
  place: () => 'the place',
  Place: () => 'The place',
  thing: () => 'the thing',
  Thing: () => 'The thing',
  street: () => 'the street',
  Street: () => 'The street',
  job: () => 'clerk',
  witness: () => 'the witness',
  Witness: () => 'The witness',
};

const PLACE_FILL: Record<string, string> = { name: 'the place', Name: 'The place', NameSubj: 'The place' };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function fillSlots(text: string, key: string, place: boolean): string | null {
  const female = hash(key) % 2 === 1;
  const out = text.replace(/\{([A-Za-z]+)\}/g, (m, k: string) => {
    if (place && PLACE_FILL[k]) return PLACE_FILL[k] as string;
    const f = FILL[k];
    return f ? f(female) : m;
  });
  if (/[{}]/.test(out)) return null;
  // A slot that opened a sentence opens it with a capital.
  return out.replace(/(^|[.!?][”’]?\s+|[“]\s*)(the|my|she|he|her|his|him) /g, (_m, pre: string, w: string) => `${pre}${w[0]?.toUpperCase()}${w.slice(1)} `);
}

const SKIP_KEYS = new Set(['id', 'family', 'deck', 'status', 'tags', 'kind', 'role', 'short', 'citation', 'register', 'term', 'gloss', 'setting', 'band', 'weather']);

function strings(v: unknown, key: string, path: string[], out: { text: string; path: string[] }[]): void {
  if (typeof v === 'string') {
    if (!SKIP_KEYS.has(key)) out.push({ text: v, path });
    return;
  }
  if (Array.isArray(v)) {
    v.forEach((x, i) => strings(x, key, [...path, String(i)], out));
    return;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (SKIP_KEYS.has(k)) continue;
      strings(x, k, [...path, k], out);
    }
  }
}

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

function cardLines(dirs: string[]): { lines: string[]; skipped: number } {
  const lines: string[] = [];
  let skipped = 0;
  for (const dir of dirs) {
    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith('.json')) continue;
      const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown;
      const cards = Array.isArray(data) ? data : [data];
      for (const card of cards) {
        const id = (card as { id?: string }).id ?? f;
        const place = f === 'places.json' || f === 'entrances.json';
        const found: { text: string; path: string[] }[] = [];
        strings(card, '', [], found);
        for (const s of found) {
          if (words(s.text) < 5 || !/[a-z]/.test(s.text)) continue;
          const filled = fillSlots(s.text, `${id}:${s.path.join('.')}`, place);
          if (filled === null) {
            skipped++;
            continue;
          }
          lines.push(clean(curl(filled)));
        }
      }
    }
  }
  return { lines, skipped };
}

/* -------------------------------------------------------------------- bible */

function bibleLines(dir: string): string[] {
  const out: string[] = [];
  for (const f of ['people.json', 'places.json']) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown;
    const found: { text: string; path: string[] }[] = [];
    strings(data, '', [], found);
    for (const s of found) {
      if (words(s.text) < 5 || !/[a-z]/.test(s.text)) continue;
      const spoken = s.path.includes('voice') || s.path[s.path.length - 1] === 'counts';
      const t = clean(curl(s.text));
      out.push(spoken && !t.startsWith('“') ? `“${t}”` : t);
    }
  }
  return out;
}

/* ------------------------------------------------------------------- nights */

function pageLine(p: Page): string {
  const paras = p.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'chapter' ? [b.text] : []));
  return joinParas(paras);
}

interface NightSpec {
  seed: number;
  tier: TierIndex;
  world?: string;
  random: boolean;
}

/** 2,000 nights: both worlds, every tier, seeds 1.., two in three on the oracle's route. */
export function nightSpecs(n: number): NightSpec[] {
  const worlds: (string | undefined)[] = [undefined, 'neighbourhood'];
  const cells = worlds.length * 6;
  const per = Math.ceil(n / cells);
  const out: NightSpec[] = [];
  for (let s = 1; s <= per; s++) {
    for (const world of worlds) {
      for (let t = 0; t < 6; t++) {
        if (out.length >= n) return out;
        out.push({ seed: s, tier: t as TierIndex, ...(world ? { world } : {}), random: s % 3 === 0 });
      }
    }
  }
  return out;
}

function nightLines(n: number): { lines: string[]; nights: number; failed: number; tagged: string[] } {
  const lines: string[] = [];
  const tagged: string[] = [];
  let nights = 0;
  let failed = 0;
  const specs = nightSpecs(n);
  const t0 = Date.now();
  for (const sp of specs) {
    const types = typesFor(sp.tier);
    const type = types[sp.seed % types.length];
    try {
      const d = dealBoard(sp.seed, sp.tier, type, sp.world ? { world: sp.world } : {});
      const run = sp.random ? playWanderer(d, sp.seed).run : playBoardOracle(d).run;
      const tag = `${sp.world ?? 'dealt'}/${sp.tier}/${sp.seed}/${type}/${sp.random ? 'wanderer' : 'oracle'}`;
      for (const p of run.log) {
        const line = pageLine(p);
        if (line) {
          lines.push(line);
          tagged.push(`${tag}\t${line}`);
        }
      }
      nights++;
    } catch (e) {
      failed++;
      process.stderr.write(`(seed ${sp.seed} tier ${sp.tier} ${sp.world ?? 'dealt'}: ${(e as Error).message.split('\n')[0]})\n`);
    }
    if (nights % 200 === 0 && nights > 0) process.stderr.write(`  ${nights} nights, ${lines.length} pages, ${Math.round((Date.now() - t0) / 1000)} s\n`);
  }
  return { lines, nights, failed, tagged };
}

/* -------------------------------------------------------------- the dedupe */

/** A deterministic shuffle (splitmix32 from a seed). */
function shuffled<T>(xs: readonly T[], seed: number): T[] {
  const out = [...xs];
  let st = seed >>> 0;
  const next = (): number => {
    st = (st + 0x9e3779b9) >>> 0;
    let z = st;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return ((z ^ (z >>> 15)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Sentences of three words or fewer ("Midnight.", "I said.", "Nobody else.") are glue, kept wherever they fall. */
export const GLUE_WORDS = 3;

export interface DedupeStats {
  pages: number;
  distinctPages: number;
  bytes: number;
  sentences: number;
  distinctSentences: number;
  distinctSentenceBytes: number;
  keptPages: number;
  keptBytes: number;
  keptSentences: number;
  /** Glue sentences kept although seen before. */
  glueRepeats: number;
}

/**
 * The engine's pages, one copy of each: exact duplicate pages dropped, then,
 * in a seeded order, every sentence of four words or more kept the first time
 * it comes up and cut from every later page (a paragraph or a page left empty
 * is dropped). The first page to hold a card's sentence keeps it in place;
 * later pages keep what is theirs (the lists, the accounts, the names), with
 * the glue between.
 */
export function dedupeNights(pages: readonly string[], seed = 50, cap = 1): { lines: string[]; stats: DedupeStats } {
  const all = new Map<string, number>();
  let sentences = 0;
  for (const p of pages)
    for (const par of p.split(PARA))
      for (const s of sentencesOf(par)) {
        all.set(s, (all.get(s) ?? 0) + 1);
        sentences++;
      }
  const distinct = [...new Set(pages)];
  const seen = new Map<string, number>();
  const lines: string[] = [];
  let keptSentences = 0;
  let glueRepeats = 0;
  for (const page of shuffled(distinct, seed)) {
    const paras: string[] = [];
    for (const par of page.split(PARA)) {
      const keep: string[] = [];
      for (const s of sentencesOf(par)) {
        const glue = words(s) <= GLUE_WORDS;
        const k = seen.get(s) ?? 0;
        if (glue || k < cap) {
          if (glue && k > 0) glueRepeats++;
          keep.push(s);
          seen.set(s, k + 1);
        }
      }
      if (keep.length) {
        paras.push(keep.join(' '));
        keptSentences += keep.length;
      }
    }
    if (paras.length) lines.push(paras.join(PARA));
  }
  const bytes = (ls: Iterable<string>): number => {
    let b = 0;
    for (const l of ls) b += Buffer.byteLength(l, 'utf8') + 1;
    return b;
  };
  return {
    lines,
    stats: {
      pages: pages.length,
      distinctPages: distinct.length,
      bytes: bytes(pages),
      sentences,
      distinctSentences: all.size,
      distinctSentenceBytes: bytes(all.keys()),
      keptPages: lines.length,
      keptBytes: bytes(lines),
      keptSentences,
      glueRepeats,
    },
  };
}

/* --------------------------------------------------------------------- main */

type Source = 'goldens' | 'cards' | 'bible' | 'pd' | 'nights';
export const SOURCES: Source[] = ['goldens', 'cards', 'bible', 'pd', 'nights'];

function main(): void {
  const n = Number(arg('nights', '2000'));
  const out = arg('out', 'model/data');
  mkdirSync(join(out, 'raw'), { recursive: true });

  const goldens = goldenLines('docs/golden');
  const cards = cardLines(['content/board', 'content/decks']);
  const bible = bibleLines('content/neighbourhood');
  const vocab = cleanVocabulary('corpus/raw', [...goldens.map((g) => g.line), ...cards.lines, ...bible]);
  const pd = pdChunks('corpus/raw', vocab);
  const nights = nightLines(n);

  writeFileSync(join(out, 'raw', 'goldens.tsv'), `${goldens.map((g) => `${g.file}\t${g.line}`).join('\n')}\n`);
  writeFileSync(join(out, 'raw', 'cards.txt'), `${cards.lines.join('\n')}\n`);
  writeFileSync(join(out, 'raw', 'bible.txt'), `${bible.join('\n')}\n`);
  writeFileSync(join(out, 'raw', 'pd.tsv'), `${pd.chunks.map((c) => `${c.file}\t${c.text}`).join('\n')}\n`);
  // The nights keep their tag (world/tier/seed/type/route) so the split can hold out whole nights.
  writeFileSync(join(out, 'raw', 'nights.tsv'), `${nights.tagged.join('\n')}\n`);

  // Held out: one night in twenty, by seed (every world and tier), as in phase 1; one card, bible
  // line and public-domain chunk in twenty, by hash; and of the goldens, phase 1's one in twenty
  // plus about one in eleven more (seven sections in all, from six files), so there is enough of
  // the designer's own prose to score. A line in two sources is kept once, in the first.
  const heldGolden = (l: string): boolean => hash(`goldens:${l}`) % 20 === 0 || hash(`golden-slice:${l}`) % 11 === 0;
  const heldByHash = (src: string, l: string): boolean => hash(`${src}:${l}`) % 20 === 0;
  const nightHeld = (tag: string): boolean => Number(tag.split('/')[2]) % 20 === 0;

  const split = Object.fromEntries(SOURCES.map((s) => [s, { train: [] as string[], val: [] as string[] }])) as Record<Source, { train: string[]; val: string[] }>;
  const seen = new Set<string>();
  const add = (src: Source, l: string, held: boolean): void => {
    if (seen.has(l)) return;
    seen.add(l);
    split[src][held ? 'val' : 'train'].push(l);
  };
  for (const g of goldens) add('goldens', g.line, heldGolden(g.line));
  for (const l of cards.lines) add('cards', l, heldByHash('cards', l));
  for (const l of bible) add('bible', l, heldByHash('bible', l));
  for (const c of pd.chunks) add('pd', c.text, heldByHash('pd', c.text));
  // The nights: held-out nights whole, as the engine deals them (less any page a training night
  // also has); the training nights deduped.
  const trainPages: string[] = [];
  nights.tagged.forEach((t, i) => {
    const line = nights.lines[i] as string;
    if (nightHeld(t.split('\t')[0] as string)) add('nights', line, true);
    else trainPages.push(line);
  });
  const trainPageSet = new Set(trainPages);
  split.nights.val = split.nights.val.filter((l) => !trainPageSet.has(l));
  // --cap N keeps up to N copies of each sentence instead of one (an experiment: docs/50 §7).
  const dd = dedupeNights(trainPages, 50, Number(arg('cap', '1')));
  split.nights.train = dd.lines.filter((l) => !seen.has(l));

  const bytes = (ls: string[]): number => ls.reduce((s, l) => s + Buffer.byteLength(l, 'utf8') + 1, 0);
  const counts: Record<string, { train: number; trainBytes: number; val: number; valBytes: number }> = {};
  for (const src of SOURCES) {
    const sv = split[src];
    writeFileSync(join(out, `${src}.train.txt`), `${sv.train.join('\n')}\n`);
    writeFileSync(join(out, `${src}.val.txt`), `${sv.val.join('\n')}\n`);
    counts[src] = { train: sv.train.length, trainBytes: bytes(sv.train), val: sv.val.length, valBytes: bytes(sv.val) };
  }
  const summary = {
    nights: nights.nights,
    nightsFailed: nights.failed,
    cardsSkipped: cards.skipped,
    nightsDedupe: dd.stats,
    goldensHeldOut: goldens.filter((g) => heldGolden(g.line)).map((g) => `${g.file}: ${g.line.slice(0, 60)}`),
    pd: { kept: pd.stats, leftOut: PD_LEFT_OUT, chunks: pd.chunks.length },
    counts,
  };
  writeFileSync(join(out, 'corpus.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
