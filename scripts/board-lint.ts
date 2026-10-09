/** `npx tsx scripts/board-lint.ts --tier T --type X --seeds N [--random]`: the board lint's findings, each with its page. */
import type { CaseType, TierIndex } from '../src/gen/board/types.js';
import { lintBoardRun } from '../src/game/board/lint.js';
import { dealBoard } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { pageBodyText } from '../src/game/board/text.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const tier = Number(val('tier') ?? 0) as TierIndex;
const type = val('type') as CaseType | undefined;
const n = Number(val('seeds') ?? 8);
for (let s = 1; s <= n; s++) {
  const d = dealBoard(s, tier, type);
  const run = args.includes('--random') ? playWanderer(d, s).run : playBoardOracle(d).run;
  for (const i of lintBoardRun(d, run)) {
    console.log(`seed ${s} page ${i.page + 1}: ${i.rule} — ${i.detail}`);
    if (args.includes('--show')) console.log(pageBodyText(run.log[i.page] as never).slice(0, 1600), '\n');
  }
}
