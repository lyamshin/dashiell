/**
 * docs/53 on the decks besides the situated one (docs/54): the dial, applied to the board's card
 * families (`content/board/*.json` but `situated.json` and `voicings.json`), the four old decks
 * (`content/decks/`), and the bible's voice lines and arrivals (`content/neighbourhood/`).
 *
 * A line is one piece of text the game says: a card's text, an export's text and its pay-offs, a
 * person's voice line, a place's arrival. Its id is the card's (`bcn-2050`), or a path
 * (`bcn-0901/prop`, `chr-117/trait/pay/0`, `rafferty/voice/hours/7`, `raffertys/arrival/0`).
 *
 * `npx tsx scripts/decks-dial.ts lint [--before REF] [--show] [--file F]`
 *   The clarity lint (`clarity.ts`) over every line as shipped and before the dial (a git ref,
 *   default the merge before this pass), by file and rule. `--show` prints what it still flags.
 *
 * `npx tsx scripts/decks-dial.ts batch --files a,b [--out F]`
 *   The lines of some files, one a line, for a helper: id, file, family, tags, joke, text, what the
 *   lint says, and what the line must keep (`keeps`, below).
 *
 * `npx tsx scripts/decks-dial.ts check --file F`
 *   A helper's file (`{id, flags, action, text?}` a line) with every rewrite checked: the clarity
 *   lint, the tokens (the same ones, any case), the joke left alone, curly quotes, the plain terms,
 *   the verifier's reasons (docs/50; none new), and what the line must keep.
 *
 * `npx tsx scripts/decks-dial.ts apply --file F [--batch N]`
 *   Folds a checked file in: each rewrite into its JSON file (the text's own string replaced, so a
 *   rewrite is a one-line diff), every line into the audit (`model/data/decks-dial.jsonl`).
 *
 * `npx tsx scripts/decks-dial.ts audit`
 *   The audit by file: flagged, by flag, rewritten, cut, kept; and the lint before → after.
 *
 * `npx tsx scripts/decks-dial.ts dump --out F [--from 500] [--nights 60] [--situated 0]`
 *   Every page's prose of some nights (both worlds, every tier, the oracle's route and the
 *   wanderer's), and each night's dealt board, digested: run it before and after, for the read.
 *
 * `npx tsx scripts/decks-dial.ts boards --a A --b B`
 *   Whether the dealt boards of two dumps are the same.
 *
 * `npx tsx scripts/decks-dial.ts read --before A --after B --out DIR [--pairs 20] [--seed 54]`
 *   The blind read: pages that differ, both worlds and every tier, as "Version 1" and "Version 2"
 *   in an order the reader can't know, with docs/53's rubric. `DIR/key.json` says which is after.
 *   Score it with `situated-dial.ts score`.
 *
 * What a line must keep (`keeps`): the dealer and the bible's filters read some lines' words, so a
 * rewrite keeps whatever they test. A hand-off that opens on "That" is passed over off its own page;
 * a staging with "door" is passed over when I was met at the door; a card with pictures, a screen or
 * a newsreel never goes to a stage theatre; an arrival that says the watcher's job is passed over when
 * the watcher isn't cast, and one with pictures makes a theatre a picture house; a voice line names
 * no hour (but an hour's own line), no other person and no place; an hour's line that says "left",
 * "went", "bed"… isn't used; a "nobody else" line says nobody, all, the lot or everybody; an
 * own-up leads into "I wasn't at …".
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clarity, type ClarityOptions } from './clarity.js';
import { findJargon, loadPlainTerms } from './plain-terms.mjs';
import { verifyGap } from '../src/game/board/model/verifier.js';
import { hoursNamed } from '../src/game/board/lint.js';
import { machineryIn } from '../src/game/board/reader-lint.js';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { Rng } from '../src/gen/board/rng.js';

const args = process.argv.slice(2);
const cmd = args[0];
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

/** Main before this pass. */
const BEFORE = 'eef86d6';
const AUDIT = 'model/data/decks-dial.jsonl';
export const FILES = [
  'content/board/connective.json',
  'content/board/still.json',
  'content/board/walk.json',
  'content/board/office.json',
  'content/board/places.json',
  'content/board/people.json',
  'content/board/telling.json',
  'content/board/confront.json',
  'content/board/night.json',
  'content/decks/character.json',
  'content/decks/entrances.json',
  'content/decks/office.json',
  'content/decks/watch.json',
  'content/neighbourhood/people.json',
  'content/neighbourhood/places.json',
] as const;
const FLAGS = ['tag', 'ellipsis', 'compressed', 'rhythm', 'translate', 'pronoun', 'place', 'long', 'repeat'] as const;

