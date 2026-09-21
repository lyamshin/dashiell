import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCase } from '../gen/index.js';
import { renderTruthSheet } from '../sheet/truthSheet.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';

ignoreBrokenPipe();

const { values } = parseArgs(process.argv.slice(2));

const count = Number(values.get('count') ?? 20);
const outDir = values.get('out') ?? 'out';
const start = Number(values.get('start') ?? 1);

if (!Number.isInteger(count) || count < 1) {
  process.stderr.write('usage: npm run batch -- --count <n> --out <dir> [--start <seed>]\n');
  process.exit(1);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const attempts: number[] = [];
for (let seed = start; seed < start + count; seed++) {
  const kase = generateCase(seed);
  attempts.push(kase.attempts);
  writeFileSync(join(outDir, `case-${seed}.md`), renderTruthSheet(kase) + '\n');
  writeFileSync(join(outDir, `case-${seed}.json`), JSON.stringify(kase, null, 2) + '\n');
}

const sorted = attempts.slice().sort((a, b) => a - b);
const median = sorted[Math.floor((sorted.length - 1) / 2)] as number;
process.stdout.write(
  `wrote ${count} cases (seeds ${start}..${start + count - 1}) to ${outDir}\n` +
    `attempts: median ${median}, max ${Math.max(...attempts)}\n`,
);
