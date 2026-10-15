/**
 * docs/52 §6, build 2: the blind read. Twenty pages, each written by two builds of the book from the
 * same night and the same facts (build 2, and main before it), side by side in an order the reader
 * can't know.
 *
 * Two builds can't share a process, so the read is made in steps:
 *
 *   npx tsx scripts/bones-read.ts pick --out DIR [--pairs 20] [--seed 52]
 *     choose the pages (both worlds, every tier, the kinds of page build 2 changes most), from this
 *     tree's nights, and write DIR/ids.json;
 *   npx tsx scripts/bones-read.ts dump --root ROOT --ids DIR/ids.json --out FILE
 *     write those pages' prose from the tree at ROOT (this one, or a copy of main);
 *   npx tsx scripts/bones-read.ts pair --new A.json --old B.json --out DIR [--seed 52]
 *     DIR/read.md (the pairs, "Version 1" and "Version 2") and DIR/key.json (which is which);
 *   npx tsx scripts/bones-read.ts score --key DIR/key.json --answers A.json [B.json …]
 *     how often build 2 was preferred, by reader and in all.
 *
 * Pages are along the oracle's route (the wanderer's for a motive or a put), and only where the two
 * builds differ.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const cmd = args[0];
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

interface PageId {
  world: string;
  seed: number;
  tier: number;
  type: string;
  route: 'oracle' | 'wanderer';
  page: number;
  job: string;
}

/** A small seeded shuffle, the same in every tree. */
function rng(seed: number): (n: number) => number {
  let x = seed >>> 0 || 1;
  return (n: number) => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % n) as number;
  };
}

async function engine(root: string) {
  const R = `${resolve(root)}/src`;
  const gen = await import(`${R}/gen/board/index.js`);
  const model = await import(`${R}/game/board/model.js`);
  const oracle = await import(`${R}/game/board/oracle.js`);
  return { typesFor: gen.typesFor as (t: number) => string[], dealBoard: model.dealBoard, tierName: model.tierName as (t: number) => string, playBoardOracle: oracle.playBoardOracle, playWanderer: oracle.playWanderer };
}

function prose(p: { blocks: { kind: string; text?: string }[] }): string {
  return p.blocks.filter((b) => b.kind === 'prose').map((b) => b.text ?? '').join('\n\n');
}

async function night(e: Awaited<ReturnType<typeof engine>>, id: Omit<PageId, 'page' | 'job'>): Promise<{ blocks: { kind: string; text?: string }[]; board?: { job?: string; turn?: boolean } }[]> {
  const d = e.dealBoard(id.seed, id.tier, id.type, id.world === 'dealt' ? {} : { world: id.world });
  return (id.route === 'wanderer' ? e.playWanderer(d, id.seed) : e.playBoardOracle(d)).run.log;
}

