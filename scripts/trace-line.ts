/**
 * Trace a line: where did these words come from?
 *
 *   npm run -s trace -- <save> "<quoted text>"
 *   npx tsx scripts/trace-line.ts <save> "<quoted text>"
 *
 * docs/40 §4, "Wording feedback feeds the decks". A playtester quotes a line
 * off a page of `npm run play`; this replays their save and says, for every
 * place the words appear in the night's pages, which page (numbered as the
 * play CLI numbers them) and what wrote them:
 *
 *   - a deck card: its id and deck file, and the card's own text, slots and all;
 *   - a sheet: its id and which part of it (a hole's frame, a line, a close);
 *   - an engine template: the const or function in src/ that holds the words;
 *   - (or a phrase from the other content files: place names, the lexicon);
 *   - or, honestly, "no source found", with the nearest candidates.
 *
 * Matching is forgiving: curly and straight quotes are one, so are the dashes,
 * whitespace and case are ignored, and "..." in a quote skips words. A source's
 * text is made a pattern (its fixed words literal, its slots lazy wildcards)
 * and matched against the page; it is the source when its fixed words cover
 * enough of the quote. The page's own records come first: the cards it spent
 * (`Page.cardsUsed`, including the `line:` keys of sheet lines) and the sheets
 * it used (`Page.sheets`); every deck, sheet and string literal in src/ is the
 * fallback.
 *
 * Never reachable from `npm run play`: blind testers must not see sources.
 * Nothing in src/cli imports this file (test/trace-line.test.ts holds it).
 */

import { readdirSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import { replaySave } from '../src/cli/play-lib.js';
import { renderPageBody } from '../src/game/transcript.js';
import type { Page } from '../src/game/types.js';

/* ------------------------------------------------------------ the types */

export type SourceKind = 'deck' | 'sheet' | 'engine' | 'content';

export interface TraceSource {
  kind: SourceKind;
  /** Deck: the card id. Sheet: the sheet id. Engine: `const NAME` or `function name`. Content: the JSON path. */
  id: string;
  /** Repo-relative file. */
  file: string;
  /** Which part of it: `text`, `exports.prop.pay[1]`, `parts[2].text (hole: look)`, `close.plain[0]`. Empty for engine. */
  where: string;
  /** Engine only: the line in the file. */
  line?: number;
  /** The source's own words, slots and all. */
  text: string;
}

export interface TraceCandidate {
  source: TraceSource;
  /** The page's own records name it (a card it spent, a sheet it used, a sheet line it said). */
  usedOnPage: boolean;
  /** The share of the quote its fixed words cover, 0 to 1. */
  cover: number;
  /** The quote lies inside the text it rendered (slots included). */
  within: boolean;
  /** Nearest-candidate note: why it is only near. */
  note?: string;
  /** Another source's words in the same quote (the quote runs across pieces), not an equal of the first. */
  part?: boolean;
}

export interface TraceHit {
  /** 1-based, as `npm run play` numbers pages. */
  page: number;
  /** The rendered sentence(s) the quote sits in. */
  onPage: string;
  /** The planned beats whose words hold the quote: `thought (touches)`. */
  beats: string[];
  /** Best first; empty when nothing matched well enough. */
  sources: TraceCandidate[];
  /** Only when `sources` is empty: the closest things there are. */
  nearest: TraceCandidate[];
  /**
   * A card or sheet the page used whose text holds the whole quote in one of
   * its slots (a telling's `{told}`): the frame the words were put in.
   */
  frame?: TraceCandidate;
}

/* ------------------------------------------------------- normalization */

interface Norm {
  text: string;
  /** For each character of `text`, its index in the original. */
  at: number[];
}

const SENTINEL = '\u0000';

/**
 * Lower case, curly quotes and apostrophes folded to straight ones, dashes to
 * one hyphen with no spaces round it, "…" to "...", and whitespace to one
 * space (a blank line, a paragraph break, to "\n"). The sentinel a slot was
 * replaced by passes through.
 */
function normalize(s: string): Norm {
  let text = '';
  const at: number[] = [];
  let i = 0;
  const push = (c: string, from: number): void => {
    text += c;
    at.push(from);
  };
  while (i < s.length) {
    const c = s[i] as string;
    if (/\s/.test(c)) {
      let j = i;
      let newlines = 0;
      while (j < s.length && /\s/.test(s[j] as string)) {
        if (s[j] === '\n') newlines++;
        j++;
      }
      const atEdge = text.length === 0 || j >= s.length;
      if (!atEdge && !text.endsWith('-')) push(newlines >= 2 ? '\n' : ' ', i);
      i = j;
      continue;
    }
    let out: string;
    if (/[’‘‛′`]/.test(c)) out = "'";
    else if (/[“”„″]/.test(c)) out = '"';
    else if (/[—–‒―-]/.test(c)) out = '-';
    else if (c === '…') out = '...';
    else out = c.toLowerCase();
    if (out === '-') {
      // "a — b", "a—b", "a--b" and "a - b" are all "a-b".
      if (text.endsWith('-')) {
        i++;
        continue;
      }
      while (text.endsWith(' ')) {
        text = text.slice(0, -1);
        at.pop();
      }
    }
    for (const ch of out) push(ch, i);
    i++;
  }
  return { text, at };
}

function norm(s: string): string {
  return normalize(s).text;
}

/* ------------------------------------------------------------ patterns */

interface Pattern {
  frags: string[];
  leadSlot: boolean;
  trailSlot: boolean;
  /** Characters of fixed text. */
  literal: number;
  longest: string;
  /** Its fixed text cut at clause marks, the pieces long enough to mean something. */
  clauses: string[];
  strict?: RegExp;
  loose?: RegExp;
}

function patternOf(withSentinels: string): Pattern | null {
  const n = normalize(withSentinels).text;
  const parts = n.split(SENTINEL);
  const frags = parts.filter((p) => p.length > 0);
  if (frags.length === 0) return null;
  const literal = frags.reduce((a, f) => a + f.length, 0);
  const longest = frags.reduce((a, f) => (f.length > a.length ? f : a), '');
  return {
    frags,
    leadSlot: (parts[0] ?? '') === '',
    trailSlot: (parts[parts.length - 1] ?? '') === '',
    literal,
    longest,
    clauses: [...new Set(frags.flatMap((f) => f.split(/[,;:.!?"()]|-/).map((c) => c.trim())).filter((c) => c.length >= 12))],
  };
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A fixed fragment, made a little lenient where the engine tidies what a slot left. */
function fragSource(f: string, afterSlot: boolean, beforeSlot: boolean): string {
  let src = escapeRe(f);
  // "a {thing}" may come out "an apple".
  if (beforeSlot) src = src.replace(/(^|[^a-z])a $/, '$1an? ');
  // "{answer}." after an answer that ended in its own stop.
  if (afterSlot && f.length > 1 && /^[.,;:]/.test(f)) src = `${escapeRe(f[0] as string)}?${escapeRe(f.slice(1))}`;
  return src;
}

const STRICT_SLOT = `(?:(?![.!?]["')]?\\s)[^\\n]){0,160}?`;
const LOOSE_SLOT = `[^\\n]{0,600}?`;

function regexOf(p: Pattern, loose: boolean): RegExp {
  const cached = loose ? p.loose : p.strict;
  if (cached) return cached;
  const src = p.frags
    .map((f, i) => `(${fragSource(f, i > 0 || p.leadSlot, i < p.frags.length - 1 || p.trailSlot)})`)
    .join(loose ? LOOSE_SLOT : STRICT_SLOT);
  const re = new RegExp(src, 'gd');
  if (loose) p.loose = re;
  else p.strict = re;
  return re;
}

/* ------------------------------------------------------------- sources */

interface Entry {
  source: TraceSource;
  pattern: Pattern;
  /** For a deck card, the id `Page.cardsUsed` would carry. */
  cardId?: string;
  /** For a sheet, its id (`Page.sheets`). */
  sheetId?: string;
  /** The dealer's key for a sheet line or a card's pay line (`line:…`). */
  lineKey?: string;
  words?: Set<string>;
}

const ROOT = new URL('../', import.meta.url);
const SLOT_RE = /\{[^{}\s]+\}/g;

/** The same key `src/game/scene/sheet-pages.ts` gives a sheet line in the dealer's memory. */
export function lineKey(template: string): string {
  let h = 2166136261;
  for (let i = 0; i < template.length; i++) {
    h ^= template.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `line:${(h >>> 0).toString(36)}`;
}

function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(new URL(rel, ROOT), 'utf8'));
}

function slotted(text: string): string {
  return text.replace(SLOT_RE, SENTINEL);
}

/** Every string leaf of a JSON value, with its path, skipping keys that hold no words. */
function leaves(value: unknown, path: string, skip: ReadonlySet<string>, out: { path: string; text: string }[]): void {
  if (typeof value === 'string') {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => leaves(v, `${path}[${i}]`, skip, out));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (skip.has(k)) continue;
      leaves(v, path ? `${path}.${k}` : k, skip, out);
    }
  }
}

const CARD_SKIP = new Set(['id', 'deck', 'status', 'tags', 'motifs', 'notes', 'kind', 'weather', 'cut', 'avoidNear']);
const SHEET_SKIP = new Set([
  'id', 'name', 'notes', 'hole', 'deck', 'bind', 'form', 'of', 'if', 'says', 'tags', 'when', 'weight', 'roles', 'kind', '$comment',
]);

function words(s: string): Set<string> {
  return new Set(norm(s.replace(SLOT_RE, ' ')).match(/[a-z']{3,}/g) ?? []);
}

function deckEntries(): Entry[] {
  const out: Entry[] = [];
  for (const f of readdirSync(new URL('content/decks/', ROOT)).filter((n) => n.endsWith('.json')).sort()) {
    const file = `content/decks/${f}`;
    const cards = readJson(file);
    if (!Array.isArray(cards)) continue;
    for (const card of cards as { id?: string; text?: string; cut?: string }[]) {
      if (typeof card.id !== 'string') continue;
      const found: { path: string; text: string }[] = [];
      leaves(card, '', CARD_SKIP, found);
      // A card with a `cut` is often said only up to it ("reading a folded newspaper.").
      if (typeof card.cut === 'string' && typeof card.text === 'string') {
        const at = card.text.indexOf(card.cut);
        if (at >= 0) found.push({ path: 'text (up to its cut)', text: `${card.text.slice(0, at + card.cut.length).replace(/[,;:\s]+$/, '')}.` });
      }
      for (const { path, text } of found) {
        const pattern = patternOf(slotted(text));
        if (!pattern) continue;
        out.push({
          source: { kind: 'deck', id: card.id, file, where: path, text },
          pattern,
          cardId: card.id,
          ...(path.includes('.pay[') ? { lineKey: lineKey(text) } : {}),
        });
      }
    }
  }
  return out;
}

function sheetEntries(): Entry[] {
  const out: Entry[] = [];
  for (const f of readdirSync(new URL('content/sheets/', ROOT)).filter((n) => n.endsWith('.json')).sort()) {
    const file = `content/sheets/${f}`;
    const data = readJson(file) as { sheets?: { id: string; parts?: { hole?: string }[] }[] };
    for (const sheet of data.sheets ?? []) {
      const found: { path: string; text: string }[] = [];
      leaves(sheet, '', SHEET_SKIP, found);
      for (const { path, text } of found) {
        const pattern = patternOf(slotted(text));
        if (!pattern) continue;
        const part = /^parts\[(\d+)\]/.exec(path);
        const hole = part ? sheet.parts?.[Number(part[1])]?.hole : undefined;
        out.push({
          source: { kind: 'sheet', id: sheet.id, file, where: hole ? `${path} (hole: ${hole})` : path, text },
          pattern,
          sheetId: sheet.id,
          lineKey: lineKey(text),
        });
      }
    }
  }
  return out;
}

const OTHER_CONTENT = ['content/lexicon.json', 'content/plain-terms.json', 'content/books.json'];

function contentEntries(): Entry[] {
  const out: Entry[] = [];
  const files = [
    ...OTHER_CONTENT,
    ...readdirSync(new URL('content/places/', ROOT))
      .filter((n) => n.endsWith('.json'))
      .map((n) => `content/places/${n}`),
  ];
  for (const file of files) {
    let data: unknown;
    try {
      data = readJson(file);
    } catch {
      continue;
    }
    const found: { path: string; text: string }[] = [];
    leaves(data, '', new Set(['$comment', 'notes', 'id']), found);
    for (const { path, text } of found) {
      if (!/[a-z]{2,}\s+[a-z]/i.test(text)) continue;
      const pattern = patternOf(slotted(text));
      if (!pattern || pattern.literal < 8) continue;
      out.push({ source: { kind: 'content', id: path, file, where: path, text }, pattern });
    }
  }
  return out;
}

/** `src/` minus the CLI and the browser UI: the engine that writes pages. */
function sourceFiles(dir = 'src/'): string[] {
  const out: string[] = [];
  for (const name of readdirSync(new URL(dir, ROOT)).sort()) {
    const rel = `${dir}${name}`;
    if (name.endsWith('.d.ts')) continue;
    if (name.endsWith('.ts')) out.push(rel);
    else if (!name.includes('.')) {
      if (rel === 'src/cli' || rel === 'src/ui') continue;
      try {
        out.push(...sourceFiles(`${rel}/`));
      } catch {
        /* not a directory */
      }
    }
  }
  return out;
}

function propName(name: ts.PropertyName): string {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : name.getText();
}

function isFunctionLike(n: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isArrowFunction(n) ||
    ts.isFunctionExpression(n) ||
    ts.isGetAccessorDeclaration(n) ||
    ts.isConstructorDeclaration(n)
  );
}

/** The name a writer would look for: the function the words sit in, or the const that holds them. */
function engineName(node: ts.Node): string {
  // Innermost function with a name of its own (or the name it was assigned to).
  // A function that is only a property of an object built inside another
  // (`text: () => …`) is named by the function it sits in: `counts › text`.
  let inner = '';
  let sawFunction = false;
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    if (!isFunctionLike(p)) continue;
    sawFunction = true;
    const tail = inner ? ` › ${inner}` : '';
    if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)) && p.name) {
      return `function ${p.name.getText()}${tail}`;
    }
    if (ts.isConstructorDeclaration(p)) return `constructor${tail}`;
    const holder = p.parent;
    if (holder && ts.isVariableDeclaration(holder) && ts.isIdentifier(holder.name)) return `function ${holder.name.text}${tail}`;
    if (holder && ts.isPropertyAssignment(holder) && !inner) inner = propName(holder.name);
    // An anonymous callback: keep looking outward.
  }
  if (sawFunction && inner) return `function ${inner}`;
  // No function: a constant, with the path down to the words.
  let path = '';
  let child: ts.Node = node;
  for (let p: ts.Node | undefined = node.parent; p; child = p, p = p.parent) {
    if (ts.isArrayLiteralExpression(p)) path = `[${p.elements.indexOf(child as ts.Expression)}]${path}`;
    else if (ts.isPropertyAssignment(p) && p.initializer === child) path = `.${propName(p.name)}${path}`;
    else if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return `const ${p.name.text}${path}`;
  }
  return '(top level)';
}

function engineEntries(): Entry[] {
  const out: Entry[] = [];
  for (const file of sourceFiles()) {
    const text = readFileSync(new URL(file, ROOT), 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      let joined: string | null = null;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const parent = node.parent;
        const isKey = parent && (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isLiteralTypeNode(parent));
        if (!isKey) joined = slotted(node.text);
      } else if (ts.isTemplateExpression(node)) {
        joined = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(SENTINEL);
      }
      if (joined !== null && /[a-z]{2,}[\s,]+[a-z]/i.test(joined.replace(new RegExp(SENTINEL, 'g'), ''))) {
        const pattern = patternOf(joined);
        if (pattern && pattern.literal >= 6) {
          out.push({
            source: {
              kind: 'engine',
              id: engineName(node),
              file,
              where: '',
              line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
              text: node.getText(sf),
            },
            pattern,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

let ALL: Entry[] | null = null;
function allEntries(): Entry[] {
  if (!ALL) ALL = [...deckEntries(), ...sheetEntries(), ...engineEntries(), ...contentEntries()];
  return ALL;
}

/* ------------------------------------------------------------ matching */

interface Span {
  start: number;
  end: number;
}

/** Where the quote sits in a page's normalized text: every occurrence. "..." in the quote skips words. */
function findQuote(page: string, quote: string): Span[] {
  const pieces = quote.split(/\s*\.\.\.\s*/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (pieces.length === 0) return [];
  // A space in the quote may be a paragraph break on the page (a tester's re-wrap).
  const re = new RegExp(pieces.map((p) => escapeRe(p).replace(/ /g, '[ \\n]')).join('[^\\n]{0,400}?'), 'g');
  const out: Span[] = [];
  for (let m = re.exec(page); m; m = re.exec(page)) {
    out.push({ start: m.index, end: m.index + m[0].length });
    re.lastIndex = m.index + Math.max(1, m[0].length);
  }
  return out;
}

function overlap(a: Span, b: Span): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

interface Scored extends TraceCandidate {
  score: number;
  /** The quote characters its fixed words cover, as spans. */
  covered: Span[];
  /** Fixed fragments (three characters or more) wholly inside the quote. */
  inside: number;
}

/** The page's paragraph round a position: a slot at a template's edge may run to its bounds, no further. */
function paraBounds(text: string, pos: number): Span {
  const s = text.lastIndexOf('\n', pos - 1);
  const e = text.indexOf('\n', pos);
  return { start: s < 0 ? 0 : s + 1, end: e < 0 ? text.length : e };
}

function matchEntry(entry: Entry, page: string, q: Span, used: Used): Scored | null {
  const p = entry.pattern;
  const qLen = q.end - q.start;
  const mark = usedMark(entry, used);
  const scored = (cover: number, within: boolean, covered: Span[], inside: number, bonus = 0): Scored => ({
    source: entry.source,
    usedOnPage: mark > 0,
    cover,
    within,
    score: cover + (within ? 0.5 : 0) + mark * 0.3 + Math.min(p.literal, 400) / 4000 + bonus,
    covered,
    inside,
  });
  let best: Scored | null = null;
  if (page.includes(p.longest)) {
    for (const loose of [false, true]) {
      if (loose && best) break;
      const re = regexOf(p, loose);
      const reach = loose ? 600 : 160;
      re.lastIndex = Math.max(0, q.start - p.literal - reach * p.frags.length);
      for (let m = re.exec(page); m; m = re.exec(page)) {
        if (m.index >= q.end) break;
        re.lastIndex = m.index + 1;
        const start = m.index;
        const end = m.index + m[0].length;
        const para = paraBounds(page, start);
        const ext: Span = {
          start: p.leadSlot ? Math.max(para.start, start - 160) : start,
          end: p.trailSlot ? Math.min(para.end, end + 160) : end,
        };
        if (overlap(ext, q) === 0) continue;
        const covered: Span[] = [];
        let inside = 0;
        const idx = (m as RegExpExecArray & { indices?: [number, number][] }).indices ?? [];
        for (let g = 1; g < idx.length; g++) {
          const at = idx[g];
          if (!at) continue;
          const o = overlap({ start: at[0], end: at[1] }, q);
          if (o > 0) covered.push({ start: Math.max(at[0], q.start), end: Math.min(at[1], q.end) });
          if (at[1] - at[0] >= 3 && at[0] >= q.start && at[1] <= q.end) inside++;
        }
        const cover = covered.reduce((a, c) => a + (c.end - c.start), 0) / Math.max(1, qLen);
        const hit = scored(cover, ext.start <= q.start && ext.end >= q.end, covered, inside);
        if (!best || hit.score > best.score) best = hit;
      }
    }
  }
  if (best && best.cover >= ACCEPT) return best;
  // The engine may have said only part of it: a card cut short at a clause, a
  // joke clause dropped, a stop tidied. A quote wholly inside one fixed piece
  // is still its words; otherwise, its clauses found in the quote count.
  const quoted = page.slice(q.start, q.end);
  if (quoted.length >= 15 && p.frags.some((f) => f.includes(quoted))) return scored(1, true, [{ ...q }], 1, -0.05);
  const covered: Span[] = [];
  for (const c of p.clauses) {
    for (let at = page.indexOf(c, Math.max(0, q.start - c.length)); at >= 0 && at < q.end; at = page.indexOf(c, at + 1)) {
      const span = { start: Math.max(at, q.start), end: Math.min(at + c.length, q.end) };
      if (span.end > span.start && !covered.some((d) => overlap(d, span) > 0)) covered.push(span);
    }
  }
  if (covered.length > 0) {
    const cover = covered.reduce((a, c) => a + (c.end - c.start), 0) / Math.max(1, qLen);
    const hit = scored(cover, cover >= 0.95, covered, covered.length, -0.05);
    if (!best || hit.score > best.score) best = hit;
  }
  return best;
}

interface Used {
  cards: Set<string>;
  sheets: Set<string>;
  lines: Set<string>;
}

function usedOf(page: Page): Used {
  const cards = new Set<string>();
  const sheets = new Set<string>((page.sheets ?? []).map((s) => s.id));
  const lines = new Set<string>();
  for (const id of page.cardsUsed) {
    if (id.startsWith('line:')) lines.add(id);
    else if (id.startsWith('sheet:')) sheets.add(id.slice('sheet:'.length).split('#')[0] as string);
    else if (!id.startsWith('beat:')) cards.add(id);
  }
  return { cards, sheets, lines };
}

/** 1 when the page's records name this very line, 0.7 its card or sheet, 0 else. */
function usedMark(e: Entry, used: Used): number {
  if (e.lineKey && used.lines.has(e.lineKey)) return 1;
  if (e.cardId && used.cards.has(e.cardId)) return e.lineKey ? 0.5 : 1;
  if (e.sheetId && used.sheets.has(e.sheetId)) return 0.7;
  return 0;
}

const ACCEPT = 0.3;

/**
 * Good enough to name: its fixed words cover a fair share of the quote, or the
 * quote is mostly names and times but lies inside it with two of its fixed
 * pieces in place ("At {when} it was {names}, and {with}.").
 */
function accepted(s: Scored): boolean {
  return s.cover >= ACCEPT || (s.within && s.cover >= 0.15 && (s.inside >= 2 || s.usedOnPage));
}

function sameSource(a: TraceSource, b: TraceSource): boolean {
  return a.kind === b.kind && a.id === b.id && a.file === b.file && a.where === b.where && a.line === b.line;
}

/** The best source, its equals, and (when it covers only part) the sources of the rest. */
function choose(scored: Scored[], q: Span): Scored[] {
  const ok = scored.filter(accepted);
  if (ok.length === 0) return [];
  ok.sort((a, b) => b.score - a.score);
  const parts = scored.filter((s) => s.cover >= 0.1).sort((a, b) => b.score - a.score);
  const top = ok[0] as Scored;
  const picked: Scored[] = [top];
  for (const s of ok.slice(1)) {
    if (picked.length >= 3) break;
    if (s.within === top.within && s.score >= top.score - 0.02 && !picked.some((x) => sameSource(x.source, s.source))) picked.push(s);
  }
  if (!top.within || top.cover < 0.6) {
    // The quote runs across pieces: add what covers the rest, left to right.
    const covered = [...top.covered];
    const qLen = q.end - q.start;
    for (const s of parts) {
      if (picked.length >= 4) break;
      if (picked.includes(s)) continue;
      const fresh = s.covered.reduce((a, c) => a + c.end - c.start - covered.reduce((b, d) => b + overlap(c, d), 0), 0);
      if (fresh / qLen >= 0.15) {
        picked.push({ ...s, part: true });
        covered.push(...s.covered);
      }
    }
  }
  return picked;
}

function nearestOf(scored: Scored[], quote: string, used: Used): TraceCandidate[] {
  const out: TraceCandidate[] = [];
  const byScore = [...scored].sort((a, b) => b.score - a.score);
  for (const s of byScore.slice(0, 3)) {
    out.push({
      source: s.source,
      usedOnPage: s.usedOnPage,
      cover: s.cover,
      within: s.within,
      note: s.within && s.cover < 0.1 ? 'the quote falls inside one of its slots' : `its fixed words cover ${Math.round(s.cover * 100)}% of the quote`,
    });
  }
  if (out.length >= 3) return out;
  // Words in common, for a line the engine tidied past any pattern.
  const q = words(quote);
  if (q.size === 0) return out;
  const ranked: { e: Entry; share: number }[] = [];
  for (const e of allEntries()) {
    e.words ??= words(e.source.kind === 'engine' ? e.pattern.frags.join(' ') : e.source.text);
    let n = 0;
    for (const w of q) if (e.words.has(w)) n++;
    const share = n / q.size;
    if (share >= 0.4) ranked.push({ e, share: share + usedMark(e, used) * 0.1 });
  }
  ranked.sort((a, b) => b.share - a.share);
  for (const { e, share } of ranked) {
    if (out.length >= 3) break;
    if (out.some((o) => sameSource(o.source, e.source))) continue;
    out.push({
      source: e.source,
      usedOnPage: usedMark(e, used) > 0,
      cover: 0,
      within: false,
      note: `shares ${Math.round(Math.min(1, share) * 100)}% of the quote's words`,
    });
  }
  return out;
}

/** The sentence(s) round a span, in the page's own words. */
function sentenceAround(n: Norm, original: string, q: Span): string {
  const t = n.text;
  let s = q.start;
  while (s > 0 && t[s - 1] !== '\n' && !(t[s - 1] === ' ' && /[.!?]["')]*$/.test(t.slice(Math.max(0, s - 4), s - 1)))) s--;
  let e = q.end;
  while (e < t.length && t[e] !== '\n' && !(/[.!?]/.test(t[e - 1] as string) && (t[e] === ' ' || t[e] === '\n') && e > q.end - 1)) e++;
  const from = n.at[s] ?? 0;
  const to = e >= t.length ? original.length : (n.at[e] ?? original.length);
  const out = original.slice(from, to).replace(/\s+/g, ' ').trim();
  return out.length > 600 ? `${out.slice(0, 600)}…` : out;
}

/* ---------------------------------------------------------------- trace */

/**
 * Every place the quote appears in the save's pages, and what wrote it.
 * Throws when the save cannot be read; an empty list when no page holds it.
 */
export function traceLine(saveText: string, quote: string): TraceHit[] {
  const { view, state } = replaySave(saveText);
  let nq = norm(quote);
  const hits: TraceHit[] = [];
  const pages = state.log.map((page) => {
    const original = renderPageBody(page, view);
    return { page, original, n: normalize(original) };
  });
  let spansByPage = pages.map((p) => findQuote(p.n.text, nq));
  if (spansByPage.every((s) => s.length === 0)) {
    // Quoted with its own quotation marks, or a stop the page does not have there.
    const bare = nq.replace(/^["'\s]+|["'\s.,;:!?]+$/g, '');
    if (bare.length > 0 && bare !== nq) {
      nq = bare;
      spansByPage = pages.map((p) => findQuote(p.n.text, nq));
    }
  }
  const entries = allEntries();
  pages.forEach(({ page, original, n }, i) => {
    const spans = spansByPage[i] ?? [];
    if (spans.length === 0) return;
    const used = usedOf(page);
    const beats = (page.beats ?? [])
      .filter((b) => b.text && b.rendered && norm(b.text).includes(nq.replace(/\s*\.\.\.\s*/g, ' ').split(' ').slice(0, 6).join(' ')))
      .map((b) => (b.tag ? `${b.kind} (${b.tag})` : b.kind));
    for (const q of spans) {
      // The page's own records first; everything else only if they do not answer.
      const own = entries.filter((e) => usedMark(e, used) > 0);
      let scored = own.map((e) => matchEntry(e, n.text, q, used)).filter((s): s is Scored => s !== null);
      let sources = choose(scored, q);
      if (sources.length === 0 || !sources[0]?.within || (sources[0]?.cover ?? 0) < 0.6) {
        const rest = entries.filter((e) => usedMark(e, used) === 0);
        scored = [...scored, ...rest.map((e) => matchEntry(e, n.text, q, used)).filter((s): s is Scored => s !== null)];
        sources = choose(scored, q);
      }
      const strip = ({ source, usedOnPage, cover, within, part }: Scored): TraceCandidate => ({
        source,
        usedOnPage,
        cover,
        within,
        ...(part ? { part } : {}),
      });
      const frame = scored
        .filter((s) => s.within && s.usedOnPage && s.cover < 0.1 && !sources.some((x) => sameSource(x.source, s.source)))
        .sort((a, b) => a.source.text.length - b.source.text.length)[0];
      hits.push({
        page: page.n + 1,
        onPage: sentenceAround(n, original, q),
        beats: [...new Set(beats)],
        sources: sources.map(strip),
        nearest: sources.length === 0 ? nearestOf(scored, nq, used) : [],
        ...(frame && sources.length > 0 ? { frame: strip(frame) } : {}),
      });
    }
  });
  return hits;
}

/* ---------------------------------------------------------------- print */

function label(s: TraceSource): string {
  switch (s.kind) {
    case 'deck':
      return `deck card ${s.id}${s.where === 'text' ? '' : `, ${s.where}`} (${s.file})`;
    case 'sheet':
      return `sheet ${s.id}, ${s.where} (${s.file})`;
    case 'engine':
      return `engine ${s.id} (${s.file}:${s.line})`;
    case 'content':
      return `content ${s.where} (${s.file})`;
  }
}

function shown(text: string, max = 500): string {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

export function formatHits(hits: readonly TraceHit[]): string {
  const out: string[] = [];
  for (const hit of hits) {
    if (hit.sources.length === 0) {
      out.push(`page ${hit.page} · no source found`);
      out.push(`  on the page: "${hit.onPage}"`);
      if (hit.beats.length > 0) out.push(`  beat: ${hit.beats.join(', ')}`);
      if (hit.nearest.length === 0) out.push('  nothing near it either.');
      for (const c of hit.nearest) {
        out.push(`  nearest: ${label(c.source)}${c.usedOnPage ? ' [used on this page]' : ''} — ${c.note ?? ''}`);
        out.push(`    source: "${shown(c.source.text, 300)}"`);
      }
      out.push('');
      continue;
    }
    const [first, ...rest] = hit.sources as [TraceCandidate, ...TraceCandidate[]];
    const tag = (c: TraceCandidate): string =>
      [c.usedOnPage ? 'used on this page' : '', c.within ? '' : 'part of the quote'].filter(Boolean).join(', ');
    out.push(`page ${hit.page} · ${label(first.source)}${tag(first) ? ` [${tag(first)}]` : ''}`);
    out.push(`  source: "${shown(first.source.text)}"`);
    for (const c of rest) {
      out.push(`  ${c.part ? 'and' : 'or'}: ${label(c.source)}${tag(c) ? ` [${tag(c)}]` : ''}`);
      out.push(`    source: "${shown(c.source.text)}"`);
    }
    if (hit.frame) {
      out.push(`  said inside a slot of: ${label(hit.frame.source)}`);
      out.push(`    source: "${shown(hit.frame.source.text, 300)}"`);
    }
    if (hit.beats.length > 0) out.push(`  beat: ${hit.beats.join(', ')}`);
    out.push(`  on the page: "${hit.onPage}"`);
    out.push('');
  }
  return out.join('\n').trimEnd();
}

/* ------------------------------------------------------------------ CLI */

function main(argv: string[]): number {
  const [savePath, ...rest] = argv;
  const quote = rest.join(' ').trim();
  if (!savePath || quote.length === 0) {
    process.stderr.write('usage: npm run -s trace -- <save> "<quoted text>"\n');
    return 1;
  }
  let text: string;
  try {
    text = readFileSync(savePath, 'utf8');
  } catch {
    process.stderr.write(`Cannot read the save ${savePath}.\n`);
    return 1;
  }
  let hits: TraceHit[];
  try {
    hits = traceLine(text, quote);
  } catch (err) {
    process.stderr.write(`Cannot replay the save ${savePath}: ${(err as Error).message}\n`);
    return 1;
  }
  if (hits.length === 0) {
    process.stderr.write(`No page in ${savePath} has "${quote}" on it.\n`);
    return 1;
  }
  process.stdout.write(`${formatHits(hits)}\n`);
  return 0;
}

if (/trace-line\.ts$/.test(process.argv[1] ?? '')) process.exitCode = main(process.argv.slice(2));
