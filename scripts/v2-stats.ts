/**
 * v2 — the puzzle stage's measures per tier (docs/36).
 *
 *   npx tsx scripts/v2-stats.ts --seeds 50 --tiers 0,2,4,5 [--seed 3 --tier 4 --graph]
 *
 * Per tier: generation time and attempts, the case mix, the peak technique,
 * R(r) for key and other rivals, critical facts, width, load, the book, and
 * how often each band rule holds. `--graph` prints one case's deduction graph.
 */

import { diagnoseCase, generateCase } from '../src/gen/generate.js';
import { TECH_COST } from '../src/gen/logic/solver.js';
import { ignoreBrokenPipe, parseArgs } from '../src/cli/args.js';
import type { Case } from '../src/gen/types.js';

ignoreBrokenPipe();
const { flags, values } = parseArgs(process.argv.slice(2));
const seeds = Number(values.get('seeds') ?? 20);
const tiers = (values.get('tiers') ?? '0,2,4,5').split(',').map(Number);
const level = Number(values.get('level') ?? 2) as 1 | 2 | 3 | 4;
const TIER_NAMES = ['Raw', 'Coddled', 'Poached', 'Soft-boiled', 'Medium', 'Hard-boiled'];

function printGraph(k: Case): void {
  const g = k.v2?.graph;
  const b = k.v2?.book;
  if (!g || !b) return;
  const who = (id?: string) => k.people.find((p) => p.id === id)?.surname ?? id ?? '';
  const clue = (id: string) => k.findable.find((c) => c.id === id);
  console.log(`${k.act.type} · ${k.act.tropeId} · ${b.title} (scores ${JSON.stringify(b.scores)}) · gag ${b.gag} · motif ${b.motif?.name}`);
  console.log(`peak ${g.stats.peak} · load ${g.stats.load} · width ${g.stats.widthMin}/${g.stats.widthMedian} · critical ${g.stats.critical.length} · backdoors ${g.stats.backdoors.length} · tatham ${g.stats.tatham} · unique ${g.stats.unique} (${g.stats.uniqueUnknown} unknown) · dug ${JSON.stringify(g.stats.dug)} · bands ${JSON.stringify(g.stats.bands)}`);
  console.log(`par ${k.par} budget ${k.budget} findable ${k.findable.length}`);
  console.log('RIVALS');
  for (const r of g.rivals) {
    console.log(`  ${r.key ? '*' : ' '} ${r.label} — R=${r.routes} via ${r.tech}${r.id === g.bottleneck ? '  <- bottleneck' : ''}`);
    for (const route of r.routeFacts) console.log(`      · ${route.map((id) => `${id}[${clue(id)?.kind}:${clue(id)?.source.type === 'person' ? who((clue(id)?.source as { personId: string }).personId) : 'place'}]`).join(' + ')}`);
  }
  console.log('STEPS');
  const acts = new Map<string, string>();
  for (const a of b.acts) for (const s of a.steps) acts.set(s, a.id);
  for (const s of g.steps) {
    if (s.kind === 'not' && s.tech === 'T5') continue;
    console.log(`  [${acts.get(s.id) ?? '-'}] ${s.id} ${s.kind} ${s.tech} (peak ${s.peak}, depth ${s.depth}) ${s.label}`);
    const facts = s.facts.map((id) => `${id}:${(clue(id)?.rule ?? clue(id)?.text ?? '').slice(0, 90)}`);
    for (const f of facts) console.log(`        - ${f}`);
    if (s.needs.length) console.log(`        needs ${s.needs.join(', ')}`);
  }
  console.log('TURN', b.turn.join(', '), '· bottleneck step', b.bottleneck, b.signature);
  const counts: Record<string, number> = {};
  for (const c of Object.values(g.classes)) counts[c] = (counts[c] ?? 0) + 1;
  console.log('CLASSES', JSON.stringify(counts));
}

