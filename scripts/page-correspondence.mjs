/**
 * M5 §8's sweep, as a script: every rendered page of 40 oracle runs, through
 * the correspondence checker. Prints the violations by rule, with the first
 * ten in full.
 */
import { generateCase } from '../src/gen/index.ts';
import { buildView } from '../src/game/derive.ts';
import { playOracle } from '../src/game/oracle.ts';
import { checkRun } from '../src/game/correspond-pages.ts';

import { playWandering } from '../src/game/oracle.ts';
import { TROPE_IDS } from '../src/gen/tropes/index.ts';

const all = [];
for (const difficulty of [1, 2, 3]) {
  for (let seed = 1; seed <= 40; seed++) {
    const view = buildView(generateCase(seed, { difficulty }));
    for (const v of checkRun(view, playOracle(view).state)) all.push({ seed, ...v });
    for (const v of checkRun(view, playWandering(view, seed).state)) all.push({ seed, ...v });
  }
}
for (const tropeId of TROPE_IDS) {
  for (let seed = 1; seed <= 10; seed++) {
    const view = buildView(generateCase(seed, { difficulty: 2, tropeId }));
    for (const v of checkRun(view, playOracle(view).state)) all.push({ seed: `${tropeId}/${seed}`, ...v });
  }
}

const byRule = new Map();
for (const v of all) byRule.set(v.rule, (byRule.get(v.rule) ?? 0) + 1);
process.stdout.write(`${all.length} violations\n`);
for (const [rule, n] of [...byRule].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`  ${rule}: ${n}\n`);
}
const tokens = new Map();
for (const v of all) {
  if (v.rule !== 'unknown-name') continue;
  const t = /"([^"]+)"/.exec(v.detail)?.[1] ?? '?';
  tokens.set(t, (tokens.get(t) ?? 0) + 1);
}
process.stdout.write(`tokens: ${[...tokens].map(([t, n]) => `${t}(${n})`).join(' ')}\n`);
for (const v of all.filter((x) => x.rule !== 'unknown-name').slice(0, 8)) {
  process.stdout.write(`\n${v.seed} ${v.where} [${v.rule}] ${v.detail}\n    ${v.text.slice(0, 220)}\n`);
}
