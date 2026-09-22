/**
 * The transcript tool (A.9). `npm run read` is a thin wrapper over these
 * functions, so running them over seeds 1–20 is running the tool over seeds
 * 1–20: if this passes, the designer can read any of those cases.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../../src/gen/index.js';
import { buildView, gameBudget } from '../../src/game/derive.js';
import { playOracle, playWandering } from '../../src/game/oracle.js';
import { fileReport } from '../../src/game/reducer.js';
import { scoreReport } from '../../src/game/scoring.js';
import { truthReport } from '../../src/game/report-form.js';
import {
  renderCastText,
  renderNotebookText,
  renderPageText,
  renderVerdictText,
  wordsOnPage,
  wrap,
} from '../../src/game/transcript.js';

describe('npm run read', () => {
  it('prints a whole run for seeds 1 to 20, at every difficulty', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 20; seed++) {
        const view = buildView(generateCase(seed, { difficulty }));
        const run = playOracle(view, 'Dashiell');
        expect(run.ok, `d${difficulty} seed ${seed}: ${run.reason}`).toBe(true);
        const cast = renderCastText(view, run.state);
        expect(cast).toContain('THE ROLL');
        expect(cast).toContain('TEMPER');
        let text = '';
        for (const page of run.state.log) {
          const rendered = renderPageText(page, view, run.state);
          expect(rendered.length).toBeGreaterThan(80);
          expect(rendered, `d${difficulty} seed ${seed} page ${page.n}`).not.toMatch(
            /\{[a-z]+\}/,
          );
          expect(rendered).toContain(`page ${page.n + 1}`);
          text += rendered;
        }
        expect(text).toContain('Midnight.');
        const notebook = renderNotebookText(view, run.state);
        expect(notebook).toContain('THE NOTEBOOK');
        expect(notebook).toContain('ESTABLISHED');
        // M5 §5: the report asks this case's unknowns, which is three for a
        // body found where it happened and four when it was moved, so a run
        // that answers all of them scores out of however many it asked.
        const report = truthReport(view);
        const asked = view.kase.act.unknowns.length;
        const verdict = renderVerdictText(
          scoreReport(view, fileReport(run.state, report), report),
        );
        expect(verdict).toContain(`${asked} of ${asked}`);
        expect(verdict).toContain('solved');
      }
    }
  });

  it('prints a run for the imperfect player too', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      const run = playWandering(view, seed, 'Dashiell');
      expect(run.state.log.length).toBeGreaterThan(3);
      expect(run.state.actionsUsed).toBeLessThanOrEqual(gameBudget(view.kase));
      for (const page of run.state.log) {
        expect(renderPageText(page, view, run.state)).not.toMatch(/\{[a-z]+\}/);
      }
      expect(renderNotebookText(view, run.state)).toContain('LEADS');
    }
  });

  it('puts every clue the run found into the printed notebook, word for word', () => {
    for (const seed of [1, 7, 20]) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      const run = playWandering(view, seed, 'Dashiell');
      const notebook = renderNotebookText(view, run.state).replace(/\s+/g, ' ');
      for (const id of run.state.found) {
        const text = view.findableById.get(id)?.text.replace(/\s+/g, ' ') as string;
        expect(notebook.includes(text), `${id} missing from the printed notebook`).toBe(true);
      }
    }
  });

  it('wraps to the page without losing or adding a word', () => {
    const text = 'A line about a brass rail and a man who will not look up from it.';
    const wrapped = wrap(text, 20);
    expect(wrapped.split(/\s+/).join(' ')).toBe(text);
    expect(Math.max(...wrapped.split('\n').map((l) => l.length))).toBeLessThanOrEqual(20);
  });

  it('counts the same words the engine trimmed against', () => {
    const view = buildView(generateCase(7, { difficulty: 2 }));
    const run = playOracle(view, 'Dashiell');
    for (const page of run.state.log) {
      const n = wordsOnPage(page);
      expect(renderPageText(page, view, run.state)).toContain(`${n} words`);
    }
  });
});
