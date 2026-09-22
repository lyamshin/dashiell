import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCase, type CaseType, type Difficulty } from '../gen/index.js';
import { TROPE_IDS } from '../gen/tropes/index.js';
import { renderCandidateSheet, renderTruthSheet } from '../sheet/truthSheet.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';

ignoreBrokenPipe();

const { values } = parseArgs(process.argv.slice(2));

const count = Number(values.get('count') ?? 20);
const outDir = values.get('out') ?? 'out';
const start = Number(values.get('start') ?? 1);
const difficulty = Number(values.get('difficulty') ?? 2);
const type = values.get('type');
const trope = values.get('trope');
/** `--prefix payroll` writes `payroll-3.md` instead of `case-3.md`. */
const prefix = values.get('prefix') ?? 'case';

if (
  !Number.isInteger(count) ||
  count < 1 ||
  ![1, 2, 3].includes(difficulty) ||
  (type !== undefined && !['murder', 'robbery', 'missing'].includes(type)) ||
  (trope !== undefined && !TROPE_IDS.includes(trope))
) {
  process.stderr.write(
    'usage: npm run batch -- --count <n> --out <dir> [--start <seed>] ' +
      '[--difficulty 1|2|3] [--type murder|robbery|missing] [--trope <id>] ' +
      '[--prefix <name>]\n',
  );
  process.exit(1);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const attempts: number[] = [];
const pars: number[] = [];
for (let seed = start; seed < start + count; seed++) {
  const kase = generateCase(seed, {
    difficulty: difficulty as Difficulty,
    ...(type === undefined ? {} : { type: type as CaseType }),
    ...(trope === undefined ? {} : { tropeId: trope }),
  });
  attempts.push(kase.attempts);
  pars.push(kase.par);
  writeFileSync(join(outDir, `${prefix}-${seed}.md`), renderTruthSheet(kase) + '\n');
  writeFileSync(join(outDir, `${prefix}-${seed}.candidates.md`), renderCandidateSheet(kase) + '\n');
  writeFileSync(join(outDir, `${prefix}-${seed}.json`), JSON.stringify(kase, null, 2) + '\n');
}

const median = (xs: number[]): number => {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)] as number;
};
process.stdout.write(
  `wrote ${count} cases (seeds ${start}..${start + count - 1}, difficulty ${difficulty}) to ${outDir}\n` +
    `attempts: median ${median(attempts)}, max ${Math.max(...attempts)}\n` +
    `par: median ${median(pars)}, max ${Math.max(...pars)}\n`,
);