if (values.has('seed')) {
  const k = generateCase(Number(values.get('seed')), { tier: Number(values.get('tier') ?? 4) as 4, level, engine: 'v2' });
  printGraph(k);
  process.exit(0);
}

const pct = (n: number, d: number) => `${Math.round((100 * n) / Math.max(1, d))}%`;
const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};
console.log('| tier | dealt | ms (max) | attempts | murder / lost pet | peak | key R (median, min) | other R (median) | critical | width min / median | load | par | books | bands held (peak, key, other, critical, width, load) |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const tier of tiers) {
  let dealt = 0;
  let ms = 0;
  let maxMs = 0;
  let attempts = 0;
  const types: Record<string, number> = {};
  const peaks: Record<string, number> = {};
  const keyR: number[] = [];
  const otherR: number[] = [];
  const critical: number[] = [];
  const wmin: number[] = [];
  const wmed: number[] = [];
  const load: number[] = [];
  const par: number[] = [];
  const books: Record<string, number> = {};
  const bands: Record<string, number> = {};
  const rejections: Record<string, number> = {};
  for (let seed = 1; seed <= seeds; seed++) {
    const t0 = performance.now();
    let k: Case;
    try {
      const d = diagnoseCase(seed, level, { tier: tier as 4, level, engine: 'v2' });
      k = d.case;
      for (const r of d.diagnostics.rejections) {
        const key = r.replace(/p-\w+/g, 'X').replace(/\d+/g, 'N').slice(0, 70);
        rejections[key] = (rejections[key] ?? 0) + 1;
      }
    } catch (e) {
      rejections[`THREW ${(e as Error).message.slice(0, 50)}`] = (rejections[`THREW ${(e as Error).message.slice(0, 50)}`] ?? 0) + 1;
      continue;
    }
    const dt = performance.now() - t0;
    ms += dt;
    maxMs = Math.max(maxMs, dt);
    dealt++;
    attempts += k.attempts;
    types[k.act.type] = (types[k.act.type] ?? 0) + 1;
    const g = k.v2?.graph;
    if (!g) continue;
    peaks[g.stats.peak] = (peaks[g.stats.peak] ?? 0) + 1;
    for (const r of g.rivals) (r.key && r.kind === 'who' ? keyR : otherR).push(Math.min(r.routes, 4));
    critical.push(g.stats.critical.length);
    wmin.push(g.stats.widthMin);
    wmed.push(g.stats.widthMedian);
    load.push(g.stats.load);
    par.push(k.par);
    const b = k.v2?.book;
    if (b) books[b.title] = (books[b.title] ?? 0) + 1;
    for (const [name, ok] of Object.entries(g.stats.bands)) if (ok) bands[name] = (bands[name] ?? 0) + 1;
  }
  const peakText = Object.entries(peaks)
    .sort((a, b) => TECH_COST[a[0] as 'T1'] - TECH_COST[b[0] as 'T1'])
    .map(([p, n]) => `${p} ${pct(n, dealt)}`)
    .join(', ');
  const bookText = Object.entries(books).map(([b, n]) => `${b} ${n}`).join(', ');
  const bandText = ['peak', 'keyRoutes', 'otherRoutes', 'critical', 'width', 'load'].map((b) => pct(bands[b] ?? 0, dealt)).join(', ');
  console.log(
    `| ${TIER_NAMES[tier]} | ${dealt}/${seeds} | ${Math.round(ms / Math.max(1, dealt))} (${Math.round(maxMs)}) | ${(attempts / Math.max(1, dealt)).toFixed(1)} | ${types['murder'] ?? 0} / ${types['lost-pet'] ?? 0} | ${peakText} | ${median(keyR)}, ${Math.min(...keyR)} | ${median(otherR)} | ${median(critical)} | ${median(wmin)} / ${median(wmed)} | ${median(load)} | ${median(par)} | ${bookText} | ${bandText} |`,
  );
  if (flags.has('why')) {
    for (const [r, n] of Object.entries(rejections).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`    ${n} × ${r}`);
  }
}
