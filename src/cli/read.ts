/**
 * `npm run read -- --seed 7 [--difficulty 2] [--random]`
 *
 * Plays a case through and prints the whole run as prose, page by page,
 * exactly as a player would read it, then the notebook and the filed report.
 * This is how the designer reads a run without playing it.
 *
 * `--random` uses the imperfect player instead of the oracle: somebody who
 * follows the interesting lead rather than the right one, spends the whole
 * budget, and files whoever the monologue was accusing at eight o'clock.
 */

import { generateCase, type CaseType, type Difficulty } from '../gen/index.js';
import { TROPE_IDS } from '../gen/tropes/index.js';
import { buildView, gameBudget, gamePar } from '../game/derive.js';
import { playOracle, playWandering } from '../game/oracle.js';
import { fileReport } from '../game/reducer.js';
import { truthReport } from '../game/report-form.js';
import { scoreReport } from '../game/scoring.js';
import {
  renderCastText,
  renderNotebookText,
  renderPageText,
  renderVerdictText,
} from '../game/transcript.js';
import type { Report, RunState } from '../game/types.js';
import { ignoreBrokenPipe, parseArgs } from './args.js';

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

if (
  !Number.isInteger(seed) ||
  ![1, 2, 3].includes(difficulty) ||
  (type !== undefined && !['murder', 'robbery', 'missing'].includes(type)) ||
  (trope !== undefined && !TROPE_IDS.includes(trope))
) {
  process.stderr.write(
    'usage: npm run read -- --seed <integer> [--difficulty 1|2|3] [--random] [--pages N] ' +
      `[--no-gaps] [--type murder|robbery|missing] [--trope <id>]\n  tropes: ${TROPE_IDS.join(', ')}\n`,
  );
  process.exit(1);
}

const kase = generateCase(seed, {
  difficulty: difficulty as Difficulty,
  detectiveName: detective,
  ...(type === undefined ? {} : { type: type as CaseType }),
  ...(trope === undefined ? {} : { tropeId: trope }),
});
const view = buildView(kase);

let state: RunState;
let report: Report | null = null;
if (flags.has('random')) {
  const run = playWandering(view, seed, detective);
  state = run.state;
  report = run.report;
} else {
  const run = playOracle(view, detective);
  state = run.state;
  if (!run.ok) process.stderr.write(`(the oracle could not finish: ${run.reason})\n`);
  // M5 §5: the oracle knows the route, not the answer. What it files is the
  // truth of exactly the unknowns this case asks.
  report = truthReport(view);
}

const out: string[] = [];
out.push(
  `${detective.toUpperCase()} · case ${kase.seed} · difficulty ${kase.difficulty} · ${kase.neighborhood}`,
);
// M4b §B.3: the game's par and budget, which are the case's plus the walk
// from the office. The generator's own numbers are in brackets after them.
out.push(
  `par ${gamePar(kase)}, budget ${gameBudget(kase)} (generator: ${kase.par}/${kase.budget}), ` +
    `${kase.findable.length} things to find`,
);
out.push('');
out.push(renderCastText(view, state));
out.push('');

const shown = state.log.slice(0, Number.isFinite(pageLimit) ? pageLimit : undefined);
for (const page of shown) {
  out.push(renderPageText(page, view, state, { gaps: !flags.has('no-gaps') }));
  out.push('');
}

if (Number.isFinite(pageLimit) && state.log.length > shown.length) {
  out.push(`… ${state.log.length - shown.length} more pages`);
  out.push('');
}

out.push(renderNotebookText(view, state));
out.push('');

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
