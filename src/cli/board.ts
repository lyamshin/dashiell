import { analyse, CASE_TYPES, generateBoard, parseTier, typesFor, type BoardCase, type CaseType } from '../gen/board/index.js';
import { renderCase } from '../gen/board/render.js';
import { seed3, seed3Repaired } from '../gen/board/fixtures/seed3.js';
import { lostWatch } from '../gen/board/fixtures/lost-watch.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';

/**
 * docs/42 §4: `npm run board -- --seed N --tier T [--type murder|lost-item|lost-pet]`
 * prints one small-board case in plain text. `--fixture seed3|seed3-repaired|lost-watch`
 * prints a hand-built golden instead.
 */

ignoreBrokenPipe();
const { flags, values } = parseArgs(process.argv.slice(2));
const usage =
  'usage: npm run board -- --seed <integer> --tier raw|coddled|poached|soft-boiled|medium|hard-boiled|0..5 ' +
  '[--type murder|lost-item|lost-pet] [--json]\n' +
  '       npm run board -- --fixture seed3|seed3-repaired|lost-watch\n';

const FIXTURES: Record<string, () => BoardCase> = { seed3, 'seed3-repaired': seed3Repaired, 'lost-watch': lostWatch };

const fixture = values.get('fixture');
if (fixture !== undefined) {
  const make = FIXTURES[fixture];
  if (!make) {
    process.stderr.write(usage);
    process.exit(1);
  }
  const c = make();
  process.stdout.write(renderCase(c, analyse(c)) + '\n');
  process.exit(0);
}

const seed = Number(values.get('seed') ?? 1);
const tier = parseTier(values.get('tier') ?? 'raw');
const type = values.get('type') as CaseType | undefined;
if (!Number.isInteger(seed) || tier === null || (type !== undefined && !CASE_TYPES.includes(type))) {
  process.stderr.write(usage);
  process.exit(1);
}
if (type !== undefined && !typesFor(tier).includes(type)) {
  process.stderr.write(`4a builds ${typesFor(tier).join(', ')} at this tier (a lost item has no last sighting to narrow a window).\n`);
  process.exit(1);
}
const reasons: string[] = [];
const g = generateBoard(seed, tier, { ...(type ? { type } : {}), onReject: (w) => reasons.push(w) });
if (!g) {
  process.stderr.write(`no case for seed ${seed} at this tier after ${reasons.length} attempts. Last reasons:\n  ${reasons.slice(-5).join('\n  ')}\n`);
  process.exit(2);
}
if (flags.has('json')) process.stdout.write(JSON.stringify(g.kase, null, 2) + '\n');
else process.stdout.write(`${renderCase(g.kase, g.analysis)}\n\n(attempt ${g.attempts})\n`);
