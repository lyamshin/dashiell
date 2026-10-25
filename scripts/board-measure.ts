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
 * - the reader, docs/67's hint-taker (every hint the tier allows, each star it
 *   gives, else the first choice; files the name a hint handed it, else the
 *   form's first choices): solved, which falls with the hints (near the oracle at
 *   Raw, the first-choice player's from Soft-boiled up), and the hints it took;
 * - decided 2026-10-11 (docs/41 rule 9), "the liar did it": the same reader, handed no name, files the first
 *   liar it caught. From Poached up it may do no better than the same reader
 *   naming anybody who had the means, at random, plus ten points; both are
 *   reported, and beside them docs/46's version (a liar it caught, at random)
 *   and the mirror (the last liar it caught);
 * - decided 2026-10-11, the two broken stories on the designed path: whose collision is met
 *   first, the innocent liar's or the culprit's;
 * - docs/61: from Poached up, where the night has an innocent liar, solved also needs who else
 *   lied and the line that cleared them. Every reader answers it as it would (another liar it
 *   caught, a star's first; the first line the form offers for them); beside them, the last-liar
 *   reader citing the line the grid showed against the other one;
 * - the reader lint and the plain-terms check over the oracle's and the wanderer's pages;
 * - first-level choices a page (median and most);
 * - decided 2026-10-25 (docs/69 §3): the share of nights with one liar; par on those nights and on
 *   nights with two; and the shortcut they invite, "first liar, nobody else" (`playFirstLiar`): its
 *   perfect report (every point, so a star; under 10% from Poached up), how often it has who right on
 *   its line, and its points (mean, out of what the report asks).
 *
 * Then the same by tier, all case types together.
 */

import { techniquesUpTo, typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { breaksAt, innocentLie, oneLiar } from '../src/gen/board/path.js';
import { boardChoices } from '../src/game/board/choices.js';
import { stepBoard, newBoardRun } from '../src/game/board/engine.js';
import { lintBoardRun, boardPlayerText } from '../src/game/board/lint.js';
import { dealBoard, parCalls, tierName, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { confessionCalls, playBoardOracle, playFirstLiar, playReader, playWanderer, refusalShortcutCalls } from '../src/game/board/oracle.js';
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
// docs/48 §4: `--world neighbourhood` measures nights cast from the bible.
const world = val('world');
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
  /** docs/67: hints the reader took, summed over the nights. */
  readerHints: number;
  readerLiar: number;
  readerFirst: number;
  readerLast: number;
  readerAccess: number;
  readerLastCite: number;
  /** Nights with an innocent liar, and how many met that liar's collision first on the path, or on the same step. */
  two: number;
  innocentFirst: number;
  same: number;
  /** docs/69: nights with one liar, par on each kind of night, and the "first liar, nobody else" reader. */
  one: number;
  parOne: number[];
  parTwo: number[];
  flPerfect: number;
  flWho: number;
  flPoints: number;
  flAsked: number;
}
const blank = (): Tally => ({ n: 0, oracle: 0, under: 0, whoRight: 0, wander: 0, citing: 0, reader: 0, readerHints: 0, readerLiar: 0, readerFirst: 0, readerLast: 0, readerAccess: 0, readerLastCite: 0, two: 0, innocentFirst: 0, same: 0, one: 0, parOne: [], parTwo: [], flPerfect: 0, flWho: 0, flPoints: 0, flAsked: 0 });
/** A median, or a dash for none. */
const median = (xs: number[]): string => {
  if (xs.length === 0) return '—';
  const s = [...xs].sort((a, b) => a - b);
  return String(s[Math.floor(s.length / 2)]);
};

/** Decided 2026-10-11: the step of the designed path at which each liar's story first breaks. */
function firstBreaks(d: BoardDeal): { innocent: number; culprit: number } | null {
  const c = d.kase;
  const lie = innocentLie(c);
  if (!lie) return null;
  const order = d.analysis.path.map((x) => x.q);
  const T = techniquesUpTo(c.tier);
  return { innocent: breaksAt(c, order, T, lie.person, lie.hour), culprit: breaksAt(c, order, T, c.crime.culprit, c.crime.hour) };
}

const rows: string[] = [];
rows.push('| tier | type | n | oracle solved, with the lines | at par | par calls median [range] | shortcut under par | shortcut names nobody | confession route under par | wanderer files who right | wanderer files solved | wanderer solved, citing its collision | reader files solved | reader hints a night | reader naming the first liar it caught, solved | reader naming anybody with access, solved | reader naming a liar at random, solved | reader naming the last liar it caught, solved | the same, citing what caught the other one | innocent liar’s story breaks first on the path (same step) | lint issues | plain-terms hits | choices a page median / max | callback pages | nights with one liar | par questions median, one liar / two | first liar, nobody else: perfect | its who on the line | its points, mean |');
rows.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
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
    let readerLiar = 0;
    let readerFirst = 0;
    let readerLast = 0;
    let readerAccess = 0;
    let readerLastCite = 0;
    let rowOne = 0;
    const rowParOne: number[] = [];
    const rowParTwo: number[] = [];
    let flPerfect = 0;
    let flWho = 0;
    let flPoints = 0;
    let flAsked = 0;
    let two = 0;
    let innocentFirst = 0;
    let same = 0;
    let reader = 0;
    let readerHints = 0;
    let confess = 0;
    let lint = 0;
    let jargon = 0;
    const counts: number[] = [];
    let pages = 0;
    let callbacks = 0;
    for (let s = 1; s <= N; s++) {
      const d = dealBoard(s, tier, type, world ? { world } : {});
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
      if (playReader(d, s, { guess: 'liar' }).ok) readerLiar++;
      if (playReader(d, s, { guess: 'first' }).ok) readerFirst++;
      if (playReader(d, s, { guess: 'last' }).ok) readerLast++;
      if (playReader(d, s, { guess: 'access' }).ok) readerAccess++;
      if (playReader(d, s, { guess: 'last', cite: true }).ok) readerLastCite++;
      const fb = firstBreaks(d);
      if (fb) {
        two++;
        if (fb.innocent < fb.culprit) innocentFirst++;
        else if (fb.innocent === fb.culprit) same++;
      }
      if (r.ok) reader++;
      readerHints += r.hints ?? 0;
      // docs/69: the night's kind, its par in questions, and the shortcut a night with one liar invites.
      const one = oneLiar(d.kase);
      if (one) rowOne++;
      (one ? rowParOne : rowParTwo).push(d.analysis.par);
      const fl = playFirstLiar(d, s);
      const fv = scoreBoard(d, fl.run, fl.report);
      if (fv.outcome === 'solved') flPerfect++;
      if (fv.fields[0]?.correct && !fv.fields[0]?.half) flWho++;
      flPoints += fv.points;
      flAsked += fv.asked;
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
      `| ${tierName(tier)} | ${type} | ${N} | ${pct(solved)} | ${pct(atPar)} | ${pars[Math.floor(N / 2)]} [${pars[0]}–${pars[N - 1]}] | ${under} | ${nobody} | ${confess} | ${pct(whoRight)} | ${pct(wander)} | ${pct(citing)} | ${pct(reader)} | ${(readerHints / N).toFixed(1)} | ${pct(readerFirst)} | ${pct(readerAccess)} | ${pct(readerLiar)} | ${pct(readerLast)} | ${pct(readerLastCite)} | ${two ? `${Math.round((100 * innocentFirst) / two)}% (${Math.round((100 * same) / two)}%)` : '—'} | ${lint} | ${jargon} | ${counts[Math.floor(counts.length / 2)]} / ${counts[counts.length - 1]} | ${Math.round((100 * callbacks) / Math.max(1, pages))}% | ${pct(rowOne)} | ${median(rowParOne)} / ${median(rowParTwo)} | ${pct(flPerfect)} | ${pct(flWho)} | ${(flPoints / N).toFixed(2)} of ${(flAsked / N).toFixed(0)} |`,
    );
    t.one += rowOne;
    t.parOne.push(...rowParOne);
    t.parTwo.push(...rowParTwo);
    t.flPerfect += flPerfect;
    t.flWho += flWho;
    t.flPoints += flPoints;
    t.flAsked += flAsked;
    t.n += N;
    t.oracle += solved;
    t.under += under;
    t.whoRight += whoRight;
    t.wander += wander;
    t.citing += citing;
    t.reader += reader;
    t.readerHints += readerHints;
    t.readerLiar += readerLiar;
    t.readerFirst += readerFirst;
    t.readerLast += readerLast;
    t.readerAccess += readerAccess;
    t.readerLastCite += readerLastCite;
    t.two += two;
    t.innocentFirst += innocentFirst;
    t.same += same;
  }
}
process.stdout.write(`${rows.join('\n')}\n`);
const pt = (k: number, n: number) => `${Math.round((100 * k) / Math.max(1, n))}%`;
const sum: string[] = [
  '',
  '| tier | nights | oracle solved, with the lines | wanderer files who right | wanderer files solved | wanderer solved, citing its collision | refusal shortcut under par | reader files solved | reader hints a night | the liar did it: reader naming the first liar it caught | reader naming anybody with access | reader naming a liar at random (docs/46) | reader naming the last liar it caught | the same, citing what caught the other one | innocent liar’s story breaks first on the path (same step) | nights with one liar | par questions median, one liar / two | first liar, nobody else: perfect | its who on the line | its points, mean |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const [tier, t] of byTier)
  sum.push(
    `| ${tierName(tier)} | ${t.n} | ${pt(t.oracle, t.n)} | ${pt(t.whoRight, t.n)} | ${pt(t.wander, t.n)} | ${pt(t.citing, t.n)} | ${t.under} | ${pt(t.reader, t.n)} | ${(t.readerHints / Math.max(1, t.n)).toFixed(1)} | ${pt(t.readerFirst, t.n)} | ${pt(t.readerAccess, t.n)} | ${pt(t.readerLiar, t.n)} | ${pt(t.readerLast, t.n)} | ${pt(t.readerLastCite, t.n)} | ${t.two ? `${pt(t.innocentFirst, t.two)} (${pt(t.same, t.two)})` : '—'} | ${pt(t.one, t.n)} | ${median(t.parOne)} / ${median(t.parTwo)} | ${pt(t.flPerfect, t.n)} | ${pt(t.flWho, t.n)} | ${(t.flPoints / Math.max(1, t.n)).toFixed(2)} of ${(t.flAsked / Math.max(1, t.n)).toFixed(0)} |`,
  );
process.stdout.write(`${sum.join('\n')}\n`);
if (examples.length) process.stdout.write(`\n${examples.join('\n')}\n`);
