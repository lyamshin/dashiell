/**
 * M14: is a kept classic case the case its seed dealt before M14? Compares
 * this branch's tiered cases against a copy of main's generator.
 *
 *   npx tsx scripts/m14-classic.ts <path to main's src/gen/index.ts> [--seeds 40]
 */
import { createHash } from 'node:crypto';
import { generateCase } from '../src/gen/index.js';
import { structureHash } from '../src/gen/structure.js';

const argv = process.argv.slice(2);
const mainPath = argv[0] as string;
const i = argv.indexOf('--seeds');
const SEEDS = i >= 0 ? Number(argv[i + 1]) : 40;
const main = (await import(mainPath)) as { generateCase: typeof generateCase };
const mainStructure = (await import(mainPath.replace(/index\.ts$/, 'structure.ts'))) as { structureHash: typeof structureHash };

const hash = (x: unknown): string => createHash('sha256').update(JSON.stringify(x)).digest('hex');
for (const tier of [0, 1, 2, 3, 4, 5] as const) {
  let same = 0;
  let sameStructure = 0;
  let kept = 0;
  const differ: number[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    const opts = { tier, level: (tier === 0 ? 1 : 2) as 1 | 2 };
    const before = main.generateCase(seed, opts);
    const now = generateCase(seed, opts);
    if (now.act.tropeId !== before.act.tropeId) continue;
    kept++;
    // The case carries its shape, and the shape now lists the mundane tropes
    // and the mix; everything else must be what it was.
    if (hash({ ...now, shape: undefined }) === hash({ ...before, shape: undefined })) same++;
    else differ.push(seed);
    if (structureHash(now) === mainStructure.structureHash(before)) sameStructure++;
  }
  process.stdout.write(
    `T${tier}: ${kept} of ${SEEDS} kept the classic draw; ${same} byte-identical, ${sameStructure} with the same structure${differ.length ? `; differ: ${differ.slice(0, 8).join(', ')}` : ''}\n`,
  );
}
