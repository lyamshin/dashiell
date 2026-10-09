/**
 * docs/43 "Done means", measured: `npx tsx scripts/board-measure.ts [--seeds 50] [--tiers 0,1,2,3,4,5]`
 *
 * For each tier and each case type it builds, over the seeds:
 * - the oracle's route (the designed path through the engine): solved, and at par;
 * - the refusal shortcut through the engine: never under par;
 * - the wanderer (random reasonable choices): how often it solves;
 * - the reader lint and the plain-terms check over the oracle's and the wanderer's pages;
 * - first-level choices a page (median and most).
 */

import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices } from '../src/game/board/choices.js';
import { stepBoard, newBoardRun } from '../src/game/board/engine.js';
import { lintBoardRun, boardPlayerText } from '../src/game/board/lint.js';
import { dealBoard, parCalls, tierName, type BoardRun } from '../src/game/board/model.js';
import { confessionCalls, playBoardOracle, playWanderer, refusalShortcutCalls } from '../src/game/board/oracle.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('seeds') ?? 50);
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as TierIndex[];
const terms = loadPlainTerms();

/** First-level choices on a page: each person, each search, each place shown, the fold, the free row. */
function firstLevel(groups: ReturnType<typeof boardChoices>): number {
  let n = 0;
  for (const g of groups) {
    if (g.kind === 'ask') n += 1;
    else n += g.choices.length + ((g.more ?? []).length > 0 ? 1 : 0);
  }
  return n;
}

const rows: string[] = [];
rows.push('| tier | type | n | oracle solves | at par | par calls median [range] | shortcut under par | shortcut names nobody | confession route under par | wanderer solves | lint issues | plain-terms hits | choices a page median / max | callback pages |');
rows.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const examples: string[] = [];
for (const tier of tiers) {
  for (const type of typesFor(tier) as CaseType[]) {
    let solved = 0;
    let atPar = 0;
    const pars: number[] = [];
    let under = 0;
    let nobody = 0;
    let wander = 0;
    let confess = 0;
    let lint = 0;
    let jargon = 0;
    const counts: number[] = [];
    let pages = 0;
    let callbacks = 0;
    for (let s = 1; s <= N; s++) {
      const d = dealBoard(s, tier, type);
      const o = playBoardOracle(d);
      const par = parCalls(d);
      pars.push(par);
      if (o.ok) solved++;
      else if (examples.length < 12) examples.push(`oracle ${tierName(tier)} ${type} seed ${s}: ${o.reason}`);
      if (o.run.used === par) atPar++;
      const sc = refusalShortcutCalls(d);
      if (sc === null) nobody++;
      else if (sc.calls < par) {
        under++;
        if (examples.length < 12) examples.push(`shortcut ${tierName(tier)} ${type} seed ${s}: ${sc.calls} < par ${par}`);
      }
      const cf = confessionCalls(d);
      if (cf !== null && cf < par) confess++;
      const w = playWanderer(d, s);
      if (w.ok) wander++;
      for (const run of [o.run, w.run] as BoardRun[]) {
        const issues = lintBoardRun(d, run);
        lint += issues.length;
        if (issues.length && examples.length < 24) examples.push(`lint ${tierName(tier)} ${type} seed ${s} p${(issues[0]?.page ?? 0) + 1}: ${issues[0]?.rule} ${issues[0]?.detail}`);
        for (const t of boardPlayerText(run)) {
          const hits = findJargon(t, terms) as { term: string; match: string }[];
          jargon += hits.length;
          if (hits.length && examples.length < 30) examples.push(`jargon ${tierName(tier)} ${type} seed ${s}: ${hits[0]?.term} "${hits[0]?.match}"`);
        }
      }
      for (const p of o.run.log) {
        if (!p.board || p.board.job === 'office' || p.board.job === 'nothing') continue;
        pages++;
        if (p.board.callback) callbacks++;
      }
      // Choices a page, along the oracle's route.
      let r = newBoardRun(d);
      counts.push(firstLevel(boardChoices(d, r)));
      for (const cmd of o.commands) {
        r = stepBoard(d, r, cmd).run;
        if (!r.reportOpen) counts.push(firstLevel(boardChoices(d, r)));
      }
    }
    pars.sort((a, b) => a - b);
    counts.sort((a, b) => a - b);
    const pct = (k: number) => `${Math.round((100 * k) / N)}%`;
    rows.push(`| ${tierName(tier)} | ${type} | ${N} | ${pct(solved)} | ${pct(atPar)} | ${pars[Math.floor(N / 2)]} [${pars[0]}–${pars[N - 1]}] | ${under} | ${nobody} | ${confess} | ${pct(wander)} | ${lint} | ${jargon} | ${counts[Math.floor(counts.length / 2)]} / ${counts[counts.length - 1]} | ${Math.round((100 * callbacks) / Math.max(1, pages))}% |`);
  }
}
process.stdout.write(`${rows.join('\n')}\n`);
if (examples.length) process.stdout.write(`\n${examples.join('\n')}\n`);
