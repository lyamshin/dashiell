/**
 * The client's purpose, counted.
 *
 * M5 §1.4 draws the purpose by relationship × case type. The table is small
 * and the draw is uniform inside a cell, so a purpose that is allowed by many
 * relationships wins by arithmetic rather than by design: before the rebalance
 * `clear-my-name` was 46.5% of four hundred cases.
 *
 *   npx tsx scripts/purpose-distribution.ts [--count 400] [--start 1]
 *                                           [--difficulty 2] [--by-type]
 *
 * `--by-type` breaks the count down by case type as well, which is how the
 * eligibility rules are read: a purpose only has to appear where its case type
 * allows it.
 */

import { generateCase, type CaseType, type Difficulty, type Purpose } from '../src/gen/index.js';
import { parseArgs } from '../src/cli/args.js';

const { flags, values } = parseArgs(process.argv.slice(2));
const count = Number(values.get('count') ?? 400);
const start = Number(values.get('start') ?? 1);
const difficulty = Number(values.get('difficulty') ?? 2) as Difficulty;
const byType = flags.has('by-type');

const ALL: Purpose[] = [
  'find-the-killer-police-wont',
  'clear-my-name',
  'keep-it-quiet',
  'find-it-before-the-cops',
  'get-it-back',
  'bring-them-home',
  'make-sure-they-stay-gone',
  'settle-a-debt-with-the-dead',
];

const total = new Map<Purpose, number>();
const perType = new Map<CaseType, Map<Purpose, number>>();
const typeTotals = new Map<CaseType, number>();

for (let seed = start; seed < start + count; seed++) {
  const kase = generateCase(seed, { difficulty });
  const purpose = kase.clientBrief.purpose;
  const type = kase.act.type;
  total.set(purpose, (total.get(purpose) ?? 0) + 1);
  typeTotals.set(type, (typeTotals.get(type) ?? 0) + 1);
  const row = perType.get(type) ?? new Map<Purpose, number>();
  row.set(purpose, (row.get(purpose) ?? 0) + 1);
  perType.set(type, row);
}

const pct = (n: number, of: number): string => `${((100 * n) / (of || 1)).toFixed(1)}%`;
const pad = (s: string, n: number): string => s.padEnd(n);

const lines: string[] = [];
lines.push(`purpose distribution — seeds ${start}..${start + count - 1}, difficulty ${difficulty}`);
lines.push('─'.repeat(64));
const sorted = ALL.slice().sort((a, b) => (total.get(b) ?? 0) - (total.get(a) ?? 0));
for (const purpose of sorted) {
  const n = total.get(purpose) ?? 0;
  lines.push(`${pad(purpose, 30)} ${String(n).padStart(4)}  ${pct(n, count).padStart(6)}`);
}
const top = Math.max(...ALL.map((p) => total.get(p) ?? 0));
lines.push('─'.repeat(64));
lines.push(`${count} cases · most common ${pct(top, count)} · ${ALL.filter((p) => (total.get(p) ?? 0) > 0).length} of ${ALL.length} purposes drawn`);

if (byType) {
  for (const type of ['murder', 'robbery', 'missing'] as CaseType[]) {
    const row = perType.get(type) ?? new Map<Purpose, number>();
    const of = typeTotals.get(type) ?? 0;
    lines.push('');
    lines.push(`${type} — ${of} cases`);
    for (const purpose of ALL) {
      const n = row.get(purpose) ?? 0;
      if (n === 0) continue;
      lines.push(`  ${pad(purpose, 30)} ${String(n).padStart(4)}  ${pct(n, of).padStart(6)}`);
    }
  }
}

process.stdout.write(lines.join('\n') + '\n');
