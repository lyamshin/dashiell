/**
 * docs/51 §5: the blind read. Twenty pages, each written twice from the same night and the same
 * facts, once with the situated deck and once with the old decks only, side by side in an order
 * the reader can't know.
 *
 * `npx tsx scripts/situated-read.ts --out DIR [--pairs 20] [--seed 51]`
 *   writes `DIR/read.md` (the pairs, as "Version 1" and "Version 2") and `DIR/key.json` (which
 *   version is which). Pages are taken across both worlds, every tier and every kind of page, along
 *   the oracle's route, and only where the two versions differ.
 *
 * `npx tsx scripts/situated-read.ts --score DIR/key.json --answers A.json [B.json …]`
 *   scores readers' answers (`{"1": "1"|"2", …}`, the version preferred in each pair): how often
 *   the situated version was preferred, by reader and in all.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, tierName } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { SITUATED } from '../src/game/board/plan/situated.js';
import { Rng } from '../src/gen/board/rng.js';
import type { Page } from '../src/game/board/types.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (val('score')) {
  const key = JSON.parse(readFileSync(val('score') as string, 'utf8')) as Record<string, { situated: '1' | '2' }>;
  const files = args.slice(args.indexOf('--answers') + 1).filter((x) => !x.startsWith('--'));
  let all = 0;
  let pref = 0;
  for (const f of files) {
    const a = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>;
    let n = 0;
    let p = 0;
    for (const [pair, k] of Object.entries(key)) {
      const v = a[pair];
      if (v !== '1' && v !== '2') continue;
      n++;
      if (v === k.situated) p++;
    }
    all += n;
    pref += p;
    process.stdout.write(`${f}: situated preferred in ${p} of ${n} (${Math.round((100 * p) / n)}%)\n`);
  }
  process.stdout.write(`all: ${pref} of ${all} (${Math.round((100 * pref) / all)}%)\n`);
  process.exit(0);
}

const out = val('out') ?? 'read';
const want = Number(val('pairs') ?? 20);
const rng = new Rng(Number(val('seed') ?? 51));

function prose(p: Page): string {
  return p.blocks.filter((b) => b.kind === 'prose').map((b) => b.text).join('\n\n');
}

function night(on: boolean, s: number, tier: TierIndex, type: CaseType, world?: string): Page[] {
  SITUATED.on = on;
  const log = playBoardOracle(dealBoard(s, tier, type, world ? { world } : {})).run.log;
  SITUATED.on = true;
  return log;
}

// The kinds of page to show, and how many of each.
const plan: [string, number][] = [
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
const pairs: { label: string; on: string; off: string }[] = [];
const used = new Set<string>();
let s = 100;
for (const [job, n] of plan) {
  let got = 0;
  for (let tries = 0; got < n && tries < 400; tries++) {
    s++;
    const world = rng.int(2) === 0 ? undefined : 'neighbourhood';
    const tier = (pairs.length % 6) as TierIndex;
    const types = typesFor(tier) as CaseType[];
    const type = types[rng.int(types.length)] as CaseType;
    const on = night(true, s, tier, type, world);
    const off = night(false, s, tier, type, world);
    const idx = on.map((p, i) => i).filter((i) => (job === 'turn' ? on[i]?.board?.turn : on[i]?.board?.job === job) && prose(on[i] as Page) !== prose(off[i] as Page));
    if (idx.length === 0) continue;
    const i = idx[rng.int(idx.length)] as number;
    const id = `${world ?? 'dealt'}/${s}/${tier}/${type}#${i + 1}`;
    if (used.has(id)) continue;
    used.add(id);
    pairs.push({ label: `${tierName(tier)}, ${type}${world ? ', the neighbourhood' : ''}, page ${i + 1} (${job === 'turn' ? 'the turn' : (on[i] as Page).board?.job})`, on: prose(on[i] as Page), off: prose(off[i] as Page) });
    got++;
  }
}
// Shuffle the pairs, and the versions within each.
for (let i = pairs.length - 1; i > 0; i--) {
  const j = rng.int(i + 1);
  [pairs[i], pairs[j]] = [pairs[j] as (typeof pairs)[number], pairs[i] as (typeof pairs)[number]];
}
const md: string[] = ['# Twenty pages, two versions each', ''];
const key: Record<string, { situated: '1' | '2'; label: string }> = {};
pairs.slice(0, want).forEach((p, k) => {
  const first = rng.int(2) === 0;
  key[String(k + 1)] = { situated: first ? '1' : '2', label: p.label };
  md.push(`## Pair ${k + 1}`, '', '### Version 1', '', ...(first ? p.on : p.off).split('\n\n').map((x) => `> ${x}\n>`), '', '### Version 2', '', ...(first ? p.off : p.on).split('\n\n').map((x) => `> ${x}\n>`), '');
});
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'read.md'), `${md.join('\n')}\n`);
writeFileSync(join(out, 'key.json'), `${JSON.stringify(key, null, 1)}\n`);
process.stdout.write(`${Math.min(want, pairs.length)} pairs → ${join(out, 'read.md')} (key in ${join(out, 'key.json')}).\n`);
