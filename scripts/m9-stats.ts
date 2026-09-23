/**
 * M9 solver stats: acceptance, rejection reasons, generation time, inference
 * depth and hypothesis use per tier and level.
 *
 *   npx tsx scripts/m9-stats.ts [--seeds 50] [--tiers 0,2,4,5] [--levels 2] [--reasons 12]
 */
import { diagnoseCase } from '../src/gen/generate.js';
import type { Difficulty } from '../src/gen/types.js';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SEEDS = Number(arg('seeds') ?? 50);
const TIERS = (arg('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as (0 | 1 | 2 | 3 | 4 | 5)[];
const LEVELS = (arg('levels') ?? '2').split(',').map(Number) as Difficulty[];
const REASONS = Number(arg('reasons') ?? 10);
const FIRST = Number(arg('first') ?? 1);

const bucket = (r: string): string =>
  r
    .replace(/p-[a-z0-9]+/g, 'P')
    .replace(/\b[a-z]\d{3}\b/g, 'C')
    .replace(/\d+/g, 'N')
    .replace(/[A-Z][a-z]+'s/g, "X's")
    .slice(0, 90);

for (const tier of TIERS) {
  for (const level of LEVELS) {
    const t0 = Date.now();
    const reasons = new Map<string, number>();
    const times: number[] = [];
    const attempts: number[] = [];
    const depth: number[] = [];
    const cul: number[] = [];
    const par: number[] = [];
    let hyp = 0;
    let ok = 0;
    let failed = 0;
    const clearedByOne: number[] = [];
    const falseShare: number[] = [];
    const accountsOnPar: number[] = [];
    for (let seed = FIRST; seed < FIRST + SEEDS; seed++) {
      const s0 = Date.now();
      try {
        const { case: c, diagnostics } = diagnoseCase(seed, level, { tier, level });
        times.push(Date.now() - s0);
        attempts.push(c.attempts);
        for (const r of diagnostics.rejections) reasons.set(bucket(r), (reasons.get(bucket(r)) ?? 0) + 1);
        ok++;
        const s = c.logic?.solve;
        if (s) {
          depth.push(s.depth);
          cul.push(s.culprit.depth);
          if (s.hypothesis) hyp++;
          clearedByOne.push(s.clearedByOne.length);
          if (s.accountSpans > 0) falseShare.push(s.falseSpans / s.accountSpans);
          accountsOnPar.push(c.findable.filter((x) => x.role === 'spine' && x.kind === 'account').length);
        }
        par.push(c.par);
      } catch (e) {
        failed++;
        times.push(Date.now() - s0);
        process.stderr.write(`T${tier}L${level} seed ${seed}: ${(e as Error).message}\n`);
      }
    }
    const mean = (xs: number[]): string => (xs.length === 0 ? '—' : (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1));
    const hist = (xs: number[]): string => {
      const m = new Map<number, number>();
      for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ');
    };
    const totalRej = [...reasons.values()].reduce((a, b) => a + b, 0);
    console.log(
      `T${tier}L${level}: ok ${ok}/${ok + failed}, ms/case ${mean(times)} (max ${Math.max(...times)}), attempts ${mean(attempts)}, rejections/case ${(totalRej / Math.max(1, ok)).toFixed(1)}, par ${mean(par)} [${hist(par)}]`,
    );
    console.log(`  depth ${hist(depth)} | culprit depth ${hist(cul)} | hypothesis ${hyp}/${ok} | cleared-by-one/case ${mean(clearedByOne)} | false account spans on par ${mean(falseShare.map((x) => x * 100))}% | accounts on par ${mean(accountsOnPar)}`);
    for (const [r, n] of [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, REASONS)) {
      console.log(`    ${String(n).padStart(5)}  ${r}`);
    }
    console.log(`  (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
}
