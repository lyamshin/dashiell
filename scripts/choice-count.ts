/**
 * docs/40 §3 — how many first-level choices each page offers.
 *
 * Plays the oracle's route through `npm run play` in-process (the same tool a
 * blind tester uses) and, on every page, counts the numbered choices under
 * WHAT NEXT: what a player can pick without opening anything first. A
 * person's topics, once they sit behind the person, are not first-level.
 *
 *   npx tsx scripts/choice-count.ts --seed 3 --tier 4 [--level 2] [--engine v2]
 *   npx tsx scripts/choice-count.ts --all      the four seeds of docs/40
 */

import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { generateCase } from '../src/gen/index.js';
import { buildView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { caseOptions, type TierKey } from '../src/game/profile.js';
import { parseArgs } from '../src/cli/args.js';

interface Night {
  seed: number;
  tier: TierKey;
  level: 1 | 2 | 3 | 4;
  engine?: 'v2';
}

function memoryIo(): PlayIo {
  const files = new Map<string, string>();
  return { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
}

/** The numbered lines of the WHAT NEXT section of one printed page. */
function firstLevel(out: string): number {
  const at = out.indexOf('WHAT NEXT');
  if (at < 0) return 0;
  return out
    .slice(at)
    .split('\n')
    .filter((l) => /^\s{0,4}\d+\.\s/.test(l)).length;
}

export function countNight(night: Night): number[] {
  const io = memoryIo();
  const save = ['--save', 'n.json'];
  const run = (...argv: string[]): string => {
    const r = runPlay([...argv, ...save], io);
    if (r.code !== 0) throw new Error(`${argv.join(' ')}: ${r.out}`);
    return r.out;
  };
  const kase = generateCase(night.seed, { ...caseOptions(night), detectiveName: 'Dashiell' });
  const view = buildView(kase);
  const counts: number[] = [];
  const skipped: string[] = [];
  run('new', '--seed', String(night.seed), '--tier', String(night.tier), '--level', String(night.level), '--no-teach', ...(night.engine ? ['--engine', night.engine] : []));
  for (const command of playOracle(view).steps.map((s) => s.command)) {
    counts.push(firstLevel(run('look')));
    // A command the page does not offer (the oracle types some) is skipped.
    if (runPlay(['do', command, ...save], io).code !== 0) skipped.push(command);
  }
  const last = run('look');
  if (last.includes('WHAT NEXT')) counts.push(firstLevel(last));
  if (skipped.length > 0) process.stderr.write(`seed ${night.seed}: not offered, skipped: ${skipped.join(' | ')}\n`);
  return counts;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

const { values, flags } = parseArgs(process.argv.slice(2));
const nights: Night[] = flags.has('all')
  ? [
      { seed: 11, tier: 0, level: 1, engine: 'v2' },
      { seed: 2, tier: 2, level: 2, engine: 'v2' },
      { seed: 3, tier: 4, level: 2, engine: 'v2' },
      { seed: 21, tier: 4, level: 2, engine: 'v2' },
    ]
  : [
      {
        seed: Number(values.get('seed') ?? 3),
        tier: Number(values.get('tier') ?? 4) as TierKey,
        level: Number(values.get('level') ?? 2) as 1 | 2 | 3 | 4,
        ...(values.get('engine') === 'v2' ? { engine: 'v2' as const } : {}),
      },
    ];
for (const n of nights) {
  const c = countNight(n);
  process.stdout.write(`seed ${n.seed} tier ${n.tier}${n.engine ? ' v2' : ''}: median ${median(c)}, max ${Math.max(...c)} over ${c.length} pages  [${c.join(' ')}]\n`);
}