export interface Line {
  id: string;
  file: string;
  family: string;
  tags?: unknown;
  joke?: boolean;
  text: string;
  /** Said aloud whole: a bible voice line. */
  speech: boolean;
  /** For the bible's filters: the person's or place's id, and the voice kind. */
  owner?: string;
  kind?: string;
}

type Json = Record<string, unknown>;

/** Every line of one file's JSON. */
export function linesOf(file: string, raw: string): Line[] {
  const j = JSON.parse(raw) as unknown;
  const out: Line[] = [];
  if (file === 'content/neighbourhood/people.json') {
    for (const p of (j as { people: Json[] }).people) {
      const v = p.voice as Record<string, string[] | Record<string, string>>;
      for (const [kind, xs] of Object.entries(v)) {
        if (Array.isArray(xs)) xs.forEach((t, i) => out.push({ id: `${p.id}/voice/${kind}/${i}`, file, family: `voice-${kind}`, text: t, speech: true, owner: p.id as string, kind }));
        else for (const [h, t] of Object.entries(xs)) out.push({ id: `${p.id}/voice/${kind}/${h}`, file, family: `voice-${kind}`, text: t, speech: true, owner: p.id as string, kind });
      }
    }
    return out;
  }
  if (file === 'content/neighbourhood/places.json') {
    for (const p of (j as { places: Json[] }).places) {
      (p.arrivals as { band: string; weather: string; text: string }[]).forEach((a, i) =>
        out.push({ id: `${p.id}/arrival/${i}`, file, family: 'arrival', tags: { band: a.band, weather: a.weather }, text: a.text, speech: false, owner: p.id as string, kind: 'arrival' }),
      );
    }
    return out;
  }
  for (const c of j as Json[]) {
    const family = (c.family ?? c.deck) as string;
    out.push({ id: c.id as string, file, family, tags: c.tags, ...(c.joke ? { joke: true } : {}), text: c.text as string, speech: false });
    const ex = c.exports as Record<string, { text?: string; pay?: string[] }> | undefined;
    for (const [name, e] of Object.entries(ex ?? {})) {
      if (e.text) out.push({ id: `${c.id}/${name}`, file, family: `${family}:${name}`, text: e.text, speech: false });
      (e.pay ?? []).forEach((t, i) => out.push({ id: `${c.id}/${name}/pay/${i}`, file, family: `${family}:${name}-pay`, text: t, speech: false }));
    }
  }
  return out;
}

function readAt(ref: string | null, file: string): string {
  if (ref === null) return readFileSync(file, 'utf8');
  return execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
}

export function allLines(ref: string | null = null): Line[] {
  return FILES.flatMap((f) => linesOf(f, readAt(ref, f)));
}

/** The lint's options for a line: any token is a noun; a voice line is speech. An export is a noun phrase. */
function lintOpts(l: Line): ClarityOptions {
  return { anyToken: true, speech: l.speech };
}

/** Families written as a paragraph (an arrival, the office's opening): "long" is a sentence over 40 words. */
const PARAGRAPHS = /^(arrival|arrive|return|scene-body|scene-empty|office|setup)$/;

