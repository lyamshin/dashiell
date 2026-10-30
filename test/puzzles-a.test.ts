/**
 * docs/83: harder puzzles, phase 2b, A: the notebook stops concluding, behind a flag (`puzzles: ['A']`,
 * `?puzzles=A`, `play new --puzzles A`), off by default, from Poached up. The grid says what was said and
 * who said they saw them where, nothing the solver derived; the means column says the facts; the pages
 * run at Hard-boiled's fact level and never say a clash; "Where things stand" says what was said; the
 * confront is offered for anybody whose evening is held, with every line held at that hour; the turn
 * comes when the player marks a clash that's real; a hint never says a clash the player hasn't marked;
 * the curtain still shows every clash.
 */
import { describe, expect, it } from 'vitest';
import { parsePuzzles, typesFor, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, factsOnly, thoughtLevel, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { boardGrid, boardGridText } from '../src/game/board/grid.js';
import { clashReal, collisionsOf, linesHeld } from '../src/game/board/knowledge.js';
import { boardChoices, pickerFor } from '../src/game/board/choices.js';
import { recapClauses } from '../src/game/board/pages.js';
import { pageBodyText } from '../src/game/board/text.js';
import { fastestTrack } from '../src/game/board/replay.js';
import { starReason } from '../src/game/board/stars.js';
import { BOARD_TEACH_LINES, teachLines } from '../src/game/board/teach.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

const A = { puzzles: ['A'] } as const;
const AB = { puzzles: ['A', 'B'] } as const;
const UP = [2, 3, 4, 5] as TierIndex[];

function nights(tiers: TierIndex[], n: number, w: { puzzles: readonly string[] }, world?: string): BoardDeal[] {
  return tiers.flatMap((tier) => typesFor(tier).flatMap((type) => Array.from({ length: n }, (_, i) => dealBoard(i + 1, tier, type, { ...(world ? { world } : {}), ...w }))));
}

/** The conclusions A takes off the pages (docs/83 §2, the brief's items 3 and 4). */
const CONCLUDES = [/Here was the trouble/, /There was a snag/, /Something didn’t add up/, /One thing didn’t fit/, /That much checked out/, /That much of it stood up/, /stood up\./, /\bstill alive at\b/, /\bhad to fetch\b/, /\bhad been at .{3,40} first\b/, /said otherwise/, /\bsame as (?:s?he|they)(?:’d)? said\b/, /\bbacked .{2,20} up\b/];

describe('docs/83: the flag', () => {
  it('reads A beside B, in order', () => {
    expect(parsePuzzles('a')).toEqual(['A']);
    expect(parsePuzzles('B,A')).toEqual(['A', 'B']);
    expect(parsePuzzles(['A', 'Q', 'B'])).toEqual(['A', 'B']);
  });

  it('deals nothing: with A the night is the night without it, but for the flag it carries from Poached up', () => {
    for (let s = 1; s <= 3; s++) {
      for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
        for (const type of typesFor(tier)) {
          const off = dealBoard(s, tier, type);
          const a = dealBoard(s, tier, type, A).kase;
          if (tier <= 1) expect(JSON.stringify(a), `${s} ${tier} ${type}`).toBe(JSON.stringify(off.kase));
          else {
            expect(a.puzzles).toEqual(['A']);
            expect(factsOnly(a)).toBe(true);
            const { puzzles: _p, ...rest } = a;
            expect(JSON.stringify(rest)).toBe(JSON.stringify(off.kase));
          }
          // A with B is B's night, and the flag.
          const b = dealBoard(s, tier, type, { puzzles: ['B'] }).kase;
          const ab = dealBoard(s, tier, type, AB).kase;
          const { puzzles: pb, ...rb } = b;
          const { puzzles: pab, ...rab } = ab;
          expect(JSON.stringify(rab)).toBe(JSON.stringify(rb));
          expect(pab ?? []).toEqual(tier >= 2 ? ['A', ...(pb ?? [])] : (pb ?? []));
        }
      }
    }
  });

  it('runs the thoughts at the fact level from Poached up, and leaves Raw and Coddled their sums', () => {
    expect(thoughtLevel({ tier: 2, puzzles: ['A'] })).toBe('fact');
    expect(thoughtLevel({ tier: 4, puzzles: ['A'] })).toBe('fact');
    expect(thoughtLevel({ tier: 1, puzzles: ['A'] })).toBe('link');
    expect(thoughtLevel({ tier: 2 })).toBe('link');
  });
});

