/**
 * docs/59: the clarity build, measured. `npx tsx scripts/clarity-measure.ts [--nights 30] [--tiers 0,1,2,3,4,5] [--worlds dealt,neighbourhood] [--root DIR] [--show 20]`
 *
 * Over N nights a tier (the tier's case types in turn, along the oracle's route, what `npm run read`
 * shows), both worlds:
 *
 * - **words a page**, median; and **words per new fact**: every word on every page over every fact
 *   the player gained (a line newly held, an office line), the night's whole;
 * - **repeat** (item 1): pages' sentence pairs that share a fact or five content words, outside the
 *   turn and the report, split by which (`atoms`, `words`);
 * - **givens restated** (item 1): a sentence after the office, outside the turn and the report,
 *   that says only what the office said;
 * - **slots** (item 2), **continuity** (item 4), **tic** (item 7), **assembly** (item 8): the
 *   clarity lint's rules (`src/game/board/clarity-lint.ts`).
 *
 * `--root DIR` reads the nights another tree writes (a copy of main) with this tree's measures: the
 * "before" column.
 */

import { resolve } from 'node:path';
import { assemblyIssues, continuityIssues, ownSection, repeatIssues, slotIssues, ticIssues, verdictIssues } from '../src/game/board/clarity-lint.js';
import { factAtoms } from '../src/game/board/plan/once.js';
import type { Page } from '../src/game/board/types.js';
import type { BoardDeal, BoardRun } from '../src/game/board/model.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('nights') ?? 30);
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number);
const worlds = (val('worlds') ?? 'dealt,neighbourhood').split(',');
const show = Number(val('show') ?? 0);
const root = resolve(val('root') ?? '.');

const gen = await import(`${root}/src/gen/board/index.ts`);
const model = await import(`${root}/src/game/board/model.ts`);
const oracle = await import(`${root}/src/game/board/oracle.ts`);
const knowledge = await import(`${root}/src/game/board/knowledge.ts`);
const report = await import(`${root}/src/game/board/report.ts`);

function words(t: string): number {
  return t.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length;
}

function pageWords(p: Page): number {
  return words(p.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n'));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[Math.floor(s.length / 2)] as number) : 0;
}

/** The lines held after each page, from the questions asked and the puts made by then. */
function newFacts(d: BoardDeal, run: BoardRun): number[] {
  const c = d.kase;
  const askedAt = new Map<string, number>();
  for (const p of run.log) if (p.board?.q && run.asked.includes(p.board.q) && !askedAt.has(p.board.q)) askedAt.set(p.board.q, p.n);
  const held = (i: number): number => (i < 0 ? 0 : knowledge.linesHeld(c, { asked: run.asked.filter((q) => (askedAt.get(q) ?? Infinity) <= i), puts: run.puts.filter((x) => x.page <= i) }).length);
  return run.log.map((p, i) => (p.board?.job === 'office' ? (c.givens.lines?.length ?? c.givens.text.length) : 0) + held(i) - held(i - 1));
}

/** Sentences after the office that say only what the office said (outside the turn, the report and the notebook said aloud). */
function givensRestated(run: BoardRun): { page: number; text: string }[] {
  const office = run.log.find((p) => p.board?.job === 'office');
  const atoms = new Set((office?.board?.units ?? []).flatMap((u) => (u.kind === 'fact' ? (u.bones ?? []).flatMap((b) => b.props.flatMap(factAtoms)) : [])));
  const out: { page: number; text: string }[] = [];
  run.log.forEach((p, i) => {
    const job = p.board?.job;
    if (job === 'office' || job === 'nothing' || job === 'recap' || job === 'repeat') return;
    for (const u of ownSection(p).units) {
      // (Somebody's own answer is theirs, even where it agrees with the office.)
      if (u.kind !== 'fact' || u.voice === 'answer') continue;
      const a = (u.bones ?? []).flatMap((b) => b.props.flatMap(factAtoms));
      if (a.length > 0 && a.every((x) => atoms.has(x))) out.push({ page: i, text: u.text.replace(/⁣\d+⁤/g, '') });
    }
  });
  return out;
}

const rows: string[] = [];
rows.push('| world | tier | pages | words a page, median | words per new fact | repeat: same fact | repeat: same words | givens restated | slots | continuity | tic | assembly | verdict’s why |');
rows.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const examples: string[] = [];
for (const world of worlds) {
  for (const tier of tiers) {
    const types = gen.typesFor(tier) as string[];
    const counts: number[] = [];
    let allWords = 0;
    let allFacts = 0;
    let pages = 0;
    const tally = { atoms: 0, words: 0, givens: 0, slots: 0, continuity: 0, tic: 0, assembly: 0, verdict: 0 };
    for (let s = 1; s <= N; s++) {
      const type = types[s % types.length] as string;
      const d = model.dealBoard(s, tier, type, world === 'dealt' ? {} : { world }) as BoardDeal;
      const o = oracle.playBoardOracle(d) as { run: BoardRun; report: unknown };
      const run = o.run;
      const nf = newFacts(d, run);
      run.log.forEach((p, i) => {
        const w = pageWords(p);
        counts.push(w);
        allWords += w;
        allFacts += nf[i] ?? 0;
        pages++;
      });
      const label = `${world} ${model.tierName(tier)} ${type} seed ${s}`;
      for (const x of repeatIssues(run)) {
        if (/^\d+ words/.test(x.detail)) tally.words++;
        else tally.atoms++;
        if (examples.length < show) examples.push(`repeat ${label} p${x.page + 1}: ${x.detail}`);
      }
      for (const x of givensRestated(run)) {
        tally.givens++;
        if (examples.length < show) examples.push(`given ${label} p${x.page + 1}: ${x.text.slice(0, 160)}`);
      }
      const more: [keyof typeof tally, { page: number; detail: string }[]][] = [
        ['slots', slotIssues(run)],
        ['continuity', continuityIssues(d, run)],
        ['tic', ticIssues(run)],
        ['assembly', assemblyIssues(d, run)],
      ];
      for (const [k, xs] of more) {
        tally[k] += xs.length;
        for (const x of xs) if (examples.length < show) examples.push(`${k} ${label} p${x.page + 1}: ${x.detail}`);
      }
      // The verdict's why, as the oracle files it.
      const v = report.scoreBoard(d, run, o.report) as { fields: { key: string; given: string; truth: string }[] };
      const why = v.fields.find((f) => f.key === 'why');
      for (const x of verdictIssues(`${why?.given ?? ''}`)) {
        tally.verdict++;
        if (examples.length < show) examples.push(`verdict ${label}: ${x.detail}`);
      }
    }
    rows.push(`| ${world} | ${model.tierName(tier)} | ${pages} | ${median(counts)} | ${allFacts ? (allWords / allFacts).toFixed(1) : '—'} | ${tally.atoms} | ${tally.words} | ${tally.givens} | ${tally.slots} | ${tally.continuity} | ${tally.tic} | ${tally.assembly} | ${tally.verdict} |`);
  }
}
process.stdout.write(`${rows.join('\n')}\n`);
if (examples.length) process.stdout.write(`\n${examples.join('\n')}\n`);
