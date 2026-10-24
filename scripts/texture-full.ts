/**
 * docs/60 item 1: `texture: 'full'` writes the pages as they read before the budget, byte for byte.
 * `npx tsx scripts/texture-full.ts [--root DIR] [--texture full|lean] [--nights 30] [--out FILE]`
 *
 * Every page of N nights a tier, both worlds, along the oracle's, the wanderer's and the reader's
 * routes, as the tree at DIR writes them (a copy of main, or this one with `--texture full`): each
 * page's blocks, whole, and the notebook at the night's end. Prints one hash for the lot and one a
 * world and tier; `--out` writes every page's hash, to compare two trees page by page
 * (`--against FILE` prints the pages that differ).
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const root = resolve(val('root') ?? '.');
const N = Number(val('nights') ?? 30);
const gen = await import(`${root}/src/gen/board/index.ts`);
const model = await import(`${root}/src/game/board/model.ts`);
const oracle = await import(`${root}/src/game/board/oracle.ts`);
const text = await import(`${root}/src/game/board/text.ts`);
try {
  const dial = await import(`${root}/src/game/board/plan/dial.ts`);
  dial.setTexture(val('texture'));
} catch {
  /* a tree from before docs/60 */
}

const h = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const all = createHash('sha256');
const pages: Record<string, string> = {};
const rows: string[] = [];
for (const world of ['dealt', 'neighbourhood']) {
  for (const tier of [0, 1, 2, 3, 4, 5]) {
    const types = gen.typesFor(tier) as string[];
    const part = createHash('sha256');
    let n = 0;
    for (let s = 1; s <= N; s++) {
      const d = model.dealBoard(s, tier, types[s % types.length], world === 'dealt' ? {} : { world });
      const runs = { oracle: oracle.playBoardOracle(d).run, wanderer: oracle.playWanderer(d, s).run, reader: oracle.playReader(d, s).run };
      for (const [route, run] of Object.entries(runs) as [string, { log: { blocks: unknown[] }[] }][]) {
        run.log.forEach((p, i) => {
          const t = JSON.stringify(p.blocks);
          pages[`${world}/${tier}/${s}/${route}#${i + 1}`] = h(t);
          part.update(t);
          all.update(t);
          n++;
        });
        const nb = text.notebookText(d, run);
        pages[`${world}/${tier}/${s}/${route}#notebook`] = h(nb);
        part.update(nb);
        all.update(nb);
      }
    }
    rows.push(`| ${world} | ${model.tierName(tier)} | ${n} | ${part.digest('hex').slice(0, 16)} |`);
  }
}
process.stdout.write(`| world | tier | pages | hash |\n|---|---|---|---|\n${rows.join('\n')}\n\nall: ${all.digest('hex').slice(0, 16)} (${Object.keys(pages).length} pages and notebooks)\n`);
if (val('out')) writeFileSync(val('out') as string, `${JSON.stringify(pages, null, 0)}\n`);
if (val('against')) {
  const other = JSON.parse(readFileSync(val('against') as string, 'utf8')) as Record<string, string>;
  const diff = Object.keys({ ...other, ...pages }).filter((k) => other[k] !== pages[k]);
  process.stdout.write(`${diff.length} differ${diff.length ? `: ${diff.slice(0, 20).join(', ')}` : ''}\n`);
}