describe('docs/83: the notebook only writes down what was said', () => {
  const all = [...nights(UP, 4, A), ...nights(UP, 2, AB, 'neighbourhood')];

  it('no page before the report draws a clash, an agreement, a sighting’s hour or the scene’s inference; "Where things stand" says nobody said otherwise', () => {
    for (const d of all) {
      const p = playBoardOracle(d);
      expect(p.ok, d.kase.id).toBe(true);
      for (const page of p.run.log) {
        if (page.board?.job === 'nothing') continue;
        const text = pageBodyText(page).replace(/“[^”]*”/g, '');
        for (const re of CONCLUDES) expect(re.test(text), `${d.kase.id} p${page.n + 1}: ${re} in ${text.slice(0, 400)}`).toBe(false);
      }
      for (const cl of recapClauses(d, p.run)) expect(/otherwise|hadn’t seen|either/.test(cl.text), `${d.kase.id}: ${cl.text}`).toBe(false);
      // The oracle marks nothing, so no turn falls.
      expect(p.run.turn, d.kase.id).toBeUndefined();
    }
  });

  it('the grid marks no ✗ and no ✓, says the means as facts, and puts nobody anywhere a held line didn’t', () => {
    for (const d of all.slice(0, 24)) {
      const p = playBoardOracle(d);
      const g = boardGrid(d.kase, p.run);
      expect(g.facts).toBe(true);
      const lines = linesHeld(d.kase, p.run);
      for (const r of g.rows) {
        expect(['', '?']).toContain(r.means);
        for (const h of g.hours) {
          const cell = r.cells[h];
          expect(cell?.collision).toBe(false);
          expect(cell?.confirmed).toBe(false);
          for (const x of cell?.heard ?? []) expect(lines.some((l) => l.hour === h && l.about.includes(r.id) && l.speaker !== r.id && (x.place === undefined || l.place === x.place || l.kind === 'remark')), `${d.kase.id} ${r.id}@${h}`).toBe(true);
        }
      }
      // The solver's grid is there for the curtain, ✗ and all.
      const solved = boardGrid(d.kase, p.run, { solved: true });
      expect(solved.facts).toBeUndefined();
      if (collisionsOf(d.kase, p.run).length > 0) expect(solved.rows.some((r) => g.hours.some((h) => r.cells[h]?.collision))).toBe(true);
      // The places view: every list held, as it was said.
      const held = p.run.asked.filter((q) => q.startsWith('list:')).length;
      expect((g.places ?? []).filter((x) => d.kase.lists.some((l) => l.place === x.place && p.run.asked.includes(`list:${l.watcher}`))).length).toBe(held);
      const text = boardGridText(d.kase, p.run);
      expect(text).toContain('WHO WAS SEEN WHERE');
      expect(text).not.toMatch(/WHERE THEY CLASH|✓/);
    }
  });

  it('the curtain’s replay is the solver’s grid', () => {
    const d = dealBoard(41, 2, 'murder', A);
    expect(fastestTrack(d).steps.some((s) => s.broke.length > 0)).toBe(true);
  });
});

