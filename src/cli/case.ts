import { generateCase, type Difficulty } from '../gen/index.js';
import { renderCandidateSheet, renderTruthSheet } from '../sheet/truthSheet.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';

ignoreBrokenPipe();

const { flags, values } = parseArgs(process.argv.slice(2));

const seedRaw = values.get('seed');
const seed = seedRaw === undefined ? 1 : Number(seedRaw);
const difficulty = Number(values.get('difficulty') ?? 2);
if (!Number.isInteger(seed) || ![1, 2, 3].includes(difficulty)) {
  process.stderr.write(
    'usage: npm run case -- --seed <integer> [--difficulty 1|2|3] [--json] [--candidates] [--detective <name>]\n',
  );
  process.exit(1);
}

const detective = values.get('detective');
const kase = generateCase(seed, {
  difficulty: difficulty as Difficulty,
  ...(detective === undefined ? {} : { detectiveName: detective }),
});

const body = flags.has('json')
  ? JSON.stringify(kase, null, 2)
  : flags.has('candidates')
    ? renderCandidateSheet(kase)
    : renderTruthSheet(kase);

process.stdout.write(body + '\n');
