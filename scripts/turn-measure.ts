/**
 * docs/60 item 4: the turn's recap, measured. `npx tsx scripts/turn-measure.ts [--nights 30] [--texture lean|full] [--show 5]`
 *
 * Over N nights a tier (the tier's case types in turn, along the oracle's route), both worlds: the
 * words in the turn's recap paragraph (the notebook said aloud, not the chapter heading or what
 * next), as a median, the 90th percentile and the most, and the share within docs/60's target: 70
 * words at Raw to Poached, 90 above.
 */

import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, tierName } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { setTexture } from '../src/game/board/plan/dial.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('nights') ?? 30);
const show = Number(val('show') ?? 0);
setTexture(val('texture'));

const words = (t: string) => t.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length;
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;

process.stdout.write('| world | tier | turns | recap words, median [p90; most] | within target |\n|---|---|---|---|---|\n');
const examples: string[] = [];
for (const world of ['dealt', 'neighbourhood']) {
  for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
    const types = typesFor(tier) as CaseType[];
    const counts: number[] = [];
    const target = tier <= 2 ? 70 : 90;
    for (let s = 1; s <= N; s++) {
      const d = dealBoard(s, tier, types[s % types.length] as CaseType, world === 'dealt' ? {} : { world });
      for (const p of playBoardOracle(d).run.log) {
        if (!p.board?.turn) continue;
        // The recap: the paragraph(s) the notebook was said aloud in, after the chapter heading.
        const at = p.blocks.findIndex((b) => b.kind === 'prose' && b.voice === 'chapter');
        const recap = p.blocks.slice(at + 1).filter((b) => b.kind === 'prose' && b.voice === 'recap' && b.text === p.board?.recap);
        const n = recap.reduce((k, b) => k + (b.kind === 'prose' ? words(b.text) : 0), 0);
        if (n === 0) continue;
        counts.push(n);
        if (n > target && examples.length < show) examples.push(`${world} ${tierName(tier)} seed ${s}: ${n} words: ${recap.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ')}`);
      }
    }
    const ok = counts.filter((n) => n <= target).length;
    process.stdout.write(`| ${world} | ${tierName(tier)} | ${counts.length} | ${q(counts, 0.5)} [${q(counts, 0.9)}; ${Math.max(0, ...counts)}] | ${counts.length ? Math.round((100 * ok) / counts.length) : 0}% |\n`);
  }
}
if (examples.length) process.stdout.write(`\n${examples.join('\n\n')}\n`);
