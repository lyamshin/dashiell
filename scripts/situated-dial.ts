/**
 * docs/53 on docs/51: the dial, applied to the situated deck.
 *
 * `npx tsx scripts/situated-dial.ts lint [--deck F] [--before REF] [--show]`
 *   The clarity lint (below), over the deck as shipped and over the deck before the dial (`--before`,
 *   a file or a git ref, default the merge before this pass), by rule and by slot. `--show` prints
 *   each card the lint still flags.
 *
 * `npx tsx scripts/situated-dial.ts audit`
 *   The audit (`model/data/situated-dial.jsonl`, one line a card: its flags under docs/53 and what
 *   was done), counted by slot: flagged, rewritten, cut, kept; and the clarity lint before → after.
 *
 * `npx tsx scripts/situated-dial.ts check --file F`
 *   A rewriter's file (`{id, flags, action, text?, why?}` a line; `id` the card's, `sit-0535`) with
 *   each rewrite through the clarity lint, and then through the deck's own filter
 *   (`situated-deck.ts check`: the verifier, the prose lints, the tokens, the near-duplicates).
 *
 * `npx tsx scripts/situated-dial.ts apply --file F [--batch N]`
 *   Folds a checked file in: a rewrite's text into `model/data/situated-written.jsonl`, a cut into
 *   `model/data/situated-cuts.json` ("dial: …"), every line into the audit. Then run
 *   `situated-deck.ts build`.
 *
 * `npx tsx scripts/situated-dial.ts read --out DIR [--vs before|off] [--pairs 20] [--seed 53]`
 *   The blind read: pages from the same night written twice, the deck as shipped against the deck
 *   before the dial (or against the deck off), as "Version 1" and "Version 2" in an order the
 *   reader can't know, with the rubric at the top. `DIR/read.md` is for the reader, `DIR/key.json`
 *   (which version is the shipped deck) is not.
 *
 * `npx tsx scripts/situated-dial.ts score --key DIR/key.json --answers A.json [B.json …]`
 *   How often the shipped deck's page was preferred, by reader and in all, and the pairs it lost.
 *
 * **The clarity lint** (docs/53: "a texture may be pure flavor, but it must be legible on its own"):
 *
 * - **pronoun**: "it", "that" or "this" as a sentence's (or a clause's) subject, with no noun before
 *   it in the card for it to mean ("That was a hole", "It squared with what I’d been told"). A
 *   determiner ("That story was news") is a noun, and so is a token for a thing (`{thing}`,
 *   `{place}`, `{role}`, `{means}`). "It" with nothing to mean ("it was late", "it never hurts to
 *   ask") is let be;
 * - **place**: "here" or "there" standing for a place ("in here", "over there", "nobody there");
 *   "there was", "there’s nothing" are let be;
 * - **long**: over 40 words;
 * - **tag**: the oblique tags docs/53 names ("with X’s word under it", "on her count", "the part
 *   worth keeping", "and she knew it", "where I could check it").
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, tierName } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { SITUATED, useDeck, type SitCard } from '../src/game/board/plan/situated.js';
import { sentencesOf } from '../src/game/board/plan/sentences.js';
import { Rng } from '../src/gen/board/rng.js';
import type { Page } from '../src/game/board/types.js';
import { clarity } from './clarity.js';

export { clarity, type Finding } from './clarity.js';

const args = process.argv.slice(2);
const cmd = args[0];
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const DECK = 'content/board/situated.json';
const WRITTEN = 'model/data/situated-written.jsonl';
const CUTS = 'model/data/situated-cuts.json';
const AUDIT = 'model/data/situated-dial.jsonl';
/** The deck before the dial: main at docs/53's merge. */
const BEFORE = '26b24ca';
const SLOTS = ['why-here', 'walk', 'staging', 'ask', 'reaction', 'close', 'hand-off', 'gloss'] as const;
/** docs/53's ways to be too voiced, as the audit marks them. */
const FLAGS = ['tag', 'ellipsis', 'compressed', 'rhythm', 'translate', 'pronoun', 'place', 'long'] as const;

