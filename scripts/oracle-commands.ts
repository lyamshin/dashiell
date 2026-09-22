/**
 * M6 §5's layout check needs a route to walk. This prints the oracle's
 * commands for seeds 1..N at one difficulty as JSON, for
 * `scripts/check-layout.mjs` to click through in a real browser.
 *
 *   npx tsx scripts/oracle-commands.ts --seeds 10 --difficulty 2 > out/routes.json
 */

import { generateCase, type Difficulty } from '../src/gen/index.js';
import { buildView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { parseArgs } from '../src/cli/args.js';

const { values } = parseArgs(process.argv.slice(2));
const seeds = Number(values.get('seeds') ?? 10);
const difficulty = Number(values.get('difficulty') ?? 2) as Difficulty;

const out: Record<number, string[]> = {};
for (let seed = 1; seed <= seeds; seed++) {
  const view = buildView(generateCase(seed, { difficulty }));
  out[seed] = playOracle(view).steps.map((s) => s.command);
}
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
