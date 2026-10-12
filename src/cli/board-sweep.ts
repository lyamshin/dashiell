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
import { breaksAt, innocentLie, rate } from '../gen/board/path.js';
import { techniquesUpTo } from '../gen/board/tiers.js';
import { pickType } from '../gen/board/index.js';
import { PAR_TARGET } from '../gen/board/tiers.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';
import { isWorld, worldCtx } from '../gen/board/world/index.js';
import { castOf, dealBoard } from '../game/board/model.js';
import type { BoardCase } from '../gen/board/types.js';

/**
 * docs/42 §5: `npm run board-sweep -- --tier T --n 200` (or `--tier all`).
 * Generation success, par, the tier-rating hit rate, routes per rival, the
 * case-type mix, and the invariants, which no accepted case may fail. A second
 * table covers the designer's decisions of 2026-09-28: the refusal shortcut's
 * gain on par, how innocent liars answer, the place kinds dealt, duplicate
 * reasons, the culprit and the liar claiming one place at one hour, and
 * (decided 2026-10-11) whose broken story the designed path meets first. A
 * third (4a.2) counts distinct setups per case type, and seeds whose office
 * text matches another's word for word, names aside (which must be none).
 */

ignoreBrokenPipe();
const { values } = parseArgs(process.argv.slice(2));
const n = Number(values.get('n') ?? 200);
const from = Number(values.get('from') ?? 1);
const tierArg = values.get('tier') ?? 'all';
// docs/48 §4: `--world neighbourhood` casts every night from the bible, and adds the variety table.
const worldArg = values.get('world');
if (worldArg !== undefined && !isWorld(worldArg)) {
  process.stderr.write(`No world called "${worldArg}". Try --world neighbourhood.\n`);
  process.exit(1);
}
const ctx = worldArg ? worldCtx(worldArg) : undefined;
const tiers: TierIndex[] = tierArg === 'all' ? [0, 1, 2, 3, 4, 5] : [parseTier(tierArg)].filter((t): t is TierIndex => t !== null);
if (!Number.isInteger(n) || n < 1 || tiers.length === 0) {
  process.stderr.write('usage: npm run board-sweep -- --tier <tier|all> [--n 200] [--from 1] [--world neighbourhood]\n');
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
const rows4: string[][] = [];
let culpritRepeats = 0;
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
  // Decided 2026-10-11: nights with two liars, and whose story the designed path breaks first.
  let two = 0;
  let innocentFirst = 0;
  let sameStep = 0;
  const setups = new Map<CaseType, { all: Set<string>; means: Set<string>; clock: Set<string>; pointer: Set<string> }>();
  const signatures = new Map<string, number>();
  let sameGivens = 0;
  const nights: BoardCase[] = [];
  for (let seed = from; seed < from + n; seed++) {
    const c0 = buildCase(seed, tier, pickType(seed, tier), 0, ctx);
    if (c0 && invariantFailures(checkInvariants(c0)).length === 0) {
      cands++;
      if (rate(c0) === tier) candHit++;
    }
    const g = generateBoard(seed, tier, ctx ? { world: ctx } : {});
    if (!g) continue;
    nights.push(g.kase);
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
    const inn = innocentLie(g.kase);
    if (inn) {
      const order = g.analysis.path.map((x) => x.q);
      const T = techniquesUpTo(tier);
      const i = breaksAt(g.kase, order, T, inn.person, inn.hour);
      const k = breaksAt(g.kase, order, T, g.kase.crime.culprit, g.kase.crime.hour);
      two++;
      if (i < k) innocentFirst++;
      else if (i === k) sameStep++;
    }
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
    two ? `${pct(innocentFirst, two)} (${pct(sameStep, two)})` : '—',
  ]);
  const setupCell = (t: CaseType) => {
    const s = setups.get(t);
    return s ? `${s.all.size} (means ${s.means.size}, clock ${s.clock.size}, pointer ${s.pointer.size})` : '—';
  };
  sameGivensTotal += sameGivens;
  rows3.push([TIER_NAMES[tier], setupCell('murder'), setupCell('lost-item'), setupCell('lost-pet'), String(sameGivens)]);
  if (ctx) {
    const v = variety(tier, nights);
    culpritRepeats += v.repeats;
    rows4.push(v.row);
  }
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
  table(['tier', 'refusal shortcut gain med / max', 'shortcut names nobody', 'innocent liars refuse : admit', 'place kinds dealt', 'duplicate reasons', 'culprit & liar same place, hour', 'innocent’s story first on the path (same step)'], rows2),
);
process.stdout.write('\n');
process.stdout.write(table(['tier', 'murder setups (distinct means, clocks, pointers)', 'lost-item setups', 'lost-pet setups', 'givens matching another seed’s, names aside'], rows3));
if (ctx) {
  process.stdout.write('\n');
  process.stdout.write(
    table(
      ['tier', 'distinct casts (suspect sets)', 'culprits / wronged used', 'culprit twice running, by seed', 'with continuity: culprit twice running', 'wronged again within ten nights (twice running)', 'places used in 60 nights', 'people used in 60 nights (missing)', 'all used by night'],
      rows4,
    ),
  );
}
process.stdout.write(
  `\nseeds ${from}–${from + n - 1}. Invariants checked on every accepted case: no gaps, every lie collides, unique answer, lead time, places open, no lingering at transit, truthful lists and accounts, one-hour innocent lies, an innocent lie only when it matters, admissions checked, distinct reasons, the culprit and the liar apart, the window in board hours, lists complete, errands short, reasons that fit their stint, no two errands to one house in one hour, lies plausible, reasons match, the path and suggestions motivated, two broken stories at the crime hour.\n`,
);
if (invariantFailuresTotal > 0) process.stdout.write(`INVARIANT FAILURES: ${invariantFailuresTotal}\n`);
if (shortcutWins > 0) process.stdout.write(`REFUSAL SHORTCUT BEATS PAR: ${shortcutWins}\n`);
if (sameGivensTotal > 0) process.stdout.write(`GIVENS MATCHING WORD FOR WORD: ${sameGivensTotal}${ctx ? ' (the same few blocks every night: reported, not failed)' : ''}\n`);
if (culpritRepeats > 0) process.stdout.write(`CULPRIT TWICE RUNNING WITH CONTINUITY: ${culpritRepeats}\n`);
if (invariantFailuresTotal > 0 || shortcutWins > 0 || (sameGivensTotal > 0 && !ctx) || culpritRepeats > 0) process.exit(1);

