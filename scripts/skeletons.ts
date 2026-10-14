/**
 * docs/49 §3: the skeletons, as a corpus for the tiny model (docs/50).
 *
 * `npx tsx scripts/skeletons.ts --n 300 --tier all [--world neighbourhood] [--routes oracle,wanderer,reader] [--out file.jsonl] [--situated 0]`
 *
 * One JSON object a line, one line a page: the night (seed, tier, type,
 * world), the page's number and job, its units in order (fact units locked,
 * gap units with their card defaults and the fact units either side), and the
 * page's final text, as the book shows it. N nights a tier, the tier's case
 * types in turn, along the oracle's route unless `--routes` says otherwise.
 * Without `--out` it writes `skeletons.jsonl`, or `skeletons-<world>.jsonl`.
 *
 * Every page is checked as it's written: the units, concatenated a paragraph
 * at a time, are the page's prose word for word.
 */

import { writeFileSync } from 'node:fs';
import { parseTier, typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, tierName, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import { realize } from '../src/game/board/plan/index.js';
import { isWorld } from '../src/gen/board/world/index.js';
import { SITUATED } from '../src/game/board/plan/situated.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const n = Number(val('n') ?? 300);
const tierArg = val('tier') ?? 'all';
const tiers: TierIndex[] = tierArg === 'all' ? [0, 1, 2, 3, 4, 5] : tierArg.split(',').map((t) => {
  const x = parseTier(t);
  if (x === null) throw new Error(`No tier called "${t}".`);
  return x;
});
const world = val('world');
if (world !== undefined && !isWorld(world)) throw new Error(`No world called "${world}".`);
const routes = (val('routes') ?? 'oracle').split(',');
// docs/51: each gap the situated deck may fill carries its situation (`key`); `--situated 0` writes the old decks' pages.
SITUATED.on = val('situated') !== '0';
const out = val('out') ?? (world ? `skeletons-${world}.jsonl` : 'skeletons.jsonl');

const lines: string[] = [];
let pages = 0;
let units = 0;
let gaps = 0;
for (const tier of tiers) {
  const types = typesFor(tier) as CaseType[];
  for (let s = 1; s <= n; s++) {
    const type = types[s % types.length] as CaseType;
    const d = dealBoard(s, tier, type, world ? { world } : {});
    const runs: [string, BoardRun][] = [];
    if (routes.includes('oracle')) runs.push(['oracle', playBoardOracle(d).run]);
    if (routes.includes('wanderer')) runs.push(['wanderer', playWanderer(d, s).run]);
    if (routes.includes('reader')) runs.push(['reader', playReader(d, s).run]);
    for (const [route, run] of runs) {
      run.log.forEach((p, i) => {
        const us = p.board?.units ?? [];
        const prose = p.blocks.filter((b) => b.kind === 'prose');
        const again = realize(us);
        if (again.length !== prose.length || again.some((b, k) => b.kind !== 'prose' || b.text !== (prose[k] as { text: string }).text)) {
          throw new Error(`seed ${s} ${tierName(tier)} ${type} page ${i + 1}: the units don't realize the page.`);
        }
        const text = p.blocks.map((b) => b.text).join('\n\n');
        lines.push(JSON.stringify({ seed: s, tier, tierName: tierName(tier), type, world: world ?? 'dealt', route, page: i + 1, job: p.board?.job, ...(p.board?.q ? { q: p.board.q } : {}), units: us, text }));
        pages++;
        units += us.length;
        gaps += us.filter((u) => u.kind === 'gap').length;
      });
    }
  }
}
writeFileSync(out, `${lines.join('\n')}\n`);
process.stdout.write(`${out}: ${pages} pages, ${units} units, ${gaps} gaps.\n`);
