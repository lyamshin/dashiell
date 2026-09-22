/**
 * M7: the byte-identity baseline.
 *
 * `npx tsx scripts/snapshot-cases.ts [--write]`
 *
 * Hashes `JSON.stringify(generateCase(seed, { difficulty }))` for seeds 1..200
 * at difficulties 1, 2 and 3, with no shape and no ladder. The hashes were
 * written before M7 touched the generator, and `test/m7-identity.test.ts`
 * holds every later build to them: with no options, a case is what it was.
 *
 * Without `--write` it compares against the committed file and reports.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { generateCase } from '../src/gen/index.js';

const FILE = 'test/fixtures/m7-baseline-hashes.json';
const SEEDS = 200;

const hashes: Record<string, string[]> = {};
for (const difficulty of [1, 2, 3] as const) {
  const list: string[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    const json = JSON.stringify(generateCase(seed, { difficulty }));
    list.push(createHash('sha256').update(json).digest('hex'));
  }
  hashes[String(difficulty)] = list;
}

if (process.argv.includes('--write')) {
  writeFileSync(FILE, JSON.stringify(hashes, null, 1) + '\n');
  process.stdout.write(`wrote ${FILE}\n`);
} else {
  const before = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string[]>;
  let diff = 0;
  for (const d of Object.keys(hashes)) {
    (hashes[d] ?? []).forEach((h, i) => {
      if (before[d]?.[i] !== h) {
        diff++;
        process.stdout.write(`difficulty ${d} seed ${i + 1} differs\n`);
      }
    });
  }
  process.stdout.write(diff === 0 ? 'identical: 600 of 600\n' : `${diff} cases differ\n`);
  process.exit(diff === 0 ? 0 : 1);
}
