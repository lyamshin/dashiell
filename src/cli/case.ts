import { generateCase } from '../gen/index.js';
import { renderTruthSheet } from '../sheet/truthSheet.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';

ignoreBrokenPipe();

const { flags, values } = parseArgs(process.argv.slice(2));

const seedRaw = values.get('seed');
const seed = seedRaw === undefined ? 1 : Number(seedRaw);
if (!Number.isInteger(seed)) {
  process.stderr.write('usage: npm run case -- --seed <integer> [--json] [--detective <name>]\n');
  process.exit(1);
}

const detective = values.get('detective');
const kase = generateCase(seed, detective === undefined ? undefined : { detectiveName: detective });

process.stdout.write(
  (flags.has('json') ? JSON.stringify(kase, null, 2) : renderTruthSheet(kase)) + '\n',
);
