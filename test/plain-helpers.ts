/**
 * Everything a player can read in one case, as a list of labelled strings:
 * the case's own text fields (briefing, clue sentences, dossiers, the client's
 * brief, secrets, motives, mentions), an oracle run's pages rendered through
 * the transcript tool, the notebook, the cast list and the verdict. Used by
 * test/plain-terms.test.ts and scripts/plain-terms-sweep.ts.
 */
import { generateCase, type CaseType, type Difficulty } from '../src/gen/index.js';
import { TEXT_KEYS } from '../src/gen/structure.js';
import { buildView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { fileReport } from '../src/game/reducer.js';
import { truthReport } from '../src/game/report-form.js';
import { scoreReport } from '../src/game/scoring.js';
import {
  renderCastText,
  renderNotebookText,
  renderPageText,
  renderVerdictText,
} from '../src/game/transcript.js';

export interface Labelled {
  where: string;
  text: string;
}

export const CASE_TYPES: CaseType[] = ['murder', 'robbery', 'missing'];

function caseStrings(value: unknown, path: string, out: Labelled[], inText = false): void {
  if (typeof value === 'string') {
    if (inText) out.push({ where: path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => caseStrings(v, `${path}[${i}]`, out, inText));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) caseStrings(v, `${path}.${k}`, out, inText || TEXT_KEYS.has(k));
  }
}

export function playerText(seed: number, difficulty: Difficulty, type: CaseType): Labelled[] {
  const kase = generateCase(seed, { difficulty, type });
  const out: Labelled[] = [];
  caseStrings(kase, 'case', out);
  const view = buildView(kase);
  const run = playOracle(view);
  const state = run.state;
  for (const page of state.log) {
    out.push({ where: `page ${page.n + 1}`, text: renderPageText(page, view, state, { gaps: false }) });
  }
  out.push({ where: 'notebook', text: renderNotebookText(view, state) });
  out.push({ where: 'cast', text: renderCastText(view, state) });
  const report = truthReport(view);
  const filed = fileReport(state, report);
  out.push({ where: 'verdict', text: renderVerdictText(scoreReport(view, filed, report)) });
  // The transcript wraps at 76 columns; a term split over a line break is
  // still the term.
  return out.map((l) => ({ where: l.where, text: l.text.replace(/\s+/g, ' ') }));
}
