/**
 * `npm run read -- --seed N --tier T [--type murder|lost-item|lost-pet]`
 *
 * docs/43: reads a night page by page, the way a player reads it, along the
 * oracle's route (the designed path), then the notebook, the grid, the
 * verdict and what really happened. `--random` takes the wanderer's route
 * instead; `--route "go bar; ask barkeep list; …"` plays exactly those
 * commands. `--no-choices` leaves out each page's choices; `--curtain` adds
 * the true board, the path and the lies. `--skeleton` prints, after each page,
 * the units it was realized from (docs/49 §3), one JSON object a line.
 * `--plain` prints each page's plain page instead (docs/52 §3): every fact it
 * says, a sentence a composite, no voice and no texture.
 *
 * docs/67: `--hints every` takes a hint on every page of the route (as many as
 * the tier allows), `--hints N` on its first N pages; each page then prints
 * what the hint said, and its choices show the stars. `--reader` takes the
 * hint-taker's route (`playReader`), hints and all.
 *
 * docs/69: `--first-liar` takes the "first liar" reader's route (`playFirstLiar`): the designed path
 * until the grid shows a lie, and the report it files on it.
 */

import { CASE_TYPES, parsePuzzles, parseTier, typesFor, type CaseType } from '../gen/board/index.js';
import { clockStrip, usedByPage } from '../game/board/clock.js';
import { boardChoices } from '../game/board/choices.js';
import { newBoardRun, stepBoard } from '../game/board/engine.js';
import { budgetCalls, dealBoard, deadlineWords, parCalls, tierName, type BoardRun } from '../game/board/model.js';
import { playBoardOracle, playFirstLiar, playReader, playWanderer } from '../game/board/oracle.js';
import { hintsUsed, takeHint } from '../game/board/hints.js';
import { curtainOfBoard, scoreBoard, storyOfBoard, truthReport } from '../game/board/report.js';
import { choicesText, notebookText, pageBodyText, wrap } from '../game/board/text.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';
import { isWorld } from '../gen/board/world/index.js';
import { SITUATED } from '../game/board/plan/situated.js';
import { setTexture } from '../game/board/plan/texture.js';
import { plainPage } from '../game/board/bones/plain.js';

const USAGE = 'usage: npm run read -- --seed N --tier 0..5|raw|…|hard-boiled [--type murder|lost-item|lost-pet] [--random] [--route "go bar; …"] [--no-choices] [--curtain] [--skeleton] [--plain] [--world neighbourhood] [--situated 0] [--texture lean|full] [--hints every|N] [--reader] [--first-liar] [--puzzles A,B]\n';

