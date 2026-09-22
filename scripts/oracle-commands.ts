/**
 * M6 §5's layout check needs a route to walk. This prints the oracle's
 * commands for seeds 1..N at one difficulty as JSON, for
 * `scripts/check-layout.mjs` to click through in a real browser.
 *
 *   npx tsx scripts/oracle-commands.ts --seeds 10 --difficulty 2 > out/routes.json
 *   npx tsx scripts/oracle-commands.ts --seeds 10 --tier 0 > out/routes-raw.json
 *
 * M7: `--tier 0..5|over-easy` and `--level 1..4` deal the tiered case, the
 * one the book opens with `&t=`. Without `--tier` it is the untiered case.
 */

import { generateCase, type Difficulty } from '../src/gen/index.js';
import { buildView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { parseArgs, parseTierLevel } from '../src/cli/args.js';

const { values } = parseArgs(process.argv.slice(2));
const seeds = Number(values.get('seeds') ?? 10);
const difficulty = Number(values.get('difficulty') ?? 2) as Difficulty;
const tiered = parseTierLevel(values);
if (tiered === null) throw new Error('--tier is 0..5 or over-easy, --level is 1..4');

const out: Record<number, string[]> = {};
for (let seed = 1; seed <= seeds; seed++) {
  const options =
    tiered.tier === undefined ? { difficulty } : { tier: tiered.tier, level: tiered.level ?? difficulty };
  const view = buildView(generateCase(seed, options));
  out[seed] = playOracle(view).steps.map((s) => s.command);
}
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