export function lintLine(l: Line) {
  const f = clarity(l.text, lintOpts(l));
  if (!PARAGRAPHS.test(l.family)) return f;
  const longest = Math.max(...l.text.split(/(?<=[.!?][”’]?)\s+(?=[“A-Z{])/).map((x) => x.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length));
  return [...f.filter((x) => x.rule !== 'long'), ...(longest > 40 ? [{ rule: 'long' as const, detail: `a sentence of ${longest} words` }] : [])];
}

/* ------------------------------------------------------------ what a line must keep */

const bible = JSON.parse(readFileSync('content/neighbourhood/people.json', 'utf8')) as { people: { id: string; first: string; last: string; job: string }[] };
const biblePlaces = JSON.parse(readFileSync('content/neighbourhood/places.json', 'utf8')) as { places: { id: string; name: string; watcher?: { person: string } }[] };

/** The words the dealer or the bible's filters test in a line, as a fingerprint that a rewrite must keep. */
export function keeps(l: Line): Record<string, string> {
  const t = l.text;
  const s = t.toLowerCase();
  const out: Record<string, string> = {};
  const has = (name: string, re: RegExp) => {
    if (re.test(t)) out[name] = 'yes';
  };
  if (l.family === 'handoff') has('opens on “That”', /^That\b/);
  has('door', /\bdoor\b/i);
  has('pictures, a screen or a newsreel', /\bpictures?\b|\bscreen\b|\bnewsreel\b|\bmovie|\bfilm\b|\bpicture house\b/i);
  const hrs = hoursNamed(t);
  if (hrs.length) out['hours named'] = hrs.join(',');
  if (machineryIn(t).length) out['machinery'] = machineryIn(t).join(',');
  if (l.file.startsWith('content/neighbourhood/')) {
    const named = [
      ...bible.people.filter((p) => p.id !== l.owner).flatMap((p) => [p.first, p.last]),
      ...biblePlaces.places.map((p) => (p.name.split(',')[0] as string).replace(/^The /, '')),
    ].filter((n) => new RegExp(`\\b${n.toLowerCase().replace(/[.*+?^$()|[\]\\]/g, '\\$&')}\\b`).test(s));
    if (named.length) out['names'] = named.sort().join(',');
    if (/\b(seven|eight|nine|ten|eleven|twelve|midnight|o’clock)\b/.test(s)) out['an hour word'] = [...s.matchAll(/\b(seven|eight|nine|ten|eleven|twelve|midnight|o’clock)\b/g)].map((m) => m[1]).join(',');
    if (l.kind === 'hours' && /\b(left|leave|went|away|gone|stepped|asleep|bed|locked)\b/i.test(t)) out['a leaving word (hour line passed over)'] = 'yes';
    if (l.kind === 'nobodyElse' && /\b(nobody|lot|everybody|all|no one)\b/i.test(t)) out['says nobody/all/the lot'] = 'yes';
    if (l.kind === 'arrival') {
      const place = biblePlaces.places.find((p) => p.id === l.owner);
      const w = bible.people.find((p) => p.id === place?.watcher?.person);
      const job = w?.job.replace(/^the /, '').split(/\s+/).pop() ?? '';
      const said = [w?.last, job, 'watcher'].filter((x): x is string => !!x && new RegExp(`\\b${x.toLowerCase()}\\b(?![’']s)`).test(s));
      if (said.length) out['the watcher said'] = said.join(',');
    }
  }
  return out;
}

const tokensOf = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => (m[1] as string).toLowerCase()).sort().join(' ');

/** A line with its tokens filled by plain stand-ins, for the verifier. */
function plainOf(t: string): string {
  return t.replace(/\{(\w+)\}/g, (_m, k: string) => (/^[A-Z]/.test(k) ? 'Someone' : 'someone'));
}