describe('docs/83: the confront and the clash mark are the player’s', () => {
  it('offers to confront anybody whose evening is held, about every hour, with every line held then', () => {
    const d = dealBoard(41, 2, 'murder', A);
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'go rooming', 'ask xwatcher list', 'ask schilling evening']) run = stepBoard(d, run, cmd).run;
    const pk = pickerFor(d, run, 'schilling');
    expect(pk).not.toBeNull();
    expect(pk?.claims.map((x) => x.hour)).toEqual([7, 8, 9, 10]);
    expect(pk?.claims.find((x) => x.hour === 9)?.lines.length).toBeGreaterThan(0);
    // Off the flag, only where something held breaks it.
    const off = dealBoard(41, 2, 'murder');
    let r0 = newBoardRun(off);
    for (const cmd of ['go scene', 'search scene', 'go rooming', 'ask xwatcher list', 'ask schilling evening']) r0 = stepBoard(off, r0, cmd).run;
    expect(pickerFor(off, r0, 'schilling')?.claims.map((x) => x.hour)).toEqual([9]);
    // A confront that doesn't land costs its action.
    const miss = stepBoard(d, run, `put schilling 7 ${pk?.claims.find((x) => x.hour === 7)?.lines[0]?.command.split(' ')[3]}`);
    expect(miss.error).toBeUndefined();
    expect(miss.run.used).toBe(run.used + 1);
    expect(miss.run.puts[miss.run.puts.length - 1]?.landed).toBe(false);
  });

  it('the turn comes when the player first marks a clash that’s real; a mark that isn’t changes nothing and says nothing', () => {
    const d = dealBoard(41, 2, 'murder', A);
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'go rooming', 'ask xwatcher list', 'ask schilling evening']) run = stepBoard(d, run, cmd).run;
    expect(run.turn).toBeUndefined();
    expect(collisionsOf(d.kase, run).length).toBeGreaterThan(0);
    // Not real: Schilling at eight (nothing held says otherwise yet).
    expect(clashReal(d.kase, run, 'schilling', 8)).toBe(false);
    const a = stepBoard(d, run, 'clash schilling 8');
    expect(a.error).toBeUndefined();
    expect(a.run.log.length).toBe(run.log.length);
    expect(a.run.turn).toBeUndefined();
    expect(a.run.clashes).toEqual(['schilling@8']);
    expect(boardGrid(d.kase, a.run).rows.find((r) => r.id === 'schilling')?.cells[8]?.clash).toBe(true);
    // Real: nine.
    const b = stepBoard(d, a.run, 'clash schilling 9');
    expect(b.run.log.length).toBe(run.log.length + 1);
    expect(b.run.turn).toBe(run.log.length);
    expect(b.page.board.turn).toBe(true);
    expect(b.page.cost).toBe(0);
    expect(b.run.used).toBe(run.used);
    expect(pageBodyText(b.page)).toMatch(/Schilling said she was home at the Delmonico rooms at nine/);
    // Taken off and put back: the turn has fallen, so nothing more is written.
    const c = stepBoard(d, stepBoard(d, b.run, 'clash schilling 9 off').run, 'clash schilling 9');
    expect(c.run.log.length).toBe(b.run.log.length);
    // Off the flag there is no such command, and the turn falls on the page that holds the clash.
    const off = dealBoard(41, 2, 'murder');
    let r0 = newBoardRun(off);
    for (const cmd of ['go scene', 'search scene', 'go rooming', 'ask xwatcher list', 'ask schilling evening']) r0 = stepBoard(off, r0, cmd).run;
    expect(r0.turn).toBe(r0.log.length - 1);
    expect(stepBoard(off, r0, 'clash schilling 9').error).toBeDefined();
  });

  it('a hint’s reason never says a clash the player hasn’t marked', () => {
    const d = dealBoard(41, 2, 'murder', A);
    let run: BoardRun = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'go rooming', 'ask xwatcher list', 'ask schilling evening']) run = stepBoard(d, run, cmd).run;
    expect(starReason(d.kase, run, 'confront:schilling@9')).toBe('Schilling is worth confronting');
    const marked = stepBoard(d, run, 'clash schilling 9').run;
    expect(starReason(d.kase, marked, 'confront:schilling@9')).toMatch(/said otherwise/);
  });

  it('the book offers "Confront" for anybody whose evening is held', () => {
    const d = dealBoard(41, 2, 'murder', A);
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'go rooming', 'ask xwatcher list', 'ask schilling evening']) run = stepBoard(d, run, cmd).run;
    const g = boardChoices(d, run).find((x) => x.personId === 'schilling');
    expect(g?.choices.some((x) => x.command === 'picker schilling')).toBe(true);
  });
});

describe('docs/83: what the player is told', () => {
  it('teaches one plain line, with the flag only, from Poached up', () => {
    const line = 'From here on the notebook only writes down what you were told. Where two stories don’t fit is yours to find.';
    expect(teachLines(undefined, { type: 'murder', tier: 2, puzzles: ['A'] })).toContain(line);
    expect(teachLines(undefined, { type: 'murder', tier: 1, puzzles: ['A'] })).toEqual(BOARD_TEACH_LINES);
    expect(teachLines(undefined, { type: 'murder', tier: 2 })).toEqual(BOARD_TEACH_LINES);
    const ab = teachLines(undefined, { type: 'murder', tier: 4, puzzles: ['A', 'B'] });
    expect(ab.length).toBe(BOARD_TEACH_LINES.length + 2);
  });

  it('the CLI marks a clash with `mark "<Name> <hour> clash"`, with the flag only', () => {
    const files = new Map<string, string>();
    const io: PlayIo = { read: (f) => files.get(f) ?? null, write: (f, s) => void files.set(f, s) };
    const play = (...a: string[]) => runPlay([...a, '--save', 'n.json'], io);
    expect(play('new', '--seed', '41', '--tier', '2', '--type', 'murder', '--puzzles', 'A').out).toContain('only writes down what you were told');
    for (const c of ['go scene', 'search scene', 'go rooming', 'person xwatcher', 'ask xwatcher list', 'person schilling', 'ask schilling evening']) expect(play('do', c).code).toBe(0);
    const miss = play('mark', 'Schilling eight clash');
    expect(miss.out).toMatch(/^Marked: Schilling at eight doesn’t fit\./);
    const hit = play('mark', 'Schilling nine clash');
    expect(hit.out).toMatch(/Where things stood/);
    expect(play('grid').out).toContain('WHERE YOU MARKED IT DOESN’T FIT');
    // Without the flag, refused.
    const files2 = new Map<string, string>();
    const io2: PlayIo = { read: (f) => files2.get(f) ?? null, write: (f, s) => void files2.set(f, s) };
    runPlay(['new', '--seed', '41', '--tier', '2', '--type', 'murder', '--save', 'm.json'], io2);
    expect(runPlay(['mark', 'Schilling nine clash', '--save', 'm.json'], io2).code).toBe(1);
  });
});
