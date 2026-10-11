/**
 * docs/43 "Done means" and docs/46 §4, measured: `npx tsx scripts/board-measure.ts [--seeds 50] [--tiers 0,1,2,3,4,5]`
 *
 * For each tier and each case type it builds, over the seeds:
 * - the oracle's route (the designed path through the engine): solved with the
 *   line that breaks the story, and at par (must be 100%);
 * - the refusal shortcut through the engine: never under par;
 * - the wanderer (random reasonable choices): how often it files who right (as
 *   before), and how often it files solved, with the line (picked at random from
 *   what the form offers; target under 10% from Poached up). "citing" is the same
 *   wanderer citing the line its collision showed, for the record;
 * - the reader (every star, else the first choice; files what the book told it):
 *   solved, which must fall by tier;
 * - the reader lint and the plain-terms check over the oracle's and the wanderer's pages;
 * - first-level choices a page (median and most).
 *
 * Then the same by tier, all case types together.
 */

import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices } from '../src/game/board/choices.js';
import { stepBoard, newBoardRun } from '../src/game/board/engine.js';
import { lintBoardRun, boardPlayerText } from '../src/game/board/lint.js';
import { dealBoard, parCalls, tierName, type BoardRun } from '../src/game/board/model.js';
import { confessionCalls, playBoardOracle, playReader, playWanderer, refusalShortcutCalls } from '../src/game/board/oracle.js';
import { scoreBoard } from '../src/game/board/report.js';
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

interface Tally {
  n: number;
  oracle: number;
  under: number;
  whoRight: number;
  wander: number;
  citing: number;
  reader: number;
  readerWho: number;
}
const blank = (): Tally => ({ n: 0, oracle: 0, under: 0, whoRight: 0, wander: 0, citing: 0, reader: 0, readerWho: 0 });

const rows: string[] = [];
rows.push('| tier | type | n | oracle solved, with the line | at par | par calls median [range] | shortcut under par | shortcut names nobody | confession route under par | wanderer files who right | wanderer files solved | wanderer solved, citing its collision | reader files who right | reader files solved | lint issues | plain-terms hits | choices a page median / max | callback pages |');
rows.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const byTier = new Map<TierIndex, Tally>();
const examples: string[] = [];
for (const tier of tiers) {
  const t = byTier.get(tier) ?? blank();
  byTier.set(tier, t);
  for (const type of typesFor(tier) as CaseType[]) {
    let solved = 0;
    let atPar = 0;
    const pars: number[] = [];
    let under = 0;
    let nobody = 0;
    let whoRight = 0;
    let wander = 0;
    let citing = 0;
    let readerWho = 0;
    let reader = 0;
    let confess = 0;
    let lint = 0;
    let jargon = 0;
    const counts: number[] = [];
    let pages = 0;
    let callbacks = 0;
    for (let s = 1; s <= N; s++) {
      const d = dealBoard(s, tier, type);
      const culprit = d.kase.crime.culprit;
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
      if (w.report.who === culprit) whoRight++;
      if (w.ok) wander++;
      if (w.alt && scoreBoard(d, w.run, w.alt).outcome === 'solved') citing++;
      const r = playReader(d, s);
      if (r.report.who === culprit) readerWho++;
      if (r.ok) reader++;
      for (const run of [o.run, w.run] as BoardRun[]) {
        const issues = lintBoardRun(d, run);
        lint += issues.length;
        if (issues.length && examples.length < 24) examples.push(`lint ${tierName(tier)} ${type} seed ${s} p${(issues[0]?.page ?? 0) + 1}: ${issues[0]?.rule} ${issues[0]?.detail}`);
        for (const text of boardPlayerText(run)) {
          const hits = findJargon(text, terms) as { term: string; match: string }[];
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
      let rr = newBoardRun(d);
      counts.push(firstLevel(boardChoices(d, rr)));
      for (const cmd of o.commands) {
        rr = stepBoard(d, rr, cmd).run;
        if (!rr.reportOpen) counts.push(firstLevel(boardChoices(d, rr)));
      }
    }
    pars.sort((a, b) => a - b);
    counts.sort((a, b) => a - b);
    const pct = (k: number) => `${Math.round((100 * k) / N)}%`;
    rows.push(
      `| ${tierName(tier)} | ${type} | ${N} | ${pct(solved)} | ${pct(atPar)} | ${pars[Math.floor(N / 2)]} [${pars[0]}–${pars[N - 1]}] | ${under} | ${nobody} | ${confess} | ${pct(whoRight)} | ${pct(wander)} | ${pct(citing)} | ${pct(readerWho)} | ${pct(reader)} | ${lint} | ${jargon} | ${counts[Math.floor(counts.length / 2)]} / ${counts[counts.length - 1]} | ${Math.round((100 * callbacks) / Math.max(1, pages))}% |`,
    );
    t.n += N;
    t.oracle += solved;
    t.under += under;
    t.whoRight += whoRight;
    t.wander += wander;
    t.citing += citing;
    t.reader += reader;
    t.readerWho += readerWho;
  }
}
process.stdout.write(`${rows.join('\n')}\n`);
const pt = (k: number, n: number) => `${Math.round((100 * k) / Math.max(1, n))}%`;
const sum: string[] = ['', '| tier | nights | oracle solved, with the line | wanderer files who right | wanderer files solved | wanderer solved, citing its collision | refusal shortcut under par | reader files who right | reader files solved |', '|---|---|---|---|---|---|---|---|---|'];
for (const [tier, t] of byTier) sum.push(`| ${tierName(tier)} | ${t.n} | ${pt(t.oracle, t.n)} | ${pt(t.whoRight, t.n)} | ${pt(t.wander, t.n)} | ${pt(t.citing, t.n)} | ${t.under} | ${pt(t.readerWho, t.n)} | ${pt(t.reader, t.n)} |`);
process.stdout.write(`${sum.join('\n')}\n`);
if (examples.length) process.stdout.write(`\n${examples.join('\n')}\n`);