/** The verifier's reasons, by kind (a shape reason is let be: these aren't gaps). */
function verifierKinds(t: string): Set<string> {
  const v = verifyGap(plainOf(t), { minWords: 1, maxWords: 400, maxSentences: 99 });
  return new Set(v.reasons.map((r) => r.replace(/[:(].*$/, '').trim()).filter((r) => !/^(start|end|sentences|length|mark)$/.test(r)));
}

/* ------------------------------------------------------------ the audit */

interface AuditLine {
  id: string;
  flags: string[];
  action: 'keep' | 'rewrite' | 'cut';
  text?: string;
  before?: string;
  why?: string;
  batch?: number;
}

function readJsonl<T>(p: string): T[] {
  return readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

function lintTable(sides: [string, Line[]][]): string[] {
  const out: string[] = [];
  const rules = ['pronoun', 'place', 'long', 'tag'] as const;
  out.push(`| file | lines | ${sides.map(([n]) => `flagged, ${n}`).join(' | ')} | ${rules.map((r) => sides.map(([n]) => `${r}, ${n}`).join(' | ')).join(' | ')} |`);
  out.push(`|---|---|${sides.map(() => '---').join('|')}|${rules.map(() => sides.map(() => '---').join('|')).join('|')}|`);
  const row = (name: string, pick: (l: Line) => boolean) => {
    const f = sides.map(([, ls]) => ls.filter(pick).map((l) => lintLine(l)));
    return `| ${name} | ${sides[0]?.[1].filter(pick).length} | ${f.map((x) => x.filter((y) => y.length).length).join(' | ')} | ${rules.map((r) => f.map((x) => x.filter((y) => y.some((z) => z.rule === r)).length).join(' | ')).join(' | ')} |`;
  };
  for (const file of FILES) out.push(row(file.replace('content/', ''), (l) => l.file === file));
  out.push(row('**all**', () => true));
  return out;
}

if (cmd === 'lint') {
  const before = allLines(val('before') ?? BEFORE);
  const after = allLines();
  const only = val('file');
  const pick = (ls: Line[]) => (only ? ls.filter((l) => l.file.includes(only)) : ls);
  process.stdout.write(`${lintTable([['before', pick(before)], ['after', pick(after)]]).join('\n')}\n`);
  if (args.includes('--show')) {
    for (const l of pick(after)) {
      const f = lintLine(l);
      if (f.length) process.stdout.write(`- ${l.id} [${l.family}] ${f.map((x) => `${x.rule} ${x.detail}`).join('; ')} :: ${l.text}\n`);
    }
  }
} else if (cmd === 'batch') {
  const files = (val('files') ?? '').split(',').filter(Boolean);
  const ls = allLines().filter((l) => files.some((f) => l.file.includes(f)));
  const out = ls.map((l) => JSON.stringify({ id: l.id, file: l.file.replace('content/', ''), family: l.family, ...(l.tags ? { tags: l.tags } : {}), ...(l.joke ? { joke: true } : {}), text: l.text, lint: lintLine(l).map((f) => `${f.rule} ${f.detail}`), keeps: keeps(l) }));
  if (val('out')) writeFileSync(val('out') as string, `${out.join('\n')}\n`);
  else process.stdout.write(`${out.join('\n')}\n`);
  process.stderr.write(`${ls.length} lines\n`);
} else if (cmd === 'check') {
  const lines = readJsonl<AuditLine>(val('file') as string);
  const byId = new Map(allLines(BEFORE).map((l) => [l.id, l]));
  const terms = loadPlainTerms();
  let bad = 0;
  const seen = new Set<string>();
  const say = (s: string) => process.stdout.write(`${s}\n`);
  for (const a of lines) {
    const l = byId.get(a.id);
    if (!l) {
      say(`${a.id}: no such line`);
      bad++;
      continue;
    }
    if (seen.has(a.id)) say(`${a.id}: twice`);
    seen.add(a.id);
    if (!['keep', 'rewrite', 'cut'].includes(a.action)) say(`${a.id}: action ${a.action}`);
    if (a.action === 'cut') {
      say(`${a.id}: a cut (this pass rewrites, it doesn't cut)`);
      bad++;
    }
    const unknown = (a.flags ?? []).find((f) => !(FLAGS as readonly string[]).includes(f));
    if (unknown) say(`${a.id}: flag ${unknown}`);
    if (a.action === 'keep' && lintLine(l).length) say(`${a.id}: kept, but the lint flags it (${lintLine(l).map((f) => `${f.rule} ${f.detail}`).join('; ')}) :: ${l.text}`);
    if (a.action !== 'rewrite') continue;
    const t = a.text ?? '';
    const problems: string[] = [];
    if (!t.trim()) problems.push('no text');
    const nl: Line = { ...l, text: t };
    const f = lintLine(nl);
    if (f.length) problems.push(`clarity ${f.map((x) => `${x.rule} ${x.detail}`).join('; ')}`);
    if (tokensOf(t) !== tokensOf(l.text)) problems.push(`tokens changed (${tokensOf(l.text) || 'none'} → ${tokensOf(t) || 'none'})`);
    if (/['"]/.test(t)) problems.push('straight quotes');
    if ((t.match(/“/g) ?? []).length !== (t.match(/”/g) ?? []).length) problems.push('quotes unbalanced');
    if (l.speech && /[“”]/.test(t) !== /[“”]/.test(l.text)) problems.push('a voice line is said whole: no quotation marks of its own');
    const jar = findJargon(t, terms).map((x: { term: string }) => x.term).filter((x: string) => !findJargon(l.text, terms).some((y: { term: string }) => y.term === x));
    if (jar.length) problems.push(`plain terms: ${jar.join(', ')}`);
    const vb = verifierKinds(l.text);
    const va = [...verifierKinds(t)].filter((r) => !vb.has(r));
    if (va.length) problems.push(`verifier: ${va.join('; ')}`);
    const kb = keeps(l);
    const ka = keeps(nl);
    for (const k of new Set([...Object.keys(kb), ...Object.keys(ka)])) if (kb[k] !== ka[k]) problems.push(`keeps: ${k} (${kb[k] ?? 'no'} → ${ka[k] ?? 'no'})`);
    const n = (s: string) => s.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length;
    if (l.kind !== 'arrival' && n(t) > Math.max(40, n(l.text)) ) problems.push(`long: ${n(t)} words (was ${n(l.text)})`);
    if (/^[a-z{]/.test(l.text) !== /^[a-z{]/.test(t) && !/^\{/.test(l.text)) problems.push('the opening changed case (a fragment the engine joins on?)');
    if (/[.!?…”]$/.test(l.text.trim()) !== /[.!?…”]$/.test(t.trim())) problems.push('the ending changed (a fragment the engine joins on?)');
    if (problems.length) {
      bad++;
      say(`${a.id}: ${problems.join(' | ')} :: ${t}`);
    }
  }
  say(`${lines.length} lines, ${lines.filter((x) => x.action === 'rewrite').length} rewrites, ${lines.filter((x) => x.action === 'keep').length} kept; ${bad} with a problem.`);
} else if (cmd === 'apply') {
  const file = val('file') as string;
  const batch = Number(val('batch') ?? 0);
  const lines = readJsonl<AuditLine>(file);
  const before = new Map(allLines(BEFORE).map((l) => [l.id, l]));
  const now = new Map(allLines().map((l) => [l.id, l]));
  const audit = existsSync(AUDIT) ? readJsonl<AuditLine>(AUDIT) : [];
  const auditById = new Map(audit.map((a) => [a.id, a]));
  const texts = new Map<string, string>();
  for (const f of FILES) texts.set(f, readFileSync(f, 'utf8'));
  for (const a of lines) {
    const l = before.get(a.id);
    const cur = now.get(a.id);
    if (!l || !cur) throw new Error(`no such line ${a.id}`);
    // A line folded in again replaces the last: a keep puts the line's own words back.
    const want = a.action === 'rewrite' ? (a.text as string) : l.text;
    if (cur.text !== want) {
      const src = texts.get(l.file) as string;
      const from = JSON.stringify(cur.text);
      const n = src.split(from).length - 1;
      if (n === 0) throw new Error(`${a.id}: text not found in ${l.file}`);
      if (n > 1) {
        // The same words twice in a file: replace the one at this line's place (the first after its id, or its owner's).
        const anchor = src.indexOf(JSON.stringify(cur.id.split('/')[0]));
        const at = src.indexOf(from, Math.max(0, anchor));
        if (anchor < 0 || at < 0) throw new Error(`${a.id}: twice in ${l.file}, and no anchor`);
        texts.set(l.file, src.slice(0, at) + JSON.stringify(want) + src.slice(at + from.length));
      } else texts.set(l.file, src.replace(from, () => JSON.stringify(want)));
    }
    const entry: AuditLine = { id: a.id, flags: a.flags ?? [], action: a.action, ...(batch ? { batch } : {}) };
    if (a.action === 'rewrite') {
      entry.before = l.text;
      entry.text = a.text;
    }
    auditById.set(a.id, entry);
  }
  for (const [f, s] of texts) {
    JSON.parse(s);
    writeFileSync(f, s);
  }
  // Every line still read the same, but the ones rewritten.
  const after = new Map(allLines().map((l) => [l.id, l]));
  for (const a of lines) if ((after.get(a.id)?.text ?? '') !== (a.action === 'rewrite' ? a.text : before.get(a.id)?.text)) throw new Error(`${a.id}: didn't take`);
  if (after.size !== before.size) throw new Error('a line was lost');
  const order = [...before.keys()];
  const all = [...auditById.values()].sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  mkdirSync('model/data', { recursive: true });
  writeFileSync(AUDIT, `${all.map((x) => JSON.stringify(x)).join('\n')}\n`);
  process.stdout.write(`${lines.length} lines folded in: ${lines.filter((x) => x.action === 'rewrite').length} rewrites.\n`);
} else if (cmd === 'audit') {
  const audit = existsSync(AUDIT) ? readJsonl<AuditLine>(AUDIT) : [];
  const before = allLines(val('before') ?? BEFORE);
  const after = allLines();
  const fileOf = new Map(before.map((l) => [l.id, l.file]));
  const out: string[] = [`${audit.length} of ${before.length} lines audited.`, ''];
  out.push(`| file | lines | flagged | ${FLAGS.join(' | ')} | rewritten | cut | kept |`);
  out.push(`|---|---|---|${FLAGS.map(() => '---').join('|')}|---|---|---|`);
  const row = (name: string, ls: AuditLine[], n: number) =>
    `| ${name} | ${n} | ${ls.filter((l) => l.flags.length).length} | ${FLAGS.map((f) => ls.filter((l) => l.flags.includes(f)).length).join(' | ')} | ${ls.filter((l) => l.action === 'rewrite').length} | ${ls.filter((l) => l.action === 'cut').length} | ${n - ls.filter((l) => l.action !== 'keep').length} |`;
  for (const f of FILES) out.push(row(f.replace('content/', ''), audit.filter((a) => fileOf.get(a.id) === f), before.filter((l) => l.file === f).length));
  out.push(row('**all**', audit, before.length));
  out.push('', 'The clarity lint, before → after:', '', ...lintTable([['before', before], ['after', after]]));
  process.stdout.write(`${out.join('\n')}\n`);
} else if (cmd === 'dump') {
  const { dealBoard } = await import('../src/game/board/model.js');
  const { playBoardOracle, playWanderer } = await import('../src/game/board/oracle.js');
  const { SITUATED } = await import('../src/game/board/plan/situated.js');
  // `--situated 0`: the deck off, so the connective deck's own families are the page's.
  if (val('situated') === '0') SITUATED.on = false;
  const from = Number(val('from') ?? 500);
  const nights = Number(val('nights') ?? 60);
  const rng = new Rng(54);
  const out: { night: string; board: string; pages: { job: string; turn: boolean; prose: string }[] }[] = [];
  for (let s = from; s < from + nights; s++) {
    for (const world of [undefined, 'neighbourhood']) {
      const tier = (s % 6) as TierIndex;
      const types = typesFor(tier) as CaseType[];
      const type = types[rng.int(types.length)] as CaseType;
      const d = dealBoard(s, tier, type, world ? { world } : {});
      const board = createHash('sha1').update(JSON.stringify(d)).digest('hex').slice(0, 16);
      for (const route of ['oracle', 'wanderer'] as const) {
        const log = (route === 'oracle' ? playBoardOracle(d) : playWanderer(d, s)).run.log;
        out.push({
          night: `${world ?? 'dealt'}/${s}/${tier}/${type}/${route}`,
          board,
          pages: log.map((p) => ({ job: p.board?.job ?? '', turn: !!p.board?.turn, cards: p.cardsUsed, prose: p.blocks.filter((b) => b.kind === 'prose').map((b) => b.text).join('\n\n') })),
        });
      }
    }
  }
  writeFileSync(val('out') as string, JSON.stringify(out));
  process.stdout.write(`${out.length} nights, ${out.reduce((n, x) => n + x.pages.length, 0)} pages → ${val('out')}\n`);
} else if (cmd === 'boards') {
  type Dump = { night: string; board: string }[];
  const a = JSON.parse(readFileSync(val('a') as string, 'utf8')) as Dump;
  const b = new Map((JSON.parse(readFileSync(val('b') as string, 'utf8')) as Dump).map((x) => [x.night, x.board]));
  const diff = a.filter((x) => b.get(x.night) !== x.board);
  const all = createHash('sha1').update(a.map((x) => x.board).join()).digest('hex').slice(0, 12);
  const bll = createHash('sha1').update([...b.values()].join()).digest('hex').slice(0, 12);
  process.stdout.write(`${a.length} nights; boards ${all} vs ${bll}; ${diff.length} differ${diff.length ? `: ${diff.slice(0, 5).map((x) => x.night).join(', ')}` : ''}\n`);
} else if (cmd === 'read') {
  type Dump = { night: string; pages: { job: string; turn: boolean; prose: string }[] }[];
  const before = new Map((JSON.parse(readFileSync(val('before') as string, 'utf8')) as Dump).map((x) => [x.night, x]));
  const after = JSON.parse(readFileSync(val('after') as string, 'utf8')) as Dump;
  const rng = new Rng(Number(val('seed') ?? 54));
  const want = Number(val('pairs') ?? 20);
  const skip = new Set((val('skip') ?? '').split(',').filter(Boolean));
  // Candidates: every page that differs, by tier and world, a page per night at most.
  const cands: { label: string; tier: number; world: string; after: string; other: string }[] = [];
  for (const n of after) {
    if (skip.has(n.night)) continue;
    const o = before.get(n.night);
    if (!o) continue;
    const idx = n.pages.map((_p, i) => i).filter((i) => o.pages[i] && n.pages[i]?.prose !== o.pages[i]?.prose && (n.pages[i]?.prose.length ?? 0) > 200);
    if (idx.length === 0) continue;
    const i = idx[rng.int(idx.length)] as number;
    const [world, , tier] = n.night.split('/');
    cands.push({ label: `${n.night} page ${i + 1} (${n.pages[i]?.turn ? 'the turn' : n.pages[i]?.job})`, tier: Number(tier), world: world as string, after: n.pages[i]?.prose as string, other: o.pages[i]?.prose as string });
  }
  // Spread: round-robin over (world, tier).
  const groups = new Map<string, typeof cands>();
  for (const c of cands) groups.set(`${c.world}/${c.tier}`, [...(groups.get(`${c.world}/${c.tier}`) ?? []), c]);
  for (const g of groups.values()) {
    for (let i = g.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [g[i], g[j]] = [g[j] as (typeof g)[number], g[i] as (typeof g)[number]];
    }
  }
  const pairs: typeof cands = [];
  const keys = [...groups.keys()].sort();
  for (let r = 0; pairs.length < want && r < 50; r++) for (const k of keys) if (pairs.length < want && groups.get(k)?.[r]) pairs.push(groups.get(k)?.[r] as (typeof cands)[number]);
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pairs[i], pairs[j]] = [pairs[j] as (typeof pairs)[number], pairs[i] as (typeof pairs)[number]];
  }
  const md: string[] = [
    `# ${pairs.length} pages, two versions each`,
    '',
    'Dashiell is a camp-noir detective game: a private eye in 1920s New York narrates one night of questions, page by page. Each pair below is one page of one night, written twice from the same facts; the two versions differ only in some of the sentences.',
    '',
    '**For each pair, pick the version that is clearer and still sounds like the game, in that order.** First: which can you follow on one read, without stopping to work out what a phrase means or what a word points at? Only if the two are equally clear: which sounds more like the game, a detective story told with a straight face and a wink.',
    '',
  ];
  const key: Record<string, { after: '1' | '2'; label: string }> = {};
  pairs.forEach((p, k) => {
    const first = rng.int(2) === 0;
    key[String(k + 1)] = { after: first ? '1' : '2', label: p.label };
    const quote = (x: string) => x.split('\n\n').map((y) => `> ${y}\n>`);
    md.push(`## Pair ${k + 1}`, '', '### Version 1', '', ...quote(first ? p.after : p.other), '', '### Version 2', '', ...quote(first ? p.other : p.after), '');
  });
  const dir = val('out') as string;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'read.md'), `${md.join('\n')}\n`);
  writeFileSync(join(dir, 'key.json'), `${JSON.stringify(key, null, 1)}\n`);
  process.stdout.write(`${pairs.length} pairs of ${cands.length} candidates → ${join(dir, 'read.md')}\n`);
} else {
  process.stdout.write('usage: decks-dial.ts lint [--show] | batch --files a,b | check --file F | apply --file F [--batch N] | audit | dump --out F | boards --a A --b B | read --before A --after B --out DIR\n');
}
