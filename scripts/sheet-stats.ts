/**
 * M13 — the sheets, measured.
 *
 *   npx tsx scripts/sheet-stats.ts [--seeds 20] [--tiers 0,1,2,3,4,5,none] [--players oracle,wanderer]
 *   npx tsx scripts/sheet-stats.ts --dump arrive --seeds 3 --tiers 4   # print those pages, with their sheets
 *
 * Plays every seed at every tier with each player and reports, over the pages
 * written from sheets: the share that paid a role off (a callback; the
 * designer's number is about seventy in a hundred), how often each sheet was
 * used, and how often a sheet came round twice in one night (and twice in a
 * row for the same moment, which the chooser never allows while another fits).
 * Also the checks every milestone holds: beat coverage, correspondence and the
 * reader lint, over the same runs.
 */

import { generateCase } from '../src/gen/index.js';
import { buildView } from '../src/game/derive.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { lintRun } from '../src/game/reader-lint.js';
import { renderPageText } from '../src/game/transcript.js';
import type { RunState } from '../src/game/types.js';
import { SHEETS } from '../src/game/scene/sheets.js';

const args = process.argv.slice(2);
const arg = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? (args[i + 1] as string) : fallback;
};
const seeds = Number(arg('seeds', '20'));
const from = Number(arg('from', '1'));
const tiers = arg('tiers', '0,1,2,3,4,5,none').split(',');
const players = arg('players', 'oracle,wanderer').split(',');
const dump = arg('dump', '');
const only = arg('seed', '');

interface Run {
  label: string;
  state: RunState;
  view: ReturnType<typeof buildView>;
}

const runs: Run[] = [];
const seedList = only ? only.split(',').map(Number) : Array.from({ length: seeds }, (_, i) => from + i);
for (const seed of seedList) {
  for (const t of tiers) {
    const kase = t === 'none' ? generateCase(seed) : generateCase(seed, { tier: t === 'over-easy' ? 'over-easy' : (Number(t) as 0 | 1 | 2 | 3 | 4 | 5) });
    const view = buildView(kase);
    for (const who of players) {
      const state = who === 'oracle' ? playOracle(view).state : playWandering(view, seed).state;
      runs.push({ label: `seed ${seed} tier ${t} ${who}`, state, view });
    }
  }
}

if (dump) {
  for (const r of runs) {
    for (const page of r.state.log) {
      const moments = (page.sheets ?? []).map((s) => s.moment);
      if (dump !== 'all' && page.shape !== dump && !moments.includes(dump)) continue;
      const tag = (page.sheets ?? []).map((s) => `${s.id}${s.callback ? '*' : ''}`).join(' ');
      process.stdout.write(`\n=== ${r.label} p${page.n} ${page.shape ?? ''} [${tag}] ${page.sheets?.[0]?.rolled ? 'rolled' : ''}\n`);
      process.stdout.write(renderPageText(page, r.view, r.state, { gaps: true }) + '\n');
    }
  }
  process.exit(0);
}

let pages = 0;
let sheeted = 0;
let rolled = 0;
let paid = 0;
const used = new Map<string, number>();
const byMoment = new Map<string, { pages: number; paid: number }>();
let repeatsNight = 0;
let repeatsRow = 0;
let nights = 0;
let coverageIssues = 0;
let required = 0;
let written = 0;
let correspondence = 0;
let lint = 0;
const lintRules = new Map<string, number>();
const corrRules = new Map<string, number>();
for (const r of runs) {
  nights++;
  const tonight = new Map<string, number>();
  const lastOf = new Map<string, string>();
  for (const page of r.state.log) {
    if (page.shape === undefined || page.shape === 'office' || page.shape === 'repeat' || page.shape === 'other') {
      if (page.shape !== 'office') continue;
    }
    pages++;
    const sheets = page.sheets ?? [];
    if (sheets.length === 0) continue;
    sheeted++;
    if (sheets.some((s) => s.rolled)) rolled++;
    if (sheets.some((s) => s.callback)) paid++;
    for (const s of sheets) {
      used.set(s.id, (used.get(s.id) ?? 0) + 1);
      const m = byMoment.get(s.moment) ?? { pages: 0, paid: 0 };
      m.pages++;
      if (s.callback) m.paid++;
      byMoment.set(s.moment, m);
      const n = (tonight.get(s.id) ?? 0) + 1;
      tonight.set(s.id, n);
      if (n > 1) repeatsNight++;
      if (lastOf.get(s.moment) === s.id) repeatsRow++;
      lastOf.set(s.moment, s.id);
    }
  }
  const cov = checkRunCoverage(r.view, r.state);
  coverageIssues += cov.issues.length;
  required += cov.required;
  written += cov.written;
  for (const v of checkRun(r.view, r.state)) {
    correspondence++;
    corrRules.set(v.rule, (corrRules.get(v.rule) ?? 0) + 1);
    if (correspondence <= 5) process.stderr.write(`correspondence: ${r.label} ${v.where} ${v.rule}: ${v.detail} — ${v.text}\n`);
  }
  for (const v of lintRun(r.view, r.state)) {
    lint++;
    lintRules.set(v.rule, (lintRules.get(v.rule) ?? 0) + 1);
    if (lint <= 5) process.stderr.write(`lint: ${r.label} p${v.page} ${v.rule}: ${v.detail}\n`);
  }
  if (cov.issues.length > 0) for (const i of cov.issues.slice(0, 2)) process.stderr.write(`coverage: ${r.label} p${i.page} ${i.rule}: ${i.detail}\n`);
}

const pct = (a: number, b: number): string => (b === 0 ? '—' : `${((100 * a) / b).toFixed(1)}%`);
const out: string[] = [];
out.push(`${runs.length} nights (${seedList.length} seeds × ${tiers.join('/')} × ${players.join('/')}), ${pages} pages`);
out.push(`pages written from sheets: ${sheeted} (${pct(sheeted, pages)})`);
out.push(`callback share: ${paid} of ${sheeted} sheeted pages paid a role off (${pct(paid, sheeted)}); the roll wanted one on ${rolled} (${pct(rolled, sheeted)})`);
for (const [m, v] of [...byMoment.entries()].sort()) out.push(`  ${m.padEnd(9)} ${String(v.pages).padStart(5)} uses, ${pct(v.paid, v.pages)} on a callback page`);
out.push('sheet usage:');
for (const s of SHEETS) out.push(`  ${s.moment.padEnd(9)} ${s.id.padEnd(10)} ${String(used.get(s.id) ?? 0).padStart(5)}  ${s.name}`);
out.push(`within-night repeats: ${repeatsNight} uses of a sheet already used that night (${(repeatsNight / nights).toFixed(2)} a night); ${repeatsRow} the same sheet twice running for one moment`);
out.push(`beat coverage: ${written} of ${required} required beats written; ${coverageIssues} coverage issues`);
out.push(`correspondence: ${correspondence}${corrRules.size ? ` (${[...corrRules].map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`);
out.push(`reader lint: ${lint}${lintRules.size ? ` (${[...lintRules].map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`);
process.stdout.write(out.join('\n') + '\n');
