/**
 * M14: play the new case types through and list what the pages need — the
 * engine's gaps (a class with no card), and any sentence that talks about a
 * death or a robbery in a case that has neither.
 *
 *   npx tsx scripts/m14-scan.ts [--seeds 8] [--types lost-pet,lost-item,affair] [--tiers 0,2,4,5]
 */
import { generateCase } from '../src/gen/index.js';
import type { CaseType } from '../src/gen/types.js';
import { buildView } from '../src/game/derive.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { renderPageText } from '../src/game/transcript.js';
import { fileReport } from '../src/game/reducer.js';
import { truthReport } from '../src/game/report-form.js';
import { scoreReport } from '../src/game/scoring.js';
import { storyOf, storyParagraphs } from '../src/game/story.js';
import { TOLD_CHOICES } from '../src/game/types.js';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SEEDS = Number(arg('seeds') ?? 8);
const types = (arg('types')?.split(',') ?? ['lost-pet', 'lost-item', 'affair']) as CaseType[];
const tiers = (arg('tiers')?.split(',').map(Number) ?? [0, 1, 2, 3, 4, 5]) as (0 | 1 | 2 | 3 | 4 | 5)[];

const DEATH = /\b(dead|died|dies|death|killed|killer|kill|kills|killing|murder|murdered|murderer|corpse|body|slab|hanged|hangs|hang|coroner|jury|the victim|weapon)\b/i;
const THEFT = /\b(robbery|robbed|thief|thieves|stolen|stole|steal|the goods|burglar)\b/i;

const gaps = new Map<string, number>();
const bad: string[] = [];
let pages = 0;
for (const type of types) {
  for (const tier of tiers) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, { tier, level: tier === 0 ? 1 : 2, type }));
      for (const run of [playOracle(view).state, playWandering(view, seed).state]) {
        for (const page of run.log) {
          pages++;
          for (const g of page.gaps) {
            const key = `${type}: ${g.replace(/c\d{3}|x\d{3}|t\d{3}|a\d{3}|d\d{3}/g, '#').slice(0, 110)}`;
            gaps.set(key, (gaps.get(key) ?? 0) + 1);
          }
          const text = renderPageText(page, view, run);
          for (const sentence of text.split(/(?<=[.!?][”’"']?)\s+/)) {
            const hit = DEATH.test(sentence) || (type !== 'lost-item' && THEFT.test(sentence));
            if (hit) bad.push(`${type} T${tier} s${seed} p${page.n}: ${sentence.replace(/\s+/g, ' ').slice(0, 220)}`);
          }
        }
        const report = truthReport(view);
        for (const told of type === 'affair' ? TOLD_CHOICES : [undefined]) {
          const r = told === undefined ? report : { ...report, told };
          const verdict = scoreReport(view, fileReport(run, r), r);
          for (const g of verdict.gaps) gaps.set(`${type}: ${g}`, (gaps.get(`${type}: ${g}`) ?? 0) + 1);
          const closing = [...verdict.closing, ...storyParagraphs(storyOf(view.kase, [], told))].join(' ');
          for (const sentence of closing.split(/(?<=[.!?][”’"']?)\s+/)) {
            if (DEATH.test(sentence) || (type !== 'lost-item' && THEFT.test(sentence))) {
              bad.push(`${type} T${tier} s${seed} closing: ${sentence.slice(0, 220)}`);
            }
          }
        }
      }
    }
  }
}
process.stdout.write(`${pages} pages\n\nGAPS\n`);
for (const [k, v] of [...gaps.entries()].sort((a, b) => b[1] - a[1])) process.stdout.write(`${String(v).padStart(5)} ${k}\n`);
process.stdout.write(`\nWORDS (${bad.length})\n`);
const seen = new Set<string>();
for (const b of bad) {
  const key = b.replace(/^[^:]+: /, '');
  if (seen.has(key)) continue;
  seen.add(key);
  process.stdout.write(`${b}\n`);
}
