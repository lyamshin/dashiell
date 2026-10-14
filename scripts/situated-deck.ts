/**
 * docs/51 §3: writing and filtering the situated deck.
 *
 * `npx tsx scripts/situated-deck.ts batches --size 300 --out DIR`
 *   The sample (`model/data/gaps-sample.jsonl`), sorted by situation, as batches a writer reads:
 *   `DIR/batch-01.md` …, each gap with its key, the page so far, what stays either side of the
 *   card, the next locked unit, whom the tokens mean and which there are, and the card it had.
 *
 * `npx tsx scripts/situated-deck.ts check --file F`
 *   A writer's file through the automatic part of the filter below, a line a failure, to mend.
 *
 * `npx tsx scripts/situated-deck.ts build [--read 0.1]`
 *   Every card written (`model/data/situated-written.jsonl`: one a line, `{id, text, joke?,
 *   requires?, forbids?, batch}`, the id the gap's) through the filter, into
 *   `content/board/situated.json`:
 *   - **the verifier** (docs/50, `verifyGap`): no names, places, hours, digits, means or "nobody
 *     else"; the prose lints (the banned phrases, the book's machinery, a verdict over its level,
 *     the plain terms); one or two sentences of 8–40 words, opening and ending one;
 *   - **the tokens**: only `{they} {them} {their} {role} {place} {thing} {means}`, and only ones
 *     its gap had; never a bare he, she, him, her or his (the referent goes through the tokens);
 *   - **the page's lints**: a where-next signpost (two a page is a quest log), a name and a
 *     verdict (`did it`, `must have`), "on the way out", a pet called "it";
 *   - **copies**: 70% or more of its words shared with the card its gap had, or with any card of
 *     the old decks;
 *   - **near-duplicates**: 70% or more of its words (Jaccard, over word sets) shared with an
 *     earlier card of the same (slot, page kind, before), or of any key (two keys can fall on one
 *     night);
 *   - **agreement**: `{they} were` and the like (it becomes "he were");
 *   - **the read**: `model/data/situated-cuts.json`, the cards the lead cut by hand, with why;
 *   - **jokes**: no more than one card in ten.
 *   It prints what was written, cut (by why) and kept, a slot at a time, and the coverage of each
 *   (slot, page kind, before): at least 8 cards for one over 0.5% of the gaps, 3 for a rarer one.
 *   `--read 0.1` also prints a tenth of each batch, seeded, for the lead's read.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyGap } from '../src/game/board/model/verifier.js';
import { BOARD_CARDS } from '../src/game/board/decks.js';
import { DECKS } from '../src/game/board/cards.js';
import { Rng } from '../src/gen/board/rng.js';
import { parseKey, type SitCard } from '../src/game/board/plan/situated.js';

const args = process.argv.slice(2);
const cmd = args[0];
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

interface Gap {
  id: string;
  night: string;
  page: number;
  unit: number;
  key: string;
  stratum: string;
  before: string;
  lead?: string;
  tail?: string;
  after: string;
  card: string;
  who?: { sex: string; role?: string; kind: string };
  tokens: string[];
  place: string;
}

const SAMPLE = 'model/data/gaps-sample.jsonl';
const WRITTEN = 'model/data/situated-written.jsonl';
const CUTS = 'model/data/situated-cuts.json';
const DECK = 'content/board/situated.json';

function readJsonl<T>(p: string): T[] {
  return readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

const RELATION: Record<string, string> = {
  new: 'new (a fact nothing held touched)',
  confirms: 'confirms (agreed with a line already held)',
  collides: 'collides (broke against a line already held)',
  narrows: 'narrows (narrowed the hour or the field)',
  none: 'none (no fact on that side of it)',
};

function showKey(k: string): string {
  const x = parseKey(k);
  return `slot **${x.slot}** · page **${x.page}** · place **${x.place}** · manner **${x.manner}** · tier **${x.tier}** · before **${x.before}** · after **${x.after}** · put **${x.put}** · position **${x.position}**`;
}

if (cmd === 'batches') {
  const size = Number(val('size') ?? 300);
  const out = val('out') ?? 'batches';
  mkdirSync(out, { recursive: true });
  const gaps = readJsonl<Gap>(SAMPLE).sort((a, b) => (a.stratum < b.stratum ? -1 : a.stratum > b.stratum ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (let b = 0; b * size < gaps.length; b++) {
    const part = gaps.slice(b * size, (b + 1) * size);
    const lines: string[] = [`# Batch ${b + 1}: ${part.length} gaps`, ''];
    for (const g of part) {
      const k = parseKey(g.key);
      lines.push(`## ${g.id}`);
      lines.push('');
      lines.push(showKey(g.key));
      lines.push(`before: ${RELATION[k.before]}; after: ${RELATION[k.after]}`);
      lines.push('');
      lines.push(`Page so far: ${g.before ? g.before : '(nothing yet: the gap opens the page)'}`);
      if (g.lead) lines.push(`Said just before your card, and kept: “${g.lead}”`);
      lines.push('**[YOUR CARD GOES HERE]**');
      if (g.tail) lines.push(`Kept right after your card, in the same breath: “${g.tail}”`);
      lines.push(`Next locked unit: ${g.after ? g.after : '(nothing: the page, or this section of it, ends after your card)'}`);
      const who = g.who ? `${g.who.sex === 'woman' ? 'a woman' : 'a man'}${g.who.role ? `, role “${g.who.role}”` : ''} (${g.who.kind})` : 'nobody';
      lines.push(`Tokens mean: ${who}. Tokens there are here: ${g.tokens.map((t) => `{${t}}`).join(' ') || 'none'}${g.tokens.includes('place') ? ` ({place} = “${g.place}” here)` : ''}.`);
      lines.push(`The card it had (don't copy it, don't paraphrase it): “${g.card}”`);
      lines.push('');
    }
    writeFileSync(join(out, `batch-${String(b + 1).padStart(2, '0')}.md`), `${lines.join('\n')}\n`);
  }
  process.stdout.write(`${Math.ceil(gaps.length / size)} batches of ${size} in ${out}.\n`);
} else if (cmd === 'build' || cmd === 'check') {
  const gaps = new Map(readJsonl<Gap>(SAMPLE).map((g) => [g.id, g]));
  const file = cmd === 'check' ? (val('file') as string) : WRITTEN;
  const written = existsSync(file) ? readJsonl<{ id: string; text: string; joke?: boolean; requires?: string[]; forbids?: string[]; batch?: number }>(file) : [];
  const handCuts: Record<string, string> = cmd === 'build' && existsSync(CUTS) ? (JSON.parse(readFileSync(CUTS, 'utf8')) as Record<string, string>) : {};
  const words = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/\{\w+\}/g, ' ')
        .replace(/[^a-z’' ]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean),
    );
  const overlap = (a: Set<string>, b: Set<string>) => {
    if (a.size === 0 || b.size === 0) return 0;
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n / (a.size + b.size - n);
  };
  const oldTexts = [...BOARD_CARDS.map((c) => c.text), ...Object.values(DECKS).flatMap((d) => d.map((c) => c.text))].map(words);
  const FILL: Record<string, string> = { they: 'he', them: 'him', their: 'his', role: 'the barman', place: 'the place', thing: 'the dog', means: 'medicine' };
  const ALLOWED = new Set(Object.keys(FILL));
  const SIGNPOST = /\bwas next\b|\bwanted [^.]* next\b|\bnext (?:question|person|place) to\b|\bThe one to ask was\b|\bwas worth the walk\b|\bthe next place\b|\bwas where I wanted to be\b/i;
  const DID_IT = /\b(?:did it|done it|killed (?:him|her)|took (?:it|him|her)|was the one|had to be|must have|nobody else could|guilty|the one who)\b/i;
  const FLAGS = new Set(['quote-before', 'woman', 'man', 'leaving', 'rain', 'fog', 'cold', 'clear', 'murder', 'lost-pet', 'lost-item', 'dead-man', 'dead-woman']);
  const cut = new Map<string, string>();
  const kept: (SitCard & { stratum: string; slot: string; batch: number })[] = [];
  const byStratum = new Map<string, Set<string>[]>();
  // A writer's check sees the batches written before theirs, for the near-duplicates.
  if (cmd === 'check' && existsSync(WRITTEN)) {
    const mine = new Set(written.map((w) => w.id));
    for (const w of readJsonl<{ id: string; text: string }>(WRITTEN)) {
      const g = gaps.get(w.id);
      if (!g || mine.has(w.id)) continue;
      byStratum.set(g.stratum, [...(byStratum.get(g.stratum) ?? []), words(w.text)]);
    }
  }
  const seen = new Set<string>();
  for (const w of written) {
    const g = gaps.get(w.id);
    const why = (r: string) => cut.set(w.id, r);
    if (!g) {
      why('no such gap');
      continue;
    }
    if (seen.has(w.id)) {
      why('written twice');
      continue;
    }
    seen.add(w.id);
    const text = w.text.trim().replace(/\s+/g, ' ').replace(/'/g, '’').replace(/"([^"]*)"/g, '“$1”');
    if (handCuts[w.id]) {
      why(`read: ${handCuts[w.id]}`);
      continue;
    }
    const tokens = [...text.matchAll(/\{(\w+)\}/g)].map((m) => (m[1] as string).toLowerCase());
    if (tokens.some((t) => !ALLOWED.has(t))) {
      why(`token: ${tokens.find((t) => !ALLOWED.has(t))}`);
      continue;
    }
    if (tokens.some((t) => !g.tokens.includes(t))) {
      why(`token not there: {${tokens.find((t) => !g.tokens.includes(t))}}`);
      continue;
    }
    if ([...(w.requires ?? []), ...(w.forbids ?? [])].some((f) => !FLAGS.has(f))) {
      why(`flag: ${[...(w.requires ?? []), ...(w.forbids ?? [])].find((f) => !FLAGS.has(f))}`);
      continue;
    }
    const plain = text
      .replace(/\{(\w+)\}/gi, (_m, t: string) => FILL[t.toLowerCase()] as string)
      .replace(/^(“?)([a-z])/, (_m, q: string, a: string) => q + a.toUpperCase())
      .replace(/([.!?]”?\s+“?)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
    // {they} is he or she: "{they} were" says "he were" (unless it's "if he were").
    if (/(?<!\bif )\{they\}(?:’re|’ve|\s+(?:were|are|have|do|don’t|weren’t|aren’t|haven’t)\b)/i.test(text)) {
      why('agreement: {they} takes a verb for he or she');
      continue;
    }
    const bare = text.replace(/\{\w+\}/g, ' ');
    if (/\b(?:he|she|him|her|his|hers|himself|herself)\b/i.test(bare)) {
      why('pronoun: a bare he, she, him, her or his');
      continue;
    }
    const v = verifyGap(plain, { minWords: 8, maxWords: 40, maxSentences: 2 });
    if (!v.ok) {
      why(`verifier: ${v.reasons[0]}`);
      continue;
    }
    if (SIGNPOST.test(plain)) {
      why('lint: a where-next signpost');
      continue;
    }
    if (DID_IT.test(plain) || /\bon the way out\b/i.test(plain) || /\bwhere I’d left (?:him|her)\b/i.test(plain)) {
      why('lint: a verdict or a banned turn');
      continue;
    }
    // A lost pet is "he" or "she" (docs/47 B9): "who took it" only where it's a thing.
    if (/\b(?:[Ii]t went (?:at|missing)|who took it\b|[Ww]here it is now|whoever took it\b|get it back\b)/.test(plain) && !(w.requires ?? []).includes('lost-item')) {
      why('lint: a pet called “it”');
      continue;
    }
    const ws = words(text);
    if (overlap(ws, words(g.card)) >= 0.7 || oldTexts.some((o) => overlap(ws, o) >= 0.7)) {
      why('copy: 70% of an old card');
      continue;
    }
    const peers = byStratum.get(g.stratum) ?? [];
    if (peers.some((o) => overlap(ws, o) >= 0.7)) {
      why('near-duplicate in its (slot, page kind, before)');
      continue;
    }
    // (And anywhere in the deck: two cards of different keys can fall on one night.)
    if (kept.some((o) => overlap(ws, words(o.text)) >= 0.7)) {
      why('near-duplicate of a card of another key');
      continue;
    }
    peers.push(ws);
    byStratum.set(g.stratum, peers);
    // Since Planner 2 the dead can be a woman: "the dead man" requires a dead man.
    const requires = [...new Set([...(w.requires ?? []), ...(/\bdead man\b/i.test(text) ? ['murder', 'dead-man'] : []), ...(/\bdead woman\b/i.test(text) ? ['murder', 'dead-woman'] : [])])];
    kept.push({
      id: `sit-${w.id.slice(1)}`,
      key: g.key,
      text,
      ...(requires.length ? { requires } : {}),
      ...(w.forbids?.length ? { forbids: w.forbids } : {}),
      ...(w.joke ? { joke: true } : {}),
      source: `${g.night}#${g.page}.${g.unit}`,
      stratum: g.stratum,
      slot: g.key.split('|')[0] as string,
      batch: w.batch ?? 0,
    });
  }
  if (cmd === 'check') {
    for (const [id, r] of cut) process.stdout.write(`${id}: ${r} :: ${written.find((w) => w.id === id)?.text}\n`);
    process.stdout.write(`${written.length} lines, ${kept.length} pass, ${cut.size} fail, ${written.filter((w) => w.joke).length} jokes.\n`);
    process.exit(0);
  }
  // One joke in ten at most: the later ones over the line are cut.
  const maxJokes = Math.floor(kept.length / 10);
  const jokes = kept.filter((c) => c.joke);
  for (const c of jokes.slice(maxJokes)) {
    cut.set(`g${c.id.slice(4)}`, 'jokes: over one in ten');
    kept.splice(kept.indexOf(c), 1);
  }
  const deck: SitCard[] = kept.map(({ stratum: _s, slot: _l, batch: _b, ...c }) => c);
  writeFileSync(DECK, `${JSON.stringify(deck, null, 1)}\n`);
  // The report.
  const out: string[] = [];
  out.push(`${written.length} written, ${cut.size} cut, ${deck.length} kept (${deck.filter((c) => c.joke).length} jokes) → ${DECK}`);
  out.push('');
  out.push('| slot | written | cut | kept |');
  out.push('|---|---|---|---|');
  const slotOf = (id: string) => gaps.get(id)?.key.split('|')[0] ?? '?';
  for (const slot of ['why-here', 'walk', 'staging', 'ask', 'reaction', 'close', 'hand-off', 'gloss']) {
    const w = written.filter((x) => slotOf(x.id) === slot).length;
    const c = [...cut.keys()].filter((id) => slotOf(id) === slot).length;
    out.push(`| ${slot} | ${w} | ${c} | ${kept.filter((x) => x.slot === slot).length} |`);
  }
  out.push('');
  const reasons = new Map<string, number>();
  for (const r of cut.values()) {
    const k = r.replace(/: [“"].*$/, '').replace(/^(verifier: [a-z ]+?)(?::| \().*$/, '$1');
    reasons.set(k, (reasons.get(k) ?? 0) + 1);
  }
  out.push('Cut, by why:');
  for (const [k, n] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) out.push(`- ${k}: ${n}`);
  out.push('');
  // Coverage: each (slot, page kind, before) by its share of the sample's population.
  const all = [...gaps.values()];
  const strata = new Map<string, number>();
  for (const g of all) strata.set(g.stratum, (strata.get(g.stratum) ?? 0) + 1);
  const shares = new Map<string, number>();
  if (existsSync('model/data/gaps-strata.json')) for (const [k, v] of Object.entries(JSON.parse(readFileSync('model/data/gaps-strata.json', 'utf8')) as Record<string, number>)) shares.set(k, v);
  const short: string[] = [];
  for (const k of strata.keys()) {
    const n = kept.filter((c) => c.stratum === k).length;
    const common = (shares.get(k) ?? 0) > 0.005;
    if (n < (common ? 8 : 3)) short.push(`${k} (${common ? 'common' : 'rare'}): ${n}`);
  }
  out.push(short.length ? `Short of cards: ${short.join('; ')}` : 'Every common (slot, page kind, before) has 8 cards or more, every rare one 3 or more.');
  if (val('read') !== undefined) {
    const share = Number(val('read'));
    const rng = new Rng(510);
    const batches = [...new Set(written.map((w) => w.batch ?? 0))].sort((a, b) => a - b);
    for (const b of batches) {
      const ws = written.filter((w) => (w.batch ?? 0) === b);
      const n = Math.max(1, Math.round(ws.length * share));
      const pick = new Set<number>();
      while (pick.size < Math.min(n, ws.length)) pick.add(rng.int(ws.length));
      out.push('');
      out.push(`Batch ${b}: ${n} of ${ws.length}, to read`);
      for (const i of [...pick].sort((x, y) => x - y)) {
        const w = ws[i] as (typeof ws)[number];
        const g = gaps.get(w.id);
        out.push(`- ${w.id} [${g?.key}]${cut.has(w.id) ? ` CUT (${cut.get(w.id)})` : ''}${w.joke ? ' JOKE' : ''}: ${w.text}`);
      }
    }
  }
  if (args.includes('--cuts')) {
    out.push('');
    for (const [id, r] of cut) out.push(`- ${id} [${gaps.get(id)?.key}] ${r}: ${written.find((w) => w.id === id)?.text}`);
  }
  process.stdout.write(`${out.join('\n')}\n`);
} else {
  process.stdout.write('usage: situated-deck.ts batches [--size 300] [--out DIR] | check --file F | build [--read 0.1] [--cuts]\n');
}
