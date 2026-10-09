/**
 * `npm run read -- --engine board --seed N --tier T [--type murder|lost-item|lost-pet]`
 *
 * docs/43: reads a board night page by page, the way a player reads it, along
 * the oracle's route (the designed path), then the notebook, the grid, the
 * verdict and what really happened. `--random` takes the wanderer's route
 * instead; `--route "go bar; ask barkeep list; …"` plays exactly those
 * commands. `--no-choices` leaves out each page's choices.
 */

import { parseTier, type CaseType } from '../gen/board/index.js';
import { clockStrip, usedByPage } from '../game/clock.js';
import { boardChoices } from '../game/board/choices.js';
import { newBoardRun, stepBoard } from '../game/board/engine.js';
import { budgetCalls, dealBoard, deadlineWords, parCalls, tierName, type BoardRun } from '../game/board/model.js';
import { playBoardOracle, playWanderer } from '../game/board/oracle.js';
import { curtainOfBoard, scoreBoard, storyOfBoard, truthReport } from '../game/board/report.js';
import { choicesText, notebookText, pageBodyText } from '../game/board/text.js';
import { wrap } from '../game/transcript.js';

export function readBoard(values: Map<string, string>, flags: Set<string>): string {
  const seed = Number(values.get('seed') ?? 1);
  const tier = parseTier(values.get('tier') ?? '0');
  const type = values.get('type') as CaseType | undefined;
  if (!Number.isInteger(seed) || tier === null) throw new Error('usage: npm run read -- --engine board --seed N --tier 0..5 [--type murder|lost-item|lost-pet] [--random] [--route "…"] [--no-choices]');
  const d = dealBoard(seed, tier, type);
  const c = d.kase;
  let run: BoardRun;
  let commands: string[];
  let report = truthReport(d);
  const route = values.get('route');
  if (route !== undefined) {
    run = newBoardRun(d);
    commands = route.split(';').map((x) => x.trim()).filter(Boolean);
    for (const cmd of commands) {
      const r = stepBoard(d, run, cmd);
      if (r.error) process.stderr.write(`(${cmd}: ${r.error})\n`);
      run = r.run;
    }
  } else if (flags.has('random')) {
    const p = playWanderer(d, seed);
    run = p.run;
    commands = [];
    report = p.report;
  } else {
    const p = playBoardOracle(d);
    run = p.run;
    commands = p.commands;
    if (!p.ok) process.stderr.write(`(the oracle: ${p.reason})\n`);
  }
  // Replay to know each page's state for its choices.
  const states: BoardRun[] = [newBoardRun(d)];
  if (route !== undefined || !flags.has('random')) {
    for (const cmd of commands) states.push(stepBoard(d, states[states.length - 1] as BoardRun, cmd).run);
  }
  const out: string[] = [];
  out.push(`${c.id} · ${tierName(c.tier)} · ${c.type}${c.variant ? ` (${c.variant})` : ''} · par ${parCalls(d)} calls (${d.analysis.par} questions${d.analysis.motive ? ' + the motive search' : ''}, ${d.analysis.walks} walks), budget ${budgetCalls(d)}`);
  out.push('');
  const budget = budgetCalls(d);
  run.log.forEach((page, i) => {
    const strip = clockStrip(usedByPage(run.log, i), budget, deadlineWords(c));
    out.push('═'.repeat(76));
    out.push(`${page.head.padEnd(40)}${strip.time} · page ${i + 1} · ${strip.left}`);
    out.push('─'.repeat(76));
    out.push(pageBodyText(page));
    const st = states[i];
    if (st && !flags.has('no-choices') && i < run.log.length - 1) {
      out.push('');
      out.push(choicesText(boardChoices(d, st), commands[i]));
    }
    out.push('');
  });
  out.push(notebookText(d, run));
  out.push('');
  const v = scoreBoard(d, run, report);
  out.push(`THE VERDICT: ${v.points} of ${v.asked} (${v.outcome}); ${run.used} calls against par ${v.par}.`);
  for (const f of v.fields) out.push(`  ${f.label}: ${f.given}${f.correct ? ' ✓' : ` ✗ (it was ${f.truth})`}`);
  for (const p of v.closing) out.push(wrap(p));
  out.push('');
  out.push('WHAT REALLY HAPPENED');
  for (const p of storyOfBoard(d)) out.push(wrap(p));
  out.push('');
  if (flags.has('curtain')) out.push(curtainOfBoard(d));
  const words = run.log.reduce((n, p) => n + p.blocks.reduce((m, b) => m + (b.kind === 'prose' || b.kind === 'note' ? b.text.split(/\s+/).length : 0), 0), 0);
  out.push(`${run.log.length} pages · ${words} words · ${Math.round(words / Math.max(1, run.log.length))} a page · ${run.used} calls`);
  return out.join('\n');
}
