/**
 * The M10 sweeps — reader lint, correspondence, beat coverage — on nights read
 * by somebody with a history (docs/25).
 *
 *   npx tsx scripts/history-sweep.ts [--people 6] [--nights 40]
 *
 * The tests hold those sweeps over fresh nights, where the dealer has no
 * history and every card is in the running. A reader on their thirtieth night
 * is dealt from what is left of each key, which is a different set of cards.
 * Each simulated reader has one store, and plays the oracle's route on one
 * case after another, every tier in turn, with `loadBurned` and `addBurned`
 * as the book does them. Every night is linted, traced and covered.
 */

import { generateCase } from '../src/gen/index.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import type { Page } from '../src/game/types.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { playOracle } from '../src/game/oracle.js';
import { lintRun } from '../src/game/reader-lint.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { addBurned, loadBurned, type KeyValueStore } from '../src/game/storage.js';
import { crossRunOnly, settleReads } from '../src/game/voice/cards.js';

const argv = process.argv.slice(2);
const arg = (name: string, d: number): number => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? Number(argv[i + 1]) : d;
};
const PEOPLE = arg('people', 6);
const NIGHTS = arg('nights', 40);

const memory = (): KeyValueStore => {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

/** The M10 test's exception, as it has it: the hour is in the clue's own record and no fact of it. */
function recordOwnHour(view: CaseView, page: Page | undefined, detail: string): boolean {
  const m = /^(\d{1,2}):(\d{2}) PM/.exec(detail);
  if (!page || !m) return false;
  const tick = (Number(m[1]) - 6) * 2 + (m[2] === '30' ? 1 : 0);
  const face = `${m[1]}:${m[2]} PM`;
  return page.found.some((id) => {
    const c = view.findableById.get(id);
    if (!c || !(c.textRecord ?? c.text).includes(face)) return false;
    return !c.establishes.some((f) => ('tick' in f && f.tick === tick) || ('ticks' in f && f.ticks.includes(tick as never)));
  });
}

let generators = 0;
const lint = new Map<string, number>();
const corr = new Map<string, number>();
const examples: string[] = [];
let pages = 0;
let covered = 0;
let nights = 0;

for (let person = 0; person < PEOPLE; person++) {
  const store = memory();
  for (let night = 0; night < NIGHTS; night++) {
    const seed = 1000 + person * 97 + night;
    const tier = night % 6;
    const view = buildView(generateCase(seed, { tier: tier as 0 | 1 | 2 | 3 | 4 | 5, level: 2 }));
    const commands = playOracle(view).steps.map((s) => s.command);
    let state = newRun(view, { detectiveName: 'Dashiell', persistedBurned: loadBurned(store) });
    addBurned(store, crossRunOnly(state.burned), settleReads);
    for (const command of commands) {
      const result = stepInput(state, command, view, loadBurned(store));
      state = result.state;
      addBurned(store, crossRunOnly(result.page.cardsUsed), settleReads);
    }
    nights++;
    const label = `reader ${person} night ${night + 1} (seed ${seed}, T${tier})`;
    for (const i of lintRun(view, state)) {
      lint.set(i.rule, (lint.get(i.rule) ?? 0) + 1);
      if (examples.length < 20) examples.push(`${label} p${i.page + 1} lint ${i.rule}: ${i.detail}`);
    }
    for (const v of checkRun(view, state)) {
      // Known and not the engine's (docs/23, "Not fixed"; the M10 test skips
      // it the same way): a find printing the generator's own sentence, with
      // an hour its clue's facts no longer hold.
      const page = state.log.find((p) => p.n === Number(/page (\d+)/.exec(v.where)?.[1]));
      if (v.rule === 'time-disagrees' && / find$/.test(v.where) && recordOwnHour(view, page, v.detail)) {
        generators++;
        continue;
      }
      corr.set(v.rule, (corr.get(v.rule) ?? 0) + 1);
      if (examples.length < 20) examples.push(`${label} ${v.where} ${v.rule}: ${v.detail}`);
    }
    const c = checkRunCoverage(view, state);
    pages += c.pages;
    covered += c.covered;
    for (const i of c.issues) if (examples.length < 20) examples.push(`${label} p${i.page + 1} coverage ${i.rule}: ${i.detail}`);
  }
}

const list = (m: Map<string, number>): string =>
  m.size === 0 ? '0' : [...m.entries()].map(([k, n]) => `${k} ${n}`).join(', ');
console.log(`${nights} nights by ${PEOPLE} readers with a history`);
console.log(`reader lint: ${list(lint)}`);
console.log(`correspondence: ${list(corr)} (and ${generators} hours in a generator's own sentence, skipped as the M10 test skips them)`);
console.log(`beat coverage: ${covered} of ${pages} night pages`);
for (const e of examples) console.log(`  ${e}`);