if (cmd === 'pick') {
  const e = await engine('.');
  const out = val('out') ?? 'read';
  const want = Number(val('pairs') ?? 20);
  const r = rng(Number(val('seed') ?? 52));
  // The kinds of page, and how many: build 2 changed what people say and what the detective thinks.
  const plan: [string, number][] = [
    ['account', 5],
    ['list', 3],
    ['confront', 3],
    ['search', 2],
    ['office', 2],
    ['motive', 2],
    ['turn', 2],
    ['arrive', 1],
  ];
  const ids: PageId[] = [];
  let s = 200;
  for (const [job, n] of plan) {
    let got = 0;
    for (let tries = 0; got < n && tries < 400; tries++) {
      s++;
      const world = ids.length % 2 === 0 ? 'dealt' : 'neighbourhood';
      const tier = ids.length % 6;
      const types = e.typesFor(tier);
      const type = types[r(types.length)] as string;
      const route = job === 'motive' || job === 'confront' ? 'wanderer' : 'oracle';
      const log = await night(e, { world, seed: s, tier, type, route });
      const idx = log.map((_, i) => i).filter((i) => (job === 'turn' ? log[i]?.board?.turn : log[i]?.board?.job === job));
      if (idx.length === 0) continue;
      const i = idx[r(idx.length)] as number;
      ids.push({ world, seed: s, tier, type, route, page: i + 1, job });
      got++;
    }
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'ids.json'), `${JSON.stringify(ids.slice(0, want), null, 1)}\n`);
  process.stdout.write(`${Math.min(want, ids.length)} pages → ${join(out, 'ids.json')}\n`);
} else if (cmd === 'dump') {
  const e = await engine(val('root') ?? '.');
  const ids = JSON.parse(readFileSync(val('ids') as string, 'utf8')) as PageId[];
  const pages: Record<string, { label: string; text: string; job: string }> = {};
  for (const id of ids) {
    const log = await night(e, id);
    const p = log[id.page - 1];
    pages[`${id.world}/${id.seed}/${id.tier}/${id.type}/${id.route}#${id.page}`] = {
      label: `${e.tierName(id.tier)}, ${id.type}${id.world === 'neighbourhood' ? ', the neighbourhood' : ''}, page ${id.page} (${id.job === 'turn' ? 'the turn' : (p?.board?.job ?? '')})`,
      text: p ? prose(p) : '',
      job: p?.board?.job ?? '',
    };
  }
  writeFileSync(val('out') as string, `${JSON.stringify(pages, null, 1)}\n`);
  process.stdout.write(`${Object.keys(pages).length} pages → ${val('out')}\n`);
} else if (cmd === 'pair') {
  const a = JSON.parse(readFileSync(val('new') as string, 'utf8')) as Record<string, { label: string; text: string; job: string }>;
  const b = JSON.parse(readFileSync(val('old') as string, 'utf8')) as Record<string, { label: string; text: string; job: string }>;
  const r = rng(Number(val('seed') ?? 52));
  const out = val('out') ?? 'read';
  const keys = Object.keys(a).filter((k) => b[k] && a[k]?.text !== b[k]?.text && a[k]?.job === b[k]?.job);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = r(i + 1);
    [keys[i], keys[j]] = [keys[j] as string, keys[i] as string];
  }
  const md: string[] = [`# ${keys.length} pages, two versions each`, ''];
  const key: Record<string, { build2: '1' | '2'; label: string; id: string }> = {};
  keys.forEach((k, n) => {
    const first = r(2) === 0;
    key[String(n + 1)] = { build2: first ? '1' : '2', label: a[k]?.label ?? k, id: k };
    const one = (first ? a[k] : b[k])?.text ?? '';
    const two = (first ? b[k] : a[k])?.text ?? '';
    md.push(`## Pair ${n + 1}`, '', '### Version 1', '', ...one.split('\n\n').map((x) => `> ${x}\n>`), '', '### Version 2', '', ...two.split('\n\n').map((x) => `> ${x}\n>`), '');
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'read.md'), `${md.join('\n')}\n`);
  writeFileSync(join(out, 'key.json'), `${JSON.stringify(key, null, 1)}\n`);
  process.stdout.write(`${keys.length} pairs → ${join(out, 'read.md')} (key in ${join(out, 'key.json')})\n`);
} else if (cmd === 'score') {
  const key = JSON.parse(readFileSync(val('key') as string, 'utf8')) as Record<string, { build2: '1' | '2'; label: string }>;
  const files = args.slice(args.indexOf('--answers') + 1).filter((x) => !x.startsWith('--'));
  let all = 0;
  let pref = 0;
  for (const f of files) {
    const ans = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string | { choice: string }>;
    let n = 0;
    let p = 0;
    for (const [pair, k] of Object.entries(key)) {
      const a = ans[pair];
      const v = typeof a === 'string' ? a : a?.choice;
      if (v !== '1' && v !== '2') continue;
      n++;
      if (v === k.build2) p++;
    }
    all += n;
    pref += p;
    process.stdout.write(`${f}: build 2 preferred in ${p} of ${n} (${Math.round((100 * p) / n)}%)\n`);
  }
  process.stdout.write(`all: ${pref} of ${all} (${Math.round((100 * pref) / all)}%)\n`);
}
