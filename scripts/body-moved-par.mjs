/**
 * M5 §6's number: what moving the night's first room off the scene did to par.
 *
 *   npx tsx scripts/body-moved-par.mjs
 */
import { generateCase } from '../src/gen/index.ts';
import { buildView, gamePar, parShift } from '../src/game/derive.ts';
import { playOracle } from '../src/game/oracle.ts';

const shifts = new Map();
let n = 0;
let ok = 0;
let exact = 0;
for (const difficulty of [1, 2, 3]) {
  for (let seed = 1; seed <= 40; seed++) {
    const view = buildView(generateCase(seed, { difficulty, tropeId: 'body-moved' }));
    const shift = parShift(view.kase);
    shifts.set(shift, (shifts.get(shift) ?? 0) + 1);
    n++;
    const run = playOracle(view);
    if (run.ok) ok++;
    if (run.ok && run.actions === gamePar(view.kase)) exact++;
  }
}
const rows = [...shifts.entries()].sort((a, b) => a[0] - b[0]);
const mean = rows.reduce((t, [s, k]) => t + s * k, 0) / n;
process.stdout.write(`body-moved, ${n} cases over three difficulties\n`);
for (const [shift, count] of rows) {
  process.stdout.write(`  shift ${shift > 0 ? '+' : ''}${shift}: ${count} (${Math.round((count / n) * 100)}%)\n`);
}
process.stdout.write(`  mean ${mean.toFixed(2)}\n`);
process.stdout.write(`  oracle inside par: ${ok}/${n}; exactly at par: ${exact}/${n}\n`);
