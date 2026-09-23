/**
 * The plain-terms pass: the structure-only baseline.
 *
 * `npx tsx scripts/snapshot-structure.ts [--write]`
 *
 * Hashes `structureOf(generateCase(seed, { difficulty }))` — the case JSON with
 * every player-visible text field blanked (src/gen/structure.ts) — for seeds
 * 1..200 at difficulties 1, 2 and 3. The hashes were written on `main` before
 * the plain-terms pass changed a word, and `test/structure-identity.test.ts`
 * holds every later build to them: a wording change may change what the case
 * says, never what the case is.
 *
 * Without `--write` it compares against the committed file and reports.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { generateCase } from '../src/gen/index.js';
import { structureHash } from '../src/gen/structure.js';

const FILE = 'test/fixtures/structure-hashes.json';
const SEEDS = 200;

const hashes: Record<string, string[]> = {};
for (const difficulty of [1, 2, 3] as const) {
  const list: string[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) list.push(structureHash(generateCase(seed, { difficulty })));
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
  process.stdout.write(diff === 0 ? 'structure identical: 600 of 600\n' : `${diff} cases differ in structure\n`);
  process.exit(diff === 0 ? 0 : 1);
}
