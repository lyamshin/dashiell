import {
  checkInvariants,
  generateBoard,
  invariantFailures,
  parseTier,
  TIER_NAMES,
  type CaseType,
  type TierIndex,
} from '../gen/board/index.js';
import { buildCase } from '../gen/board/generate.js';
import { rate } from '../gen/board/path.js';
import { pickType } from '../gen/board/index.js';
import { PAR_TARGET } from '../gen/board/tiers.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';

/**
 * docs/42 §5: `npm run board-sweep -- --tier T --n 200` (or `--tier all`).
 * Generation success, par, the tier-rating hit rate, routes per rival, the
 * case-type mix, and the invariants, which no accepted case may fail.
 */

ignoreBrokenPipe();
const { values } = parseArgs(process.argv.slice(2));
const n = Number(values.get('n') ?? 200);
const from = Number(values.get('from') ?? 1);
const tierArg = values.get('tier') ?? 'all';
const tiers: TierIndex[] = tierArg === 'all' ? [0, 1, 2, 3, 4, 5] : [parseTier(tierArg)].filter((t): t is TierIndex => t !== null);
if (!Number.isInteger(n) || n < 1 || tiers.length === 0) {
  process.stderr.write('usage: npm run board-sweep -- --tier <tier|all> [--n 200] [--from 1]\n');
  process.exit(1);
}

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? (s[(s.length - 1) / 2] as number) : ((s[s.length / 2 - 1] as number) + (s[s.length / 2] as number)) / 2;
};
const pct = (a: number, b: number) => (b === 0 ? '—' : `${((100 * a) / b).toFixed(0)}%`);

const rows: string[][] = [];
let invariantFailuresTotal = 0;
for (const tier of tiers) {
  const t0 = Date.now();
  let ok = 0;
  let attempts = 0;
  const pars: number[] = [];
  const walks: number[] = [];
  const routes: number[] = [];
  const types = new Map<CaseType, number>();
  const variants = new Map<string, number>();
  let invFail = 0;
  let inTarget = 0;
  let accRated = 0;
  // The raw candidate hit rate: of first-attempt candidates with a sane truth, how many rate at the tier.
  let cands = 0;
  let candHit = 0;
  for (let seed = from; seed < from + n; seed++) {
    const c0 = buildCase(seed, tier, pickType(seed, tier), 0);
    if (c0 && invariantFailures(checkInvariants(c0)).length === 0) {
      cands++;
      if (rate(c0) === tier) candHit++;
    }
    const g = generateBoard(seed, tier);
    if (!g) continue;
    ok++;
    attempts += g.attempts;
    const inv = invariantFailures(checkInvariants(g.kase));
    if (inv.length > 0) {
      invFail++;
      process.stderr.write(`seed ${seed} ${TIER_NAMES[tier]}: ${inv.join('; ')}\n`);
    }
    if (g.analysis.rating === tier) accRated++;
    pars.push(g.analysis.par);
    walks.push(g.analysis.walks);
    if (g.analysis.par >= PAR_TARGET[0] && g.analysis.par <= PAR_TARGET[1]) inTarget++;
    for (const r of g.analysis.rivals) routes.push(r.routes.length);
    types.set(g.kase.type, (types.get(g.kase.type) ?? 0) + 1);
    if (g.kase.variant) variants.set(g.kase.variant, (variants.get(g.kase.variant) ?? 0) + 1);
  }
  invariantFailuresTotal += invFail;
  const routeHist = [1, 2, 3, 4].map((k) => `${k}:${routes.filter((x) => (k === 4 ? x >= 4 : x === k)).length}`).join(' ');
  rows.push([
    TIER_NAMES[tier],
    `${ok}/${n} (${pct(ok, n)})`,
    (attempts / Math.max(ok, 1)).toFixed(1),
    `${median(pars)} [${Math.min(...pars)}–${Math.max(...pars)}]`,
    pct(inTarget, ok),
    `${median(walks)}`,
    `${pct(accRated, ok)} / ${pct(candHit, cands)}`,
    `${(routes.reduce((a, b) => a + b, 0) / Math.max(routes.length, 1)).toFixed(2)} (${routeHist})`,
    [...types.entries()].map(([k, v]) => `${k} ${v}`).join(', ') + (variants.size ? `; ${[...variants.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}` : ''),
    String(invFail),
    `${((Date.now() - t0) / 1000).toFixed(1)}s`,
  ]);
}

const head = ['tier', 'generated', 'tries', 'par med [range]', 'par in 5–9', 'walks med', 'rated at tier (accepted / first try)', 'routes/rival mean (hist)', 'types', 'invariant fails', 'time'];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] as string).length)));
const fmt = (r: string[]) => `| ${r.map((x, i) => x.padEnd(widths[i] as number)).join(' | ')} |`;
process.stdout.write(`${fmt(head)}\n| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |\n${rows.map(fmt).join('\n')}\n`);
process.stdout.write(`\nseeds ${from}–${from + n - 1}. Invariants checked on every accepted case: no gaps, every lie collides, unique answer, lead time, places open, no lingering at transit, truthful lists and accounts, one-hour innocent lies.\n`);
if (invariantFailuresTotal > 0) {
  process.stdout.write(`INVARIANT FAILURES: ${invariantFailuresTotal}\n`);
  process.exit(1);
}
