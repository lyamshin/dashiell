/**
 * docs/50 §2: the pretraining corpus for the tiny model, one page per line.
 *
 * `npx tsx scripts/model-corpus.ts [--nights 2000] [--out model/data]`
 *
 * Four sources, each cleaned to plain text, paragraphs joined by " ¶ ", one
 * page (or one card, or one golden section) per line:
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
 *   as they are not prose.
 *
 * Writes `model/data/raw/` (each source as it came, the nights tagged
 * world/tier/seed/type/route), `model/data/train.txt` and `model/data/val.txt`
 * (all four, exact duplicate lines dropped; held out: one night in twenty, by
 * seed, and one line in twenty of the rest, by hash), `model/data/val.src`
 * (the source of each held-out line), and
 * `model/data/corpus.json` (the counts). The text files are gitignored and
 * rebuilt by this script; the counts are committed.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { typesFor } from '../src/gen/board/index.js';
import type { TierIndex } from '../src/gen/board/types.js';
import { dealBoard } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import type { Page } from '../src/game/board/types.js';

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

function goldenLines(dir: string): string[] {
  const out: string[] = [];
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
      if (line.split(' ').length >= 8) out.push(line);
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

/* --------------------------------------------------------------------- main */

function main(): void {
  const n = Number(arg('nights', '2000'));
  const out = arg('out', 'model/data');
  mkdirSync(join(out, 'raw'), { recursive: true });

  const goldens = goldenLines('docs/golden');
  const cards = cardLines(['content/board', 'content/decks']);
  const bible = bibleLines('content/neighbourhood');
  const nights = nightLines(n);

  writeFileSync(join(out, 'raw', 'goldens.txt'), `${goldens.join('\n')}\n`);
  writeFileSync(join(out, 'raw', 'cards.txt'), `${cards.lines.join('\n')}\n`);
  writeFileSync(join(out, 'raw', 'bible.txt'), `${bible.join('\n')}\n`);
  // The nights keep their tag (world/tier/seed/type/route) so the split can hold out whole nights.
  writeFileSync(join(out, 'raw', 'nights.tsv'), `${nights.tagged.join('\n')}\n`);

  // Held out: one night in twenty (seed % 20 == 0, every world and tier), and one line in
  // twenty of the other sources by hash. A held-out line that is also in training is dropped
  // from the held-out set, so the held-out loss is on text the model never saw.
  const isHeld = (src: string, line: string, tag?: string): boolean =>
    tag !== undefined ? Number(tag.split('/')[2]) % 20 === 0 : hash(`${src}:${line}`) % 20 === 0;
  const train: string[] = [];
  const val: string[] = [];
  const seen = new Set<string>();
  const counts: Record<string, { lines: number; unique: number; bytes: number; train: number; val: number }> = {};
  const sources: [string, string[], (string | undefined)[]][] = [
    ['goldens', goldens, []],
    ['cards', cards.lines, []],
    ['bible', bible, []],
    ['nights', nights.lines, nights.tagged.map((t) => t.split('\t')[0])],
  ];
  const heldPending: string[] = [];
  const heldSource: string[] = [];
  for (const [name, lines, tags] of sources) {
    const c = { lines: lines.length, unique: 0, bytes: 0, train: 0, val: 0 };
    lines.forEach((l, i) => {
      if (seen.has(l)) return;
      seen.add(l);
      c.unique++;
      c.bytes += Buffer.byteLength(l, 'utf8') + 1;
      if (isHeld(name, l, tags[i])) {
        heldPending.push(l);
        heldSource.push(name);
        c.val++;
      } else {
        train.push(l);
        c.train++;
      }
    });
    counts[name] = c;
  }
  // Exact duplicates are already gone (seen), so nothing held out is in training.
  val.push(...heldPending);
  writeFileSync(join(out, 'train.txt'), `${train.join('\n')}\n`);
  writeFileSync(join(out, 'val.txt'), `${val.join('\n')}\n`);
  // Which source each held-out line came from, line for line: model/evaluate.py scores them apart.
  writeFileSync(join(out, 'val.src'), `${heldSource.join('\n')}\n`);
  const bytes = (ls: string[]) => ls.reduce((s, l) => s + Buffer.byteLength(l, 'utf8') + 1, 0);
  const summary = {
    nights: nights.nights,
    nightsFailed: nights.failed,
    cardsSkipped: cards.skipped,
    counts,
    train: { lines: train.length, bytes: bytes(train) },
    val: { lines: val.length, bytes: bytes(val) },
  };
  writeFileSync(join(out, 'corpus.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