/**
 * docs/48 §4, variety: the nights by seed (casts, culprits, the wronged), and a player's run of nights
 * dealt with continuity, as the book deals them: each night from the seed after the last, keeping the
 * last culprit and the last ten wronged off it.
 */
function variety(tier: TierIndex, byseed: BoardCase[]): { row: string[]; repeats: number } {
  const casts = new Set(byseed.map((c) => c.people.filter((p) => p.role === 'suspect').map((p) => p.world).sort().join('+')));
  const culprits = new Set(byseed.map((c) => castOf(c).culprit));
  const wronged = new Set(byseed.map((c) => castOf(c).victim));
  let rawRepeats = 0;
  for (let i = 1; i < byseed.length; i++) if (castOf(byseed[i] as BoardCase).culprit === castOf(byseed[i - 1] as BoardCase).culprit) rawRepeats++;
  const seq: BoardCase[] = [];
  const recent = { culprits: [] as string[], victims: [] as string[] };
  let s = from;
  for (let k = 0; k < byseed.length; k++) {
    const d = dealBoard(s, tier, undefined, { world: worldArg as string, avoid: { culprits: recent.culprits.slice(-1), victims: recent.victims.slice(-10) } });
    seq.push(d.kase);
    const kc = castOf(d.kase);
    if (kc.culprit) recent.culprits.push(kc.culprit);
    if (kc.victim) recent.victims.push(kc.victim);
    s = d.kase.seed + 1;
  }
  let repeats = 0;
  let again = 0;
  let twice = 0;
  for (let i = 1; i < seq.length; i++) {
    const k = castOf(seq[i] as BoardCase);
    if (k.culprit === castOf(seq[i - 1] as BoardCase).culprit) repeats++;
    if (k.victim === castOf(seq[i - 1] as BoardCase).victim) twice++;
    if (seq.slice(Math.max(0, i - 10), i).some((x) => castOf(x).victim === k.victim)) again++;
  }
  const bible = (ctx as NonNullable<typeof ctx>).bible;
  const placesIn = (c: BoardCase) => c.places.flatMap((p) => (p.world ? [p.world] : []));
  const peopleIn = (c: BoardCase) => c.people.flatMap((p) => (p.world ? [p.world] : []));
  const first60 = seq.slice(0, 60);
  const pl = new Set(first60.flatMap(placesIn));
  const pe = new Set(first60.flatMap(peopleIn));
  const missing = bible.people.filter((p) => !pe.has(p.id)).map((p) => p.id);
  // The night by which everything had been used, in the whole run.
  const seenP = new Set<string>();
  const seenQ = new Set<string>();
  let by = '—';
  seq.forEach((c, i) => {
    for (const x of placesIn(c)) seenP.add(x);
    for (const x of peopleIn(c)) seenQ.add(x);
    if (by === '—' && seenP.size === bible.places.length && seenQ.size === bible.people.length) by = String(i + 1);
  });
  return {
    repeats,
    row: [
      TIER_NAMES[tier],
      `${casts.size} of ${byseed.length}`,
      `${culprits.size} / ${wronged.size}`,
      String(rawRepeats),
      String(repeats),
      `${again} (${twice} running)`,
      `${pl.size} of ${bible.places.length}`,
      `${pe.size} of ${bible.people.length}${missing.length ? ` (${missing.join(', ')})` : ''}`,
      by,
    ],
  };
}
