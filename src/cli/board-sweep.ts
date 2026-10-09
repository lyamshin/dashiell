import {
  checkInvariants,
  generateBoard,
  givensSignature,
  invariantFailures,
  parseTier,
  refusalShortcut,
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
 * case-type mix, and the invariants, which no accepted case may fail. A second
 * table covers the designer's decisions of 2026-09-28: the refusal shortcut's
 * gain on par, how innocent liars answer, the place kinds dealt, duplicate
 * reasons, and the culprit and the liar claiming one place at one hour. A
 * third (4a.2) counts distinct setups per case type, and seeds whose office
 * text matches another's word for word, names aside (which must be none).
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
const KINDS = ['home', 'bar', 'club', 'restaurant', 'theatre', 'work'];

const rows: string[][] = [];
const rows2: string[][] = [];
const rows3: string[][] = [];
let sameGivensTotal = 0;
let invariantFailuresTotal = 0;
let shortcutWins = 0;
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
  // The decisions.
  const gains: number[] = [];
  let capped = 0;
  let fails = 0;
  let refused = 0;
  let admitted = 0;
  const kinds = new Map<string, number>();
  let dupReasons = 0;
  let samePlace = 0;
  const setups = new Map<CaseType, { all: Set<string>; means: Set<string>; clock: Set<string>; pointer: Set<string> }>();
  const signatures = new Map<string, number>();
  let sameGivens = 0;
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
    const report = checkInvariants(g.kase, g.analysis);
    // 4a.2: setups, and the office's text with names taken out.
    const st = g.kase.setup;
    if (st) {
      const per = setups.get(g.kase.type) ?? { all: new Set<string>(), means: new Set<string>(), clock: new Set<string>(), pointer: new Set<string>() };
      per.all.add(`${st.means}/${st.clock}/${st.pointer}`);
      per.means.add(st.means);
      per.clock.add(st.clock);
      per.pointer.add(st.pointer);
      setups.set(g.kase.type, per);
    }
    const sig = givensSignature(g.kase);
    const twin = signatures.get(sig);
    if (twin !== undefined) {
      sameGivens++;
      process.stderr.write(`seed ${seed} ${TIER_NAMES[tier]}: the office's text matches seed ${twin}'s, names aside\n`);
    } else signatures.set(sig, seed);
    const inv = invariantFailures(report);
    if (inv.length > 0) {
      invFail++;
      process.stderr.write(`seed ${seed} ${TIER_NAMES[tier]}: ${inv.join('; ')}\n`);
    }
    dupReasons += report.distinctReasons.length;
    samePlace += report.liarsApart.length;
    if (g.analysis.rating === tier) accRated++;
    pars.push(g.analysis.par);
    walks.push(g.analysis.walks);
    if (g.analysis.par >= PAR_TARGET[0] && g.analysis.par <= PAR_TARGET[1]) inTarget++;
    for (const r of g.analysis.rivals) routes.push(r.routes.length);
    types.set(g.kase.type, (types.get(g.kase.type) ?? 0) + 1);
    if (g.kase.variant) variants.set(g.kase.variant, (variants.get(g.kase.variant) ?? 0) + 1);
    const sc = refusalShortcut(g.kase, g.analysis.par);
    if (sc.fails) fails++;
    else {
      gains.push(sc.gain as number);
      if (sc.capped) capped++;
      if ((sc.gain as number) > 0) shortcutWins++;
    }
    for (const k of g.kase.confrontations) {
      if (!g.kase.lies.some((l) => l.person === k.person && l.kind === 'secret')) continue;
      if (k.response === 'admit') admitted++;
      else refused++;
    }
    for (const p of g.kase.places) if (!p.scene && !p.offBoard) kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + 1);
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
  rows2.push([
    TIER_NAMES[tier],
    gains.length ? `${median(gains)} / ${Math.max(...gains)}` : '—',
    `${fails}${capped ? `; ${capped} cost > par+2` : ''}`,
    admitted + refused ? `${refused} : ${admitted}` : '—',
    KINDS.filter((k) => kinds.has(k)).map((k) => `${k} ${kinds.get(k)}`).join(', '),
    String(dupReasons),
    String(samePlace),
  ]);
  const setupCell = (t: CaseType) => {
    const s = setups.get(t);
    return s ? `${s.all.size} (means ${s.means.size}, clock ${s.clock.size}, pointer ${s.pointer.size})` : '—';
  };
  sameGivensTotal += sameGivens;
  rows3.push([TIER_NAMES[tier], setupCell('murder'), setupCell('lost-item'), setupCell('lost-pet'), String(sameGivens)]);
}

const table = (head: string[], body: string[][]) => {
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => (r[i] as string).length)));
  const fmt = (r: string[]) => `| ${r.map((x, i) => x.padEnd(widths[i] as number)).join(' | ')} |`;
  return `${fmt(head)}\n| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |\n${body.map(fmt).join('\n')}\n`;
};
process.stdout.write(
  table(['tier', 'generated', 'tries', 'par med [range]', 'par in 5–9', 'walks med', 'rated at tier (accepted / first try)', 'routes/rival mean (hist)', 'types', 'invariant fails', 'time'], rows),
);
process.stdout.write('\n');
process.stdout.write(
  table(['tier', 'refusal shortcut gain med / max', 'shortcut names nobody', 'innocent liars refuse : admit', 'place kinds dealt', 'duplicate reasons', 'culprit & liar same place, hour'], rows2),
);
process.stdout.write('\n');
process.stdout.write(table(['tier', 'murder setups (distinct means, clocks, pointers)', 'lost-item setups', 'lost-pet setups', 'givens matching another seed’s, names aside'], rows3));
process.stdout.write(
  `\nseeds ${from}–${from + n - 1}. Invariants checked on every accepted case: no gaps, every lie collides, unique answer, lead time, places open, no lingering at transit, truthful lists and accounts, one-hour innocent lies, an innocent lie only when it matters, admissions checked, distinct reasons, the culprit and the liar apart, the window in board hours, lists complete, errands short, reasons that fit their stint, no two errands to one house in one hour, lies plausible, reasons match, the path and suggestions motivated.\n`,
);
if (invariantFailuresTotal > 0) process.stdout.write(`INVARIANT FAILURES: ${invariantFailuresTotal}\n`);
if (shortcutWins > 0) process.stdout.write(`REFUSAL SHORTCUT BEATS PAR: ${shortcutWins}\n`);
if (sameGivensTotal > 0) process.stdout.write(`GIVENS MATCHING WORD FOR WORD: ${sameGivensTotal}\n`);
if (invariantFailuresTotal > 0 || shortcutWins > 0 || sameGivensTotal > 0) process.exit(1);
