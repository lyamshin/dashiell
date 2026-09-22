import { generateCase, type CaseType, type Difficulty } from '../gen/index.js';
import { TROPE_IDS } from '../gen/tropes/index.js';
import { renderCandidateSheet, renderTruthSheet } from '../sheet/truthSheet.js';
import { ignoreBrokenPipe, parseArgs, parseTierLevel } from './args.js';

ignoreBrokenPipe();

const { flags, values } = parseArgs(process.argv.slice(2));

const seedRaw = values.get('seed');
const seed = seedRaw === undefined ? 1 : Number(seedRaw);
const difficulty = Number(values.get('difficulty') ?? 2);
// M5 §5: force a shape, for reading. The weights decide when neither is given.
const type = values.get('type');
const trope = values.get('trope');
// M7: the tier and the level.
const dialFlags = parseTierLevel(values);
const usage =
  'usage: npm run case -- --seed <integer> [--difficulty 1|2|3|4] ' +
  '[--tier 0..5|over-easy] [--level 1..4] ' +
  '[--type murder|robbery|missing] [--trope <id>] [--json] [--candidates] ' +
  `[--detective <name>]\n  tropes: ${TROPE_IDS.join(', ')}\n`;
if (
  !Number.isInteger(seed) ||
  ![1, 2, 3, 4].includes(difficulty) ||
  dialFlags === null ||
  (type !== undefined && !['murder', 'robbery', 'missing'].includes(type)) ||
  (trope !== undefined && !TROPE_IDS.includes(trope))
) {
  process.stderr.write(usage);
  process.exit(1);
}

const detective = values.get('detective');
const kase = generateCase(seed, {
  difficulty: difficulty as Difficulty,
  ...(detective === undefined ? {} : { detectiveName: detective }),
  ...(type === undefined ? {} : { type: type as CaseType }),
  ...(trope === undefined ? {} : { tropeId: trope }),
  ...dialFlags,
});

const body = flags.has('json')
  ? JSON.stringify(kase, null, 2)
  : flags.has('candidates')
    ? renderCandidateSheet(kase)
    : renderTruthSheet(kase);

process.stdout.write(body + '\n');