export function readBoard(values: Map<string, string>, flags: Set<string>): string {
  const seed = Number(values.get('seed') ?? 1);
  const tier = parseTier(values.get('tier') ?? '0');
  const type = values.get('type') as CaseType | undefined;
  if (!Number.isInteger(seed) || tier === null || (type !== undefined && !CASE_TYPES.includes(type))) throw new Error(USAGE);
  if (type !== undefined && !typesFor(tier).includes(type)) throw new Error(`The board builds ${typesFor(tier).join(', ')} at this tier.\n`);
  const world = values.get('world');
  if (world !== undefined && !isWorld(world)) throw new Error(`No world called "${world}". Try --world neighbourhood.\n`);
  // docs/51: `--situated 0` reads the night with the old decks only.
  SITUATED.on = values.get('situated') !== '0';
  // docs/60: `--texture full` reads the night with every line of texture, as before the budget.
  setTexture(values.get('texture'));
  // docs/82: `--puzzles B` deals the night with the harder-puzzle prototypes behind the flag.
  const puzzles = parsePuzzles(values.get('puzzles'));
  const d = dealBoard(seed, tier, type, { ...(world ? { world } : {}), ...(puzzles.length ? { puzzles } : {}) });
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
    // The true report, on whatever lines this route holds.
    report = truthReport(d, run);
  } else if (flags.has('random')) {
    const p = playWanderer(d, seed);
    run = p.run;
    commands = [];
    report = p.report;
  } else if (flags.has('reader') || flags.has('first-liar')) {
    // docs/67: the hint-taker's route, with its hints, and the report it made. docs/69: or the "first
    // liar, nobody else" reader's.
    const p = flags.has('first-liar') ? playFirstLiar(d, seed) : playReader(d, seed);
    commands = p.commands;
    report = p.report;
    run = newBoardRun(d);
    for (const cmd of [...commands, 'file']) run = stepBoard(d, run, cmd).run;
  } else {
    const p = playBoardOracle(d);
    run = p.run;
    commands = p.commands;
    report = p.report;
    if (!p.ok) process.stderr.write(`(the oracle: ${p.reason})\n`);
  }
  // docs/67: `--hints every|N`: a hint before each of the route's commands, on the first N pages.
  const hintsArg = values.get('hints') ?? (flags.has('hints') ? 'every' : undefined);
  if (hintsArg !== undefined && !flags.has('random') && !flags.has('reader') && !flags.has('first-liar')) {
    const most = hintsArg === 'every' ? Infinity : Number(hintsArg);
    const withHints: string[] = [];
    let pages = 0;
    for (const cmd of commands) {
      if (pages < most && cmd !== 'file') withHints.push('hint');
      withHints.push(cmd);
      pages++;
    }
    // (And on the last page, before the case is closed.)
    if (pages < most) withHints.push('hint');
    commands = withHints;
    run = newBoardRun(d);
    for (const cmd of commands) run = stepBoard(d, run, cmd).run;
    report = route !== undefined ? truthReport(d, run) : report;
    if (route === undefined) run = stepBoard(d, run, 'file').run;
  }
  // Replay to know each page's state for its choices, and what each hint said, by page.
  const states: BoardRun[] = [newBoardRun(d)];
  const hintSaid = new Map<number, string[]>();
  const shown: string[] = [];
  if (route !== undefined || !flags.has('random')) {
    for (const cmd of commands) {
      const st = states[states.length - 1] as BoardRun;
      if (cmd === 'hint') {
        const h = takeHint(d, st);
        const at = st.log.length - 1;
        hintSaid.set(at, [...(hintSaid.get(at) ?? []), 'error' in h ? `(${h.error})` : h.said.text]);
        if (!('error' in h)) states[states.length - 1] = h.run;
        continue;
      }
      shown.push(cmd);
      states.push(stepBoard(d, st, cmd).run);
    }
  }
  const out: string[] = [];
  out.push(`${c.id} · ${tierName(c.tier)} · ${c.type}${c.variant ? ` (${c.variant})` : ''} · par ${parCalls(d)} actions (${d.analysis.par} questions${d.analysis.motive ? ' + the motive search' : ''}, ${d.analysis.walks} walks), budget ${budgetCalls(d)}`);
  out.push('');
  const budget = budgetCalls(d);
  run.log.forEach((page, i) => {
    const strip = clockStrip(usedByPage(run.log, i), budget, deadlineWords(c));
    out.push('═'.repeat(76));
    out.push(`${page.head.padEnd(40)}${strip.time} · page ${i + 1} · ${strip.left}`);
    out.push('─'.repeat(76));
    // docs/52 §3: the plain page, every fact and no voice.
    if (flags.has('plain')) {
      const plain = plainPage(c, page);
      out.push(plain.length ? pageBodyText({ ...page, blocks: plain }) : '(Nothing new.)');
    } else out.push(pageBodyText(page));
    // docs/49 §3: the skeleton the page was realized from, a unit a line.
    if (flags.has('skeleton')) {
      out.push('');
      for (const u of page.board?.units ?? []) out.push(JSON.stringify({ page: i + 1, ...u }));
    }
    for (const said of hintSaid.get(i) ?? []) out.push('', wrap(`[hint] ${said}`));
    const st = states[i];
    if (st && !flags.has('no-choices') && i < run.log.length - 1) {
      out.push('');
      out.push(choicesText(boardChoices(d, st), shown[i]));
    }
    out.push('');
  });
  out.push(notebookText(d, run));
  out.push('');
  const v = scoreBoard(d, run, report);
  out.push(`THE VERDICT: ${v.scoreLine} (${v.outcome}); ${run.used} actions against par ${v.par}.`);
  for (const f of v.fields) out.push(`  ${f.label}${/\?$/.test(f.label) ? '' : ':'} ${f.given}${f.correct ? ' ✓' : ` ✗ (${f.correction ?? `it was ${f.truth}`})`}`);
  for (const p of v.closing) out.push(wrap(p));
  out.push('');
  out.push('WHAT REALLY HAPPENED');
  for (const p of storyOfBoard(d)) out.push(wrap(p));
  out.push('');
  if (flags.has('curtain')) out.push(curtainOfBoard(d, run, report));
  const words = run.log.reduce((n, p) => n + p.blocks.reduce((m, b) => m + (b.kind === 'prose' || b.kind === 'note' ? b.text.split(/\s+/).length : 0), 0), 0);
  out.push(`${run.log.length} pages · ${words} words · ${Math.round(words / Math.max(1, run.log.length))} a page · ${run.used} actions · ${hintsUsed(run)} hints`);
  return out.join('\n');
}

ignoreBrokenPipe();
const { flags, values } = parseArgs(process.argv.slice(2));
try {
  process.stdout.write(`${readBoard(values, flags)}\n`);
} catch (err) {
  process.stderr.write((err as Error).message);
  process.exitCode = 1;
}
