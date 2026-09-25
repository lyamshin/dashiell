/**
 * docs/37 — `npm run play`, the book played blind in plain text.
 *
 * A scripted night through the tool's own commands (in-process, against an
 * in-memory save): every page, choice list, picker, notebook, grid and form
 * printed before the report is filed must hold nothing only the truth knows,
 * and the night must play through to a filed report and its verdict.
 */
import { describe, expect, it } from 'vitest';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { generateCase } from '../src/gen/index.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { caseOptions } from '../src/game/profile.js';
import { answerFor, columnFor, fieldsFor, truthReport } from '../src/game/report-form.js';
import { storyOf, storyParagraphs } from '../src/game/story.js';
import { renderTruthSheet } from '../src/sheet/truthSheet.js';

const NIGHTS = [
  { seed: 3, tier: 4 as const, level: 2 as const, engine: 'v2' as const },
  { seed: 5, tier: 2 as const, level: 2 as const },
  // An affair: after the report, what I tell the client.
  { seed: 12, tier: 2 as const, level: 2 as const },
];

function memoryIo(): PlayIo & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return { files, read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
}

/** The truth, typed into the form the way a player would: by each option's words. */
function truthAnswers(view: CaseView): string {
  const truth = truthReport(view);
  const parts: string[] = [];
  for (const f of fieldsFor(view)) {
    const value = answerFor(truth, f.key);
    const option = f.options.find((o) => o.value === value);
    if (option) parts.push(`${f.key}=${option.label}`);
  }
  for (const c of columnFor(view)) {
    const option = c.options.find((o) => o.value === truth.column?.[c.personId]);
    if (option) parts.push(`${c.label}=${option.label}`);
  }
  return parts.join('; ');
}

describe('npm run play', () => {
  for (const night of NIGHTS) {
    it(`plays seed ${night.seed} tier ${night.tier}${night.engine ? ' v2' : ''} to a filed report without printing the truth first`, () => {
      const io = memoryIo();
      const save = ['--save', 'night.json'];
      const printed: string[] = [];
      const run = (...argv: string[]): string => {
        const r = runPlay([...argv, ...save], io);
        expect(r.code, `${argv.join(' ')}: ${r.out}`).toBe(0);
        printed.push(r.out);
        return r.out;
      };

      const kase = generateCase(night.seed, { ...caseOptions(night), detectiveName: 'Dashiell' });
      const view = buildView(kase);
      const killer = view.personById.get(kase.solution.killerId);

      run('new', '--seed', String(night.seed), '--tier', String(night.tier), '--level', String(night.level), ...(night.engine ? ['--engine', night.engine] : []));
      run('help');

      // The oracle's route, chosen through the tool one choice at a time: each
      // one must be a choice the page offered.
      const route = playOracle(view).steps.map((s) => s.command);
      let pickerTried = false;
      for (const command of route) {
        const page = run('look');
        // The "Put it to …" picker: opened, read, and shut again for nothing.
        const put = /^\s+(\d+)\.\s+Put (?:it|another fact) to (\S+) \(opens/m.exec(page);
        if (put && !pickerTried) {
          pickerTried = true;
          const picker = run('do', put[1] as string);
          expect(picker).toMatch(/Which (other )?fact do you read/);
          const nothing = /^\s+(\d+)\.\s+Put nothing to them/m.exec(picker);
          expect(nothing).not.toBeNull();
          run('do', (nothing as RegExpExecArray)[1] as string);
        }
        run('do', command);
      }
      if (night.tier >= 2) expect(pickerTried, 'a "Put it to …" picker was offered and opened').toBe(true);
      // The pencil: free, never a fact, drawn on the grid.
      const place = view.places.find((p) => p.id !== view.office.id)?.shortName ?? '';
      const pencilled = run('pencil', `${view.victim.surname} 8:30 at ${place}`);
      expect(pencilled).toContain('WHERE THEY WERE');
      expect(pencilled).toMatch(/\(\S+\)/);
      run('notebook');
      run('grid');
      run('report');
      expect(runPlay(['story', ...save], io).code).toBe(1);
      expect(runPlay(['curtain', ...save], io).code).toBe(1);

      // Nothing only the truth knows, before the report is in.
      const before = printed.join('\n');
      const story = storyParagraphs(storyOf(kase))[0] ?? '';
      const sheet = renderTruthSheet(kase).split('\n').find((l) => l.trim().length > 0) ?? '';
      for (const bad of ['[gap', 'oracle', ' words]', 'THE VERDICT', 'WHAT REALLY HAPPENED', 'How it could be known', '✗', ' — it was ']) {
        expect(before, bad).not.toContain(bad);
      }
      expect(before).not.toMatch(/\bpar\s+\d/);
      expect(before).not.toMatch(/against par/);
      expect(before).not.toMatch(/^\s*>/m);
      expect(before).not.toContain(story.slice(0, 80));
      expect(before).not.toContain(sheet);
      expect(killer).toBeDefined();
      // The save file is the player's doing and nothing the case knows.
      const saved = io.files.get('night.json') ?? '';
      expect(saved).not.toMatch(/solution|killer|truth|oracle/i);

      // File the truth and read the verdict; then what the closing page opens.
      let verdict = run('file', truthAnswers(view));
      if (kase.act.type === 'affair') {
        expect(verdict).toContain(`WHAT I TELL ${view.client.surname.toUpperCase()}`);
        expect(verdict).not.toContain('THE VERDICT');
        verdict = run('do', '1');
      }
      expect(verdict).toContain('THE VERDICT');
      const asked = fieldsFor(view).length + columnFor(view).length;
      expect(verdict).toContain(`${asked} out of ${asked}.`);
      expect(verdict).not.toContain('[gap');
      expect(verdict).not.toMatch(/\bpar\s+\d/);
      expect(run('story')).toContain('WHAT REALLY HAPPENED');
      expect(run('curtain')).toContain('BEHIND THE CURTAIN');
      // The night is over: nothing more to do.
      expect(runPlay(['do', '1', ...save], io).code).toBe(1);
    });
  }
});
