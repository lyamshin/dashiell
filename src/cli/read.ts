/**
 * `npm run read -- --seed 7 [--difficulty 2] [--tier 0..5|over-easy] [--level 1..4] [--random]`
 *
 * Plays a case through and prints the whole run as prose, page by page,
 * exactly as a player would read it, then the notebook and the filed report.
 * This is how the designer reads a run without playing it.
 *
 * `--random` uses the imperfect player instead of the oracle: somebody who
 * follows the interesting lead rather than the right one, spends the whole
 * budget, and files whoever the monologue was accusing at eight o'clock.
 *
 * `--route "go the suite; examine the suite; …"` plays exactly those commands
 * instead (M8: how the golden's own route is rendered for comparison). No
 * report is filed.
 *
 * `--grid` prints "Where they were", the deduction grid, after the notebook.
 * `--marks "Grasso 10 at the suite; Grasso 9:30 not the third floor"` pencils
 * those cells in first (and implies `--grid`), so the pencil can be reviewed
 * too: it is drawn apart from everything the notebook holds.
 */

import { generateCase, type CaseType, type Difficulty } from '../gen/index.js';
import { TROPE_IDS } from '../gen/tropes/index.js';
import { buildView, gameBudget, gamePar } from '../game/derive.js';
import { playOracle, playWandering } from '../game/oracle.js';
import { renderGridText, withMarkSpecs } from '../game/grid-text.js';
import { choicesFor } from '../game/choices.js';
import { fileReport, newRun, stepInput } from '../game/reducer.js';
import { truthReport } from '../game/report-form.js';
import { scoreReport } from '../game/scoring.js';
import {
  renderCastText,
  renderChoicesText,
  renderNotebookText,
  renderPageText,
  renderVerdictText,
} from '../game/transcript.js';
import type { Report, RunState } from '../game/types.js';
import { ignoreBrokenPipe, parseArgs, parseTierLevel } from './args.js';
import { describeDials, dialsOf } from '../gen/shape.js';

ignoreBrokenPipe();

const { flags, values } = parseArgs(process.argv.slice(2));
const seed = Number(values.get('seed') ?? 1);
const difficulty = Number(values.get('difficulty') ?? 2);
const pageLimit = values.has('pages') ? Number(values.get('pages')) : Infinity;
const detective = values.get('detective') ?? 'Dashiell';
// M5 §Deliverables: `npm run read` forces a shape the same way `npm run case`
// does, so a trope can be read without hunting for a seed that deals it.
const type = values.get('type');
const trope = values.get('trope');
// M7: the tier and the level. Neither given is today's case.
const dialFlags = parseTierLevel(values);

if (
  !Number.isInteger(seed) ||
  ![1, 2, 3, 4].includes(difficulty) ||
  dialFlags === null ||
  (type !== undefined && !['murder', 'robbery', 'missing'].includes(type)) ||
  (trope !== undefined && !TROPE_IDS.includes(trope))
) {
  process.stderr.write(
    'usage: npm run read -- --seed <integer> [--difficulty 1|2|3|4] [--random] [--pages N] ' +
      `[--no-gaps] [--no-choices] [--grid] [--marks "Grasso 10 at the suite; …"] [--type murder|robbery|missing] [--trope <id>] ` +
      `[--tier 0..5|over-easy] [--level 1..4]
  tropes: ${TROPE_IDS.join(', ')}
`,
  );
  process.exit(1);
}

const kase = generateCase(seed, {
  difficulty: difficulty as Difficulty,
  detectiveName: detective,
  ...(type === undefined ? {} : { type: type as CaseType }),
  ...(trope === undefined ? {} : { tropeId: trope }),
  ...dialFlags,
});
const view = buildView(kase);

let state: RunState;
let report: Report | null = null;
let commands: string[] = [];
const route = values.get('route');
if (route !== undefined) {
  commands = route
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  state = newRun(view, { detectiveName: detective });
  for (const command of commands) state = stepInput(state, command, view).state;
} else if (flags.has('random')) {
  const run = playWandering(view, seed, detective);
  state = run.state;
  report = run.report;
  commands = run.steps.map((s) => s.command);
} else {
  const run = playOracle(view, detective);
  state = run.state;
  commands = run.steps.map((s) => s.command);
  if (!run.ok) process.stderr.write(`(the oracle could not finish: ${run.reason})\n`);
  // M5 §5: the oracle knows the route, not the answer. What it files is the
  // truth of exactly the unknowns this case asks.
  report = truthReport(view);
}

const out: string[] = [];
out.push(
  `${detective.toUpperCase()} · case ${kase.seed} · difficulty ${kase.difficulty} · ${kase.neighborhood}`,
);
// M7: a tiered case says what it was dealt as. A plain one prints as before.
if (kase.shape !== undefined) out.push(describeDials(dialsOf(kase)));
// M4b §B.3: the game's par and budget, which are the case's plus the walk
// from the office. The generator's own numbers are in brackets after them.
out.push(
  `par ${gamePar(kase)}, budget ${gameBudget(kase)} (generator: ${kase.par}/${kase.budget}), ` +
    `${kase.findable.length} things to find`,
);
out.push('');
out.push(renderCastText(view, state));
out.push('');

// M6 §7: the state after each page, replayed from the same commands, so each
// page can print the choices it offered and mark the one that was taken.
const states: RunState[] = [newRun(view, { detectiveName: detective })];
for (const command of commands) {
  states.push(stepInput(states[states.length - 1] as RunState, command, view).state);
}

const shown = state.log.slice(0, Number.isFinite(pageLimit) ? pageLimit : undefined);
for (const page of shown) {
  out.push(renderPageText(page, view, state, { gaps: !flags.has('no-gaps') }));
  const after = states[page.n];
  if (after && !flags.has('no-choices')) {
    const groups = choicesFor(view, after);
    if (groups.length > 0) {
      out.push('');
      out.push(renderChoicesText(groups, commands[page.n]));
    }
  }
  out.push('');
}

if (Number.isFinite(pageLimit) && state.log.length > shown.length) {
  out.push(`… ${state.log.length - shown.length} more pages`);
  out.push('');
}

out.push(renderNotebookText(view, state));
out.push('');

if (flags.has('grid') || values.has('marks')) {
  const marked = withMarkSpecs(view, state, values.get('marks') ?? '');
  for (const spec of marked.unread) process.stderr.write(`(could not read the mark "${spec}")\n`);
  out.push(renderGridText(view, marked.state));
  out.push('');
}

if (report) {
  const filed = fileReport(state, report);
  out.push(renderVerdictText(scoreReport(view, filed, report)));
}

const words = state.log.reduce(
  (n, p) =>
    n +
    p.blocks.reduce(
      (m, b) =>
        m + (b.kind === 'prose' || b.kind === 'note' ? b.text.trim().split(/\s+/).length : 0),
      0,
    ),
  0,
);
const gaps = state.log.flatMap((p) => p.gaps);
out.push(
  `${state.log.length} pages · ${words} words · ${Math.round(words / Math.max(1, state.log.length))} a page · ` +
    `${state.actionsUsed} actions spent${state.waived > 0 ? ` (${state.waived} waived)` : ''} · ${gaps.length} fallbacks`,
);

process.stdout.write(out.join('\n') + '\n');