function readJsonl<T>(p: string): T[] {
  return readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

function loadDeck(src: string): SitCard[] {
  if (existsSync(src)) return JSON.parse(readFileSync(src, 'utf8')) as SitCard[];
  return JSON.parse(execFileSync('git', ['show', `${src}:${DECK}`], { encoding: 'utf8', maxBuffer: 1 << 26 })) as SitCard[];
}

/* ------------------------------------------------------------ the clarity lint */

function slotOf(c: { key: string }): string {
  return c.key.split('|')[0] as string;
}

function lintTable(decks: [string, SitCard[]][]): string[] {
  const out: string[] = [];
  const rules = ['pronoun', 'place', 'long', 'tag'] as const;
  out.push(`| | ${decks.map(([n]) => n).join(' | ')} |`);
  out.push(`|---|${decks.map(() => '---').join('|')}|`);
  const counts = decks.map(([, d]) => d.map((c) => ({ c, f: clarity(c.text) })));
  out.push(`| cards | ${counts.map((x) => x.length).join(' | ')} |`);
  out.push(`| **cards flagged** | ${counts.map((x) => x.filter((y) => y.f.length > 0).length).join(' | ')} |`);
  for (const r of rules) out.push(`| ${r} | ${counts.map((x) => x.filter((y) => y.f.some((f) => f.rule === r)).length).join(' | ')} |`);
  for (const s of SLOTS) out.push(`| ${s} | ${counts.map((x) => `${x.filter((y) => slotOf(y.c) === s && y.f.length > 0).length} of ${x.filter((y) => slotOf(y.c) === s).length}`).join(' | ')} |`);
  return out;
}

/* ------------------------------------------------------------ the audit */

interface AuditLine {
  id: string;
  flags: string[];
  action: 'keep' | 'rewrite' | 'cut';
  text?: string;
  why?: string;
  before?: string;
  batch?: number;
}

const gid = (sit: string) => `g${sit.slice(4)}`;

if (cmd === 'lint') {
  const after = loadDeck(val('deck') ?? DECK);
  const before = loadDeck(val('before') ?? BEFORE);
  process.stdout.write(`${lintTable([[`before (${val('before') ?? BEFORE})`, before], ['after', after]]).join('\n')}\n`);
  if (val('json')) writeFileSync(val('json') as string, `${JSON.stringify(Object.fromEntries(after.map((c) => [c.id, clarity(c.text).map((f) => `${f.rule} ${f.detail}`)])))}\n`);
  if (args.includes('--show')) {
    for (const c of after) {
      const f = clarity(c.text);
      if (f.length) process.stdout.write(`- ${c.id} [${c.key}] ${f.map((x) => `${x.rule} ${x.detail}`).join('; ')} :: ${c.text}\n`);
    }
  }
} else if (cmd === 'audit') {
  const lines = existsSync(AUDIT) ? readJsonl<AuditLine>(AUDIT) : [];
  const before = loadDeck(val('before') ?? BEFORE);
  const after = loadDeck(DECK);
  const keyOf = new Map(before.map((c) => [c.id, c.key]));
  const out: string[] = [`${lines.length} of ${before.length} cards audited.`, ''];
  out.push(`| slot | cards | flagged | ${FLAGS.join(' | ')} | rewritten | cut | kept |`);
  out.push(`|---|---|---|${FLAGS.map(() => '---').join('|')}|---|---|---|`);
  const row = (name: string, ls: AuditLine[], n: number) =>
    `| ${name} | ${n} | ${ls.filter((l) => l.flags.length).length} | ${FLAGS.map((f) => ls.filter((l) => l.flags.includes(f)).length).join(' | ')} | ${ls.filter((l) => l.action === 'rewrite').length} | ${ls.filter((l) => l.action === 'cut').length} | ${n - ls.filter((l) => l.action !== 'keep').length} |`;
  for (const s of SLOTS) {
    const ls = lines.filter((l) => slotOf({ key: keyOf.get(l.id) ?? '' }) === s);
    out.push(row(s, ls, before.filter((c) => slotOf(c) === s).length));
  }
  out.push(row('**all**', lines, before.length));
  out.push('');
  out.push('The clarity lint, before → after:');
  out.push('');
  out.push(...lintTable([['before', before], ['after', after]]));
  process.stdout.write(`${out.join('\n')}\n`);
} else if (cmd === 'check') {
  const file = val('file') as string;
  const lines = readJsonl<AuditLine>(file);
  const deck = new Map(loadDeck(BEFORE).map((c) => [c.id, c]));
  const written = new Map(readJsonl<{ id: string; text: string; joke?: boolean; requires?: string[]; forbids?: string[] }>(WRITTEN).map((w) => [w.id, w]));
  let bad = 0;
  const seen = new Set<string>();
  for (const l of lines) {
    const c = deck.get(l.id);
    if (!c) {
      process.stdout.write(`${l.id}: no such card\n`);
      bad++;
      continue;
    }
    if (seen.has(l.id)) process.stdout.write(`${l.id}: twice\n`);
    seen.add(l.id);
    if (!['keep', 'rewrite', 'cut'].includes(l.action)) process.stdout.write(`${l.id}: action ${l.action}\n`);
    if (l.flags.some((f) => !(FLAGS as readonly string[]).includes(f))) process.stdout.write(`${l.id}: flag ${l.flags.find((f) => !(FLAGS as readonly string[]).includes(f))}\n`);
    if (l.action === 'keep' && clarity(c.text).length) process.stdout.write(`${l.id}: kept, but the lint flags it (${clarity(c.text).map((f) => `${f.rule} ${f.detail}`).join('; ')}) :: ${c.text}\n`);
    if (l.action !== 'rewrite') continue;
    if (!l.text) {
      process.stdout.write(`${l.id}: a rewrite with no text\n`);
      bad++;
      continue;
    }
    const f = clarity(l.text);
    if (f.length) {
      bad++;
      process.stdout.write(`${l.id}: clarity ${f.map((x) => `${x.rule} ${x.detail}`).join('; ')} :: ${l.text}\n`);
    }
    const tok = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => (m[1] as string).toLowerCase()))].sort().join(' ');
    if (tok(l.text) !== tok(c.text)) process.stdout.write(`${l.id}: tokens changed (${tok(c.text) || 'none'} → ${tok(l.text) || 'none'}) :: ${l.text}\n`);
  }
  process.stdout.write(`${lines.length} lines, ${lines.filter((l) => l.action === 'rewrite').length} rewrites, ${lines.filter((l) => l.action === 'cut').length} cuts; ${bad} rewrite(s) the clarity lint flags.\n`);
  // The rewrites through the deck's own filter, as a writer's file.
  const tmp = join(dirname(file), `.${file.split('/').pop()}.written.jsonl`);
  writeFileSync(
    tmp,
    lines
      .filter((l) => l.action === 'rewrite' && l.text)
      .map((l) => {
        const w = written.get(gid(l.id));
        return JSON.stringify({ id: gid(l.id), text: l.text, ...(w?.joke ? { joke: true } : {}), ...(w?.requires ? { requires: w.requires } : {}), ...(w?.forbids ? { forbids: w.forbids } : {}) });
      })
      .join('\n') + '\n',
  );
  process.stdout.write('The deck filter on the rewrites:\n');
  process.stdout.write(execFileSync('npx', ['tsx', 'scripts/situated-deck.ts', 'check', '--file', tmp], { encoding: 'utf8', maxBuffer: 1 << 26 }));
} else if (cmd === 'apply') {
  const file = val('file') as string;
  const batch = Number(val('batch') ?? 0);
  const lines = readJsonl<AuditLine>(file);
  const deck = new Map(loadDeck(BEFORE).map((c) => [c.id, c]));
  const written = readJsonl<Record<string, unknown> & { id: string; text: string }>(WRITTEN);
  const byId = new Map(written.map((w) => [w.id, w]));
  const cuts = JSON.parse(readFileSync(CUTS, 'utf8')) as Record<string, string>;
  const audit = existsSync(AUDIT) ? readJsonl<AuditLine>(AUDIT) : [];
  const auditById = new Map(audit.map((a) => [a.id, a]));
  for (const l of lines) {
    const c = deck.get(l.id);
    if (!c) throw new Error(`no such card ${l.id}`);
    const w = byId.get(gid(l.id));
    if (!w) throw new Error(`not written: ${gid(l.id)}`);
    const entry: AuditLine = { id: l.id, flags: l.flags, action: l.action, ...(batch ? { batch } : {}) };
    // A line folded in again replaces the last: a keep puts the card's own words back, and only a cut stays cut.
    w.text = c.text;
    if (cuts[gid(l.id)]?.startsWith('dial: ')) delete cuts[gid(l.id)];
    if (l.action === 'rewrite') {
      w.text = l.text as string;
      entry.before = c.text;
      entry.text = l.text;
    } else if (l.action === 'cut') {
      cuts[gid(l.id)] = `dial: ${l.why ?? 'nothing under the voice'}`;
      entry.before = c.text;
      entry.why = l.why ?? 'nothing under the voice';
    }
    auditById.set(l.id, entry);
  }
  // The written file's own style (`{"id": "g0535", "text": "…", "batch": 1}`), so a rewrite is a one-line diff.
  const styled = (v: unknown): string => (Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v));
  writeFileSync(WRITTEN, `${written.map((w) => `{${Object.entries(w).map(([k, v]) => `${JSON.stringify(k)}: ${styled(v)}`).join(', ')}}`).join('\n')}\n`);
  writeFileSync(CUTS, `${JSON.stringify(cuts, null, 1)}\n`);
  const order = [...deck.keys()];
  const all = [...auditById.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  writeFileSync(AUDIT, `${all.map((a) => JSON.stringify(a)).join('\n')}\n`);
  process.stdout.write(`${lines.length} lines folded in: ${lines.filter((l) => l.action === 'rewrite').length} rewrites, ${lines.filter((l) => l.action === 'cut').length} cuts. Now: npx tsx scripts/situated-deck.ts build\n`);
} else if (cmd === 'read') {
  const out = val('out') ?? 'read';
  const vs = val('vs') ?? 'before';
  const want = Number(val('pairs') ?? (vs === 'off' ? 10 : 20));
  const rng = new Rng(Number(val('seed') ?? 53));
  const before = loadDeck(val('before') ?? BEFORE);
  const prose = (p: Page) =>
    p.blocks
      .filter((b) => b.kind === 'prose')
      .map((b) => b.text)
      .join('\n\n');
  /** A night's pages: the shipped deck (`after`), or the other side (`before`'s deck, or the deck off). */
  const night = (side: 'after' | 'other', s: number, tier: TierIndex, type: CaseType, world: string | undefined, wander: boolean): Page[] => {
    SITUATED.on = side === 'after' || vs !== 'off';
    useDeck(side === 'other' && vs === 'before' ? before : null);
    const d = dealBoard(s, tier, type, world ? { world } : {});
    const log = (wander ? playWanderer(d, s) : playBoardOracle(d)).run.log;
    SITUATED.on = true;
    useDeck(null);
    return log;
  };
  const plan: [string, number][] =
    vs === 'off'
      ? [
          ['account', 3],
          ['arrive', 2],
          ['list', 1],
          ['confront', 1],
          ['search', 1],
          ['motive', 1],
          ['turn', 1],
        ]
      : [
          ['account', 5],
          ['arrive', 4],
          ['list', 2],
          ['confront', 2],
          ['search', 2],
          ['office', 1],
          ['motive', 2],
          ['nothing', 1],
          ['turn', 1],
        ];
  const pairs: { label: string; after: string; other: string }[] = [];
  const used = new Set<string>();
  let s = Number(val('from') ?? (vs === 'off' ? 700 : 500));
  for (const [job, n] of plan) {
    let got = 0;
    for (let tries = 0; got < n && tries < 400; tries++) {
      s++;
      const world = rng.int(2) === 0 ? undefined : 'neighbourhood';
      const tier = (pairs.length % 6) as TierIndex;
      const types = typesFor(tier) as CaseType[];
      const type = types[rng.int(types.length)] as CaseType;
      const wander = job === 'motive' || job === 'confront';
      const a = night('after', s, tier, type, world, wander);
      const o = night('other', s, tier, type, world, wander);
      const idx = a.map((_p, i) => i).filter((i) => (job === 'turn' ? a[i]?.board?.turn : a[i]?.board?.job === job) && o[i] && prose(a[i] as Page) !== prose(o[i] as Page));
      if (idx.length === 0) continue;
      const i = idx[rng.int(idx.length)] as number;
      const id = `${world ?? 'dealt'}/${s}/${tier}/${type}#${i + 1}`;
      if (used.has(id)) continue;
      used.add(id);
      pairs.push({ label: `${tierName(tier)}, ${type}${world ? ', the neighbourhood' : ''}, seed ${s}, page ${i + 1} (${job === 'turn' ? 'the turn' : (a[i] as Page).board?.job})`, after: prose(a[i] as Page), other: prose(o[i] as Page) });
      got++;
    }
  }
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pairs[i], pairs[j]] = [pairs[j] as (typeof pairs)[number], pairs[i] as (typeof pairs)[number]];
  }
  const n = Math.min(want, pairs.length);
  const md: string[] = [
    `# ${n} pages, two versions each`,
    '',
    'Dashiell is a camp-noir detective game: a private eye in 1920s New York narrates one night of questions, page by page. Each pair below is one page of one night, written twice from the same facts; the two versions differ only in some of the sentences between the facts.',
    '',
    '**For each pair, pick the version that is clearer and still sounds like the game, in that order.** First: which can you follow on one read, without stopping to work out what a phrase means or what a word points at? Only if the two are equally clear: which sounds more like the game, a detective story told with a straight face and a wink.',
    '',
  ];
  const key: Record<string, { after: '1' | '2'; label: string }> = {};
  pairs.slice(0, n).forEach((p, k) => {
    const first = rng.int(2) === 0;
    key[String(k + 1)] = { after: first ? '1' : '2', label: p.label };
    const quote = (x: string) => x.split('\n\n').map((y) => `> ${y}\n>`);
    md.push(`## Pair ${k + 1}`, '', '### Version 1', '', ...quote(first ? p.after : p.other), '', '### Version 2', '', ...quote(first ? p.other : p.after), '');
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'read.md'), `${md.join('\n')}\n`);
  writeFileSync(join(out, 'key.json'), `${JSON.stringify(key, null, 1)}\n`);
  process.stdout.write(`${n} pairs (the shipped deck against ${vs === 'off' ? 'the deck off' : `the deck at ${val('before') ?? BEFORE}`}) → ${join(out, 'read.md')} (key in ${join(out, 'key.json')}).\n`);
} else if (cmd === 'score') {
  const key = JSON.parse(readFileSync(val('key') as string, 'utf8')) as Record<string, { after: '1' | '2'; label: string }>;
  const files = args.slice(args.indexOf('--answers') + 1).filter((x) => !x.startsWith('--'));
  let all = 0;
  let pref = 0;
  const lost = new Map<string, string[]>();
  for (const f of files) {
    const a = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string | { pick: string; why?: string }>;
    let n = 0;
    let p = 0;
    for (const [pair, k] of Object.entries(key)) {
      const raw = a[pair];
      const v = typeof raw === 'object' && raw ? raw.pick : raw;
      if (v !== '1' && v !== '2') continue;
      n++;
      if (v === k.after) p++;
      else lost.set(pair, [...(lost.get(pair) ?? []), `${f}${typeof raw === 'object' && raw?.why ? `: ${raw.why}` : ''}`]);
    }
    all += n;
    pref += p;
    process.stdout.write(`${f}: the shipped deck preferred in ${p} of ${n} (${Math.round((100 * p) / n)}%)\n`);
  }
  process.stdout.write(`all: ${pref} of ${all} (${Math.round((100 * pref) / all)}%)\n`);
  for (const [pair, who] of [...lost.entries()].sort((x, y) => Number(x[0]) - Number(y[0]))) process.stdout.write(`- pair ${pair} (${key[pair]?.label}), lost with ${who.length}: ${who.join(' | ')}\n`);
} else {
  process.stdout.write('usage: situated-dial.ts lint [--show] | audit | check --file F | apply --file F [--batch N] | read --out DIR [--vs before|off] | score --key K --answers A…\n');
}
