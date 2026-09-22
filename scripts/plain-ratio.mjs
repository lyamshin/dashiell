/**
 * The M5 §1 measurement, as a script so the notes can quote a number.
 *
 *   npx tsx scripts/plain-ratio.mjs
 *
 * 100 oracle runs and 40 wandering runs at every difficulty, and for each the
 * mean plain ratio over pages, the worst page, and how many pages fall under
 * the 0.5 floor.
 */
import { generateCase } from '../src/gen/index.ts';
import { buildView } from '../src/game/derive.ts';
import { playOracle, playWandering } from '../src/game/oracle.ts';

const rows = [];
const bad = [];
let pages = 0;
let total = 0;
let worst = { ratio: 2, where: '' };

const record = (label, state) => {
  for (const page of state.log) {
    const sum = page.plain + page.image;
    const ratio = sum === 0 ? 1 : page.plain / sum;
    pages++;
    total += ratio;
    if (ratio < worst.ratio) worst = { ratio, where: `${label} page ${page.n}` };
    if (ratio < 0.5) bad.push(`${label} page ${page.n}: ${ratio.toFixed(2)} (${page.plain}/${sum})`);
  }
};

for (const difficulty of [1, 2, 3]) {
  for (let seed = 1; seed <= 100; seed++) {
    const view = buildView(generateCase(seed, { difficulty }));
    record(`d${difficulty} oracle ${seed}`, playOracle(view).state);
  }
  for (let seed = 1; seed <= 40; seed++) {
    const view = buildView(generateCase(seed, { difficulty }));
    record(`d${difficulty} wander ${seed}`, playWandering(view, seed).state);
  }
}

rows.push(`pages ${pages}`);
rows.push(`mean  ${(total / pages).toFixed(4)}`);
rows.push(`min   ${worst.ratio.toFixed(4)} (${worst.where})`);
rows.push(`under 0.5: ${bad.length}`);
for (const line of bad.slice(0, 10)) rows.push(`  ${line}`);
process.stdout.write(rows.join('\n') + '\n');
